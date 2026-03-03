import { PenToolFacade, SceneGraph } from "@slopcade/design-canvas/pen/runtime";
import { describe, expect, it } from "vitest";
import {
	pencil_create_node,
	pencil_delete_node,
	pencil_find_nodes,
	pencil_get_children,
	pencil_get_node,
	pencil_reparent_node,
	pencil_set_fill,
	pencil_set_layout,
	pencil_set_stroke,
	pencil_update_node,
} from "../pencil-v2";

function createFacade(): PenToolFacade {
	return new PenToolFacade(new SceneGraph());
}

describe("pencil-v2 priority tools", () => {
	it("pencil_get_node returns node by id", () => {
		const facade = createFacade();
		const created = pencil_create_node(facade, {
			type: "frame",
			props: { name: "Frame A" },
		});
		expect(created.success).toBe(true);
		if (!created.success) return;

		const result = pencil_get_node(facade, { id: created.data.node.id });
		expect(result).toEqual(
			expect.objectContaining({
				success: true,
				data: expect.objectContaining({ id: created.data.node.id }),
			}),
		);
	});

	it("pencil_get_node returns validation failure", () => {
		const facade = createFacade();
		const result = pencil_get_node(facade, {});
		expect(result.success).toBe(false);
	});

	it("pencil_get_children returns children", () => {
		const facade = createFacade();
		const parent = pencil_create_node(facade, {
			type: "frame",
			props: { name: "Parent" },
		});
		expect(parent.success).toBe(true);
		if (!parent.success) return;

		pencil_create_node(facade, {
			type: "rectangle",
			parentId: parent.data.node.id,
			props: { name: "Child" },
		});

		const result = pencil_get_children(facade, { id: parent.data.node.id });
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data).toHaveLength(1);
		expect(result.data[0]?.name).toBe("Child");
	});

	it("pencil_get_children returns validation failure", () => {
		const facade = createFacade();
		const result = pencil_get_children(facade, { id: 1 });
		expect(result.success).toBe(false);
	});

	it("pencil_find_nodes filters by type and namePattern", () => {
		const facade = createFacade();
		pencil_create_node(facade, { type: "frame", props: { name: "Screen" } });
		pencil_create_node(facade, {
			type: "rectangle",
			props: { name: "Primary Button" },
		});

		const result = pencil_find_nodes(facade, {
			type: "rectangle",
			namePattern: "button",
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data).toHaveLength(1);
		expect(result.data[0]?.name).toBe("Primary Button");
	});

	it("pencil_find_nodes returns validation failure", () => {
		const facade = createFacade();
		const result = pencil_find_nodes(facade, { caseSensitive: "yes" });
		expect(result.success).toBe(false);
	});

	it("pencil_create_node creates node", () => {
		const facade = createFacade();
		const result = pencil_create_node(facade, {
			type: "text",
			props: { name: "Title", content: "Hello" },
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.node.type).toBe("text");
		expect(result.data.undoType).toBe("create");
	});

	it("pencil_create_node returns validation failure", () => {
		const facade = createFacade();
		const result = pencil_create_node(facade, { type: "invalid_type" });
		expect(result.success).toBe(false);
	});

	it("pencil_update_node patches node", () => {
		const facade = createFacade();
		const created = pencil_create_node(facade, {
			type: "text",
			props: { name: "Before" },
		});
		expect(created.success).toBe(true);
		if (!created.success) return;

		const result = pencil_update_node(facade, {
			id: created.data.node.id,
			patch: { name: "After" },
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.node.name).toBe("After");
	});

	it("pencil_update_node returns validation failure", () => {
		const facade = createFacade();
		const result = pencil_update_node(facade, { id: "x" });
		expect(result.success).toBe(false);
	});

	it("pencil_delete_node deletes node subtree", () => {
		const facade = createFacade();
		const created = pencil_create_node(facade, {
			type: "frame",
			props: { name: "Delete Me" },
		});
		expect(created.success).toBe(true);
		if (!created.success) return;

		const result = pencil_delete_node(facade, { id: created.data.node.id });
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.deletedId).toBe(created.data.node.id);
		expect(facade.getNode(created.data.node.id)).toBeUndefined();
	});

	it("pencil_delete_node returns validation failure", () => {
		const facade = createFacade();
		const result = pencil_delete_node(facade, { id: "" });
		expect(result.success).toBe(false);
	});

	it("pencil_reparent_node moves node to new parent", () => {
		const facade = createFacade();
		const parentA = pencil_create_node(facade, { type: "frame" });
		const parentB = pencil_create_node(facade, { type: "frame" });
		const child = pencil_create_node(facade, {
			type: "rectangle",
			parentId: parentA.success ? parentA.data.node.id : undefined,
		});

		expect(parentA.success && parentB.success && child.success).toBe(true);
		if (!parentA.success || !parentB.success || !child.success) return;

		const result = pencil_reparent_node(facade, {
			id: child.data.node.id,
			newParentId: parentB.data.node.id,
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.node.parentId).toBe(parentB.data.node.id);
	});

	it("pencil_reparent_node returns validation failure", () => {
		const facade = createFacade();
		const result = pencil_reparent_node(facade, { id: "x", newParentId: 2 });
		expect(result.success).toBe(false);
	});

	it("pencil_set_fill updates fill", () => {
		const facade = createFacade();
		const created = pencil_create_node(facade, { type: "rectangle" });
		expect(created.success).toBe(true);
		if (!created.success) return;

		const fill = { type: "solid", color: "#ff0000" };
		const result = pencil_set_fill(facade, { id: created.data.node.id, fill });
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.node.fill).toEqual(fill);
	});

	it("pencil_set_fill returns validation failure", () => {
		const facade = createFacade();
		const result = pencil_set_fill(facade, { id: "x", fill: "red" });
		expect(result.success).toBe(false);
	});

	it("pencil_set_stroke updates stroke", () => {
		const facade = createFacade();
		const created = pencil_create_node(facade, { type: "rectangle" });
		expect(created.success).toBe(true);
		if (!created.success) return;

		const stroke = { type: "solid", color: "#00ff00", width: 2 };
		const result = pencil_set_stroke(facade, {
			id: created.data.node.id,
			stroke,
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.node.stroke).toEqual(stroke);
	});

	it("pencil_set_stroke returns validation failure", () => {
		const facade = createFacade();
		const result = pencil_set_stroke(facade, { id: "x", stroke: "s" });
		expect(result.success).toBe(false);
	});

	it("pencil_set_layout updates frame layout fields", () => {
		const facade = createFacade();
		const created = pencil_create_node(facade, {
			type: "frame",
			props: { name: "Layout Frame" },
		});
		expect(created.success).toBe(true);
		if (!created.success) return;

		const result = pencil_set_layout(facade, {
			id: created.data.node.id,
			layout: "vertical",
			gap: 12,
			padding: { top: 8, right: 8, bottom: 8, left: 8 },
			justifyContent: "start",
			alignItems: "stretch",
			clip: true,
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.node.layout).toBe("vertical");
		expect(result.data.node.gap).toBe(12);
		expect(result.data.node.clip).toBe(true);
	});

	it("pencil_set_layout returns validation failure", () => {
		const facade = createFacade();
		const result = pencil_set_layout(facade, { id: "node-1" });
		expect(result.success).toBe(false);
	});
});
