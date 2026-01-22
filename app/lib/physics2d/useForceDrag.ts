import { useMemo, useCallback } from 'react';
import { useDrag, type UseDragResult } from './drag/useDrag';
import type { Physics2D } from './Physics2D';
import type { BodyId, Vec2 } from './types';

export interface UseForceDragOptions {
  pixelsPerMeter: number;
  stiffness?: number;
  damping?: number;
  shouldStartDrag?: (bodyId: BodyId) => boolean;
  onDragStart?: (bodyId: BodyId, worldPos: Vec2) => void;
  onDragMove?: (bodyId: BodyId, worldPos: Vec2) => void;
  onDragEnd?: (bodyId: BodyId) => void;
  onEmptyTap?: (worldPos: Vec2) => void;
}

export interface ForceDragState {
  bodyId: BodyId;
  targetWorldX: number;
  targetWorldY: number;
}

export interface UseForceDragResult extends UseDragResult {
  /** @deprecated Use beforePhysicsStep(dt) instead */
  applyDragForces: () => void;
  /** @deprecated Use getController().getState() instead */
  getDragState: () => ForceDragState | null;
}

export function useForceDrag(
  physicsRef: React.RefObject<Physics2D | null>,
  options: UseForceDragOptions
): UseForceDragResult {
  const result = useDrag(physicsRef, {
    mode: 'force',
    ...options,
  });

  const getDragState = useCallback((): ForceDragState | null => {
    const state = result.getController().getState();
    if (!state.active || !state.bodyId) return null;
    return {
      bodyId: state.bodyId,
      targetWorldX: state.currentWorldPos.x,
      targetWorldY: state.currentWorldPos.y,
    };
  }, [result]);

  return useMemo(() => ({
    ...result,
    applyDragForces: () => result.beforePhysicsStep(0),
    getDragState,
  }), [result, getDragState]);
}
