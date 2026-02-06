# AI-Driven Planning Loop

> Multi-page wizard: brain dump prompt → AI-animated checklist with Q/A → game builder.
> Vision doc: `.claude/memory/roadmap/active/ai-game-builder-vision.md`

## Summary

Replace the current manual gate-filling flow with a multi-page wizard:

**Page 1 — Prompt**: Single text box for brain dump. User describes their game in any level of detail. Click "Go".

**Page 2 — AI Planning**: Animated spinner while AI digests the prompt. A checklist of 4 gate items appears. As the AI fills each one, the check mark animates in and the extracted text appears. If the AI has questions, a question card pops up (free text or multiple choice). User answers, AI re-evaluates. "Continue" button is disabled until all 4 items are checked. Once ready, user clicks Continue.

**Page 3 — Builder** (future): Interactive editor showing game preview as AI builds. Not in scope for this plan.

The YAML gate configs are the single source of truth — per-stage, server-driven, fully configurable.

## Verification Commands

```bash
pnpm --filter api exec tsc --noEmit
pnpm --filter slopcade exec tsc --noEmit
pnpm --filter @slopcade/api test:run
```

## TODOs

- [ ] 1. Create per-stage YAML gate config system

  **What to do**:
  - Create `api/config/stage-gates/` directory
  - Create `api/config/stage-gates/planning.yaml` with the 4 planning gates, each having an `ai_extraction_hint` field:
    ```yaml
    stage: planning
    gates:
      - id: core_game_loop
        label: Core Game Loop
        description: What does the player do repeatedly?
        required: true
        ai_extraction_hint: Look for descriptions of the main player action, game mechanics, or what happens on each turn/frame
    ```
  - Create `api/src/agent/stage-gates.ts` — generic loader/validator:
    - `getStageGateConfig(stage: string): StageGateConfig` — returns config for a stage
    - `validateGateValues(values: Record<string, string>, config: StageGateConfig): ValidationResult`
    - Types: `StageGateConfig`, `StageGateField` (adds `ai_extraction_hint` to existing `GateField`)
  - Keep `api/src/agent/planning-gates.ts` working (delegate to new system) so existing `startRun` gate check isn't broken
  - Update client-side `app/components/editor/AIEditor/planning-gates.ts` to match new types

  **Must NOT do**:
  - Do not break existing gate validation in `startRun`
  - Do not add external YAML parsing libraries

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES with Task 2
  - **File Conflicts**: None

  **Acceptance Criteria**:
  - [ ] Per-stage YAML configs exist with planning stage fully defined including ai_extraction_hint
  - [ ] Generic loader/validator works for any stage

- [ ] 2. Build AI GateProcessor service

  **What to do**:
  - Create `api/src/agent/engine/gate-processor.ts` — a generic, stateless service:
    - Input: `{ stageConfig: StageGateConfig, userPrompt: string, previousAnswers: Array<{question: string, answer: string}>, currentGateValues: Record<string, string> }`
    - Calls LLM (using existing `ai` package / `generateText` from Vercel AI SDK) with a structured prompt:
      - System prompt: "You are analyzing a game description to extract specific information."
      - Includes the gate fields with their `ai_extraction_hint`
      - Includes the user's raw prompt + any Q/A context
      - Asks the LLM to output JSON: `{ gateValues: Record<string, string>, questions: Array<{questionId, question, context?}> }`
      - Only generates questions for fields the LLM couldn't confidently fill
    - Output: `GateProcessorResult { gateValues: Record<string, string>, satisfiedFields: string[], unsatisfiedFields: string[], questions: Array<{questionId: string, question: string, context?: string}> }`
  - The LLM should be instructed to:
    - Fill fields with extracted values even if partial
    - Only ask questions for truly missing/ambiguous info
    - Not re-ask about things already answered
    - Keep questions concise and specific
  - Use `zod` schema for structured output parsing (the AI SDK supports this)
  - The processor is completely stateless — all context passed in, all results returned

  **Must NOT do**:
  - Do not hardcode planning-specific logic — keep generic for any stage
  - Do not add new AI model dependencies — use existing `ai` package

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `verification-before-completion`, `context7-auto-research`

  **Parallelization**:
  - **Can Run In Parallel**: YES with Task 1
  - **File Conflicts**: None

  **Acceptance Criteria**:
  - [ ] GateProcessor takes any stage config and returns structured extraction + questions
  - [ ] LLM prompt uses ai_extraction_hint and generates focused questions

- [ ] 3. Integrate GateProcessor into coordinator + add events

  **What to do**:
  - Add new event types to `shared/src/types/agent-run.ts`:
    - `gate_values_updated`: `{ stage, gateValues: Record<string, string>, satisfiedFields: string[], unsatisfiedFields: string[] }`
    - `planning_complete`: `{ stage, finalGateValues: Record<string, string> }`
  - Modify `RunCoordinatorDO` to run the gate evaluation loop:
    - New state fields: `rawPrompt: string`, `gateValues: Record<string, string>`, `gateLoopIteration: number`
    - When the run transitions to `running` and `currentStepIndex === 0` (planning stage):
      1. Load planning stage gate config
      2. Call GateProcessor with rawPrompt + accumulated context
      3. Emit `gate_values_updated` event with the extracted values
      4. If all gates satisfied → emit `planning_complete`, store final values, advance to next step
      5. If gaps exist → emit `clarification_requested` for each question, transition to `waiting_for_input`
      6. When answer comes in (existing `handleSubmitAnswer`) → re-run GateProcessor with updated context
      7. Loop steps 3-6 until satisfied
    - Store the raw prompt in coordinator state (passed from `startRun` via internal endpoint)
    - The GateProcessor call should happen IN the coordinator (not via worker), since it's a lightweight LLM call
  - Modify `startRun` tRPC route to pass the raw prompt to the coordinator along with the start command
  - Keep the existing manual gate validation as a fallback

  **Must NOT do**:
  - Do not break existing step execution for stages after planning
  - Do not remove existing `waiting_for_input` / Q/A infrastructure

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `systematic-debugging`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Tasks 1 and 2
  - **Depends On**: Task 1 (stage gate configs), Task 2 (GateProcessor)

  **Acceptance Criteria**:
  - [ ] Coordinator runs GateProcessor at planning stage, emits gate_values_updated events
  - [ ] Q/A loop works: AI asks → user answers → AI re-evaluates → emits planning_complete when done

- [ ] 4. Build wizard UI — Page 1 (Prompt) + Page 2 (AI Planning)

  **What to do**:
  - Rework `AIEditorPanel.tsx` as a multi-step wizard with internal page state:
    - **Page 1 (prompt)**: Full-screen prompt input
      - Large TextInput with placeholder "Describe the game you want to build..."
      - Tier selector (free/standard/pro)
      - Big "Go" / "Create My Game" button
      - Clean, minimal — just the prompt and the button
      - Clicking Go: creates the run, saves the prompt as planningDoc, calls startRun
    - **Page 2 (ai-planning)**: AI analysis + checklist + Q/A
      - Initially shows a fun spinner/loading state: "AI is reading your prompt..."
      - Then the gate checklist appears — 4 items, each starts as empty/pending
      - As `gate_values_updated` events arrive, animate each gate item:
        - Spinner → checkmark with a subtle scale/fade animation
        - The extracted text value fades in below the label
      - If `clarification_requested` events arrive, show question cards (reuse ClarificationQA)
      - "Continue" button at the bottom — disabled until all 4 gates have checkmarks
      - Once all gates filled: "Continue" enables, maybe a subtle celebration animation
    - Wizard page transitions should feel smooth (simple fade or slide)
  - The wizard tracks which page to show based on run status:
    - No run / `planning` status → Page 1
    - `running` or `waiting_for_input` during step 0 (planning stage) → Page 2
    - Beyond step 0 → Page 3 (future, show existing RunProgress for now)
  - Process `gate_values_updated` events in `useAgentRun`:
    - Extract gate values from the event payload
    - Expose `gateValues`, `satisfiedFields`, `unsatisfiedFields` from the hook
  - The PlanningGateChecklist component becomes animated:
    - Each gate field has states: pending → loading → filled
    - Use `Animated` from react-native or simple state-driven transitions
  - Remove the old structured PlanningDocEditor inputs (replaced by single prompt on Page 1)

  **Must NOT do**:
  - Do not remove ClarificationQA — reuse it on Page 2 for questions
  - Do not add heavy animation libraries — use React Native's built-in Animated API or simple state transitions
  - Do not implement Page 3 (builder) — just show existing RunProgress as a placeholder

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Task 3 (event contracts)
  - **Depends On**: Task 3

  **Acceptance Criteria**:
  - [ ] Page 1 shows prompt input + Go button
  - [ ] Page 2 shows animated checklist with AI filling in items + Q/A cards
  - [ ] Continue button disabled until all gates satisfied
  - [ ] Smooth transitions between pages

- [ ] 5. End-to-end verification + tests

  **What to do**:
  - Add unit tests for GateProcessor (mock the LLM call, test input/output contract)
  - Add unit tests for per-stage gate config loader
  - Verify TypeScript for both api and app packages
  - Test the full flow manually: prompt → AI extraction → Q/A → checklist animation → continue
  - Document any issues or edge cases

  **Must NOT do**:
  - Do not skip TypeScript verification

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-before-completion`, `test-driven-development`

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on all previous tasks
  - **Depends On**: Tasks 1-4

  **Acceptance Criteria**:
  - [ ] Tests pass for GateProcessor and stage gate configs
  - [ ] TypeScript compiles for both packages
  - [ ] Full wizard flow works end-to-end

## Definition of Done

- [ ] Page 1: User writes brain dump prompt, clicks Go
- [ ] Page 2: AI fills checklist with animated checkmarks, asks questions for gaps
- [ ] Continue button disabled until AI satisfies all gates
- [ ] Per-stage YAML configs are the single source of truth
- [ ] GateProcessor is generic and reusable for any stage
- [ ] All verification commands pass

## Wave Execution Order

| Wave | Tasks | Parallelizable |
|------|-------|----------------|
| 1 | 1 (YAML configs), 2 (GateProcessor) | YES — independent |
| 2 | 3 (Coordinator + events) | NO — needs 1+2 |
| 3 | 4 (Wizard UI) | NO — needs 3 |
| 4 | 5 (Verification) | NO — needs all |

## Final Checklist

- [ ] Per-stage YAML gate configs with ai_extraction_hint
- [ ] Generic AI GateProcessor service
- [ ] Coordinator orchestrates extraction → Q/A → advance loop
- [ ] Wizard Page 1: prompt input → Go
- [ ] Wizard Page 2: animated checklist + Q/A + Continue
- [ ] Auto-advance when gates satisfied
