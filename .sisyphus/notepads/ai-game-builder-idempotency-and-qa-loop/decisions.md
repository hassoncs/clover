# Decisions

## Session: ses_3cc063854ffeCpXeoDOTyei00A

## 2026-02-06 Task 3 - Planning Gates Architecture Decisions

### YAML Config Location
- **Decision**: Created `api/config/ai-planning-gates.yaml` as single source of truth
- **Rationale**: Human-editable config file allows non-developers to modify gate requirements without code changes
- **Trade-off**: Cloudflare Workers can't read filesystem at runtime, so config is embedded in code via `getDefaultGatesConfig()`
- **Future**: Could move to D1 database table or KV store for true runtime editability

### YAML Parsing Strategy
- **Decision**: Implemented simple line-by-line parser instead of adding `js-yaml` dependency
- **Rationale**: No YAML library exists in project, simple structure doesn't justify new dependency
- **Trade-off**: Parser is basic (no nested structures, no multi-line values) but sufficient for current needs
- **Future**: If config grows complex, consider adding proper YAML library

### Validation Timing
- **Decision**: Validate gates in `startRun` mutation BEFORE budget reservation
- **Rationale**: Fail fast - don't charge user if planning is incomplete
- **Implementation**: Gate check happens after status check but before billing.reserveBudget()

### Error Response Format
- **Decision**: Use TRPCError with `PRECONDITION_FAILED` code and `missingFields` array in `cause`
- **Rationale**: Machine-readable error allows frontend to display specific missing fields
- **Format**: `{ code: 'PRECONDITION_FAILED', message: '...', cause: { missingFields: [{ id, label }] } }`

### Planning Doc Format
- **Decision**: Expect JSON object with gate IDs as keys (e.g., `{"core_game_loop": "text"}`)
- **Rationale**: Structured data easier to validate than free-form markdown
- **Trade-off**: Current `PlanningDocEditor.tsx` is plain TextInput - Task 4 will need to update UI to structured form
- **Backward Compatibility**: Validation gracefully handles null/invalid JSON (treats as all fields missing)

### Type Exports
- **Decision**: Export `GateField`, `GatesConfig`, `ValidationResult` types from planning-gates.ts
- **Rationale**: Frontend (Task 4) needs types to build structured editor UI
- **Implementation**: Types are Zod-inferred, ensuring runtime/compile-time consistency

## 2026-02-06 Task 5 - Clarification Q/A orchestration decisions

### Waiting State Placement
- **Decision**: Model clarification waits as a run-level status (`waiting_for_input`) rather than step-level status.
- **Rationale**: Coordinator already owns dispatch/stateVersion transitions and can pause/resume without changing worker execution contract.

### Question Persistence Strategy
- **Decision**: Persist Q/A prompts and answers through `agent_events` using new event payloads, and keep pending-question validation state in DO `RunState`.
- **Rationale**: Event log is the durable source for UI/history; `RunState` enables strict runtime validation and restart-safe resume semantics.

### Answer Idempotency
- **Decision**: Add answer submission ledger keys (`answer:{submissionId}`) mirroring command dedupe pattern.
- **Rationale**: Prevent duplicate answer writes or duplicate resume dispatch on retries/network retries.

### Resume Behavior
- **Decision**: `submit-answer` resumes by transitioning back to `running` and calling `dispatchNextStep()` from unchanged `currentStepIndex`.
- **Rationale**: Keeps stage continuity and avoids special-case replay logic in worker.
