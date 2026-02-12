# Chat Streaming Migration — Implementation Plan

## Decision

Emit **AG-UI protocol events** from our Cloudflare Workers backend. Build our **own React hooks and accumulator** (copied from Tambo's patterns, not their packages). Use `@ag-ui/core` as the only external dependency (types-only). Strong contract tests ensure AG-UI compatibility survives upgrades.

### Why This Approach

- **AG-UI is the protocol standard** — just event type definitions + SSE encoding. Tiny dependency.
- **Tambo's value is the design** — thread state machine, content blocks, accumulator pattern. We copy the patterns, not the packages.
- **No SDK coupling** — we don't import `@tambo-ai/react` or `@tambo-ai/typescript-sdk`. If Tambo pivots, we're fine.
- **Fork-ready** — if we ever want Tambo's SDK features (component streaming, JSON Patch props), we copy the relevant code.
- **Contract tests** — the safety net. Our events pass through Tambo's actual `streamReducer` in tests. If AG-UI or Tambo changes, tests catch it.

### What Changes

| Layer | Before | After |
|-------|--------|-------|
| Backend AI call | `generateText()` (blocking) | `streamText()` (streaming) |
| Backend response | JSON (tRPC mutation return) | SSE stream (`text/event-stream`) |
| Event format | None | AG-UI protocol events |
| Frontend data fetch | tRPC polling every 1s | SSE connection + tRPC for mutations |
| Frontend state | `useState` + polling effect | `useReducer` accumulator |
| Message types | Ad-hoc `ChatMessage` | AG-UI-compatible content blocks |
| HITL (askUser) | Polling detects `waiting_for_input` | SSE event triggers UI, tRPC mutation resumes |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                 React (Expo)                 │
│                                             │
│  useStreamingChat(threadId)                 │
│    ├─ SSE client → connects to stream       │
│    ├─ chatReducer(state, event) → new state │
│    └─ returns { thread, sendMessage, ... }  │
│                                             │
│  ChatMessageList / ChatSidebar (existing)   │
└──────────────┬──────────────────────────────┘
               │ SSE (AG-UI events)
               │ tRPC (mutations: send, submitAnswer)
┌──────────────▼──────────────────────────────┐
│          Cloudflare Worker (Hono + tRPC)    │
│                                             │
│  POST /api/chat/stream                      │
│    ├─ streamText() via Vercel AI SDK        │
│    ├─ fullStream → AG-UI event mapper       │
│    ├─ TransformStream → SSE response        │
│    └─ onFinish → persist to D1 + billing    │
│                                             │
│  tRPC mutations (existing, kept):           │
│    ├─ chatThreads.sendMessage (creates       │
│    │   thread if needed, returns streamUrl) │
│    └─ chatThreads.submitToolAnswer          │
└─────────────────────────────────────────────┘
```

### Stream Flow (Happy Path)

```
Client                          Server
  │                               │
  ├─ tRPC sendMessage ──────────► │ insert user msg to D1
  │◄──── { threadId, streamUrl }──│
  │                               │
  ├─ GET /stream?threadId=xxx ──► │ streamText() starts
  │◄──── RUN_STARTED ────────────│
  │◄──── TEXT_MESSAGE_START ─────│
  │◄──── TEXT_MESSAGE_CONTENT ───│ (repeated, token by token)
  │◄──── TEXT_MESSAGE_CONTENT ───│
  │◄──── TOOL_CALL_START ───────│ readFile
  │◄──── TOOL_CALL_ARGS ────────│ (streamed args)
  │◄──── TOOL_CALL_END ─────────│
  │◄──── TEXT_MESSAGE_CONTENT ───│ (more text after tool)
  │◄──── TEXT_MESSAGE_END ───────│
  │◄──── RUN_FINISHED ──────────│ persist to D1 + bill
  │                               │
```

### HITL Flow (askUser)

```
Client                          Server
  │                               │
  │◄──── TOOL_CALL_START ───────│ askUser
  │◄──── TOOL_CALL_ARGS ────────│ { questions: [...] }
  │◄──── TOOL_CALL_END ─────────│
  │◄──── RUN_FINISHED ──────────│ finishReason: 'tool-calls'
  │                               │ (stream closes, thread → waiting)
  │                               │
  │ [user answers in UI]          │
  │                               │
  ├─ tRPC submitToolAnswer ─────► │ insert tool result to D1
  │◄──── { streamUrl } ─────────│
  │                               │
  ├─ GET /stream?threadId=xxx ──► │ streamText() resumes with history
  │◄──── RUN_STARTED ────────────│
  │◄──── ... (continues) ───────│
```

---

## Phase 0: Types & Contract Tests (test-first)

### Goal
Define our data model and AG-UI event mapping. Write contract tests before any implementation.

### Files to Create

**`shared/src/chat/types.ts`** — Our data model (inspired by Tambo)
```typescript
// Thread state machine: idle → streaming → idle | waiting | error
export type ThreadStatus = 'idle' | 'streaming' | 'waiting' | 'error';

export interface ChatThread {
  id: string;
  messages: ChatMessage[];
  status: ThreadStatus;
  error?: { message: string; code?: string };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: ContentBlock[];
  createdAt: number;
}

export type ContentBlock =
  | TextContent
  | ToolUseContent
  | ToolResultContent;

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ToolUseContent {
  type: 'tool-use';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  status: 'streaming' | 'calling' | 'complete';
}

export interface ToolResultContent {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError?: boolean;
}
```

**`shared/src/chat/events.ts`** — AG-UI event types we emit
```typescript
// Subset of AG-UI events we actually use.
// We emit these from our backend; our accumulator consumes them.
// Compatible with @ag-ui/core EventType enum.

export type AgUiEvent =
  | { type: 'RUN_STARTED'; threadId: string; runId: string }
  | { type: 'TEXT_MESSAGE_START'; messageId: string; role: 'assistant' }
  | { type: 'TEXT_MESSAGE_CONTENT'; messageId: string; delta: string }
  | { type: 'TEXT_MESSAGE_END'; messageId: string }
  | { type: 'TOOL_CALL_START'; toolCallId: string; toolName: string; parentMessageId: string }
  | { type: 'TOOL_CALL_ARGS'; toolCallId: string; delta: string }
  | { type: 'TOOL_CALL_END'; toolCallId: string }
  | { type: 'TOOL_CALL_RESULT'; toolCallId: string; result: string; isError?: boolean }
  | { type: 'RUN_FINISHED'; threadId: string; runId: string }
  | { type: 'RUN_ERROR'; message: string; code?: string };
```

**`shared/src/chat/accumulator.ts`** — Event reducer (~200-300 lines)
```typescript
export interface StreamState {
  thread: ChatThread;
  currentMessageId: string | null;
  currentRunId: string | null;
}

export function chatReducer(state: StreamState, event: AgUiEvent): StreamState;
export function initialStreamState(threadId: string): StreamState;
```

### Contract Tests

**`shared/src/chat/__tests__/accumulator.test.ts`**

Test scenarios (each is a recorded AG-UI event sequence → expected state):

1. **Simple text message**: RUN_STARTED → TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT (×N) → TEXT_MESSAGE_END → RUN_FINISHED
2. **Tool call + result**: ... → TOOL_CALL_START → TOOL_CALL_ARGS → TOOL_CALL_END → TOOL_CALL_RESULT → TEXT_MESSAGE_CONTENT → ...
3. **askUser suspension**: ... → TOOL_CALL_START(askUser) → TOOL_CALL_ARGS → TOOL_CALL_END → RUN_FINISHED(tool-calls) → verify thread.status === 'waiting'
4. **Error handling**: RUN_STARTED → RUN_ERROR → verify thread.status === 'error'
5. **Multi-step** (tool → text → tool → text): Full conversation flow
6. **Resume after askUser**: Start from waiting state, new RUN_STARTED → continues

**`shared/src/chat/__tests__/agui-compat.test.ts`** — Compatibility canary

```typescript
// Imports Tambo's actual streamReducer from their source (copied to test fixtures)
// Feeds the SAME event sequences through both our reducer and Tambo's
// Verifies structural equivalence of the output
// This test breaks if: (a) we emit wrong events, or (b) AG-UI spec changes

import { streamReducer as tamboReducer } from '../__fixtures__/tambo-stream-reducer';
import { chatReducer } from '../accumulator';

test.each(scenarios)('scenario %s produces equivalent state', (name, events, expected) => {
  const ourState = events.reduce(chatReducer, initialState);
  // Verify our state matches expected
  expect(ourState.thread.status).toBe(expected.status);
  expect(ourState.thread.messages).toHaveLength(expected.messageCount);
  // etc.
});
```

### Tasks
- [ ] Create `shared/src/chat/types.ts`
- [ ] Create `shared/src/chat/events.ts`
- [ ] Create `shared/src/chat/accumulator.ts`
- [ ] Create `shared/src/chat/__tests__/accumulator.test.ts` with all 6 scenarios
- [ ] Copy Tambo's `streamReducer` to test fixtures for compatibility canary
- [ ] Create `shared/src/chat/__tests__/agui-compat.test.ts`
- [ ] All tests pass

---

## Phase 1: Backend SSE Streaming

### Goal
Replace `generateText()` with `streamText()`. Add SSE endpoint that emits AG-UI events.

### Files to Create/Modify

**`api/src/chat/stream-handler.ts`** — NEW: SSE streaming endpoint
```typescript
// Maps streamText().fullStream chunks → AG-UI SSE events
// Handles: text deltas, tool calls, tool results, askUser suspension
// Persists final messages to D1 in onFinish callback
// Bills usage in onFinish callback

export async function handleChatStream(
  ctx: ChatHandlerContext,
  threadId: string,
): Promise<Response> {
  // Returns Response with Content-Type: text/event-stream
  // Body is a ReadableStream of AG-UI events
}
```

**`api/src/chat/agui-mapper.ts`** — NEW: Vercel AI SDK → AG-UI event mapping
```typescript
// Maps TextStreamPart types to AgUiEvent types:
// text-start       → TEXT_MESSAGE_START
// text-delta       → TEXT_MESSAGE_CONTENT
// text-end         → TEXT_MESSAGE_END
// tool-input-start → TOOL_CALL_START
// tool-input-delta → TOOL_CALL_ARGS
// tool-input-end   → TOOL_CALL_END
// tool-result      → TOOL_CALL_RESULT
// finish           → RUN_FINISHED
// error            → RUN_ERROR

export function mapStreamPartToAgUi(
  part: TextStreamPart,
  context: { runId: string; messageId: string; threadId: string }
): AgUiEvent | null;
```

**`api/src/trpc/routes/chat-threads.ts`** — MODIFY: Add stream URL to sendMessage response
- `sendMessage` returns `{ threadId, streamUrl }` instead of blocking on generation
- New Hono route `GET /api/chat/stream/:threadId` for SSE connection
- `submitToolAnswer` returns `{ streamUrl }` so client can reconnect for resumed generation

**`api/src/chat/chat-handler.ts`** — MODIFY: Keep for D1 operations, remove generation logic
- `advanceThread` becomes: insert user message → return threadId (generation happens in stream handler)
- `resumeThread` becomes: insert tool result → return threadId
- `runGeneration` moves to `stream-handler.ts`

### Tasks
- [x] Create `api/src/chat/agui-mapper.ts` with unit tests (9/9 passing)
- [x] Create `api/src/chat/stream-handler.ts`
- [x] Add Hono SSE route `GET /api/chat/stream` (query params: token, threadId)
- [x] Modify `sendMessage` tRPC to return `{ threadId, streamUrl }` (non-blocking)
- [x] Modify `submitToolAnswer` tRPC to return `{ threadId, streamUrl }`
- [x] Move persistence + billing to `onFinish` callback (in stream-handler.ts)
- [x] Handle askUser suspension (detect tool-call with no execute → RUN_FINISHED)
- [ ] Integration test: send message → receive AG-UI event stream → verify events (deferred — requires live Workers env)

---

## Phase 2: Frontend Streaming Hook

### Goal
Replace polling-based `useEditorChat` with streaming `useStreamingChat`.

### Files to Create/Modify

**`app/lib/chat/useStreamingChat.ts`** — NEW: Main hook
```typescript
export function useStreamingChat(threadId: string | null) {
  // 1. useReducer with chatReducer + initialStreamState
  // 2. When sendMessage called: tRPC mutation → get streamUrl → connect SSE
  // 3. SSE events feed into dispatch(event)
  // 4. When askUser detected (thread.status === 'waiting'): expose pendingQuestions
  // 5. When submitAnswer called: tRPC mutation → get streamUrl → reconnect SSE
  
  return {
    thread: ChatThread;              // Current thread state
    sendMessage: (text: string) => void;
    submitAnswer: (toolCallId: string, answer: string) => void;
    isStreaming: boolean;             // thread.status === 'streaming'
    isWaiting: boolean;              // thread.status === 'waiting'
    error: string | null;
  };
}
```

**`app/lib/chat/sse-client.ts`** — NEW: SSE connection with reconnection
```typescript
// Thin wrapper around EventSource (web) or fetch streaming (native fallback)
// Parses SSE data lines into AgUiEvent objects
// Handles reconnection with exponential backoff
// Handles connection cleanup on unmount

export function createSSEClient(url: string): {
  events: AsyncIterable<AgUiEvent>;
  close: () => void;
};
```

**`app/components/create-game/useEditorChat.ts`** — DELETE (after migration)

**`app/components/editor/useEditorChatSession.ts`** — MODIFY: Use new hook

**`app/components/create-game/ChatMessageList.tsx`** — MODIFY: Consume new content block types

### Tasks
- [ ] Create `app/lib/chat/sse-client.ts`
- [ ] Create `app/lib/chat/useStreamingChat.ts`
- [ ] Update `useEditorChatSession.ts` to use `useStreamingChat`
- [ ] Update `ChatMessageList.tsx` to render `ContentBlock[]` instead of ad-hoc `ChatMessage`
- [ ] Verify streaming text renders token-by-token
- [ ] Verify tool calls show status ("Calling readFile...")
- [ ] Verify askUser HITL flow works end-to-end
- [ ] Remove `useEditorChat.ts` and polling queries

---

## Phase 3: Cleanup & Polish

### Tasks
- [ ] Remove all `refetchInterval: 1000` polling from chat-related queries
- [ ] Remove `convertToChatMessage` and old `ChatMessage` type
- [ ] Update AGENTS.md to reflect new streaming architecture
- [ ] Verify no regressions in editor chat flow
- [ ] Run full type check (`tsc --noEmit`)

---

## Testing Strategy (The Safety Net)

### Test Pyramid

| Level | What | How Many | Purpose |
|-------|------|----------|---------|
| **Unit** | Accumulator reducer | ~15 tests | Every event type, every state transition |
| **Unit** | AG-UI mapper | ~10 tests | Every `TextStreamPart` → `AgUiEvent` mapping |
| **Contract** | AG-UI compatibility | ~6 tests | Event sequences produce correct state |
| **Integration** | Stream endpoint | ~4 tests | Send message → receive SSE → verify events |
| **E2E** | Full chat flow | ~3 tests | User → stream → tool → askUser → resume |

### Upgrade Canary

When bumping `@ag-ui/core`:
1. Contract tests run automatically (CI)
2. If AG-UI changed event shapes, type errors surface immediately (our events import their types)
3. If Tambo changed accumulator behavior, the compatibility canary catches it

### What We Test vs What We Don't

| We Test | We Don't Test |
|---------|--------------|
| Our accumulator produces correct state | Tambo's SDK internals |
| Our SSE events are valid AG-UI | AG-UI protocol itself |
| Our mapper covers all `streamText` chunks | Vercel AI SDK internals |
| askUser HITL round-trip | Other tools' execution (already tested) |

---

## Dependencies

### Added
- `@ag-ui/core` — AG-UI event type definitions (types only, ~5KB)

### Removed (eventually)
- None removed, but polling queries eliminated

### Unchanged
- `ai` (Vercel AI SDK) — already installed, just switching `generateText` → `streamText`
- tRPC — kept for mutations (sendMessage, submitToolAnswer)
- D1 — kept for persistence

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| CF Workers SSE streaming limits | Low | Workers support streaming natively; 30s default timeout extendable |
| React Native SSE issues | Medium | `sse-client.ts` abstracts transport; fallback to `fetch` ReadableStream |
| `streamText` behavior differences from `generateText` | Low | Same model, same tools, same prompts; just streamed |
| askUser HITL timing (stream closes before UI renders) | Medium | Thread status persisted to D1; frontend can recover from any state |
| Tool execution order in multi-step | Low | `streamText` with `stopWhen` handles step ordering same as `generateText` |
