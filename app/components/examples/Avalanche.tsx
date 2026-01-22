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
  usePhysicsExample,
  vec2,
  type Physics2D,
  type BodyRecord,
} from "../../lib/physics2d";
import { ViewportRoot, useViewport } from "../../lib/viewport";

const PIXELS_PER_METER = 50;

const PARTICLE_COUNT = 150;
const PARTICLE_RADIUS = 0.15;
const FUNNEL_WALL_LENGTH = 10;
const FUNNEL_ANGLE = 0.5;

interface ParticleData {
  color: string;
}

function generateParticleColor(): string {
  const hue = Math.random() * 60 + 180;
  return `hsl(${hue}, 80%, 60%)`;
}

function AvalancheCanvas() {
  const canvasRef = useCanvasRef();
  const vp = useViewport();

  const { transforms, gesture, isReady } = usePhysicsExample<ParticleData>({
    pixelsPerMeter: PIXELS_PER_METER,
    enabled: vp.isReady,
    drag: 'force',
    dragStiffness: 50,
    dragDamping: 5,
    onInit: (physics: Physics2D): BodyRecord<ParticleData>[] => {
      const worldWidth = vp.world.size.width;
      const worldHeight = vp.world.size.height;
      const funnelY = worldHeight - 5;

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

      const bodies: BodyRecord<ParticleData>[] = [];

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

        bodies.push({
          id: particleId,
          data: { color },
        });
      }

      return bodies;
    },
  });

  if (!vp.isReady || !isReady) return null;

  const worldHeight = vp.world.size.height;
  const funnelY = (worldHeight - 5) * PIXELS_PER_METER;
  const funnelWallWidthPx = FUNNEL_WALL_LENGTH * PIXELS_PER_METER;
  const funnelWallHeightPx = 1 * PIXELS_PER_METER;
  const particleRadiusPx = PARTICLE_RADIUS * PIXELS_PER_METER;

  return (
    <GestureDetector gesture={gesture}>
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

          {transforms.map((p) => (
            <Circle
              key={`particle-${p.id.value}`}
              cx={p.x}
              cy={p.y}
              r={particleRadiusPx}
              color={p.data.color}
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
