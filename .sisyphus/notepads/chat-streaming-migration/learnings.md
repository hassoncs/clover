- Added Phase 0 shared chat foundation with strict AG-UI event subset, thread/message/content block types, and a pure reducer-driven stream state machine.
- Reducer behavior is contract-tested across text accumulation, tool call lifecycle, askUser suspension/waiting transitions, run errors, multi-tool ordering, and post-wait resume flows.
- askUser waiting detection is derived at RUN_FINISHED by checking for tool-use blocks in calling state with no matching tool-result; this keeps waiting/idle transition logic deterministic.
- Streaming tool args are accumulated per toolCallId in a Map and opportunistically parsed as JSON object chunks to update tool-use args only when parseable.

- Added AG-UI canary tests in shared chat that map each local AgUiEvent variant into @ag-ui/core event types and validate with EventSchemas.parse.
- Canary explicitly covers the two shape drifts vs AG-UI (`toolName` -> `toolCallName`, `TOOL_CALL_RESULT.result` -> `content` + inferred `messageId`) so upstream schema changes fail tests immediately.

- TextStreamPart tool input chunks use id (not toolCallId) for call identity; map this to AG-UI toolCallId for TOOL_CALL_* events.
- streamText persistence needs await result.response + await result.steps + await result.totalUsage; finish metadata is split across those promises rather than a single resolved object.
- Hono SSE chat route can reuse websocket auth pattern by validating token query param via Supabase and then streaming Response directly from a TransformStream.

- For non-blocking chat mutations, keep thread creation/workspace seeding in tRPC, then persist only the new user/tool message and hand off generation to `/api/chat/stream` by returning a prebuilt `streamUrl`.
- A small `insertUserMessage`/`insertToolResult` export in `chat-handler.ts` lets tRPC persist message history without invoking `generateText`, while preserving existing `advanceThread`/`resumeThread` blocking paths.

- Frontend streaming can bridge AG-UI reducer output to legacy chat UI by converting `ChatThread.messages` into old `ChatMessage` cards while keeping persisted history from `chatThreads.getMessages` as a non-polling baseline.
- `sendMessage` now returns the authoritative `threadId` from tRPC so `useEditorChatSession` can set local thread state without pre-creating threads.
- SSE parsing is most reliable with `fetch` + `ReadableStream` by splitting on event boundaries (`\n\n`) and reassembling `data:` lines, which works across React Native environments where `EventSource` is inconsistent.

## 2026-02-12 Task: Plan Status Reconciliation
- Phase 0 (types, accumulator, tests): ALL files exist and 9/9 tests pass. Plan checkboxes not updated but work is done.
- Phase 1 (backend): 7/7 tasks checked, agui-mapper 9/9 tests pass. Integration test deferred (needs live Workers).
- Phase 2 (frontend): sse-client.ts, useStreamingChat.ts, useEditorChatSession.ts ALL implemented. ChatMessageList works via legacy adapter. useEditorChat.ts is DEAD CODE.
- Phase 3 (cleanup): useEditorChat.ts contains all polling. Deleting it removes ALL chat polling. Non-chat polling correctly kept.

## Key Decision: ChatMessageList adapter pattern
- useStreamingChat.ts converts ContentBlock[] to legacy ChatMessage format via toLegacyMessages()
- Old ChatMessage type from types.ts retained as adapter target — used by ChatMessage.tsx, ChatMessageList.tsx, useStreamingChat.ts
- convertToChatMessage function removed by deleting useEditorChat.ts


## 2026-02-11: AGENTS.md Updated
- Updated root AGENTS.md to reflect the new SSE streaming architecture.
- Removed references to polling and blocking generateText in the Project Context section.

## 2026-02-12 Task: Final Cleanup & Verification
- Deleted useEditorChat.ts (dead code, zero imports). All chat polling removed.
- Updated AGENTS.md Project Context section with new SSE streaming architecture.
- tsc --noEmit passes clean. 22/22 tests pass.
- Browser verification: app loads at localhost:8085 with no JS errors after deletion.
- Code path verification for streaming: SSE events → dispatch → reducer → state → re-render confirmed token-by-token rendering.
- Tool call status tracked via accumulator (streaming → calling → complete) but only askUser rendered in UI (non-askUser tools tracked but not displayed — matches pre-migration behavior).
- askUser HITL: suspension via hasPendingAskUser() → waiting state → UserQuestionCard → submitToolAnswer → reconnect SSE. Full round-trip wired.
- Integration test deferred by design (needs live Workers env). Covered by 22 unit tests + code path tracing.

## 2026-02-12 Task: End-to-End Streaming Repair (No Legacy)
- `finish` chunks from `streamText()` fire per step in multi-step mode; mapper must not emit `RUN_FINISHED` from `finish` or the UI exits streaming early.
- Reliable run completion is: consume all `result.fullStream` parts, then emit a single `RUN_FINISHED` in `stream-handler`.
- Legacy flat chat message adapters were masking tool-use/tool-result structure and losing semantic state; rendering directly from `ContentBlock[]` removes that drift.
- `useStreamingChat` can safely merge persisted DB messages and reducer messages as shared `ChatMessage[]` with normalized `content` blocks.
- Ask-user pending detection is most robust when derived from `tool-use` + absence of matching `tool-result` by `toolCallId`.
- Duplicate SSE sessions can be suppressed by guarding `connectToStream` with `isConnecting` + `currentStreamUrl` refs.

## 2026-02-11 Task: First-turn workspace context injection
- Injecting workspace files in `api/src/index.ts` before `handleChatStream` is sufficient because `modelMessages` already contains ordered persisted history for the thread.
- `modelMessages.length === 1` cleanly identifies the first user turn and prevents repeated context injection on later turns.
- `ArtifactService.listWorkspaceFileMeta()` + `ArtifactService.readWorkspaceFiles()` allows one metadata read plus batched content reads without changing chat tools or stream handler.
