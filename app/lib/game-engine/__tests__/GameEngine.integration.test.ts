import { describe, it, expect } from 'vitest';
import { createGameTestHarness, createMockEntity } from './testUtils';
import type { GameDefinition } from '@slopcade/shared';

describe('Game Engine Integration', () => {
  describe('Complete Game Scenarios', () => {
    it('should run a simple game with score variable and win condition', () => {
      const gameDef: GameDefinition = {
        metadata: { id: 'test-score', title: 'Score Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { score: 0 },
        templates: {},
        entities: [],
        rules: [{
          id: 'increment-score',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 10 }],
        }],
        winCondition: { expr: 'score >= 100' },
      };

      const harness = createGameTestHarness(gameDef);

      harness.runFrames(10);

      const state = harness.getState();
      expect(state.gameState).toBe('won');
      expect(state.variables.score).toBe(100);
    });

    it('should run a game with lives variable and lose condition', () => {
      const gameDef: GameDefinition = {
        metadata: { id: 'test-lives', title: 'Lives Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { lives: 3 },
        templates: {},
        entities: [],
        rules: [{
          id: 'decrement-lives',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'lives', operation: 'add', value: -1 }],
        }],
        loseCondition: { type: 'custom', expr: 'lives <= 0' },
      };

      const harness = createGameTestHarness(gameDef);

      harness.runFrames(3);

      const state = harness.getState();
      expect(state.gameState).toBe('lost');
      expect(state.variables.lives).toBe(0);
    });

    it('should run a game with rules that modify multiple variables', () => {
      const gameDef: GameDefinition = {
        metadata: { id: 'test-multi-var', title: 'Multi Variable Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { 
          score: 0,
          combo: 1,
          multiplier: 1,
        },
        templates: {},
        entities: [],
        rules: [
          {
            id: 'update-score-combo',
            trigger: { type: 'frame' },
            actions: [
              { type: 'set_variable', name: 'score', operation: 'add', value: { expr: '10 * multiplier' } },
              { type: 'set_variable', name: 'combo', operation: 'add', value: 1 },
            ],
          },
          {
            id: 'boost-multiplier',
            trigger: { type: 'frame' },
            conditions: [{ type: 'expression', expr: 'combo >= 5' }],
            actions: [
              { type: 'set_variable', name: 'multiplier', operation: 'set', value: 2 },
            ],
          },
        ],
        winCondition: { expr: 'score >= 100' },
      };

      const harness = createGameTestHarness(gameDef);

      harness.runFrames(10);

      const state = harness.getState();
      expect(state.gameState).toBe('won');
      expect(state.variables.combo).toBe(11);
      expect(state.variables.multiplier).toBe(2);
      expect(state.variables.score).toBe(100);
    });

    it('should run a game with collision rules', () => {
      const gameDef: GameDefinition = {
        metadata: { id: 'test-collision', title: 'Collision Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { hits: 0 },
        templates: {
          player: {
            id: 'player',
            tags: ['player'],
            physics: { bodyType: 'dynamic' },
          },
          enemy: {
            id: 'enemy',
            tags: ['enemy'],
            physics: { bodyType: 'dynamic' },
          },
        },
        entities: [],
        rules: [{
          id: 'collision-hit',
          trigger: { 
            type: 'collision',
            entityATag: 'player',
            entityBTag: 'enemy',
          },
          actions: [
            { type: 'set_variable', name: 'hits', operation: 'add', value: 1 },
          ],
        }],
      };

      const harness = createGameTestHarness(gameDef);

      const player = createMockEntity('player-1', ['player']);
      const enemy = createMockEntity('enemy-1', ['enemy']);

      (harness.entityManager.getEntitiesByTag as any).mockImplementation((tag: string) => {
        if (tag === 'player') return [player];
        if (tag === 'enemy') return [enemy];
        return [];
      });

      harness.runFrame({}, [{ 
        entityA: player, 
        entityB: enemy,
        normal: { x: 1, y: 0 },
        impulse: 1.0,
      }]);

      const state = harness.getState();
      expect(state.variables.hits).toBe(1);
    });

    it('should run a game with timer-based rules', () => {
      const gameDef: GameDefinition = {
        metadata: { id: 'test-timer', title: 'Timer Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { 
          timeBonus: 0,
          checkCount: 0,
        },
        templates: {},
        entities: [],
        rules: [
          {
            id: 'increment-check',
            trigger: { type: 'frame' },
            actions: [
              { type: 'set_variable', name: 'checkCount', operation: 'add', value: 1 },
            ],
          },
          {
            id: 'time-bonus',
            trigger: { type: 'frame' },
            conditions: [{ type: 'expression', expr: 'elapsed >= 1.0' }],
            actions: [
              { type: 'set_variable', name: 'timeBonus', operation: 'set', value: 100 },
            ],
          },
        ],
      };

      const harness = createGameTestHarness(gameDef);

      harness.runFrames(60);

      let state = harness.getState();
      expect(state.variables.timeBonus).toBe(0);
      expect(state.variables.checkCount).toBe(60);

      harness.runFrames(5);

      state = harness.getState();
      expect(state.variables.timeBonus).toBe(100);
      expect(state.variables.checkCount).toBe(65);
    });
  });

  describe('Variable System Integration', () => {
    it('should initialize variables correctly from game definition', () => {
      const gameDef: GameDefinition = {
        metadata: { id: 'test-init', title: 'Init Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { 
          score: 0,
          lives: 3,
          powerUp: false,
          playerName: 'Hero',
        },
        templates: {},
        entities: [],
      };

      const harness = createGameTestHarness(gameDef);
      const state = harness.getState();

      expect(state.variables.score).toBe(0);
      expect(state.variables.lives).toBe(3);
      expect(state.variables.powerUp).toBe(false);
      expect(state.variables.playerName).toBe('Hero');
    });

    it('should update variables through rules', () => {
      const gameDef: GameDefinition = {
        metadata: { id: 'test-update', title: 'Update Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { counter: 0 },
        templates: {},
        entities: [],
        rules: [{
          id: 'increment-counter',
          trigger: { type: 'frame' },
          actions: [
            { type: 'set_variable', name: 'counter', operation: 'add', value: 5 },
          ],
        }],
      };

      const harness = createGameTestHarness(gameDef);

      harness.runFrames(3);

      const state = harness.getState();
      expect(state.variables.counter).toBe(15);
    });

    it('should make variables accessible in expressions', () => {
      const gameDef: GameDefinition = {
        metadata: { id: 'test-expr', title: 'Expression Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { 
          base: 10,
          multiplier: 2,
          result: 0,
        },
        templates: {},
        entities: [],
        rules: [{
          id: 'calculate-result',
          trigger: { type: 'frame' },
          actions: [
            { type: 'set_variable', name: 'result', operation: 'set', value: { expr: 'base * multiplier' } },
          ],
        }],
      };

      const harness = createGameTestHarness(gameDef);

      harness.runFrame();

      const state = harness.getState();
      expect(state.variables.result).toBe(20);
    });

    it('should trigger varChanged events', () => {
      const gameDef: GameDefinition = {
        metadata: { id: 'test-events', title: 'Events Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { score: 0 },
        templates: {},
        entities: [],
        rules: [{
          id: 'increment-score',
          trigger: { type: 'frame' },
          actions: [
            { type: 'set_variable', name: 'score', operation: 'add', value: 10 },
          ],
        }],
      };

      const harness = createGameTestHarness(gameDef);

      const varChangedEvents: Array<{ key: string; value: any }> = [];
      harness.events.subscribe((event) => {
        if (event.type === 'varChanged') {
          varChangedEvents.push({ key: event.key, value: event.value });
        }
      });

      harness.runFrame();

      expect(varChangedEvents).toContainEqual({ key: 'score', value: 10 });
    });
  });

  describe('Win/Lose Conditions', () => {
    it('should evaluate expression-based win condition', () => {
      const gameDef: GameDefinition = {
        metadata: { id: 'test-win-expr', title: 'Win Expression Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { points: 0 },
        templates: {},
        entities: [],
        rules: [{
          id: 'add-points',
          trigger: { type: 'frame' },
          actions: [
            { type: 'set_variable', name: 'points', operation: 'add', value: 25 },
          ],
        }],
        winCondition: { expr: 'points >= 100' },
      };

      const harness = createGameTestHarness(gameDef);

      harness.runFrames(3);
      expect(harness.getState().gameState).toBe('playing');

      harness.runFrame();
      expect(harness.getState().gameState).toBe('won');
    });

    it('should evaluate expression-based lose condition', () => {
      const gameDef: GameDefinition = {
        metadata: { id: 'test-lose-expr', title: 'Lose Expression Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { health: 100 },
        templates: {},
        entities: [],
        rules: [{
          id: 'damage-health',
          trigger: { type: 'frame' },
          actions: [
            { type: 'set_variable', name: 'health', operation: 'add', value: -30 },
          ],
        }],
        loseCondition: { type: 'custom', expr: 'health <= 0' },
      };

      const harness = createGameTestHarness(gameDef);

      harness.runFrames(3);
      expect(harness.getState().gameState).toBe('playing');

      harness.runFrame();
      expect(harness.getState().gameState).toBe('lost');
    });

    it('should change game state to won or lost', () => {
      const winGameDef: GameDefinition = {
        metadata: { id: 'test-state-won', title: 'State Won Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { flag: 0 },
        templates: {},
        entities: [],
        rules: [{
          id: 'set-flag',
          trigger: { type: 'frame' },
          actions: [
            { type: 'set_variable', name: 'flag', operation: 'set', value: 1 },
          ],
        }],
        winCondition: { expr: 'flag == 1' },
      };

      const winHarness = createGameTestHarness(winGameDef);
      winHarness.runFrame();
      expect(winHarness.getState().gameState).toBe('won');

      const loseGameDef: GameDefinition = {
        metadata: { id: 'test-state-lost', title: 'State Lost Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { flag: 0 },
        templates: {},
        entities: [],
        rules: [{
          id: 'set-flag',
          trigger: { type: 'frame' },
          actions: [
            { type: 'set_variable', name: 'flag', operation: 'set', value: 1 },
          ],
        }],
        loseCondition: { type: 'custom', expr: 'flag == 1' },
      };

      const loseHarness = createGameTestHarness(loseGameDef);
      loseHarness.runFrame();
      expect(loseHarness.getState().gameState).toBe('lost');
    });

    it('should stop processing rules after win/lose', () => {
      const gameDef: GameDefinition = {
        metadata: { id: 'test-stop-rules', title: 'Stop Rules Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { 
          score: 0,
          extraCounter: 0,
        },
        templates: {},
        entities: [],
        rules: [
          {
            id: 'add-score',
            trigger: { type: 'frame' },
            actions: [
              { type: 'set_variable', name: 'score', operation: 'add', value: 50 },
            ],
          },
          {
            id: 'increment-extra',
            trigger: { type: 'frame' },
            actions: [
              { type: 'set_variable', name: 'extraCounter', operation: 'add', value: 1 },
            ],
          },
        ],
        winCondition: { expr: 'score >= 100' },
      };

      const harness = createGameTestHarness(gameDef);

      harness.runFrames(2);
      expect(harness.getState().gameState).toBe('won');
      expect(harness.getState().variables.score).toBe(100);
      expect(harness.getState().variables.extraCounter).toBe(2);

      harness.runFrames(3);
      expect(harness.getState().variables.score).toBe(100);
      expect(harness.getState().variables.extraCounter).toBe(2);
    });
  });

  describe('Event Flow', () => {
    it('should emit varChanged events', () => {
      const gameDef: GameDefinition = {
        metadata: { id: 'test-var-events', title: 'Var Events Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { 
          score: 0,
          lives: 3,
        },
        templates: {},
        entities: [],
        rules: [{
          id: 'update-vars',
          trigger: { type: 'frame' },
          actions: [
            { type: 'set_variable', name: 'score', operation: 'add', value: 10 },
            { type: 'set_variable', name: 'lives', operation: 'add', value: -1 },
          ],
        }],
      };

      const harness = createGameTestHarness(gameDef);

      const events: Array<{ key: string; value: any }> = [];
      harness.events.subscribe((event) => {
        if (event.type === 'varChanged') {
          events.push({ key: event.key, value: event.value });
        }
      });

      harness.runFrame();

      expect(events).toContainEqual({ key: 'score', value: 10 });
      expect(events).toContainEqual({ key: 'lives', value: 2 });
    });

    it('should emit gameStateChanged events', () => {
      const gameDef: GameDefinition = {
        metadata: { id: 'test-state-events', title: 'State Events Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { trigger: 0 },
        templates: {},
        entities: [],
        rules: [{
          id: 'set-trigger',
          trigger: { type: 'frame' },
          actions: [
            { type: 'set_variable', name: 'trigger', operation: 'set', value: 1 },
          ],
        }],
        winCondition: { expr: 'trigger == 1' },
      };

      const harness = createGameTestHarness(gameDef);

      const stateEvents: string[] = [];
      harness.events.subscribe((event) => {
        if (event.type === 'gameStateChanged') {
          stateEvents.push(event.state);
        }
      });

      harness.runFrame();

      expect(stateEvents).toContain('won');
    });

    it('should allow subscribing to events', () => {
      const gameDef: GameDefinition = {
        metadata: { id: 'test-subscribe', title: 'Subscribe Test', version: '1.0.0' },
        world: { 
          bounds: { width: 10, height: 10 },
          gravity: { x: 0, y: 0 },
          pixelsPerMeter: 100,
        },
        variables: { value: 0 },
        templates: {},
        entities: [],
        rules: [{
          id: 'increment-value',
          trigger: { type: 'frame' },
          actions: [
            { type: 'set_variable', name: 'value', operation: 'add', value: 1 },
          ],
        }],
      };

      const harness = createGameTestHarness(gameDef);

      let callCount = 0;
      const unsubscribe = harness.events.subscribe((event) => {
        if (event.type === 'varChanged') {
          callCount++;
        }
      });

      harness.runFrames(3);
      expect(callCount).toBe(3);

      unsubscribe();
      harness.runFrames(2);
      expect(callCount).toBe(3);
    });
  });
});
