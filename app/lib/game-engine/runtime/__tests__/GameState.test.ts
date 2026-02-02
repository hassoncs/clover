import { describe, it, expect, beforeEach } from 'vitest';
import type { GameDefinition } from '@slopcade/shared';
import { 
  createGameState,
  resetGameState,
  getScore,
  setScore,
  addScore,
  getLives,
  setLives,
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
    
    expect(getScore(state)).toBe(0);
    expect(getLives(state)).toBe(3);
    expect(getGameStateValue(state)).toBe('ready');
  });

  it('uses initialScore and initialLives from definition', () => {
    const state = createGameState(createMinimalDef({
      initialScore: 100,
      initialLives: 5,
    }));
    
    expect(getScore(state)).toBe(100);
    expect(getLives(state)).toBe(5);
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
    
    expect(state.stateMachines['player'].current).toBe('idle');
    expect(state.stateMachines['player'].transitionCount).toBe(0);
  });
});

describe('resetGameState', () => {
  it('resets all values to initial', () => {
    const state = createGameState(createMinimalDef({
      initialScore: 50,
      initialLives: 5,
      variables: { health: 100 },
    }));
    
    setScore(state, 999);
    setLives(state, 1);
    setVar(state, 'health', 10);
    setGameStateValue(state, 'playing');
    
    resetGameState(state);
    
    expect(getScore(state)).toBe(50);
    expect(getLives(state)).toBe(5);
    expect(getVar(state, 'health')).toBe(100);
    expect(getGameStateValue(state)).toBe('ready');
  });
});

describe('score operations', () => {
  let state: ReturnType<typeof createGameState>;
  
  beforeEach(() => {
    state = createGameState(createMinimalDef());
  });

  it('setScore updates score', () => {
    setScore(state, 100);
    expect(getScore(state)).toBe(100);
  });

  it('addScore adds to current score', () => {
    setScore(state, 50);
    addScore(state, 25);
    expect(getScore(state)).toBe(75);
  });

  it('emits scoreChanged event', () => {
    const events = createGameEventBus();
    const received: number[] = [];
    events.subscribe(e => {
      if (e.type === 'scoreChanged') received.push(e.score);
    });
    
    setScore(state, 100, events);
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
