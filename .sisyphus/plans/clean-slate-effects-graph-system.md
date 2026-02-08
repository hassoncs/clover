# Effects Graph System - Architecture & Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

---

## TL;DR

Build a composable, data-driven render graph system inspired by TouchDesigner's node model. Three cleanly separated domains:

1. **Runtime** - deterministic DAG executor in Godot with explicit resource contracts, feedback/ping-pong, and bridge parity (web + native).
2. **Authoring** - AI-first pipeline that normalizes LLM output into validated `EffectPackage` artifacts. No raw LLM output ever reaches the runtime.
3. **Catalog** - global shader package registry with draft/publish/version semantics, searchable metadata, and R2-backed immutable storage.

Fusion (mega-shader compilation) is an optional optimization backend - never the authoring model.

**Effort**: XL  
**Parallel Waves**: 4  
**Critical Path**: Spec -> Compiler -> Godot Executor -> Bridge -> Catalog

---

## 1. Vision & Principles

### Design North Star

Every effect is a **node in a directed acyclic graph** where outputs are 2D buffers flowing through typed connections. Execution is always: topological sort -> bind inputs -> fullscreen quad render -> output buffer. Godot mapping: SubViewport + ColorRect + ShaderMaterial.

### Non-Negotiable Principles

| Principle | Meaning |
|-----------|---------|
| **Explicit contracts** | Every pass declares `requires`/`provides`. No hidden texture lookups. |
| **Deterministic ordering** | Same graph -> same compiled plan hash, always. Topological sort + stable tie-break. |
| **Validation-first** | Invalid graphs fail with machine-readable error codes before reaching the runtime. |
| **AI-safe boundary** | LLM output passes through parse -> normalize -> validate -> compile. Hallucinated IDs are rejected. |
| **Sealed runtime** | Runtime accepts only compiled `EffectPackage`. It never imports authoring or catalog concerns. |
| **Platform parity** | Web and native bridge expose identical API signatures and error semantics. |
| **Feedback as first-class** | Ping-pong buffers have explicit init/swap/stop policies. No ad-hoc per-pass logic. |

---

## 2. V1 Scope Boundary (Locked)

### V1 IN

- Deterministic DAG execution engine (topological sort, explicit resource binding)
- MVP 7-node starter set: **Noise, Ramp, Feedback, Composite, Displace, Blur, Level**
- Node families: Generator (no input), Filter (single input), Combiner (2+ inputs)
- Constrained feedback: exactly one explicit feedback edge per subgraph; all other cycles are invalid
- Screen and entity scope targets
- Bridge lifecycle: apply / clear / update / start / pause / resume / stop / reset / snapshot / restore
- Platform budget enforcement (mobile-low through web-high)
- AI authoring normalization boundary (prompt -> plan -> normalized package -> validated compile)
- Shader package schema with draft/published/versioned immutable artifacts
- Catalog API contracts (create draft, update, publish, search, fetch)
- Built-in node catalog seeding (idempotent upsert by `slug + shaderVersion`)
- One end-to-end preset roundtrip: author -> save -> load -> execute

### V1 OUT (Hard Guardrails)

- No visual graph editor
- No runtime structural graph hot-editing (parameter updates only while running)
- No compute-shader-only requirements
- No cross-entity graph dependencies
- No arbitrary graph cycles (beyond constrained feedback edge)
- No multi-render-target (MRT) behavior
- No 3D/geometry shader graph families
- No live dependency-wide recompilation pipeline
- No checkout/payout/payment execution
- No remote unvalidated package execution

---

## 3. Unified Data Model

### 3.1 Node Contract

The atomic unit. Every effect - generator, filter, combiner - is a node.

```typescript
interface EffectNode {
  id: string;
  type: string;                    // e.g. "filter.blur.gaussian"
  family: 'generator' | 'filter' | 'combiner';
  inputSlots: InputSlot[];
  params: Record<string, ParamValue>;
  outputTarget: {
    bufferId: string;
    format: 'rgba8' | 'rgba16f';
    resolution: 'full' | 'half' | 'quarter' | 'custom';
  };
  flags: {
    stateful: boolean;             // feedback/history usage
    fusible: 'always' | 'conditional' | 'never';
  };
}

interface InputSlot {
  name: string;
  dataType: 'texture' | 'scalar' | 'vec2' | 'vec3' | 'vec4' | 'mask';
  connectedTo: { nodeId: string; output: string } | null;
}
```

### 3.2 Pass Contract (Compiled)

What the runtime actually executes. Produced by the compiler from the node graph.

```typescript
interface CompiledPass {
  id: string;
  shaderSource: ShaderSource;       // reuses existing type from effect-pipeline.ts
  requires: ResourceRef[];          // explicit input bindings
  provides: ResourceRef[];          // explicit output declarations
  params: Record<string, unknown>;
  paramsSchema: UniformDeclaration[];
  persistence: PersistenceMode;
  qualityTier: QualityTier;
  constraints: {
    before?: string[];
    after?: string[];
    conflicts?: string[];
  };
}
```

### 3.3 Effect Graph Spec (Authoring-Level)

The declarative document that AI or editors produce.

```typescript
interface EffectGraphSpec {
  id: string;
  version: string;                  // semver
  engineApiVersion: string;         // compatibility marker
  scope: 'screen' | 'entity';
  nodes: EffectNode[];
  connections: Connection[];        // explicit edges
  feedbackEdges: FeedbackEdge[];    // constrained, max 1 per subgraph in v1
  lifecycle: {
    autoStart: boolean;
    stopMode: 'freeze' | 'clear';
  };
}
```

### 3.4 Shader Package (Publishable Artifact)

The unit of distribution. Immutable once published.

```typescript
interface ShaderPackage {
  id: string;
  slug: string;
  version: string;                  // immutable after publish
  status: 'draft' | 'published' | 'deprecated';
  engineApiVersion: string;
  graphSpec: EffectGraphSpec;
  compiledPlan: CompiledPlan;       // pre-compiled for target platforms
  manifest: PackageManifest;        // searchable metadata
  provenance: {
    sourceType: 'system' | 'user' | 'ai';
    compiledPrompt?: string;
    generationJobId?: string;
  };
  preview?: { thumbnailR2Key: string };
  createdAt: string;
  publishedAt?: string;
}
```

### 3.5 Package Manifest (Search/Discovery)

```typescript
interface PackageManifest {
  name: string;
  description: string;
  tags: string[];
  categories: string[];
  scopeSupport: ('screen' | 'entity')[];
  nodeTypes: string[];              // for filtering by capability
  parameterSummary: ParamSummary[];
  performanceTier: QualityTier;
  compatibility: {
    requires?: string[];            // other packages needed
    conflicts?: string[];           // incompatible packages
  };
  license: 'open' | 'custom' | 'proprietary';
}
```

### 3.6 Feedback Resource Contract

```typescript
interface FeedbackPolicy {
  initMode: 'clear' | 'seedFromInput' | 'restoreSnapshot';
  clearColor?: string;
  swapPolicy: 'pingPong';          // only mode in v1
  stopBehavior: 'freeze' | 'clear';
  bufferFormat: 'rgba8' | 'rgba16f';
}
```

---

## 4. Runtime Architecture

### 4.1 Compilation Pipeline (TypeScript - `shared/`)

```
EffectGraphSpec
  -> Validator (cycles, missing resources, budget, format mismatches)
  -> Scheduler (topological sort + stable tie-break -> deterministic pass order)
  -> Resource Binder (explicit input/output resource map)
  -> CompiledPlan (sealed, hashable)
```

**Key invariant**: `hash(compile(graph)) === hash(compile(graph))` for any number of runs.

**Existing code to evolve**:
- `shared/src/effects/pipeline-validator.ts` -> error code patterns
- `shared/src/effects/multi-pass-validator.ts` -> read/write resolution
- `shared/src/effects/budget-resolver.ts` -> platform tier enforcement
- `shared/src/types/effect-pipeline.ts` -> `ShaderSource`, `UniformDeclaration`, `QualityTier`, `PersistenceMode`
- `shared/src/types/multi-pass-effect.ts` -> `BufferSpec`, `PassSpec` (absorb into v2 model)
- `shared/src/types/effect-budget.ts` -> `PlatformTier`, `BudgetTierPolicy`, `BUDGET_TIER_PRESETS`

### 4.2 Godot Executor (GDScript - `godot_project/scripts/effects_v2/`)

New directory. Does not mutate legacy executors.

- `GraphExecutor.gd` - receives `CompiledPlan` JSON, executes passes in order
- `ResourceGraph.gd` - manages SubViewport/texture allocation per resource node
- `PingPongManager.gd` - centralized feedback buffer lifecycle (init, swap, stop)

**Existing code for reference (not modified)**:
- `godot_project/scripts/effects/PipelineExecutor.gd` - sequential pass execution, `EFFECT_TYPE_TO_SHADER` mapping
- `godot_project/scripts/effects/MultiPassExecutor.gd` - buffer graph, ping-pong warmup
- `godot_project/scripts/effects/EffectsManager.gd` - `SPRITE_SHADER_PATHS`, `POST_SHADER_PATHS`, layer composition
- `godot_project/scripts/effects/GameBridgeEffects.gd` - subsystem creation pattern

**Existing shader inventory** (36 files, initial seed candidates):
- `godot_project/shaders/sprite/*.gdshader` (15 sprite shaders: glow, outline, dissolve, tint, etc.)
- `godot_project/shaders/post_process/*.gdshader` (21 post-process shaders: blur, bloom, CRT, etc.)
- `godot_project/shaders/include/noise.gdshaderinc` - noise generator seed

### 4.3 Bridge API (TypeScript - `app/lib/godot/`)

New v2 methods added to existing bridge pattern. Identical signatures on both platforms.

```typescript
interface EffectsV2Bridge {
  applyGraph(plan: CompiledPlan): Promise<Result<void, EffectsError>>;
  clearGraph(): Promise<Result<void, EffectsError>>;
  updateParams(passId: string, params: Record<string, unknown>): Promise<Result<void, EffectsError>>;
  start(): Promise<Result<void, EffectsError>>;
  pause(): Promise<Result<void, EffectsError>>;
  resume(): Promise<Result<void, EffectsError>>;
  stop(): Promise<Result<void, EffectsError>>;
  reset(): Promise<Result<void, EffectsError>>;
  snapshot(): Promise<Result<PipelineSnapshot, EffectsError>>;
  restore(snapshot: PipelineSnapshot): Promise<Result<void, EffectsError>>;
}
```

**Existing code to extend**:
- `app/lib/godot/types.ts` - bridge interface contracts
- `app/lib/godot/GodotBridge.web.ts` - web method wiring
- `app/lib/godot/GodotBridge.native.ts` - native dispatch
- `app/lib/godot/GodotBridgeBase.ts` - shared base
- `shared/src/types/effect-snapshot.ts` - `PipelineSnapshot`, `PassSnapshot`

### 4.4 Snapshot/Restore

V2 snapshots capture pass params + feedback state markers + graph identity hash. Restore validates hash match before applying. Incompatible snapshots fail with structured error - no silent partial restore.

### 4.5 Performance Budgets

Enforced at two points:
1. **Validation time** - reject graphs exceeding platform profile limits
2. **Runtime** - emit metrics (frame time, compile time, resource memory) for test assertion

Platform profiles reuse existing `BUDGET_TIER_PRESETS` from `shared/src/types/effect-budget.ts`:
- `web-high`: 16 passes, 1.0x resolution
- `web-low`: 8 passes, 0.75x resolution
- `mobile-high`: 8 passes, 0.75x resolution
- `mobile-low`: 4 passes, 0.5x resolution

Degradation policy: quality reduction or hard reject by profile. No silent degradation without event/report.

---

## 5. Authoring Architecture

### 5.1 AI Authoring Pipeline

```
LLM Output (JSON)
  -> Parser (structural validation)
  -> Normalizer (canonicalize effect IDs, param shapes, ordering)
  -> Manifest Resolver (verify all referenced node types exist in registry)
  -> Validator (full graph validation)
  -> Compiler (produce CompiledPlan)
  -> EffectPackage (sealed artifact)
```

**Key rule**: No raw LLM output ever reaches the runtime. The normalizer is the trust boundary.

**Canonicalization**: Semantically equivalent graphs must produce identical compiled plan hashes. This enables deduplication and caching.

**Existing code for reference**:
- `shared/src/effects/pipeline-serialization.ts` - serialization boundary patterns
- `shared/src/types/effects.ts` - authoritative `EffectType` union (28 types), `EffectBase`, param metadata

### 5.2 Manifest Registry

Local, in-memory registry of all known node types and effect packages. Supports:
- Deterministic iteration order
- Search by tag, scope, param support, quality tier
- Constraint fields: `requires`, `conflicts`, `before`, `after`
- AI authoring hints and canonical effect aliases

**Existing code to evolve**:
- `shared/src/effects/preset-library.ts` - preset grouping, tier patterns

### 5.3 Fusion (Optional Optimization Backend)

Not part of v1 execution path. Architecture supports future addition:
- Fuse only nodes marked `fusible: 'always' | 'conditional'` and validated compatible
- Never fuse stateful feedback loops
- Auto-fallback to multi-pass graph when fusion risk is high
- Pure color transforms, UV transforms with same sampling domain are easy fusion targets
- Ping-pong/history passes, independent buffer lifetimes, heavy kernels are unsafe to fuse

---

## 6. Catalog & Storage Architecture

### 6.1 Database Schema

Extends existing patterns from `api/schema.sql`. Key tables:

```sql
shader_packages (
  id, slug, status, engine_api_version,
  creator_id, license, moderation_status,
  metadata_json,  -- searchable manifest fields
  created_at, updated_at
)

shader_package_versions (
  id, package_id, version, -- immutable after publish
  graph_spec_r2_key,       -- EffectGraphSpec JSON
  compiled_plan_r2_key,    -- CompiledPlan JSON
  preview_r2_key,          -- thumbnail
  compiled_prompt,         -- AI provenance
  published_at
)
```

**Existing patterns to reuse**:
- `api/schema.sql` - `assets.r2_key`, `assets.compiled_prompt`, `metadata_json` patterns
- `api/migrations/20260203_asset_system_v3.sql` - latest asset-system structure
- `api/src/ai/agent/artifact-manager.ts` - version/publish artifact lifecycle
- `api/src/agent/artifact-service.ts` - publish-to-active semantics

### 6.2 R2 Storage Layout

```
shaders/{package_id}/{version}/
  graph-spec.json          # EffectGraphSpec
  compiled-plan.json       # CompiledPlan
  preview.png              # thumbnail
  provenance.json          # AI generation metadata
```

Immutable after publish. Local mirror for offline bootstrap.

### 6.3 Catalog API (tRPC)

```
shaderPackages.createDraft    -> ShaderPackage (draft)
shaderPackages.updateDraft    -> ShaderPackage (draft)
shaderPackages.publish        -> ShaderPackageVersion (immutable)
shaderPackages.list           -> paginated, filterable, deterministic sort
shaderPackages.search         -> by tags, scope, author, popularity, recency
shaderPackages.getById        -> ShaderPackage + versions
shaderPackages.getVersion     -> specific immutable version
```

**Existing route patterns to follow**:
- `api/src/trpc/routes/asset-system/generation-jobs.ts` - job route shape
- `api/src/trpc/routes/asset-system/themes.ts` - list/filter style
- `api/src/trpc/routes/search.ts` - multi-source search conventions

### 6.4 Moderation & Ranking (Non-Transactional Hooks)

- Moderation states: `pending_review` -> `approved` -> `published` / `rejected` / `deprecated`
- Invalid transitions rejected deterministically
- Ranking signals: quality score, usage count, recency, compatibility confidence
- License metadata: `open` / `custom` / `proprietary` tags
- No payment/checkout execution in v1

### 6.5 Runtime Package Fetch

- Resolve by `id + version` with deterministic fallback: cache -> local mirror -> remote
- Network/catalog outage does not break execution for cached packages
- No remote unvalidated package execution - all fetched packages pass through validator

**Existing patterns**:
- `app/lib/offline/embedded-games-registry.ts` - offline registry fallback
- `api/src/lib/game-registry.ts` - discovery and fallback loading

### 6.6 Built-In Node Seeding

Seed DB/catalog with MVP 7 nodes as immutable system entries:

| Node | Family | Existing Anchor | Action |
|------|--------|-----------------|--------|
| Noise | Generator | `shaders/include/noise.gdshaderinc` | Wrap as generator node |
| Ramp | Generator | (new) | Add built-in seed |
| Feedback | Stateful filter | `persistence: pingPong` in executors | Constrained one-edge rule |
| Composite | Combiner | blend/composite + pass chaining | Promote to multi-input combiner |
| Displace | Filter/combiner | distortion patterns + custom shader | Add canonical displacement seed |
| Blur | Filter | `shaders/post_process/blur.gdshader` | Reuse as filter node |
| Level | Filter | color grading concepts | Add level/remap seed |

Seed contract:
- `sourceType: 'system'`, `isEditable: false`
- Idempotent upsert by `slug + shaderVersion`
- User-created nodes use `sourceType: 'user'` - separate domain, no collisions

---

## 7. Phased Execution Roadmap

### Wave 1: Foundations (Parallel)

| Task | Description | Depends On | Blocks |
|------|-------------|------------|--------|
| **T1** | Effects-v2 core spec + node/pass/graph contracts | - | T4, T5, T7 |
| **T2** | Manifest registry + search index model | - | T10 |
| **T3** | Validation engine + error taxonomy | T1 | T4, T8, T9 |

### Wave 2: Compilation (Parallel)

| Task | Description | Depends On | Blocks |
|------|-------------|------------|--------|
| **T4** | Deterministic graph scheduler/compiler | T1, T3 | T7, T8 |
| **T5** | Resource graph + scope target model | T1 | T7 |
| **T6** | Feedback/ping-pong policy manager | T1, T5 | T7, T9 |

### Wave 3: Runtime + Bridge (Sequential core, parallel edges)

| Task | Description | Depends On | Blocks |
|------|-------------|------------|--------|
| **T7** | Godot effects-v2 runtime executor | T4, T5, T6 | T8, T9 |
| **T8** | Bridge API (web + native parity) | T3, T7 | T10, T11 |
| **T9** | Snapshot/restore v2 + compatibility | T4, T7 | T11 |

### Wave 4: Hardening + Catalog (Parallel)

| Task | Description | Depends On | Blocks |
|------|-------------|------------|--------|
| **T10** | AI authoring interface + compile boundary | T2, T8 | T14 |
| **T11** | Performance budget harness + platform profiles | T3, T6, T7, T8, T9 | T14 |
| **T12** | Shader package domain model + version semantics | T8 | T13 |
| **T13** | Catalog API contracts + storage/indexing blueprint | T12 | T14 |
| **T14** | Documentation, seeding, integration validation | T10, T11, T13 | - |

```
Critical Path: T1 -> T3 -> T4 -> T7 -> T8 -> T10/T12 -> T13 -> T14
```

---

## 8. Detailed Tasks

### T1: Effects-V2 Core Spec and Contracts

**Files to create**: `shared/src/effects-v2/types.ts`  
**Files for reference**: `shared/src/types/effect-pipeline.ts`, `shared/src/types/multi-pass-effect.ts`, `shared/src/types/effect-snapshot.ts`, `shared/src/types/effects.ts`

**What to do**:
- Define `EffectNode`, `EffectGraphSpec`, `CompiledPass`, `CompiledPlan`, `ResourceRef`, `Connection`, `FeedbackEdge` types
- Add explicit pass contracts: `requires`, `provides`, `paramsSchema`, `constraints`
- Add stable IDs, `version`, and `engineApiVersion` fields
- Do NOT couple to old `EffectPipelineSpec` fields or include editor-only UI concerns

**Acceptance Criteria**:
- [x] New v2 types compile with `pnpm tsc --noEmit` (zero errors in `shared/src/effects-v2/`)
- [x] Contracts can express both screen and entity scope passes
- [x] Version field and migration target markers included

**QA Scenarios**:
- Scenario: `pnpm tsc --noEmit` passes -> `.sisyphus/evidence/t1-tsc.txt`
- Scenario: Invalid contract shape (missing requires/provides) rejected by type tests -> `.sisyphus/evidence/t1-negative.txt`

**Commit**: `feat(effects-v2): add core graph contract types`

### T2: Manifest Registry + Search Index Model

**Files to create**: `shared/src/effects-v2/registry.ts`  
**Files for reference**: `shared/src/effects/preset-library.ts`, `shared/src/types/effects.ts`

**What to do**:
- Define `PackageManifest` format with tags, categories, compat constraints, version
- Add deterministic searchable index API (by tag, scope, param support, quality tier)
- Add schema for AI authoring hints and canonical effect aliases
- Do NOT fetch remote marketplace or network catalogs

**Acceptance Criteria**:
- [x] Registry supports deterministic iteration order
- [x] Constraint fields include requires/conflicts/before/after
- [x] Search API returns stable sorted results across repeated runs

**QA Scenarios**:
- Scenario: Search by tag and scope returns deterministic order -> `.sisyphus/evidence/t2-search-order.txt`
- Scenario: Conflicting manifests rejected with validation error code -> `.sisyphus/evidence/t2-conflict.txt`

**Commit**: `feat(effects-v2): add manifest registry and search schema`

### T3: Validation Engine + Error Taxonomy

**Files to create**: `shared/src/effects-v2/validator.ts`, `shared/src/effects-v2/errors.ts`  
**Files for reference**: `shared/src/effects/pipeline-validator.ts`, `shared/src/effects/multi-pass-validator.ts`

**What to do**:
- Validate: cycles, missing resources, invalid scope refs, format mismatches
- Machine-readable error codes (`E_GRAPH_CYCLE`, `E_RESOURCE_UNRESOLVED`, `E_BUDGET_EXCEEDED`, etc.) + user-friendly messages
- Enforce performance guardrails at validation time (max passes/buffers per platform profile)
- Do NOT allow implicit fallback when validation fails

**Acceptance Criteria**:
- [x] Invalid graphs fail with stable error codes
- [x] Platform budget checks are enforceable by profile

**QA Scenarios**:
- Scenario: Cycle detection catches A->B->A graph with `E_GRAPH_CYCLE` and involved pass IDs -> `.sisyphus/evidence/t3-cycle.txt`
- Scenario: Platform budget violation blocked with budget error -> `.sisyphus/evidence/t3-budget.txt`

**Commit**: `feat(effects-v2): add validator and error taxonomy`

### T4: Deterministic Graph Scheduler/Compiler

**Files to create**: `shared/src/effects-v2/compiler.ts`  
**Files for reference**: `shared/src/effects/multi-pass-validator.ts`, `godot_project/scripts/effects/PipelineExecutor.gd`

**What to do**:
- Convert valid `EffectGraphSpec` into deterministic `CompiledPlan`
- Topological sort with stable tie-break rules (alphabetical by node ID)
- Emit explicit pass execution order + resource binding map
- Honor `before`/`after` ordering hints or reject contradictions explicitly

**Acceptance Criteria**:
- [x] Same input graph yields identical compiled plan hash across 100 runs
- [x] Contradictory ordering constraints fail with conflict code

**QA Scenarios**:
- Scenario: Deterministic compile hash stability (100 iterations) -> `.sisyphus/evidence/t4-hash.txt`
- Scenario: Contradictory before/after constraints fail -> `.sisyphus/evidence/t4-order-conflict.txt`

**Commit**: `feat(effects-v2): add deterministic graph compiler`

### T5: Resource Graph + Scope Target Model

**Files to create**: `shared/src/effects-v2/resources.ts`  
**Files for reference**: `godot_project/scripts/effects/EffectsManager.gd`, `godot_project/scripts/effects/MultiPassExecutor.gd`

**What to do**:
- Model resources explicitly: screen color, entity texture, intermediate textures
- Define target scopes: `screen`, `entity:<id>` (group optional, compile-time only)
- Enforce resource format and size adaptation policy
- Do NOT permit implicit global texture lookup

**Acceptance Criteria**:
- [x] Every pass input resolves to explicit resource node
- [x] Size/format mismatch handling is deterministic and test-covered

**QA Scenarios**:
- Scenario: Resource binding map generated for mixed screen/entity graph -> `.sisyphus/evidence/t5-bindings.txt`
- Scenario: Missing resource provider fails with `E_RESOURCE_UNRESOLVED` -> `.sisyphus/evidence/t5-unresolved.txt`

**Commit**: `feat(effects-v2): add resource graph and scope contracts`

### T6: Feedback/Ping-Pong Policy Manager

**Files to create**: `shared/src/effects-v2/feedback.ts`  
**Files for reference**: `godot_project/scripts/effects/PipelineExecutor.gd`, `godot_project/scripts/effects/MultiPassExecutor.gd`

**What to do**:
- First-class `FeedbackPolicy` abstraction with init modes (`clear`, `seedFromInput`, `restoreSnapshot`)
- Swap policy and stop behavior (`freeze` vs `clear`) contracts
- Safeguards against invalid feedback loops and uninitialized reads
- Do NOT allow ad-hoc per-pass private ping-pong logic

**Acceptance Criteria**:
- [x] Feedback buffers are initialized deterministically
- [x] Swap state remains correct over long runs (1000+ frames)

**QA Scenarios**:
- Scenario: Feedback effect stable over 1000 frames (no NaN/corruption) -> `.sisyphus/evidence/t6-longrun.txt`
- Scenario: Uninitialized feedback read blocked with explicit error -> `.sisyphus/evidence/t6-uninit.txt`

**Commit**: `feat(effects-v2): add feedback policy manager`

### T7: Godot Effects-V2 Runtime Executor

**Files to create**: `godot_project/scripts/effects_v2/GraphExecutor.gd`, `godot_project/scripts/effects_v2/ResourceGraph.gd`, `godot_project/scripts/effects_v2/PingPongManager.gd`  
**Files for reference**: `godot_project/scripts/effects/GameBridgeEffects.gd`, `godot_project/scripts/effects/PipelineExecutor.gd`, `godot_project/scripts/effects/MultiPassExecutor.gd`

**What to do**:
- Execute compiled plans for screen and entity scopes using explicit resource graph
- Integrate centralized ping-pong manager
- Remove hidden lookup patterns - all resources explicitly bound
- Do NOT mutate legacy executors in a breaking way

**Acceptance Criteria**:
- [x] Executor can run mixed-scope compiled plan end-to-end
- [x] Lifecycle state transitions are deterministic and logged

**QA Scenarios**:
- Scenario: Apply mixed graph, verify rendering via test harness -> `.sisyphus/evidence/t7-mixed-graph.png`
- Scenario: Invalid compiled plan rejected at runtime boundary -> `.sisyphus/evidence/t7-invalid-plan.png`

**Commit**: `feat(godot): add effects-v2 runtime executor`

### T8: Bridge API (Web + Native Parity)

**Files to modify**: `app/lib/godot/types.ts`, `app/lib/godot/GodotBridge.web.ts`, `app/lib/godot/GodotBridge.native.ts`, `app/lib/godot/GodotBridgeBase.ts`

**What to do**:
- Add `EffectsV2Bridge` methods: apply/clear/update/start/pause/resume/stop/reset/snapshot/restore
- Keep serialization and validation symmetric across web/native
- Return typed `Result` objects - no optimistic success stubs
- Do NOT allow behavior divergence between web and native

**Acceptance Criteria**:
- [x] Web and native expose identical effects-v2 API signatures
- [x] Error/result semantics are consistent

**QA Scenarios**:
- Scenario: Web bridge v2 lifecycle parity test -> `.sisyphus/evidence/t8-web-bridge.txt`
- Scenario: Native bridge rejects optimistic create shader response -> `.sisyphus/evidence/t8-native-error.txt`

**Commit**: `feat(bridge): add effects-v2 api parity for web/native`

### T9: Snapshot/Restore V2 + Compatibility

**Files to modify**: `shared/src/effects-v2/snapshot.ts`  
**Files for reference**: `shared/src/types/effect-snapshot.ts`, `shared/src/effects/snapshot-manager.ts`

**What to do**:
- V2 snapshot format: pass params + feedback state markers + graph identity hash
- Restore compatibility checks against current active graph version/hash
- Policy for partial restores and mismatched passes: fail safely, no silent partial restore

**Acceptance Criteria**:
- [x] Snapshot captures pass params + feedback state markers
- [x] Restore fails safely on incompatible graph identity

**QA Scenarios**:
- Scenario: Capture and restore same graph state -> `.sisyphus/evidence/t9-restore.png`
- Scenario: Restore rejected for mismatched graph hash -> `.sisyphus/evidence/t9-mismatch.txt`

**Commit**: `feat(effects-v2): add snapshot restore compatibility controls`

### T10: AI Authoring Interface + Compile Boundary

**Files to create**: `shared/src/effects-v2/authoring.ts`, `shared/src/effects-v2/normalizer.ts`  
**Files for reference**: `shared/src/effects/pipeline-serialization.ts`, `shared/src/types/effects.ts`

**What to do**:
- Define AI-facing authoring contract: prompt/output schema -> graph AST -> compiled plan
- Strict parse/normalize layer that rejects hallucinated effect IDs or invalid param shapes
- Canonicalization step: semantically equivalent graphs compile identically

**Acceptance Criteria**:
- [x] Invalid AI output blocked with structured errors
- [x] Canonicalization yields stable compiled plan hash for equivalent authoring variants

**QA Scenarios**:
- Scenario: Multiple synonymous AI graph variants normalize to equivalent AST -> `.sisyphus/evidence/t10-normalize.txt`
- Scenario: Hallucinated effect ID rejected with structured error -> `.sisyphus/evidence/t10-invalid-effect.txt`

**Commit**: `feat(effects-v2): add ai authoring normalization boundary`

### T11: Performance Budget Harness + Platform Profiles

**Files to modify**: `shared/src/effects-v2/budget.ts`  
**Files for reference**: `shared/src/effects/budget-resolver.ts`, `shared/src/effects/__tests__/budget-resolver.test.ts`, `shared/src/types/effect-budget.ts`

**What to do**:
- Platform profile budgets enforced pre-run (reuse `BUDGET_TIER_PRESETS`)
- Performance harness for frame time, compile time, resource memory
- Fallback policy (quality reduction or hard reject) by profile
- No best-effort silent degradation without event/report

**Acceptance Criteria**:
- [x] Mobile profile fails graphs above configured limits
- [x] Compile and runtime perf metrics are emitted and test-assertable

**QA Scenarios**:
- Scenario: Mobile profile budget enforcement -> `.sisyphus/evidence/t11-mobile-budget.txt`
- Scenario: Runtime performance benchmark threshold check -> `.sisyphus/evidence/t11-perf.txt`

**Commit**: `feat(effects-v2): add performance profiles and harness`

### T12: Shader Package Domain Model + Version Semantics

**Files to create**: `shared/src/effects-v2/package.ts`  
**Files for reference**: `api/src/ai/agent/artifact-manager.ts`, `api/src/agent/artifact-service.ts`, `api/schema.sql`

**What to do**:
- Define `ShaderPackage` artifact schema (manifest, graph spec ref, compiled outputs, preview, provenance)
- Immutable published versions + mutable draft head semantics
- `engineApiVersion` and compatibility fields
- Do NOT allow mutable published artifact payloads

**Acceptance Criteria**:
- [x] Draft and published package states are unambiguous
- [x] Compatibility policy is machine-checkable

**QA Scenarios**:
- Scenario: Publish creates immutable package version -> `.sisyphus/evidence/t12-publish-immutable.txt`
- Scenario: Incompatible engine version rejected -> `.sisyphus/evidence/t12-compat.txt`

**Commit**: `feat(shader-catalog): define package version contracts`

### T13: Catalog API + Storage/Indexing Blueprint

**Files to create**: `shared/src/effects-v2/catalog-api.ts`, `api/migrations/YYYYMMDD_shader_packages.sql`  
**Files for reference**: `api/src/trpc/routes/asset-system/generation-jobs.ts`, `api/src/trpc/routes/asset-system/themes.ts`, `api/src/trpc/routes/search.ts`, `api/schema.sql`, `api/migrations/20260203_asset_system_v3.sql`

**What to do**:
- Catalog API contracts: create draft, update draft, publish, list/search, fetch by id/version
- Query/filter fields: tags, scope compatibility, author, popularity, recency
- Deterministic sorting defaults and pagination shape
- DB schema extensions for shader packages and revisions
- R2 path conventions for shader artifacts
- Metadata indexing fields for search/ranking
- Moderation status fields, license metadata, ranking signals (non-transactional hooks)
- Runtime fetch policy: cache -> local mirror -> remote, with offline fallback
- Built-in node seeding: idempotent upsert by `slug + shaderVersion`
- Do NOT include runtime execution side effects in catalog APIs
- Do NOT allow opaque blob-only records without indexed fields

**Acceptance Criteria**:
- [x] API contract can represent full shader package lifecycle
- [x] Search responses are deterministic and filterable
- [x] Schema supports draft/published revisions and creator attribution
- [x] R2 layout supports immutable version fetch and local fallback sync
- [x] Moderation state transitions are deterministic and auditable
- [x] Runtime can resolve package by id/version with deterministic fallback order
- [x] Network/catalog outage does not break local execution for cached packages

**QA Scenarios**:
- Scenario: Catalog search by tags and compatibility -> `.sisyphus/evidence/t13-search.txt`
- Scenario: Publish endpoint rejects invalid draft state -> `.sisyphus/evidence/t13-publish-invalid.txt`
- Scenario: Schema migration supports shader package relations -> `.sisyphus/evidence/t13-schema.txt`
- Scenario: R2 key convention resolver deterministic -> `.sisyphus/evidence/t13-r2-keys.txt`
- Scenario: Moderation lifecycle transitions validated -> `.sisyphus/evidence/t13-moderation.txt`
- Scenario: Online fetch resolves package then caches locally -> `.sisyphus/evidence/t13-online-cache.txt`
- Scenario: Offline mode uses cached package fallback -> `.sisyphus/evidence/t13-offline-fallback.txt`

**Commit**: `feat(shader-catalog): add catalog api storage and indexing`

### T14: Documentation, Seeding, and Integration Validation

**Files to create**: `docs/effects-v2/architecture.md`, `docs/effects-v2/ai-authoring-playbook.md`, `shared/src/effects-v2/seeds/`  
**Files for reference**: `shared/src/effects/preset-library.ts`, `shared/src/effects/pipeline-serialization.ts`

**What to do**:
- Document v2 graph mental model, manifests, validation errors, lifecycle
- AI prompt templates and canonical graph examples for generation
- Troubleshooting matrix mapped to error codes
- Document v1 exclusions and future roadmap (visual editor deferred)
- Seed MVP 7 nodes into catalog as immutable system entries
- End-to-end integration: author -> save -> load -> execute roundtrip
- Define rollout gates and metrics per phase (A: runtime, B: authoring, C: catalog)
- Define explicit non-goals and escalation triggers for future commerce

**Acceptance Criteria**:
- [x] Docs include end-to-end authoring flow: AI-generated graph -> validation -> execution
- [x] Docs include troubleshooting matrix mapped to error codes
- [x] Example graph from docs validates and runs
- [x] AI prompt template produces valid graph
- [x] Each phase has explicit in/out scope, gate metrics, and failure fallback
- [x] Architecture clearly separates runtime from authoring/catalog concerns

**QA Scenarios**:
- Scenario: Example graph from docs validates and runs -> `.sisyphus/evidence/t14-doc-example.png`
- Scenario: AI prompt template produces valid graph -> `.sisyphus/evidence/t14-ai-template.txt`
- Scenario: End-to-end architecture conformance checklist -> `.sisyphus/evidence/t14-checklist.txt`
- Scenario: Negative gate test blocks premature phase promotion -> `.sisyphus/evidence/t14-gate-fail.txt`

**Commit**: `docs(effects-v2): add architecture playbook and seed library`

---

## 9. Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**  
> All verification must be agent-executed. No manual clicking/inspection.

### Test Framework

- Existing repo test stack: `pnpm test`, targeted workspace tests
- Tests-after implementation (unit + integration)
- Evidence artifacts under `.sisyphus/evidence/`

### Verification Commands

```bash
pnpm tsc --noEmit                    # TypeScript compilation
pnpm test                            # Full test suite
pnpm test --filter shared            # Targeted effects-v2 tests
```

### Per-Task QA

Every task includes at minimum:
- One happy-path scenario with evidence artifact
- One negative/error scenario with evidence artifact
- Concrete file path for evidence under `.sisyphus/evidence/`

---

## 10. Risk & Guardrails

| Risk | Mitigation |
|------|------------|
| Scope creep into visual editor | V1 OUT list is non-negotiable. Any editor work requires new plan. |
| AI hallucinating invalid effect IDs | Normalizer rejects unknown IDs against manifest registry. Structured error returned. |
| Feedback buffer corruption over long runs | 1000-frame stability test in T6. Deterministic init/swap policy. |
| Web/native bridge divergence | Identical type signatures enforced. Parity test suite in T8. |
| Performance regression on mobile | Budget enforcement at validation time (T3) AND runtime metrics (T11). |
| Legacy executor breakage | V2 is a new directory. Legacy executors are not modified. Migration adapter can run both in parallel. |
| Catalog coupling to runtime | Sealed runtime boundary - accepts only `CompiledPlan`. Catalog is a separate domain. |
| Non-deterministic compilation | Hash stability test (100 iterations) in T4. Stable tie-break by node ID. |

---

## 11. Agent Dispatch Summary

| Wave | Tasks | Category | Skills |
|------|-------|----------|--------|
| 1 | T1, T2, T3 | `unspecified-high` | `writing-plans`, `test-driven-development` |
| 2 | T4, T5, T6 | `ultrabrain` | `systematic-debugging` |
| 3 | T7, T8, T9 | `deep` | `game-authoring`, `systematic-debugging`, `git-master` |
| 4 | T10, T11, T12, T13, T14 | `unspecified-high` | `writing-plans`, `verification-before-completion` |

---

## Appendix A: Existing Codebase Inventory

### TypeScript Types (shared/)

| File | Contains | V2 Relationship |
|------|----------|-----------------|
| `shared/src/types/effects.ts` | `EffectType` (28 types), `EffectBase`, blend modes | Authoritative effect ID source for registry |
| `shared/src/types/effect-pipeline.ts` | `ShaderSource`, `EffectPassSpec`, `UniformDeclaration`, `QualityTier`, `PersistenceMode` | Reuse types; absorb pass model into v2 |
| `shared/src/types/multi-pass-effect.ts` | `MultiPassEffectSpec`, `BufferSpec`, `PassSpec` | Absorb buffer/reads/writes model into v2 resource graph |
| `shared/src/types/effect-snapshot.ts` | `PipelineSnapshot`, `PassSnapshot` | Extend for v2 graph identity hash |
| `shared/src/types/effect-budget.ts` | `PlatformTier`, `BUDGET_TIER_PRESETS`, `BudgetPolicy` | Reuse directly in v2 budget enforcement |

### Effects Logic (shared/)

| File | Contains |
|------|----------|
| `shared/src/effects/pipeline-validator.ts` | Error code patterns |
| `shared/src/effects/multi-pass-validator.ts` | Read/write resolution helpers |
| `shared/src/effects/budget-resolver.ts` | Platform tier enforcement |
| `shared/src/effects/preset-library.ts` | Preset grouping, tier patterns |
| `shared/src/effects/snapshot-manager.ts` | Compatibility validation |
| `shared/src/effects/pipeline-serialization.ts` | Serialization boundary |
| `shared/src/effects/legacy-adapter.ts` | V1 compatibility adapter |
| `shared/src/effects/rollout-gate.ts` | Feature gating |

### Godot Runtime

| File | Contains |
|------|----------|
| `godot_project/scripts/effects/PipelineExecutor.gd` | Sequential pass execution, `EFFECT_TYPE_TO_SHADER` |
| `godot_project/scripts/effects/MultiPassExecutor.gd` | Buffer graph, ping-pong warmup |
| `godot_project/scripts/effects/EffectsManager.gd` | Shader path caches, layer composition |
| `godot_project/scripts/effects/GameBridgeEffects.gd` | Subsystem creation pattern |
| `godot_project/shaders/sprite/*.gdshader` | 15 sprite shaders |
| `godot_project/shaders/post_process/*.gdshader` | 21 post-process shaders |
| `godot_project/shaders/include/noise.gdshaderinc` | Noise generator include |

### Bridge (app/)

| File | Contains |
|------|----------|
| `app/lib/godot/types.ts` | Bridge interface contracts |
| `app/lib/godot/GodotBridge.web.ts` | Web method wiring |
| `app/lib/godot/GodotBridge.native.ts` | Native dispatch |
| `app/lib/godot/GodotBridgeBase.ts` | Shared base class |

### API/Storage

| File | Contains |
|------|----------|
| `api/schema.sql` | Asset tables, r2_key patterns, metadata_json |
| `api/migrations/20260203_asset_system_v3.sql` | Latest asset-system structure |
| `api/src/ai/agent/artifact-manager.ts` | Version/publish artifact lifecycle |
| `api/src/agent/artifact-service.ts` | Publish-to-active semantics |

---

## Appendix B: Fusion Feasibility Reference

**Easy to fuse**: Pure color transforms, UV transforms with same sampling domain, chains with no feedback state.

**Hard/unsafe to fuse**: Ping-pong/history passes, passes with independent buffer lifetimes, heavy kernels where fusion increases register pressure.

**Architecture stance**: Fusion is an optimization backend, not the authoring model. Store each node with `fusible` flag. Compiler chooses per target: multi-pass execution graph (Mode A) or fused mega-shader where legally safe (Mode B). V1 ships Mode A only.

---

## Appendix C: Editor Random-Apply Flow (Future Reference)

1. Pull candidate effects by scope + budget from catalog
2. Exclude incompatible/state-conflicting effects via manifest constraints
3. Randomly select N effects (deterministic from seed + constraints)
4. Build ordered pass graph
5. Validate graph contracts
6. Snapshot previous state for one-click rollback
7. Apply to preview/runtime

Always: validate before apply, enforce budgets before apply, snapshot for rollback.
