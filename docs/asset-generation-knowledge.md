# Asset Generation & Image Mapping - Current Knowledge

> Living document tracking our understanding of the asset generation pipeline. Update as we iterate.

**Last Updated**: 2026-01-23

---

## Quick Start: Generate Assets for a Game

```bash
# Run the physics stacker generation script (generates all sprites + background)
hush run -- npx tsx api/scripts/generate-physics-stacker-assets.ts

# Or dry-run to see prompts without API calls
hush run -- npx tsx api/scripts/generate-physics-stacker-assets.ts --dry-run
```

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ASSET GENERATION FLOW                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  SPRITES (entities with physics bodies):                                      │
│                                                                               │
│  1. SILHOUETTE CREATION                                                       │
│     Physics body (width × height) → Black shape on white 512×512 PNG          │
│     Shape fills 90% of canvas, preserving aspect ratio                        │
│                                                                               │
│  2. IMG2IMG GENERATION (Scenario.com)                                         │
│     Upload silhouette → img2img with prompt → Generated image                 │
│     Model: flux.1-dev | Strength: 0.95 | Guidance: 3.5                        │
│                                                                               │
│  3. BACKGROUND REMOVAL                                                        │
│     Generated image → Transparent PNG sprite                                  │
│                                                                               │
│  4. STORAGE & DELIVERY                                                        │
│     Final PNG → R2 bucket → Public URL → Godot texture                        │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  BACKGROUNDS (no physics, cover full canvas):                                 │
│                                                                               │
│  1. TEXT-TO-IMAGE GENERATION (Scenario.com)                                   │
│     Prompt only → 1024×1024 image (no silhouette needed)                      │
│                                                                               │
│  2. STORAGE & DELIVERY                                                        │
│     Final image → R2 bucket → Public URL → Godot background sprite            │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Working Example: Physics Stacker Generation Script

### Location

```
api/scripts/generate-physics-stacker-assets.ts
```

### What It Does

1. Defines all game templates with physics dimensions and descriptions
2. For each template: creates silhouette → img2img → remove background → save & upload
3. Generates a background image via text-to-image
4. Uploads all assets to prod R2 bucket (`slopcade-assets`)

### Template Specification

```typescript
interface TemplateSpec {
  id: string;                    // Template ID (matches game definition)
  shape: 'box' | 'circle';       // Physics shape
  width: number;                 // Physics width in meters
  height: number;                // Physics height in meters
  entityType: EntityType;        // For prompt hints: platform, item, character, etc.
  color: string;                 // Fallback color (not used in generation)
  description?: string;          // AI prompt description (key for good results!)
  skipGeneration?: boolean;      // Skip this template
}
```

### Example Templates

```typescript
const PHYSICS_STACKER_TEMPLATES: TemplateSpec[] = [
  { 
    id: 'foundation', 
    shape: 'box', 
    width: 4.0, 
    height: 0.6, 
    entityType: 'platform', 
    color: '#8B4513', 
    description: 'a sturdy wooden table or shelf that blocks rest on' 
  },
  { 
    id: 'dropper', 
    shape: 'box', 
    width: 2.0, 
    height: 0.3, 
    entityType: 'ui', 
    color: '#666666', 
    description: "a cartoon child's hand reaching down, palm facing down, fingers slightly curled as if about to drop something" 
  },
  { 
    id: 'blockWide', 
    shape: 'box', 
    width: 1.8, 
    height: 0.6, 
    entityType: 'item', 
    color: '#FF69B4', 
    description: 'a wide rectangular wooden toy block with rounded edges' 
  },
  // ... more templates
];
```

---

## Prompt Engineering Best Practices

### Structure

The prompt is built in sections, each critical for consistent results:

```
=== CAMERA/VIEW (CRITICAL) ===
FRONT VIEW. Camera is directly facing the front of the object.
Flat, 2D perspective. NO 3D rotation, NO angled view, NO side view.
Like a sprite in a 2D side-scrolling platformer game.
The object faces the viewer head-on.

=== SHAPE (CRITICAL - MUST MATCH EXACTLY) ===
[Auto-generated from physics dimensions]
WIDE HORIZONTAL RECTANGLE (3.0:1). Like a brick on its side.

=== COMPOSITION ===
The object FILLS THE ENTIRE FRAME. No empty space around it.

=== SUBJECT ===
A [description], [theme] style for a video game.
[Entity type hint: "This is a stackable block in a stacking game."]

=== STYLE ===
[Style aesthetics: cartoon, pixel, 3d, flat]

=== TECHNICAL REQUIREMENTS ===
Transparent background (alpha channel).
Game sprite asset for 2D game.
[Style technicals]
Single object only, no duplicates.
No text, watermarks, or signatures.
Flat front-facing view only.
```

### Key Insights

1. **Camera/View is CRITICAL**: Without explicit front-view instructions, AI tends to generate 3D perspective angles
2. **Shape description matters**: Describe the aspect ratio explicitly ("WIDE HORIZONTAL RECTANGLE (3.0:1)")
3. **Description field**: Provide rich, specific descriptions for each template - don't rely on ID alone
4. **Theme consistency**: Pass a theme string that applies to all assets ("wooden toy blocks, children's toy aesthetic")

### Style Options

```typescript
const STYLE_DESCRIPTORS = {
  pixel: {
    aesthetic: 'pixel art, 16-bit retro game style, crisp pixels',
    technical: 'no anti-aliasing, sharp pixel edges, limited color palette',
  },
  cartoon: {
    aesthetic: 'cartoon style, bold black outlines, vibrant saturated colors',
    technical: 'cel-shaded, clean vector-like edges, flat color fills',
  },
  '3d': {
    aesthetic: '3D rendered, stylized low-poly, soft ambient occlusion',
    technical: 'clean geometry, subtle shadows, matte materials',
  },
  flat: {
    aesthetic: 'flat design, geometric shapes, modern minimal',
    technical: 'no gradients, solid colors, clean vector shapes',
  },
};
```

---

## Silhouette Creation

### Algorithm

```typescript
async function createSilhouettePng(
  shape: 'box' | 'circle',
  physicsWidth: number,
  physicsHeight: number,
  canvasSize: number = 512
): Promise<Buffer> {
  const aspectRatio = physicsWidth / physicsHeight;

  let shapeWidth: number, shapeHeight: number;
  if (aspectRatio >= 1) {
    // Wider than tall: fill width, calculate height
    shapeWidth = Math.floor(canvasSize * 0.9);  // 90% of canvas
    shapeHeight = Math.floor(shapeWidth / aspectRatio);
  } else {
    // Taller than wide: fill height, calculate width
    shapeHeight = Math.floor(canvasSize * 0.9);
    shapeWidth = Math.floor(shapeHeight * aspectRatio);
  }

  // Center the shape
  const x = Math.floor((canvasSize - shapeWidth) / 2);
  const y = Math.floor((canvasSize - shapeHeight) / 2);

  // Generate SVG with black shape on white background
  // ... sharp(svg).png().toBuffer()
}
```

### Key Point: 90% Fill Ratio

The silhouette fills 90% of the canvas on its larger dimension. This is important for the Godot scaling logic.

---

## Godot Sprite Scaling

### The Problem

Generated images are 512×512 with the actual content (silhouette) only filling part of the canvas. If we scale the full image to match physics dimensions, the content gets distorted.

### The Solution

Godot's `_apply_sprite_scale()` detects square textures and applies uniform scaling based on the silhouette dimensions:

```gdscript
func _apply_sprite_scale(sprite, sprite_data, texture):
    var tex_w = texture.get_width()
    var tex_h = texture.get_height()
    var is_square_texture = abs(tex_w - tex_h) < 2
    
    if is_square_texture and tex_w > 0:
        # Calculate silhouette dimensions (matches generation logic)
        var canvas_size = float(tex_w)
        var fill_ratio = 0.9
        var aspect_ratio = physics_w / physics_h
        
        var silhouette_w: float
        var silhouette_h: float
        if aspect_ratio >= 1.0:
            silhouette_w = canvas_size * fill_ratio
            silhouette_h = silhouette_w / aspect_ratio
        else:
            silhouette_h = canvas_size * fill_ratio
            silhouette_w = silhouette_h * aspect_ratio
        
        # Uniform scale to match target physics size
        var uniform_scale = target_w / silhouette_w
        sprite.scale = Vector2(uniform_scale, uniform_scale)
```

This ensures the transparent padding scales proportionally with the content.

---

## Background Generation

### No Silhouette Needed

Backgrounds use text-to-image directly:

```typescript
const bgPrompt = [
  "A cozy children's playroom background for a video game.",
  "Soft bokeh blur effect, out of focus.",
  "Warm pastel colors, gentle lighting.",
  "Wooden floor, soft toys and building blocks visible but blurry.",
  "Cartoon style, cheerful atmosphere.",
  "No text, no characters, just the environment.",
].join(' ');

const bgAssetIds = await client.generateTextToImage(bgPrompt, 1024, 1024);
```

### Godot Background Rendering

```gdscript
func _setup_background(bg_data: Dictionary) -> void:
    # Position at center of game bounds
    _background_sprite.position = Vector2(target_width / 2.0, target_height / 2.0)
    
    # Scale to cover (may crop edges, no gaps)
    var scale_x = target_width / tex_w
    var scale_y = target_height / tex_h
    var uniform_scale = max(scale_x, scale_y)
    _background_sprite.scale = Vector2(uniform_scale, uniform_scale)
```

### Game Definition

```typescript
const game: GameDefinition = {
  // ...
  background: {
    type: "static",
    imageUrl: `${ASSET_BASE}/background.jpg`,
  },
  // ...
};
```

---

## R2 Storage

### Upload via Wrangler

```typescript
import { execSync } from 'child_process';

async function uploadToR2(filePath: string, fileName: string): Promise<string> {
  const r2Key = `generated/item/${fileName}`;
  execSync(
    `npx wrangler r2 object put "slopcade-assets/${r2Key}" --file="${filePath}" --content-type="image/png" --remote`,
    { stdio: 'pipe', cwd: path.join(__dirname, '..') }
  );
  return r2Key;
}
```

### Public URL Pattern

```
https://slopcade-api.hassoncs.workers.dev/assets/generated/item/{filename}.png
```

### R2 Buckets

| Bucket | Environment |
|--------|-------------|
| `slopcade-assets` | Production |
| `slopcade-assets-dev` | Preview/Dev |

---

## Schema: EntityTemplate Description Field

Templates now support a `description` field for AI generation:

```typescript
// shared/src/types/entity.ts
export interface EntityTemplate {
  id: string;
  description?: string;  // Human-readable description for AI image generation
  sprite?: SpriteComponent;
  physics?: PhysicsComponent;
  behaviors?: Behavior[];
  tags?: string[];
  layer?: number;
  slots?: Record<string, SlotDefinition>;
}
```

---

## Schema: Background Config

```typescript
// shared/src/types/GameDefinition.ts

export interface StaticBackground {
  type: 'static';
  imageUrl?: string;
  color?: string;
}

export interface ParallaxBackground {
  type: 'parallax';
  layers: ParallaxLayer[];
}

export type BackgroundConfig = StaticBackground | ParallaxBackground;

export interface GameDefinition {
  // ...
  background?: BackgroundConfig;
  // ...
}
```

---

## Scenario.com API

### Authentication

```
Authorization: Basic base64(API_KEY:SECRET_KEY)
```

Use `hush run -- ...` to inject secrets from hush vault.

### API URL

```
https://api.cloud.scenario.com/v1
```

Note: NOT `api.scenario.com` - must use `api.cloud.scenario.com`.

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /assets` | Upload image (base64) |
| `POST /generate` | Text-to-image generation |
| `POST /generate/img2img` | Image-to-image with silhouette |
| `POST /generate/remove-background` | Extract sprite |
| `GET /jobs/{jobId}` | Poll job status |
| `GET /assets/{assetId}` | Get asset URL for download |

### Generation Parameters

```typescript
{
  modelId: 'flux.1-dev',
  prompt: string,
  image: assetId,        // For img2img only
  strength: 0.95,        // For img2img only (how much to transform)
  numSamples: 1,
  guidance: 3.5,
  numInferenceSteps: 28,
  width: 1024,           // For text-to-image
  height: 1024,          // For text-to-image
}
```

### Job Polling

```typescript
async pollJob(jobId: string, maxAttempts = 120): Promise<string[]> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await request('GET', `/jobs/${jobId}`);
    if (res.job?.status === 'success') {
      return res.job.metadata.assetIds;
    }
    if (res.job?.status === 'failed' || res.job?.status === 'cancelled') {
      throw new Error(res.job.error);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Job timed out');
}
```

---

## Debug Output

All intermediate files are saved to `api/debug-output/physics-stacker/`:

```
api/debug-output/physics-stacker/
├── foundation_1_silhouette.png     # Input silhouette
├── foundation_2_prompt.txt         # Full prompt + negative prompt
├── foundation_3_generated.jpg      # Generated image (before bg removal)
├── foundation_4_final.png          # Final transparent PNG
├── background_final.jpg            # Background image
└── run-{timestamp}_manifest.json   # Config, results, timing
```

---

## CLI Options

```bash
hush run -- npx tsx api/scripts/generate-physics-stacker-assets.ts [options]

Options:
  --dry-run           Only generate silhouettes and prompts, skip API calls
  --template=NAME     Only generate for specific template
  --theme="..."       Theme prompt (default: "wooden toy blocks")
  --style=pixel       Style: pixel, cartoon, 3d, flat (default: cartoon)
```

---

## Gotchas & Lessons Learned

### 1. API URL
Use `api.cloud.scenario.com`, not `api.scenario.com`.

### 2. Job Timeouts
Complex img2img jobs can take 2+ minutes. Set polling to 120 attempts (4 min).

### 3. Camera Perspective
Without explicit "FRONT VIEW" instructions, AI generates 3D angled perspectives.

### 4. Description Field
The template ID alone (like "dropper") produces poor results. Add rich descriptions.

### 5. Square Texture Scaling
Generated 512×512 images need special handling in Godot to avoid distortion.

### 6. Background Positioning
Backgrounds need to be centered at (width/2, height/2) and scaled with `max()`.

### 7. R2 Local vs Remote
Use `--remote` flag with wrangler to upload to actual R2, not local emulator.

---

## Next Steps / TODO

- [ ] Wire asset pack placement values through React→Godot flow
- [ ] Create scripts for other test games (breakout, pinball, etc.)
- [ ] Add batch generation for multiple games
- [ ] Implement retry logic for API failures
- [ ] Add asset caching to avoid regenerating unchanged assets
- [ ] Create asset alignment UI for fine-tuning placement
