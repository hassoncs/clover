import type { ActionExecutor } from './ActionExecutor';
import type { ScoreAction } from '@slopcade/shared';
import type { RuleContext } from '../types';

export class ScoreActionExecutor implements ActionExecutor<ScoreAction> {
  execute(action: ScoreAction, context: RuleContext): void {
    const value = this.resolveNumber(action.value, context);
    
    switch (action.operation) {
      case 'add':
        context.mutator.addScore(value);
        break;
      case 'subtract':
        context.mutator.addScore(-value);
        break;
      case 'set':
        context.mutator.setScore(value);
        break;
      case 'multiply':
        context.mutator.setScore(context.score * value);
        break;
    }
  }

  private resolveNumber(value: import('@slopcade/shared').Value<number>, context: RuleContext): number {
    if (context.computedValues && context.evalContext) {
      return context.computedValues.resolveNumber(value, context.evalContext);
    }
    return typeof value === 'number' ? value : 0;
  }
}
