# Issues

## UI Components Router Still Uses Legacy Packs

The `uiComponents` router (`api/src/trpc/routes/ui-components.ts`) still uses the legacy `asset_packs` table:
- `generateUIComponent` mutation inserts into `asset_packs` table (lines 54-67)
- Returns `{ packId }` instead of `{ remixId }`
- `listUIComponentPacks` and `getUIComponentPack` query `asset_packs` table

This router was not migrated in the current cleanup pass. The frontend code in `AssetGalleryPanel.tsx` uses `packResult.packId` as a `remixId` when calling `createGenerationJob`, assuming they're compatible (both are UUIDs).

**Decision**: Keep `packResult.packId` usage in `AssetGalleryPanel.tsx` for now since the API hasn't been migrated yet. The UI components system needs its own migration task.
