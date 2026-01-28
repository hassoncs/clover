/**
 * Development-only template loader.
 * 
 * In local development, test games are loaded directly from source files
 * to enable instant refresh without DB sync. This bypasses the database
 * for template game content while still using the DB for browse listings.
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import type { GameDefinition } from '@slopcade/shared';

interface TestGameEntry {
  id: string;
  title: string;
  description: string;
  definition: GameDefinition;
}

let gamesCache: Map<string, TestGameEntry> | null = null;

function findRegistryJson(): string | null {
  const possiblePaths = [
    resolve(process.cwd(), 'dev-test-games.json'),
    resolve(process.cwd(), '../api/dev-test-games.json'),
    resolve(process.cwd(), '../../api/dev-test-games.json'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

function loadRegistry(): Map<string, TestGameEntry> | null {
  if (gamesCache) {
    return gamesCache;
  }

  const registryPath = findRegistryJson();
  if (!registryPath) {
    return null;
  }

  try {
    const { readFileSync } = require('fs');
    const data = JSON.parse(readFileSync(registryPath, 'utf-8'));
    
    gamesCache = new Map();
    for (const game of data.games) {
      gamesCache.set(game.id, game);
    }
    
    return gamesCache;
  } catch {
    return null;
  }
}

export function isTestGameId(id: string): boolean {
  const registry = loadRegistry();
  if (!registry) {
    return false;
  }
  return registry.has(id);
}

export function getTestGame(id: string): TestGameEntry | null {
  const registry = loadRegistry();
  if (!registry) {
    return null;
  }
  return registry.get(id) || null;
}

export function getTestGameMetadata(id: string): { title: string; description?: string } | null {
  const game = getTestGame(id);
  if (!game) {
    return null;
  }
  return { title: game.title, description: game.description };
}

export function clearTemplateCache(): void {
  gamesCache = null;
}
