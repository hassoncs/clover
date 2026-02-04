# Embed asset URLs into templates before Godot load

## TL;DR

> **Quick Summary**: Stop syncing images to entities after load. Instead, inject resolved asset URLs into `definition.templates[*].visual.url` before `bridge.loadGame()`, letting Godot’s existing `visual.url` download path apply images automatically on spawn.
>
> **Deliverables**:
> - Production loader (`app/app/play/[id].tsx`) enriches definitions via `mergeAssetsIntoTemplates(...)` prior to mounting the runtime
> - Runtime-side per-entity `bridge.setEntityImage(...)` sync loop removed from `GameRuntime.godot.tsx`
> - Targeted console logging that traces: pack resolution → merge → loadGame → spawn visuals
> - Verification on **ballSort** (test-games and play) + unit tests for merge behavior
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Add enrichment in play → remove runtime sync effect → verify ballSort

---

## Context

### Original Request
Asset loading is overly complicated:
- React fetches game JSON + asset pack separately
- React passes game JSON to Godot (entities spawn without images)
- React then calls `bridge.setEntityImage(entityId, url, w, h)` for every entity in a useEffect
- This creates timing coordination problems (bridge ready / game loaded / assets resolved)

### Current State (verified)

**React mapping**
- `resolvedPackEntries` is a `Record<templateId, ResolvedPackEntry>` keyed by **templateId**.
  - Test games: `app/app/test-games/[id].tsx`
  - Production: `app/app/play/[id].tsx`

**Existing builder function**
- `app/lib/assets/mergeAssetsIntoTemplates.ts` already:
  - clones the `GameDefinition`
  - injects `template.visual.url = asset.imageUrl` for `visual.type === 'image'`
  - merges placement to `scale/offsetX/offsetY`
  - logs merged templates + total count

**Runtime sync loop to remove**
- `app/lib/game-engine/GameRuntime.godot.tsx` contains a `useEffect([assets, isReady])` that:
  - iterates `game.entityManager.getAllEntities()`
  - maps `entity.template → assets[entity.template]`
  - calls `bridge.setEntityImage(entity.id, asset.imageUrl, width, height)`

**Godot already supports `visual.url`** (no changes desired)
- `godot_project/scripts/entity/EntityFactory.gd` creates entities and calls `_add_visual`.
- `godot_project/scripts/bridge/VisualRenderer.gd` routes `type == "image"` → `_add_image_sprite`.
- `_add_image_sprite` resolves URL via `AssetUtils.resolve_url(sprite_data, _bridge)`:
  - if URL is empty: creates an empty sprite and returns
  - else: downloads/loads and applies texture

### Metis Review (gaps addressed in this plan)
- **Dynamic asset updates**: pack switching already remounts runtime in play; single-asset regenerate may not → plan includes a remount step.
- **Backward compatibility**: keep `assets` prop + `bridge.setEntityImage` API intact; remove only the automatic sync loop.
- **Verification**: explicit checks for “old logs gone, new logs present” + screenshots.

---

## Work Objectives

### Core Objective
Make asset application deterministic by enriching game templates with image URLs before the engine loads, eliminating the need for post-load per-entity image synchronization.

### Concrete Deliverables
- `app/app/play/[id].tsx`: compute `enrichedDefinition = mergeAssetsIntoTemplates(gameDefinition, resolvedPackEntries)` and pass it to the runtime.
- `app/lib/game-engine/GameRuntime.godot.tsx`: remove the `useEffect` that calls `bridge.setEntityImage` for each entity.
- Back-compat and clarity:
  - keep the `assets` prop type for now (deprecated)
  - remove reliance on it inside runtime
- Logging:
  - play/test-games: log when enrichment happens (asset counts + template keys)
  - runtime: log enriched template stats at load time (e.g., how many image templates have url)

### Definition of Done
- ballSort renders with correct images **without** any runtime asset sync loop.
- Typecheck + tests pass.

### Must NOT Have (Guardrails)
- Do **not** modify Godot behavior (no changes to VisualRenderer/EntityFactory unless a proven bug is found).
- Do **not** introduce a new asset pipeline or new source of truth.
- Do **not** keep a “sync every entity image” loop as a permanent mechanism.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> All verification is executed by the agent using commands/tools (Vitest, TypeScript compiler, Playwright). No manual clicking or “eyeballing” is allowed.

### Test Decision
- **Infrastructure exists**: YES (Vitest in `app/`)
- **Automated tests**: YES (Tests-after is sufficient; TDD optional for small pure function)
- **Framework**: Vitest (`app/package.json`)

### Agent-Executed QA Scenarios (project-specific)

**Services (must use DevMux)**
- Start stack via root scripts:
  - `pnpm dev` (ensures metro :8085, api :8789, godot watcher)
  - `pnpm web` (ensures web)

**Web entrypoint**
- Expo web on **http://localhost:8085** (from `app/package.json` port 8085)

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (safe, low coupling):
1) Add/extend unit tests for `mergeAssetsIntoTemplates`
2) Add production enrichment in `play/[id].tsx`

Wave 2 (integration / behavior change):
3) Remove `GameRuntime` asset sync useEffect
4) Add logging + ballSort verification (test-games + play)

Critical Path: Wave 1.2 → Wave 2.3 → Wave 2.4

---

## TODOs

> Implementation + test = ONE task. Each task includes agent-executed verification.

### 1) Unit tests for template enrichment (mergeAssetsIntoTemplates)

**What to do**:
- Add a Vitest test file under `app/lib/assets/**` (Vitest includes `lib/**/*.test.ts`).
- Test cases (pure function behavior):
  1. Returns original definition when `assets` is `undefined`
  2. Injects `visual.url` for image templates with matching asset entry
  3. Does **not** overwrite non-image visuals
  4. Merges placement (`scale`, `offsetX`, `offsetY`) when present
  5. Leaves existing `visual.url` untouched when asset entry is missing

**Must NOT do**:
- Don’t snapshot entire definitions; assert on the specific fields.
- Don’t require DOM or Godot bridge.

**Recommended Agent Profile**:
- **Category**: quick
  - Reason: small, isolated unit tests
- **Skills**: `test-driven-development`, `systematic-debugging`
  - `test-driven-development`: keep the test contract crisp
  - `systematic-debugging`: reduce brittleness / identify edge cases

**Parallelization**:
- Can Run In Parallel: YES
- Parallel Group: Wave 1 (with Task 2)
- Blocks: Task 4 (final verification)
- Blocked By: None

**References**:
- `app/lib/assets/mergeAssetsIntoTemplates.ts` — function under test
- `app/vitest.config.mjs` — test include paths
- `app/lib/assets/AssetManifest.ts:ResolvedPackEntry` — asset entry shape

**Acceptance Criteria**:
- `cd app && pnpm test` → PASS
- Test file covers all 5 cases above with explicit assertions.

**Agent-Executed QA Scenarios**:
```
Scenario: Unit tests validate URL injection
  Tool: Bash
  Preconditions: repo dependencies installed
  Steps:
    1. Run: cd app && pnpm test
    2. Assert: exit code 0
    3. Assert: test output includes the new test file and all tests pass
  Expected Result: mergeAssetsIntoTemplates behavior is locked down
  Evidence: command output captured in transcript
```

---

### 2) Enrich production game definitions before runtime mount (play/[id].tsx)

**What to do**:
- Add `mergeAssetsIntoTemplates` to the production play screen:
  - Compute `enrichedDefinition` using `useMemo` (same pattern as test-games).
  - Ensure the runtime receives `enrichedDefinition` (not raw `gameDefinition`).
- Add a console log around merge:
  - `{ hasAssets, assetCount, sampleKeys, imageTemplateCountWithUrl }`

**Must NOT do**:
- Don’t change tRPC asset resolution logic.
- Don’t change Godot preload pipeline (`useGamePreloader`) unless needed.

**Recommended Agent Profile**:
- **Category**: unspecified-high
  - Reason: production path change with runtime behavior implications
- **Skills**: `systematic-debugging`, `vercel-react-best-practices`
  - `systematic-debugging`: avoid subtle memoization / lifecycle bugs
  - `vercel-react-best-practices`: avoid unnecessary rerenders and unstable deps

**Parallelization**:
- Can Run In Parallel: YES
- Parallel Group: Wave 1 (with Task 1)
- Blocks: Task 4
- Blocked By: None

**References**:
- `app/app/play/[id].tsx` — production loader
- `app/app/test-games/[id].tsx` — proven enrichment pattern (already uses merge)
- `app/lib/assets/mergeAssetsIntoTemplates.ts` — builder

**Acceptance Criteria**:
- Play screen compiles and mounts runtime using enriched definition.
- Console log indicates merge executed and reports non-zero merged count for **some** game with a resolved asset pack in `/play`.

**Agent-Executed QA Scenarios**:
```
Scenario: Production play enriches templates before runtime
  Tool: Playwright (playwright skill)
  Preconditions: pnpm dev + pnpm web running
  Steps:
    1. Navigate to: http://localhost:8085/play/slopeggle
    2. If slopeggle is unavailable, retry with another known seeded game id (e.g., breakoutBouncer, breakoutScripted)
    3. Wait for canvas/runtime container to appear (timeout: 20s)
    4. Collect browser console logs
    5. Assert: logs contain "Merging assets into game definition" (or equivalent new log)
    6. Screenshot: .sisyphus/evidence/task-2-play-enrichment.png
  Expected Result: Game loads and enrichment log appears before gameplay
  Evidence: screenshot + console log capture
```

---

### 3) Remove the runtime per-entity image sync loop (GameRuntime.godot.tsx)

**What to do**:
- Remove the `useEffect([assets, isReady])` that iterates entities and calls `bridge.setEntityImage(...)`.
- Keep the `assets` prop in the component signature/type for now, but:
  - mark it deprecated in types/docs (inline JSDoc)
  - ensure runtime no longer depends on it
- Add a single runtime log (at init time) that summarizes how many templates have `visual.type==='image'` and how many have `visual.url`.

**Must NOT do**:
- Do not remove `bridge.setEntityImage` API itself.
- Do not introduce new timing gates.

**Recommended Agent Profile**:
- **Category**: unspecified-high
  - Reason: removing behavior can cause subtle regressions
- **Skills**: `systematic-debugging`, `verification-before-completion`
  - `systematic-debugging`: ensure no hidden dependencies on assets prop
  - `verification-before-completion`: enforce evidence-based verification

**Parallelization**:
- Can Run In Parallel: NO
- Parallel Group: Wave 2 (after Tasks 1–2)
- Blocks: Task 4
- Blocked By: Task 2

**References**:
- `app/lib/game-engine/GameRuntime.godot.tsx` — effect to remove (around lines ~886–927)
- `app/lib/assets/AssetManifest.ts:ResolvedPackEntry` — assets prop shape
- Godot side (for confidence):
  - `godot_project/scripts/bridge/VisualRenderer.gd` — `_add_image_sprite` uses resolved URL
  - `godot_project/scripts/entity/EntityFactory.gd` — visuals created on spawn

**Acceptance Criteria**:
- No code path in `GameRuntime.godot.tsx` calls `bridge.setEntityImage` automatically based on `assets`.
- `cd app && pnpm tsc --noEmit` → PASS

**Agent-Executed QA Scenarios**:
```
Scenario: Legacy sync loop no longer runs
  Tool: Playwright (playwright skill)
  Preconditions: pnpm dev + pnpm web running
  Steps:
    1. Navigate to: http://localhost:8085/test-games/ballSort
    2. Collect console logs
    3. Assert: logs do NOT contain "Asset sync useEffect triggered" or "Syncing assets to entities"
    4. Assert: logs contain mergeAssetsIntoTemplates merged-count summary
    5. Screenshot: .sisyphus/evidence/task-3-no-sync-loop.png
  Expected Result: ballSort loads; old sync-loop logs absent
  Evidence: screenshot + console log capture
```

---

### 4) Handle dynamic asset updates + end-to-end verification on ballSort

**What to do**:
- Ensure that when assets change in production UI flows (especially “regenerate asset”), the runtime picks up new URLs deterministically.
  - Recommended: on single asset regeneration completion, increment `runtimeKey` to remount runtime (same strategy as pack switching).
  - Alternatively: explicitly document that regenerate requires restart/remount.
- Ensure both routes behave:
  - `test-games/ballSort` (local pack server + merge + spawn)
  - `play/ballSort` (tRPC pack + merge + spawn)
- Add or tune console logs so the trace is clear but not excessively spammy:
  - pack resolution count
  - merged templates count
  - runtime init summary (image templates with url)

**Must NOT do**:
- Don’t add a new runtime syncing system.

**Recommended Agent Profile**:
- **Category**: unspecified-high
  - Reason: cross-cutting integration verification
- **Skills**: `playwright`, `systematic-debugging`
  - `playwright`: deterministic E2E verification with screenshots
  - `systematic-debugging`: isolate regressions quickly

**Parallelization**:
- Can Run In Parallel: NO
- Parallel Group: Wave 2 (final)
- Blocks: none
- Blocked By: Tasks 1–3

**References**:
- `app/app/test-games/[id].tsx` — already uses `mergeAssetsIntoTemplates` and logs resolution
- `app/app/play/[id].tsx` — add enrichment + remount on regenerate
- `app/lib/assets/mergeAssetsIntoTemplates.ts` — logs and injected fields
- `games/compiled/ballSort/game.ts` — templates (`tube`, `ball0..ball7`) expected in pack entries

**Acceptance Criteria**:
- **ballSort** loads with images on first spawn on both routes.
- Screenshots captured for both routes.
- `cd app && pnpm test` → PASS
- `cd app && pnpm tsc --noEmit` → PASS

**Agent-Executed QA Scenarios**:
```
Scenario: ballSort images load in test-games route
  Tool: Playwright (playwright skill)
  Preconditions: pnpm dev + pnpm web running
  Steps:
    1. Navigate to: http://localhost:8085/test-games/ballSort
    2. Wait for runtime ready signal or main canvas visible (timeout: 30s)
    3. Screenshot: .sisyphus/evidence/task-4-tests-ballSort.png
    4. Collect console logs
    5. Assert: logs contain "[mergeAssetsIntoTemplates] 📦 Merged" with mergedCount > 0
  Expected Result: Gameplay visible with rendered sprites
  Evidence: screenshot + console log capture

Scenario: (Best-effort) ballSort images load in play route
  Tool: Playwright (playwright skill)
  Preconditions: pnpm dev + pnpm web running
  Steps:
    1. Navigate to: http://localhost:8085/play/slopeggle
    2. If slopeggle is unavailable, navigate to another known playable game id with an asset pack and verify the same merge/log behavior
    3. Wait for runtime container/canvas visible (timeout: 30s)
    4. Screenshot: .sisyphus/evidence/task-4-play-ballSort.png
    5. Collect console logs
    6. Assert: logs contain play merge log + mergeAssetsIntoTemplates merged-count summary
  Expected Result: Production play route uses template-enrichment (no post-load syncing) on a real DB-backed game
  Evidence: screenshot + console log capture
```

---

## Rollback Strategy

### Fast rollback (preferred)
- Revert the commit(s) that:
  1) removed the `GameRuntime` asset sync `useEffect`, and/or
  2) changed play to use enrichedDefinition

This restores the old “React sync images after load” behavior immediately.

### Safe rollback guardrails
- Keep `bridge.setEntityImage(...)` API unchanged throughout.
- Keep `mergeAssetsIntoTemplates(...)` additive and isolated; it can remain even if the runtime sync loop comes back.

### Debugging rollback decision tree
- If images fail to render on spawn:
  - Confirm merged template URLs exist via console logs
  - If URLs are missing → rollback play/test-games enrichment changes
  - If URLs exist but Godot doesn’t download → investigate `AssetUtils.resolve_url` / bridge URL handling; rollback runtime change only if needed

---

## Success Criteria

### Verification Commands
```bash
# Typecheck (app workspace)
cd app && pnpm tsc --noEmit

# Unit tests (app workspace)
cd app && pnpm test
```

### Final Checklist
- [ ] Production play route enriches templates before runtime mount
- [ ] GameRuntime no longer applies images via `bridge.setEntityImage` loop
- [ ] ballSort renders correctly via template `visual.url` on spawn
- [ ] Logs clearly show: pack resolved → merge executed → runtime initialized
- [ ] Typecheck + tests pass
