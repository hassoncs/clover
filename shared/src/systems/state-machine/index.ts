import type { GameSystemDefinition } from '../types';
import type { StateMachineDefinition, StateMachineState } from './types';

export const STATE_MACHINE_SYSTEM_ID = 'state-machine';
export const STATE_MACHINE_VERSION = { major: 1, minor: 0, patch: 0 };

interface SmMeta { previous: string; enteredAt: number; transitionCount: number }

export const stateMachineSystem: GameSystemDefinition<Record<string, StateMachineDefinition>, Record<string, StateMachineState>> = {
  id: STATE_MACHINE_SYSTEM_ID,
  version: STATE_MACHINE_VERSION,
  actionTypes: ['state_transition', 'state_send_event'],
  behaviorTypes: [],
  expressionFunctions: {
    stateCurrent: (args, ctx) => {
      if (args.length < 1) throw new Error('stateCurrent(machineId) requires 1 argument');
      const machineId = String(args[0]);
      const defs = (ctx.variables['__smDefs'] as unknown as Record<string, StateMachineDefinition>) ?? {};
      const def = defs[machineId];
      const varKey = def?.stateVar ?? `sm.${machineId}`;
      return (ctx.variables[varKey] as string) ?? '';
    },
    
    statePrevious: (args, ctx) => {
      if (args.length < 1) throw new Error('statePrevious(machineId) requires 1 argument');
      const machineId = String(args[0]);
      const meta = (ctx.variables['__smMeta'] as unknown as Record<string, SmMeta>) ?? {};
      return meta[machineId]?.previous ?? '';
    },
    
    stateTimeInState: (args, ctx) => {
      if (args.length < 1) throw new Error('stateTimeInState(machineId) requires 1 argument');
      const machineId = String(args[0]);
      const meta = (ctx.variables['__smMeta'] as unknown as Record<string, SmMeta>) ?? {};
      const m = meta[machineId];
      if (!m) return 0;
      return ctx.time - m.enteredAt;
    },
    
    stateTransitionCount: (args, ctx) => {
      if (args.length < 1) throw new Error('stateTransitionCount(machineId) requires 1 argument');
      const machineId = String(args[0]);
      const meta = (ctx.variables['__smMeta'] as unknown as Record<string, SmMeta>) ?? {};
      return meta[machineId]?.transitionCount ?? 0;
    },
    
    stateIs: (args, ctx) => {
      if (args.length < 2) throw new Error('stateIs(machineId, stateId) requires 2 arguments');
      const machineId = String(args[0]);
      const stateId = String(args[1]);
      const defs = (ctx.variables['__smDefs'] as unknown as Record<string, StateMachineDefinition>) ?? {};
      const def = defs[machineId];
      const varKey = def?.stateVar ?? `sm.${machineId}`;
      return ctx.variables[varKey] === stateId;
    },
    
    stateCanTransitionTo: (args, ctx) => {
      if (args.length < 2) throw new Error('stateCanTransitionTo(machineId, toStateId) requires 2 arguments');
      const machineId = String(args[0]);
      const toStateId = String(args[1]);
      const defs = (ctx.variables['__smDefs'] as unknown as Record<string, StateMachineDefinition>) ?? {};
      const def = defs[machineId];
      if (!def) return false;
      
      const varKey = def.stateVar ?? `sm.${machineId}`;
      const currentState = (ctx.variables[varKey] as string) ?? '';
      
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
