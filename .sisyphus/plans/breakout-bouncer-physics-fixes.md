# Breakout Bouncer: physics fixes (constant-speed ball)

## Context

### User request summary
Fix physics issues in `app/lib/test-games/games/breakoutBouncer/game.ts` so the ball maintains constant speed and the game stops spamming expression parser errors.

### Problems observed (from the game file + provided logs)
- Ball speed decays over time despite `restitution: 1` on walls/bricks.
- Paddle is configured with `restitution: 0.2`, causing large energy loss on paddle hits.
- Rule `paddle_friction` uses unsupported expression references (`entity.velocity.x`) and causes repeated parse errors.
- Ball can stop completely after enough collisions.

### Constraints
- Modify **only** `app/lib/test-games/games/breakoutBouncer/game.ts`.
- Keep other mechanics intact (brick destruction, scoring, lives/drain, controls).

### Key engine capability to leverage
- `maintain_speed` behavior exists and scales the body’s velocity vector to a target speed.
  - Schema: `type: 'maintain_speed'`, `speed: Value<number>`, optional `mode?: 'constant' | 'minimum'`.
  - Runtime behavior: no-ops if `currentSpeed <= 0.01` (important edge case if velocity hits ~0).

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| 1. Baseline reproduction + instrumentation | None | Establish current behavior and confirm the exact failure modes before editing. |
| 2. Fix paddle restitution (0.2 → 1.0) | 1 | Ensures paddle collisions no longer bleed energy; verify change against baseline. |
| 3. Add `maintain_speed` to ball template | 1 | Primary fix to prevent speed decay; must be verified against baseline behavior. |
| 4. Remove broken `paddle_friction` rule | 1 | Stops expression-parser spam and removes unsupported syntax.
| 5. Remove `velocityThreshold` variable (+ any now-dead tuning vars) | 4 | Variable becomes unused once the rule is removed.
| 6. Optional: prune redundant ball-velocity rules (if present/added later) | 3 | Only safe after speed maintenance is in place; verify no gameplay regression.
| 7. Manual QA pass (full game loop) | 2, 3, 4, 5 (+6 if done) | Confirm end-to-end play: launch, paddle control, brick scoring, drain/lives, win condition, no console spam. |

---

## Parallel Execution Graph

Wave 1 (Start immediately):
├── Task 1: Baseline reproduction + instrumentation (no dependencies)

Wave 2 (After Wave 1 completes):
├── Task 2: Fix paddle restitution (depends: Task 1)
├── Task 3: Add `maintain_speed` to ball template (depends: Task 1)
└── Task 4: Remove broken `paddle_friction` rule (depends: Task 1)

Wave 3 (After Wave 2 completes):
├── Task 5: Remove `velocityThreshold` variable (depends: Task 4)
└── Task 6: Optional: prune redundant velocity rules (depends: Task 3)

Wave 4 (After Wave 3 completes):
└── Task 7: Manual QA pass (depends: Tasks 2, 3, 4, 5 [+6])

Critical Path: Task 1 → Task 3 → Task 7
Estimated Parallel Speedup: ~30–40% (Tasks 2/3/4 can be done in parallel after baseline).

---

## Tasks

### Task 1: Baseline reproduction + instrumentation

**Description**: Reproduce the issues and capture evidence before changes.

**Delegation Recommendation:**
- Category: `quick` — mostly observation + running the game.
- Skills: `dev-browser`, `game-inspector` — efficient game runtime verification and state snapshots.

**Skills Evaluation:**
- ✅ INCLUDED `dev-browser`: if the test games list is web-accessible for quick smoke testing.
- ✅ INCLUDED `game-inspector`: deterministic inspection of ball velocity and collisions.
- ❌ OMITTED `frontend-ui-ux`: not a UI design task.
- ❌ OMITTED `git-master`: no git operations required for baseline check.
- ❌ OMITTED `prompt-engineer`, `data-scientist`, language-specific programmer skills: not relevant.

**Depends On**: None

**References:**
- `app/lib/test-games/games/breakoutBouncer/game.ts:105-127` — current ball physics + empty behaviors array.
- `app/lib/test-games/games/breakoutBouncer/game.ts:128-151` — paddle collider has `restitution: 0.2`.
- `app/lib/test-games/games/breakoutBouncer/game.ts:323-438` — rules including `paddle_friction` and launch/drain rules.

**Acceptance Criteria**:
- [ ] Run the game and confirm:
  - Ball loses speed over repeated wall/brick collisions.
  - Paddle collision causes dramatic slowdown.
  - Console/log spam contains parse error mentioning `entity.velocity.x`.
- [ ] Capture evidence:
  - Screenshot (or log snippet) showing the parse error spam.
  - (Preferred) a `game-inspector` snapshot showing ball velocity magnitude decreasing over time.

---

### Task 2: Fix paddle restitution (0.2 → 1.0)

**Description**: Update paddle collider restitution to avoid energy loss on paddle hits.

**Delegation Recommendation:**
- Category: `quick` — single-line config change.
- Skills: `typescript-programmer` — safe TS edit and formatting.

**Skills Evaluation:**
- ✅ INCLUDED `typescript-programmer`: ensures edits respect types/conventions.
- ❌ OMITTED `game-inspector`: not required for the edit (use in QA task).
- ❌ OMITTED `git-master`: not required unless user later asks for a commit.

**Depends On**: Task 1

**References:**
- `app/lib/test-games/games/breakoutBouncer/game.ts:143-149` — paddle collider; change `restitution: 0.2` → `1.0`.

**Acceptance Criteria**:
- [ ] Paddle collider restitution is `1.0`.
- [ ] Manual verification: ball no longer loses ~80% speed on paddle collision (compare to Task 1 baseline).

---

### Task 3: Add `maintain_speed` behavior to ball template (~8 m/s)

**Description**: Add `maintain_speed` to the ball template so velocity magnitude is kept at target speed.

**Delegation Recommendation:**
- Category: `unspecified-low` — small change, but it affects gameplay feel and requires verification.
- Skills: `typescript-programmer`, `game-inspector` — config change + verify velocity magnitude is stable.

**Skills Evaluation:**
- ✅ INCLUDED `typescript-programmer`: implement behavior configuration correctly.
- ✅ INCLUDED `game-inspector`: verify ball speed magnitude stays constant.
- ❌ OMITTED `frontend-ui-ux`: not UI.
- ❌ OMITTED `dev-browser`: optional; inspector is better for physics.

**Depends On**: Task 1

**References:**
- `app/lib/test-games/games/breakoutBouncer/game.ts:105-127` — ball template, currently `behaviors: []`.
- `app/lib/game-engine/behaviors/MovementBehaviors.ts:256-278` — maintain_speed implementation details; note `currentSpeed > 0.01` guard.
- `shared/src/types/behavior.ts:252-256` — maintain_speed behavior type and fields.

**Acceptance Criteria**:
- [ ] Ball template includes behavior:
  - `{ type: 'maintain_speed', speed: 8 }`
  - (Default mode assumed: constant)
- [ ] Manual verification:
  - After launch, ball speed magnitude remains ~8 m/s even after repeated wall/brick/paddle collisions.
- [ ] Inspector verification (preferred):
  - Sample ball velocity vector at multiple times; `sqrt(vx^2+vy^2)` stays close to 8.

**Notes / Risk**:
- `maintain_speed` no-ops if speed drops to ~0 (`<= 0.01`). If you still observe “ball stops completely”, consider adding a minimal “relaunch if too slow” rule (see Task 6 optional safeguard).

---

### Task 4: Remove broken `paddle_friction` rule (expression uses unsupported `entity.velocity.x`)

**Description**: Delete the `paddle_friction` rule block to stop parse errors and avoid invalid behavior.

**Delegation Recommendation:**
- Category: `quick` — delete one rule block.
- Skills: `typescript-programmer` — safe structural edit.

**Skills Evaluation:**
- ✅ INCLUDED `typescript-programmer`
- ❌ OMITTED others: not needed.

**Depends On**: Task 1

**References:**
- `app/lib/test-games/games/breakoutBouncer/game.ts:409-423` — `paddle_friction` rule to remove.

**Acceptance Criteria**:
- [ ] `paddle_friction` rule removed entirely from `rules`.
- [ ] Manual verification: console no longer shows `[ExpressionCondition] Failed to evaluate` spam.

---

### Task 5: Remove `velocityThreshold` variable (and confirm no remaining references)

**Description**: Remove the unused tuning variable now that `paddle_friction` is gone.

**Delegation Recommendation:**
- Category: `quick` — delete unused config.
- Skills: `typescript-programmer` — ensure no dangling references.

**Skills Evaluation:**
- ✅ INCLUDED `typescript-programmer`
- ❌ OMITTED `git-master`: no commit requested.

**Depends On**: Task 4

**References:**
- `app/lib/test-games/games/breakoutBouncer/game.ts:97-102` — `velocityThreshold` variable definition.

**Acceptance Criteria**:
- [ ] `variables.velocityThreshold` removed.
- [ ] Project typecheck passes (`pnpm tsc --noEmit`) with no errors from this change.

---

### Task 6 (Optional): Remove redundant velocity rules / add a “stuck-ball” safeguard

**Description**: Decide whether any remaining logic conflicts with constant-speed ball, and optionally add a safeguard for the `maintain_speed` edge case where the ball reaches near-zero velocity.

**Delegation Recommendation:**
- Category: `unspecified-low` — requires judgment and gameplay verification.
- Skills: `typescript-programmer`, `game-inspector` — evaluate rules + verify behavior.

**Skills Evaluation:**
- ✅ INCLUDED `typescript-programmer`
- ✅ INCLUDED `game-inspector`
- ❌ OMITTED `frontend-ui-ux`, `dev-browser`: not primary.

**Depends On**: Task 3

**References:**
- `app/lib/test-games/games/breakoutBouncer/game.ts:323-438` — rule set; check for any ball velocity overrides (currently only impulses for launch/respawn).
- `app/lib/game-engine/behaviors/MovementBehaviors.ts:256-278` — the `currentSpeed > 0.01` guard that can allow a fully-stopped ball to remain stopped.

**Acceptance Criteria**:
- [ ] (If pruning) No rules remain that set the ball’s velocity in a way that fights `maintain_speed`.
- [ ] (If adding safeguard) Define a minimal, non-invasive rule such as:
  - On `frame`, if ball speed is below a tiny threshold, apply a small impulse in current direction (or a fixed upward direction) to bring it above 0.01.
  - Must not change normal gameplay feel; only triggers when the ball is effectively stopped.
- [ ] Manual verification: ball never comes to rest permanently.

---

### Task 7: Manual QA pass (full gameplay)

**Description**: Verify the game still plays correctly and the physics fixes achieved the goals.

**Delegation Recommendation:**
- Category: `unspecified-low` — end-to-end gameplay verification.
- Skills: `dev-browser`, `game-inspector` — interact + measure velocity.

**Skills Evaluation:**
- ✅ INCLUDED `dev-browser`: quick play session in web.
- ✅ INCLUDED `game-inspector`: confirm constant speed numerically.
- ❌ OMITTED `frontend-ui-ux`: not needed.

**Depends On**: Tasks 2, 3, 4, 5 (+6 if performed)

**Acceptance Criteria**:
- [ ] Ball speed remains ~8 m/s across:
  - wall hits
  - brick hits
  - paddle hits
- [ ] Paddle controls still feel responsive (left/right buttons, taps, tilt).
- [ ] Bricks still destroy + score appropriately.
- [ ] Drain still subtracts a life, respawns ball, and re-launches.
- [ ] Win condition triggers once all bricks are destroyed.
- [ ] No expression parser spam in logs.

---

## Commit Strategy

If the user wants commits, keep them atomic and conventional:

1. `fix(breakout-bouncer): make paddle perfectly elastic` (Task 2)
2. `fix(breakout-bouncer): maintain constant ball speed` (Task 3)
3. `fix(breakout-bouncer): remove broken paddle_friction rule` (Tasks 4–5)
4. (Optional) `fix(breakout-bouncer): add stuck-ball safeguard` (Task 6)

Verification before each commit:
- `pnpm tsc --noEmit`
- Manual play smoke test for the specific change

---

## Success Criteria

### Final verification commands
- `pnpm tsc --noEmit` → no TypeScript errors

### Final checklist
- [ ] Only file modified: `app/lib/test-games/games/breakoutBouncer/game.ts`
- [ ] Ball speed is constant (~8 m/s) regardless of collisions
- [ ] Paddle restitution is `1.0`
- [ ] `paddle_friction` rule removed; no expression errors in logs
- [ ] `velocityThreshold` variable removed; no dead references
- [ ] Brick destruction + scoring + lives + win/lose all unchanged
