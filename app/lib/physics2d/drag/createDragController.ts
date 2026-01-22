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
  let afterStepCalledThisFrame = false;
  let framesWithoutAfterStep = 0;

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
    framesWithoutAfterStep = 0;
  }

  function updatePointer(worldPos: Vec2): void {
    if (!state.active) return;
    state.lastWorldPos = { ...state.currentWorldPos };
    state.currentWorldPos = { x: worldPos.x, y: worldPos.y };
  }

  function endDrag(physics?: DragPhysicsInterface): void {
    if (mode === 'kinematic' && state.bodyId && physics) {
      physics.setLinearVelocity(state.bodyId, { x: 0, y: 0 });
    }
    state = createInitialState();
  }

  function cancelDrag(physics?: DragPhysicsInterface): void {
    if (mode === 'kinematic' && state.bodyId && physics) {
      physics.setLinearVelocity(state.bodyId, { x: 0, y: 0 });
    }
    state = createInitialState();
  }

  function beforePhysicsStep(physics: DragPhysicsInterface, _dt: number): void {
    if (!state.active || !state.bodyId) return;

    if (mode === 'force') {
      const bodyTransform = physics.getTransform(state.bodyId);
      const bodyPos = bodyTransform.position;

      const dx = state.currentWorldPos.x - bodyPos.x;
      const dy = state.currentWorldPos.y - bodyPos.y;

      const velocity = physics.getLinearVelocity(state.bodyId);

      const forceX = dx * stiffness - velocity.x * damping;
      const forceY = dy * stiffness - velocity.y * damping;

      physics.applyForceToCenter(state.bodyId, { x: forceX, y: forceY });
    }

    afterStepCalledThisFrame = false;
  }

  function afterPhysicsStep(physics: DragPhysicsInterface, _dt: number): void {
    afterStepCalledThisFrame = true;
    framesWithoutAfterStep = 0;

    if (!state.active || !state.bodyId) return;

    if (mode === 'kinematic') {
      const bodyTransform = physics.getTransform(state.bodyId);
      physics.setLinearVelocity(state.bodyId, { x: 0, y: 0 });
      physics.setTransform(state.bodyId, {
        position: { x: state.currentWorldPos.x, y: state.currentWorldPos.y },
        angle: bodyTransform.angle,
      });
    }
  }

  function applyDragStep(physics: DragPhysicsInterface, dt: number): void {
    if (mode === 'kinematic') {
      framesWithoutAfterStep++;
      if (__DEV__ && framesWithoutAfterStep > 5 && state.active) {
        console.warn(
          '[DragController] Kinematic drag is active but afterPhysicsStep() is not being called. ' +
          'For kinematic mode, use beforePhysicsStep() + afterPhysicsStep() around physics.step(), ' +
          'or use the stepWithDrag() helper.'
        );
      }
      afterPhysicsStep(physics, dt);
    } else {
      beforePhysicsStep(physics, dt);
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
    beforePhysicsStep,
    afterPhysicsStep,
    applyDragStep,
  };
}
