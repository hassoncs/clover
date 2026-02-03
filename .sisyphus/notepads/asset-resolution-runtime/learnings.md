## Database Seeding Script (seed-asset-packs.ts)

### Schema Requirements Discovered
- `games` table requires `definition` (NOT NULL) and `updated_at` (NOT NULL) fields
- Cannot insert into `games` with just `id`, `title`, `created_at`
- Must provide `definition` (can be empty JSON '{}') and `updated_at` timestamp

### Foreign Key Constraints
- Wrangler enables foreign keys during SQL execution even if disabled in local SQLite
- Must insert in correct order: games → asset_packs → game_assets → asset_pack_entries
- Transaction wrapping (BEGIN/COMMIT) ensures atomicity

### Asset Pack Structure
- Each game gets one "default" pack named `{gameId}-default`
- Pack names match the `activeAssetPackId` field in game definitions
- breakoutScripted shares assets with breakoutBouncer (same r2Prefix)

### Template Counts Per Game
- ballSort: 13 templates (tube components + 8 ball colors + indicator + background)
- flappyBird: 6 templates (bird + pipes + ground/ceiling + background)
- slopeggle: 9 templates (ball + pegs + cannon + portals + background)
- breakoutBouncer: 7 templates (ball + paddle + 4 brick colors + background)
- breakoutScripted: 7 templates (shares breakoutBouncer assets)
- gemCrush: 1 template (background only, gems use rect visuals)

### R2 URL Pattern
- Format: `https://slopcade-api.hassoncs.workers.dev/assets/generated/{r2Prefix}/{templateId}.png`
- r2Prefix varies by game (e.g., 'ballSort', 'flappyBird', 'breakout-bouncer', 'gem-crush')

### Idempotency
- Using `INSERT OR IGNORE` makes script safe to run multiple times
- Won't duplicate data if run again

