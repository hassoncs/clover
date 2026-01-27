# RunPod Serverless ComfyUI Setup

## Overview
This document contains the configuration for our RunPod serverless ComfyUI endpoint with Flux.1-dev and background removal support.

## Container Start Command

Paste this into your RunPod endpoint's **Container Start Command** field:

```bash
bash -c "
  echo 'Setting up custom nodes and models...'
  cd /comfyui/custom_nodes 2>/dev/null || mkdir -p /comfyui/custom_nodes && cd /comfyui/custom_nodes
  
  # Install custom nodes
  if [ ! -d 'ComfyUI-RMBG' ]; then
    git clone https://github.com/1038lab/ComfyUI-RMBG
    pip install -r ComfyUI-RMBG/requirements.txt --quiet 2>/dev/null || true
  fi
  
  if [ ! -d 'ComfyUI_essentials' ]; then
    git clone https://github.com/cubiq/ComfyUI_essentials
  fi
  
  # Download Flux models (one-time, ~15GB)
  mkdir -p /comfyui/models/{unet,vae,clip}
  
  if [ ! -f '/comfyui/models/unet/flux1-dev-fp8.safetensors' ]; then
    echo 'Downloading Flux checkpoint...'
    wget -q --show-progress -O /comfyui/models/unet/flux1-dev-fp8.safetensors \
      https://huggingface.co/Comfy-Org/flux1-dev/resolve/main/flux1-dev-fp8.safetensors
  fi
  
  if [ ! -f '/comfyui/models/vae/ae.safetensors' ]; then
    echo 'Downloading VAE...'
    wget -q --show-progress -O /comfyui/models/vae/ae.safetensors \
      https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/ae.safetensors
  fi
  
  if [ ! -f '/comfyui/models/clip/clip_l.safetensors' ]; then
    echo 'Downloading CLIP...'
    wget -q --show-progress -O /comfyui/models/clip/clip_l.safetensors \
      https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors
  fi
  
  if [ ! -f '/comfyui/models/clip/t5xxl_fp8_e4m3fn.safetensors' ]; then
    echo 'Downloading T5 encoder...'
    wget -q --show-progress -O /comfyui/models/clip/t5xxl_fp8_e4m3fn.safetensors \
      https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors
  fi
  
  echo 'Setup complete! Starting ComfyUI...'
  exec /start.sh
"
```

## What It Does

1. **Installs Custom Nodes**:
   - `ComfyUI-RMBG` - Background removal (BiRefNet)
   - `ComfyUI_essentials` - Utility nodes

2. **Downloads Flux Models** (~15GB, one-time):
   - `flux1-dev-fp8.safetensors` - Main checkpoint (UNet)
   - `ae.safetensors` - VAE
   - `clip_l.safetensors` - CLIP text encoder
   - `t5xxl_fp8_e4m3fn.safetensors` - T5 text encoder

3. **Caches Everything**:
   - Models persist between cold starts
   - Only downloads on first boot
   - Subsequent starts are fast

## First Cold Start

Expect the **first request** to take **2-3 minutes** while:
- Installing custom nodes (~30s)
- Downloading ~15GB of models (~2-3min)

After that, requests are fast (~3-5s for generation).

## Endpoint Configuration

- **Base Image**: `runpod/worker-comfyui` (from RunPod Hub)
- **Container Disk**: 30GB minimum
- **GPU**: RTX 4090 or A100 (24GB+ VRAM)
- **Workers**: Min 0, Max 3
- **Idle Timeout**: 30s

## Environment Variables

Set these in RunPod endpoint settings:

```bash
COMFY_ORG_API_KEY=<optional_comfy_org_key>
SERVE_API_LOCALLY=false
```

## Testing

Once deployed, test with:

```bash
# Set in hush
hush set RUNPOD_COMFYUI_ENDPOINT_ID <your-endpoint-id>

# Test txt2img
pnpm hush run -- npx tsx api/scripts/test-comfyui-api.ts "a red apple" txt2img
```

## Troubleshooting

**Issue**: Models not found error
- **Fix**: Check that models downloaded successfully in startup logs
- **Check**: RunPod endpoint logs → Container logs

**Issue**: Custom nodes not working
- **Fix**: Redeploy endpoint to re-run startup script
- **Check**: Look for git clone errors in logs

**Issue**: Out of disk space
- **Fix**: Increase container disk to 40GB
- **Note**: Models are ~15GB total

## Last Updated

2026-01-27 - Initial setup with Flux.1-dev-fp8 and background removal
