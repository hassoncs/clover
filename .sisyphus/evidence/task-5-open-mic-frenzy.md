# Evidence - Task 5: Open Mic Frenzy

## Files Created/Modified
- `r2/games/open-mic-frenzy/manifest.json`: Game metadata and party configuration.
- `r2/games/open-mic-frenzy/scripts/server.js`: Custom server-side logic for scoring and finale.
- `r2/games/open-mic-frenzy/definition.json`: Compiled game definition with bundled script.
- `api/src/party/templates/registry.ts`: Registered the new game template.

## Implementation Details
- Base Template: `crowd-comedy` pattern.
- Scoring: 250 points per vote.
- Bonus: 500 points for "Most Consistent" (at least one vote in every round).
- Rounds: 3 rounds total, with a finale round marked in the prompt.
- Content Pack: Uses the `quip` content pack.

## Verification
- `pnpm tsc --noEmit` passed.
- Files verified on disk.
