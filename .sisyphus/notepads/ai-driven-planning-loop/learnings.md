# Learnings

## Initial Context
- Existing YAML gate config: `api/config/ai-planning-gates.yaml` (4 gates, no `ai_extraction_hint`)
- Existing gate parser: `api/src/agent/planning-gates.ts` (hand-rolled YAML parser, zod validation, `GateField` type)
- Client-side planning-gates mirror: `app/components/editor/AIEditor/planning-gates.ts`
- Shared event types: `shared/src/types/agent-run.ts` (AgentEventTypeSchema, AgentEventPayloadSchema discriminated union)
- Coordinator: `api/src/agent/RunCoordinatorDO.ts` (DurableObject, ~1449 lines)
- UI panel: `app/components/editor/AIEditor/AIEditorPanel.tsx` (currently 4 structured inputs via PlanningDocEditor)
- AI SDK is already a dependency (`ai` package, `generateText`)
- The coordinator already supports `waiting_for_input`, `clarification_requested`, `clarification_answered`
- The coordinator dispatches steps to `RunStepWorkerDO` via internal fetch
- Stages are: planning, build, refine, theme, asset (5 steps)
- No external YAML parser — the existing one is hand-rolled line-by-line

## Gate Processor Service (Task 2)
- New stateless gate processor added at `api/src/agent/engine/gate-processor.ts`.
- Uses Vercel AI SDK `generateObject` with a zod output schema (`gateValues` + per-field `questions`).
- Prompt includes stage gates (`label`, `description`, `ai_extraction_hint`), user prompt, prior Q/A, and current gate values.
- Implementation merges LLM-extracted values with existing values and only accepts known gate field IDs.
- `satisfiedFields`/`unsatisfiedFields` are computed strictly over required gates using non-empty values.
- Question output is filtered to unsatisfied required fields and normalized to `{ questionId, question, context? }`.
- Model follows existing tier-config patterns via `createModelForTier`/`resolveTierConfig`; caller can inject a model directly for orchestration control.

## Stage Gate System Refactor (2026-02-06)
- Refactored the single-file gate config into a per-stage directory structure in `api/config/stage-gates/`.
- Introduced `StageGateField` and `StageGateConfig` types to support `ai_extraction_hint`.
- Created a generic loader and validator in `api/src/agent/stage-gates.ts` that uses a hand-rolled YAML parser.
- Maintained backward compatibility in `api/src/agent/planning-gates.ts` by delegating to the new system.
- Updated the client-side mirror `app/components/editor/AIEditor/planning-gates.ts` to include the new types and fields.
- Verified that existing tests pass and type checking is clean.

## Coordinator Gate Loop Integration (2026-02-06)
- Added planning-stage gate loop orchestration directly in `RunCoordinatorDO` so step 0 can complete without worker dispatch.
- Persisted gate-loop state in coordinator storage (`rawPrompt`, `gateValues`, `gateLoopIteration`, `gateAnswers`) to support retries and follow-up answers.
- Emitted new run events for gate extraction and completion (`gate_values_updated`, `planning_complete`) from coordinator state transitions.
- Reused existing clarification channel by emitting `clarification_requested` from coordinator-generated gate questions and resuming gate evaluation on `submit-answer`.
- Preserved legacy `startRun` gate validation and only added raw-prompt forwarding to `/internal/start` for the coordinator loop.

## UI Wizard & Real-time Gate Updates (2026-02-06)
- Reworked `AIEditorPanel` into a multi-page wizard driven by run status (`planning` -> `running` -> `build`).
- Page 1 captures raw prompt and tier; Page 2 visualizes the AI "thinking" via animated gate checklist.
- Updated `useAgentRun` hook to process `gate_values_updated` and `planning_complete` events, exposing real-time gate state to UI.
- `PlanningGateChecklist` now supports 3 visual states: pending (gray), loading (spinner), and filled (green check + value).
- Removed legacy `PlanningDocEditor` structured inputs in favor of the conversational/AI-driven flow.
- The UI automatically transitions between wizard pages based on `run.status` and `run.currentStepIndex`.

## Test Coverage for Gate System (2026-02-06)
- Created comprehensive unit tests for `stage-gates.ts` (17 tests) covering YAML parsing, caching, and validation.
- Created comprehensive unit tests for `gate-processor.ts` (15 tests) covering LLM extraction, merging, question generation, and filtering.
- All tests use vitest with proper mocking of the Vercel AI SDK (`generateObject`) and tier-config system.
- Tests verify edge cases: empty prompts, whitespace handling, unknown field filtering, question deduplication, and cache behavior.
- Existing planning-gates tests (10 tests) continue to pass, confirming backward compatibility.
- TypeScript compilation passes for both `api` and `slopcade` packages.
- Test patterns follow existing conventions: `describe/it/expect`, `beforeEach` for cleanup, `vi.mock` for dependencies.
- Mock structure for `generateObject`: returns `{ object: { gateValues: {...}, questions: [...] } }` matching the zod schema.
- Tests confirm the gate processor correctly filters questions to only unsatisfied required fields.
- Tests confirm normalization logic: trimming whitespace, ignoring unknown fields, treating empty strings as missing.
