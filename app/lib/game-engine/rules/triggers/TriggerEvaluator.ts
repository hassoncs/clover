export interface TriggerEvaluator<T extends import('@slopcade/shared').RuleTrigger> {
  evaluate(trigger: T, context: import('../types').RuleContext): boolean;
}
