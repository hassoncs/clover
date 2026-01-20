import React, { useEffect, useRef, useState, useCallback } from "react";
import { Dimensions, GestureResponderEvent, View } from "react-native";
import {
  Canvas,
  Circle,
  Rect,
  useCanvasRef,
  Fill,
} from "@shopify/react-native-skia";
import { useFrameCallback } from "react-native-reanimated";
import {
  createPhysics2D,
  type Physics2D,
  type BodyId,
  vec2,
} from "../../lib/physics2d";

const PIXELS_PER_METER = 50;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const WORLD_WIDTH = SCREEN_WIDTH / PIXELS_PER_METER;
const WORLD_HEIGHT = SCREEN_HEIGHT / PIXELS_PER_METER;
const GROUND_HEIGHT = 0.5;
const MAX_BODIES = 50;

interface BodyState {
  id: BodyId;
  x: number;
  y: number;
  radius: number;
  color: string;
}

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#A29BFE",
  "#FD79A8",
];

export default function InteractionV2() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const bodyIdsRef = useRef<{ id: BodyId; radius: number; color: string }[]>([]);
  const [bodies, setBodies] = useState<BodyState[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setupPhysics = async () => {
      try {
        const physics = await createPhysics2D();
        physics.createWorld(vec2(0, 9.8));
        physicsRef.current = physics;

        const groundId = physics.createBody({
          type: 'static',
          position: vec2(WORLD_WIDTH / 2, WORLD_HEIGHT - GROUND_HEIGHT / 2),
        });
        physics.addFixture(groundId, {
          shape: { type: 'box', halfWidth: WORLD_WIDTH / 2, halfHeight: GROUND_HEIGHT / 2 },
          density: 0,
          friction: 0.6,
        });

        const leftWallId = physics.createBody({
          type: 'static',
          position: vec2(-0.5, WORLD_HEIGHT / 2),
        });
        physics.addFixture(leftWallId, {
          shape: { type: 'box', halfWidth: 0.5, halfHeight: WORLD_HEIGHT / 2 },
          density: 0,
        });

        const rightWallId = physics.createBody({
          type: 'static',
          position: vec2(WORLD_WIDTH + 0.5, WORLD_HEIGHT / 2),
        });
        physics.addFixture(rightWallId, {
          shape: { type: 'box', halfWidth: 0.5, halfHeight: WORLD_HEIGHT / 2 },
          density: 0,
        });

        setIsReady(true);
      } catch (error) {
        console.error("Failed to initialize Physics2D:", error);
      }
    };

    setupPhysics();

    return () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      bodyIdsRef.current = [];
    };
  }, []);

  const spawnBall = useCallback((screenX: number, screenY: number) => {
    if (!physicsRef.current) return;

    const physics = physicsRef.current;

    if (bodyIdsRef.current.length >= MAX_BODIES) {
      const oldest = bodyIdsRef.current.shift();
      if (oldest) {
        physics.destroyBody(oldest.id);
      }
    }

    const worldX = screenX / PIXELS_PER_METER;
    const worldY = screenY / PIXELS_PER_METER;
    const radius = 0.3 + Math.random() * 0.4;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const bodyId = physics.createBody({
      type: 'dynamic',
      position: vec2(worldX, worldY),
    });

    physics.addFixture(bodyId, {
      shape: { type: 'circle', radius },
      density: 1.0,
      friction: 0.3,
      restitution: 0.5,
    });

    bodyIdsRef.current.push({ id: bodyId, radius, color });
  }, []);

  const handleTouch = useCallback((event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    spawnBall(locationX, locationY);
  }, [spawnBall]);

  useFrameCallback(() => {
    if (!physicsRef.current || !isReady) return;

    physicsRef.current.step(1 / 60, 8, 3);

    const updatedBodies = bodyIdsRef.current.map((record) => {
      const transform = physicsRef.current!.getTransform(record.id);
      return {
        id: record.id,
        x: transform.position.x * PIXELS_PER_METER,
        y: transform.position.y * PIXELS_PER_METER,
        radius: record.radius * PIXELS_PER_METER,
        color: record.color,
      };
    });

    setBodies(updatedBodies);
  }, true);

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
    >
      <Canvas
        ref={canvasRef}
        style={{ flex: 1 }}
        pointerEvents="none"
      >
        <Fill color="#1a1a2e" />

        <Rect
          x={0}
          y={SCREEN_HEIGHT - GROUND_HEIGHT * PIXELS_PER_METER}
          width={SCREEN_WIDTH}
          height={GROUND_HEIGHT * PIXELS_PER_METER}
          color="#2d3436"
        />

        {bodies.map((body) => (
          <Circle
            key={`ball-${body.id.value}`}
            cx={body.x}
            cy={body.y}
            r={body.radius}
            color={body.color}
          />
        ))}
      </Canvas>
    </View>
  );
}
