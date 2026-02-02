import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RulesSystem } from '../RulesSystem';
import type { GameRule, WinCondition, LoseCondition, StateMachineDefinition } from '@slopcade/shared';
import { createGameState, setVar, getVar, setGameStateValue, getGameStateValue, setElapsed } from '../../../../runtime/GameStateHelpers';
import { createGameEventBus } from '../../../../runtime/GameEventBus';
import type { GameState, GameEventBus } from '../../../../runtime/types';
import type { SystemContext, UpdateContext } from '../../types';
import { createMockEntityManager, createMockPhysics } from '../../../../__tests__/testUtils';

describe('RulesSystem', () => {
  let rulesSystem: RulesSystem;
  let systemContext: SystemContext;
  let gameState: GameState;
  let eventBus: GameEventBus;

  beforeEach(() => {
    const entityManager = createMockEntityManager();
    const physics = createMockPhysics();
    
    systemContext = {
      entityManager,
      physics,
      bridge: {
        playSound: vi.fn(),
      } as any,
      eventBus: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      } as any,
      eventQueue: {
        enqueue: vi.fn(),
        process: vi.fn(),
        clear: vi.fn(),
      } as any,
    };

    gameState = createGameState({
      metadata: { id: 'test', title: 'Test', version: '1.0.0' },
      world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
      templates: {},
      entities: [],
      variables: {
        score: 0,
        lives: 3,
      },
    });

    eventBus = createGameEventBus();
    setGameStateValue(gameState, 'playing', eventBus);
  });

  describe('Lifecycle', () => {
    it('should initialize with rules and variables', () => {
      rulesSystem = new RulesSystem({
        rules: [],
        variables: { score: 0, lives: 3 },
      });

      rulesSystem.initialize(systemContext, {
        rules: [],
        variables: { score: 0, lives: 3 },
      });

      expect(rulesSystem.id).toBe('rules');
      expect(rulesSystem.phase).toBeDefined();
      expect(rulesSystem.priority).toBe(50);
    });

    it('should initialize with win and lose conditions', () => {
      const winCondition: WinCondition = {
        expr: 'score >= 100',
      };

      const loseCondition: LoseCondition = {
        type: 'custom',
        expr: 'lives <= 0',
      };

      rulesSystem = new RulesSystem({
        rules: [],
        winCondition,
        loseCondition,
      });

      rulesSystem.initialize(systemContext, {
        rules: [],
        winCondition,
        loseCondition,
      });

      expect(rulesSystem).toBeDefined();
    });

    it('should destroy and clean up resources', () => {
      rulesSystem = new RulesSystem({
        rules: [],
      });

      rulesSystem.initialize(systemContext, { rules: [] });
      rulesSystem.destroy();

      expect(() => rulesSystem.destroy()).not.toThrow();
    });
  });

  describe('Variable Management', () => {
    it('should modify variables through rules', () => {
      const rule: GameRule = {
        id: 'set-score-rule',
        trigger: {
          type: 'frame',
        },
        conditions: [],
        actions: [
          {
            type: 'set_variable',
            name: 'score',
            operation: 'set',
            value: 100,
          },
        ],
      };

      rulesSystem = new RulesSystem({
        rules: [rule],
        variables: { score: 0 },
      });

      rulesSystem.initialize(systemContext, {
        rules: [rule],
        variables: { score: 0 },
      });

      rulesSystem.setRuntimeState(gameState);
      rulesSystem.setEventBus(eventBus);

      const updateContext: UpdateContext = {
        dt: 0.016,
        elapsed: 0,
        frameId: 0,
        input: {} as any,
        gameState: { state: 'playing' } as any,
        frame: {
          inputEvents: [],
          collisions: [],
        },
      };

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });

      expect(getVar(gameState, 'score')).toBe(100);
    });

    it('should emit varChanged events when variables change', () => {
      const events: any[] = [];
      eventBus.subscribe((event) => {
        if (event.type === 'varChanged') {
          events.push(event);
        }
      });

      const rule: GameRule = {
        id: 'set-score-rule',
        trigger: {
          type: 'frame',
        },
        conditions: [],
        actions: [
          {
            type: 'set_variable',
            name: 'score',
            operation: 'set',
            value: 50,
          },
        ],
      };

      rulesSystem = new RulesSystem({
        rules: [rule],
        variables: { score: 0 },
      });

      rulesSystem.initialize(systemContext, {
        rules: [rule],
        variables: { score: 0 },
      });

      rulesSystem.setRuntimeState(gameState);
      rulesSystem.setEventBus(eventBus);

      const updateContext: UpdateContext = {
        dt: 0.016,
        elapsed: 0,
        frameId: 0,
        input: {} as any,
        gameState: { state: 'playing' } as any,
        frame: {
          inputEvents: [],
          collisions: [],
        },
      };

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });
      eventBus.flush();

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'varChanged',
        key: 'score',
        value: 50,
      });
    });

    it('should return variables in getState', () => {
      setVar(gameState, 'score', 100, eventBus);
      setVar(gameState, 'lives', 5, eventBus);

      rulesSystem = new RulesSystem({
        rules: [],
        variables: { score: 0, lives: 3 },
      });

      rulesSystem.initialize(systemContext, {
        rules: [],
        variables: { score: 0, lives: 3 },
      });

      rulesSystem.setRuntimeState(gameState);
      rulesSystem.setEventBus(eventBus);

      const state = rulesSystem.getState();

      expect(state.variables.score).toBe(100);
      expect(state.variables.lives).toBe(5);
      expect(state.variables.gameState).toBeUndefined();
      expect(state.variables.elapsed).toBeUndefined();
    });
  });

  describe('Rule Evaluation', () => {
    it('should evaluate timer trigger and execute actions', () => {
      const rule: GameRule = {
        id: 'timer-rule',
        trigger: {
          type: 'timer',
          time: 1.0,
          repeat: true,
        },
        conditions: [],
        actions: [
          {
            type: 'set_variable',
            name: 'score',
            operation: 'set',
            value: 10,
          },
        ],
      };

      rulesSystem = new RulesSystem({
        rules: [rule],
        variables: { score: 0 },
      });

      rulesSystem.initialize(systemContext, {
        rules: [rule],
        variables: { score: 0 },
      });

      rulesSystem.setRuntimeState(gameState);
      rulesSystem.setEventBus(eventBus);

      const updateContext: UpdateContext = {
        dt: 1.0,
        elapsed: 1.0,
        frameId: 0,
        input: {} as any,
        gameState: { state: 'playing' } as any,
        frame: {
          inputEvents: [],
          collisions: [],
        },
      };

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });

      expect(getVar(gameState, 'score')).toBe(10);
    });

    it('should evaluate conditions before executing actions', () => {
      const rule: GameRule = {
        id: 'conditional-rule',
        trigger: {
          type: 'frame',
        },
        conditions: [
          {
            type: 'variable',
            name: 'lives',
            comparison: 'gt',
            value: 0,
          },
        ],
        actions: [
          {
            type: 'set_variable',
            name: 'score',
            operation: 'set',
            value: 100,
          },
        ],
      };

      rulesSystem = new RulesSystem({
        rules: [rule],
        variables: { score: 0, lives: 3 },
      });

      rulesSystem.initialize(systemContext, {
        rules: [rule],
        variables: { score: 0, lives: 3 },
      });

      rulesSystem.setRuntimeState(gameState);
      rulesSystem.setEventBus(eventBus);

      const updateContext: UpdateContext = {
        dt: 0.016,
        elapsed: 0,
        frameId: 0,
        input: {} as any,
        gameState: { state: 'playing' } as any,
        frame: {
          inputEvents: [],
          collisions: [],
        },
      };

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });

      expect(getVar(gameState, 'score')).toBe(100);
    });

    it('should not execute actions when conditions fail', () => {
      const rule: GameRule = {
        id: 'failing-condition-rule',
        trigger: {
          type: 'frame',
        },
        conditions: [
          {
            type: 'variable',
            name: 'lives',
            comparison: 'lte',
            value: 0,
          },
        ],
        actions: [
          {
            type: 'set_variable',
            name: 'score',
            operation: 'set',
            value: 100,
          },
        ],
      };

      rulesSystem = new RulesSystem({
        rules: [rule],
        variables: { score: 0, lives: 3 },
      });

      rulesSystem.initialize(systemContext, {
        rules: [rule],
        variables: { score: 0, lives: 3 },
      });

      rulesSystem.setRuntimeState(gameState);
      rulesSystem.setEventBus(eventBus);

      const updateContext: UpdateContext = {
        dt: 0.016,
        elapsed: 0,
        frameId: 0,
        input: {} as any,
        gameState: { state: 'playing' } as any,
        frame: {
          inputEvents: [],
          collisions: [],
        },
      };

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });

      expect(getVar(gameState, 'score')).toBe(0);
    });

    it('should respect fireOnce flag', () => {
      const rule: GameRule = {
        id: 'fire-once-rule',
        trigger: {
          type: 'frame',
        },
        conditions: [],
        actions: [
          {
            type: 'set_variable',
            name: 'score',
            operation: 'add',
            value: 10,
          },
        ],
        fireOnce: true,
      };

      rulesSystem = new RulesSystem({
        rules: [rule],
        variables: { score: 0 },
      });

      rulesSystem.initialize(systemContext, {
        rules: [rule],
        variables: { score: 0 },
      });

      rulesSystem.setRuntimeState(gameState);
      rulesSystem.setEventBus(eventBus);

      const updateContext: UpdateContext = {
        dt: 0.016,
        elapsed: 0,
        frameId: 0,
        input: {} as any,
        gameState: { state: 'playing' } as any,
        frame: {
          inputEvents: [],
          collisions: [],
        },
      };

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });
      expect(getVar(gameState, 'score')).toBe(10);

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });
      expect(getVar(gameState, 'score')).toBe(10);
    });

    it('should respect cooldown', () => {
      const rule: GameRule = {
        id: 'cooldown-rule',
        trigger: {
          type: 'frame',
        },
        conditions: [],
        actions: [
          {
            type: 'set_variable',
            name: 'score',
            operation: 'add',
            value: 10,
          },
        ],
        cooldown: 1.0,
      };

      rulesSystem = new RulesSystem({
        rules: [rule],
        variables: { score: 0 },
      });

      rulesSystem.initialize(systemContext, {
        rules: [rule],
        variables: { score: 0 },
      });

      rulesSystem.setRuntimeState(gameState);
      rulesSystem.setEventBus(eventBus);

      let updateContext: UpdateContext = {
        dt: 0.016,
        elapsed: 0,
        frameId: 0,
        input: {} as any,
        gameState: { state: 'playing' } as any,
        frame: {
          inputEvents: [],
          collisions: [],
        },
      };

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });
      expect(getVar(gameState, 'score')).toBe(10);

      setElapsed(gameState, 0.5);
      updateContext = {
        ...updateContext,
        elapsed: 0.5,
      };

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });
      expect(getVar(gameState, 'score')).toBe(10);

      setElapsed(gameState, 1.1);
      updateContext = {
        ...updateContext,
        elapsed: 1.1,
      };

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });
      expect(getVar(gameState, 'score')).toBe(20);
    });
  });

  describe('Win/Lose Conditions', () => {
    it('should detect win condition with expression', () => {
      const winCondition: WinCondition = {
        expr: 'score >= 100',
      };

      rulesSystem = new RulesSystem({
        rules: [],
        winCondition,
        variables: { score: 0 },
      });

      rulesSystem.initialize(systemContext, {
        rules: [],
        winCondition,
        variables: { score: 0 },
      });

      setVar(gameState, 'score', 100, eventBus);

      rulesSystem.setRuntimeState(gameState);
      rulesSystem.setEventBus(eventBus);

      const updateContext: UpdateContext = {
        dt: 0.016,
        elapsed: 0,
        frameId: 0,
        input: {} as any,
        gameState: { state: 'playing' } as any,
        frame: {
          inputEvents: [],
          collisions: [],
        },
      };

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });

      const state = rulesSystem.getState();
      expect(state.gameState).toBe('won');
    });

    it('should detect lose condition with custom expression', () => {
      const loseCondition: LoseCondition = {
        type: 'custom',
        expr: 'lives <= 0',
      };

      rulesSystem = new RulesSystem({
        rules: [],
        loseCondition,
        variables: { lives: 3 },
      });

      rulesSystem.initialize(systemContext, {
        rules: [],
        loseCondition,
        variables: { lives: 3 },
      });

      setVar(gameState, 'lives', 0, eventBus);

      rulesSystem.setRuntimeState(gameState);
      rulesSystem.setEventBus(eventBus);

      const updateContext: UpdateContext = {
        dt: 0.016,
        elapsed: 0,
        frameId: 0,
        input: {} as any,
        gameState: { state: 'playing' } as any,
        frame: {
          inputEvents: [],
          collisions: [],
        },
      };

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });

      const state = rulesSystem.getState();
      expect(state.gameState).toBe('lost');
    });

    it('should detect lose condition with time_up', () => {
      const loseCondition: LoseCondition = {
        type: 'time_up',
        time: 10.0,
      };

      rulesSystem = new RulesSystem({
        rules: [],
        loseCondition,
      });

      rulesSystem.initialize(systemContext, {
        rules: [],
        loseCondition,
      });

      setElapsed(gameState, 10.1);

      rulesSystem.setRuntimeState(gameState);
      rulesSystem.setEventBus(eventBus);

      const updateContext: UpdateContext = {
        dt: 0.016,
        elapsed: 10.1,
        frameId: 0,
        input: {} as any,
        gameState: { state: 'playing' } as any,
        frame: {
          inputEvents: [],
          collisions: [],
        },
      };

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });

      const state = rulesSystem.getState();
      expect(state.gameState).toBe('lost');
    });

    it('should stop processing rules after win condition', () => {
      const winCondition: WinCondition = {
        expr: 'score >= 100',
      };

      const rule: GameRule = {
        id: 'after-win-rule',
        trigger: {
          type: 'frame',
        },
        conditions: [],
        actions: [
          {
            type: 'set_variable',
            name: 'lives',
            operation: 'set',
            value: 0,
          },
        ],
      };

      rulesSystem = new RulesSystem({
        rules: [rule],
        winCondition,
        variables: { score: 100, lives: 3 },
      });

      rulesSystem.initialize(systemContext, {
        rules: [rule],
        winCondition,
        variables: { score: 100, lives: 3 },
      });

      setVar(gameState, 'score', 100, eventBus);

      rulesSystem.setRuntimeState(gameState);
      rulesSystem.setEventBus(eventBus);

      const updateContext: UpdateContext = {
        dt: 0.016,
        elapsed: 0,
        frameId: 0,
        input: {} as any,
        gameState: { state: 'playing' } as any,
        frame: {
          inputEvents: [],
          collisions: [],
        },
      };

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });

      expect(getVar(gameState, 'lives')).toBe(3);
      expect(rulesSystem.getState().gameState).toBe('won');
    });
  });

  describe('State Machines', () => {
    it('should initialize state machines', () => {
      const stateMachine: StateMachineDefinition = {
        id: 'player',
        initialState: 'idle',
        states: [
          { id: 'idle' },
          { id: 'running' },
          { id: 'jumping' },
        ],
        transitions: [
          {
            id: 'idle-to-running',
            from: 'idle',
            to: 'running',
            trigger: {
              type: 'event',
              eventName: 'move',
            },
          },
          {
            id: 'running-to-jumping',
            from: 'running',
            to: 'jumping',
            trigger: {
              type: 'event',
              eventName: 'jump',
            },
          },
        ],
      };

      const gameStateWithSM = createGameState({
        metadata: { id: 'test', title: 'Test', version: '1.0.0' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        templates: {},
        entities: [],
        stateMachines: [stateMachine],
      });

      setGameStateValue(gameStateWithSM, 'playing');

      rulesSystem = new RulesSystem({
        rules: [],
        stateMachines: [stateMachine],
      });

      rulesSystem.initialize(systemContext, {
        rules: [],
        stateMachines: [stateMachine],
      });

      rulesSystem.setRuntimeState(gameStateWithSM);
      rulesSystem.setEventBus(eventBus);

      expect(gameStateWithSM.stateMachines['player'].current).toBe('idle');
    });

    it('should transition state machines on events', () => {
      const stateMachine: StateMachineDefinition = {
        id: 'player',
        initialState: 'idle',
        states: [
          { id: 'idle' },
          { id: 'running' },
        ],
        transitions: [
          {
            id: 'idle-to-running',
            from: 'idle',
            to: 'running',
            trigger: {
              type: 'event',
              eventName: 'move',
            },
          },
        ],
      };

      const gameStateWithSM = createGameState({
        metadata: { id: 'test', title: 'Test', version: '1.0.0' },
        world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
        templates: {},
        entities: [],
        stateMachines: [stateMachine],
      });

      setGameStateValue(gameStateWithSM, 'playing');

      const rule: GameRule = {
        id: 'trigger-event-rule',
        trigger: {
          type: 'frame',
        },
        conditions: [],
        actions: [
          {
            type: 'event',
            eventName: 'move',
          },
        ],
      };

      rulesSystem = new RulesSystem({
        rules: [rule],
        stateMachines: [stateMachine],
      });

      rulesSystem.initialize(systemContext, {
        rules: [rule],
        stateMachines: [stateMachine],
      });

      rulesSystem.setRuntimeState(gameStateWithSM);
      rulesSystem.setEventBus(eventBus);

      const updateContext: UpdateContext = {
        dt: 0.016,
        elapsed: 0,
        frameId: 0,
        input: {} as any,
        gameState: { state: 'playing' } as any,
        frame: {
          inputEvents: [],
          collisions: [],
        },
      };

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });

      expect(gameStateWithSM.stateMachines['player'].current).toBe('running');
      expect(gameStateWithSM.stateMachines['player'].previous).toBe('idle');
      expect(gameStateWithSM.stateMachines['player'].transitionCount).toBe(1);
    });
  });

  describe('Event Bus Integration', () => {
    it('should emit gameStateChanged event when game state changes', () => {
      const events: any[] = [];
      eventBus.subscribe((event) => {
        if (event.type === 'gameStateChanged') {
          events.push(event);
        }
      });

      rulesSystem = new RulesSystem({
        rules: [],
        winCondition: {
          expr: 'score >= 100',
        },
        variables: { score: 0 },
      });

      rulesSystem.initialize(systemContext, {
        rules: [],
        winCondition: {
          expr: 'score >= 100',
        },
        variables: { score: 0 },
      });

      setVar(gameState, 'score', 100, eventBus);

      rulesSystem.setRuntimeState(gameState);
      rulesSystem.setEventBus(eventBus);

      const updateContext: UpdateContext = {
        dt: 0.016,
        elapsed: 0,
        frameId: 0,
        input: {} as any,
        gameState: { state: 'playing' } as any,
        frame: {
          inputEvents: [],
          collisions: [],
        },
      };

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });
      eventBus.flush();

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.state === 'won')).toBe(true);
    });

    it('should emit varChanged events for variable changes', () => {
      const events: any[] = [];
      eventBus.subscribe((event) => {
        if (event.type === 'varChanged') {
          events.push(event);
        }
      });

      const rule: GameRule = {
        id: 'set-vars-rule',
        trigger: {
          type: 'frame',
        },
        conditions: [],
        actions: [
          {
            type: 'set_variable',
            name: 'score',
            operation: 'set',
            value: 50,
          },
          {
            type: 'set_variable',
            name: 'lives',
            operation: 'set',
            value: 2,
          },
        ],
      };

      rulesSystem = new RulesSystem({
        rules: [rule],
        variables: { score: 0, lives: 3 },
      });

      rulesSystem.initialize(systemContext, {
        rules: [rule],
        variables: { score: 0, lives: 3 },
      });

      rulesSystem.setRuntimeState(gameState);
      rulesSystem.setEventBus(eventBus);

      const updateContext: UpdateContext = {
        dt: 0.016,
        elapsed: 0,
        frameId: 0,
        input: {} as any,
        gameState: { state: 'playing' } as any,
        frame: {
          inputEvents: [],
          collisions: [],
        },
      };

      rulesSystem.update(updateContext, { gameState: 'playing', variables: {} });
      eventBus.flush();

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ type: 'varChanged', key: 'score', value: 50 });
      expect(events[1]).toEqual({ type: 'varChanged', key: 'lives', value: 2 });
    });
  });

  describe('getState', () => {
    it('should return current game state and variables', () => {
      rulesSystem = new RulesSystem({
        rules: [],
        variables: { score: 0, lives: 3 },
      });

      rulesSystem.initialize(systemContext, {
        rules: [],
        variables: { score: 0, lives: 3 },
      });

      setVar(gameState, 'score', 100, eventBus);
      setVar(gameState, 'lives', 5, eventBus);

      rulesSystem.setRuntimeState(gameState);
      rulesSystem.setEventBus(eventBus);

      const state = rulesSystem.getState();

      expect(state.gameState).toBe('playing');
      expect(state.variables.score).toBe(100);
      expect(state.variables.lives).toBe(5);
    });

    it('should return default state when not initialized', () => {
      rulesSystem = new RulesSystem({
        rules: [],
      });

      const state = rulesSystem.getState();

      expect(state.gameState).toBe('ready');
      expect(state.variables).toEqual({});
    });
  });
});
