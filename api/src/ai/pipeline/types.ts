/**
 * Asset Generation Pipeline Types
 *
 * Type-driven pipeline where different asset types flow through different stages.
 * This is the core type system - runtime-agnostic, no Node.js or Workers APIs.
 */

// =============================================================================
// ASSET TYPES - The discriminator for pipeline flow
// =============================================================================

export type AssetType = 'entity' | 'background' | 'title_hero' | 'title_hero_no_bg' | 'parallax' | 'sheet' | 'text_grid';

export type { ImageProvider } from '@/ai/providers/contract'
type ImageProvider = import('@/ai/providers/contract').ImageProvider

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
  /** Skip silhouette-guided generation — use txt2img instead (for irregular/organic shapes) */
  skipSilhouette?: boolean;
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

export interface TitleHeroNoBgSpec {
  type: 'title_hero_no_bg';
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

// =============================================================================
// SHEET TYPES - Asset sheet specifications
// =============================================================================

export type SheetKind = 'sprite' | 'tile' | 'variation' | 'ui_component';

export type SheetLayout =
  | { type: 'grid'; columns: number; rows: number; cellWidth: number; cellHeight: number; spacing?: number; margin?: number; origin?: 'top-left' }
  | { type: 'strip'; direction: 'horizontal' | 'vertical'; frameCount: number; cellWidth: number; cellHeight: number; spacing?: number; margin?: number }
  | { type: 'manual' };

export interface SheetPromptConfig {
  basePrompt: string;
  commonModifiers?: string[];
  stylePreset?: string;
}

export interface SheetSpecBase {
  type: 'sheet';
  id: string;
  kind: SheetKind;
  layout: SheetLayout;
  width?: number;
  height?: number;
  promptConfig?: SheetPromptConfig;
  entryOverrides?: Record<string, string>;
}

export interface SpriteSheetSpec extends SheetSpecBase {
  kind: 'sprite';
  animations: Record<string, { frames: string[]; fps: number; loop?: boolean }>;
}

export interface TileSheetSpec extends SheetSpecBase {
  kind: 'tile';
  tileWidth: number;
  tileHeight: number;
  tileOverrides?: Record<number, string>;
}

export interface VariationSheetSpec extends SheetSpecBase {
  kind: 'variation';
  variants: Array<{ key: string; description?: string; promptOverride?: string }>;
}

export interface UIComponentSheetSpec extends SheetSpecBase {
  kind: 'ui_component';
  componentType: 'button' | 'checkbox' | 'radio' | 'slider' | 'panel' | 'progress_bar' | 'scroll_bar_h' | 'scroll_bar_v' | 'tab_bar' | 'list_item' | 'dropdown' | 'toggle_switch';
  states: Array<'normal' | 'hover' | 'pressed' | 'disabled' | 'focus' | 'selected' | 'unselected'>;
  ninePatchMargins: { left: number; right: number; top: number; bottom: number };
  baseResolution?: number;
  iconStrategy?: 'separate' | 'composite' | 'overlay' | 'none';
}

export type TextAlignment = 'left' | 'center' | 'right';
export type TextOverflow = 'truncate' | 'ellipsis' | 'error';

export interface GridCell {
  cellId: string;
  g: string;
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
}

export interface TextLine {
  line: number;
  startCellId: string;
  endCellId: string;
  baselineY: number;
}

export interface GridSpec {
  cellW: number;
  cellH: number;
  cols: number;
  rows: number;
  lineGap: number;
  align: TextAlignment;
  maxLines: number;
}

export interface WrapConfig {
  mode: 'word' | 'char';
  overflow: TextOverflow;
}

export interface LayoutDoc {
  version: '1.0';
  text: string;
  grid: GridSpec;
  wrap: WrapConfig;
  cells: GridCell[];
  lines: TextLine[];
  hashes: Record<string, string>;
}

export interface FontSpec {
  family: string;
  weight: string;
  style: string;
  size: number;
}

export interface SilhouetteSpec {
  mode: string;
  strokePx?: number;
  padPx: number;
  cornerRoundPx?: number;
  fillColor: string;
  strokeColor?: string;
}

export interface TextStyleSpec {
  prompt: string;
  seed?: number;
  model?: string;
  palette?: string[];
}

export interface TextOutputSpec {
  svg: boolean;
  rasterFormat?: string;
  rasterScale?: number;
}

export interface TextGridSpec {
  type: 'text_grid';
  id: string;
  text: string;
  grid: GridSpec;
  wrap: WrapConfig;
  font: FontSpec;
  silhouette: SilhouetteSpec;
  style: TextStyleSpec;
  output: TextOutputSpec;
}

export type AssetSpec =
  | EntitySpec
  | BackgroundSpec
  | TitleHeroSpec
  | TitleHeroNoBgSpec
  | ParallaxSpec
  | SpriteSheetSpec
  | TileSheetSpec
  | VariationSheetSpec
  | UIComponentSheetSpec
  | TextGridSpec;

// =============================================================================
// STYLE PRESETS - Convenience shortcuts for common rendering styles
// =============================================================================

/**
 * Style presets map short keys to descriptive prompt fragments.
 * Pass a key like "3d" and it expands to the full descriptor.
 * Pass any other string and it's used as-is (free-text style).
 */
export const STYLE_PRESETS: Record<string, string> = {
  '3d': '3D rendered, smooth shading, volumetric lighting, soft shadows',
  'pixel': 'pixel art, 8-bit aesthetic, crisp edges, limited color palette',
  'cartoon': 'cartoon illustration, bold outlines, vibrant flat colors, cel-shaded',
  'flat': 'flat vector illustration, minimal shading, clean geometric shapes',
  'sketch': 'hand-drawn pencil sketch, crosshatch shading, rough lines',
  'photorealistic': 'photorealistic, highly detailed, natural lighting, physically accurate materials',
  'watercolor': 'watercolor painting, soft bleeding edges, translucent washes, paper texture',
  'low-poly': 'low-poly 3D style, faceted surfaces, geometric, minimal detail',
  'voxel': 'voxel art, 3D cubic blocks, isometric perspective, colorful',
  'retro': 'retro 16-bit SNES style, detailed pixel art, rich color palette',
};

/**
 * Resolve a style string: if it matches a preset key, expand it.
 * Otherwise return the raw string as-is (free-text style).
 */
export function resolveStyle(style: string): string {
  return STYLE_PRESETS[style] ?? style;
}

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
  /** Rendering style — a preset key (e.g. "3d") or free-text prompt fragment */
  style?: string;
  /** Optional theme ID from the database */
  themeId?: string;
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
  /** Provider asset ID after upload/generation */
  providerAssetId?: string;
  /** Provider job/request ID when available */
  providerJobId?: string;
  /** Provider discriminator for providerAssetId/providerJobId */
  provider?: ImageProvider;
  /** @deprecated Use providerAssetId */
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
  sheetGuidePng?: Uint8Array;
  sheetMetadataJson?: string;
  /** Base state image for UI components (normal state) */
  baseStateImage?: Uint8Array;
  /** All state images for UI components keyed by state name */
  stateImages?: Record<string, Uint8Array>;
  /** UI component metadata JSON */
  uiComponentMetadata?: string;
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
    /** UUID of the asset pack for this run */
    packId: string;
    /** UUID for this specific generated asset (NOT spec.id) */
    assetId: string;
    /** Optional theme ID from the database */
    themeId?: string;
    gameTitle: string;
    theme: string;
    style?: string;
    /** @deprecated Use buildAssetPath(gameId, packId, assetId) */
    r2Prefix: string;
    startedAt: number;
    runId: string;
    /** Optional img2img strength override (0-1, default: 0.925) */
    strength?: number;
  };
}

// =============================================================================
// DEBUG EVENTS - Events emitted during pipeline execution
// =============================================================================

export type DebugEvent =
  | {
      type: 'run:start';
      runId: string;
      /** Friendly spec id (aka spec.id) */
      assetId: string;
      assetType: AssetType;
      gameId?: string;
      packId?: string;
      /** UUID for this generated asset (aka run.meta.assetId) */
      generatedAssetId?: string;
    }
  | { type: 'stage:start'; runId: string; assetId: string; stageId: string }
  | { type: 'stage:skipped'; runId: string; assetId: string; stageId: string }
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
  | {
      type: 'run:end';
      runId: string;
      /** Friendly spec id (aka spec.id) */
      assetId: string;
      durationMs: number;
      ok: boolean;
      error?: string;
      r2Keys?: string[];
      publicUrls?: string[];
      gameId?: string;
      packId?: string;
      /** UUID for this generated asset (aka run.meta.assetId) */
      generatedAssetId?: string;
    };

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

// Re-export the canonical ImageGenerationAdapter and defaults from provider-contract
import type { ImageGenerationAdapter as _ImageGenerationAdapter } from '@/ai/providers/contract'
export type ImageGenerationAdapter = _ImageGenerationAdapter
export { PROVIDER_DEFAULTS } from '@/ai/providers/contract'

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
    /** Optional color hint (hex like #FF0000) - defaults to neutral gray (#808080) */
    color?: string;
  }) => Promise<Uint8Array>;
}

export interface PipelineAdapters {
  /** Provider-agnostic image generation adapter */
  provider: ImageGenerationAdapter;
  /** @deprecated Use provider */
  scenario?: ImageGenerationAdapter;
  r2: R2Adapter;
  silhouette: SilhouetteAdapter;
}

/** @deprecated Use ImageGenerationAdapter */
export type ScenarioAdapter = ImageGenerationAdapter;

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

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isUIComponentSpec(spec: AssetSpec): spec is UIComponentSheetSpec {
  return spec.type === 'sheet' && 'kind' in spec && spec.kind === 'ui_component';
}

export function isTextGridSpec(spec: AssetSpec): spec is TextGridSpec {
  return spec.type === 'text_grid';
}
