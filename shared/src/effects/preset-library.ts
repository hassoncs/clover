import type {
  EffectPipelineSpec,
  EffectPassSpec,
  QualityTier,
} from '../types/effect-pipeline';

export interface EffectPreset {
  id: string;
  name: string;
  description: string;
  pipeline: EffectPipelineSpec;
  tiers: Record<QualityTier, EffectPipelineSpec>;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Pass factory helpers
// ---------------------------------------------------------------------------

function pass(overrides: Partial<EffectPassSpec> & { id: string }): EffectPassSpec {
  return {
    shaderSource: { type: 'builtin', effectType: 'bloom' },
    samplers: ['inputTex'],
    uniforms: [],
    params: {},
    persistence: 'none',
    required: true,
    qualityTier: 'medium',
    ...overrides,
  };
}

function pipeline(
  id: string,
  screenPasses: EffectPassSpec[],
  spritePasses: EffectPassSpec[] = [],
): EffectPipelineSpec {
  return {
    id,
    spritePasses,
    screenPasses,
    lifecycle: { stopMode: 'clear', autoStart: true },
  };
}

// ---------------------------------------------------------------------------
// bloom-glow — classic game glow effect
// ---------------------------------------------------------------------------

const bloomGlow: EffectPreset = {
  id: 'bloom-glow',
  name: 'Bloom Glow',
  description: 'Classic bright-area bloom with soft glow overlay',
  tags: ['post-process', 'cinematic'],
  pipeline: pipeline('bloom-glow-high', [
    pass({
      id: 'bloom-glow-bloom',
      shaderSource: { type: 'builtin', effectType: 'bloom' },
      qualityTier: 'high',
    }),
    pass({
      id: 'bloom-glow-glow',
      shaderSource: { type: 'builtin', effectType: 'glow' },
      qualityTier: 'high',
    }),
  ]),
  tiers: {
    high: pipeline('bloom-glow-high', [
      pass({
        id: 'bloom-glow-bloom',
        shaderSource: { type: 'builtin', effectType: 'bloom' },
        qualityTier: 'high',
      }),
      pass({
        id: 'bloom-glow-glow',
        shaderSource: { type: 'builtin', effectType: 'glow' },
        qualityTier: 'high',
      }),
    ]),
    medium: pipeline('bloom-glow-medium', [
      pass({
        id: 'bloom-glow-bloom',
        shaderSource: { type: 'builtin', effectType: 'bloom' },
        qualityTier: 'medium',
      }),
      pass({
        id: 'bloom-glow-glow',
        shaderSource: { type: 'builtin', effectType: 'glow' },
        qualityTier: 'medium',
        required: false,
      }),
    ]),
    low: pipeline('bloom-glow-low', [
      pass({
        id: 'bloom-glow-bloom',
        shaderSource: { type: 'builtin', effectType: 'bloom' },
        qualityTier: 'low',
      }),
    ]),
  },
};

// ---------------------------------------------------------------------------
// retro-crt — scanlines + chromatic aberration + vignette
// ---------------------------------------------------------------------------

const retroCrt: EffectPreset = {
  id: 'retro-crt',
  name: 'Retro CRT',
  description: 'Old-school CRT monitor with scanlines, color fringing, and vignette',
  tags: ['retro', 'post-process'],
  pipeline: pipeline('retro-crt-high', [
    pass({
      id: 'retro-crt-scanlines',
      shaderSource: { type: 'builtin', effectType: 'scanlines' },
      qualityTier: 'high',
    }),
    pass({
      id: 'retro-crt-chromatic',
      shaderSource: { type: 'builtin', effectType: 'chromaticAberration' },
      qualityTier: 'high',
    }),
    pass({
      id: 'retro-crt-vignette',
      shaderSource: { type: 'builtin', effectType: 'vignette' },
      qualityTier: 'high',
    }),
  ]),
  tiers: {
    high: pipeline('retro-crt-high', [
      pass({
        id: 'retro-crt-scanlines',
        shaderSource: { type: 'builtin', effectType: 'scanlines' },
        qualityTier: 'high',
      }),
      pass({
        id: 'retro-crt-chromatic',
        shaderSource: { type: 'builtin', effectType: 'chromaticAberration' },
        qualityTier: 'high',
      }),
      pass({
        id: 'retro-crt-vignette',
        shaderSource: { type: 'builtin', effectType: 'vignette' },
        qualityTier: 'high',
      }),
    ]),
    medium: pipeline('retro-crt-medium', [
      pass({
        id: 'retro-crt-scanlines',
        shaderSource: { type: 'builtin', effectType: 'scanlines' },
        qualityTier: 'medium',
      }),
      pass({
        id: 'retro-crt-vignette',
        shaderSource: { type: 'builtin', effectType: 'vignette' },
        qualityTier: 'medium',
        required: false,
      }),
    ]),
    low: pipeline('retro-crt-low', [
      pass({
        id: 'retro-crt-scanlines',
        shaderSource: { type: 'builtin', effectType: 'scanlines' },
        qualityTier: 'low',
      }),
    ]),
  },
};

// ---------------------------------------------------------------------------
// underwater-dream — underwater + blur + vignette
// ---------------------------------------------------------------------------

const underwaterDream: EffectPreset = {
  id: 'underwater-dream',
  name: 'Underwater Dream',
  description: 'Dreamy underwater scene with wave distortion, soft blur, and vignette',
  tags: ['artistic', 'post-process'],
  pipeline: pipeline('underwater-dream-high', [
    pass({
      id: 'underwater-dream-underwater',
      shaderSource: { type: 'builtin', effectType: 'underwater' },
      qualityTier: 'high',
    }),
    pass({
      id: 'underwater-dream-blur',
      shaderSource: { type: 'builtin', effectType: 'blur' },
      qualityTier: 'high',
    }),
    pass({
      id: 'underwater-dream-vignette',
      shaderSource: { type: 'builtin', effectType: 'vignette' },
      qualityTier: 'high',
    }),
  ]),
  tiers: {
    high: pipeline('underwater-dream-high', [
      pass({
        id: 'underwater-dream-underwater',
        shaderSource: { type: 'builtin', effectType: 'underwater' },
        qualityTier: 'high',
      }),
      pass({
        id: 'underwater-dream-blur',
        shaderSource: { type: 'builtin', effectType: 'blur' },
        qualityTier: 'high',
      }),
      pass({
        id: 'underwater-dream-vignette',
        shaderSource: { type: 'builtin', effectType: 'vignette' },
        qualityTier: 'high',
      }),
    ]),
    medium: pipeline('underwater-dream-medium', [
      pass({
        id: 'underwater-dream-underwater',
        shaderSource: { type: 'builtin', effectType: 'underwater' },
        qualityTier: 'medium',
      }),
      pass({
        id: 'underwater-dream-vignette',
        shaderSource: { type: 'builtin', effectType: 'vignette' },
        qualityTier: 'medium',
        required: false,
      }),
    ]),
    low: pipeline('underwater-dream-low', [
      pass({
        id: 'underwater-dream-underwater',
        shaderSource: { type: 'builtin', effectType: 'underwater' },
        qualityTier: 'low',
      }),
    ]),
  },
};

// ---------------------------------------------------------------------------
// cinematic — vignette + colorMatrix + bloom
// ---------------------------------------------------------------------------

const cinematic: EffectPreset = {
  id: 'cinematic',
  name: 'Cinematic',
  description: 'Movie-like color grading with vignette, color matrix, and bloom',
  tags: ['cinematic', 'post-process'],
  pipeline: pipeline('cinematic-high', [
    pass({
      id: 'cinematic-vignette',
      shaderSource: { type: 'builtin', effectType: 'vignette' },
      qualityTier: 'high',
    }),
    pass({
      id: 'cinematic-color-matrix',
      shaderSource: { type: 'builtin', effectType: 'colorMatrix' },
      qualityTier: 'high',
    }),
    pass({
      id: 'cinematic-bloom',
      shaderSource: { type: 'builtin', effectType: 'bloom' },
      qualityTier: 'high',
    }),
  ]),
  tiers: {
    high: pipeline('cinematic-high', [
      pass({
        id: 'cinematic-vignette',
        shaderSource: { type: 'builtin', effectType: 'vignette' },
        qualityTier: 'high',
      }),
      pass({
        id: 'cinematic-color-matrix',
        shaderSource: { type: 'builtin', effectType: 'colorMatrix' },
        qualityTier: 'high',
      }),
      pass({
        id: 'cinematic-bloom',
        shaderSource: { type: 'builtin', effectType: 'bloom' },
        qualityTier: 'high',
      }),
    ]),
    medium: pipeline('cinematic-medium', [
      pass({
        id: 'cinematic-vignette',
        shaderSource: { type: 'builtin', effectType: 'vignette' },
        qualityTier: 'medium',
      }),
      pass({
        id: 'cinematic-color-matrix',
        shaderSource: { type: 'builtin', effectType: 'colorMatrix' },
        qualityTier: 'medium',
      }),
    ]),
    low: pipeline('cinematic-low', [
      pass({
        id: 'cinematic-color-matrix',
        shaderSource: { type: 'builtin', effectType: 'colorMatrix' },
        qualityTier: 'low',
      }),
    ]),
  },
};

// ---------------------------------------------------------------------------
// pixel-art — pixelate + posterize
// ---------------------------------------------------------------------------

const pixelArt: EffectPreset = {
  id: 'pixel-art',
  name: 'Pixel Art',
  description: 'Chunky pixel art look with reduced color palette',
  tags: ['retro', 'artistic'],
  pipeline: pipeline('pixel-art-high', [
    pass({
      id: 'pixel-art-pixelate',
      shaderSource: { type: 'builtin', effectType: 'pixelate' },
      qualityTier: 'high',
    }),
    pass({
      id: 'pixel-art-posterize',
      shaderSource: { type: 'builtin', effectType: 'posterize' },
      qualityTier: 'high',
    }),
  ]),
  tiers: {
    high: pipeline('pixel-art-high', [
      pass({
        id: 'pixel-art-pixelate',
        shaderSource: { type: 'builtin', effectType: 'pixelate' },
        qualityTier: 'high',
      }),
      pass({
        id: 'pixel-art-posterize',
        shaderSource: { type: 'builtin', effectType: 'posterize' },
        qualityTier: 'high',
      }),
    ]),
    medium: pipeline('pixel-art-medium', [
      pass({
        id: 'pixel-art-pixelate',
        shaderSource: { type: 'builtin', effectType: 'pixelate' },
        qualityTier: 'medium',
      }),
      pass({
        id: 'pixel-art-posterize',
        shaderSource: { type: 'builtin', effectType: 'posterize' },
        qualityTier: 'medium',
        required: false,
      }),
    ]),
    low: pipeline('pixel-art-low', [
      pass({
        id: 'pixel-art-pixelate',
        shaderSource: { type: 'builtin', effectType: 'pixelate' },
        qualityTier: 'low',
      }),
    ]),
  },
};

// ---------------------------------------------------------------------------
// feedback-paint — pingPong feedback pass with custom GLSL
// ---------------------------------------------------------------------------

const feedbackPaint: EffectPreset = {
  id: 'feedback-paint',
  name: 'Feedback Paint',
  description: 'Persistent painting effect using pingPong feedback with history texture',
  tags: ['feedback', 'artistic'],
  pipeline: pipeline('feedback-paint-high', [
    pass({
      id: 'feedback-paint-layer',
      shaderSource: {
        type: 'custom',
        glsl: 'void fragment() { COLOR = mix(texture(historyTex, UV), texture(inputTex, UV), 0.1); }',
      },
      samplers: ['inputTex', 'historyTex'],
      persistence: 'pingPong',
      qualityTier: 'high',
    }),
  ]),
  tiers: {
    high: pipeline('feedback-paint-high', [
      pass({
        id: 'feedback-paint-layer',
        shaderSource: {
          type: 'custom',
          glsl: 'void fragment() { COLOR = mix(texture(historyTex, UV), texture(inputTex, UV), 0.1); }',
        },
        samplers: ['inputTex', 'historyTex'],
        persistence: 'pingPong',
        qualityTier: 'high',
      }),
    ]),
    medium: pipeline('feedback-paint-medium', [
      pass({
        id: 'feedback-paint-layer',
        shaderSource: {
          type: 'custom',
          glsl: 'void fragment() { COLOR = mix(texture(historyTex, UV), texture(inputTex, UV), 0.15); }',
        },
        samplers: ['inputTex', 'historyTex'],
        persistence: 'pingPong',
        qualityTier: 'medium',
      }),
    ]),
    low: pipeline('feedback-paint-low', [
      pass({
        id: 'feedback-paint-layer',
        shaderSource: {
          type: 'custom',
          glsl: 'void fragment() { COLOR = mix(texture(historyTex, UV), texture(inputTex, UV), 0.25); }',
        },
        samplers: ['inputTex', 'historyTex'],
        persistence: 'pingPong',
        qualityTier: 'low',
      }),
    ]),
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const PRESET_REGISTRY: ReadonlyMap<string, EffectPreset> = new Map<string, EffectPreset>([
  [bloomGlow.id, bloomGlow],
  [retroCrt.id, retroCrt],
  [underwaterDream.id, underwaterDream],
  [cinematic.id, cinematic],
  [pixelArt.id, pixelArt],
  [feedbackPaint.id, feedbackPaint],
]);

export function getPreset(id: string): EffectPreset | undefined {
  return PRESET_REGISTRY.get(id);
}

export function getAllPresets(): EffectPreset[] {
  return [...PRESET_REGISTRY.values()];
}

export function getPresetsByTag(tag: string): EffectPreset[] {
  return [...PRESET_REGISTRY.values()].filter((p) => p.tags.includes(tag));
}
