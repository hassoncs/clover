import type { EconomyGraph } from "@slopcade/economy-engine";
import type { GameDefinition } from "@slopcade/shared/types/GameDefinition";
import { beforeAll, describe, expect, it } from "vitest";
import {
	createAuthenticatedContext,
	createPublicContext,
	createTestUser,
	initTestDatabase,
	TEST_USER,
} from "@/__fixtures__/test-utils";
import { appRouter } from "../../router";

function validGraph(): EconomyGraph {
	return {
		id: "test-economy",
		resourceTypes: ["gold"],
		nodes: [
			{ id: "src", type: "source", label: "Gold Mine", resourceType: "gold" },
			{
				id: "pool",
				type: "pool",
				label: "Treasury",
				resourceType: "gold",
				capacity: 100,
				initialValue: 10,
			},
		],
		edges: [{ id: "e1", type: "resource", from: "src", to: "pool" }],
	};
}

function invalidGraph(): EconomyGraph {
	return {
		id: "bad-economy",
		resourceTypes: ["gold"],
		nodes: [
			{ id: "src", type: "source", label: "Gold Mine", resourceType: "gold" },
			{
				id: "pool",
				type: "pool",
				label: "Treasury",
				resourceType: "gold",
				capacity: -5,
				initialValue: 0,
			},
		],
		edges: [
			{ id: "e1", type: "resource", from: "src", to: "nonexistent" },
			{ id: "e2", type: "resource", from: "loop", to: "loop" },
		],
	};
}

describe("Economy Graph Router", () => {
	beforeAll(async () => {
		await initTestDatabase();
		await createTestUser(TEST_USER);
	});

	describe("validateGraph", () => {
		it("returns valid for a correct economy graph", async () => {
			const ctx = createAuthenticatedContext(TEST_USER);
			const caller = appRouter.createCaller(ctx);

			const result = await caller.economyGraph.validateGraph({
				graph: validGraph(),
			});

			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it("returns errors for an invalid economy graph", async () => {
			const ctx = createAuthenticatedContext(TEST_USER);
			const caller = appRouter.createCaller(ctx);

			const result = await caller.economyGraph.validateGraph({
				graph: invalidGraph(),
			});

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(
				result.errors.some(
					(e: { code: string }) => e.code === "E_MISSING_NODE_REF",
				),
			).toBe(true);
		});

		it("returns error for graph with duplicate node ids", async () => {
			const ctx = createAuthenticatedContext(TEST_USER);
			const caller = appRouter.createCaller(ctx);

			const graph: EconomyGraph = {
				id: "dup-graph",
				resourceTypes: ["gold"],
				nodes: [
					{ id: "n1", type: "source", label: "Source 1", resourceType: "gold" },
					{ id: "n1", type: "drain", label: "Drain 1", resourceType: "gold" },
				],
				edges: [],
			};

			const result = await caller.economyGraph.validateGraph({ graph });

			expect(result.valid).toBe(false);
			expect(
				result.errors.some(
					(e: { code: string }) => e.code === "E_DUPLICATE_NODE_ID",
				),
			).toBe(true);
		});
	});

	describe("simulate", () => {
		it("runs simulation and returns results", async () => {
			const ctx = createAuthenticatedContext(TEST_USER);
			const caller = appRouter.createCaller(ctx);

			const result = await caller.economyGraph.simulate({
				graph: validGraph(),
				ticks: 5,
				seed: 42,
			});

			expect(result.results).toHaveLength(5);
			expect(result.results[0]).toHaveProperty("tick");
			expect(result.results[0]).toHaveProperty("transfers");
			expect(result.results[0]).toHaveProperty("state");
			expect(result.results[0]).toHaveProperty("events");
		});

		it("rejects invalid graph for simulation", async () => {
			const ctx = createAuthenticatedContext(TEST_USER);
			const caller = appRouter.createCaller(ctx);

			const emptyGraph: EconomyGraph = {
				id: "empty",
				resourceTypes: ["gold"],
				nodes: [],
				edges: [],
			};

			await expect(
				caller.economyGraph.simulate({
					graph: emptyGraph,
					ticks: 5,
					seed: 42,
				}),
			).rejects.toThrow();
		});

		it("returns deterministic results with same seed", async () => {
			const ctx = createAuthenticatedContext(TEST_USER);
			const caller = appRouter.createCaller(ctx);

			const input = { graph: validGraph(), ticks: 10, seed: 123 };

			const result1 = await caller.economyGraph.simulate(input);
			const result2 = await caller.economyGraph.simulate(input);

			expect(result1.results).toEqual(result2.results);
		});

		it("limits ticks to maximum of 1000", async () => {
			const ctx = createAuthenticatedContext(TEST_USER);
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.economyGraph.simulate({
					graph: validGraph(),
					ticks: 1001,
					seed: 42,
				}),
			).rejects.toThrow();
		});
	});
});

describe("Games Router - Economy Validation Integration", () => {
	beforeAll(async () => {
		await initTestDatabase();
		await createTestUser(TEST_USER);
	});

	describe("validateDefinition", () => {
		it("includes economy validation errors for invalid economy graph", async () => {
			const ctx = createPublicContext();
			const caller = appRouter.createCaller(ctx);

			const gameDef = {
				metadata: { title: "Test", description: "Test game" },
				economy: {
					id: "bad-economy",
					resourceTypes: ["gold"],
					nodes: [
						{
							id: "src",
							type: "source",
							label: "Mine",
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
				},
			};

			const result = await caller.games.validateDefinition({
				gameDefinition: JSON.stringify(gameDef),
			});

			expect(result.economyValidation).toBeDefined();
			expect(result.economyValidation!.valid).toBe(false);
			expect(result.economyValidation!.errors.length).toBeGreaterThan(0);
		});

		it("returns valid economy validation for valid economy graph", async () => {
			const ctx = createPublicContext();
			const caller = appRouter.createCaller(ctx);

			const gameDef = {
				metadata: { title: "Test", description: "Test game" },
				economy: validGraph(),
			};

			const result = await caller.games.validateDefinition({
				gameDefinition: JSON.stringify(gameDef),
			});

			expect(result.economyValidation).toBeDefined();
			expect(result.economyValidation!.valid).toBe(true);
			expect(result.economyValidation!.errors).toEqual([]);
		});

		it("returns null economy validation when no economy graph present", async () => {
			const ctx = createPublicContext();
			const caller = appRouter.createCaller(ctx);

			const gameDef = {
				metadata: { title: "Test", description: "Test game" },
			};

			const result = await caller.games.validateDefinition({
				gameDefinition: JSON.stringify(gameDef),
			});

			expect(result.economyValidation).toBeNull();
		});
	});
});
