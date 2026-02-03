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

// Registry of available test games
// Add new games here when creating them
const GAME_REGISTRY: Record<string, () => Promise<{ default: GameDefinition; metadata?: { title: string; description?: string } }>> = {
  ballSort: () => import('../../../app/lib/test-games/games/ballSort/game'),
  breakoutBouncer: () => import('../../../app/lib/test-games/games/breakoutBouncer/game'),
  breakoutScripted: () => import('../../../app/lib/test-games/games/breakoutScripted/game'),
  gemCrush: () => import('../../../app/lib/test-games/games/gemCrush/game'),
  slopeggle: () => import('../../../app/lib/test-games/games/slopeggle/game'),
};

// Cache loaded games to avoid repeated imports
const gameCache = new Map<string, TestGameEntry>();

export function isTestGameId(id: string): boolean {
  return id in GAME_REGISTRY;
}

export async function getTestGameAsync(id: string): Promise<TestGameEntry | null> {
  if (!isTestGameId(id)) {
    return null;
  }

  // Check cache first
  const cached = gameCache.get(id);
  if (cached) {
    return cached;
  }

  try {
    const loader = GAME_REGISTRY[id];
    const module = await loader();
    const game = module.default;
    const metadata = module.metadata;

    const entry: TestGameEntry = {
      id,
      title: metadata?.title ?? game.metadata?.title ?? id,
      description: metadata?.description ?? game.metadata?.description ?? '',
      definition: game,
    };

    gameCache.set(id, entry);
    return entry;
  } catch (error) {
    console.error(`[templateLoader] Failed to load game ${id}:`, error);
    return null;
  }
}

// Synchronous wrapper - returns cached value or null
// For initial loads, use getTestGameAsync
export function getTestGame(id: string): TestGameEntry | null {
  return gameCache.get(id) ?? null;
}

export function getTestGameMetadata(id: string): { title: string; description?: string } | null {
  const game = getTestGame(id);
  if (!game) {
    return null;
  }
  return { title: game.title, description: game.description };
}

export function clearTemplateCache(): void {
  gameCache.clear();
}
