# Asset Variations Planning - Notepad

## Research Summary (From Background Agents)

### Current Asset System (from exploration)
- **Core Types**: `GameEntity`, `EntityTemplate`, `AssetPack`, `AssetConfig`
- **Schema**: Zod schemas in `shared/src/types/schemas.ts`
- **Asset Types**: `EntityType` enum in `api/src/ai/assets.ts` (character, enemy, item, platform, background, ui)
- **Current Pipeline**:
  - Entity: silhouette → buildPrompt → uploadToScenario → img2img → removeBackground → uploadR2
  - Background: buildPrompt → txt2img → uploadR2
  - Title Hero: buildPrompt → txt2img → removeBackground → uploadR2
  - Parallax: buildPrompt → txt2img → layeredDecompose → uploadR2

### Sprite Sheet Best Practices (from librarian)
- **Grid-based prompting**: Use keywords like `sprite sheet`, `grid`, `multiple views`
- **Consistency tokens**: `same style`, `consistent`, `neutral background`
- **Data Model Pattern**:
  ```json
  {
    "frames": {
      "variant_0.png": { "frame": {"x":0,"y":0,"w":32,"h":32} },
      "variant_1.png": { "frame": {"x":32,"y":0,"w":32,"h":32} }
    },
    "meta": { "image": "spritesheet.png", "size": {"w":512,"h":512} }
  }
  ```
- **Key insight**: For variations, use Tags/Layers in metadata to define variants within same atlas

### Variation Patterns (from librarian)
- **Brick variations** (breakout): Same shape, different colors/styles
- **Tile sets**: Same shape, different textures
- **Peg colors** (peggle): Same shape, different colors
- **Pattern**: "Same shape + variations" = single generation + metadata for variants

## Key Files to Modify
1. `shared/src/types/schemas.ts` - Add new asset type schemas
2. `api/src/ai/assets.ts` - Add new AssetType values
3. `api/src/ai/pipeline/registry.ts` - Add new pipeline definitions
4. `api/src/ai/pipeline/prompt-builder.ts` - Add prompting for variations
5. `api/src/ai/pipeline/types.ts` - Add new AssetSpec types

## Questions to Resolve in Plan
1. Should sprite-sheet and variation-sheet be ONE type or TWO separate types?
2. How to handle slicing/metadata for variants?
3. How to prompt for variations (single prompt vs multiple)?
4. What new schema fields are needed?
5. How to integrate with existing AssetPack system?

## Resolution Notes (2026-01-24)
- Recommended a single unified `AssetSheet` discriminated union (`sprite` | `tile` | `variation`) with shared atlas/entry model.
- Prefer storing sheet + metadata (atlas regions) over slicing into many standalone PNGs; slicing can remain an optional compatibility stage.
- Prompting should be layout-first (explicit rows/cols, cell size, arrangement) and, when possible, guided by an img2img "sheet guide" image to force alignment.
- Integration should target `AssetPackV2` (`shared/src/types/asset-system.ts`) by extending `AssetPackEntry` to support binding to either a single image asset or a sheet entry.
