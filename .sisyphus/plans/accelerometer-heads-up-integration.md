# Accelerometer + Heads-Up Template Plan

## TL;DR

> **Quick Summary**: Keep this small. Reuse the existing native tilt pipeline, add only the minimum directional tilt behavior needed for Heads-Up pass/correct, and ship one forkable Heads-Up template game.
>
> **Deliverables**:
> - Confirmed native tilt -> rules integration path
> - Minimal directional tilt trigger behavior (only if required)
> - `headsUp` sample/template game in `r2/games/`
>
> **Estimated Effort**: Short
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 -> Task 2 -> Task 3

---

## Context

### Original Request
Investigate accelerometer integration in React Native and plan a super simple Heads-Up style game with tilt-based correct/pass behavior. Web support is not required.

### Updated User Direction
- Keep the solution simple.
- Do not build a complex AI system or train/teach new models.
- Provide a template game people can fork and theme.

### Existing Reality in Codebase
- Native accelerometer hook already exists: `app/lib/game-engine/hooks/useTiltInput.native.ts`.
- Web hook is already no-op: `app/lib/game-engine/hooks/useTiltInput.web.ts`.
- Input reaches rule system already: `app/lib/game-engine/hooks/useGameInput.ts` and `app/lib/game-engine/GameRuntime.godot.tsx`.
- `tilt` trigger already exists in rules: `shared/src/types/rules.ts` + evaluator at `app/lib/game-engine/rules/triggers/InputTriggerEvaluator.ts`.
- `expo-sensors` is already installed in `app/package.json`.

### Metis Guardrails Applied
- Explicitly avoid scope creep (no multiplayer, no advanced AI features, no web tilt).
- Maintain backward compatibility for existing tilt-based games.
- Add concrete anti-noise acceptance criteria (single trigger per tilt, cooldown).

---

## Work Objectives

### Core Objective
Ship a practical, forkable Heads-Up template with reliable native tilt controls using the architecture already in the repo.

### Concrete Deliverables
- Directionally usable tilt trigger behavior for pass/correct.
- Heads-Up template game bundle under `r2/games/headsUp/`.
- Verification evidence showing one round can be played with score/pass tracking.

### Definition of Done
- [ ] Tilt signal from native device drives rule triggers reliably.
- [ ] Heads-Up template supports 10 cards, score, pass, and round end.
- [ ] Existing tilt games still behave as before.

### Must Have
- Native-only tilt gameplay (iOS/Android).
- Template-first implementation (easy to fork and theme).
- Text-only cards and simple round logic.

### Must NOT Have (Guardrails)
- No new AI platform work (no classifier/generator retraining).
- No web accelerometer support.
- No multiplayer, leaderboards, recording, or advanced game modes.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> Every acceptance criterion is verifiable by commands/tools. No manual "user checks it" criteria.

### Test Decision
- **Infrastructure exists**: YES (Vitest + Turbo)
- **Automated tests**: Tests-after
- **Agent-Executed QA**: ALWAYS

---

## Execution Strategy

### Parallel Execution Waves

Wave 1:
- Task 1: Verify/patch tilt trigger direction behavior with backward compatibility
- Task 3: Scaffold Heads-Up template files (definition/manifest/rules/script skeleton)

Wave 2:
- Task 2: Wire stable gesture handling and thresholds for pass/correct in template runtime logic
- Task 4: Verification pass + evidence

Critical Path: Task 1 -> Task 2 -> Task 4

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 4 | 3 |
| 2 | 1 | 4 | None |
| 3 | None | 4 | 1 |
| 4 | 1, 2, 3 | None | None |

---

## TODOs

- [ ] 1. Confirm and minimally patch tilt trigger direction semantics

  **What to do**:
  - Validate current `tilt` trigger behavior in evaluator.
  - If evaluator cannot differentiate pass/correct polarity, add the smallest compatible extension (e.g., direction flag with default preserving legacy behavior).
  - Add focused tests for legacy + directional cases.

  **Must NOT do**:
  - Do not break existing games that already use `tilt` triggers.
  - Do not redesign the full input system.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `test-driven-development`, `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 3)
  - **Blocks**: 2, 4
  - **Blocked By**: None

  **References**:
  - `app/lib/game-engine/rules/triggers/InputTriggerEvaluator.ts` - current tilt evaluation.
  - `shared/src/types/rules.ts` - trigger contract.
  - `shared/src/types/schemas.ts` - schema updates if needed.
  - `r2/games/breakoutBouncer/definition.json` - existing tilt behavior to preserve.

  **Acceptance Criteria**:
  - [ ] Directional pass/correct behavior is possible for Heads-Up.
  - [ ] Legacy tilt behavior remains unchanged.
  - [ ] Targeted tests pass.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Legacy tilt behavior remains stable
    Tool: Bash
    Preconditions: evaluator tests include old behavior cases
    Steps:
      1. Run: pnpm test --filter app -- InputTriggerEvaluator
      2. Assert: legacy tilt cases pass
    Expected Result: Existing behavior unchanged
    Evidence: .sisyphus/evidence/task-1-legacy.txt

  Scenario: Directional polarity works for pass/correct split
    Tool: Bash
    Preconditions: directional tests added
    Steps:
      1. Run directional test cases with opposite tilt signs
      2. Assert: positive and negative thresholds map to different outcomes
    Expected Result: Correct and pass can be separated
    Evidence: .sisyphus/evidence/task-1-directional.txt
  ```

- [ ] 2. Add simple, robust Heads-Up tilt gesture handling

  **What to do**:
  - In template gameplay logic, enforce one trigger per gesture (edge-trigger), cooldown, and return-to-neutral before next trigger.
  - Keep thresholds simple and configurable in template constants/variables.

  **Must NOT do**:
  - Do not build a generalized multi-game gesture engine.
  - Do not add extra sensor types for v1.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: 4
  - **Blocked By**: 1

  **References**:
  - `app/lib/game-engine/hooks/useTiltInput.native.ts` - raw sensor update behavior.
  - `app/lib/game-engine/hooks/useGameInput.ts` - tilt state handoff.
  - `app/lib/game-engine/GameRuntime.godot.tsx` - runtime input lifecycle.

  **Acceptance Criteria**:
  - [ ] Single tilt does not double-fire actions.
  - [ ] Cooldown prevents accidental repeated scoring.
  - [ ] Gesture can re-arm only after returning to neutral.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Cooldown blocks repeat fire
    Tool: Bash
    Preconditions: deterministic gesture-state tests exist
    Steps:
      1. Feed repeated threshold-crossing values within cooldown window
      2. Assert: one event emitted only
    Expected Result: no duplicate scoring from single motion
    Evidence: .sisyphus/evidence/task-2-cooldown.txt

  Scenario: Neutral re-arm required before next event
    Tool: Bash
    Preconditions: return-to-neutral logic implemented
    Steps:
      1. Trigger one event
      2. Keep tilt outside neutral band
      3. Assert: no new event
      4. Return to neutral then tilt again
      5. Assert: next event emitted once
    Expected Result: stable edge-trigger behavior
    Evidence: .sisyphus/evidence/task-2-rearm.txt
  ```

- [ ] 3. Ship a forkable Heads-Up template game (`r2/games/headsUp/`)

  **What to do**:
  - Create template game files (manifest/definition/rules/script) with:
    - 10-card deck (template list)
    - score and pass counters
    - current card index
    - round timer/end condition
    - overlay for card + timer + score
  - Keep card content as simple template data that can be edited/forked.

  **Must NOT do**:
  - Do not add AI pipeline integration inside this template task.
  - Do not add unnecessary UI complexity.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `game-authoring`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: 4
  - **Blocked By**: None

  **References**:
  - `r2/games/breakoutBouncer/definition.json` - tilt rule examples.
  - `r2/games/ballSort/definition.json` - script + variable heavy game pattern.
  - `app/lib/game-engine/ui/overlay/OverlayRenderer.tsx` - overlay elements.
  - `app/lib/game-engine/ui/overlay/BindingEvaluator.ts` - binding expressions.

  **Acceptance Criteria**:
  - [ ] `headsUp` game loads from bundle and starts a round.
  - [ ] Overlay shows current card, timer, score.
  - [ ] Correct/pass updates counters and advances card.
  - [ ] Round ends deterministically (cards exhausted or timer).

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Template round flow runs end-to-end
    Tool: game-inspector_debug_eval + game-inspector_game_state
    Preconditions: headsUp template loaded
    Steps:
      1. Start round state
      2. Trigger correct and pass events via test hooks
      3. Assert: cardIndex increments and counters update correctly
      4. Step until round end condition
      5. Assert: state transitions to ended/won summary state
    Expected Result: complete deterministic round flow
    Evidence: .sisyphus/evidence/task-3-round-flow.json

  Scenario: Negative path - missing/empty deck handled safely
    Tool: game-inspector_debug_eval
    Preconditions: inject empty deck variable state
    Steps:
      1. Attempt to start round with zero cards
      2. Assert: game enters safe error/end state (no crash)
    Expected Result: graceful handling of invalid deck
    Evidence: .sisyphus/evidence/task-3-empty-deck.json
  ```

- [ ] 4. Run full verification and prepare handoff evidence

  **What to do**:
  - Run tests/type-check on touched workspaces.
  - Execute all task QA scenarios and save evidence files.
  - Produce concise execution notes for template forking usage.

  **Must NOT do**:
  - Do not mark complete without evidence for both happy and negative paths.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-before-completion`, `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Final
  - **Blocks**: None
  - **Blocked By**: 1, 2, 3

  **References**:
  - `package.json` - root verification scripts.
  - `app/package.json` - app test script.
  - `.sisyphus/evidence/` - evidence destination.

  **Acceptance Criteria**:
  - [ ] `pnpm test` passes for touched modules.
  - [ ] `pnpm tsc --noEmit` passes.
  - [ ] Evidence files exist for each task scenario.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Validation suite passes
    Tool: Bash
    Preconditions: all implementation tasks complete
    Steps:
      1. Run: pnpm test
      2. Run: pnpm tsc --noEmit
      3. Capture outputs
    Expected Result: both commands succeed
    Evidence: .sisyphus/evidence/task-4-validation.txt

  Scenario: Evidence completeness audit
    Tool: Bash
    Preconditions: all scenario outputs generated
    Steps:
      1. Verify all expected evidence paths exist
      2. Assert each task has happy + negative evidence
    Expected Result: complete auditable pack
    Evidence: .sisyphus/evidence/task-4-audit.txt
  ```

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 1 | `feat(rules): support heads-up directional tilt safely` | targeted evaluator tests |
| 2 | `feat(input): stabilize heads-up tilt gesture handling` | gesture logic tests |
| 3 | `feat(games): add forkable heads-up template` | runtime round-flow checks |
| 4 | `chore(verification): finalize heads-up evidence` | full tests + typecheck |

---

## Success Criteria

### Verification Commands
```bash
pnpm test
pnpm tsc --noEmit
```

### Final Checklist
- [ ] Accelerometer tilt signal is usable in rules for pass/correct.
- [ ] Heads-Up template is simple, playable, and fork-friendly.
- [ ] No unnecessary AI-system complexity introduced.
- [ ] Existing tilt games remain stable.
