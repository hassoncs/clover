## 2026-02-12 Task: Initial Analysis
- Adapter pattern chosen over full ContentBlock[] migration for ChatMessageList
- Old ChatMessage type retained as adapter target (would break ChatMessage.tsx, ChatMessageList.tsx if removed)

## 2026-02-12 Task: End-to-End Streaming Repair (No Legacy)
- Removed adapter pattern and standardized chat UI + hooks on `@slopcade/shared/chat` `ChatMessage` with `content: ContentBlock[]`.
- `RUN_FINISHED` is now emitted exactly once in `stream-handler` after full stream completion; `agui-mapper` returns `null` for `finish`.
- `useEditorChatSession` owns pending askUser derivation from content blocks instead of legacy `message.pending` fields.
- Deleted `app/components/create-game/types.ts` to eliminate old chat message model usage.

## 2026-02-11 Task: First-turn workspace context injection
- Implemented injection in the `/api/chat/stream` route (`api/src/index.ts`) instead of `stream-handler` so only request assembly changes and SSE behavior remains untouched.
- Used a synthetic prepended `user` text message that embeds current workspace file contents, then left the real user prompt as the next message.
