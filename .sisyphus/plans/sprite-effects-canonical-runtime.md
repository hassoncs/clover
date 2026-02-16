# Canonical Sprite Effects Runtime (Prefab/Entity + Script API)

## TL;DR

> **Quick Summary**: Replace fragmented per-entity effect paths with one canonical sprite-effects model: declarative prefab/entity effect specs plus script-driven overrides, executed through the existing `applySpriteEffect` runtime and cache pipeline.
>
> **Deliverables**:
> - One canonical authoring API for sprite-level effects in definitions
> - One runtime dispatcher that evaluates effect states and diffs apply/update/clear operations
> - Legacy `effects.entityEffects` path removed from code and content
> - New tests for the canonical path; obsolete legacy tests removed
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 -> Task 2 -> Task 3 -> Task 5 -> Task 6 -> Task 8

---

## Context

### Original Request
Plan the proper long-term way to do per-prefab/per-entity shader effects so game authors can easily apply effects declaratively or from script APIs, with one clean performant path and no legacy dual systems.

### Interview Summary
**Key Discussions**:
- User wants a single canonical API and runtime path, not multiple overlapping effect systems.
- User explicitly chose forward-only design (V0), including removal of legacy effect code paths.
- User requires author ergonomics for both declarative definitions and script-sandbox/runtime APIs.
- Test strategy: write new tests for the new system as needed; do not preserve old-system tests by default.

**Research Findings**:
- `GameLoader.applyEffects` currently applies `effects.entityEffects` via per-entity bridge calls (`app/lib/game-engine/GameLoader.ts`).
- `SpriteEffectBehavior` and conditional behavior types exist, and game content uses them (`shared/src/types/behavior.ts`, `r2/games/ballSort/definition.json`, `r2/games/gemCrush/definition.json`).
- Godot runtime already has robust sprite effect execution + material caching (`godot_project/scripts/bridge/GameBridgeEffects.gd`).
- Current runtime has no canonical conditional/state evaluator for sprite effects.

### Metis Review
**Identified Gaps (addressed in this plan)**:
- Missing explicit boundary between sprite-level entity effects and graph/post-process effects.
- Missing migration inventory and legacy deletion path.
- Missing acceptance criteria for effect lifecycle (spawn/update/tag changes/entity destroy).
- Missing edge-case handling (state transitions, cache invalidation, cleanup on destroy).

---

## Work Objectives

### Core Objective
Deliver one canonical sprite-effects architecture that is easy for authors, performant at runtime, and free of legacy per-entity wiring paths.

### Concrete Deliverables
- Canonical schema for declarative sprite effects at prefab/entity level.
- Runtime system that resolves active effects and issues bridge `apply/update/clear` diffs.
- Script sandbox API for effect apply/update/clear.
- Removal of legacy `GameDefinition.effects.entityEffects` code path and related content usage.
- New automated tests and agent-executed QA scenarios for canonical behavior.

### Definition of Done
- [ ] No runtime references to `effects.entityEffects` remain in canonical load/apply paths.
- [ ] Declarative prefab effects and script API both apply effects through the same runtime dispatcher.
- [ ] Effect lifecycle works for spawn, tag/state transitions, param updates, and entity destruction.
- [ ] New tests for canonical path pass.
- [ ] Legacy-path tests removed or replaced.

### Must Have
- Single source of truth for sprite-level effects (no dual pathways).
- Explicit ownership: TS resolves effect state; Godot applies/caches materials.
- Forward-only API with migration completed in-repo.

### Must NOT Have (Guardrails)
- No new compatibility shim for `effects.entityEffects`.
- No graph/post-process architecture refactor in this scope.
- No second parallel effect API for the same use case.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan are verifiable without manual human testing.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (new-system tests as needed)
- **Framework**: Vitest (+ existing headless bridge E2E harness), GDUnit4 where needed

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

Each task includes concrete agent-executable scenarios using Bash/Playwright/interactive_bash as appropriate.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
- Task 1: Canonical API + boundary spec
- Task 4: Script API surface design draft (depends only on Task 1 references)

Wave 2 (After Wave 1):
- Task 2: Shared type/schema changes
- Task 3: Runtime dispatcher + effect-state evaluator
- Task 5: Godot metadata/lifecycle integration

Wave 3 (After Wave 2):
- Task 6: Remove legacy paths + migrate game content
- Task 7: Tests + legacy test cleanup
- Task 8: Docs + final validation

Critical Path: 1 -> 2 -> 3 -> 5 -> 6 -> 8

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 2,3,4,5 | 4 |
| 2 | 1 | 3,6,7 | 5 |
| 3 | 2 | 6,7 | 5 |
| 4 | 1 | 3,7 | 2 |
| 5 | 1 | 6,7 | 2,3 |
| 6 | 3,5 | 8 | 7 |
| 7 | 2,3,4,5 | 8 | 6 |
| 8 | 6,7 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|--------------------|
| 1 | 1,4 | `task(category="unspecified-high", load_skills=["effects-system","game-authoring"])` |
| 2 | 2,3,5 | `task(category="deep", load_skills=["effects-system","bridge-development","testing-patterns"])` |
| 3 | 6,7,8 | `task(category="unspecified-high", load_skills=["game-authoring","testing-patterns","compound-docs"])` |

---

## TODOs

- [ ] 1. Finalize canonical sprite-effects contract (single pathway)

  **What to do**:
  - Define one canonical declarative shape for prefab/entity sprite effects (base effects + state/condition effects + params).
  - Define explicit boundary: sprite effects are per-entity/per-prefab; graph effects are post-process/multi-pass.
  - Define effect precedence and merge rules (prefab defaults, entity overrides, script overrides).
  - Define canonical param conventions (including color normalization rules) at schema boundary.
  - Define rule that effect-state groups contain sprite effects only (non-effect behaviors stay in their own systems).

  **Must NOT do**:
  - Do not keep `effects.entityEffects` as a canonical option.
  - Do not add a second competing authoring API.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: architecture decision with cross-layer impact.
  - **Skills**: `effects-system`, `game-authoring`
    - `effects-system`: boundary with graph/post-process architecture.
    - `game-authoring`: author-facing schema ergonomics in game definitions.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 4)
  - **Blocks**: 2,3,4,5
  - **Blocked By**: None

  **References**:
  - `shared/src/types/GameDefinition.ts:570` - Current legacy `effects` envelope including `entityEffects` to be de-scoped.
  - `shared/src/types/behavior.ts:274` - Existing sprite effect vocabulary and params.
  - `docs/effects/EFFECTS_ARCHITECTURE.md:5` - Graph pipeline scope; keep out of per-entity sprite API.

  **Acceptance Criteria**:
  - [ ] Canonical schema documented in plan notes and mapped to concrete TS type targets.
  - [ ] Precedence/merge rules explicitly defined with no ambiguity.
  - [ ] Boundary statement added: per-entity sprite vs graph/post-process.
  - [ ] Parameter conventions explicitly define color representation and conversion behavior.
  - [ ] Validation rule defined for non-effect behaviors in effect-state groups.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Schema decision consistency check
    Tool: Bash
    Preconditions: Plan branch checked out
    Steps:
      1. Search for canonical schema symbol in changed files.
      2. Assert exactly one canonical schema definition exists.
      3. Assert no conflicting parallel schema names are introduced.
    Expected Result: One authoritative schema path only.
    Evidence: grep output capture in .sisyphus/evidence/task-1-schema-consistency.txt
  ```

- [ ] 2. Implement shared type/schema changes for canonical API

  **What to do**:
  - Add canonical sprite-effects fields/types in shared entity/game types.
  - Remove `effects.entityEffects` from canonical type definitions.
  - Ensure script-authoring types expose effect APIs and data contracts.

  **Must NOT do**:
  - Do not leave type-level legacy aliases that keep dual pathways alive.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `effects-system`, `game-authoring`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 5)
  - **Blocks**: 3,6,7
  - **Blocked By**: 1

  **References**:
  - `shared/src/types/GameDefinition.ts:528` - GameDefinition root contract.
  - `shared/src/types/entity.ts:105` - Prefab/entity contract extension point.
  - `shared/src/scripting/script-authoring-types.ts` - Script API type surface to align.

  **Acceptance Criteria**:
  - [ ] Canonical sprite-effect types compile with `pnpm tsc --noEmit`.
  - [ ] No `entityEffects` type field remains in shared source contracts.
  - [ ] Script-facing types expose canonical effect operations.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Type contract validation
    Tool: Bash
    Preconditions: Type changes applied
    Steps:
      1. Run: pnpm tsc --noEmit
      2. Assert exit code 0
      3. Search shared types for "entityEffects" usage
      4. Assert zero matches in canonical type files
    Expected Result: Type-safe canonical schema and no legacy field in contracts.
    Evidence: .sisyphus/evidence/task-2-tsc.txt
  ```

- [ ] 3. Build runtime sprite-effect dispatcher (state evaluator + diff apply/update/clear)

  **What to do**:
  - Add TS runtime system that computes desired effects per entity from canonical declarative state + script overrides.
  - Evaluate state conditions (tag/expr per contract) and choose active set.
  - Diff current vs desired set and call bridge `applySpriteEffect`, `updateSpriteEffectParam`, `clearSpriteEffect`.

  **Must NOT do**:
  - Do not route per-entity effects through graph executor paths.
  - Do not perform per-frame full reapply; use event/state diffing.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `effects-system`, `bridge-development`, `input-handling`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 5)
  - **Blocks**: 6,7
  - **Blocked By**: 2

  **References**:
  - `app/lib/godot/types.ts:538` - Canonical bridge sprite-effect operations.
  - `app/lib/game-engine/systems/runner/wrappers/` - Runtime system integration pattern.
  - `app/lib/game-engine/EntityManager.ts:355` - Tag query/access path.

  **Acceptance Criteria**:
  - [ ] Dispatcher computes deterministic active effect set per entity.
  - [ ] Bridge calls occur only on diffs (apply/update/clear), not brute-force every tick.
  - [ ] Entity teardown clears active effects and runtime state.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Tag-driven effect activation and deactivation
    Tool: Bash (headless bridge test)
    Preconditions: Test harness can spawn entity and mutate tags
    Steps:
      1. Spawn entity with canonical conditional effect state rule for tag "held".
      2. Add tag "held".
      3. Assert bridge call log contains applySpriteEffect(entityId,...).
      4. Remove tag "held".
      5. Assert bridge call log contains clearSpriteEffect(entityId).
    Expected Result: Effect activates/deactivates through one dispatcher path.
    Evidence: .sisyphus/evidence/task-3-tag-dispatch.txt
  ```

- [ ] 4. Expose script-sandbox effect API on the same canonical pathway

  **What to do**:
  - Add script runtime operations for apply/update/clear sprite effects.
  - Ensure script API feeds the same dispatcher/runtime state model used by declarative effects.
  - Add clear documentation for script usage semantics.

  **Must NOT do**:
  - Do not create separate script-only effect engine.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `game-authoring`, `bridge-development`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (design), Wave 2 (implementation with Task 3)
  - **Blocks**: 7
  - **Blocked By**: 1

  **References**:
  - `shared/src/scripting/script-authoring-types.ts` - script API contracts.
  - `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts:1383` - script context capability pattern.

  **Acceptance Criteria**:
  - [ ] Scripts can apply/update/clear sprite effects without bypassing dispatcher.
  - [ ] Script operations participate in same conflict/precedence rules as declarative effects.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Script-driven effect apply and clear
    Tool: Bash (runtime test)
    Preconditions: Script sandbox test fixture entity exists
    Steps:
      1. Execute script operation to apply glow effect to target entity.
      2. Assert dispatcher state includes script override entry.
      3. Execute script clear operation.
      4. Assert bridge clearSpriteEffect called and override removed.
    Expected Result: Script path reuses canonical dispatcher.
    Evidence: .sisyphus/evidence/task-4-script-api.txt
  ```

- [ ] 5. Integrate Godot-side metadata/lifecycle hooks for canonical state model

  **What to do**:
  - Ensure entity creation path persists needed canonical effect metadata (if runtime reads via bridge/entity meta).
  - Ensure entity destroy/reset paths clean up materials/effect records safely.
  - Confirm effect cache behavior remains correct under canonical dispatcher usage.

  **Must NOT do**:
  - Do not introduce a second material cache path.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `godot-engine`, `bridge-development`, `effects-system`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 2/3)
  - **Blocks**: 6,7
  - **Blocked By**: 1

  **References**:
  - `godot_project/scripts/entity/EntityFactory.gd:137` - entity metadata write path.
  - `godot_project/scripts/bridge/GameBridgeEffects.gd:432` - sprite effect apply/clear/cache lifecycle.
  - `godot_project/scripts/physics/CollisionSystem.gd:160` - current behavior processing limitation.

  **Acceptance Criteria**:
  - [ ] Entity lifecycle does not leak sprite materials/effect entries.
  - [ ] Destroyed entities have no residual effect state in Godot caches.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Entity destroy cleanup
    Tool: Bash (headless Godot bridge test)
    Preconditions: Entity with active effect exists
    Steps:
      1. Apply effect to entity.
      2. Destroy entity through runtime path.
      3. Query effect registry/cache diagnostics.
      4. Assert entity no longer present in effect maps.
    Expected Result: Cleanup complete, no stale refs.
    Evidence: .sisyphus/evidence/task-5-destroy-cleanup.txt
  ```

- [ ] 6. Remove legacy path and migrate game content to canonical model

  **What to do**:
  - Remove `GameLoader` legacy `entityEffects` application path.
  - Migrate existing game definitions/content that rely on legacy path into canonical schema.
  - Remove legacy references in supporting utilities and validation code where applicable.

  **Must NOT do**:
  - Do not leave dead fallback branches or commented legacy code.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `game-authoring`, `game-package`, `effects-system`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 7)
  - **Blocks**: 8
  - **Blocked By**: 3,5

  **References**:
  - `app/lib/game-engine/GameLoader.ts:274` - legacy `entityEffects` loop removal target.
  - `r2/games/shaderMulti/effects.json` - legacy mapping examples to migrate.
  - `r2/games/shaderRainbow/effects.json` - legacy mapping examples to migrate.

  **Acceptance Criteria**:
  - [ ] No runtime usage of `definition.effects.entityEffects` remains.
  - [ ] Migrated games load and apply equivalent intended effects through canonical path.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Legacy path eradication and migration validation
    Tool: Bash
    Preconditions: Migration changes applied
    Steps:
      1. Search runtime code for "entityEffects" references.
      2. Assert no canonical runtime call sites remain.
      3. Run game build/compile for migrated games.
      4. Assert build succeeds and generated definitions include canonical effect fields.
    Expected Result: Legacy path removed; migrated content compiles.
    Evidence: .sisyphus/evidence/task-6-migration.txt
  ```

- [ ] 7. Add new-system automated tests and remove obsolete legacy tests

  **What to do**:
  - Add unit/integration tests for canonical dispatcher and effect-state resolution.
  - Add bridge/headless tests for apply/update/clear lifecycle and cleanup.
  - Remove/replace tests that validate removed legacy pathways.

  **Must NOT do**:
  - Do not port legacy tests verbatim if they encode removed architecture.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `testing-patterns`, `bridge-development`, `effects-system`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 6)
  - **Blocks**: 8
  - **Blocked By**: 2,3,4,5

  **References**:
  - `app/lib/godot/__tests__/effects-bridge.test.ts` - existing effect bridge test style.
  - `tests/e2e/bridge/bridge.test.ts` - headless bridge integration harness.
  - `.github/workflows/bridge-contract.yml` - CI constraints to preserve.

  **Acceptance Criteria**:
  - [ ] New canonical effect tests pass in local test commands.
  - [ ] Legacy-only tests are removed/replaced and suite remains green.
  - [ ] CI-relevant checks (`tsc`, bridge contract checks) pass.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Canonical test suite execution
    Tool: Bash
    Preconditions: New tests and cleanup complete
    Steps:
      1. Run targeted canonical effect tests.
      2. Run bridge/headless effects integration tests.
      3. Run pnpm tsc --noEmit.
      4. Assert all commands exit 0.
    Expected Result: New-system test baseline green.
    Evidence: .sisyphus/evidence/task-7-tests.txt
  ```

- [ ] 8. Documentation + final validation + cleanup

  **What to do**:
  - Update effect authoring docs for canonical API (declarative + script examples).
  - Add concise migration notes and examples for contributors.
  - Run final verification matrix and prepare completion notes.

  **Must NOT do**:
  - Do not leave stale docs describing removed legacy paths.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `compound-docs`, `effects-system`, `game-authoring`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential final task
  - **Blocks**: None
  - **Blocked By**: 6,7

  **References**:
  - `docs/effects/EFFECTS_ARCHITECTURE.md` - update scope guidance and canonical authoring references.
  - `.claude/skills/effects-system.md` - keep skill guidance aligned with new canonical path.

  **Acceptance Criteria**:
  - [ ] Docs describe one canonical pathway and script/declarative usage.
  - [ ] No references remain to removed legacy path as valid approach.
  - [ ] Final verification commands all pass.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Final verification sweep
    Tool: Bash
    Preconditions: All implementation tasks complete
    Steps:
      1. Run full affected test set.
      2. Run typecheck.
      3. Search docs/code for deprecated legacy guidance.
      4. Assert zero unexpected legacy references.
    Expected Result: Code and docs aligned to canonical path.
    Evidence: .sisyphus/evidence/task-8-final-verification.txt
  ```

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 2 | `refactor(effects): define canonical sprite effect schema` | shared types + script types | `pnpm tsc --noEmit` |
| 3/5 | `feat(effects): add canonical sprite effect runtime dispatcher` | runtime + bridge integration | targeted tests |
| 6 | `refactor(effects): remove legacy entityEffects path` | loader + game content | build + migration checks |
| 7/8 | `test/docs(effects): validate canonical flow and update docs` | tests + docs | test suite + typecheck |

---

## Success Criteria

### Verification Commands
```bash
pnpm tsc --noEmit
pnpm test
pnpm test:bridge
```

### Final Checklist
- [ ] All Must Have items present
- [ ] All Must NOT Have items absent
- [ ] Canonical sprite-effect API works from declarative and script surfaces
- [ ] Legacy entityEffects path removed from runtime and docs
- [ ] New-system tests pass
