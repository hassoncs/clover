import { z } from 'zod';
import type { AssetSource } from './GameDefinition';
import { AssetSourceSchema } from './schemas';

export type GenerationStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

export interface GameAsset {
  id: string;
  ownerGameId?: string;
  source: AssetSource;
  imageUrl: string;
  width?: number;
  height?: number;
  contentHash?: string;
  createdAt: number;
  deletedAt?: number;
}

export interface AssetPlacement {
  scale: number;
  offsetX: number;
  offsetY: number;
  anchor?: { x: number; y: number };
}

export interface PromptDefaults {
  themePrompt?: string;
  styleOverride?: string;
  modelId?: string;
  negativePrompt?: string;
}

export interface PromptComponents {
  themePrompt?: string;
  entityPrompt: string;
  styleOverride?: string;
  negativePrompt?: string;
  positioningHint?: string;
}

export interface PhysicsContext {
  shape: 'box' | 'circle' | 'polygon';
  width?: number;
  height?: number;
  radius?: number;
}

export interface AssetPackV2 {
  id: string;
  gameId: string;
  name: string;
  description?: string;
  promptDefaults?: PromptDefaults;
  createdAt: number;
  deletedAt?: number;
}

export interface AssetPackEntry {
  id: string;
  packId: string;
  templateId: string;
  assetId: string;
  placement?: AssetPlacement;
  lastGeneration?: GenerationResultSnapshot;
}

export interface GenerationResultSnapshot {
  jobId: string;
  taskId: string;
  compiledPrompt: string;
  createdAt: number;
}

export interface GenerationJob {
  id: string;
  gameId: string;
  packId?: string;
  status: GenerationStatus;
  promptDefaults: PromptDefaults;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}

export interface GenerationTask {
  id: string;
  jobId: string;
  templateId: string;
  status: GenerationStatus;
  promptComponents: PromptComponents;
  compiledPrompt: string;
  compiledNegativePrompt?: string;
  modelId?: string;
  targetWidth: number;
  targetHeight: number;
  aspectRatio: string;
  physicsContext: PhysicsContext;
  scenarioRequestId?: string;
  assetId?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}

export interface AssetBindingRef {
  assetId: string;
  placement?: AssetPlacement;
}

export interface AssetSystemConfig {
  activeAssetPackId?: string;
  entityAssetOverrides?: Record<string, AssetBindingRef>;
  baseAssetUrl?: string;
}

export const GenerationStatusSchema = z.enum(['queued', 'running', 'succeeded', 'failed', 'canceled']);

export const AssetPlacementSchema = z.object({
  scale: z.number(),
  offsetX: z.number(),
  offsetY: z.number(),
  anchor: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const PromptDefaultsSchema = z.object({
  themePrompt: z.string().optional(),
  styleOverride: z.string().optional(),
  modelId: z.string().optional(),
  negativePrompt: z.string().optional(),
});

export const PromptComponentsSchema = z.object({
  themePrompt: z.string().optional(),
  entityPrompt: z.string(),
  styleOverride: z.string().optional(),
  negativePrompt: z.string().optional(),
  positioningHint: z.string().optional(),
});

export const PhysicsContextSchema = z.object({
  shape: z.enum(['box', 'circle', 'polygon']),
  width: z.number().optional(),
  height: z.number().optional(),
  radius: z.number().optional(),
});

export const GameAssetSchema = z.object({
  id: z.string(),
  ownerGameId: z.string().optional(),
  source: AssetSourceSchema,
  imageUrl: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  contentHash: z.string().optional(),
  createdAt: z.number(),
  deletedAt: z.number().optional(),
});

export const GenerationResultSnapshotSchema = z.object({
  jobId: z.string(),
  taskId: z.string(),
  compiledPrompt: z.string(),
  createdAt: z.number(),
});

export const AssetPackEntrySchema = z.object({
  id: z.string(),
  packId: z.string(),
  templateId: z.string(),
  assetId: z.string(),
  placement: AssetPlacementSchema.optional(),
  lastGeneration: GenerationResultSnapshotSchema.optional(),
});

export const AssetPackV2Schema = z.object({
  id: z.string(),
  gameId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  promptDefaults: PromptDefaultsSchema.optional(),
  createdAt: z.number(),
  deletedAt: z.number().optional(),
});

export const GenerationJobSchema = z.object({
  id: z.string(),
  gameId: z.string(),
  packId: z.string().optional(),
  status: GenerationStatusSchema,
  promptDefaults: PromptDefaultsSchema,
  createdAt: z.number(),
  startedAt: z.number().optional(),
  finishedAt: z.number().optional(),
});

export const GenerationTaskSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  templateId: z.string(),
  status: GenerationStatusSchema,
  promptComponents: PromptComponentsSchema,
  compiledPrompt: z.string(),
  compiledNegativePrompt: z.string().optional(),
  modelId: z.string().optional(),
  targetWidth: z.number(),
  targetHeight: z.number(),
  aspectRatio: z.string(),
  physicsContext: PhysicsContextSchema,
  scenarioRequestId: z.string().optional(),
  assetId: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.number(),
  startedAt: z.number().optional(),
  finishedAt: z.number().optional(),
});

export const AssetBindingRefSchema = z.object({
  assetId: z.string(),
  placement: AssetPlacementSchema.optional(),
});

export const AssetSystemConfigSchema = z.object({
  activeAssetPackId: z.string().optional(),
  entityAssetOverrides: z.record(z.string(), AssetBindingRefSchema).optional(),
  baseAssetUrl: z.string().optional(),
});

export const DEFAULT_ASSET_PLACEMENT: AssetPlacement = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};
