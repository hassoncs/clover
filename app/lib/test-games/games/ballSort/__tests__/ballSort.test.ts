import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBallSortGame } from '../game';
import { RulesEvaluator } from '../../../../game-engine/RulesEvaluator';
import type { EntityManager } from '../../../../game-engine/EntityManager';
import type { Physics2D } from '../../../../physics2d/Physics2D';
import type { InputEvents } from '../../../../game-engine/BehaviorContext';
import type { RuntimeEntity } from '../../../../game-engine/types';
import type { EvalContext } from '@slopcade/shared';

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
    addTag: vi.fn(),
    removeTag: vi.fn(),
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

function createMockBall(id: string, colorIndex: number, tubeIndex: number): RuntimeEntity {
  return {
    id,
    name: id,
    tags: ['ball', `color-${colorIndex}`, `in-container-tube-${tubeIndex}`],
    transform: { x: 0, y: -5 + tubeIndex * 0.1, angle: 0, scaleX: 1, scaleY: 1 },
    physics: { bodyType: 'dynamic' },
  } as RuntimeEntity;
}

describe('ballSort', () => {
  describe('smoke test', () => {
    it('should load game definition', () => {
      const game = createBallSortGame(1);
      expect(game).toBeDefined();
      expect(game.metadata.id).toBeDefined();
    });

    it('should have required templates', () => {
      const game = createBallSortGame(1);
      expect(game.templates).toBeDefined();
      expect(game.templates?.ball0).toBeDefined();
      expect(game.templates?.ball1).toBeDefined();
      expect(game.templates?.tubeSensor).toBeDefined();
      expect(game.templates?.tubeWall).toBeDefined();
    });

    it('should have rule-managed win condition (no expr)', () => {
      const game = createBallSortGame(1);
      expect(game.winCondition).toBeDefined();
      expect(game.winCondition?.expr).toBeUndefined();
    });

    it('should have check_win rule that responds to ball_dropped event', () => {
      const game = createBallSortGame(1);
      const checkWinRule = game.rules?.find(r => r.id === 'check_win');
      expect(checkWinRule).toBeDefined();
      expect(checkWinRule?.trigger.type).toBe('event');
      expect((checkWinRule?.trigger as any).eventName).toBe('ball_dropped');
      expect(checkWinRule?.actions.some(a => a.type === 'ball_sort_check_win')).toBe(true);
    });

    it('should have state machine for game flow', () => {
      const game = createBallSortGame(1);
      expect(game.stateMachines).toBeDefined();
      const gameFlow = game.stateMachines?.find(sm => sm.id === 'gameFlow');
      expect(gameFlow).toBeDefined();
      expect(gameFlow?.states.map(s => s.id)).toContain('idle');
      expect(gameFlow?.states.map(s => s.id)).toContain('holding');
    });
  });

  describe('win condition simulation', () => {
    let evaluator: RulesEvaluator;
    let mockEntityManager: EntityManager;
    let mockPhysics: Physics2D;
    let game: ReturnType<typeof createBallSortGame>;

    const runUpdate = (inputEvents: InputEvents = {}) => {
      evaluator.update(0.016, mockEntityManager, [], {}, inputEvents, mockPhysics);
    };

    beforeEach(() => {
      game = createBallSortGame(1);
      mockEntityManager = createMockEntityManager();
      mockPhysics = createMockPhysics();
      evaluator = new RulesEvaluator(mockEntityManager);
      
      evaluator.loadRules(game.rules ?? []);
      evaluator.setWinCondition(game.winCondition);
      evaluator.setInitialVariables(game.variables as Record<string, number | string | boolean> | undefined);
      evaluator.setStateMachines(game.stateMachines);
      evaluator.start();
    });

    it('should NOT win with unsorted balls', () => {
      evaluator.triggerEvent('ball_dropped');
      runUpdate();
      expect(evaluator.getGameStateValue()).toBe('playing');
    });

    it('should win when all tubes have same-color balls (simulated via variables)', () => {
      for (let i = 0; i < 4; i++) {
        evaluator.setVariable(`tube${i}_count`, 4);
        evaluator.setVariable(`tube${i}_topColor`, i);
      }
      evaluator.setVariable('tube4_count', 0);
      evaluator.setVariable('tube5_count', 0);

      const sortedBalls: RuntimeEntity[] = [];
      for (let tubeIndex = 0; tubeIndex < 4; tubeIndex++) {
        for (let slot = 0; slot < 4; slot++) {
          sortedBalls.push(createMockBall(`ball-${tubeIndex * 4 + slot}`, tubeIndex, tubeIndex));
        }
      }

      mockEntityManager.getEntitiesByTag = vi.fn().mockImplementation((tag: string) => {
        if (tag === 'ball') return sortedBalls;
        return [];
      });

      mockEntityManager.getEntity = vi.fn().mockImplementation((id: string) => {
        if (id.startsWith('tube-')) {
          const tubeIndex = parseInt(id.split('-')[1]);
          return {
            id,
            transform: { x: tubeIndex * 2, y: 0 },
            collider: { height: 5 },
          };
        }
        return sortedBalls.find(b => b.id === id);
      });

      evaluator.triggerEvent('ball_dropped');
      runUpdate();
      
      expect(evaluator.getGameStateValue()).toBe('won');
    });

    it('should NOT win when any tube has mixed colors', () => {
      for (let i = 0; i < 4; i++) {
        evaluator.setVariable(`tube${i}_count`, 4);
        evaluator.setVariable(`tube${i}_topColor`, i);
      }
      evaluator.setVariable('tube4_count', 0);
      evaluator.setVariable('tube5_count', 0);

      const mixedBalls: RuntimeEntity[] = [
        createMockBall('ball-0', 0, 0),
        createMockBall('ball-1', 0, 0),
        createMockBall('ball-2', 0, 0),
        createMockBall('ball-3', 1, 0),
        createMockBall('ball-4', 1, 1),
        createMockBall('ball-5', 1, 1),
        createMockBall('ball-6', 1, 1),
        createMockBall('ball-7', 0, 1),
      ];

      mockEntityManager.getEntitiesByTag = vi.fn().mockImplementation((tag: string) => {
        if (tag === 'ball') return mixedBalls;
        return [];
      });

      evaluator.triggerEvent('ball_dropped');
      runUpdate();
      
      expect(evaluator.getGameStateValue()).toBe('playing');
    });

    it('should NOT win when tube has less than 4 balls', () => {
      evaluator.setVariable('tube0_count', 3);
      evaluator.setVariable('tube0_topColor', 0);
      evaluator.setVariable('tube1_count', 4);
      evaluator.setVariable('tube1_topColor', 1);
      evaluator.setVariable('tube2_count', 4);
      evaluator.setVariable('tube2_topColor', 2);
      evaluator.setVariable('tube3_count', 4);
      evaluator.setVariable('tube3_topColor', 3);
      evaluator.setVariable('tube4_count', 1);
      evaluator.setVariable('tube5_count', 0);

      const partialBalls: RuntimeEntity[] = [];
      for (let i = 0; i < 3; i++) {
        partialBalls.push(createMockBall(`ball-${i}`, 0, 0));
      }
      for (let i = 0; i < 4; i++) {
        partialBalls.push(createMockBall(`ball-${3 + i}`, 1, 1));
      }

      mockEntityManager.getEntitiesByTag = vi.fn().mockImplementation((tag: string) => {
        if (tag === 'ball') return partialBalls;
        return [];
      });

      evaluator.triggerEvent('ball_dropped');
      runUpdate();
      
      expect(evaluator.getGameStateValue()).toBe('playing');
    });
  });
});
