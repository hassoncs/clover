import { useCallback, useEffect, useRef } from 'react';
import { useFrameCallback, runOnJS } from 'react-native-reanimated';

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
 * This hook uses Reanimated's useFrameCallback for precise timing on the UI thread,
 * but executes the actual physics step on the JS thread where Box2D JSI objects live.
 * 
 * This pattern gives you:
 * - Vsync-aligned timing (smooth 60fps)
 * - Proper access to Box2D JSI objects (which can't run in worklets)
 * - Delta time calculation with max clamping
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
  
  const startTimeRef = useRef<number | null>(null);
  const callbackRef = useRef(onStep);
  callbackRef.current = onStep;

  const stepPhysics = useCallback((
    timestamp: number,
    timeSincePreviousFrame: number | null,
    timeSinceFirstFrame: number
  ) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = timestamp;
    }

    const rawDt = timeSincePreviousFrame !== null 
      ? timeSincePreviousFrame / 1000 
      : 1 / 60;
    
    const deltaTime = Math.min(rawDt, maxDeltaTime);
    const totalTime = timeSinceFirstFrame / 1000;

    callbackRef.current({
      deltaTime,
      totalTime,
      timestamp,
    });
  }, [maxDeltaTime]);

  const frameCallback = useFrameCallback((frameInfo) => {
    'worklet';
    runOnJS(stepPhysics)(
      frameInfo.timestamp,
      frameInfo.timeSincePreviousFrame,
      frameInfo.timeSinceFirstFrame
    );
  }, false);

  useEffect(() => {
    frameCallback.setActive(active);
  }, [active, frameCallback]);
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

  const stepPhysics = useCallback((timeSincePreviousFrame: number | null) => {
    const rawDt = timeSincePreviousFrame !== null 
      ? timeSincePreviousFrame / 1000 
      : 1 / 60;
    
    const deltaTime = Math.min(rawDt, maxDeltaTime);
    callbackRef.current(deltaTime);
  }, [maxDeltaTime]);

  const frameCallback = useFrameCallback((frameInfo) => {
    'worklet';
    runOnJS(stepPhysics)(frameInfo.timeSincePreviousFrame);
  }, false);

  useEffect(() => {
    console.log('[useSimplePhysicsLoop] Setting active:', active);
    frameCallback.setActive(active);
    return () => {
      console.log('[useSimplePhysicsLoop] Cleanup, deactivating');
      frameCallback.setActive(false);
    };
  }, [active, frameCallback]);
}

/**
 * A JS-only physics loop using requestAnimationFrame.
 * 
 * This avoids the overhead of UI thread -> JS thread crossing via runOnJS.
 * The trade-off is slightly less precise vsync alignment, but for physics
 * simulation this is usually acceptable and the reduced thread-crossing
 * overhead significantly improves battery life.
 * 
 * @example
 * ```tsx
 * useJSPhysicsLoop((dt) => {
 *   world.Step(dt, 8, 3);
 * }, isReady);
 * ```
 */
export function useJSPhysicsLoop(
  onStep: (deltaTime: number) => void,
  active: boolean = true,
  maxDeltaTime: number = 1 / 30
) {
  const callbackRef = useRef(onStep);
  const lastTimeRef = useRef<number | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const activeRef = useRef(active);
  
  callbackRef.current = onStep;
  activeRef.current = active;

  useEffect(() => {
    if (!active) {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const loop = (time: number) => {
      if (!activeRef.current) {
        frameIdRef.current = null;
        return;
      }

      const lastTime = lastTimeRef.current;
      lastTimeRef.current = time;

      if (lastTime !== null) {
        const rawDt = (time - lastTime) / 1000;
        const deltaTime = Math.min(rawDt, maxDeltaTime);
        
        if (deltaTime > 0) {
          callbackRef.current(deltaTime);
        }
      }

      frameIdRef.current = requestAnimationFrame(loop);
    };

    frameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [active, maxDeltaTime]);
}
