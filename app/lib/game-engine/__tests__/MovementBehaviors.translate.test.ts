import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { BehaviorExecutor, createBehaviorExecutor } from '../BehaviorExecutor';
import type { BehaviorContext } from '../BehaviorContext';
import type { RuntimeEntity } from '../types';

describe('MovementBehaviors - translate', () => {
  let executor: BehaviorExecutor;
  let context: BehaviorContext;
  let entity: RuntimeEntity;

  beforeEach(() => {
    executor = createBehaviorExecutor();
    entity = {
      id: 'test-entity',
      name: 'test',
      template: 'test',
      transform: { x: 5, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
      localTransform: { x: 5, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
      worldTransform: { x: 5, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
      behaviors: [],
      tags: [],
      tagBits: new Set(),
      conditionalBehaviors: [],
      activeConditionalGroupId: -1,
      active: true,
      bodyId: null, // translate does NOT require physics body
      children: [],
    } as unknown as RuntimeEntity;

    context = {
      dt: 0.016, // 16ms = ~60fps
      elapsed: 0,
      input: {},
      physics: {},
      entityManager: {
        getEntitiesByTag: vi.fn().mockReturnValue([]),
        updateWorldTransforms: vi.fn(),
      } as any,
      resolveNumber: (v: any) => v,
      createEvalContextForEntity: vi.fn().mockReturnValue({}),
      computedValues: {
        resolveNumber: (v: any) => v,
        resolveVec2: (v: any) => v,
      } as any,
      setEntityPosition: vi.fn(),
    } as any;
  });

  describe('translate with vector direction', () => {
    it('moves entity by speed * dt in specified direction', () => {
      entity.behaviors = [{
        definition: {
          type: 'translate',
          direction: { type: 'vector', x: 1, y: 0 }, // right
          speed: 10, // meters per second
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      // speed (10) * dt (0.016) = 0.16 meters
      expect(entity.transform.x).toBeCloseTo(5 + 0.16, 2);
      expect(entity.transform.y).toBe(10);
    });

    it('moves entity diagonally with vector direction', () => {
      entity.behaviors = [{
        definition: {
          type: 'translate',
          direction: { type: 'vector', x: 1, y: 1 }, // diagonal
          speed: 10, // meters per second
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      // Each component should be scaled by 1/sqrt(2) for normalization
      const expected = 10 * 0.016 / Math.sqrt(2);
      expect(entity.transform.x).toBeCloseTo(5 + expected, 2);
      expect(entity.transform.y).toBeCloseTo(10 + expected, 2);
    });

    it('works for entities without physics body', () => {
      expect(entity.bodyId).toBeNull();

      entity.behaviors = [{
        definition: {
          type: 'translate',
          direction: { type: 'vector', x: 0, y: 1 }, // down
          speed: 5,
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      expect(entity.transform.y).toBeCloseTo(10 + 5 * 0.016, 2);
    });
  });

  describe('translate with target direction', () => {
    it('moves toward target entity', () => {
      const targetEntity: RuntimeEntity = {
        id: 'target',
        transform: { x: 15, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
      } as unknown as RuntimeEntity;

      (context.entityManager.getEntitiesByTag as Mock).mockReturnValue([targetEntity]);

      entity.behaviors = [{
        definition: {
          type: 'translate',
          direction: { type: 'toward_target', targetTag: 'player' },
          speed: 10,
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      // Distance is 10 meters right, so movement should be entirely in x
      const expected = 10 * 0.016;
      expect(entity.transform.x).toBeCloseTo(5 + expected, 2);
      expect(entity.transform.y).toBeCloseTo(10, 2);
    });

    it('moves away from target entity', () => {
      const targetEntity: RuntimeEntity = {
        id: 'target',
        transform: { x: 15, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
      } as unknown as RuntimeEntity;

      (context.entityManager.getEntitiesByTag as Mock).mockReturnValue([targetEntity]);

      entity.behaviors = [{
        definition: {
          type: 'translate',
          direction: { type: 'away_from_target', targetTag: 'player' },
          speed: 10,
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      // Should move left (away from target at x=15)
      const expected = 10 * 0.016;
      expect(entity.transform.x).toBeCloseTo(5 - expected, 2);
      expect(entity.transform.y).toBeCloseTo(10, 2);
    });
  });

  describe('translate with random direction', () => {
    it('moves in random direction', () => {
      entity.behaviors = [{
        definition: {
          type: 'translate',
          direction: { type: 'random' },
          speed: 10,
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      // Should move some distance (non-zero)
      const dx = entity.transform.x - 5;
      const dy = entity.transform.y - 10;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // At 60fps with speed 10, distance should be ~0.16 meters
      expect(distance).toBeCloseTo(10 * 0.016, 2);
    });
  });

  describe('translate with hierarchy', () => {
    it('updates localTransform for parented entity', () => {
      entity.parentId = 'parent';

      entity.behaviors = [{
        definition: {
          type: 'translate',
          direction: { type: 'vector', x: 1, y: 0 },
          speed: 10,
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      // Should update localTransform, not transform directly
      expect(entity.localTransform.x).toBeCloseTo(5 + 10 * 0.016, 2);
    });

    it('calls updateWorldTransforms when parent moves', () => {
      entity.parentId = 'parent';

      entity.behaviors = [{
        definition: {
          type: 'translate',
          direction: { type: 'vector', x: 1, y: 0 },
          speed: 10,
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      // Should propagate changes to descendants
      expect(context.entityManager.updateWorldTransforms).toHaveBeenCalledWith('test-entity');
    });

    it('syncs only the moved entity to Godot bridge', () => {
      entity.behaviors = [{
        definition: {
          type: 'translate',
          direction: { type: 'vector', x: 1, y: 0 },
          speed: 10,
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      // Only the moved entity should sync to bridge
      expect(context.setEntityPosition).toHaveBeenCalledWith('test-entity', expect.any(Number), expect.any(Number));
      expect(context.setEntityPosition).toHaveBeenCalledTimes(1);
    });
  });
});
