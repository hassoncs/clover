# Learnings — template-content-name-unification

## 2026-02-26 Atlas: Initial Codebase Survey

### Canonical ContentType source
- `shared/src/schema/party-content.ts` — `CONTENT_TYPES` array (15 values):
  quip, trivia, drawing, dilemma, wyr, estimation, fibbage, caption, wordgame, wordlist, personal, FakeWord, ranking, headsup, chroma
- NO `wager` or `history` in canonical list — these are legacy-only

### Duplicate ContentType (T6 target)
- `api/src/party/content/prompt-loader.ts` lines 25-40 — shadow `ContentType` union that DUPLICATES shared schema
- Must be removed and replaced with import from `shared/src/schema/party-content.ts`

### Template Registry (20 templates)
- `api/src/party/templates/registry.ts` — 20 template IDs
- Folder `r2/games/party/headsUp/` vs registry key `heads-up` — casing drift (T9 note)

### Legacy Naming Hotspots
1. `LEGACY_BRAND_GAME_TYPES` in:
   - `api/src/party/content-generation/prompts.ts` (lines 14, 103, 144)
   - `packages/content-pipeline/src/generate/prompts.ts` (lines 14, 103, 144)
   - Maps: amen-trivia, amen-quip, amen-fibbage, amen-drawing, amen-history, amen-ranking, amen-dilemma, amen-headsup, amen-wager
2. `FILENAME_TO_CONTENT_TYPE` in `api/src/trpc/routes/party-content.ts` (lines 57-61)
   - Contains: `wager: "estimation"`, `"amen-wager": "estimation"`, `"amen-chroma": "chroma"`
3. `storageGameType` in:
   - `packages/content-pipeline/src/commands/generate.ts`
   - `packages/content-pipeline/src/generate/prompts.ts`
   - `api/src/party/content-generation/prompts.ts`
   - Pattern: `brandId === DEFAULT_BRAND_ID ? requestedGameType : \`${brandId}-${requestedGameType}\``
4. `amen-` prefix stripping in 4 files:
   - `api/src/trpc/routes/party-content.ts` line 74
   - `api/scripts/import-content-packs.ts` line 62
   - `api/scripts/seed-party-content.ts` line 45
   - `api/scripts/sync-party-content.ts` line 109
5. `wager` references in:
   - `api/src/party/content-generation/prompts.ts` — `"amen-wager": { brandId: "amen", gameType: "wager" }`
   - `api/src/party/content-generation/brand-content-config.ts` — `wager:` config key
   - `api/src/party/content-generation/brands.ts` — `wager:` category map
   - `api/src/party/content/audio/readable-text.ts` — `case "wager":`
   - `api/src/party/content-generation/base-configs.ts` — `wager:` config key
   - `api/src/trpc/routes/party-content.ts` — alias `wager: "estimation"`, `case "wager":`
6. `history` references:
   - `api/src/party/content-generation/prompts.ts` — `"amen-history": { brandId: "amen", gameType: "history" }`
   - `packages/content-pipeline/src/brands/amen.ts` — `history` and `wager` categories

### Template contentPacks — Non-Canonical
- `r2/games/party/year-jinx/manifest.json` — `contentPacks: ["wager"]` → must become `["estimation"]`
- All other manifests appear to use canonical names
- Empty packs (intentional): `rival-roster`, `shirt-clash`

### DB Schema
- `party_content.content_type` column — text, no DB-level constraint in Drizzle schema
- BUT: `api/migrations/20260219_add_wager_history_content_types.sql` adds `wager` and `history` to CHECK constraint
- Migration needed: normalize any `wager` or `history` rows → `estimation`

### API Contracts
- `party-content` route: uses `contentType` for CRUD, `gameType` for generation
- `party-templates` route: exposes `id` (template identifier) and `contentPack` (content pack identifier)
- `PartyRoomDO`: receives `template` in init, stores as `templateId`, broadcasts as `gameTemplate` in sharedData
- R2 audio path: `audio/voice/${brand}/content/${contentType}/${contentId}.mp3`

### LSP Errors (pre-existing, not our problem)
- `api/src/party/templates/registry.ts` — 20 "Cannot find module" errors for `definition.json` files
- These are pre-existing in the worktree (definition.json files are build outputs, not in source)

## 2026-02-26 Task T3: API + DO Contract Matrix

### Contract matrix (File | Route/Context | Field Name | Current Type | Migration Action)
- M01 | `api/src/trpc/routes/party-content.ts` | importItems.input | `contentType` | `z.enum(CONTENT_TYPES)` | Keep canonical content identifier.
- M02 | `api/src/trpc/routes/party-content.ts` | list.input | `contentType` | `z.string().optional()` | T14: replace with canonical ContentType validator.
- M03 | `api/src/trpc/routes/party-content.ts` | list response item | `contentType` | `string` (from `content_type`) | Keep field, enforce canonical values only.
- M04 | `api/src/trpc/routes/party-content.ts` | reviewAll.input | `contentType` | `z.string().optional()` | T14 validation tightening.
- M05 | `api/src/trpc/routes/party-content.ts` | getById response | `contentType` | `string` (from `content_type`) | Keep field, block legacy aliases.
- M06 | `api/src/trpc/routes/party-content.ts` | loadFromSnapshot.input | `contentType` | `z.string()` | T14 validation tightening.
- M07 | `api/src/trpc/routes/party-content.ts` | generateMissingAudio.input | `contentType` | `z.string().optional()` | T14 validation tightening.
- M08 | `api/src/trpc/routes/party-content.ts` | backfillAudioAssets.input | `contentType` | `z.string().optional()` | T14 validation tightening.
- M09 | `api/src/trpc/routes/party-content.ts` | importPacks/importStatus response maps | content-type keys | `Record<string, number>` | Keep shape; enforce canonical keys in producer.
- M10 | `api/src/trpc/routes/party-content.ts` | generateContent.input | `gameType` | `z.string()` | Migrate semantics to `contentType` with compat alias.
- M11 | `api/src/trpc/routes/party-content.ts` | generateContent persistence | `input.gameType -> content_type/game_type` | `string` | Align persistence + input naming in staged rollout.
- M12 | `api/src/trpc/routes/party-content.ts` | getGenerationJob response | `gameType` | `string` | Migrate to `contentType` + temporary alias.
- M13 | `api/src/trpc/routes/party-content.ts` | listGenerationJobs input/output | `gameType` | `z.string().optional()` / `string` | Migrate to `contentType` with dual read/write.
- M14 | `api/src/trpc/routes/party-content.ts` | listBrandGameTypes response | `gameType` | `string` | Rename when source config migrates; else document as bridge.
- M15 | `api/src/trpc/routes/party-content.ts` | `FILENAME_TO_CONTENT_TYPE` | legacy filename aliases | `Record<string, ContentType>` | Keep during migration; remove after canonical packs only.

- M16 | `api/src/trpc/routes/party-templates.ts` | listByBrand/getById response | `id` | `string` | Keep template identifier; add optional TemplateId validation later.
- M17 | `api/src/trpc/routes/party-templates.ts` | listByBrand/getById response | `contentPack` | `string` | Migrate to `contentType` (or pluralized future shape) with alias period.
- M18 | `api/src/trpc/routes/party-templates.ts` | listByBrand.input | `brandId` | `z.string()` | Out-of-scope rename; unchanged.
- M19 | `api/src/trpc/routes/party-templates.ts` | getById.input | `id` | `z.string()` | Candidate for TemplateId validation (currently pass-through).

- M20 | `api/src/party/PartyRoomDO.ts` | `/init` request body | `template` | `string` optional | Migrate wire key to `templateId`, keep alias window.
- M21 | `api/src/party/PartyRoomDO.ts` | `/init` request body | `contentPack` | `unknown[]` optional | Keep name; payload data, not canonical identifier.
- M22 | `api/src/party/PartyRoomDO.ts` | internal room state | `templateId` | `string` | Keep canonical internal name.
- M23 | `api/src/party/PartyRoomDO.ts` | sharedData broadcast | `gameTemplate` | `string` | Migrate shared key to `templateId` with dual-write compat.
- M24 | `api/src/party/PartyRoomDO.ts` | persisted DO storage | `templateId` / `templateContentPack` | `string` / `unknown[]` | Keep persisted keys unless broader storage migration occurs.

- M25 | `api/src/index.ts` | `/api/party` create request | `template` | `string` | Migrate external REST request to `templateId` with alias.
- M26 | `api/src/index.ts` | `/api/party` -> DO init payload | `initBody.template` | `string` | Switch producer to `templateId` once DO accepts it.

- M27 | `packages/party/src/components/PartyGameRenderer.tsx` | sharedData consumer | `gameTemplate` | `string` | Client dual-read: `templateId` first, fallback `gameTemplate`.
- M28 | `packages/party/src/lib/usePartyMusic.ts` | sharedData consumer | `gameTemplate` | `string` | Client dual-read during migration.
- M29 | `packages/ui/src/browse/types.ts` | `PartyTemplate` model | `contentPack` | `string` | Migrate typing to `contentType` + compat alias.
- M30 | `packages/party/src/lib/template-types.ts` | `PartyTemplate` model | `contentPack` | `string` | Same migration as M29.
- M31 | `api/src/trpc/routes/monitoring.ts` | session stats response | `gameType` | `string` | Keep analytics key; optional parallel `contentType` metric.
- M32 | `api/src/trpc/routes/content-diagnostics.ts` | drift report item | `contentType` | `string` | Keep key; tighten parser assumptions in follow-up.

### Explicit inconsistency to preserve in migration plan
- Current PartyRoomDO naming chain is `template` (init input) -> `templateId` (internal/persisted) -> `gameTemplate` (sharedData).
- Current party-content generation naming mismatch is `gameType` (generate routes/jobs) vs `contentType` (CRUD/import/query paths).

### z.string() pass-throughs (T14 hardening targets)
- `party-content.list.input.contentType`
- `party-content.reviewAll.input.contentType`
- `party-content.loadFromSnapshot.input.contentType`
- `party-content.generateMissingAudio.input.contentType`
- `party-content.backfillAudioAssets.input.contentType`
- `party-content.generateContent.input.gameType`
- `party-content.listGenerationJobs.input.gameType`
- `party-templates.getById.input.id`

## 2026-02-26 T2: Audit and Finalize Template-to-Content Mapping Deltas

### Audit Results (r2/games/party/*/manifest.json)
- **Total Manifests Audited**: 20
- **Canonical ContentPacks**: 17 templates use canonical values (quip, trivia, drawing, dilemma, personal, FakeWord, wordlist, ranking, chroma, fibbage, estimation, headsup).
- **Intentionally Empty**: 2 templates (`rival-roster`, `shirt-clash`) have `contentPacks: []`.
- **Non-Canonical Delta**: 1 template (`year-jinx`) uses `["wager"]`.

### Delta List (for T9 implementation)
| Template ID | Current contentPacks | Target contentPacks | Reason |
|-------------|----------------------|---------------------|--------|
| `year-jinx` | `["wager"]`          | `["estimation"]`    | `wager` is legacy; `estimation` is canonical. |

### Regression Verification
- `rival-roster`: `contentPacks: []` confirmed.
- `shirt-clash`: `contentPacks: []` confirmed.
- No other non-canonical values found in `r2/games/party/*/manifest.json`.

## 2026-02-26 T5: Establish baseline verification harness and snapshots

### Baseline Verification Harness
- Created `api/src/party/templates/__tests__/registry-baseline.test.ts`
- Purpose: Detect drift in template count, ID naming, and content type naming during migration.
- Framework: Vitest.

### Key Assertions
1. **Template Count**: Exactly 20 templates must be registered in `DEFINITION_BY_TEMPLATE_ID`.
2. **Canonical IDs**: All keys in `DEFINITION_BY_TEMPLATE_ID` must match the pre-migration canonical list.
3. **Content Type Sentinel**:
   - Asserts `contentPacks` do NOT contain legacy names `wager` or `history`.
   - **Exception**: `year-jinx` is explicitly allowed to have `wager` in the baseline (serves as a regression sentinel).
4. **Structure**: Verifies `party.contentPacks` exists and is an array for all templates.

### Evidence Artifacts
- `.sisyphus/evidence/task-5-baseline-capture.txt`: Records the baseline state and test structure.
- `.sisyphus/evidence/task-5-drift-detect.txt`: Documents what each assertion is designed to catch.

### Usage in Wave 3
- These tests will be updated in T15/T16 after the coordinated rename to ensure the new state is consistent and legacy names are fully purged.

## 2026-02-26 T1 Canonical Contract

- Added `shared/src/schema/party-naming-contract.ts` as the single shared naming boundary.
- Exported `TemplateId` from a 20-item `TEMPLATE_IDS` const list to lock allowed template tokens.
- Added `TEMPLATE_CONTENT_MAP: Record<TemplateId, ContentType[]>` with complete template mapping.
- Normalized `year-jinx` to canonical `estimation` (legacy manifest uses `wager`).
- Kept `rival-roster` and `shirt-clash` mapped to `[]` intentionally (no content packs).
- Added `TEMPLATE_BRAND_TITLES` using brand-agnostic display labels only (no brand-prefixed IDs).
- Added guards `isTemplateId` and `assertTemplateId` to reject invalid or legacy-prefixed tokens at boundary.

## 2026-02-26 T4: Migration Design — Normalize content_type wager/history → estimation

### Migration Strategy
- SQLite/D1 can't ALTER CHECK constraints — must recreate the table (same pattern as 20260219)
- Temp table named with date suffix: `party_content_migration_20260226` to avoid conflicts
- After rename, temp table name is gone; rollback table named `party_content_rollback_20260226`

### Rollback Approach (key insight)
- Store `$.original_content_type` in metadata JSON for any row that gets renamed
- Uses `json_set(COALESCE(metadata, '{}'), '$.original_content_type', content_type)`
- Rollback migration uses `COALESCE(json_extract(metadata, '$.original_content_type'), content_type)`
- Then cleans up sentinel with `json_remove(metadata, '$.original_content_type')`
- This is only reliable while sentinel is present — after metadata cleanup, need DB backup

### CHECK Constraint After Migration
Final `content_type IN (...)` check in 20260226 migration:
  'quip', 'trivia', 'drawing', 'dilemma', 'wyr', 'estimation', 'fibbage',
  'caption', 'wordgame', 'wordlist', 'personal', 'FakeWord', 'ranking', 'headsup', 'chroma'
Matches CONTENT_TYPES in shared/src/schema/party-content.ts exactly.

### Execution Gate
- Migration file staged in T4 (this task)
- T7 (compatibility window) must deploy first — ensures all write paths use 'estimation'
- T8 executes the migration against live DB

### Files Created
- `api/migrations/20260226_normalize_content_types.sql`
- `api/migrations/20260226_normalize_content_types_rollback.sql`
- `.sisyphus/evidence/task-4-staging-backfill.txt`
- `.sisyphus/evidence/task-4-rollback.txt`

### D1 / SQLite Compatibility
- `json_set()`, `json_extract()`, `json_remove()` all available in D1 (SQLite 3.39+)
- `INSERT OR IGNORE INTO` used to make migration safe if temp table pre-exists
- FK enforcement is off by default in SQLite/D1 — `DROP TABLE party_content` is safe
  even with child tables referencing it (consistent with 20260219 pattern)

## 2026-02-26 T6: Centralize canonical ContentType definitions

### Changes Made
1. `api/src/party/content/prompt-loader.ts` — removed shadow `ContentType` union (lines 25-40), added `import type { ContentType } from "@slopcade/shared/schema/party-content"` and `export type { ContentType }` passthrough
2. `api/src/party/content/pack-scheduler.ts` — switched import from `./prompt-loader` → `@slopcade/shared/schema/party-content`
3. `api/src/party/templates/registry.ts` — split import: `ContentType` from shared, `loadContentPackFromDB` stays from prompt-loader
4. `api/src/index.ts` — `ContentType` now from shared, `loadContentPackFromDB` stays from prompt-loader
5. `api/src/trpc/routes/party-content.ts` — removed local `const CONTENT_TYPES = [...] as const` and `type ContentType` (shadow), now imports both from shared

### Two shadow locations found (not just one)
- `prompt-loader.ts` shadow was mentioned in task brief
- `party-content.ts` tRPC route had an identical shadow — also removed in T6

### Import path convention for shared schema in api/src
- Pattern: `@slopcade/shared/schema/party-content` (package alias, not relative path)
- Example: `import { CONTENT_TYPES, type ContentType } from "@slopcade/shared/schema/party-content"`

### Runtime guard mechanism
- `CONTENT_TYPES.includes(x as ContentType)` in party-content.ts's `extractContentTypeFromFilename`
  now uses the canonical 15-item array from shared
- TypeScript union type rejects invalid tokens at compile time in all typed call-sites
- T14 will add `z.enum(CONTENT_TYPES)` to harden API boundary validation

### Pre-existing errors not blocking
- `registry.ts` 20x "Cannot find module definition.json" are build-output-dependent, pre-existing

## T9: Template Content Pack Alignment
- Updated `year-jinx/manifest.json` contentPacks from `["wager"]` to `["estimation"]` to match canonical tokens.
- Verified all other party templates use canonical tokens (quip, trivia, drawing, dilemma, estimation, fibbage, personal, FakeWord, ranking, headsup, chroma, wordlist).
- Documented `headsUp` folder/slug vs `heads-up` registry ID drift in `.sisyphus/evidence/task-9-id-drift.txt`.

## 2026-02-26 T7: Compatibility Fallback Window

### What was added
- `LEGACY_ALIASES` constant in `prompt-loader.ts`: maps `estimation` → `["wager", "history"]`
- Fallback block in `loadContentPackFromDB`: only triggers when primary canonical query returns 0 rows
- `console.warn` logs fallback hits with brand+type context for monitoring
- `// TODO(T16): Remove after zero-hit confirmation` marks removal gate

### Fallback behavior
- Primary query for canonical type (e.g., `estimation`) runs first — no overhead if rows exist
- Only on empty result: check `LEGACY_ALIASES[type]`
- Iterate aliases in order (`wager` first, then `history`) — return first non-empty result
- If all aliases also empty: throw original error (same behavior as before)

### Monitoring signal
- Presence of `[party-content] No "estimation" content for brand "..."` in logs = T8 (DB migration) not yet run
- Absence of these warnings after T8 = safe to remove fallback (T16)

### Scope constraint
- Only `estimation` has legacy aliases — no other type was changed
- Function signature unchanged — callers unaffected

## 2026-02-26 T10: Generation config key convergence

### Changes made
- `base-configs.ts`: Removed `wager:` (was using local `WagerItemSchema` with `funFact?`) and `history:` (was using `EstimationItemSchema`). Both subsumed by existing `estimation:` key.
- `WagerItemSchema` local const also removed (had `funFact?` not in canonical `EstimationQuestionSchema`).
- `brand-content-config.ts`: Renamed `wager:` → `estimation:` (targetCount: 500), removed `history:` (was 350). Target count preserved for main wager volume.
- `brands.ts`: Merged `history` + `wager` category arrays into single `estimation:` key for both amen and slopcade brands. All unique category strings preserved.
- `readable-text.ts`: Removed `case "wager":` since same branch as `case "estimation":`.

### Schema difference: WagerItemSchema vs EstimationItemSchema
- `WagerItemSchema` (local): `{ question, answer: number, unit?, category, funFact? }`
- `EstimationItemSchema` (from types.ts): `{ id, question, answer: number, unit?, category, acceptableRange? }`
- Main diff: `funFact?` vs `acceptableRange?`. Canonical `estimation` schema wins.

### LEGACY_BRAND_GAME_TYPES intentionally NOT touched
- `prompts.ts` still has `"amen-history"` → `gameType: "history"` and `"amen-wager"` → `gameType: "wager"`
- These will throw at runtime until T12 removes them (that's T12's job)
- `prompt-loader.ts` `LEGACY_ALIASES` (`estimation: ["wager", "history"]`) left for T16

### Category merging strategy
Amen estimation categories = amen.wager categories ∪ amen.history categories (15 unique values)
Slopcade estimation categories = slopcade.wager categories ∪ slopcade.history categories (12 unique values)
