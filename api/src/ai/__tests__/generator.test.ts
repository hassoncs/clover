import type { GameDefinition } from "@slopcade/shared/types/GameDefinition";
import { describe, expect, it } from "vitest";
import validProjectileGame from "@/__fixtures__/games/valid-projectile-game.json";
import { classifyPrompt } from "@/ai/game/classifier";
import { validateGameDefinition } from "@/ai/game/validator";

describe("generateGame integration (using fixtures)", () => {
	describe("intent classification + validation pipeline", () => {
		it("should classify projectile game intent correctly", () => {
			const intent = classifyPrompt(
				"A game where I launch balls at stacked blocks",
			);

			expect(intent.gameType).toBe("projectile");
			expect(intent.controlIntent).toBe("drag_to_aim");
			expect(intent.winConditionType).toBe("destroy_all");
		});

		it("should validate a well-formed game definition", () => {
			const validation = validateGameDefinition(
				validProjectileGame as unknown as GameDefinition,
			);

			expect(validation.valid).toBe(true);
			expect(validation.errors).toHaveLength(0);
		});

		it("should have consistent pipeline: classify → generate fixture → validate", () => {
			const prompt = "A game where I launch balls at stacked blocks";
			const intent = classifyPrompt(prompt);

			expect(intent.gameType).toBe("projectile");

			const game = validProjectileGame as unknown as GameDefinition;

			const validation = validateGameDefinition(game);
			expect(validation.valid).toBe(true);
		});
	});

	describe("game definition structure", () => {
		const game = validProjectileGame as unknown as GameDefinition;

		it("should have required metadata", () => {
			expect(game.metadata.id).toBeDefined();
			expect(game.metadata.title).toBeDefined();
			expect(game.metadata.version).toBeDefined();
		});

		it("should have valid world config", () => {
			expect(game.world.gravity).toEqual({ x: 0, y: 10 });
			expect(game.world.pixelsPerMeter).toBe(50);
		});

		it("should have script references", () => {
			const entitiesWithScripts = game.entities.filter((e) => e.scriptRef);
			expect(entitiesWithScripts.length).toBeGreaterThan(0);

			expect(game.prefabs["ball"].scriptRef).toBeDefined();
		});

		it("should have target entities", () => {
			const targets = game.entities.filter((e) => e.tags?.includes("target"));
			expect(targets.length).toBeGreaterThan(0);
		});
	});

	describe("error cases", () => {
		it("should fail validation for game with no entities", () => {
			const invalidGame = {
				metadata: { id: "test" },
				world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
				entities: [],
			};

			const validation = validateGameDefinition(
				invalidGame as unknown as GameDefinition,
			);
			expect(validation.valid).toBe(false);
			expect(validation.errors.length).toBeGreaterThan(0);
		});

		it("should fail validation for invalid physics", () => {
			const invalidGame = {
				metadata: { id: "test" },
				world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
				entities: [
					{
						id: "bad-entity",
						name: "Bad Entity",
						transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
						physics: { bodyType: "invalid", density: -1 },
						visual: { type: "rect", width: 1, height: 1, color: "#000" },
					},
				],
			};

			const validation = validateGameDefinition(
				invalidGame as unknown as GameDefinition,
			);
			expect(validation.valid).toBe(false);
			expect(validation.errors.some((e) => e.path.includes("bodyType"))).toBe(
				true,
			);
		});
	});
});
