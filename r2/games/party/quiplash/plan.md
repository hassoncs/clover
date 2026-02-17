# The Fellowship Table — Build Plan
> Game Type: Quiplash
> Directory: r2/games/party/quiplash/
> Priority: 2
> Status: Not Started

## Current State Audit
- Existing files: `manifest.json`, `definition.json`, `metadata.json`, empty `entities/`, empty `prefabs/`, empty `scripts/`.
- Working now: metadata only; no runnable server module in `definition.json` and no standalone `server.js`.
- Missing now: full server flow, all client/host scripts, complete entity/prefab graph, art/audio assets.
- Server brand-awareness: **not implemented** (no server script exists).

## Entity Definitions
1. `bg-fellowship-hall` — full-screen scene backdrop; visible all phases.
2. `phase-banner` — top phase label (`Prompt`, `Vote`, `Results`, `Scores`); binds `phase`, `roundNumber`.
3. `prompt-scroll` — current quip prompt card; visible `answering|reveal|voting`.
4. `authoring-input-hint` — device helper text and timer; visible `answering`.
5. `vs-left` / `vs-right` — head-to-head answer cards; visible `voting|round_results`; bind `voteOptionsJson`.
6. `vote-meter-left/right` — vote bars and percent labels; visible `round_results`; bind `resultsJson`.
7. `quiplash-badge` — unanimous-vote special callout; visible when one answer receives all valid votes.
8. `scoreboard-panel` — sorted cumulative scores; visible `scores|winner`.
9. `winner-crown` — winner treatment; visible `winner`; binds top entry of scoreboard.

## Prefab Definitions
- `prompt-card`: manuscript card with title and wrapped prompt body.
- `response-card`: dual state card for VS answers (neutral/revealed winner).
- `vote-pill`: compact pill showing votes and percent.
- `score-row`: reusable scoreboard row with rank, player name, score.
- `badge-quiplash`: animated ornament for unanimous victory.

## Script Requirements
- `host-phase-router.js`: controls visibility by `phase`.
- `prompt-bind.js`: binds prompt text and category labels.
- `authoring-device.js`: handles text entry, character limit, submit lock, timeout fallback.
- `vs-bind.js`: parses `voteOptionsJson`, places left/right cards, randomizes side per matchup.
- `vote-device.js`: renders two choices, enforces non-self vote.
- `results-bind.js`: parses `resultsJson`, animates vote bars and score deltas.
- `scoreboard-bind.js`: parses `scoreboardJson`, sorts and animates rank changes.
- `winner-bind.js`: winner reveal and celebration animation.

### Detailed Server Script Specification (must implement new `scripts/server.js`)
- **Module contract**: `exports.run = async (room, config) => { ... }`.
- **Content loading**: `var pool = Array.isArray(config?.contentPack) ? config.contentPack : [];`.
- **Ready gate**: `requestInput('ready-check', { type:'buzzer', timeLimit:8 })`; require min 3 players.
- **Round structure**: `roundCount` default 2, plus one finale round.
- **Prompt assignment**:
  - Select `playerCount` prompts per round from pool using anti-repeat set.
  - Pair players in ring (player i vs i+1) so each player answers two prompts.
- **Answer collection phase** (`answering`, 45s):
  - `requestInput('answer-r{n}', { type:'text', assignments: promptAssignments })`.
  - Accept JSON map `promptId -> answer`; substitute `(no answer)` for missing.
- **Per-prompt sequence**:
  - `reveal` (3s): show prompt and both answers.
  - `voting` (20s): non-authors vote via `choice` options `[a1,a2]`.
  - `round_results` (5s): calculate vote counts, percentages, points.
- **Scoring logic**:
  - Base: `points = round(voteShare * 1000)` per matchup.
  - Quiplash bonus: +500 if answer gets all eligible votes.
  - Finale round: every player answers one final prompt; all vote; `+200` per vote.
- **Timers**:
  - answering `45s`, voting `20s`, reveal `3000ms`, round_results `5000ms`, scores `5000ms`, winner `10000ms`.
- **Shared data updates per phase**: see schema section; never omit `phase`.
- **End condition**: emit `winner` payload and `setPhase('ended')`.

## Art Assets Needed
- `amen_bg_fellowship_table.png` (1920x1080): long table, candlelight, warm stone interior; game-specific.
- `amen_prompt_scroll.png` (1024x540): reusable prompt card; shared across text-entry games.
- `amen_vs_card_left/right.png` (860x420): two symmetric duel cards; shared quip-family asset.
- `amen_vote_meter_fill.png` (640x48): progress bar texture; shared.
- `amen_quiplash_badge.png` (512x256): celebratory emblem; game-specific.
- `amen_winner_crown_fx.png` (512x512): winner overlay; shared.
- Prompt suggestion: "warm candlelit fellowship hall, rustic wood table, illuminated manuscript accents, gold and cream UI framing, clean center-safe composition".

## Sound Effects Needed
- `sfx_prompt_reveal_chime` (0.8s) — new prompt.
- `sfx_text_submit_quill` (0.4s) — answer submission.
- `sfx_vs_sting` (1.1s) — VS transition.
- `sfx_vote_tick` (0.25s) — each revealed vote.
- `sfx_quiplash_hit` (1.6s) — unanimous win.
- `sfx_scores_fanfare_soft` (2.0s) — score screen/winner.

## Interaction Flow (step by step)
1. Host shows prompt-writing phase; each player gets assigned prompts on phone and types responses.
2. Host reveals one duel at a time (two answers, hidden authors).
3. Non-authors vote on devices; host shows tally and points.
4. Repeat duels for all prompts in round; show running leaderboard.
5. Finale prompt runs one global vote round, then winner reveal.

## Shared Data Schema
- `phase: string` — `error | answering | reveal | voting | round_results | scores | winner`.
- `roundNumber: number` — active round index (1..roundCount+1 for finale).
- `totalRounds: number` — roundCount + finale.
- `promptText: string` — active prompt.
- `timerRemaining: number` — seconds in current timed input phase.
- `answersJson: string` — reveal payload array `{ id, text }`.
- `voteOptionsJson: string` — voting payload array `{ id, text }`.
- `resultsJson: string` — matchup result array `{ text, authorName, voteCount, points }`.
- `scoreboardJson: string` — sorted cumulative scores.
- `winnerName: string` — final winner display name.

## Dependencies
- Content pack: `quip` (amen maps to `api/src/party/content/packs/amen/amen-quip.json`).
- Requires text input and choice input infrastructure.
- Shared amen UI asset set (cards, bars, badges, typography tokens).
- No drawing/tilt/physics dependencies.
