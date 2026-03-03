/**
 * .fig codec roundtrip tests
 *
 * Tests the full import/export pipeline:
 *   SceneGraph → exportFig → .fig buffer → importFig → SceneGraph
 *
 * Also tests unsupported feature handling (warnings, no crashes).
 */

import { describe, expect, it } from "vitest";
import { SceneGraph } from "../../runtime/scene-graph";
import { decodeFigBuffer, encodeFigBuffer } from "../fig-codec";
import { exportFig } from "../fig-export";
import { importFig } from "../fig-import";
import type { FigMessage, FigNodeChange } from "../fig-types";
import {
	SUPPORTED_NODE_TYPES,
	UNSUPPORTED_NODE_TYPES,
} from "../support-matrix";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGuid(session: number, local: number) {
	return { sessionID: session, localID: local };
}

function makeTransform(x: number, y: number) {
	return { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y };
}

function makeNodeChange(
	localID: number,
	parentLocalID: number,
	overrides: Partial<FigNodeChange> = {},
): FigNodeChange {
	return {
		guid: makeGuid(1, localID),
		parentIndex: {
			guid: makeGuid(1, parentLocalID),
			position: String.fromCharCode("!".charCodeAt(0) + localID),
		},
		phase: "CREATED",
		visible: true,
		opacity: 1,
		strokeWeight: 1,
		strokeAlign: "CENTER",
		strokeJoin: "MITER",
		transform: makeTransform(0, 0),
		size: { x: 100, y: 100 },
		...overrides,
	};
}

function buildTestMessage(nodeChanges: FigNodeChange[]): FigMessage {
	return {
		type: "NODE_CHANGES",
		sessionID: 0,
		ackID: 0,
		nodeChanges,
	};
}

function buildMinimalFigFile(nodeChanges: FigNodeChange[]): ArrayBuffer {
	const message = buildTestMessage([
		// Document node
		{
			guid: makeGuid(0, 0),
			type: "DOCUMENT",
			name: "Document",
			phase: "CREATED",
			visible: true,
			opacity: 1,
			transform: makeTransform(0, 0),
			strokeWeight: 1,
			strokeAlign: "CENTER",
			strokeJoin: "MITER",
		},
		// Canvas (page) node
		{
			guid: makeGuid(0, 1),
			parentIndex: { guid: makeGuid(0, 0), position: "!" },
			type: "CANVAS",
			name: "Page 1",
			phase: "CREATED",
			visible: true,
			opacity: 1,
			transform: makeTransform(0, 0),
			strokeWeight: 1,
			strokeAlign: "CENTER",
			strokeJoin: "MITER",
		},
		// User-provided nodes (children of canvas)
		...nodeChanges.map((nc) => ({
			...nc,
			parentIndex: nc.parentIndex ?? {
				guid: makeGuid(0, 1),
				position: String.fromCharCode(
					"!".charCodeAt(0) + (nc.guid.localID % 26),
				),
			},
		})),
	]);
	return encodeFigBuffer(message);
}

// ---------------------------------------------------------------------------
// Codec roundtrip (encode → decode)
// ---------------------------------------------------------------------------

describe("fig-codec roundtrip", () => {
	it("encodes and decodes a minimal message", () => {
		const message = buildTestMessage([
			{
				guid: makeGuid(0, 0),
				type: "DOCUMENT",
				name: "Test",
				phase: "CREATED",
				visible: true,
				opacity: 1,
				transform: makeTransform(0, 0),
				strokeWeight: 1,
				strokeAlign: "CENTER",
				strokeJoin: "MITER",
			},
		]);

		const buffer = encodeFigBuffer(message);
		expect(buffer).toBeInstanceOf(ArrayBuffer);
		expect(buffer.byteLength).toBeGreaterThan(0);

		const decoded = decodeFigBuffer(buffer);
		expect(decoded.type).toBe("NODE_CHANGES");
		expect(decoded.nodeChanges).toBeDefined();
		expect(decoded.nodeChanges!.length).toBe(1);
		expect(decoded.nodeChanges![0].name).toBe("Test");
	});
});

// ---------------------------------------------------------------------------
// Import tests
// ---------------------------------------------------------------------------

describe("importFig", () => {
	it("imports a rectangle node with position and size", () => {
		const buffer = buildMinimalFigFile([
			makeNodeChange(10, 1, {
				parentIndex: { guid: makeGuid(0, 1), position: "!" },
				type: "RECTANGLE",
				name: "MyRect",
				size: { x: 200, y: 150 },
				transform: makeTransform(50, 75),
			}),
		]);

		const { graph, warnings } = importFig(buffer);
		const children = graph.getChildren(graph.rootId);
		expect(children.length).toBe(1);

		const rect = children[0];
		expect(rect.type).toBe("rectangle");
		expect(rect.name).toBe("MyRect");
		expect(rect.width).toBe(200);
		expect(rect.height).toBe(150);
		expect(rect.x).toBe(50);
		expect(rect.y).toBe(75);
		expect(warnings.length).toBe(0);
	});

	it("imports a frame with auto-layout", () => {
		const buffer = buildMinimalFigFile([
			makeNodeChange(10, 1, {
				parentIndex: { guid: makeGuid(0, 1), position: "!" },
				type: "FRAME",
				name: "AutoFrame",
				stackMode: "VERTICAL",
				stackSpacing: 16,
				stackVerticalPadding: 12,
				stackHorizontalPadding: 8,
			}),
		]);

		const { graph } = importFig(buffer);
		const children = graph.getChildren(graph.rootId);
		expect(children.length).toBe(1);

		const frame = children[0];
		expect(frame.type).toBe("frame");
		expect(frame.layout).toBe("vertical");
		expect(frame.gap).toBe(16);
		expect(frame.padding).toEqual([12, 8]);
	});

	it("imports a text node with font properties", () => {
		const buffer = buildMinimalFigFile([
			makeNodeChange(10, 1, {
				parentIndex: { guid: makeGuid(0, 1), position: "!" },
				type: "TEXT",
				name: "Label",
				fontSize: 24,
				fontName: { family: "Roboto", style: "Bold" },
				textData: { characters: "Hello World" },
				textAlignHorizontal: "CENTER",
			}),
		]);

		const { graph } = importFig(buffer);
		const children = graph.getChildren(graph.rootId);
		const text = children[0];
		expect(text.type).toBe("text");
		expect(text.content).toBe("Hello World");
		expect(text.fontSize).toBe(24);
		expect(text.fontFamily).toBe("Roboto");
		expect(text.fontWeight).toBe("700");
		expect(text.textAlign).toBe("center");
	});

	it("imports a node with solid fill", () => {
		const buffer = buildMinimalFigFile([
			makeNodeChange(10, 1, {
				parentIndex: { guid: makeGuid(0, 1), position: "!" },
				type: "RECTANGLE",
				name: "Filled",
				fillPaints: [
					{
						type: "SOLID",
						color: { r: 1, g: 0, b: 0, a: 1 },
						opacity: 0.8,
						visible: true,
						blendMode: "NORMAL",
					},
				],
			}),
		]);

		const { graph } = importFig(buffer);
		const rect = graph.getChildren(graph.rootId)[0];
		expect(rect.fill).toBeDefined();
		const fill = rect.fill as { type: string; color: string; opacity?: number };
		expect(fill.type).toBe("color");
		expect(fill.color).toBe("#ff0000");
		expect(fill.opacity).toBe(0.8);
	});

	it("imports a node with stroke", () => {
		const buffer = buildMinimalFigFile([
			makeNodeChange(10, 1, {
				parentIndex: { guid: makeGuid(0, 1), position: "!" },
				type: "RECTANGLE",
				name: "Stroked",
				strokePaints: [
					{
						type: "SOLID",
						color: { r: 0, g: 0, b: 1, a: 1 },
						opacity: 1,
						visible: true,
						blendMode: "NORMAL",
					},
				],
				strokeWeight: 3,
				strokeAlign: "INSIDE",
				strokeCap: "ROUND",
				strokeJoin: "ROUND",
			}),
		]);

		const { graph } = importFig(buffer);
		const rect = graph.getChildren(graph.rootId)[0];
		expect(rect.stroke).toBeDefined();
		expect(rect.stroke!.thickness).toBe(3);
		expect(rect.stroke!.align).toBe("inside");
		expect(rect.stroke!.cap).toBe("round");
		expect(rect.stroke!.join).toBe("round");
	});

	it("imports a node with corner radii", () => {
		const buffer = buildMinimalFigFile([
			makeNodeChange(10, 1, {
				parentIndex: { guid: makeGuid(0, 1), position: "!" },
				type: "RECTANGLE",
				name: "Rounded",
				cornerRadius: 8,
			}),
		]);

		const { graph } = importFig(buffer);
		const rect = graph.getChildren(graph.rootId)[0];
		expect(rect.cornerRadius).toBe(8);
	});

	it("imports independent corner radii", () => {
		const buffer = buildMinimalFigFile([
			makeNodeChange(10, 1, {
				parentIndex: { guid: makeGuid(0, 1), position: "!" },
				type: "RECTANGLE",
				name: "IndepRounded",
				rectangleCornerRadiiIndependent: true,
				rectangleTopLeftCornerRadius: 4,
				rectangleTopRightCornerRadius: 8,
				rectangleBottomRightCornerRadius: 12,
				rectangleBottomLeftCornerRadius: 16,
			}),
		]);

		const { graph } = importFig(buffer);
		const rect = graph.getChildren(graph.rootId)[0];
		expect(rect.cornerRadius).toEqual([4, 8, 12, 16]);
	});

	it("imports effects (drop shadow, blur)", () => {
		const buffer = buildMinimalFigFile([
			makeNodeChange(10, 1, {
				parentIndex: { guid: makeGuid(0, 1), position: "!" },
				type: "RECTANGLE",
				name: "WithEffects",
				effects: [
					{
						type: "DROP_SHADOW",
						color: { r: 0, g: 0, b: 0, a: 0.5 },
						offset: { x: 2, y: 4 },
						radius: 8,
						spread: 0,
						visible: true,
					},
					{
						type: "LAYER_BLUR",
						radius: 4,
						visible: true,
					},
				],
			}),
		]);

		const { graph } = importFig(buffer);
		const rect = graph.getChildren(graph.rootId)[0];
		expect(rect.effects).toBeDefined();
		expect(rect.effects!.length).toBe(2);
		expect(rect.effects![0].shadow).toBeDefined();
		expect(rect.effects![0].shadow!.blur).toBe(8);
		expect(rect.effects![0].shadow!.offsetX).toBe(2);
		expect(rect.effects![0].shadow!.offsetY).toBe(4);
		expect(rect.effects![1].blur).toBe(4);
	});

	it("imports nested frame hierarchy", () => {
		const buffer = buildMinimalFigFile([
			makeNodeChange(10, 1, {
				parentIndex: { guid: makeGuid(0, 1), position: "!" },
				type: "FRAME",
				name: "Parent",
				size: { x: 400, y: 300 },
			}),
			makeNodeChange(11, 10, {
				parentIndex: { guid: makeGuid(1, 10), position: "!" },
				type: "RECTANGLE",
				name: "Child",
				size: { x: 50, y: 50 },
			}),
		]);

		const { graph } = importFig(buffer);
		const topChildren = graph.getChildren(graph.rootId);
		expect(topChildren.length).toBe(1);
		expect(topChildren[0].name).toBe("Parent");

		const nested = graph.getChildren(topChildren[0].id);
		expect(nested.length).toBe(1);
		expect(nested[0].name).toBe("Child");
		expect(nested[0].type).toBe("rectangle");
	});
});

// ---------------------------------------------------------------------------
// Unsupported feature handling
// ---------------------------------------------------------------------------

describe("unsupported features", () => {
	it("emits warning for unsupported node types without crashing", () => {
		const buffer = buildMinimalFigFile([
			makeNodeChange(10, 1, {
				parentIndex: { guid: makeGuid(0, 1), position: "!" },
				type: "BOOLEAN_OPERATION",
				name: "BoolOp",
			}),
			makeNodeChange(11, 1, {
				parentIndex: { guid: makeGuid(0, 1), position: "#" },
				type: "RECTANGLE",
				name: "ValidRect",
			}),
		]);

		const { graph, warnings } = importFig(buffer);

		// The valid rectangle should still be imported
		const children = graph.getChildren(graph.rootId);
		expect(children.length).toBe(1);
		expect(children[0].name).toBe("ValidRect");

		// Warning should be emitted for the boolean operation
		expect(warnings.length).toBeGreaterThanOrEqual(1);
		const boolWarning = warnings.find((w) =>
			w.feature.includes("BOOLEAN_OPERATION"),
		);
		expect(boolWarning).toBeDefined();
		expect(boolWarning!.type).toBe("unsupported");
	});

	it("emits warning for image fills without crashing", () => {
		const buffer = buildMinimalFigFile([
			makeNodeChange(10, 1, {
				parentIndex: { guid: makeGuid(0, 1), position: "!" },
				type: "RECTANGLE",
				name: "ImageRect",
				fillPaints: [
					{
						type: "IMAGE",
						visible: true,
						blendMode: "NORMAL",
						image: { hash: "abc123" },
					},
				],
			}),
		]);

		const { graph, warnings } = importFig(buffer);
		const children = graph.getChildren(graph.rootId);
		expect(children.length).toBe(1);

		const imageWarning = warnings.find((w) => w.feature.includes("Image"));
		expect(imageWarning).toBeDefined();
		expect(imageWarning!.type).toBe("unsupported");
	});

	it("support matrix covers all declared types", () => {
		for (const nodeType of Object.keys(SUPPORTED_NODE_TYPES)) {
			expect(typeof nodeType).toBe("string");
		}
		for (const unsupported of UNSUPPORTED_NODE_TYPES) {
			expect(unsupported in SUPPORTED_NODE_TYPES).toBe(false);
		}
	});
});

// ---------------------------------------------------------------------------
// Export → Import roundtrip
// ---------------------------------------------------------------------------

describe("export → import roundtrip", () => {
	it("roundtrips a simple rectangle", () => {
		const graph = new SceneGraph();
		graph.createNode("rectangle", graph.rootId, {
			name: "RoundtripRect",
			x: 100,
			y: 200,
			width: 300,
			height: 150,
			opacity: 0.9,
			visible: true,
			fill: { type: "color", color: "#ff6600" },
			cornerRadius: 12,
		});

		const { buffer, warnings: exportWarnings } = exportFig(graph);
		expect(buffer.byteLength).toBeGreaterThan(0);

		const { graph: imported, warnings: importWarnings } = importFig(buffer);
		const children = imported.getChildren(imported.rootId);
		expect(children.length).toBe(1);

		const rect = children[0];
		expect(rect.name).toBe("RoundtripRect");
		expect(rect.type).toBe("rectangle");
		expect(rect.x).toBeCloseTo(100, 0);
		expect(rect.y).toBeCloseTo(200, 0);
		expect(rect.width).toBeCloseTo(300, 0);
		expect(rect.height).toBeCloseTo(150, 0);
		expect(rect.opacity).toBeCloseTo(0.9, 1);
		expect(rect.cornerRadius).toBe(12);
	});

	it("roundtrips a text node", () => {
		const graph = new SceneGraph();
		graph.createNode("text", graph.rootId, {
			name: "RoundtripText",
			x: 10,
			y: 20,
			width: 200,
			height: 30,
			content: "Hello Roundtrip",
			fontSize: 18,
			fontFamily: "Inter",
			fontWeight: "700",
			textAlign: "center",
		});

		const { buffer } = exportFig(graph);
		const { graph: imported } = importFig(buffer);
		const children = imported.getChildren(imported.rootId);
		expect(children.length).toBe(1);

		const text = children[0];
		expect(text.type).toBe("text");
		expect(text.content).toBe("Hello Roundtrip");
		expect(text.fontSize).toBe(18);
		expect(text.fontFamily).toBe("Inter");
		expect(text.fontWeight).toBe("700");
		expect(text.textAlign).toBe("center");
	});

	it("roundtrips a frame with auto-layout and children", () => {
		const graph = new SceneGraph();
		const frame = graph.createNode("frame", graph.rootId, {
			name: "LayoutFrame",
			x: 0,
			y: 0,
			width: 400,
			height: 300,
			layout: "horizontal",
			gap: 12,
			padding: [8, 16, 8, 16],
			clip: true,
		});

		graph.createNode("rectangle", frame.id, {
			name: "Child1",
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			fill: { type: "color", color: "#00ff00" },
		});

		graph.createNode("rectangle", frame.id, {
			name: "Child2",
			x: 0,
			y: 0,
			width: 100,
			height: 100,
		});

		const { buffer } = exportFig(graph);
		const { graph: imported } = importFig(buffer);

		const topChildren = imported.getChildren(imported.rootId);
		expect(topChildren.length).toBe(1);

		const importedFrame = topChildren[0];
		expect(importedFrame.type).toBe("frame");
		expect(importedFrame.name).toBe("LayoutFrame");
		expect(importedFrame.layout).toBe("horizontal");
		expect(importedFrame.gap).toBe(12);
		expect(importedFrame.clip).toBe(true);

		const frameChildren = imported.getChildren(importedFrame.id);
		expect(frameChildren.length).toBe(2);
		expect(frameChildren[0].name).toBe("Child1");
		expect(frameChildren[1].name).toBe("Child2");
	});

	it("roundtrips stroke properties", () => {
		const graph = new SceneGraph();
		graph.createNode("rectangle", graph.rootId, {
			name: "StrokedRect",
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			stroke: {
				fill: { type: "color", color: "#0000ff" },
				thickness: 2,
				align: "inside",
				cap: "round",
				join: "round",
			},
		});

		const { buffer } = exportFig(graph);
		const { graph: imported } = importFig(buffer);
		const rect = imported.getChildren(imported.rootId)[0];

		expect(rect.stroke).toBeDefined();
		expect(rect.stroke!.thickness).toBe(2);
		expect(rect.stroke!.align).toBe("inside");
		expect(rect.stroke!.cap).toBe("round");
		expect(rect.stroke!.join).toBe("round");
	});

	it("roundtrips effects (shadow + blur)", () => {
		const graph = new SceneGraph();
		graph.createNode("rectangle", graph.rootId, {
			name: "EffectsRect",
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			effects: [
				{
					shadow: {
						color: "#00000080",
						offsetX: 4,
						offsetY: 4,
						blur: 10,
						spread: 2,
					},
				},
				{ blur: 5 },
			],
		});

		const { buffer } = exportFig(graph);
		const { graph: imported } = importFig(buffer);
		const rect = imported.getChildren(imported.rootId)[0];

		expect(rect.effects).toBeDefined();
		expect(rect.effects!.length).toBe(2);
		expect(rect.effects![0].shadow).toBeDefined();
		expect(rect.effects![0].shadow!.blur).toBe(10);
		expect(rect.effects![0].shadow!.offsetX).toBe(4);
		expect(rect.effects![1].blur).toBe(5);
	});

	it("roundtrips multiple node types", () => {
		const graph = new SceneGraph();
		graph.createNode("rectangle", graph.rootId, {
			name: "Rect",
			x: 0,
			y: 0,
			width: 100,
			height: 100,
		});
		graph.createNode("ellipse", graph.rootId, {
			name: "Ellipse",
			x: 200,
			y: 0,
			width: 80,
			height: 80,
		});
		graph.createNode("text", graph.rootId, {
			name: "Text",
			x: 400,
			y: 0,
			width: 200,
			height: 30,
			content: "Multi-type test",
		});

		const { buffer } = exportFig(graph);
		const { graph: imported } = importFig(buffer);
		const children = imported.getChildren(imported.rootId);

		expect(children.length).toBe(3);
		const types = children.map((c) => c.type).sort();
		expect(types).toEqual(["ellipse", "rectangle", "text"]);
	});

	it("roundtrips independent corner radii", () => {
		const graph = new SceneGraph();
		graph.createNode("rectangle", graph.rootId, {
			name: "IndepCorners",
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			cornerRadius: [4, 8, 12, 16],
		});

		const { buffer } = exportFig(graph);
		const { graph: imported } = importFig(buffer);
		const rect = imported.getChildren(imported.rootId)[0];
		expect(rect.cornerRadius).toEqual([4, 8, 12, 16]);
	});
});

// ---------------------------------------------------------------------------
// Fill roundtrip edge cases
// ---------------------------------------------------------------------------

describe("fill conversion edge cases", () => {
	it("roundtrips a gradient fill", () => {
		const graph = new SceneGraph();
		graph.createNode("rectangle", graph.rootId, {
			name: "GradientRect",
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			fill: {
				type: "gradient",
				gradientType: "linear",
				stops: [
					{ color: "#ff0000", position: 0 },
					{ color: "#0000ff", position: 1 },
				],
			},
		});

		const { buffer } = exportFig(graph);
		const { graph: imported } = importFig(buffer);
		const rect = imported.getChildren(imported.rootId)[0];
		expect(rect.fill).toBeDefined();

		const fill = rect.fill as {
			type: string;
			gradientType: string;
			stops: Array<{ color: string; position: number }>;
		};
		expect(fill.type).toBe("gradient");
		expect(fill.gradientType).toBe("linear");
		expect(fill.stops.length).toBe(2);
		expect(fill.stops[0].position).toBe(0);
		expect(fill.stops[1].position).toBe(1);
	});

	it("roundtrips a simple hex string fill via export", () => {
		const graph = new SceneGraph();
		graph.createNode("rectangle", graph.rootId, {
			name: "HexFill",
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			fill: "#aabbcc",
		});

		const { buffer } = exportFig(graph);
		const { graph: imported } = importFig(buffer);
		const rect = imported.getChildren(imported.rootId)[0];
		expect(rect.fill).toBeDefined();

		const fill = rect.fill as { type: string; color: string };
		expect(fill.type).toBe("color");
		expect(fill.color).toBe("#aabbcc");
	});
});
