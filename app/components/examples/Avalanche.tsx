import { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import {
  Canvas,
  Rect,
  Circle,
  useCanvasRef,
  Fill,
  Group,
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

const PARTICLE_COUNT = 150;
const PARTICLE_RADIUS = 0.15;
const FUNNEL_WALL_LENGTH = 10;
const FUNNEL_ANGLE = 0.5;

interface ParticleState {
  id: BodyId;
  x: number;
  y: number;
  color: string;
}

function generateParticleColor(): string {
  const hue = Math.random() * 60 + 180;
  return `hsl(${hue}, 80%, 60%)`;
}

function AvalancheCanvas() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const particleIdsRef = useRef<BodyId[]>([]);

  const [particles, setParticles] = useState<ParticleState[]>([]);
  const [isReady, setIsReady] = useState(false);

  const vp = useViewport();

  const dragHandlers = useForceDrag(physicsRef, {
    pixelsPerMeter: PIXELS_PER_METER,
    stiffness: 50,
    damping: 5,
  });

  useEffect(() => {
    if (!vp.isReady) return;

    const worldWidth = vp.world.size.width;
    const worldHeight = vp.world.size.height;
    const funnelY = worldHeight - 5;

    const setupPhysics = async () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
      }

      const physics = await createPhysics2D();
      physics.createWorld(vec2(0, 9.8));
      physicsRef.current = physics;

      const leftWallId = physics.createBody({
        type: "static",
        position: vec2(worldWidth * 0.2, funnelY),
        angle: FUNNEL_ANGLE,
      });
      physics.addFixture(leftWallId, {
        shape: { type: "box", halfWidth: FUNNEL_WALL_LENGTH, halfHeight: 1 },
        density: 0,
        friction: 0.3,
      });

      const rightWallId = physics.createBody({
        type: "static",
        position: vec2(worldWidth * 0.8, funnelY),
        angle: -FUNNEL_ANGLE,
      });
      physics.addFixture(rightWallId, {
        shape: { type: "box", halfWidth: FUNNEL_WALL_LENGTH, halfHeight: 1 },
        density: 0,
        friction: 0.3,
      });

      const newParticleIds: BodyId[] = [];
      const initialParticles: ParticleState[] = [];

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const x = worldWidth / 2 + (Math.random() - 0.5) * 2;
        const y = -5 - i * 0.5;
        const color = generateParticleColor();

        const particleId = physics.createBody({
          type: "dynamic",
          position: vec2(x, y),
        });

        physics.addFixture(particleId, {
          shape: { type: "circle", radius: PARTICLE_RADIUS },
          density: 1,
          friction: 0.1,
          restitution: 0.5,
        });

        newParticleIds.push(particleId);
        initialParticles.push({
          id: particleId,
          x: 0,
          y: 0,
          color,
        });
      }

      particleIdsRef.current = newParticleIds;
      setParticles(initialParticles);
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
  }, [vp.world.size.width, vp.world.size.height, vp.isReady]);

  const stepPhysics = useCallback((dt: number) => {
    const physics = physicsRef.current;
    if (!physics) return;

    dragHandlers.applyDragForces();
    physics.step(dt, 8, 3);

    setParticles((prev) =>
      prev.map((particle, i) => {
        const id = particleIdsRef.current[i];
        if (!id) return particle;
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

  const worldHeight = vp.world.size.height;
  const funnelY = (worldHeight - 5) * PIXELS_PER_METER;
  const funnelWallWidthPx = FUNNEL_WALL_LENGTH * PIXELS_PER_METER;
  const funnelWallHeightPx = 1 * PIXELS_PER_METER;
  const particleRadiusPx = PARTICLE_RADIUS * PIXELS_PER_METER;

  return (
    <GestureDetector gesture={dragHandlers.gesture}>
      <View style={styles.container}>
        <Canvas ref={canvasRef} style={styles.canvas} pointerEvents="none">
          <Fill color="#1a1a2e" />

          <Group
            transform={[
              { translateX: vp.size.width * 0.2 },
              { translateY: funnelY },
              { rotate: FUNNEL_ANGLE },
            ]}
          >
            <Rect
              x={-funnelWallWidthPx}
              y={-funnelWallHeightPx}
              width={funnelWallWidthPx * 2}
              height={funnelWallHeightPx * 2}
              color="#7f8c8d"
            />
          </Group>

          <Group
            transform={[
              { translateX: vp.size.width * 0.8 },
              { translateY: funnelY },
              { rotate: -FUNNEL_ANGLE },
            ]}
          >
            <Rect
              x={-funnelWallWidthPx}
              y={-funnelWallHeightPx}
              width={funnelWallWidthPx * 2}
              height={funnelWallHeightPx * 2}
              color="#7f8c8d"
            />
          </Group>

          {particles.map((p) => (
            <Circle
              key={`particle-${p.id.value}`}
              cx={p.x}
              cy={p.y}
              r={particleRadiusPx}
              color={p.color}
            />
          ))}
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});

export default function Avalanche() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <AvalancheCanvas />
    </ViewportRoot>
  );
}
