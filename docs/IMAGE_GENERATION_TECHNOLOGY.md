# Image Generation Technology Stack

This document describes our image generation infrastructure using Modal ComfyUI.

## Overview

We use **Modal** (serverless GPU platform) running **ComfyUI** (open-source image generation software) with the **Flux.1-dev-fp8** model.

**Architecture:**
```
Your Code → Modal (Cloud GPU) → ComfyUI → Flux Model → Images
```

**Key Benefits:**
- No API keys required for default endpoint
- Full control over generation parameters
- Custom workflows (txt2img, img2img, background removal, layered)
- Scales from $0 (no usage) to any volume

---

## Deployment

**Modal App:** `slopcade-comfyui`  
**Endpoint:** `https://hassoncs--slopcade-comfyui-web-img2img.modal.run`  
**GPU:** NVIDIA A10G (24GB VRAM)  
**Location:** `api/modal/comfyui.py`

### Available Functions

#### 1. txt2img - Text to Image
Generate images from text descriptions.

```python
result = worker.txt2img.remote(
    prompt="A heroic pixel art knight, 16-bit style",
    width=512,
    height=512,
    steps=20,
    guidance=3.5
)
# Returns: base64 encoded PNG
```

**Parameters:**
- `prompt` (string) - Image description
- `width` (number, default: 512) - Output width in pixels
- `height` (number, default: 512) - Output height in pixels
- `steps` (number, default: 20) - Denoising steps (10-30)
- `guidance` (number, default: 3.5) - CFG scale (how closely to follow prompt)
- `seed` (number, optional) - Random seed for reproducibility

**Typical Use:** Entity sprites, characters, items

---

#### 2. img2img - Image to Image
Transform existing images.

```python
result = worker.img2img.remote(
    prompt="Make it glow with magical aura",
    image_base64=original_image,
    strength=0.6,  # 0.0-1.0, higher = more change
    steps=20
)
```

**Parameters:**
- `prompt` (string) - Transformation description
- `image_base64` (string) - Input image as base64
- `strength` (number, default: 0.5) - How much to change (0.0-1.0)
- `steps` (number, default: 20) - Generation steps
- `guidance` (number, default: 3.5) - CFG scale
- `seed` (number, optional) - Random seed

**Typical Use:** Style variations, adding effects, modifying existing assets

---

#### 3. removeBackground - Background Removal
Remove backgrounds using RMBG model.

```python
result = worker.remove_background.remote(
    image_base64=input_image
)
```

**Parameters:**
- `image_base64` (string) - Input image as base64

**Returns:** PNG with transparent background

**Typical Use:** Creating game sprites with transparency

---

#### 4. generateLayered - Parallax Backgrounds
Generate multi-layer backgrounds for parallax scrolling.

```python
result = worker.generate_layered.remote(
    base_prompt="pixel art forest landscape",
    layers=[
        {"depth": "sky", "prompt": "blue sky with clouds"},
        {"depth": "far", "prompt": "distant mountains"},
        {"depth": "mid", "prompt": "pine trees"},
        {"depth": "near", "prompt": "foreground bushes"}
    ],
    width=1024,
    height=512,
    steps=15
)
# Returns: [{"depth": "sky", "image_base64": "..."}, ...]
```

**Parameters:**
- `base_prompt` (string) - Base scene description
- `layers` (list) - Array of layer configs
  - `depth`: "sky" | "far" | "mid" | "near"
  - `prompt`: Description for this layer
- `width` (number, default: 1024) - Output width
- `height` (number, default: 512) - Output height
- `steps` (number, default: 20) - Steps per layer
- `seed` (number, optional) - Base random seed

**Typical Use:** Game backgrounds with depth/parallax

---

## TypeScript Client

**File:** `api/src/ai/comfyui.ts`

### Usage

```typescript
import { createComfyUIClient } from './ai';

// Create client (no API keys needed)
const client = createComfyUIClient({});

// Generate entity
const result = await client.txt2img({
  prompt: "A cute pixel art cat",
  width: 512,
  height: 512
});

// Remove background
const transparent = await client.removeBackground({
  image: result.assetId
});

// Generate layered background
const layers = await client.generateLayered({
  basePrompt: "pixel art forest",
  layers: [
    { depth: 'sky', prompt: 'blue sky' },
    { depth: 'far', prompt: 'mountains' },
    { depth: 'mid', prompt: 'trees' },
    { depth: 'near', prompt: 'bushes' }
  ]
});
```

---

## Model Details

### Flux.1-dev-fp8

- **Type:** Text-to-image diffusion model
- **Size:** ~17GB (UNet) + 5GB (CLIP) + 300MB (VAE) = ~23GB total
- **Format:** FP8 quantized (2x faster than FP16)
- **VRAM Usage:** ~12GB during inference
- **License:** Open source (Apache 2.0)

**Advantages over SDXL:**
- Better text rendering
- More coherent compositions
- Better at following complex prompts
- Superior for game art/pixel art

### Custom Nodes

**Installed:**
- **ComfyUI-RMBG** - Background removal
- **ComfyUI_essentials** - Utility nodes

---

## Performance

### Generation Times

| Operation | Size | Steps | Time |
|-----------|------|-------|------|
| txt2img | 512×512 | 20 | ~35s |
| txt2img | 1024×1024 | 20 | ~55s |
| img2img | 512×512 | 20 | ~38s |
| removeBackground | 512×512 | - | ~15s |
| generateLayered | 1024×512 | 15 | ~40s/layer |

### Cold Start

- **First request:** 2-3 minutes (downloads 23GB of models)
- **Subsequent requests:** ~30-40s (models cached)
- **Container idle:** 60s (kept warm)

**Optimization:** Batch requests to avoid cold starts.

---

## Configuration

### Environment Variables

```bash
# Optional: Use custom Modal endpoint
MODAL_ENDPOINT=https://your-endpoint.modal.run

# Default behavior (no env vars needed):
# Uses https://hassoncs--slopcade-comfyui-web-img2img.modal.run
```

### No Configuration Required

The system works out of the box with zero configuration. Just:

```typescript
import { AssetService } from './ai/assets';

const assetService = new AssetService(env);
const result = await assetService.generateAsset({
  prompt: "A cute cat",
  type: 'entity'
});
```

---

## Recommended Image Sizes

Based on our game engine requirements:

### Entity Sprites
- **256×256** - Small items (coins, power-ups)
- **512×512** - Standard entities (characters, enemies)
- **1024×1024** - Hero/large entities

### Backgrounds
- **1024×512** - Wide backgrounds (side-scrollers)
- **1024×1024** - Square backgrounds
- **1024×1792** - Tall backgrounds (vertical)

### UI Elements
- **256×256** - Large buttons
- **256×64** - Standard buttons
- **256×32** - Small controls

---

## Workflow Architecture

### How It Works

1. **Request** comes in with prompt/parameters
2. **ComfyUI** builds workflow JSON:
   ```json
   {
     "5": {"class_type": "EmptyLatentImage", "inputs": {...}},
     "6": {"class_type": "CLIPTextEncode", "inputs": {...}},
     "10": {"class_type": "UNETLoader", "inputs": {...}},
     "13": {"class_type": "KSampler", "inputs": {...}},
     "9": {"class_type": "SaveImage", "inputs": {...}}
   }
   ```
3. **Nodes execute:**
   - Load model to GPU (~5s)
   - Encode prompt with CLIP (~2s)
   - Denoise latent (iterative, ~25-30s)
   - Decode with VAE (~3s)
4. **Return** base64 image

### Node Types

- **EmptyLatentImage** - Create blank canvas
- **CLIPTextEncode** - Convert prompt to embeddings
- **UNETLoader** - Load Flux model
- **KSampler** - Iterative denoising
- **VAEDecode** - Convert latent to image
- **SaveImage** - Output result

---

## Monitoring

### Modal Dashboard

View at: https://modal.com/apps/hassoncs/main/deployed/slopcade-comfyui

**Metrics:**
- Cold start frequency
- GPU utilization
- Request latency
- Cost per request

### Logs

```bash
# View logs
modal logs slopcade-comfyui

# Stream logs
modal logs slopcade-comfyui --follow
```

---

## Development

### Local Testing

```bash
# Deploy to dev environment
cd api/modal
modal deploy comfyui.py --env dev

# Run locally
modal run comfyui.py
```

### Updating the Model

Edit `api/modal/comfyui.py`:

```python
# Change model type
MODEL_TYPE = "flux1-dev-fp8"  # Options: flux1-dev-fp8, etc.

# Or custom checkpoint
MODEL_CHECKPOINT = "custom-model.safetensors"
```

### Adding Custom Nodes

```python
# In Dockerfile section
.run_commands(
    "comfy --skip-prompt node install https://github.com/user/custom-node",
)
```

---

## Troubleshooting

### "Cold start" taking too long

**Normal:** First request downloads 23GB of models.  
**Fix:** Keep container warm with periodic requests, or batch jobs.

### Out of memory errors

**Cause:** VRAM exceeded (24GB limit).  
**Fix:** Reduce image size or use lower precision.

### Slow generation

**Default:** 20 steps takes ~35s.  
**Optimize:** Use 15 steps (~26s, 25% faster) for production assets.

### Images look different than expected

**Cause:** Different model than Scenario.  
**Fix:** Add style keywords: "pixel art, 16-bit style, game sprite"

---

## Comparison to Other Providers

| Feature | Scenario | Modal (Current) | Replicate |
|---------|----------|-----------------|-----------|
| **Setup** | API keys | None | None |
| **Control** | Limited | Full | Medium |
| **Models** | Proprietary | Flux (open) | Various |
| **Cold Start** | None | 2-3 min | 30s |
| **Customization** | Low | High | Medium |

---

## Summary

✅ **Zero configuration** - Works out of the box  
✅ **Four functions** - txt2img, img2img, removeBackground, generateLayered  
✅ **Flux model** - State-of-the-art open source  
✅ **Custom workflows** - Full control over generation  
✅ **Scales to zero** - Pay only for what you use  

**Default Endpoint:** `https://hassoncs--slopcade-comfyui-web-img2img.modal.run`
