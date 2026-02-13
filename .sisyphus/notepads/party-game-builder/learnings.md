# Party Game Builder — Learnings

## Task 3: WebSocket Client Hook

### Implementation Notes
- Created `app/lib/party/types.ts` as re-export layer from shared types
- Followed `useGameWebSocket` pattern for connection management:
  - Exponential backoff (1s → 30s max)
  - Connection status tracking (connecting → connected → disconnected → reconnecting)
  - Automatic reconnection on close
  - Cleanup on unmount
- Input queueing during disconnection implemented via `inputQueueRef`
- Context provider follows `ChatStreamProvider` pattern with separate state/dispatch contexts
- Used existing `env.apiUrl` and `getAuthToken()` utilities

### Key Decisions
- `sendInput()` queues messages during disconnection, flushes on reconnect
- Connection status exposed for UI feedback (`networkStatus` variable)
- Role-aware connection: host uses `hostToken`, player uses `name`
- WebSocket URL construction: `ws://host/api/party/:code/ws?role=X&name=Y`

### Files Created
- `app/lib/party/types.ts` — Re-exports from shared
- `app/lib/party/usePartyConnection.ts` — WebSocket hook
- `app/lib/party/PartyContext.tsx` — React context provider

### Verification
- `cd app && npx tsc --noEmit` — PASSED ✓
