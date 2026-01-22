import type { TriggerEvaluator } from './TriggerEvaluator';
import type { TimerTrigger, ScoreTrigger, EntityCountTrigger, EventTrigger, FrameTrigger, GameStartTrigger } from '@slopcade/shared';
import type { RuleContext } from '../types';

export class LogicTriggerEvaluator implements TriggerEvaluator<TimerTrigger | ScoreTrigger | EntityCountTrigger | EventTrigger | FrameTrigger | GameStartTrigger> {
  evaluate(trigger: TimerTrigger | ScoreTrigger | EntityCountTrigger | EventTrigger | FrameTrigger | GameStartTrigger, context: RuleContext): boolean {
    switch (trigger.type) {
      case 'timer':
        if (trigger.repeat) {
          const interval = trigger.time;
          return Math.floor(context.elapsed / interval) > Math.floor((context.elapsed - 0.016) / interval);
        }
        return context.elapsed >= trigger.time && context.elapsed - 0.016 < trigger.time;

      case 'score':
        switch (trigger.comparison) {
          case 'gte':
            return context.score >= trigger.threshold;
          case 'lte':
            return context.score <= trigger.threshold;
          case 'eq':
            return context.score === trigger.threshold;
        }
        return false;

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
