import { useEffect, useRef, useState, useCallback } from "react";
import { Dimensions, View } from "react-native";
import {
  Canvas,
  Circle,
  Rect,
  Line,
  Text,
  useFont,
  useCanvasRef,
  Fill,
  vec,
} from "@shopify/react-native-skia";

import {
  createPhysics2D,
  type Physics2D,
  type BodyId,
  vec2,
  useSimplePhysicsLoop,
} from "./physics2d";

const PIXELS_PER_METER = 50;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const WORLD_WIDTH = SCREEN_WIDTH / PIXELS_PER_METER;
const WORLD_HEIGHT = SCREEN_HEIGHT / PIXELS_PER_METER;
const GROUND_Y = WORLD_HEIGHT * 0.75;
const GROUND_HEIGHT = 0.5;
const MAX_BODIES = 50;

interface BodyState {
  id: BodyId;
  x: number;
  y: number;
  radius: number;
  color: string;
  isDragging: boolean;
}

interface DragState {
  bodyId: BodyId;
  jointId: { __brand: 'JointId'; value: number };
  targetX: number;
  targetY: number;
}

interface DebugInfo {
  lastTouchX: number;
  lastTouchY: number;
  lastWorldX: number;
  lastWorldY: number;
  hitBodyId: number | null;
  isDragging: boolean;
  jointCreated: boolean;
  error: string | null;
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

export default function InteractionV2() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const bodyIdsRef = useRef<{ id: BodyId; radius: number; color: string }[]>([]);
  const [bodies, setBodies] = useState<BodyState[]>([]);
  const [isReady, setIsReady] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);
  const [dragLine, setDragLine] = useState<{ bodyX: number; bodyY: number; targetX: number; targetY: number } | null>(null);
  const [debug, setDebug] = useState<DebugInfo>({
    lastTouchX: 0,
    lastTouchY: 0,
    lastWorldX: 0,
    lastWorldY: 0,
    hitBodyId: null,
    isDragging: false,
    jointCreated: false,
    error: null,
  });
  const [touchPoint, setTouchPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const setupPhysics = async () => {
      try {
        const physics = await createPhysics2D();
        physics.createWorld(vec2(0, 9.8));
        physicsRef.current = physics;

        const groundId = physics.createBody({
          type: 'static',
          position: vec2(WORLD_WIDTH / 2, GROUND_Y),
        });
        physics.addFixture(groundId, {
          shape: { type: 'box', halfWidth: WORLD_WIDTH / 2, halfHeight: GROUND_HEIGHT / 2 },
          density: 0,
          friction: 0.6,
        });

        const leftWallId = physics.createBody({
          type: 'static',
          position: vec2(-0.5, WORLD_HEIGHT / 2),
        });
        physics.addFixture(leftWallId, {
          shape: { type: 'box', halfWidth: 0.5, halfHeight: WORLD_HEIGHT / 2 },
          density: 0,
        });

        const rightWallId = physics.createBody({
          type: 'static',
          position: vec2(WORLD_WIDTH + 0.5, WORLD_HEIGHT / 2),
        });
        physics.addFixture(rightWallId, {
          shape: { type: 'box', halfWidth: 0.5, halfHeight: WORLD_HEIGHT / 2 },
          density: 0,
        });

        for (let i = 0; i < 10; i++) {
          const radius = 0.4 + Math.random() * 0.3;
          const color = COLORS[i % COLORS.length];
          const x = 1 + (i % 5) * (WORLD_WIDTH - 2) / 5 + Math.random() * 0.5;
          const y = 2 + Math.floor(i / 5) * 2 + Math.random() * 0.5;

          const bodyId = physics.createBody({
            type: 'dynamic',
            position: vec2(x, y),
          });

          physics.addFixture(bodyId, {
            shape: { type: 'circle', radius },
            density: 1.0,
            friction: 0.3,
            restitution: 0.5,
          });

          bodyIdsRef.current.push({ id: bodyId, radius, color });
        }

        setIsReady(true);
        console.log('[Interaction] Physics initialized, bodies created:', bodyIdsRef.current.length);
      } catch (error) {
        console.error("Failed to initialize Physics2D:", error);
      }
    };

    setupPhysics();

    return () => {
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      bodyIdsRef.current = [];
    };
  }, []);

  const spawnBall = useCallback((screenX: number, screenY: number) => {
    if (!physicsRef.current) return;

    const physics = physicsRef.current;

    if (bodyIdsRef.current.length >= MAX_BODIES) {
      const oldest = bodyIdsRef.current.shift();
      if (oldest) {
        physics.destroyBody(oldest.id);
      }
    }

    const worldX = screenX / PIXELS_PER_METER;
    const worldY = screenY / PIXELS_PER_METER;
    const radius = 0.3 + Math.random() * 0.4;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const bodyId = physics.createBody({
      type: 'dynamic',
      position: vec2(worldX, worldY),
    });

    physics.addFixture(bodyId, {
      shape: { type: 'circle', radius },
      density: 1.0,
      friction: 0.3,
      restitution: 0.5,
    });

    bodyIdsRef.current.push({ id: bodyId, radius, color });
    console.log('[Interaction] Spawned ball at', worldX.toFixed(2), worldY.toFixed(2));
  }, []);

  const handleTouchStart = useCallback((event: any) => {
    const physics = physicsRef.current;
    if (!physics) {
      console.log('[Interaction] No physics ref');
      return;
    }

    const { locationX, locationY } = event.nativeEvent;
    const worldX = locationX / PIXELS_PER_METER;
    const worldY = locationY / PIXELS_PER_METER;
    const worldPoint = vec2(worldX, worldY);

    console.log('[Interaction] Touch at screen:', locationX.toFixed(0), locationY.toFixed(0), 'world:', worldX.toFixed(2), worldY.toFixed(2));
    
    setTouchPoint({ x: locationX, y: locationY });

    const hitBody = physics.queryPoint(worldPoint);
    console.log('[Interaction] queryPoint result:', hitBody ? `body ${hitBody.value}` : 'null');

    setDebug(prev => ({
      ...prev,
      lastTouchX: locationX,
      lastTouchY: locationY,
      lastWorldX: worldX,
      lastWorldY: worldY,
      hitBodyId: hitBody?.value ?? null,
      error: null,
    }));

    if (hitBody) {
      try {
        console.log('[Interaction] Creating mouse joint for body', hitBody.value);
        const jointId = physics.createMouseJoint({
          type: 'mouse',
          body: hitBody,
          target: worldPoint,
          maxForce: 100000,
          stiffness: 30,
          damping: 0.9,
        });
        console.log('[Interaction] Mouse joint created:', jointId.value);

        dragStateRef.current = {
          bodyId: hitBody,
          jointId,
          targetX: locationX,
          targetY: locationY,
        };

        setDebug(prev => ({
          ...prev,
          isDragging: true,
          jointCreated: true,
        }));
      } catch (error) {
        console.error('[Interaction] Failed to create mouse joint:', error);
        setDebug(prev => ({
          ...prev,
          error: String(error),
          jointCreated: false,
        }));
      }
    } else {
      console.log('[Interaction] No hit, spawning ball');
      spawnBall(locationX, locationY);
    }
  }, [spawnBall]);

  const handleTouchMove = useCallback((event: any) => {
    const physics = physicsRef.current;
    const dragState = dragStateRef.current;
    
    const { locationX, locationY } = event.nativeEvent;
    setTouchPoint({ x: locationX, y: locationY });
    
    if (!physics || !dragState) return;

    const worldX = locationX / PIXELS_PER_METER;
    const worldY = locationY / PIXELS_PER_METER;

    physics.setMouseTarget(dragState.jointId, vec2(worldX, worldY));
    dragState.targetX = locationX;
    dragState.targetY = locationY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const physics = physicsRef.current;
    const dragState = dragStateRef.current;
    
    setTouchPoint(null);
    
    if (!physics || !dragState) return;

    try {
      console.log('[Interaction] Destroying mouse joint');
      physics.destroyJoint(dragState.jointId);
    } catch (error) {
      console.warn('[Interaction] Failed to destroy mouse joint:', error);
    }

    dragStateRef.current = null;
    setDragLine(null);
    setDebug(prev => ({
      ...prev,
      isDragging: false,
      jointCreated: false,
      hitBodyId: null,
    }));
  }, []);

  const stepPhysics = useCallback((dt: number) => {
    if (!physicsRef.current) return;

    physicsRef.current.step(dt, 8, 3);

    const dragState = dragStateRef.current;
    const draggedBodyId = dragState?.bodyId.value ?? null;

    const updatedBodies = bodyIdsRef.current.map((record) => {
      const transform = physicsRef.current!.getTransform(record.id);
      return {
        id: record.id,
        x: transform.position.x * PIXELS_PER_METER,
        y: transform.position.y * PIXELS_PER_METER,
        radius: record.radius * PIXELS_PER_METER,
        color: record.color,
        isDragging: record.id.value === draggedBodyId,
      };
    });

    setBodies(updatedBodies);

    if (dragState) {
      const bodyTransform = physicsRef.current.getTransform(dragState.bodyId);
      setDragLine({
        bodyX: bodyTransform.position.x * PIXELS_PER_METER,
        bodyY: bodyTransform.position.y * PIXELS_PER_METER,
        targetX: dragState.targetX,
        targetY: dragState.targetY,
      });
    }
  }, []);

  useSimplePhysicsLoop(stepPhysics, isReady);

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponder={() => true}
      onResponderGrant={handleTouchStart}
      onResponderMove={handleTouchMove}
      onResponderRelease={handleTouchEnd}
      onResponderTerminate={handleTouchEnd}
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

        {/* Debug: show touch point */}
        {touchPoint && (
          <>
            <Circle
              cx={touchPoint.x}
              cy={touchPoint.y}
              r={20}
              color="#ff000040"
            />
            <Circle
              cx={touchPoint.x}
              cy={touchPoint.y}
              r={5}
              color="#ff0000"
            />
          </>
        )}

        {/* Drag line from body to cursor */}
        {dragLine && (
          <>
            <Line
              p1={vec(dragLine.bodyX, dragLine.bodyY)}
              p2={vec(dragLine.targetX, dragLine.targetY)}
              color="#00ff00"
              style="stroke"
              strokeWidth={4}
            />
            <Circle
              cx={dragLine.targetX}
              cy={dragLine.targetY}
              r={10}
              color="#00ff00"
            />
          </>
        )}

        {/* Bodies */}
        {bodies.map((body) => (
          <Circle
            key={`ball-${body.id.value}`}
            cx={body.x}
            cy={body.y}
            r={body.radius}
            color={body.isDragging ? "#00ff00" : body.color}
          />
        ))}

        {/* Debug info overlay */}
        <Rect x={10} y={10} width={300} height={120} color="#00000080" />
        <Text x={15} y={30} text={`Touch: ${debug.lastTouchX.toFixed(0)}, ${debug.lastTouchY.toFixed(0)}`} color="white" font={null} />
        <Text x={15} y={50} text={`World: ${debug.lastWorldX.toFixed(2)}, ${debug.lastWorldY.toFixed(2)}`} color="white" font={null} />
        <Text x={15} y={70} text={`Hit Body: ${debug.hitBodyId ?? 'none'}`} color={debug.hitBodyId ? '#00ff00' : '#ff0000'} font={null} />
        <Text x={15} y={90} text={`Dragging: ${debug.isDragging} | Joint: ${debug.jointCreated}`} color="white" font={null} />
        <Text x={15} y={110} text={`Bodies: ${bodies.length} | Error: ${debug.error ?? 'none'}`} color={debug.error ? '#ff0000' : 'white'} font={null} />
      </Canvas>
    </View>
  );
}
