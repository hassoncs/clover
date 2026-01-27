# Asset URL Architecture Migration (UUID-First)

## Context

### User Request
Migrate Slopcade to a UUID-first asset architecture where:
- Every image file is named `{assetId}.png` (UUID).
- Canonical R2 key is `generated/{gameId}/{packId}/{assetId}.png`.
- GameDefinition stores asset references (IDs) rather than absolute URLs; URLs are resolved at runtime.
- Forking shares base assets but supports new asset generation without collisions.
- Local debug output is traceable to production artifacts.

### Current State (verified)
- Canonical key builder already exists in shared utilities:
  - `shared/src/utils/asset-url.ts` exports:
    - `buildAssetPath(gameId, packId, assetId)` -> `generated/{gameId}/{packId}/{assetId}.png`
    - `resolveAssetReference(value, baseUrl, gameId?, packId?)` (legacy passthrough + ID resolution)
- CLI/pipeline still produces collision-prone friendly filenames:
  - `api/scripts/generate-game-assets.ts` expects `{r2Prefix}/{spec.id}.png`
  - `api/src/ai/pipeline/stages/index.ts` `uploadR2Stage` uses `${run.meta.r2Prefix}/${run.spec.id}.png`
- API asset system stores R2 keys in DB and resolves them to full URLs when returning to clients:
  - `api/src/trpc/routes/asset-system.ts` `resolveStoredAssetUrl()`
- Existing migration script covers an older format but not “friendly-name” objects:
  - `api/scripts/migrate-asset-urls.ts`
- Test games hardcode absolute CDN URLs:
  - `app/lib/test-games/games/*/game.ts`

### Breaking Changes & Risks
- GameDefinition schema change (new `assetRef` fields) will break consumers that assume `imageUrl` is always a URL.
- Mixed legacy formats will exist during rollout (absolute URLs, `/assets/...` relative paths, stored R2 keys, and UUID refs).
- R2 object migration/copy is potentially expensive and must be idempotent; partial migrations can orphan assets.
- Forking semantics depend on how pack context is determined at runtime (active pack, per-template pack, or DB lookup).

### Backward Compatibility Strategy (default)
- Dual-read for a migration window:
  - Runtime resolves both `imageUrl` (legacy) and `assetRef` (new).
  - API continues returning resolved URLs to clients, but internal storage transitions to IDs.
- Dual-write where necessary:
  - New generation writes UUID-based keys only.
  - Migration scripts backfill IDs and optionally rewrite definitions.

### Debug-to-Production Traceability (default)
For each generated asset, write a single source of truth mapping:
- `api/debug-output/{gameId}/{assetId}/metadata.json` containing:
  - `gameId`, `packId`, `assetId`, `r2Key`, `publicUrl`, `sourceSpecId`, `pipelineRunId`, timestamps
This makes local artifacts grep-able and correlatable to DB rows and R2 keys.

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1 | None | Establish canonical types/utilities used everywhere else |
| Task 2 | Task 1 | Pipeline needs shared schema + helpers |
| Task 3 | Task 1, Task 2 | CLI must use the new pipeline/keying conventions |
| Task 4 | Task 1 | API generation changes depend on canonical key helpers |
| Task 5 | Task 1 | Shared types/validation must reflect `assetRef` schema |
| Task 6 | Task 5 | Runtime resolution needs the final shared schema |
| Task 7 | Task 4, Task 5, Task 6 | Forking correctness relies on API + schema + resolver |
| Task 8 | Task 2, Task 4, Task 5 | Data migration must match new storage + schema |
| Task 9 | Task 5, Task 6 | Test games should migrate once `assetRef` and resolver exist |
| Task 10 | Task 1-9 | Rollout requires everything wired + verified |

---

## Parallel Execution Graph

Wave 1 (Start immediately):
├── Task 1: Canonical types + URL/key utilities
└── Task 5: GameDefinition schema update (depends on Task 1 finishing first)

Wave 2 (After Task 1):
├── Task 2: Pipeline keying + debug metadata
└── Task 4: API generation path audit + fixes

Wave 3 (After Task 2 + Task 5):
├── Task 3: CLI UUID mode + manifests
└── Task 6: Runtime resolver + normalization

Wave 4 (After Task 4 + Task 5 + Task 6):
├── Task 7: Forking correctness + override behavior
└── Task 9: Test games migration

Wave 5 (After Task 2 + Task 4 + Task 5):
└── Task 8: Existing data + R2 object migration

Wave 6 (After all):
└── Task 10: Rollout, verification, and cleanup

Critical Path: Task 1 → Task 2 → Task 5 → Task 6 → Task 8 → Task 10
Estimated Parallel Speedup: ~30-40% vs fully sequential (Tasks 2/4 and 3/6 can overlap)

---

## Tasks

### Task 1: Canonical Asset Identity & Utility Hardening
**Description**: Lock the canonical asset identity model and ensure shared utilities cleanly support all legacy and new formats.

**Delegation Recommendation:**
- Category: `ultrabrain` - touches shared contracts used across app + api; needs careful type-level reasoning
- Skills: `typescript-programmer`, `git-master` - TS contract work + clean commits

**Skills Evaluation:**
- ✅ `typescript-programmer`: Shared types/utilities are TypeScript-heavy
- ✅ `git-master`: Multiple atomic commits likely
- ❌ `frontend-ui-ux`, `agent-browser`, `dev-browser`: No UI/browser work
- ❌ `python-programmer`, `python-debugger`, `golang-tui-programmer`, `svelte-programmer`: Wrong language/framework
- ❌ `data-scientist`: No data processing focus
- ❌ `prompt-engineer`: No prompt optimization

**Depends On**: None

**Acceptance Criteria**:
- `shared/src/utils/asset-url.ts` continues to produce `generated/{gameId}/{packId}/{assetId}.png` and can resolve:
  - full URLs
  - `data:` and `res://`
  - stored R2 keys (`generated/...`)
  - bare asset IDs (when provided `gameId` + `packId`)
- Shared tests pass: `pnpm --filter @slopcade/shared test`
- Typecheck passes (repo): `pnpm tsc --noEmit`

---

### Task 2: Pipeline Uses UUID Keys Everywhere + Writes Debug Metadata
**Description**: Remove friendly-name keying from the pipeline stages; generate/upload by UUID and emit a `metadata.json` per asset for traceability.

**Delegation Recommendation:**
- Category: `ultrabrain` - pipeline is cross-environment (Node vs Workers) and easy to subtly break
- Skills: `typescript-programmer`, `git-master` - TS refactors + safe commit structure

**Skills Evaluation:**
- ✅ `typescript-programmer`: Pipeline stage contracts and adapters are TS
- ✅ `git-master`: Refactor likely spans multiple files
- ❌ `frontend-ui-ux`, `agent-browser`, `dev-browser`: No UI/browser work
- ❌ `python-programmer`, `python-debugger`, `golang-tui-programmer`, `svelte-programmer`: Not relevant
- ❌ `data-scientist`, `prompt-engineer`: Not relevant

**Depends On**: Task 1

**References**:
- `api/src/ai/pipeline/stages/index.ts` (current `uploadR2Stage` uses `r2Prefix/spec.id`)
- `shared/src/utils/asset-url.ts` (`buildAssetPath`)
- `api/scripts/generate-game-assets.ts` (expects friendly output)

**Acceptance Criteria**:
- Pipeline upload stage constructs keys using `(gameId, packId, assetId)` only
- Debug output includes `api/debug-output/{gameId}/{assetId}/metadata.json` with `r2Key` and resolved URL
- `pnpm --filter @slopcade/api test` passes

---

### Task 3: CLI Generation: UUID Mode + Stable Game/Pack IDs + Manifest Output
**Description**: Update CLI generation to stop producing `generated/{slug}/{name}.png` and instead:
- Use a real `gameId` + `packId` (UUIDs; either passed in or stored as constants per config)
- Allocate a new `assetId` UUID per generated image
- Emit a manifest mapping logical `spec.id` → `{assetId, r2Key, publicUrl}`

**Delegation Recommendation:**
- Category: `unspecified-high` - multi-file CLI/pipeline integration, but less architectural than core contracts
- Skills: `typescript-programmer`, `git-master`

**Skills Evaluation:**
- ✅ `typescript-programmer`: TS CLI + config work
- ✅ `git-master`: Multi-file change with atomic commits
- ❌ `frontend-ui-ux`, `agent-browser`, `dev-browser`: No UI/browser work
- ❌ `python-programmer`, `python-debugger`, `golang-tui-programmer`, `svelte-programmer`: Not relevant
- ❌ `data-scientist`, `prompt-engineer`: Not relevant

**Depends On**: Task 1, Task 2

**References**:
- `api/scripts/generate-game-assets.ts`
- `api/scripts/game-configs/*/assets.config.ts`

**Acceptance Criteria**:
- Dry run output no longer shows `{r2Prefix}/{spec.id}.png`; it shows UUID filenames
- A manifest is written per run (location defined in implementation; must include IDs and URLs)
- CLI run still supports `--dry-run` and produces deterministic, readable debug dirs

---

### Task 4: API Generation & Asset-System Paths: Eliminate Friendly Keys
**Description**: Ensure every server-side generation and storage path is UUID-keyed and pack-scoped, including UI component generation.

**Delegation Recommendation:**
- Category: `ultrabrain` - touches job processing, DB writes, and URL resolution
- Skills: `typescript-programmer`, `git-master`

**Skills Evaluation:**
- ✅ `typescript-programmer`: tRPC routes + pipeline + DB access are TS
- ✅ `git-master`: Safe commits for migration-sensitive changes
- ❌ `frontend-ui-ux`, `agent-browser`, `dev-browser`: No UI/browser work
- ❌ `python-programmer`, `python-debugger`, `golang-tui-programmer`, `svelte-programmer`: Not relevant
- ❌ `data-scientist`, `prompt-engineer`: Not relevant

**Depends On**: Task 1

**References**:
- `api/src/trpc/routes/asset-system.ts` (job processing, UI pack keying, DB writes)
- `api/src/ai/assets.ts` (`uploadToR2` already uses `buildAssetPath` when context exists)

**Acceptance Criteria**:
- Any `generated/{gameId}/asset-pack/{packId}/...` friendly filenames are replaced with UUID-keyed assets, with pack context preserved
- DB stores `game_assets.image_url` as an R2 key (not a full URL)
- API responses still return valid full URLs for clients
- `pnpm --filter @slopcade/api test` passes

---

### Task 5: GameDefinition Schema: Add `assetRef` (IDs) and Keep Legacy Support
**Description**: Update shared `GameDefinition` types so image-bearing fields can be expressed as asset references.

**Delegation Recommendation:**
- Category: `ultrabrain` - contract change that propagates widely; must avoid breaking builds
- Skills: `typescript-programmer`, `git-master`

**Skills Evaluation:**
- ✅ `typescript-programmer`: Shared types + validation are TS
- ✅ `git-master`: Needs careful commit boundaries
- ❌ `frontend-ui-ux`, `agent-browser`, `dev-browser`: No UI/browser work
- ❌ `python-programmer`, `python-debugger`, `golang-tui-programmer`, `svelte-programmer`: Not relevant
- ❌ `data-scientist`, `prompt-engineer`: Not relevant

**Depends On**: Task 1

**Acceptance Criteria**:
- GameDefinition supports expressing images via `assetRef` without losing width/height metadata
- Existing definitions using `imageUrl` continue to typecheck
- Shared tests pass: `pnpm --filter @slopcade/shared test`

---

### Task 6: Runtime Resolution: Normalize Definitions by Resolving `assetRef` → URL
**Description**: Add a single runtime normalization step that converts asset references into actual URLs before the engine consumes the definition.

**Delegation Recommendation:**
- Category: `unspecified-high` - app-side wiring across load paths; moderate architectural coupling
- Skills: `typescript-programmer`, `git-master`

**Skills Evaluation:**
- ✅ `typescript-programmer`: App runtime is TS
- ✅ `git-master`: Ensures safe incremental rollout
- ❌ `frontend-ui-ux`, `agent-browser`, `dev-browser`: No UI/browser automation required
- ❌ `python-programmer`, `python-debugger`, `golang-tui-programmer`, `svelte-programmer`: Not relevant
- ❌ `data-scientist`, `prompt-engineer`: Not relevant

**Depends On**: Task 5

**Acceptance Criteria**:
- Runtime accepts GameDefinitions containing a mix of `imageUrl` and `assetRef`
- Resolution uses `shared/src/utils/asset-url.ts` logic to preserve legacy URLs
- App build/typecheck passes: `pnpm tsc --noEmit`

---

### Task 7: Forking Semantics: Shared Base Assets + Override Packs
**Description**: Ensure forking preserves shared base assets while enabling per-fork overrides without absolute URLs leaking across forks.

**Delegation Recommendation:**
- Category: `ultrabrain` - correctness-sensitive data model behavior spanning DB + definition semantics
- Skills: `typescript-programmer`, `git-master`

**Skills Evaluation:**
- ✅ `typescript-programmer`: Likely changes in API routes/services
- ✅ `git-master`: Requires clean, reviewable commits
- ❌ `frontend-ui-ux`, `agent-browser`, `dev-browser`: No UI/browser work
- ❌ `python-programmer`, `python-debugger`, `golang-tui-programmer`, `svelte-programmer`: Not relevant
- ❌ `data-scientist`, `prompt-engineer`: Not relevant

**Depends On**: Task 4, Task 5, Task 6

**Acceptance Criteria**:
- Forked game definitions do not embed parent absolute URLs
- Fork can select/create a new `asset_packs` entry (or equivalent) and resolve assets correctly
- Existing base assets remain shared via `base_game_id` semantics

---

### Task 8: Migration: Existing R2 Objects + DB Rows + GameDefinitions
**Description**: Migrate existing assets and definitions into the new reference model.

**Delegation Recommendation:**
- Category: `ultrabrain` - data migration + idempotency + rollback concerns
- Skills: `typescript-programmer`, `git-master`, `data-scientist`

**Skills Evaluation:**
- ✅ `typescript-programmer`: Migration scripts + schema handling are TS
- ✅ `git-master`: Migrations benefit from crisp commits
- ✅ `data-scientist`: Helpful for reasoning about dataset edge-cases and idempotent transformations (even without heavy analytics)
- ❌ `frontend-ui-ux`, `agent-browser`, `dev-browser`: No UI/browser work
- ❌ `python-programmer`, `python-debugger`, `golang-tui-programmer`, `svelte-programmer`: Not relevant
- ❌ `prompt-engineer`: Not relevant

**Depends On**: Task 2, Task 4, Task 5

**References**:
- `api/scripts/migrate-asset-urls.ts` (existing migration approach)
- `api/src/trpc/routes/asset-system.ts` (DB schema and pack/asset relationships)
- `app/lib/test-games/games/*/game.ts` (legacy absolute URLs to be migrated)

**Acceptance Criteria**:
- Migration can run in dry-run mode and produces a clear summary (counts, skipped, errors)
- Migrates:
  - stored legacy keys to canonical `generated/{gameId}/{packId}/{assetId}.png`
  - friendly-name objects (e.g., `generated/slopeggle/ball.png`) by copying to canonical UUID keys
  - game definitions from absolute URLs to `assetRef` where mappings exist
- Rollback story documented (DB restore and/or leaving old R2 objects intact)

---

### Task 9: Test Games: Remove Hardcoded `ASSET_BASE`, Use AssetRefs + Resolver
**Description**: Update test games to stop hardcoding CDN base paths and instead use `assetRef` (and a known pack context) so they exercise the same runtime behavior.

**Delegation Recommendation:**
- Category: `unspecified-low` - repetitive but straightforward edits across many files
- Skills: `typescript-programmer`, `git-master`

**Skills Evaluation:**
- ✅ `typescript-programmer`: TS edits across test game definitions
- ✅ `git-master`: Helps batch/atomic commits
- ❌ `frontend-ui-ux`, `agent-browser`, `dev-browser`: Not a UI redesign task
- ❌ `python-programmer`, `python-debugger`, `golang-tui-programmer`, `svelte-programmer`: Not relevant
- ❌ `data-scientist`, `prompt-engineer`: Not relevant

**Depends On**: Task 5, Task 6

**Acceptance Criteria**:
- No test game defines `ASSET_BASE = "https://.../assets/generated/..."`
- Test games load images via resolver (legacy `imageUrl` still allowed for any remaining gaps)
- App tests (if any) pass; repo typecheck passes: `pnpm tsc --noEmit`

---

### Task 10: Rollout, Verification, and Cleanup
**Description**: Ship the migration safely with verification steps and a clear rollback path.

**Delegation Recommendation:**
- Category: `writing` - runbook + verification steps + operator guidance
- Skills: `git-master`

**Skills Evaluation:**
- ✅ `git-master`: Ensures docs/ops changes land cleanly
- ❌ `typescript-programmer`: Mostly documentation/runbook
- ❌ `frontend-ui-ux`, `agent-browser`, `dev-browser`: Not required
- ❌ `python-programmer`, `python-debugger`, `golang-tui-programmer`, `svelte-programmer`, `data-scientist`, `prompt-engineer`: Not relevant

**Depends On**: Task 1-9

**Acceptance Criteria**:
- A rollout checklist exists (deploy order, feature flags if used, smoke tests)
- Verification commands documented:
  - `pnpm test`
  - `pnpm tsc --noEmit`
  - `pnpm --filter @slopcade/api test`
  - `pnpm --filter @slopcade/shared test`
- A rollback checklist exists (DB restore + how to handle R2 objects)

---

## Commit Strategy

- Prefer atomic, conventional commits per task:
  - `refactor(shared): harden asset url utilities` (Task 1)
  - `refactor(api): uuid-key pipeline uploads and debug metadata` (Task 2)
  - `feat(api): enforce canonical r2 keys in asset generation` (Task 4)
  - `feat(shared): add assetRef support to GameDefinition` (Task 5)
  - `feat(app): resolve assetRef at runtime` (Task 6)
  - `chore(migrations): migrate legacy asset urls and definitions` (Task 8)
  - `refactor(app): migrate test games to assetRef` (Task 9)
- Each commit must keep `pnpm tsc --noEmit` green.

## Success Criteria

- All new assets generated by CLI and API land in R2 under `generated/{gameId}/{packId}/{assetId}.png`.
- No collisions from friendly filenames.
- GameDefinitions can be stored without absolute URLs (asset references only) and still render correctly.
- Forked games can share base assets and override via new packs without rewriting URLs.
- Debug runs produce `metadata.json` mapping local artifacts to production IDs and URLs.
- `pnpm test` and `pnpm tsc --noEmit` pass.
