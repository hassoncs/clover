import type { ActionExecutor } from './ActionExecutor';
import type { CameraShakeAction, CameraZoomAction, SetTimeScaleAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { resolveNumber } from '../utils';

type CameraAction = CameraShakeAction | CameraZoomAction | SetTimeScaleAction;

export class CameraActionExecutor implements ActionExecutor<CameraAction> {
  execute(action: CameraAction, context: RuleContext): void {
    switch (action.type) {
      case 'camera_shake':
        this.executeCameraShake(action, context);
        break;
      case 'camera_zoom':
        this.executeCameraZoom(action, context);
        break;
      case 'set_time_scale':
        this.executeSetTimeScale(action, context);
        break;
    }
  }

  private executeCameraShake(action: CameraShakeAction, context: RuleContext): void {
    if (!context.camera) {
      console.warn('[CameraActionExecutor] No camera in context, cannot shake');
      return;
    }

    const intensity = resolveNumber(action.intensity, context);
    const duration = resolveNumber(action.duration, context);

    context.camera.shake(intensity, duration);
  }

  private executeCameraZoom(action: CameraZoomAction, context: RuleContext): void {
    if (!context.camera) {
      console.warn('[CameraActionExecutor] No camera in context, cannot zoom');
      return;
    }

    const scale = resolveNumber(action.scale, context);
    const duration = resolveNumber(action.duration, context);
    const restoreDelay = action.restoreDelay ? resolveNumber(action.restoreDelay, context) : undefined;

    let focusWorld: { x: number; y: number } | undefined;
    if (action.focusTag) {
      const entities = context.entityManager.getEntitiesByTag(action.focusTag);
      if (entities.length > 0) {
        focusWorld = { x: entities[0].transform.x, y: entities[0].transform.y };
      }
    }

    console.log('[CameraActionExecutor] Executing camera_zoom:', scale, duration, 'focus:', focusWorld);
    context.camera.zoomEffect(scale, duration, restoreDelay, focusWorld);
  }

  private executeSetTimeScale(action: SetTimeScaleAction, context: RuleContext): void {
    if (!context.setTimeScale) {
      console.warn('[CameraActionExecutor] No setTimeScale in context');
      return;
    }

    const scale = resolveNumber(action.scale, context);
    const duration = action.duration ? resolveNumber(action.duration, context) : undefined;

    context.setTimeScale(scale, duration);
  }
}
