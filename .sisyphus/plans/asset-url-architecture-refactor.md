# Asset URL Architecture Refactor

## Context

### Original Request
User reported that asset pack switching in the game editor shows correct images in the UI but fails to load them in the actual game engine. Root cause: inconsistent asset URL construction across the system.

Example of the problem:
- **Working**: `https://slopcade-api.hassoncs.workers.dev/assets/generated/breakout-bouncer/brickRed.png`
- **Broken**: URLs missing the base domain/path prefix when sent to game engine

### Interview Summary

**Key Discussions**:
- **Path Structure**: Current `generated/${entityType}/${uuid}` is problematic (name collisions, no hierarchy). New: `generated/${gameId}/{packId}/{assetId}.png` (all UUIDs)
- **Migration**: Hard cutover with legacy detection - engine checks if value starts with `http`, treats as legacy URL; otherwise constructs from IDs
- **Base URL**: Derive from `ASSET_HOST` environment variable at runtime (NOT stored in GameDefinition)
- **Debug Mode**: Save to both R2 (production) and local `debug-output/` with matching structure
- **Logging**: Configurable `DEBUG_ASSETS=verbose|normal|quiet` environment variable
- **Schema**: `imageUrl` field accepts both full URLs (legacy) and asset IDs (new)
- **Entity Type**: Remove from paths, keep in DB metadata only
- **Data Migration**: Full migration of ALL existing assets to new format

**Research Findings**:
- `AssetService.uploadToR2()` (api/src/ai/assets.ts) currently generates `generated/${entityType}/${uuid}` keys
- `game_assets.image_url` stores relative paths like `/assets/generated/character/uuid.png`
- `resolveAssetUrl()` (app/lib/config/env.ts) prepends `env.apiUrl` to construct full URLs
- `GameBridge.gd` receives sprite `imageUrl` and downloads via `_queue_texture_download()`
- TRPC `getResolvedForGame` returns `image_url` directly from DB join
- `EditorProvider` sets `template.sprite.imageUrl` from pack entries

### Metis Review

**Identified Gaps** (addressed):
1. **Schema Divergence**: `AssetSystemConfig` exists in TypeScript but missing from Zod schemas → Add to both schema files FIRST
2. **URL Format Detection**: Need explicit rules for detecting `http://`, `https://`, `/assets/`, `data:`, `res://`, UUID-only
3. **Backward Compatibility**: Must preserve existing URL format support
4. **gameId/packId Availability**: Verify these are available when uploading assets
5. **Base URL Missing**: Error handling when `ASSET_HOST` not set
6. **Database Migration**: Need script to convert existing paths and move R2 files
7. **Texture Cache**: Godot caches by URL - ensure cache key stability

**Guardrails Applied**:
- Update Zod schemas FIRST before any behavior changes
- Preserve backward compatibility - existing URLs must work
- No scope creep: out of scope are CDN config, asset versioning, prompt tuning, bg removal
- Test pack switching end-to-end before declaring done
- DO NOT change DB schema without migration plan

---

## Work Objectives

### Core Objective
Refactor the asset URL architecture from name-based paths to ID-based paths, ensuring all assets are stored with hierarchical structure (`generated/{gameId}/{packId}/{assetId}.png`) and can be resolved correctly across all system components.

### Concrete Deliverables
- Updated R2 path structure with game/pack/asset ID hierarchy
- Schema updates with URL format detection
- Migration script for existing assets and database
- Engine URL construction logic supporting both legacy and new formats
- Automated tests for URL construction and format detection
- Detailed pipeline logging at configurable levels

### Definition of Done
- [ ] `pnpm tsc --noEmit` passes with no errors
- [ ] All automated tests pass
- [ ] Asset pack switching works end-to-end (UI → DB → Engine)
- [ ] Legacy assets (with full URLs) still render correctly
- [ ] New assets (with IDs) render correctly
- [ ] Debug mode saves to both R2 and local with correct paths
- [ ] Migration script successfully converts existing data

### Must Have
- ID-based R2 path structure: `generated/{gameId}/{packId}/{assetId}.png`
- Runtime derivation of base URL from `ASSET_HOST` environment variable
- Backward compatibility with existing full-URL format
- Migration script for existing assets
- URL format detection function
- Configurable logging (`DEBUG_ASSETS` env var)
- Automated tests

### Must NOT Have (Guardrails)
- NO changes to CDN configuration
- NO asset versioning features
- NO prompt tuning changes
- NO background removal modifications
- NO alignment mode changes
- NO hardcoded environment-specific URLs in GameDefinition
- NO breaking changes to existing games without migration
- NO modification of Godot texture cache key generation
- NO new environment variables without documentation

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest for API, potentially Jest for frontend)
- **User wants tests**: YES - Automated tests
- **Framework**: vitest for API tests, standard test runners for TypeScript

### Automated Testing Plan

Each TODO includes test cases following TDD where applicable:

**Unit Tests**:
1. URL format detection function
   - Test: `isLegacyUrl('https://example.com/asset.png')` → `true`
   - Test: `isLegacyUrl('550e8400-e29b-41d4-a716-446655440000')` → `false`
   - Test: `isLegacyUrl('/assets/generated/foo.png')` → `true`
   
2. Path construction
   - Test: `buildAssetPath(gameId, packId, assetId)` → `generated/{gameId}/{packId}/{assetId}.png`

3. URL construction
   - Test: `constructAssetUrl(baseUrl, path)` → `{baseUrl}/{path}`

**Integration Tests**:
1. Asset upload flow
   - Upload asset → verify R2 key matches `generated/{gameId}/{packId}/{assetId}.png`
   - Upload asset → verify DB stores R2 key path
   - Upload asset in debug mode → verify both R2 and local files created

2. Asset retrieval flow
   - Query pack → verify imageUrl construction
   - Load game → verify sprites resolve correctly

3. Migration script
   - Run migration → verify all rows updated
   - Run migration → verify R2 files moved
   - Run migration idempotency → safe to run twice

**End-to-End Tests**:
1. Pack switching
   - Select pack → verify templates show correct images
   - Select pack → verify game engine loads textures
   - Switch between packs → verify no stale URLs

---

## Task Flow

```
Foundation → Backend → Frontend/Engine → Migration → Testing → Cleanup
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 1, 2 | Independent schema updates |
| B | 4, 5 | Backend path construction changes |
| C | 8, 9 | Frontend and engine updates |

| Task | Depends On | Reason |
|------|------------|--------|
| 3 | 1, 2 | Need schemas before format detection |
| 6 | 4, 5 | TRPC depends on AssetService changes |
| 10 | 1-9 | Migration needs all new code in place |
| 11 | 10 | Tests verify migration worked |

---

## TODOs

- [ ] 0. Setup Test Infrastructure

  **What to do**:
  - Verify vitest is configured for API tests in `api/vitest.config.ts`
  - Create test utils for mocking env vars, DB, R2
  - Create fixture data for testing (sample game IDs, pack IDs, asset IDs)

  **Must NOT do**:
  - Install new test frameworks
  - Modify existing test setup beyond adding utils

  **Parallelizable**: YES (can start immediately)

  **References**:
  - `api/vitest.config.ts` - Existing vitest config
  - `api/src/__fixtures__/` - Pattern for test fixtures
  - `api/src/ai/__tests__/` - Example test structure

  **Acceptance Criteria**:
  - [ ] Test: `pnpm --filter=api test` → runs without errors
  - [ ] Test utils created: `mockEnv()`, `mockDB()`, `mockR2()`
  - [ ] Fixture file created: `test-fixtures.ts` with sample IDs

  **Commit**: NO (groups with 1)

---

- [ ] 1. Update Zod Schemas - Add AssetSystemConfig

  **What to do**:
  - Update `shared/src/types/schemas.ts` - Add `baseAssetUrl?: string` to `AssetSystemConfigSchema`
  - Update `api/src/ai/schemas.ts` - Add matching field to ensure parity
  - NO behavioral changes yet - schema only

  **Must NOT do**:
  - Add logic to populate `baseAssetUrl` (that comes later)
  - Change any other schema fields
  - Modify validation rules beyond adding the new optional field

  **Parallelizable**: YES (with 0, 2)

  **References**:
  - `shared/src/types/schemas.ts:AssetSystemConfigSchema` - Existing schema to extend
  - `api/src/ai/schemas.ts` - API-side schema that must match

  **Acceptance Criteria**:
  - [ ] Test: Schema parses `{activeAssetPackId: 'x', baseAssetUrl: 'https://example.com'}` → success
  - [ ] Test: Schema parses `{activeAssetPackId: 'x'}` (no baseAssetUrl) → success
  - [ ] Test: `pnpm tsc --noEmit` → no errors
  - [ ] Code: Both schema files updated with matching field

  **Commit**: YES
  - Message: `feat(schema): add baseAssetUrl to AssetSystemConfig`
  - Files: `shared/src/types/schemas.ts`, `api/src/ai/schemas.ts`
  - Pre-commit: `pnpm tsc --noEmit`

---

- [ ] 2. Add GameDefinition.id to Schema

  **What to do**:
  - Update `shared/src/types/schemas.ts` - Add `id: string` to `GameDefinitionSchema`
  - Make it required field
  - Update `GameDefinition` type definition to match

  **Must NOT do**:
  - Modify existing game definitions in DB
  - Add logic to populate IDs (migration handles that)

  **Parallelizable**: YES (with 0, 1)

  **References**:
  - `shared/src/types/schemas.ts:GameDefinitionSchema` - Schema to update
  - `shared/src/types/GameDefinition.ts` - Type definition

  **Acceptance Criteria**:
  - [ ] Test: Schema parses game with `id` field → success
  - [ ] Test: Schema rejects game without `id` field → error
  - [ ] Test: TypeScript type includes `id: string`
  - [ ] Test: `pnpm tsc --noEmit` → no errors

  **Commit**: YES
  - Message: `feat(schema): add id field to GameDefinition`
  - Files: `shared/src/types/schemas.ts`, `shared/src/types/GameDefinition.ts`
  - Pre-commit: `pnpm tsc --noEmit`

---

- [ ] 3. Create URL Format Detection Utility

  **What to do**:
  - Create `shared/src/utils/asset-url.ts`
  - Implement `isLegacyUrl(value: string): boolean`
    - Returns `true` if starts with `http://`, `https://`, `/assets/`, `data:`, `res://`
    - Returns `false` for UUID-only format
  - Implement `constructAssetUrl(baseUrl: string, gameId: string, packId: string, assetId: string): string`
    - Returns `${baseUrl}/generated/${gameId}/${packId}/${assetId}.png`
  - Write unit tests for both functions

  **Must NOT do**:
  - Add URL validation beyond format detection
  - Fetch or verify URLs actually exist

  **Parallelizable**: NO (depends on 1, 2)

  **References**:
  - `shared/src/types/sprite.ts:ImageSpriteComponent` - Where imageUrl/assetId will be used
  - Metis Risk 3 - Legacy detection rules

  **Acceptance Criteria**:
  - [ ] Test: `isLegacyUrl('https://example.com/a.png')` → `true`
  - [ ] Test: `isLegacyUrl('http://example.com/a.png')` → `true`
  - [ ] Test: `isLegacyUrl('/assets/generated/a.png')` → `true`
  - [ ] Test: `isLegacyUrl('data:image/png;base64,...')` → `true`
  - [ ] Test: `isLegacyUrl('res://sprites/player.png')` → `true`
  - [ ] Test: `isLegacyUrl('550e8400-e29b-41d4-a716-446655440000')` → `false`
  - [ ] Test: `constructAssetUrl('https://cdn.com', 'g1', 'p1', 'a1')` → `https://cdn.com/generated/g1/p1/a1.png`
  - [ ] Test: All unit tests pass
  - [ ] Test: `pnpm tsc --noEmit` → no errors

  **Commit**: YES
  - Message: `feat(utils): add asset URL format detection`
  - Files: `shared/src/utils/asset-url.ts`, `shared/src/utils/__tests__/asset-url.test.ts`
  - Pre-commit: `pnpm test -- asset-url`

---

- [ ] 4. Update AssetService.uploadToR2 Signature

  **What to do**:
  - Modify `api/src/ai/assets.ts:uploadToR2()` to accept `gameId: string, packId: string` parameters
  - Change R2 key construction from `generated/${entityType}/${assetId}` to `generated/${gameId}/${packId}/${assetId}.png`
  - Update debug output path (if exists) to match: `api/debug-output/generated/${gameId}/${packId}/${assetId}.png`
  - Add logging based on `DEBUG_ASSETS` env var level
  - Write unit test for path construction

  **Must NOT do**:
  - Change return value format
  - Modify R2 upload logic beyond path
  - Add background removal or other pipeline changes

  **Parallelizable**: YES (with 5)

  **References**:
  - `api/src/ai/assets.ts:841-856` - Current uploadToR2 implementation
  - Draft notes on new path structure
  - Metis findings on debug output

  **Acceptance Criteria**:
  - [ ] Test: `uploadToR2(buffer, '.png', 'game1', 'pack1')` → R2 key = `generated/game1/pack1/{uuid}.png`
  - [ ] Test: Debug mode enabled → file saved to `api/debug-output/generated/game1/pack1/{uuid}.png`
  - [ ] Test: `DEBUG_ASSETS=verbose` → logs include "Uploading to R2", key, gameId, packId
  - [ ] Test: `DEBUG_ASSETS=quiet` → no logs except errors
  - [ ] Code: Function signature updated with gameId, packId params

  **Commit**: NO (groups with 5)

---

- [ ] 5. Update AssetService Call Sites

  **What to do**:
  - Find all calls to `uploadToR2()` using `lsp_find_references`
  - Update each call to pass `gameId` and `packId` parameters
  - Verify these values are available in calling context
  - Add test for each call site

  **Must NOT do**:
  - Change any logic beyond adding parameters
  - Modify generation prompts or settings

  **Parallelizable**: YES (with 4)

  **References**:
  - `api/src/ai/assets.ts:generateDirect()` - Likely caller
  - `api/src/trpc/routes/asset-system.ts` - Orchestration layer

  **Acceptance Criteria**:
  - [ ] Code: All callers updated to pass gameId, packId
  - [ ] Test: Mock gameId/packId available in generation context
  - [ ] Test: Upload integration test passes with new params
  - [ ] Test: `pnpm tsc --noEmit` → no errors

  **Commit**: YES
  - Message: `refactor(assets): update uploadToR2 to use game/pack IDs`
  - Files: `api/src/ai/assets.ts`, call sites
  - Pre-commit: `pnpm --filter=api test`

---

- [ ] 6. Update TRPC Routes - Store R2 Key Instead of URL

  **What to do**:
  - Modify `api/src/trpc/routes/asset-system.ts:processJob` (lines ~700-703)
  - Change `game_assets.image_url` insert to store R2 key path (e.g., `generated/game1/pack1/asset1.png`)
  - Remove any URL prefix construction before DB insert
  - Update `getResolvedForGame` query to construct full URLs when returning to client
    - Read `ASSET_HOST` from env
    - Prepend to R2 key: `${ASSET_HOST}/${r2Key}`
  - Write integration test

  **Must NOT do**:
  - Change database schema (column names/types)
  - Modify job orchestration logic
  - Touch polling or generation flow

  **Parallelizable**: NO (depends on 4, 5)

  **References**:
  - `api/src/trpc/routes/asset-system.ts:700-703` - DB insert for game_assets
  - `api/src/trpc/routes/asset-system.ts:830-844` - getResolvedForGame query
  - `api/src/trpc/routes/assets.ts:194, 230` - Pattern for using ASSET_HOST

  **Acceptance Criteria**:
  - [ ] Test: After asset upload, DB row has `image_url = 'generated/g1/p1/a1.png'` (no domain)
  - [ ] Test: `getResolvedForGame` returns `imageUrl: 'https://cdn.com/generated/g1/p1/a1.png'`
  - [ ] Test: `ASSET_HOST` not set → error thrown with clear message
  - [ ] Code: No hardcoded domain in DB inserts
  - [ ] Test: Integration test passes

  **Commit**: YES
  - Message: `refactor(api): store R2 keys in DB, construct URLs at runtime`
  - Files: `api/src/trpc/routes/asset-system.ts`
  - Pre-commit: `pnpm --filter=api test`

---

- [ ] 7. Add Configurable Logging to Asset Pipeline

  **What to do**:
  - Create `api/src/ai/logger.ts` utility
  - Read `DEBUG_ASSETS` env var (default: 'normal')
  - Implement `logAssetPipeline(level: 'verbose'|'normal'|'quiet', stage: string, data: Record<string, unknown>)`
  - Add logging calls to:
    - `AssetService.uploadToR2()` - upload start/complete
    - `AssetService.generateDirect()` - generation start/complete
    - Background removal (if exists) - removal start/complete
  - Write test for log filtering

  **Must NOT do**:
  - Log sensitive data (API keys, secrets)
  - Change pipeline behavior

  **Parallelizable**: YES (can do independently)

  **References**:
  - Draft notes on logging requirements
  - `api/src/trpc/routes/asset-system.ts:22-30` - Existing logging pattern (jobLog)

  **Acceptance Criteria**:
  - [ ] Test: `DEBUG_ASSETS=quiet` → only errors logged
  - [ ] Test: `DEBUG_ASSETS=normal` → stage transitions + errors
  - [ ] Test: `DEBUG_ASSETS=verbose` → full trace with IDs, URLs, timings
  - [ ] Code: Logs tagged with `[AssetPipeline:{Stage}]`
  - [ ] Code: No secrets in log output

  **Commit**: YES
  - Message: `feat(assets): add configurable DEBUG_ASSETS logging`
  - Files: `api/src/ai/logger.ts`, `api/src/ai/assets.ts`
  - Pre-commit: `pnpm --filter=api test`

---

- [ ] 8. Update Frontend - resolveAssetUrl

  **What to do**:
  - Modify `app/lib/config/env.ts:resolveAssetUrl()`
  - Import `isLegacyUrl` and `constructAssetUrl` from shared utils
  - Add logic:
    ```typescript
    if (isLegacyUrl(urlOrId)) {
      // Legacy: prepend apiUrl if relative
      return urlOrId.startsWith('http') ? urlOrId : `${env.apiUrl}${urlOrId}`;
    } else {
      // New: construct from env.apiUrl + generated path
      // Need gameId, packId from context
      return constructAssetUrl(env.apiUrl, gameId, packId, urlOrId);
    }
    ```
  - **PROBLEM**: `resolveAssetUrl` doesn't have access to gameId/packId context
  - **SOLUTION**: Change signature to `resolveAssetUrl(urlOrId: string, gameId: string, packId: string, env)`
  - Update all call sites
  - Write unit tests

  **Must NOT do**:
  - Fetch gameId/packId from network
  - Add caching beyond what exists

  **Parallelizable**: YES (with 9)

  **References**:
  - `app/lib/config/env.ts:39-47` - Current resolveAssetUrl
  - `shared/src/utils/asset-url.ts` - Utility functions from task 3

  **Acceptance Criteria**:
  - [ ] Test: `resolveAssetUrl('https://cdn.com/a.png', ...)` → `'https://cdn.com/a.png'` (legacy preserved)
  - [ ] Test: `resolveAssetUrl('/assets/foo.png', ...)` → `'https://api.com/assets/foo.png'` (legacy relative)
  - [ ] Test: `resolveAssetUrl('uuid-123', 'g1', 'p1', env)` → `'https://api.com/generated/g1/p1/uuid-123.png'`
  - [ ] Code: All call sites updated with gameId, packId params
  - [ ] Test: `pnpm tsc --noEmit` → no errors

  **Commit**: NO (groups with 9)

---

- [ ] 9. Update Godot Engine - URL Construction

  **What to do**:
  - Modify `godot_project/scripts/GameBridge.gd:_add_image_sprite()` (line ~1151)
  - Before calling `_queue_texture_download()`, check if `sprite_data.imageUrl` is legacy or ID
  - If legacy: use as-is
  - If ID: construct URL from base + gameId + packId + assetId
  - **PROBLEM**: Godot needs access to baseUrl, gameId, packId
  - **SOLUTION**: Pass these in `load_game_json()` payload, store as instance variables
  - Update `GodotBridge.web.ts` and `GodotBridge.native.ts` to include this data when calling `loadGame`
  - Write test for URL construction

  **Must NOT do**:
  - Change texture cache key generation
  - Modify download logic
  - Touch rendering or collision code

  **Parallelizable**: YES (with 8)

  **References**:
  - `godot_project/scripts/GameBridge.gd:1151` - _add_image_sprite
  - `godot_project/scripts/GameBridge.gd:677` - load_game_json entry point
  - `app/lib/godot/GodotBridge.web.ts` - TypeScript bridge
  - Metis findings on URL construction

  **Acceptance Criteria**:
  - [ ] Code: Godot receives `base_asset_url`, `game_id`, `pack_id` in game definition JSON
  - [ ] Code: Godot detects legacy URL (starts with `http`) vs ID format
  - [ ] Code: ID format constructs: `base_asset_url + "/generated/" + game_id + "/" + pack_id + "/" + asset_id + ".png"`
  - [ ] Test: Manual verification - load game with new ID format → textures load
  - [ ] Test: Manual verification - load game with legacy URLs → textures load

  **Commit**: YES
  - Message: `feat(engine): support ID-based asset URLs with legacy fallback`
  - Files: `godot_project/scripts/GameBridge.gd`, `app/lib/godot/GodotBridge.web.ts`, `app/lib/godot/GodotBridge.native.ts`
  - Pre-commit: `pnpm tsc --noEmit`

---

- [ ] 10. Create Migration Script

  **What to do**:
  - Create `api/scripts/migrate-asset-urls.ts`
  - Script steps:
    1. Query all `game_assets` rows
    2. For each row:
       - Parse existing `image_url` to extract assetId
       - Get gameId from `owner_game_id`
       - Find packId by querying `asset_pack_entries` where `asset_id = row.id`
       - Construct new R2 key: `generated/${gameId}/${packId}/${assetId}.png`
       - Copy file in R2 from old key to new key
       - Update DB row with new `image_url`
       - Delete old R2 file (optional, or keep for rollback)
    3. Update `games` table:
       - For each game missing `id` field in `definition` JSON:
         - Generate UUID
         - Update `definition.id`
       - Save updated definition
  - Add dry-run mode: `--dry-run` flag to preview changes without applying
  - Add logging for each migration step
  - Make idempotent (safe to run multiple times)
  - Write integration test

  **Must NOT do**:
  - Modify game logic or templates
  - Change asset generation prompts
  - Touch active generation jobs

  **Parallelizable**: NO (depends on 1-9 being complete)

  **References**:
  - `api/src/migrations/migrate-asset-packs.ts` - Example migration pattern
  - `api/src/trpc/routes/asset-system.ts` - DB query patterns
  - Draft notes on full migration requirement

  **Acceptance Criteria**:
  - [ ] Test: Dry-run mode lists all changes without applying
  - [ ] Test: Run migration → all `game_assets.image_url` updated to new format
  - [ ] Test: Run migration → all R2 files copied to new paths
  - [ ] Test: Run migration → all games have `definition.id` populated
  - [ ] Test: Run migration twice → second run is no-op (idempotent)
  - [ ] Code: Detailed logging at each step
  - [ ] Code: Rollback instructions in script comments

  **Commit**: YES
  - Message: `feat(migration): add asset URL migration script`
  - Files: `api/scripts/migrate-asset-urls.ts`
  - Pre-commit: `pnpm tsc --noEmit`

---

- [ ] 11. Write End-to-End Tests

  **What to do**:
  - Create `api/src/__tests__/asset-pipeline.integration.test.ts`
  - Test scenarios:
    1. **Upload Flow**: Generate asset → verify R2 key format → verify DB stores key → verify TRPC returns full URL
    2. **Pack Switching**: Create game with 2 packs → switch activePackId → verify templates update → verify engine receives correct URLs
    3. **Legacy Compatibility**: Load game with old URLs → verify engine loads textures → verify no errors
    4. **Migration**: Run migration script → verify old assets work → verify new assets work → verify no broken URLs
  - Each test should cover the full stack (API → DB → Frontend/Engine)

  **Must NOT do**:
  - Mock the entire system (use real DB, R2 for integration tests)
  - Add E2E browser tests (use API-level integration)

  **Parallelizable**: NO (depends on 10)

  **References**:
  - `api/src/ai/__tests__/` - Example test structure
  - Draft notes on verification strategy

  **Acceptance Criteria**:
  - [ ] Test: Upload flow integration test passes
  - [ ] Test: Pack switching integration test passes
  - [ ] Test: Legacy compatibility test passes
  - [ ] Test: Migration integration test passes
  - [ ] Code: Tests run with `pnpm --filter=api test`

  **Commit**: YES
  - Message: `test(assets): add end-to-end asset pipeline tests`
  - Files: `api/src/__tests__/asset-pipeline.integration.test.ts`
  - Pre-commit: `pnpm --filter=api test`

---

- [ ] 12. Update Documentation

  **What to do**:
  - Update `docs/asset-generation/CONTINUATION.md`:
    - Document new path structure
    - Add migration instructions
    - Update R2 storage section
    - Add DEBUG_ASSETS logging guide
  - Update `.dev.vars.example` to include `DEBUG_ASSETS` variable
  - Add inline code comments for URL format detection logic

  **Must NOT do**:
  - Create new documentation files
  - Modify prompt tuning or generation docs

  **Parallelizable**: YES (can do anytime after plan is clear)

  **References**:
  - `docs/asset-generation/CONTINUATION.md` - Existing documentation
  - `.dev.vars.example` - Environment variable template

  **Acceptance Criteria**:
  - [ ] Code: CONTINUATION.md updated with new path structure
  - [ ] Code: CONTINUATION.md includes migration instructions
  - [ ] Code: .dev.vars.example includes `DEBUG_ASSETS=normal`
  - [ ] Code: URL detection function has clear comments

  **Commit**: YES
  - Message: `docs(assets): update for ID-based URL architecture`
  - Files: `docs/asset-generation/CONTINUATION.md`, `.dev.vars.example`
  - Pre-commit: None

---

- [ ] 13. Run Migration and Verify

  **What to do**:
  - Backup database before migration
  - Run `pnpm tsx api/scripts/migrate-asset-urls.ts --dry-run` and review output
  - Run migration for real: `pnpm tsx api/scripts/migrate-asset-urls.ts`
  - Verify results:
    - Check DB: `SELECT id, image_url FROM game_assets LIMIT 10` → all new format
    - Check R2: Browse `generated/` folder → see gameId/packId hierarchy
    - Test in UI: Open game editor → switch packs → verify images load
    - Test in engine: Play game → verify sprites render
  - Document any issues

  **Must NOT do**:
  - Run in production without backup
  - Skip verification steps

  **Parallelizable**: NO (final step)

  **References**:
  - Migration script from task 10
  - Acceptance criteria

  **Acceptance Criteria**:
  - [ ] Manual: Dry-run output reviewed, looks correct
  - [ ] Manual: Migration completes without errors
  - [ ] Manual: DB query shows new URL format
  - [ ] Manual: R2 bucket shows new folder structure
  - [ ] Manual: Game editor pack switching works
  - [ ] Manual: Game engine renders sprites correctly
  - [ ] Manual: Legacy games (if any) still work

  **Commit**: NO (migration is data operation, not code change)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(schema): add baseAssetUrl to AssetSystemConfig` | schemas.ts (shared & api) | `pnpm tsc --noEmit` |
| 2 | `feat(schema): add id field to GameDefinition` | schemas.ts, GameDefinition.ts | `pnpm tsc --noEmit` |
| 3 | `feat(utils): add asset URL format detection` | asset-url.ts, tests | `pnpm test -- asset-url` |
| 5 | `refactor(assets): update uploadToR2 to use game/pack IDs` | assets.ts, call sites | `pnpm --filter=api test` |
| 6 | `refactor(api): store R2 keys in DB, construct URLs at runtime` | asset-system.ts | `pnpm --filter=api test` |
| 7 | `feat(assets): add configurable DEBUG_ASSETS logging` | logger.ts, assets.ts | `pnpm --filter=api test` |
| 9 | `feat(engine): support ID-based asset URLs with legacy fallback` | GameBridge.gd, bridges | `pnpm tsc --noEmit` |
| 10 | `feat(migration): add asset URL migration script` | migrate-asset-urls.ts | `pnpm tsc --noEmit` |
| 11 | `test(assets): add end-to-end asset pipeline tests` | integration tests | `pnpm --filter=api test` |
| 12 | `docs(assets): update for ID-based URL architecture` | CONTINUATION.md, .dev.vars.example | None |

---

## Success Criteria

### Verification Commands
```bash
# TypeScript compilation
pnpm tsc --noEmit

# Run tests
pnpm --filter=api test

# Run migration (dry-run)
pnpm tsx api/scripts/migrate-asset-urls.ts --dry-run

# Run migration (real)
pnpm tsx api/scripts/migrate-asset-urls.ts

# Verify DB
# (in DB console)
SELECT id, image_url FROM game_assets LIMIT 10;
SELECT id, definition FROM games LIMIT 1;
```

### Final Checklist
- [ ] All "Must Have" present:
  - [ ] R2 paths use `generated/{gameId}/{packId}/{assetId}.png`
  - [ ] Base URL derived from `ASSET_HOST` at runtime
  - [ ] Legacy URLs still work (backward compatibility)
  - [ ] Migration script exists and is idempotent
  - [ ] URL format detection function exists
  - [ ] `DEBUG_ASSETS` logging works
  - [ ] Automated tests pass
- [ ] All "Must NOT Have" absent:
  - [ ] No CDN config changes
  - [ ] No asset versioning
  - [ ] No prompt tuning
  - [ ] No bg removal changes
  - [ ] No alignment mode changes
  - [ ] No hardcoded URLs in GameDefinition
  - [ ] No breaking changes without migration
  - [ ] No texture cache key changes
  - [ ] No undocumented env vars
- [ ] All tests pass
- [ ] Pack switching works end-to-end
- [ ] Legacy assets render correctly
- [ ] New assets render correctly
- [ ] Migration completes successfully
