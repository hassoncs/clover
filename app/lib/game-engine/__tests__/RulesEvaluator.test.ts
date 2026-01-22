import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RulesEvaluator } from '../RulesEvaluator';
import type { EntityManager } from '../EntityManager';
import type { Physics2D } from '../../physics2d/Physics2D';
import type { InputEvents } from '../BehaviorContext';

describe('RulesEvaluator', () => {
  let evaluator: RulesEvaluator;
  let mockEntityManager: EntityManager;
  let mockPhysics: Physics2D;

  beforeEach(() => {
    evaluator = new RulesEvaluator();
    mockEntityManager = {
      getEntityCountByTag: vi.fn().mockReturnValue(0),
      getEntitiesByTag: vi.fn().mockReturnValue([]),
      getEntity: vi.fn(),
      destroyEntity: vi.fn(),
      clearAll: vi.fn(),
      createEntity: vi.fn(),
      getTemplate: vi.fn(),
    } as any;
    mockPhysics = {
      applyImpulseToCenter: vi.fn(),
      applyForceToCenter: vi.fn(),
      setLinearVelocity: vi.fn(),
      getLinearVelocity: vi.fn().mockReturnValue({ x: 0, y: 0 }),
      setAngularVelocity: vi.fn(),
      raycast: vi.fn().mockReturnValue(null),
      getTransform: vi.fn().mockReturnValue({ position: { x: 0, y: 0 } }),
    } as any;
  });

  it('should process score trigger', () => {
    evaluator.loadRules([{
      id: 'score-rule',
      trigger: { type: 'score', threshold: 10, comparison: 'gte' },
      actions: [{ type: 'lives', operation: 'add', value: 1 }],
    }]);

    evaluator.start();
    evaluator.setScore(10);
    
    evaluator.update(0.016, mockEntityManager, [], {}, {}, mockPhysics);
    
    expect(evaluator.getLives()).toBe(4);
  });

  it('should process tap input trigger', () => {
    evaluator.loadRules([{
      id: 'tap-rule',
      trigger: { type: 'tap' },
      actions: [{ type: 'score', operation: 'add', value: 100 }],
    }]);

    evaluator.start();
    
    const inputEvents: InputEvents = {
      tap: { x: 100, y: 100, worldX: 5, worldY: 5 },
    };
    
    evaluator.update(0.016, mockEntityManager, [], {}, inputEvents, mockPhysics);
    
    expect(evaluator.getScore()).toBe(100);
  });

  it('should evaluate variable condition', () => {
    evaluator.loadRules([{
      id: 'var-rule',
      trigger: { type: 'frame' },
      conditions: [{ type: 'variable', name: 'is_bonus', comparison: 'eq', value: true }],
      actions: [{ type: 'score', operation: 'add', value: 10 }],
    }]);

    evaluator.start();
    evaluator.setVariable('is_bonus', true);
    
    evaluator.update(0.016, mockEntityManager, [], {}, {}, mockPhysics);
    
    expect(evaluator.getScore()).toBe(10);
    
    evaluator.setVariable('is_bonus', false);
    evaluator.update(0.016, mockEntityManager, [], {}, {}, mockPhysics);
    expect(evaluator.getScore()).toBe(10);
  });

  it('should execute physics actions', () => {
    const mockEntity = { id: 'e1', bodyId: { value: 1 }, tags: [] };
    mockEntityManager.getEntitiesByTag = vi.fn().mockReturnValue([mockEntity]);

    evaluator.loadRules([{
      id: 'jump-rule',
      trigger: { type: 'frame' },
      actions: [{ type: 'apply_impulse', target: { type: 'by_tag', tag: 'player' }, y: -10 }],
    }]);

    evaluator.start();
    
    evaluator.update(0.016, mockEntityManager, [], {}, {}, mockPhysics);
    
    expect(mockPhysics.applyImpulseToCenter).toHaveBeenCalledWith({ value: 1 }, { x: 0, y: -10 });
  });
});
