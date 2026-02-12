#!/usr/bin/env tsx
/**
 * ROLLBACK SQL:
 *   DELETE FROM remixes WHERE id IN (SELECT id FROM asset_packs WHERE deleted_at IS NULL);
 *   DROP TABLE IF EXISTS remixes;
 *
 * Usage:
 *   npx tsx api/scripts/migrate-packs-to-remixes.ts --dry-run
 *   npx tsx api/scripts/migrate-packs-to-remixes.ts
 */

export interface AssetPackRow {
	id: string;
	base_game_id: string;
	name: string;
	description: string | null;
	theme_id: string | null;
	creator_user_id: string | null;
	is_complete: number;
	created_at: number;
	updated_at: number | null;
	deleted_at: number | null;
}

export interface PackEntryRow {
	id: string;
	pack_id: string;
	template_id: string;
	asset_id: string;
	placement_json: string | null;
}

export interface PackEntryWithAsset extends PackEntryRow {
	r2_key: string | null;
}

export interface AssetOverrideEntry {
	assetId: string;
	assetUrl: string;
	placement?: { scale: number; offsetX: number; offsetY: number };
}

export interface RemixRow {
	id: string;
	base_game_id: string;
	name: string;
	description: string | null;
	creator_user_id: string | null;
	variable_overrides_json: string | null;
	asset_overrides_json: string | null;
	shader_param_overrides_json: string | null;
	sound_overrides_json: string | null;
	theme_id: string | null;
	theme_prompt: string | null;
	style: string | null;
	is_complete: number;
	thumbnail_url: string | null;
	created_at: number;
	updated_at: number | null;
	deleted_at: number | null;
}

export interface MigrationReport {
	totalPacks: number;
	totalEntries: number;
	mappedRemixes: number;
	skipped: Array<{ packId: string; reason: string }>;
	sampleMappings: Array<{
		packId: string;
		packName: string;
		remixId: string;
		assetOverrideCount: number;
	}>;
}

export function buildAssetUrl(r2Key: string): string {
	return r2Key;
}

export function transformPackEntriesToAssetOverrides(
	entries: PackEntryWithAsset[],
): Record<string, AssetOverrideEntry> {
	const overrides: Record<string, AssetOverrideEntry> = {};

	for (const entry of entries) {
		if (!entry.r2_key) continue;

		const override: AssetOverrideEntry = {
			assetId: entry.asset_id,
			assetUrl: buildAssetUrl(entry.r2_key),
		};

		if (entry.placement_json) {
			try {
				const placement = JSON.parse(entry.placement_json);
				if (
					typeof placement.scale === "number" ||
					typeof placement.offsetX === "number" ||
					typeof placement.offsetY === "number"
				) {
					override.placement = {
						scale: placement.scale ?? 1,
						offsetX: placement.offsetX ?? 0,
						offsetY: placement.offsetY ?? 0,
					};
				}
			} catch {
				// intentionally swallow: malformed placement_json should not halt migration
			}
		}

		overrides[entry.template_id] = override;
	}

	return overrides;
}

export function transformPackToRemix(
	pack: AssetPackRow,
	entries: PackEntryWithAsset[],
): RemixRow {
	const assetOverrides = transformPackEntriesToAssetOverrides(entries);
	const hasOverrides = Object.keys(assetOverrides).length > 0;

	return {
		id: pack.id,
		base_game_id: pack.base_game_id,
		name: pack.name,
		description: pack.description,
		creator_user_id: pack.creator_user_id,
		variable_overrides_json: null,
		asset_overrides_json: hasOverrides ? JSON.stringify(assetOverrides) : null,
		shader_param_overrides_json: null,
		sound_overrides_json: null,
		theme_id: pack.theme_id,
		theme_prompt: null,
		style: null,
		is_complete: pack.is_complete,
		thumbnail_url: null,
		created_at: pack.created_at,
		updated_at: pack.updated_at,
		deleted_at: pack.deleted_at,
	};
}

export function buildMigrationReport(
	packs: AssetPackRow[],
	entriesByPack: Map<string, PackEntryWithAsset[]>,
	existingRemixIds: Set<string>,
): MigrationReport {
	const report: MigrationReport = {
		totalPacks: packs.length,
		totalEntries: 0,
		mappedRemixes: 0,
		skipped: [],
		sampleMappings: [],
	};

	for (const pack of packs) {
		const entries = entriesByPack.get(pack.id) ?? [];
		report.totalEntries += entries.length;

		if (existingRemixIds.has(pack.id)) {
			report.skipped.push({
				packId: pack.id,
				reason: "already migrated (remix with same ID exists)",
			});
			continue;
		}

		if (pack.deleted_at !== null) {
			report.skipped.push({ packId: pack.id, reason: "soft-deleted pack" });
			continue;
		}

		const assetOverrides = transformPackEntriesToAssetOverrides(entries);
		report.mappedRemixes++;

		if (report.sampleMappings.length < 5) {
			report.sampleMappings.push({
				packId: pack.id,
				packName: pack.name,
				remixId: pack.id,
				assetOverrideCount: Object.keys(assetOverrides).length,
			});
		}
	}

	return report;
}

export interface D1Like {
	prepare(sql: string): {
		bind(...args: unknown[]): {
			all<T>(): Promise<{ results: T[] }>;
			first<T>(): Promise<T | null>;
			run(): Promise<void>;
		};
	};
}

export async function runMigration(
	db: D1Like,
	dryRun: boolean,
): Promise<MigrationReport> {
	const packsResult = await db
		.prepare("SELECT * FROM asset_packs")
		.bind()
		.all<AssetPackRow>();
	const packs = packsResult.results;

	const entriesResult = await db
		.prepare(
			`SELECT e.*, a.r2_key
       FROM pack_entries e
       LEFT JOIN assets a ON e.asset_id = a.id`,
		)
		.bind()
		.all<PackEntryWithAsset>();

	const entriesByPack = new Map<string, PackEntryWithAsset[]>();
	for (const entry of entriesResult.results) {
		const list = entriesByPack.get(entry.pack_id) ?? [];
		list.push(entry);
		entriesByPack.set(entry.pack_id, list);
	}

	const existingResult = await db
		.prepare("SELECT id FROM remixes")
		.bind()
		.all<{ id: string }>();
	const existingRemixIds = new Set(existingResult.results.map((r) => r.id));

	const report = buildMigrationReport(packs, entriesByPack, existingRemixIds);

	if (dryRun) {
		return report;
	}

	for (const pack of packs) {
		if (existingRemixIds.has(pack.id)) continue;
		if (pack.deleted_at !== null) continue;

		const entries = entriesByPack.get(pack.id) ?? [];
		const remix = transformPackToRemix(pack, entries);

		await db
			.prepare(
				`INSERT INTO remixes (id, base_game_id, name, description, creator_user_id,
          variable_overrides_json, asset_overrides_json, shader_param_overrides_json,
          sound_overrides_json, theme_id, theme_prompt, style, is_complete,
          thumbnail_url, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				remix.id,
				remix.base_game_id,
				remix.name,
				remix.description,
				remix.creator_user_id,
				remix.variable_overrides_json,
				remix.asset_overrides_json,
				remix.shader_param_overrides_json,
				remix.sound_overrides_json,
				remix.theme_id,
				remix.theme_prompt,
				remix.style,
				remix.is_complete,
				remix.thumbnail_url,
				remix.created_at,
				remix.updated_at,
				remix.deleted_at,
			)
			.run();
	}

	return report;
}

function printReport(report: MigrationReport, dryRun: boolean): void {
	const prefix = dryRun ? "[DRY RUN] " : "";
	console.log(`\n${prefix}Migration Report`);
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

	console.log("");
}

async function main() {
	const dryRun = process.argv.includes("--dry-run");

	console.log(dryRun ? "Running in DRY RUN mode..." : "Running migration...");
	console.log(
		"NOTE: This script requires a D1 database binding. Use with wrangler:",
	);
	console.log('  wrangler d1 execute slopcade-db --local --command "SELECT 1"');
	console.log("");
	console.log("This script is designed to be run with a D1 binding injected.");
	console.log(
		"For now, use the exported functions programmatically or adapt for your runtime.",
	);

	process.exit(0);
}

const isDirectExecution =
	typeof process !== "undefined" &&
	process.argv[1] &&
	(process.argv[1].endsWith("migrate-packs-to-remixes.ts") ||
		process.argv[1].endsWith("migrate-packs-to-remixes.js"));

if (isDirectExecution) {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
