import type { GameDefinition } from '@slopcade/shared';
import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Lazy import to avoid pulling Node.js modules in Workers environment
let _compileBundle: typeof import('@slopcade/game-bundler').compileBundle | null = null;
async function getCompileBundle() {
  if (!_compileBundle) {
    const mod = await import('@slopcade/game-bundler');
    _compileBundle = mod.compileBundle;
  }
  return _compileBundle;
}

const isWorkersEnv = typeof import.meta.url === 'undefined' || !import.meta.url;

const __dirname = isWorkersEnv ? '' : dirname(fileURLToPath(import.meta.url));
const GAMES_ROOT = isWorkersEnv ? '' : join(__dirname, '..');
const COMPILED_DIR = isWorkersEnv ? '' : join(GAMES_ROOT, 'compiled');
const BUNDLED_DIR = isWorkersEnv ? '' : join(GAMES_ROOT, 'bundled');

export type GameType = 'compiled' | 'bundled';

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

function scanCompiledGames(): GameRegistryEntry[] {
  if (isWorkersEnv || !existsSync(COMPILED_DIR)) return [];
  
  const entries: GameRegistryEntry[] = [];
  const dirs = readdirSync(COMPILED_DIR, { withFileTypes: true });
  
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const gamePath = join(COMPILED_DIR, dir.name, 'game.ts');
    if (!existsSync(gamePath)) continue;
    
    entries.push({
      id: dir.name,
      type: 'compiled',
      path: gamePath,
      loader: () => import(`../compiled/${dir.name}/game`),
    });
  }
  
  return entries;
}

function scanBundledGames(): GameRegistryEntry[] {
  if (isWorkersEnv || !existsSync(BUNDLED_DIR)) return [];
  
  const entries: GameRegistryEntry[] = [];
  const dirs = readdirSync(BUNDLED_DIR, { withFileTypes: true });
  
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const manifestPath = join(BUNDLED_DIR, dir.name, 'manifest.json');
    if (!existsSync(manifestPath)) continue;
    
    const bundlePath = join(BUNDLED_DIR, dir.name);
    
    entries.push({
      id: dir.name,
      type: 'bundled',
      path: bundlePath,
      loader: async () => {
        const compileBundle = await getCompileBundle();
        const result = compileBundle(bundlePath);
        if (!result.success || !result.gameDefinition) {
          throw new Error(`Failed to compile bundle ${dir.name}: ${result.errors.map((e: { message: string }) => e.message).join(', ')}`);
        }
        
        const manifest = result.rawData.manifest || {};
        return {
          default: result.gameDefinition,
          metadata: {
            title: (manifest.title as string) || dir.name,
            description: manifest.description as string | undefined,
          },
        };
      },
    });
  }
  
  return entries;
}

function buildRegistry(): Map<string, GameRegistryEntry> {
  const registry = new Map<string, GameRegistryEntry>();
  
  for (const entry of scanCompiledGames()) {
    registry.set(entry.id, entry);
  }
  
  for (const entry of scanBundledGames()) {
    if (registry.has(entry.id)) {
      console.warn(`[games] Duplicate game ID: ${entry.id} (bundled version shadows compiled)`);
    }
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
