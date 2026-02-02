import type { GameSystemDefinition } from '../types';
import type { StateMachineDefinition, StateMachineState } from './types';

export const STATE_MACHINE_SYSTEM_ID = 'state-machine';
export const STATE_MACHINE_VERSION = { major: 1, minor: 0, patch: 0 };

export const stateMachineSystem: GameSystemDefinition<Record<string, StateMachineDefinition>, Record<string, StateMachineState>> = {
  id: STATE_MACHINE_SYSTEM_ID,
  version: STATE_MACHINE_VERSION,
  actionTypes: ['state_transition', 'state_send_event'],
  behaviorTypes: [],
  expressionFunctions: {
    stateCurrent: (args, ctx) => {
      if (args.length < 1) throw new Error('stateCurrent(machineId) requires 1 argument');
      const machineId = String(args[0]);
      const states = (ctx.variables['__smStates'] as unknown as Record<string, StateMachineState>) ?? {};
      return states[machineId]?.currentState ?? '';
    },
    
    statePrevious: (args, ctx) => {
      if (args.length < 1) throw new Error('statePrevious(machineId) requires 1 argument');
      const machineId = String(args[0]);
      const states = (ctx.variables['__smStates'] as unknown as Record<string, StateMachineState>) ?? {};
      return states[machineId]?.previousState ?? '';
    },
    
    stateTimeInState: (args, ctx) => {
      if (args.length < 1) throw new Error('stateTimeInState(machineId) requires 1 argument');
      const machineId = String(args[0]);
      const states = (ctx.variables['__smStates'] as unknown as Record<string, StateMachineState>) ?? {};
      const state = states[machineId];
      if (!state) return 0;
      return ctx.time - state.stateEnteredAt;
    },
    
    stateTransitionCount: (args, ctx) => {
      if (args.length < 1) throw new Error('stateTransitionCount(machineId) requires 1 argument');
      const machineId = String(args[0]);
      const states = (ctx.variables['__smStates'] as unknown as Record<string, StateMachineState>) ?? {};
      return states[machineId]?.transitionCount ?? 0;
    },
    
    stateIs: (args, ctx) => {
      if (args.length < 2) throw new Error('stateIs(machineId, stateId) requires 2 arguments');
      const machineId = String(args[0]);
      const stateId = String(args[1]);
      const states = (ctx.variables['__smStates'] as unknown as Record<string, StateMachineState>) ?? {};
      return states[machineId]?.currentState === stateId;
    },
    
    stateCanTransitionTo: (args, ctx) => {
      if (args.length < 2) throw new Error('stateCanTransitionTo(machineId, toStateId) requires 2 arguments');
      const machineId = String(args[0]);
      const toStateId = String(args[1]);
      const states = (ctx.variables['__smStates'] as unknown as Record<string, StateMachineState>) ?? {};
      const defs = (ctx.variables['__smDefs'] as unknown as Record<string, StateMachineDefinition>) ?? {};
      const state = states[machineId];
      const def = defs[machineId];
      if (!state || !def) return false;
      
      const currentState = state.currentState;
      for (const transition of def.transitions) {
        if (transition.to !== toStateId) continue;
        const fromMatch = 
          transition.from === '*' ||
          transition.from === currentState ||
          (Array.isArray(transition.from) && transition.from.includes(currentState));
        if (fromMatch) return true;
      }
      return false;
    },
  },
};

export * from './types';
