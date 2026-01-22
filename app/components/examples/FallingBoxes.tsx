import { View, StyleSheet } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import {
  Canvas,
  Rect,
  useCanvasRef,
  Group,
  Fill,
} from "@shopify/react-native-skia";
import {
  usePhysicsExample,
  vec2,
  type Physics2D,
  type BodyRecord,
} from "../../lib/physics2d";
import { ViewportRoot, useViewport } from "../../lib/viewport";

const PIXELS_PER_METER = 50;
const BOX_SIZE = 0.8;
const GROUND_HEIGHT = 3;

interface BoxData {
  width: number;
  height: number;
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
];

function FallingBoxesCanvas() {
  const canvasRef = useCanvasRef();
  const vp = useViewport();

  const { transforms, gesture, isReady, isDragging, getDraggedBody } = usePhysicsExample<BoxData>({
    pixelsPerMeter: PIXELS_PER_METER,
    enabled: vp.isReady,
    drag: 'force',
    dragStiffness: 50,
    dragDamping: 5,
    onInit: (physics: Physics2D): BodyRecord<BoxData>[] => {
      const worldWidth = vp.world.size.width;
      const worldHeight = vp.world.size.height;

      const groundId = physics.createBody({
        type: "static",
        position: vec2(worldWidth / 2, worldHeight - GROUND_HEIGHT / 2),
      });
      physics.addFixture(groundId, {
        shape: { type: "box", halfWidth: worldWidth / 2, halfHeight: GROUND_HEIGHT / 2 },
        density: 0,
        friction: 0.6,
      });

      const leftWallId = physics.createBody({
        type: "static",
        position: vec2(-0.5, worldHeight / 2),
      });
      physics.addFixture(leftWallId, {
        shape: { type: "box", halfWidth: 0.5, halfHeight: worldHeight / 2 },
        density: 0,
      });

      const rightWallId = physics.createBody({
        type: "static",
        position: vec2(worldWidth + 0.5, worldHeight / 2),
      });
      physics.addFixture(rightWallId, {
        shape: { type: "box", halfWidth: 0.5, halfHeight: worldHeight / 2 },
        density: 0,
      });

      const bodies: BodyRecord<BoxData>[] = [];
      const columns = 4;
      const columnSpacing = 1.5;
      const gridWidth = columns * columnSpacing;
      const gridStartX = (worldWidth - gridWidth) / 2 + columnSpacing / 2;

      for (let i = 0; i < 8; i++) {
        const column = i % columns;
        const row = Math.floor(i / columns);
        const bodyId = physics.createBody({
          type: "dynamic",
          position: vec2(
            gridStartX + column * columnSpacing + Math.random() * 0.5,
            1 + row * columnSpacing
          ),
          angle: Math.random() * 0.5 - 0.25,
        });

        physics.addFixture(bodyId, {
          shape: { type: "box", halfWidth: BOX_SIZE / 2, halfHeight: BOX_SIZE / 2 },
          density: 1.0,
          friction: 0.3,
          restitution: 0.2,
        });

        bodies.push({
          id: bodyId,
          data: {
            width: BOX_SIZE * PIXELS_PER_METER,
            height: BOX_SIZE * PIXELS_PER_METER,
            color: COLORS[i % COLORS.length],
          },
        });
      }

      return bodies;
    },
  });

  if (!vp.isReady || !isReady) return null;

  const groundY = vp.size.height - GROUND_HEIGHT * PIXELS_PER_METER;
  const currentDraggedId = getDraggedBody()?.value ?? null;

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        <Canvas ref={canvasRef} style={styles.canvas} pointerEvents="none">
          <Fill color="#1a1a2e" />

          <Rect
            x={0}
            y={groundY}
            width={vp.size.width}
            height={GROUND_HEIGHT * PIXELS_PER_METER}
            color="#2d3436"
          />

          {transforms.map((box) => (
            <Group
              key={`box-${box.id.value}`}
              transform={[
                { translateX: box.x },
                { translateY: box.y },
                { rotate: box.angle },
              ]}
              origin={{ x: 0, y: 0 }}
            >
              <Rect
                x={-box.data.width / 2}
                y={-box.data.height / 2}
                width={box.data.width}
                height={box.data.height}
                color={box.id.value === currentDraggedId ? "#ffffff" : box.data.color}
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

export default function FallingBoxes() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <FallingBoxesCanvas />
    </ViewportRoot>
  );
}
