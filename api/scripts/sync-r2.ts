#!/usr/bin/env tsx
/**
 * Build & Sync R2 Games
 *
 * This script does two things:
 *   1. BUILD: For each game in r2/games/ that has a manifest.json,
 *      run compileBundle() to generate definition.json and metadata.json.
 *   2. SYNC: Copy all files from r2/ to the local Miniflare R2 bucket.
 *
 * In watch mode, it re-builds and re-syncs when source files change.
 * Changes to definition.json and metadata.json are ignored (they're build outputs).
 *
 * Usage:
 *   npx tsx scripts/sync-r2.ts          # One-shot build + sync
 *   npx tsx scripts/sync-r2.ts --watch  # Watch mode
 */

import { compileBundle } from "@slopcade/game-bundler";
import { execSync } from "child_process";
import { createHash } from "crypto";
import {
	existsSync,
	readdirSync,
	readFileSync,
	watch,
	writeFileSync,
} from "fs";
import { basename, dirname, extname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_ROOT = resolve(__dirname, "..");
const R2_DIR = resolve(__dirname, "..", "..", "r2");
const GAMES_DIR = join(R2_DIR, "games");
const WRANGLER_BIN = join(API_ROOT, "node_modules", ".bin", "wrangler");
const R2_BUCKET_NAME = "slopcade-assets-dev";
const R2_SYNC_MANIFEST = join(API_ROOT, ".r2-sync-manifest.json");

// Files that are build outputs — never treat as source
const BUILD_OUTPUTS = new Set(["definition.json", "metadata.json"]);

// ---------------------------------------------------------------------------
// Step 1: Build games
// ---------------------------------------------------------------------------

function buildGames(): void {
	if (!existsSync(GAMES_DIR)) return;

	const dirs = readdirSync(GAMES_DIR, { withFileTypes: true }).filter((d) =>
		d.isDirectory(),
	);

	let compiled = 0;
	let skipped = 0;
	let failed = 0;

	for (const dir of dirs) {
		const gamePath = join(GAMES_DIR, dir.name);
		const manifestPath = join(gamePath, "manifest.json");

		if (!existsSync(manifestPath)) {
			// Legacy game (only definition.json, no source files) — skip compilation
			skipped++;
			continue;
		}

		const result = compileBundle(gamePath);

		if (!result.success || !result.gameDefinition) {
			console.error(`[build] FAILED: ${dir.name}`);
			for (const err of result.errors) {
				console.error(`  ${err.code}: ${err.message}`);
			}
			failed++;
			continue;
		}

		for (const warn of result.warnings) {
			console.warn(`[build] ${dir.name}: ${warn.code}: ${warn.message}`);
		}

		// Write definition.json
		const definition = JSON.stringify(result.gameDefinition, null, "\t");
		writeFileSync(join(gamePath, "definition.json"), definition + "\n");

		// Write metadata.json (used by auto-seed to populate D1)
		const meta = result.gameDefinition.metadata;
		const metadata = {
			id: meta.id,
			slug: meta.slug ?? dir.name,
			title: meta.title,
			description: meta.description ?? "",
			version: meta.version ?? "1.0.0",
		};
		writeFileSync(
			join(gamePath, "metadata.json"),
			JSON.stringify(metadata, null, "\t") + "\n",
		);

		compiled++;
	}

	const parts = [`${compiled} compiled`];
	if (skipped > 0) parts.push(`${skipped} skipped (no manifest)`);
	if (failed > 0) parts.push(`${failed} FAILED`);
	console.log(`[build] ${parts.join(", ")}`);
}

// ---------------------------------------------------------------------------
// Step 2: Sync to local R2
// ---------------------------------------------------------------------------

function contentTypeForExt(ext: string): string {
	switch (ext) {
		case ".json":
			return "application/json";
		case ".js":
			return "application/javascript";
		case ".ts":
			return "text/typescript";
		case ".png":
			return "image/png";
		case ".jpg":
		case ".jpeg":
			return "image/jpeg";
		case ".webp":
			return "image/webp";
		case ".svg":
			return "image/svg+xml";
		case ".gif":
			return "image/gif";
		case ".mp3":
			return "audio/mpeg";
		case ".wav":
			return "audio/wav";
		case ".ogg":
			return "audio/ogg";
		default:
			return "application/octet-stream";
	}
}

function wrangler(args: string): void {
	execSync(`${WRANGLER_BIN} ${args}`, { cwd: API_ROOT, stdio: "pipe" });
}

function walkR2Files(
	dir: string,
	prefix: string,
): Array<{ key: string; filePath: string }> {
	const files: Array<{ key: string; filePath: string }> = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			const subPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
			files.push(...walkR2Files(join(dir, entry.name), subPrefix));
		} else {
			const key = prefix ? `${prefix}/${entry.name}` : entry.name;
			files.push({ key, filePath: join(dir, entry.name) });
		}
	}
	return files;
}

function syncLocalR2(): void {
	const files = walkR2Files(R2_DIR, "");

	let oldManifest: Record<string, string> = {};
	if (existsSync(R2_SYNC_MANIFEST)) {
		oldManifest = JSON.parse(readFileSync(R2_SYNC_MANIFEST, "utf-8"));
	}

	const newManifest: Record<string, string> = {};
	let uploaded = 0;
	let deleted = 0;
	let skipped = 0;

	for (const { key, filePath } of files) {
		const content = readFileSync(filePath);
		const hash = createHash("md5").update(content).digest("hex");
		newManifest[key] = hash;

		if (oldManifest[key] === hash) {
			skipped++;
			continue;
		}

		const ext = extname(filePath);
		const ct = contentTypeForExt(ext);
		wrangler(
			`r2 object put ${R2_BUCKET_NAME}/${key} --file="${filePath}" --local --ct="${ct}"`,
		);
		uploaded++;
	}

	for (const key of Object.keys(oldManifest)) {
		if (!newManifest[key]) {
			wrangler(`r2 object delete ${R2_BUCKET_NAME}/${key} --local`);
			deleted++;
		}
	}

	writeFileSync(R2_SYNC_MANIFEST, JSON.stringify(newManifest, null, 2));

	const parts = [`${uploaded} uploaded`];
	if (deleted > 0) parts.push(`${deleted} deleted`);
	if (skipped > 0) parts.push(`${skipped} unchanged`);
	console.log(`[sync-r2] ${parts.join(", ")}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const WATCH_MODE = process.argv.includes("--watch");

console.log("[sync-r2] Building games...");
buildGames();

console.log("[sync-r2] Syncing to local R2...");
syncLocalR2();

if (WATCH_MODE) {
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let buildInProgress = false;
	let pendingBuild = false;

	function debouncedBuildAndSync() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			debounceTimer = null;
			if (buildInProgress) {
				pendingBuild = true;
				return;
			}
			runBuildAndSync();
		}, 300);
	}

	function runBuildAndSync() {
		buildInProgress = true;
		try {
			buildGames();
			syncLocalR2();
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error(`[sync-r2] Build/sync failed: ${msg}`);
		} finally {
			buildInProgress = false;
			if (pendingBuild) {
				pendingBuild = false;
				runBuildAndSync();
			}
		}
	}

	console.log(`[sync-r2] Watching ${R2_DIR} for changes...`);
	watch(R2_DIR, { recursive: true }, (_eventType, filename) => {
		if (!filename) return;

		// Ignore changes to build outputs to avoid infinite rebuild loops
		const name = basename(filename);
		if (BUILD_OUTPUTS.has(name)) return;

		console.log(`[sync-r2] Changed: ${filename}`);
		debouncedBuildAndSync();
	});
}
