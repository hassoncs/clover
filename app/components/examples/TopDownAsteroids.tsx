import { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import {
  Canvas,
  Rect,
  Circle,
  Path,
  Skia,
  useCanvasRef,
  Fill,
  Group,
} from "@shopify/react-native-skia";
import {
  createPhysics2D,
  useSimplePhysicsLoop,
  type Physics2D,
  type BodyId,
  vec2,
} from "../../lib/physics2d";
import { ViewportRoot, useViewport } from "../../lib/viewport";

const PIXELS_PER_METER = 50;

function createPolygonPath(points: { x: number; y: number }[]) {
  if (points.length < 3) return null;
  const path = Skia.Path.Make();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i].x, points[i].y);
  }
  path.close();
  return path;
}

const SHIP_SIZE = 0.5;
const ASTEROID_COUNT = 8;
const ASTEROID_MIN_SIZE = 0.4;
const ASTEROID_MAX_SIZE = 0.8;
const THRUST_POWER = 15;
const ROTATION_TORQUE = 8;

interface ShipState {
  x: number;
  y: number;
  angle: number;
}

interface AsteroidState {
  id: BodyId;
  x: number;
  y: number;
  angle: number;
  size: number;
  vertices: { x: number; y: number }[];
}

interface InputState {
  thrusting: boolean;
  rotatingLeft: boolean;
  rotatingRight: boolean;
}

function TopDownAsteroidsCanvas() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const shipIdRef = useRef<BodyId | null>(null);
  const asteroidIdsRef = useRef<BodyId[]>([]);
  const inputRef = useRef<InputState>({
    thrusting: false,
    rotatingLeft: false,
    rotatingRight: false,
  });
  
  const [ship, setShip] = useState<ShipState | null>(null);
  const [asteroids, setAsteroids] = useState<AsteroidState[]>([]);
  const [isReady, setIsReady] = useState(false);

  const vp = useViewport();

  const generateAsteroidVertices = useCallback((size: number): { x: number; y: number }[] => {
    const vertices: { x: number; y: number }[] = [];
    const numVertices = 8 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * Math.PI * 2;
      const radius = size * (0.7 + Math.random() * 0.3);
      vertices.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    return vertices;
  }, []);

  const handleKeyDown = useCallback((event: any) => {
    if (event.key === "ArrowUp" || event.key === "w") {
      inputRef.current.thrusting = true;
    } else if (event.key === "ArrowLeft" || event.key === "a") {
      inputRef.current.rotatingLeft = true;
    } else if (event.key === "ArrowRight" || event.key === "d") {
      inputRef.current.rotatingRight = true;
    }
  }, []);

  const handleKeyUp = useCallback((event: any) => {
    if (event.key === "ArrowUp" || event.key === "w") {
      inputRef.current.thrusting = false;
    } else if (event.key === "ArrowLeft" || event.key === "a") {
      inputRef.current.rotatingLeft = false;
    } else if (event.key === "ArrowRight" || event.key === "d") {
      inputRef.current.rotatingRight = false;
    }
  }, []);

  const applyShipControls = useCallback((physics: Physics2D) => {
    if (!shipIdRef.current) return;

    const { thrusting, rotatingLeft, rotatingRight } = inputRef.current;

    // Apply rotation torque
    if (rotatingLeft) {
      physics.applyTorque(shipIdRef.current, -ROTATION_TORQUE);
    }
    if (rotatingRight) {
      physics.applyTorque(shipIdRef.current, ROTATION_TORQUE);
    }

    // Apply thrust in direction of ship angle
    if (thrusting) {
      const transform = physics.getTransform(shipIdRef.current);
      const thrustX = Math.cos(transform.angle - Math.PI / 2) * THRUST_POWER;
      const thrustY = Math.sin(transform.angle - Math.PI / 2) * THRUST_POWER;
      physics.applyForceToCenter(shipIdRef.current, vec2(thrustX, thrustY));
    }
  }, []);

  const wrapShipPosition = useCallback((physics: Physics2D) => {
    if (!shipIdRef.current) return;

    const transform = physics.getTransform(shipIdRef.current);
    let { x, y } = transform.position;
    const worldWidth = vp.world.size.width;
    const worldHeight = vp.world.size.height;

    let wrapped = false;
    if (x < 0) { x = worldWidth; wrapped = true; }
    if (x > worldWidth) { x = 0; wrapped = true; }
    if (y < 0) { y = worldHeight; wrapped = true; }
    if (y > worldHeight) { y = 0; wrapped = true; }

    if (wrapped) {
      physics.setTransform(shipIdRef.current, {
        position: vec2(x, y),
        angle: transform.angle,
      });
    }
  }, [vp.world.size.width, vp.world.size.height]);

  useEffect(() => {
    if (!vp.isReady) return;

    const worldWidth = vp.world.size.width;
    const worldHeight = vp.world.size.height;

    const setupPhysics = async () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
      }

      const physics = await createPhysics2D();
      physics.createWorld(vec2(0, 0)); // Zero gravity for space!
      physicsRef.current = physics;

      // Create ship (triangle)
      const shipVertices = [
        { x: 0, y: -SHIP_SIZE },
        { x: -SHIP_SIZE * 0.7, y: SHIP_SIZE * 0.7 },
        { x: SHIP_SIZE * 0.7, y: SHIP_SIZE * 0.7 },
      ];

      const shipId = physics.createBody({
        type: "dynamic",
        position: vec2(worldWidth / 2, worldHeight / 2),
        linearDamping: 1,
        angularDamping: 2,
      });

      physics.addFixture(shipId, {
        shape: { type: "polygon", vertices: shipVertices },
        density: 1,
        friction: 0.1,
        restitution: 0.2,
      });
      shipIdRef.current = shipId;

      // Create asteroids
      const newAsteroidIds: BodyId[] = [];
      const newAsteroids: AsteroidState[] = [];

      for (let i = 0; i < ASTEROID_COUNT; i++) {
        let x: number, y: number;
        do {
          x = Math.random() * worldWidth;
          y = Math.random() * worldHeight;
        } while (
          Math.abs(x - worldWidth / 2) < 3 &&
          Math.abs(y - worldHeight / 2) < 3
        );

        const size = ASTEROID_MIN_SIZE + Math.random() * (ASTEROID_MAX_SIZE - ASTEROID_MIN_SIZE);
        const angle = Math.random() * Math.PI * 2;
        const vertices = generateAsteroidVertices(size);

        const asteroidId = physics.createBody({
          type: "dynamic",
          position: vec2(x, y),
          angle,
          linearDamping: 0.1,
          angularDamping: 0.5,
        });

        physics.addFixture(asteroidId, {
          shape: { type: "polygon", vertices },
          density: 1,
          friction: 0.3,
          restitution: 0.8,
        });

        newAsteroidIds.push(asteroidId);
        newAsteroids.push({
          id: asteroidId,
          x: x * PIXELS_PER_METER,
          y: y * PIXELS_PER_METER,
          angle,
          size,
          vertices,
        });
      }

      asteroidIdsRef.current = newAsteroidIds;
      setAsteroids(newAsteroids);
      setIsReady(true);
    };

    setupPhysics();

    // Set up keyboard listeners
    const keyDownHandler = (e: KeyboardEvent) => handleKeyDown(e);
    const keyUpHandler = (e: KeyboardEvent) => handleKeyUp(e);
    window.addEventListener("keydown", keyDownHandler);
    window.addEventListener("keyup", keyUpHandler);

    return () => {
      window.removeEventListener("keydown", keyDownHandler);
      window.removeEventListener("keyup", keyUpHandler);
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      shipIdRef.current = null;
      asteroidIdsRef.current = [];
      setIsReady(false);
    };
  }, [vp.world.size.width, vp.world.size.height, vp.isReady, handleKeyDown, handleKeyUp, generateAsteroidVertices]);

  const stepPhysics = useCallback((dt: number) => {
    const physics = physicsRef.current;
    if (!physics || !shipIdRef.current) return;

    applyShipControls(physics);
    physics.step(dt, 8, 3);
    wrapShipPosition(physics);

    const shipTransform = physics.getTransform(shipIdRef.current);
    setShip({
      x: shipTransform.position.x * PIXELS_PER_METER,
      y: shipTransform.position.y * PIXELS_PER_METER,
      angle: shipTransform.angle,
    });

    const updatedAsteroids = asteroidIdsRef.current.map((id, i) => {
      const transform = physics.getTransform(id);
      return {
        ...asteroids[i],
        x: transform.position.x * PIXELS_PER_METER,
        y: transform.position.y * PIXELS_PER_METER,
        angle: transform.angle,
      };
    });
    setAsteroids(updatedAsteroids);
  }, [applyShipControls, wrapShipPosition, asteroids]);

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!vp.isReady) return null;

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Text style={styles.instructions}>WASD or Arrow keys to fly</Text>
        <Text style={styles.instructions}>Fly off screen to wrap around</Text>
      </View>
      
      <View style={styles.canvasContainer}>
        <Canvas ref={canvasRef} style={styles.canvas} pointerEvents="none">
          <Fill color="#000000" />

          {/* Ship */}
          {ship && (
            <Group
              transform={[
                { translateX: ship.x },
                { translateY: ship.y },
                { rotate: ship.angle },
              ]}
            >
              <Path
                path={createPolygonPath([
                  { x: 0, y: -SHIP_SIZE * PIXELS_PER_METER },
                  { x: -SHIP_SIZE * 0.7 * PIXELS_PER_METER, y: SHIP_SIZE * 0.7 * PIXELS_PER_METER },
                  { x: SHIP_SIZE * 0.7 * PIXELS_PER_METER, y: SHIP_SIZE * 0.7 * PIXELS_PER_METER },
                ])!}
                color="#00ff00"
              />
            </Group>
          )}

          {/* Asteroids */}
          {asteroids.map((asteroid) => (
            <Group
              key={`asteroid-${asteroid.id}`}
              transform={[
                { translateX: asteroid.x },
                { translateY: asteroid.y },
                { rotate: asteroid.angle },
              ]}
            >
              <Path
                path={createPolygonPath(asteroid.vertices.map((v) => ({
                  x: v.x * PIXELS_PER_METER,
                  y: v.y * PIXELS_PER_METER,
                })))!}
                color="#888888"
              />
            </Group>
          ))}
        </Canvas>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controls: {
    padding: 10,
    backgroundColor: "#1a1a2e",
    borderBottomWidth: 1,
    borderBottomColor: "#2d3436",
  },
  instructions: {
    color: "#bdc3c7",
    fontSize: 14,
    textAlign: "center",
  },
  canvasContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});

export default function TopDownAsteroids() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <TopDownAsteroidsCanvas />
    </ViewportRoot>
  );
}
