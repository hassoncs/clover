# UI Texture-Based System

## Overview
We've pivoted from generating UI buttons via AI (which had shape/text issues) to a cleaner approach:

1. **Generate tileable textures** (no shapes, no text)
2. **Apply dynamic styling** in Godot via shaders (rounded corners, shadows, bevels)
3. **Render text separately** on top

## What We Built

### 1. Texture Generation Script
**File:** `api/scripts/generate-ui-textures.ts`

Generates seamless tileable material textures for different game themes:
- **Arcade:** painted metal, brushed aluminum, neon plastic
- **Fantasy:** weathered stone, ancient metal, leather, parchment  
- **Sci-fi:** carbon fiber, brushed steel, holographic panels
- **Candy:** glossy plastic, sugar glaze, soft rubber
- **Nature:** polished wood, smooth stone, woven bamboo
- **Cyberpunk:** rusted metal, grime concrete, circuit boards

**Usage:**
```bash
# Generate all themes
cd api && npx tsx scripts/generate-ui-textures.ts

# Generate specific theme
cd api && npx tsx scripts/generate-ui-textures.ts arcade
```

**Output:** `debug-output/ui-textures/` (512x512 PNGs)

### 2. Godot Shader
**File:** `godot/ui_shaders/styled_surface.gdshader`

Configurable shader that applies:
- **Rounded rectangle mask** (configurable radius)
- **Drop shadow** (offset, size, color)
- **Border** (size, color)
- **Bevel/emboss** (fake 3D lighting)
- **Inner shadow/glow** (depth inside)

**Uniforms:**
```glsl
u_tex - Base texture (tileable material)
u_tile - UV tiling (default 1.0)
u_radius_px - Corner radius in pixels
u_shadow_offset_px - Shadow offset
u_shadow_px - Shadow blur size
u_border_px - Border thickness
u_bevel_strength - 3D bevel intensity
u_inner_strength - Inner shadow intensity
```

### 3. StyledButton Component
**File:** `godot/ui_components/styled_button.gd`

Ready-to-use Button subclass with:
- Automatic shader setup
- Export variables for all styling in Inspector
- State handling (hover, pressed, disabled)
- Material texture swapping

**Usage:**
```gdscript
# In Godot editor
# 1. Add StyledButton to scene
# 2. Set material_texture to your generated texture
# 3. Adjust corner_radius, shadow, border in Inspector

# Or via code
var btn = StyledButton.new()
btn.material_texture = load("res://textures/arcade_metal.png")
btn.corner_radius = 24.0
btn.shadow_offset = Vector2(0, 6)
add_child(btn)
```

## Files Created

```
slopcade/
├── api/scripts/
│   └── generate-ui-textures.ts      # Texture generation
├── godot/
│   ├── ui_shaders/
│   │   └── styled_surface.gdshader  # Godot shader
│   └── ui_components/
│       └── styled_button.gd         # Button component
├── debug-output/
│   └── ui-textures/                 # Generated textures
│       ├── arcade_*.png
│       ├── fantasy_*.png
│       └── index.html               # Texture gallery
└── docs/
    └── controlnet-investigation.md  # Previous approach notes
```

## Next Steps

1. **Copy textures** to Godot project (ensure "Repeat" import flag is enabled)
2. **Create StyledButton** instances in your UI scenes
3. **Tune styling** via Inspector (radius, shadow, etc.)
4. **Add text labels** as separate Label nodes on top

## Advantages Over Previous Approach

✅ **No shape distortion** - Perfect rounded rectangles every time  
✅ **No text placement issues** - Text rendered separately in Godot  
✅ **Consistent geometry** - Shader guarantees perfect shapes  
✅ **Fast iteration** - Swap texture = instant new theme  
✅ **Dynamic styling** - Change colors, shadows, bevels at runtime  
✅ **Scalable** - Works at any button size, texture tiles automatically  

## Example

```gdscript
# Create a sci-fi button
var sci_fi_btn = StyledButton.new()
sci_fi_btn.text = "START GAME"
sci_fi_btn.material_texture = load("res://textures/scifi_carbon_fiber.png")
sci_fi_btn.corner_radius = 12.0
sci_fi_btn.border_size = 2.0
sci_fi_btn.border_color = Color(0.2, 0.8, 1.0, 0.5)  # Cyan glow
sci_fi_btn.shadow_offset = Vector2(0, 8)
sci_fi_btn.shadow_color = Color(0, 0, 0, 0.6)
sci_fi_btn.bevel_strength = 0.3
add_child(sci_fi_btn)
```

## Generated Textures

Located in `api/debug-output/ui-textures/`:
- 6 arcade textures generated
- Ready to copy to Godot project
- All 512x512, tileable, seamless
