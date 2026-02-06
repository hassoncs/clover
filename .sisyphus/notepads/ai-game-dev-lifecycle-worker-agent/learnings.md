# Learnings

## 2026-02-06 Session Start
- Plan: ai-game-dev-lifecycle-worker-agent
- Session: ses_3ce57e14affeu4aABjSgnlFAj1

## Task 1: Agent Run Data Model (Completed)

### Schema Design Patterns
- All tables use `TEXT PRIMARY KEY` for IDs (UUIDs)
- All timestamps use `INTEGER NOT NULL` for epoch milliseconds
- Status enums enforced via SQL `CHECK` constraints
- Idempotency via `UNIQUE` index on `idempotency_key` columns
- Partial indexes on status columns for active records only (WHERE status IN (...))
- Composite unique indexes for natural keys (e.g., `run_id + step_index`)
- Foreign keys with `ON DELETE CASCADE` for child tables

### Drizzle ORM Patterns
- Import from `drizzle-orm/sqlite-core`: `sqliteTable`, `text`, `integer`, `uniqueIndex`, `index`
- Use `createInsertSchema` and `createSelectSchema` from `drizzle-zod` for type generation
- Export both Zod schemas and inferred TypeScript types
- Reference foreign keys via `references(() => parentTable.column, { onDelete: 'cascade' })`
- Define indexes in second parameter callback: `(table) => ({ indexName: index('idx_name').on(table.column) })`

### TypeScript Type Patterns
- Define status/enum types as Zod schemas first: `z.enum(['value1', 'value2'])`
- Infer TypeScript types from Zod schemas: `type Status = z.infer<typeof StatusSchema>`
- Use discriminated unions for event payloads: `z.discriminatedUnion('type', [...])`
- Optional nullable fields: `.optional().nullable()` in Zod

### Monetary Values
- All costs in MICRODOLLARS (1,000,000 = $1.00)
- 1 Spark = 10,000 microdollars
- Use `INTEGER` type for all monetary columns with `_micros` suffix

### Test Database Setup
- Test schema in `api/src/__fixtures__/test-utils.ts` must mirror production schema
- Simplified indexes in test schema (no partial indexes)
- Must include all new tables for tests to pass

### Files Modified
- `api/schema.sql` - Appended 5 new tables (92 lines)
- `shared/src/schema/agent-runs.ts` - New Drizzle schema (113 lines)
- `shared/src/types/agent-run.ts` - New TypeScript types (177 lines)
- `shared/src/schema/index.ts` - Added barrel export
- `shared/src/types/index.ts` - Added barrel export
- `api/src/__fixtures__/test-utils.ts` - Added test schema tables

### Table Summary
1. `agent_runs` - Top-level orchestration (18 columns)
2. `agent_steps` - Individual stages (11 columns)
3. `agent_events` - Event stream (6 columns)
4. `agent_checkpoints` - Resumable state (6 columns)
5. `agent_costs` - LLM cost tracking (10 columns)


## Tiered Model Routing (Wave 1, Task 2)
- Implemented static tiered model routing in `api/src/ai/agent/tier-config.ts`.
- Tiers: `free`, `standard`, `pro`.
- Uses OpenRouter as primary provider for all tiers with realistic model placeholders.
- `pro` tier uses `anthropic/claude-sonnet-4-20250514` as requested.
- Cost estimation uses microdollars (1,000,000 = $1.00) and converts to Sparks (1 Spark = 10,000 micros).
- Model creation helper `createModelForTier` handles provider-specific configuration (OpenAI, OpenRouter, Anthropic).

## Task 3: Durable Object Run Coordinator + Step Worker (Completed)

### Realtime Durable Object Patterns
- Coordinator DO should be the single-writer authority for run state, event sequence, and control command dedupe.
- DO WebSocket handling should use `this.ctx.acceptWebSocket(server)` (hibernation-compatible), not `server.accept()`.
- Reconnect replay works cleanly with durable event keys using zero-padded sequence (`event:000000000123`) and replay from `lastSeq + 1`.
- Keep replay window bounded (last 1000 events) by pruning older durable event records after each emit.
- Control command dedupe must be durable (`control:{commandId}` in DO storage), not in-memory.

### Execution + Recovery Patterns
- Kick off background step execution via `ctx.waitUntil(this.dispatchNextStep())` on start/resume so WS handshake remains responsive.
- Track lease heartbeat fields in durable state (`heartbeatAt`, `leaseExpiresAt`) and set alarm on run start and heartbeat refresh.
- Alarm handler should validate lease expiry and trigger recovery dispatch for stalled runs.
- Split coordinator/worker responsibilities: worker persists per-step checkpoints/costs, coordinator applies ordered run transitions/events.

## Agent Billing Lifecycle (Wave 1, Task 5)
- Added wallet transaction types for reserve/settle/release lifecycle: `agent_reservation_hold`, `agent_step_settlement`, `agent_reservation_release`.
- Reservation uses wallet debit idempotency key `agent-reserve:{runId}` and stores hold amount in `agent_runs.reserved_micros`.
- Step settlement idempotency key `agent-step-settle:{runId}:{stepIndex}` only writes to `agent_costs`, `agent_runs.actual_cost_micros`, and `agent_steps.cost_micros` (no wallet transaction).
- Finalization idempotency key `agent-release:{runId}` credits back unspent reservation and zeroes `agent_runs.reserved_micros`.
- For run billing writes, use `db.batch([...])` whenever multiple statements are applied as one logical unit.

## Task: Agent Execution Engine (Wave 1)
- Durable step worker now resolves stage prerequisites from deterministic R2 paths (`agent-runs/{runId}/steps/{stepIndex}/{stage}/output.*`) instead of in-memory-only context.
- Stage boundaries persist explicit checkpoint payloads in R2 (`.../{stage}/checkpoint.json`) and structured output artifacts (`output.md` or `output.json`).
- Build and refine stages perform schema and validator checks with failure-union returns (`VALIDATION_FAILED`) rather than throwing, which keeps coordinator failure handling deterministic.
- Coordinator step dispatch now hydrates worker context from D1 (`agent_runs` + `games`) so tier and prompt context travel with each step request.
- Asset stage can invoke the existing pipeline executor directly through workers adapters and reports partial failures as deterministic `ASSET_PIPELINE_FAILED` reasons.

## Task 5: Staged Execution Engine (In Progress)

### Engine Architecture
- Added stage engine module under `api/src/agent/engine` with `prompts.ts`, `tools.ts`, `stages.ts`, `stage-executor.ts`, and barrel export.
- `StageExecutor` now runs a single stage with retries (max 3), calls `generateText` with tool calling, validates stage outputs, and returns deterministic failure reasons (`STAGE_VALIDATION_FAILED`, `STAGE_GENERATION_ERROR`, `STAGE_EXECUTION_FAILED`).
- Added pipeline support via `executePipeline` over `planning -> build -> refine -> theme -> asset` stage order.
- Usage token extraction handles both AI SDK naming variants (`promptTokens/completionTokens` and `inputTokens/outputTokens`).

### Tooling Pattern
- Stage tools are context-backed and in-memory only for now (no R2): `readGameDefinition`, `writeGameDefinition`, `validateGameDefinition`, `readPlanningDoc`, `updatePlanningDoc`, `listTemplates`, `searchExistingGames`.
- `writeGameDefinition` enforces both schema validation (`GameDefinitionSchema`) and semantic validation (`validateGameDefinition`) before mutating context.
- Stage configs are static definitions with injected toolsets at runtime to keep the pipeline deterministic while allowing per-run context.

### Worker Integration
- `RunStepWorkerDO` now constructs tier model using `resolveTierConfig` + `createModelForTier`, executes stage via `StageExecutor`, persists in-memory execution context between steps in DO storage, and records checkpoint metadata with progress events, attempts, validation output, and token usage.
- Step result payload now includes deterministic error message format and provider/model derived from tier config.
- Worker now catches execution failures and always reports a failed `step_result` back to coordinator.

### Verification Notes
- Ran `pnpm --filter @slopcade/api type-check` after implementation.
- Added `api/src/ai/agent/stages.ts` barrel and fixed typing issues in existing stage files (`refine.ts`, `theme.ts`) so API type-check stays green while introducing the new engine.

## Task 5 Follow-up: RunStepWorkerDO File Recovery
- Recreated `api/src/agent/RunStepWorkerDO.ts` with a Durable Object step worker implementation that executes a single stage through `StageExecutor`.
- Worker receives `RunStepRequest`, restores/persists execution context in DO storage (`engine:state`), writes per-step checkpoint and cost records, and posts `RunStepResult` back to coordinator at `/internal/step-result`.
- Failure reason mapping added from stage-engine failure codes to agent run failure enums (`VALIDATION_FAILED`, `MODEL_ERROR`, `UNKNOWN`) for deterministic coordinator handling.
- Verified missing-import/typecheck failure is resolved with `pnpm --filter api exec tsc --noEmit`.

## Task 9: Agent Run tRPC Lifecycle Surface
- Route contract now uses `agentRuns.create/start/get/getSnapshot/list/cancel/getCostSummary` and a `stream` query for snapshot bootstrap + ordered replay.
- Use `nanoid()` for `agent_runs.id`, `agent_steps.id`, control `commandId`, and manually appended fallback event IDs.
- `create` flow: validate tier via `resolveTierConfig`, estimate with `estimateRunCost`, branch by source (`scratch` creates a new game row, `fork` validates source visibility), insert run in `planning`, pre-seed all 5 stage rows as `queued`.
- `start` flow: enforce owner + status gate (`planning|queued`), reserve budget through `AgentBillingService.reserveBudget`, persist `queued`, then forward to coordinator DO `/internal/start`.
- Poll fallback shape is standardized around `{ run, snapshot, steps, events }` where latest events are returned in ascending `seq` order even when fetched as `DESC LIMIT 50`.
- Snapshot bootstrap first tries coordinator DO (`/internal/snapshot`) and degrades to D1-derived snapshot when unavailable, while replay events come from D1 `agent_events`.

## Task 6: tRPC Agent Run Lifecycle Routes (Completed)
- Added `api/src/trpc/routes/agent-runs.ts` with authenticated procedures: `createRun`, `getRun`, `listRuns`, `updatePlanningDoc`, `startRun`, `pollRunStatus`, `getRunSnapshot`.
- `createRun` validates tier with `resolveTierConfig`, estimates cost via `estimateRunCost`, creates `agent_runs` row in `planning`, and seeds 5 queued `agent_steps` rows.
- Ownership checks follow existing protected route pattern (`user_id` filter + NOT_FOUND for missing/unauthorized).
- Poll fallback reads `agent_runs` + incremental `agent_events (seq > lastSeq)` and returns status payload aligned with snapshot fields used by realtime flow.
- `startRun` uses `AgentBillingService.reserveBudget(...)`, moves run to `queued`, and triggers coordinator DO `/internal/start` using `ctx.env.RUN_COORDINATOR.idFromName(runId)`.

## Task 6 Retry: agent-runs route file persistence
- Rewrote `api/src/trpc/routes/agent-runs.ts` with required procedure names so `api/src/trpc/router.ts` import resolves.
- `pnpm --filter api exec tsc --noEmit` no longer reports `./routes/agent-runs` missing; remaining failures are unrelated missing worker DO module imports.

## Task 7: Artifact Versioning and Publish Pointer Promotion (Completed)

### ArtifactService Design
- Created `api/src/agent/artifact-service.ts` with versioned R2 artifact storage and pointer promotion.
- Run artifacts stored under immutable keys: `agent-runs/{runId}/steps/{stepIndex}/{filename}`.
- Active game definition stored at: `games/{gameId}/definition.json` (matches existing pattern).
- Previous version backup stored at: `agent-runs/{runId}/previous-definition.json` before promotion.

### Key Methods
- `storeStepArtifact`: Write intermediate artifact to run-versioned R2 key.
- `readStepArtifact`: Read artifact from run-versioned key.
- `readActiveDefinition`: Read current active game definition.
- `publishToActive`: Atomically promote run artifact to active pointer (backs up previous version first).
- `rollbackToVersion`: Restore previous version from backup key.
- `listRunArtifacts`: List all artifacts for a run.

### Engine Tools Integration
- Updated `createStageTools` to accept optional `artifactService` in context.
- Added `gameId` to `StageExecutionContext` for publish operations.
- `readGameDefinition` now supports three sources: `context` (in-memory), `active` (current game pointer), `step` (run-versioned artifact).
- `writeGameDefinition` now persists to R2 via `storeStepArtifact` in addition to updating in-memory context.
- Added new `publishGameDefinition` tool that calls `publishToActive` to promote step artifact to active game pointer.

### Immutability and Atomicity
- Run artifacts are never overwritten — each step writes to its own versioned path.
- Publish operation is atomic: backs up old active key before copying new artifact.
- Previous version backup enables rollback without data loss.
- All R2 operations use proper content-type headers (`application/json` for definitions).

### Files Modified
- `api/src/agent/artifact-service.ts` — New service (135 lines)
- `api/src/agent/engine/tools.ts` — Updated tools to use ArtifactService (added R2 read/write support)

### Verification
- Ran `pnpm --filter @slopcade/api exec tsc --noEmit` — passes cleanly.

## Task: Artifact Versioning + Publish Pointer Promotion
- Added `ArtifactManager` at `api/src/ai/agent/artifact-manager.ts` to centralize R2 key conventions for active (`games/{gameId}/definition.json`), archived versions (`games/{gameId}/versions/{versionId}/definition.json`), and run-final artifacts (`agent-runs/{runId}/final/definition.json`).
- Publish flow should validate the final run artifact twice before promotion: schema parse (`GameDefinitionSchema.safeParse`) then semantic validator (`validateGameDefinition`) to prevent invalid pointers.
- Safe promotion pattern: archive current active definition first, then write new active pointer, then update `games` table validation metadata (`validation_report`, score/counts, `validation_updated_at`, `validator_version`).
- Rollback flow mirrors publish guardrails: load archived version by `versionId`, re-validate, archive current active pointer, repoint active definition, then refresh game metadata from restored definition.
- `agent-runs` router now exposes explicit artifact lifecycle procedures: `publish`, `getVersionHistory`, and `rollbackPublishedDefinition`.

## Task 8: Editor Planning-Doc Loop and Run Controls UI (Completed)

### UI Components
- Created `AIRunPanel` component with prompt input, tier selection, planning doc editor, and run controls.
- Implemented `useAgentRun` hook for managing run lifecycle (create, start, poll, cancel).
- Added "✨ AI" button to `EditorTopBar` to toggle the panel.
- Integrated `AIRunPanelHost` into `EditorScreen` via `EditorProvider` state.

### State Management
- `EditorProvider` manages panel visibility state (`showAIRunPanel`).
- `useAgentRun` hook handles polling logic with `setInterval` and cleanup.
- Run status (`idle`, `planning`, `running`, `succeeded`, `failed`, `canceled`) drives UI state.

### Cost & Billing
- Tier configuration (`free`, `standard`, `pro`) with cost estimates in Sparks.
- `InsufficientBalanceModal` integration for balance checks before run creation.
- Real-time progress tracking with visual stage indicators.

### Verification
- `pnpm tsc --noEmit` passed cleanly.
- Followed existing patterns for styling (NativeWind) and component structure.

## Task 8: Editor UI Implementation (Completed)

### WebSocket Integration
- The `useAgentRun` hook manages WebSocket connections to `/ws/agent-run/:runId`.
- It handles reconnection logic and event replay using `lastSeq`.
- Control commands (pause, resume, cancel) are sent via WebSocket messages, not tRPC mutations.
- The hook exposes a unified state object that merges initial tRPC data with live WebSocket updates.

### Component Structure
- `AIEditorPanel`: Main container, handles state and layout.
- `PlanningDocEditor`: Text input for the planning document (editable in planning stage).
- `RunControls`: Buttons for start, pause, resume, cancel.
- `RunProgress`: Visual progress bar and stage indicators.
- `CostDisplay`: Shows estimated and actual costs.
- `TierSelector`: Allows selecting the model tier (Free, Standard, Pro).

### Integration
- The panel is hosted in `AIRunPanelHost`, which is toggled via `EditorProvider`.
- It replaces the previous `AIRunPanel` implementation.
- The UI is designed to be responsive and fit within the editor's layout.

### Key Decisions
- Used a single hook `useAgentRun` to encapsulate all run logic.
- Separated UI components for better maintainability.
- Used `trpcReact` for data fetching and mutations where appropriate (create, start, update doc).
- Used WebSocket for real-time updates and control commands to ensure low latency and immediate feedback.

## Task 9: Resume, Recovery, and Reconciliation (Completed)

### RecoveryService patterns
- Added `api/src/agent/recovery-service.ts` as the single read-only recovery/reconciliation service layer over D1 + billing idempotency.
- Last resume checkpoint should be selected from `agent_checkpoints` ordered by `step_index DESC, created_at DESC`, filtered to successful states (`state_json.status === 'succeeded'`).
- Settled-step detection is safest when combining `agent_costs.step_id -> agent_steps.step_index` with fallback parsing of idempotency keys (`agent-step-settle:{runId}:{stepIndex}`).
- Billing reconciliation should compare two deltas only: `(SUM(agent_costs.cost_micros) - agent_runs.actual_cost_micros)` and `(wallet reserve net - agent_runs.reserved_micros)`; reconciliation remains detection-only.

### Coordinator recovery mechanics
- Lease alarm recovery now routes through a dedicated recovery attempt path instead of immediate redispatch.
- Recovery attempts are persisted in DO state (`recoveryAttempts`) and capped at 3; exhausted recovery transitions run to `failed` with persisted error message `recovery_exhausted`.
- Recovery dispatch uses worker checkpoint introspection (`/internal/last-successful-checkpoint`) so resume can continue from `lastSuccessful.stepIndex + 1`.
- Event persistence into `agent_events` uses `INSERT OR IGNORE` with `(run_id, seq)` uniqueness to prevent duplicate recovery events.

### Resume endpoint behavior
- `resumeRun` now enforces status gate `paused | failed`, computes resume plan via `RecoveryService.prepareResume`, and resumes coordinator through `/internal/resume-from-checkpoint`.
- Resume step reset only touches unsettled steps from the resume plan, preventing reprocessing of already-settled steps.

### Verification evidence
- Added `api/src/agent/recovery-service.test.ts` covering: latest successful checkpoint resolution, resume plan settled/unsettled partitioning, stale-run detection, single-run reconciliation deltas, and batch mismatch reporting.
- Verified with `pnpm --filter @slopcade/api test:run src/agent/recovery-service.test.ts` and `pnpm --filter @slopcade/api type-check`.

## Task: Run Resilience (Resume + Recovery + Reconciliation)
- Resume-from-checkpoint is safest when routed through D1 `agent_checkpoints` by filtering successful checkpoint states (`json_extract(state_json, '$.status') = 'succeeded'`) and resuming from `step_index + 1`.
- Keep settlement integrity on resume by resetting only non-succeeded `agent_steps` at and after the resume index; successful steps remain untouched so `agent-step-settle:{runId}:{stepIndex}` idempotency is never retriggered.
- Coordinator `/internal/start` should accept optional `stepIndex` for deterministic restarts from checkpoint rather than restarting from step 0.
- Lease-recovery loops need a durable retry counter in DO state (`recoveryAttempts`) and a hard ceiling (`MAX_RECOVERY_ATTEMPTS`) to avoid infinite redispatch loops.
- A lightweight reconciliation report should compare both cost ledgers (`agent_runs.actual_cost_micros` vs `SUM(agent_costs.cost_micros)`) and reservation ledgers (`agent_runs.reserved_micros` vs reserve/release wallet transactions) and always surface deltas explicitly.

## Integration Tests and Feature Flags (2026-02-06)

### Feature Flag Implementation
- Created `api/src/ai/agent/feature-flags.ts` for server-side feature flagging
- Added `AI_EDITING_ENABLED` and `AI_EDITING_ALLOWED_USERS` env vars to `Env` type
- Feature flag logic: global on/off + optional beta user allowlist
- Integrated flag check at the start of `agentRuns.createRun` procedure

### Structured Logging
- Added JSON-formatted console.log statements to key agent run operations:
  - `agent_run_created`: runId, userId, tier, source
  - `agent_run_started`: runId, userId, reservedMicros
  - `agent_run_canceled`: runId, userId
  - `agent_run_published`: runId, gameId, userId
- Logs are structured for easy parsing and monitoring

### Integration Tests
- Created `api/src/trpc/routes/__tests__/agent-runs.test.ts` with 13 passing tests
- Tests cover:
  - Run creation with feature flag enforcement
  - Beta user allowlist functionality
  - Ownership validation
  - Billing integration (budget reservation)
  - Event polling
  - Run retrieval and listing
- **Important**: Cannot test Durable Object interactions (startRun, cancelRun) in unit tests
  - Tests focus on tRPC layer only
  - Billing service methods tested directly, not through DO coordinator

### Test Patterns Learned
- Use `crypto.randomUUID()` for all game IDs (must be valid UUIDs)
- Enable feature flags in `beforeEach` hook: `env.AI_EDITING_ENABLED = 'true'`
- Clean up all related tables in `beforeEach` to ensure test isolation
- Cost summary structure: `actualCostMicros`, `reservedMicros`, `stepCosts[]`
- Follow existing test patterns from `wallet-service.test.ts` and `games.test.ts`

### Pre-existing Issues
- TypeScript errors in `RunCoordinatorDO.ts` (lines 333, 617) - `persistState` signature mismatch
- Multiple test failures in asset-service, generator, validator, and games tests (unrelated to this work)

## Task 10: End-to-End Validation Infrastructure (Completed)

### Feature Flags Implementation
- Created `api/src/agent/feature-flags.ts` with production-ready feature flag system
- Flags: `aiEditingEnabled` (global kill switch), `aiEditingAllowedUserIds` (allowlist), `maxConcurrentRunsPerUser`, `maxRunsPerDay`
- Added env vars to `Env` type: `AI_EDITING_ENABLED`, `AI_EDITING_ALLOWED_USER_IDS`, `AI_EDITING_MAX_CONCURRENT_RUNS`, `AI_EDITING_MAX_RUNS_PER_DAY`
- Safe defaults: AI editing disabled by default, 3 concurrent runs max, 10 runs per day max
- `canUserCreateRun` helper returns structured `{ allowed, reason }` for clear rejection messages

### Observability & Structured Logging
- Created `api/src/agent/observability.ts` with `logAgentEvent` helper for Cloudflare-compatible JSON logging
- Structured log format includes: `timestamp`, `event`, `runId`, `userId`, `tier`, `stepIndex`, `stage`, `costMicros`, `durationMs`, `error`, `metadata`
- Replaced all `console.log(JSON.stringify(...))` calls with `logAgentEvent` for consistency

### Lifecycle Logging Points
- **agent-runs.ts**: `agent_run.created`, `agent_run.started`, `agent_run.canceled`, `agent_run.published`
- **RunCoordinatorDO.ts**: 
  - `agent_run.coordinator_started` (when DO starts execution)
  - `agent_run.step_dispatched` (when step is sent to worker)
  - `agent_run.step_completed` (with cost and duration)
  - `agent_run.failed` (with error message)
  - `agent_run.completed` (with total cost and duration)
  - `agent_run.billing_settled` (after each step settlement)
  - `agent_run.recovery_attempted` (with attempt count)
  - `agent_run.recovery_exhausted` (when max attempts reached)

### Concurrent Run Validation
- Added concurrent run check in `createRun` procedure
- Query counts active runs (`status IN ('planning', 'queued', 'running', 'paused')`) per user
- Rejects with `FORBIDDEN` if count >= `maxConcurrentRunsPerUser`
- Clear error message: "Maximum concurrent runs (N) reached. Please wait for existing runs to complete."

### Production Readiness
- All feature flags default to safe values (disabled/restrictive)
- Structured logs compatible with Cloudflare log drains
- Rate limiting infrastructure in place (concurrent + daily limits)
- Clear rejection reasons for debugging and user feedback
- TypeScript validation passes cleanly (`pnpm exec tsc --noEmit`)

### Files Created/Modified
- `api/src/agent/feature-flags.ts` — New (56 lines)
- `api/src/agent/observability.ts` — New (18 lines)
- `api/src/trpc/context.ts` — Added 3 env vars
- `api/src/trpc/routes/agent-runs.ts` — Added concurrent run check + structured logging (4 log points)
- `api/src/agent/RunCoordinatorDO.ts` — Added structured logging (8 log points)

### Key Patterns
- Feature flags read from env vars with safe defaults
- Structured logging uses ISO timestamps and consistent event naming (`agent_run.*`)
- Concurrent run validation happens before game ownership check (fail fast)
- All monetary values logged in microdollars for consistency
- Duration calculation uses `started_at` from D1 when available
