import type { LayoutDoc } from '../types';

/**
 * Runtime integration helpers for text-grid sprite-sheet animation.
 *
 * This module is intentionally runtime-agnostic: it produces lightweight metadata
 * (UV rects) that any renderer can consume (WebGL, Canvas2D, RN Skia, etc).
 */

export interface AnimationCell {
  cellId: string;
  // UV coordinates in the atlas (0-1 normalized)
  u: number;
  v: number;
  w: number;
  h: number;
  // Pixel coordinates (for reference)
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Create per-cell atlas metadata with normalized UVs.
 *
 * Notes:
 * - Uses each `GridCell`'s pixel-space x/y/w/h from the layout doc.
 * - UVs are top-left origin (matches typical 2D atlas conventions); if your
 *   renderer uses bottom-left origin, flip V accordingly.
 */
export function createAnimationMetadata(layoutDoc: LayoutDoc, atlasWidth: number, atlasHeight: number): AnimationCell[] {
  if (!Number.isFinite(atlasWidth) || atlasWidth <= 0) throw new Error(`Invalid atlasWidth: ${atlasWidth}`);
  if (!Number.isFinite(atlasHeight) || atlasHeight <= 0) throw new Error(`Invalid atlasHeight: ${atlasHeight}`);

  return layoutDoc.cells.map((cell) => {
    const u = cell.x / atlasWidth;
    const v = cell.y / atlasHeight;
    const w = cell.w / atlasWidth;
    const h = cell.h / atlasHeight;

    return {
      cellId: cell.cellId,
      u,
      v,
      w,
      h,
      x: cell.x,
      y: cell.y,
      width: cell.w,
      height: cell.h,
    };
  });
}

function xmlEscapeAttr(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * Generate a debug SVG that references the atlas once and defines clip paths per
 * cell.
 *
 * The returned SVG is meant for visualization/testing in a browser. Each clip
 * path is a rectangle matching that cell's pixel bounds.
 */
export function generateClipPathSvg(layoutDoc: LayoutDoc, atlasUrl: string): string {
  const widthFromGrid = layoutDoc.grid.cols * layoutDoc.grid.cellW;
  const heightFromGrid = layoutDoc.grid.rows * layoutDoc.grid.cellH + Math.max(0, layoutDoc.grid.rows - 1) * layoutDoc.grid.lineGap;

  const cellMaxX = layoutDoc.cells.reduce((m, c) => Math.max(m, c.x + c.w), 0);
  const cellMaxY = layoutDoc.cells.reduce((m, c) => Math.max(m, c.y + c.h), 0);

  const widthPx = Math.max(widthFromGrid, cellMaxX);
  const heightPx = Math.max(heightFromGrid, cellMaxY);

  const safeAtlasUrl = xmlEscapeAttr(atlasUrl);

  const clips = layoutDoc.cells
    .map((c) => {
      const id = `clip_${c.cellId}`;
      return `    <clipPath id="${xmlEscapeAttr(id)}"><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" /></clipPath>`;
    })
    .join('\n');

  const layers = layoutDoc.cells
    .map((c) => {
      const id = `clip_${c.cellId}`;
      const opacity = c.visible ? 1 : 0.15;
      return `  <g clip-path="url(#${xmlEscapeAttr(id)})" opacity="${opacity}"><use href="#atlas" /></g>`;
    })
    .join('\n');

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">`,
    `  <defs>`,
    `    <image id="atlas" href="${safeAtlasUrl}" x="0" y="0" width="${widthPx}" height="${heightPx}" preserveAspectRatio="none" />`,
    clips.length > 0 ? clips : '    <!-- no cells -->',
    `  </defs>`,
    `  <use href="#atlas" />`,
    layers.length > 0 ? layers : '  <!-- no layers -->',
    `</svg>`,
    '',
  ].join('\n');
}

/**
 * Animation pattern examples
 *
 * - Sequential: letters appear one by one
 *   - Delay per index: `delayMs = i * 35`
 *   - Use `cell.row/cell.col` ordering or stable `layoutDoc.cells` order.
 *
 * - Random: shuffle cell order and animate in random sequence
 *   - Precompute a stable shuffle using a seeded RNG.
 *
 * - Scatter-in: letters fly in from random directions
 *   - Start each glyph offset by a random vector; interpolate to target position.
 *   - Combine with alpha fade-in.
 *
 * - Wave: sine-wave timing across rows/columns
 *   - `delayMs = (Math.sin(col * 0.6) * 0.5 + 0.5) * 250`
 *   - Or by row for horizontal waves.
 *
 * - Elastic: scale bounce effect
 *   - Ease with overshoot (e.g., easeOutBack) and clamp final scale to 1.
 */

/**
 * Usage example (pseudo-code)
 *
 * ```ts
 * // Load atlas texture
 * const texture = loadTexture(atlasUrl);
 *
 * // For each visible cell
 * for (const cell of animationCells) {
 *   if (shouldShow(cell, currentTime)) {
 *     drawQuad(texture, cell.u, cell.v, cell.w, cell.h, x, y);
 *   }
 * }
 * ```
 */
