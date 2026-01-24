# Migration Plan: Scenario.com to RunPod + ComfyUI

> **Status**: In Progress  
> **Priority**: High  
> **Estimated Savings**: ~98% on image generation costs  
> **Timeline**: 1-2 days implementation + RunPod setup

---

## Overview

Migrate from Scenario.com's hosted image generation API to self-hosted ComfyUI on RunPod. This eliminates the ~$0.05-0.10/image cost in favor of ~$0.001-0.002/image on RunPod serverless.

### Cost Comparison

| Volume | Scenario.com | RunPod Serverless | Savings |
|--------|-------------|-------------------|---------|
| 100/month | ~$5-10 | ~$0.10-0.20 | 95% |
| 1,000/month | ~$50-100 | ~$1-2 | 98% |
| 10,000/month | ~$500-1,000 | ~$10-20 | 98% |

---

## Current Scenario.com Usage

### Features Used

| Feature | Endpoint | Parameters | Use Case |
|---------|----------|------------|----------|
| **Text-to-Image** | `/generate/txt2img` | `flux.1-dev`, 1024x1024, guidance 3.5, 28 steps | Direct asset generation |
| **Image-to-Image** | `/generate/img2img` | Strength 0.95, same model params | Silhouette → refined sprite |
| **Background Removal** | `/generate/remove-background` | PNG output | Transparent sprite extraction |
| **Layered Decomposition** | `/generate/layered` | Qwen model, 1-10 layers | Parallax background separation |
| **Asset Upload** | `/assets` | Base64 PNG | Upload silhouettes for img2img |
| **Asset Download** | `/assets/{id}` | - | Retrieve generated images |

### Models Referenced

- `flux.1-dev` (primary - default for txt2img/img2img)
- `model_retrodiffusion-plus` / `model_retrodiffusion` (pixel art)
- `model_qwen` (layered image decomposition)

### Current Pipeline Flow

```
1. Create silhouette (local Sharp) → PNG
2. Upload silhouette → Scenario asset ID
3. img2img (silhouette + prompt) → Generated sprite
4. Remove background → Transparent PNG
5. Download → R2 storage
```

### Key Files

- `api/src/ai/scenario.ts` - ScenarioClient class
- `api/src/ai/scenario-types.ts` - Type definitions and constants
- `api/src/ai/pipeline/adapters/node.ts` - ScenarioAdapter for pipeline
- `api/src/ai/pipeline/types.ts` - ScenarioAdapter interface

---

## ComfyUI Equivalents

| Scenario Feature | ComfyUI Solution | Notes |
|------------------|-----------------|-------|
| `flux.1-dev` txt2img | Native ComfyUI nodes | Need 24GB VRAM (RTX 4090) |
| img2img | `VAE Encode` → `KSampler` with denoise | Strength maps to denoise param |
| Background removal | `ComfyUI-RMBG` with BEN2 or BiRefNet | Often better quality than Scenario |
| Layered decomposition | `ComfyUI-Qwen-VL-API` | Same Qwen model, self-hosted |
| Retro Diffusion | LoRAs/checkpoints on Civitai | May need prompt tuning |

### Required Models & Custom Nodes

**Models to Download:**
- `flux1-dev.safetensors` (~23GB) or FP8 version (~11GB)
- `ae.safetensors` (VAE for Flux)
- `clip_l.safetensors` + `t5xxl_fp16.safetensors` (text encoders)
- `BEN2.pth` or `BiRefNet-HR.pth` (background removal)
- `qwen-vl-layered-bf16` (layered decomposition)
- Retro Diffusion LoRAs (pixel art)

**Custom Nodes to Install:**
- `ComfyUI-RMBG` (background removal)
- `ComfyUI-Qwen-VL-API` (layered decomposition)
- `ComfyUI-PixelArt-Detector` (pixel art post-processing)

---

## RunPod Deployment Options

### Option A: RunPod Pods (Development/Testing)

- RTX 4090 (24GB): ~$0.59-0.74/hr
- A6000 (48GB): ~$0.79-0.89/hr
- Pre-built templates available
- **Recommended Template**: ValyrianTech Flux-optimized

**Pros**: Always-on, instant access, easy debugging  
**Cons**: Pay when idle

### Option B: RunPod Serverless (Production)

- ~$0.0004/sec execution time
- Auto-scales to zero when not in use
- Need custom Docker image with workflows
- Use `runpod-workers/worker-comfyui` as base

**Pros**: Only pay for compute, auto-scaling  
**Cons**: 30-60s cold start, more setup

### Recommended: Start with Pods, migrate to Serverless

1. Develop and test workflows on a Pod
2. Export working workflows as API JSON
3. Build Docker image for Serverless
4. Deploy Serverless endpoint for production

---

## Implementation Plan

### Phase 1: Infrastructure Setup (Human Tasks)

- [ ] Create RunPod account
- [ ] Deploy ComfyUI template (RTX 4090 recommended)
- [ ] Install custom nodes via ComfyUI Manager
- [ ] Download required models
- [ ] Test basic txt2img workflow in UI
- [ ] Export workflows in API format

### Phase 2: Client Implementation

#### New Files to Create

```
api/src/ai/
├── comfyui.ts              # ComfyUIClient class
├── comfyui-types.ts        # Type definitions
└── workflows/              # ComfyUI workflow JSON files
    ├── flux-txt2img.json
    ├── flux-img2img.json
    ├── remove-background.json
    └── layered-decompose.json
```

#### ComfyUIClient Interface (Drop-in Compatible)

```typescript
interface ComfyUIAdapter {
  uploadImage(png: Uint8Array): Promise<string>
  txt2img(params: Txt2ImgParams): Promise<{ assetId: string }>
  img2img(params: Img2ImgParams): Promise<{ assetId: string }>
  removeBackground(imageId: string): Promise<{ assetId: string }>
  layeredDecompose(params: LayeredParams): Promise<{ assetIds: string[] }>
  downloadImage(imageId: string): Promise<{ buffer: Uint8Array; extension: string }>
}
```

### Phase 3: Pipeline Integration

#### Adapter Factory with Feature Flag

```typescript
// api/src/ai/pipeline/adapters/node.ts

export async function createImageGenerationAdapter(options: {
  provider: 'scenario' | 'comfyui';
  // Scenario options
  scenarioApiKey?: string;
  scenarioApiSecret?: string;
  // ComfyUI options
  comfyuiEndpoint?: string;
  runpodApiKey?: string;
}): Promise<ScenarioAdapter> {
  if (options.provider === 'comfyui') {
    return createComfyUIAdapter({
      endpoint: options.comfyuiEndpoint!,
      apiKey: options.runpodApiKey,
    });
  }
  return createNodeScenarioAdapter({
    apiKey: options.scenarioApiKey!,
    apiSecret: options.scenarioApiSecret!,
  });
}
```

#### Environment Variables

```bash
# .dev.vars / wrangler.toml
IMAGE_GENERATION_PROVIDER=comfyui  # or 'scenario'

# ComfyUI / RunPod
RUNPOD_API_KEY=your-key
COMFYUI_ENDPOINT=https://your-pod-id-8188.proxy.runpod.net
# or for serverless:
RUNPOD_ENDPOINT_ID=your-endpoint-id

# Scenario (keep for fallback)
SCENARIO_API_KEY=existing-key
SCENARIO_SECRET_API_KEY=existing-secret
```

### Phase 4: Testing & Validation

- [ ] Unit tests for ComfyUIClient
- [ ] Integration tests with real RunPod endpoint
- [ ] Visual comparison: Scenario vs ComfyUI outputs
- [ ] Performance benchmarks (latency, throughput)
- [ ] Fallback testing (ComfyUI down → Scenario)

### Phase 5: Production Migration

- [ ] Deploy Serverless endpoint (if not using Pods)
- [ ] Update production environment variables
- [ ] Gradual rollout (feature flag per user/game)
- [ ] Monitor error rates and latency
- [ ] Remove Scenario code after validation period

---

## Workflow JSON Specifications

### flux-txt2img.json

```json
{
  "5": {
    "class_type": "EmptyLatentImage",
    "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }
  },
  "6": {
    "class_type": "CLIPTextEncode",
    "inputs": { "text": "{{PROMPT}}", "clip": ["4", 0] }
  },
  "10": {
    "class_type": "UNETLoader",
    "inputs": { "unet_name": "flux1-dev.safetensors" }
  },
  "11": {
    "class_type": "DualCLIPLoader",
    "inputs": { "clip_name1": "clip_l.safetensors", "clip_name2": "t5xxl_fp16.safetensors" }
  },
  "13": {
    "class_type": "FluxGuidance",
    "inputs": { "guidance": 3.5, "conditioning": ["6", 0] }
  },
  "17": {
    "class_type": "KSampler",
    "inputs": {
      "seed": "{{SEED}}",
      "steps": 28,
      "cfg": 1,
      "sampler_name": "euler",
      "scheduler": "simple",
      "denoise": 1,
      "model": ["10", 0],
      "positive": ["13", 0],
      "negative": ["6", 0],
      "latent_image": ["5", 0]
    }
  },
  "8": {
    "class_type": "VAEDecode",
    "inputs": { "samples": ["17", 0], "vae": ["12", 0] }
  },
  "12": {
    "class_type": "VAELoader",
    "inputs": { "vae_name": "ae.safetensors" }
  },
  "9": {
    "class_type": "SaveImage",
    "inputs": { "filename_prefix": "output", "images": ["8", 0] }
  }
}
```

### flux-img2img.json

Same as txt2img but replace `EmptyLatentImage` with:
- `LoadImage` → `VAEEncode` → feed into KSampler's `latent_image`
- Set `denoise` to `{{STRENGTH}}` (0.95 default)

### remove-background.json

```json
{
  "1": {
    "class_type": "LoadImage",
    "inputs": { "image": "{{INPUT_IMAGE}}" }
  },
  "2": {
    "class_type": "BEN2_Segmentation",
    "inputs": { "image": ["1", 0], "model": "BEN2" }
  },
  "3": {
    "class_type": "ImageMaskOut",
    "inputs": { "image": ["1", 0], "mask": ["2", 1] }
  },
  "4": {
    "class_type": "SaveImage",
    "inputs": { "filename_prefix": "nobg", "images": ["3", 0] }
  }
}
```

---

## TypeScript Client Implementation

### Recommended Package: `@stable-canvas/comfyui-client`

```bash
pnpm add @stable-canvas/comfyui-client --filter @clover/api
```

### Usage Example

```typescript
import { ComfyClient } from "@stable-canvas/comfyui-client";

const client = new ComfyClient({ 
  host: process.env.COMFYUI_ENDPOINT 
});

// Load workflow, inject params, execute
const workflow = loadWorkflow('flux-txt2img.json');
workflow["6"].inputs.text = prompt;
workflow["17"].inputs.seed = seed || Math.floor(Math.random() * 1000000);

const result = await client.enqueue(workflow);
const imageBuffer = await client.getImage(result.outputs["9"].images[0]);
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Qwen layered model differences | Medium | Test extensively, may need workflow adjustments |
| Retro Diffusion style mismatch | Medium | Fine-tune prompts, test multiple LoRAs |
| Cold start latency (Serverless) | Low | Use Pods for time-sensitive, Serverless for batch |
| RunPod outages | Medium | Keep Scenario as fallback, monitor uptime |
| Model download size (50GB+) | Low | Pre-bake into Docker image |

---

## Success Criteria

- [ ] All 4 generation types work (txt2img, img2img, bg-remove, layered)
- [ ] Output quality matches or exceeds Scenario.com
- [ ] Latency within 2x of Scenario (acceptable for cost savings)
- [ ] Clean fallback to Scenario if ComfyUI unavailable
- [ ] 90% cost reduction verified in production

---

## Timeline

| Phase | Duration | Owner |
|-------|----------|-------|
| RunPod setup + workflow testing | 2-4 hours | Human |
| ComfyUI client implementation | 4-6 hours | Claude |
| Pipeline adapter integration | 2-3 hours | Claude |
| Testing & validation | 2-4 hours | Both |
| Production rollout | 1 hour | Human |

**Total**: ~1-2 days

---

## References

- [ComfyUI GitHub](https://github.com/comfyanonymous/ComfyUI)
- [RunPod ComfyUI Template](https://console.runpod.io/deploy?template=runpod-comfyui)
- [RunPod Serverless Worker](https://github.com/runpod-workers/worker-comfyui)
- [@stable-canvas/comfyui-client](https://github.com/StableCanvas/comfyui-client)
- [ComfyUI-RMBG](https://github.com/1038lab/ComfyUI-RMBG)
- [Flux ComfyUI Examples](https://comfyanonymous.github.io/ComfyUI_examples/flux/)

---

_Created: 2026-01-24_
