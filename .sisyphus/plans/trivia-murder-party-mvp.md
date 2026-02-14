# Trivia Murder Party MVP — Party Game #3

## TL;DR

> **Quick Summary**: Build a Trivia Murder Party clone — a trivia game with an elimination twist. Players answer multiple-choice trivia questions; those who get it wrong enter the "Killing Floor" where they must survive a mini-challenge to stay in the game. Last player standing wins. Reuses voting/scoring infrastructure from Quiplash and content patterns from Fibbage.
>
> **Deliverables**:
> - `trivia-murder-party.ts` — Server-side game template with trivia + elimination mechanics
> - `trivia-murder-party/definition.json` — GameDefinition with host and player overlays
> - `trivia-questions.json` — 100+ AI-generated trivia questions with verified answers
> - ONE "Killing Floor" mini-game (simplest possible: e.g., "type the word backwards" or "buzzer race")
>
> **Estimated Effort**: Medium (1-2 weeks)
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 (content) → Task 2 (template) → Task 3 (game def) → Task 5 (E2E)
> **Prerequisites**: Quiplash MVP complete (scoring, lobby gate). Fibbage MVP helpful but not required.

---

## Context

### Original Request
Build a Trivia Murder Party clone as the third and most complex Jackbox-style party game. This is the hardest of the three because it combines trivia with elimination mechanics and mini-games.

### How Trivia Murder Party Works (Reference)
1. **Lobby**: Host creates room, players join (3-8 players). Murder mystery theme.
2. **Trivia Round**: Multiple-choice trivia question shown to all players
3. **Answer Phase** (15s): Each player selects an answer on their phone
4. **Results**: Correct answers → safe. Wrong answers → go to the "Killing Floor"
5. **Killing Floor**: Players who got it wrong must complete a mini-challenge to survive:
   - Original game has various mini-games: word unscramble, math, dictation, etc.
   - For MVP: ONE simple mini-game (e.g., "Type this word backwards within 10 seconds")
6. **Elimination**: Fail the Killing Floor → eliminated from the game
7. **Repeat**: Continue until 1 player remains OR all trivia questions exhausted
8. **Final Round** (if multiple survive): Head-to-head sudden death trivia
9. **Winner**: Last player standing

### What Quiplash/Fibbage Built (Reuse These)
- `room.updatePlayerScore(playerId, delta)` — Per-player scoring
- Lobby gate — Host start + min player validation
- Room code injection — `{{variables.roomCode}}` in overlays
- `requestInput({ type: "choice" })` — Multiple-choice answer collection
- `requestInput({ type: "text" })` — Text answer collection (for Killing Floor)
- Timeout handling — Non-responsive players handled gracefully
- Scoreboard display — `sharedData.scores` → overlay binding
- Content loading pattern — JSON file → template

### Key Differences from Quiplash/Fibbage
- **Elimination mechanic** — Players can be knocked out (new concept)
- **Correct/wrong binary** — Not subjective voting, but factual right/wrong
- **Mini-game within a game** — Killing Floor is a nested game mode
- **Multiple-choice trivia** — Different from fill-in-the-blank (Fibbage) or free text (Quiplash)
- **Variable player count during game** — Players get eliminated, changing the active roster

### Research Findings
- Trivia content is the most reliable to AI-generate because facts are verifiable
- Multiple-choice with 4 options is standard: 1 correct, 3 plausible distractors
- Open Trivia DB has 4,000+ verified questions (can use for future API integration)
- AI generation with structured output (question, correct_answer, incorrect_answers[3]) works well
- Difficulty calibration: easy (common knowledge), medium (specialized), hard (obscure)
- The `requestInput({ type: "choice", options: [...] })` pattern works perfectly for multiple-choice

---

## Work Objectives

### Core Objective
Ship a playable Trivia Murder Party clone with AI-generated trivia questions, elimination mechanics, and ONE Killing Floor mini-game.

### Concrete Deliverables
- `api/src/party/templates/trivia-murder-party.ts` — Full game template
- `api/src/party/content/trivia-questions.json` — 100+ trivia questions
- `api/scripts/generate-trivia-questions.ts` — AI trivia generation script
- `app/examples/trivia_murder_party/definition.json` — GameDefinition
- `app/examples/trivia_murder_party/index.ts` — Example registration

### Definition of Done
- [ ] 3+ players can play a complete Trivia Murder Party game
- [ ] Multiple-choice trivia questions with 4 options
- [ ] Wrong answers → Killing Floor mini-game
- [ ] Fail Killing Floor → eliminated
- [ ] Last player standing wins
- [ ] 100+ trivia questions ship with the game
- [ ] Host screen shows questions, results, eliminations, winner
- [ ] Player screen shows answer choices, Killing Floor challenge, elimination status
- [ ] `tsc --noEmit` passes in all workspaces

### Must Have
- 10-15 trivia questions per game (configurable)
- 4-option multiple choice via `requestInput({ type: "choice" })`
- Elimination tracking (alive/dead status per player)
- ONE Killing Floor mini-game: "Type this word backwards" (text input, 10s timer)
- Minimum 3 players
- 15-second answer timer for trivia
- Results phase showing who was right/wrong
- Winner = last player standing OR highest score if multiple survive
- "Ghost" mode: eliminated players can still answer (no stakes) to stay engaged

### Must NOT Have (Guardrails)
- No multiple Killing Floor mini-games — ONE only for MVP
- No narrative/story wrapper (murder mystery theming is overlay text only)
- No "Final Round" sudden death — simplify to last standing or highest score
- No external trivia API integration — AI batch only
- No difficulty progression — random difficulty
- No category selection by players
- No sound effects, music, or jump scares
- No animations beyond overlay visibility
- No player avatars or murder-mystery characters
- No "comeback" mechanic for eliminated players (ghosts don't score)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Trivia content generation pipeline
├── Task 2: Killing Floor mini-game design
└── (parallel)

Wave 2 (After Wave 1):
├── Task 3: Trivia Murder Party game template
├── Task 4: GameDefinition + overlays
└── Task 5: Tests + E2E
```

### Dependency Matrix

| Task | Depends On | Blocks | Parallelize With |
|------|------------|--------|-----------------|
| 1 | Quiplash MVP | 3 | 2 |
| 2 | None | 3 | 1 |
| 3 | 1, 2 | 4, 5 | — |
| 4 | 3 | 5 | — |
| 5 | 4 | None | — |

---

## TODOs

---

- [ ] 1. Trivia Content Generation — AI Batch with Difficulty Levels

  **What to do**:
  - Extend or create `api/scripts/generate-trivia-questions.ts`
  - **Generation strategy**:
    1. Prompt LLM: "Generate a multiple-choice trivia question with 4 options (1 correct, 3 plausible distractors). Include difficulty level and category."
    2. Structured output (Zod schema):
       ```
       { question: string, correctAnswer: string, incorrectAnswers: [string, string, string],
         difficulty: "easy" | "medium" | "hard", category: string, explanation: string }
       ```
    3. Categories: science, history, geography, entertainment, sports, food, animals, technology, language, art
    4. Difficulty distribution: 40% easy, 40% medium, 20% hard
    5. Quality filters: reject if question is ambiguous, reject if distractors are obviously wrong
  - **Distractor quality**: Generate distractors one at a time, passing previous ones as context to ensure variety and plausibility
  - Output to `api/src/party/content/trivia-questions.json`
  - Each question: `{ "id": "t001", "question": "What is the largest planet?", "correctAnswer": "Jupiter", "incorrectAnswers": ["Saturn", "Neptune", "Uranus"], "difficulty": "easy", "category": "science", "explanation": "Jupiter has a mass of..." }`

  **Must NOT do**:
  - No Open Trivia DB integration — AI only for MVP
  - No real-time generation
  - No Wikidata verification

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`ai-game-generation`]

  **Acceptance Criteria**:
  - [ ] Generation script produces 100+ questions with structured output
  - [ ] Each question has `question`, `correctAnswer`, `incorrectAnswers[3]`, `difficulty`, `category`
  - [ ] Difficulty distribution roughly 40/40/20
  - [ ] At least 6 categories represented
  - [ ] Distractors are plausible (not obviously wrong)
  - [ ] `tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(party): add trivia question generation pipeline and initial question pool`

---

- [ ] 2. Killing Floor Mini-Game Design

  **What to do**:
  - Design ONE simple mini-game for the Killing Floor phase
  - **Recommended**: "Backwards Word" — player must type a displayed word backwards within 10 seconds
    - Server generates a random 5-8 letter word
    - Sends `requestInput({ type: "text", prompt: "Type ELEPHANT backwards!", timeLimit: 10 })`
    - Validates response: case-insensitive exact match of reversed word
    - Pass → survive. Fail → eliminated.
  - **Alternative options** (for future expansion, NOT for MVP):
    - Math challenge: solve a simple equation
    - Buzzer race: first to press buzzer survives
    - Word unscramble: rearrange letters
  - Implement as a function: `async function runKillingFloor(room, eliminatedPlayers): Promise<string[]>` returning list of survivors
  - Keep in same file as main template or a small utility module

  **Must NOT do**:
  - Only ONE mini-game for MVP
  - No complex game mechanics
  - No drawing or visual mini-games

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`game-authoring/scripting-api-reference`]

  **Acceptance Criteria**:
  - [ ] `runKillingFloor()` function exists and works
  - [ ] Sends text input request with reversed word challenge
  - [ ] Validates answer (case-insensitive)
  - [ ] Returns list of survivors
  - [ ] Handles timeout (no answer = eliminated)

  **Commit**: YES (combined with Task 3)

---

- [ ] 3. Trivia Murder Party Game Template

  **What to do**:
  - Create `api/src/party/templates/trivia-murder-party.ts`:

  **Game Flow**:
  ```
  lobby (reuse lobby gate, minPlayers: 3)
    → For each trivia question (10-15 per game):
      → Question Phase: Show question + 4 options to all ALIVE players
      → Answer Phase (15s): Players select via requestInput({ type: "choice", options })
      → Results Phase (5s): Show correct answer, who was right/wrong
      → Killing Floor (if any wrong):
        → Wrong players enter Killing Floor
        → Run mini-game (backwards word, 10s)
        → Pass → survive, Fail → ELIMINATED
        → Broadcast elimination to all
      → Check: if 1 player remaining → WINNER
      → Check: if 0 players remaining → last eliminated player wins
    → If multiple players survive all questions:
      → Winner = player with most correct answers (tiebreak: fastest average)
  ```

  **Player State Tracking**:
  - `alive: boolean` per player — starts true, set false on elimination
  - `correctCount: number` — for tiebreaking if multiple survive
  - Dead players enter "Ghost" mode: can still answer trivia (no stakes, just for fun)
  - Ghost answers are NOT shown in results and don't affect scoring

  **Scoring** (simpler than Quiplash):
  - No points per se — survival is the goal
  - Track `correctCount` for tiebreaking only
  - Display "ALIVE" or "ELIMINATED" status per player

  **Edge Cases**:
  - All players get a question right → no Killing Floor, move to next question
  - All players get a question wrong → ALL go to Killing Floor
  - All players eliminated in same round → last round's correct players win (or random if all wrong)
  - 2 players left, both wrong → both go to Killing Floor, last survivor wins
  - Player disconnects → treated as eliminated

  **Must NOT do**:
  - No multiple Killing Floor mini-games
  - No Final Round / sudden death
  - No narrative between rounds
  - No difficulty progression

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: [`game-authoring`, `game-authoring/scripting-api-reference`]

  **References**:
  - `api/src/party/templates/quiplash.ts` — Template pattern
  - `api/src/party/PartyRoomDO.ts` — `requestInput()`, `updateSharedData()`

  **Acceptance Criteria**:
  - [ ] Template at `api/src/party/templates/trivia-murder-party.ts`
  - [ ] Loads questions from JSON
  - [ ] Multiple-choice via `requestInput({ type: "choice" })`
  - [ ] Wrong answers → Killing Floor
  - [ ] Killing Floor failure → elimination
  - [ ] Game ends when 1 player remains or questions exhausted
  - [ ] Ghost mode: eliminated players can still answer
  - [ ] Handles 3-8 players
  - [ ] `tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(party): add trivia murder party game template`

---

- [ ] 4. GameDefinition + Overlays

  **What to do**:
  - Create `app/examples/trivia_murder_party/definition.json`:
    - Variables: `phase`, `questionText`, `optionsJson`, `correctAnswer`, `resultsJson`, `alivePlayersJson`, `eliminatedPlayersJson`, `killingFloorChallenge`, `winnerName`, `timerRemaining`, `questionIndex`, `totalQuestions`
    - Background: Dark/spooky solid color (#1a0a2e or similar)

  - **Host (TV) Overlays**:
    - Room code (lobby)
    - Player roster with alive/dead status indicators
    - Trivia question (large centered text)
    - 4 answer options (A/B/C/D, styled as cards)
    - Results: correct answer highlighted green, wrong players highlighted red
    - Killing Floor banner: "THE KILLING FLOOR" + challenge text
    - Elimination announcement: "PLAYER X HAS BEEN ELIMINATED"
    - Winner announcement

  - **Player (Phone) Overlays**:
    - Lobby: "Waiting for host..."
    - Trivia: answer prompt hint
    - Killing Floor: challenge text + input hint
    - Status: "ALIVE" or "ELIMINATED (Ghost Mode)"
    - Ghost mode indicator

  - Create `app/examples/trivia_murder_party/index.ts`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`game-authoring`, `game-authoring/game-definition-reference`]

  **Acceptance Criteria**:
  - [ ] Valid GameDefinition at `app/examples/trivia_murder_party/`
  - [ ] Host shows: question, options, results, eliminations, winner
  - [ ] Player shows: status, hints, ghost mode indicator
  - [ ] Phase-based visibility works

  **Commit**: YES
  - Message: `feat: add trivia murder party game definition with overlays`

---

- [ ] 5. Tests + E2E

  **What to do**:
  - Unit tests: question loading, answer validation, elimination logic, Killing Floor, ghost mode
  - Playwright E2E: 1 host + 3 players, play through until someone is eliminated + game ends
  - Verify `tsc --noEmit`

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`playwright`, `testing-patterns`]

  **Acceptance Criteria**:
  - [ ] `cd api && npx vitest run src/party/templates/__tests__/trivia-murder-party` → all pass
  - [ ] E2E passes with 3 simulated players
  - [ ] At least one player gets eliminated during E2E
  - [ ] `tsc --noEmit` passes

  **Commit**: YES
  - Message: `test: add trivia murder party tests and e2e`

---

## Success Criteria

### Verification Commands
```bash
cd api && npx tsc --noEmit
cd app && npx tsc --noEmit
cd api && npx vitest run src/party/templates/__tests__/trivia-murder-party
npx playwright test tests/e2e/trivia-murder-party/
```

### Final Checklist
- [ ] 3+ players can play a complete game with eliminations
- [ ] Multiple-choice trivia works with correct/wrong tracking
- [ ] Killing Floor mini-game (backwards word) functions
- [ ] Elimination removes players from active game (ghost mode)
- [ ] Winner determined by last standing or most correct
- [ ] 100+ trivia questions ship with the game
- [ ] Reuses Quiplash's lobby gate, room code, and input infrastructure
