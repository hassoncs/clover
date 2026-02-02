import type { TriggerEvaluator } from './TriggerEvaluator';
import type { TimerTrigger, EntityCountTrigger, EventTrigger, FrameTrigger, GameStartTrigger } from '@slopcade/shared';
import type { RuleContext } from '../types';

export class LogicTriggerEvaluator implements TriggerEvaluator<TimerTrigger | EntityCountTrigger | EventTrigger | FrameTrigger | GameStartTrigger> {
  evaluate(trigger: TimerTrigger | EntityCountTrigger | EventTrigger | FrameTrigger | GameStartTrigger, context: RuleContext): boolean {
    switch (trigger.type) {
      case 'timer':
        if (trigger.repeat) {
          const interval = trigger.time;
          return Math.floor(context.elapsed / interval) > Math.floor((context.elapsed - 0.016) / interval);
        }
        return context.elapsed >= trigger.time && context.elapsed - 0.016 < trigger.time;

      case 'entity_count': {
        const count = context.entityManager.getEntityCountByTag(trigger.tag);
        switch (trigger.comparison) {
          case 'gte':
            return count >= trigger.count;
          case 'lte':
            return count <= trigger.count;
          case 'eq':
            return count === trigger.count;
          case 'zero':
            return count === 0;
        }
        return false;
      }

      case 'event':
        return context.events.has(trigger.eventName);

      case 'frame':
        return true;

      case 'gameStart':
        return context.inputEvents.gameStarted ?? false;

      default:
        return false;
    }
  }
}
