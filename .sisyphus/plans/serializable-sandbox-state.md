# Persistent Game State — Server-Private `room.state`

## Current Reality

The DO already persists the full public game state on every mutation:
- `phase` — current game phase
- `sharedData` — the entire public state blob (round, scores, results, etc.)
- `players` — player list with names and scores
- `templateId`, `serverScriptCode`, `serverScriptConfig` — enough to re-run the script

Scripts already push most of their state into `sharedData` as they go. The game "state" is largely already saved.

## The Actual Gap

Two things are NOT persisted:
1. **Server-private state** — secrets like the target answer, deck order, or player assignments that shouldn't be in `sharedData` (visible to clients)
2. **Resume awareness** — scripts don't know how to pick up from existing state on restart

## Solution: `room.state`

Add a server-private persistent JSON object that auto-saves alongside `sharedData`. Scripts use it for anything they want to persist that clients shouldn't see.

### Script Author Experience

```javascript
exports.run = async (room, config) => {
  var s = room.state; // {} on fresh start, restored state on resume

  if (!s.initialized) {
    // First time setup
    var responses = await room.requestInput("ready", ...);
    s.playerIds = Object.keys(responses);
    s.scores = {};
    s.round = 1;
    s.deckOrder = shuffle(contentPack);  // secret — don't want in sharedData
    s.initialized = true;
  }

  for (; s.round <= roundCount; s.round++) {
    s.target = s.deckOrder[s.round - 1];  // secret target
    await room.sendToPlayer(cueGiver, { target: s.target });

    var clue = await room.requestInput("clue", ...);
    // room.state auto-saved here ↑

    var guesses = await room.requestInput("guess", ...);
    // room.state auto-saved here ↑

    // score, update s.scores, etc.
  }

  await room.setPhase("ended");
};
```

### Key Design Decisions

**Auto-save, not manual**: `room.state` is persisted to DO storage every time the runner crosses an `await` boundary (same as `sharedData`). No explicit `save()` call needed.

**Opt-in persistence**: Scripts that don't use `room.state` work exactly as they do today. No changes to existing games required.

**Server-private**: `room.state` is never sent to clients. It's for secrets (answers, deck state) and resume bookkeeping (current round index).

**Same storage, different key**: Persisted alongside existing state in `saveState()` — just one more field in the DO storage blob.

### What This Enables

| Use Case | How |
|----------|-----|
| **DO eviction recovery** | Script restarts, finds `room.state.initialized = true`, skips setup, resumes from `room.state.round` |
| **"Pause and resume tomorrow"** | Host clicks "Pause". Players leave. Tomorrow, host clicks "Resume". DO loads state, re-runs script, script sees existing `room.state` and picks up |
| **Long-form board games** | Multi-day games store board position, turn order, resource counts in `room.state` |
| **Secret state** | Deck order, hidden roles, target answers — things that shouldn't leak to clients |

### What This Doesn't Do

- **Not transparent to the script** — scripts must be written to use `room.state` and handle the resume path. This is intentional: the script author knows what matters.
- **Not mid-await recovery** — if the DO dies while waiting for a `requestInput` response, the current request is lost. On resume, the script re-issues the request. Players re-submit. Acceptable for turn-based games.

## Implementation

| Component | Change |
|-----------|--------|
| `QuickJSServerRunner` | Expose `room.state` as a readable/writable global object. Snapshot it after each host async call resolves. |
| `PartyRoomDO.saveState()` | Add `serverState` field to the persisted blob |
| `PartyRoomDO.loadState()` | Restore `serverState` on wake |
| `PartyRoomDO.handleStartGame()` | Pass existing `serverState` to the runner (if resuming) |
| `RoomAPI` interface | Add `getState(): Record<string, unknown>` and `setState(state)` |

### Auto-Save Mechanics

The runner already crosses the host boundary on every `await` (each `room.*` call goes through the async bridge). We intercept the return path:

```
Script calls room.requestInput(...)
  → Host async function executes
  → Response received
  → BEFORE resolving the QuickJS promise:
      snapshot room.state from QuickJS context
      call PartyRoomDO.saveState() (which already saves sharedData, phase, etc.)
  → Resolve promise, script continues
```

This means `room.state` is saved at exactly the same frequency as `sharedData` — after every host interaction.

### Resume Flow

```
DO wakes up (eviction recovery or explicit resume)
  → loadState() restores phase, sharedData, players, AND serverState
  → If phase === "playing":
      → Look up template, get script code
      → Create QuickJSServerRunner
      → Inject room.state = serverState (pre-populated, not empty {})
      → Execute script
      → Script sees room.state.initialized === true, skips setup, resumes
```

## Future: Single-Player Persistence

Same API shape, different backend:

| Context | API | Storage |
|---------|-----|---------|
| Server party game | `room.state` | DO storage |
| Client single-player | `game.state` | AsyncStorage / D1 (keyed by user + game) |

Game authors learn one pattern. The persistence backend is swapped by the runtime.

## Effort

~1 day. One new field in DO storage, one new global object in the QuickJS context, auto-save hooks on the existing async bridge, and a resume path in `handleStartGame`.

## Files to Touch

| File | Change |
|------|--------|
| `api/src/party/QuickJSServerRunner.ts` | Expose `room.state`, snapshot after each async call |
| `api/src/party/PartyRoomDO.ts` | Add `serverState` to `saveState`/`loadState`, resume path in `handleStartGame` |
| `api/src/party/templates/registry.ts` | Pass `serverState` through to runner |
