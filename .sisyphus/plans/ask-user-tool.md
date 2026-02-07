# askUser Tool — Rich Human-in-the-Loop for Agent Stages

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give the AI agent an `askUser` tool that lets it ask rich, structured questions (single-select, multi-select, free-text) at any stage of game building, with full suspend/resume support across worker timeouts and app closures.

**Architecture:** The `askUser` tool is defined without an `execute` function (Vercel AI SDK HITL pattern). When the LLM calls it, the worker detects the pending tool call, checkpoints the full conversation state to DO storage, and reports to the coordinator. The coordinator emits a `user_question` event to the client, transitions to `waiting_for_input`, and waits indefinitely. When the user answers (seconds, hours, or days later), the coordinator forwards the answer to the worker, which reconstructs the conversation and resumes `generateText` from exactly where it left off.

**Tech Stack:** Vercel AI SDK (`generateText`, `tool`), zod schemas, Cloudflare Durable Objects (DO storage for conversation checkpoints), React Native (NativeWind) for UI

**Vision doc:** `.claude/memory/roadmap/active/ai-game-builder-vision.md`

---

## Schema Design (Modeled After OpenCode)

### Question Schema (what the LLM produces as tool input)

```typescript
// shared/src/types/user-question.ts

export const QuestionOptionSchema = z.object({
  label: z.string().describe("Display text, 1-5 words, concise"),
  description: z.string().describe("Short explanation of this choice"),
  iconKey: z.string().optional().describe("Icon lookup key for future visual options"),
});

export const UserQuestionSchema = z.object({
  question: z.string().describe("The complete question to ask the user"),
  header: z.string().describe("Very short label for the question, max 30 characters"),
  options: z.array(QuestionOptionSchema).describe("Available choices for the user"),
  multiple: z.boolean().optional().describe("Allow selecting multiple choices (default: false)"),
});

// The askUser tool input — an array of questions (batch)
export const AskUserInputSchema = z.object({
  questions: z.array(UserQuestionSchema).describe("Questions to ask the user"),
});

// The answer format — array of string arrays (one per question, containing selected labels)
export const UserAnswerSchema = z.object({
  answers: z.array(z.array(z.string())).describe("Selected labels for each question"),
});
```

### Key Design Decisions (from OpenCode)
- `header` (short) + `question` (full) — compact UI header + full context
- `label` + `description` on options — concise display with expandable detail
- `multiple` flag per question — not global
- `custom` is always enabled by default — UI adds "Type your own answer" automatically; LLM should NOT include "Other" in options
- Answers are arrays of label strings — simple, serializable
- `iconKey` is optional — placeholder for future game-type icons (puzzle, platformer, etc.)
- LLM should put recommended option FIRST and add "(Recommended)" to its label

### Answer Serialization (what gets sent back to the LLM as tool result)

Following OpenCode's pattern, the tool result is a formatted string:
```
User answered your questions: "What type of game?"="Physics Puzzle", "Art style?"="Cartoon, Pixel Art"
```
This gives the LLM natural-language context to continue reasoning.

---

## Conversation Checkpoint (for suspend/resume)

The full Vercel AI SDK message history must be persisted so the LLM can resume mid-conversation.

```typescript
// api/src/agent/types.ts — new type

export interface ConversationCheckpoint {
  checkpointId: string;
  runId: string;
  stepIndex: number;
  stage: AgentStepStage;

  // Vercel AI SDK messages — the full conversation so far
  // Includes: system prompt context, user messages, assistant messages, tool calls + results
  messagesJson: string; // JSON.stringify(CoreMessage[])

  // The pending askUser tool call that caused the suspension
  pendingToolCallId: string;
  pendingToolName: string;
  pendingQuestionsJson: string; // JSON.stringify(AskUserInput)

  // Stage execution context needed to reconstruct the executor
  stageContextJson: string; // JSON.stringify({ planningDoc, gameDefinition, previousOutputs })

  // Cost accounting
  promptTokensSoFar: number;
  completionTokensSoFar: number;

  createdAt: number;
}
```

Storage location: Worker DO storage under key `conversation:${stepIndex}`

---

## Verification Commands

```bash
pnpm --filter api exec tsc --noEmit
pnpm --filter slopcade exec tsc --noEmit
pnpm --filter @slopcade/shared exec tsc --noEmit
cd api && npx vitest run src/agent/__tests__/
cd api && npx vitest run src/agent/engine/__tests__/
```

---

## Tasks

- [x] 1. Define shared question/answer schemas
  **What to do**:
  - Create `shared/src/types/user-question.ts` with zod schemas:
    - `QuestionOptionSchema` — `{ label, description, iconKey? }`
    - `UserQuestionSchema` — `{ question, header, options, multiple? }`
    - `AskUserInputSchema` — `{ questions: UserQuestionSchema[] }` (the tool's input)
    - `UserAnswerSchema` — `{ answers: string[][] }` (the tool's output)
  - Export all types from `shared/src/types/user-question.ts`
  - Add `export * from './user-question'` to `shared/src/types/index.ts`
  - Add new event types to `shared/src/types/agent-run.ts`:
    - Add `'user_question'` and `'user_answer'` to `AgentEventTypeSchema`
    - Add event payloads to `AgentEventPayloadSchema`:
      ```typescript
      z.object({
        type: z.literal('user_question'),
        batchId: z.string(),
        questions: z.array(UserQuestionSchema),
        stage: z.string(),
        stepIndex: z.number(),
      }),
      z.object({
        type: z.literal('user_answer'),
        batchId: z.string(),
        answers: z.array(z.array(z.string())),
      }),
      ```
  - Keep existing `clarification_requested`/`clarification_answered` events (backward compat for gate loop)
  **Must NOT do**:
  - Do not remove existing `ClarificationQuestionSchema` or events
  - Do not add external dependencies
  **Category**: `quick`
  **Skills**: `verification-before-completion`
  **Parallelization**:
  - **Can Run In Parallel**: YES with Task 2
  - **File Conflicts**: None

  **Acceptance Criteria**:
  - [ ] `shared/src/types/user-question.ts` exists with all schemas
  - [ ] Types are exported from `shared/src/types/index.ts`
  - [ ] New event types added to `agent-run.ts`
  - [ ] `pnpm --filter @slopcade/shared exec tsc --noEmit` passes

- [x] 2. Define the askUser tool (no execute function)
  **What to do**:
  - Add the `askUser` tool to `api/src/agent/engine/tools.ts` inside `createStageTools()`:
    ```typescript
    askUser: tool({
      description: `Use this tool when you need to ask the user questions during game creation.
        This allows you to gather user preferences, clarify ambiguous instructions,
        get decisions on implementation choices, or offer direction options.
        When 'custom' typing is enabled (always by default), a "Type your own answer"
        option is added automatically — do NOT include "Other" or catch-all options.
        Answers are returned as arrays of selected label strings.
        If you recommend a specific option, make it the FIRST option and add "(Recommended)" to the label.
        Set multiple: true to allow selecting more than one option.`,
      inputSchema: z.object({
        questions: z.array(z.object({
          question: z.string().describe("The complete question to ask"),
          header: z.string().describe("Very short label, max 30 characters"),
          options: z.array(z.object({
            label: z.string().describe("Display text, 1-5 words"),
            description: z.string().describe("Short explanation of this choice"),
            iconKey: z.string().optional().describe("Icon lookup key"),
          })).describe("Available choices"),
          multiple: z.boolean().optional().describe("Allow multiple selections"),
        })).describe("Questions to ask the user"),
      }),
      // NO execute function — this is the Vercel AI SDK HITL pattern.
      // When the LLM calls this tool, generateText returns with the
      // tool call in the response but no result. The worker detects
      // this and suspends execution.
    }),
    ```
  - NOTE: The tool has NO `execute` function. This is intentional — it's the Vercel AI SDK's human-in-the-loop pattern. When `generateText` encounters a tool call with no execute, it includes the tool call in the response and stops.
  - The tool should be available in ALL stages, not just planning
  - Import `tool` from `'ai'` (already imported at top of file)
  - DO NOT define an `outputSchema` on the askUser tool — the Vercel AI SDK requires you to NOT set `outputSchema` on tools without `execute` when using `generateText` (as opposed to streaming). The worker will manually provide the tool result string when resuming.
  **Must NOT do**:
  - Do NOT add an execute function
  - Do NOT add an outputSchema (incompatible with generateText HITL)
  - Do not modify stage-executor.ts yet (that's Task 3)
  - Do not modify RunStepWorkerDO.ts yet (that's Task 4)
  **Category**: `quick`
  **Skills**: `verification-before-completion`, `context7-auto-research`
  **Parallelization**:
  - **Can Run In Parallel**: YES with Task 1
  - **File Conflicts**: None with Task 1

  **Acceptance Criteria**:
  - [ ] `askUser` tool exists in `createStageTools()` with no execute function
  - [ ] Tool description guides the LLM on usage patterns
  - [ ] `pnpm --filter api exec tsc --noEmit` passes

- [x] 3. Add suspend/resume to StageExecutor
  **What to do**:
  - Modify `api/src/agent/engine/stage-executor.ts` to detect pending `askUser` tool calls and suspend execution.
  - Add a new result status: `'suspended'` alongside `'succeeded'` and `'failed'`:
    ```typescript
    export interface StageResult {
      stage: AgentStepStage;
      status: 'succeeded' | 'failed' | 'suspended';
      // ... existing fields ...
      // New fields for suspended state:
      suspendedConversation?: {
        messagesJson: string;       // Full conversation messages so far
        pendingToolCallId: string;  // The askUser tool call ID
        pendingToolName: string;    // 'askUser'
        pendingQuestionsJson: string; // The questions the LLM wants to ask
      };
    }
    ```
  - In `executeStage()`, after `generateText()` returns, check if the result contains a pending `askUser` tool call:
    ```typescript
    // After generateText returns:
    const result = await generateText({ ... });

    // Check for pending askUser tool call (no execute = no result)
    // In Vercel AI SDK, when a tool has no execute function, the tool call
    // appears in result.response.messages as an assistant message with a
    // tool-call part, but there's no corresponding tool-result message.
    const lastStep = result.steps[result.steps.length - 1];
    const pendingAskUser = lastStep?.toolCalls?.find(
      tc => tc.toolName === 'askUser'
    );

    if (pendingAskUser) {
      return {
        stage,
        status: 'suspended',
        attempts: attempt,
        outputArtifact: getStageOutput(stage, context),
        validation: { valid: false, errors: ['Suspended for user input'] },
        provider: this.provider,
        model: this.modelName,
        usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
        costMicros: this.estimateCostMicros(totalPromptTokens, totalCompletionTokens),
        suspendedConversation: {
          messagesJson: JSON.stringify(result.response.messages),
          pendingToolCallId: pendingAskUser.toolCallId,
          pendingToolName: pendingAskUser.toolName,
          pendingQuestionsJson: JSON.stringify(pendingAskUser.args),
        },
      };
    }
    ```
  - Add a new method `resumeStage()` that takes a conversation checkpoint + answer and resumes:
    ```typescript
    async resumeStage(
      stage: AgentStepStage,
      context: StageExecutionContext,
      checkpoint: {
        messagesJson: string;
        pendingToolCallId: string;
        answerText: string;
      }
    ): Promise<StageResult> {
      const tools = createStageTools(context);
      const config = getStageConfig(stage, tools);

      // Reconstruct messages from checkpoint
      const savedMessages = JSON.parse(checkpoint.messagesJson);

      // Append the tool result for the askUser call
      const resumeMessages = [
        ...savedMessages,
        {
          role: 'tool' as const,
          content: [{
            type: 'tool-result' as const,
            toolCallId: checkpoint.pendingToolCallId,
            toolName: 'askUser',
            result: checkpoint.answerText,
          }],
        },
      ];

      // Resume generateText with full message history
      const result = await generateText({
        model: this.model,
        system: config.systemPrompt,
        messages: resumeMessages,
        tools: config.tools,
        stopWhen: stepCountIs(6),
      });

      // Check for ANOTHER askUser call (LLM might have more questions)
      // ... same suspension detection logic as above ...

      // Otherwise, validate and return
      // ... same validation logic as executeStage ...
    }
    ```
  - IMPORTANT: The resumed call might trigger ANOTHER askUser. The suspension detection must work recursively — each resume could suspend again. The worker handles this loop.
  - Look up the exact Vercel AI SDK message format for tool results using context7. The `messages` array from `result.response.messages` uses the AI SDK's internal format — make sure the resume messages match.
  **Must NOT do**:
  - Do not modify `RunStepWorkerDO.ts` yet (Task 4)
  - Do not modify `RunCoordinatorDO.ts` (Task 5)
  - Do not break existing `executeStage()` behavior for stages that don't use askUser
  - Do not remove the retry loop — askUser suspension should break out of the retry loop (it's not a failure)
  **Category**: `deep`
  **Skills**: `verification-before-completion`, `context7-auto-research`, `systematic-debugging`
  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Task 2 (askUser tool definition)
  - **Depends On**: Task 2

  **Acceptance Criteria**:
  - [ ] `StageResult` has `'suspended'` status with conversation checkpoint data
  - [ ] `executeStage()` detects pending askUser and returns suspended result
  - [ ] `resumeStage()` reconstructs conversation and continues from checkpoint
  - [ ] Resumed execution can suspend again (recursive)
  - [ ] Existing stage execution (without askUser) works unchanged
  - [ ] `pnpm --filter api exec tsc --noEmit` passes

- [x] 4. Worker: checkpoint conversation and report suspension
  **What to do**:
  - Modify `api/src/agent/RunStepWorkerDO.ts` to handle `suspended` results from StageExecutor.
  - Add a new result status to `RunStepResult` in `api/src/agent/types.ts`:
    ```typescript
    export interface RunStepResult {
      // ... existing fields ...
      status: 'succeeded' | 'failed' | 'suspended';  // Add 'suspended'
      // New fields for suspension:
      suspendedConversationJson?: string; // Serialized ConversationCheckpoint
      questionsJson?: string;             // The askUser questions to show the user
    }
    ```
  - In `handleExecute()`, after `executor.executeStage()` returns:
    ```typescript
    if (execution.status === 'suspended' && execution.suspendedConversation) {
      // 1. Checkpoint the conversation to DO storage
      const conversationKey = `conversation:${payload.stepIndex}`;
      await this.ctx.storage.put(conversationKey, {
        messagesJson: execution.suspendedConversation.messagesJson,
        pendingToolCallId: execution.suspendedConversation.pendingToolCallId,
        pendingToolName: execution.suspendedConversation.pendingToolName,
        pendingQuestionsJson: execution.suspendedConversation.pendingQuestionsJson,
        stageContextJson: JSON.stringify({
          planningDoc: context.planningDoc,
          gameDefinition: context.gameDefinition,
          previousOutputs: context.previousOutputs,
        }),
        promptTokensSoFar: execution.usage.promptTokens,
        completionTokensSoFar: execution.usage.completionTokens,
        createdAt: Date.now(),
      });

      // 2. Report to coordinator with suspended status + questions
      const result: RunStepResult = {
        type: 'step_result',
        runId: payload.runId,
        stepId: payload.stepId,
        stepIndex: payload.stepIndex,
        stage: payload.stage,
        status: 'suspended',
        costMicros: execution.costMicros,
        checkpointId: `${payload.runId}:conversation:${payload.stepIndex}`,
        suspendedConversationJson: JSON.stringify(execution.suspendedConversation),
        questionsJson: execution.suspendedConversation.pendingQuestionsJson,
        provider: execution.provider,
        model: execution.model,
        inputTokens: execution.usage.promptTokens,
        outputTokens: execution.usage.completionTokens,
        completedAt: Date.now(),
      };
      await this.reportResult(result);
      return Response.json({ ok: true, status: 'suspended' });
    }
    ```
  - Add a new endpoint `/internal/resume` that the coordinator calls with the user's answer:
    ```typescript
    // In fetch():
    if (request.method === 'POST' && url.pathname.endsWith('/internal/resume')) {
      return this.handleResume(request);
    }
    ```
    ```typescript
    private async handleResume(request: Request): Promise<Response> {
      const body = await request.json() as {
        runId: string;
        stepId: string;
        stepIndex: number;
        stage: AgentStepStage;
        tier: AgentTier;
        answerText: string; // Formatted answer string
      };

      // 1. Load conversation checkpoint from DO storage
      const conversationKey = `conversation:${body.stepIndex}`;
      const checkpoint = await this.ctx.storage.get(conversationKey);
      if (!checkpoint) {
        return Response.json({ ok: false, reason: 'No conversation checkpoint' }, { status: 404 });
      }

      // 2. Load stage context
      const stageContext = JSON.parse(checkpoint.stageContextJson);

      // 3. Create executor and resume
      const tierConfig = resolveTierConfig(body.tier);
      const model = createModelForTier(tierConfig, { ... });
      const executor = new StageExecutor(model, ...);

      const context: StageExecutionContext = {
        runId: body.runId,
        stepId: body.stepId,
        stepIndex: body.stepIndex,
        stage: body.stage,
        planningDoc: stageContext.planningDoc,
        gameDefinition: stageContext.gameDefinition,
        previousOutputs: stageContext.previousOutputs,
        // ... other context fields
      };

      const execution = await executor.resumeStage(body.stage, context, {
        messagesJson: checkpoint.messagesJson,
        pendingToolCallId: checkpoint.pendingToolCallId,
        answerText: body.answerText,
      });

      // 4. Handle result (might be suspended AGAIN, succeeded, or failed)
      // ... same handling as handleExecute: checkpoint if suspended, report result ...
    }
    ```
  **Must NOT do**:
  - Do not modify RunCoordinatorDO.ts (Task 5)
  - Do not break existing execute flow for non-suspended results
  - Do not lose cost accounting — tokens from before suspension must be tracked
  **Category**: `deep`
  **Skills**: `verification-before-completion`, `systematic-debugging`
  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Task 3
  - **Depends On**: Task 3 (StageExecutor suspend/resume)

  **Acceptance Criteria**:
  - [ ] Worker detects suspended result and checkpoints conversation to DO storage
  - [ ] Worker reports suspended status to coordinator with questions
  - [ ] `/internal/resume` endpoint loads checkpoint, resumes execution
  - [ ] Resume can handle another suspension (recursive)
  - [ ] Cost tokens from before suspension are preserved
  - [ ] `pnpm --filter api exec tsc --noEmit` passes

- [x] 5. Coordinator: handle suspension, emit events, forward answers
  **What to do**:
  - Modify `api/src/agent/RunCoordinatorDO.ts` to handle `suspended` step results.
  - In `handleStepResult()`, when `result.status === 'suspended'`:
    ```typescript
    if (result.status === 'suspended' && result.questionsJson) {
      const questions = JSON.parse(result.questionsJson);
      const batchId = crypto.randomUUID();

      // Store the batch ID and questions in coordinator state
      this.state.pendingQuestionBatchId = batchId;
      this.state.pendingQuestionsJson = result.questionsJson;
      this.state.suspendedStepIndex = result.stepIndex;

      // Transition to waiting_for_input
      this.transitionStatus('waiting_for_input');
      this.state.leaseExpiresAt = null;
      await this.ctx.storage.deleteAlarm();
      await this.persistState();

      // Emit user_question event to client
      await this.emitEvent('user_question', {
        type: 'user_question',
        batchId,
        questions: questions.questions,
        stage: result.stage,
        stepIndex: result.stepIndex,
      });

      return; // Wait for user answer
    }
    ```
  - Add new state fields to RunState:
    ```typescript
    pendingQuestionBatchId: string | null;
    pendingQuestionsJson: string | null;
    suspendedStepIndex: number | null;
    ```
  - Add a new handler for submitting answers to askUser questions. This can extend the existing `handleSubmitAnswer` or be a new endpoint `/internal/submit-user-answer`:
    ```typescript
    private async handleSubmitUserAnswer(request: Request): Promise<Response> {
      const body = await request.json() as {
        batchId: string;
        answers: string[][]; // Array of selected labels per question
      };

      // Validate we're waiting for this answer
      if (this.state.status !== 'waiting_for_input') { return 409; }
      if (this.state.pendingQuestionBatchId !== body.batchId) { return 409; }

      // Format the answer as a string for the LLM (OpenCode pattern)
      const questions = JSON.parse(this.state.pendingQuestionsJson!);
      const answerText = questions.questions.map((q, i) =>
        `"${q.header}"="${body.answers[i]?.join(', ') ?? ''}"`
      ).join(', ');
      const formattedAnswer = `User answered your questions: ${answerText}`;

      // Emit answer event
      await this.emitEvent('user_answer', {
        type: 'user_answer',
        batchId: body.batchId,
        answers: body.answers,
      });

      // Clear pending state
      this.state.pendingQuestionBatchId = null;
      this.state.pendingQuestionsJson = null;
      this.transitionStatus('running');
      await this.persistState();

      // Forward to worker to resume
      const stepIndex = this.state.suspendedStepIndex!;
      this.state.suspendedStepIndex = null;
      const workerName = `${this.state.runId}:step:${stepIndex}`;
      const workerId = this.env.RUN_STEP_WORKER.idFromName(workerName);
      const worker = this.env.RUN_STEP_WORKER.get(workerId);

      const executionContext = await this.loadRunExecutionContext();
      await worker.fetch('https://run-step-worker/internal/resume', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          runId: this.state.runId,
          stepId: `${this.state.runId}:step:${stepIndex}`,
          stepIndex,
          stage: this.getStage(stepIndex),
          tier: executionContext?.tier ?? 'free',
          answerText: formattedAnswer,
        }),
      });

      return Response.json({ ok: true });
    }
    ```
  - Register the new endpoint in `fetch()`:
    ```typescript
    if (request.method === 'POST' && url.pathname.endsWith('/internal/submit-user-answer')) {
      return this.handleSubmitUserAnswer(request);
    }
    ```
  - Add a tRPC route (or extend existing `submitAnswer`) for the client to call. In `api/src/trpc/routes/agent-runs.ts`, add:
    ```typescript
    submitUserAnswer: protectedProcedure
      .input(z.object({
        runId: z.string().uuid(),
        batchId: z.string(),
        answers: z.array(z.array(z.string())),
      }))
      .mutation(async ({ ctx, input }) => {
        const run = await getRunForUserOrThrow(ctx.env.DB, input.runId, ctx.user.id);
        const coordinatorId = ctx.env.RUN_COORDINATOR.idFromName(run.id);
        const coordinator = ctx.env.RUN_COORDINATOR.get(coordinatorId);
        const response = await coordinator.fetch(
          'https://run-coordinator/internal/submit-user-answer',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ batchId: input.batchId, answers: input.answers }),
          }
        );
        if (!response.ok) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Failed to submit answer' });
        }
        return { ok: true };
      }),
    ```
  **Must NOT do**:
  - Do not break existing `clarification_requested`/`clarification_answered` flow (gate loop still uses it)
  - Do not remove existing `handleSubmitAnswer` — it's used by the gate loop
  - Do not modify tools.ts or stage-executor.ts (already done in Tasks 2-3)
  **Category**: `deep`
  **Skills**: `verification-before-completion`, `systematic-debugging`
  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Tasks 3 and 4
  - **Depends On**: Task 4 (worker resume endpoint)

  **Acceptance Criteria**:
  - [ ] Coordinator detects suspended step result and transitions to `waiting_for_input`
  - [ ] `user_question` event emitted with rich question schema
  - [ ] `submitUserAnswer` tRPC route forwards answer to coordinator
  - [ ] Coordinator formats answer and sends to worker `/internal/resume`
  - [ ] `user_answer` event emitted when answer received
  - [ ] Existing Q/A flow (gate loop) still works
  - [ ] `pnpm --filter api exec tsc --noEmit` passes

- [x] 6. Build rich question UI component
  **What to do**:
  - Create `app/components/editor/AIEditor/UserQuestionCard.tsx` — renders a single question with the appropriate input type:
    - **Options list**: Tappable cards with `label` + `description`. If question has `multiple: true`, show checkboxes. Otherwise, show radio-style selection (tapping one deselects others).
    - **Custom input**: Always show a "Type your own answer" text input at the bottom (unless there are 0 options, in which case it's just a text input — this handles free-text questions where the LLM passes `options: []`).
    - **iconKey**: If present on an option, show the icon from Ionicons to the left of the label. Map common keys: `{ "puzzle-piece": "extension-puzzle", "running": "walk", "grid": "grid", "magnet": "magnet" }`. If iconKey is not in the map, skip the icon gracefully.
    - **Visual states**: Selected options get a blue border + checkmark. Unselected are gray.
  - Create `app/components/editor/AIEditor/UserQuestionBatch.tsx` — renders a batch of questions (from one askUser call):
    - Shows a header: "The AI has questions"
    - Renders each `UserQuestionCard` in a vertical list
    - Has a "Submit Answers" button at the bottom — disabled until all questions have at least one selection
    - On submit: calls `submitUserAnswer(batchId, answers)` where answers is `string[][]`
  - Update `app/components/editor/AIEditor/useAgentRun.ts`:
    - Process `user_question` events — extract questions, batchId, store in state
    - Process `user_answer` events — mark the batch as answered
    - Add `submitUserAnswer(batchId: string, answers: string[][])` callback
    - Expose `pendingQuestions: { batchId: string, questions: UserQuestion[], stage: string, stepIndex: number } | null`
  - Update `app/components/editor/AIEditor/AIEditorPanel.tsx`:
    - When `pendingQuestions` is non-null, show `UserQuestionBatch` component
    - This should appear on Page 2 (AI Planning) and Page 3 (Build) — anywhere the agent is running
    - It takes priority over other content when visible (agent is waiting for the user)
  **Must NOT do**:
  - Do not add heavy animation libraries
  - Do not remove ClarificationQA (still used for gate loop)
  - Do not modify server-side files
  **Category**: `visual-engineering`
  **Skills**: `frontend-ui-ux`, `verification-before-completion`
  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Task 5 (needs event contracts)
  - **Depends On**: Task 1 (shared types), Task 5 (event contracts)

  **Acceptance Criteria**:
  - [ ] `UserQuestionCard` renders options as tappable cards with label + description
  - [ ] Single-select and multi-select work correctly
  - [ ] "Type your own answer" input always shown at bottom
  - [ ] `UserQuestionBatch` shows all questions + submit button
  - [ ] Submit button disabled until all questions answered
  - [ ] `useAgentRun` processes `user_question` and `user_answer` events
  - [ ] Questions appear in wizard when agent is waiting for input
  - [ ] `pnpm --filter slopcade exec tsc --noEmit` passes

- [x] 7. Tests for suspend/resume flow
  **What to do**:
  - Create `api/src/agent/engine/__tests__/stage-executor-suspend.test.ts`:
    - Test that `executeStage` returns `suspended` when askUser is called
    - Test that `resumeStage` reconstructs conversation and continues
    - Test that a resumed stage can suspend again
    - Test that non-askUser stages still work normally
    - Mock `generateText` to simulate askUser tool calls
  - Create `api/src/agent/__tests__/ask-user-integration.test.ts`:
    - Test the worker's suspend → checkpoint → resume flow
    - Test that conversation checkpoint is stored and loaded correctly
    - Test answer formatting (OpenCode pattern)
  - Verify all existing tests still pass
  **Must NOT do**:
  - Do not test with real LLM calls — mock everything
  - Do not modify existing test files
  **Category**: `unspecified-high`
  **Skills**: `test-driven-development`, `verification-before-completion`
  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Tasks 3-5
  - **Depends On**: Tasks 3, 4, 5

  **Acceptance Criteria**:
  - [ ] Suspend detection tests pass
  - [ ] Resume from checkpoint tests pass
  - [ ] Recursive suspension tests pass
  - [ ] Answer formatting tests pass
  - [ ] All existing tests still pass
  - [ ] `pnpm --filter api exec tsc --noEmit` passes

## Wave Execution Order

| Wave | Tasks | Parallelizable |
|------|-------|----------------|
| 1 | 1 (shared schemas), 2 (askUser tool definition) | YES — independent |
| 2 | 3 (StageExecutor suspend/resume) | NO — needs Task 2 |
| 3 | 4 (Worker checkpoint/resume) | NO — needs Task 3 |
| 4 | 5 (Coordinator handling) | NO — needs Task 4 |
| 5 | 6 (UI components) | NO — needs Task 5 |
| 6 | 7 (Tests) | NO — needs Tasks 3-5 |

Note: Tasks 6 and 7 could theoretically run in parallel (different packages), but 6 depends on the event contracts from Task 5.

## Future Work (Not in Scope)

- **Migrate gate loop to askUser**: Replace `processGates` with a planning-stage LLM that has `askUser` + `writeGateValues` tools. The gate YAML becomes the LLM's context, not a separate extraction pipeline.
- **Push notifications**: When `user_question` event fires and the app is backgrounded, trigger a push notification.
- **Icon registry**: Build a map of `iconKey` → game-type icons for richer option rendering.
- **Question history**: Show previously answered questions in a collapsible history section (like ClarificationQA does).
- **Timeout handling**: If the user doesn't answer within N hours, optionally auto-answer with defaults or cancel the run.

## Definition of Done

- [ ] AI agent can call `askUser` during any stage (build, refine, theme, asset)
- [ ] Questions support single-select, multi-select, and free-text (via custom input)
- [ ] Worker suspends, checkpoints full conversation to DO storage
- [ ] Coordinator emits `user_question` event to client, transitions to `waiting_for_input`
- [ ] User answers in the app UI (rich card-based selection)
- [ ] Answer flows back through coordinator → worker → LLM resumes exactly where it left off
- [ ] No data loss across worker timeouts or app closures
- [ ] Existing gate loop Q/A flow still works (backward compat)
- [ ] All TypeScript compilation passes
- [ ] Tests cover suspend/resume/recursive-suspension flows
