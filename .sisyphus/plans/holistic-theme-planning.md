# Holistic Theme Planner for Asset Generation

## TL;DR

> **Quick Summary**: Add a txt2txt "Theme Planner" stage that plans the entire game (or targeted subset with full-pack context) before image generation, then use that plan as the source of truth for per-template prompts and silhouette colors.
>
> **Deliverables**:
> - Versioned `ThemePlan` schema and persistence
> - Planner service using OpenRouter (default) with strict JSON output
> - CLI + API integration so task prompts/colors come from `ThemePlan`
> - Partial regeneration that preserves theme coherence with existing pack assets
> - Verification scenarios and fallback behavior
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Schema + persistence -> planner service -> API integration -> partial regen consistency -> CLI integration

---

## Context

### Original Request
User wants a holistic theming system because current approach (theme string glued to generic `whatDescription`) produces weak thematic results. They want txt2txt planning that understands whole-game context, chooses coherent concepts/colors, and keeps consistency even for partial regeneration.

### Interview Summary
**Key Discussions**:
- `whatDescription` should be structural, not thematic; theming should come from theme/planner layer.
- Planner must reason about all assets together to avoid collisions and weak motifing.
- Partial regeneration must still fit unchanged assets.

**Research Findings**:
- Existing OpenRouter integration exists in `api/src/trpc/routes/asset-system.ts` (`enhancePrompt`).
- Current CLI flow (`api/scripts/generate-assets.ts`) and pipeline are per-asset focused.
- Current DB job/task model already persists `compiled_prompt`, which is a strong base for planner integration.

### Metis Review
**Identified Gaps** (addressed):
- Missing persistence model for holistic plan -> add versioned `theme_plan_json` storage.
- Partial regen consistency not defined -> lock/reuse prior plan anchors and palette.
- Failure mode unclear -> add graceful fallback to legacy prompt build if planner fails.
- Scope creep risk -> explicitly exclude UI/theme marketplace and gameplay runtime theme switching.

---

## Work Objectives

### Core Objective
Introduce a pre-generation txt2txt planning layer that generates coherent per-template prompts/colors with full-game context and makes those plan artifacts reusable for partial regeneration.

### Concrete Deliverables
- Data model updates for `ThemePlan` persistence.
- Planner service that calls OpenRouter and returns validated JSON.
- Job/task creation paths updated to compile prompts from `ThemePlan` output.
- CLI generation path updated to use planner (with opt-out fallback).
- Partial regeneration logic updated to preserve plan anchors.

### Definition of Done
- [x] New generation jobs include persisted `ThemePlan` with valid schema.
- [x] Generated `generation_tasks.compiled_prompt` values come from planner output (not raw theme glue).
- [x] Partial regeneration of subset templates keeps existing palette/motif coherence.
- [x] Legacy behavior still works if planner is disabled/unavailable.

### Must Have
- OpenRouter-backed txt2txt planning (default provider path).
- Strict JSON schema validation for planner output.
- Deterministic coherence anchors persisted per pack/job.

### Must NOT Have (Guardrails)
- No new visual editor or marketplace.
- No provider-level image model rewrite.
- No human-manual verification as acceptance criteria.
- No replacement of existing pipeline stages (img2img/remove-bg/upload) beyond input wiring.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan are verifiable without human action.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (focused integration tests for planner + generation routes)
- **Framework**: Existing API test stack (Vitest / route-level tests in repo conventions)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

Each task includes named scenarios with exact commands/selectors/assertions and captured evidence.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Foundation)
- Task 1: Define `ThemePlan` schema/types + validation
- Task 2: Add persistence fields/tables and migration

Wave 2 (Planner + API)
- Task 3: Implement planner service (OpenRouter txt2txt)
- Task 4: Integrate planner into API generation job creation

Wave 3 (Consistency + CLI)
- Task 5: Integrate planner into partial regeneration consistency flow
- Task 6: Integrate planner into CLI `generate-assets.ts`

Wave 4 (Verification + rollout)
- Task 7: Tests, fallback behavior, feature flag, docs updates

Critical Path: 1 -> 2 -> 3 -> 4 -> 5 -> 7

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3,4,5,6 | 2 |
| 2 | None | 4,5 | 1 |
| 3 | 1 | 4,5,6 | None |
| 4 | 1,2,3 | 5,7 | 6 |
| 5 | 1,2,3,4 | 7 | None |
| 6 | 1,3 | 7 | 4 |
| 7 | 4,5,6 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1,2 | quick/unspecified-high (backend schema/types) |
| 2 | 3,4 | unspecified-high + ultrabrain for planner reliability |
| 3 | 5,6 | unspecified-high (consistency logic + CLI integration) |
| 4 | 7 | quick/unspecified-high (tests/docs/rollout) |

---

## TODOs

- [x] 1. Define versioned `ThemePlan` schema and validators

  **What to do**:
  - Add `ThemePlan` TS types: `version`, `theme`, `style`, `globalPalette`, `templatePlans`, `cohesionAnchors`, `generatedAt`, `providerMeta`.
  - Add runtime validator (zod) for planner output parsing.
  - Include per-template fields: `templateId`, `conceptName`, `prompt`, `negativePrompt`, `silhouetteColor`, `constraints`, `rationale`.

  **Must NOT do**:
  - Do not couple schema to ballSort-only fields.
  - Do not store unvalidated planner JSON.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `test-driven-development`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: 3,4,5,6
  - **Blocked By**: None

  **References**:
  - `api/src/ai/pipeline/types.ts` - existing generation type patterns.
  - `api/src/trpc/routes/asset-system.ts` - prompt/task persistence contracts.

  **Acceptance Criteria**:
  - [x] `ThemePlan` schema accepts valid planner JSON and rejects malformed payloads.
  - [x] Unit tests cover required fields and versioning behavior.

  **Agent-Executed QA Scenarios**:
  ```bash
  Scenario: Valid plan schema passes
    Tool: Bash
    Steps:
      1. Run planner schema test command for valid fixture
      2. Assert exit code 0
    Expected Result: Validation passes for valid fixture

  Scenario: Invalid plan schema fails
    Tool: Bash
    Steps:
      1. Run planner schema test command for invalid fixture
      2. Assert expected validation error keys exist
    Expected Result: Validation fails with explicit field errors
  ```

- [x] 2. Add persistence for holistic plan snapshots

  **What to do**:
  - Add migration for storing plan JSON (recommended: `generation_jobs.theme_plan_json` + optional hash/version columns).
  - Update route row types and client mappers to surface plan metadata where needed.
  - Keep backward compatibility for existing rows with null plan.

  **Must NOT do**:
  - Do not break reads for old jobs/packs.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: 4,5
  - **Blocked By**: None

  **References**:
  - `api/schema.sql` - existing job/task schema.
  - `api/migrations/20260203_asset_system_v3.sql` - migration style.
  - `api/src/trpc/routes/asset-system.ts` - row interfaces and insert/update paths.

  **Acceptance Criteria**:
  - [x] Migration applies successfully in local DB.
  - [x] Jobs can be created with and without plan JSON.

  **Agent-Executed QA Scenarios**:
  ```bash
  Scenario: Migration adds plan storage
    Tool: Bash
    Steps:
      1. Run migration command
      2. Query schema metadata for new column/table
    Expected Result: Plan storage field exists

  Scenario: Legacy row compatibility
    Tool: Bash
    Steps:
      1. Query existing generation job rows
      2. Assert null plan rows still deserialize
    Expected Result: No runtime errors for legacy rows
  ```

- [x] 3. Implement txt2txt Theme Planner service (OpenRouter default)

  **What to do**:
  - Implement planner service that takes full template context + optional existing pack context.
  - Use OpenRouter call pattern (existing env + fetch approach) with strict JSON-only output contract.
  - Parse + validate with Task 1 schema; include retry with low temperature and constrained instructions on parse failures.
  - Return deterministic anchors: palette, motif registry, role map, style rules.

  **Must NOT do**:
  - Do not emit free-text-only outputs.
  - Do not hard-fail generation if planner provider transiently fails.

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: `systematic-debugging`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 4,5,6
  - **Blocked By**: 1

  **References**:
  - `api/src/trpc/routes/asset-system.ts:1681` - existing OpenRouter integration (`enhancePrompt`).
  - `api/src/ai/assets/service.ts` - structured prompt and generation context concepts.

  **Acceptance Criteria**:
  - [x] Planner returns validated `ThemePlan` JSON for full template set.
  - [x] Planner returns stable role uniqueness + non-colliding color assignments.
  - [x] Planner failure falls back to legacy prompt mode with warning logs.

  **Agent-Executed QA Scenarios**:
  ```bash
  Scenario: Planner JSON generation succeeds
    Tool: Bash (curl)
    Steps:
      1. Call planner endpoint/service with ballSort + halloween theme
      2. Assert returned JSON validates against schema
      3. Assert 8 ball templates have unique concept names
    Expected Result: Valid coherent ThemePlan

  Scenario: Planner malformed response recovery
    Tool: Bash (mock)
    Steps:
      1. Force provider to return invalid JSON
      2. Assert retry path invoked, then fallback path available
    Expected Result: No crash; controlled fallback
  ```

- [x] 4. Integrate planner into API job creation (`createGenerationJob`, `applyThemeToGame`, `regeneratePack`)

  **What to do**:
  - Before task inserts, generate/load ThemePlan with full relevant context.
  - Compile each task prompt from plan entry, not ad-hoc prompt builder.
  - Persist plan snapshot to job record.
  - Keep task-level `compiled_prompt` snapshot for auditability.

  **Must NOT do**:
  - Do not remove existing task prompt persistence.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `test-driven-development`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 6 after planner service stable)
  - **Blocks**: 5,7
  - **Blocked By**: 1,2,3

  **References**:
  - `api/src/trpc/routes/asset-system.ts:598` (`createGenerationJob`).
  - `api/src/trpc/routes/asset-system.ts:1773` (`applyThemeToGame`).
  - `api/src/trpc/routes/asset-system.ts:766` (`regeneratePack`).

  **Acceptance Criteria**:
  - [x] New jobs store `theme_plan_json`.
  - [x] New tasks use planner-produced prompts/colors.
  - [x] Existing API behavior remains backward compatible when planner disabled.

  **Agent-Executed QA Scenarios**:
  ```bash
  Scenario: createGenerationJob uses planner output
    Tool: Bash (curl)
    Steps:
      1. Create job for selected templates
      2. Query job + tasks
      3. Assert job has plan JSON and tasks use plan-derived prompts
    Expected Result: Planner-backed prompts persisted

  Scenario: applyThemeToGame full run
    Tool: Bash (curl)
    Steps:
      1. Apply theme to game
      2. Assert task count equals image templates
      3. Assert plan snapshot exists on created job
    Expected Result: Full generation seeded from holistic plan
  ```

- [x] 5. Implement partial-regeneration coherence rules

  **What to do**:
  - On subset regen, load existing plan anchors from latest pack/job.
  - Replan subset with anchors locked (`globalPalette`, motif registry, style rules).
  - Prevent concept/color collisions with unchanged assets.
  - Add policy for missing legacy plan: bootstrap plan from existing assets or fallback mode (configurable default: bootstrap).

  **Must NOT do**:
  - Do not silently drift global palette when only subset requested (unless explicit override flag).

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: `systematic-debugging`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 7
  - **Blocked By**: 1,2,3,4

  **References**:
  - `api/src/trpc/routes/asset-system.ts:1340` (partial regeneration task creation path).
  - `api/src/trpc/routes/asset-system.ts:943` (`processGenerationJob`).

  **Acceptance Criteria**:
  - [x] Subset regen preserves pack-level coherence with unchanged assets.
  - [x] Collision checks reject or repair conflicting concept/color assignments.

  **Agent-Executed QA Scenarios**:
  ```bash
  Scenario: Single-template regen preserves palette
    Tool: Bash (curl + DB query)
    Steps:
      1. Generate full halloween plan
      2. Regenerate only one ball template
      3. Compare old/new plan anchors and unchanged template assignments
    Expected Result: Anchors unchanged; subset fits existing set

  Scenario: Collision prevention
    Tool: Bash (mock planner output)
    Steps:
      1. Force new subset output to duplicate existing concept/color
      2. Run validation/repair
      3. Assert repaired or rejected with explicit error
    Expected Result: No duplicate collisions in final plan
  ```

- [x] 6. Integrate planner into CLI `generate-assets.ts`

  **What to do**:
  - Add planner integration path for CLI generation using full template context.
  - Add flags: `--plan-only`, `--reuse-plan=<path|jobId>`, `--planner-provider=openrouter`, `--planner-disable`.
  - For `--pack-id` subset generation, load/reuse existing plan anchors when available.

  **Must NOT do**:
  - Do not break current CLI usage defaults.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-before-completion`, `test-driven-development`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 4)
  - **Blocks**: 7
  - **Blocked By**: 1,3

  **References**:
  - `api/scripts/generate-assets.ts` - current CLI generation path.
  - `api/src/ai/pipeline/executor.ts` - per-asset execution contract.

  **Acceptance Criteria**:
  - [x] CLI can output a plan without generating images (`--plan-only`).
  - [x] CLI subset regen can reuse stored plan anchors.
  - [x] Existing command still works without new flags.

  **Agent-Executed QA Scenarios**:
  ```bash
  Scenario: plan-only mode
    Tool: Bash
    Steps:
      1. Run generate command with --plan-only
      2. Assert plan file/log output exists
      3. Assert no image writes occurred
    Expected Result: Plan produced, no asset generation

  Scenario: reuse-plan subset regen
    Tool: Bash
    Steps:
      1. Run subset generation with --pack-id and --reuse-plan
      2. Assert only selected templates regenerated
      3. Assert resulting prompts/colors match anchor constraints
    Expected Result: Coherent partial regen
  ```

- [x] 7. Add tests, rollout controls, and documentation

  **What to do**:
  - Add integration tests for planner generation, fallback, and partial coherence.
  - Add feature flag/kill switch for planner path.
  - Document architecture + operational guidance for planner usage.

  **Must NOT do**:
  - Do not ship planner path without fallback toggle.

  **Recommended Agent Profile**:
  - **Category**: `writing` + `unspecified-high`
  - **Skills**: `verification-before-completion`, `writing-plans`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Final wave
  - **Blocks**: None
  - **Blocked By**: 4,5,6

  **References**:
  - `docs/game-maker/architecture/asset-system.md` - architecture docs target.
  - `api/src/trpc/routes/asset-system.ts` test neighbors.

  **Acceptance Criteria**:
  - [x] Planner-enabled and planner-disabled paths both pass tests.
  - [x] Docs describe provider setup (`OPENROUTER_API_KEY`) and planner flags.

  **Agent-Executed QA Scenarios**:
  ```bash
  Scenario: Planner feature flag off
    Tool: Bash
    Steps:
      1. Disable planner flag
      2. Run generation path
      3. Assert legacy prompt path executes
    Expected Result: Backward-compatible generation

  Scenario: Planner feature flag on
    Tool: Bash
    Steps:
      1. Enable planner flag
      2. Run generation path
      3. Assert plan persisted and prompts sourced from plan
    Expected Result: New holistic behavior active
  ```

---

## Provider Decision (txt2txt)

**Default choice**: OpenRouter via existing backend fetch pattern.

**Why**:
- Already integrated in `asset-system.ts` (`enhancePrompt`).
- Existing env secret (`OPENROUTER_API_KEY`) and request pattern are proven.
- Easy to route to different models behind one endpoint.

**Recommended initial model**:
- Start with `openai/gpt-4o-mini` (already used) for cost/speed.
- Add model override in planner config for future tuning.

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1-2 | `feat(asset-system): add theme plan schema and persistence` | schema/migration/types/routes | migration + tests |
| 3-4 | `feat(asset-system): add holistic theme planner for job creation` | planner service + routes | route/integration tests |
| 5-6 | `feat(asset-system): preserve coherence for partial regeneration` | partial regen + CLI | subset regen tests |
| 7 | `docs(asset-system): document holistic planner and fallbacks` | docs + tests | full verification |

---

## Success Criteria

### Verification Commands
```bash
# API tests for planner flows
pnpm --filter @slopcade/api test

# Build verification
pnpm --filter @slopcade/api build:games

# CLI dry run with planner
hush run -- pnpm generate:assets --game=ballSort --theme="halloween" --style=cartoon --dry-run
```

### Final Checklist
- [x] Planner produces validated JSON plans with full-context coherence.
- [x] Job/task prompt generation uses persisted plan output.
- [x] Partial regeneration remains thematically coherent with unchanged assets.
- [x] OpenRouter provider path is configurable and failure-safe.
- [x] Legacy generation path remains functional behind fallback/flag.
