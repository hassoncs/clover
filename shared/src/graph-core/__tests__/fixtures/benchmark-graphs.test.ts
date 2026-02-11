import { describe, expect, it } from "vitest";
import { validateDocument } from "../../validator";
import { generateBenchmarkGraph } from "./benchmark-graphs";

describe("generateBenchmarkGraph", () => {
	it("generates valid graph with 20 nodes", () => {
		const graph = generateBenchmarkGraph(20);

		expect(Object.keys(graph.nodes)).toHaveLength(20);
		expect(Object.keys(graph.edges)).toHaveLength(19);

		const result = validateDocument(graph);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("generates valid graph with 50 nodes", () => {
		const graph = generateBenchmarkGraph(50);

		expect(Object.keys(graph.nodes)).toHaveLength(50);
		expect(Object.keys(graph.edges)).toHaveLength(49);

		const result = validateDocument(graph);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("generates valid graph with 100 nodes", () => {
		const graph = generateBenchmarkGraph(100);

		expect(Object.keys(graph.nodes)).toHaveLength(100);
		expect(Object.keys(graph.edges)).toHaveLength(99);

		const result = validateDocument(graph);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("creates chain topology with connected nodes", () => {
		const graph = generateBenchmarkGraph(5);

		expect(graph.edges["edge-0"].from.nodeId).toBe("node-0");
		expect(graph.edges["edge-0"].to.nodeId).toBe("node-1");

		expect(graph.edges["edge-1"].from.nodeId).toBe("node-1");
		expect(graph.edges["edge-1"].to.nodeId).toBe("node-2");

		expect(graph.edges["edge-3"].from.nodeId).toBe("node-3");
		expect(graph.edges["edge-3"].to.nodeId).toBe("node-4");
	});

	it("creates nodes with input and output ports", () => {
		const graph = generateBenchmarkGraph(3);

		const node = graph.nodes["node-0"];
		expect(node.ports).toHaveLength(2);

		const inputPort = node.ports.find((p) => p.direction === "input");
		const outputPort = node.ports.find((p) => p.direction === "output");

		expect(inputPort).toBeDefined();
		expect(outputPort).toBeDefined();
		expect(inputPort?.id).toBe("node-0-in");
		expect(outputPort?.id).toBe("node-0-out");
	});

	it("positions nodes in grid layout", () => {
		const graph = generateBenchmarkGraph(9);

		expect(graph.nodes["node-0"].position).toEqual({ x: 0, y: 0 });
		expect(graph.nodes["node-1"].position).toEqual({ x: 200, y: 0 });
		expect(graph.nodes["node-2"].position).toEqual({ x: 400, y: 0 });
		expect(graph.nodes["node-3"].position).toEqual({ x: 0, y: 200 });
		expect(graph.nodes["node-4"].position).toEqual({ x: 200, y: 200 });
	});
});
