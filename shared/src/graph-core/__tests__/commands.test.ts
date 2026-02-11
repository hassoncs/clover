import { describe, expect, it } from "vitest";
import {
	createEmptyDocument,
	createUndoableState,
	executeCommand,
	redo,
	undo,
} from "../commands";
import type {
	GraphCommand,
	GraphEdge,
	GraphNode,
	UndoableState,
} from "../types";

function makeNode(id: string, x = 0, y = 0): GraphNode {
	return {
		id,
		type: "generic",
		position: { x, y },
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

function stateWithNodes(...nodes: GraphNode[]): UndoableState {
	const doc = createEmptyDocument("test-doc");
	for (const node of nodes) {
		doc.nodes[node.id] = node;
	}
	return createUndoableState(doc);
}

describe("createEmptyDocument", () => {
	it("creates a document with empty nodes and edges", () => {
		const doc = createEmptyDocument("doc-1");
		expect(doc.id).toBe("doc-1");
		expect(doc.nodes).toEqual({});
		expect(doc.edges).toEqual({});
		expect(doc.viewport).toEqual({ pan: { x: 0, y: 0 }, zoom: 1 });
	});
});

describe("createUndoableState", () => {
	it("wraps a document with empty history stacks", () => {
		const doc = createEmptyDocument("doc-1");
		const state = createUndoableState(doc);
		expect(state.document).toBe(doc);
		expect(state.past).toEqual([]);
		expect(state.future).toEqual([]);
	});
});

describe("addNode", () => {
	it("adds a node to the document", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const node = makeNode("n1", 10, 20);
		const result = executeCommand(state, { type: "addNode", node });

		expect(result.error).toBeUndefined();
		expect(result.state.document.nodes["n1"]).toEqual(node);
	});

	it("pushes previous state to past for undo", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const node = makeNode("n1");
		const result = executeCommand(state, { type: "addNode", node });

		expect(result.state.past).toHaveLength(1);
		expect(result.state.past[0].nodes).toEqual({});
	});

	it("clears future on new command", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const r1 = executeCommand(state, { type: "addNode", node: makeNode("n1") });
		const r2 = undo(r1.state);
		expect(r2.state.future).toHaveLength(1);

		const r3 = executeCommand(r2.state, {
			type: "addNode",
			node: makeNode("n2"),
		});
		expect(r3.state.future).toEqual([]);
	});

	it("errors when adding node with duplicate id", () => {
		const state = stateWithNodes(makeNode("n1"));
		const result = executeCommand(state, {
			type: "addNode",
			node: makeNode("n1"),
		});

		expect(result.error).toBe("Node n1 already exists");
		expect(result.state).toBe(state);
	});

	it("does not mutate original state", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const originalNodes = { ...state.document.nodes };
		executeCommand(state, { type: "addNode", node: makeNode("n1") });

		expect(state.document.nodes).toEqual(originalNodes);
	});
});

describe("removeNode", () => {
	it("removes an existing node", () => {
		const state = stateWithNodes(makeNode("n1"));
		const result = executeCommand(state, { type: "removeNode", nodeId: "n1" });

		expect(result.error).toBeUndefined();
		expect(result.state.document.nodes["n1"]).toBeUndefined();
	});

	it("removes edges connected to the node", () => {
		const n1 = makeNode("n1");
		const n2 = makeNode("n2");
		const edge = makeEdge("e1", "n1", "n2");
		const state = stateWithNodes(n1, n2);
		state.document.edges["e1"] = edge;

		const result = executeCommand(state, { type: "removeNode", nodeId: "n1" });

		expect(result.error).toBeUndefined();
		expect(result.state.document.nodes["n1"]).toBeUndefined();
		expect(result.state.document.edges["e1"]).toBeUndefined();
		expect(result.state.document.nodes["n2"]).toBeDefined();
	});

	it("errors when node does not exist", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const result = executeCommand(state, { type: "removeNode", nodeId: "n1" });

		expect(result.error).toBe("Node n1 not found");
		expect(result.state).toBe(state);
	});
});

describe("connect", () => {
	it("adds an edge between two nodes", () => {
		const state = stateWithNodes(makeNode("n1"), makeNode("n2"));
		const edge = makeEdge("e1", "n1", "n2");
		const result = executeCommand(state, { type: "connect", edge });

		expect(result.error).toBeUndefined();
		expect(result.state.document.edges["e1"]).toEqual(edge);
	});

	it("errors when source node does not exist", () => {
		const state = stateWithNodes(makeNode("n2"));
		const edge = makeEdge("e1", "n1", "n2");
		const result = executeCommand(state, { type: "connect", edge });

		expect(result.error).toBe("Source node n1 not found");
		expect(result.state).toBe(state);
	});

	it("errors when target node does not exist", () => {
		const state = stateWithNodes(makeNode("n1"));
		const edge = makeEdge("e1", "n1", "n2");
		const result = executeCommand(state, { type: "connect", edge });

		expect(result.error).toBe("Target node n2 not found");
		expect(result.state).toBe(state);
	});

	it("errors when edge id already exists", () => {
		const state = stateWithNodes(makeNode("n1"), makeNode("n2"));
		const edge = makeEdge("e1", "n1", "n2");
		state.document.edges["e1"] = edge;

		const result = executeCommand(state, { type: "connect", edge });
		expect(result.error).toBe("Edge e1 already exists");
	});

	it("errors when source port does not exist", () => {
		const n1 = makeNode("n1");
		const n2 = makeNode("n2");
		const state = stateWithNodes(n1, n2);
		const edge: GraphEdge = {
			id: "e1",
			from: { nodeId: "n1", portId: "nonexistent" },
			to: { nodeId: "n2", portId: "n2-in" },
		};
		const result = executeCommand(state, { type: "connect", edge });
		expect(result.error).toBe("Source port nonexistent not found on node n1");
	});

	it("errors when target port does not exist", () => {
		const n1 = makeNode("n1");
		const n2 = makeNode("n2");
		const state = stateWithNodes(n1, n2);
		const edge: GraphEdge = {
			id: "e1",
			from: { nodeId: "n1", portId: "n1-out" },
			to: { nodeId: "n2", portId: "nonexistent" },
		};
		const result = executeCommand(state, { type: "connect", edge });
		expect(result.error).toBe("Target port nonexistent not found on node n2");
	});
});

describe("disconnect", () => {
	it("removes an existing edge", () => {
		const state = stateWithNodes(makeNode("n1"), makeNode("n2"));
		state.document.edges["e1"] = makeEdge("e1", "n1", "n2");

		const result = executeCommand(state, { type: "disconnect", edgeId: "e1" });

		expect(result.error).toBeUndefined();
		expect(result.state.document.edges["e1"]).toBeUndefined();
	});

	it("errors when edge does not exist", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const result = executeCommand(state, { type: "disconnect", edgeId: "e1" });

		expect(result.error).toBe("Edge e1 not found");
		expect(result.state).toBe(state);
	});
});

describe("moveNode", () => {
	it("updates node position", () => {
		const state = stateWithNodes(makeNode("n1", 0, 0));
		const result = executeCommand(state, {
			type: "moveNode",
			nodeId: "n1",
			position: { x: 100, y: 200 },
		});

		expect(result.error).toBeUndefined();
		expect(result.state.document.nodes["n1"].position).toEqual({
			x: 100,
			y: 200,
		});
	});

	it("errors when node does not exist", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const result = executeCommand(state, {
			type: "moveNode",
			nodeId: "n1",
			position: { x: 100, y: 200 },
		});

		expect(result.error).toBe("Node n1 not found");
	});

	it("does not mutate original node position", () => {
		const state = stateWithNodes(makeNode("n1", 5, 10));
		executeCommand(state, {
			type: "moveNode",
			nodeId: "n1",
			position: { x: 100, y: 200 },
		});

		expect(state.document.nodes["n1"].position).toEqual({ x: 5, y: 10 });
	});
});

describe("pan", () => {
	it("updates viewport pan", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const result = executeCommand(state, {
			type: "pan",
			pan: { x: 50, y: -30 },
		});

		expect(result.error).toBeUndefined();
		expect(result.state.document.viewport.pan).toEqual({ x: 50, y: -30 });
	});
});

describe("zoom", () => {
	it("updates viewport zoom", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const result = executeCommand(state, { type: "zoom", zoom: 2.0 });

		expect(result.error).toBeUndefined();
		expect(result.state.document.viewport.zoom).toBe(2.0);
	});

	it("clamps zoom to minimum 0.1", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const result = executeCommand(state, { type: "zoom", zoom: 0.01 });

		expect(result.state.document.viewport.zoom).toBe(0.1);
	});

	it("clamps zoom to maximum 10", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const result = executeCommand(state, { type: "zoom", zoom: 50 });

		expect(result.state.document.viewport.zoom).toBe(10);
	});
});

describe("updateNodeData", () => {
	it("merges data into existing node", () => {
		const node = makeNode("n1");
		node.data = { color: "red", size: 5 };
		const state = stateWithNodes(node);

		const result = executeCommand(state, {
			type: "updateNodeData",
			nodeId: "n1",
			data: { size: 10, opacity: 0.5 },
		});

		expect(result.error).toBeUndefined();
		expect(result.state.document.nodes["n1"].data).toEqual({
			color: "red",
			size: 10,
			opacity: 0.5,
		});
	});

	it("errors when node does not exist", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const result = executeCommand(state, {
			type: "updateNodeData",
			nodeId: "n1",
			data: { foo: 1 },
		});

		expect(result.error).toBe("Node n1 not found");
	});
});

describe("batch", () => {
	it("executes multiple commands atomically", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const n1 = makeNode("n1", 0, 0);
		const n2 = makeNode("n2", 50, 50);
		const edge = makeEdge("e1", "n1", "n2");

		const result = executeCommand(state, {
			type: "batch",
			commands: [
				{ type: "addNode", node: n1 },
				{ type: "addNode", node: n2 },
				{ type: "connect", edge },
			],
		});

		expect(result.error).toBeUndefined();
		expect(Object.keys(result.state.document.nodes)).toHaveLength(2);
		expect(Object.keys(result.state.document.edges)).toHaveLength(1);
	});

	it("creates single undo entry for batch", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const result = executeCommand(state, {
			type: "batch",
			commands: [
				{ type: "addNode", node: makeNode("n1") },
				{ type: "addNode", node: makeNode("n2") },
			],
		});

		expect(result.state.past).toHaveLength(1);
		const undone = undo(result.state);
		expect(Object.keys(undone.state.document.nodes)).toHaveLength(0);
	});

	it("rolls back on error within batch", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const result = executeCommand(state, {
			type: "batch",
			commands: [
				{ type: "addNode", node: makeNode("n1") },
				{ type: "connect", edge: makeEdge("e1", "n1", "n999") },
			],
		});

		expect(result.error).toBeDefined();
		expect(result.state.document.nodes["n1"]).toBeUndefined();
	});
});

describe("undo/redo", () => {
	it("undoes the last command", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const r1 = executeCommand(state, { type: "addNode", node: makeNode("n1") });
		expect(Object.keys(r1.state.document.nodes)).toHaveLength(1);

		const r2 = undo(r1.state);
		expect(Object.keys(r2.state.document.nodes)).toHaveLength(0);
		expect(r2.state.future).toHaveLength(1);
	});

	it("redoes the last undone command", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const r1 = executeCommand(state, { type: "addNode", node: makeNode("n1") });
		const r2 = undo(r1.state);
		const r3 = redo(r2.state);

		expect(Object.keys(r3.state.document.nodes)).toHaveLength(1);
		expect(r3.state.past).toHaveLength(1);
		expect(r3.state.future).toEqual([]);
	});

	it("returns same state when nothing to undo", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const result = undo(state);

		expect(result.state).toBe(state);
		expect(result.error).toBe("Nothing to undo");
	});

	it("returns same state when nothing to redo", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const result = redo(state);

		expect(result.state).toBe(state);
		expect(result.error).toBe("Nothing to redo");
	});

	it("supports multiple undo/redo cycles", () => {
		const state = createUndoableState(createEmptyDocument("doc"));
		const r1 = executeCommand(state, { type: "addNode", node: makeNode("n1") });
		const r2 = executeCommand(r1.state, {
			type: "addNode",
			node: makeNode("n2"),
		});
		const r3 = executeCommand(r2.state, {
			type: "addNode",
			node: makeNode("n3"),
		});

		expect(Object.keys(r3.state.document.nodes)).toHaveLength(3);

		const u1 = undo(r3.state);
		expect(Object.keys(u1.state.document.nodes)).toHaveLength(2);

		const u2 = undo(u1.state);
		expect(Object.keys(u2.state.document.nodes)).toHaveLength(1);

		const re1 = redo(u2.state);
		expect(Object.keys(re1.state.document.nodes)).toHaveLength(2);

		const re2 = redo(re1.state);
		expect(Object.keys(re2.state.document.nodes)).toHaveLength(3);
	});
});

describe("determinism", () => {
	it("produces identical state for identical command sequences", () => {
		const commands: GraphCommand[] = [
			{ type: "addNode", node: makeNode("n1", 10, 20) },
			{ type: "addNode", node: makeNode("n2", 30, 40) },
			{ type: "connect", edge: makeEdge("e1", "n1", "n2") },
			{ type: "moveNode", nodeId: "n1", position: { x: 100, y: 200 } },
			{ type: "pan", pan: { x: 50, y: -10 } },
			{ type: "zoom", zoom: 1.5 },
		];

		let state1 = createUndoableState(createEmptyDocument("doc"));
		let state2 = createUndoableState(createEmptyDocument("doc"));

		for (const cmd of commands) {
			state1 = executeCommand(state1, cmd).state;
			state2 = executeCommand(state2, cmd).state;
		}

		expect(state1.document).toEqual(state2.document);
	});
});
