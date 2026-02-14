# Asset System

How images, sounds, and other binary assets are stored, referenced, and served in Slopcade.

## Architecture

```
Game Workspace (git-backed)          Content-Addressable Blob Store
├── manifest.json                    R2: blobs/{hash[0:2]}/{hash}
├── prefabs/                         D1: assets table (metadata)
│   ├── ball.json ──assetId──────►   ┌──────────────────────┐
│   └── tube.json ──assetId──────►   │  blobs/a3/a3f2b8...  │
├── entities/
├── scripts/
└── ...                              Served: /assets/blobs/{hh}/{hash}
```

Two kinds of files in every game:
- **Text** (JSON, JS) — versioned in the Git workspace
- **Binary** (images, sounds) — stored as immutable, content-addressed blobs

## How It Works

### Storing an Asset

```
Image bytes → SHA-256 hash → BlobStore.put(bytes, mimeType, meta)
                                ├── R2: blobs/{hash[0:2]}/{hash}
                                └── D1: assets table row
```

`BlobStore.put()` handles everything:
1. Computes SHA-256 of the bytes
2. Checks D1 for existing `content_hash` (dedup)
3. If new: uploads to R2, inserts D1 row
4. Returns `{ hash, assetId, isNew }`

Same bytes = same hash = stored once. Upload the same image 1000 times, it exists exactly once in R2.

### Referencing an Asset

Prefabs reference images via `assetId` — the SHA-256 content hash:

```json
{
  "id": "ball0",
  "visual": {
    "type": "image",
    "assetId": "a7bb3c4a3f63b209e8c4f2d1b5a9e7c3d6f8a1b4c7e0d3f6a9b2c5e8d1f4a7b0",
    "whatDescription": "a red bouncy ball",
    "imageWidth": 1.2,
    "imageHeight": 1.2
  }
}
```

Backgrounds and sounds use the same pattern:
```json
{ "background": { "type": "static", "assetId": "261671d54cbf..." } }
{ "sounds": { "bounce": { "assetId": "9a8b7c6d5e4f...", "type": "sfx" } } }
```

### Resolving at Runtime

When a game loads:

1. **Collect** — Walk the `GameDefinition`, gather all `assetId` values from prefabs, backgrounds, sounds
2. **Resolve** — Batch call `trpc.blobAssets.batchResolve({ hashes })` → returns `{ hash: url }` map
3. **Inject** — Set `visual.url`, `background.imageUrl`, `sound.url` on the definition
4. **Preload** — `AssetPreloader` downloads all images before the game starts
5. **Play** — Godot engine renders using the injected URLs

### Serving

```
GET /assets/blobs/a3/a3f2b8c9d4e5...
→ R2 lookup
→ Response with:
   Content-Type: image/png (stored at upload time)
   Cache-Control: public, max-age=31536000, immutable
   Cross-Origin-Resource-Policy: cross-origin
```

Content-addressed URLs are permanently cacheable — the hash guarantees the content never changes.

## Key Files

| File | Role |
|------|------|
| `api/src/services/BlobStore.ts` | Core: hash, dedup, store, URL generation |
| `api/src/trpc/routes/blob-assets.ts` | tRPC: upload, batchResolve, getUrl, exists |
| `api/src/index.ts` (`/assets/*` route) | HTTP: serve blobs from R2 with caching |
| `app/lib/assets/resolveAssetIds.ts` | App: collect hashes, resolve to URLs |
| `app/lib/assets/AssetManifest.ts` | App: build preload list from resolved definition |
| `app/lib/assets/AssetPreloader.ts` | App: download images before game starts |
| `app/lib/offline/download-manager.ts` | App: download blobs for offline play |
| `shared/src/types/asset-system.ts` | Types: AssetSchema, ThemeSchema, GenerationJobSchema |

## D1 Schema

```sql
CREATE TABLE assets (
  id TEXT PRIMARY KEY,                    -- UUID
  r2_key TEXT NOT NULL UNIQUE,            -- "blobs/{hh}/{hash}"
  content_hash TEXT,                      -- SHA-256 of file bytes
  width INTEGER,
  height INTEGER,
  creator_user_id TEXT REFERENCES users(id),
  source TEXT NOT NULL DEFAULT 'generated',  -- 'generated' | 'uploaded'
  theme_id TEXT REFERENCES themes(id),
  compiled_prompt TEXT,
  model_id TEXT,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE UNIQUE INDEX idx_assets_content_hash ON assets(content_hash)
  WHERE content_hash IS NOT NULL;
```

## Generating Assets

### Via CLI
```bash
hush run -- pnpm generate:assets --game=ballSort --theme="underwater"
```

### Via API (in-app)
```
trpc.assetSystem.createGenerationJob → queues generation tasks
trpc.assetSystem.processGenerationJob → runs Scenario.com pipeline
```

Both paths:
1. Generate image bytes via Scenario.com (txt2img or img2img)
2. Optional: remove background
3. `BlobStore.put(bytes)` → content hash
4. Store hash as `assetId` on the prefab

### Theme Planner

For multi-asset generation, the Theme Planner (LLM) creates a cohesive visual plan across all prefabs before generating individual images. This ensures visual consistency.

## Forking & Remixing

Fork a game = Git fork. The forked workspace has the same `assetId` references, pointing to the same blobs. Zero data duplication.

To "re-skin" a forked game: regenerate images with a new theme. Each generated image gets a new hash, the prefabs get new `assetId` values, and the fork diverges visually while sharing the same game logic.

## Offline Play

The download manager:
1. Downloads `definition.json` for the game
2. Parses it and collects all unique `assetId` hashes
3. Downloads each blob from `/assets/blobs/{hh}/{hash}` to local storage
4. At play time, resolves `assetId` → local file path instead of CDN URL
