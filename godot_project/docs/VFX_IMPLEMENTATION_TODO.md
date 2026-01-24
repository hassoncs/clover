# Visual Effects Implementation TODO

This document catalogs all visual effects to implement and experiment with in the Slopcade Godot engine. Effects are categorized by type and include implementation status, priority, and technical notes.

---

## Table of Contents

1. [Sprite Effects](#sprite-effects)
2. [Screen Effects (Post-Processing)](#screen-effects-post-processing)
3. [Camera Effects](#camera-effects)
4. [Particle Effects](#particle-effects)
5. [Dynamic Shader System](#dynamic-shader-system)
6. [Future Effect Ideas](#future-effect-ideas)
7. [Technical Considerations](#technical-considerations)

---

## Sprite Effects

Effects that apply to individual sprites/entities via `ShaderMaterial`.

### Implemented ✅

| Effect | File | Description | Parameters |
|--------|------|-------------|------------|
| **Outline** | `sprite/outline.gdshader` | Colored border around sprite | `outline_color`, `outline_width`, `pattern` (diamond/circle/square) |
| **Glow** | `sprite/glow.gdshader` | Soft outer glow with pulse option | `glow_color`, `glow_intensity`, `glow_radius`, `pulse_speed` |
| **Tint** | `sprite/tint.gdshader` | Color overlay with blend modes | `tint_color`, `tint_amount`, `blend_mode` |
| **Flash** | `sprite/flash.gdshader` | Hit/damage flash effect | `flash_color`, `flash_amount`, `preserve_luminance` |
| **Pixelate** | `sprite/pixelate.gdshader` | Reduce resolution | `pixel_size`, `round_pixels` |
| **Posterize** | `sprite/posterize.gdshader` | Reduce color levels | `color_levels`, `posterize_alpha`, `gamma` |
| **Silhouette** | `sprite/silhouette.gdshader` | Solid color mask | `silhouette_color`, `alpha_threshold` |
| **Rainbow** | `sprite/rainbow.gdshader` | Animated hue cycling | `speed`, `saturation_boost`, `use_uv_offset` |
| **Dissolve** | `sprite/dissolve.gdshader` | Burn/fade away with noise | `dissolve_amount`, `edge_width`, `edge_color`, `noise_scale` |
| **Holographic** | `sprite/holographic.gdshader` | Sci-fi hologram look | `speed`, `scan_line_count`, `chromatic_offset`, `flicker_intensity` |
| **Wave** | `sprite/wave.gdshader` | Wobble/distortion | `amplitude_x/y`, `frequency_x/y`, `speed`, `radial_wave` |
| **Rim Light** | `sprite/rim_light.gdshader` | Edge highlight from light direction | `rim_color`, `rim_width`, `rim_intensity`, `light_direction` |
| **Color Matrix** | `sprite/color_matrix.gdshader` | Full color transformation | `preset` (grayscale, sepia, invert, colorblind sims) |
| **Inner Glow** | `sprite/inner_glow.gdshader` | Glow from edges inward | `glow_color`, `glow_width`, `glow_intensity` |
| **Drop Shadow** | `sprite/drop_shadow.gdshader` | Offset shadow behind sprite | `shadow_color`, `shadow_offset`, `shadow_blur` |

### TODO - High Priority 🔴

| Effect | Description | Use Case |
|--------|-------------|----------|
| **Sprite Sheet Animation** | Flipbook-style UV animation | Animated sprites |
| **Palette Swap** | LUT-based color replacement | Character variants, team colors |
| **Fresnel** | Edge highlighting based on view angle | 3D-like depth effect |
| **Distortion Map** | Use texture to drive UV distortion | Water, heat haze per-sprite |
| **Blur (Per-Sprite)** | Gaussian blur on individual sprite | Motion, focus effects |

### TODO - Medium Priority 🟡

| Effect | Description | Use Case |
|--------|-------------|----------|
| **Electricity/Lightning** | Animated electric arcs | Shock effects, energy |
| **Fire Overlay** | Animated fire texture blend | Burning objects |
| **Ice/Freeze** | Blue tint + crystal overlay | Frozen state |
| **Poison** | Green pulse + drip effect | Poisoned state |
| **Shield Bubble** | Spherical distortion overlay | Protection visual |
| **Ghost/Fade** | Semi-transparent with edge glow | Invisibility |
| **Glitch (Per-Sprite)** | RGB split + scan displacement | Damaged/corrupted |
| **X-Ray** | Inverted colors + scan lines | See-through effect |

### TODO - Low Priority 🟢

| Effect | Description | Use Case |
|--------|-------------|----------|
| **ASCII Art** | Convert to text characters | Retro style |
| **Dithering** | Ordered dither patterns | Retro/stylized |
| **Oil Paint** | Brush stroke simulation | Artistic style |
| **Sketch/Pencil** | Edge detection + hatching | Drawn look |
| **Negative Space** | Only show edges | Artistic |

---

## Screen Effects (Post-Processing)

Full-screen effects via `ColorRect` + `CanvasLayer`.

### Implemented ✅

| Effect | File | Description | Parameters |
|--------|------|-------------|------------|
| **Vignette** | `post_process/vignette.gdshader` | Darkened edges | `vignette_intensity`, `vignette_opacity`, `vignette_color` |
| **Scanlines** | `post_process/scanlines.gdshader` | Horizontal/vertical lines | `scanline_count`, `scanline_opacity`, `scanline_speed` |
| **Chromatic Aberration** | `post_process/chromatic_aberration.gdshader` | RGB channel separation | `strength`, `direction`, `radial` |
| **Shockwave** | `post_process/shockwave.gdshader` | Expanding circular distortion | `center`, `radius`, `thickness`, `amplitude` |
| **Blur** | `post_process/blur.gdshader` | Gaussian/box/radial blur | `blur_amount`, `blur_quality`, `blur_type` |
| **CRT** | `post_process/crt.gdshader` | Complete retro monitor | `scanline_opacity`, `curvature`, `rgb_offset`, `vignette_strength` |
| **Color Grading** | `post_process/color_grading.gdshader` | Color correction + presets | `brightness`, `contrast`, `saturation`, `temperature`, `preset` |
| **Glitch** | `post_process/glitch.gdshader` | Digital distortion | `glitch_intensity`, `glitch_speed`, `block_size`, `color_drift` |
| **Motion Blur** | `post_process/motion_blur.gdshader` | Directional/radial motion | `velocity`, `samples`, `strength`, `radial` |
| **Pixelate Screen** | `post_process/pixelate_screen.gdshader` | Full-screen pixel reduction | `pixel_size`, `color_reduction`, `dithering` |
| **Shimmer/Heat** | `post_process/shimmer.gdshader` | Wavy distortion | `amplitude`, `frequency`, `speed`, `heat_rise` |

### TODO - High Priority 🔴

| Effect | Description | Use Case |
|--------|-------------|----------|
| **Bloom/Glow** | HDR glow on bright areas | Magic, lights |
| **Depth of Field** | Blur based on distance | Focus effects |
| **Film Grain** | Noise overlay | Cinematic |
| **Letterboxing** | Cinema aspect ratio bars | Cutscenes |
| **Speed Lines** | Radial motion lines | High speed |

### TODO - Medium Priority 🟡

| Effect | Description | Use Case |
|--------|-------------|----------|
| **Night Vision** | Green tint + noise + vignette | Stealth mode |
| **Thermal Vision** | Heat map coloring | Special vision |
| **Underwater** | Blue tint + caustics + blur | Water levels |
| **Drunk/Dizzy** | Wobble + double vision | Status effect |
| **Damage Overlay** | Red vignette pulse | Low health |
| **Rain Drops** | Droplet distortion on "lens" | Weather |
| **Frosted Glass** | Blur + noise distortion | UI backgrounds |
| **Radial Blur** | Zoom blur from center | Impact, speed |
| **Color Blindness Filters** | Simulate/correct color blindness | Accessibility |

### TODO - Low Priority 🟢

| Effect | Description | Use Case |
|--------|-------------|----------|
| **VHS** | Full VHS simulation | Retro style |
| **Film** | 24fps + scratches + dust | Movie look |
| **Watercolor** | Painted effect | Artistic |
| **Halftone** | Print dots pattern | Comic style |
| **ASCII** | Full screen text render | Extreme retro |
| **Kaleidoscope** | Mirror/repeat pattern | Psychedelic |
| **Barrel/Pincushion** | Lens distortion | Fish-eye |

---

## Camera Effects

Non-shader effects via `Camera2D` manipulation.

### Implemented ✅

| Effect | Script | Description |
|--------|--------|-------------|
| **Trauma Shake** | `CameraEffects.gd` | GDC-style trauma-based shake with noise |
| **Zoom Punch** | `CameraEffects.gd` | Quick zoom in/out for impact |
| **Focus On** | `CameraEffects.gd` | Smooth move + zoom to target |
| **Recoil** | `CameraEffects.gd` | Directional offset with recovery |

### TODO - High Priority 🔴

| Effect | Description | Use Case |
|--------|-------------|----------|
| **Smooth Follow** | Damped position tracking | Player following |
| **Look Ahead** | Offset in movement direction | Platformers |
| **Screen Bounds** | Limit to level boundaries | Level design |
| **Multi-Target** | Frame multiple targets | Multiplayer |

### TODO - Medium Priority 🟡

| Effect | Description | Use Case |
|--------|-------------|----------|
| **Parallax Layers** | Different scroll speeds | Depth effect |
| **Rotation** | Camera roll for disorientation | Impact, damage |
| **Slow Motion** | Time scale manipulation | Dramatic moments |
| **Cinematic Bars** | Animated letterbox | Cutscenes |
| **Split Screen** | Multiple viewports | Local multiplayer |

---

## Particle Effects

CPU-based particle systems for cross-platform compatibility.

### Implemented ✅

| Preset | Description | Use Case |
|--------|-------------|----------|
| **Fire** | Rising flames with color gradient | Burning, torches |
| **Smoke** | Slow rising, fading puffs | Fire aftermath, atmosphere |
| **Sparks** | Fast, bouncing particles | Impact, metal |
| **Magic** | Glowing orbs with trails | Spells, power-ups |
| **Explosion** | Outward burst with fade | Destruction |
| **Rain** | Falling streaks | Weather |
| **Snow** | Gentle falling flakes | Weather |
| **Bubbles** | Rising, wobbling spheres | Underwater |
| **Confetti** | Colorful falling pieces | Celebration |
| **Dust** | Small, short-lived puffs | Movement, landing |
| **Leaves** | Falling, rotating | Nature |
| **Stars** | Spinning, fading | Collection, achievement |
| **Blood** | Red splatter | Combat feedback |
| **Coins** | Golden, bouncing | Rewards |

### TODO - High Priority 🔴

| Preset | Description | Use Case |
|--------|-------------|----------|
| **Trail** | Following particle ribbon | Movement trails |
| **Aura** | Orbiting particles around entity | Power-ups, buffs |
| **Charge** | Particles flowing toward point | Charging attacks |
| **Beam** | Linear particle stream | Lasers, energy |
| **Impact Ring** | Expanding ring at collision | Ground pounds |

### TODO - Medium Priority 🟡

| Preset | Description | Use Case |
|--------|-------------|----------|
| **Electricity** | Branching spark lines | Electric damage |
| **Healing** | Rising green/gold particles | Health restore |
| **Portal** | Swirling vortex | Teleportation |
| **Footsteps** | Small puffs on movement | Grounded feedback |
| **Splash** | Water droplet spray | Water interaction |
| **Glass Shatter** | Angular fragments | Breaking glass |
| **Wood Chips** | Brown fragments | Breaking wood |
| **Feathers** | Floating, drifting | Bird hits, pillows |

---

## Dynamic Shader System

AI-generated shaders sent from JavaScript at runtime.

### Implemented ✅

- `createDynamicShader(id, code)` - Create shader from GLSL string
- `applyDynamicShader(entityId, shaderId, params)` - Apply to sprite
- `applyDynamicPostShader(code, params)` - Apply to screen

### TODO - High Priority 🔴

| Feature | Description |
|---------|-------------|
| **Shader Validation** | Detect infinite loops, excessive samples before compile |
| **Shader Templates** | Pre-defined safe templates for AI to fill in |
| **Error Reporting** | Return compile errors to JS side |
| **Shader Hot-Reload** | Update shader without re-creating material |

### TODO - Medium Priority 🟡

| Feature | Description |
|---------|-------------|
| **Shader Library** | Store/retrieve generated shaders by name |
| **Shader Blending** | Combine multiple effects in one pass |
| **Uniform Animation** | Automatic tweening of shader parameters |
| **Shader Presets** | AI-friendly preset configurations |

---

## Future Effect Ideas

Effects to explore and potentially implement.

### Visual Styles

- **Cel Shading** - Cartoon/anime style with hard shadows
- **Pixel Art Upscaling** - Smart pixel art scaling algorithms
- **Vector Art** - Clean, scalable graphics simulation
- **Paper Cutout** - Layered paper aesthetic
- **Neon** - Glowing neon tube look
- **Retro Console** - NES/SNES/Genesis specific palettes and limits

### Advanced Effects

- **Reflections** - Simple 2D reflection planes
- **Shadows (2D)** - Projected shadows from light sources
- **Lighting System** - Point/directional lights affecting sprites
- **Normal Maps** - 2D sprites with depth information
- **Ambient Occlusion** - Contact shadows

### Gameplay Integration

- **Damage Numbers** - Floating combat text
- **Health Bars** - Entity health visualization
- **Status Icons** - Buff/debuff indicators
- **Highlight System** - Interactive object indicators
- **Tutorial Arrows** - Directional guidance

---

## Technical Considerations

### Cross-Platform Compatibility

All effects MUST work on:
- **Web** (WebGL 2.0 via `gl_compatibility`)
- **iOS** (Metal via `gl_compatibility`)
- **Android** (OpenGL ES 3.0 via `gl_compatibility`)

### Limitations to Avoid

| Feature | Status | Reason |
|---------|--------|--------|
| `textureGrad()` | ❌ Avoid | Not supported in WebGL |
| Depth textures | ❌ Avoid | Broken in WebGL 2.0 |
| Integer textures | ❌ Avoid | Limited support |
| Compute shaders | ❌ Avoid | Not in Compatibility renderer |
| GPUParticles2D trails | ⚠️ Caution | Can crash on some mobile |
| High sample counts (>16) | ⚠️ Caution | Performance killer |
| Multiple SubViewports | ⚠️ Caution | Huge perf hit on web |

### Performance Guidelines

1. **Limit post-process to 1-2 active** at a time
2. **Pre-warm shaders** during loading to avoid stutter
3. **Use hint_range** to prevent extreme values
4. **Keep blur quality ≤ 3** on mobile
5. **Use CPUParticles2D** instead of GPUParticles2D for web
6. **Batch similar effects** where possible

### Testing Checklist

For each new effect:

- [ ] Works in Godot Editor
- [ ] Works in Web export
- [ ] Works on iOS device
- [ ] Works on Android device
- [ ] No visible stutter on first use
- [ ] Parameters have sensible ranges
- [ ] Graceful fallback if unsupported

---

## File Structure

```
godot_project/
├── shaders/
│   ├── include/
│   │   ├── noise.gdshaderinc      # Shared noise functions
│   │   └── color_utils.gdshaderinc # Color manipulation
│   ├── sprite/                     # Per-entity effects
│   │   ├── outline.gdshader
│   │   ├── glow.gdshader
│   │   └── ... (15 shaders)
│   └── post_process/               # Full-screen effects
│       ├── vignette.gdshader
│       ├── crt.gdshader
│       └── ... (11 shaders)
├── scripts/
│   └── effects/
│       ├── EffectsManager.gd       # Central API
│       ├── CameraEffects.gd        # Camera2D extension
│       ├── ParticleFactory.gd      # Particle presets
│       └── GameBridgeEffects.gd    # JS bridge integration
└── scenes/
    └── VFXShowcase.tscn            # Interactive demo
```

---

## React Native Bridge API

### Sprite Effects

```typescript
// Apply effect to entity
bridge.applySpriteEffect(entityId: string, effectName: string, params?: object)

// Update single parameter
bridge.updateSpriteEffectParam(entityId: string, paramName: string, value: any)

// Remove effect
bridge.clearSpriteEffect(entityId: string)
```

### Screen Effects

```typescript
// Apply post-processing
bridge.setPostEffect(effectName: string, params?: object, layer?: string)

// Update parameter
bridge.updatePostEffectParam(paramName: string, value: any, layer?: string)

// Clear effect
bridge.clearPostEffect(layer?: string)
```

### Camera Effects

```typescript
bridge.screenShake(intensity: number, duration?: number)
bridge.zoomPunch(intensity?: number, duration?: number)
bridge.triggerShockwave(worldX: number, worldY: number, duration?: number)
bridge.flashScreen(color?: [r,g,b,a], duration?: number)
```

### Dynamic Shaders

```typescript
// Create AI-generated shader
bridge.createDynamicShader(shaderId: string, glslCode: string)

// Apply to entity
bridge.applyDynamicShader(entityId: string, shaderId: string, params?: object)

// Apply to screen
bridge.applyDynamicPostShader(glslCode: string, params?: object)
```

### Particles

```typescript
bridge.spawnParticlePreset(presetName: string, worldX: number, worldY: number, params?: object)
```

### Info

```typescript
bridge.getAvailableEffects() // Returns { sprite: [...], post: [...], particles: [...] }
```

---

*Last Updated: January 2025*
*Status: Core system implemented, expanding effect library*
