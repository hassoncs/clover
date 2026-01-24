import type { AssetSpec, EntitySpec, BackgroundSpec, TitleHeroSpec, ParallaxSpec, SpriteStyle } from './types';
import { STYLE_DESCRIPTORS } from './types';

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
  }

  return {
    prompt,
    negativePrompt: buildNegativePrompt(style),
  };
}
