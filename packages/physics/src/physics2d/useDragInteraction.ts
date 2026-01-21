import { useCallback, useRef } from 'react';
import type { GestureResponderEvent } from 'react-native';
import type { Physics2D } from './Physics2D';
import type { BodyId, JointId, Vec2 } from './types';

export interface DragInteractionOptions {
  pixelsPerMeter: number;
  maxForce?: number;
  stiffness?: number;
  damping?: number;
  onDragStart?: (bodyId: BodyId, worldPoint: Vec2) => void;
  onDragMove?: (bodyId: BodyId, worldPoint: Vec2) => void;
  onDragEnd?: (bodyId: BodyId) => void;
}

export interface DragInteractionHandlers {
  onTouchStart: (event: GestureResponderEvent) => void;
  onTouchMove: (event: GestureResponderEvent) => void;
  onTouchEnd: (event: GestureResponderEvent) => void;
  isDragging: () => boolean;
  getDraggedBody: () => BodyId | null;
}

interface DragState {
  bodyId: BodyId;
  jointId: JointId;
}

export function useDragInteraction(
  physicsRef: React.RefObject<Physics2D | null>,
  options: DragInteractionOptions
): DragInteractionHandlers {
  const {
    pixelsPerMeter,
    maxForce = 10000,
    stiffness = 5,
    damping = 0.7,
    onDragStart,
    onDragMove,
    onDragEnd,
  } = options;

  const dragStateRef = useRef<DragState | null>(null);

  const screenToWorld = useCallback((screenX: number, screenY: number): Vec2 => {
    return {
      x: screenX / pixelsPerMeter,
      y: screenY / pixelsPerMeter,
    };
  }, [pixelsPerMeter]);

  const onTouchStart = useCallback((event: GestureResponderEvent) => {
    const physics = physicsRef.current;
    if (!physics) return;

    const { locationX, locationY } = event.nativeEvent;
    const worldPoint = screenToWorld(locationX, locationY);

    const bodyId = physics.queryPoint(worldPoint);
    if (!bodyId) return;

    try {
      const jointId = physics.createMouseJoint({
        type: 'mouse',
        body: bodyId,
        target: worldPoint,
        maxForce,
        stiffness,
        damping,
      });

      dragStateRef.current = { bodyId, jointId };
      onDragStart?.(bodyId, worldPoint);
    } catch (error) {
      console.warn('Failed to create mouse joint:', error);
    }
  }, [physicsRef, screenToWorld, maxForce, stiffness, damping, onDragStart]);

  const onTouchMove = useCallback((event: GestureResponderEvent) => {
    const physics = physicsRef.current;
    const dragState = dragStateRef.current;
    if (!physics || !dragState) return;

    const { locationX, locationY } = event.nativeEvent;
    const worldPoint = screenToWorld(locationX, locationY);

    physics.setMouseTarget(dragState.jointId, worldPoint);
    onDragMove?.(dragState.bodyId, worldPoint);
  }, [physicsRef, screenToWorld, onDragMove]);

  const onTouchEnd = useCallback((_event: GestureResponderEvent) => {
    const physics = physicsRef.current;
    const dragState = dragStateRef.current;
    if (!physics || !dragState) return;

    try {
      physics.destroyJoint(dragState.jointId);
    } catch (error) {
      console.warn('Failed to destroy mouse joint:', error);
    }

    const bodyId = dragState.bodyId;
    dragStateRef.current = null;
    onDragEnd?.(bodyId);
  }, [physicsRef, onDragEnd]);

  const isDragging = useCallback(() => {
    return dragStateRef.current !== null;
  }, []);

  const getDraggedBody = useCallback(() => {
    return dragStateRef.current?.bodyId ?? null;
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isDragging,
    getDraggedBody,
  };
}
