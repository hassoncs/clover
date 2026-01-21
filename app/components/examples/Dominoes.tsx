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
const GROUND_Y = SCREEN_HEIGHT / PIXELS_PER_METER - 1;

interface BodyState {
  x: number;
  y: number;
  angle: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
}

export default function Dominoes() {
  const canvasRef = useCanvasRef();
  const worldRef = useRef<b2World | null>(null);
  const bodiesRef = useRef<b2Body[]>([]);
  const [dominoes, setDominoes] = useState<BodyState[]>([]);
  const [ball, setBall] = useState<BodyState | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setupPhysics = async () => {
      try {
        const Box2d = await initPhysics();
        const gravity = Box2d.b2Vec2(0, 9.8);
        const world = Box2d.b2World(gravity);
        worldRef.current = world;

        // Ground
        const groundDef = Box2d.b2BodyDef();
        groundDef.position = Box2d.b2Vec2(0, GROUND_Y);
        const ground = world.CreateBody(groundDef);
        const groundShape = Box2d.b2PolygonShape();
        groundShape.SetAsBox(50, 1);
        ground.CreateFixture2(groundShape, 0);

        // Dominoes
        const dWidth = 0.2;
        const dHeight = 1.0;
        const dShape = Box2d.b2PolygonShape();
        dShape.SetAsBox(dWidth/2, dHeight/2);
        
        const dFixture = Box2d.b2FixtureDef();
        dFixture.shape = dShape;
        dFixture.density = 5;
        dFixture.friction = 0.5;
        dFixture.restitution = 0.1;

        const domBodies: b2Body[] = [];
        const domStates: BodyState[] = [];

        for(let i=0; i<15; i++) {
            const bd = Box2d.b2BodyDef();
            bd.type = 2;
            bd.position = Box2d.b2Vec2(3 + i * 0.8, GROUND_Y - dHeight/2);
            const body = world.CreateBody(bd);
            body.CreateFixture(dFixture);
            domBodies.push(body);
            domStates.push({
                x: 0, y: 0, angle: 0,
                width: dWidth * PIXELS_PER_METER,
                height: dHeight * PIXELS_PER_METER,
                color: "#e67e22"
            });
        }
        bodiesRef.current = domBodies;
        setDominoes(domStates);

        // Wrecking Ball
        const ballDef = Box2d.b2BodyDef();
        ballDef.type = 2;
        ballDef.position = Box2d.b2Vec2(1, GROUND_Y - 2);
        const ballBody = world.CreateBody(ballDef);
        
        const ballShape = Box2d.b2CircleShape();
        ballShape.SetRadius(0.5);
        
        const ballFixture = Box2d.b2FixtureDef();
        ballFixture.shape = ballShape;
        ballFixture.density = 20; // Heavy
        ballFixture.restitution = 0.2;
        ballBody.CreateFixture(ballFixture);

        // Initial velocity to hit dominoes
        ballBody.SetLinearVelocity(Box2d.b2Vec2(5, 0));
        
        (worldRef as any).ball = ballBody;
        setBall({ x: 0, y: 0, angle: 0, radius: 0.5 * PIXELS_PER_METER, color: "#2c3e50" });

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

    const newDoms = bodiesRef.current.map((b, i) => {
      const p = b.GetPosition();
      return {
        x: p.x * PIXELS_PER_METER,
        y: p.y * PIXELS_PER_METER,
        angle: b.GetAngle(),
        width: 0.2 * PIXELS_PER_METER,
        height: 1.0 * PIXELS_PER_METER,
        color: "#e67e22"
      };
    });
    setDominoes(newDoms);

    const b = (worldRef.current as any).ball as b2Body;
    if (b) {
      const p = b.GetPosition();
      setBall({
        x: p.x * PIXELS_PER_METER,
        y: p.y * PIXELS_PER_METER,
        angle: b.GetAngle(),
        radius: 0.5 * PIXELS_PER_METER,
        color: "#2c3e50"
      });
    }
  }, []);

  useSimplePhysicsLoop(stepCallback, isReady);

  return (
    <Canvas ref={canvasRef} style={{ flex: 1 }}>
      <Fill color="#1a1a2e" />
      
      {/* Floor */}
      <Rect x={0} y={GROUND_Y * PIXELS_PER_METER} width={SCREEN_WIDTH} height={50} color="#7f8c8d" />

      {dominoes.map((d, i) => (
        <Group key={i} transform={[{ translateX: d.x }, { translateY: d.y }, { rotate: d.angle }]}>
            <Rect x={-(d.width!)/2} y={-(d.height!)/2} width={d.width!} height={d.height!} color={d.color} />
        </Group>
      ))}

      {ball && (
        <Group transform={[{ translateX: ball.x }, { translateY: ball.y }, { rotate: ball.angle }]}>
            <Circle cx={0} cy={0} r={ball.radius!} color={ball.color} />
        </Group>
      )}
    </Canvas>
  );
}
