
## State Versioning
- Added monotonic `stateVersion` to `PartyRoomState` and `StateUpdateMessage`.
- `PartyRoomDO` increments `stateVersion` on every `saveState()` call, ensuring that any change to the authoritative state is versioned.
- `state_update` messages now carry `stateVersion` at the top level for quick filtering/ordering by clients without full state parsing.
- Protocol tests updated to verify `stateVersion` round-trips.

## Player Reconnect Identity Reclaim (2026-02-15)
- **Token Flow**: Players receive a `player_token` message on first join containing their session token and playerId. Client stores token in localStorage/AsyncStorage keyed by roomCode.
- **Reconnect**: On reconnect, client sends stored token in WebSocket URL params. Server looks up `session:${token}` to retrieve existing playerId instead of generating new one.
- **Input Request Re-send**: When a player reconnects during an active input collection, the server re-sends the `input_request` message if the player is expected and hasn't responded.
- **Protocol Addition**: Added `PlayerTokenMessage` type and `playerTokenMessage` factory function.
- **Client Storage Key**: `party_player_token:${roomCode}` - allows per-room token storage for multi-room scenarios.
## Test Infrastructure Fix (2026-02-15)
- **WebSocket Mocking**: Updated `PartyRoomDO.test.ts` to use `WebSocketPair` and `fetch` with `Upgrade: websocket` header, matching the current implementation.
- **MockResponse**: Extended `Response` to support the `webSocket` property and bypassed status 101 restrictions in the standard `Response` constructor.
- **MockWebSocket**: Implemented a robust `MockWebSocket` that supports `addEventListener`, `send` (with cross-socket delivery), and `readyState` tracking.
- **Async Handling**: Used `vi.runAllTimersAsync()` to ensure async connection handlers (IIFEs) in `handleWebSocketUpgrade` complete before assertions.
