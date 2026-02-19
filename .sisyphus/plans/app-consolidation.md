# App Consolidation Plan: Move Shared Code to Packages

## Goal
Move all identical and near-identical code from `apps/amen/` and `apps/slopcade/` into shared packages (`@slopcade/shared`, `@slopcade/ui`, or new `packages/party-ui`). Both apps should become thin brand-specific shells that compose shared components with brand config.

## Current State
- 60 identical components between apps
- 82 identical lib files between apps
- 5 similar components (< 30% diff, mostly colors)
- 6 diverged components (> 30% diff, different features)
- 16 identical party input components
- Brand config system created (`BrandConfig` + `BrandProvider`)

## Strategy
Move in dependency order — lib files first (no React deps), then components (depend on lib), then pages (depend on components).

### Wave 1: Party Lib (lib/party/)
Files to move to a shared location. These have internal `@/` imports so we need to decide on package placement.

**Option A**: Move to `packages/party-lib/` (new package)
**Option B**: Move to `shared/src/party/` (existing @slopcade/shared)
**Option C**: Keep in both apps but symlink

**Decision**: Option B — `@slopcade/shared` already handles shared logic.

Files:
- `lib/party/PartyContext.tsx` — needs brand-aware refactor (add brandId param)
- `lib/party/api.ts` — needs brand-aware refactor (use brand domain for x-brand-id header)
- `lib/party/template-types.ts` — identical, move directly

### Wave 2: Party Components (16 identical)
Move to `packages/party-ui/` or `packages/ui/src/party/`.

**Decision**: `packages/ui/src/party/` — keeps UI components together.

Identical files to move:
1. `components/party/AnswerInput.tsx`
2. `components/party/BuzzerInput.tsx`
3. `components/party/ChoiceGrid.tsx`
4. `components/party/DraggableToken.tsx`
5. `components/party/DrawingInput.tsx`
6. `components/party/HostWaitCard.tsx`
7. `components/party/InvestmentInput.tsx`
8. `components/party/MatchingInput.tsx`
9. `components/party/PhaseShell.tsx`
10. `components/party/PromptCard.tsx`
11. `components/party/ResultRevealCard.tsx`
12. `components/party/Scoreboard.tsx`
13. `components/party/Timer.tsx`
14. `components/party/TokenComposer.tsx`
15. `components/party/VoteList.tsx`
16. `components/party/WheelInput.tsx`

### Wave 3: Browse Components
Already started (GameHallCarousel moved). Still need:
- `GameDetailPanel.tsx` — make brand-configurable
- `GameCard.tsx` — use Slopcade's more advanced version as base
- `FilterBar.tsx` — Slopcade's version is much more advanced

### Wave 4: Other Identical Components (60 total)
The remaining 44 (60 - 16 party) identical components. Many are in:
- `components/game/` — DevToolbar, GameDialog, TuningPanel, etc.
- `components/economy/` — BuyGemsModal, CreditBalance, etc.
- `components/effects/` — EffectParamControl, etc.
- `components/image-search/` — ImageSearchResults, etc.
- `components/billing/` — StripeCheckout, etc.
- `components/auth/` — InviteCodeInput, SignupCodeGate
- `components/assets/` — EntityAssetList, etc.

### Wave 5: Identical Lib Files (82 total)
Most lib files have `@/` imports. Moving them requires updating import paths. Categories:
- `lib/audio/` — AudioManager, haptics
- `lib/offline/` — download manager
- `lib/hooks/` — shared hooks
- `lib/utils/` — shared utilities
- `lib/trpc/` — tRPC client config

### Wave 6: Amen-Only Features → Shared
Port Amen's richer party features to shared:
- `components/party/results/` — 6 result screen components
- `components/party/GameSettingsSheet.tsx`
- `components/party/LobbyCountdown.tsx`
- `components/party/PlayerChip.tsx`
- `components/party/AvatarPicker.tsx`
- `components/party/CaptionOverlay.tsx`

## Execution Order
1. Wave 1 (party lib) — foundation, everything depends on this
2. Wave 2 (party components) — high value, 16 files
3. Wave 3 (browse) — already in progress
4. Wave 4 (other components) — bulk move
5. Wave 5 (lib files) — most complex due to import chains
6. Wave 6 (amen-only → shared) — feature parity

## Risk Mitigation
- Commit after each wave
- LSP diagnostics after each file move
- Test web builds after each wave
- Keep old files as re-exports during transition (delete later)
