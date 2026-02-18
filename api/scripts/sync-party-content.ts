#!/usr/bin/env npx tsx
/**
 * Bidirectional sync between JSON content packs and D1 database.
 *
 * Usage:
 *   # Import JSON files into D1 (upsert)
 *   pnpm content:sync --direction import --target local
 *   pnpm content:sync --direction import --target remote
 *
 *   # Export D1 content to JSON files
 *   pnpm content:sync --direction export --target local
 *   pnpm content:sync --direction export --target remote
 *
 * Options:
 *   --direction <import|export>  Direction of sync (required)
 *   --target <local|remote>      D1 target (required)
 *   --brand <amen|slopcade>      Filter by brand (optional)
 *   --type <contentType>         Filter by content type (optional)
 *   --dry-run                    Show what would happen without executing
 */

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
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

interface SyncOptions {
	direction: "import" | "export";
	target: "local" | "remote";
	brand?: Brand;
	type?: ContentType;
	dryRun: boolean;
}

function parseArgs(): SyncOptions {
	const args = process.argv.slice(2);
	const opts: Partial<SyncOptions> = { dryRun: false };

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		switch (arg) {
			case "--direction":
				opts.direction = args[++i] as "import" | "export";
				break;
			case "--target":
				opts.target = args[++i] as "local" | "remote";
				break;
			case "--brand":
				opts.brand = args[++i] as Brand;
				break;
			case "--type":
				opts.type = args[++i] as ContentType;
				break;
			case "--dry-run":
				opts.dryRun = true;
				break;
			default:
				console.error(`Unknown arg: ${arg}`);
				process.exit(1);
		}
	}

	if (!opts.direction || !opts.target) {
		console.error(
			"Usage: sync-party-content.ts --direction <import|export> --target <local|remote> [--brand <brand>] [--type <type>] [--dry-run]",
		);
		process.exit(1);
	}

	return opts as SyncOptions;
}

function contentHash(body: string): string {
	return createHash("sha256").update(body).digest("hex");
}

function escSql(s: string): string {
	return s.replace(/'/g, "''");
}

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

function getFilenameForType(contentType: ContentType, brand: Brand): string {
	if (brand === "amen") {
		return `amen-${contentType}.json`;
	}
	return `${contentType}.json`;
}

// IMPORT: JSON → D1
// ===========================================================================

async function importFromJson(opts: SyncOptions): Promise<void> {
	const now = Date.now();
	const contentSql: string[] = [];
	let total = 0;
	let skipped = 0;

	const brands = opts.brand ? [opts.brand] : BRANDS;

	for (const brand of brands) {
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

			if (opts.type && contentType !== opts.type) {
				continue;
			}

			const raw = await readFile(path.join(brandDir, filename), "utf-8");
			let items: unknown[];
			try {
				items = JSON.parse(raw);
			} catch {
				console.warn(`  skip ${filename} (invalid JSON)`);
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
			console.log(
				`  ${brand}/${filename}: ${items.length} items → ${contentType}`,
			);
		}
	}

	console.log(`\nTotal: ${total} items, skipped: ${skipped}`);

	if (total === 0) {
		console.log("Nothing to import.");
		return;
	}

	if (opts.dryRun) {
		console.log(
			`\n[DRY RUN] Would execute ${contentSql.length} SQL statements against ${opts.target} D1.`,
		);
		return;
	}

	const tmpFile = path.resolve("api/.sync-party-content.sql");
	await writeFile(tmpFile, contentSql.join("\n"), "utf-8");
	console.log(
		`Wrote ${contentSql.length} statements to temp file, executing via wrangler...`,
	);

	const targetFlag = opts.target === "remote" ? "--remote" : "--local";

	try {
		execSync(
			`npx wrangler d1 execute slopcade-db ${targetFlag} --file .sync-party-content.sql`,
			{
				cwd: path.resolve("api"),
				stdio: "inherit",
			},
		);
	} finally {
		await unlink(tmpFile).catch(() => {});
	}

	console.log(`Done! Imported ${total} content rows to ${opts.target} D1.`);
}

// ============================================================================
// EXPORT: D1 → JSON
// ============================================================================

interface ContentRow {
	id: string;
	brand_id: string;
	content_type: string;
	body: string;
}

async function exportFromDb(opts: SyncOptions): Promise<void> {
	console.log(`Exporting from ${opts.target} D1 to JSON files...\n`);

	let whereClause = "WHERE deleted_at IS NULL";
	const params: string[] = [];

	if (opts.brand) {
		whereClause += " AND brand_id = ?";
		params.push(opts.brand);
	}
	if (opts.type) {
		whereClause += " AND content_type = ?";
		params.push(opts.type);
	}

	const query = `SELECT id, brand_id, content_type, body FROM party_content ${whereClause} ORDER BY brand_id, content_type, created_at`;

	const targetFlag = opts.target === "remote" ? "--remote" : "--local";
	const apiDir = path.resolve("api");
	const tmpSqlFile = path.join(apiDir, ".export-query.sql");
	const tmpJsonFile = path.join(apiDir, ".export-results.json");

	const escapedQuery = query.replace(/\?/g, (_, i) => {
		const param = params[i];
		return typeof param === "string" ? `'${escSql(param)}'` : param;
	});

	await writeFile(tmpSqlFile, escapedQuery, "utf-8");

	let result: ContentRow[];
	try {
		execSync(
			`npx wrangler d1 execute slopcade-db ${targetFlag} --file .export-query.sql --json > .export-results.json`,
			{
				cwd: apiDir,
				shell: "/bin/sh",
				stdio: "pipe",
			},
		);

		const raw = await readFile(tmpJsonFile, "utf-8");
		const parsed = JSON.parse(raw);
		result = parsed[0]?.results ?? [];
	} finally {
		await unlink(tmpSqlFile).catch(() => {});
		await unlink(tmpJsonFile).catch(() => {});
	}

	if (result.length === 0) {
		console.log("No content found in database.");
		return;
	}

	console.log(`Found ${result.length} items in database.`);

	const grouped = new Map<string, ContentRow[]>();
	for (const row of result) {
		const key = `${row.brand_id}/${row.content_type}`;
		if (!grouped.has(key)) {
			grouped.set(key, []);
		}
		grouped.get(key)!.push(row);
	}

	let totalWritten = 0;
	for (const [key, rows] of grouped) {
		const [brandId, contentType] = key.split("/") as [Brand, ContentType];
		const brandDir = path.join(PACKS_ROOT, brandId);

		await mkdir(brandDir, { recursive: true });

		const filename = getFilenameForType(contentType, brandId);
		const filepath = path.join(brandDir, filename);

		const items = rows
			.map((row) => {
				try {
					return JSON.parse(row.body);
				} catch {
					console.warn(`  Warning: Failed to parse body for ${row.id}`);
					return null;
				}
			})
			.filter(Boolean);

		if (opts.dryRun) {
			console.log(`[DRY RUN] Would write ${items.length} items to ${filepath}`);
			totalWritten += items.length;
			continue;
		}

		await writeFile(filepath, JSON.stringify(items, null, 2), "utf-8");
		console.log(`  Wrote ${items.length} items to ${brandId}/${filename}`);
		totalWritten += items.length;
	}

	if (opts.dryRun) {
		console.log(
			`\n[DRY RUN] Would export ${totalWritten} items to ${grouped.size} files.`,
		);
	} else {
		console.log(
			`\nDone! Exported ${totalWritten} items to ${grouped.size} JSON files.`,
		);
	}
}

// ============================================================================
// Main
// ============================================================================

async function main() {
	const opts = parseArgs();
	console.log(`Content Sync`);
	console.log(`  Direction: ${opts.direction}`);
	console.log(`  Target:    ${opts.target}`);
	if (opts.brand) console.log(`  Brand:     ${opts.brand}`);
	if (opts.type) console.log(`  Type:      ${opts.type}`);
	if (opts.dryRun) console.log(`  Mode:      DRY RUN`);
	console.log("");

	if (opts.direction === "import") {
		await importFromJson(opts);
	} else {
		await exportFromDb(opts);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
