import { describe, expect, it } from "vitest";
import {
	makeConverter,
	makeDrain,
	makeGate,
	makeGraph,
	makePool,
	makeResourceEdge,
	makeSource,
	makeStateEdge,
} from "../fixtures";
import { EconomyGraphSchema, validateEconomyGraph } from "../schemas";
import { EconomySimulator } from "../simulator";
import type { EconomyGraph } from "../types";

function simpleEconomy(): EconomyGraph {
	return makeGraph(
		[
			makeSource("gold-mine", "gold"),
			makePool("treasury", "gold", 100),
			makeDrain("shop", "gold"),
		],
		[
			makeResourceEdge("mine-to-treasury", "gold-mine", "treasury", "5"),
			makeResourceEdge("treasury-to-shop", "treasury", "shop", "2"),
		],
		["gold"],
	);
}

function craftingEconomy(): EconomyGraph {
	return makeGraph(
		[
			makeSource("ore-vein", "ore"),
			makeSource("wood-grove", "wood"),
			makePool("ore-stock", "ore", 50),
			makePool("wood-stock", "wood", 50),
			makeConverter("forge", "ore", "ingot", 2),
			makePool("ingot-stock", "ingot", 30),
			makeConverter("workshop", "wood", "plank", 3),
			makePool("plank-stock", "plank", 40),
		],
		[
			makeResourceEdge("ore-gather", "ore-vein", "ore-stock", "3"),
			makeResourceEdge("wood-gather", "wood-grove", "wood-stock", "4"),
			makeResourceEdge("ore-to-forge", "ore-stock", "forge", "2"),
			makeResourceEdge("forge-to-ingot", "forge", "ingot-stock", "1"),
			makeResourceEdge("wood-to-workshop", "wood-stock", "workshop", "3"),
			makeResourceEdge("workshop-to-plank", "workshop", "plank-stock", "1"),
		],
		["ore", "wood", "ingot", "plank"],
	);
}

function gamblingEconomy(): EconomyGraph {
	return makeGraph(
		[
			makeSource("coin-press", "coins"),
			makePool("wallet", "coins", 200),
			makeGate("slot-machine", "coins"),
			makePool("jackpot", "coins", 500),
			makePool("house", "coins"),
			makeDrain("tax", "coins"),
		],
		[
			makeResourceEdge("mint", "coin-press", "wallet", "10"),
			makeResourceEdge("bet", "wallet", "slot-machine", "5"),
			{
				id: "win",
				type: "resource",
				from: "slot-machine",
				to: "jackpot",
				probability: 0.3,
			},
			{
				id: "lose",
				type: "resource",
				from: "slot-machine",
				to: "house",
				probability: 0.7,
			},
			makeResourceEdge("house-tax", "house", "tax", "1"),
		],
		["coins"],
	);
}

describe("Integration: Full Economy Pipeline", () => {
	describe("Simple economy (source -> pool -> drain)", () => {
		const graph = simpleEconomy();

		it("passes schema validation", () => {
			const result = EconomyGraphSchema.safeParse(graph);
			expect(result.success).toBe(true);
		});

		it("passes graph validation with no errors", () => {
			const result = validateEconomyGraph(graph);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("simulates deterministically with fixed seed", () => {
			const runA = new EconomySimulator(graph, 42).run(20);
			const runB = new EconomySimulator(graph, 42).run(20);
			expect(runA).toEqual(runB);
		});

		it("produces expected resource flow over 10 ticks", () => {
			const sim = new EconomySimulator(graph, 1);
			const results = sim.run(10);

			expect(results).toHaveLength(10);

			for (const r of results) {
				expect(r).toHaveProperty("tick");
				expect(r).toHaveProperty("transfers");
				expect(r).toHaveProperty("state");
				expect(r).toHaveProperty("events");
			}

			const finalState = sim.getState();
			expect(finalState.nodeValues.treasury).toBeGreaterThanOrEqual(0);
			expect(finalState.nodeValues.treasury).toBeLessThanOrEqual(100);
			expect(finalState.nodeValues.shop).toBeGreaterThan(0);
		});

		it("caps pool at capacity", () => {
			const sim = new EconomySimulator(graph, 99);
			sim.run(50);
			const state = sim.getState();
			expect(state.nodeValues.treasury).toBeLessThanOrEqual(100);
		});
	});

	describe("Crafting economy (multi-resource with converters)", () => {
		const graph = craftingEconomy();

		it("passes schema validation", () => {
			const result = EconomyGraphSchema.safeParse(graph);
			expect(result.success).toBe(true);
		});

		it("passes graph validation with no errors", () => {
			const result = validateEconomyGraph(graph);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("simulates deterministically with fixed seed", () => {
			const runA = new EconomySimulator(graph, 777).run(30);
			const runB = new EconomySimulator(graph, 777).run(30);
			expect(runA).toEqual(runB);
		});

		it("converter produces output from input resources", () => {
			const sim = new EconomySimulator(graph, 42);
			sim.run(15);
			const state = sim.getState();

			expect(state.nodeValues["ingot-stock"]).toBeGreaterThan(0);
			expect(state.nodeValues["plank-stock"]).toBeGreaterThan(0);
		});

		it("all resource types flow through the system", () => {
			const sim = new EconomySimulator(graph, 42);
			const results = sim.run(20);

			const allTransferEdges = new Set<string>();
			for (const r of results) {
				for (const t of r.transfers) {
					allTransferEdges.add(t.edgeId);
				}
			}

			expect(allTransferEdges.has("ore-gather")).toBe(true);
			expect(allTransferEdges.has("wood-gather")).toBe(true);
			expect(allTransferEdges.has("ore-to-forge")).toBe(true);
			expect(allTransferEdges.has("forge-to-ingot")).toBe(true);
		});

		it("respects pool capacities across all resources", () => {
			const sim = new EconomySimulator(graph, 42);
			sim.run(50);
			const state = sim.getState();

			expect(state.nodeValues["ore-stock"]).toBeLessThanOrEqual(50);
			expect(state.nodeValues["wood-stock"]).toBeLessThanOrEqual(50);
			expect(state.nodeValues["ingot-stock"]).toBeLessThanOrEqual(30);
			expect(state.nodeValues["plank-stock"]).toBeLessThanOrEqual(40);
		});
	});

	describe("Gambling economy (probabilistic gates)", () => {
		const graph = gamblingEconomy();

		it("passes schema validation", () => {
			const result = EconomyGraphSchema.safeParse(graph);
			expect(result.success).toBe(true);
		});

		it("passes graph validation with no errors", () => {
			const result = validateEconomyGraph(graph);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("simulates deterministically with fixed seed", () => {
			const runA = new EconomySimulator(graph, 31415).run(50);
			const runB = new EconomySimulator(graph, 31415).run(50);
			expect(runA).toEqual(runB);
		});

		it("distributes resources through gate probabilistically", () => {
			const sim = new EconomySimulator(graph, 31415);
			sim.run(50);
			const state = sim.getState();

			expect(state.nodeValues.jackpot).toBeGreaterThan(0);
			expect(state.nodeValues.house).toBeGreaterThanOrEqual(0);
		});

		it("produces different distributions with different seeds", () => {
			const simA = new EconomySimulator(graph, 111);
			simA.run(100);
			const stateA = simA.getState();

			const simB = new EconomySimulator(graph, 999);
			simB.run(100);
			const stateB = simB.getState();

			const jackpotsDiffer =
				stateA.nodeValues.jackpot !== stateB.nodeValues.jackpot;
			const houseDiffers = stateA.nodeValues.house !== stateB.nodeValues.house;
			expect(jackpotsDiffer || houseDiffers).toBe(true);
		});

		it("emits gate_routed events during simulation", () => {
			const sim = new EconomySimulator(graph, 42);
			const results = sim.run(20);

			const gateEvents = results.flatMap((r) =>
				r.events.filter((e) => e.type === "gate_routed"),
			);
			expect(gateEvents.length).toBeGreaterThan(0);
		});
	});

	describe("Cross-archetype determinism verification", () => {
		const archetypes = [
			{ name: "simple", graph: simpleEconomy() },
			{ name: "crafting", graph: craftingEconomy() },
			{ name: "gambling", graph: gamblingEconomy() },
		];

		for (const { name, graph } of archetypes) {
			it(`${name}: 100 tick runs are bitwise identical across 5 replays`, () => {
				const baseline = new EconomySimulator(graph, 12345).run(100);

				for (let i = 0; i < 4; i++) {
					const replay = new EconomySimulator(graph, 12345).run(100);
					expect(replay).toEqual(baseline);
				}
			});
		}
	});

	describe("Validation rejects invalid graphs before simulation", () => {
		it("rejects graph with duplicate node IDs", () => {
			const graph = makeGraph(
				[makeSource("dup", "gold"), makeSource("dup", "gold")],
				[],
				["gold"],
			);
			const result = validateEconomyGraph(graph);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === "E_DUPLICATE_NODE_ID")).toBe(
				true,
			);
		});

		it("rejects graph with dangling edge references", () => {
			const graph = makeGraph(
				[makeSource("a", "gold")],
				[makeResourceEdge("e1", "a", "nonexistent", "1")],
				["gold"],
			);
			const result = validateEconomyGraph(graph);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === "E_MISSING_NODE_REF")).toBe(
				true,
			);
		});

		it("rejects graph with self-loop", () => {
			const graph = makeGraph(
				[makePool("p", "gold")],
				[makeResourceEdge("e1", "p", "p", "1")],
				["gold"],
			);
			const result = validateEconomyGraph(graph);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === "E_SELF_LOOP")).toBe(true);
		});

		it("rejects graph with unknown resource type", () => {
			const graph = makeGraph([makeSource("s", "gems")], [], ["gold"]);
			const result = validateEconomyGraph(graph);
			expect(result.valid).toBe(false);
			expect(
				result.errors.some((e) => e.code === "E_UNKNOWN_RESOURCE_TYPE"),
			).toBe(true);
		});
	});

	describe("Simulation analysis properties", () => {
		it("tick count increments monotonically", () => {
			const graph = simpleEconomy();
			const results = new EconomySimulator(graph, 1).run(20);

			for (let i = 0; i < results.length; i++) {
				expect(results[i].tick).toBe(i + 1);
			}
		});

		it("no negative node values appear in any tick", () => {
			const graphs = [simpleEconomy(), craftingEconomy(), gamblingEconomy()];

			for (const graph of graphs) {
				const results = new EconomySimulator(graph, 42).run(50);
				for (const r of results) {
					for (const [, value] of Object.entries(r.state.nodeValues)) {
						expect(value).toBeGreaterThanOrEqual(0);
					}
				}
			}
		});

		it("transfers always have positive amounts", () => {
			const graphs = [simpleEconomy(), craftingEconomy(), gamblingEconomy()];

			for (const graph of graphs) {
				const results = new EconomySimulator(graph, 42).run(50);
				for (const r of results) {
					for (const t of r.transfers) {
						expect(t.amount).toBeGreaterThan(0);
					}
				}
			}
		});
	});
});
