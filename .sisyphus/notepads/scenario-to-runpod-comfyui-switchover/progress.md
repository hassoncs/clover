# Progress Summary - Scenario to RunPod/ComfyUI Switchover

**Last Updated**: 2026-01-27  
**Status**: 9/12 tasks complete (waiting for endpoint deployment)

## Completed Tasks (9/12)

### ✅ Task 1: Provider-Agnostic Contract
- Created `api/src/ai/provider-contract.ts` with `ImageGenerationResult` interface
- Added `ProviderErrorCode` enum with standardized error codes

### ✅ Task 3: Secrets/Config Wiring
- Updated `api/src/trpc/context.ts` with new Env types
- Updated `.hush.template` with provider selection documentation

### ✅ Task 4: Pipeline Provider Naming
- Renamed `ScenarioAdapter` → `ImageGenerationAdapter`
- Updated artifact names from `scenarioAssetId` → `providerAssetId`

### ✅ Task 5: Workers Provider Adapter Factory
- Implemented `createWorkersComfyUIAdapter(env)` and `createWorkersProviderAdapter(env)`
- Provider selection working for scenario/comfyui/runpod

### ✅ Task 6: TRPC Routes Provider Selection
- Updated all TRPC routes to use `getImageGenerationConfig()`
- Routes updated: `assets.ts`, `asset-system.ts`

### ✅ Task 9: Regression Tests
- All 14 provider adapter tests pass
- Contract validation for all providers

### ✅ Task 10: Rollout Plan
- Created `docs/runpod-rollout-plan.md`
- Phased rollout strategy documented

### ✅ Task 11: Update CLI Tools
- Updated `api/src/cli/generate-ui.ts` and `api/scripts/ui-experiment.ts`
- Provider selection support in all CLI tools

## In Progress

### 🔄 Task 2: Deploy RunPod Endpoint
**Status**: BUILDING - User triggered build on RunPod

**Setup Complete:**
- ✅ Created fork: `hassoncs/worker-comfyui`
- ✅ Added as git submodule: `api/runpod-worker/`
- ✅ Custom nodes added to Dockerfile (ComfyUI-RMBG, ComfyUI_essentials)
- ✅ Committed to main branch

**Build Configuration:**
- Repository: `hassoncs/slopcade`
- Dockerfile: `api/runpod-worker/Dockerfile`
- Build Context: `/api/runpod-worker`
- Includes: Flux.1-dev-fp8 + custom nodes (~15GB)

**Waiting for**: Build completion → Endpoint ID

## Blocked (Waiting for Task 2)

### ⏸️ Task 7: Validate ComfyUI Endpoint
- Test txt2img/img2img/rmbg with real endpoint
- **Blocked**: Needs Endpoint ID from Task 2

### ⏸️ Task 8: End-to-End Pipeline Test  
- Run full asset generation pipeline
- **Blocked**: Needs working endpoint

## Pending

### 📋 Task 12: Scenario Deprecation
- Final cleanup after ComfyUI validation
- Remove Scenario requirements once ComfyUI is stable

## Next Actions

1. **Wait for RunPod build** (~10-15 minutes for first build)
2. **Copy Endpoint ID** when ready
3. **Run validation tests** (Tasks 7 & 8)
4. **Go live** with `IMAGE_GENERATION_PROVIDER=comfyui`

## Key Files

- `api/runpod-worker/` - Git submodule with RunPod worker
- `docs/runpod-worker-submodule.md` - How to update from upstream
- `docs/runpod-comfyui-config.md` - Configuration reference
- `docs/runpod-rollout-plan.md` - Rollout strategy

**Ready for testing as soon as endpoint is deployed!** 🚀
