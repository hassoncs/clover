import type { ActionExecutor } from './ActionExecutor';
import type { SetEntitySizeAction, EntitySizeTarget } from '@slopcade/shared';
import type { RuleContext } from '../types';
import type { RuntimeEntity } from '../../types';
import { resolveNumber } from '../utils';

export class SetEntitySizeActionExecutor implements ActionExecutor<SetEntitySizeAction> {
  execute(action: SetEntitySizeAction, context: RuleContext): void {
    const entities = this.resolveTarget(action.target, context);
    
    for (const entity of entities) {
      let targetScaleX = entity.transform.scaleX;
      let targetScaleY = entity.transform.scaleY;

      if (action.scale !== undefined) {
        const scale = resolveNumber(action.scale, context);
        targetScaleX = scale;
        targetScaleY = scale;
      }

      if (action.width !== undefined) {
        const collider = entity.collider as { shape?: string; width?: number } | undefined;
        if (collider?.shape === 'box' && collider.width) {
          const newWidth = resolveNumber(action.width, context);
          targetScaleX = newWidth / collider.width;
        }
      }
      
      if (action.height !== undefined) {
        const collider = entity.collider as { shape?: string; height?: number } | undefined;
        if (collider?.shape === 'box' && collider.height) {
          const newHeight = resolveNumber(action.height, context);
          targetScaleY = newHeight / collider.height;
        }
      }

      entity.transform.scaleX = targetScaleX;
      entity.transform.scaleY = targetScaleY;
    }
  }

  private resolveTarget(target: EntitySizeTarget, context: RuleContext): RuntimeEntity[] {
    switch (target.type) {
      case 'self':
        return [];
      case 'by_id': {
        const entity = context.entityManager.getEntity(target.entityId);
        return entity ? [entity] : [];
      }
      case 'by_tag':
        return context.entityManager.getEntitiesByTag(target.tag);
      default:
        return [];
    }
  }
}
