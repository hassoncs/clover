/**
 * Development-only template loader.
 *
 * In local development, test games are loaded directly from TypeScript source files.
 * This file must be manually updated when adding new test games.
 *
 * The games are dynamically imported to avoid bundling issues.
 */

import type { GameDefinition } from '@slopcade/shared';

interface TestGameEntry {
  id: string;
  title: string;
  description: string;
  definition: GameDefinition;
}

type GameModule = {
  default: GameDefinition;
  metadata?: { title: string; description?: string };
  // Optional level-based game creator (e.g., ballSort)
  createBallSortGame?: (level: number) => GameDefinition;
};

// Registry of available test games
// Add new games here when creating them
const GAME_REGISTRY: Record<string, () => Promise<GameModule>> = {
  ballSort: () => import('../../../app/lib/test-games/games/ballSort/game'),
  breakoutBouncer: () => import('../../../app/lib/test-games/games/breakoutBouncer/game'),
  breakoutScripted: () => import('../../../app/lib/test-games/games/breakoutScripted/game'),
  gemCrush: () => import('../../../app/lib/test-games/games/gemCrush/game'),
  slopeggle: () => import('../../../app/lib/test-games/games/slopeggle/game'),
};

// Cache loaded modules (not games, since level can vary)
const moduleCache = new Map<string, GameModule>();

export function isTestGameId(id: string): boolean {
  return id in GAME_REGISTRY;
}

export async function getTestGameAsync(id: string, level?: number): Promise<TestGameEntry | null> {
  if (!isTestGameId(id)) {
    return null;
  }

  try {
    // Check module cache
    let module = moduleCache.get(id);
    if (!module) {
      const loader = GAME_REGISTRY[id];
      module = await loader();
      moduleCache.set(id, module);
    }

    // For level-based games like ballSort, use the creator function
    let game: GameDefinition;
    if (id === 'ballSort' && module.createBallSortGame && level !== undefined) {
      game = module.createBallSortGame(level);
    } else {
      game = module.default;
    }

    const metadata = module.metadata;

    const entry: TestGameEntry = {
      id,
      title: metadata?.title ?? game.metadata?.title ?? id,
      description: metadata?.description ?? game.metadata?.description ?? '',
      definition: game,
    };

    return entry;
  } catch (error) {
    console.error(`[templateLoader] Failed to load game ${id}:`, error);
    return null;
  }
}

export function clearModuleCache(): void {
  moduleCache.clear();
}
