# Special Effects System - Implementation Plan

> **Goal**: Add particle effects and shader-based special effects to the game engine that are easy to configure and visually impressive.

## Overview

This document outlines 20 special effects for the game engine, organized into categories with implementation details and configurable parameters.

---

## Effect Categories

### 1. Particle Effects (CPU-based)
Effects that spawn and animate many small objects.

### 2. Glow & Light Effects
Effects that make things shine, pulse, or emit light.

### 3. Distortion Effects
Effects that warp, ripple, or displace pixels.

### 4. Color & Filter Effects
Effects that modify colors, contrast, or apply artistic filters.

### 5. Post-Processing Effects
Full-screen or overlay effects applied after rendering.

---

## The 20 Effects

### CATEGORY 1: Particle Effects

#### 1. Fire Particles
**Description**: Animated flames rising from a point or area.
**Use Cases**: Torches, explosions, fire magic, burning objects
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| emissionRate | number | 10-500 | 100 | Particles per second |
| lifetime | number | 0.5-3.0 | 1.0 | Seconds each particle lives |
| spread | number | 0-180 | 30 | Angle spread in degrees |
| colors | string[] | - | ['#ff4400', '#ff8800', '#ffcc00'] | Color gradient over life |
| size | {min, max} | 2-50 | {min: 5, max: 15} | Particle size range |
| gravity | number | -200-0 | -50 | Upward drift |
| turbulence | number | 0-1 | 0.3 | Horizontal wiggle |

**Difficulty**: Medium

---

#### 2. Smoke/Steam Particles
**Description**: Soft, billowing clouds that rise and dissipate.
**Use Cases**: Chimneys, steam vents, dust clouds, fog
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| emissionRate | number | 5-100 | 30 | Particles per second |
| lifetime | number | 1-5 | 2.5 | Seconds |
| color | string | - | '#888888' | Smoke color |
| opacity | {start, end} | 0-1 | {start: 0.6, end: 0} | Fade over life |
| size | {start, end} | - | {start: 10, end: 40} | Grow over life |
| drift | number | 0-50 | 10 | Horizontal wind |

**Difficulty**: Medium

---

#### 3. Spark/Electric Particles
**Description**: Quick, bright particles that shoot outward.
**Use Cases**: Welding, electric zaps, impacts, magic
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| emissionRate | number | 50-1000 | 200 | Burst rate |
| speed | {min, max} | 50-500 | {min: 100, max: 300} | Particle velocity |
| lifetime | number | 0.1-1.0 | 0.3 | Very short-lived |
| color | string | - | '#ffff00' | Spark color |
| gravity | number | 0-500 | 200 | Fall after burst |
| trail | boolean | - | true | Leave trails |

**Difficulty**: Medium

---

#### 4. Magic/Glitter Particles
**Description**: Sparkly, floating particles that shimmer.
**Use Cases**: Power-ups, magic spells, collectibles, fairy dust
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| emissionRate | number | 20-200 | 80 | Particles per second |
| colors | string[] | - | ['#ff00ff', '#00ffff', '#ffff00'] | Cycle through |
| twinkle | number | 0-1 | 0.8 | Opacity flicker rate |
| orbit | boolean | - | false | Orbit around emitter |
| orbitRadius | number | 10-100 | 30 | Orbit distance |
| size | number | 2-10 | 4 | Particle size |

**Difficulty**: Medium-Hard

---

#### 5. Explosion Burst
**Description**: Sudden outward burst of particles.
**Use Cases**: Explosions, death effects, confetti, impact
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| particleCount | number | 20-500 | 100 | Particles in burst |
| speed | {min, max} | 100-800 | {min: 200, max: 500} | Outward velocity |
| lifetime | number | 0.3-2.0 | 0.8 | Duration |
| colors | string[] | - | ['#ff0000', '#ff8800', '#ffff00'] | Explosion colors |
| gravity | number | 0-500 | 300 | Particles fall |
| fadeOut | boolean | - | true | Fade to transparent |

**Difficulty**: Easy-Medium

---

### CATEGORY 2: Glow & Light Effects

#### 6. Outer Glow
**Description**: Soft luminous halo around an object.
**Use Cases**: Power-ups, selected items, magical objects, UI highlights
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| color | string | - | '#00ffff' | Glow color |
| radius | number | 2-50 | 15 | Blur radius |
| intensity | number | 0.1-2.0 | 0.8 | Brightness |
| pulse | boolean | - | false | Animate intensity |
| pulseSpeed | number | 0.5-5.0 | 1.0 | Pulse frequency |
| blendMode | string | - | 'screen' | How glow composites |

**Difficulty**: Easy

---

#### 7. Inner Glow
**Description**: Glow emanating from inside the shape's edges.
**Use Cases**: Charged objects, internal energy, hover states
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| color | string | - | '#ffffff' | Glow color |
| radius | number | 2-30 | 10 | Inward blur |
| intensity | number | 0.1-1.5 | 0.6 | Brightness |
| feather | number | 0-1 | 0.5 | Edge softness |

**Difficulty**: Medium

---

#### 8. Holographic/Iridescent
**Description**: Rainbow-shifting colors that change with angle/time.
**Use Cases**: Rare items, hologram displays, sci-fi elements
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| speed | number | 0.1-3.0 | 0.5 | Color shift speed |
| saturation | number | 0.5-1.5 | 1.0 | Color intensity |
| scanlines | boolean | - | true | Add scanline effect |
| scanlineSpacing | number | 2-10 | 4 | Pixels between lines |
| opacity | number | 0.2-0.8 | 0.4 | Effect overlay opacity |

**Difficulty**: Medium

---

#### 9. Rim Light / Edge Glow
**Description**: Glowing outline that follows the object's edge.
**Use Cases**: Silhouettes, dramatic lighting, selection indicator
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| color | string | - | '#ff00ff' | Rim color |
| width | number | 1-10 | 3 | Edge thickness |
| intensity | number | 0.5-2.0 | 1.0 | Brightness |
| falloff | number | 0-1 | 0.5 | How quickly it fades |

**Difficulty**: Medium-Hard

---

### CATEGORY 3: Distortion Effects

#### 10. Wave Distortion
**Description**: Rippling wave effect that warps the image.
**Use Cases**: Water reflections, heat waves, dream sequences
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| amplitude | number | 0.01-0.1 | 0.03 | Wave height |
| frequency | number | 5-50 | 15 | Wave count |
| speed | number | 0.5-5.0 | 2.0 | Animation speed |
| direction | 'horizontal' | 'vertical' | 'both' | 'horizontal' | Wave direction |

**Difficulty**: Medium

---

#### 11. Shockwave/Ripple
**Description**: Expanding circular distortion from a point.
**Use Cases**: Explosions, impacts, teleportation, sonar
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| radius | number | 0-500 | animated | Current ripple radius |
| thickness | number | 10-100 | 30 | Ring thickness |
| strength | number | 0.01-0.2 | 0.05 | Distortion amount |
| speed | number | 100-1000 | 300 | Expansion speed |
| decay | number | 0.5-2.0 | 1.0 | Fade out rate |

**Difficulty**: Medium-Hard

---

#### 12. Pixelate
**Description**: Reduce resolution to chunky pixels.
**Use Cases**: Retro effects, damage indication, transitions
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| pixelSize | number | 2-32 | 8 | Size of each "pixel" |
| animated | boolean | - | false | Animate pixel size |
| animationRange | {min, max} | - | {min: 4, max: 16} | Size range |
| animationSpeed | number | 0.5-5.0 | 1.0 | Animation speed |

**Difficulty**: Easy

---

#### 13. Chromatic Aberration
**Description**: RGB color channel separation for a glitchy look.
**Use Cases**: Glitch effects, damage, sci-fi, retro
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| offsetX | number | 0-20 | 5 | Horizontal RGB split |
| offsetY | number | 0-20 | 0 | Vertical RGB split |
| animated | boolean | - | false | Jitter the offset |
| intensity | number | 0-1 | 0.5 | Effect strength |

**Difficulty**: Easy-Medium

---

### CATEGORY 4: Color & Filter Effects

#### 14. Color Tint/Grade
**Description**: Shift all colors toward a target color.
**Use Cases**: Damage flash, power-up indication, mood setting
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| color | string | - | '#ff0000' | Target tint color |
| intensity | number | 0-1 | 0.5 | How much to shift |
| preserveLuminance | boolean | - | true | Keep brightness |

**Difficulty**: Easy

---

#### 15. Dissolve
**Description**: Object breaks apart into particles/noise.
**Use Cases**: Death animations, teleportation, materializing
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| progress | number | 0-1 | 0 | 0=solid, 1=gone |
| noiseScale | number | 5-50 | 20 | Dissolution pattern size |
| edgeWidth | number | 0.01-0.2 | 0.05 | Glowing edge thickness |
| edgeColor | string | - | '#ff8800' | Edge glow color |
| direction | 'random' | 'up' | 'down' | 'random' | Dissolve direction |

**Difficulty**: Medium

---

#### 16. Outline/Stroke
**Description**: Add a colored border around the object.
**Use Cases**: Selection, emphasis, comic book style
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| color | string | - | '#000000' | Outline color |
| width | number | 1-10 | 2 | Outline thickness |
| position | 'outer' | 'inner' | 'center' | 'outer' | Where to draw |
| opacity | number | 0-1 | 1.0 | Outline opacity |

**Difficulty**: Easy-Medium

---

#### 17. Posterize
**Description**: Reduce color palette for a stylized look.
**Use Cases**: Comic style, retro, artistic filter
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| levels | number | 2-16 | 4 | Color levels per channel |
| gamma | number | 0.5-2.0 | 1.0 | Brightness adjustment |

**Difficulty**: Easy

---

### CATEGORY 5: Post-Processing Effects

#### 18. Vignette
**Description**: Darken edges of screen/object.
**Use Cases**: Focus effect, cinematic look, damage indication
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| intensity | number | 0-1 | 0.5 | Darkness amount |
| radius | number | 0.2-1.0 | 0.7 | Size of clear center |
| softness | number | 0-1 | 0.5 | Edge blur |
| color | string | - | '#000000' | Vignette color |

**Difficulty**: Easy

---

#### 19. Scanlines
**Description**: CRT-style horizontal lines.
**Use Cases**: Retro displays, holograms, glitch
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| spacing | number | 2-10 | 4 | Pixels between lines |
| thickness | number | 1-3 | 1 | Line thickness |
| opacity | number | 0.1-0.5 | 0.2 | Line darkness |
| animated | boolean | - | true | Scroll lines |
| speed | number | 10-100 | 50 | Scroll speed |

**Difficulty**: Easy

---

#### 20. Motion Blur
**Description**: Blur in direction of movement.
**Use Cases**: Speed indication, fast objects, dramatic motion
**Parameters**:
| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| strength | number | 0-1 | 0.5 | Blur amount |
| samples | number | 3-15 | 7 | Quality (more = smoother) |
| direction | 'velocity' | 'angle' | 'velocity' | Blur direction source |
| angle | number | 0-360 | 0 | Manual angle if not velocity |

**Difficulty**: Hard

---

## Implementation Priority

### Phase 1: Foundation (Week 1)
Build the core effect system infrastructure.

1. **Effect Types & Integration** - Define TypeScript types, add `effects` field to sprites
2. **EffectRegistry** - Compile effect specs into Skia render operations
3. **Outer Glow** - First effect, proves the pipeline
4. **Color Tint** - Simple color matrix effect
5. **Outline** - Common, useful effect

### Phase 2: Particles (Week 2)
Build the particle system.

6. **CPU Particle System** - Core emitter, pooling, rendering
7. **Fire Particles** - Showcase particle config
8. **Explosion Burst** - Burst mode particles
9. **Spark Particles** - Fast, short-lived particles

### Phase 3: Distortion & Sampling (Week 3)
Effects that sample/warp the image.

10. **Pixelate** - Simple sampling effect
11. **Dissolve** - Noise-based masking
12. **Wave Distortion** - UV warping
13. **Chromatic Aberration** - RGB splitting

### Phase 4: Polish Effects (Week 4)
More advanced and polished effects.

14. **Holographic** - Multi-layer shader
15. **Vignette** - Post-processing
16. **Scanlines** - Retro effect
17. **Posterize** - Color reduction
18. **Smoke Particles** - Soft particles
19. **Magic Particles** - Complex particle behavior
20. **Inner Glow** - Inverse glow

---

## File Structure

```
shared/src/types/
├── effects.ts          # Effect type definitions
├── particles.ts        # Particle emitter configs

app/lib/effects/
├── EffectRegistry.ts   # Compile specs → render operations
├── EffectApplier.tsx   # Apply effects during render
├── EffectCapabilities.ts # Web/native feature detection
├── effects/
│   ├── glow.ts
│   ├── outline.ts
│   ├── tint.ts
│   ├── pixelate.ts
│   ├── dissolve.ts
│   ├── distortion.ts
│   ├── chromatic.ts
│   ├── holographic.ts
│   ├── vignette.ts
│   ├── scanlines.ts
│   ├── posterize.ts
│   └── motionBlur.ts

app/lib/particles/
├── ParticleSystem.ts   # CPU particle update
├── ParticlePool.ts     # Object pooling
├── ParticleRenderer.tsx # Skia rendering
├── emitters/
│   ├── FireEmitter.ts
│   ├── SmokeEmitter.ts
│   ├── SparkEmitter.ts
│   ├── MagicEmitter.ts
│   └── ExplosionEmitter.ts

app/components/examples/
├── EffectsGallery.tsx  # Interactive effects showcase
├── ParticlePlayground.tsx # Particle configuration UI

app/app/examples/
├── effects_gallery.tsx
└── particle_playground.tsx
```

---

## Example Usage (Target API)

```tsx
// Adding effects to an entity
const entity: GameEntity = {
  id: 'magic_sword',
  transform: { x: 100, y: 100, angle: 0 },
  sprite: {
    type: 'image',
    imageUrl: '/assets/sword.png',
    imageWidth: 64,
    imageHeight: 128,
    effects: [
      { type: 'glow', color: '#00ffff', radius: 15, intensity: 0.8, pulse: true },
      { type: 'holographic', speed: 0.5, opacity: 0.3 }
    ]
  }
};

// Particle emitter on an entity
const torch: GameEntity = {
  id: 'torch',
  transform: { x: 200, y: 150, angle: 0 },
  sprite: { type: 'rect', width: 10, height: 30, color: '#8B4513' },
  particles: {
    type: 'fire',
    emissionRate: 80,
    lifetime: { min: 0.5, max: 1.2 },
    colors: ['#ff4400', '#ff8800', '#ffcc00'],
    spread: 25
  }
};
```

---

## Interactive Gallery Features

The Effects Gallery will include:

1. **Effect Selector** - Grid of all 20 effects with thumbnails
2. **Live Preview** - See effect applied to sample sprite
3. **Parameter Controls** - Sliders, color pickers, toggles for each param
4. **Preset Library** - Save/load parameter combinations
5. **Code Export** - Copy the effect config as code
6. **Performance Monitor** - FPS counter, render time

---

## Success Criteria

- [ ] All 20 effects implemented and working
- [ ] Effects work on all sprite types (rect, circle, image)
- [ ] Particle system handles 1000+ particles at 60fps
- [ ] Interactive gallery with all parameter controls
- [ ] Effects composable (multiple on same entity)
- [ ] Works on both web and native
- [ ] TypeScript types for all effect configs
- [ ] Documentation for each effect
