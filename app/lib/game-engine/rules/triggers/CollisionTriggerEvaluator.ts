import type { TriggerEvaluator } from './TriggerEvaluator';
import type { CollisionTrigger } from '@slopcade/shared';
import type { RuleContext } from '../types';

export class CollisionTriggerEvaluator implements TriggerEvaluator<CollisionTrigger> {
  evaluate(trigger: CollisionTrigger, context: RuleContext): boolean {
    return context.collisions.some((c) => {
      const aHasTagA = c.entityA.tags.includes(trigger.entityATag);
      const aHasTagB = c.entityA.tags.includes(trigger.entityBTag);
      const bHasTagA = c.entityB.tags.includes(trigger.entityATag);
      const bHasTagB = c.entityB.tags.includes(trigger.entityBTag);
      return (aHasTagA && bHasTagB) || (aHasTagB && bHasTagA);
    });
  }
}
