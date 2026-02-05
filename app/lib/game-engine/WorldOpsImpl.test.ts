import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldOpsImpl } from './WorldOpsImpl';
import type { EntityManager } from './EntityManager';
import type { Physics2D } from '../physics2d/Physics2D';
import type { GodotBridge } from '../godot/types';
import type { TweenSystem } from './animation/TweenSystem';
import type { EventQueue } from './systems/runner/EventQueue';
import type { RuntimeEntity } from './types';
import type { Vec2 } from '@slopcade/shared/types/common';

function createMockEntityManager(): EntityManager {
  const entities = new Map<string, RuntimeEntity>();
  
  const mockEntity: RuntimeEntity = {
    id: 'entity_1',
    name: 'test-entity',
    template: 'ball',
    parentId: undefined,
    children: [],
    localTransform: { x: 5, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
    worldTransform: { x: 5, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
    transform: { x: 5, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
    visual: undefined,
    physics: { bodyType: 'dynamic', density: 1 },
    behaviors: [],
    tags: ['test-tag'],
    tagBits: new Set(),
    layer: 0,
    visible: true,
    active: true,
    colliderId: null,
    conditionalBehaviors: [],
    activeConditionalGroupId: -1,
  };
  
  entities.set('entity_1', mockEntity);
  
  return {
    getEntity: vi.fn((id: string) => entities.get(id)),
    createEntity: vi.fn((def) => {
      const entity: RuntimeEntity = {
        id: 'entity_2',
        name: def.name,
        template: def.template,
        parentId: undefined,
        children: [],
        localTransform: { ...def.transform },
        worldTransform: { ...def.transform },
        transform: { ...def.transform },
        visual: undefined,
        physics: { bodyType: 'dynamic', density: 1 },
        behaviors: [],
        tags: def.tags ?? [],
        tagBits: new Set(),
        layer: 0,
        visible: true,
        active: true,
        colliderId: null,
        conditionalBehaviors: [],
        activeConditionalGroupId: -1,
      };
      entities.set(entity.id, entity);
      return entity;
    }),
    getTemplate: vi.fn((id: string) => {
      if (id === 'ball') {
        return { id: 'ball', name: 'Ball', transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } };
      }
      return undefined;
    }),
    destroyEntity: vi.fn(),
    reparent: vi.fn(),
    addTag: vi.fn(),
    removeTag: vi.fn().mockReturnValue(true),
    hasTag: vi.fn((entityId: string, tag: string) => {
      const entity = entities.get(entityId);
      return entity?.tags.includes(tag) ?? false;
    }),
    setEntityVisible: vi.fn(),
    query: vi.fn(() => []),
    getActiveEntities: vi.fn(() => Array.from(entities.values())),
  } as unknown as EntityManager;
}

function createMockPhysics(): Physics2D {
  return {
    setLinearVelocity: vi.fn(),
    getLinearVelocity: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    setAngularVelocity: vi.fn(),
    getAngularVelocity: vi.fn().mockReturnValue(0),
    applyImpulseToCenter: vi.fn(),
    applyForceToCenter: vi.fn(),
    setTransform: vi.fn(),
    queryPoint: vi.fn().mockReturnValue(null),
    queryAABB: vi.fn().mockReturnValue([]),
    raycast: vi.fn().mockReturnValue(null),
  } as unknown as Physics2D;
}

function createMockBridge(): GodotBridge {
  return {
    setPosition: vi.fn(),
    setRotation: vi.fn(),
    setScale: vi.fn(),
    setVisible: vi.fn(),
    applyImpulse: vi.fn(),
    applyForce: vi.fn(),
  } as unknown as GodotBridge;
}

function createMockTweenSystem(): TweenSystem {
  return {
    createTween: vi.fn((config) => {
      if (config.onComplete) {
        setTimeout(config.onComplete, 0);
      }
      return 'tween_1';
    }),
  } as unknown as TweenSystem;
}

function createMockEventQueue(): EventQueue {
  return {
    emit: vi.fn(),
  } as unknown as EventQueue;
}

describe('WorldOpsImpl', () => {
  let worldOps: WorldOpsImpl;
  let mockEntityManager: EntityManager;
  let mockPhysics: Physics2D;
  let mockBridge: GodotBridge;
  let mockTweenSystem: TweenSystem;
  let mockEventQueue: EventQueue;
  let gameState: { variables: Record<string, unknown>; constants?: Record<string, number | string | boolean> };
  
  beforeEach(() => {
    mockEntityManager = createMockEntityManager();
    mockPhysics = createMockPhysics();
    mockBridge = createMockBridge();
    mockTweenSystem = createMockTweenSystem();
    mockEventQueue = createMockEventQueue();
    gameState = { variables: {}, constants: {} };
    
    worldOps = new WorldOpsImpl(
      mockEntityManager,
      mockPhysics,
      mockBridge,
      mockTweenSystem,
      mockEventQueue,
      () => gameState
    );
  });
  
  describe('spawn', () => {
    it('should spawn entity and return entity ID', async () => {
      const entityId = await worldOps.spawn('ball', { x: 5, y: 10 });
      
      expect(entityId).toBe('entity_2');
      expect(mockEntityManager.createEntity).toHaveBeenCalledWith({
        id: '',
        name: 'ball',
        template: 'ball',
        transform: { x: 5, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
        tags: undefined,
      });
    });
    
    it('should return null if template not found', async () => {
      const entityId = await worldOps.spawn('nonexistent', { x: 0, y: 0 });
      
      expect(entityId).toBeNull();
    });
    
    it('should apply velocity if provided', async () => {
      await worldOps.spawn('ball', { x: 0, y: 0 }, { velocity: { x: 5, y: -10 } });
      
      expect(mockPhysics.setLinearVelocity).toHaveBeenCalledWith('entity_2', { x: 5, y: -10 });
    });
    
    it('should reparent if parentId provided', async () => {
      await worldOps.spawn('ball', { x: 0, y: 0 }, { parentId: 'parent_1' });
      
      expect(mockEntityManager.reparent).toHaveBeenCalledWith('entity_2', 'parent_1');
    });
  });
  
  describe('getPosition', () => {
    it('should read position from EntityManager cache', async () => {
      const position = await worldOps.getPosition('entity_1');
      
      expect(position).toEqual({ x: 5, y: 10 });
      expect(mockEntityManager.getEntity).toHaveBeenCalledWith('entity_1');
    });
    
    it('should return null if entity not found', async () => {
      const position = await worldOps.getPosition('nonexistent');
      
      expect(position).toBeNull();
    });
  });
  
  describe('setPosition', () => {
    it('should update cache and fire bridge call', async () => {
      await worldOps.setPosition('entity_1', { x: 15, y: 20 });
      
      const entity = mockEntityManager.getEntity('entity_1');
      expect(entity?.transform.x).toBe(15);
      expect(entity?.transform.y).toBe(20);
      expect(mockBridge.setPosition).toHaveBeenCalledWith('entity_1', 15, 20);
    });
    
    it('should update physics transform if entity has physics', async () => {
      await worldOps.setPosition('entity_1', { x: 15, y: 20 });
      
      expect(mockPhysics.setTransform).toHaveBeenCalledWith('entity_1', {
        position: { x: 15, y: 20 },
        angle: 0,
      });
    });
    
    it('should do nothing if entity not found', async () => {
      await worldOps.setPosition('nonexistent', { x: 0, y: 0 });
      
      expect(mockBridge.setPosition).not.toHaveBeenCalled();
    });
  });
  
  describe('animate', () => {
    it('should return Promise that resolves on tween completion', async () => {
      const promise = worldOps.animate('entity_1', { x: 100, y: 200 }, { duration: 1000 });
      
      expect(mockTweenSystem.createTween).toHaveBeenCalled();
      
      await promise;
      
      const entity = mockEntityManager.getEntity('entity_1');
      expect(entity?.transform.x).toBe(100);
      expect(entity?.transform.y).toBe(200);
    });
    
    it('should animate rotation', async () => {
      await worldOps.animate('entity_1', { rotation: Math.PI }, { duration: 500 });
      
      expect(mockTweenSystem.createTween).toHaveBeenCalledWith(
        expect.objectContaining({
          property: 'rotation',
          from: 0,
          to: Math.PI,
          duration: 0.5,
        })
      );
    });
    
    it('should animate scale', async () => {
      await worldOps.animate('entity_1', { scaleX: 2, scaleY: 0.5 }, { duration: 300 });
      
      expect(mockTweenSystem.createTween).toHaveBeenCalledWith(
        expect.objectContaining({
          property: 'scale',
          from: { x: 1, y: 1 },
          to: { x: 2, y: 0.5 },
          duration: 0.3,
        })
      );
    });
    
    it('should animate opacity', async () => {
      await worldOps.animate('entity_1', { opacity: 0 }, { duration: 200 });
      
      expect(mockTweenSystem.createTween).toHaveBeenCalledWith(
        expect.objectContaining({
          property: 'opacity',
          from: 1,
          to: 0,
          duration: 0.2,
        })
      );
    });
    
    it('should do nothing if entity not found', async () => {
      await worldOps.animate('nonexistent', { x: 100 }, { duration: 1000 });
      
      expect(mockTweenSystem.createTween).not.toHaveBeenCalled();
    });
  });
  
  describe('wait', () => {
    it('should return Promise that resolves after specified game time', async () => {
      const promise = worldOps.wait(500);
      
      worldOps.updateTimers(0.3);
      worldOps.updateTimers(0.2);
      
      await promise;
    });
    
    it('should support multiple concurrent waits', async () => {
      const promise1 = worldOps.wait(100);
      const promise2 = worldOps.wait(200);
      
      worldOps.updateTimers(0.1);
      await promise1;
      
      worldOps.updateTimers(0.1);
      await promise2;
    });
  });
  
  describe('queryEntities', () => {
    it('should filter by tag', async () => {
      const results = await worldOps.queryEntities({ tag: 'test-tag' });
      
      expect(mockEntityManager.query).toHaveBeenCalledWith({
        tags: ['test-tag'],
        template: undefined,
        withinAabb: undefined,
      });
    });
    
    it('should filter by template', async () => {
      await worldOps.queryEntities({ templateId: 'ball' });
      
      expect(mockEntityManager.query).toHaveBeenCalledWith({
        tags: undefined,
        template: 'ball',
        withinAabb: undefined,
      });
    });
    
    it('should filter by AABB', async () => {
      await worldOps.queryEntities({
        inAABB: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      });
      
      expect(mockEntityManager.query).toHaveBeenCalledWith({
        tags: undefined,
        template: undefined,
        withinAabb: {
          min: { x: 0, y: 0 },
          max: { x: 10, y: 10 },
        },
      });
    });
    
    it('should return all entities if no query provided', async () => {
      await worldOps.queryEntities();
      
      expect(mockEntityManager.getActiveEntities).toHaveBeenCalled();
    });
  });
  
  describe('destroy', () => {
    it('should destroy entity', async () => {
      await worldOps.destroy('entity_1');
      
      expect(mockEntityManager.destroyEntity).toHaveBeenCalledWith('entity_1');
    });
  });
  
  describe('tags', () => {
    it('should add tag', async () => {
      await worldOps.addTag('entity_1', 'new-tag');
      
      expect(mockEntityManager.addTag).toHaveBeenCalledWith('entity_1', 'new-tag');
    });
    
    it('should remove tag', async () => {
      const result = await worldOps.removeTag('entity_1', 'test-tag');
      
      expect(result).toBe(true);
      expect(mockEntityManager.removeTag).toHaveBeenCalledWith('entity_1', 'test-tag');
    });
    
    it('should check if entity has tag', async () => {
      const result = await worldOps.hasTag('entity_1', 'test-tag');
      
      expect(result).toBe(true);
      expect(mockEntityManager.hasTag).toHaveBeenCalledWith('entity_1', 'test-tag');
    });
  });
  
  describe('variables', () => {
    it('should get variable', async () => {
      gameState.variables.score = 100;
      
      const value = await worldOps.getVariable('score');
      
      expect(value).toBe(100);
    });
    
    it('should set variable and emit event', async () => {
      await worldOps.setVariable('score', 200);
      
      expect(gameState.variables.score).toBe(200);
      expect(mockEventQueue.emit).toHaveBeenCalledWith('variable_change', { name: 'score', value: 200 });
    });
    
    it('should get constant', async () => {
      gameState.constants = { maxLives: 3 };
      
      const value = await worldOps.getConstant('maxLives');
      
      expect(value).toBe(3);
    });
  });
  
  describe('game state', () => {
    it('should emit win event', async () => {
      await worldOps.win();
      
      expect(mockEventQueue.emit).toHaveBeenCalledWith('game_state_change', { state: 'won' });
    });
    
    it('should emit lose event', async () => {
      await worldOps.lose();
      
      expect(mockEventQueue.emit).toHaveBeenCalledWith('game_state_change', { state: 'lost' });
    });
    
    it('should emit custom event', async () => {
      await worldOps.emit('custom_event', { foo: 'bar' });
      
      expect(mockEventQueue.emit).toHaveBeenCalledWith('custom_event', { foo: 'bar' });
    });
  });
});
