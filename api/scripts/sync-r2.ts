#!/usr/bin/env tsx
/**
 * Build & Sync R2 Games
 *
 * This script does two things:
 *   1. BUILD: For each game in r2/games/{brand}/{slug}/ that has a manifest.json,
 *      run compileBundle() to generate definition.json and metadata.json.
 *   2. SYNC: Copy all files from r2/ to an R2 bucket.
 *
 * Games are organized by brand: r2/games/slopcade/ and r2/games/amen/.
 * The brandId is written into metadata.json so auto-seed can set brand_id in D1.
 *
 * In watch mode, it re-builds and re-syncs when source files change.
 * Changes to definition.json and metadata.json are ignored (they're build outputs).
 *
 * Usage:
 *   npx tsx scripts/sync-r2.ts            # One-shot build + sync to local
 *   npx tsx scripts/sync-r2.ts --watch    # Watch mode (local)
 *   npx tsx scripts/sync-r2.ts --remote   # Sync to production R2
 */

import { DEFAULT_BRAND_ID } from "@slopcade/brands";
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
const R2_BUCKET_LOCAL = "slopcade-assets-dev";
const R2_BUCKET_REMOTE = "slopcade-assets";
const R2_SYNC_MANIFEST_LOCAL = join(API_ROOT, ".r2-sync-manifest.json");
const R2_SYNC_MANIFEST_REMOTE = join(API_ROOT, ".r2-sync-manifest-remote.json");

const BUILD_OUTPUTS = new Set(["definition.json", "metadata.json"]);

function buildGames(): void {
	if (!existsSync(GAMES_DIR)) return;

	let compiled = 0;
	let skipped = 0;
	let failed = 0;

	const categoryDirs = readdirSync(GAMES_DIR, { withFileTypes: true }).filter(
		(d) => d.isDirectory(),
	);

	for (const categoryDir of categoryDirs) {
		const category = categoryDir.name;
		const categoryPath = join(GAMES_DIR, category);
		const gameDirs = readdirSync(categoryPath, { withFileTypes: true }).filter(
			(d) => d.isDirectory(),
		);

		for (const dir of gameDirs) {
			const gamePath = join(categoryPath, dir.name);
			const manifestPath = join(gamePath, "manifest.json");

			if (!existsSync(manifestPath)) {
				skipped++;
				continue;
			}

			const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
			const result = compileBundle(gamePath);

			if (!result.success || !result.gameDefinition) {
				console.error(`[build] FAILED: ${category}/${dir.name}`);
				for (const err of result.errors) {
					console.error(`  ${err.code}: ${err.message}`);
				}
				failed++;
				continue;
			}

			for (const warn of result.warnings) {
				console.warn(
					`[build] ${category}/${dir.name}: ${warn.code}: ${warn.message}`,
				);
			}

			const definition = JSON.stringify(result.gameDefinition, null, "\t");
			writeFileSync(join(gamePath, "definition.json"), definition + "\n");

			const meta = result.gameDefinition.metadata;
			const brands: string[] = manifest.brands ?? [DEFAULT_BRAND_ID];
			const brandTitles: Record<
				string,
				{ title: string; description?: string }
			> = manifest.brandTitles ?? {};
			const metadata = {
				id: meta.id,
				slug: meta.slug ?? dir.name,
				title: meta.title,
				description: meta.description ?? "",
				version: meta.version ?? "1.0.0",
				brands,
				brandTitles,
			};
			writeFileSync(
				join(gamePath, "metadata.json"),
				JSON.stringify(metadata, null, "\t") + "\n",
			);

			compiled++;
		}
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

function syncR2(remote: boolean): void {
	const bucketName = remote ? R2_BUCKET_REMOTE : R2_BUCKET_LOCAL;
	const manifestPath = remote
		? R2_SYNC_MANIFEST_REMOTE
		: R2_SYNC_MANIFEST_LOCAL;
	const locationFlag = remote ? "--remote" : "--local";
	const files = walkR2Files(R2_DIR, "");

	let oldManifest: Record<string, string> = {};
	if (existsSync(manifestPath)) {
		oldManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
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
			`r2 object put ${bucketName}/${key} --file="${filePath}" ${locationFlag} --ct="${ct}"`,
		);
		uploaded++;
	}

	for (const key of Object.keys(oldManifest)) {
		if (!newManifest[key]) {
			wrangler(`r2 object delete ${bucketName}/${key} ${locationFlag}`);
			deleted++;
		}
	}

	writeFileSync(manifestPath, JSON.stringify(newManifest, null, 2));

	const target = remote ? "production" : "local";
	const parts = [`${uploaded} uploaded`];
	if (deleted > 0) parts.push(`${deleted} deleted`);
	if (skipped > 0) parts.push(`${skipped} unchanged`);
	console.log(`[sync-r2] ${target}: ${parts.join(", ")}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const WATCH_MODE = process.argv.includes("--watch");
const REMOTE_MODE = process.argv.includes("--remote");

console.log("[sync-r2] Building games...");
buildGames();

const syncTarget = REMOTE_MODE ? "production" : "local";
console.log(`[sync-r2] Syncing to ${syncTarget} R2...`);
syncR2(REMOTE_MODE);

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
			syncR2(false);
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
