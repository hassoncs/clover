import type {
	PenConnection,
	PenDocument,
	PenEllipse,
	PenFrame,
	PenGroup,
	PenIconFont,
	PenImage,
	PenLine,
	PenNode,
	PenNote,
	PenPath,
	PenPolygon,
	PenRectangle,
	PenRef,
	PenText,
	PenVariable,
} from "@slopcade/shared/types/pen";
import { RuntimeGraphError, type RuntimeNode, SceneGraph } from "./scene-graph";

// ---------------------------------------------------------------------------
// PenDocument → SceneGraph
// ---------------------------------------------------------------------------

/**
 * Convert a PenDocument (nested tree) into a flat SceneGraph (Map<id, RuntimeNode>).
 *
 * Each PenNode is flattened into a RuntimeNode with parentId/childIds indices.
 * PenDocument.variables and themes are stored on the SceneGraph directly.
 */
export function penDocumentToSceneGraph(doc: PenDocument): SceneGraph {
	const graph = new SceneGraph();

	if (doc.variables) {
		for (const [name, variable] of Object.entries(doc.variables)) {
			graph.variables.set(name, variable);
		}
	}

	if (doc.themes) {
		graph.themes = structuredClone(doc.themes);
	}

	for (const child of doc.children) {
		flattenNode(child, graph.rootId, graph);
	}

	return graph;
}

/**
 * Recursively flatten a PenNode into the SceneGraph.
 * Extracts children from container types and converts them to childIds references.
 */
function flattenNode(node: PenNode, parentId: string, graph: SceneGraph): void {
	const runtimeNode = penNodeToRuntimeNode(node, parentId);
	graph.insertNode(runtimeNode);

	const children = getNodeChildren(node);
	if (children) {
		for (const child of children) {
			flattenNode(child, node.id, graph);
		}
	}
}

/**
 * Convert a single PenNode into a RuntimeNode (without recursing into children).
 * Children are NOT included — they become separate RuntimeNodes linked via childIds.
 */
function penNodeToRuntimeNode(node: PenNode, parentId: string): RuntimeNode {
	const base: RuntimeNode = {
		id: node.id,
		type: node.type,
		parentId,
		childIds: [],
		// Base entity fields
		name: node.name,
		x: node.x,
		y: node.y,
		width: node.width,
		height: node.height,
		rotation: node.rotation,
		opacity: node.opacity,
		flipX: node.flipX,
		flipY: node.flipY,
		enabled: node.enabled,
		theme: node.theme,
		visible: node.visible,
	};

	switch (node.type) {
		case "frame":
			return applyFrameFields(base, node);
		case "group":
			return applyGroupFields(base, node);
		case "rectangle":
			return applyRectangleFields(base, node);
		case "ellipse":
			return applyEllipseFields(base, node);
		case "line":
			return applyLineFields(base, node);
		case "polygon":
			return applyPolygonFields(base, node);
		case "path":
			return applyPathFields(base, node);
		case "text":
			return applyTextField(base, node);
		case "icon_font":
			return applyIconFontFields(base, node);
		case "ref":
			return applyRefFields(base, node);
		case "note":
			return applyNoteFields(base, node);
		case "image":
			return applyImageFields(base, node);
		case "connection":
			return applyConnectionFields(base, node);
		default:
			return base;
	}
}

function applyFrameFields(base: RuntimeNode, node: PenFrame): RuntimeNode {
	base.layout = node.layout;
	base.gap = node.gap;
	base.padding = node.padding;
	base.justifyContent = node.justifyContent;
	base.alignItems = node.alignItems;
	base.fill = node.fill;
	base.stroke = node.stroke;
	base.cornerRadius = node.cornerRadius;
	base.clip = node.clip;
	base.effects = node.effects;
	base.reusable = node.reusable;
	base.slot = node.slot;
	base.placeholder = node.placeholder;
	base.aiGenerating = node.aiGenerating;
	return base;
}

function applyGroupFields(base: RuntimeNode, node: PenGroup): RuntimeNode {
	base.layout = node.layout;
	base.gap = node.gap;
	base.padding = node.padding;
	return base;
}

function applyRectangleFields(
	base: RuntimeNode,
	node: PenRectangle,
): RuntimeNode {
	base.fill = node.fill;
	base.stroke = node.stroke;
	base.cornerRadius = node.cornerRadius;
	base.effects = node.effects;
	return base;
}

function applyEllipseFields(base: RuntimeNode, node: PenEllipse): RuntimeNode {
	base.fill = node.fill;
	base.stroke = node.stroke;
	base.effects = node.effects;
	base.innerRadius = node.innerRadius;
	base.startAngle = node.startAngle;
	base.sweepAngle = node.sweepAngle;
	return base;
}

function applyLineFields(base: RuntimeNode, node: PenLine): RuntimeNode {
	base.stroke = node.stroke;
	return base;
}

function applyPolygonFields(base: RuntimeNode, node: PenPolygon): RuntimeNode {
	base.fill = node.fill;
	base.stroke = node.stroke;
	base.cornerRadius = node.cornerRadius;
	base.effects = node.effects;
	base.polygonCount = node.polygonCount;
	return base;
}

function applyPathFields(base: RuntimeNode, node: PenPath): RuntimeNode {
	base.fill = node.fill;
	base.stroke = node.stroke;
	base.effects = node.effects;
	base.geometry = node.geometry;
	base.fillRule = node.fillRule;
	return base;
}

function applyTextField(base: RuntimeNode, node: PenText): RuntimeNode {
	base.content = node.content;
	base.fontFamily = node.fontFamily;
	base.fontSize = node.fontSize;
	base.fontWeight = node.fontWeight;
	base.fontStyle = node.fontStyle;
	base.lineHeight = node.lineHeight;
	base.letterSpacing = node.letterSpacing;
	base.textAlign = node.textAlign;
	base.textAlignVertical = node.textAlignVertical;
	base.textGrowth = node.textGrowth;
	base.fill = node.fill;
	return base;
}

function applyIconFontFields(
	base: RuntimeNode,
	node: PenIconFont,
): RuntimeNode {
	base.icon = node.icon;
	base.iconFamily = node.iconFamily;
	base.fontSize = node.fontSize;
	base.fill = node.fill;
	return base;
}

function applyRefFields(base: RuntimeNode, node: PenRef): RuntimeNode {
	base.ref = node.ref;
	base.descendants = node.descendants;
	base.reusable = node.reusable;
	return base;
}

function applyNoteFields(base: RuntimeNode, node: PenNote): RuntimeNode {
	base.content = node.content;
	return base;
}

function applyImageFields(base: RuntimeNode, node: PenImage): RuntimeNode {
	base.url = node.url;
	base.fit = node.fit;
	base.effects = node.effects;
	return base;
}

function applyConnectionFields(
	base: RuntimeNode,
	node: PenConnection,
): RuntimeNode {
	base.fromId = node.fromId;
	base.toId = node.toId;
	return base;
}

/**
 * Extract children array from container PenNode types.
 */
function getNodeChildren(node: PenNode): PenNode[] | undefined {
	if (node.type === "frame" || node.type === "group") {
		return (node as PenFrame | PenGroup).children;
	}
	return undefined;
}

// ---------------------------------------------------------------------------
// SceneGraph → PenDocument
// ---------------------------------------------------------------------------

/**
 * Convert a flat SceneGraph back into a nested PenDocument.
 *
 * Reconstructs the tree by walking from the root's childIds and
 * recursively nesting children back into their parent nodes.
 */
export function sceneGraphToPenDocument(graph: SceneGraph): PenDocument {
	const root = graph.getNode(graph.rootId);
	if (!root) {
		throw new RuntimeGraphError("SceneGraph has no root node");
	}

	const children: PenNode[] = root.childIds.map((childId) =>
		runtimeNodeToPenNode(childId, graph),
	);

	const doc: PenDocument = {
		version: 1,
		children,
	};

	if (graph.themes.length > 0) {
		doc.themes = structuredClone(graph.themes);
	}

	if (graph.variables.size > 0) {
		const variables: Record<string, PenVariable> = {};
		for (const [name, variable] of graph.variables) {
			variables[name] = variable;
		}
		doc.variables = variables;
	}

	return doc;
}

/**
 * Convert a RuntimeNode back into a PenNode, recursively nesting children.
 */
function runtimeNodeToPenNode(nodeId: string, graph: SceneGraph): PenNode {
	const node = graph.getNode(nodeId);
	if (!node) {
		throw new RuntimeGraphError(
			`Cannot convert node "${nodeId}" to PenNode: node not found in scene graph`,
		);
	}

	switch (node.type) {
		case "frame":
			return buildPenFrame(node, graph);
		case "group":
			return buildPenGroup(node, graph);
		case "rectangle":
			return buildPenRectangle(node);
		case "ellipse":
			return buildPenEllipse(node);
		case "line":
			return buildPenLine(node);
		case "polygon":
			return buildPenPolygon(node);
		case "path":
			return buildPenPath(node);
		case "text":
			return buildPenText(node);
		case "icon_font":
			return buildPenIconFont(node);
		case "ref":
			return buildPenRef(node);
		case "note":
			return buildPenNote(node);
		case "image":
			return buildPenImage(node);
		case "connection":
			return buildPenConnection(node);
		default:
			throw new RuntimeGraphError(`Unknown node type: ${node.type}`);
	}
}

// ---------------------------------------------------------------------------
// PenNode builders — RuntimeNode → specific PenNode variant
// ---------------------------------------------------------------------------

function buildBaseFields(node: RuntimeNode): Record<string, unknown> {
	const base: Record<string, unknown> = { id: node.id };
	if (node.name !== undefined) base.name = node.name;
	if (node.x !== undefined) base.x = node.x;
	if (node.y !== undefined) base.y = node.y;
	if (node.width !== undefined) base.width = node.width;
	if (node.height !== undefined) base.height = node.height;
	if (node.rotation !== undefined) base.rotation = node.rotation;
	if (node.opacity !== undefined) base.opacity = node.opacity;
	if (node.flipX !== undefined) base.flipX = node.flipX;
	if (node.flipY !== undefined) base.flipY = node.flipY;
	if (node.enabled !== undefined) base.enabled = node.enabled;
	if (node.theme !== undefined) base.theme = node.theme;
	if (node.visible !== undefined) base.visible = node.visible;
	return base;
}

function buildPenFrame(node: RuntimeNode, graph: SceneGraph): PenFrame {
	const frame: PenFrame = {
		type: "frame",
		id: node.id,
	};

	// Base entity fields
	if (node.name !== undefined) frame.name = node.name;
	if (node.x !== undefined) frame.x = node.x;
	if (node.y !== undefined) frame.y = node.y;
	if (node.width !== undefined) frame.width = node.width;
	if (node.height !== undefined) frame.height = node.height;
	if (node.rotation !== undefined) frame.rotation = node.rotation;
	if (node.opacity !== undefined) frame.opacity = node.opacity;
	if (node.flipX !== undefined) frame.flipX = node.flipX;
	if (node.flipY !== undefined) frame.flipY = node.flipY;
	if (node.enabled !== undefined) frame.enabled = node.enabled;
	if (node.theme !== undefined) frame.theme = node.theme;
	if (node.visible !== undefined) frame.visible = node.visible;

	// Frame-specific fields
	if (node.layout !== undefined) frame.layout = node.layout;
	if (node.gap !== undefined) frame.gap = node.gap;
	if (node.padding !== undefined) frame.padding = node.padding;
	if (node.justifyContent !== undefined) frame.justifyContent = node.justifyContent;
	if (node.alignItems !== undefined) frame.alignItems = node.alignItems;
	if (node.fill !== undefined) frame.fill = node.fill;
	if (node.stroke !== undefined) frame.stroke = node.stroke;
	if (node.cornerRadius !== undefined) frame.cornerRadius = node.cornerRadius;
	if (node.clip !== undefined) frame.clip = node.clip;
	if (node.effects !== undefined) frame.effects = node.effects;
	if (node.reusable !== undefined) frame.reusable = node.reusable;
	if (node.slot !== undefined) frame.slot = node.slot;
	if (node.placeholder !== undefined) frame.placeholder = node.placeholder;
	if (node.aiGenerating !== undefined) frame.aiGenerating = node.aiGenerating;

	// Recursively nest children
	if (node.childIds.length > 0) {
		frame.children = node.childIds.map((childId) => runtimeNodeToPenNode(childId, graph));
	}

	return frame;
}

function buildPenGroup(node: RuntimeNode, graph: SceneGraph): PenGroup {
	const group: PenGroup = {
		type: "group",
		id: node.id,
	};

	// Base entity fields
	if (node.name !== undefined) group.name = node.name;
	if (node.x !== undefined) group.x = node.x;
	if (node.y !== undefined) group.y = node.y;
	if (node.width !== undefined) group.width = node.width;
	if (node.height !== undefined) group.height = node.height;
	if (node.rotation !== undefined) group.rotation = node.rotation;
	if (node.opacity !== undefined) group.opacity = node.opacity;
	if (node.flipX !== undefined) group.flipX = node.flipX;
	if (node.flipY !== undefined) group.flipY = node.flipY;
	if (node.enabled !== undefined) group.enabled = node.enabled;
	if (node.theme !== undefined) group.theme = node.theme;
	if (node.visible !== undefined) group.visible = node.visible;

	// Group-specific fields
	if (node.layout !== undefined) group.layout = node.layout;
	if (node.gap !== undefined) group.gap = node.gap;
	if (node.padding !== undefined) group.padding = node.padding;

	// Recursively nest children
	if (node.childIds.length > 0) {
		group.children = node.childIds.map((childId) => runtimeNodeToPenNode(childId, graph));
	}

	return group;
}

function buildPenRectangle(node: RuntimeNode): PenRectangle {
	const base = buildBaseFields(node);
	const rect: PenRectangle = {
		type: "rectangle",
		id: base.id as string,
	};
	copyDefinedFields(rect, base, [
		"name",
		"x",
		"y",
		"width",
		"height",
		"rotation",
		"opacity",
		"flipX",
		"flipY",
		"enabled",
		"theme",
		"visible",
	]);
	if (node.fill !== undefined) rect.fill = node.fill;
	if (node.stroke !== undefined) rect.stroke = node.stroke;
	if (node.cornerRadius !== undefined) rect.cornerRadius = node.cornerRadius;
	if (node.effects !== undefined) rect.effects = node.effects;
	return rect;
}

function buildPenEllipse(node: RuntimeNode): PenEllipse {
	const base = buildBaseFields(node);
	const ellipse: PenEllipse = {
		type: "ellipse",
		id: base.id as string,
	};
	copyDefinedFields(ellipse, base, [
		"name",
		"x",
		"y",
		"width",
		"height",
		"rotation",
		"opacity",
		"flipX",
		"flipY",
		"enabled",
		"theme",
		"visible",
	]);
	if (node.fill !== undefined) ellipse.fill = node.fill;
	if (node.stroke !== undefined) ellipse.stroke = node.stroke;
	if (node.effects !== undefined) ellipse.effects = node.effects;
	if (node.innerRadius !== undefined) ellipse.innerRadius = node.innerRadius;
	if (node.startAngle !== undefined) ellipse.startAngle = node.startAngle;
	if (node.sweepAngle !== undefined) ellipse.sweepAngle = node.sweepAngle;
	return ellipse;
}

function buildPenLine(node: RuntimeNode): PenLine {
	const base = buildBaseFields(node);
	const line: PenLine = {
		type: "line",
		id: base.id as string,
	};
	copyDefinedFields(line, base, [
		"name",
		"x",
		"y",
		"width",
		"height",
		"rotation",
		"opacity",
		"flipX",
		"flipY",
		"enabled",
		"theme",
		"visible",
	]);
	if (node.stroke !== undefined) line.stroke = node.stroke;
	return line;
}

function buildPenPolygon(node: RuntimeNode): PenPolygon {
	const base = buildBaseFields(node);
	const polygon: PenPolygon = {
		type: "polygon",
		id: base.id as string,
	};
	copyDefinedFields(polygon, base, [
		"name",
		"x",
		"y",
		"width",
		"height",
		"rotation",
		"opacity",
		"flipX",
		"flipY",
		"enabled",
		"theme",
		"visible",
	]);
	if (node.fill !== undefined) polygon.fill = node.fill;
	if (node.stroke !== undefined) polygon.stroke = node.stroke;
	if (node.cornerRadius !== undefined)
		polygon.cornerRadius = node.cornerRadius;
	if (node.effects !== undefined) polygon.effects = node.effects;
	if (node.polygonCount !== undefined) polygon.polygonCount = node.polygonCount;
	return polygon;
}

function buildPenPath(node: RuntimeNode): PenPath {
	const base = buildBaseFields(node);
	const path: PenPath = {
		type: "path",
		id: base.id as string,
		geometry: node.geometry ?? "",
	};
	copyDefinedFields(path, base, [
		"name",
		"x",
		"y",
		"width",
		"height",
		"rotation",
		"opacity",
		"flipX",
		"flipY",
		"enabled",
		"theme",
		"visible",
	]);
	if (node.fill !== undefined) path.fill = node.fill;
	if (node.stroke !== undefined) path.stroke = node.stroke;
	if (node.effects !== undefined) path.effects = node.effects;
	if (node.fillRule !== undefined) path.fillRule = node.fillRule;
	return path;
}

function buildPenText(node: RuntimeNode): PenText {
	const base = buildBaseFields(node);
	const text: PenText = {
		type: "text",
		id: base.id as string,
		content: node.content ?? "",
	};
	copyDefinedFields(text, base, [
		"name",
		"x",
		"y",
		"width",
		"height",
		"rotation",
		"opacity",
		"flipX",
		"flipY",
		"enabled",
		"theme",
		"visible",
	]);
	if (node.fontFamily !== undefined) text.fontFamily = node.fontFamily;
	if (node.fontSize !== undefined) text.fontSize = node.fontSize;
	if (node.fontWeight !== undefined) text.fontWeight = node.fontWeight;
	if (node.fontStyle !== undefined) text.fontStyle = node.fontStyle;
	if (node.lineHeight !== undefined) text.lineHeight = node.lineHeight;
	if (node.letterSpacing !== undefined) text.letterSpacing = node.letterSpacing;
	if (node.textAlign !== undefined) text.textAlign = node.textAlign;
	if (node.textAlignVertical !== undefined)
		text.textAlignVertical = node.textAlignVertical;
	if (node.textGrowth !== undefined) text.textGrowth = node.textGrowth;
	if (node.fill !== undefined) text.fill = node.fill;
	return text;
}

function buildPenIconFont(node: RuntimeNode): PenIconFont {
	const base = buildBaseFields(node);
	const iconFont: PenIconFont = {
		type: "icon_font",
		id: base.id as string,
		icon: node.icon ?? "",
	};
	copyDefinedFields(iconFont, base, [
		"name",
		"x",
		"y",
		"width",
		"height",
		"rotation",
		"opacity",
		"flipX",
		"flipY",
		"enabled",
		"theme",
		"visible",
	]);
	if (node.iconFamily !== undefined) iconFont.iconFamily = node.iconFamily;
	if (node.fontSize !== undefined) iconFont.fontSize = node.fontSize;
	if (node.fill !== undefined) iconFont.fill = node.fill;
	return iconFont;
}

function buildPenRef(node: RuntimeNode): PenRef {
	const base = buildBaseFields(node);
	const ref: PenRef = {
		type: "ref",
		id: base.id as string,
		ref: node.ref ?? "",
	};
	copyDefinedFields(ref, base, [
		"name",
		"x",
		"y",
		"width",
		"height",
		"rotation",
		"opacity",
		"flipX",
		"flipY",
		"enabled",
		"theme",
		"visible",
	]);
	if (node.descendants !== undefined) ref.descendants = node.descendants;
	if (node.reusable !== undefined) ref.reusable = node.reusable;
	return ref;
}

function buildPenNote(node: RuntimeNode): PenNote {
	const base = buildBaseFields(node);
	const note: PenNote = {
		type: "note",
		id: base.id as string,
	};
	copyDefinedFields(note, base, [
		"name",
		"x",
		"y",
		"width",
		"height",
		"rotation",
		"opacity",
		"flipX",
		"flipY",
		"enabled",
		"theme",
		"visible",
	]);
	if (node.content !== undefined) note.content = node.content as string;
	return note;
}

function buildPenImage(node: RuntimeNode): PenImage {
	const base = buildBaseFields(node);
	const image: PenImage = {
		type: "image",
		id: base.id as string,
	};
	copyDefinedFields(image, base, [
		"name",
		"x",
		"y",
		"width",
		"height",
		"rotation",
		"opacity",
		"flipX",
		"flipY",
		"enabled",
		"theme",
		"visible",
	]);
	if (node.url !== undefined) image.url = node.url;
	if (node.fit !== undefined) image.fit = node.fit;
	if (node.effects !== undefined) image.effects = node.effects;
	return image;
}

function buildPenConnection(node: RuntimeNode): PenConnection {
	const base = buildBaseFields(node);
	const connection: PenConnection = {
		type: "connection",
		id: base.id as string,
		fromId: node.fromId ?? "",
		toId: node.toId ?? "",
	};
	copyDefinedFields(connection, base, [
		"name",
		"x",
		"y",
		"width",
		"height",
		"rotation",
		"opacity",
		"flipX",
		"flipY",
		"enabled",
		"theme",
		"visible",
	]);
	return connection;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function copyDefinedFields(
	target: Record<string, unknown>,
	source: Record<string, unknown>,
	keys: string[],
): void {
	for (const key of keys) {
		if (source[key] !== undefined) {
			target[key] = source[key];
		}
	}
}
