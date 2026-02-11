import { describe, expect, it } from "vitest";
import {
	createEmptyDocument,
	createUndoableState,
	executeCommand,
	redo,
	undo,
} from "../commands";
import type { GraphCommand, GraphDocument, UndoableState } from "../types";

describe("graph-core integration", () => {
	describe("command sequence determinism", () => {
		it("same commands produce same state", () => {
			const commands: GraphCommand[] = [
				{
					type: "addNode",
					node: {
						id: "node1",
						type: "test",
						position: { x: 100, y: 200 },
						ports: [{ id: "out", direction: "output", dataType: "any" }],
						data: { value: 42 },
					},
				},
				{
					type: "addNode",
					node: {
						id: "node2",
						type: "test",
						position: { x: 300, y: 200 },
						ports: [{ id: "in", direction: "input", dataType: "any" }],
						data: { value: 99 },
					},
				},
				{
					type: "connect",
					edge: {
						id: "edge1",
						from: { nodeId: "node1", portId: "out" },
						to: { nodeId: "node2", portId: "in" },
					},
				},
			];

			const state1 = createUndoableState(createEmptyDocument("doc1"));
			const state2 = createUndoableState(createEmptyDocument("doc2"));

			let result1 = state1;
			let result2 = state2;

			for (const cmd of commands) {
				result1 = executeCommand(result1, cmd).state;
				result2 = executeCommand(result2, cmd).state;
			}

			expect(Object.keys(result1.document.nodes)).toEqual(
				Object.keys(result2.document.nodes),
			);
			expect(Object.keys(result1.document.edges)).toEqual(
				Object.keys(result2.document.edges),
			);
			expect(result1.document.nodes["node1"].data).toEqual(
				result2.document.nodes["node1"].data,
			);
		});

		it("different command order produces different state", () => {
			const state1 = createUndoableState(createEmptyDocument("doc1"));
			const state2 = createUndoableState(createEmptyDocument("doc2"));

			const result1 = executeCommand(
				executeCommand(state1, {
					type: "pan",
					pan: { x: 10, y: 20 },
				}).state,
				{
					type: "zoom",
					zoom: 2,
				},
			).state;

			const result2 = executeCommand(
				executeCommand(state2, {
					type: "zoom",
					zoom: 2,
				}).state,
				{
					type: "pan",
					pan: { x: 10, y: 20 },
				},
			).state;

			expect(result1.document.viewport).toEqual(result2.document.viewport);
		});
	});

	describe("undo/redo restores exact prior states", () => {
		it("undo restores previous document state", () => {
			let state = createUndoableState(createEmptyDocument("doc"));

			const originalDoc = state.document;

			state = executeCommand(state, {
				type: "addNode",
				node: {
					id: "node1",
					type: "test",
					position: { x: 0, y: 0 },
					ports: [],
					data: {},
				},
			}).state;

			const afterAdd = state.document;
			expect(Object.keys(afterAdd.nodes)).toHaveLength(1);

			state = undo(state).state;

			expect(state.document).toEqual(originalDoc);
			expect(Object.keys(state.document.nodes)).toHaveLength(0);
		});

		it("redo restores undone state", () => {
			let state = createUndoableState(createEmptyDocument("doc"));

			state = executeCommand(state, {
				type: "addNode",
				node: {
					id: "node1",
					type: "test",
					position: { x: 0, y: 0 },
					ports: [],
					data: {},
				},
			}).state;

			const afterAdd = state.document;

			state = undo(state).state;
			state = redo(state).state;

			expect(state.document).toEqual(afterAdd);
			expect(Object.keys(state.document.nodes)).toHaveLength(1);
		});

		it("multiple undo/redo cycles preserve state", () => {
			let state = createUndoableState(createEmptyDocument("doc"));

			const snapshots: GraphDocument[] = [state.document];

			for (let i = 0; i < 5; i++) {
				state = executeCommand(state, {
					type: "addNode",
					node: {
						id: `node${i}`,
						type: "test",
						position: { x: i * 100, y: 0 },
						ports: [],
						data: {},
					},
				}).state;
				snapshots.push(state.document);
			}

			for (let i = 4; i >= 0; i--) {
				state = undo(state).state;
				expect(state.document).toEqual(snapshots[i]);
			}

			for (let i = 1; i <= 5; i++) {
				state = redo(state).state;
				expect(state.document).toEqual(snapshots[i]);
			}
		});

		it("new command clears redo history", () => {
			let state = createUndoableState(createEmptyDocument("doc"));

			state = executeCommand(state, {
				type: "addNode",
				node: {
					id: "node1",
					type: "test",
					position: { x: 0, y: 0 },
					ports: [],
					data: {},
				},
			}).state;

			state = undo(state).state;
			expect(state.future.length).toBe(1);

			state = executeCommand(state, {
				type: "addNode",
				node: {
					id: "node2",
					type: "test",
					position: { x: 100, y: 0 },
					ports: [],
					data: {},
				},
			}).state;

			expect(state.future.length).toBe(0);

			const redoResult = redo(state);
			expect(redoResult.error).toBe("Nothing to redo");
		});
	});

	describe("serialization round-trip", () => {
		it("save and reload produces equivalent document", () => {
			let state = createUndoableState(createEmptyDocument("doc"));

			state = executeCommand(state, {
				type: "addNode",
				node: {
					id: "node1",
					type: "test",
					position: { x: 100, y: 200 },
					ports: [{ id: "out", direction: "output", dataType: "any" }],
					data: { value: 42, nested: { key: "value" } },
				},
			}).state;

			state = executeCommand(state, {
				type: "addNode",
				node: {
					id: "node2",
					type: "test",
					position: { x: 300, y: 200 },
					ports: [{ id: "in", direction: "input", dataType: "any" }],
					data: { value: 99 },
				},
			}).state;

			state = executeCommand(state, {
				type: "connect",
				edge: {
					id: "edge1",
					from: { nodeId: "node1", portId: "out" },
					to: { nodeId: "node2", portId: "in" },
				},
			}).state;

			const serialized = JSON.stringify(state.document);
			const deserialized: GraphDocument = JSON.parse(serialized);

			expect(deserialized).toEqual(state.document);
			expect(deserialized.nodes["node1"].data).toEqual({
				value: 42,
				nested: { key: "value" },
			});
			expect(Object.keys(deserialized.edges)).toHaveLength(1);
		});

		it("serialized state preserves viewport", () => {
			let state = createUndoableState(createEmptyDocument("doc"));

			state = executeCommand(state, {
				type: "pan",
				pan: { x: 500, y: 300 },
			}).state;

			state = executeCommand(state, {
				type: "zoom",
				zoom: 1.5,
			}).state;

			const serialized = JSON.stringify(state.document);
			const deserialized: GraphDocument = JSON.parse(serialized);

			expect(deserialized.viewport.pan).toEqual({ x: 500, y: 300 });
			expect(deserialized.viewport.zoom).toBe(1.5);
		});
	});

	describe("batch command atomicity", () => {
		it("batch succeeds when all commands valid", () => {
			const state = createUndoableState(createEmptyDocument("doc"));

			const result = executeCommand(state, {
				type: "batch",
				commands: [
					{
						type: "addNode",
						node: {
							id: "node1",
							type: "test",
							position: { x: 0, y: 0 },
							ports: [],
							data: {},
						},
					},
					{
						type: "addNode",
						node: {
							id: "node2",
							type: "test",
							position: { x: 100, y: 0 },
							ports: [],
							data: {},
						},
					},
				],
			});

			expect(result.error).toBeUndefined();
			expect(Object.keys(result.state.document.nodes)).toHaveLength(2);
		});

		it("batch fails atomically when any command invalid", () => {
			let state = createUndoableState(createEmptyDocument("doc"));

			state = executeCommand(state, {
				type: "addNode",
				node: {
					id: "existing",
					type: "test",
					position: { x: 0, y: 0 },
					ports: [],
					data: {},
				},
			}).state;

			const result = executeCommand(state, {
				type: "batch",
				commands: [
					{
						type: "addNode",
						node: {
							id: "node1",
							type: "test",
							position: { x: 0, y: 0 },
							ports: [],
							data: {},
						},
					},
					{
						type: "addNode",
						node: {
							id: "existing",
							type: "test",
							position: { x: 100, y: 0 },
							ports: [],
							data: {},
						},
					},
				],
			});

			expect(result.error).toBeDefined();
			expect(result.error).toContain("already exists");
			expect(Object.keys(result.state.document.nodes)).toHaveLength(1);
			expect(result.state.document.nodes["node1"]).toBeUndefined();
		});

		it("batch creates single history entry", () => {
			const state = createUndoableState(createEmptyDocument("doc"));

			const result = executeCommand(state, {
				type: "batch",
				commands: [
					{
						type: "addNode",
						node: {
							id: "node1",
							type: "test",
							position: { x: 0, y: 0 },
							ports: [],
							data: {},
						},
					},
					{
						type: "addNode",
						node: {
							id: "node2",
							type: "test",
							position: { x: 100, y: 0 },
							ports: [],
							data: {},
						},
					},
				],
			});

			expect(result.state.past.length).toBe(1);

			const undone = undo(result.state);
			expect(Object.keys(undone.state.document.nodes)).toHaveLength(0);
		});

		it("nested batch commands are flattened", () => {
			const state = createUndoableState(createEmptyDocument("doc"));

			const result = executeCommand(state, {
				type: "batch",
				commands: [
					{
						type: "addNode",
						node: {
							id: "node1",
							type: "test",
							position: { x: 0, y: 0 },
							ports: [],
							data: {},
						},
					},
					{
						type: "batch",
						commands: [
							{
								type: "addNode",
								node: {
									id: "node2",
									type: "test",
									position: { x: 100, y: 0 },
									ports: [],
									data: {},
								},
							},
							{
								type: "addNode",
								node: {
									id: "node3",
									type: "test",
									position: { x: 200, y: 0 },
									ports: [],
									data: {},
								},
							},
						],
					},
				],
			});

			expect(result.error).toBeUndefined();
			expect(Object.keys(result.state.document.nodes)).toHaveLength(3);
		});
	});
});
