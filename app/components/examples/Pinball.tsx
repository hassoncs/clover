import { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
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
  type ColliderId,
  vec2,
} from "../../lib/physics2d";
import { ViewportRoot, useViewport } from "../../lib/viewport";

const PIXELS_PER_METER = 50;

const BALL_RADIUS = 0.25;
const FLIPPER_LENGTH = 1.5;
const FLIPPER_WIDTH = 0.3;
const BUMPER_RADIUS = 0.4;

interface BallState {
  id: BodyId;
  x: number;
  y: number;
}

interface FlipperState {
  leftAngle: number;
  rightAngle: number;
}

interface BumperState {
  x: number;
  y: number;
  isHit: boolean;
}

function PinballCanvas() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const ballIdRef = useRef<BodyId | null>(null);
  const leftFlipperIdRef = useRef<BodyId | null>(null);
  const rightFlipperIdRef = useRef<BodyId | null>(null);
  const bumperIdsRef = useRef<BodyId[]>([]);
  const bumperColliderIdsRef = useRef<ColliderId[]>([]);
  
  const [ball, setBall] = useState<BallState | null>(null);
  const [flippers, setFlippers] = useState<FlipperState>({ leftAngle: 0.3, rightAngle: -0.3 });
  const [bumpers, setBumpers] = useState<BumperState[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [score, setScore] = useState(0);

  const vp = useViewport();

  const dragHandlers = useForceDrag(physicsRef, {
    pixelsPerMeter: PIXELS_PER_METER,
    stiffness: 50,
    damping: 5,
  });

  const handleLeftFlipper = useCallback(() => {
    const physics = physicsRef.current;
    if (!physics || !leftFlipperIdRef.current) return;
    
    const targetAngle = flippers.leftAngle > 0 ? -0.5 : 0.3;
    setFlippers(prev => ({ ...prev, leftAngle: targetAngle }));
  }, [flippers.leftAngle]);

  const handleRightFlipper = useCallback(() => {
    const physics = physicsRef.current;
    if (!physics || !rightFlipperIdRef.current) return;
    
    const targetAngle = flippers.rightAngle < 0 ? 0.5 : -0.3;
    setFlippers(prev => ({ ...prev, rightAngle: targetAngle }));
  }, [flippers.rightAngle]);

  useEffect(() => {
    if (!vp.isReady) return;

    // Keyboard controls for flippers
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        handleLeftFlipper();
      } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        handleRightFlipper();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    const worldWidth = vp.world.size.width;
    const worldHeight = vp.world.size.height;

    const setupPhysics = async () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
      }

      const physics = await createPhysics2D();
      physics.createWorld(vec2(0, 5)); // Reduced gravity for better playability
      physicsRef.current = physics;

      // Create walls - proper pinball table boundaries
      const wallThickness = 0.5;
      
      // Left wall (angled)
      const leftWallId = physics.createBody({
        type: "static",
        position: vec2(1, worldHeight * 0.4),
        angle: 0.15,
      });
      physics.addFixture(leftWallId, {
        shape: { type: "box", halfWidth: wallThickness, halfHeight: worldHeight * 0.4 },
        density: 0,
        friction: 0.3,
        restitution: 0.6,
      });

      // Right wall (angled)
      const rightWallId = physics.createBody({
        type: "static",
        position: vec2(worldWidth - 1, worldHeight * 0.4),
        angle: -0.15,
      });
      physics.addFixture(rightWallId, {
        shape: { type: "box", halfWidth: wallThickness, halfHeight: worldHeight * 0.4 },
        density: 0,
        friction: 0.3,
        restitution: 0.6,
      });

      // Top wall (flat)
      const topWallId = physics.createBody({
        type: "static",
        position: vec2(worldWidth / 2, 1.5),
      });
      physics.addFixture(topWallId, {
        shape: { type: "box", halfWidth: worldWidth / 2 - 1, halfHeight: 0.5 },
        density: 0,
        friction: 0.3,
        restitution: 0.8,
      });

      // Bottom walls (for flippers)
      const flipperAreaY = worldHeight - 4;
      const leftBottomWallId = physics.createBody({
        type: "static",
        position: vec2(worldWidth * 0.25, flipperAreaY + 1),
        angle: 0.3,
      });
      physics.addFixture(leftBottomWallId, {
        shape: { type: "box", halfWidth: 2, halfHeight: 0.3 },
        density: 0,
        friction: 0.3,
        restitution: 0.5,
      });

      const rightBottomWallId = physics.createBody({
        type: "static",
        position: vec2(worldWidth * 0.75, flipperAreaY + 1),
        angle: -0.3,
      });
      physics.addFixture(rightBottomWallId, {
        shape: { type: "box", halfWidth: 2, halfHeight: 0.3 },
        density: 0,
        friction: 0.3,
        restitution: 0.5,
      });

      // Create flippers
      const flipperY = worldHeight - 3;
      const leftFlipperX = worldWidth * 0.35;
      const rightFlipperX = worldWidth * 0.65;

      const leftFlipperId = physics.createBody({
        type: "dynamic",
        position: vec2(leftFlipperX, flipperY),
      });
      physics.addFixture(leftFlipperId, {
        shape: { type: "box", halfWidth: FLIPPER_LENGTH / 2, halfHeight: FLIPPER_WIDTH / 2 },
        density: 5,
        friction: 0.3,
        restitution: 0.5,
      });
      leftFlipperIdRef.current = leftFlipperId;

      // Left flipper hinge (static)
      const leftHingeId = physics.createBody({
        type: "static",
        position: vec2(leftFlipperX - FLIPPER_LENGTH / 2 + 0.2, flipperY),
      });
      physics.addFixture(leftHingeId, {
        shape: { type: "circle", radius: 0.2 },
        density: 0,
      });

      physics.createRevoluteJoint({
        type: "revolute",
        bodyA: leftHingeId,
        bodyB: leftFlipperId,
        anchor: vec2(leftFlipperX - FLIPPER_LENGTH / 2 + 0.2, flipperY),
        enableMotor: false,
        enableLimit: true,
        lowerAngle: -0.5,
        upperAngle: 0.3,
      });

      const rightFlipperId = physics.createBody({
        type: "dynamic",
        position: vec2(rightFlipperX, flipperY),
      });
      physics.addFixture(rightFlipperId, {
        shape: { type: "box", halfWidth: FLIPPER_LENGTH / 2, halfHeight: FLIPPER_WIDTH / 2 },
        density: 5,
        friction: 0.3,
        restitution: 0.5,
      });
      rightFlipperIdRef.current = rightFlipperId;

      // Right flipper hinge (static)
      const rightHingeId = physics.createBody({
        type: "static",
        position: vec2(rightFlipperX + FLIPPER_LENGTH / 2 - 0.2, flipperY),
      });
      physics.addFixture(rightHingeId, {
        shape: { type: "circle", radius: 0.2 },
        density: 0,
      });

      physics.createRevoluteJoint({
        type: "revolute",
        bodyA: rightHingeId,
        bodyB: rightFlipperId,
        anchor: vec2(rightFlipperX + FLIPPER_LENGTH / 2 - 0.2, flipperY),
        enableMotor: false,
        enableLimit: true,
        lowerAngle: -0.3,
        upperAngle: 0.5,
      });

      // Create bumpers
      const bumperPositions = [
        { x: worldWidth * 0.5, y: 4 },
        { x: worldWidth * 0.3, y: 5 },
        { x: worldWidth * 0.7, y: 5 },
      ];

      const newBumperStates: BumperState[] = [];
      
      for (let i = 0; i < bumperPositions.length; i++) {
        const pos = bumperPositions[i];
        const bumperId = physics.createBody({
          type: "static",
          position: vec2(pos.x, pos.y),
        });
        const bumperColliderId = physics.addFixture(bumperId, {
          shape: { type: "circle", radius: BUMPER_RADIUS },
          density: 0,
          friction: 0.3,
          restitution: 1.5, // High bounce!
        });
        
        bumperIdsRef.current.push(bumperId);
        bumperColliderIdsRef.current.push(bumperColliderId);
        newBumperStates.push({ x: pos.x * PIXELS_PER_METER, y: pos.y * PIXELS_PER_METER, isHit: false });
      }
      setBumpers(newBumperStates);

      // Ball launcher (angled surface)
      const launcherId = physics.createBody({
        type: "static",
        position: vec2(1, worldHeight - 4),
        angle: -0.3,
      });
      physics.addFixture(launcherId, {
        shape: { type: "box", halfWidth: 1.5, halfHeight: 0.2 },
        density: 0,
        friction: 0.1,
        restitution: 0.3,
      });

      // Create ball
      const ballId = physics.createBody({
        type: "dynamic",
        position: vec2(1, worldHeight - 2),
        bullet: true, // Better collision detection
      });
      physics.addFixture(ballId, {
        shape: { type: "circle", radius: BALL_RADIUS },
        density: 1,
        friction: 0.1,
        restitution: 0.7,
      });
      ballIdRef.current = ballId;

      // Collision callback for scoring
      const unsubscribeBegin = physics.onCollisionBegin((event) => {
        const bumperColliderId = bumperColliderIdsRef.current[0];
        const otherColliderId = event.colliderA;
        
        for (let i = 0; i < bumperColliderIdsRef.current.length; i++) {
          if (bumperColliderIdsRef.current[i].value === otherColliderId.value) {
            setScore(prev => prev + 100);
            // Flash the bumper
            setBumpers(prev => prev.map((b, idx) => 
              idx === i ? { ...b, isHit: true } : b
            ));
            setTimeout(() => {
              setBumpers(prev => prev.map((b, idx) => 
                idx === i ? { ...b, isHit: false } : b
              ));
            }, 100);
          }
        }
      });

      setIsReady(true);
    };

    setupPhysics();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      ballIdRef.current = null;
      leftFlipperIdRef.current = null;
      rightFlipperIdRef.current = null;
      bumperIdsRef.current = [];
      bumperColliderIdsRef.current = [];
      setIsReady(false);
    };
  }, [vp.world.size.width, vp.world.size.height, vp.isReady]);

  const updateFlipperAndBallState = useCallback((physics: Physics2D) => {
    // Update flipper angles
    const leftTransform = physics.getTransform(leftFlipperIdRef.current!);
    const rightTransform = physics.getTransform(rightFlipperIdRef.current!);
    setFlippers({
      leftAngle: leftTransform.angle,
      rightAngle: rightTransform.angle,
    });

    // Update ball position
    const ballTransform = physics.getTransform(ballIdRef.current!);
    setBall({
      id: ballIdRef.current!,
      x: ballTransform.position.x * PIXELS_PER_METER,
      y: ballTransform.position.y * PIXELS_PER_METER,
    });

    // Check if ball fell through
    if (ballTransform.position.y > vp.world.size.height + 2) {
      // Reset ball
      physics.setTransform(ballIdRef.current!, {
        position: vec2(1, vp.world.size.height - 2),
        angle: 0,
      });
      physics.setLinearVelocity(ballIdRef.current!, vec2(0, 0));
    }
  }, [vp.world.size.height]);

  const stepPhysics = useCallback((dt: number) => {
    const physics = physicsRef.current;
    if (!physics) return;

    dragHandlers.applyDragForces();
    physics.step(dt, 8, 3);

    updateFlipperAndBallState(physics);
  }, [dragHandlers, updateFlipperAndBallState]);

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!vp.isReady) return null;

  const worldWidth = vp.world.size.width;
  const flipperY = (worldWidth * 0.35 - FLIPPER_LENGTH / 2 + 0.2) * PIXELS_PER_METER;
  const flipperHeightPx = FLIPPER_WIDTH * PIXELS_PER_METER;

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Text style={styles.score}>Score: {score}</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, styles.leftButton]} 
            onPress={handleLeftFlipper}
            onLongPress={handleLeftFlipper}
          >
            <Text style={styles.buttonText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.rightButton]} 
            onPress={handleRightFlipper}
            onLongPress={handleRightFlipper}
          >
            <Text style={styles.buttonText}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View
        style={styles.canvasContainer}
        onStartShouldSetResponder={() => true}
        onResponderGrant={dragHandlers.onTouchStart}
        onResponderMove={dragHandlers.onTouchMove}
        onResponderRelease={dragHandlers.onTouchEnd}
        onResponderTerminate={dragHandlers.onTouchEnd}
      >
        <Canvas ref={canvasRef} style={styles.canvas} pointerEvents="none">
          <Fill color="#1a1a2e" />

          {/* Bumpers */}
          {bumpers.map((bumper, index) => (
            <Circle
              key={`bumper-${index}`}
              cx={bumper.x}
              cy={bumper.y}
              r={BUMPER_RADIUS * PIXELS_PER_METER}
              color={bumper.isHit ? "#ffffff" : "#e74c3c"}
            />
          ))}

          {/* Ball */}
          {ball && (
            <Circle
              cx={ball.x}
              cy={ball.y}
              r={BALL_RADIUS * PIXELS_PER_METER}
              color="#ecf0f1"
            />
          )}

          {/* Left flipper */}
          <Group
            transform={[
              { translateX: (worldWidth * 0.35) * PIXELS_PER_METER },
              { translateY: (worldWidth - 3) * PIXELS_PER_METER },
              { rotate: flippers.leftAngle },
            ]}
            origin={{ x: -FLIPPER_LENGTH / 2 + 0.2, y: 0 }}
          >
            <Rect
              x={-FLIPPER_LENGTH / 2}
              y={-FLIPPER_WIDTH / 2}
              width={FLIPPER_LENGTH * PIXELS_PER_METER}
              height={FLIPPER_WIDTH * PIXELS_PER_METER}
              color="#f39c12"
            />
          </Group>

          {/* Right flipper */}
          <Group
            transform={[
              { translateX: (worldWidth * 0.65) * PIXELS_PER_METER },
              { translateY: (worldWidth - 3) * PIXELS_PER_METER },
              { rotate: flippers.rightAngle },
            ]}
            origin={{ x: FLIPPER_LENGTH / 2 - 0.2, y: 0 }}
          >
            <Rect
              x={-FLIPPER_LENGTH / 2}
              y={-FLIPPER_WIDTH / 2}
              width={FLIPPER_LENGTH * PIXELS_PER_METER}
              height={FLIPPER_WIDTH * PIXELS_PER_METER}
              color="#f39c12"
            />
          </Group>
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
  score: {
    color: "#f1c40f",
    fontSize: 24,
    fontWeight: "bold",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 20,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  leftButton: {
    backgroundColor: "#e74c3c",
  },
  rightButton: {
    backgroundColor: "#3498db",
  },
  buttonText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  canvasContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});

export default function Pinball() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <PinballCanvas />
    </ViewportRoot>
  );
}
