import type { ActionExecutor } from './ActionExecutor';
import type { DestroyAction, DestroyMarkedAction } from '@slopcade/shared';
import type { RuleContext } from '../types';

type DestroyActions = DestroyAction | DestroyMarkedAction;

export class DestroyActionExecutor implements ActionExecutor<DestroyActions> {
  execute(action: DestroyActions, context: RuleContext): void {
    if (action.type === 'destroy_marked') {
      this.executeDestroyMarked(action, context);
      return;
    }

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

  private executeDestroyMarked(action: DestroyMarkedAction, context: RuleContext): void {
    const entities = context.entityManager.getActiveEntities();
    
    for (const entity of entities) {
      if (!entity.markedForDestruction) continue;
      
      if (action.tag && !entity.tags.includes(action.tag)) continue;
      
      context.entityManager.destroyEntity(entity.id);
    }
  }
}
