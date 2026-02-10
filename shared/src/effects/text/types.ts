/**
 * Text Effects - Three-tier system for mobile optimization
 *
 * Tier 1 (MSDF): Single-pass outline/shadow/glow via SDF math - best performance
 * Tier 2 (SubViewport): Multi-pass with blur/gradients/bevel - complex effects
 * Tier 3 (RichTextEffect): Per-character animation - CPU-bound
 */

import type { EffectNode } from '../types';

export type DeviceTier = 'high' | 'mid' | 'low';

export interface FontConfig {
  source: 'system' | 'url' | 'google';
  family?: string;
  url?: string;
  googleFont?: string;
  weight?: 'normal' | 'bold' | number;
}

export interface TextConfig {
  content: string;
  fontSize: number;
  color: string;
  alignment?: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
}

export interface MsdfConfig {
  enabled: boolean;
  pixelRange: number;
  size: number;
}

export interface SdfEffectConfig {
  outlineEnabled: boolean;
  outlineColor: string;
  outlineSize: number;

  shadowEnabled: boolean;
  shadowColor: string;
  shadowSpread: number;

  glowEnabled: boolean;
  glowColor: string;
  glowSpread: number;
  glowIntensity: number;
}

export interface SubViewportEffectConfig {
  dropShadow?: {
    enabled: boolean;
    color: string;
    offset: [number, number];
    blur: number;
    samples: number;
  };

  outerGlow?: {
    enabled: boolean;
    color: string;
    size: number;
    intensity: number;
    samples: number;
  };

  gradient?: {
    enabled: boolean;
    type: 'linear' | 'radial' | 'angular';
    startColor: string;
    endColor: string;
    angle: number;
  };

  bevel?: {
    enabled: boolean;
    strength: number;
    size: number;
    lightAngle: number;
  };

  innerGlow?: {
    enabled: boolean;
    color: string;
    size: number;
  };
}

export interface TextEffectParams {
  text: TextConfig;
  font: FontConfig;
  tier: 'msdf' | 'subviewport';
  msdf?: MsdfConfig;
  sdfEffects?: SdfEffectConfig;
  subViewportEffects?: SubViewportEffectConfig;
  viewportSize?: { width: number; height: number };
}

export function isTextEffectNode(node: EffectNode): boolean {
  return (
    node.type === 'msdfTextGenerator' ||
    node.type === 'subViewportTextGenerator' ||
    node.type === 'textDropShadow' ||
    node.type === 'textGradient' ||
    node.type === 'textGlow' ||
    node.type === 'textBevel' ||
    node.type === 'textOutline'
  );
}

export interface MobileEffectLimits {
  maxSamples: number;
  maxEffectsPerText: number;
  enableBlur: boolean;
  enableSubViewport: boolean;
  useBuiltInOutline?: boolean;
}

export function getMobileEffectLimits(tier: DeviceTier): MobileEffectLimits {
  switch (tier) {
    case 'high':
      return {
        maxSamples: 16,
        maxEffectsPerText: 4,
        enableBlur: true,
        enableSubViewport: true,
      };
    case 'mid':
      return {
        maxSamples: 12,
        maxEffectsPerText: 3,
        enableBlur: false,
        enableSubViewport: true,
      };
    case 'low':
      return {
        maxSamples: 8,
        maxEffectsPerText: 2,
        enableBlur: false,
        enableSubViewport: false,
        useBuiltInOutline: true,
      };
  }
}

export function detectDeviceTier(): DeviceTier {
  if (typeof window === 'undefined') return 'mid';

  const width = window.screen.width;
  const dpr = window.devicePixelRatio || 1;
  const pixelCount = width * dpr;

  if (pixelCount > 2000) return 'high';
  if (pixelCount > 1000) return 'mid';
  return 'low';
}

export interface TextEffectPreset {
  name: string;
  description: string;
  tier: 'msdf' | 'subviewport';
  params: {
    sdfEffects?: SdfEffectConfig;
    subViewportEffects?: SubViewportEffectConfig;
  };
}

export const TEXT_EFFECT_PRESETS: Record<string, TextEffectPreset> = {
  neon: {
    name: 'Neon Sign',
    description: 'Bright glow with dark outline',
    tier: 'msdf',
    params: {
      sdfEffects: {
        outlineEnabled: true,
        outlineColor: '#000000',
        outlineSize: 3,
        shadowEnabled: false,
        shadowColor: '#00000080',
        shadowSpread: 4,
        glowEnabled: true,
        glowColor: '#00FFFF',
        glowSpread: 12,
        glowIntensity: 2.5,
      },
    },
  },

  gold: {
    name: 'Gold Emboss',
    description: 'Metallic gradient with bevel',
    tier: 'subviewport',
    params: {
      subViewportEffects: {
        gradient: {
          enabled: true,
          type: 'linear',
          startColor: '#FFD700',
          endColor: '#B8860B',
          angle: 90,
        },
        bevel: {
          enabled: true,
          strength: 1.2,
          size: 3,
          lightAngle: 135,
        },
      },
    },
  },

  retro: {
    name: 'Retro Pixel',
    description: 'Sharp outline with drop shadow',
    tier: 'msdf',
    params: {
      sdfEffects: {
        outlineEnabled: true,
        outlineColor: '#000000',
        outlineSize: 2,
        shadowEnabled: true,
        shadowColor: '#00000080',
        shadowSpread: 4,
        glowEnabled: false,
        glowColor: '#FFFFFF',
        glowSpread: 0,
        glowIntensity: 0,
      },
    },
  },
};
