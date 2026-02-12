## 2026-02-12 Session: ses_3b0885bdcffeusVhL9FWts9ftQ - Initial Setup

### Architecture Patterns
- Games in D1 have lineage via `base_game_id` (root of fork tree) and `forked_from_id` (immediate parent)
- Asset packs are keyed by `base_game_id` and shared across fork lineage
- `pack_entries` maps template_id -> asset_id with optional placement_json
- Asset packs have UNIQUE constraint: `(base_game_id, name)`
- Game files stored in R2 at `games/{gameId}/` prefix
- Workspace files at `games/{gameId}/workspace/` (manifest, constants, prefabs, entities, rules, scripts, assets)
- `definition.json` is the compiled bundle artifact

### Existing Variable/Tuning System
- `VariableWithTuning` in shared/src/types/GameDefinition.ts: value + tuning {min,max,step} + category + label
- Type guard: `isVariableWithTuning()`, `isTunable()`, `getValue()`, `getLabel()`
- Zod schemas exist in shared/src/expressions/schema-helpers.ts
- TuningPanel auto-renders sliders from tuning metadata
- Overrides persisted to localStorage per game

### Convention: Schema/Type Location
- Shared types: `shared/src/types/*.ts`
- Zod schemas: `shared/src/types/schemas.ts` and `shared/src/expressions/schema-helpers.ts`
- API row types: `api/src/trpc/routes/asset-system/types.ts`
- Router composition: `api/src/trpc/routes/asset-system/index.ts` uses mergeRouters pattern

### Fork Mutation Current Behavior
- Copies only `definition.json` to new R2 prefix
- Creates new game row with `forked_from_id` and `base_game_id` = parent's base_game_id ?? parent's id
- Does NOT copy workspace files

## 2026-02-11 Wave 1: Remix Contracts & Validation

### Remix Type Decisions
- `RemixOverridesSchema` uses `.strict()` to reject unknown fields (blocks `constants` at parse level)
- Override buckets: `variables`, `assets`, `shaderParams`, `sounds` — all optional
- v1 guardrail: no `constants` field, no composition fields (`parentRemixId`, `layerOrder`)
- Variable override values restricted to `number | boolean | string` (no Vec2 or expressions for v1)
- Asset overrides require both `templateId` and `assetUrl` (mandatory pair)

### Validation Pattern
- `validateVariableOverrides()` returns `{ valid, errors[] }` — callers decide severity
- Tuning bounds only enforced for numeric overrides on `VariableWithTuning` with `tuning` config
- Variables without tuning metadata: any value accepted (no bounds to check)
- Non-existent variable keys are rejected as errors (catches typos)

### Apply Pattern
- `applyVariableOverrides()` preserves full `VariableWithTuning` metadata, only replaces `.value`
- Primitive game variables get replaced entirely
- Non-existent override keys are silently ignored (no-op)
- Does not mutate input — returns new object

### Testing
- vitest in this repo uses `npx vitest run <path>` (no `--filter` flag in v2.1.9)
- Test file at `shared/src/types/__tests__/remix.test.ts` — 28 tests covering schemas + validation + apply

## 2026-02-11 Wave 1: WorkspaceCopyService (Fork Deep Copy)

### Implementation
- `WorkspaceCopyService` at `api/src/services/WorkspaceCopyService.ts` — standalone service for R2 workspace deep copy
- Takes R2 bucket, sourcePrefix, destPrefix, metadataOverrides (id, title)
- Uses `list()` with pagination to discover all files under `{prefix}/workspace/`
- Copies each file via `get()` + `put()`, preserving `httpMetadata` (contentType)
- Updates `slopcade.json` (workspace manifest) with new id/title if metadataOverrides provided
- Returns `{ copiedFiles, updatedFiles, skipped }` — skipped=true when source has no workspace

### Fork Mutation Integration
- `WorkspaceCopyService.copyWorkspace()` called after definition.json and metadata.json writes
- Graceful fallback: if source has no workspace (legacy games), skipped=true and fork proceeds as before
- Lineage tracking unchanged: `base_game_id` and `forked_from_id` behavior preserved
- Workspace manifest file is `slopcade.json` (not `manifest.json` as initially assumed from task spec)

### Testing Patterns
- Service-level tests use `vi.fn()` mocks with in-memory Map store (not cloudflare:test bindings)
- Follows `PackageCompiler.test.ts` pattern — mock R2 methods directly
- `bun test` works for running individual test files (faster than vitest)

## 2026-02-11 Wave 1: Migration Scaffolding (Packs → Remixes)

### Schema
- `remixes` table added to `api/schema.sql` alongside existing `asset_packs` and `pack_entries` (no drops)
- Follows D1 conventions: TEXT PRIMARY KEY, INTEGER timestamps (epoch ms), INTEGER booleans (0/1), `deleted_at` for soft delete
- UNIQUE(base_game_id, name) matches asset_packs constraint
- Indexes: `idx_remixes_base_game`, `idx_remixes_creator`, `idx_remixes_theme` — all with `WHERE deleted_at IS NULL`
- JSON columns: `variable_overrides_json`, `asset_overrides_json`, `shader_param_overrides_json`, `sound_overrides_json`
- Additional remix-only fields: `theme_prompt`, `style`, `thumbnail_url`

### Migration Script
- `api/scripts/migrate-packs-to-remixes.ts` — exports pure transformation functions for testability
- Idempotency: uses pack.id as remix.id — re-running skips packs whose ID already exists in remixes
- Soft-deleted packs are skipped during migration
- `asset_overrides_json` format: `Record<templateId, { assetId, assetUrl, placement? }>`
- `assetUrl` stores r2_key directly (runtime resolves to full URL via ASSET_HOST)
- Placement defaults: `{ scale: 1, offsetX: 0, offsetY: 0 }` when partially present
- Malformed `placement_json` is gracefully skipped (empty catch — intentional for migration safety)
- `D1Like` interface abstracts database access for testability without real D1

### Testing
- Tests at `api/scripts/__tests__/migrate-packs-to-remixes.test.ts` — 18 tests, all pure unit tests
- `bun test api/scripts/__tests__/migrate-packs-to-remixes.test.ts` works (vitest.node.config only covers src/)
- Direct execution guard prevents `process.exit(0)` from killing test runner when importing the module
- Test helpers: `makePack()` and `makeEntry()` factory functions with sensible defaults

## 2026-02-11 Wave 2: Remix API + Compatibility Layer (Task 3)

### Schema Fix
- `AssetOverrideSchema` changed from `{ templateId, assetUrl }` to `{ assetId, assetUrl }` — templateId is the record key, assetId is the actual asset reference
- All 28 shared schema tests updated and passing

### Router Architecture
- Remix router at `api/src/trpc/routes/asset-system/remixes.ts` — 6 endpoints: getRemix, listRemixes, createRemix, updateRemix, deleteRemix, getResolvedRemix
- Registered as nested router: `assetSystem.remixes.*` (unlike packs which are flat on `assetSystem.*`)
- Auth pattern: query `base_game_id` from remix row, then check `games.user_id` matches `ctx.user.id`
- UNIQUE(base_game_id, name) constraint handled gracefully with CONFLICT error code

### Helpers
- `parseAssetOverrides(json, assetHost)` — parses `Record<templateId, { assetId, assetUrl, placement? }>` and resolves R2 keys to full URLs
- `toClientRemix(row, assetHost)` — transforms RemixRow to client shape, parsing all JSON columns

### Testing
- 18 tests at `api/src/trpc/routes/asset-system/__tests__/remixes.test.ts`
- Tests verify lineage scoping (remix created on base game visible from forked game)
- Tests verify owner-only mutations (update/delete)
- Tests verify duplicate name conflict handling
- D1 test pattern: inline schema in test file, `env` from `cloudflare:test`, `appRouter.createCaller(ctx)`

### Compatibility
- Legacy `asset-packs.ts` completely untouched — both systems coexist
- Pack routes remain flat on `assetSystem.*`, remix routes nested under `assetSystem.remixes.*`

## 2026-02-11 Task 5: Runtime Remix Apply Layer in Play Flow

### Key Decisions
- `remixId` query param added alongside `packId` — when `remixId` present, it takes precedence
- Pack loading effect has `if (remixId) return;` guard — clean separation, no pack loading when remix active
- Variable overrides applied in `enrichedDefinition` memo via `applyVariableOverrides` before `mergeAssetsIntoPrefabs`
- Remix loading uses cancel pattern (`let cancelled = false`) for safe cleanup on unmount/param change

### API Types Issue
- `@slopcade/api/trpc` resolves types from `api/dist-types/` (build artifacts, not source!)
- `ParsedAssetOverride` was not exported from utils.ts — caused `build:types` to fail
- Fix: export the interface, then `pnpm build:types` in api/ to regenerate declarations
- The `ResolvedPackEntry.placement` requires all fields `{ scale, offsetX, offsetY }` — API returns optional fields, must default

### Preload Integration
- Added `isLoadingRemix` to the preload trigger effect deps — prevents premature preloading before remix data arrives
- Remix asset entries use same `ResolvedPackEntry` format as pack entries — no new types needed
