/**
 * SceneGraph → .fig exporter
 *
 * Converts a SceneGraph into a .fig binary buffer by building
 * Figma-compatible NodeChange records and encoding them via the Kiwi codec.
 *
 * Only properties in the declared support matrix are exported.
 * Unsupported features emit structured warnings.
 */

import type { PenEffect, PenFill, PenStroke } from "@slopcade/shared/types/pen";
import type { RuntimeNode, SceneGraph } from "../runtime/scene-graph";
import { encodeFigBuffer } from "./fig-codec";
import type {
	FigColor,
	FigEffect as FigEffectType,
	FigExportResult,
	FigMessage,
	FigNodeChange,
	FigPaint,
} from "./fig-types";
import { createWarning, type FigConversionWarning } from "./support-matrix";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Export a SceneGraph to a .fig binary buffer.
 *
 * @param graph - The SceneGraph to export
 * @returns ArrayBuffer containing the .fig file + any conversion warnings
 */
export function exportFig(graph: SceneGraph): FigExportResult {
	const warnings: FigConversionWarning[] = [];
	const message = buildFigMessage(graph, warnings);
	const buffer = encodeFigBuffer(message);
	return { buffer, warnings };
}

// ---------------------------------------------------------------------------
// Message builder
// ---------------------------------------------------------------------------

function buildFigMessage(
	graph: SceneGraph,
	warnings: FigConversionWarning[],
): FigMessage {
	const localIdCounter = { value: 2 };
	const docGuid = { sessionID: 0, localID: 0 };

	const nodeChanges: FigNodeChange[] = [
		{
			guid: docGuid,
			type: "DOCUMENT",
			name: "Document",
			visible: true,
			opacity: 1,
			phase: "CREATED",
			transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
			strokeWeight: 1,
			strokeAlign: "CENTER",
			strokeJoin: "MITER",
		},
	];

	// Create a single canvas (page)
	const canvasLocalID = localIdCounter.value++;
	const canvasGuid = { sessionID: 0, localID: canvasLocalID };

	nodeChanges.push({
		guid: canvasGuid,
		parentIndex: { guid: docGuid, position: "!" },
		type: "CANVAS",
		name: "Page 1",
		visible: true,
		opacity: 1,
		phase: "CREATED",
		transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
		strokeWeight: 1,
		strokeAlign: "CENTER",
		strokeJoin: "MITER",
	});

	// Export root children
	const root = graph.getNode(graph.rootId);
	if (root) {
		const children = graph.getChildren(graph.rootId);
		for (let i = 0; i < children.length; i++) {
			exportNode(
				children[i],
				canvasGuid,
				i,
				localIdCounter,
				graph,
				nodeChanges,
				warnings,
			);
		}
	}

	return {
		type: "NODE_CHANGES",
		sessionID: 0,
		ackID: 0,
		nodeChanges,
	};
}

// ---------------------------------------------------------------------------
// Node exporter
// ---------------------------------------------------------------------------

function exportNode(
	node: RuntimeNode,
	parentGuid: { sessionID: number; localID: number },
	childIndex: number,
	localIdCounter: { value: number },
	graph: SceneGraph,
	nodeChanges: FigNodeChange[],
	warnings: FigConversionWarning[],
): void {
	const localID = localIdCounter.value++;
	const guid = { sessionID: 1, localID };

	const figType = mapPenTypeToFigma(node.type);
	if (!figType) {
		warnings.push(
			createWarning(
				`Cannot export node type: ${node.type}`,
				node.id,
				node.name,
			),
		);
		return;
	}

	const rotation = (node.rotation ?? 0) * (Math.PI / 180);
	const cos = Math.cos(rotation);
	const sin = Math.sin(rotation);

	const nc: FigNodeChange = {
		guid,
		parentIndex: {
			guid: parentGuid,
			position: fractionalPosition(childIndex),
		},
		type: figType,
		name: node.name ?? figType,
		visible: node.visible ?? true,
		opacity: node.opacity ?? 1,
		phase: "CREATED",
		size: {
			x: typeof node.width === "number" ? node.width : 100,
			y: typeof node.height === "number" ? node.height : 100,
		},
		transform: {
			m00: cos,
			m01: -sin,
			m02: node.x ?? 0,
			m10: sin,
			m11: cos,
			m12: node.y ?? 0,
		},
		strokeWeight: 1,
		strokeAlign: "INSIDE",
	};

	// Fill
	const fillPaints = convertPenFillToFigPaints(node.fill, node.id, warnings);
	if (fillPaints.length > 0) {
		nc.fillPaints = fillPaints;
	}

	// Stroke
	if (node.stroke) {
		const strokePaints = convertPenStrokeToFigPaints(
			node.stroke,
			node.id,
			warnings,
		);
		if (strokePaints.length > 0) {
			nc.strokePaints = strokePaints;
		}
		if (typeof node.stroke.thickness === "number") {
			nc.strokeWeight = node.stroke.thickness;
		}
		if (node.stroke.align) {
			nc.strokeAlign = node.stroke.align.toUpperCase();
		}
		if (node.stroke.cap) {
			nc.strokeCap = node.stroke.cap.toUpperCase();
		}
		if (node.stroke.join) {
			nc.strokeJoin = node.stroke.join.toUpperCase();
		}
		if (node.stroke.dashPattern) {
			nc.dashPattern = node.stroke.dashPattern;
		}
	}

	// Corner radius
	if (node.cornerRadius !== undefined) {
		if (Array.isArray(node.cornerRadius)) {
			nc.rectangleCornerRadiiIndependent = true;
			nc.rectangleTopLeftCornerRadius = node.cornerRadius[0];
			nc.rectangleTopRightCornerRadius = node.cornerRadius[1];
			nc.rectangleBottomRightCornerRadius = node.cornerRadius[2];
			nc.rectangleBottomLeftCornerRadius = node.cornerRadius[3];
			nc.cornerRadius = node.cornerRadius[0];
		} else if (node.cornerRadius > 0) {
			nc.cornerRadius = node.cornerRadius;
		}
	}

	// Effects
	const effects = convertPenEffectsToFig(node.effects, node.id, warnings);
	if (effects.length > 0) {
		nc.effects = effects;
	}

	// Text-specific
	if (node.type === "text") {
		nc.fontSize = node.fontSize ?? 14;
		const family = node.fontFamily ?? "Inter";
		const style = weightToFontStyle(node.fontWeight);
		nc.fontName = {
			family,
			style,
			postscript: `${family.replace(/\s+/g, "")}-${style}`,
		};
		nc.textData = {
			characters: typeof node.content === "string" ? node.content : "",
		};
		nc.textAutoResize = "WIDTH_AND_HEIGHT";
		if (node.textAlign) {
			nc.textAlignHorizontal = mapPenTextAlignToFig(node.textAlign);
		}
	}

	// Layout (auto-layout)
	if (node.layout && node.layout !== "none") {
		nc.stackMode = node.layout === "horizontal" ? "HORIZONTAL" : "VERTICAL";
		if (node.gap !== undefined) nc.stackSpacing = node.gap;

		const padding = normalizePadding(node.padding);
		if (padding) {
			nc.stackVerticalPadding = padding[0];
			nc.stackHorizontalPadding = padding[3];
			nc.stackPaddingBottom = padding[2];
			nc.stackPaddingRight = padding[1];
		}
	}

	if (node.clip) {
		nc.clipsContent = true;
	}

	// Frame mask disabled for groups
	if (node.type === "group") {
		nc.frameMaskDisabled = true;
	}

	nodeChanges.push(nc);

	// Recurse into children
	const children = graph.getChildren(node.id);
	for (let i = 0; i < children.length; i++) {
		exportNode(
			children[i],
			guid,
			i,
			localIdCounter,
			graph,
			nodeChanges,
			warnings,
		);
	}
}

// ---------------------------------------------------------------------------
// Property converters
// ---------------------------------------------------------------------------

function mapPenTypeToFigma(type: string): string | null {
	switch (type) {
		case "frame":
			return "FRAME";
		case "group":
			return "FRAME";
		case "rectangle":
			return "RECTANGLE";
		case "ellipse":
			return "ELLIPSE";
		case "text":
			return "TEXT";
		case "line":
			return "LINE";
		case "polygon":
			return "REGULAR_POLYGON";
		case "path":
			return "VECTOR";
		default:
			return null;
	}
}

function fractionalPosition(index: number): string {
	return String.fromCharCode("!".charCodeAt(0) + index);
}

function parseHexColor(hex: string): FigColor {
	const clean = hex.replace("#", "");
	const r = parseInt(clean.slice(0, 2), 16) / 255;
	const g = parseInt(clean.slice(2, 4), 16) / 255;
	const b = parseInt(clean.slice(4, 6), 16) / 255;
	const a = clean.length >= 8 ? parseInt(clean.slice(6, 8), 16) / 255 : 1;
	return { r, g, b, a };
}

function convertPenFillToFigPaints(
	fill: PenFill | undefined,
	nodeId: string,
	warnings: FigConversionWarning[],
): FigPaint[] {
	if (fill === undefined) return [];

	if (typeof fill === "string") {
		return [
			{
				type: "SOLID",
				color: parseHexColor(fill),
				opacity: 1,
				visible: true,
				blendMode: "NORMAL",
			},
		];
	}

	if (Array.isArray(fill)) {
		const result: FigPaint[] = [];
		for (const f of fill) {
			result.push(...convertPenFillToFigPaints(f, nodeId, warnings));
		}
		return result;
	}

	if (fill.type === "color") {
		return [
			{
				type: "SOLID",
				color: parseHexColor(fill.color),
				opacity: fill.opacity ?? 1,
				visible: fill.enabled !== false,
				blendMode: "NORMAL",
			},
		];
	}

	if (fill.type === "gradient") {
		const figGradientType = mapPenGradientTypeToFig(fill.gradientType);
		return [
			{
				type: figGradientType,
				opacity: 1,
				visible: fill.enabled !== false,
				blendMode: "NORMAL",
				stops: fill.stops.map((s) => ({
					color: parseHexColor(s.color),
					position: s.position,
				})),
			},
		];
	}

	if (fill.type === "image") {
		warnings.push(createWarning("Image fills", nodeId));
		return [];
	}

	return [];
}

function mapPenGradientTypeToFig(type: string): string {
	switch (type) {
		case "linear":
			return "GRADIENT_LINEAR";
		case "radial":
			return "GRADIENT_RADIAL";
		case "angular":
			return "GRADIENT_ANGULAR";
		default:
			return "GRADIENT_LINEAR";
	}
}

function convertPenStrokeToFigPaints(
	stroke: PenStroke,
	nodeId: string,
	warnings: FigConversionWarning[],
): FigPaint[] {
	if (!stroke.fill) return [];
	return convertPenFillToFigPaints(stroke.fill, nodeId, warnings);
}

function convertPenEffectsToFig(
	effects: PenEffect[] | undefined,
	nodeId: string,
	_warnings: FigConversionWarning[],
): FigEffectType[] {
	if (!effects) return [];

	const result: FigEffectType[] = [];
	for (const e of effects) {
		if (e.shadow) {
			result.push({
				type: e.shadow.inner ? "INNER_SHADOW" : "DROP_SHADOW",
				color: parseHexColor(e.shadow.color),
				offset: { x: e.shadow.offsetX, y: e.shadow.offsetY },
				radius: e.shadow.blur,
				spread: e.shadow.spread,
				visible: e.enabled !== false,
			});
		}
		if (e.blur !== undefined) {
			result.push({
				type: "FOREGROUND_BLUR",
				radius: e.blur,
				visible: e.enabled !== false,
			});
		}
		if (e.background_blur !== undefined) {
			result.push({
				type: "BACKGROUND_BLUR",
				radius: e.background_blur,
				visible: e.enabled !== false,
			});
		}
	}

	return result;
}

function weightToFontStyle(weight: string | undefined): string {
	switch (weight) {
		case "100":
			return "Thin";
		case "200":
			return "ExtraLight";
		case "300":
			return "Light";
		case "400":
			return "Regular";
		case "500":
			return "Medium";
		case "600":
			return "SemiBold";
		case "700":
			return "Bold";
		case "800":
			return "ExtraBold";
		case "900":
			return "Black";
		default:
			return "Regular";
	}
}

function mapPenTextAlignToFig(align: string): string {
	switch (align) {
		case "center":
			return "CENTER";
		case "right":
			return "RIGHT";
		case "justify":
			return "JUSTIFIED";
		default:
			return "LEFT";
	}
}

function normalizePadding(
	padding:
		| number
		| [number, number]
		| [number, number, number, number]
		| [number, number, ...unknown[]]
		| [number, number, number, number, ...unknown[]]
		| undefined,
): [number, number, number, number] | null {
	if (padding === undefined) return null;
	if (typeof padding === "number") return [padding, padding, padding, padding];
	if (padding.length === 2)
		return [padding[0], padding[1], padding[0], padding[1]];
	return [
		padding[0],
		padding[1],
		typeof padding[2] === "number" ? padding[2] : padding[0],
		typeof padding[3] === "number" ? padding[3] : padding[1],
	];
}
