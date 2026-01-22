import type { Vec2, BodyId } from '../types';

export type DragMode = 'force' | 'kinematic';

export interface DragState {
  active: boolean;
  bodyId: BodyId | null;
  startWorldPos: Vec2;
  currentWorldPos: Vec2;
  lastWorldPos: Vec2;
}

export interface DragConfig {
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

export interface DragController {
  getState: () => DragState;
  isActive: () => boolean;
  getDraggedBody: () => BodyId | null;
  beginDrag: (bodyId: BodyId, worldPos: Vec2) => void;
  updatePointer: (worldPos: Vec2) => void;
  endDrag: (physics?: DragPhysicsInterface) => void;
  cancelDrag: (physics?: DragPhysicsInterface) => void;
  beforePhysicsStep: (physics: DragPhysicsInterface, dt: number) => void;
  afterPhysicsStep: (physics: DragPhysicsInterface, dt: number) => void;
  applyDragStep: (physics: DragPhysicsInterface, dt: number) => void;
}

export interface DragPhysicsInterface {
  getTransform: (bodyId: BodyId) => { position: Vec2; angle: number };
  getLinearVelocity: (bodyId: BodyId) => Vec2;
  setLinearVelocity: (bodyId: BodyId, velocity: Vec2) => void;
  setTransform: (bodyId: BodyId, transform: { position: Vec2; angle: number }) => void;
  applyForceToCenter: (bodyId: BodyId, force: Vec2) => void;
}
