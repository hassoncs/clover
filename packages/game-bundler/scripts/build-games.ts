#!/usr/bin/env tsx

/**
 * Build script - compiles TypeScript games to JSON bundle format.
 * Usage: pnpm --filter @slopcade/game-bundler build
 */

import type { GameDefinition } from "@slopcade/shared";
import { execSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, watch, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../..");
const GAMES_DIR = resolve(PROJECT_ROOT, "games");

interface BundleFiles {
	"manifest.json": Record<string, unknown>;
	"constants.json": Record<string, unknown>;
	"templates/all.json": unknown[];
	"entities/initial.json": unknown[];
}

async function compileGameTypeScript(
	gamePath: string,
): Promise<GameDefinition | null> {
	const tsFile = join(gamePath, "game.ts");

	if (!existsSync(tsFile)) {
		console.error(`No game.ts found at ${tsFile}`);
		return null;
	}

	try {
		const script = `
      import game from '${tsFile}';
      console.log(JSON.stringify(game, null, 2));
    `;

		const result = execSync(`npx tsx -e "${script.replace(/"/g, '\\"')}"`, {
			encoding: "utf-8",
			timeout: 30000,
			cwd: gamePath,
		});

		return JSON.parse(result) as GameDefinition;
	} catch (err) {
		const error = err as Error;
		console.error(`Failed to compile ${tsFile}:`, error.message);
		return null;
	}
}

function splitIntoBundleFiles(gameDef: GameDefinition): BundleFiles {
	const templates = gameDef.prefabs || {};
	const templateArray = Object.entries(templates).map(
		([templateId, template]) => {
			const { id: _existingId, ...rest } = template as unknown as Record<
				string,
				unknown
			>;
			return { id: templateId, ...rest };
		},
	);

	return {
		"manifest.json": {
			name: gameDef.metadata?.id || "unnamed-game",
			version: gameDef.metadata?.version || "1.0.0",
			title: gameDef.metadata?.title,
			description: gameDef.metadata?.description,
			instructions: gameDef.metadata?.instructions,
			world: gameDef.world,
			background: gameDef.background,
			camera: gameDef.camera,
			overlay: gameDef.overlay,
		},
		"constants.json": {
			WORLD_WIDTH: gameDef.world?.bounds?.width || 12,
			WORLD_HEIGHT: gameDef.world?.bounds?.height || 16,
			GRAVITY_Y: gameDef.world?.gravity?.y || -15,
			PIXELS_PER_METER: gameDef.world?.pixelsPerMeter || 50,
		},
		"templates/all.json": templateArray,
		"entities/initial.json": gameDef.entities || [],
	};
}

function writeBundle(bundlePath: string, files: BundleFiles): void {
	const dirs = ["templates", "entities"];
	for (const dir of dirs) {
		const dirPath = join(bundlePath, dir);
		if (!existsSync(dirPath)) {
			mkdirSync(dirPath, { recursive: true });
		}
	}

	for (const [filePath, content] of Object.entries(files)) {
		const fullPath = join(bundlePath, filePath);
		const dir = dirname(fullPath);

		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}

		writeFileSync(fullPath, JSON.stringify(content, null, 2));
		console.log(`  ${filePath}`);
	}
}

async function buildGame(gameName: string): Promise<boolean> {
	const gamePath = join(GAMES_DIR, gameName);
	const bundlePath = join(gamePath, ".bundle");

	console.log(`\nBuilding ${gameName}...`);

	if (!existsSync(gamePath)) {
		console.error(`Game not found: ${gameName}`);
		return false;
	}

	const gameDef = await compileGameTypeScript(gamePath);
	if (!gameDef) {
		return false;
	}

	const bundleFiles = splitIntoBundleFiles(gameDef);

	if (!existsSync(bundlePath)) {
		mkdirSync(bundlePath, { recursive: true });
	}

	writeBundle(bundlePath, bundleFiles);
	console.log(`${gameName} built successfully`);
	return true;
}

async function buildAll(): Promise<boolean> {
	console.log("Building all games...\n");

	const gameEntries = readdirSync(GAMES_DIR, { withFileTypes: true });
	const games = gameEntries
		.filter(
			(e) => e.isDirectory() && existsSync(join(GAMES_DIR, e.name, "game.ts")),
		)
		.map((e) => e.name);

	let success = 0;
	let failed = 0;

	for (const game of games) {
		const result = await buildGame(game);
		if (result) success++;
		else failed++;
	}

	console.log(`\nResults: ${success} succeeded, ${failed} failed`);
	return failed === 0;
}

function watchGames(): void {
	console.log("Watching for changes... (Press Ctrl+C to stop)\n");

	const gameEntries = readdirSync(GAMES_DIR, { withFileTypes: true });
	const games = gameEntries
		.filter(
			(e) => e.isDirectory() && existsSync(join(GAMES_DIR, e.name, "game.ts")),
		)
		.map((e) => e.name);

	for (const game of games) {
		const gameTsPath = join(GAMES_DIR, game, "game.ts");

		if (existsSync(gameTsPath)) {
			watch(gameTsPath, async (eventType) => {
				if (eventType === "change") {
					console.log(`\n${game}/game.ts changed`);
					await buildGame(game);
				}
			});

			console.log(`  Watching ${game}`);
		}
	}
}

const args = process.argv.slice(2);
const command = args[0];

if (command === "watch") {
	watchGames();
} else if (command && !command.startsWith("-")) {
	buildGame(command).then((success) => {
		process.exit(success ? 0 : 1);
	});
} else {
	buildAll().then((success) => {
		process.exit(success ? 0 : 1);
	});
}
