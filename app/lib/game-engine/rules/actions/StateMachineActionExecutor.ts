import type { ActionExecutor } from './ActionExecutor';
import type { StateTransitionAction } from '@slopcade/shared';
import type { RuleContext } from '../types';

export class StateMachineActionExecutor implements ActionExecutor<StateTransitionAction> {
  execute(action: StateTransitionAction, context: RuleContext): void {
    const stateKey = '__smStates';
    let states = context.mutator.getVariable(stateKey) as Record<string, { currentState: string; previousState: string; stateEnteredAt: number; transitionCount: number }> | undefined;
    if (!states) states = {};
    
    if (!states[action.machineId]) {
      states[action.machineId] = { currentState: 'initial', previousState: '', stateEnteredAt: context.elapsed, transitionCount: 0 };
    }
    
    const state = states[action.machineId];
    if (state.currentState === action.toState) return;
    
    state.previousState = state.currentState;
    state.currentState = action.toState;
    state.stateEnteredAt = context.elapsed;
    state.transitionCount += 1;
    
    context.mutator.setVariable(stateKey, states as unknown as number);
  }
}
