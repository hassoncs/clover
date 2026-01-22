import { useState } from "react";
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

const SEGMENT_COUNT = 20;
const SEGMENT_HEIGHT = 0.2;
const BRIDGE_Y = 5;

const BOX_SIZE = 1;
const BOX_COUNT = 5;

interface EntityData {
  type: 'segment' | 'box';
  width?: number;
  height?: number;
  size?: number;
  color: string;
}

function BridgeCanvas() {
  const canvasRef = useCanvasRef();
  const vp = useViewport();
  const [bridgeWidth, setBridgeWidth] = useState(0);

  const { transforms, gesture, isReady } = usePhysicsExample<EntityData>({
    pixelsPerMeter: PIXELS_PER_METER,
    enabled: vp.isReady,
    drag: 'force',
    dragStiffness: 50,
    dragDamping: 5,
    onInit: (physics: Physics2D): BodyRecord<EntityData>[] => {
      const worldWidth = vp.world.size.width;
      const computedBridgeWidth = worldWidth - 2;
      const segmentWidth = computedBridgeWidth / SEGMENT_COUNT;

      setBridgeWidth(computedBridgeWidth);

      const bodies: BodyRecord<EntityData>[] = [];

      const leftAnchorId = physics.createBody({
        type: "static",
        position: vec2(1, BRIDGE_Y),
      });

      const rightAnchorId = physics.createBody({
        type: "static",
        position: vec2(1 + computedBridgeWidth, BRIDGE_Y),
      });

      let prevBodyId = leftAnchorId;

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

        bodies.push({
          id: bodyId,
          data: {
            type: 'segment',
            width: segmentWidth * PIXELS_PER_METER,
            height: SEGMENT_HEIGHT * PIXELS_PER_METER,
            color: '#8B4513',
          },
        });

        prevBodyId = bodyId;
      }

      physics.createRevoluteJoint({
        type: "revolute",
        bodyA: prevBodyId,
        bodyB: rightAnchorId,
        anchor: vec2(1 + computedBridgeWidth, BRIDGE_Y),
      });

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

        bodies.push({
          id: boxId,
          data: {
            type: 'box',
            size: BOX_SIZE * PIXELS_PER_METER,
            color: '#e74c3c',
          },
        });
      }

      return bodies;
    },
  });

  if (!vp.isReady || !isReady) return null;

  const segments = transforms.filter(t => t.data.type === 'segment');
  const boxes = transforms.filter(t => t.data.type === 'box');
  const anchorY = BRIDGE_Y * PIXELS_PER_METER;
  const leftAnchorX = 1 * PIXELS_PER_METER;
  const rightAnchorX = (1 + bridgeWidth) * PIXELS_PER_METER;

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
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
              origin={{ x: 0, y: 0 }}
            >
              <Rect
                x={-s.data.width! / 2}
                y={-s.data.height! / 2}
                width={s.data.width!}
                height={s.data.height!}
                color={s.data.color}
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
              origin={{ x: 0, y: 0 }}
            >
              <Rect
                x={-b.data.size! / 2}
                y={-b.data.size! / 2}
                width={b.data.size!}
                height={b.data.size!}
                color={b.data.color}
              />
            </Group>
          ))}

          <Circle cx={leftAnchorX} cy={anchorY} r={5} color="#fff" />
          <Circle cx={rightAnchorX} cy={anchorY} r={5} color="#fff" />
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

export default function Bridge() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <BridgeCanvas />
    </ViewportRoot>
  );
}
