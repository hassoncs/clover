import {
	EconomyGraphSchema,
	validateEconomyGraph,
} from "@slopcade/economy-engine";
import { describe, expect, it } from "vitest";
import {
	allNodeAndEdgeTypesEconomy,
	craftingEconomy,
	gamblingEconomy,
	malformedEconomyInvalidNodeType,
	malformedEconomyMissingNode,
	simpleResourceEconomy,
} from "../__fixtures__/economy-games";
import { buildGenerationPrompt } from "../game/generator";
import { GameDefinitionSchema } from "../game/schemas";

describe("Economy AI Generation", () => {
	describe("EconomyGraphSchema + semantic validation", () => {
		it("accepts valid simple resource economy", () => {
			const result = EconomyGraphSchema.safeParse(simpleResourceEconomy);
			expect(result.success).toBe(true);
		});

		it("accepts valid crafting economy with converters", () => {
			const result = EconomyGraphSchema.safeParse(craftingEconomy);
			expect(result.success).toBe(true);
		});

		it("accepts valid gambling economy with gates", () => {
			const result = EconomyGraphSchema.safeParse(gamblingEconomy);
			expect(result.success).toBe(true);
		});

		it("accepts graph that uses every supported node and edge type", () => {
			const result = EconomyGraphSchema.safeParse(allNodeAndEdgeTypesEconomy);
			expect(result.success).toBe(true);
		});

		it("rejects malformed node types from AI output", () => {
			const result = EconomyGraphSchema.safeParse(
				malformedEconomyInvalidNodeType,
			);
			expect(result.success).toBe(false);
		});

		it("flags missing node references during semantic economy validation", () => {
			const parsed = EconomyGraphSchema.parse(malformedEconomyMissingNode);
			const validation = validateEconomyGraph(parsed);
			expect(validation.valid).toBe(false);
			expect(
				validation.errors.some((e) => e.code === "E_MISSING_NODE_REF"),
			).toBe(true);
		});
	});

	describe("GameDefinition schema economy integration", () => {
		it("accepts a game definition with a valid economy graph", () => {
			const result = GameDefinitionSchema.safeParse({
				metadata: {
					id: "economy-game",
					title: "Economy Test",
					description: "",
					author: "",
					version: "1.0.0",
				},
				world: {
					gravity: { x: 0, y: 10 },
					pixelsPerMeter: 50,
				},
				prefabs: {
					player: {
						id: "player",
						visual: { type: "rect", width: 1, height: 1 },
					},
				},
				entities: [
					{
						id: "player",
						name: "Player",
						transform: { x: 2, y: 2, angle: 0, scaleX: 1, scaleY: 1 },
						visual: { type: "rect", width: 1, height: 1 },
					},
				],
				economy: allNodeAndEdgeTypesEconomy,
			});

			expect(result.success).toBe(true);
		});

		it("rejects malformed economy graph on the game schema", () => {
			const result = GameDefinitionSchema.safeParse({
				metadata: {
					id: "economy-game",
					title: "Economy Test",
					description: "",
					author: "",
					version: "1.0.0",
				},
				world: {
					gravity: { x: 0, y: 10 },
					pixelsPerMeter: 50,
				},
				prefabs: {
					player: {
						id: "player",
						visual: { type: "rect", width: 1, height: 1 },
					},
				},
				entities: [
					{
						id: "player",
						name: "Player",
						transform: { x: 2, y: 2, angle: 0, scaleX: 1, scaleY: 1 },
						visual: { type: "rect", width: 1, height: 1 },
					},
				],
				economy: malformedEconomyInvalidNodeType,
			});

			expect(result.success).toBe(false);
		});
	});

	describe("economy-aware prompt guidance", () => {
		it("includes deterministic economy instructions for resource-driven prompts", () => {
			const prompt = buildGenerationPrompt(
				"A tycoon where players earn coins and buy upgrades",
				{
					gameType: "falling_objects",
					theme: "robots",
					playerAction: "collect",
					targetAction: "reach score",
					winConditionType: "score",
					loseConditionType: "time_up",
					controlIntent: "drag_to_move",
					difficulty: "medium",
					specialRequests: [],
				},
			);

			expect(prompt).toContain("Optional economy graph guidance");
			expect(prompt).toContain("Deterministic constraints");
			expect(prompt).toContain('"type": "source"');
			expect(prompt).toContain('"type": "resource"');
		});

		it("keeps economy optional for non-resource game prompts", () => {
			const prompt = buildGenerationPrompt(
				"A platformer where a cat jumps over lava",
				{
					gameType: "platformer",
					theme: "cats",
					playerAction: "jump",
					targetAction: "reach",
					winConditionType: "reach_entity",
					loseConditionType: "entity_destroyed",
					controlIntent: "tap_to_jump",
					difficulty: "easy",
					specialRequests: [],
				},
			);

			expect(prompt).not.toContain("Optional economy graph guidance");
		});
	});
});
