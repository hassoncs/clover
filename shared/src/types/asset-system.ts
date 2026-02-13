import { z } from "zod";

export const AssetSourceSchema = z.enum(["generated", "uploaded", "none"]);
export type AssetSource = z.infer<typeof AssetSourceSchema>;

export const ThemeSchema = z.object({
	id: z.string(),
	name: z.string(),
	promptModifier: z.string(),
	thumbnailUrl: z.string().optional().nullable(),
	creatorUserId: z.string().optional(),
	isPublic: z.boolean(),
	createdAt: z.number(),
	updatedAt: z.number().optional(),
});

export type Theme = z.infer<typeof ThemeSchema>;

export const AssetSchema = z.object({
	id: z.string(),
	r2Key: z.string(),
	width: z.number().optional(),
	height: z.number().optional(),
	creatorUserId: z.string().optional(),
	source: z.enum(["generated", "uploaded"]),
	themeId: z.string().optional(),
	compiledPrompt: z.string().optional(),
	modelId: z.string().optional(),
	createdAt: z.number(),
});

export type Asset = z.infer<typeof AssetSchema>;

export const AssetPlacementSchema = z.object({
	scale: z.number(),
	offsetX: z.number(),
	offsetY: z.number(),
});

export type AssetPlacement = z.infer<typeof AssetPlacementSchema>;

export const GenerationStatusSchema = z.enum([
	"queued",
	"running",
	"succeeded",
	"failed",
	"canceled",
]);
export type GenerationStatus = z.infer<typeof GenerationStatusSchema>;

export const GenerationJobSchema = z.object({
	id: z.string(),
	gameId: z.string(),
	remixId: z.string().optional(),
	themeId: z.string().optional(),
	status: GenerationStatusSchema,
	style: z.string().optional(),
	createdAt: z.number(),
	startedAt: z.number().optional(),
	finishedAt: z.number().optional(),
});

export type GenerationJob = z.infer<typeof GenerationJobSchema>;

export const GenerationTaskSchema = z.object({
	id: z.string(),
	jobId: z.string(),
	prefabId: z.string(),
	status: GenerationStatusSchema,
	compiledPrompt: z.string().optional(),
	modelId: z.string().optional(),
	targetWidth: z.number().optional(),
	targetHeight: z.number().optional(),
	assetId: z.string().optional(),
	errorMessage: z.string().optional(),
	createdAt: z.number(),
});

export type GenerationTask = z.infer<typeof GenerationTaskSchema>;

export const DEFAULT_ASSET_PLACEMENT: AssetPlacement = {
	scale: 1,
	offsetX: 0,
	offsetY: 0,
};
