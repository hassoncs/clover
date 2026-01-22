export interface ConditionEvaluator<T extends import('@slopcade/shared').RuleCondition> {
  evaluate(condition: T, context: import('../../RulesEvaluator').RuleContext): boolean;
}
