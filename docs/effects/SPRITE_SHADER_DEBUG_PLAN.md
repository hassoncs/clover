# Sprite Shader WebGL Debug Plan

## Problem Summary

Sprite-level shader effects are failing in WebGL. Effects that work vs fail follow a clear pattern:

### Working Effects
- **tint** - Simple color mix with uniform color
- **holographic** - Uses `TIME` and UV coordinates for color cycling
- **rainbow** - Uses `TIME` and UV for hue shifting
- **silhouette** - Replaces color while preserving alpha

### Failing Effects (Turn White)
- **outline** - Samples neighboring pixels to detect edges
- **glow** - Samples surrounding pixels for blur/glow effect
- **pixelate** - Snaps UV to grid, samples at new position
- **wave** - Offsets UV coordinates, samples at new position
- **dissolve** - Uses noise texture sampling
- **flash** - Should work but may have parameter issues
- **posterize** - Math operations on color values
- **rim_light** - Samples neighbors for edge detection

### Pattern Analysis

| Category | Behavior | Examples |
|----------|----------|----------|
| Works | Only reads `texture(TEXTURE, UV)` once at current UV | tint, silhouette, rainbow |
| Fails | Reads texture at offset UVs: `texture(TEXTURE, UV + offset)` | outline, glow, wave |
| Fails | Calculates new UV then samples: `texture(TEXTURE, new_uv)` | pixelate |
| Fails | Uses `TEXTURE_PIXEL_SIZE` for calculations | outline, glow, pixelate |

## Root Cause Hypotheses

### Hypothesis 1: TEXTURE_PIXEL_SIZE is Invalid
In WebGL, `TEXTURE_PIXEL_SIZE` may return `vec2(0, 0)` or invalid values for dynamically-created sprites (Polygon2D, procedural textures).

**Test**: Add shader that outputs `TEXTURE_PIXEL_SIZE` as color to visualize it.

### Hypothesis 2: Texture Sampling Outside Bounds
When sampling at `UV + offset`, if UV goes outside [0,1] range and texture repeat is disabled, WebGL may return white/error.

**Test**: Clamp all UV samples to [0.001, 0.999] range.

### Hypothesis 3: No Actual Texture Bound
The Polygon2D shapes in the VFX showcase don't have actual textures - they're just colored polygons. The `TEXTURE` sampler may be unbound or point to a 1x1 white texture.

**Test**: Use `Sprite2D` with actual PNG textures instead of `Polygon2D`.

### Hypothesis 4: WebGL Shader Compilation Failing Silently
Some GLSL constructs compile on native but fail on WebGL, causing fallback to white.

**Test**: Check browser console for shader compilation errors.

## Investigation Steps

### Step 1: Verify Texture Binding
Create a debug shader that just outputs the raw texture:
```glsl
shader_type canvas_item;
void fragment() {
    COLOR = texture(TEXTURE, UV);
}
```
If this shows white on Polygon2D, the issue is no texture is bound.

### Step 2: Test TEXTURE_PIXEL_SIZE
```glsl
shader_type canvas_item;
void fragment() {
    // Visualize TEXTURE_PIXEL_SIZE - should show gradient if valid
    COLOR = vec4(TEXTURE_PIXEL_SIZE.x * 100.0, TEXTURE_PIXEL_SIZE.y * 100.0, 0.0, 1.0);
}
```

### Step 3: Test with Real Sprite Textures
Modify VFX showcase to use `Sprite2D` nodes with actual PNG images instead of `Polygon2D` with colors. This is the **most likely fix**.

### Step 4: Test UV Offset Sampling
```glsl
shader_type canvas_item;
void fragment() {
    vec2 test_uv = UV + vec2(0.01, 0.01);
    test_uv = clamp(test_uv, vec2(0.0), vec2(1.0));
    COLOR = texture(TEXTURE, test_uv);
}
```

## Recommended Fix: Use Sprite2D with Textures

The VFX showcase currently uses `Polygon2D` nodes which don't have textures. Sprite shaders that sample neighboring pixels **require an actual texture to sample from**.

### Changes Needed

#### 1. Update Game Definition Templates
Change from color-based shapes to image-based sprites:

```typescript
// Before (Polygon2D - no texture)
sprite: { type: "rect", width: 2, height: 2, color: "#4ECDC4" }

// After (Sprite2D - has texture)
sprite: { type: "image", url: "/assets/sprites/box.png", width: 2, height: 2 }
```

#### 2. Create Test Sprite Assets
Add simple sprite images to test with:
- `box.png` - Colored square with some detail
- `circle.png` - Colored circle with gradient
- `character.png` - Simple character sprite

#### 3. Update GameBridge Entity Creation
Ensure `Sprite2D` is used when `type: "image"` is specified, with proper texture loading.

#### 4. Modify VFX Showcase
Update `vfx_showcase.tsx` to use image-based sprites for effect testing.

## Alternative Fix: Procedural Texture Generation

If using images isn't desired, generate textures procedurally in GDScript:

```gdscript
func _create_texture_for_polygon(polygon: Polygon2D, color: Color) -> void:
    var image = Image.create(64, 64, false, Image.FORMAT_RGBA8)
    image.fill(color)
    var texture = ImageTexture.create_from_image(image)
    polygon.texture = texture
```

This ensures `TEXTURE` is bound and `TEXTURE_PIXEL_SIZE` is valid.

## Files to Modify

| File | Change |
|------|--------|
| `app/app/examples/vfx_showcase.tsx` | Use image sprites in game definition |
| `godot_project/scripts/GameBridge.gd` | Ensure Sprite2D used for image types, or add texture to Polygon2D |
| `app/assets/sprites/` | Add test sprite images |
| All failing shaders | Add UV clamping as safety measure |

## Quick Verification Test

Before implementing full fix, test this theory:

1. Open Godot editor
2. Create a `Sprite2D` with an actual PNG texture
3. Apply the outline shader via inspector
4. Export to web and test

If outline works on `Sprite2D` but not `Polygon2D`, the hypothesis is confirmed.

## Console Debugging

Add to each shader for debugging:
```glsl
// At start of fragment()
if (TEXTURE_PIXEL_SIZE.x < 0.0001) {
    COLOR = vec4(1.0, 0.0, 0.0, 1.0); // Red = no valid texture size
    return; // Note: return may not work in WebGL, use else block
}
```

## Priority Order

1. **Confirm hypothesis** - Test with Sprite2D + real texture in Godot editor
2. **Quick fix for showcase** - Add procedural textures to Polygon2D in GameBridge
3. **Proper fix** - Support `type: "image"` sprites with URL loading
4. **Shader hardening** - Add UV clamping and fallbacks to all shaders

## Session Continuation Notes

When resuming this work:
1. The issue is NOT shader syntax (we fixed array initialization)
2. The issue is likely missing/invalid texture on Polygon2D nodes
3. Test with Sprite2D + PNG first to confirm
4. `TEXTURE_PIXEL_SIZE` being zero would explain all failures
5. Effects that only use `UV` (not offsets) work fine
