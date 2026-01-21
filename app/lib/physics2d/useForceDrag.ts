import { useCallback, useRef } from 'react';
import type { GestureResponderEvent } from 'react-native';
import type { Physics2D } from './Physics2D';
import type { BodyId, Vec2 } from './types';

export interface ForceDragOptions {
  pixelsPerMeter: number;
  stiffness?: number;
  damping?: number;
  onDragStart?: (bodyId: BodyId, worldPoint: Vec2) => void;
  onDragMove?: (bodyId: BodyId, worldPoint: Vec2) => void;
  onDragEnd?: (bodyId: BodyId) => void;
  onEmptyTap?: (worldPoint: Vec2) => void;
}

export interface ForceDragState {
  bodyId: BodyId;
  targetWorldX: number;
  targetWorldY: number;
}

export interface ForceDragHandlers {
  onTouchStart: (event: GestureResponderEvent) => void;
  onTouchMove: (event: GestureResponderEvent) => void;
  onTouchEnd: (event: GestureResponderEvent) => void;
  applyDragForces: () => void;
  isDragging: () => boolean;
  getDraggedBody: () => BodyId | null;
  getDragState: () => ForceDragState | null;
}

export function useForceDrag(
  physicsRef: React.RefObject<Physics2D | null>,
  options: ForceDragOptions
): ForceDragHandlers {
  const {
    pixelsPerMeter,
    stiffness = 50,
    damping = 5,
    onDragStart,
    onDragMove,
    onDragEnd,
    onEmptyTap,
  } = options;

  const dragStateRef = useRef<ForceDragState | null>(null);

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
    
    if (bodyId) {
      dragStateRef.current = {
        bodyId,
        targetWorldX: worldPoint.x,
        targetWorldY: worldPoint.y,
      };
      onDragStart?.(bodyId, worldPoint);
    } else {
      onEmptyTap?.(worldPoint);
    }
  }, [physicsRef, screenToWorld, onDragStart, onEmptyTap]);

  const onTouchMove = useCallback((event: GestureResponderEvent) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    const { locationX, locationY } = event.nativeEvent;
    const worldPoint = screenToWorld(locationX, locationY);

    dragState.targetWorldX = worldPoint.x;
    dragState.targetWorldY = worldPoint.y;
    
    onDragMove?.(dragState.bodyId, worldPoint);
  }, [screenToWorld, onDragMove]);

  const onTouchEnd = useCallback((_event: GestureResponderEvent) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    const bodyId = dragState.bodyId;
    dragStateRef.current = null;
    onDragEnd?.(bodyId);
  }, [onDragEnd]);

  const applyDragForces = useCallback(() => {
    const physics = physicsRef.current;
    const dragState = dragStateRef.current;
    if (!physics || !dragState) return;

    const bodyTransform = physics.getTransform(dragState.bodyId);
    const bodyPos = bodyTransform.position;

    const dx = dragState.targetWorldX - bodyPos.x;
    const dy = dragState.targetWorldY - bodyPos.y;

    const velocity = physics.getLinearVelocity(dragState.bodyId);

    const forceX = dx * stiffness - velocity.x * damping;
    const forceY = dy * stiffness - velocity.y * damping;

    physics.applyForceToCenter(dragState.bodyId, { x: forceX, y: forceY });
  }, [physicsRef, stiffness, damping]);

  const isDragging = useCallback(() => {
    return dragStateRef.current !== null;
  }, []);

  const getDraggedBody = useCallback(() => {
    return dragStateRef.current?.bodyId ?? null;
  }, []);

  const getDragState = useCallback(() => {
    return dragStateRef.current;
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    applyDragForces,
    isDragging,
    getDraggedBody,
    getDragState,
  };
}
