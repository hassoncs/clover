import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBehaviorExecutor } from '../BehaviorExecutor';
import type { BehaviorContext } from '../BehaviorContext';
import type { RuntimeEntity } from '../types';

describe('BehaviorExecutor', () => {
  let executor = createBehaviorExecutor();
  let context: BehaviorContext;
  let entity: RuntimeEntity;

  beforeEach(() => {
    executor = createBehaviorExecutor();
    entity = {
      id: 'e1',
      name: 'test',
      template: 'test',
      transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      behaviors: [],
      tags: [],
      active: true,
      bodyId: { value: 1 },
    } as unknown as RuntimeEntity;
    context = {
      dt: 0.016,
      elapsed: 0,
      input: {},
      physics: {
        setLinearVelocity: vi.fn(),
        applyForceToCenter: vi.fn(),
        getLinearVelocity: vi.fn().mockReturnValue({ x: 0, y: 0 }),
        setTransform: vi.fn(),
        setAngularVelocity: vi.fn(),
      } as any,
      resolveNumber: (v: any) => v,
      entityManager: {
        getEntitiesByTag: vi.fn().mockReturnValue([]),
      } as any,
    } as any;
  });

  it('should execute move behavior', () => {
    entity.behaviors = [{
      definition: { type: 'move', direction: 'right', speed: 100 },
      enabled: true,
    } as any];

    executor.executeAll([entity], context);

    expect(context.physics.setLinearVelocity).toHaveBeenCalled();
  });

  it('should execute timer behavior', () => {
    entity.behaviors = [{
      definition: { type: 'timer', duration: 1, action: 'destroy' },
      enabled: true,
      state: {},
    } as any];
    context.destroyEntity = vi.fn();

    executor.executeAll([entity], context);
    expect(context.destroyEntity).not.toHaveBeenCalled();

    context.elapsed = 1.1;
    executor.executeAll([entity], context);
    expect(context.destroyEntity).toHaveBeenCalledWith('e1');
  });
});
