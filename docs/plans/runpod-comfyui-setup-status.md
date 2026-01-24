# RunPod ComfyUI Migration - Setup Status

> **Status**: READY TO DEPLOY (waiting to exhaust Scenario.com credits)  
> **Current Provider**: Scenario.com  
> **Target Provider**: RunPod ComfyUI Serverless  
> **Created**: 2026-01-24

---

## Executive Summary

All infrastructure for RunPod ComfyUI migration is ready. We're holding off on switching until Scenario.com API credits are exhausted.

**DO NOT SWITCH YET** - Continue using Scenario.com until credits are depleted.

---

## What's Been Built

### 1. Custom ComfyUI Worker Docker Image

**Location**: `api/runpod-worker/`

```
api/runpod-worker/
├── Dockerfile      # Custom worker with Flux + BiRefNet
└── README.md       # Deployment instructions
```

**Includes**:
- Base: `runpod/worker-comfyui:5.7.1-base`
- Flux Dev FP8 (~12GB) - text-to-image, image-to-image
- BiRefNet - high-quality background removal
- 1038lab/ComfyUI-RMBG node
- ComfyUI Essentials

**Docker Image**: `hassoncs/slopcade-comfyui:latest` (once built)

### 2. GitHub Actions Workflow

**Location**: `.github/workflows/build-runpod-worker.yml`

**Triggers**:
- Push to `api/runpod-worker/**` on main branch
- Manual workflow dispatch

**Required Secrets** (need to add to GitHub repo):
- `DOCKERHUB_USERNAME` - Your Docker Hub username
- `DOCKERHUB_TOKEN` - Docker Hub access token

### 3. Workflow JSON Files

**Location**: `api/src/ai/workflows/`

| File | Purpose | Status |
|------|---------|--------|
| `txt2img.json` | Text-to-image (Flux) | Ready |
| `img2img.json` | Image-to-image refinement | Ready |
| `remove-background.json` | BG removal only | Ready |
| `txt2img-runpod.json` | RunPod-compatible format | Ready |

### 4. Test Scripts

**Location**: `api/scripts/`

| Script | Purpose |
|--------|---------|
| `test-runpod-premade.ts` | Raw RunPod API testing |
| `test-comfyui-api.ts` | Full ComfyUI client testing |

### 5. Architecture Document

**Location**: `docs/plans/comfyui-migration-architecture.md`

Comprehensive document covering:
- Current Scenario.com architecture
- Target ComfyUI architecture
- Per-asset-type unified workflows
- Migration phases
- Pros/cons analysis
- Timeline

### 6. Environment Variables Template

**Location**: `.hush.template` (updated)

```bash
# Image Generation Provider
IMAGE_GENERATION_PROVIDER=comfyui  # 'scenario' | 'comfyui'

# RunPod (for ComfyUI serverless)
RUNPOD_API_KEY=
RUNPOD_COMFYUI_ENDPOINT_ID=
```

---

## Test Results

### Pre-made Endpoint Test (2026-01-24)

**Endpoint**: `pd3dqti6qlf5cs` (ComfyUI 5.5.1)  
**Result**: ❌ FAILED - Base template has no models

```
Error: unet_name: 'flux1-dev.safetensors' not in []
Error: vae_name: 'ae.safetensors' not in ['pixel_space']
Error: clip_name: not in []
```

**Conclusion**: Pre-made "ComfyUI 5.5.1" is the base template without any AI models. Must deploy custom worker or use flux1-dev pre-made template.

---

## Deployment Checklist (When Ready to Switch)

### Phase 1: Build Docker Image

- [ ] Add GitHub secrets:
  - [ ] `DOCKERHUB_USERNAME` = `hassoncs`
  - [ ] `DOCKERHUB_TOKEN` = (create at hub.docker.com)
  
- [ ] Commit and push the runpod-worker files:
  ```bash
  git add .github/workflows/build-runpod-worker.yml api/runpod-worker/
  git commit -m "feat: add RunPod ComfyUI serverless worker"
  git push origin main
  ```

- [ ] Verify GitHub Action runs and image is pushed to Docker Hub

### Phase 2: Create RunPod Endpoint

- [ ] Go to [RunPod Serverless](https://www.runpod.io/console/serverless)
- [ ] Click **New Endpoint**
- [ ] Configure:
  - **Name**: `slopcade-comfyui`
  - **Container Image**: `hassoncs/slopcade-comfyui:latest`
  - **Container Disk**: `30 GB`
  - **GPU**: `L40` or `A10` (24GB+ VRAM)
  - **Min Workers**: `0`
  - **Max Workers**: `3`
  - **Idle Timeout**: `30 seconds`
- [ ] Copy **Endpoint ID**

### Phase 3: Configure Environment

- [ ] Update `.hush`:
  ```bash
  RUNPOD_API_KEY=<your-api-key>
  RUNPOD_COMFYUI_ENDPOINT_ID=<new-endpoint-id>
  IMAGE_GENERATION_PROVIDER=comfyui
  ```
- [ ] Encrypt: `pnpm hush:encrypt`

### Phase 4: Test

- [ ] Run txt2img test:
  ```bash
  pnpm hush run -- npx tsx api/scripts/test-comfyui-api.ts "A pixel art knight" txt2img
  ```

- [ ] Run img2img test:
  ```bash
  pnpm hush run -- npx tsx api/scripts/test-comfyui-api.ts "Refine" img2img ./test-image.png
  ```

- [ ] Run background removal test:
  ```bash
  pnpm hush run -- npx tsx api/scripts/test-comfyui-api.ts "" rmbg ./test-image.png
  ```

- [ ] Run full pipeline test:
  ```bash
  pnpm hush run -- npx tsx api/scripts/test-comfyui-api.ts "A pixel art slime" full
  ```

### Phase 5: Switch Provider

- [ ] Update `IMAGE_GENERATION_PROVIDER=comfyui` in production
- [ ] Monitor for errors
- [ ] Keep Scenario.com credentials as fallback

---

## Cost Comparison

| Provider | Cost per Image | Notes |
|----------|----------------|-------|
| Scenario.com | ~$0.02-0.05 | Current, paid credits |
| RunPod L40 | ~$0.01-0.02 | Target, pay-per-second |
| RunPod A10 | ~$0.005-0.01 | Budget option |

**Estimated savings**: 50-90% cost reduction

---

## Files Changed/Created

### New Files
```
.github/workflows/build-runpod-worker.yml
api/runpod-worker/Dockerfile
api/runpod-worker/README.md
api/scripts/test-runpod-premade.ts
api/scripts/test-comfyui-api.ts
api/src/ai/workflows/txt2img.json
api/src/ai/workflows/txt2img-runpod.json
api/src/ai/workflows/img2img.json
api/src/ai/workflows/remove-background.json
docs/plans/comfyui-migration-architecture.md
docs/plans/runpod-comfyui-setup-status.md (this file)
```

### Modified Files
```
.hush.template (added RunPod env vars)
```

### Existing Files (unchanged, still using Scenario.com)
```
api/src/ai/scenario.ts              # Scenario.com client
api/src/ai/pipeline/adapters/node.ts # Uses ScenarioAdapter
api/src/ai/pipeline/registry.ts     # Pipeline stages
```

---

## Architecture Overview

### Current Flow (Scenario.com)
```
Asset Request
    ↓
Pipeline Registry (selects stages by asset type)
    ↓
Stage 1: Silhouette (local)
Stage 2: Build Prompt (local)  
Stage 3: Upload to Scenario (API call)
Stage 4: img2img (API call + download)
Stage 5: Remove BG (API call + download)  ← Multiple round-trips
Stage 6: Upload to R2 (API call)
    ↓
Final Asset URL
```

### Target Flow (ComfyUI)
```
Asset Request
    ↓
Pipeline Registry (selects unified workflow)
    ↓
Stage 1: Silhouette (local)
Stage 2: Build Prompt (local)
Stage 3: ComfyUI Unified (1 API call)  ← Does img2img + BG removal in one call
Stage 4: Upload to R2 (API call)
    ↓
Final Asset URL
```

**Key benefit**: Single ComfyUI workflow does multiple operations, reducing API calls from 6 to 2.

---

## Questions to Resolve Before Migration

1. **Parallax assets**: ComfyUI doesn't have native "layer decomposition" like Scenario.com. Options:
   - Keep parallax on Scenario.com
   - Investigate depth-based layer separation in ComfyUI
   - Drop parallax feature

2. **Quality comparison**: Need side-by-side comparison before full switch

3. **Cold start latency**: First request after idle takes 30-120s

---

## Links & Resources

### Our Endpoints
- **RunPod Endpoint Console**: https://console.runpod.io/serverless/user/endpoint/pd3dqti6qlf5cs?tab=overview
- **Comfy.org Cloud** (alternative): https://cloud.comfy.org/

### Documentation
- **RunPod Docs**: https://docs.runpod.io/
- **ComfyUI Worker Repo**: https://github.com/runpod-workers/worker-comfyui
- **1038lab RMBG**: https://github.com/1038lab/ComfyUI-RMBG

---

## Billing Notes

### True Serverless (Pay Only When Running)

To get **$0 cost when idle**, set:
- **Min Workers = 0** (no always-on workers)
- **Idle Timeout = 5-30 seconds** (how long worker stays warm after job)

Trade-off: Cold starts of 30-120 seconds on first request after idle.

### If Min Workers > 0

You pay 24/7 for that GPU (with 20-30% discount vs on-demand). Example:
- Min Workers = 1 on L40 → ~$16-28/day idle cost

### Cost Estimates (L40 24GB GPU)

| Scenario | Daily Cost |
|----------|------------|
| Min Workers = 0, no requests | **$0** |
| Min Workers = 1, idle all day | ~$16-28 |
| Min Workers = 0, 100 images (~30s each) | ~$0.50-1.50 |

---

_Last Updated: 2026-01-24_
