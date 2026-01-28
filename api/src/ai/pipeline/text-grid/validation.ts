import type { LayoutDoc, TextGridSpec } from '../types';
import { isFontAllowlisted } from './font-allowlist';

export const TEXT_EMPTY = 'TEXT_EMPTY' as const;
export const TEXT_TOO_LONG = 'TEXT_TOO_LONG' as const;

export const GRID_INVALID_DIMENSIONS = 'GRID_INVALID_DIMENSIONS' as const;
export const GRID_TOO_LARGE = 'GRID_TOO_LARGE' as const;

export const FONT_NOT_ALLOWLISTED = 'FONT_NOT_ALLOWLISTED' as const;
export const FONT_TOO_LARGE = 'FONT_TOO_LARGE' as const;

export const PROMPT_EMPTY = 'PROMPT_EMPTY' as const;
export const PROMPT_TOO_LONG = 'PROMPT_TOO_LONG' as const;

export const SVG_INVALID = 'SVG_INVALID' as const;
export const SVG_MISSING_ATTRIBUTES = 'SVG_MISSING_ATTRIBUTES' as const;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

function ok(): ValidationResult {
  return { valid: true, errors: [] };
}

function fail(errors: ValidationError[]): ValidationResult {
  return { valid: false, errors };
}

function pushError(errors: ValidationError[], err: ValidationError): void {
  errors.push(err);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isPositiveInteger(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v > 0;
}

function isNonNegativeInteger(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

function within(v: number, max: number): boolean {
  return v <= max;
}

function validateHashString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  // sha256 hex output in this codebase.
  return /^[a-f0-9]{64}$/.test(value);
}

export function validateTextGridSpec(spec: TextGridSpec): ValidationResult {
  const errors: ValidationError[] = [];

  // text
  if (!isNonEmptyString(spec.text)) {
    pushError(errors, { code: TEXT_EMPTY, message: 'Text must be a non-empty string', field: 'text' });
  } else if (spec.text.length > 1024) {
    pushError(errors, { code: TEXT_TOO_LONG, message: `Text must be <= 1024 chars (got ${spec.text.length})`, field: 'text' });
  }

  // grid
  const { grid } = spec;

  const dimsOk =
    isPositiveInteger(grid.cellW) &&
    isPositiveInteger(grid.cellH) &&
    isPositiveInteger(grid.cols) &&
    isPositiveInteger(grid.rows) &&
    isPositiveInteger(grid.maxLines);
  if (!dimsOk) {
    pushError(errors, {
      code: GRID_INVALID_DIMENSIONS,
      message: 'Grid dimensions must be positive integers (cellW/cellH/cols/rows/maxLines)',
      field: 'grid',
    });
  } else {
    if (!within(grid.cellW, 256) || !within(grid.cellH, 256)) {
      pushError(errors, {
        code: GRID_TOO_LARGE,
        message: `Grid cellW/cellH must be <= 256px (got cellW=${grid.cellW}, cellH=${grid.cellH})`,
        field: 'grid.cellW',
      });
    }
    if (!within(grid.cols, 32) || !within(grid.rows, 32)) {
      pushError(errors, {
        code: GRID_TOO_LARGE,
        message: `Grid cols/rows must be <= 32 (got cols=${grid.cols}, rows=${grid.rows})`,
        field: 'grid.cols',
      });
    }
    if (grid.maxLines > grid.rows) {
      pushError(errors, {
        code: GRID_INVALID_DIMENSIONS,
        message: `grid.maxLines (${grid.maxLines}) must be <= grid.rows (${grid.rows})`,
        field: 'grid.maxLines',
      });
    }
  }

  // font
  if (!isFontAllowlisted(spec.font.family)) {
    pushError(errors, {
      code: FONT_NOT_ALLOWLISTED,
      message: `Font family '${String(spec.font.family)}' is not allowlisted`,
      field: 'font.family',
    });
  }
  if (!isPositiveInteger(spec.font.size)) {
    pushError(errors, { code: FONT_TOO_LARGE, message: 'font.size must be a positive integer', field: 'font.size' });
  } else if (spec.font.size > 128) {
    pushError(errors, {
      code: FONT_TOO_LARGE,
      message: `font.size must be <= 128px (got ${spec.font.size})`,
      field: 'font.size',
    });
  }

  // silhouette
  if (!isNonNegativeInteger(spec.silhouette.padPx)) {
    pushError(errors, {
      code: GRID_INVALID_DIMENSIONS,
      message: 'silhouette.padPx must be a non-negative integer',
      field: 'silhouette.padPx',
    });
  } else if (spec.silhouette.padPx > 32) {
    pushError(errors, {
      code: GRID_TOO_LARGE,
      message: `silhouette.padPx must be <= 32px (got ${spec.silhouette.padPx})`,
      field: 'silhouette.padPx',
    });
  }

  // style.prompt
  if (!isNonEmptyString(spec.style.prompt)) {
    pushError(errors, { code: PROMPT_EMPTY, message: 'style.prompt must be a non-empty string', field: 'style.prompt' });
  } else if (spec.style.prompt.length > 2048) {
    pushError(errors, {
      code: PROMPT_TOO_LONG,
      message: `style.prompt must be <= 2048 chars (got ${spec.style.prompt.length})`,
      field: 'style.prompt',
    });
  }

  return errors.length === 0 ? ok() : fail(errors);
}

export function validateLayoutDoc(doc: LayoutDoc): ValidationResult {
  const errors: ValidationError[] = [];

  if (!Array.isArray(doc.cells) || doc.cells.length === 0) {
    pushError(errors, { code: GRID_INVALID_DIMENSIONS, message: 'Layout doc cells must be a non-empty array', field: 'cells' });
    return fail(errors);
  }

  const gridW = doc.grid.cols * doc.grid.cellW;
  const gridH = doc.grid.rows * doc.grid.cellH + Math.max(0, doc.grid.rows - 1) * doc.grid.lineGap;

  for (const cell of doc.cells) {
    if (typeof cell.x !== 'number' || typeof cell.y !== 'number' || cell.x < 0 || cell.y < 0) {
      pushError(errors, {
        code: GRID_INVALID_DIMENSIONS,
        message: `Cell '${String(cell.cellId)}' has invalid position (x/y must be >= 0)`,
        field: 'cells.x',
      });
      continue;
    }

    const right = cell.x + cell.w;
    const bottom = cell.y + cell.h;
    if (right > gridW || bottom > gridH) {
      pushError(errors, {
        code: GRID_TOO_LARGE,
        message: `Cell '${String(cell.cellId)}' does not fit within grid bounds`,
        field: 'cells',
      });
    }
  }

  const hashes = doc.hashes;
  if (!hashes || typeof hashes !== 'object') {
    pushError(errors, { code: GRID_INVALID_DIMENSIONS, message: 'Layout doc hashes must be present', field: 'hashes' });
  } else {
    for (const k of ['text', 'inputs', 'layout'] as const) {
      const v = (hashes as Record<string, unknown>)[k];
      if (!validateHashString(v)) {
        pushError(errors, { code: GRID_INVALID_DIMENSIONS, message: `Layout doc hash '${k}' missing/invalid`, field: `hashes.${k}` });
      }
    }
  }

  return errors.length === 0 ? ok() : fail(errors);
}

function extractAttr(tag: string, attr: string): string | undefined {
  const re = new RegExp(`${attr}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i');
  const m = re.exec(tag);
  return (m?.[2] ?? m?.[3]) || undefined;
}

function findAllIds(svg: string): string[] {
  const ids: string[] = [];
  const re = /\bid\s*=\s*("([^"]+)"|'([^']+)')/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    ids.push((m[2] ?? m[3] ?? '').trim());
  }
  return ids.filter((s) => s.length > 0);
}

export function validateSvgOutput(svg: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isNonEmptyString(svg)) {
    pushError(errors, { code: SVG_INVALID, message: 'SVG must be a non-empty string', field: 'svg' });
    return fail(errors);
  }

  const trimmed = svg.trim();
  if (!trimmed.startsWith('<') || !trimmed.endsWith('>')) {
    pushError(errors, { code: SVG_INVALID, message: 'SVG does not appear to be XML', field: 'svg' });
    return fail(errors);
  }

  // Basic well-formedness/safety checks (no full XML parser dependency)
  if (/<!doctype\b/i.test(trimmed)) {
    pushError(errors, { code: SVG_INVALID, message: 'SVG must not include a DOCTYPE', field: 'svg' });
  }

  const rootMatch = /<svg\b[^>]*>/i.exec(trimmed);
  if (!rootMatch) {
    pushError(errors, { code: SVG_INVALID, message: 'SVG is missing root <svg> element', field: 'svg' });
    return fail(errors);
  }

  const openCount = (trimmed.match(/<svg\b/gi) ?? []).length;
  const closeCount = (trimmed.match(/<\/svg\s*>/gi) ?? []).length;
  if (openCount !== 1 || closeCount !== 1 || !/<\/svg\s*>\s*$/.test(trimmed)) {
    pushError(errors, { code: SVG_INVALID, message: 'SVG must contain exactly one <svg> root and end with </svg>', field: 'svg' });
  }

  const openTag = rootMatch[0];
  const width = extractAttr(openTag, 'width');
  const height = extractAttr(openTag, 'height');
  const xmlns = extractAttr(openTag, 'xmlns');

  if (!width || !height || !xmlns) {
    pushError(errors, {
      code: SVG_MISSING_ATTRIBUTES,
      message: 'SVG root must include width, height, and xmlns attributes',
      field: 'svg',
    });
  } else {
    const dimRe = /^\d+(?:\.\d+)?(?:px)?$/i;
    if (!dimRe.test(width) || !dimRe.test(height)) {
      pushError(errors, { code: SVG_INVALID, message: `SVG width/height must be numeric (got width='${width}', height='${height}')`, field: 'svg' });
    }
    if (xmlns !== 'http://www.w3.org/2000/svg') {
      pushError(errors, { code: SVG_INVALID, message: `SVG xmlns must be 'http://www.w3.org/2000/svg' (got '${xmlns}')`, field: 'svg' });
    }
  }

  // Uniqueness of all ids (covers cell group ids like `cell-...`)
  const ids = findAllIds(trimmed);
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      pushError(errors, { code: SVG_INVALID, message: `Duplicate SVG id '${id}'`, field: 'svg' });
      break;
    }
    seen.add(id);
  }

  // Forbidden elements/attributes
  const forbiddenElements = ['script', 'foreignObject', 'iframe', 'object', 'embed'];
  for (const el of forbiddenElements) {
    const re = new RegExp(`<${el}\\b`, 'i');
    if (re.test(trimmed)) {
      pushError(errors, { code: SVG_INVALID, message: `SVG contains forbidden <${el}> element`, field: 'svg' });
      break;
    }
  }

  const forbiddenAttrs = ['onload', 'onclick', 'onmouseover', 'onmouseenter', 'onmouseleave', 'onerror'];
  for (const attr of forbiddenAttrs) {
    const re = new RegExp(`\\b${attr}\\s*=`, 'i');
    if (re.test(trimmed)) {
      pushError(errors, { code: SVG_INVALID, message: `SVG contains forbidden attribute '${attr}'`, field: 'svg' });
      break;
    }
  }

  if (/\b(?:xlink:href|href)\s*=\s*("|')\s*javascript:/i.test(trimmed)) {
    pushError(errors, { code: SVG_INVALID, message: 'SVG must not contain javascript: URLs', field: 'svg' });
  }
  if (/\bxlink:href\s*=/.test(trimmed)) {
    pushError(errors, { code: SVG_INVALID, message: 'SVG must not contain xlink:href attributes', field: 'svg' });
  }

  return errors.length === 0 ? ok() : fail(errors);
}
