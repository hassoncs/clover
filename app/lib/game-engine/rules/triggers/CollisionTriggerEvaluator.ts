import type { TriggerEvaluator } from "./TriggerEvaluator";
import type { CollisionTrigger } from "@slopcade/shared";
import type { RuleContext } from "../types";

export class CollisionTriggerEvaluator
  implements TriggerEvaluator<CollisionTrigger>
{
  evaluate(trigger: CollisionTrigger, context: RuleContext): boolean {
    // if (context.collisions.length > 0) {
    //   console.log('[CollisionTrigger] Checking', context.collisions.length, 'collisions for', trigger.entityATag, '↔', trigger.entityBTag);
    //   context.collisions.forEach((c, i) => {
    //     console.log(`  [${i}] entityA tags:`, c.entityA.tags, '| entityB tags:', c.entityB.tags);
    //   });
    // }
    return context.collisions.some((c) => {
      const aHasTagA = c.entityA.tags.includes(trigger.entityATag);
      const aHasTagB = c.entityA.tags.includes(trigger.entityBTag);
      const bHasTagA = c.entityB.tags.includes(trigger.entityATag);
      const bHasTagB = c.entityB.tags.includes(trigger.entityBTag);
      const matched = (aHasTagA && bHasTagB) || (aHasTagB && bHasTagA);
      if (matched) {
        console.log(
          "[CollisionTrigger] MATCHED:",
          trigger.entityATag,
          "↔",
          trigger.entityBTag,
        );
      }
      return matched;
    });
  }
}
