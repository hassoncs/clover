/**
 * .fig → SceneGraph importer
 *
 * Reads a .fig binary (ZIP containing fig-kiwi encoded canvas data),
 * decodes the Kiwi message, and converts supported Figma nodes into
 * the canonical SceneGraph representation.
 *
 * Unsupported features emit structured warnings — they never crash.
 */

import type { PenEffect, PenFill, PenStroke } from "@slopcade/shared/types/pen";
import type { PenNodeType } from "../runtime/scene-graph";
import { type RuntimeNode, SceneGraph } from "../runtime/scene-graph";
import { decodeFigBuffer } from "./fig-codec";
import type {
	FigColor,
	FigEffect,
	FigImportResult,
	FigMessage,
	FigNodeChange,
	FigPaint,
} from "./fig-types";
import {
	createWarning,
	type FigConversionWarning,
	isSupportedNodeType,
	SUPPORTED_NODE_TYPES,
} from "./support-matrix";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Import a .fig binary buffer into a SceneGraph.
 *
 * @param buffer - Raw .fig file contents (ZIP format)
 * @returns SceneGraph + any conversion warnings
 */
export function importFig(buffer: ArrayBuffer): FigImportResult {
	const warnings: FigConversionWarning[] = [];
	const message = decodeFigBuffer(buffer);

	const nodeChanges = message.nodeChanges;
	if (!nodeChanges || nodeChanges.length === 0) {
		return { graph: new SceneGraph(), warnings };
	}

	const graph = importNodeChanges(nodeChanges, warnings);
	return { graph, warnings };
}

// ---------------------------------------------------------------------------
// Core import logic
// ---------------------------------------------------------------------------

function guidToString(guid: { sessionID: number; localID: number }): string {
	return `${guid.sessionID}:${guid.localID}`;
}

function importNodeChanges(
	nodeChanges: FigNodeChange[],
	warnings: FigConversionWarning[],
): SceneGraph {
	const graph = new SceneGraph();

	// Build lookup maps
	const changeMap = new Map<string, FigNodeChange>();
	const parentMap = new Map<string, string>();
	const childrenMap = new Map<string, string[]>();

	for (const nc of nodeChanges) {
		if (!nc.guid) continue;
		if (nc.phase === "REMOVED") continue;
		const id = guidToString(nc.guid);
		changeMap.set(id, nc);

		if (nc.parentIndex?.guid) {
			const pid = guidToString(nc.parentIndex.guid);
			parentMap.set(id, pid);
			let siblings = childrenMap.get(pid);
			if (!siblings) {
				siblings = [];
				childrenMap.set(pid, siblings);
			}
			siblings.push(id);
		}
	}

	// Sort children by fractional position
	for (const [, children] of childrenMap) {
		children.sort((a, b) => {
			const aPos = changeMap.get(a)?.parentIndex?.position ?? "";
			const bPos = changeMap.get(b)?.parentIndex?.position ?? "";
			return aPos.localeCompare(bPos);
		});
	}

	function getChildren(ncId: string): string[] {
		return childrenMap.get(ncId) ?? [];
	}

	const created = new Set<string>();

	function createSceneNode(ncId: string, graphParentId: string): void {
		if (created.has(ncId)) return;
		created.add(ncId);

		const nc = changeMap.get(ncId);
		if (!nc) return;

		const figType = nc.type ?? "RECTANGLE";

		// Skip internal types
		if (
			figType === "DOCUMENT" ||
			figType === "VARIABLE" ||
			figType === "CANVAS"
		) {
			return;
		}

		// Check support matrix
		if (!isSupportedNodeType(figType)) {
			warnings.push(
				createWarning(`Unsupported node type: ${figType}`, ncId, nc.name),
			);
			return;
		}

		const penType = SUPPORTED_NODE_TYPES[figType] as PenNodeType;

		const x = nc.transform?.m02 ?? 0;
		const y = nc.transform?.m12 ?? 0;
		const width = nc.size?.x ?? 100;
		const height = nc.size?.y ?? 100;

		let rotation = 0;
		if (nc.transform) {
			rotation =
				Math.atan2(nc.transform.m10, nc.transform.m00) * (180 / Math.PI);
		}

		const overrides: Partial<
			Omit<RuntimeNode, "type" | "parentId" | "childIds">
		> = {
			name: nc.name ?? figType,
			x,
			y,
			width,
			height,
			rotation: Math.abs(rotation) < 0.001 ? 0 : rotation,
			opacity: nc.opacity ?? 1,
			visible: nc.visible ?? true,
		};

		// Fill
		const fill = convertFills(nc.fillPaints, ncId, warnings);
		if (fill !== undefined) {
			overrides.fill = fill;
		}

		// Stroke
		const stroke = convertStroke(nc, ncId, warnings);
		if (stroke !== undefined) {
			overrides.stroke = stroke;
		}

		// Corner radius
		if (nc.rectangleCornerRadiiIndependent) {
			overrides.cornerRadius = [
				nc.rectangleTopLeftCornerRadius ?? nc.cornerRadius ?? 0,
				nc.rectangleTopRightCornerRadius ?? nc.cornerRadius ?? 0,
				nc.rectangleBottomRightCornerRadius ?? nc.cornerRadius ?? 0,
				nc.rectangleBottomLeftCornerRadius ?? nc.cornerRadius ?? 0,
			];
		} else if (nc.cornerRadius !== undefined && nc.cornerRadius > 0) {
			overrides.cornerRadius = nc.cornerRadius;
		}

		// Effects
		const effects = convertEffects(nc.effects, ncId, warnings);
		if (effects.length > 0) {
			overrides.effects = effects;
		}

		// Text-specific
		if (penType === "text") {
			overrides.content = nc.textData?.characters ?? "";
			overrides.fontSize = nc.fontSize ?? 14;
			overrides.fontFamily = nc.fontName?.family ?? "Inter";
			overrides.fontWeight = fontStyleToWeight(nc.fontName?.style);
			if (nc.textAlignHorizontal) {
				overrides.textAlign = mapTextAlign(nc.textAlignHorizontal);
			}
		}

		// Layout (auto-layout)
		if (penType === "frame" || penType === "group") {
			const layoutMode = mapLayoutMode(nc.stackMode);
			if (layoutMode !== "none") {
				overrides.layout = layoutMode;
				overrides.gap = nc.stackSpacing ?? 0;
				const pt = nc.stackVerticalPadding ?? nc.stackPadding ?? 0;
				const pr =
					nc.stackPaddingRight ??
					nc.stackHorizontalPadding ??
					nc.stackPadding ??
					0;
				const pb =
					nc.stackPaddingBottom ??
					nc.stackVerticalPadding ??
					nc.stackPadding ??
					0;
				const pl = nc.stackHorizontalPadding ?? nc.stackPadding ?? 0;
				if (pt !== 0 || pr !== 0 || pb !== 0 || pl !== 0) {
					if (pt === pb && pl === pr && pt === pl) {
						overrides.padding = pt;
					} else if (pt === pb && pl === pr) {
						overrides.padding = [pt, pl];
					} else {
						overrides.padding = [pt, pr, pb, pl];
					}
				}
			}

			if (nc.clipsContent) {
				overrides.clip = true;
			}
		}

		const node = graph.createNode(penType, graphParentId, overrides);

		// Recurse into children
		for (const childId of getChildren(ncId)) {
			createSceneNode(childId, node.id);
		}
	}

	// Find the document node
	let docId: string | null = null;
	for (const [id, nc] of changeMap) {
		if (nc.type === "DOCUMENT" || id === "0:0") {
			docId = id;
			break;
		}
	}

	if (docId) {
		// Import pages (CANVAS nodes) and their children
		for (const canvasId of getChildren(docId)) {
			const canvasNc = changeMap.get(canvasId);
			if (!canvasNc) continue;
			if (canvasNc.type === "CANVAS") {
				created.add(canvasId);
				for (const childId of getChildren(canvasId)) {
					createSceneNode(childId, graph.rootId);
				}
			} else {
				createSceneNode(canvasId, graph.rootId);
			}
		}
	} else {
		// No document structure — treat all roots as children of root
		const roots: string[] = [];
		for (const [id] of changeMap) {
			const pid = parentMap.get(id);
			if (!pid || !changeMap.has(pid)) roots.push(id);
		}
		for (const rootId of roots) {
			createSceneNode(rootId, graph.rootId);
		}
	}

	return graph;
}

// ---------------------------------------------------------------------------
// Property converters
// ---------------------------------------------------------------------------

function convertFigColor(color: FigColor | undefined): string {
	if (!color) return "#000000ff";
	const r = Math.round(color.r * 255);
	const g = Math.round(color.g * 255);
	const b = Math.round(color.b * 255);
	const a = Math.round((color.a ?? 1) * 255);
	return `#${hex(r)}${hex(g)}${hex(b)}${a < 255 ? hex(a) : ""}`;
}

function hex(n: number): string {
	return n.toString(16).padStart(2, "0");
}

function convertFills(
	paints: FigPaint[] | undefined,
	nodeId: string,
	warnings: FigConversionWarning[],
): PenFill | undefined {
	if (!paints || paints.length === 0) return undefined;

	const converted: PenFill[] = [];
	for (const paint of paints) {
		if (paint.visible === false) continue;

		if (paint.type === "SOLID") {
			converted.push({
				type: "color",
				color: convertFigColor(paint.color),
				opacity: paint.opacity,
			});
		} else if (paint.type?.startsWith("GRADIENT") && paint.stops) {
			const gradientType = mapGradientType(paint.type);
			converted.push({
				type: "gradient",
				gradientType,
				stops: paint.stops.map((s) => ({
					color: convertFigColor(s.color),
					position: s.position,
				})),
			});
		} else if (paint.type === "IMAGE") {
			warnings.push(createWarning("Image fills", nodeId));
		}
	}

	if (converted.length === 0) return undefined;
	if (converted.length === 1) return converted[0];
	return converted;
}

function mapGradientType(
	figType: string,
): "linear" | "radial" | "angular" | "mesh" {
	switch (figType) {
		case "GRADIENT_LINEAR":
			return "linear";
		case "GRADIENT_RADIAL":
			return "radial";
		case "GRADIENT_ANGULAR":
			return "angular";
		case "GRADIENT_DIAMOND":
			return "radial";
		default:
			return "linear";
	}
}

function convertStroke(
	nc: FigNodeChange,
	nodeId: string,
	_warnings: FigConversionWarning[],
): PenStroke | undefined {
	if (!nc.strokePaints || nc.strokePaints.length === 0) return undefined;

	const firstPaint = nc.strokePaints[0];
	if (firstPaint.visible === false) return undefined;

	const stroke: PenStroke = {};

	if (firstPaint.type === "SOLID" && firstPaint.color) {
		stroke.fill = {
			type: "color",
			color: convertFigColor(firstPaint.color),
			opacity: firstPaint.opacity,
		};
	}

	if (nc.strokeWeight !== undefined) {
		stroke.thickness = nc.strokeWeight;
	}

	if (nc.strokeAlign) {
		const align = nc.strokeAlign.toLowerCase();
		if (align === "inside" || align === "outside" || align === "center") {
			stroke.align = align;
		}
	}

	if (nc.strokeCap) {
		const cap = nc.strokeCap.toLowerCase();
		if (cap === "round" || cap === "square") {
			stroke.cap = cap;
		}
	}

	if (nc.strokeJoin) {
		const join = nc.strokeJoin.toLowerCase();
		if (join === "round" || join === "bevel" || join === "miter") {
			stroke.join = join;
		}
	}

	if (nc.dashPattern && nc.dashPattern.length > 0) {
		stroke.dashPattern = nc.dashPattern;
	}

	return stroke;
}

function convertEffects(
	effects: FigEffect[] | undefined,
	nodeId: string,
	warnings: FigConversionWarning[],
): PenEffect[] {
	if (!effects) return [];

	const result: PenEffect[] = [];
	for (const e of effects) {
		if (e.visible === false) continue;

		if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") {
			result.push({
				shadow: {
					color: convertFigColor(e.color),
					offsetX: e.offset?.x ?? 0,
					offsetY: e.offset?.y ?? 0,
					blur: e.radius ?? 0,
					spread: e.spread,
					inner: e.type === "INNER_SHADOW",
				},
			});
		} else if (e.type === "LAYER_BLUR" || e.type === "FOREGROUND_BLUR") {
			result.push({ blur: e.radius ?? 0 });
		} else if (e.type === "BACKGROUND_BLUR") {
			result.push({ background_blur: e.radius ?? 0 });
		} else {
			warnings.push(createWarning(`Unsupported effect: ${e.type}`, nodeId));
		}
	}

	return result;
}

function fontStyleToWeight(style: string | undefined): string {
	if (!style) return "400";
	const lower = style.toLowerCase();
	if (lower.includes("thin") || lower.includes("hairline")) return "100";
	if (lower.includes("extralight") || lower.includes("ultralight"))
		return "200";
	if (lower.includes("light")) return "300";
	if (lower.includes("medium")) return "500";
	if (lower.includes("semibold") || lower.includes("demibold")) return "600";
	if (lower.includes("extrabold") || lower.includes("ultrabold")) return "800";
	if (lower.includes("bold")) return "700";
	if (lower.includes("black") || lower.includes("heavy")) return "900";
	return "400";
}

function mapTextAlign(align: string): "left" | "center" | "right" | "justify" {
	switch (align) {
		case "CENTER":
			return "center";
		case "RIGHT":
			return "right";
		case "JUSTIFIED":
			return "justify";
		default:
			return "left";
	}
}

function mapLayoutMode(
	mode: string | undefined,
): "none" | "horizontal" | "vertical" {
	switch (mode) {
		case "HORIZONTAL":
			return "horizontal";
		case "VERTICAL":
			return "vertical";
		default:
			return "none";
	}
}
