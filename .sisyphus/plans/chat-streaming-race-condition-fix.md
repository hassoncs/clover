# Chat Streaming — Tambo Architecture Migration

## Problem

Three bugs in the editor chat:
1. **First message on new game requires two sends** — threadId null→UUID transition kills active SSE stream
2. **Duplicate user messages** — optimistic message + persisted query = two sources of truth
3. **Tool calls render outside assistant message grouping** — wrong CSS styling

## Architecture Decision

**Adopt Tambo's complete streaming architecture.** Their patterns are battle-tested and solve all three bugs structurally, not with band-aids.

### Key Tambo Patterns to Adopt:
- **Single source of truth**: Reducer owns ALL messages. No separate useQuery + merge.
- **PLACEHOLDER_THREAD_ID**: New threads start as "placeholder". RUN_STARTED atomically migrates messages to real thread.
- **LOAD_THREAD_MESSAGES**: Persisted messages loaded INTO the reducer (with skipIfStreaming guard).
- **Split contexts**: Separate State/Dispatch/ThreadManagement contexts for render optimization.
- **Synthetic AG-UI events**: User messages dispatched as TEXT_MESSAGE_START/CONTENT/END events (not a custom ADD_USER_MESSAGE).
- **threadMap**: Multi-thread support in state (`Record<string, ThreadState>`).

### What NOT to Copy from Tambo:
- Component rendering (tambo.component.* events) — Tambo-specific
- Tool schema unstrictification — Tambo-specific  
- Tool executor / throttled streamable — we use server-side tool execution
- Auth state hooks — we have our own auth
- Thread name auto-generation — not needed yet

## File Plan

### New Files

| File | Purpose | Tambo Equivalent |
|------|---------|-----------------|
| `app/lib/chat/ChatStreamProvider.tsx` | Provider with split contexts, reducer, ThreadSyncManager | `tambo-v1-stream-context.tsx` |
| `app/lib/chat/stream-reducer.ts` | StreamState, threadMap, all actions, event accumulation | `event-accumulator.ts` |
| `app/lib/chat/useSendMessage.ts` | React Query mutation for sending + SSE consumption | `use-tambo-v1-send-message.ts` |
| `app/lib/chat/useChatMessages.ts` | Read messages from context (no merge) | `use-tambo-v1-messages.ts` |

### Modified Files

| File | Change |
|------|--------|
| `app/components/editor/useEditorChatSession.ts` | Use new hooks from ChatStreamProvider instead of useStreamingChat |
| `app/components/editor/ChatSidebar.tsx` | Wrap with ChatStreamProvider |
| `app/components/create-game/ChatMessage.tsx` | Fix tool call rendering styles |

### Deleted/Deprecated Files

| File | Reason |
|------|--------|
| `app/lib/chat/useStreamingChat.ts` | Replaced by ChatStreamProvider + useSendMessage + useChatMessages |

### Unchanged Files

| File | Reason |
|------|--------|
| `shared/src/chat/accumulator.ts` | Keep shared chatReducer — wrap at app level |
| `app/lib/chat/sse-client.ts` | Keep fetch-based SSE — just dispatch through new context |
| `app/components/create-game/ChatMessageList.tsx` | No changes needed |
| `app/components/create-game/ChatConversation.tsx` | No changes needed |

## Implementation Order

### Phase 1: stream-reducer.ts (no dependencies)

Port Tambo's event-accumulator.ts adapted for our types:

```typescript
// State shape
interface ThreadState {
  thread: ChatThread;  // from shared/chat/types
  streaming: { status: 'idle' | 'streaming'; runId?: string };
}

interface StreamState {
  threadMap: Record<string, ThreadState>;
  currentThreadId: string;
}

// Actions
type StreamAction =
  | { type: 'EVENT'; event: AgUiEvent; threadId: string }
  | { type: 'INIT_THREAD'; threadId: string }
  | { type: 'SET_CURRENT_THREAD'; threadId: string }
  | { type: 'START_NEW_THREAD'; threadId: string }
  | { type: 'LOAD_THREAD_MESSAGES'; threadId: string; messages: ChatMessage[]; skipIfStreaming?: boolean }
  | { type: 'RESET_THREAD'; threadId: string }
  | { type: 'ADD_USER_MESSAGE'; threadId: string; message: ChatMessage };

const PLACEHOLDER_THREAD_ID = 'pending';
```

Key: the EVENT handler checks for RUN_STARTED and migrates placeholder messages atomically.
Wrap existing `chatReducer` from shared for AG-UI event processing.

### Phase 2: ChatStreamProvider.tsx (depends on Phase 1)

```typescript
// Split contexts
const StreamStateContext = createContext<StreamState | null>(null);
const StreamDispatchContext = createContext<Dispatch<StreamAction> | null>(null);
const ThreadManagementContext = createContext<ThreadManagement | null>(null);

// Provider
function ChatStreamProvider({ gameId, children }) {
  const [state, dispatch] = useReducer(streamReducer, createInitialState());
  // ThreadSyncManager fetches persisted messages via LOAD_THREAD_MESSAGES
  // Thread management functions: initThread, switchThread, startNewThread
}

// Export hooks
export function useStreamState(): StreamState { ... }
export function useStreamDispatch(): Dispatch<StreamAction> { ... }  
export function useThreadManagement(): ThreadManagement { ... }
```

### Phase 3: useSendMessage.ts (depends on Phase 2)

```typescript
export function useSendMessage(threadId: string) {
  const dispatch = useStreamDispatch();
  const state = useStreamState();
  
  const sendMessageMutation = trpc.chatThreads.sendMessage.useMutation();
  
  return useCallback(async (text: string, gameId: string) => {
    // 1. Dispatch optimistic user message as ADD_USER_MESSAGE
    // 2. Call sendMessage mutation → get { threadId, streamUrl }
    // 3. Connect SSE, dispatch events through context
    // 4. On RUN_STARTED: reducer migrates placeholder → real thread
    // 5. On error: dispatch RUN_ERROR
  }, [dispatch, ...]);
}
```

### Phase 4: useChatMessages.ts (depends on Phase 2)

```typescript
export function useChatMessages(threadId: string) {
  const state = useStreamState();
  const threadState = state.threadMap[threadId];
  return useMemo(() => ({
    messages: threadState?.thread.messages ?? [],
    isStreaming: threadState?.streaming.status === 'streaming',
    // ... derived state
  }), [threadState]);
}
```

### Phase 5: Wire up useEditorChatSession + ChatSidebar

- ChatSidebar wraps children in `<ChatStreamProvider gameId={gameId}>`
- useEditorChatSession uses useThreadManagement, useSendMessage, useChatMessages
- Remove threadId useState — it lives in the context now (currentThreadId)
- Remove the `setThreadId(resolvedThreadId)` call — reducer handles it atomically

### Phase 6: Fix tool call rendering in ChatMessage.tsx (independent)

Already done — just keep the toolCallRow/toolCallText styles.

### Phase 7: Delete useStreamingChat.ts

Only after everything is wired up and verified.

## Verification Plan

1. Playwright: Create new game → send first message → verify SSE not aborted
2. Playwright: Verify AI responds on first message (no second send needed)
3. Playwright: Verify NO duplicate user messages
4. Playwright: Verify tool calls grouped under assistant with left-border
5. Playwright: Send second message on same thread → verify works
6. Playwright: Navigate to existing game with history → verify messages load
7. Run existing integration tests
8. Repeat Playwright tests 3x for consistency
