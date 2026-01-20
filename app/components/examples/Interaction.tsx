import React, { useEffect, useRef, useState, useCallback } from "react";
import { Dimensions, GestureResponderEvent, View } from "react-native";
import {
  Canvas,
  Circle,
  Rect,
  useCanvasRef,
  Fill,
} from "@shopify/react-native-skia";
import { useFrameCallback } from "react-native-reanimated";
import { initPhysics, b2Body, b2World, Box2DAPI } from "../../lib/physics";

const PIXELS_PER_METER = 50;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const WORLD_WIDTH = SCREEN_WIDTH / PIXELS_PER_METER;
const WORLD_HEIGHT = SCREEN_HEIGHT / PIXELS_PER_METER;
const GROUND_HEIGHT = 0.5;
const MAX_BODIES = 50;

interface BodyState {
  x: number;
  y: number;
  radius: number;
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
  "#A29BFE",
  "#FD79A8",
];

export default function Interaction() {
  const canvasRef = useCanvasRef();
  const worldRef = useRef<b2World | null>(null);
  const bodiesRef = useRef<b2Body[]>([]);
  const box2dApiRef = useRef<Box2DAPI | null>(null);
  const [bodies, setBodies] = useState<BodyState[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setupPhysics = async () => {
      try {
        const Box2d = await initPhysics();
        box2dApiRef.current = Box2d;

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

        const leftWallDef = Box2d.b2BodyDef();
        leftWallDef.type = 0;
        leftWallDef.position = Box2d.b2Vec2(-0.5, WORLD_HEIGHT / 2);
        const leftWall = world.CreateBody(leftWallDef);
        const leftWallShape = Box2d.b2PolygonShape();
        leftWallShape.SetAsBox(0.5, WORLD_HEIGHT / 2);
        leftWall.CreateFixture2(leftWallShape, 0);

        const rightWallDef = Box2d.b2BodyDef();
        rightWallDef.type = 0;
        rightWallDef.position = Box2d.b2Vec2(WORLD_WIDTH + 0.5, WORLD_HEIGHT / 2);
        const rightWall = world.CreateBody(rightWallDef);
        const rightWallShape = Box2d.b2PolygonShape();
        rightWallShape.SetAsBox(0.5, WORLD_HEIGHT / 2);
        rightWall.CreateFixture2(rightWallShape, 0);

        setIsReady(true);
      } catch (error) {
        console.error("Failed to initialize Box2D:", error);
      }
    };

    setupPhysics();

    return () => {
      worldRef.current = null;
      bodiesRef.current = [];
      box2dApiRef.current = null;
    };
  }, []);

  const spawnBall = useCallback((screenX: number, screenY: number) => {
    if (!worldRef.current || !box2dApiRef.current) return;

    const Box2d = box2dApiRef.current;
    const world = worldRef.current;

    if (bodiesRef.current.length >= MAX_BODIES) {
      const oldBody = bodiesRef.current.shift();
      if (oldBody) {
        world.DestroyBody(oldBody);
      }
    }

    const worldX = screenX / PIXELS_PER_METER;
    const worldY = screenY / PIXELS_PER_METER;
    const radius = 0.3 + Math.random() * 0.4;

    const bodyDef = Box2d.b2BodyDef();
    bodyDef.type = 2;
    bodyDef.position = Box2d.b2Vec2(worldX, worldY);

    const body = world.CreateBody(bodyDef);

    const shape = Box2d.b2CircleShape();
    shape.SetRadius(radius);

    const fixtureDef = Box2d.b2FixtureDef();
    fixtureDef.shape = shape;
    fixtureDef.density = 1.0;
    fixtureDef.friction = 0.3;
    fixtureDef.restitution = 0.5;
    body.CreateFixture(fixtureDef);

    (body as any)._radius = radius;
    (body as any)._color = COLORS[Math.floor(Math.random() * COLORS.length)];

    bodiesRef.current.push(body);
  }, []);

  const handleTouch = useCallback((event: GestureResponderEvent) => {
    console.log("Touch event detected!", event.nativeEvent);
    const { locationX, locationY } = event.nativeEvent;
    spawnBall(locationX, locationY);
  }, [spawnBall]);

  useFrameCallback(() => {
    if (!worldRef.current || !isReady) return;

    worldRef.current.Step(1 / 60, 8, 3);

    const updatedBodies = bodiesRef.current.map((body) => {
      const pos = body.GetPosition();
      return {
        x: pos.x * PIXELS_PER_METER,
        y: pos.y * PIXELS_PER_METER,
        radius: ((body as any)._radius || 0.5) * PIXELS_PER_METER,
        color: (body as any)._color || "#FF6B6B",
      };
    });

    setBodies(updatedBodies);
  }, true);

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponder={() => {
        console.log("onStartShouldSetResponder called");
        return true;
      }}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
    >
      <Canvas
        ref={canvasRef}
        style={{ flex: 1 }}
        pointerEvents="none"
      >
        <Fill color="#1a1a2e" />

        <Rect
          x={0}
          y={SCREEN_HEIGHT - GROUND_HEIGHT * PIXELS_PER_METER}
          width={SCREEN_WIDTH}
          height={GROUND_HEIGHT * PIXELS_PER_METER}
          color="#2d3436"
        />

        {bodies.map((body, index) => (
          <Circle
            key={`ball-${index}`}
            cx={body.x}
            cy={body.y}
            r={body.radius}
            color={body.color}
          />
        ))}
      </Canvas>
    </View>
  );
}
