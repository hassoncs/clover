import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RulesRuntimeSystem, type RulesSystemConfig } from '../wrappers/RulesRuntimeSystem';
import { createRunnerHarness, createFakeSystemContext } from './helpers/runnerHarness';
import type { InputEvent } from '../types';
import type { EntityManager } from '../../../EntityManager';
import type { Physics2D } from '../../../../physics2d/Physics2D';

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

describe('RulesRuntimeSystem inputEvents wiring', () => {
  let mockEntityManager: EntityManager;
  let mockPhysics: Physics2D;

  beforeEach(() => {
    mockEntityManager = createMockEntityManager();
    mockPhysics = createMockPhysics();
  });

  describe('input events conversion', () => {
    it('converts tap InputEvent to InputEvents.tap format', async () => {
      const tapTriggered = vi.fn();
      
      const config: RulesSystemConfig = {
        rules: [
          {
            id: 'tap-rule',
            trigger: { type: 'tap' },
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

      const tapEvent: InputEvent = {
        type: 'tap',
        x: 100,
        y: 200,
        worldX: 2,
        worldY: 4,
        targetEntityId: 'entity-1',
      };

      harness.injectInputEvents([tapEvent]);
      harness.runFrame();

      const finalScore = rulesEvaluator!.getScore();
      expect(finalScore).toBe(initialScore + 100);
    });

    it('converts drag_start InputEvent to InputEvents.dragStart format', async () => {
      const config: RulesSystemConfig = {
        rules: [
          {
            id: 'drag-start-rule',
            trigger: { type: 'drag', phase: 'start' },
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

      const dragStartEvent: InputEvent = {
        type: 'drag_start',
        x: 100,
        y: 200,
        worldX: 2,
        worldY: 4,
        targetEntityId: 'entity-1',
      };

      harness.injectInputEvents([dragStartEvent]);
      harness.runFrame();

      expect(rulesEvaluator!.getScore()).toBe(50);
    });

    it('converts drag_end InputEvent to InputEvents.dragEnd format', async () => {
      const config: RulesSystemConfig = {
        rules: [
          {
            id: 'drag-end-rule',
            trigger: { type: 'drag', phase: 'end' },
            actions: [
              { type: 'score', operation: 'add', value: 75 },
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

      const dragEndEvent: InputEvent = {
        type: 'drag_end',
        velocityX: 10,
        velocityY: -5,
        worldVelocityX: 0.2,
        worldVelocityY: -0.1,
      };

      harness.injectInputEvents([dragEndEvent]);
      harness.runFrame();

      expect(rulesEvaluator!.getScore()).toBe(75);
    });

    it('converts button_pressed InputEvent to InputEvents.buttonPressed Set', async () => {
      const config: RulesSystemConfig = {
        rules: [
          {
            id: 'button-pressed-rule',
            trigger: { type: 'button', button: 'jump', state: 'pressed' },
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

      const buttonPressedEvent: InputEvent = {
        type: 'button_pressed',
        button: 'jump',
      };

      harness.injectInputEvents([buttonPressedEvent]);
      harness.runFrame();

      expect(rulesEvaluator!.getScore()).toBe(25);
    });

    it('converts button_released InputEvent to InputEvents.buttonReleased Set', async () => {
      const config: RulesSystemConfig = {
        rules: [
          {
            id: 'button-released-rule',
            trigger: { type: 'button', button: 'action', state: 'released' },
            actions: [
              { type: 'score', operation: 'add', value: 30 },
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

      const buttonReleasedEvent: InputEvent = {
        type: 'button_released',
        button: 'action',
      };

      harness.injectInputEvents([buttonReleasedEvent]);
      harness.runFrame();

      expect(rulesEvaluator!.getScore()).toBe(30);
    });

    it('converts game_started InputEvent to InputEvents.gameStarted boolean', async () => {
      const config: RulesSystemConfig = {
        rules: [
          {
            id: 'game-started-rule',
            trigger: { type: 'gameStart' },
            actions: [
              { type: 'score', operation: 'add', value: 1000 },
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

      const gameStartedEvent: InputEvent = {
        type: 'game_started',
      };

      harness.injectInputEvents([gameStartedEvent]);
      harness.runFrame();

      expect(rulesEvaluator!.getScore()).toBe(1000);
    });

    it('handles multiple button events in same frame', async () => {
      const config: RulesSystemConfig = {
        rules: [
          {
            id: 'left-pressed-rule',
            trigger: { type: 'button', button: 'left', state: 'pressed' },
            actions: [
              { type: 'score', operation: 'add', value: 10 },
            ],
          },
          {
            id: 'right-pressed-rule',
            trigger: { type: 'button', button: 'right', state: 'pressed' },
            actions: [
              { type: 'score', operation: 'add', value: 20 },
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

      harness.injectInputEvents([
        { type: 'button_pressed', button: 'left' },
        { type: 'button_pressed', button: 'right' },
      ]);
      harness.runFrame();

      expect(rulesEvaluator!.getScore()).toBe(30);
    });

    it('does not fire tap rule when no tap event is present', async () => {
      const config: RulesSystemConfig = {
        rules: [
          {
            id: 'tap-rule',
            trigger: { type: 'tap' },
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
  });
});
