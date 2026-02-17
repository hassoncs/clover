# Who Am I? — Build Plan
> Game Type: Heads Up
> Directory: r2/games/party/headsUp/
> Priority: 8
> Status: Not Started

## Current State Audit
- Existing files: `manifest.json`, `definition.json`, `metadata.json`, `prefabs/placeholder.json`.
- Working now: only placeholder prefab in definition; no party configuration in manifest; no scripts directory.
- Missing now: full game architecture (party config, server script, entities, prefabs, host/device scripts, assets, sounds).
- Server brand-awareness: not applicable yet (server script absent).

## Entity Definitions
1. `bg-town-square` — biblical town backdrop; all phases.
2. `phase-banner` — status (`deck_select`, `round_active`, `round_summary`, `game_summary`).
3. `active-player-card` — whose turn to guess; all active rounds.
4. `category-card` — selected deck/category name.
5. `word-card-host` — current hidden word shown to clue-givers (not guesser view).
6. `timer-display` — countdown ring and seconds.
7. `correct-counter` / `pass-counter` — round counters.
8. `device-controls` — Correct / Pass large buttons for scorekeeper device.
9. `word-history-list` — per-round results list (guessed/passed/timed out).
10. `scoreboard-panel` — cumulative team or player score.

## Prefab Definitions
- `word-card`: large legible text card with category chip.
- `control-button-correct`: green accent button for success action.
- `control-button-pass`: burgundy accent button for skip action.
- `timer-ring`: radial timer UI prefab.
- `history-row`: one attempted word row with outcome icon.
- `score-row`: leaderboard/team score row.

## Script Requirements
- `phase-router.js`: state-driven layout switching.
- `deck-select-device.js`: choose category/deck before starting round.
- `round-controller-host.js`: updates active word, timer, and counters.
- `scorekeeper-device.js`: handles Correct/Pass inputs with debounce.
- `word-history-bind.js`: appends each resolved word outcome.
- `scoreboard-bind.js`: updates totals and highlights next guesser rotation.

### Detailed Server Script Specification (must implement new `scripts/server.js`)
- **Phase flow**:
  1. `lobby` -> ready check.
  2. `deck_select` -> choose a `headsup` deck.
  3. `round_active` -> timed guessing loop (default 60s).
  4. `round_summary` -> show attempted words and score delta.
  5. Repeat for each guesser; then `game_summary` and `ended`.
- **Content loading**:
  - `pool = Array.isArray(config?.contentPack) ? config.contentPack : []` where pool items are `{ id, name, words[] }`.
  - If empty, inject fallback decks (Prophets/Disciples/Women).
- **Input collection**:
  - Ready: `buzzer` timeLimit 8.
  - Deck select: `choice` from deck names (host or designated leader).
  - Round actions: `requestInputFromSubset('round-actions', { type:'choice', options:['correct','pass'] }, scorekeeperIds)` polled in loop until timer ends.
- **Round mechanics**:
  - Active guesser rotates each round.
  - Words shuffled per deck; each action resolves current word and advances next.
  - `correct` increments round and total score by 1.
  - `pass` increments pass count, word marked skipped.
  - Timeout marks unresolved current word as `timed_out`.
- **Scoring logic**:
  - Base score = total correct across rounds.
  - Optional bonus: streak of 3 correct in round grants +1 (config flag).
- **Timer durations**:
  - Deck select `20s`, round `60s`, round summary `6000ms`, game summary `10000ms`.
- **Shared data fields**: see schema section; update every word transition.
- **End condition**: after each player has one guesser turn (or `roundCount` override), emit final scoreboard and `setPhase('ended')`.

## Art Assets Needed
- `amen_bg_who_am_i.png` (1920x1080): ancient town square backdrop.
- `amen_word_card_large.png` (1200x700): high-contrast word card.
- `amen_category_chip.png` (420x110): deck label chip.
- `amen_timer_ring.png` (320x320): radial timer.
- `amen_btn_correct.png` (420x180) and `amen_btn_pass.png` (420x180): large mobile buttons.
- `amen_history_row.png` (980x84): summary row background.
- Prompt suggestion: "biblical marketplace setting, warm sandstone, parchment signage, gold filigree UI, high readability typography for party distance viewing".

## Sound Effects Needed
- `sfx_round_start_call` (1.0s) — round start stinger.
- `sfx_correct_quick` (0.5s) — correct action.
- `sfx_pass_swish` (0.4s) — pass action.
- `sfx_timer_low` (loop under 10s) — urgency cue.
- `sfx_round_end_bell` (1.1s) — round completion.
- `sfx_game_winner_fanfare` (2.0s) — final summary.

## Interaction Flow (step by step)
1. Players join and select deck/category.
2. One player is designated guesser; others can see and clue current word.
3. Scorekeeper taps Correct or Pass on device while timer runs.
4. Host updates word card immediately after each action and logs history.
5. At timer end, host shows round summary; rotate guesser and repeat.
6. Final game summary shows cumulative correct totals and winner/team result.

## Shared Data Schema
- `phase: string` — `error | deck_select | round_active | round_summary | game_summary`.
- `round: number` / `totalRounds: number` — progression.
- `activeGuesserId: string` / `activeGuesserName: string`.
- `selectedDeckId: string` / `selectedDeckName: string`.
- `currentWord: string` — active word being guessed.
- `timerRemaining: number` — seconds left in active round.
- `roundCorrect: number` / `roundPasses: number`.
- `history: Array<{ word: string; outcome: 'correct'|'pass'|'timed_out'; actorId?: string; timestamp: number }>`.
- `scores: Record<string, number>` — cumulative score per player/team.
- `scoreboard: Array<{ id, name, score }>` — sorted final board.
- `winner: { id, name, score }` — top score entry.
- `errorMessage: string` — optional error payload.

## Dependencies
- Content pack: `headsup` (amen maps to `api/src/party/content/packs/amen/amen-headsup.json`).
- Requires choice input for deck selection and round actions.
- Optional future dependency: tilt gestures for pass/correct (not required for first build).
- Requires adding `party` block to manifest and modules entry in definition during implementation.
- No physics or drawing dependency.
