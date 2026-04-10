/**
 * Text Effects - Three-tier system for mobile optimization
 *
 * Tier 1 (MSDF): Single-pass outline/shadow/glow via SDF math - best performance
 * Tier 2 (SubViewport): Multi-pass with blur/gradients/bevel - complex effects
 * Tier 3 (RichTextEffect): Per-character animation - CPU-bound
 */
export function isTextEffectNode(node) {
    return (node.type === 'msdfTextGenerator' ||
        node.type === 'subViewportTextGenerator' ||
        node.type === 'textDropShadow' ||
        node.type === 'textGradient' ||
        node.type === 'textGlow' ||
        node.type === 'textBevel' ||
        node.type === 'textOutline');
}
export function getMobileEffectLimits(tier) {
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
export function detectDeviceTier() {
    const runtime = typeof globalThis !== 'undefined'
        ? globalThis
        : null;
    const width = runtime?.window?.screen?.width;
    const dpr = runtime?.window?.devicePixelRatio ?? 1;
    if (!width)
        return 'mid';
    const pixelCount = width * dpr;
    if (pixelCount > 2000)
        return 'high';
    if (pixelCount > 1000)
        return 'mid';
    return 'low';
}
export const TEXT_EFFECT_PRESETS = {
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
//# sourceMappingURL=types.js.map