import type { ConditionEvaluator } from './ConditionEvaluator';
import type { ScoreCondition, TimeCondition, EntityCountCondition, RandomCondition, VariableCondition, CooldownReadyCondition } from '@slopcade/shared';
import type { RuleContext } from '../types';

export class LogicConditionEvaluator implements ConditionEvaluator<ScoreCondition | TimeCondition | EntityCountCondition | RandomCondition | VariableCondition | CooldownReadyCondition> {
  evaluate(condition: ScoreCondition | TimeCondition | EntityCountCondition | RandomCondition | VariableCondition | CooldownReadyCondition, context: RuleContext): boolean {
    switch (condition.type) {
      case 'score':
        if (condition.min !== undefined && context.score < condition.min) return false;
        if (condition.max !== undefined && context.score > condition.max) return false;
        return true;

      case 'time':
        if (condition.min !== undefined && context.elapsed < condition.min) return false;
        if (condition.max !== undefined && context.elapsed > condition.max) return false;
        return true;

      case 'entity_count': {
        const count = context.entityManager.getEntityCountByTag(condition.tag);
        if (condition.min !== undefined && count < condition.min) return false;
        if (condition.max !== undefined && count > condition.max) return false;
        return true;
      }

      case 'random':
        return Math.random() < condition.probability;

      case 'cooldown_ready': {
         const end = (context as any).cooldowns?.get(condition.cooldownId);
         return !end || context.elapsed >= end;
      }

      case 'variable': {
         const val = context.mutator.getVariable(condition.name);
         const target = condition.value;
         
         if (condition.comparison === 'eq') return val === target;
         if (condition.comparison === 'neq') return val !== target;
         
         if (typeof val === 'number' && typeof target === 'number') {
             switch (condition.comparison) {
                 case 'gt': return val > target;
                 case 'lt': return val < target;
                 case 'gte': return val >= target;
                 case 'lte': return val <= target;
             }
         }
         return false;
      }

      default:
        return true;
    }
  }
}
