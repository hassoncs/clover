import type { LayoutDoc, TextGridSpec } from '../types';
import { createLayoutDoc } from './segmentation';
import { renderSilhouetteSvgGrid } from './svg-renderer';
import { validateLayoutDoc, validateSvgOutput, validateTextGridSpec } from './validation';

// Public API for the text-grid module.

// Types
export type { FontAllowlistEntry } from './font-allowlist';
export type { RenderParams } from './svg-renderer';
export type { ValidationResult } from './validation';
export type { StylizerInput, StylizerOutput } from './stylizer-contract';
export type { AnimationCell } from './runtime';

// (Common pipeline types)
export type { TextGridSpec, LayoutDoc } from '../types';

// Functions
export {
  ALLOWLISTED_FONTS,
  isFontAllowlisted,
  getFontEntry,
  getAllowlistedFamilies,
  isWeightAvailable,
  getDefaultFont,
} from './font-allowlist';

export { segmentGraphemes, createLayoutDoc, computeLayoutDocHashes, makeCellId, TEXT_GRID_LIMITS } from './segmentation';

export { renderSilhouetteSvgGrid } from './svg-renderer';

export {
  validateTextGridSpec,
  validateLayoutDoc,
  validateSvgOutput,
  TEXT_EMPTY,
  TEXT_TOO_LONG,
  GRID_INVALID_DIMENSIONS,
  GRID_TOO_LARGE,
  FONT_NOT_ALLOWLISTED,
  FONT_TOO_LARGE,
  PROMPT_EMPTY,
  PROMPT_TOO_LONG,
  SVG_INVALID,
  SVG_MISSING_ATTRIBUTES,
} from './validation';

export { createStylizerInput, validateStylizerOutput } from './stylizer-contract';

export { createAnimationMetadata, generateClipPathSvg } from './runtime';

export class TextGridError extends Error {
  code: string;
  field?: string;

  constructor(code: string, message: string, field?: string) {
    super(message);
    this.name = 'TextGridError';
    this.code = code;
    this.field = field;
  }
}

export class ValidationError extends TextGridError {
  constructor(code: string, message: string, field?: string) {
    super(code, message, field);
    this.name = 'ValidationError';
  }
}

export class LimitExceededError extends TextGridError {
  constructor(code: string, message: string, field?: string) {
    super(code, message, field);
    this.name = 'LimitExceededError';
  }
}

export class FontNotFoundError extends TextGridError {
  constructor(code: string, message: string, field?: string) {
    super(code, message, field);
    this.name = 'FontNotFoundError';
  }
}

export interface GenerateTextGridParams {
  spec: TextGridSpec;
  // Optional adapters for fetching fonts
  fontFetcher?: (family: string, text: string) => Promise<ArrayBuffer>;
}

export interface GenerateTextGridResult {
  success: boolean;
  layoutDoc?: LayoutDoc;
  svg?: string;
  svgDimensions?: { width: number; height: number };
  validationErrors?: Array<import('./validation').ValidationError>;
  error?: string;
}

export async function generateTextGrid(params: GenerateTextGridParams): Promise<GenerateTextGridResult> {
  try {
    const { spec } = params;
    void params.fontFetcher;

    // 1) Validate the spec
    const specValidation = validateTextGridSpec(spec);
    if (!specValidation.valid) {
      return { success: false, validationErrors: specValidation.errors };
    }

    // 2) Create LayoutDoc (segmentation + wrapping)
    const layoutDoc = createLayoutDoc({ text: spec.text, grid: spec.grid, wrap: spec.wrap });
    const layoutValidation = validateLayoutDoc(layoutDoc);
    if (!layoutValidation.valid) {
      return { success: false, validationErrors: layoutValidation.errors };
    }

    // 3) Render SVG silhouette
    const rendered = renderSilhouetteSvgGrid({ layoutDoc, fontSpec: spec.font, silhouetteSpec: spec.silhouette });
    const svgValidation = validateSvgOutput(rendered.svg);
    if (!svgValidation.valid) {
      return { success: false, validationErrors: svgValidation.errors };
    }

    // 4) Return result
    return {
      success: true,
      layoutDoc,
      svg: rendered.svg,
      svgDimensions: { width: rendered.width, height: rendered.height },
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}
