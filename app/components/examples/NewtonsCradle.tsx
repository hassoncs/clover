import { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import {
  Canvas,
  Circle,
  Line,
  useCanvasRef,
  Fill,
  vec,
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

const ANCHOR_Y = 2;
const STRING_LENGTH = 4;
const BALL_RADIUS = 0.5;
const BALL_COUNT = 5;
const BALL_SPACING = BALL_RADIUS * 2.01;

interface BallState {
  id: BodyId;
  x: number;
  y: number;
  anchorX: number;
}

function NewtonsCradleCanvas() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const ballIdsRef = useRef<BodyId[]>([]);
  const anchorXsRef = useRef<number[]>([]);

  const [balls, setBalls] = useState<BallState[]>([]);
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

    const setupPhysics = async () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
      }

      const physics = await createPhysics2D();
      physics.createWorld(vec2(0, 9.8));
      physicsRef.current = physics;

      const anchorId = physics.createBody({
        type: "static",
        position: vec2(0, ANCHOR_Y),
      });

      const startX = worldWidth / 2 - ((BALL_COUNT - 1) * BALL_SPACING) / 2;
      const newBallIds: BodyId[] = [];
      const newAnchorXs: number[] = [];
      const initialBalls: BallState[] = [];

      for (let i = 0; i < BALL_COUNT; i++) {
        const anchorX = startX + i * BALL_SPACING;
        newAnchorXs.push(anchorX);

        const isFirstBall = i === 0;
        const ballX = isFirstBall ? anchorX - 2 : anchorX;
        const ballY = isFirstBall ? ANCHOR_Y + STRING_LENGTH - 1 : ANCHOR_Y + STRING_LENGTH;

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

        newBallIds.push(ballId);
        initialBalls.push({
          id: ballId,
          x: ballX * PIXELS_PER_METER,
          y: ballY * PIXELS_PER_METER,
          anchorX: anchorX * PIXELS_PER_METER,
        });
      }

      ballIdsRef.current = newBallIds;
      anchorXsRef.current = newAnchorXs;
      setBalls(initialBalls);
      setIsReady(true);
    };

    setupPhysics();

    return () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      ballIdsRef.current = [];
      anchorXsRef.current = [];
      setIsReady(false);
    };
  }, [vp.world.size.width, vp.isReady]);

  const stepPhysics = useCallback((dt: number) => {
    const physics = physicsRef.current;
    if (!physics) return;

    dragHandlers.applyDragForces();
    physics.step(dt, 8, 3);

    const updatedBalls = ballIdsRef.current.map((id, i) => {
      const transform = physics.getTransform(id);
      return {
        id,
        x: transform.position.x * PIXELS_PER_METER,
        y: transform.position.y * PIXELS_PER_METER,
        anchorX: anchorXsRef.current[i] * PIXELS_PER_METER,
      };
    });
    setBalls(updatedBalls);
  }, [dragHandlers]);

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!vp.isReady) return null;

  const anchorY = ANCHOR_Y * PIXELS_PER_METER;
  const ballRadiusPx = BALL_RADIUS * PIXELS_PER_METER;

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

        {balls.length > 0 && (
          <Line
            p1={vec(balls[0].anchorX, anchorY)}
            p2={vec(balls[balls.length - 1].anchorX, anchorY)}
            color="#bdc3c7"
            strokeWidth={4}
          />
        )}

        {balls.map((b) => (
          <Line
            key={`string-${b.id.value}`}
            p1={vec(b.anchorX, anchorY)}
            p2={vec(b.x, b.y)}
            color="#bdc3c7"
            strokeWidth={2}
          />
        ))}

        {balls.map((b) => (
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
