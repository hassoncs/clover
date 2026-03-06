import { z } from "zod";

export const PenThemeSchema = z.object({
	name: z.string(),
	values: z.array(z.string()),
	default: z.string().optional(),
});

export type PenTheme = z.infer<typeof PenThemeSchema>;

export const PenThemedValueSchema = z.object({
	value: z.union([z.string(), z.number(), z.boolean()]),
	theme: z.record(z.string(), z.string()).optional(),
});

export type PenThemedValue = z.infer<typeof PenThemedValueSchema>;

export const PenVariableSchema = z.object({
	type: z.enum(["color", "number", "string", "boolean"]),
	value: z.union([z.string(), z.number(), z.boolean(), z.array(PenThemedValueSchema)]),
});

export type PenVariable = z.infer<typeof PenVariableSchema>;

export const PenSizingSchema = z.union([z.number(), z.string()]);

export type PenSizing = z.infer<typeof PenSizingSchema>;

export const PenGradientStopSchema = z.object({
	color: z.string(),
	position: z.number(),
});

export type PenGradientStop = z.infer<typeof PenGradientStopSchema>;

// PenFill is recursive (can be an array of fills).
// We use an `as` cast to a specific ZodType<T> to give z.infer<> the correct output type
// while breaking the circular type inference issue with ZodLazy.
type PenFillPrimitive =
	| string
	| { type: "color"; color: string; opacity?: number; enabled?: boolean }
	| {
			type: "gradient";
			gradientType: "linear" | "radial" | "angular" | "mesh";
			stops: PenGradientStop[];
			angle?: number;
			centerX?: number;
			centerY?: number;
			enabled?: boolean;
	  }
	| { type: "image"; url: string; fit?: "cover" | "contain" | "fill" | "tile"; opacity?: number; enabled?: boolean };

export type PenFill = PenFillPrimitive | PenFill[];

export const PenFillSchema = z.lazy(() =>
	z.union([
		z.string(),
		z.object({
			type: z.literal("color"),
			color: z.string(),
			opacity: z.number().optional(),
			enabled: z.boolean().optional(),
		}),
		z.object({
			type: z.literal("gradient"),
			gradientType: z.enum(["linear", "radial", "angular", "mesh"]),
			stops: z.array(PenGradientStopSchema),
			angle: z.number().optional(),
			centerX: z.number().optional(),
			centerY: z.number().optional(),
			enabled: z.boolean().optional(),
		}),
		z.object({
			type: z.literal("image"),
			url: z.string(),
			fit: z.enum(["cover", "contain", "fill", "tile"]).optional(),
			opacity: z.number().optional(),
			enabled: z.boolean().optional(),
		}),
		z.array(z.lazy(() => PenFillSchema as z.ZodType<PenFill, z.ZodTypeDef, unknown>)),
	]),
) as z.ZodType<PenFill, z.ZodTypeDef, unknown>;

export const PenStrokeSchema = z.object({
	fill: PenFillSchema.optional(),
	align: z.enum(["center", "inside", "outside"]).optional(),
	thickness: z
		.union([
			z.number(),
			z.object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() }),
		])
		.optional(),
	join: z.enum(["miter", "round", "bevel"]).optional(),
	cap: z.enum(["butt", "round", "square"]).optional(),
	dashPattern: z.array(z.number()).optional(),
	enabled: z.boolean().optional(),
});

export type PenStroke = z.infer<typeof PenStrokeSchema>;

export const PenShadowSchema = z.object({
	color: z.string(),
	offsetX: z.number(),
	offsetY: z.number(),
	blur: z.number(),
	spread: z.number().optional(),
	inner: z.boolean().optional(),
	enabled: z.boolean().optional(),
});

export type PenShadow = z.infer<typeof PenShadowSchema>;

export const PenEffectSchema = z.object({
	shadow: PenShadowSchema.optional(),
	blur: z.number().optional(),
	background_blur: z.number().optional(),
	enabled: z.boolean().optional(),
});

export type PenEffect = z.infer<typeof PenEffectSchema>;

export const PenPaddingSchema = z.union([
	z.number(),
	z.tuple([z.number(), z.number()]),
	z.tuple([z.number(), z.number(), z.number(), z.number()]),
]);

export type PenPadding = z.infer<typeof PenPaddingSchema>;

const PenCornerRadiusSchema = z.union([
	z.number(),
	z.tuple([z.number(), z.number(), z.number(), z.number()]),
]);

const PenEntityBaseShape = {
	id: z.string(),
	name: z.string().optional(),
	x: z.number().optional(),
	y: z.number().optional(),
	width: PenSizingSchema.optional(),
	height: PenSizingSchema.optional(),
	rotation: z.number().optional(),
	opacity: z.number().optional(),
	flipX: z.boolean().optional(),
	flipY: z.boolean().optional(),
	enabled: z.boolean().optional(),
	theme: z.record(z.string(), z.string()).optional(),
	visible: z.boolean().optional(),
};

export const PenTextSpanSchema = z.object({
	content: z.string(),
	fontFamily: z.string().optional(),
	fontSize: z.number().optional(),
	fontWeight: z.string().optional(),
	fontStyle: z.enum(["normal", "italic"]).optional(),
	fill: PenFillSchema.optional(),
});

export type PenTextSpan = z.infer<typeof PenTextSpanSchema>;

export const PenRectangleSchema = z.object({
	type: z.literal("rectangle"),
	...PenEntityBaseShape,
	fill: PenFillSchema.optional(),
	stroke: PenStrokeSchema.optional(),
	cornerRadius: PenCornerRadiusSchema.optional(),
	effects: z.array(PenEffectSchema).optional(),
});

export type PenRectangle = z.infer<typeof PenRectangleSchema>;

export const PenEllipseSchema = z.object({
	type: z.literal("ellipse"),
	...PenEntityBaseShape,
	innerRadius: z.number().optional(),
	startAngle: z.number().optional(),
	sweepAngle: z.number().optional(),
	fill: PenFillSchema.optional(),
	stroke: PenStrokeSchema.optional(),
	effects: z.array(PenEffectSchema).optional(),
});

export type PenEllipse = z.infer<typeof PenEllipseSchema>;

export const PenLineSchema = z.object({
	type: z.literal("line"),
	...PenEntityBaseShape,
	stroke: PenStrokeSchema.optional(),
});

export type PenLine = z.infer<typeof PenLineSchema>;

export const PenPolygonSchema = z.object({
	type: z.literal("polygon"),
	...PenEntityBaseShape,
	polygonCount: z.number().optional(),
	cornerRadius: z.number().optional(),
	fill: PenFillSchema.optional(),
	stroke: PenStrokeSchema.optional(),
	effects: z.array(PenEffectSchema).optional(),
});

export type PenPolygon = z.infer<typeof PenPolygonSchema>;

export const PenPathSchema = z.object({
	type: z.literal("path"),
	...PenEntityBaseShape,
	geometry: z.string(),
	fillRule: z.enum(["nonzero", "evenodd"]).optional(),
	fill: PenFillSchema.optional(),
	stroke: PenStrokeSchema.optional(),
	effects: z.array(PenEffectSchema).optional(),
});

export type PenPath = z.infer<typeof PenPathSchema>;

export const PenTextSchema = z.object({
	type: z.literal("text"),
	...PenEntityBaseShape,
	content: z.union([z.string(), z.array(PenTextSpanSchema)]),
	fontFamily: z.string().optional(),
	fontSize: z.number().optional(),
	fontWeight: z.string().optional(),
	fontStyle: z.enum(["normal", "italic"]).optional(),
	lineHeight: z.number().optional(),
	letterSpacing: z.number().optional(),
	textAlign: z.enum(["left", "center", "right", "justify"]).optional(),
	textAlignVertical: z.enum(["top", "center", "bottom"]).optional(),
	textGrowth: z.enum(["fixed", "fit_width", "fit_height", "fit_both"]).optional(),
	fill: PenFillSchema.optional(),
});

export type PenText = z.infer<typeof PenTextSchema>;

export const PenIconFontSchema = z.object({
	type: z.literal("icon_font"),
	...PenEntityBaseShape,
	icon: z.string(),
	iconFamily: z.string().optional(),
	fontSize: z.number().optional(),
	fill: PenFillSchema.optional(),
});

export type PenIconFont = z.infer<typeof PenIconFontSchema>;

export const PenRefSchema = z.object({
	type: z.literal("ref"),
	...PenEntityBaseShape,
	ref: z.string(),
	descendants: z.record(z.string(), z.unknown()).optional(),
	reusable: z.boolean().optional(),
});

export type PenRef = z.infer<typeof PenRefSchema>;

export const PenNoteSchema = z.object({
	type: z.literal("note"),
	...PenEntityBaseShape,
	content: z.string().optional(),
});

export type PenNote = z.infer<typeof PenNoteSchema>;

export const PenImageSchema = z.object({
	type: z.literal("image"),
	...PenEntityBaseShape,
	url: z.string().optional(),
	fit: z.enum(["cover", "contain", "fill"]).optional(),
	effects: z.array(PenEffectSchema).optional(),
});

export type PenImage = z.infer<typeof PenImageSchema>;

export const PenEffectNodeSchema = z.object({
	type: z.literal("effect"),
	...PenEntityBaseShape,
	shaderCode: z.string().optional(),
	playing: z.boolean().optional(),
	authoringMode: z.string().optional(),
	uniforms: z.record(z.string(), z.any()).optional(),
});

export type PenEffectNode = z.infer<typeof PenEffectNodeSchema>;

export const PenConnectionSchema = z.object({
	type: z.literal("connection"),
	...PenEntityBaseShape,
	fromId: z.string(),
	toId: z.string(),
});

export type PenConnection = z.infer<typeof PenConnectionSchema>;

// PenFrame and PenGroup are declared as interfaces (not type aliases) so TypeScript
// can handle the mutual recursion with PenNode without "circularly references itself" errors.
export interface PenFrame {
	type: "frame";
	id: string;
	name?: string;
	x?: number;
	y?: number;
	width?: PenSizing;
	height?: PenSizing;
	rotation?: number;
	opacity?: number;
	flipX?: boolean;
	flipY?: boolean;
	enabled?: boolean;
	theme?: Record<string, string>;
	visible?: boolean;
	layout?: "none" | "horizontal" | "vertical";
	children?: PenNode[];
	gap?: number;
	padding?: PenPadding;
	justifyContent?: "start" | "center" | "end" | "space-between" | "space-around" | "space-evenly";
	alignItems?: "start" | "center" | "end" | "stretch";
	fill?: PenFill;
	stroke?: PenStroke;
	cornerRadius?: number | [number, number, number, number];
	clip?: boolean;
	effects?: PenEffect[];
	reusable?: boolean;
	slot?: boolean;
	placeholder?: boolean;
	aiGenerating?: boolean;
}

export interface PenGroup {
	type: "group";
	id: string;
	name?: string;
	x?: number;
	y?: number;
	width?: PenSizing;
	height?: PenSizing;
	rotation?: number;
	opacity?: number;
	flipX?: boolean;
	flipY?: boolean;
	enabled?: boolean;
	theme?: Record<string, string>;
	visible?: boolean;
	children?: PenNode[];
	layout?: "none" | "horizontal" | "vertical";
	gap?: number;
	padding?: PenPadding;
}

export type PenNode =
	| PenFrame
	| PenGroup
	| PenRectangle
	| PenEllipse
	| PenLine
	| PenPolygon
	| PenPath
	| PenText
	| PenIconFont
	| PenRef
	| PenNote
	| PenImage
	| PenEffectNode
	| PenConnection;

// Recursive node schemas use z.lazy() with `as z.ZodType<T>` casts (not `as any`).
// This gives z.infer<> the correct output types downstream while breaking the
// circular inference loop that TypeScript can't resolve statically.
export const PenFrameSchema = z.lazy(() =>
	z.object({
		type: z.literal("frame"),
		...PenEntityBaseShape,
		layout: z.enum(["none", "horizontal", "vertical"]).optional(),
		children: z.array(PenNodeSchema as z.ZodType<PenNode, z.ZodTypeDef, unknown>).optional(),
		gap: z.number().optional(),
		padding: PenPaddingSchema.optional(),
		justifyContent: z
			.enum(["start", "center", "end", "space-between", "space-around", "space-evenly"])
			.optional(),
		alignItems: z.enum(["start", "center", "end", "stretch"]).optional(),
		fill: PenFillSchema.optional(),
		stroke: PenStrokeSchema.optional(),
		cornerRadius: PenCornerRadiusSchema.optional(),
		clip: z.boolean().optional(),
		effects: z.array(PenEffectSchema).optional(),
		reusable: z.boolean().optional(),
		slot: z.boolean().optional(),
		placeholder: z.boolean().optional(),
		aiGenerating: z.boolean().optional(),
	}),
) as z.ZodType<PenFrame, z.ZodTypeDef, unknown>;

export const PenGroupSchema = z.lazy(() =>
	z.object({
		type: z.literal("group"),
		...PenEntityBaseShape,
		children: z.array(PenNodeSchema as z.ZodType<PenNode, z.ZodTypeDef, unknown>).optional(),
		layout: z.enum(["none", "horizontal", "vertical"]).optional(),
		gap: z.number().optional(),
		padding: PenPaddingSchema.optional(),
	}),
) as z.ZodType<PenGroup, z.ZodTypeDef, unknown>;

export const PenNodeSchema = z.lazy(() =>
	z.union([
		PenFrameSchema as z.ZodType<PenFrame, z.ZodTypeDef, unknown>,
		PenGroupSchema as z.ZodType<PenGroup, z.ZodTypeDef, unknown>,
		PenRectangleSchema,
		PenEllipseSchema,
		PenLineSchema,
		PenPolygonSchema,
		PenPathSchema,
		PenTextSchema,
		PenIconFontSchema,
		PenRefSchema,
		PenNoteSchema,
		PenImageSchema,
		PenEffectNodeSchema,
		PenConnectionSchema,
	]),
) as z.ZodType<PenNode, z.ZodTypeDef, unknown>;

export const PenDocumentSchema = z.object({
	version: z.number(),
	themes: z.array(PenThemeSchema).optional(),
	variables: z.record(z.string(), PenVariableSchema).optional(),
	children: z.array(PenNodeSchema as z.ZodType<PenNode, z.ZodTypeDef, unknown>),
});

export type PenDocument = {
	version: number;
	themes?: PenTheme[];
	variables?: Record<string, PenVariable>;
	children: PenNode[];
};

export function parsePenDocument(data: unknown): PenDocument {
	return PenDocumentSchema.parse(data) as PenDocument;
}
