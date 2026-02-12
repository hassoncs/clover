# Free Image Generation Providers

## TL;DR

> **Quick Summary**: Add three free-tier image generation providers (Together AI, Google AI Studio, Cloudflare Workers AI) alongside existing Scenario/Modal, with both native `ImageGenerationAdapter` implementations for pipeline compatibility and a lightweight Vercel AI SDK script for rapid txt2img experimentation.
> 
> **Deliverables**:
> - 3 new provider adapters implementing `ImageGenerationAdapter`
> - 1 experimental CLI script using Vercel AI SDK `generateImage()`
> - Provider routing in existing adapter factories
> - Updated `ImageProvider` type union
> - Unit tests for each adapter
> 
> **Estimated Effort**: Medium (~8-10 hours)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (contract) → Tasks 2-4 (adapters, parallel) → Task 5 (integration) → Task 6 (experiment CLI) → Task 7 (testing)

---

## Context

### Original Request
Add free/cheap image generation providers to reduce Scenario.com costs for personal experimentation and testing. Support easy model switching across providers. No local GPU — purely cloud API-based with generous free tiers.

### Interview Summary
**Key Discussions**:
- **Two-pronged approach**: (1) Native adapters implementing existing `ImageGenerationAdapter` for full pipeline compatibility, (2) Parallel Vercel AI SDK `generateImage()` path for quick txt2img experiments
- **Provider priorities**: Together AI (FLUX.1 schnell-Free, unlimited), Google AI Studio (Imagen 4, 1500/day), Cloudflare Workers AI (SDXL-Lightning, ~22 images/day)
- **Scope**: Personal testing only, not production scale

**Research Findings**:
- Project already uses Vercel AI SDK v6 (`ai` package) for text generation but NOT for images
- Existing `ImageGenerationAdapter` interface requires: `uploadImage`, `txt2img`, `img2img`, `downloadImage`, `removeBackground`, `layeredDecompose?`
- Free providers primarily support txt2img only; img2img and removeBackground are NOT available on free tiers
- Together AI returns images directly (base64/URL), not via provider-side asset storage — requires a local asset store pattern
- Together AI: unlimited FLUX generations at ~60 RPM via `black-forest-labs/FLUX.1-schnell-Free`
- Google AI Studio: Imagen 4 with generous free tier via `@ai-sdk/google`
- Cloudflare Workers AI: 10K neurons/day, SDXL-Lightning at ~22 images/day

### Metis Review
**Identified Gaps** (addressed):
- **img2img gap**: Free providers don't support img2img. Resolution: adapters throw `ProviderError` for unsupported operations; entity pipeline requires Scenario/Modal; free providers work for background/txt2img only
- **Asset ID mismatch**: Free providers return images directly, not provider-side asset IDs. Resolution: local in-memory asset store (same pattern as ComfyUI adapter)
- **Background removal gap**: No free provider offers bg removal. Resolution: throw clear `ProviderError`; document limitation
- **Rate limiting**: Different error formats across providers. Resolution: classify all 429s to `ProviderErrorCode.RATE_LIMITED`
- **Concurrency**: `generate-assets.ts` uses CONCURRENCY=5, free tiers may be stricter. Resolution: per-provider concurrency config

---

## Work Objectives

### Core Objective
Enable free-tier image generation across 3 providers via both the existing adapter interface (pipeline-compatible) and a standalone Vercel AI SDK script (quick experimentation), while keeping Scenario/Modal as the primary providers for the full entity pipeline.

### Concrete Deliverables
- `api/src/ai/providers/together/client.ts` — Together AI adapter
- `api/src/ai/providers/together/types.ts` — Together AI types
- `api/src/ai/providers/google-ai/client.ts` — Google AI Studio adapter
- `api/src/ai/providers/google-ai/types.ts` — Google AI Studio types
- `api/src/ai/providers/cloudflare-ai/client.ts` — Cloudflare Workers AI adapter
- `api/src/ai/providers/cloudflare-ai/types.ts` — Cloudflare Workers AI types
- `api/scripts/experiment-image.ts` — Vercel AI SDK experiment script
- Updated `api/src/ai/providers/contract.ts` — extended `ImageProvider` type
- Updated `api/src/ai/pipeline/adapters/node.ts` — new provider factories
- Unit tests for each adapter

### Definition of Done
- [ ] `IMAGE_GENERATION_PROVIDER=together` → txt2img generates FLUX images
- [ ] `IMAGE_GENERATION_PROVIDER=google` → txt2img generates Imagen 4 images
- [ ] `IMAGE_GENERATION_PROVIDER=cloudflare` → txt2img generates SDXL images
- [ ] `hush run -- pnpm generate:assets --game=ballSort` still works with `scenario`/`modal`
- [ ] Experiment script generates images from all 3 providers via Vercel AI SDK
- [ ] All unit tests pass: `vitest run`
- [ ] TypeScript compiles cleanly: `tsc --noEmit`

### Must Have
- Together AI adapter with FLUX.1 schnell-Free txt2img
- Google AI Studio adapter with Imagen 4 txt2img
- Cloudflare Workers AI adapter with SDXL-Lightning txt2img
- Clear `ProviderError` for unsupported operations (img2img, removeBackground)
- Local in-memory asset store for providers that return images directly
- Experimental CLI script using `generateImage()` from Vercel AI SDK
- Provider switching via `IMAGE_GENERATION_PROVIDER` env var

### Must NOT Have (Guardrails)
- DO NOT modify existing Scenario or ComfyUI adapter implementations
- DO NOT implement background removal or layered decomposition for free providers — throw `ProviderError`
- DO NOT implement provider fallback/rotation logic — env var switching only
- DO NOT change pipeline stage logic, registry, or R2 upload stages
- DO NOT implement client-side ML models (e.g., rembg for background removal)
- DO NOT add UI for provider selection — CLI/env only
- DO NOT implement caching or deduplication
- DO NOT modify `definition.json` or `game.ts` schemas
- DO NOT implement rate limit tracking or usage dashboards — just handle 429 errors

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES (Vitest with `@cloudflare/vitest-pool-workers`)
- **Automated tests**: YES (Tests-after — unit tests with mocked API responses)
- **Framework**: Vitest

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Provider Adapters** | Bash (vitest) | Run unit tests with mocked responses |
| **TypeScript types** | Bash (tsc --noEmit) | Type-check passes |
| **Experiment CLI** | Bash (tsx) | Run script with env vars, verify output file |
| **Integration** | Bash (vitest + tsc) | All tests pass, types compile |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: Provider contract updates + local asset store

Wave 2 (After Wave 1):
├── Task 2: Together AI adapter
├── Task 3: Google AI Studio adapter
└── Task 4: Cloudflare Workers AI adapter

Wave 3 (After Wave 2):
├── Task 5: Integration wiring (node.ts + workers.ts adapters)
└── Task 6: Experiment CLI script

Wave 4 (After Wave 3):
└── Task 7: Tests + final verification
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 4 | None |
| 2 | 1 | 5 | 3, 4 |
| 3 | 1 | 5 | 2, 4 |
| 4 | 1 | 5 | 2, 3 |
| 5 | 2, 3, 4 | 7 | 6 |
| 6 | 1 | 7 | 5 |
| 7 | 5, 6 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agent |
|------|-------|-------------------|
| 1 | 1 | quick (small contract changes) |
| 2 | 2, 3, 4 | 3x parallel unspecified-low (each adapter is ~100 lines) |
| 3 | 5, 6 | 2x parallel quick |
| 4 | 7 | unspecified-low (tests + verification) |

---

## TODOs

- [ ] 1. Extend provider contract and add local asset store utility

  **What to do**:
  - Extend the `ImageProvider` type in `contract.ts` to include `'together' | 'google-ai' | 'cloudflare-ai'`
  - Create `api/src/ai/providers/local-asset-store.ts` — a lightweight in-memory Map-based store for providers that return images directly (not via provider-side asset storage). This follows the exact same pattern used by `ComfyUIClient.assetStore` in `comfyui/client.ts:27-48`. Functions: `storeAsset(buffer: Uint8Array, mimeType: string): string` (returns synthetic ID), `getAsset(id: string): { buffer: Uint8Array, mimeType: string } | undefined`, `deleteAsset(id: string): void`.
  - Add a `ProviderCapabilities` type to document per-provider support: `{ txt2img: boolean, img2img: boolean, removeBackground: boolean, layeredDecompose: boolean }`. Add a `getProviderCapabilities(provider: ImageProvider): ProviderCapabilities` function.

  **Must NOT do**:
  - Do NOT modify existing `ImageGenerationAdapter` interface methods
  - Do NOT add new methods to the adapter interface
  - Do NOT change existing adapter implementations

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small file changes — extending a type union, creating one utility file
  - **Skills**: []
    - No specialized skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundation task)
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Tasks 2, 3, 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `api/src/ai/providers/comfyui/client.ts:27-48` — Existing in-memory asset store pattern (Map<string, ComfyAsset>). Copy this exact pattern for the shared utility.
  - `api/src/ai/providers/contract.ts:10` — Current `ImageProvider` type to extend
  - `api/src/ai/providers/contract.ts:146-174` — `ImageGenerationAdapter` interface (do NOT modify, just reference)

  **Type References**:
  - `api/src/ai/providers/contract.ts:97-105` — `ProviderErrorCode` enum for error classification

  **Acceptance Criteria**:
  - [ ] `ImageProvider` type includes `'together' | 'google-ai' | 'cloudflare-ai'`
  - [ ] `local-asset-store.ts` exists with `storeAsset`, `getAsset`, `deleteAsset` functions
  - [ ] `getProviderCapabilities()` returns correct capabilities for all providers
  - [ ] `tsc --noEmit` passes with no errors

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: TypeScript compiles with extended types
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: cd api && npx tsc --noEmit
      2. Assert: Exit code 0
      3. Assert: No errors in output
    Expected Result: Clean compilation
    Evidence: Terminal output captured

  Scenario: Local asset store works correctly
    Tool: Bash (vitest)
    Preconditions: Test file exists for local-asset-store
    Steps:
      1. Run: cd api && npx vitest run src/ai/providers/local-asset-store
      2. Assert: All tests pass
    Expected Result: store/get/delete work correctly, synthetic IDs are unique
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(ai): extend ImageProvider type and add local asset store utility`
  - Files: `api/src/ai/providers/contract.ts`, `api/src/ai/providers/local-asset-store.ts`
  - Pre-commit: `cd api && npx tsc --noEmit`

---

- [ ] 2. Together AI adapter

  **What to do**:
  - Create `api/src/ai/providers/together/types.ts` with Together AI config, defaults, and response types
  - Create `api/src/ai/providers/together/client.ts` implementing `ImageGenerationAdapter`
  - Together AI uses an OpenAI-compatible REST API at `https://api.together.xyz/v1/images/generations`
  - Auth: Bearer token via `TOGETHER_API_KEY` env var
  - Default model: `black-forest-labs/FLUX.1-schnell-Free` (free, ~60 RPM)
  - `txt2img`: POST to `/v1/images/generations` with `{ model, prompt, width, height, n: 1, response_format: "b64_json" }`. Store result in local asset store, return synthetic assetId.
  - `img2img`: Throw `ProviderError` with code `INPUT_INVALID` and message `"Together AI free tier does not support img2img. Use Scenario or Modal provider."`
  - `uploadImage`: Store in local asset store, return synthetic ID
  - `downloadImage`: Retrieve from local asset store
  - `removeBackground`: Throw `ProviderError` with message `"Together AI does not support background removal."`
  - `layeredDecompose`: undefined (optional in interface)
  - Export `createTogetherAIAdapter(config: TogetherAIConfig): ImageGenerationAdapter` factory function

  **Must NOT do**:
  - Do NOT implement img2img as a hack (e.g., ignore the input image)
  - Do NOT add retry logic — just let errors propagate
  - Do NOT add rate limit tracking

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Straightforward adapter implementation following existing patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `api/src/ai/providers/scenario/client.ts:566-628` — `createScenarioAdapter()` factory pattern. Follow this exact structure for creating the Together AI adapter factory.
  - `api/src/ai/providers/scenario/types.ts` — Pattern for provider types file (config, defaults, response types)
  - `api/src/ai/providers/contract.ts:146-174` — `ImageGenerationAdapter` interface to implement
  - `api/src/ai/providers/contract.ts:97-130` — `ProviderError` and `ProviderErrorCode` for error handling
  - `api/src/ai/providers/local-asset-store.ts` — Use for storing/retrieving images (created in Task 1)

  **API References**:
  - Together AI images API: `POST https://api.together.xyz/v1/images/generations`
  - Request body: `{ model: string, prompt: string, width?: number, height?: number, steps?: number, n?: number, response_format?: "b64_json" | "url" }`
  - Response: `{ data: [{ b64_json?: string, url?: string }] }`

  **Acceptance Criteria**:
  - [ ] `together/client.ts` exists and exports `createTogetherAIAdapter`
  - [ ] `together/types.ts` exists with `TogetherAIConfig` and defaults
  - [ ] `txt2img` calls Together API and returns synthetic assetId
  - [ ] `img2img` throws `ProviderError` with clear message
  - [ ] `removeBackground` throws `ProviderError` with clear message
  - [ ] `uploadImage` stores in local asset store
  - [ ] `downloadImage` retrieves from local asset store
  - [ ] `tsc --noEmit` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: TypeScript compiles with Together AI adapter
    Tool: Bash
    Preconditions: Task 1 completed
    Steps:
      1. Run: cd api && npx tsc --noEmit
      2. Assert: Exit code 0
    Expected Result: Clean compilation
    Evidence: Terminal output captured

  Scenario: Together AI adapter implements full interface
    Tool: Bash (grep)
    Preconditions: together/client.ts exists
    Steps:
      1. Verify createTogetherAIAdapter function is exported
      2. Verify it returns object with uploadImage, txt2img, img2img, downloadImage, removeBackground
      3. Verify img2img throws ProviderError
    Expected Result: Full interface implemented
    Evidence: Grep output captured
  ```

  **Commit**: YES
  - Message: `feat(ai): add Together AI image generation adapter`
  - Files: `api/src/ai/providers/together/client.ts`, `api/src/ai/providers/together/types.ts`
  - Pre-commit: `cd api && npx tsc --noEmit`

---

- [ ] 3. Google AI Studio adapter

  **What to do**:
  - Create `api/src/ai/providers/google-ai/types.ts` with Google AI config, defaults, and response types
  - Create `api/src/ai/providers/google-ai/client.ts` implementing `ImageGenerationAdapter`
  - Uses Google Generative AI REST API for Imagen 4
  - Auth: API key via `GOOGLE_AI_API_KEY` env var
  - Default model: `imagen-3.0-generate-002` (or `imagen-4.0-generate-001` if available)
  - `txt2img`: POST to `https://generativelanguage.googleapis.com/v1beta/models/{model}:predict` with prompt and image config. Response contains base64 images. Store in local asset store, return synthetic assetId.
  - `img2img`: Throw `ProviderError` — Imagen free tier img2img support is limited/unclear
  - `uploadImage`: Store in local asset store
  - `downloadImage`: Retrieve from local asset store
  - `removeBackground`: Throw `ProviderError`
  - `layeredDecompose`: undefined
  - Export `createGoogleAIAdapter(config: GoogleAIConfig): ImageGenerationAdapter`
  - Handle 429 rate limit by mapping to `ProviderErrorCode.RATE_LIMITED`

  **Must NOT do**:
  - Do NOT use the `@ai-sdk/google` package here — this is the native adapter, not the AI SDK path
  - Do NOT implement retry logic
  - Do NOT add Vertex AI support (that's paid)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Straightforward adapter implementation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `api/src/ai/providers/scenario/client.ts:566-628` — Adapter factory pattern to follow
  - `api/src/ai/providers/contract.ts:146-174` — Interface to implement
  - `api/src/ai/providers/contract.ts:97-130` — Error handling pattern
  - `api/src/ai/providers/local-asset-store.ts` — Local storage (Task 1)

  **API References**:
  - Google AI Imagen API: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:predict?key={API_KEY}`
  - Request: `{ instances: [{ prompt: string }], parameters: { sampleCount: 1, aspectRatio: "1:1" } }`
  - Response: `{ predictions: [{ bytesBase64Encoded: string, mimeType: string }] }`

  **Acceptance Criteria**:
  - [ ] `google-ai/client.ts` exports `createGoogleAIAdapter`
  - [ ] `google-ai/types.ts` exists with `GoogleAIConfig` and defaults
  - [ ] `txt2img` calls Google API and returns synthetic assetId
  - [ ] `img2img` throws `ProviderError`
  - [ ] `removeBackground` throws `ProviderError`
  - [ ] HTTP 429 mapped to `RATE_LIMITED` error code
  - [ ] `tsc --noEmit` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: TypeScript compiles with Google AI adapter
    Tool: Bash
    Preconditions: Task 1 completed
    Steps:
      1. Run: cd api && npx tsc --noEmit
      2. Assert: Exit code 0
    Expected Result: Clean compilation
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `feat(ai): add Google AI Studio image generation adapter`
  - Files: `api/src/ai/providers/google-ai/client.ts`, `api/src/ai/providers/google-ai/types.ts`
  - Pre-commit: `cd api && npx tsc --noEmit`

---

- [ ] 4. Cloudflare Workers AI adapter

  **What to do**:
  - Create `api/src/ai/providers/cloudflare-ai/types.ts` with config, defaults, neuron info
  - Create `api/src/ai/providers/cloudflare-ai/client.ts` implementing `ImageGenerationAdapter`
  - Uses Cloudflare Workers AI REST API
  - Auth: Cloudflare API token via `CLOUDFLARE_AI_API_TOKEN` env var, account ID via `CLOUDFLARE_ACCOUNT_ID`
  - Default model: `@cf/bytedance/stable-diffusion-xl-lightning` (fastest, ~450 neurons/image)
  - Alternative model: `@cf/stabilityai/stable-diffusion-xl-base-1.0` (~1500 neurons/image)
  - `txt2img`: POST to `https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/run/{model}` with `{ prompt, width?, height?, num_steps? }`. Response is raw image bytes. Store in local asset store.
  - `img2img`: Throw `ProviderError` — Workers AI text-to-image models don't support img2img
  - `uploadImage`: Store in local asset store
  - `downloadImage`: Retrieve from local asset store
  - `removeBackground`: Throw `ProviderError`
  - `layeredDecompose`: undefined
  - Log neuron estimate to console for budget awareness: `console.log("[CF-AI] Estimated ~${neurons} neurons used (${model})")`
  - Export `createCloudflareAIAdapter(config: CloudflareAIConfig): ImageGenerationAdapter`

  **Must NOT do**:
  - Do NOT use the Workers AI binding (`env.AI`) — this is for external REST API access, not from within a Worker
  - Do NOT implement neuron tracking/budgeting
  - Do NOT add model switching logic — use config/env for model choice

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Straightforward adapter implementation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `api/src/ai/providers/scenario/client.ts:566-628` — Adapter factory pattern
  - `api/src/ai/providers/contract.ts:146-174` — Interface to implement
  - `api/src/ai/providers/contract.ts:97-130` — Error handling
  - `api/src/ai/providers/local-asset-store.ts` — Local storage (Task 1)

  **API References**:
  - Cloudflare Workers AI: `POST https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/@cf/bytedance/stable-diffusion-xl-lightning`
  - Request: `{ prompt: string, num_steps?: number, width?: number, height?: number }`
  - Response: Raw PNG bytes (Content-Type: image/png)
  - Auth header: `Authorization: Bearer {CLOUDFLARE_AI_API_TOKEN}`

  **Acceptance Criteria**:
  - [ ] `cloudflare-ai/client.ts` exports `createCloudflareAIAdapter`
  - [ ] `cloudflare-ai/types.ts` exists with config and neuron cost constants
  - [ ] `txt2img` calls Cloudflare API and returns synthetic assetId
  - [ ] `img2img` throws `ProviderError`
  - [ ] `removeBackground` throws `ProviderError`
  - [ ] Console logs estimated neuron usage
  - [ ] `tsc --noEmit` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: TypeScript compiles with Cloudflare AI adapter
    Tool: Bash
    Preconditions: Task 1 completed
    Steps:
      1. Run: cd api && npx tsc --noEmit
      2. Assert: Exit code 0
    Expected Result: Clean compilation
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `feat(ai): add Cloudflare Workers AI image generation adapter`
  - Files: `api/src/ai/providers/cloudflare-ai/client.ts`, `api/src/ai/providers/cloudflare-ai/types.ts`
  - Pre-commit: `cd api && npx tsc --noEmit`

---

- [ ] 5. Wire new providers into adapter factories

  **What to do**:
  - Update `api/src/ai/pipeline/adapters/node.ts` to support new providers:
    - Add `createNodeTogetherAdapter`, `createNodeGoogleAIAdapter`, `createNodeCloudflareAIAdapter` factory functions
    - Update the provider selection logic (the `if (provider === 'scenario')` / `if (provider === 'modal')` branching) to include `'together'`, `'google-ai'`, `'cloudflare-ai'`
  - Update `api/src/ai/pipeline/adapters/workers.ts` similarly for Cloudflare Workers context
  - Update `api/src/ai/assets/service.ts`:
    - Extend the `ImageGenerationProvider` type to include `'together' | 'google-ai' | 'cloudflare-ai'`
    - Update `resolveProviderConfig` to handle new providers
    - Update `createImageGenerationAdapter` to instantiate new adapters
  - Update `api/src/trpc/context.ts` to include new env var types
  - Update `api/src/ai/agent/execution-engine.ts` env type

  **Must NOT do**:
  - Do NOT modify existing Scenario/ComfyUI adapter factory logic
  - Do NOT add provider fallback/rotation
  - Do NOT change the `IMAGE_GENERATION_PROVIDER` env var name
  - Do NOT change the default provider (keep `scenario`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Wiring existing components together, no new logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 6)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 2, 3, 4

  **References**:

  **Pattern References**:
  - `api/src/ai/pipeline/adapters/node.ts:477-490` — Existing provider selection branching to extend
  - `api/src/ai/pipeline/adapters/workers.ts:96-100` — Workers provider selection to extend
  - `api/src/ai/assets/service.ts:475-510` — `ImageGenerationProvider` type and `resolveProviderConfig`/`createImageGenerationAdapter` functions

  **Type References**:
  - `api/src/trpc/context.ts:30` — Env type with `IMAGE_GENERATION_PROVIDER`
  - `api/src/ai/agent/execution-engine.ts:29` — Agent env type

  **Files to modify**:
  - `api/src/ai/pipeline/adapters/node.ts`
  - `api/src/ai/pipeline/adapters/workers.ts`
  - `api/src/ai/assets/service.ts`
  - `api/src/trpc/context.ts`
  - `api/src/ai/agent/execution-engine.ts`

  **Acceptance Criteria**:
  - [ ] `IMAGE_GENERATION_PROVIDER=together` selects Together AI adapter
  - [ ] `IMAGE_GENERATION_PROVIDER=google-ai` selects Google AI adapter
  - [ ] `IMAGE_GENERATION_PROVIDER=cloudflare-ai` selects Cloudflare AI adapter
  - [ ] Default still selects `scenario`
  - [ ] `tsc --noEmit` passes
  - [ ] No changes to existing Scenario/ComfyUI adapter paths

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Type-check passes with all provider wiring
    Tool: Bash
    Preconditions: Tasks 1-4 completed
    Steps:
      1. Run: cd api && npx tsc --noEmit
      2. Assert: Exit code 0
    Expected Result: Clean compilation with all providers wired
    Evidence: Terminal output captured

  Scenario: Provider selection logic covers all variants
    Tool: Bash (grep)
    Steps:
      1. Grep node.ts for 'together', 'google-ai', 'cloudflare-ai'
      2. Assert: All three provider names appear in selection logic
      3. Grep assets/service.ts for same
      4. Assert: All three appear in ImageGenerationProvider type
    Expected Result: All providers wired in all adapter factories
    Evidence: Grep output captured
  ```

  **Commit**: YES
  - Message: `feat(ai): wire Together AI, Google AI, and Cloudflare AI into adapter factories`
  - Files: `api/src/ai/pipeline/adapters/node.ts`, `api/src/ai/pipeline/adapters/workers.ts`, `api/src/ai/assets/service.ts`, `api/src/trpc/context.ts`, `api/src/ai/agent/execution-engine.ts`
  - Pre-commit: `cd api && npx tsc --noEmit`

---

- [ ] 6. Vercel AI SDK experiment script

  **What to do**:
  - Install new packages: `pnpm --filter @slopcade/api add @ai-sdk/togetherai @ai-sdk/google`
  - Create `api/scripts/experiment-image.ts` — a standalone script for rapid txt2img experimentation using the Vercel AI SDK `generateImage()` function
  - CLI args via yargs (already a dev dependency):
    - `--provider=together|google|openai` (required)
    - `--prompt="..."` (required)
    - `--model=<model-id>` (optional, uses provider default)
    - `--size=1024x1024` (optional)
    - `--output=<path>` (optional, defaults to `api/debug-output/experiments/{timestamp}-{provider}.png`)
    - `--count=<n>` (optional, defaults to 1)
  - Each provider configured with its respective API key env var:
    - Together: `TOGETHER_API_KEY`
    - Google: `GOOGLE_AI_API_KEY`
    - OpenAI: `OPENAI_API_KEY` (already exists for text gen)
  - Default models per provider:
    - Together: `black-forest-labs/FLUX.1-schnell-Free`
    - Google: `imagen-3.0-generate-002`
    - OpenAI: `dall-e-3`
  - Output: Save PNG to disk, log provider/model/timing info
  - Add npm script: `"experiment:image": "tsx scripts/experiment-image.ts"`
  - This script does NOT use `ImageGenerationAdapter` — it's the "quick path" using Vercel AI SDK directly

  **Must NOT do**:
  - Do NOT add Cloudflare as an AI SDK provider here (no `@ai-sdk/cloudflare` package exists for the REST API; that's handled by the native adapter in Task 4)
  - Do NOT implement retry logic
  - Do NOT add provider rotation

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standalone script, follows existing script patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1 (needs extended types)

  **References**:

  **Pattern References**:
  - `api/scripts/generate-assets.ts` — Existing script pattern for CLI args, output handling
  - `api/src/ai/model-factory.ts` — Pattern for creating AI SDK provider instances

  **API References**:
  - Vercel AI SDK `generateImage()`:
    ```typescript
    import { generateImage } from 'ai';
    import { togetherai } from '@ai-sdk/togetherai';
    const { image } = await generateImage({
      model: togetherai.image('black-forest-labs/FLUX.1-schnell-Free'),
      prompt: 'a cute cat',
      size: '1024x1024',
    });
    // image.base64, image.uint8Array, image.mediaType
    ```

  **Acceptance Criteria**:
  - [ ] `api/scripts/experiment-image.ts` exists
  - [ ] `--provider`, `--prompt` args required
  - [ ] Output file saved to expected path
  - [ ] `experiment:image` script added to api/package.json
  - [ ] `tsc --noEmit` passes
  - [ ] `@ai-sdk/togetherai` and `@ai-sdk/google` in package.json dependencies

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Script parses args and generates help output
    Tool: Bash
    Preconditions: Packages installed
    Steps:
      1. Run: cd api && npx tsx scripts/experiment-image.ts --help
      2. Assert: Output contains "--provider", "--prompt", "--model", "--output"
      3. Assert: Exit code 0
    Expected Result: Help text shows all CLI options
    Evidence: Terminal output captured

  Scenario: Script fails gracefully without API key
    Tool: Bash
    Preconditions: No TOGETHER_API_KEY set
    Steps:
      1. Run: cd api && npx tsx scripts/experiment-image.ts --provider=together --prompt="test"
      2. Assert: Error message mentions missing API key or auth failure
      3. Assert: Non-zero exit code
    Expected Result: Clear error, not a crash
    Evidence: Terminal output captured

  Scenario: TypeScript compiles with new dependencies
    Tool: Bash
    Preconditions: Packages installed
    Steps:
      1. Run: cd api && npx tsc --noEmit
      2. Assert: Exit code 0
    Expected Result: Clean compilation
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `feat(ai): add Vercel AI SDK experiment script for rapid txt2img testing`
  - Files: `api/scripts/experiment-image.ts`, `api/package.json`
  - Pre-commit: `cd api && npx tsc --noEmit`

---

- [ ] 7. Unit tests and final verification

  **What to do**:
  - Create `api/src/ai/__tests__/together-client.test.ts` — unit tests for Together AI adapter:
    - Mock `fetch` to simulate API responses
    - Test `txt2img` returns valid synthetic assetId and stores image
    - Test `img2img` throws `ProviderError`
    - Test `removeBackground` throws `ProviderError`
    - Test `uploadImage`/`downloadImage` roundtrip
    - Test HTTP 429 is classified as `RATE_LIMITED`
  - Create `api/src/ai/__tests__/google-ai-client.test.ts` — unit tests for Google AI adapter:
    - Same coverage as Together tests
    - Test Imagen API response format handling
  - Create `api/src/ai/__tests__/cloudflare-ai-client.test.ts` — unit tests for Cloudflare AI adapter:
    - Same coverage as Together tests
    - Test raw binary response handling
    - Test neuron logging
  - Create `api/src/ai/__tests__/local-asset-store.test.ts` — unit tests for shared asset store
  - Run full test suite: `cd api && npx vitest run`
  - Run type check: `cd api && npx tsc --noEmit`
  - Verify existing tests still pass (no regressions)

  **Must NOT do**:
  - Do NOT make real API calls in tests — mock all fetch calls
  - Do NOT modify existing test files
  - Do NOT skip existing tests

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Multiple test files following existing patterns
  - **Skills**: [`testing-patterns`]
    - `testing-patterns`: Vitest patterns, mock strategies specific to this project

  **Parallelization**:
  - **Can Run In Parallel**: NO (final verification task)
  - **Parallel Group**: Wave 4 (sequential, final)
  - **Blocks**: None (completion)
  - **Blocked By**: Tasks 5, 6

  **References**:

  **Pattern References**:
  - `api/src/ai/__tests__/scenario-client.test.ts` — Existing provider test pattern (mock fetch, test adapter methods). Follow this EXACT structure.
  - `api/src/ai/__tests__/scenario-integration.test.ts` — Integration test pattern for reference
  - `api/src/ai/__tests__/asset-service.test.ts` — Service-level test pattern

  **Test References**:
  - `api/vitest.config.ts` or `api/package.json` test script — Vitest configuration

  **Acceptance Criteria**:
  - [ ] `together-client.test.ts` exists with ≥5 test cases
  - [ ] `google-ai-client.test.ts` exists with ≥5 test cases
  - [ ] `cloudflare-ai-client.test.ts` exists with ≥5 test cases
  - [ ] `local-asset-store.test.ts` exists with ≥3 test cases
  - [ ] `cd api && npx vitest run` → ALL tests pass (including existing)
  - [ ] `cd api && npx tsc --noEmit` → exit code 0
  - [ ] No modifications to existing test files

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: All new tests pass
    Tool: Bash (vitest)
    Preconditions: All tasks 1-6 completed
    Steps:
      1. Run: cd api && npx vitest run src/ai/__tests__/together-client.test.ts
      2. Assert: All tests pass
      3. Run: cd api && npx vitest run src/ai/__tests__/google-ai-client.test.ts
      4. Assert: All tests pass
      5. Run: cd api && npx vitest run src/ai/__tests__/cloudflare-ai-client.test.ts
      6. Assert: All tests pass
      7. Run: cd api && npx vitest run src/ai/__tests__/local-asset-store.test.ts
      8. Assert: All tests pass
    Expected Result: All new test files pass
    Evidence: Test output captured for each

  Scenario: No regression in existing tests
    Tool: Bash (vitest)
    Steps:
      1. Run: cd api && npx vitest run
      2. Assert: Exit code 0
      3. Assert: No test failures
    Expected Result: Full test suite green
    Evidence: Full vitest output captured

  Scenario: TypeScript still compiles cleanly
    Tool: Bash
    Steps:
      1. Run: cd api && npx tsc --noEmit
      2. Assert: Exit code 0
    Expected Result: No type errors
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `test(ai): add unit tests for Together AI, Google AI, and Cloudflare AI adapters`
  - Files: `api/src/ai/__tests__/together-client.test.ts`, `api/src/ai/__tests__/google-ai-client.test.ts`, `api/src/ai/__tests__/cloudflare-ai-client.test.ts`, `api/src/ai/__tests__/local-asset-store.test.ts`
  - Pre-commit: `cd api && npx vitest run`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(ai): extend ImageProvider type and add local asset store utility` | contract.ts, local-asset-store.ts | tsc --noEmit |
| 2 | `feat(ai): add Together AI image generation adapter` | together/client.ts, together/types.ts | tsc --noEmit |
| 3 | `feat(ai): add Google AI Studio image generation adapter` | google-ai/client.ts, google-ai/types.ts | tsc --noEmit |
| 4 | `feat(ai): add Cloudflare Workers AI image generation adapter` | cloudflare-ai/client.ts, cloudflare-ai/types.ts | tsc --noEmit |
| 5 | `feat(ai): wire new providers into adapter factories` | node.ts, workers.ts, service.ts, context.ts, execution-engine.ts | tsc --noEmit |
| 6 | `feat(ai): add Vercel AI SDK experiment script` | experiment-image.ts, package.json | tsc --noEmit |
| 7 | `test(ai): add unit tests for free-tier image generation adapters` | 4 test files | vitest run |

---

## Success Criteria

### Verification Commands
```bash
# Type check
cd api && npx tsc --noEmit              # Expected: exit 0

# All tests pass
cd api && npx vitest run                 # Expected: all tests green

# Experiment script has help
cd api && npx tsx scripts/experiment-image.ts --help  # Expected: shows options

# Provider selection works (type-level — just verify compilation)
cd api && npx tsc --noEmit               # Expected: exit 0
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Existing `generate:assets` pipeline unchanged
- [ ] New adapters throw clear errors for unsupported operations
- [ ] Experiment script has clean CLI interface
