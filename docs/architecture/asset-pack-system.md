# Slopcade Asset Pack System Architecture

> **Complete reference for how games, assets, and packs work together**
>
> Last updated: 2026-02-03

---

## The Big Picture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ASSET PACK LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   1. DEFINITION                2. GENERATION              3. RUNTIME             │
│   ─────────────                ────────────               ───────────            │
│                                                                                  │
│   Game JSON defines            AI Pipeline creates        Game engine loads      │
│   WHAT assets needed           IMAGES for pack            assets from pack       │
│   (templates)                  (R2 storage)               (by activePackId)      │
│                                                                                  │
│   ┌──────────────┐            ┌──────────────┐           ┌──────────────┐        │
│   │ GameDef JSON │───────────▶│ Asset Pack   │──────────▶│ Runtime      │        │
│   │              │            │ (generated)  │           │ Resolution   │        │
│   │ templates:   │            │              │           │              │        │
│   │  - ball      │            │ ball.png     │           │ Entity uses  │        │
│   │  - tube      │            │ tube.png     │           │ ball.png URL │        │
│   │  - paddle    │            │ paddle.png   │           │              │        │
│   └──────────────┘            └──────────────┘           └──────────────┘        │
│                                                                                  │
│                    Pack ID = UUID that links them all                            │
│                    e.g., "b7f5e070-8412-49f7-99e9-f2f1c76e6f84"                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Game Engine JSON (GameDefinition)

The core schema that defines a game. Located in `shared/src/types/GameDefinition.ts`.

```typescript
interface GameDefinition {
  metadata: {
    id: string;
    title: string;
    version: string;
  };
  
  world: {
    gravity: { x: number; y: number };
    bounds: { width: number; height: number };
  };
  
  // ═══════════════════════════════════════════════════════
  // TEMPLATES: Define WHAT assets a game needs
  // ═══════════════════════════════════════════════════════
  templates: Record<string, EntityTemplate>;
  // Example:
  // {
  //   ball: { visual: { type: "image", imageUrl: "..." }, collider: {...} },
  //   tube: { visual: { type: "image", imageUrl: "..." }, collider: {...} },
  // }
  
  // ═══════════════════════════════════════════════════════
  // ENTITIES: Instances of templates placed in the world
  // ═══════════════════════════════════════════════════════
  entities: GameEntity[];
  // Example:
  // [
  //   { id: "ball-0", template: "ball", transform: {...} },
  //   { id: "tube-0", template: "tube", transform: {...} },
  // ]
  
  // ═══════════════════════════════════════════════════════
  // ASSET PACKS: Available visual themes for this game
  // ═══════════════════════════════════════════════════════
  assetPacks?: Record<string, AssetPack>;
  activeAssetPackId?: string;  // Which pack is currently active
  
  // ... rules, variables, winCondition, etc.
}
```

### Key Insight: Templates vs Entities

- **Templates** define the *blueprint* (physics, visuals, behaviors)
- **Entities** are *instances* of templates placed in the world
- **Asset Packs** provide *alternative visuals* for templates

---

## 2. Asset Pack System

### What is an Asset Pack?

An Asset Pack is a **collection of images** that can fulfill all the visual needs of a game's templates. Think of it like a "skin" or "theme" for a game.

```typescript
// shared/src/types/GameDefinition.ts (lines 144-150)
interface AssetPack {
  id: string;              // UUID or stable string like "ballSort-default"
  name: string;            // "Candy Theme", "Halloween Theme"
  description?: string;
  style?: 'pixel' | 'cartoon' | '3d' | 'flat';
  
  // THE KEY MAPPING: templateId → AssetConfig
  assets: Record<string, AssetConfig>;
  // Example:
  // {
  //   "ball": { imageUrl: "https://.../ball.png", scale: 1, offsetX: 0 },
  //   "tube": { imageUrl: "https://.../tube.png", scale: 1 },
  //   "background": { imageUrl: "https://.../bg.png" }
  // }
}

interface AssetConfig {
  imageUrl?: string;       // Full URL to the image
  assetRef?: string;       // OR reference to resolve at runtime
  source?: 'generated' | 'uploaded' | 'none';
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}
```

### How Packs Work

```
GAME DEFINITION                    ASSET PACK "halloween"
───────────────                    ──────────────────────

templates: {                       assets: {
  ball: {...},          ──────────▶  ball: { imageUrl: "ghost.png" },
  tube: {...},          ──────────▶  tube: { imageUrl: "cauldron.png" },
  background: {...}     ──────────▶  background: { imageUrl: "graveyard.png" }
}                                  }

Entity { template: "ball" }  ──▶  Resolves to ghost.png via active pack
```

### Swapping Packs = Changing One Variable

```typescript
// To switch from candy theme to halloween theme:
gameDefinition.activeAssetPackId = "halloween";  // That's it!

// Or via assetSystem config:
gameDefinition.assetSystem.activeAssetPackId = "halloween";
```

## 3. whatDescription Field

The `whatDescription` field is a critical part of the template definition that enables AI asset generation. It describes the functional nature of an entity without prescribing a specific visual style.

```typescript
interface EntityTemplate {
  visual: {
    type: 'image';
    whatDescription: string; // e.g., "a bouncing ball"
    // ...
  };
  // ...
}
```

### Guidelines for whatDescription
- **Purpose**: Short description of WHAT an entity is, used for AI asset generation.
- **Format**: lowercase, with article (e.g., "a bouncing ball", "a glass tube container").
- **Content**: Describes functional nature, NOT visual style (style comes from pack theme).
- **Requirement**: Required on all templates with `visual.type: 'image'`.

---

## 4. Two Storage Systems

### A) Embedded Packs (in GameDefinition JSON)

Best for: Test games, standalone games, offline play.

```typescript
const game: GameDefinition = {
  templates: { ball: {...}, tube: {...} },
  
  assetPacks: {
    "default": {
      id: "default",
      name: "Candy Theme",
      assets: {
        ball: { imageUrl: "https://cdn.com/generated/ballSort/pack-uuid/ball.png" },
        tube: { imageUrl: "https://cdn.com/generated/ballSort/pack-uuid/tube.png" }
      }
    },
    "halloween": {
      id: "halloween",
      name: "Spooky Theme",
      assets: {
        ball: { imageUrl: "https://cdn.com/generated/ballSort/halloween-uuid/ghost.png" },
        tube: { imageUrl: "https://cdn.com/generated/ballSort/halloween-uuid/cauldron.png" }
      }
    }
  },
  
  activeAssetPackId: "default",  // ← FLIP THIS TO CHANGE THEME
  
  entities: [...]
};
```

### B) Database-Backed Packs (D1 + tRPC)

Best for: Editor, user-generated content, dynamic pack management.

Asset packs are fetched from the database via tRPC. To ensure performance and reliability, the system uses:
- **React Query Caching**: Packs are cached for 5 minutes (stale time) and kept in memory for 30 minutes (gc time).
- **Strict Validation**: The system performs a compatibility check to ensure a pack contains all assets required by the game's templates. If assets are missing, an error is thrown.

```sql
-- api/schema.sql (lines 148-178)

CREATE TABLE asset_packs (
  id TEXT PRIMARY KEY,           -- UUID
  base_game_id TEXT NOT NULL,    -- Which game this pack is for
  name TEXT NOT NULL,
  description TEXT,
  prompt_defaults_json TEXT,     -- AI generation settings (theme, style)
  created_at INTEGER,
  deleted_at INTEGER             -- Soft delete
);

CREATE TABLE asset_pack_entries (
  id TEXT PRIMARY KEY,
  pack_id TEXT REFERENCES asset_packs(id),
  template_id TEXT NOT NULL,     -- "ball", "tube", etc.
  asset_id TEXT REFERENCES game_assets(id),
  placement_json TEXT,           -- { scale, offsetX, offsetY }
  UNIQUE(pack_id, template_id)
);

CREATE TABLE game_assets (
  id TEXT PRIMARY KEY,
  source TEXT,                   -- 'generated' | 'uploaded'
  image_url TEXT,                -- Full R2 URL
  width INTEGER,
  height INTEGER,
  created_at INTEGER
);
```

### When to Use Each

| Use Case | Embedded | Database |
|----------|----------|----------|
| Test games | ✅ | |
| Offline play | ✅ | |
| Simple games | ✅ | |
| Editor UI | | ✅ |
| User-generated packs | | ✅ |
| Pack marketplace | | ✅ |
| Dynamic switching | | ✅ |

---

## 4. R2 Storage Structure

All generated assets live in Cloudflare R2 with this structure:

```
R2 Bucket Structure:
─────────────────────
generated/
├── ballSort/
│   ├── b7f5e070-8412-49f7-99e9-f2f1c76e6f84/    ← Pack 1 (random UUID)
│   │   ├── ball0.png
│   │   ├── ball1.png
│   │   ├── tube.png
│   │   └── background.png
│   │
│   ├── ballSort-default/                         ← Pack 2 (stable name)
│   │   ├── ball0.png
│   │   ├── tube.png
│   │   └── background.png
│   │
│   └── halloween-theme/                          ← Pack 3 (themed)
│       ├── ball0.png   (ghost themed)
│       ├── tube.png    (cauldron themed)
│       └── background.png (graveyard)
│
├── slopeggle/
│   └── {packId}/
│       ├── ball.png
│       ├── bluePeg.png
│       ├── orangePeg.png
│       └── cannon.png
```

### URL Pattern

```
Base URL: https://slopcade-api.hassoncs.workers.dev/assets
Full URL: {baseUrl}/generated/{gameId}/{packId}/{assetId}.png

Example:
https://slopcade-api.hassoncs.workers.dev/assets/generated/ballSort/ballSort-default/tube.png
```

### URL Construction Functions

```typescript
// shared/src/utils/asset-url.ts

// Build R2 key (for storage)
function buildAssetPath(gameId: string, packId: string, assetId: string): string {
  return `generated/${gameId}/${packId}/${assetId}.png`;
}

// Build full URL (for loading)
function constructAssetUrl(baseUrl: string, gameId: string, packId: string, assetId: string): string {
  return `${baseUrl}/generated/${gameId}/${packId}/${assetId}.png`;
}
```

---

## 5. Asset Generation Pipeline

### Config File (What to Generate)

Each game has an asset config that defines what images to generate:

```typescript
// api/scripts/game-configs/ballSort/assets.config.ts

export const ballSortConfig: GameAssetConfig = {
  gameId: 'ballSort',
  gameTitle: 'Ball Sort',
  theme: 'whimsical candy factory, sweet treats, bubblegum aesthetic',
  style: 'cartoon',
  r2Prefix: 'generated/ballSort',
  
  assets: [
    // Entity sprites (use silhouette → img2img → removeBg pipeline)
    {
      type: 'entity',
      id: 'tube',              // ← This becomes the templateId
      shape: 'box',
      width: 1.4,
      height: 5.0,
      entityType: 'platform',
      description: 'EMPTY glass cylinder vase with OPEN TOP...',
    },
    {
      type: 'entity',
      id: 'ball0',
      shape: 'circle',
      width: 1.0,
      height: 1.0,
      entityType: 'item',
      description: 'shiny red gumball with glossy surface',
      color: '#E53935',
    },
    // ... ball1 through ball7
    
    // Background (use txt2img pipeline)
    {
      type: 'background',
      id: 'background',
      prompt: 'A whimsical candy factory interior...',
      width: 1024,
      height: 1792,
    },
    
    // Title hero (use txt2img → removeBg pipeline)
    {
      type: 'title_hero',
      id: 'title_hero',
      title: 'Ball Sort',
      themeDescription: 'Candy factory aesthetic with bubblegum colors...',
    },
  ],
};
```

### Pipeline Stages

Different asset types go through different pipeline stages:

| Asset Type | Pipeline |
|------------|----------|
| `entity` | silhouette → img2img → removeBg → uploadR2 |
| `background` | txt2img → uploadR2 |
| `title_hero` | txt2img → removeBg → uploadR2 |
| `parallax` | txt2img → layeredDecompose → uploadR2 |

### CLI Commands

```bash
# Generate ALL assets for a game (new random pack ID)
npx tsx api/scripts/generate-game-assets.ts ballSort

# Generate with a STABLE pack ID (recommended for default packs)
npx tsx api/scripts/generate-game-assets.ts ballSort --pack-id=ballSort-default

# Generate SINGLE asset (useful for iteration)
npx tsx api/scripts/generate-game-assets.ts ballSort --asset=tube

# Skip R2 upload (local testing only)
npx tsx api/scripts/generate-game-assets.ts ballSort --skip-stage=upload-r2

# Dry run (see what would be generated)
npx tsx api/scripts/generate-game-assets.ts ballSort --dry-run
```

### Debug Output

Every generation saves intermediate files:

```
api/debug-output/ballSort/tube/
├── silhouette_silhouette.png   # Physics shape mask
├── build-prompt_prompt.txt     # Full AI prompt
├── img2img_generated.png       # Raw AI output
├── remove-bg_no-bg.png         # Final transparent sprite
└── metadata.json               # Generation parameters
```

---

## 6. Runtime Asset Resolution

### The Resolution Hook

```typescript
// app/lib/game-engine/hooks/useAssetResolution.ts

export function useAssetResolution(
  entities: RuntimeEntity[],
  definition: GameDefinition
): Map<string, ResolvedAsset | null> {
  
  // 1. Determine active pack
  const activePackId = definition.assetSystem?.activeAssetPackId 
                    ?? definition.activeAssetPackId;
  
  const resolutionMap = new Map();
  
  for (const entity of entities) {
    // 2. Entity can override pack (or use game default)
    const packIdToUse = entity.assetPackId ?? activePackId;
    
    // 3. Get the pack
    const pack = definition.assetPacks?.[packIdToUse];
    if (!pack) continue;
    
    // 4. Map template → asset
    const templateId = entity.template;  // e.g., "ball"
    const assetConfig = pack.assets[templateId];
    
    // 5. Return resolved asset info
    resolutionMap.set(entity.id, {
      imageUrl: assetConfig.imageUrl,
      placement: {
        scale: assetConfig.scale ?? 1,
        offsetX: assetConfig.offsetX ?? 0,
        offsetY: assetConfig.offsetY ?? 0,
      }
    });
  }
  
  return resolutionMap;
}
```

### Resolution Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ASSET RESOLUTION FLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Entity                                                              │
│  { id: "ball-0", template: "ball" }                                 │
│           │                                                          │
│           ▼                                                          │
│  Which pack?                                                         │
│  entity.assetPackId ?? definition.activeAssetPackId                 │
│           │                                                          │
│           ▼                                                          │
│  packId = "halloween"                                                │
│           │                                                          │
│           ▼                                                          │
│  definition.assetPacks["halloween"]                                  │
│           │                                                          │
│           ▼                                                          │
│  pack.assets["ball"]                                                 │
│           │                                                          │
│           ▼                                                          │
│  { imageUrl: "https://.../ghost-ball.png", scale: 1 }               │
│           │                                                          │
│           ▼                                                          │
│  Entity renders with ghost-ball.png                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. What Exists vs What's Missing

### ✅ FULLY BUILT

| Component | Location | Notes |
|-----------|----------|-------|
| **AssetPack types** | `shared/src/types/GameDefinition.ts` | Complete interface |
| **Zod schemas** | `shared/src/types/schemas.ts` | Validation for all types |
| **AssetPackV2 types** | `shared/src/types/asset-system.ts` | DB-backed version |
| **Database tables** | `api/schema.sql` | asset_packs, asset_pack_entries |
| **tRPC API** | `api/src/trpc/routes/asset-system.ts` | Full CRUD |
| **AI Pipeline** | `api/src/ai/pipeline/` | All stages working |
| **R2 Upload** | `api/src/ai/pipeline/stages/` | Uploads correctly |
| **URL Builders** | `shared/src/utils/asset-url.ts` | buildAssetPath, etc. |
| **Runtime Resolution** | `app/lib/game-engine/hooks/useAssetResolution.ts` | Works with embedded packs |
| **Asset Manifest** | `app/lib/assets/AssetManifest.ts` | For preloading |
| **Editor Hooks** | `app/components/editor/AssetGallery/` | Pack management UI |

### ⚠️ PARTIALLY BUILT / DISCONNECTED

| Component | Issue | Location |
|-----------|-------|----------|
| **Test games using hardcoded URLs** | Don't use asset pack system | `app/lib/test-games/games/*/game.ts` |
| **assetRef resolution** | Runtime hook ignores assetRef, only uses imageUrl | `useAssetResolution.ts` |
| **DB → Embedded sync** | No auto-sync from DB packs to GameDefinition | Manual process |

### ❌ NOT BUILT

| Component | Description | Priority |
|-----------|-------------|----------|
| **Pack compatibility check** | Verify pack has all required templates | High |
| **Pack versioning** | Track versions, migrations | Medium |
| **Pack marketplace UI** | Browse/download community packs | Low |
| **Pack diff/merge** | Compare packs, merge assets | Low |

---

## 9. Current State of Test Games

All 6 active test games have been migrated to the asset pack system. They no longer use hardcoded `ASSET_BASE` constants or hardcoded `imageUrl` fields in templates.

### Migrated Games
- **ballSort**: Uses `ballSort-default` pack
- **flappyBird**: Uses `flappyBird-default` pack
- **slopeggle**: Uses `slopeggle-default` pack
- **breakoutBouncer**: Uses `breakoutBouncer-default` pack
- **breakoutScripted**: Uses `breakoutScripted-default` pack
- **gemCrush**: Uses `gemCrush-default` pack

Each game now uses `activeAssetPackId` to resolve its visuals at runtime.

---

## 10. tRPC API Reference

### Pack Management Endpoints

```typescript
// api/src/trpc/routes/asset-system.ts

// List all packs for a game
assetSystem.listPacks({ baseGameId: "ballSort" })
// Returns: [{ id, name, description, createdAt, ... }]

// Get pack with all entries
assetSystem.getPack({ id: "pack-uuid" })
// Returns: { id, name, entries: [{ templateId, assetId, imageUrl, placement }] }

// Create new pack
assetSystem.createPack({
  gameId: "ballSort",
  name: "My Custom Theme",
  promptDefaults: { themePrompt: "dark gothic castle", styleOverride: "pixel" }
})

// Update pack metadata
assetSystem.updatePack({ id: "pack-uuid", name: "New Name" })

// Delete pack (soft delete)
assetSystem.deletePack({ id: "pack-uuid" })

// Set active pack for a game
assetSystem.setActivePack({ gameId: "ballSort", packId: "pack-uuid" })

// Regenerate pack assets
assetSystem.regeneratePack({
  packId: "pack-uuid",
  templateIds: ["ball", "tube"],  // Optional: specific templates
  newTheme: "space adventure"     // Optional: change theme
})
```

---

## 11. How to Add Asset Pack Support to a Game

### Step 1: Define Asset Config

Create `api/scripts/game-configs/{gameId}/assets.config.ts`:

```typescript
export const myGameConfig: GameAssetConfig = {
  gameId: 'myGame',
  gameTitle: 'My Game',
  theme: 'your visual theme description',
  style: 'cartoon',
  r2Prefix: 'generated/myGame',
  assets: [
    { type: 'entity', id: 'player', shape: 'box', width: 1, height: 2, description: '...' },
    { type: 'entity', id: 'enemy', shape: 'circle', width: 1, height: 1, description: '...' },
    { type: 'background', id: 'background', prompt: '...' },
  ],
};
```

### Step 2: Generate Default Pack

```bash
npx tsx api/scripts/generate-game-assets.ts myGame --pack-id=myGame-default
```

### Step 3: Update Game Definition

```typescript
// Remove hardcoded ASSET_BASE
// Add assetPacks with generated URLs
const game: GameDefinition = {
  assetPacks: {
    "myGame-default": {
      id: "myGame-default",
      name: "Default Theme",
      assets: {
        player: { imageUrl: "https://.../myGame/myGame-default/player.png" },
        enemy: { imageUrl: "https://.../myGame/myGame-default/enemy.png" },
        background: { imageUrl: "https://.../myGame/myGame-default/background.png" },
      }
    }
  },
  activeAssetPackId: "myGame-default",
  // ... rest of game
};
```

### Step 4: Remove imageUrl from Templates

Templates should NOT have `imageUrl` when using asset packs. 

> [!WARNING]
> **Deprecation Note**: The `imageUrl` field in `ImageVisualComponent` is deprecated and will be removed in a future cleanup. Image URLs should now come exclusively from asset packs at runtime.

```typescript
templates: {
  player: {
    visual: { 
      type: "image",
      whatDescription: "a heroic player character" // Required for AI generation
    },
    physics: { bodyType: "dynamic" },
    collider: { shape: "box", width: 1, height: 2 },
  }
}
```

---

## 12. Key Files Reference

| Purpose | File |
|---------|------|
| **Core Types** | `shared/src/types/GameDefinition.ts` |
| **Asset System Types** | `shared/src/types/asset-system.ts` |
| **Zod Schemas** | `shared/src/types/schemas.ts` |
| **URL Utilities** | `shared/src/utils/asset-url.ts` |
| **Definition Resolver** | `shared/src/utils/definition-resolver.ts` |
| **Runtime Resolution** | `app/lib/game-engine/hooks/useAssetResolution.ts` |
| **Asset Manifest** | `app/lib/assets/AssetManifest.ts` |
| **Database Schema** | `api/schema.sql` |
| **tRPC Routes** | `api/src/trpc/routes/asset-system.ts` |
| **Pipeline Types** | `api/src/ai/pipeline/types.ts` |
| **Pipeline Stages** | `api/src/ai/pipeline/stages/index.ts` |
| **Pipeline Executor** | `api/src/ai/pipeline/executor.ts` |
| **CLI Script** | `api/scripts/generate-game-assets.ts` |
| **Ball Sort Config** | `api/scripts/game-configs/ballSort/assets.config.ts` |
| **Ball Sort Game** | `app/lib/test-games/games/ballSort/game.ts` |

---

## 13. Future Cleanup

With the migration of test games to the asset pack system complete, the following cleanup tasks remain:

1. **Remove imageUrl from schema**: Once all games (including user-generated ones) are migrated, the `imageUrl` field can be removed from `ImageVisualComponent`.
2. **Remove ASSET_BASE from build scripts**: Clean up any remaining references to the old asset base system in build and deployment scripts.
3. **Pack versioning**: Implement versioning for asset packs to handle template changes over time.
