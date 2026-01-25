import type { ActionExecutor } from './ActionExecutor';
import type { ActivateCheckpointAction, SaveCheckpointAction, RestoreCheckpointAction } from '@slopcade/shared';
import type { RuleContext } from '../types';

type CheckpointAction = ActivateCheckpointAction | SaveCheckpointAction | RestoreCheckpointAction;

export class CheckpointActionExecutor implements ActionExecutor<CheckpointAction> {
  execute(action: CheckpointAction, context: RuleContext): void {
    switch (action.type) {
      case 'checkpoint_activate': this.executeActivate(action, context); break;
      case 'checkpoint_save': this.executeSave(context); break;
      case 'checkpoint_restore': this.executeRestore(context); break;
    }
  }

  private getState(context: RuleContext): { activeCheckpointId: string; savedState: { score: number; lives: number; variables: Record<string, number | string | boolean> } | null } {
    const stateKey = '__checkpointState';
    let state = context.mutator.getVariable(stateKey) as unknown as { activeCheckpointId: string; savedState: { score: number; lives: number; variables: Record<string, number | string | boolean> } | null } | undefined;
    if (!state) state = { activeCheckpointId: '', savedState: null };
    return state;
  }

  private saveStateToVar(state: { activeCheckpointId: string; savedState: { score: number; lives: number; variables: Record<string, number | string | boolean> } | null }, context: RuleContext): void {
    context.mutator.setVariable('__checkpointState', state as unknown as number);
  }

  private executeActivate(action: ActivateCheckpointAction, context: RuleContext): void {
    const state = this.getState(context);
    state.activeCheckpointId = action.checkpointId;
    this.saveStateToVar(state, context);
  }

  private executeSave(context: RuleContext): void {
    const state = this.getState(context);
    state.savedState = { score: context.score, lives: context.lives, variables: {} };
    this.saveStateToVar(state, context);
  }

  private executeRestore(context: RuleContext): void {
    const state = this.getState(context);
    if (!state.savedState) return;
    context.mutator.setScore(state.savedState.score);
    context.mutator.setLives(state.savedState.lives);
    for (const [name, value] of Object.entries(state.savedState.variables)) {
      context.mutator.setVariable(name, value);
    }
  }
}
