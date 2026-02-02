import { vi } from 'vitest';
import { RulesEvaluator } from '../RulesEvaluator';
import type { EntityManager } from '../EntityManager';
import type { Physics2D } from '../../physics2d/Physics2D';
import type { InputEvents, CollisionInfo } from '../BehaviorContext';
import type { RuntimeEntity } from '../types';
import type { GameDefinition } from '@slopcade/shared';
import { createGameState } from '../runtime/GameStateHelpers';
import { createGameEventBus } from '../runtime/GameEventBus';
import * as StateHelpers from '../runtime/GameStateHelpers';
import type { GameState, GameEventBus } from '../runtime/types';

export function createMockEntityManager(): EntityManager {
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
    addTag: vi.fn(),
    removeTag: vi.fn(),
  } as any;
}

export function createMockPhysics(): Physics2D {
  return {
    applyImpulseToCenter: vi.fn(),
    applyForceToCenter: vi.fn(),
    setLinearVelocity: vi.fn(),
    getLinearVelocity: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    setAngularVelocity: vi.fn(),
    raycast: vi.fn().mockReturnValue(null),
    getTransform: vi.fn().mockReturnValue({ position: { x: 0, y: 0 } }),
  } as any;
}

export function createMockEntity(id: string, tags: string[] = [], transform?: Partial<RuntimeEntity['transform']>): RuntimeEntity {
  return {
    id,
    name: id,
    tags,
    transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1, ...transform },
    physics: { bodyType: 'dynamic' },
  } as RuntimeEntity;
}

export interface GameTestHarness {
  evaluator: RulesEvaluator;
  entityManager: EntityManager;
  physics: Physics2D;
  gameState: GameState;
  events: GameEventBus;
  runFrame: (inputEvents?: InputEvents, collisions?: CollisionInfo[]) => void;
  runFrames: (count: number, inputEvents?: InputEvents) => void;
  getState: () => {
    gameState: string;
    score: number;
    lives: number;
    variables: Record<string, number | string | boolean>;
  };
  triggerEvent: (eventName: string, data?: unknown) => void;
  setVariable: (name: string, value: number | string | boolean) => void;
  mockEntities: (tag: string, entities: RuntimeEntity[]) => void;
}

export function createGameTestHarness(game: GameDefinition): GameTestHarness {
  const entityManager = createMockEntityManager();
  const physics = createMockPhysics();
  const evaluator = new RulesEvaluator(entityManager);

  const gameState = createGameState(game);
  const events = createGameEventBus();

  evaluator.loadRules(game.rules ?? []);
  evaluator.setWinCondition(game.winCondition);
  evaluator.setLoseCondition(game.loseCondition);
  evaluator.setStateMachineDefinitions(game.stateMachines);

  StateHelpers.setGameStateValue(gameState, 'playing', events);

  const runFrame = (inputEvents: InputEvents = {}, collisions: CollisionInfo[] = []) => {
    evaluator.update(0.016, entityManager, collisions, {}, inputEvents, physics, gameState, events);
  };

  const runFrames = (count: number, inputEvents: InputEvents = {}) => {
    for (let i = 0; i < count; i++) {
      runFrame(inputEvents);
    }
  };

  const getState = () => ({
    gameState: StateHelpers.getGameStateValue(gameState),
    score: StateHelpers.getScore(gameState),
    lives: StateHelpers.getLives(gameState),
    variables: Object.fromEntries(
      Object.entries(gameState.vars).filter(
        ([key]) => !['score', 'lives', 'gameState', 'elapsed'].includes(key)
      )
    ),
  });

  const triggerEvent = (eventName: string, data?: unknown) => {
    StateHelpers.triggerEvent(gameState, eventName, data);
  };

  const setVariable = (name: string, value: number | string | boolean) => {
    StateHelpers.setVar(gameState, name, value, events);
  };

  const mockEntities = (tag: string, entities: RuntimeEntity[]) => {
    const mockFn = entityManager.getEntitiesByTag as ReturnType<typeof vi.fn>;
    const originalImpl = mockFn.getMockImplementation();
    
    mockFn.mockImplementation((queryTag: string) => {
      if (queryTag === tag) return entities;
      if (queryTag === 'ball' && tag.startsWith('in-container-tube-')) {
        return entities.filter(e => e.tags.includes(queryTag));
      }
      if (originalImpl) return originalImpl(queryTag);
      return [];
    });
  };

  return {
    evaluator,
    entityManager,
    physics,
    gameState,
    events,
    runFrame,
    runFrames,
    getState,
    triggerEvent,
    setVariable,
    mockEntities,
  };
}
