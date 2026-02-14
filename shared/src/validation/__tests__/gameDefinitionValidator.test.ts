import { describe, expect, it } from "vitest";
import type { GameDefinition } from "../../types/GameDefinition";
import { validateGameDefinition } from "../gameDefinitionValidator";

function createMinimalGame(
	overrides: Partial<GameDefinition> = {},
): GameDefinition {
	return {
		metadata: { id: "test-game", title: "Test Game", version: "1.0.0" },
		world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
		prefabs: {},
		entities: [
			{
				id: "player",
				name: "Player",
				tags: ["player"],
				transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
			},
		],
		...overrides,
	} as GameDefinition;
}

describe("gameDefinitionValidator", () => {
	describe("valid game definitions", () => {
		it("should pass a minimal valid game", () => {
			const game = createMinimalGame();
			const result = validateGameDefinition(game);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe("metadata validation", () => {
		it("should warn when title is missing", () => {
			const game = createMinimalGame({
				metadata: { id: "test", title: "", version: "1.0.0" },
			});

			const result = validateGameDefinition(game);

			expect(result.warnings.some((w) => w.code === "MISSING_TITLE")).toBe(
				true,
			);
		});

		it("should warn when version is missing", () => {
			const game = createMinimalGame({
				metadata: { id: "test", title: "Test", version: "" },
			});

			const result = validateGameDefinition(game);

			expect(result.warnings.some((w) => w.code === "MISSING_VERSION")).toBe(
				true,
			);
		});
	});

	describe("entity validation", () => {
		it("should error on duplicate entity IDs", () => {
			const game = createMinimalGame({
				entities: [
					{
						id: "dup",
						name: "A",
						tags: [],
						transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
					},
					{
						id: "dup",
						name: "B",
						tags: [],
						transform: { x: 1, y: 1, angle: 0, scaleX: 1, scaleY: 1 },
					},
				],
			});

			const result = validateGameDefinition(game);

			expect(result.errors.some((e) => e.code === "DUPLICATE_ENTITY_ID")).toBe(
				true,
			);
		});

		it("should error when entities array is empty", () => {
			const game = createMinimalGame({ entities: [] });

			const result = validateGameDefinition(game);

			expect(result.errors.some((e) => e.code === "NO_ENTITIES")).toBe(true);
		});

		it("should error on unknown prefab reference", () => {
			const game = createMinimalGame({
				prefabs: {},
				entities: [
					{
						id: "e1",
						name: "E1",
						prefab: "nonexistent",
						tags: [],
						transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
					},
				],
			});

			const result = validateGameDefinition(game);

			expect(result.errors.some((e) => e.code === "UNKNOWN_PREFAB")).toBe(true);
		});
	});

	describe("world validation", () => {
		it("should warn on invalid pixelsPerMeter", () => {
			const game = createMinimalGame({
				world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: -1 },
			});

			const result = validateGameDefinition(game);

			expect(
				result.warnings.some((w) => w.code === "INVALID_PIXELS_PER_METER"),
			).toBe(true);
		});
	});
});
