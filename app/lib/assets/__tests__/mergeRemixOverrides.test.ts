import type { GameDefinition } from "@slopcade/shared";
import type { EntityPrefab } from "@slopcade/shared/types/entity";
import { applyVariableOverrides } from "@slopcade/shared/types/remix";
import type { ImageVisualComponent } from "@slopcade/shared/types/visual";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedPackEntry } from "../AssetManifest";
import { mergeAssetsIntoPrefabs } from "../mergeAssetsIntoTemplates";

function makeDefinition(
	overrides: Partial<GameDefinition> = {},
): GameDefinition {
	return {
		metadata: { title: "Test Game", description: "" },
		world: { width: 800, height: 600, gravity: { x: 0, y: 9.8 } },
		prefabs: {},
		entities: [],
		...overrides,
	} as GameDefinition;
}

function makeImagePrefab(url: string): EntityPrefab {
	return {
		id: "prefab",
		visual: { type: "image", url },
		physics: { bodyType: "dynamic" },
		collider: { shape: "box", width: 1, height: 1 },
	};
}

function getImageUrl(prefab: EntityPrefab): string | undefined {
	if (prefab.visual?.type === "image") {
		return (prefab.visual as ImageVisualComponent).url;
	}
	return undefined;
}

describe("mergeRemixOverrides", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe("variable overrides via applyVariableOverrides", () => {
		it("applies numeric override to a primitive variable", () => {
			const variables: Record<string, number | boolean | string> = {
				gravity: 9.8,
				speed: 5,
			};
			const overrides = { gravity: 20 };

			const result = applyVariableOverrides(variables, overrides);

			expect(result.gravity).toBe(20);
			expect(result.speed).toBe(5);
		});

		it("applies override to VariableWithTuning preserving metadata", () => {
			const variables = {
				gravity: {
					value: 9.8,
					tuning: { min: 0, max: 100, step: 0.1 },
					label: "Gravity",
				},
			};
			const overrides = { gravity: 20 };

			const result = applyVariableOverrides(variables, overrides);

			expect(result.gravity).toEqual({
				value: 20,
				tuning: { min: 0, max: 100, step: 0.1 },
				label: "Gravity",
			});
		});

		it("silently ignores stale override keys that don't exist in game variables", () => {
			const variables = { speed: 5 };
			const overrides = { speed: 10, nonExistentKey: 99 };

			const result = applyVariableOverrides(variables, overrides);

			expect(result.speed).toBe(10);
			expect(result).not.toHaveProperty("nonExistentKey");
		});

		it("returns original variables when overrides are empty", () => {
			const variables = { speed: 5, gravity: 9.8 };
			const overrides = {};

			const result = applyVariableOverrides(variables, overrides);

			expect(result).toEqual(variables);
		});
	});

	describe("asset overrides via mergeAssetsIntoPrefabs", () => {
		it("merges asset entries into matching prefabs", () => {
			const def = makeDefinition({
				prefabs: { player: makeImagePrefab("original.png") },
			});
			const entries: Record<string, ResolvedPackEntry> = {
				player: { imageUrl: "remix-player.png" },
			};

			const result = mergeAssetsIntoPrefabs(def, entries);

			expect(getImageUrl(result.prefabs.player)).toBe("remix-player.png");
		});

		it("merges placement data into prefabs", () => {
			const def = makeDefinition({
				prefabs: { ball: makeImagePrefab("ball.png") },
			});
			const entries: Record<string, ResolvedPackEntry> = {
				ball: {
					imageUrl: "remix-ball.png",
					placement: { scale: 1.5, offsetX: 10, offsetY: -5 },
				},
			};

			const result = mergeAssetsIntoPrefabs(def, entries);

			const visual = result.prefabs.ball.visual as ImageVisualComponent;
			expect(visual.url).toBe("remix-ball.png");
			expect(visual.scale).toBe(1.5);
			expect(visual.offsetX).toBe(10);
			expect(visual.offsetY).toBe(-5);
		});

		it("handles stale asset keys gracefully (no crash, warns)", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const def = makeDefinition({
				prefabs: { player: makeImagePrefab("original.png") },
			});
			const entries: Record<string, ResolvedPackEntry> = {
				deletedPrefab: { imageUrl: "stale.png" },
			};

			const result = mergeAssetsIntoPrefabs(def, entries);

			expect(getImageUrl(result.prefabs.player)).toBe("original.png");
			warnSpy.mockRestore();
		});

		it("does not crash when assets is undefined", () => {
			const def = makeDefinition({
				prefabs: { player: makeImagePrefab("original.png") },
			});

			const result = mergeAssetsIntoPrefabs(def, undefined);

			expect(getImageUrl(result.prefabs.player)).toBe("original.png");
		});
	});

	describe("combined variable + asset overrides (integration)", () => {
		it("applies both variable and asset overrides to a definition", () => {
			const def = makeDefinition({
				variables: {
					gravity: 9.8,
					speed: {
						value: 5,
						tuning: { min: 1, max: 20, step: 1 },
						label: "Speed",
					},
				},
				prefabs: { player: makeImagePrefab("original.png") },
			});

			const variableOverrides = { gravity: 20, speed: 15 };
			const assetEntries: Record<string, ResolvedPackEntry> = {
				player: { imageUrl: "remix-player.png" },
			};

			const withVariables = {
				...def,
				variables: applyVariableOverrides(def.variables!, variableOverrides),
			};
			const enriched = mergeAssetsIntoPrefabs(withVariables, assetEntries);

			expect(enriched.variables!.gravity).toBe(20);
			expect(enriched.variables!.speed).toEqual({
				value: 15,
				tuning: { min: 1, max: 20, step: 1 },
				label: "Speed",
			});
			expect(getImageUrl(enriched.prefabs.player)).toBe("remix-player.png");
		});

		it("preserves definition when no overrides are provided", () => {
			const def = makeDefinition({
				variables: { gravity: 9.8 },
				prefabs: { player: makeImagePrefab("original.png") },
			});

			const enriched = mergeAssetsIntoPrefabs(def, undefined);

			expect(enriched.variables!.gravity).toBe(9.8);
			expect(getImageUrl(enriched.prefabs.player)).toBe("original.png");
		});
	});
});
