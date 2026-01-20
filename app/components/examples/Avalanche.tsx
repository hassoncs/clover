import React, { useEffect, useRef, useState } from "react";
import { Dimensions } from "react-native";
import {
  Canvas,
  Rect,
  Circle,
  useCanvasRef,
  Fill,
  Group,
} from "@shopify/react-native-skia";
import { useFrameCallback } from "react-native-reanimated";
import { initPhysics, b2Body, b2World, Box2DAPI } from "../../lib/physics";

const PIXELS_PER_METER = 50;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GROUND_Y = SCREEN_HEIGHT / PIXELS_PER_METER;

interface BodyState {
  x: number;
  y: number;
  angle: number;
  radius: number;
  color: string;
}

export default function Avalanche() {
  const canvasRef = useCanvasRef();
  const worldRef = useRef<b2World | null>(null);
  const bodiesRef = useRef<b2Body[]>([]);
  const [particles, setParticles] = useState<BodyState[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setupPhysics = async () => {
      try {
        const Box2d = await initPhysics();
        const gravity = Box2d.b2Vec2(0, 9.8);
        const world = Box2d.b2World(gravity);
        worldRef.current = world;

        // Funnel / Ground
        const groundBodyDef = Box2d.b2BodyDef();
        groundBodyDef.position = Box2d.b2Vec2(0, 0);
        const ground = world.CreateBody(groundBodyDef);

        const leftWall = Box2d.b2PolygonShape();
        leftWall.SetAsBox(10, 1);
        const leftFixture = Box2d.b2FixtureDef();
        leftFixture.shape = leftWall;
        
        const w1Def = Box2d.b2BodyDef();
        w1Def.position = Box2d.b2Vec2(SCREEN_WIDTH/PIXELS_PER_METER * 0.2, GROUND_Y - 5);
        w1Def.angle = 0.5;
        const w1 = world.CreateBody(w1Def);
        w1.CreateFixture(leftFixture);

        const w2Def = Box2d.b2BodyDef();
        w2Def.position = Box2d.b2Vec2(SCREEN_WIDTH/PIXELS_PER_METER * 0.8, GROUND_Y - 5);
        w2Def.angle = -0.5;
        const w2 = world.CreateBody(w2Def);
        w2.CreateFixture(leftFixture);

        const pShape = Box2d.b2CircleShape();
        const pRadius = 0.15;
        pShape.SetRadius(pRadius);
        
        const pFixture = Box2d.b2FixtureDef();
        pFixture.shape = pShape;
        pFixture.density = 1;
        pFixture.friction = 0.1;
        pFixture.restitution = 0.5;

        const newBodies: b2Body[] = [];
        const newParticles: BodyState[] = [];

        // 150 Particles
        for(let i=0; i<150; i++) {
            const bd = Box2d.b2BodyDef();
            bd.type = 2;
            bd.position = Box2d.b2Vec2(
                SCREEN_WIDTH/PIXELS_PER_METER/2 + (Math.random()-0.5)*2,
                -5 - i * 0.5
            );
            const b = world.CreateBody(bd);
            b.CreateFixture(pFixture);
            newBodies.push(b);
            newParticles.push({
                x: 0, y: 0, angle: 0,
                radius: pRadius * PIXELS_PER_METER,
                color: `hsl(${Math.random()*60 + 180}, 80%, 60%)` // Blue/Cyan
            });
        }

        bodiesRef.current = newBodies;
        setParticles(newParticles);
        setIsReady(true);
      } catch (error) {
        console.error(error);
      }
    };

    setupPhysics();
    return () => { worldRef.current = null; bodiesRef.current = []; };
  }, []);

  useFrameCallback(() => {
    if (!worldRef.current || !isReady) return;
    worldRef.current.Step(1 / 60, 8, 3);

    const updated = bodiesRef.current.map((b, i) => {
        const p = b.GetPosition();
        return {
            ...particles[i],
            x: p.x * PIXELS_PER_METER,
            y: p.y * PIXELS_PER_METER,
            angle: b.GetAngle()
        };
    });
    setParticles(updated);
  }, true);

  return (
    <Canvas ref={canvasRef} style={{ flex: 1 }}>
      <Fill color="#1a1a2e" />
      
      {/* Funnel Walls (Visual) */}
      <Group transform={[{ translateX: SCREEN_WIDTH * 0.2 }, { translateY: (GROUND_Y - 5) * PIXELS_PER_METER }, { rotate: 0.5 }]}>
        <Rect x={-10*PIXELS_PER_METER} y={-1*PIXELS_PER_METER} width={20*PIXELS_PER_METER} height={2*PIXELS_PER_METER} color="#7f8c8d" />
      </Group>
      <Group transform={[{ translateX: SCREEN_WIDTH * 0.8 }, { translateY: (GROUND_Y - 5) * PIXELS_PER_METER }, { rotate: -0.5 }]}>
        <Rect x={-10*PIXELS_PER_METER} y={-1*PIXELS_PER_METER} width={20*PIXELS_PER_METER} height={2*PIXELS_PER_METER} color="#7f8c8d" />
      </Group>

      {particles.map((p, i) => (
        <Group key={i} transform={[{ translateX: p.x }, { translateY: p.y }, { rotate: p.angle }]}>
            <Circle cx={0} cy={0} r={p.radius} color={p.color} />
        </Group>
      ))}
    </Canvas>
  );
}
