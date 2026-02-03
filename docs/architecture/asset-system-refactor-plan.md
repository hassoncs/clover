# Asset System Refactor Plan

> **Goal**: Clean separation between Game Engine (the "what") and Asset Packs (the "how it looks").
>
> - **Game JSON** = Pure engine definition. Templates, sizes, physics, rules. NO URLs, NO theming, NO prompts.
> - **Asset Pack** = Artistic side. CDN URLs, theming, prompts. Easily swappable.
> - **All images on CDN** - No embedded images in app bundle. Everything uploaded to R2/CDN.

---

## Current State (Problems)

### 1. Games Hardcode CDN URLs

Every test game has this anti-pattern:

```typescript
// app/lib/test-games/games/ballSort/game.ts
const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/ballSort";

templates: {
  tube: {
    visual: {
      imageUrl: `${ASSET_BASE}/tube.png`,  // ← HARDCODED URL
    }
  }
}
```

**Files affected** (9 games):
- `app/lib/test-games/games/ballSort/game.ts` (4 URLs)
- `app/lib/test-games/games/slopeggle/game.ts` (12 URLs)
- `app/lib/test-games/games/breakoutBouncer/game.ts` (9 URLs)
- `app/lib/test-games/games/breakoutScripted/game.ts` (4 URLs)
- `app/lib/test-games/games/flappyBird/game.ts` (9 URLs)
- `app/lib/test-games/games/gemCrush/game.ts` (4 URLs)
- `app/lib/test-games/archive/pinballLite/game.ts` (5 URLs)
- `app/lib/test-games/archive/bubbleShooter/game.ts` (10 URLs)
- `app/lib/test-games/archive/tictactoe/game.ts` (4 URLs)

### 2. Two Separate Config Systems (Not Connected)

| System | Location | Purpose | Connected? |
|--------|----------|---------|------------|
| **Asset Generation Config** | `api/scripts/game-configs/*.ts` | AI prompts, themes, dimensions | ❌ No |
| **Game Engine Definition** | `app/lib/test-games/**/game.ts` | Physics, rules, entities | ❌ No |

These are manually synchronized - generate assets, then copy-paste URLs into game.ts.

### 3. Asset Pack System Exists But Unused

The infrastructure is fully built:
- `AssetPack` type in `shared/src/types/GameDefinition.ts`
- `useAssetResolution` hook in `app/lib/game-engine/hooks/`
- `extractAssetManifest` in `app/lib/assets/AssetManifest.ts`
- Database tables: `asset_packs`, `asset_pack_entries`

But test games bypass all of it with hardcoded URLs.

---

## Target State (Clean Architecture)

### Core Principle: Separation of Concerns

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   GAME JSON (Engine)              ASSET PACK (Artistic)                  │
│   ══════════════════              ═════════════════════                  │
│                                                                          │
│   "What does this game need?"     "How does it look?"                    │
│                                                                          │
│   • Template IDs                  • CDN URLs for each template           │
│   • Physics shapes & sizes        • Theming/prompts (for regeneration)   │
│   • Rules & behaviors             • Placement adjustments                │
│   • Win/lose conditions           • Style metadata                       │
│                                                                          │
│   NEVER contains:                 CAN be swapped:                        │
│   • URLs                          • Different themes                     │
│   • Theming/prompts               • Different art styles                 │
│   • Style enums                   • User-generated packs                 │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### The Three Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 1: GAME ENGINE DEFINITION (Pure Logic)                        │
│ Location: app/lib/test-games/games/{game}/game.ts                   │
│ Also: Database games table (definition JSON column)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Contains ONLY:                                                       │
│ • metadata: { id, title, description, version }                     │
│ • world: { gravity, bounds, pixelsPerMeter }                        │
│ • templates: { [id]: { collider, physics, behaviors } }             │
│ • entities: [ { id, template, transform } ]                         │
│ • rules: [ { trigger, conditions, actions } ]                       │
│ • variables, winCondition, loseCondition                            │
│                                                                      │
│ Example template (NO URLs, NO theming):                             │
│ ────────────────────────────────────────                            │
│ templates: {                                                         │
│   tube: {                                                            │
│     id: "tube",                                                      │
│     visual: {                                                        │
│       type: "image",                                                 │
│       imageWidth: 1.4,    // Size for rendering                     │
│       imageHeight: 5.0,   // Size for rendering                     │
│     },                                                               │
│     collider: { shape: "box", width: 1.4, height: 5.0 }             │
│   },                                                                 │
│   ball: {                                                            │
│     id: "ball",                                                      │
│     visual: { type: "image", imageWidth: 1.0, imageHeight: 1.0 },   │
│     collider: { shape: "circle", radius: 0.5 }                      │
│   }                                                                  │
│ }                                                                    │
│                                                                      │
│ // Game knows WHAT it needs, not WHERE or HOW it looks              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 2: ASSET PACK (Artistic Layer - Swappable)                    │
│ Storage: Database (asset_packs + asset_pack_entries) + R2 CDN      │
│ Also: JSON files for test games (loaded at runtime)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Contains:                                                            │
│ • id: Unique pack identifier (e.g., "ballSort-candy-theme")        │
│ • gameId: Which game this pack is for                               │
│ • name: Human-readable name ("Candy Factory Theme")                 │
│ • promptDefaults: { themePrompt, negativePrompt, ... }              │
│ • assets: { [templateId]: AssetEntry }                              │
│                                                                      │
│ AssetEntry contains:                                                 │
│ • imageUrl: CDN URL (always external, never embedded)               │
│ • prompt: The AI prompt used to generate this (for regeneration)    │
│ • placement: { scale, offsetX, offsetY }                            │
│                                                                      │
│ Example (stored separately from game JSON):                         │
│ ──────────────────────────────────────────                          │
│ {                                                                    │
│   "id": "ballSort-candy-theme",                                     │
│   "gameId": "ballSort",                                              │
│   "name": "Candy Factory Theme",                                     │
│   "promptDefaults": {                                                │
│     "themePrompt": "whimsical candy factory, bubblegum aesthetic"   │
│   },                                                                 │
│   "assets": {                                                        │
│     "tube": {                                                        │
│       "imageUrl": "https://cdn.slopcade.com/.../tube.png",          │
│       "prompt": "EMPTY glass cylinder vase, candy-colored..."       │
│     },                                                               │
│     "ball": {                                                        │
│       "imageUrl": "https://cdn.slopcade.com/.../ball.png",          │
│       "prompt": "shiny gumball with glossy surface..."              │
│     },                                                               │
│     "background": {                                                  │
│       "imageUrl": "https://cdn.slopcade.com/.../background.png",    │
│       "prompt": "candy factory interior with conveyor belts..."     │
│     }                                                                │
│   }                                                                  │
│ }                                                                    │
│                                                                      │
│ NOTE: No style enum! Prompts are hierarchical strings:              │
│ • Pack-level: themePrompt, negativePrompt                           │
│ • Asset-level: individual prompt per asset                          │
│ • Fully customizable, no artificial constraints                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 3: RUNTIME RESOLUTION (Merge at Load Time)                    │
│ Location: app/lib/game-engine/hooks/useResolvedGame.ts              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ At runtime, BEFORE starting the game:                               │
│                                                                      │
│ 1. Load Game JSON (pure engine definition)                          │
│ 2. Load Asset Pack (URLs, theming)                                  │
│ 3. VERIFY: Pack has all templates the game needs                    │
│ 4. MERGE: Inject URLs into templates                                │
│ 5. PRELOAD: Download all images from CDN                            │
│ 6. START: Begin gameplay with resolved definition                   │
│                                                                      │
│ function resolveGame(game: GameDefinition, pack: AssetPack) {       │
│   // Verify compatibility                                            │
│   const required = Object.keys(game.templates)                      │
│     .filter(t => game.templates[t].visual?.type === 'image');       │
│   const provided = Object.keys(pack.assets);                        │
│   const missing = required.filter(t => !provided.includes(t));      │
│   if (missing.length > 0) throw new MissingAssetsError(missing);    │
│                                                                      │
│   // Merge URLs into templates                                       │
│   const resolved = structuredClone(game);                           │
│   for (const [id, asset] of Object.entries(pack.assets)) {          │
│     if (resolved.templates[id]?.visual) {                           │
│       resolved.templates[id].visual.imageUrl = asset.imageUrl;      │
│     }                                                                │
│   }                                                                  │
│   if (pack.assets.background) {                                     │
│     resolved.background = { ...resolved.background,                 │
│       imageUrl: pack.assets.background.imageUrl };                  │
│   }                                                                  │
│                                                                      │
│   return resolved;                                                   │
│ }                                                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Changes from Current System

| Current | Target |
|---------|--------|
| `ASSET_BASE` hardcoded in game.ts | No URLs in game.ts |
| `style: 'pixel' \| 'cartoon' \| '3d' \| 'flat'` enum | Removed - use hierarchical string prompts |
| Images might be in app bundle | ALL images on CDN (R2) |
| `assetPacks` embedded in GameDefinition | Asset packs stored separately, loaded at runtime |
| Manual URL copy-paste after generation | Auto-generated pack JSON with URLs |

---

## Implementation Plan

### Phase 1: Create Asset Resolution Infrastructure

#### Task 1.1: Add `requiredAssets` to GameDefinition type

```typescript
// shared/src/types/GameDefinition.ts
interface GameDefinition {
  // ... existing fields ...
  
  /**
   * List of asset IDs this game requires.
   * Used for validation against asset packs.
   */
  requiredAssets?: string[];
}
```

#### Task 1.2: Create `resolveGameAssets` function

```typescript
// shared/src/utils/asset-resolver.ts

export interface AssetResolutionResult {
  success: boolean;
  resolvedDefinition: GameDefinition;
  missingAssets: string[];
  warnings: string[];
}

export function resolveGameAssets(
  definition: GameDefinition,
  assetPack: AssetPack,
  options?: { strict?: boolean }
): AssetResolutionResult {
  const missingAssets: string[] = [];
  const warnings: string[] = [];
  
  // Clone definition to avoid mutation
  const resolved = structuredClone(definition);
  
  // Get required assets from definition
  const requiredAssetIds = new Set(
    definition.requiredAssets ?? 
    Object.keys(definition.templates).filter(t => 
      definition.templates[t].visual?.type === 'image'
    )
  );
  
  // Check each required asset exists in pack
  for (const assetId of requiredAssetIds) {
    const packAsset = assetPack.assets[assetId];
    
    if (!packAsset || !packAsset.imageUrl) {
      missingAssets.push(assetId);
      continue;
    }
    
    // Merge URL into template
    if (resolved.templates[assetId]?.visual) {
      resolved.templates[assetId].visual.imageUrl = packAsset.imageUrl;
      
      // Apply placement adjustments if present
      if (packAsset.scale) {
        resolved.templates[assetId].visual.scale = packAsset.scale;
      }
    }
  }
  
  // Also resolve background
  if (definition.background?.type === 'static' && assetPack.assets.background) {
    resolved.background.imageUrl = assetPack.assets.background.imageUrl;
  }
  
  return {
    success: missingAssets.length === 0,
    resolvedDefinition: resolved,
    missingAssets,
    warnings,
  };
}
```

#### Task 1.3: Create `useResolvedGame` hook

```typescript
// app/lib/game-engine/hooks/useResolvedGame.ts

export function useResolvedGame(
  definition: GameDefinition,
  packId: string
): {
  resolvedDefinition: GameDefinition | null;
  isLoading: boolean;
  error: Error | null;
} {
  const [resolved, setResolved] = useState<GameDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    async function resolve() {
      try {
        // Fetch asset pack (from embedded or database)
        const pack = await fetchAssetPack(packId);
        
        // Resolve assets
        const result = resolveGameAssets(definition, pack);
        
        if (!result.success) {
          throw new Error(`Missing assets: ${result.missingAssets.join(', ')}`);
        }
        
        setResolved(result.resolvedDefinition);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    }
    
    resolve();
  }, [definition, packId]);
  
  return { resolvedDefinition: resolved, isLoading, error };
}
```

### Phase 2: Refactor Test Games

#### Task 2.1: Create helper to generate embedded pack from ASSET_BASE

During migration, we need to convert existing games. Create a migration helper:

```typescript
// scripts/migrate-game-to-asset-pack.ts

function generateAssetPackFromGame(
  gameFile: string,
  assetBase: string,
  assetIds: string[]
): AssetPack {
  return {
    id: `${gameId}-default`,
    name: 'Default Theme',
    assets: Object.fromEntries(
      assetIds.map(id => [
        id,
        { imageUrl: `${assetBase}/${id}.png`, source: 'generated' }
      ])
    )
  };
}
```

#### Task 2.2: Refactor Ball Sort (First Game)

**Before:**
```typescript
const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/ballSort";

const game: GameDefinition = {
  templates: {
    tube: {
      visual: { type: "image", imageUrl: `${ASSET_BASE}/tube.png` }
    }
  }
};
```

**After:**
```typescript
// No ASSET_BASE!

const game: GameDefinition = {
  requiredAssets: ['tube', 'ball0', 'ball1', ..., 'background'],
  
  templates: {
    tube: {
      visual: { type: "image" }  // No imageUrl
    }
  },
  
  // Embedded pack for offline/test use
  assetPacks: {
    'ballSort-default': {
      id: 'ballSort-default',
      name: 'Candy Factory Theme',
      assets: {
        tube: { imageUrl: 'https://cdn.../ballSort/ballSort-default/tube.png' },
        ball0: { imageUrl: 'https://cdn.../ballSort/ballSort-default/ball0.png' },
        // ...
      }
    }
  },
  activeAssetPackId: 'ballSort-default',
};
```

#### Task 2.3: Update GameRuntime to use resolution

```typescript
// app/lib/game-engine/GameRuntime.godot.tsx

function GameRuntime({ definition, ...props }) {
  // If definition has assetPacks, resolve them
  const resolvedDefinition = useMemo(() => {
    if (definition.assetPacks && definition.activeAssetPackId) {
      const pack = definition.assetPacks[definition.activeAssetPackId];
      const result = resolveGameAssets(definition, pack);
      return result.resolvedDefinition;
    }
    return definition;
  }, [definition]);
  
  // Rest of component uses resolvedDefinition
}
```

### Phase 3: Update Asset Generation Pipeline

#### Task 3.1: Generate asset pack JSON after generation

```typescript
// api/scripts/generate-game-assets.ts

// After generating all assets, output asset pack JSON
function generateAssetPackJson(
  gameId: string,
  packId: string,
  generatedAssets: GeneratedAsset[]
): AssetPack {
  return {
    id: packId,
    name: `${gameId} Pack`,
    assets: Object.fromEntries(
      generatedAssets.map(a => [
        a.templateId,
        {
          imageUrl: a.publicUrl,
          source: 'generated',
        }
      ])
    )
  };
}

// Save to file for embedding in game
await fs.writeFile(
  `api/debug-output/${gameId}/${packId}/asset-pack.json`,
  JSON.stringify(assetPack, null, 2)
);

console.log('Asset pack JSON generated. Copy into game definition:');
console.log(JSON.stringify(assetPack, null, 2));
```

#### Task 3.2: Add --output-pack flag to CLI

```bash
# Generate assets AND output embeddable pack JSON
npx tsx api/scripts/generate-game-assets.ts ballSort \
  --pack-id=ballSort-default \
  --output-pack=app/lib/test-games/games/ballSort/packs/default.json
```

### Phase 4: Migrate All Games

| Game | Priority | Status |
|------|----------|--------|
| ballSort | High | 🔴 Not started |
| slopeggle | High | 🔴 Not started |
| breakoutBouncer | Medium | 🔴 Not started |
| flappyBird | Medium | 🔴 Not started |
| gemCrush | Low | 🔴 Not started |
| breakoutScripted | Low | 🔴 Not started |
| pinballLite (archive) | Low | 🔴 Not started |
| bubbleShooter (archive) | Low | 🔴 Not started |
| tictactoe (archive) | Low | 🔴 Not started |

### Phase 5: Enable Pack Switching

Once all games use the new pattern, switching packs is trivial:

```typescript
// Switch from default to halloween theme
gameDefinition.activeAssetPackId = 'ballSort-halloween';

// Or dynamically at runtime
const [activePack, setActivePack] = useState('ballSort-default');

<GameRuntime
  definition={{
    ...baseGame,
    activeAssetPackId: activePack,
    assetPacks: {
      'ballSort-default': defaultPack,
      'ballSort-halloween': halloweenPack,
    }
  }}
/>
```

---

## File Changes Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `shared/src/utils/asset-resolver.ts` | Core resolution logic |
| `app/lib/game-engine/hooks/useResolvedGame.ts` | React hook for resolution |
| `scripts/migrate-game-to-asset-pack.ts` | Migration helper |

### Files to Modify

| File | Changes |
|------|---------|
| `shared/src/types/GameDefinition.ts` | Add `requiredAssets` field |
| `app/lib/game-engine/GameRuntime.godot.tsx` | Use resolution before loading |
| `app/lib/assets/AssetManifest.ts` | Handle definitions without URLs |
| `api/scripts/generate-game-assets.ts` | Output asset pack JSON |
| All 9 test game files | Remove ASSET_BASE, add assetPacks |

---

## Verification Checklist

- [ ] `resolveGameAssets()` correctly merges pack URLs into definition
- [ ] Missing assets are detected and reported
- [ ] Ball Sort loads correctly with new pattern
- [ ] Pack switching works (change activeAssetPackId, see different visuals)
- [ ] Asset generation outputs embeddable pack JSON
- [ ] All 9 test games migrated and working
- [ ] No hardcoded ASSET_BASE remains in codebase

---

## Questions to Resolve

1. **Embedded vs Database packs for test games?**
   - Embedded = simpler, works offline, good for test games
   - Database = more flexible, good for editor/user-generated

2. **Pack ID format?**
   - Stable strings like `ballSort-default` (easier to reference)
   - UUIDs (matches database pattern)

3. **What happens when pack is missing an asset?**
   - Error and refuse to load game?
   - Warning and render placeholder?
   - Silent fallback to template visual?

4. **Should we auto-detect required assets?**
   - Scan templates for `visual.type === 'image'`
   - Or require explicit `requiredAssets` array?
