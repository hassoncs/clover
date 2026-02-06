import { describe, it, expect, beforeEach } from 'vitest';
import type { GameDefinition } from '@slopcade/shared';
import {
  createGameState,
  resetGameState,
  getGameStateValue,
  setGameStateValue,
  getVar,
  setVar,
  getList,
  setList,
  pushToList,
  popFromList,
  triggerEvent,
} from '../GameStateHelpers';
import { createGameEventBus } from '../GameEventBus';
import { RESERVED_VARS } from '../types';

const createMinimalDef = (overrides: Partial<GameDefinition> = {}): GameDefinition => ({
  metadata: { id: 'test', title: 'Test', version: '1.0.0' },
  world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
  templates: {},
  entities: [],
  ...overrides,
});

describe('createGameState', () => {
  it('creates state with default values', () => {
    const state = createGameState(createMinimalDef());

    expect(getVar(state, 'score')).toBeUndefined();
    expect(getVar(state, 'lives')).toBeUndefined();
    expect(getGameStateValue(state)).toBe('ready');
  });

  it('uses variables from definition for score and lives', () => {
    const state = createGameState(createMinimalDef({
      variables: {
        score: 100,
        lives: 5,
      },
    }));

    expect(getVar(state, 'score')).toBe(100);
    expect(getVar(state, 'lives')).toBe(5);
  });

  it('loads variables from definition', () => {
    const state = createGameState(createMinimalDef({
      variables: {
        health: 100,
        name: 'Player',
        isAlive: true,
      },
    }));

    expect(getVar(state, 'health')).toBe(100);
    expect(getVar(state, 'name')).toBe('Player');
    expect(getVar(state, 'isAlive')).toBe(true);
  });

  it('initializes state machines from definition', () => {
    const state = createGameState(createMinimalDef({
      stateMachines: [{
        id: 'player',
        initialState: 'idle',
        states: [{ id: 'idle' }, { id: 'running' }],
        transitions: [],
      }],
    }));

    expect(state.vars['sm.player']).toBe('idle');
    expect(state.stateMachines['player'].transitionCount).toBe(0);
  });
});

describe('resetGameState', () => {
  it('resets all values to initial', () => {
    const state = createGameState(createMinimalDef({
      variables: {
        score: 50,
        lives: 5,
        health: 100
      },
    }));

    setVar(state, 'score', 999);
    setVar(state, 'lives', 1);
    setVar(state, 'health', 10);
    setGameStateValue(state, 'playing');

    resetGameState(state);

    expect(getVar(state, 'score')).toBe(50);
    expect(getVar(state, 'lives')).toBe(5);
    expect(getVar(state, 'health')).toBe(100);
    expect(getGameStateValue(state)).toBe('ready');
  });
});

describe('score operations', () => {
  let state: ReturnType<typeof createGameState>;

  beforeEach(() => {
    state = createGameState(createMinimalDef({
      variables: { score: 0 }
    }));
  });

  it('setVar updates score', () => {
    setVar(state, 'score', 100);
    expect(getVar(state, 'score')).toBe(100);
  });

  it('setVar adds to current score', () => {
    setVar(state, 'score', 50);
    setVar(state, 'score', (getVar(state, 'score') as number) + 25);
    expect(getVar(state, 'score')).toBe(75);
  });

  it('emits varChanged event for score', () => {
    const events = createGameEventBus();
    const received: any[] = [];
    events.subscribe(e => {
      if (e.type === 'varChanged' && e.key === 'score') received.push(e.value);
    });

    setVar(state, 'score', 100, events);
    expect(received).toEqual([100]);
  });
});

describe('list operations', () => {
  let state: ReturnType<typeof createGameState>;
  
  beforeEach(() => {
    state = createGameState(createMinimalDef());
  });

  it('setList and getList work correctly', () => {
    setList(state, 'items', [1, 2, 3]);
    expect(getList(state, 'items')).toEqual([1, 2, 3]);
  });

  it('pushToList adds to list', () => {
    setList(state, 'items', [1, 2]);
    pushToList(state, 'items', 3);
    expect(getList(state, 'items')).toEqual([1, 2, 3]);
  });

  it('popFromList removes from back by default', () => {
    setList(state, 'items', [1, 2, 3]);
    const popped = popFromList(state, 'items', 'back');
    expect(popped).toBe(3);
    expect(getList(state, 'items')).toEqual([1, 2]);
  });

  it('popFromList removes from front when specified', () => {
    setList(state, 'items', [1, 2, 3]);
    const popped = popFromList(state, 'items', 'front');
    expect(popped).toBe(1);
    expect(getList(state, 'items')).toEqual([2, 3]);
  });
});

describe('state machine variable integration', () => {
  it('state machine initial state is a regular variable', () => {
    const state = createGameState(createMinimalDef({
      stateMachines: [{
        id: 'gameFlow',
        initialState: 'idle',
        states: [{ id: 'idle' }, { id: 'holding' }],
        transitions: [],
      }],
    }));

    expect(state.vars['sm.gameFlow']).toBe('idle');
  });

  it('custom stateVar overrides default sm.<id> key', () => {
    const state = createGameState(createMinimalDef({
      stateMachines: [{
        id: 'combat',
        stateVar: 'unitState',
        initialState: 'patrol',
        states: [{ id: 'patrol' }, { id: 'attack' }],
        transitions: [],
      }],
    }));

    expect(state.vars['unitState']).toBe('patrol');
    expect(state.vars['sm.combat']).toBeUndefined();
  });

  it('reset restores state machine variable to initial', () => {
    const state = createGameState(createMinimalDef({
      stateMachines: [{
        id: 'gameFlow',
        initialState: 'idle',
        states: [{ id: 'idle' }, { id: 'holding' }],
        transitions: [],
      }],
    }));

    state.vars['sm.gameFlow'] = 'holding';
    resetGameState(state);

    expect(state.vars['sm.gameFlow']).toBe('idle');
  });
});

describe('dialog variable integration', () => {
  it('activeDialog variable controls dialog visibility', () => {
    const state = createGameState(createMinimalDef({
      variables: { activeDialog: '' },
    }));

    expect(state.vars['activeDialog']).toBe('');

    setVar(state, 'activeDialog', 'levelComplete');
    expect(state.vars['activeDialog']).toBe('levelComplete');

    setVar(state, 'activeDialog', '');
    expect(state.vars['activeDialog']).toBe('');
  });

  it('dialog button events flow through pendingEvents', () => {
    const state = createGameState(createMinimalDef());

    triggerEvent(state, 'dialog_next_level', { source: 'button' });
    expect(state.pendingEvents.has('dialog_next_level')).toBe(true);
    expect(state.pendingEvents.get('dialog_next_level')).toEqual({ source: 'button' });
  });
});

describe('event tracking', () => {
  it('triggerEvent adds to pendingEvents', () => {
    const state = createGameState(createMinimalDef());
    
    triggerEvent(state, 'playerDied', { x: 10, y: 20 });
    
    expect(state.pendingEvents.get('playerDied')).toEqual({ x: 10, y: 20 });
  });

  it('changedVars tracks variable changes', () => {
    const state = createGameState(createMinimalDef());
    
    setVar(state, 'health', 50);
    setVar(state, 'score', 100);
    
    expect(state.changedVars.has('health')).toBe(true);
    expect(state.changedVars.has('score')).toBe(true);
  });
});
