# Learnings — Asset System V4

## 2026-02-12 Initial Exploration

### Current Architecture
- **D1 `assets` table**: id, r2_key, width, height, creator_user_id, source, theme_id, compiled_prompt, model_id, created_at, deleted_at. **NO content_hash column yet.**
- **R2 bucket**: Single `ASSETS` binding → `slopcade-assets`. Prefixes: `games/{id}/workspace/`, `games/{id}/definition.json`, `agent-runs/`, `{entityType}/{assetId}{ext}`
- **Env interface**: `api/src/trpc/context.ts` — has `DB: D1Database`, `ASSETS: R2Bucket`, `REALTIME_RELAY: DurableObjectNamespace`
- **Durable Objects**: Only `RealtimeRelayDO` exists (`api/src/agent/RealtimeRelayDO.ts`). Exported from `api/src/index.ts`. Uses `DurableObjectState` constructor pattern (NOT extending `DurableObject` class).
- **Wrangler migrations**: v2 (RunCoordinatorDO, RunStepWorkerDO), v3 (RealtimeRelayDO), v4 (deleted RunCoordinator/RunStepWorker). Next tag = v5.

### Asset Upload Flow
- `AssetService` (`api/src/ai/assets/service.ts`) generates images via Scenario/Modal, uploads to R2 with `uploadToR2()` method. Uses `crypto.randomUUID()` for asset IDs.
- `ArtifactService` (`api/src/agent/artifact-service.ts`) manages workspace files in R2 under `games/{gameId}/workspace/`.
- Generation jobs (`api/src/trpc/routes/asset-system/generation-jobs.ts`) orchestrate batch generation and persist to D1 `assets` table.

### Type System
- `ImageField` = `{ imageUrl?, assetRef?, localPath? }` — in `shared/src/types/GameDefinition.ts`
- `ImageVisualComponent` has `url?` field (NOT imageUrl) — in `shared/src/types/visual.ts`
- `SoundAsset` has `url` field — in `shared/src/types/GameDefinition.ts`
- `StaticBackground`, `ParallaxLayer` extend `ImageField`
- `AssetConfig` extends `ImageField`
- `GameMetadata` has `thumbnailUrl/thumbnailAssetRef`, `titleHeroImageUrl/titleHeroAssetRef` pairs

### Workspace System
- `ArtifactManager` (`api/src/ai/agent/artifact-manager.ts`) handles definition versioning
- AI tools (writeFile, readFile, readFilesBatch) in `api/src/chat/chat-tools.ts`
- Workspace snapshot via `computeWorkspaceRevision` in `api/src/trpc/routes/chat-threads.ts`
- Play page loads via `games.getPublic` tRPC, merges remixes via `mergeAssetsIntoPrefabs`

### isomorphic-git
- Pure JS, compatible with Workers/DOs
- Needs `fs.promises` interface: readFile, writeFile, unlink, readdir, mkdir, rmdir, stat, lstat
- `cache` parameter is a plain `{}` object for packfile caching — critical for performance
- R2 as backend: each fs operation = HTTP request, so DO cache layer is essential
- Memory warning: parallel operations can be memory-intensive

## Migration: content_hash column (2026-02-12)

**Created files:**
- `api/migrations/20260212_assets_content_hash.sql`
- Updated `api/schema.sql` (lines 93, 108)

**Schema changes:**
- Added `content_hash TEXT` column to `assets` table (after `r2_key`)
- Added unique partial index: `idx_assets_content_hash` with `WHERE content_hash IS NOT NULL`

**Rationale:**
- Partial index allows existing rows (with NULL content_hash) to coexist with new rows
- Unique constraint enables content-addressed deduplication
- Positioned after `r2_key` for logical grouping (both are storage identifiers)

**Migration naming convention:**
- Format: `YYYYMMDD_description.sql`
- Example: `20260212_assets_content_hash.sql`

## BlobStore Service (2026-02-12)

**Created files:**
- `api/src/services/BlobStore.ts` — content-addressed binary storage
- `api/src/services/__tests__/BlobStore.test.ts` — 18 unit tests

**Key implementation details:**
- Constructor takes `R2Bucket` + `D1Database` (follows `BuildArtifactWriter` pattern)
- R2 key format: `blobs/{first2chars}/{sha256hash}` for hot-prefix fan-out
- SHA-256 via Web Crypto API: `crypto.subtle.digest('SHA-256', arrayBuffer)`
- Dedup: query D1 `assets.content_hash` before uploading to R2
- `Uint8Array.buffer.slice()` returns `ArrayBuffer | SharedArrayBuffer` in TS — must cast to `ArrayBuffer` explicitly
- `exists()` checks D1 (faster than R2 head request)
- `getUrl()` returns relative URL `/assets/blobs/{prefix}/{hash}` compatible with existing asset proxy
- Tests mock R2Bucket with Map-based store and D1Database with closure-captured rows (same pattern as WorkspaceCopyService tests)

## R2Fs — isomorphic-git filesystem adapter (2026-02-12)

**Created files:**
- `api/src/services/git/R2Fs.ts` — R2-backed fs.promises adapter
- `api/src/services/git/__tests__/R2Fs.test.ts` — 25 unit tests

**Key implementation details:**
- `R2Fs` class wraps `R2Bucket` + prefix string, exposes `promises` property matching isomorphic-git's `fs.promises` interface
- Path normalization: strips leading/trailing slashes AND handles `"."` → `""` (root)
- `readFile` returns `Uint8Array` by default, `string` when `encoding: "utf8"` specified
- `readdir` uses R2 `delimiter: "/"` listing — `objects` = files, `delimitedPrefixes` = subdirectories
- `stat` tries `head()` first (file), falls back to `list({ prefix: key + "/", limit: 1 })` for directory detection
- `mkdir`/`rmdir` are no-ops (R2 is flat, directories are implicit)
- `lstat` delegates to `stat` (no symlinks in R2)
- Error objects have `.code = "ENOENT"` for missing files (isomorphic-git checks this)
- Mock bucket in tests uses `Map<string, StoredObject>` with delimiter-aware list implementation

## CachedR2Fs — LRU caching layer for R2Fs (2026-02-12)

**Created files:**
- `api/src/services/git/CachedR2Fs.ts` — LRU-cached wrapper around R2Fs
- `api/src/services/git/__tests__/CachedR2Fs.test.ts` — 28 unit tests

**Key implementation details:**
- Inline `LRUCache<V>` class using doubly-linked list + Map, tracks byte size (not just entry count)
- Default 64MB cache limit (Workers have 128MB RAM)
- Separate `dataCache` (file contents) and `statCache` (stat results, 1/8 of data budget)
- Path categorization: `immutable` (objects/, .idx, .pack), `refs` (refs/, HEAD, packed-refs), `other`
- Immutable paths cached with no TTL; refs cached with 5s TTL; other paths not cached
- `readdir` always passes through (directory listings change frequently)
- Write-through caching: on writeFile for string data, caches under bare key AND `::utf8`/`::utf-8` variants
- Cache key for readFile includes encoding suffix: `path::utf8` vs bare `path` for binary
- `invalidatePath()` removes bare key, utf8, utf-8, and stat entries
- ENOENT errors are NOT cached (file may appear later)
- `lstat` delegates to `stat` (same as R2Fs)
- Exposes `clearCache()`, `cacheSize`, `cacheBytes` for observability

## GameRepoDO Binding Setup (2026-02-12)

**Modified files:**
- `api/wrangler.toml` — added GAME_REPO binding + v5 migration
- `api/src/trpc/context.ts` — added `GAME_REPO: DurableObjectNamespace` to Env interface
- `api/src/durable-objects/GameRepoDO.ts` — created placeholder class
- `api/src/index.ts` — imported and exported GameRepoDO
- `api/package.json` — added `isomorphic-git@1.37.0` dependency

**Key implementation details:**
- Migration tag v5 declares `new_classes = ["GameRepoDO"]`
- GameRepoDO follows same constructor pattern as RealtimeRelayDO: `constructor(state: DurableObjectState, env: unknown)`
- Placeholder `fetch()` returns 501 Not Implemented
- isomorphic-git installed successfully (pure JS, no native deps)
- TypeScript compilation passes with no errors

**Wrangler migration history:**
- v2: RunCoordinatorDO, RunStepWorkerDO
- v3: RealtimeRelayDO
- v4: deleted RunCoordinator/RunStepWorker
- v5: GameRepoDO (NEW)

**Next steps:**
- Implement GameRepoDO with R2Fs/CachedR2Fs backend
- Wire up git operations (init, commit, checkout, diff)
- Add workspace sync logic

## GameRepoDO Full Implementation (2026-02-12)

**Modified files:**
- `api/src/durable-objects/GameRepoDO.ts` — full implementation replacing placeholder

**Created files:**
- `api/src/durable-objects/__tests__/GameRepoDO.test.ts` — 18 unit tests

**Key implementation details:**
- DO manages a single game's Git repo via isomorphic-git + CachedR2Fs
- R2 prefix: `repos/{gameId}/.git/` — gameId extracted from X-Game-Id header or POST /init body
- HTTP routes: POST /init, POST /commit, GET /read/:path, GET /tree, GET /log, POST /branch, POST /tag, GET /diff
- `dir: "/"` for all git operations since R2Fs prefix already includes the repo path

**isomorphic-git integration gotchas:**
1. **PromiseFsClient wrapper required**: isomorphic-git's `FileSystem` constructor calls `bindFs()` which iterates over `['readFile', 'writeFile', 'mkdir', 'rmdir', 'unlink', 'stat', 'lstat', 'readdir', 'readlink', 'symlink']`. ALL must be present on the promises object, even if they throw. Missing methods cause `undefined.bind()` errors.
2. **stat must include ctimeMs**: isomorphic-git's `normalizeStats()` calls `SecondsNanoseconds(e.ctimeSeconds, e.ctimeNanoseconds, e.ctimeMs, e.ctime)`. If all four are undefined, it tries `e.ctime.valueOf()` which throws. R2Fs stat only has `mtimeMs`, so the wrapper copies `mtimeMs` to `ctimeMs`.
3. **`return await` in try/catch**: When returning async handler results inside a try/catch, must use `return await this.handleX()` not `return this.handleX()`. Without `await`, promise rejections bypass the catch block.
4. **Error detection**: isomorphic-git throws `NotFoundError` with `code: 'NotFoundError'` and message `"Could not find {what}."`. Check both `err.code` and `err.message` patterns.
5. **Diff via git.walk()**: Use `TREE({ ref })` walkers to compare two commits. Must handle tree entries (skip them) and compare OIDs for blob entries.
6. **Commit adds only**: The DO's commit endpoint only adds files (no removal). To detect deletions in diff, files must be explicitly removed from the index via `git.remove()`.
