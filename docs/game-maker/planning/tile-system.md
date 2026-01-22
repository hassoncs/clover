# Tile System Implementation Plan

> **Phase 15: Tile Sheets & Tile Maps**
> Efficient grid-based rendering for backgrounds, platforms, and game worlds

---

## Executive Summary

**Problem**: Currently, all visual elements are rendered as individual sprites, which is inefficient for grid-based content like platformer levels, top-down maps, and repeating backgrounds. The AI already generates "tileable" assets, but there's no system to leverage them efficiently.

**Solution**: Implement a comprehensive tile system with:
1. Tile sheet asset type (sprite grids with metadata)
2. Tile map renderer using Skia's `Atlas` for batch rendering
3. Tile layer system (background, collision, foreground)
4. Simple in-app tile map editor
5. Integration with existing asset generation

**Benefits**:
- 🚀 **Performance**: Render 1000+ tiles in a single draw call with `Atlas`
- 🎨 **Efficiency**: Reuse tile assets across multiple games
- 🎮 **Game Types**: Unlock platformers, top-down games, puzzle games
- 🤖 **AI Ready**: Extend existing tileable asset generation
- ✂️ **Memory**: One sprite sheet vs. hundreds of individual images

**Estimated Timeline**: 1-2 weeks
- Phase 1 (Asset Types & Schema): 1-2 days
- Phase 2 (Rendering): 2-3 days
- Phase 3 (Editor): 3-4 days
- Phase 4 (AI Integration): 2-3 days
- Phase 5 (Polish & Testing): 1-2 days

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                      GameDefinition                         │
│  + tileSheets: TileSheet[]                                 │
│  + tileMaps: TileMap[]                                     │
└─────────────────┬──────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼────┐  ┌────▼─────┐  ┌───▼────────┐
│ Asset  │  │ TileMap  │  │   Editor   │
│  Gen   │  │ Renderer │  │    UI      │
└────────┘  └──────────┘  └────────────┘
    │             │             │
    │        ┌────▼────┐        │
    │        │  Atlas  │◄───────┘
    │        │ (Skia)  │
    │        └─────────┘
    │
    ▼
┌──────────────────┐
│  Scenario.com    │
│  Tile Gen Model  │
└──────────────────┘
```

---

## Phase 1: Asset Types & Schema

### 1.1 TileSheet Type

```typescript
// shared/src/types/tilemap.ts

export interface TileSheet {
  id: string;
  name: string;
  imageUrl: string;
  
  // Grid configuration
  tileWidth: number;        // In pixels
  tileHeight: number;       // In pixels
  columns: number;          // Tiles per row
  rows: number;             // Tiles per column
  spacing?: number;         // Spacing between tiles (default: 0)
  margin?: number;          // Margin around the sheet (default: 0)
  
  // Metadata
  tiles?: Record<number, TileMetadata>;  // Tile index -> metadata
  source?: AssetSource;     // 'generated' | 'uploaded' | 'none'
  style?: 'pixel' | 'cartoon' | '3d' | 'flat';
}

export interface TileMetadata {
  name?: string;
  tags?: string[];
  collision?: TileCollision;
  animation?: TileAnimation;
}

export type TileCollision = 
  | 'none'
  | 'full'                  // Entire tile is solid
  | 'platform'              // One-way platform (top only)
  | { polygon: Vec2[] };    // Custom collision shape

export interface TileAnimation {
  frames: number[];         // Tile indices for each frame
  fps: number;              // Animation speed
  loop?: boolean;           // Default: true
}
```

### 1.2 TileMap Type

```typescript
export interface TileMap {
  id: string;
  name: string;
  tileSheetId: string;      // Reference to TileSheet
  
  // Dimensions
  width: number;            // In tiles
  height: number;           // In tiles
  
  // Layers (render order: background → collision → foreground)
  layers: TileLayer[];
}

export interface TileLayer {
  id: string;
  name: string;
  type: 'background' | 'collision' | 'foreground' | 'decoration';
  visible: boolean;
  opacity: number;          // 0-1
  
  // Tile data (row-major order: [row0col0, row0col1, ..., row1col0, ...])
  data: number[];           // Tile indices (-1 = empty)
  
  // Layer properties
  parallaxFactor?: number;  // For background layers
  zIndex?: number;          // Render order within layer type
}

export interface TileMapEntity {
  type: 'tilemap';
  tileMapId: string;
  position: Vec2;           // World position (meters)
  scale?: number;           // Default: 1
  visible?: boolean;        // Default: true
}
```

### 1.3 Schema Updates

**Files to modify:**
- `shared/src/types/GameDefinition.ts` - Add `tileSheets` and `tileMaps` arrays
- `shared/src/types/schemas.ts` - Add Zod schemas for validation
- `api/src/ai/schemas.ts` - Sync for API validation

```typescript
// In GameDefinition.ts
export interface GameDefinition {
  // ... existing fields
  tileSheets?: TileSheet[];
  tileMaps?: TileMap[];
}
```

---

## Phase 2: Rendering System

### 2.1 TileMapRenderer Component

```typescript
// app/lib/game-engine/renderers/TileMapRenderer.tsx

import { Canvas, Atlas, useImage, rect, RSXform } from '@shopify/react-native-skia';
import type { TileMap, TileSheet } from '@slopcade/shared';

interface TileMapRendererProps {
  tileMap: TileMap;
  tileSheet: TileSheet;
  position: Vec2;           // World position
  pixelsPerMeter: number;
  cameraX?: number;         // For parallax
  cameraY?: number;
}

export function TileMapRenderer({
  tileMap,
  tileSheet,
  position,
  pixelsPerMeter,
  cameraX = 0,
  cameraY = 0,
}: TileMapRendererProps) {
  const image = useImage(tileSheet.imageUrl);
  
  if (!image) return null;
  
  return (
    <>
      {tileMap.layers
        .filter(layer => layer.visible)
        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
        .map(layer => (
          <TileLayerRenderer
            key={layer.id}
            layer={layer}
            tileMap={tileMap}
            tileSheet={tileSheet}
            image={image}
            position={position}
            pixelsPerMeter={pixelsPerMeter}
            cameraX={cameraX}
            cameraY={cameraY}
          />
        ))}
    </>
  );
}
```

### 2.2 TileLayerRenderer (Atlas-based)

```typescript
function TileLayerRenderer({
  layer,
  tileMap,
  tileSheet,
  image,
  position,
  pixelsPerMeter,
  cameraX,
  cameraY,
}: TileLayerRendererProps) {
  // Build sprite rectangles (source rects from tile sheet)
  const sprites = useMemo(() => {
    const result: SkRect[] = [];
    const { tileWidth, tileHeight, columns, spacing = 0, margin = 0 } = tileSheet;
    
    for (const tileIndex of layer.data) {
      if (tileIndex < 0) {
        result.push(rect(0, 0, 0, 0)); // Empty tile
      } else {
        const col = tileIndex % columns;
        const row = Math.floor(tileIndex / columns);
        const x = margin + col * (tileWidth + spacing);
        const y = margin + row * (tileHeight + spacing);
        result.push(rect(x, y, tileWidth, tileHeight));
      }
    }
    
    return result;
  }, [layer.data, tileSheet]);
  
  // Build transforms (destination positions)
  const transforms = useMemo(() => {
    const result: RSXform[] = [];
    const tileSizeMeters = tileSheet.tileWidth / pixelsPerMeter;
    
    // Apply parallax
    const parallaxFactor = layer.parallaxFactor ?? 1;
    const offsetX = -cameraX * (1 - parallaxFactor);
    const offsetY = -cameraY * (1 - parallaxFactor);
    
    for (let i = 0; i < layer.data.length; i++) {
      if (layer.data[i] < 0) {
        result.push(RSXform(1, 0, 0, 0)); // Hidden
        continue;
      }
      
      const col = i % tileMap.width;
      const row = Math.floor(i / tileMap.width);
      
      const worldX = (position.x + col * tileSizeMeters) * pixelsPerMeter + offsetX;
      const worldY = (position.y + row * tileSizeMeters) * pixelsPerMeter + offsetY;
      
      result.push(RSXform(1, 0, worldX, worldY));
    }
    
    return result;
  }, [layer, tileMap, tileSheet, position, pixelsPerMeter, cameraX, cameraY]);
  
  return (
    <Atlas
      image={image}
      sprites={sprites}
      transforms={transforms}
      opacity={layer.opacity}
    />
  );
}
```

### 2.3 Integration with EntityRenderer

```typescript
// In EntityRenderer.tsx

export function EntityRenderer({ entity, ... }: EntityRendererProps) {
  // ... existing sprite rendering
  
  if (entity.type === 'tilemap') {
    const tileMap = getTileMapById(entity.tileMapId);
    const tileSheet = getTileSheetById(tileMap.tileSheetId);
    
    return (
      <TileMapRenderer
        tileMap={tileMap}
        tileSheet={tileSheet}
        position={entity.position}
        pixelsPerMeter={pixelsPerMeter}
        cameraX={cameraX}
        cameraY={cameraY}
      />
    );
  }
  
  // ... rest of rendering
}
```

### 2.4 Collision Map Generation

```typescript
// app/lib/game-engine/TileMapPhysics.ts

export function createCollisionBodiesFromTileMap(
  physics: Physics2D,
  tileMap: TileMap,
  tileSheet: TileSheet
): string[] {
  const bodyIds: string[] = [];
  const collisionLayer = tileMap.layers.find(l => l.type === 'collision');
  
  if (!collisionLayer) return bodyIds;
  
  const tileSizeMeters = tileSheet.tileWidth / pixelsPerMeter;
  
  // Optimize: merge adjacent tiles into single boxes
  const rects = mergeAdjacentTiles(collisionLayer.data, tileMap.width);
  
  for (const rect of rects) {
    const bodyId = physics.createBody({
      type: 'static',
      position: vec2(
        rect.x * tileSizeMeters,
        rect.y * tileSizeMeters
      ),
    });
    
    physics.addFixture(bodyId, {
      shape: {
        type: 'box',
        width: rect.width * tileSizeMeters,
        height: rect.height * tileSizeMeters,
      },
      friction: 0.5,
      restitution: 0,
    });
    
    bodyIds.push(bodyId);
  }
  
  return bodyIds;
}

// Helper: merge adjacent collision tiles into rectangles
function mergeAdjacentTiles(data: number[], width: number): Rect[] {
  // Implementation: flood-fill algorithm to find rectangular regions
  // Returns array of {x, y, width, height} in tile coordinates
}
```

---

## Phase 3: Editor UI

### 3.1 Tile Palette Panel

```typescript
// app/components/editor/TilePalettePanel.tsx

export function TilePalettePanel({ tileSheet, onSelectTile }: Props) {
  const [selectedTile, setSelectedTile] = useState<number>(0);
  
  return (
    <ScrollView>
      <View className="grid grid-cols-8 gap-1 p-2">
        {Array.from({ length: tileSheet.columns * tileSheet.rows }).map((_, i) => (
          <Pressable
            key={i}
            onPress={() => {
              setSelectedTile(i);
              onSelectTile(i);
            }}
            className={cn(
              "border-2 aspect-square",
              selectedTile === i ? "border-blue-500" : "border-gray-300"
            )}
          >
            <TileThumbnail tileSheet={tileSheet} tileIndex={i} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
```

### 3.2 Tile Map Canvas

```typescript
// app/components/editor/TileMapCanvas.tsx

export function TileMapCanvas({ tileMap, tileSheet, selectedTile }: Props) {
  const handleCanvasTap = useCallback((x: number, y: number) => {
    // Convert screen coords to tile coords
    const tileX = Math.floor(x / (tileSheet.tileWidth * scale));
    const tileY = Math.floor(y / (tileSheet.tileHeight * scale));
    
    // Update tile data
    const index = tileY * tileMap.width + tileX;
    updateTileData(tileMap.id, activeLayer, index, selectedTile);
  }, [tileMap, tileSheet, selectedTile, activeLayer]);
  
  return (
    <Canvas onTouch={handleCanvasTap}>
      <TileMapRenderer
        tileMap={tileMap}
        tileSheet={tileSheet}
        position={{ x: 0, y: 0 }}
        pixelsPerMeter={50}
      />
      
      {/* Grid overlay */}
      <Grid
        width={tileMap.width}
        height={tileMap.height}
        tileSize={tileSheet.tileWidth}
      />
    </Canvas>
  );
}
```

### 3.3 Layer Management UI

```typescript
// app/components/editor/LayerPanel.tsx

export function LayerPanel({ tileMap, onUpdateLayer }: Props) {
  return (
    <View className="bg-gray-100 p-2">
      <Text className="font-bold mb-2">Layers</Text>
      
      {tileMap.layers.map((layer) => (
        <View key={layer.id} className="flex-row items-center mb-2">
          <Switch
            value={layer.visible}
            onValueChange={(visible) => onUpdateLayer(layer.id, { visible })}
          />
          <Text className="ml-2">{layer.name}</Text>
          <Text className="ml-auto text-gray-500">{layer.type}</Text>
        </View>
      ))}
      
      <Button onPress={onAddLayer}>+ Add Layer</Button>
    </View>
  );
}
```

### 3.4 Editor Route

```typescript
// app/app/editor/tilemap/[id].tsx

export default function TileMapEditorScreen() {
  const { id } = useLocalSearchParams();
  const [tileMap, setTileMap] = useState<TileMap | null>(null);
  const [tileSheet, setTileSheet] = useState<TileSheet | null>(null);
  const [selectedTile, setSelectedTile] = useState(0);
  const [activeLayer, setActiveLayer] = useState(0);
  
  return (
    <View className="flex-1 flex-row">
      {/* Left: Tile Palette */}
      <View className="w-64 bg-white">
        <TilePalettePanel
          tileSheet={tileSheet}
          onSelectTile={setSelectedTile}
        />
      </View>
      
      {/* Center: Canvas */}
      <View className="flex-1">
        <TileMapCanvas
          tileMap={tileMap}
          tileSheet={tileSheet}
          selectedTile={selectedTile}
          activeLayer={activeLayer}
        />
      </View>
      
      {/* Right: Layers */}
      <View className="w-64 bg-white">
        <LayerPanel
          tileMap={tileMap}
          onUpdateLayer={handleUpdateLayer}
        />
      </View>
    </View>
  );
}
```

---

## Phase 4: AI Integration

### 4.1 Tile Sheet Generation

**Extend Scenario.com integration:**

```typescript
// api/src/ai/tiles.ts

export async function generateTileSheet(
  prompt: string,
  options: {
    tileSize: number;           // 16, 32, 64, etc.
    columns: number;            // Tiles per row
    rows: number;               // Tiles per column
    style: 'pixel' | 'cartoon' | '3d' | 'flat';
  }
): Promise<TileSheet> {
  // Calculate final image size
  const width = options.columns * options.tileSize;
  const height = options.rows * options.tileSize;
  
  // Generate with Scenario.com
  const result = await scenario.generateImage({
    prompt: `tileset, ${prompt}, ${options.style} art, seamless tiles, sprite sheet, game assets, ${options.columns}x${options.rows} grid`,
    width,
    height,
    model: 'model_retrodiffusion-tile',
    negative_prompt: 'blurry, text, watermark',
  });
  
  // Upload to R2
  const imageUrl = await uploadToR2(result.image);
  
  // Create TileSheet object
  return {
    id: generateId(),
    name: prompt,
    imageUrl,
    tileWidth: options.tileSize,
    tileHeight: options.tileSize,
    columns: options.columns,
    rows: options.rows,
    source: 'generated',
    style: options.style,
  };
}
```

### 4.2 Tile Map Generation from Prompt

```typescript
// api/src/ai/tilemap-generator.ts

export async function generateTileMapFromPrompt(
  prompt: string
): Promise<{ tileSheet: TileSheet; tileMap: TileMap }> {
  // Step 1: Extract requirements from prompt
  const analysis = await analyzeTileMapPrompt(prompt);
  
  // Step 2: Generate tile sheet
  const tileSheet = await generateTileSheet(
    analysis.tileTheme,
    {
      tileSize: analysis.tileSize,
      columns: analysis.tileset.columns,
      rows: analysis.tileset.rows,
      style: analysis.style,
    }
  );
  
  // Step 3: Generate tile map layout with LLM
  const tileMap = await generateTileMapLayout(tileSheet, analysis);
  
  return { tileSheet, tileMap };
}

async function analyzeTileMapPrompt(prompt: string) {
  // Use LLM to extract:
  // - tileTheme: "grass and stone platformer"
  // - tileSize: 32
  // - style: 'pixel'
  // - width: 20 tiles
  // - height: 15 tiles
  // - layout: "platforms with gaps, ground at bottom"
}

async function generateTileMapLayout(
  tileSheet: TileSheet,
  analysis: TileMapAnalysis
): Promise<TileMap> {
  // Use LLM to generate tile indices based on layout description
  const prompt = `Generate a tile map layout for a ${analysis.layout}.
    You have ${tileSheet.columns * tileSheet.rows} tiles available.
    Return a ${analysis.width}x${analysis.height} grid of tile indices (0-indexed, -1 for empty).`;
  
  // Get LLM response with structured output
  const layout = await llm.generate(prompt);
  
  return {
    id: generateId(),
    name: analysis.tileTheme,
    tileSheetId: tileSheet.id,
    width: analysis.width,
    height: analysis.height,
    layers: [
      {
        id: generateId(),
        name: 'Background',
        type: 'background',
        visible: true,
        opacity: 1,
        data: layout.backgroundData,
      },
      {
        id: generateId(),
        name: 'Collision',
        type: 'collision',
        visible: true,
        opacity: 1,
        data: layout.collisionData,
      },
    ],
  };
}
```

### 4.3 tRPC Routes

```typescript
// api/src/trpc/routes/tiles.ts

export const tilesRouter = t.router({
  generateSheet: t.procedure
    .input(z.object({
      prompt: z.string(),
      tileSize: z.number(),
      columns: z.number(),
      rows: z.number(),
      style: z.enum(['pixel', 'cartoon', '3d', 'flat']),
    }))
    .mutation(async ({ input }) => {
      return await generateTileSheet(input.prompt, input);
    }),
  
  generateMap: t.procedure
    .input(z.object({
      prompt: z.string(),
    }))
    .mutation(async ({ input }) => {
      return await generateTileMapFromPrompt(input.prompt);
    }),
  
  updateTile: t.procedure
    .input(z.object({
      tileMapId: z.string(),
      layerId: z.string(),
      index: z.number(),
      tileIndex: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Update tile data in D1
      // Return updated tile map
    }),
});
```

---

## Phase 5: Polish & Optimization

### 5.1 Performance Optimizations

```typescript
// Culling: only render visible tiles
function cullTiles(
  layer: TileLayer,
  tileMap: TileMap,
  cameraRect: Rect
): { visibleIndices: number[]; transforms: RSXform[] } {
  const visibleIndices: number[] = [];
  const transforms: RSXform[] = [];
  
  for (let i = 0; i < layer.data.length; i++) {
    const col = i % tileMap.width;
    const row = Math.floor(i / tileMap.width);
    
    // Check if tile is in camera view
    if (isTileVisible(col, row, cameraRect)) {
      visibleIndices.push(i);
      transforms.push(/* calculate transform */);
    }
  }
  
  return { visibleIndices, transforms };
}
```

### 5.2 Tile Autotiling

```typescript
// Auto-select tile variants based on neighbors (e.g., corners, edges)
function autoTile(
  layer: TileLayer,
  tileMap: TileMap,
  tileSheet: TileSheet
): number[] {
  // Implement Blob/Bitmask autotiling algorithm
  // See: https://gamedevelopment.tutsplus.com/tutorials/how-to-use-tile-bitmasking-to-auto-tile-your-level-layouts--cms-25673
}
```

### 5.3 Tile Animation Support

```typescript
// Update animated tiles each frame
function updateAnimatedTiles(
  layer: TileLayer,
  tileSheet: TileSheet,
  deltaTime: number
): number[] {
  const newData = [...layer.data];
  
  layer.data.forEach((tileIndex, i) => {
    const metadata = tileSheet.tiles?.[tileIndex];
    if (metadata?.animation) {
      const frameIndex = getAnimationFrame(metadata.animation, deltaTime);
      newData[i] = metadata.animation.frames[frameIndex];
    }
  });
  
  return newData;
}
```

### 5.4 Export/Import

```typescript
// Export tile map to JSON
export function exportTileMap(tileMap: TileMap): string {
  return JSON.stringify(tileMap, null, 2);
}

// Import from Tiled Map Editor (.tmx)
export function importFromTiled(tmxFile: string): TileMap {
  // Parse TMX XML format
  // Convert to our TileMap format
}
```

---

## Testing Plan

### Unit Tests

```typescript
// app/lib/game-engine/__tests__/TileMapRenderer.test.tsx

describe('TileMapRenderer', () => {
  it('renders all visible layers', () => {
    const tileMap = createMockTileMap();
    const { getByTestId } = render(<TileMapRenderer tileMap={tileMap} />);
    expect(getByTestId('layer-background')).toBeDefined();
  });
  
  it('applies parallax to background layers', () => {
    // Test parallax offset calculation
  });
  
  it('culls offscreen tiles', () => {
    // Test that only visible tiles are rendered
  });
});
```

### Integration Tests

```typescript
// Test full flow: generate tile sheet → create tile map → render → collision
describe('Tile System Integration', () => {
  it('generates tile sheet from prompt', async () => {
    const result = await generateTileSheet('grass platformer', {
      tileSize: 32,
      columns: 8,
      rows: 8,
      style: 'pixel',
    });
    expect(result.imageUrl).toMatch(/^https:\/\//);
  });
  
  it('creates collision bodies from tile map', () => {
    const bodies = createCollisionBodiesFromTileMap(physics, tileMap, tileSheet);
    expect(bodies.length).toBeGreaterThan(0);
  });
});
```

### Visual Tests (Storybook)

```typescript
// components/examples/TileMapDemo.stories.tsx

export const PlatformerLevel: Story = {
  args: {
    tileMap: platformerTileMap,
    tileSheet: grassTileSheet,
  },
};

export const TopDownDungeon: Story = {
  args: {
    tileMap: dungeonTileMap,
    tileSheet: dungeonTileSheet,
  },
};
```

---

## Migration Strategy

### Backward Compatibility

Existing games continue to work without changes. New tile features are opt-in:

```typescript
// GameDefinition is backward compatible
export interface GameDefinition {
  // ... existing fields work as-is
  tileSheets?: TileSheet[];      // Optional: new field
  tileMaps?: TileMap[];          // Optional: new field
}
```

### Incremental Adoption

**Phase 1**: Use tile sheets for backgrounds only (no collision)
**Phase 2**: Add collision layer support
**Phase 3**: Enable tile map editor
**Phase 4**: AI-generated tile maps from prompts

---

## Documentation Updates

### New Files

- `docs/game-maker/reference/tile-system.md` - Complete tile system reference
- `docs/game-maker/guides/creating-tile-maps.md` - User guide for editor
- `docs/game-maker/guides/tile-sheet-best-practices.md` - Tile size, grid layout tips

### Updated Files

- `docs/game-maker/reference/entity-system.md` - Add TileMapEntity
- `docs/game-maker/reference/asset-generation.md` - Add tile sheet generation
- `docs/game-maker/planning/implementation-roadmap.md` - Add Phase 15

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Render Performance | 1000+ tiles at 60fps |
| Memory Usage | <50MB for 100x100 tile map |
| Editor Usability | <5 min to create basic level |
| AI Generation Quality | >70% usable without manual editing |
| Collision Accuracy | 100% match between visual and physics |

---

## Future Enhancements (Post-MVP)

- **Tile Set Variants**: Multiple tile sheets per map (biome blending)
- **Destructible Tiles**: Dynamic tile removal/replacement
- **Tile Decorations**: Overlay objects on tiles (flowers, cracks)
- **Procedural Generation**: Wave Function Collapse for tile layout
- **Physics Tiles**: Water, ice, lava with special properties
- **Lighting**: Per-tile light emission and shadows
- **3D Tiles**: Isometric/dimetric projection support

---

## Dependencies

### Required Packages (Already Installed)
- `@shopify/react-native-skia` - For `Atlas` rendering
- `react-native-reanimated` - For tile animations

### New tRPC Routes
- `tiles.generateSheet` - Generate tile sheet from prompt
- `tiles.generateMap` - Generate tile map from prompt
- `tiles.updateTile` - Update single tile in map
- `tiles.importTiled` - Import from Tiled Map Editor (optional)

### Storage
- R2 bucket for tile sheet images (already exists)
- D1 tables for tile sheets and tile maps (new tables)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Atlas performance issues on Android | Medium | High | Implement fallback to individual Images |
| Tile sheet generation quality | Medium | Medium | Pre-made tile sets as fallback |
| Editor complexity for kids | Low | Medium | Simple paint-style interface, templates |
| Physics collision performance | Low | High | Rectangle merging optimization |
| Memory usage for large maps | Low | Medium | Tile culling, lazy loading |

---

## Open Questions

1. **Tile Size Standard**: Should we enforce a standard tile size (16x16, 32x32, 64x64)?
   - **Recommendation**: Support multiple sizes, but default to 32x32 for pixel art, 64x64 for cartoon.

2. **Editor Scope**: How complex should the editor be for MVP?
   - **Recommendation**: Start with paint tool + layer visibility. Add flood fill and eraser in Phase 2.

3. **AI Integration**: Should tile maps be generated automatically during game generation?
   - **Recommendation**: Make it optional. Generate on-demand when user clicks "Generate Background" button.

4. **Export Format**: Should we support importing from Tiled (.tmx)?
   - **Recommendation**: Yes, but as a post-MVP enhancement. Focus on native format first.

5. **Collision Optimization**: Should we use Box2D's chain shapes or merged rectangles?
   - **Recommendation**: Merged rectangles for now (simpler). Chain shapes as future optimization.

---

## Conclusion

The tile system is a natural evolution of the existing asset and rendering systems. By leveraging Skia's `Atlas` component and the existing tileable asset generation, you can add powerful grid-based rendering capabilities with minimal disruption to the current architecture.

**Key Wins:**
- 🚀 Unlock platformer and top-down game types
- 🎨 Leverage existing tileable asset generation
- 🎯 Maintain performance (60fps with 1000+ tiles)
- 🧩 Simple editor for manual level design
- 🤖 AI-generated levels from prompts

**Recommended Approach:**
1. Start with Phase 1-2 (asset types + rendering) - **3-4 days**
2. Test with manually created tile maps
3. Add editor (Phase 3) - **3-4 days**
4. AI integration (Phase 4) as enhancement - **2-3 days**

**Total: 1-2 weeks for full implementation**
