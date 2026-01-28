import type { FontSpec, LayoutDoc, SilhouetteSpec, TextAlignment } from '../types';

export interface RenderParams {
  layoutDoc: LayoutDoc;
  fontSpec: FontSpec;
  silhouetteSpec: SilhouetteSpec;
}

function escapeXmlText(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeXmlAttr(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function anchorForAlign(align: TextAlignment): { anchor: 'start' | 'middle' | 'end'; xMode: 'min' | 'mid' | 'max' } {
  if (align === 'left') return { anchor: 'start', xMode: 'min' };
  if (align === 'right') return { anchor: 'end', xMode: 'max' };
  return { anchor: 'middle', xMode: 'mid' };
}

function svgTextPaint(spec: SilhouetteSpec): { fill: string; stroke: string; strokeWidth: number; paintOrder: string } {
  const mode = spec.mode;
  const strokeWidth = Math.max(0, spec.strokePx ?? 1);
  const fill = spec.fillColor;
  const stroke = spec.strokeColor ?? spec.fillColor;

  if (mode === 'fill') return { fill, stroke: 'none', strokeWidth: 0, paintOrder: 'normal' };
  if (mode === 'stroke') return { fill: 'none', stroke, strokeWidth, paintOrder: 'normal' };
  if (mode === 'outline') return { fill, stroke, strokeWidth, paintOrder: 'stroke fill' };

  throw new Error(`Unsupported silhouette mode: ${mode}`);
}

export function renderSilhouetteSvgGrid(params: RenderParams): { svg: string; width: number; height: number } {
  const { layoutDoc, fontSpec, silhouetteSpec } = params;
  const { grid } = layoutDoc;

  const width = grid.cols * grid.cellW;
  const height = grid.rows * grid.cellH + Math.max(0, grid.rows - 1) * grid.lineGap;

  const padPx = Math.max(0, silhouetteSpec.padPx);
  const cornerRoundPx = Math.max(0, silhouetteSpec.cornerRoundPx ?? 0);

  const { anchor, xMode } = anchorForAlign(grid.align);
  const { fill, stroke, strokeWidth, paintOrder } = svgTextPaint(silhouetteSpec);

  const fontFamily = escapeXmlAttr(fontSpec.family);
  const fontWeight = escapeXmlAttr(fontSpec.weight);
  const fontStyle = escapeXmlAttr(fontSpec.style);
  const fontSize = fontSpec.size;

  const baseTextStyle = [
    `font-family:${fontFamily}`,
    `font-weight:${fontWeight}`,
    `font-style:${fontStyle}`,
    `font-size:${fontSize}px`,
    'letter-spacing:normal',
    'font-kerning:normal',
    'font-variant-ligatures:none',
  ].join(';');

  const elements: string[] = [];
  for (const cell of layoutDoc.cells) {
    if (!cell.visible) continue;

    const innerX = cell.x + padPx;
    const innerY = cell.y + padPx;
    const innerW = Math.max(0, cell.w - padPx * 2);
    const innerH = Math.max(0, cell.h - padPx * 2);
    const rx = clamp(cornerRoundPx, 0, Math.min(innerW, innerH) / 2);

    const x = xMode === 'min' ? innerX : xMode === 'max' ? innerX + innerW : innerX + innerW / 2;
    const y = innerY + innerH / 2;

    const groupId = escapeXmlAttr(`cell-${cell.cellId}`);
    const gText = escapeXmlText(cell.g);

    const rect =
      padPx > 0 || cornerRoundPx > 0
        ? `<rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" rx="${rx}" ry="${rx}" fill="none" stroke="none" />`
        : '';

    const text = `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" style="${baseTextStyle};fill:${escapeXmlAttr(fill)};stroke:${escapeXmlAttr(stroke)};stroke-width:${strokeWidth};paint-order:${paintOrder}">${gText}</text>`;

    elements.push(`<g id="${groupId}">${rect}${text}</g>`);
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<defs></defs>',
    elements.join(''),
    '</svg>',
  ].join('');

  return { svg, width, height };
}
