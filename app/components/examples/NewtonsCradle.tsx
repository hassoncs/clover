import { View, StyleSheet } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import {
  Canvas,
  Circle,
  Line,
  useCanvasRef,
  Fill,
  vec,
} from "@shopify/react-native-skia";
import {
  usePhysicsExample,
  vec2,
  type Physics2D,
  type BodyRecord,
} from "../../lib/physics2d";
import { ViewportRoot, useViewport } from "../../lib/viewport";

const PIXELS_PER_METER = 50;

const ANCHOR_Y = 2;
const STRING_LENGTH = 4;
const BALL_RADIUS = 0.5;
const BALL_COUNT = 5;
const BALL_SPACING = BALL_RADIUS * 2.01;

interface BallData {
  anchorX: number;
}

function NewtonsCradleCanvas() {
  const canvasRef = useCanvasRef();
  const vp = useViewport();

  const { transforms, gesture, isReady } = usePhysicsExample<BallData>({
    pixelsPerMeter: PIXELS_PER_METER,
    enabled: vp.isReady,
    drag: 'force',
    dragStiffness: 50,
    dragDamping: 5,
    onInit: (physics: Physics2D): BodyRecord<BallData>[] => {
      const worldWidth = vp.world.size.width;

      const anchorId = physics.createBody({
        type: "static",
        position: vec2(0, ANCHOR_Y),
      });

      const startX = worldWidth / 2 - ((BALL_COUNT - 1) * BALL_SPACING) / 2;
      const bodies: BodyRecord<BallData>[] = [];

      for (let i = 0; i < BALL_COUNT; i++) {
        const anchorX = startX + i * BALL_SPACING;

        const isFirstBall = i === 0;
        const swingAngle = isFirstBall ? -Math.PI / 4 : 0;
        const ballX = anchorX + STRING_LENGTH * Math.sin(swingAngle);
        const ballY = ANCHOR_Y + STRING_LENGTH * Math.cos(swingAngle);

        const ballId = physics.createBody({
          type: "dynamic",
          position: vec2(ballX, ballY),
          linearDamping: 0,
        });

        physics.addFixture(ballId, {
          shape: { type: "circle", radius: BALL_RADIUS },
          density: 1,
          friction: 0,
          restitution: 1.0,
        });

        physics.createDistanceJoint({
          type: "distance",
          bodyA: anchorId,
          bodyB: ballId,
          anchorA: vec2(anchorX, ANCHOR_Y),
          anchorB: vec2(ballX, ballY),
          stiffness: 0,
          damping: 0,
        });

        bodies.push({
          id: ballId,
          data: { anchorX: anchorX * PIXELS_PER_METER },
        });
      }

      return bodies;
    },
  });

  if (!vp.isReady || !isReady) return null;

  const anchorY = ANCHOR_Y * PIXELS_PER_METER;
  const ballRadiusPx = BALL_RADIUS * PIXELS_PER_METER;

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        <Canvas ref={canvasRef} style={styles.canvas} pointerEvents="none">
          <Fill color="#1a1a2e" />

          {transforms.length > 0 && (
            <Line
              p1={vec(transforms[0].data.anchorX, anchorY)}
              p2={vec(transforms[transforms.length - 1].data.anchorX, anchorY)}
              color="#bdc3c7"
              strokeWidth={4}
            />
          )}

          {transforms.map((b) => (
            <Line
              key={`string-${b.id.value}`}
              p1={vec(b.data.anchorX, anchorY)}
              p2={vec(b.x, b.y)}
              color="#bdc3c7"
              strokeWidth={2}
            />
          ))}

          {transforms.map((b) => (
            <Circle
              key={`ball-${b.id.value}`}
              cx={b.x}
              cy={b.y}
              r={ballRadiusPx}
              color="#e74c3c"
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

export default function NewtonsCradle() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <NewtonsCradleCanvas />
    </ViewportRoot>
  );
}
