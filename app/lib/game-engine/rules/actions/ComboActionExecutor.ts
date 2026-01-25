import type { ActionExecutor } from './ActionExecutor';
import type { ComboIncrementAction, ComboResetAction } from '@slopcade/shared';
import type { RuleContext } from '../types';

type ComboAction = ComboIncrementAction | ComboResetAction;

export class ComboActionExecutor implements ActionExecutor<ComboAction> {
  execute(action: ComboAction, context: RuleContext): void {
    switch (action.type) {
      case 'combo_increment':
        this.executeIncrement(action, context);
        break;
      case 'combo_reset':
        this.executeReset(action, context);
        break;
    }
  }

  private executeIncrement(action: ComboIncrementAction, context: RuleContext): void {
    const stateKey = '__comboStates';
    let states = context.mutator.getVariable(stateKey) as unknown as Record<string, { count: number; multiplier: number; tier: number; lastTriggerTime: number }> | undefined;
    if (!states) states = {};
    
    const state = states[action.comboId] ?? { count: 0, multiplier: 1, tier: 0, lastTriggerTime: 0 };
    state.count += 1;
    state.lastTriggerTime = context.elapsed;
    state.multiplier = Math.min(state.count, 10);
    state.tier = Math.floor(state.count / 5);
    
    states[action.comboId] = state;
    context.mutator.setVariable(stateKey, states as unknown as number);
  }

  private executeReset(action: ComboResetAction, context: RuleContext): void {
    const stateKey = '__comboStates';
    let states = context.mutator.getVariable(stateKey) as unknown as Record<string, { count: number; multiplier: number; tier: number; lastTriggerTime: number }> | undefined;
    if (!states) return;
    
    states[action.comboId] = { count: 0, multiplier: 1, tier: 0, lastTriggerTime: context.elapsed };
    context.mutator.setVariable(stateKey, states as unknown as number);
  }
}
