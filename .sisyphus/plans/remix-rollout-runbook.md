# Remix Rollout Runbook

## Section 1: Overview
This runbook outlines the production rollout strategy for the Remix system, which generalizes and replaces the legacy Asset Pack system. Remixes allow for lightweight customization of games including assets, variables, and shader parameters.

- Design Doc: .sisyphus/plans/game-customization-beyond-asset-packs.md
- Work Plan: .sisyphus/plans/remix-fork-migration-work-plan.md

## Section 2: Feature Flag Design
The rollout is controlled via a feature flag in the Cloudflare Workers environment.

- Flag Name: REMIX_ENABLED
- Location: api/wrangler.toml under [vars]
- Type: Boolean (true/false)

Behavior:
- REMIX_ENABLED=false: The frontend game-detail page loads legacy asset packs only. Remix endpoints are available but not actively used by the main UI.
- REMIX_ENABLED=true: The frontend game-detail page attempts to load remixes first. If no remixes exist for a game, it falls back to displaying legacy asset packs (Themes).

## Section 3: Pre-Cutover Checklist
The following checks must pass in the production environment before enabling the feature flag:

- [ ] All 82+ tests pass across shared, api, and app packages.
- [ ] remixes table created in production D1 database using DDL from api/schema.sql.
- [ ] Migration script dry-run completed against production data (verify pack count and entry mappings).
- [ ] Migration script executed in production (non-destructive mode).
- [ ] Verify migration report: mapped remix count should match active asset pack count.
- [ ] Remix CRUD endpoints verified as accessible in production.
- [ ] Legacy pack endpoints verified as still functional (coexistence check).
- [ ] Frontend verified to load remixes on game-detail page in staging with flag enabled.
- [ ] Play flow verified with ?remixId= parameter in staging.
- [ ] Fork deep-copy verified to create full workspace files in staging.

## Section 4: Cutover Procedure
Follow these steps for production cutover:

1. Deploy API with remixes table DDL:
   wrangler d1 migrations apply slopcade-db --remote
2. Run migration script (non-destructive):
   hush run -- npx tsx api/scripts/migrate-packs-to-remixes.ts
3. Verify migration report:
   Check that mappedRemixes matches the number of non-deleted asset_packs.
4. Enable REMIX_ENABLED flag:
   Update api/wrangler.toml [vars] section with REMIX_ENABLED = "true" and deploy.
5. Smoke test Game Detail:
   Navigate to a game with known remixes, verify they appear in the UI.
6. Smoke test Play Flow:
   Launch a game with a remixId, verify overrides (assets/variables) apply correctly.
7. Monitor logs and error rates for 48 hours.

## Section 5: Rollback Procedure
If critical issues are detected during or after cutover:

1. Disable REMIX_ENABLED flag:
   Set REMIX_ENABLED = "false" in api/wrangler.toml and redeploy. This reverts the frontend to packs-only mode.
2. If data corruption is suspected in remixes table:
   DELETE FROM remixes WHERE id IN (SELECT id FROM asset_packs WHERE deleted_at IS NULL);
3. If schema issues occur:
   DROP TABLE IF EXISTS remixes; (Note: This is a last resort and destroys all new remixes created since cutover).
4. Redeploy previous stable API version if necessary.

Note: Legacy asset_packs and pack_entries tables are untouched during this process, ensuring a safe return to the previous state.

## Section 6: Deprecation Timeline
- Week 0: Production migration executed. Both systems active. REMIX_ENABLED=true.
- Week 1-2: Monitor remix usage metrics. Verify no regressions in legacy pack API usage.
- Week 3-4: Mark legacy pack routes as deprecated. Add console.warn to API responses.
- Week 5-8: Remove legacy pack UI fallback from game-detail page.
- Week 9-12: Remove legacy pack API routes from the codebase.
- Week 12+: Drop asset_packs and pack_entries tables after performing a final backup.

Gate: Production cutover REQUIRES all checks in Section 3 to be marked as passing.

## Section 7: Monitoring KPIs
Track these metrics to ensure rollout success:

- Remix API call rate vs Legacy Pack API call rate (expect trend toward Remix).
- Error rate (5xx) on Remix endpoints (Target: 0%).
- Pack fallback activation rate on game-detail page (expect trend toward 0% as games get remixes).
- Remix-based play sessions vs Pack-based play sessions.
- Migration integrity: Periodic check that remix count matches active pack count (for historical data).

## Section 8: SQL Commands Reference

### Create remixes table
CREATE TABLE IF NOT EXISTS remixes (
  id TEXT PRIMARY KEY,
  base_game_id TEXT NOT NULL REFERENCES games(id),
  name TEXT NOT NULL,
  description TEXT,
  creator_user_id TEXT REFERENCES users(id),
  variable_overrides_json TEXT,
  asset_overrides_json TEXT,
  shader_param_overrides_json TEXT,
  sound_overrides_json TEXT,
  theme_id TEXT REFERENCES themes(id),
  theme_prompt TEXT,
  style TEXT,
  is_complete INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  deleted_at INTEGER,
  UNIQUE(base_game_id, name)
);

### Rollback Migration
DELETE FROM remixes WHERE id IN (SELECT id FROM asset_packs WHERE deleted_at IS NULL);

### Verification Queries
-- Count active remixes vs active packs
SELECT 
  (SELECT COUNT(*) FROM remixes WHERE deleted_at IS NULL) as remix_count,
  (SELECT COUNT(*) FROM asset_packs WHERE deleted_at IS NULL) as pack_count;

-- Sample comparison of migrated data
SELECT r.id, r.name, r.asset_overrides_json, 
       (SELECT COUNT(*) FROM pack_entries WHERE pack_id = r.id) as original_entry_count
FROM remixes r 
WHERE r.id IN (SELECT id FROM asset_packs)
LIMIT 5;
