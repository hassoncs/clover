# Ball Sort: tube hover highlight overlay

## TL;DR

Add a **single reusable** visual-only highlight entity to Ball Sort and a small **runtime hover system** that, each frame, checks `ctx.input.mouse` against `tube-*-sensor` bounds and **moves/shows/hides** the highlight. Highlight draws **above balls/tubes**, uses `#FFFFFF66`, and never intercepts taps (no collider).

**Deliverables**
- Ball Sort game definition updated with a `tubeHoverHighlight` template and a hidden `tube-hover-highlight` entity.
- New `BallSortHoverRuntimeSystem` registered in the system runner.
- Unit tests for hover hit-testing + show/hide behavior.

**Estimated Effort**: Short
**Parallel Execution**: YES (2 waves)
**Critical Path**: Add highlight entity/template → Add runtime system → Verify layering & interactions

---

## Context

### Original Request
Add mouse hover effect to Ball Sort tubes: when hovering over a tube, draw a semi-transparent white rectangle overlay covering the entire tube (including balls), clear when leaving.

### Confirmed Requirements
- Hover works while **holding a ball** (helps targeting drop).
- Hover hit-testing matches `tube-*-sensor` **collider bounds**.
- Overlay color: `#FFFFFF66`.
- Single reusable highlight entity, moved between tubes.
- Highlight has **no collider** and **must not intercept taps**.
- Highlight renders **above tube + balls**.

### Codebase Anchors (verified paths)
- Ball Sort definition: `app/lib/test-games/games/ballSort/game.ts`
- Ball Sort actions: `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`
- Mouse state in runtime: `app/lib/game-engine/GameRuntime.godot.tsx` (sets/clears `inputRef.current.mouse`)
- Layering: `app/lib/game-engine/EntityManager.ts` (`getVisibleEntities()` sorts by `layer`)
- Match3 reference pattern: `app/lib/game-engine/systems/runner/wrappers/Match3RuntimeSystem.ts` (reads `ctx.input.mouse` each frame)

---

## Work Objectives

### Core Objective
Implement Ball Sort tube hover highlighting using existing engine input (`ctx.input.mouse`) and entity layering.

### Concrete Deliverables
- New highlight entity `tube-hover-highlight` in Ball Sort game definition, initially hidden.
- New runtime system that:
  - Detects hovered tube sensor by AABB contains test
  - Moves highlight to that sensor’s center
  - Sets highlight `visible` true/false

### Definition of Done
- Hovering the mouse over each tube shows a white semi-transparent overlay above balls.
- Moving mouse off any tube or leaving the canvas hides the overlay.
- Taps still target `tube-*-sensor` (highlight never becomes a tap target).
- `pnpm -C app test` passes.

### Must NOT Have (Guardrails)
- Do **not** add collider/physics to the highlight entity.
- Do **not** tag highlight as `tube` (avoid interference with tube targeting/queries).
- Do **not** route hover through action executors (hover is continuous state, not discrete rules action).
- Do **not** change Ball Sort rules behavior (tap pickup/drop should remain unchanged).

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (`app/vitest.config.mjs`)
- **User wants tests**: YES (tests-after is fine; unit tests for hover selection logic)
- **Framework**: Vitest (`pnpm -C app test`)

### Manual QA (required even with tests)
- Web hover verification via mouse movement on the game canvas.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1:
- Task 1 (Ball Sort templates/entities)
- Task 2 (Runtime system scaffolding)

Wave 2 (after Wave 1):
- Task 3 (Unit tests)
- Task 4 (Manual verification + polish)

Critical Path: Task 1 → Task 2 → Task 4

---

## TODOs

> Implementation + tests are included together where practical.

### 1) Add highlight template + entity to Ball Sort definition

**What to do**
- Edit `app/lib/test-games/games/ballSort/game.ts`:
  - Add a new template, e.g. `tubeHoverHighlight`:
    - `visual`: `rect`, `color: "#FFFFFF66"`
    - `width`: cover the whole tube area (recommend `TUBE_WIDTH` plus a small padding factor, e.g. `TUBE_WIDTH * 1.05`)
    - `height`: `TUBE_HEIGHT * 1.02` (small padding to ensure wall coverage)
    - `layer`: set high enough to render above balls/tubes (recommend `layer: 500` or higher)
    - **No collider** (omit `collider`)
    - tags: `['highlight','hover','sys.ballSort:hover']` (NOT `tube`)
  - Add a single entity instance to `entities` array:
    - `id: 'tube-hover-highlight'`
    - `template: 'tubeHoverHighlight'`
    - `visible: false`
    - position can be `{ x: 0, y: 0 }` (it will be moved by runtime system)

**Must NOT do**
- Do not include a collider.
- Do not tag as `tube`.

**Recommended Agent Profile**
- **Category**: `quick`
  - Reason: localized game-definition edits.
- **Skills**: (none required)

**Parallelization**
- Can run in parallel: YES (with Task 2)

**References**
- `app/lib/test-games/games/ballSort/game.ts`:
  - `tubeSensor` template (dimensions reference)
  - tube constants: `TUBE_WIDTH`, `TUBE_HEIGHT`, `TUBE_WALL_THICKNESS`
- `app/lib/test-games/games/gemCrush/game.ts`:
  - `hover_highlight` template for color/visual convention

**Acceptance Criteria**
- [ ] `tubeHoverHighlight` template exists with `color: "#FFFFFF66"`
- [ ] `tube-hover-highlight` entity exists and starts `visible: false`
- [ ] Highlight has no collider fields

**Manual Verification**
- [ ] Start app and load Ball Sort; confirm no highlight is visible at rest.

---

### 2) Add Ball Sort hover runtime system (continuous)

**What to do**
- Create new runtime system wrapper:
  - File: `app/lib/game-engine/systems/runner/wrappers/BallSortHoverRuntimeSystem.ts`
  - Implement `RuntimeSystem` with:
    - `id`: `ballsort-hover`
    - `phase`: `SystemPhase.GAME_LOGIC`
    - `priority`: e.g. `90`
  - `initialize(ctx)`:
    - cache `SystemContext` (bridge + entityManager)
    - ensure highlight entity exists (lookup by id `tube-hover-highlight`); if not, system is effectively a no-op.
  - `update(ctx, state)`:
    - If `ctx.input.mouse` is missing: hide highlight (`entityManager.setEntityVisible('tube-hover-highlight', false)`), clear state.
    - Else:
      - Determine hovered sensor by iterating current `entityManager.getEntitiesByTag('tube')` and filtering IDs matching `/^tube-(\d+)-sensor$/`.
      - For each sensor, compute AABB using `sensor.transform.x/y` and collider width/height (fallback to visual width/height).
      - If `mouse.worldX/worldY` is inside, select that sensor.
      - If selection changes:
        - Move highlight to selected sensor center via `ctx.bridge.setPosition('tube-hover-highlight', x, y)` (web/native) AND update entity transform + `entityManager.updateWorldTransforms` if needed by patterns.
        - Set highlight visible true.
      - If none selected: set highlight visible false.
  - `destroy()` should clean references.

**Integration**
- Export from `app/lib/game-engine/systems/runner/wrappers/index.ts`.
- Register in `app/lib/game-engine/GameRuntime.godot.tsx` during runner setup, similar to Match3/SlotMachine wrappers.
  - Recommended: register unconditionally (safe no-op for non-BallSort because highlight entity won’t exist).

**Must NOT do**
- Do not use Rules actions/executors for hover.
- Do not rely on physics `queryPoint` for hover (it could return balls/tube walls; we want sensor-bounds AABB test).

**Recommended Agent Profile**
- **Category**: `unspecified-high`
  - Reason: new engine system touches runtime loop + entity transforms.
- **Skills**: `systematic-debugging`
  - Reason: verify transform/visibility behavior in the live runner.

**Parallelization**
- Can run in parallel: YES (with Task 1)
- Blocks: Task 4 (manual verification)

**References**
- `app/lib/game-engine/systems/runner/wrappers/Match3RuntimeSystem.ts`:
  - pattern for reading `ctx.input.mouse` each frame
- `app/lib/game-engine/EntityManager.ts`:
  - `setEntityVisible(id, visible)`
  - `getEntitiesByTag(tag)`
  - `getVisibleEntities()` sorting by `layer` (reason we set highlight layer high)
- `app/lib/game-engine/GameRuntime.godot.tsx`:
  - how systems are registered into `GameSystemRunner`
  - how mouse leave clears `inputRef.current.mouse`

**Acceptance Criteria**
- [ ] Hovering over a tube sensor shows highlight; leaving hides it.
- [ ] Highlight never becomes the tap target (no collider, no `tube` tag).

**Manual Verification**
- [ ] On web: move mouse across tubes; highlight follows.
- [ ] Move mouse outside canvas: highlight clears.

---

### 3) Add unit tests for hover selection + visibility toggling

**What to do**
- Add `app/lib/game-engine/systems/runner/wrappers/__tests__/BallSortHoverRuntimeSystem.test.ts` (Vitest).
- Focus on deterministic logic:
  - Given sensors with known positions/sizes and mouse point, hovered id is correct.
  - If mouse is undefined, highlight is hidden.
  - If mouse moves from tube A to tube B, highlight updates position/visible.
- Use existing runner/system test patterns as reference.

**Recommended Agent Profile**
- **Category**: `quick`
- **Skills**: `test-driven-development` (optional; tests can be written after implementation)

**References**
- `app/lib/game-engine/systems/runner/__tests__/GameSystemRunner.test.ts` (system runner testing patterns)
- `app/vitest.config.mjs` (test include pattern)

**Acceptance Criteria**
- [ ] `pnpm -C app test` → PASS

---

### 4) Manual verification + polish (layering, sizing, edge cases)

**What to do**
- Verify highlight layer is above balls (if not, raise template `layer` further).
- Verify highlight bounds feel correct (tweak width/height padding if necessary).
- Verify that while holding a ball (state `holding`), hover still functions.

**Manual Verification Steps**
- [ ] Start dev server: `pnpm dev`
- [ ] Open Ball Sort (web): `pnpm --filter app dev:web` (or load via existing test-games UI)
- [ ] Move mouse across each tube; confirm overlay sits above balls.
- [ ] Click tube to pick up ball; hover another tube; overlay shows target tube.
- [ ] Move mouse off tubes and off canvas; overlay hides.

**Acceptance Criteria**
- [ ] Visual overlay always appears above balls/tube visuals.
- [ ] No tap targeting regression.

---

## Commit Strategy (suggested)

1. `feat(ballsort): add tube hover highlight entity/template`
2. `feat(game-engine): add BallSort hover runtime system`
3. `test(game-engine): cover ballsort hover selection`

---

## Success Criteria

### Verification Commands
```bash
pnpm -C app test
```

### Final Checklist
- [ ] Hover highlight works on web mouse input.
- [ ] Highlight entity has no collider and never captures taps.
- [ ] Layering is correct (overlay drawn above balls).
- [ ] Tests pass.
