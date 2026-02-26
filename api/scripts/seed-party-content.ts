#!/usr/bin/env npx tsx
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
/**
 * Seed local D1 with party content + audio asset rows.
 * Asset rows are always created for voice-eligible content types.
 * r2_key is set only when the mp3 file actually exists on disk.
 * Run from repo root: npx tsx api/scripts/seed-party-content.ts
 */
import { existsSync } from "node:fs";
import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const PACKS_ROOT = path.resolve("api/src/party/content/packs");
const R2_ROOT = path.resolve("r2");
const BRANDS = ["amen", "slopcade"] as const;
type Brand = (typeof BRANDS)[number];

const CONTENT_TYPES = [
	"quip",
	"trivia",
	"drawing",
	"dilemma",
	"wyr",
	"estimation",
	"fibbage",
	"caption",
	"wordgame",
	"wordlist",
	"personal",
	"FakeWord",
	"ranking",
	"headsup",
] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

const SKIP_VOICE_TYPES = new Set(["headsup", "wordlist", "FakeWord"]);

function extractContentType(filename: string): ContentType | null {
	const base = filename.replace(/\.json$/i, "");
	if ((CONTENT_TYPES as readonly string[]).includes(base))
		return base as ContentType;
	return null;
}

function contentHash(body: string): string {
	return createHash("sha256").update(body).digest("hex");
}

function esc(s: string): string {
	return s.replace(/'/g, "''");
}

async function main() {
	const now = Date.now();
	const statements: string[] = [];
	let contentCount = 0;
	let assetCount = 0;
	let audioFound = 0;
	let skipped = 0;

	for (const brand of BRANDS) {
		const brandDir = path.join(PACKS_ROOT, brand);
		let files: string[];
		try {
			files = await readdir(brandDir);
		} catch {
			console.warn(`No packs dir for ${brand}`);
			continue;
		}

		for (const filename of files) {
			if (!filename.endsWith(".json")) continue;
			const contentType = extractContentType(filename);
			if (!contentType) {
				continue;
			}

			const raw = await readFile(path.join(brandDir, filename), "utf-8");
			let items: unknown[];
			try {
				items = JSON.parse(raw);
			} catch {
				continue;
			}
			if (!Array.isArray(items)) continue;

			for (const item of items) {
				if (typeof item !== "object" || item === null) continue;
				const rec = item as Record<string, unknown>;
				if (typeof rec.id !== "string" || !rec.id) {
					skipped++;
					continue;
				}

				const body = JSON.stringify(rec);
				const hash = contentHash(body);
				const category = typeof rec.category === "string" ? rec.category : null;
				const difficulty =
					typeof rec.difficulty === "number" ? rec.difficulty : null;

				statements.push(
					`INSERT OR REPLACE INTO party_content (id, brand_id, content_type, body, category, difficulty, status, source, content_hash, created_at, updated_at) VALUES ('${esc(rec.id as string)}', '${brand}', '${contentType}', '${esc(body)}', ${category ? `'${esc(category)}'` : "NULL"}, ${difficulty ?? "NULL"}, 'active', 'imported', '${hash}', ${now}, ${now});`,
				);
				contentCount++;

				if (!SKIP_VOICE_TYPES.has(contentType)) {
					const r2Key = `audio/voice/${brand}/content/${contentType}/${rec.id}.mp3`;
					const fileExists = existsSync(path.join(R2_ROOT, r2Key));
					const assetId = `audio-${rec.id}`;

					if (fileExists) {
						statements.push(
							`INSERT OR REPLACE INTO party_content_assets (id, content_id, r2_key, asset_type, role, mime_type, created_at) VALUES ('${esc(assetId)}', '${esc(rec.id as string)}', '${esc(r2Key)}', 'audio', 'primary', 'audio/mpeg', ${now});`,
						);
						audioFound++;
					} else {
						statements.push(
							`INSERT OR REPLACE INTO party_content_assets (id, content_id, r2_key, asset_type, role, mime_type, created_at) VALUES ('${esc(assetId)}', '${esc(rec.id as string)}', NULL, 'audio', 'primary', 'audio/mpeg', ${now});`,
						);
					}
					assetCount++;
				}
			}
			console.log(
				`  ${brand}/${filename}: ${contentType} (${items.length} items)`,
			);
		}
	}

	console.log(
		`\nContent: ${contentCount}, Assets: ${assetCount} (${audioFound} with audio, ${assetCount - audioFound} missing), Skipped: ${skipped}`,
	);
	if (contentCount === 0) {
		console.log("Nothing to insert.");
		return;
	}

	const tmpFile = path.resolve("api/.seed-party-content.sql");
	await writeFile(tmpFile, statements.join("\n"), "utf-8");
	console.log(`Executing ${statements.length} statements...`);

	try {
		execSync(
			"npx wrangler d1 execute slopcade-db --local --file .seed-party-content.sql",
			{
				cwd: path.resolve("api"),
				stdio: "inherit",
			},
		);
	} finally {
		await unlink(tmpFile).catch(() => {});
	}

	console.log(
		`Done! ${contentCount} content + ${assetCount} asset rows (${audioFound} with audio).`,
	);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
