import type { ActionExecutor } from './ActionExecutor';
import type { ProgressionAddXPAction, ProgressionUnlockAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { resolveNumber } from '../utils';

type ProgressionAction = ProgressionAddXPAction | ProgressionUnlockAction;

export class ProgressionActionExecutor implements ActionExecutor<ProgressionAction> {
  execute(action: ProgressionAction, context: RuleContext): void {
    switch (action.type) {
      case 'progression_add_xp': this.executeAddXP(action, context); break;
      case 'progression_unlock': this.executeUnlock(action, context); break;
    }
  }

  private executeAddXP(action: ProgressionAddXPAction, context: RuleContext): void {
    const stateKey = '__progStates';
    let states = context.mutator.getVariable(stateKey) as Record<string, { xp: number; level: number; unlocks: string[]; unlockedAchievements: string[] }> | undefined;
    if (!states) states = {};
    if (!states[action.progressionId]) states[action.progressionId] = { xp: 0, level: 1, unlocks: [], unlockedAchievements: [] };
    
    const state = states[action.progressionId];
    state.xp += resolveNumber(action.xp, context);
    state.level = Math.floor(state.xp / 100) + 1;
    
    context.mutator.setVariable(stateKey, states as unknown as number);
  }

  private executeUnlock(action: ProgressionUnlockAction, context: RuleContext): void {
    const stateKey = '__progStates';
    let states = context.mutator.getVariable(stateKey) as Record<string, { xp: number; level: number; unlocks: string[]; unlockedAchievements: string[] }> | undefined;
    if (!states) states = {};
    if (!states[action.progressionId]) states[action.progressionId] = { xp: 0, level: 1, unlocks: [], unlockedAchievements: [] };
    
    const state = states[action.progressionId];
    if (!state.unlocks.includes(action.unlockId)) state.unlocks.push(action.unlockId);
    
    context.mutator.setVariable(stateKey, states as unknown as number);
  }
}
