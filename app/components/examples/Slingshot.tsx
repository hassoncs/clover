import { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import {
  Canvas,
  Rect,
  Circle,
  Line,
  useCanvasRef,
  Fill,
  Group,
  vec,
} from "@shopify/react-native-skia";
import {
  createPhysics2D,
  useSimplePhysicsLoop,
  type Physics2D,
  type BodyId,
  vec2,
} from "../../lib/physics2d";
import { ViewportRoot, useViewport } from "../../lib/viewport";

const PIXELS_PER_METER = 50;

const BALL_RADIUS = 0.3;
const SLINGSHOT_POS = { x: 3, y: 8 };
const MAX_PULL_DISTANCE = 2;
const LAUNCH_IMPULSE_MULTIPLIER = 15;

interface BallState {
  id: BodyId;
  x: number;
  y: number;
  isDragging: boolean;
}

interface TargetState {
  id: BodyId;
  x: number;
  y: number;
  isHit: boolean;
}

interface DragState {
  ballId: BodyId;
  anchorX: number;
  anchorY: number;
  currentX: number;
  currentY: number;
}

function SlingshotCanvas() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const ballIdRef = useRef<BodyId | null>(null);
  const targetIdsRef = useRef<BodyId[]>([]);
  const dragStateRef = useRef<DragState | null>(null);
  
  const [ball, setBall] = useState<BallState | null>(null);
  const [targets, setTargets] = useState<TargetState[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [score, setScore] = useState(0);
  const [shots, setShots] = useState(0);

  const vp = useViewport();

  const handleTouchStart = useCallback((event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const worldX = locationX / PIXELS_PER_METER;
    const worldY = locationY / PIXELS_PER_METER;

    // Check if touching near slingshot
    const dx = worldX - SLINGSHOT_POS.x;
    const dy = worldY - SLINGSHOT_POS.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1.5 && ballIdRef.current) {
      const physics = physicsRef.current;
      if (!physics) return;

      // Stop the ball if it's moving
      physics.setLinearVelocity(ballIdRef.current, vec2(0, 0));
      physics.setAngularVelocity(ballIdRef.current, 0);

      dragStateRef.current = {
        ballId: ballIdRef.current,
        anchorX: SLINGSHOT_POS.x,
        anchorY: SLINGSHOT_POS.y,
        currentX: worldX,
        currentY: worldY,
      };
    }
  }, []);

  const handleTouchMove = useCallback((event: any) => {
    if (!dragStateRef.current) return;

    const { locationX, locationY } = event.nativeEvent;
    const worldX = locationX / PIXELS_PER_METER;
    const worldY = locationY / PIXELS_PER_METER;

    const { anchorX, anchorY } = dragStateRef.current;
    let dx = worldX - anchorX;
    let dy = worldY - anchorY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp to max pull distance
    if (dist > MAX_PULL_DISTANCE) {
      dx = (dx / dist) * MAX_PULL_DISTANCE;
      dy = (dy / dist) * MAX_PULL_DISTANCE;
    }

    dragStateRef.current = {
      ...dragStateRef.current,
      currentX: anchorX + dx,
      currentY: anchorY + dy,
    };
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!dragStateRef.current || !ballIdRef.current) {
      dragStateRef.current = null;
      return;
    }

    const physics = physicsRef.current;
    if (!physics) return;

    const { anchorX, anchorY, currentX, currentY } = dragStateRef.current;

    // Calculate launch vector
    const dx = anchorX - currentX;
    const dy = anchorY - currentY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.2) {
      // Apply impulse in opposite direction of pull
      const impulseX = dx * LAUNCH_IMPULSE_MULTIPLIER;
      const impulseY = dy * LAUNCH_IMPULSE_MULTIPLIER;
      physics.applyImpulseToCenter(ballIdRef.current, vec2(impulseX, impulseY));
      setShots(s => s + 1);
    }

    // Reset ball position if needed
    const ballTransform = physics.getTransform(ballIdRef.current);
    if (ballTransform.position.y > vp.world.size.height + 5 || 
        ballTransform.position.x > vp.world.size.width + 5 ||
        ballTransform.position.x < -5) {
      physics.setTransform(ballIdRef.current, {
        position: vec2(SLINGSHOT_POS.x, SLINGSHOT_POS.y),
        angle: 0,
      });
    }

    dragStateRef.current = null;
  }, [vp.world.size.width, vp.world.size.height]);

  const createTargets = useCallback((physics: Physics2D, centerX: number) => {
    const newTargetIds: BodyId[] = [];
    const newTargets: TargetState[] = [];

    // Create pyramid of boxes
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col <= row; col++) {
        const x = centerX + (col - row / 2) * 0.8;
        const y = vp.world.size.height - 2 - row * 0.6;
        
        const targetId = physics.createBody({
          type: "dynamic",
          position: vec2(x, y),
        });

        physics.addFixture(targetId, {
          shape: { type: "box", halfWidth: 0.35, halfHeight: 0.35 },
          density: 1,
          friction: 0.5,
          restitution: 0.2,
        });

        newTargetIds.push(targetId);
        newTargets.push({
          id: targetId,
          x: x * PIXELS_PER_METER,
          y: y * PIXELS_PER_METER,
          isHit: false,
        });
      }
    }

    targetIdsRef.current = newTargetIds;
    setTargets(newTargets);
  }, [vp.world.size.height]);

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

      // Ground
      const groundY = worldWidth - 1;
      const groundId = physics.createBody({
        type: "static",
        position: vec2(worldWidth / 2, groundY + 0.5),
      });
      physics.addFixture(groundId, {
        shape: { type: "box", halfWidth: worldWidth / 2, halfHeight: 0.5 },
        density: 0,
        friction: 0.8,
      });

      // Create ball
      const ballId = physics.createBody({
        type: "dynamic",
        position: vec2(SLINGSHOT_POS.x, SLINGSHOT_POS.y),
        bullet: true,
      });
      physics.addFixture(ballId, {
        shape: { type: "circle", radius: BALL_RADIUS },
        density: 3,
        friction: 0.3,
        restitution: 0.6,
      });
      ballIdRef.current = ballId;

      // Create targets
      createTargets(physics, worldWidth * 0.7);

      // Collision detection for scoring
      physics.onCollisionBegin((event) => {
        const ballColliderId = 1; // Ball is first fixture
        for (let i = 0; i < targetIdsRef.current.length; i++) {
          // Simple scoring - if ball hits anything and has high velocity
          const vel = physics.getLinearVelocity(ballIdRef.current!);
          const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
          if (speed > 3) {
            setScore(s => s + 10);
          }
        }
      });

      setIsReady(true);
    };

    setupPhysics();

    return () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      ballIdRef.current = null;
      targetIdsRef.current = [];
      dragStateRef.current = null;
      setIsReady(false);
    };
  }, [vp.world.size.width, vp.world.size.height, vp.isReady, createTargets]);

  const checkBallOutOfBoundsAndReset = useCallback((physics: Physics2D, ballTransform: { position: { x: number; y: number; }; }) => {
    if (ballTransform.position.y > vp.world.size.height + 5 || 
        ballTransform.position.x > vp.world.size.width + 5) {
      physics.setTransform(ballIdRef.current!, {
        position: vec2(SLINGSHOT_POS.x, SLINGSHOT_POS.y),
        angle: 0,
      });
      physics.setLinearVelocity(ballIdRef.current!, vec2(0, 0));
      physics.setAngularVelocity(ballIdRef.current!, 0);
    }
  }, [vp.world.size.height, vp.world.size.width]);

  const stepPhysics = useCallback((dt: number) => {
    const physics = physicsRef.current;
    if (!physics || !ballIdRef.current) return;

    physics.step(dt, 8, 3);

    const ballTransform = physics.getTransform(ballIdRef.current);
    setBall({
      id: ballIdRef.current,
      x: ballTransform.position.x * PIXELS_PER_METER,
      y: ballTransform.position.y * PIXELS_PER_METER,
      isDragging: dragStateRef.current !== null,
    });

    checkBallOutOfBoundsAndReset(physics, ballTransform);
  }, [checkBallOutOfBoundsAndReset]);

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!vp.isReady) return null;

  const groundY = vp.world.size.height - 1;
  const slingX = SLINGSHOT_POS.x * PIXELS_PER_METER;
  const slingY = SLINGSHOT_POS.y * PIXELS_PER_METER;

  const dragLine = dragStateRef.current ? {
    startX: slingX,
    startY: slingY,
    endX: dragStateRef.current.currentX * PIXELS_PER_METER,
    endY: dragStateRef.current.currentY * PIXELS_PER_METER,
  } : null;

  const handleReset = () => {
    const physics = physicsRef.current;
    if (!physics) return;
    
    // Reset ball
    physics.setTransform(ballIdRef.current!, {
      position: vec2(SLINGSHOT_POS.x, SLINGSHOT_POS.y),
      angle: 0,
    });
    physics.setLinearVelocity(ballIdRef.current!, vec2(0, 0));
    physics.setAngularVelocity(ballIdRef.current!, 0);
    
    // Recreate targets
    createTargets(physics, vp.world.size.width * 0.7);
    setScore(0);
    setShots(0);
  };

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <View style={styles.stats}>
          <Text style={styles.score}>Score: {score}</Text>
          <Text style={styles.shots}>Shots: {shots}</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleReset}>
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>
      </View>
      
      <View
        style={styles.canvasContainer}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
        onResponderRelease={handleTouchEnd}
        onResponderTerminate={handleTouchEnd}
      >
        <Canvas ref={canvasRef} style={styles.canvas} pointerEvents="none">
          <Fill color="#1a1a2e" />

          {/* Ground */}
          <Rect
            x={0}
            y={groundY * PIXELS_PER_METER}
            width={vp.size.width}
            height={PIXELS_PER_METER}
            color="#2d3436"
          />

          {/* Slingshot base */}
          <Rect
            x={slingX - 10}
            y={slingY + BALL_RADIUS * PIXELS_PER_METER}
            width={20}
            height={40}
            color="#8B4513"
          />

          {/* Drag line */}
          {dragLine && (
            <>
              <Line
                p1={vec(dragLine.startX, dragLine.startY)}
                p2={vec(dragLine.endX, dragLine.endY)}
                color="#ffffff"
                style="stroke"
                strokeWidth={3}
              />
              <Circle
                cx={dragLine.endX}
                cy={dragLine.endY}
                r={BALL_RADIUS * PIXELS_PER_METER}
                color="#e74c3c"
              />
            </>
          )}

          {/* Ball */}
          {ball && !dragStateRef.current && (
            <Circle
              cx={ball.x}
              cy={ball.y}
              r={BALL_RADIUS * PIXELS_PER_METER}
              color={ball.isDragging ? "#ffffff" : "#e74c3c"}
            />
          )}

          {/* Targets */}
          {targets.map((target, index) => (
            <Rect
              key={`target-${index}`}
              x={target.x - 0.35 * PIXELS_PER_METER}
              y={target.y - 0.35 * PIXELS_PER_METER}
              width={0.7 * PIXELS_PER_METER}
              height={0.7 * PIXELS_PER_METER}
              color="#f39c12"
            />
          ))}
        </Canvas>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#1a1a2e",
    borderBottomWidth: 1,
    borderBottomColor: "#2d3436",
  },
  stats: {
    flexDirection: "row",
    gap: 20,
  },
  score: {
    color: "#f1c40f",
    fontSize: 20,
    fontWeight: "bold",
  },
  shots: {
    color: "#bdc3c7",
    fontSize: 20,
  },
  button: {
    backgroundColor: "#3498db",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  canvasContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});

export default function Slingshot() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <SlingshotCanvas />
    </ViewportRoot>
  );
}
