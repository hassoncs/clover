# MVP Reconnect Architecture Contract

> **Status**: Draft
> **Date**: 2026-02-15
> **Scope**: Server (PartyRoomDO), Host, Player

---

## 1. State Classification

### 1.1 Durable State (Persisted in DO Storage)

Survives DO restart and page refresh. Persisted via `saveState()` to `state.storage.put("room", {...})`.

| Field | Type | Description |
|-------|------|-------------|
| `phase` | `PartyRoomPhase` | "lobby" \| "playing" \| "ended" |
| `hostId` | `string \| null` | Canonical host identifier |
| `roomCode` | `string \| null` | Human-readable room code |
| `players` | `Array<[string, PartyPlayer]>` | All player records (including disconnected) |
| `sharedData` | `Record<string, unknown>` | Game-specific shared state |
| `minPlayers` | `number` | Minimum players to start |
| `serverScriptCode` | `string \| null` | Server-side game logic |
| `serverScriptConfig` | `Record<string, unknown>` | Script configuration |
| `session:${token}` | `SessionRecord` | Token → playerId/role mapping |

**SessionRecord Schema**:
```typescript
interface SessionRecord {
  playerId: string;
  role: "host" | "player";
  expiresAt: number; // Unix timestamp
}
```

### 1.2 Ephemeral State (In-Memory Only)

Lost on DO restart. Must be reconstructed on reconnect.

| Field | Type | Description |
|-------|------|-------------|
| `sockets` | `Set<WebSocket>` | Active WebSocket connections |
| `socketMetadata` | `WeakMap<WebSocket, Meta>` | Connection → role/playerId/name |
| `rateLimits` | `Map<string, RateLimitEntry>` | Per-sender rate limiting |
| `disconnectTimers` | `Map<string, Timer>` | 60s disconnect countdown |
| `activeInputCollector` | `InputCollector \| null` | Pending input request state |

**InputCollector Schema**:
```typescript
interface InputCollector {
  requestId: string;
  request: PartyInputRequest;
  expectedPlayerIds: Set<string> | null; // null = all players
  responses: Map<string, PartyInputResponse>;
  timeoutId: ReturnType<typeof setTimeout> | null;
  resolve: ((responses: Map<string, PartyInputResponse>) => void) | null;
}
```

### 1.3 Private State (Per-Player, Not Broadcast)

Sent via `private_state` message to individual players. Never appears in `state_update`.

| Context | Examples |
|---------|----------|
| Trivia game | Player's answer before reveal |
| Drawing game | Player's canvas state |
| Card game | Player's hidden hand |

**Flow**: Host calls `sendToPlayer(playerId, data)` → `private_state` message.

### 1.4 UI-Derived State (Client-Side Only)

Never synced to server. Computed from durable state + local interactions.

| Example | Source |
|---------|--------|
| Animation state | Local timer/interpolation |
| Scroll position | UI state |
| Draft input | Form state before submit |
| Sound playback | Audio context |

---

## 2. Reconnect Success Semantics

### 2.1 Host Reconnect

**Success Criteria**:
- Same `hostId` (canonical identity preserved)
- Same control session (validated via `hostToken`)
- Room continuity (all players, phase, sharedData intact)

**Token Flow**:
```
1. Host creates room → receives hostToken
2. Host stores hostToken in localStorage
3. Host disconnects (page refresh, network loss)
4. Host reconnects with hostToken in URL params
5. Server validates session:${hostToken} → retrieves hostId
6. Server marks host.connected = true
7. Server sends full state_update
```

**Current Implementation** (PartyRoomDO.ts:228-261):
- ✅ Token validation exists
- ✅ Host reconnection clears disconnect timer
- ✅ Full state sent on reconnect
- ⚠️ No explicit `host_reconnect` broadcast (players don't know host reconnected)

### 2.2 Player Reconnect

**Success Criteria**:
- Same `playerId` (canonical identity preserved)
- Same seat (position in players array)
- Same score (if game in progress)

**Token Flow (REQUIRED - NOT YET IMPLEMENTED)**:
```
1. Player joins room → receives playerToken
2. Player stores playerToken in localStorage (keyed by roomCode)
3. Player disconnects (page refresh, network loss)
4. Player reconnects with playerToken in URL params
5. Server validates session:${playerToken} → retrieves playerId
6. Server marks player.connected = true
7. Server broadcasts player_reconnect
8. Server sends full state_update to reconnecting player
9. Server re-sends active input_request (if any)
```

**Current Gap** (PartyRoomDO.ts:184-189):
```typescript
// BUG: Always generates NEW playerId
const meta = {
  role,
  playerId: role === "player" ? crypto.randomUUID() : undefined,
  name: name ?? undefined,
};
```

**Required Fix**:
```typescript
// If player provides token, look up existing playerId
let playerId: string;
if (token) {
  const session = await this.state.storage.get<SessionRecord>(`session:${token}`);
  if (session?.role === "player") {
    playerId = session.playerId;
  } else {
    // Invalid token → reject or create new player
  }
} else {
  playerId = crypto.randomUUID();
}
```

### 2.3 Reconnect Window

| Constant | Value | Purpose |
|----------|-------|---------|
| `RECONNECT_WINDOW_MS` | 60,000 (60s) | Time before player is removed from room |
| `CLEANUP_ALARM_MS` | 14,400,000 (4h) | Time before room is destroyed |

**Behavior**:
- On disconnect: `player.connected = false`, timer starts
- On reconnect within window: timer cleared, `player.connected = true`
- After window expires: player removed from `players` map, `player_left` broadcast

---

## 3. Token Management

### 3.1 Token Generation

| Role | When | Storage Key |
|------|------|-------------|
| Host | Room creation (`/init`) | `session:${hostToken}` |
| Player | First join | `session:${playerToken}` |

**Token Format**: `crypto.randomUUID()` (128-bit UUID)

### 3.2 Token Storage (Client-Side)

| Role | Storage Key | Value |
|------|-------------|-------|
| Host | `party_host_token:${roomCode}` | `hostToken` |
| Player | `party_player_token:${roomCode}` | `playerToken` |

**Implementation**: Use `@/lib/utils/storage` (AsyncStorage on native, localStorage on web).

### 3.3 Token Validation

```typescript
// Server-side validation (PartyRoomDO)
const session = await this.state.storage.get<SessionRecord>(`session:${token}`);
if (!session || session.expiresAt < Date.now()) {
  // Reject: invalid or expired token
}
if (session.role !== expectedRole) {
  // Reject: role mismatch
}
// Success: use session.playerId
```

---

## 4. Input Collector Reconnect

### 4.1 Problem

When a player disconnects during an active input request:
1. `activeInputCollector` holds the pending request
2. Player misses the `input_request` message
3. Player reconnects but never sees the prompt

### 4.2 Solution

On player reconnect, if `activeInputCollector` exists:
1. Check if player is in `expectedPlayerIds` (or null = all players)
2. Check if player has NOT already responded
3. Re-send `input_request` message to reconnecting player

**Implementation Location**: `handlePlayerConnect` after sending `state_update`.

---

## 5. MVP Exclusions (Explicit Non-Goals)

The following are **out of scope** for MVP reconnect:

### 5.1 Entity/Physics Mirroring
- No real-time entity position synchronization
- No physics state snapshot/restore
- No interpolation for missed frames

**Rationale**: Party games use turn-based or discrete input (trivia, drawing, buzzers). Real-time physics is not required.

### 5.2 Game State Rollback
- No undo of completed actions
- No replay of missed events
- No deterministic state reconstruction

**Rationale**: Complexity not justified for MVP. Players accept "what you see is what you get" on reconnect.

### 5.3 Cross-Device Resume
- No session transfer between devices
- No QR code handoff
- No account-based session recovery

**Rationale**: Requires additional auth infrastructure. MVP uses device-local tokens.

### 5.4 Partial State Sync
- No delta updates (always full `state_update`)
- No state versioning
- No conflict resolution

**Rationale**: Full state sync is simpler and sufficient for party game scale (≤16 players, small state).

### 5.5 Offline Queue
- No offline action queueing
- No eventual consistency
- No "sync when online" behavior

**Rationale**: Party games require real-time interaction. Offline = disconnected state.

---

## 6. Message Flow Diagrams

### 6.1 Happy Path: Player Join

```
Player                    Server                    Others
  |                         |                         |
  |-- WebSocket connect --->|                         |
  |   (role=player, name)   |                         |
  |                         |-- player_joined ------->|
  |<-- state_update --------|                         |
  |                         |                         |
```

### 6.2 Happy Path: Player Reconnect

```
Player                    Server                    Others
  |                         |                         |
  |-- WebSocket connect --->|                         |
  |   (role=player, token)  |                         |
  |                         |-- player_reconnect ---->|
  |<-- state_update --------|                         |
  |<-- input_request? ------| (if active collector)   |
  |                         |                         |
```

### 6.3 Timeout: Player Removed

```
Player                    Server                    Others
  |                         |                         |
  |~~ disconnects ~~~~~~~~~~|                         |
  |                         | (60s timer starts)      |
  |                         |                         |
  |                         |~~ 60s elapsed ~~~~~~~~~~|
  |                         |-- player_left --------->|
  |                         | (player removed from    |
  |                         |  players map)           |
```

---

## 7. Implementation Checklist

### Server (PartyRoomDO.ts)

- [ ] Accept `token` param for player WebSocket connections
- [ ] Look up existing `playerId` from `session:${token}`
- [ ] Generate new `playerId` only when no token provided
- [ ] Re-send `input_request` to reconnecting players
- [ ] Broadcast `host_reconnect` when host reconnects

### Client (usePartyConnection.ts)

- [ ] Store `playerToken` in localStorage on first join
- [ ] Retrieve `playerToken` on reconnect
- [ ] Include `token` in WebSocket URL params
- [ ] Handle `player_reconnect` message (update local state)

### Protocol (protocol.ts)

- [ ] Add `host_reconnect` message factory (already exists in types)
- [ ] Document token flow in message specs

---

## 8. Open Questions

1. **Token Expiration**: Should player tokens expire differently than the 4-hour room cleanup?
   - **Recommendation**: No. Token lifetime = room lifetime for MVP.

2. **Multiple Sessions**: Should same player be allowed multiple concurrent connections?
   - **Recommendation**: No. New connection with same token closes old connection.

3. **Name Change on Reconnect**: Should players be allowed to change name on reconnect?
   - **Recommendation**: No. Name is part of identity. Use new player flow for name change.

---

## 9. References

| File | Purpose |
|------|---------|
| `api/src/party/PartyRoomDO.ts` | Server-side room state and WebSocket handling |
| `api/src/party/protocol.ts` | Message encoding/decoding |
| `app/lib/party/usePartyConnection.ts` | Client-side WebSocket connection hook |
| `shared/src/types/party.ts` | Shared type definitions |
