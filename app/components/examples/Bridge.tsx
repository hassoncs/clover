import { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
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

const SEGMENT_COUNT = 20;
const SEGMENT_HEIGHT = 0.2;
const BRIDGE_Y = 5;

const BOX_SIZE = 1;
const BOX_COUNT = 5;

interface SegmentState {
  id: BodyId;
  x: number;
  y: number;
  angle: number;
}

interface BoxState {
  id: BodyId;
  x: number;
  y: number;
  angle: number;
}

function BridgeCanvas() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const segmentIdsRef = useRef<BodyId[]>([]);
  const boxIdsRef = useRef<BodyId[]>([]);

  const [segments, setSegments] = useState<SegmentState[]>([]);
  const [boxes, setBoxes] = useState<BoxState[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [bridgeWidth, setBridgeWidth] = useState(0);

  const vp = useViewport();

  const dragHandlers = useForceDrag(physicsRef, {
    pixelsPerMeter: PIXELS_PER_METER,
    stiffness: 50,
    damping: 5,
  });

  useEffect(() => {
    if (!vp.isReady) return;

    const worldWidth = vp.world.size.width;
    const computedBridgeWidth = worldWidth - 2;
    const segmentWidth = computedBridgeWidth / SEGMENT_COUNT;

    setBridgeWidth(computedBridgeWidth);

    const setupPhysics = async () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
      }

      const physics = await createPhysics2D();
      physics.createWorld(vec2(0, 9.8));
      physicsRef.current = physics;

      const leftAnchorId = physics.createBody({
        type: "static",
        position: vec2(1, BRIDGE_Y),
      });

      const rightAnchorId = physics.createBody({
        type: "static",
        position: vec2(1 + computedBridgeWidth, BRIDGE_Y),
      });

      let prevBodyId = leftAnchorId;
      const newSegmentIds: BodyId[] = [];

      for (let i = 0; i < SEGMENT_COUNT; i++) {
        const x = 1 + segmentWidth * (i + 0.5);
        const bodyId = physics.createBody({
          type: "dynamic",
          position: vec2(x, BRIDGE_Y),
        });

        physics.addFixture(bodyId, {
          shape: { type: "box", halfWidth: segmentWidth / 2, halfHeight: SEGMENT_HEIGHT / 2 },
          density: 20,
          friction: 0.2,
        });

        physics.createRevoluteJoint({
          type: "revolute",
          bodyA: prevBodyId,
          bodyB: bodyId,
          anchor: vec2(1 + segmentWidth * i, BRIDGE_Y),
        });

        prevBodyId = bodyId;
        newSegmentIds.push(bodyId);
      }

      physics.createRevoluteJoint({
        type: "revolute",
        bodyA: prevBodyId,
        bodyB: rightAnchorId,
        anchor: vec2(1 + computedBridgeWidth, BRIDGE_Y),
      });

      segmentIdsRef.current = newSegmentIds;

      const newBoxIds: BodyId[] = [];
      for (let i = 0; i < BOX_COUNT; i++) {
        const x = 1 + computedBridgeWidth / 2 + (Math.random() - 0.5);
        const y = 1 - i * 1.5;

        const boxId = physics.createBody({
          type: "dynamic",
          position: vec2(x, y),
        });

        physics.addFixture(boxId, {
          shape: { type: "box", halfWidth: BOX_SIZE / 2, halfHeight: BOX_SIZE / 2 },
          density: 1,
          friction: 0.3,
        });

        newBoxIds.push(boxId);
      }
      boxIdsRef.current = newBoxIds;

      setIsReady(true);
    };

    setupPhysics();

    return () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      segmentIdsRef.current = [];
      boxIdsRef.current = [];
      setIsReady(false);
    };
  }, [vp.world.size.width, vp.world.size.height, vp.isReady]);

  const stepPhysics = useCallback((dt: number) => {
    const physics = physicsRef.current;
    if (!physics) return;

    dragHandlers.applyDragForces();
    physics.step(dt, 8, 3);

    const updatedSegments = segmentIdsRef.current.map((id) => {
      const transform = physics.getTransform(id);
      return {
        id,
        x: transform.position.x * PIXELS_PER_METER,
        y: transform.position.y * PIXELS_PER_METER,
        angle: transform.angle,
      };
    });
    setSegments(updatedSegments);

    const updatedBoxes = boxIdsRef.current.map((id) => {
      const transform = physics.getTransform(id);
      return {
        id,
        x: transform.position.x * PIXELS_PER_METER,
        y: transform.position.y * PIXELS_PER_METER,
        angle: transform.angle,
      };
    });
    setBoxes(updatedBoxes);
  }, [dragHandlers]);

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!vp.isReady) return null;

  const segmentWidth = bridgeWidth / SEGMENT_COUNT;
  const segmentWidthPx = segmentWidth * PIXELS_PER_METER;
  const segmentHeightPx = SEGMENT_HEIGHT * PIXELS_PER_METER;
  const boxSizePx = BOX_SIZE * PIXELS_PER_METER;
  const anchorY = BRIDGE_Y * PIXELS_PER_METER;
  const leftAnchorX = 1 * PIXELS_PER_METER;
  const rightAnchorX = (1 + bridgeWidth) * PIXELS_PER_METER;

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

        {segments.map((s) => (
          <Group
            key={`segment-${s.id.value}`}
            transform={[
              { translateX: s.x },
              { translateY: s.y },
              { rotate: s.angle },
            ]}
          >
            <Rect
              x={-segmentWidthPx / 2}
              y={-segmentHeightPx / 2}
              width={segmentWidthPx}
              height={segmentHeightPx}
              color="#8B4513"
            />
          </Group>
        ))}

        {boxes.map((b) => (
          <Group
            key={`box-${b.id.value}`}
            transform={[
              { translateX: b.x },
              { translateY: b.y },
              { rotate: b.angle },
            ]}
          >
            <Rect
              x={-boxSizePx / 2}
              y={-boxSizePx / 2}
              width={boxSizePx}
              height={boxSizePx}
              color="#e74c3c"
            />
          </Group>
        ))}

        <Circle cx={leftAnchorX} cy={anchorY} r={5} color="#fff" />
        <Circle cx={rightAnchorX} cy={anchorY} r={5} color="#fff" />
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

export default function Bridge() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <BridgeCanvas />
    </ViewportRoot>
  );
}
