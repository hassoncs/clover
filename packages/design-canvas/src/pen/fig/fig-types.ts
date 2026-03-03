/**
 * Types for the .fig codec boundary layer.
 *
 * These mirror the Figma Kiwi wire format structures needed for
 * import/export without depending on the full OpenPencil type system.
 */

// ---------------------------------------------------------------------------
// GUID — Figma's node identifier
// ---------------------------------------------------------------------------

export interface FigGUID {
	sessionID: number;
	localID: number;
}

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------

export interface FigColor {
	r: number;
	g: number;
	b: number;
	a: number;
}

// ---------------------------------------------------------------------------
// Vector / Matrix
// ---------------------------------------------------------------------------

export interface FigVector {
	x: number;
	y: number;
}

export interface FigMatrix {
	m00: number;
	m01: number;
	m02: number;
	m10: number;
	m11: number;
	m12: number;
}

// ---------------------------------------------------------------------------
// Paint
// ---------------------------------------------------------------------------

export interface FigPaint {
	type: string;
	color?: FigColor;
	opacity?: number;
	visible?: boolean;
	blendMode?: string;
	stops?: Array<{ color: FigColor; position: number }>;
	transform?: FigMatrix;
	image?: { hash: string | Record<string, number> };
	imageScaleMode?: string;
}

// ---------------------------------------------------------------------------
// Effect
// ---------------------------------------------------------------------------

export interface FigEffect {
	type: string;
	color?: FigColor;
	offset?: FigVector;
	radius?: number;
	visible?: boolean;
	spread?: number;
	blendMode?: string;
}

// ---------------------------------------------------------------------------
// ParentIndex
// ---------------------------------------------------------------------------

export interface FigParentIndex {
	guid: FigGUID;
	position: string;
}

// ---------------------------------------------------------------------------
// NodeChange — the core Figma node representation in Kiwi wire format
// ---------------------------------------------------------------------------

export interface FigNodeChange {
	guid: FigGUID;
	phase?: string;
	parentIndex?: FigParentIndex;
	type?: string;
	name?: string;
	visible?: boolean;
	locked?: boolean;
	opacity?: number;
	blendMode?: string;
	size?: FigVector;
	transform?: FigMatrix;
	cornerRadius?: number;
	fillPaints?: FigPaint[];
	strokePaints?: FigPaint[];
	strokeWeight?: number;
	strokeAlign?: string;
	strokeCap?: string;
	strokeJoin?: string;
	dashPattern?: number[];
	effects?: FigEffect[];
	// Layout
	stackMode?: string;
	stackSpacing?: number;
	stackPadding?: number;
	stackPaddingRight?: number;
	stackPaddingBottom?: number;
	stackCounterAlign?: string;
	stackJustify?: string;
	stackCounterAlignItems?: string;
	stackPrimaryAlignItems?: string;
	stackPrimarySizing?: string;
	stackCounterSizing?: string;
	stackVerticalPadding?: number;
	stackHorizontalPadding?: number;
	stackWrap?: string;
	stackPositioning?: string;
	stackChildPrimaryGrow?: number;
	stackChildAlignSelf?: string;
	stackCounterSpacing?: number;
	// Frame
	clipsContent?: boolean;
	frameMaskDisabled?: boolean;
	// Corners
	rectangleTopLeftCornerRadius?: number;
	rectangleTopRightCornerRadius?: number;
	rectangleBottomLeftCornerRadius?: number;
	rectangleBottomRightCornerRadius?: number;
	rectangleCornerRadiiIndependent?: boolean;
	cornerSmoothing?: number;
	// Text
	fontSize?: number;
	fontWeight?: number;
	fontName?: { family: string; style: string; postscript?: string };
	textAlignHorizontal?: string;
	textAlignVertical?: string;
	textAutoResize?: string;
	textData?: {
		characters: string;
		lines?: unknown[];
		characterStyleIDs?: number[];
		styleOverrideTable?: FigNodeChange[];
	};
	lineHeight?: { value: number; units: string };
	letterSpacing?: { value: number; units: string };
	// Symbol/Instance
	symbolData?: { symbolID: FigGUID };
	// Internal
	internalOnly?: boolean;
	// Constraints
	horizontalConstraint?: string;
	verticalConstraint?: string;
}

// ---------------------------------------------------------------------------
// FigMessage — top-level Kiwi message
// ---------------------------------------------------------------------------

export interface FigMessage {
	type: string;
	sessionID?: number;
	ackID?: number;
	reconnectSequenceNumber?: number;
	nodeChanges?: FigNodeChange[];
	blobs?: Array<{ bytes: Uint8Array }>;
}

// ---------------------------------------------------------------------------
// Import/Export result types
// ---------------------------------------------------------------------------

export interface FigImportResult {
	graph: import("../runtime/scene-graph").SceneGraph;
	warnings: import("./support-matrix").FigConversionWarning[];
}

export interface FigExportResult {
	buffer: ArrayBuffer;
	warnings: import("./support-matrix").FigConversionWarning[];
}
