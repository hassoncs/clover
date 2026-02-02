import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RulesSystem } from '../systems/runner/wrappers/RulesSystem';
import type { EntityManager } from '../EntityManager';
import type { Physics2D } from '../../physics2d/Physics2D';
import type { InputEvents, CollisionInfo } from '../BehaviorContext';
import type { RuntimeEntity } from '../types';
import type { EvalContext, GameDefinition } from '@slopcade/shared';
import { createSeededRandom } from '@slopcade/shared';
import type { GameState as RuntimeGameState, GameEventBus } from '../runtime/types';
import { createGameState } from '../runtime/GameStateHelpers';
import { createGameEventBus } from '../runtime/GameEventBus';
import * as StateHelpers from '../runtime/GameStateHelpers';

function createMockEntityManager(): EntityManager {
  return {
    getEntityCountByTag: vi.fn().mockReturnValue(0),
    getEntitiesByTag: vi.fn().mockReturnValue([]),
    getEntity: vi.fn(),
    destroyEntity: vi.fn(),
    clearAll: vi.fn(),
    createEntity: vi.fn(),
    getTemplate: vi.fn().mockReturnValue({ id: 'test' }),
    getActiveEntities: vi.fn().mockReturnValue([]),
    getVisibleEntities: vi.fn().mockReturnValue([]),
  } as any;
}

function createMockPhysics(): Physics2D {
  return {
    applyImpulseToCenter: vi.fn(),
    applyForceToCenter: vi.fn(),
    setLinearVelocity: vi.fn(),
    getLinearVelocity: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    setAngularVelocity: vi.fn(),
    raycast: vi.fn().mockReturnValue(null),
    getTransform: vi.fn().mockReturnValue({ position: { x: 0, y: 0 } }),
  } as any;
}

function createMockEntity(id: string, tags: string[] = []): RuntimeEntity {
  return {
    id,
    name: id,
    tags,
    transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    physics: { bodyType: 'dynamic' },
  } as RuntimeEntity;
}

function createMinimalGameDefinition(): GameDefinition {
  return {
    metadata: { id: 'test', title: 'Test', version: '1.0.0' },
    world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50, bounds: { width: 20, height: 12 } },
    templates: {},
    entities: [],
    rules: [],
  };
}

describe('RulesSystem', () => {
  let evaluator: RulesSystem;
  let mockEntityManager: EntityManager;
  let mockPhysics: Physics2D;
  let gameState: RuntimeGameState;
  let eventBus: GameEventBus;

  beforeEach(() => {
    mockEntityManager = createMockEntityManager();
    mockPhysics = createMockPhysics();
    evaluator = new RulesSystem({ rules: [] });
    evaluator.initialize({
      entityManager: mockEntityManager,
      physics: mockPhysics,
      bridge: { 
        playSound: vi.fn(),
      } as any,
      eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as any,
      eventQueue: { enqueue: vi.fn(), process: vi.fn(), clear: vi.fn() } as any,
    }, { rules: [] });
    evaluator.setRuntimeState(createGameState(createMinimalGameDefinition()));
    evaluator.setEventBus(createGameEventBus());
    
    gameState = createGameState(createMinimalGameDefinition());
    eventBus = createGameEventBus();
  });

  const startGame = () => {
    StateHelpers.setGameStateValue(gameState, 'playing', eventBus);
  };

  const runUpdate = (inputEvents: InputEvents = {}, collisions: CollisionInfo[] = []) => {
    const evalContext: EvalContext = {
      score: StateHelpers.getScore(gameState),
      lives: StateHelpers.getLives(gameState),
      time: StateHelpers.getElapsed(gameState),
      wave: 1,
      dt: 0.016,
      frameId: 0,
      variables: Object.fromEntries(
        Object.entries(gameState.vars).filter(([k]) => 
          !['score', 'lives', 'gameState', 'elapsed'].includes(k)
        )
      ),
      random: Math.random,
      entityManager: mockEntityManager,
    };
    evaluator.update(0.016, mockEntityManager, collisions, {}, inputEvents, mockPhysics, gameState, eventBus, undefined, evalContext);
  };

  describe('Game State Management', () => {
    it('starts in ready state', () => {
      expect(StateHelpers.getGameStateValue(gameState)).toBe('ready');
    });

    it('transitions to playing on start', () => {
      startGame();
      expect(StateHelpers.getGameStateValue(gameState)).toBe('playing');
    });

    it('pauses and resumes correctly', () => {
      startGame();
      StateHelpers.setGameStateValue(gameState, 'paused', eventBus);
      expect(StateHelpers.getGameStateValue(gameState)).toBe('paused');
      StateHelpers.setGameStateValue(gameState, 'playing', eventBus);
      expect(StateHelpers.getGameStateValue(gameState)).toBe('playing');
    });

    it('resets all state correctly', () => {
      startGame();
      StateHelpers.addScore(gameState, 100, eventBus);
      StateHelpers.addLives(gameState, -2, eventBus);
      StateHelpers.setVar(gameState, 'test', 42, eventBus);
      StateHelpers.setList(gameState, 'deck', [1, 2, 3]);
      
      StateHelpers.resetGameState(gameState);
      
      expect(StateHelpers.getScore(gameState)).toBe(0);
      expect(StateHelpers.getLives(gameState)).toBe(3);
      expect(StateHelpers.getVar(gameState, 'test')).toBeUndefined();
      expect(StateHelpers.getList(gameState, 'deck')).toBeUndefined();
      expect(StateHelpers.getGameStateValue(gameState)).toBe('ready');
    });

    it('emits gameStateChanged event on state change', () => {
      const handler = vi.fn();
      eventBus.subscribe(handler);
      
      startGame();
      expect(handler).toHaveBeenCalledWith({ type: 'gameStateChanged', state: 'playing' });
    });
  });

  describe('Score System', () => {
    beforeEach(() => startGame());

    it('adds score correctly', () => {
      StateHelpers.addScore(gameState, 50, eventBus);
      expect(StateHelpers.getScore(gameState)).toBe(50);
      StateHelpers.addScore(gameState, 25, eventBus);
      expect(StateHelpers.getScore(gameState)).toBe(75);
    });

    it('sets score directly', () => {
      StateHelpers.addScore(gameState, 100, eventBus);
      StateHelpers.setScore(gameState, 42, eventBus);
      expect(StateHelpers.getScore(gameState)).toBe(42);
    });

    it('emits scoreChanged event on score change', () => {
      const handler = vi.fn();
      eventBus.subscribe(handler);
      
      StateHelpers.addScore(gameState, 10, eventBus);
      expect(handler).toHaveBeenCalledWith({ type: 'varChanged', key: 'score', value: 10 });
    });
  });

  describe('Lives System', () => {
    beforeEach(() => startGame());

    it('starts with 3 lives by default', () => {
      expect(StateHelpers.getLives(gameState)).toBe(3);
    });

    it('can set initial lives via game definition', () => {
      const customDef = createMinimalGameDefinition();
      customDef.variables = { ...customDef.variables, lives: 5 };
      const customState = createGameState(customDef);
      expect(StateHelpers.getLives(customState)).toBe(5);
    });

    it('adds and subtracts lives', () => {
      StateHelpers.addLives(gameState, 2, eventBus);
      expect(StateHelpers.getLives(gameState)).toBe(5);
      StateHelpers.addLives(gameState, -3, eventBus);
      expect(StateHelpers.getLives(gameState)).toBe(2);
    });

    it('emits livesChanged event on lives change', () => {
      const handler = vi.fn();
      eventBus.subscribe(handler);
      
      StateHelpers.addLives(gameState, -1, eventBus);
      expect(handler).toHaveBeenCalledWith({ type: 'varChanged', key: 'lives', value: 2 });
    });
  });

  describe('Variable System', () => {
    beforeEach(() => startGame());

    it('sets and gets number variables', () => {
      StateHelpers.setVar(gameState, 'health', 100);
      expect(StateHelpers.getVar(gameState, 'health')).toBe(100);
    });

    it('sets and gets string variables', () => {
      StateHelpers.setVar(gameState, 'playerName', 'Hero');
      expect(StateHelpers.getVar(gameState, 'playerName')).toBe('Hero');
    });

    it('sets and gets boolean variables', () => {
      StateHelpers.setVar(gameState, 'isInvincible', true);
      expect(StateHelpers.getVar(gameState, 'isInvincible')).toBe(true);
    });

    it('returns undefined for non-existent variables', () => {
      expect(StateHelpers.getVar(gameState, 'nonexistent')).toBeUndefined();
    });

    it('overwrites existing variables', () => {
      StateHelpers.setVar(gameState, 'counter', 1);
      StateHelpers.setVar(gameState, 'counter', 2);
      expect(StateHelpers.getVar(gameState, 'counter')).toBe(2);
    });
  });

  describe('List System', () => {
    beforeEach(() => startGame());

    it('creates and retrieves lists', () => {
      StateHelpers.setList(gameState, 'inventory', [1, 2, 3]);
      expect(StateHelpers.getList(gameState, 'inventory')).toEqual([1, 2, 3]);
    });

    it('pushes items to list', () => {
      StateHelpers.setList(gameState, 'items', ['sword']);
      StateHelpers.pushToList(gameState, 'items', 'shield');
      expect(StateHelpers.getList(gameState, 'items')).toEqual(['sword', 'shield']);
    });

    it('pushes to non-existent list creates it', () => {
      StateHelpers.pushToList(gameState, 'newList', 'first');
      expect(StateHelpers.getList(gameState, 'newList')).toEqual(['first']);
    });

    it('pops from back of list', () => {
      StateHelpers.setList(gameState, 'stack', [1, 2, 3]);
      const popped = StateHelpers.popFromList(gameState, 'stack', 'back');
      expect(popped).toBe(3);
      expect(StateHelpers.getList(gameState, 'stack')).toEqual([1, 2]);
    });

    it('pops from front of list', () => {
      StateHelpers.setList(gameState, 'queue', [1, 2, 3]);
      const popped = StateHelpers.popFromList(gameState, 'queue', 'front');
      expect(popped).toBe(1);
      expect(StateHelpers.getList(gameState, 'queue')).toEqual([2, 3]);
    });

    it('returns undefined when popping from empty list', () => {
      StateHelpers.setList(gameState, 'empty', []);
      expect(StateHelpers.popFromList(gameState, 'empty', 'back')).toBeUndefined();
    });

    it('returns undefined when popping from non-existent list', () => {
      expect(StateHelpers.popFromList(gameState, 'nonexistent', 'back')).toBeUndefined();
    });

    it('shuffles list deterministically with seeded random', () => {
      const seededRandom = createSeededRandom(42);
      StateHelpers.setList(gameState, 'deck', [1, 2, 3, 4, 5]);
      StateHelpers.shuffleList(gameState, 'deck', seededRandom);
      
      const seededRandom2 = createSeededRandom(42);
      StateHelpers.setList(gameState, 'deck2', [1, 2, 3, 4, 5]);
      StateHelpers.shuffleList(gameState, 'deck2', seededRandom2);
      
      expect(StateHelpers.getList(gameState, 'deck')).toEqual(StateHelpers.getList(gameState, 'deck2'));
    });

    it('checks list contains correctly', () => {
      StateHelpers.setList(gameState, 'colors', ['red', 'green', 'blue']);
      expect(StateHelpers.listContains(gameState, 'colors', 'green')).toBe(true);
      expect(StateHelpers.listContains(gameState, 'colors', 'yellow')).toBe(false);
    });

    it('returns false for contains on non-existent list', () => {
      expect(StateHelpers.listContains(gameState, 'nonexistent', 'value')).toBe(false);
    });
  });

  describe('Cooldown System', () => {
    beforeEach(() => startGame());

    it('sets and respects cooldowns', () => {
      StateHelpers.setCooldown(gameState, 'jump', 1.0);
      
      evaluator.loadRules([{
        id: 'jump-rule',
        trigger: { type: 'frame' },
        actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 10 }],
        cooldown: 0.5,
      }]);

      runUpdate();
      expect(StateHelpers.getScore(gameState)).toBe(10);
      
      runUpdate();
      expect(StateHelpers.getScore(gameState)).toBe(10);
    });
  });

  describe('Triggers', () => {
    beforeEach(() => startGame());

    describe('Score Trigger (via expression condition)', () => {
      it('fires when score >= threshold', () => {
        evaluator.loadRules([{
          id: 'score-rule',
          trigger: { type: 'frame' },
          conditions: [{ type: 'expression', expr: 'score >= 100' }],
          actions: [{ type: 'set_variable', name: 'lives', operation: 'add', value: 1 }],
          fireOnce: true,
        }]);

        StateHelpers.setScore(gameState, 99);
        runUpdate();
        expect(StateHelpers.getLives(gameState)).toBe(3);

        StateHelpers.setScore(gameState, 100);
        runUpdate();
        expect(StateHelpers.getLives(gameState)).toBe(4);
      });

      it('fires when score <= threshold', () => {
        evaluator.loadRules([{
          id: 'low-score',
          trigger: { type: 'frame' },
          conditions: [{ type: 'expression', expr: 'score <= 10' }],
          actions: [{ type: 'game_state', state: 'lose' }],
          fireOnce: true,
        }]);

        StateHelpers.setScore(gameState, 5);
        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('lost');
      });
    });

    describe('Timer Trigger', () => {
      it('fires after specified time', () => {
        evaluator.loadRules([{
          id: 'timer-rule',
          trigger: { type: 'timer', time: 0.05 },
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 50 }],
          fireOnce: true,
        }]);

        runUpdate();
        runUpdate();
        runUpdate();
        runUpdate();
        
        expect(StateHelpers.getScore(gameState)).toBe(50);
      });
    });

    describe('Tap Trigger', () => {
      it('fires on tap event', () => {
        evaluator.loadRules([{
          id: 'tap-rule',
          trigger: { type: 'tap' },
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 100 }],
        }]);

        runUpdate({ tap: { x: 100, y: 100, worldX: 5, worldY: 5 } });
        expect(StateHelpers.getScore(gameState)).toBe(100);
      });

      it('does not fire without tap event', () => {
        evaluator.loadRules([{
          id: 'tap-rule',
          trigger: { type: 'tap' },
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 100 }],
        }]);

        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(0);
      });
    });

    describe('Frame Trigger', () => {
      it('fires every frame', () => {
        evaluator.loadRules([{
          id: 'frame-rule',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 1 }],
        }]);

        runUpdate();
        runUpdate();
        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(3);
      });
    });

    describe('Event Trigger', () => {
      it('fires on custom event', () => {
        evaluator.loadRules([{
          id: 'event-rule',
          trigger: { type: 'event', eventName: 'powerup_collected' },
          actions: [{ type: 'set_variable', name: 'score', operation: 'multiply', value: 2 }],
        }]);

        StateHelpers.setScore(gameState, 50);
        StateHelpers.triggerEvent(gameState, 'powerup_collected');
        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(100);
      });
    });

    describe('Collision Trigger', () => {
      it('fires on collision between tagged entities', () => {
        const player = createMockEntity('player1', ['player']);
        const coin = createMockEntity('coin1', ['coin']);
        
        evaluator.loadRules([{
          id: 'collect-coin',
          trigger: { type: 'collision', entityATag: 'player', entityBTag: 'coin' },
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 10 }],
        }]);

        const collision: CollisionInfo = {
          entityA: player,
          entityB: coin,
          normal: { x: 0, y: 1 },
          impulse: 5,
        };

        runUpdate({}, [collision]);
        expect(StateHelpers.getScore(gameState)).toBe(10);
      });
    });

    describe('Entity Count Trigger', () => {
      it('fires when entity count reaches zero', () => {
        mockEntityManager.getEntityCountByTag = vi.fn().mockReturnValue(0);
        
        evaluator.loadRules([{
          id: 'all-destroyed',
          trigger: { type: 'entity_count', tag: 'enemy', count: 0, comparison: 'zero' },
          actions: [{ type: 'game_state', state: 'win' }],
        }]);

        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('won');
      });
    });

    describe('Button Trigger', () => {
      it('fires on button press', () => {
        evaluator.loadRules([{
          id: 'jump-button',
          trigger: { type: 'button', button: 'jump', state: 'pressed' },
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 5 }],
        }]);

        runUpdate({ buttonPressed: new Set(['jump']) });
        expect(StateHelpers.getScore(gameState)).toBe(5);
      });
    });

    describe('GameStart Trigger', () => {
      it('fires once at game start', () => {
        evaluator.loadRules([{
          id: 'init-rule',
          trigger: { type: 'gameStart' },
          actions: [{ type: 'set_variable', name: 'initialized', operation: 'set', value: true }],
          fireOnce: true,
        }]);

        runUpdate({ gameStarted: true });
        expect(StateHelpers.getVar(gameState, 'initialized')).toBe(true);
      });
    });
  });

  describe('Conditions', () => {
    beforeEach(() => startGame());

    describe('Score Condition (via expression)', () => {
      it('passes when score in range', () => {
        evaluator.loadRules([{
          id: 'score-cond',
          trigger: { type: 'frame' },
          conditions: [{ type: 'expression', expr: 'score >= 50 && score <= 100' }],
          actions: [{ type: 'set_variable', name: 'lives', operation: 'add', value: 1 }],
          fireOnce: true,
        }]);

        StateHelpers.setScore(gameState, 75);
        runUpdate();
        expect(StateHelpers.getLives(gameState)).toBe(4);
      });

      it('fails when score out of range', () => {
        evaluator.loadRules([{
          id: 'score-cond',
          trigger: { type: 'frame' },
          conditions: [{ type: 'expression', expr: 'score >= 50 && score <= 100' }],
          actions: [{ type: 'set_variable', name: 'lives', operation: 'add', value: 1 }],
        }]);

        StateHelpers.setScore(gameState, 25);
        runUpdate();
        expect(StateHelpers.getLives(gameState)).toBe(3);
      });
    });

    describe('Time Condition', () => {
      it('passes when time in range', () => {
        evaluator.loadRules([{
          id: 'time-cond',
          trigger: { type: 'frame' },
          conditions: [{ type: 'time', min: 0, max: 1 }],
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 1 }],
        }]);

        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(1);
      });
    });

    describe('Variable Condition', () => {
      it('evaluates equality', () => {
        evaluator.loadRules([{
          id: 'var-eq',
          trigger: { type: 'frame' },
          conditions: [{ type: 'variable', name: 'level', comparison: 'eq', value: 5 }],
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 100 }],
        }]);

        StateHelpers.setVar(gameState, 'level', 5);
        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(100);
      });

      it('evaluates greater than', () => {
        evaluator.loadRules([{
          id: 'var-gt',
          trigger: { type: 'frame' },
          conditions: [{ type: 'variable', name: 'health', comparison: 'gt', value: 50 }],
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 10 }],
        }]);

        StateHelpers.setVar(gameState, 'health', 75);
        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(10);

        StateHelpers.setVar(gameState, 'health', 50);
        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(10);
      });

      it('evaluates less than or equal', () => {
        evaluator.loadRules([{
          id: 'var-lte',
          trigger: { type: 'frame' },
          conditions: [{ type: 'variable', name: 'ammo', comparison: 'lte', value: 0 }],
          actions: [{ type: 'game_state', state: 'lose' }],
        }]);

        StateHelpers.setVar(gameState, 'ammo', 0);
        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('lost');
      });

      it('evaluates not equal', () => {
        evaluator.loadRules([{
          id: 'var-neq',
          trigger: { type: 'frame' },
          conditions: [{ type: 'variable', name: 'state', comparison: 'neq', value: 'dead' }],
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 1 }],
        }]);

        StateHelpers.setVar(gameState, 'state', 'alive');
        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(1);
      });

      it('evaluates boolean equality', () => {
        evaluator.loadRules([{
          id: 'var-bool',
          trigger: { type: 'frame' },
          conditions: [{ type: 'variable', name: 'isBonus', comparison: 'eq', value: true }],
          actions: [{ type: 'set_variable', name: 'score', operation: 'multiply', value: 2 }],
        }]);

        StateHelpers.setScore(gameState, 50);
        StateHelpers.setVar(gameState, 'isBonus', true);
        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(100);
      });
    });

    describe('List Contains Condition', () => {
      it('passes when list contains value', () => {
        evaluator.loadRules([{
          id: 'has-key',
          trigger: { type: 'frame' },
          conditions: [{ type: 'list_contains', listName: 'inventory', value: 'key' }],
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 100 }],
        }]);

        StateHelpers.setList(gameState, 'inventory', ['sword', 'key', 'potion']);
        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(100);
      });

      it('fails when list does not contain value', () => {
        evaluator.loadRules([{
          id: 'has-key',
          trigger: { type: 'frame' },
          conditions: [{ type: 'list_contains', listName: 'inventory', value: 'key' }],
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 100 }],
        }]);

        StateHelpers.setList(gameState, 'inventory', ['sword', 'potion']);
        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(0);
      });

      it('supports negated condition', () => {
        evaluator.loadRules([{
          id: 'no-curse',
          trigger: { type: 'frame' },
          conditions: [{ type: 'list_contains', listName: 'effects', value: 'curse', negated: true }],
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 50 }],
        }]);

        StateHelpers.setList(gameState, 'effects', ['buff', 'shield']);
        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(50);
      });
    });

    describe('Entity Count Condition', () => {
      it('passes when count in range', () => {
        mockEntityManager.getEntityCountByTag = vi.fn().mockReturnValue(3);
        
        evaluator.loadRules([{
          id: 'enemy-count',
          trigger: { type: 'frame' },
          conditions: [{ type: 'entity_count', tag: 'enemy', min: 1, max: 5 }],
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 10 }],
        }]);

        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(10);
      });
    });

    describe('Cooldown Ready Condition', () => {
      it('passes when cooldown expired', () => {
        evaluator.loadRules([{
          id: 'ability',
          trigger: { type: 'frame' },
          conditions: [{ type: 'cooldown_ready', cooldownId: 'fireball' }],
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 25 }],
        }]);

        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(25);
      });
    });

    describe('Multiple Conditions (AND logic)', () => {
      it('requires all conditions to pass', () => {
        evaluator.loadRules([{
          id: 'multi-cond',
          trigger: { type: 'frame' },
          conditions: [
            { type: 'variable', name: 'hasKey', comparison: 'eq', value: true },
            { type: 'expression', expr: 'score >= 100' },
          ],
          actions: [{ type: 'game_state', state: 'win' }],
          fireOnce: true,
        }]);

        StateHelpers.setVar(gameState, 'hasKey', true);
        StateHelpers.setScore(gameState, 50);
        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('playing');

        StateHelpers.setScore(gameState, 100);
        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('won');
      });
    });
  });

  describe('Actions', () => {
    beforeEach(() => startGame());

    describe('Score Action', () => {
      it('adds score', () => {
        evaluator.loadRules([{
          id: 'add-score',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 10 }],
        }]);

        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(10);
      });

      it('subtracts score', () => {
        StateHelpers.setScore(gameState, 100);
        evaluator.loadRules([{
          id: 'sub-score',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'score', operation: 'subtract', value: 25 }],
        }]);

        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(75);
      });

      it('multiplies score', () => {
        StateHelpers.setScore(gameState, 50);
        evaluator.loadRules([{
          id: 'mult-score',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'score', operation: 'multiply', value: 2 }],
        }]);

        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(100);
      });

      it('sets score directly', () => {
        StateHelpers.setScore(gameState, 999);
        evaluator.loadRules([{
          id: 'set-score',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'score', operation: 'set', value: 0 }],
        }]);

        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(0);
      });
    });

    describe('Lives Action', () => {
      it('adds lives', () => {
        evaluator.loadRules([{
          id: 'add-life',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'lives', operation: 'add', value: 1 }],
        }]);

        runUpdate();
        expect(StateHelpers.getLives(gameState)).toBe(4);
      });

      it('subtracts lives', () => {
        evaluator.loadRules([{
          id: 'lose-life',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'lives', operation: 'subtract', value: 1 }],
        }]);

        runUpdate();
        expect(StateHelpers.getLives(gameState)).toBe(2);
      });

      it('sets lives directly', () => {
        evaluator.loadRules([{
          id: 'set-lives',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'lives', operation: 'set', value: 99 }],
        }]);

        runUpdate();
        expect(StateHelpers.getLives(gameState)).toBe(99);
      });
    });

    describe('Set Variable Action', () => {
      it('sets variable', () => {
        evaluator.loadRules([{
          id: 'set-var',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'counter', operation: 'set', value: 42 }],
        }]);

        runUpdate();
        expect(StateHelpers.getVar(gameState, 'counter')).toBe(42);
      });

      it('adds to variable', () => {
        StateHelpers.setVar(gameState, 'counter', 10);
        evaluator.loadRules([{
          id: 'add-var',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'counter', operation: 'add', value: 5 }],
        }]);

        runUpdate();
        expect(StateHelpers.getVar(gameState, 'counter')).toBe(15);
      });

      it('subtracts from variable', () => {
        StateHelpers.setVar(gameState, 'health', 100);
        evaluator.loadRules([{
          id: 'sub-var',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'health', operation: 'subtract', value: 25 }],
        }]);

        runUpdate();
        expect(StateHelpers.getVar(gameState, 'health')).toBe(75);
      });

      it('multiplies variable', () => {
        StateHelpers.setVar(gameState, 'multiplier', 2);
        evaluator.loadRules([{
          id: 'mult-var',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'multiplier', operation: 'multiply', value: 3 }],
        }]);

        runUpdate();
        expect(StateHelpers.getVar(gameState, 'multiplier')).toBe(6);
      });

      it('toggles boolean variable', () => {
        StateHelpers.setVar(gameState, 'isActive', false);
        evaluator.loadRules([{
          id: 'toggle-var',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'isActive', operation: 'toggle', value: true }],
        }]);

        runUpdate();
        expect(StateHelpers.getVar(gameState, 'isActive')).toBe(true);
        runUpdate();
        expect(StateHelpers.getVar(gameState, 'isActive')).toBe(false);
      });

      it('concatenates strings with add', () => {
        StateHelpers.setVar(gameState, 'message', 'Hello');
        evaluator.loadRules([{
          id: 'concat-var',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'message', operation: 'add', value: ' World' }],
        }]);

        runUpdate();
        expect(StateHelpers.getVar(gameState, 'message')).toBe('Hello World');
      });
    });

    describe('List Actions', () => {
      it('pushes to list', () => {
        StateHelpers.setList(gameState, 'items', ['a']);
        evaluator.loadRules([{
          id: 'push-list',
          trigger: { type: 'frame' },
          actions: [{ type: 'push_to_list', listName: 'items', value: 'b' }],
        }]);

        runUpdate();
        expect(StateHelpers.getList(gameState, 'items')).toEqual(['a', 'b']);
      });

      it('pops from list and stores in variable', () => {
        StateHelpers.setList(gameState, 'deck', [1, 2, 3]);
        evaluator.loadRules([{
          id: 'pop-list',
          trigger: { type: 'frame' },
          actions: [{ type: 'pop_from_list', listName: 'deck', position: 'back', storeIn: 'drawnCard' }],
        }]);

        runUpdate();
        expect(StateHelpers.getVar(gameState, 'drawnCard')).toBe(3);
        expect(StateHelpers.getList(gameState, 'deck')).toEqual([1, 2]);
      });

      it('shuffles list', () => {
        StateHelpers.setList(gameState, 'deck', [1, 2, 3, 4, 5]);
        evaluator.loadRules([{
          id: 'shuffle-list',
          trigger: { type: 'frame' },
          actions: [{ type: 'shuffle_list', listName: 'deck' }],
        }]);

        runUpdate();
        const shuffled = StateHelpers.getList(gameState, 'deck');
        expect(shuffled).toHaveLength(5);
        expect(shuffled?.sort()).toEqual([1, 2, 3, 4, 5]);
      });
    });

    describe('Game State Action', () => {
      it('sets win state', () => {
        evaluator.loadRules([{
          id: 'win-game',
          trigger: { type: 'frame' },
          actions: [{ type: 'game_state', state: 'win' }],
        }]);

        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('won');
      });

      it('sets lose state', () => {
        evaluator.loadRules([{
          id: 'lose-game',
          trigger: { type: 'frame' },
          actions: [{ type: 'game_state', state: 'lose' }],
        }]);

        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('lost');
      });

      it('pauses game', () => {
        evaluator.loadRules([{
          id: 'pause-game',
          trigger: { type: 'frame' },
          actions: [{ type: 'game_state', state: 'pause' }],
        }]);

        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('paused');
      });
    });

    describe('Event Action', () => {
      it('triggers custom event', () => {
        let eventFired = false;
        evaluator.loadRules([
          {
            id: 'fire-event',
            trigger: { type: 'frame' },
            actions: [{ type: 'event', eventName: 'custom_event' }],
            fireOnce: true,
          },
          {
            id: 'handle-event',
            trigger: { type: 'event', eventName: 'custom_event' },
            actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 999 }],
          },
        ]);

        runUpdate();
        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(999);
      });
    });

    describe('Cooldown Action', () => {
      it('starts cooldown that blocks rule', () => {
        evaluator.loadRules([{
          id: 'cooldown-rule',
          trigger: { type: 'frame' },
          actions: [
            { type: 'set_variable', name: 'score', operation: 'add', value: 10 },
            { type: 'start_cooldown', cooldownId: 'ability', duration: 1.0 },
          ],
        }]);

        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(10);
      });
    });

    describe('Physics Actions', () => {
      it('applies impulse to entity', () => {
        const entity = createMockEntity('player', ['player']);
        mockEntityManager.getEntitiesByTag = vi.fn().mockReturnValue([entity]);

        evaluator.loadRules([{
          id: 'jump',
          trigger: { type: 'frame' },
          actions: [{ type: 'apply_impulse', target: { type: 'by_tag', tag: 'player' }, y: -10 }],
        }]);

        runUpdate();
        expect(mockPhysics.applyImpulseToCenter).toHaveBeenCalled();
      });

      it('sets velocity on entity', () => {
        const entity = createMockEntity('ball', ['ball']);
        mockEntityManager.getEntitiesByTag = vi.fn().mockReturnValue([entity]);

        evaluator.loadRules([{
          id: 'launch',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_velocity', target: { type: 'by_tag', tag: 'ball' }, x: 5, y: -5 }],
        }]);

        runUpdate();
        expect(mockPhysics.setLinearVelocity).toHaveBeenCalled();
      });
    });

    describe('Spawn Action', () => {
      it('spawns entity at fixed position', () => {
        evaluator.loadRules([{
          id: 'spawn-enemy',
          trigger: { type: 'frame' },
          actions: [{ type: 'spawn', template: 'enemy', position: { type: 'fixed', x: 5, y: 5 } }],
        }]);

        runUpdate();
        expect(mockEntityManager.createEntity).toHaveBeenCalled();
      });

      it('spawns multiple entities', () => {
        evaluator.loadRules([{
          id: 'spawn-many',
          trigger: { type: 'frame' },
          actions: [{ type: 'spawn', template: 'coin', position: { type: 'fixed', x: 0, y: 0 }, count: 3 }],
        }]);

        runUpdate();
        expect(mockEntityManager.createEntity).toHaveBeenCalledTimes(3);
      });
    });

    describe('Destroy Action', () => {
      it('destroys entities by tag', () => {
        const enemies = [createMockEntity('e1', ['enemy']), createMockEntity('e2', ['enemy'])];
        mockEntityManager.getEntitiesByTag = vi.fn().mockReturnValue(enemies);

        evaluator.loadRules([{
          id: 'destroy-enemies',
          trigger: { type: 'frame' },
          actions: [{ type: 'destroy', target: { type: 'by_tag', tag: 'enemy' } }],
        }]);

        runUpdate();
        expect(mockEntityManager.destroyEntity).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Rule Modifiers', () => {
    beforeEach(() => startGame());

    describe('fireOnce', () => {
      it('only fires rule once', () => {
        evaluator.loadRules([{
          id: 'once-rule',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 100 }],
          fireOnce: true,
        }]);

        runUpdate();
        runUpdate();
        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(100);
      });
    });

    describe('cooldown', () => {
      it('prevents rule from firing during cooldown', () => {
        evaluator.loadRules([{
          id: 'cooldown-rule',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 10 }],
          cooldown: 0.1,
        }]);

        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(10);
        
        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(10);
      });
    });

    describe('enabled', () => {
      it('skips disabled rules', () => {
        evaluator.loadRules([{
          id: 'disabled-rule',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 100 }],
          enabled: false,
        }]);

        runUpdate();
        expect(StateHelpers.getScore(gameState)).toBe(0);
      });
    });
  });

  describe('Win/Lose Conditions', () => {
    beforeEach(() => startGame());

    describe('Win Conditions', () => {
      it('wins when score expression is satisfied', () => {
        evaluator.setWinCondition({ expr: 'score >= 100' });
        StateHelpers.setScore(gameState, 100);
        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('won');
      });

      it('wins when all enemies destroyed (entityCount expression)', () => {
        mockEntityManager.getEntitiesByTag = vi.fn().mockReturnValue([]);
        evaluator.setWinCondition({ expr: "entityCount('enemy') == 0" });
        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('won');
      });

      it('wins after surviving time (elapsed expression)', () => {
        runUpdate();
        evaluator.setWinCondition({ expr: 'time >= 0.01' });
        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('won');
      });

      it('empty win condition does not auto-trigger', () => {
        evaluator.setWinCondition({});
        StateHelpers.setScore(gameState, 9999);
        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('playing');
      });

      it('empty win condition allows rules to set win state', () => {
        evaluator.setWinCondition({});
        evaluator.loadRules([{
          id: 'custom-win-rule',
          trigger: { type: 'event', eventName: 'check_win' },
          actions: [{ type: 'game_state', state: 'win' }],
        }]);

        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('playing');

        StateHelpers.triggerEvent(gameState, 'check_win');
        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('won');
      });

      it('empty win condition with event chain', () => {
        evaluator.setWinCondition({});
        evaluator.loadRules([
          {
            id: 'drop-ball',
            trigger: { type: 'tap' },
            actions: [{ type: 'event', eventName: 'ball_dropped' }],
          },
          {
            id: 'check-win-on-drop',
            trigger: { type: 'event', eventName: 'ball_dropped' },
            actions: [{ type: 'game_state', state: 'win' }],
          },
        ]);

        runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
        expect(StateHelpers.getGameStateValue(gameState)).toBe('won');
      });
    });

    describe('Lose Conditions', () => {
      it('loses when lives reach zero', () => {
        evaluator.setLoseCondition({ type: 'custom', expr: 'lives <= 0' });
        StateHelpers.setLives(gameState, 0);
        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('lost');
      });

      it('loses when player destroyed', () => {
        mockEntityManager.getEntitiesByTag = vi.fn().mockReturnValue([]);
        evaluator.setLoseCondition({ type: 'entity_destroyed', tag: 'player' });
        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('lost');
      });

      it('loses when time runs out', () => {
        evaluator.setLoseCondition({ type: 'time_up', time: 0.01 });
        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('lost');
      });

      it('loses when score drops below threshold', () => {
        evaluator.setLoseCondition({ type: 'custom', expr: 'score < 0' });
        StateHelpers.setScore(gameState, -10);
        runUpdate();
        expect(StateHelpers.getGameStateValue(gameState)).toBe('lost');
      });
    });
  });

  describe('Complex Scenarios', () => {
    beforeEach(() => startGame());

    it('implements double jump with variable tracking', () => {
      evaluator.loadRules([
        {
          id: 'init-jumps',
          trigger: { type: 'gameStart' },
          actions: [{ type: 'set_variable', name: 'jumpsRemaining', operation: 'set', value: 2 }],
          fireOnce: true,
        },
        {
          id: 'jump',
          trigger: { type: 'tap' },
          conditions: [{ type: 'variable', name: 'jumpsRemaining', comparison: 'gt', value: 0 }],
          actions: [
            { type: 'set_variable', name: 'score', operation: 'add', value: 10 },
            { type: 'set_variable', name: 'jumpsRemaining', operation: 'subtract', value: 1 },
          ],
        },
      ]);

      runUpdate({ gameStarted: true });
      expect(StateHelpers.getVar(gameState, 'jumpsRemaining')).toBe(2);

      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      expect(StateHelpers.getVar(gameState, 'jumpsRemaining')).toBe(1);
      expect(StateHelpers.getScore(gameState)).toBe(10);

      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      expect(StateHelpers.getVar(gameState, 'jumpsRemaining')).toBe(0);
      expect(StateHelpers.getScore(gameState)).toBe(20);

      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      expect(StateHelpers.getVar(gameState, 'jumpsRemaining')).toBe(0);
      expect(StateHelpers.getScore(gameState)).toBe(20);
    });

    it('implements combo system with timeout', () => {
      evaluator.loadRules([
        {
          id: 'init-combo',
          trigger: { type: 'gameStart' },
          actions: [{ type: 'set_variable', name: 'combo', operation: 'set', value: 0 }],
          fireOnce: true,
        },
        {
          id: 'increase-combo',
          trigger: { type: 'tap' },
          actions: [{ type: 'set_variable', name: 'combo', operation: 'add', value: 1 }],
        },
      ]);

      runUpdate({ gameStarted: true });
      expect(StateHelpers.getVar(gameState, 'combo')).toBe(0);

      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      expect(StateHelpers.getVar(gameState, 'combo')).toBe(3);
    });

    it('implements card draw from shuffled deck', () => {
      const seededRandom = createSeededRandom(12345);
      
      StateHelpers.setList(gameState, 'deck', [1, 2, 3, 4, 5]);
      StateHelpers.shuffleList(gameState, 'deck', seededRandom);
      
      evaluator.loadRules([{
        id: 'draw-card',
        trigger: { type: 'tap' },
        actions: [{ type: 'pop_from_list', listName: 'deck', position: 'back', storeIn: 'currentCard' }],
      }]);

      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      const firstCard = StateHelpers.getVar(gameState, 'currentCard');
      expect(firstCard).toBeDefined();
      expect(StateHelpers.getList(gameState, 'deck')).toHaveLength(4);

      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      const secondCard = StateHelpers.getVar(gameState, 'currentCard');
      expect(secondCard).toBeDefined();
      expect(secondCard).not.toBe(firstCard);
      expect(StateHelpers.getList(gameState, 'deck')).toHaveLength(3);
    });

    it('implements inventory system with list conditions', () => {
      evaluator.loadRules([
        {
          id: 'init-inventory',
          trigger: { type: 'gameStart' },
          actions: [{ type: 'push_to_list', listName: 'inventory', value: 'sword' }],
          fireOnce: true,
        },
        {
          id: 'open-door',
          trigger: { type: 'tap' },
          conditions: [{ type: 'list_contains', listName: 'inventory', value: 'key' }],
          actions: [{ type: 'game_state', state: 'win' }],
        },
      ]);

      runUpdate({ gameStarted: true });
      expect(StateHelpers.getList(gameState, 'inventory')).toEqual(['sword']);

      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      expect(StateHelpers.getGameStateValue(gameState)).toBe('playing');

      StateHelpers.pushToList(gameState, 'inventory', 'key');
      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      expect(StateHelpers.getGameStateValue(gameState)).toBe('won');
    });

    it('chains rules via events (events processed in same frame if rule order allows)', () => {
      evaluator.loadRules([
        {
          id: 'collect-coin',
          trigger: { type: 'tap' },
          actions: [
            { type: 'set_variable', name: 'score', operation: 'add', value: 10 },
            { type: 'event', eventName: 'coin_collected' },
          ],
        },
        {
          id: 'check-bonus',
          trigger: { type: 'event', eventName: 'coin_collected' },
          conditions: [{ type: 'variable', name: 'score', comparison: 'gte', value: 50 }],
          actions: [{ type: 'set_variable', name: 'lives', operation: 'add', value: 1 }],
        },
      ]);

      StateHelpers.setScore(gameState, 45);
      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      expect(StateHelpers.getScore(gameState)).toBe(55);
      expect(StateHelpers.getLives(gameState)).toBe(4);
    });

    it('events triggered late in frame are processed in same frame', () => {
      evaluator.loadRules([
        {
          id: 'trigger-event',
          trigger: { type: 'frame' },
          actions: [{ type: 'event', eventName: 'test_event' }],
          fireOnce: true,
        },
        {
          id: 'handle-event',
          trigger: { type: 'event', eventName: 'test_event' },
          actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 100 }],
        },
      ]);

      runUpdate();
      expect(StateHelpers.getScore(gameState)).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => startGame());

    it('handles empty rules array', () => {
      evaluator.loadRules([]);
      expect(() => runUpdate()).not.toThrow();
    });

    it('handles rule with no conditions', () => {
      evaluator.loadRules([{
        id: 'no-cond',
        trigger: { type: 'frame' },
        actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 1 }],
      }]);

      runUpdate();
      expect(StateHelpers.getScore(gameState)).toBe(1);
    });

    it('handles rule with empty conditions array', () => {
      evaluator.loadRules([{
        id: 'empty-cond',
        trigger: { type: 'frame' },
        conditions: [],
        actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 1 }],
      }]);

      runUpdate();
      expect(StateHelpers.getScore(gameState)).toBe(1);
    });

    it('does not process rules when paused', () => {
      evaluator.loadRules([{
        id: 'frame-rule',
        trigger: { type: 'frame' },
        actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 1 }],
      }]);

      StateHelpers.setGameStateValue(gameState, 'paused', eventBus);
      runUpdate();
      expect(StateHelpers.getScore(gameState)).toBe(0);
    });

    it('does not process rules when game ended', () => {
      evaluator.loadRules([{
        id: 'frame-rule',
        trigger: { type: 'frame' },
        actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 1 }],
      }]);

      evaluator.setWinCondition({ expr: 'score >= 0' });
      runUpdate();
      expect(StateHelpers.getGameStateValue(gameState)).toBe('won');
      
      runUpdate();
      runUpdate();
      expect(StateHelpers.getScore(gameState)).toBe(0);
    });

    it('clears pending events after each update', () => {
      evaluator.loadRules([{
        id: 'event-rule',
        trigger: { type: 'event', eventName: 'test' },
        actions: [{ type: 'set_variable', name: 'score', operation: 'add', value: 100 }],
      }]);

      StateHelpers.triggerEvent(gameState, 'test');
      runUpdate();
      expect(StateHelpers.getScore(gameState)).toBe(100);

      runUpdate();
      expect(StateHelpers.getScore(gameState)).toBe(100);
    });
  });
});
