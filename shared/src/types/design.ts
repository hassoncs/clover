import { z } from "zod";
import type { Vec2 } from "./common";

export const DesignElementRectSchema = z.object({
	type: z.literal("rect"),
	id: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	zIndex: z.number(),
	fill: z.string().optional(),
	stroke: z.string().optional(),
	strokeWidth: z.number().optional(),
	cornerRadius: z.number().optional(),
});

export const DesignElementTextSchema = z.object({
	type: z.literal("text"),
	id: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	zIndex: z.number(),
	content: z.string(),
	fontSize: z.number(),
	fontWeight: z.string().optional(),
	color: z.string().optional(),
	align: z.enum(["left", "center", "right"]).optional(),
});

export const DesignElementImageSchema = z.object({
	type: z.literal("image"),
	id: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	zIndex: z.number(),
	assetRef: z.string().optional(),
	imageUrl: z.string().optional(),
	fit: z.enum(["contain", "cover", "fill"]).optional(),
});

export const DesignElementSchema = z.discriminatedUnion("type", [
	DesignElementRectSchema,
	DesignElementTextSchema,
	DesignElementImageSchema,
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
	version: z.literal("1.0"),
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
		if (version !== "1.0") {
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
		version: "1.0",
		metadata: {
			title,
			gameId,
			createdAt: now,
			updatedAt: now,
		},
		frames: [],
	};
}
