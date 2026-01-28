import type { LayoutDoc, SilhouetteSpec, TextStyleSpec } from '../types';

/**
 * External Stylizer Contract
 *
 * Contract between the Worker pipeline and an external stylizer service.
 *
 * ## Input
 * - `silhouetteAssetId`: A rasterized silhouette image uploaded by the client.
 *   - Format: PNG/WebP
 *   - Must include transparency (alpha).
 *   - Dimensions MUST match the original layout dimensions.
 * - `prompt`/`negativePrompt`: Style guidance for img2img.
 *
 * ## Output
 * - `stylizedAssetId`: A stylized raster atlas.
 *   - Must preserve the exact input dimensions.
 *   - Must have a transparent background (alpha).
 *
 * ## Background removal
 * Background removal is either:
 * - performed by the stylizer, OR
 * - performed immediately after stylization by the pipeline.
 *
 * ## Dimension preservation
 * Preserving dimensions is critical to keep cell alignment stable.
 */

export interface StylizerInput {
  /** The silhouette image (client rasterizes SVG and uploads) */
  silhouetteAssetId: string;
  /** Original layout dimensions for validation */
  width: number;
  height: number;
  /** Style specification */
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  /** Model configuration */
  model?: string;
  /** img2img strength (0-1) */
  strength?: number;
}

export interface StylizerOutput {
  /** The stylized atlas asset ID */
  stylizedAssetId: string;
  /** Dimensions (must match input) */
  width: number;
  height: number;
  /** Whether background was removed */
  hasTransparency: boolean;
  /** Optional metadata */
  generationTimeMs?: number;
  modelVersion?: string;
}

export interface StylizerValidationError {
  code: string;
  message: string;
  field?: string;
}

export interface StylizerValidationResult {
  valid: boolean;
  errors: StylizerValidationError[];
}

export function createStylizerInput(params: {
  layoutDoc: LayoutDoc;
  silhouetteSpec: SilhouetteSpec;
  styleSpec: TextStyleSpec;
  silhouetteAssetId: string;
  strength?: number;
}): StylizerInput {
  const { layoutDoc, styleSpec, silhouetteAssetId } = params;

  // Keep consistent with svg-renderer.ts grid dimensions.
  const width = layoutDoc.grid.cols * layoutDoc.grid.cellW;
  const height = layoutDoc.grid.rows * layoutDoc.grid.cellH + Math.max(0, layoutDoc.grid.rows - 1) * layoutDoc.grid.lineGap;

  return {
    silhouetteAssetId,
    width,
    height,
    prompt: styleSpec.prompt,
    negativePrompt: styleSpec.negativePrompt,
    seed: styleSpec.seed,
    model: styleSpec.model,
    strength: params.strength ?? 0.75,
  };
}

function ok(): StylizerValidationResult {
  return { valid: true, errors: [] };
}

function fail(errors: StylizerValidationError[]): StylizerValidationResult {
  return { valid: false, errors };
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function validateStylizerOutput(
  output: StylizerOutput,
  expectedDimensions: { width: number; height: number },
): StylizerValidationResult {
  const errors: StylizerValidationError[] = [];

  if (!isNonEmptyString(output.stylizedAssetId)) {
    errors.push({
      code: 'STYLIZER_OUTPUT_MISSING_ASSET_ID',
      message: 'Stylizer output must include a non-empty stylizedAssetId',
      field: 'stylizedAssetId',
    });
  }

  if (output.width !== expectedDimensions.width || output.height !== expectedDimensions.height) {
    errors.push({
      code: 'STYLIZER_OUTPUT_DIMENSIONS_MISMATCH',
      message: `Stylizer output dimensions must match expected (expected ${expectedDimensions.width}x${expectedDimensions.height}, got ${output.width}x${output.height})`,
      field: 'width/height',
    });
  }

  if (output.hasTransparency !== true) {
    errors.push({
      code: 'STYLIZER_OUTPUT_MISSING_TRANSPARENCY',
      message: 'Stylizer output must haveTransparency=true (transparent background required)',
      field: 'hasTransparency',
    });
  }

  return errors.length === 0 ? ok() : fail(errors);
}
