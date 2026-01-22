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
  usePhysicsExample,
  vec2,
  type Physics2D,
  type BodyRecord,
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

interface EntityData {
  type: 'terrain' | 'chassis' | 'wheel';
  size?: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
}

function CarCanvas() {
  const canvasRef = useCanvasRef();
  const vp = useViewport();

  const { transforms, gesture, isReady } = usePhysicsExample<EntityData>({
    pixelsPerMeter: PIXELS_PER_METER,
    enabled: vp.isReady,
    drag: 'force',
    dragStiffness: 50,
    dragDamping: 5,
    onInit: (physics: Physics2D): BodyRecord<EntityData>[] => {
      const worldHeight = vp.world.size.height;
      const bodies: BodyRecord<EntityData>[] = [];

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

        bodies.push({
          id: terrainId,
          data: {
            type: 'terrain',
            size: TERRAIN_BOX_SIZE * PIXELS_PER_METER,
            color: '#27ae60',
          },
        });
      }

      const chassisId = physics.createBody({
        type: "dynamic",
        position: vec2(2, 2),
      });
      physics.addFixture(chassisId, {
        shape: { type: "box", halfWidth: CHASSIS_WIDTH / 2, halfHeight: CHASSIS_HEIGHT / 2 },
        density: 1,
        friction: 0.3,
      });

      bodies.push({
        id: chassisId,
        data: {
          type: 'chassis',
          width: CHASSIS_WIDTH * PIXELS_PER_METER,
          height: CHASSIS_HEIGHT * PIXELS_PER_METER,
          color: '#2980b9',
        },
      });

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

      bodies.push({
        id: backWheelId,
        data: {
          type: 'wheel',
          radius: WHEEL_RADIUS * PIXELS_PER_METER,
          color: '#34495e',
        },
      });

      bodies.push({
        id: frontWheelId,
        data: {
          type: 'wheel',
          radius: WHEEL_RADIUS * PIXELS_PER_METER,
          color: '#34495e',
        },
      });

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

      return bodies;
    },
  });

  if (!vp.isReady || !isReady) return null;

  const terrain = transforms.filter(t => t.data.type === 'terrain');
  const chassis = transforms.find(t => t.data.type === 'chassis');
  const wheels = transforms.filter(t => t.data.type === 'wheel');

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        <Canvas ref={canvasRef} style={styles.canvas} pointerEvents="none">
          <Fill color="#1a1a2e" />

          {terrain.map((t) => (
            <Rect
              key={`terrain-${t.id.value}`}
              x={t.x - t.data.size! / 2}
              y={t.y - t.data.size! / 2}
              width={t.data.size!}
              height={t.data.size!}
              color={t.data.color}
            />
          ))}

          {chassis && (
            <Group
              transform={[
                { translateX: chassis.x },
                { translateY: chassis.y },
                { rotate: chassis.angle },
              ]}
              origin={{ x: 0, y: 0 }}
            >
              <Rect
                x={-chassis.data.width! / 2}
                y={-chassis.data.height! / 2}
                width={chassis.data.width!}
                height={chassis.data.height!}
                color={chassis.data.color}
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
              origin={{ x: 0, y: 0 }}
            >
              <Circle cx={0} cy={0} r={w.data.radius!} color={w.data.color} />
              <Rect x={0} y={-2} width={w.data.radius!} height={4} color="#bdc3c7" />
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
