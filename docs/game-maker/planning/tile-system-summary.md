# Tile System - Status & Recommendation Summary

**Date**: January 22, 2026  
**Status**: Not Implemented (Planned for Phase 15)

---

## Current Status

### ✅ What You Already Have

1. **Asset System**: Individual sprite management with `AssetConfig` and `AssetPack`
2. **AI Tile Generation**: Already generating "tileable seamless patterns" using `model_retrodiffusion-tile`
3. **Skia Rendering**: `ImageRenderer` with efficient rendering pipeline
4. **Parallax Backgrounds**: Multi-layer background system exists
5. **Documentation**: Technical primitives doc mentions tile concepts (but not implemented)

### ❌ What's Missing

- **No tile sheet asset type** - Can't define sprite grids
- **No tile map renderer** - Can't render grids efficiently
- **No `Atlas` implementation** - Missing Skia's batch rendering feature
- **No tile layers** - No background/collision/foreground separation
- **No tile map editor** - No way to design grid-based levels
- **No collision from tiles** - Can't generate physics from tile data

### 🎯 The Gap

Currently, you generate "tileable" images but use them on individual entities. For a platformer level with 1000 tiles, you'd render 1000 separate `ImageRenderer` components instead of 1 batch `Atlas` render.

---

## Recommendation: Build It

**Priority**: **High** (MVP+1)  
**Estimated Timeline**: 1-2 weeks  
**Complexity**: Medium

### Why Build This?

**Immediate Value:**
- Unlock platformer games (Mario-style)
- Unlock top-down games (Zelda-style)
- Unlock puzzle games with grid layouts
- 10-100x performance improvement for grid content

**Technical Benefits:**
- Leverage existing tileable asset generation
- Use Skia's `Atlas` for 1 draw call vs. 1000
- Reduce memory usage (1 sprite sheet vs. 100 images)
- Natural fit with existing architecture

**User Benefits:**
- Kids can create Mario-style platformers
- In-app level editor for manual design
- AI can generate entire levels from prompts
- Fast iteration on level design

### Game Types This Unlocks

| Game Type | Current Status | With Tiles |
|-----------|----------------|------------|
| Platformer (Mario) | ❌ Inefficient | ✅ Optimized |
| Top-down (Zelda) | ❌ Not possible | ✅ Full support |
| Puzzle (Tetris) | ✅ Works | ✅ Better performance |
| Tower Defense | ❌ Hard to build | ✅ Grid-based paths |
| Metroidvania | ❌ Not practical | ✅ Large world support |

---

## Implementation Plan

### Phase 1: Asset Types (1-2 days)
- Add `TileSheet` and `TileMap` types to `GameDefinition`
- Define tile metadata (collision, animation)
- Update Zod schemas for validation

### Phase 2: Rendering (2-3 days)
- Implement `TileMapRenderer` using Skia's `Atlas`
- Support multiple layers with z-index
- Add parallax support for background layers
- Implement tile culling (only render visible)

### Phase 3: Editor (3-4 days)
- Tile palette UI (select tiles from sheet)
- Canvas with paint tool
- Layer management panel
- Grid overlay

### Phase 4: AI Integration (2-3 days)
- Extend Scenario.com to generate tile sheets
- LLM generates tile map layouts from prompts
- Add tRPC routes (`tiles.generateSheet`, `tiles.generateMap`)

### Phase 5: Physics (1-2 days)
- Generate Box2D collision bodies from tile data
- Optimize with rectangle merging
- Support one-way platforms

---

## Performance Impact

### Before (Current System)
```
1000 platform tiles = 1000 ImageRenderer components
= 1000 draw calls
= ~30fps on mobile
= ~100MB memory
```

### After (With Tiles)
```
1000 platform tiles = 1 Atlas component
= 1 draw call
= 60fps on mobile
= ~10MB memory
```

**Expected improvement: 10-100x for grid-based content**

---

## Example: Platformer Level

### Without Tiles (Current)
```typescript
// Create 100 individual platform entities
entities: [
  { id: '1', template: 'platform', x: 0, y: 10 },
  { id: '2', template: 'platform', x: 1, y: 10 },
  { id: '3', template: 'platform', x: 2, y: 10 },
  // ... 97 more
]
```

### With Tiles (Proposed)
```typescript
// Define tile sheet once
tileSheets: [{
  id: 'grass-tiles',
  imageUrl: 'https://r2.../grass-32x32.png',
  tileWidth: 32,
  tileHeight: 32,
  columns: 8,
  rows: 4,
}],

// Define tile map (1 entity, 1000 tiles)
tileMaps: [{
  id: 'level-1',
  tileSheetId: 'grass-tiles',
  width: 50,
  height: 20,
  layers: [
    { name: 'Background', type: 'background', data: [...] },
    { name: 'Collision', type: 'collision', data: [...] },
  ],
}],

// Reference in entities
entities: [
  { type: 'tilemap', tileMapId: 'level-1', position: { x: 0, y: 0 } },
]
```

---

## User Experience Flow

### Creating a Platformer Level

**Step 1**: Generate tile sheet
```
User: "Create a grass and stone platformer tileset"
AI: Generates 8x4 tile sheet with grass, stone, corners, edges
```

**Step 2**: Open tile map editor
```
User: Taps "Edit Level"
UI: Shows tile palette + canvas + layer panel
```

**Step 3**: Paint level
```
User: Selects grass tile, paints ground
User: Selects stone tile, paints platforms
User: Toggles collision layer, marks solid tiles
```

**Step 4**: Play
```
User: Taps "Play"
Engine: Generates collision bodies from tile data
Game: Runs at 60fps with 1000+ tiles
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Atlas performance on Android | High | Implement fallback to individual Images |
| Tile sheet quality from AI | Medium | Provide pre-made tile sets |
| Editor complexity for kids | Medium | Start with simple paint tool |
| Physics performance | Low | Rectangle merging optimization |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Render Performance | 1000+ tiles at 60fps |
| Memory Usage | <50MB for 100x100 tile map |
| Editor Usability | <5 min to create basic level |
| AI Generation Quality | >70% usable without manual editing |

---

## Next Steps

1. **Review this plan** with team
2. **Create Phase 15 milestone** in project tracking
3. **Start with Phase 1** (asset types) - low risk, high value
4. **Test rendering** with manually created tile sheets
5. **Build editor** after validating performance
6. **Add AI generation** last (enhancement)

---

## Questions?

1. **Should we support multiple tile sizes?**
   - Recommendation: Yes, but default to 32x32 (pixel) and 64x64 (cartoon)

2. **How complex should the editor be?**
   - Recommendation: Start simple (paint + eraser). Add flood fill later.

3. **Should AI generate tile maps automatically?**
   - Recommendation: Make it on-demand (user clicks "Generate Level")

4. **Should we import from Tiled Map Editor?**
   - Recommendation: Yes, but post-MVP. Focus on native format first.

---

## Related Documentation

- **Full Plan**: [tile-system.md](./tile-system.md)
- **Roadmap**: [implementation-roadmap.md](./implementation-roadmap.md) (Phase 15)
- **Technical Primitives**: [../reference/technical-primitives.md](../reference/technical-primitives.md)
- **Asset Generation**: [../reference/asset-generation.md](../reference/asset-generation.md)
