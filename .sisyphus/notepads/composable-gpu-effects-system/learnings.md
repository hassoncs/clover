# Learnings

## Task 1: Pipeline Types + Validator (2026-02-07)

- `shared/src/types/index.ts` is the barrel — exports are `export * from './module'` style
- Existing `effects.ts` has `EffectType` union (30 types), `EffectBase` interface, `EffectSpec` discriminated union, `EffectChain = EffectSpec[]`
- Validation pattern from `gameDefinitionValidator.ts`: returns `{ valid, errors, warnings }` with `code`/`message`/`path` error shape
- Test convention: `vitest`, imports from `vitest`, helper factory functions at top of test file
- `shared/src/effects/` directory didn't exist — created fresh for pipeline validator
- Well-known engine samplers: `inputTex`, `historyTex`, `screenTex`, `depthTex`
- Linear pipeline enforces: previous pass IDs are valid sampler sources (no forward references)
- `pingPong` persistence requires `historyTex` sampler declaration — enforced by validator

## Task 2: Budget/Degradation Policy Contract (2026-02-07)

- Budget resolver follows same pure-function pattern as pipeline validator: takes spec + policy, returns structured result
- Deterministic degradation ladder order: scale_resolution → reduce_cadence → drop_pass (enforced by action ordering)
- Drop candidates sorted by qualityTier priority (low=0 < medium=1 < high=2) then alphabetical ID for deterministic tiebreaking
- Required passes (`required: true`) are never in the drop candidate pool — collected separately
- `withinBudget=false` is the correct signal when required passes alone exceed maxPasses — resolver does not force-drop them
- EffectsManager.gd has 15 sprite shaders, 21 post shaders — informed tier preset values (web-high: 16, mobile-low: 4)
- Resolution scale and cadence are declared as actions but applied externally (the resolver records intent, runtime applies it)
- `cloneSpec` shallow-copies pass arrays to avoid mutating the input — important for idempotent repeated calls
- `BudgetPolicy` keeps `tier` label alongside `limits` so actions can reference the tier name in reason strings

## Task 3: Linear Pipeline Executor + Bridge (2026-02-07)

- Added `PipelineExecutor.gd` as a dedicated runtime node that executes linear `spritePasses` then `screenPasses`, tracks active pass materials by pass ID, and exposes `apply_pipeline`, `clear_pipeline`, and `update_pass_param`.
- Runtime sampler safety now mirrors validator assumptions: each pass sampler must be one of `inputTex/historyTex/screenTex/depthTex` or a previously executed pass ID; invalid bindings fail fast with `push_error`.
- Executor binds only declared `uniforms` + `samplers` from pass metadata; undeclared parameter keys in `params` are rejected before material assignment.
- Built-in pass resolution requires TS `EffectType` camelCase -> Godot shader key mapping (e.g. `chromaticAberration` -> `chromatic_aberration`, `waveDistortion` -> `wave`, `motionBlur` -> `motion_blur`).
- `GameBridgeEffects.gd` now wires pipeline methods through both native dispatch (`apply_pipeline`, `clear_pipeline`, `update_pipeline_pass_param`) and web JS bridge callbacks (`applyPipeline`, `clearPipeline`, `updatePipelinePassParam`).
- Added shared serialization helper `serializePipelineSpec` that validates via `validatePipelineSpec` before `JSON.stringify`, then used it in both web and native Godot bridge implementations.
- Full shared test suite currently has unrelated pre-existing failures in expressions/asset-url tests; targeted new serialization test file passes.

## Task 4: Feedback Core — Ping-Pong Render Targets (2026-02-07)

- PipelineExecutor.gd now has a `PipelineState` enum: `IDLE`, `RUNNING`, `PAUSED`, `STOPPED`. State machine enforces valid transitions with `push_warning` on invalid ones.
- Ping-pong architecture uses two `SubViewport` nodes per feedback pass, each containing a `ColorRect` with the pass shader material. On each `_process` frame, the "read" and "write" viewports swap via `current_read_index`.
- `historyTex` sampler is automatically bound: material_a reads from viewport_b's texture and vice versa. The swap happens by updating the `historyTex` shader parameter on the write material each frame.
- `_ready()` calls `set_process(false)` — processing only activates when `start_pipeline()` transitions to RUNNING state.
- `apply_pipeline()` now reads `lifecycle.stopMode` and `lifecycle.autoStart` from the spec dict. If `autoStart` is true and feedback passes exist, `start_pipeline()` is called automatically.
- `clear_pipeline()` resets state to IDLE, cleans up feedback viewports via `queue_free()`, then cleans up active passes as before.
- `stop_pipeline()` with `stopMode == "freeze"` simply stops processing (last frame preserved in viewport textures). With `stopMode == "clear"`, it sets `CLEAR_MODE_ALWAYS` on both viewports to clear them.
- `reset_pipeline()` always clears feedback textures and returns to IDLE state regardless of current state.
- `update_pass_param()` now also propagates parameter changes to both feedback materials (material_a and material_b), excluding `historyTex` which is managed internally.
- Feedback viewport size is derived from `get_viewport().get_visible_rect().size` at setup time, falling back to 800x600.
- `_clear_feedback_textures()` avoids `await` — uses `CLEAR_MODE_ALWAYS` which takes effect on next render frame automatically.
- Lifecycle bridge methods follow exact same pattern as existing pipeline methods: `_method_map` entries, JS bridge callbacks stored to prevent GC, public API methods that delegate to `pipeline_executor`.
- No new types needed in `effect-pipeline.ts` — lifecycle actions (start/pause/resume/stop/reset) are runtime bridge methods, not spec-level types. The spec already has `PipelineLifecycle` with `stopMode` and `autoStart`.
- TS bridge methods are simple pass-through: web calls `getGodotBridge()?.startPipeline?.()`, native calls `callEffectsBridge('start_pipeline')`.

## Task 5: Legacy Bridge Adapter Layer (2026-02-07)

- Legacy adapter is pure TypeScript in `shared/src/effects/legacy-adapter.ts` — no Godot/bridge modifications needed.
- Three adapter functions convert legacy API call signatures to `EffectPipelineSpec`:
  - `legacySpriteEffectToSpec` → single sprite pass with `builtin` shader source
  - `legacyPostEffectToSpec` → single screen pass with `builtin` shader source
  - `legacyDynamicShaderToSpec` → single screen pass with `custom` GLSL shader source
- Uniform type inference from params: `number` → `float`, `boolean` → `bool`, array length 2/3/4 → `vec2`/`vec3`/`vec4`, strings are skipped (not valid uniforms).
- Default pipeline settings for legacy effects: `lifecycle: { stopMode: 'clear', autoStart: false }`, `persistence: 'none'`, `qualityTier: 'medium'`, `required: true`, `samplers: ['inputTex']`.
- Pipeline ID pattern: `legacy-{effectName}` for builtin effects, `legacy-dynamic` for dynamic shaders.
- Pass ID equals effect name for builtin effects, `legacy-dynamic` for dynamic shaders.
- `EffectType` is cast via `as EffectType` since the adapter accepts `string` — allows runtime flexibility while keeping type safety at the spec level.
- All generated specs pass `validatePipelineSpec()` — verified in tests.
- 13 tests cover: sprite/post/dynamic mapping, param preservation, uniform extraction with type inference, string param skipping, default settings, and validation pass-through.

## Task 6: Snapshot Capture/Restore Subsystem (2026-02-07)

- `capture_snapshot()` in PipelineExecutor.gd iterates `_active_passes`, reads current shader parameter values via `material.get_shader_parameter()` for declared uniforms/samplers (excluding well-known texture samplers and Texture2D values which are GPU-only).
- Concurrency guard: `_capture_in_progress` bool flag prevents overlapping captures — concurrent requests get an empty dict with `push_warning`.
- Snapshot includes `hasFeedbackState: true` for passes in `_feedback_passes` — signals that GPU texture state exists but is NOT captured (parameter state only in V1).
- `restore_snapshot()` delegates to existing `update_pass_param()` per parameter, which already handles propagation to feedback material_a/material_b.
- Timestamp uses `Time.get_unix_time_from_system() * 1000.0` for millisecond precision matching JS `Date.now()`.
- TypeScript snapshot types in `shared/src/types/effect-snapshot.ts`: `PassSnapshot`, `PipelineSnapshot`, `SnapshotRequest`, `SnapshotValidationResult`.
- `validateSnapshotForRestore()` distinguishes blocking errors (unknown pass IDs in snapshot) from warnings (pipeline passes missing from snapshot — will keep current state). Only blocking errors set `valid: false`.
- Web bridge `captureSnapshot()` uses `_lastResult` pattern with 16ms frame wait, matching existing `createDynamicShader` async approach.
- Native bridge `captureSnapshot()` uses `callGameBridgeAsync` for proper worklet-based async communication.
- `restoreSnapshot()` is fire-and-forget on both platforms (synchronous dispatch) since parameter restoration is immediate.
- Bridge method naming: GodotBridge interface uses `captureSnapshot`/`restoreSnapshot`, Godot-side uses `capture_pipeline_snapshot`/`restore_pipeline_snapshot` to match existing snake_case convention with pipeline prefix.

## Task 7: AI-Composable Preset Library + Registry Extensions (2026-02-07)

- `EffectPreset` type: `{ id, name, description, pipeline, tiers: Record<QualityTier, EffectPipelineSpec>, tags: string[] }` — simple, flat structure.
- 6 canonical presets: `bloom-glow`, `retro-crt`, `underwater-dream`, `cinematic`, `pixel-art`, `feedback-paint`.
- Quality tier degradation strategy: high = all passes at high quality, medium = drop optional passes + reduce tier, low = minimal single-pass core only.
- `feedback-paint` preset is the only one using `pingPong` persistence + `historyTex` sampler — validates correctly because historyTex is declared.
- Registry is a simple `ReadonlyMap<string, EffectPreset>` — no complex class or DI needed. Three lookup functions: `getPreset`, `getAllPresets`, `getPresetsByTag`.
- Pass IDs are globally unique per pipeline (e.g., `bloom-glow-bloom`, `retro-crt-scanlines`) to avoid validator `E_DUPLICATE_PASS_ID` errors.
- Each tier has its own pipeline `id` (e.g., `bloom-glow-high`, `bloom-glow-medium`, `bloom-glow-low`) for distinct runtime identification.
- `pass()` helper with sensible defaults (`inputTex` sampler, no persistence, `required: true`, `medium` quality) reduces boilerplate.
- 46 tests: validates all presets × all tiers, tag filtering, lookup, degradation ordering (high ≥ medium ≥ low pass counts), structural invariants.
- Pre-existing LSP errors in `GameRuntime.godot.tsx` and `gameDefinitionValidator.test.ts` are unrelated — new files are clean.

## Task 8: Parity/Performance Test Harness + Rollout Gates (2026-02-07)

- Parity harness test (`parity-harness.test.ts`) covers 164 tests across 6 describe blocks: legacy adapter coverage (56 tests — 28 EffectType × 2 adapter funcs), preset validation (18+1), budget resolution (72 tests — 6 presets × 3 quality × 4 platform), budget determinism (6), lifecycle correctness (4), snapshot roundtrip (5).
- `EFFECT_METADATA` keys in `effects.ts` enumerate exactly 28 EffectType values (not 30 as noted in context — `colorMatrix` was already counted but listed separately in older notes).
- Rollout gate (`rollout-gate.ts`) is a pure function: 4 named checks (preset-validation, budget-compatibility, legacy-adapter-coverage, lifecycle-completeness), structured result with `ready`, `blockers[]`, `passed[]`.
- Gate check functions return `{ ok, detail }` — detail is the gate name on success, or `gateName: failure details` on failure. This gives callers both machine-readable gate names and human-readable failure info.
- Empty presets array passes all gates — this is intentional since the gate checks presets-related things per-preset (no presets = no failures). Legacy adapter coverage is preset-independent.
- Budget resolution test matrix: every preset at every quality tier on every platform tier must resolve `withinBudget: true`. This catches cases where required passes exceed the platform's `maxPasses` limit.
- Broken preset test uses empty `spritePasses` + `screenPasses` arrays, which fails `E_EMPTY_CHAIN` validation. This is the simplest way to create an invalid pipeline spec.
- Total effects test count went from 100 → 270 (170 new tests across 2 new test files).
- `tsc --noEmit` clean, no changes to existing files needed.
