export interface ActionExecutor<T extends import('@slopcade/shared').RuleAction> {
  execute(action: T, context: import('../types').RuleContext): void;
}
