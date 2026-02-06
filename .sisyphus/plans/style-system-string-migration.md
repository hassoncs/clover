# Asset Style String Migration Plan

## TL;DR

> **Quick Summary**: Complete the remaining enum-to-string migration for asset style across shared types, API schemas/routes, scripts, tests, and app UI. Keep route contracts as `string`, preserve preset convenience in UI, and rely on backend `resolveStyle()` for preset expansion.
>
> **Deliverables**:
> - Enum references replaced with `string` in all listed migration files
> - `applyThemeToGame` accepts optional style
> - UI supports preset chips/radios plus `Custom` text input
> - Tests updated in tests-after sequence
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Shared contracts -> API routes -> UI integration -> tests/verification

---

## Context

### Original Request
Migrate all remaining references of `'pixel' | 'cartoon' | '3d' | 'flat'` to free-text `string`, add preset+custom UI flow, and propagate style through tRPC/API paths including `applyThemeToGame`.

### Interview Summary
**Key Discussions**:
- Tests strategy set to **tests-after**.
- Backend style preset resolution remains centralized in pipeline (`resolveStyle`).
- UI must support both fast preset selection and arbitrary custom style text.

**Research Findings**:
- Pipeline is already prepared: `api/src/ai/pipeline/types.ts` has `STYLE_PRESETS` + `resolveStyle()`.
- Main blockers are remaining `z.enum([...])` in `api/src/trpc/routes/asset-system.ts` and app-local style unions/options.
- Test infrastructure exists (Vitest); route-level patterns exist and are suitable for tests-after updates.

### Metis-Style Gap Review (applied)
**Identified gaps resolved in this plan**:
- Guardrail added to avoid duplicating preset arrays across UI files.
- Added explicit acceptance criteria for `applyThemeToGame(style?)` propagation.
- Added negative/error QA scenarios for invalid/edge custom style strings.
- Added explicit no-`as any` requirement and typecheck verification.

---

## Work Objectives

### Core Objective
Standardize style as `string` end-to-end while preserving preset shortcuts and custom text input UX without weakening type safety.

### Concrete Deliverables
- `shared/src/types/tilemap.ts` uses `style?: string`.
- `api/src/ai/game/schemas.ts` removes enum-only style schema usage.
- `api/src/trpc/routes/asset-system.ts` accepts string style inputs and passes style through regenerate paths.
- `api/scripts/theme-game.ts` accepts free-text style.
- App editor/play flows support preset + custom string style selection.
- Tests updated for string style in `api/src/ai/__tests__/scenario-integration.test.ts` and relevant route tests.

### Definition of Done
- [ ] No remaining compile-time references to `'pixel' | 'cartoon' | '3d' | 'flat'` style union in target files.
- [ ] All style-bearing route inputs in scope accept `string` (or `string().optional()`).
- [ ] `applyThemeToGame` accepts optional style and persists/uses it in generation path.
- [ ] Preset and custom style both succeed through UI -> API -> prompt build path.
- [ ] `pnpm -w test` target subsets and type checks pass for touched areas.

### Must Have
- Maintain strict typing and inferred schema types; no suppression/comments/casts that bypass checks.
- Keep backend preset resolution in one place (`resolveStyle`) instead of duplicating logic in routes/UI.

### Must NOT Have (Guardrails)
- No new hardcoded enum unions for style.
- No duplicated preset-key arrays in multiple UI files when a shared source can be consumed.
- No behavior changes outside style handling scope.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> All tasks are verified by commands or tool-driven scenarios only.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after
- **Framework**: Vitest

### Agent-Executed QA Scenarios (applies to all tasks)

Scenario: Preset style end-to-end
  Tool: Bash + API route caller tests
  Preconditions: API test env available
  Steps:
    1. Call route/mutation with preset key `pixel`
    2. Assert accepted as string input
    3. Assert downstream prompt context includes style key
    4. Assert `resolveStyle()` expanded text is used in built prompt
  Expected Result: Preset key accepted and expanded consistently
  Failure Indicators: Validation rejects preset key or prompt omits style
  Evidence: test output logs in CI/local run

Scenario: Custom style end-to-end
  Tool: Playwright (or existing UI harness) + API test
  Preconditions: App/editor route available in local run
  Steps:
    1. Open generation UI
    2. Select `Custom` style mode
    3. Enter `dreamy papercraft diorama`
    4. Submit generation/regeneration action
    5. Assert outgoing payload includes exact custom string
    6. Assert API accepts and prompt context contains same string
  Expected Result: Custom string flows untouched to backend resolver
  Failure Indicators: Input blocked, reset, or converted to enum value
  Evidence: screenshot + request/assert logs

Scenario: Empty/invalid style edge handling
  Tool: Route tests
  Preconditions: mutation callable with crafted payload
  Steps:
    1. Send empty string or whitespace style where route allows optional style
    2. Assert behavior matches chosen contract (trim+optional fallback or explicit validation error)
    3. Confirm no runtime crash in prompt build stage
  Expected Result: Deterministic safe handling for empty input
  Failure Indicators: uncaught exception or inconsistent route behavior
  Evidence: failing/passing test assertions

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately)
- Task 1: Shared type + schema contract migration
- Task 2: API route schema updates (string inputs)
- Task 3: CLI script free-text migration

Wave 2 (After Wave 1)
- Task 4: Backend route propagation (`regenerateAssets`, `applyThemeToGame(style?)`)
- Task 5: Shared preset-source extraction for app consumption
- Task 6: App UI/state migration (preset + custom)

Wave 3 (After Wave 2)
- Task 7: Tests-after updates (API + integration + UI behavior tests where present)
- Task 8: Final typecheck/test verification and evidence capture

Critical Path: 1 -> 2 -> 4 -> 6 -> 7 -> 8

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 4,6,7 | 2,3 |
| 2 | None | 4,7 | 1,3 |
| 3 | None | 8 | 1,2 |
| 4 | 1,2 | 6,7 | 5 |
| 5 | 1 | 6 | 4 |
| 6 | 4,5 | 7 | None |
| 7 | 6 | 8 | None |
| 8 | 3,7 | None | None |

---

## TODOs

- [ ] 1. Migrate shared style contract to `string`

  **What to do**:
  - Update `shared/src/types/tilemap.ts` style property to `style?: string`.
  - Update style fields in API game schemas from enum-based to string-based optional fields.
  - Keep naming and exported type signatures stable for downstream consumers.

  **Must NOT do**:
  - Reintroduce style enum unions.

  **Recommended Agent Profile**:
  - **Category**: `quick` (narrow type/schema edits)
  - **Skills**: `test-driven-development` (for verification-first discipline), `systematic-debugging` (if type regressions appear)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2,3)
  - **Blocks**: 4,6,7
  - **Blocked By**: None

  **References**:
  - `shared/src/types/tilemap.ts` - current style union location.
  - `api/src/ai/game/schemas.ts` - `SpriteStyleSchema`, `AssetPackSchema`, `TileSheetSchema` usage.
  - `api/src/ai/pipeline/types.ts` - authoritative style resolver contract.

  **Acceptance Criteria**:
  - [ ] `tilemap` style type is `string | undefined`.
  - [ ] Enum-only schema for sprite style removed/replaced by `z.string().optional()` in relevant schemas.
  - [ ] API compiles without style-type mismatch errors.

- [ ] 2. Convert tRPC style input schemas from enum to string

  **What to do**:
  - In `api/src/trpc/routes/asset-system.ts`, replace style `z.enum([...])` inputs with `z.string()` (or optional string where appropriate).
  - Ensure `regeneratePack` accepts `newStyle` as free-text string.
  - Ensure any other residual `SpriteStyle` references are removed or migrated.

  **Must NOT do**:
  - Add route-level conversion logic that duplicates `resolveStyle()` behavior.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `test-driven-development`, `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1,3)
  - **Blocks**: 4,7
  - **Blocked By**: None

  **References**:
  - `api/src/trpc/routes/asset-system.ts` - `regeneratePack` and residual style enums.
  - `api/src/ai/pipeline/types.ts` - style resolution belongs here.

  **Acceptance Criteria**:
  - [ ] `regeneratePack` input accepts arbitrary non-empty style strings.
  - [ ] No `z.enum(['pixel','cartoon','3d','flat'])` remains in route scope.
  - [ ] Route typing remains inferred and strict.

- [ ] 3. Update CLI theme script to free-text style

  **What to do**:
  - Update `api/scripts/theme-game.ts` to remove fixed style choices and accept free-text style input.
  - Preserve CLI UX with preset suggestion text (not hard validation) where useful.

  **Must NOT do**:
  - Break existing non-style flags or prompt flow.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1,2)
  - **Blocks**: 8
  - **Blocked By**: None

  **References**:
  - `api/scripts/theme-game.ts` - current `choices` definition.
  - `api/scripts/generate-assets.ts` - already-migrated CLI behavior baseline.

  **Acceptance Criteria**:
  - [ ] CLI accepts arbitrary style text.
  - [ ] Preset values still usable as plain strings.

- [ ] 4. Propagate string style through API generation routes (including `applyThemeToGame`)

  **What to do**:
  - Update `regenerateAssets` path in `api/src/trpc/routes/asset-system.ts` to pass style through `buildStructuredPrompt` and downstream pipeline context.
  - Add optional `style` parameter to `applyThemeToGame` input and route logic.
  - Ensure DB writes/reads continue using existing TEXT columns without migration.

  **Must NOT do**:
  - Introduce schema drift between route inputs and service expectations.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `systematic-debugging`, `test-driven-development`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 5)
  - **Blocks**: 6,7
  - **Blocked By**: 1,2

  **References**:
  - `api/src/trpc/routes/asset-system.ts` - `regenerateAssets`, `applyThemeToGame`, `regeneratePack`.
  - `api/src/ai/pipeline/prompt-builder.ts` - style context contract.
  - `api/src/ai/pipeline/stages/index.ts` - prompt stage context wiring.
  - `api/src/ai/pipeline/executor.ts` - run meta style field.

  **Acceptance Criteria**:
  - [ ] `applyThemeToGame` accepts `style?: string`.
  - [ ] `regenerateAssets` sends style into structured prompt flow.
  - [ ] Existing theme-only flows still work when style omitted.

- [ ] 5. Establish a shared preset-key source for app UI

  **What to do**:
  - Define/consume a shared preset key source so UI components do not maintain duplicated style option arrays.
  - Preserve key set: `3d`, `pixel`, `cartoon`, `flat`, `sketch`, `photorealistic`, `watercolor`, `low-poly`, `voxel`, `retro`.
  - Keep import boundaries valid for monorepo target (no forbidden API-to-app runtime coupling).

  **Must NOT do**:
  - Duplicate keys across multiple UI files after migration.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: 6
  - **Blocked By**: 1

  **References**:
  - `api/src/ai/pipeline/types.ts` - canonical preset dictionary.
  - `app/components/editor/Generation/GenerationModal.tsx` - local `STYLE_OPTIONS` to remove.
  - `app/components/editor/AssetGallery/AssetPackSelector.tsx` - local options to remove.
  - `app/app/play/[id].tsx` - hardcoded style buttons.

  **Acceptance Criteria**:
  - [ ] App style controls consume one preset source.
  - [ ] Preset key list includes all required keys.

- [ ] 6. Migrate app style UI/state to string + preset/custom UX

  **What to do**:
  - Update these files to use `string` style state/props instead of enum unions:
    - `app/components/editor/Generation/GenerationModal.tsx`
    - `app/components/editor/AssetGallery/AssetPackSelector.tsx`
    - `app/components/editor/AssetGallery/useAssetGeneration.ts`
    - `app/components/editor/AssetGallery/AssetGalleryPanel.tsx`
    - `app/components/editor/AssetGallery/QuickGenerationForm.tsx`
    - `app/app/play/[id].tsx`
  - Implement preset chips/radios and `Custom` input path; ensure payload always emits a string.
  - Keep UI behavior stable for existing preset quick-select flows.

  **Must NOT do**:
  - Break existing generation actions when style is unset/optional.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`, `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after 4+5)
  - **Blocks**: 7
  - **Blocked By**: 4,5

  **References**:
  - `app/components/editor/Generation/GenerationModal.tsx` - selected style state + pack style props.
  - `app/components/editor/AssetGallery/AssetPackSelector.tsx` - create-pack style handling.
  - `app/components/editor/AssetGallery/useAssetGeneration.ts` - mutation input typing.
  - `app/components/editor/AssetGallery/AssetGalleryPanel.tsx` - quick create style state.
  - `app/components/editor/AssetGallery/QuickGenerationForm.tsx` - style prop contract.
  - `app/app/play/[id].tsx` - style button UI state.

  **Acceptance Criteria**:
  - [ ] Every listed component uses `string` style typing.
  - [ ] Preset selection sets a preset key string.
  - [ ] Custom input sets arbitrary string and submits unchanged.
  - [ ] No UI-local enum union remains.

- [ ] 7. Update tests (tests-after) for string-style behavior

  **What to do**:
  - Update `api/src/ai/__tests__/scenario-integration.test.ts` style typing to `string`.
  - Add/update route tests in `api/src/trpc/routes` for:
    - preset string accepted
    - custom string accepted
    - `applyThemeToGame` optional style support
    - empty/edge style handling expectation
  - Add app-level behavioral tests only where test harness already exists for touched surface.

  **Must NOT do**:
  - Skip negative-path assertions.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `test-driven-development`, `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: 8
  - **Blocked By**: 6

  **References**:
  - `api/src/ai/__tests__/scenario-integration.test.ts` - current enum-style test payloads.
  - `api/src/trpc/routes/asset-system.ts` - route behavior under test.
  - Existing route test files in `api/src/trpc/routes/*.test.ts` - assertion patterns.

  **Acceptance Criteria**:
  - [ ] Scenario integration tests compile with `style: string`.
  - [ ] Route tests validate preset/custom/optional style behavior.
  - [ ] Negative case for empty/invalid style behavior is covered.

- [ ] 8. Final verification, evidence capture, and handoff

  **What to do**:
  - Run scoped checks for touched packages (typecheck + tests).
  - Capture evidence for API and UI scenarios.
  - Confirm no residual old enum literals in target files.

  **Must NOT do**:
  - Claim done without command evidence.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None
  - **Blocked By**: 3,7

  **References**:
  - `package.json` (root) - workspace test command entrypoint.
  - `api/package.json` - API test commands.
  - `app/package.json` - app test commands.

  **Acceptance Criteria**:
  - [ ] Type checks pass for touched workspaces.
  - [ ] Tests pass for changed API/app surfaces.
  - [ ] Evidence artifacts include:
    - `.sisyphus/evidence/style-preset-success.txt`
    - `.sisyphus/evidence/style-custom-success.txt`
    - `.sisyphus/evidence/style-ui-custom-input.png`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1-2 | `refactor(style): migrate shared and route style contracts to string` | shared + api schemas/routes | api typecheck + route tests |
| 3-4 | `feat(style): pass free-text style through generation and theme routes` | api scripts/routes | api tests |
| 5-6 | `feat(ui): add preset and custom style input flow` | app editor/play components | app typecheck/tests |
| 7-8 | `test(style): cover string style flows and edge cases` | api/app tests | full verification |

---

## Success Criteria

### Verification Commands
```bash
pnpm -w test
pnpm --filter api test:run
pnpm --filter app test
```

### Final Checklist
- [ ] All target files migrated to string-style contracts
- [ ] `applyThemeToGame(style?)` implemented and verified
- [ ] Preset + custom UI flow implemented without duplicated preset arrays
- [ ] No `as any` or type-suppression introduced
- [ ] Verification evidence captured for happy and negative scenarios
