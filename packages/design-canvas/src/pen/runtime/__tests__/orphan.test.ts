import { beforeEach, describe, expect, it } from "vitest";
import { RuntimeGraphError, resetIdCounter, SceneGraph } from "../scene-graph";

beforeEach(() => {
	resetIdCounter();
});

describe("orphan and invalid node errors", () => {
	it("insertNode throws RuntimeGraphError when parentId references nonexistent node", () => {
		const graph = new SceneGraph();

		expect(() => {
			graph.insertNode({
				id: "orphan-1",
				type: "rectangle",
				parentId: "nonexistent-parent",
				childIds: [],
				width: 100,
				height: 50,
			});
		}).toThrow(RuntimeGraphError);

		expect(() => {
			graph.insertNode({
				id: "orphan-1",
				type: "rectangle",
				parentId: "nonexistent-parent",
				childIds: [],
				width: 100,
				height: 50,
			});
		}).toThrow('parent "nonexistent-parent" does not exist');
	});

	it("insertNode throws RuntimeGraphError when node id already exists", () => {
		const graph = new SceneGraph();

		graph.insertNode({
			id: "node-1",
			type: "text",
			parentId: graph.rootId,
			childIds: [],
			content: "Hello",
		});

		expect(() => {
			graph.insertNode({
				id: "node-1",
				type: "rectangle",
				parentId: graph.rootId,
				childIds: [],
			});
		}).toThrow(RuntimeGraphError);

		expect(() => {
			graph.insertNode({
				id: "node-1",
				type: "rectangle",
				parentId: graph.rootId,
				childIds: [],
			});
		}).toThrow('id "node-1" already exists');
	});

	it("createNode throws RuntimeGraphError when parent does not exist", () => {
		const graph = new SceneGraph();

		expect(() => {
			graph.createNode("rectangle", "ghost-parent");
		}).toThrow(RuntimeGraphError);

		expect(() => {
			graph.createNode("rectangle", "ghost-parent");
		}).toThrow('parent "ghost-parent" does not exist');
	});

	it("RuntimeGraphError has correct name property", () => {
		const error = new RuntimeGraphError("test message");
		expect(error.name).toBe("RuntimeGraphError");
		expect(error.message).toBe("test message");
		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(RuntimeGraphError);
	});

	it("deleteNode silently ignores nonexistent node ids", () => {
		const graph = new SceneGraph();
		expect(() => graph.deleteNode("nonexistent")).not.toThrow();
	});

	it("deleteNode cannot delete the root node", () => {
		const graph = new SceneGraph();
		graph.deleteNode(graph.rootId);
		expect(graph.getNode(graph.rootId)).toBeDefined();
	});

	it("reparentNode silently ignores when new parent does not exist", () => {
		const graph = new SceneGraph();
		graph.insertNode({
			id: "child",
			type: "rectangle",
			parentId: graph.rootId,
			childIds: [],
		});

		graph.reparentNode("child", "nonexistent");

		const child = graph.getNode("child");
		expect(child!.parentId).toBe(graph.rootId);
	});

	it("reparentNode prevents creating cycles", () => {
		const graph = new SceneGraph();
		graph.insertNode({
			id: "parent",
			type: "frame",
			parentId: graph.rootId,
			childIds: [],
		});
		graph.insertNode({
			id: "child",
			type: "frame",
			parentId: "parent",
			childIds: [],
		});

		graph.reparentNode("parent", "child");

		const parent = graph.getNode("parent");
		expect(parent!.parentId).toBe(graph.rootId);
	});

	it("updateNode silently ignores nonexistent node ids", () => {
		const graph = new SceneGraph();
		expect(() =>
			graph.updateNode("nonexistent", { name: "test" }),
		).not.toThrow();
	});

	it("getNode returns undefined for nonexistent ids", () => {
		const graph = new SceneGraph();
		expect(graph.getNode("nonexistent")).toBeUndefined();
	});

	it("getChildren returns empty array for nonexistent ids", () => {
		const graph = new SceneGraph();
		expect(graph.getChildren("nonexistent")).toEqual([]);
	});

	it("isDescendant returns false for nonexistent ids", () => {
		const graph = new SceneGraph();
		expect(graph.isDescendant("nonexistent", graph.rootId)).toBe(false);
	});
});
