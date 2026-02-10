import type { EffectParamSchema } from './types';
import { SHADER_LIBRARY } from './shaderLibrary';

export type ShaderCategory = 'distort' | 'color' | 'blur' | 'generator' | 'composite' | 'glow' | 'artistic' | 'utility';

export interface ShaderLibraryEntry {
  id: string;
  glsl: string;
  paramsSchema: EffectParamSchema[];
  aiHints: {
    description: string;
    aliases: string[];
    category: ShaderCategory;
    combinability: string[];
  };
  previewThumbnail?: string;
}

export const SHADER_REGISTRY: Record<string, ShaderLibraryEntry> = {

  // =========================================================================
  // SPRITE SHADERS
  // =========================================================================

  silhouette: {
    id: 'silhouette',
    glsl: SHADER_LIBRARY.silhouette,
    paramsSchema: [
      {
        key: 'silhouette_color', uniformName: 'silhouette_color', type: 'color',
        defaultValue: [0.0, 0.0, 0.0, 0.5],
        ui: { displayName: 'Silhouette Color' },
      },
      {
        key: 'alpha_threshold', uniformName: 'alpha_threshold', type: 'float',
        defaultValue: 0.1,
        ui: { displayName: 'Alpha Threshold', min: 0.0, max: 1.0, step: 0.05 },
      },
    ],
    aiHints: {
      description: 'Replaces visible pixels with a solid color, creating a flat silhouette of the sprite',
      aliases: ['shadow shape', 'flat color', 'silhouette', 'solid fill'],
      category: 'color',
      combinability: ['outline', 'dropShadow', 'glow'],
    },
  },

  tint: {
    id: 'tint',
    glsl: SHADER_LIBRARY.tint,
    paramsSchema: [
      {
        key: 'tint_color', uniformName: 'tint_color', type: 'color',
        defaultValue: [1.0, 1.0, 1.0, 1.0],
        ui: { displayName: 'Tint Color' },
      },
      {
        key: 'tint_amount', uniformName: 'tint_amount', type: 'float',
        defaultValue: 0.5,
        ui: { displayName: 'Tint Amount', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'blend_mode', uniformName: 'blend_mode', type: 'int',
        defaultValue: 0,
        ui: { displayName: 'Blend Mode', min: 0, max: 4, step: 1, options: ['multiply', 'add', 'screen', 'overlay', 'replace'] },
      },
    ],
    aiHints: {
      description: 'Applies a color tint to the sprite with multiple blend modes (multiply, add, screen, overlay, replace)',
      aliases: ['color shift', 'hue shift', 'recolor', 'color overlay'],
      category: 'color',
      combinability: ['glow', 'outline', 'dissolve', 'silhouette'],
    },
  },

  waveDistortion: {
    id: 'waveDistortion',
    glsl: SHADER_LIBRARY.waveDistortion,
    paramsSchema: [
      {
        key: 'amplitude_x', uniformName: 'amplitude_x', type: 'float',
        defaultValue: 0.02,
        ui: { displayName: 'Amplitude X', min: 0.0, max: 0.2, step: 0.005 },
      },
      {
        key: 'amplitude_y', uniformName: 'amplitude_y', type: 'float',
        defaultValue: 0.02,
        ui: { displayName: 'Amplitude Y', min: 0.0, max: 0.2, step: 0.005 },
      },
      {
        key: 'frequency_x', uniformName: 'frequency_x', type: 'float',
        defaultValue: 10.0,
        ui: { displayName: 'Frequency X', min: 0.0, max: 50.0, step: 1.0 },
      },
      {
        key: 'frequency_y', uniformName: 'frequency_y', type: 'float',
        defaultValue: 10.0,
        ui: { displayName: 'Frequency Y', min: 0.0, max: 50.0, step: 1.0 },
      },
      {
        key: 'speed', uniformName: 'speed', type: 'float',
        defaultValue: 2.0,
        ui: { displayName: 'Speed', min: 0.0, max: 10.0, step: 0.5 },
      },
    ],
    aiHints: {
      description: 'Sine wave UV distortion that warps the sprite with animated ripples',
      aliases: ['wave', 'wobble', 'wiggle', 'wavy', 'undulate'],
      category: 'distort',
      combinability: ['tint', 'glow', 'outline', 'dissolve'],
    },
  },

  rimLight: {
    id: 'rimLight',
    glsl: SHADER_LIBRARY.rimLight,
    paramsSchema: [
      {
        key: 'rim_color', uniformName: 'rim_color', type: 'color',
        defaultValue: [1.0, 1.0, 1.0, 1.0],
        ui: { displayName: 'Rim Color' },
      },
      {
        key: 'rim_width', uniformName: 'rim_width', type: 'float',
        defaultValue: 3.0,
        ui: { displayName: 'Rim Width', min: 0.0, max: 20.0, step: 0.5 },
      },
      {
        key: 'rim_intensity', uniformName: 'rim_intensity', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Rim Intensity', min: 0.0, max: 3.0, step: 0.1 },
      },
      {
        key: 'light_direction', uniformName: 'light_direction', type: 'vec2',
        defaultValue: [1.0, -1.0],
        ui: { displayName: 'Light Direction' },
      },
      {
        key: 'additive_blend', uniformName: 'additive_blend', type: 'bool',
        defaultValue: true,
        ui: { displayName: 'Additive Blend' },
      },
      {
        key: 'inner_fade', uniformName: 'inner_fade', type: 'float',
        defaultValue: 0.5,
        ui: { displayName: 'Inner Fade', min: 0.0, max: 1.0, step: 0.1 },
      },
    ],
    aiHints: {
      description: 'Directional edge lighting that simulates a light source hitting the rim of the sprite',
      aliases: ['edge light', 'back light', 'contour light', 'rim glow'],
      category: 'glow',
      combinability: ['tint', 'glow', 'innerGlow', 'outline'],
    },
  },

  rainbow: {
    id: 'rainbow',
    glsl: SHADER_LIBRARY.rainbow,
    paramsSchema: [
      {
        key: 'speed', uniformName: 'speed', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Speed', min: 0.0, max: 5.0, step: 0.1 },
      },
      {
        key: 'saturation_boost', uniformName: 'saturation_boost', type: 'float',
        defaultValue: 0.5,
        ui: { displayName: 'Saturation Boost', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'use_uv_offset', uniformName: 'use_uv_offset', type: 'bool',
        defaultValue: false,
        ui: { displayName: 'UV-Based Offset' },
      },
      {
        key: 'uv_scale', uniformName: 'uv_scale', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'UV Scale', min: 0.0, max: 5.0, step: 0.1 },
      },
    ],
    aiHints: {
      description: 'Animated rainbow hue-cycling effect that shifts all colors through the spectrum over time',
      aliases: ['rainbow cycle', 'hue rotate', 'color cycle', 'spectrum', 'iridescent'],
      category: 'color',
      combinability: ['glow', 'outline', 'pixelate', 'holographic'],
    },
  },

  pixelate: {
    id: 'pixelate',
    glsl: SHADER_LIBRARY.pixelate,
    paramsSchema: [
      {
        key: 'pixel_size', uniformName: 'pixel_size', type: 'float',
        defaultValue: 8.0,
        ui: { displayName: 'Pixel Size', min: 2.0, max: 64.0, step: 1.0 },
      },
    ],
    aiHints: {
      description: 'Reduces the sprite resolution into chunky retro-style pixels',
      aliases: ['retro', 'low-res', 'mosaic', '8-bit', 'blockify'],
      category: 'artistic',
      combinability: ['posterize', 'outline', 'tint', 'scanlines'],
    },
  },

  posterize: {
    id: 'posterize',
    glsl: SHADER_LIBRARY.posterize,
    paramsSchema: [
      {
        key: 'color_levels', uniformName: 'color_levels', type: 'float',
        defaultValue: 4.0,
        ui: { displayName: 'Color Levels', min: 2.0, max: 32.0, step: 1.0 },
      },
    ],
    aiHints: {
      description: 'Reduces the number of distinct color levels for a flat poster-art look',
      aliases: ['color quantize', 'flat color', 'poster art', 'band colors'],
      category: 'color',
      combinability: ['pixelate', 'outline', 'tint', 'halftone'],
    },
  },

  outline: {
    id: 'outline',
    glsl: SHADER_LIBRARY.outline,
    paramsSchema: [
      {
        key: 'outline_color', uniformName: 'outline_color', type: 'color',
        defaultValue: [1.0, 1.0, 0.0, 1.0],
        ui: { displayName: 'Outline Color' },
      },
      {
        key: 'outline_width', uniformName: 'outline_width', type: 'float',
        defaultValue: 2.0,
        ui: { displayName: 'Outline Width', min: 0.0, max: 10.0, step: 0.5 },
      },
      {
        key: 'outline_only', uniformName: 'outline_only', type: 'bool',
        defaultValue: false,
        ui: { displayName: 'Outline Only' },
      },
    ],
    aiHints: {
      description: 'Draws a colored border around the sprite by detecting inner edges via alpha sampling',
      aliases: ['border', 'stroke', 'edge', 'highlight border'],
      category: 'artistic',
      combinability: ['glow', 'tint', 'silhouette', 'dropShadow'],
    },
  },

  innerGlow: {
    id: 'innerGlow',
    glsl: SHADER_LIBRARY.innerGlow,
    paramsSchema: [
      {
        key: 'glow_color', uniformName: 'glow_color', type: 'color',
        defaultValue: [1.0, 0.5, 0.0, 1.0],
        ui: { displayName: 'Glow Color' },
      },
      {
        key: 'glow_width', uniformName: 'glow_width', type: 'float',
        defaultValue: 5.0,
        ui: { displayName: 'Glow Width', min: 0.0, max: 20.0, step: 0.5 },
      },
      {
        key: 'glow_intensity', uniformName: 'glow_intensity', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Glow Intensity', min: 0.0, max: 3.0, step: 0.1 },
      },
      {
        key: 'glow_falloff', uniformName: 'glow_falloff', type: 'float',
        defaultValue: 2.0,
        ui: { displayName: 'Glow Falloff', min: 0.5, max: 5.0, step: 0.1 },
      },
      {
        key: 'additive', uniformName: 'additive', type: 'bool',
        defaultValue: true,
        ui: { displayName: 'Additive Blend' },
      },
    ],
    aiHints: {
      description: 'Emits a glow inward from the sprite edges, giving an inner-fire or energy effect',
      aliases: ['inner fire', 'edge glow inward', 'internal glow', 'inner radiance'],
      category: 'glow',
      combinability: ['rimLight', 'glow', 'tint', 'outline'],
    },
  },

  holographic: {
    id: 'holographic',
    glsl: SHADER_LIBRARY.holographic,
    paramsSchema: [
      {
        key: 'speed', uniformName: 'speed', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Speed', min: 0.0, max: 5.0, step: 0.1 },
      },
      {
        key: 'scan_line_count', uniformName: 'scan_line_count', type: 'float',
        defaultValue: 50.0,
        ui: { displayName: 'Scan Line Count', min: 10.0, max: 200.0, step: 5.0 },
      },
      {
        key: 'scan_line_intensity', uniformName: 'scan_line_intensity', type: 'float',
        defaultValue: 0.3,
        ui: { displayName: 'Scan Line Intensity', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'chromatic_offset', uniformName: 'chromatic_offset', type: 'float',
        defaultValue: 0.005,
        ui: { displayName: 'Chromatic Offset', min: 0.0, max: 0.02, step: 0.001 },
      },
      {
        key: 'flicker_intensity', uniformName: 'flicker_intensity', type: 'float',
        defaultValue: 0.1,
        ui: { displayName: 'Flicker Intensity', min: 0.0, max: 0.5, step: 0.01 },
      },
      {
        key: 'glitch_intensity', uniformName: 'glitch_intensity', type: 'float',
        defaultValue: 0.02,
        ui: { displayName: 'Glitch Intensity', min: 0.0, max: 0.1, step: 0.005 },
      },
      {
        key: 'hologram_tint', uniformName: 'hologram_tint', type: 'color',
        defaultValue: [0.3, 0.8, 1.0, 1.0],
        ui: { displayName: 'Hologram Tint' },
      },
      {
        key: 'alpha_boost', uniformName: 'alpha_boost', type: 'float',
        defaultValue: 0.0,
        ui: { displayName: 'Alpha Boost', min: 0.0, max: 1.0, step: 0.05 },
      },
    ],
    aiHints: {
      description: 'Sci-fi holographic display effect with scanlines, chromatic aberration, glitch, and cyan tint',
      aliases: ['hologram', 'sci-fi', 'futuristic', 'cyber projection', 'digital ghost'],
      category: 'artistic',
      combinability: ['glitch', 'scanlines', 'chromaticAberration', 'glow'],
    },
  },

  glow: {
    id: 'glow',
    glsl: SHADER_LIBRARY.glow,
    paramsSchema: [
      {
        key: 'glow_color', uniformName: 'glow_color', type: 'color',
        defaultValue: [1.0, 0.8, 0.2, 1.0],
        ui: { displayName: 'Glow Color' },
      },
      {
        key: 'glow_intensity', uniformName: 'glow_intensity', type: 'float',
        defaultValue: 1.5,
        ui: { displayName: 'Glow Intensity', min: 0.0, max: 5.0, step: 0.1 },
      },
      {
        key: 'glow_size', uniformName: 'glow_size', type: 'float',
        defaultValue: 4.0,
        ui: { displayName: 'Glow Size', min: 1.0, max: 20.0, step: 0.5 },
      },
      {
        key: 'pulse_speed', uniformName: 'pulse_speed', type: 'float',
        defaultValue: 0.0,
        ui: { displayName: 'Pulse Speed', min: 0.0, max: 10.0, step: 0.5 },
      },
    ],
    aiHints: {
      description: 'Adds a soft luminous outer glow around the sprite edges, with optional pulsing animation',
      aliases: ['outer glow', 'aura', 'halo', 'luminance', 'neon glow'],
      category: 'glow',
      combinability: ['outline', 'tint', 'bloom', 'rimLight', 'innerGlow'],
    },
  },

  dropShadow: {
    id: 'dropShadow',
    glsl: SHADER_LIBRARY.dropShadow,
    paramsSchema: [
      {
        key: 'shadow_color', uniformName: 'shadow_color', type: 'color',
        defaultValue: [0.0, 0.0, 0.0, 0.5],
        ui: { displayName: 'Shadow Color' },
      },
      {
        key: 'shadow_offset', uniformName: 'shadow_offset', type: 'vec2',
        defaultValue: [4.0, 4.0],
        ui: { displayName: 'Shadow Offset' },
      },
      {
        key: 'shadow_blur', uniformName: 'shadow_blur', type: 'float',
        defaultValue: 2.0,
        ui: { displayName: 'Shadow Blur', min: 0.0, max: 10.0, step: 0.5 },
      },
      {
        key: 'shadow_only', uniformName: 'shadow_only', type: 'bool',
        defaultValue: false,
        ui: { displayName: 'Shadow Only' },
      },
    ],
    aiHints: {
      description: 'Renders a blurred offset shadow behind the sprite for a floating depth effect',
      aliases: ['shadow', 'cast shadow', 'depth shadow', 'floating shadow'],
      category: 'composite',
      combinability: ['outline', 'glow', 'tint', 'silhouette'],
    },
  },

  flash: {
    id: 'flash',
    glsl: SHADER_LIBRARY.flash,
    paramsSchema: [
      {
        key: 'flash_color', uniformName: 'flash_color', type: 'color',
        defaultValue: [1.0, 1.0, 1.0, 1.0],
        ui: { displayName: 'Flash Color' },
      },
      {
        key: 'flash_amount', uniformName: 'flash_amount', type: 'float',
        defaultValue: 0.5,
        ui: { displayName: 'Flash Amount', min: 0.0, max: 1.0, step: 0.05 },
      },
    ],
    aiHints: {
      description: 'Flashes the sprite toward a solid color, commonly used for hit/damage feedback',
      aliases: ['hit flash', 'damage flash', 'white flash', 'blink'],
      category: 'color',
      combinability: ['tint', 'glow', 'outline'],
    },
  },

  dissolve: {
    id: 'dissolve',
    glsl: SHADER_LIBRARY.dissolve,
    paramsSchema: [
      {
        key: 'dissolve_amount', uniformName: 'dissolve_amount', type: 'float',
        defaultValue: 0.0,
        ui: { displayName: 'Dissolve Amount', min: 0.0, max: 1.0, step: 0.01 },
      },
      {
        key: 'edge_width', uniformName: 'edge_width', type: 'float',
        defaultValue: 0.1,
        ui: { displayName: 'Edge Width', min: 0.0, max: 0.3, step: 0.01 },
      },
      {
        key: 'edge_color', uniformName: 'edge_color', type: 'color',
        defaultValue: [1.0, 0.5, 0.0, 1.0],
        ui: { displayName: 'Edge Color' },
      },
      {
        key: 'edge_color_2', uniformName: 'edge_color_2', type: 'color',
        defaultValue: [1.0, 1.0, 0.0, 1.0],
        ui: { displayName: 'Edge Color 2' },
      },
      {
        key: 'noise_scale', uniformName: 'noise_scale', type: 'float',
        defaultValue: 10.0,
        ui: { displayName: 'Noise Scale', min: 1.0, max: 50.0, step: 1.0 },
      },
      {
        key: 'use_gradient_edge', uniformName: 'use_gradient_edge', type: 'bool',
        defaultValue: true,
        ui: { displayName: 'Gradient Edge' },
      },
    ],
    aiHints: {
      description: 'Noise-based dissolve transition that eats away the sprite with a colored burning edge',
      aliases: ['burn away', 'disintegrate', 'fade noise', 'erode', 'crumble'],
      category: 'distort',
      combinability: ['glow', 'tint', 'flash'],
    },
  },

  colorMatrix: {
    id: 'colorMatrix',
    glsl: SHADER_LIBRARY.colorMatrix,
    paramsSchema: [
      {
        key: 'row_red', uniformName: 'row_red', type: 'vec4',
        defaultValue: [1.0, 0.0, 0.0, 0.0],
        ui: { displayName: 'Red Row' },
      },
      {
        key: 'row_green', uniformName: 'row_green', type: 'vec4',
        defaultValue: [0.0, 1.0, 0.0, 0.0],
        ui: { displayName: 'Green Row' },
      },
      {
        key: 'row_blue', uniformName: 'row_blue', type: 'vec4',
        defaultValue: [0.0, 0.0, 1.0, 0.0],
        ui: { displayName: 'Blue Row' },
      },
      {
        key: 'preset', uniformName: 'preset', type: 'int',
        defaultValue: 0,
        ui: { displayName: 'Preset', min: 0, max: 7, step: 1, options: ['custom', 'grayscale', 'sepia', 'invert', 'deuteranopia', 'protanopia', 'tritanopia', 'high contrast'] },
      },
    ],
    aiHints: {
      description: 'Applies a 3x4 color transformation matrix with presets for grayscale, sepia, invert, and color-blind simulations',
      aliases: ['color transform', 'grayscale', 'sepia', 'invert colors', 'color blind'],
      category: 'color',
      combinability: ['tint', 'posterize', 'vignette', 'bloom'],
    },
  },

  // =========================================================================
  // POST-PROCESS SHADERS
  // =========================================================================

  underwater: {
    id: 'underwater',
    glsl: SHADER_LIBRARY.underwater,
    paramsSchema: [
      {
        key: 'intensity', uniformName: 'intensity', type: 'float',
        defaultValue: 0.5,
        ui: { displayName: 'Intensity', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'wave_speed', uniformName: 'wave_speed', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Wave Speed', min: 0.1, max: 5.0, step: 0.1 },
      },
      {
        key: 'wave_frequency', uniformName: 'wave_frequency', type: 'float',
        defaultValue: 10.0,
        ui: { displayName: 'Wave Frequency', min: 1.0, max: 20.0, step: 1.0 },
      },
      {
        key: 'wave_amplitude', uniformName: 'wave_amplitude', type: 'float',
        defaultValue: 0.01,
        ui: { displayName: 'Wave Amplitude', min: 0.001, max: 0.05, step: 0.001 },
      },
      {
        key: 'water_tint', uniformName: 'water_tint', type: 'color',
        defaultValue: [0.0, 0.4, 0.8, 0.3],
        ui: { displayName: 'Water Tint' },
      },
    ],
    aiHints: {
      description: 'Simulates being underwater with wavy UV distortion, blue tint, and animated caustic light patterns',
      aliases: ['water', 'ocean', 'submerged', 'aquatic', 'sea'],
      category: 'distort',
      combinability: ['blur', 'vignette', 'colorGrading', 'bloom'],
    },
  },

  vignette: {
    id: 'vignette',
    glsl: SHADER_LIBRARY.vignette,
    paramsSchema: [
      {
        key: 'vignette_intensity', uniformName: 'vignette_intensity', type: 'float',
        defaultValue: 0.4,
        ui: { displayName: 'Intensity', min: 0.0, max: 2.0, step: 0.1 },
      },
      {
        key: 'vignette_opacity', uniformName: 'vignette_opacity', type: 'float',
        defaultValue: 0.5,
        ui: { displayName: 'Opacity', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'vignette_color', uniformName: 'vignette_color', type: 'color',
        defaultValue: [0.0, 0.0, 0.0, 1.0],
        ui: { displayName: 'Vignette Color' },
      },
      {
        key: 'vignette_roundness', uniformName: 'vignette_roundness', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Roundness', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'vignette_center', uniformName: 'vignette_center', type: 'vec2',
        defaultValue: [0.5, 0.5],
        ui: { displayName: 'Center' },
      },
    ],
    aiHints: {
      description: 'Darkens the screen edges toward a color, creating a cinematic or focused look',
      aliases: ['edge darken', 'corner shadow', 'cinematic frame', 'focus border'],
      category: 'composite',
      combinability: ['bloom', 'colorGrading', 'scanlines', 'crt', 'blur'],
    },
  },

  thermalVision: {
    id: 'thermalVision',
    glsl: SHADER_LIBRARY.thermalVision,
    paramsSchema: [
      {
        key: 'intensity', uniformName: 'intensity', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Intensity', min: 0.0, max: 1.0, step: 0.05 },
      },
    ],
    aiHints: {
      description: 'Maps screen luminance to a thermal heat-map gradient from deep blue (cold) to white (hot)',
      aliases: ['heat vision', 'infrared', 'heat map', 'thermal camera', 'FLIR'],
      category: 'color',
      combinability: ['vignette', 'scanlines', 'blur', 'nightVision'],
    },
  },

  speedLines: {
    id: 'speedLines',
    glsl: SHADER_LIBRARY.speedLines,
    paramsSchema: [
      {
        key: 'intensity', uniformName: 'intensity', type: 'float',
        defaultValue: 0.5,
        ui: { displayName: 'Intensity', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'density', uniformName: 'density', type: 'float',
        defaultValue: 0.2,
        ui: { displayName: 'Density', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'speed', uniformName: 'speed', type: 'float',
        defaultValue: 2.0,
        ui: { displayName: 'Speed', min: 0.1, max: 10.0, step: 0.5 },
      },
      {
        key: 'center', uniformName: 'center', type: 'vec2',
        defaultValue: [0.5, 0.5],
        ui: { displayName: 'Center' },
      },
    ],
    aiHints: {
      description: 'Anime-style radial speed lines emanating from a center point to convey motion or impact',
      aliases: ['zoom lines', 'action lines', 'manga lines', 'impact lines', 'anime speed'],
      category: 'generator',
      combinability: ['vignette', 'chromaticAberration', 'motionBlur', 'shockwave'],
    },
  },

  shockwave: {
    id: 'shockwave',
    glsl: SHADER_LIBRARY.shockwave,
    paramsSchema: [
      {
        key: 'center', uniformName: 'center', type: 'vec2',
        defaultValue: [0.5, 0.5],
        ui: { displayName: 'Center' },
      },
      {
        key: 'radius', uniformName: 'radius', type: 'float',
        defaultValue: 0.0,
        ui: { displayName: 'Radius', min: 0.0, max: 2.0, step: 0.01 },
      },
      {
        key: 'thickness', uniformName: 'thickness', type: 'float',
        defaultValue: 0.1,
        ui: { displayName: 'Thickness', min: 0.0, max: 0.5, step: 0.01 },
      },
      {
        key: 'amplitude', uniformName: 'amplitude', type: 'float',
        defaultValue: 0.03,
        ui: { displayName: 'Amplitude', min: 0.0, max: 0.1, step: 0.005 },
      },
      {
        key: 'distortion_type', uniformName: 'distortion_type', type: 'float',
        defaultValue: 0,
        ui: { displayName: 'Distortion Type', min: 0, max: 2, step: 1, options: ['outward', 'inward', 'wave'] },
      },
    ],
    aiHints: {
      description: 'Expanding ring distortion emanating from a center point, like a ripple from an explosion',
      aliases: ['explosion ring', 'ripple wave', 'impact wave', 'blast wave', 'pulse ring'],
      category: 'distort',
      combinability: ['chromaticAberration', 'bloom', 'speedLines', 'vignette'],
    },
  },

  shimmer: {
    id: 'shimmer',
    glsl: SHADER_LIBRARY.shimmer,
    paramsSchema: [
      {
        key: 'amplitude', uniformName: 'amplitude', type: 'float',
        defaultValue: 0.005,
        ui: { displayName: 'Amplitude', min: 0.0, max: 0.03, step: 0.001 },
      },
      {
        key: 'frequency_x', uniformName: 'frequency_x', type: 'float',
        defaultValue: 30.0,
        ui: { displayName: 'Frequency X', min: 0.0, max: 100.0, step: 5.0 },
      },
      {
        key: 'frequency_y', uniformName: 'frequency_y', type: 'float',
        defaultValue: 20.0,
        ui: { displayName: 'Frequency Y', min: 0.0, max: 100.0, step: 5.0 },
      },
      {
        key: 'speed', uniformName: 'speed', type: 'float',
        defaultValue: 2.0,
        ui: { displayName: 'Speed', min: 0.0, max: 10.0, step: 0.5 },
      },
      {
        key: 'vertical_only', uniformName: 'vertical_only', type: 'bool',
        defaultValue: false,
        ui: { displayName: 'Vertical Only' },
      },
      {
        key: 'heat_rise', uniformName: 'heat_rise', type: 'float',
        defaultValue: 0.0,
        ui: { displayName: 'Heat Rise', min: 0.0, max: 0.01, step: 0.001 },
      },
    ],
    aiHints: {
      description: 'Subtle screen-space UV distortion creating a heat shimmer or mirage effect',
      aliases: ['heat haze', 'mirage', 'heat distortion', 'air shimmer', 'heat wave'],
      category: 'distort',
      combinability: ['blur', 'underwater', 'vignette', 'colorGrading'],
    },
  },

  ripple: {
    id: 'ripple',
    glsl: SHADER_LIBRARY.ripple,
    paramsSchema: [
      {
        key: 'intensity', uniformName: 'intensity', type: 'float',
        defaultValue: 0.02,
        ui: { displayName: 'Intensity', min: 0.0, max: 0.1, step: 0.005 },
      },
      {
        key: 'speed', uniformName: 'speed', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Speed', min: 0.0, max: 5.0, step: 0.1 },
      },
      {
        key: 'use_noise_fallback', uniformName: 'use_noise_fallback', type: 'bool',
        defaultValue: true,
        ui: { displayName: 'Use Noise Fallback' },
      },
    ],
    aiHints: {
      description: 'Data-driven or procedural ripple distortion, ideal for water surfaces or entity-triggered displacement',
      aliases: ['water ripple', 'pond ripple', 'surface distortion', 'wave field'],
      category: 'distort',
      combinability: ['underwater', 'blur', 'shimmer', 'vignette'],
    },
  },

  scanlines: {
    id: 'scanlines',
    glsl: SHADER_LIBRARY.scanlines,
    paramsSchema: [
      {
        key: 'scanline_count', uniformName: 'scanline_count', type: 'float',
        defaultValue: 200.0,
        ui: { displayName: 'Scanline Count', min: 50.0, max: 500.0, step: 10.0 },
      },
      {
        key: 'scanline_opacity', uniformName: 'scanline_opacity', type: 'float',
        defaultValue: 0.3,
        ui: { displayName: 'Opacity', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'scanline_speed', uniformName: 'scanline_speed', type: 'float',
        defaultValue: 0.0,
        ui: { displayName: 'Scroll Speed', min: 0.0, max: 5.0, step: 0.1 },
      },
      {
        key: 'scanline_pattern', uniformName: 'scanline_pattern', type: 'int',
        defaultValue: 0,
        ui: { displayName: 'Pattern', min: 0, max: 2, step: 1, options: ['horizontal', 'vertical', 'grid'] },
      },
      {
        key: 'brightness', uniformName: 'brightness', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Brightness', min: 0.5, max: 1.5, step: 0.05 },
      },
      {
        key: 'flicker', uniformName: 'flicker', type: 'float',
        defaultValue: 0.0,
        ui: { displayName: 'Flicker', min: 0.0, max: 0.1, step: 0.01 },
      },
    ],
    aiHints: {
      description: 'Overlays CRT-style scan lines (horizontal, vertical, or grid) with optional scrolling and flicker',
      aliases: ['CRT lines', 'retro lines', 'TV lines', 'monitor lines', 'interlace'],
      category: 'artistic',
      combinability: ['crt', 'vignette', 'glitch', 'chromaticAberration', 'bloom'],
    },
  },

  oldFilm: {
    id: 'oldFilm',
    glsl: SHADER_LIBRARY.oldFilm,
    paramsSchema: [
      {
        key: 'sepia_strength', uniformName: 'sepia_strength', type: 'float',
        defaultValue: 0.8,
        ui: { displayName: 'Sepia Strength', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'scratch_strength', uniformName: 'scratch_strength', type: 'float',
        defaultValue: 0.3,
        ui: { displayName: 'Scratch Strength', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'noise_strength', uniformName: 'noise_strength', type: 'float',
        defaultValue: 0.2,
        ui: { displayName: 'Noise Strength', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'vignette_size', uniformName: 'vignette_size', type: 'float',
        defaultValue: 0.4,
        ui: { displayName: 'Vignette Size', min: 0.0, max: 1.0, step: 0.05 },
      },
    ],
    aiHints: {
      description: 'Vintage movie filter with sepia tone, film grain, vertical scratches, flicker, and vignette',
      aliases: ['vintage film', 'retro movie', 'film grain', 'old movie', 'classic film'],
      category: 'artistic',
      combinability: ['vignette', 'scanlines', 'blur', 'colorGrading'],
    },
  },

  pixelateScreen: {
    id: 'pixelateScreen',
    glsl: SHADER_LIBRARY.pixelateScreen,
    paramsSchema: [
      {
        key: 'pixel_size', uniformName: 'pixel_size', type: 'float',
        defaultValue: 4.0,
        ui: { displayName: 'Pixel Size', min: 1.0, max: 32.0, step: 1.0 },
      },
      {
        key: 'color_reduction', uniformName: 'color_reduction', type: 'bool',
        defaultValue: false,
        ui: { displayName: 'Color Reduction' },
      },
      {
        key: 'color_levels', uniformName: 'color_levels', type: 'float',
        defaultValue: 8.0,
        ui: { displayName: 'Color Levels', min: 2.0, max: 32.0, step: 1.0 },
      },
      {
        key: 'dithering', uniformName: 'dithering', type: 'bool',
        defaultValue: false,
        ui: { displayName: 'Dithering' },
      },
    ],
    aiHints: {
      description: 'Full-screen pixelation with optional color palette reduction and Bayer dithering for retro game looks',
      aliases: ['screen pixelate', 'retro screen', 'low resolution', 'chunky pixels', 'gameboy'],
      category: 'artistic',
      combinability: ['scanlines', 'posterize', 'crt', 'colorGrading'],
    },
  },

  motionBlur: {
    id: 'motionBlur',
    glsl: SHADER_LIBRARY.motionBlur,
    paramsSchema: [
      {
        key: 'velocity', uniformName: 'velocity', type: 'vec2',
        defaultValue: [0.0, 0.0],
        ui: { displayName: 'Velocity Direction' },
      },
      {
        key: 'strength', uniformName: 'strength', type: 'float',
        defaultValue: 0.5,
        ui: { displayName: 'Strength', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'radial_center', uniformName: 'radial_center', type: 'vec2',
        defaultValue: [0.5, 0.5],
        ui: { displayName: 'Radial Center' },
      },
      {
        key: 'use_radial', uniformName: 'use_radial', type: 'bool',
        defaultValue: false,
        ui: { displayName: 'Radial Mode' },
      },
    ],
    aiHints: {
      description: 'Directional or radial motion blur that smears the image along a velocity vector for speed effects',
      aliases: ['speed blur', 'directional blur', 'zoom blur', 'velocity blur'],
      category: 'blur',
      combinability: ['speedLines', 'chromaticAberration', 'vignette', 'bloom'],
    },
  },

  nightVision: {
    id: 'nightVision',
    glsl: SHADER_LIBRARY.nightVision,
    paramsSchema: [
      {
        key: 'intensity', uniformName: 'intensity', type: 'float',
        defaultValue: 0.5,
        ui: { displayName: 'Intensity', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'noise_strength', uniformName: 'noise_strength', type: 'float',
        defaultValue: 0.3,
        ui: { displayName: 'Noise Strength', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'scanline_strength', uniformName: 'scanline_strength', type: 'float',
        defaultValue: 0.1,
        ui: { displayName: 'Scanline Strength', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'vignette_size', uniformName: 'vignette_size', type: 'float',
        defaultValue: 0.4,
        ui: { displayName: 'Vignette Size', min: 0.0, max: 1.0, step: 0.05 },
      },
    ],
    aiHints: {
      description: 'Military-style green phosphor night vision with light amplification, scanlines, grain noise, and vignette',
      aliases: ['NVG', 'green vision', 'tactical vision', 'military vision', 'starlight scope'],
      category: 'color',
      combinability: ['scanlines', 'vignette', 'thermalVision', 'blur'],
    },
  },

  fogOfWar: {
    id: 'fogOfWar',
    glsl: SHADER_LIBRARY.fogOfWar,
    paramsSchema: [
      {
        key: 'fog_color', uniformName: 'fog_color', type: 'color',
        defaultValue: [0.0, 0.0, 0.0, 0.5],
        ui: { displayName: 'Fog Color' },
      },
      {
        key: 'unexplored_color', uniformName: 'unexplored_color', type: 'color',
        defaultValue: [0.0, 0.0, 0.0, 1.0],
        ui: { displayName: 'Unexplored Color' },
      },
      {
        key: 'smoothness', uniformName: 'smoothness', type: 'float',
        defaultValue: 0.05,
        ui: { displayName: 'Edge Smoothness', min: 0.0, max: 0.2, step: 0.01 },
      },
    ],
    aiHints: {
      description: 'Mask-driven fog system that hides unexplored areas and dims previously-seen but not currently-visible areas',
      aliases: ['fog', 'war fog', 'exploration mask', 'visibility mask', 'shroud'],
      category: 'composite',
      combinability: ['vignette', 'colorGrading', 'blur'],
    },
  },

  crt: {
    id: 'crt',
    glsl: SHADER_LIBRARY.crt,
    paramsSchema: [
      {
        key: 'scanline_opacity', uniformName: 'scanline_opacity', type: 'float',
        defaultValue: 0.4,
        ui: { displayName: 'Scanline Opacity', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'scanline_width', uniformName: 'scanline_width', type: 'float',
        defaultValue: 0.25,
        ui: { displayName: 'Scanline Width', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'curvature', uniformName: 'curvature', type: 'float',
        defaultValue: 0.1,
        ui: { displayName: 'Curvature', min: 0.0, max: 0.5, step: 0.01 },
      },
      {
        key: 'rgb_offset', uniformName: 'rgb_offset', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'RGB Offset', min: 0.0, max: 5.0, step: 0.1 },
      },
      {
        key: 'vignette_strength', uniformName: 'vignette_strength', type: 'float',
        defaultValue: 0.3,
        ui: { displayName: 'Vignette Strength', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'brightness', uniformName: 'brightness', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Brightness', min: 0.5, max: 1.5, step: 0.05 },
      },
      {
        key: 'contrast', uniformName: 'contrast', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Contrast', min: 0.5, max: 1.5, step: 0.05 },
      },
      {
        key: 'flicker', uniformName: 'flicker', type: 'float',
        defaultValue: 0.02,
        ui: { displayName: 'Flicker', min: 0.0, max: 0.1, step: 0.005 },
      },
    ],
    aiHints: {
      description: 'Full CRT monitor simulation with barrel curvature, RGB shadow mask, scanlines, vignette, and flicker',
      aliases: ['CRT monitor', 'retro TV', 'old screen', 'tube monitor', 'arcade screen'],
      category: 'artistic',
      combinability: ['scanlines', 'glitch', 'pixelateScreen', 'bloom'],
    },
  },

  halftone: {
    id: 'halftone',
    glsl: SHADER_LIBRARY.halftone,
    paramsSchema: [
      {
        key: 'dot_size', uniformName: 'dot_size', type: 'float',
        defaultValue: 8.0,
        ui: { displayName: 'Dot Size', min: 1.0, max: 50.0, step: 1.0 },
      },
      {
        key: 'contrast', uniformName: 'contrast', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Contrast', min: 1.0, max: 5.0, step: 0.1 },
      },
      {
        key: 'intensity', uniformName: 'intensity', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Intensity', min: 0.0, max: 1.0, step: 0.05 },
      },
    ],
    aiHints: {
      description: 'CMYK halftone dot pattern that simulates newspaper or comic book printing with rotated dot screens',
      aliases: ['newspaper print', 'comic dots', 'ben-day dots', 'print dots', 'dot screen'],
      category: 'artistic',
      combinability: ['posterize', 'oldFilm', 'vignette', 'colorGrading'],
    },
  },

  glitch: {
    id: 'glitch',
    glsl: SHADER_LIBRARY.glitch,
    paramsSchema: [
      {
        key: 'glitch_intensity', uniformName: 'glitch_intensity', type: 'float',
        defaultValue: 0.1,
        ui: { displayName: 'Glitch Intensity', min: 0.0, max: 1.0, step: 0.01 },
      },
      {
        key: 'glitch_speed', uniformName: 'glitch_speed', type: 'float',
        defaultValue: 10.0,
        ui: { displayName: 'Glitch Speed', min: 1.0, max: 60.0, step: 1.0 },
      },
      {
        key: 'block_size', uniformName: 'block_size', type: 'float',
        defaultValue: 20.0,
        ui: { displayName: 'Block Size', min: 5.0, max: 100.0, step: 1.0 },
      },
      {
        key: 'color_drift', uniformName: 'color_drift', type: 'float',
        defaultValue: 0.01,
        ui: { displayName: 'Color Drift', min: 0.0, max: 0.05, step: 0.001 },
      },
      {
        key: 'enable_scanline_shift', uniformName: 'enable_scanline_shift', type: 'bool',
        defaultValue: true,
        ui: { displayName: 'Scanline Shift' },
      },
      {
        key: 'enable_color_separation', uniformName: 'enable_color_separation', type: 'bool',
        defaultValue: true,
        ui: { displayName: 'Color Separation' },
      },
      {
        key: 'enable_noise', uniformName: 'enable_noise', type: 'bool',
        defaultValue: true,
        ui: { displayName: 'Enable Noise' },
      },
    ],
    aiHints: {
      description: 'Digital glitch effect with horizontal block displacement, color channel separation, noise, and color inversion',
      aliases: ['digital glitch', 'data corruption', 'VHS glitch', 'signal error', 'broken TV'],
      category: 'distort',
      combinability: ['chromaticAberration', 'scanlines', 'crt', 'holographic'],
    },
  },

  chromaticAberration: {
    id: 'chromaticAberration',
    glsl: SHADER_LIBRARY.chromaticAberration,
    paramsSchema: [
      {
        key: 'strength', uniformName: 'strength', type: 'float',
        defaultValue: 3.0,
        ui: { displayName: 'Strength', min: 0.0, max: 30.0, step: 0.5 },
      },
      {
        key: 'direction', uniformName: 'direction', type: 'vec2',
        defaultValue: [1.0, 0.0],
        ui: { displayName: 'Direction' },
      },
      {
        key: 'radial', uniformName: 'radial', type: 'bool',
        defaultValue: false,
        ui: { displayName: 'Radial Mode' },
      },
      {
        key: 'radial_center', uniformName: 'radial_center', type: 'vec2',
        defaultValue: [0.5, 0.5],
        ui: { displayName: 'Radial Center' },
      },
      {
        key: 'radial_falloff', uniformName: 'radial_falloff', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Radial Falloff', min: 0.0, max: 2.0, step: 0.1 },
      },
    ],
    aiHints: {
      description: 'Splits RGB channels with an offset to simulate lens chromatic aberration, in directional or radial mode',
      aliases: ['RGB split', 'color fringe', 'lens aberration', 'prism effect', 'color separation'],
      category: 'distort',
      combinability: ['glitch', 'bloom', 'vignette', 'crt', 'motionBlur'],
    },
  },

  colorGrading: {
    id: 'colorGrading',
    glsl: SHADER_LIBRARY.colorGrading,
    paramsSchema: [
      {
        key: 'brightness', uniformName: 'brightness', type: 'float',
        defaultValue: 0.0,
        ui: { displayName: 'Brightness', min: -1.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'contrast', uniformName: 'contrast', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Contrast', min: 0.0, max: 2.0, step: 0.05 },
      },
      {
        key: 'saturation', uniformName: 'saturation', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Saturation', min: 0.0, max: 2.0, step: 0.05 },
      },
      {
        key: 'gamma', uniformName: 'gamma', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Gamma', min: 0.5, max: 2.0, step: 0.05 },
      },
      {
        key: 'temperature', uniformName: 'temperature', type: 'float',
        defaultValue: 0.0,
        ui: { displayName: 'Temperature', min: -1.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'tint_color', uniformName: 'tint_color', type: 'color',
        defaultValue: [1.0, 1.0, 1.0, 1.0],
        ui: { displayName: 'Tint Color' },
      },
      {
        key: 'tint_strength', uniformName: 'tint_strength', type: 'float',
        defaultValue: 0.0,
        ui: { displayName: 'Tint Strength', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'shadow_color', uniformName: 'shadow_color', type: 'color',
        defaultValue: [0.0, 0.0, 0.0, 1.0],
        ui: { displayName: 'Shadow Color' },
      },
      {
        key: 'highlight_color', uniformName: 'highlight_color', type: 'color',
        defaultValue: [1.0, 1.0, 1.0, 1.0],
        ui: { displayName: 'Highlight Color' },
      },
      {
        key: 'shadow_strength', uniformName: 'shadow_strength', type: 'float',
        defaultValue: 0.0,
        ui: { displayName: 'Shadow Strength', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'highlight_strength', uniformName: 'highlight_strength', type: 'float',
        defaultValue: 0.0,
        ui: { displayName: 'Highlight Strength', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'preset', uniformName: 'preset', type: 'int',
        defaultValue: 0,
        ui: { displayName: 'Preset', min: 0, max: 5, step: 1, options: ['custom', 'warm vintage', 'cool cinema', 'high contrast', 'sepia', 'noir'] },
      },
    ],
    aiHints: {
      description: 'Full color grading suite: brightness, contrast, saturation, gamma, temperature, tint, shadow/highlight coloring, and presets',
      aliases: ['color correction', 'LUT', 'color grade', 'tone mapping', 'look'],
      category: 'color',
      combinability: ['vignette', 'bloom', 'blur', 'oldFilm', 'nightVision'],
    },
  },

  blur: {
    id: 'blur',
    glsl: SHADER_LIBRARY.blur,
    paramsSchema: [
      {
        key: 'blur_amount', uniformName: 'blur_amount', type: 'float',
        defaultValue: 2.0,
        ui: { displayName: 'Blur Amount', min: 0.0, max: 10.0, step: 0.5 },
      },
    ],
    aiHints: {
      description: 'Gaussian blur using a 5x5 weighted kernel to soften the entire screen image',
      aliases: ['gaussian blur', 'soften', 'smooth', 'defocus'],
      category: 'blur',
      combinability: ['vignette', 'bloom', 'scanlines', 'crt', 'colorGrading'],
    },
  },

  bloom: {
    id: 'bloom',
    glsl: SHADER_LIBRARY.bloom,
    paramsSchema: [
      {
        key: 'threshold', uniformName: 'threshold', type: 'float',
        defaultValue: 0.8,
        ui: { displayName: 'Threshold', min: 0.0, max: 1.0, step: 0.05 },
      },
      {
        key: 'intensity', uniformName: 'intensity', type: 'float',
        defaultValue: 1.5,
        ui: { displayName: 'Intensity', min: 0.0, max: 5.0, step: 0.1 },
      },
      {
        key: 'radius', uniformName: 'radius', type: 'float',
        defaultValue: 3.0,
        ui: { displayName: 'Radius', min: 0.0, max: 10.0, step: 0.5 },
      },
    ],
    aiHints: {
      description: 'Bright-area glow that extracts pixels above a luminance threshold and blurs them back additively',
      aliases: ['glow bloom', 'light bloom', 'bright glow', 'HDR glow', 'light bleed'],
      category: 'glow',
      combinability: ['vignette', 'blur', 'colorGrading', 'chromaticAberration', 'crt'],
    },
  },

  ascii: {
    id: 'ascii',
    glsl: SHADER_LIBRARY.ascii,
    paramsSchema: [
      {
        key: 'pixel_size', uniformName: 'pixel_size', type: 'float',
        defaultValue: 8.0,
        ui: { displayName: 'Character Size', min: 4.0, max: 32.0, step: 1.0 },
      },
      {
        key: 'monochrome', uniformName: 'monochrome', type: 'bool',
        defaultValue: false,
        ui: { displayName: 'Monochrome' },
      },
      {
        key: 'color', uniformName: 'color', type: 'color',
        defaultValue: [0.0, 1.0, 0.0, 1.0],
        ui: { displayName: 'Tint Color' },
      },
    ],
    aiHints: {
      description: 'Converts the screen to ASCII-style art using SDF shapes mapped to luminance (dots, crosses, blocks)',
      aliases: ['text art', 'character art', 'terminal art', 'matrix style', 'typewriter'],
      category: 'artistic',
      combinability: ['scanlines', 'crt', 'vignette', 'colorGrading'],
    },
  },

  // =========================================================================
  // GRID SHADER
  // =========================================================================

  grid: {
    id: 'grid',
    glsl: SHADER_LIBRARY.grid,
    paramsSchema: [
      {
        key: 'grid_size', uniformName: 'grid_size', type: 'float',
        defaultValue: 1.0,
        ui: { displayName: 'Grid Size', min: 0.1, max: 10.0, step: 0.1 },
      },
      {
        key: 'line_width', uniformName: 'line_width', type: 'float',
        defaultValue: 0.02,
        ui: { displayName: 'Line Width', min: 0.001, max: 0.1, step: 0.005 },
      },
      {
        key: 'color', uniformName: 'color', type: 'color',
        defaultValue: [0.5, 0.5, 0.5, 0.5],
        ui: { displayName: 'Grid Color' },
      },
      {
        key: 'fade_start', uniformName: 'fade_start', type: 'float',
        defaultValue: 20.0,
        ui: { displayName: 'Fade Start', min: 5.0, max: 100.0, step: 5.0 },
      },
      {
        key: 'fade_end', uniformName: 'fade_end', type: 'float',
        defaultValue: 40.0,
        ui: { displayName: 'Fade End', min: 10.0, max: 200.0, step: 5.0 },
      },
    ],
    aiHints: {
      description: '3D spatial grid overlay with major/minor lines, axis coloring, and distance-based fade (spatial shader)',
      aliases: ['world grid', 'floor grid', 'editor grid', 'debug grid', 'wireframe grid'],
      category: 'utility',
      combinability: [],
    },
  },
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export function getShaderEntry(id: string): ShaderLibraryEntry | null {
  return SHADER_REGISTRY[id] ?? null;
}

export function listShadersByCategory(category: ShaderCategory): ShaderLibraryEntry[] {
  return Object.values(SHADER_REGISTRY).filter(
    (entry) => entry.aiHints.category === category,
  );
}

export function searchShaders(query: string): ShaderLibraryEntry[] {
  const q = query.toLowerCase();
  const scored: Array<{ entry: ShaderLibraryEntry; score: number }> = [];

  for (const entry of Object.values(SHADER_REGISTRY)) {
    let score = 0;

    if (entry.id.toLowerCase() === q) {
      score += 20;
    } else if (entry.id.toLowerCase().includes(q)) {
      score += 8;
    }

    for (const alias of entry.aiHints.aliases) {
      if (alias.toLowerCase() === q) {
        score += 15;
      } else if (alias.toLowerCase().includes(q)) {
        score += 6;
      }
    }

    if (entry.aiHints.description.toLowerCase().includes(q)) {
      score += 3;
    }

    if (entry.aiHints.category.toLowerCase() === q) {
      score += 4;
    }

    if (score > 0) {
      scored.push({ entry, score });
    }
  }

  scored.sort((a, b) => {
    const diff = b.score - a.score;
    if (diff !== 0) return diff;
    return a.entry.id.localeCompare(b.entry.id);
  });

  return scored.map((s) => s.entry);
}

export function getCombinableShaders(id: string): string[] {
  const entry = SHADER_REGISTRY[id];
  if (!entry) return [];
  return entry.aiHints.combinability.filter((cid) => cid in SHADER_REGISTRY);
}

export function getAllShaderCategories(): ShaderCategory[] {
  const categories = new Set<ShaderCategory>();
  for (const entry of Object.values(SHADER_REGISTRY)) {
    categories.add(entry.aiHints.category);
  }
  return [...categories].sort();
}

export function getShaderCount(): number {
  return Object.keys(SHADER_REGISTRY).length;
}
