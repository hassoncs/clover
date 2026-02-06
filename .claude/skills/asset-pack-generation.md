# Asset Pack Generation

> **Skill for AI Agents**: Generating themed asset packs for games using the Scenario.com pipeline.

## Overview

Asset packs are themed collections of images (balls, tubes, backgrounds, etc.) that can be swapped per game. Each pack has a UUID, a `manifest.json`, and PNG files stored in `r2/packs/{packId}/`.

## Quick Reference

### Generate a New Asset Pack

```bash
# From repo root (NOT from api/ directory)
hush run -- pnpm generate:assets \
  --game=<gameSlug> \
  --pack=<packName> \
  --theme="<theme description>" \
  --style=<pixel|cartoon|3d|flat> \
  --debug
```

**Example — Halloween cartoon pack for ballSort:**
```bash
hush run -- pnpm generate:assets \
  --game=ballSort \
  --pack=halloween \
  --theme="spooky Halloween with jack-o-lanterns, bats, cobwebs, and haunted night sky" \
  --style=cartoon \
  --debug
```

### CLI Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--game=<slug>` | Yes | Game slug (e.g., `ballSort`, `simple`, `slopeggle`) |
| `--pack=<name>` | No | Human-readable pack name (default: `default`) |
| `--pack-id=<uuid>` | No | Regenerate into an existing pack (overwrites assets) |
| `--theme="..."` | No | Theme prompt injected into AI generation |
| `--style=<style>` | No | Visual style: `pixel`, `cartoon`, `3d`, `flat` |
| `--templates=a,b,c` | No | Generate only specific templates (default: all) |
| `--debug` | No | Save intermediate pipeline files to `api/debug-output/` |
| `--dry-run` | No | Preview plan without generating |

### What Happens

1. Reads `r2/games/{gameSlug}/definition.json` to discover all templates with `visual.type: "image"`
2. For each template:
   - Creates a silhouette PNG from the template's physics shape
   - Builds a structured AI prompt from `whatDescription` + theme + style
   - Runs Scenario.com img2img (silhouette + prompt)
   - Removes background via Scenario.com
   - Saves final PNG to `r2/packs/{packId}/{templateId}.png`
3. Writes `r2/packs/{packId}/manifest.json`
4. Updates `r2/games/{gameSlug}/src/game.ts`:
   - Sets `activePackId` to the new pack UUID
   - Adds the UUID to the `packIds` array
5. Rebuilds all game definitions (`pnpm --filter @slopcade/api build:games`)

### After Generation

The script auto-sets the new pack as `activePackId`. If you want to keep the original default active:

1. Edit `r2/games/{gameSlug}/src/game.ts`
2. Change `activePackId` back to the previous UUID
3. Rebuild: `pnpm --filter @slopcade/api build:games`

### Switching Between Packs

To switch a game's active pack, change `activePackId` in the game's `assetSystem` config:

```typescript
// r2/games/ballSort/src/game.ts
assetSystem: {
  activePackId: "a1d20e15-...",  // default pack
  // activePackId: "12e102fa-...",  // halloween pack
  packIds: [
    "f661beb6-...",
    "a1d20e15-...",   // default
    "12e102fa-...",   // halloween
  ],
},
```

Then rebuild: `pnpm --filter @slopcade/api build:games`

## Key Paths

| Path | Purpose |
|------|---------|
| `r2/packs/{packId}/` | Pack directory with manifest.json + PNGs |
| `r2/games/{gameSlug}/src/game.ts` | Game source with `assetSystem` config |
| `r2/games/{gameSlug}/definition.json` | Compiled game definition (read by generator) |
| `api/scripts/generate-assets.ts` | The generation script |
| `api/src/ai/pipeline/executor.ts` | Pipeline executor (executeAsset) |
| `api/debug-output/{gameSlug}/` | Debug intermediates when `--debug` is used |

## Style Guide

| Style | Look |
|-------|------|
| `pixel` | 16-bit retro, crisp pixels, limited palette |
| `cartoon` | Bold outlines, vibrant colors, cel-shaded |
| `3d` | Stylized low-poly, soft shadows, matte materials |
| `flat` | Geometric shapes, solid colors, minimal |

## Existing Packs (ballSort)

| Pack Name | UUID | Description |
|-----------|------|-------------|
| (original) | `f661beb6-1e5e-4b9e-a01f-314c87248b75` | First generation |
| default | `a1d20e15-bc78-47bb-b0d4-01b75dfcbf35` | Current default (gumball candy) |
| halloween | `12e102fa-b833-4735-82ab-1c609b4a4fa6` | Halloween cartoon theme |

## Troubleshooting

### "API key required" or auth errors
Prefix with `hush run --` to inject secrets from the vault.

### "No definition.json found"
Run `pnpm --filter @slopcade/api build:games` first to compile the game.

### Assets not appearing in-app
1. Check `activePackId` in `game.ts` matches the pack UUID
2. Ensure template has `visual.type: "image"` (not `"rect"` or `"circle"`)
3. Rebuild after any changes

### Regenerating a single asset
```bash
hush run -- pnpm generate:assets \
  --game=ballSort \
  --pack-id=<existing-pack-uuid> \
  --templates=ball0 \
  --theme="..." \
  --style=cartoon \
  --debug
```
