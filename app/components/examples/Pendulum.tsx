import { View, StyleSheet } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import {
  Canvas,
  Circle,
  useCanvasRef,
  Fill,
  Group,
  Rect,
} from "@shopify/react-native-skia";
import {
  usePhysicsExample,
  vec2,
  type Physics2D,
  type BodyRecord,
} from "../../lib/physics2d";
import { ViewportRoot, useViewport } from "../../lib/viewport";

const PIXELS_PER_METER = 50;

const ANCHOR_Y = 3;
const ARM_LENGTH = 2.5;
const ARM_WIDTH = 0.3;

interface ArmData {
  color: string;
}

function PendulumCanvas() {
  const canvasRef = useCanvasRef();
  const vp = useViewport();

  const { transforms, gesture, isReady } = usePhysicsExample<ArmData>({
    pixelsPerMeter: PIXELS_PER_METER,
    enabled: vp.isReady,
    drag: 'force',
    dragStiffness: 50,
    dragDamping: 5,
    onInit: (physics: Physics2D): BodyRecord<ArmData>[] => {
      const anchorX = vp.world.center.x;

      const anchorId = physics.createBody({
        type: "static",
        position: vec2(anchorX, ANCHOR_Y),
      });

      const arm1Id = physics.createBody({
        type: "dynamic",
        position: vec2(anchorX + ARM_LENGTH / 2, ANCHOR_Y),
      });
      physics.addFixture(arm1Id, {
        shape: { type: "box", halfWidth: ARM_LENGTH / 2, halfHeight: ARM_WIDTH / 2 },
        density: 1,
        friction: 0.2,
      });

      physics.createRevoluteJoint({
        type: "revolute",
        bodyA: anchorId,
        bodyB: arm1Id,
        anchor: vec2(anchorX, ANCHOR_Y),
      });

      const arm2Id = physics.createBody({
        type: "dynamic",
        position: vec2(anchorX + ARM_LENGTH + ARM_LENGTH / 2, ANCHOR_Y),
      });
      physics.addFixture(arm2Id, {
        shape: { type: "box", halfWidth: ARM_LENGTH / 2, halfHeight: ARM_WIDTH / 2 },
        density: 1,
        friction: 0.2,
      });

      physics.createRevoluteJoint({
        type: "revolute",
        bodyA: arm1Id,
        bodyB: arm2Id,
        anchor: vec2(anchorX + ARM_LENGTH, ANCHOR_Y),
      });

      const initialAngle = 1;
      physics.setTransform(arm1Id, {
        position: vec2(
          anchorX + Math.sin(initialAngle) * ARM_LENGTH / 2,
          ANCHOR_Y + Math.cos(initialAngle) * ARM_LENGTH / 2
        ),
        angle: initialAngle,
      });

      return [
        { id: arm1Id, data: { color: "#FF6B6B" } },
        { id: arm2Id, data: { color: "#4ECDC4" } },
      ];
    },
  });

  if (!vp.isReady || !isReady) return null;

  const anchorScreenX = vp.center.x;
  const anchorScreenY = ANCHOR_Y * PIXELS_PER_METER;
  const armWidthPx = ARM_LENGTH * PIXELS_PER_METER;
  const armHeightPx = ARM_WIDTH * PIXELS_PER_METER;

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        <Canvas ref={canvasRef} style={styles.canvas} pointerEvents="none">
          <Fill color="#1a1a2e" />

          <Circle cx={anchorScreenX} cy={anchorScreenY} r={8} color="#666" />

          {transforms.map((arm) => (
            <Group
              key={`arm-${arm.id.value}`}
              transform={[
                { translateX: arm.x },
                { translateY: arm.y },
                { rotate: arm.angle },
              ]}
            >
              <Rect
                x={-armWidthPx / 2}
                y={-armHeightPx / 2}
                width={armWidthPx}
                height={armHeightPx}
                color={arm.data.color}
              />
            </Group>
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

export default function Pendulum() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <PendulumCanvas />
    </ViewportRoot>
  );
}
