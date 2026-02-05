import { describe, it, expect, vi } from 'vitest';
import { EntityManager } from '../EntityManager';
import type { Physics2D } from '../../physics2d/Physics2D';
import type { GodotBridge } from '../../godot/types';
import type { GameEntity } from '@slopcade/shared';

function createMockPhysics(): Physics2D {
  return {
    createBody: vi.fn(),
    destroyBody: vi.fn(),
    setLinearVelocity: vi.fn(),
    setAngularVelocity: vi.fn(),
    applyImpulse: vi.fn(),
    getTransform: vi.fn(() => ({ position: { x: 0, y: 0 }, angle: 0 })),
    queryAABB: vi.fn(() => []),
    createJoint: vi.fn(),
    destroyJoint: vi.fn(),
    setGravity: vi.fn(),
    getGravity: vi.fn(() => ({ x: 0, y: 10 })),
    setTimeScale: vi.fn(),
    getTimeScale: vi.fn(() => 1),
    step: vi.fn(),
    raycast: vi.fn(() => []),
  } as unknown as Physics2D;
}

function createMockBridge(): GodotBridge {
  return {
    spawnEntity: vi.fn(() => 'entity_123'),
    destroyEntity: vi.fn(),
    setEntityPosition: vi.fn(),
    setEntityRotation: vi.fn(),
    setEntityScale: vi.fn(),
    setEntityVisible: vi.fn(),
    setEntityImage: vi.fn(),
    loadGame: vi.fn(),
    unloadGame: vi.fn(),
    isReady: vi.fn(() => true),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  } as unknown as GodotBridge;
}

describe('EntityManager - Entity Lifecycle (destroy)', () => {
  describe('destroyEntityInternal', () => {
    it('should call bridge.destroyEntity for a physics entity', () => {
      const physics = createMockPhysics();
      const bridge = createMockBridge();
      const manager = new EntityManager(physics, { bridge });

      const entity: GameEntity = {
        id: 'physics-entity',
        name: 'TestEntity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        physics: {
          bodyType: 'dynamic',
          density: 1,
        },
        collider: {
          shape: 'box',
          width: 1,
          height: 1,
          friction: 0.3,
          restitution: 0.5,
        },
      };

      manager.createEntity(entity);
      manager.destroyEntity('physics-entity');

      expect(bridge.destroyEntity).toHaveBeenCalledTimes(1);
      expect(bridge.destroyEntity).toHaveBeenCalledWith('physics-entity');
    });

    it('should call bridge.destroyEntity for a non-physics entity', () => {
      const physics = createMockPhysics();
      const bridge = createMockBridge();
      const manager = new EntityManager(physics, { bridge });

      const entity: GameEntity = {
        id: 'visual-entity',
        name: 'VisualEntity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        visual: {
          type: 'image',
          url: 'test.png',
          width: 1,
          height: 1,
        },
      };

      manager.createEntity(entity);
      manager.destroyEntity('visual-entity');

      expect(bridge.destroyEntity).toHaveBeenCalledTimes(1);
      expect(bridge.destroyEntity).toHaveBeenCalledWith('visual-entity');
    });

    it('should call physics.destroyBody only for physics entities', () => {
      const physics = createMockPhysics();
      const bridge = createMockBridge();
      const manager = new EntityManager(physics, { bridge });

      const physicsEntity: GameEntity = {
        id: 'physics-entity',
        name: 'PhysicsEntity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        physics: {
          bodyType: 'dynamic',
          density: 1,
        },
        collider: {
          shape: 'box',
          width: 1,
          height: 1,
          friction: 0.3,
          restitution: 0.5,
        },
      };

      const visualEntity: GameEntity = {
        id: 'visual-entity',
        name: 'VisualEntity',
        transform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
        visual: {
          type: 'image',
          url: 'test.png',
          width: 1,
          height: 1,
        },
      };

      manager.createEntity(physicsEntity);
      manager.createEntity(visualEntity);

      expect(physics.destroyBody).not.toHaveBeenCalled();

      manager.destroyEntity('physics-entity');

      expect(physics.destroyBody).toHaveBeenCalledTimes(1);
      expect(physics.destroyBody).toHaveBeenCalledWith('physics-entity');

      manager.destroyEntity('visual-entity');

      expect(physics.destroyBody).toHaveBeenCalledTimes(1);
    });

    it('should not call physics.destroyBody for visual-only entities', () => {
      const physics = createMockPhysics();
      const bridge = createMockBridge();
      const manager = new EntityManager(physics, { bridge });

      const visualEntity: GameEntity = {
        id: 'visual-only',
        name: 'VisualOnly',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        visual: {
          type: 'image',
          url: 'visual.png',
          width: 2,
          height: 2,
        },
      };

      manager.createEntity(visualEntity);
      manager.destroyEntity('visual-only');

      expect(bridge.destroyEntity).toHaveBeenCalledWith('visual-only');
      expect(physics.destroyBody).not.toHaveBeenCalled();
    });

    it('should handle entities with both physics and visual components', () => {
      const physics = createMockPhysics();
      const bridge = createMockBridge();
      const manager = new EntityManager(physics, { bridge });

      const entity: GameEntity = {
        id: 'hybrid-entity',
        name: 'HybridEntity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        physics: {
          bodyType: 'dynamic',
          density: 1,
        },
        collider: {
          shape: 'circle',
          radius: 0.5,
          friction: 0.3,
          restitution: 0.5,
        },
        visual: {
          type: 'image',
          url: 'ball.png',
          width: 1,
          height: 1,
        },
      };

      manager.createEntity(entity);
      manager.destroyEntity('hybrid-entity');

      expect(bridge.destroyEntity).toHaveBeenCalledTimes(1);
      expect(bridge.destroyEntity).toHaveBeenCalledWith('hybrid-entity');
      expect(physics.destroyBody).toHaveBeenCalledTimes(1);
      expect(physics.destroyBody).toHaveBeenCalledWith('hybrid-entity');
    });

    it('should handle destroying non-existent entity gracefully', () => {
      const physics = createMockPhysics();
      const bridge = createMockBridge();
      const manager = new EntityManager(physics, { bridge });

      manager.destroyEntity('non-existent');

      expect(bridge.destroyEntity).not.toHaveBeenCalled();
      expect(physics.destroyBody).not.toHaveBeenCalled();
    });

    it('should clean up entity from internal maps after destroy', () => {
      const physics = createMockPhysics();
      const bridge = createMockBridge();
      const manager = new EntityManager(physics, { bridge });

      const entity: GameEntity = {
        id: 'test-entity',
        name: 'TestEntity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        tags: ['test'],
      };

      manager.createEntity(entity);
      expect(manager.getEntity('test-entity')).toBeDefined();

      manager.destroyEntity('test-entity');

      expect(manager.getEntity('test-entity')).toBeUndefined();
    });

    it('should return entity to pool after destroy', () => {
      const physics = createMockPhysics();
      const bridge = createMockBridge();
      const manager = new EntityManager(physics, { bridge });

      const entity: GameEntity = {
        id: 'pooled-entity',
        name: 'PooledEntity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      };

      manager.createEntity(entity);
      const countBefore = manager.getEntityCount();

      manager.destroyEntity('pooled-entity');
      const countAfter = manager.getEntityCount();

      expect(countBefore).toBe(1);
      expect(countAfter).toBe(0);
    });
  });
});
