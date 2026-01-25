import type { ActionExecutor } from './ActionExecutor';
import type { TargetNearestAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { resolveNumber } from '../utils';

export class SpatialQueryActionExecutor implements ActionExecutor<TargetNearestAction> {
  execute(action: TargetNearestAction, context: RuleContext): void {
    const sourceEntities = context.entityManager.getEntitiesByTag(action.sourceTag);
    const targetEntities = context.entityManager.getEntitiesByTag(action.targetTag);
    const range = resolveNumber(action.range, context);

    if (sourceEntities.length === 0 || targetEntities.length === 0) {
      context.mutator.setVariable(action.storeIn, '');
      return;
    }

    const source = sourceEntities[0];
    let nearestId = '';
    let nearestDist = Infinity;

    for (const target of targetEntities) {
      const dx = target.transform.x - source.transform.x;
      const dy = target.transform.y - source.transform.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= range && dist < nearestDist) {
        nearestDist = dist;
        nearestId = target.id;
      }
    }

    context.mutator.setVariable(action.storeIn, nearestId);
  }
}
