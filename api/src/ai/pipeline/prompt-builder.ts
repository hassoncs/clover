import type { AssetSpec, EntitySpec, BackgroundSpec, TitleHeroSpec, TitleHeroNoBgSpec, ParallaxSpec, SpriteSheetSpec, TileSheetSpec, VariationSheetSpec, UIComponentSheetSpec, SheetPromptConfig } from '@/ai/pipeline/types'
import { resolveStyle } from '@/ai/pipeline/types'

type SheetSpec = SpriteSheetSpec | TileSheetSpec | VariationSheetSpec | UIComponentSheetSpec;

export interface PromptContext {
  theme?: string;
  style?: string;
}

export function buildEntityPrompt(spec: EntitySpec, ctx: PromptContext): string {
  const resolvedStyle = ctx.style ? resolveStyle(ctx.style) : '';

  const lines: string[] = [];

  lines.push(spec.description);

  if (ctx.theme) {
    lines.push(`Theme: ${ctx.theme}.`);
  }

  if (resolvedStyle) {
    lines.push(`Style: ${resolvedStyle}.`);
  }

  lines.push('Front view, flat 2D perspective.');
  lines.push('Single object, no duplicates, no text.');

  if (spec.skipSilhouette) {
    lines.push('Isolated object on transparent background. Do NOT include any other characters, bodies, or objects.');
  }

  return lines.join(' ');
}

export function buildBackgroundPrompt(spec: BackgroundSpec): string {
  return [
    spec.prompt,
    'No text, no characters, just the environment.',
    'High quality game background.',
  ].join(' ');
}

export function buildTitleHeroPrompt(spec: TitleHeroSpec | TitleHeroNoBgSpec): string {
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
}): string {
  const { entryPromptOverride, kind, promptConfig } = params;

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

  return lines.join('\n');
}

const UI_STATE_DESCRIPTIONS: Record<string, string> = {
  normal: 'Default resting state, clean and neutral appearance',
  hover: 'Subtle highlight effect, slightly brighter or elevated',
  pressed: 'Depressed or pushed appearance, darker or inset shadows',
  disabled: 'Greyed out and visually inactive, low contrast',
  focus: 'Highlighted border or glow indicating keyboard focus',
  selected: 'Active selected state, emphasized and prominent',
  unselected: 'Inactive unselected state, subdued and neutral',
};

export interface UIComponentPromptParams {
  componentType: string;
  state: 'normal' | 'hover' | 'pressed' | 'disabled' | 'focus' | 'selected' | 'unselected';
  theme: string;
  baseResolution?: number;
}

const CONTROL_SPECIFIC_FEATURES: Record<string, string> = {
  button: 'Rectangular button with raised 3D appearance',
  checkbox: 'Square checkbox container without checkmark symbol',
  panel: 'Decorative frame with HOLLOW CENTER (transparent inside). Ornate outer border, empty middle for content.',
  progress_bar: 'Horizontal progress bar track with rounded end caps. Smooth elongated shape.',
  scroll_bar_h: 'Slim horizontal scrollbar track. Compact horizontal bar design.',
  scroll_bar_v: 'Slim vertical scrollbar track. Compact vertical bar design.',
  tab_bar: 'Navigation tab with rounded top corners and flat bottom edge',
};

export function buildUIComponentPrompt(params: UIComponentPromptParams): { prompt: string } {
  const { componentType, state, theme } = params;

  const stateDescriptions: Record<string, string> = {
    normal: 'neutral, clean',
    hover: 'highlighted, slightly brighter',
    pressed: 'depressed, darker or inset',
    disabled: 'greyed out, low contrast',
    focus: 'focused with outline or glow',
    selected: 'active, emphasized',
    unselected: 'subdued, neutral',
  };

  const stateDesc = stateDescriptions[state] || 'default';
  const controlFeature = CONTROL_SPECIFIC_FEATURES[componentType] || `${componentType} UI control`;

  const prompt = `A ${componentType} UI background for a game interface. ${controlFeature}. Theme: ${theme}. State: ${stateDesc}. Front view, flat 2D element with transparent background. Decorative borders and clean center area suitable for nine-patch scaling. Professional game UI style, functional and thematic.`;

  return { prompt };
}

export function buildPromptForSpec(spec: AssetSpec, ctx: PromptContext): { prompt: string } {
  let prompt: string;

  switch (spec.type) {
    case 'entity':
      prompt = buildEntityPrompt(spec, ctx);
      break;
    case 'background':
      prompt = buildBackgroundPrompt(spec);
      break;
    case 'title_hero':
      prompt = buildTitleHeroPrompt(spec);
      break;
    case 'title_hero_no_bg':
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

  return { prompt };
}
