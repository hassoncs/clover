# Draft: Asset URL Architecture Migration

## Requirements (confirmed)
- Every generated image uses a random UUID filename: `{assetId}.png`.
- Canonical storage key: `generated/{gameId}/{packId}/{assetId}.png`.
- Folder structure must encode game + pack hierarchy for traceability.
- Forking: forked games share base assets (no blob copy) but can generate new assets into their own packs.
- Debug output must map local artifacts to production IDs/URLs.
- No naming conflicts (UUIDs everywhere).
- GameDefinition should store asset references (asset IDs) instead of absolute URLs; runtime resolves to full URL.

## Current State (evidence)
- Shared utility already matches canonical path format:
  - `shared/src/utils/asset-url.ts` exports `buildAssetPath()` -> `generated/{gameId}/{packId}/{assetId}.png` and `resolveAssetReference()` (legacy URL passthrough + ID resolution).
- CLI currently writes friendly filenames via `r2Prefix + spec.id`:
  - `api/scripts/generate-game-assets.ts` prints `... -> {r2Prefix}/{asset.id}.png` (collision risk).
  - `api/src/ai/pipeline/stages/index.ts` `uploadR2Stage` uses `${run.meta.r2Prefix}/${run.spec.id}.png`.
- API job-based generation already stores R2 keys (not full URLs) in DB:
  - `api/src/trpc/routes/asset-system.ts` resolves stored keys to full URLs via `resolveStoredAssetUrl()`.
- Existing migration script exists for older formats:
  - `api/scripts/migrate-asset-urls.ts` migrates `.../generated/{entityType}/{uuid}.png` to `generated/{gameId}/{packId}/{assetId}.png`.
- Test games hardcode absolute CDN base:
  - `app/lib/test-games/games/*/game.ts` uses `ASSET_BASE` and sets `imageUrl: ${ASSET_BASE}/...`.

## Technical Decisions (proposed defaults)
- Backward compatibility during rollout: support both `imageUrl` (legacy) and `assetRef` (new) at runtime.
- DB continues to store R2 keys (no full URLs) for `game_assets.image_url`.
- Debug traceability: each debug run writes a `metadata.json` containing `{gameId, packId, assetId, r2Key, publicUrl, sourceSpecId}`.

## Open Questions
- Should `assetRef` be plain `assetId` string, or a structured object containing `{assetId, packId}` for cases where pack context is not readily available?
- How should UI component assets (per-state images) be represented (still UUID filenames, but grouped by state in metadata)?
- Rollout preference: strict cutover date vs long-lived dual support for legacy URLs?

## Scope Boundaries
- INCLUDE: CLI + pipeline + API + DB migration + GameDefinition changes + runtime resolver + test game updates.
- EXCLUDE: Changing CDN host/domain, changing image formats, regenerating existing assets unless required by migration.
