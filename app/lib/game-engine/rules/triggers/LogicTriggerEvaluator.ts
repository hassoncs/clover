import type { TriggerEvaluator } from './TriggerEvaluator';
import type { TimerTrigger, EntityCountTrigger, EventTrigger, FrameTrigger, GameStartTrigger, GameLoadedTrigger } from '@slopcade/shared';
import type { RuleContext } from '../types';

export class LogicTriggerEvaluator implements TriggerEvaluator<TimerTrigger | EntityCountTrigger | EventTrigger | FrameTrigger | GameStartTrigger | GameLoadedTrigger> {
  evaluate(trigger: TimerTrigger | EntityCountTrigger | EventTrigger | FrameTrigger | GameStartTrigger | GameLoadedTrigger, context: RuleContext): boolean {
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

      case 'game_started':
        return context.inputEvents.gameStarted ?? false;

      case 'game_loaded': {
        const result = context.inputEvents.gameLoaded ?? false;
        if (result) {
          console.log("[Lifecycle] LogicTriggerEvaluator: game_loaded trigger FIRED");
        }
        return result;
      }

      default:
        return false;
    }
  }
}
