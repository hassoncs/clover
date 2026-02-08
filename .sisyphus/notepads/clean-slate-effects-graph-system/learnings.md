# Learnings

## Initial Context
- Existing v1 types in `shared/src/types/effect-pipeline.ts`: `ShaderSource`, `UniformDeclaration`, `UniformType`, `EffectPassSpec`, `PersistenceMode`, `QualityTier`, `StopMode`, `PipelineLifecycle`, `EffectPipelineSpec`
- Existing v1 types in `shared/src/types/multi-pass-effect.ts`: `MultiPassEffectSpec`, `BufferSpec`, `PassSpec`
- Existing v1 types in `shared/src/types/effect-snapshot.ts`: `PassSnapshot`, `PipelineSnapshot`, `SnapshotRequest`, `SnapshotValidationResult`
- Existing v1 types in `shared/src/types/effects.ts`: 28 `EffectType` variants, `EffectBase`, `EffectBlendMode`, `EffectMetadata`, `EffectParamMeta`, `EFFECT_METADATA`
- Existing v1 types in `shared/src/types/effect-budget.ts`: `PlatformTier`, `BudgetTierPolicy`, `BudgetPolicy`, `BUDGET_TIER_PRESETS`, `DegradationAction`, `BudgetResolution`
- Existing preset library in `shared/src/effects/preset-library.ts`: `EffectPreset` with tiers, tags, pass factory helpers
- V2 types go in NEW directory `shared/src/effects-v2/` — do NOT modify v1 files
- V2 can import from v1 types (e.g., `ShaderSource`, `QualityTier`, `PersistenceMode`, `PlatformTier`) but must NOT couple to v1 pipeline shapes

## T1: Effects-V2 Core Types
- Created `shared/src/effects-v2/types.ts` with full graph contract: `EffectNode`, `Connection`, `FeedbackEdge`, `FeedbackPolicy`, `EffectGraphSpec`, `ResourceRef`, `CompiledPass`, `CompiledPlan`
- Barrel export at `shared/src/effects-v2/index.ts` re-exports all types plus convenience re-exports of v1 types (`ShaderSource`, `UniformDeclaration`, `QualityTier`, `PersistenceMode`, `PlatformTier`)
- `@ts-expect-error` in object literals must be placed on the *property line* with the bad value, not the variable declaration — TS assigns the error to the specific property
- `shared/tsconfig.json` excludes `**/__tests__/**` from compilation, so test files don't affect `tsc --noEmit`
- vitest + `expectTypeOf` works well for type-level assertion tests
- Tests: 11 passing (3 positive construction tests, 2 requires/provides contract tests, 3 FeedbackPolicy validation tests, 3 negative @ts-expect-error tests)

## T2: Registry & Search Index
- `ManifestRegistry` uses `Map<string, NodeTypeRegistration>` internally; `getAll()` sorts by `type` string for deterministic iteration
- Alias map is maintained on register/unregister for O(1) lookup via `resolveAlias()`
- Search returns results sorted by relevance descending, then type ascending for stable tie-breaking
- Free-text search scores: exact alias match (10), partial alias (5), displayName (4), description (2), tag (1)
- `validateConstraints()` checks `requires` (missing deps) and `conflicts` (incompatible pairs) across a node type set
- T1 (core types) created `index.ts` barrel first; T2 appended its exports — coordination worked via "append if exists" pattern
- `QualityTier` imported from v1 `../types/effect-pipeline` as instructed — no dependency on `./types.ts`
- 23 tests cover: registration CRUD, deterministic ordering, search by tag/family/tier/text, alias resolution, AI context formatting, constraint validation

## T3: Validator & Error Taxonomy
- Error taxonomy in `errors.ts`: 14 machine-readable codes (`GraphValidationErrorCode` union)
- `GraphValidationError` has `code`, `message`, optional `nodeIds[]` and `path`
- Validator runs checks in specified order: empty → duplicates → self-loops → missing refs → dup connections → generator inputs → cycles → feedback limit → feedback invalid → format mismatch → disconnected → budget
- Cycle detection uses Kahn's algorithm (topological sort), excluding feedback edges from adjacency
- Feedback limit: max 1 feedback edge per graph in v1
- Format mismatch: compares outputTarget.format between connected source and target nodes
- Budget check: uses `BUDGET_TIER_PRESETS` from v1 types; only enforced when `platformTier` option provided
- Disconnected node check exempts generators (they can be standalone)
- 20 tests: 3 happy paths, 14 error-specific, 1 multiple-errors, 2 budget edge cases

## T5: Resource Graph + Scope Target Model
- `buildResourceGraph()` takes `EffectGraphSpec` and produces a `ResourceGraph` with explicit `ResourceNode` entries for every resource (implicit inputs, intermediates, feedback)
- Resource IDs are deterministic: `{nodeId}:{bufferId}` for intermediates, `__screenColor`/`__entityTexture` for implicit inputs, `__feedback:{from}->{to}` for feedback
- Format compatibility: same→same OK, rgba16f→rgba8 OK (downcast), rgba8→rgba16f NOT OK (upcast loses precision context)
- Resolution compatibility: same→same OK, higher→lower OK (downscale), lower→higher NOT OK (implicit upscale forbidden), custom only with custom
- `ScopeTarget` is a discriminated union `{ type: 'screen' } | { type: 'entity'; entityId: string }` — enriches the raw string `scope` from `EffectGraphSpec`
- `ResourceBinding` explicitly maps every pass input/output to a resource ID — no implicit texture lookups
- Error codes: `E_RESOURCE_UNRESOLVED`, `E_FORMAT_MISMATCH`, `E_RESOLUTION_MISMATCH`, `E_DUPLICATE_PROVIDER`
- 28 tests cover: format compat (4), resolution compat (8), effective resolution (5), graph building (11 including happy paths, error cases, determinism)
- The `EffectGraphSpec.scope` is `'screen' | 'entity'` (string literal), not the `ScopeTarget` union — `buildResourceGraph` converts

## T6: Feedback/Ping-Pong Policy Manager
- `FeedbackManager` is a centralized lifecycle manager for all feedback buffers — no per-pass ad-hoc ping-pong
- `FeedbackBufferState` tracks: `currentReadIndex` (0|1), `currentWriteIndex` (0|1), `initialized`, `frameCount`, `frozen`
- Initial state is always deterministic: readIndex=0, writeIndex=1, frameCount=0
- Swap alternates deterministically: prevRead becomes writeIndex, prevWrite becomes readIndex
- 1000-swap stability verified: even swaps return to initial index positions, frameCount accumulates correctly
- `seedFromInput` mode: `isReadable()` returns false until first swap completes (no reading uninitialized data)
- Stop with `freeze`: sets `frozen=true`, preserves all state, `swap()` throws while frozen
- Stop with `clear`: resets to uninitialized state (readIndex=0, writeIndex=1, frameCount=0)
- `validate()` checks: read/write index collision, frozen+uninitialized, invalid indices, negative frameCount
- Godot PipelineExecutor.gd uses `current_read_index` with `1 - read_idx` pattern — TypeScript version uses explicit swap
- Godot MultiPassExecutor.gd uses `write_to_a` boolean — TypeScript version uses explicit 0/1 indices for clarity
- 36 tests: registration (3), unregister (2), initialize (3), swap (5), stop-freeze (1), stop-clear (1), resume (3), reset (2), isReadable (6), getAllIds (2), validate (3), getFrameCount (3), determinism (2)

## T4: Deterministic Graph Compiler
- `compileGraph()` validates first via `validateGraph()`, then resolves resources via `buildResourceGraph()`, then topologically sorts with Kahn's algorithm
- Stable tie-breaking: when multiple nodes have in-degree 0, sorted alphabetically by node ID; new ready nodes inserted via binary search into sorted queue
- Ordering constraints (`before`/`after`) converted to additional DAG edges before topological sort; contradictory constraints detected as cycles → `E_ORDER_CONFLICT`
- Feedback edges excluded from DAG (same pattern as validator's cycle detection)
- Deterministic hash: FNV-1a over stable JSON serialization (recursive sorted keys) — no crypto dependency
- `compiledAt` uses `new Date().toISOString()` but is excluded from hash computation for determinism
- `ShaderSource` defaults to `{ type: 'custom', glsl: '' }` since actual shader comes from registry lookup later
- Stateful nodes get `persistence: 'pingPong'`; non-stateful get `persistence: 'none'`
- Resource map built by converting `ResourceNode` → `ResourceRef` (feedback kind → 'buffer' type, all others → 'texture')
- 22 tests: 3 happy paths, 2 deterministic hash, 2 stable tie-break, 3 feedback edge, 2 ordering constraints, 1 E_ORDER_CONFLICT, 2 validation passthrough, 1 resource passthrough, 2 resource map, 4 metadata

## T7: Godot Effects-V2 Runtime Executor
- Added new isolated runtime scripts under `godot_project/scripts/effects_v2/` without modifying legacy executors.
- `EffectsV2GraphExecutor` implements deterministic lifecycle state machine (`IDLE -> READY -> RUNNING -> PAUSED/STOPPED`) with transition logging via `push_warning()`.
- `apply_plan()` validates `CompiledPlan` shape (`id`, `scope`, `passes[]`, `resourceMap{}`), allocates resources, resolves shaders (`builtin` mapping + `custom` GLSL), and builds per-pass SubViewport + ColorRect + ShaderMaterial.
- `EffectsV2ResourceGraph` allocates explicit resource nodes from `resourceMap`, binds pass inputs without implicit lookups, supports explicit `params.inputBindings` and fallback binding by resource ID.
- `EffectsV2PingPongManager` centralizes feedback lifecycle (register/initialize/swap/stop/reset/release) and exposes read texture + current write viewport deterministically.
- Ping-pong passes in `GraphExecutor` create dual materials/rects (A/B), bind `historyTex` from managed read texture, swap buffers each frame, and rebind downstream inputs after write-target changes.
- Snapshot API stores/restores pass params with plan-hash compatibility checks (`planHash` must match active plan hash).

## T8: Effects-V2 Bridge API Parity (Web + Native)
- Added bridge contract types in `app/lib/godot/types.ts`: `EffectsV2Error`, `EffectsV2Result<T>`, `EffectsV2PipelineSnapshot`, and `EffectsV2Bridge`; `GodotBridge` now extends `EffectsV2Bridge`.
- Added shared normalization/serialization helpers in `app/lib/godot/GodotBridgeBase.ts` to keep web/native error and snapshot semantics identical (`normalizeEffectsV2Result`, `normalizeEffectsV2Snapshot`, `createEffectsV2SnapshotPayload`).
- Web bridge now routes all effects-v2 calls through async query RPC methods (`effectsV2.applyGraph|clearGraph|updateParams|start|pause|resume|stop|reset|snapshot|restore`) and returns typed `EffectsV2Result`.
- Native bridge now routes the same effects-v2 methods through `callRpc` transport with identical method names and uses the same normalization helpers, ensuring parity with web.
- Snapshot normalization supports both runtime-pass-array format (`passes[]`) and bridge-contract format (`passParams`), producing stable `planHash`, `passParams`, `feedbackStates`, `lifecycleState`, `timestamp` fields.
- Added `app/lib/godot/__tests__/effects-v2-bridge.test.ts` to verify web/native type-level contract implementation and shared result/snapshot/error shape behavior.

## T9: Snapshot/Restore V2 + Compatibility
- Created `shared/src/effects-v2/snapshot.ts` with `SnapshotManager` class — capture, checkCompatibility, restore, validate
- `EffectsV2Snapshot` captures: planHash, graphId, graphVersion, passParams, feedbackStates, lifecycleState, timestamp, snapshotVersion (always 1)
- `FeedbackSnapshotState` mirrors `FeedbackBufferState` fields (readIndex, writeIndex, frameCount, frozen, initialized) without policy reference
- Compatibility checks 6 error codes: E_HASH_MISMATCH, E_VERSION_MISMATCH, E_MISSING_PASS, E_EXTRA_PASS, E_MISSING_FEEDBACK, E_SNAPSHOT_CORRUPT
- Restore is all-or-nothing: incompatible → errors only (no partial data), compatible → full passParams + feedbackStates
- `validate()` is a type guard checking structural integrity (all required fields, correct types)
- `structuredClone()` used for deep copying passParams and feedbackStates on capture and restore — prevents mutation leaks
- `ShaderSource` in tests must use discriminated union `{ type: 'builtin', effectType: 'glow' }` not `{ vertex, fragment }`
- 23 tests cover: capture (2), checkCompatibility (5), restore (3), validate (10 + 3 integration with corrupt snapshots)
