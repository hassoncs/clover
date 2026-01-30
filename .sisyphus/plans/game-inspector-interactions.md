# Enhance game-inspector interaction discovery + tap-by-id + pause reliability

## TL;DR

> **Quick Summary**: Improve the game-inspector MCP + bridges so agents can (1) see what is actually tappable/interactable, (2) tap by entity ID without coordinates, and (3) reliably interact with games by default (unpaused), eliminating “paused so nothing clicks” confusion.
>
> **Deliverables**:
> - `simulate_input` supports `targetEntityId` without `worldX/worldY` (computes canonical tap point, returns diagnostics)
> - `game_snapshot` always reports tappables/interactables (physics-hit-testable + explicit tap-target-derived)
> - `game_open` (or equivalent) ensures games start running by default; pause/query behavior is consistent
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Define interaction model → implement tap-by-id → implement tappable reporting → fix open/pause behavior → manual validation on Ball Sort

---

## Context

### Original Request
Enhance the game-inspector MCP tool and bridges so it can:
1) report what IS tappable/interactive,
2) allow tap by entity ID,
3) fix pause/query weirdness.

### Key Clarifications / Decisions
- Ball Sort gameplay is **tube-tap only** (balls should remain non-tappable). Ball Sort changes are **out of scope** unless a tooling-driven real bug is found.
- “Tappable/interactable” reporting should include **both**:
  - **Physics-hit-testable**: entities discoverable via a physics point query
  - **Explicit**: entities that are known tap targets (derived from game rules’ tap triggers / tag targets)
- Keep API surface minimal: **enhance existing `simulate_input`** to accept `targetEntityId` without coordinates.
- Testing: **manual validation only** using MCP tools (with screenshots/logs as evidence).
- Pause default: **start running (unpaused) by default** when opening games via inspector.

### Known Bridge Facts (from investigation)
- Simulated taps route through `godot_project/scripts/GameBridge.gd` (JS input path) and use `direct_space_state.intersect_point(...)` for hit testing, which only returns colliders (bodies/areas).
- Current pause is implemented as `Engine.time_scale = 0.0` / `1.0`, which can lead to interaction/query weirdness when paused.

### Metis Review (gaps addressed)
Metis flagged several planning risks and missing criteria. This plan incorporates them by:
- Defining a **canonical tap point** fallback order and forbidding silent (0,0) defaults.
- Requiring structured **diagnostics** in `simulate_input` outputs.
- Separating “why tappable” (**sources/reasons**) from “how to tap” (**tapPointWorld**).
- Adding explicit acceptance criteria for **open-unpaused** and **paused-query consistency**.

---

## Work Objectives

### Core Objective
Make game-inspector interaction automation reliable and self-explanatory by exposing interactables and enabling deterministic “tap entity X” actions.

### Concrete Deliverables
- `simulate_input` accepts `{ type: 'tap', targetEntityId }` with no coordinates.
- `game_snapshot` output includes an `interactables`/`tappables` section with:
  - ids,
  - why they are tappable (physics vs explicit),
  - a canonical `tapPointWorld` for each.
- `game_open` results in a running game by default; interactions work immediately.

### Definition of Done
- [ ] Using Ball Sort as validation:
  - `game_open` → game is unpaused
  - `game_snapshot` shows tubes as interactable/tappable (and does **not** claim balls are tappable)
  - `simulate_input({type:'tap', targetEntityId: <tubeId>})` triggers a visible game response

### Must NOT Have (Guardrails)
- Do **not** change Ball Sort interaction rules (tubes-only remains).
- Do **not** add automated test infrastructure.
- Do **not** broaden API surface with new MCP tools unless absolutely necessary.

---

## Verification Strategy (Manual QA Only)

### Evidence Standard
For each user-visible behavior change:
- capture tool output JSON (copy/paste), and
- save at least one screenshot via inspector tools (or record “skipScreenshot=false”).

### Primary Manual Validation Flow (Ball Sort)
1) `game-inspector_open('ballSort')`
2) `game-inspector_get_time_state()` → verify not paused (or timeScale=1)
3) `game-inspector_game_snapshot(detail='med')` → verify `tappables/interactables` present and includes tubes
4) Choose a tube id from snapshot output
5) `game-inspector_simulate_input({ type: 'tap', targetEntityId: '<tube-id>' })` (no worldX/worldY)
6) Verify resulting state change:
   - new tags (`held`) / ball moved / state updated
   - capture screenshot

---

## Execution Strategy

### Wave 1 (Start Immediately)
1) Baseline + contracts: reproduce pause issue, define canonical tap point algorithm and output schema
2) Implement `simulate_input` tap-by-id behavior + diagnostics

### Wave 2 (After Wave 1)
3) Add `tappables/interactables` reporting to snapshots (physics + explicit)
4) Fix “open starts paused” + pause/query weirdness; ensure consistent behavior across tools
5) Manual validation pass on Ball Sort + at least one other test game

---

## TODOs

> Notes:
> - The executor should treat “References” as the first step in each task: open those files and confirm exact function/symbol names before editing.
> - All tasks should include evidence capture (JSON outputs + screenshots where relevant).

- [ ] 1. Establish baseline + define interaction contract (tappable vs explicit; canonical tap point)

  **What to do**:
  - Reproduce current issue: open a game (Ball Sort) and confirm whether it is paused by default.
  - Write down the “canonical tap point” algorithm used for tap-by-id (fallback order):
    1) entity transform/world position
    2) if available, bounds/AABB center
    3) if neither available, return a structured error
  - Define a stable output schema to expose:
    - resolved tap point
    - resolved target entity id
    - whether pause state was modified
    - diagnostics (warnings / reasons)

  **Must NOT do**:
  - Don’t implement anything yet beyond confirming current behavior and locking the schema.

  **Recommended Agent Profile**:
  - **Category**: unspecified-high
    - Reason: cross-cutting behavior + needs careful contract definition.
  - **Skills**: [`game-inspector`, `slopcade-godot-bridge`]
    - `game-inspector`: understand current MCP tool shapes and constraints.
    - `slopcade-godot-bridge`: understand coordinate spaces + pause semantics.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: 2, 3, 4

  **References**:
  - `packages/game-inspector-mcp/` — find current `simulate_input` and snapshot tool definitions.
  - `app/lib/godot/debug/GodotDebugBridge.ts` — confirm what entity data is available (position, AABB, tags).
  - `godot_project/scripts/GameBridge.gd` — confirm pause implementation and simulated input path.

  **Acceptance Criteria (manual)**:
  - [ ] Documented (in commit/PR description or notes) tap point fallback order and snapshot “tappable” schema.
  - [ ] Captured baseline evidence:
    - `get_time_state` output after open
    - a snapshot snippet showing current lack of tappable reporting

  **Defaults Applied**:
  - Canonical tap point uses **world space**; UI/control-layer hit testing is **out of scope** unless the project already exposes it.


- [ ] 2. Enhance `simulate_input` to support tap-by-entity-id (no coordinates)

  **What to do**:
  - Update MCP `simulate_input` tool contract:
    - If `type==='tap'` and `targetEntityId` is provided but `worldX/worldY` are missing:
      - compute `worldX/worldY` from entity’s canonical tap point
      - perform tap
      - return a response including: resolved world coords, targetEntityId, and any warnings.
  - Ensure failure mode is explicit:
    - entity not found → error
    - entity has no locatable point → error
  - Ensure output includes enough diagnostics so an AI can self-correct.

  **Diagnostics to include (minimum)**:
  - `resolvedWorldX/resolvedWorldY`
  - `resolvedTargetEntityId` (may differ if tool resolves to a child collider)
  - `warnings[]` (e.g., “used AABB center fallback”)
  - `pauseStateChanged: boolean`

  **Must NOT do**:
  - Don’t add a new MCP tool (e.g. `tap_entity`).
  - Don’t silently default to (0,0) on missing position.

  **Recommended Agent Profile**:
  - **Category**: unspecified-high
  - **Skills**: [`game-inspector`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: 3

  **References**:
  - `packages/game-inspector-mcp/src/tools/interaction.ts` (or equivalent) — existing `simulate_input` tool.
  - Any existing “get entity” / “get props” bridge calls used by other tools.

  **Acceptance Criteria (manual)**:
  - [ ] Open Ball Sort and identify a tube entity id via query/snapshot.
  - [ ] Call `simulate_input({type:'tap', targetEntityId: <tubeId>})` with no coordinates.
  - [ ] Tool response includes: resolved `worldX/worldY`, `targetEntityId`, and indicates success.
  - [ ] Screenshot shows state change consistent with a tube tap.


- [ ] 3. Add `tappables/interactables` reporting to snapshots

  **What to do**:
  - Extend snapshot output (at MCP layer or bridge layer) to always include an `interactables` section that distinguishes:
    - **physicsHittable**: entities that have physics colliders / can be hit-tested
    - **explicitTapTargets**: entities matching game rule tap targets (e.g., tags targeted by tap rules)
  - Include for each entry (Metis model, minimal subset):
    - `entityId`
    - `sources: ['physics'|'explicit']`
    - `tapPointWorld: {x,y}` (canonical tap point)
    - optional: bounds/AABB if already available
    - `reasons[]` and `confidence` (even if simple)
  - Ensure Ball Sort snapshot lists **tubes** as explicit targets (because tap rules target `tube`).

  **Must NOT do**:
  - Don’t do expensive per-entity physics queries that will tank snapshot performance.
  - Don’t claim entities are tappable if you can’t provide a plausible tap point.

  **Recommended Agent Profile**:
  - **Category**: unspecified-high
  - **Skills**: [`game-inspector`, `slopcade-godot-bridge`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: 1, 2 (needs schema + tapPoint algorithm)
  - **Blocks**: 5

  **References**:
  - Snapshot tool implementation in `packages/game-inspector-mcp/src/tools/snapshot.ts` (or equivalent).
  - Bridge snapshot implementation `app/lib/godot/debug/GodotDebugBridge.ts`.
  - Rule definitions in runtime (via `window.__GAME_RUNTIME__`) to derive tap targets.
  - Ball Sort rules (reference): `app/lib/test-games/games/ballSort/game.ts` — shows tap triggers targeting `tube`.

  **Acceptance Criteria (manual)**:
  - [ ] `game_snapshot` JSON includes `interactables` section.
  - [ ] In Ball Sort, at least one interactable entry has `sources` including `explicit` and corresponds to a tube.
  - [ ] Balls are not listed as explicit interactables, and only appear as physics tappable if they truly have colliders (they should not).


- [ ] 4. Fix game open/pause defaults and pause/query weirdness

  **What to do**:
  - Ensure games opened via inspector start **running (unpaused)** by default.
  - If current architecture requires initial pause for debugging, change flow to:
    - open → wait for “ready” → resume
  - Ensure core queries (snapshot/find/queryPoint) remain consistent whether paused or running.
  - If required, adjust pause mechanism so it doesn’t break physics queries (e.g., avoid relying solely on `Engine.time_scale=0` for inspector sessions, or add explicit handling).

  **Edge cases to explicitly validate**:
  - Overlapping colliders at a point: results ordering is deterministic or tool returns top-N with ordering metadata.
  - Pause immediately after open: still can query and tap after ready.

  **Must NOT do**:
  - Don’t remove pause functionality entirely; just make default “open = running”.
  - Don’t introduce non-deterministic auto-resume behavior during unrelated tools unless documented.

  **Recommended Agent Profile**:
  - **Category**: unspecified-high
  - **Skills**: [`slopcade-godot-bridge`, `game-inspector`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: 1 (needs agreed semantics)
  - **Blocks**: 5

  **References**:
  - `godot_project/scripts/GameBridge.gd` — pause/resume implementations and input path.
  - MCP `game_open` implementation (in `packages/game-inspector-mcp/` tools) — where open flow and pause state is set.
  - TS debug bridge `app/lib/godot/debug/GodotDebugBridge.ts` — any pause/time controls exposed.

  **Acceptance Criteria (manual)**:
  - [ ] `game_open` then `get_time_state` shows unpaused/timeScale=1.
  - [ ] Clicking/tapping works immediately after open (manual tap or `simulate_input`).
  - [ ] While paused (after explicitly pausing), `game_snapshot` and `game_at_point/queryPoint` still return consistent results.


- [ ] 5. Manual validation sweep + documentation updates (tool behavior)

  **What to do**:
  - Validate end-to-end on Ball Sort (primary) and one additional test game that uses physics tappables.
  - Document in tool docs/README:
    - `simulate_input` tap-by-id behavior
    - snapshot `interactables` schema and interpretation
    - pause default semantics

  **Recommended Agent Profile**:
  - **Category**: writing
  - **Skills**: [`game-inspector`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: 2, 3, 4

  **References**:
  - `packages/game-inspector-mcp/README.md` (or equivalent documentation location).

  **Acceptance Criteria (manual)**:
  - [ ] Evidence captured (JSON + screenshots) demonstrating:
    - snapshot interactables
    - simulate_input by id
    - open unpaused
  - [ ] Docs updated to describe the new behaviors and failure modes.

---

## Commit Strategy

Prefer small, conventional commits:
- `feat(game-inspector): allow simulate_input tap by entity id`
- `feat(game-inspector): report snapshot interactables`
- `fix(game-inspector): open games unpaused and stabilize pause queries`
- `docs(game-inspector): document interactables + tap-by-id`

---

## Success Criteria (final)
- [ ] Agent can open Ball Sort, see tube interactables, and tap a tube by entity ID without coordinates.
- [ ] Default open state is running (unpaused); interactions work immediately.
- [ ] When paused explicitly, queries remain consistent and tools return clear diagnostics.
