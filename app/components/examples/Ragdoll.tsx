import { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
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

const PIXELS_PER_METER = 40;

// Enhanced ragdoll with elbows and knees
const HEAD_RADIUS = 0.5;
const TORSO_WIDTH = 0.8;
const TORSO_HEIGHT = 1.6;
const LIMB_WIDTH = 0.35;
const UPPER_LIMB_LENGTH = 1.0;
const LOWER_LIMB_LENGTH = 0.9;

interface BodyPartState {
  id: BodyId;
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
  color: string;
  type: "circle" | "box";
}

interface JointState {
  jointId: JointId;
  bodyAId: BodyId;
  bodyBId: BodyId;
  anchorX: number;
  anchorY: number;
}

function RagdollCanvas() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const bodyPartIdsRef = useRef<BodyId[]>([]);
  const jointIdsRef = useRef<JointId[]>([]);
  
  const [bodyParts, setBodyParts] = useState<BodyPartState[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [spawnPosition, setSpawnPosition] = useState({ x: 0, y: 0 });

  const vp = useViewport();

  const dragHandlers = useForceDrag(physicsRef, {
    pixelsPerMeter: PIXELS_PER_METER,
    stiffness: 50,
    damping: 5,
  });

  const createRagdoll = useCallback((centerX: number, centerY: number) => {
    const physics = physicsRef.current;
    if (!physics) return;

    // Destroy existing ragdoll
    for (const jointId of jointIdsRef.current) {
      physics.destroyJoint(jointId);
    }
    for (const bodyId of bodyPartIdsRef.current) {
      physics.destroyBody(bodyId);
    }
    jointIdsRef.current = [];
    bodyPartIdsRef.current = [];

    const bodyParts: BodyPartState[] = [];

    // Head
    const headId = physics.createBody({
      type: "dynamic",
      position: vec2(centerX, centerY - TORSO_HEIGHT / 2 - HEAD_RADIUS - UPPER_LIMB_LENGTH / 2),
    });
    physics.addFixture(headId, {
      shape: { type: "circle", radius: HEAD_RADIUS },
      density: 1,
      friction: 0.5,
      restitution: 0.3,
    });
    bodyPartIdsRef.current.push(headId);
    bodyParts.push({
      id: headId,
      x: centerX * PIXELS_PER_METER,
      y: (centerY - TORSO_HEIGHT / 2 - HEAD_RADIUS - UPPER_LIMB_LENGTH / 2) * PIXELS_PER_METER,
      angle: 0,
      width: HEAD_RADIUS * 2 * PIXELS_PER_METER,
      height: HEAD_RADIUS * 2 * PIXELS_PER_METER,
      color: "#FFB6C1",
      type: "circle",
    });

    // Torso
    const torsoId = physics.createBody({
      type: "dynamic",
      position: vec2(centerX, centerY),
    });
    physics.addFixture(torsoId, {
      shape: { type: "box", halfWidth: TORSO_WIDTH / 2, halfHeight: TORSO_HEIGHT / 2 },
      density: 2,
      friction: 0.5,
      restitution: 0.2,
    });
    bodyPartIdsRef.current.push(torsoId);
    bodyParts.push({
      id: torsoId,
      x: centerX * PIXELS_PER_METER,
      y: centerY * PIXELS_PER_METER,
      angle: 0,
      width: TORSO_WIDTH * PIXELS_PER_METER,
      height: TORSO_HEIGHT * PIXELS_PER_METER,
      color: "#4A90D9",
      type: "box",
    });

    // Neck joint (head to torso)
    const neckJointId = physics.createRevoluteJoint({
      type: "revolute",
      bodyA: torsoId,
      bodyB: headId,
      anchor: vec2(centerX, centerY - TORSO_HEIGHT / 2),
      enableLimit: true,
      lowerAngle: -0.6,
      upperAngle: 0.6,
    });
    jointIdsRef.current.push(neckJointId);

    // Left upper arm
    const leftUpperArmId = physics.createBody({
      type: "dynamic",
      position: vec2(centerX - TORSO_WIDTH / 2 - UPPER_LIMB_LENGTH / 2, centerY - TORSO_HEIGHT / 2 + 0.3),
    });
    physics.addFixture(leftUpperArmId, {
      shape: { type: "box", halfWidth: UPPER_LIMB_LENGTH / 2, halfHeight: LIMB_WIDTH / 2 },
      density: 1,
      friction: 0.5,
      restitution: 0.2,
    });
    bodyPartIdsRef.current.push(leftUpperArmId);
    bodyParts.push({
      id: leftUpperArmId,
      x: (centerX - TORSO_WIDTH / 2 - UPPER_LIMB_LENGTH / 2) * PIXELS_PER_METER,
      y: (centerY - TORSO_HEIGHT / 2 + 0.3) * PIXELS_PER_METER,
      angle: 0,
      width: UPPER_LIMB_LENGTH * PIXELS_PER_METER,
      height: LIMB_WIDTH * PIXELS_PER_METER,
      color: "#4A90D9",
      type: "box",
    });

    // Left shoulder joint
    const leftShoulderId = physics.createRevoluteJoint({
      type: "revolute",
      bodyA: torsoId,
      bodyB: leftUpperArmId,
      anchor: vec2(centerX - TORSO_WIDTH / 2, centerY - TORSO_HEIGHT / 2 + 0.3),
      enableLimit: true,
      lowerAngle: -2.8,
      upperAngle: 0.3,
    });
    jointIdsRef.current.push(leftShoulderId);

    // Left lower arm (elbow)
    const leftLowerArmId = physics.createBody({
      type: "dynamic",
      position: vec2(centerX - TORSO_WIDTH / 2 - UPPER_LIMB_LENGTH - LOWER_LIMB_LENGTH / 2, centerY - TORSO_HEIGHT / 2 + 0.3),
    });
    physics.addFixture(leftLowerArmId, {
      shape: { type: "box", halfWidth: LOWER_LIMB_LENGTH / 2, halfHeight: LIMB_WIDTH / 2 },
      density: 0.8,
      friction: 0.5,
      restitution: 0.2,
    });
    bodyPartIdsRef.current.push(leftLowerArmId);
    bodyParts.push({
      id: leftLowerArmId,
      x: (centerX - TORSO_WIDTH / 2 - UPPER_LIMB_LENGTH - LOWER_LIMB_LENGTH / 2) * PIXELS_PER_METER,
      y: (centerY - TORSO_HEIGHT / 2 + 0.3) * PIXELS_PER_METER,
      angle: 0,
      width: LOWER_LIMB_LENGTH * PIXELS_PER_METER,
      height: LIMB_WIDTH * PIXELS_PER_METER,
      color: "#FFB6C1",
      type: "box",
    });

    // Left elbow joint
    const leftElbowId = physics.createRevoluteJoint({
      type: "revolute",
      bodyA: leftUpperArmId,
      bodyB: leftLowerArmId,
      anchor: vec2(centerX - TORSO_WIDTH / 2 - UPPER_LIMB_LENGTH / 2, centerY - TORSO_HEIGHT / 2 + 0.3),
      enableLimit: true,
      lowerAngle: -2.0,
      upperAngle: 0,
    });
    jointIdsRef.current.push(leftElbowId);

    // Right upper arm
    const rightUpperArmId = physics.createBody({
      type: "dynamic",
      position: vec2(centerX + TORSO_WIDTH / 2 + UPPER_LIMB_LENGTH / 2, centerY - TORSO_HEIGHT / 2 + 0.3),
    });
    physics.addFixture(rightUpperArmId, {
      shape: { type: "box", halfWidth: UPPER_LIMB_LENGTH / 2, halfHeight: LIMB_WIDTH / 2 },
      density: 1,
      friction: 0.5,
      restitution: 0.2,
    });
    bodyPartIdsRef.current.push(rightUpperArmId);
    bodyParts.push({
      id: rightUpperArmId,
      x: (centerX + TORSO_WIDTH / 2 + UPPER_LIMB_LENGTH / 2) * PIXELS_PER_METER,
      y: (centerY - TORSO_HEIGHT / 2 + 0.3) * PIXELS_PER_METER,
      angle: 0,
      width: UPPER_LIMB_LENGTH * PIXELS_PER_METER,
      height: LIMB_WIDTH * PIXELS_PER_METER,
      color: "#4A90D9",
      type: "box",
    });

    // Right shoulder joint
    const rightShoulderId = physics.createRevoluteJoint({
      type: "revolute",
      bodyA: torsoId,
      bodyB: rightUpperArmId,
      anchor: vec2(centerX + TORSO_WIDTH / 2, centerY - TORSO_HEIGHT / 2 + 0.3),
      enableLimit: true,
      lowerAngle: -0.3,
      upperAngle: 2.8,
    });
    jointIdsRef.current.push(rightShoulderId);

    // Right lower arm (elbow)
    const rightLowerArmId = physics.createBody({
      type: "dynamic",
      position: vec2(centerX + TORSO_WIDTH / 2 + UPPER_LIMB_LENGTH + LOWER_LIMB_LENGTH / 2, centerY - TORSO_HEIGHT / 2 + 0.3),
    });
    physics.addFixture(rightLowerArmId, {
      shape: { type: "box", halfWidth: LOWER_LIMB_LENGTH / 2, halfHeight: LIMB_WIDTH / 2 },
      density: 0.8,
      friction: 0.5,
      restitution: 0.2,
    });
    bodyPartIdsRef.current.push(rightLowerArmId);
    bodyParts.push({
      id: rightLowerArmId,
      x: (centerX + TORSO_WIDTH / 2 + UPPER_LIMB_LENGTH + LOWER_LIMB_LENGTH / 2) * PIXELS_PER_METER,
      y: (centerY - TORSO_HEIGHT / 2 + 0.3) * PIXELS_PER_METER,
      angle: 0,
      width: LOWER_LIMB_LENGTH * PIXELS_PER_METER,
      height: LIMB_WIDTH * PIXELS_PER_METER,
      color: "#FFB6C1",
      type: "box",
    });

    // Right elbow joint
    const rightElbowId = physics.createRevoluteJoint({
      type: "revolute",
      bodyA: rightUpperArmId,
      bodyB: rightLowerArmId,
      anchor: vec2(centerX + TORSO_WIDTH / 2 + UPPER_LIMB_LENGTH / 2, centerY - TORSO_HEIGHT / 2 + 0.3),
      enableLimit: true,
      lowerAngle: 0,
      upperAngle: 2.0,
    });
    jointIdsRef.current.push(rightElbowId);

    // Left upper leg
    const leftUpperLegId = physics.createBody({
      type: "dynamic",
      position: vec2(centerX - TORSO_WIDTH / 4, centerY + TORSO_HEIGHT / 2 + UPPER_LIMB_LENGTH / 2),
    });
    physics.addFixture(leftUpperLegId, {
      shape: { type: "box", halfWidth: LIMB_WIDTH / 2, halfHeight: UPPER_LIMB_LENGTH / 2 },
      density: 1.5,
      friction: 0.5,
      restitution: 0.2,
    });
    bodyPartIdsRef.current.push(leftUpperLegId);
    bodyParts.push({
      id: leftUpperLegId,
      x: (centerX - TORSO_WIDTH / 4) * PIXELS_PER_METER,
      y: (centerY + TORSO_HEIGHT / 2 + UPPER_LIMB_LENGTH / 2) * PIXELS_PER_METER,
      angle: 0,
      width: LIMB_WIDTH * PIXELS_PER_METER,
      height: UPPER_LIMB_LENGTH * PIXELS_PER_METER,
      color: "#2C3E50",
      type: "box",
    });

    // Left hip joint
    const leftHipId = physics.createRevoluteJoint({
      type: "revolute",
      bodyA: torsoId,
      bodyB: leftUpperLegId,
      anchor: vec2(centerX - TORSO_WIDTH / 4, centerY + TORSO_HEIGHT / 2),
      enableLimit: true,
      lowerAngle: -1.8,
      upperAngle: 0.3,
    });
    jointIdsRef.current.push(leftHipId);

    // Left lower leg (knee)
    const leftLowerLegId = physics.createBody({
      type: "dynamic",
      position: vec2(centerX - TORSO_WIDTH / 4, centerY + TORSO_HEIGHT / 2 + UPPER_LIMB_LENGTH + LOWER_LIMB_LENGTH / 2),
    });
    physics.addFixture(leftLowerLegId, {
      shape: { type: "box", halfWidth: LIMB_WIDTH / 2, halfHeight: LOWER_LIMB_LENGTH / 2 },
      density: 1.2,
      friction: 0.5,
      restitution: 0.2,
    });
    bodyPartIdsRef.current.push(leftLowerLegId);
    bodyParts.push({
      id: leftLowerLegId,
      x: (centerX - TORSO_WIDTH / 4) * PIXELS_PER_METER,
      y: (centerY + TORSO_HEIGHT / 2 + UPPER_LIMB_LENGTH + LOWER_LIMB_LENGTH / 2) * PIXELS_PER_METER,
      angle: 0,
      width: LIMB_WIDTH * PIXELS_PER_METER,
      height: LOWER_LIMB_LENGTH * PIXELS_PER_METER,
      color: "#1a1a2e",
      type: "box",
    });

    // Left knee joint
    const leftKneeId = physics.createRevoluteJoint({
      type: "revolute",
      bodyA: leftUpperLegId,
      bodyB: leftLowerLegId,
      anchor: vec2(centerX - TORSO_WIDTH / 4, centerY + TORSO_HEIGHT / 2 + UPPER_LIMB_LENGTH / 2),
      enableLimit: true,
      lowerAngle: -2.2,
      upperAngle: 0,
    });
    jointIdsRef.current.push(leftKneeId);

    // Right upper leg
    const rightUpperLegId = physics.createBody({
      type: "dynamic",
      position: vec2(centerX + TORSO_WIDTH / 4, centerY + TORSO_HEIGHT / 2 + UPPER_LIMB_LENGTH / 2),
    });
    physics.addFixture(rightUpperLegId, {
      shape: { type: "box", halfWidth: LIMB_WIDTH / 2, halfHeight: UPPER_LIMB_LENGTH / 2 },
      density: 1.5,
      friction: 0.5,
      restitution: 0.2,
    });
    bodyPartIdsRef.current.push(rightUpperLegId);
    bodyParts.push({
      id: rightUpperLegId,
      x: (centerX + TORSO_WIDTH / 4) * PIXELS_PER_METER,
      y: (centerY + TORSO_HEIGHT / 2 + UPPER_LIMB_LENGTH / 2) * PIXELS_PER_METER,
      angle: 0,
      width: LIMB_WIDTH * PIXELS_PER_METER,
      height: UPPER_LIMB_LENGTH * PIXELS_PER_METER,
      color: "#2C3E50",
      type: "box",
    });

    // Right hip joint
    const rightHipId = physics.createRevoluteJoint({
      type: "revolute",
      bodyA: torsoId,
      bodyB: rightUpperLegId,
      anchor: vec2(centerX + TORSO_WIDTH / 4, centerY + TORSO_HEIGHT / 2),
      enableLimit: true,
      lowerAngle: -1.8,
      upperAngle: 0.3,
    });
    jointIdsRef.current.push(rightHipId);

    // Right lower leg (knee)
    const rightLowerLegId = physics.createBody({
      type: "dynamic",
      position: vec2(centerX + TORSO_WIDTH / 4, centerY + TORSO_HEIGHT / 2 + UPPER_LIMB_LENGTH + LOWER_LIMB_LENGTH / 2),
    });
    physics.addFixture(rightLowerLegId, {
      shape: { type: "box", halfWidth: LIMB_WIDTH / 2, halfHeight: LOWER_LIMB_LENGTH / 2 },
      density: 1.2,
      friction: 0.5,
      restitution: 0.2,
    });
    bodyPartIdsRef.current.push(rightLowerLegId);
    bodyParts.push({
      id: rightLowerLegId,
      x: (centerX + TORSO_WIDTH / 4) * PIXELS_PER_METER,
      y: (centerY + TORSO_HEIGHT / 2 + UPPER_LIMB_LENGTH + LOWER_LIMB_LENGTH / 2) * PIXELS_PER_METER,
      angle: 0,
      width: LIMB_WIDTH * PIXELS_PER_METER,
      height: LOWER_LIMB_LENGTH * PIXELS_PER_METER,
      color: "#1a1a2e",
      type: "box",
    });

    // Right knee joint
    const rightKneeId = physics.createRevoluteJoint({
      type: "revolute",
      bodyA: rightUpperLegId,
      bodyB: rightLowerLegId,
      anchor: vec2(centerX + TORSO_WIDTH / 4, centerY + TORSO_HEIGHT / 2 + UPPER_LIMB_LENGTH / 2),
      enableLimit: true,
      lowerAngle: -2.2,
      upperAngle: 0,
    });
    jointIdsRef.current.push(rightKneeId);

    setBodyParts(bodyParts);
  }, []);

  useEffect(() => {
    if (!vp.isReady) return;

    const worldWidth = vp.world.size.width;
    const worldHeight = vp.world.size.height;
    const groundY = worldHeight - 2;

    const setupPhysics = async () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
      }

      const physics = await createPhysics2D();
      physics.createWorld(vec2(0, 9.8));
      physicsRef.current = physics;

      // Ground
      const groundId = physics.createBody({
        type: "static",
        position: vec2(worldWidth / 2, groundY + 0.5),
      });
      physics.addFixture(groundId, {
        shape: { type: "box", halfWidth: worldWidth / 2, halfHeight: 0.5 },
        density: 0,
        friction: 0.8,
      });

      // Walls
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

      // Create initial ragdoll
      const startX = worldWidth / 2;
      const startY = 3;
      setSpawnPosition({ x: startX, y: startY });
      createRagdoll(startX, startY);

      setIsReady(true);
    };

    setupPhysics();

    return () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      bodyPartIdsRef.current = [];
      jointIdsRef.current = [];
      setIsReady(false);
    };
  }, [vp.world.size.width, vp.world.size.height, vp.isReady, createRagdoll]);

  const stepPhysics = useCallback((dt: number) => {
    const physics = physicsRef.current;
    if (!physics) return;

    dragHandlers.applyDragForces();
    physics.step(dt, 8, 3);

    const updatedParts = bodyPartIdsRef.current.map((id, i) => {
      const transform = physics.getTransform(id);
      const original = bodyParts[i];
      return {
        ...original,
        x: transform.position.x * PIXELS_PER_METER,
        y: transform.position.y * PIXELS_PER_METER,
        angle: transform.angle,
      };
    });
    setBodyParts(updatedParts);
  }, [dragHandlers, bodyParts]);

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!vp.isReady) return null;

  const groundY = vp.world.size.height - 2;

  const handleSpawn = () => {
    createRagdoll(spawnPosition.x, spawnPosition.y);
  };

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <TouchableOpacity style={styles.button} onPress={handleSpawn}>
          <Text style={styles.buttonText}>Spawn New Ragdoll</Text>
        </TouchableOpacity>
        <Text style={styles.instructions}>Drag limbs to throw the ragdoll!</Text>
      </View>
      
      <View style={styles.canvasContainer}>
        <GestureDetector gesture={dragHandlers.gesture}>
          <View style={{ flex: 1 }}>
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

              {/* Body parts */}
              {bodyParts.map((part) => (
                <Group
                  key={`part-${part.id.value}`}
                  transform={[
                    { translateX: part.x },
                    { translateY: part.y },
                    { rotate: part.angle },
                  ]}
                  origin={{ x: 0, y: 0 }}
                >
                  {part.type === "circle" ? (
                    <Circle
                      cx={0}
                      cy={0}
                      r={part.width / 2}
                      color={part.color}
                    />
                  ) : (
                    <Rect
                      x={-part.width / 2}
                      y={-part.height / 2}
                      width={part.width}
                      height={part.height}
                      color={part.color}
                    />
                  )}
                </Group>
              ))}
            </Canvas>
          </View>
        </GestureDetector>
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
  button: {
    backgroundColor: "#4A90D9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  instructions: {
    color: "#bdc3c7",
    fontSize: 14,
    marginLeft: 16,
  },
  canvasContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});

export default function Ragdoll() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <RagdollCanvas />
    </ViewportRoot>
  );
}
