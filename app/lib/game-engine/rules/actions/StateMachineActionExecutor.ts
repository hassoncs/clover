import type { ActionExecutor } from './ActionExecutor';
import type { StateTransitionAction } from '@slopcade/shared';
import type { RuleContext } from '../types';

export class StateMachineActionExecutor implements ActionExecutor<StateTransitionAction> {
  execute(action: StateTransitionAction, context: RuleContext): void {
    const varKey = `sm.${action.machineId}`;
    const currentState = context.mutator.getVariable(varKey) as string | undefined;
    if (currentState === action.toState) return;
    
    context.mutator.setVariable(varKey, action.toState);
  }
}
