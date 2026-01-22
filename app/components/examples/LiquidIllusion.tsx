import { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import {
  Canvas,
  Rect,
  Circle,
  useCanvasRef,
  Fill,
} from "@shopify/react-native-skia";
import {
  createPhysics2D,
  useSimplePhysicsLoop,
  useForceDrag,
  type Physics2D,
  type BodyId,
  vec2,
} from "../../lib/physics2d";
import { ViewportRoot, useViewport } from "../../lib/viewport";

const PIXELS_PER_METER = 50;

const PARTICLE_RADIUS = 0.12;
const PARTICLE_COUNT = 200;
const CONTAINER_WIDTH = 8;
const CONTAINER_HEIGHT = 6;

interface ParticleState {
  id: BodyId;
  x: number;
  y: number;
  color: string;
}

function generateFluidColors(): string[] {
  const colors: string[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const hue = 200 + Math.random() * 40; // Blue tones
    const saturation = 70 + Math.random() * 30;
    const lightness = 50 + Math.random() * 20;
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  return colors;
}

function LiquidIllusionCanvas() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const particleIdsRef = useRef<BodyId[]>([]);
  
  const [particles, setParticles] = useState<ParticleState[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [fluidColors, setFluidColors] = useState<string[]>([]);
  const [gravity, setGravity] = useState({ x: 0, y: 9.8 });

  const vp = useViewport();

  const dragHandlers = useForceDrag(physicsRef, {
    pixelsPerMeter: PIXELS_PER_METER,
    stiffness: 50,
    damping: 5,
  });

  const resetParticles = useCallback(() => {
    const physics = physicsRef.current;
    if (!physics) return;

    const worldWidth = vp.world.size.width;
    const worldHeight = vp.world.size.height;

    // Clear existing particles
    for (const id of particleIdsRef.current) {
      physics.destroyBody(id);
    }
    particleIdsRef.current = [];

    // Create new particles
    const newIds: BodyId[] = [];
    const newParticles: ParticleState[] = [];
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = worldWidth / 2 + (Math.random() - 0.5) * 2;
      const y = 2 + (Math.random() - 0.5) * 2;
      
      const particleId = physics.createBody({
        type: "dynamic",
        position: vec2(x, y),
        linearDamping: 0.5,
        angularDamping: 0.5,
      });

      physics.addFixture(particleId, {
        shape: { type: "circle", radius: PARTICLE_RADIUS },
        density: 2,
        friction: 0.1,
        restitution: 0.2,
      });

      newIds.push(particleId);
      newParticles.push({
        id: particleId,
        x: x * PIXELS_PER_METER,
        y: y * PIXELS_PER_METER,
        color: fluidColors[i],
      });
    }

    particleIdsRef.current = newIds;
    setParticles(newParticles);
  }, [fluidColors, vp.world.size.width]);

  const tiltLeft = useCallback(() => {
    setGravity({ x: -5, y: 9.8 });
  }, []);

  const tiltRight = useCallback(() => {
    setGravity({ x: 5, y: 9.8 });
  }, []);

  const levelGravity = useCallback(() => {
    setGravity({ x: 0, y: 9.8 });
  }, []);

  useEffect(() => {
    if (!vp.isReady) return;

    const worldWidth = vp.world.size.width;
    const worldHeight = vp.world.size.height;

    const setupPhysics = async () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
      }

      const physics = await createPhysics2D();
      physics.createWorld(vec2(gravity.x, gravity.y));
      physicsRef.current = physics;

      const containerLeft = worldWidth / 2 - CONTAINER_WIDTH / 2;
      const containerRight = worldWidth / 2 + CONTAINER_WIDTH / 2;
      const containerBottom = worldHeight - 3;
      const wallThickness = 0.5;

      // Create container walls - properly positioned
      const containerTop = containerBottom - CONTAINER_HEIGHT;
      
      const walls = [
        // Bottom wall - at the bottom edge of container
        { x: containerLeft + CONTAINER_WIDTH / 2, y: containerBottom, w: CONTAINER_WIDTH, h: wallThickness, angle: 0 },
        // Left wall - angled to funnel particles
        { x: containerLeft, y: containerTop + CONTAINER_HEIGHT / 2, w: wallThickness, h: CONTAINER_HEIGHT, angle: 0 },
        // Right wall - angled to funnel particles  
        { x: containerRight, y: containerTop + CONTAINER_HEIGHT / 2, w: wallThickness, h: CONTAINER_HEIGHT, angle: 0 },
      ];

      for (const wall of walls) {
        const wallId = physics.createBody({
          type: "static",
          position: vec2(wall.x, wall.y),
          angle: wall.angle,
        });
        physics.addFixture(wallId, {
          shape: { type: "box", halfWidth: wall.w / 2, halfHeight: wall.h / 2 },
          density: 0,
          friction: 0.3,
          restitution: 0.5,
        });
      }

      // Generate colors once
      const colors = generateFluidColors();
      setFluidColors(colors);

      // Create particles
      const newIds: BodyId[] = [];
      const newParticles: ParticleState[] = [];
      
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const x = worldWidth / 2 + (Math.random() - 0.5) * 2;
        const y = containerBottom - CONTAINER_HEIGHT + 1 + Math.random() * 3;
        
        const particleId = physics.createBody({
          type: "dynamic",
          position: vec2(x, y),
          linearDamping: 0.3,
          angularDamping: 0.3,
        });

        physics.addFixture(particleId, {
          shape: { type: "circle", radius: PARTICLE_RADIUS },
          density: 1.5,
          friction: 0.1,
          restitution: 0.3,
        });

        newIds.push(particleId);
        newParticles.push({
          id: particleId,
          x: x * PIXELS_PER_METER,
          y: y * PIXELS_PER_METER,
          color: colors[i],
        });
      }

      particleIdsRef.current = newIds;
      setParticles(newParticles);
      setIsReady(true);
    };

    setupPhysics();

    return () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      particleIdsRef.current = [];
      setIsReady(false);
    };
  }, [vp.world.size.width, vp.world.size.height, vp.isReady, gravity]);

  const stepPhysics = useCallback((dt: number) => {
    const physics = physicsRef.current;
    if (!physics) return;

    dragHandlers.applyDragForces();
    physics.step(dt, 10, 6); // More iterations for stability

    setParticles((prev) =>
      prev.map((particle) => {
        const id = particle.id;
        const transform = physics.getTransform(id);
        return {
          ...particle,
          x: transform.position.x * PIXELS_PER_METER,
          y: transform.position.y * PIXELS_PER_METER,
        };
      })
    );
  }, [dragHandlers]);

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!vp.isReady) return null;

  const worldWidth = vp.world.size.width;
  const worldHeight = vp.world.size.height;
  const containerLeft = worldWidth / 2 - CONTAINER_WIDTH / 2;
  const containerRight = worldWidth / 2 + CONTAINER_WIDTH / 2;
  const containerBottom = worldHeight - 3;

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Text style={styles.instructions}>Tilt to move liquid</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={tiltLeft}>
            <Text style={styles.buttonText}>← Tilt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={levelGravity}>
            <Text style={styles.buttonText}>Level</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={tiltRight}>
            <Text style={styles.buttonText}>Tilt →</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.resetButton} onPress={resetParticles}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.canvasContainer}>
        <GestureDetector gesture={dragHandlers.gesture}>
          <View style={{ flex: 1 }}>
            <Canvas ref={canvasRef} style={styles.canvas} pointerEvents="none">
              <Fill color="#1a1a2e" />

              {/* Container */}
              <Rect
                x={containerLeft * PIXELS_PER_METER}
                y={(containerBottom - CONTAINER_HEIGHT) * PIXELS_PER_METER}
                width={CONTAINER_WIDTH * PIXELS_PER_METER}
                height={CONTAINER_HEIGHT * PIXELS_PER_METER}
                color="#2d343630"
                style="stroke"
                strokeWidth={4}
              />

              {/* Particles */}
              {particles.map((particle) => (
                <Circle
                  key={`particle-${particle.id.value}`}
                  cx={particle.x}
                  cy={particle.y}
                  r={PARTICLE_RADIUS * PIXELS_PER_METER}
                  color={particle.color}
                />
              ))}
            </Canvas>
          </View>
        </GestureDetector>
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
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  button: {
    backgroundColor: "#3498db",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  resetButton: {
    backgroundColor: "#e74c3c",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: "center",
  },
  resetButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  canvasContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});

export default function LiquidIllusion() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <LiquidIllusionCanvas />
    </ViewportRoot>
  );
}
