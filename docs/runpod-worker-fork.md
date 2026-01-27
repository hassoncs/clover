# RunPod Worker ComfyUI - Fork Documentation

## Overview

This repository maintains a **fork** of the RunPod serverless ComfyUI worker at:
- **Our Fork**: `github.com/hassoncs/worker-comfyui`
- **Original**: `github.com/runpod-workers/worker-comfyui`
- **Location in this repo**: `api/runpod-worker/` (Git submodule)

## Why We Forked

We needed to add custom ComfyUI nodes for Slopcade's image generation pipeline:
- **ComfyUI-RMBG** - Background removal using BiRefNet
- **ComfyUI_essentials** - Utility nodes for workflows
- **Custom model setup** - Flux.1-dev-fp8 with correct paths

## Repository Structure

```
slopcade/
├── api/
│   └── runpod-worker/              # Git submodule
│       ├── Dockerfile              # Modified with our customizations
│       ├── scripts/
│       │   └── comfy-node-install.sh
│       └── ... (rest of RunPod worker)
├── docs/
│   ├── runpod-worker-submodule.md  # How to update from upstream
│   └── runpod-comfyui-config.md    # Configuration reference
└── .gitmodules                     # Submodule configuration
```

## Our Customizations

### 1. Custom Nodes (Dockerfile)

Added to the base image:
```dockerfile
# Install Slopcade custom nodes
RUN /usr/local/bin/comfy-node-install https://github.com/1038lab/ComfyUI-RMBG
RUN /usr/local/bin/comfy-node-install https://github.com/cubiq/ComfyUI_essentials
```

### 2. Flux Model Setup

Fixed model download paths for Flux.1-dev-fp8:
```dockerfile
RUN if [ "$MODEL_TYPE" = "flux1-dev-fp8" ]; then \
      wget -q -O models/unet/flux1-dev-fp8.safetensors ... && \
      wget -q -O models/clip/clip_l.safetensors ... && \
      wget -q -O models/clip/t5xxl_fp8_e4m3fn.safetensors ... && \
      wget -q -O models/vae/ae.safetensors ...; \
    fi
```

**Key fix**: Downloads UNet, CLIP, and VAE models to separate directories (not just checkpoint).

## How to Update from Upstream

When RunPod releases updates:

```bash
# Go to the submodule
cd api/runpod-worker

# Add upstream remote (one-time setup)
git remote add upstream https://github.com/runpod-workers/worker-comfyui.git

# Fetch and merge upstream changes
git fetch upstream
git checkout main
git merge upstream/main

# Resolve any conflicts (keep our customizations)
# - Keep our Dockerfile changes
# - Keep our custom node installations

# Push to our fork
git push origin main

# Update submodule reference in main repo
cd ../..
git add api/runpod-worker
git commit -m "chore: update runpod-worker from upstream"
git push origin main
```

## How to Make Changes

If you need to modify our fork:

```bash
# Go to submodule
cd api/runpod-worker

# Make changes (edit Dockerfile, add scripts, etc.)
# ...

# Commit and push to our fork
git add .
git commit -m "feat: description of changes"
git push origin main

# Update submodule reference in main repo
cd ../..
git add api/runpod-worker
git commit -m "chore: update runpod-worker submodule"
git push origin main
```

## Building on RunPod

### From GitHub Repository

1. RunPod Console → Serverless → New Endpoint
2. **Deploy from**: GitHub repository
3. **Repository**: `hassoncs/slopcade`
4. **Branch**: `main`
5. **Dockerfile**: `api/runpod-worker/Dockerfile`
6. **Build Context**: `/api/runpod-worker`
7. **Model Type**: `flux1-dev-fp8` (build arg)

### Build Process

1. Base stage: Install ComfyUI + Python dependencies
2. Downloader stage: Download Flux.1-dev-fp8 models (~15GB)
3. Final stage: Copy models + install custom nodes

**First build**: ~10-15 minutes (downloading models)  
**Subsequent builds**: ~2-3 minutes (cached layers)

## Custom Node Details

### ComfyUI-RMBG
- **Purpose**: High-quality background removal
- **Models**: Downloads BiRefNet automatically on first use
- **Size**: ~400MB model file
- **Usage**: `RMBG node` in workflows

### ComfyUI_essentials
- **Purpose**: Utility nodes (image processing, masking, etc.)
- **Size**: ~50MB
- **Usage**: Various utility nodes in workflows

## Troubleshooting

**Submodule not showing after clone:**
```bash
git submodule update --init --recursive
```

**Build fails - models not found:**
- Check Dockerfile has correct model URLs
- Verify MODEL_TYPE build arg is set to `flux1-dev-fp8`

**Custom nodes not working:**
- Check `comfy-node-install.sh` ran successfully
- Verify nodes are in `/comfyui/custom_nodes/`

**Want to see what version we're on:**
```bash
cd api/runpod-worker
git log --oneline -5
```

## Files Modified from Upstream

1. **Dockerfile** - Added custom node installation, fixed Flux model paths
2. **(Future)** Any additional custom scripts or configurations

## Related Documentation

- `docs/runpod-worker-submodule.md` - Detailed submodule workflow
- `docs/runpod-comfyui-config.md` - RunPod endpoint configuration
- `docs/runpod-rollout-plan.md` - Production rollout strategy

## Last Updated

2026-01-27 - Initial fork setup with Flux.1-dev-fp8 and custom nodes
