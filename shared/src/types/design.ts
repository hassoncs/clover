import { z } from "zod";

export const DesignShadowSchema = z.object({
	color: z.string(),
	offsetX: z.number(),
	offsetY: z.number(),
	blur: z.number(),
});

export const DesignGradientSchema = z.object({
	type: z.enum(["linear", "radial"]),
	stops: z.array(
		z.object({
			color: z.string(),
			position: z.number(),
		}),
	),
	angle: z.number().optional(),
});

export const DesignElementBaseSchema = z.object({
	id: z.string(),
	zIndex: z.number(),
	opacity: z.number().min(0).max(1).optional(),
	rotation: z.number().optional(),
	shadow: DesignShadowSchema.optional(),
	gradient: DesignGradientSchema.optional(),
});

export const DesignElementRectSchema = DesignElementBaseSchema.extend({
	type: z.literal("rect"),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	fill: z.string().optional(),
	stroke: z.string().optional(),
	strokeWidth: z.number().optional(),
	cornerRadius: z.number().optional(),
});

export const DesignElementTextSchema = DesignElementBaseSchema.extend({
	type: z.literal("text"),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	content: z.string(),
	fontSize: z.number(),
	fontWeight: z.string().optional(),
	color: z.string().optional(),
	align: z.enum(["left", "center", "right"]).optional(),
});

export const DesignElementImageSchema = DesignElementBaseSchema.extend({
	type: z.literal("image"),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	assetRef: z.string().optional(),
	imageUrl: z.string().optional(),
	fit: z.enum(["contain", "cover", "fill"]).optional(),
});

export const DesignElementCircleSchema = DesignElementBaseSchema.extend({
	type: z.literal("circle"),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	fill: z.string().optional(),
	stroke: z.string().optional(),
	strokeWidth: z.number().optional(),
});

export const DesignElementLineSchema = DesignElementBaseSchema.extend({
	type: z.literal("line"),
	x1: z.number(),
	y1: z.number(),
	x2: z.number(),
	y2: z.number(),
	stroke: z.string().optional(),
	strokeWidth: z.number().optional(),
});

export const DesignElementPathSchema = DesignElementBaseSchema.extend({
	type: z.literal("path"),
	x: z.number(),
	y: z.number(),
	data: z.string(),
	fill: z.string().optional(),
	stroke: z.string().optional(),
	strokeWidth: z.number().optional(),
});

export const DesignElementGroupSchema = DesignElementBaseSchema.extend({
	type: z.literal("group"),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	childIds: z.array(z.string()),
});

export const DesignElementSchema = z.discriminatedUnion("type", [
	DesignElementRectSchema,
	DesignElementTextSchema,
	DesignElementImageSchema,
	DesignElementCircleSchema,
	DesignElementLineSchema,
	DesignElementPathSchema,
	DesignElementGroupSchema,
]);

export type DesignElement = z.infer<typeof DesignElementSchema>;

export const DesignFrameSchema = z.object({
	id: z.string(),
	title: z.string(),
	width: z.number(),
	height: z.number(),
	position: z.object({
		x: z.number(),
		y: z.number(),
	}),
	elements: z.array(DesignElementSchema),
});

export type DesignFrame = z.infer<typeof DesignFrameSchema>;

export const DesignDocumentSchema = z.object({
	version: z.literal("1.1"),
	metadata: z.object({
		title: z.string(),
		gameId: z.string(),
		createdAt: z.number(),
		updatedAt: z.number(),
	}),
	frames: z.array(DesignFrameSchema),
});

export type DesignDocument = z.infer<typeof DesignDocumentSchema>;

export class DesignSchemaError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DesignSchemaError";
	}
}

export function parseDesignDocument(data: unknown): DesignDocument {
	// Check version first for specific error message
	if (typeof data === "object" && data !== null && "version" in data) {
		const version = (data as any).version;
		if (version !== "1.1") {
			throw new DesignSchemaError(`unsupported version: ${version}`);
		}
	}

	const result = DesignDocumentSchema.safeParse(data);
	if (!result.success) {
		throw new DesignSchemaError(
			`Invalid design document schema: ${result.error.message}`,
		);
	}
	return result.data;
}

export function isDesignDocument(data: unknown): data is DesignDocument {
	return DesignDocumentSchema.safeParse(data).success;
}

export function createEmptyDesignDocument(
	gameId: string,
	title: string,
): DesignDocument {
	const now = Date.now();
	return {
		version: "1.1",
		metadata: {
			title,
			gameId,
			createdAt: now,
			updatedAt: now,
		},
		frames: [],
	};
}
