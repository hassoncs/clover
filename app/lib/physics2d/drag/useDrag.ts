import { useRef, useCallback, useMemo } from 'react';
import { createDragController } from './createDragController';
import { useDragGesture } from './useDragGesture';
import type { DragMode, DragController } from './dragTypes';
import type { Physics2D } from '../Physics2D';
import type { BodyId, Vec2 } from '../types';

export interface UseDragOptions {
  mode: DragMode;
  pixelsPerMeter: number;
  stiffness?: number;
  damping?: number;
  shouldStartDrag?: (bodyId: BodyId) => boolean;
  onDragStart?: (bodyId: BodyId, worldPos: Vec2) => void;
  onDragMove?: (bodyId: BodyId, worldPos: Vec2) => void;
  onDragEnd?: (bodyId: BodyId) => void;
  onEmptyTap?: (worldPos: Vec2) => void;
}

export interface UseDragResult {
  gesture: ReturnType<typeof useDragGesture>;
  beforePhysicsStep: (dt: number) => void;
  afterPhysicsStep: (dt: number) => void;
  applyDragStep: (dt: number) => void;
  stepWithDrag: (dt: number, physicsStep: (dt: number) => void) => void;
  isDragging: () => boolean;
  getDraggedBody: () => BodyId | null;
  getController: () => DragController;
}

export function useDrag(
  physicsRef: React.RefObject<Physics2D | null>,
  options: UseDragOptions
): UseDragResult {
  const {
    mode,
    pixelsPerMeter,
    stiffness,
    damping,
    shouldStartDrag,
    onDragStart,
    onDragMove,
    onDragEnd,
    onEmptyTap,
  } = options;

  const controllerRef = useRef<DragController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = createDragController({
      mode,
      stiffness,
      damping,
    });
  }

  const gesture = useDragGesture({
    physicsRef,
    controllerRef,
    pixelsPerMeter,
    shouldStartDrag,
    onDragStart,
    onDragMove,
    onDragEnd,
    onEmptyTap,
  });

  const beforePhysicsStep = useCallback((dt: number) => {
    const physics = physicsRef.current;
    const controller = controllerRef.current;
    if (!physics || !controller) return;
    controller.beforePhysicsStep(physics, dt);
  }, [physicsRef]);

  const afterPhysicsStep = useCallback((dt: number) => {
    const physics = physicsRef.current;
    const controller = controllerRef.current;
    if (!physics || !controller) return;
    controller.afterPhysicsStep(physics, dt);
  }, [physicsRef]);

  const applyDragStep = useCallback((dt: number) => {
    const physics = physicsRef.current;
    const controller = controllerRef.current;
    if (!physics || !controller) return;
    controller.applyDragStep(physics, dt);
  }, [physicsRef]);

  const stepWithDrag = useCallback((dt: number, physicsStep: (dt: number) => void) => {
    const physics = physicsRef.current;
    const controller = controllerRef.current;
    if (!physics || !controller) {
      physicsStep(dt);
      return;
    }
    controller.beforePhysicsStep(physics, dt);
    physicsStep(dt);
    controller.afterPhysicsStep(physics, dt);
  }, [physicsRef]);

  const isDragging = useCallback(() => {
    return controllerRef.current?.isActive() ?? false;
  }, []);

  const getDraggedBody = useCallback(() => {
    return controllerRef.current?.getDraggedBody() ?? null;
  }, []);

  const getController = useCallback(() => {
    return controllerRef.current!;
  }, []);

  return useMemo(() => ({
    gesture,
    beforePhysicsStep,
    afterPhysicsStep,
    applyDragStep,
    stepWithDrag,
    isDragging,
    getDraggedBody,
    getController,
  }), [gesture, beforePhysicsStep, afterPhysicsStep, applyDragStep, stepWithDrag, isDragging, getDraggedBody, getController]);
}
