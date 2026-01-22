import { useCallback, useRef, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
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
  shouldStartDrag?: (bodyId: BodyId) => boolean;
}

export interface ForceDragState {
  bodyId: BodyId;
  targetWorldX: number;
  targetWorldY: number;
}

export interface ForceDragHandlers {
  gesture: ReturnType<typeof Gesture.Pan>;
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
    shouldStartDrag,
  } = options;

  const dragStateRef = useRef<ForceDragState | null>(null);

  const screenToWorld = useCallback((screenX: number, screenY: number): Vec2 => {
    return {
      x: screenX / pixelsPerMeter,
      y: screenY / pixelsPerMeter,
    };
  }, [pixelsPerMeter]);

  const gesture = useMemo(() => {
    return Gesture.Pan()
      .runOnJS(true)
      .onStart((event) => {
        const physics = physicsRef.current;
        if (!physics) return;

        const worldPoint = screenToWorld(event.x, event.y);
        const bodyId = physics.queryPoint(worldPoint);
        
        if (bodyId) {
          if (shouldStartDrag && !shouldStartDrag(bodyId)) {
            return;
          }

          dragStateRef.current = {
            bodyId,
            targetWorldX: worldPoint.x,
            targetWorldY: worldPoint.y,
          };
          onDragStart?.(bodyId, worldPoint);
        } else {
          onEmptyTap?.(worldPoint);
        }
      })
      .onUpdate((event) => {
        const dragState = dragStateRef.current;
        if (!dragState) return;

        const worldPoint = screenToWorld(event.x, event.y);
        dragState.targetWorldX = worldPoint.x;
        dragState.targetWorldY = worldPoint.y;
        
        onDragMove?.(dragState.bodyId, worldPoint);
      })
      .onEnd(() => {
        const dragState = dragStateRef.current;
        if (!dragState) return;

        const bodyId = dragState.bodyId;
        dragStateRef.current = null;
        onDragEnd?.(bodyId);
      })
      .onFinalize(() => {
        // Ensure cleanup happens even if cancelled
        if (dragStateRef.current) {
          dragStateRef.current = null;
        }
      });
  }, [physicsRef, screenToWorld, onDragStart, onDragMove, onDragEnd, onEmptyTap, shouldStartDrag]);

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
    gesture,
    applyDragForces,
    isDragging,
    getDraggedBody,
    getDragState,
  };
}
