# Advanced Effects Implementation Checklist

## Tier 1: Quick Wins (Immediate)
- [ ] **Night Vision** (`shaders/post_process/night_vision.gdshader`)
  - [ ] Shader: Green Tint & Light Boost
  - [ ] Shader: Grain Noise (Simplex/Random)
  - [ ] Shader: Vignette mask
  - [ ] TS: `NightVisionEffect` type & metadata
  - [ ] Godot: Register in `EffectsManager.gd`

- [ ] **Speed Lines** (`shaders/post_process/speed_lines.gdshader`)
  - [ ] Shader: Radial Noise pattern from center
  - [ ] Shader: Center exclusion zone (mask)
  - [ ] TS: `SpeedLinesEffect` type & metadata
  - [ ] Godot: Register in `EffectsManager.gd`

- [ ] **Underwater** (`shaders/post_process/underwater.gdshader`)
  - [ ] Shader: UV Wave Distortion (sine/cosine time-based)
  - [ ] Shader: Blue/Teal Depth Tint
  - [ ] TS: `UnderwaterEffect` type & metadata
  - [ ] Godot: Register in `EffectsManager.gd`

## Tier 2: Stylistic (Next)
- [ ] **Thermal Vision** (`shaders/post_process/thermal_vision.gdshader`)
  - [ ] Shader: Gradient Map (Blue -> Red -> Yellow -> White)
  - [ ] TS: `ThermalVisionEffect` type
  - [ ] Godot: Register

- [ ] **Halftone** (`shaders/post_process/halftone.gdshader`)
  - [ ] Shader: Screen-space dot grid based on luminance
  - [ ] TS: `HalftoneEffect` type
  - [ ] Godot: Register

- [ ] **Old Film** (`shaders/post_process/old_film.gdshader`)
  - [ ] Shader: Sepia Tone
  - [ ] Shader: Vertical Scratches (noise)
  - [ ] Shader: Dust Specks
  - [ ] TS: `OldFilmEffect` type
  - [ ] Godot: Register

## Tier 3: Complex / Data-Driven (Later)
- [ ] **Splat Map System** (Infrastructure)
  - [ ] Create `EntityMap` viewport in Godot
  - [ ] Render entities as white dots to viewport
  - [ ] Pass viewport texture to shaders

- [ ] **Ripple Field** (`shaders/post_process/ripple.gdshader`)
  - [ ] Shader: Sample splat map for distortion strength
- [ ] **Fog of War** (`shaders/post_process/fog_of_war.gdshader`)
  - [ ] Shader: Mask world based on splat map
- [ ] **ASCII** (`shaders/post_process/ascii.gdshader`)
  - [ ] Shader: Quantize UVs to grid, map luminance to char texture
