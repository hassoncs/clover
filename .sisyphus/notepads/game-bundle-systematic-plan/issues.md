# Issues — game-bundle-systematic-plan

## 2026-01-29 — Monorepo build fails during verification

While verifying this research-only change, running `pnpm build` failed in `slopcade#build` with:

- Metro bundler error: `Unable to resolve module @/lib/test-games/games/angryBurns/AngryBurnsControls` imported from `app/app/test-games/angry-burns.tsx`.

This failure appears unrelated to the QuickJS package research (only a markdown notepad file was added).
