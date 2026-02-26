g # Template and Content Name Unification

## TL;DR

> **Quick Summary**: Unify party game naming so `templateId` (mechanic) and `contentType` (content schema) are canonical, generic, and brand-agnostic; move all brand naming to presentation metadata only.
>
> **Deliverables**:
> - Canonical taxonomy + normalized identifiers across API/runtime/content pipeline
> - Data migration for legacy `wager/history` usage and alias cleanup
> - Removal of `amen-*`/legacy mapping paths and compatibility shims
> - Verified no-regression rollout for Amen + Slopbox + Slopcade
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: T1 -> T6 -> T8 -> T12 -> T15 -> T16 -> T17

---

## Context

### Original Request

Align naming so mechanic templates and content pipeline names are clean and generic, remove legacy mappings, and make each brand a thin presentation layer that only renames titles.

### Interview Summary

**Key Discussions**:
- Template naming confusion currently exists between mechanic IDs, content types, and legacy brand-prefixed game types.
- Desired architecture: generic templates + generic content types + brand-specific title overlay.
- User explicitly requested removing legacy mapping and avoiding tech debt.
- Test strategy selected: **Tests-after**.

**Research Findings**:
- `shared/src/schema/party-content.ts` defines canonical `ContentType` values.
- `api/src/party/templates/registry.ts` exposes 20 mechanic templates with `party.contentPacks` links.
- Legacy mapping exists in `api/src/party/content-generation/prompts.ts` (`LEGACY_BRAND_GAME_TYPES`).
- Alias handling exists in `api/src/trpc/routes/party-content.ts` (`FILENAME_TO_CONTENT_TYPE`, brand prefix stripping).
- `year-jinx` currently references `wager`, while canonical type is `estimation`.

### Metis Review

**Identified Gaps (addressed in this plan):**
- Need strict boundaries between `templateId`, `contentType`, and brand-facing title.
- Need explicit rollback and compatibility window sequencing.
- Need protection for R2 audio keys that embed content type path segments.
- Need stronger regression checks on DO persistence and websocket shared state.

### Coexistence With `app-split-plan.md`

- This plan is designed to run in parallel with app-split work because it is primarily API/content-pipeline/data focused.
- Shared-risk zone: party API contracts and template IDs consumed by app shells.
- Constraint added: keep `templateId` values stable during app-split; only unify content naming in this rollout.

---

## Work Objectives

### Core Objective

Ship a canonical naming model where all runtime/template/content systems use stable generic identifiers and no legacy aliasing remains.

### Concrete Deliverables

- Unified identifier model documented and implemented (`templateId`, `contentType`, `brandTitle`).
- `party_content.content_type` normalized away from legacy `wager/history` semantics.
- No runtime dependency on `amen-*` game types or brand-prefixed storage game types.
- Brand-specific game naming isolated to presentation metadata/routes only.

### Definition of Done

- [ ] `grep -R "LEGACY_BRAND_GAME_TYPES" api packages shared` returns no matches.
- [ ] `SELECT DISTINCT content_type FROM party_content` has no legacy out-of-model values.
- [ ] Amen + Slopbox + Slopcade can host party templates using canonical content types.
- [ ] All verification commands in this plan pass.

### Must Have

- Canonical and enforceable naming taxonomy.
- Zero unresolved alias branches after migration window.
- Backward-safe migration path with explicit compatibility and deprecation steps.

### Must NOT Have (Guardrails)

- No new dual naming schemes introduced.
- No permanent fallback aliases left in runtime.
- No brand-specific content type IDs.
- No manual/human-only acceptance criteria.
- No `templateId` renames during active app-split migration; only content-type unification in this rollout.

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — all verification is agent-executed.

### Test Decision

- **Infrastructure exists**: YES
- **Automated tests**: Tests-after
- **Framework**: Vitest + Turborepo (`pnpm test`)

### QA Policy

Every task includes agent-executed QA scenarios and evidence outputs.

- **API/Backend**: Bash (`pnpm`, `vitest`, `curl`, SQL checks)
- **Runtime/DO**: Vitest integration tests in `api/src/party/**`
- **Evidence Path**: `.sisyphus/evidence/task-{N}-{scenario}.{ext}`

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Foundation + contracts):
- T1 Taxonomy contract and canonical ID table
- T2 Template-to-content mapping inventory and deltas
- T3 API contract inventory and change list
- T4 Data migration spec + rollback spec
- T5 Verification harness setup and baseline snapshots

Wave 2 (Compatibility + data normalization):
- T6 Canonical ContentType source-of-truth wiring
- T7 Runtime compatibility window (dual-read + compatibility guard)
- T8 DB backfill for legacy content type records
- T9 Template definition updates (`contentPacks`) to canonical names
- T10 Generation config convergence (`wager/history` -> canonical)

Wave 3 (Legacy removal + enforcement):
- T11 R2 audio path compatibility/migration for renamed content keys
- T12 Remove legacy brand-game mapping and prefixed storage types
- T13 Remove alias extractors and filename special-casing
- T14 Enforce canonical validation in tRPC/content routes + scripts

Wave 4 (Regression + rollout closure):
- T15 Update tests and add missing safety tests
- T16 End-to-end verification across brands and cleanup dead code/docs

Wave 5 (Post app-split closure):
- T17 Final cleanup pass after `app-split-plan.md` completion

Wave FINAL (Independent review, parallel):
- F1 Plan compliance audit
- F2 Code quality review
- F3 Real manual QA execution by agent
- F4 Scope fidelity check

### Dependency Matrix

- **T1**: blocked by none -> blocks T6,T12
- **T2**: blocked by none -> blocks T9,T16
- **T3**: blocked by none -> blocks T14,T16
- **T4**: blocked by none -> blocks T7,T8
- **T5**: blocked by none -> blocks T15
- **T6**: blocked by T1 -> blocks T7,T10,T14
- **T7**: blocked by T4,T6 -> blocks T8,T12
- **T8**: blocked by T4,T7 -> blocks T13,T16
- **T9**: blocked by T2 -> blocks T16
- **T10**: blocked by T6 -> blocks T12,T14
- **T11**: blocked by T6,T8 -> blocks T16
- **T12**: blocked by T1,T7,T10 -> blocks T13,T15
- **T13**: blocked by T8,T12 -> blocks T14,T16
- **T14**: blocked by T3,T6,T10,T13 -> blocks T15,T16
- **T15**: blocked by T5,T12,T14 -> blocks T16
- **T16**: blocked by T2,T3,T8,T9,T11,T13,T14,T15 -> blocks T17
- **T17**: blocked by T16 and app-split exit criteria complete (`.sisyphus/plans/app-split-plan.md` items 40-43) -> blocks FINAL wave

### Agent Dispatch Summary

- **Wave 1 (5 tasks)**: T1/T3 -> `deep`, T2/T5 -> `quick`, T4 -> `unspecified-high`
- **Wave 2 (5 tasks)**: T6/T7/T10 -> `unspecified-high`, T8 -> `deep`, T9 -> `quick`
- **Wave 3 (4 tasks)**: T11/T14 -> `unspecified-high`, T12 -> `deep`, T13 -> `quick`
- **Wave 4 (2 tasks)**: T15 -> `deep`, T16 -> `unspecified-high`
- **Wave 5 (1 task)**: T17 -> `unspecified-high`
- **FINAL (4 tasks)**: F1 -> `oracle`, F2 -> `unspecified-high`, F3 -> `unspecified-high`, F4 -> `deep`

---

## TODOs

- [ ] 1. Define canonical naming contract (`templateId`, `contentType`, `brandTitle`)

  **What to do**:
  - Create a canonical mapping table from all 20 party template IDs to approved content types.
  - Freeze naming boundaries in one shared contract document/module consumed by API + pipeline.

  **Must NOT do**:
  - Do not add brand-specific IDs to canonical model.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: contract definition affects multiple subsystems.
  - **Skills**: `workspace-system`, `game-authoring`
    - `workspace-system`: track cross-package references safely.
    - `game-authoring`: align mechanic semantics with template behavior.
  - **Skills Evaluated but Omitted**:
    - `economy-engine`: no domain overlap.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T4, T5)
  - **Blocks**: T6, T12
  - **Blocked By**: None

  **References**:
  - `api/src/party/templates/registry.ts` - authoritative template IDs and runtime registry.
  - `shared/src/schema/party-content.ts` - authoritative content type schema.
  - `api/src/party/content/prompt-loader.ts` - runtime content type usage and duplication to resolve.

  **Acceptance Criteria**:
  - [ ] Canonical mapping table includes all 20 templates and approved content types.
  - [ ] No ambiguous mappings remain.

  **QA Scenarios**:
  ```text
  Scenario: Canonical map completeness
    Tool: Bash
    Preconditions: mapping table committed in plan/spec
    Steps:
      1. Compare registry template IDs against mapping table entries.
      2. Assert counts match exactly (20 == 20).
    Expected Result: 1:1 coverage with zero unmapped templates.
    Evidence: .sisyphus/evidence/task-1-map-completeness.txt

  Scenario: Invalid canonical entry rejection
    Tool: Bash
    Preconditions: validation script/test exists
    Steps:
      1. Inject temporary invalid content type token in test fixture.
      2. Run validation test.
    Expected Result: Test fails with explicit invalid token error.
    Evidence: .sisyphus/evidence/task-1-invalid-reject.txt
  ```

  **Commit**: NO

- [ ] 2. Audit and finalize template-to-content mapping deltas

  **What to do**:
  - Confirm each `r2/games/party/*/definition.json` `contentPacks` entry uses canonical content type.
  - Produce exact rename/change set (notably `year-jinx: wager -> estimation`).

  **Must NOT do**:
  - Do not alter gameplay logic while renaming identifiers.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: deterministic inventory and manifest updates.
  - **Skills**: `game-package`, `game-validation`
  - **Skills Evaluated but Omitted**:
    - `asset-pack-generation`: irrelevant.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T9, T16
  - **Blocked By**: None

  **References**:
  - `r2/games/party/year-jinx/definition.json` - current non-canonical `wager` use.
  - `r2/games/party/quickfire-qa/definition.json` - canonical example (`trivia`).

  **Acceptance Criteria**:
  - [ ] Delta list for all non-canonical `contentPacks` finalized.

  **QA Scenarios**:
  ```text
  Scenario: Manifest contentPack validation
    Tool: Bash
    Steps:
      1. Parse all `r2/games/party/*/definition.json` files.
      2. Assert every content pack token is in canonical ContentType set.
    Expected Result: Zero invalid content pack names.
    Evidence: .sisyphus/evidence/task-2-manifest-validate.txt

  Scenario: Regression check for empty-pack templates
    Tool: Bash
    Steps:
      1. Verify templates intentionally using empty arrays remain unchanged (`rival-roster`, `shirt-clash`).
      2. Assert no accidental non-empty injections.
    Expected Result: Intentional empty-pack templates preserved.
    Evidence: .sisyphus/evidence/task-2-empty-pack-regression.txt
  ```

  **Commit**: NO

- [ ] 3. Inventory API and client contracts exposing these identifiers

  **What to do**:
  - Enumerate all request/response fields exposing template/content names.
  - Lock migration impact list for `party-content`, `party-templates`, `PartyRoomDO` shared data.

  **Must NOT do**:
  - Do not silently break wire field names without explicit migration step.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `agent-orchestration`, `editor-system`
  - **Skills Evaluated but Omitted**:
    - `physics`: unrelated.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T14, T16
  - **Blocked By**: None

  **References**:
  - `api/src/trpc/routes/party-content.ts` - `gameType` and `contentType` exposure.
  - `api/src/trpc/routes/party-templates.ts` - `content_pack` and template metadata.
  - `api/src/party/PartyRoomDO.ts` - shared data payload and persistence keys.

  **Acceptance Criteria**:
  - [ ] Contract matrix includes all changed fields and consumer surfaces.

  **QA Scenarios**:
  ```text
  Scenario: Contract surface enumeration
    Tool: Bash
    Steps:
      1. Search API routes and DO code for `template`, `gameType`, `contentType`, `gameTemplate`.
      2. Match each occurrence to matrix entry.
    Expected Result: 100% of occurrences mapped to migration plan.
    Evidence: .sisyphus/evidence/task-3-contract-matrix.txt

  Scenario: Unmapped field detection
    Tool: Bash
    Steps:
      1. Run script that fails on unmatched contract fields.
      2. Validate non-zero exit on missing matrix row.
    Expected Result: Detection works before rollout.
    Evidence: .sisyphus/evidence/task-3-unmapped-detect.txt
  ```

  **Commit**: NO

- [ ] 4. Design and stage SQL/data migration with rollback

  **What to do**:
  - Create migration for `party_content.content_type` normalization (`wager/history -> estimation`).
  - Define rollback query and pre/post validation SQL.

  **Must NOT do**:
  - Do not run production mutation before compatibility guard (T7).

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `storage-ops`, `testing-patterns`
  - **Skills Evaluated but Omitted**:
    - `sound-generation`: unrelated.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T7, T8
  - **Blocked By**: None

  **References**:
  - `shared/src/schema/party-content.ts` - DB schema contract.
  - `api/migrations/20260218_party_content_schema.sql` - prior migration style and constraints.

  **Acceptance Criteria**:
  - [ ] Migration and rollback SQL reviewed and executable in staging.

  **QA Scenarios**:
  ```text
  Scenario: Staging dry-run backfill
    Tool: Bash
    Steps:
      1. Snapshot counts by content_type.
      2. Execute migration in staging DB.
      3. Re-snapshot and compare expected shifts.
    Expected Result: only target rows move to `estimation`.
    Evidence: .sisyphus/evidence/task-4-staging-backfill.txt

  Scenario: Rollback validation
    Tool: Bash
    Steps:
      1. Execute rollback SQL in disposable DB copy.
      2. Verify pre-migration counts are restored.
    Expected Result: rollback fully restores original distribution.
    Evidence: .sisyphus/evidence/task-4-rollback.txt
  ```

  **Commit**: YES
  - Message: `refactor(party-content): add canonical content type migration`
  - Files: `api/migrations/*`, migration docs
  - Pre-commit: `pnpm test --filter @slopcade/api`

- [ ] 5. Establish baseline verification harness and snapshots

  **What to do**:
  - Capture baseline outputs for template registry, content counts, and API responses before rename.
  - Create repeatable verification scripts used in T15/T16.

  **Must NOT do**:
  - Do not hardcode environment-specific IDs in assertions.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `testing-patterns`, `workspace-system`
  - **Skills Evaluated but Omitted**:
    - `effects-system`: unrelated.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T15
  - **Blocked By**: None

  **References**:
  - `api/src/party/templates/__tests__/test-helpers.ts` - template registry setup.
  - `api/src/party/__tests__/party-routes.test.ts` - route-level verification patterns.

  **Acceptance Criteria**:
  - [ ] Baseline snapshot artifacts are committed under `.sisyphus/evidence/`.

  **QA Scenarios**:
  ```text
  Scenario: Baseline capture run
    Tool: Bash
    Steps:
      1. Execute snapshot script suite.
      2. Confirm all expected artifact files created.
    Expected Result: complete baseline bundle exists.
    Evidence: .sisyphus/evidence/task-5-baseline-capture.txt

  Scenario: Snapshot drift detection
    Tool: Bash
    Steps:
      1. Intentionally alter one fixture.
      2. Run comparison script.
    Expected Result: script fails with clear diff output.
    Evidence: .sisyphus/evidence/task-5-drift-detect.txt
  ```

  **Commit**: YES
  - Message: `test(party): add baseline verification harness for naming migration`
  - Files: test/snapshot scripts + fixtures
  - Pre-commit: `pnpm test --filter @slopcade/api`

- [ ] 6. Centralize canonical ContentType source-of-truth

  **What to do**:
  - Remove duplicate content type unions and import from shared schema where possible.
  - Ensure API runtime and pipeline validation use one canonical enum source.

  **Must NOT do**:
  - Do not keep shadow enums that can diverge.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `storage-ops`, `testing-patterns`
  - **Skills Evaluated but Omitted**:
    - `godot-engine`: unrelated.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (critical prerequisite)
  - **Blocks**: T7, T10, T14
  - **Blocked By**: T1

  **References**:
  - `shared/src/schema/party-content.ts` - canonical enum.
  - `api/src/party/content/prompt-loader.ts` - duplicate union to eliminate.
  - `api/src/trpc/routes/party-content.ts` - local duplicated list.

  **Acceptance Criteria**:
  - [ ] Single canonical type list drives compile-time and runtime checks.

  **QA Scenarios**:
  ```text
  Scenario: Compile-time sync check
    Tool: Bash
    Steps:
      1. Run `pnpm build:types`.
      2. Assert no type divergence errors.
    Expected Result: type build passes.
    Evidence: .sisyphus/evidence/task-6-type-sync.txt

  Scenario: Runtime enum mismatch guard
    Tool: Bash
    Steps:
      1. Call route with invalid content type token.
      2. Assert validation error references canonical list.
    Expected Result: invalid token rejected deterministically.
    Evidence: .sisyphus/evidence/task-6-runtime-guard.txt
  ```

  **Commit**: YES
  - Message: `refactor(party-content): centralize canonical content type definitions`
  - Files: shared schema + API consumers
  - Pre-commit: `pnpm build:types && pnpm test --filter @slopcade/api`

- [ ] 7. Add short compatibility window (dual-read path)

  **What to do**:
  - Add temporary fallback read for migrated content types during rollout window.
  - Log fallback hits to confirm safe removal timing.

  **Must NOT do**:
  - Do not leave fallback without explicit removal task/date.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `agent-orchestration`, `testing-patterns`
  - **Skills Evaluated but Omitted**:
    - `sound-generation`: unrelated.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: T8, T12
  - **Blocked By**: T4, T6

  **References**:
  - `api/src/party/content/prompt-loader.ts` - DB content loading path.
  - `api/src/party/templates/registry.ts` - content load entrypoint per template.

  **Acceptance Criteria**:
  - [ ] Fallback only triggers when primary canonical type has no data.
  - [ ] Fallback telemetry can be queried.

  **QA Scenarios**:
  ```text
  Scenario: Primary read success path
    Tool: Bash
    Steps:
      1. Seed canonical `estimation` rows.
      2. Run template start path for `year-jinx`.
    Expected Result: no fallback hit; game starts.
    Evidence: .sisyphus/evidence/task-7-primary-read.txt

  Scenario: Fallback hit path
    Tool: Bash
    Steps:
      1. Remove canonical rows and leave legacy rows in staging fixture.
      2. Run same template start.
    Expected Result: fallback hit logged and start succeeds.
    Evidence: .sisyphus/evidence/task-7-fallback-hit.txt
  ```

  **Commit**: YES
  - Message: `refactor(party-content): add temporary compatibility fallback`
  - Files: prompt loader + telemetry
  - Pre-commit: `pnpm test --filter @slopcade/api`

- [ ] 8. Execute DB backfill to canonical content types

  **What to do**:
  - Apply staged migration to normalize rows (`wager/history -> estimation`).
  - Validate row counts and unique type set after migration.

  **Must NOT do**:
  - Do not backfill production before staging validation passes.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `storage-ops`, `verification-before-completion`
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: unrelated.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: T13, T16
  - **Blocked By**: T4, T7

  **References**:
  - `shared/src/schema/party-content.ts` - valid `content_type` values.
  - migration files in `api/migrations/` - operational migration style.

  **Acceptance Criteria**:
  - [ ] Post-backfill `SELECT DISTINCT content_type` contains only canonical values.

  **QA Scenarios**:
  ```text
  Scenario: Staging backfill verification
    Tool: Bash
    Steps:
      1. Run pre-migration distinct/count query.
      2. Apply migration.
      3. Re-run query and compare.
    Expected Result: target types normalized exactly as expected.
    Evidence: .sisyphus/evidence/task-8-staging-verify.txt

  Scenario: Negative rollback check
    Tool: Bash
    Steps:
      1. Apply rollback on staging snapshot clone.
      2. Assert restored counts equal pre-migration snapshot.
    Expected Result: rollback path proven.
    Evidence: .sisyphus/evidence/task-8-rollback-verify.txt
  ```

  **Commit**: NO

- [ ] 9. Update template `contentPacks` and registry IDs to canonical references

  **What to do**:
  - Update party template definitions to canonical `contentPacks` tokens.
  - Resolve obvious identifier drift (`headsUp` folder vs `heads-up` registry ID) with explicit compatibility note.

  **Must NOT do**:
  - Do not rename `templateId` values while `app-split-plan.md` execution is in progress; keep IDs stable and only normalize `contentPacks`.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `game-package`, `game-validation`
  - **Skills Evaluated but Omitted**:
    - `bridge-development`: unrelated.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T16
  - **Blocked By**: T2

  **References**:
  - `r2/games/party/year-jinx/definition.json` - legacy pack token.
  - `api/src/party/templates/registry.ts` - runtime template IDs.

  **Acceptance Criteria**:
  - [ ] All template definitions reference canonical content pack names only.

  **QA Scenarios**:
  ```text
  Scenario: Template startup matrix
    Tool: Bash
    Steps:
      1. For each template with content packs, execute startup harness.
      2. Assert pack loading succeeds without alias branch.
    Expected Result: 100% startup success for mapped templates.
    Evidence: .sisyphus/evidence/task-9-template-startup.txt

  Scenario: Identifier drift detection
    Tool: Bash
    Steps:
      1. Compare folder names vs registry keys.
      2. Fail on unmapped/ambiguous casing differences.
    Expected Result: any drift is explicitly mapped or fixed.
    Evidence: .sisyphus/evidence/task-9-id-drift.txt
  ```

  **Commit**: YES
  - Message: `refactor(party-templates): align template pack references to canonical types`
  - Files: `r2/games/party/*/definition.json`, registry where needed
  - Pre-commit: `pnpm test --filter @slopcade/api`

- [ ] 10. Converge generation configs to canonical naming

  **What to do**:
  - Remove/merge `wager` and `history` generation keys into canonical `estimation` strategy.
  - Preserve prompt-style variance via category/preset metadata, not identifiers.

  **Must NOT do**:
  - Do not lose target-count intent for existing content generation workloads.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `ai-game-generation`, `testing-patterns`
  - **Skills Evaluated but Omitted**:
    - `social-features`: unrelated.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T12, T14
  - **Blocked By**: T6

  **References**:
  - `api/src/party/content-generation/base-configs.ts` - legacy config keys.
  - `api/src/party/content-generation/brand-content-config.ts` - per-brand generation map.
  - `api/src/party/content-generation/brands.ts` - category map still using `wager`.

  **Acceptance Criteria**:
  - [ ] Generation config list contains canonical names only.

  **QA Scenarios**:
  ```text
  Scenario: Generation config compile check
    Tool: Bash
    Steps:
      1. Run type check for content-generation module.
      2. Run generation dry-run for `estimation` on amen/slopbox.
    Expected Result: both dry-runs succeed without `wager/history` keys.
    Evidence: .sisyphus/evidence/task-10-generation-dryrun.txt

  Scenario: Unknown-type rejection
    Tool: Bash
    Steps:
      1. Call generation route/command with `wager`.
      2. Assert rejection and canonical suggestion in error.
    Expected Result: non-canonical keys are rejected.
    Evidence: .sisyphus/evidence/task-10-unknown-type.txt
  ```

  **Commit**: YES
  - Message: `refactor(content-generation): remove wager/history identifier variants`
  - Files: content-generation configs and brand category maps
  - Pre-commit: `pnpm build:types && pnpm test --filter @slopcade/api`

- [ ] 11. Migrate or alias R2 audio keys tied to legacy content type paths

  **What to do**:
  - Audit existing audio objects under legacy `.../content/wager/` or `.../content/history/` paths.
  - Implement either key migration or read-alias fallback and removal plan.

  **Must NOT do**:
  - Do not ship breaking key path changes without backward read capability.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `storage-ops`, `sound-generation`
  - **Skills Evaluated but Omitted**:
    - `native-infrastructure`: unrelated.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: T16
  - **Blocked By**: T6, T8

  **References**:
  - `api/src/trpc/routes/party-content.ts` - audio key builder path pattern.
  - R2 path convention in code: `audio/voice/{brand}/content/{contentType}/{id}.mp3`.

  **Acceptance Criteria**:
  - [ ] Legacy audio entries remain retrievable after migration.

  **QA Scenarios**:
  ```text
  Scenario: Legacy audio compatibility
    Tool: Bash (curl)
    Steps:
      1. Request sample migrated content audio generated under legacy key.
      2. Verify HTTP 200 and valid MP3 content-type.
    Expected Result: no 404s for legacy-generated assets.
    Evidence: .sisyphus/evidence/task-11-audio-compat.txt

  Scenario: Missing-key fallback behavior
    Tool: Bash
    Steps:
      1. Remove migrated key in test fixture, keep alias key only.
      2. Request asset.
    Expected Result: fallback path resolves correctly or explicit controlled error.
    Evidence: .sisyphus/evidence/task-11-fallback.txt
  ```

  **Commit**: YES
  - Message: `refactor(audio): support canonical content-type audio paths`
  - Files: audio key resolver/migration utilities
  - Pre-commit: `pnpm test --filter @slopcade/api`

- [ ] 12. Remove legacy brand-game mapping and prefixed storage game types

  **What to do**:
  - Remove `LEGACY_BRAND_GAME_TYPES`, `storageGameType` prefixed behavior, and `amen-*` mapping path.
  - Ensure brand is always a separate parameter from canonical type.

  **Must NOT do**:
  - Do not leave hidden fallback branches after cutover.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `agent-orchestration`, `workspace-system`
  - **Skills Evaluated but Omitted**:
    - `economy-iap`: unrelated.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: T13, T15
  - **Blocked By**: T1, T7, T10

  **References**:
  - `api/src/party/content-generation/prompts.ts` - legacy map + resolver.
  - `packages/content-pipeline/src/generate/prompts.ts` - mirrored legacy map in package layer.

  **Acceptance Criteria**:
  - [ ] No code path accepts/produces `amen-*` game type IDs.

  **QA Scenarios**:
  ```text
  Scenario: Legacy key hard rejection
    Tool: Bash
    Steps:
      1. Invoke generation with `amen-trivia`.
      2. Assert explicit unsupported legacy identifier error.
    Expected Result: request fails with migration guidance.
    Evidence: .sisyphus/evidence/task-12-legacy-reject.txt

  Scenario: Canonical key success
    Tool: Bash
    Steps:
      1. Invoke equivalent generation with `brandId=amen`, `gameType=trivia`.
      2. Assert successful generation path.
    Expected Result: canonical route succeeds.
    Evidence: .sisyphus/evidence/task-12-canonical-success.txt
  ```

  **Commit**: YES
  - Message: `refactor(content-pipeline): remove legacy brand-prefixed game type support`
  - Files: prompts resolvers in API + package pipeline
  - Pre-commit: `pnpm build:types && pnpm test --filter @slopcade/api`

- [ ] 13. Remove filename aliases and brand-prefix extraction logic

  **What to do**:
  - Delete `FILENAME_TO_CONTENT_TYPE` special cases and genericize pack filename parsing.
  - Remove implicit `amen-` prefix stripping behavior.

  **Must NOT do**:
  - Do not break canonical filename parsing for existing canonical packs.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `testing-patterns`, `workspace-system`
  - **Skills Evaluated but Omitted**:
    - `editor-browser-testing`: unrelated.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: T14, T16
  - **Blocked By**: T8, T12

  **References**:
  - `api/src/trpc/routes/party-content.ts` - alias extraction and filename parser.
  - `api/scripts/seed-party-content.ts` and `api/scripts/sync-party-content.ts` - related parsing logic.

  **Acceptance Criteria**:
  - [ ] Filename parser supports only canonical names and fails fast on legacy names.

  **QA Scenarios**:
  ```text
  Scenario: Canonical filename import
    Tool: Bash
    Steps:
      1. Import canonical pack files.
      2. Assert inferred content types match file names exactly.
    Expected Result: import succeeds with correct content types.
    Evidence: .sisyphus/evidence/task-13-canonical-import.txt

  Scenario: Legacy filename rejection
    Tool: Bash
    Steps:
      1. Add `amen-wager.json` fixture.
      2. Run import.
    Expected Result: explicit rejection/warning and no insertion.
    Evidence: .sisyphus/evidence/task-13-legacy-filename.txt
  ```

  **Commit**: YES
  - Message: `refactor(party-content): remove filename alias and brand-prefix parsing`
  - Files: party-content route + seed/sync scripts
  - Pre-commit: `pnpm test --filter @slopcade/api`

- [ ] 14. Enforce canonical validation across tRPC routes and scripts

  **What to do**:
  - Add centralized canonical validators to all mutation/query entry points using these IDs.
  - Update route inputs accepting freeform `gameType` to validated canonical schema.

  **Must NOT do**:
  - Do not leave any `z.string()` pass-through for canonical identifiers.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `agent-orchestration`, `testing-patterns`
  - **Skills Evaluated but Omitted**:
    - `godot-engine`: unrelated.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: T15, T16
  - **Blocked By**: T3, T6, T10, T13

  **References**:
  - `api/src/trpc/routes/party-content.ts` - route input schemas.
  - `api/src/trpc/routes/party-templates.ts` - template listing API contract.
  - `packages/content-pipeline/src/types/index.ts` - pipeline type schemas.

  **Acceptance Criteria**:
  - [ ] All relevant APIs reject non-canonical identifiers with explicit errors.

  **QA Scenarios**:
  ```text
  Scenario: Canonical API acceptance
    Tool: Bash (curl)
    Steps:
      1. Call each relevant endpoint with canonical IDs.
      2. Assert 2xx and valid payload shape.
    Expected Result: canonical requests succeed.
    Evidence: .sisyphus/evidence/task-14-canonical-api.txt

  Scenario: Legacy API rejection
    Tool: Bash (curl)
    Steps:
      1. Repeat calls with `wager`, `history`, `amen-trivia`.
      2. Assert 4xx with validation message.
    Expected Result: legacy IDs consistently rejected.
    Evidence: .sisyphus/evidence/task-14-legacy-reject.txt
  ```

  **Commit**: YES
  - Message: `refactor(api): enforce canonical template and content identifier validation`
  - Files: route schemas + shared validators
  - Pre-commit: `pnpm build:types && pnpm test --filter @slopcade/api`

- [ ] 15. Add/adjust regression tests (tests-after)

  **What to do**:
  - Add missing tests for persistence keys, websocket `gameTemplate` payload, registry completeness, and migration behavior.
  - Update existing tests that used legacy identifiers.

  **Must NOT do**:
  - Do not delete tests to force pass; fix behavior or update assertions.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `testing-patterns`, `verification-before-completion`
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: unrelated.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: T16
  - **Blocked By**: T5, T12, T14

  **References**:
  - `api/src/party/__tests__/PartyRoomDO.state-persistence.test.ts` - current gap on template state.
  - `api/src/party/templates/__tests__/registry-quiplash-r2.test.ts` - registry test anchor.
  - `api/src/party/__tests__/party-routes.test.ts` - route contract tests.

  **Acceptance Criteria**:
  - [ ] New tests cover identified high-risk gaps and pass.

  **QA Scenarios**:
  ```text
  Scenario: Full party test suite
    Tool: Bash
    Steps:
      1. Run targeted party tests under `api/src/party/**`.
      2. Assert pass count and zero failures.
    Expected Result: all updated tests pass.
    Evidence: .sisyphus/evidence/task-15-party-tests.txt

  Scenario: Regression sentinel
    Tool: Bash
    Steps:
      1. Re-run old legacy fixture test with canonical mapping shim removed.
      2. Assert expected failure before fixture update, then pass after update.
    Expected Result: tests enforce new naming contract.
    Evidence: .sisyphus/evidence/task-15-sentinel.txt
  ```

  **Commit**: YES
  - Message: `test(party): add migration regression coverage for canonical naming`
  - Files: party tests + helper fixtures
  - Pre-commit: `pnpm test --filter @slopcade/api`

- [ ] 16. End-to-end rollout verification, dead-code cleanup, and compatibility shim removal

  **What to do**:
  - Run full verification across Amen, Slopbox, Slopcade.
  - Remove temporary compatibility paths (from T7/T11) once telemetry confirms zero legacy hits.
  - Clean dead references/docs to prevent future drift.

  **Must NOT do**:
  - Do not remove shims before zero-hit confirmation window is complete.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-before-completion`, `workspace-system`
  - **Skills Evaluated but Omitted**:
    - `asset-pack-generation`: unrelated.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: Final verification wave
  - **Blocked By**: T2, T3, T8, T9, T11, T13, T14, T15

  **References**:
  - `apps/amen/hooks/useBrowsePartyGames.ts` - brand consumer path.
  - `apps/slopbox/hooks/useBrowsePartyGames.ts` - brand consumer path.
  - `apps/slopcade/hooks/useBrowsePartyGames.ts` - default brand consumer path.

  **Acceptance Criteria**:
  - [ ] All three brands can browse/host templates with canonical identifiers.
  - [ ] Compatibility shims removed and no alias references remain.

  **QA Scenarios**:
  ```text
  Scenario: Cross-brand host flow
    Tool: Bash + API curl
    Steps:
      1. For each brand, list templates and start a representative session.
      2. Assert successful session init and content loading.
    Expected Result: all brands succeed without legacy identifier usage.
    Evidence: .sisyphus/evidence/task-16-cross-brand.txt

  Scenario: Legacy reference zero-scan
    Tool: Bash
    Steps:
      1. Run grep scans for `wager`, `history`, `amen-` in targeted naming paths.
      2. Allow only approved historical docs/migrations.
    Expected Result: zero runtime/codepath legacy references.
    Evidence: .sisyphus/evidence/task-16-legacy-zero.txt
  ```

  **Commit**: YES
  - Message: `chore(party): remove migration compatibility shims and dead legacy paths`
  - Files: runtime compatibility branches, docs, cleanup
  - Pre-commit: `pnpm test && pnpm build:types && pnpm lint`

- [ ] 17. Final post-refactor cleanup after app-split completion

  **What to do**:
  - Wait for `.sisyphus/plans/app-split-plan.md` to hit exit criteria completion (items 40-43).
  - Re-scan for residual naming/cleanup opportunities introduced by late app-split merges.
  - Apply the final cleanup pass so no light refactor/debt remains from this naming migration.

  **Must NOT do**:
  - Do not run this task before app-split completion is verified.
  - Do not re-open template ID renames unless explicitly requested in a new plan.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `workspace-system`, `verification-before-completion`
  - **Skills Evaluated but Omitted**:
    - `ai-game-generation`: unrelated for this closure pass.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5
  - **Blocks**: Final verification wave
  - **Blocked By**: T16 and app-split completion (`app-split-plan.md` tasks 40-43)

  **References**:
  - `.sisyphus/plans/app-split-plan.md` - gating completion source.
  - `api/src/party/content-generation/prompts.ts` - legacy mapping hotspot.
  - `api/src/trpc/routes/party-content.ts` - alias handling hotspot.

  **Acceptance Criteria**:
  - [ ] App-split exit criteria (40-43) verified complete.
  - [ ] Zero additional cleanup findings remain from cross-plan integration.

  **QA Scenarios**:
  ```text
  Scenario: App-split completion gate
    Tool: Bash
    Steps:
      1. Parse `.sisyphus/plans/app-split-plan.md` for tasks 40-43.
      2. Assert all are checked `[x]` before proceeding.
    Expected Result: task halts if any gate remains incomplete.
    Evidence: .sisyphus/evidence/task-17-gate-check.txt

  Scenario: Final residual cleanup scan
    Tool: Bash
    Steps:
      1. Run targeted grep scans for legacy naming patterns in runtime paths.
      2. Run tests/type/lint verification after any cleanup edits.
    Expected Result: no residual naming debt and all checks pass.
    Evidence: .sisyphus/evidence/task-17-final-scan.txt
  ```

  **Commit**: YES
  - Message: `chore(party): finalize naming migration cleanup after app split`
  - Files: residual cleanup changes only
  - Pre-commit: `pnpm test && pnpm build:types && pnpm lint`

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **1**: `refactor(party-content): establish canonical content and template naming`
- **2**: `refactor(content-pipeline): remove legacy brand game type aliases`
- **3**: `test(party): add regression coverage for template/content name migration`
- **4**: `chore(party): remove compatibility shims after backfill`

---

## Success Criteria

### Verification Commands

```bash
pnpm test
pnpm build:types
pnpm lint
```

### Final Checklist

- [ ] All canonical names are consistent across runtime, API, and content pipeline.
- [ ] No legacy alias mapping remains.
- [ ] All tests and type checks pass.
- [ ] Brand-facing names remain presentation-only.
