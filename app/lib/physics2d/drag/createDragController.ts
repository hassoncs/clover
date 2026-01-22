import type {
  DragMode,
  DragState,
  DragController,
  DragPhysicsInterface,
} from './dragTypes';
import type { BodyId, Vec2 } from '../types';

const DEFAULT_STIFFNESS = 50;
const DEFAULT_DAMPING = 5;

export interface CreateDragControllerOptions {
  mode: DragMode;
  stiffness?: number;
  damping?: number;
}

function createInitialState(): DragState {
  return {
    active: false,
    bodyId: null,
    startWorldPos: { x: 0, y: 0 },
    currentWorldPos: { x: 0, y: 0 },
    lastWorldPos: { x: 0, y: 0 },
  };
}

export function createDragController(options: CreateDragControllerOptions): DragController {
  const { mode, stiffness = DEFAULT_STIFFNESS, damping = DEFAULT_DAMPING } = options;
  
  let state: DragState = createInitialState();

  function getState(): DragState {
    return { ...state };
  }

  function isActive(): boolean {
    return state.active;
  }

  function getDraggedBody(): BodyId | null {
    return state.bodyId;
  }

  function beginDrag(bodyId: BodyId, worldPos: Vec2): void {
    state = {
      active: true,
      bodyId,
      startWorldPos: { x: worldPos.x, y: worldPos.y },
      currentWorldPos: { x: worldPos.x, y: worldPos.y },
      lastWorldPos: { x: worldPos.x, y: worldPos.y },
    };
  }

  function updatePointer(worldPos: Vec2): void {
    if (!state.active) return;
    state.lastWorldPos = { ...state.currentWorldPos };
    state.currentWorldPos = { x: worldPos.x, y: worldPos.y };
  }

  function endDrag(): void {
    state = createInitialState();
  }

  function cancelDrag(): void {
    state = createInitialState();
  }

  function applyForceDrag(physics: DragPhysicsInterface, bodyId: BodyId): void {
    const bodyTransform = physics.getTransform(bodyId);
    const bodyPos = bodyTransform.position;

    const dx = state.currentWorldPos.x - bodyPos.x;
    const dy = state.currentWorldPos.y - bodyPos.y;

    const velocity = physics.getLinearVelocity(bodyId);

    const forceX = dx * stiffness - velocity.x * damping;
    const forceY = dy * stiffness - velocity.y * damping;

    physics.applyForceToCenter(bodyId, { x: forceX, y: forceY });
  }

  function applyKinematicDrag(physics: DragPhysicsInterface, bodyId: BodyId, _dt: number): void {
    const bodyTransform = physics.getTransform(bodyId);
    
    physics.setLinearVelocity(bodyId, { x: 0, y: 0 });
    physics.setTransform(bodyId, {
      position: { x: state.currentWorldPos.x, y: state.currentWorldPos.y },
      angle: bodyTransform.angle,
    });
  }

  function applyDragStep(physics: DragPhysicsInterface, dt: number): void {
    if (!state.active || !state.bodyId) return;

    if (mode === 'force') {
      applyForceDrag(physics, state.bodyId);
    } else {
      applyKinematicDrag(physics, state.bodyId, dt);
    }
  }

  return {
    getState,
    isActive,
    getDraggedBody,
    beginDrag,
    updatePointer,
    endDrag,
    cancelDrag,
    applyDragStep,
  };
}
