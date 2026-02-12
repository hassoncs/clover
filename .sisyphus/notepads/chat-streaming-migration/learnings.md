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
