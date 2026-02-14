# Quiplash MVP — Party Game #1

## TL;DR

> **Quick Summary**: Build a playable Quiplash clone on the existing Party Game Builder foundation. Players join via room code on phones, receive fill-in-the-blank comedy prompts, submit text answers, then vote head-to-head on the funniest response. Includes shared infrastructure (voting, scoring, content pipeline) that Fibbage and Trivia Murder Party will reuse.
>
> **Deliverables**:
> - `quiplash.ts` — Server-side game template with 3-round structure, head-to-head voting, and scoring
> - `quiplash/definition.json` — GameDefinition with role-based overlays for host (TV) and player (phone)
> - `generate-quiplash-prompts.ts` — AI batch content generation script producing 50-100 prompts
> - `quiplash-prompts.json` — Curated prompt pool shipped with the game
> - Shared voting infrastructure reusable by Fibbage and Trivia Murder Party
> - Scoring system with per-player point tracking and winner announcement
>
> **Estimated Effort**: Medium (1-2 weeks)
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 0 (foundation gaps) → Task 1 (content) → Task 2 (template) → Task 4 (game def) → Task 5 (E2E)
> **Prerequisites**: Party Game Builder foundation (`.sisyphus/plans/party-game-builder.md` Tasks 1-7 complete)

---

## Context

### Original Request
Build a Quiplash-style party game as the first of three Jackbox-style MVPs. This plan includes shared infrastructure (voting, scoring, content pipeline) that the Fibbage and Trivia Murder Party plans will reference and reuse.

### How Quiplash Works (Reference)
1. **Lobby**: Host creates room, players join via code on phones (3-8 players)
2. **Round Start**: Each player receives 2 unique prompts (e.g., "The worst superpower: _____")
3. **Answer Phase** (30s): Players type funny answers on their phones
4. **Voting Phase**: Answers shown head-to-head (2 at a time), all OTHER players vote for their favorite
5. **Scoring**: Points awarded based on vote percentage. "Quiplash" bonus if you get 100% of votes.
6. **Repeat**: 3 rounds, each with escalating point values (Round 1: 1x, Round 2: 2x, Round 3: 3x)
7. **Winner**: Player with highest total score wins

### What Already Exists
- `api/src/party/PartyRoomDO.ts` — Room lifecycle, WebSocket, state broadcast, `requestInput()`
- `api/src/party/templates/question-answer.ts` — Basic Q&A template (prompts → answers → reveal)
- `app/examples/party_test/definition.json` — Working game def with role-based overlays
- `shared/src/types/party.ts` — All party types including `PartyInputRequest` with text/choice/drawing/buzzer
- `app/lib/game-engine/systems/runner/wrappers/NetworkRuntimeSystem.ts` — Network → game variables
- `app/lib/party/usePartyConnection.ts` — WebSocket client hook

### Foundation Gaps (Identified by Metis)
The existing foundation handles prompts → answers → reveal but is missing:
- **Scoring mechanism** — `PartyPlayer.score` exists but no `updatePlayerScore()` method
- **Room code injection** — `{{variables.roomCode}}` in overlay but no setter in NetworkRuntimeSystem
- **Lobby gate** — Template runs immediately; no "wait for host to press Start" logic
- **Voting** — `requestInput({ type: "choice" })` exists but hasn't been used for player-vs-player voting
- **Content storage** — Only 5 hardcoded prompts; no content pipeline

### Research Findings
- `requestInput({ type: "choice", options: [...] })` can be used for voting — players select from options
- `updateSharedData()` can carry scores as `{ scores: { alice: 10, bob: 5 } }`
- Overlay bindings support nested paths: `{{room.scores.alice}}` works with `allowMemberAccess: true`
- Timer sync already works via `timerRemaining` in sharedData
- AI prompt generation at temperature 0.8-1.0 with category rotation produces good comedy prompts

---

## Work Objectives

### Core Objective
Ship a playable 3-round Quiplash clone with AI-generated prompts, head-to-head voting, and scoring — while building reusable voting/scoring infrastructure for future party games.

### Concrete Deliverables
- `api/src/party/templates/quiplash.ts` — Server-side game logic
- `api/src/party/content/quiplash-prompts.json` — 50-100 AI-generated prompts
- `api/scripts/generate-party-content.ts` — Batch content generation script
- `app/examples/quiplash/definition.json` — GameDefinition for host + player
- `app/examples/quiplash/index.ts` — Example registration

### Definition of Done
- [ ] 3+ players can join a room, play 3 rounds of Quiplash, and see a winner
- [ ] Each player receives 2 unique prompts per round and submits text answers
- [ ] Voting phase shows 2 answers head-to-head; non-authors vote for favorite
- [ ] Scores update based on vote percentage; "Quiplash" bonus for 100% votes
- [ ] Game ships with 50+ AI-generated comedy prompts
- [ ] Host screen shows room code, prompts, answers, scores, and winner
- [ ] Player screen shows input prompts, voting choices, and personal score
- [ ] `tsc --noEmit` passes in all workspaces
- [ ] vitest tests pass for game template logic

### Must Have
- 3-round game structure with escalating point values
- Head-to-head voting via `requestInput({ type: "choice" })`
- Per-player scoring tracked in `sharedData`
- 50+ prompts in shipped JSON file
- Minimum 3 players enforced (error if fewer)
- 30-second answer timer, 15-second vote timer
- Winner announcement at game end
- Room code visible on host screen

### Must NOT Have (Guardrails)
- No separate React UI — use existing game engine overlays only
- No external API integration — AI batch generation only
- No content moderation or filtering
- No drawing/image input — text only
- No player accounts or authentication — anonymous join via code
- No spectator mode
- No host migration
- No replay system
- No analytics or metrics
- No custom avatars or player customization
- No sound effects or music
- No animations between phases (overlay visibility switching is sufficient)
- No lobby chat
- No persistent leaderboards across games

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: YES (tests after implementation)
- **Framework**: vitest for unit/integration, Playwright for E2E
- **Agent-Executed QA**: ALWAYS

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 0: Foundation gaps (scoring, room code injection, lobby gate)
├── Task 1: Content generation pipeline (AI batch → JSON)
└── (parallel where possible)

Wave 2 (After Wave 1):
├── Task 2: Quiplash game template (3 rounds, voting, scoring)
└── Task 3: Content curation (review & finalize 50+ prompts)

Wave 3 (After Wave 2):
├── Task 4: GameDefinition + overlays (host TV + player phone)
├── Task 5: Integration tests
└── Task 6: E2E test + verification
```

### Dependency Matrix

| Task | Depends On | Blocks | Parallelize With |
|------|------------|--------|-----------------|
| 0 | None | 2, 4 | 1 |
| 1 | None | 3 | 0 |
| 2 | 0 | 4, 5, 6 | 3 |
| 3 | 1 | 4 | 2 |
| 4 | 2, 3 | 6 | 5 |
| 5 | 2 | 6 | 4 |
| 6 | 4, 5 | None | None (final) |

---

## TODOs

---

- [ ] 0. Foundation Gaps — Scoring, Room Code, Lobby Gate

  **What to do**:
  - **Scoring**: Add a `updatePlayerScore(playerId: string, delta: number)` method to `PartyRoomDO` that updates `PartyPlayer.score` and broadcasts updated state. If adding a method is too invasive, track scores in `sharedData.scores` (a `Record<string, number>`) and expose a helper in templates.
  - **Room code injection**: In `NetworkRuntimeSystem`, when processing a `state_update`, also set `gameState.variables["roomCode"]` from the room code (passed via WebSocket URL or initial state snapshot). Verify `{{variables.roomCode}}` resolves in overlay.
  - **Lobby gate**: Modify `PartyRoomDO` to support a "waiting for host start" flow. The DO should NOT auto-run the game template on room creation. Instead:
    1. Room starts in `lobby` phase
    2. Host sends a `start_game` message
    3. DO validates minimum player count (configurable, default 3)
    4. If valid, transitions to `playing` and runs the template
    5. If invalid, sends error: `{ type: "error", code: "MIN_PLAYERS", message: "Need at least 3 players" }`
  - **Timeout behavior**: Define default behavior for non-responsive players:
    - Answer timeout: Submit empty string, display as "(no answer)"
    - Vote timeout: Skip vote, no penalty

  **Must NOT do**:
  - Do not refactor PartyRoomDO — additive changes only
  - Do not modify NetworkRuntimeSystem's existing variable mapping
  - Do not add player accounts or auth

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`game-authoring/scripting-api-reference`, `ecs-architecture`]

  **References**:
  - `api/src/party/PartyRoomDO.ts` — Room DO to extend
  - `shared/src/types/party.ts:11-18` — `PartyPlayer` with existing `score?: number` field
  - `app/lib/game-engine/systems/runner/wrappers/NetworkRuntimeSystem.ts` — Room code injection point
  - `api/src/party/templates/question-answer.ts` — Current template pattern

  **Acceptance Criteria**:
  - [ ] `room.updatePlayerScore(playerId, 100)` updates `PartyPlayer.score` and triggers state broadcast
  - [ ] `gameState.variables["roomCode"]` is set by NetworkRuntimeSystem
  - [ ] `{{variables.roomCode}}` resolves in overlay text binding
  - [ ] Host can send `start_game` message, DO validates min players before running template
  - [ ] Sending `start_game` with fewer than `minPlayers` returns error message
  - [ ] `tsc --noEmit` passes in api/ and app/

  **Commit**: YES
  - Message: `feat(party): add scoring, room code injection, and lobby gate`

---

- [ ] 1. Content Generation Pipeline — AI Batch Prompts

  **What to do**:
  - Create `api/scripts/generate-party-content.ts` — CLI script that:
    1. Takes `--game=quiplash --count=100` parameters
    2. Uses LLM (via existing AI infrastructure) to generate fill-in-the-blank comedy prompts
    3. Uses category rotation: pop culture, food, animals, workplace, hypothetical, absurd, relationships, technology
    4. Uses format variation: "The worst X: _____", "A rejected X", "Something you should never bring to a X", "If X had a side hustle..."
    5. De-duplicates via embedding similarity (reject > 0.85 cosine similarity)
    6. Outputs to `api/src/party/content/quiplash-prompts.json`
    7. Each prompt: `{ "id": "q001", "text": "The worst name for a pet: _____", "category": "animals" }`
  - Prompt engineering: Use structured LLM prompt requesting 10 prompts at a time, temperature 0.9, with explicit format requirements (10-20 words, open-ended, inherently funny, avoids hate/explicit content)
  - Run with `hush run -- npx tsx api/scripts/generate-party-content.ts --game=quiplash --count=100`

  **Must NOT do**:
  - Do not integrate with external APIs (Open Trivia DB, etc.) — AI only for MVP
  - Do not add real-time generation — batch only
  - Do not build a content management UI
  - Do not implement content moderation beyond the LLM's own guardrails

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`ai-game-generation`]

  **References**:
  - `api/src/ai/agent/stages/build.ts` — Existing LLM generation pattern with `generateObject`
  - `api/scripts/generate-assets.ts` — Existing batch generation CLI pattern
  - `api/scripts/generate-sound.ts` — Another batch generation CLI pattern
  - `api/src/ai/game/schemas.ts` — Zod schema patterns for structured output

  **Acceptance Criteria**:
  - [ ] `api/scripts/generate-party-content.ts` exists and runs without errors
  - [ ] `api/src/party/content/quiplash-prompts.json` contains 50+ unique prompts
  - [ ] Each prompt has `id`, `text`, and `category` fields
  - [ ] No two prompts have > 0.85 cosine similarity
  - [ ] Prompts are 10-25 words, open-ended, suitable for comedy answers
  - [ ] `tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(party): add AI content generation pipeline and quiplash prompts`

---

- [ ] 2. Quiplash Game Template — 3 Rounds, Voting, Scoring

  **What to do**:
  - Create `api/src/party/templates/quiplash.ts` with the full game loop:

  **Game Flow**:
  ```
  lobby (wait for host start)
    → Round 1 (1x points)
      → Prompt Assignment: each player gets 2 unique prompts
      → Answer Phase (30s): players submit text via requestInput({ type: "text" })
      → Matchup Phase: for each prompt, show 2 answers head-to-head
        → Vote Phase (15s): non-authors vote via requestInput({ type: "choice", options: [answerA, answerB] })
        → Reveal Phase (5s): show vote results, award points
      → Round Scores
    → Round 2 (2x points) — same flow
    → Round 3 (3x points) — same flow, optional "last lash" (single prompt, all players answer)
    → Final Scores + Winner
  ```

  **Prompt Assignment Logic**:
  - Load prompts from `quiplash-prompts.json` (injected at template instantiation)
  - Each player gets 2 unique prompts per round (no player sees the same prompt twice)
  - Each prompt is answered by exactly 2 players (for head-to-head matchups)
  - With N players: need N prompts per round (each player answers 2, each prompt has 2 answers)
  - Shuffle and assign: Player A gets prompts [1,2], Player B gets prompts [1,3], Player C gets prompts [2,3], etc.

  **Voting Logic**:
  - For each prompt matchup, display both answers (anonymized during voting)
  - ALL players who did NOT author either answer vote
  - Use `requestInput({ type: "choice", options: ["Answer A text", "Answer B text"], prompt: originalPrompt })`
  - If only 2 answers exist (head-to-head), show them side by side
  - Ties: both players get equal points

  **Scoring**:
  - Points = (votes received / total votes cast) × 1000 × round_multiplier
  - Round multipliers: Round 1 = 1x, Round 2 = 2x, Round 3 = 3x
  - "Quiplash" bonus: If a player gets 100% of votes, award 25% extra points
  - Track via `room.updatePlayerScore(playerId, points)` (from Task 0)
  - Broadcast scoreboard via `sharedData.scores` after each matchup

  **Edge Cases**:
  - 2 players: Error "Need at least 3 players" (enforced in Task 0 lobby gate)
  - Player disconnects mid-round: Keep their submitted answer, skip their vote
  - No answer submitted (timeout): Display "(no answer)" — can still win votes
  - No votes cast (all timeout): Both players get 0 points for that matchup
  - Identical answers: Show both, distinguish by player color/number

  **Must NOT do**:
  - No audience/spectator voting
  - No custom round configurations
  - No "safety quips" (fallback jokes) — that's Jackbox polish, not MVP
  - No animations or transitions — phase changes via sharedData only
  - No sound effects

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: [`game-authoring`, `game-authoring/scripting-api-reference`]

  **References**:
  - `api/src/party/templates/question-answer.ts` — Base template pattern to extend
  - `api/src/party/PartyRoomDO.ts` — `requestInput()`, `updateSharedData()`, `updatePlayerScore()`
  - `shared/src/types/party.ts` — `PartyInputRequest` with `type: "choice"` and `options`

  **Acceptance Criteria**:
  - [ ] Template exists at `api/src/party/templates/quiplash.ts`
  - [ ] Template loads prompts from JSON file
  - [ ] Each player receives exactly 2 unique prompts per round
  - [ ] Each prompt creates a head-to-head matchup between 2 answers
  - [ ] Non-authors vote via `requestInput({ type: "choice" })`
  - [ ] Scores update after each matchup based on vote percentage
  - [ ] 3 rounds execute with 1x, 2x, 3x multipliers
  - [ ] Winner determined by highest total score
  - [ ] Handles 3-8 players correctly
  - [ ] Handles timeout (no answer, no vote) gracefully
  - [ ] `tsc --noEmit` passes

  **Agent-Executed QA**:
  ```
  Scenario: Template logic unit tests
    Tool: Bash (vitest)
    Steps:
      1. Run: cd api && npx vitest run src/party/templates/__tests__/quiplash.test.ts
      2. Assert: "assigns 2 unique prompts per player" passes
      3. Assert: "creates correct head-to-head matchups" passes
      4. Assert: "calculates scores from vote percentages" passes
      5. Assert: "applies round multipliers" passes
      6. Assert: "awards quiplash bonus for 100% votes" passes
    Expected Result: All tests pass
  ```

  **Commit**: YES
  - Message: `feat(party): add quiplash game template with voting and scoring`

---

- [ ] 3. Content Curation — Review and Finalize Prompt Pool

  **What to do**:
  - Run the content generation script from Task 1 to produce ~100 raw prompts
  - Review generated prompts for quality:
    - Remove duplicates or near-duplicates
    - Remove prompts that are too niche, offensive, or unclear
    - Ensure category distribution is balanced
    - Ensure format variety (not all "The worst X" patterns)
  - Finalize `api/src/party/content/quiplash-prompts.json` with 50-100 curated prompts
  - Add a `promptPool` loading function in the template that shuffles and selects prompts per game session

  **Must NOT do**:
  - Do not manually write all prompts — use AI-generated as the base
  - Do not build a content management UI

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Acceptance Criteria**:
  - [ ] `quiplash-prompts.json` contains 50-100 prompts
  - [ ] At least 6 different categories represented
  - [ ] At least 4 different prompt formats used
  - [ ] No obviously offensive or unclear prompts
  - [ ] Template loads and shuffles prompts correctly

  **Commit**: YES
  - Message: `content: curate quiplash prompt pool (50+ prompts)`

---

- [ ] 4. GameDefinition + Overlays — Host TV + Player Phone

  **What to do**:
  - Create `app/examples/quiplash/definition.json` — Full GameDefinition:
    - `party: { maxPlayers: 8, minPlayers: 3 }`
    - Variables for all game state: `phase`, `roundNumber`, `promptText`, `answerA`, `answerB`, `scoreboardJson`, `winnerName`, `timerRemaining`, `matchupIndex`, `totalMatchups`, `voteResultA`, `voteResultB`
    - Background entity with solid color or simple gradient

  - **Host (TV) Overlay Elements** — `visibleWhen: "role == 'host'"`:
    - Room code badge (top-right, always visible during lobby)
    - Player count (top-left)
    - Lobby: Title "Quiplash" + "Waiting for players..." + "Start Game" button
    - Round banner: "ROUND {{room.roundNumber}}" with point multiplier
    - Prompt display: Large centered text showing the current prompt
    - Head-to-head: Two answer cards side by side (Answer A vs Answer B)
    - Vote results: Percentage bars showing votes per answer + point awards
    - Scoreboard: Ranked list of players and scores (between rounds)
    - Winner announcement: Big "WINNER: {{room.winnerName}}" at game end

  - **Player (Phone) Overlay Elements** — `visibleWhen: "role == 'player'"`:
    - Lobby: "Joined! Waiting for host to start..."
    - Answer phase: Current prompt text + "(Type your answer on your phone)" hint
    - Voting phase: "(Vote on your phone)" hint
    - Score: Personal score display
    - Winner phase: "Game Over! Final Score: {{room.myScore}}"

  - **Shared Elements** (visible to both):
    - Timer bar (during answer and voting phases)
    - Round/question counter

  - Create `app/examples/quiplash/index.ts` with metadata export
  - Register in examples registry

  **Script field**:
  ```javascript
  exports.onNetworkState = function(ctx, state) {
    // Map all room state keys to local variables
    var keys = ['phase', 'roundNumber', 'promptText', 'answerA', 'answerB',
                'scoreboardJson', 'winnerName', 'timerRemaining',
                'matchupIndex', 'totalMatchups', 'voteResultA', 'voteResultB'];
    for (var i = 0; i < keys.length; i++) {
      if (state[keys[i]] !== undefined) ctx.setVariable(keys[i], state[keys[i]]);
    }
  };
  ```

  **Must NOT do**:
  - No custom React components — overlay elements only
  - No Godot-specific entities (no physics bodies, no sprites beyond background)
  - No animations or transitions
  - No sound

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`game-authoring`, `game-authoring/game-definition-reference`, `game-authoring/examples`]

  **References**:
  - `app/examples/party_test/definition.json` — Existing party game definition pattern
  - `shared/src/types/overlay.ts` — Available overlay element types
  - `shared/src/types/GameDefinition.ts` — Full schema

  **Acceptance Criteria**:
  - [ ] `app/examples/quiplash/definition.json` exists with valid GameDefinition
  - [ ] Host overlay shows: room code, player count, prompts, answers, scores, winner
  - [ ] Player overlay shows: lobby status, answer prompt hint, vote hint, personal score
  - [ ] `visibleWhen` correctly filters elements by role AND game phase
  - [ ] Timer bar binds to `room.timerRemaining`
  - [ ] Scoreboard displays ranked player list
  - [ ] `tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat: add quiplash game definition with host and player overlays`

---

- [ ] 5. Integration Tests

  **What to do**:
  - `api/src/party/templates/__tests__/quiplash.test.ts`:
    - Prompt assignment: N players get 2 unique prompts each
    - Matchup creation: each prompt produces a head-to-head
    - Voting: choice input with correct options
    - Scoring: vote percentage → points with round multipliers
    - Quiplash bonus: 100% votes → 25% bonus
    - Edge cases: timeout, disconnect, ties
  - `api/src/party/__tests__/scoring.test.ts` (if scoring is a shared module):
    - `updatePlayerScore` updates and broadcasts
    - Score calculation accuracy
  - `api/src/party/__tests__/lobby-gate.test.ts`:
    - Start with min players → success
    - Start with fewer → error
    - Start with no players → error

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`testing-patterns`]

  **Acceptance Criteria**:
  - [ ] `cd api && npx vitest run src/party/templates/__tests__/quiplash` → all pass
  - [ ] `cd api && npx vitest run src/party/__tests__/` → all pass
  - [ ] At least 15 test cases total
  - [ ] Edge cases covered: timeout, disconnect, ties, min players

  **Commit**: YES
  - Message: `test: add quiplash game template and party infrastructure tests`

---

- [ ] 6. E2E Test + Final Verification

  **What to do**:
  - Create Playwright E2E test for full Quiplash game
  - Multi-page: 1 host browser + 3 player browsers (minimum for Quiplash)
  - Full flow: create room → join 3 players → start → answer prompts → vote → verify scores → winner
  - Verify `tsc --noEmit` across all workspaces
  - Verify no regressions in existing game engine tests

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`playwright`, `testing-patterns`]

  **Acceptance Criteria**:
  - [ ] E2E test passes with 3 simulated players
  - [ ] Host screen shows room code, prompts, answers, votes, scores, winner
  - [ ] Player screens show prompts, voting choices
  - [ ] Scores update correctly after each matchup
  - [ ] Winner announced after 3 rounds
  - [ ] `tsc --noEmit` passes in shared/, api/, app/
  - [ ] Existing game engine tests still pass (no regressions)

  **Commit**: YES
  - Message: `test(e2e): add quiplash end-to-end test`

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 0 | `feat(party): add scoring, room code injection, and lobby gate` | `tsc --noEmit` |
| 1 | `feat(party): add AI content generation pipeline and quiplash prompts` | Script runs |
| 2 | `feat(party): add quiplash game template with voting and scoring` | vitest |
| 3 | `content: curate quiplash prompt pool (50+ prompts)` | JSON valid |
| 4 | `feat: add quiplash game definition with host and player overlays` | `tsc --noEmit` |
| 5 | `test: add quiplash game template and party infrastructure tests` | vitest |
| 6 | `test(e2e): add quiplash end-to-end test` | Playwright |

---

## Success Criteria

### Verification Commands
```bash
cd shared && npx tsc --noEmit    # Expected: 0 errors
cd api && npx tsc --noEmit       # Expected: 0 errors
cd app && npx tsc --noEmit       # Expected: 0 errors
cd api && npx vitest run src/party/   # Expected: all pass
npx playwright test tests/e2e/quiplash/  # Expected: full game flow passes
```

### Final Checklist
- [ ] 3+ players can play a complete 3-round game
- [ ] Head-to-head voting works with choice input
- [ ] Scores calculated correctly with round multipliers
- [ ] 50+ unique prompts ship with the game
- [ ] Host and player screens show correct information per phase
- [ ] No modifications to existing game engine systems
- [ ] Voting and scoring infrastructure is reusable (Fibbage/Trivia plans reference it)

---

## Shared Infrastructure Built Here (Referenced by Fibbage + Trivia Plans)

Other plans should reference these components rather than rebuilding:
- **Scoring**: `room.updatePlayerScore(playerId, delta)` — generic per-player scoring
- **Lobby gate**: Host must press Start, min player validation
- **Room code injection**: `{{variables.roomCode}}` in overlays
- **Content loading**: Template pattern for loading prompts from JSON
- **Vote collection**: `requestInput({ type: "choice" })` → vote tabulation → points
- **Timeout handling**: Non-responsive players handled gracefully
- **Scoreboard display**: `sharedData.scores` → overlay binding pattern
