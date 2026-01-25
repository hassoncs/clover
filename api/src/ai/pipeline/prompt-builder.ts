import type { AssetSpec, EntitySpec, BackgroundSpec, TitleHeroSpec, ParallaxSpec, SpriteStyle, SpriteSheetSpec, TileSheetSpec, VariationSheetSpec, SheetPromptConfig } from './types';
import { STYLE_DESCRIPTORS } from './types';

type SheetSpec = SpriteSheetSpec | TileSheetSpec | VariationSheetSpec;

function describeShapeSilhouette(shape: 'box' | 'circle', width: number, height: number): string {
  if (shape === 'circle') {
    return 'PERFECTLY CIRCULAR. The object is round like a ball or orb.';
  }
  const ratio = width / height;
  if (ratio > 4) return `EXTREMELY WIDE HORIZONTAL BAR (${ratio.toFixed(1)}:1).`;
  if (ratio > 2) return `WIDE HORIZONTAL RECTANGLE (${ratio.toFixed(1)}:1).`;
  if (ratio > 1.2) return `SLIGHTLY WIDE RECTANGLE (${ratio.toFixed(1)}:1).`;
  if (ratio > 0.8) return `SQUARE-ISH (${ratio.toFixed(2)}:1).`;
  if (ratio > 0.5) return `SLIGHTLY TALL RECTANGLE (1:${(1/ratio).toFixed(1)}).`;
  return `TALL VERTICAL RECTANGLE (1:${(1/ratio).toFixed(1)}).`;
}

export function buildEntityPrompt(spec: EntitySpec, theme: string, style: SpriteStyle): string {
  const styleDesc = STYLE_DESCRIPTORS[style];
  const shapeDesc = describeShapeSilhouette(spec.shape, spec.width, spec.height);

  const lines = [
    '=== CAMERA/VIEW (CRITICAL) ===',
    'FRONT VIEW. Camera is directly facing the front of the object.',
    'Flat, 2D perspective. NO 3D rotation, NO angled view.',
    '',
    '=== SHAPE (CRITICAL) ===',
    shapeDesc,
    '',
    '=== COMPOSITION ===',
    'The object FILLS THE ENTIRE FRAME. No empty space around it.',
    '',
    '=== SUBJECT ===',
    `A ${spec.description} for a video game.`,
    `Style: ${theme}`,
    '',
    '=== STYLE ===',
    styleDesc.aesthetic,
    '',
    '=== TECHNICAL ===',
    'Transparent background (alpha channel).',
    styleDesc.technical,
    'Single object only, no duplicates.',
    'No text, watermarks, or signatures.',
  ];

  return lines.join('\n');
}

export function buildBackgroundPrompt(spec: BackgroundSpec): string {
  return [
    spec.prompt,
    'No text, no characters, just the environment.',
    'High quality game background.',
  ].join(' ');
}

export function buildTitleHeroPrompt(spec: TitleHeroSpec): string {
  return [
    `A stylized game title logo that says "${spec.title}".`,
    'Bold, playful 3D text with depth and shadows.',
    `${spec.themeDescription} style letters.`,
    'The text is the main focus, centered in the frame.',
    'High quality game logo, professional design.',
    'Cartoon style, vibrant colors.',
  ].join(' ');
}

export function buildParallaxPrompt(spec: ParallaxSpec): string {
  return [
    spec.prompt,
    'Layered scene with clear depth separation.',
    'Distinct foreground, midground, and background elements.',
    'High quality game environment.',
  ].join(' ');
}

function buildSheetPrompt(spec: SheetSpec): string {
  const { layout, promptConfig, kind } = spec;
  
  const lines: string[] = [];

  // OUTPUT FORMAT section
  lines.push('=== OUTPUT FORMAT (CRITICAL) ===');
  if (layout.type === 'grid') {
    const totalCells = layout.columns * layout.rows;
    lines.push(`A ${layout.columns}x${layout.rows} GRID of ${totalCells} distinct ${kind === 'sprite' ? 'sprites' : kind === 'tile' ? 'tiles' : 'variants'}.`);
    lines.push(`Each cell is ${layout.cellWidth}x${layout.cellHeight} pixels.`);
  } else if (layout.type === 'strip') {
    lines.push(`A ${layout.direction.toUpperCase()} STRIP of ${layout.frameCount} ${kind === 'sprite' ? 'sprites' : kind === 'tile' ? 'tiles' : 'variants'}.`);
    lines.push(`Each cell is ${layout.cellWidth}x${layout.cellHeight} pixels.`);
  }
  
  if (kind === 'variation') {
    lines.push('Variants should be visually distinct but structurally similar.');
  } else if (kind === 'sprite') {
    lines.push('Each sprite should be a distinct frame or pose.');
  } else if (kind === 'tile') {
    lines.push('Each tile should be a distinct tileable element.');
  }
  lines.push('');

  // COMPOSITION section
  lines.push('=== COMPOSITION ===');
  lines.push('Each cell contains ONE complete object.');
  lines.push('Objects should NOT overlap cell boundaries.');
  lines.push('Consistent scale and positioning across all cells.');
  lines.push('');

  // SUBJECT section
  if (promptConfig?.basePrompt) {
    lines.push('=== SUBJECT ===');
    lines.push(promptConfig.basePrompt);
    
    // Add variant descriptions if available
    if (spec.kind === 'variation' && spec.variants) {
      const descriptions = spec.variants
        .filter(v => v.description)
        .map(v => v.description)
        .join(', ');
      if (descriptions) {
        lines.push(`Variants: ${descriptions}`);
      }
    }
    lines.push('');
  }

  // STYLE section
  if (promptConfig?.stylePreset) {
    lines.push('=== STYLE ===');
    const styleDesc = STYLE_DESCRIPTORS[promptConfig.stylePreset as SpriteStyle];
    if (styleDesc) {
      lines.push(styleDesc.aesthetic);
    } else {
      lines.push(promptConfig.stylePreset);
    }
    lines.push('');
  }

  // TECHNICAL section
  lines.push('=== TECHNICAL ===');
  lines.push('Transparent background (alpha channel).');
  lines.push('NO borders, NO grid lines, NO labels, NO text.');
  
  if (promptConfig?.commonModifiers && promptConfig.commonModifiers.length > 0) {
    for (const modifier of promptConfig.commonModifiers) {
      lines.push(modifier);
    }
  }

  return lines.join('\n');
}

export function buildSheetEntryPrompt(params: {
  entryId: string;
  entryPromptOverride?: string;
  kind: 'sprite' | 'tile' | 'variation';
  promptConfig?: SheetPromptConfig;
  theme?: string;
  style?: SpriteStyle;
}): string {
  const { entryPromptOverride, kind, promptConfig, style } = params;

  const basePrompt = entryPromptOverride ?? promptConfig?.basePrompt ?? '';

  const lines: string[] = [];

  if (kind === 'sprite') {
    lines.push('=== CAMERA/VIEW (CRITICAL) ===');
    lines.push('FRONT VIEW. Flat 2D. No perspective. Consistent camera and scale.');
    lines.push('');
  }

  lines.push('=== OUTPUT FORMAT (CRITICAL) ===');
  if (kind === 'sprite') {
    lines.push('SINGLE SPRITE (one cell from a sprite sheet).');
  } else if (kind === 'tile') {
    lines.push('SINGLE TILE (one cell from a tile sheet).');
  } else if (kind === 'variation') {
    lines.push('SINGLE VARIANT (one cell from a variation sheet).');
  }
  lines.push('NO borders, NO grid lines, NO labels, NO text.');
  lines.push('');

  lines.push('=== SUBJECT ===');
  lines.push(basePrompt);
  if (kind === 'variation') {
    lines.push('Same shape as other variants, different color/style.');
  }
  lines.push('');

  lines.push('=== TECHNICAL ===');
  lines.push('Transparent background (alpha channel).');
  if (promptConfig?.commonModifiers && promptConfig.commonModifiers.length > 0) {
    for (const modifier of promptConfig.commonModifiers) {
      lines.push(modifier);
    }
  }
  if (style) {
    const styleDesc = STYLE_DESCRIPTORS[style];
    lines.push(styleDesc.technical);
  }
  if (promptConfig?.negativePrompt) {
    lines.push(`NEGATIVE: ${promptConfig.negativePrompt}`);
  }

  return lines.join('\n');
}

export function buildNegativePrompt(style: SpriteStyle): string {
  const base = ['blurry', 'low quality', 'text', 'watermark', 'signature', 'cropped', 'multiple objects'];
  const styleSpecific: Record<SpriteStyle, string[]> = {
    pixel: ['anti-aliasing', 'smooth gradients', '3d render', 'realistic'],
    cartoon: ['realistic', 'photo', 'noisy', 'grainy'],
    '3d': ['2d flat', 'sketch', 'drawing'],
    flat: ['gradients', 'shadows', '3d', 'realistic'],
  };
  return [...base, ...styleSpecific[style]].join(', ');
}

export function buildPromptForSpec(spec: AssetSpec, theme: string, style: SpriteStyle): { prompt: string; negativePrompt: string } {
  let prompt: string;
  
  switch (spec.type) {
    case 'entity':
      prompt = buildEntityPrompt(spec, theme, style);
      break;
    case 'background':
      prompt = buildBackgroundPrompt(spec);
      break;
    case 'title_hero':
      prompt = buildTitleHeroPrompt(spec);
      break;
    case 'parallax':
      prompt = buildParallaxPrompt(spec);
      break;
    case 'sheet':
      prompt = buildSheetPrompt(spec);
      break;
    default:
      prompt = '';
  }

  return {
    prompt,
    negativePrompt: buildNegativePrompt(style),
  };
}
