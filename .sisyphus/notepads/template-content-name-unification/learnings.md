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
