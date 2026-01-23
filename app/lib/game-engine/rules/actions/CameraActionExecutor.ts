import type { ActionExecutor } from './ActionExecutor';
import type { CameraShakeAction, SetTimeScaleAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { resolveNumber } from '../utils';

type CameraAction = CameraShakeAction | SetTimeScaleAction;

export class CameraActionExecutor implements ActionExecutor<CameraAction> {
  execute(action: CameraAction, context: RuleContext): void {
    switch (action.type) {
      case 'camera_shake':
        this.executeCameraShake(action, context);
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
