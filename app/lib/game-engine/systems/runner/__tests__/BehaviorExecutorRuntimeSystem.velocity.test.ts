import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BehaviorExecutorRuntimeSystem } from '../wrappers/BehaviorExecutorRuntimeSystem';
import type { SystemContext, UpdateContext } from '../types';
import type { RuntimeEntity } from '../../../types';

describe('BehaviorExecutorRuntimeSystem - velocity in EvalContext', () => {
  let system: BehaviorExecutorRuntimeSystem;
  let mockContext: SystemContext;
  let mockUpdateContext: UpdateContext;
  let mockPhysics: ReturnType<typeof createMockPhysics>;

  function createMockPhysics() {
    return {
      createWorld: vi.fn(),
      destroyWorld: vi.fn(),
      step: vi.fn(),
      dispose: vi.fn(),
      createBody: vi.fn(),
      destroyBody: vi.fn(),
      getTransform: vi.fn(),
      setTransform: vi.fn(),
      getLinearVelocity: vi.fn().mockReturnValue({ x: 0, y: 0 }),
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
  }

  beforeEach(() => {
    mockPhysics = createMockPhysics();

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
      emit: vi.fn(),
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
      frame: {
        inputEvents: [],
        collisions: [],
      },
    };

    system = new BehaviorExecutorRuntimeSystem({
      pixelsPerMeter: 50,
    });
  });

  describe('createEvalContextForEntity velocity', () => {
    it('should read velocity from physics.getLinearVelocity when entity has physics', () => {
      system.initialize(mockContext, { pixelsPerMeter: 50 });

      const expectedVelocity = { x: 5.5, y: -3.2 };
      mockPhysics.getLinearVelocity.mockReturnValue(expectedVelocity);

      let capturedEvalContext: any = null;

      const executor = system.getBehaviorExecutor()!;
      const originalExecuteAll = executor.executeAll.bind(executor);
      executor.executeAll = (entities, context) => {
        if (entities.length > 0) {
          capturedEvalContext = context.createEvalContextForEntity(entities[0]);
        }
        return originalExecuteAll(entities, context);
      };

      const mockEntity: RuntimeEntity = {
        id: 'moving_entity',
        name: 'test',
        template: 'test-template',
        active: true,
        transform: { x: 10, y: 20, angle: 0.5, scaleX: 1, scaleY: 1 },
        localTransform: { x: 10, y: 20, angle: 0.5, scaleX: 1, scaleY: 1 },
        worldTransform: { x: 10, y: 20, angle: 0.5, scaleX: 1, scaleY: 1 },
        children: [],
        behaviors: [],
        conditionalBehaviors: [],
        activeConditionalGroupId: -1,
        tags: [],
        tagBits: new Set(),
        layer: 0,
        visible: true,
        physics: { bodyType: 'dynamic' } as any,
        colliderId: null,
      };

      mockContext.entityManager.getAllEntities = vi.fn().mockReturnValue([mockEntity]);

      system.update(mockUpdateContext, system.getState());

      expect(mockPhysics.getLinearVelocity).toHaveBeenCalledWith(mockEntity.id);
      expect(capturedEvalContext).not.toBeNull();
      expect(capturedEvalContext!.entity!.vx).toBe(expectedVelocity.x);
      expect(capturedEvalContext!.entity!.vy).toBe(expectedVelocity.y);
    });

    it('should use 0,0 velocity when entity has no physics', () => {
      system.initialize(mockContext, { pixelsPerMeter: 50 });

      let capturedEvalContext: any = null;

      const executor = system.getBehaviorExecutor()!;
      const originalExecuteAll = executor.executeAll.bind(executor);
      executor.executeAll = (entities, context) => {
        if (entities.length > 0) {
          capturedEvalContext = context.createEvalContextForEntity(entities[0]);
        }
        return originalExecuteAll(entities, context);
      };

      const mockEntity: RuntimeEntity = {
        id: 'static_entity',
        name: 'test',
        template: 'test-template',
        active: true,
        transform: { x: 10, y: 20, angle: 0.5, scaleX: 1, scaleY: 1 },
        localTransform: { x: 10, y: 20, angle: 0.5, scaleX: 1, scaleY: 1 },
        worldTransform: { x: 10, y: 20, angle: 0.5, scaleX: 1, scaleY: 1 },
        children: [],
        behaviors: [],
        conditionalBehaviors: [],
        activeConditionalGroupId: -1,
        tags: [],
        tagBits: new Set(),
        layer: 0,
        visible: true,
        colliderId: null,
      };

      mockContext.entityManager.getAllEntities = vi.fn().mockReturnValue([mockEntity]);

      system.update(mockUpdateContext, system.getState());

      expect(mockPhysics.getLinearVelocity).not.toHaveBeenCalled();
      expect(capturedEvalContext).not.toBeNull();
      expect(capturedEvalContext!.entity!.vx).toBe(0);
      expect(capturedEvalContext!.entity!.vy).toBe(0);
    });
  });
});
