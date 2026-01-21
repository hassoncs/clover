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
  useForceDrag,
  type Physics2D,
  type BodyId,
  type JointId,
  vec2,
} from "../../lib/physics2d";
import { ViewportRoot, useViewport } from "../../lib/viewport";

const PIXELS_PER_METER = 50;

const PLAYER_RADIUS = 0.4;
const ANCHOR_POINT_RADIUS = 0.3;
const ROPE_SEGMENTS = 8;
const ROPE_LENGTH_PER_SEGMENT = 0.6;

interface AnchorPoint {
  x: number;
  y: number;
}

interface PlayerState {
  x: number;
  y: number;
  angle: number;
}

interface RopeState {
  anchorIndex: number;
  playerX: number;
  playerY: number;
}

function RopeSwingCanvas() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const playerIdRef = useRef<BodyId | null>(null);
  const anchorIdsRef = useRef<BodyId[]>([]);
  const ropeJointIdRef = useRef<JointId | null>(null);
  
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentRope, setCurrentRope] = useState<RopeState | null>(null);
  const [isSwinging, setIsSwinging] = useState(false);

  const vp = useViewport();

  const anchorPoints: AnchorPoint[] = [
    { x: 3, y: 4 },
    { x: 6, y: 5 },
    { x: 9, y: 3 },
    { x: 12, y: 5 },
    { x: 15, y: 4 },
  ];

  const dragHandlers = useForceDrag(physicsRef, {
    pixelsPerMeter: PIXELS_PER_METER,
    stiffness: 50,
    damping: 5,
  });

  const attachRope = useCallback((anchorIndex: number) => {
    const physics = physicsRef.current;
    const playerId = playerIdRef.current;
    if (!physics || !playerId || isSwinging) return;

    const anchor = anchorPoints[anchorIndex];
    const playerTransform = physics.getTransform(playerId);
    
    // Create distance joint for rope
    const jointId = physics.createDistanceJoint({
      type: "distance",
      bodyA: anchorIdsRef.current[anchorIndex],
      bodyB: playerId,
      anchorA: vec2(anchor.x, anchor.y),
      anchorB: vec2(playerTransform.position.x, playerTransform.position.y),
      stiffness: 0,
      damping: 0.1,
    });
    
    ropeJointIdRef.current = jointId;
    setIsSwinging(true);
    
    setCurrentRope({
      anchorIndex,
      playerX: playerTransform.position.x * PIXELS_PER_METER,
      playerY: playerTransform.position.y * PIXELS_PER_METER,
    });
  }, [isSwinging, anchorPoints]);

  const releaseRope = useCallback(() => {
    const physics = physicsRef.current;
    if (!physics || !ropeJointIdRef.current) return;

    physics.destroyJoint(ropeJointIdRef.current);
    ropeJointIdRef.current = null;
    setIsSwinging(false);
    setCurrentRope(null);
  }, []);

  const handleTouchEnd = useCallback((event: any) => {
    dragHandlers.onTouchEnd(event);
    
    // Auto-release rope when releasing touch while swinging
    if (isSwinging) {
      releaseRope();
    }
  }, [dragHandlers, isSwinging, releaseRope]);

  const handleTouchStart = useCallback((event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const worldX = locationX / PIXELS_PER_METER;
    const worldY = locationY / PIXELS_PER_METER;

    // Find closest anchor point
    let closestIndex = -1;
    let closestDist = Infinity;
    
    for (let i = 0; i < anchorPoints.length; i++) {
      const anchor = anchorPoints[i];
      const dist = Math.sqrt(Math.pow(worldX - anchor.x, 2) + Math.pow(worldY - anchor.y, 2));
      if (dist < closestDist && dist < 5) {
        closestDist = dist;
        closestIndex = i;
      }
    }

    if (closestIndex >= 0) {
      attachRope(closestIndex);
    } else {
      dragHandlers.onTouchStart(event);
    }
  }, [anchorPoints, attachRope, dragHandlers]);

  useEffect(() => {
    if (!vp.isReady) return;

    const worldWidth = vp.world.size.width;
    const worldHeight = vp.world.size.height;

    const setupPhysics = async () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
      }

      const physics = await createPhysics2D();
      physics.createWorld(vec2(0, 9.8));
      physicsRef.current = physics;

      // Create anchor points (static)
      for (const anchor of anchorPoints) {
        const anchorId = physics.createBody({
          type: "static",
          position: vec2(anchor.x, anchor.y),
        });
        physics.addFixture(anchorId, {
          shape: { type: "circle", radius: ANCHOR_POINT_RADIUS },
          density: 0,
          restitution: 0.5,
        });
        anchorIdsRef.current.push(anchorId);
      }

      // Create player
      const playerId = physics.createBody({
        type: "dynamic",
        position: vec2(2, 8),
        linearDamping: 0.5,
        angularDamping: 0.5,
      });
      physics.addFixture(playerId, {
        shape: { type: "circle", radius: PLAYER_RADIUS },
        density: 1,
        friction: 0.3,
        restitution: 0.3,
      });
      playerIdRef.current = playerId;

      // Ground and walls
      const groundY = worldHeight - 1;
      const groundId = physics.createBody({
        type: "static",
        position: vec2(worldWidth / 2, groundY + 0.5),
      });
      physics.addFixture(groundId, {
        shape: { type: "box", halfWidth: worldWidth / 2, halfHeight: 0.5 },
        density: 0,
        friction: 0.8,
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

      setIsReady(true);
    };

    setupPhysics();

    return () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      playerIdRef.current = null;
      anchorIdsRef.current = [];
      ropeJointIdRef.current = null;
      setIsReady(false);
      setIsSwinging(false);
    };
  }, [vp.world.size.width, vp.world.size.height, vp.isReady]);

  const stepPhysics = useCallback((dt: number) => {
    const physics = physicsRef.current;
    if (!physics || !playerIdRef.current) return;

    dragHandlers.applyDragForces();
    physics.step(dt, 8, 3);

    // Check if player fell off screen
    const playerTransform = physics.getTransform(playerIdRef.current);
    if (playerTransform.position.y > vp.world.size.height + 5) {
      // Reset player position
      physics.setTransform(playerIdRef.current, {
        position: vec2(2, 8),
        angle: 0,
      });
      physics.setLinearVelocity(playerIdRef.current, vec2(0, 0));
      physics.setAngularVelocity(playerIdRef.current, 0);
      releaseRope();
    }

    setPlayer({
      x: playerTransform.position.x * PIXELS_PER_METER,
      y: playerTransform.position.y * PIXELS_PER_METER,
      angle: playerTransform.angle,
    });

    if (currentRope) {
      setCurrentRope({
        ...currentRope,
        playerX: playerTransform.position.x * PIXELS_PER_METER,
        playerY: playerTransform.position.y * PIXELS_PER_METER,
      });
    }
  }, [dragHandlers, currentRope, releaseRope, vp.world.size.height]);

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!vp.isReady) return null;

  const groundY = vp.world.size.height - 1;

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Text style={styles.instructions}>
          {isSwinging ? "Release to fly!" : "Tap anchor point (circles) to attach rope, release to detach"}
        </Text>
      </View>
      
      <View
        style={styles.canvasContainer}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderMove={dragHandlers.onTouchMove}
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

          {/* Anchor points */}
          {anchorPoints.map((anchor, index) => (
            <Circle
              key={`anchor-${index}`}
              cx={anchor.x * PIXELS_PER_METER}
              cy={anchor.y * PIXELS_PER_METER}
              r={ANCHOR_POINT_RADIUS * PIXELS_PER_METER}
              color={currentRope?.anchorIndex === index ? "#00ff00" : "#f1c40f"}
            />
          ))}

          {/* Rope line */}
          {currentRope && (
            <Line
              p1={vec(
                anchorPoints[currentRope.anchorIndex].x * PIXELS_PER_METER,
                anchorPoints[currentRope.anchorIndex].y * PIXELS_PER_METER
              )}
              p2={vec(currentRope.playerX, currentRope.playerY)}
              color="#ffffff"
              style="stroke"
              strokeWidth={2}
            />
          )}

          {/* Player */}
          {player && (
            <Group
              transform={[
                { translateX: player.x },
                { translateY: player.y },
                { rotate: player.angle },
              ]}
            >
              <Circle
                cx={0}
                cy={0}
                r={PLAYER_RADIUS * PIXELS_PER_METER}
                color="#e74c3c"
              />
              {/* Direction indicator */}
              <Circle
                cx={PLAYER_RADIUS * PIXELS_PER_METER * 0.5}
                cy={0}
                r={PLAYER_RADIUS * PIXELS_PER_METER * 0.2}
                color="#ffffff"
              />
            </Group>
          )}
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
    padding: 10,
    backgroundColor: "#1a1a2e",
    borderBottomWidth: 1,
    borderBottomColor: "#2d3436",
  },
  instructions: {
    color: "#bdc3c7",
    fontSize: 14,
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});

export default function RopeSwing() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <RopeSwingCanvas />
    </ViewportRoot>
  );
}
