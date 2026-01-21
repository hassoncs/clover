/**
 * Type definitions for Scenario.com API client
 * Adapted from scenario-image-gen MCP implementation
 */

/**
 * Configuration for the Scenario API client
 */
export interface ScenarioConfig {
  apiKey: string;
  apiSecret: string;
  apiUrl?: string;
}

/**
 * Parameters for standard text-to-image generation (Flux, SDXL models)
 */
export interface GenerationParams {
  prompt: string;
  modelId?: string;
  numSamples?: number;
  width?: number;
  height?: number;
  guidance?: number;
  numInferenceSteps?: number;
  negativePrompt?: string;
  seed?: string;
}

/**
 * Parameters for third-party/custom model generation (Retro Diffusion, Gemini, etc.)
 * Uses /generate/custom/{modelId} endpoint with aspectRatio instead of width/height
 */
export interface ThirdPartyGenerationParams {
  prompt: string;
  modelId: string;
  numSamples?: number;
  aspectRatio?: string;
  seed?: string;
}

/**
 * Parameters for image-to-image transformation
 */
export interface Img2ImgParams {
  prompt: string;
  image: string;
  strength: number;
  modelId?: string;
  numSamples?: number;
  guidance?: number;
  numInferenceSteps?: number;
  seed?: string;
}

/**
 * Parameters for background removal
 */
export interface RemoveBackgroundParams {
  image: string;
  format?: 'png' | 'jpg' | 'webp';
  backgroundColor?: string;
}

/**
 * Job status from Scenario API
 */
export type JobStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled';

/**
 * Job response from Scenario API
 */
export interface JobResponse {
  job: {
    jobId: string;
    status: JobStatus;
    progress?: number;
    metadata?: {
      assetIds?: string[];
    };
    error?: string;
  };
}

/**
 * Asset response from Scenario API
 */
export interface AssetResponse {
  asset: {
    id: string;
    url: string;
    mimeType?: string;
    width?: number;
    height?: number;
  };
}

/**
 * Upload response from Scenario API
 */
export interface UploadResponse {
  asset?: {
    id: string;
  };
  symbol?: {
    id: string;
  };
}

/**
 * Model item from Scenario API
 */
export interface Model {
  id: string;
  name: string;
  description?: string;
  type?: string;
  privacy?: string;
  coverImageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Models response from Scenario API
 */
export interface ModelsResponse {
  models: Model[];
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

/**
 * Result of a generation request
 */
export interface GenerationResult {
  jobId: string;
  assetIds: string[];
  urls: string[];
}

/**
 * Scenario API error structure
 */
export interface ScenarioApiError {
  error?: {
    message?: string;
    code?: string;
  };
  message?: string;
}

/**
 * MIME type to file extension mapping
 */
export const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/**
 * Default configuration values
 */
export const SCENARIO_DEFAULTS = {
  API_URL: 'https://api.cloud.scenario.com/v1',
  MODEL: 'flux.1-dev',
  POLL_INTERVAL_MS: 3000,
  MAX_POLL_ATTEMPTS: 200,
  DEFAULT_WIDTH: 1024,
  DEFAULT_HEIGHT: 1024,
  DEFAULT_GUIDANCE: 3.5,
  DEFAULT_STEPS: 28,
} as const;

/**
 * Third-party model prefixes that use /generate/custom endpoint
 */
export const CUSTOM_MODEL_PREFIXES = [
  'model_imagen',
  'model_google-gemini',
  'model_hunyuan',
  'model_ideogram',
  'model_seedream',
  'model_dreamina',
  'model_recraft',
  'model_luma-',
  'model_minimax',
  'model_qwen',
  'model_reve',
  'model_z-',
  'model_p-',
  'model_openai-gpt-image',
  'model_retrodiffusion',
  'model_bfl-flux-2',
  'model_bfl-flux-1-1',
  'model_flux-kontext',
  'model_flux-krea',
  'model_bytedance',
] as const;
