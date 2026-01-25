import type { ActionExecutor } from './ActionExecutor';
import type { TargetNearestAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { resolveEntityTarget, resolveNumber } from '../utils';

export class SpatialQueryActionExecutor implements ActionExecutor<TargetNearestAction> {
  execute(action: TargetNearestAction, context: RuleContext): void {
    const sourceEntities = resolveEntityTarget(action.source, context);
    if (sourceEntities.length === 0) {
      context.mutator.setVariable(action.storeIn, '');
      return;
    }
    
    const source = sourceEntities[0];
    const maxRadius = action.maxRadius ? resolveNumber(action.maxRadius, context) : Infinity;
    
    let nearestId = '';
    let nearestDist = Infinity;

    for (const tag of action.targetTags) {
      const targetEntities = context.entityManager.getEntitiesByTag(tag);
      for (const target of targetEntities) {
        if (target.id === source.id) continue;
        
        const dx = target.transform.x - source.transform.x;
        const dy = target.transform.y - source.transform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= maxRadius && dist < nearestDist) {
          nearestDist = dist;
          nearestId = target.id;
        }
      }
    }

    context.mutator.setVariable(action.storeIn, nearestId);
  }
}
