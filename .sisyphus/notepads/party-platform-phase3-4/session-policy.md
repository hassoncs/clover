# Session Policy: Host Auth & Guest Player Policy

> **Status**: Active
> **Date**: 2026-02-15
> **Scope**: Party Room Session Management (MVP)

---

## 1. Overview

This document formalizes the authentication and authorization policies for party room sessions, covering both host (authenticated) and guest (unauthenticated) players. It defines token issuance, validation, lifecycle, and security posture.

---

## 2. Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `CLEANUP_ALARM_MS` | 4 hours (4 × 60 × 60 × 1000) | Room lifetime before cleanup alarm fires |
| `RECONNECT_WINDOW_MS` | 60 seconds | Player disconnect window before removal |
| `RATE_LIMIT_WINDOW_MS` | 1 second | Rate limiting window |
| `RATE_LIMIT_MAX_MESSAGES` | 10 | Max messages per rate limit window |

---

## 3. SessionRecord Schema

```typescript
interface SessionRecord {
  playerId: string;       // Canonical identity (hostId for host, UUID for player)
  role: "host" | "player";
  expiresAt: number;      // Unix timestamp (room creation time + CLEANUP_ALARM_MS)
}
```

**Storage Key Pattern**: `session:${token}` → `SessionRecord`

---

## 4. Host Authentication Policy

### 4.1 Host Token Issuance

| Attribute | Value |
|-----------|-------|
| **When** | Room creation via `/init` endpoint |
| **Format** | `crypto.randomUUID()` (128-bit UUID) |
| **Storage Key** | `session:${hostToken}` |
| **Lifetime** | Same as room (`CLEANUP_ALARM_MS`) |
| **Storage Value** | `SessionRecord` with `role: "host"` |

**Code Reference** (`PartyRoomDO.ts:139-144`):
```typescript
const session: SessionRecord = {
  playerId: body.hostId,
  role: "host",
  expiresAt: Date.now() + CLEANUP_ALARM_MS,
};
await this.state.storage.put(`session:${body.hostToken}`, session);
```

### 4.2 Host Token Validation

**When**: WebSocket connect with `role=host` and `token` param

**Validation Steps**:
1. Look up `session:${token}` from DO storage
2. Verify session exists
3. Verify `session.role === "host"`
4. Verify `session.expiresAt > Date.now()`

**Code Reference** (`PartyRoomDO.ts:232-243`):
```typescript
const session = await this.state.storage.get<SessionRecord>(`session:${token}`);
if (!session || session.role !== "host") {
  ws.close(4001, "Invalid host token");
  return;
}
```

### 4.3 Host Auth Requirements

| Requirement | Implementation |
|-------------|----------------|
| Must be authenticated user | `hostId` from Supabase auth in `/init` request body |
| Token separate from auth | Host token is room-scoped, distinct from Supabase JWT |
| Room-scoped | Token only valid for the room that issued it |

---

## 5. Guest Player Policy

### 5.1 Player Identity

| Attribute | Policy |
|-----------|--------|
| **Account Required** | No (MVP) |
| **Identity Scope** | Room-scoped only |
| **Identity Components** | `playerId` (UUID) + `playerToken` (UUID) |
| **Name** | Provided on first join, cannot change on reconnect |

### 5.2 Player Token Issuance

| Attribute | Value |
|-----------|-------|
| **When** | First join to room (new player) |
| **Format** | `crypto.randomUUID()` (128-bit UUID) |
| **Storage Key** | `session:${playerToken}` |
| **Lifetime** | Same as room (`CLEANUP_ALARM_MS`) |
| **Storage Value** | `SessionRecord` with `role: "player"` |

**Code Reference** (`PartyRoomDO.ts:289-295`):
```typescript
const sessionToken = crypto.randomUUID();
const session: SessionRecord = {
  playerId,
  role: "player",
  expiresAt: Date.now() + CLEANUP_ALARM_MS,
};
await this.state.storage.put(`session:${sessionToken}`, session);
```

### 5.3 Player Token Validation

**When**: WebSocket connect with `role=player` and existing `token` param

**Validation Steps**:
1. Look up `session:${token}` from DO storage
2. If session exists and valid:
   - Return existing `playerId` (reconnect path)
   - Mark player as connected
   - Broadcast `player_reconnect`
3. If no session or invalid:
   - Generate new `playerId` (new player path)
   - Issue new `playerToken`

**Current Gap**: Token validation for players not yet implemented (see reconnect-contract.md §2.2).

### 5.4 Reconnection Behavior

| Scenario | Behavior |
|----------|----------|
| Token provided + valid | Reconnect with existing `playerId`, broadcast `player_reconnect` |
| Token provided + invalid | Generate new `playerId`, treat as new player |
| No token | Generate new `playerId`, treat as new player |

---

## 6. Token Lifecycle

### 6.1 Token Creation

```
1. Generate UUID via crypto.randomUUID()
2. Create SessionRecord with:
   - playerId: canonical identity
   - role: "host" or "player"
   - expiresAt: Date.now() + CLEANUP_ALARM_MS
3. Store at session:${token} in DO storage
```

### 6.2 Token Expiration

| Condition | Action |
|-----------|--------|
| `expiresAt < Date.now()` | Token invalid, reject connection |
| Room cleanup alarm fires | All `session:*` keys deleted |

### 6.3 Token Invalidation

| Scenario | Behavior |
|----------|----------|
| Room cleanup | All `session:*` keys deleted via alarm |
| No manual invalidation | MVP limitation |
| No revocation endpoint | MVP limitation |

### 6.4 Token Security Properties

| Property | Implementation |
|----------|----------------|
| Opaque tokens | No embedded data, lookup required |
| Room-scoped | Cannot reuse across rooms |
| Single-use per connection | New connection closes old (no explicit, but implicit via WebSocket) |

---

## 7. Client-Side Token Storage

| Role | Storage Key | Value |
|------|-------------|-------|
| Host | `party_host_token:${roomCode}` | `hostToken` |
| Player | `party_player_token:${roomCode}` | `playerToken` |

**Implementation**: Use `@/lib/utils/storage` (localStorage on web, AsyncStorage on native).

---

## 8. Security Posture

### 8.1 Threat Model

| Threat | Description |
|--------|-------------|
| **Token Theft** | Attacker gains access to player's `playerToken` |
| **Token Replay** | Attacker reuses captured token after original holder disconnects |
| **Session Hijacking** | Attacker takes over active WebSocket connection |

### 8.2 Mitigations

| Mitigation | Implementation |
|------------|----------------|
| Transport encryption | HTTPS required for web, WSS for WebSocket |
| Short room lifetime | Max 4 hours |
| No cross-room reuse | Tokens validated against specific room's DO |
| Connection exclusivity | Single connection per token (implicit via WebSocket) |

### 8.3 MVP Limitations

| Limitation | Risk |
|------------|------|
| No token revocation | Stolen tokens valid until room expires |
| No audit logging | No visibility into token usage |
| No rate limiting per token | Vulnerable to token flooding |
| No token rotation | Static tokens for room lifetime |

---

## 9. Token Flow Diagrams

### 9.1 Host: Create Room

```
Client                                      Server (PartyRoomDO)
  |                                              |
  |-- POST /init (hostId from auth) ----------->|
  |                                              |
  |   Generate hostToken (UUID)                  |
  |   Store session:hostToken → SessionRecord   |
  |   Set cleanup alarm                          |
  |<-- { ok: true } -----------------------------|
  |                                              |
  |-- WS /ws?role=host&token=hostToken --------->|
  |   (on page load/reconnect)                   |
  |                                              |
  |   Validate session:hostToken                 |
  |<-- state_update -----------------------------|
```

### 9.2 Player: First Join

```
Client                                      Server (PartyRoomDO)
  |                                              |
  |-- WS /ws?role=player&name=Alice ------------>|
  |                                              |
  |   Generate playerId, playerToken (UUIDs)     |
  |   Store session:playerToken → SessionRecord  |
  |   Broadcast player_joined                    |
  |<-- state_update -----------------------------|
```

### 9.3 Player: Reconnect

```
Client                                      Server (PartyRoomDO)
  |                                              |
  |-- WS /ws?role=player&token=playerToken ----->|
  |   (with stored token)                        |
  |                                              |
  |   Validate session:playerToken               |
  |   Retrieve existing playerId                 |
  |   Mark player.connected = true               |
  |   Broadcast player_reconnect                 |
  |<-- state_update -----------------------------|
```

---

## 10. Relationship to Other Documents

| Document | Relationship |
|----------|--------------|
| `reconnect-contract.md` | Defines SessionRecord, constants, reconnect behavior |
| `protocol.ts` | Message encoding/decoding for session-related messages |
| `usePartyConnection.ts` | Client-side token storage and WebSocket connection |

---

## 11. References

| File | Section |
|------|---------|
| `api/src/party/PartyRoomDO.ts` | Lines 22-32 (constants, SessionRecord), 139-144 (host token), 232-243 (host validation), 289-295 (player token) |
| `api/src/index.ts` | Room creation endpoint |
| `.sisyphus/notepads/.../reconnect-contract.md` | Architecture contract |
