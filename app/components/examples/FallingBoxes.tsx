import React, { useEffect, useRef, useState } from "react";
import { Dimensions } from "react-native";
import {
  Canvas,
  Rect,
  useCanvasRef,
  Group,
  Fill,
} from "@shopify/react-native-skia";
import { useFrameCallback } from "react-native-reanimated";
import { initPhysics, b2Body, b2World } from "../../lib/physics";

const PIXELS_PER_METER = 50;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const WORLD_WIDTH = SCREEN_WIDTH / PIXELS_PER_METER;
const WORLD_HEIGHT = SCREEN_HEIGHT / PIXELS_PER_METER;
const BOX_SIZE = 0.8;
const GROUND_HEIGHT = 3; // Increased to ensure visibility

interface BoxState {
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
  color: string;
}

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
];

export default function FallingBoxes() {
  const canvasRef = useCanvasRef();
  const worldRef = useRef<b2World | null>(null);
  const bodiesRef = useRef<b2Body[]>([]);
  const [boxes, setBoxes] = useState<BoxState[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setupPhysics = async () => {
      try {
        const Box2d = await initPhysics();

        const gravity = Box2d.b2Vec2(0, 9.8);
        const world = Box2d.b2World(gravity);
        worldRef.current = world;

        const groundDef = Box2d.b2BodyDef();
        groundDef.type = 0;
        groundDef.position = Box2d.b2Vec2(WORLD_WIDTH / 2, WORLD_HEIGHT - GROUND_HEIGHT / 2);
        const groundBody = world.CreateBody(groundDef);

        const groundShape = Box2d.b2PolygonShape();
        groundShape.SetAsBox(WORLD_WIDTH / 2, GROUND_HEIGHT / 2);

        const groundFixture = Box2d.b2FixtureDef();
        groundFixture.shape = groundShape;
        groundFixture.density = 0;
        groundFixture.friction = 0.6;
        groundBody.CreateFixture(groundFixture);

        const newBodies: b2Body[] = [];
        const initialBoxes: BoxState[] = [];

        for (let i = 0; i < 8; i++) {
          const bodyDef = Box2d.b2BodyDef();
          bodyDef.type = 2;
          bodyDef.position = Box2d.b2Vec2(
            1 + (i % 4) * 1.5 + Math.random() * 0.5,
            1 + Math.floor(i / 4) * 1.5
          );
          bodyDef.angle = Math.random() * 0.5 - 0.25;

          const body = world.CreateBody(bodyDef);

          const boxShape = Box2d.b2PolygonShape();
          boxShape.SetAsBox(BOX_SIZE / 2, BOX_SIZE / 2);

          const fixtureDef = Box2d.b2FixtureDef();
          fixtureDef.shape = boxShape;
          fixtureDef.density = 1.0;
          fixtureDef.friction = 0.3;
          fixtureDef.restitution = 0.2;
          body.CreateFixture(fixtureDef);

          newBodies.push(body);
          
          const pos = body.GetPosition();
          initialBoxes.push({
            x: pos.x * PIXELS_PER_METER,
            y: pos.y * PIXELS_PER_METER,
            angle: body.GetAngle(),
            width: BOX_SIZE * PIXELS_PER_METER,
            height: BOX_SIZE * PIXELS_PER_METER,
            color: COLORS[i % COLORS.length],
          });
        }

        bodiesRef.current = newBodies;
        setBoxes(initialBoxes);
        setIsReady(true);
      } catch (error) {
        console.error("Failed to initialize Box2D:", error);
      }
    };

    setupPhysics();

    return () => {
      worldRef.current = null;
      bodiesRef.current = [];
    };
  }, []);

  useFrameCallback((frameInfo) => {
    if (!worldRef.current || !isReady) return;

    const dt = frameInfo.timeSincePreviousFrame
      ? frameInfo.timeSincePreviousFrame / 1000
      : 1 / 60;

    const clampedDt = Math.min(dt, 1 / 30);
    worldRef.current.Step(clampedDt, 8, 3);

    const updatedBoxes = bodiesRef.current.map((body, i) => {
      const pos = body.GetPosition();
      const angle = body.GetAngle();
      return {
        x: pos.x * PIXELS_PER_METER,
        y: pos.y * PIXELS_PER_METER,
        angle,
        width: BOX_SIZE * PIXELS_PER_METER,
        height: BOX_SIZE * PIXELS_PER_METER,
        color: COLORS[i % COLORS.length],
      };
    });

    setBoxes(updatedBoxes);
  }, true);

  return (
    <Canvas ref={canvasRef} style={{ flex: 1 }}>
      <Fill color="#1a1a2e" />

      <Rect
        x={0}
        y={SCREEN_HEIGHT - GROUND_HEIGHT * PIXELS_PER_METER}
        width={SCREEN_WIDTH}
        height={GROUND_HEIGHT * PIXELS_PER_METER}
        color="#2d3436"
      />

      {boxes.map((box, index) => (
        <Group
          key={`box-${index}`}
          transform={[
            { translateX: box.x },
            { translateY: box.y },
            { rotate: box.angle },
          ]}
          origin={{ x: 0, y: 0 }}
        >
          <Rect
            x={-box.width / 2}
            y={-box.height / 2}
            width={box.width}
            height={box.height}
            color={box.color}
          />
        </Group>
      ))}
    </Canvas>
  );
}
