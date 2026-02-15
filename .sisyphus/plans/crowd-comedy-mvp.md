ok# Crowd Comedy MVP — First-Party Party Game

## TL;DR

> **What**: A fill-in-the-blank comedy party game simpler than Quiplash. Everyone answers the same prompt, votes for their favorite, winner crowned after N rounds.
>
> **Why simpler than Quiplash**: No matchups/pairings. No head-to-head voting. Everyone sees all answers. One vote per round. Dead simple.
>
> **What already exists**: Content pipeline (generates prompts via AI), PartyRoomDO (WebSocket rooms), template system, 100+ prompts in JSON, client hooks (partial).
>
> **What's missing**: App screens (zero party UI exists), client hook is broken (`requestId` handling), no voting in the simple template, no way to create/join rooms from the app.
>
> **Estimated Effort**: ~1 week
> **Parallel Execution**: YES — 2 independent tracks (backend + frontend)

---

## Game Design

### Flow
1. **Host creates room** → gets room code
2. **Players join** via code on their phones (3-8 players)
3. **Each round** (5 rounds default):
   - Prompt displayed to everyone (e.g., "The worst name for a pet: _____")
   - Everyone types their answer (30s timer)
   - ALL answers revealed simultaneously (anonymous)
   - Everyone votes for their favorite (can't vote for own, 15s timer)
   - Vote results shown → authors revealed → points awarded
   - Scoreboard shown
4. **Final winner announced**

### Scoring
- `+100` per vote received
- `+50` clean sweep bonus (got ALL votes)
- Tiebreaker: player who led first

### State Machine Phases
```
lobby → answering → reveal → voting → round_results → [next round] → winner
```

### SharedData Contract (server → all clients)
```typescript
// Phase: answering
{ phase: "answering", roundNumber: number, totalRounds: number, promptText: string, timerRemaining: number }

// Phase: reveal (anonymous)
{ phase: "reveal", roundNumber: number, promptText: string, answersJson: string /* [{id, text}] — id is opaque, not playerId */ }

// Phase: voting
{ phase: "voting", roundNumber: number, promptText: string, voteOptionsJson: string /* [{id, text}] */, timerRemaining: number }

// Phase: round_results
{ phase: "round_results", roundNumber: number, promptText: string, resultsJson: string /* [{answerId, text, authorName, voteCount, points}] */, scoreboardJson: string }

// Phase: winner
{ phase: "winner", winnerName: string, scoreboardJson: string }
```

### Input Requests
```typescript
// Answer phase: requestInput("answer-r{round}", { type: "text", prompt: promptText, timeLimit: 30 })
// Vote phase: requestInput("vote-r{round}", { type: "choice", options: [answerId1, answerId2, ...], timeLimit: 15 })
```

---

## Implementation Plan

### Wave 0: Contracts & Fixes (Sequential, ~1 hour)

#### Task 0.1 — Fix usePartyConnection hook
**Why MVP-blocking**: The hook doesn't handle `input_request` messages and hardcodes empty `requestId`.

**Files**:
- `app/lib/party/usePartyConnection.ts`
- `app/lib/party/types.ts` (re-export from shared)

**Changes**:
- Add `input_request` to `onmessage` handler → store current `requestId` + request in state
- Fix `sendInput` to include the active `requestId`
- Expose `currentInputRequest` in the return value so UI can render the right input
- Handle `requestId` being null (no active input request)

**Acceptance**: `sendInput` sends correct `requestId`. `input_request` messages surface to consuming components.

---

### Wave 1: Backend + Frontend in Parallel

#### Track A: Backend Template

##### Task 1.1 — Crowd Comedy Template Runner
**Category**: `unspecified-high`
**Skills**: `agent-orchestration`, `testing-patterns`

**Files**:
- `api/src/party/templates/crowd-comedy.ts` (new)
- `api/src/party/templates/registry.ts` (add to registry)
- `api/src/party/content/crowd-comedy-prompts.json` (new — can initially copy from quiplash-prompts.json)

**Implementation**:
```
runCrowdComedy(room):
  setPhase("playing")
  readyCheck → get playerIds
  
  for round in 1..ROUND_COUNT:
    pick prompt from pool
    
    // ANSWER PHASE
    updateSharedData({ phase: "answering", promptText, roundNumber, timerRemaining })
    answers = requestInput("answer-r{round}", { type: "text", timeLimit: 30 })
    
    // REVEAL PHASE — build anonymous answer list
    answerList = answers.map((playerId, response) => ({ id: randomId, text: response.value, authorId: playerId }))
    shuffle(answerList)
    updateSharedData({ phase: "reveal", answersJson: JSON.stringify(answerList.map(a => ({id: a.id, text: a.text}))) })
    delay(3000)
    
    // VOTE PHASE
    updateSharedData({ phase: "voting", voteOptionsJson, timerRemaining: 15 })
    votes = requestInput("vote-r{round}", { type: "choice", options: answerIds, timeLimit: 15 })
    
    // TALLY — reject self-votes server-side
    for each vote: if voter authored the answer they voted for → skip
    count votes per answerId
    award 100 pts per vote, +50 clean sweep bonus
    
    // ROUND RESULTS
    updateSharedData({ phase: "round_results", resultsJson, scoreboardJson })
    delay(5000)
  
  // WINNER
  updateSharedData({ phase: "winner", winnerName, scoreboardJson })
  delay(10000)
  setPhase("ended")
```

**Acceptance**:
- [x] Room requires 3+ players to start
- [x] Each round: answer → reveal → vote → results
- [x] Self-votes rejected server-side
- [x] Scores accumulate correctly
- [x] Winner is highest score
- [x] Handles timeouts gracefully (no answer = "(no answer)", no vote = skipped)

##### Task 1.2 — Template Tests
**Category**: `unspecified-low`  
**Skills**: `testing-patterns`

**Files**: `api/src/party/templates/__tests__/crowd-comedy.test.ts` (new)

**Test cases**:
- Min players enforcement
- Full round cycle (answer → vote → score)
- Self-vote rejection
- Timeout behavior (partial responses)
- Clean sweep bonus
- Winner ordering
- No duplicate prompts within a game

---

#### Track B: App Screens

##### Task 1.3 — Party Room API Client
**Category**: `quick`
**Skills**: `auth-system`

**Files**: `app/lib/party/api.ts` (new)

**Implementation**:
- `createRoom(template, minPlayers)` → calls `POST /api/party/create` → returns `{ code, hostToken, hostId }`
- Handles auth token injection

**Acceptance**: Can create a room from the app and get a room code back.

##### Task 1.4 — Party Screens (Join + Lobby + Game)
**Category**: `visual-engineering`
**Skills**: `frontend-ui-ux`, `nativewind-theming`

**Files** (all new):
- `app/app/party/index.tsx` — Entry: "Host Game" or "Join Game" buttons
- `app/app/party/join.tsx` — Enter room code + name
- `app/app/party/host.tsx` — Shows room code, player list, "Start" button
- `app/app/party/play.tsx` — The game screen (phase-driven rendering)
- `app/components/party/AnswerInput.tsx` — Text input for answer phase
- `app/components/party/VoteList.tsx` — List of answers to vote on
- `app/components/party/Scoreboard.tsx` — Score display
- `app/components/party/Timer.tsx` — Countdown timer
- `app/components/party/PromptCard.tsx` — The question/prompt display

**Screen flow**:
```
/party → Host Game → create room → /party/host (show code, wait for players, Start button)
/party → Join Game → /party/join (enter code + name) → /party/play
Host clicks Start → /party/play (both host and players)
```

**Phase rendering in play.tsx**:
- `lobby` → "Waiting to start..." (player) / player list + Start (host)  
- `answering` → PromptCard + AnswerInput + Timer
- `reveal` → PromptCard + answer list (anonymous)
- `voting` → PromptCard + VoteList (tap to vote) + Timer
- `round_results` → Results with authors revealed + Scoreboard
- `winner` → Winner announcement + final Scoreboard

**Acceptance**:
- Host can create room and see code
- Player can join with code and name
- All 6 phases render correctly
- Input works on mobile (keyboard doesn't obscure)
- Timer shows countdown

---

### Wave 2: Content + Integration

##### Task 2.1 — Generate Prompt Pack
**Category**: `quick`
**Skills**: `ai-sdk-usage`

**Commands**:
```bash
hush run -- pnpm content cli -- generate --game-type=quip --count=100
pnpm content cli -- moderate
pnpm content cli -- build-pack --name="Crowd Comedy Pack" --game-type=quip --output=api/src/party/content/crowd-comedy-prompts.json
```

**Acceptance**: 100+ moderated, deduplicated prompts in the JSON file. No offensive content.

##### Task 2.2 — End-to-End Smoke Test
**Category**: `deep`
**Skills**: `testing-patterns`, `editor-browser-testing`

**Test**:
1. Start API locally
2. Create room via API
3. Connect 3 WebSocket clients (1 host + 2 players) 
4. Play through full game (5 rounds)
5. Verify: scores accumulate, winner declared, room cleans up

**Acceptance**: Full game plays through without errors. Template logs show expected state transitions.

---

## Gaps Analysis

| Gap | MVP Blocking? | Resolution |
|-----|--------------|------------|
| No party UI screens in app | **YES** | Task 1.4 |
| `usePartyConnection` broken `requestId` | **YES** | Task 0.1 |
| `question-answer.ts` has no voting | N/A | We're building a new template, not fixing old one |
| No room discovery/listing | No | MVP uses room codes only |
| No QR code join | No | Post-MVP |
| No deep links | No | Post-MVP |
| No spectator mode | No | Post-MVP |
| No animations/transitions | No | Post-MVP polish |
| No sound effects | No | Post-MVP polish |
| Content moderation UI | No | CLI moderation is sufficient for first-party |

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| WebSocket drops mid-game | Existing 60s reconnect window in PartyRoomDO handles this |
| Offensive user-submitted answers | MVP scope — between friends. Post-MVP: add report button |
| Too few prompts for repeat play | Generate 100+ prompts. Pool is shuffled per game. |
| Mobile keyboard obscures input | Use `KeyboardAvoidingView` and test on actual devices |

## File Change Summary

| File | Action |
|------|--------|
| `app/lib/party/usePartyConnection.ts` | Fix |
| `api/src/party/templates/crowd-comedy.ts` | New |
| `api/src/party/templates/registry.ts` | Edit (add entry) |
| `api/src/party/content/crowd-comedy-prompts.json` | New (generated) |
| `api/src/party/templates/__tests__/crowd-comedy.test.ts` | New |
| `app/lib/party/api.ts` | New |
| `app/app/party/index.tsx` | New |
| `app/app/party/join.tsx` | New |
| `app/app/party/host.tsx` | New |
| `app/app/party/play.tsx` | New |
| `app/components/party/*.tsx` | New (5-6 components) |
