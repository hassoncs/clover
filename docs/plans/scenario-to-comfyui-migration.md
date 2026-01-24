# Migration Plan: Scenario.com to RunPod

> **Status**: Phase 1 Implementation Complete  
> **Priority**: High  
> **Estimated Savings**: ~95-98% on image generation costs

---

## Phased Approach

### Phase 1: RunPod Serverless (Current - Implemented)

Simple REST API calls to pre-built serverless endpoints. No infrastructure to manage.

**Status**: ✅ Implementation complete, ready for testing

### Phase 2: ComfyUI on RunPod (Future)

Custom workflows with LoRAs, ControlNet, and advanced pipelines. Only needed when we require:
- Custom LoRA models for consistent art styles
- ControlNet for precise sprite positioning  
- Multi-step generation pipelines
- Sprite sheet generation with grid layouts

---

## Cost Comparison

| Volume | Scenario.com | RunPod Serverless | Savings |
|--------|-------------|-------------------|---------|
| 100/month | ~$5-10 | ~$0.10-0.20 | 95% |
| 1,000/month | ~$50-100 | ~$1-2 | 98% |
| 10,000/month | ~$500-1,000 | ~$10-20 | 98% |

RunPod billing: ~$0.00019-0.00031/sec depending on GPU type.

---

## Current Implementation

### Provider Architecture

Three providers supported via `IMAGE_GENERATION_PROVIDER` env var:

| Provider | Use Case | Status |
|----------|----------|--------|
| `scenario` | Current production (Scenario.com) | ✅ Working |
| `runpod` | **Phase 1** - Simple serverless API | ✅ Implemented |
| `comfyui` | Phase 2 - Advanced workflows | ✅ Implemented (for later) |

### New Files Created

```
api/src/ai/
├── runpod.ts           # RunPodClient class
├── runpod-types.ts     # Type definitions
├── comfyui.ts          # ComfyUIClient (Phase 2)
├── comfyui-types.ts    # ComfyUI types (Phase 2)
└── workflows/          # ComfyUI workflows (Phase 2)
    └── index.ts

api/scripts/
└── test-runpod-api.ts  # Manual test script
```

### Environment Variables

```bash
# Provider selection
IMAGE_GENERATION_PROVIDER=runpod  # 'scenario' | 'runpod' | 'comfyui'

# RunPod Serverless (Phase 1)
RUNPOD_API_KEY=your-api-key
RUNPOD_FLUX_ENDPOINT_ID=your-flux-endpoint    # Preferred
RUNPOD_SDXL_ENDPOINT_ID=your-sdxl-endpoint    # Fallback
RUNPOD_BG_REMOVAL_ENDPOINT_ID=your-rembg-endpoint  # Optional

# Scenario (keep as fallback)
SCENARIO_API_KEY=existing-key
SCENARIO_SECRET_API_KEY=existing-secret
```

---

## RunPod Serverless API

### Request Format

```typescript
POST https://api.runpod.ai/v2/{ENDPOINT_ID}/runsync
Authorization: Bearer {API_KEY}

{
  "input": {
    "prompt": "A cute pixel art cat",
    "width": 1024,
    "height": 1024,
    "num_inference_steps": 25,
    "guidance_scale": 7.5
  }
}
```

### Response Format

```typescript
{
  "id": "job-123",
  "status": "COMPLETED",
  "output": "https://storage.runpod.ai/image.png",  // or base64
  "executionTime": 3500
}
```

---

## Testing

### Unit Tests

```bash
# Run RunPod client tests
cd api && pnpm test:run src/ai/__tests__/runpod-client.test.ts
```

### Manual Testing

```bash
# Test with your RunPod credentials
RUNPOD_API_KEY=xxx \
RUNPOD_FLUX_ENDPOINT_ID=yyy \
npx tsx api/scripts/test-runpod-api.ts "A pixel art knight, 16-bit style"
```

Output saved to: `api/debug-output/runpod-test/`

---

## Human Setup Tasks

### 1. Create RunPod Account
- Sign up at https://runpod.io
- Add payment method
- Get API key from Settings

### 2. Deploy Serverless Endpoints

**Option A: Use Community Endpoints**
- Browse RunPod's serverless marketplace
- Look for SDXL or Flux endpoints
- Note the endpoint ID

**Option B: Deploy Your Own**
- Go to Serverless → New Endpoint
- Choose a template (e.g., `runpod/worker-sdxl`)
- Configure GPU type (RTX 4090 recommended for Flux)
- Deploy and note endpoint ID

### 3. (Optional) Background Removal Endpoint
- Deploy a RemBG worker
- Or use our existing Scenario.com for bg removal initially

---

## Pipeline Integration

The RunPod adapter implements the same `ScenarioAdapter` interface:

```typescript
interface ScenarioAdapter {
  uploadImage(png: Uint8Array): Promise<string>
  txt2img(params): Promise<{ assetId: string }>
  img2img(params): Promise<{ assetId: string }>
  downloadImage(assetId: string): Promise<{ buffer; extension }>
  removeBackground(assetId: string): Promise<{ assetId: string }>
  layeredDecompose?(params): Promise<{ assetIds: string[] }>  // Not in Phase 1
}
```

Usage in generate-game-assets.ts:

```typescript
const adapters = await createNodeAdapters({
  provider: 'runpod',  // Switch here
  runpodApiKey: process.env.RUNPOD_API_KEY,
  runpodFluxEndpointId: process.env.RUNPOD_FLUX_ENDPOINT_ID,
  // ... other config
});
```

---

## Limitations (Phase 1)

| Feature | Scenario.com | RunPod Serverless |
|---------|-------------|-------------------|
| txt2img | ✅ | ✅ |
| img2img | ✅ | ✅ |
| Background removal | ✅ | ⚠️ Needs separate endpoint |
| Layered decomposition | ✅ | ❌ Not available |
| Retro Diffusion models | ✅ | ⚠️ Depends on endpoint |

**Workarounds:**
- Background removal: Deploy RemBG endpoint or continue using Scenario for this step
- Layered decomposition: Keep using Scenario.com for parallax backgrounds
- Can mix providers per operation if needed

---

## Success Criteria (Phase 1)

- [ ] Generate single sprite via RunPod serverless
- [ ] Cost per image significantly lower than Scenario
- [ ] Response time under 30 seconds
- [ ] Output quality comparable to Scenario
- [ ] Clean abstraction allows swapping providers

---

## Phase 2 (Future)

When we need advanced features, the ComfyUI client is already implemented:

```typescript
const adapters = await createNodeAdapters({
  provider: 'comfyui',
  comfyuiEndpoint: 'https://your-pod.proxy.runpod.net',
  runpodApiKey: process.env.RUNPOD_API_KEY,
});
```

This enables:
- Custom ComfyUI workflows
- LoRA model support
- ControlNet integration
- Layered image decomposition
- Full pipeline control

---

## References

- [RunPod Serverless Docs](https://docs.runpod.io/serverless/overview)
- [RunPod API Reference](https://docs.runpod.io/serverless/endpoints/operations)
- [ComfyUI GitHub](https://github.com/comfyanonymous/ComfyUI) (Phase 2)

---

_Created: 2026-01-24_  
_Updated: 2026-01-24 - Added phased approach, RunPod Serverless implementation_
