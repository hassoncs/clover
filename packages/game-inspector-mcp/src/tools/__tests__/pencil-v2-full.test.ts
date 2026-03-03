import {
	PenToolFacade,
	resetIdCounter,
	SceneGraph,
} from "@slopcade/design-canvas/pen/runtime";
import { beforeEach, describe, expect, it } from "vitest";
import { getParitySummary, PARITY_MATRIX } from "../parity-matrix";
import { pencil_create_node } from "../pencil-v2";
import {
	pencil_create_component,
	pencil_create_instance,
	pencil_detach_instance,
	pencil_reset_instance_override,
	pencil_set_instance_override,
} from "../pencil-v2-components";
import {
	pencil_set_blend_mode,
	pencil_set_corner_radius,
	pencil_set_effects,
	pencil_set_opacity,
	pencil_set_text_style,
} from "../pencil-v2-effects";
import {
	pencil_get_ancestors,
	pencil_get_descendants,
	pencil_get_document,
	pencil_get_selection,
	pencil_search_nodes,
} from "../pencil-v2-query";
import {
	pencil_bind_variable,
	pencil_create_variable,
	pencil_delete_variable,
	pencil_get_variables,
	pencil_update_variable,
} from "../pencil-v2-variables";

function createFacade(): PenToolFacade {
	return new PenToolFacade(new SceneGraph());
}

function createFrameNode(facade: PenToolFacade, name?: string) {
	const result = pencil_create_node(facade, {
		type: "frame",
		props: { name: name ?? "Frame" },
	});
	if (!result.success) throw new Error("Failed to create frame");
	return result.data.node;
}

function createTextNode(facade: PenToolFacade, content?: string) {
	const result = pencil_create_node(facade, {
		type: "text",
		props: { name: "Text", content: content ?? "Hello" },
	});
	if (!result.success) throw new Error("Failed to create text");
	return result.data.node;
}

function createRectNode(facade: PenToolFacade, name?: string) {
	const result = pencil_create_node(facade, {
		type: "rectangle",
		props: { name: name ?? "Rect" },
	});
	if (!result.success) throw new Error("Failed to create rectangle");
	return result.data.node;
}

beforeEach(() => {
	resetIdCounter();
});

// ===========================================================================
// Components
// ===========================================================================

describe("pencil-v2-components", () => {
	describe("pencil_create_component", () => {
		it("marks a frame as reusable", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade, "Button");

			const result = pencil_create_component(facade, { id: frame.id });
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.node.reusable).toBe(true);
			expect(result.data.undoType).toBe("update");
		});

		it("rejects non-frame/group nodes", () => {
			const facade = createFacade();
			const rect = createRectNode(facade);

			const result = pencil_create_component(facade, { id: rect.id });
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toContain("must be a frame or group");
		});

		it("returns validation failure for empty id", () => {
			const facade = createFacade();
			const result = pencil_create_component(facade, { id: "" });
			expect(result.success).toBe(false);
		});

		it("returns failure for non-existent node", () => {
			const facade = createFacade();
			const result = pencil_create_component(facade, { id: "nonexistent" });
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toContain("not found");
		});
	});

	describe("pencil_create_instance", () => {
		it("creates a ref node pointing to a component", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade, "Card");
			pencil_create_component(facade, { id: frame.id });

			const result = pencil_create_instance(facade, {
				componentId: frame.id,
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.node.type).toBe("ref");
			expect(result.data.node.ref).toBe(frame.id);
		});

		it("rejects non-reusable node as component", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade, "NotComponent");

			const result = pencil_create_instance(facade, {
				componentId: frame.id,
			});
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toContain("not a reusable component");
		});

		it("returns validation failure for missing componentId", () => {
			const facade = createFacade();
			const result = pencil_create_instance(facade, {});
			expect(result.success).toBe(false);
		});
	});

	describe("pencil_detach_instance", () => {
		it("changes node type to frame and clears ref fields", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade, "Card");
			pencil_create_component(facade, { id: frame.id });
			const inst = pencil_create_instance(facade, {
				componentId: frame.id,
			});
			if (!inst.success) throw new Error("Failed to create instance");

			const result = pencil_detach_instance(facade, {
				id: inst.data.node.id,
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.node.type).toBe("frame");
			expect(result.data.node.ref).toBeUndefined();
			expect(result.data.node.descendants).toBeUndefined();
		});

		it("rejects non-ref nodes", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade);

			const result = pencil_detach_instance(facade, { id: frame.id });
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toContain("not a ref instance");
		});

		it("returns validation failure for empty id", () => {
			const facade = createFacade();
			const result = pencil_detach_instance(facade, { id: "" });
			expect(result.success).toBe(false);
		});
	});

	describe("pencil_set_instance_override", () => {
		it("sets a descendant override on a ref node", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade, "Card");
			pencil_create_component(facade, { id: frame.id });
			const inst = pencil_create_instance(facade, {
				componentId: frame.id,
			});
			if (!inst.success) throw new Error("Failed to create instance");

			const result = pencil_set_instance_override(facade, {
				id: inst.data.node.id,
				descendantPath: "title",
				overrides: { content: "Custom Title" },
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.node.descendants).toEqual({
				title: { content: "Custom Title" },
			});
		});

		it("merges with existing overrides", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade, "Card");
			pencil_create_component(facade, { id: frame.id });
			const inst = pencil_create_instance(facade, {
				componentId: frame.id,
			});
			if (!inst.success) throw new Error("Failed to create instance");

			pencil_set_instance_override(facade, {
				id: inst.data.node.id,
				descendantPath: "title",
				overrides: { content: "Title" },
			});
			const result = pencil_set_instance_override(facade, {
				id: inst.data.node.id,
				descendantPath: "subtitle",
				overrides: { content: "Subtitle" },
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.node.descendants).toEqual({
				title: { content: "Title" },
				subtitle: { content: "Subtitle" },
			});
		});

		it("returns validation failure for missing fields", () => {
			const facade = createFacade();
			const result = pencil_set_instance_override(facade, { id: "x" });
			expect(result.success).toBe(false);
		});
	});

	describe("pencil_reset_instance_override", () => {
		it("removes a specific descendant override", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade, "Card");
			pencil_create_component(facade, { id: frame.id });
			const inst = pencil_create_instance(facade, {
				componentId: frame.id,
			});
			if (!inst.success) throw new Error("Failed to create instance");

			pencil_set_instance_override(facade, {
				id: inst.data.node.id,
				descendantPath: "title",
				overrides: { content: "Title" },
			});
			pencil_set_instance_override(facade, {
				id: inst.data.node.id,
				descendantPath: "subtitle",
				overrides: { content: "Subtitle" },
			});

			const result = pencil_reset_instance_override(facade, {
				id: inst.data.node.id,
				descendantPath: "title",
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.node.descendants).toEqual({
				subtitle: { content: "Subtitle" },
			});
		});

		it("clears descendants when last override removed", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade, "Card");
			pencil_create_component(facade, { id: frame.id });
			const inst = pencil_create_instance(facade, {
				componentId: frame.id,
			});
			if (!inst.success) throw new Error("Failed to create instance");

			pencil_set_instance_override(facade, {
				id: inst.data.node.id,
				descendantPath: "title",
				overrides: { content: "Title" },
			});

			const result = pencil_reset_instance_override(facade, {
				id: inst.data.node.id,
				descendantPath: "title",
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.node.descendants).toBeUndefined();
		});

		it("returns validation failure for missing descendantPath", () => {
			const facade = createFacade();
			const result = pencil_reset_instance_override(facade, { id: "x" });
			expect(result.success).toBe(false);
		});
	});
});

// ===========================================================================
// Variables
// ===========================================================================

describe("pencil-v2-variables", () => {
	describe("pencil_create_variable", () => {
		it("creates a variable in the scene graph", () => {
			const facade = createFacade();
			const result = pencil_create_variable(facade, {
				name: "primary-color",
				type: "color",
				value: "#ff0000",
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.name).toBe("primary-color");
			expect(result.data.variable.type).toBe("color");
			expect(result.data.variable.value).toBe("#ff0000");
		});

		it("rejects duplicate variable names", () => {
			const facade = createFacade();
			pencil_create_variable(facade, {
				name: "spacing",
				type: "number",
				value: 8,
			});
			const result = pencil_create_variable(facade, {
				name: "spacing",
				type: "number",
				value: 16,
			});
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toContain("already exists");
		});

		it("returns validation failure for missing fields", () => {
			const facade = createFacade();
			const result = pencil_create_variable(facade, { name: "x" });
			expect(result.success).toBe(false);
		});
	});

	describe("pencil_update_variable", () => {
		it("updates variable value", () => {
			const facade = createFacade();
			pencil_create_variable(facade, {
				name: "spacing",
				type: "number",
				value: 8,
			});

			const result = pencil_update_variable(facade, {
				name: "spacing",
				value: 16,
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.variable.value).toBe(16);
		});

		it("returns failure for non-existent variable", () => {
			const facade = createFacade();
			const result = pencil_update_variable(facade, {
				name: "nonexistent",
				value: 42,
			});
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toContain("not found");
		});

		it("returns validation failure for empty name", () => {
			const facade = createFacade();
			const result = pencil_update_variable(facade, { name: "" });
			expect(result.success).toBe(false);
		});
	});

	describe("pencil_delete_variable", () => {
		it("deletes an existing variable", () => {
			const facade = createFacade();
			pencil_create_variable(facade, {
				name: "temp",
				type: "string",
				value: "hello",
			});

			const result = pencil_delete_variable(facade, { name: "temp" });
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.deletedName).toBe("temp");
			expect(facade.graph.variables.has("temp")).toBe(false);
		});

		it("returns failure for non-existent variable", () => {
			const facade = createFacade();
			const result = pencil_delete_variable(facade, { name: "nope" });
			expect(result.success).toBe(false);
		});

		it("returns validation failure for empty name", () => {
			const facade = createFacade();
			const result = pencil_delete_variable(facade, { name: "" });
			expect(result.success).toBe(false);
		});
	});

	describe("pencil_bind_variable", () => {
		it("binds a variable to a node property via theme map", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade);
			pencil_create_variable(facade, {
				name: "bg-color",
				type: "color",
				value: "#000",
			});

			const result = pencil_bind_variable(facade, {
				nodeId: frame.id,
				property: "fill",
				variableName: "bg-color",
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.node.theme).toEqual({ fill: "bg-color" });
		});

		it("returns failure for non-existent node", () => {
			const facade = createFacade();
			pencil_create_variable(facade, {
				name: "v",
				type: "string",
				value: "x",
			});
			const result = pencil_bind_variable(facade, {
				nodeId: "nope",
				property: "fill",
				variableName: "v",
			});
			expect(result.success).toBe(false);
		});

		it("returns failure for non-existent variable", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade);
			const result = pencil_bind_variable(facade, {
				nodeId: frame.id,
				property: "fill",
				variableName: "nope",
			});
			expect(result.success).toBe(false);
		});

		it("returns validation failure for missing fields", () => {
			const facade = createFacade();
			const result = pencil_bind_variable(facade, { nodeId: "x" });
			expect(result.success).toBe(false);
		});
	});

	describe("pencil_get_variables", () => {
		it("lists all variables", () => {
			const facade = createFacade();
			pencil_create_variable(facade, {
				name: "a",
				type: "color",
				value: "#fff",
			});
			pencil_create_variable(facade, {
				name: "b",
				type: "number",
				value: 42,
			});

			const result = pencil_get_variables(facade, {});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.variables).toHaveLength(2);
		});

		it("filters by type", () => {
			const facade = createFacade();
			pencil_create_variable(facade, {
				name: "a",
				type: "color",
				value: "#fff",
			});
			pencil_create_variable(facade, {
				name: "b",
				type: "number",
				value: 42,
			});

			const result = pencil_get_variables(facade, { type: "color" });
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.variables).toHaveLength(1);
			expect(result.data.variables[0]?.name).toBe("a");
		});

		it("returns empty array when no variables exist", () => {
			const facade = createFacade();
			const result = pencil_get_variables(facade, {});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.variables).toHaveLength(0);
		});
	});
});

// ===========================================================================
// Effects / Styling
// ===========================================================================

describe("pencil-v2-effects", () => {
	describe("pencil_set_effects", () => {
		it("sets effects on a frame node", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade);

			const effects = [
				{
					shadow: {
						color: "#000000",
						offsetX: 0,
						offsetY: 4,
						blur: 8,
						spread: 0,
					},
				},
			];
			const result = pencil_set_effects(facade, {
				id: frame.id,
				effects,
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.node.effects).toEqual(effects);
		});

		it("rejects text nodes", () => {
			const facade = createFacade();
			const text = createTextNode(facade);

			const result = pencil_set_effects(facade, {
				id: text.id,
				effects: [{ blur: 4 }],
			});
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toContain("does not support effects");
		});

		it("returns validation failure for missing effects array", () => {
			const facade = createFacade();
			const result = pencil_set_effects(facade, { id: "x" });
			expect(result.success).toBe(false);
		});
	});

	describe("pencil_set_corner_radius", () => {
		it("sets uniform corner radius on a rectangle", () => {
			const facade = createFacade();
			const rect = createRectNode(facade);

			const result = pencil_set_corner_radius(facade, {
				id: rect.id,
				radius: 12,
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.node.cornerRadius).toBe(12);
		});

		it("sets per-corner radius as tuple", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade);

			const result = pencil_set_corner_radius(facade, {
				id: frame.id,
				radius: [4, 8, 12, 16],
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.node.cornerRadius).toEqual([4, 8, 12, 16]);
		});

		it("rejects text nodes", () => {
			const facade = createFacade();
			const text = createTextNode(facade);

			const result = pencil_set_corner_radius(facade, {
				id: text.id,
				radius: 8,
			});
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toContain("does not support corner radius");
		});

		it("returns validation failure for negative radius", () => {
			const facade = createFacade();
			const result = pencil_set_corner_radius(facade, {
				id: "x",
				radius: -1,
			});
			expect(result.success).toBe(false);
		});
	});

	describe("pencil_set_opacity", () => {
		it("sets opacity on a node", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade);

			const result = pencil_set_opacity(facade, {
				id: frame.id,
				opacity: 0.5,
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.node.opacity).toBe(0.5);
		});

		it("returns failure for non-existent node", () => {
			const facade = createFacade();
			const result = pencil_set_opacity(facade, {
				id: "nope",
				opacity: 0.5,
			});
			expect(result.success).toBe(false);
		});

		it("returns validation failure for out-of-range opacity", () => {
			const facade = createFacade();
			const result = pencil_set_opacity(facade, {
				id: "x",
				opacity: 1.5,
			});
			expect(result.success).toBe(false);
		});
	});

	describe("pencil_set_blend_mode", () => {
		it("stores blend mode in blendMode field", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade);

			const result = pencil_set_blend_mode(facade, {
				id: frame.id,
				blendMode: "MULTIPLY",
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.value).toBe("MULTIPLY");
			expect(result.data.node.blendMode).toBe("MULTIPLY");
			expect(result.data.node.theme?.blendMode).toBeUndefined();
		});

		it("returns failure for non-existent node", () => {
			const facade = createFacade();
			const result = pencil_set_blend_mode(facade, {
				id: "nope",
				blendMode: "NORMAL",
			});
			expect(result.success).toBe(false);
		});

		it("returns validation failure for empty blendMode", () => {
			const facade = createFacade();
			const result = pencil_set_blend_mode(facade, {
				id: "x",
				blendMode: "",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("pencil_set_text_style", () => {
		it("sets text style properties on a text node", () => {
			const facade = createFacade();
			const text = createTextNode(facade);

			const result = pencil_set_text_style(facade, {
				id: text.id,
				fontSize: 24,
				fontFamily: "Inter",
				fontWeight: "bold",
				textAlign: "center",
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.node.fontSize).toBe(24);
			expect(result.data.node.fontFamily).toBe("Inter");
			expect(result.data.node.fontWeight).toBe("bold");
			expect(result.data.node.textAlign).toBe("center");
		});

		it("rejects non-text nodes", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade);

			const result = pencil_set_text_style(facade, {
				id: frame.id,
				fontSize: 16,
			});
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.error).toContain("not a text node");
		});

		it("requires at least one property", () => {
			const facade = createFacade();
			const text = createTextNode(facade);

			const result = pencil_set_text_style(facade, { id: text.id });
			expect(result.success).toBe(false);
		});

		it("returns validation failure for missing id", () => {
			const facade = createFacade();
			const result = pencil_set_text_style(facade, { fontSize: 16 });
			expect(result.success).toBe(false);
		});
	});
});

// ===========================================================================
// Query / Export
// ===========================================================================

describe("pencil-v2-query", () => {
	describe("pencil_get_document", () => {
		it("serializes scene graph to PenDocument", () => {
			const facade = createFacade();
			createFrameNode(facade, "Screen");
			createRectNode(facade, "Box");

			const result = pencil_get_document(facade, {});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.document.version).toBe(1);
			expect(result.data.document.children).toHaveLength(2);
		});

		it("includes variables in document", () => {
			const facade = createFacade();
			facade.graph.variables.set("color", {
				type: "color",
				value: "#fff",
			});

			const result = pencil_get_document(facade, {});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.document.variables).toBeDefined();
			expect(result.data.document.variables?.color).toEqual({
				type: "color",
				value: "#fff",
			});
		});
	});

	describe("pencil_get_ancestors", () => {
		it("returns ancestor chain", () => {
			const facade = createFacade();
			const parent = createFrameNode(facade, "Parent");
			const childResult = pencil_create_node(facade, {
				type: "rectangle",
				parentId: parent.id,
				props: { name: "Child" },
			});
			if (!childResult.success) throw new Error("Failed to create child");

			const result = pencil_get_ancestors(facade, {
				id: childResult.data.node.id,
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.ancestors.length).toBeGreaterThanOrEqual(1);
			expect(result.data.ancestors[0]?.id).toBe(parent.id);
		});

		it("returns failure for non-existent node", () => {
			const facade = createFacade();
			const result = pencil_get_ancestors(facade, { id: "nope" });
			expect(result.success).toBe(false);
		});

		it("returns validation failure for empty id", () => {
			const facade = createFacade();
			const result = pencil_get_ancestors(facade, { id: "" });
			expect(result.success).toBe(false);
		});
	});

	describe("pencil_get_descendants", () => {
		it("returns all descendants", () => {
			const facade = createFacade();
			const parent = createFrameNode(facade, "Parent");
			pencil_create_node(facade, {
				type: "rectangle",
				parentId: parent.id,
				props: { name: "Child1" },
			});
			pencil_create_node(facade, {
				type: "text",
				parentId: parent.id,
				props: { name: "Child2", content: "text" },
			});

			const result = pencil_get_descendants(facade, { id: parent.id });
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.descendants).toHaveLength(2);
		});

		it("returns failure for non-existent node", () => {
			const facade = createFacade();
			const result = pencil_get_descendants(facade, { id: "nope" });
			expect(result.success).toBe(false);
		});

		it("returns validation failure for empty id", () => {
			const facade = createFacade();
			const result = pencil_get_descendants(facade, { id: "" });
			expect(result.success).toBe(false);
		});
	});

	describe("pencil_search_nodes", () => {
		it("searches by name pattern", () => {
			const facade = createFacade();
			createFrameNode(facade, "Header");
			createFrameNode(facade, "Footer");
			createRectNode(facade, "HeaderBg");

			const result = pencil_search_nodes(facade, {
				namePattern: "header",
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.nodes).toHaveLength(2);
		});

		it("searches by type", () => {
			const facade = createFacade();
			createFrameNode(facade, "Frame1");
			createRectNode(facade, "Rect1");

			const result = pencil_search_nodes(facade, { type: "rectangle" });
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.nodes).toHaveLength(1);
			expect(result.data.nodes[0]?.type).toBe("rectangle");
		});

		it("searches by reusable flag", () => {
			const facade = createFacade();
			const frame = createFrameNode(facade, "Component");
			pencil_create_component(facade, { id: frame.id });
			createFrameNode(facade, "Regular");

			const result = pencil_search_nodes(facade, { reusable: true });
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.nodes).toHaveLength(1);
			expect(result.data.nodes[0]?.name).toBe("Component");
		});

		it("returns all nodes when no filters", () => {
			const facade = createFacade();
			createFrameNode(facade);
			createRectNode(facade);

			const result = pencil_search_nodes(facade, {});
			expect(result.success).toBe(true);
			if (!result.success) return;
			// Includes root + 2 created nodes
			expect(result.data.nodes.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("pencil_get_selection", () => {
		it("returns provided selectedIds", () => {
			const facade = createFacade();
			const result = pencil_get_selection(facade, {
				selectedIds: ["a", "b"],
			});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.selectedIds).toEqual(["a", "b"]);
		});

		it("returns empty array when no selection", () => {
			const facade = createFacade();
			const result = pencil_get_selection(facade, {});
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.selectedIds).toEqual([]);
		});

		it("handles undefined input", () => {
			const facade = createFacade();
			const result = pencil_get_selection(facade, undefined);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.selectedIds).toEqual([]);
		});
	});
});

// ===========================================================================
// Parity Matrix
// ===========================================================================

describe("parity-matrix", () => {
	it("has entries for all implemented tools", () => {
		const implemented = PARITY_MATRIX.filter((e) => e.status === "implemented");
		expect(implemented.length).toBe(30);
	});

	it("has no duplicate tool names", () => {
		const names = PARITY_MATRIX.map((e) => e.name);
		const unique = new Set(names);
		expect(unique.size).toBe(names.length);
	});

	it("getParitySummary returns correct counts", () => {
		const summary = getParitySummary();
		expect(summary.implemented).toBe(30);
		expect(summary.total).toBe(PARITY_MATRIX.length);
		expect(summary.implemented + summary.planned + summary.notApplicable).toBe(
			summary.total,
		);
	});

	it("all entries have valid status", () => {
		for (const entry of PARITY_MATRIX) {
			expect(["implemented", "planned", "not-applicable"]).toContain(
				entry.status,
			);
		}
	});

	it("all entries have non-empty name and category", () => {
		for (const entry of PARITY_MATRIX) {
			expect(entry.name.length).toBeGreaterThan(0);
			expect(entry.category.length).toBeGreaterThan(0);
		}
	});
});
