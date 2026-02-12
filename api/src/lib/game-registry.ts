import { compileBundle } from "@slopcade/game-bundler";
import type { GameDefinition } from "@slopcade/shared";
import { existsSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GAMES_ROOT = join(__dirname, "..", "..", "..", "r2", "games");

export interface GameModule {
	default: GameDefinition;
	metadata?: { title: string; description?: string };
}

export interface GameEntry {
	id: string;
	title: string;
	description: string;
	definition: GameDefinition;
	type: "bundle";
}

export interface GameRegistryEntry {
	id: string;
	type: "bundle";
	path: string;
	loader: () => Promise<GameModule | null>;
}

function scanGames(): GameRegistryEntry[] {
	if (!existsSync(GAMES_ROOT)) return [];

	const entries: GameRegistryEntry[] = [];
	const dirs = readdirSync(GAMES_ROOT, { withFileTypes: true });

	for (const dir of dirs) {
		if (!dir.isDirectory()) continue;
		const gamePath = join(GAMES_ROOT, dir.name);
		const manifestPath = join(gamePath, "manifest.json");

		if (!existsSync(manifestPath)) continue;

		entries.push({
			id: dir.name,
			type: "bundle",
			path: gamePath,
			loader: async () => {
				const result = compileBundle(gamePath);
				if (!result.success || !result.gameDefinition) {
					console.error(`[games] Failed to compile bundle ${dir.name}`);
					for (const error of result.errors) {
						console.error(`  - ${error.message}`);
					}
					return null;
				}

				for (const warning of result.warnings) {
					console.warn(
						`[games] Bundle warning for ${dir.name}: ${warning.message}`,
					);
				}

				return {
					default: result.gameDefinition,
					metadata: {
						title: result.gameDefinition.metadata.title,
						description: result.gameDefinition.metadata.description,
					},
				};
			},
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

export function getGameType(id: string): "bundle" | null {
	return getRegistry().has(id) ? "bundle" : null;
}

const moduleCache = new Map<string, GameModule>();

export async function loadGame(id: string): Promise<GameEntry | null> {
	const entry = getRegistry().get(id);
	if (!entry) {
		return null;
	}

	try {
		let module = moduleCache.get(id);
		if (!module) {
			const loadedModule = await entry.loader();
			if (!loadedModule) {
				return null;
			}
			moduleCache.set(id, loadedModule);
			module = loadedModule;
		}

		const game = module.default;

		const metadata = module.metadata;

		return {
			id,
			title: metadata?.title ?? game.metadata?.title ?? id,
			description: metadata?.description ?? game.metadata?.description ?? "",
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
