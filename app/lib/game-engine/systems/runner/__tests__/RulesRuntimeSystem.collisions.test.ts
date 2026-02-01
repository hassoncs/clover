import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RulesRuntimeSystem, type RulesSystemConfig } from '../wrappers/RulesRuntimeSystem';
import { createRunnerHarness, createFakeSystemContext } from './helpers/runnerHarness';
import type { CollisionInfo } from '../../../BehaviorContext';
import type { EntityManager } from '../../../EntityManager';
import type { Physics2D } from '../../../../physics2d/Physics2D';
import type { RuntimeEntity } from '../../../types';

function createMockEntityManager(): EntityManager {
  return {
    getEntityCountByTag: vi.fn().mockReturnValue(0),
    getEntitiesByTag: vi.fn().mockReturnValue([]),
    getEntity: vi.fn(),
    destroyEntity: vi.fn(),
    clearAll: vi.fn(),
    createEntity: vi.fn(),
    getTemplate: vi.fn().mockReturnValue({ id: 'test' }),
    getActiveEntities: vi.fn().mockReturnValue([]),
    getVisibleEntities: vi.fn().mockReturnValue([]),
    hasTag: vi.fn().mockReturnValue(false),
  } as unknown as EntityManager;
}

function createMockPhysics(): Physics2D {
  return {
    applyImpulseToCenter: vi.fn(),
    applyForceToCenter: vi.fn(),
    setLinearVelocity: vi.fn(),
    getLinearVelocity: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    setAngularVelocity: vi.fn(),
    raycast: vi.fn().mockReturnValue(null),
    getTransform: vi.fn().mockReturnValue({ position: { x: 0, y: 0 } }),
  } as unknown as Physics2D;
}

function createMockEntity(id: string, tags: string[]): RuntimeEntity {
  return {
    id,
    tags,
    transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
  } as RuntimeEntity;
}

describe('RulesRuntimeSystem collisions wiring', () => {
  let mockEntityManager: EntityManager;
  let mockPhysics: Physics2D;

  beforeEach(() => {
    mockEntityManager = createMockEntityManager();
    mockPhysics = createMockPhysics();
  });

  describe('collision events', () => {
    it('triggers collision rule when collision is injected via harness', async () => {
      const config: RulesSystemConfig = {
        rules: [
          {
            id: 'ball-peg-collision',
            trigger: {
              type: 'collision',
              entityATag: 'ball',
              entityBTag: 'peg',
            },
            actions: [
              { type: 'score', operation: 'add', value: 100 },
            ],
          },
        ],
      };

      const rulesSystem = new RulesRuntimeSystem(config);

      const context = createFakeSystemContext({
        entityManager: mockEntityManager,
        physics: mockPhysics,
      });

      const harness = await createRunnerHarness({
        systems: [rulesSystem],
        context,
      });

      const rulesEvaluator = rulesSystem.getRulesEvaluator();
      expect(rulesEvaluator).not.toBeNull();

      rulesEvaluator!.start();
      const initialScore = rulesEvaluator!.getScore();
      expect(initialScore).toBe(0);

      const ballEntity = createMockEntity('ball-1', ['ball']);
      const pegEntity = createMockEntity('peg-1', ['peg']);

      const collision: CollisionInfo = {
        entityA: ballEntity,
        entityB: pegEntity,
        normal: { x: 0, y: 1 },
        impulse: 10,
      };

      harness.injectCollisions([collision]);
      harness.runFrame();

      const finalScore = rulesEvaluator!.getScore();
      expect(finalScore).toBe(100);
    });

    it('does not trigger collision rule when no collisions are present', async () => {
      const config: RulesSystemConfig = {
        rules: [
          {
            id: 'ball-peg-collision',
            trigger: {
              type: 'collision',
              entityATag: 'ball',
              entityBTag: 'peg',
            },
            actions: [
              { type: 'score', operation: 'add', value: 100 },
            ],
          },
        ],
      };

      const rulesSystem = new RulesRuntimeSystem(config);

      const context = createFakeSystemContext({
        entityManager: mockEntityManager,
        physics: mockPhysics,
      });

      const harness = await createRunnerHarness({
        systems: [rulesSystem],
        context,
      });

      const rulesEvaluator = rulesSystem.getRulesEvaluator();
      rulesEvaluator!.start();

      harness.runFrame();

      expect(rulesEvaluator!.getScore()).toBe(0);
    });

    it('triggers collision rule with reversed entity order (B-A instead of A-B)', async () => {
      const config: RulesSystemConfig = {
        rules: [
          {
            id: 'ball-peg-collision',
            trigger: {
              type: 'collision',
              entityATag: 'ball',
              entityBTag: 'peg',
            },
            actions: [
              { type: 'score', operation: 'add', value: 50 },
            ],
          },
        ],
      };

      const rulesSystem = new RulesRuntimeSystem(config);

      const context = createFakeSystemContext({
        entityManager: mockEntityManager,
        physics: mockPhysics,
      });

      const harness = await createRunnerHarness({
        systems: [rulesSystem],
        context,
      });

      const rulesEvaluator = rulesSystem.getRulesEvaluator();
      rulesEvaluator!.start();

      const ballEntity = createMockEntity('ball-1', ['ball']);
      const pegEntity = createMockEntity('peg-1', ['peg']);

      const collision: CollisionInfo = {
        entityA: pegEntity,
        entityB: ballEntity,
        normal: { x: 0, y: 1 },
        impulse: 10,
      };

      harness.injectCollisions([collision]);
      harness.runFrame();

      expect(rulesEvaluator!.getScore()).toBe(50);
    });

    it('fires rule once per frame even with multiple matching collisions (rule-level not collision-level)', async () => {
      const config: RulesSystemConfig = {
        rules: [
          {
            id: 'ball-peg-collision',
            trigger: {
              type: 'collision',
              entityATag: 'ball',
              entityBTag: 'peg',
            },
            actions: [
              { type: 'score', operation: 'add', value: 25 },
            ],
          },
        ],
      };

      const rulesSystem = new RulesRuntimeSystem(config);

      const context = createFakeSystemContext({
        entityManager: mockEntityManager,
        physics: mockPhysics,
      });

      const harness = await createRunnerHarness({
        systems: [rulesSystem],
        context,
      });

      const rulesEvaluator = rulesSystem.getRulesEvaluator();
      rulesEvaluator!.start();

      const ballEntity = createMockEntity('ball-1', ['ball']);
      const peg1Entity = createMockEntity('peg-1', ['peg']);
      const peg2Entity = createMockEntity('peg-2', ['peg']);
      const peg3Entity = createMockEntity('peg-3', ['peg']);

      harness.injectCollisions([
        { entityA: ballEntity, entityB: peg1Entity, normal: { x: 0, y: 1 }, impulse: 10 },
        { entityA: ballEntity, entityB: peg2Entity, normal: { x: 0, y: 1 }, impulse: 10 },
        { entityA: ballEntity, entityB: peg3Entity, normal: { x: 0, y: 1 }, impulse: 10 },
      ]);
      harness.runFrame();

      expect(rulesEvaluator!.getScore()).toBe(25);
    });

    it('does not trigger rule when collision tags do not match', async () => {
      const config: RulesSystemConfig = {
        rules: [
          {
            id: 'ball-peg-collision',
            trigger: {
              type: 'collision',
              entityATag: 'ball',
              entityBTag: 'peg',
            },
            actions: [
              { type: 'score', operation: 'add', value: 100 },
            ],
          },
        ],
      };

      const rulesSystem = new RulesRuntimeSystem(config);

      const context = createFakeSystemContext({
        entityManager: mockEntityManager,
        physics: mockPhysics,
      });

      const harness = await createRunnerHarness({
        systems: [rulesSystem],
        context,
      });

      const rulesEvaluator = rulesSystem.getRulesEvaluator();
      rulesEvaluator!.start();

      const ballEntity = createMockEntity('ball-1', ['ball']);
      const wallEntity = createMockEntity('wall-1', ['wall']);

      const collision: CollisionInfo = {
        entityA: ballEntity,
        entityB: wallEntity,
        normal: { x: 0, y: 1 },
        impulse: 10,
      };

      harness.injectCollisions([collision]);
      harness.runFrame();

      expect(rulesEvaluator!.getScore()).toBe(0);
    });

    it('triggers multiple different collision rules in same frame', async () => {
      const config: RulesSystemConfig = {
        rules: [
          {
            id: 'ball-peg-collision',
            trigger: {
              type: 'collision',
              entityATag: 'ball',
              entityBTag: 'peg',
            },
            actions: [
              { type: 'score', operation: 'add', value: 100 },
            ],
          },
          {
            id: 'ball-coin-collision',
            trigger: {
              type: 'collision',
              entityATag: 'ball',
              entityBTag: 'coin',
            },
            actions: [
              { type: 'score', operation: 'add', value: 500 },
            ],
          },
        ],
      };

      const rulesSystem = new RulesRuntimeSystem(config);

      const context = createFakeSystemContext({
        entityManager: mockEntityManager,
        physics: mockPhysics,
      });

      const harness = await createRunnerHarness({
        systems: [rulesSystem],
        context,
      });

      const rulesEvaluator = rulesSystem.getRulesEvaluator();
      rulesEvaluator!.start();

      const ballEntity = createMockEntity('ball-1', ['ball']);
      const pegEntity = createMockEntity('peg-1', ['peg']);
      const coinEntity = createMockEntity('coin-1', ['coin']);

      harness.injectCollisions([
        { entityA: ballEntity, entityB: pegEntity, normal: { x: 0, y: 1 }, impulse: 10 },
        { entityA: ballEntity, entityB: coinEntity, normal: { x: 0, y: 1 }, impulse: 10 },
      ]);
      harness.runFrame();

      expect(rulesEvaluator!.getScore()).toBe(600);
    });
  });
});
