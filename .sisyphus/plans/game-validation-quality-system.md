# Game Validation Quality System (single DB pipeline)

## TL;DR

Replace `archived` with a unified validation report + quality score stored on every game (optional). Treat “template games” as *seeded DB games* owned by a system user so the UI works like production (browse/search DB games). Validation runs in one place (API) on publish/save and via manual triggers for seeded/template games.

**Deliverables**
- DB: `games.validation_report` (+ summary fields for fast browse) and indexes.
- Shared: unified `GameValidationReport` + severity + scoring utilities; move `validateGameDefinition()` into `@slopcade/shared`.
- API: validation on publish/save; manual trigger endpoints; list/get returns validation summaries.
- App UI: browse hides critical-by-default with toggle; cards show badges; detail shows counts + top issues.
- Dev workflow: template games synced into DB under system user (e.g., `slop`).

**Estimated Effort**: Large

---

## Context

### Original request
- Many template/test games now fail validation; instead of failing CI, we want a quality metric.
- Add severity (Critical vs Warning), show on browse + detail, and filter/sort by it.
- Move away from `archived` as browse determinant.

### Key repo facts (verified)
- Template games currently exist as code under `app/lib/test-games/games/**/game.ts` and are auto-registered via `app/scripts/generate-registry.mjs` → `app/lib/registry/generated/testGames.ts`.
- Browse screen is `app/app/(tabs)/browse.tsx` with `FilterBar.tsx` + `GameCard.tsx`.
- Game detail is `app/app/game-detail/[id].tsx`.
- Current validation entrypoint is `api/src/ai/validator.ts` (returns `{ valid, errors, warnings }` with error codes + paths).
- Expression validation exists in `shared/src/expressions/validator.ts` (unknown identifier/function errors).
- DB schema is in `api/schema.sql` and drizzle schema in `shared/src/schema/games.ts`.

### Updated direction (simplification)
- Avoid a second validation path for template games.
- Treat template games as seeded DB entries owned by a system user.
- Store validation results only in DB (`games.validation_report` optional) and surface uniformly.

---

## Work Objectives

### Core objective
Create a single-source validation + scoring system that powers browsing, filtering, and game detail diagnostics, with template games seeded into DB so the UI and workflows match production.

### Definition of done
- Browse defaults to hiding any game with Critical issues, with a toggle to include.
- Game cards show validation badges (Critical count / Warning count and/or score).
- Game detail shows counts + top issues (Critical first).
- Publish/save triggers validation and persists report + score.
- Template games are present in DB (owned by `slop` user) and can be re-synced.

### Must NOT have (guardrails)
- Do **not** auto-modify/fix game definitions.
- Do **not** change runtime gameplay semantics.
- Do **not** introduce a separate, parallel validation store for templates outside DB.
- Avoid adding new dependencies unless truly required.

---

## Verification Strategy

### Test infrastructure
- API uses Vitest (`api/package.json` has `vitest`), app also has `vitest`.

### Strategy
- Add/extend unit tests for:
  - severity mapping
  - scoring function
  - API publish/save validation persistence
  - browse filtering defaults (app unit tests where feasible) and manual QA.

Manual QA (required)
- Run app and confirm browse filters and badges visually.
- Create/update/publish a game and confirm report persisted and surfaced.

---

## Data Model

### Shared types (new, in `@slopcade/shared`)

Define a unified report:
- `IssueSeverity`: `critical | warning` (optionally `info` later)
- `ValidationIssue`:
  - `code` (stable string)
  - `message`
  - `severity`
  - `source` (`gameDefinition` | `expressions`)
  - `path` (string; e.g. `rules[3].conditions[0].expr` or `winCondition.type`)
  - optional `context` (expression string, identifier, function name)
- `GameValidationReport`:
  - `valid` (no critical issues)
  - `issues: ValidationIssue[]`
  - `summary`: `{ criticalCount, warningCount, score0to100, topIssues }`
  - `validatorVersion` (string) + `validatedAt` (timestamp)

### DB changes

Extend games table:
- `validation_report TEXT` (JSON)
- `validation_score INTEGER` (0–100)
- `validation_critical_count INTEGER`
- `validation_warning_count INTEGER`
- `validation_valid INTEGER` (boolean)
- `validation_updated_at INTEGER`

Indexes:
- composite index to support browse queries: `(is_public, validation_valid, validation_score, play_count, created_at)` (tune as needed)

Notes:
- Report is optional (NULL means “not validated yet”).
- Score should be deterministic and based on issue list.

---

## API Design

### Validation computation

Unified pipeline in API:
- Parse `definition` JSON.
- Run `validateGameDefinition()` (moved to `shared/`).
- Run expression validation by extracting expressions from definition (reuse extraction approach from `api/src/ai/__tests__/test-games-validation.test.ts`).
- Map raw outputs into unified `ValidationIssue[]` with severities.
- Compute summary counts + score.
- Persist columns.

### When it runs
- On `games.create` and `games.update`:
  - If definition changes OR `isPublic` becomes true (publish) → recompute and persist.
  - Optional optimization: only recompute on publish (but keep a manual validate endpoint for drafts).

### Manual triggers
- Add endpoint(s):
  - `games.validateNow({ id })` (owner/admin only)
  - `games.validateMany({ ownerUserId?: "slop", isPublic?: boolean })` (admin/dev only)

### Response shape
- `games.get` and `games.listPublic` should return validation summary fields:
  - `validationValid`, `validationScore`, `validationCriticalCount`, `validationWarningCount`, `validationTopIssues` (small list)

---

## App UI Changes

### Browse

Replace `archived` filter with validation-quality filters (DB-backed):
- Default: hide games with `criticalCount > 0`.
- Toggle: “Include Critical” (or filter chip).
- Optional chips: “Only Unvalidated”, “Only Passing”, “Has Warnings”.
- Sorting: add “Quality” sort by `validationScore desc`.

Card badges (in `app/components/browse/GameCard.tsx`):
- If `criticalCount > 0`: red badge `C: {criticalCount}`.
- Else if `warningCount > 0`: yellow badge `W: {warningCount}`.
- Optionally show score (e.g., `Score 78`).

Data source:
- Browse should use the DB list results (production-like). Template games appear because they are seeded into DB.

### Game Detail

In `app/app/game-detail/[id].tsx`:
- Show validation summary badges and top issues list (Critical first).
- If game has critical issues: show warning callout, but still allow “Play” (unless later you decide to block).

---

## Template Games → DB Sync

### Goal
Keep template games authored in source code, but ensure local/dev DB contains them as normal games owned by a system user (e.g., `slop`).

### Approach (recommended)

**Single place to seed** (API-driven), no registry-time validation:
- Add a dev-only script/endpoint pair:
  - Script: loads templates from source (via `loadAllTestGames()` in app or via direct imports) and calls API `games.syncTemplates`.
  - API: upserts under `slop` user, stores definition, triggers validation + persistence.

System user creation (local/dev):
- Add a seed script similar to `api/scripts/seed-economy.ts` that inserts a `users` row for `slop` in local D1.

Sync semantics:
- Upsert by stable key (prefer: a deterministic ID per template game).
- Optional: delete any existing `slop`-owned games not present in source list.

---

## Execution Strategy (waves)

Wave 1 (types + DB groundwork)
- Add shared types + scoring + severity mapping.
- Add DB columns in `api/schema.sql` and drizzle schema in `shared/src/schema/games.ts`.

Wave 2 (API validation)
- Move validator into `shared/` and re-export in API.
- Implement unified validation pipeline and persist on create/update/publish.
- Add manual validation trigger endpoints.

Wave 3 (Template sync)
- Create system user seed.
- Add app dev-only sync-on-start + API syncTemplates endpoint.

Wave 4 (UI)
- Update browse filters, remove archived UI, show badges.
- Update game detail page to show counts + top issues.

---

## TODOs

> Each task includes references so Sisyphus can execute without prior context.

- [ ] 1) Define shared validation model + scoring utilities

  **What to do**
  - Create `GameValidationReport`, `ValidationIssue`, `IssueSeverity`, `ValidatorSource` in `shared/`.
  - Implement `computeValidationScore(issues) -> 0..100`.
  - Implement `selectTopIssues(issues, N)` deterministic ordering.

  **References**
  - `api/src/ai/validator.ts` (current error code/path patterns)
  - `shared/src/expressions/validator.ts` (expression error patterns)
  - `api/src/ai/__tests__/test-games-validation.test.ts` (expression extraction approach)

  **Acceptance**
  - Unit tests cover score + ordering + top issue selection.

- [ ] 2) Decide and implement severity mapping

  **What to do**
  - Map existing validator error codes to `critical|warning`.
  - Map expression errors (unknown function/identifier/variable) to severities.

  **Defaults (override if needed)**
  - GameDefinition `errors[]` => `critical`
  - GameDefinition `warnings[]` => `warning`
  - Expression validator errors => `critical` (because runtime expressions will break)

  **Acceptance**
  - Tests verifying mapping for at least: missing win/lose condition, invalid behavior type, unknown function.

- [ ] 3) Add DB columns + indexes for validation

  **What to do**
  - Update `api/schema.sql` games table to include new columns.
  - Update `shared/src/schema/games.ts` drizzle table to match.
  - Provide migration steps for local and remote D1.

  **References**
  - `api/schema.sql` (current schema)
  - `shared/src/schema/games.ts` (drizzle schema)
  - `api/package.json` scripts: `db:push`, `db:push:remote`

  **Acceptance**
  - `pnpm --filter @slopcade/api db:push` works locally.

- [ ] 4) Move `validateGameDefinition()` into `shared/` and re-export from API

  **What to do**
  - Relocate implementation; preserve behavior and codes.
  - Update imports in API routes/tests accordingly.

  **Acceptance**
  - API type-check and tests pass.

- [ ] 5) Implement unified validation pipeline in API and persist on create/update/publish

  **What to do**
  - In `api/src/trpc/routes/games.ts` create/update flows, parse `definition`, run both validators, compute report/summary, persist columns.
  - Add validatorVersion/validatedAt.

  **References**
  - `api/src/trpc/routes/games.ts` (create/update/listPublic/get)
  - `api/src/ai/__tests__/test-games-validation.test.ts` (expression extraction)

  **Acceptance**
  - When creating/updating a game (definition change), DB row contains validation columns.

- [ ] 6) Return validation summaries from list/get endpoints

  **What to do**
  - Extend `toClientGame()` mapping (wherever defined) to include validation summary fields.
  - Update `useBrowseGames` consumer expectations.

  **Acceptance**
  - App can render badges without additional calls.

- [ ] 7) Add manual validation trigger endpoints

  **What to do**
  - `games.validateNow({ id })`
  - `games.validateTemplates()` or `games.validateByOwner({ userId })`
  - Gate with dev/admin guardrails.

  **Acceptance**
  - Can trigger validation for all `slop` template games in local dev.

- [ ] 8) Seed system user (`slop`) in local dev

  **What to do**
  - Add a seed script similar to `api/scripts/seed-economy.ts` inserting into `users`.

  **References**
  - `api/scripts/seed-economy.ts` (wrangler D1 seed pattern)
  - `api/schema.sql` users table

  **Acceptance**
  - Running seed script creates the user locally.

- [ ] 9) Sync template games into DB (dev)

  **What to do**
  - Script or dev init loads template games (`loadAllTestGames`) and calls API `games.syncTemplates`.
  - API upserts under `slop` user, sets `isPublic=1`, stores definition, triggers validation.

  **References**
  - `app/lib/registry/generated/testGames.ts` (loadAllTestGames)
  - `app/app/_layout.tsx` (central app init)
  - `api/src/trpc/routes/games.ts` (new sync endpoint)

  **Acceptance**
  - After app start in dev, seeded games appear in DB listPublic.

- [ ] 10) Update Browse UI to use validation filters and remove archived

  **What to do**
  - Remove archived filter chips from `FilterBar.tsx`.
  - Add validation filter toggle “Include Critical” (default off).
  - Update browse data source to DB list + filtering (templates come from seed sync).
  - Update `GameCard.tsx` to show validation badges.

  **References**
  - `app/app/(tabs)/browse.tsx`
  - `app/components/browse/FilterBar.tsx`
  - `app/components/browse/GameCard.tsx`

  **Acceptance**
  - Browse defaults to hiding critical; toggle shows them.

- [ ] 11) Update Game Detail UI to show counts + top issues

  **What to do**
  - Add section in `app/app/game-detail/[id].tsx` with counts and a short list.

  **Acceptance**
  - Detail page shows critical/warn counts + top issues.

---

## Open Decisions (need confirmation)

1) **Score formula (confirmed)**: `score = clamp(100 - 30*criticalCount - 3*warningCount, 0..100)`.
2) **Top issues count (confirmed)**: N=3.
3) **When to validate (confirmed)**: on every definition save (create/update) regardless of publish.
4) **Staleness (confirmed)**: store `validatorVersion`; expose “stale” indicator; provide manual revalidate (no auto-revalidate).
