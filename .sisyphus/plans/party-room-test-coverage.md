# Party Room System — Comprehensive Test Coverage Plan

## Goal
Go from "decent coverage" to "deploy with confidence" for the generic party room/lobby system. All tests are deterministic, non-flaky, and avoid duplicating existing coverage.

## Pre-Implementation: Code Change
- **Room codes → 4 digits** (like Jackbox). Change `generateRoomCode()` from 8-char `XXXX-XXXX` to 4-char `XXXX`. Tests should be written against the new 4-char format.

## Scope
The **generic party infrastructure** — NOT game-specific template logic:
- `api/src/party/PartyRoomDO.ts` — Core Durable Object
- `api/src/party/protocol.ts` — Message protocol
- `api/src/index.ts` — HTTP routes for room creation & WebSocket proxy
- `shared/src/types/party.ts` — Shared types

## Current State
6 test files exist with good coverage of: room init, player join/leave, reconnection (11 tests), rate limiting, protocol round-trips, requestInputFromSubset, sendToPlayer, QuickJS script execution.

---

## Phase 1: Test Helpers & Route Tests (~1 day)

### 1A. Extract shared test helpers
**File**: `api/src/party/__tests__/test-helpers.ts` (new)
- Extract `MockWebSocket`, `MockWebSocketPair`, `MockResponse`, `createMockState`, `makeRequest`, `initRoom` from `PartyRoomDO.test.ts` into a shared module
- Add `connectHost(dobj, token?)` → returns { ws, messages[] }
- Add `connectPlayer(dobj, name, token?)` → returns { ws, messages[], playerId, playerToken }
- Add `parseMessages(ws)` → typed message array helper

### 1B. Route-level tests
**File**: `api/src/__tests__/party-routes.test.ts` (new)

| # | Test | Priority |
|---|------|----------|
| 1 | `POST /api/party/create` returns 201 with `{code, hostToken, hostId}` and initializes DO | Critical |
| 2 | Generated room code matches 4-char format `XXXX`, charset `[A-HJ-NP-Z2-9]` (no ambiguous 0/O/1/I) | Critical |
| 3 | `POST /api/party/create` forwards `template` and `minPlayers` to DO init payload | Critical |
| 4 | `GET /api/party/:code/ws` rejects non-WebSocket request with 426 | Critical |
| 5 | `GET /api/party/:code/ws` proxies WebSocket upgrade to correct DO by room code | Critical |
| 6 | `POST /api/party/create` returns 500 when DO init fails | Nice-to-have |
| 7 | Room code uniqueness smoke test (generate 1000 codes, check no collisions) | Nice-to-have |

---

## Phase 2: PartyRoomDO Critical Additions (~1 day)

### 2A. Audience role coverage
**File**: `api/src/party/__tests__/PartyRoomDO.test.ts` (extend)

| # | Test | Priority |
|---|------|----------|
| 1 | Audience can connect and receives `state_update` | Critical |
| 2 | Audience is excluded from connected player count | Critical |
| 3 | Audience does not receive `input_request` broadcasts | Critical |
| 4 | Audience does not count toward `minPlayers` for game start | Critical |
| 5 | Audience disconnect doesn't trigger `player_left` to host | Nice-to-have |

### 2B. Host message handling
**File**: `api/src/party/__tests__/PartyRoomDO.test.ts` (extend)

| # | Test | Priority |
|---|------|----------|
| 1 | Host `state_update` message updates sharedData and broadcasts new room state | Critical |
| 2 | Host `phase_change` message broadcasts phase change with metadata | Critical |
| 3 | Non-host `phase_change` message is ignored | Critical |
| 4 | Non-host `start_game` message is ignored | Critical |

### 2C. Start game flow
**File**: `api/src/party/__tests__/PartyRoomDO.test.ts` (extend)

| # | Test | Priority |
|---|------|----------|
| 1 | `start_game` rejects with `MIN_PLAYERS` when too few players connected | Critical |
| 2 | `start_game` moves phase to `playing` when minPlayers met and no template/script | Critical |
| 3 | `start_game` rejects with `ALREADY_STARTED` when phase != lobby | Critical |
| 4 | `start_game` counts only connected, non-host, non-audience players | Critical |

### 2D. Input response edge cases
**File**: `api/src/party/__tests__/PartyRoomDO.test.ts` (extend)

| # | Test | Priority |
|---|------|----------|
| 1 | `input_response` with wrong `requestId` is silently ignored | Critical |
| 2 | `input_response` from player not in expected subset is ignored | Critical |
| 3 | Binary ArrayBuffer message is decoded and handled correctly | Nice-to-have |

### 2E. Auth edge cases
**File**: `api/src/party/__tests__/PartyRoomDO.test.ts` (extend)

| # | Test | Priority |
|---|------|----------|
| 1 | Host token with wrong role closes socket with `AUTH_FAILED` | Critical |
| 2 | WebSocket connect without role returns 400 | Critical |
| 3 | Player connect without name or token returns 400 | Critical |

---

## Phase 3: Teams, Persistence, Start-Game (~1.5 days)

### 3A. Team system
**File**: `api/src/party/__tests__/PartyRoomDO.teams.test.ts` (new)

| # | Test | Priority |
|---|------|----------|
| 1 | `assignTeams(random)` assigns only non-host, non-audience players | Critical |
| 2 | `assignTeams` distributes players across N teams via modulo | Critical |
| 3 | `assignTeams` broadcasts updated state with team assignments | Critical |
| 4 | `updateTeamScore` updates only players in the target team | Critical |
| 5 | `updateTeamScore` broadcasts state after update | Critical |
| 6 | `broadcastToTeam` sends only to connected sockets in that team | Critical |
| 7 | `getTeamPlayers` returns correct membership | Critical |
| 8 | `assignTeams("manual")` is a no-op | Nice-to-have |
| 9 | Team assignment persists across player reconnect | Nice-to-have |

### 3B. State persistence & recovery
**File**: `api/src/party/__tests__/PartyRoomDO.state-persistence.test.ts` (new)

| # | Test | Priority |
|---|------|----------|
| 1 | State round-trips through save/load (phase, players, sharedData, minPlayers, templateId, serverScriptCode, stateVersion) | Critical |
| 2 | `stateVersion` increments on each mutating operation | Critical |
| 3 | New DO instance loading saved state has correct phase and player list | Critical |
| 4 | Cleanup via alarm clears storage and closes all sockets | Critical |
| 5 | Cleanup clears active input collector timeouts | Nice-to-have |

### 3C. Start-game with templates/scripts
**File**: `api/src/party/__tests__/PartyRoomDO.start-game.test.ts` (new)

| # | Test | Priority |
|---|------|----------|
| 1 | `start_game` with registered templateId invokes template runner | Critical |
| 2 | `start_game` with serverScriptCode invokes QuickJSServerRunner | Critical |
| 3 | Template/script failure emits `SCRIPT_ERROR`, writes `sharedData.scriptError`, sets phase `ended` | Critical |
| 4 | Host disconnect during `playing` phase keeps room state recoverable for reconnect window | Critical |
| 5 | Double `start_game` race yields one transition | Nice-to-have |

---

## Phase 4: Multi-Actor Integration & Edge Cases (~0.5 day)

### 4A. Full lifecycle integration
**File**: `api/src/party/__tests__/PartyRoomDO.test.ts` (extend)

| # | Test | Priority |
|---|------|----------|
| 1 | Full lifecycle: init → host connect → 3 players join → start → play → end | Critical |
| 2 | All players disconnect → empty room detection triggers cleanup after timers expire | Critical |
| 3 | Mixed reconnect: 2 of 3 players reconnect within window, 1 doesn't | Nice-to-have |
| 4 | Player connects during `playing` phase (expected behavior documented) | Nice-to-have |

### 4B. Score & shared data
**File**: `api/src/party/__tests__/PartyRoomDO.test.ts` (extend)

| # | Test | Priority |
|---|------|----------|
| 1 | `updatePlayerScore` applies delta and broadcasts updated state | Critical |
| 2 | `updateSharedData` merges new data and broadcasts | Critical |

---

## Summary

| Phase | New Files | Extended Files | Critical Tests | Nice-to-have | Est. Effort |
|-------|-----------|----------------|----------------|--------------|-------------|
| 1: Helpers + Routes | 2 | 1 (refactor) | 5 | 2 | 1 day |
| 2: DO Critical | 0 | 1 | 14 | 2 | 1 day |
| 3: Teams/Persistence/Start | 3 | 0 | 15 | 4 | 1.5 days |
| 4: Integration/Edge | 0 | 1 | 4 | 2 | 0.5 days |
| **Total** | **5** | **3** | **38** | **10** | **~4 days** |

## Anti-Duplication Rules
- Do NOT re-test reconnection happy paths (already 11 tests in PartyRoomDO.test.ts)
- Keep subset-collector tests in requestInputFromSubset.test.ts
- Keep private-state targeting tests in sendToPlayer.test.ts  
- Keep protocol encode/decode in protocol.test.ts — DO tests assert behavior, not protocol internals
- Game-specific template logic (quiplash flow, chroma-clues rounds) stays in their own test files

## Execution Order
1. Extract shared test helpers (unblocks everything)
2. Route tests (independent, high value)
3. DO critical additions in PartyRoomDO.test.ts (audience, host messages, start game, auth)
4. New files: teams, persistence, start-game-with-scripts
5. Integration lifecycle tests + nice-to-haves
