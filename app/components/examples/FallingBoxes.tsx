import { useEffect, useRef, useState, useCallback } from "react";
import { Dimensions } from "react-native";
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
  type Physics2D,
  type BodyId,
  vec2,
} from "../../lib/physics2d";

const PIXELS_PER_METER = 50;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const WORLD_WIDTH = SCREEN_WIDTH / PIXELS_PER_METER;
const WORLD_HEIGHT = SCREEN_HEIGHT / PIXELS_PER_METER;
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

export default function FallingBoxesV2() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const bodyIdsRef = useRef<BodyId[]>([]);
  const [boxes, setBoxes] = useState<BoxState[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setupPhysics = async () => {
      try {
        const physics = await createPhysics2D();
        physics.createWorld(vec2(0, 9.8));
        physicsRef.current = physics;

        const groundId = physics.createBody({
          type: 'static',
          position: vec2(WORLD_WIDTH / 2, WORLD_HEIGHT - GROUND_HEIGHT / 2),
        });
        physics.addFixture(groundId, {
          shape: { type: 'box', halfWidth: WORLD_WIDTH / 2, halfHeight: GROUND_HEIGHT / 2 },
          density: 0,
          friction: 0.6,
        });

        const newBodyIds: BodyId[] = [];
        const initialBoxes: BoxState[] = [];

        for (let i = 0; i < 8; i++) {
          const bodyId = physics.createBody({
            type: 'dynamic',
            position: vec2(
              1 + (i % 4) * 1.5 + Math.random() * 0.5,
              1 + Math.floor(i / 4) * 1.5
            ),
            angle: Math.random() * 0.5 - 0.25,
          });

          physics.addFixture(bodyId, {
            shape: { type: 'box', halfWidth: BOX_SIZE / 2, halfHeight: BOX_SIZE / 2 },
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
    };
  }, []);

  // Physics step - uses vsync-aligned timing via useSimplePhysicsLoop
  const stepPhysics = useCallback((dt: number) => {
    if (!physicsRef.current) return;

    physicsRef.current.step(dt, 8, 3);

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
      };
    });

    setBoxes(updatedBoxes);
  }, []);

  // Use the physics loop hook - handles useFrameCallback + runOnJS internally
  useSimplePhysicsLoop(stepPhysics, isReady);

  return (
    <Canvas ref={canvasRef} style={{ flex: 1 }}>
      <Fill color="#1a1a2e" />

      <Rect
        x={0}
        y={SCREEN_HEIGHT - GROUND_HEIGHT * PIXELS_PER_METER}
        width={SCREEN_WIDTH}
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
            color={box.color}
          />
        </Group>
      ))}
    </Canvas>
  );
}
