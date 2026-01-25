import type { AssetSpec, EntitySpec, BackgroundSpec, TitleHeroSpec, ParallaxSpec, SpriteStyle, SpriteSheetSpec, TileSheetSpec, VariationSheetSpec, UIComponentSheetSpec, SheetPromptConfig } from './types';
import { STYLE_DESCRIPTORS } from './types';

type SheetSpec = SpriteSheetSpec | TileSheetSpec | VariationSheetSpec | UIComponentSheetSpec;

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
  const { promptConfig } = spec;
  
  const lines: string[] = [];

  lines.push('Transform each colored shape into a detailed sprite.');
  lines.push('Keep the EXACT positions and colors from the input image.');
  lines.push('Each shape becomes one sprite matching its color.');
  lines.push('');

  if (promptConfig?.basePrompt) {
    lines.push(promptConfig.basePrompt);
    lines.push('');
  }

  lines.push('Transparent background. No borders, no grid lines, no text.');
  
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
  kind: 'sprite' | 'tile' | 'variation' | 'ui_component';
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
  } else if (kind === 'ui_component') {
    lines.push('SINGLE UI COMPONENT (one cell from a UI component sheet).');
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

// UI Component state descriptions for prompt generation
const UI_STATE_DESCRIPTIONS: Record<string, string> = {
  normal: 'Default resting state, clean and neutral appearance',
  hover: 'Subtle highlight effect, slightly brighter or elevated',
  pressed: 'Depressed or pushed appearance, darker or inset shadows',
  disabled: 'Greyed out and visually inactive, low contrast',
  focus: 'Highlighted border or glow indicating keyboard focus',
};

export interface UIComponentPromptParams {
  componentType: string;
  state: 'normal' | 'hover' | 'pressed' | 'disabled' | 'focus';
  theme: string;
  baseResolution?: number;
}

export function buildUIComponentPrompt(params: UIComponentPromptParams): { prompt: string; negativePrompt: string } {
  const { componentType, state, theme } = params;

  const stateDescriptions: Record<string, string> = {
    normal: 'neutral, clean',
    hover: 'highlighted, slightly brighter',
    pressed: 'depressed, darker or inset',
    disabled: 'greyed out, low contrast',
    focus: 'focused with outline or glow',
  };

  const stateDesc = stateDescriptions[state] || 'default';

  const prompt = `A ${componentType} UI background for a game interface. Theme: ${theme}. State: ${stateDesc}. Front view, flat 2D element with transparent background. Decorative borders and clean center area suitable for nine-patch scaling. Professional game UI style, functional and thematic.`;

  const negativePrompt = 'text, labels, icons, checkmarks, letters, numbers, watermark, signature, grid lines, measurement marks, multiple elements, 3D perspective, angled view, blurry, low quality';

  return { prompt, negativePrompt };
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
