import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions } from "react-native";
import {
  Canvas,
  Circle,
  Line,
  useCanvasRef,
  Fill,
  vec,
  Group,
} from "@shopify/react-native-skia";
import { initPhysics, b2Body, b2World, Box2DAPI } from "../../lib/physics";
import { useSimplePhysicsLoop } from "../../lib/physics2d";

const PIXELS_PER_METER = 50;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ANCHOR_Y = 2;
const STRING_LENGTH = 4;
const BALL_RADIUS = 0.5;
const BALL_COUNT = 5;
const SPACING = BALL_RADIUS * 2.01; // Slightly more than diameter to prevent overlap issues at rest? No, touching is good for newton's cradle.

interface BallState {
  x: number;
  y: number;
  anchorX: number;
}

export default function NewtonsCradle() {
  const canvasRef = useCanvasRef();
  const worldRef = useRef<b2World | null>(null);
  const bodiesRef = useRef<b2Body[]>([]);
  const [balls, setBalls] = useState<BallState[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setupPhysics = async () => {
      try {
        const Box2d = await initPhysics();
        const gravity = Box2d.b2Vec2(0, 9.8);
        const world = Box2d.b2World(gravity);
        worldRef.current = world;

        const anchorDef = Box2d.b2BodyDef();
        anchorDef.position = Box2d.b2Vec2(0, ANCHOR_Y);
        const anchorBody = world.CreateBody(anchorDef);

        const ballShape = Box2d.b2CircleShape();
        ballShape.SetRadius(BALL_RADIUS);

        const ballFixture = Box2d.b2FixtureDef();
        ballFixture.shape = ballShape;
        ballFixture.density = 1.0;
        ballFixture.friction = 0;
        ballFixture.restitution = 1.0; // Perfectly elastic

        const newBodies: b2Body[] = [];
        const newBalls: BallState[] = [];
        const startX = SCREEN_WIDTH / PIXELS_PER_METER / 2 - (BALL_COUNT-1) * SPACING / 2;

        for (let i = 0; i < BALL_COUNT; i++) {
            const bx = startX + i * SPACING;
            const bd = Box2d.b2BodyDef();
            bd.type = 2;
            // Pull the first ball back
            if (i === 0) {
                bd.position = Box2d.b2Vec2(bx - 2, ANCHOR_Y + STRING_LENGTH - 1);
            } else {
                bd.position = Box2d.b2Vec2(bx, ANCHOR_Y + STRING_LENGTH);
            }
            
            const body = world.CreateBody(bd);
            body.CreateFixture(ballFixture);
            body.SetLinearDamping(0);

            // Distance Joint
            const jd = Box2d.b2DistanceJointDef();
            jd.Initialize(anchorBody, body, Box2d.b2Vec2(bx, ANCHOR_Y), body.GetPosition());
            // jd.length should be auto-set by Initialize
            jd.collideConnected = false;
            jd.stiffness = 0;
            jd.damping = 0;
            
            world.CreateJoint(jd);

            newBodies.push(body);
            newBalls.push({
                x: 0, y: 0, anchorX: bx * PIXELS_PER_METER
            });
        }

        bodiesRef.current = newBodies;
        setBalls(newBalls);
        setIsReady(true);
      } catch (error) {
        console.error(error);
      }
    };

    setupPhysics();
    return () => { worldRef.current = null; bodiesRef.current = []; };
  }, []);

  const stepCallback = useCallback((dt: number) => {
    if (!worldRef.current) return;
    worldRef.current.Step(dt, 8, 3);

    const updated = bodiesRef.current.map((b, i) => {
      const p = b.GetPosition();
      return {
        x: p.x * PIXELS_PER_METER,
        y: p.y * PIXELS_PER_METER,
        anchorX: balls[i]?.anchorX ?? 0
      };
    });
    setBalls(updated);
  }, [balls]);

  useSimplePhysicsLoop(stepCallback, isReady);

  const anchorY = ANCHOR_Y * PIXELS_PER_METER;

  return (
    <Canvas ref={canvasRef} style={{ flex: 1 }}>
      <Fill color="#1a1a2e" />
      {balls.map((b, i) => (
        <Group key={i}>
            <Line p1={vec(b.anchorX, anchorY)} p2={vec(b.x, b.y)} color="#bdc3c7" strokeWidth={2} />
            <Circle cx={b.x} cy={b.y} r={BALL_RADIUS * PIXELS_PER_METER} color="#e74c3c" />
        </Group>
      ))}
      <Line p1={vec(balls[0]?.anchorX || 0, anchorY)} p2={vec(balls[BALL_COUNT-1]?.anchorX || 0, anchorY)} color="#bdc3c7" strokeWidth={4} />
    </Canvas>
  );
}
