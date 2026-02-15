# Party Platform Phase 1-2: Summary & Test Plan

## What We Built

This work transformed the party game system from **hardcoded TypeScript templates** into an **R2-oriented, script-driven architecture** where game logic lives in JavaScript server scripts executed inside a sandbox, using the same `slopcade/*` module system as arcade games.

### Architecture (Before → After)

**Before:**
```
PartyRoomDO → TEMPLATE_REGISTRY → quiplash.ts (hardcoded TS function)
                                 → crowd-comedy.ts (hardcoded TS function)
                                 → question-answer.ts (hardcoded TS function)
```

**After:**
```
PartyRoomDO → ServerScriptRunner → r2/games/quiplash/definition.json     (modules.server)
                                  → r2/games/crowd-comedy/definition.json  (modules.server)
                                  → r2/games/question-answer/definition.json (modules.server)
                                  ↓
                              require("slopcade/party")    ← shared scoring, matchups, voting
                              require("slopcade/content")  ← shared shuffle, selection

Client: phaseRegistry.ts → GameTemplate-specific phase renderers (extensible)
```

### The Key Idea

The script sandbox runs the same code everywhere:
- **Server (Cloudflare Worker)**: Authoritative game state via `ServerScriptRunner`
- **Host TV (future)**: Mirror for display via client sandbox
- **Player phones (future)**: Mirror for input via client sandbox

If the host's TV restarts, the game continues because state lives on the server.

---

## Module Inventory

### Server-Side (api/)

| Module | Path | Purpose |
|--------|------|---------|
| **ServerScriptRunner** | `api/src/party/ServerScriptRunner.ts` | Executes game scripts in a V8 sandbox with controlled `roomAPI` |
| **PartyRoomDO** | `api/src/party/PartyRoomDO.ts` | Durable Object: rooms, WebSocket, phases, input collection |
| **Protocol** | `api/src/party/protocol.ts` | Message encoding/decoding (now includes `private_state`) |
| **Content Loader** | `api/src/party/content/prompt-loader.ts` | Generic content pack loading by type |
| **Template Utils** | `api/src/party/templates/utils.ts` | Shared helpers (shuffle, delay, scoreboard) |
| **Registry** | `api/src/party/templates/registry.ts` | Maps game names → R2 definitions → ServerScriptRunner |

### Shared (shared/)

| Module | Path | Purpose |
|--------|------|---------|
| **slopcade/party** | `shared/src/scripting/modules/index.ts` | Scoreboard, matchups, vote tallying, point calculation |
| **slopcade/content** | `shared/src/scripting/modules/index.ts` | Shuffle, round selection, used-item tracking |

### Client-Side (app/)

| Module | Path | Purpose |
|--------|------|---------|
| **Phase Registry** | `app/lib/party/phaseRegistry.ts` | Extensible game phase → React component mapping |
| **Default Phases** | `app/lib/party/defaultPhases.tsx` | Default renderers for answering, voting, reveal, scores, winner |
| **BuzzerInput** | `app/components/party/BuzzerInput.tsx` | Reusable buzzer button component |
| **usePartyConnection** | `app/lib/party/usePartyConnection.ts` | WebSocket hook (now handles `private_state`) |

### R2 Game Definitions

| Game | Path | Status |
|------|------|--------|
| Quiplash | `r2/games/quiplash/definition.json` | ✅ Migrated to server script |
| Crowd Comedy | `r2/games/crowd-comedy/definition.json` | ✅ Migrated to server script |
| Question Answer | `r2/games/question-answer/definition.json` | ✅ Migrated to server script |

---

## PartyRoomDO API Surface (for game scripts)

Scripts interact with the server through a controlled `roomAPI` object:

```javascript
exports.run = async function(room, config) {
  room.setPhase("playing");                          // Set room lifecycle phase
  room.updateSharedData({ phase: "answering" });     // Broadcast data to all clients
  room.sendToPlayer("p1", { secret: "value" });      // Send private data to one player
  room.updatePlayerScore("p1", 100);                 // Update score

  var responses = await room.requestInput("round1", {
    type: "text", prompt: "Answer!", timeLimit: 30
  });                                                // Collect input from ALL players

  var subset = await room.requestInputFromSubset("judge", {
    type: "choice", options: ["A", "B"], timeLimit: 15
  }, ["p1", "p2"]);                                  // Collect from SPECIFIC players

  await room.delay(5000);                            // Pause
  var players = room.getPlayers();                   // Get connected player IDs
};
```

---

## Test Coverage Analysis

### What IS Tested (53 tests across 7 files)

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `ServerScriptRunner.test.ts` | 4 | Script execution, module require, error handling, async run |
| `PartyRoomDO.sendToPlayer.test.ts` | 2 | Targeted delivery, missing player no-op |
| `PartyRoomDO.requestInputFromSubset.test.ts` | 3 | Subset delivery, timeout/partial, empty subset |
| `protocol.test.ts` | 17 | All message types encode/decode (includes private_state) |
| `registry-quiplash-r2.test.ts` | 1 | R2-based quiplash executes all phases via ServerScriptRunner |
| `party.test.ts` (slopcade/party) | 13 | createScoreboard, createMatchups, tallyVotes, calculatePoints |
| `content.test.ts` (slopcade/content) | 13 | shuffle, selectForRound, markUsed |

### What is NOT Tested (Gaps)

| Gap | Risk | Recommendation |
|-----|------|----------------|
| **Full game flow integration** | HIGH | Add integration test that runs quiplash end-to-end with mocked players, verifying the exact sequence of phases and scoring |
| **Crowd-comedy R2 execution** | MEDIUM | Add test like `registry-quiplash-r2.test.ts` but for crowd-comedy |
| **Question-answer R2 execution** | MEDIUM | Same — add R2 execution test |
| **Client `privateState` flow** | MEDIUM | No automated test for the WebSocket handler in `usePartyConnection.ts` (React hook testing needed) |
| **Phase registry rendering** | LOW | No test that the phase registry correctly maps phases to components (would need React Testing Library) |
| **BuzzerInput component** | LOW | No component test (visual component, manual QA more appropriate) |
| **Content loader** | LOW | No test for `loadContentPack` (filesystem-dependent, would need fixture JSON) |
| **Reconnection/persistence** | HIGH | No test that DO state survives restart and script resumes. This is critical for production. |
| **Concurrent input timeout** | MEDIUM | No test for race conditions in input collection (multiple players responding near timeout) |

### Pre-Existing Test Issues
- `quiplash.test.ts` and `crowd-comedy.test.ts` have pre-existing failures (`ReferenceError: Cannot access before initialization`) — these tested the OLD hardcoded templates, not the new R2 path. They can be deleted or updated.

---

## Testing Strategy Recommendations

### Unit Tests (HIGH priority, automate now)

1. **Integration test for each R2 game**: Mock the roomAPI, execute the server script, and verify:
   - All expected phases fire in order
   - Scoring produces correct totals for known inputs
   - Edge cases: fewer players than expected, timeouts on all inputs
   
   ```typescript
   // Example: Full quiplash integration test
   it("runs quiplash through all phases with 4 players", async () => {
     const phases: string[] = [];
     const mockRoom = {
       setPhase: vi.fn(async (p) => { phases.push(p); }),
       updateSharedData: vi.fn(async (d) => { if (d.phase) phases.push(d.phase); }),
       requestInput: vi.fn(async () => new Map([
         ["p1", { value: "funny answer", playerId: "p1" }],
         ["p2", { value: "other answer", playerId: "p2" }],
         // ...
       ])),
       // ... other mocks
     };
     const runner = new ServerScriptRunner(mockRoom);
     await runner.execute(quiplashScript, { contentPack: testPrompts });
     expect(phases).toContain("answering");
     expect(phases).toContain("voting");
     expect(phases).toContain("winner");
   });
   ```

2. **DO persistence test**: Create room → start game → save state → create new room → load state → verify state matches.

3. **Delete or update legacy template tests**: `quiplash.test.ts` and `crowd-comedy.test.ts` test the old hardcoded path. Either delete them or update to test the R2 definitions.

### Integration Tests (MEDIUM priority)

4. **WebSocket end-to-end**: Use a test WebSocket client to connect to a PartyRoomDO (in miniflare or wrangler dev), join as host + players, start a game, and verify messages flow correctly. This tests the full stack: DO → protocol → WebSocket → client.

5. **Content pipeline → game execution**: Generate a content pack with the pipeline, load it via the content loader, pass to ServerScriptRunner, and verify the game uses the content correctly.

### Manual QA Checklist (do before production)

- [ ] Start a quiplash game with 3+ devices (or browser tabs)
- [ ] Verify host screen shows correct phases and data
- [ ] Verify player screens show input prompts at the right time
- [ ] Verify voting works and scores calculate correctly
- [ ] Verify game completes and shows winner
- [ ] Verify reconnection: disconnect a player mid-game, reconnect, verify they can continue
- [ ] Verify host restart: kill the host browser tab, reopen, verify game state recovers
- [ ] Test with exactly `minPlayers` (3) and with `maxPlayers` (8)
- [ ] Test timeout behavior: don't submit answers, verify game advances after timeout
- [ ] Repeat for crowd-comedy and question-answer

---

## What Changed in PartyRoomDO (Cleanup Summary)

### Removed (legacy/game-specific)
- `TEMPLATE_REGISTRY` import and usage
- `templateRunner` field and `setTemplateRunner()` method
- `PartyTemplateRunner` type
- `currentRound` / `maxRounds` fields (games manage rounds in sharedData now)
- `DEFAULT_ANSWER_TIMEOUT` / `DEFAULT_VOTE_TIMEOUT` constants
- Template-based game start path

### Kept (generic platform)
- `setPhase()` — room lifecycle (lobby → playing → ended)
- `updateSharedData()` — broadcast arbitrary data to all clients
- `requestInput()` — collect input from all players
- `requestInputFromSubset()` — collect from specific players
- `sendToPlayer()` — send private data to one player
- `updatePlayerScore()` — increment player score
- `getPlayers()` — get connected player IDs
- WebSocket management, reconnection, rate limiting
- Server script loading and execution via `ServerScriptRunner`

---

## Next Steps / Phase 3-4 Priorities

### Immediate (before production)
1. **Write integration tests** for all 3 R2 games (high-confidence game flow verification)
2. **Delete legacy template tests** (quiplash.test.ts, crowd-comedy.test.ts) or update them
3. **Test with real WebSocket connections** (miniflare or wrangler dev)

### Short-term (Phase 3)
4. **QuickJS WASM in Cloudflare Worker** — Replace `new Function()` with QuickJS for untrusted user scripts
5. **Client-side script mirrors** — Run the same sandbox on host/player devices for local state
6. **DrawingInput component** — Canvas-based drawing for party games
7. **Content pipeline expansion** — Add fibbage, caption, wordgame generation configs
8. **Bulk content generation** — Generate 500+ prompts per type

### Medium-term (Phase 4)
9. **User-authored party games** — Let users create GameDefinitions with server scripts
10. **Teams and roles** — Team-based mechanics, audience role, judge role
11. **Game state recovery** — Full DO persistence + client reconnection with state replay
12. **Bracket/tournament engine** — Multi-round elimination across games
