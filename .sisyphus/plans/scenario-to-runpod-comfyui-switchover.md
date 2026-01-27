# Scenario.com -> RunPod Serverless ComfyUI Switchover

## Context

### Original Request
Migrate Slopcade image generation from Scenario.com to our own RunPod serverless + ComfyUI configuration. Switch APIs one by one, starting with Flux.1-dev `txt2img` and `img2img`. Validate the new endpoints by generating real images. Once stable, remove Scenario.com entirely.

### Interview Summary
- First milestone deployment target: RunPod serverless ComfyUI (custom worker) (user confirmed).
- Migration approach: incremental swap by capability, keep rollback path until confidence.

### Current Implementation (Evidence)
- Scenario core client: `api/src/ai/scenario.ts`
- Scenario pipeline adapter (explicit endpoints + polling): `api/src/ai/pipeline/adapters/node.ts`
- Pipeline stages depend on a provider adapter but store intermediate IDs in `artifacts.scenarioAssetId`: `api/src/ai/pipeline/stages/index.ts`
- Asset generation service is Scenario-first and is used by TRPC routes: `api/src/ai/assets.ts`, `api/src/trpc/routes/assets.ts`, `api/src/trpc/routes/asset-system.ts`
- UI component generation stages use the same provider adapter (`adapters.scenario.*`) and upload/download flow: `api/src/ai/pipeline/stages/ui-component.ts`

### Existing RunPod/ComfyUI Work (Evidence)
- ComfyUI client (direct + RunPod serverless): `api/src/ai/comfyui.ts`
- RunPod client (direct endpoints): `api/src/ai/runpod.ts`
- ComfyUI workflows + builder: `api/src/ai/workflows/index.ts`, `api/src/ai/workflows/*.json`, `api/src/ai/workflows/txt2img-runpod.json`
- RunPod serverless worker image: `api/runpod-worker/Dockerfile`, docs `api/runpod-worker/README.md`
- Deployment checklist already written: `docs/plans/runpod-comfyui-setup-status.md`

### Metis Review (Key Guardrails Applied)
- Lock a provider-agnostic “generation result” contract (image buffer + metadata) to prevent silent drift.
- Define timeouts/cold-start behavior explicitly; ship stable error codes.
- Do NOT expand scope into layered decomposition/remove-bg in milestone 1.
- Do NOT delete Scenario/DB fields immediately; keep read-compat, stop writes.

---

## Work Objectives

### Core Objective
Make RunPod serverless ComfyUI the primary image generation provider for Flux.1-dev `txt2img` and `img2img`, validated end-to-end through the existing asset pipelines and scripts, with clean rollback and an explicit path to fully remove Scenario.

### Concrete Deliverables
- RunPod serverless ComfyUI endpoint (custom worker) that can run Flux Dev workflows.
- Provider selection supported in runtime (TRPC + AssetService + pipelines), not just CLI.
- Flux `txt2img` + `img2img` switched to ComfyUI provider behind `IMAGE_GENERATION_PROVIDER`.
- Validation harness: scripts + tests + manual QA steps with stored evidence images.
- Staged rollout plan + rollback toggle.

### Definition of Done
- `IMAGE_GENERATION_PROVIDER=comfyui` produces assets successfully via:
  - `pnpm --filter @slopcade/api test:run`
  - `pnpm --filter @slopcade/api type-check`
  - `pnpm hush run -- npx tsx api/scripts/test-comfyui-api.ts "A pixel art knight" txt2img` (writes PNG)
  - `pnpm hush run -- npx tsx api/scripts/generate-game-assets.ts <gameId> --type=entity` (uploads to R2)
- Scenario credentials are no longer required to generate assets when provider is `comfyui`.

### Must NOT Have (Guardrails)
- No parallax layered decomposition implementation in this milestone.
- No background removal parity work in this milestone.
- No deletion of Scenario code paths until production runs succeed and rollback is proven.

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (`api/package.json` uses Vitest).
- **User wants tests**: Tests-after + strong manual verification (this is infrastructure + external APIs).
- **Framework**: `pnpm --filter @slopcade/api test:run`, `pnpm --filter @slopcade/api type-check`.

### Manual QA Evidence
- Save generated outputs from local scripts under `api/debug-output/` (already used by test scripts).
- Capture at least:
  - 1 txt2img output PNG
  - 1 img2img output PNG (using either base64 image or prior generated assetId)
  - 1 pipeline run output set (entity + background)

---

## Task Flow

Infrastructure (RunPod worker + endpoint) -> Runtime config (Env + secrets) -> Provider adapter wiring -> Swap Flux txt2img/img2img -> End-to-end validation -> Rollout + rollback -> Scenario deprecation

---

## TODOs

> Notes:
> - “ScenarioAdapter” naming in pipeline is legacy; tasks below include making it provider-agnostic.
> - Keep Scenario as fallback until the final deprecation step.

- [x] 1. Inventory and lock the provider-agnostic contract for image generation results

  **What to do**:
  - Define a single internal contract used by TRPC + pipeline stages: (a) input spec, (b) provider selection, (c) output (image buffer(s) + metadata).
  - Decide where to store “provider asset id / job id”: in `artifacts` and/or DB.
  - Add stable error codes for UI/CLI.

  **Must NOT do**:
  - Don’t rename DB schema yet.
  - Don’t change prompt semantics beyond what’s needed for Flux.

  **Parallelizable**: YES (with 2, 3)

  **References**:
  - `api/src/ai/pipeline/types.ts` - existing adapter contract + `Artifacts` shape.
  - `api/src/ai/pipeline/stages/index.ts` - uses `artifacts.scenarioAssetId` as the intermediate ID.
  - `api/src/trpc/routes/asset-system.ts` - job/task model and error messaging expectations.

  **Acceptance Criteria**:
  - Contract is documented inside code (types/interfaces) and used consistently by updated modules.

- [x] 2. Deploy/validate RunPod serverless custom ComfyUI worker (Flux Dev)

  **What to do**:
  - Ensure Docker image build pipeline works and image is available: `api/runpod-worker/Dockerfile`, `.github/workflows/build-runpod-worker.yml`.
  - Create/verify a RunPod serverless endpoint using the custom image.
  - Confirm the endpoint can load Flux models referenced by workflows.
  - Ensure build secrets exist (Docker Hub): see `docs/plans/runpod-comfyui-setup-status.md`.
  - Recommended endpoint settings (from existing docs): GPU L40/A10 (24GB+), container disk 30GB, min workers 0, idle timeout 30s.

  **Must NOT do**:
  - Don’t switch production provider yet.

  **Parallelizable**: YES (with 1, 3)

  **References**:
  - `api/runpod-worker/Dockerfile` - models + nodes installed.
  - `api/runpod-worker/README.md` - endpoint settings and troubleshooting.
  - `docs/plans/runpod-comfyui-setup-status.md` - checklist (treat as canonical).

  **Acceptance Criteria**:
  - RunPod endpoint exists and returns successful responses for txt2img.
  - No “model not found” errors for `flux1-dev-fp8.safetensors`, `ae.safetensors`, `clip_l.safetensors`, `t5xxl_fp8_e4m3fn.safetensors`.

- [x] 3. Wire secrets/config for provider selection across local + Workers runtime

  **What to do**:
  - Add env vars to API runtime bindings and types:
    - `IMAGE_GENERATION_PROVIDER`
    - `RUNPOD_API_KEY`
    - `RUNPOD_COMFYUI_ENDPOINT_ID` (or `RUNPOD_ENDPOINT_ID` if consolidating)
    - `COMFYUI_ENDPOINT` (optional for direct Comfy)
  - Ensure local dev uses hush (`.hush.template` already documents these).
  - Ensure Wrangler/CF env is configured for deploy (vars/secrets) so TRPC routes can read them via `ctx.env`:
    - Use `wrangler secret put RUNPOD_API_KEY` (production)
    - Add `IMAGE_GENERATION_PROVIDER` and `RUNPOD_COMFYUI_ENDPOINT_ID` as vars (or secrets)

  **Must NOT do**:
  - Don’t commit secrets.

  **Parallelizable**: YES (with 1, 2)

  **References**:
  - `api/src/trpc/context.ts` - Env type currently includes Scenario only.
  - `api/wrangler.toml` - worker config; uses `nodejs_compat`.
  - `.hush.template` - provider env var template.

  **Acceptance Criteria**:
  - `pnpm --filter @slopcade/api type-check` passes after Env changes.
  - Local hush env supports setting the new vars without changing code.

- [x] 4. Make pipeline provider naming/provider adapter truly provider-agnostic

  **What to do**:
  - Rename `ScenarioAdapter` conceptually (or alias it) so `adapters.scenario.*` is not Scenario-specific.
  - Rename artifact `scenarioAssetId` to something provider-agnostic (e.g., `providerAssetId`) across pipeline stages and UI component stages.
  - Rename `uploadToScenarioStage` to provider-neutral naming.

  **Must NOT do**:
  - Don’t change stage behavior or prompt content other than renames.

  **Parallelizable**: NO (depends on 1)

  **References**:
  - `api/src/ai/pipeline/types.ts` - adapter type definitions.
  - `api/src/ai/pipeline/stages/index.ts` - uses `scenarioAssetId` heavily.
  - `api/src/ai/pipeline/stages/ui-component.ts` - uses `adapters.scenario.*`.

  **Acceptance Criteria**:
  - `pnpm --filter @slopcade/api test:run` passes.
  - No remaining references to `scenarioAssetId` in pipeline runtime paths (tests may still reference legacy DB fields separately).

- [x] 5. Implement a Workers-safe provider adapter factory for `scenario | comfyui | runpod`

  **What to do**:
  - Create a provider factory that reads `ctx.env` and returns an adapter implementing the pipeline’s provider interface.
  - Ensure the ComfyUI adapter targets RunPod serverless using endpoint format `https://api.runpod.ai/v2/<endpointId>`.
  - Ensure the Scenario adapter remains available for rollback.
  - Prefer reusing `api/src/ai/comfyui.ts` for ComfyUI serverless execution (works under `nodejs_compat` per `api/wrangler.toml`).

  **Must NOT do**:
  - Don’t import Node-only R2 adapter (`child_process` upload) for Workers runtime.

  **Parallelizable**: NO (depends on 3, 4)

  **References**:
  - `api/src/ai/comfyui.ts` - ComfyUI client used by node adapter.
  - `api/src/ai/runpod.ts` - RunPod client.
  - `api/src/ai/pipeline/adapters/workers.ts` - current workers adapters are Scenario-only.
  - `api/src/ai/pipeline/adapters/node.ts` - provider selection exists for CLI and can be mirrored.

  **Acceptance Criteria**:
  - With `IMAGE_GENERATION_PROVIDER=comfyui`, the server can generate images without Scenario keys.
  - With `IMAGE_GENERATION_PROVIDER=scenario`, behavior remains unchanged.

- [x] 6. Switch Flux txt2img + img2img call sites to use provider selection (TRPC + AssetService)

  **What to do**:
  - Update `api/src/ai/assets.ts` to use the provider adapter/client based on env, instead of hard-checking Scenario keys.
  - Update TRPC routes that currently hard-require Scenario keys to become provider-agnostic:
    - `api/src/trpc/routes/assets.ts`
    - `api/src/trpc/routes/ui-components.ts` (`generateUITheme` currently reads Scenario keys directly)
    - `api/src/trpc/routes/asset-system.ts` (AssetService usage + UI pipeline adapters)

  **Must NOT do**:
  - Don’t redesign job/task DB schema in this milestone.

  **Parallelizable**: NO (depends on 5)

  **References**:
  - `api/src/ai/assets.ts` - Scenario-first logic.
  - `api/src/trpc/routes/assets.ts` - `getScenarioConfigFromEnv` gating.
  - `api/src/trpc/routes/ui-components.ts` - Scenario credential reads.
  - `api/src/trpc/routes/asset-system.ts` - central generation orchestration.

  **Acceptance Criteria**:
  - With `IMAGE_GENERATION_PROVIDER=comfyui`, calling existing TRPC generation flows succeeds.
  - Error messages are provider-specific (e.g., missing RunPod env yields actionable message).

- [x] 7. Validate ComfyUI endpoint with existing scripts (txt2img/img2img)

  **What to do**:
  - Run the existing test scripts using hush-provided RunPod vars.
  - Save outputs under `api/debug-output/`.

  **Parallelizable**: YES (after 2 + 3 are complete; independent from 6)

  **References**:
  - `api/scripts/test-comfyui-api.ts` - ComfyUI client harness.
  - `api/scripts/test-runpod-premade.ts` - raw RunPod workflow harness (useful for debugging serverless payload issues).

  **Acceptance Criteria**:
  - `pnpm hush run -- npx tsx api/scripts/test-comfyui-api.ts "A pixel art knight" txt2img` writes a PNG and exits 0.
  - `pnpm hush run -- npx tsx api/scripts/test-comfyui-api.ts "Refine" img2img <path>` writes a PNG and exits 0.

- [x] 8. Run an end-to-end asset pipeline generation with provider = comfyui

  **What to do**:
  - Use existing CLI pipeline (already supports provider selection) to generate representative assets.
  - Confirm R2 upload output URLs resolve via `/assets/*` route.

  **Parallelizable**: YES (after 7)

  **References**:
  - `api/scripts/generate-game-assets.ts` - provider selection + pipeline execution.
  - `api/src/index.ts` - serves R2 via `/assets/*`.

  **Acceptance Criteria**:
  - `IMAGE_GENERATION_PROVIDER=comfyui pnpm hush run -- npx tsx api/scripts/generate-game-assets.ts <gameId> --type=entity` succeeds.
  - Output URLs load in browser via `http://localhost:8789/assets/<r2Key>` when API is running.

- [x] 9. Add regression tests/fixtures for provider contract stability

  **What to do**:
  - Add/extend unit tests to validate request payload shaping and error mapping for ComfyUI client + adapter.
  - Keep tests hermetic by mocking fetch (like existing client tests).

  **Parallelizable**: YES (with 8)

  **References**:
  - `api/src/ai/__tests__/comfyui-client.test.ts` - existing mocking patterns.
  - `api/src/ai/__tests__/runpod-client.test.ts` - existing mocking patterns.

  **Acceptance Criteria**:
  - `pnpm --filter @slopcade/api test:run` passes.
  - Tests cover: request shape, runsync/status polling, failure mapping.

- [x] 10. Rollout plan: enable provider flag + rollback readiness

  **What to do**:
  - Ensure there is a single runtime switch (env var) for provider selection.
  - Add operational notes: cold start behavior, expected p95 latency, and known failure modes.
  - Confirm rollback is instant: set provider back to `scenario`.

  **Parallelizable**: YES (after 6)

  **References**:
  - `.hush.template` - provider selection documentation.
  - `docs/plans/runpod-comfyui-setup-status.md` - rollout checklist.
  - `docs/plans/runpod-comfyui-rollout-plan.md` - detailed rollout plan (NEW).

  **Acceptance Criteria**:
  - Switching `IMAGE_GENERATION_PROVIDER` toggles provider without code changes.

- [x] 12. Scenario deprecation phase (after successful comfyui runs)

  **What to do**:
  - Remove Scenario credential requirement from any user-facing flow.
  - Keep Scenario code path available for a fixed “grace period” (timebox) or until metrics look good.
  - Then remove Scenario calls, scripts, and docs as appropriate.

  **Must NOT do**:
  - Don’t drop legacy DB columns without an explicit DB migration plan.

  **Parallelizable**: NO (depends on 10)

  **References**:
  - `api/src/ai/scenario.ts` - Scenario client.
  - `api/src/ai/pipeline/adapters/node.ts` - Scenario direct adapter.
  - `api/src/ai/assets.ts` - current Scenario usage.

  **Acceptance Criteria**:
  - With Scenario env vars unset, provider `comfyui` still works.
  - Scenario code is either removed or fully isolated behind an explicit legacy flag.

---

## Defaults Applied (override if desired)
- TRPC/job semantics: keep existing async job/task approach; do not block requests synchronously.
- Determinism: best-effort using seeds, no cross-provider perfect determinism guarantee.
- Parallax layered decomposition: explicitly deferred.

---

## Decisions Needed (optional)
- Do you want strict seed reproducibility requirements (same seed -> “close enough” vs “bitwise”)? Default is “close enough”.

---

## Commit Strategy
- Prefer small, atomic commits per milestone:
  - `feat(ai): add RunPod/ComfyUI env wiring`
  - `refactor(ai): make pipeline provider-agnostic`
  - `feat(ai): add workers comfyui adapter`
  - `feat(ai): switch txt2img/img2img to comfyui provider`
  - `test(ai): add contract regression tests`
