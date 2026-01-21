import { useEffect, useRef, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import {
  Canvas,
  Circle,
  useCanvasRef,
  Fill,
  Group,
  Rect,
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

const ANCHOR_Y = 3;
const ARM_LENGTH = 2.5;
const ARM_WIDTH = 0.3;

interface ArmState {
  id: BodyId;
  x: number;
  y: number;
  angle: number;
}

function PendulumCanvas() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const arm1IdRef = useRef<BodyId | null>(null);
  const arm2IdRef = useRef<BodyId | null>(null);

  const [arm1, setArm1] = useState<ArmState | null>(null);
  const [arm2, setArm2] = useState<ArmState | null>(null);
  const [isReady, setIsReady] = useState(false);

  const vp = useViewport();

  const dragHandlers = useForceDrag(physicsRef, {
    pixelsPerMeter: PIXELS_PER_METER,
    stiffness: 50,
    damping: 5,
  });

  useEffect(() => {
    if (!vp.isReady) return;

    const anchorX = vp.world.center.x;

    const setupPhysics = async () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
      }

      const physics = await createPhysics2D();
      physics.createWorld(vec2(0, 9.8));
      physicsRef.current = physics;

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
      arm1IdRef.current = arm1Id;

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
      arm2IdRef.current = arm2Id;

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

      setIsReady(true);
    };

    setupPhysics();

    return () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      arm1IdRef.current = null;
      arm2IdRef.current = null;
      setIsReady(false);
    };
  }, [vp.world.center.x, vp.isReady]);

  const stepPhysics = useCallback((dt: number) => {
    const physics = physicsRef.current;
    if (!physics || !arm1IdRef.current || !arm2IdRef.current) return;

    dragHandlers.applyDragForces();
    physics.step(dt, 8, 3);

    const transform1 = physics.getTransform(arm1IdRef.current);
    setArm1({
      id: arm1IdRef.current,
      x: transform1.position.x * PIXELS_PER_METER,
      y: transform1.position.y * PIXELS_PER_METER,
      angle: transform1.angle,
    });

    const transform2 = physics.getTransform(arm2IdRef.current);
    setArm2({
      id: arm2IdRef.current,
      x: transform2.position.x * PIXELS_PER_METER,
      y: transform2.position.y * PIXELS_PER_METER,
      angle: transform2.angle,
    });
  }, [dragHandlers]);

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!vp.isReady) return null;

  const anchorScreenX = vp.center.x;
  const anchorScreenY = ANCHOR_Y * PIXELS_PER_METER;
  const armWidthPx = ARM_LENGTH * PIXELS_PER_METER;
  const armHeightPx = ARM_WIDTH * PIXELS_PER_METER;

  return (
    <View
      style={styles.container}
      onStartShouldSetResponder={() => true}
      onResponderGrant={dragHandlers.onTouchStart}
      onResponderMove={dragHandlers.onTouchMove}
      onResponderRelease={dragHandlers.onTouchEnd}
      onResponderTerminate={dragHandlers.onTouchEnd}
    >
      <Canvas ref={canvasRef} style={styles.canvas} pointerEvents="none">
        <Fill color="#1a1a2e" />

        <Circle cx={anchorScreenX} cy={anchorScreenY} r={8} color="#666" />

        {arm1 && (
          <Group
            transform={[
              { translateX: arm1.x },
              { translateY: arm1.y },
              { rotate: arm1.angle },
            ]}
          >
            <Rect
              x={-armWidthPx / 2}
              y={-armHeightPx / 2}
              width={armWidthPx}
              height={armHeightPx}
              color="#FF6B6B"
            />
          </Group>
        )}

        {arm2 && (
          <Group
            transform={[
              { translateX: arm2.x },
              { translateY: arm2.y },
              { rotate: arm2.angle },
            ]}
          >
            <Rect
              x={-armWidthPx / 2}
              y={-armHeightPx / 2}
              width={armWidthPx}
              height={armHeightPx}
              color="#4ECDC4"
            />
          </Group>
        )}
      </Canvas>
    </View>
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
