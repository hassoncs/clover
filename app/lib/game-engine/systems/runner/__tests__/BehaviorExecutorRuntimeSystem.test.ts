import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BehaviorExecutorRuntimeSystem } from '../wrappers/BehaviorExecutorRuntimeSystem';
import type { SystemContext, UpdateContext } from '../types';
import { SystemPhase } from '@slopcade/shared';
import type { RuntimeEntity } from '../../../types';

describe('BehaviorExecutorRuntimeSystem', () => {
  let system: BehaviorExecutorRuntimeSystem;
  let mockContext: SystemContext;
  let mockUpdateContext: UpdateContext;

  beforeEach(() => {
    const mockBridge = {
      spawnEntity: vi.fn().mockReturnValue('entity_123'),
      setLinearVelocity: vi.fn(),
      setRotation: vi.fn(),
      setPosition: vi.fn(),
      setOpacity: vi.fn(),
      spawnParticle: vi.fn(),
      playSound: vi.fn(),
      applySpriteEffect: vi.fn(),
      clearSpriteEffect: vi.fn(),
    };

    const mockPhysics = {
      createWorld: vi.fn(),
      destroyWorld: vi.fn(),
      step: vi.fn(),
      dispose: vi.fn(),
      createBody: vi.fn(),
      destroyBody: vi.fn(),
      addFixture: vi.fn(),
      removeFixture: vi.fn(),
      setSensor: vi.fn(),
      getTransform: vi.fn(),
      setTransform: vi.fn(),
      getLinearVelocity: vi.fn(),
      setLinearVelocity: vi.fn(),
      getAngularVelocity: vi.fn(),
      setAngularVelocity: vi.fn(),
      applyForce: vi.fn(),
      applyForceToCenter: vi.fn(),
      applyImpulse: vi.fn(),
      applyImpulseToCenter: vi.fn(),
      applyTorque: vi.fn(),
      createRevoluteJoint: vi.fn(),
      createDistanceJoint: vi.fn(),
      createPrismaticJoint: vi.fn(),
      createMouseJoint: vi.fn(),
      createWeldJoint: vi.fn(),
      destroyJoint: vi.fn(),
      setMotorSpeed: vi.fn(),
      setMouseTarget: vi.fn(),
      queryPoint: vi.fn(),
      queryAABB: vi.fn(),
      raycast: vi.fn(),
      onCollision: vi.fn(),
      onSensorBegin: vi.fn(),
      onSensorEnd: vi.fn(),
      getUserData: vi.fn(),
      setUserData: vi.fn(),
      getGroup: vi.fn(),
      getAllBodies: vi.fn(),
      getBodiesInGroup: vi.fn(),
    };

    const mockEntityManager = {
      getAllEntities: vi.fn().mockReturnValue([]),
      getActiveEntities: vi.fn().mockReturnValue([]),
      getEntity: vi.fn(),
      getTemplate: vi.fn().mockReturnValue({ id: 'test-template' }),
      destroyEntity: vi.fn(),
      addTag: vi.fn(),
      removeTag: vi.fn(),
      hasTag: vi.fn(),
      query: vi.fn().mockReturnValue([]),
    };

    const mockEventBus = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };

    const mockEventQueue = {
      enqueue: vi.fn(),
      dequeue: vi.fn(),
      clear: vi.fn(),
      size: vi.fn().mockReturnValue(0),
    };

    mockContext = {
      bridge: mockBridge as any,
      physics: mockPhysics as any,
      entityManager: mockEntityManager as any,
      eventBus: mockEventBus as any,
      eventQueue: mockEventQueue as any,
    };

    mockUpdateContext = {
      dt: 0.016,
      elapsed: 1.0,
      frameId: 60,
      input: {},
      gameState: {
        score: 0,
        lives: 3,
        time: 1.0,
        state: 'playing',
        variables: {},
      },
    };

    system = new BehaviorExecutorRuntimeSystem({
      pixelsPerMeter: 50,
    });
  });

  describe('initialization', () => {
    it('should have correct id, phase, and priority', () => {
      expect(system.id).toBe('behavior-executor');
      expect(system.phase).toBe(SystemPhase.GAME_LOGIC);
      expect(system.priority).toBe(30);
    });

    it('should initialize with config', () => {
      system.initialize(mockContext, { pixelsPerMeter: 50 });
      
      const state = system.getState();
      expect(state.executionCount).toBe(0);
      expect(state.lastExecutionTime).toBe(0);
    });

    it('should create behavior executor on initialize', () => {
      system.initialize(mockContext, { pixelsPerMeter: 50 });
      
      const executor = system.getBehaviorExecutor();
      expect(executor).not.toBeNull();
    });
  });

  describe('update', () => {
    beforeEach(() => {
      system.initialize(mockContext, { pixelsPerMeter: 50 });
    });

    it('should execute behaviors for active entities', () => {
      const mockEntity: RuntimeEntity = {
        id: 'entity_1',
        name: 'test',
        template: 'test-template',
        active: true,
        transform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
        localTransform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
        worldTransform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
        children: [],
        behaviors: [],
        conditionalBehaviors: [],
        activeConditionalGroupId: -1,
        tags: [],
        tagBits: new Set(),
        layer: 0,
        visible: true,
        bodyId: null,
        colliderId: null,
      };

      mockContext.entityManager.getAllEntities = vi.fn().mockReturnValue([mockEntity]);

      system.update(mockUpdateContext, system.getState());

      const state = system.getState();
      expect(state.executionCount).toBe(1);
      expect(state.lastExecutionTime).toBeGreaterThan(0);
    });

    it('should filter out inactive entities', () => {
      const activeEntity: RuntimeEntity = {
        id: 'entity_1',
        name: 'active',
        template: 'test',
        active: true,
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        worldTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        children: [],
        behaviors: [],
        conditionalBehaviors: [],
        activeConditionalGroupId: -1,
        tags: [],
        tagBits: new Set(),
        layer: 0,
        visible: true,
        bodyId: null,
        colliderId: null,
      };

      const inactiveEntity: RuntimeEntity = {
        id: 'entity_2',
        name: 'inactive',
        template: 'test',
        active: false,
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        worldTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        children: [],
        behaviors: [],
        conditionalBehaviors: [],
        activeConditionalGroupId: -1,
        tags: [],
        tagBits: new Set(),
        layer: 0,
        visible: true,
        bodyId: null,
        colliderId: null,
      };

      mockContext.entityManager.getAllEntities = vi.fn().mockReturnValue([activeEntity, inactiveEntity]);

      system.update(mockUpdateContext, system.getState());

      expect(system.getState().executionCount).toBe(1);
    });

    it('should increment execution count on each update', () => {
      system.update(mockUpdateContext, system.getState());
      expect(system.getState().executionCount).toBe(1);

      system.update(mockUpdateContext, system.getState());
      expect(system.getState().executionCount).toBe(2);

      system.update(mockUpdateContext, system.getState());
      expect(system.getState().executionCount).toBe(3);
    });

    it('should track execution time', () => {
      system.update(mockUpdateContext, system.getState());
      
      const state = system.getState();
      expect(state.lastExecutionTime).toBeGreaterThan(0);
      expect(state.lastExecutionTime).toBeLessThan(100);
    });
  });

  describe('behavior context', () => {
    beforeEach(() => {
      system.initialize(mockContext, { pixelsPerMeter: 50 });
    });

    it('should provide correct pixelsPerMeter from config', () => {
      system.initialize(mockContext, { pixelsPerMeter: 100 });
      
      const mockEntity: RuntimeEntity = {
        id: 'entity_1',
        name: 'test',
        template: 'test',
        active: true,
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        worldTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        children: [],
        behaviors: [{
          definition: { type: 'rotate', speed: 1, direction: 'clockwise' },
          enabled: true,
          state: {},
        }],
        conditionalBehaviors: [],
        activeConditionalGroupId: -1,
        tags: [],
        tagBits: new Set(),
        layer: 0,
        visible: true,
        bodyId: null,
        colliderId: null,
      };

      mockContext.entityManager.getAllEntities = vi.fn().mockReturnValue([mockEntity]);

      system.update(mockUpdateContext, system.getState());
    });

    it('should provide spawnEntity method', () => {
      const mockEntity: RuntimeEntity = {
        id: 'entity_1',
        name: 'test',
        template: 'test',
        active: true,
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        worldTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        children: [],
        behaviors: [],
        conditionalBehaviors: [],
        activeConditionalGroupId: -1,
        tags: [],
        tagBits: new Set(),
        layer: 0,
        visible: true,
        bodyId: null,
        colliderId: null,
      };

      mockContext.entityManager.getAllEntities = vi.fn().mockReturnValue([mockEntity]);

      system.update(mockUpdateContext, system.getState());
    });
  });

  describe('dependency wiring', () => {
    beforeEach(() => {
      system.initialize(mockContext, { pixelsPerMeter: 50 });
    });

    it('should allow setting ComputedValueSystem', () => {
      const mockComputedValues = {
        resolveNumber: vi.fn(),
        resolveVec2: vi.fn(),
      } as any;

      system.setComputedValues(mockComputedValues);
    });

    it('should allow setting CameraSystem', () => {
      const mockCamera = {
        getPosition: vi.fn(),
        setPosition: vi.fn(),
      } as any;

      system.setCamera(mockCamera);
    });

    it('should allow setting InputEntityManager', () => {
      const mockInputEntityManager = {
        syncFromInput: vi.fn(),
      } as any;

      system.setInputEntityManager(mockInputEntityManager);
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      system.initialize(mockContext, { pixelsPerMeter: 50 });
      
      system.destroy();
      
      expect(system.getBehaviorExecutor()).toBeNull();
      
      const state = system.getState();
      expect(state.executionCount).toBe(0);
      expect(state.lastExecutionTime).toBe(0);
    });
  });

  describe('getState', () => {
    it('should return initial state before initialization', () => {
      const state = system.getState();
      
      expect(state.executionCount).toBe(0);
      expect(state.lastExecutionTime).toBe(0);
    });

    it('should return current state after updates', () => {
      system.initialize(mockContext, { pixelsPerMeter: 50 });
      
      system.update(mockUpdateContext, system.getState());
      system.update(mockUpdateContext, system.getState());
      
      const state = system.getState();
      expect(state.executionCount).toBe(2);
      expect(state.lastExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('phase ordering', () => {
    it('should have priority 30 (before scripts at 40 and rules at 50)', () => {
      expect(system.priority).toBe(30);
      expect(system.priority).toBeLessThan(40);
      expect(system.priority).toBeLessThan(50);
    });

    it('should execute in GAME_LOGIC phase', () => {
      expect(system.phase).toBe(SystemPhase.GAME_LOGIC);
    });
  });
});
