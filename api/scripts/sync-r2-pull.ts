#!/usr/bin/env tsx
import { execSync } from "node:child_process";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface ObjectRow {
	key: string;
	blob_id: string | null;
}

interface PullManifest {
	[key: string]: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_ROOT = resolve(__dirname, "..");
const PROJECT_ROOT = resolve(API_ROOT, "..");
const LOCAL_R2_DIR = join(PROJECT_ROOT, "r2");
const STATE_R2_DIR = join(API_ROOT, ".wrangler", "state", "v3", "r2");
const SQLITE_DIR = join(STATE_R2_DIR, "miniflare-R2BucketObject");
const MANIFEST_PATH = join(API_ROOT, ".r2-pull-manifest.json");
interface BucketMapping {
	sqlitePath: string;
	blobsDir: string;
}

let cachedMapping: BucketMapping | null = null;

function loadManifest(): PullManifest {
	if (!existsSync(MANIFEST_PATH)) return {};
	try {
		return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as PullManifest;
	} catch {
		return {};
	}
}

function saveManifest(manifest: PullManifest): void {
	writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
}

function querySqlite(sqlitePath: string, query: string): string {
	return execSync(`sqlite3 "${sqlitePath}" "${query}"`, {
		cwd: API_ROOT,
		stdio: "pipe",
		encoding: "utf-8",
	});
}

function findBucketMapping(): BucketMapping {
	if (!existsSync(SQLITE_DIR)) {
		throw new Error(`Missing sqlite state dir: ${SQLITE_DIR}`);
	}

	const bucketDirs = execSync(`ls -1 "${STATE_R2_DIR}"`, {
		cwd: API_ROOT,
		stdio: "pipe",
		encoding: "utf-8",
	})
		.split("\n")
		.map((s) => s.trim())
		.filter((s) => s && s !== "miniflare-R2BucketObject")
		.map((name) => join(STATE_R2_DIR, name, "blobs"))
		.filter((blobsDir) => existsSync(blobsDir));

	const candidates = execSync(`ls "${SQLITE_DIR}"/*.sqlite`, {
		cwd: API_ROOT,
		stdio: "pipe",
		encoding: "utf-8",
	})
		.split("\n")
		.map((s) => s.trim())
		.filter(Boolean);

	let best: BucketMapping | null = null;
	let bestHits = 0;

	for (const sqlitePath of candidates) {
		const rows = querySqlite(
			sqlitePath,
			"SELECT blob_id FROM _mf_objects WHERE blob_id IS NOT NULL ORDER BY uploaded DESC LIMIT 200;",
		)
			.split("\n")
			.map((s) => s.trim())
			.filter(Boolean);

		if (rows.length === 0) continue;

		for (const blobsDir of bucketDirs) {
			const hits = rows.reduce((count, blobId) => {
				return count + (existsSync(join(blobsDir, blobId)) ? 1 : 0);
			}, 0);

			if (hits > bestHits) {
				bestHits = hits;
				best = { sqlitePath, blobsDir };
			}
		}
	}

	if (!best || bestHits === 0) {
		throw new Error(
			"Could not map local R2 sqlite DB to a local blobs directory",
		);
	}

	return best;
}

function readObjects(sqlitePath: string): ObjectRow[] {
	const raw = querySqlite(
		sqlitePath,
		"SELECT key, blob_id FROM _mf_objects WHERE blob_id IS NOT NULL;",
	);
	if (!raw.trim()) return [];

	return raw
		.split("\n")
		.filter(Boolean)
		.map((line) => {
			const [key, blob_id] = line.split("|");
			return { key, blob_id: blob_id || null };
		});
}

function syncOnce(): { copied: number; removed: number; total: number } {
	const mapping = cachedMapping ?? findBucketMapping();
	cachedMapping = mapping;
	const sqlitePath = mapping.sqlitePath;
	const blobsDir = mapping.blobsDir;
	const objects = readObjects(sqlitePath);
	const prev = loadManifest();
	const next: PullManifest = {};
	let copied = 0;
	let removed = 0;

	for (const obj of objects) {
		if (!obj.blob_id) continue;
		next[obj.key] = obj.blob_id;

		if (prev[obj.key] === obj.blob_id) continue;

		const blobPath = join(blobsDir, obj.blob_id);
		if (!existsSync(blobPath)) continue;

		const localPath = join(LOCAL_R2_DIR, obj.key);
		mkdirSync(dirname(localPath), { recursive: true });
		copyFileSync(blobPath, localPath);
		copied++;
	}

	for (const key of Object.keys(prev)) {
		if (key in next) continue;
		const localPath = join(LOCAL_R2_DIR, key);
		rmSync(localPath, { force: true });
		removed++;
	}

	saveManifest(next);
	return { copied, removed, total: objects.length };
}

function main(): void {
	const watchMode = process.argv.includes("--watch");

	const run = () => {
		try {
			const result = syncOnce();
			if (result.copied > 0 || result.removed > 0) {
				console.log(
					`[sync-r2-pull] copied=${result.copied} removed=${result.removed} total=${result.total}`,
				);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`[sync-r2-pull] ${message}`);
		}
	};

	run();

	if (!watchMode) return;

	console.log("[sync-r2-pull] watching local R2 state...");
	setInterval(run, 2000);
}

main();
