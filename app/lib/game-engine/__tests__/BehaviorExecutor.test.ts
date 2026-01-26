import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BehaviorExecutor, createBehaviorExecutor } from '../BehaviorExecutor';
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
      tagBits: new Set(),
      conditionalBehaviors: [],
      activeConditionalGroupId: -1,
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
      createEvalContextForEntity: vi.fn().mockReturnValue({}),
      computedValues: {
        resolveNumber: (v: any) => v,
        resolveVec2: (v: any) => v,
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

  describe('lifecycle hooks', () => {
    it('should call onDeactivate when transitioning away from a group', () => {
      const onDeactivate = vi.fn();
      const rawExecutor = new BehaviorExecutor();
      rawExecutor.registerHandler('rotate', {
        execute: vi.fn(),
        onDeactivate,
      });

      entity.conditionalBehaviors = [
        {
          when: { hasTag: 'selected' },
          priority: 1,
          behaviors: [{ type: 'rotate', speed: 1, direction: 'clockwise' }],
        },
      ];
      entity.pendingLifecycleTransition = { oldGroupId: 0, newGroupId: -1 };

      rawExecutor.executeAll([entity], context);

      expect(onDeactivate).toHaveBeenCalledTimes(1);
      expect(entity.pendingLifecycleTransition).toBeUndefined();
    });

    it('should call onActivate when transitioning to a group', () => {
      const onActivate = vi.fn();
      const rawExecutor = new BehaviorExecutor();
      rawExecutor.registerHandler('rotate', {
        execute: vi.fn(),
        onActivate,
      });

      entity.conditionalBehaviors = [
        {
          when: { hasTag: 'selected' },
          priority: 1,
          behaviors: [{ type: 'rotate', speed: 1, direction: 'clockwise' }],
        },
      ];
      entity.pendingLifecycleTransition = { oldGroupId: -1, newGroupId: 0 };

      rawExecutor.executeAll([entity], context);

      expect(onActivate).toHaveBeenCalledTimes(1);
      expect(entity.pendingLifecycleTransition).toBeUndefined();
    });

    it('should call both onDeactivate and onActivate when switching groups', () => {
      const onDeactivate = vi.fn();
      const onActivate = vi.fn();
      const rawExecutor = new BehaviorExecutor();
      rawExecutor.registerHandler('rotate', {
        execute: vi.fn(),
        onDeactivate,
        onActivate,
      });

      entity.conditionalBehaviors = [
        {
          when: { hasTag: 'idle' },
          priority: 1,
          behaviors: [{ type: 'rotate', speed: 1, direction: 'clockwise' }],
        },
        {
          when: { hasTag: 'active' },
          priority: 2,
          behaviors: [{ type: 'rotate', speed: 2, direction: 'counterclockwise' }],
        },
      ];
      entity.pendingLifecycleTransition = { oldGroupId: 0, newGroupId: 1 };

      rawExecutor.executeAll([entity], context);

      expect(onDeactivate).toHaveBeenCalledTimes(1);
      expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it('should not call lifecycle hooks when no transition is pending', () => {
      const onDeactivate = vi.fn();
      const onActivate = vi.fn();
      const rawExecutor = new BehaviorExecutor();
      rawExecutor.registerHandler('rotate', {
        execute: vi.fn(),
        onDeactivate,
        onActivate,
      });

      entity.conditionalBehaviors = [
        {
          when: { hasTag: 'selected' },
          priority: 1,
          behaviors: [{ type: 'rotate', speed: 1, direction: 'clockwise' }],
        },
      ];

      rawExecutor.executeAll([entity], context);

      expect(onDeactivate).not.toHaveBeenCalled();
      expect(onActivate).not.toHaveBeenCalled();
    });
  });
});
