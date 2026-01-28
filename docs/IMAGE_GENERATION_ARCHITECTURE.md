# Unified Image Generation Architecture

This document describes our unified image generation system that supports both **Modal** (default) and **Scenario.com** providers through a single, consistent interface.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR CODE                                │
│  (CLI tools, TRPC routes, Pipeline stages)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              UNIFIED INTERFACE                              │
│  AssetService OR Pipeline Adapters                          │
│  (provider-agnostic operations)                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           PROVIDER SELECTION                                │
│  IMAGE_GENERATION_PROVIDER env var                          │
│  - 'modal' (default) → Modal ComfyUI                        │
│  - 'scenario' → Scenario.com                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                              ▼
┌──────────────┐              ┌──────────────┐
│    MODAL     │              │   SCENARIO   │
│  ComfyUI     │              │   .com API   │
│  Flux Model  │              │  Proprietary │
└──────────────┘              └──────────────┘
```

## Key Principle: Single Entry Point

**All image generation goes through `AssetService`** (or pipeline adapters that wrap it). No direct client instantiation anywhere else.

### ✅ Correct Usage

```typescript
import { AssetService } from './ai/assets';

const assetService = new AssetService(env);

// Works with Modal OR Scenario depending on env
const result = await assetService.generateAsset({
  prompt: "A cute pixel art cat",
  type: 'entity'
});
```

### ❌ Incorrect Usage (Don't Do This)

```typescript
// Don't instantiate clients directly
import { ScenarioClient } from './ai/scenario';
const client = new ScenarioClient({ apiKey, apiSecret }); // ❌

// Don't call ComfyUIClient directly
import { ComfyUIClient } from './ai/comfyui';
const client = new ComfyUIClient({ endpoint }); // ❌
```

---

## Provider Configuration

### Environment Variables

| Variable | Required For | Description |
|----------|--------------|-------------|
| `IMAGE_GENERATION_PROVIDER` | Optional | `'modal'` (default) or `'scenario'` |
| `MODAL_ENDPOINT` | Optional | Custom Modal endpoint URL |
| `SCENARIO_API_KEY` | Scenario only | Scenario API key |
| `SCENARIO_SECRET_API_KEY` | Scenario only | Scenario API secret |
| `SCENARIO_API_URL` | Optional | Custom Scenario API URL |

### Configuration Examples

**Using Modal (Default - Zero Config):**
```bash
# No env vars needed - works out of the box
# Uses: https://hassoncs--slopcade-comfyui-web-img2img.modal.run
```

**Using Modal (Custom Endpoint):**
```bash
export MODAL_ENDPOINT="https://your-endpoint.modal.run"
```

**Using Scenario:**
```bash
export IMAGE_GENERATION_PROVIDER="scenario"
export SCENARIO_API_KEY="your-api-key"
export SCENARIO_SECRET_API_KEY="your-api-secret"
```

---

## Available Operations

All operations work identically regardless of provider:

### 1. Generate Asset (txt2img)

```typescript
const result = await assetService.generateAsset({
  entityType: 'character',
  description: 'A heroic knight',
  style: 'pixel',
  size: { width: 512, height: 512 }
});
// Returns: { assetId: string }
```

### 2. Image to Image

```typescript
const result = await assetService.generateDirect({
  prompt: "Make it magical",
  imageAssetId: originalAssetId,
  strength: 0.6
});
```

### 3. Remove Background

```typescript
const result = await assetService.removeBackground({
  image: assetId
});
```

### 4. Batch Generation

```typescript
const results = await assetService.generateBatch([
  { entityType: 'item', description: 'Sword' },
  { entityType: 'item', description: 'Shield' }
]);
```

---

## Provider-Specific Details

### Modal (Default)

**Technology Stack:**
- **Platform:** Modal.com serverless GPUs
- **Software:** ComfyUI
- **Model:** Flux.1-dev-fp8
- **GPU:** NVIDIA A10G (24GB VRAM)

**Characteristics:**
- Cold start: 2-3 minutes (first request downloads 23GB model)
- Warm generation: ~35s for 512×512
- No API keys required
- Pay per second of GPU time (~$0.0012/s)

**When to Use:**
- Default for all new development
- When you want full control
- When scaling to variable workloads

### Scenario.com

**Technology Stack:**
- **Platform:** Scenario.com managed API
- **Models:** Proprietary + Flux
- **Billing:** Credit-based

**Characteristics:**
- No cold start
- Consistent ~2-5s generation
- Requires API key
- Subscription-based ($45/mo minimum)

**When to Use:**
- When you need faster cold starts
- When you have consistent high volume
- When you prefer managed service

---

## Usage by Context

### In TRPC Routes (Workers/Cloudflare)

```typescript
// api/src/trpc/routes/assets.ts
import { AssetService } from '../../ai/assets';

.mutation(async ({ ctx, input }) => {
  const assetService = new AssetService(ctx.env);
  
  const result = await assetService.generateAsset({
    entityType: input.entityType,
    description: input.description
  });
  
  return result;
});
```

**Provider selection:** Set `IMAGE_GENERATION_PROVIDER` in Cloudflare Workers environment variables.

### In CLI Tools (Node.js)

```typescript
// api/src/cli/generate-ui.ts
import { createNodeAdapters } from '../ai/pipeline/adapters/node';

const adapters = await createNodeAdapters({
  r2Bucket: 'slopcade-assets-dev',
  wranglerCwd: process.cwd(),
  publicUrlBase: 'http://localhost:8787/assets'
});

// Use adapters.provider for image generation
const result = await adapters.provider.txt2img({
  prompt: "A pixel art button",
  width: 256,
  height: 256
});
```

**Provider selection:** Set environment variables before running CLI:
```bash
IMAGE_GENERATION_PROVIDER=scenario SCENARIO_API_KEY=xxx pnpm generate:ui button
```

### In Pipeline Stages

```typescript
// api/src/ai/pipeline/stages/ui-component.ts
export async function generateBaseState(
  spec: UIComponentSheetSpec,
  adapters: PipelineAdapters
): Promise<AssetRun> {
  // Always use adapters.provider (unified interface)
  const { assetId } = await adapters.provider.txt2img({
    prompt: spec.themeDescription,
    width: spec.layout.cellWidth,
    height: spec.layout.cellHeight
  });
  
  return { assetId, /* ... */ };
}
```

**Provider selection:** Pipeline receives adapters from `createWorkersProviderAdapter(env)` or `createNodeAdapters()`, which respect `IMAGE_GENERATION_PROVIDER`.

---

## Migration Guide

### From Direct Client Usage

**Before (Scenario):**
```typescript
import { ScenarioClient } from './ai/scenario';

const client = new ScenarioClient({ apiKey, apiSecret });
const result = await client.generate({ prompt, width, height });
```

**After (Unified):**
```typescript
import { AssetService } from './ai/assets';

const assetService = new AssetService(env);
const result = await assetService.generateAsset({
  entityType: 'item',
  description: prompt,
  size: { width, height }
});
```

### From Direct ComfyUI Usage

**Before (ComfyUI):**
```typescript
import { ComfyUIClient } from './ai/comfyui';

const client = new ComfyUIClient({ endpoint });
const result = await client.txt2img({ prompt, width, height });
```

**After (Unified):**
```typescript
import { AssetService } from './ai/assets';

const assetService = new AssetService(env);
const result = await assetService.generateDirect({
  prompt,
  width,
  height
});
```

---

## Cost Comparison

| Metric | Modal | Scenario |
|--------|-------|----------|
| **Monthly Minimum** | $0 | $45 |
| **Per Image (512×512)** | ~$0.042 | ~$0.02 (with subscription) |
| **Cold Start** | 2-3 min | None |
| **Warm Generation** | ~35s | ~2-5s |
| **Model Quality** | Excellent (Flux) | Good |
| **Control** | Full | Limited |

**Recommendation:**
- **Development/Low Volume:** Use Modal (no minimum, pay per use)
- **Production/High Volume:** Test both, Scenario may be cheaper at >2,500 images/month

---

## Testing

### Test with Modal (Default)
```bash
# No setup needed
hush run -- pnpm generate:ui button --theme "medieval"
```

### Test with Scenario
```bash
# Set credentials
export IMAGE_GENERATION_PROVIDER="scenario"
export SCENARIO_API_KEY="your-key"
export SCENARIO_SECRET_API_KEY="your-secret"

# Run generation
hush run -- pnpm generate:ui button --theme "medieval"
```

### Verify Provider Being Used
```bash
# Check configuration
curl https://your-api.com/trpc/assets.status
# Returns: { configured: true, provider: "modal" }
```

---

## Troubleshooting

### "Provider not configured" Error

**Modal:** Should never happen - zero config required.

**Scenario:** Check that `SCENARIO_API_KEY` and `SCENARIO_SECRET_API_KEY` are set:
```bash
echo $SCENARIO_API_KEY  # Should output your key
echo $IMAGE_GENERATION_PROVIDER  # Should be "scenario"
```

### Slow Generation (Modal)

**Expected:** First request after idle period takes 2-3 minutes (cold start).  
**Solution:** Batch multiple generations together to keep container warm.

### Different Image Quality

Modal uses Flux model, Scenario uses proprietary models. Add style keywords to prompt:
```
"pixel art, 16-bit style, game sprite"
```

---

## Summary

✅ **Single Entry Point:** All image generation goes through `AssetService`  
✅ **Provider Switching:** Set `IMAGE_GENERATION_PROVIDER` env var  
✅ **No Direct Clients:** Don't instantiate ScenarioClient or ComfyUIClient  
✅ **Consistent Interface:** Same API regardless of provider  
✅ **Zero Config Default:** Modal works out of the box  

**Key Files:**
- `api/src/ai/assets.ts` - AssetService (single entry point)
- `api/src/ai/pipeline/adapters/workers.ts` - Workers adapter
- `api/src/ai/pipeline/adapters/node.ts` - Node.js/CLI adapter
- `api/src/trpc/context.ts` - Environment types
