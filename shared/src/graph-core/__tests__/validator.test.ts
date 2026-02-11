import { describe, expect, it } from "vitest";
import { createEmptyDocument } from "../commands";
import type { GraphEdge, GraphNode } from "../types";
import { validateDocument, validateEdge } from "../validator";

function makeNode(id: string): GraphNode {
	return {
		id,
		type: "generic",
		position: { x: 0, y: 0 },
		ports: [
			{ id: `${id}-out`, direction: "output", dataType: "any" },
			{ id: `${id}-in`, direction: "input", dataType: "any" },
		],
		data: {},
	};
}

function makeEdge(id: string, fromNode: string, toNode: string): GraphEdge {
	return {
		id,
		from: { nodeId: fromNode, portId: `${fromNode}-out` },
		to: { nodeId: toNode, portId: `${toNode}-in` },
	};
}

describe("validateDocument", () => {
	it("returns no errors for a valid empty document", () => {
		const doc = createEmptyDocument("doc");
		const result = validateDocument(doc);
		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("returns no errors for valid document with nodes and edges", () => {
		const doc = createEmptyDocument("doc");
		doc.nodes["n1"] = makeNode("n1");
		doc.nodes["n2"] = makeNode("n2");
		doc.edges["e1"] = makeEdge("e1", "n1", "n2");

		const result = validateDocument(doc);
		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("detects dangling edge references (missing source node)", () => {
		const doc = createEmptyDocument("doc");
		doc.nodes["n2"] = makeNode("n2");
		doc.edges["e1"] = makeEdge("e1", "n1", "n2");

		const result = validateDocument(doc);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(
			expect.objectContaining({ code: "DANGLING_EDGE", edgeId: "e1" }),
		);
	});

	it("detects dangling edge references (missing target node)", () => {
		const doc = createEmptyDocument("doc");
		doc.nodes["n1"] = makeNode("n1");
		doc.edges["e1"] = makeEdge("e1", "n1", "n2");

		const result = validateDocument(doc);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(
			expect.objectContaining({ code: "DANGLING_EDGE", edgeId: "e1" }),
		);
	});

	it("detects missing port on source node", () => {
		const doc = createEmptyDocument("doc");
		doc.nodes["n1"] = makeNode("n1");
		doc.nodes["n2"] = makeNode("n2");
		doc.edges["e1"] = {
			id: "e1",
			from: { nodeId: "n1", portId: "nonexistent" },
			to: { nodeId: "n2", portId: "n2-in" },
		};

		const result = validateDocument(doc);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(
			expect.objectContaining({ code: "MISSING_PORT" }),
		);
	});

	it("detects missing port on target node", () => {
		const doc = createEmptyDocument("doc");
		doc.nodes["n1"] = makeNode("n1");
		doc.nodes["n2"] = makeNode("n2");
		doc.edges["e1"] = {
			id: "e1",
			from: { nodeId: "n1", portId: "n1-out" },
			to: { nodeId: "n2", portId: "nonexistent" },
		};

		const result = validateDocument(doc);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(
			expect.objectContaining({ code: "MISSING_PORT" }),
		);
	});

	it("detects node id mismatch in record key", () => {
		const doc = createEmptyDocument("doc");
		const node = makeNode("n1");
		doc.nodes["wrong-key"] = node;

		const result = validateDocument(doc);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(
			expect.objectContaining({ code: "ID_MISMATCH" }),
		);
	});

	it("detects edge id mismatch in record key", () => {
		const doc = createEmptyDocument("doc");
		doc.nodes["n1"] = makeNode("n1");
		doc.nodes["n2"] = makeNode("n2");
		const edge = makeEdge("e1", "n1", "n2");
		doc.edges["wrong-key"] = edge;

		const result = validateDocument(doc);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(
			expect.objectContaining({ code: "ID_MISMATCH" }),
		);
	});

	it("detects self-loops", () => {
		const doc = createEmptyDocument("doc");
		const node = makeNode("n1");
		doc.nodes["n1"] = node;
		doc.edges["e1"] = {
			id: "e1",
			from: { nodeId: "n1", portId: "n1-out" },
			to: { nodeId: "n1", portId: "n1-in" },
		};

		const result = validateDocument(doc);
		expect(result.valid).toBe(false);
		expect(result.errors).toContainEqual(
			expect.objectContaining({ code: "SELF_LOOP", edgeId: "e1" }),
		);
	});
});

describe("validateEdge", () => {
	it("returns valid for correct edge", () => {
		const doc = createEmptyDocument("doc");
		doc.nodes["n1"] = makeNode("n1");
		doc.nodes["n2"] = makeNode("n2");
		const edge = makeEdge("e1", "n1", "n2");

		const result = validateEdge(doc, edge);
		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("returns errors for invalid edge", () => {
		const doc = createEmptyDocument("doc");
		const edge = makeEdge("e1", "n1", "n2");

		const result = validateEdge(doc, edge);
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});
});
