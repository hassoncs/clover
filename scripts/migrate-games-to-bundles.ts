#!/usr/bin/env tsx
// One-time migration: evaluates each r2/games/{slug}/src/game.ts → JSON bundle format

import { execSync } from "child_process";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const GAMES_DIR = join(PROJECT_ROOT, "r2", "games");

interface GameDefinition {
	metadata: {
		id: string;
		slug?: string;
		title: string;
		description?: string;
		instructions?: string;
		version: string;
	};
	world: {
		gravity: { x: number; y: number };
		pixelsPerMeter: number;
		bounds?: { width: number; height: number };
	};
	background?: unknown;
	camera?: unknown;
	overlay?: unknown;
	variables?: unknown;
	prefabs: Record<string, unknown>;
	entities: unknown[];
	joints?: unknown[];
	rules?: unknown[];
	winCondition?: unknown;
	loseCondition?: unknown;
	assetSystem?: unknown;
	sounds?: unknown;
	input?: unknown;
	match3?: unknown;
	tetris?: unknown;
	stateMachines?: unknown[];
	containers?: unknown[];
	persistence?: unknown;
	constants?: Record<string, unknown>;
	script?: string;
	effects?: unknown;
	hoverHighlight?: unknown;
	dialogs?: unknown;
	presentation?: unknown;
	[key: string]: unknown;
}

function evaluateGameTs(gameSlug: string): GameDefinition | null {
	const gameTsPath = join(GAMES_DIR, gameSlug, "src", "game.ts");
	if (!existsSync(gameTsPath)) {
		console.error(`  ✗ No src/game.ts found for ${gameSlug}`);
		return null;
	}

	try {
		const script = `
      import game from '${gameTsPath}';
      console.log(JSON.stringify(game, null, 2));
    `;

		const result = execSync(
			`npx tsx -e "${script.replace(/"/g, '\\"').replace(/\n/g, " ")}"`,
			{
				encoding: "utf-8",
				timeout: 30000,
				cwd: join(GAMES_DIR, gameSlug, "src"),
				stdio: ["pipe", "pipe", "pipe"],
			},
		);

		return JSON.parse(result.trim()) as GameDefinition;
	} catch (error) {
		const err = error as Error & { stderr?: Buffer };
		console.error(
			`  ✗ Failed to evaluate ${gameSlug}:`,
			err.stderr?.toString() || err.message,
		);
		return null;
	}
}

function writeBundleFiles(gameSlug: string, gameDef: GameDefinition): void {
	const gameDir = join(GAMES_DIR, gameSlug);

	// Create directories
	for (const dir of ["templates", "entities", "rules", "scripts"]) {
		mkdirSync(join(gameDir, dir), { recursive: true });
	}

	// --- manifest.json ---
	const manifest: Record<string, unknown> = {
		name: gameDef.metadata.id,
		version: gameDef.metadata.version || "1.0.0",
		title: gameDef.metadata.title,
		description: gameDef.metadata.description,
		instructions: gameDef.metadata.instructions,
		world: gameDef.world,
	};

	if (gameDef.background) manifest.background = gameDef.background;
	if (gameDef.camera) manifest.camera = gameDef.camera;
	if (gameDef.overlay) manifest.overlay = gameDef.overlay;
	if (gameDef.variables) manifest.variables = gameDef.variables;
	if (gameDef.assetSystem) manifest.assetSystem = gameDef.assetSystem;
	if (gameDef.winCondition) manifest.winCondition = gameDef.winCondition;
	if (gameDef.loseCondition) manifest.loseCondition = gameDef.loseCondition;
	if (gameDef.input) manifest.input = gameDef.input;
	if (gameDef.sounds) manifest.sounds = gameDef.sounds;
	if (gameDef.presentation) manifest.presentation = gameDef.presentation;
	if (gameDef.hoverHighlight) manifest.hoverHighlight = gameDef.hoverHighlight;
	if (gameDef.dialogs) manifest.dialogs = gameDef.dialogs;
	if (gameDef.persistence) manifest.persistence = gameDef.persistence;
	if (gameDef.joints) manifest.joints = gameDef.joints;

	// Systems go in manifest under 'systems' key
	const systems: Record<string, unknown> = {};
	if (gameDef.match3) systems.match3 = gameDef.match3;
	if (gameDef.tetris) systems.tetris = gameDef.tetris;
	if (gameDef.containers) systems.containers = gameDef.containers;
	if (gameDef.stateMachines) systems.stateMachines = gameDef.stateMachines;
	if (Object.keys(systems).length > 0) manifest.systems = systems;

	writeFileSync(
		join(gameDir, "manifest.json"),
		JSON.stringify(manifest, null, 2),
	);
	console.log(`    manifest.json`);

	// --- constants.json (only if non-empty) ---
	if (gameDef.constants && Object.keys(gameDef.constants).length > 0) {
		writeFileSync(
			join(gameDir, "constants.json"),
			JSON.stringify(gameDef.constants, null, 2),
		);
		console.log(`    constants.json`);
	}

	// --- effects.json (only if present) ---
	if (gameDef.effects) {
		writeFileSync(
			join(gameDir, "effects.json"),
			JSON.stringify(gameDef.effects, null, 2),
		);
		console.log(`    effects.json`);
	}

	// --- templates/all.json ---
	const prefabs = gameDef.prefabs || {};
	const templateArray = Object.entries(prefabs).map(([prefabId, prefab]) => {
		const obj = prefab as Record<string, unknown>;
		// Ensure id matches the key
		return { ...obj, id: prefabId };
	});
	writeFileSync(
		join(gameDir, "templates", "all.json"),
		JSON.stringify(templateArray, null, 2),
	);
	console.log(`    templates/all.json (${templateArray.length} prefabs)`);

	// --- entities/initial.json ---
	const entities = gameDef.entities || [];
	writeFileSync(
		join(gameDir, "entities", "initial.json"),
		JSON.stringify(entities, null, 2),
	);
	console.log(`    entities/initial.json (${entities.length} entities)`);

	// --- rules/gameplay.json ---
	const rules = gameDef.rules || [];
	writeFileSync(
		join(gameDir, "rules", "gameplay.json"),
		JSON.stringify(rules, null, 2),
	);
	console.log(`    rules/gameplay.json (${rules.length} rules)`);

	// --- scripts/main.js (if script exists) ---
	if (gameDef.script && gameDef.script.trim().length > 0) {
		writeFileSync(join(gameDir, "scripts", "main.js"), gameDef.script);
		console.log(`    scripts/main.js`);
	}
}

async function migrateAll(): Promise<void> {
	console.log("Migrating TypeScript games to bundle format...\n");

	const entries = readdirSync(GAMES_DIR, { withFileTypes: true });
	const gameSlugList = entries
		.filter((e) => e.isDirectory())
		.filter((e) => existsSync(join(GAMES_DIR, e.name, "src", "game.ts")))
		.map((e) => e.name)
		.sort();

	console.log(
		`Found ${gameSlugList.length} TypeScript games: ${gameSlugList.join(", ")}\n`,
	);

	let success = 0;
	let failed = 0;

	for (const slug of gameSlugList) {
		console.log(`\n${slug}:`);

		// Skip if already has manifest.json
		if (existsSync(join(GAMES_DIR, slug, "manifest.json"))) {
			console.log(`  ⏭ Already has manifest.json, skipping`);
			success++;
			continue;
		}

		const gameDef = evaluateGameTs(slug);
		if (!gameDef) {
			failed++;
			continue;
		}

		try {
			writeBundleFiles(slug, gameDef);
			console.log(`  ✓ Migrated successfully`);
			success++;
		} catch (error) {
			console.error(`  ✗ Failed:`, (error as Error).message);
			failed++;
		}
	}

	console.log(`\n${"=".repeat(40)}`);
	console.log(`Migration complete: ${success} succeeded, ${failed} failed`);

	if (failed > 0) {
		process.exit(1);
	}
}

migrateAll();
