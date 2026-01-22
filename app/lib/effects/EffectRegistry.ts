import { Skia } from '@shopify/react-native-skia';
import type { EffectType, EffectSpec } from '@slopcade/shared';
import {
  GLOW_SHADER,
  OUTLINE_SHADER,
  PIXELATE_SHADER,
  DISSOLVE_SHADER,
  WAVE_DISTORTION_SHADER,
  CHROMATIC_ABERRATION_SHADER,
  HOLOGRAPHIC_SHADER,
  VIGNETTE_SHADER,
  SCANLINES_SHADER,
  POSTERIZE_SHADER,
  SHOCKWAVE_SHADER,
} from './shaders';

export type CompiledShader = ReturnType<typeof Skia.RuntimeEffect.Make>;

interface ShaderCacheEntry {
  shader: CompiledShader;
  source: string;
}

const shaderCache = new Map<EffectType, ShaderCacheEntry>();

const SHADER_SOURCES: Partial<Record<EffectType, string>> = {
  glow: GLOW_SHADER,
  outline: OUTLINE_SHADER,
  pixelate: PIXELATE_SHADER,
  dissolve: DISSOLVE_SHADER,
  waveDistortion: WAVE_DISTORTION_SHADER,
  chromaticAberration: CHROMATIC_ABERRATION_SHADER,
  holographic: HOLOGRAPHIC_SHADER,
  vignette: VIGNETTE_SHADER,
  scanlines: SCANLINES_SHADER,
  posterize: POSTERIZE_SHADER,
  shockwave: SHOCKWAVE_SHADER,
};

export function getCompiledShader(type: EffectType): CompiledShader | null {
  const cached = shaderCache.get(type);
  if (cached) {
    return cached.shader;
  }

  const source = SHADER_SOURCES[type];
  if (!source) {
    return null;
  }

  try {
    const shader = Skia.RuntimeEffect.Make(source);
    if (shader) {
      shaderCache.set(type, { shader, source });
    }
    return shader;
  } catch (error) {
    console.error(`Failed to compile shader for effect: ${type}`, error);
    return null;
  }
}

export function needsOffscreen(effect: EffectSpec): boolean {
  const samplingEffects: EffectType[] = [
    'pixelate',
    'dissolve',
    'waveDistortion',
    'chromaticAberration',
    'shockwave',
    'motionBlur',
    'outline',
    'posterize',
  ];
  return samplingEffects.includes(effect.type);
}

export function needsTimeUniform(effect: EffectSpec): boolean {
  const animatedEffects: EffectType[] = [
    'holographic',
    'waveDistortion',
    'scanlines',
    'glow',
  ];
  
  if (animatedEffects.includes(effect.type)) {
    return true;
  }
  
  if ('animated' in effect && effect.animated) {
    return true;
  }
  if ('pulse' in effect && effect.pulse) {
    return true;
  }
  
  return false;
}

function hexToRgb(hex: string): number[] {
  'worklet';
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [1, 1, 1];
}

export function getEffectUniforms(
  effect: EffectSpec,
  width: number,
  height: number,
  time: number
): Record<string, number | number[]> {
  'worklet';
  const base = {
    iResolution: [width, height],
    iTime: time,
  };

  switch (effect.type) {
    case 'glow':
      return {
        ...base,
        glowColor: hexToRgb(effect.color ?? '#ffffff'),
        radius: effect.radius ?? 20,
        intensity: effect.intensity ?? 1.0,
        pulse: effect.pulse ? 1 : 0,
        pulseSpeed: effect.pulseSpeed ?? 1,
      };

    case 'outline':
      return {
        ...base,
        outlineColor: hexToRgb(effect.color ?? '#ffffff'),
        width: effect.width ?? 2.0,
      };

    case 'pixelate':
      return {
        ...base,
        pixelSize: effect.pixelSize ?? 10.0,
      };

    case 'dissolve':
      return {
        ...base,
        progress: effect.progress ?? 0.0,
        noiseScale: effect.noiseScale ?? 20.0,
        edgeWidth: effect.edgeWidth ?? 0.1,
        edgeColor: hexToRgb(effect.edgeColor ?? '#ffffff'),
      };

    case 'waveDistortion':
      return {
        ...base,
        amplitude: effect.amplitude ?? 0.1,
        frequency: effect.frequency ?? 10.0,
        speed: effect.speed ?? 2.0,
        direction: effect.direction === 'horizontal' ? 0 : effect.direction === 'vertical' ? 1 : 2,
      };

    case 'chromaticAberration':
      return {
        ...base,
        offsetX: effect.offsetX ?? 2.0,
        offsetY: effect.offsetY ?? 2.0,
        animated: effect.animated ? 1 : 0,
        intensity: effect.intensity ?? 1,
      };

    case 'holographic':
      return {
        ...base,
        speed: effect.speed ?? 1.0,
        saturation: effect.saturation ?? 1,
        scanlines: effect.scanlines !== false ? 1 : 0,
        scanlineSpacing: effect.scanlineSpacing ?? 4,
      };

    case 'vignette':
      return {
        ...base,
        intensity: effect.intensity ?? 0.5,
        radius: effect.radius ?? 0.8,
        softness: effect.softness ?? 0.3,
        vignetteColor: hexToRgb(effect.color ?? '#000000'),
      };

    case 'scanlines':
      return {
        ...base,
        spacing: effect.spacing ?? 4.0,
        thickness: effect.thickness ?? 1.0,
        animated: effect.animated !== false ? 1 : 0,
        speed: effect.speed ?? 50,
      };

    case 'posterize':
      return {
        ...base,
        levels: effect.levels ?? 4.0,
        gamma: effect.gamma ?? 1,
      };

    case 'shockwave':
      return {
        ...base,
        center: [effect.centerX ?? 0.5, effect.centerY ?? 0.5],
        radius: effect.radius ?? 0.5,
        thickness: effect.thickness ?? 0.1,
        strength: effect.strength ?? 0.1,
      };

    default:
      return base;
  }
}

export function clearShaderCache(): void {
  shaderCache.clear();
}

export function isEffectSupported(type: EffectType): boolean {
  if (!Skia?.RuntimeEffect?.Make) {
    return false;
  }
  return SHADER_SOURCES[type] !== undefined || ['blur', 'dropShadow', 'tint', 'innerGlow', 'rimLight', 'colorMatrix', 'motionBlur'].includes(type);
}
