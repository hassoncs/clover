## Quiplash MVP — Learnings

### Task 1: Content Generation Pipeline

- **Model factory pattern**: `createOpenAI` from `@ai-sdk/openai` pointed at `https://openrouter.ai/api/v1` — simple way to use any OpenRouter model with Vercel AI SDK.
- **Script tsconfig**: `api/tsconfig.json` `include` only covers `src/**/*.ts`. Scripts in `api/scripts/` are NOT type-checked by `tsc --noEmit`. Must check explicitly with inline compiler flags or a separate tsconfig.
- **Pre-existing TS errors**: `PackageCompiler.ts` and `PackageValidator.ts` have errors about missing `rules` property on `TagPayloads` — unrelated to party game work.
- **CLI pattern**: All scripts use `parseArgs` from `node:util` (built-in), shebang `#!/usr/bin/env tsx`, and `main().catch()` wrapper. Follow this for consistency.
- **Prompt JSON location**: `api/src/party/content/quiplash-prompts.json` — new directory created for party game static content.
- **`generateObject()` usage**: Takes `{ model, schema (zod), system, prompt, temperature }`. Returns `{ object, usage }`. Schema drives structured output.
- **Deduplication approach**: Levenshtein distance with 0.7 similarity threshold (30% distance tolerance). Good enough for MVP, avoids embedding dependencies.


### Task 0: Foundation Gaps — Scoring, Room Code, Lobby Gate

**Files modified:**
- `api/src/party/PartyRoomDO.ts` — `updatePlayerScore()`, lobby gate (`handleStartGame`), `setTemplateRunner()`, `setMinPlayers()`, `getRoomCode()`, roomCode storage in state
- `api/src/party/protocol.ts` — added `start_game` to valid message types
- `shared/src/types/party.ts` — added `StartGameMessage`, `roomCode` to `PartyRoomState`
- `app/lib/game-engine/systems/runner/wrappers/NetworkRuntimeSystem.ts` — injects `variables["roomCode"]` from room state
- `app/lib/game-engine/systems/runner/wrappers/MockNetworkSystem.ts` — mirrors roomCode injection
- `api/src/index.ts` — passes `roomCode: code` during room init

**Key patterns discovered:**
- `PartyRoomDO` uses `decodeMessage()` which validates against `VALID_MESSAGE_TYPES` set in protocol.ts. Any new message type must be added there.
- Room code is NOT part of the DO's identity — it's stored as state. The DO id is derived from `idFromName(code)` in the router.
- `handleInit()` is the POST /init endpoint, called once during room creation. This is where room-level config (minPlayers, roomCode) is injected.
- `templateRunner` is a function reference, not persisted to storage. Must be re-set after DO wake-up (doesn't survive hibernation). This is fine for now since templates run once per room lifecycle.
- `PartyRoomState.roomCode` flows through state_update messages to clients, where NetworkRuntimeSystem maps it to `variables["roomCode"]` (not under `room.` prefix — directly as `roomCode` for overlay `{{variables.roomCode}}` binding).

**Timeout constants:**
- `DEFAULT_ANSWER_TIMEOUT = 30_000` (30s) — exported from PartyRoomDO
- `DEFAULT_VOTE_TIMEOUT = 15_000` (15s) — exported from PartyRoomDO
- These are ms-based constants intended for use by templates (e.g., quiplash)

**Pre-existing tsc errors:**
- Both api/ and app/ have pre-existing type errors related to `rules`, `behaviors`, `script` properties being removed/renamed. None of these are from this task's changes.

### Task 3: Content Curation — Review and Finalize Prompt Pool

**Quality review outcome:**
- All 64 prompts passed quality review (clear, open-ended, appropriate length, no offensive content)
- Category distribution: 8 prompts per category across all 8 categories (animals, food, workplace, pop culture, hypothetical, absurd, relationships, technology)
- Format variety confirmed: fill-in-blank, "if X then Y", "worst/best X", quotes, hypotheticals
- No duplicates or near-duplicates detected
- No prompts removed or added — existing set is production-ready

**Loader utility created:**
- `api/src/party/content/prompt-loader.ts` — exports `loadPromptPool()`, `shufflePrompts()`, `selectPromptsForRound()`
- Uses Fisher-Yates shuffle algorithm for randomization
- `selectPromptsForRound()` filters out already-used prompts by ID before slicing
- `resolveJsonModule: true` already enabled in api/tsconfig.json — JSON import works out of the box
- No new TypeScript errors introduced (pre-existing errors in PackageCompiler/PackageValidator unrelated)

**Pattern for prompt selection:**
```typescript
const pool = loadPromptPool();
const shuffled = shufflePrompts(pool);
const usedIds = new Set<string>();
const roundPrompts = selectPromptsForRound(shuffled, 3, usedIds);
// Mark as used: roundPrompts.forEach(p => usedIds.add(p.id));
```

### Task 2: Quiplash Game Template

**Architecture decisions:**
- `requestInput` is a single-collector pattern — only one active at a time. Cannot send different prompts to different players simultaneously.
- **Player discovery**: No `getPlayers()` on PartyRoomDO (private). Used a "ready-check" buzzer `requestInput` at game start to discover player IDs from response keys. This doubles as a UX "get ready" moment.
- **Per-player prompts**: Broadcast all prompt assignments via `updateSharedData` (keyed by playerId in `assignmentsJson`). Single `requestInput` call collects all answers — each player submits a JSON object `{ matchupIndex: "answer text" }` as their response value.
- **Voting exclusion**: `requestInput` broadcasts to ALL players and waits for all or timeout. Authors of the current matchup's answers are filtered out server-side when counting votes. Their responses (if any) are ignored.

**Prompt assignment algorithm:**
- Circular pairing: With N players, create N matchups. Player[i] vs Player[(i+1) % N] for matchup i. Each player appears in exactly 2 matchups (as playerA in one, playerB in another).
- N prompts needed per round (one per matchup). 3 rounds × N prompts = 3N total prompts consumed.

**Scoring formula:**
- `points = round((votesFor / totalVotes) * 1000 * roundMultiplier)`
- Quiplash bonus: 100% of votes → 25% bonus (multiply by 1.25)
- `updatePlayerScore(playerId, delta)` is additive — call with the delta, not cumulative score.

**Timer pattern:**
- `setInterval` every 1s updates `timerRemaining` via `updateSharedData`. Cleared when `requestInput` resolves (either all responded or timeout).
- `requestInput.timeLimit` is in seconds (not ms). The constants `DEFAULT_ANSWER_TIMEOUT` and `DEFAULT_VOTE_TIMEOUT` are in ms — divide by 1000.

**SharedData phases:**
- `answering` → `voting` → `reveal` → `scores` (per round) → `winner` (final)
- `assignmentsJson` sent during answering phase for client to show per-player prompts
- `votersJson` sent during voting phase for client to know who should vote

### Task 4: GameDefinition + Overlays

**Files created:**
- `app/examples/quiplash/definition.json` — full GameDefinition with party config and overlay
- `app/examples/quiplash/index.ts` — example metadata export

**Pattern: party_test example as template:**
- Followed exact same structure: metadata export + `definition as GameDefinition` cast + default export
- `category: "party"` and `players: "3-8"` on metadata (party_test uses "1-8")
- `ExampleMeta` is just `ModuleMeta` — `{ title: string, [key: string]: unknown }` — so `category`/`players` are allowed via index signature

**Overlay patterns:**
- `visibleWhen` uses `role == 'host'` / `role == 'player'` combined with `room.phase == '...'` via `&&`
- Room code binding: `{{variables.roomCode}}` (not `room.roomCode`) — NetworkRuntimeSystem injects roomCode directly as a variable
- Phase-specific visibility: `room.phase == 'lobby'`, `room.phase == 'answering'`, `room.phase == 'voting'`, `room.phase == 'reveal'`, `room.phase == 'scores'`, `room.phase == 'winner'`
- Timer bar uses `bindings: { "value": "room.timerRemaining", "max": "30" }` for progress bar
- Player score binding: `room.player0_score` — NetworkRuntimeSystem injects player scores indexed by position
- `quiplashA`/`quiplashB` are booleans — visibleWhen `room.quiplashB == true` for conditional "QUIPLASH!" badge

**Script pattern:**
- `onNetworkState(ctx, state)` iterates key array to sync sharedData → game variables
- No `onPhaseChange` needed — phase is part of sharedData keys already

**Pre-existing tsc errors:**
- ~40 errors in app/ related to `rules`, `behaviors`, `script` properties — all pre-existing, none from quiplash files

### Task 5: Integration Tests

**File created:**
- `api/src/party/templates/__tests__/quiplash.test.ts` — 20 test cases across 6 describe blocks

**Testing strategy:**
- `runQuiplash` takes a `room` parameter typed as `PartyRoomDO`, but only uses 4 methods: `setPhase`, `updateSharedData`, `requestInput`, `updatePlayerScore`. Created a lightweight mock implementing just these methods.
- Internal helpers (`createMatchups`, `buildScoreboard`, `shuffle`) are module-private — tested indirectly through `runQuiplash` by inspecting `sharedDataUpdates` and `scoreUpdates`.
- Used `vi.useFakeTimers()` + `vi.runAllTimersAsync()` to handle the `delay()` calls in the template (5s reveal, 5s scores, 10s winner display).

**Mock pattern:**
- `createMockRoom(inputResolver)` — takes a function that maps `(requestId, request) → Map<string, PartyInputResponse>`. This drives the entire game flow by controlling what "players" respond.
- `buildFullGameResolver(playerIds, answersByRound?, votesByRound?)` — convenience builder for the common case of a full game with configurable answers and votes.
- Tracked all calls via arrays: `phases[]`, `sharedDataUpdates[]`, `scoreUpdates[]`, `inputRequests[]`.

**Pre-existing test failures:**
- `PartyRoomDO.test.ts` has 7 failing tests — all call `dobj.webSocketOpen()` which no longer exists (DO was refactored to fetch-based WebSocket upgrade). Not related to quiplash work.

**Key assertions:**
- Circular pairing verified by parsing `assignmentsJson` and building matchup-to-player sets
- Quiplash bonus tested by sending a single voter voting "0" (100% for A) and checking `pointsA = round(1000 * 1 * 1.25) = 1250`
- `(no answer)` default verified by returning empty Map from answer requestInput
- All 5 SharedData phases confirmed in sequence: answering → voting → reveal → scores → winner
