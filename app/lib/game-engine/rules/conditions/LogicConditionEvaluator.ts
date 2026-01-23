import type { ConditionEvaluator } from './ConditionEvaluator';
import type { ScoreCondition, TimeCondition, EntityCountCondition, RandomCondition, VariableCondition, CooldownReadyCondition, ListContainsCondition } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { resolveValue } from '../utils';

type LogicCondition = ScoreCondition | TimeCondition | EntityCountCondition | RandomCondition | VariableCondition | CooldownReadyCondition | ListContainsCondition;

export class LogicConditionEvaluator implements ConditionEvaluator<LogicCondition> {
  evaluate(condition: LogicCondition, context: RuleContext): boolean {
    switch (condition.type) {
      case 'score': {
        const currentScore = context.mutator.getScore();
        if (condition.min !== undefined && currentScore < condition.min) return false;
        if (condition.max !== undefined && currentScore > condition.max) return false;
        return true;
      }

      case 'time': {
        const currentElapsed = context.mutator.getElapsed();
        if (condition.min !== undefined && currentElapsed < condition.min) return false;
        if (condition.max !== undefined && currentElapsed > condition.max) return false;
        return true;
      }

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

      case 'list_contains': {
        const value = resolveValue(condition.value, context);
        const contains = context.mutator.listContains(condition.listName, value);
        return condition.negated ? !contains : contains;
      }

      default:
        return true;
    }
  }
}
