
## 2026-02-11 - Remix UI Migration (Task 6)

- **Unified UI**: `app/app/game-detail/[id].tsx` now displays both Remixes and legacy Packs under a single "Remixes" section. Legacy packs are rendered with a "Remix" card style but with "assets" override indication.
- **Modal Update**: `app/app/play/[id].tsx` now fetches and displays both Remixes and Packs in the "Select Remix" modal.
- **Selection Logic**: Updated `handlePackSelect` to `handleRemixSelect` in `app/app/play/[id].tsx` to support both `remixId` and `packId` navigation params.
- **Terminology**: "Generate Remix" and "Select Remix" labels are consistent.
- **Verification**: `tsc` check passed. No explicit "Pack" terminology found in `GameCard.tsx`.
