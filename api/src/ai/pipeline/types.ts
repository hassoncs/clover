/**
 * Asset Generation Pipeline Types
 *
 * Type-driven pipeline where different asset types flow through different stages.
 * This is the core type system - runtime-agnostic, no Node.js or Workers APIs.
 */

// =============================================================================
// ASSET TYPES - The discriminator for pipeline flow
// =============================================================================

export type AssetType = 'entity' | 'background' | 'title_hero' | 'parallax';

// =============================================================================
// SPRITE STYLES - Visual style for generated assets
// =============================================================================

export type SpriteStyle = 'pixel' | 'cartoon' | '3d' | 'flat';

export const STYLE_DESCRIPTORS: Record<SpriteStyle, { aesthetic: string; technical: string }> = {
  pixel: {
    aesthetic: 'pixel art, 16-bit retro game style, crisp pixels',
    technical: 'no anti-aliasing, sharp pixel edges, limited color palette',
  },
  cartoon: {
    aesthetic: 'cartoon style, bold black outlines, vibrant saturated colors',
    technical: 'cel-shaded, clean vector-like edges, flat color fills',
  },
  '3d': {
    aesthetic: '3D rendered, stylized low-poly, soft ambient occlusion',
    technical: 'clean geometry, subtle shadows, matte materials',
  },
  flat: {
    aesthetic: 'flat design, geometric shapes, modern minimal',
    technical: 'no gradients, solid colors, clean vector shapes',
  },
};

// =============================================================================
// ENTITY TYPES - Game entity classification for model selection
// =============================================================================

export type EntityType = 'character' | 'enemy' | 'item' | 'platform' | 'background' | 'ui';

// =============================================================================
// ASSET SPECS - Input configurations for each asset type
// =============================================================================

export interface EntitySpec {
  type: 'entity';
  id: string;
  /** Physics shape for silhouette generation */
  shape: 'box' | 'circle';
  /** Physics dimensions in world units */
  width: number;
  height: number;
  /** Entity classification for model selection */
  entityType: EntityType;
  /** Visual description for the prompt */
  description: string;
  /** Optional color hint */
  color?: string;
}

export interface BackgroundSpec {
  type: 'background';
  id: string;
  /** Full prompt for background generation */
  prompt: string;
  /** Output dimensions in pixels */
  width?: number;
  height?: number;
}

export interface TitleHeroSpec {
  type: 'title_hero';
  id: string;
  /** Game title text to render */
  title: string;
  /** Theme description for styling */
  themeDescription: string;
  /** Output dimensions in pixels */
  width?: number;
  height?: number;
}

export interface ParallaxSpec {
  type: 'parallax';
  id: string;
  /** Scene description */
  prompt: string;
  /** Number of depth layers to generate */
  layerCount: number;
  /** Output dimensions in pixels */
  width?: number;
  height?: number;
}

export type AssetSpec = EntitySpec | BackgroundSpec | TitleHeroSpec | ParallaxSpec;

// =============================================================================
// GAME CONFIG - Configuration for generating all assets for a game
// =============================================================================

export interface GameAssetConfig {
  /** Unique game identifier */
  gameId: string;
  /** Game display title */
  gameTitle: string;
  /** Theme description applied to all assets */
  theme: string;
  /** Visual style for all assets */
  style: SpriteStyle;
  /** R2 storage prefix (e.g., "generated/slopeggle") */
  r2Prefix: string;
  /** Local output directory for debug files */
  localOutputDir?: string;
  /** Assets to generate */
  assets: AssetSpec[];
}

// =============================================================================
// ARTIFACTS - Intermediate and final outputs from pipeline stages
// =============================================================================

export interface Artifacts {
  /** Silhouette PNG buffer (for entity sprites) */
  silhouettePng?: Uint8Array;
  /** Constructed prompt text */
  prompt?: string;
  /** Negative prompt text */
  negativePrompt?: string;
  /** Scenario.com asset ID after upload */
  scenarioAssetId?: string;
  /** Generated image buffer (before background removal) */
  generatedImage?: Uint8Array;
  /** Image buffer after background removal */
  bgRemovedImage?: Uint8Array;
  /** Parallax layer image buffers */
  layerImages?: Uint8Array[];
  /** Final R2 keys for uploaded assets */
  r2Keys?: string[];
  /** Public URLs for uploaded assets */
  publicUrls?: string[];
}

// =============================================================================
// ASSET RUN - Context passed through pipeline stages
// =============================================================================

export interface AssetRun<T extends AssetSpec = AssetSpec> {
  /** The asset specification being processed */
  spec: T;
  /** Accumulated artifacts from stages */
  artifacts: Artifacts;
  /** Metadata about the run */
  meta: {
    gameId: string;
    gameTitle: string;
    theme: string;
    style: SpriteStyle;
    r2Prefix: string;
    startedAt: number;
    runId: string;
  };
}

// =============================================================================
// DEBUG EVENTS - Events emitted during pipeline execution
// =============================================================================

export type DebugEvent =
  | { type: 'run:start'; runId: string; assetId: string; assetType: AssetType }
  | { type: 'stage:start'; runId: string; assetId: string; stageId: string }
  | {
      type: 'artifact';
      runId: string;
      assetId: string;
      stageId: string;
      name: string;
      contentType: 'image/png' | 'text/plain' | 'application/json';
      data: Uint8Array | string;
    }
  | { type: 'stage:end'; runId: string; assetId: string; stageId: string; durationMs: number; ok: boolean; error?: string }
  | { type: 'run:end'; runId: string; assetId: string; durationMs: number; ok: boolean; error?: string; r2Keys?: string[] };

export type DebugSink = (event: DebugEvent) => void | Promise<void>;

// =============================================================================
// PIPELINE STAGE - A single step in the pipeline
// =============================================================================

export interface Stage {
  /** Unique identifier for this stage */
  id: string;
  /** Human-readable name */
  name: string;
  /** Execute this stage, returning updated run context */
  run: (run: AssetRun, adapters: PipelineAdapters, debug: DebugSink) => Promise<AssetRun>;
}

// =============================================================================
// PIPELINE ADAPTERS - Platform-specific implementations injected into stages
// =============================================================================

export interface ScenarioAdapter {
  /** Upload an image buffer to Scenario.com, returns asset ID */
  uploadImage: (png: Uint8Array) => Promise<string>;
  /** Generate image from text prompt */
  txt2img: (params: {
    prompt: string;
    width?: number;
    height?: number;
    negativePrompt?: string;
  }) => Promise<{ assetId: string }>;
  /** Generate image from image + prompt (silhouette-guided) */
  img2img: (params: {
    imageAssetId: string;
    prompt: string;
    strength?: number;
  }) => Promise<{ assetId: string }>;
  /** Download image buffer from Scenario.com */
  downloadImage: (assetId: string) => Promise<{ buffer: Uint8Array; extension: string }>;
  /** Remove background from image */
  removeBackground: (assetId: string) => Promise<{ assetId: string }>;
  /** Decompose image into layers (for parallax) */
  layeredDecompose?: (params: {
    imageAssetId: string;
    layerCount: number;
    description?: string;
  }) => Promise<{ assetIds: string[] }>;
}

export interface R2Adapter {
  /** Upload buffer to R2 storage */
  put: (key: string, body: Uint8Array, options?: { contentType?: string }) => Promise<void>;
  /** Get public URL for an R2 key */
  getPublicUrl: (key: string) => string;
}

export interface SilhouetteAdapter {
  /** Create a silhouette PNG for physics shape */
  createSilhouette: (params: {
    shape: 'box' | 'circle';
    width: number;
    height: number;
    canvasSize?: number;
  }) => Promise<Uint8Array>;
}

export interface PipelineAdapters {
  scenario: ScenarioAdapter;
  r2: R2Adapter;
  silhouette: SilhouetteAdapter;
}

// =============================================================================
// PIPELINE RESULT - Final output from pipeline execution
// =============================================================================

export interface PipelineResult {
  success: boolean;
  assetId: string;
  assetType: AssetType;
  r2Keys: string[];
  publicUrls: string[];
  durationMs: number;
  error?: string;
}

export interface BatchPipelineResult {
  gameId: string;
  totalAssets: number;
  successful: number;
  failed: number;
  results: PipelineResult[];
  durationMs: number;
}
