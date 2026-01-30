# Ball Sort: Fix ball placement bugs (vertical, horizontal, pickup)

## Context

### Goal
Fix three observed ball placement bugs in the Ball Sort test game:
1. **Vertical placement bug**: balls dropped into tubes don’t return to the correct vertical “slot”.
2. **Horizontal placement bug**: balls sometimes appear in the wrong tube (X mismatch).
3. **Pickup placement bug**: on pickup, balls should move to a consistent “standard” location above their **source** tube.

### Known Architecture / Suspected Hotspots
- Main game constants + layout:
  - `app/lib/test-games/games/ballSort/game.ts`
- Drag/drop rules + positioning:
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`
- Tube state structure:
  - `app/lib/test-games/games/ballSort/puzzleGenerator.ts`
- Horizontal layout helper:
  - `shared/src/systems/layout/helpers.ts` (`distributeRow`)

Key constants (as discovered):
- `BALL_SPACING = 1.1 * WORLD_SCALE`
- `LIFT_HEIGHT = 3.0`
- `NUM_TUBES = 6`, `BALLS_PER_TUBE = 4`

Expected vertical formula (slot = 0 is top ball in tube):
```ts
const ballY = TUBE_Y + TUBE_HEIGHT / 2 - TUBE_WALL_THICKNESS - BALL_RADIUS - slot * BALL_SPACING;
```

### Working Hypotheses (to validate during Investigation)
- **Stale / off-by-one tube counts**: drop position is computed from `targetCount`, but `targetCount` may not reflect the *post-drop* state (or source removal timing).
- **Wrong tube attribution**: drop may resolve the wrong “target tube” (overlapping sensors, multiple hits, race between collision events).
- **Coordinate-space mismatch**: using sensor X/Y in a different transform space than the ball, or using interpolated physics positions.
- **Pickup uses world position deltas instead of canonical “tube top anchor”**: lift may be applied on the current ball position instead of a deterministic anchor.

### Verification Strategy (Manual + Inspector-Driven)
This plan assumes **manual verification using game-inspector** as primary validation. Early tasks include confirming whether there is existing automated test infrastructure and (if present) adding targeted unit tests for coordinate math.

Evidence expectations for this plan:
- Store screenshots and/or logged outputs for key scenarios.
- For numeric verification, compare **actual** vs **expected** X/Y within a small epsilon (recommend `±0.05` world units unless the engine uses different precision).

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| 1. Confirm test infrastructure + run commands | None | Determines whether to add unit tests vs manual-only verification. |
| 2. Open Ball Sort in inspector + establish baseline (seeded) | None | Provides deterministic repro environment for all subsequent investigation. |
| 3. Discover entity mapping (tubes/sensors/balls) | 2 | Must know how to select balls/tubes in inspector tools. |
| 4. Reproduce vertical bug with precise scenarios | 3 | Needs entity mapping to execute controlled pickup/drop and capture coordinates. |
| 5. Reproduce horizontal bug + identify mis-targeting | 3 | Needs entity mapping; focuses on tube resolution and X placement. |
| 6. Reproduce pickup placement bug + define “standard pickup anchor” | 3 | Needs entity mapping; defines consistent pickup position requirement. |
| 7. Instrument/observe state transitions during pickup/drop | 4,5,6 | Uses the repro scenarios and adds event/subscription observation to pinpoint failure point. |
| 8. Root cause analysis write-up + fix design decision | 7 | Must be evidence-based from observations and state logs. |
| 9. Implement vertical positioning fix | 8 | Depends on root-cause conclusions and chosen source-of-truth for slot. |
| 10. Implement horizontal tube targeting + X placement fix | 8 | Depends on tube-resolution strategy decision. |
| 11. Implement pickup anchor fix | 8 | Depends on chosen anchor definition and tube coordinate source. |
| 12. Add/adjust unit tests for coordinate math (if infra exists) | 1,8 | Requires test framework decision + finalized formulas. |
| 13. Full regression matrix via inspector (all scenarios) | 9,10,11 | Must validate integrated behavior after all fixes. |
| 14. Cleanup + guardrails (remove debug/instrumentation, docs) | 13 | Only after behavior is proven stable. |

---

## Parallel Execution Graph

Wave 1 (Start immediately):
├── Task 1: Confirm test infrastructure + run commands
└── Task 2: Open Ball Sort in inspector + establish baseline (seeded)

Wave 2 (After Wave 1–2):
└── Task 3: Discover entity mapping (tubes/sensors/balls)

Wave 3 (After Wave 3):
├── Task 4: Reproduce vertical bug with precise scenarios
├── Task 5: Reproduce horizontal bug + identify mis-targeting
└── Task 6: Reproduce pickup placement bug + define “standard pickup anchor”

Wave 4 (After Wave 3–6):
└── Task 7: Instrument/observe state transitions during pickup/drop

Wave 5 (After Wave 7):
└── Task 8: Root cause analysis write-up + fix design decision

Wave 6 (After Wave 8):
├── Task 9: Implement vertical positioning fix
├── Task 10: Implement horizontal tube targeting + X placement fix
└── Task 11: Implement pickup anchor fix

Wave 7 (After Wave 6):
├── Task 12: Add/adjust unit tests for coordinate math (if infra exists)
└── Task 13: Full regression matrix via inspector (all scenarios)

Wave 8 (After Wave 7):
└── Task 14: Cleanup + guardrails (remove debug/instrumentation, docs)

Critical Path: 2 → 3 → 7 → 8 → (9,10,11) → 13
Estimated Parallel Speedup: moderate (Wave 4 tasks parallelize investigation once mapping exists).

---

## Tasks

### Task 1: Confirm test infrastructure + run commands

**Description**: Determine whether automated tests exist and what framework is used, so we can decide between adding unit tests for placement math or relying entirely on manual inspector QA.

**What to do**:
- Inspect repo for:
  - `package.json` scripts (`test`, `lint`, `typecheck`)
  - common configs (vitest/jest/playwright)
  - existing `*.test.*` / `*.spec.*` files.
- Record chosen approach:
  - **If infra exists**: add a small unit test suite for slot and tube X calculations.
  - **If infra absent**: manual-only verification using game-inspector, with strict numeric acceptance checks.

**Game-inspector tools**: none.

**Files to modify**: only if adding tests later (see Task 12).

**Delegation Recommendation**:
- Category: `unspecified-low` — repo inspection and decision.
- Skills: [`git-master`, `typescript-programmer`] — locating test patterns and understanding TS config.

**Skills Evaluation**:
- ✅ `git-master`: useful for history/blame on suspicious positioning code.
- ✅ `typescript-programmer`: interpret TS build/test setup.
- ❌ `frontend-ui-ux`: not UI/UX focused.
- ❌ `agent-browser`: inspector is not browser UI automation here.
- ❌ `dev-browser`: same.
- ❌ `python-programmer`: not Python.
- ❌ `svelte-programmer`: not Svelte.
- ❌ `golang-tui-programmer`: not Go.
- ❌ `python-debugger`: not Python.
- ❌ `data-scientist`: not data processing.
- ❌ `prompt-engineer`: not prompt work.

**Depends On**: None

**Acceptance Criteria**:
- Clear statement documented in work log:
  - “Test infra exists: YES/NO; Framework: X; Decision: add tests vs manual-only.”

---

### Task 2: Open Ball Sort in inspector + establish baseline (seeded)

**Description**: Create a deterministic environment for repro.

**What to do (game-inspector)**:
- `game-inspector_open` with `name: ballSort` (or exact example name/path if different).
- `game-inspector_set_seed` to a fixed seed (e.g. `1337`) with deterministic mode enabled.
- Take baseline screenshot: `game-inspector_game_screenshot`.
- Take a high-detail snapshot: `game-inspector_game_snapshot(detail="high", debug=true)`.

**What to verify**:
- Balls and tubes are spawned.
- Snapshot includes identifiable templates/tags for tubes, sensors, and balls.

**Files to modify**: None.

**Delegation Recommendation**:
- Category: `quick` — straightforward inspector setup.
- Skills: [`dev-browser`] — persistent game state and repeatable runs.

**Skills Evaluation**:
- ✅ `dev-browser`: aligns with interactive web/game runtime observation.
- ❌ `agent-browser`: redundant with dev-browser for this internal harness.
- ❌ `git-master`: no git ops.
- ❌ `typescript-programmer`: no code.
- ❌ `frontend-ui-ux`: not needed.
- ❌ `python-programmer`: not needed.
- ❌ `svelte-programmer`: not needed.
- ❌ `golang-tui-programmer`: not needed.
- ❌ `python-debugger`: not needed.
- ❌ `data-scientist`: not needed.
- ❌ `prompt-engineer`: not needed.

**Depends On**: None

**Acceptance Criteria**:
- Screenshot captured.
- Snapshot captured and saved/logged with enough info to identify ball/tube entities.

---

### Task 3: Discover entity mapping (tubes, sensors, balls, IDs)

**Description**: Build a reliable mapping between:
- tube index (`tube-0..tube-5`)
- tube sensor entity ID
- tube visual entity ID (if separate)
- balls currently in each tube (entity IDs, slot index)

**What to do (game-inspector)**:
- Use `game-inspector_query` / `game-inspector_game_find` to locate likely entities:
  - Start broad (e.g. `template: "ball"`, `tag: "ball"`, `name: "ball"`).
  - Repeat for tubes/sensors (e.g. `template: "tube"`, `tag: "tube"`, `name: "tube"`, `"sensor"`).
- For 1–2 sample balls and 1–2 tubes, call:
  - `game-inspector_game_entity` (full info)
  - `game-inspector_get_props(paths=["transform.position","physics.position","physics.velocity","tags","template"])`.
- Produce a “selector recipe” that consistently finds:
  - top ball in tube-0
  - sensor for tube-1
  - etc.

**What to verify**:
- Whether the engine uses `transform.position` vs `physics.position` as the authoritative coordinate.
- Whether tubes/sensors share X coordinate or if there is an offset.

**Files to modify**: None.

**Delegation Recommendation**:
- Category: `unspecified-low` — investigative mapping.
- Skills: [`dev-browser`, `typescript-programmer`] — interpret entity metadata and how it maps to game TS definitions.

**Skills Evaluation**:
- ✅ `dev-browser`: inspector workflow.
- ✅ `typescript-programmer`: understand entity schemas/props naming.
- ❌ `git-master`: optional; defer.
- ❌ `frontend-ui-ux`: not design.
- ❌ `agent-browser`: not needed.
- ❌ `python-programmer`: not needed.
- ❌ `svelte-programmer`: not needed.
- ❌ `golang-tui-programmer`: not needed.
- ❌ `python-debugger`: not needed.
- ❌ `data-scientist`: not needed.
- ❌ `prompt-engineer`: not needed.

**Depends On**: Task 2

**Acceptance Criteria**:
- A written mapping (in execution notes) describing how to reliably select:
  - tube-0 sensor, tube-1 sensor
  - “top ball of tube-0”
  - “all balls in tube-i”
- At least one sample ball and one sample tube have their key props logged.

---

### Task 4: Reproduce and quantify the vertical placement bug

**Description**: Prove the vertical slot mismatch with measured coordinates.

**Scenarios to run (repeat with seed fixed)**:
1. **Same-tube drop**:
   - Identify tube-0’s top ball (expected slot 0).
   - Pickup, then drop back into tube-0.
2. **Cross-tube drop into partially filled tube**:
   - Ensure tube-1 has N balls (record N).
   - Pickup tube-0 top ball, drop into tube-1.
3. **Drop into empty tube**:
   - Find an empty tube (or create one via moving balls) and drop into it.

**What to do (game-inspector)**:
- Before pickup, record:
  - ball position (Y)
  - tube-0 “expected slot Y” computed from constants (from `game.ts`)
  - current tube ball count (from snapshot or ball list)
- Use `game-inspector_simulate_input` to drag:
  - `drag_start` at the ball’s world position
  - `drag_move` to above the target tube sensor
  - `drag_end` at the target tube’s center
- After drop, `game-inspector_game_wait_stationary(entityId=ballId)`.
- Record `transform.position.y` and compare to expected Y:
  - expected slot = `targetCountAfterDrop - 1` (or `targetIndex` in that tube’s array) — confirm which is correct in Task 7.

**What to verify**:
- Actual Y equals expected Y within epsilon.
- If mismatch, record:
  - actual
  - expected
  - inferred slot from actual
  - recorded tube counts pre/post.

**Files to modify**: None.

**Delegation Recommendation**:
- Category: `unspecified-low` — careful repro with numeric evidence.
- Skills: [`dev-browser`] — repeatable interaction and state capture.

**Skills Evaluation**:
- ✅ `dev-browser`: essential.
- ❌ `agent-browser`: redundant.
- ❌ `git-master`: no.
- ❌ `typescript-programmer`: minimal (math can be done in notes).
- ❌ `frontend-ui-ux`: no.
- ❌ `python-programmer`: no.
- ❌ `svelte-programmer`: no.
- ❌ `golang-tui-programmer`: no.
- ❌ `python-debugger`: no.
- ❌ `data-scientist`: no.
- ❌ `prompt-engineer`: no.

**Depends On**: Task 3

**Acceptance Criteria**:
- For each scenario above, provide:
  - ballId, source tube, target tube
  - pre-drop target count, post-drop target count
  - expected Y and actual Y
  - evidence screenshot(s) for at least one failing case

---

### Task 5: Reproduce and quantify the horizontal placement bug

**Description**: Determine whether the bug is:
- choosing the wrong target tube (logic), or
- using the right target tube but wrong X placement (coordinate source), or
- a rendering/physics interpolation issue.

**Scenarios to run**:
1. Drag a ball across multiple tubes and drop near the boundary between tube-1 and tube-2.
2. Drag quickly and drop while ball overlaps two tube sensors.
3. Drop directly on tube center vs near edges.

**What to do (game-inspector)**:
- Subscribe to collisions during drag (if supported by your ECS events):
  - `game-inspector_subscribe(eventType="collision", selector=".ball")` (adjust selector per Task 3 findings).
- During each drop:
  - record ball X before pickup, after pickup, after drop, after stationary.
  - record the chosen target tube index from game state (via snapshot) if available.
- If multiple sensors overlap, use `game-inspector_query_point` at drop end position to list overlapping entities.
- Use `game-inspector_raycast` from above downward to see which tube sensor is “hit” first at drop location.

**What to verify**:
- Whether the game consistently selects the same tube given the same final drop position.
- Whether the ball ends up at the X coordinate expected for the chosen tube.

**Files to modify**: None.

**Delegation Recommendation**:
- Category: `unspecified-low`.
- Skills: [`dev-browser`] — event observation and repeatability.

**Skills Evaluation**:
- ✅ `dev-browser`.
- ❌ all other skills: not needed for inspector-only repro.

**Depends On**: Task 3

**Acceptance Criteria**:
- At least 3 logged cases showing:
  - drop end position
  - overlapping sensors/entities at drop point
  - which tube was selected
  - expected tube X vs actual ball X
  - whether mismatch is “wrong tube chosen” vs “wrong X for chosen tube”

---

### Task 6: Reproduce and define the pickup placement (standard pickup anchor)

**Description**: Specify and measure the intended pickup position.

**Proposed definition (to confirm during root-cause analysis)**:
- On pickup, ball should move to:
  - `pickupX = tubeX` (source tube center)
  - `pickupY = tubeTopInnerY + BALL_RADIUS + pickupClearance`
  - where `pickupClearance` is a constant (could be `LIFT_HEIGHT` or derived from tube height).

**Scenarios**:
1. Pick up the top ball from tube-0, verify pickup X/Y.
2. Pick up a ball from tube-3, verify pickup X/Y is consistent relative to tube-3.
3. Pick up and hover without moving; verify the ball stays pinned to anchor (no drift).

**What to do (game-inspector)**:
- Record source tube X and top Y reference:
  - from tube sensor position (if it matches)
  - OR from constants in `game.ts` (preferred, if tube index -> X mapping exists)
- Perform `drag_start` on ball, do not move.
- Record ball position immediately after pickup (or after a short wait).

**What to verify**:
- Pickup placement is deterministic and tube-relative.
- X does not change during pickup except to snap to source tube center.

**Files to modify**: None.

**Delegation Recommendation**:
- Category: `unspecified-low`.
- Skills: [`dev-browser`] — deterministic pickup observation.

**Skills Evaluation**:
- ✅ `dev-browser`.
- ❌ all other skills: not needed.

**Depends On**: Task 3

**Acceptance Criteria**:
- For each scenario, log:
  - source tube id/index
  - expected pickup X/Y (per proposed definition)
  - actual pickup X/Y
  - whether mismatch is consistent or intermittent

---

### Task 7: Instrument/observe state transitions during pickup/drop

**Description**: Identify the precise moment and data source that becomes incorrect.

**What to do**:
- Use snapshots before/after each action to correlate:
  - tube arrays (ball order)
  - ball “current tube” metadata (if exists)
  - ball positions
- If supported, subscribe to:
  - `propertyChange` on ball position and on tube contents
  - collisions between ball and tube sensors.
- For one vertical-bug scenario and one horizontal-bug scenario:
  - step simulation frames (pause + `game-inspector_step`) to observe mid-transition state.

**Specific observations to capture**:
- When dropping into tube-X, does the tube’s “ball list” update before or after `executeDrop` computes the target slot?
- Does `executeDrop` use:
  - pre-drop count,
  - post-drop count,
  - or a cached count from drag start?
- If wrong tube chosen, is the chosen tube:
  - the last collided sensor,
  - the closest sensor,
  - the sensor under cursor,
  - or something else?

**Game-inspector tools**:
- `game-inspector_pause` / `game-inspector_step`
- `game-inspector_subscribe` + `game-inspector_poll_events`
- `game-inspector_game_snapshot` (high)
- `game-inspector_query_point` / `game-inspector_raycast`

**Files to modify**: Optional instrumentation only (if needed):
- `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts` (temporary debug logging behind a flag)

**Delegation Recommendation**:
- Category: `ultrabrain` — requires careful causal tracing.
- Skills: [`typescript-programmer`, `dev-browser`, `git-master`] — TS reasoning + runtime observation + history tracing.

**Skills Evaluation**:
- ✅ `typescript-programmer`: interpret action executor and state mutations.
- ✅ `dev-browser`: inspector instrumentation.
- ✅ `git-master`: use blame/log to see recent changes that introduced regressions.
- ❌ `frontend-ui-ux`: not UI.
- ❌ `agent-browser`: redundant.
- ❌ `python-programmer`: no.
- ❌ `svelte-programmer`: no.
- ❌ `golang-tui-programmer`: no.
- ❌ `python-debugger`: no.
- ❌ `data-scientist`: no.
- ❌ `prompt-engineer`: no.

**Depends On**: Tasks 4, 5, 6

**Acceptance Criteria**:
- A written determination for each bug:
  - “wrong data (tube count / slot index)”, “wrong tube resolution”, “wrong coordinate space”, or “timing/race”.
- At least one step-by-step trace (snapshot(s) + event log) showing divergence from expected.

---

### Task 8: Root cause analysis write-up + fix design decision

**Description**: Turn evidence into a concrete fix strategy and define canonical sources of truth.

**Decisions to lock in**:
1. **Canonical tube X source**:
   - Prefer deriving tube center X from known tube index + layout constants (`game.ts` + `distributeRow`) rather than sensor X (unless proven identical and stable).
2. **Canonical slot index source**:
   - Prefer using the ball’s final index in the tube’s array (post-mutation), not a computed “count” that might be stale.
3. **Target tube resolution rule**:
   - Prefer deterministic rule (e.g. nearest tube center at drop end, or raycast under cursor), not “last collided sensor”.
4. **Pickup anchor**:
   - Standard position above **source tube**, not relative to ball’s current position.

**Files likely affected**:
- `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`
- Possibly `app/lib/test-games/games/ballSort/game.ts` (if adding explicit tube anchor helpers)
- Possibly `shared/src/systems/layout/helpers.ts` (only if distributeRow usage is wrong or needs a stable API)

**Delegation Recommendation**:
- Category: `ultrabrain` — design decisions based on evidence.
- Skills: [`typescript-programmer`, `git-master`] — TS design + history.

**Skills Evaluation**:
- ✅ `typescript-programmer`
- ✅ `git-master`
- ❌ others: not applicable.

**Depends On**: Task 7

**Acceptance Criteria**:
- Written RCA containing:
  - confirmed cause(s) per bug
  - chosen deterministic rules for tube selection, X source, slot calculation, and pickup anchor
  - explicit “won’t do” guardrails (e.g. do not rely on physics collision order)

---

### Task 9: Implement vertical positioning fix

**Description**: Ensure post-drop Y is always the correct slot for the ball’s final position in the target tube.

**Fix approach (expected, but must match RCA)**:
- In `executeDrop`, compute slot from the authoritative tube state after the ball is inserted.
- Ensure the slot uses consistent definition (slot 0 = top).
- If there is animation/interpolation, set both transform and physics positions consistently.

**Files to modify**:
- `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`

**Game-inspector verification hooks (post-implementation)**:
- Re-run Task 4 scenarios and confirm actual Y == expected Y.

**Delegation Recommendation**:
- Category: `ultrabrain` — logic correctness and state sequencing.
- Skills: [`typescript-programmer`, `git-master`] — implement safely and track regressions.

**Skills Evaluation**:
- ✅ `typescript-programmer`
- ✅ `git-master`
- ❌ `dev-browser`: not required for code-writing itself, but useful for manual QA (covered in Task 13).
- ❌ other skills: not applicable.

**Depends On**: Task 8

**Acceptance Criteria**:
- For each Task 4 scenario:
  - actual Y within ±0.05 of formula-derived expected Y.
  - ball order in tube state matches visual stack order.

---

### Task 10: Implement horizontal tube targeting + X placement fix

**Description**: Ensure balls end up in the correct tube horizontally and X always matches the chosen tube.

**Fix approach options (choose per RCA)**:
- **Deterministic targeting**:
  - choose target tube by nearest tube center to drop end position, OR
  - raycast at drop end and choose the highest-priority tube sensor under cursor.
- **Canonical X**:
  - set ball X to tube center X from the canonical mapping, not from an arbitrary sensor contact.
- Add guard against ambiguous overlaps:
  - if multiple candidates, use deterministic tie-break (lowest distance; stable sort by tube index).

**Files to modify**:
- `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`
- Possibly `app/lib/test-games/games/ballSort/game.ts` (if adding helper `getTubeCenterX(tubeIndex)`)
- Possibly `shared/src/systems/layout/helpers.ts` (only if helper is wrong or unstable)

**Game-inspector verification hooks**:
- Re-run Task 5 boundary/overlap scenarios.
- Confirm chosen target tube is deterministic given same drop position.

**Delegation Recommendation**:
- Category: `ultrabrain`.
- Skills: [`typescript-programmer`, `git-master`] — deterministic geometry + safe refactor.

**Skills Evaluation**:
- ✅ `typescript-programmer`
- ✅ `git-master`
- ❌ `dev-browser`: QA later.
- ❌ others: not applicable.

**Depends On**: Task 8

**Acceptance Criteria**:
- For Task 5 scenarios:
  - ball ends in correct tube (state + visual).
  - ball X within ±0.05 of expected tube center X.
  - no intermittent “wrong tube” selections across repeated trials with same seed.

---

### Task 11: Implement pickup anchor fix

**Description**: On pickup, ball always moves to a standard location above its source tube.

**Fix approach (per RCA)**:
- Replace “lift by fixed delta from current position” with “snap to (tubeCenterX, tubePickupY)”.
- Ensure anchor uses the **source tube index** captured at pickup start.
- Ensure re-picking after partial drag doesn’t re-anchor incorrectly.

**Files to modify**:
- `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`

**Game-inspector verification hooks**:
- Re-run Task 6 scenarios.

**Delegation Recommendation**:
- Category: `unspecified-high` — moderately complex but localized.
- Skills: [`typescript-programmer`, `git-master`] — implement and ensure no regressions.

**Skills Evaluation**:
- ✅ `typescript-programmer`
- ✅ `git-master`
- ❌ others: not applicable.

**Depends On**: Task 8

**Acceptance Criteria**:
- For each Task 6 scenario:
  - pickup X == source tube center X within ±0.05.
  - pickup Y == defined pickup anchor Y within ±0.05.
  - repeated pickups remain consistent.

---

### Task 12: Add/adjust unit tests for coordinate math (if infra exists)

**Description**: If test infra exists, add targeted tests that lock in the formulas and prevent regressions.

**What to test** (suggested):
- `slotToY(slot)` returns correct Y for slot 0..BALLS_PER_TUBE-1.
- `tubeIndexToX(index)` matches layout positions used by game.
- Deterministic tie-break rule for target tube selection.

**Files to modify**:
- New test file(s) near existing conventions (discovered in Task 1).
- Possibly refactor the math into pure helpers in:
  - `app/lib/test-games/games/ballSort/game.ts` or
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts` (exported helpers),
  so tests can import without needing runtime.

**Delegation Recommendation**:
- Category: `unspecified-high`.
- Skills: [`typescript-programmer`] — write stable unit tests.

**Skills Evaluation**:
- ✅ `typescript-programmer`
- ❌ `git-master`: optional.
- ❌ others: not applicable.

**Depends On**: Tasks 1, 8

**Acceptance Criteria**:
- Tests cover at least the vertical slot formula and tube X mapping.
- `test` command (framework-specific) passes locally.

---

### Task 13: Full regression matrix via inspector (post-fix)

**Description**: Validate all three bug classes are resolved across a full interaction matrix.

**Regression scenarios (minimum)**:
1. Same-tube pickup/drop for tube-0, tube-3.
2. Cross-tube drop into:
   - empty tube
   - tube with 1 ball
   - tube with 3 balls
3. Boundary/overlap drops between neighboring tubes (1↔2 and 3↔4).
4. Rapid drag/drop repeated 10 times (same seed) to catch intermittent issues.
5. Invalid drop (if game supports rejection): drop where no tube exists, verify revert:
   - returns to correct source tube slot and correct X.

**What to do (game-inspector)**:
- Use `game-inspector_set_seed(1337, deterministic)` before each run.
- For each scenario:
  - record expected X/Y from formulas
  - perform simulate drag events
  - wait stationary
  - validate via `game-inspector_get_props` and (optionally) `game-inspector_game_assert(nearPosition)`.
- Capture at least one screenshot per scenario type.

**Files to modify**: None.

**Delegation Recommendation**:
- Category: `unspecified-low` — extensive manual QA.
- Skills: [`dev-browser`] — efficient repeatable runtime testing.

**Skills Evaluation**:
- ✅ `dev-browser`
- ❌ others: not needed.

**Depends On**: Tasks 9, 10, 11

**Acceptance Criteria**:
- All scenarios pass with:
  - correct tube membership (state)
  - correct X within ±0.05
  - correct Y slot within ±0.05
- No intermittent failures across repeated runs with same seed.

---

### Task 14: Cleanup + guardrails

**Description**: Remove temporary debug instrumentation and ensure the solution is future-proof.

**What to do**:
- Remove any temporary logs, event tracing, debug flags introduced during investigation.
- Add small comments/docs only where necessary to encode key invariants:
  - slot definition (0 = top)
  - canonical tube X/Y sources
  - deterministic target selection rule

**Files to modify**:
- `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`
- (Optional) `app/lib/test-games/games/ballSort/game.ts` if helpers added

**Delegation Recommendation**:
- Category: `quick`.
- Skills: [`typescript-programmer`] — safe cleanup.

**Skills Evaluation**:
- ✅ `typescript-programmer`
- ❌ others: not applicable.

**Depends On**: Task 13

**Acceptance Criteria**:
- No debug-only output in normal gameplay.
- Final code clearly encodes the chosen invariants.

---

## Commit Strategy

Recommended atomic commits (conventional):
1. `fix(ball-sort): make drop slot derived from final tube state`
2. `fix(ball-sort): make tube targeting and X placement deterministic`
3. `fix(ball-sort): standardize pickup anchor above source tube`
4. (Optional) `test(ball-sort): add coordinate math regression tests`

Guardrails:
- Avoid mixing refactors unrelated to placement.
- If temporary instrumentation is added, keep it behind a local flag and remove it before final commits.

---

## Success Criteria

### Functional
- Dropping a ball into any tube always places it at the correct **slot Y** determined by its final tube index.
- Ball X always matches the chosen tube’s canonical center X; no intermittent wrong-tube placement.
- On pickup, ball snaps to a standard anchor above the **source** tube.

### Verification (must be demonstrated)
- Provide captured evidence (logs/screenshots) that Tasks 4–6 fail pre-fix and Task 13 passes post-fix.
- If tests exist and were added: test suite passes with the project’s standard command.
