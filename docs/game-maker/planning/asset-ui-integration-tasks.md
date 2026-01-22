# Asset-Game UI Integration - Implementation Tasks

> **Created**: 2026-01-21  
> **Status**: ✅ COMPLETE (Pending E2E Testing)  
> **Context**: Connecting AI-generated graphics with physics game engine

---

## Executive Summary

All code implementation is **COMPLETE**. Pending E2E testing with real Scenario.com API.

### What's DONE ✅
1. **Schema & Data Model** - `AssetPackSchema`, `AssetConfigSchema`, `ParallaxConfigSchema` all defined
2. **Backend APIs** - All endpoints wired including new `deletePack`
3. **Rendering Pipeline** - `EntityRenderer` accepts `assetOverrides`, `ImageRenderer` renders via Skia, `ParallaxBackground` works
4. **Basic UI** - "🎨 Skin" button, asset generation modal, pack selection
5. **Style Selection** - Dropdown for pixel/cartoon/3d/flat
6. **Per-entity Management** - `EntityAssetList` component with regenerate/clear
7. **Delete Asset Packs** - `deletePack` endpoint + UI delete button
8. **Parallax Generation** - `ParallaxAssetPanel` component with layer management
9. **Progress Indicators** - ActivityIndicator on all async operations

### Remaining (Future Enhancements)
1. Asset preview before applying (nice-to-have)
2. Asset offset/scale adjustment controls (nice-to-have)
3. E2E testing with real API (HUMAN TASK - requires API keys)

---

## Current Implementation Status

### Key Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `api/src/ai/scenario.ts` | Scenario.com API client | ✅ Complete |
| `api/src/ai/assets.ts` | AssetService with model matrix | ✅ Complete |
| `api/src/trpc/routes/assets.ts` | tRPC routes for asset generation | ✅ Complete |
| `api/src/ai/schemas.ts` | Zod schemas (AssetPackSchema, etc.) | ✅ Complete |
| `shared/src/types/GameDefinition.ts` | AssetPack, AssetConfig types | ✅ Complete |
| `app/lib/game-engine/renderers/EntityRenderer.tsx` | Asset override logic | ✅ Complete |
| `app/lib/game-engine/renderers/ImageRenderer.tsx` | Skia image rendering | ✅ Complete |
| `app/lib/game-engine/renderers/ParallaxBackground.tsx` | Parallax layers | ✅ Complete |
| `app/lib/game-engine/GameRuntime.native.tsx` | Computes assetOverrides from pack | ✅ Complete |
| `app/app/play/[id].tsx` | Play screen with basic asset UI | 🔄 80% Complete |

### Existing tRPC Endpoints (api/src/trpc/routes/assets.ts)

```typescript
// Already implemented:
assets.generate          // Generate single asset
assets.generateBatch     // Generate multiple assets
assets.generateForGame   // Generate assets for all templates in game
assets.setTemplateAsset  // Set specific template's asset
assets.regenerateTemplateAsset // Regenerate specific template
assets.updatePackMetadata // Update pack name/description
assets.generateBackgroundLayer // Generate parallax layer
assets.updateParallaxConfig // Update parallax settings
assets.list              // List assets
assets.get               // Get single asset
```

### Schema Definitions (Current)

From `api/src/ai/schemas.ts`:
```typescript
export const AssetConfigSchema = z.object({
  imageUrl: z.string().optional(),
  source: z.enum(['generated', 'uploaded', 'none']).optional(),
  scale: z.number().optional(),
  offsetX: z.number().optional(),
  offsetY: z.number().optional(),
  animations: z.array(z.object({
    name: z.string(),
    frames: z.array(z.string()),
    frameRate: z.number().optional(),
  })).optional(),
});

export const AssetPackSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  style: z.enum(['pixel', 'cartoon', '3d', 'flat']).optional(),
  assets: z.record(z.string(), AssetConfigSchema),
});

export const ParallaxLayerSchema = z.object({
  depth: z.enum(['sky', 'far', 'mid', 'near']),
  imageUrl: z.string().optional(),
  parallaxFactor: z.number().optional(),
  visible: z.boolean().optional(),
});

export const ParallaxConfigSchema = z.object({
  enabled: z.boolean().optional(),
  layers: z.array(ParallaxLayerSchema).optional(),
});
```

---

## Implementation Tasks (Priority Order)

### Phase 1: Manual E2E Verification (BLOCKING - Do First)

**Goal**: Verify the current pipeline works end-to-end before adding features.

**Steps**:
1. Start the app: `pnpm dev` (or check if services are running)
2. Navigate to a saved game or create one via the Create tab
3. Click "🎨 Skin" button on play screen
4. Enter a theme prompt and click "Generate New"
5. Verify:
   - Generation completes without errors
   - Asset pack appears in selection list
   - Selecting the pack changes game visuals
   - Images load correctly (no broken images)

**If issues found**: Fix them before proceeding to Phase 2.

### Phase 2: Style Selection Dropdown

**File to modify**: `app/app/play/[id].tsx`

**Changes**:
1. Add state: `const [selectedStyle, setSelectedStyle] = useState<'pixel' | 'cartoon' | '3d' | 'flat'>('pixel');`
2. Add dropdown UI in the modal (before Generate button):
```tsx
<Text className="text-gray-400 mb-2">Art Style</Text>
<View className="flex-row gap-2 mb-4">
  {(['pixel', 'cartoon', '3d', 'flat'] as const).map(style => (
    <Pressable
      key={style}
      className={`py-2 px-3 rounded-lg ${selectedStyle === style ? 'bg-indigo-600' : 'bg-gray-700'}`}
      onPress={() => setSelectedStyle(style)}
    >
      <Text className="text-white capitalize">{style}</Text>
    </Pressable>
  ))}
</View>
```
3. Pass style to API call:
```typescript
const result = await trpc.assets.generateForGame.mutate({
  gameId: id,
  prompt: genPrompt || gameDefinition.metadata.title,
  style: selectedStyle,  // ADD THIS
});
```

**Verification**: Generate with different styles, confirm assets match style.

### Phase 3: Per-Entity Asset Management

**New component**: `app/components/assets/EntityAssetList.tsx`

```tsx
import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import type { GameDefinition, AssetPack } from '@slopcade/shared';

interface Props {
  gameDefinition: GameDefinition;
  activePack: AssetPack | null;
  onRegenerateAsset: (templateId: string) => void;
  onClearAsset: (templateId: string) => void;
}

export function EntityAssetList({ gameDefinition, activePack, onRegenerateAsset, onClearAsset }: Props) {
  const templates = Object.entries(gameDefinition.templates || {});
  
  return (
    <ScrollView className="max-h-64">
      {templates.map(([templateId, template]) => {
        const asset = activePack?.assets?.[templateId];
        return (
          <View key={templateId} className="flex-row items-center p-2 bg-gray-700 rounded mb-2">
            {asset?.imageUrl ? (
              <Image source={{ uri: asset.imageUrl }} className="w-12 h-12 rounded" />
            ) : (
              <View 
                className="w-12 h-12 rounded" 
                style={{ backgroundColor: template.sprite?.color || '#666' }}
              />
            )}
            <View className="flex-1 ml-3">
              <Text className="text-white font-medium">{templateId}</Text>
              <Text className="text-gray-400 text-xs">
                {asset?.imageUrl ? 'Generated' : 'Shape fallback'}
              </Text>
            </View>
            <Pressable 
              className="p-2 bg-indigo-600 rounded mr-2"
              onPress={() => onRegenerateAsset(templateId)}
            >
              <Text className="text-white text-xs">🔄</Text>
            </Pressable>
            {asset?.imageUrl && (
              <Pressable 
                className="p-2 bg-red-600 rounded"
                onPress={() => onClearAsset(templateId)}
              >
                <Text className="text-white text-xs">✕</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
```

**Integration in play/[id].tsx**:
1. Import and add to modal
2. Wire `onRegenerateAsset` to call `trpc.assets.regenerateTemplateAsset.mutate`
3. Wire `onClearAsset` to call `trpc.assets.setTemplateAsset.mutate` with `source: 'none'`

### Phase 4: Delete Asset Pack

**API endpoint to add** (if not exists): `api/src/trpc/routes/assets.ts`

```typescript
deletePack: installedProcedure
  .input(z.object({
    gameId: z.string(),
    packId: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    const game = await ctx.env.DB.prepare('SELECT * FROM games WHERE id = ?')
      .bind(input.gameId).first();
    if (!game) throw new TRPCError({ code: 'NOT_FOUND' });
    
    const definition = JSON.parse(game.definition as string) as GameDefinition;
    if (!definition.assetPacks?.[input.packId]) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Pack not found' });
    }
    
    delete definition.assetPacks[input.packId];
    if (definition.activeAssetPackId === input.packId) {
      definition.activeAssetPackId = undefined;
    }
    
    await ctx.env.DB.prepare('UPDATE games SET definition = ? WHERE id = ?')
      .bind(JSON.stringify(definition), input.gameId).run();
    
    return { success: true };
  }),
```

**UI**: Add delete button to each pack in the selection list.

### Phase 5: Parallax Background Generation UI

**New component**: `app/components/assets/ParallaxAssetPanel.tsx`

```tsx
import { View, Text, Pressable, Switch, Image, ScrollView } from 'react-native';

interface Props {
  parallaxConfig: ParallaxConfig | undefined;
  onToggleEnabled: (enabled: boolean) => void;
  onGenerateLayers: (style: string) => void;
  onLayerVisibilityChange: (depth: string, visible: boolean) => void;
  isGenerating: boolean;
}

export function ParallaxAssetPanel({ 
  parallaxConfig, 
  onToggleEnabled, 
  onGenerateLayers,
  onLayerVisibilityChange,
  isGenerating 
}: Props) {
  const layers = parallaxConfig?.layers || [];
  
  return (
    <View className="mt-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-white font-bold">Parallax Background</Text>
        <Switch 
          value={parallaxConfig?.enabled ?? false}
          onValueChange={onToggleEnabled}
        />
      </View>
      
      {parallaxConfig?.enabled && (
        <>
          <Pressable
            className={`py-3 rounded-lg items-center mb-3 ${isGenerating ? 'bg-gray-600' : 'bg-purple-600'}`}
            onPress={() => onGenerateLayers('pixel')}
            disabled={isGenerating}
          >
            <Text className="text-white font-semibold">
              {isGenerating ? 'Generating...' : 'Generate All Layers'}
            </Text>
          </Pressable>
          
          <ScrollView className="max-h-40">
            {(['sky', 'far', 'mid', 'near'] as const).map(depth => {
              const layer = layers.find(l => l.depth === depth);
              return (
                <View key={depth} className="flex-row items-center p-2 bg-gray-700 rounded mb-2">
                  {layer?.imageUrl ? (
                    <Image source={{ uri: layer.imageUrl }} className="w-16 h-10 rounded" />
                  ) : (
                    <View className="w-16 h-10 rounded bg-gray-600 items-center justify-center">
                      <Text className="text-gray-400 text-xs">Empty</Text>
                    </View>
                  )}
                  <Text className="text-white flex-1 ml-3 capitalize">{depth}</Text>
                  <Switch
                    value={layer?.visible ?? true}
                    onValueChange={(v) => onLayerVisibilityChange(depth, v)}
                  />
                </View>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
}
```

**API call for generating layers**: Use existing `assets.generateBackgroundLayer` for each depth, or add a batch endpoint.

### Phase 6: Asset Preview Before Applying

**Concept**: Don't set `activeAssetPackId` immediately. Instead:
1. Generate to a "draft" pack
2. Show preview modal with all generated assets
3. User clicks "Apply" to set as active
4. User clicks "Cancel" to discard

**Implementation**:
1. Create `AssetPackPreviewModal` component showing grid of generated assets
2. Store draft pack in local state, not in game definition
3. Only persist to game definition on "Apply"

---

## Test Games for Validation

| Game | File | Templates | Good for Testing |
|------|------|-----------|------------------|
| Sports Projectile | `app/assets/test-games/game-1-sports-projectile.json` | projectile, target, block, ground | Basic asset overlay |
| Cats Platformer | `app/assets/test-games/game-2-cats-platformer.json` | player, platform, collectible, enemy | Character + multiple types |
| Cats Falling | `app/assets/test-games/game-3-cats-falling-objects.json` | player, falling_object, ground | Simple game |

---

## Architecture Decision: Hybrid Asset Packs + Jobs

**Approved approach** from plan agent:
- Keep asset packs as "theme snapshots" 
- Add job-based generation for progress tracking
- Preview before applying
- Per-entity regeneration updates only that entry

**Data model additions needed** (optional, for advanced features):
- `asset_jobs` table for tracking generation progress
- Extended AssetPackSchema with `prompt`, `lastGeneratedAt`, per-asset `status`

---

## Verification Checklist

Before marking complete, verify:

- [ ] Style dropdown changes generated asset style
- [ ] Per-entity list shows all templates with thumbnails
- [ ] Regenerating single asset updates only that template
- [ ] Clearing asset falls back to shape sprite
- [ ] Deleting pack removes it from list
- [ ] Parallax toggle enables/disables background
- [ ] Generated parallax layers show in game
- [ ] Asset preview shows before applying
- [ ] All changes persist after page refresh
- [ ] Works on web and iOS simulator

---

## Command Reference

```bash
# Start all services
pnpm dev

# Check service status
pnpm svc:status

# Run TypeScript check
pnpm --filter @slopcade/app tsc --noEmit

# Run API tests
pnpm --filter @slopcade/api test
```

---

## Related Documentation

- [Implementation Roadmap](./implementation-roadmap.md) - Phase 6.5 covers this work
- [Asset Integration Design](../architecture/asset-integration-design.md) - Two-phase pipeline design
- [Asset Integration Plan](./asset-integration-plan.md) - Scenario.com integration details
- [Testing Asset Generation](../guides/testing-asset-generation.md) - Manual testing guide
