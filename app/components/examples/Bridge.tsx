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
const SEGMENTS = 20;
const BRIDGE_WIDTH = SCREEN_WIDTH / PIXELS_PER_METER - 2; // Padding
const SEGMENT_WIDTH = BRIDGE_WIDTH / SEGMENTS;
const SEGMENT_HEIGHT = 0.2;
const BRIDGE_Y = 5;

interface BodyState {
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
  color: string;
}

export default function Bridge() {
  const canvasRef = useCanvasRef();
  const worldRef = useRef<b2World | null>(null);
  const bodiesRef = useRef<b2Body[]>([]);
  const [segments, setSegments] = useState<BodyState[]>([]);
  const [boxes, setBoxes] = useState<BodyState[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setupPhysics = async () => {
      try {
        const Box2d = await initPhysics();
        const gravity = Box2d.b2Vec2(0, 9.8);
        const world = Box2d.b2World(gravity);
        worldRef.current = world;

        const plankShape = Box2d.b2PolygonShape();
        plankShape.SetAsBox(SEGMENT_WIDTH / 2, SEGMENT_HEIGHT / 2);

        const fixtureDef = Box2d.b2FixtureDef();
        fixtureDef.shape = plankShape;
        fixtureDef.density = 20;
        fixtureDef.friction = 0.2;

        let prevBody = null;
        const segmentBodies: b2Body[] = [];
        const segmentStates: BodyState[] = [];

        // Left Anchor
        const anchorDef = Box2d.b2BodyDef();
        anchorDef.position = Box2d.b2Vec2(1, BRIDGE_Y);
        const leftAnchor = world.CreateBody(anchorDef);
        prevBody = leftAnchor;

        for (let i = 0; i < SEGMENTS; i++) {
          const bodyDef = Box2d.b2BodyDef();
          bodyDef.type = 2; // Dynamic
          bodyDef.position = Box2d.b2Vec2(1 + SEGMENT_WIDTH * (i + 0.5), BRIDGE_Y);
          const body = world.CreateBody(bodyDef);
          body.CreateFixture(fixtureDef);

          const jointDef = Box2d.b2RevoluteJointDef();
          jointDef.Initialize(prevBody, body, Box2d.b2Vec2(1 + SEGMENT_WIDTH * i, BRIDGE_Y));
          world.CreateJoint(jointDef);

          prevBody = body;
          segmentBodies.push(body);
          
          segmentStates.push({
            x: 0, y: 0, angle: 0, 
            width: SEGMENT_WIDTH * PIXELS_PER_METER,
            height: SEGMENT_HEIGHT * PIXELS_PER_METER,
            color: "#8B4513"
          });
        }

        // Right Anchor
        const rightAnchorDef = Box2d.b2BodyDef();
        rightAnchorDef.position = Box2d.b2Vec2(1 + BRIDGE_WIDTH, BRIDGE_Y);
        const rightAnchor = world.CreateBody(rightAnchorDef);

        const finalJointDef = Box2d.b2RevoluteJointDef();
        finalJointDef.Initialize(prevBody, rightAnchor, Box2d.b2Vec2(1 + BRIDGE_WIDTH, BRIDGE_Y));
        world.CreateJoint(finalJointDef);

        bodiesRef.current = segmentBodies;
        setSegments(segmentStates);

        // Falling Objects
        const boxShape = Box2d.b2PolygonShape();
        boxShape.SetAsBox(0.5, 0.5);
        
        const boxFixture = Box2d.b2FixtureDef();
        boxFixture.shape = boxShape;
        boxFixture.density = 1;

        const newBoxes: b2Body[] = [];
        const boxStates: BodyState[] = [];

        for(let i=0; i<5; i++) {
            const bd = Box2d.b2BodyDef();
            bd.type = 2;
            bd.position = Box2d.b2Vec2(1 + BRIDGE_WIDTH/2 + (Math.random()-0.5), 1 - i*1.5);
            const b = world.CreateBody(bd);
            b.CreateFixture(boxFixture);
            newBoxes.push(b);
            boxStates.push({
                x: 0, y: 0, angle: 0,
                width: 1 * PIXELS_PER_METER,
                height: 1 * PIXELS_PER_METER,
                color: "#e74c3c"
            });
        }
        
        bodiesRef.current = [...segmentBodies, ...newBoxes];
        setBoxes(boxStates);

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

    const segmentBodies = bodiesRef.current.slice(0, SEGMENTS);
    const boxBodies = bodiesRef.current.slice(SEGMENTS);

    setSegments(prev => segmentBodies.map((b, i) => {
      const p = b.GetPosition();
      return {
        ...prev[i],
        x: p.x * PIXELS_PER_METER,
        y: p.y * PIXELS_PER_METER,
        angle: b.GetAngle()
      };
    }));

    setBoxes(prev => boxBodies.map((b, i) => {
      const p = b.GetPosition();
      return {
        ...prev[i],
        x: p.x * PIXELS_PER_METER,
        y: p.y * PIXELS_PER_METER,
        angle: b.GetAngle()
      };
    }));
  }, []);

  useSimplePhysicsLoop(stepCallback, isReady);

  return (
    <Canvas ref={canvasRef} style={{ flex: 1 }}>
      <Fill color="#1a1a2e" />
      {segments.map((s, i) => (
        <Group key={i} transform={[{ translateX: s.x }, { translateY: s.y }, { rotate: s.angle }]}>
            <Rect x={-s.width/2} y={-s.height/2} width={s.width} height={s.height} color={s.color} />
        </Group>
      ))}
      {boxes.map((b, i) => (
        <Group key={`box-${i}`} transform={[{ translateX: b.x }, { translateY: b.y }, { rotate: b.angle }]}>
            <Rect x={-b.width/2} y={-b.height/2} width={b.width} height={b.height} color={b.color} />
        </Group>
      ))}
      {/* Anchors */}
      <Circle cx={1 * PIXELS_PER_METER} cy={BRIDGE_Y * PIXELS_PER_METER} r={5} color="#fff" />
      <Circle cx={(1 + BRIDGE_WIDTH) * PIXELS_PER_METER} cy={BRIDGE_Y * PIXELS_PER_METER} r={5} color="#fff" />
    </Canvas>
  );
}
