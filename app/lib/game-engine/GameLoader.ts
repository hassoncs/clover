import type { GameDefinition, GameEntity } from '@slopcade/shared';
import type { Physics2D } from '../physics2d/Physics2D';
import { EntityManager } from './EntityManager';
import { RulesEvaluator } from './RulesEvaluator';
import { createBehaviorExecutor, BehaviorExecutor } from './BehaviorExecutor';

export interface LoadedGame {
  definition: GameDefinition;
  entityManager: EntityManager;
  rulesEvaluator: RulesEvaluator;
  behaviorExecutor: BehaviorExecutor;
  pixelsPerMeter: number;
}

export interface GameLoaderOptions {
  physics: Physics2D;
}

export class GameLoader {
  private physics: Physics2D;

  constructor(options: GameLoaderOptions) {
    this.physics = options.physics;
  }

  load(definition: GameDefinition): LoadedGame {
    const pixelsPerMeter = definition.world.pixelsPerMeter ?? 50;

    this.physics.createWorld(definition.world.gravity);

    const entityManager = new EntityManager(this.physics, {
      templates: definition.templates,
    });

    for (const entity of definition.entities) {
      entityManager.createEntity(entity);
    }

    const rulesEvaluator = new RulesEvaluator();
    rulesEvaluator.loadRules(definition.rules ?? []);
    rulesEvaluator.setWinCondition(definition.winCondition);
    rulesEvaluator.setLoseCondition(definition.loseCondition);

    const behaviorExecutor = createBehaviorExecutor();

    return {
      definition,
      entityManager,
      rulesEvaluator,
      behaviorExecutor,
      pixelsPerMeter,
    };
  }

  unload(game: LoadedGame): void {
    game.entityManager.clearAll();
    this.physics.destroyWorld();
  }

  reload(game: LoadedGame): LoadedGame {
    this.unload(game);
    return this.load(game.definition);
  }
}

export function validateGameDefinition(definition: unknown): definition is GameDefinition {
  if (!definition || typeof definition !== 'object') return false;

  const def = definition as Record<string, unknown>;

  if (!def.metadata || typeof def.metadata !== 'object') return false;
  if (!def.world || typeof def.world !== 'object') return false;
  if (!def.entities || !Array.isArray(def.entities)) return false;

  const metadata = def.metadata as Record<string, unknown>;
  if (typeof metadata.id !== 'string') return false;
  if (typeof metadata.title !== 'string') return false;
  if (typeof metadata.version !== 'string') return false;

  const world = def.world as Record<string, unknown>;
  if (!world.gravity || typeof world.gravity !== 'object') return false;

  const gravity = world.gravity as Record<string, unknown>;
  if (typeof gravity.x !== 'number' || typeof gravity.y !== 'number') return false;

  for (const entity of def.entities as unknown[]) {
    if (!validateEntity(entity)) return false;
  }

  return true;
}

function validateEntity(entity: unknown): entity is GameEntity {
  if (!entity || typeof entity !== 'object') return false;

  const e = entity as Record<string, unknown>;

  if (typeof e.id !== 'string') return false;
  if (typeof e.name !== 'string') return false;
  if (!e.transform || typeof e.transform !== 'object') return false;

  const transform = e.transform as Record<string, unknown>;
  if (typeof transform.x !== 'number') return false;
  if (typeof transform.y !== 'number') return false;
  if (typeof transform.angle !== 'number') return false;
  if (typeof transform.scaleX !== 'number') return false;
  if (typeof transform.scaleY !== 'number') return false;

  return true;
}

export function createDefaultGameDefinition(): GameDefinition {
  return {
    metadata: {
      id: `game_${Date.now()}`,
      title: 'Untitled Game',
      version: '1.0.0',
    },
    world: {
      gravity: { x: 0, y: 10 },
      pixelsPerMeter: 50,
      bounds: { width: 20, height: 12 },
    },
    templates: {},
    entities: [],
    rules: [],
  };
}
