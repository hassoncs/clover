# Asset Pipeline Cleanup

> Feb 12, 2026. The asset system was migrated from pack-based (image URLs baked into definitions) to blob-based (content-addressed storage with `assetId` hashes). The migration is incomplete — several pieces don't connect.

## Current State (Broken)

```
r2/games/{id}/definition.json   ← has assetId hashes, no URLs
r2/games/{id}/manifest.json     ← game metadata
r2/blobs/{prefix}/{hash}        ← actual image files (content-addressed)

build-games.ts                  ← copies r2/ → local Wrangler R2 + seeds D1
                                   (slow, hangs, requires manual invocation)
```

**What breaks:**
1. `BlobStore.getUrl()` returns relative paths (`/assets/blobs/...`), Godot needs absolute URLs
2. `extractAssetManifest` doesn't scan prefabs — preloader never sees prefab images
3. Offline/local games skip `resolveAssetIds` entirely
4. `build-games.ts` is a manual step that hangs and uses deprecated schema patterns
5. Background images use `imageUrl` key but Godot expects `url`

## Target State

```
r2/                             ← source of truth, checked into git
  games/{id}/definition.json    ← has assetId hashes (no URLs)
  games/{id}/manifest.json      ← game metadata
  blobs/{prefix}/{hash}         ← content-addressed images

API (Wrangler)                  ← reads directly from r2/ via R2 binding
  /assets/*                     ← serves R2 objects
  /trpc/games.getPublic         ← reads game row from D1, definition from R2
  /trpc/blobAssets.batchResolve ← resolves hashes → absolute URLs

Play page                       ← fetches definition, resolves assetIds → URLs
  resolveAssetIds()             ← injects absolute URLs into definition
  useGamePreloader()            ← preloads all images (including prefabs)
  → bridge.loadGame(definition) ← sends definition with URLs to Godot

No build-games.ts. No manual seeding. D1 auto-seeded on API startup.
```

## Implementation Plan

### Phase 1: Fix the immediate image loading (gets ballSort working)

#### 1a. Make `BlobStore.getUrl()` return absolute URLs
- `api/src/services/BlobStore.ts` — `getUrl()` currently returns `/assets/blobs/{prefix}/{hash}`
- Change to accept a `baseUrl` parameter, or better: have the tRPC `batchResolve` route construct absolute URLs using the request origin
- The `batchResolve` route has access to the request context — use it to build `${origin}/assets/blobs/...`

#### 1b. Fix `extractAssetManifest` to include prefab images
- `app/lib/assets/AssetManifest.ts` — `extractAssetManifest()` scans backgrounds/metadata but not prefabs
- Add iteration over `definition.prefabs` to extract `visual.url` for image-type visuals
- This fixes preloading so images are downloaded before the game starts

#### 1c. Standardize URL field name
- `resolveAssetIds.ts` uses `imageUrl` for backgrounds but `url` for prefabs
- Godot's `AssetUtils.resolve_url` only checks `url`
- Standardize: always use `url` field for the resolved URL

#### 1d. Fix offline path
- `app/app/play/[id].tsx` lines 73-75 — loading from local storage skips `resolveAssetIds`
- Add the resolution call for local definitions too (resolve against local blob storage)

### Phase 2: Eliminate `build-games.ts`

#### 2a. Auto-seed D1 on API startup
- The API already reads definitions from R2. It just needs D1 rows to know games exist.
- Add a startup hook to the API that:
  1. Lists all `games/*/manifest.json` files in R2
  2. Upserts a row in D1 for each game
  3. Runs once on cold start, takes <1s for 14 games
- This replaces the `seedLocalD1()` function in `build-games.ts`

#### 2b. Auto-sync `r2/` to Wrangler's local R2
- Wrangler's local R2 lives in `.wrangler/state/`. Currently `build-games.ts` syncs files there via `wrangler r2 object put`.
- Option A: Configure Wrangler to serve directly from `r2/` (check if `--persist-to` supports this)
- Option B: Use Wrangler's `r2_buckets.persist_to` in `wrangler.toml` to point at `r2/`
- Option C: Keep the sync but make it a lightweight watcher (like `godot:watch`)

#### 2c. Remove `build-games.ts`
- Once 2a and 2b are done, the script has no purpose
- Also remove:
  - `app/assets/embedded-games/` (generated directory)
  - `app/lib/offline/embedded-games-registry.ts` (generated file)
  - The `build:games` and `watch:games` scripts from `api/package.json`
  - The `games-watcher` devmux service if it wraps `watch:games`

### Phase 3: Clean up dead code
- Remove old pack-based asset code (r2/packs/ was already deleted)
- Remove `api/scripts/download-pack-assets.ts` (already deleted in working tree)
- Clean up any references to the old pack system in types/schemas

## Order of Operations

Phase 1 first (1a → 1b → 1c → 1d) — gets games working immediately.
Phase 2 can follow separately — eliminates the build step.
Phase 3 is cleanup — do whenever.
