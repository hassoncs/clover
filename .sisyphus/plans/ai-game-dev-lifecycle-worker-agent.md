# AI-Powered Game Dev Lifecycle (Worker + DO)

## TL;DR

> **Quick Summary**: Build a server-authoritative AI game creation pipeline in the API layer using Durable Objects + WebSockets for live editor updates, a staged planning-to-generation workflow, and Sparks-compatible reservation billing.
>
> **Deliverables**:
> - New agent run orchestration system (runs/steps/events/checkpoints)
> - Planning-doc loop in editor before execution
> - Tiered model routing (`Free / Standard / Pro`) via server config
> - Reserve-max/settle-actual Spark billing for agent runs
> - Live editor patch stream with reconnect and resume
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: data model -> orchestrator state machine -> billing settlement -> realtime stream -> editor integration

---

## Context

### Original Request
Design an end-to-end AI game development lifecycle where users can start from scratch or fork an existing game, iterate on an AI-generated planning doc, then execute multi-stage generation (game JSON/JS, refinement, theming/assets), with live updates in editor and robust Spark billing.

### Interview Summary
**Key Discussions**:
- Server-side execution is mandatory for product/billing coherence.
- Realtime v1 architecture is explicitly selected as **Durable Objects + WebSocket now**.
- Model tiers must be explicit in UI: **Free / Standard / Pro**.
- Tier -> model mapping should start in **server config** for v1.
- Billing must be **Reserve Max, Settle Actual**.
- Partial failure policy must be **Step-based settlement**.
- Test strategy selected: **tests-after** (with strong integration/e2e on billing + state machine + reconnect).

**Research Findings**:
- Existing game creation/generation routes: `api/src/trpc/routes/games.ts`, `api/src/ai/game/generator.ts`.
- Existing job/task orchestration and polling pattern: `api/src/trpc/routes/asset-system.ts`, `app/components/editor/AssetGallery/useAssetGeneration.ts`.
- Existing Spark billing primitives: `api/src/economy/wallet-service.ts`, `api/src/economy/pricing.ts`, `api/src/economy/cost-estimator.ts`.
- Existing asset/theming pipeline and adapters: `api/src/ai/pipeline/*`, `api/src/ai/pipeline/adapters/workers.ts`.

### Metis Review
**Identified Gaps (addressed in this plan)**:
- Missing explicit guardrails for concurrency, timeouts, abuse, and scope boundaries.
- Missing concrete acceptance criteria for reservation, settlement, reconnect, resume, and idempotency.
- Missing edge-case handling for duplicate settlement, reconnect drift, and provider outages.
- Missing clarity on event ordering and artifact publishing semantics.

---

## Work Objectives

### Core Objective
Implement a production-ready AI editing lifecycle in the API layer that reliably converts user intent into playable game artifacts with live feedback and financially correct billing.

### Concrete Deliverables
- New DB schema for agent runs/steps/events/checkpoints/cost records.
- Durable Object orchestration service + WebSocket protocol.
- Vercel AI SDK based execution engine with tool loop and tier routing.
- Spark reservation/settlement extension for agent runs.
- Editor mode planning doc workflow and live patch/hot-reload updates.
- Resume/cancel/retry flows and reconciliation jobs.

### Definition of Done
- [ ] User can create/fork game and complete planning-doc loop before execution begins.
- [ ] Agent run streams progress and file patch events live to editor over WebSocket.
- [ ] Run survives disconnect/reconnect and can resume from checkpoint.
- [ ] Billing uses reservation + step settlement with deterministic ledger records.
- [ ] `Free / Standard / Pro` model routing works from server config.
- [ ] End-to-end run can produce and publish updated game definition + pack metadata in R2.

### Must Have
- Durable Object based run coordination with ordered event stream.
- Idempotent step execution + idempotent billing writes.
- Immutable run-versioned R2 artifacts, publish-by-pointer.
- Polling fallback for run status if socket unavailable.

### Must NOT Have (Guardrails)
- No client-supplied API keys for AI execution.
- No client-side authoritative billing or settlement.
- No v1 multi-user collaborative editing semantics.
- No custom model training/fine-tuning in v1.
- No unmanaged long-running in single HTTP request loops.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> All verification is agent-executed. No manual user testing steps.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after
- **Framework**: existing project test stack (TypeScript test suites under `api/src/**/__tests__`, `app/**/__tests__`)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)
Each task below includes detailed agent-run scenarios (happy + error paths) with concrete tools, assertions, and evidence.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
- Task 1 (Data model)
- Task 2 (Config + model routing skeleton)

Wave 2 (After Wave 1):
- Task 3 (Durable Object run coordinator)
- Task 4 (Billing reservation/settlement)

Wave 3 (After Wave 2):
- Task 5 (Execution engine + tool policy)
- Task 6 (WebSocket event protocol + fallback polling)

Wave 4 (After Wave 3):
- Task 7 (Editor planning-doc loop + run controls)
- Task 8 (Artifact versioning + publish pointers)

Wave 5 (After Wave 4):
- Task 9 (Resumability/recovery/reconciliation)
- Task 10 (Integration tests + observability + rollout flags)

Critical Path: 1 -> 3 -> 4 -> 6 -> 7 -> 10

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 3,4,9,10 | 2 |
| 2 | None | 5 | 1 |
| 3 | 1 | 5,6,7,9 | 4 |
| 4 | 1,3 | 7,9,10 | 3 |
| 5 | 2,3 | 8,10 | 6 |
| 6 | 3 | 7,10 | 5 |
| 7 | 4,6 | 10 | 8 |
| 8 | 5 | 9,10 | 7 |
| 9 | 1,3,4,8 | 10 | None |
| 10 | 1-9 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1,2 | `delegate_task(category="unspecified-high", load_skills=["writing-plans"])` |
| 2 | 3,4 | `delegate_task(category="deep", load_skills=["systematic-debugging"])` |
| 3 | 5,6 | `delegate_task(category="deep", load_skills=["context7-auto-research"])` |
| 4 | 7,8 | `delegate_task(category="visual-engineering", load_skills=["frontend-ui-ux"])` |
| 5 | 9,10 | `delegate_task(category="unspecified-high", load_skills=["verification-before-completion"])` |

---

## TODOs

- [ ] 1. Create Agent Run Data Model (DB + types)

  **What to do**:
  - Add tables for `agent_runs`, `agent_steps`, `agent_events`, `agent_checkpoints`, `agent_costs`.
  - Add state enums and indexes for run lookup, user lookup, active run lookup, and idempotency.
  - Extend shared types/schemas for run state and event payload contracts.

  **Must NOT do**:
  - Do not mutate existing `generation_jobs` semantics.
  - Do not introduce ambiguous status strings without enum constraints.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: schema + contracts + migration impact.
  - **Skills**: `writing-plans`, `verification-before-completion`
    - `writing-plans`: structure and dependency clarity.
    - `verification-before-completion`: verification-first criteria.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: 3,4,9,10
  - **Blocked By**: None

  **References**:
  - `api/schema.sql` - existing job/task schema style and index patterns.
  - `shared/src/schema/economy.ts` - table typing conventions.
  - `shared/src/types/asset-system.ts` - status/event-oriented type shape patterns.

  **Acceptance Criteria**:
  - [ ] New tables compile in schema migration flow.
  - [ ] Enforced enum-like status constraints and idempotency keys present.
  - [ ] Query paths for run list, active run, step list, and event replay are indexed.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Run table lifecycle happy path
    Tool: Bash (sqlite/D1 local test command)
    Preconditions: test DB initialized
    Steps:
      1. Insert run with status "queued"
      2. Insert step records with ordered indexes
      3. Update run status to "running" then "succeeded"
      4. Query by user_id + created_at desc
      5. Assert returned status history and row counts
    Expected Result: lifecycle writes succeed and indexed reads return deterministic ordering
    Failure Indicators: missing indexes, invalid status acceptance, inconsistent step order
    Evidence: .sisyphus/evidence/task-1-db-lifecycle.txt

  Scenario: Idempotency guard
    Tool: Bash
    Preconditions: same idempotency key used twice
    Steps:
      1. Insert cost/step settlement record with idempotency_key K
      2. Re-insert with same K
      3. Assert duplicate is rejected or no-op
    Expected Result: no double-application
    Evidence: .sisyphus/evidence/task-1-idempotency.txt
  ```

- [ ] 2. Implement Tiered Model Routing Config (`Free/Standard/Pro`)

  **What to do**:
  - Add server-side model tier config mapping (provider + model + fallback chain + max budget hints).
  - Add API contract for selecting tier per run with policy validation.
  - Add default fallback policy for provider outage.

  **Must NOT do**:
  - Do not hardcode tier choice in client.
  - Do not allow arbitrary model IDs from untrusted client input.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `context7-auto-research`, `writing-plans`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: 5
  - **Blocked By**: None

  **References**:
  - `api/src/ai/game/generator.ts` - existing provider selection patterns.
  - `api/package.json` - installed AI SDK/provider packages.

  **Acceptance Criteria**:
  - [ ] Tier enum accepted: `free | standard | pro`.
  - [ ] Server config resolves to deterministic provider/model chain.
  - [ ] Invalid tier or model override is rejected with typed error.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Tier resolution happy path
    Tool: Bash (API test command)
    Preconditions: test env has provider keys
    Steps:
      1. Create run with tier="free"
      2. Assert selected model metadata equals configured free profile
      3. Repeat for standard and pro
    Expected Result: each tier maps to expected model chain
    Evidence: .sisyphus/evidence/task-2-tier-routing.txt

  Scenario: Invalid override rejected
    Tool: Bash
    Preconditions: request includes disallowed model id
    Steps:
      1. POST run start with modelOverride="unknown/x"
      2. Assert 4xx response and machine-readable error code
    Expected Result: request denied before any billing hold
    Evidence: .sisyphus/evidence/task-2-invalid-override.txt
  ```

- [ ] 3. Build Durable Object Run Coordinator + WebSocket Session Protocol

  **What to do**:
  - Implement DO per run (or per game active run) as authoritative run state coordinator.
  - Add ordered event sequence numbers and replay window on reconnect.
  - Support control messages: `pause`, `resume`, `cancel`, `approve_checkpoint`, `request_snapshot`.

  **Must NOT do**:
  - Do not allow run mutation from multiple concurrent coordinators.
  - Do not emit non-ordered events.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `systematic-debugging`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: 5,6,7,9
  - **Blocked By**: 1

  **References**:
  - `api/src/index.ts` - API entrypoint for adding transport routes.
  - `app/components/editor/AssetGallery/useAssetGeneration.ts` - current progress polling behavior to replace/augment.

  **Acceptance Criteria**:
  - [ ] Client receives monotonically increasing event sequence IDs.
  - [ ] Reconnect with last sequence ID replays missing events only.
  - [ ] Pause/resume/cancel controls change run state atomically.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Reconnect replay correctness
    Tool: Bash + websocket client script
    Preconditions: active run producing events
    Steps:
      1. Connect ws, receive seq 1..15
      2. Disconnect at seq 15
      3. Let run emit seq 16..25
      4. Reconnect with lastSeq=15
      5. Assert replay delivers 16..25 exactly once
    Expected Result: no gaps, no duplicates
    Evidence: .sisyphus/evidence/task-3-replay.txt

  Scenario: Duplicate coordinator prevention
    Tool: Bash
    Preconditions: two start requests race for same run id
    Steps:
      1. Fire two simultaneous start messages
      2. Assert only one coordinator becomes active
      3. Assert loser gets deterministic conflict response
    Expected Result: single writer guarantee
    Evidence: .sisyphus/evidence/task-3-single-writer.txt
  ```

- [ ] 4. Extend Spark Billing: Reservation + Step Settlement + Final Reconcile

  **What to do**:
  - Add `agent_reservation_hold`, `agent_step_settlement`, `agent_reservation_release` transaction types.
  - Reserve estimated max Sparks before run starts.
  - Commit per completed billable step; release remainder on completion/failure/cancel.
  - Add settlement idempotency and periodic reconciliation checks.

  **Must NOT do**:
  - Do not double-debit on retries.
  - Do not settle steps that failed before billable execution point.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `verification-before-completion`, `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: 7,9,10
  - **Blocked By**: 1,3

  **References**:
  - `api/src/economy/wallet-service.ts` - atomic debit/credit and idempotency patterns.
  - `api/src/economy/pricing.ts` - Spark conversion and unit costs.
  - `api/src/economy/cost-estimator.ts` - estimate generation and UI display model.
  - `api/src/trpc/routes/asset-system.ts` - debit/refund flow and idempotency key patterns.

  **Acceptance Criteria**:
  - [ ] Run start fails when reserve cannot be held.
  - [ ] Completed steps settle exactly once each.
  - [ ] Final release returns unspent reserve and matches ledger arithmetic.
  - [ ] Reconciliation job reports mismatches with deterministic run IDs.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Reserve and settle happy path
    Tool: Bash (API integration test)
    Preconditions: user wallet has 1000 Sparks
    Steps:
      1. Start run with estimated max=500
      2. Assert hold transaction created and available balance reduced by 500
      3. Simulate 3 completed steps totaling 320
      4. Finalize run
      5. Assert net spent=320 and 180 released
    Expected Result: reserve-max/settle-actual arithmetic correct
    Evidence: .sisyphus/evidence/task-4-settlement-happy.txt

  Scenario: Step retry no double charge
    Tool: Bash
    Preconditions: step settlement idempotency key reused
    Steps:
      1. Apply same step settlement twice
      2. Assert wallet lifetime spent increments once
    Expected Result: no duplicate billing
    Evidence: .sisyphus/evidence/task-4-idempotent-step.txt
  ```

- [ ] 5. Implement Execution Engine (Planning -> Build -> Refine -> Theme -> Asset)

  **What to do**:
  - Build agent execution graph with explicit stages and checkpoints.
  - Integrate Vercel AI SDK tool loop with constrained tools (read/write game artifacts, validate schema, run checks, search docs).
  - Add stage-level retry policies and stop conditions.

  **Must NOT do**:
  - Do not grant unrestricted file/command execution.
  - Do not bypass schema validation before stage handoff.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `context7-auto-research`, `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 6)
  - **Blocks**: 8,10
  - **Blocked By**: 2,3

  **References**:
  - `api/src/ai/pipeline/executor.ts` - existing stage orchestrator shape.
  - `api/src/ai/pipeline/registry.ts` - pipeline registration pattern.
  - `api/src/ai/pipeline/theme-planner.ts` - planning stage precedent.
  - `api/src/ai/game/generator.ts` - structured generation + validation precedent.
  - `shared/src/types/GameDefinition.ts` - game contract.
  - `shared/src/types/schemas.ts` - schema validation contracts.

  **Acceptance Criteria**:
  - [ ] Engine executes stages in configured order with checkpoint boundaries.
  - [ ] Stage output validated against schema before next stage.
  - [ ] Execution emits deterministic stage events and failure reasons.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Full staged run success
    Tool: Bash
    Preconditions: test prompt and seed game available
    Steps:
      1. Trigger run for scratch game prompt
      2. Assert events: planning_completed -> build_completed -> refine_completed -> theme_completed -> asset_completed
      3. Assert final artifact pointer published
    Expected Result: complete stage chain success
    Evidence: .sisyphus/evidence/task-5-stage-chain.txt

  Scenario: Invalid schema halts chain
    Tool: Bash
    Preconditions: inject malformed stage output
    Steps:
      1. Force build stage to output invalid GameDefinition
      2. Assert refine stage never starts
      3. Assert run state=failed with validation error code
    Expected Result: safe fail-fast behavior
    Evidence: .sisyphus/evidence/task-5-schema-fail.txt
  ```

- [ ] 6. Add Realtime Run APIs (WebSocket + Poll Fallback + Snapshot)

  **What to do**:
  - Add APIs for: create run, connect stream, fetch snapshot, poll status fallback.
  - Expose deterministic event payloads for run/step/artifact changes.
  - Add heartbeat + stale session handling.

  **Must NOT do**:
  - Do not rely solely on socket for critical state retrieval.
  - Do not send oversized diff payloads without chunking/limits.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `verification-before-completion`, `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 5)
  - **Blocks**: 7,10
  - **Blocked By**: 3

  **References**:
  - `api/src/trpc/routes/asset-system.ts` - getJob + processJob patterns.
  - `app/components/editor/AssetGallery/useAssetGeneration.ts` - polling fallback baseline.

  **Acceptance Criteria**:
  - [ ] Stream endpoint provides ordered events and snapshot bootstrap.
  - [ ] Poll endpoint returns same authoritative run state shape.
  - [ ] Socket loss auto-falls back to poll mode in client integration.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Stream then poll fallback
    Tool: Bash + websocket client + HTTP client
    Preconditions: active run
    Steps:
      1. Connect ws and confirm event receipt
      2. Simulate ws disconnect
      3. Poll snapshot endpoint every 2s
      4. Assert polled state reaches same final status as stream would
    Expected Result: no progress loss when stream drops
    Evidence: .sisyphus/evidence/task-6-fallback.txt

  Scenario: Snapshot consistency
    Tool: Bash
    Preconditions: run at mid-stage
    Steps:
      1. Get snapshot
      2. Compare with latest event-applied client state
      3. Assert same run status, active step, and latest artifact pointer
    Expected Result: snapshot canonical consistency
    Evidence: .sisyphus/evidence/task-6-snapshot-consistency.txt
  ```

- [ ] 7. Build Editor Planning-Doc Loop + Run Controls

  **What to do**:
  - Add planning doc UI flow in editor mode (iterative Q/A, plan refine, approval gate).
  - Add run control UX (`start`, `pause`, `resume`, `cancel`, `approve checkpoint`).
  - Surface estimated Spark cost range before start and settled spend after completion.

  **Must NOT do**:
  - Do not start execution before explicit plan approval.
  - Do not hide current wallet shortfall when reserve cannot be held.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 8)
  - **Blocks**: 10
  - **Blocked By**: 4,6

  **References**:
  - `app/app/editor/[id].tsx` - editor route and shell.
  - `app/components/editor/EditorProvider.tsx` - editor state update patterns.
  - `app/components/editor/EditorTopBar.tsx` - action initiation flow.
  - `app/components/economy/CostPreview.tsx` - cost UX baseline.
  - `app/components/economy/InsufficientBalanceModal.tsx` - insufficient-funds UX.

  **Acceptance Criteria**:
  - [ ] User can iterate planning doc and explicitly approve before run start.
  - [ ] User sees tier selection and cost estimate before reserve.
  - [ ] Live run controls and status updates are reflected in UI within 2s.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Planning approval gate
    Tool: Playwright
    Preconditions: editor page loaded, authenticated user
    Steps:
      1. Navigate to /editor/{id}
      2. Open AI editing panel
      3. Enter prompt: "physics puzzle with 3 mechanics"
      4. Assert planning doc appears with editable sections
      5. Attempt start without approval
      6. Assert blocked with message "Approve plan first"
      7. Click Approve Plan then Start Run
      8. Assert run status badge shows "Running"
      9. Screenshot: .sisyphus/evidence/task-7-planning-gate.png
    Expected Result: execution gated by explicit approval
    Evidence: .sisyphus/evidence/task-7-planning-gate.png

  Scenario: Insufficient reserve handling
    Tool: Playwright
    Preconditions: low wallet balance test account
    Steps:
      1. Choose tier=pro
      2. Click Start Run
      3. Assert insufficient modal appears with exact shortfall
      4. Assert no run created (no running badge)
      5. Screenshot: .sisyphus/evidence/task-7-insufficient.png
    Expected Result: clear block before run start
    Evidence: .sisyphus/evidence/task-7-insufficient.png
  ```

- [ ] 8. Implement Artifact Versioning + Publish Pointer Promotion

  **What to do**:
  - Store intermediate artifacts under run-versioned keys.
  - Keep active game pointer separate from intermediate outputs.
  - Promote pointer only after checkpoint acceptance.

  **Must NOT do**:
  - Do not overwrite active definition during intermediate stages.
  - Do not lose historical run artifacts.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-before-completion`, `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 7)
  - **Blocks**: 9,10
  - **Blocked By**: 5

  **References**:
  - `api/src/trpc/routes/games.ts` - current definition read/write to R2 patterns.
  - `shared/src/utils/definition-resolver.ts` - definition/asset resolution path assumptions.
  - `shared/src/utils/asset-url.ts` - key pattern conventions.

  **Acceptance Criteria**:
  - [ ] Intermediate run artifacts are immutable and traceable by run ID.
  - [ ] Publish action atomically updates active pointer.
  - [ ] Rollback to previous pointer is possible.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Promote pointer after checkpoint
    Tool: Bash
    Preconditions: run has generated staged artifacts
    Steps:
      1. Confirm active pointer references old definition
      2. Approve checkpoint event
      3. Assert active pointer now references run artifact key
      4. Assert previous version still retrievable
    Expected Result: atomic promotion, immutable history
    Evidence: .sisyphus/evidence/task-8-publish-pointer.txt

  Scenario: Failed stage does not mutate active game
    Tool: Bash
    Preconditions: induced failure in refine stage
    Steps:
      1. Run generation until failure
      2. Fetch active pointer
      3. Assert pointer unchanged
    Expected Result: active game unaffected by failed run
    Evidence: .sisyphus/evidence/task-8-fail-safe.txt
  ```

- [ ] 9. Add Resume/Recovery/Reconciliation Flows

  **What to do**:
  - Implement checkpoint resume from last successful step.
  - Add dead-run recovery and stuck-run timeout policy.
  - Add reconciliation process for billing drift and run/event mismatch.

  **Must NOT do**:
  - Do not rerun already-settled successful steps on resume.
  - Do not silently drop unreconciled cost mismatches.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `systematic-debugging`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5
  - **Blocks**: 10
  - **Blocked By**: 1,3,4,8

  **References**:
  - `api/src/ai/providers/scenario/client.ts` - provider polling/retry failure patterns.
  - `api/src/trpc/routes/asset-system.ts` - retry/reset job behavior reference.

  **Acceptance Criteria**:
  - [ ] Resume starts from checkpointed step, not from run start.
  - [ ] Recovered run preserves settlement integrity.
  - [ ] Reconciliation report identifies and flags all mismatches.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Resume after coordinator restart
    Tool: Bash
    Preconditions: run paused at step 3/5, checkpoint stored
    Steps:
      1. Simulate coordinator restart
      2. Call resume API
      3. Assert resumed step index=3
      4. Assert step 1-2 not re-settled
    Expected Result: precise continuation without double billing
    Evidence: .sisyphus/evidence/task-9-resume.txt

  Scenario: Billing drift detection
    Tool: Bash
    Preconditions: inject mismatch between ledger and agent_costs
    Steps:
      1. Run reconciliation command
      2. Assert mismatch row appears with run_id and delta
      3. Assert alert event emitted
    Expected Result: drift is detectable and actionable
    Evidence: .sisyphus/evidence/task-9-reconcile.txt
  ```

- [ ] 10. End-to-End Validation, Metrics, and Feature-Flagged Rollout

  **What to do**:
  - Add integration tests for full run lifecycle, reconnect, cancellation, and settlement.
  - Add metrics/logging for run latency, step failures, reconnect success, and billing deltas.
  - Add feature flags for controlled rollout by user cohort.

  **Must NOT do**:
  - Do not roll out globally without guardrails and dashboards.
  - Do not ship without negative-path e2e coverage.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-before-completion`, `requesting-code-review`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 final
  - **Blocks**: None
  - **Blocked By**: 1-9

  **References**:
  - `api/src/trpc/routes/games.test.ts` - API integration test style.
  - `api/src/economy/__tests__/wallet-service.test.ts` - billing correctness assertions.
  - `app/components/editor/AssetGallery/useAssetGeneration.ts` - client update expectations baseline.

  **Acceptance Criteria**:
  - [ ] Full lifecycle e2e passes (plan -> run -> publish -> settlement).
  - [ ] Reconnect e2e passes with event replay.
  - [ ] Billing e2e passes for success, partial failure, cancellation.
  - [ ] Feature flag can disable AI editing safely.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Full lifecycle E2E
    Tool: Bash + Playwright
    Preconditions: feature flag enabled for test user
    Steps:
      1. Create/fork game
      2. Complete planning loop approval
      3. Start run and wait for completion
      4. Assert editor reflects published artifact
      5. Assert wallet ledger contains hold + settlements + release
      6. Screenshot: .sisyphus/evidence/task-10-e2e.png
    Expected Result: end-to-end flow completes with consistent state
    Evidence: .sisyphus/evidence/task-10-e2e.png

  Scenario: Cancel mid-run settles correctly
    Tool: Bash
    Preconditions: active run with two completed steps
    Steps:
      1. Send cancel control
      2. Assert run status=canceled
      3. Assert completed steps settled, pending reserve released
    Expected Result: step-based partial settlement
    Evidence: .sisyphus/evidence/task-10-cancel-billing.txt
  ```

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1-2 | `feat(api): add agent-run schema and tier routing config` | schema + config + shared types | API tests + typecheck |
| 3-4 | `feat(api): add run coordinator and spark reservation settlement` | DO + economy + routes | integration tests |
| 5-6 | `feat(api): add staged execution engine and realtime run APIs` | ai engine + routes | integration + reconnect tests |
| 7-8 | `feat(app): add planning loop UI and artifact publish workflow` | editor UI + data hooks | Playwright scenarios |
| 9-10 | `test(obs): add resume/reconcile e2e and rollout guardrails` | tests + metrics + flags | full e2e suite |

---

## Success Criteria

### Verification Commands
```bash
pnpm --filter api test
pnpm --filter app test
pnpm --filter api typecheck
pnpm --filter app typecheck
```

### Final Checklist
- [ ] All must-have capabilities implemented.
- [ ] All guardrails enforced (billing idempotency, run idempotency, no premature publish).
- [ ] WebSocket reconnect + poll fallback both verified.
- [ ] Settlement arithmetic verified for success, partial failure, and cancel.
- [ ] Feature flag rollout path validated.
