# RunPod ComfyUI Worker - Git Submodule

## Overview

We maintain a **fork** of `runpod-workers/worker-comfyui` as a Git submodule at `api/runpod-worker/`. This allows us to:

- Add custom nodes (ComfyUI-RMBG, ComfyUI_essentials)
- Pull upstream updates when RunPod releases new versions
- Track our changes separately from the main slopcade repo

## Structure

```
slopcade/
├── api/
│   └── runpod-worker/          # Git submodule → hassoncs/worker-comfyui
│       ├── Dockerfile          # Modified with our custom nodes
│       └── ...
```

## Fork Details

- **Original**: `github.com/runpod-workers/worker-comfyui`
- **Our Fork**: `github.com/hassoncs/worker-comfyui`
- **Changes Made**:
  - Added ComfyUI-RMBG (background removal)
  - Added ComfyUI_essentials (utility nodes)
  - Uses flux1-dev-fp8 model

## Updating the Submodule

### To Pull Upstream Changes

```bash
# Go to the submodule
cd api/runpod-worker

# Add upstream remote (first time only)
git remote add upstream https://github.com/runpod-workers/worker-comfyui.git

# Fetch upstream changes
git fetch upstream

# Merge upstream/main into our main
git checkout main
git merge upstream/main

# Push to our fork
git push origin main

# Go back to main repo and commit the updated submodule
cd ../..
git add api/runpod-worker
git commit -m "chore: update runpod-worker-comfyui submodule"
git push origin main
```

### To Make Changes to Our Fork

```bash
# Go to the submodule
cd api/runpod-worker

# Make changes (edit Dockerfile, etc.)
# ...

# Commit and push
git add .
git commit -m "feat: your changes"
git push origin main

# Go back to main repo and commit the updated submodule reference
cd ../..
git add api/runpod-worker
git commit -m "chore: update runpod-worker submodule"
git push origin main
```

## Building on RunPod

1. **Deploy from GitHub repository** in RunPod console
2. **Repository**: `hassoncs/slopcade`
3. **Branch**: `main`
4. **Dockerfile**: `api/runpod-worker/Dockerfile`
5. **Build Context**: `/api/runpod-worker`

The Dockerfile will automatically:
- Install ComfyUI base
- Add our custom nodes
- Download Flux.1-dev-fp8 models (~15GB)

## First Build

The first build will take **10-15 minutes** as it downloads:
- Base ComfyUI (~2GB)
- Flux checkpoint (~12GB)
- VAE + CLIP models (~1GB)

Subsequent builds use layer caching and are much faster.

## Troubleshooting

**Submodule not showing up after clone:**
```bash
git submodule update --init --recursive
```

**Changes in submodule not reflected:**
```bash
cd api/runpod-worker
git status  # Check if changes are committed
git push origin main  # Push changes to fork
cd ../..
git add api/runpod-worker  # Update submodule reference
git commit -m "chore: update submodule"
```

**Want to see what version we're on:**
```bash
cd api/runpod-worker
git log --oneline -3
```
