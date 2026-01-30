# UI Texture System - Godot Example

## Quick Start

1. **Open in Godot:**
   - Open Godot 4.x
   - Import project from `slopcade/godot/` folder
   - Open `examples/ui_texture_demo.tscn`

2. **Enable Texture Repeat:**
   - In Godot's FileSystem dock, select each texture in `assets/textures/ui/`
   - In Import tab, check **"Repeat"** checkbox
   - Click **"Reimport"**

3. **Run the Scene:**
   - Press F6 or click Play Scene
   - You'll see 5 buttons with different textures and styles
   - Hover and click to see state transitions

## What You See

### 5 Styled Buttons:
1. **Painted Metal** - Blue glow border, sharp bevel
2. **Worn Metal** - Gold/rust tones, heavier inner shadow
3. **Brushed Aluminum** - Subtle silver styling
4. **Neon Plastic (Blue)** - High glow, rounded corners
5. **Neon Plastic (Pink)** - Magenta accent, matching style

### Features Demonstrated:
- ✅ Rounded rectangle shapes (different radii)
- ✅ Drop shadows (offset + blur)
- ✅ Colored borders (glow effects)
- ✅ Bevel/emboss (3D lighting)
- ✅ Inner shadows (depth)
- ✅ State transitions (hover/pressed)

## Project Structure

```
godot/
├── project.godot                 # Project settings
├── assets/
│   └── textures/ui/              # Generated tileable textures
│       ├── arcade_painted_metal_*.png
│       ├── arcade_brushed_aluminum_*.png
│       └── arcade_neon_plastic_*.png
├── ui_shaders/
│   └── styled_surface.gdshader   # The magic shader
├── ui_components/
│   └── styled_button.gd          # Reusable button component
└── examples/
    └── ui_texture_demo.tscn      # This demo scene
```

## How It Works

### StyledButton Component

The `StyledButton` class extends Godot's Button and adds:
- Material texture slot
- Shader parameter controls
- State handling

**Key Properties (in Inspector):**
```gdscript
material_texture    # The tileable texture
corner_radius       # Button corner roundness (0 = square)
shadow_offset       # Drop shadow X/Y offset
shadow_size         # Shadow blur amount
shadow_color        # Shadow color + alpha
border_size         # Border thickness
border_color        # Border color + alpha
bevel_strength      # 3D bevel intensity
inner_shadow_strength  # Inner shadow depth
```

### Using in Your Own Scenes

**Method 1: In Editor**
1. Add `StyledButton` node to scene
2. Drag texture to `Material Texture` slot
3. Adjust styling in Inspector
4. Set button `Text` property

**Method 2: Via Code**
```gdscript
var btn = StyledButton.new()
btn.text = "PLAY GAME"
btn.material_texture = load("res://assets/textures/ui/my_texture.png")
btn.corner_radius = 24.0
btn.shadow_offset = Vector2(0, 6)
btn.border_color = Color(0.2, 0.8, 1, 0.5)
add_child(btn)
```

### Creating New Textures

Generate more textures using the script:
```bash
cd slopcade/api
npx tsx scripts/generate-ui-textures.ts [theme-name]
```

Themes available:
- `arcade` - Retro arcade metals/plastics
- `fantasy` - Stone, leather, parchment
- `scifi` - Carbon fiber, steel, holographic
- `candy` - Glossy sweet surfaces
- `nature` - Wood, stone, bamboo
- `cyberpunk` - Grime, rust, neon

Copy generated textures from `debug-output/ui-textures/` to `godot/assets/textures/ui/`

## Customizing the Shader

Edit `ui_shaders/styled_surface.gdshader` to adjust:

**Visual Effects:**
- `u_radius_px` - Corner roundness
- `u_shadow_px` - Shadow blur size
- `u_bevel_strength` - 3D depth
- `u_inner_strength` - Inner shadow depth

**Colors:**
- `u_tint` - Overall color multiplier
- `u_border_color` - Border tint
- `u_shadow_color` - Shadow tint
- `u_inner_color` - Inner shadow tint

## Tips

1. **Seamless Textures:** Ensure "Repeat" is enabled in texture import settings
2. **Tiling:** Use `texture_tiling` property to adjust texture scale
3. **Performance:** The shader is per-pixel; avoid too many overlapping shadows
4. **State Colors:** Use `normal_tint`, `hover_tint`, `pressed_tint` for color changes
5. **Size:** Buttons work at any size - texture tiles automatically

## Troubleshooting

**Textures look stretched:**
- Enable "Repeat" import setting
- Check `texture_tiling` property

**No rounded corners:**
- Increase `corner_radius` (try 12-30)
- Ensure button is large enough

**Shadow not visible:**
- Increase `shadow_size`
- Check `shadow_color` alpha
- Ensure shadow offset isn't zero

**Shader errors:**
- Ensure Godot 4.x (shader uses modern syntax)
- Check console for specific errors

## Next Steps

- Try different themes (fantasy, sci-fi, etc.)
- Create panels using same shader on TextureRect
- Animate shader parameters for cool effects
- Add icon support (TextureRect as child)
- Create theme system to swap textures dynamically
