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

const DOMINO_WIDTH = 0.2;
const DOMINO_HEIGHT = 1.0;
const DOMINO_COUNT = 15;
const DOMINO_SPACING = 0.8;

const BALL_RADIUS = 0.5;
const BALL_INITIAL_VELOCITY = 5;

interface DominoState {
  id: BodyId;
  x: number;
  y: number;
  angle: number;
}

interface BallState {
  id: BodyId;
  x: number;
  y: number;
}

function DominoesCanvas() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const dominoIdsRef = useRef<BodyId[]>([]);
  const ballIdRef = useRef<BodyId | null>(null);

  const [dominoes, setDominoes] = useState<DominoState[]>([]);
  const [ball, setBall] = useState<BallState | null>(null);
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
    const groundY = worldHeight - 1;

    const setupPhysics = async () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
      }

      const physics = await createPhysics2D();
      physics.createWorld(vec2(0, 9.8));
      physicsRef.current = physics;

      const groundId = physics.createBody({
        type: "static",
        position: vec2(worldWidth / 2, groundY + 0.5),
      });
      physics.addFixture(groundId, {
        shape: { type: "box", halfWidth: worldWidth / 2, halfHeight: 0.5 },
        density: 0,
        friction: 0.6,
      });

      const newDominoIds: BodyId[] = [];
      const dominoRowWidth = DOMINO_COUNT * DOMINO_SPACING;
      const dominoStartX = (worldWidth - dominoRowWidth) / 2 + DOMINO_SPACING / 2;

      for (let i = 0; i < DOMINO_COUNT; i++) {
        const x = dominoStartX + i * DOMINO_SPACING;
        const y = groundY - DOMINO_HEIGHT / 2;

        const bodyId = physics.createBody({
          type: "dynamic",
          position: vec2(x, y),
        });

        physics.addFixture(bodyId, {
          shape: { type: "box", halfWidth: DOMINO_WIDTH / 2, halfHeight: DOMINO_HEIGHT / 2 },
          density: 5,
          friction: 0.5,
          restitution: 0.1,
        });

        newDominoIds.push(bodyId);
      }
      dominoIdsRef.current = newDominoIds;

      const ballStartX = dominoStartX - 2;
      const ballStartY = groundY - 2;

      const ballId = physics.createBody({
        type: "dynamic",
        position: vec2(ballStartX, ballStartY),
      });
      physics.addFixture(ballId, {
        shape: { type: "circle", radius: BALL_RADIUS },
        density: 20,
        friction: 0.3,
        restitution: 0.2,
      });
      physics.setLinearVelocity(ballId, vec2(BALL_INITIAL_VELOCITY, 0));
      ballIdRef.current = ballId;

      setIsReady(true);
    };

    setupPhysics();

    return () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      dominoIdsRef.current = [];
      ballIdRef.current = null;
      setIsReady(false);
    };
  }, [vp.world.size.width, vp.world.size.height, vp.isReady]);

  const stepPhysics = useCallback((dt: number) => {
    const physics = physicsRef.current;
    if (!physics) return;

    dragHandlers.applyDragForces();
    physics.step(dt, 8, 3);

    const updatedDominoes = dominoIdsRef.current.map((id) => {
      const transform = physics.getTransform(id);
      return {
        id,
        x: transform.position.x * PIXELS_PER_METER,
        y: transform.position.y * PIXELS_PER_METER,
        angle: transform.angle,
      };
    });
    setDominoes(updatedDominoes);

    if (ballIdRef.current) {
      const ballTransform = physics.getTransform(ballIdRef.current);
      setBall({
        id: ballIdRef.current,
        x: ballTransform.position.x * PIXELS_PER_METER,
        y: ballTransform.position.y * PIXELS_PER_METER,
      });
    }
  }, [dragHandlers]);

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!vp.isReady) return null;

  const groundY = vp.world.size.height - 1;
  const dominoWidthPx = DOMINO_WIDTH * PIXELS_PER_METER;
  const dominoHeightPx = DOMINO_HEIGHT * PIXELS_PER_METER;
  const ballRadiusPx = BALL_RADIUS * PIXELS_PER_METER;

  return (
    <GestureDetector gesture={dragHandlers.gesture}>
      <View style={styles.container}>
        <Canvas ref={canvasRef} style={styles.canvas} pointerEvents="none">
          <Fill color="#1a1a2e" />

          <Rect
            x={0}
            y={groundY * PIXELS_PER_METER}
            width={vp.size.width}
            height={PIXELS_PER_METER}
            color="#7f8c8d"
          />

          {dominoes.map((d) => (
            <Group
              key={`domino-${d.id.value}`}
              transform={[
                { translateX: d.x },
                { translateY: d.y },
                { rotate: d.angle },
              ]}
            >
              <Rect
                x={-dominoWidthPx / 2}
                y={-dominoHeightPx / 2}
                width={dominoWidthPx}
                height={dominoHeightPx}
                color="#e67e22"
              />
            </Group>
          ))}

          {ball && (
            <Circle cx={ball.x} cy={ball.y} r={ballRadiusPx} color="#2c3e50" />
          )}
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

export default function Dominoes() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <DominoesCanvas />
    </ViewportRoot>
  );
}
