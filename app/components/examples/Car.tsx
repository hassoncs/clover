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

const TERRAIN_SEGMENT_COUNT = 50;
const TERRAIN_BOX_SIZE = 1;

const CHASSIS_WIDTH = 3;
const CHASSIS_HEIGHT = 1;
const WHEEL_RADIUS = 0.6;
const MOTOR_SPEED = 5;
const MAX_MOTOR_TORQUE = 100;

interface TerrainState {
  id: BodyId;
  x: number;
  y: number;
}

interface ChassisState {
  id: BodyId;
  x: number;
  y: number;
  angle: number;
}

interface WheelState {
  id: BodyId;
  x: number;
  y: number;
  angle: number;
}

function CarCanvas() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const terrainIdsRef = useRef<BodyId[]>([]);
  const chassisIdRef = useRef<BodyId | null>(null);
  const wheelIdsRef = useRef<BodyId[]>([]);

  const [terrain, setTerrain] = useState<TerrainState[]>([]);
  const [chassis, setChassis] = useState<ChassisState | null>(null);
  const [wheels, setWheels] = useState<WheelState[]>([]);
  const [isReady, setIsReady] = useState(false);

  const vp = useViewport();

  const dragHandlers = useForceDrag(physicsRef, {
    pixelsPerMeter: PIXELS_PER_METER,
    stiffness: 50,
    damping: 5,
  });

  useEffect(() => {
    if (!vp.isReady) return;

    const worldHeight = vp.world.size.height;

    const setupPhysics = async () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
      }

      const physics = await createPhysics2D();
      physics.createWorld(vec2(0, 9.8));
      physicsRef.current = physics;

      const newTerrainIds: BodyId[] = [];
      const terrainStates: TerrainState[] = [];

      for (let i = 0; i < TERRAIN_SEGMENT_COUNT; i++) {
        const x = i * TERRAIN_BOX_SIZE;
        const y = worldHeight - 1 + Math.sin(i * 0.5) * 0.5;

        const terrainId = physics.createBody({
          type: "static",
          position: vec2(x, y),
        });

        physics.addFixture(terrainId, {
          shape: { type: "box", halfWidth: TERRAIN_BOX_SIZE / 2, halfHeight: TERRAIN_BOX_SIZE / 2 },
          density: 0,
          friction: 0.8,
        });

        newTerrainIds.push(terrainId);
        terrainStates.push({
          id: terrainId,
          x: x * PIXELS_PER_METER,
          y: y * PIXELS_PER_METER,
        });
      }
      terrainIdsRef.current = newTerrainIds;
      setTerrain(terrainStates);

      const chassisId = physics.createBody({
        type: "dynamic",
        position: vec2(2, 2),
      });
      physics.addFixture(chassisId, {
        shape: { type: "box", halfWidth: CHASSIS_WIDTH / 2, halfHeight: CHASSIS_HEIGHT / 2 },
        density: 1,
        friction: 0.3,
      });
      chassisIdRef.current = chassisId;

      const backWheelId = physics.createBody({
        type: "dynamic",
        position: vec2(1, 2.5),
      });
      physics.addFixture(backWheelId, {
        shape: { type: "circle", radius: WHEEL_RADIUS },
        density: 1,
        friction: 0.9,
      });

      const frontWheelId = physics.createBody({
        type: "dynamic",
        position: vec2(3, 2.5),
      });
      physics.addFixture(frontWheelId, {
        shape: { type: "circle", radius: WHEEL_RADIUS },
        density: 1,
        friction: 0.9,
      });

      wheelIdsRef.current = [backWheelId, frontWheelId];

      physics.createRevoluteJoint({
        type: "revolute",
        bodyA: chassisId,
        bodyB: backWheelId,
        anchor: vec2(1, 2.5),
        enableMotor: true,
        motorSpeed: MOTOR_SPEED,
        maxMotorTorque: MAX_MOTOR_TORQUE,
      });

      physics.createRevoluteJoint({
        type: "revolute",
        bodyA: chassisId,
        bodyB: frontWheelId,
        anchor: vec2(3, 2.5),
        enableMotor: true,
        motorSpeed: MOTOR_SPEED,
        maxMotorTorque: MAX_MOTOR_TORQUE,
      });

      setIsReady(true);
    };

    setupPhysics();

    return () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      terrainIdsRef.current = [];
      chassisIdRef.current = null;
      wheelIdsRef.current = [];
      setIsReady(false);
    };
  }, [vp.world.size.height, vp.isReady]);

  const stepPhysics = useCallback((dt: number) => {
    const physics = physicsRef.current;
    if (!physics || !chassisIdRef.current) return;

    dragHandlers.applyDragForces();
    physics.step(dt, 8, 3);

    const chassisTransform = physics.getTransform(chassisIdRef.current);
    setChassis({
      id: chassisIdRef.current,
      x: chassisTransform.position.x * PIXELS_PER_METER,
      y: chassisTransform.position.y * PIXELS_PER_METER,
      angle: chassisTransform.angle,
    });

    const updatedWheels = wheelIdsRef.current.map((id) => {
      const transform = physics.getTransform(id);
      return {
        id,
        x: transform.position.x * PIXELS_PER_METER,
        y: transform.position.y * PIXELS_PER_METER,
        angle: transform.angle,
      };
    });
    setWheels(updatedWheels);
  }, [dragHandlers]);

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!vp.isReady) return null;

  const terrainBoxPx = TERRAIN_BOX_SIZE * PIXELS_PER_METER;
  const chassisWidthPx = CHASSIS_WIDTH * PIXELS_PER_METER;
  const chassisHeightPx = CHASSIS_HEIGHT * PIXELS_PER_METER;
  const wheelRadiusPx = WHEEL_RADIUS * PIXELS_PER_METER;

  return (
    <GestureDetector gesture={dragHandlers.gesture}>
      <View style={styles.container}>
        <Canvas ref={canvasRef} style={styles.canvas} pointerEvents="none">
          <Fill color="#1a1a2e" />

          {terrain.map((t) => (
            <Rect
              key={`terrain-${t.id.value}`}
              x={t.x - terrainBoxPx / 2}
              y={t.y - terrainBoxPx / 2}
              width={terrainBoxPx}
              height={terrainBoxPx}
              color="#27ae60"
            />
          ))}

          {chassis && (
            <Group
              transform={[
                { translateX: chassis.x },
                { translateY: chassis.y },
                { rotate: chassis.angle },
              ]}
            >
              <Rect
                x={-chassisWidthPx / 2}
                y={-chassisHeightPx / 2}
                width={chassisWidthPx}
                height={chassisHeightPx}
                color="#2980b9"
              />
            </Group>
          )}

          {wheels.map((w) => (
            <Group
              key={`wheel-${w.id.value}`}
              transform={[
                { translateX: w.x },
                { translateY: w.y },
                { rotate: w.angle },
              ]}
            >
              <Circle cx={0} cy={0} r={wheelRadiusPx} color="#34495e" />
              <Rect x={0} y={-2} width={wheelRadiusPx} height={4} color="#bdc3c7" />
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

export default function Car() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <CarCanvas />
    </ViewportRoot>
  );
}
