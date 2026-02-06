# AI Game Builder: Idempotency Hardening + Interactive Q/A Loop

## TL;DR

> **Quick Summary**: Harden replay safety and billing correctness first, then add an editor-native AI clarifying-question loop gated by a YAML-configured checklist before planning can move to build.
>
> **Deliverables**:
> - Strict idempotency/recovery fixes in coordinator+worker+billing paths
> - YAML-driven planning gate config at `api/config/ai-planning-gates.yaml`
> - Editor UI confirmation gate + stage-aware AI clarifying Q/A flow
> - End-to-end tests for duplicate command/run/recovery/billing safety
>
> **Estimated Effort**: Medium-Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: idempotency fixes -> gate enforcement -> Q/A flow -> integration verification

---

## Context

### Original Request
User wants to safely iterate an AI game-builder flow where they can stop/resume, see progress/artifacts/planning state, answer AI clarifying questions, and explicitly confirm before planning advances into build.

### Interview Summary
**Key decisions**:
- Priority order: **idempotency hardening first**, then **planning Q/A flow**.
- No developer-only dashboard; all functionality lives in editor UI.
- Explicit user confirmation required before planning -> build.
- Clarifying Q/A can occur in **any stage**.
- Gate configuration should be editable YAML with comments.
- Gate config location: `api/config/ai-planning-gates.yaml`.
- Required planning gate fields:
  - core game loop
  - win/lose conditions
  - theme/style
  - game type category

### Metis Review
**Identified gaps (addressed by this plan)**:
- Worker replay path can still redo work in certain retry/recovery paths.
- Recovery advancement can diverge from settlement path without explicit guard.
- Start/transition idempotency needs stricter CAS/version checks.
- No first-class configurable planning gate source.
- No first-class conversational Q/A state machine in UI/route contracts.

---

## Work Objectives

### Core Objective
Deliver a replay-safe, user-controllable AI run lifecycle with explicit planning gates and interactive clarifying Q/A in the editor.

### Concrete Deliverables
- Idempotency hardening in `RunCoordinatorDO` and `RunStepWorkerDO`.
- YAML gate spec + parser/validator + server-side enforcement.
- Editor gate checklist + explicit confirmation UX.
- Stage-aware Q/A event and answer loop integrated into existing run pipeline.
- Test suite covering duplicate/retry/recovery and gate/QA behavior.

### Definition of Done
- [x] Duplicate `startRun`/control/recovery calls do not duplicate billing or artifacts.
- [x] Stale recovery resumes from checkpoint without re-settling settled steps.
- [x] `startRun` is blocked until YAML-required planning fields are satisfied + user confirms.
- [x] AI can ask clarifying questions, user can answer, run resumes from waiting state.
- [x] All verification commands pass locally.

### Must Have
- Server-side gate checks (not UI-only).
- Durable idempotency keys and transition CAS/version checks.
- Q/A flow persisted and replayable on reconnect.

### Must NOT Have (Guardrails)
- No separate dev-only dashboard.
- No human-only acceptance criteria.
- No auto-advance from planning to build without explicit confirmation.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> All verification is agent-executed with commands and assertions.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after
- **Framework**: existing API/app test stack + TypeScript checks

### Agent-Executed QA Scenarios (MANDATORY)
Each task below includes concrete scenarios (happy + failure).

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start immediately):
- Task 1: Idempotency hardening in worker/coordinator replay paths
- Task 2: Transition CAS/version guards + duplicate command safety

Wave 2 (After Wave 1):
- Task 3: YAML gate config + parser + server enforcement
- Task 4: Editor confirmation gate UI

Wave 3 (After Wave 2):
- Task 5: Conversational Q/A data model in events/contracts/routes
- Task 6: Editor Q/A components + answer submission loop

Wave 4 (After Wave 3):
- Task 7: End-to-end tests + rollout/feature flag tightening

Critical Path: 1 -> 3 -> 5 -> 7

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 3,5,7 | 2 |
| 2 | None | 5,7 | 1 |
| 3 | 1 | 4,5,7 | None |
| 4 | 3 | 6,7 | None |
| 5 | 1,2,3 | 6,7 | None |
| 6 | 4,5 | 7 | None |
| 7 | 1-6 | None | None |

---

## TODOs

- [x] 1. Harden replay/idempotency in worker + coordinator

  **What to do**:
  - Add worker-side short-circuit: if step checkpoint already exists for `(runId, stepIndex)` with success, return existing result without re-invoking model.
  - Ensure coordinator recovery path invokes settlement logic when recovering completed-but-unsettled steps.
  - Ensure event write paths keep deterministic dedupe semantics.

  **Must NOT do**:
  - Do not bypass existing billing service idempotency keys.
  - Do not rely on in-memory dedupe only.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `systematic-debugging`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: 3,5,7
  - **Blocked By**: None

  **References**:
  - `api/src/agent/RunStepWorkerDO.ts` - step execution and checkpoint persistence.
  - `api/src/agent/RunCoordinatorDO.ts` - recovery/dispatch/settlement flow.
  - `api/src/economy/agent-billing-service.ts` - settlement idempotency contract.

  **Acceptance Criteria**:
  - [x] Repeated execution request for same successful step returns checkpointed result without model call.
  - [x] Recovery from checkpoint cannot skip settlement for completed step.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Duplicate execute_step does not rerun model
    Tool: Bash (API test command)
    Steps:
      1. Trigger step execution for run R step S
      2. Trigger same execution payload again
      3. Assert only one provider usage/cost entry for step S
    Expected Result: no duplicated model work
    Evidence: .sisyphus/evidence/task-1-duplicate-step.txt

  Scenario: Recovery settles previously completed step
    Tool: Bash
    Steps:
      1. Simulate completed checkpoint with unsettled marker
      2. Trigger recovery
      3. Assert settleStep applied once and run cost updated
    Expected Result: no settlement gap
    Evidence: .sisyphus/evidence/task-1-recovery-settle.txt
  ```

- [x] 2. Add transition CAS/version guards

  **What to do**:
  - Add run state version checks for critical transitions (`start`, `pause`, `resume`, `cancel`, recovery resume).
  - Enforce no-op deterministic responses for duplicate/late commands.

  **Must NOT do**:
  - Do not allow two conflicting transitions to both commit.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `systematic-debugging`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: 5,7
  - **Blocked By**: None

  **References**:
  - `api/src/agent/RunCoordinatorDO.ts` - command processing and state persistence.
  - `api/src/trpc/routes/agent-runs.ts` - lifecycle route transitions.

  **Acceptance Criteria**:
  - [x] Concurrent duplicate commands produce one transition and deterministic acks.
  - [x] Transition conflicts return safe no-op or conflict error with current state.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Double startRun race
    Tool: Bash
    Steps:
      1. Send two startRun requests concurrently for same run
      2. Assert one accepted transition and one deterministic no-op/conflict
      3. Assert single reservation hold
    Expected Result: one start effect only
    Evidence: .sisyphus/evidence/task-2-double-start.txt
  ```

- [x] 3. Add YAML planning-gate config + server-side enforcement

  **What to do**:
  - Create `api/config/ai-planning-gates.yaml` with comments and editable field definitions.
  - Implement YAML loader/validator in API layer.
  - Enforce gate checks in `startRun` before queue transition.

  **Must NOT do**:
  - Do not keep gate logic UI-only.
  - Do not hardcode gate questions in multiple files.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: 4,5,7
  - **Blocked By**: 1

  **References**:
  - `api/src/trpc/routes/agent-runs.ts` - `startRun` path.
  - `app/components/editor/AIEditor/PlanningDocEditor.tsx` - planning content shape.

  **Acceptance Criteria**:
  - [x] Missing required fields block `startRun` with clear machine-readable error.
  - [x] Config can be edited without code changes for question/field requirements.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: startRun blocked by missing gates
    Tool: Bash
    Steps:
      1. Create run with incomplete planning doc
      2. Call startRun
      3. Assert precondition failure with missing field list
    Expected Result: build cannot start
    Evidence: .sisyphus/evidence/task-3-gate-block.txt
  ```

- [x] 4. Add editor confirmation gate UX

  **What to do**:
  - Add checklist rendering from gate requirements in editor panel.
  - Add explicit "Confirm and Continue to Build" action.
  - Keep rough UX acceptable for internal use; no separate admin tool.

  **Must NOT do**:
  - Do not auto-advance on inferred confidence.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: 6,7
  - **Blocked By**: 3

  **References**:
  - `app/components/editor/AIEditor/AIEditorPanel.tsx`
  - `app/components/editor/AIEditor/useAgentRun.ts`

  **Acceptance Criteria**:
  - [x] Start button remains disabled until required fields are satisfied.
  - [x] Explicit confirmation is required before transition.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: UI gate disables start
    Tool: Playwright
    Steps:
      1. Open editor AI panel with incomplete planning fields
      2. Assert start/confirm action disabled
      3. Fill required fields
      4. Assert confirm action enabled
    Expected Result: gate is user-visible and enforceable
    Evidence: .sisyphus/evidence/task-4-ui-gate.png
  ```

- [x] 5. Implement stage-aware clarifying Q/A loop contracts

  **What to do**:
  - Define Q/A event payloads and route methods to submit answers.
  - Add run state transitions for waiting on user input in any stage.
  - Persist Q/A prompts/answers in durable event/state records.

  **Must NOT do**:
  - Do not store Q/A only in transient websocket memory.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `systematic-debugging`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: 6,7
  - **Blocked By**: 1,2,3

  **References**:
  - `shared/src/types/agent-run.ts` - event typing contracts.
  - `api/src/agent/engine/stages.ts` and `api/src/agent/engine/stage-executor.ts`.
  - `api/src/trpc/routes/agent-runs.ts`.

  **Acceptance Criteria**:
  - [x] AI can emit question events in any stage and transition run to waiting state.
  - [x] Submitted answer resumes processing from same stage safely.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: In-stage clarification pause/resume
    Tool: Bash
    Steps:
      1. Trigger run where stage asks clarification
      2. Assert run status indicates waiting for user
      3. Submit answer via route
      4. Assert run resumes from same stage index
    Expected Result: conversational gate works in non-planning stage
    Evidence: .sisyphus/evidence/task-5-qa-resume.txt
  ```

- [x] 6. Add editor conversational Q/A components

  **What to do**:
  - Show AI question cards + answer input + answer history in editor panel.
  - Surface current stage + unresolved question count.
  - Preserve clarity on what is blocking next transition.

  **Must NOT do**:
  - Do not hide blocking reason when waiting for user input.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: 7
  - **Blocked By**: 4,5

  **References**:
  - `app/components/editor/AIEditor/AIEditorPanel.tsx`
  - `app/components/editor/AIEditor/useAgentRun.ts`

  **Acceptance Criteria**:
  - [x] User can answer AI clarification prompts from editor without leaving flow.
  - [x] Reconnect restores unresolved question context.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Question survives reconnect
    Tool: Playwright
    Steps:
      1. Enter waiting-for-answer state
      2. Refresh/reconnect client
      3. Assert same pending question is displayed
    Expected Result: durable Q/A continuity
    Evidence: .sisyphus/evidence/task-6-reconnect-question.png
  ```

- [x] 7. End-to-end verification + rollout guardrails

  **What to do**:
  - Add integration/e2e tests for duplicate start, replay recovery, gate enforcement, Q/A loop.
  - Add logging for gate failures, wait states, and resume reasons.
  - Keep behind existing AI editing feature flags.

  **Must NOT do**:
  - Do not roll out broadly without passing negative-path tests.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-before-completion`, `requesting-code-review`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 final
  - **Blocks**: None
  - **Blocked By**: 1-6

  **References**:
  - `api/src/trpc/routes/__tests__/agent-runs.test.ts`
  - `api/src/agent/recovery-service.test.ts`
  - `app/components/editor/AIEditor/*`

  **Acceptance Criteria**:
  - [x] E2E passes for interrupted run resume without double-settlement.
  - [x] Gate checks block start until required fields + confirmation.
  - [x] In-stage Q/A loop works and resumes processing correctly.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Full flow with interruption and resume
    Tool: Bash + Playwright
    Steps:
      1. Create run with short prompt
      2. Enter planning and complete required gate fields
      3. Start run, force interruption mid-stage
      4. Resume run
      5. Assert final state succeeds and billing has no duplicates
    Expected Result: resilient full workflow
    Evidence: .sisyphus/evidence/task-7-full-flow.txt
  ```

---

## Success Criteria

### Verification Commands
```bash
pnpm --filter api exec tsc --noEmit
pnpm --filter slopcade exec tsc --noEmit
pnpm --filter @slopcade/api test:run
```

### Final Checklist
- [x] Replay/recovery cannot duplicate artifacts or settlement.
- [x] YAML gate config drives server-side start gating.
- [x] Explicit confirmation required before planning->build.
- [x] Clarifying Q/A works in any stage with durable resume.
