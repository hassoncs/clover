import { EconomyGraphSchema } from "@slopcade/economy-engine";
import { describe, expect, it } from "vitest";
import {
	craftingEconomy,
	gamblingEconomy,
	simpleResourceEconomy,
} from "../__fixtures__/economy-games";

describe("Economy AI Generation", () => {
	describe("EconomyGraphSchema validation", () => {
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

		it("parses economy graph with missing node references (semantic validation done separately)", () => {
			const invalidEconomy = {
				id: "bad-economy",
				resourceTypes: ["gold"],
				nodes: [
					{
						id: "src",
						type: "source",
						label: "Source",
						resourceType: "gold",
					},
				],
				edges: [
					{
						id: "e1",
						type: "resource",
						from: "src",
						to: "nonexistent",
					},
				],
			};

			const result = EconomyGraphSchema.safeParse(invalidEconomy);
			expect(result.success).toBe(true);
		});

		it("rejects economy with empty nodes array", () => {
			const emptyEconomy = {
				id: "empty",
				resourceTypes: ["gold"],
				nodes: [],
				edges: [],
			};

			const result = EconomyGraphSchema.safeParse(emptyEconomy);
			expect(result.success).toBe(false);
		});

		it("accepts economy graph (duplicate checking done by validateEconomyGraph)", () => {
			const duplicateEconomy = {
				id: "dup",
				resourceTypes: ["gold"],
				nodes: [
					{
						id: "n1",
						type: "source",
						label: "Source",
						resourceType: "gold",
					},
					{
						id: "n2",
						type: "drain",
						label: "Drain",
						resourceType: "gold",
					},
				],
				edges: [],
			};

			const result = EconomyGraphSchema.safeParse(duplicateEconomy);
			expect(result.success).toBe(true);
		});
	});
});
