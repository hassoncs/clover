import type { ActionExecutor } from './ActionExecutor';
import type { AddXPAction, UnlockAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { resolveNumber } from '../utils';

type ProgressionAction = AddXPAction | UnlockAction;

export class ProgressionActionExecutor implements ActionExecutor<ProgressionAction> {
  execute(action: ProgressionAction, context: RuleContext): void {
    switch (action.type) {
      case 'progression_add_xp': this.executeAddXP(action, context); break;
      case 'progression_unlock': this.executeUnlock(action, context); break;
    }
  }

  private executeAddXP(action: AddXPAction, context: RuleContext): void {
    const stateKey = '__progStates';
    let states = context.mutator.getVariable(stateKey) as unknown as Record<string, { xp: number; level: number; unlocks: string[] }> | undefined;
    if (!states) states = {};
    if (!states[action.progressionId]) states[action.progressionId] = { xp: 0, level: 1, unlocks: [] };
    
    const state = states[action.progressionId];
    state.xp += resolveNumber(action.amount, context);
    state.level = Math.floor(state.xp / 100) + 1;
    
    context.mutator.setVariable(stateKey, states as unknown as number);
  }

  private executeUnlock(action: UnlockAction, context: RuleContext): void {
    const stateKey = '__globalUnlocks';
    let unlocks = context.mutator.getVariable(stateKey) as unknown as string[] | undefined;
    if (!unlocks) unlocks = [];
    
    if (!unlocks.includes(action.unlockId)) unlocks.push(action.unlockId);
    
    context.mutator.setVariable(stateKey, unlocks as unknown as number);
  }
}
