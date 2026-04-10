import { z } from "zod";
export declare const AssetSourceSchema: z.ZodEnum<["generated", "uploaded", "none"]>;
export type AssetSource = z.infer<typeof AssetSourceSchema>;
export declare const ThemeSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    promptModifier: z.ZodString;
    thumbnailUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    creatorUserId: z.ZodOptional<z.ZodString>;
    isPublic: z.ZodBoolean;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    name?: string;
    promptModifier?: string;
    thumbnailUrl?: string;
    creatorUserId?: string;
    isPublic?: boolean;
    createdAt?: number;
    updatedAt?: number;
}, {
    id?: string;
    name?: string;
    promptModifier?: string;
    thumbnailUrl?: string;
    creatorUserId?: string;
    isPublic?: boolean;
    createdAt?: number;
    updatedAt?: number;
}>;
export type Theme = z.infer<typeof ThemeSchema>;
export declare const AssetSchema: z.ZodObject<{
    id: z.ZodString;
    r2Key: z.ZodString;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    creatorUserId: z.ZodOptional<z.ZodString>;
    source: z.ZodEnum<["generated", "uploaded"]>;
    themeId: z.ZodOptional<z.ZodString>;
    compiledPrompt: z.ZodOptional<z.ZodString>;
    modelId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id?: string;
    height?: number;
    width?: number;
    source?: "generated" | "uploaded";
    creatorUserId?: string;
    createdAt?: number;
    r2Key?: string;
    themeId?: string;
    compiledPrompt?: string;
    modelId?: string;
}, {
    id?: string;
    height?: number;
    width?: number;
    source?: "generated" | "uploaded";
    creatorUserId?: string;
    createdAt?: number;
    r2Key?: string;
    themeId?: string;
    compiledPrompt?: string;
    modelId?: string;
}>;
export type Asset = z.infer<typeof AssetSchema>;
export declare const AssetPlacementSchema: z.ZodObject<{
    scale: z.ZodNumber;
    offsetX: z.ZodNumber;
    offsetY: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    scale?: number;
    offsetX?: number;
    offsetY?: number;
}, {
    scale?: number;
    offsetX?: number;
    offsetY?: number;
}>;
export type AssetPlacement = z.infer<typeof AssetPlacementSchema>;
export declare const GenerationStatusSchema: z.ZodEnum<["queued", "running", "succeeded", "failed", "canceled"]>;
export type GenerationStatus = z.infer<typeof GenerationStatusSchema>;
export declare const GenerationJobSchema: z.ZodObject<{
    id: z.ZodString;
    gameId: z.ZodString;
    remixId: z.ZodOptional<z.ZodString>;
    themeId: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["queued", "running", "succeeded", "failed", "canceled"]>;
    style: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodNumber;
    startedAt: z.ZodOptional<z.ZodNumber>;
    finishedAt: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    style?: string;
    status?: "queued" | "running" | "succeeded" | "failed" | "canceled";
    createdAt?: number;
    themeId?: string;
    gameId?: string;
    remixId?: string;
    startedAt?: number;
    finishedAt?: number;
}, {
    id?: string;
    style?: string;
    status?: "queued" | "running" | "succeeded" | "failed" | "canceled";
    createdAt?: number;
    themeId?: string;
    gameId?: string;
    remixId?: string;
    startedAt?: number;
    finishedAt?: number;
}>;
export type GenerationJob = z.infer<typeof GenerationJobSchema>;
export declare const GenerationTaskSchema: z.ZodObject<{
    id: z.ZodString;
    jobId: z.ZodString;
    prefabId: z.ZodString;
    status: z.ZodEnum<["queued", "running", "succeeded", "failed", "canceled"]>;
    compiledPrompt: z.ZodOptional<z.ZodString>;
    modelId: z.ZodOptional<z.ZodString>;
    targetWidth: z.ZodOptional<z.ZodNumber>;
    targetHeight: z.ZodOptional<z.ZodNumber>;
    assetId: z.ZodOptional<z.ZodString>;
    errorMessage: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id?: string;
    status?: "queued" | "running" | "succeeded" | "failed" | "canceled";
    createdAt?: number;
    compiledPrompt?: string;
    modelId?: string;
    jobId?: string;
    prefabId?: string;
    targetWidth?: number;
    targetHeight?: number;
    assetId?: string;
    errorMessage?: string;
}, {
    id?: string;
    status?: "queued" | "running" | "succeeded" | "failed" | "canceled";
    createdAt?: number;
    compiledPrompt?: string;
    modelId?: string;
    jobId?: string;
    prefabId?: string;
    targetWidth?: number;
    targetHeight?: number;
    assetId?: string;
    errorMessage?: string;
}>;
export type GenerationTask = z.infer<typeof GenerationTaskSchema>;
export declare const DEFAULT_ASSET_PLACEMENT: AssetPlacement;
//# sourceMappingURL=asset-system.d.ts.map