---
name: asset-pack-generation
description: "AI image generation pipeline for game assets. Covers Scenario.com, theme planning, silhouette-to-sprite, background removal, R2 upload, and asset pack management. Use when generating, debugging, or modifying game asset images."
---

# Asset Generation

> Generating themed assets for games using the AI image pipeline.

## Overview

Assets are AI-generated images (sprites, backgrounds, etc.) stored in the BlobStore (content-addressed R2 storage at `blobs/{hash[0:2]}/{hash}`). Each prefab with `visual.type: "image"` has an `assetId` pointing to a blob hash.

## Quick Reference

### Generate Assets for a Game

```bash
# From repo root (NOT from api/ directory)
hush run -- pnpm generate:assets \
  --game=<gameSlug> \
  --theme="<theme description>" \
  --style=<pixel|cartoon|3d|flat> \
  --debug
```

**Example — Halloween cartoon assets for ballSort:**
```bash
hush run -- pnpm generate:assets \
  --game=ballSort \
  --theme="spooky Halloween with jack-o-lanterns, bats, cobwebs, and haunted night sky" \
  --style=cartoon \
  --debug
```

### CLI Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--game=<slug>` | Yes | Game slug (e.g., `ballSort`, `simple`, `slopeggle`) |
| `--theme="..."` | No | Theme prompt injected into AI generation |
| `--style=<style>` | No | Visual style: `pixel`, `cartoon`, `3d`, `flat` |
| `--prefabs=a,b,c` | No | Generate only specific prefabs (default: all) |
| `--debug` | No | Save intermediate pipeline files to `api/debug-output/` |
| `--dry-run` | No | Preview plan without generating |
| `--plan-only` | No | Generate theme plan only, no images |
| `--reuse-plan=<path>` | No | Reuse a previously generated theme plan |
| `--planner-disable` | No | Skip AI theme planner, use legacy prompts |

### What Happens

1. Reads `r2/games/{gameSlug}/definition.json` to discover all prefabs with `visual.type: "image"`
2. For each prefab:
   - Creates a silhouette PNG from the prefab's physics shape
   - Builds a structured AI prompt from `whatDescription` + theme + style
   - Runs Scenario.com img2img (silhouette + prompt)
   - Removes background via Scenario.com
   - Saves final PNG to `r2/generated/{runId}/{prefabId}.png`
3. Rebuilds all game definitions

## Key Paths

| Path | Purpose |
|------|---------|
| `r2/blobs/` | Content-addressed blob storage (migrated images) |
| `r2/generated/{runId}/` | Output from CLI generation runs |
| `r2/games/{gameSlug}/definition.json` | Compiled game definition (read by generator) |
| `api/scripts/generate-assets.ts` | The generation script |
| `api/src/ai/pipeline/executor.ts` | Pipeline executor (executeAsset) |
| `api/src/services/BlobStore.ts` | Content-addressed storage service |
| `api/debug-output/{gameSlug}/` | Debug intermediates when `--debug` is used |

## Style Guide

| Style | Look |
|-------|------|
| `pixel` | 16-bit retro, crisp pixels, limited palette |
| `cartoon` | Bold outlines, vibrant colors, cel-shaded |
| `3d` | Stylized low-poly, soft shadows, matte materials |
| `flat` | Geometric shapes, solid colors, minimal |

## Troubleshooting

### "API key required" or auth errors
Prefix with `hush run --` to inject secrets from the vault.

### "No definition.json found"
Run `pnpm --filter @slopcade/api build:games` first to compile the game.

### Assets not appearing in-app
1. Ensure prefab has `visual.type: "image"` (not `"rect"` or `"circle"`)
2. Check that the prefab has an `assetId` set
3. Rebuild after any changes

### Regenerating a single asset
```bash
hush run -- pnpm generate:assets \
  --game=ballSort \
  --prefabs=ball0 \
  --theme="..." \
  --style=cartoon \
  --debug
```

## Consolidated from docs/ (2026-02-17)

### Unified Image Generation Architecture

The system supports both **Modal** (default) and **Scenario.com** providers through a single, consistent interface.

#### Key Principle: Single Entry Point
**All image generation goes through `AssetService`** (or pipeline adapters that wrap it). Never instantiate `ScenarioClient` or `ComfyUIClient` directly.

| ✅ Correct Usage | ❌ Incorrect Usage |
|------------------|--------------------|
| `new AssetService(env).generateAsset(...)` | `new ScenarioClient(...)` |
| `adapters.provider.txt2img(...)` | `new ComfyUIClient(...)` |

#### Provider Configuration (Env Vars)
| Variable | Required For | Description |
|----------|--------------|-------------|
| `IMAGE_GENERATION_PROVIDER` | Optional | `'scenario'` or `'modal'` (default) |
| `SCENARIO_API_KEY` | Scenario | Scenario API key |
| `SCENARIO_SECRET_API_KEY` | Scenario | Scenario API secret |
| `MODAL_ENDPOINT` | Modal | Custom Modal endpoint URL |

#### Provider Comparison
| Metric | Modal (Default) | Scenario.com |
|--------|-----------------|--------------|
| **Tech** | ComfyUI + Flux.1-dev-fp8 | Proprietary API |
| **Cold Start** | 2-3 min (first request) | None |
| **Warm Gen** | ~35s (512x512) | ~2-5s |
| **Cost** | Pay per GPU second | Credit-based ($45/mo min) |
| **Best For** | Dev / Low Volume | Prod / High Volume |

#### Recommended Image Sizes
- **Entity Sprites**: 256x256 (small), 512x512 (standard), 1024x1024 (hero)
- **Backgrounds**: 1024x512 (wide), 1024x1024 (square), 1024x1792 (tall)
- **UI Elements**: 256x256 (large button), 256x64 (standard), 256x32 (small)

### Content-Addressable Asset System

Binary assets (images, sounds) are stored as immutable, content-addressed blobs in R2.

#### Storage Flow (`BlobStore.put()`)
1. Compute SHA-256 of bytes.
2. Check D1 `assets` table for existing `content_hash` (deduplication).
3. If new: Upload to R2 (`blobs/{hash[0:2]}/{hash}`), insert D1 row.
4. Return `{ hash, assetId, isNew }`.

#### Runtime Resolution Pipeline
1. **Collect**: Walk `GameDefinition`, gather all `assetId` hashes.
2. **Resolve**: Call `trpc.blobAssets.batchResolve({ hashes })` → returns `{ hash: url }` map.
3. **Inject**: Set `visual.url`, `background.imageUrl`, `sound.url` on the definition.
4. **Preload**: `AssetPreloader` downloads all images before game start.
5. **Play**: Engine renders using injected URLs.

#### Serving & Caching
Blobs are served from `/assets/blobs/{hh}/{hash}` with:
- `Cache-Control: public, max-age=31536000, immutable`
- `Cross-Origin-Resource-Policy: cross-origin`

#### Forking & Remixing
- **Fork**: Git fork shares same `assetId` references (zero data duplication).
- **Remix**: Regenerate images → new hashes → new `assetId` values in prefabs.
