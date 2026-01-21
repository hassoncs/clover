import { useEffect, useRef, useState, useCallback } from 'react';
import { useFrameCallback } from 'react-native-reanimated';
import { createPhysics2D } from './createPhysics2D.web';
import type { Physics2D } from './Physics2D';
import type { Vec2, BodyId, Transform } from './types';

export interface UsePhysicsWorldOptions {
  gravity?: Vec2;
  pixelsPerMeter?: number;
  velocityIterations?: number;
  positionIterations?: number;
  maxDeltaTime?: number;
  paused?: boolean;
}

export interface PhysicsWorldState {
  physics: Physics2D | null;
  isReady: boolean;
  getBodyTransform: (id: BodyId) => Transform;
  toPixels: (meters: number) => number;
  toMeters: (pixels: number) => number;
  worldToScreen: (worldPos: Vec2) => { x: number; y: number };
  screenToWorld: (screenX: number, screenY: number) => Vec2;
}

const DEFAULT_OPTIONS: Required<UsePhysicsWorldOptions> = {
  gravity: { x: 0, y: 9.8 },
  pixelsPerMeter: 50,
  velocityIterations: 8,
  positionIterations: 3,
  maxDeltaTime: 1 / 30,
  paused: false,
};

export function usePhysicsWorld(
  options: UsePhysicsWorldOptions = {}
): PhysicsWorldState {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const physicsRef = useRef<Physics2D | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const physics = await createPhysics2D();
        if (!mounted) return;

        physics.createWorld(optsRef.current.gravity);
        physicsRef.current = physics;
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize physics:', error);
      }
    };

    init();

    return () => {
      mounted = false;
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
      setIsReady(false);
    };
  }, []);

  useFrameCallback((frameInfo) => {
    if (!physicsRef.current || !isReady || optsRef.current.paused) return;

    const dt = frameInfo.timeSincePreviousFrame
      ? frameInfo.timeSincePreviousFrame / 1000
      : 1 / 60;

    const clampedDt = Math.min(dt, optsRef.current.maxDeltaTime);
    physicsRef.current.step(
      clampedDt,
      optsRef.current.velocityIterations,
      optsRef.current.positionIterations
    );
  }, true);

  const toPixels = useCallback((meters: number) => {
    return meters * optsRef.current.pixelsPerMeter;
  }, []);

  const toMeters = useCallback((pixels: number) => {
    return pixels / optsRef.current.pixelsPerMeter;
  }, []);

  const worldToScreen = useCallback((worldPos: Vec2) => {
    return {
      x: worldPos.x * optsRef.current.pixelsPerMeter,
      y: worldPos.y * optsRef.current.pixelsPerMeter,
    };
  }, []);

  const screenToWorld = useCallback((screenX: number, screenY: number): Vec2 => {
    return {
      x: screenX / optsRef.current.pixelsPerMeter,
      y: screenY / optsRef.current.pixelsPerMeter,
    };
  }, []);

  const getBodyTransform = useCallback((id: BodyId): Transform => {
    if (!physicsRef.current) {
      return { position: { x: 0, y: 0 }, angle: 0 };
    }
    return physicsRef.current.getTransform(id);
  }, []);

  return {
    physics: physicsRef.current,
    isReady,
    getBodyTransform,
    toPixels,
    toMeters,
    worldToScreen,
    screenToWorld,
  };
}
