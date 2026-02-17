# The Great Hall of Wisdom — Build Plan
> Game Type: Quickfire Q&A
> Directory: r2/games/party/quickfire-qa/
> Priority: 1
> Status: Not Started

## Current State Audit
- Existing files: `manifest.json`, `definition.json`, `metadata.json`, `scripts/server.js`.
- Working now: round loop, multiple choice input, speed/streak scoring, reveal payloads, ended state.
- Missing now: `entities/`, `prefabs/`, host/client scripts, image assets, sound assets, phase-specific UI composition.
- Server brand-awareness: **indirect only**. `server.js` uses `config.contentPack`; no explicit brand lookup in script.
- Infrastructure note: party template loader currently injects content from `definition.party.contentPacks`; implementation should keep script compatible with injected `config.contentPack`.

## Entity Definitions
1. `bg-sanctuary` — static themed background; components: sprite/image; full-screen 1920x1080; visible all phases; binds `qaPhase`.
2. `title-ribbon` — phase title and round label; components: text; top-center; visible `question|answering|reveal|scores`; binds `questionIndex`, `totalQuestions`.
3. `question-card` — prompt container; components: nine-slice panel + text; center top; visible `question|answering|reveal`; binds `prompt`.
4. `timer-hourglass` — countdown visualization; components: sprite + progress bar text; top-right; visible `question|answering`; binds `timerRemaining`.
5. `option-slot-a/b/c/d` — answer choices; components: button panel + text + input collider; 4 vertical rows on host and mirrored on device; visible `question|answering`; binds parsed `optionsJson` index 0-3.
6. `lock-indicator` — confirms a player submitted; components: icon + text; device-only bottom; visible after local submit; binds local input state.
7. `reveal-highlight` — correct answer glow; components: animated overlay; aligns to winning option row; visible `reveal`; binds `correctAnswer`.
8. `results-list` — per-player answer, correctness, points; components: repeating text rows; lower half host; visible `reveal`; binds parsed `resultsJson`.
9. `scoreboard-panel` — standings card; components: panel + repeating text; center; visible `scores`; binds room score state + results totals.

## Prefab Definitions
- `panel-parchment`: card archetype; rounded cream panel, gold border, drop shadow; spawn once for question card and scoreboard wrappers.
- `answer-button`: choice archetype; default size 880x120 host / responsive mobile; states idle/hover/selected/disabled/correct/incorrect; spawn 4 per question.
- `timer-widget`: hourglass + numeric readout; default countdown color ramp (gold -> burgundy under 5s); spawn 1 each round.
- `result-row`: player result row with name/answer/points columns; spawn N where N = responding players during reveal.
- `round-chip`: small top badge for `Q x/y`; spawn once per question.

## Script Requirements
- `host-phase-router.js`: single source of truth for visibility toggles per `qaPhase`.
- `question-display.js`: parses `optionsJson`, hydrates four option entities, handles long-text wrapping.
- `answer-submit-device.js`: sends `choice` index once, prevents double-submit, emits local lock indicator.
- `timer-sync.js`: interpolates server timer updates and low-time visual pulse.
- `reveal-anim.js`: maps `correctAnswer` to option slot and runs glow + scale pulse animation.
- `results-bind.js`: parses `resultsJson`, sorts by points descending, fills `result-row` instances.
- `scoreboard-bind.js`: composes final scores, handles tie ribbon when needed.
- Existing `scripts/server.js`: keep phase contract, but implementation pass should also set explicit `phase` key for consistency with other party games.

## Art Assets Needed
- `amen_bg_hall_of_wisdom.png` (1920x1080): stained-glass library hall; shared style family, game-specific composition.
- `amen_panel_parchment_lg.png` (1024x512): parchment panel with illuminated border; shared across amen party games.
- `amen_answer_button_idle/selected/correct/wrong.png` (880x120 each): answer button state set; shared system asset.
- `amen_hourglass_ui.png` (256x256): timer icon with transparent background; shared system asset.
- `amen_correct_glow_fx.png` (900x140): additive reveal overlay; shared effect asset.
- `amen_score_badge_gold.png` (128x128): score icon; shared asset.
- Prompt suggestion: "warm stained-glass church library, illuminated manuscript ornament, gold leaf trim, cream parchment, cinematic soft light, clean UI-safe composition".

## Sound Effects Needed
- `sfx_round_start_chime` (0.9s) — play on question phase entry; shared.
- `sfx_timer_tick_soft` (loop, 0.5s slices) — during answering; shared.
- `sfx_timer_urgent` (1.0s stinger) — last 3 seconds; shared.
- `sfx_answer_lock` (0.35s) — on device submit; shared.
- `sfx_reveal_correct` (1.2s) — on correct option highlight; shared.
- `sfx_score_countup` (2.0s) — scoreboard tally; shared.

## Interaction Flow (step by step)
1. Host shows question card, four choices, timer; each player phone shows the same options as tappable buttons.
2. Players tap one option; device confirms lock and disables further input.
3. When timer expires or all submitted, host enters reveal, highlights correct option, and displays each player's answer + points.
4. Speed and streak bonuses are shown inline per player row.
5. Host transitions to score panel, then auto-advances to next question until roundCount complete.

## Shared Data Schema
- `qaPhase: string` — `question | reveal | scores`.
- `questionIndex: number` — zero-based active question index.
- `totalQuestions: number` — total question count loaded this run.
- `prompt: string` — current question text.
- `optionsJson: string` — JSON string array of 4 options.
- `timerRemaining: number` — seconds remaining in active input phase.
- `correctAnswer: string` — reveal phase only.
- `resultsJson: string` — JSON array `{ playerId, answer, isCorrect, points, speedBonus, streakBonus }`.

## Dependencies
- Content pack: `trivia` (amen maps to `api/src/party/content/packs/amen/amen-trivia.json`).
- Shared amen assets: parchment card, answer button states, timer widget, score badge.
- Input dependency: `choice` input on player devices.
- No physics dependency; all entities should use UI/static transforms.
