# Flux Style LoRA pipeline (Node dataset builder → Flux LoRA training → Modal serving)

## TL;DR

Build an end-to-end, **compliant** proof-of-concept pipeline that:
1) generates a prompt set, 2) bulk-generates images via an image-gen API (batched with `p-limit`), 3) auto-captions via a vision LLM API, 4) packages a versioned dataset with manifest + splits + QA reports, 5) trains a **FLUX.1-dev style LoRA** (Diffusers + Accelerate) producing `.safetensors`, and 6) serves the LoRA via the repo’s **existing Modal serverless** setup.

**Deliverables**
- Node CLI script(s) to: prompt-gen → image-gen → download → caption → dataset packaging (+ manifest/report)
- Training job entry (Modal function) to run Diffusers Flux LoRA training and persist artifacts to a Modal Volume
- Serving integration (Modal endpoint) that loads base Flux + LoRA weights and generates images
- Evaluation harness: fixed prompt suite + output grid(s) + “smoke” checks (load weights, latency, holdout)

**Estimated Effort**: Medium
**Parallel Execution**: YES (waves)
**Critical Path**: Dataset builder → Dataset QA → Smoke train → Load LoRA in serving runtime → Full train → Deploy endpoint

---

## Context

### Original Request (condensed)
- “Write a node script that would write the prompts, loop through … p-limit … get all the images … call some other API to have some other AI label them … then package that and get it onto modal and do the rest.”

### Confirmed decisions from interview
- Rights/provenance: **User confirmed they have rights/permission** to use generated images as training data.
- Target: **Style LoRA**.
- Base model: **FLUX.1-dev**.
- Captioning: **Vision LLM API**.
- Serving: integrate into “what we already have serverless modal”.

### Repo context (discovered)
- Existing Modal infra and image-gen architecture exists:
  - `api/modal/comfyui.py` (Modal app)
  - `docs/IMAGE_GENERATION_ARCHITECTURE.md`
  - `docs/MODAL_MIGRATION_GUIDE.md`
  - provider wiring: `api/src/ai/assets.ts`, `api/src/ai/pipeline/adapters/node.ts`, `IMAGE_GENERATION_PROVIDER=modal|scenario` and `MODAL_ENDPOINT`

### External references used
- Modal primitives: volumes (`commit`/`reload`), web endpoints (`fastapi_endpoint` / `asgi_app`), GPUs, cold start + memory snapshots:
  - https://modal.com/docs/examples/diffusers_lora_finetune
  - https://modal.com/docs/guide/volumes
  - https://modal.com/docs/guide/webhooks
  - https://modal.com/docs/guide/gpu
  - https://modal.com/docs/guide/memory-snapshot
  - https://modal.com/docs/guide/cold-start
- Diffusers Flux LoRA scripts:
  - `examples/dreambooth/train_dreambooth_lora_flux.py`
  - `examples/research_projects/flux_lora_quantization/train_dreambooth_lora_flux_nano.py`

---

## Work Objectives

### Core Objective
Ship a **reproducible** pipeline that can produce a Flux style LoRA and serve it on Modal, with explicit provenance and verification steps.

### Definition of Done
- [ ] “Dataset build” run completes: prompts → images → captions → packaged dataset + manifest + QA report.
- [ ] “Smoke train” run completes and outputs LoRA artifacts: `pytorch_lora_weights.safetensors` + `adapter_config.json`.
- [ ] Serving runtime can load base Flux + LoRA and generate images for a fixed eval prompt suite.
- [ ] Endpoint is deployed on Modal and returns images successfully.

### Must NOT Have (guardrails)
- No ToS circumvention guidance; pipeline assumes legitimate usage with rights/provenance.
- No expansion to character/subject identity LoRA.
- No multi-provider orchestration beyond what is necessary for the PoC.
- No production-hardening extras (auth/rate limiting/observability) unless explicitly requested.

---

## Verification Strategy

### Test Decision
- **Automated tests**: Optional for PoC; prioritize **executable smoke checks** + reproducibility artifacts.
- **Primary verification**: scripted runs + reports + sample outputs.

### Evidence requirements (for each major stage)
- Generation stage: saved request params (model/version, seed, steps, guidance) + raw API responses/errors.
- Caption stage: caption model/version + prompt template + banned-token filter results.
- Dataset stage: manifest (hashes), dedupe report, split report.
- Training stage: config file, logs, artifacts and a “load check” in serving runtime.
- Serving stage: latency to first image, successful generation for N prompts.

---

## Execution Strategy

### Wave 1 (can start immediately)
1) Lock serving target + artifact contract
2) Build prompt+image+caption dataset builder CLI (Node)

### Wave 2
3) Dataset QA: dedupe, splits, report, holdout set creation
4) Modal training job skeleton + smoke train

### Wave 3
5) Integrate LoRA loading into existing Modal serverless path
6) Full training run + deploy + evaluation harness

---

## TODOs

> Note: Tasks include explicit references so an executor can implement without additional context.

### 1) Decide serving runtime (ComfyUI vs Diffusers) + define API contract

**What to do**
- Decide whether serving is:
  - **A. ComfyUI workflow** that loads LoRA weights (reusing `api/modal/comfyui.py` endpoints), OR
  - **B. Direct Diffusers FluxPipeline endpoint** that loads LoRA via `load_lora_weights()`, OR
  - **C. Both** (only if needed).
- Define request/response contract:
  - Input: `{ prompt, negativePrompt?, seed?, steps?, guidance?, width?, height? }`
  - Output: image bytes/base64 + metadata (model id, lora version, seed).
- Define artifact contract:
  - Versioned directory layout on Modal Volume (e.g., `/models/flux-lora/{lora_id}/{version}/...`).

**References**
- `api/modal/comfyui.py` — existing Modal app & endpoints (reuse patterns).
- `docs/IMAGE_GENERATION_ARCHITECTURE.md` — how providers/endpoints are wired today.
- Modal docs: https://modal.com/docs/examples/diffusers_lora_finetune (Flux LoRA patterns)

**Acceptance Criteria**
- [ ] Written spec in plan notes (or `docs/`) describing endpoint contract + artifact paths.
- [ ] Selected serving target documented with rationale.

**Recommended Agent Profile**
- Category: `unspecified-high`
- Skills: (none required)

---

### 2) Dataset schema + provenance manifest design (immutable, versioned)

**What to do**
- Define a manifest format (JSONL recommended) with at minimum:
  - `run_id`, `prompt_id`, `prompt`, `negative_prompt`, `seed`, `gen_params`, `gen_model_id`, `gen_model_version`
  - `image_path`, `image_sha256`, `width`, `height`, `format`
  - `caption`, `caption_model_id`, `caption_model_version`, `caption_prompt_template`
  - `split` (train/val/holdout)
- Define hashing policy:
  - Stable IDs from content hashes (prompt hash, image sha, caption hash).
- Define storage layout:
  - `runs/{run_id}/raw/` (downloads)
  - `runs/{run_id}/captions/`
  - `datasets/{dataset_id}/images/` + `metadata.jsonl` + `reports/`

**References**
- Oracle guardrails: hashing/manifests/splits/dedupe/memorization checks (captured in session notes).

**Acceptance Criteria**
- [ ] Manifest schema written down and used by scripts.
- [ ] Every image record includes provenance fields (no nulls).

**Recommended Agent Profile**
- Category: `quick`
- Skills: (none)

---

### 3) Node CLI: prompt generation (templates + coverage) and run config

**What to do**
- Implement a prompt generator that:
  - uses a taxonomy (subjects/moods/lighting/composition) for **coverage**
  - supports seeding for reproducibility
  - writes `prompts.jsonl` with per-prompt metadata
- Define a `run-config.json` capturing:
  - API endpoint/model identifier to call
  - concurrency (p-limit), retries, timeouts
  - image size, steps, guidance, seeds strategy

**References**
- Existing repo scripts calling Modal endpoints:
  - `test-modal-direct.js`, `test-modal-simple.js`, `test-modal-retry.js`
  - `api/src/ai/pipeline/adapters/node.ts` — how provider selection + endpoint env vars work

**Acceptance Criteria**
- [ ] `node dataset-cli.ts prompts --out runs/{run_id}/prompts.jsonl` creates N prompts.
- [ ] Deterministic: rerun with same seed yields identical prompt list + IDs.

**Recommended Agent Profile**
- Category: `quick`
- Skills: (none)

---

### 4) Node CLI: batched image generation (p-limit), download, and retry policy

**What to do**
- Implement generator that:
  - reads `prompts.jsonl`
  - calls image-gen API in batches with `p-limit` (5–10 concurrent)
  - retries with exponential backoff on 429/5xx
  - saves images to `runs/{run_id}/raw/{prompt_id}.{ext}`
  - records raw response metadata to `runs/{run_id}/gen_results.jsonl`
- Add “partial failure policy”:
  - proceed if >=X% succeeded; emit failures report.

**References**
- Repo has provider env patterns:
  - `api/src/ai/assets.ts` and `api/src/ai/pipeline/adapters/node.ts`
  - `docs/IMAGE_GENERATION_ARCHITECTURE.md` (how to hit Modal endpoints)

**Acceptance Criteria**
- [ ] `node dataset-cli.ts generate --run runs/{run_id}` downloads K images.
- [ ] Failures produce `runs/{run_id}/reports/failures.jsonl` with status codes + retry counts.
- [ ] All saved images have SHA256 recorded in manifest.

**Recommended Agent Profile**
- Category: `unspecified-high`
- Skills: (none)

---

### 5) Auto-captioning step (Vision LLM API) + template enforcement + banned-token filter

**What to do**
- Implement captioner that:
  - takes images and produces concise natural-language captions suitable for Flux training
  - enforces a max length (e.g., 10–30 words)
  - optionally appends WD14-style tags if you want a hybrid caption
  - blocks/removes banned tokens (brands, artist names, disallowed content)
  - writes `runs/{run_id}/captions/{prompt_id}.txt`
  - logs caption model/version/prompt template used
- Add QA sampling:
  - sample 10–20% and save a review sheet (`qa_samples.html` or `qa_samples.json`).

**References**
- Captioning research: vision LLM API best practices + QA sampling.

**Acceptance Criteria**
- [ ] `node dataset-cli.ts caption --run runs/{run_id}` writes captions for >=X% images.
- [ ] Captions pass validation (non-empty, within length, no banned tokens).

**Recommended Agent Profile**
- Category: `unspecified-high`
- Skills: (none)

---

### 6) Dataset packaging: dedupe, split (train/val/holdout), and reports

**What to do**
- Implement packaging that:
  - normalizes formats (PNG recommended) and sizes/aspect ratios
  - dedupes via perceptual hash or embedding similarity
  - assigns splits based on stable hash of `image_sha256` (prevents reshuffle)
  - produces `datasets/{dataset_id}/metadata.jsonl` and copies images
  - writes reports:
    - `dedupe_report.json`
    - `split_report.json`
    - `caption_stats.json` (length histograms, keyword freq)

**References**
- Oracle guardrails: leakage prevention + stable split assignment.

**Acceptance Criteria**
- [ ] Packaged dataset folder exists with `images/` + `metadata.jsonl`.
- [ ] Report shows 0 cross-split near-duplicates above threshold.

**Recommended Agent Profile**
- Category: `unspecified-high`
- Skills: (none)

---

### 7) Modal training job: smoke train (fast) + artifact persistence

**What to do**
- Create a Modal training function that:
  - mounts a Volume for outputs
  - pulls the dataset (either upload to Volume or fetch from object storage)
  - runs a **short smoke train** (e.g., 50–200 steps) using Diffusers Flux LoRA script
  - persists outputs (`pytorch_lora_weights.safetensors`, `adapter_config.json`) to versioned path
  - commits the volume

**References**
- Modal example: https://modal.com/docs/examples/diffusers_lora_finetune
- Repo Modal app patterns: `api/modal/comfyui.py` (volume usage, endpoints)
- Diffusers scripts noted in research

**Acceptance Criteria**
- [ ] Smoke train produces LoRA artifacts in volume path.
- [ ] A separate “load check” can load those artifacts in the serving runtime.

**Recommended Agent Profile**
- Category: `unspecified-high`
- Skills: (none)

---

### 8) Modal serving integration: load base Flux + LoRA weights, generate endpoint

**What to do**
- Implement serving endpoint in existing Modal serverless setup:
  - model load in `@modal.enter()` (or memory snapshot split CPU/GPU)
  - `volume.reload()` semantics correct
  - loads LoRA weights from chosen artifact path
  - returns images + metadata
- Add cold-start mitigation (optional):
  - memory snapshots
  - cache torch.compile artifacts if using compile

**References**
- Modal guides: web endpoints, memory snapshots, cold start
- Repo endpoints and env wiring:
  - `api/modal/comfyui.py`
  - `docs/MODAL_MIGRATION_GUIDE.md`
  - `docs/IMAGE_GENERATION_TECHNOLOGY.md`

**Acceptance Criteria**
- [ ] Endpoint responds 200 and returns an image for 3 fixed prompts.
- [ ] First-image latency measured and recorded once.

**Recommended Agent Profile**
- Category: `unspecified-high`
- Skills: (none)

---

### 9) Full training run (timeboxed) + eval suite

**What to do**
- Run full training with timebox/budget:
  - style LoRA typical: 500–1500 steps to start (adjust based on dataset size)
  - rank: 4–16 (start 4/8 for style)
- Create an evaluation prompt suite (12–30 prompts) and generate grids across seeds.
- Add memorization checks:
  - compare generated samples vs training images via embeddings; flag high similarity.

**Acceptance Criteria**
- [ ] Final LoRA artifacts produced and stored with config + dataset hash.
- [ ] Eval images saved with metadata; holdout prompts show no obvious memorization.

**Recommended Agent Profile**
- Category: `unspecified-high`
- Skills: (none)

---

## Commit Strategy (recommended)
- `feat(dataset): add prompt/gen/caption pipeline CLI`
- `feat(training): add modal flux lora smoke-train job`
- `feat(serving): load flux lora weights in modal endpoint`
- `chore(eval): add fixed prompt suite + report generation`

---

## Open Decisions (must be resolved during execution)
1. Serve via **ComfyUI** or **Diffusers** (or both)?
2. Dataset size (N) and resolution target.
3. Retry policy thresholds (max retries, minimum success percent).
4. Caption template schema (strict vs flexible) + banned-token list.
5. Training budget/timebox and initial hyperparams (rank/steps/resolution).
