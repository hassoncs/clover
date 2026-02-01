import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { BehaviorExecutor, createBehaviorExecutor } from '../BehaviorExecutor';
import type { BehaviorContext } from '../BehaviorContext';
import type { RuntimeEntity } from '../types';

describe('MovementBehaviors - set_velocity', () => {
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
      behaviors: [],
      tags: [],
      tagBits: new Set(),
      conditionalBehaviors: [],
      activeConditionalGroupId: -1,
      active: true,
      physics: { bodyType: 'dynamic' },
      children: [],
    } as unknown as RuntimeEntity;

    context = {
      dt: 0.016,
      elapsed: 0,
      input: {},
      physics: {
        setLinearVelocity: vi.fn(),
        getLinearVelocity: vi.fn().mockReturnValue({ x: 0, y: 0 }),
      } as any,
      entityManager: {
        getEntitiesByTag: vi.fn().mockReturnValue([]),
      } as any,
      resolveNumber: (v: any) => v,
      createEvalContextForEntity: vi.fn().mockReturnValue({}),
      computedValues: {
        resolveNumber: (v: any) => v,
        resolveVec2: (v: any) => v,
      } as any,
    } as any;
  });

  describe('set_velocity with vector direction', () => {
    it('sets velocity to speed in specified direction (meters/second)', () => {
      entity.behaviors = [{
        definition: {
          type: 'set_velocity',
          direction: { type: 'vector', x: 1, y: 0 }, // right
          speed: 10, // meters per second
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      // Speed 10 m/s in x direction, normalized from (1,0) = (1, 0)
      expect(context.physics.setLinearVelocity).toHaveBeenCalledWith(
        entity.id,
        { x: 10, y: 0 }
      );
    });

    it('normalizes non-unit vector direction', () => {
      entity.behaviors = [{
        definition: {
          type: 'set_velocity',
          direction: { type: 'vector', x: 3, y: 4 }, // diagonal
          speed: 10,
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      // Normalized: (3,4) has length 5, so result is (6, 8)
      expect(context.physics.setLinearVelocity).toHaveBeenCalledWith(
        entity.id,
        { x: 6, y: 8 }
      );
    });

    it('throws error when entity has no physics body', () => {
      entity.physics = undefined as any;

      entity.behaviors = [{
        definition: {
          type: 'set_velocity',
          direction: { type: 'vector', x: 1, y: 0 },
          speed: 10,
        },
        enabled: true,
        state: {},
      }] as any;

      expect(() => executor.executeAll([entity], context)).toThrow(
        /Cannot set velocity on entity.*without a physics body/
      );
    });
  });

  describe('set_velocity with toward_target', () => {
    it('sets velocity toward target entity', () => {
      const targetEntity: RuntimeEntity = {
        id: 'target',
        transform: { x: 15, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
      } as unknown as RuntimeEntity;

      (context.entityManager.getEntitiesByTag as Mock).mockReturnValue([targetEntity]);

      entity.behaviors = [{
        definition: {
          type: 'set_velocity',
          direction: { type: 'toward_target', targetTag: 'player' },
          speed: 10,
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      // Target is 10 meters to the right, direction is (1, 0)
      expect(context.physics.setLinearVelocity).toHaveBeenCalledWith(
        entity.id,
        { x: 10, y: 0 }
      );
    });

    it('sets velocity away from target entity', () => {
      const targetEntity: RuntimeEntity = {
        id: 'target',
        transform: { x: 15, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
      } as unknown as RuntimeEntity;

      (context.entityManager.getEntitiesByTag as Mock).mockReturnValue([targetEntity]);

      entity.behaviors = [{
        definition: {
          type: 'set_velocity',
          direction: { type: 'away_from_target', targetTag: 'player' },
          speed: 10,
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      // Should move left (away from target at x=15)
      expect(context.physics.setLinearVelocity).toHaveBeenCalledWith(
        entity.id,
        { x: -10, y: 0 }
      );
    });
  });

  describe('set_velocity with random direction', () => {
    it('sets velocity in random direction', () => {
      entity.behaviors = [{
        definition: {
          type: 'set_velocity',
          direction: { type: 'random' },
          speed: 10,
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      expect(context.physics.setLinearVelocity).toHaveBeenCalledWith(
        entity.id,
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
      );
    });
  });

  describe('set_velocity overwrite mode', () => {
    it('overwrites current velocity by default', () => {
      entity.behaviors = [{
        definition: {
          type: 'set_velocity',
          direction: { type: 'vector', x: 0, y: 1 }, // down
          speed: 5,
          overwrite: true,
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      expect(context.physics.setLinearVelocity).toHaveBeenCalledWith(
        entity.id,
        { x: 0, y: 5 }
      );
    });
  });
});

describe('MovementBehaviors - apply_impulse', () => {
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
      behaviors: [],
      tags: [],
      tagBits: new Set(),
      conditionalBehaviors: [],
      activeConditionalGroupId: -1,
      active: true,
      physics: { bodyType: 'dynamic' }, // apply_impulse REQUIRES physics body
      children: [],
    } as unknown as RuntimeEntity;

    context = {
      dt: 0.016,
      elapsed: 0,
      input: {},
      physics: {
        applyImpulse: vi.fn(),
        applyImpulseToCenter: vi.fn(),
        getLinearVelocity: vi.fn().mockReturnValue({ x: 0, y: 0 }),
      } as any,
      entityManager: {
        getEntitiesByTag: vi.fn().mockReturnValue([]),
      } as any,
      resolveNumber: (v: any) => v,
      createEvalContextForEntity: vi.fn().mockReturnValue({}),
      computedValues: {
        resolveNumber: (v: any) => v,
        resolveVec2: (v: any) => v,
      } as any,
    } as any;
  });

  describe('apply_impulse with vector direction', () => {
    it('applies impulse with specified magnitude in direction', () => {
      entity.behaviors = [{
        definition: {
          type: 'apply_impulse',
          direction: { type: 'vector', x: 1, y: 0 }, // right
          magnitude: 50, // impulse magnitude
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      // Impulse of 50 in direction (1, 0) = (50, 0)
      expect(context.physics.applyImpulse).toHaveBeenCalledWith(
        entity.id,
        { x: 50, y: 0 }
      );
    });

    it('normalizes non-unit vector direction for impulse', () => {
      entity.behaviors = [{
        definition: {
          type: 'apply_impulse',
          direction: { type: 'vector', x: 3, y: 4 }, // diagonal
          magnitude: 50,
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      // Normalized: (3,4) has length 5, so result is (30, 40)
      expect(context.physics.applyImpulse).toHaveBeenCalledWith(
        entity.id,
        { x: 30, y: 40 }
      );
    });

    it('throws error when entity has no physics body', () => {
      entity.physics = undefined as any;

      entity.behaviors = [{
        definition: {
          type: 'apply_impulse',
          direction: { type: 'vector', x: 1, y: 0 },
          magnitude: 50,
        },
        enabled: true,
        state: {},
      }] as any;

      expect(() => executor.executeAll([entity], context)).toThrow(
        /Cannot apply impulse on entity.*without a physics body/
      );
    });
  });

  describe('apply_impulse with target direction', () => {
    it('applies impulse toward target entity', () => {
      const targetEntity: RuntimeEntity = {
        id: 'target',
        transform: { x: 15, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
      } as unknown as RuntimeEntity;

      (context.entityManager.getEntitiesByTag as Mock).mockReturnValue([targetEntity]);

      entity.behaviors = [{
        definition: {
          type: 'apply_impulse',
          direction: { type: 'toward_target', targetTag: 'player' },
          magnitude: 50,
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      // Target is 10 meters to the right, direction is (1, 0)
      expect(context.physics.applyImpulse).toHaveBeenCalledWith(
        entity.id,
        { x: 50, y: 0 }
      );
    });

    it('applies impulse away from target entity', () => {
      const targetEntity: RuntimeEntity = {
        id: 'target',
        transform: { x: 15, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
      } as unknown as RuntimeEntity;

      (context.entityManager.getEntitiesByTag as Mock).mockReturnValue([targetEntity]);

      entity.behaviors = [{
        definition: {
          type: 'apply_impulse',
          direction: { type: 'away_from_target', targetTag: 'player' },
          magnitude: 50,
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      // Should move left (away from target at x=15)
      expect(context.physics.applyImpulse).toHaveBeenCalledWith(
        entity.id,
        { x: -50, y: 0 }
      );
    });
  });

  describe('apply_impulse with random direction', () => {
    it('applies impulse in random direction', () => {
      entity.behaviors = [{
        definition: {
          type: 'apply_impulse',
          direction: { type: 'random' },
          magnitude: 50,
        },
        enabled: true,
        state: {},
      }] as any;

      executor.executeAll([entity], context);

      expect(context.physics.applyImpulse).toHaveBeenCalledWith(
        entity.id,
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
      );
    });
  });
});
