import { describe, it, expect, vi } from 'vitest';
import { BehaviorExecutorRuntimeSystem } from '../wrappers/BehaviorExecutorRuntimeSystem';
import { createRunnerHarness, createFakeSystemContext } from './helpers/runnerHarness';
import type { RuntimeEntity } from '../../../types';
import type { CollisionInfo } from '../../../BehaviorContext';
import { createComputedValueSystem } from '@slopcade/shared';

describe('BehaviorExecutorRuntimeSystem collision wiring', () => {
  function createTestEntity(overrides: Partial<RuntimeEntity> = {}): RuntimeEntity {
    return {
      id: 'entity_1',
      name: 'test',
      template: 'test-template',
      active: true,
      transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      worldTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      children: [],
      behaviors: [],
      conditionalBehaviors: [],
      activeConditionalGroupId: -1,
      tags: ['ball'],
      tagBits: new Set(),
      layer: 0,
      visible: true,
      bodyId: null,
      colliderId: null,
      ...overrides,
    };
  }

  function createOtherEntity(): RuntimeEntity {
    return createTestEntity({
      id: 'entity_2',
      name: 'peg',
      tags: ['peg'],
    });
  }

  it('should pass collisions from ctx.frame.collisions to behavior context', async () => {
    const entityA = createTestEntity({
      id: 'ball',
      tags: ['ball'],
      behaviors: [
        {
          definition: {
            type: 'destroy_on_collision',
            withTags: ['peg'],
          },
          enabled: true,
          state: {},
        },
      ],
    });

    const entityB = createOtherEntity();

    const mockEntityManager = {
      getAllEntities: vi.fn().mockReturnValue([entityA, entityB]),
      getActiveEntities: vi.fn().mockReturnValue([entityA, entityB]),
      getEntity: vi.fn((id: string) => (id === 'ball' ? entityA : entityB)),
      getTemplate: vi.fn().mockReturnValue({ id: 'test-template' }),
      destroyEntity: vi.fn(),
      addTag: vi.fn(),
      removeTag: vi.fn(),
      hasTag: vi.fn(),
      query: vi.fn().mockReturnValue([]),
      getEntitiesByTag: vi.fn().mockReturnValue([]),
    };

    const computedValues = createComputedValueSystem();

    const system = new BehaviorExecutorRuntimeSystem({ pixelsPerMeter: 50 });
    system.setComputedValues(computedValues);

    const context = createFakeSystemContext({
      entityManager: mockEntityManager,
    });

    const harness = await createRunnerHarness({
      systems: [system],
      context,
    });

    const collision: CollisionInfo = {
      entityA,
      entityB,
      normal: { x: 0, y: 1 },
      impulse: 10,
    };

    harness.injectCollisions([collision]);
    harness.runFrame();

    expect(mockEntityManager.destroyEntity).toHaveBeenCalledWith('ball');
  });

  it('should receive empty collisions array when no collisions injected', async () => {
    const entityA = createTestEntity({
      id: 'ball',
      tags: ['ball'],
      behaviors: [
        {
          definition: {
            type: 'destroy_on_collision',
            withTags: ['peg'],
          },
          enabled: true,
          state: {},
        },
      ],
    });

    const mockEntityManager = {
      getAllEntities: vi.fn().mockReturnValue([entityA]),
      getActiveEntities: vi.fn().mockReturnValue([entityA]),
      getEntity: vi.fn().mockReturnValue(entityA),
      getTemplate: vi.fn().mockReturnValue({ id: 'test-template' }),
      destroyEntity: vi.fn(),
      addTag: vi.fn(),
      removeTag: vi.fn(),
      hasTag: vi.fn(),
      query: vi.fn().mockReturnValue([]),
      getEntitiesByTag: vi.fn().mockReturnValue([]),
    };

    const computedValues = createComputedValueSystem();

    const system = new BehaviorExecutorRuntimeSystem({ pixelsPerMeter: 50 });
    system.setComputedValues(computedValues);

    const context = createFakeSystemContext({
      entityManager: mockEntityManager,
    });

    const harness = await createRunnerHarness({
      systems: [system],
      context,
    });

    harness.runFrame();

    expect(mockEntityManager.destroyEntity).not.toHaveBeenCalled();
  });
});
