#!/usr/bin/env npx tsx
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
/**
 * One-time seed: reads pack JSON files and inserts into local D1 party_content table.
 * Run from repo root: npx tsx api/scripts/seed-party-content.ts
 */
import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const PACKS_ROOT = path.resolve("api/src/party/content/packs");
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

function extractContentType(
	filename: string,
	brand: Brand,
): ContentType | null {
	const base = filename.replace(/\.json$/i, "");
	if (brand === "amen") {
		const stripped = base.replace(/^amen-/, "");
		if ((CONTENT_TYPES as readonly string[]).includes(stripped))
			return stripped as ContentType;
	}
	if ((CONTENT_TYPES as readonly string[]).includes(base))
		return base as ContentType;
	return null;
}

function contentHash(body: string): string {
	return createHash("sha256").update(body).digest("hex");
}

function escSql(s: string): string {
	return s.replace(/'/g, "''");
}

async function main() {
	const now = Date.now();
	const contentSql: string[] = [];
	let total = 0;
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
			const contentType = extractContentType(filename, brand);
			if (!contentType) {
				console.log(`  skip ${filename} (unknown type)`);
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

				contentSql.push(
					`INSERT OR REPLACE INTO party_content (id, brand_id, content_type, body, category, difficulty, status, source, content_hash, created_at, updated_at) VALUES ('${escSql(rec.id as string)}', '${brand}', '${contentType}', '${escSql(body)}', ${category ? `'${escSql(category)}'` : "NULL"}, ${difficulty ?? "NULL"}, 'active', 'imported', '${hash}', ${now}, ${now});`,
				);
				total++;
			}
			console.log(`  ${brand}/${filename}: ${contentType}`);
		}
	}

	console.log(`\nTotal content: ${total}, skipped: ${skipped}`);

	if (total === 0) {
		console.log("Nothing to insert.");
		return;
	}

	const allSql = contentSql;
	const tmpFile = path.resolve("api/.seed-party-content.sql");
	await writeFile(tmpFile, allSql.join("\n"), "utf-8");
	console.log(
		`Wrote ${allSql.length} statements to temp file, executing via wrangler...`,
	);

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

	console.log(`Done! Inserted ${total} content rows.`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
