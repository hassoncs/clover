---
name: asset-pack-generation
description: "AI image generation pipeline for game assets. Covers Scenario.com, theme planning, silhouette-to-sprite, background removal, R2 upload, and asset pack management. Use when generating, debugging, or modifying game asset images."
---

# Asset Generation

> **Skill for AI Agents**: Generating themed assets for games using the AI image pipeline.

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
