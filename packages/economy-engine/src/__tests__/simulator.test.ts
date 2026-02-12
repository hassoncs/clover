import { describe, expect, it } from "vitest";
import {
	makeConverter,
	makeDrain,
	makeGate,
	makeGraph,
	makePool,
	makeResourceEdge,
	makeSource,
} from "../fixtures";
import { EconomySimulator } from "../simulator";

describe("EconomySimulator determinism", () => {
	it("produces identical runs for the same seed", () => {
		const graph = makeGraph(
			[
				makeSource("source", "gold"),
				makeGate("gate", "gold"),
				makePool("p1", "gold"),
				makePool("p2", "gold"),
			],
			[
				makeResourceEdge("s-g", "source", "gate", "2"),
				{
					id: "g-p1",
					type: "resource",
					from: "gate",
					to: "p1",
					probability: 0.25,
				},
				{
					id: "g-p2",
					type: "resource",
					from: "gate",
					to: "p2",
					probability: 0.75,
				},
			],
			["gold"],
		);

		const runA = new EconomySimulator(graph, 1234).run(6);
		const runB = new EconomySimulator(graph, 1234).run(6);

		expect(runA).toEqual(runB);
	});

	it("produces different routing outcomes with different seeds", () => {
		const graph = makeGraph(
			[
				makeSource("source", "gold"),
				makeGate("gate", "gold"),
				makePool("p1", "gold"),
				makePool("p2", "gold"),
			],
			[
				makeResourceEdge("s-g", "source", "gate", "1"),
				{
					id: "g-p1",
					type: "resource",
					from: "gate",
					to: "p1",
					probability: 0.5,
				},
				{
					id: "g-p2",
					type: "resource",
					from: "gate",
					to: "p2",
					probability: 0.5,
				},
			],
			["gold"],
		);

		const runA = new EconomySimulator(graph, 111).run(20);
		const runB = new EconomySimulator(graph, 222).run(20);

		expect(runA).not.toEqual(runB);
	});
});

describe("EconomySimulator node behavior", () => {
	it("source generates and pool stores with capacity cap", () => {
		const source = makeSource("source", "gold");
		const pool = makePool("pool", "gold", 3);
		const graph = makeGraph(
			[source, pool],
			[makeResourceEdge("s-p", "source", "pool", "2")],
			["gold"],
		);

		const simulator = new EconomySimulator(graph, 99);
		simulator.run(3);

		const state = simulator.getState();
		expect(state.nodeValues.pool).toBe(3);
	});

	it("drain consumes resources from connected pool", () => {
		const source = makeSource("source", "gold");
		const pool = makePool("pool", "gold", 10);
		const drain = makeDrain("drain", "gold");
		const graph = makeGraph(
			[source, pool, drain],
			[
				makeResourceEdge("s-p", "source", "pool", "4"),
				makeResourceEdge("p-d", "pool", "drain", "2"),
			],
			["gold"],
		);

		const simulator = new EconomySimulator(graph, 7);
		simulator.run(2);

		const state = simulator.getState();
		expect(state.nodeValues.pool).toBe(6);
		expect(state.nodeValues.drain).toBe(2);
	});

	it("converter transforms input to output at configured rate", () => {
		const source = makeSource("ore-source", "ore");
		const converter = makeConverter("smelter", "ore", "gold", 2);
		const pool = makePool("gold-pool", "gold", 20);
		const graph = makeGraph(
			[source, converter, pool],
			[
				makeResourceEdge("ore-feed", "ore-source", "smelter", "4"),
				makeResourceEdge("gold-out", "smelter", "gold-pool", "3"),
			],
			["ore", "gold"],
		);

		const simulator = new EconomySimulator(graph, 11);
		simulator.run(3);

		const state = simulator.getState();
		expect(state.nodeValues.smelter).toBe(8);
		expect(state.nodeValues["gold-pool"]).toBe(4);
	});

	it("evaluates expressions using tick and node scopes", () => {
		const source = makeSource("source", "gold");
		const pool = makePool("pool", "gold", 20);
		const graph = makeGraph(
			[source, pool],
			[makeResourceEdge("s-p", "source", "pool", "tick + 1")],
			["gold"],
		);

		const simulator = new EconomySimulator(graph, 5);
		simulator.run(3);

		expect(simulator.getState().nodeValues.pool).toBe(6);
	});

	it("reduces transfer when destination pool is near capacity", () => {
		const source = makeSource("source", "gold");
		const pool = makePool("pool", "gold", 3);
		const graph = makeGraph(
			[source, pool],
			[makeResourceEdge("s-p", "source", "pool", "10")],
			["gold"],
		);

		const result = new EconomySimulator(graph, 9).tick();

		expect(result.transfers).toEqual([
			{
				edgeId: "s-p",
				from: "source",
				to: "pool",
				amount: 3,
			},
		]);
		expect(result.state.nodeValues.pool).toBe(3);
		expect(result.events.some((event) => event.type === "pool_full")).toBe(
			true,
		);
	});
});

describe("EconomySimulator gates", () => {
	it("routes to outputs probabilistically with seeded RNG", () => {
		const source = makeSource("source", "gold");
		const gate = makeGate("gate", "gold");
		const p1 = makePool("p1", "gold");
		const p2 = makePool("p2", "gold");
		const graph = makeGraph(
			[source, gate, p1, p2],
			[
				makeResourceEdge("s-g", "source", "gate", "1"),
				{
					id: "g-p1",
					type: "resource",
					from: "gate",
					to: "p1",
					probability: 0.5,
				},
				{
					id: "g-p2",
					type: "resource",
					from: "gate",
					to: "p2",
					probability: 0.5,
				},
			],
			["gold"],
		);

		const simulator = new EconomySimulator(graph, 31415);
		simulator.run(10);
		const state = simulator.getState();

		expect(
			state.nodeValues.p1 + state.nodeValues.p2 + state.nodeValues.gate,
		).toBe(10);
		expect(state.nodeValues.p1).toBeGreaterThan(0);
		expect(state.nodeValues.p2).toBeGreaterThan(0);
	});
});

describe("EconomySimulator cycle/deadlock detection", () => {
	it("emits cycle_detected for cyclic resource graphs", () => {
		const a = makePool("a", "gold", 10);
		const b = makePool("b", "gold", 10);
		a.initialValue = 2;
		const graph = makeGraph(
			[a, b],
			[
				makeResourceEdge("a-b", "a", "b", "1"),
				makeResourceEdge("b-a", "b", "a", "1"),
			],
			["gold"],
		);

		const result = new EconomySimulator(graph, 1).tick();

		expect(result.events.some((event) => event.type === "cycle_detected")).toBe(
			true,
		);
	});

	it("emits deadlock event when no transfers are possible", () => {
		const a = makePool("a", "gold");
		const b = makePool("b", "gold");
		const graph = makeGraph(
			[a, b],
			[
				makeResourceEdge("a-b", "a", "b", "1"),
				makeResourceEdge("b-a", "b", "a", "1"),
			],
			["gold"],
		);

		const simulator = new EconomySimulator(graph, 1);
		const result = simulator.tick();

		expect(result.transfers).toHaveLength(0);
		expect(result.events.some((event) => event.type === "cycle_detected")).toBe(
			true,
		);
		expect(
			result.events.some((event) => event.type === "deadlock_detected"),
		).toBe(true);
	});
});
