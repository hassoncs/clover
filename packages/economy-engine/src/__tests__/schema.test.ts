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
import {
	EconomyEdgeSchema,
	EconomyGraphSchema,
	EconomyNodeSchema,
	validateEconomyGraph,
} from "../schemas";
import type {
	EconomyEdge,
	EconomyEdgeType,
	EconomyGraph,
	EconomyNode,
	EconomyNodeType,
} from "../types";

describe("EconomyNodeSchema", () => {
	it("accepts a valid pool node", () => {
		const node: EconomyNode = {
			id: "gold-pool",
			type: "pool",
			label: "Gold",
			resourceType: "gold",
			capacity: 100,
			initialValue: 0,
		};
		const result = EconomyNodeSchema.safeParse(node);
		expect(result.success).toBe(true);
	});

	it("accepts a valid source node", () => {
		const node: EconomyNode = {
			id: "gold-mine",
			type: "source",
			label: "Gold Mine",
			resourceType: "gold",
		};
		const result = EconomyNodeSchema.safeParse(node);
		expect(result.success).toBe(true);
	});

	it("accepts a valid drain node", () => {
		const node: EconomyNode = {
			id: "shop",
			type: "drain",
			label: "Shop",
			resourceType: "gold",
		};
		const result = EconomyNodeSchema.safeParse(node);
		expect(result.success).toBe(true);
	});

	it("accepts a valid gate node", () => {
		const node: EconomyNode = {
			id: "luck-gate",
			type: "gate",
			label: "Luck Gate",
			resourceType: "gold",
			mode: "probabilistic",
		};
		const result = EconomyNodeSchema.safeParse(node);
		expect(result.success).toBe(true);
	});

	it("accepts a valid converter node", () => {
		const node: EconomyNode = {
			id: "smelter",
			type: "converter",
			label: "Smelter",
			inputResourceType: "ore",
			outputResourceType: "gold",
			rate: 2,
		};
		const result = EconomyNodeSchema.safeParse(node);
		expect(result.success).toBe(true);
	});

	it("rejects node with missing id", () => {
		const result = EconomyNodeSchema.safeParse({
			type: "pool",
			label: "Gold",
			resourceType: "gold",
		});
		expect(result.success).toBe(false);
	});

	it("rejects node with invalid type", () => {
		const result = EconomyNodeSchema.safeParse({
			id: "x",
			type: "invalid",
			label: "X",
			resourceType: "gold",
		});
		expect(result.success).toBe(false);
	});
});

describe("EconomyEdgeSchema", () => {
	it("accepts a valid resource edge", () => {
		const edge: EconomyEdge = {
			id: "e1",
			type: "resource",
			from: "gold-mine",
			to: "gold-pool",
			formula: "5",
		};
		const result = EconomyEdgeSchema.safeParse(edge);
		expect(result.success).toBe(true);
	});

	it("accepts a valid state edge", () => {
		const edge: EconomyEdge = {
			id: "e2",
			type: "state",
			from: "trigger",
			to: "gold-mine",
		};
		const result = EconomyEdgeSchema.safeParse(edge);
		expect(result.success).toBe(true);
	});

	it("accepts edge with probability", () => {
		const edge: EconomyEdge = {
			id: "e3",
			type: "resource",
			from: "luck-gate",
			to: "gold-pool",
			probability: 0.5,
		};
		const result = EconomyEdgeSchema.safeParse(edge);
		expect(result.success).toBe(true);
	});

	it("rejects edge with probability > 1", () => {
		const result = EconomyEdgeSchema.safeParse({
			id: "e3",
			type: "resource",
			from: "a",
			to: "b",
			probability: 1.5,
		});
		expect(result.success).toBe(false);
	});

	it("rejects edge with probability < 0", () => {
		const result = EconomyEdgeSchema.safeParse({
			id: "e3",
			type: "resource",
			from: "a",
			to: "b",
			probability: -0.1,
		});
		expect(result.success).toBe(false);
	});

	it("rejects edge with missing from", () => {
		const result = EconomyEdgeSchema.safeParse({
			id: "e1",
			type: "resource",
			to: "gold-pool",
		});
		expect(result.success).toBe(false);
	});
});

describe("EconomyGraphSchema", () => {
	it("accepts a valid minimal graph", () => {
		const graph: EconomyGraph = {
			id: "test-economy",
			resourceTypes: ["gold"],
			nodes: [makeSource("mine", "gold"), makePool("stash", "gold")],
			edges: [makeResourceEdge("e1", "mine", "stash", "1")],
		};
		const result = EconomyGraphSchema.safeParse(graph);
		expect(result.success).toBe(true);
	});

	it("rejects graph with empty nodes", () => {
		const result = EconomyGraphSchema.safeParse({
			id: "empty",
			resourceTypes: ["gold"],
			nodes: [],
			edges: [],
		});
		expect(result.success).toBe(false);
	});

	it("rejects graph with empty resourceTypes", () => {
		const result = EconomyGraphSchema.safeParse({
			id: "empty",
			resourceTypes: [],
			nodes: [makeSource("mine", "gold")],
			edges: [],
		});
		expect(result.success).toBe(false);
	});
});

describe("validateEconomyGraph", () => {
	it("returns valid for a correct graph", () => {
		const graph = makeGraph(
			[makeSource("mine", "gold"), makePool("stash", "gold")],
			[makeResourceEdge("e1", "mine", "stash", "1")],
			["gold"],
		);
		const result = validateEconomyGraph(graph);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("detects duplicate node ids (E_DUPLICATE_NODE_ID)", () => {
		const graph = makeGraph(
			[makeSource("mine", "gold"), makeSource("mine", "gold")],
			[],
			["gold"],
		);
		const result = validateEconomyGraph(graph);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.code === "E_DUPLICATE_NODE_ID")).toBe(
			true,
		);
	});

	it("detects missing node refs in edges (E_MISSING_NODE_REF)", () => {
		const graph = makeGraph(
			[makeSource("mine", "gold")],
			[makeResourceEdge("e1", "mine", "nonexistent", "1")],
			["gold"],
		);
		const result = validateEconomyGraph(graph);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.code === "E_MISSING_NODE_REF")).toBe(
			true,
		);
	});

	it("detects self-loop edges (E_SELF_LOOP)", () => {
		const graph = makeGraph(
			[makePool("p1", "gold")],
			[makeResourceEdge("e1", "p1", "p1", "1")],
			["gold"],
		);
		const result = validateEconomyGraph(graph);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.code === "E_SELF_LOOP")).toBe(true);
	});

	it("detects duplicate edge ids (E_DUPLICATE_EDGE_ID)", () => {
		const graph = makeGraph(
			[makeSource("s", "gold"), makePool("p", "gold"), makeDrain("d", "gold")],
			[
				makeResourceEdge("e1", "s", "p", "1"),
				makeResourceEdge("e1", "p", "d", "1"),
			],
			["gold"],
		);
		const result = validateEconomyGraph(graph);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.code === "E_DUPLICATE_EDGE_ID")).toBe(
			true,
		);
	});

	it("detects unknown resource types (E_UNKNOWN_RESOURCE_TYPE)", () => {
		const graph = makeGraph([makeSource("mine", "gems")], [], ["gold"]);
		const result = validateEconomyGraph(graph);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.code === "E_UNKNOWN_RESOURCE_TYPE"),
		).toBe(true);
	});

	it("detects negative pool capacity (E_INVALID_CAPACITY)", () => {
		const pool = makePool("p1", "gold");
		pool.capacity = -5;
		const graph = makeGraph([pool], [], ["gold"]);
		const result = validateEconomyGraph(graph);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.code === "E_INVALID_CAPACITY")).toBe(
			true,
		);
	});

	it("detects gate probability sum > 1 (E_INVALID_GATE_PROBABILITY)", () => {
		const graph = makeGraph(
			[makeGate("g1", "gold"), makePool("p1", "gold"), makePool("p2", "gold")],
			[
				{
					id: "e1",
					type: "resource" as const,
					from: "g1",
					to: "p1",
					probability: 0.8,
				},
				{
					id: "e2",
					type: "resource" as const,
					from: "g1",
					to: "p2",
					probability: 0.5,
				},
			],
			["gold"],
		);
		const result = validateEconomyGraph(graph);
		expect(result.valid).toBe(false);
		expect(
			result.errors.some((e) => e.code === "E_INVALID_GATE_PROBABILITY"),
		).toBe(true);
	});
});
