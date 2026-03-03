import { describe, expect, it } from "vitest";
import { CycleError, PenToolFacade, type UndoEntry } from "../facade";
import { SceneGraph } from "../scene-graph";

function makeFacade(): PenToolFacade {
	return new PenToolFacade(new SceneGraph());
}

function expectUpdateUndo(
	undo: UndoEntry,
	nodeId: string,
	keys: string[],
): void {
	expect(undo.type).toBe("update");
	expect(undo.nodeId).toBe(nodeId);
	expect(undo.inverse.kind).toBe("update");
	if (undo.inverse.kind === "update") {
		expect(Object.keys(undo.inverse.patch).sort()).toEqual(keys.sort());
	}
}

describe("PenToolFacade", () => {
	it("supports create → update → delete with undo metadata", () => {
		const facade = makeFacade();

		const frameResult = facade.createNode("frame", facade.graph.rootId, {
			name: "Canvas",
		});
		const rectResult = facade.createNode("rectangle", frameResult.node.id, {
			name: "Box",
			x: 10,
			y: 20,
			width: 100,
			height: 80,
		});

		expect(frameResult.undo).toEqual({
			type: "create",
			nodeId: frameResult.node.id,
			inverse: { kind: "delete", nodeId: frameResult.node.id },
		});

		const rectBefore = facade.getNode(rectResult.node.id);
		expect(rectBefore?.name).toBe("Box");

		const updateUndo = facade.updateNode(rectResult.node.id, {
			name: "Box Updated",
			x: 30,
		});
		expectUpdateUndo(updateUndo, rectResult.node.id, ["name", "x"]);

		if (updateUndo.inverse.kind === "update") {
			expect(updateUndo.inverse.patch.name).toBe("Box");
			expect(updateUndo.inverse.patch.x).toBe(10);
		}

		const rectAfter = facade.getNode(rectResult.node.id);
		expect(rectAfter?.name).toBe("Box Updated");
		expect(rectAfter?.x).toBe(30);

		const cloned = facade.getNode(rectResult.node.id);
		expect(cloned).toBeDefined();
		if (!cloned) {
			throw new Error("Expected cloned node");
		}
		cloned.name = "Mutated outside facade";
		expect(facade.getNode(rectResult.node.id)?.name).toBe("Box Updated");

		const groupResult = facade.createNode("group", frameResult.node.id, {
			name: "Nested Group",
		});
		const textResult = facade.createNode("text", groupResult.node.id, {
			content: "Nested",
		});
		expect(facade.getNode(textResult.node.id)).toBeDefined();

		const deleteUndo = facade.deleteNode(groupResult.node.id);
		expect(deleteUndo.type).toBe("delete");
		expect(deleteUndo.nodeId).toBe(groupResult.node.id);
		expect(facade.getNode(groupResult.node.id)).toBeUndefined();
		expect(facade.getNode(textResult.node.id)).toBeUndefined();
		expect(facade.getChildren(frameResult.node.id)).toHaveLength(1);

		expect(deleteUndo.inverse.kind).toBe("restore_subtree");
		if (deleteUndo.inverse.kind === "restore_subtree") {
			expect(deleteUndo.inverse.parentId).toBe(frameResult.node.id);
			expect(deleteUndo.inverse.nodes).toHaveLength(2);
		}
	});

	it("reparents nodes while preserving graph integrity and absolute position", () => {
		const facade = makeFacade();

		const frameA = facade.createNode("frame", facade.graph.rootId, {
			name: "A",
			x: 100,
			y: 100,
		}).node;
		const frameB = facade.createNode("frame", facade.graph.rootId, {
			name: "B",
			x: 500,
			y: 100,
		}).node;
		const text = facade.createNode("text", frameA.id, {
			content: "Node",
			x: 12,
			y: 16,
		}).node;

		const beforeAbs = facade.graph.getAbsolutePosition(text.id);
		const reparentUndo = facade.reparentNode(text.id, frameB.id);
		const afterAbs = facade.graph.getAbsolutePosition(text.id);

		expect(afterAbs).toEqual(beforeAbs);
		expect(facade.getChildren(frameA.id).map((n) => n.id)).not.toContain(
			text.id,
		);
		expect(facade.getChildren(frameB.id).map((n) => n.id)).toContain(text.id);

		expect(reparentUndo.type).toBe("reparent");
		expect(reparentUndo.nodeId).toBe(text.id);
		expect(reparentUndo.inverse.kind).toBe("reparent");
		if (reparentUndo.inverse.kind === "reparent") {
			expect(reparentUndo.inverse.previousParentId).toBe(frameA.id);
			expect(reparentUndo.inverse.previousIndex).toBe(0);
		}
	});

	it("throws CycleError when reparenting under a descendant", () => {
		const facade = makeFacade();

		const parent = facade.createNode("frame", facade.graph.rootId, {
			name: "Parent",
		}).node;
		const child = facade.createNode("frame", parent.id, { name: "Child" }).node;
		const grandchild = facade.createNode("frame", child.id, {
			name: "Grandchild",
		}).node;

		expect(() => facade.reparentNode(parent.id, grandchild.id)).toThrow(
			CycleError,
		);
	});

	it("filters nodes via findNodes predicate and supports ancestor/descendant queries", () => {
		const facade = makeFacade();

		const rootFrame = facade.createNode("frame", facade.graph.rootId, {
			name: "Root",
		}).node;
		const title = facade.createNode("text", rootFrame.id, {
			name: "Title",
			content: "Heading",
		}).node;
		const body = facade.createNode("text", rootFrame.id, {
			name: "Body",
			content: "Paragraph",
		}).node;
		facade.createNode("rectangle", rootFrame.id, {
			name: "Artwork",
		});

		const textNodes = facade.findNodes(
			(node) => node.type === "text" && node.name?.includes("Title") === true,
		);
		expect(textNodes.map((n) => n.id)).toEqual([title.id]);

		const descendants = facade.getDescendants(rootFrame.id);
		expect(descendants.map((n) => n.id)).toContain(title.id);
		expect(descendants.map((n) => n.id)).toContain(body.id);

		const ancestors = facade.getAncestors(title.id);
		expect(ancestors.map((n) => n.id)).toContain(rootFrame.id);
		expect(ancestors.at(-1)?.id).toBe(facade.graph.rootId);
	});
});
