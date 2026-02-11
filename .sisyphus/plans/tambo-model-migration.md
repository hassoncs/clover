# Adopt Tambo Data Model on Cloudflare (Stage System Retirement)

## TL;DR

> **Decision**: Adopt Tambo's thread/message/tool data model and design patterns. Stay on Cloudflare Workers + D1 + R2. Delete all custom stage orchestration.
>
> **What changes**: Data model, chat handler, frontend chat hook, billing granularity
> **What stays**: Cloudflare runtime, R2 workspace files, RealtimeRelayDO, non-chat APIs, economy/wallet system
>
> **Estimated Effort**: Medium (1-2 weeks)
> **Parallel Execution**: YES - 3 waves

---

## Context

### The Decision
We evaluated three options for improving chat/agent architecture:
- **A) Adopt Tambo wholesale** (self-hosted containers) — rejected: adds operational complexity without proportional value
- **B) Learn from Tambo, build on Cloudflare** — **chosen**: best design, lowest ops burden, no lock-in
- **C) Tambo SDK + custom backend** — rejected: worst of both worlds

### Why Now
Current stage-based system (`RunCoordinatorDO`, `StageExecutor`, gate processors) is new, untested, and overly complex for what is fundamentally "chat with an agent that edits files." Tambo's thread/message model is simpler, proven, and covers all current features.

### What Tambo Taught Us
- Threads are the container. Messages are the content. Tools are the actions.
- Component state belongs on messages, not in separate stage artifacts.
- No need for step indices, leases, checkpoint recovery, or stage pipelines.
- A single `generateText` loop with registered tools replaces ~2500 lines of DO orchestration.

---

## Architecture: Before and After

### Before (Current)
```
User message → tRPC → createRun → RunCoordinatorDO
  → dispatches RunStepWorkerDO per stage (planning, build, shader, refine, theme, asset)
  → each step: generateText + tools + checkpoint + billing settle
  → events stored in DO storage + D1 agent_events table
  → frontend polls tRPC getEvents every 1s
```

### After (Target)
```
User message → tRPC → chatHandler
  → load thread history from D1
  → generateText with tools (readFile, writeFile, askUser, etc.)
  → stream response via SSE (or poll)
  → persist messages to D1
  → bill per message/tool usage
  → frontend reads thread messages
```

### What Gets Deleted

| File/Module | Lines | Why |
|---|---|---|
| `RunCoordinatorDO.ts` | 1542 | Stage state machine, leases, recovery — all gone |
| `RunStepWorkerDO.ts` | ~400 | Stage step execution — absorbed into chat handler |
| `run-state-machine.ts` | ~300 | Stage transitions — no stages |
| `run-event-store.ts` | 100 | DO-scoped events — replaced by D1 messages |
| `run-recovery.ts` | ~150 | Checkpoint/lease recovery — not needed |
| `run-billing-bridge.ts` | 109 | Step-scoped billing — replaced by message-scoped |
| `engine/stage-executor.ts` | 470 | Stage pipeline runner — replaced by simple loop |
| `engine/stages.ts` | ~200 | Stage definitions/config — no stages |
| `engine/gate-processor.ts` | ~200 | Planning gate system — replaced by tool-based Q&A |
| `stage-gates.ts` | ~100 | Stage gate configs — gone |
| `planning-gates.ts` | ~100 | Planning gate configs — gone |
| All related tests | ~500 | Tests for above |
| **Total removed** | **~4200** | |

### What Survives (Adapted)

| File/Module | Change |
|---|---|
| `ArtifactService` | Keep as-is. Wire `storeWorkspaceFile`/`readWorkspaceFile` as agent tools |
| `RealtimeRelayDO` | Unchanged — voice relay is separate from chat |
| `observability.ts` | Adapt event names from step-scoped to message-scoped |
| `AgentBillingService` | Adapt from step settlement to message/tool settlement |
| `WalletService` | Unchanged |
| `engine/tools.ts` concepts | `readFile`, `writeFile`, `askUser` stay as tool definitions |
| `engine/prompts.ts` | System prompt content reused in new handler |
| `feature-flags.ts` | Keep |
| Non-chat tRPC routes | All unchanged |

---

## New Data Model (D1)

### New Tables

```sql
-- Replaces: chat_threads (minor schema update)
CREATE TABLE threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_id TEXT,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',  -- active | archived | error
  generation_stage TEXT DEFAULT 'idle',    -- idle | generating | complete | error
  status_message TEXT,
  metadata_json TEXT,                      -- flexible JSONB-style metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Replaces: chat_events + agent_events (unified)
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id),
  role TEXT NOT NULL,                      -- user | assistant | system | tool
  content_json TEXT NOT NULL,              -- array of content parts (text, component, tool_call, tool_result)
  component_name TEXT,                     -- if message renders a component
  component_props_json TEXT,               -- component props (persisted for reload)
  component_state_json TEXT,               -- component local state (persisted)
  tool_call_id TEXT,                       -- for tool role messages
  tool_name TEXT,                          -- for tool role messages
  model TEXT,                              -- which LLM model was used
  cost_micros INTEGER DEFAULT 0,           -- cost attributed to this message
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  error_json TEXT,                         -- structured error if generation failed
  metadata_json TEXT,                      -- flexible metadata
  created_at INTEGER NOT NULL,
  seq INTEGER NOT NULL                     -- ordering within thread
);

CREATE INDEX idx_messages_thread ON messages(thread_id, seq);
CREATE INDEX idx_threads_user ON threads(user_id);
CREATE INDEX idx_threads_game ON threads(game_id);
```

### Mapping from Current Model

| Current | New | Notes |
|---|---|---|
| `chat_threads` table | `threads` table | Add `generation_stage`, `status_message`, `metadata_json` |
| `chat_events` (user_message) | `messages` (role=user) | Content becomes `content_json` array |
| `chat_events` (assistant_message) | `messages` (role=assistant) | Text + optional component state |
| `chat_events` (tool_call) | `messages` (role=assistant, has tool_call in content) | Tool calls embedded in assistant message content |
| `chat_events` (tool_result) | `messages` (role=tool) | Tool result with `tool_call_id` reference |
| `chat_events` (user_question) | `messages` (role=assistant, askUser tool_call) | HITL becomes a normal tool call pattern |
| `chat_events` (file_updated) | `messages` (role=tool, writeFile result) | File updates are tool results |
| `chat_events` (system) | `messages` (role=system) | Status messages |
| `agent_runs` table | Removed | Thread `generation_stage` tracks active generation |
| `agent_steps` table | Removed | No steps — single message turn |
| `agent_events` table | Removed | Unified into `messages` |
| `agent_checkpoints` table | Removed | No checkpoint/recovery needed |

---

## New Chat Handler (replaces StageExecutor + DOs)

### Core Loop (pseudocode)

```typescript
async function advanceThread(threadId: string, userText: string, ctx: Context) {
  // 1. Persist user message
  const userMsg = await insertMessage(threadId, { role: 'user', content: [{ type: 'text', text: userText }] });

  // 2. Load thread history
  const history = await getThreadMessages(threadId);
  const systemPrompt = buildSystemPrompt(ctx.gameId);

  // 3. Update thread status
  await updateThread(threadId, { generation_stage: 'generating', status_message: 'Thinking...' });

  // 4. Call LLM with tools
  const result = await generateText({
    model: ctx.model,
    system: systemPrompt,
    messages: toAIMessages(history),
    tools: buildTools(ctx),  // readFile, writeFile, askUser, etc.
    maxSteps: 10,            // allow multi-tool-call loops
  });

  // 5. Persist assistant message(s) + tool results
  for (const step of result.steps) {
    // persist tool calls, tool results, and final text as messages
    await persistStepMessages(threadId, step, result);
  }

  // 6. Check for HITL suspension (askUser tool without execute)
  const pendingAskUser = findPendingAskUser(result);
  if (pendingAskUser) {
    await updateThread(threadId, {
      generation_stage: 'waiting_for_input',
      status_message: 'Waiting for your input...',
      metadata_json: JSON.stringify({ pendingToolCallId: pendingAskUser.toolCallId }),
    });
    return { status: 'suspended', pendingAskUser };
  }

  // 7. Bill for usage
  await billForMessage(ctx.userId, threadId, result.usage);

  // 8. Complete
  await updateThread(threadId, { generation_stage: 'complete', status_message: null });
  return { status: 'complete', text: result.text };
}
```

### Resume from HITL (replaces DO answer submission)

```typescript
async function resumeThread(threadId: string, toolCallId: string, answerText: string, ctx: Context) {
  // 1. Persist user's answer as tool result message
  await insertMessage(threadId, {
    role: 'tool',
    tool_call_id: toolCallId,
    tool_name: 'askUser',
    content: [{ type: 'text', text: answerText }],
  });

  // 2. Load full history and re-call LLM (it sees the tool result and continues)
  // Same flow as advanceThread from step 2 onward
}
```

### Tools (replaces engine/tools.ts)

```typescript
const tools = {
  readFile: tool({
    description: 'Read a file from the workspace',
    inputSchema: z.object({ filename: z.string() }),
    execute: async ({ filename }) => artifactService.readWorkspaceFile({ gameId, filename }),
  }),

  writeFile: tool({
    description: 'Write content to a workspace file',
    inputSchema: z.object({ filename: z.string(), content: z.string() }),
    execute: async ({ filename, content }) => artifactService.storeWorkspaceFile({ gameId, filename, data: content }),
  }),

  askUser: tool({
    description: 'Ask the user a question with multiple choice options',
    inputSchema: z.object({ questions: z.array(questionSchema) }),
    // No execute — triggers HITL suspension
  }),
};
```

---

## Work Plan

### Wave 1: Data Model + Chat Handler (can parallelize)

#### Task 1: Create new D1 schema and migration ✅
- Create `threads` and `messages` tables via D1 migration
- Keep old tables for archival reads (don't drop yet)
- **Files**: new migration in `api/migrations/`
- **Acceptance**: migration applies cleanly, tables queryable

#### Task 2: Build chat handler service ✅
- Implement `advanceThread` / `resumeThread` as plain async functions (no DOs)
- Wire `ArtifactService` operations as tools
- Port `askUser` HITL pattern from current `tools.ts`
- Port system prompt content from `engine/prompts.ts`
- **Files**: new `api/src/chat/chat-handler.ts`, `api/src/chat/chat-tools.ts`
- **Acceptance**: handler creates thread, processes message, persists results to D1

#### Task 3: Adapt billing to message-scoped ✅
- Change `AgentBillingService.settleStep` → `settleMessage` (bill per assistant turn)
- Keep `WalletService` unchanged
- **Files**: modify `api/src/economy/agent-billing-service.ts`
- **Acceptance**: billing settles correctly for message-based usage

### Wave 2: API Routes + Frontend (sequential dependency on Wave 1)

#### Task 4: New tRPC routes for thread/message model ✅
- Replace `chatThreads.getEvents` with `chatThreads.getMessages`
- Replace `agentRuns.createRun` / `agentRuns.startRun` with `chatThreads.sendMessage`
- Replace `agentRuns.submitAnswer` / `submitUserAnswer` with `chatThreads.submitToolAnswer`
- Keep thread create/list routes (adapt schema)
- **Files**: modify `api/src/trpc/routes/chat-threads.ts`, delete `api/src/trpc/routes/agent-runs.ts`
- **Acceptance**: all chat operations work through new routes

#### Task 5: Migrate frontend chat hook ✅
- Rewrite `useEditorChat.ts` to use new tRPC routes
- Replace event polling with message list query (still poll, but simpler data shape)
- Replace run/step state tracking with thread `generation_stage`
- Map message types to existing `ChatMessage` UI type for rendering
- **Files**: modify `app/components/create-game/useEditorChat.ts`, `app/components/create-game/types.ts`
- **Acceptance**: chat UI sends, receives, renders messages; HITL flow works; cancel works

### Wave 3: Cleanup (sequential dependency on Wave 2)

#### Task 6: Remove DO bindings and stage infrastructure ✅
- Remove `RUN_COORDINATOR` and `RUN_STEP_WORKER` DO bindings from wrangler config
- Delete all files in the "What Gets Deleted" table above
- Remove `agent-runs` tRPC route and service
- Update `shared/src/types/chat.ts` — simplify or retire `ChatEventPayload` union
- Update `shared/src/types/agent-run.ts` — remove stage-specific types
- **Files**: delete ~4200 lines across ~15 files
- **Acceptance**: `pnpm tsc --noEmit` passes, `pnpm test` passes, no runtime references to deleted code

#### Task 7: Update documentation ✅
- Update `AGENTS.md` architecture section to reflect new thread/message model
- Add migration ADR to docs
- **Files**: docs updates
- **Acceptance**: architecture docs match deployed system

#### Task 8: Zero tech debt — full cutover and legacy purge ✅
This is the final quality gate. After this task, **zero legacy code remains**.

- **Drop old D1 tables**: Write migration to `DROP TABLE` for `chat_events`, `agent_runs`, `agent_steps`, `agent_events`, `agent_checkpoints`, and any other stage/run-specific tables. No "read-only archive" — data is exported first if needed, then tables are gone.
- **Delete old shared types completely**: Don't leave `ChatEventPayload`, `ChatEventType`, `AgentRunStatus`, `AgentEventPayload`, or any stage/run discriminated unions in shared types. Replace with clean thread/message types only. No `@deprecated` annotations — just delete.
- **Kill all conversion/compat helpers**: No `chatEventToMessage()` mappers, no `toSnapshot()`, no `transitionStatus()`, no legacy-to-new adapters. Every consumer reads the new model directly.
- **Purge all references codebase-wide**: `grep -r` for any remaining imports, type references, or string literals referencing deleted modules (`stage-executor`, `RunCoordinator`, `agent_runs`, `chat_events`, `ChatEventPayload`, etc.). Fix or delete every hit.
- **Clean wrangler.toml / wrangler.jsonc**: Remove all DO class bindings (`RunCoordinatorDO`, `RunStepWorkerDO`), their migration tags, and any environment variable references only used by the old system.
- **Clean package.json scripts**: Remove any scripts, test commands, or build steps that reference deleted modules.
- **Audit frontend**: Ensure `useEditorChat.ts` is the new version (not a wrapper around the old one). No `.legacy.ts` files remain. `app/components/create-game/types.ts` uses only thread/message types.
- **Audit shared package exports**: `shared/src/types/` exports only the new types. No barrel re-exports of deleted type files.
- **Run full verification suite**:
  - `pnpm tsc --noEmit` — zero errors
  - `pnpm test` — all passing (no skipped legacy tests, no test files referencing deleted code)
  - `grep -r "stage.executor\|RunCoordinator\|RunStepWorker\|agent_runs\|agent_steps\|agent_events\|agent_checkpoints\|ChatEventPayload\|ChatEventType\|AgentRunStatus\|chatEventToMessage\|run-state-machine\|run-event-store\|run-billing-bridge\|gate-processor\|stage-gates\|planning-gates" --include="*.ts" --include="*.tsx" api/ app/ shared/` — **zero hits**
  - Build and deploy to staging — clean deploy with no DO warnings or missing binding errors
- **Files**: final cleanup across all workspaces
- **Acceptance**: The codebase looks like the old system never existed. A new engineer reading the code sees only threads, messages, and tools. Zero dead code, zero compat shims, zero deprecated paths.

---

## Dependency Graph

```
Wave 1 (parallel):
  Task 1 (schema) ──┐
  Task 2 (handler) ──┼── Wave 2:
  Task 3 (billing) ──┘     Task 4 (routes) → Task 5 (frontend)
                                                    │
                                              Wave 3:
                                                Task 6 (delete stage infra)
                                                  → Task 7 (docs)
                                                    → Task 8 (zero tech debt purge)
```

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Billing variance after model change | Validate billing math with controlled test batch before cutover |
| HITL flow breaks | Port exact same `askUser` tool-without-execute pattern from Vercel AI SDK |
| generateText loop runs too long | Set `maxSteps: 10` and `AbortSignal` timeout; thread status tracks generation |
| Missed legacy reference after cleanup | Task 8 grep audit catches everything; CI enforces zero hits |

---

## What This Enables (Future)

- **Generative UI**: Register React components with Zod schemas → AI picks what to render → stream props into components. Pure frontend pattern, no backend change needed.
- **Voice control**: Already have `RealtimeRelayDO`. Thread model makes it easy to persist voice-initiated actions alongside text chat.
- **MCP integration**: Generic tool model maps directly to MCP tool protocol if/when needed.
- **Multi-turn workspace editing**: Agent can read → reason → write → verify across multiple tool calls in one turn. No stage gates needed.
- **Thread branching/forking**: Already in current `chat.ts` types (`ThreadForkedPayload`); cleaner to implement on thread/message model.

---

## Success Criteria

```bash
# Thread lifecycle
curl -X POST "$API/trpc/chatThreads.sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","text":"Create a bounce game"}'
# Returns: assistant message with tool calls and text

# Workspace file created by agent
curl "$API/trpc/chatThreads.readWorkspaceFile?gameId=test&filename=document.md"
# Returns: file content written by agent

# HITL flow
# 1. Agent returns askUser tool call
# 2. Client submits answer via chatThreads.submitToolAnswer
# 3. Agent continues from where it left off

# Billing
# SELECT SUM(cost_micros) FROM messages WHERE thread_id = ?
# Matches expected provider usage
```

### Final Checklist
- [x] All chat flows use thread/message model (no stage orchestration)
- [x] `pnpm tsc --noEmit` clean — zero errors
- [x] `pnpm test` passes — no skipped or legacy tests remain
- [x] HITL askUser flow works end-to-end
- [x] Workspace file read/write works through agent tools
- [x] Billing settles per message turn
- [x] Non-chat APIs (games, economy, auth) unaffected
- [x] ~4200 lines of stage infrastructure deleted
- [x] Old D1 tables dropped (no read-only archive tables lingering)
- [x] Zero legacy type exports in shared package
- [x] Zero conversion/compat helpers anywhere in codebase
- [x] `grep -r` for all legacy identifiers returns zero hits across `api/`, `app/`, `shared/`
- [x] Wrangler config has no DO bindings for deleted classes
- [x] A new engineer reading the code would have no idea a stage system ever existed
