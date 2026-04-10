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
    viewportSize?: {
        width: number;
        height: number;
    };
}
export declare function isTextEffectNode(node: EffectNode): boolean;
export interface MobileEffectLimits {
    maxSamples: number;
    maxEffectsPerText: number;
    enableBlur: boolean;
    enableSubViewport: boolean;
    useBuiltInOutline?: boolean;
}
export declare function getMobileEffectLimits(tier: DeviceTier): MobileEffectLimits;
export declare function detectDeviceTier(): DeviceTier;
export interface TextEffectPreset {
    name: string;
    description: string;
    tier: 'msdf' | 'subviewport';
    params: {
        sdfEffects?: SdfEffectConfig;
        subViewportEffects?: SubViewportEffectConfig;
    };
}
export declare const TEXT_EFFECT_PRESETS: Record<string, TextEffectPreset>;
//# sourceMappingURL=types.d.ts.map