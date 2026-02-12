# Decisions

## Themes table stays
The `themes` table and `themesRouter` are independent of asset packs. They store reusable prompt modifiers. Keep them.

## generation_jobs.pack_id → remix_id
Column rename in schema + all code references. The generation pipeline itself (AssetService, executor) is unchanged.

## processGenerationJob writes to remix JSON
Instead of `INSERT INTO pack_entries`, it will read-modify-write `remixes.asset_overrides_json`. This is safe because only one job writes to a remix at a time.

## AssetSystemConfig.activePackId → activeRemixId
The game definition's `assetSystem` config field changes from `activePackId` to `activeRemixId`.
