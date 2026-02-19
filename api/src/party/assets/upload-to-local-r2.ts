#!/usr/bin/env tsx
/**
 * Uploads locally generated brand assets to the local R2 mirror and updates local D1.
 * Run: npx tsx api/src/party/assets/upload-to-local-r2.ts --brand amen --dir api/debug-output/amen-assets/full-run
 */

import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import Database from "better-sqlite3";
import { getBrandArtConfig } from "./brand-art-registry";

function sha256(buf: Buffer): string {
	return crypto.createHash("sha256").update(buf).digest("hex");
}

function buildR2Key(hash: string): string {
	const prefix = hash.slice(0, 2);
	return `blobs/${prefix}/${hash}`;
}

function getAssetUrl(hash: string): string {
	return `/assets/blobs/${hash.slice(0, 2)}/${hash}`;
}

function storeToLocalR2(
	r2Dir: string,
	hash: string,
	buf: Buffer,
	mimeType: string,
): string {
	const r2Key = buildR2Key(hash);
	const filePath = path.join(r2Dir, r2Key);
	const dir = path.dirname(filePath);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	writeFileSync(filePath, buf);
	// Write metadata sidecar
	writeFileSync(
		`${filePath}.meta`,
		JSON.stringify({ contentType: mimeType, size: buf.byteLength }),
	);
	return r2Key;
}

function insertAsset(
	db: InstanceType<typeof Database>,
	hash: string,
	r2Key: string,
	meta: {
		width?: number;
		height?: number;
		source?: string;
		compiledPrompt?: string;
		modelId?: string;
	},
): string {
	const existing = db
		.prepare("SELECT id FROM assets WHERE content_hash = ?")
		.get(hash) as { id: string } | undefined;

	if (existing) {
		console.log(`  (already exists: ${existing.id})`);
		return existing.id;
	}

	const assetId = crypto.randomUUID();
	const now = Math.floor(Date.now() / 1000);
	db.prepare(
		`INSERT INTO assets (id, r2_key, content_hash, width, height, creator_user_id, source, compiled_prompt, model_id, theme_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	).run(
		assetId,
		r2Key,
		hash,
		meta.width ?? null,
		meta.height ?? null,
		"00000000-0000-0000-0000-000000000001", // system user
		meta.source ?? "generated",
		meta.compiledPrompt ?? null,
		meta.modelId ?? "flux.1-dev",
		null,
		now,
	);

	return assetId;
}

type HowToPlayStep = {
	step: number;
	title: string;
	body: string;
	panelImageUrl: string | null;
};

async function run(): Promise<void> {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			dir: { type: "string" },
			brand: { type: "string" },
			help: { type: "boolean", default: false },
		},
	});

	if (values.help || !values.dir || !values.brand) {
		console.log(
			"Usage: npx tsx api/src/party/assets/upload-to-local-r2.ts --brand <brand> --dir <path-to-output-dir>",
		);
		process.exit(values.help ? 0 : 1);
	}

	const brandId = values.brand;
	const brandConfig = getBrandArtConfig(brandId);
	const GAME_IDS = brandConfig.gameIds;

	const outputDir = path.resolve(values.dir);
	const repoRoot = path.resolve(
		path.dirname(new URL(import.meta.url).pathname),
		"..",
		"..",
		"..",
		"..",
	);
	const r2Dir = path.join(repoRoot, "r2");
	const dbGlob = path.join(
		repoRoot,
		"api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject",
	);
	const { readdirSync } = await import("node:fs");
	const dbFile = readdirSync(dbGlob).find((f) => f.endsWith(".sqlite"));
	if (!dbFile) throw new Error(`No sqlite file in ${dbGlob}`);
	const dbPath = path.join(dbGlob, dbFile);

	console.log(`Output dir: ${outputDir}`);
	console.log(`R2 dir: ${r2Dir}`);
	console.log(`D1 db: ${dbPath}`);

	if (!existsSync(dbPath)) {
		throw new Error(`D1 database not found at ${dbPath}`);
	}

	const db = new Database(dbPath);
	const publicBase = "http://localhost:8789";

	const uploadedUrls: Record<string, string> = {};

	// Upload tiles and heroes, update party_game_templates
	for (const gameId of GAME_IDS) {
		const gameDir = path.join(outputDir, gameId);

		const tilePath = path.join(gameDir, "tile.png");
		if (existsSync(tilePath)) {
			const buf = readFileSync(tilePath);
			const hash = sha256(buf);
			const r2Key = storeToLocalR2(r2Dir, hash, buf, "image/png");
			const assetId = insertAsset(db, hash, r2Key, {
				width: 512,
				height: 512,
				source: "generated",
				modelId: "flux.1-dev",
			});
			const url = `${publicBase}/assets/${r2Key}`;
			db.prepare(
				"UPDATE party_game_templates SET thumbnail_url = ? WHERE id = ?",
			).run(url, gameId);
			uploadedUrls[`${gameId}:tile`] = url;
			console.log(`✓ tile ${gameId}: ${assetId}`);
		}

		const heroPath = path.join(gameDir, "hero.png");
		if (existsSync(heroPath)) {
			const buf = readFileSync(heroPath);
			const hash = sha256(buf);
			const r2Key = storeToLocalR2(r2Dir, hash, buf, "image/png");
			const assetId = insertAsset(db, hash, r2Key, {
				width: 1024,
				height: 512,
				source: "generated",
				modelId: "flux.1-dev",
			});
			const url = `${publicBase}/assets/${r2Key}`;
			db.prepare(
				"UPDATE party_game_templates SET hero_image_url = ? WHERE id = ?",
			).run(url, gameId);
			uploadedUrls[`${gameId}:hero`] = url;
			console.log(`✓ hero ${gameId}: ${assetId}`);
		}

		// Panels — load existing steps, update panelImageUrl, write back
		const row = db
			.prepare(
				"SELECT how_to_play_steps FROM party_game_templates WHERE id = ?",
			)
			.get(gameId) as { how_to_play_steps: string | null } | undefined;

		const steps: HowToPlayStep[] = row?.how_to_play_steps
			? (JSON.parse(row.how_to_play_steps) as HowToPlayStep[])
			: [];

		if (steps.length > 0) {
			let panelsUpdated = false;
			for (let i = 0; i < steps.length; i++) {
				const panelPath = path.join(gameDir, `panel-${i + 1}.png`);
				if (!existsSync(panelPath)) continue;
				const buf = readFileSync(panelPath);
				const hash = sha256(buf);
				const r2Key = storeToLocalR2(r2Dir, hash, buf, "image/png");
				const assetId = insertAsset(db, hash, r2Key, {
					width: 1024,
					height: 1024,
					source: "generated",
					modelId: "flux.1-dev",
				});
				const url = `${publicBase}/assets/${r2Key}`;
				steps[i] = { ...steps[i], panelImageUrl: url };
				uploadedUrls[`${gameId}:panel-${i + 1}`] = url;
				console.log(`✓ panel ${gameId}[${i + 1}]: ${assetId}`);
				panelsUpdated = true;
			}
			if (panelsUpdated) {
				db.prepare(
					"UPDATE party_game_templates SET how_to_play_steps = ? WHERE id = ?",
				).run(JSON.stringify(steps), gameId);
			}
		} else {
			console.warn(
				`  (no how_to_play_steps in DB for ${gameId} — skipping panels)`,
			);
		}
	}

	// Upload avatars (log URLs only — no DB table yet)
	const avatarDir = path.join(outputDir, "avatars");
	const avatarTypes = Object.keys(brandConfig.avatarPrompts);
	console.log("\n--- Avatar URLs (wire manually into AvatarPicker) ---");
	for (const avatarType of avatarTypes) {
		const avatarPath = path.join(avatarDir, `${avatarType}.png`);
		if (!existsSync(avatarPath)) continue;
		const buf = readFileSync(avatarPath);
		const hash = sha256(buf);
		const r2Key = storeToLocalR2(r2Dir, hash, buf, "image/png");
		insertAsset(db, hash, r2Key, {
			width: 256,
			height: 256,
			source: "generated",
			modelId: "flux.1-dev",
		});
		const url = `${publicBase}/assets/${r2Key}`;
		uploadedUrls[`avatar:${avatarType}`] = url;
		console.log(`  ${avatarType}: ${url}`);
	}

	// Summary
	const summaryPath = path.join(outputDir, "upload-summary.json");
	writeFileSync(summaryPath, JSON.stringify(uploadedUrls, null, 2));
	console.log(
		`\n✅ Done. ${Object.keys(uploadedUrls).length} assets uploaded.`,
	);
	console.log(`Summary written to ${summaryPath}`);

	db.close();
}

run().catch((err) => {
	console.error(err instanceof Error ? err.message : String(err));
	process.exit(1);
});
