# Chat Streaming Race Condition Fix

## Problem

Two bugs in the editor chat:

### Bug #1: First message on new game requires two sends
**Root cause:** When `useEditorChatSession` sends the first message on a new game:
1. `sendMessage()` calls the API → gets `{ threadId, streamUrl }`
2. `connectToStream(streamUrl)` opens the SSE connection
3. `setThreadId(resolvedThreadId)` fires in `useEditorChatSession`
4. The `useEffect` watching `threadId` in `useStreamingChat` fires, calling `dispatch({ type: "RESET" })` and `sseRef.current?.close()` — **killing the active SSE stream**

Network trace confirms: `api/chat/stream?threadId=... => [FAILED] net::ERR_ABORTED` (twice).

### Bug #2: Tool calls render outside assistant message grouping
Tool call blocks (`otherToolBlocks`) render with `systemWrapper` style (centered, width 100%) instead of being wrapped inside the assistant's left-border container. They appear as siblings of the message rather than children.

## Architecture Decision

**Adopt Tambo's placeholder thread pattern** — minimal diff from current code, same `useReducer` + AG-UI event model.

Key insight from Tambo: **Don't change `threadId` during an active stream.** Instead:
- Start with a placeholder/pending thread ID
- Accumulate events into the pending thread's state
- When `RUN_STARTED` arrives with the real threadId, the **reducer** atomically migrates messages from pending → real thread
- The component-level `threadId` only changes when the mutation completes and the stream is done

## Implementation Plan

### Phase 1: Fix Bug #1 — threadId race condition

#### 1a. Update `useStreamingChat` to not tear down on first threadId assignment

The simplest fix: `sendMessage()` already returns the real threadId. The problem is that `useEditorChatSession` calls `setThreadId()` which triggers the `useEffect` reset. 

**Change in `useStreamingChat.ts`:**
- Track previous threadId in a ref
- In the `useEffect` on `[threadId]`, detect "null/pending → real UUID" transition
- When an SSE connection is active during this transition, just update the thread ID in the reducer state (via a new `MIGRATE_THREAD` action) without closing the SSE connection
- Only do full teardown when switching between two real thread IDs

```typescript
// New action type
type StreamAction =
  | AgUiEvent
  | { type: "RESET"; threadId: string }
  | { type: "ADD_USER_MESSAGE"; message: ChatMessage }
  | { type: "MIGRATE_THREAD"; fromThreadId: string; toThreadId: string };
```

**Change in `streamStateReducer`:**
- Handle `MIGRATE_THREAD`: Copy current messages from pending thread into a new thread with the real ID
- This mirrors Tambo's `RUN_STARTED` → placeholder migration logic

**Change in the `useEffect([threadId])`:**
```typescript
useEffect(() => {
  const prevId = prevThreadIdRef.current;
  prevThreadIdRef.current = threadId;

  // First thread assignment while streaming — migrate, don't tear down
  const isFirstAssignment = 
    (prevId === null || prevId === "pending") && 
    threadId !== null && 
    threadId !== "pending";

  if (isFirstAssignment && sseRef.current) {
    // Just update the thread ID in state, keep SSE alive
    dispatch({ type: "MIGRATE_THREAD", fromThreadId: prevId ?? "pending", toThreadId: threadId });
    return;
  }

  // Normal thread switch — full teardown
  dispatch({ type: "RESET", threadId: threadId ?? "pending" });
  setIsSending(false);
  setStreamError(null);
  sseRef.current?.close();
  sseRef.current = null;
  currentStreamUrlRef.current = null;
  isConnectingRef.current = false;
}, [threadId]);
```

#### 1b. Update reducer to handle MIGRATE_THREAD

In `streamStateReducer`:
```typescript
if (action.type === "MIGRATE_THREAD") {
  return {
    ...state,
    thread: {
      ...state.thread,
      id: action.toThreadId,
    },
  };
}
```

Simple — just update the thread ID. Messages are already accumulated correctly.

### Phase 2: Fix Bug #2 — Tool call rendering

#### 2a. Wrap tool blocks inside the agent container

In `ChatMessage.tsx`, lines 690-708, the `otherToolBlocks` use `systemWrapper` style. Change to render them inside the agent container with the left-border styling:

**Before:**
```tsx
{!isUser &&
  otherToolBlocks.map((block) => (
    <View key={...} style={styles.systemWrapper}>
      <View style={styles.systemContainer}>
        <Ionicons name="construct-outline" ... />
        <Text style={styles.systemText}>
          {getToolStatusLabel(block.toolName, block.status)}
        </Text>
      </View>
    </View>
  ))}
```

**After:**
```tsx
{!isUser &&
  otherToolBlocks.map((block) => (
    <View key={...} style={styles.toolCallRow}>
      <Ionicons name="construct-outline" ... />
      <Text style={styles.toolCallText}>
        {getToolStatusLabel(block.toolName, block.status)}
      </Text>
    </View>
  ))}
```

Add new styles:
```typescript
toolCallRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingLeft: 12,
  paddingVertical: 4,
  borderLeftWidth: 2,
  borderLeftColor: "#3F3F46",
  marginTop: 4,
},
toolCallText: {
  fontSize: 13,
  color: "#71717A",
  marginLeft: 6,
},
```

This groups tool calls visually under the same left-border as the assistant text bubble.

### Phase 3: Verification

1. Create a new game via Playwright
2. Send first message — verify SSE stream is NOT aborted
3. Verify AI response appears without needing a second message
4. Verify tool calls appear grouped under assistant message
5. Send a second message on the same thread — verify it still works
6. Repeat 3 times for consistency

## Files to Change

| File | Change |
|------|--------|
| `app/lib/chat/useStreamingChat.ts` | Add `MIGRATE_THREAD` action, ref tracking, conditional teardown |
| `app/components/create-game/ChatMessage.tsx` | Restyle tool call blocks to group under agent container |

## Files NOT Changed (minimal diff)

- `shared/src/chat/accumulator.ts` — No changes needed to the shared reducer
- `app/components/editor/useEditorChatSession.ts` — No changes, the `setThreadId` call is fine now
- `app/lib/chat/sse-client.ts` — No changes needed
- `app/components/create-game/ChatMessageList.tsx` — No changes needed

## Risk Assessment

- **Low risk**: The `MIGRATE_THREAD` action is a simple ID rename on an existing state object
- **Low risk**: The tool call restyling is purely visual
- **Testing**: Existing integration tests should still pass since the shared `chatReducer` is untouched
