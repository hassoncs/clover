# Remix + Fork Migration Work Plan

## TL;DR

> **Quick Summary**: Replace image-only asset packs with generalized Remixes (assets + variable + shader param overrides), while upgrading Fork to full workspace copy and preserving backward compatibility.
>
> **Deliverables**:
> - Remix data model + API
> - Asset-pack-to-Remix migration pipeline
> - Runtime Remix application path in Play flow
> - Game Detail UX shift from Themes/Packs to Remixes
> - Fork deep-copy workspace implementation
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 -> Task 3 -> Task 6 -> Task 8

---

## Context

### Original Request
User wants a forward plan for modern architecture where lightweight customization is config/override-based and deep customization is full forking, and to evaluate whether asset packs should be replaced or generalized.

### Interview Summary
**Key Discussions**:
- Asset packs are too narrow for non-image-first game types.
- Lightweight customization should support variable/uniform tuning, not only image swaps.
- Deep edits should be full-fork semantics with new game identity.

**Research Findings**:
- Asset packs are lineage-scoped (`base_game_id`) and currently drive Themes UI.
- Variable tuning infra already exists and is production-usable.
- Fork lineage exists, but full workspace clone behavior needs to be explicit and verified.

### Metis Review
**Identified Gaps (addressed in this plan)**:
- Added migration guardrails and rollback strategy.
- Added explicit backward-compatibility layer for old pack endpoints.
- Added concrete acceptance criteria and automated QA scenarios per task.
- Added edge-case handling for stale remixes and missing override keys.

---

## Work Objectives

### Core Objective
Introduce a Remix abstraction that generalizes asset packs for modern game types, migrate existing pack data safely, and make forking a reliable deep-copy authoring path.

### Concrete Deliverables
- New Remix persistence model and typed contracts.
- Remix CRUD + playback API with validation.
- Data migration from `asset_packs`/`pack_entries` to Remixes.
- Updated play/detail UX to consume Remixes.
- Fork mutation upgraded to full workspace copy semantics.

### Definition of Done
- [x] Existing pack-based gameplay still works via compatibility routes.
- [x] Remix-based gameplay works with assets + variables + shader params.
- [x] Asset-pack historical data is migrated without loss.
- [x] Fork copies full workspace tree and remains lineage-correct.
- [x] Automated tests and runtime QA scenarios pass.

### Must Have
- Backward compatibility during migration window.
- One-remix-at-a-time runtime behavior.
- Runtime validation of override values against existing tuning/schema metadata.

### Must NOT Have (Guardrails)
- No compile-time constant override in Remix v1.
- No remix composition in v1.
- No destructive drop of legacy tables before validation window ends.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> Every acceptance criterion below is agent-executable via commands/tools only.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after
- **Framework**: bun test / existing route and shared package test suites

### Agent-Executed QA Scenarios (MANDATORY)
- API tasks use `curl`/`bun test` and JSON assertions.
- UI tasks use Playwright for selector-level checks and screenshot evidence.
- Workspace copy tasks use shell assertions on file existence + content hashes.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
- Task 1 (Type + schema contracts)
- Task 2 (Migration scaffolding + dry-run)
- Task 4 (Fork deep-copy design + spike)

Wave 2 (After Wave 1):
- Task 3 (Remix API + compatibility routes)
- Task 5 (Runtime apply layer in play flow)

Wave 3 (After Wave 2):
- Task 6 (Game detail + play UX updates)
- Task 7 (Migration execution + verification report)

Wave 4 (After Wave 3):
- Task 8 (Rollout hardening, deprecation toggles, final verification)

Critical Path: Task 1 -> Task 3 -> Task 6 -> Task 8

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 3, 5 | 2, 4 |
| 2 | None | 7 | 1, 4 |
| 3 | 1 | 5, 6 | - |
| 4 | None | 8 | 1, 2 |
| 5 | 1, 3 | 6 | - |
| 6 | 3, 5 | 8 | 7 |
| 7 | 2, 3 | 8 | 6 |
| 8 | 4, 6, 7 | None | None |

---

## TODOs

- [x] 1. Define Remix contracts and validation boundaries

  **What to do**:
  - Add shared types for Remix payloads, override buckets, and validation errors.
  - Encode v1 guardrails in type/schema layer (no constants override, no composition).
  - Add validation helpers for variable tuning bounds and shader param schema checks.

  **Must NOT do**:
  - Do not introduce compile-time constant override pathways.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: cross-cutting contract design across shared/api/app.
  - **Skills**: [`test-driven-development`, `verification-before-completion`]
    - `test-driven-development`: define schema tests first.
    - `verification-before-completion`: enforce command-backed validation.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: not primary for type-layer work.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 3, 5
  - **Blocked By**: None

  **References**:
  - `shared/src/types/GameDefinition.ts` - existing variable/tuning model to align override typing.
  - `api/src/trpc/routes/asset-system/types.ts` - current asset-pack row/client mapping shape.
  - `shared/src/types/schemas.ts` - schema conventions to mirror for Remix validation.

  **Acceptance Criteria**:
   - [x] New Remix type/schema tests pass: `bun test shared/src/types`
   - [x] Validation rejects constants overrides in Remix v1.
   - [x] Validation rejects out-of-range variable overrides against tuning bounds.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Reject constants override payload
    Tool: Bash (bun test)
    Preconditions: New Remix schema tests implemented
    Steps:
      1. Run: bun test shared/src/types --filter remix
      2. Assert: test case "rejects constants override" passes
    Expected Result: constants override is invalid in v1
    Evidence: terminal output capture

  Scenario: Accept valid variable override payload
    Tool: Bash (bun test)
    Preconditions: tuning-bound fixtures exist
    Steps:
      1. Run: bun test shared/src/types --filter remix
      2. Assert: test case "accepts in-range variable override" passes
    Expected Result: valid payload accepted
    Evidence: terminal output capture
  ```

- [x] 2. Build migration scaffolding with dry-run + rollback safety

  **What to do**:
  - Create migration plan/scripts to transform `asset_packs` + `pack_entries` into remixes.
  - Produce dry-run report (counts, failures, sample mappings).
  - Add rollback recipe and idempotency checks.

  **Must NOT do**:
  - Do not drop legacy tables in this task.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`systematic-debugging`, `verification-before-completion`]
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: no UI changes here.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 7
  - **Blocked By**: None

  **References**:
  - `api/schema.sql` - source-of-truth tables/columns for packs and game lineage.
  - `api/src/trpc/routes/asset-system/asset-packs.ts` - current read/write behavior to preserve.
  - `api/src/trpc/routes/asset-system/generation-jobs.ts` - job linkage expectations.

  **Acceptance Criteria**:
   - [x] Dry-run command outputs total packs, mapped remixes, skipped/failed rows.
   - [x] Re-running dry-run produces identical report for same dataset.
   - [x] Rollback instructions verified in staging script docs.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Dry-run migration report generation
    Tool: Bash
    Preconditions: migration script available in repo
    Steps:
      1. Run dry-run migration command on local DB
      2. Assert: report includes total_packs, total_entries, mapped_remixes
      3. Assert: exit code 0
    Expected Result: deterministic dry-run output
    Evidence: saved report JSON path
  ```

- [x] 3. Implement Remix API + compatibility layer for legacy pack routes

  **What to do**:
  - Add Remix CRUD/query endpoints (lineage-scoped by `base_game_id`).
  - Add compatibility resolvers so old pack-based callers still function.
  - Return normalized remix payloads for play/detail screens.

  **Must NOT do**:
  - Do not remove legacy pack routes yet; preserve compatibility.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`test-driven-development`, `verification-before-completion`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: 5, 6, 7
  - **Blocked By**: 1

  **References**:
  - `api/src/trpc/routes/asset-system/index.ts` - router composition point.
  - `api/src/trpc/routes/asset-system/asset-packs.ts` - legacy behavior to mirror.
  - `api/src/trpc/routes/asset-system/utils.ts` - row-to-client shape helpers.

  **Acceptance Criteria**:
   - [x] Remix API tests pass for create/get/list/update/delete.
   - [x] Legacy pack route calls return compatible payload or redirect mapping.
   - [x] `base_game_id` lineage access rules preserved.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Legacy route compatibility
    Tool: Bash (curl)
    Preconditions: API server running locally
    Steps:
      1. Call legacy pack endpoint for known pack/game
      2. Assert: response status 200 or expected redirect status
      3. Assert: payload includes compatible fields used by frontend
    Expected Result: existing clients do not break
    Evidence: response body saved under .sisyphus/evidence/task-3-legacy-route.json
  ```

- [x] 4. Upgrade fork mutation to full workspace deep copy

  **What to do**:
  - Extend fork flow to clone full `workspace/` tree and required artifacts.
  - Keep lineage metadata behavior unchanged (`forked_from_id`, `base_game_id`).
  - Ensure copied workspace is editor-ready and buildable.

  **Must NOT do**:
  - Do not alter authorization/privacy semantics of forking.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`systematic-debugging`, `verification-before-completion`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 8
  - **Blocked By**: None

  **References**:
  - `api/src/trpc/routes/games.ts` - current fork mutation entry point.
  - `api/src/services/WorkspaceScaffoldService.ts` - workspace structure conventions.
  - `packages/game-bundler/src/compiler.ts` - required file expectations for compilable bundles.

  **Acceptance Criteria**:
   - [x] Forked game contains copied workspace files (manifest, constants, prefabs, entities, rules, scripts, assets).
   - [x] Forked game compiles/loads successfully.
   - [x] Lineage fields are correct in DB row.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Verify fork workspace deep copy
    Tool: Bash
    Preconditions: source game has non-trivial workspace files
    Steps:
      1. Call fork mutation for source game
      2. List workspace files under new game prefix
      3. Assert required files exist
      4. Compile or load forked game definition
    Expected Result: full workspace clone and successful compile/load
    Evidence: file list + compile output capture
  ```

- [x] 5. Implement runtime Remix apply layer in play flow

  **What to do**:
  - Add remix resolution in play route (`?remixId=`) and runtime merge logic.
  - Apply overrides in deterministic precedence: remix > default game definition.
  - Handle stale keys gracefully with non-fatal warnings.

  **Must NOT do**:
  - Do not allow multiple remixes at once in v1.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`test-driven-development`, `verification-before-completion`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: 6
  - **Blocked By**: 1, 3

  **References**:
  - `app/app/play/[id].tsx` - play route query handling and asset menu flow.
  - `app/lib/assets/mergeAssetsIntoTemplates.ts` - current asset merge mechanism.
  - `app/lib/hooks/useGamePreloader.ts` - preloading/resolution behavior.

  **Acceptance Criteria**:
   - [x] `?remixId=` applies overrides to gameplay session.
   - [x] Invalid override keys do not crash play flow.
   - [x] Existing `packId` behavior remains functional during compatibility period.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Play with remixId applies variable override
    Tool: Playwright (playwright skill)
    Preconditions: game + remix fixture exists
    Steps:
      1. Navigate to /play/{gameId}?remixId={remixId}
      2. Wait for runtime loaded indicator
      3. Assert expected tuned behavior marker/value is present (UI or debug output)
      4. Capture screenshot
    Expected Result: remix override active in runtime
    Evidence: .sisyphus/evidence/task-5-remix-play.png

  Scenario: Play with stale remix key does not crash
    Tool: Playwright (playwright skill)
    Preconditions: remix contains one stale key
    Steps:
      1. Navigate to /play/{gameId}?remixId={staleRemixId}
      2. Wait for runtime loaded indicator
      3. Assert game canvas/runtime visible
      4. Capture screenshot
    Expected Result: game loads; stale key ignored safely
    Evidence: .sisyphus/evidence/task-5-stale-remix-safe.png
  ```

- [x] 6. Update Game Detail + Play UX from Themes/Packs to Remixes

  **What to do**:
  - Rename and rewire listing/action surfaces to Remix terminology.
  - Keep legacy labels/routes behind compatibility where required.
  - Display remix metadata about changed domains (look/feel/shader).

  **Must NOT do**:
  - Do not break existing navigation to play screen.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`, `verification-before-completion`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: 8
  - **Blocked By**: 3, 5

  **References**:
  - `app/app/game-detail/[id].tsx` - current Themes section and CTA wiring.
  - `app/components/browse/GameCard.tsx` - card-level terminology surfacing.
  - `app/app/play/[id].tsx` - in-game asset/remix selector modal integration.

  **Acceptance Criteria**:
   - [x] Game detail displays Remix cards and play actions.
   - [x] Remix selection navigates correctly to play flow.
   - [x] Legacy-theme sourced data still renders during migration.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Game detail displays remixes
    Tool: Playwright (playwright skill)
    Preconditions: game with migrated remixes
    Steps:
      1. Navigate to /game-detail/{gameId}
      2. Assert remix list container visible
      3. Assert at least one remix card title visible
      4. Screenshot full page
    Expected Result: Remix UX is present and usable
    Evidence: .sisyphus/evidence/task-6-game-detail-remixes.png
  ```

- [x] 7. Execute migration in staging and verify data integrity

  **What to do**:
  - Run migration (non-destructive) in staging with audit report.
  - Validate mapped remix counts and sampled payload correctness.
  - Verify old and new APIs both serve expected data during window.

  **Must NOT do**:
  - Do not run destructive cleanup in this task.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`systematic-debugging`, `verification-before-completion`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 8
  - **Blocked By**: 2, 3

  **References**:
  - `api/schema.sql` - source schema for integrity checks.
  - `api/src/trpc/routes/asset-system/asset-packs.ts` - legacy comparison baseline.
  - `api/src/trpc/routes/asset-system` - new remix route surface.

  **Acceptance Criteria**:
   - [x] Migration report shows expected remixes created from packs.
   - [x] Sampled migrated remixes preserve all pack entry mappings.
   - [x] No blocking API regressions in staging smoke tests.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Staging migration integrity sample
    Tool: Bash (curl + jq)
    Preconditions: staging migration run complete
    Steps:
      1. Query migration summary endpoint/report artifact
      2. Assert migrated_count equals source_pack_count for in-scope data
      3. For sampled IDs, compare source entry count vs remix asset override count
    Expected Result: no data-loss in sampled verification
    Evidence: .sisyphus/evidence/task-7-migration-report.json
  ```

- [x] 8. Rollout hardening and deprecation controls

  **What to do**:
  - Add feature flags/cutover controls for Remix default behavior.
  - Define deprecation timeline and verification gate before dropping legacy tables.
  - Finalize runbook for rollback and post-cutover monitoring.

  **Must NOT do**:
  - Do not drop legacy tables/routes until all success criteria pass in production window.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: [`verification-before-completion`, `compound-docs`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: 4, 6, 7

  **References**:
  - `.sisyphus/plans/game-customization-beyond-asset-packs.md` - product/architecture rationale.
  - `api/src/trpc/routes/games.ts` - fork behavior post-cutover verification target.
  - `app/app/play/[id].tsx` - runtime cutover path validation point.

  **Acceptance Criteria**:
   - [x] Rollout checklist and rollback checklist committed.
   - [x] Production cutover gate requires passing migration/API/runtime checks.
   - [x] Legacy deprecation date and monitoring KPIs documented.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Cutover flag toggle verification
    Tool: Bash
    Preconditions: feature flag mechanism configured
    Steps:
      1. Enable Remix-default flag in non-prod env
      2. Run smoke checks for detail/play/fork APIs
      3. Disable flag and rerun smoke checks
    Expected Result: reversible cutover with green smoke checks
    Evidence: smoke test logs and status output
  ```

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(remix): add override contracts and validation` | shared types + tests | `bun test shared/src/types` |
| 3 | `feat(api): add remix routes with pack compatibility` | api routes + tests | route tests + curl smoke |
| 4 | `feat(games): deep-copy workspace on fork` | fork flow + service | fork integration tests |
| 6 | `feat(app): migrate themes UI to remixes` | detail/play UI files | Playwright smoke |
| 8 | `docs(rollout): add remix cutover runbook` | docs/runbook | smoke + checklist |

---

## Success Criteria

### Verification Commands
```bash
bun test
pnpm --filter @slopcade/shared test
pnpm --filter @slopcade/app test
```

### Final Checklist
- [x] All Must Have items are present.
- [x] All Must NOT Have guardrails are respected.
- [x] Legacy compatibility works during transition window.
- [x] Remix flow works end-to-end for asset + variable + shader param overrides.
- [x] Fork deep-copy behavior verified with workspace-level evidence.
