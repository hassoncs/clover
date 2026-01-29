# Game Inspector ↔ Rapier Deterministic Stepping Integration Plan

## Context

### User request summary
Integrate the Game Inspector MCP time-control tools (pause/resume/step/setTimeScale/setSeed, plus screenshots) with the new deterministic stepping mechanism using the Rapier physics engine. When a game is opened in debug mode, it should start paused. Stepping should advance **N physics frames deterministically** while React drives the game rules loop, and screenshots should be capturable after stepping.

### Current architecture (verified from repo)

**MCP layer (Playwright):**
- `packages/game-inspector-mcp/src/tools/game-management.ts` opens URL with `?debug=true`, waits for:
  - `window.GodotDebugBridge.enabled === true` (`waitForDebugBridge`)
  - `window.SlopcadeDebugBridge.ready === true || window.slopcadeGameReady === true` (`waitForGameReady`)
  - then calls `querySlopcade(page, "pause", [])`.
- `packages/game-inspector-mcp/src/tools/time-control.ts` calls SlopcadeDebugBridge for `pause/resume/step/setTimeScale/getTimeState`; calls Godot debug bridge only for `set_seed` via `queryGodot(page, "setSeed", [seed, options])`.
- Screenshots are captured via Playwright in `packages/game-inspector-mcp/src/utils.ts:takeScreenshot(...)`.

**React runtime / SlopcadeDebugBridge:**
- `app/lib/game-engine/GameRuntime.godot.tsx`:
  - Maintains a JS game loop via `setInterval` when `debugMode` is false or not paused.
  - Exposes `window.SlopcadeDebugBridge = new SlopcadeDebugBridge(...)` when `debugMode`.
  - `pause()` clears JS interval and calls `bridgeRef.current?.pausePhysics()`.
  - `resume()` unpauses JS interval and calls `bridgeRef.current?.resumePhysics()`.
  - `step(frames)` calls `manualStep(frames)`.
  - `manualStep(frames)`:
    - ensures the JS interval is stopped
    - calls `await bridge.stepPhysics(frames)` (comment says Rapier `space_step` is synchronous)
    - then calls `stepGame(FIXED_DT)` in a loop `frames` times.
- `FIXED_DT` is currently `1/60`.

**Godot bridge (TypeScript):**
- `app/lib/godot/GodotBridge.web.ts:stepPhysics(frames)` sends a debug query `stepPhysicsSync` via `bridge.query(requestId, "stepPhysicsSync", JSON.stringify([frames]))`.
- `app/lib/godot/GodotBridge.native.ts:stepPhysics(frames)` is currently a stub (prints warning and returns `{ok:false}`), while pause/resume are implemented.

**Godot debug bridge (GDScript):**
- `godot_project/scripts/bridge/debug/DebugBridge.gd` registers handlers:
  - `getTimeState`, `pause`, `resume`, `step`, `stepPhysicsSync`, `setTimeScale`, `setSeed`.
- `godot_project/scripts/bridge/debug/DebugTime.gd`:
  - `pause()` sets `Engine.time_scale=0`, `tree.paused=true`, and disables auto physics (`PhysicsServer2D.space_set_active(space, false)`).
  - `step(frames)` is async and waits on `await tree.physics_frame`.
  - `step_physics_sync(frames)` uses `Engine.get_singleton("RapierPhysicsServer2D")` and calls `rapier.space_step(space, delta)` N times plus `rapier.space_flush_queries(space)`.
  - `set_seed()` calls GDScript `seed(new_seed)` and can toggle a deterministic mode flag.

### Key integration insight
There are **two stepping paths**:
1) **“Godot-only” time stepping** (`DebugTime.step` waiting on physics frames) and
2) **“Manual Rapier stepping”** (`DebugTime.step_physics_sync` called via `GodotBridge.web.ts:stepPhysics(...)`).

The desired behavior (“React drives the game loop; inspector steps N physics frames deterministically”) aligns with path (2): call Rapier `space_step` synchronously, then advance React rules loop by exactly N fixed steps.

### Research findings / gaps to guard against
1. **Dual pause domains**: React game loop pause (`debugPaused`) and Godot tree pause/physics pause are distinct. Plan must specify which authority is canonical in debug mode (recommend: SlopcadeDebugBridge is canonical for inspector actions).
2. **Native parity**: Native `GodotBridge.native.ts:stepPhysics` is unimplemented → inspector stepping will not work on iOS/Android unless implemented or scoped out.
3. **Seed determinism boundary**: Godot `set_seed` affects GDScript RNG; game logic in React may use `Math.random()` or other sources. Deterministic stepping requires deterministic RNG on BOTH sides if game rules use RNG.
4. **Fixed dt coupling**: React uses `FIXED_DT=1/60` but Godot delta is `1/Engine.physics_ticks_per_second`. If `Engine.physics_ticks_per_second != 60`, stepping N frames will desync.
5. **Screenshot timing**: Playwright screenshot after step must happen after both: (a) Rapier step has completed and (b) React has applied state updates and the canvas has rendered. In practice, might require an explicit “render flush” or next animation frame.

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| 1. Specify canonical stepping contract | None | Needed to align MCP, React runtime, and Godot debug APIs |
| 2. Align fixed timestep sources (dt + ticks-per-second) | 1 | Must decide which system owns dt before wiring calls |
| 3. Update Godot DebugTime/DebugBridge stepping APIs (Rapier-first) | 1, 2 | Provides authoritative deterministic stepping primitive |
| 4. Update GodotBridge.web/native stepping to call new API | 3 | TS bridge must expose the new stepping mechanism |
| 5. Update React GameRuntime.godot.tsx manualStep + debug pause rules | 1, 2, 4 | React must coordinate pause and step with bridge |
| 6. Update SlopcadeDebugBridge types/behavior to expose richer step result | 5 | MCP reads time state + step result via SlopcadeDebugBridge |
| 7. Update MCP tools wiring (open/pause/step/screenshot + determinism) | 6 | MCP is outermost consumer; depends on bridge contracts |
| 8. Determinism end-to-end (seeding + RNG in React + Godot) | 1, 3, 5 | Ensures repeatable stepping beyond physics determinism |
| 9. Verification plan (manual + optional automated) | 1–8 | Must validate end-to-end behavior against plan |

---

## Parallel Execution Graph

Wave 1 (Start immediately):
├── Task 1: Specify canonical stepping contract
└── Task 8: Determinism end-to-end analysis (RNG sources)

Wave 2 (After Wave 1 completes):
├── Task 2: Align fixed timestep sources
└── Task 3: Update Godot DebugTime/DebugBridge stepping APIs

Wave 3 (After Wave 2 completes):
├── Task 4: Update GodotBridge.web/native stepping to call new API
└── Task 5: Update React GameRuntime manualStep + pause rules

Wave 4 (After Wave 3 completes):
├── Task 6: Update SlopcadeDebugBridge types/behavior
└── Task 7: Update MCP tools wiring

Wave 5 (After Wave 4 completes):
└── Task 9: Verification plan execution (manual QA + optional test harness)

Critical Path: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 7 → Task 9
Estimated Parallel Speedup: ~25–35% (Task 8 can run in parallel with Task 1)

---

## Tasks

### Task 1: Define the canonical debug stepping contract

**Description**: Decide and document the single “truth” for stepping in debug mode and how APIs compose.

**Proposed contract (recommended)**:
- In `?debug=true` mode, **SlopcadeDebugBridge is the public API** the inspector uses.
- SlopcadeDebugBridge.step(frames) will:
  1) ensure simulation is paused (stops JS interval and disables auto physics)
  2) call `GodotBridge.stepPhysics(frames)` to advance Rapier deterministically
  3) call React rules `stepGame(fixedDt)` exactly `frames` times
  4) return a `StepResult` including a coherent combined time state

**Delegation Recommendation**:
- Category: `ultrabrain` - contract design across 3 runtimes (MCP ↔ React ↔ Godot)
- Skills: [`typescript-programmer`] - interface definitions + TS-level contracts

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: contract and typing changes across TS bridges
- ❌ OMITTED `dev-browser`: no browser automation needed for planning contract
- ❌ OMITTED `git-master`: no git operations in planning

**Depends On**: None

**Acceptance Criteria**:
- A written contract section exists in plan covering:
  - who owns pause state
  - exact order of operations for step
  - where determinism is guaranteed vs best-effort

### Task 2: Align fixed timestep between React and Godot

**Description**: Remove assumptions that physics dt is always 1/60.

**Recommended mechanism**:
- Add a TS bridge method or SlopcadeDebugBridge callback to query the authoritative fixed dt:
  - Option A (Godot authority): call Godot debug handler `getTimeState` and use `fixedDelta` (`DebugTime.get_time_state()` already returns it).
  - Option B (React authority): enforce `Engine.physics_ticks_per_second = 60` during debug + stepping.

**Preferred**: Option A, because it supports changes to ticks-per-second without silent desync.

**Files likely impacted**:
- `app/lib/game-engine/GameRuntime.godot.tsx` (replace `FIXED_DT` constant usage in manualStep)
- `godot_project/scripts/bridge/debug/DebugTime.gd` (ensure `fixedDelta` is reliable)
- Potentially `app/lib/game-engine/debug/types.ts` to expose `fixedDelta` in time state if needed.

**Delegation Recommendation**:
- Category: `unspecified-high` - cross-layer change, moderate complexity
- Skills: [`typescript-programmer`] - TS changes, matching existing patterns

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: needed for TS wiring changes
- ❌ OMITTED `frontend-ui-ux`: not UI related

**Depends On**: Task 1

**Acceptance Criteria**:
- Stepping uses a single fixed dt source (documented).
- No hard-coded assumption that `Engine.physics_ticks_per_second === 60` without enforcement.

### Task 3: Implement/standardize deterministic Rapier stepping in Godot debug modules

**Description**: Make sure the Godot debug bridge exposes a deterministic stepping primitive intended for inspector-driven stepping.

**Proposed API surface (Godot QuerySystem handlers)**:
- Keep existing handler for backward compatibility:
  - `stepPhysicsSync(frames)` (already registered)
- Consider adding a richer handler that also returns dt and/or flush behavior:
  - `stepPhysics(frames, options)` where options include `{ flushQueries?: boolean }`.

**Implementation approach**:
- In `godot_project/scripts/bridge/debug/DebugTime.gd`:
  - Ensure `enable_manual_stepping()` disables auto physics consistently for Rapier spaces.
  - Ensure `step_physics_sync(frames)`:
    - uses `delta = 1.0 / Engine.physics_ticks_per_second`
    - calls `RapierPhysicsServer2D.space_step(space, delta)` exactly N times
    - calls `space_flush_queries(space)` once after loop
    - increments a *physics-step counter* (ideally separate from “render frame”).

**Guardrails**:
- Avoid mixing `await tree.physics_frame` stepping with manual Rapier stepping for the same call; pick one.

**Files**:
- `godot_project/scripts/bridge/debug/DebugTime.gd`
- `godot_project/scripts/bridge/debug/DebugBridge.gd`

**Delegation Recommendation**:
- Category: `unspecified-high` - GDScript + engine integration
- Skills: [`golang-tui-programmer` ❌], [`python-programmer` ❌], [`typescript-programmer` ❌]
  - No perfect skill match available for GDScript; rely on category/model reasoning.

**Skills Evaluation**:
- ❌ OMITTED `typescript-programmer`: this task is GDScript, not TS
- ❌ OMITTED `dev-browser`: not browser work

**Depends On**: Tasks 1, 2

**Acceptance Criteria**:
- Godot debug handler exists that deterministically advances physics by N steps and returns:
  - ok, framesAdvanced, startFrame/endFrame, and time state including `fixedDelta`.
- Manual stepping disables auto stepping to prevent double-advancement.

### Task 4: Wire TS GodotBridge stepPhysics to the deterministic Rapier step

**Description**: Ensure `GodotBridge.stepPhysics(frames)` is implemented and consistent across web and native.

**Web** (already mostly in place):
- `app/lib/godot/GodotBridge.web.ts` calls query `stepPhysicsSync`.
- Confirm that the handler name matches `DebugBridge.gd` and that the returned payload includes `endFrame`.

**Native** (currently missing):
- Implement `app/lib/godot/GodotBridge.native.ts:stepPhysics(frames)` by calling a native-exposed bridge function analogous to web `query()`.
  - If JSI binding doesn’t support QuerySystem, add a minimal native method on `GameBridge` (GDScript) callable via `callGameBridge('step_physics_sync', frames)`.

**Files**:
- `app/lib/godot/GodotBridge.web.ts`
- `app/lib/godot/GodotBridge.native.ts`
- Potentially `godot_project/scripts/GameBridge.gd` to expose a callable hook for native.

**Delegation Recommendation**:
- Category: `unspecified-high` - platform bridge work, careful API alignment
- Skills: [`typescript-programmer`] - TS bridge work + typings

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: TS changes required
- ❌ OMITTED `git-master`: no git operations

**Depends On**: Task 3

**Acceptance Criteria**:
- Web: stepPhysics returns `{ok:true, framesAdvanced:N, endFrame:...}`.
- Native: stepPhysics is no longer a stub; returns the same shape.
- Failure mode is explicit and propagated to SlopcadeDebugBridge.step.

### Task 5: Update React runtime stepping to use new fixed dt and robust pause semantics

**Description**: Ensure debug mode starts paused and that stepping is deterministic and serial.

**Changes in `app/lib/game-engine/GameRuntime.godot.tsx`**:
- On `?debug=true` initialization, call `pause` once automatically after ready (or ensure MCP’s `open` pause call will always work).
  - Current MCP does `pause` after `waitForGameReady`, so this may already be sufficient; but adding an in-app default pause removes race conditions.
- Ensure `manualStep(frames)`:
  - is serialized (guard against concurrent calls)
  - uses `fixedDt` derived from Godot time state (Task 2)
  - calls `await bridge.stepPhysics(frames)` then loops `frames` times calling `stepGame(fixedDt)`.
- Ensure `stepGame` either:
  - updates React state in a deterministic way per step, OR
  - collects updates and applies them once per manualStep (if needed for performance).

**Delegation Recommendation**:
- Category: `unspecified-high` - complex runtime logic, risk of regressions
- Skills: [`typescript-programmer`] - TS/React changes

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: React/TS code
- ❌ OMITTED `frontend-ui-ux`: not UI focused

**Depends On**: Tasks 1, 2, 4

**Acceptance Criteria**:
- With `?debug=true`, game does not advance until `resume` or `step` is invoked.
- `step(frames)` advances physics and game logic by exactly N frames.
- No background interval keeps running while paused.

### Task 6: Extend SlopcadeDebugBridge step response for inspector needs

**Description**: Ensure inspector gets consistent state after step for reporting and later automation.

**Files**:
- `app/lib/game-engine/debug/types.ts` (`TimeState`, `StepResult`)
- `app/lib/game-engine/debug/SlopcadeDebugBridge.ts`
- `app/lib/game-engine/GameRuntime.godot.tsx` (where `StepResult` is assembled)

**Recommended additions**:
- Include `fixedDelta` and `physicsTicksPerSecond` in returned time state (mirrors Godot `DebugTime.get_time_state`).
- Include an explicit `debugPaused` boolean in response if it differs from `timeState.paused`.

**Delegation Recommendation**:
- Category: `unspecified-low` - interface shaping + minor plumbing
- Skills: [`typescript-programmer`]

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`
- ❌ OMITTED `dev-browser`

**Depends On**: Task 5

**Acceptance Criteria**:
- `querySlopcade(..., "step", [frames])` returns a JSON payload that includes:
  - ok, framesAdvanced, startFrame/endFrame
  - a timeState that includes dt/ticks-per-second (or documented alternative)

### Task 7: Update MCP time-control tools to match Rapier stepping + screenshot timing

**Description**: Ensure MCP tools call the right bridge(s), produce deterministic behavior, and can capture screenshots after stepping.

**Files**:
- `packages/game-inspector-mcp/src/tools/game-management.ts` (open should pause; already does)
- `packages/game-inspector-mcp/src/tools/time-control.ts` (step + set_seed)
- `packages/game-inspector-mcp/src/utils.ts` (optional: add a helper to wait one RAF after stepping before screenshot)
- `packages/game-inspector-mcp/src/types.ts` (fix mismatch: currently declares SlopcadeDebugBridge.step returns void, but runtime returns Promise)

**Specific wiring changes**:
1. Fix type mismatch in MCP types:
   - In `packages/game-inspector-mcp/src/types.ts`, change `SlopcadeDebugBridgeInterface.step(frames?: number): void` to `Promise<unknown>` (or concrete `StepResult`).
2. Screenshot-after-step reliability:
   - After `querySlopcade(..., "step")`, optionally `await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r(true))))` before Playwright screenshot.
3. Deterministic stepping session:
   - Provide a recommended usage pattern: `set_seed(seed, enableDeterministic=true)` then `pause()` then repeated `step()`.

**Delegation Recommendation**:
- Category: `unspecified-high` - MCP tool correctness impacts all users
- Skills: [`typescript-programmer`]

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: MCP code is TS
- ❌ OMITTED `agent-browser`: not needed; MCP already uses Playwright

**Depends On**: Task 6

**Acceptance Criteria**:
- `open` results in paused state.
- `step(frames, screenshot:true)` returns payload with screenshot path and updated time state.
- TypeScript for MCP package compiles cleanly.

### Task 8: End-to-end determinism (seed + RNG sources)

**Description**: Make determinism explicit and predictable across Godot (Rapier + GDScript RNG) and React rules.

**Decisions / actions**:
- Audit React runtime for RNG usage:
  - If game rules use `Math.random()`, add a seeded RNG (e.g., mulberry32) stored in runtime state and used everywhere randomness is needed.
- Tie SlopcadeDebugBridge `setSeed` concept to BOTH:
  - Godot `DebugTime.set_seed`
  - React runtime seeded RNG reset
- Document determinism guarantees:
  - “Given same game definition + same seed + same step sequence, physics and rules outcomes are identical.”

**Delegation Recommendation**:
- Category: `ultrabrain` - determinism is subtle and easy to get wrong
- Skills: [`typescript-programmer`]

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`
- ❌ OMITTED `data-scientist`

**Depends On**: Tasks 1, 3, 5

**Acceptance Criteria**:
- A deterministic seed sets both Godot and React RNG.
- Repeating the same step sequence yields identical snapshots (within tolerance).

### Task 9: Verification plan (manual QA-first)

**Description**: Verify the integration works in practice with the existing Game Inspector tooling.

**Manual QA steps (web)**:
1. Start dev servers: `pnpm dev`
2. Use MCP `open` on a known test game (e.g. `slopeggle`) and confirm response includes `paused: true`.
3. Call `get_time_state` and record state.
4. Call `set_seed` with a known seed (e.g. 42) and deterministic enabled.
5. Call `step` with `frames=1` and `screenshot=true`.
6. Capture snapshot via `game_snapshot` and compare positions/velocities across two identical runs.
7. Run `step_sequence` to generate a filmstrip and confirm frame labels monotonically increase.

**Manual QA steps (native)** (if in scope):
- Repeat similar stepping tests on iOS/Android once `GodotBridge.native.ts:stepPhysics` is implemented.

**Delegation Recommendation**:
- Category: `visual-engineering` - involves interacting with running app + verifying screenshots
- Skills: [`dev-browser`] - browser automation and inspection

**Skills Evaluation**:
- ✅ INCLUDED `dev-browser`: validate screenshot timing and behavior
- ❌ OMITTED `frontend-ui-ux`: not design work

**Depends On**: Tasks 1–8

**Acceptance Criteria**:
- Web: Two identical runs (seed + step sequence) produce identical snapshots and consistent screenshots.
- No unexpected auto-advancement when paused.

---

## Commit Strategy

Use small, conventional commits grouped by layer:

1. `fix(game-inspector): align SlopcadeDebugBridge types` (MCP types mismatch)
2. `feat(godot-debug): add deterministic rapier step contract` (DebugTime/DebugBridge handlers)
3. `feat(godot-bridge): implement stepPhysics on native` (if in scope)
4. `feat(game-runtime): deterministic manualStep uses Godot fixedDelta` (React runtime)
5. `feat(game-inspector): stabilize step screenshot timing` (MCP tool behavior)

Each commit should include a minimal manual verification note (commands + observed output).

---

## Success Criteria

1. Opening a debug game via inspector results in paused simulation (no physics or rules advancement until `resume` or `step`).
2. `step(N)` advances Rapier physics by exactly N steps and advances React rules by exactly N fixed steps.
3. With a fixed seed, repeating the same sequence of `step()` calls yields the same snapshot outputs.
4. Screenshot capture after stepping reliably reflects the post-step state.
