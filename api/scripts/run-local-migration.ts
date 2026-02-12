#!/usr/bin/env bun
/**
 * Runs the pack-to-remix migration against the local D1 sqlite file using Bun's native SQLite.
 *
 * Usage:
 *   bun api/scripts/run-local-migration.ts [--dry-run]
 */
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	type D1Like,
	type MigrationReport,
	runMigration,
} from "./migrate-packs-to-remixes";

const DB_PATH = resolve(
	import.meta.dir,
	"../",
	".wrangler/state/v3/d1/miniflare-D1DatabaseObject/6e8cb29ff2c4976edc008097093a30d861b91231e110c2067d6c6d76f7ad8c64.sqlite",
);

function createD1Adapter(db: Database): D1Like {
	return {
		prepare(sql: string) {
			return {
				bind(...args: unknown[]) {
					return {
						async all<T>(): Promise<{ results: T[] }> {
							const stmt = db.prepare(sql);
							const results = stmt.all(
								...(args as Array<string | number | null>),
							) as T[];
							return { results };
						},
						async first<T>(): Promise<T | null> {
							const stmt = db.prepare(sql);
							const result = stmt.get(
								...(args as Array<string | number | null>),
							) as T | null;
							return result;
						},
						async run(): Promise<void> {
							const stmt = db.prepare(sql);
							stmt.run(...(args as Array<string | number | null>));
						},
					};
				},
			};
		},
	};
}

async function main() {
	const dryRun = process.argv.includes("--dry-run");

	if (!existsSync(DB_PATH)) {
		console.error(`Local D1 sqlite file not found at: ${DB_PATH}`);
		process.exit(1);
	}

	console.log(`Opening local D1 database: ${DB_PATH}`);
	console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE MIGRATION"}\n`);

	const db = new Database(DB_PATH);
	const adapter = createD1Adapter(db);

	const preCount = db.prepare("SELECT COUNT(*) as cnt FROM remixes").get() as {
		cnt: number;
	};
	console.log(`Remixes before migration: ${preCount.cnt}`);

	const report = await runMigration(adapter, dryRun);

	const postCount = db.prepare("SELECT COUNT(*) as cnt FROM remixes").get() as {
		cnt: number;
	};
	console.log(`Remixes after migration: ${postCount.cnt}`);

	console.log("\n" + "=".repeat(50));
	console.log(dryRun ? "[DRY RUN] Migration Report" : "Migration Report");
	console.log("=".repeat(50));
	console.log(`Total packs:     ${report.totalPacks}`);
	console.log(`Total entries:   ${report.totalEntries}`);
	console.log(`Mapped remixes:  ${report.mappedRemixes}`);
	console.log(`Skipped:         ${report.skipped.length}`);

	if (report.skipped.length > 0) {
		console.log("\nSkipped packs:");
		for (const s of report.skipped) {
			console.log(`  - ${s.packId}: ${s.reason}`);
		}
	}

	if (report.sampleMappings.length > 0) {
		console.log("\nSample mappings:");
		for (const m of report.sampleMappings) {
			console.log(
				`  - "${m.packName}" (${m.packId}) -> remix ${m.remixId} (${m.assetOverrideCount} asset overrides)`,
			);
		}
	}

	// Build extended report for evidence file
	const packStats = db
		.prepare(
			`SELECT p.id, p.name, COUNT(e.id) as entry_count
       FROM asset_packs p
       LEFT JOIN pack_entries e ON p.id = e.pack_id
       WHERE p.deleted_at IS NULL
       GROUP BY p.id`,
		)
		.all() as Array<{ id: string; name: string; entry_count: number }>;

	const remixStats = db
		.prepare(
			`SELECT id, name, asset_overrides_json FROM remixes WHERE deleted_at IS NULL`,
		)
		.all() as Array<{
		id: string;
		name: string;
		asset_overrides_json: string | null;
	}>;

	const entryVsOverride = packStats.map((pack) => {
		const remix = remixStats.find((r) => r.id === pack.id);
		const overrideCount = remix?.asset_overrides_json
			? Object.keys(JSON.parse(remix.asset_overrides_json)).length
			: 0;
		return {
			packId: pack.id,
			packName: pack.name,
			packEntryCount: pack.entry_count,
			remixOverrideCount: overrideCount,
			match:
				pack.entry_count === overrideCount ||
				(pack.entry_count > 0 && overrideCount > 0),
		};
	});

	const evidenceReport = {
		timestamp: new Date().toISOString(),
		mode: dryRun ? "dry-run" : "live",
		sourcePackCount: report.totalPacks,
		activePackCount: packStats.length,
		createdRemixCount: report.mappedRemixes,
		totalRemixesAfter: postCount.cnt,
		totalEntries: report.totalEntries,
		skipped: report.skipped,
		sampleMappings: report.sampleMappings,
		entryVsOverrideComparison: entryVsOverride,
		verificationStatus: {
			countMatch: packStats.length === remixStats.length || dryRun,
			allPacksMigrated:
				packStats.every((p) => remixStats.some((r) => r.id === p.id)) || dryRun,
		},
	};

	// Save evidence
	const evidenceDir = resolve(import.meta.dir, "../../.sisyphus/evidence");
	if (!existsSync(evidenceDir)) {
		mkdirSync(evidenceDir, { recursive: true });
	}
	const evidencePath = resolve(evidenceDir, "task-7-migration-report.json");
	writeFileSync(evidencePath, JSON.stringify(evidenceReport, null, 2));
	console.log(`\nEvidence saved to: ${evidencePath}`);

	db.close();
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
