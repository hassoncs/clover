# RunPod Serverless Setup (Option 4 - Templates)

## Overview
Instead of building a custom Docker image, we use RunPod's **Serverless Templates** feature with a startup script. This is much faster and avoids disk space issues.

## How It Works

1. **Base Image**: Use RunPod's official `runpod/worker-comfyui:5.7.1-base`
2. **Startup Script**: `startup.sh` installs custom nodes when the pod starts
3. **Models**: Downloaded automatically on first use (cached for subsequent runs)
4. **Result**: ~30-60s cold start, but no Docker build needed

## Setup Instructions

### Step 1: Create Serverless Template

1. Go to [RunPod Console](https://runpod.io/console) → Serverless → Templates
2. Click **"New Template"**
3. Fill in:
   - **Template Name**: `slopcade-comfyui`
   - **Container Image**: `runpod/worker-comfyui:5.7.1-base`
   - **Container Startup Command**: 
     ```bash
     bash -c "
     # Install custom nodes
     if [ ! -d '/comfyui/custom_nodes/ComfyUI-RMBG' ]; then
       cd /comfyui/custom_nodes
       git clone https://github.com/1038lab/ComfyUI-RMBG
       pip install -r ComfyUI-RMBG/requirements.txt --quiet
     fi
     
     if [ ! -d '/comfyui/custom_nodes/ComfyUI_essentials' ]; then
       cd /comfyui/custom_nodes
       git clone https://github.com/cubiq/ComfyUI_essentials
     fi
     
     # Start the worker
     python /comfyui/main.py
     "
     ```
   - **Container Disk**: 30 GB
   - **Volume Mount Path**: `/comfyui/models`
   - **Expose HTTP Ports**: `8188`
   - **Expose WebSocket Ports**: `8188`

4. Click **"Create Template"**

### Step 2: Create Serverless Endpoint

1. Go to RunPod Console → Serverless → Endpoints
2. Click **"New Endpoint"**
3. Select your template: `slopcade-comfyui`
4. Configure:
   - **Name**: `slopcade-comfyui-prod`
   - **GPU**: RTX 4090 or A100 (24GB+ VRAM recommended for Flux)
   - **Workers**: 
     - Min: 0 (scale to zero when idle)
     - Max: 3 (scale up during high demand)
   - **Idle Timeout**: 30 seconds
   - **Execution Timeout**: 300 seconds (5 minutes)
5. Click **"Deploy"**

### Step 3: Get Endpoint ID

1. Wait for endpoint to be ready (2-3 minutes)
2. Copy the **Endpoint ID** (looks like `a1b2c3d4-5e6f-7g8h-9i0j-1k2l3m4n5o6p`)
3. Add to your `.hush` file:
   ```bash
   hush set RUNPOD_COMFYUI_ENDPOINT_ID your-endpoint-id-here
   ```

### Step 4: Test the Endpoint

```bash
# Test with a simple prompt
pnpm hush run -- npx tsx api/scripts/test-comfyui-api.ts "a red apple" txt2img
```

## Cost Comparison

| Method | Build Time | Cold Start | Monthly Cost |
|--------|-----------|------------|--------------|
| GitHub Actions | Fails (disk) | - | $0 |
| Custom Docker on RunPod | 10-15 min | 10s | ~$50-100 |
| **RunPod Templates** (recommended) | **0 min** | **30-60s** | **~$30-50** |

## Advantages

✅ **No Docker build** - Uses RunPod's verified base image
✅ **Fast iteration** - Update startup script without rebuilding
✅ **Scalable** - Auto-scales from 0 to N workers
✅ **Cost efficient** - Only pay when generating images
✅ **No disk issues** - RunPod handles infrastructure

## Notes

- First cold start downloads models (~30-60s)
- Subsequent calls use cached models (~3-5s)
- Models persist in volume mount between calls
- To update: Edit template → redeploy endpoint (no build needed)
