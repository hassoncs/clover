import { useDrag, type UseDragResult } from './drag/useDrag';
import type { Physics2D } from './Physics2D';
import type { BodyId, Vec2 } from './types';

export interface UseKinematicDragOptions {
  pixelsPerMeter: number;
  shouldStartDrag?: (bodyId: BodyId) => boolean;
  onDragStart?: (bodyId: BodyId, worldPos: Vec2) => void;
  onDragMove?: (bodyId: BodyId, worldPos: Vec2) => void;
  onDragEnd?: (bodyId: BodyId) => void;
  onEmptyTap?: (worldPos: Vec2) => void;
}

export function useKinematicDrag(
  physicsRef: React.RefObject<Physics2D | null>,
  options: UseKinematicDragOptions
): UseDragResult {
  return useDrag(physicsRef, {
    mode: 'kinematic',
    ...options,
  });
}
