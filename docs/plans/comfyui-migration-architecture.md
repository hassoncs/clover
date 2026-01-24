# Scenario.com to RunPod ComfyUI Migration Architecture

> **Status**: READY - Waiting to exhaust Scenario.com credits  
> **Priority**: High  
> **Timeline**: Deploy after Scenario.com credits used  
> **Estimated Savings**: ~50-90% on image generation costs  
> **Current Provider**: Scenario.com (DO NOT CHANGE YET)
>
> **See also**: [Setup Status & Deployment Checklist](./runpod-comfyui-setup-status.md)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State (Scenario.com)](#current-state-scenariocom)
3. [Target State (RunPod ComfyUI)](#target-state-runpod-comfyui)
4. [Workflow Architecture](#workflow-architecture)
5. [Migration Path](#migration-path)
6. [Pros & Cons Analysis](#pros--cons-analysis)
7. [Phase Timeline](#phase-timeline)
8. [Technical Implementation Details](#technical-implementation-details)

---

## Executive Summary

We're migrating from Scenario.com's hosted image generation API to self-hosted ComfyUI workflows on RunPod serverless. The key architectural change is moving from **multi-round-trip stage pipelines** to **unified single-call workflows** per asset type.

### Key Benefits
- **~95-98% cost reduction** - RunPod charges ~$0.00019-0.00031/sec vs Scenario's per-image pricing
- **Reduced latency** - One API call per asset instead of 3-6 round trips
- **Full control** - Custom workflows, models, and processing pipelines
- **No vendor lock-in** - Standard ComfyUI workflows are portable

### Scope
| Asset Type | Migration Approach |
|------------|-------------------|
| `entity` | Full migration to ComfyUI |
| `background` | Full migration to ComfyUI |
| `title_hero` | Full migration to ComfyUI |
| `parallax` | Deferred (nice-to-have) |
| `sheet` | Full migration to ComfyUI |

---

## Current State (Scenario.com)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Current Pipeline Architecture                 │
└─────────────────────────────────────────────────────────────────┘

api/src/ai/pipeline/
├── types.ts          # AssetSpec, Stage, PipelineAdapters
├── registry.ts       # Maps asset types → stage sequences
├── executor.ts       # Runs stages sequentially
├── stages/index.ts   # Stage implementations
├── prompt-builder.ts # Builds prompts per asset type
└── adapters/
    ├── node.ts       # ScenarioAdapter for CLI/scripts
    └── workers.ts    # ScenarioAdapter for CF Workers
```

### Pipeline Registry (Current)

```typescript
// api/src/ai/pipeline/registry.ts
export const pipelineRegistry: Record<AssetType, Stage[]> = {
  entity: [
    silhouetteStage,      // Local: Create silhouette PNG
    buildPromptStage,     // Local: Build prompt text
    uploadToScenarioStage,// API: Upload silhouette → asset ID
    img2imgStage,         // API: img2img → download result
    removeBackgroundStage,// API: Remove BG → download result
    uploadR2Stage,        // API: Upload to R2
  ],
  background: [
    buildPromptStage,
    txt2imgStage,         // API: txt2img → download result
    uploadR2Stage,
  ],
  title_hero: [
    buildPromptStage,
    txt2imgStage,
    removeBackgroundStage,
    uploadR2Stage,
  ],
  parallax: [
    buildPromptStage,
    txt2imgStage,
    layeredDecomposeStage,// API: Decompose → download layers
    uploadR2Stage,
  ],
  sheet: [
    sheetGuideStage,      // Local: Create grid guide PNG
    buildPromptStage,
    uploadToScenarioStage,
    img2imgStage,
    buildSheetMetadataStage,
    uploadR2Stage,
  ],
};
```

### API Round-Trips per Asset Type (Current)

| Asset Type | API Calls | Operations |
|------------|-----------|------------|
| `entity` | 6 | upload, img2img, download, remove-bg, download, R2 |
| `background` | 3 | txt2img, download, R2 |
| `title_hero` | 5 | txt2img, download, remove-bg, download, R2 |
| `parallax` | 4+ | txt2img, download, decompose, download×N, R2 |
| `sheet` | 6 | upload, img2img, download, R2 |

### ScenarioAdapter Interface

```typescript
// api/src/ai/pipeline/types.ts
export interface ScenarioAdapter {
  uploadImage: (png: Uint8Array) => Promise<string>;
  txt2img: (params: { prompt; width?; height?; negativePrompt? }) 
    => Promise<{ assetId: string }>;
  img2img: (params: { imageAssetId; prompt; strength? }) 
    => Promise<{ assetId: string }>;
  downloadImage: (assetId: string) 
    => Promise<{ buffer: Uint8Array; extension: string }>;
  removeBackground: (assetId: string) 
    => Promise<{ assetId: string }>;
  layeredDecompose?: (params: { imageAssetId; layerCount; description? }) 
    => Promise<{ assetIds: string[] }>;
}
```

---

## Target State (RunPod ComfyUI)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Target Pipeline Architecture                  │
└─────────────────────────────────────────────────────────────────┘

                         ┌──────────────┐
                         │  Asset Spec  │
                         └──────┬───────┘
                                │
                    ┌───────────┴───────────┐
                    │   Workflow Selector   │
                    │   (by asset type)     │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ entity.json   │     │background.json│     │title_hero.json│
│               │     │               │     │               │
│ LoadImage     │     │ EmptyLatent   │     │ EmptyLatent   │
│     ↓         │     │     ↓         │     │     ↓         │
│ VAEEncode     │     │ CLIPEncode    │     │ CLIPEncode    │
│     ↓         │     │     ↓         │     │     ↓         │
│ KSampler      │     │ KSampler      │     │ KSampler      │
│     ↓         │     │     ↓         │     │     ↓         │
│ VAEDecode     │     │ VAEDecode     │     │ VAEDecode     │
│     ↓         │     │     ↓         │     │     ↓         │
│ BiRefNet      │     │ SaveImage     │     │ BiRefNet      │
│     ↓         │     └───────────────┘     │     ↓         │
│ SaveImage     │                           │ SaveImage     │
└───────────────┘                           └───────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │   Single API Call     │
                    │   /runsync            │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │   Upload to R2        │
                    └───────────────────────┘
```

### New File Structure

```
api/src/ai/
├── comfyui.ts              # Existing ComfyUIClient
├── comfyui-types.ts        # Existing types
├── workflows/
│   ├── index.ts            # Workflow builders (update)
│   ├── txt2img.json        # Basic txt2img (existing)
│   ├── img2img.json        # Basic img2img (existing)
│   ├── remove-background.json # BG removal only (existing)
│   │
│   │ # NEW: Unified workflows per asset type
│   ├── entity.json         # img2img + BiRefNet bg removal
│   ├── background.json     # txt2img only (alias of txt2img.json)
│   ├── title-hero.json     # txt2img + BiRefNet bg removal
│   └── sheet.json          # img2img (guide → styled sheet)
│
└── pipeline/
    └── adapters/
        └── node.ts         # Update to use unified workflows
```

### API Round-Trips per Asset Type (Target)

| Asset Type | API Calls | Operations |
|------------|-----------|------------|
| `entity` | **2** | ComfyUI (does img2img+bg-removal), R2 |
| `background` | **2** | ComfyUI (txt2img), R2 |
| `title_hero` | **2** | ComfyUI (txt2img+bg-removal), R2 |
| `parallax` | Deferred | Keep on Scenario or drop |
| `sheet` | **2** | ComfyUI (img2img), R2 |

### Unified Workflow Approach

Instead of calling separate stages, each asset type maps to a single ComfyUI workflow that performs all operations in one call:

```typescript
// New workflow selector
function getWorkflowForAssetType(type: AssetType): string {
  const workflows = {
    entity: 'entity',        // img2img → bg-removal
    background: 'background', // txt2img
    title_hero: 'title-hero', // txt2img → bg-removal
    sheet: 'sheet',          // img2img (guide-based)
  };
  return workflows[type];
}
```

---

## Workflow Architecture

### Workflow JSON Structure per Asset Type

#### 1. Entity Workflow (`entity.json`)

**Pipeline**: Input silhouette → img2img → Background Removal → Output

```json
{
  "1": {
    "class_type": "LoadImage",
    "inputs": { "image": "{{INPUT_IMAGE}}" }
  },
  "2": {
    "class_type": "VAEEncode",
    "inputs": {
      "pixels": ["1", 0],
      "vae": ["12", 0]
    }
  },
  "4": {
    "class_type": "DualCLIPLoader",
    "inputs": {
      "clip_name1": "clip_l.safetensors",
      "clip_name2": "t5xxl_fp8_e4m3fn.safetensors",
      "type": "flux"
    }
  },
  "6": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "{{PROMPT}}",
      "clip": ["4", 0]
    }
  },
  "10": {
    "class_type": "UNETLoader",
    "inputs": {
      "unet_name": "flux1-dev-fp8.safetensors",
      "weight_dtype": "fp8_e4m3fn"
    }
  },
  "12": {
    "class_type": "VAELoader",
    "inputs": { "vae_name": "ae.safetensors" }
  },
  "13": {
    "class_type": "FluxGuidance",
    "inputs": {
      "guidance": 3.5,
      "conditioning": ["6", 0]
    }
  },
  "17": {
    "class_type": "KSampler",
    "inputs": {
      "seed": "{{SEED}}",
      "steps": 28,
      "cfg": 1,
      "sampler_name": "euler",
      "scheduler": "simple",
      "denoise": 0.95,
      "model": ["10", 0],
      "positive": ["13", 0],
      "negative": ["6", 0],
      "latent_image": ["2", 0]
    }
  },
  "8": {
    "class_type": "VAEDecode",
    "inputs": {
      "samples": ["17", 0],
      "vae": ["12", 0]
    }
  },
  "20": {
    "class_type": "BiRefNet",
    "_meta": { "title": "Background Removal" },
    "inputs": {
      "image": ["8", 0],
      "model": "BiRefNet-general"
    }
  },
  "9": {
    "class_type": "SaveImage",
    "inputs": {
      "filename_prefix": "entity",
      "images": ["20", 0]
    }
  }
}
```

#### 2. Background Workflow (`background.json`)

**Pipeline**: Empty latent → txt2img → Output (no bg removal)

```json
{
  "4": {
    "class_type": "DualCLIPLoader",
    "inputs": {
      "clip_name1": "clip_l.safetensors",
      "clip_name2": "t5xxl_fp8_e4m3fn.safetensors",
      "type": "flux"
    }
  },
  "5": {
    "class_type": "EmptySD3LatentImage",
    "inputs": {
      "width": "{{WIDTH}}",
      "height": "{{HEIGHT}}",
      "batch_size": 1
    }
  },
  "6": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "{{PROMPT}}",
      "clip": ["4", 0]
    }
  },
  "10": {
    "class_type": "UNETLoader",
    "inputs": {
      "unet_name": "flux1-dev-fp8.safetensors",
      "weight_dtype": "fp8_e4m3fn"
    }
  },
  "12": {
    "class_type": "VAELoader",
    "inputs": { "vae_name": "ae.safetensors" }
  },
  "13": {
    "class_type": "FluxGuidance",
    "inputs": {
      "guidance": 3.5,
      "conditioning": ["6", 0]
    }
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
    "inputs": {
      "samples": ["17", 0],
      "vae": ["12", 0]
    }
  },
  "9": {
    "class_type": "SaveImage",
    "inputs": {
      "filename_prefix": "background",
      "images": ["8", 0]
    }
  }
}
```

#### 3. Title Hero Workflow (`title-hero.json`)

**Pipeline**: Empty latent → txt2img → Background Removal → Output

Same as background.json but with BiRefNet node before SaveImage (like entity.json structure).

#### 4. Sheet Workflow (`sheet.json`)

**Pipeline**: Input guide → img2img → Output (no bg removal needed for sheets)

Same structure as existing img2img.json - the sheet guide already defines the grid structure.

---

## Migration Path

### Strategy: Parallel Providers with Feature Flags

```typescript
// Proposed provider selection logic
type ImageProvider = 'scenario' | 'comfyui-premade' | 'comfyui-custom';

interface ProviderConfig {
  // Which provider to use per asset type
  entity: ImageProvider;
  background: ImageProvider;
  title_hero: ImageProvider;
  parallax: ImageProvider; // Always 'scenario' for now
  sheet: ImageProvider;
}

// Default during migration
const DEFAULT_PROVIDERS: ProviderConfig = {
  entity: 'comfyui-premade',
  background: 'comfyui-premade',
  title_hero: 'comfyui-premade',
  parallax: 'scenario',       // Keep on Scenario
  sheet: 'comfyui-premade',
};
```

### Phase 1: Validate Pre-made Endpoint

**Goal**: Determine capabilities of existing endpoint `pd3dqti6qlf5cs`

1. Test txt2img generation
2. Test img2img with silhouette input
3. Check if BiRefNet/BRIA RMBG nodes are available
4. Measure latency and quality

**Outcome Options**:
- **A) Full capability** → Use pre-made for all workflows
- **B) No bg-removal** → Use pre-made for background/sheet, need custom for entity/title_hero
- **C) Missing models** → Need custom worker for everything

### Phase 2: Create Unified Workflows

Based on Phase 1 findings:

```
Option A: Pre-made has everything
├── Create entity.json (img2img + bg-removal)
├── Create title-hero.json (txt2img + bg-removal)
├── background.json = existing txt2img.json
└── sheet.json = existing img2img.json

Option B: Pre-made lacks bg-removal
├── background.json → pre-made endpoint
├── sheet.json → pre-made endpoint
└── entity.json, title-hero.json → custom worker with BiRefNet
```

### Phase 3: Update Pipeline Adapter

Modify `ComfyUIClient` to support unified workflows:

```typescript
// api/src/ai/comfyui.ts - New method
async generateAsset(params: {
  assetType: AssetType;
  prompt: string;
  inputImage?: Uint8Array; // For entity, sheet
  width?: number;
  height?: number;
  seed?: number;
}): Promise<{ assetId: string }> {
  const workflowId = getWorkflowForAssetType(params.assetType);
  const workflow = loadWorkflow(workflowId);
  
  // Inject parameters
  const preparedWorkflow = prepareWorkflow(workflow, {
    prompt: params.prompt,
    width: params.width ?? 1024,
    height: params.height ?? 1024,
    seed: params.seed ?? randomSeed(),
  });
  
  // Build images array if input provided
  const images = params.inputImage 
    ? [{ name: 'input.png', image: base64Encode(params.inputImage) }]
    : undefined;
  
  const results = await this.executeWorkflow(preparedWorkflow, images);
  return { assetId: this.storeAsset(results[0].image, 'image/png') };
}
```

### Phase 4: Simplify Pipeline Stages

With unified workflows, many stages become no-ops or are removed:

```typescript
// Simplified registry for ComfyUI provider
const comfyuiPipelineRegistry: Record<AssetType, Stage[]> = {
  entity: [
    silhouetteStage,      // Still local
    buildPromptStage,     // Still local
    comfyuiGenerateStage, // NEW: single API call does img2img+bg-removal
    uploadR2Stage,
  ],
  background: [
    buildPromptStage,
    comfyuiGenerateStage, // Single API call
    uploadR2Stage,
  ],
  title_hero: [
    buildPromptStage,
    comfyuiGenerateStage, // Does txt2img+bg-removal
    uploadR2Stage,
  ],
  sheet: [
    sheetGuideStage,
    buildPromptStage,
    comfyuiGenerateStage, // Single API call
    buildSheetMetadataStage,
    uploadR2Stage,
  ],
};
```

---

## Pros & Cons Analysis

### Unified Workflows (Chosen Approach)

| Pros | Cons |
|------|------|
| Single API call per asset | Less flexibility per-operation |
| Reduced latency (no intermediate downloads) | Larger workflow JSONs |
| Simpler error handling | Harder to debug individual steps |
| Lower bandwidth (no intermediate images) | Can't mix-and-match stages |
| Atomic operations | Must create new workflow for new asset types |

### Pre-made Endpoint

| Pros | Cons |
|------|------|
| Zero setup time | Unknown capabilities |
| No infrastructure to maintain | Can't customize models |
| Immediate testing possible | May lack bg-removal nodes |
| Shared cold-start pool | Less control over versions |

### Custom ComfyUI Worker

| Pros | Cons |
|------|------|
| Full control over nodes/models | Setup and maintenance overhead |
| Can add BiRefNet, custom LoRAs | Cold start penalty |
| Reproducible builds | Need to manage Docker images |
| Can optimize for our use case | Higher operational complexity |

### Scenario.com (Current)

| Pros | Cons |
|------|------|
| Proven, working | 95-98% more expensive |
| Has layered decomposition | Vendor lock-in |
| Managed infrastructure | Multiple round-trips |
| Good quality models | Limited customization |

---

## Phase Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│                      Migration Timeline                          │
└─────────────────────────────────────────────────────────────────┘

Week 1: Discovery & Validation
├── Day 1-2: Test pre-made endpoint capabilities
│   ├── Run txt2img test
│   ├── Run img2img test  
│   └── Check for bg-removal nodes
├── Day 3-4: Document findings, make architecture decision
└── Day 5: Create detailed implementation tasks

Week 2-3: Workflow Development
├── Create unified workflow JSONs
│   ├── entity.json
│   ├── title-hero.json
│   └── sheet.json (if different from img2img)
├── Create workflow builder functions
└── Add workflow validation/testing

Week 4: Pipeline Integration
├── Add ComfyUI unified workflow adapter
├── Update pipeline registry for ComfyUI provider
├── Add provider switching logic
└── Integration tests

Week 5: Testing & Validation
├── Generate test assets with both providers
├── Compare quality side-by-side
├── Measure latency and costs
└── Fix any issues

Week 6: Migration & Monitoring
├── Switch default provider to ComfyUI
├── Monitor for errors
├── Keep Scenario as fallback
└── Document learnings

Future (As Needed):
├── Custom worker for advanced features
├── Parallax layer decomposition investigation
└── LoRA training for consistent art style
```

---

## Technical Implementation Details

### Environment Variables

```bash
# Provider selection
IMAGE_GENERATION_PROVIDER=comfyui  # 'scenario' | 'runpod' | 'comfyui'

# ComfyUI/RunPod Serverless
RUNPOD_API_KEY=your-api-key
RUNPOD_COMFYUI_ENDPOINT_ID=pd3dqti6qlf5cs  # Pre-made endpoint

# Optional: Custom worker (if pre-made lacks features)
RUNPOD_COMFYUI_CUSTOM_ENDPOINT_ID=xxx  # Custom worker with BiRefNet

# Scenario (keep as fallback)
SCENARIO_API_KEY=existing-key
SCENARIO_SECRET_API_KEY=existing-secret
```

### New ComfyUIClient Method

```typescript
// api/src/ai/comfyui.ts

interface UnifiedGenerateParams {
  workflowId: 'entity' | 'background' | 'title-hero' | 'sheet';
  prompt: string;
  negativePrompt?: string;
  inputImage?: Uint8Array;
  width?: number;
  height?: number;
  seed?: number;
}

async unifiedGenerate(params: UnifiedGenerateParams): Promise<{ assetId: string }> {
  const workflow = loadAndPrepareWorkflow(params.workflowId, {
    prompt: params.prompt,
    negativePrompt: params.negativePrompt,
    width: params.width ?? 1024,
    height: params.height ?? 1024,
    seed: params.seed ?? Math.floor(Math.random() * 1e9),
  });

  const images = params.inputImage
    ? [{ name: 'input.png', image: Buffer.from(params.inputImage).toString('base64') }]
    : undefined;

  const results = await this.executeWorkflow(workflow, images);
  
  if (!results.length) {
    throw new Error('No images generated');
  }

  return { assetId: this.storeAsset(results[0].image, 'image/png') };
}
```

### Custom Worker Dockerfile (If Needed)

```dockerfile
FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04

# Install ComfyUI
RUN git clone https://github.com/comfyanonymous/ComfyUI.git /comfyui

# Install custom nodes for bg removal
RUN git clone https://github.com/ZHO-ZHO-ZHO/ComfyUI-BiRefNet.git \
    /comfyui/custom_nodes/ComfyUI-BiRefNet

# Download models
RUN wget -O /comfyui/models/unet/flux1-dev-fp8.safetensors \
    https://huggingface.co/Comfy-Org/flux1-dev/resolve/main/flux1-dev-fp8.safetensors

# Download BiRefNet model
RUN wget -O /comfyui/models/BiRefNet/BiRefNet-general.pth \
    https://huggingface.co/ZhengPeng7/BiRefNet/resolve/main/BiRefNet-general.pth

COPY handler.py /handler.py
CMD ["python", "/handler.py"]
```

### Testing Script

```typescript
// api/scripts/test-comfyui-unified.ts
import { ComfyUIClient } from '../src/ai/comfyui';
import { createNodeSilhouetteAdapter } from '../src/ai/pipeline/adapters/node';

async function testEntityWorkflow() {
  const client = new ComfyUIClient({
    endpoint: `https://api.runpod.ai/v2/${process.env.RUNPOD_COMFYUI_ENDPOINT_ID}`,
    apiKey: process.env.RUNPOD_API_KEY,
  });

  // Create silhouette
  const silhouetteAdapter = await createNodeSilhouetteAdapter();
  const silhouette = await silhouetteAdapter.createSilhouette({
    shape: 'box',
    width: 64,
    height: 64,
  });

  // Generate entity with unified workflow
  const result = await client.unifiedGenerate({
    workflowId: 'entity',
    prompt: 'A cute pixel art slime monster, 16-bit retro game style',
    inputImage: silhouette,
    width: 512,
    height: 512,
  });

  // Download and save
  const { buffer } = await client.downloadImage(result.assetId);
  require('fs').writeFileSync('test-entity.png', Buffer.from(buffer));
  console.log('Saved test-entity.png');
}

testEntityWorkflow().catch(console.error);
```

---

## Open Questions

1. **Pre-made endpoint capabilities**: Need to verify what custom nodes are installed on `pd3dqti6qlf5cs`

2. **Parallax alternative**: If we want to keep parallax support, options include:
   - Keep using Scenario.com just for parallax
   - Investigate ComfyUI depth-based layer separation
   - Manual layer creation in image editor
   - Drop parallax backgrounds entirely

3. **Quality comparison**: Need side-by-side comparison of Scenario vs ComfyUI output quality

4. **Cold start latency**: Pre-made endpoints may have cold starts - need to measure actual latency

---

## Success Criteria

- [ ] All asset types (except parallax) generate successfully via ComfyUI
- [ ] Quality matches or exceeds Scenario.com output
- [ ] Latency under 30 seconds per asset
- [ ] Cost per asset reduced by >90%
- [ ] Clean fallback to Scenario.com if needed
- [ ] Full test coverage for new adapter code

---

_Created: 2026-01-24_  
_Status: Ready for Review_
