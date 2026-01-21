import { useCallback, useEffect, useRef } from 'react';

export interface PhysicsLoopOptions {
  /** Whether the loop should be active. Default: true */
  active?: boolean;
  /** Maximum delta time in seconds to prevent spiral of death. Default: 1/30 */
  maxDeltaTime?: number;
}

export interface FrameInfo {
  /** Time since last frame in seconds */
  deltaTime: number;
  /** Total time since loop started in seconds */
  totalTime: number;
  /** Raw timestamp in milliseconds */
  timestamp: number;
}

type PhysicsStepCallback = (frameInfo: FrameInfo) => void;

/**
 * A hook that provides vsync-aligned frame callbacks for physics simulation.
 * 
 * Web version uses requestAnimationFrame for timing.
 * 
 * @example
 * ```tsx
 * usePhysicsLoop((frameInfo) => {
 *   world.Step(frameInfo.deltaTime, 8, 3);
 *   // Update your state here
 * }, { active: isReady });
 * ```
 */
export function usePhysicsLoop(
  onStep: PhysicsStepCallback,
  options: PhysicsLoopOptions = {}
) {
  const { active = true, maxDeltaTime = 1 / 30 } = options;
  
  const callbackRef = useRef(onStep);
  callbackRef.current = onStep;
  
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      lastTimeRef.current = null;
      startTimeRef.current = null;
      return;
    }

    const loop = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const timeSincePreviousFrame = lastTimeRef.current !== null 
        ? timestamp - lastTimeRef.current 
        : null;
      
      lastTimeRef.current = timestamp;
      
      const rawDt = timeSincePreviousFrame !== null 
        ? timeSincePreviousFrame / 1000 
        : 1 / 60;
      
      const deltaTime = Math.min(rawDt, maxDeltaTime);
      const totalTime = (timestamp - startTimeRef.current) / 1000;

      callbackRef.current({
        deltaTime,
        totalTime,
        timestamp,
      });

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [active, maxDeltaTime]);
}

/**
 * A simpler version that just provides delta time without the full FrameInfo.
 * 
 * @example
 * ```tsx
 * useSimplePhysicsLoop((dt) => {
 *   world.Step(dt, 8, 3);
 * }, isReady);
 * ```
 */
export function useSimplePhysicsLoop(
  onStep: (deltaTime: number) => void,
  active: boolean = true,
  maxDeltaTime: number = 1 / 30
) {
  const callbackRef = useRef(onStep);
  callbackRef.current = onStep;
  
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const loop = (timestamp: number) => {
      const timeSincePreviousFrame = lastTimeRef.current !== null 
        ? timestamp - lastTimeRef.current 
        : null;
      
      lastTimeRef.current = timestamp;
      
      const rawDt = timeSincePreviousFrame !== null 
        ? timeSincePreviousFrame / 1000 
        : 1 / 60;
      
      const deltaTime = Math.min(rawDt, maxDeltaTime);
      callbackRef.current(deltaTime);

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [active, maxDeltaTime]);
}
