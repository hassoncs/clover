# Learnings

## Initial Context
- Vercel AI SDK HITL pattern: tool without `execute` → SDK pauses, client provides output via `addToolOutput`
- For server-side `generateText`: tool without execute → the tool call appears in result but no result → function returns
- Existing tools in `api/src/agent/engine/tools.ts`: readGameDefinition, writeGameDefinition, publishGameDefinition, validateGameDefinition, readPlanningDoc, updatePlanningDoc, listTemplates, searchExistingGames
- StageExecutor uses `generateText` with `stopWhen: stepCountIs(6)` — max 6 tool-call rounds
- Worker DO stores state in `this.ctx.storage` — checkpoints, costs, engine state
- Coordinator emits events via `this.emitEvent()` — stored in DO storage + D1 + broadcast to WS
- Existing Q/A flow: gate loop in coordinator uses `processGates` + `clarification_requested`/`clarification_answered`
- Schema pattern: OpenCode uses `header` (short) + `question` (full), `label` + `description` on options, `multiple` flag, custom always enabled
## User Question Schemas
- Defined `QuestionOptionSchema`, `UserQuestionSchema`, `AskUserInputSchema`, and `UserAnswerSchema` in `shared/src/types/user-question.ts`.
- Integrated these into `AgentEventPayloadSchema` in `shared/src/types/agent-run.ts` for `user_question` and `user_answer` events.
- Used `batchId` to group questions and answers.
- Answers are structured as `string[][]` (array of selected labels per question) for simplicity and serializability.
# Learnings: askUser Tool Implementation

- **Vercel AI SDK HITL Pattern**: Tools without an `execute` function are used to implement human-in-the-loop (HITL) workflows. When `generateText` encounters such a tool, it returns the tool call in the response messages without attempting to execute it.
- **Schema Constraints**: When using this pattern, `outputSchema` should be omitted as it is incompatible with `generateText` when no `execute` function is present.
- **Inline Zod Schemas**: For tool definitions in the agent engine, it's preferred to use inline Zod schemas rather than importing from shared packages to avoid complex cross-package dependency issues in the tool definition itself.
- **User Guidance**: The tool description is critical for guiding the LLM on how to structure questions and options, including recommendations and handling "custom" answers.

## Stage Executor Suspension/Resume Notes
- Context7 confirms `generateText` exposes `result.steps` with per-step `toolCalls`; inspecting the last step is a valid way to detect pending HITL tool calls.
- `result.response.messages` is conversation history in `ModelMessage[]` shape and can be checkpointed directly for resume.
- Resume flow should call `generateText` with `messages` (not `prompt`) and append a `role: 'tool'` message containing a `tool-result` part tied to the original `toolCallId`.
- In this codebase's installed `ai` types, `tool-result` requires `output` (not `result`) and `output` must be a typed tool output object (e.g. `{ type: 'text', value: answer }`).
- Broadening `StageResult.status` to include `'suspended'` introduces downstream type breakage where consumers still expect only `'succeeded' | 'failed'`.
- Added worker suspend/resume orchestration: execute now checkpoints suspended conversations in DO storage and reports `status: 'suspended'` with serialized questions payload for coordinator handling.
- Resume path (`/internal/resume`) restores conversation + stage context, calls `StageExecutor.resumeStage()`, supports repeat suspension, accumulates token/cost accounting across suspensions, and clears conversation checkpoint on successful completion.
## Coordinator suspended-step handling
- Added coordinator state fields for askUser suspension tracking: `pendingQuestionBatchId`, `pendingQuestionsJson`, `suspendedStepIndex`.
- `handleStepResult()` now branches on `status === "suspended"`, persists pending question batch metadata, transitions to `waiting_for_input`, clears lease alarm, and emits `user_question` with `questions.questions` payload.
- Added `/internal/submit-user-answer` endpoint + `handleSubmitUserAnswer()` to validate batch state, format answers into OpenCode string form (`User answered your questions: ...`), emit `user_answer`, clear suspension fields, restore `running` lease, and forward resume payload to worker `/internal/resume`.
- Worker routing for resume uses run-level naming (`RUN_STEP_WORKER.idFromName(runId)`) consistent with `dispatchNextStep()`.
- `updateStepStatus()` maps suspended worker results to DB step status `running` so suspended steps stay in-progress rather than terminal.
- Added `submitUserAnswer` protected tRPC mutation that proxies answers to coordinator `/internal/submit-user-answer` while preserving existing `submitAnswer` clarification flow.

## Integration Test Notes (Task 6)
- Created `api/src/agent/__tests__/ask-user-integration.test.ts` with 20 tests across 5 describe blocks.
- Tests use `vitest.node.config.ts` (not workers config) since they mock `ai` module directly.
- Test file covers worker-level orchestration and data contracts, complementing `stage-executor-suspend.test.ts` which tests StageExecutor internals.
- Answer formatting tests validate the OpenCode pattern: `User answered your questions: "Header"="Label1, Label2"` — derived from `handleSubmitUserAnswer` in RunCoordinatorDO.
- ConversationCheckpoint data structure tests verify all 9 fields including cost tracking (`promptTokensSoFar`, `completionTokensSoFar`, `costMicrosSoFar`).
- Cost accounting tests verify the accumulation pattern: `checkpoint.*SoFar + execution.*` used in `handleResume`.
- Recursive suspension tests verify that `resumeStage` can return `suspended` again with fresh conversation messages and accumulated costs.
