# Draft: Ball Sort Solvable Puzzle Generator

## Requirements (confirmed)
- Replace random shuffle in `app/lib/test-games/games/ballSort/game.ts` with a guaranteed-solvable generator.
- Default shape: 6 tubes total; 4 colors; 4 balls per color; 2 empty tubes.
- Rules: move only top ball; can place on empty tube or matching color on top; win when each non-empty tube is monochrome and full.
- Provide API:
  - `generatePuzzle(config: PuzzleConfig): GeneratedPuzzle`
  - Deterministic when `seed` provided.
  - Returns `tubes: number[][]` (bottom->top) and `minMoves: number`.
- Generation method: start from solved state and apply valid reverse moves; difficulty driven by number/complexity of reverse moves.
- Handle edge cases: avoid stuck states during generation.

## Technical Decisions (proposed, not yet confirmed)
- Represent tube state as arrays (bottom->top) matching existing game code.
- Use a seedable RNG (either existing repo utility or lightweight PRNG like mulberry32/xorshift) to make generation deterministic.
- Reverse-generation ensures solvability; additional safeguards enforce non-trivial puzzles.

## Research Findings
- (pending librarian)

## Open Questions
- Whether `minMoves` must be the true optimal minimum, or an estimate/upper bound derived from generation steps.

## Scope Boundaries
- INCLUDE: puzzle generation + difficulty scaling + determinism + move-count metadata.
- EXCLUDE (unless requested): new UI, new animations, new game mode, server-side generation.
