import { Hono } from 'hono';
import type { Env } from '../trpc/context';
import { generateTextGrid, validateTextGridSpec } from '../ai/pipeline/text-grid';
import type { TextGridSpec } from '../ai/pipeline/text-grid';
import type { ValidationError as TextGridValidationError } from '../ai/pipeline/text-grid/validation';

const router = new Hono<{ Bindings: Env }>();

type ErrorResponse =
  | { success: false; error: { type: 'validation'; errors: TextGridValidationError[] } }
  | { success: false; error: { type: 'server'; message: string } };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function validationError(field: string, message: string, code = 'MISSING_FIELD'): TextGridValidationError {
  return { code, message, field };
}

function parseTextGridSpec(body: unknown): { ok: true; spec: TextGridSpec } | { ok: false; errors: TextGridValidationError[] } {
  const candidate = isRecord(body) && isRecord(body.spec) ? body.spec : body;
  if (!isRecord(candidate)) {
    return { ok: false, errors: [validationError('', 'Request body must be an object')] };
  }

  // If input already matches the shape, run pipeline validation and accept.
  if (candidate.type === 'text_grid') {
    const preSpec = candidate as unknown as TextGridSpec;
    const preValidation = validateTextGridSpec(preSpec);
    if (preValidation.valid) return { ok: true, spec: preSpec };
  }

  const errors: TextGridValidationError[] = [];

  const isOneOf = <T extends string>(v: unknown, allowed: readonly T[]): v is T => typeof v === 'string' && (allowed as readonly string[]).includes(v);

  let grid: Record<string, unknown> | undefined;
  let wrap: Record<string, unknown> | undefined;
  let font: Record<string, unknown> | undefined;
  let silhouette: Record<string, unknown> | undefined;
  let style: Record<string, unknown> | undefined;
  let output: Record<string, unknown> | undefined;

  // top-level
  if (candidate.type !== 'text_grid') errors.push(validationError('type', "type must be 'text_grid'"));
  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) errors.push(validationError('id', 'id must be a non-empty string'));
  if (typeof candidate.text !== 'string') errors.push(validationError('text', 'text must be a string'));

  // grid
  const gridRaw = candidate.grid;
  if (!isRecord(gridRaw)) {
    errors.push(validationError('grid', 'grid is required'));
  } else {
    grid = gridRaw;
    for (const k of ['cellW', 'cellH', 'cols', 'rows', 'maxLines', 'lineGap'] as const) {
      if (typeof gridRaw[k] !== 'number') errors.push(validationError(`grid.${k}`, `grid.${k} must be a number`));
    }
    if (!isOneOf(gridRaw.align, ['left', 'center', 'right'] as const)) {
      errors.push(validationError('grid.align', "grid.align must be one of 'left' | 'center' | 'right'"));
    }
  }

  // wrap
  const wrapRaw = candidate.wrap;
  if (!isRecord(wrapRaw)) {
    errors.push(validationError('wrap', 'wrap is required'));
  } else {
    wrap = wrapRaw;
    if (!isOneOf(wrapRaw.mode, ['word', 'char'] as const)) {
      errors.push(validationError('wrap.mode', "wrap.mode must be one of 'word' | 'char'"));
    }
    if (!isOneOf(wrapRaw.overflow, ['truncate', 'ellipsis', 'error'] as const)) {
      errors.push(validationError('wrap.overflow', "wrap.overflow must be one of 'truncate' | 'ellipsis' | 'error'"));
    }
  }

  // font
  const fontRaw = candidate.font;
  if (!isRecord(fontRaw)) {
    errors.push(validationError('font', 'font is required'));
  } else {
    font = fontRaw;
    for (const k of ['family', 'weight', 'style'] as const) {
      if (typeof fontRaw[k] !== 'string') errors.push(validationError(`font.${k}`, `font.${k} must be a string`));
    }
    if (typeof fontRaw.size !== 'number') errors.push(validationError('font.size', 'font.size must be a number'));
  }

  // silhouette
  const silhouetteRaw = candidate.silhouette;
  if (!isRecord(silhouetteRaw)) {
    errors.push(validationError('silhouette', 'silhouette is required'));
  } else {
    silhouette = silhouetteRaw;
    if (typeof silhouetteRaw.mode !== 'string') errors.push(validationError('silhouette.mode', 'silhouette.mode must be a string'));
    if (typeof silhouetteRaw.padPx !== 'number') errors.push(validationError('silhouette.padPx', 'silhouette.padPx must be a number'));
    if (typeof silhouetteRaw.fillColor !== 'string') errors.push(validationError('silhouette.fillColor', 'silhouette.fillColor must be a string'));
  }

  // style
  const styleRaw = candidate.style;
  if (!isRecord(styleRaw)) {
    errors.push(validationError('style', 'style is required'));
  } else {
    style = styleRaw;
    if (typeof styleRaw.prompt !== 'string') errors.push(validationError('style.prompt', 'style.prompt must be a string'));
  }

  // output
  const outputRaw = candidate.output;
  if (!isRecord(outputRaw)) {
    errors.push(validationError('output', 'output is required'));
  } else {
    output = outputRaw;
    if (typeof outputRaw.svg !== 'boolean') errors.push(validationError('output.svg', 'output.svg must be a boolean'));
  }

  if (errors.length > 0 || !grid || !wrap || !font || !silhouette || !style || !output) return { ok: false, errors };

  const spec: TextGridSpec = {
    type: 'text_grid',
    id: candidate.id as string,
    text: candidate.text as string,
    grid: {
      cellW: grid.cellW as number,
      cellH: grid.cellH as number,
      cols: grid.cols as number,
      rows: grid.rows as number,
      maxLines: grid.maxLines as number,
      lineGap: grid.lineGap as number,
      align: grid.align as 'left' | 'center' | 'right',
    },
    wrap: {
      mode: wrap.mode as 'word' | 'char',
      overflow: wrap.overflow as 'truncate' | 'ellipsis' | 'error',
    },
    font: {
      family: font.family as string,
      weight: font.weight as string,
      style: font.style as string,
      size: font.size as number,
    },
    silhouette: {
      mode: silhouette.mode as string,
      padPx: silhouette.padPx as number,
      fillColor: silhouette.fillColor as string,
      ...(typeof silhouette.strokePx === 'number' ? { strokePx: silhouette.strokePx } : {}),
      ...(typeof silhouette.cornerRoundPx === 'number' ? { cornerRoundPx: silhouette.cornerRoundPx } : {}),
      ...(typeof silhouette.strokeColor === 'string' ? { strokeColor: silhouette.strokeColor } : {}),
    },
    style: {
      prompt: style.prompt as string,
      ...(typeof style.seed === 'number' ? { seed: style.seed } : {}),
      ...(typeof style.model === 'string' ? { model: style.model } : {}),
      ...(typeof style.negativePrompt === 'string' ? { negativePrompt: style.negativePrompt } : {}),
      ...(Array.isArray(style.palette) && style.palette.every((p: unknown) => typeof p === 'string') ? { palette: style.palette as string[] } : {}),
    },
    output: {
      svg: output.svg as boolean,
      ...(typeof output.rasterFormat === 'string' ? { rasterFormat: output.rasterFormat } : {}),
      ...(typeof output.rasterScale === 'number' ? { rasterScale: output.rasterScale } : {}),
    },
  };

  const specValidation = validateTextGridSpec(spec);
  if (!specValidation.valid) return { ok: false, errors: specValidation.errors };

  return { ok: true, spec };
}

router.post('/generate', async (c) => {
  try {
    let body: unknown;
    try {
      body = JSON.parse(await c.req.text());
    } catch {
      const res: ErrorResponse = { success: false, error: { type: 'validation', errors: [validationError('', 'Invalid JSON', 'INVALID_JSON')] } };
      return c.json(res, 400);
    }

    const parsed = parseTextGridSpec(body);
    if (!parsed.ok) {
      const res: ErrorResponse = { success: false, error: { type: 'validation', errors: parsed.errors } };
      return c.json(res, 400);
    }

    const result = await generateTextGrid({ spec: parsed.spec });

    if (!result.success) {
      if (result.validationErrors?.length) {
        const res: ErrorResponse = { success: false, error: { type: 'validation', errors: result.validationErrors } };
        return c.json(res, 400);
      }

      const res: ErrorResponse = {
        success: false,
        error: { type: 'server', message: result.error ?? 'Text-grid generation failed' },
      };
      return c.json(res, 500);
    }

    return c.json({
      success: true,
      layoutDoc: result.layoutDoc,
      svg: result.svg,
      dimensions: result.svgDimensions,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const res: ErrorResponse = { success: false, error: { type: 'server', message } };
    return c.json(res, 500);
  }
});

export default router;
