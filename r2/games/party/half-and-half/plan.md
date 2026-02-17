# The Mediator — Build Plan
> Game Type: Half and Half
> Directory: r2/games/party/half-and-half/
> Priority: 6
> Status: Not Started

## Current State Audit
- Existing files: `manifest.json`, `definition.json`, `metadata.json`, `scripts/server.js`.
- Working now: rotating drafter, text drafting, A/B voting, split-based scoring, minority bonus, winner output.
- Missing now: drafting/voting host layouts, split meter entities, richer reveal components, art/sfx set.
- Server brand-awareness: indirect via `config.contentPack`; no direct brand loader call.

## Entity Definitions
1. `bg-crossroads` — split-path background; all phases.
2. `drafter-banner` — indicates active drafter name; `drafting|voting|reveal`.
3. `prompt-card` — first-half scenario text; `drafting|voting|reveal`.
4. `draft-card` — authored second-half text; `voting|reveal`.
5. `option-a-card` / `option-b-card` — two vote options; `voting|reveal`.
6. `split-meter` — animated percent bar; `reveal`.
7. `minority-bonus-tag` — marks minority voters receiving bonus; `reveal`.
8. `scoreboard-panel` — cumulative scores by player; `scores|winner`.
9. `winner-ribbon` — top player callout; `winner`.

## Prefab Definitions
- `scenario-card`: large two-part prompt card.
- `choice-card`: side-by-side option cards with selected state.
- `split-bar`: dual-color meter with center marker at 50/50.
- `voter-pill`: small voter chip indicating side and bonus earned.
- `score-row`: leaderboard row with delta animation.

## Script Requirements
- `phase-router.js`: phase-driven scene composition.
- `drafter-bind.js`: binds `drafterId`/`drafterName` and rounds.
- `draft-input-device.js`: text capture for active drafter only.
- `vote-device.js`: A/B voting for non-drafters, disables after submit.
- `reveal-bind.js`: binds `results`, counts, percentages, points.
- `split-meter-anim.js`: animates from center to final split.
- `scoreboard-bind.js`: binds `scores` and `scoreboard` snapshots.

## Art Assets Needed
- `amen_bg_mediator_crossroads.png` (1920x1080): crossroads at sunset, gold signpost.
- `amen_prompt_split_card.png` (1100x460): dual-text prompt frame.
- `amen_option_card_a/b.png` (520x300 each): side cards with amen accents.
- `amen_split_meter.png` (1000x90): balanced scale meter.
- `amen_minority_badge.png` (128x128): minority bonus icon.
- `amen_winner_rosette.png` (256x256): winner badge.
- Prompt suggestion: "symbolic crossroads landscape, warm dusk sky, illuminated manuscript ornament, balanced scales motif, cream and gold UI panels".

## Sound Effects Needed
- `sfx_drafter_turn` (0.7s) — start drafting turn.
- `sfx_submit_text` (0.35s) — drafter submission.
- `sfx_vote_select` (0.25s) — voter tap.
- `sfx_reveal_split` (1.2s) — split meter settle.
- `sfx_perfect_split` (1.5s) — exact 50/50 result.
- `sfx_score_stinger` (0.9s) — score update.

## Interaction Flow (step by step)
1. One player becomes drafter; host shows scenario stem.
2. Drafter writes completion text on device.
3. Remaining players vote between two outcomes (A/B framing from prompt + draft).
4. Host reveals split percentages; drafter earns more when split is near 50/50, minority voters get bonus.
5. Rotate drafter through players, then show scoreboard and final winner.

## Shared Data Schema
- `phase: string` — `error | drafting | voting | reveal | scores | winner`.
- `round: number` — active round index.
- `drafterId: string` / `drafterName: string` — active author.
- `prompt: string` — stem prompt.
- `draft: string` — authored completion.
- `results: object` — `{ drafterId, prompt, draft, countA, countB, pointsEarned, voters:[{id,name,choice,earned}] }`.
- `scores: Record<string, number>` — running score totals.
- `scoreboard: Array<{ id, name, score }>` — sorted standings.
- `winner: { id, name, score }` — final winner.
- `errorMessage: string` — optional error state text.

## Dependencies
- Content pack: manifest currently uses `quip`; design intent maps better to amen dilemma/wyr content and should be validated before implementation.
- Requires text input and choice input.
- Shared split-meter and scoreboard components.
- No drawing/tilt/physics dependencies.
