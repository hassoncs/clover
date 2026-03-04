import type {
	PenConnection,
	PenDocument,
	PenFrame,
	PenNode,
	PenRectangle,
	PenRef,
	PenText,
} from "@slopcade/shared/types/pen";
import { beforeEach, describe, expect, it } from "vitest";
import { penDocumentToSceneGraph, sceneGraphToPenDocument } from "../adapters";
import { resetIdCounter } from "../scene-graph";

beforeEach(() => {
	resetIdCounter();
});

// ---------------------------------------------------------------------------
// Fixture 1: Simple frame with children
// ---------------------------------------------------------------------------

const SIMPLE_FRAME_DOC: PenDocument = {
	version: 1,
	variables: {
		"primary-color": { type: "color", value: "#FF0000" },
	},
	themes: [{ name: "mode", values: ["light", "dark"], default: "light" }],
	children: [
		{
			type: "frame",
			id: "screen1",
			name: "Main Screen",
			x: 0,
			y: 0,
			width: 1024,
			height: 768,
			layout: "vertical",
			gap: 16,
			padding: [24, 24, 24, 24],
			fill: "#FFFFFF",
			clip: true,
			children: [
				{
					type: "text",
					id: "title",
					name: "Title",
					content: "Hello World",
					fontSize: 24,
					fontWeight: "bold",
					x: 0,
					y: 0,
				},
				{
					type: "rectangle",
					id: "divider",
					name: "Divider",
					x: 0,
					y: 40,
					width: 1024,
					height: 2,
					fill: "#CCCCCC",
					cornerRadius: 1,
				},
				{
					type: "frame",
					id: "content",
					name: "Content Area",
					x: 0,
					y: 50,
					width: 1024,
					height: 600,
					layout: "horizontal",
					gap: 8,
					children: [
						{
							type: "text",
							id: "body-text",
							content: "Body content goes here",
							x: 0,
							y: 0,
						},
					],
				},
			],
		},
	],
};

// ---------------------------------------------------------------------------
// Fixture 2: Nested ref with descendants overrides
// ---------------------------------------------------------------------------

const REF_WITH_DESCENDANTS_DOC: PenDocument = {
	version: 1,
	children: [
		{
			type: "frame",
			id: "button-component",
			name: "Button",
			reusable: true,
			width: 120,
			height: 40,
			fill: "#007AFF",
			cornerRadius: 8,
			layout: "horizontal",
			alignItems: "center",
			justifyContent: "center",
			children: [
				{
					type: "text",
					id: "btn-label",
					content: "Click Me",
					fontSize: 14,
					fontWeight: "600",
					fill: "#FFFFFF",
				},
			],
		},
		{
			type: "ref",
			id: "submit-btn",
			ref: "button-component",
			x: 100,
			y: 200,
			width: 200,
			descendants: {
				"btn-label": { content: "Submit" },
			},
		},
		{
			type: "ref",
			id: "cancel-btn",
			ref: "button-component",
			x: 320,
			y: 200,
			descendants: {
				"btn-label": { content: "Cancel", fill: "#FF3B30" },
			},
		},
	],
};

// ---------------------------------------------------------------------------
// Fixture 3: Connection nodes
// ---------------------------------------------------------------------------

const CONNECTION_DOC: PenDocument = {
	version: 1,
	children: [
		{
			type: "frame",
			id: "node-a",
			name: "Node A",
			x: 100,
			y: 100,
			width: 200,
			height: 100,
			fill: "#E8F5E9",
		},
		{
			type: "frame",
			id: "node-b",
			name: "Node B",
			x: 400,
			y: 100,
			width: 200,
			height: 100,
			fill: "#E3F2FD",
		},
		{
			type: "connection",
			id: "conn-1",
			fromId: "node-a",
			toId: "node-b",
		},
	],
};

describe("penDocumentToSceneGraph", () => {
	it("flattens a nested document into a flat map", () => {
		const graph = penDocumentToSceneGraph(SIMPLE_FRAME_DOC);

		// Root + screen1 + title + divider + content + body-text = 6 nodes + virtual root
		expect(graph.nodeCount).toBe(6);

		const screen = graph.getNode("screen1");
		expect(screen).toBeDefined();
		expect(screen!.type).toBe("frame");
		expect(screen!.parentId).toBe(graph.rootId);
		expect(screen!.childIds).toEqual(["title", "divider", "content"]);

		const title = graph.getNode("title");
		expect(title).toBeDefined();
		expect(title!.type).toBe("text");
		expect(title!.parentId).toBe("screen1");
		expect(title!.content).toBe("Hello World");

		const content = graph.getNode("content");
		expect(content).toBeDefined();
		expect(content!.childIds).toEqual(["body-text"]);

		const bodyText = graph.getNode("body-text");
		expect(bodyText).toBeDefined();
		expect(bodyText!.parentId).toBe("content");
	});

	it("preserves variables and themes", () => {
		const graph = penDocumentToSceneGraph(SIMPLE_FRAME_DOC);

		expect(graph.variables.size).toBe(1);
		expect(graph.variables.get("primary-color")).toEqual({
			type: "color",
			value: "#FF0000",
		});

		expect(graph.themes).toHaveLength(1);
		expect(graph.themes[0].name).toBe("mode");
	});

	it("handles ref nodes with descendants", () => {
		const graph = penDocumentToSceneGraph(REF_WITH_DESCENDANTS_DOC);

		const submitBtn = graph.getNode("submit-btn");
		expect(submitBtn).toBeDefined();
		expect(submitBtn!.type).toBe("ref");
		expect(submitBtn!.ref).toBe("button-component");
		expect(submitBtn!.x).toBe(100);
		expect(submitBtn!.width).toBe(200);
		expect(submitBtn!.descendants).toEqual({
			"btn-label": { content: "Submit" },
		});
	});

	it("handles connection nodes", () => {
		const graph = penDocumentToSceneGraph(CONNECTION_DOC);

		const conn = graph.getNode("conn-1");
		expect(conn).toBeDefined();
		expect(conn!.type).toBe("connection");
		expect(conn!.fromId).toBe("node-a");
		expect(conn!.toId).toBe("node-b");
	});
});

describe("sceneGraphToPenDocument", () => {
	it("reconstructs nested tree from flat graph", () => {
		const graph = penDocumentToSceneGraph(SIMPLE_FRAME_DOC);
		const result = sceneGraphToPenDocument(graph);

		expect(result.version).toBe(1);
		expect(result.children).toHaveLength(1);

		const screen = result.children[0] as PenFrame;
		expect(screen.type).toBe("frame");
		expect(screen.id).toBe("screen1");
		expect(screen.children).toHaveLength(3);

		const title = screen.children![0] as PenText;
		expect(title.type).toBe("text");
		expect(title.content).toBe("Hello World");

		const divider = screen.children![1] as PenRectangle;
		expect(divider.type).toBe("rectangle");
		expect(divider.cornerRadius).toBe(1);

		const content = screen.children![2] as PenFrame;
		expect(content.type).toBe("frame");
		expect(content.children).toHaveLength(1);
		expect((content.children![0] as PenText).content).toBe(
			"Body content goes here",
		);
	});

	it("preserves variables and themes in output", () => {
		const graph = penDocumentToSceneGraph(SIMPLE_FRAME_DOC);
		const result = sceneGraphToPenDocument(graph);

		expect(result.variables).toBeDefined();
		expect(result.variables!["primary-color"]).toEqual({
			type: "color",
			value: "#FF0000",
		});

		expect(result.themes).toBeDefined();
		expect(result.themes).toHaveLength(1);
		expect(result.themes![0].name).toBe("mode");
	});

	it("reconstructs ref nodes with descendants", () => {
		const graph = penDocumentToSceneGraph(REF_WITH_DESCENDANTS_DOC);
		const result = sceneGraphToPenDocument(graph);

		expect(result.children).toHaveLength(3);

		const submitBtn = result.children[1] as PenRef;
		expect(submitBtn.type).toBe("ref");
		expect(submitBtn.ref).toBe("button-component");
		expect(submitBtn.descendants).toEqual({
			"btn-label": { content: "Submit" },
		});

		const cancelBtn = result.children[2] as PenRef;
		expect(cancelBtn.type).toBe("ref");
		expect(cancelBtn.descendants).toEqual({
			"btn-label": { content: "Cancel", fill: "#FF3B30" },
		});
	});

	it("reconstructs connection nodes", () => {
		const graph = penDocumentToSceneGraph(CONNECTION_DOC);
		const result = sceneGraphToPenDocument(graph);

		const conn = result.children[2] as PenConnection;
		expect(conn.type).toBe("connection");
		expect(conn.fromId).toBe("node-a");
		expect(conn.toId).toBe("node-b");
	});
});

describe("roundtrip: PenDocument → SceneGraph → PenDocument", () => {
	it("simple frame document roundtrips to structurally equal output", () => {
		const graph = penDocumentToSceneGraph(SIMPLE_FRAME_DOC);
		const result = sceneGraphToPenDocument(graph);

		expect(result).toEqual(SIMPLE_FRAME_DOC);
	});

	it("ref with descendants document roundtrips to structurally equal output", () => {
		const graph = penDocumentToSceneGraph(REF_WITH_DESCENDANTS_DOC);
		const result = sceneGraphToPenDocument(graph);

		expect(result).toEqual(REF_WITH_DESCENDANTS_DOC);
	});

	it("connection document roundtrips to structurally equal output", () => {
		const graph = penDocumentToSceneGraph(CONNECTION_DOC);
		const result = sceneGraphToPenDocument(graph);

		expect(result).toEqual(CONNECTION_DOC);
	});
});

describe("SceneGraph mutation APIs", () => {
	it("getChildren returns ordered children", () => {
		const graph = penDocumentToSceneGraph(SIMPLE_FRAME_DOC);
		const children = graph.getChildren("screen1");

		expect(children).toHaveLength(3);
		expect(children[0].id).toBe("title");
		expect(children[1].id).toBe("divider");
		expect(children[2].id).toBe("content");
	});

	it("isDescendant correctly identifies ancestry", () => {
		const graph = penDocumentToSceneGraph(SIMPLE_FRAME_DOC);

		expect(graph.isDescendant("body-text", "content")).toBe(true);
		expect(graph.isDescendant("body-text", "screen1")).toBe(true);
		expect(graph.isDescendant("body-text", graph.rootId)).toBe(true);
		expect(graph.isDescendant("title", "content")).toBe(false);
		expect(graph.isDescendant("screen1", "body-text")).toBe(false);
	});

	it("getAbsolutePosition accumulates parent positions", () => {
		const graph = penDocumentToSceneGraph(SIMPLE_FRAME_DOC);

		const screenPos = graph.getAbsolutePosition("screen1");
		expect(screenPos).toEqual({ x: 0, y: 0 });

		const contentPos = graph.getAbsolutePosition("content");
		expect(contentPos).toEqual({ x: 0, y: 50 });

		const bodyPos = graph.getAbsolutePosition("body-text");
		expect(bodyPos).toEqual({ x: 0, y: 50 });
	});

	it("createNode adds a new node to the graph", () => {
		const graph = penDocumentToSceneGraph(SIMPLE_FRAME_DOC);
		const initialCount = graph.nodeCount;

		const newNode = graph.createNode("rectangle", "screen1", {
			name: "New Rect",
			width: 50,
			height: 50,
		});

		expect(graph.nodeCount).toBe(initialCount + 1);
		expect(graph.getNode(newNode.id)).toBe(newNode);
		expect(newNode.parentId).toBe("screen1");

		const screen = graph.getNode("screen1");
		expect(screen!.childIds).toContain(newNode.id);
	});

	it("deleteNode removes node and its children recursively", () => {
		const graph = penDocumentToSceneGraph(SIMPLE_FRAME_DOC);

		graph.deleteNode("content");

		expect(graph.getNode("content")).toBeUndefined();
		expect(graph.getNode("body-text")).toBeUndefined();

		const screen = graph.getNode("screen1");
		expect(screen!.childIds).not.toContain("content");
	});

	it("reparentNode moves node to new parent preserving absolute position", () => {
		const graph = penDocumentToSceneGraph(SIMPLE_FRAME_DOC);

		const titleAbsBefore = graph.getAbsolutePosition("title");
		graph.reparentNode("title", "content");

		const title = graph.getNode("title");
		expect(title!.parentId).toBe("content");

		const screen = graph.getNode("screen1");
		expect(screen!.childIds).not.toContain("title");

		const content = graph.getNode("content");
		expect(content!.childIds).toContain("title");

		const titleAbsAfter = graph.getAbsolutePosition("title");
		expect(titleAbsAfter.x).toBe(titleAbsBefore.x);
		expect(titleAbsAfter.y).toBe(titleAbsBefore.y);
	});

	it("reorderChild changes child position within parent", () => {
		const graph = penDocumentToSceneGraph(SIMPLE_FRAME_DOC);

		graph.reorderChild("title", "screen1", 2);

		const screen = graph.getNode("screen1");
		expect(screen!.childIds).toEqual(["divider", "content", "title"]);
	});

	it("updateNode modifies node fields", () => {
		const graph = penDocumentToSceneGraph(SIMPLE_FRAME_DOC);

		graph.updateNode("title", { name: "Updated Title", fontSize: 32 });

		const title = graph.getNode("title");
		expect(title!.name).toBe("Updated Title");
		expect(title!.fontSize).toBe(32);
	});
});

describe("SceneGraph edge cases", () => {
	it("document with no variables or themes roundtrips cleanly", () => {
		const doc: PenDocument = {
			version: 1,
			children: [{ type: "text", id: "t1", content: "Hello" }],
		};

		const graph = penDocumentToSceneGraph(doc);
		const result = sceneGraphToPenDocument(graph);

		expect(result).toEqual(doc);
		expect(result.variables).toBeUndefined();
		expect(result.themes).toBeUndefined();
	});

	it("empty document roundtrips", () => {
		const doc: PenDocument = {
			version: 1,
			children: [],
		};

		const graph = penDocumentToSceneGraph(doc);
		const result = sceneGraphToPenDocument(graph);

		expect(result).toEqual(doc);
	});

	it("handles all leaf node types in roundtrip", () => {
		const doc: PenDocument = {
			version: 1,
			children: [
				{ type: "ellipse", id: "e1", fill: "#FF0000" },
				{ type: "line", id: "l1", stroke: { thickness: 2 } },
				{ type: "polygon", id: "p1", polygonCount: 6 },
				{ type: "path", id: "pa1", geometry: "M 0 0 L 100 100" },
				{ type: "icon_font", id: "if1", icon: "star" },
				{ type: "note", id: "n1", content: "A note" },
				{
					type: "image",
					id: "img1",
					url: "https://example.com/img.png",
					fit: "cover",
				},
			],
		};

		const graph = penDocumentToSceneGraph(doc);
		const result = sceneGraphToPenDocument(graph);

		expect(result).toEqual(doc);
	});

	it("deeply nested frames roundtrip", () => {
		const doc: PenDocument = {
			version: 1,
			children: [
				{
					type: "frame",
					id: "level1",
					children: [
						{
							type: "frame",
							id: "level2",
							children: [
								{
									type: "frame",
									id: "level3",
									children: [
										{ type: "text", id: "deep-text", content: "Deep" },
									],
								},
							],
						},
					],
				},
			],
		};

		const graph = penDocumentToSceneGraph(doc);
		expect(graph.isDescendant("deep-text", "level1")).toBe(true);

		const result = sceneGraphToPenDocument(graph);
		expect(result).toEqual(doc);
	});

	it("group nodes with children roundtrip", () => {
		const doc: PenDocument = {
			version: 1,
			children: [
				{
					type: "group",
					id: "g1",
					name: "My Group",
					layout: "horizontal",
					gap: 10,
					children: [
						{ type: "rectangle", id: "r1", width: 50, height: 50 },
						{ type: "rectangle", id: "r2", width: 50, height: 50 },
					],
				},
			],
		};

		const graph = penDocumentToSceneGraph(doc);
		const result = sceneGraphToPenDocument(graph);

		expect(result).toEqual(doc);
	});
});

describe("edge case fixture suite (Task 9)", () => {
	// Edge case 1: Malformed data — missing required fields
	it("handles document with nodes missing optional fields", () => {
		const doc: PenDocument = {
			version: 1,
			children: [
				{ type: "frame", id: "f1" }, // no children, no layout
				{ type: "rectangle", id: "r1" }, // no position or size
				{ type: "text", id: "t1", content: "" }, // empty content
			],
		};
		const graph = penDocumentToSceneGraph(doc);
		const result = sceneGraphToPenDocument(graph);
		expect(result.children).toHaveLength(3);
		expect(result.children[0].type).toBe("frame");
		expect(result.children[1].type).toBe("rectangle");
		expect(result.children[2].type).toBe("text");
	});

	// Edge case 2: Large document (100 nodes)
	it("handles large document with 100 nodes", () => {
		const children: PenNode[] = Array.from({ length: 100 }, (_, i) => ({
			type: "rectangle" as const,
			id: `rect-${i}`,
			x: i * 10,
			y: 0,
			width: 8,
			height: 8,
		}));
		const doc: PenDocument = { version: 1, children };
		const graph = penDocumentToSceneGraph(doc);
		const result = sceneGraphToPenDocument(graph);
		expect(result.children).toHaveLength(100);
		expect(result.children[99]).toEqual(children[99]);
	});

	// Edge case 3: Ref with nested descendants override
	it("ref with nested descendants roundtrips", () => {
		const doc: PenDocument = {
			version: 1,
			children: [
				{
					type: "frame",
					id: "comp",
					reusable: true,
					children: [{ type: "text", id: "label", content: "Default" }],
				},
				{
					type: "ref",
					id: "inst1",
					ref: "comp",
					descendants: { label: { content: "Override" } as Record<string, unknown> },
				},
			],
		};
		const graph = penDocumentToSceneGraph(doc);
		const result = sceneGraphToPenDocument(graph);
		const ref = result.children.find((n) => n.type === "ref") as PenRef;
		expect(ref).toBeDefined();
		expect(ref.ref).toBe("comp");
		// descendants is Record<string, unknown> — access via type assertion
		const descendants = ref.descendants as Record<string, Record<string, unknown>> | undefined;
		expect(descendants?.label?.content).toBe("Override");
	});

	// Edge case 4: Variables with theme bindings
	it("variables and themes roundtrip", () => {
		const doc: PenDocument = {
			version: 1,
			children: [],
			variables: {
				primary: { type: "color" as const, value: "#3b82f6" },
				secondary: { type: "color" as const, value: "#10b981" },
			},
			themes: [{ name: "light", values: [] }, { name: "dark", values: [] }],
		};
		const graph = penDocumentToSceneGraph(doc);
		const result = sceneGraphToPenDocument(graph);
		expect(result.variables?.primary?.value).toBe("#3b82f6");
		expect(result.variables?.secondary?.value).toBe("#10b981");
		expect(result.themes).toHaveLength(2);
	});

	// Edge case 5: Multiple connections between nodes
	it("multiple connections roundtrip", () => {
		const doc: PenDocument = {
			version: 1,
			children: [
				{ type: "rectangle", id: "a" },
				{ type: "rectangle", id: "b" },
				{ type: "rectangle", id: "c" },
				{ type: "connection", id: "conn1", fromId: "a", toId: "b" },
				{ type: "connection", id: "conn2", fromId: "b", toId: "c" },
				{ type: "connection", id: "conn3", fromId: "a", toId: "c" },
			],
		};
		const graph = penDocumentToSceneGraph(doc);
		const result = sceneGraphToPenDocument(graph);
		const connections = result.children.filter((n) => n.type === "connection");
		expect(connections).toHaveLength(3);
	});

	// Edge case 6: Frame with all layout modes
	it("frames with all layout modes roundtrip", () => {
		const doc: PenDocument = {
			version: 1,
			children: [
				{ type: "frame", id: "none", layout: "none" },
				{ type: "frame", id: "horiz", layout: "horizontal", gap: 8 },
				{ type: "frame", id: "vert", layout: "vertical", gap: 16 },
				{ type: "frame", id: "wrap", layout: "wrap", gap: 4 },
			],
		};
		const graph = penDocumentToSceneGraph(doc);
		const result = sceneGraphToPenDocument(graph);
		const frames = result.children as PenFrame[];
		expect(frames[0].layout).toBe("none");
		expect(frames[1].layout).toBe("horizontal");
		expect(frames[2].layout).toBe("vertical");
		expect(frames[3].layout).toBe("wrap");
	});

	// Edge case 7: Deeply nested 10-level tree
	it("10-level deep nesting roundtrips without structural drift", () => {
		function makeNested(depth: number): PenFrame {
			if (depth === 0) return { type: "frame", id: `leaf` };
			return {
				type: "frame",
				id: `level-${depth}`,
				children: [makeNested(depth - 1)],
			};
		}
		const doc: PenDocument = { version: 1, children: [makeNested(10)] };
		const graph = penDocumentToSceneGraph(doc);
		expect(graph.isDescendant("leaf", "level-10")).toBe(true);
		const result = sceneGraphToPenDocument(graph);
		expect(result).toEqual(doc);
	});

	// Edge case 8: Node with all visual properties
	it("node with all visual properties roundtrips", () => {
		const doc: PenDocument = {
			version: 1,
			children: [
				{
					type: "frame",
					id: "rich",
					x: 10, y: 20, width: 200, height: 100,
					opacity: 0.8,
					rotation: 45,
					fill: { type: "color" as const, color: "#ff0000" },
					stroke: { fill: "#000000" },
					cornerRadius: 8,
					clip: true,
					effects: [{ shadow: { color: "#00000040", offsetX: 0, offsetY: 4, blur: 4 } }],
				},
			],
		};
		const graph = penDocumentToSceneGraph(doc);
		const result = sceneGraphToPenDocument(graph);
		const frame = result.children[0] as PenFrame;
		expect(frame.x).toBe(10);
		expect(frame.opacity).toBe(0.8);
		expect(frame.cornerRadius).toBe(8);
		expect(frame.clip).toBe(true);
		expect(frame.effects).toHaveLength(1);
	});

	// Edge case 9: Mixed node types in same document
	it("document with all node types roundtrips", () => {
		const doc: PenDocument = {
			version: 1,
			children: [
				{ type: "frame", id: "f1" },
				{ type: "group", id: "g1" },
				{ type: "rectangle", id: "r1" },
				{ type: "ellipse", id: "e1" },
				{ type: "text", id: "t1", content: "Hello" },
				{ type: "line", id: "l1" },
				{ type: "polygon", id: "p1" },
				{ type: "note", id: "n1", content: "A note" },
			],
		};
		const graph = penDocumentToSceneGraph(doc);
		const result = sceneGraphToPenDocument(graph);
		expect(result.children).toHaveLength(8);
		const types = result.children.map((n) => n.type);
		expect(types).toContain("frame");
		expect(types).toContain("group");
		expect(types).toContain("rectangle");
		expect(types).toContain("ellipse");
		expect(types).toContain("text");
		expect(types).toContain("line");
		expect(types).toContain("polygon");
		expect(types).toContain("note");
	});

	// Edge case 10: Mutation after roundtrip preserves integrity
	it("mutation after roundtrip does not corrupt graph", () => {
		const doc: PenDocument = {
			version: 1,
			children: [
				{
					type: "frame",
					id: "parent",
					children: [{ type: "rectangle", id: "child", x: 0, y: 0 }],
				},
			],
		};
		const graph = penDocumentToSceneGraph(doc);
		// Mutate after roundtrip
		graph.updateNode("child", { x: 50, y: 50 });
		const result = sceneGraphToPenDocument(graph);
		const parent = result.children[0] as PenFrame;
		const child = parent.children?.[0] as PenRectangle;
		expect(child.x).toBe(50);
		expect(child.y).toBe(50);
	});
});

