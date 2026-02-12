# Agent Orchestration

> **Skill for AI Agents**: Chat streaming, SSE, AG-UI protocol, HITL, billing

## When to Use This Skill

Load when working on: chat streaming, SSE endpoints, AG-UI protocol, tool calling, HITL (askUser), agent billing, settlement, `streamText`, chat flow

## Key Concepts

- **Unified Model**: Thread-and-message model in D1 (replaces legacy stage-based system)
- **Streaming**: Vercel AI SDK `streamText` → mapped to AG-UI protocol events via SSE
- **HITL**: `askUser` tool has no execute handler → stream suspends until user responds
- **Billing**: Per-turn settlement via `AgentBillingService.settleMessage()`

## Architecture

1. User calls `chatThreads.sendMessage` (tRPC) → returns `{ threadId, streamUrl }`
2. Frontend connects SSE at streamUrl via `connectSSE` in `useSendMessage.ts`
3. Backend `stream-handler.ts` uses `streamText()` and iterates `result.fullStream`
4. `AgUiMapper` transforms SDK chunks → `AgUiEvent`s (TEXT_MESSAGE_CONTENT, TOOL_CALL_START, etc.)
5. Frontend `chatReducer` (`shared/src/chat/accumulator.ts`) reconstructs state from deltas
6. Messages persisted in `onFinish` callback

## Common Patterns

### Tool Definitions
Tools defined in `chat-tools.ts` using `tool()` helper:
- Standard tools (`readFile`, `writeFile`, `readSkill`) have `execute` functions
- `askUser` has NO execute function → triggers HITL suspension

### HITL Flow
1. Model calls `askUser` → no result provided → stream stalls
2. `findPendingAskUser` detects it → thread marked `waiting_for_input` → emits `RUN_FINISHED`
3. User submits via `chatThreads.submitToolAnswer` → new `streamUrl` for resumed generation

### Billing
- `billForUsage` in stream-handler calculates token costs (micros-per-1k-tokens rate)
- Executes `walletService.debit` with type `generation_debit`
- Idempotency keys: `chat-message:{threadId}:{timestamp}` or `msg-settle:{messageId}`

## Gotchas

- SSE responses MUST include CORS headers on the stream response itself (not just initial request)
- In multi-step mode, SDK emits `finish` per step — `AgUiMapper` ignores these. Only emit `RUN_FINISHED` after full `fullStream` is exhausted
- 5-second keepalive interval (`setInterval`) prevents Cloudflare/LB timeouts during thinking
- AG-UI events are a discriminated union: `RUN_STARTED`, `RUN_FINISHED`, `TEXT_MESSAGE_*`, `TOOL_CALL_*`

## File References

| File | Purpose |
|------|---------|
| `api/src/chat/stream-handler.ts` | Core SSE orchestration |
| `api/src/chat/agui-mapper.ts` | SDK → AG-UI event mapping |
| `api/src/chat/chat-tools.ts` | Tool definitions (askUser, readSkill) |
| `api/src/economy/agent-billing-service.ts` | Billing settlement |
| `shared/src/chat/accumulator.ts` | Shared chatReducer |
| `shared/src/chat/events.ts` | AgUiEvent type definitions |
| `app/lib/chat/` | Frontend streaming hooks |

## Related Skills

- [storage-ops](storage-ops.md) — D1 tables for threads/messages
- [ecs-architecture](ecs-architecture.md) — GameDefinition used in game generation chat
