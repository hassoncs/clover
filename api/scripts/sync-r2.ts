#!/usr/bin/env tsx
import { execSync } from "child_process";
import { createHash } from "crypto";
import {
	existsSync,
	readdirSync,
	readFileSync,
	watch,
	writeFileSync,
} from "fs";
import { dirname, extname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_ROOT = resolve(__dirname, "..");
const R2_DIR = resolve(__dirname, "..", "..", "r2");
const WRANGLER_BIN = join(API_ROOT, "node_modules", ".bin", "wrangler");
const R2_BUCKET_NAME = "slopcade-assets-dev";
const R2_SYNC_MANIFEST = join(API_ROOT, ".r2-sync-manifest.json");

function contentTypeForExt(ext: string): string {
	switch (ext) {
		case ".json":
			return "application/json";
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

const WATCH_MODE = process.argv.includes("--watch");

console.log("[sync-r2] Initial sync...");
syncLocalR2();

if (WATCH_MODE) {
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let syncInProgress = false;
	let pendingSync = false;

	function debouncedSync() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			debounceTimer = null;
			if (syncInProgress) {
				pendingSync = true;
				return;
			}
			runSync();
		}, 300);
	}

	function runSync() {
		syncInProgress = true;
		try {
			syncLocalR2();
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error(`[sync-r2] Sync failed: ${msg}`);
		} finally {
			syncInProgress = false;
			if (pendingSync) {
				pendingSync = false;
				runSync();
			}
		}
	}

	console.log(`[sync-r2] Watching ${R2_DIR} for changes...`);
	watch(R2_DIR, { recursive: true }, (_eventType, filename) => {
		if (!filename) return;
		console.log(`[sync-r2] Changed: ${filename}`);
		debouncedSync();
	});
}
