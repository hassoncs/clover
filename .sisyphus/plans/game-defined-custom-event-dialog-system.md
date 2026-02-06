# Game-Defined Custom Event & Dialog System

## TL;DR

> **Quick Summary**: Move win/loss/phase dialogs from runtime hardcoding into declarative game definition config, and route all dialog button interactions back through existing logical events (`pendingEvents`) so rules/state machines remain the only flow controller.
>
> **Deliverables**:
> - Add dialog type definitions to `GameDefinition`
> - Add runtime dialog resolver/renderer adapter in `GameRuntime.godot.tsx`
> - Wire dialog button presses to existing `triggerEvent` -> `pendingEvents`
> - Rewrite Ball Sort flow to game-defined dialog pattern
> - Keep temporary legacy fallback, then remove hardcoded path
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 -> Task 2 -> Task 4 -> Task 6

---

## Context

### Original Request
Design a minimal-surface, game-defined custom event/dialog system that reuses existing event/state/variable mechanisms and makes runtime a dumb renderer.

### Interview Summary
**Key Discussions**:
- Reuse existing three-tier event model; do not add a new event bus.
- Dialog button clicks must emit logical events (`pendingEvents`) and be handled by rules/scripts/state machines.
- Win/loss and progression behavior must become game-defined patterns, not runtime hardcoded behavior.
- Test strategy selected: **Tests-after**.

**Research Findings**:
- Logical events already exist: `GameState.pendingEvents` (`app/lib/game-engine/runtime/types.ts:42`) and `triggerEvent` (`app/lib/game-engine/runtime/GameStateHelpers.ts:162`).
- Rules + state machines already consume logical events and clear each frame (`app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts:369`, `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts:507`).
- Runtime currently hardcodes overlays + win dialog (`app/lib/game-engine/GameRuntime.godot.tsx:2070`, `app/lib/game-engine/GameRuntime.godot.tsx:2141`, `app/lib/game-engine/GameRuntime.godot.tsx:2161`).
- Ball Sort already uses event-driven state machine flow (`r2/games/ballSort/src/game.ts:104`, `r2/games/ballSort/src/game.ts:223`).

### Metis Review Incorporated
**Gaps addressed in this plan**:
- Explicit single-source dialog visibility model (fixed variable convention).
- Explicit single-dialog-at-a-time rule.
- Explicit dismiss behavior and event semantics.
- Explicit migration fallback strategy and deprecation endpoint.
- Explicit anti-scope-creep guardrails.

---

## Work Objectives

### Core Objective
Introduce one canonical, declarative dialog pattern in `GameDefinition` where game logic controls dialog visibility and flow, while runtime only renders and emits logical intent events.

### Concrete Deliverables
- New dialog schema in `shared/src/types/GameDefinition.ts`.
- Runtime adapter in `app/lib/game-engine/GameRuntime.godot.tsx` that:
  - resolves active dialog from game state,
  - maps dialog schema to `GameDialog` props,
  - emits logical events via `StateHelpers.triggerEvent` on button/dismiss actions.
- Ball Sort migration in `r2/games/ballSort/src/game.ts` using dialog declarations + rules/state-machine events.
- Compatibility fallback path (temporary) for legacy hardcoded win dialog.

### Definition of Done
- [ ] Dialogs can be fully defined in game definition and rendered without runtime game-specific branching.
- [ ] Dialog button presses enter `pendingEvents` and are consumed by rules/state-machine triggers.
- [ ] Ball Sort win/progression flow uses game-defined dialog events.
- [ ] Legacy fallback is gated and documented; migration path is verified.

### Must Have
- Reuse existing `pendingEvents` and `triggerEvent` only.
- Reuse existing state machine + rule trigger semantics.
- Reuse existing `GameDialog` component.
- Runtime remains render/dispatch-only for dialogs.

### Must NOT Have (Guardrails)
- No new event mechanism (no dialog bus, no new queue type).
- No new state mechanism (no parallel dialog manager/store).
- No UI-side business flow branching.
- No dynamic styling/theming/i18n expansion in this scope.
- No multi-dialog stacking in v1 (single active dialog only).

---

## Exact Type Definitions To Add

Add these to `shared/src/types/GameDefinition.ts` (minimal surface, explicit single pattern):

```ts
// ============================================================================
// Generic Button → Event primitive (shared by dialogs AND standalone UI buttons)
// ============================================================================

export type GameButtonVariant = 'primary' | 'secondary';

export interface GameButtonDefinition {
  label: string;
  eventName: string;
  data?: Record<string, unknown>;
  variant?: GameButtonVariant;
}

// ============================================================================
// Dialog definitions (modal overlays)
// ============================================================================

export interface GameDialogStatDefinition {
  label: string;
  variable: string;
  format?: string; // e.g. "{value}s"
}

export interface GameDialogDefinition {
  id: string;
  title: string;
  message?: string;
  stats?: GameDialogStatDefinition[];
  dismissible?: boolean;
  dismissEventName?: string;
  buttons: GameButtonDefinition[];
}

export interface GameDialogsConfig {
  // Runtime reads this variable to decide active dialog.
  // Default: "activeDialog" if omitted.
  activeDialogVariable?: string;

  // Declarative dialog catalog.
  dialogs: GameDialogDefinition[];

  // Temporary migration switch; default true during migration window.
  legacyWinDialogFallback?: boolean;
}
```

Then extend `GameDefinition` with:

```ts
dialogs?: GameDialogsConfig;
```

### Key Design Decision: Buttons Are Dialog-Scoped For Now

`GameButtonDefinition` currently lives inside `GameDialogDefinition.buttons[]` only.

All dialog button presses fire events through: `triggerEvent(eventName, data)` → `pendingEvents` → consumed by rules/scripts.

**In-world buttons** are already handled by entities with tap triggers + event actions — no changes needed.

**Future work (out of scope)**: Generic UI overlay system for persistent on-screen buttons, menus, and custom HUD elements positioned outside the game world. This needs a separate design pass to handle positioning, layout, and interaction patterns holistically.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> All verification is agent-executed. No acceptance criteria may require manual clicking, visual review, or user interaction.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after
- **Framework**: Vitest (`app/package.json:26`), workspace orchestration via Turbo (`package.json:8`)

### Agent-Executed QA Scenarios (applies to all tasks)
Every task includes:
- at least one happy-path scenario,
- at least one negative/error scenario,
- evidence capture path in `.sisyphus/evidence/`.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (start immediately)
- Task 1: Add shared dialog type definitions
- Task 3: Add Ball Sort dialog declaration skeleton (non-runtime dependent shape draft)

Wave 2 (after Wave 1)
- Task 2: Runtime dialog resolver + button event bridge
- Task 4: Ball Sort rule/state-machine integration for dialog lifecycle

Wave 3 (after Wave 2)
- Task 5: Persistence/next-level integration via game-triggered events
- Task 6: Legacy fallback gating + migration flags + cleanup checklist
- Task 7: Tests-after + verification runbook

Critical path: 1 -> 2 -> 4 -> 6

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 2, 3, 4 | 3 |
| 2 | 1 | 4, 5, 6, 7 | None |
| 3 | 1 | 4 | 1 |
| 4 | 1,2,3 | 5,7 | None |
| 5 | 2,4 | 7 | 6 |
| 6 | 2,4 | 7 | 5 |
| 7 | 2,4,5,6 | None | None |

---

## TODOs

- [ ] 1. Add dialog schema to shared game types

  **What to do**:
  - Add `GameDialogButtonDefinition`, `GameDialogStatDefinition`, `GameDialogDefinition`, `GameDialogsConfig` and `dialogs?: GameDialogsConfig` in `shared/src/types/GameDefinition.ts`.
  - Keep naming explicit and aligned with existing `GameDefinition` style.
  - Export any newly added types through the existing type barrel if needed (`shared/src/types/index.ts`).

  **Must NOT do**:
  - Add a new event union for dialog interactions.
  - Add runtime-oriented callback/function fields in shared types.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: localized, type-only change.
  - **Skills**: `test-driven-development`, `verification-before-completion`
    - `test-driven-development`: ensure schema expectations are testable.
    - `verification-before-completion`: enforce compile/test evidence.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 3)
  - **Blocks**: 2, 3, 4
  - **Blocked By**: None

  **References**:
  - `shared/src/types/GameDefinition.ts:427` - Existing `GameDefinition` extension point.
  - `shared/src/types/GameDefinition.ts:104` - Existing UI config style.
  - `shared/src/types/rules.ts:82` - Existing `EventAction` shape (`eventName`, `data`) to mirror naming.

  **Acceptance Criteria**:
  - [ ] New dialog types exist and are part of `GameDefinition`.
  - [ ] No existing type imports break.
  - [ ] `pnpm tsc --noEmit` passes.

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Shared types compile after dialog schema addition
    Tool: Bash
    Preconditions: Workspace dependencies installed
    Steps:
      1. Run: pnpm tsc --noEmit
      2. Assert: exit code 0
      3. Assert: no type error references to GameDefinition/dialog fields
    Expected Result: Type system accepts new schema
    Failure Indicators: TS errors in shared/app imports
    Evidence: .sisyphus/evidence/task-1-tsc.txt

  Scenario: No accidental new event mechanism introduced
    Tool: Bash
    Preconditions: Task 1 changes applied
    Steps:
      1. Search for added "dialog event bus" style files/symbols in shared types diff
      2. Assert: only GameDefinition type additions are present
    Expected Result: Minimal surface area maintained
    Failure Indicators: new queue/bus manager type appears
    Evidence: .sisyphus/evidence/task-1-diff.txt
  ```

- [ ] 2. Implement runtime dialog resolver/renderer bridge using existing logical events

  **What to do**:
  - In `app/lib/game-engine/GameRuntime.godot.tsx`, derive active dialog from:
    - `definition.dialogs?.activeDialogVariable ?? 'activeDialog'`, and
    - `gameRef.current?.gameState.vars[activeDialogVariable]`.
  - Resolve dialog by id from `definition.dialogs.dialogs`.
  - Render `GameDialog` with mapped props (title/message/stats/buttons).
  - On button press: call `StateHelpers.triggerEvent(gameRef.current.gameState, button.eventName, button.data)`.
  - On dismiss (if configured): emit `dismissEventName` through same `triggerEvent` path.

  **Must NOT do**:
  - Put branching/progression logic in runtime callbacks.
  - Mutate unrelated game state directly from runtime dialog handlers.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: central runtime integration with behavior-sensitive flow.
  - **Skills**: `systematic-debugging`, `verification-before-completion`
    - `systematic-debugging`: avoid regressions in runtime state transitions.
    - `verification-before-completion`: enforce executable proof.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: 4, 5, 6, 7
  - **Blocked By**: 1

  **References**:
  - `app/lib/game-engine/GameRuntime.godot.tsx:2161` - Current `GameDialog` render location to replace/extend.
  - `app/components/game/GameDialog.tsx:4` - Current dialog prop contract.
  - `app/lib/game-engine/runtime/GameStateHelpers.ts:162` - `triggerEvent` integration point.
  - `app/lib/game-engine/runtime/types.ts:42` - `pendingEvents` destination.

  **Acceptance Criteria**:
  - [ ] Runtime renders dialog only when active dialog id variable points to valid dialog.
  - [ ] Button and dismiss actions emit logical events via `pendingEvents`.
  - [ ] Runtime contains no game-specific dialog business logic.

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Button click enqueues logical event
    Tool: Bash (Vitest)
    Preconditions: Runtime/unit test exists for dialog adapter path
    Steps:
      1. Run: pnpm --filter slopcade test -- GameRuntime
      2. Assert: test verifies button press calls triggerEvent with expected event/data
    Expected Result: event appears in pendingEvents map for next frame
    Failure Indicators: callback bypasses triggerEvent or mutates progression directly
    Evidence: .sisyphus/evidence/task-2-runtime-test.txt

  Scenario: Invalid dialog id fails safe
    Tool: Bash (Vitest)
    Preconditions: activeDialog variable points to unknown id
    Steps:
      1. Execute runtime adapter test with unknown dialog id
      2. Assert: GameDialog not rendered; no crash
      3. Assert: optional warning log emitted
    Expected Result: runtime safely ignores bad id
    Evidence: .sisyphus/evidence/task-2-invalid-dialog.txt
  ```

- [ ] 3. Define Ball Sort dialogs declaratively

  **What to do**:
  - Add `dialogs` config in `r2/games/ballSort/src/game.ts`.
  - Set `activeDialogVariable` to `activeDialog`.
  - Add at minimum `levelComplete` dialog with:
    - `Next Level` -> `dialog_next_level`
    - `Replay Level` -> `dialog_replay_level`
  - Add variables needed for dialog visibility/content (`activeDialog`, optional formatted stats variables).

  **Must NOT do**:
  - Embed runtime callback/function references in definition.
  - Add separate dialog-specific rule engine.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `brainstorming`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 4
  - **Blocked By**: 1

  **References**:
  - `r2/games/ballSort/src/game.ts:95` - Existing UI/variables area for declarative additions.
  - `r2/games/ballSort/src/game.ts:251` - Win-check rule currently triggering win flow.
  - `shared/src/types/GameDefinition.ts:427` - New field landing point.

  **Acceptance Criteria**:
  - [ ] Ball Sort declares dialogs in `GameDefinition`.
  - [ ] Dialog button event names align with rules/state-machine transitions.

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Ball Sort definition validates with new dialog schema
    Tool: Bash
    Preconditions: Task 1 complete
    Steps:
      1. Run: pnpm tsc --noEmit
      2. Assert: no errors from r2/games/ballSort/src/game.ts
    Expected Result: dialog schema accepted
    Evidence: .sisyphus/evidence/task-3-ball-sort-types.txt

  Scenario: Missing dialog references caught by tests
    Tool: Bash (Vitest)
    Preconditions: integration test checks configured ids
    Steps:
      1. Run targeted test for Ball Sort flow mapping
      2. Assert: fails when button references unknown dialog event path
    Expected Result: contract mismatch detectable
    Evidence: .sisyphus/evidence/task-3-contract-test.txt
  ```

- [ ] 4. Integrate dialogs with Ball Sort state machine/rules flow

  **What to do**:
  - Use existing rules/state machine actions to control dialog lifecycle:
    - On win transition/condition -> `set_variable activeDialog = 'levelComplete'`.
    - On `dialog_next_level` -> clear dialog variable + progression action path.
    - On `dialog_replay_level` -> clear dialog variable + restart path.
  - Keep event names as logical events consumed by existing rule triggers (`{ type: 'event', eventName }`).

  **Must NOT do**:
  - Trigger progression directly from UI layer.
  - Add ad-hoc branching in runtime event handlers.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `test-driven-development`, `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: 5, 6, 7
  - **Blocked By**: 2, 3

  **References**:
  - `r2/games/ballSort/src/game.ts:104` - Existing `gameFlow` machine.
  - `r2/games/ballSort/src/game.ts:223` - Existing rules list and event triggers.
  - `shared/src/systems/state-machine/types.ts:10` - `onEnter`/`onExit` action hooks.
  - `shared/src/types/rules.ts:347` - `set_variable` action semantics.

  **Acceptance Criteria**:
  - [ ] Ball Sort dialog open/close is rule/state-machine-driven.
  - [ ] Button events are processed in the same logical event system as other game events.
  - [ ] No direct runtime-level Ball Sort-specific conditionals remain for win dialog flow.

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Winning opens levelComplete dialog through game logic
    Tool: Playwright (playwright skill)
    Preconditions: Ball Sort loaded; deterministic win setup available
    Steps:
      1. Navigate to Ball Sort route
      2. Drive game to winning condition
      3. Wait for dialog title selector text "Level Complete!"
      4. Assert buttons "Next Level" and "Replay Level" visible
      5. Screenshot: .sisyphus/evidence/task-4-level-complete-dialog.png
    Expected Result: dialog appears due to game-defined flow
    Evidence: .sisyphus/evidence/task-4-level-complete-dialog.png

  Scenario: Dialog hidden when activeDialog cleared
    Tool: Playwright (playwright skill)
    Preconditions: dialog visible
    Steps:
      1. Trigger configured close path (button/dismiss)
      2. Assert dialog root no longer visible
      3. Assert no runtime exception logs
    Expected Result: dialog lifecycle controlled by game state var
    Evidence: .sisyphus/evidence/task-4-dialog-close.txt
  ```

- [ ] 5. Make persistence/level advancement game-triggered (not hardcoded by win detection)

  **What to do**:
  - Move progression trigger to game events (e.g., `dialog_next_level`) handled by rules/actions/scripts.
  - Runtime may still provide persistence utilities, but invocation must originate from game flow events.
  - Ensure existing storage path (`definition.persistence`) remains compatible.

  **Must NOT do**:
  - Auto-show or auto-advance on `gameState === 'won'` in runtime.
  - Couple persistence writes to dialog rendering conditions.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `systematic-debugging`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 6)
  - **Blocks**: 7
  - **Blocked By**: 2, 4

  **References**:
  - `app/lib/game-engine/GameRuntime.godot.tsx:1686` - current hardcoded next-level persistence flow to decouple.
  - `r2/games/ballSort/src/game.ts:269` - persistence config still available for compatibility.
  - `shared/src/types/rules.ts:270` - existing `game_state` actions for progression semantics.

  **Acceptance Criteria**:
  - [ ] Progression save/advance starts from dialog intent event path.
  - [ ] Persistence success/failure does not require UI-layer branching.

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Next Level button advances persisted level
    Tool: Playwright + Bash
    Preconditions: level complete dialog visible, persistence enabled
    Steps:
      1. Click "Next Level"
      2. Assert logical event consumed and level variable increments
      3. Assert storage/progress reflects new level
    Expected Result: progression written based on game-triggered event
    Evidence: .sisyphus/evidence/task-5-next-level.txt

  Scenario: Persistence failure does not crash runtime
    Tool: Vitest (mocked storage failure)
    Preconditions: persistence write throws
    Steps:
      1. Trigger next level event path
      2. Assert failure handled/logged
      3. Assert runtime remains responsive
    Expected Result: graceful failure path
    Evidence: .sisyphus/evidence/task-5-failure-path.txt
  ```

- [ ] 6. Migration and fallback policy

  **What to do**:
  - Keep legacy hardcoded win-dialog behavior only when:
    - `definition.dialogs` is missing, and
    - `legacyWinDialogFallback` is true (default true during migration).
  - Add clear deprecation warning log on fallback path.
  - Document cutoff task to remove fallback once migrated games are done.

  **Must NOT do**:
  - Maintain dual behavior indefinitely.
  - Introduce per-game exceptions in runtime.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `verification-before-completion`, `writing-plans`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 5)
  - **Blocks**: 7
  - **Blocked By**: 2, 4

  **References**:
  - `app/lib/game-engine/GameRuntime.godot.tsx:335` - current hardcoded won+persistence conditional.
  - `app/lib/game-engine/GameRuntime.godot.tsx:412` - existing win dialog state to phase out.

  **Acceptance Criteria**:
  - [ ] Legacy path activates only under explicit fallback conditions.
  - [ ] Deprecation warning appears when fallback is used.
  - [ ] Plan includes final removal checkpoint.

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: New dialog config bypasses legacy fallback
    Tool: Vitest
    Preconditions: game has dialogs config
    Steps:
      1. Drive won state
      2. Assert runtime uses game-defined dialog resolver path
      3. Assert no legacy fallback warning emitted
    Expected Result: new path preferred
    Evidence: .sisyphus/evidence/task-6-new-path.txt

  Scenario: Legacy game still works during migration
    Tool: Vitest/Playwright
    Preconditions: game without dialogs config
    Steps:
      1. Drive won state
      2. Assert legacy dialog still appears
      3. Assert deprecation warning emitted
    Expected Result: backward compatibility preserved temporarily
    Evidence: .sisyphus/evidence/task-6-legacy-path.txt
  ```

- [ ] 7. Tests-after implementation and final verification

  **What to do**:
  - Add/extend tests for:
    - runtime dialog resolver + button event emission,
    - Ball Sort event-driven dialog flow,
    - fallback behavior gating.
  - Run full verification commands.

  **Must NOT do**:
  - Declare completion without command evidence.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-before-completion`, `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None
  - **Blocked By**: 2, 4, 5, 6

  **References**:
  - `app/lib/game-engine/__tests__/testUtils.ts` - game test harness patterns.
  - `app/package.json:26` - Vitest entrypoint.
  - `package.json:8` - monorepo test orchestration.

  **Acceptance Criteria**:
  - [ ] `pnpm tsc --noEmit` passes.
  - [ ] `pnpm --filter slopcade test` passes for updated runtime/game-engine tests.
  - [ ] Targeted Ball Sort dialog flow test passes.
  - [ ] Evidence artifacts exist in `.sisyphus/evidence/`.

---

## Ball Sort Rewritten Pattern (Target Shape)

This is the canonical pattern AI should follow:

1. Declare dialogs in `GameDefinition.dialogs.dialogs`.
2. Keep current gameplay state machine (`gameFlow`) for play interactions.
3. On win condition, set `activeDialog` variable to `levelComplete`.
4. Dialog button emits logical event:
   - `dialog_next_level`
   - `dialog_replay_level`
5. Rules consume those events to:
   - clear `activeDialog`,
   - run progression/restart actions,
   - optionally trigger state transitions.

No direct progression decisions in runtime.

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(shared): add game-defined dialog schema` | `shared/src/types/GameDefinition.ts` | `pnpm tsc --noEmit` |
| 2 | `feat(runtime): render game-defined dialogs via logical events` | `app/lib/game-engine/GameRuntime.godot.tsx` | `pnpm --filter slopcade test -- GameRuntime` |
| 3-4 | `refactor(ball-sort): drive win flow through dialog intent events` | `r2/games/ballSort/src/game.ts` | `pnpm --filter slopcade test -- ballSort` |
| 5-6 | `refactor(runtime): gate legacy dialog fallback during migration` | runtime + tests | targeted fallback tests |
| 7 | `test(game-engine): cover dialog event flow and fallback` | test files | full verification suite |

---

## Success Criteria

### Verification Commands
```bash
pnpm tsc --noEmit
pnpm --filter slopcade test
pnpm test
```

### Final Checklist
- [ ] Dialog definitions live in game definition, not runtime logic.
- [ ] Dialog actions re-enter existing logical event pipeline only.
- [ ] State machines/rules control flow progression.
- [ ] Ball Sort follows the canonical pattern.
- [ ] Legacy fallback is temporary, gated, and documented.
- [ ] No new parallel event/state mechanism was introduced.
