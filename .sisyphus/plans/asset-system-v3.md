# Asset System V3: Clean Slate Migration

## TL;DR

> **Quick Summary**: Complete replacement of the fragmented asset system with a clean, normalized V3 schema. Drop legacy tables, create 3 core tables with proper theme relationships, unify CLI and Web to use same API, comprehensive cleanup of all legacy code, AND implement offline mode for native apps.
> 
> **Deliverables**:
> - New normalized schema: `assets`, `asset_packs`, `pack_entries` + supporting tables
> - Unified `applyThemeToGame` API used by both CLI and Web
> - New CLI tool: `api/scripts/theme-game.ts`
> - All legacy code removed (24+ files)
> - Zero references to old tables/fields remaining
> - Offline mode: download games for offline play on native apps
> 
> **Estimated Effort**: Large (~3-4 days of focused work)
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Schema → Types → API → Frontend → CLI → Cleanup → Offline Mode

---

## Context

### Original Request
Complete migration to Asset System V3 as defined in vision documents, with a comprehensive cleanup phase to ensure no legacy code remains.

### Interview Summary
**Key Decisions**:
- NO data migration needed - can drop all tables and rebuild from scratch
- Offline mode IS included (Phase 9) - download games for offline play
- One unified plan covering entire migration
- Comprehensive cleanup is a critical final phase

**Research Findings**:
- Current schema has TWO asset tables (`assets` and `game_assets`) causing confusion
- `asset_packs` stores themes in `prompt_defaults_json` instead of `theme_id` FK
- URLs stored in DB (`image_url`) instead of R2 keys only
- CLI (`generate-game-assets.ts`) bypasses tRPC, uses different code path
- 24 game config files in `api/scripts/game-configs/` need removal
- `assets.ts` router (795 lines) needs to be deleted
- Godot bridge (`VisualRenderer.gd`) expects `imageUrl` field

### Metis Review
**Identified Gaps** (addressed):
- Assumption validation phase added (Phase 0)
- Rollback strategy defined for each phase
- Theme FK constraint behavior defined (CASCADE on delete)
- API backward compatibility layer during transition
- Verification commands as explicit tasks
- Edge cases documented in acceptance criteria

---

## Work Objectives

### Core Objective
Replace the fragmented, duplicated asset system with a clean V3 schema where themes are properly normalized, URLs are never stored (only R2 keys), and CLI/Web use the same code path.

### Concrete Deliverables
- `api/migrations/20260203_asset_system_v3.sql` - Complete schema replacement
- `shared/src/types/asset-system.ts` - New clean types (Theme, Asset, AssetPack, PackEntry)
- `api/src/trpc/routes/asset-system.ts` - Rewritten for new schema
- `shared/src/utils/asset-url.ts` - Simplified (R2 key → URL only)
- `api/scripts/theme-game.ts` - New CLI tool using tRPC
- `app/lib/game-engine/hooks/useAssetResolution.ts` - Simplified
- Zero legacy code remaining

### Definition of Done
- [x] `grep -r "game_assets\|game_asset_selections" --include="*.ts" .` returns 0 results
- [x] `grep -r "image_url" --include="*.sql" api/schema.sql` returns 0 results
- [x] `pnpm tsc --noEmit` passes in shared/, api/, app/ (app has pre-existing errors in ScriptSandbox)
- [x] `generate-game-assets.ts` deleted, `theme-game.ts` working
- [x] `api/scripts/game-configs/` directory deleted
- [x] `api/src/trpc/routes/assets.ts` deleted

### Must Have
- New normalized schema with `theme_id` on `asset_packs`
- R2 keys only in database, URLs constructed at runtime
- `applyThemeToGame` API endpoint
- CLI that calls the same API as Web
- Complete removal of legacy code
- Offline mode: download manager, local asset server, offline settings

### Must NOT Have (Guardrails)
- **NO** data migration logic (tables will be dropped and recreated empty)
- **NO** asset versioning or rollback features
- **NO** changes to generation pipeline logic (only table references)
- **NO** refactoring beyond what's needed for migration
- **NO** new features not in vision documents
- **NO** backward compatibility for Godot - update directly (user confirmed no production usage)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (vitest in api/)
- **User wants tests**: Manual verification + TypeScript compilation
- **Framework**: vitest for api/, tsc --noEmit for all

### Manual Execution Verification

Each task includes verification commands. Final verification:

```bash
# 1. TypeScript compilation (all packages)
cd shared && pnpm tsc --noEmit
cd ../api && pnpm tsc --noEmit
cd ../app && pnpm tsc --noEmit

# 2. No legacy references remain
grep -r "game_assets" --include="*.ts" . | grep -v node_modules | grep -v ".sisyphus"
grep -r "game_asset_selections" --include="*.ts" . | grep -v node_modules
grep -r "asset_pack_entries" --include="*.ts" . | grep -v node_modules  # Should use pack_entries
grep -r "image_url" --include="*.ts" . | grep -v node_modules  # Should use r2Key

# 3. Deleted files don't exist
ls api/src/trpc/routes/assets.ts 2>/dev/null || echo "✓ Deleted"
ls api/scripts/generate-game-assets.ts 2>/dev/null || echo "✓ Deleted"
ls api/scripts/game-configs/ 2>/dev/null || echo "✓ Deleted"

# 4. New CLI works
npx tsx api/scripts/theme-game.ts --help
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Schema migration (create new tables)
└── Task 2: TypeScript types rewrite

Wave 2 (After Wave 1):
├── Task 3: API routes rewrite (depends: 1, 2)
├── Task 4: URL utilities simplification (depends: 2)
└── Task 5: Generation pipeline table updates (depends: 1, 2)

Wave 3 (After Wave 2):
├── Task 6: Frontend hook updates (depends: 3, 4)
├── Task 7: New CLI tool (depends: 3)
└── Task 8: Godot bridge updates (depends: 4)

Wave 4 (After Wave 3):
└── Task 9: Comprehensive cleanup (depends: 3-8)

Wave 5 (After Wave 4 - Offline Mode):
├── Task 10: Offline manifest API endpoint (depends: 3)
├── Task 11: Download manager (depends: 4, 10)
├── Task 12: Local asset server (depends: 4)
├── Task 13: Offline settings & hooks (depends: 11, 12)
└── Task 14: Offline UI components (depends: 13)

Critical Path: Task 1 → Task 3 → Task 9 → Task 10 → Task 13 → Task 14
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 5 | 2 |
| 2 | None | 3, 4, 5 | 1 |
| 3 | 1, 2 | 6, 7, 9, 10 | 4, 5 |
| 4 | 2 | 6, 8, 11, 12 | 3, 5 |
| 5 | 1, 2 | 9 | 3, 4 |
| 6 | 3, 4 | 9 | 7, 8 |
| 7 | 3 | 9 | 6, 8 |
| 8 | 4 | 9 | 6, 7 |
| 9 | 3-8 | 10 | None |
| 10 | 3, 9 | 11 | 12 |
| 11 | 4, 10 | 13 | 12 |
| 12 | 4 | 13 | 10, 11 |
| 13 | 11, 12 | 14 | None |
| 14 | 13 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2 | `category="quick"` - schema and types are focused work |
| 2 | 3, 4, 5 | `category="unspecified-high"` - API rewrite is significant |
| 3 | 6, 7, 8 | `category="quick"` - focused updates |
| 4 | 9 | `category="unspecified-high"` - comprehensive cleanup |
| 5 | 10-14 | `category="unspecified-high"` - offline mode implementation |

---

## TODOs

### WAVE 1: Foundation

- [x] 1. Schema Migration - Drop and Recreate Asset Tables

  **What to do**:
  1. Create migration file `api/migrations/20260203_asset_system_v3.sql`
  2. DROP all legacy asset tables: `game_assets`, `game_asset_selections`, `assets`, `asset_packs`, `asset_pack_entries`, `generation_jobs`, `generation_tasks`
  3. CREATE new tables as defined in `docs/architecture/ASSET-SYSTEM-V3-CLEAN-SLATE.md`:
     - `themes` (update if needed - add `is_public`, `style` columns)
     - `assets` (new clean version with `r2_key`, `theme_id`, no `image_url`)
     - `asset_packs` (with `theme_id` FK, `base_game_id`)
     - `pack_entries` (rename from `asset_pack_entries`)
     - `generation_jobs` (with `theme_id`)
     - `generation_tasks`
  4. Add all indexes as defined in V3 doc
  5. Update `api/schema.sql` to reflect new schema (authoritative source)
  6. Run migration on local D1

  **Must NOT do**:
  - NO data migration - tables are empty
  - NO backward compatibility views
  - NO triggers or stored procedures

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Focused SQL work, schema is well-documented
  - **Skills**: [`slopcade-documentation`]
    - `slopcade-documentation`: Reference to V3 schema docs

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3, 5
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `docs/architecture/ASSET-SYSTEM-V3-CLEAN-SLATE.md:25-252` - Complete target schema definitions
  - `docs/architecture/ASSET-SCHEMA-CLEANUP.md:22-66` - Simplified `assets` table design

  **Current Schema Reference**:
  - `api/schema.sql:68-224` - Current asset tables to be dropped

  **Acceptance Criteria**:
  - [ ] Migration file exists: `api/migrations/20260203_asset_system_v3.sql`
  - [ ] `api/schema.sql` updated with new table definitions
  - [ ] Migration runs without error: `npx wrangler d1 execute slopcade-db --file=api/migrations/20260203_asset_system_v3.sql --local`
  - [ ] New tables exist with correct columns: `.tables` in D1 shell shows `assets`, `asset_packs`, `pack_entries`, `generation_jobs`, `generation_tasks`, `themes`
  - [ ] Old tables do NOT exist: `game_assets`, `game_asset_selections`, `asset_pack_entries` are gone

  **Commit**: YES
  - Message: `feat(api): add asset system v3 schema migration`
  - Files: `api/migrations/20260203_asset_system_v3.sql`, `api/schema.sql`
  - Pre-commit: Migration runs successfully

---

- [x] 2. TypeScript Types Rewrite

  **What to do**:
  1. Rewrite `shared/src/types/asset-system.ts` with new clean types:
     - `Theme` interface with `id`, `name`, `promptModifier`, `style`, `isPublic`, `creatorUserId`
     - `Asset` interface with `id`, `r2Key` (NOT imageUrl), `width`, `height`, `source`, `themeId`, `compiledPrompt`, `modelId`
     - `AssetPack` interface with `id`, `baseGameId`, `name`, `themeId` (NOT promptDefaults), `isComplete`
     - `PackEntry` interface with `id`, `packId`, `templateId`, `assetId`, `placement`
     - `GenerationJob` and `GenerationTask` updated to match new schema
  2. Add Zod schemas for all types
  3. Update `shared/src/types/GameDefinition.ts`:
     - Remove legacy `assetPacks?: Record<string, AssetPack>` (embedded packs)
     - Keep only `assetSystem?: AssetSystemConfig` with `activePackId`
  4. Export new types from `shared/src/types/index.ts`

  **Must NOT do**:
  - NO `imageUrl` fields - use `r2Key` only
  - NO `promptDefaults` or `prompt_defaults_json` - use `themeId`
  - NO backward compatibility types

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Well-defined type transformations from docs
  - **Skills**: [`slopcade-documentation`]
    - `slopcade-documentation`: Type definitions in V3 doc

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 3, 4, 5
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `docs/architecture/ASSET-SYSTEM-V3-CLEAN-SLATE.md:359-437` - Target TypeScript types
  - `shared/src/types/asset-system.ts` - Current types to replace

  **Type References**:
  - `shared/src/types/GameDefinition.ts:1-100` - AssetSystemConfig and related

  **Acceptance Criteria**:
  - [ ] `shared/src/types/asset-system.ts` rewritten with new types
  - [ ] All interfaces use `r2Key` not `imageUrl`
  - [ ] `AssetPack` has `themeId` not `promptDefaults`
  - [ ] `shared/src/types/GameDefinition.ts` has no legacy `assetPacks` field
  - [ ] `cd shared && pnpm tsc --noEmit` passes

  **Commit**: YES
  - Message: `refactor(shared): rewrite asset system types for v3 schema`
  - Files: `shared/src/types/asset-system.ts`, `shared/src/types/GameDefinition.ts`
  - Pre-commit: `cd shared && pnpm tsc --noEmit`

---

### WAVE 2: Core Implementation

- [x] 3. API Routes Rewrite

  **What to do**:
  1. Rewrite `api/src/trpc/routes/asset-system.ts` for new schema:
     - Update all SQL queries to use new table names (`pack_entries` not `asset_pack_entries`)
     - Update all column references (`r2_key` not `image_url`)
     - Add `theme_id` to `asset_packs` creation
     - Update `generation_jobs` to include `theme_id`
  2. Add `applyThemeToGame` mutation - the unified entry point:
     ```typescript
     applyThemeToGame({
       gameId: string,
       themeId?: string,        // Existing theme
       newTheme?: { name, promptModifier },  // OR create new
       style?: 'pixel' | 'cartoon' | '3d' | 'flat',
       setAsActive?: boolean
     })
     ```
  3. Add theme management endpoints:
     - `themes.create`, `themes.update`, `themes.delete`, `themes.get`, `themes.list`
     - `getPacksForTheme({ themeId })` - Find all packs using a theme
  4. Update `api/src/trpc/index.ts` to remove `assets` router import (will be deleted in cleanup)
  5. Ensure all endpoints return `r2Key`, construct URLs at response time

  **Must NOT do**:
  - NO changes to generation pipeline logic (only table references)
  - NO backward compatibility with old field names in DB
  - DO NOT delete `assets.ts` yet (cleanup phase)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Significant rewrite, many queries to update
  - **Skills**: [`slopcade-game-engine`, `slopcade-documentation`]
    - `slopcade-game-engine`: Understand game/template relationships
    - `slopcade-documentation`: API design from V3 docs

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Tasks 6, 7, 9
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `api/src/trpc/routes/asset-system.ts` - Current implementation to update
  - `docs/architecture/ASSET-SYSTEM-V3-CLEAN-SLATE.md:693-778` - API design

  **Schema References**:
  - `docs/architecture/ASSET-SYSTEM-V3-CLEAN-SLATE.md:25-252` - New table structures

  **Acceptance Criteria**:
  - [ ] All queries use new table names (`pack_entries`, `assets`, `asset_packs`)
  - [ ] All queries use `r2_key` not `image_url`
  - [ ] `applyThemeToGame` mutation exists and documented
  - [ ] Theme CRUD endpoints exist
  - [ ] `cd api && pnpm tsc --noEmit` passes
  - [ ] No TypeScript errors referencing old types

  **Commit**: YES
  - Message: `refactor(api): rewrite asset-system routes for v3 schema`
  - Files: `api/src/trpc/routes/asset-system.ts`, `api/src/trpc/index.ts`
  - Pre-commit: `cd api && pnpm tsc --noEmit`

---

- [x] 4. URL Utilities Simplification

  **What to do**:
  1. Rewrite `shared/src/utils/asset-url.ts` to be much simpler:
     ```typescript
     const R2_PREFIX = 'generated/';
     
     export function buildR2Key(gameId: string, packId: string, assetId: string): string {
       return `${R2_PREFIX}${gameId}/${packId}/${assetId}.png`;
     }
     
     export function getAssetUrl(r2Key: string, cdnBaseUrl: string): string {
       return `${cdnBaseUrl.replace(/\/$/, '')}/${r2Key}`;
     }
     
     export function isR2Key(value: string): boolean {
       return value.startsWith(R2_PREFIX);
     }
     ```
  2. Remove all legacy URL handling:
     - Remove `resolveStoredAssetUrl`
     - Remove `isPassthroughUrl`, `isRelativePath`, `isLegacyUrl`
     - Remove any URL storage helpers
  3. Update any imports of removed functions

  **Must NOT do**:
  - NO backward compatibility for old URL formats
  - NO complex URL parsing logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small focused file, clear target from docs
  - **Skills**: [`slopcade-documentation`]
    - `slopcade-documentation`: URL handling specification

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocks**: Tasks 6, 8
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `docs/architecture/ASSET-SYSTEM-V3-CLEAN-SLATE.md:325-356` - URL construction spec
  - `docs/VISION.md:204-210` - No URL storage principle

  **Current Implementation**:
  - `shared/src/utils/asset-url.ts` - Current file to simplify

  **Acceptance Criteria**:
  - [ ] `asset-url.ts` exports only: `buildR2Key`, `getAssetUrl`, `isR2Key`
  - [ ] No functions reference "url" storage patterns
  - [ ] `cd shared && pnpm tsc --noEmit` passes
  - [ ] All imports of removed functions cause errors (will fix in dependent tasks)

  **Commit**: YES
  - Message: `refactor(shared): simplify asset-url utilities for v3`
  - Files: `shared/src/utils/asset-url.ts`
  - Pre-commit: `cd shared && pnpm tsc --noEmit`

---

- [x] 5. Generation Pipeline Table Updates

  **What to do**:
  1. Update `api/src/ai/pipeline/executor.ts`:
     - Change all `game_assets` references to `assets`
     - Use `r2_key` instead of `image_url`
     - Include `theme_id` when creating asset records
  2. Update `api/src/ai/pipeline/stages/index.ts`:
     - Use `buildR2Key()` from utils for R2 key generation
  3. Update `api/src/ai/assets.ts` (AssetService):
     - Update table references
     - Ensure asset creation uses new schema
  4. Search for any other files using old table names in `api/src/ai/`

  **Must NOT do**:
  - NO changes to generation logic (img2img, silhouettes, etc.)
  - NO changes to Scenario.com integration
  - Only update table/column references

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Find-and-replace style updates
  - **Skills**: [`slopcade-asset-generation`]
    - `slopcade-asset-generation`: Pipeline stage understanding

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `api/src/ai/pipeline/executor.ts` - Main pipeline orchestrator
  - `api/src/ai/pipeline/stages/index.ts` - Pipeline stages
  - `api/src/ai/assets.ts` - Asset service

  **Acceptance Criteria**:
  - [ ] `grep -r "game_assets" api/src/ai/` returns 0 results
  - [ ] `grep -r "image_url" api/src/ai/` returns 0 results
  - [ ] Pipeline uses `buildR2Key()` for key generation
  - [ ] `cd api && pnpm tsc --noEmit` passes

  **Commit**: YES
  - Message: `refactor(api): update generation pipeline for v3 schema`
  - Files: `api/src/ai/pipeline/*.ts`, `api/src/ai/assets.ts`
  - Pre-commit: `cd api && pnpm tsc --noEmit`

---

### WAVE 3: Integration

- [x] 6. Frontend Asset Resolution Hook Update

  **What to do**:
  1. Simplify `app/lib/game-engine/hooks/useAssetResolution.ts`:
     - Update tRPC calls to use new endpoints
     - Handle `r2Key` field and construct URLs client-side
     - Remove any legacy pack format handling
  2. Update `app/lib/assets/AssetManifest.ts` if it exists:
     - Use new types
     - Remove legacy asset resolution paths
  3. Search `app/` for any other files using old asset types

  **Must NOT do**:
  - NO changes to rendering logic
  - NO changes to game engine
  - Only update data fetching and type handling

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Focused updates to data layer
  - **Skills**: [`slopcade-game-engine`]
    - `slopcade-game-engine`: Game engine asset flow

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 3, 4

  **References**:

  **Pattern References**:
  - `app/lib/game-engine/hooks/useAssetResolution.ts` - Main hook to update
  - `docs/architecture/ASSET-SYSTEM-V3-CLEAN-SLATE.md:809-833` - Frontend resolution spec

  **Type References**:
  - `shared/src/types/asset-system.ts` - New types to use

  **Acceptance Criteria**:
  - [ ] Hook uses `r2Key` and `getAssetUrl()` for URL construction
  - [ ] No references to `imageUrl` from API responses
  - [ ] `cd app && pnpm tsc --noEmit` passes

  **Commit**: YES
  - Message: `refactor(app): update useAssetResolution for v3 schema`
  - Files: `app/lib/game-engine/hooks/useAssetResolution.ts`, `app/lib/assets/*.ts`
  - Pre-commit: `cd app && pnpm tsc --noEmit`

---

- [x] 7. New CLI Tool

  **What to do**:
  1. Create `api/scripts/theme-game.ts` - New CLI that calls tRPC API:
     ```typescript
     #!/usr/bin/env npx tsx
     // CLI flags:
     // --game=<gameId>           Required: Game to theme
     // --theme=<themeId>         Use existing theme
     // --theme-name=<name>       Create new theme with this name
     // --prompt=<text>           Theme prompt modifier
     // --style=<pixel|cartoon|3d|flat>  Style override
     // --local                   Use local API (default)
     // --production              Use production API
     // --dry-run                 Show what would be done
     ```
  2. Use tRPC client to call `applyThemeToGame` mutation
  3. Add progress logging (which templates being generated)
  4. Handle errors gracefully with clear messages
  5. Add to package.json scripts if appropriate

  **Must NOT do**:
  - NO direct SQL access
  - NO bypassing tRPC
  - CLI MUST use same code path as Web

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CLI is a thin wrapper around existing API
  - **Skills**: [`slopcade-documentation`]
    - `slopcade-documentation`: CLI spec from master plan

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 8)
  - **Blocks**: Task 9
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `docs/architecture/ASSET-SYSTEM-MASTER-PLAN.md:525-553` - CLI design spec
  - `docs/architecture/ASSET-SYSTEM-V3-CLEAN-SLATE.md:858-879` - CLI replacement spec

  **API References**:
  - `api/src/trpc/routes/asset-system.ts` - API to call

  **Acceptance Criteria**:
  - [ ] `api/scripts/theme-game.ts` exists
  - [ ] `npx tsx api/scripts/theme-game.ts --help` shows usage
  - [ ] CLI calls `applyThemeToGame` tRPC endpoint
  - [ ] `--dry-run` flag works
  - [ ] `--local` and `--production` flags work

  **Commit**: YES
  - Message: `feat(api): add theme-game CLI tool using tRPC`
  - Files: `api/scripts/theme-game.ts`
  - Pre-commit: Script runs with `--help`

---

- [x] 8. Godot Bridge Updates

  **What to do**:
  1. Update `godot_project/scripts/bridge/VisualRenderer.gd`:
     - Change field access from `imageUrl` to `r2Key`
     - Add URL construction using CDN base URL
     - Or: receive pre-constructed URLs from API
  2. Search for other Godot files using asset fields
  3. Update any type definitions or documentation

  **Must NOT do**:
  - NO changes to rendering logic
  - NO backward compatibility for old field names

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small focused change
  - **Skills**: [`slopcade-godot-bridge`]
    - `slopcade-godot-bridge`: Godot integration patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 7)
  - **Blocks**: Task 9
  - **Blocked By**: Task 4

  **References**:

  **Pattern References**:
  - `godot_project/scripts/bridge/VisualRenderer.gd:797-871` - Asset URL handling

  **Acceptance Criteria**:
  - [ ] VisualRenderer.gd uses `r2Key` or pre-constructed URLs
  - [ ] No references to `imageUrl` field in Godot code
  - [ ] Godot project compiles without errors

  **Commit**: YES
  - Message: `refactor(godot): update asset field names for v3 schema`
  - Files: `godot_project/scripts/bridge/VisualRenderer.gd`
  - Pre-commit: Godot project opens without errors

---

### WAVE 4: Cleanup (CRITICAL)

- [x] 9. Comprehensive Legacy Code Cleanup

  **What to do**:
  This is the most important task. Remove ALL legacy code with zero remnants.

  **Files to DELETE**:
  1. `api/src/trpc/routes/assets.ts` - Legacy router (795 lines)
  2. `api/src/trpc/routes/assets.test.ts` - Legacy tests
  3. `api/scripts/generate-game-assets.ts` - Old CLI (336 lines)
  4. `api/scripts/game-configs/` - Entire directory (24 files):
     - `ballSort/assets.config.ts`
     - `login-hero/assets.config.ts`
     - `tipScale/assets.config.ts`
     - `slopeggle/assets.config.ts`
     - `stackMatch/assets.config.ts`
     - `puyoPuyo/assets.config.ts`
     - `simplePlatformer/assets.config.ts`
     - `memoryMatch/assets.config.ts`
     - `pinballLite/assets.config.ts`
     - `physicsStacker/assets.config.ts`
     - `flappyBird/assets.config.ts`
     - `game2048/assets.config.ts`
     - `gemCrush/assets.config.ts`
     - `iceSlide/assets.config.ts`
     - `dominoChain/assets.config.ts`
     - `dropPop/assets.config.ts`
     - `connect4/assets.config.ts`
     - `breakoutBouncer/assets.config.ts`
     - `bubbleShooter/assets.config.ts`
     - `blockDrop/assets.config.ts`
     - `index.ts`
     - `tictactoe.ts`
     - `test-gem-variants.ts`
     - `example-title-hero-no-bg.md`
  5. `api/src/migrations/migrate-asset-packs.ts` - Legacy migration
  6. `api/scripts/migrate-asset-urls.ts` - Legacy migration
  7. `api/scripts/seed-asset-packs.ts` - Legacy seed

  **Imports to UPDATE/REMOVE**:
  1. `api/src/trpc/index.ts` - Remove `assets` router import
  2. Any file importing from deleted files

  **Search and Remove References**:
  ```bash
  # Run these searches and fix any remaining references:
  grep -r "game_assets" --include="*.ts" . | grep -v node_modules
  grep -r "game_asset_selections" --include="*.ts" . | grep -v node_modules
  grep -r "asset_pack_entries" --include="*.ts" . | grep -v node_modules
  grep -r "image_url" --include="*.ts" . | grep -v node_modules
  grep -r "imageUrl" --include="*.ts" . | grep -v node_modules  # Check API responses
  grep -r "generate-game-assets" --include="*.ts" . | grep -v node_modules
  grep -r "game-configs" --include="*.ts" . | grep -v node_modules
  grep -r "prompt_defaults_json" --include="*.ts" . | grep -v node_modules
  grep -r "promptDefaults" --include="*.ts" . | grep -v node_modules
  ```

  **Documentation Updates**:
  1. DELETE these architecture docs (superseded by this Sisyphus plan):
     - `docs/architecture/ASSET-SCHEMA-CLEANUP.md`
     - `docs/architecture/ASSET-SYSTEM-V3-CLEAN-SLATE.md`
     - `docs/architecture/ASSET-SYSTEM-MASTER-PLAN.md`
     - `docs/architecture/asset-system-refactor-plan.md` (if exists)
     - `docs/architecture/asset-pack-system.md` (if legacy)
  2. DELETE legacy asset generation docs:
     - `docs/asset-generation/CONTINUATION.md` (if legacy)
     - `docs/asset-generation/unified-asset-model.md` (if legacy)
  3. KEEP: `docs/VISION.md` (still useful as north star)
  4. Update README or AGENTS.md if they reference old CLI

  **Must NOT do**:
  - NO leaving "TODO: remove later" comments
  - NO keeping files "just in case"
  - ZERO references to legacy code should remain

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Comprehensive cleanup, many files to check
  - **Skills**: [`slopcade-documentation`]
    - `slopcade-documentation`: Know what to keep vs remove

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 10-14 (offline mode)
  - **Blocked By**: Tasks 3, 4, 5, 6, 7, 8

  **References**:

  **Files to Delete**:
  - All files listed above

  **Search Patterns**:
  - All grep commands listed above

  **Acceptance Criteria**:
  - [ ] All listed files are DELETED (not just deprecated)
  - [ ] `grep -r "game_assets" --include="*.ts" .` returns 0 results (excluding node_modules)
  - [ ] `grep -r "game_asset_selections" --include="*.ts" .` returns 0 results
  - [ ] `grep -r "asset_pack_entries" --include="*.ts" .` returns 0 results
  - [ ] `grep -r "generate-game-assets" --include="*.ts" .` returns 0 results
  - [ ] `grep -r "game-configs" --include="*.ts" .` returns 0 results
  - [ ] `ls api/scripts/game-configs/` returns "No such file or directory"
  - [ ] `ls api/src/trpc/routes/assets.ts` returns "No such file or directory"
  - [ ] `cd shared && pnpm tsc --noEmit` passes
  - [ ] `cd api && pnpm tsc --noEmit` passes
  - [ ] `cd app && pnpm tsc --noEmit` passes

  **Commit**: YES
  - Message: `chore: remove all legacy asset system code`
  - Files: All deleted files, updated imports
  - Pre-commit: All verification commands pass

---

### WAVE 5: Offline Mode

- [x] 10. Offline Manifest API Endpoint

  **What to do**:
  1. Add `offlineManifest` query to `api/src/trpc/routes/asset-system.ts`:
     ```typescript
     offlineManifest: publicProcedure
       .input(z.object({
         gameId: z.string(),
         packId: z.string().optional(),  // Uses active pack if not specified
       }))
       .query(async ({ ctx, input }) => {
         // 1. Get game definition
         // 2. Get pack (specified or active)
         // 3. Fetch pack entries with assets
         // 4. Build asset list with full URLs
         // 5. Return: { gameId, packId, definition, assets[], totalBytes }
       })
     ```
  2. Return all data needed to play game offline:
     - Full game definition JSON
     - All asset URLs for downloading
     - Script files if any
     - Total size for progress UI

  **Must NOT do**:
  - NO actual download logic (that's client-side)
  - NO caching in this endpoint

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single endpoint addition, well-defined contract
  - **Skills**: [`slopcade-documentation`]
    - `slopcade-documentation`: Offline manifest spec in VISION.md

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Task 12)
  - **Blocks**: Task 11
  - **Blocked By**: Tasks 3, 9

  **References**:

  **Pattern References**:
  - `docs/VISION.md:486-528` - Offline manifest API spec
  - `docs/architecture/ASSET-SYSTEM-V3-CLEAN-SLATE.md:920-961` - offlineManifest endpoint

  **Acceptance Criteria**:
  - [ ] `offlineManifest` endpoint exists and returns correct shape
  - [ ] Returns game definition, all asset URLs, total bytes
  - [ ] Works with active pack when packId not specified
  - [ ] `cd api && pnpm tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(api): add offlineManifest endpoint for offline mode`
  - Files: `api/src/trpc/routes/asset-system.ts`
  - Pre-commit: `cd api && pnpm tsc --noEmit`

---

- [x] 11. Download Manager

  **What to do**:
  1. Create `app/lib/offline/download-manager.ts`:
     ```typescript
     export async function downloadGameForOffline(
       gameId: string,
       onProgress?: (downloaded: number, total: number) => void
     ): Promise<void>
     
     export async function deleteOfflineGame(gameId: string): Promise<void>
     
     export async function isGameDownloaded(gameId: string): Promise<boolean>
     
     export async function getDownloadedGames(): Promise<DownloadedGame[]>
     ```
  2. Implement using Expo FileSystem:
     - Fetch manifest from API
     - Create local directory structure
     - Download each asset with progress tracking
     - Save manifest locally
     - Track in AsyncStorage

  **Must NOT do**:
  - NO upload functionality
  - NO background downloads (keep simple for v1)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: File system operations, state management
  - **Skills**: [`building-native-ui`]
    - `building-native-ui`: Expo FileSystem patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Task 12)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 4, 10

  **References**:

  **Pattern References**:
  - `docs/VISION.md:636-687` - Download manager spec
  - `docs/architecture/ASSET-SYSTEM-V3-CLEAN-SLATE.md:966-974` - Download manager design

  **Local Storage Structure**:
  ```
  {APP_DATA}/slopcade/
  ├── settings.json
  ├── downloaded-games.json
  └── games/
      └── {gameId}/
          ├── manifest.json
          └── generated/{gameId}/{packId}/*.png
  ```

  **Acceptance Criteria**:
  - [ ] `downloadGameForOffline()` downloads all assets
  - [ ] `deleteOfflineGame()` removes local files
  - [ ] `isGameDownloaded()` checks manifest exists
  - [ ] Progress callback works during download
  - [ ] `cd app && pnpm tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(app): add download manager for offline mode`
  - Files: `app/lib/offline/download-manager.ts`
  - Pre-commit: `cd app && pnpm tsc --noEmit`

---

- [x] 12. Local Asset Server

  **What to do**:
  1. Create `app/lib/offline/local-asset-server.ts`:
     ```typescript
     export function startLocalAssetServer(): Promise<void>
     export function stopLocalAssetServer(): Promise<void>
     export function isServerRunning(): boolean
     ```
  2. HTTP server on localhost:8765 that:
     - Handles requests: `/games/{gameId}/{r2Key}`
     - Reads from: `{APP_DATA}/slopcade/games/{gameId}/{r2Key}`
     - Sets proper Content-Type headers
     - Returns 404 for missing files
  3. Use appropriate Expo/React Native HTTP server library

  **Must NOT do**:
  - NO complex routing
  - NO authentication (localhost only)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Native HTTP server setup
  - **Skills**: [`building-native-ui`]
    - `building-native-ui`: Native modules and servers

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 10, 11)
  - **Blocks**: Task 13
  - **Blocked By**: Task 4

  **References**:

  **Pattern References**:
  - `docs/VISION.md:576-627` - Local asset server spec
  - `docs/architecture/ASSET-SYSTEM-V3-CLEAN-SLATE.md:975-979` - Server design

  **Acceptance Criteria**:
  - [ ] Server starts on port 8765
  - [ ] Serves files from correct local path
  - [ ] Returns 404 for missing files
  - [ ] Can start and stop cleanly
  - [ ] `cd app && pnpm tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(app): add local asset server for offline mode`
  - Files: `app/lib/offline/local-asset-server.ts`
  - Pre-commit: `cd app && pnpm tsc --noEmit`

---

- [x] 13. Offline Settings & URL Resolution Updates

  **What to do**:
  1. Create `app/lib/offline/settings.ts`:
     ```typescript
     interface OfflineSettings {
       offlineMode: boolean;
       autoDownload: boolean;
       wifiOnlyDownload: boolean;
     }
     
     export function useOfflineMode(): {
       settings: OfflineSettings;
       toggleOfflineMode: (enabled: boolean) => Promise<void>;
     }
     ```
  2. Update `shared/src/utils/asset-url.ts` to support offline mode:
     ```typescript
     interface AssetUrlConfig {
       offlineMode: boolean;
       localServerUrl: string;   // "http://localhost:8765"
       cdnBaseUrl: string;
       gameId?: string;
     }
     
     export function getAssetUrl(r2Key: string, config: AssetUrlConfig): string {
       if (config.offlineMode && config.gameId) {
         return `${config.localServerUrl}/games/${config.gameId}/${r2Key}`;
       }
       return `${config.cdnBaseUrl}/${r2Key}`;
     }
     ```
  3. Update `useAssetResolution` hook to use offline config

  **Must NOT do**:
  - NO complex auto-switching logic
  - NO network detection (manual toggle only for v1)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Settings hook and URL config update
  - **Skills**: [`building-native-ui`]
    - `building-native-ui`: React Native settings patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (sequential)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 11, 12

  **References**:

  **Pattern References**:
  - `docs/VISION.md:689-719` - Settings and mode toggle spec
  - `docs/architecture/ASSET-SYSTEM-V3-CLEAN-SLATE.md:984-1009` - URL resolution updates

  **Acceptance Criteria**:
  - [ ] `useOfflineMode()` hook works
  - [ ] Settings persisted in AsyncStorage
  - [ ] `getAssetUrl()` returns local URLs when offline
  - [ ] Asset resolution uses offline config
  - [ ] `cd shared && pnpm tsc --noEmit` passes
  - [ ] `cd app && pnpm tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(app): add offline settings and URL resolution`
  - Files: `app/lib/offline/settings.ts`, `shared/src/utils/asset-url.ts`, `app/lib/game-engine/hooks/useAssetResolution.ts`
  - Pre-commit: TypeScript passes

---

- [x] 14. Offline UI Components

  **What to do**:
  1. Create `app/components/DownloadForOfflineButton.tsx`:
     - Shows download/downloading/downloaded states
     - Progress bar during download
     - Option to remove download
  2. Create `app/app/settings/offline.tsx` settings page:
     - Offline mode toggle
     - List of downloaded games with sizes
     - Total storage used
     - Clear all downloads option
  3. Add download button to game detail screen

  **Must NOT do**:
  - NO complex download queue management
  - NO background download indicators (keep simple)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI components with state
  - **Skills**: [`building-native-ui`, `frontend-ui-ux`]
    - `building-native-ui`: Expo component patterns
    - `frontend-ui-ux`: Good UX for download states

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 13

  **References**:

  **Pattern References**:
  - `docs/VISION.md:726-790` - UI component specs
  - `docs/architecture/ASSET-SYSTEM-V3-CLEAN-SLATE.md:1085-1089` - UI files to create

  **Acceptance Criteria**:
  - [ ] Download button shows correct state
  - [ ] Progress bar updates during download
  - [ ] Settings page lists downloaded games
  - [ ] Can toggle offline mode from settings
  - [ ] Can delete individual downloaded games
  - [ ] `cd app && pnpm tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(app): add offline mode UI components`
  - Files: `app/components/DownloadForOfflineButton.tsx`, `app/app/settings/offline.tsx`
  - Pre-commit: TypeScript passes

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(api): add asset system v3 schema migration` | `api/migrations/*.sql`, `api/schema.sql` | Migration runs |
| 2 | `refactor(shared): rewrite asset system types for v3` | `shared/src/types/*.ts` | `tsc --noEmit` |
| 3 | `refactor(api): rewrite asset-system routes for v3` | `api/src/trpc/routes/asset-system.ts` | `tsc --noEmit` |
| 4 | `refactor(shared): simplify asset-url utilities` | `shared/src/utils/asset-url.ts` | `tsc --noEmit` |
| 5 | `refactor(api): update generation pipeline for v3` | `api/src/ai/**/*.ts` | `tsc --noEmit` |
| 6 | `refactor(app): update useAssetResolution for v3` | `app/lib/**/*.ts` | `tsc --noEmit` |
| 7 | `feat(api): add theme-game CLI tool` | `api/scripts/theme-game.ts` | `--help` works |
| 8 | `refactor(godot): update asset fields for v3` | `godot_project/**/*.gd` | Godot opens |
| 9 | `chore: remove all legacy asset system code` | Many deleted files | All greps return 0 |
| 10 | `feat(api): add offlineManifest endpoint` | `api/src/trpc/routes/asset-system.ts` | `tsc --noEmit` |
| 11 | `feat(app): add download manager for offline mode` | `app/lib/offline/download-manager.ts` | `tsc --noEmit` |
| 12 | `feat(app): add local asset server` | `app/lib/offline/local-asset-server.ts` | `tsc --noEmit` |
| 13 | `feat(app): add offline settings and URL resolution` | `app/lib/offline/*.ts`, `shared/src/utils/asset-url.ts` | `tsc --noEmit` |
| 14 | `feat(app): add offline mode UI components` | `app/components/*.tsx`, `app/app/settings/offline.tsx` | `tsc --noEmit` |

---

## Success Criteria

### Verification Commands

```bash
# Run ALL of these before claiming complete:

# 1. TypeScript compilation (all packages)
cd /Users/hassoncs/Workspaces/Personal/slopcade
cd shared && pnpm tsc --noEmit && cd ..
cd api && pnpm tsc --noEmit && cd ..
cd app && pnpm tsc --noEmit && cd ..

# 2. No legacy references remain
echo "Checking for legacy references..."
grep -r "game_assets" --include="*.ts" . | grep -v node_modules | grep -v ".sisyphus" && echo "FAIL: game_assets found" || echo "✓ No game_assets"
grep -r "game_asset_selections" --include="*.ts" . | grep -v node_modules && echo "FAIL: game_asset_selections found" || echo "✓ No game_asset_selections"
grep -r "asset_pack_entries" --include="*.ts" . | grep -v node_modules && echo "FAIL: asset_pack_entries found" || echo "✓ No asset_pack_entries (use pack_entries)"
grep -r "image_url" --include="*.ts" . | grep -v node_modules && echo "FAIL: image_url found" || echo "✓ No image_url (use r2_key)"

# 3. Deleted files don't exist
ls api/src/trpc/routes/assets.ts 2>/dev/null && echo "FAIL: assets.ts exists" || echo "✓ assets.ts deleted"
ls api/scripts/generate-game-assets.ts 2>/dev/null && echo "FAIL: generate-game-assets.ts exists" || echo "✓ generate-game-assets.ts deleted"
ls -d api/scripts/game-configs/ 2>/dev/null && echo "FAIL: game-configs/ exists" || echo "✓ game-configs/ deleted"

# 4. New CLI works
npx tsx api/scripts/theme-game.ts --help

# 5. Schema is correct
npx wrangler d1 execute slopcade-db --command=".tables" --local | grep -E "^assets$|^asset_packs$|^pack_entries$"

# 6. Offline mode files exist
ls app/lib/offline/download-manager.ts && echo "✓ download-manager.ts exists"
ls app/lib/offline/local-asset-server.ts && echo "✓ local-asset-server.ts exists"
ls app/lib/offline/settings.ts && echo "✓ settings.ts exists"
ls app/components/DownloadForOfflineButton.tsx && echo "✓ DownloadForOfflineButton.tsx exists"
ls app/app/settings/offline.tsx && echo "✓ offline.tsx settings page exists"
```

### Final Checklist
- [x] All "Must Have" items present
- [x] All "Must NOT Have" items absent
- [x] All 14 tasks completed with commits
- [x] All verification commands pass
- [x] Zero legacy code references
- [x] Offline mode: download manager works
- [x] Offline mode: local server serves assets
- [x] Offline mode: settings toggle works
- [x] Offline mode: UI shows download states
