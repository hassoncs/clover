# Scrolls of Truth — Build Plan
> Game Type: Truth Trap (Fibbage-style)
> Directory: r2/games/party/truth-trap/
> Priority: 3
> Status: Not Started

## Current State Audit
- Existing files: `manifest.json`, `definition.json`, `metadata.json`, `scripts/server.js`.
- Working now: lie-writing, choice voting, truth/house decoy scoring, scoreboard + winner.
- Missing now: all entities/prefabs/client scripts, visual assets, sound assets, richer reveal UX.
- Server brand-awareness: indirect via injected `config.contentPack`; no explicit brand loader call.

## Entity Definitions
1. `bg-scrollroom` — candlelit scriptorium background; visible all phases.
2. `prompt-scroll` — obscured fact prompt with blank; visible `writing_lies|voting|reveal`.
3. `round-badge` — round and multiplier indicator; visible all active phases.
4. `lie-input-panel` — device text input affordance; visible `writing_lies`.
5. `answer-list-container` — stacked answer rows for voting; visible `voting`.
6. `answer-row` — one selectable answer row; binds shuffled answers text.
7. `vote-lock-indicator` — device confirmation after vote submit.
8. `reveal-truth-seal` — highlight marker for real truth row.
9. `fooled-by-list` — row metadata showing who voted for each lie; visible `reveal`.
10. `scoreboard-panel` — standings and delta points; visible `scores|winner`.

## Prefab Definitions
- `scroll-card`: large parchment card for prompt and reveal blocks.
- `answer-row-card`: list row with index marker and optional badges (`truth`, `house`, `player`).
- `multiplier-chip`: compact chip for x1/x1.5/x2 indicators.
- `vote-check`: checkmark token shown on selected row.
- `score-row`: rank row with avatar frame and total points.

## Script Requirements
- `phase-router.js`: map `phase` to visible entity groups.
- `prompt-bind.js`: bind `prompt`, `round`, `multiplier`.
- `lie-input-device.js`: text entry with fallback default when blank.
- `answers-vote-bind.js`: parse `answers`, render selectable list, submit choice.
- `reveal-bind.js`: map votes to rows, annotate truth/house/player answer origins.
- `fooled-counter.js`: counts fooled players per author and animates badge increment.
- `scoreboard-bind.js`: renders `scoreboard` payload after each round and final winner.

## Art Assets Needed
- `amen_bg_scrolls_of_truth.png` (1920x1080): candlelit writing chamber; game-specific.
- `amen_scroll_prompt_panel.png` (1024x560): prompt card; shared fibbage-family asset.
- `amen_answer_row_strip.png` (1000x96): answer row base; shared.
- `amen_truth_seal_gold.png` (192x192): truth badge; game-specific but reusable for reveal markers.
- `amen_house_trap_badge.png` (192x192): decoy icon; game-specific.
- `amen_scoreboard_panel.png` (1100x640): leaderboard frame; shared.
- Prompt suggestion: "ancient scriptorium, parchment scrolls, wax seals, warm candle glow, Byzantine ornament, deep blue and gold accents".

## Sound Effects Needed
- `sfx_scroll_open` (0.7s) — prompt reveal.
- `sfx_quill_write_loop` (loop slices) — writing phase ambience.
- `sfx_vote_select` (0.3s) — vote tap.
- `sfx_truth_reveal` (1.3s) — truth row reveal.
- `sfx_fooled_ping` (0.6s) — each bluff score event.
- `sfx_house_trap_penalty` (0.8s) — decoy penalty.

## Interaction Flow (step by step)
1. Host reveals a fact-with-blank; all players privately write believable lies.
2. Host shows shuffled list containing real truth, all lies, and one house decoy.
3. Players vote for what they think is true.
4. Host reveals each answer's author/type and applies points for truth guesses, successful bluffs, and house penalties.
5. Scoreboard appears; game repeats for configured rounds then winner screen.

## Shared Data Schema
- `phase: string` — `error | writing_lies | voting | reveal | scores | winner`.
- `round: number` — current round (1-indexed).
- `multiplier: number` — scoring multiplier for round.
- `prompt: string` — active fibbage prompt.
- `answers: string[]` — shuffled answer text list for voting.
- `results: object` — `{ truth, answers:[{text,authorId,type}], votes:[...], pointsEarned }`.
- `scores: Record<string, number>` — running player totals.
- `scoreboard: Array<{ id, name, score }>` — sorted for display.
- `winner: { id, name, score }` — final winner object.
- `errorMessage: string` — present only in `error` phase.

## Dependencies
- Content pack: `fibbage` (amen maps to `api/src/party/content/packs/amen/amen-fibbage.json`).
- Requires text input + choice input.
- Shared amen assets for cards, rows, scoreboard.
- No drawing/tilt/physics dependencies.
