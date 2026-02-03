import type { GameDefinition, StateMachineDefinition } from '@slopcade/shared';
import type { 
  GameState, 
  GameStateValue, 
  VarValue, 
  ListValue,
  StateMachineRuntimeState,
  GameEventBus,
} from './types';
import { RESERVED_VARS } from './types';

export function createGameState(def: GameDefinition): GameState {
  const vars: Record<string, VarValue> = {};
  const initialVars: Record<string, VarValue> = {};

  vars[RESERVED_VARS.GAME_STATE] = 'ready';
  vars[RESERVED_VARS.ELAPSED] = 0;

  if (def.variables) {
    for (const [key, value] of Object.entries(def.variables)) {
      if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
        vars[key] = value;
        initialVars[key] = value;
      } else if (typeof value === 'object' && value !== null && 'value' in value) {
        const varValue = (value as { value: unknown }).value;
        if (typeof varValue === 'number' || typeof varValue === 'string' || typeof varValue === 'boolean') {
          vars[key] = varValue;
          initialVars[key] = varValue;
        }
      }
    }
  }

  initialVars[RESERVED_VARS.GAME_STATE] = 'ready';
  initialVars[RESERVED_VARS.ELAPSED] = 0;
  
  const stateMachines: Record<string, StateMachineRuntimeState> = {};
  const initialStateMachines: Record<string, StateMachineRuntimeState> = {};
  
  if (def.stateMachines) {
    for (const sm of def.stateMachines) {
      const state: StateMachineRuntimeState = {
        current: sm.initialState,
        previous: '',
        enteredAt: 0,
        transitionCount: 0,
      };
      stateMachines[sm.id] = state;
      initialStateMachines[sm.id] = { ...state };
    }
  }
  
  return {
    vars,
    initialVars,
    stateMachines,
    initialStateMachines,
    firedOnce: new Set(),
    cooldowns: new Map(),
    lists: new Map(),
    pendingEvents: new Map(),
    changedVars: new Set(),
  };
}

export function resetGameState(state: GameState): void {
  state.vars = { ...state.initialVars };
  state.vars[RESERVED_VARS.GAME_STATE] = 'ready';
  state.vars[RESERVED_VARS.ELAPSED] = 0;
  
  state.stateMachines = {};
  for (const [id, initial] of Object.entries(state.initialStateMachines)) {
    state.stateMachines[id] = { ...initial };
  }
  
  state.firedOnce.clear();
  state.cooldowns.clear();
  state.lists.clear();
  state.pendingEvents.clear();
  state.changedVars.clear();
}

export function getVar(state: GameState, key: string): VarValue | undefined {
  return state.vars[key];
}

export function setVar(state: GameState, key: string, value: VarValue, events?: GameEventBus): void {
  console.log(`[StateHelpers.setVar] key=${key}, value=${value}, hasEvents=${!!events}`);
  state.vars[key] = value;
  state.changedVars.add(key);

  if (events) {
    console.log(`[StateHelpers.setVar] emitting varChanged`);
    events.emit({ type: 'varChanged', key, value });
    console.log(`[StateHelpers.setVar] varChanged emitted`);

    if (key === RESERVED_VARS.GAME_STATE) {
      console.log(`[StateHelpers.setVar] emitting gameStateChanged`);
      events.emit({ type: 'gameStateChanged', state: value as GameStateValue });
      console.log(`[StateHelpers.setVar] gameStateChanged emitted`);
    }
  }
  console.log(`[StateHelpers.setVar] complete`);
}

export function getGameStateValue(state: GameState): GameStateValue {
  return (state.vars[RESERVED_VARS.GAME_STATE] as GameStateValue) ?? 'ready';
}

export function setGameStateValue(state: GameState, value: GameStateValue, events?: GameEventBus): void {
  console.log(`[StateHelpers.setGameStateValue] value=${value}`);
  const current = getGameStateValue(state);
  console.log(`[StateHelpers.setGameStateValue] current=${current}, changing=${current !== value}`);
  if (current !== value) {
    setVar(state, RESERVED_VARS.GAME_STATE, value, events);
  }
  console.log(`[StateHelpers.setGameStateValue] complete`);
}

export function getElapsed(state: GameState): number {
  return (state.vars[RESERVED_VARS.ELAPSED] as number) ?? 0;
}

export function setElapsed(state: GameState, value: number): void {
  state.vars[RESERVED_VARS.ELAPSED] = value;
}

export function getList(state: GameState, name: string): ListValue | undefined {
  return state.lists.get(name);
}

export function setList(state: GameState, name: string, value: ListValue): void {
  state.lists.set(name, [...value]);
}

export function pushToList(state: GameState, name: string, value: VarValue): void {
  const list = state.lists.get(name) ?? [];
  list.push(value);
  state.lists.set(name, list);
}

export function popFromList(state: GameState, name: string, position: 'front' | 'back'): VarValue | undefined {
  const list = state.lists.get(name);
  if (!list || list.length === 0) return undefined;
  return position === 'front' ? list.shift() : list.pop();
}

export function shuffleList(state: GameState, name: string, random: () => number = Math.random): void {
  const list = state.lists.get(name);
  if (!list) return;
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}

export function listContains(state: GameState, name: string, value: VarValue): boolean {
  const list = state.lists.get(name);
  return list ? list.includes(value) : false;
}

export function triggerEvent(state: GameState, eventName: string, data?: unknown): void {
  state.pendingEvents.set(eventName, data);
}

export function setCooldown(state: GameState, cooldownId: string, expiresAt: number): void {
  state.cooldowns.set(cooldownId, expiresAt);
}

export function clearPendingEvents(state: GameState): void {
  state.pendingEvents.clear();
}

export function clearChangedVars(state: GameState): void {
  state.changedVars.clear();
}
