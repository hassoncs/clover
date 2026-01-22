import { useEffect, useRef, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import {
  Canvas,
  Circle,
  Rect,
  Line,
  Text,
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
  useForceDrag,
} from "../../lib/physics2d";
import { ViewportRoot, useViewport } from "../../lib/viewport";

const PIXELS_PER_METER = 50;
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

interface DebugInfo {
  lastTouchX: number;
  lastTouchY: number;
  lastWorldX: number;
  lastWorldY: number;
  hitBodyId: number | null;
  isDragging: boolean;
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

function InteractionCanvas() {
  const canvasRef = useCanvasRef();
  const physicsRef = useRef<Physics2D | null>(null);
  const bodyIdsRef = useRef<{ id: BodyId; radius: number; color: string }[]>([]);
  const [bodies, setBodies] = useState<BodyState[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [dragLine, setDragLine] = useState<{ bodyX: number; bodyY: number; targetX: number; targetY: number } | null>(null);
  const [debug, setDebug] = useState<DebugInfo>({
    lastTouchX: 0,
    lastTouchY: 0,
    lastWorldX: 0,
    lastWorldY: 0,
    hitBodyId: null,
    isDragging: false,
    error: null,
  });
  const [touchPoint, setTouchPoint] = useState<{ x: number; y: number } | null>(null);

  const vp = useViewport();

  useEffect(() => {
    if (!vp.isReady) return;

    const worldWidth = vp.world.size.width;
    const worldHeight = vp.world.size.height;
    const groundY = worldHeight * 0.75;
    let isMounted = true;

    const setupPhysics = async () => {
      try {
        if (physicsRef.current) {
          physicsRef.current.destroyWorld();
        }

        const physics = await createPhysics2D();
        if (!isMounted) return;

        physics.createWorld(vec2(0, 9.8));
        physicsRef.current = physics;

        const groundId = physics.createBody({
          type: 'static',
          position: vec2(worldWidth / 2, groundY),
        });
        physics.addFixture(groundId, {
          shape: { type: 'box', halfWidth: worldWidth / 2, halfHeight: GROUND_HEIGHT / 2 },
          density: 0,
          friction: 0.6,
        });

        const leftWallId = physics.createBody({
          type: 'static',
          position: vec2(-0.5, worldHeight / 2),
        });
        physics.addFixture(leftWallId, {
          shape: { type: 'box', halfWidth: 0.5, halfHeight: worldHeight / 2 },
          density: 0,
        });

        const rightWallId = physics.createBody({
          type: 'static',
          position: vec2(worldWidth + 0.5, worldHeight / 2),
        });
        physics.addFixture(rightWallId, {
          shape: { type: 'box', halfWidth: 0.5, halfHeight: worldHeight / 2 },
          density: 0,
        });

        for (let i = 0; i < 10; i++) {
          const radius = 0.4 + Math.random() * 0.3;
          const color = COLORS[i % COLORS.length];
          const x = 1 + (i % 5) * (worldWidth - 2) / 5 + Math.random() * 0.5;
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
      } catch (error) {
        console.error("Failed to initialize Physics2D:", error);
      }
    };

    setupPhysics();

    return () => {
      isMounted = false;
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      bodyIdsRef.current = [];
      setIsReady(false);
    };
  }, [vp.world.size.width, vp.world.size.height, vp.isReady]);

  const spawnBall = useCallback((worldX: number, worldY: number) => {
    if (!physicsRef.current) return;

    const physics = physicsRef.current;

    if (bodyIdsRef.current.length >= MAX_BODIES) {
      const oldest = bodyIdsRef.current.shift();
      if (oldest) {
        physics.destroyBody(oldest.id);
      }
    }

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

  const dragHandlers = useForceDrag(physicsRef, {
    pixelsPerMeter: PIXELS_PER_METER,
    stiffness: 50,
    damping: 5,
    onDragStart: (bodyId, worldPoint) => {
      console.log('[Interaction] Starting force-based drag for body', bodyId.value);
      // We set debug info here, but note that lastTouchX/Y will be approximate from worldPoint
      setDebug(prev => ({
        ...prev,
        lastWorldX: worldPoint.x,
        lastWorldY: worldPoint.y,
        hitBodyId: bodyId.value,
        isDragging: true,
        error: null,
      }));
      setTouchPoint({ x: worldPoint.x * PIXELS_PER_METER, y: worldPoint.y * PIXELS_PER_METER });
    },
    onDragMove: (bodyId, worldPoint) => {
       setTouchPoint({ x: worldPoint.x * PIXELS_PER_METER, y: worldPoint.y * PIXELS_PER_METER });
       setDebug(prev => ({
        ...prev,
        lastWorldX: worldPoint.x,
        lastWorldY: worldPoint.y,
       }));
    },
    onDragEnd: () => {
      setTouchPoint(null);
      setDragLine(null);
      setDebug(prev => ({
        ...prev,
        isDragging: false,
        hitBodyId: null,
      }));
    },
    onEmptyTap: (worldPoint) => {
      console.log('[Interaction] No hit, spawning ball');
      spawnBall(worldPoint.x, worldPoint.y);
      setTouchPoint({ x: worldPoint.x * PIXELS_PER_METER, y: worldPoint.y * PIXELS_PER_METER });
    },
  });

  const stepPhysics = useCallback((dt: number) => {
    const physics = physicsRef.current;
    if (!physics) return;

    dragHandlers.applyDragForces();

    const dragState = dragHandlers.getDragState();
    if (dragState) {
      const bodyTransform = physics.getTransform(dragState.bodyId);
      const bodyPos = bodyTransform.position;
      setDragLine({
        bodyX: bodyPos.x * PIXELS_PER_METER,
        bodyY: bodyPos.y * PIXELS_PER_METER,
        targetX: dragState.targetWorldX * PIXELS_PER_METER,
        targetY: dragState.targetWorldY * PIXELS_PER_METER,
      });
    }

    physics.step(dt, 8, 3);

    const draggedBodyId = dragHandlers.getDraggedBody()?.value ?? null;

    const updatedBodies = bodyIdsRef.current.map((record) => {
      const transform = physics.getTransform(record.id);
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
  }, [dragHandlers]);

  useSimplePhysicsLoop(stepPhysics, isReady);

  if (!vp.isReady) return null;

  const groundY = vp.size.height * 0.75;

  return (
    <GestureDetector gesture={dragHandlers.gesture}>
      <View style={styles.container}>
        <Canvas
          ref={canvasRef}
          style={styles.canvas}
          pointerEvents="none"
        >
          <Fill color="#1a1a2e" />

          <Rect
            x={0}
            y={groundY - GROUND_HEIGHT * PIXELS_PER_METER / 2}
            width={vp.size.width}
            height={GROUND_HEIGHT * PIXELS_PER_METER}
            color="#2d3436"
          />

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

          {bodies.map((body) => (
            <Circle
              key={`ball-${body.id.value}`}
              cx={body.x}
              cy={body.y}
              r={body.radius}
              color={body.isDragging ? "#00ff00" : body.color}
            />
          ))}

          <Rect x={10} y={10} width={300} height={120} color="#00000080" />
          <Text x={15} y={30} text={`Touch: ${debug.lastTouchX.toFixed(0)}, ${debug.lastTouchY.toFixed(0)}`} color="white" font={null} />
          <Text x={15} y={50} text={`World: ${debug.lastWorldX.toFixed(2)}, ${debug.lastWorldY.toFixed(2)}`} color="white" font={null} />
          <Text x={15} y={70} text={`Hit Body: ${debug.hitBodyId ?? 'none'}`} color={debug.hitBodyId ? '#00ff00' : '#ff0000'} font={null} />
          <Text x={15} y={90} text={`Dragging: ${debug.isDragging}`} color="white" font={null} />
          <Text x={15} y={110} text={`Bodies: ${bodies.length} | Error: ${debug.error ?? 'none'}`} color={debug.error ? '#ff0000' : 'white'} font={null} />
          <Text x={15} y={130} text={`DEBUG: Query at ${debug.lastWorldX.toFixed(2)}, ${debug.lastWorldY.toFixed(2)} -> ${debug.hitBodyId ?? 'null'}`} color="magenta" font={null} />
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

export default function Interaction() {
  return (
    <ViewportRoot pixelsPerMeter={PIXELS_PER_METER}>
      <InteractionCanvas />
    </ViewportRoot>
  );
}
