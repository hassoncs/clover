/**
 * Game Registry - exports all available games and utilities for loading them.
 */

import type { GameDefinition } from '@slopcade/shared';

export interface GameModule {
  default: GameDefinition;
  metadata?: { title: string; description?: string };
  /** Optional level-based game creator (e.g., ballSort) */
  createLevelGame?: (level: number) => GameDefinition;
}

export interface GameEntry {
  id: string;
  title: string;
  description: string;
  definition: GameDefinition;
}

/**
 * Registry of all available games.
 * Each entry maps a game ID to a dynamic import function.
 */
export const GAME_REGISTRY: Record<string, () => Promise<GameModule>> = {
  ballSort: () => import('../ballSort/game'),
  breakoutBouncer: () => import('../breakoutBouncer/game'),
  breakoutScripted: () => import('../breakoutScripted/game'),
  flappyBird: () => import('../flappyBird/game'),
  gemCrush: () => import('../gemCrush/game'),
  slopeggle: () => import('../slopeggle/game'),
};

/**
 * List of all available game IDs.
 */
export const GAME_IDS = Object.keys(GAME_REGISTRY) as ReadonlyArray<string>;

/**
 * Check if a game ID is valid.
 */
export function isValidGameId(id: string): boolean {
  return id in GAME_REGISTRY;
}

// Module cache for loaded games
const moduleCache = new Map<string, GameModule>();

/**
 * Load a game by ID, with optional level support.
 */
export async function loadGame(id: string, level?: number): Promise<GameEntry | null> {
  if (!isValidGameId(id)) {
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

    // For level-based games, use the creator function
    let game: GameDefinition;
    if (module.createLevelGame && level !== undefined) {
      game = module.createLevelGame(level);
    } else {
      game = module.default;
    }

    const metadata = module.metadata;

    return {
      id,
      title: metadata?.title ?? game.metadata?.title ?? id,
      description: metadata?.description ?? game.metadata?.description ?? '',
      definition: game,
    };
  } catch (error) {
    console.error(`[games] Failed to load game ${id}:`, error);
    return null;
  }
}

/**
 * Load all games (useful for listing).
 */
export async function loadAllGames(): Promise<GameEntry[]> {
  const entries: GameEntry[] = [];
  
  for (const id of GAME_IDS) {
    const entry = await loadGame(id);
    if (entry) {
      entries.push(entry);
    }
  }
  
  return entries;
}

/**
 * Clear the module cache (useful for hot reloading in dev).
 */
export function clearCache(): void {
  moduleCache.clear();
}
