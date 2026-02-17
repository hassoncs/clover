# The Council — Build Plan
> Game Type: Consensus Mine
> Directory: r2/games/party/consensus-mine/
> Priority: 5
> Status: Not Started

## Current State Audit
- Existing files: `manifest.json`, `definition.json`, `metadata.json`, `scripts/server.js`.
- Working now: team split, ranking survey input, Borda aggregation, alternating team picks, trap/life logic, winner output.
- Missing now: board visualization entities, ranking UI prefabs, team HUD, reveal animation scripts, assets/sfx.
- Server brand-awareness: indirect via injected `config.contentPack`; fallback categories exist.

## Entity Definitions
1. `bg-council-chamber` — chamber background; all phases.
2. `topic-proclamation` — topic card text; `survey|team_turns`.
3. `team-roster-diggers` / `team-roster-drillers` — roster badges; `survey|team_turns|winner`.
4. `lives-meter-diggers` / `lives-meter-drillers` — remaining lives; `team_turns`.
5. `score-meter-diggers` / `score-meter-drillers` — team points; `team_turns|winner`.
6. `master-list-board` — hidden ranked item slots; `team_turns|winner`.
7. `turn-indicator` — active team callout; `team_turns`.
8. `pick-reveal-card` — selected item reveal state (`success|trap|neutral|timeout`); transient in `team_turns`.
9. `winner-banner-team` — final winning team panel; `winner`.

## Prefab Definitions
- `team-badge`: team name + color frame (gold for active, muted for idle).
- `life-orb`: reusable life token (3 max each team).
- `list-slot`: hidden/revealed item slot with rank marker.
- `status-card`: reveal card for turn result outcomes.
- `score-chip`: compact numeric score badge.

## Script Requirements
- `phase-router.js`: switches survey/team/winner layouts.
- `team-bind.js`: binds `teams`, `teamNames`, and active turn highlight.
- `survey-device.js`: ranking input UX (`choice` subtype `ranking`), drag reorder.
- `master-list-bind.js`: binds hidden/revealed list state from `masterList`.
- `turn-result-anim.js`: outcome-specific animation (success glow, trap crack, timeout fade).
- `hud-bind.js`: updates lives and scores after each turn.
- `winner-bind.js`: reveal full master list and winning team.

## Art Assets Needed
- `amen_bg_council_chamber.png` (1920x1080): circular chamber and central table.
- `amen_topic_scroll.png` (1100x300): proclamation panel.
- `amen_list_slot_hidden/revealed.png` (900x88): ranked list row states.
- `amen_team_badge_diggers/drillers.png` (420x140 each): team headers.
- `amen_life_orb.png` (64x64): life token.
- `amen_trap_crack_fx.png` (900x220): trap reveal overlay.
- Prompt suggestion: "apostolic council chamber, warm torchlight, carved stone, gold accents, ornate parchment overlays, board-game readability".

## Sound Effects Needed
- `sfx_topic_reveal_table_hit` (0.8s) — survey start.
- `sfx_rank_submit` (0.4s) — ranking submission.
- `sfx_turn_start` (0.6s) — active team handoff.
- `sfx_success_flourish` (1.0s) — top-3 hit.
- `sfx_trap_strike` (1.0s) — trap/life loss.
- `sfx_winner_ceremony` (2.2s) — winner reveal.

## Interaction Flow (step by step)
1. Host reveals ranking topic; all players privately submit full ranking order.
2. Server computes consensus list and hides it from players.
3. Teams alternate selecting items they think are top-ranked.
4. Host reveals each pick result: success (top 3), neutral, or trap (near-bottom, lose life).
5. Game ends when a team finds all top 3 or opposing team runs out of lives; winner shown with full list reveal.

## Shared Data Schema
- `phase: string` — `error | survey | team_turns | winner`.
- `category: string` — topic label for ranking set.
- `items: string[]` — source choice list.
- `teams: { diggers: string[]; drillers: string[] }` — team membership.
- `teamNames: Record<string,string>` — display names.
- `masterList: Array<{ text: string; revealed?: boolean; rank?: number; index?: number; score?: number }>`.
- `teamLives: { diggers:number; drillers:number }`.
- `teamScores: { diggers:number; drillers:number }`.
- `activeTeamId: string` — current team on turn.
- `turnStatus: string` — `waiting | timeout | success | trap | neutral`.
- `pickedItem: object` — selected item metadata for reveal.
- `winnerTeamId: string` / `winnerTeamName: string` — final winner payload.

## Dependencies
- Content pack: manifest currently `ranking-poll`; implementation should align with amen ranking pack type (`ranking`).
- Requires `choice` ranking subtype input.
- Team HUD and hidden-list reveal UI system.
- No drawing/tilt/physics dependencies.
