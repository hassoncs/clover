import { describe, expect, it } from "vitest";
import {
	type AssetPackRow,
	buildAssetUrl,
	buildMigrationReport,
	type PackEntryWithAsset,
	transformPackEntriesToAssetOverrides,
	transformPackToRemix,
} from "../migrate-packs-to-remixes";

function makePack(overrides: Partial<AssetPackRow> = {}): AssetPackRow {
	return {
		id: "pack-1",
		base_game_id: "game-1",
		name: "Test Pack",
		description: "A test pack",
		theme_id: "theme-1",
		creator_user_id: "user-1",
		is_complete: 1,
		created_at: 1700000000000,
		updated_at: 1700000001000,
		deleted_at: null,
		...overrides,
	};
}

function makeEntry(
	overrides: Partial<PackEntryWithAsset> = {},
): PackEntryWithAsset {
	return {
		id: "entry-1",
		pack_id: "pack-1",
		template_id: "ball",
		asset_id: "asset-1",
		placement_json: null,
		r2_key: "generated/game-1/pack-1/asset-1.png",
		...overrides,
	};
}

describe("buildAssetUrl", () => {
	it("returns the r2 key as-is", () => {
		expect(buildAssetUrl("generated/game-1/pack-1/asset-1.png")).toBe(
			"generated/game-1/pack-1/asset-1.png",
		);
	});
});

describe("transformPackEntriesToAssetOverrides", () => {
	it("transforms entries with r2_key into asset overrides", () => {
		const entries = [
			makeEntry({
				template_id: "ball",
				asset_id: "a1",
				r2_key: "gen/ball.png",
			}),
			makeEntry({ template_id: "peg", asset_id: "a2", r2_key: "gen/peg.png" }),
		];

		const result = transformPackEntriesToAssetOverrides(entries);

		expect(result).toEqual({
			ball: { assetId: "a1", assetUrl: "gen/ball.png" },
			peg: { assetId: "a2", assetUrl: "gen/peg.png" },
		});
	});

	it("skips entries without r2_key", () => {
		const entries = [
			makeEntry({ template_id: "ball", r2_key: "gen/ball.png" }),
			makeEntry({ template_id: "peg", r2_key: null }),
		];

		const result = transformPackEntriesToAssetOverrides(entries);

		expect(result).toEqual({
			ball: { assetId: "asset-1", assetUrl: "gen/ball.png" },
		});
		expect(result["peg"]).toBeUndefined();
	});

	it("includes placement when present", () => {
		const entries = [
			makeEntry({
				template_id: "ball",
				r2_key: "gen/ball.png",
				placement_json: JSON.stringify({
					scale: 1.5,
					offsetX: 10,
					offsetY: -5,
				}),
			}),
		];

		const result = transformPackEntriesToAssetOverrides(entries);

		expect(result["ball"].placement).toEqual({
			scale: 1.5,
			offsetX: 10,
			offsetY: -5,
		});
	});

	it("defaults placement fields to 0/1 when partially present", () => {
		const entries = [
			makeEntry({
				template_id: "ball",
				r2_key: "gen/ball.png",
				placement_json: JSON.stringify({ scale: 2 }),
			}),
		];

		const result = transformPackEntriesToAssetOverrides(entries);

		expect(result["ball"].placement).toEqual({
			scale: 2,
			offsetX: 0,
			offsetY: 0,
		});
	});

	it("skips malformed placement_json gracefully", () => {
		const entries = [
			makeEntry({
				template_id: "ball",
				r2_key: "gen/ball.png",
				placement_json: "{invalid json}",
			}),
		];

		const result = transformPackEntriesToAssetOverrides(entries);

		expect(result["ball"]).toEqual({
			assetId: "asset-1",
			assetUrl: "gen/ball.png",
		});
		expect(result["ball"].placement).toBeUndefined();
	});

	it("returns empty object for empty entries", () => {
		expect(transformPackEntriesToAssetOverrides([])).toEqual({});
	});
});

describe("transformPackToRemix", () => {
	it("preserves pack ID as remix ID (idempotency key)", () => {
		const pack = makePack({ id: "pack-abc" });
		const remix = transformPackToRemix(pack, []);

		expect(remix.id).toBe("pack-abc");
	});

	it("maps all pack fields to remix fields", () => {
		const pack = makePack();
		const remix = transformPackToRemix(pack, []);

		expect(remix.base_game_id).toBe("game-1");
		expect(remix.name).toBe("Test Pack");
		expect(remix.description).toBe("A test pack");
		expect(remix.creator_user_id).toBe("user-1");
		expect(remix.theme_id).toBe("theme-1");
		expect(remix.is_complete).toBe(1);
		expect(remix.created_at).toBe(1700000000000);
		expect(remix.updated_at).toBe(1700000001000);
		expect(remix.deleted_at).toBeNull();
	});

	it("sets new remix-only fields to null", () => {
		const pack = makePack();
		const remix = transformPackToRemix(pack, []);

		expect(remix.variable_overrides_json).toBeNull();
		expect(remix.shader_param_overrides_json).toBeNull();
		expect(remix.sound_overrides_json).toBeNull();
		expect(remix.theme_prompt).toBeNull();
		expect(remix.style).toBeNull();
		expect(remix.thumbnail_url).toBeNull();
	});

	it("builds asset_overrides_json from entries", () => {
		const pack = makePack();
		const entries = [
			makeEntry({
				template_id: "ball",
				asset_id: "a1",
				r2_key: "gen/ball.png",
			}),
			makeEntry({ template_id: "peg", asset_id: "a2", r2_key: "gen/peg.png" }),
		];

		const remix = transformPackToRemix(pack, entries);
		const overrides = JSON.parse(remix.asset_overrides_json!);

		expect(overrides).toEqual({
			ball: { assetId: "a1", assetUrl: "gen/ball.png" },
			peg: { assetId: "a2", assetUrl: "gen/peg.png" },
		});
	});

	it("sets asset_overrides_json to null when no entries have r2_key", () => {
		const pack = makePack();
		const entries = [makeEntry({ r2_key: null })];

		const remix = transformPackToRemix(pack, entries);

		expect(remix.asset_overrides_json).toBeNull();
	});
});

describe("buildMigrationReport", () => {
	it("counts packs and entries correctly", () => {
		const packs = [makePack({ id: "p1" }), makePack({ id: "p2" })];
		const entriesByPack = new Map([
			["p1", [makeEntry(), makeEntry({ id: "e2", template_id: "peg" })]],
			["p2", [makeEntry({ id: "e3", pack_id: "p2" })]],
		]);

		const report = buildMigrationReport(packs, entriesByPack, new Set());

		expect(report.totalPacks).toBe(2);
		expect(report.totalEntries).toBe(3);
		expect(report.mappedRemixes).toBe(2);
	});

	it("skips already-migrated packs", () => {
		const packs = [makePack({ id: "p1" }), makePack({ id: "p2" })];
		const entriesByPack = new Map<string, PackEntryWithAsset[]>();
		const existingRemixIds = new Set(["p1"]);

		const report = buildMigrationReport(packs, entriesByPack, existingRemixIds);

		expect(report.mappedRemixes).toBe(1);
		expect(report.skipped).toEqual([
			{ packId: "p1", reason: "already migrated (remix with same ID exists)" },
		]);
	});

	it("skips soft-deleted packs", () => {
		const packs = [makePack({ id: "p1", deleted_at: 1700000002000 })];
		const entriesByPack = new Map<string, PackEntryWithAsset[]>();

		const report = buildMigrationReport(packs, entriesByPack, new Set());

		expect(report.mappedRemixes).toBe(0);
		expect(report.skipped).toEqual([
			{ packId: "p1", reason: "soft-deleted pack" },
		]);
	});

	it("includes up to 5 sample mappings", () => {
		const packs = Array.from({ length: 8 }, (_, i) =>
			makePack({ id: `p${i}`, name: `Pack ${i}` }),
		);
		const entriesByPack = new Map<string, PackEntryWithAsset[]>();

		const report = buildMigrationReport(packs, entriesByPack, new Set());

		expect(report.sampleMappings.length).toBe(5);
		expect(report.sampleMappings[0].packId).toBe("p0");
		expect(report.sampleMappings[0].remixId).toBe("p0");
	});

	it("reports empty state correctly", () => {
		const report = buildMigrationReport([], new Map(), new Set());

		expect(report.totalPacks).toBe(0);
		expect(report.totalEntries).toBe(0);
		expect(report.mappedRemixes).toBe(0);
		expect(report.skipped).toEqual([]);
		expect(report.sampleMappings).toEqual([]);
	});

	it("counts asset overrides in sample mappings", () => {
		const packs = [makePack({ id: "p1", name: "Pack 1" })];
		const entriesByPack = new Map([
			[
				"p1",
				[
					makeEntry({ template_id: "ball", r2_key: "gen/ball.png" }),
					makeEntry({ id: "e2", template_id: "peg", r2_key: "gen/peg.png" }),
				],
			],
		]);

		const report = buildMigrationReport(packs, entriesByPack, new Set());

		expect(report.sampleMappings[0].assetOverrideCount).toBe(2);
	});
});
