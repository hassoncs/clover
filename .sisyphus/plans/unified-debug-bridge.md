# Unified Debug Bridge (SlopcadeDebugBridge) — Phases 1–4

## TL;DR

> **Quick Summary**: Implement a React-owned `window.SlopcadeDebugBridge` that becomes the single time driver for debugging, so MCP stepping advances **rules + state + Godot physics** via `stepGame(FIXED_DT)`.
>
> **Deliverables**:
> - `window.SlopcadeDebugBridge` (top-level window) with time control + snapshot + readiness
> - Debug-mode time control in `GameRuntime.godot.tsx` (manual stepping + controllable interval)
> - MCP time-control tools updated to call `SlopcadeDebugBridge` (not Godot)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: GameRuntime debug time control → Bridge API → MCP time-control migration

---

## Context

### Original Request
Implement a unified debug bridge (`SlopcadeDebugBridge`) to fix MCP stepping so it advances React rules/state and Godot physics together.

### Key Problem
MCP currently calls Godot stepping (physics-only). React rules are driven by a `setInterval` loop, which does not advance during batch stepping, so rules don’t fire and state doesn’t change.

### Confirmed Design Decisions
- **React drives time**: `SlopcadeDebugBridge.step(n)` calls `stepGame(FIXED_DT)` n times.
- **Global location**: `window.SlopcadeDebugBridge` on the **top-level window only**.
- **Debug resume behavior**: In `debug=true`, `resume()` starts continuous ticking (like today’s interval) until paused.
- **MCP scope (Phase 4)**: Migrate **time-control tools only**: `get_time_state`, `pause`, `resume`, `step`, `set_time_scale`.
- **Readiness**: MCP should wait for `window.SlopcadeDebugBridge?.ready === true` (React may also keep setting `window.slopcadeGameReady` temporarily).
- **Fixed timestep**: `FIXED_DT = 1/60`.
- Bridge should expose **`frame`** count and **`elapsed`** time.

### Known Code Anchors (verified)
- `app/lib/game-engine/GameRuntime.godot.tsx`
  - `GAME_LOOP_INTERVAL = 16;` (line ~95)
  - `stepGame` callback (line ~803)
  - `setInterval` game loop effect (line ~1113–1136)
  - debug-mode autostart to playing (line ~676–689)
  - sets `window.slopcadeGameReady = true` after setup (line ~692–695)
  - exposes `window.__GAME_RUNTIME__` for input (line ~1385)
- `packages/game-inspector-mcp/src/utils.ts`
  - `waitForDebugBridge()` waits for `window.GodotDebugBridge.enabled === true` (line ~136)
  - `waitForGameReady()` waits for `window.slopcadeGameReady === true` (line ~151)
- `packages/game-inspector-mcp/src/tools/time-control.ts`
  - time tools call `queryGodot(..., "pause|resume|step|setTimeScale|getTimeState")`

---

## Work Objectives

### Core Objective
Make frame stepping deterministic and unified by routing time control through React (`stepGame`) instead of Godot-only stepping.

### Definition of Done
- [ ] In debug mode, the game **does not** tick automatically until `SlopcadeDebugBridge.resume()` is called.
- [ ] `SlopcadeDebugBridge.step(300)` advances ~5 seconds of gameplay: rules run, physics advances, and state changes are observable.
- [ ] MCP time-control tools call `SlopcadeDebugBridge` (not Godot).
- [ ] MCP `open` readiness uses `window.SlopcadeDebugBridge.ready` (with fallback to `slopcadeGameReady`).

### Must NOT Have (Guardrails)
- Must NOT put `SlopcadeDebugBridge` on the Godot iframe window (top-level only).
- Must NOT reintroduce time being driven by Godot stepping.
- Must NOT break non-debug behavior: normal gameplay should remain interval-driven as before.

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest exists in repo)
- **User wants tests**: Not requested; prioritize **manual verification via MCP tools** + typecheck.

### Required Verification Commands
- `pnpm tsc --noEmit`
- `pnpm test` (or `pnpm --filter <affected package> test` if the monorepo is heavy)

### Manual QA (MCP-driven)
Use `game-inspector-mcp` tools after Phase 4 to validate stepping & pause/resume.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Bridge foundation + dt constants)
├── Task 1: Add debug module files (types + class)
└── Task 2: Add fixed-dt + manual stepping hooks in GameRuntime

Wave 2 (Wire bridge to runtime + time control semantics)
└── Task 3: Expose `window.SlopcadeDebugBridge`, integrate pause/resume/step/timeScale/frame/elapsed

Wave 3 (MCP migration for time-control)
├── Task 4: Update MCP waitForGameReady → SlopcadeDebugBridge.ready (+ fallback)
└── Task 5: Update MCP time-control tools to call SlopcadeDebugBridge

Critical Path: 2 → 3 → 5

---

## TODOs (Phases 1–4)

### 1) Phase 1 — Create SlopcadeDebugBridge foundation (new files)

**What to do**:
- Create `app/lib/game-engine/debug/types.ts`
  - Define minimal interfaces needed for Phases 1–4:
    - `SlopcadeDebugBridge` (time control + getSnapshot + readiness)
    - `TimeState` (paused, timeScale, frame, elapsed, gameState)
    - `GameSnapshot` union/shape that can hold Godot snapshot + React state (don’t over-specify Godot snapshot yet).
- Create `app/lib/game-engine/debug/SlopcadeDebugBridge.ts`
  - Implement a class that wraps React-owned callbacks/refs and exposes:
    - `ready: boolean`
    - `pause()` / `resume()`
    - `step(frames=1)`
    - `setTimeScale(scale)`
    - `getTimeState()` returning `{ paused, timeScale, frame, elapsed, gameState }`
    - `getSnapshot(opts)` returning merged `{ timeState, react: {...}, godot: ... }`
  - Treat Godot snapshot as `unknown` or `Record<string, unknown>` (MCP snapshot tools still use Godot directly).
- Create `app/lib/game-engine/debug/index.ts` exporting the above.

**Must NOT do**:
- Don’t attempt full entity/query/property APIs yet (Phase 3/5+).
- Don’t introduce iframe-window bridging.

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
  - Reason: needs careful API design and integration boundaries.
- **Skills**: `slopcade-game-builder`, `game-inspector`
  - `slopcade-game-builder`: understands engine refs + stepping semantics.
  - `game-inspector`: aligns bridge API with MCP needs.

**Parallelization**:
- Can Run In Parallel: YES
- Parallel Group: Wave 1 (with Task 2)
- Blocks: Task 3
- Blocked By: None

**References**:
- Plan spec: `docs/game-inspector/unified-debug-bridge-plan.md` (API + rationale)
- Runtime time metrics: `app/lib/game-engine/GameRuntime.godot.tsx:elapsedRef, frameIdRef` (time/frame source of truth)

**Acceptance Criteria**:
- [ ] New files exist and compile.
- [ ] `pnpm tsc --noEmit` passes.

---

### 2) Phase 2 — Refactor time control in GameRuntime (manual stepping + FIXED_DT)

**What to do**:
- In `app/lib/game-engine/GameRuntime.godot.tsx`:
  1. Add `const FIXED_DT = 1 / 60;` near `GAME_LOOP_INTERVAL` (around line ~95).
  2. Add a `manualStep(frames: number)` function near `stepGame` (around line ~803) that:
     - Ensures the interval is not running while stepping.
     - Loops `frames` times calling `stepGame(FIXED_DT)`.
  3. Add a debug-time paused flag in React (e.g., `const [debugPaused, setDebugPaused] = useState(debugMode);`).
     - Initial state for `debugMode=true` should be **paused** (so interval does not start).
  4. Modify the `setInterval` effect (around lines ~1113–1136) so it only runs when:
     - `isReady === true`
     - `gameState.state === "playing"`
     - AND `(debugMode ? debugPaused === false : true)`
  5. Ensure pause/resume operations clear/set the interval deterministically.

**Must NOT do**:
- Must not change non-debug timing semantics beyond necessary gating.
- Must not step using `GAME_LOOP_INTERVAL`; stepping uses `FIXED_DT`.

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
  - Reason: medium-risk refactor; must preserve existing behavior.
- **Skills**: `slopcade-game-builder`
  - `slopcade-game-builder`: avoids regressions in runtime loop.

**Parallelization**:
- Can Run In Parallel: YES
- Parallel Group: Wave 1 (with Task 1)
- Blocks: Task 3
- Blocked By: None

**References**:
- `app/lib/game-engine/GameRuntime.godot.tsx:95` — `GAME_LOOP_INTERVAL`
- `app/lib/game-engine/GameRuntime.godot.tsx:803` — `stepGame(rawDt)`
- `app/lib/game-engine/GameRuntime.godot.tsx:1113–1136` — interval loop effect
- `app/lib/game-engine/GameRuntime.godot.tsx:676–689` — debug-mode sets state to `playing`

**Acceptance Criteria**:
- [ ] In `debug=true`, game does **not** advance until `resume()` or manual stepping.
- [ ] Manual stepping increments `frameIdRef` and `elapsedRef` predictably.
- [ ] `pnpm tsc --noEmit` passes.

---

### 3) Phase 3 — Wire SlopcadeDebugBridge into GameRuntime (core methods)

**What to do**:
- In `app/lib/game-engine/GameRuntime.godot.tsx`:
  1. Construct a `SlopcadeDebugBridge` instance once the runtime is ready (near the end of `setup()` after `setIsReady(true)` and before/after setting `slopcadeGameReady`, around line ~690).
  2. Expose it as `window.SlopcadeDebugBridge` (top-level) and set `bridge.ready = true` when fully initialized.
  3. Keep compatibility: continue setting `window.slopcadeGameReady = true` for now.
  4. Provide bridge implementations by wiring to runtime:
     - `pause()`:
       - set `debugPaused=true`
       - stop interval (clear `gameLoopRef`)
       - pause physics (`bridgeRef.current?.pausePhysics()`) if appropriate
       - pause rules (`gameRef.current?.rulesEvaluator.pause()`)
     - `resume()`:
       - set `debugPaused=false`
       - resume physics (`resumePhysics()`)
       - resume rules (`rulesEvaluator.resume()`; ensure started in debug mode)
       - interval effect will kick in automatically
     - `step(n)`:
       - ensure paused (call `pause()` first or enforce)
       - call `manualStep(n)`
     - `setTimeScale(scale)`:
       - call existing `setTimeScale` callback (already present around line ~785)
     - `getTimeState()`:
       - return `{ paused: debugPaused, timeScale: timeScaleRef.current, frame: frameIdRef.current, elapsed: elapsedRef.current, gameState: gameState.state, score: gameState.score, lives: gameState.lives }`
     - `getSnapshot(opts)`:
       - capture React state (at least `gameState`, `frame`, `elapsed`, `timeScale`)
       - optionally include a Godot snapshot by delegating to `window.GodotDebugBridge?.getSnapshot(...)` (as `unknown`)
  5. Ensure cleanup on unmount:
     - delete `window.SlopcadeDebugBridge` and (optionally) reset `ready=false`.

**Must NOT do**:
- Don’t move `__GAME_RUNTIME__` input surface yet (interaction tool depends on it).
- Don’t rewrite snapshot/query/physics tools in MCP in this phase.

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
  - Reason: cross-system coordination and lifecycle correctness.
- **Skills**: `slopcade-game-builder`, `game-inspector`

**Parallelization**:
- Can Run In Parallel: NO
- Parallel Group: Wave 2
- Blocks: Task 4, Task 5
- Blocked By: Tasks 1–2

**References**:
- `app/lib/game-engine/GameRuntime.godot.tsx:690–695` — readiness + `slopcadeGameReady`
- `app/lib/game-engine/GameRuntime.godot.tsx:785–801` — `setTimeScale` callback
- `app/lib/game-engine/GameRuntime.godot.tsx:803+` — `stepGame` updates `elapsedRef` + `frameIdRef`
- `app/lib/game-engine/GameRuntime.godot.tsx:1113–1136` — interval loop control

**Acceptance Criteria**:
- [ ] On a debug page load, `window.SlopcadeDebugBridge` exists and `ready === true` once setup completes.
- [ ] Calling `pause()` stops automatic ticking; calling `resume()` starts it.
- [ ] Calling `step(60)` increments `frame` by 60 and `elapsed` by ~1.0s.

---

### 4) Phase 4 — MCP: update readiness wait to SlopcadeDebugBridge.ready (with fallback)

**What to do**:
- In `packages/game-inspector-mcp/src/types.ts`:
  - Extend `WindowWithBridge` to include optional `SlopcadeDebugBridge?: { ready?: boolean; ... }` with minimal shape needed.
- In `packages/game-inspector-mcp/src/utils.ts`:
  - Update `waitForGameReady()` (currently checks `slopcadeGameReady`) to:
    1. Prefer `w.SlopcadeDebugBridge?.ready === true`
    2. Fallback to `w.slopcadeGameReady === true` (back-compat)

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: narrow change, low risk.
- **Skills**: `game-inspector`

**Parallelization**:
- Can Run In Parallel: YES
- Parallel Group: Wave 3 (with Task 5)
- Blocks: time-control tools being reliable
- Blocked By: Task 3 (bridge must exist)

**References**:
- `packages/game-inspector-mcp/src/utils.ts:151–164` — current readiness wait
- `app/lib/game-engine/GameRuntime.godot.tsx:692–695` — current `slopcadeGameReady` set

**Acceptance Criteria**:
- [ ] `open` no longer fails if `slopcadeGameReady` is removed in future (as long as SlopcadeDebugBridge is present).
- [ ] Back-compat remains: if bridge isn’t present, old flag still works.

---

### 5) Phase 4 — MCP: migrate time-control tools to SlopcadeDebugBridge

**What to do**:
- In `packages/game-inspector-mcp/src/utils.ts`:
  - Add a helper `querySlopcade<T>(page, method, args)` similar to `queryGodot`, but executed against top-level `window.SlopcadeDebugBridge`.
    - If missing, return `{ error: "SlopcadeDebugBridge not available" }`.
    - Keep `queryGodot` for other tools.
- In `packages/game-inspector-mcp/src/tools/time-control.ts`:
  - Replace calls:
    - `queryGodot(..., "getTimeState")` → `querySlopcade(..., "getTimeState")`
    - `pause|resume|step|setTimeScale` likewise.
  - Ensure `step_sequence` uses the new stepping so frame batching advances rules too.
  - Keep screenshot behavior unchanged.

**Must NOT do**:
- Don’t migrate snapshot/query/physics/properties/events yet.

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
  - Reason: tool contract must remain stable; stepping semantics change.
- **Skills**: `game-inspector`
  - `game-inspector`: ensures tool API consistency.

**Parallelization**:
- Can Run In Parallel: YES
- Parallel Group: Wave 3 (with Task 4)
- Blocks: final acceptance checks
- Blocked By: Task 3

**References**:
- `packages/game-inspector-mcp/src/tools/time-control.ts:7–164` — current time tools
- `packages/game-inspector-mcp/src/utils.ts:166–206` — `queryGodot` helper patterns

**Acceptance Criteria (manual, via MCP tools)**:
- [ ] `game_open flappyBird` (or equivalent) completes and reports success.
- [ ] `get_time_state` returns JSON with `paused`, `timeScale`, `frame`, `elapsed`.
- [ ] `pause` sets paused true (and stopping time progression).
- [ ] `step 300`:
  - `elapsed` increases by ~5 seconds.
  - Visual: bird falls, pipes spawn over time (screenshot evidence).
- [ ] `set_time_scale 0.5` slows progression (compare `elapsed` delta per frames stepped).

---

## Future Work (Phases 5–6, not in scope)

### Phase 5 — Rules inspection
- Instrument `RulesEvaluator` to expose rule state and recently-triggered rules.

### Phase 6 — Event logging system
- Ring-buffered event log with subscribe/query.

---

## Success Criteria (end-to-end)

### Verification Commands
```bash
pnpm tsc --noEmit
pnpm test
```

### MCP-driven Checklist
- [ ] `step(300)` advances ~5 seconds of gameplay (rules + physics).
- [ ] `simulate_input({type:'tap'})` still works (via `window.__GAME_RUNTIME__`).
- [ ] `getSnapshot()` from SlopcadeDebugBridge returns score/lives/state + optional Godot snapshot.
