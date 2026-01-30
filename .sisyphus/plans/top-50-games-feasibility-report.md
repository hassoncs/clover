# Slopcade: Top 50 Mobile Games Feasibility Report (Work Plan)

## TL;DR

> **Quick Summary**: Produce an internal engineering report that evaluates 50 reference mobile games as **“inspired-by” Slopcade versions**, mapping each to current engine systems/patterns, rating feasibility, estimating solo engineer-days, and recommending a build roadmap.
>
> **Deliverables**:
> - `docs/game-maker/analysis/top-50-games-feasibility-report.md` (final report)
> - Optional: `docs/game-maker/analysis/top-50-games-feasibility-report.sources.md` (source index / citations list, if useful)
>
> **Estimated Effort**: Medium (writing + repo verification + 50-entry analysis)
> **Parallel Execution**: YES (2 waves)
> **Critical Path**: Verify engine capabilities → define rubric → write 50 analyses → synthesize tiers/top-10/gaps → finalize formatting

---

## Context

### Original Request
Create a comprehensive markdown report analyzing **50 mobile games** against Slopcade engine capabilities, including feasibility ratings, implementation time estimates (solo engineer-days), challenges, engine features used, missing features, tiered recommendations, top-10 picks, gap analysis, and an implementation roadmap. Save to:

`/Users/hassoncs/Workspaces/Personal/slopcade/docs/game-maker/analysis/top-50-games-feasibility-report.md`

### Games to Analyze (input dataset)

> This list is the fixed scope for the report.

**PUZZLE / LOGIC**
1. Monument Valley
2. Monument Valley 2
3. Baba Is You
4. The Room
5. The Room Two
6. The Room Three
7. Blackbox
8. Mini Metro
9. Mini Motorways
10. Threes!
11. 2048
12. Flow Free
13. Two Dots
14. Dots
15. Kami
16. Kami 2
17. A Little to the Left
18. Lara Croft GO
19. Hitman GO
20. Prune

**PHYSICS / CASUAL PUZZLE**
21. Cut the Rope
22. Where's My Water?
23. World of Goo
24. Contre Jour
25. Tomb of the Mask
26. Brain It On!
27. Angry Birds

**LIGHT SIM / MANAGEMENT**
28. Tiny Tower
29. Pocket Planes
30. Pocket Trains
31. Fallout Shelter
32. Mini Cities
33. Game Dev Tycoon
34. Universal Paperclips
35. Idle Miner Tycoon

**SORT / MERGE / RELAXED PUZZLE**
36. Water Sort Puzzle
37. Goods Sort
38. Triple Town
39. Merge Dragons!
40. Unpacking

**WORD / GRID / CLASSICS**
41. Crossy Road
42. Wordscapes
43. SpellTower
44. Ridiculous Fishing
45. Desert Golfing

**DESIGN-FORWARD INSPIRATION**
46. Florence
47. Gorogoa
48. Old Man's Journey
49. Device 6
50. Hook

### Confirmed Constraints / Preferences
- **Audience**: Internal engineering planning; technical but readable; actionable.
- **Estimates**: Solo engineer-days, full-time.
- **Fidelity**: “Inspired-by” mechanical equivalents are acceptable (not clones).
- **Sources of truth**: User capability summary **plus** repo docs and test games.
- **Market appeal heuristic**: casual mobile puzzle; simplicity, visual appeal (AI assets), viral/sharable, 2–5 minute sessions, broad appeal.

### Key Repo References (starting set)
- Capability catalogs:
  - `docs/game-maker/reference/game-types.md` (tiers + game-type characteristics)
  - `docs/game-maker/reference/input-methods-catalog.md` (implemented vs planned input)
  - `docs/game-maker/reference/game-patterns.md` (patterns + mapping to test games)
  - `docs/game-maker/reference/technical-primitives.md` (render/physics primitives)
  - `docs/game-maker/INDEX.md` (navigation to engine architecture)
- Concrete examples (validate what’s truly working):
  - `app/lib/test-games/games/gemCrush/game.ts` (Match3)
  - `app/lib/test-games/games/ballSort/game.ts` (Ball Sort + containers + persistence)
  - `app/lib/test-games/games/slopeggle/game.ts` (Peggle-like physics projectile/aiming)
  - `app/lib/test-games/games/flappyBird/game.ts` (tap-to-flap endless)
  - `app/lib/test-games/games/breakoutBouncer/game.ts` (brick-breaker; note input config references)

---

## Work Objectives

### Core Objective
Deliver a single, high-signal markdown report that the team can use to pick the next games to build and to identify the highest-leverage engine gaps.

### Concrete Deliverables
1. `docs/game-maker/analysis/top-50-games-feasibility-report.md`
   - Includes all required sections, 50 game entries, tiering, top-10, gap analysis, and roadmap.

### Definition of Done
- [ ] File exists at `docs/game-maker/analysis/top-50-games-feasibility-report.md`.
- [ ] Contains:
  - Executive Summary
  - 50-game analysis section with **all required per-game fields**
  - Tier 1–4 recommendations
  - Top-10 recommendations with explicit rationale
  - Gap analysis (input/rendering/logic/AI)
  - Implementation roadmap (ordered, dependency-aware)
- [ ] Tables render correctly in GitHub markdown preview.
- [ ] Claims about engine capabilities are **cross-referenced** to repo docs and/or test games (at least via “References” bullets per section).

### Must Have
- “Inspired-by” framing (avoid clone language)
- Consistent rubric and consistent day estimates across games
- Clear “missing features to build” list per game

### Must NOT Have (Guardrails)
- Do **not** imply 3D support.
- Do **not** assume input methods are available if `input-methods-catalog.md` marks them planned.
- Do **not** recommend games whose core mechanic depends on device-only inputs (accelerometer/tilt) unless a non-tilt control scheme is proposed.
- Do **not** include copyrighted/trademarked assets; treat references as inspiration only.

---

## Verification Strategy (Documentation Deliverable)

### Validation Approach
- **Repo validation**: Verify “engine can/can’t” statements via:
  1) the reference docs listed above, and
  2) test games (Match3, Ball Sort, Peggle-like, Flappy, Breakout).

### Special Consistency Check: Input Methods
`input-methods-catalog.md` marks tilt/tap-zones/virtual controls as planned, but some game definitions include `tap` region triggers and `tilt` triggers.

The report must explicitly label:
- **Implemented and shippable now**
- **Partially present (types/DSL exist) but not wired on native/web**
- **Planned only**

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (foundation; can start immediately):
1) Capability verification and “what’s real” notes
2) Scoring rubric + estimate calibration using known test games

Wave 2 (writing; after Wave 1 rubric stable):
3) Draft 50-game table + per-game cards
4) Synthesis: Tiering, Top-10, gap analysis, roadmap
5) Formatting pass + internal QA

Critical Path: Wave 1 → Wave 2 (3→4→5)

---

## TODOs

> Note: This plan is for writing a report. Tasks include explicit structure and acceptance criteria so execution is straightforward.

- [ ] 1. Create report skeleton and scoring rubric

  **What to do**:
  - Create `docs/game-maker/analysis/top-50-games-feasibility-report.md` with a full outline matching required sections.
  - Define an explicit rubric used everywhere:
    - Feasibility: ✅ / ⚠️ / ❌ with clear thresholds
    - Estimate bands: e.g. 1–3 days, 4–7, 8–14, 15–28, 29+ (still report as “days”)
    - “Engine fit” dimensions: input fit, physics fit, rendering fit, system fit, content/AI fit
    - Market appeal heuristic scoring (lightweight; 1–5) tied to user criteria.
  - Define what “inspired-by” means in this document (allowed mechanical translation, disallowed cloning).

  **References**:
  - `docs/game-maker/reference/game-types.md` — engine-supported categories and complexity tiers.
  - `docs/game-maker/reference/input-methods-catalog.md` — implemented vs planned inputs; must drive feasibility.
  - `docs/game-maker/reference/game-patterns.md` — canonical patterns to map games onto.

  **Acceptance Criteria**:
  - [ ] Report file exists with section headings and a rubric subsection.
  - [ ] Rubric explicitly defines how ✅/⚠️/❌ and day estimates are assigned.

- [ ] 2. Validate engine capability claims against repo docs + test games

  **What to do**:
  - Read and extract a “capability truth table” for the report:
    - Inputs: what works on native/web; what is planned; what is partially present.
    - Built-in systems: Match3, Tetris, Ball Sort; confirm via templates/test games.
    - Physics primitives: bodies/shapes/joints/sensors; confirm from docs.
    - Rendering primitives: sprites/atlas, particles, backgrounds, UI overlays.
  - Add a short “Engine Capabilities (Verified)” section in the report (or appendix) with citations.
  - Resolve the known inconsistency about tilt/tap zones by labeling them appropriately (implemented vs planned vs referenced in configs).

  **References**:
  - `docs/game-maker/reference/input-methods-catalog.md` — canonical status table.
  - `app/lib/test-games/games/*/game.ts` — validate real use: match3 (Gem Crush), ball sort, peg-like, flappy.
  - `docs/game-maker/reference/technical-primitives.md` — baseline primitives.

  **Acceptance Criteria**:
  - [ ] Report includes a verified capability summary with citations.
  - [ ] Any “planned” inputs are clearly called out as such.

- [ ] 3. Produce the 50-game analysis section (tables + per-game cards)

  **What to do**:
  - For each of the 50 named games, create:
    - Feasibility (✅/⚠️/❌)
    - Solo engineer-day estimate
    - Key challenges (2–5 bullets)
    - Engine features used (patterns/systems/physics/rendering/input)
    - Missing features to build (explicit; keep scoped)
    - Proposed “Slopcade version” framing (1 sentence) describing the translated core mechanic.
  - Provide a summary table (50 rows) for quick scanning, plus per-game detailed subsections.
  - Ensure every game’s reasoning references at least one:
    - pattern (from `game-patterns.md`),
    - engine type tier (from `game-types.md`),
    - test game analog (where applicable).

  **References**:
  - `docs/game-maker/reference/game-patterns.md` — primary mapping vocabulary.
  - `docs/game-maker/reference/game-types.md` — complexity tiers and physics/game requirements.
  - Test games:
    - `app/lib/test-games/games/gemCrush/game.ts` (Match3 baseline)
    - `app/lib/test-games/games/ballSort/game.ts` (Pick & Place + containers)
    - `app/lib/test-games/games/slopeggle/game.ts` (physics aim + collision scoring)
    - `app/lib/test-games/games/flappyBird/game.ts` (tap-to-jump/flap loop)

  **Acceptance Criteria**:
  - [ ] All 50 games are present.
  - [ ] Every game has all required fields.
  - [ ] The 50-row summary table is complete and consistent.

- [ ] 4. Categorize into Tier 1–4 recommendations (engine readiness)

  **What to do**:
  - Based on rubric + estimates, assign each game to:
    - Tier 1: Ready Now (1–3 days)
    - Tier 2: Easy Add (1–2 weeks)
    - Tier 3: Medium Effort (2–4 weeks)
    - Tier 4: Hard/Not Recommended
  - Provide rationale per tier and a count summary.
  - Include “what to build first to unlock this tier” notes.

  **Acceptance Criteria**:
  - [ ] Every game appears in exactly one tier.
  - [ ] Tier definitions match the requested time bands.

- [ ] 5. Select Top 10 games to pursue (with explicit rationale)

  **What to do**:
  - Pick 10 best candidates based on:
    - alignment with engine strengths (physics/patterns)
    - difficulty (days)
    - market appeal heuristics
    - AI asset compatibility
  - For each top-10 item, include:
    - why it wins
    - what existing test game/template it resembles
    - key risks/unknowns

  **Acceptance Criteria**:
  - [ ] Exactly 10 items.
  - [ ] Each has a clearly stated rationale grounded in the rubric.

- [ ] 6. Gap analysis: engine features that unlock more games

  **What to do**:
  - Organize gaps into:
    - Input methods (virtual controls, tap zones, tilt)
    - Rendering (e.g., masking/clip-path equivalents, path drawing, complex shader effects)
    - Game logic systems (grid path validation, rule engines, inventory/placement, level progression tooling)
    - AI pipeline improvements (better silhouettes, consistent style packs, UI iconography, animation variants)
  - For each gap: list impacted games (from the 50) and expected effort.

  **References**:
  - `docs/game-maker/reference/input-methods-catalog.md` — authoritative planned vs implemented.
  - `docs/game-engine-architecture/02-dynamic-mechanics/roadmap.md` — future mechanics roadmap.
  - `docs/game-maker/roadmap/dynamic-mechanics-roadmap.md` — product-facing roadmap.

  **Acceptance Criteria**:
  - [ ] Each gap lists the games it unlocks.
  - [ ] Each gap has a rough effort estimate.

- [ ] 7. Implementation roadmap: recommended build order

  **What to do**:
  - Propose an ordered sequence:
    - Quick wins (Tier 1)
    - Enabler features (inputs/systems)
    - Tier 2 follow-ons unlocked by each enabler
  - Provide dependency notes: “build X first to unlock Y/Z”.
  - Include a suggested release cadence (e.g., 2 games/week initially), if helpful.

  **Acceptance Criteria**:
  - [ ] Roadmap aligns with top-10 and gap analysis.
  - [ ] Dependencies are explicitly called out.

- [ ] 8. Polish pass: formatting, consistency, and internal QA

  **What to do**:
  - Ensure consistent naming, consistent day estimate ranges, and consistent feasibility logic.
  - Add quick navigation:
    - Table of contents
    - Anchors per game
  - Ensure all tables render correctly.

  **Acceptance Criteria**:
  - [ ] Markdown renders cleanly in GitHub.
  - [ ] No contradictions about supported inputs or systems.

---

## Defaults Applied (override if needed)
- Day estimates assume **AI-generated assets with minimal manual polish** (no bespoke animation production).
- “Inspired-by” mechanic translation is allowed; exact replication is out of scope.

---

## Success Criteria
- The team can use the report to:
  - pick the next 1–3 games with confidence,
  - identify 2–3 engine gaps with maximal unlock value,
  - sequence work without re-litigating fundamentals.
