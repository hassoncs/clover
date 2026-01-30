# Ball Sort: Fix pickup positioning + drop interaction

## Context

### User request summary
- Fix two bugs in Ball Sort:
  1. Picked-up ball appears between tubes instead of floating above the source tube.
  2. After picking up, the ball cannot be placed into another tube.
- Verify the game can be played and **won** successfully.

### Key code references (provided + verified)
- Game definition (layout + world scaling):
  - `app/lib/test-games/games/ballSort/game.ts`
- Action executor (pickup/drop logic):
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`

### Current findings (from repo inspection)
- **Drop positioning math** in `executeDrop` appears internally consistent: computes slot index from `tube{target}_count` and places via `tube-${target}-sensor.transform.x` + `ballY` math.
- **Pickup positioning math** is likely incorrect:
  - `executePickup` uses hardcoded constants (`WORLD_HEIGHT=16`, `TUBE_Y=10`, etc.) and `cy()` conversion.
  - The game definition uses a different world size (`WORLD_HEIGHT=25.6`) and its own `cy()` conversion.
  - This mismatch strongly suggests the picked-up ball is being positioned in the wrong coordinate space.

### Working hypotheses to validate during execution
1. Pickup should compute the held ball’s display position in **runtime world coordinates** based on the tube sensor entity’s transform (and optionally collider height), not a second `cy()` conversion.
2. “Cannot drop” is likely caused by one of:
   - the held ball’s incorrect position interfering with tap targeting,
   - drop validation rejecting moves (full tube / different top color) with unclear feedback,
   - a state/variable mismatch where `sourceTubeIndex`/`heldBallId`/`heldBallColor` is not properly set or is cleared unexpectedly.

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| 1. Reproduce and instrument the bugs | None | Need baseline behavior + measurements before changing logic |
| 2. Fix pickup positioning (above source tube) | 1 | Must validate root cause and use captured coordinates to design correct placement |
| 3. Fix drop interaction (able to place into other tubes) | 1, 2 | Drop issue may be caused by pickup-position bug; ensure pickup is correct before assessing remaining drop failures |
| 4. Add/extend tests (or deterministic simulation) for pickup/drop | 2, 3 | Tests should reflect the corrected behavior |
| 5. End-to-end verification: playable + win | 2, 3 | Only meaningful after both fixes land |

---

## Parallel Execution Graph

Wave 1 (Start immediately):
├── Task 1: Reproduce and instrument the bugs (no dependencies)
└── Task 4: Identify/add test hooks/patterns (partial: can start exploring test patterns, but final assertions depend on fixes)

Wave 2 (After Wave 1 completes):
├── Task 2: Fix pickup positioning (depends: Task 1)
└── Task 3: Fix drop interaction (depends: Task 1, ideally after Task 2)

Wave 3 (After Wave 2 completes):
├── Task 4 (complete): Implement tests or scripted verification (depends: Task 2, Task 3)
└── Task 5: End-to-end verification (depends: Task 2, Task 3)

Critical Path: Task 1 → Task 2 → Task 3 → Task 5
Estimated Parallel Speedup: ~20–30% (Task 4 exploration overlaps with Task 1)

---

## Tasks

### Task 1: Reproduce + instrument pickup/drop in Ball Sort

**Description**: Establish a deterministic reproduction for both bugs and capture enough runtime state to confirm whether the executor is using the wrong coordinate space and/or losing drop eligibility.

**Delegation Recommendation:**
- Category: `unspecified-high` – Multi-surface debugging (input targeting + rules + transforms) with tight reasoning.
- Skills: [`dev-browser`, `agent-browser`] – for controlled web repro and input/tap validation; also to capture evidence (screenshots).

**Skills Evaluation:**
- ✅ INCLUDED `dev-browser`: persistent browser state helps repeatedly reproduce pickup/drop.
- ✅ INCLUDED `agent-browser`: complements automation + screenshots.
- ❌ OMITTED `git-master`: no git operations required for repro.
- ❌ OMITTED `frontend-ui-ux`: not a design task.
- ❌ OMITTED `typescript-programmer`: implementation comes later; this task is observation.
- ❌ OMITTED `python-programmer`, `golang-tui-programmer`, `data-scientist`, `python-debugger`, `prompt-engineer`, `svelte-programmer`: no overlap.

**Depends On**: None

**What to do (execution notes):**
- Run the Ball Sort game in dev (web is fine for fastest loop).
- Reproduce:
  - tap a tube with balls → observe picked-up ball position relative to tube.
  - tap a different tube with a *valid* drop scenario (empty tube or same top color) → observe whether drop occurs.
- Capture state at three points: before pickup, after pickup, after attempted drop.
  - Variables: `heldBallId`, `sourceTubeIndex`, `heldBallColor`, `tube{n}_count`, `tube{n}_topColor`.
  - Entity transforms: `tube-{i}-sensor.transform`, held ball transform.
  - Input targeting: `context.inputEvents.tap.targetEntityId` should be `tube-{i}-sensor` when tapping tubes.

**References:**
- `app/lib/test-games/games/ballSort/game.ts` – ground truth for world bounds, tube layout constants, and which entities/tags participate in tap rules.
- `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:37-183` – pickup/drop logic and early-return branches.
- `app/lib/game-engine/rules/triggers/InputTriggerEvaluator.ts:28-55` – how tap triggers resolve `trigger.target: "tube"` via tag-at-point and set `targetEntityId`.
- `app/lib/game-engine/hooks/useGameInput.ts:50-88,148-172` – how initial `targetEntityId` is computed (physics query) and passed into input events.

**Acceptance Criteria:**
- [ ] Repro steps documented (2–5 steps each for pickup-position bug and drop bug).
- [ ] Evidence captured:
  - [ ] Screenshot after pickup showing ball offset (bug #1)
  - [ ] Screenshot/video or logs showing drop attempt failure (bug #2)
- [ ] Runtime state recorded for one failing run:
  - `heldBallId/sourceTubeIndex/heldBallColor` values
  - tapped `targetEntityId` values for both pickup and drop taps

---

### Task 2: Fix pickup positioning (held ball floats above its source tube)

**Description**: Update `executePickup` to compute held ball position correctly in the game’s runtime coordinate system so the ball appears centered above the source tube.

**Delegation Recommendation:**
- Category: `unspecified-high` – Core game logic fix with coordinate-system correctness.
- Skills: [`typescript-programmer`] – TypeScript changes in engine code with correct patterns.

**Skills Evaluation:**
- ✅ INCLUDED `typescript-programmer`: safe TS changes, no type suppressions.
- ❌ OMITTED `dev-browser` / `agent-browser`: not needed for code changes (covered in verification tasks).
- ❌ OMITTED `git-master`: only needed if committing (not requested here).
- ❌ OMITTED `frontend-ui-ux`: no UI work.
- ❌ OMITTED others: no overlap.

**Depends On**: Task 1

**Implementation approach (expected):**
- Eliminate the executor’s hardcoded world constants and avoid doing a second `cy()` conversion.
  - The game definition already converted coordinates into runtime world coords; the executor should treat runtime entity transforms as authoritative world space.
- Derive pickup X from `tube-${tubeIndex}-sensor.transform.x` (already done).
- Derive pickup Y from runtime tube geometry:
  - Preferred: compute top-of-tube using the tube sensor’s collider/visual height in runtime world units:
    - `tubeTopY = tubeSensor.transform.y + tubeHeight / 2`
  - Then lift the ball above the tube by `ballRadius + margin`:
    - `pickupY = tubeTopY + ballRadius + margin`
  - Fallbacks if tube height / ball radius aren’t directly available:
    - Tube height: use `tubeSensor.collider.height` or `tubeSensor.visual.height` if present.
    - Ball radius: infer from held ball’s visual size (imageWidth/height) if present, else infer from spacing between balls already in a tube.
    - Final fallback: use a conservative constant lift relative to `tubeSensor.transform.y` (e.g. `+LIFT_HEIGHT`).

**Concrete options to evaluate in code (choose one):**
1. **Geometry-driven (preferred)**:
   - `pickupY = tubeSensor.transform.y + (tubeHeight / 2) + ballRadius + margin`
2. **Lift-only (fallback)**:
   - `pickupY = tubeSensor.transform.y + LIFT_HEIGHT`

**References:**
- `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:37-98` – replace `pickupY` computation and remove internal `cy()` usage.
- `app/lib/test-games/games/ballSort/game.ts:28-36,120-186` – tube sensor placement and tube dimensions (for validating correct relative positions).
- `app/lib/game-engine/rules/triggers/InputTriggerEvaluator.ts:148-168` – collider-based hit testing; indicates the tube sensor likely has collider dimensions worth leveraging.

**Acceptance Criteria:**
- [ ] After pickup, held ball’s `transform.x` matches `tube-${source}-sensor.transform.x` within epsilon.
- [ ] After pickup, held ball’s `transform.y` is **above** the tube’s top edge by at least `BALL_RADIUS` (or chosen margin), in runtime world coords.
- [ ] Visual check: held ball is clearly over the source tube (not between tubes) on web.
- [ ] No regression: tube counts/topColor variables update as before (`tube{source}_count` decremented, `tube{source}_topColor` updated).

---

### Task 3: Fix drop interaction (can place into other tubes)

**Description**: Ensure that when holding a ball, tapping a valid target tube drops it correctly, and invalid targets provide clear feedback without leaving the game in a broken “holding but can’t drop” state.

**Delegation Recommendation:**
- Category: `unspecified-high` – logic correctness across state variables + input targeting.
- Skills: [`typescript-programmer`, `dev-browser`] – implement fix + quickly validate interaction loop.

**Skills Evaluation:**
- ✅ INCLUDED `typescript-programmer`: core logic changes.
- ✅ INCLUDED `dev-browser`: validate tap targeting and behavior quickly.
- ❌ OMITTED `agent-browser`: redundant if dev-browser used.
- ❌ OMITTED `frontend-ui-ux`: no redesign.
- ❌ OMITTED others: no overlap.

**Depends On**: Task 1, Task 2

**Implementation approach (expected):**
- Validate that `getTubeIndexFromInput` correctly resolves the tapped target:
  - It currently expects `targetEntityId` like `tube-{n}-sensor`.
  - Ensure the input trigger system always sets that target when tapping inside tube sensor bounds.
- Fix any remaining coordinate mismatch in the drop placement path:
  - Just like pickup, drop should not rely on executor-level `cy()` and hardcoded `TUBE_Y/TUBE_HEIGHT/BALL_RADIUS/BALL_SPACING`.
  - Compute drop position in runtime world coords using tube sensor geometry + derived ball radius + derived spacing.
- Address “stuck holding” scenarios:
  - If drop is invalid, executor currently adds `invalid` tag and returns while keeping `heldBallId` set. This is OK, but verify user can then tap another tube and succeed.
  - If drop cannot resolve target tube (targetTubeIndex < 0), executor triggers `pickup_cancelled` (which currently *restores ball to source tube*). Ensure this does not happen when tapping valid tube areas.
- If needed, improve target resolution robustness:
  - If `targetEntityId` is missing or not a tube sensor, consider using `context.inputEvents.tap.worldX/worldY` to find the nearest/containing tube sensor entity (similar to `InputTriggerEvaluator` approach) and use that.

**References:**
- `app/lib/test-games/games/ballSort/game.ts:410-423` – rule triggers: drop occurs only when tapping entities tagged `tube` while in `holding` state.
- `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:100-183` – drop logic and early return paths.
- `app/lib/game-engine/rules/triggers/InputTriggerEvaluator.ts:33-51` – confirms tag-based entity hit testing exists and can set `targetEntityId`.

**Acceptance Criteria:**
- [ ] Valid drop: pick up from any non-empty tube, drop into an **empty tube** → ball moves into that tube and `tube{target}_count` increments.
- [ ] Valid drop: drop onto a tube whose top color matches held ball color → ball stacks on top.
- [ ] Invalid drop: drop onto a full tube or different color tube → shows invalid feedback and remains in holding state; subsequent tap on a valid tube succeeds.
- [ ] No “stuck” state: after any invalid attempts, user can still complete a valid drop.

---

### Task 4: Add/extend automated coverage for pickup/drop (or scripted deterministic verification)

**Description**: Create regression protection for the two bugs by adding a test (preferred) around `BallSortActionExecutor` and/or an integration-like `RulesEvaluator` test that simulates tap inputs.

**Delegation Recommendation:**
- Category: `unspecified-high` – writing non-trivial engine tests with correct setup.
- Skills: [`typescript-programmer`] – implement vitest tests aligned with existing patterns.

**Skills Evaluation:**
- ✅ INCLUDED `typescript-programmer`: test authoring.
- ❌ OMITTED `dev-browser`/`agent-browser`: not required if tests exist.
- ❌ OMITTED `git-master`: no commits.
- ❌ OMITTED others: no overlap.

**Depends On**: Task 2, Task 3

**References:**
- Existing test infrastructure:
  - `app/package.json` includes `vitest` dependency (framework exists).
  - Engine tests exist: `app/lib/game-engine/__tests__/RulesEvaluator.test.ts` (patterns for simulating tap inputs).
- Logic under test:
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`

**Acceptance Criteria:**
- [ ] New/updated test(s) cover:
  - pickup positions held ball above source tube (assert on y relation to tube sensor)
  - valid drop into empty/same-color tube updates tags + variables
  - invalid drop leaves held ball held (and does not clear vars)
- [ ] `pnpm --filter slopcade test` (or equivalent turbo pipeline) passes for the affected package.

---

### Task 5: End-to-end verification: playable + win condition

**Description**: Verify that the Ball Sort game can be played normally and the win condition (`setGameState('won')`) triggers when all non-empty tubes are uniform and full.

**Delegation Recommendation:**
- Category: `visual-engineering` – interactive gameplay verification and evidence capture.
- Skills: [`dev-browser`, `agent-browser`] – automate taps and capture screenshots; optionally use game inspector flows if available.

**Skills Evaluation:**
- ✅ INCLUDED `dev-browser`: repeatable web validation.
- ✅ INCLUDED `agent-browser`: structured interaction + evidence.
- ❌ OMITTED `frontend-ui-ux`: not a design change.
- ❌ OMITTED `typescript-programmer`: verification only.
- ❌ OMITTED others: no overlap.

**Depends On**: Task 2, Task 3

**References:**
- Win logic:
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:184-205`
- Win trigger wiring:
  - `app/lib/test-games/games/ballSort/game.ts:431-435` – `ball_sort_check_win` runs on `ball_dropped`.

**Acceptance Criteria:**
- [ ] Can pick up and drop repeatedly without visual glitches (10+ moves).
- [ ] Can complete at least one level and reach game state `won`.
- [ ] Evidence captured: screenshot of completed/won state and at least one screenshot demonstrating correct held-ball position.

---

## Commit Strategy

If you choose to commit (optional; only if requested):
1. `fix(ball-sort): correct pickup world positioning` – only changes in `BallSortActionExecutor` (pickup math).
2. `fix(ball-sort): allow valid drops after pickup` – drop interaction fixes.
3. `test(ball-sort): add regression coverage for pickup/drop` – engine tests.

Each commit should be verifiable with:
- `pnpm test` (or `pnpm --filter slopcade test`) and `pnpm tsc --noEmit` where applicable.

---

## Success Criteria

- [ ] Picked-up ball renders above the source tube (correct X/Y).
- [ ] After pickup, user can drop into other tubes when move is valid.
- [ ] Invalid drops provide feedback and do not break the “holding” state.
- [ ] Ball Sort is playable end-to-end and can be won; win state triggers reliably.
