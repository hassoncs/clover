# Chat Threads + Event Log Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add persistent chat threads and append-only chat events with shared per-game workspace, enabling thread switching and future agent swarms.

**Architecture:** `chat_threads` = stable conversation identity. `chat_events` = append-only message log. `agent_runs` = execution instances linked to threads. Workspace files stored in R2 at `games/{gameId}/workspace/`. No migrations — wipe and recreate schema.

**Tech Stack:** Cloudflare Workers + D1 + R2, tRPC, Zod, React Native (Expo), Jotai.

---

## Task 1: D1 schema update (destructive — no migration needed)

**Files:**
- Modify: `api/schema.sql`

**Step 1: Add new tables to schema.sql**

```sql
-- Chat Threads - stable conversation identity
CREATE TABLE IF NOT EXISTS chat_threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  game_id TEXT NOT NULL REFERENCES games(id),
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  parent_thread_id TEXT REFERENCES chat_threads(id),
  parent_event_seq INTEGER,
  last_event_seq INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_user ON chat_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_game ON chat_threads(game_id);

-- Chat Events - append-only message log
CREATE TABLE IF NOT EXISTS chat_events (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  role TEXT,
  content_json TEXT NOT NULL,
  run_id TEXT REFERENCES agent_runs(id),
  parent_event_id TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(thread_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_chat_events_thread_seq ON chat_events(thread_id, seq);

-- Chat Summaries - compaction checkpoints (empty for now)
CREATE TABLE IF NOT EXISTS chat_summaries (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  covers_through_seq INTEGER NOT NULL,
  summary_text TEXT NOT NULL,
  token_count INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_summaries_thread ON chat_summaries(thread_id);
```

**Step 2: Modify existing tables**

- Add `thread_id TEXT REFERENCES chat_threads(id)` to `agent_runs`.
- Recreate `agent_steps` with `'chat'` added to stage CHECK constraint.

**Step 3: Wipe local D1 and re-apply schema**

```bash
# Wrangler will recreate from schema.sql on next dev start
rm -rf api/.wrangler/state/v3/d1
pnpm svc:stop api && pnpm svc:ensure api
```

**Step 4: Verify**

Run `pnpm svc:ensure api` — confirm no D1 errors in logs.

**Step 5: Commit**

```
feat: add chat_threads, chat_events, chat_summaries tables
```

---

## Task 2: Shared types + Zod schemas

**Files:**
- Create: `shared/src/types/chat.ts`
- Modify: `shared/src/index.ts` (re-export)

**Step 1: Define types**

```typescript
// shared/src/types/chat.ts
import { z } from 'zod';

export const ChatEventTypeSchema = z.enum([
  'user_message',
  'assistant_message',
  'tool_call',
  'tool_result',
  'file_updated',
  'system',
  'summary_checkpoint',
  'thread_forked',
]);
export type ChatEventType = z.infer<typeof ChatEventTypeSchema>;

export const ChatEventPayloadSchema = z.discriminatedUnion('type', [
  z.object({ version: z.literal(1), type: z.literal('user_message'), text: z.string() }),
  z.object({ version: z.literal(1), type: z.literal('assistant_message'), text: z.string(), model: z.string().optional(), runId: z.string().optional() }),
  z.object({ version: z.literal(1), type: z.literal('tool_call'), name: z.string(), args: z.record(z.unknown()) }),
  z.object({ version: z.literal(1), type: z.literal('tool_result'), name: z.string(), ok: z.boolean(), result: z.unknown() }),
  z.object({ version: z.literal(1), type: z.literal('file_updated'), filename: z.string(), key: z.string(), bytes: z.number(), contentType: z.string().optional() }),
  z.object({ version: z.literal(1), type: z.literal('system'), text: z.string(), level: z.enum(['info', 'warn', 'error']).optional() }),
  z.object({ version: z.literal(1), type: z.literal('summary_checkpoint'), summaryId: z.string(), coversThroughSeq: z.number() }),
  z.object({ version: z.literal(1), type: z.literal('thread_forked'), parentThreadId: z.string(), parentEventSeq: z.number() }),
]);
export type ChatEventPayload = z.infer<typeof ChatEventPayloadSchema>;

export interface ChatThread {
  id: string;
  userId: string;
  gameId: string;
  title: string | null;
  status: 'active' | 'archived';
  parentThreadId: string | null;
  parentEventSeq: number | null;
  lastEventSeq: number;
  createdAt: number;
  updatedAt: number;
}

export interface ChatEvent {
  id: string;
  threadId: string;
  seq: number;
  eventType: ChatEventType;
  role: string | null;
  payload: ChatEventPayload;
  runId: string | null;
  parentEventId: string | null;
  createdAt: number;
}
```

**Step 2: Export from shared index**

**Step 3: Verify** — `pnpm tsc --noEmit`

**Step 4: Commit**

```
feat: add chat thread and event types in shared package
```

---

## Task 3: R2 workspace support in ArtifactService + tools

**Files:**
- Modify: `api/src/agent/artifact-service.ts`
- Modify: `api/src/agent/engine/tools.ts`

**Step 1: Add workspace methods to ArtifactService**

```typescript
async storeWorkspaceFile(params: { gameId: string; filename: string; data: string; contentType?: string }): Promise<{ key: string }> {
  const key = `games/${params.gameId}/workspace/${params.filename}`;
  await this.bucket.put(key, params.data, {
    httpMetadata: { contentType: params.contentType ?? 'text/plain' },
  });
  return { key };
}

async readWorkspaceFile(params: { gameId: string; filename: string }): Promise<{ data: string } | null> {
  const key = `games/${params.gameId}/workspace/${params.filename}`;
  const obj = await this.bucket.get(key);
  if (!obj) return null;
  return { data: await obj.text() };
}
```

**Step 2: Update readFile/writeFile tools to use workspace**

- Change from `storeStepArtifact(runId, stepIndex, filename)` to `storeWorkspaceFile(gameId, filename)`.
- Add `gameId` to `StageExecutionContext`.
- If `gameId` is missing, fall back to run-scoped storage.

**Step 3: Verify** — LSP diagnostics on changed files.

**Step 4: Commit**

```
feat: add game workspace R2 methods and update tools
```

---

## Task 4: Chat event store + tRPC routers

**Files:**
- Create: `api/src/chat/chat-event-store.ts`
- Create: `api/src/trpc/routes/chat-threads.ts`
- Modify: `api/src/trpc/index.ts` (add router)
- Modify: `api/src/trpc/routes/agent-runs.ts` (accept threadId)

**Step 1: ChatEventStore**

```typescript
class ChatEventStore {
  constructor(private db: D1Database) {}

  async appendEvent(threadId: string, eventType: string, role: string | null, payload: ChatEventPayload, runId?: string): Promise<ChatEvent> {
    // BEGIN IMMEDIATE transaction
    // UPDATE chat_threads SET last_event_seq = last_event_seq + 1, updated_at = ? WHERE id = ?
    // Read back last_event_seq
    // INSERT INTO chat_events
    // COMMIT
  }

  async getEventsAfter(threadId: string, afterSeq: number, limit?: number): Promise<ChatEvent[]> { ... }
  async getEventsBefore(threadId: string, beforeSeq: number, limit?: number): Promise<ChatEvent[]> { ... }
}
```

**Step 2: tRPC router for threads**

- `createThread({ gameId, title? })` — creates thread + game ownership check.
- `listThreads({ gameId?, limit?, offset? })` — lists user's threads.
- `getThread({ threadId })` — returns thread + recent events.

**Step 3: tRPC router for events**

- `appendUserMessage({ threadId, text })` — appends user_message event.
- `getEvents({ threadId, afterSeq?, beforeSeq?, limit? })` — paginated event replay.

**Step 4: Update createRun to accept threadId**

**Step 5: Verify + commit**

```
feat: add chat event store and thread/event tRPC routers
```

---

## Task 5: Coordinator/Worker emit chat events

**Files:**
- Modify: `api/src/agent/RunCoordinatorDO.ts`
- Modify: `api/src/agent/RunStepWorkerDO.ts`
- Modify: `api/src/agent/engine/tools.ts`

**Step 1: Load threadId in coordinator state**

**Step 2: After AI responds, emit `assistant_message` chat event**

**Step 3: On writeFile tool execution, emit `file_updated` chat event**

**Step 4: On tool calls, emit `tool_call` + `tool_result` chat events**

**Step 5: Broadcast chat events via WebSocket (new message type or extend existing)**

**Step 6: Verify + commit**

```
feat: emit chat events from coordinator and worker
```

---

## Task 6: Frontend — thread switching + event replay

**Files:**
- Create: `app/components/create-game/useThreads.ts`
- Create: `app/components/create-game/ThreadList.tsx`
- Modify: `app/components/create-game/useCreateGameChat.ts`
- Modify: `app/components/create-game/SharedDocumentPanel.tsx`
- Modify: `app/app/create-game.tsx`

**Step 1: useThreads hook**

- `createThread(gameId)` / `listThreads(gameId)` / `selectThread(threadId)`
- Returns `threads`, `activeThread`, `selectThread`, `createThread`

**Step 2: ThreadList sidebar**

- Small panel (left of chat on web, or drawer on native)
- Shows thread titles, creation dates
- Tap to switch active thread

**Step 3: Update useCreateGameChat**

- On thread switch: fetch chat_events, replay into ChatMessage[]
- On send: append user_message event, then create/start run with threadId
- On AI response events: messages come from chat_events stream

**Step 4: SharedDocumentPanel reads workspace**

- Fetch `document.md` content via tRPC query (readWorkspaceFile)
- Refetch on `file_updated` events

**Step 5: Update create-game.tsx layout**

- Three-column on web: [thread list | chat | document]
- Two-column on narrow: [thread list toggle | chat+doc]

**Step 6: Verify + commit**

```
feat: add thread switching UI with event replay
```

---

## Task 7: Tests

**Files:**
- Create: `api/src/trpc/routes/__tests__/chat-threads.test.ts`
- Create: `api/src/trpc/routes/__tests__/chat-events.test.ts`

**Step 1: Thread CRUD tests**

**Step 2: Event append + seq ordering tests**

**Step 3: Run creation with threadId test**

**Step 4: Workspace read/write test**

**Step 5: Commit**

```
test: add chat thread and event tests
```

---

## Task 8: End-to-end verification

**Steps:**
1. Wipe D1: `rm -rf api/.wrangler/state/v3/d1`
2. `pnpm dev`
3. Sign in → tap + → creates thread automatically
4. Send message → AI responds → writes document.md
5. Create second thread → switch → see empty chat + empty doc
6. Switch back → see original messages + document
7. `pnpm tsc --noEmit` — clean

---

## Parallel execution opportunities

```
Task 1 (schema)
  ├── Task 2 (shared types)     ← parallel
  └── Task 3 (R2 workspace)     ← parallel
        ↓
      Task 4 (event store + routers)
        ├── Task 5 (coordinator emit)  ← parallel
        └── Task 6 (frontend)          ← parallel
              ↓
            Task 7 (tests)
              ↓
            Task 8 (verification)
```

---

## Event payload reference

| Type | Payload |
|------|---------|
| `user_message` | `{ version: 1, type: "user_message", text }` |
| `assistant_message` | `{ version: 1, type: "assistant_message", text, model?, runId? }` |
| `tool_call` | `{ version: 1, type: "tool_call", name, args }` |
| `tool_result` | `{ version: 1, type: "tool_result", name, ok, result }` |
| `file_updated` | `{ version: 1, type: "file_updated", filename, key, bytes, contentType? }` |
| `system` | `{ version: 1, type: "system", text, level? }` |
| `summary_checkpoint` | `{ version: 1, type: "summary_checkpoint", summaryId, coversThroughSeq }` |
| `thread_forked` | `{ version: 1, type: "thread_forked", parentThreadId, parentEventSeq }` |
