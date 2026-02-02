export interface ConditionEvaluator<T extends import('@slopcade/shared').RuleCondition> {
  evaluate(condition: T, context: import('../types').RuleContext): boolean;
}
