import React, { useEffect, useRef, useState, useCallback } from "react";
import { Dimensions } from "react-native";
import {
  Canvas,
  Circle,
  Line,
  useCanvasRef,
  Fill,
  vec,
  Group,
  Rect,
} from "@shopify/react-native-skia";
import { initPhysics, b2Body, b2World, Box2DAPI } from "../../lib/physics";
import { useSimplePhysicsLoop } from "../../lib/physics2d";

const PIXELS_PER_METER = 50;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ANCHOR_X = SCREEN_WIDTH / 2 / PIXELS_PER_METER;
const ANCHOR_Y = 3; // Lower anchor point
const ARM_LENGTH = 2.5;
const ARM_WIDTH = 0.3;

interface BodyPos {
  x: number;
  y: number;
  angle: number;
}

interface PendulumState {
  b1: BodyPos;
  b2: BodyPos;
}

export default function Pendulum() {
  const canvasRef = useCanvasRef();
  const worldRef = useRef<b2World | null>(null);
  const body1Ref = useRef<b2Body | null>(null);
  const body2Ref = useRef<b2Body | null>(null);
  const box2dApiRef = useRef<Box2DAPI | null>(null);
  
  const [state, setState] = useState<PendulumState>({
    b1: { x: 0, y: 0, angle: 0 },
    b2: { x: 0, y: 0, angle: 0 },
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setupPhysics = async () => {
      try {
        const Box2d = await initPhysics();
        box2dApiRef.current = Box2d;

        const gravity = Box2d.b2Vec2(0, 9.8);
        const world = Box2d.b2World(gravity);
        worldRef.current = world;

        // 1. Static Anchor Body
        const anchorDef = Box2d.b2BodyDef();
        anchorDef.position = Box2d.b2Vec2(ANCHOR_X, ANCHOR_Y);
        const anchorBody = world.CreateBody(anchorDef);
        
        // 2. First Arm Body
        const b1Def = Box2d.b2BodyDef();
        b1Def.type = 2; // Dynamic
        b1Def.position = Box2d.b2Vec2(ANCHOR_X + ARM_LENGTH/2, ANCHOR_Y);
        const body1 = world.CreateBody(b1Def);
        body1Ref.current = body1;

        const armShape = Box2d.b2PolygonShape();
        armShape.SetAsBox(ARM_LENGTH / 2, ARM_WIDTH / 2);
        
        const fixtureDef = Box2d.b2FixtureDef();
        fixtureDef.shape = armShape;
        fixtureDef.density = 1;
        fixtureDef.friction = 0.2;
        body1.CreateFixture(fixtureDef);

        // 3. Joint 1 (Anchor -> Body1)
        const jd1 = Box2d.b2RevoluteJointDef();
        // Initialize at anchor position
        jd1.Initialize(anchorBody, body1, Box2d.b2Vec2(ANCHOR_X, ANCHOR_Y));
        world.CreateJoint(jd1);

        // 4. Second Arm Body
        const b2Def = Box2d.b2BodyDef();
        b2Def.type = 2; // Dynamic
        b2Def.position = Box2d.b2Vec2(ANCHOR_X + ARM_LENGTH + ARM_LENGTH/2, ANCHOR_Y);
        const body2 = world.CreateBody(b2Def);
        body2Ref.current = body2;

        const arm2Shape = Box2d.b2PolygonShape();
        arm2Shape.SetAsBox(ARM_LENGTH / 2, ARM_WIDTH / 2);
        
        const fixture2Def = Box2d.b2FixtureDef();
        fixture2Def.shape = arm2Shape;
        fixture2Def.density = 1;
        body2.CreateFixture(fixture2Def);

        // 5. Joint 2 (Body1 -> Body2)
        const jd2 = Box2d.b2RevoluteJointDef();
        // Initialize at end of first arm
        const jointPos = Box2d.b2Vec2(ANCHOR_X + ARM_LENGTH, ANCHOR_Y);
        jd2.Initialize(body1, body2, jointPos);
        world.CreateJoint(jd2);

        // Initial Velocity for chaos
        body1.SetLinearVelocity(Box2d.b2Vec2(0, 0));
        body2.SetLinearVelocity(Box2d.b2Vec2(0, 0));
        // Give it a kick by setting transforms rotated
        body1.SetTransform(Box2d.b2Vec2(ANCHOR_X + Math.sin(1)*ARM_LENGTH/2, ANCHOR_Y + Math.cos(1)*ARM_LENGTH/2), 1);
        
        setIsReady(true);
      } catch (error) {
        console.error("Failed to initialize Box2D:", error);
      }
    };

    setupPhysics();

    return () => {
      worldRef.current = null;
      body1Ref.current = null;
      body2Ref.current = null;
      box2dApiRef.current = null;
    };
  }, []);

  const stepPhysics = useCallback((dt: number) => {
    if (!worldRef.current || !body1Ref.current || !body2Ref.current) return;

    worldRef.current.Step(dt, 8, 3);

    const b1 = body1Ref.current;
    const b2 = body2Ref.current;
    const pos1 = b1.GetPosition();
    const pos2 = b2.GetPosition();

    setState({
      b1: { x: pos1.x * PIXELS_PER_METER, y: pos1.y * PIXELS_PER_METER, angle: b1.GetAngle() },
      b2: { x: pos2.x * PIXELS_PER_METER, y: pos2.y * PIXELS_PER_METER, angle: b2.GetAngle() },
    });
  }, []);

  useSimplePhysicsLoop(stepPhysics, isReady);

  const anchorScreenX = ANCHOR_X * PIXELS_PER_METER;
  const anchorScreenY = ANCHOR_Y * PIXELS_PER_METER;
  const armW = ARM_LENGTH * PIXELS_PER_METER;
  const armH = ARM_WIDTH * PIXELS_PER_METER;

  return (
    <Canvas ref={canvasRef} style={{ flex: 1 }}>
      <Fill color="#1a1a2e" />

      {/* Anchor */}
      <Circle cx={anchorScreenX} cy={anchorScreenY} r={8} color="#666" />

      {/* Arm 1 */}
      <Group
        transform={[
          { translateX: state.b1.x },
          { translateY: state.b1.y },
          { rotate: state.b1.angle },
        ]}
      >
        <Rect x={-armW/2} y={-armH/2} width={armW} height={armH} color="#FF6B6B" />
      </Group>

      {/* Arm 2 */}
      <Group
        transform={[
          { translateX: state.b2.x },
          { translateY: state.b2.y },
          { rotate: state.b2.angle },
        ]}
      >
        <Rect x={-armW/2} y={-armH/2} width={armW} height={armH} color="#4ECDC4" />
      </Group>

      {/* Joint 1 Visualization */}
      {/* We can calculate joint positions if needed, but the visual overlap covers it */}
    </Canvas>
  );
}
