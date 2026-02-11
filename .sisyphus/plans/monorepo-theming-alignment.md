# Monorepo Theming Alignment Plan

## TL;DR

> **Quick Summary**: Establish one semantic theming system for `app/`, `landing/`, and `apps/storybook` by extending `@slopcade/theme`, wiring runtime light/dark mode in app surfaces, and migrating hardcoded styles in controlled waves.
>
> **Deliverables**:
> - Unified token architecture in `packages/theme`
> - Semantic Tailwind tokens consumed by app/landing/storybook
> - Runtime theme mode support (light/dark/system) for app-facing UI
> - Incremental migration of high-impact hardcoded style files
> - CI guardrails preventing new hardcoded color regressions
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 -> Task 2 -> Task 4 -> Task 7 -> Task 9

---

## Context

### Original Request
Create a whole systematic plan to get the whole repository onto clean theming with semantic colors, consistent spacing/style tokens, and easy light/dark switching.

### Interview Summary
**Key Discussions**:
- Scope confirmed as full monorepo (`app/`, `landing/`, `apps/storybook`).
- Goal is holistic theming alignment, not one-off screen styling.
- Plan must support easy future palette updates and dark/light switches.

**Research Findings**:
- `app/tailwind.config.js` currently uses `nativewind/preset` with empty `theme.extend`.
- `app/global.css` has global behavior styles but no semantic theme variables.
- `app/app/_layout.tsx` is root integration point for app-wide providers.
- `packages/theme/src/tokens.ts` exists, but current usage is not unified across all app surfaces.
- Hardcoded style values are widely duplicated across app UI files.

### Metis Review
**Identified Gaps (addressed in this plan)**:
- Explicitly exclude game-rendered visual assets from repo theming migration.
- Add scope guardrails to prevent logic refactors during style migration.
- Add wave-based migration with measurable checkpoints.
- Add CI-level anti-regression checks for hardcoded style reintroduction.

---

## Work Objectives

### Core Objective
Move monorepo UI theming to a single semantic token system that supports runtime light/dark switching and eliminates uncontrolled hardcoded visual primitives in application UI.

### Concrete Deliverables
- `packages/theme` exposes primitive + semantic + mode-aware tokens for shared consumption.
- `app/tailwind.config.js`, `apps/storybook/tailwind.config.js`, and `landing/tailwind.config.mjs` consume aligned semantic tokens.
- App root integrates a theme mode provider and runtime mode application.
- High-traffic UI files in `app/components/editor`, `app/components/social`, and key routes migrated to semantic tokens.
- Lint/CI script enforces "no new hardcoded hex in app UI".

### Definition of Done
- [ ] Semantic tokens are source-of-truth and consumed by all three surfaces.
- [ ] App supports light/dark/system mode switching without code edits.
- [ ] Hardcoded color duplication reduced in migrated target files with grep-verifiable thresholds.
- [ ] Verification suite and QA scenarios pass for each migration wave.
- [ ] Guardrail checks block new hardcoded hex additions in scoped UI paths.

### Must Have
- Shared semantic color model (`background`, `surface`, `text`, `primary`, `success`, `warning`, `danger`, `border`, etc.).
- Shared spacing/radius/typography token usage across monorepo UI surfaces.
- Backward-compatible migration path (no big-bang rewrite).

### Must NOT Have (Guardrails)
- No gameplay/rendering art color rewrites in engine/game definitions.
- No business-logic refactors bundled into theming migration tasks.
- No component API redesign unless required for token plumbing.
- No manual/human-only acceptance criteria.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> Every task is verified by executable commands/tools only. No "user manually confirms" steps are permitted.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after implementation
- **Framework**: Existing repo test stack (`pnpm test`) + typecheck (`pnpm tsc --noEmit`)

### Agent-Executed QA Scenarios (MANDATORY)
Each TODO includes scenario-level verification with concrete commands, assertions, and evidence paths.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Foundation):
- Task 1: Consolidate theme package model
- Task 2: Wire semantic tokens into Tailwind configs
- Task 3: Add runtime theme provider integration points

Wave 2 (Core App Migration):
- Task 4: Migrate editor shell and navigation surfaces
- Task 5: Migrate social/discovery/profile high-traffic surfaces

Wave 3 (Completeness):
- Task 6: Migrate remaining targeted app UI surfaces and normalize spacing/radius usage
- Task 7: Align storybook and landing semantic usage + examples

Wave 4 (Quality Gates):
- Task 8: Add anti-regression lint/CI checks
- Task 9: End-to-end verification, evidence collection, and stabilization

Critical Path: 1 -> 2 -> 4 -> 7 -> 9

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 2, 3 | None |
| 2 | 1 | 4, 5, 7 | 3 |
| 3 | 1 | 4, 5 | 2 |
| 4 | 2, 3 | 6 | 5 |
| 5 | 2, 3 | 6 | 4 |
| 6 | 4, 5 | 9 | 7 |
| 7 | 2 | 9 | 6 |
| 8 | 6, 7 | 9 | None |
| 9 | 6, 7, 8 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|--------------------|
| 1 | 1,2,3 | `task(category="unspecified-high", load_skills=["writing-plans","verification-before-completion"], run_in_background=false)` |
| 2 | 4,5 | `task(category="visual-engineering", load_skills=["frontend-ui-ux","vercel-react-best-practices"], run_in_background=false)` |
| 3 | 6,7 | `task(category="unspecified-high", load_skills=["subagent-driven-development"], run_in_background=false)` |
| 4 | 8,9 | `task(category="quick", load_skills=["verification-before-completion"], run_in_background=false)` |

---

## TODOs

- [ ] 1. Consolidate shared token architecture in `packages/theme`

  **What to do**:
  - Extend `packages/theme/src/tokens.ts` into explicit primitive + semantic + mode maps.
  - Export stable theme API from `packages/theme/src/index.ts`.
  - Add mode-aware helper utilities in `packages/theme/src/utils.ts` for consumers.

  **Must NOT do**:
  - Do not rename package or break existing token import paths.
  - Do not delete existing tokens used by landing/storybook until mapped.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` (shared architecture and API stability)
  - **Skills**: `writing-plans`, `verification-before-completion`
  - **Skills Evaluated but Omitted**: `frontend-ui-ux` (implementation here is token architecture, not visual composition)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1
  - **Blocks**: 2, 3
  - **Blocked By**: None

  **References**:
  - `packages/theme/src/tokens.ts` - existing token schema baseline to extend safely.
  - `packages/theme/src/index.ts` - current export contract that downstream packages import.
  - `packages/theme/src/tailwind.ts` - current Tailwind preset bridge that should consume new semantic tokens.
  - `packages/theme/src/utils.ts` - utility layer for mode/token access patterns.

  **Acceptance Criteria**:
  - [ ] `pnpm --filter @slopcade/theme build` succeeds.
  - [ ] `pnpm tsc --noEmit` succeeds with no token-type regressions.
  - [ ] `packages/theme/src/index.ts` exports semantic and mode APIs used in later tasks.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Theme package compiles with new token model
    Tool: Bash
    Preconditions: Dependencies installed
    Steps:
      1. Run: pnpm --filter @slopcade/theme build
      2. Assert: exit code is 0
      3. Run: pnpm tsc --noEmit
      4. Assert: no errors referencing packages/theme
    Expected Result: Shared theme package build + types pass
    Evidence: .sisyphus/evidence/task-1-theme-build.txt

  Scenario: Consumer imports resolve
    Tool: Bash
    Preconditions: Task 1 changes applied
    Steps:
      1. Run: pnpm --filter @slopcade/theme pack --dry-run
      2. Assert: output includes updated dist files/exports
      3. Run: pnpm --filter @slopcade/ui tsc --noEmit
      4. Assert: no unresolved token imports
    Expected Result: Downstream import surface is intact
    Evidence: .sisyphus/evidence/task-1-consumer-imports.txt
  ```

- [ ] 2. Align Tailwind semantic mapping across app/landing/storybook

  **What to do**:
  - Update `app/tailwind.config.js` to use semantic token names and shared preset hooks.
  - Align `apps/storybook/tailwind.config.js` and `landing/tailwind.config.mjs` to the same semantic vocabulary.
  - Ensure alpha-compatible token format for runtime color blending.

  **Must NOT do**:
  - Do not remove existing class support until migrated surfaces are complete.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `vercel-react-best-practices`, `verification-before-completion`
  - **Skills Evaluated but Omitted**: `git-master` (not a git history operation)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3 once base API from Task 1 exists)
  - **Parallel Group**: Wave 1
  - **Blocks**: 4, 5, 7
  - **Blocked By**: 1

  **References**:
  - `app/tailwind.config.js` - app semantic class source.
  - `apps/storybook/tailwind.config.js` - storybook semantic parity.
  - `landing/tailwind.config.mjs` - landing semantic parity.
  - `packages/theme/src/tailwind.ts` - shared preset entry.

  **Acceptance Criteria**:
  - [ ] Tailwind configs define semantic colors (`background`, `surface`, `text`, `primary`, `border`, status colors).
  - [ ] `pnpm tsc --noEmit` passes after config updates.
  - [ ] Storybook and landing build/test commands still pass.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Semantic classes compile in all surfaces
    Tool: Bash
    Preconditions: Task 2 changes applied
    Steps:
      1. Run: pnpm --filter app tsc --noEmit
      2. Run: pnpm --filter @slopcade/storybook tsc --noEmit || true (if no tsc script, run configured check)
      3. Run: pnpm --filter landing build
      4. Assert: all commands exit 0 (or documented equivalent)
    Expected Result: Shared semantic class config is valid
    Evidence: .sisyphus/evidence/task-2-tailwind-alignment.txt

  Scenario: Legacy classes still render during migration
    Tool: Bash
    Preconditions: Backward compatibility required
    Steps:
      1. Run: grep -n "gray-900\|gray-800" app/components -R
      2. Assert: output exists (legacy still present intentionally)
      3. Run: grep -n "bg-background\|text-text" app/components -R
      4. Assert: semantic usage also exists
    Expected Result: Dual-support migration window confirmed
    Evidence: .sisyphus/evidence/task-2-compat-window.txt
  ```

- [ ] 3. Add runtime theme mode provider and root wiring

  **What to do**:
  - Add `ThemeProvider` + mode context in app theme module.
  - Integrate provider at `app/app/_layout.tsx`.
  - Persist user mode preference and support `light`/`dark`/`system`.

  **Must NOT do**:
  - Do not alter navigation/business routing behavior.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-before-completion`, `subagent-driven-development`
  - **Skills Evaluated but Omitted**: `frontend-ui-ux` (provider plumbing first)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Parallel Group**: Wave 1
  - **Blocks**: 4, 5
  - **Blocked By**: 1

  **References**:
  - `app/app/_layout.tsx` - root provider wiring point.
  - `app/global.css` - location for CSS variable defaults/web-side hooks.
  - `app/lib/utils/storage.ts` - preference persistence utility pattern.

  **Acceptance Criteria**:
  - [ ] App root is wrapped with theme mode provider.
  - [ ] Mode setting persists across reload/app restart.
  - [ ] Runtime mode change updates semantic UI classes without reload.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Theme mode toggles at runtime
    Tool: Playwright
    Preconditions: Dev server running at localhost:8085, theme toggle available in test route/settings
    Steps:
      1. Navigate to app shell route
      2. Trigger mode change: dark -> light
      3. Assert root surface class resolves to light semantic colors
      4. Reload page
      5. Assert selected mode persists
      6. Save screenshot
    Expected Result: Runtime mode switch + persistence works
    Evidence: .sisyphus/evidence/task-3-theme-toggle.png

  Scenario: System mode follows OS preference
    Tool: Playwright
    Preconditions: Browser emulation can set prefers-color-scheme
    Steps:
      1. Set mode to system
      2. Emulate prefers-color-scheme: dark
      3. Assert dark semantic classes applied
      4. Emulate prefers-color-scheme: light
      5. Assert light semantic classes applied
    Expected Result: System mode tracks media query
    Evidence: .sisyphus/evidence/task-3-system-mode.txt
  ```

- [ ] 4. Migrate editor shell and navigation to semantic tokens (high-impact)

  **What to do**:
  - Refactor high-traffic editor shell components from hardcoded hex/gray classes to semantic classes/tokens.
  - Start with top-level layout/shell where cascading impact is highest.

  **Must NOT do**:
  - No logic changes in editor interaction state.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`, `verification-before-completion`
  - **Skills Evaluated but Omitted**: `artistry` (task is systematic migration, not experimental redesign)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: 6
  - **Blocked By**: 2, 3

  **References**:
  - `app/components/editor/EditorTopBar.tsx` - header controls and status colors.
  - `app/components/editor/StageArea.tsx` - major editor background/surface usage.
  - `app/components/editor/FileViewer.tsx` - StyleSheet-heavy semantic conversion pattern.
  - `app/components/editor/Generation/GenerationModal.tsx` - dense hardcoded color hotspot.
  - `app/components/editor/AssetGallery/AssetGalleryPanel.tsx` - dense hotspot requiring semantic mapping.

  **Acceptance Criteria**:
  - [ ] Targeted editor shell files use semantic tokens/classes instead of direct hex literals.
  - [ ] `pnpm tsc --noEmit` passes.
  - [ ] Editor route renders without style/runtime regressions in light and dark mode.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Editor shell visual parity in dark mode
    Tool: Playwright
    Preconditions: Editor route available; test game id fixture exists
    Steps:
      1. Navigate to /editor/{id}
      2. Wait for top bar, stage, side panels visible
      3. Assert key selectors exist and no console style errors
      4. Capture screenshot
    Expected Result: Editor shell loads with semantic token-backed styles
    Evidence: .sisyphus/evidence/task-4-editor-dark.png

  Scenario: Editor shell switches cleanly to light mode
    Tool: Playwright
    Preconditions: Theme mode toggle available
    Steps:
      1. In editor route, toggle to light mode
      2. Assert backgrounds/text/borders remain legible
      3. Assert no panel becomes transparent/unreadable
      4. Capture screenshot
    Expected Result: Editor remains usable in light mode
    Evidence: .sisyphus/evidence/task-4-editor-light.png
  ```

- [ ] 5. Migrate social/discovery/profile surfaces to semantic tokens

  **What to do**:
  - Convert key social/discovery/profile routes and reusable components to semantic classes.
  - Normalize duplicated spacing/radius/font sizing in these surfaces.

  **Must NOT do**:
  - Do not alter feed ordering, interaction behavior, or data loading logic.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`, `vercel-react-best-practices`
  - **Skills Evaluated but Omitted**: `ultrabrain` (not algorithm-heavy)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4)
  - **Parallel Group**: Wave 2
  - **Blocks**: 6
  - **Blocked By**: 2, 3

  **References**:
  - `app/app/discover.tsx` - discovery shell and search affordances.
  - `app/app/(tabs)/profile.tsx` - profile shell, badges, text hierarchy.
  - `app/components/social/SocialFeedCard.tsx` - social card interaction colors.
  - `app/components/social/CommentItem.tsx` - nested text/action states.

  **Acceptance Criteria**:
  - [ ] Targeted social/profile/discovery files no longer introduce new hardcoded hex values.
  - [ ] Semantic classes applied for surface/text/primary/status states.
  - [ ] Light/dark visual checks pass.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Discover and profile remain readable in both modes
    Tool: Playwright
    Preconditions: Seeded app data for profile/discovery
    Steps:
      1. Open /discover in dark mode; assert text contrast and input visibility
      2. Switch to light mode; assert same selectors remain readable
      3. Open /profile and repeat assertions
      4. Save screenshots for both routes/modes
    Expected Result: Both routes preserve usability across modes
    Evidence: .sisyphus/evidence/task-5-discover-profile.png

  Scenario: Social card interaction states remain visible
    Tool: Playwright
    Preconditions: Feed route with cards loaded
    Steps:
      1. Open feed screen
      2. Trigger like/comment/bookmark buttons
      3. Assert active/inactive icon state colors are distinct and semantic
      4. Capture screenshot
    Expected Result: Interaction state styling remains clear in both modes
    Evidence: .sisyphus/evidence/task-5-social-states.png
  ```

- [ ] 6. Complete app-wide targeted migration and spacing/radius normalization

  **What to do**:
  - Migrate remaining in-scope app UI files (excluding engine-rendered gameplay visuals).
  - Normalize repeated spacing/radius/font literals using shared token scale.
  - Ensure StyleSheet values reference theme helpers/tokens where className is not viable.

  **Must NOT do**:
  - Do not force migration of game-definition art colors in examples/game content.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `subagent-driven-development`, `verification-before-completion`
  - **Skills Evaluated but Omitted**: `refactor-swarm` (optional later if volume is extremely high)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 7)
  - **Parallel Group**: Wave 3
  - **Blocks**: 8, 9
  - **Blocked By**: 4, 5

  **References**:
  - `app/components/editor/AssetGallery/AssetPackSelector.tsx` - repeated hardcoded patterns.
  - `app/components/shared/SearchInput.tsx` - reusable input style baseline.
  - `app/components/navigation/AppFrameHeader.tsx` - shared navigation wrapper.
  - `app/components/shared/ErrorBoundary.tsx` - error-state semantic mapping.

  **Acceptance Criteria**:
  - [ ] In-scope app component set migrated to semantic token usage.
  - [ ] Spacing/radius/font values in migrated files map to shared token scale.
  - [ ] Typecheck and tests pass.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: In-scope migration reduces hardcoded hex count
    Tool: Bash
    Preconditions: Defined in-scope path list for migration
    Steps:
      1. Run baseline count command before migration (stored)
      2. Run: grep -R "#[0-9A-Fa-f]\{3,8\}" app/components app/app --include="*.tsx"
      3. Assert: count decreased versus baseline for in-scope paths
      4. Save diff report
    Expected Result: measurable reduction in hardcoded hex literals
    Evidence: .sisyphus/evidence/task-6-hex-reduction.txt

  Scenario: Full app typecheck and tests remain green
    Tool: Bash
    Preconditions: Migration patch applied
    Steps:
      1. Run: pnpm tsc --noEmit
      2. Run: pnpm test
      3. Assert: both exit code 0
    Expected Result: no regressions from migration
    Evidence: .sisyphus/evidence/task-6-verification.txt
  ```

- [ ] 7. Align Storybook and Landing visual system with semantic tokens

  **What to do**:
  - Update Storybook preview/background/theme selectors to semantic token model.
  - Migrate landing Tailwind utility usage to semantic token names where applicable.
  - Ensure documentation/examples demonstrate both modes.

  **Must NOT do**:
  - Do not redesign landing brand identity; only map to semantic infrastructure.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`, `writing-plans`
  - **Skills Evaluated but Omitted**: `every-style-editor` (copy editing not core requirement)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 6)
  - **Parallel Group**: Wave 3
  - **Blocks**: 8, 9
  - **Blocked By**: 2

  **References**:
  - `apps/storybook/.storybook/preview.ts` - current hardcoded light/dark canvas setup.
  - `apps/storybook/tailwind.config.js` - semantic token class mapping.
  - `landing/tailwind.config.mjs` - landing token mapping.
  - `packages/theme/src/tailwind.ts` - shared semantic preset source.

  **Acceptance Criteria**:
  - [ ] Storybook can render components in both semantic light and dark themes.
  - [ ] Landing builds successfully using updated semantic classes.
  - [ ] Shared tokens are consumed consistently.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Storybook light/dark semantic theme verification
    Tool: Playwright
    Preconditions: Storybook running on configured port
    Steps:
      1. Open Storybook iframe and docs shell
      2. Switch to light mode and capture screenshot
      3. Switch to dark mode and capture screenshot
      4. Assert key component stories retain contrast/readability
    Expected Result: Storybook demonstrates valid semantic theming in both modes
    Evidence: .sisyphus/evidence/task-7-storybook-modes.png

  Scenario: Landing semantic classes compile
    Tool: Bash
    Preconditions: Landing workspace available
    Steps:
      1. Run: pnpm --filter landing build
      2. Assert: exit code 0
      3. Optionally run preview smoke command if configured
    Expected Result: Landing builds with semantic token updates
    Evidence: .sisyphus/evidence/task-7-landing-build.txt
  ```

- [ ] 8. Add anti-regression guardrails and CI checks

  **What to do**:
  - Add scripted checks for new hardcoded hex in in-scope UI directories.
  - Add CI wiring so checks run on PR/branch validation.
  - Document allowed exceptions list (game content/art definitions, if explicitly excluded).

  **Must NOT do**:
  - Do not block existing legacy paths until they are migrated; gate only new additions/regressions.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `verification-before-completion`, `git-master`
  - **Skills Evaluated but Omitted**: `frontend-ui-ux` (CI/lint focus)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: 9
  - **Blocked By**: 6, 7

  **References**:
  - `.github/workflows` - CI integration target.
  - `package.json` (root/workspace) - command wiring for checks.
  - `app/components` and `app/app` - primary in-scope scan roots.

  **Acceptance Criteria**:
  - [ ] CI fails when new hardcoded hex appears in scoped paths.
  - [ ] Exception list is explicit and documented.
  - [ ] Local command exists to run same check before commit.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Guardrail script catches regression
    Tool: Bash
    Preconditions: Guardrail script committed
    Steps:
      1. Run local guardrail command
      2. Assert pass on clean branch
      3. Inject temporary sample hardcoded hex in scoped file (in scratch branch)
      4. Re-run guardrail
      5. Assert non-zero exit and precise file output
    Expected Result: script catches and reports regression reliably
    Evidence: .sisyphus/evidence/task-8-guardrail-check.txt
  ```

- [ ] 9. Final verification, evidence bundle, and rollout readiness

  **What to do**:
  - Run complete verification commands and collect evidence artifacts.
  - Validate migration completion matrix against in-scope file list.
  - Prepare rollout notes for `/start-work` execution and parallel dispatch.

  **Must NOT do**:
  - Do not mark complete without evidence files for each wave.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `verification-before-completion`, `requesting-code-review`
  - **Skills Evaluated but Omitted**: `artistry` (verification, not creative work)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 final
  - **Blocks**: None
  - **Blocked By**: 6, 7, 8

  **References**:
  - `.sisyphus/evidence/` - required evidence destination.
  - `.sisyphus/plans/monorepo-theming-alignment.md` - completion checklist source.

  **Acceptance Criteria**:
  - [ ] All wave verification commands pass.
  - [ ] Evidence files exist for each task scenario.
  - [ ] Migration report includes remaining intentional exceptions (if any).

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Final command matrix passes
    Tool: Bash
    Preconditions: All migration tasks complete
    Steps:
      1. Run: pnpm tsc --noEmit
      2. Run: pnpm test
      3. Run workspace build commands used in plan (theme, landing, storybook as configured)
      4. Assert all succeed
    Expected Result: repository remains healthy after migration
    Evidence: .sisyphus/evidence/task-9-final-matrix.txt

  Scenario: Evidence completeness check
    Tool: Bash
    Preconditions: Evidence files generated
    Steps:
      1. List .sisyphus/evidence
      2. Assert required task files exist (task-1 through task-9)
      3. Assert no missing mandatory scenario evidence
    Expected Result: audit trail complete for handoff/review
    Evidence: .sisyphus/evidence/task-9-evidence-index.txt
  ```

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `refactor(theme): add semantic and mode-aware token model` | `packages/theme/src/*` | `pnpm --filter @slopcade/theme build && pnpm tsc --noEmit` |
| 2-3 | `feat(theme): wire semantic tokens and runtime mode provider` | `app/tailwind.config.js`, `app/global.css`, `app/app/_layout.tsx`, theme files | `pnpm tsc --noEmit` |
| 4-5 | `refactor(app): migrate core editor and social surfaces to semantic styles` | targeted app UI files | `pnpm tsc --noEmit && pnpm test` |
| 6-7 | `refactor(ui): align remaining app, storybook, and landing theming` | app/storybook/landing files | workspace builds + tests |
| 8-9 | `chore(theme): add theming guardrails and verification evidence` | CI/check scripts/docs | full matrix |

---

## Success Criteria

### Verification Commands
```bash
pnpm tsc --noEmit
pnpm test
pnpm --filter @slopcade/theme build
pnpm --filter landing build
```

### Final Checklist
- [ ] Shared semantic token system is active across app/landing/storybook.
- [ ] App supports light/dark/system runtime mode.
- [ ] Target migration file set has no unapproved hardcoded color literals.
- [ ] Guardrails prevent reintroduction of style-token drift.
- [ ] Evidence artifacts exist in `.sisyphus/evidence/` for each task.
