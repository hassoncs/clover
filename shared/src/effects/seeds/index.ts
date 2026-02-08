import type { NodeTypeRegistration, ManifestRegistry } from '../registry';

export function getBuiltInSeeds(): NodeTypeRegistration[] {
  return [
    {
      type: 'noise',
      family: 'generator',
      displayName: 'Noise Generator',
      description: 'Procedural noise texture generator',
      inputSlots: [],
      outputType: 'texture',
      defaultParams: {
        scale: 1.0,
        octaves: 4,
        persistence: 0.5,
        lacunarity: 2.0,
        seed: 12345,
      },
      paramsSchema: [
        { name: 'scale', type: 'float', range: { min: 0.01, max: 100.0 }, defaultValue: 1.0 },
        { name: 'octaves', type: 'int', range: { min: 1, max: 8 }, defaultValue: 4 },
        { name: 'persistence', type: 'float', range: { min: 0.0, max: 1.0 }, defaultValue: 0.5 },
        { name: 'lacunarity', type: 'float', range: { min: 1.0, max: 4.0 }, defaultValue: 2.0 },
        { name: 'seed', type: 'int', range: { min: 0, max: 999999 }, defaultValue: 12345 },
      ],
      tags: ['generator', 'noise', 'procedural'],
      performanceTier: 'medium',
      constraints: {},
      aiHints: {
        aliases: ['perlin', 'simplex', 'noise generator'],
        promptDescription: 'Generates procedural noise patterns. Use for clouds, terrain, or organic textures.',
        commonCombinations: ['blur', 'displace'],
      },
    },
    {
      type: 'ramp',
      family: 'generator',
      displayName: 'Gradient Ramp',
      description: 'Linear or radial gradient generator',
      inputSlots: [],
      outputType: 'texture',
      defaultParams: {
        direction: 'horizontal',
        colorA: '#000000',
        colorB: '#ffffff',
      },
      paramsSchema: [
        { name: 'direction', type: 'string', defaultValue: 'horizontal' },
        { name: 'colorA', type: 'color', defaultValue: '#000000' },
        { name: 'colorB', type: 'color', defaultValue: '#ffffff' },
      ],
      tags: ['generator', 'gradient', 'ramp'],
      performanceTier: 'low',
      constraints: {},
      aiHints: {
        aliases: ['gradient', 'linear gradient', 'radial gradient'],
        promptDescription: 'Generates a smooth color transition between two colors.',
        commonCombinations: ['composite', 'displace'],
      },
    },
    {
      type: 'feedback',
      family: 'filter',
      displayName: 'Feedback Loop',
      description: 'Ping-pong feedback accumulator for trails and persistence',
      inputSlots: [{ name: 'texture', dataType: 'texture', required: true }],
      outputType: 'texture',
      defaultParams: {
        mixFactor: 0.9,
        decayRate: 0.05,
      },
      paramsSchema: [
        { name: 'mixFactor', type: 'float', range: { min: 0.0, max: 1.0 }, defaultValue: 0.9 },
        { name: 'decayRate', type: 'float', range: { min: 0.0, max: 1.0 }, defaultValue: 0.05 },
      ],
      tags: ['feedback', 'stateful', 'accumulator'],
      performanceTier: 'high',
      constraints: {
        after: ['generator'],
      },
      aiHints: {
        aliases: ['ping-pong', 'history', 'trail'],
        promptDescription: 'Accumulates previous frames to create motion trails or persistence effects.',
        commonCombinations: ['blur', 'composite'],
      },
    },
    {
      type: 'composite',
      family: 'combiner',
      displayName: 'Composite Blend',
      description: 'Multi-input blend/composite of two textures',
      inputSlots: [
        { name: 'base', dataType: 'texture', required: true },
        { name: 'overlay', dataType: 'texture', required: true },
      ],
      outputType: 'texture',
      defaultParams: {
        blendMode: 'normal',
        opacity: 1.0,
      },
      paramsSchema: [
        { name: 'blendMode', type: 'string', defaultValue: 'normal' },
        { name: 'opacity', type: 'float', range: { min: 0.0, max: 1.0 }, defaultValue: 1.0 },
      ],
      tags: ['combiner', 'blend', 'composite'],
      performanceTier: 'low',
      constraints: {},
      aiHints: {
        aliases: ['blend', 'mix', 'layer', 'overlay'],
        promptDescription: 'Blends two textures together using various blend modes like add, multiply, or screen.',
        commonCombinations: ['ramp', 'noise'],
      },
    },
    {
      type: 'displace',
      family: 'combiner',
      displayName: 'UV Displacement',
      description: 'UV displacement using a map',
      inputSlots: [
        { name: 'source', dataType: 'texture', required: true },
        { name: 'displacementMap', dataType: 'texture', required: true },
      ],
      outputType: 'texture',
      defaultParams: {
        strength: 0.1,
        channel: 'rg',
      },
      paramsSchema: [
        { name: 'strength', type: 'float', range: { min: -1.0, max: 1.0 }, defaultValue: 0.1 },
        { name: 'channel', type: 'string', defaultValue: 'rg' },
      ],
      tags: ['distortion', 'displacement', 'warp'],
      performanceTier: 'medium',
      constraints: {},
      aiHints: {
        aliases: ['distort', 'warp', 'displacement map'],
        promptDescription: 'Warps one texture using the color information of another texture as a displacement map.',
        commonCombinations: ['noise', 'blur'],
      },
    },
    {
      type: 'blur',
      family: 'filter',
      displayName: 'Gaussian Blur',
      description: 'Smooths the input texture using a Gaussian kernel',
      inputSlots: [{ name: 'texture', dataType: 'texture', required: true }],
      outputType: 'texture',
      defaultParams: {
        radius: 5.0,
        sigma: 2.0,
      },
      paramsSchema: [
        { name: 'radius', type: 'float', range: { min: 0.0, max: 20.0 }, defaultValue: 5.0 },
        { name: 'sigma', type: 'float', range: { min: 0.1, max: 10.0 }, defaultValue: 2.0 },
      ],
      tags: ['filter', 'blur', 'smooth'],
      performanceTier: 'medium',
      constraints: {},
      aiHints: {
        aliases: ['gaussian blur', 'smooth', 'soften'],
        promptDescription: 'Smooths out sharp details in a texture. Good for glows or soft backgrounds.',
        commonCombinations: ['level', 'composite'],
      },
    },
    {
      type: 'level',
      family: 'filter',
      displayName: 'Color Levels',
      description: 'Brightness, contrast, and gamma remap',
      inputSlots: [{ name: 'texture', dataType: 'texture', required: true }],
      outputType: 'texture',
      defaultParams: {
        inputBlack: 0.0,
        inputWhite: 1.0,
        gamma: 1.0,
        outputBlack: 0.0,
        outputWhite: 1.0,
      },
      paramsSchema: [
        { name: 'inputBlack', type: 'float', range: { min: 0.0, max: 1.0 }, defaultValue: 0.0 },
        { name: 'inputWhite', type: 'float', range: { min: 0.0, max: 1.0 }, defaultValue: 1.0 },
        { name: 'gamma', type: 'float', range: { min: 0.1, max: 5.0 }, defaultValue: 1.0 },
        { name: 'outputBlack', type: 'float', range: { min: 0.0, max: 1.0 }, defaultValue: 0.0 },
        { name: 'outputWhite', type: 'float', range: { min: 0.0, max: 1.0 }, defaultValue: 1.0 },
      ],
      tags: ['filter', 'color', 'levels', 'remap'],
      performanceTier: 'low',
      constraints: {},
      aiHints: {
        aliases: ['levels', 'brightness', 'contrast', 'gamma', 'remap'],
        promptDescription: 'Adjusts the color range, brightness, and contrast of a texture.',
        commonCombinations: ['blur', 'noise'],
      },
    },
  ];
}

export function registerBuiltInSeeds(registry: ManifestRegistry): void {
  const seeds = getBuiltInSeeds();
  for (const seed of seeds) {
    registry.register(seed);
  }
}
