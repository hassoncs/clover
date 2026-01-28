/**
 * Provider-agnostic contract for image generation.
 *
 * Goals:
 * - One internal shape for TRPC + pipeline stages to pass inputs and receive images.
 * - Stable provider identifiers + error codes for UI/CLI.
 * - Keep provider-specific IDs available for debugging and follow-up operations.
 */

export type ImageProvider = 'scenario' | 'comfyui' | 'modal';

// =============================================================================
// Input spec + provider selection
// =============================================================================

export type ImageGenerationOperation = 'txt2img' | 'img2img' | 'remove_background' | 'layered_decompose';

export type ImageInputRef =
  | { type: 'provider_asset'; assetId: string }
  | { type: 'buffer'; buffer: Uint8Array };

/**
 * Provider-agnostic image generation input.
 *
 * Notes:
 * - `width`/`height` are the requested output size for operations where applicable.
 * - For operations where dimensions are not configurable (e.g. bg removal), providers
 *   SHOULD infer dimensions from the returned image buffer when possible.
 */
export interface ImageGenerationInput {
  operation: ImageGenerationOperation;
  prompt?: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: string | number;
  /** Provider model/workflow identifier (scenario modelId, comfy workflow name, runpod model label) */
  modelId?: string;
  /** Input image for img2img/bg removal/layering */
  image?: ImageInputRef;
  /** Denoising strength (0-1) for img2img */
  strength?: number;
  /** Layer count for layered decomposition */
  layerCount?: number;
  /** Optional description for layered decomposition */
  description?: string;
}

export interface ProviderSelection {
  provider: ImageProvider;
  /** Optional forced provider model/workflow identifier */
  modelId?: string;
}

// =============================================================================
// Output contract
// =============================================================================

/**
 * Single-image result.
 *
 * Provider IDs:
 * - `providerJobId`: request/job identifier (when available).
 * - `providerAssetId`: provider-side asset identifier (when available).
 *
 * Storage guidance:
 * - Pipeline stages SHOULD keep provider IDs in `artifacts` for follow-up operations
 *   (download, bg removal, layered decompose).
 * - Persisting provider IDs in DB is optional and schema-dependent. Today we only
 *   persist Scenario's asset id via the existing `scenario_asset_id` column.
 * - For non-Scenario providers, treat provider asset IDs as ephemeral unless/until
 *   we add a dedicated DB column.
 */
export interface ImageGenerationResult {
  buffer: Uint8Array;
  metadata: {
    seed?: string | number;
    width: number;
    height: number;
    modelId: string;
    providerJobId?: string;
    provider: ImageProvider;
  };
  /** Optional provider-side asset identifier (ephemeral unless persisted separately). */
  providerAssetId?: string;
  /** Optional MIME type when known (default assumption: image/png). */
  mimeType?: string;
}

export interface LayeredImageGenerationResult {
  layers: ImageGenerationResult[];
}

// =============================================================================
// Stable error codes
// =============================================================================

export enum ProviderErrorCode {
  PROVIDER_TIMEOUT = 'PROVIDER_TIMEOUT',
  PROVIDER_COLD_START = 'PROVIDER_COLD_START',
  WORKFLOW_INVALID = 'WORKFLOW_INVALID',
  INPUT_INVALID = 'INPUT_INVALID',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN_PROVIDER_ERROR = 'UNKNOWN_PROVIDER_ERROR',
}

export class ProviderError extends Error {
  public readonly code: ProviderErrorCode;
  public readonly provider: ImageProvider;
  public readonly providerJobId?: string;
  public readonly providerAssetId?: string;
  public readonly cause?: unknown;

  constructor(params: {
    code: ProviderErrorCode;
    provider: ImageProvider;
    message: string;
    providerJobId?: string;
    providerAssetId?: string;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = 'ProviderError';
    this.code = params.code;
    this.provider = params.provider;
    this.providerJobId = params.providerJobId;
    this.providerAssetId = params.providerAssetId;
    this.cause = params.cause;
  }
}

// =============================================================================
// Helpers
// =============================================================================

export function tryGetPngDimensions(buffer: Uint8Array): { width: number; height: number } | null {
  // PNG signature (8 bytes)
  if (buffer.length < 24) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < sig.length; i++) {
    if (buffer[i] !== sig[i]) return null;
  }

  // IHDR chunk starts at byte 8:
  // [length:4][type:4('IHDR')][data...]
  const typeOffset = 12;
  if (
    buffer[typeOffset] !== 0x49 ||
    buffer[typeOffset + 1] !== 0x48 ||
    buffer[typeOffset + 2] !== 0x44 ||
    buffer[typeOffset + 3] !== 0x52
  ) {
    return null;
  }

  const widthOffset = 16;
  const heightOffset = 20;
  const width =
    ((buffer[widthOffset] << 24) |
      (buffer[widthOffset + 1] << 16) |
      (buffer[widthOffset + 2] << 8) |
      buffer[widthOffset + 3]) >>> 0;
  const height =
    ((buffer[heightOffset] << 24) |
      (buffer[heightOffset + 1] << 16) |
      (buffer[heightOffset + 2] << 8) |
      buffer[heightOffset + 3]) >>> 0;

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}
