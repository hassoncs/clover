import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions } from "react-native";
import {
  Canvas,
  Rect,
  Circle,
  useCanvasRef,
  Fill,
  Group,
} from "@shopify/react-native-skia";
import { initPhysics, b2Body, b2World, Box2DAPI } from "../../lib/physics";
import { useSimplePhysicsLoop } from "../../lib/physics2d";

const PIXELS_PER_METER = 50;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface BodyState {
  x: number;
  y: number;
  angle: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
}

export default function Car() {
  const canvasRef = useCanvasRef();
  const worldRef = useRef<b2World | null>(null);
  const bodiesRef = useRef<b2Body[]>([]);
  const [chassis, setChassis] = useState<BodyState | null>(null);
  const [wheels, setWheels] = useState<BodyState[]>([]);
  const [terrain, setTerrain] = useState<BodyState[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setupPhysics = async () => {
      try {
        const Box2d = await initPhysics();
        const gravity = Box2d.b2Vec2(0, 9.8);
        const world = Box2d.b2World(gravity);
        worldRef.current = world;

        // Terrain
        const terrainBodies: BodyState[] = [];
        const groundBodyDef = Box2d.b2BodyDef();
        groundBodyDef.position = Box2d.b2Vec2(0, 0);
        const groundBody = world.CreateBody(groundBodyDef);

        // Generate rough terrain using Edge shapes or multiple Box shapes
        // Using Boxes for simplicity in rendering
        for(let i=0; i<50; i++) {
            const x = i * 1.0;
            const y = SCREEN_HEIGHT/PIXELS_PER_METER - 1 + Math.sin(i * 0.5) * 0.5;
            
            const shape = Box2d.b2PolygonShape();
            shape.SetAsBox(0.5, 0.5);
            
            const fixtureDef = Box2d.b2FixtureDef();
            fixtureDef.shape = shape;
            fixtureDef.friction = 0.8;

            const bd = Box2d.b2BodyDef();
            bd.position = Box2d.b2Vec2(x, y);
            const b = world.CreateBody(bd);
            b.CreateFixture(fixtureDef);

            terrainBodies.push({
                x: x * PIXELS_PER_METER,
                y: y * PIXELS_PER_METER,
                angle: 0,
                width: 1 * PIXELS_PER_METER,
                height: 1 * PIXELS_PER_METER,
                color: "#27ae60"
            });
        }
        setTerrain(terrainBodies);

        // Car Chassis
        const chassisDef = Box2d.b2BodyDef();
        chassisDef.type = 2;
        chassisDef.position = Box2d.b2Vec2(2, 2);
        const chassisBody = world.CreateBody(chassisDef);
        
        const chassisShape = Box2d.b2PolygonShape();
        chassisShape.SetAsBox(1.5, 0.5);
        
        const chassisFixture = Box2d.b2FixtureDef();
        chassisFixture.shape = chassisShape;
        chassisFixture.density = 1;
        chassisBody.CreateFixture(chassisFixture);

        bodiesRef.current.push(chassisBody); // Index 0

        // Wheels
        const wheelShape = Box2d.b2CircleShape();
        wheelShape.SetRadius(0.6);
        const wheelFixture = Box2d.b2FixtureDef();
        wheelFixture.shape = wheelShape;
        wheelFixture.density = 1;
        wheelFixture.friction = 0.9;

        // Back Wheel
        const backWheelDef = Box2d.b2BodyDef();
        backWheelDef.type = 2;
        backWheelDef.position = Box2d.b2Vec2(1, 2.5);
        const backWheel = world.CreateBody(backWheelDef);
        backWheel.CreateFixture(wheelFixture);
        bodiesRef.current.push(backWheel); // Index 1

        // Front Wheel
        const frontWheelDef = Box2d.b2BodyDef();
        frontWheelDef.type = 2;
        frontWheelDef.position = Box2d.b2Vec2(3, 2.5);
        const frontWheel = world.CreateBody(frontWheelDef);
        frontWheel.CreateFixture(wheelFixture);
        bodiesRef.current.push(frontWheel); // Index 2

        // Joints (Revolute with Motor)
        const jd1 = Box2d.b2RevoluteJointDef();
        jd1.Initialize(chassisBody, backWheel, backWheel.GetPosition());
        jd1.enableMotor = true;
        jd1.motorSpeed = 5; // Rad/s
        jd1.maxMotorTorque = 100;
        world.CreateJoint(jd1);

        const jd2 = Box2d.b2RevoluteJointDef();
        jd2.Initialize(chassisBody, frontWheel, frontWheel.GetPosition());
        jd2.enableMotor = true;
        jd2.motorSpeed = 5;
        jd2.maxMotorTorque = 100;
        world.CreateJoint(jd2);

        setIsReady(true);
      } catch (error) {
        console.error(error);
      }
    };

    setupPhysics();
    return () => { worldRef.current = null; bodiesRef.current = []; };
  }, []);

  const stepPhysics = useCallback((dt: number) => {
    if (!worldRef.current || bodiesRef.current.length < 3) return;
    worldRef.current.Step(dt, 8, 3);

    const b0 = bodiesRef.current[0];
    const p0 = b0.GetPosition();
    setChassis({
        x: p0.x * PIXELS_PER_METER,
        y: p0.y * PIXELS_PER_METER,
        angle: b0.GetAngle(),
        width: 3 * PIXELS_PER_METER,
        height: 1 * PIXELS_PER_METER,
        color: "#2980b9"
    });

    const newWheels = [bodiesRef.current[1], bodiesRef.current[2]].map(b => {
        const p = b.GetPosition();
        return {
            x: p.x * PIXELS_PER_METER,
            y: p.y * PIXELS_PER_METER,
            angle: b.GetAngle(),
            radius: 0.6 * PIXELS_PER_METER,
            color: "#34495e"
        };
    });
    setWheels(newWheels);
  }, []);

  useSimplePhysicsLoop(stepPhysics, isReady);

  return (
    <Canvas ref={canvasRef} style={{ flex: 1 }}>
      <Fill color="#1a1a2e" />
      
      {terrain.map((t, i) => (
        <Group key={`t-${i}`} transform={[{ translateX: t.x }, { translateY: t.y }, { rotate: t.angle }]}>
            <Rect x={-(t.width!)/2} y={-(t.height!)/2} width={t.width!} height={t.height!} color={t.color} />
        </Group>
      ))}

      {chassis && (
        <Group transform={[{ translateX: chassis.x }, { translateY: chassis.y }, { rotate: chassis.angle }]}>
            <Rect x={-(chassis.width!)/2} y={-(chassis.height!)/2} width={chassis.width!} height={chassis.height!} color={chassis.color} />
        </Group>
      )}

      {wheels.map((w, i) => (
        <Group key={`w-${i}`} transform={[{ translateX: w.x }, { translateY: w.y }, { rotate: w.angle }]}>
            <Circle cx={0} cy={0} r={w.radius!} color={w.color} />
            <Rect x={0} y={-2} width={w.radius!} height={4} color="#bdc3c7" /> 
        </Group>
      ))}
    </Canvas>
  );
}
