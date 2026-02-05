# Engine Event System, Logging & Communication Unification

## TL;DR

> **Quick Summary**: Unify the game engine's fragmented event system (3 refs → 1 queue), add structured logging with levels/categories, fix entity spawn/destroy communication gaps, and make the game inspector auto-advance frames on events.
> 
> **Deliverables**:
> - `GameEventQueue` class replacing `pendingLifecycleEventsRef`, `collisionsRef`, and discrete input events
> - `GameLogger` (TS) + `Logger.gd` (GDScript) with level/category support + MCP `set_log_level` tool
> - Auto-step in inspector mode (events trigger frame advance when paused)
> - Fix destroy path for non-physics entities (currently leak in Godot)
> - Fix script `setEntityPosition` to actually reach Godot
> - Post-implementation integration tests confirming the unified system works
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 2 waves (Logger parallel with research validation, then sequential core work)
> **Critical Path**: Task 1 → Task 3 → Task 4 → Task 5 → Task 6 → Task 8

---

## Context

### Original Request
User requested a unified plan from three research documents covering:
1. Complete game loading flow and `game_loaded` timing issues
2. Event system fragmentation, game inspector deadlock, and logging proposal
3. JS↔Godot communication patterns, spawn/destroy lifecycle inconsistencies

### Research Documents
- `.claude/memory/research/01-complete-code-flow-loading-a-game.md` — 10-phase loading flow, `game_loaded` timing bug
- `.claude/memory/research/02-event-unification-inspector-logging.md` — 3 event pipelines, GameEventQueue proposal, auto-step design, logger proposal
- `.claude/memory/research/03-js-godot-communication-patterns.md` — 89 bridge methods, 2 spawn patterns, destroy leak, script position gap

### Key Findings From Research
- **3+ separate event refs** (`pendingLifecycleEventsRef`, `collisionsRef`, `inputRef`) with different consumption patterns
- **Entity spawn has 2 patterns**: SpawnActionExecutor (Godot-authoritative) vs RunScriptActionExecutor (TS-optimistic)
- **Entity destroy only reaches Godot through Physics2D adapter** — visual-only entities leak in Godot scene tree
- **Script `setEntityPosition()` doesn't reach Godot** — overwritten next frame by syncTransformsFromPhysics
- **Game inspector requires manual `step(1)` after `simulate_input`** — confusing, error-prone
- **~40 unconditional `console.log` statements** in hot paths with no level control

### Metis Review
**Identified Gaps** (addressed):
- Rollback strategy: Logger is additive (safe). Event queue uses feature flag approach (migrate one type at a time, old refs removed only after all types work).
- Native platform: Explicitly excluded from this plan — web bridge only. Native uses same `GodotBridge` interface so changes propagate via `types.ts`.
- Performance: No new per-frame allocations in event queue (drain returns array by swap, no copy).
- Inspector mode detection: Already reliable via `timeControl.mode === 'inspect'` — set by `SlopcadeDebugBridge`.
- Error handling scope: Only spawn/destroy get error handling, not all 72 bridge methods.

---

## Work Objectives

### Core Objective
Replace fragmented event handling and inconsistent entity lifecycle communication with unified, predictable patterns that work cleanly with the game inspector.

### Concrete Deliverables
- `app/lib/game-engine/GameEventQueue.ts` — unified event queue class
- `app/lib/game-engine/debug/Logger.ts` — TypeScript logger with levels and categories
- `godot_project/scripts/utils/Logger.gd` — GDScript logger with levels and categories
- MCP `set_log_level` tool in `packages/game-inspector-mcp/`
- Updated `GameRuntime.godot.tsx` — uses event queue, auto-step, logger
- Updated `EntityManager.ts` — direct bridge.destroyEntity for all entities
- Updated `RunScriptActionExecutor.ts` — setEntityPosition calls bridge
- Updated `SpawnActionExecutor.ts` — unified spawn pattern
- Post-implementation integration test file

### Definition of Done
- [x] `pnpm test` passes (stale tests deleted, new tests added)
- [x] `pnpm tsc --noEmit` passes (no type errors)
- [ ] Ball Sort game loads and plays correctly (smoke test via game inspector)
- [x] Game inspector: `simulate_input(tap)` auto-advances frame without manual `step(1)`
- [x] Visual-only entities can be spawned and destroyed without leaking in Godot

### Must Have
- Single event queue for all discrete events (lifecycle, collisions, taps, drag_end)
- `inputRef` kept for continuous state (drag position, held buttons, mouse position)
- Auto-step in inspector mode with rate limiting
- Direct `bridge.destroyEntity()` call for ALL entities, not just physics entities
- Logger with configurable levels per category

### Must NOT Have (Guardrails)
- **NO changes to native bridge** (`GodotBridge.native.ts`) — web bridge only, interface stays compatible
- **NO rewriting the input system** — only migrate discrete events (tap, drag_end) to queue; continuous state stays in `inputRef`
- **NO error handling on all 72 bridge methods** — only spawn/destroy
- **NO changing event timing semantics** — events still process on next frame, not immediately
- **NO production auto-step** — only when `timeControl.mode === 'inspect'`
- **NO comprehensive test suite** — max 5-7 focused tests post-implementation
- **NO refactoring game state machine** — only fix event queue consumption timing
- **NO GDScript Logger migration of existing prints** — create Logger.gd, use in new code, but don't mass-migrate existing `print()` calls

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks are verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES (bun test via `pnpm test`)
- **Automated tests**: Tests-after (delete stale tests during refactor, add new after implementation)
- **Framework**: bun test (existing)

### Tests to Delete During Refactor
- `app/lib/game-engine/__tests__/game-loaded-event.integration.test.ts` — will break when pendingLifecycleEventsRef is removed; replaced by new event queue test
- `app/lib/game-engine/__tests__/trigger-type-casing.test.ts` — verify if still relevant; delete if it tests removed code paths

### Tests to Add Post-Implementation (Task 8)
1. **GameEventQueue unit test** — push/drain/peek/onEventQueued callback
2. **Logger unit test** — level filtering, category overrides, shouldLog logic
3. **Entity spawn integration** — both rule-based and script-based spawn produce same result
4. **Entity destroy completeness** — physics entities AND visual-only entities destroyed in both TS and Godot
5. **Event queue integration with stepGame** — lifecycle events, collisions, and taps all flow through queue correctly

### Agent-Executed QA Scenarios (per-task, below)

Each task includes Playwright/MCP scenarios for integration verification.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: GameLogger (TS + GDScript + MCP tool)
└── Task 2: Delete stale tests + verify test baseline

Wave 2 (After Wave 1):
└── Task 3: GameEventQueue class + migrate lifecycle events

Wave 3 (After Task 3):
├── Task 4: Migrate collisions + input events to queue
└── Task 5: Fix entity destroy path (direct bridge call)

Wave 4 (After Task 4):
├── Task 6: Auto-step in inspector mode
└── Task 7: Fix script setEntityPosition + unify spawn pattern

Wave 5 (After all above):
└── Task 8: Post-implementation integration tests + smoke test

Critical Path: Task 1 → Task 3 → Task 4 → Task 6 → Task 8
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3 (logger used in new code) | 2 |
| 2 | None | 3 (clean test baseline) | 1 |
| 3 | 1, 2 | 4, 6 | None |
| 4 | 3 | 6 | 5 |
| 5 | 3 | 8 | 4 |
| 6 | 4 | 8 | 7 |
| 7 | 3 | 8 | 6 |
| 8 | 4, 5, 6, 7 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2 | Quick tasks — `category="quick"` parallel |
| 2 | 3 | Core architecture — `category="unspecified-high"` |
| 3 | 4, 5 | Medium tasks — parallel `category="unspecified-high"` |
| 4 | 6, 7 | Medium tasks — parallel `category="unspecified-high"` |
| 5 | 8 | Testing — `category="unspecified-high"`, `load_skills=["playwright"]` |

---

## TODOs

- [x] 1. Create GameLogger (TypeScript + GDScript + MCP tool)

  **What to do**:
  - Create `app/lib/game-engine/debug/Logger.ts` with `LogLevel` enum, `LogCategory` type, and `GameLogger` class (singleton export `logger`)
  - Levels: SILENT(0), ERROR(1), WARN(2), INFO(3), DEBUG(4), TRACE(5)
  - Categories: `lifecycle`, `input`, `physics`, `rules`, `entities`, `bridge`, `assets`, `render`, `state`, `loop`, `inspector`
  - Default level: `LogLevel.WARN` (matches current behavior — most console.logs are suppressed)
  - Per-category override: `configure({ categories: { lifecycle: LogLevel.DEBUG } })`
  - Expose `logger` on `window.__GAME_RUNTIME__` so MCP can control it
  - Create `godot_project/scripts/utils/Logger.gd` with matching Level enum and category-based filtering
  - Add `set_log_level` MCP tool in `packages/game-inspector-mcp/src/tools/` — evaluates `window.__GAME_RUNTIME__.logger.configure(...)` in page context
  - Migrate console.log statements in `GameRuntime.godot.tsx` to use `logger.info('lifecycle', ...)` / `logger.debug('loop', ...)` / `logger.trace('loop', ...)`
  - Migrate console.log statements in `RulesSystem.ts` to use `logger.debug('rules', ...)`

  **Must NOT do**:
  - Do NOT migrate GDScript `print()` calls — only create Logger.gd and use for new code
  - Do NOT change behavior for `console.error` / `console.warn` — those stay
  - Do NOT add logger to hot paths without TRACE level (per-frame logging must be opt-in)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mostly file creation with clear spec, minimal codebase coupling
  - **Skills**: []
    - No special skills needed — straightforward file creation + search-and-replace

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3 (logger used in new event queue code)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/lib/game-engine/debug/SlopcadeDebugBridge.ts` — existing debug module structure, how debug tools are organized
  - `app/lib/game-engine/debug/types.ts` — existing debug type patterns

  **API/Type References**:
  - `packages/game-inspector-mcp/src/tools/interaction.ts` — how MCP tools evaluate code in page context via `page.evaluate()`
  - `packages/game-inspector-mcp/src/tools/time.ts` — MCP tool registration pattern

  **Documentation References**:
  - `.claude/memory/research/02-event-unification-inspector-logging.md` § 6 — full Logger proposal with code examples, category table, and GDScript version

  **External References**:
  - None needed — custom logger is simpler than importing a library for this use case

  **Acceptance Criteria**:
  - [ ] `app/lib/game-engine/debug/Logger.ts` exists with GameLogger class, LogLevel enum, LogCategory type
  - [ ] `godot_project/scripts/utils/Logger.gd` exists with matching Level enum
  - [ ] MCP tool `set_log_level` registered in game-inspector-mcp
  - [ ] All `console.log` in `GameRuntime.godot.tsx` replaced with `logger.*()` calls
  - [ ] All `console.log` in `RulesSystem.ts` replaced with `logger.*()` calls
  - [ ] Default behavior: `LogLevel.WARN` — existing console.log noise is suppressed
  - [ ] `pnpm tsc --noEmit` passes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Logger suppresses debug output by default
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, ballSort game loaded
    Steps:
      1. Open game in game inspector
      2. Get console logs: get_console_logs tool
      3. Assert: No "[lifecycle:debug]" or "[loop:trace]" messages in output
      4. Set log level: evaluate `window.__GAME_RUNTIME__.logger.configure({ categories: { lifecycle: 5 } })`
      5. Step 1 frame
      6. Get console logs again
      7. Assert: "[lifecycle" messages now appear
    Expected Result: Logger respects configured levels
    Evidence: Console log output captured

  Scenario: MCP set_log_level tool works
    Tool: Game Inspector MCP
    Preconditions: Game loaded in inspector
    Steps:
      1. Call set_log_level with level="debug", category="rules"
      2. Step 1 frame (with a game that has rules)
      3. Get console logs filtered by "rules"
      4. Assert: "[rules:debug]" messages present
    Expected Result: MCP tool controls logger
    Evidence: Console logs captured
  ```

  **Commit**: YES
  - Message: `feat(game-engine): add structured logging with levels and categories`
  - Files: `app/lib/game-engine/debug/Logger.ts`, `godot_project/scripts/utils/Logger.gd`, `packages/game-inspector-mcp/src/tools/logging.ts`, `app/lib/game-engine/GameRuntime.godot.tsx`, `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts`
  - Pre-commit: `pnpm tsc --noEmit`

---

- [x] 2. Delete stale tests and verify test baseline

  **What to do**:
  - Delete `app/lib/game-engine/__tests__/game-loaded-event.integration.test.ts` — will break when event refs are removed
  - Check `app/lib/game-engine/__tests__/trigger-type-casing.test.ts` — if it tests `convertFrameInputEvents` or `pendingLifecycleEventsRef`, delete; if it tests trigger type string matching only, keep
  - Run `pnpm test` and confirm remaining tests pass (establish green baseline before refactor)
  - Record which tests pass and their count

  **Must NOT do**:
  - Do NOT delete tests outside the game-engine directory
  - Do NOT delete `packages/game-bundler/src/__tests__/virtual-bundle-integration.test.ts` — unrelated

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Read tests, decide keep/delete, run test suite — trivial
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3 (need clean test baseline)
  - **Blocked By**: None

  **References**:

  **Test References**:
  - `app/lib/game-engine/__tests__/game-loaded-event.integration.test.ts` — DELETE: tests pendingLifecycleEventsRef which will be removed
  - `app/lib/game-engine/__tests__/trigger-type-casing.test.ts` — READ to decide: keep if tests string matching, delete if tests removed refs

  **Acceptance Criteria**:
  - [ ] `app/lib/game-engine/__tests__/game-loaded-event.integration.test.ts` deleted
  - [ ] `trigger-type-casing.test.ts` either deleted (with reason noted) or confirmed still valid
  - [ ] `pnpm test` passes with 0 failures
  - [ ] Test count recorded (for comparison after Task 8)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Test suite passes after cleanup
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: pnpm test 2>&1
      2. Assert: Exit code 0
      3. Assert: Output contains "Tests:" line with 0 failures
    Expected Result: Clean green baseline
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `chore(tests): remove stale event system tests before refactor`
  - Files: deleted test files
  - Pre-commit: `pnpm test`

---

- [x] 3. Create GameEventQueue and migrate lifecycle events

  **What to do**:
  - Create `app/lib/game-engine/GameEventQueue.ts` with:
    - `GameEvent` union type (lifecycle: `game_loaded`, `game_started`; input: `tap`, `drag_start`, `drag_end`, `mouse_move`, `mouse_leave`, `button_pressed`, `button_released`; physics: `collision`, `sensor_begin`, `sensor_end`)
    - `GameEventQueue` class with: `push(event)`, `drain(): GameEvent[]`, `peek()`, `length`, `setOnEventQueued(callback)`
    - Drain uses array swap (no copy): `const events = this.queue; this.queue = []; return events;`
  - Create `eventQueueRef = useRef(new GameEventQueue())` in `GameRuntime.godot.tsx`
  - **First migration: lifecycle events only**
    - Replace `pendingLifecycleEventsRef.current.push('game_loaded')` → `eventQueueRef.current.push({ type: 'game_loaded' })`
    - Replace `pendingLifecycleEventsRef.current.push('game_started')` → `eventQueueRef.current.push({ type: 'game_started' })`
    - In `stepGame()`: replace lifecycle event reading from ref with `eventQueueRef.current.drain().filter(...)` for lifecycle events only (keep collisionsRef and inputRef untouched for now)
  - Remove `pendingLifecycleEventsRef` after migration
  - Use `logger.debug('lifecycle', ...)` for new event queue logging

  **Must NOT do**:
  - Do NOT migrate collisions or input events yet (Task 4)
  - Do NOT remove `collisionsRef` or `inputRef` yet
  - Do NOT change how `RulesSystem.convertFrameInputEvents()` works — feed it the same shaped data
  - Do NOT change event timing — events still process on next stepGame() call

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core architectural change in the main orchestrator file, requires careful surgery on ~2000-line file
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential)
  - **Blocks**: Tasks 4, 5, 6, 7
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `app/lib/game-engine/GameRuntime.godot.tsx:345` — `pendingLifecycleEventsRef` definition
  - `app/lib/game-engine/GameRuntime.godot.tsx:843,1444,1513` — where lifecycle events are pushed
  - `app/lib/game-engine/GameRuntime.godot.tsx:951-955` — where lifecycle events are consumed in stepGame()

  **API/Type References**:
  - `app/lib/game-engine/systems/runner/types.ts:89-97` — existing `InputEvent` union type (GameEvent should align)
  - `app/lib/game-engine/BehaviorContext.ts:54-63` — `InputEvents` interface consumed by rules

  **Documentation References**:
  - `.claude/memory/research/02-event-unification-inspector-logging.md` § 3 — full GameEventQueue proposal with code, migration table, and consumer changes

  **Acceptance Criteria**:
  - [ ] `app/lib/game-engine/GameEventQueue.ts` exists with GameEvent type and GameEventQueue class
  - [ ] `pendingLifecycleEventsRef` removed from `GameRuntime.godot.tsx`
  - [ ] `game_loaded` and `game_started` events flow through `eventQueueRef`
  - [ ] `stepGame()` drains from event queue for lifecycle events
  - [ ] `pnpm tsc --noEmit` passes
  - [ ] `pnpm test` passes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: game_loaded fires through event queue
    Tool: Game Inspector MCP
    Preconditions: Dev server running on localhost:8085
    Steps:
      1. Open ballSort game via game inspector
      2. Wait for game ready
      3. Step 1 frame
      4. Get game state
      5. Assert: Entities exist (game_loaded rules fired, entities spawned)
    Expected Result: game_loaded processed correctly through new queue
    Evidence: Game state snapshot showing entities

  Scenario: game_started fires through event queue
    Tool: Game Inspector MCP
    Preconditions: Game loaded, paused at ready state
    Steps:
      1. Resume game
      2. Pause immediately after 1 frame
      3. Get game state
      4. Assert: Game state is "playing"
    Expected Result: game_started processed correctly
    Evidence: Game state snapshot
  ```

  **Commit**: YES
  - Message: `refactor(game-engine): create GameEventQueue and migrate lifecycle events`
  - Files: `app/lib/game-engine/GameEventQueue.ts`, `app/lib/game-engine/GameRuntime.godot.tsx`
  - Pre-commit: `pnpm tsc --noEmit && pnpm test`

---

- [x] 4. Migrate collisions and input events to GameEventQueue

  **What to do**:
  - **Migrate collisions**: In bridge collision callback (`GameRuntime.godot.tsx:238`), push to `eventQueueRef.current.push({ type: 'collision', entityA, entityB, normal, impulse })` instead of `collisionsRef.current.push(...)`
  - **Migrate tap**: In `useGameInput` or wherever `inputRef.current.tap` is set, push `{ type: 'tap', ... }` to event queue instead. Keep `inputRef.current.tap` for backward compat during transition, but mark for removal.
  - **Migrate drag_end**: Same pattern — discrete event goes to queue
  - **Update stepGame()**: Replace the 3-source gathering with single `eventQueueRef.current.drain()`, then split into inputEvents vs collisions for `UpdateContext.frame`
  - Remove `collisionsRef` once collisions flow through queue
  - Remove tap/dragEnd from `inputRef` once they flow through queue
  - **Keep in `inputRef`**: `buttons` (held state), `drag` (continuous position), `mouse` (continuous position), `tilt` — these are polled, not events

  **Must NOT do**:
  - Do NOT remove `inputRef` entirely — it still holds continuous state
  - Do NOT change `InputRuntimeSystem` unless needed for compatibility
  - Do NOT change how `RulesSystem.convertFrameInputEvents()` receives data — keep same interface

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Touches multiple files across the input pipeline, requires understanding of event flow
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5)
  - **Parallel Group**: Wave 3 (with Task 5)
  - **Blocks**: Task 6 (auto-step needs all events in queue)
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `app/lib/game-engine/GameRuntime.godot.tsx:948-949` — current collision ref consumption
  - `app/lib/game-engine/GameRuntime.godot.tsx:957-967` — UpdateContext building with 3 sources
  - `app/lib/game-engine/GameRuntime.godot.tsx:969-971` — tap clearing after consumption
  - `app/lib/game-engine/hooks/useGameInput.ts` — where inputRef.current.tap is set
  - `app/lib/game-engine/systems/runner/wrappers/InputRuntimeSystem.ts` — converts input state → frame events

  **API/Type References**:
  - `app/lib/game-engine/GameEventQueue.ts` — (created in Task 3) GameEvent type union
  - `app/lib/game-engine/systems/runner/types.ts` — UpdateContext.frame.inputEvents and UpdateContext.frame.collisions

  **Documentation References**:
  - `.claude/memory/research/02-event-unification-inspector-logging.md` § 3.3 — migration table: what moves to queue vs stays in inputRef
  - `.claude/memory/research/02-event-unification-inspector-logging.md` § 3.4 — updated stepGame() consumer code

  **Acceptance Criteria**:
  - [ ] `collisionsRef` removed from `GameRuntime.godot.tsx`
  - [ ] Tap events flow through `GameEventQueue`
  - [ ] Drag end events flow through `GameEventQueue`
  - [ ] `inputRef` retains only continuous state (buttons, drag position, mouse, tilt)
  - [ ] `stepGame()` builds UpdateContext from single `eventQueueRef.current.drain()`
  - [ ] `pnpm tsc --noEmit` passes
  - [ ] `pnpm test` passes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Tap input flows through event queue
    Tool: Game Inspector MCP
    Preconditions: ballSort game loaded in inspector mode, paused
    Steps:
      1. simulate_input(tap, worldX=0, worldY=5)
      2. step(1)
      3. Get game state
      4. Assert: Tap was processed (check entity state changed or score changed depending on game rules)
    Expected Result: Tap works through new event queue
    Evidence: Game state snapshot before/after

  Scenario: Collision events flow through event queue
    Tool: Game Inspector MCP
    Preconditions: Game with physics entities loaded
    Steps:
      1. step(60) — advance enough frames for collisions to occur
      2. Get console logs filtered by "collision"
      3. Assert: Collision events were processed (entities may have been destroyed/moved)
    Expected Result: Collisions work through new queue
    Evidence: Game state showing physics interactions occurred
  ```

  **Commit**: YES
  - Message: `refactor(game-engine): migrate collisions and input events to unified GameEventQueue`
  - Files: `app/lib/game-engine/GameRuntime.godot.tsx`, `app/lib/game-engine/hooks/useGameInput.ts`, `app/lib/game-engine/systems/runner/wrappers/InputRuntimeSystem.ts`
  - Pre-commit: `pnpm tsc --noEmit && pnpm test`

---

- [x] 5. Fix entity destroy path for all entity types

  **What to do**:
  - In `EntityManager.destroyEntityInternal()` (`EntityManager.ts:391`), add `bridge.destroyEntity(id)` call that is NOT gated by `if (entity.physics)`. The bridge call must happen for ALL entities.
  - Current code calls `this.physics.destroyBody()` only for physics entities, which routes through `GodotPhysicsAdapter.destroyBody()` → `bridge.destroyEntity()`. Non-physics entities skip this entirely.
  - **Fix**: Call `bridge.destroyEntity(id)` directly in `destroyEntityInternal()`, THEN call `physics.destroyBody()` only for physics entities (for physics cleanup).
  - Need to pass bridge reference to EntityManager — either via constructor injection or via the SystemContext
  - Also verify that `handleEntityDestroyed` (Godot→TS callback, line 232) still works correctly after the change (it should — it's a separate path for Godot-initiated destroys)

  **Must NOT do**:
  - Do NOT change the Godot-side destroy handling
  - Do NOT add error handling/retry for bridge.destroyEntity — fire-and-forget is acceptable here
  - Do NOT change DestroyActionExecutor — it correctly delegates to EntityManager

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Touches EntityManager (core class) and requires understanding the bridge/physics adapter relationship
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4)
  - **Parallel Group**: Wave 3 (with Task 4)
  - **Blocks**: Task 8
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `app/lib/game-engine/EntityManager.ts:391-406` — `destroyEntityInternal` — the method to fix
  - `app/lib/game-engine/EntityManager.ts:364-389` — `destroyEntity` public method (handles recursion, parent detach)
  - `app/lib/godot/GodotPhysicsAdapter.ts:169-176` — current destroy path through physics adapter

  **API/Type References**:
  - `app/lib/godot/types.ts:222` — `destroyEntity(entityId: string): void` — the bridge method to call
  - `app/lib/game-engine/EntityManager.ts:128-175` — `handleEntitySpawned` — shows how bridge reference could be injected (snapshot pattern)

  **Documentation References**:
  - `.claude/memory/research/03-js-godot-communication-patterns.md` § 8.2 — "Destroy Only Works Through Physics Adapter" problem analysis
  - `.claude/memory/research/03-js-godot-communication-patterns.md` § 9.3 — ideal destroy flow proposal

  **Acceptance Criteria**:
  - [ ] `EntityManager.destroyEntityInternal()` calls `bridge.destroyEntity(id)` for ALL entities
  - [ ] Physics-only cleanup (`physics.destroyBody`) still gated by `if (entity.physics)`
  - [ ] EntityManager has access to bridge (via constructor injection or system context)
  - [ ] `pnpm tsc --noEmit` passes
  - [ ] `pnpm test` passes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Visual-only entity is destroyed in Godot
    Tool: Game Inspector MCP
    Preconditions: Game loaded in inspector
    Steps:
      1. Get entity count
      2. Spawn a visual-only entity (template without physics)
      3. Step 1 frame
      4. Get entity count — should be +1
      5. Destroy the entity via game logic or direct API
      6. Step 1 frame
      7. Get entity count — should be back to original
      8. Query Godot for the entity ID — should return null
    Expected Result: Visual-only entity removed from both TS and Godot
    Evidence: Entity counts before/after
  ```

  **Commit**: YES
  - Message: `fix(game-engine): destroy all entity types in Godot, not just physics entities`
  - Files: `app/lib/game-engine/EntityManager.ts`, possibly `app/lib/game-engine/GameRuntime.godot.tsx` (bridge injection)
  - Pre-commit: `pnpm tsc --noEmit && pnpm test`

---

- [x] 6. Add auto-step in inspector mode

  **What to do**:
  - Wire `eventQueueRef.current.setOnEventQueued()` callback in `GameRuntime.godot.tsx`
  - When callback fires AND `timeControl.mode === 'inspect'` AND `timeControl.paused === true` AND `isSteppingRef.current === false`:
    - Schedule `manualStep(1)` via `setTimeout(0)` (batches rapid events into single auto-step)
    - Track with `autoStepTimerRef` to prevent duplicate scheduling
  - Add rate limit: max 60 auto-steps per second (track with counter + timestamp)
  - Update `simulate_input` MCP tool in `packages/game-inspector-mcp/src/tools/interaction.ts`:
    - After setting input, wait for auto-step to complete (small delay + verify frame advanced)
    - Remove or reduce the `waitMs` hack (currently 100ms)
  - During `manualStep(N)` execution: set `isSteppingRef.current = true` to prevent auto-step interference, reset to false when done

  **Must NOT do**:
  - Do NOT auto-step in non-inspect mode
  - Do NOT auto-step when `isSteppingRef.current === true`
  - Do NOT remove `manualStep()` — explicit `step(N)` still works
  - Do NOT auto-step for continuous state changes (mouse move, drag position) — only for discrete events in queue

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Involves timing-sensitive code in the game loop, interaction with MCP tools
  - **Skills**: [`playwright`]
    - `playwright`: needed to verify MCP tool behavior in browser context

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 7)
  - **Parallel Group**: Wave 4 (with Task 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 4 (needs all events in queue for auto-step to be meaningful)

  **References**:

  **Pattern References**:
  - `app/lib/game-engine/GameRuntime.godot.tsx:994-1030` — `manualStep()` implementation
  - `app/lib/game-engine/GameRuntime.godot.tsx:1032-1075` — game loop effect, inspect mode handling
  - `app/lib/game-engine/GameRuntime.godot.tsx:1082-1090` — `runtimeAPI` for debug bridge

  **API/Type References**:
  - `app/lib/game-engine/debug/SlopcadeDebugBridge.ts` — debug bridge that exposes step/pause/resume
  - `app/lib/game-engine/debug/types.ts` — `TimeControl`, `TimeMode`
  - `packages/game-inspector-mcp/src/tools/interaction.ts` — `simulate_input` tool implementation

  **Documentation References**:
  - `.claude/memory/research/02-event-unification-inspector-logging.md` § 4 — auto-step proposal with debounce, rate limiting, edge cases

  **Acceptance Criteria**:
  - [ ] `onEventQueued` callback wired in GameRuntime.godot.tsx
  - [ ] Auto-step only fires when `mode === 'inspect'` AND `paused === true`
  - [ ] Auto-step does NOT fire when `isSteppingRef.current === true`
  - [ ] Rate limit: max 60 auto-steps per second
  - [ ] `simulate_input` MCP tool no longer requires separate `step(1)` call
  - [ ] `pnpm tsc --noEmit` passes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: simulate_input auto-advances frame
    Tool: Game Inspector MCP
    Preconditions: ballSort game loaded in inspector, paused
    Steps:
      1. Get current frame number via game_state
      2. simulate_input(tap, worldX=0, worldY=5)
      3. Wait 200ms
      4. Get frame number again
      5. Assert: Frame number increased by exactly 1
      6. Take screenshot
      7. Assert: Screenshot shows tap was processed (visual change)
    Expected Result: Auto-step fires after simulate_input, no manual step needed
    Evidence: .sisyphus/evidence/task-6-auto-step.png

  Scenario: Auto-step does not fire in normal play mode
    Tool: Game Inspector MCP
    Preconditions: Game loaded in normal (non-inspect) mode
    Steps:
      1. Verify timeControl.mode !== 'inspect'
      2. Push event to queue via evaluate
      3. Assert: No extra frame advance beyond normal game loop
    Expected Result: Auto-step only active in inspector mode
    Evidence: Frame count verification

  Scenario: Rate limiting prevents runaway auto-stepping
    Tool: Game Inspector MCP
    Preconditions: Game in inspector mode, paused
    Steps:
      1. Rapidly push 100 events via evaluate loop
      2. Wait 500ms
      3. Get frame number
      4. Assert: Frame number increased by <= 30 (60/sec cap, 500ms = max 30)
    Expected Result: Rate limiter prevents >60 auto-steps/sec
    Evidence: Frame count captured
  ```

  **Commit**: YES
  - Message: `feat(game-engine): auto-step frame on event in inspector mode`
  - Files: `app/lib/game-engine/GameRuntime.godot.tsx`, `packages/game-inspector-mcp/src/tools/interaction.ts`
  - Pre-commit: `pnpm tsc --noEmit`

---

- [x] 7. Fix script setEntityPosition and unify spawn pattern

  **What to do**:
  - **Fix setEntityPosition**: In `RunScriptActionExecutor.createRuntimeContext()` (line 111-116), after setting `entity.transform.{x,y}`, also call `context.bridge.setPosition(entityId, position.x, position.y)` so position change reaches Godot
  - **Unify spawn pattern**: The ideal is Godot-authoritative for all spawns. However, scripts need immediate entityId access. Solution: keep TS-optimistic for scripts (create in EntityManager first, then bridge), but ensure `handleEntitySpawned` callback is a no-op when entity already exists (it already is — line 129-131). This is the pragmatic choice — two patterns are OK as long as the end state is consistent.
  - **Verify SpawnActionExecutor**: Confirm it relies on `onEntitySpawned` callback to register entity in TS — this is the Godot-authoritative path and should remain unchanged
  - **Also fix**: ScriptSandboxRuntimeSystem's `setEntityPosition` if it has the same issue (check and fix if needed)

  **Must NOT do**:
  - Do NOT force all spawns to be Godot-authoritative — scripts legitimately need immediate entityId
  - Do NOT add `bridge.setPosition` for EVERY `entity.transform` change — only for the explicit `setEntityPosition` API
  - Do NOT change SpawnActionExecutor's Godot-authoritative pattern

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires understanding of both spawn patterns and their trade-offs
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 6)
  - **Parallel Group**: Wave 4 (with Task 6)
  - **Blocks**: Task 8
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts:111-116` — setEntityPosition (TS-only, the bug)
  - `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts:84-105` — spawnEntity (TS-optimistic pattern)
  - `app/lib/game-engine/rules/actions/SpawnActionExecutor.ts:58-69` — spawnEntity (Godot-authoritative pattern)

  **API/Type References**:
  - `app/lib/game-engine/EntityManager.ts:128-131` — `handleEntitySpawned` no-op check for existing entities
  - `app/lib/godot/types.ts` — `setPosition(entityId, x, y)` bridge method

  **Documentation References**:
  - `.claude/memory/research/03-js-godot-communication-patterns.md` § 8.1 — two spawn patterns analysis
  - `.claude/memory/research/03-js-godot-communication-patterns.md` § 8.3 — setEntityPosition doesn't reach Godot
  - `.claude/memory/research/03-js-godot-communication-patterns.md` § 6 — script→entity interaction table

  **Acceptance Criteria**:
  - [ ] `RunScriptActionExecutor.setEntityPosition()` calls `bridge.setPosition()` after setting TS transform
  - [ ] Script position changes persist after `syncTransformsFromPhysics` (Godot has the updated position)
  - [ ] SpawnActionExecutor unchanged (Godot-authoritative)
  - [ ] RunScriptActionExecutor spawn still works (TS-optimistic with deferred bridge call)
  - [ ] `pnpm tsc --noEmit` passes
  - [ ] `pnpm test` passes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Script setEntityPosition reaches Godot
    Tool: Game Inspector MCP
    Preconditions: Game with scripted entity movement loaded
    Steps:
      1. Get entity position via get_props
      2. Evaluate script that calls setEntityPosition to (5, 5)
      3. Step 1 frame
      4. Get entity position again
      5. Assert: Position is at or near (5, 5), not reset to original
      6. Step 5 more frames (physics runs)
      7. Get entity position
      8. Assert: Position reflects physics from (5, 5), not from original position
    Expected Result: Position change persists through physics sync
    Evidence: Entity positions captured before/after
  ```

  **Commit**: YES
  - Message: `fix(game-engine): script setEntityPosition now reaches Godot via bridge`
  - Files: `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts`
  - Pre-commit: `pnpm tsc --noEmit && pnpm test`

---

- [x] 8. Add post-implementation integration tests and smoke test

  **What to do**:
  - Create `app/lib/game-engine/__tests__/event-queue.test.ts`:
    - Test: GameEventQueue push/drain/peek
    - Test: onEventQueued callback fires on push
    - Test: drain returns all events and empties queue
    - Test: rapid pushes batch correctly (all captured)
  - Create `app/lib/game-engine/__tests__/logger.test.ts`:
    - Test: default level WARN suppresses INFO/DEBUG/TRACE
    - Test: per-category override works
    - Test: configure() merges correctly
  - Create `app/lib/game-engine/__tests__/entity-lifecycle.test.ts`:
    - Test: spawn via SpawnActionExecutor registers entity (mock bridge + callback)
    - Test: spawn via RunScriptActionExecutor registers entity immediately
    - Test: destroy calls bridge.destroyEntity for physics entity
    - Test: destroy calls bridge.destroyEntity for non-physics entity
  - Run full smoke test via game inspector MCP:
    - Open ballSort game
    - Verify game loads (entities exist)
    - Simulate tap input
    - Verify frame advances (auto-step)
    - Verify entities can be spawned and destroyed
  - Run `pnpm test` — all tests pass
  - Run `pnpm tsc --noEmit` — no type errors

  **Must NOT do**:
  - Do NOT write more than 5-7 test files
  - Do NOT aim for line coverage — aim for behavior coverage of the new systems
  - Do NOT test internal implementation details — test public interfaces

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Needs to write tests that exercise the full integrated system
  - **Skills**: [`playwright`]
    - `playwright`: for the game inspector smoke test

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (final, sequential)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 4, 5, 6, 7

  **References**:

  **Test References**:
  - `app/lib/game-engine/__tests__/` — test directory location
  - `packages/game-bundler/src/__tests__/virtual-bundle-integration.test.ts` — example of integration test structure in this project

  **Pattern References**:
  - `app/lib/game-engine/GameEventQueue.ts` — (created in Task 3) class to unit test
  - `app/lib/game-engine/debug/Logger.ts` — (created in Task 1) class to unit test
  - `app/lib/game-engine/EntityManager.ts` — destroy path to integration test

  **Acceptance Criteria**:
  - [ ] `app/lib/game-engine/__tests__/event-queue.test.ts` exists and passes
  - [ ] `app/lib/game-engine/__tests__/logger.test.ts` exists and passes
  - [ ] `app/lib/game-engine/__tests__/entity-lifecycle.test.ts` exists and passes
  - [ ] `pnpm test` passes with all new tests
  - [ ] `pnpm tsc --noEmit` passes
  - [ ] Smoke test: ballSort loads, tap works, entities spawn/despawn correctly

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Full test suite passes
    Tool: Bash
    Preconditions: All previous tasks complete
    Steps:
      1. Run: pnpm test 2>&1
      2. Assert: Exit code 0
      3. Assert: New test files present in output (event-queue, logger, entity-lifecycle)
      4. Assert: 0 failures
    Expected Result: All tests green
    Evidence: Test output captured

  Scenario: ballSort smoke test via game inspector
    Tool: Game Inspector MCP (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Open ballSort game
      2. Wait for game ready
      3. Get game state — assert entities exist (game_loaded rules fired)
      4. simulate_input(tap, worldX=0, worldY=5)
      5. Wait 200ms (auto-step should fire)
      6. Get game state — assert frame advanced
      7. Take screenshot
      8. Assert: Game visually responded to tap
    Expected Result: Full game lifecycle works with unified event system
    Evidence: .sisyphus/evidence/task-8-smoke-test.png

  Scenario: Type check passes
    Tool: Bash
    Preconditions: All files written
    Steps:
      1. Run: pnpm tsc --noEmit 2>&1
      2. Assert: Exit code 0
      3. Assert: No errors in output
    Expected Result: No type errors
    Evidence: tsc output captured
  ```

  **Commit**: YES
  - Message: `test(game-engine): add integration tests for unified event queue, logger, and entity lifecycle`
  - Files: `app/lib/game-engine/__tests__/event-queue.test.ts`, `app/lib/game-engine/__tests__/logger.test.ts`, `app/lib/game-engine/__tests__/entity-lifecycle.test.ts`
  - Pre-commit: `pnpm test && pnpm tsc --noEmit`

---

## Commit Strategy

| After Task | Message | Key Files | Verification |
|------------|---------|-----------|--------------|
| 1 | `feat(game-engine): add structured logging with levels and categories` | Logger.ts, Logger.gd, logging.ts, GameRuntime.godot.tsx, RulesSystem.ts | `pnpm tsc --noEmit` |
| 2 | `chore(tests): remove stale event system tests before refactor` | deleted test files | `pnpm test` |
| 3 | `refactor(game-engine): create GameEventQueue and migrate lifecycle events` | GameEventQueue.ts, GameRuntime.godot.tsx | `pnpm tsc --noEmit && pnpm test` |
| 4 | `refactor(game-engine): migrate collisions and input events to unified GameEventQueue` | GameRuntime.godot.tsx, useGameInput.ts, InputRuntimeSystem.ts | `pnpm tsc --noEmit && pnpm test` |
| 5 | `fix(game-engine): destroy all entity types in Godot, not just physics entities` | EntityManager.ts | `pnpm tsc --noEmit && pnpm test` |
| 6 | `feat(game-engine): auto-step frame on event in inspector mode` | GameRuntime.godot.tsx, interaction.ts | `pnpm tsc --noEmit` |
| 7 | `fix(game-engine): script setEntityPosition now reaches Godot via bridge` | RunScriptActionExecutor.ts | `pnpm tsc --noEmit && pnpm test` |
| 8 | `test(game-engine): add integration tests for unified event queue, logger, and entity lifecycle` | test files | `pnpm test && pnpm tsc --noEmit` |

---

## Success Criteria

### Verification Commands
```bash
pnpm tsc --noEmit        # Expected: exit 0, no errors
pnpm test                # Expected: exit 0, all tests pass, includes new test files
```

### Final Checklist
- [ ] Single `GameEventQueue` handles all discrete events (lifecycle, collision, tap, drag_end)
- [ ] `inputRef` retains only continuous state (buttons, drag, mouse, tilt)
- [ ] `pendingLifecycleEventsRef` removed
- [ ] `collisionsRef` removed
- [ ] Logger with levels and categories replaces raw console.log in GameRuntime + RulesSystem
- [ ] MCP `set_log_level` tool works
- [ ] Auto-step fires in inspector mode on event, rate-limited to 60/sec
- [ ] `simulate_input` works without manual `step(1)` in inspector mode
- [ ] All entities (physics AND visual-only) destroyed correctly in Godot
- [ ] Script `setEntityPosition` reaches Godot via bridge
- [ ] ballSort game loads and plays correctly (smoke test)
- [ ] 3 new test files: event-queue, logger, entity-lifecycle
- [ ] All "Must NOT Have" guardrails respected
