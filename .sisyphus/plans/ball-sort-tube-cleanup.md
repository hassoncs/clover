# Ball Sort: Tube Cleanup & Modernization

## TL;DR

> **Quick Summary**: Replace Ball Sort’s 4-entity-per-tube (left/right/bottom/sensor) structure with **one** tube entity per tube (`tube-{i}`) that uses a **sensor collider** for tap detection and a **visual-only** jar look—while preserving all ball positioning logic and ensuring Vitest stays green.
>
> **Deliverables**:
> - New tube template: `tube` (sensor collider with `isSensor: true`, visual rect)
> - Tube entities simplified: `tube-{i}` only
> - Updated action executor to resolve tube dimensions and tap target IDs via `tube-{i}`
> - Updated Ball Sort tests (template assertions + mocks)
>
> **Estimated Effort**: Short
> **Parallel Execution**: YES (2 waves)
> **Critical Path**: Update game definition → update action executor → update tests → run Vitest

---

## Context

### Original Request
- Remove tube walls (`tube-{i}-left/right`) and tube bottom (`tube-{i}-bottom`)
- Keep tap detection, but modernize it to use a sensor collider (`isSensor: true`)
- Add visual-only jar/container (no physics walls)
- Modernize/clean up while preserving gameplay and ball positioning
- Update tests to pass

### Current Implementation (verified)
- File: `app/lib/test-games/games/ballSort/game.ts`
  - Currently spawns per tube:
    - `tube-{i}-left` (template `tubeWall`)
    - `tube-{i}-right` (template `tubeWall`)
    - `tube-{i}-bottom` (template `tubeBottom`)
    - `tube-{i}-sensor` (template `tubeSensor`, tags include `"tube"`)
  - Rules use tap target tag: `trigger: { type: "tap", target: "tube" }`
  - Hover highlight targets tag `tube` (`hoverHighlight.targetTag = "tube"`)

- File: `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`
  - Tube identification from tap input: `/tube-(\d+)-sensor/`
  - Tube dimensions depend on:
    - `tube-{i}-sensor` (center position, height)
    - `tube-{i}-bottom` (used to adjust `bottomY`)

- File: `app/lib/test-games/games/ballSort/__tests__/ballSort.test.ts`
  - Asserts existence of templates: `tubeSensor`, `tubeWall`
  - Mocks `getEntity(id)` for any `id.startsWith('tube-')` (assumes tube-like entities exist)

### Target End State (confirmed decisions)
- Entity ID pattern changes:
  - From: `tube-{i}-sensor`
  - To: `tube-{i}`
- One tube entity per tube (`tube-{i}`)
  - tags include `"tube"` (so existing rules/hover highlighting work unchanged)
  - collider is a **sensor** (`isSensor: true`) with the **same inner dimensions** as today’s `tubeSensor`
  - visual is a simple styled rect for now
- Remove templates entirely:
  - `tubeWall`
  - `tubeBottom`
- Keep `tubeHoverHighlight` template as-is
- Preserve ball positioning by baking bottom padding into tube dimension math:
  - bottom padding = old `TUBE_WALL_THICKNESS`

---

## Work Objectives

### Core Objective
Modernize Ball Sort’s tube structure by removing unnecessary physics wall/bottom entities and unifying tube input + dimension calculations around a single sensor-based tube entity per tube.

### Concrete Deliverables
- `game.ts` produces exactly `NUM_TUBES` tube entities with IDs `tube-0..tube-(NUM_TUBES-1)`
- Only the tube entity is tappable and tagged `tube`
- Tube template uses `isSensor: true` collider; no solid walls/bottom are created
- `BallSortActionExecutor`:
  - resolves tube index from `tube-{i}` ID
  - computes bottomY using tube center/height + bottom padding constant
- `ballSort.test.ts` updated to reflect template rename/removals and to mock tube entities correctly

### Definition of Done
- [ ] `pnpm -C app test` (or repo equivalent) passes (Vitest run)
- [ ] Ball Sort loads and is playable: can pick up and drop balls by tapping tubes
- [ ] Balls render/animate to correct slots in each tube (no vertical drift/regression)

### Must NOT Have (Guardrails)
- No gameplay rule changes (keep existing tap rules and state machine behavior)
- No additional per-tube physical colliders (no non-sensor colliders for tube walls/bottom)
- No extra tube child entities (strict “single tube entity per tube”)
- Avoid changing constants/scales in ways that break existing layout (only remove truly unused constants)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **User wants tests**: YES (update existing tests; add minimal additional tests only if needed)
- **Framework**: Vitest (`app/package.json` → `"test": "vitest run"`)

### Execution Commands (expected)
- `pnpm -C app test` → PASS
- (Recommended) `pnpm -C app tsc --noEmit` → PASS (if this repo expects typecheck gate)

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
├── Task 1: Update Ball Sort game definition (templates + entities)
└── Task 2: Update BallSortActionExecutor (tube ID + dimensions)

Wave 2 (After Wave 1):
└── Task 3: Update Ball Sort tests (template assertions + tube mocks)

Critical Path: Task 1 → Task 2 → Task 3

---

## TODOs

> Note: Implementation + tests are combined per task where possible; keep changes small and verify frequently.

- [ ] 1. Refactor `game.ts` tube templates + entities to single `tube-{i}`

  **What to do**:
  - In `app/lib/test-games/games/ballSort/game.ts`:
    - Remove templates:
      - `tubeWall`
      - `tubeBottom`
    - Rename `tubeSensor` template → `tube`:
      - Keep tags including `"tube"`.
      - Collider:
        - `shape: "box"`
        - `width: TUBE_WIDTH - TUBE_WALL_THICKNESS * 2`
        - `height: TUBE_HEIGHT`
        - `isSensor: true`
      - Visual:
        - simple styled rect (keep current dimensions; adjust color/opacity if desired)
    - Update `createTubeEntities()`:
      - Create only one entity per tube:
        - `id: "tube-{i}"`
        - `template: "tube"`
        - tags: `["tube", `tube-${i}`]` (keep existing tube tag)
        - transform: match current sensor’s transform (x = tube center, y = `cy(TUBE_Y)`)
      - Remove creation of left/right/bottom entities.
    - Clean up constants:
      - Keep `TUBE_WALL_THICKNESS` if still needed for:
        - tube collider width calculation (inner width)
        - bottom padding in ball spawn y offset (currently used)
      - Only remove if fully unused after refactor.

  **Must NOT do**:
  - Do not change rules’ `trigger: { type: "tap", target: "tube" }`.
  - Do not change `tubeHoverHighlight` template.
  - Do not add non-sensor colliders for jar walls.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: small, localized refactor of a game definition file.
  - **Skills**: `verification-before-completion`
    - Reason: ensure tests are run and outcomes reported.
  - **Skills Evaluated but Omitted**:
    - `brainstorming`: requirements already locked.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:
  - `app/lib/test-games/games/ballSort/game.ts:createTubeEntities()`
    - Current tube entity fan-out; replace with single tube entity.
  - `app/lib/test-games/games/ballSort/game.ts:templates.tubeSensor`
    - Source for inner collider dimensions; rename to `tube` and add `isSensor: true`.
  - `app/lib/test-games/games/ballSort/game.ts:rules (tap_tube_*)`
    - Confirms tap target is tag-based (`target: "tube"`) and should remain unchanged.

  **Acceptance Criteria**:
  - [ ] `createBallSortGame(1)` includes `templates.tube` and does NOT include `tubeWall`, `tubeBottom`, `tubeSensor`.
  - [ ] Game definition creates tube entities with IDs `tube-0..tube-5` and tag `tube`.

  **Manual Verification (local runtime)**:
  - [ ] Run app and open Ball Sort; tap a tube and confirm pickup triggers.
  - [ ] Tap another tube and confirm drop animates into target tube.


- [ ] 2. Update `BallSortActionExecutor` for new tube IDs + bottom padding dimension math

  **What to do**:
  - In `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`:
    - Update `getTubeIndexFromInput()`:
      - Match `tube-(\d+)` (no `-sensor` suffix).
    - Update `getTubeDimensions()`:
      - Replace lookups:
        - from `tube-${tubeIndex}-sensor` → `tube-${tubeIndex}`
        - remove lookup of `tube-${tubeIndex}-bottom`
      - Compute tube height from tube entity collider/visual like today.
      - Compute bottomY as:
        - `tubeCenterY - tubeHeight/2 + bottomPadding`
      - Set `bottomPadding` to equal the old `TUBE_WALL_THICKNESS` value.
        - Implementation note: since this file doesn’t import from `game.ts`, define a constant within the executor (document it as “matches Ball Sort tube bottom padding”).
      - Keep topY logic as `tubeCenterY + tubeHeight/2`.

  **Must NOT do**:
  - Don’t change ball spacing/radius heuristics unless required (these are inferred from runtime ball entity).
  - Don’t reintroduce dependency on `tube-{i}-bottom`.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: targeted logic update; minimal blast radius.
  - **Skills**: `verification-before-completion`
    - Reason: validate with tests + manual runtime.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None (but will need Task 1 result for full end-to-end correctness)

  **References**:
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:getTubeDimensions()`
    - Replace entity IDs and remove bottom entity logic.
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:getTubeIndexFromInput()`
    - Update regex to parse `tube-{i}`.
  - `app/lib/test-games/games/ballSort/game.ts:TUBE_WALL_THICKNESS` + ball spawn Y formula
    - Ensures bottom padding matches the existing spawn offset so slots align.

  **Acceptance Criteria**:
  - [ ] With mocked tube entities present, executor can:
    - compute `bottomY` without needing `tube-{i}-bottom`
    - resolve tubeIndex from tap events targeting `tube-{i}`
  - [ ] Existing rules that call this executor continue to function.

  **Manual Verification (local runtime)**:
  - [ ] Pick up from a tube and verify lifted ball’s x aligns with tube center.
  - [ ] Drop into a tube and verify ball settles into correct vertical slot (no sinking below “floor”).


- [ ] 3. Update Ball Sort tests to reflect tube template rename/removals and new tube entity IDs

  **What to do**:
  - In `app/lib/test-games/games/ballSort/__tests__/ballSort.test.ts`:
    - Update template assertions:
      - Expect `game.templates?.tube` defined.
      - Expect `tubeWall`, `tubeBottom`, `tubeSensor` undefined/absent.
    - Update entity manager mocks:
      - The test currently returns a “tube-like” entity for any `id.startsWith('tube-')`.
      - Ensure it supports the new IDs used by the executor:
        - `tube-0`, `tube-1`, ...
      - If any code still requests `tube-{i}-sensor` in the test path, that indicates an executor bug.
    - Add/adjust a small targeted test (if needed) asserting that tap-target parsing supports `tube-{i}` IDs.

  **Must NOT do**:
  - Don’t weaken assertions to “any tube-ish template exists”; keep it specific to prevent regressions.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: localized test maintenance.
  - **Skills**: `verification-before-completion`
    - Reason: tests are the gate.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Tasks 1 & 2

  **References**:
  - `app/lib/test-games/games/ballSort/__tests__/ballSort.test.ts:smoke test 'should have required templates'`
    - Update expectations for template set.
  - `app/lib/test-games/games/ballSort/__tests__/ballSort.test.ts:mockEntityManager.getEntity`
    - Ensure tube entity mocks match new IDs.
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:getTubeIndexFromInput()`
    - Ensure regex aligns with what tests simulate.

  **Acceptance Criteria**:
  - [ ] `pnpm -C app test` → PASS

  **Manual Verification (optional but recommended)**:
  - [ ] Run Ball Sort and validate pickup/drop quickly after tests pass.

---

## Commit Strategy (optional guidance)

If you want atomic commits (recommended):
- After Task 1+2+3 together (since changes are coupled):
  - `refactor(ball-sort): unify tubes into single sensor entity`
  - Verify: `pnpm -C app test`

---

## Success Criteria

### Verification Commands
```bash
pnpm -C app test
# Expected: vitest run passes

# Optional but recommended
pnpm -C app tsc --noEmit
```

### Final Checklist
- [ ] Only `tube-{i}` entities exist (no `-left/-right/-bottom/-sensor` tubes)
- [ ] Tap-to-pickup and tap-to-drop works
- [ ] Balls position correctly in tube slots (bottom padding preserved)
- [ ] Vitest suite passes
