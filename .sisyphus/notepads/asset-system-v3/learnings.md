# Learnings - Asset System V3 Migration

## Conventions & Patterns

## 2026-02-03T22:06:45Z - Initial Context
- V3 schema uses `r2_key` (not `image_url`) for storage keys
- URLs are NEVER stored in DB - always constructed at runtime
- `asset_packs` has `theme_id` FK (replaces `prompt_defaults_json`)
- `pack_entries` table (renamed from `asset_pack_entries`)
- Active pack stored in game definition JSON: `assetSystem.activePackId`

## 2026-02-03 - Schema Migration V3
- Successfully executed clean-slate migration for Asset System V3.
- Dropped legacy tables: game_assets, game_asset_selections, assets, asset_packs, asset_pack_entries, generation_jobs, generation_tasks.
- Created new V3 tables: assets, asset_packs, pack_entries, generation_jobs, generation_tasks.
- Updated themes table with is_public, style, and deleted_at columns.
- Migration file: api/migrations/20260203_asset_system_v3.sql
- Authoritative schema updated in api/schema.sql.
