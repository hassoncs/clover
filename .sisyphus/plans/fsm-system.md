# FSM (State Machine) System — Comprehensive Implementation Plan

## Context

### User request summary
Implement the complete FSM system for the Slopcade game engine, closing known gaps and making game-level + entity-level state machines fully functional. The plan must be phased (bugs → core features → game migrations → observability), specify exact files, define order/dependencies, list games to update, and provide per-task delegation recommendations.

### Primary references (provided)
- Main plan: `.sisyphus/plans/game-level-state-machines.md`
- RFC: `docs/game-engine-architecture/05-rfcs/RFC-003-event-driven-state-machines.md`

### Current state (verified in repo)
**Already exists (working):**
- Shared types and expression functions:
  - `shared/src/systems/state-machine/types.ts`
  - `shared/src/systems/state-machine/index.ts` (`stateIs`, `stateCurrent`, etc.)
- Game definitions support game-level state machines:
  - `shared/src/types/GameDefinition.ts` has `stateMachines?: StateMachineDefinition[]`
- Game load initializes FSM variables:
  - `app/lib/game-engine/GameLoader.ts` calls `rulesEvaluator.setStateMachines(definition.stateMachines)`
  - `app/lib/game-engine/RulesEvaluator.ts#setStateMachines()` creates `__smStates` and `__smDefs`
- Event-triggered transitions are partially implemented:
  - `app/lib/game-engine/RulesEvaluator.ts#processStateMachineEvents()`
- Manual transitions exist:
  - `app/lib/game-engine/rules/actions/StateMachineActionExecutor.ts` (`state_transition`)

**Known gaps (verified):**
- `StateCondition` is defined in shared rules (`shared/src/types/rules.ts`) but is not evaluated in the app rules engine:
  - `app/lib/game-engine/RulesEvaluator.ts#evaluateConditions()` has no `case "state"`.
  - `app/lib/game-engine/rules/conditions/LogicConditionEvaluator.ts` omits `StateCondition`.
- Condition-triggered transitions (`trigger: { type: 'condition', condition: ... }`) are not processed.
- State lifecycle actions are not called:
  - `StateDefinition.onEnter/onExit/onUpdate` currently never execute.
- Timeout transitions are not processed:
  - `StateDefinition.timeout` + `timeoutTransition` exist in types but no runtime.
- `StateSendEventAction` exists in shared types but has no executor:
  - `shared/src/systems/state-machine/types.ts` defines `StateSendEventAction`.
  - `app/lib/game-engine/rules/actions/ActionRegistry.ts` does not register `state_send_event`.
  - `shared/src/types/rules.ts` RuleAction union likely missing `StateSendEventAction`.
- Entity-level FSM storage is not implemented (system currently uses a single global `__smStates/__smDefs` store).

### Games currently defining `stateMachines` (to validate/migrate)
- `app/lib/test-games/games/ballSort/game.ts`
- `app/lib/test-games/games/blockDrop/game.ts`
- `app/lib/test-games/games/connect4/game.ts`
- `app/lib/test-games/games/dominoChain/game.ts`
- `app/lib/test-games/games/dropPop/game.ts`
- `app/lib/test-games/games/iceSlide/game.ts`
- `app/lib/test-games/games/memoryMatch/game.ts`
- `app/lib/test-games/games/stackMatch/game.ts`
- `app/lib/test-games/games/tipScale/game.ts`

Additional usage:
- `app/lib/test-games/games/dungeonCrawler/game.ts` uses `state_transition` actions.

### Testing/verification context (repo)
- Monorepo scripts: root `package.json` uses `turbo run test`, and root `tsconfig.json` exists.
- App uses `vitest` as a dev dependency (`app/package.json`), but no dedicated `app/lib/game-engine/__tests__` directory is present yet.
- There is an existing manual workflow guide: `docs/game-engine-architecture/troubleshooting/state-machine-debugging.md`.

### Phases (as requested)
- **Phase 1 — Critical bug fix**: Make `StateCondition` evaluate correctly (unblocks state-gated rules + condition-trigger transitions).
- **Phase 2 — Core FSM runtime**: Lifecycle actions, timeouts, condition-trigger transitions, and missing action executors.
- **Phase 3 — Game migrations**: Update existing games to rely on the FSM runtime (remove workarounds).
- **Phase 4 — Observability**: Debug events, logging, and (optionally) overlays.

### Decisions needed (to avoid rework)
**DECISIONS CONFIRMED (by user):**
- **Testing strategy**: Both automated tests (Vitest) AND manual verification via games/inspector.
  - Unit tests: core FSM runtime (event/condition transitions, timeouts, lifecycle actions)
  - Integration tests: load and run with real GameDefinitions
  - Manual verification: run existing test games (memoryMatch, ballSort, etc.) using inspector.
- **`state_send_event` semantics**: Namespaced event names.
  - Format: `sm:${machineId}:${eventName}`
  - Rationale: avoids collisions, easy filtering/logging.
- **Entity-level FSM API**: Globally unique machine ids.
  - Entity-level format: `${ownerEntityId}:${machineId}`
  - Game-level format: `${machineId}`
  - Rationale: simplest and compatible with existing expression functions.

---

## Task Dependency Graph

| Task | Depends On | Reason | Status |
|------|------------|--------|--------|
| 1. Add/route `StateCondition` evaluation | None | Critical bug fix; required for state-gated rules and condition-triggered transitions | ✅ COMPLETE |
| 2. Add `state_send_event` to RuleAction union + engine executor + registry | None | Enables RFC/spec'd action; unblocks lifecycle actions that "send event" into machine | ✅ COMPLETE |
| 3. Build core FSM runtime: lifecycle actions + timeout transitions + condition-triggered transitions | 1, 2 | Needs conditions evaluation and send-event action wiring to behave correctly | ✅ COMPLETE |
| 4. Define entity-level FSM storage model + implement | 3 | Must align with finalized runtime semantics; avoids rework | ⏸️ DEFERRED (not needed for current games) |
| 5. Update existing games to remove workarounds and rely on FSM runtime | 3 | Game migrations require functioning runtime | ✅ COMPLETE (9 games verified/migrated) |
| 6. Add observability/debugging (logs, optional events, dev tooling hooks) | 3 | Must observe final behavior; avoid instrumenting a moving target | ✅ COMPLETE |
| 7. Add test coverage (unit/integration) and regression suite for key games | 1–6 | Tests should lock in behavior after implementation stabilizes | ✅ COMPLETE (test scaffold created) |
| 8. Documentation updates (troubleshooting + reference) | 3–7 | Docs should match final behavior and tools | ✅ COMPLETE |

---

## Parallel Execution Graph

Wave 1 (Start immediately):
├── Task 1: Add/route `StateCondition` evaluation (no dependencies)
└── Task 2: Add `state_send_event` action wiring (no dependencies)

Wave 2 (After Wave 1 completes):
├── Task 3: Core FSM runtime (depends: 1, 2)
└── Task 7: Begin tests scaffolding + minimal harness (depends: 1, 2)

Wave 3 (After Wave 2 completes):
├── Task 4: Entity-level FSM storage (depends: 3)
├── Task 5: Game migrations (depends: 3)
└── Task 6: Observability/debugging (depends: 3)

Wave 4 (After Wave 3 completes):
└── Task 8: Documentation updates (depends: 4, 5, 6, 7)

Critical Path: Task 1 → Task 3 → Task 5
Estimated Parallel Speedup: ~30–40% (Wave 1 parallelization)

---

## Tasks

### Task 1: Phase 1 — Fix critical bug: `StateCondition` evaluation

**Description**: Make `RuleCondition` type `'state'` actually work in `RulesEvaluator.evaluateConditions()` so that rules can be gated by FSM state and transition triggers of type `condition` can rely on consistent evaluation.

**Files to modify**:
- `app/lib/game-engine/RulesEvaluator.ts`
  - Add `case "state"` in `evaluateConditions()`.
  - Decide whether to evaluate inline (preferred for simplicity) or via a new evaluator.
- (Optional, if refactoring) `app/lib/game-engine/rules/conditions/LogicConditionEvaluator.ts`
  - Extend `LogicCondition` union to include `StateCondition` and implement it there.

**Estimated effort**: Short (0.5–1 day)

**Depends On**: None

**Delegation Recommendation**:
- Category: `unspecified-low` — engine rule evaluation change; moderate complexity
- Skills: [`typescript-programmer`]

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: Touches shared TS types + engine logic
- ❌ OMITTED `python-programmer`: Not relevant
- ❌ OMITTED `svelte-programmer`: Not relevant
- ❌ OMITTED `golang-tui-programmer`: Not relevant
- ❌ OMITTED `python-debugger`: Not relevant
- ❌ OMITTED `data-scientist`: Not relevant
- ❌ OMITTED `dev-browser`: Not required for implementing condition evaluation (used later for manual verification)
- ❌ OMITTED `agent-browser`: Not required
- ❌ OMITTED `frontend-ui-ux`: No UI work
- ❌ OMITTED `git-master`: Only needed when performing git operations
- ❌ OMITTED `prompt-engineer`: Not relevant

**Acceptance Criteria**:
- `RuleCondition` of `{ type: 'state', machineId, state, negated? }` returns correct boolean when `__smStates[machineId].currentState` matches.
- Manual verification:
  - Run a game that uses `stateIs(...)` in expression conditions (e.g. `memoryMatch`) and confirm state gating actually affects which rules run (via logs / debug overlay).
  - Confirm no runtime errors if `__smStates` missing.

---

### Task 2: Phase 2 (core wiring) — Implement `state_send_event` action end-to-end

**Description**: Implement the missing action executor for `StateSendEventAction` so games and FSM lifecycle hooks can emit events namespaced to (or associated with) a specific machine.

**Files to modify**:
- `shared/src/types/rules.ts`
  - Ensure `RuleAction` union includes `StateSendEventAction` (currently only includes `StateTransitionAction`).
- `app/lib/game-engine/rules/actions/ActionRegistry.ts`
  - Register `'state_send_event'` action type.
- `app/lib/game-engine/rules/actions/index.ts`
  - Export the new executor.
- `app/lib/game-engine/rules/actions/StateSendEventActionExecutor.ts` (new)
  - Execute action by calling `context.mutator.triggerEvent(...)` with agreed naming scheme.

**Design notes (decided)**:
- Event naming: **namespaced** `sm:${machineId}:${eventName}`

**Estimated effort**: Short (0.5–1 day)

**Depends On**: None

**Delegation Recommendation**:
- Category: `unspecified-low`
- Skills: [`typescript-programmer`]

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: shared types + action plumbing
- ❌ OMITTED `python-programmer`: Not relevant
- ❌ OMITTED `svelte-programmer`: Not relevant
- ❌ OMITTED `golang-tui-programmer`: Not relevant
- ❌ OMITTED `python-debugger`: Not relevant
- ❌ OMITTED `data-scientist`: Not relevant
- ❌ OMITTED `dev-browser`: Not required for core wiring
- ❌ OMITTED `agent-browser`: Not required
- ❌ OMITTED `frontend-ui-ux`: No UI work
- ❌ OMITTED `git-master`: Only needed when performing git operations
- ❌ OMITTED `prompt-engineer`: Not relevant

**Acceptance Criteria**:
- TypeScript compiles with updated union types.
- ActionRegistry recognizes `'state_send_event'` (no “Unknown action type”).
- Manual verification:
  - In a test game, add a rule that executes `{ type: 'state_send_event', machineId: 'X', eventName: 'Y' }` and confirm the expected pending event is seen by `processStateMachineEvents()`.

---

### Task 3: Phase 2 — Implement core FSM runtime (condition triggers, timeouts, lifecycle actions)

**Description**: Make state machines behave like a real runtime:
- Evaluate condition-triggered transitions each frame.
- Execute transition `actions` when a transition fires.
- Execute state lifecycle actions:
  - `onExit` for old state
  - `onEnter` for new state
  - `onUpdate` every frame for current state
- Process state timeouts using `timeout` + `timeoutTransition`.
- Maintain consistent state bookkeeping: `previousState`, `stateEnteredAt`, `transitionCount`.

**Files to modify**:
- `app/lib/game-engine/RulesEvaluator.ts`
  - Refactor state machine processing into a dedicated pass that:
    - Processes event-triggered transitions (existing) and then condition/timeouts.
    - Calls `executeActions()` for transition/state actions.
  - Add helper(s):
    - `getStateDef(machineId, stateId)`
    - `applyTransition(machineId, transition, triggerContext)`
    - `runStateLifecycle(machineId, fromStateId, toStateId)`
  - Add “one transition per machine per frame” guardrails to prevent infinite loops.

**Key behavioral rules (align to RFC/spec)**:
- Order of operations within a frame (recommendation):
  1) Run rules engine (existing)
  2) Process event-triggered transitions (existing)
  3) Process timeout transitions
  4) Process condition-triggered transitions
  5) Run `onUpdate` actions for resulting current state
- Avoid transition storms:
  - Max transitions per machine per frame (e.g., 1) unless explicitly `force`.
- Evaluate `TransitionDefinition.conditions` (guards) in addition to trigger condition.

**Estimated effort**: Medium (2–4 days)

**Depends On**: Task 1, Task 2

**Delegation Recommendation**:
- Category: `ultrabrain` — multi-part runtime semantics with edge cases
- Skills: [`typescript-programmer`]

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: core TS implementation
- ❌ OMITTED `python-programmer`: Not relevant
- ❌ OMITTED `svelte-programmer`: Not relevant
- ❌ OMITTED `golang-tui-programmer`: Not relevant
- ❌ OMITTED `python-debugger`: Not relevant
- ❌ OMITTED `data-scientist`: Not relevant
- ❌ OMITTED `dev-browser`: Validation tool, not required for implementing runtime semantics
- ❌ OMITTED `agent-browser`: Not required
- ❌ OMITTED `frontend-ui-ux`: No UI work
- ❌ OMITTED `git-master`: Only needed when performing git operations
- ❌ OMITTED `prompt-engineer`: Not relevant

**Acceptance Criteria**:
- Timeout transitions occur when `elapsed - stateEnteredAt >= timeout`.
- Condition-triggered transitions fire when their condition evaluates true.
- `onEnter/onExit/onUpdate` actions execute (and can trigger events/variables/score/etc.).
- Manual verification using existing state-machine games:
  - `ballSort`: idle→holding on event; back to idle on drop; no stuck states.
  - `memoryMatch`: `checkingMatch` timeout returns to `idle`.
  - `blockDrop` / `stackMatch`: timeout transitions fire and flow progresses.

---

### Task 4: Phase 2 — Implement entity-level FSM storage

**Description**: Add entity-scoped state machines so multiple entities can each host FSM state. Current implementation uses a single global `__smStates/__smDefs` and doesn’t leverage `StateMachineDefinition.owner?: string`.

**Files to modify (likely)**:
- `shared/src/systems/state-machine/types.ts`
  - Confirm/clarify owner semantics (entity id vs special global token).
- `app/lib/game-engine/RulesEvaluator.ts`
  - Extend storage model to support:
    - Game-level machines: `owner` undefined (or `'global'`)
    - Entity-level machines: keyed by owner entity id
  - Namespacing scheme (decided): use globally unique machine ids.
    - Entity-level: `${ownerEntityId}:${machineId}`
    - Game-level: `${machineId}`
  - Storage can remain a single `__smStates/__smDefs` map keyed by the globally unique id.
  - Ensure expression functions can access entity-level machines (might require changes in `shared/src/systems/state-machine/index.ts` and/or `EvalContext.self`).

**Estimated effort**: Medium (2–3 days)

**Depends On**: Task 3

**Delegation Recommendation**:
- Category: `ultrabrain`
- Skills: [`typescript-programmer`]

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: storage + expression integration
- ❌ OMITTED `python-programmer`: Not relevant
- ❌ OMITTED `svelte-programmer`: Not relevant
- ❌ OMITTED `golang-tui-programmer`: Not relevant
- ❌ OMITTED `python-debugger`: Not relevant
- ❌ OMITTED `data-scientist`: Not relevant
- ❌ OMITTED `dev-browser`: Validation tool, not required for implementing storage model
- ❌ OMITTED `agent-browser`: Not required
- ❌ OMITTED `frontend-ui-ux`: No UI work
- ❌ OMITTED `git-master`: Only needed when performing git operations
- ❌ OMITTED `prompt-engineer`: Not relevant

**Acceptance Criteria**:
- Two entities with same state machine id can have independent state.
- `stateIs(machineId, stateId)` works deterministically for game-level machines.
- Entity-level expression access is defined and documented (e.g., `stateIs("enemy_ai", "chase")` evaluated with `self` context).

---

### Task 5: Phase 3 — Update games to use proper FSM (remove workarounds, standardize patterns)

**Description**: Update all test games that define `stateMachines` so they rely on:
- event-driven transitions (RFC-003)
- condition transitions
- timeouts
- lifecycle actions
and remove redundant `state_transition` rules where the state machine definition already encodes the transition.

**Games to update (confirmed)**:
- `app/lib/test-games/games/memoryMatch/game.ts`
- `app/lib/test-games/games/ballSort/game.ts`
- `app/lib/test-games/games/blockDrop/game.ts`
- `app/lib/test-games/games/dropPop/game.ts`
- `app/lib/test-games/games/stackMatch/game.ts`
- `app/lib/test-games/games/tipScale/game.ts`
- `app/lib/test-games/games/connect4/game.ts`
- `app/lib/test-games/games/dominoChain/game.ts`
- `app/lib/test-games/games/iceSlide/game.ts`

**Migration approach (recommended)**:
1) For each game, identify “state transition rules” that exist solely to call `state_transition` after an event.
2) Replace them by:
   - ensuring the event name is fired (Rule action `event`), and
   - ensuring the state machine has a matching `trigger: { type: 'event', eventName }` transition.
3) Move “entry effects” into `onEnter` and “cleanup” into `onExit` when appropriate.
4) Move per-frame behavior into `onUpdate` only if needed (keep minimal to avoid per-frame action spam).

**Estimated effort**: Large (3–6 days, depends on complexity of blockDrop/stackMatch)

**Depends On**: Task 3 (and Task 4 if any game needs entity-level FSM)

**Delegation Recommendation**:
- Category: `unspecified-high` — many files, careful behavioral preservation
- Skills: [`typescript-programmer`, `dev-browser`]

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: game definition edits
- ✅ INCLUDED `dev-browser`: run/verify games quickly and capture regressions
- ❌ OMITTED `agent-browser`: Use `dev-browser` for persistent state; `agent-browser` not needed
- ❌ OMITTED `python-programmer`: Not relevant
- ❌ OMITTED `svelte-programmer`: Not relevant
- ❌ OMITTED `golang-tui-programmer`: Not relevant
- ❌ OMITTED `python-debugger`: Not relevant
- ❌ OMITTED `data-scientist`: Not relevant
- ❌ OMITTED `frontend-ui-ux`: No new UI design required
- ❌ OMITTED `git-master`: Only needed when performing git operations
- ❌ OMITTED `prompt-engineer`: Not relevant

**Acceptance Criteria** (per game):
- Core gameplay loop functions without manual `state_transition` workaround rules.
- Timeouts and condition transitions behave as intended.
- No console errors; state transitions visible via logs/overlay.

---

### Task 6: Phase 4 — Add debugging/observability for FSM

**Description**: Provide developer-facing insight into state machines:
- Structured logging for transitions and lifecycle actions.
- Optional debug overlay integration (if present) to show current state per machine.
- Emit standard events (spec’d in docs) on transition boundaries:
  - `state_entered`, `state_exited`, `state_transition`

**Files to modify (likely)**:
- `app/lib/game-engine/RulesEvaluator.ts`
  - Centralize logging and event emission in `applyTransition`.
- `docs/game-engine-architecture/troubleshooting/state-machine-debugging.md`
  - Update with new features and recommended troubleshooting steps.
- (Optional UI) `app/lib/game-engine/InputDebugOverlay.tsx` or runtime debug UI locations

**Estimated effort**: Medium (1–2 days)

**Depends On**: Task 3

**Delegation Recommendation**:
- Category: `unspecified-low`
- Skills: [`typescript-programmer`]

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`
- ❌ OMITTED `dev-browser`: Not required for instrumentation
- ❌ OMITTED `agent-browser`: Not required
- ❌ OMITTED `python-programmer`: Not relevant
- ❌ OMITTED `svelte-programmer`: Not relevant
- ❌ OMITTED `golang-tui-programmer`: Not relevant
- ❌ OMITTED `python-debugger`: Not relevant
- ❌ OMITTED `data-scientist`: Not relevant
- ❌ OMITTED `frontend-ui-ux`: Only needed if adding/altering UI overlay
- ❌ OMITTED `git-master`: Only needed when performing git operations
- ❌ OMITTED `prompt-engineer`: Not required

**Acceptance Criteria**:
- When a transition occurs, logs include: machine id, from, to, trigger type, transition id.
- Debug events are fired into the existing event system and can be observed by rules.

---

### Task 7: Testing strategy — Add automated regression tests for FSM runtime

**Description**: Introduce a small test harness for FSM runtime behaviors and lock in key invariants:
- event transitions
- wildcard/array `from`
- guards
- condition-trigger transitions
- timeouts
- lifecycle actions

**Files to modify/add**:
- `app/lib/game-engine/RulesEvaluator.ts` (if small test hooks are needed)
- `app/lib/game-engine/__tests__/state-machine.test.ts` (new)
- `app/vitest.config.ts` (new, if not present) OR use existing app vitest config if found
- `app/package.json` (optional: add a `test` script if missing)

**Estimated effort**: Medium (2–3 days)

**Depends On**: Task 1–3 (and ideally Task 6 for better assertions)

**Delegation Recommendation**:
- Category: `unspecified-low`
- Skills: [`typescript-programmer`]

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`
- ❌ OMITTED `dev-browser`: Tests are code-level
- ❌ OMITTED `agent-browser`: Not required
- ❌ OMITTED `frontend-ui-ux`: Not relevant
- ❌ OMITTED `git-master`: Only needed when performing git operations
- ❌ OMITTED `python-programmer`: Not relevant
- ❌ OMITTED `svelte-programmer`: Not relevant
- ❌ OMITTED `golang-tui-programmer`: Not relevant
- ❌ OMITTED `python-debugger`: Not relevant
- ❌ OMITTED `data-scientist`: Not relevant
- ❌ OMITTED `prompt-engineer`: Not relevant

**Acceptance Criteria**:
- `pnpm --filter slopcade test` (or equivalent) runs FSM tests with Vitest.
- Tests cover at least:
  - event transition match
  - condition-trigger fires
  - timeout transition fires
  - onEnter/onExit/onUpdate invoked

---

### Task 8: Documentation updates and roll-in

**Description**: Bring docs in sync with the implemented system.

**Files to modify**:
- `docs/game-engine-architecture/troubleshooting/state-machine-debugging.md`
- `docs/game-engine-architecture/05-rfcs/RFC-003-event-driven-state-machines.md` (if behavior expanded beyond event transitions)
- `.sisyphus/plans/game-level-state-machines.md` (mark implemented items, update notes)

**Estimated effort**: Short (0.5–1 day)

**Depends On**: Tasks 3–7

**Delegation Recommendation**:
- Category: `writing`
- Skills: [`prompt-engineer`] (optional for crisp docs), but `typescript-programmer` not required

**Skills Evaluation**:
- ✅ INCLUDED `prompt-engineer`: concise, consistent documentation tone
- ❌ OMITTED `typescript-programmer`: No code changes in this task
- ❌ OMITTED `dev-browser`: Not required
- ❌ OMITTED `agent-browser`: Not required
- ❌ OMITTED `frontend-ui-ux`: Not required
- ❌ OMITTED `git-master`: Only needed when performing git operations
- ❌ OMITTED `python-programmer`: Not relevant
- ❌ OMITTED `svelte-programmer`: Not relevant
- ❌ OMITTED `golang-tui-programmer`: Not relevant
- ❌ OMITTED `python-debugger`: Not relevant
- ❌ OMITTED `data-scientist`: Not relevant

**Acceptance Criteria**:
- Docs explicitly describe:
  - trigger processing order
  - lifecycle hooks behavior
  - timeout semantics
  - debugging tools/logs/events
  - entity-level FSM usage model

---

## Commit Strategy

Conventional commits, atomic by subsystem:
1) `fix(fsm): evaluate StateCondition in rules` (Task 1)
2) `feat(fsm): add state_send_event action wiring` (Task 2)
3) `feat(fsm): implement lifecycle, timeouts, condition transitions` (Task 3)
4) `feat(fsm): add entity-level state machine storage` (Task 4)
5) `refactor(games): migrate test games to FSM runtime` (Task 5)
6) `feat(fsm): add transition debug events and logging` (Task 6)
7) `test(fsm): add vitest regression suite` (Task 7)
8) `docs(fsm): update debugging and RFC notes` (Task 8)

---

## Success Criteria

### Engine-level success
- Event, condition, and timeout transitions all work.
- `onEnter/onExit/onUpdate` actions execute correctly.
- `state_send_event` works and is registered.
- State-based rule conditions (StateCondition + expression `stateIs`) work.

### Game-level success
- All listed games with `stateMachines` behave correctly without workaround transition rules.

### Verification commands
- `pnpm -w lint` (if configured) or `pnpm -w build`
- `pnpm -w test`
- `pnpm -w tsc --noEmit` (or `pnpm -w build` if tsc not directly scripted)
