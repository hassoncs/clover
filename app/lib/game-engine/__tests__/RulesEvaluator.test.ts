import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RulesEvaluator } from '../RulesEvaluator';
import type { EntityManager } from '../EntityManager';
import type { Physics2D } from '../../physics2d/Physics2D';
import type { InputEvents, CollisionInfo } from '../BehaviorContext';
import type { RuntimeEntity } from '../types';
import { createSeededRandom } from '@slopcade/shared';

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
    bodyId: { value: parseInt(id.replace(/\D/g, '') || '1') },
  } as RuntimeEntity;
}

describe('RulesEvaluator', () => {
  let evaluator: RulesEvaluator;
  let mockEntityManager: EntityManager;
  let mockPhysics: Physics2D;

  beforeEach(() => {
    evaluator = new RulesEvaluator();
    mockEntityManager = createMockEntityManager();
    mockPhysics = createMockPhysics();
  });

  const runUpdate = (inputEvents: InputEvents = {}, collisions: CollisionInfo[] = []) => {
    evaluator.update(0.016, mockEntityManager, collisions, {}, inputEvents, mockPhysics);
  };

  describe('Game State Management', () => {
    it('starts in ready state', () => {
      expect(evaluator.getGameStateValue()).toBe('ready');
    });

    it('transitions to playing on start', () => {
      evaluator.start();
      expect(evaluator.getGameStateValue()).toBe('playing');
    });

    it('pauses and resumes correctly', () => {
      evaluator.start();
      evaluator.pause();
      expect(evaluator.getGameStateValue()).toBe('paused');
      evaluator.resume();
      expect(evaluator.getGameStateValue()).toBe('playing');
    });

    it('resets all state correctly', () => {
      evaluator.start();
      evaluator.addScore(100);
      evaluator.addLives(-2);
      evaluator.setVariable('test', 42);
      evaluator.setList('deck', [1, 2, 3]);
      
      evaluator.reset();
      
      expect(evaluator.getScore()).toBe(0);
      expect(evaluator.getLives()).toBe(3);
      expect(evaluator.getVariable('test')).toBeUndefined();
      expect(evaluator.getList('deck')).toBeUndefined();
      expect(evaluator.getGameStateValue()).toBe('ready');
    });

    it('fires onGameStateChange callback', () => {
      const callback = vi.fn();
      evaluator.setCallbacks({ onGameStateChange: callback });
      
      evaluator.start();
      expect(callback).toHaveBeenCalledWith('playing');
    });
  });

  describe('Score System', () => {
    beforeEach(() => evaluator.start());

    it('adds score correctly', () => {
      evaluator.addScore(50);
      expect(evaluator.getScore()).toBe(50);
      evaluator.addScore(25);
      expect(evaluator.getScore()).toBe(75);
    });

    it('sets score directly', () => {
      evaluator.addScore(100);
      evaluator.setScore(42);
      expect(evaluator.getScore()).toBe(42);
    });

    it('fires onScoreChange callback', () => {
      const callback = vi.fn();
      evaluator.setCallbacks({ onScoreChange: callback });
      
      evaluator.addScore(10);
      expect(callback).toHaveBeenCalledWith(10);
    });
  });

  describe('Lives System', () => {
    beforeEach(() => evaluator.start());

    it('starts with 3 lives by default', () => {
      expect(evaluator.getLives()).toBe(3);
    });

    it('can set initial lives', () => {
      const e = new RulesEvaluator();
      e.setInitialLives(5);
      expect(e.getLives()).toBe(5);
    });

    it('adds and subtracts lives', () => {
      evaluator.addLives(2);
      expect(evaluator.getLives()).toBe(5);
      evaluator.addLives(-3);
      expect(evaluator.getLives()).toBe(2);
    });

    it('fires onLivesChange callback', () => {
      const callback = vi.fn();
      evaluator.setCallbacks({ onLivesChange: callback });
      
      evaluator.addLives(-1);
      expect(callback).toHaveBeenCalledWith(2);
    });
  });

  describe('Variable System', () => {
    beforeEach(() => evaluator.start());

    it('sets and gets number variables', () => {
      evaluator.setVariable('health', 100);
      expect(evaluator.getVariable('health')).toBe(100);
    });

    it('sets and gets string variables', () => {
      evaluator.setVariable('playerName', 'Hero');
      expect(evaluator.getVariable('playerName')).toBe('Hero');
    });

    it('sets and gets boolean variables', () => {
      evaluator.setVariable('isInvincible', true);
      expect(evaluator.getVariable('isInvincible')).toBe(true);
    });

    it('returns undefined for non-existent variables', () => {
      expect(evaluator.getVariable('nonexistent')).toBeUndefined();
    });

    it('overwrites existing variables', () => {
      evaluator.setVariable('counter', 1);
      evaluator.setVariable('counter', 2);
      expect(evaluator.getVariable('counter')).toBe(2);
    });
  });

  describe('List System', () => {
    beforeEach(() => evaluator.start());

    it('creates and retrieves lists', () => {
      evaluator.setList('inventory', [1, 2, 3]);
      expect(evaluator.getList('inventory')).toEqual([1, 2, 3]);
    });

    it('pushes items to list', () => {
      evaluator.setList('items', ['sword']);
      evaluator.pushToList('items', 'shield');
      expect(evaluator.getList('items')).toEqual(['sword', 'shield']);
    });

    it('pushes to non-existent list creates it', () => {
      evaluator.pushToList('newList', 'first');
      expect(evaluator.getList('newList')).toEqual(['first']);
    });

    it('pops from back of list', () => {
      evaluator.setList('stack', [1, 2, 3]);
      const popped = evaluator.popFromList('stack', 'back');
      expect(popped).toBe(3);
      expect(evaluator.getList('stack')).toEqual([1, 2]);
    });

    it('pops from front of list', () => {
      evaluator.setList('queue', [1, 2, 3]);
      const popped = evaluator.popFromList('queue', 'front');
      expect(popped).toBe(1);
      expect(evaluator.getList('queue')).toEqual([2, 3]);
    });

    it('returns undefined when popping from empty list', () => {
      evaluator.setList('empty', []);
      expect(evaluator.popFromList('empty', 'back')).toBeUndefined();
    });

    it('returns undefined when popping from non-existent list', () => {
      expect(evaluator.popFromList('nonexistent', 'back')).toBeUndefined();
    });

    it('shuffles list deterministically with seeded random', () => {
      const seededRandom = createSeededRandom(42);
      evaluator.setList('deck', [1, 2, 3, 4, 5]);
      evaluator.shuffleList('deck', seededRandom);
      
      const seededRandom2 = createSeededRandom(42);
      evaluator.setList('deck2', [1, 2, 3, 4, 5]);
      evaluator.shuffleList('deck2', seededRandom2);
      
      expect(evaluator.getList('deck')).toEqual(evaluator.getList('deck2'));
    });

    it('checks list contains correctly', () => {
      evaluator.setList('colors', ['red', 'green', 'blue']);
      expect(evaluator.listContains('colors', 'green')).toBe(true);
      expect(evaluator.listContains('colors', 'yellow')).toBe(false);
    });

    it('returns false for contains on non-existent list', () => {
      expect(evaluator.listContains('nonexistent', 'value')).toBe(false);
    });
  });

  describe('Cooldown System', () => {
    beforeEach(() => evaluator.start());

    it('sets and respects cooldowns', () => {
      evaluator.setCooldown('jump', 1.0);
      
      evaluator.loadRules([{
        id: 'jump-rule',
        trigger: { type: 'frame' },
        actions: [{ type: 'score', operation: 'add', value: 10 }],
        cooldown: 0.5,
      }]);

      runUpdate();
      expect(evaluator.getScore()).toBe(10);
      
      runUpdate();
      expect(evaluator.getScore()).toBe(10);
    });
  });

  describe('Triggers', () => {
    beforeEach(() => evaluator.start());

    describe('Score Trigger', () => {
      it('fires when score >= threshold', () => {
        evaluator.loadRules([{
          id: 'score-rule',
          trigger: { type: 'score', threshold: 100, comparison: 'gte' },
          actions: [{ type: 'lives', operation: 'add', value: 1 }],
        }]);

        evaluator.setScore(99);
        runUpdate();
        expect(evaluator.getLives()).toBe(3);

        evaluator.setScore(100);
        runUpdate();
        expect(evaluator.getLives()).toBe(4);
      });

      it('fires when score <= threshold', () => {
        evaluator.loadRules([{
          id: 'low-score',
          trigger: { type: 'score', threshold: 10, comparison: 'lte' },
          actions: [{ type: 'game_state', state: 'lose' }],
        }]);

        evaluator.setScore(5);
        runUpdate();
        expect(evaluator.getGameStateValue()).toBe('lost');
      });
    });

    describe('Timer Trigger', () => {
      it('fires after specified time', () => {
        evaluator.loadRules([{
          id: 'timer-rule',
          trigger: { type: 'timer', time: 0.05 },
          actions: [{ type: 'score', operation: 'add', value: 50 }],
          fireOnce: true,
        }]);

        runUpdate();
        runUpdate();
        runUpdate();
        runUpdate();
        
        expect(evaluator.getScore()).toBe(50);
      });
    });

    describe('Tap Trigger', () => {
      it('fires on tap event', () => {
        evaluator.loadRules([{
          id: 'tap-rule',
          trigger: { type: 'tap' },
          actions: [{ type: 'score', operation: 'add', value: 100 }],
        }]);

        runUpdate({ tap: { x: 100, y: 100, worldX: 5, worldY: 5 } });
        expect(evaluator.getScore()).toBe(100);
      });

      it('does not fire without tap event', () => {
        evaluator.loadRules([{
          id: 'tap-rule',
          trigger: { type: 'tap' },
          actions: [{ type: 'score', operation: 'add', value: 100 }],
        }]);

        runUpdate();
        expect(evaluator.getScore()).toBe(0);
      });
    });

    describe('Frame Trigger', () => {
      it('fires every frame', () => {
        evaluator.loadRules([{
          id: 'frame-rule',
          trigger: { type: 'frame' },
          actions: [{ type: 'score', operation: 'add', value: 1 }],
        }]);

        runUpdate();
        runUpdate();
        runUpdate();
        expect(evaluator.getScore()).toBe(3);
      });
    });

    describe('Event Trigger', () => {
      it('fires on custom event', () => {
        evaluator.loadRules([{
          id: 'event-rule',
          trigger: { type: 'event', eventName: 'powerup_collected' },
          actions: [{ type: 'score', operation: 'multiply', value: 2 }],
        }]);

        evaluator.setScore(50);
        evaluator.triggerEvent('powerup_collected');
        runUpdate();
        expect(evaluator.getScore()).toBe(100);
      });
    });

    describe('Collision Trigger', () => {
      it('fires on collision between tagged entities', () => {
        const player = createMockEntity('player1', ['player']);
        const coin = createMockEntity('coin1', ['coin']);
        
        evaluator.loadRules([{
          id: 'collect-coin',
          trigger: { type: 'collision', entityATag: 'player', entityBTag: 'coin' },
          actions: [{ type: 'score', operation: 'add', value: 10 }],
        }]);

        const collision: CollisionInfo = {
          entityA: player,
          entityB: coin,
          normal: { x: 0, y: 1 },
          impulse: 5,
        };

        runUpdate({}, [collision]);
        expect(evaluator.getScore()).toBe(10);
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
        expect(evaluator.getGameStateValue()).toBe('won');
      });
    });

    describe('Button Trigger', () => {
      it('fires on button press', () => {
        evaluator.loadRules([{
          id: 'jump-button',
          trigger: { type: 'button', button: 'jump', state: 'pressed' },
          actions: [{ type: 'score', operation: 'add', value: 5 }],
        }]);

        runUpdate({ buttonPressed: new Set(['jump']) });
        expect(evaluator.getScore()).toBe(5);
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
        expect(evaluator.getVariable('initialized')).toBe(true);
      });
    });
  });

  describe('Conditions', () => {
    beforeEach(() => evaluator.start());

    describe('Score Condition', () => {
      it('passes when score in range', () => {
        evaluator.loadRules([{
          id: 'score-cond',
          trigger: { type: 'frame' },
          conditions: [{ type: 'score', min: 50, max: 100 }],
          actions: [{ type: 'lives', operation: 'add', value: 1 }],
        }]);

        evaluator.setScore(75);
        runUpdate();
        expect(evaluator.getLives()).toBe(4);
      });

      it('fails when score out of range', () => {
        evaluator.loadRules([{
          id: 'score-cond',
          trigger: { type: 'frame' },
          conditions: [{ type: 'score', min: 50, max: 100 }],
          actions: [{ type: 'lives', operation: 'add', value: 1 }],
        }]);

        evaluator.setScore(25);
        runUpdate();
        expect(evaluator.getLives()).toBe(3);
      });
    });

    describe('Time Condition', () => {
      it('passes when time in range', () => {
        evaluator.loadRules([{
          id: 'time-cond',
          trigger: { type: 'frame' },
          conditions: [{ type: 'time', min: 0, max: 1 }],
          actions: [{ type: 'score', operation: 'add', value: 1 }],
        }]);

        runUpdate();
        expect(evaluator.getScore()).toBe(1);
      });
    });

    describe('Variable Condition', () => {
      it('evaluates equality', () => {
        evaluator.loadRules([{
          id: 'var-eq',
          trigger: { type: 'frame' },
          conditions: [{ type: 'variable', name: 'level', comparison: 'eq', value: 5 }],
          actions: [{ type: 'score', operation: 'add', value: 100 }],
        }]);

        evaluator.setVariable('level', 5);
        runUpdate();
        expect(evaluator.getScore()).toBe(100);
      });

      it('evaluates greater than', () => {
        evaluator.loadRules([{
          id: 'var-gt',
          trigger: { type: 'frame' },
          conditions: [{ type: 'variable', name: 'health', comparison: 'gt', value: 50 }],
          actions: [{ type: 'score', operation: 'add', value: 10 }],
        }]);

        evaluator.setVariable('health', 75);
        runUpdate();
        expect(evaluator.getScore()).toBe(10);

        evaluator.setVariable('health', 50);
        runUpdate();
        expect(evaluator.getScore()).toBe(10);
      });

      it('evaluates less than or equal', () => {
        evaluator.loadRules([{
          id: 'var-lte',
          trigger: { type: 'frame' },
          conditions: [{ type: 'variable', name: 'ammo', comparison: 'lte', value: 0 }],
          actions: [{ type: 'game_state', state: 'lose' }],
        }]);

        evaluator.setVariable('ammo', 0);
        runUpdate();
        expect(evaluator.getGameStateValue()).toBe('lost');
      });

      it('evaluates not equal', () => {
        evaluator.loadRules([{
          id: 'var-neq',
          trigger: { type: 'frame' },
          conditions: [{ type: 'variable', name: 'state', comparison: 'neq', value: 'dead' }],
          actions: [{ type: 'score', operation: 'add', value: 1 }],
        }]);

        evaluator.setVariable('state', 'alive');
        runUpdate();
        expect(evaluator.getScore()).toBe(1);
      });

      it('evaluates boolean equality', () => {
        evaluator.loadRules([{
          id: 'var-bool',
          trigger: { type: 'frame' },
          conditions: [{ type: 'variable', name: 'isBonus', comparison: 'eq', value: true }],
          actions: [{ type: 'score', operation: 'multiply', value: 2 }],
        }]);

        evaluator.setScore(50);
        evaluator.setVariable('isBonus', true);
        runUpdate();
        expect(evaluator.getScore()).toBe(100);
      });
    });

    describe('List Contains Condition', () => {
      it('passes when list contains value', () => {
        evaluator.loadRules([{
          id: 'has-key',
          trigger: { type: 'frame' },
          conditions: [{ type: 'list_contains', listName: 'inventory', value: 'key' }],
          actions: [{ type: 'score', operation: 'add', value: 100 }],
        }]);

        evaluator.setList('inventory', ['sword', 'key', 'potion']);
        runUpdate();
        expect(evaluator.getScore()).toBe(100);
      });

      it('fails when list does not contain value', () => {
        evaluator.loadRules([{
          id: 'has-key',
          trigger: { type: 'frame' },
          conditions: [{ type: 'list_contains', listName: 'inventory', value: 'key' }],
          actions: [{ type: 'score', operation: 'add', value: 100 }],
        }]);

        evaluator.setList('inventory', ['sword', 'potion']);
        runUpdate();
        expect(evaluator.getScore()).toBe(0);
      });

      it('supports negated condition', () => {
        evaluator.loadRules([{
          id: 'no-curse',
          trigger: { type: 'frame' },
          conditions: [{ type: 'list_contains', listName: 'effects', value: 'curse', negated: true }],
          actions: [{ type: 'score', operation: 'add', value: 50 }],
        }]);

        evaluator.setList('effects', ['buff', 'shield']);
        runUpdate();
        expect(evaluator.getScore()).toBe(50);
      });
    });

    describe('Entity Count Condition', () => {
      it('passes when count in range', () => {
        mockEntityManager.getEntityCountByTag = vi.fn().mockReturnValue(3);
        
        evaluator.loadRules([{
          id: 'enemy-count',
          trigger: { type: 'frame' },
          conditions: [{ type: 'entity_count', tag: 'enemy', min: 1, max: 5 }],
          actions: [{ type: 'score', operation: 'add', value: 10 }],
        }]);

        runUpdate();
        expect(evaluator.getScore()).toBe(10);
      });
    });

    describe('Cooldown Ready Condition', () => {
      it('passes when cooldown expired', () => {
        evaluator.loadRules([{
          id: 'ability',
          trigger: { type: 'frame' },
          conditions: [{ type: 'cooldown_ready', cooldownId: 'fireball' }],
          actions: [{ type: 'score', operation: 'add', value: 25 }],
        }]);

        runUpdate();
        expect(evaluator.getScore()).toBe(25);
      });
    });

    describe('Multiple Conditions (AND logic)', () => {
      it('requires all conditions to pass', () => {
        evaluator.loadRules([{
          id: 'multi-cond',
          trigger: { type: 'frame' },
          conditions: [
            { type: 'variable', name: 'hasKey', comparison: 'eq', value: true },
            { type: 'score', min: 100 },
          ],
          actions: [{ type: 'game_state', state: 'win' }],
        }]);

        evaluator.setVariable('hasKey', true);
        evaluator.setScore(50);
        runUpdate();
        expect(evaluator.getGameStateValue()).toBe('playing');

        evaluator.setScore(100);
        runUpdate();
        expect(evaluator.getGameStateValue()).toBe('won');
      });
    });
  });

  describe('Actions', () => {
    beforeEach(() => evaluator.start());

    describe('Score Action', () => {
      it('adds score', () => {
        evaluator.loadRules([{
          id: 'add-score',
          trigger: { type: 'frame' },
          actions: [{ type: 'score', operation: 'add', value: 10 }],
        }]);

        runUpdate();
        expect(evaluator.getScore()).toBe(10);
      });

      it('subtracts score', () => {
        evaluator.setScore(100);
        evaluator.loadRules([{
          id: 'sub-score',
          trigger: { type: 'frame' },
          actions: [{ type: 'score', operation: 'subtract', value: 25 }],
        }]);

        runUpdate();
        expect(evaluator.getScore()).toBe(75);
      });

      it('multiplies score', () => {
        evaluator.setScore(50);
        evaluator.loadRules([{
          id: 'mult-score',
          trigger: { type: 'frame' },
          actions: [{ type: 'score', operation: 'multiply', value: 2 }],
        }]);

        runUpdate();
        expect(evaluator.getScore()).toBe(100);
      });

      it('sets score directly', () => {
        evaluator.setScore(999);
        evaluator.loadRules([{
          id: 'set-score',
          trigger: { type: 'frame' },
          actions: [{ type: 'score', operation: 'set', value: 0 }],
        }]);

        runUpdate();
        expect(evaluator.getScore()).toBe(0);
      });
    });

    describe('Lives Action', () => {
      it('adds lives', () => {
        evaluator.loadRules([{
          id: 'add-life',
          trigger: { type: 'frame' },
          actions: [{ type: 'lives', operation: 'add', value: 1 }],
        }]);

        runUpdate();
        expect(evaluator.getLives()).toBe(4);
      });

      it('subtracts lives', () => {
        evaluator.loadRules([{
          id: 'lose-life',
          trigger: { type: 'frame' },
          actions: [{ type: 'lives', operation: 'subtract', value: 1 }],
        }]);

        runUpdate();
        expect(evaluator.getLives()).toBe(2);
      });

      it('sets lives directly', () => {
        evaluator.loadRules([{
          id: 'set-lives',
          trigger: { type: 'frame' },
          actions: [{ type: 'lives', operation: 'set', value: 99 }],
        }]);

        runUpdate();
        expect(evaluator.getLives()).toBe(99);
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
        expect(evaluator.getVariable('counter')).toBe(42);
      });

      it('adds to variable', () => {
        evaluator.setVariable('counter', 10);
        evaluator.loadRules([{
          id: 'add-var',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'counter', operation: 'add', value: 5 }],
        }]);

        runUpdate();
        expect(evaluator.getVariable('counter')).toBe(15);
      });

      it('subtracts from variable', () => {
        evaluator.setVariable('health', 100);
        evaluator.loadRules([{
          id: 'sub-var',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'health', operation: 'subtract', value: 25 }],
        }]);

        runUpdate();
        expect(evaluator.getVariable('health')).toBe(75);
      });

      it('multiplies variable', () => {
        evaluator.setVariable('multiplier', 2);
        evaluator.loadRules([{
          id: 'mult-var',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'multiplier', operation: 'multiply', value: 3 }],
        }]);

        runUpdate();
        expect(evaluator.getVariable('multiplier')).toBe(6);
      });

      it('toggles boolean variable', () => {
        evaluator.setVariable('isActive', false);
        evaluator.loadRules([{
          id: 'toggle-var',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'isActive', operation: 'toggle', value: true }],
        }]);

        runUpdate();
        expect(evaluator.getVariable('isActive')).toBe(true);
        runUpdate();
        expect(evaluator.getVariable('isActive')).toBe(false);
      });

      it('concatenates strings with add', () => {
        evaluator.setVariable('message', 'Hello');
        evaluator.loadRules([{
          id: 'concat-var',
          trigger: { type: 'frame' },
          actions: [{ type: 'set_variable', name: 'message', operation: 'add', value: ' World' }],
        }]);

        runUpdate();
        expect(evaluator.getVariable('message')).toBe('Hello World');
      });
    });

    describe('List Actions', () => {
      it('pushes to list', () => {
        evaluator.setList('items', ['a']);
        evaluator.loadRules([{
          id: 'push-list',
          trigger: { type: 'frame' },
          actions: [{ type: 'push_to_list', listName: 'items', value: 'b' }],
        }]);

        runUpdate();
        expect(evaluator.getList('items')).toEqual(['a', 'b']);
      });

      it('pops from list and stores in variable', () => {
        evaluator.setList('deck', [1, 2, 3]);
        evaluator.loadRules([{
          id: 'pop-list',
          trigger: { type: 'frame' },
          actions: [{ type: 'pop_from_list', listName: 'deck', position: 'back', storeIn: 'drawnCard' }],
        }]);

        runUpdate();
        expect(evaluator.getVariable('drawnCard')).toBe(3);
        expect(evaluator.getList('deck')).toEqual([1, 2]);
      });

      it('shuffles list', () => {
        evaluator.setList('deck', [1, 2, 3, 4, 5]);
        evaluator.loadRules([{
          id: 'shuffle-list',
          trigger: { type: 'frame' },
          actions: [{ type: 'shuffle_list', listName: 'deck' }],
        }]);

        runUpdate();
        const shuffled = evaluator.getList('deck');
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
        expect(evaluator.getGameStateValue()).toBe('won');
      });

      it('sets lose state', () => {
        evaluator.loadRules([{
          id: 'lose-game',
          trigger: { type: 'frame' },
          actions: [{ type: 'game_state', state: 'lose' }],
        }]);

        runUpdate();
        expect(evaluator.getGameStateValue()).toBe('lost');
      });

      it('pauses game', () => {
        evaluator.loadRules([{
          id: 'pause-game',
          trigger: { type: 'frame' },
          actions: [{ type: 'game_state', state: 'pause' }],
        }]);

        runUpdate();
        expect(evaluator.getGameStateValue()).toBe('paused');
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
            actions: [{ type: 'score', operation: 'add', value: 999 }],
          },
        ]);

        runUpdate();
        runUpdate();
        expect(evaluator.getScore()).toBe(999);
      });
    });

    describe('Cooldown Action', () => {
      it('starts cooldown that blocks rule', () => {
        evaluator.loadRules([{
          id: 'cooldown-rule',
          trigger: { type: 'frame' },
          actions: [
            { type: 'score', operation: 'add', value: 10 },
            { type: 'start_cooldown', cooldownId: 'ability', duration: 1.0 },
          ],
        }]);

        runUpdate();
        expect(evaluator.getScore()).toBe(10);
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
    beforeEach(() => evaluator.start());

    describe('fireOnce', () => {
      it('only fires rule once', () => {
        evaluator.loadRules([{
          id: 'once-rule',
          trigger: { type: 'frame' },
          actions: [{ type: 'score', operation: 'add', value: 100 }],
          fireOnce: true,
        }]);

        runUpdate();
        runUpdate();
        runUpdate();
        expect(evaluator.getScore()).toBe(100);
      });
    });

    describe('cooldown', () => {
      it('prevents rule from firing during cooldown', () => {
        evaluator.loadRules([{
          id: 'cooldown-rule',
          trigger: { type: 'frame' },
          actions: [{ type: 'score', operation: 'add', value: 10 }],
          cooldown: 0.1,
        }]);

        runUpdate();
        expect(evaluator.getScore()).toBe(10);
        
        runUpdate();
        expect(evaluator.getScore()).toBe(10);
      });
    });

    describe('enabled', () => {
      it('skips disabled rules', () => {
        evaluator.loadRules([{
          id: 'disabled-rule',
          trigger: { type: 'frame' },
          actions: [{ type: 'score', operation: 'add', value: 100 }],
          enabled: false,
        }]);

        runUpdate();
        expect(evaluator.getScore()).toBe(0);
      });
    });
  });

  describe('Win/Lose Conditions', () => {
    beforeEach(() => evaluator.start());

    describe('Win Conditions', () => {
      it('wins when score threshold reached', () => {
        evaluator.setWinCondition({ type: 'score', score: 100 });
        evaluator.setScore(100);
        runUpdate();
        expect(evaluator.getGameStateValue()).toBe('won');
      });

      it('wins when all enemies destroyed', () => {
        mockEntityManager.getEntitiesByTag = vi.fn().mockReturnValue([]);
        evaluator.setWinCondition({ type: 'destroy_all', tag: 'enemy' });
        runUpdate();
        expect(evaluator.getGameStateValue()).toBe('won');
      });

      it('wins after surviving time', () => {
        evaluator.setWinCondition({ type: 'survive_time', time: 0.01 });
        runUpdate();
        expect(evaluator.getGameStateValue()).toBe('won');
      });
    });

    describe('Lose Conditions', () => {
      it('loses when lives reach zero', () => {
        evaluator.setLoseCondition({ type: 'lives_zero' });
        evaluator.setLives(0);
        runUpdate();
        expect(evaluator.getGameStateValue()).toBe('lost');
      });

      it('loses when player destroyed', () => {
        mockEntityManager.getEntitiesByTag = vi.fn().mockReturnValue([]);
        evaluator.setLoseCondition({ type: 'entity_destroyed', tag: 'player' });
        runUpdate();
        expect(evaluator.getGameStateValue()).toBe('lost');
      });

      it('loses when time runs out', () => {
        evaluator.setLoseCondition({ type: 'time_up', time: 0.01 });
        runUpdate();
        expect(evaluator.getGameStateValue()).toBe('lost');
      });

      it('loses when score drops below threshold', () => {
        evaluator.setLoseCondition({ type: 'score_below', score: 0 });
        evaluator.setScore(-10);
        runUpdate();
        expect(evaluator.getGameStateValue()).toBe('lost');
      });
    });
  });

  describe('Complex Scenarios', () => {
    beforeEach(() => evaluator.start());

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
            { type: 'score', operation: 'add', value: 10 },
            { type: 'set_variable', name: 'jumpsRemaining', operation: 'subtract', value: 1 },
          ],
        },
      ]);

      runUpdate({ gameStarted: true });
      expect(evaluator.getVariable('jumpsRemaining')).toBe(2);

      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      expect(evaluator.getVariable('jumpsRemaining')).toBe(1);
      expect(evaluator.getScore()).toBe(10);

      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      expect(evaluator.getVariable('jumpsRemaining')).toBe(0);
      expect(evaluator.getScore()).toBe(20);

      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      expect(evaluator.getVariable('jumpsRemaining')).toBe(0);
      expect(evaluator.getScore()).toBe(20);
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
      expect(evaluator.getVariable('combo')).toBe(0);

      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      expect(evaluator.getVariable('combo')).toBe(3);
    });

    it('implements card draw from shuffled deck', () => {
      const seededRandom = createSeededRandom(12345);
      
      evaluator.setList('deck', [1, 2, 3, 4, 5]);
      evaluator.shuffleList('deck', seededRandom);
      
      evaluator.loadRules([{
        id: 'draw-card',
        trigger: { type: 'tap' },
        actions: [{ type: 'pop_from_list', listName: 'deck', position: 'back', storeIn: 'currentCard' }],
      }]);

      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      const firstCard = evaluator.getVariable('currentCard');
      expect(firstCard).toBeDefined();
      expect(evaluator.getList('deck')).toHaveLength(4);

      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      const secondCard = evaluator.getVariable('currentCard');
      expect(secondCard).toBeDefined();
      expect(secondCard).not.toBe(firstCard);
      expect(evaluator.getList('deck')).toHaveLength(3);
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
      expect(evaluator.getList('inventory')).toEqual(['sword']);

      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      expect(evaluator.getGameStateValue()).toBe('playing');

      evaluator.pushToList('inventory', 'key');
      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      expect(evaluator.getGameStateValue()).toBe('won');
    });

    it('chains rules via events (events processed in same frame if rule order allows)', () => {
      evaluator.loadRules([
        {
          id: 'collect-coin',
          trigger: { type: 'tap' },
          actions: [
            { type: 'score', operation: 'add', value: 10 },
            { type: 'event', eventName: 'coin_collected' },
          ],
        },
        {
          id: 'check-bonus',
          trigger: { type: 'event', eventName: 'coin_collected' },
          conditions: [{ type: 'score', min: 50 }],
          actions: [{ type: 'lives', operation: 'add', value: 1 }],
        },
      ]);

      evaluator.setScore(45);
      runUpdate({ tap: { x: 0, y: 0, worldX: 0, worldY: 0 } });
      expect(evaluator.getScore()).toBe(55);
      expect(evaluator.getLives()).toBe(4);
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
          actions: [{ type: 'score', operation: 'add', value: 100 }],
        },
      ]);

      runUpdate();
      expect(evaluator.getScore()).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => evaluator.start());

    it('handles empty rules array', () => {
      evaluator.loadRules([]);
      expect(() => runUpdate()).not.toThrow();
    });

    it('handles rule with no conditions', () => {
      evaluator.loadRules([{
        id: 'no-cond',
        trigger: { type: 'frame' },
        actions: [{ type: 'score', operation: 'add', value: 1 }],
      }]);

      runUpdate();
      expect(evaluator.getScore()).toBe(1);
    });

    it('handles rule with empty conditions array', () => {
      evaluator.loadRules([{
        id: 'empty-cond',
        trigger: { type: 'frame' },
        conditions: [],
        actions: [{ type: 'score', operation: 'add', value: 1 }],
      }]);

      runUpdate();
      expect(evaluator.getScore()).toBe(1);
    });

    it('does not process rules when paused', () => {
      evaluator.loadRules([{
        id: 'frame-rule',
        trigger: { type: 'frame' },
        actions: [{ type: 'score', operation: 'add', value: 1 }],
      }]);

      evaluator.pause();
      runUpdate();
      expect(evaluator.getScore()).toBe(0);
    });

    it('does not process rules when game ended', () => {
      evaluator.loadRules([{
        id: 'frame-rule',
        trigger: { type: 'frame' },
        actions: [{ type: 'score', operation: 'add', value: 1 }],
      }]);

      evaluator.setWinCondition({ type: 'score', score: 0 });
      runUpdate();
      expect(evaluator.getGameStateValue()).toBe('won');
      
      runUpdate();
      runUpdate();
      expect(evaluator.getScore()).toBe(0);
    });

    it('clears pending events after each update', () => {
      evaluator.loadRules([{
        id: 'event-rule',
        trigger: { type: 'event', eventName: 'test' },
        actions: [{ type: 'score', operation: 'add', value: 100 }],
      }]);

      evaluator.triggerEvent('test');
      runUpdate();
      expect(evaluator.getScore()).toBe(100);

      runUpdate();
      expect(evaluator.getScore()).toBe(100);
    });
  });
});
