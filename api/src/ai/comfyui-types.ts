/**
 * Type definitions for ComfyUI API client via RunPod
 *
 * Supports both direct ComfyUI API and RunPod Serverless endpoints.
 */

/**
 * Configuration for the ComfyUI client
 */
export interface ComfyUIConfig {
  /** RunPod endpoint URL or direct ComfyUI host */
  endpoint: string;
  /** RunPod API key (required for serverless) */
  apiKey?: string;
  /** Whether this is a RunPod serverless endpoint */
  isServerless?: boolean;
  /** Timeout for job completion in ms (default: 300000 = 5 minutes) */
  timeout?: number;
}

/**
 * Parameters for text-to-image generation
 */
export interface ComfyTxt2ImgParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  seed?: number;
  /** Workflow override (default: flux-txt2img) */
  workflow?: string;
}

/**
 * Parameters for image-to-image generation
 */
export interface ComfyImg2ImgParams {
  /** Base64-encoded image or image ID from previous upload */
  image: string;
  prompt: string;
  negativePrompt?: string;
  /** Denoising strength (0-1, higher = more change). Default: 0.95 */
  strength?: number;
  steps?: number;
  guidance?: number;
  seed?: number;
  /** Workflow override (default: flux-img2img) */
  workflow?: string;
}

/**
 * Parameters for background removal
 */
export interface ComfyRemoveBackgroundParams {
  /** Base64-encoded image or image ID */
  image: string;
  /** Model to use (default: BEN2) */
  model?: 'BEN2' | 'BiRefNet' | 'RMBG-2.0';
  /** Workflow override (default: remove-background) */
  workflow?: string;
}

/**
 * Parameters for layered image decomposition
 */
export interface ComfyLayeredParams {
  /** Base64-encoded image or image ID */
  image: string;
  /** Number of layers to generate (1-10, default: 4) */
  layerCount?: number;
  /** Description to guide layer separation */
  description?: string;
  /** Workflow override (default: layered-decompose) */
  workflow?: string;
}

/**
 * ComfyUI workflow node structure
 */
export interface ComfyWorkflowNode {
  class_type: string;
  inputs: Record<string, unknown>;
  _meta?: { title?: string };
}

/**
 * ComfyUI API format workflow (node ID -> node definition)
 */
export type ComfyWorkflow = Record<string, ComfyWorkflowNode>;

/**
 * Response from ComfyUI prompt queue
 */
export interface ComfyPromptResponse {
  prompt_id: string;
  number: number;
  node_errors?: Record<string, unknown>;
}

/**
 * Image output from ComfyUI
 */
export interface ComfyImageOutput {
  filename: string;
  subfolder: string;
  type: 'output' | 'temp';
}

/**
 * History entry for a completed prompt
 */
export interface ComfyHistoryEntry {
  prompt: [number, string, ComfyWorkflow, unknown, string[]];
  outputs: Record<string, { images?: ComfyImageOutput[] }>;
  status: { status_str: string; completed: boolean; messages: unknown[] };
}

/**
 * RunPod serverless request format
 */
export interface RunPodRequest {
  input: {
    workflow: ComfyWorkflow;
    images?: Array<{ name: string; image: string }>;
  };
}

/**
 * RunPod serverless response format
 */
export interface RunPodResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  output?: {
    images?: Array<{ image: string; filename: string }>;
    error?: string;
  };
  error?: string;
}

/**
 * Internal asset reference (used for tracking uploaded/generated images)
 */
export interface ComfyAsset {
  id: string;
  /** Base64-encoded image data */
  data: string;
  /** MIME type */
  mimeType: string;
  /** Original filename if available */
  filename?: string;
}

/**
 * Default configuration values
 */
export const COMFYUI_DEFAULTS = {
  WIDTH: 1024,
  HEIGHT: 1024,
  STEPS: 28,
  GUIDANCE: 3.5,
  STRENGTH: 0.95,
  LAYER_COUNT: 4,
  TIMEOUT_MS: 300000,
  POLL_INTERVAL_MS: 2000,
  MAX_POLL_ATTEMPTS: 150,
  BG_REMOVAL_MODEL: 'BEN2' as const,
} as const;

/**
 * Workflow template identifiers
 */
export const WORKFLOW_IDS = {
  TXT2IMG: 'flux-txt2img',
  IMG2IMG: 'flux-img2img',
  REMOVE_BACKGROUND: 'remove-background',
  LAYERED_DECOMPOSE: 'layered-decompose',
} as const;

/**
 * MIME type to file extension mapping
 */
export const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
};

/**
 * File extension to MIME type mapping
 */
export const EXT_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};
