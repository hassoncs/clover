import { useRef, useCallback, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { usePhysicsWorld } from './usePhysicsWorld.web';
import { useForceDrag } from './useForceDrag';
import { useKinematicDrag } from './useKinematicDrag';
import { useBodyTransformsWithData, type ExtendedTransformState, type BodyRecord } from './transforms';
import type { Physics2D } from './Physics2D';
import type { BodyId, Vec2 } from './types';

export type DragType = 'force' | 'kinematic' | 'none';

export interface UsePhysicsExampleOptions<T = Record<string, unknown>> {
  pixelsPerMeter: number;
  gravity?: Vec2;
  enabled?: boolean;
  drag?: DragType;
  dragStiffness?: number;
  dragDamping?: number;
  shouldStartDrag?: (bodyId: BodyId) => boolean;
  onInit?: (physics: Physics2D) => BodyRecord<T>[] | Promise<BodyRecord<T>[]>;
  beforeStep?: (dt: number, physics: Physics2D) => void;
  afterStep?: (dt: number, physics: Physics2D) => void;
  onDragStart?: (bodyId: BodyId, worldPos: Vec2) => void;
  onDragEnd?: (bodyId: BodyId) => void;
  onEmptyTap?: (worldPos: Vec2) => void;
}

export interface UsePhysicsExampleResult<T = Record<string, unknown>> {
  physics: Physics2D | null;
  physicsRef: React.RefObject<Physics2D | null>;
  isReady: boolean;
  transforms: ExtendedTransformState<T>[];
  gesture: ReturnType<typeof Gesture.Pan>;
  isDragging: () => boolean;
  getDraggedBody: () => BodyId | null;
  addBody: (id: BodyId, data: T) => void;
  removeBody: (id: BodyId) => void;
  toPixels: (meters: number) => number;
  toMeters: (pixels: number) => number;
}

export function usePhysicsExample<T = Record<string, unknown>>(
  options: UsePhysicsExampleOptions<T>
): UsePhysicsExampleResult<T> {
  const {
    pixelsPerMeter,
    gravity = { x: 0, y: 9.8 },
    enabled = true,
    drag = 'force',
    dragStiffness = 50,
    dragDamping = 5,
    shouldStartDrag,
    onInit,
    beforeStep,
    afterStep,
    onDragStart,
    onDragEnd,
    onEmptyTap,
  } = options;

  const callbacksRef = useRef({
    onInit,
    beforeStep,
    afterStep,
  });
  callbacksRef.current = { onInit, beforeStep, afterStep };

  const {
    transforms,
    sync,
    setBodies,
    addBody,
    removeBody,
  } = useBodyTransformsWithData<T>({ pixelsPerMeter });

  const handleBeforeStep = useCallback((dt: number, physics: Physics2D) => {
    callbacksRef.current.beforeStep?.(dt, physics);
  }, []);

  const handleAfterStep = useCallback((dt: number, physics: Physics2D) => {
    callbacksRef.current.afterStep?.(dt, physics);
    sync(physics);
  }, [sync]);

  const handleInit = useCallback(async (physics: Physics2D) => {
    if (callbacksRef.current.onInit) {
      const bodies = await callbacksRef.current.onInit(physics);
      setBodies(bodies);
    }
  }, [setBodies]);

  const { physics, physicsRef, isReady, toPixels, toMeters } = usePhysicsWorld({
    gravity,
    pixelsPerMeter,
    enabled,
    onInit: handleInit,
    beforeStep: handleBeforeStep,
    afterStep: handleAfterStep,
  });

  const forceDrag = useForceDrag(physicsRef, {
    pixelsPerMeter,
    stiffness: dragStiffness,
    damping: dragDamping,
    shouldStartDrag,
    onDragStart,
    onDragEnd,
    onEmptyTap,
  });

  const kinematicDrag = useKinematicDrag(physicsRef, {
    pixelsPerMeter,
    shouldStartDrag,
    onDragStart,
    onDragEnd,
    onEmptyTap,
  });

  const activeDrag = drag === 'kinematic' ? kinematicDrag : forceDrag;

  const noDragGesture = useMemo(() => {
    return Gesture.Pan().enabled(false);
  }, []);

  const gesture = drag === 'none' ? noDragGesture : activeDrag.gesture;

  const isDragging = useCallback(() => {
    if (drag === 'none') return false;
    return activeDrag.isDragging();
  }, [drag, activeDrag]);

  const getDraggedBody = useCallback(() => {
    if (drag === 'none') return null;
    return activeDrag.getDraggedBody();
  }, [drag, activeDrag]);

  return {
    physics,
    physicsRef,
    isReady,
    transforms,
    gesture,
    isDragging,
    getDraggedBody,
    addBody,
    removeBody,
    toPixels,
    toMeters,
  };
}
