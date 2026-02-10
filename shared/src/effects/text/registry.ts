import type { EffectParamSchema } from '../types';
import {
  TEXT_MSDF_UBER_SHADER,
  TEXT_DROPSHADOW_SHADER,
  TEXT_OUTER_GLOW_SHADER,
  TEXT_GRADIENT_SHADER,
  TEXT_BEVEL_SHADER,
  TEXT_INNER_GLOW_SHADER,
  TEXT_OUTLINE_SHADER,
} from './shaders';

export interface ShaderLibraryEntry {
  id: string;
  glsl: string;
  paramsSchema: EffectParamSchema[];
  aiHints: {
    description: string;
    aliases: string[];
    category: string;
    combinability: string[];
  };
}

export const MSDF_TEXT_GENERATOR_SCHEMA: EffectParamSchema[] = [
  {
    key: 'fontSize',
    uniformName: 'font_size',
    type: 'float',
    defaultValue: 64,
    ui: { displayName: 'Font Size', category: 'Text', min: 8, max: 200 },
  },
  {
    key: 'color',
    uniformName: 'fill_color',
    type: 'color',
    defaultValue: '#FFFFFF',
    ui: { displayName: 'Text Color', category: 'Text' },
  },
  {
    key: 'outlineEnabled',
    uniformName: 'outline_enabled',
    type: 'bool',
    defaultValue: false,
    ui: { displayName: 'Enable Outline', category: 'Outline' },
  },
  {
    key: 'outlineColor',
    uniformName: 'outline_color',
    type: 'color',
    defaultValue: '#000000',
    ui: { displayName: 'Outline Color', category: 'Outline' },
  },
  {
    key: 'outlineSize',
    uniformName: 'outline_size',
    type: 'float',
    defaultValue: 3,
    ui: { displayName: 'Outline Size', category: 'Outline', min: 0, max: 10, step: 0.5 },
  },
  {
    key: 'shadowEnabled',
    uniformName: 'shadow_enabled',
    type: 'bool',
    defaultValue: false,
    ui: { displayName: 'Enable Shadow', category: 'Shadow' },
  },
  {
    key: 'shadowColor',
    uniformName: 'shadow_color',
    type: 'color',
    defaultValue: '#00000080',
    ui: { displayName: 'Shadow Color', category: 'Shadow' },
  },
  {
    key: 'shadowSpread',
    uniformName: 'shadow_spread',
    type: 'float',
    defaultValue: 4,
    ui: { displayName: 'Shadow Spread', category: 'Shadow', min: 0, max: 20 },
  },
  {
    key: 'glowEnabled',
    uniformName: 'glow_enabled',
    type: 'bool',
    defaultValue: false,
    ui: { displayName: 'Enable Glow', category: 'Glow' },
  },
  {
    key: 'glowColor',
    uniformName: 'glow_color',
    type: 'color',
    defaultValue: '#FF6B00',
    ui: { displayName: 'Glow Color', category: 'Glow' },
  },
  {
    key: 'glowSpread',
    uniformName: 'glow_spread',
    type: 'float',
    defaultValue: 8,
    ui: { displayName: 'Glow Spread', category: 'Glow', min: 0, max: 20 },
  },
  {
    key: 'glowIntensity',
    uniformName: 'glow_intensity',
    type: 'float',
    defaultValue: 1.5,
    ui: { displayName: 'Glow Intensity', category: 'Glow', min: 0, max: 3, step: 0.1 },
  },
];

// Registry entries for text effect nodes
export const TEXT_SHADER_LIBRARY: Record<string, ShaderLibraryEntry> = {
  msdfTextGenerator: {
    id: 'msdfTextGenerator',
    glsl: TEXT_MSDF_UBER_SHADER,
    paramsSchema: MSDF_TEXT_GENERATOR_SCHEMA,
    aiHints: {
      description: 'Renders text with MSDF font and single-pass outline/shadow/glow effects. Best performance for mobile.',
      aliases: ['text', 'label', 'title', 'msdf text'],
      category: 'generator',
      combinability: ['textGlow', 'textGradient', 'textBevel'],
    },
  },

  textDropShadow: {
    id: 'textDropShadow',
    glsl: TEXT_DROPSHADOW_SHADER,
    paramsSchema: [
      {
        key: 'shadowColor',
        uniformName: 'shadow_color',
        type: 'color',
        defaultValue: '#00000080',
        ui: { displayName: 'Shadow Color', category: 'Shadow' },
      },
      {
        key: 'shadowOffsetX',
        uniformName: 'shadow_offset',
        type: 'vec2',
        defaultValue: [4, 4],
        ui: { displayName: 'Shadow Offset', category: 'Shadow' },
      },
      {
        key: 'shadowBlur',
        uniformName: 'shadow_blur',
        type: 'float',
        defaultValue: 4,
        ui: { displayName: 'Shadow Blur', category: 'Shadow', min: 0, max: 10 },
      },
      {
        key: 'blurSamples',
        uniformName: 'blur_samples',
        type: 'int',
        defaultValue: 8,
        ui: { displayName: 'Blur Samples', category: 'Performance', min: 4, max: 16 },
      },
    ],
    aiHints: {
      description: 'Adds a blurred drop shadow behind text',
      aliases: ['shadow', 'drop shadow', 'shadow blur'],
      category: 'filter',
      combinability: ['msdfTextGenerator', 'subViewportTextGenerator'],
    },
  },

  textOuterGlow: {
    id: 'textOuterGlow',
    glsl: TEXT_OUTER_GLOW_SHADER,
    paramsSchema: [
      {
        key: 'glowColor',
        uniformName: 'glow_color',
        type: 'color',
        defaultValue: '#FFD700',
        ui: { displayName: 'Glow Color', category: 'Glow' },
      },
      {
        key: 'glowSize',
        uniformName: 'glow_size',
        type: 'float',
        defaultValue: 6,
        ui: { displayName: 'Glow Size', category: 'Glow', min: 1, max: 20 },
      },
      {
        key: 'glowIntensity',
        uniformName: 'glow_intensity',
        type: 'float',
        defaultValue: 1.5,
        ui: { displayName: 'Intensity', category: 'Glow', min: 0, max: 3, step: 0.1 },
      },
      {
        key: 'glowSamples',
        uniformName: 'glow_samples',
        type: 'int',
        defaultValue: 8,
        ui: { displayName: 'Glow Samples', category: 'Performance', min: 4, max: 16 },
      },
    ],
    aiHints: {
      description: 'Adds an outer glow/aura around text edges',
      aliases: ['glow', 'halo', 'aura', 'outer glow'],
      category: 'filter',
      combinability: ['msdfTextGenerator', 'subViewportTextGenerator', 'textDropShadow'],
    },
  },

  textGradient: {
    id: 'textGradient',
    glsl: TEXT_GRADIENT_SHADER,
    paramsSchema: [
      {
        key: 'gradientStart',
        uniformName: 'gradient_start',
        type: 'color',
        defaultValue: '#FF0000',
        ui: { displayName: 'Start Color', category: 'Gradient' },
      },
      {
        key: 'gradientEnd',
        uniformName: 'gradient_end',
        type: 'color',
        defaultValue: '#0000FF',
        ui: { displayName: 'End Color', category: 'Gradient' },
      },
      {
        key: 'gradientAngle',
        uniformName: 'gradient_angle',
        type: 'float',
        defaultValue: 90,
        ui: { displayName: 'Gradient Angle', category: 'Gradient', min: 0, max: 360 },
      },
    ],
    aiHints: {
      description: 'Applies a linear gradient fill across the entire text',
      aliases: ['gradient', 'rainbow', 'color gradient'],
      category: 'filter',
      combinability: ['msdfTextGenerator', 'subViewportTextGenerator'],
    },
  },

  textBevel: {
    id: 'textBevel',
    glsl: TEXT_BEVEL_SHADER,
    paramsSchema: [
      {
        key: 'lightDirX',
        uniformName: 'light_dir',
        type: 'vec2',
        defaultValue: [1, -1],
        ui: { displayName: 'Light Direction', category: 'Bevel' },
      },
      {
        key: 'bevelStrength',
        uniformName: 'bevel_strength',
        type: 'float',
        defaultValue: 1,
        ui: { displayName: 'Bevel Strength', category: 'Bevel', min: 0, max: 2, step: 0.1 },
      },
      {
        key: 'bevelSize',
        uniformName: 'bevel_size',
        type: 'float',
        defaultValue: 2,
        ui: { displayName: 'Bevel Size', category: 'Bevel', min: 1, max: 10 },
      },
    ],
    aiHints: {
      description: 'Adds a 3D bevel/emboss effect with simulated lighting',
      aliases: ['bevel', 'emboss', '3d text', 'raised'],
      category: 'filter',
      combinability: ['msdfTextGenerator', 'subViewportTextGenerator', 'textGradient'],
    },
  },

  textInnerGlow: {
    id: 'textInnerGlow',
    glsl: TEXT_INNER_GLOW_SHADER,
    paramsSchema: [
      {
        key: 'innerGlowColor',
        uniformName: 'inner_glow_color',
        type: 'color',
        defaultValue: '#FFFFFF',
        ui: { displayName: 'Inner Glow Color', category: 'Inner Glow' },
      },
      {
        key: 'innerGlowSize',
        uniformName: 'inner_glow_size',
        type: 'float',
        defaultValue: 3,
        ui: { displayName: 'Inner Glow Size', category: 'Inner Glow', min: 1, max: 10 },
      },
    ],
    aiHints: {
      description: 'Adds a glow effect inside the text edges',
      aliases: ['inner glow', 'inner shadow', 'inset glow'],
      category: 'filter',
      combinability: ['msdfTextGenerator', 'subViewportTextGenerator'],
    },
  },

  textOutline: {
    id: 'textOutline',
    glsl: TEXT_OUTLINE_SHADER,
    paramsSchema: [
      {
        key: 'outlineColor',
        uniformName: 'outline_color',
        type: 'color',
        defaultValue: '#000000',
        ui: { displayName: 'Outline Color', category: 'Outline' },
      },
      {
        key: 'outlineWidth',
        uniformName: 'outline_width',
        type: 'float',
        defaultValue: 2,
        ui: { displayName: 'Outline Width', category: 'Outline', min: 0, max: 10 },
      },
      {
        key: 'outlineSamples',
        uniformName: 'outline_samples',
        type: 'int',
        defaultValue: 16,
        ui: { displayName: 'Outline Samples', category: 'Performance', min: 4, max: 32 },
      },
    ],
    aiHints: {
      description: 'Adds an outline/stroke around text (multi-pass, higher quality than MSDF outline)',
      aliases: ['outline', 'stroke', 'border'],
      category: 'filter',
      combinability: ['subViewportTextGenerator'],
    },
  },
};

// Helper to get all text shader IDs
export function getTextShaderIds(): string[] {
  return Object.keys(TEXT_SHADER_LIBRARY);
}

// Helper to check if a shader is a text effect
export function isTextShader(shaderId: string): boolean {
  return shaderId in TEXT_SHADER_LIBRARY;
}
