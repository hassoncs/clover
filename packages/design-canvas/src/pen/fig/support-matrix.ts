/**
 * .fig Codec Support Matrix
 *
 * Explicitly declares which Figma node types, properties, and features
 * are supported in the .fig ↔ SceneGraph conversion boundary.
 *
 * Unsupported features emit structured warnings — they never crash.
 */

// ---------------------------------------------------------------------------
// Supported Figma node types → PenNode type mapping
// ---------------------------------------------------------------------------

export const SUPPORTED_NODE_TYPES = {
	FRAME: "frame",
	RECTANGLE: "rectangle",
	ROUNDED_RECTANGLE: "rectangle",
	ELLIPSE: "ellipse",
	TEXT: "text",
	LINE: "line",
	STAR: "polygon",
	REGULAR_POLYGON: "polygon",
	VECTOR: "path",
	GROUP: "group",
	SECTION: "frame",
} as const satisfies Record<string, string>;

export type SupportedFigmaNodeType = keyof typeof SUPPORTED_NODE_TYPES;

// ---------------------------------------------------------------------------
// Unsupported Figma node types (emit warning, skip node)
// ---------------------------------------------------------------------------

export const UNSUPPORTED_NODE_TYPES = [
	"BOOLEAN_OPERATION",
	"COMPONENT",
	"COMPONENT_SET",
	"INSTANCE",
	"SYMBOL",
	"CONNECTOR",
	"SHAPE_WITH_TEXT",
	"STICKY",
	"CODE_BLOCK",
	"WIDGET",
	"STAMP",
	"MEDIA",
	"HIGHLIGHT",
	"WASHI_TAPE",
	"SLICE",
] as const;

export type UnsupportedFigmaNodeType = (typeof UNSUPPORTED_NODE_TYPES)[number];

// ---------------------------------------------------------------------------
// Supported properties per conversion direction
// ---------------------------------------------------------------------------

export const SUPPORTED_PROPERTIES = {
	geometry: ["x", "y", "width", "height", "rotation"],
	visual: [
		"opacity",
		"visible",
		"fill (solid color)",
		"fill (gradient — linear, radial, angular, diamond)",
		"stroke (solid color)",
		"strokeWeight",
		"cornerRadius",
		"independentCornerRadii",
	],
	text: [
		"content (characters)",
		"fontSize",
		"fontFamily",
		"fontWeight",
		"textAlignHorizontal",
	],
	layout: [
		"layoutMode (auto-layout direction)",
		"itemSpacing",
		"padding (top, right, bottom, left)",
		"primaryAxisSizing",
		"counterAxisSizing",
		"primaryAxisAlign",
		"counterAxisAlign",
	],
	effects: ["dropShadow", "innerShadow", "layerBlur"],
} as const;

// ---------------------------------------------------------------------------
// Unsupported properties / features
// ---------------------------------------------------------------------------

export const UNSUPPORTED_FEATURES = [
	"Image fills (no image data roundtrip)",
	"Variable bindings",
	"Prototype interactions",
	"Plugin data",
	"Vector networks (complex path data)",
	"Style runs (rich text spans)",
	"Export settings",
	"Layout grids",
	"Guides",
	"Blend modes (beyond NORMAL/PASS_THROUGH)",
	"Masks",
	"Boolean operations",
	"Component overrides",
	"Constraints (horizontal/vertical)",
] as const;

// ---------------------------------------------------------------------------
// Warning type for unsupported features encountered during conversion
// ---------------------------------------------------------------------------

export interface FigConversionWarning {
	type: "unsupported";
	feature: string;
	nodeId: string;
	nodeName?: string;
}

export function createWarning(
	feature: string,
	nodeId: string,
	nodeName?: string,
): FigConversionWarning {
	return { type: "unsupported", feature, nodeId, nodeName };
}

// ---------------------------------------------------------------------------
// Type guard for supported node types
// ---------------------------------------------------------------------------

export function isSupportedNodeType(
	type: string,
): type is SupportedFigmaNodeType {
	return type in SUPPORTED_NODE_TYPES;
}
