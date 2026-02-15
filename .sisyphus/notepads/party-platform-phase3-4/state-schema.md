# Party Platform State Schema

> Canonical synchronized state schema for party games. Defines normalized keys in `sharedData`, private per-player payloads, and derived client-only fields.

## Overview

The party platform uses a three-tier state model:

1. **Shared State** (`sharedData`) — Server-authoritative, broadcast to all players
2. **Private State** — Server-authoritative, sent only to specific player
3. **Derived State** — Client-computed, never synced

---

## 1. Shared State (`sharedData`)

Server-authoritative state broadcast to all connected clients. Only the server (host) can modify these values.

### 1.1 Core Phase State

| Key | Type | Description | Authority |
|-----|------|-------------|-----------|
| `phase` | `string` | Current game phase (e.g., `"answering"`, `"voting"`, `"reveal"`) | Server |
| `roundNumber` | `number` | Current round (1-indexed) | Server |
| `totalRounds` | `number` | Total rounds in game | Server |
| `timerRemaining` | `number` | Seconds remaining in current phase | Server |
| `gameTemplate` | `string` | Game type identifier (e.g., `"default"`, `"quiplash"`, `"crowd-comedy"`) | Server |

### 1.2 Game Content State

| Key | Type | Description | Authority |
|-----|------|-------------|-----------|
| `promptText` | `string` | Current prompt/question text | Server |
| `roundMultiplier` | `number` | Score multiplier for current round | Server |

### 1.3 Quiplash-Specific State

| Key | Type | Description | Authority |
|-----|------|-------------|-----------|
| `matchupIndex` | `number` | Current matchup index (1-indexed) | Server |
| `totalMatchups` | `number` | Total matchups in round | Server |
| `answerA` | `string` | Player A's answer for current matchup | Server |
| `answerB` | `string` | Player B's answer for current matchup | Server |
| `voteResultA` | `number` | Percentage of votes for answer A | Server |
| `voteResultB` | `number` | Percentage of votes for answer B | Server |
| `pointsA` | `number` | Points awarded to player A | Server |
| `pointsB` | `number` | Points awarded to player B | Server |
| `quiplashA` | `boolean` | True if player A got all votes | Server |
| `quiplashB` | `boolean` | True if player B got all votes | Server |
| `votersJson` | `string` | JSON array of player IDs eligible to vote | Server |
| `assignmentsJson` | `string` | JSON map of playerId → matchup assignments | Server |

### 1.4 Crowd Comedy-Specific State

| Key | Type | Description | Authority |
|-----|------|-------------|-----------|
| `answersJson` | `string` | JSON array of `{id, text}` anonymous answers | Server |
| `voteOptionsJson` | `string` | JSON array of vote options | Server |
| `resultsJson` | `string` | JSON array of `{text, authorName, voteCount, points}` | Server |

### 1.5 Scoreboard State

| Key | Type | Description | Authority |
|-----|------|-------------|-----------|
| `scoreboardJson` | `string` | JSON array of `{playerName, score}` sorted by score | Server |
| `winnerName` | `string` | Winner's display name | Server |

### 1.6 Error State

| Key | Type | Description | Authority |
|-----|------|-------------|-----------|
| `phase` | `"error"` | Error phase indicator | Server |
| `errorMessage` | `string` | Human-readable error message | Server |
| `scriptError` | `string` | Server script execution error | Server |

---

## 2. Private State (Per-Player)

Server-authoritative state sent only to a specific player via `private_state` message. Never broadcast to other players.

### 2.1 Current Usage

Currently, `privateState` is typed as `unknown | null` in `PartyContextValue`. The server can send arbitrary data via `sendToPlayer()`.

### 2.2 Recommended Private Fields

| Key | Type | Description | Authority |
|-----|------|-------------|-----------|
| `playerId` | `string` | Confirmed player ID | Server |
| `pendingInput` | `object` | Current input being collected | Server |
| `privatePrompt` | `string` | Prompt only this player sees | Server |
| `secretRole` | `string` | Hidden role (for social deduction games) | Server |
| `privateScore` | `number` | Score only visible to player | Server |

### 2.3 Security Constraints

- **NEVER** embed private secrets in `sharedData`
- **NEVER** include player IDs in anonymous answer lists
- **ALWAYS** use opaque IDs (`generateId()`) for answers in voting phases
- **ALWAYS** filter self-votes on the server side

---

## 3. Derived State (Client-Only)

Computed from server state, never synced. These fields are generated client-side for UI purposes.

### 3.1 UI Animation State

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `isAnimating` | `boolean` | Animation in progress | Client |
| `animationProgress` | `number` | 0-1 animation progress | Client |
| `transitionDirection` | `"in" \| "out"` | Phase transition direction | Client |

### 3.2 Local Timer State

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `localTimerValue` | `number` | Client-side countdown (interpolated) | Client |
| `timerPaused` | `boolean` | Timer pause state | Client |

### 3.3 Optimistic Updates

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `optimisticAnswer` | `string` | Answer submitted, awaiting confirmation | Client |
| `optimisticVote` | `string` | Vote submitted, awaiting confirmation | Client |

### 3.4 Connection State

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `connectionStatus` | `string` | WebSocket connection status | Client |
| `reconnecting` | `boolean` | Reconnection in progress | Client |
| `lastMessageTime` | `number` | Timestamp of last received message | Client |

---

## 4. State Ownership Matrix

| Category | Field | Server | Client (Host) | Client (Player) |
|----------|-------|--------|---------------|-----------------|
| **Phase** | `phase` | ✍ Write | 📖 Read | 📖 Read |
| | `roundNumber` | ✍ Write | 📖 Read | 📖 Read |
| | `timerRemaining` | ✍ Write | 📖 Read | 📖 Read |
| **Game** | `promptText` | ✍ Write | 📖 Read | 📖 Read |
| | `scoreboardJson` | ✍ Write | 📖 Read | 📖 Read |
| **Input** | `activeInputRequest` | ✍ Write | 📖 Read | ✍ Submit |
| **Private** | `privateState` | ✍ Write | ❌ None | 📖 Read |
| **Derived** | `connectionStatus` | ❌ None | 📖 Read | 📖 Read |
| | `localTimerValue` | ❌ None | ✍ Write | ✍ Write |

Legend:
- ✍ Write: Can modify this field
- 📖 Read: Can read this field
- ❌ None: No access to this field

---

## 5. Message Flow

### 5.1 State Update Flow

```
Server Script → updateSharedData() → PartyRoomDO.sharedData
                                          ↓
                               state_update message
                                          ↓
                              All clients receive
                                          ↓
                          PartyContext.roomState.sharedData
```

### 5.2 Private State Flow

```
Server Script → sendToPlayer(playerId, data) → PartyRoomDO
                                                    ↓
                                        private_state message
                                                    ↓
                                        Specific player only
                                                    ↓
                                    PartyContext.privateState
```

### 5.3 Input Flow

```
Server Script → requestInput() → input_request message → Player client
                                                            ↓
                                            Player submits answer
                                                            ↓
                                        input_response message → Server
                                                                    ↓
                                                    Server processes
```

---

## 6. Type Definitions (Reference)

### 6.1 Current Types (from `shared/src/types/party.ts`)

```typescript
interface PartyRoomState {
  phase: PartyRoomPhase;
  players: PartyPlayer[];
  hostId: string;
  roomCode?: string;
  sharedData?: Record<string, unknown>;  // ← Untyped bag
  currentRound?: number;
  maxRounds?: number;
}

interface PrivateStateMessage {
  type: "private_state";
  data: Record<string, unknown>;  // ← Untyped bag
}
```

### 6.2 Recommended Typed Schema (Future)

```typescript
// Shared state schema
interface SharedDataSchema {
  // Core phase state
  phase: GamePhase;
  roundNumber: number;
  totalRounds: number;
  timerRemaining: number;
  gameTemplate: string;
  
  // Game content
  promptText?: string;
  roundMultiplier?: number;
  
  // Scoreboard
  scoreboardJson?: string;
  winnerName?: string;
  
  // Game-specific (union types)
  ...QuiplashSharedData | CrowdComedySharedData;
}

// Private state schema
interface PrivateStateSchema {
  playerId: string;
  pendingInput?: PendingInputState;
  privatePrompt?: string;
  secretRole?: string;
}

// Derived state (client-only)
interface DerivedState {
  connectionStatus: ConnectionStatus;
  localTimerValue: number;
  isAnimating: boolean;
  optimisticAnswer?: string;
}
```

---

## 7. Implementation Notes

### 7.1 JSON Serialization

Complex objects are serialized as JSON strings for transport:
- `scoreboardJson` — Scoreboard array
- `answersJson` — Answer array
- `voteOptionsJson` — Vote options array
- `resultsJson` — Round results array
- `assignmentsJson` — Player assignments map
- `votersJson` — Voter ID array

**Rationale**: Avoids nested object complexity in `Record<string, unknown>` and provides clear serialization boundaries.

### 7.2 Timer Synchronization

The server owns `timerRemaining` and broadcasts updates. Clients should:
1. Use server value as source of truth
2. Interpolate locally for smooth UI
3. Never modify the timer value

### 7.3 Phase Transitions

Phase changes trigger:
1. `phase_change` message with optional metadata
2. `state_update` message with new `sharedData`
3. Client re-renders phase component via `PhaseRegistry`

---

## 8. Current sharedData Usage by Game

### 8.1 Quiplash

| Phase | sharedData Fields |
|-------|-------------------|
| `answering` | `phase`, `roundNumber`, `roundMultiplier`, `assignmentsJson`, `timerRemaining`, `matchupIndex`, `totalMatchups` |
| `voting` | `phase`, `roundNumber`, `roundMultiplier`, `promptText`, `answerA`, `answerB`, `matchupIndex`, `totalMatchups`, `timerRemaining`, `votersJson` |
| `reveal` | `phase`, `roundNumber`, `roundMultiplier`, `promptText`, `answerA`, `answerB`, `voteResultA`, `voteResultB`, `pointsA`, `pointsB`, `quiplashA`, `quiplashB`, `matchupIndex`, `totalMatchups`, `scoreboardJson` |
| `scores` | `phase`, `roundNumber`, `roundMultiplier`, `scoreboardJson` |
| `winner` | `phase`, `scoreboardJson`, `winnerName` |

### 8.2 Crowd Comedy

| Phase | sharedData Fields |
|-------|-------------------|
| `answering` | `phase`, `roundNumber`, `totalRounds`, `promptText`, `timerRemaining` |
| `reveal` | `phase`, `roundNumber`, `totalRounds`, `promptText`, `answersJson` |
| `voting` | `phase`, `roundNumber`, `totalRounds`, `promptText`, `voteOptionsJson`, `timerRemaining` |
| `round_results` | `phase`, `roundNumber`, `totalRounds`, `promptText`, `resultsJson`, `scoreboardJson` |
| `scores` | `phase`, `roundNumber`, `totalRounds`, `scoreboardJson` |
| `winner` | `phase`, `scoreboardJson`, `winnerName` |

---

## 9. Security Checklist

- [ ] Private secrets never in `sharedData`
- [ ] Player IDs anonymized in voting phases
- [ ] Self-votes rejected server-side
- [ ] Input validation on all `input_response` values
- [ ] Rate limiting on message frequency
- [ ] Host-only write access to `sharedData`

---

## 10. Next Steps

1. **Type the schema**: Replace `Record<string, unknown>` with typed interfaces
2. **Add validation**: Runtime validation of sharedData updates
3. **Document private state**: Define per-game private state schemas
4. **Add derived state hooks**: Create hooks for computed UI state
5. **Test state transitions**: Verify all phase transitions update state correctly
