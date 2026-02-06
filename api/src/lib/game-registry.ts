import type { GameDefinition } from '@slopcade/shared';
import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GAMES_ROOT = join(__dirname, '..', '..', '..', 'r2', 'games');

export type GameType = 'compiled';

export interface GameModule {
  default: GameDefinition;
  metadata?: { title: string; description?: string };
  createLevelGame?: (level: number) => GameDefinition;
}

export interface GameEntry {
  id: string;
  title: string;
  description: string;
  definition: GameDefinition;
  type: GameType;
}

export interface GameRegistryEntry {
  id: string;
  type: GameType;
  path: string;
  loader: () => Promise<GameModule>;
}

function scanGames(): GameRegistryEntry[] {
  if (!existsSync(GAMES_ROOT)) return [];

  const entries: GameRegistryEntry[] = [];
  const dirs = readdirSync(GAMES_ROOT, { withFileTypes: true });

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const srcGamePath = join(GAMES_ROOT, dir.name, 'src', 'game.ts');
    if (!existsSync(srcGamePath)) continue;

    entries.push({
      id: dir.name,
      type: 'compiled',
      path: srcGamePath,
      loader: () => import(`../../../r2/games/${dir.name}/src/game`),
    });
  }

  return entries;
}

function buildRegistry(): Map<string, GameRegistryEntry> {
  const registry = new Map<string, GameRegistryEntry>();

  for (const entry of scanGames()) {
    registry.set(entry.id, entry);
  }

  return registry;
}

let _registry: Map<string, GameRegistryEntry> | null = null;

function getRegistry(): Map<string, GameRegistryEntry> {
  if (!_registry) {
    _registry = buildRegistry();
  }
  return _registry;
}

export function getGameIds(): string[] {
  return Array.from(getRegistry().keys()).sort();
}

export const GAME_IDS = getGameIds();

export function isValidGameId(id: string): boolean {
  return getRegistry().has(id);
}

export function getGameType(id: string): GameType | null {
  const entry = getRegistry().get(id);
  return entry?.type ?? null;
}

const moduleCache = new Map<string, GameModule>();

export async function loadGame(id: string, level?: number): Promise<GameEntry | null> {
  const entry = getRegistry().get(id);
  if (!entry) {
    return null;
  }

  try {
    let module = moduleCache.get(id);
    if (!module) {
      module = await entry.loader();
      moduleCache.set(id, module);
    }

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
      type: entry.type,
    };
  } catch (error) {
    console.error(`[games] Failed to load game ${id}:`, error);
    return null;
  }
}

export async function loadAllGames(): Promise<GameEntry[]> {
  const entries: GameEntry[] = [];

  for (const id of getGameIds()) {
    const entry = await loadGame(id);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

export function clearCache(): void {
  moduleCache.clear();
  _registry = null;
}

export function refreshRegistry(): void {
  _registry = buildRegistry();
}
