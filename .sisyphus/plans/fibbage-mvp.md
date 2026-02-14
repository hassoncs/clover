# Fibbage MVP — Party Game #2

## TL;DR

> **Quick Summary**: Build a Fibbage clone that reuses voting/scoring infrastructure from Quiplash. Players see an obscure true fact with a key detail blanked out, write plausible-sounding fake answers, then everyone votes on which answer is real. Points for fooling others with your lie AND for guessing the truth.
>
> **Deliverables**:
> - `fibbage.ts` — Server-side game template with lie/truth voting mechanics
> - `fibbage/definition.json` — GameDefinition with host and player overlays
> - `generate-fibbage-facts.ts` — AI batch fact generation with verification hints
> - `fibbage-facts.json` — 50-100 curated obscure facts with blanked answers
>
> **Estimated Effort**: Small-Medium (1 week)
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 (content) → Task 2 (template) → Task 3 (game def) → Task 4 (tests)
> **Prerequisites**: Quiplash MVP complete (provides voting, scoring, lobby gate, content pipeline infrastructure)
> **IMPORTANT**: This plan references files that DO NOT EXIST YET — they will be created by the Quiplash MVP plan. Do NOT start this plan until Quiplash is complete. Specifically:
> - `api/src/party/templates/quiplash.ts` — Created by Quiplash Task 2
> - `api/scripts/generate-party-content.ts` — Created by Quiplash Task 1
> - `room.updatePlayerScore()` — Created by Quiplash Task 0
> - Lobby gate infrastructure — Created by Quiplash Task 0
>
> **Fallback references** (existing code to understand patterns before Quiplash lands):
> - `api/src/party/templates/question-answer.ts` — Existing template pattern
> - `api/scripts/generate-assets.ts` — Existing batch CLI script pattern
> - `shared/src/types/party.ts:11-18` — `PartyPlayer.score` field (exists but no updater yet)

---

## Context

### Original Request
Build a Fibbage-style party game as the second Jackbox clone. Reuses shared infrastructure built in the Quiplash plan.

### How Fibbage Works (Reference)
1. **Lobby**: Host creates room, players join (2-8 players)
2. **Question Phase**: All players see an obscure fact with a key detail blanked out (e.g., "In 2003, a _____ was elected mayor of a town in California")
3. **Lie Phase** (30s): Each player writes a plausible-sounding fake answer on their phone
4. **Voting Phase** (20s): All answers (player lies + the truth) are shuffled and displayed. Each player picks which they think is TRUE.
5. **Reveal**: Truth is revealed. Points awarded for:
   - **Guessing the truth**: 1000 points
   - **Fooling others**: 500 points per player who chose YOUR lie
6. **Repeat**: 6-8 questions per game
7. **Winner**: Highest total score

### Key Difference from Quiplash
- Quiplash: "Be the funniest" — subjective voting
- Fibbage: "Fool others / Spot the truth" — deception + knowledge
- Content needs are MUCH harder: requires *verifiable obscure facts* with natural blanks

### What Quiplash Built (Reuse These)
- `room.updatePlayerScore(playerId, delta)` — Per-player scoring
- Lobby gate — Host start + min player validation
- Room code injection — `{{variables.roomCode}}` in overlays
- `requestInput({ type: "choice" })` — Vote collection
- `requestInput({ type: "text" })` — Text answer collection
- Timeout handling — Non-responsive players handled gracefully
- Scoreboard display — `sharedData.scores` → overlay binding

### Research Findings
- Fibbage content is the hardest to generate because facts MUST be verifiable
- AI generation with RAG (Retrieval-Augmented Generation) from Wikipedia/Wikidata reduces hallucination
- Each fact needs: the full true statement, the blanked word/phrase, the correct answer, and alternate accepted spellings
- "Trivia-worthiness" (Tsurel et al., 2017): unusual, unexpected, or unique facts make the best Fibbage questions
- The `joebandenburg/fibbage-questions` GitHub repo shows the exact JSON structure Fibbage uses

---

## Work Objectives

### Core Objective
Ship a playable Fibbage clone where players write fake answers to obscure facts and vote on which is true — reusing Quiplash's scoring and voting infrastructure.

### Concrete Deliverables
- `api/src/party/templates/fibbage.ts` — Server-side game logic
- `api/src/party/content/fibbage-facts.json` — 50-100 obscure facts with blanks
- `api/scripts/generate-fibbage-facts.ts` — AI fact generation script (extends `generate-party-content.ts`)
- `app/examples/fibbage/definition.json` — GameDefinition for host + player
- `app/examples/fibbage/index.ts` — Example registration

### Definition of Done
- [ ] 2+ players can play a complete Fibbage game (6 questions)
- [ ] Each question shows an obscure fact with a blank
- [ ] Players submit fake answers, then vote on all options (lies + truth)
- [ ] Points for guessing truth (1000) and fooling others (500 per fool)
- [ ] Game ships with 50+ AI-generated obscure facts
- [ ] Host screen shows facts, all answers, reveal with truth highlighted
- [ ] Player screen shows answer input, voting choices, personal score
- [ ] `tsc --noEmit` passes in all workspaces

### Must Have
- 6-question game structure (single round, no multiplier)
- Lie submission via `requestInput({ type: "text" })`
- Truth-or-lie voting via `requestInput({ type: "choice" })`
- Dual scoring: truth-guessing + fooling
- 50+ facts in shipped JSON file
- Minimum 2 players enforced
- 30-second lie timer, 20-second vote timer
- Truth reveal phase with correct answer highlighted
- Winner announcement

### Must NOT Have (Guardrails)
- No separate React UI — overlays only
- No external API integration for facts — AI batch only
- No "like" categories from original Fibbage — flat question list
- No "Double Fibbage" bonus rounds
- No content moderation
- No sound effects
- No animations
- No player avatars
- No persistent stats

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Fact content generation pipeline
└── Task 2: Fibbage game template

Wave 2 (After Wave 1):
├── Task 3: GameDefinition + overlays
├── Task 4: Tests + E2E
```

### Dependency Matrix

| Task | Depends On | Blocks | Parallelize With |
|------|------------|--------|-----------------|
| 1 | Quiplash MVP | 2 | — |
| 2 | 1 | 3, 4 | — |
| 3 | 2 | 4 | — |
| 4 | 3 | None | — |

---

## TODOs

---

- [ ] 1. Fact Content Generation — AI Batch with Verification

  **What to do**:
  - Extend `api/scripts/generate-party-content.ts` to support `--game=fibbage`
  - Or create `api/scripts/generate-fibbage-facts.ts` if cleaner
  - **Generation strategy** (RAG-lite):
    1. Prompt LLM with: "Generate an obscure, surprising, and TRUE fact. Include the source. Then identify which word or phrase would be most surprising if blanked out."
    2. Use structured output (Zod schema):
       ```
       { fullFact: string, blankedFact: string, correctAnswer: string,
         alternateSpellings: string[], category: string, source: string }
       ```
    3. Categories: animals, history, geography, science, food, sports, entertainment, language
    4. Quality filters: reject if fact is well-known, reject if blank is too easy
  - **Fact verification**: For MVP, rely on LLM's training data + require `source` field for manual spot-checking. No automated verification API.
  - Output to `api/src/party/content/fibbage-facts.json`
  - Each fact: `{ "id": "f001", "blankedFact": "In 2003, a _____ was elected mayor of Talkeetna, Alaska", "correctAnswer": "cat", "alternateSpellings": ["a cat", "Cat"], "category": "animals", "source": "Wikipedia" }`

  **Must NOT do**:
  - No Wikipedia API integration — use LLM knowledge only
  - No automated fact verification — manual review for MVP
  - No Wikidata SPARQL queries

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`ai-game-generation`]

  **Acceptance Criteria**:
  - [ ] Generation script produces 50+ facts with structured output
  - [ ] Each fact has `blankedFact`, `correctAnswer`, `alternateSpellings`, `category`, `source`
  - [ ] Facts span at least 5 categories
  - [ ] Blanked word/phrase is genuinely surprising (not obvious)
  - [ ] `tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(party): add fibbage fact generation pipeline and initial fact pool`

---

- [ ] 2. Fibbage Game Template

  **What to do**:
  - Create `api/src/party/templates/fibbage.ts` with game flow:

  **Game Flow**:
  ```
  lobby (reuse Quiplash lobby gate, minPlayers: 2)
    → For each of 6 questions:
      → Show Phase: Display blanked fact to all players
      → Lie Phase (30s): Each player submits a fake answer via requestInput({ type: "text" })
        - Filter: reject answers matching truth (case-insensitive, with alternate spellings)
        - If player submits truth accidentally, prompt for different answer (or accept and mark)
      → Vote Phase (20s): Shuffle all lies + truth, display as choices
        - Each player votes via requestInput({ type: "choice", options: shuffledAnswers })
        - Players CANNOT vote for their own lie
      → Reveal Phase (5s):
        - Highlight the correct answer
        - Show who wrote each lie and who voted for what
        - Award points:
          * 1000 points for guessing the truth
          * 500 points per player fooled by YOUR lie
      → Update scoreboard
    → Final Scores + Winner
  ```

  **Lie Filtering**:
  - Compare submitted lie to `correctAnswer` and `alternateSpellings` (case-insensitive, trimmed)
  - If match: either silently accept (mark as "truth duplicate") or re-prompt player
  - Recommended for MVP: silently accept but don't display as a separate option

  **Vote Display**:
  - Shuffle truth + all player lies into random order
  - Each option labeled "A", "B", "C", etc.
  - Player's own lie is shown but NOT selectable by that player

  **Must NOT do**:
  - No "Double Fibbage" or bonus rounds
  - No categories/filtering by question type
  - No audience voting
  - No "like" system

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: [`game-authoring`, `game-authoring/scripting-api-reference`]

  **References**:
  - `api/src/party/templates/quiplash.ts` — Voting/scoring pattern to follow
  - `api/src/party/PartyRoomDO.ts` — `requestInput()`, `updatePlayerScore()`, `updateSharedData()`

  **Acceptance Criteria**:
  - [ ] Template exists at `api/src/party/templates/fibbage.ts`
  - [ ] Template loads facts from JSON
  - [ ] Players submit lies, truth is mixed in, players vote
  - [ ] Players cannot vote for their own lie
  - [ ] 1000 points for guessing truth, 500 per player fooled
  - [ ] Truth highlighted during reveal
  - [ ] 6 questions per game
  - [ ] Handles 2-8 players
  - [ ] `tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(party): add fibbage game template with lie/truth mechanics`

---

- [ ] 3. GameDefinition + Overlays

  **What to do**:
  - Create `app/examples/fibbage/definition.json`:
    - Variables: `phase`, `blankedFact`, `answersJson`, `correctAnswer`, `revealJson`, `scoreboardJson`, `winnerName`, `timerRemaining`, `questionIndex`, `totalQuestions`
    - Host overlays: room code, fact display (large centered text with "______"), answer options (A/B/C/D), reveal with truth highlighted (gold color), scoreboard, winner
    - Player overlays: lobby status, lie input hint, voting hint, personal score
    - Shared: timer bar, question counter

  - Create `app/examples/fibbage/index.ts` with metadata

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`game-authoring`, `game-authoring/game-definition-reference`]

  **Acceptance Criteria**:
  - [ ] Valid GameDefinition at `app/examples/fibbage/`
  - [ ] Host shows: fact with blank, all answer options, truth reveal, scores
  - [ ] Player shows: lobby, input hints, score
  - [ ] Phase-based visibility works correctly

  **Commit**: YES
  - Message: `feat: add fibbage game definition with host and player overlays`

---

- [ ] 4. Tests + E2E

  **What to do**:
  - Unit tests for template logic (fact loading, lie filtering, scoring)
  - Playwright E2E: 1 host + 2 players, full game flow
  - Verify `tsc --noEmit` across all workspaces

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`playwright`, `testing-patterns`]

  **Acceptance Criteria**:
  - [ ] `cd api && npx vitest run src/party/templates/__tests__/fibbage` → all pass
  - [ ] E2E passes with 2 simulated players
  - [ ] Scoring correct: truth-guessing + fooling
  - [ ] `tsc --noEmit` passes in shared/, api/, app/

  **Commit**: YES
  - Message: `test: add fibbage tests and e2e`

---

## Success Criteria

### Verification Commands
```bash
cd api && npx tsc --noEmit
cd app && npx tsc --noEmit
cd api && npx vitest run src/party/templates/__tests__/fibbage
npx playwright test tests/e2e/fibbage/
```

### Final Checklist
- [ ] 2+ players can play a complete 6-question Fibbage game
- [ ] Lie submission, truth mixing, and voting work correctly
- [ ] Scoring awards points for truth-guessing and fooling
- [ ] 50+ facts ship with the game
- [ ] Reuses Quiplash's scoring, lobby gate, and room code infrastructure
- [ ] No duplicated infrastructure — imports from shared party modules
