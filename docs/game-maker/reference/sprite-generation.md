# AI Sprite Generation Research

> Research on reliable AI sprite generation for game assets, focused on Scenario.com integration.

---

## Executive Summary

**No single-pass AI solution produces production-ready sprite sheets with predictable positioning.** The most successful workflows combine specialized models, ControlNet conditioning, and rigorous post-processing pipelines. Character consistency across animation frames requires either LoRA training (85-92% accuracy) or IP-Adapter conditioning—prompting alone achieves only 23% character recognition.

The critical insight: **treat AI as a powerful starting point, not a finished pipeline.**

---

## Scenario.com Integration

### Available Models (Verified)

| Model ID | Name | Best For |
|----------|------|----------|
| `model_retrodiffusion-plus` | Retro Diffusion Plus | Static pixel art at **256×256 native** |
| `model_retrodiffusion-tile` | Retro Diffusion Tile | Seamless tilesets with smart material transitions |
| `model_retrodiffusion-animation` | Retro Diffusion Animation | Frame sequences in grid layouts (**32×32, 48×48**) |
| `model_p1dBcEaYQ5jUjB2brcf8bb1W` | Pixel Art XL 👾 | Higher-res pixel art with SDXL base |
| `model_pixel-snapper` | Pixel Snapper | Converting non-pixel art to pixel style |
| `model_scenario-grid-maker` | Grid Maker | Arranging images into sprite sheets |
| `model_scenario-image-slicer` | Image Slicer | Extracting frames from sheets |
| `model_uM7q4Ms6Y5X2PXie6oA9ygRa` | Environment Sprites 2.0 | Background/environment assets |
| `model_UVo8dCsJYYdiThdHvBPfWMYG` | Arcade Hero 2.0 | Character sprites |

### Retro Diffusion Specifics

**RD Plus** (`model_retrodiffusion-plus`):
- Native 256×256 resolution
- Limited palette output (ready for games)
- Best for: character portraits, item icons, UI elements

**RD Tile** (`model_retrodiffusion-tile`):
- Seamless tileset generation
- Smart material transitions
- Best for: ground tiles, wall tiles, environmental patterns

**RD Animation** (`model_retrodiffusion-animation`):
- Grid-aligned output at 32×32 or 48×48 per frame
- Frame sequences in horizontal rows
- Best for: walk cycles, attack animations, idle loops

---

## Prompt Engineering

### Effective Template Structure

Separate **character description**, **action/pose**, and **technical specifications**:

```
Task: Create a Game Sprite Sheet for a 2D side-scroller.
Character: A 16-bit pixel art knight in silver armor.
Action: A 6-frame walking animation cycle displayed in a horizontal row.
Details: Frame 1-6 show slight leg and arm movement variations.
Tech Specs: Uniform grid layout, clean pixel edges, transparent background, 
SNES aesthetic. No anti-aliasing.
```

### Key Structural Keywords

| Category | Keywords |
|----------|----------|
| Grid Structure | `sprite sheet`, `uniform grid layout`, `sequence frames`, `horizontal row`, `evenly spaced` |
| Era/Style | `8-bit`, `16-bit`, `32-bit`, `NES`, `SNES`, `GBA` |
| View | `front view`, `back view`, `side view`, `orthographic view`, `flat 2D` |
| Animation | `walk cycle`, `idle animation`, `attack sequence`, `contact, recoil, passing, high point` |

### Critical Negative Prompts

```
blurry, anti-aliasing, smooth shading, 3d render, realistic, gradients, 
soft edges, text, watermark, perspective distortion
```

---

## Model Selection Guidelines

### For Pixel Art Sprites

| Scenario | Recommended Model | Why |
|----------|-------------------|-----|
| Retro-style characters | `model_retrodiffusion-plus` | Purpose-built, limited palette |
| Animation frames | `model_retrodiffusion-animation` | Grid-aligned output |
| Tileable backgrounds | `model_retrodiffusion-tile` | Seamless transitions |
| Higher-detail pixel art | `model_p1dBcEaYQ5jUjB2brcf8bb1W` | SDXL quality |

### For Non-Pixel Art

| Scenario | Recommended Model |
|----------|-------------------|
| Cartoon characters | `model_c8zak5M1VGboxeMd8kJBr2fn` (Cartoon Characters 2.0) |
| 3D-style icons | `model_7v2vV6NRvm8i8jJm6DWHf6DM` (3D Icons) |
| UI elements | `model_mcYj5uGzXteUw6tKapsaDgBP` (Game UI Essentials 2.0) |
| Backgrounds | `model_hHuMquQ1QvEGHS1w7tGuYXud` (Cartoon Backgrounds 2.0) |

---

## Workflows by Asset Type

### Static Sprite (Single Entity)

```
1. Generate with RD Plus at 256×256
2. Remove background (if needed)
3. Validate dimensions
4. Quantize palette to 16 colors
5. Export as PNG with transparency
```

### Tileset (Seamless Backgrounds)

```
1. Generate with RD Tile
2. Validate seamless edges (test by tiling 2×2)
3. Slice into individual tiles
4. Export as tilemap
```

### Animation Sequence

```
1. Generate base keyframe with RD Plus
2. Use RD Animation for sequence OR
   Use image-to-image with base frame as reference
3. Validate frame consistency
4. Extract frames from grid
5. Center sprites in frames
6. Quantize all frames to same palette
7. Export as sprite sheet
```

---

## Post-Processing Pipeline

### Python Toolchain

```python
from PIL import Image
from rembg import remove

# 1. Background removal
def remove_background(image_path):
    with open(image_path, "rb") as f:
        return remove(f.read())

# 2. Grid validation
def validate_sprite_sheet(image_path, cols, rows, expected_w, expected_h):
    img = Image.open(image_path)
    sheet_w, sheet_h = img.size
    if sheet_w % cols != 0 or sheet_h % rows != 0:
        return False, "Dimensions don't divide evenly"
    frame_w, frame_h = sheet_w // cols, sheet_h // rows
    return (frame_w == expected_w and frame_h == expected_h), f"{frame_w}x{frame_h}"

# 3. Frame extraction
def slice_sprite_sheet(img, cols, rows):
    w, h = img.size
    frame_w, frame_h = w // cols, h // rows
    frames = []
    for row in range(rows):
        for col in range(cols):
            box = (col * frame_w, row * frame_h, 
                   (col + 1) * frame_w, (row + 1) * frame_h)
            frames.append(img.crop(box))
    return frames

# 4. Center sprite in frame
def center_sprite(sprite, frame_w, frame_h):
    bbox = sprite.getbbox()
    if not bbox: 
        return Image.new('RGBA', (frame_w, frame_h), (0,0,0,0))
    cropped = sprite.crop(bbox)
    x_off = (frame_w - cropped.width) // 2
    y_off = (frame_h - cropped.height) // 2
    frame = Image.new('RGBA', (frame_w, frame_h), (0,0,0,0))
    frame.paste(cropped, (x_off, y_off), cropped)
    return frame

# 5. Palette quantization (critical for pixel art)
def quantize_palette(img, colors=16):
    return img.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.Dither.NONE)
```

### Resolution Math

Generate at **8x target size**, then downscale with **nearest neighbor**:
- For 64×64 sprites → generate at 512×512
- For 128×128 sprites → generate at 1024×1024

```python
# CORRECT: Nearest neighbor preserves pixel boundaries
scaled = img.resize((img.width // 8, img.height // 8), Image.NEAREST)

# WRONG: Bilinear/bicubic introduces anti-aliasing
# scaled = img.resize(..., Image.BILINEAR)  # DON'T DO THIS
```

---

## Character Consistency

### Without Training (Quick)

**IP-Adapter approach:**
1. Generate ONE perfect reference frame
2. Use image-to-image with reference for subsequent poses
3. Denoising strength 0.4-0.6 (lower = more preservation)
4. Lock seed values across batch

### With LoRA Training (Best Quality)

- Train on **15-20 reference images**
- **15-20 epochs**, learning rate **0.0002**
- Apply at strength **1.0-1.2**
- Achieves **85-92% character accuracy** (vs 23% prompt-only)
- Scenario.com accepts **5-15 images** for custom model training

---

## What Actually Works (Practitioner Consensus)

✅ **Do:**
- Lock seed values once you get satisfactory base images
- Use same settings across entire batches
- Generate multiple variations and discard drift
- Manual cleanup in Aseprite/Photoshop for final polish
- Use reference frame strategy for animation

❌ **Don't:**
- Expect pixel-perfect grids from raw AI output
- Generate complete animation sequences in single prompts
- Maintain character consistency without LoRA/IP-Adapter
- Switch styles between generations (drops recognition to 31%)

---

## Clover Integration Plan

### Phase 6 Implementation

1. **Placeholder System** (Immediate)
   - Generate colored shapes instantly based on entity type
   - Show loading indicator while AI generates

2. **Static Sprites** (Week 1)
   - Integrate Scenario.com API for single entity generation
   - Use RD Plus for pixel art style
   - Implement background removal

3. **Style Consistency** (Week 1-2)
   - Extract theme from user prompt
   - Apply consistent style prompt across all entities
   - Consider custom LoRA for recurring characters

4. **Animation Support** (Week 2)
   - Use RD Animation for frame sequences
   - Implement frame extraction pipeline
   - Add sprite sheet assembly

5. **Asset Storage** (Week 2)
   - R2 bucket for generated assets
   - CDN URLs for fast loading
   - Cache and reuse similar assets

---

## API Reference

### Scenario.com MCP Tools Available

| Tool | Purpose |
|------|---------|
| `generate_image` | Text-to-image generation with model selection |
| `image_to_image` | Transform existing image with prompt |
| `remove_background` | Extract foreground with transparency |
| `generate_layered_image` | Decompose image into layers |
| `upload_image` | Upload image as asset for reference |
| `list_models` | Query available models |

### Example: Generate Pixel Art Character

```typescript
// Using MCP tool
await mcp_scenario-image-gen_generate_image({
  prompt: "pixel art knight character, 16-bit style, side view, silver armor, sword, transparent background",
  model_id: "model_retrodiffusion-plus",
  output_path: "/path/to/knight.png",
  width: 256,
  height: 256,
  guidance: 3.5,
  num_steps: 28
});
```

---

## References

- Scenario.com Documentation
- "Sprite Sheet Diffusion" (arXiv 2412.03685)
- Lospec.com (color palettes)
- Civitai (community models and resources)
