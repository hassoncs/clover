import { useEffect, useRef, useState, useCallback } from "react";
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
  createPhysics2D,
  useSimplePhysicsLoop,
  useForceDrag,
  type Physics2D,
  type BodyId,
  vec2,
} from "../../lib/physics2d";
import { ViewportRoot, useViewport } from "../../lib/viewport";

const PIXELS_PER_METER = 50;
const BOX_SIZE = 0.8;
const GROUND_HEIGHT = 3;

interface BoxState {
  id: BodyId;
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
  color: string;
  isDragging: boolean;
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
  const physicsRef = useRef<Physics2D | null>(null);
  const bodyIdsRef = useRef<BodyId[]>([]);
  const [boxes, setBoxes] = useState<BoxState[]>([]);
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

    const setupPhysics = async () => {
      try {
        if (physicsRef.current) {
          physicsRef.current.destroyWorld();
        }

        const physics = await createPhysics2D();
        physics.createWorld(vec2(0, 9.8));
        physicsRef.current = physics;

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

        const newBodyIds: BodyId[] = [];
        const initialBoxes: BoxState[] = [];

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

          newBodyIds.push(bodyId);

          const transform = physics.getTransform(bodyId);
          initialBoxes.push({
            id: bodyId,
            x: transform.position.x * PIXELS_PER_METER,
            y: transform.position.y * PIXELS_PER_METER,
            angle: transform.angle,
            width: BOX_SIZE * PIXELS_PER_METER,
            height: BOX_SIZE * PIXELS_PER_METER,
            color: COLORS[i % COLORS.length],
            isDragging: false,
          });
        }

        bodyIdsRef.current = newBodyIds;
        setBoxes(initialBoxes);
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
      setIsReady(false);
    };
  }, [vp.world.size.width, vp.world.size.height, vp.isReady]);

  const stepPhysics = useCallback((dt: number) => {
    if (!physicsRef.current) return;

    dragHandlers.applyDragForces();
    physicsRef.current.step(dt, 8, 3);

    const currentDraggedId = dragHandlers.getDraggedBody()?.value ?? null;

    const updatedBoxes = bodyIdsRef.current.map((bodyId, i) => {
      const transform = physicsRef.current!.getTransform(bodyId);
      return {
        id: bodyId,
        x: transform.position.x * PIXELS_PER_METER,
        y: transform.position.y * PIXELS_PER_METER,
        angle: transform.angle,
        width: BOX_SIZE * PIXELS_PER_METER,
        height: BOX_SIZE * PIXELS_PER_METER,
        color: COLORS[i % COLORS.length],
        isDragging: bodyId.value === currentDraggedId,
      };
    });

    setBoxes(updatedBoxes);
  }, [dragHandlers]);

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!vp.isReady) return null;

  const groundY = vp.size.height - GROUND_HEIGHT * PIXELS_PER_METER;

  return (
    <GestureDetector gesture={dragHandlers.gesture}>
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

          {boxes.map((box) => (
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
                x={-box.width / 2}
                y={-box.height / 2}
                width={box.width}
                height={box.height}
                color={box.isDragging ? "#ffffff" : box.color}
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
