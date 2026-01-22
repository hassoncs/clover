export type EffectType =
  | 'glow'
  | 'innerGlow'
  | 'outline'
  | 'dropShadow'
  | 'tint'
  | 'holographic'
  | 'pixelate'
  | 'dissolve'
  | 'waveDistortion'
  | 'shockwave'
  | 'chromaticAberration'
  | 'vignette'
  | 'scanlines'
  | 'posterize'
  | 'blur'
  | 'motionBlur'
  | 'rimLight'
  | 'colorMatrix';

export type EffectBlendMode =
  | 'srcOver'
  | 'screen'
  | 'multiply'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'colorDodge'
  | 'colorBurn'
  | 'hardLight'
  | 'softLight'
  | 'difference'
  | 'exclusion'
  | 'plus';

export interface EffectBase {
  type: EffectType;
  enabled?: boolean;
  opacity?: number;
  blendMode?: EffectBlendMode;
  id?: string;
}

export interface GlowEffect extends EffectBase {
  type: 'glow';
  color: string;
  radius: number;
  intensity: number;
  pulse?: boolean;
  pulseSpeed?: number;
}

export interface InnerGlowEffect extends EffectBase {
  type: 'innerGlow';
  color: string;
  radius: number;
  intensity: number;
  feather?: number;
}

export interface OutlineEffect extends EffectBase {
  type: 'outline';
  color: string;
  width: number;
  position?: 'outer' | 'inner' | 'center';
}

export interface DropShadowEffect extends EffectBase {
  type: 'dropShadow';
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

export interface TintEffect extends EffectBase {
  type: 'tint';
  color: string;
  intensity: number;
  preserveLuminance?: boolean;
}

export interface HolographicEffect extends EffectBase {
  type: 'holographic';
  speed: number;
  saturation?: number;
  scanlines?: boolean;
  scanlineSpacing?: number;
}

export interface PixelateEffect extends EffectBase {
  type: 'pixelate';
  pixelSize: number;
  animated?: boolean;
  animationSpeed?: number;
}

export interface DissolveEffect extends EffectBase {
  type: 'dissolve';
  progress: number;
  noiseScale: number;
  edgeWidth: number;
  edgeColor: string;
  direction?: 'random' | 'up' | 'down' | 'left' | 'right';
}

export interface WaveDistortionEffect extends EffectBase {
  type: 'waveDistortion';
  amplitude: number;
  frequency: number;
  speed: number;
  direction?: 'horizontal' | 'vertical' | 'both';
}

export interface ShockwaveEffect extends EffectBase {
  type: 'shockwave';
  centerX: number;
  centerY: number;
  radius: number;
  thickness: number;
  strength: number;
}

export interface ChromaticAberrationEffect extends EffectBase {
  type: 'chromaticAberration';
  offsetX: number;
  offsetY: number;
  animated?: boolean;
  intensity?: number;
}

export interface VignetteEffect extends EffectBase {
  type: 'vignette';
  intensity: number;
  radius: number;
  softness: number;
  color?: string;
}

export interface ScanlinesEffect extends EffectBase {
  type: 'scanlines';
  spacing: number;
  thickness: number;
  animated?: boolean;
  speed?: number;
}

export interface PosterizeEffect extends EffectBase {
  type: 'posterize';
  levels: number;
  gamma?: number;
}

export interface BlurEffect extends EffectBase {
  type: 'blur';
  radius: number;
}

export interface MotionBlurEffect extends EffectBase {
  type: 'motionBlur';
  strength: number;
  angle: number;
  samples?: number;
}

export interface RimLightEffect extends EffectBase {
  type: 'rimLight';
  color: string;
  width: number;
  intensity: number;
  falloff?: number;
}

export interface ColorMatrixEffect extends EffectBase {
  type: 'colorMatrix';
  matrix: number[];
}

export type EffectSpec =
  | GlowEffect
  | InnerGlowEffect
  | OutlineEffect
  | DropShadowEffect
  | TintEffect
  | HolographicEffect
  | PixelateEffect
  | DissolveEffect
  | WaveDistortionEffect
  | ShockwaveEffect
  | ChromaticAberrationEffect
  | VignetteEffect
  | ScanlinesEffect
  | PosterizeEffect
  | BlurEffect
  | MotionBlurEffect
  | RimLightEffect
  | ColorMatrixEffect;

export type EffectChain = EffectSpec[];

export interface EffectMetadata {
  type: EffectType;
  displayName: string;
  description: string;
  category: 'glow' | 'distortion' | 'color' | 'postProcess' | 'artistic';
  params: EffectParamMeta[];
  defaultValues: Partial<EffectSpec>;
}

export interface EffectParamMeta {
  key: string;
  type: 'number' | 'color' | 'boolean' | 'select';
  displayName: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  defaultValue: number | string | boolean;
}

export const EFFECT_METADATA: Record<EffectType, EffectMetadata> = {
  glow: {
    type: 'glow',
    displayName: 'Outer Glow',
    description: 'Soft luminous halo around the object',
    category: 'glow',
    params: [
      { key: 'color', type: 'color', displayName: 'Color', defaultValue: '#00ffff' },
      { key: 'radius', type: 'number', displayName: 'Radius', min: 1, max: 50, step: 1, defaultValue: 15 },
      { key: 'intensity', type: 'number', displayName: 'Intensity', min: 0.1, max: 2, step: 0.1, defaultValue: 0.8 },
      { key: 'pulse', type: 'boolean', displayName: 'Pulse', defaultValue: false },
      { key: 'pulseSpeed', type: 'number', displayName: 'Pulse Speed', min: 0.5, max: 5, step: 0.1, defaultValue: 1 },
    ],
    defaultValues: { type: 'glow', color: '#00ffff', radius: 15, intensity: 0.8 },
  },
  innerGlow: {
    type: 'innerGlow',
    displayName: 'Inner Glow',
    description: 'Glow from inside the edges',
    category: 'glow',
    params: [
      { key: 'color', type: 'color', displayName: 'Color', defaultValue: '#ffffff' },
      { key: 'radius', type: 'number', displayName: 'Radius', min: 1, max: 30, step: 1, defaultValue: 10 },
      { key: 'intensity', type: 'number', displayName: 'Intensity', min: 0.1, max: 1.5, step: 0.1, defaultValue: 0.6 },
      { key: 'feather', type: 'number', displayName: 'Feather', min: 0, max: 1, step: 0.1, defaultValue: 0.5 },
    ],
    defaultValues: { type: 'innerGlow', color: '#ffffff', radius: 10, intensity: 0.6 },
  },
  outline: {
    type: 'outline',
    displayName: 'Outline',
    description: 'Colored border around the object',
    category: 'artistic',
    params: [
      { key: 'color', type: 'color', displayName: 'Color', defaultValue: '#000000' },
      { key: 'width', type: 'number', displayName: 'Width', min: 1, max: 10, step: 1, defaultValue: 2 },
      { key: 'position', type: 'select', displayName: 'Position', options: ['outer', 'inner', 'center'], defaultValue: 'outer' },
    ],
    defaultValues: { type: 'outline', color: '#000000', width: 2, position: 'outer' },
  },
  dropShadow: {
    type: 'dropShadow',
    displayName: 'Drop Shadow',
    description: 'Shadow cast below the object',
    category: 'glow',
    params: [
      { key: 'color', type: 'color', displayName: 'Color', defaultValue: '#000000' },
      { key: 'offsetX', type: 'number', displayName: 'Offset X', min: -20, max: 20, step: 1, defaultValue: 4 },
      { key: 'offsetY', type: 'number', displayName: 'Offset Y', min: -20, max: 20, step: 1, defaultValue: 4 },
      { key: 'blur', type: 'number', displayName: 'Blur', min: 0, max: 30, step: 1, defaultValue: 8 },
    ],
    defaultValues: { type: 'dropShadow', color: '#000000', offsetX: 4, offsetY: 4, blur: 8 },
  },
  tint: {
    type: 'tint',
    displayName: 'Color Tint',
    description: 'Shift colors toward a target',
    category: 'color',
    params: [
      { key: 'color', type: 'color', displayName: 'Color', defaultValue: '#ff0000' },
      { key: 'intensity', type: 'number', displayName: 'Intensity', min: 0, max: 1, step: 0.1, defaultValue: 0.5 },
      { key: 'preserveLuminance', type: 'boolean', displayName: 'Preserve Luminance', defaultValue: true },
    ],
    defaultValues: { type: 'tint', color: '#ff0000', intensity: 0.5 },
  },
  holographic: {
    type: 'holographic',
    displayName: 'Holographic',
    description: 'Rainbow-shifting iridescent effect',
    category: 'artistic',
    params: [
      { key: 'speed', type: 'number', displayName: 'Speed', min: 0.1, max: 3, step: 0.1, defaultValue: 0.5 },
      { key: 'saturation', type: 'number', displayName: 'Saturation', min: 0.5, max: 1.5, step: 0.1, defaultValue: 1 },
      { key: 'scanlines', type: 'boolean', displayName: 'Scanlines', defaultValue: true },
      { key: 'scanlineSpacing', type: 'number', displayName: 'Scanline Spacing', min: 2, max: 10, step: 1, defaultValue: 4 },
    ],
    defaultValues: { type: 'holographic', speed: 0.5, saturation: 1, scanlines: true },
  },
  pixelate: {
    type: 'pixelate',
    displayName: 'Pixelate',
    description: 'Reduce to chunky pixels',
    category: 'distortion',
    params: [
      { key: 'pixelSize', type: 'number', displayName: 'Pixel Size', min: 2, max: 32, step: 1, defaultValue: 8 },
      { key: 'animated', type: 'boolean', displayName: 'Animated', defaultValue: false },
      { key: 'animationSpeed', type: 'number', displayName: 'Animation Speed', min: 0.5, max: 5, step: 0.1, defaultValue: 1 },
    ],
    defaultValues: { type: 'pixelate', pixelSize: 8 },
  },
  dissolve: {
    type: 'dissolve',
    displayName: 'Dissolve',
    description: 'Break apart into noise',
    category: 'distortion',
    params: [
      { key: 'progress', type: 'number', displayName: 'Progress', min: 0, max: 1, step: 0.01, defaultValue: 0 },
      { key: 'noiseScale', type: 'number', displayName: 'Noise Scale', min: 5, max: 50, step: 1, defaultValue: 20 },
      { key: 'edgeWidth', type: 'number', displayName: 'Edge Width', min: 0.01, max: 0.2, step: 0.01, defaultValue: 0.05 },
      { key: 'edgeColor', type: 'color', displayName: 'Edge Color', defaultValue: '#ff8800' },
    ],
    defaultValues: { type: 'dissolve', progress: 0, noiseScale: 20, edgeWidth: 0.05, edgeColor: '#ff8800' },
  },
  waveDistortion: {
    type: 'waveDistortion',
    displayName: 'Wave Distortion',
    description: 'Rippling wave warp effect',
    category: 'distortion',
    params: [
      { key: 'amplitude', type: 'number', displayName: 'Amplitude', min: 0.01, max: 0.1, step: 0.01, defaultValue: 0.03 },
      { key: 'frequency', type: 'number', displayName: 'Frequency', min: 5, max: 50, step: 1, defaultValue: 15 },
      { key: 'speed', type: 'number', displayName: 'Speed', min: 0.5, max: 5, step: 0.1, defaultValue: 2 },
      { key: 'direction', type: 'select', displayName: 'Direction', options: ['horizontal', 'vertical', 'both'], defaultValue: 'horizontal' },
    ],
    defaultValues: { type: 'waveDistortion', amplitude: 0.03, frequency: 15, speed: 2 },
  },
  shockwave: {
    type: 'shockwave',
    displayName: 'Shockwave',
    description: 'Expanding ripple from a point',
    category: 'distortion',
    params: [
      { key: 'centerX', type: 'number', displayName: 'Center X', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
      { key: 'centerY', type: 'number', displayName: 'Center Y', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
      { key: 'radius', type: 'number', displayName: 'Radius', min: 0, max: 2, step: 0.01, defaultValue: 0 },
      { key: 'thickness', type: 'number', displayName: 'Thickness', min: 0.05, max: 0.5, step: 0.01, defaultValue: 0.1 },
      { key: 'strength', type: 'number', displayName: 'Strength', min: 0.01, max: 0.2, step: 0.01, defaultValue: 0.05 },
    ],
    defaultValues: { type: 'shockwave', centerX: 0.5, centerY: 0.5, radius: 0, thickness: 0.1, strength: 0.05 },
  },
  chromaticAberration: {
    type: 'chromaticAberration',
    displayName: 'Chromatic Aberration',
    description: 'RGB color channel separation',
    category: 'distortion',
    params: [
      { key: 'offsetX', type: 'number', displayName: 'Offset X', min: 0, max: 20, step: 1, defaultValue: 5 },
      { key: 'offsetY', type: 'number', displayName: 'Offset Y', min: 0, max: 20, step: 1, defaultValue: 0 },
      { key: 'animated', type: 'boolean', displayName: 'Animated', defaultValue: false },
      { key: 'intensity', type: 'number', displayName: 'Intensity', min: 0, max: 1, step: 0.1, defaultValue: 0.5 },
    ],
    defaultValues: { type: 'chromaticAberration', offsetX: 5, offsetY: 0, intensity: 0.5 },
  },
  vignette: {
    type: 'vignette',
    displayName: 'Vignette',
    description: 'Darken the edges',
    category: 'postProcess',
    params: [
      { key: 'intensity', type: 'number', displayName: 'Intensity', min: 0, max: 1, step: 0.1, defaultValue: 0.5 },
      { key: 'radius', type: 'number', displayName: 'Radius', min: 0.2, max: 1, step: 0.1, defaultValue: 0.7 },
      { key: 'softness', type: 'number', displayName: 'Softness', min: 0, max: 1, step: 0.1, defaultValue: 0.5 },
      { key: 'color', type: 'color', displayName: 'Color', defaultValue: '#000000' },
    ],
    defaultValues: { type: 'vignette', intensity: 0.5, radius: 0.7, softness: 0.5 },
  },
  scanlines: {
    type: 'scanlines',
    displayName: 'Scanlines',
    description: 'CRT-style horizontal lines',
    category: 'postProcess',
    params: [
      { key: 'spacing', type: 'number', displayName: 'Spacing', min: 2, max: 10, step: 1, defaultValue: 4 },
      { key: 'thickness', type: 'number', displayName: 'Thickness', min: 1, max: 3, step: 0.5, defaultValue: 1 },
      { key: 'animated', type: 'boolean', displayName: 'Animated', defaultValue: true },
      { key: 'speed', type: 'number', displayName: 'Speed', min: 10, max: 100, step: 5, defaultValue: 50 },
    ],
    defaultValues: { type: 'scanlines', spacing: 4, thickness: 1, animated: true, speed: 50 },
  },
  posterize: {
    type: 'posterize',
    displayName: 'Posterize',
    description: 'Reduce color levels',
    category: 'color',
    params: [
      { key: 'levels', type: 'number', displayName: 'Levels', min: 2, max: 16, step: 1, defaultValue: 4 },
      { key: 'gamma', type: 'number', displayName: 'Gamma', min: 0.5, max: 2, step: 0.1, defaultValue: 1 },
    ],
    defaultValues: { type: 'posterize', levels: 4, gamma: 1 },
  },
  blur: {
    type: 'blur',
    displayName: 'Blur',
    description: 'Gaussian blur effect',
    category: 'postProcess',
    params: [
      { key: 'radius', type: 'number', displayName: 'Radius', min: 1, max: 30, step: 1, defaultValue: 5 },
    ],
    defaultValues: { type: 'blur', radius: 5 },
  },
  motionBlur: {
    type: 'motionBlur',
    displayName: 'Motion Blur',
    description: 'Directional blur for speed',
    category: 'postProcess',
    params: [
      { key: 'strength', type: 'number', displayName: 'Strength', min: 0, max: 1, step: 0.1, defaultValue: 0.5 },
      { key: 'angle', type: 'number', displayName: 'Angle', min: 0, max: 360, step: 15, defaultValue: 0 },
      { key: 'samples', type: 'number', displayName: 'Samples', min: 3, max: 15, step: 2, defaultValue: 7 },
    ],
    defaultValues: { type: 'motionBlur', strength: 0.5, angle: 0, samples: 7 },
  },
  rimLight: {
    type: 'rimLight',
    displayName: 'Rim Light',
    description: 'Edge glow lighting effect',
    category: 'glow',
    params: [
      { key: 'color', type: 'color', displayName: 'Color', defaultValue: '#ff00ff' },
      { key: 'width', type: 'number', displayName: 'Width', min: 1, max: 10, step: 1, defaultValue: 3 },
      { key: 'intensity', type: 'number', displayName: 'Intensity', min: 0.5, max: 2, step: 0.1, defaultValue: 1 },
      { key: 'falloff', type: 'number', displayName: 'Falloff', min: 0, max: 1, step: 0.1, defaultValue: 0.5 },
    ],
    defaultValues: { type: 'rimLight', color: '#ff00ff', width: 3, intensity: 1 },
  },
  colorMatrix: {
    type: 'colorMatrix',
    displayName: 'Color Matrix',
    description: 'Custom 4x5 color transformation',
    category: 'color',
    params: [],
    defaultValues: {
      type: 'colorMatrix',
      matrix: [
        1, 0, 0, 0, 0,
        0, 1, 0, 0, 0,
        0, 0, 1, 0, 0,
        0, 0, 0, 1, 0,
      ],
    },
  },
};
