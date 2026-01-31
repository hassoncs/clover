# Slopcade Architecture Fixes (5) — Implementation Plan

## Context

### User request summary
Deliver a detailed, ordered implementation plan for 5 approved architectural fixes across Godot (GDScript) and TypeScript.

### Constraints (hard requirements)
- Each fix independently deployable (no mid-stream breaking changes).
- Maintain backward compatibility during migration.
- Tests must pass after each fix.
- TypeScript: verify with `pnpm tsc --noEmit` (or per-package `tsc --noEmit`).
- Godot: project loads without errors (use existing DevMux Godot automation + headless export/smoke where possible).

### Relevant codebase observations (from repo scan)
- `godot_project/scripts/GameBridge.gd` already contains periodic transform sync:
  - Registers `getAllTransforms` handler and supports `onTransformSync` callback.
  - `_physics_process` runs a timer and calls `_notify_transform_sync()`.
  - There is also a `godot_project/scripts/bridge/SyncSystem.gd` that calls `_game_bridge.get_all_transforms()` and sends to JS callback.
- Godot-side coordinate helpers exist in two places:
  - `godot_project/scripts/bridge/CoordinateUtils.gd` (static helpers).
  - `GameBridge.gd` currently has helper functions delegating to `pixels_per_meter` and Y flip.
  - Other modules already call `CoordinateUtils.*` (e.g., `scripts/physics/PhysicsController.gd`, `scripts/physics/PhysicsQueries.gd`).
- A GDScript `EntityFactory` already exists at `godot_project/scripts/entity/EntityFactory.gd` and includes template merge and collider handling.
- TypeScript `GodotBridge.web.ts` exposes `onTransformSync` and `setWatchConfig()`, plus query APIs like `screenToWorld()` and `queryAABB()`.
- TypeScript `EntityManager.ts` already has:
  - `entitiesByTagId` index.
  - AABB support via `getEntitiesInAABB()` (backed by `physics.queryAABB`).
  - Deprecated fallback from `physics.shape` to `collider.shape` (and other fields) with deprecation warnings.
- There is a conversion script: `scripts/convert-entity-components.mjs`.

### Assumptions (explicit)
- “Tests must pass” means (authoritative):
  - `pnpm test`
  - `pnpm tsc --noEmit`
  (both run at repo root)
- “Godot project loads without errors” means:
  - Godot DevMux watcher builds without errors
  - `pnpm web` can load a representative test game without bridge-related runtime errors

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| 1. Baseline inventory + verification harness | None | Establish current contracts, test commands, and rollback points before refactors |
| 2. Fix 1: Module boundary design + file placement decision | 1 | Need verified current responsibilities and existing module landscape |
| 3. Fix 1: Split `GameBridge.gd` into modules (non-behavioral refactor) | 2 | Requires settled boundaries and where code will live |
| 4. Fix 1: Compatibility shims + no-op behavioral guardrails | 3 | Ensure “thin orchestrator” still exposes old methods/signals |
| 5. Fix 3: Coordinate centralization spec (Godot + TS contract) | 1 | Must align units/axes/rounding with current behavior |
| 6. Fix 3: Implement/introduce `CoordinateMapper.gd` + TS `coordinateUtils.ts` behind compatibility layer | 5 | Implementation follows agreed contract |
| 7. Fix 3: Round-trip test suite for conversions | 6 | Tests depend on concrete implementations |
| 8. Fix 2: Transform sync protocol design (events/on-demand/tracked) | 1 | Need current event shapes + consumers identified |
| 9. Fix 2: Godot-side implementation (events include transforms, query APIs, tracked sync) with backwards compatibility | 8, 3 | Easier/safer after bridge is modularized |
| 10. Fix 2: TypeScript bridge updates (web + native) with fallback support | 9 | TS must match Godot protocol |
| 11. Fix 4: Add `EntityManager.query()` API + indexes | 1 | Requires understanding of existing indexes + runtime entity shape |
| 12. Fix 4: Add tests for `EntityManager.query()` | 11 | Tests depend on the API |
| 13. Fix 5: Run conversion script + update remaining call sites | 1 | Must establish baseline + plan for staged compatibility |
| 14. Fix 5: Remove deprecated `physics.shape` fallback paths + eliminate warnings | 13 | Only safe after repo is migrated |
| 15. Integration sweep + final verification + documentation notes | 4, 7, 10, 12, 14 | Final step requires all fixes landed and green |

---

## Parallel Execution Graph

Wave 1 (Start immediately):
├── Task 1: Baseline inventory + verification harness
└── Task 5: Coordinate centralization spec (can start once Task 1 produces baseline; in practice can begin in parallel with partial information)

Wave 2 (After Wave 1 completes):
├── Task 2: Fix 1 boundary design
├── Task 8: Fix 2 transform sync protocol design
└── Task 11: Fix 4 query API design + indexing plan

Wave 3 (After Wave 2 completes):
├── Task 3: Split GameBridge into modules (refactor)
├── Task 6: Introduce CoordinateMapper + TS utils (behind compat)
└── Task 13: Run conversion script (prepare Fix 5)

Wave 4 (After Wave 3 completes):
├── Task 4: Compatibility shims + guardrails
├── Task 7: Coordinate round-trip tests
├── Task 9: Godot transform sync implementation
└── Task 12: EntityManager.query tests

Wave 5 (After Wave 4 completes):
├── Task 10: TS bridge updates for transform sync
└── Task 14: Remove deprecated physics.shape fallback paths

Wave 6 (Final):
└── Task 15: Integration sweep + final verification + docs

Critical Path (likely): Task 1 → Task 2 → Task 3 → Task 9 → Task 10 → Task 15
Estimated Parallel Speedup: ~25–40% vs fully sequential (main bottleneck is cross-bridge protocol work).

---

## Tasks

### Task 1: Baseline inventory + verification harness
**Description**: Lock down current behavior and define “green” verification steps used after every fix.

**Files to create/modify**:
- (Create) `docs/refactoring/slopcade-architecture-fixes-baseline.md` (optional but recommended) with:
  - Current bridge message methods/events list
  - Transform sync payload shape
  - Coordinate conversion expectations (Y flip, units)
  - Where deprecation warnings originate

**Delegation Recommendation**:
- Category: `ultrabrain` — cross-system inventory + risk control
- Skills: [`slopcade-godot-bridge`, `slopcade-game-engine`, `systematic-debugging`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-godot-bridge`: needed to reason about GameBridge ↔ TS protocol and Godot scripts
- ✅ INCLUDED `slopcade-game-engine`: needed to reason about EntityManager and runtime expectations
- ✅ INCLUDED `systematic-debugging`: needed to identify consumers and failure modes without breaking compat
- ❌ OMITTED `agent-browser` / `dev-browser`: not needed for inventory; can be used later for smoke checks
- ❌ OMITTED `frontend-ui-ux`: no UI work
- ❌ OMITTED `git-master`: useful for committing but not for baseline analysis itself
- ❌ OMITTED `test-driven-development`: tests are relevant later; this is discovery + harness definition
- ❌ OMITTED `typescript-programmer` / `python-programmer` / `svelte-programmer` / `golang-tui-programmer` / `python-debugger` / `data-scientist` / `prompt-engineer`: not applicable (and some may not be installed)

**Depends On**: None

**Acceptance Criteria**:
- [ ] Defined standard verification commands (run after each fix):
  - `pnpm test` → PASS
  - `pnpm tsc --noEmit` → PASS
  - Godot: DevMux watcher shows no errors + `pnpm web` loads at least one test game without bridge-related console errors
- [ ] Documented current transform sync frequency and payload shape (source references included).
- [ ] Documented current coordinate conversion behavior (with a couple of numerical examples).

---

### Task 2: Fix 1 — Module boundary design + reconcile with existing modules
**Description**: Decide exact module locations and boundaries, reconciling with existing `EntityFactory.gd` and `CoordinateUtils.gd`.

**Files to create/modify**:
- (Create) `docs/refactoring/gamebridge-module-split.md` defining:
  - Public API surface of `GameBridge.gd` (must remain stable)
  - Responsibilities for each module:
    - `EntityFactory.gd` (use existing or move/rename)
    - `PhysicsAdapter.gd`
    - `EventEmitter.gd`
    - `CoordinateMapper.gd` (see Fix 3)
    - `GameBridge.gd` orchestrator
  - State ownership (who owns `entities`, `templates`, id maps)
  - Module init lifecycle and dependency injection pattern

**Delegation Recommendation**:
- Category: `ultrabrain` — architecture boundary decisions
- Skills: [`slopcade-godot-bridge`, `systematic-debugging`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-godot-bridge`: module split is inside Godot bridge system
- ✅ INCLUDED `systematic-debugging`: avoid missing hidden couplings in the 1500+ LOC file
- ❌ OMITTED others (same rationale as Task 1)

**Depends On**: Task 1

**Acceptance Criteria**:
- [ ] Written boundary doc includes explicit “IN/OUT” for each module.
- [ ] Decision recorded: reuse existing `godot_project/scripts/entity/EntityFactory.gd` vs relocate to `godot_project/scripts/bridge/EntityFactory.gd` (and whether to keep the path stable).
- [ ] No behavioral changes planned in Task 3 beyond refactor.

---

### Task 3: Fix 1 — Split `GameBridge.gd` into focused modules (refactor, no behavior change)
**Description**: Extract code from `godot_project/scripts/GameBridge.gd` into focused modules, keeping `GameBridge` as orchestrator and preserving API.

**Files to create/modify** (expected):
- (Modify) `godot_project/scripts/GameBridge.gd` — becomes thin orchestrator.
- (Create/Modify) `godot_project/scripts/bridge/EventEmitter.gd` — unify collision/spawn/destroy/sensor/input event emission and JS callback plumbing.
- (Create/Modify) `godot_project/scripts/bridge/PhysicsAdapter.gd` — velocity/force/impulse methods; sensor velocity handling.
- (Reuse/Modify) `godot_project/scripts/entity/EntityFactory.gd` — entity creation + template resolution; remove duplicate conversion helpers later.
- (Modify) `godot_project/scripts/bridge/SyncSystem.gd` — either replaced or turned into tracked-entity sync helper (Fix 2).

**Backward compatibility strategy**:
- `GameBridge.gd` keeps all existing callable methods/signals and delegates internally.
- Keep old method names and argument order. Any new APIs are additive.

**Delegation Recommendation**:
- Category: `unspecified-high` — large refactor, medium risk
- Skills: [`slopcade-godot-bridge`, `systematic-debugging`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-godot-bridge`: required for Godot-side patterns and message plumbing
- ✅ INCLUDED `systematic-debugging`: refactor safety
- ❌ OMITTED others (UI/TS not primary here)

**Depends On**: Task 2

**Acceptance Criteria**:
- [ ] `GameBridge.gd` stays the autoload entrypoint and project loads.
- [ ] Existing calls from TS (`GodotBridge.web.ts` / native) still work unchanged.
- [ ] No change in event delivery semantics (collision/spawn/destroy/sensor/input) compared to baseline.
- [ ] Run verification commands (from Task 1) and they pass.

---

### Task 4: Fix 1 — Add compatibility shims + guardrails
**Description**: Add explicit guardrails so refactor remains safe and independently deployable.

**Files to create/modify**:
- (Modify) `godot_project/scripts/GameBridge.gd` and extracted modules:
  - Centralize “public API” wrappers in orchestrator
  - Add internal assertions/logging toggles behind a debug flag

**Delegation Recommendation**:
- Category: `unspecified-low` — small changes but safety-critical
- Skills: [`slopcade-godot-bridge`, `systematic-debugging`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-godot-bridge`
- ✅ INCLUDED `systematic-debugging`
- ❌ OMITTED others

**Depends On**: Task 3

**Acceptance Criteria**:
- [ ] Orchestrator exposes a single “compat mode” switch if needed (default ON during migration).
- [ ] Any new modules are “internal only” (not relied on by TS directly).
- [ ] Verification commands pass.

---

### Task 5: Fix 3 — Coordinate centralization contract (Godot + TS)
**Description**: Define the single authoritative conversion contract, including rounding/precision policy.

**Files to create/modify**:
- (Modify/Create) `docs/godot/COORDINATE_SYSTEM_GUIDE.md` add explicit “bridge contract” section.
- (Create) `docs/refactoring/coordinate-mapper-contract.md` with:
  - Inputs/outputs and coordinate spaces
  - `pixelsPerMeter` semantics
  - sign conventions (Y flip)
  - camera/viewport involvement (if any)
  - numeric examples (round trip)

**Delegation Recommendation**:
- Category: `ultrabrain` — contract must be precise
- Skills: [`slopcade-godot-bridge`, `slopcade-game-engine`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-godot-bridge`: Godot coordinate semantics
- ✅ INCLUDED `slopcade-game-engine`: TS camera/viewport systems touch conversion
- ❌ OMITTED others

**Depends On**: Task 1

**Acceptance Criteria**:
- [ ] Contract explicitly states which conversions are “game ↔ godot” vs “world ↔ screen”.
- [ ] Contract chooses a precision tolerance for tests (e.g., epsilon).
- [ ] Contract lists all call sites to migrate (at least: `GameBridge.gd`, `EntityFactory.gd`, `PhysicsController.gd`, TS debug bridge conversions).

---

### Task 6: Fix 3 — Introduce `CoordinateMapper.gd` + TypeScript `coordinateUtils.ts` (compat-first)
**Description**: Implement centralized coordinate conversion while keeping existing helpers working.

**Files to create/modify**:
- (Create) `godot_project/scripts/bridge/CoordinateMapper.gd` (authoritative, non-static, injected with `pixels_per_meter`).
- (Modify) `godot_project/scripts/bridge/CoordinateUtils.gd` to either:
  - delegate to `CoordinateMapper` (if possible), or
  - remain as legacy static wrappers while call sites move.
- (Create) `app/lib/godot/coordinateUtils.ts` — TS authoritative helpers.
- (Modify) TS call sites to use new TS utils where appropriate:
  - `app/lib/godot/debug/GodotDebugBridge.ts`
  - Any runtime or editor conversion helpers identified in Task 5

**Delegation Recommendation**:
- Category: `unspecified-high` — cross-language API change (compat-first)
- Skills: [`slopcade-godot-bridge`, `slopcade-game-engine`, `test-driven-development`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-godot-bridge`: implement Godot mapper
- ✅ INCLUDED `slopcade-game-engine`: update TS-side conversion usage
- ✅ INCLUDED `test-driven-development`: because Task 7 depends on accurate tests
- ❌ OMITTED others

**Depends On**: Task 5

**Acceptance Criteria**:
- [ ] No behavior change: existing conversions yield same results within tolerance.
- [ ] TS compilation passes: `pnpm tsc --noEmit`.
- [ ] Verification commands pass.

---

### Task 7: Fix 3 — Round-trip test suite (Godot ↔ TS consistency)
**Description**: Add tests that ensure the Godot and TS implementations match for a matrix of inputs.

**Files to create/modify**:
- (Create) `app/lib/godot/__tests__/coordinateUtils.test.ts` (or nearest existing test pattern).
- (Optionally Create) a small fixture or golden data file for coordinate cases.

**Test approach**:
- Use deterministic cases (including negatives, large values, non-integer ppm).
- Validate `world → godot → world` and `vec` conversions.

**Delegation Recommendation**:
- Category: `unspecified-high` — correctness-critical
- Skills: [`test-driven-development`, `slopcade-game-engine`]

**Skills Evaluation**:
- ✅ INCLUDED `test-driven-development`
- ✅ INCLUDED `slopcade-game-engine`
- ❌ OMITTED others

**Depends On**: Task 6

**Acceptance Criteria**:
- [ ] Test suite runs under existing runner (Vitest) and passes.
- [ ] Epsilon tolerance documented and justified.
- [ ] `pnpm test` passes.

---

### Task 8: Fix 2 — Transform sync protocol design (event-driven + on-demand + tracked)
**Description**: Define the new transform sync protocol:
- Event-driven: spawn/destroy/collision payloads include needed transform(s).
- On-demand: TS can request transform(s) for specific entity IDs.
- Tracked entities: TS can register a watch list; Godot only syncs those (optionally on interval).

**Files to create/modify**:
- (Create) `docs/refactoring/transform-sync-protocol.md` specifying:
  - Message names / handlers in Godot
  - Payload schemas (including entityId, position, rotation, velocity if needed)
  - Backward compat: keep `onTransformSync` and `getAllTransforms` working during migration
  - Deletion policy: when old paths can be removed

**Delegation Recommendation**:
- Category: `ultrabrain` — protocol design across runtime boundaries
- Skills: [`slopcade-godot-bridge`, `slopcade-game-engine`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-godot-bridge`
- ✅ INCLUDED `slopcade-game-engine`
- ❌ OMITTED others

**Depends On**: Task 1

**Acceptance Criteria**:
- [ ] Protocol defines additive new APIs and deprecation timeline.
- [ ] Protocol specifies default behavior (e.g., tracked sync OFF by default, event-driven always ON).

---

### Task 9: Fix 2 — Godot implementation (event transforms + on-demand queries + tracked sync)
**Description**: Implement the protocol in Godot while preserving old callbacks.

**Files to create/modify**:
- (Modify) `godot_project/scripts/GameBridge.gd` (or new modules from Fix 1):
  - Include transforms in existing emitted events (spawn/destroy/collision/sensor/input as needed)
  - Add query handlers:
    - `getTransform(entityId)`
    - `getTransforms(entityIds[])`
  - Add tracked sync handlers:
    - `setTrackedEntities(entityIds[])` OR reuse existing `setWatchConfig()` plumbing
  - Default: do not emit all transforms every frame.
- (Modify) `godot_project/scripts/bridge/SyncSystem.gd` to support tracked-only sync.
- (Modify) `godot_project/scripts/entity/EntityManager.gd` if it owns transform extraction.

**Backward compatibility strategy**:
- Keep `getAllTransforms` and `onTransformSync` (full map) behind a config flag for rollback.

**Delegation Recommendation**:
- Category: `unspecified-high` — behavior-affecting change, must be careful
- Skills: [`slopcade-godot-bridge`, `systematic-debugging`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-godot-bridge`
- ✅ INCLUDED `systematic-debugging`
- ❌ OMITTED others

**Depends On**: Task 8, Task 3

**Acceptance Criteria**:
- [ ] Event payloads include transforms without breaking existing TS listeners.
- [ ] On-demand transform queries return correct results.
- [ ] Tracked sync only emits tracked entities (when enabled).
- [ ] Old full-sync path can be re-enabled via config for rollback.
- [ ] Verification commands pass.

---

### Task 10: Fix 2 — TypeScript bridge updates (web + native)
**Description**: Update TS bridge to consume new protocol while keeping compatibility.

**Files to create/modify**:
- (Modify) `app/lib/godot/GodotBridge.web.ts`
- (Modify) `app/lib/godot/GodotBridge.native.ts`
- (Modify) `app/lib/godot/types.ts` (add new methods/types)
- (Modify) `app/lib/godot/createGodotBridge.web.ts` / `.native.ts` if initialization needs updated watch config defaults

**Backward compatibility strategy**:
- Keep existing `onTransformSync()` API but change default behavior:
  - If new protocol available: use tracked sync.
  - If not: fallback to legacy full sync.
- Keep `setWatchConfig()` as the primary way to opt into tracked sync.

**Delegation Recommendation**:
- Category: `unspecified-high` — cross-platform TS changes
- Skills: [`slopcade-godot-bridge`, `test-driven-development`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-godot-bridge`
- ✅ INCLUDED `test-driven-development`
- ❌ OMITTED `vercel-react-best-practices`: not a UI perf task; mostly protocol and types
- ❌ OMITTED others

**Depends On**: Task 9

**Acceptance Criteria**:
- [ ] `pnpm tsc --noEmit` passes.
- [ ] Transform consumption works in web and native paths.
- [ ] Legacy fallback works if Godot side doesn’t support new methods.
- [ ] Verification commands pass.

---

### Task 11: Fix 4 — Add lightweight query API to `EntityManager`
**Description**: Add `query({ tags?, template?, has?: ComponentName[], withinAabb? })` returning matching entity IDs.

**Files to create/modify**:
- (Modify) `app/lib/game-engine/EntityManager.ts`
- (Possibly Modify) `app/lib/game-engine/types.ts` to define `ComponentName` or reuse an existing union.

**Implementation notes**:
- Use existing `entitiesByTagId` when tags are present.
- For `withinAabb`, reuse `getEntitiesInAABB()` to prefilter, then apply other filters.
- `has` should check presence of runtime components (e.g., `entity.collider`, `entity.bodyId`, `entity.sprite`, etc.) with a single, centralized mapping.

**Delegation Recommendation**:
- Category: `unspecified-low` — contained TS change
- Skills: [`slopcade-game-engine`, `test-driven-development`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-game-engine`
- ✅ INCLUDED `test-driven-development`
- ❌ OMITTED others

**Depends On**: Task 1

**Acceptance Criteria**:
- [ ] `query()` supports all requested selectors.
- [ ] No performance regressions for tag-only queries (must continue using indexes).
- [ ] `pnpm tsc --noEmit` passes.

---

### Task 12: Fix 4 — Tests for `EntityManager.query()`
**Description**: Add unit tests for combinations of filters and edge cases.

**Files to create/modify**:
- (Create) `app/lib/game-engine/__tests__/EntityManager.query.test.ts` (or match existing test placement conventions).

**Delegation Recommendation**:
- Category: `unspecified-low`
- Skills: [`test-driven-development`, `slopcade-game-engine`]

**Skills Evaluation**:
- ✅ INCLUDED `test-driven-development`
- ✅ INCLUDED `slopcade-game-engine`
- ❌ OMITTED others

**Depends On**: Task 11

**Acceptance Criteria**:
- [ ] Tests cover:
  - tags only
  - template only
  - has only
  - withinAabb only
  - combinations (including empty results)
- [ ] `pnpm test` passes.

---

### Task 13: Fix 5 — Run conversion script + update remaining games/examples
**Description**: Execute the existing migration script and then manually fix remaining stragglers.

**Files to create/modify**:
- (Modify) Files touched by `scripts/convert-entity-components.mjs` across:
  - `app/lib/test-games/**`
  - `app/app/examples/**`
  - any other game/example definitions still using `physics.shape` fields

**Delegation Recommendation**:
- Category: `unspecified-high` — potentially many files, mechanical edits
- Skills: [`slopcade-game-engine`, `systematic-debugging`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-game-engine`
- ✅ INCLUDED `systematic-debugging`
- ❌ OMITTED others

**Depends On**: Task 1

**Acceptance Criteria**:
- [ ] Repo compiles and tests pass after conversion.
- [ ] Deprecation warnings count reduced substantially (ideally 0, but may require Task 14).

---

### Task 14: Fix 5 — Remove deprecated `physics.shape` fallback paths
**Description**: Remove dual code paths and deprecation warnings, enforcing `collider` as source of truth.

**Files to create/modify**:
- (Modify) `app/lib/game-engine/EntityManager.ts`:
  - Remove fallback reads from `(physics as any)?.shape/width/height/radius/vertices`.
  - Replace with strict `collider` requirements and clear errors.
- (Modify) any validators/docs that still mention `physics.shape` as supported.

**Delegation Recommendation**:
- Category: `unspecified-high` — correctness + breaking-risk if migration incomplete
- Skills: [`slopcade-game-engine`, `systematic-debugging`, `test-driven-development`]

**Skills Evaluation**:
- ✅ INCLUDED `slopcade-game-engine`
- ✅ INCLUDED `systematic-debugging`
- ✅ INCLUDED `test-driven-development`
- ❌ OMITTED others

**Depends On**: Task 13

**Acceptance Criteria**:
- [ ] No deprecation warnings remain for `physics.shape` usage.
- [ ] `pnpm test` and `pnpm tsc --noEmit` pass.
- [ ] At least one representative test game and one example runs.

---

### Task 15: Integration sweep + final verification + documentation notes
**Description**: Final cross-system verification, plus minimal docs updates so future work doesn’t reintroduce old patterns.

**Files to create/modify**:
- (Modify) `docs/game-engine-architecture/INPUT_EVENT_FLOW.md` or other bridge docs if protocol changed.
- (Modify) `docs/physics-system-guide.md` / migration guides to reflect completed collider migration.

**Delegation Recommendation**:
- Category: `unspecified-high`
- Skills: [`systematic-debugging`, `slopcade-godot-bridge`, `slopcade-game-engine`]

**Skills Evaluation**:
- ✅ INCLUDED `systematic-debugging`
- ✅ INCLUDED `slopcade-godot-bridge`
- ✅ INCLUDED `slopcade-game-engine`
- ❌ OMITTED others

**Depends On**: Task 4, Task 7, Task 10, Task 12, Task 14

**Acceptance Criteria**:
- [ ] `pnpm test` → PASS
- [ ] `pnpm tsc --noEmit` → PASS
- [ ] `pnpm web` → can load a test game and interact; no bridge-related runtime errors
- [ ] Godot watcher/service shows no build errors
- [ ] All 5 fixes are independently deployable (each has its own commit group and can be reverted cleanly)

---

## Commit Strategy

Goal: each fix lands as a revertable unit, without breaking intermediate states.

Recommended commit groups:
1. `refactor(godot): split GameBridge into modules (no behavior change)` (Fix 1)
2. `refactor(coords): centralize coordinate conversion + tests` (Fix 3)
3. `perf(bridge): event-driven + tracked transform sync (compat preserved)` (Fix 2)
4. `feat(entity): add EntityManager.query selectors + tests` (Fix 4)
5. `refactor(collider): complete physics.shape → collider migration` (Fix 5)

Each commit group must pass:
- `pnpm test`
- `pnpm tsc --noEmit`

## Risk Assessment

### Highest risks
1. **Transform sync changes (Fix 2)** — risk of desync, subtle timing differences, native/web divergence.
2. **Collider migration completion (Fix 5)** — risk of runtime errors if any remaining entities rely on `physics.shape` fallback.
3. **Large refactor of `GameBridge.gd` (Fix 1)** — risk of breaking reflection/JS bridge binding or missing handler registration.

### Mitigations
- Keep legacy paths behind config flags (rollback switch).
- Add additive APIs first; switch defaults later.
- Ensure at least one representative game/example is used as an end-to-end smoke test after each fix.
- For Fix 1, keep “public API surface” centralized in orchestrator to avoid accidental signature changes.

## Rollback Strategy

- **Fix 1 rollback**: revert commit group 1; since it’s intended to be non-behavioral, revert should be safe.
- **Fix 3 rollback**: keep old helpers (`CoordinateUtils.gd`, existing TS conversions) intact until new tests pass; revert group 2 restores previous call sites.
- **Fix 2 rollback**: default to legacy `onTransformSync` full-sync; keep config flag to re-enable full sync instantly.
- **Fix 4 rollback**: removing `query()` should not impact runtime if it’s additive; revert group 4.
- **Fix 5 rollback**: revert group 5 if any runtime regressions occur; keep conversion script changes in same group for atomic revert.

---

## Success Criteria

- All five fixes shipped with no intermediate breakage.
- No `physics.shape` deprecation warnings remain.
- Transform sync no longer sends all transforms every physics frame by default.
- Coordinate conversion is centralized and protected by round-trip tests.
- `EntityManager.query()` exists, is tested, and is used where appropriate.
