# Illustrated Scripture — Build Plan
> Game Type: Drawful Animate (Flicker Frames)
> Directory: r2/games/party/drawful-animate/
> Priority: 7
> Status: Not Started

## Current State Audit
- Existing files: `manifest.json`, `definition.json`, `metadata.json`, `scripts/server.js`.
- Working now: two-frame drawing capture, bluff assignment, voting, bluff/guess/artist scoring, round loop.
- Missing now: canvas UX entities, animation viewer host scene, bluff title UI, reveal polish, dedicated assets and sounds.
- Server brand-awareness: indirect only; script reads `config.contentPack` but manifest currently declares empty `contentPacks`.

## Entity Definitions
1. `bg-atelier` — manuscript studio background; all phases.
2. `round-banner` — round and phase header; all active phases.
3. `prompt-private-device` — artist prompt card on phone; `drawing_f1|drawing_f2`.
4. `canvas-frame1` — drawing surface for first frame; device only `drawing_f1`.
5. `canvas-frame2` — drawing surface with onion-skin overlay; device only `drawing_f2`.
6. `brush-toolbar` — color + brush controls; device drawing phases.
7. `animation-viewer` — host loop panel alternates frame1/frame2 at ~4 fps; `bluffing|voting|reveal`.
8. `title-list` — candidate titles list; host `voting`.
9. `vote-device-list` — selectable title options; device `voting`.
10. `reveal-panel` — real prompt, artist name, fooled counts; `reveal`.
11. `scoreboard-panel` — cumulative points; `scores|winner`.

## Prefab Definitions
- `drawing-canvas`: parchment textured canvas with transparent ink layer.
- `toolbar-button`: color/eraser/undo/clear button prefab.
- `anim-frame-shell`: ornate host frame containing flicker playback.
- `title-row`: reusable row for real/bluff titles.
- `reveal-badge`: tags for `REAL`, `BLUFF`, `CORRECT` states.
- `score-row`: leaderboard line item.

## Script Requirements
- `phase-router.js`: handles drawing/bluffing/voting/reveal transitions.
- `canvas-controller-device.js`: stroke capture, undo, clear, color palette, export drawing payload.
- `onion-skin-overlay.js`: shows frame1 ghost during frame2 drawing.
- `animation-player-host.js`: alternates frame textures with configurable fps.
- `bluff-input-device.js`: text input for fake title based on assigned animation metadata.
- `title-vote-device.js`: renders choices from `currentAnimation.titles` and submits vote.
- `reveal-bind.js`: parses `results` and annotates who fooled whom.
- `scoreboard-bind.js`: renders round and final scoreboard.

## Art Assets Needed
- `amen_bg_illustrated_scripture.png` (1920x1080): monastic art studio.
- `amen_canvas_parchment.png` (1200x800): canvas base texture.
- `amen_brush_toolbar.png` (900x120): toolbar panel.
- `amen_animation_frame_gold.png` (1280x820): host display frame.
- `amen_title_row.png` (980x88): title row strip.
- `amen_reveal_stamp_set.png` (160x160 each): REAL/BLUFF/CORRECT stamps.
- Prompt suggestion: "illuminated manuscript workshop, vellum sheets, pigment jars, warm candlelight, ornate gold frame, clean drawing surface".

## Sound Effects Needed
- `sfx_brush_stroke_soft` (loop slices) — drawing interaction.
- `sfx_frame_switch` (0.2s) — flicker transition tick.
- `sfx_title_submit` (0.35s) — bluff submit.
- `sfx_vote_confirm` (0.3s) — vote lock.
- `sfx_reveal_real` (1.1s) — real title reveal.
- `sfx_artist_fooled_all` (1.7s) — special case celebration.

## Interaction Flow (step by step)
1. Each artist receives a private prompt and draws frame 1, then frame 2 with onion skin guidance.
2. Host moves to bluffing; non-artists see assigned animation and submit fake titles on devices.
3. Host shows animation + title options; eligible players vote for the real title.
4. Reveal shows real prompt, artist, and which bluffs attracted votes; points awarded.
5. Repeat for all animations in round, then scoreboard and eventual winner.

## Shared Data Schema
- `phase: string` — `error | drawing_f1 | drawing_f2 | bluffing | voting | reveal | scores | winner`.
- `round: number` / `totalRounds: number` — progression fields.
- `currentAnimation: object` — `{ frame1, frame2, artistName, titles:string[] }` during voting.
- `results: object` — `{ animation, realPrompt, artistId, artistName, titles:[...], votes:[...], pointsEarned }`.
- `scores: Record<string, number>` — running totals.
- `scoreboard: Array<{ id, name, score }>` — standings.
- `winner: { id, name, score }` — final winner.

## Dependencies
- Content pack should be `drawing` (amen maps to `api/src/party/content/packs/amen/amen-drawing.json`); manifest currently empty and should be corrected during implementation.
- Requires drawing input infrastructure (stroke serialization, onion-skin support).
- Requires text + choice input for bluffing/voting.
- No physics dependency.
