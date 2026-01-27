# Headless Image Compositing Options for Serverless

**Status:** Decision Made  
**Created:** 2026-01-26  
**Updated:** 2026-01-26  
**Question:** What are our options for server-side text rendering and image compositing in a serverless/cloud environment?

---

## Decision Summary

**Core insight:** We are designing a **rendering DSL**, not a single renderer. The `textConfig` object is the product; renderers are backends that implement `render(config) → image`.

| Use Case | Decision | Why |
|----------|----------|-----|
| **Designer Preview** | Godot WASM in browser | Source of truth, full effect parity |
| **Game Runtime** | Client-side Godot compositing | ✅ **Canonical architecture** |
| **Static CDN Assets (future)** | Modal.com + Pillow/Cairo | Only when needed for baked assets |
| **Edge-only UI labels** | resvg SVG → PNG | Degradation layer, simple labels only |
| **Trying to unify everything** | ❌ Don't | Different jobs need different tools |

**Key realization:** Bevel/emboss is lighting simulation (needs normals/shaders). Let Godot own "hero visuals" - don't fake it everywhere.

---

## The Problem

We need to composite styled text (with effects like glow, bevel, gradients, shadows) onto AI-generated UI components. This must work in a serverless environment, ideally Cloudflare Workers.

### Constraints

| Platform | Worker Size Limit | WASM Support | Native Bindings |
|----------|-------------------|--------------|-----------------|
| **Cloudflare Workers** | 10MB (paid) | Yes, but size-limited | ❌ No |
| **Vercel Edge Functions** | 1MB (edge), 50MB (serverless) | Yes | ❌ No (edge) |
| **AWS Lambda** | 250MB (unzipped) | Yes | ✅ Yes |
| **Modal.com** | No limit (containers) | N/A | ✅ Yes |
| **Fly.io** | No limit (containers) | N/A | ✅ Yes |

### Our Current Assets

- **Godot WASM:** 38MB - Too large for CF Workers
- **Sharp:** Native bindings - Won't work on CF Workers
- **Godot Shaders:** Full text effect support (glow, shadow, bevel, etc.)

---

## Option Analysis

### Option 1: Modal.com (Recommended for Complex Rendering)

**What:** Serverless Python/Node containers with GPU support

**Pros:**
- Full Sharp/Pillow/Cairo support
- Can run Godot headless with X virtual framebuffer
- Pay-per-use, scales to zero
- GPU available for fast rendering
- Python ecosystem (Pillow, Wand, Cairo)

**Cons:**
- Another vendor dependency
- Latency for cold starts (~1-3s)
- Additional API hop from CF Worker

**Implementation:**
```python
# modal_renderer.py
import modal
from PIL import Image, ImageDraw, ImageFont, ImageFilter

app = modal.App("text-renderer")
image = modal.Image.debian_slim().pip_install("pillow", "sharp")

@app.function(image=image)
def render_text_with_effects(text: str, effects: dict) -> bytes:
    # Create image with Pillow
    # Apply effects (shadow, glow, bevel)
    # Return PNG bytes
    pass
```

**Cost:** ~$0.001 per render (estimate)

---

### Option 2: Pillow/PIL on AWS Lambda or Vercel Serverless

**What:** Python image library, works in Lambda

**Pros:**
- Battle-tested library
- Can do: gradients, shadows (via blur), stroke
- Lambda has higher size limits (250MB)

**Cons:**
- Bevel/emboss would need manual implementation
- Limited compared to Photoshop effects
- Need to leave CF Workers ecosystem

**Implementation:**
```python
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def render_styled_text(text, font_path, effects):
    # Create transparent canvas
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Drop shadow (draw text offset, blur)
    if effects.get('dropShadow'):
        shadow = create_shadow(text, effects['dropShadow'])
        img = Image.alpha_composite(img, shadow)
    
    # Main text
    draw.text((x, y), text, font=font, fill=effects['fill']['color'])
    
    # Glow (blur a copy, composite behind)
    if effects.get('outerGlow'):
        glow = create_glow(text, effects['outerGlow'])
        img = Image.alpha_composite(glow, img)
    
    return img
```

**Pillow Effect Support:**
| Effect | Pillow Support | Difficulty |
|--------|----------------|------------|
| Solid fill | ✅ Native | Easy |
| Gradient fill | ⚠️ Manual loop | Medium |
| Stroke/outline | ✅ Native (basic) | Easy |
| Drop shadow | ⚠️ Blur + offset | Medium |
| Outer glow | ⚠️ Blur | Medium |
| Inner glow | ⚠️ Complex masking | Hard |
| Bevel/emboss | ⚠️ Very complex | Hard |
| Distortion | ❌ Not practical | N/A |

---

### Option 3: Cairo + Pango (Best Open Source Text Rendering)

**What:** Professional-grade 2D graphics library with excellent text support

**Pros:**
- Industry standard for text rendering
- Full Unicode/shaping support (via Pango)
- Path operations for complex effects
- Used by GTK, Inkscape, etc.

**Cons:**
- C library, needs Python bindings (pycairo)
- Still needs Lambda or container (not CF Workers)
- Steeper learning curve

**Implementation:**
```python
import cairo
import gi
gi.require_version('Pango', '1.0')
gi.require_version('PangoCairo', '1.0')
from gi.repository import Pango, PangoCairo

def render_text_cairo(text, font, effects):
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    ctx = cairo.Context(surface)
    
    layout = PangoCairo.create_layout(ctx)
    layout.set_text(text, -1)
    layout.set_font_description(Pango.FontDescription(font))
    
    # Shadow
    if effects.get('dropShadow'):
        ctx.save()
        ctx.translate(shadow_x, shadow_y)
        ctx.set_source_rgba(*shadow_color)
        PangoCairo.show_layout(ctx, layout)
        ctx.restore()
    
    # Main text
    ctx.set_source_rgba(*fill_color)
    PangoCairo.show_layout(ctx, layout)
    
    return surface.write_to_png()
```

---

### Option 4: Headless Puppeteer/Playwright

**What:** Run actual browser, screenshot CSS-styled text

**Pros:**
- Full CSS text effects (text-shadow, gradients, etc.)
- Most accurate to web preview
- Can use our text-shadertoy code directly

**Cons:**
- Heavy (~200MB+ for Chromium)
- Slow startup (1-3s cold start)
- Overkill for simple text

**Works on:** Modal.com, AWS Lambda (with layers), Fly.io

---

### Option 5: WASM-based Solutions for Edge

**What:** Lightweight WASM libraries that work on CF Workers

**Libraries:**
- **jSquash** - JPEG/PNG encoding, no text
- **Photon** - Rust image library compiled to WASM, basic filters
- **resvg** - SVG rendering to PNG (could work for styled text!)

**resvg Approach:**
```typescript
// Render styled text as SVG, then rasterize with resvg
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="64">
  <defs>
    <filter id="shadow">
      <feDropShadow dx="2" dy="2" stdDeviation="2"/>
    </filter>
    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ff6b6b"/>
      <stop offset="100%" style="stop-color:#48dbfb"/>
    </linearGradient>
  </defs>
  <text x="10" y="40" 
        font-family="Arial" font-size="32"
        fill="url(#grad)" filter="url(#shadow)">
    PLAY
  </text>
</svg>`;

import { Resvg } from '@aspect-build/resvg';
const resvg = new Resvg(svg);
const png = resvg.render().asPng();
```

**Pros:**
- Works on CF Workers! (~2MB WASM)
- SVG has good effect support (filters, gradients)
- Deterministic rendering

**Cons:**
- SVG text effects are different from Photoshop
- Font loading is tricky
- No bevel/emboss in SVG filters

---

### Option 6: Defer to Client (Recommended for MVP)

**What:** Store base image + text config, composite at runtime in Godot

**Pros:**
- No server-side rendering needed
- Text can be localized
- Effects can be tweaked without regeneration
- Already have Godot with all effects

**Cons:**
- Larger runtime memory
- Text must be rendered each load
- Can't pre-generate static assets

**Implementation:**
```typescript
// Store in R2
{
  baseImage: "ui/button_base.png",
  textConfig: {
    text: "PLAY",
    font: "Roboto",
    effects: {
      fill: { type: "gradient", ... },
      stroke: { enabled: true, ... },
      dropShadow: { ... },
      outerGlow: { ... }
    }
  }
}

// Client (Godot) composites at runtime
func load_ui_button(config):
    var base = load_texture(config.baseImage)
    var label = create_styled_label(config.textConfig)
    # Godot renders composite
```

---

## Recommendation Matrix (UPDATED)

| Use Case | Recommended Option | Notes |
|----------|-------------------|-------|
| **Admin Panel Preview** | Godot WASM in browser | Source of truth |
| **Production Runtime** | ✅ Client-side Godot | **Canonical - not just MVP** |
| **Pre-rendered Assets (future)** | Modal.com + Pillow/Cairo | Optimization, not foundation |
| **Edge-only Simple Labels** | resvg SVG → PNG | Degradation layer only |

**The rendering DSL pattern:**
```typescript
interface TextConfig {
  text: string;
  font: string;
  effects: {
    fill: FillConfig;
    stroke: StrokeConfig;
    dropShadow: ShadowConfig;
    outerGlow: GlowConfig;
    // bevel: BevelConfig; // Hero-only, Godot-exclusive
  };
}

// Multiple backends implement this contract:
type RenderBackend = (config: TextConfig) => Promise<ImageBuffer>;
```

Each backend (Godot, SVG, Pillow) implements `render(config) → image`. They do NOT need perfect parity.

---

## Research Questions for Further Investigation

1. **resvg on CF Workers:** What's the actual WASM size? Font loading support?
2. **Modal.com Latency:** What's the cold start time for a simple Pillow render?
3. **SVG Filter Parity:** Can SVG filters approximate our Godot shader effects?
4. **Godot Headless on Modal:** Can we run `godot --headless` in a Modal container?

---

## Next Steps

1. [ ] Test resvg WASM on Cloudflare Workers with font loading
2. [ ] Create Modal.com proof-of-concept with Pillow text effects
3. [ ] Document SVG filter equivalents for our Godot shaders
4. [ ] Implement "defer to client" approach for MVP

---

## References

- [Modal.com Examples](https://modal.com/docs/examples)
- [resvg WASM](https://github.com/nickytonline/resvg-wasm)
- [Pillow ImageFilter](https://pillow.readthedocs.io/en/stable/reference/ImageFilter.html)
- [Cairo Text](https://pycairo.readthedocs.io/en/latest/reference/text.html)
- [SVG Filter Effects](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Filter_effects)
