import type { ActionExecutor } from './ActionExecutor';
import type { DestroyAction } from '@slopcade/shared';
import type { RuleContext } from '../types';

export class DestroyActionExecutor implements ActionExecutor<DestroyAction> {
  execute(action: DestroyAction, context: RuleContext): void {
    switch (action.target.type) {
      case 'by_id':
        context.entityManager.destroyEntity(action.target.entityId);
        break;

      case 'by_tag': {
        const entities = context.entityManager.getEntitiesByTag(action.target.tag);
        const count = action.target.count ?? entities.length;
        for (let i = 0; i < Math.min(count, entities.length); i++) {
          context.entityManager.destroyEntity(entities[i].id);
        }
        break;
      }

      case 'collision_entities':
        if (context.collisions.length > 0) {
          context.entityManager.destroyEntity(context.collisions[0].entityA.id);
          context.entityManager.destroyEntity(context.collisions[0].entityB.id);
        }
        break;

      case 'all':
        context.entityManager.clearAll();
        break;
    }
  }
}
