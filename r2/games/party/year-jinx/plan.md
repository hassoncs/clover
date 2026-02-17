# Solomon's Bet — Build Plan
> Game Type: Year Jinx (re-themed as Solomon's Bet)
> Directory: r2/games/party/year-jinx/
> Priority: 2
> Status: Not Started

## Current State Audit
- Existing files: `manifest.json`, `definition.json`, `metadata.json`, `scripts/server.js`.
- Working now: host-driven round loop, numeric guess submit, reveal payload, score panel.
- Missing now: explicit betting phase, number-line wager UI, bet tokens, payout feedback, judgment-hall themed art/audio.
- Server brand-awareness: currently indirect via `config.contentPack`; implementation should keep this contract and map Amen to wager data.

## Core Game Identity
- **Fantasy:** Solomon's judgment hall where wisdom is tested and rewarded.
- **Loop:** question -> private numeric guesses -> reveal sorted number line -> betting window -> answer reveal + payout -> standings.
- **Why it pops:** even bad guessers can win by reading the room and betting smart.

## Entity Definitions
1. `bg-judgment-hall` — grand hall backdrop with torchlight and gold accents; visible all phases.
2. `round-banner` — round counter + phase title (`Guess`, `Bet`, `Reveal`); top-center.
3. `wager-question-card` — numeric prompt card with category + unit; visible `round_start|guessing|betting`.
4. `guess-input-device` — per-device numeric keypad/field submit UI; device-only `guessing`.
5. `guess-line-track` — horizontal number line container; visible `betting|reveal`.
6. `guess-marker` — one marker per player's submitted value, sorted low->high; visible `betting|reveal`.
7. `bet-token-rack` — selectable token chips for wager placement (1x, 2x, 3x zones); device + host mirror during `betting`.
8. `bet-highlight` — visual ring/flare on guessed marker receiving a bet; visible `betting`.
9. `answer-seal` — correct answer reveal medallion that snaps onto winning marker; visible `reveal`.
10. `payout-panel` — per-player payout summary (guess, bets, winnings, net delta); visible `reveal|scores`.
11. `treasury-scoreboard` — cumulative token balances + leader crown; visible `scores|winner`.

## Prefab Definitions
- `hall-panel`: ornamental panel (ivory parchment, carved gold trim) used by question and payout cards.
- `line-segment`: reusable number-line segment with major/minor ticks and dynamic numeric labels.
- `player-marker`: color-coded guess pin prefab with player initials and value badge.
- `bet-chip`: coin-style wager chip variants (`bronze`, `silver`, `gold`) with value multipliers.
- `payout-row`: repeating row showing player name, chosen bet target, payout multiplier, and token delta.

## Script Requirements
- `phase-router.js`: authoritative visibility and interaction map for `round_start|guessing|betting|reveal|scores|winner`.
- `guess-input-device.js`: validates numeric input (int only), submits once, confirms lock state.
- `line-layout.js`: sorts guesses, computes number-line positions, prevents marker overlap by offset stacking.
- `betting-controller.js`: enables token placement windows, handles own-guess and cross-player bets, enforces token budget.
- `reveal-resolution.js`: compares guesses against true answer, selects closest marker, resolves ties, computes payouts.
- `payout-bind.js`: formats reveal data into per-player wager outcomes and celebratory/notable moments.
- `scoreboard-bind.js`: updates treasury totals, handles tie-break display, transitions to next round or winner.
- `scripts/server.js` update scope: add explicit betting phase contract and payout payload while preserving party loader compatibility.

## Art Assets Needed
- `amen_bg_judgment_hall.png` (1920x1080): throne-room style hall, warm torchlight, clear central play space.
- `amen_question_scroll.png` (1100x560): engraved scroll panel for numeric prompts.
- `amen_number_line_gold.png` (1500x180): stylized number-line track with notch markers.
- `amen_guess_marker_set.png` (96x96 each, 8 variants): player marker pins with center emblem.
- `amen_bet_chip_set.png` (96x96 each, 3 values): bronze/silver/gold betting tokens.
- `amen_answer_seal_glow.png` (220x220): reveal burst for winning marker.
- Prompt suggestion: "ancient Israelite royal judgment chamber, polished stone, gold inlay, torchlit atmosphere, ceremonial game table, elegant readable UI zones".

## Sound Effects Needed
- `sfx_hall_fanfare` (1.1s) — round start announcement.
- `sfx_guess_lock` (0.35s) — player guess submit confirmation.
- `sfx_chip_place` (0.28s) — each wager token placement.
- `sfx_betting_countdown` (loop, soft pulse) — final seconds of betting.
- `sfx_reveal_gong` (1.0s) — answer reveal transition.
- `sfx_payout_chime` (1.2s) — winning bet payout.
- `sfx_treasury_tally` (1.4s) — end-of-round token update.

## Interaction Flow (step by step)
1. Host shows a numeric Bible question; all players privately submit one number.
2. Submitted guesses reveal together and auto-sort across the number line.
3. Betting opens; players place tokens on the guess they think is closest to truth (own or others').
4. Correct answer appears; closest guess wins, ties resolved by nearest-lowest-house rule or shared payout rule (to finalize in server spec).
5. Bets settle, payouts animate, treasury updates, next round begins.

## Shared Data Schema
- `phase: string` — `lobby | round_start | guessing | betting | reveal | scores | winner`.
- `round: number` — one-based round index.
- `questionId: string` — current wager prompt id.
- `question: string` — current question text.
- `unit: string | null` — display unit (chapters, years, verses, etc.).
- `category: string` — source category for themed ribbons.
- `guessWindowSeconds: number` — remaining guess phase time.
- `betWindowSeconds: number` — remaining betting phase time.
- `guesses: Array<{ playerId, playerName, value, submittedAt }>` — raw submitted guesses.
- `sortedGuesses: Array<{ playerId, value, rank }>` — number-line order for UI binding.
- `bets: Array<{ playerId, targetPlayerId, tokenValue, multiplierSlot }>` — player wager selections.
- `result: { answer, winningPlayerId, winningGuess, distanceMap, payoutMap }` — reveal payload.
- `scoreboard: Array<{ id, name, tokens, roundDelta }>` — token standings.
- `winner: { id, name, tokens } | null` — final round winner payload.

## Dependencies
- Content pack target: `amen-wager` (new numeric wager dataset) while preserving legacy `amen-history` compatibility during transition.
- Input dependency: numeric input + token wager actions on player devices.
- UI dependency: number-line renderer and repeating marker entities.
- No physics dependency; static/UI transforms only.
