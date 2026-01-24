# Type-Driven Asset Generation Pipeline

**Status**: active
**Source**: docs
**Created**: 2026-01-24
**Updated**: 2026-01-24

## Objective

AI-generated game sprites, backgrounds, and title images with physics-aware silhouette generation

## Progress

- [x] Silhouette creation from physics dimensions
- [x] Scenario.com API integration (img2img, txt2img, background removal)
- [x] R2 storage upload via Wrangler
- [x] Debug output for all pipeline stages
- [x] Godot sprite scaling logic for square textures
- [x] Working example: generate-physics-stacker-assets.ts
- [ ] Implement sprite sheet generation (see ht-002)

## Blockers

- [ht-002] Implement Sheet Prompt Builder

## Notes

Comprehensive documentation in docs/asset-generation-knowledge.md and docs/asset-pipeline.md

### Asset Types

| Type | Pipeline | Description |
|------|----------|-------------|
| `entity` | silhouette → img2img → removeBg → R2 | Physics-constrained sprites |
| `background` | txt2img → R2 | Full-frame backgrounds |
| `title_hero` | txt2img → removeBg → R2 | Game title logos |
| `parallax` | txt2img → layeredDecompose → R2 | Multi-layer backgrounds |

### CLI Usage

```bash
# Generate all assets for a game
npx tsx api/scripts/generate-game-assets.ts slopeggle

# Dry run (preview without API calls)
npx tsx api/scripts/generate-game-assets.ts slopeggle --dry-run

# Generate single asset
npx tsx api/scripts/generate-game-assets.ts slopeggle --asset=ball
```

### Key Files
- `api/src/ai/pipeline/` - Pipeline core (types, stages, executor)
- `api/src/ai/pipeline/registry.ts` - Asset type → stage mapping
- `api/src/ai/scenario.ts` - Scenario.com API client
- `api/src/ai/assets.ts` - AssetService main entry point
