import type { ActionExecutor } from './ActionExecutor';
import type { SetEntitySizeAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { resolveEntityTarget, resolveNumber } from '../utils';

export class SetEntitySizeActionExecutor implements ActionExecutor<SetEntitySizeAction> {
  execute(action: SetEntitySizeAction, context: RuleContext): void {
    const entities = resolveEntityTarget(action.target, context);
    
    for (const entity of entities) {
      let targetScaleX = entity.transform.scaleX;
      let targetScaleY = entity.transform.scaleY;

      if (action.scale !== undefined) {
        const scale = resolveNumber(action.scale, context);
        targetScaleX = scale;
        targetScaleY = scale;
      }

      if (action.scaleX !== undefined) {
        targetScaleX = resolveNumber(action.scaleX, context);
      }
      
      if (action.scaleY !== undefined) {
        targetScaleY = resolveNumber(action.scaleY, context);
      }

      entity.transform.scaleX = targetScaleX;
      entity.transform.scaleY = targetScaleY;
    }
  }
}
