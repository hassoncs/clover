import { useMemo, useRef, useCallback } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import type { DragController } from './dragTypes';
import type { Physics2D } from '../Physics2D';
import type { BodyId, Vec2 } from '../types';

export interface UseDragGestureOptions {
  physicsRef: React.RefObject<Physics2D | null>;
  controllerRef: React.RefObject<DragController | null>;
  pixelsPerMeter: number;
  shouldStartDrag?: (bodyId: BodyId) => boolean;
  onDragStart?: (bodyId: BodyId, worldPos: Vec2) => void;
  onDragMove?: (bodyId: BodyId, worldPos: Vec2) => void;
  onDragEnd?: (bodyId: BodyId) => void;
  onEmptyTap?: (worldPos: Vec2) => void;
}

export function useDragGesture(options: UseDragGestureOptions) {
  const {
    physicsRef,
    controllerRef,
    pixelsPerMeter,
    shouldStartDrag,
    onDragStart,
    onDragMove,
    onDragEnd,
    onEmptyTap,
  } = options;

  const callbacksRef = useRef({
    shouldStartDrag,
    onDragStart,
    onDragMove,
    onDragEnd,
    onEmptyTap,
  });
  callbacksRef.current = {
    shouldStartDrag,
    onDragStart,
    onDragMove,
    onDragEnd,
    onEmptyTap,
  };

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
        const controller = controllerRef.current;
        if (!physics || !controller) return;

        const worldPos = screenToWorld(event.x, event.y);
        const bodyId = physics.queryPoint(worldPos);

        if (bodyId) {
          const callbacks = callbacksRef.current;
          if (callbacks.shouldStartDrag && !callbacks.shouldStartDrag(bodyId)) {
            return;
          }

          controller.beginDrag(bodyId, worldPos);
          callbacks.onDragStart?.(bodyId, worldPos);
        } else {
          callbacksRef.current.onEmptyTap?.(worldPos);
        }
      })
      .onUpdate((event) => {
        const controller = controllerRef.current;
        if (!controller || !controller.isActive()) return;

        const worldPos = screenToWorld(event.x, event.y);
        controller.updatePointer(worldPos);

        const bodyId = controller.getDraggedBody();
        if (bodyId) {
          callbacksRef.current.onDragMove?.(bodyId, worldPos);
        }
      })
      .onEnd(() => {
        const controller = controllerRef.current;
        if (!controller) return;

        const bodyId = controller.getDraggedBody();
        if (bodyId) {
          callbacksRef.current.onDragEnd?.(bodyId);
        }
        controller.endDrag();
      })
      .onFinalize(() => {
        const controller = controllerRef.current;
        if (controller?.isActive()) {
          controller.cancelDrag();
        }
      });
  }, [physicsRef, controllerRef, screenToWorld]);

  return gesture;
}
