# Chat Streaming Migration: Option B vs Option C

## Context

Our current chat system uses **polling** — the frontend hits `getThread` and `getMessages` every 1 second via tRPC. The backend runs `generateText()` (Vercel AI SDK) synchronously, persists everything to D1, and the frontend eventually picks it up. Users see a "Thinking..." shimmer until the full response is ready.

We want streaming. The question is how.

After analyzing Tambo's React SDK, we identified two viable paths:

- **Option B**: Implement the AG-UI protocol on our Cloudflare Workers backend so Tambo's React SDK works against it
- **Option C**: Adopt Tambo's data model (thread/message/content types), build our own React hooks with SSE streaming

This document compares the two. We're doing at least C, and possibly B on top.

---

## What We're Replacing

| Current | Target |
|---------|--------|
| `generateText()` (blocking) | `streamText()` (streaming) |
| tRPC polling every 1s | SSE stream or tRPC subscription |
| "Thinking..." shimmer | Token-by-token text streaming |
| No tool call visibility | Real-time tool status ("Calling readFile...") |
| `useEditorChat.ts` (261 lines, polling) | New streaming-aware hook |

---

## Option B: Implement AG-UI Protocol on Our Backend

### What This Means

We'd add an SSE endpoint to our Cloudflare Worker that emits AG-UI-compatible events. Tambo's `@tambo-ai/react` SDK would connect to our backend instead of Tambo's cloud.

AG-UI is an event protocol with ~15 event types:

| Event | Purpose |
|-------|---------|
| `RUN_STARTED` | AI generation begins |
| `TEXT_MESSAGE_START` | New assistant message |
| `TEXT_MESSAGE_CONTENT` | Streaming text delta |
| `TEXT_MESSAGE_END` | Message complete |
| `TOOL_CALL_START` | Tool invocation begins |
| `TOOL_CALL_ARGS` | Streaming tool arguments (partial JSON) |
| `TOOL_CALL_END` | Tool call complete |
| `RUN_FINISHED` | Generation done |
| `RUN_ERROR` | Generation failed |
| `CUSTOM` | Extension point (Tambo uses for components) |

Transport: Server-Sent Events (SSE) over HTTP.

### What We'd Build

1. **SSE endpoint** on CF Workers: `POST /api/chat/stream` → returns `text/event-stream`
2. **Event emitter** wrapping Vercel AI SDK's `streamText()` — map SDK callbacks to AG-UI events
3. **Thread/message persistence** — still write to D1, but stream events to the client simultaneously
4. **HITL handling** — emit `tambo.run.awaiting_input` custom event when `askUser` tool is called

### Pros

| Advantage | Detail |
|-----------|--------|
| **Free React SDK** | Tambo's `useTambo()` hook handles streaming state, partial JSON parsing, component rendering, tool status computation — ~1800 lines of battle-tested accumulator logic we don't write |
| **Partial JSON for tools** | Tool arguments render in real-time as the AI streams them. Built into Tambo's SDK via `partial-json` |
| **Component streaming** | JSON Patch-based component prop updates. If we ever want "live-updating game preview while AI edits," this is the foundation |
| **AG-UI ecosystem** | If AG-UI becomes a standard (it's being pushed by CopilotKit/Tambo), other tools and UIs can connect to our backend |

### Cons

| Disadvantage | Detail |
|--------------|--------|
| **Tight SDK coupling** | `@tambo-ai/react` imports from `@tambo-ai/typescript-sdk` which has its own client, types, and API expectations. We'd depend on their package structure staying compatible |
| **Custom event surface** | Tambo extends AG-UI with custom events (`tambo.component.start`, `tambo.component.props_delta`, `tambo.run.awaiting_input`). We'd need to emit these exactly right or their SDK breaks |
| **Provider complexity** | Tambo's provider is 4 nested providers (Client, Registry, Stream, Interactable). We'd need to configure all of them, likely with a mock/custom client that points to our endpoint |
| **Dependency weight** | `@tambo-ai/react` pulls in `@tambo-ai/typescript-sdk`, `@ag-ui/core`, `@ag-ui/encoder`, `partial-json`, `fast-json-patch`. That's a lot of dependencies for a chat UI |
| **Version fragility** | If Tambo changes their custom event format or SDK internals, we break. They're pre-1.0 |
| **Overkill for our needs** | We have 3 tools (readFile, writeFile, askUser). Tambo's SDK handles client-side tool execution, component streaming, MCP sampling, interactable components — features we don't need yet |
| **React Native compatibility** | Tambo's SDK is designed for web React. Our app is Expo/React Native. SSE handling, provider structure, and any DOM assumptions could cause issues |

### Effort Estimate

| Task | Size |
|------|------|
| SSE endpoint on CF Workers | Small (CF Workers supports streaming responses natively) |
| Map `streamText()` callbacks → AG-UI events | Medium |
| Configure Tambo SDK with custom endpoint | Medium-Large (fight their client assumptions) |
| HITL via custom events | Medium |
| React Native compatibility testing | Unknown (could be trivial or painful) |
| **Total** | **~2-3 days, with RN risk** |

---

## Option C: Steal Tambo's Data Model, Build Our Own Hooks

### What This Means

We adopt Tambo's type system (thread status, message content blocks, streaming state) but build our own React hooks that consume SSE from our backend directly. No Tambo SDK dependency.

### What We'd Build

1. **Types** (~200 lines): Thread, Message, Content (text/tool-use/tool-result), StreamingState
2. **SSE endpoint** on CF Workers: Same as Option B, but simpler event format (we choose what to emit)
3. **useChat hook** (~300-400 lines): Connect to SSE, accumulate events into thread state, handle reconnection
4. **Event reducer** (~200-300 lines): Simplified accumulator — text deltas, tool status, error handling
5. **HITL integration**: Reuse our existing `submitToolAnswer` tRPC mutation

### What We'd Steal From Tambo

| Concept | What We Take | What We Skip |
|---------|-------------|-------------|
| Thread model | `{ id, messages, status: idle\|streaming\|waiting }` | Their `lastRunCancelled`, metadata |
| Message model | `{ id, role, content: ContentBlock[] }` | Their `reasoning[]`, component content |
| Content blocks | `TextContent`, `ToolUseContent`, `ToolResultContent` | `ComponentContent`, `ResourceContent` |
| Streaming state | `status` enum on thread | Their `StreamingState` type with run tracking |
| Accumulator pattern | Reduce events into immutable thread state | Their 1800-line accumulator, JSON Patch, partial JSON |

### Our Event Format (Simplified)

Instead of AG-UI's 15+ event types, we'd emit ~8:

```typescript
type ChatEvent =
  | { type: 'run_start'; threadId: string; messageId: string }
  | { type: 'text_delta'; content: string }
  | { type: 'tool_start'; toolCallId: string; toolName: string }
  | { type: 'tool_args_delta'; toolCallId: string; argsDelta: string }
  | { type: 'tool_result'; toolCallId: string; result: unknown }
  | { type: 'ask_user'; toolCallId: string; questions: unknown }
  | { type: 'run_end'; threadId: string }
  | { type: 'error'; message: string }
```

### Pros

| Advantage | Detail |
|-----------|--------|
| **Zero dependencies** | No `@tambo-ai/*`, no `@ag-ui/*`, no `partial-json`, no `fast-json-patch`. Just our code |
| **Full control** | We define the event format, accumulator logic, and hook API. We can optimize for our 3 tools and HITL pattern |
| **React Native safe** | We control the SSE client. Can use `EventSource` on web, polyfill on native, or even fall back to `fetch` streaming |
| **Simple accumulator** | Our use case (text + 3 tools + askUser) needs ~200-300 lines, not 1800. No JSON Patch, no partial JSON parsing (we can add later if needed) |
| **Stable** | No external SDK to break. Our events, our types, our hooks |
| **Incremental migration** | Can keep polling as fallback. Stream when available, poll when not |
| **Matches our backend** | Event format maps directly to `streamText()` callbacks. No translation layer to AG-UI |

### Cons

| Disadvantage | Detail |
|--------------|--------|
| **More upfront code** | ~700-900 lines of new code (types + hook + accumulator + SSE client) vs wiring up Tambo's SDK |
| **No partial JSON** | Tool arguments won't render incrementally during streaming. We'd see "Calling readFile..." then the result. Fine for now, but less polished |
| **No component streaming** | If we want AI-driven live component updates (e.g., game preview updating as AI edits), we'd build it ourselves |
| **Battle-testing** | Tambo's accumulator has handled edge cases we haven't thought of. Our simpler version may hit bugs in production |
| **Reconnection logic** | SSE reconnection, deduplication, and error recovery need to be implemented. Tambo handles this |

### Effort Estimate

| Task | Size |
|------|------|
| Types (thread, message, content, events) | Small (~200 lines) |
| SSE endpoint on CF Workers + `streamText()` | Medium |
| `useStreamingChat` hook | Medium (~400 lines) |
| Event accumulator/reducer | Small-Medium (~300 lines) |
| SSE client with reconnection | Small |
| Wire up to existing UI components | Small |
| Remove old polling code | Small |
| **Total** | **~2 days** |

---

## Comparison Matrix

| Dimension | Option B (AG-UI) | Option C (Own Hooks) |
|-----------|-------------------|----------------------|
| **Dependencies added** | 5+ packages | 0 |
| **Lines of new code** | ~300 (glue) | ~900 (types + hook + accumulator) |
| **Lines maintained** | ~0 (Tambo maintains) | ~900 |
| **Streaming text** | Yes | Yes |
| **Streaming tool args** | Yes (partial JSON) | No (show status only) |
| **Component streaming** | Yes (JSON Patch) | No (not needed yet) |
| **HITL (askUser)** | Custom event mapping | Direct integration |
| **React Native risk** | Medium-High (untested) | Low (we control everything) |
| **Version coupling** | High (pre-1.0 SDK) | None |
| **Time to basic streaming** | ~2-3 days | ~2 days |
| **Upgrade to AG-UI later** | Already there | Add compatibility layer (~1 day) |
| **Remove polling** | Full replacement | Full replacement |

---

## Recommendation

**Start with Option C. Defer Option B.**

### Reasoning

1. **Our needs are simple.** We have 3 tools, one HITL pattern (askUser), and text streaming. Tambo's SDK solves problems we don't have (component streaming, client-side tool execution, MCP sampling, interactable components).

2. **React Native is a wildcard.** Tambo's SDK is designed for web React. We'd be the first to run it in React Native. If it doesn't work, we've wasted days debugging someone else's code.

3. **Same effort, more control.** Option C is ~2 days. Option B is ~2-3 days with RN risk. We get the same core result (streaming chat) with fewer dependencies and full control.

4. **AG-UI compatibility is additive.** If AG-UI takes off and we want interop, we can add an AG-UI event translation layer to our SSE endpoint later (~1 day). Our own event format is a subset of AG-UI, so the mapping is straightforward.

5. **Partial JSON is nice-to-have.** Our tools are simple — `readFile(filename)`, `writeFile(filename, content)`, `askUser(questions)`. Showing streaming tool arguments adds minimal UX value for these. If we add complex tools later, we can integrate `partial-json` into our accumulator.

### Migration Plan (Option C)

**Phase 1: Backend streaming** (~1 day)
- Add `streamText()` endpoint to CF Workers (alongside existing `generateText()`)
- Emit our simplified event format via SSE
- Keep D1 persistence (write completed messages after stream ends)

**Phase 2: Frontend hooks** (~1 day)
- New types: `ChatThread`, `ChatMessage`, `ContentBlock`, `ChatEvent`
- New hook: `useStreamingChat(threadId)` — SSE connection, event accumulator, reconnection
- Wire to existing `ChatMessageList`, `ChatSidebar` components
- Keep `askUser` HITL flow working via existing tRPC mutation

**Phase 3: Cleanup** (~0.5 day)
- Remove `useEditorChat.ts` polling hook
- Remove `refetchInterval` queries
- Update `useEditorChatSession.ts` to use new hook

**Phase 4: Polish** (optional, later)
- Add partial JSON for tool args if we add complex tools
- Add typing indicators during streaming
- Consider AG-UI compatibility layer if ecosystem matures

---

## Appendix: Key Tambo Internals We're Borrowing

### Thread State Machine
```
idle → streaming → idle (success)
idle → streaming → waiting (askUser suspended)
waiting → streaming → idle (resumed)
idle → streaming → error
```

### Content Block Model
```typescript
type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool-use'; toolCallId: string; toolName: string; args: unknown }
  | { type: 'tool-result'; toolCallId: string; result: unknown; isError?: boolean }
```
This matches Vercel AI SDK's internal content format almost exactly, making the backend mapping trivial.

### Accumulator Pattern
Reduce a stream of events into an immutable thread snapshot. Each event produces a new state:
```typescript
function chatReducer(state: ChatThread, event: ChatEvent): ChatThread
```
This is the core pattern we're stealing. Tambo's is 1800 lines because it handles components, JSON Patch, partial parsing, and multi-round tool execution. Ours will be ~200-300 lines because we only handle text + tool status + askUser.
