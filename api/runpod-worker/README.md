# Slopcade ComfyUI Worker for RunPod Serverless

Custom ComfyUI worker with Flux Dev and BiRefNet background removal for game asset generation.

## What's Included

- **Flux Dev (FP8)** - Text-to-image and image-to-image generation (~12GB)
- **BiRefNet** - High-quality background removal for sprites
- **ComfyUI Essentials** - Common utility nodes
- **1038lab RMBG** - Advanced background removal node

## Quick Start

### Option 1: Use Pre-built Image (Recommended)

Once GitHub Actions builds the image, create a RunPod endpoint:

1. Go to [RunPod Serverless](https://www.runpod.io/console/serverless)
2. Click **New Endpoint**
3. Choose **Custom** template
4. Set **Container Image**: `hassoncs/slopcade-comfyui:latest`
5. Set **Container Disk**: `30 GB`
6. Choose GPU: `L40` or `A10` (24GB+ VRAM recommended)
7. Set **Min Workers**: `0`, **Max Workers**: `3`
8. Create endpoint and copy the **Endpoint ID**

### Option 2: Build Your Own Image

#### Via GitHub Actions (Easiest)

1. Fork this repo
2. Add GitHub secrets:
   - `DOCKERHUB_USERNAME` - Your Docker Hub username
   - `DOCKERHUB_TOKEN` - Docker Hub access token
3. Push to main or manually trigger `.github/workflows/build-runpod-worker.yml`

#### Via RunPod Build (Alternative)

RunPod can build from GitHub:
1. Go to **Templates** → **New Template**
2. Select **Build from GitHub**
3. Set Dockerfile path: `api/runpod-worker/Dockerfile`

## Environment Variables

Add to your `.hush`:

```bash
RUNPOD_API_KEY=your-api-key
RUNPOD_COMFYUI_ENDPOINT_ID=your-endpoint-id
IMAGE_GENERATION_PROVIDER=comfyui
```

## Testing

```bash
# Basic txt2img test
pnpm hush run -- npx tsx api/scripts/test-runpod-premade.ts "A pixel art knight"

# Full ComfyUI test
pnpm hush run -- npx tsx api/scripts/test-comfyui-api.ts "A pixel art knight" txt2img
```

## Workflow Files

The workflows are in `api/src/ai/workflows/`:

| File | Purpose |
|------|---------|
| `txt2img.json` | Text-to-image generation |
| `img2img.json` | Image-to-image refinement |
| `remove-background.json` | Background removal only |
| `txt2img-runpod.json` | RunPod-compatible txt2img |

## Cost Estimates

| GPU | Cost/hr | ~Cost per image |
|-----|---------|-----------------|
| L40 | $0.69 | ~$0.01-0.02 |
| A10 | $0.28 | ~$0.005-0.01 |
| A100 80GB | $1.99 | ~$0.03-0.04 |

Plus cold start time (~30-60s) on first request after idle.

## Troubleshooting

### Cold Start Too Slow
- Increase **Idle Timeout** to keep workers warm
- Set **Min Workers** to 1 (costs ~$5-15/day idle)

### Out of Memory
- Use L40 or A100 (24GB+ VRAM required for Flux)
- The FP8 model is already optimized for memory

### Model Not Found
- Verify the Docker image built successfully
- Check model paths match workflow JSON files:
  - UNET: `models/unet/flux1-dev-fp8.safetensors`
  - VAE: `models/vae/ae.safetensors`
  - CLIP: `models/clip/clip_l.safetensors`, `t5xxl_fp8_e4m3fn.safetensors`

### BiRefNet Not Working
- Check that `1038lab/ComfyUI-RMBG` node is installed
- BiRefNet model should be at `models/RMBG/BiRefNet-general-epoch_244.pth`
