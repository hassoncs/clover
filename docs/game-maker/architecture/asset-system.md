# Asset System Architecture

**Complete guide to the Slopcade asset system: local development, production deployment, and offline support.**

Last Updated: 2026-02-04

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Asset Flow: Generation to Runtime](#asset-flow-generation-to-runtime)
4. [Local Development Architecture](#local-development-architecture)
5. [Production Architecture](#production-architecture)
6. [URL Resolution System](#url-resolution-system)
7. [Database Schema](#database-schema)
8. [File System Layout](#file-system-layout)
9. [CLI Tools & Scripts](#cli-tools--scripts)
10. [Implementation Details](#implementation-details)
11. [Future: Native Offline Support](#future-native-offline-support)

---

## Overview

The Slopcade asset system manages game sprites, backgrounds, and other visual assets across three environments:

1. **Local Development** — Assets served from filesystem via local HTTP server
2. **Production** — Assets served from Cloudflare R2 CDN
3. **Offline** — Downloaded assets served from device storage (future)

**Key Design Principle**: Local development mirrors production exactly. The only difference is the base URL.

```
Local:      http://localhost:8789/local-assets/generated/ballSort/{packId}/{assetId}.png
Production: https://cdn.slopcade.com/generated/ballSort/{packId}/{assetId}.png
Offline:    file:///app-data/games/ballSort/generated/ballSort/{packId}/{assetId}.png
```

All three use **identical R2 key paths** (`generated/{gameId}/{packId}/{assetId}.png`). Only the base URL changes.

---

## Core Concepts

### Asset Pack

An **asset pack** is a collection of assets for a specific game and theme:

- **Pack ID**: UUID (e.g., `f661beb6-1e5e-4b9e-a01f-314c87248b75`)
- **Pack Name**: Human-readable (e.g., "ballSort-default", "tetris-halloween")
- **Base Game ID**: The template game this pack applies to (e.g., "ballSort")
- **Theme ID**: Optional AI theme used to generate assets

**Example**: A "Halloween" theme pack for "ballSort" would have:
- Pack ID: `uuid-abc-123`
- Pack Name: `ballSort-halloween`
- Base Game ID: `ballSort`
- Theme ID: `theme-uuid-456`

### Pack Entry

A **pack entry** maps a game template to a specific asset:

- **Template ID**: Entity template from game definition (e.g., "ball0", "tube")
- **Asset ID**: UUID of the generated asset
- **R2 Key**: Full storage path (e.g., `generated/ballSort/{packId}/{assetId}.png`)
- **Placement**: Optional scale/offset overrides

**Example**:
```json
{
  "packId": "f661beb6-1e5e-4b9e-a01f-314c87248b75",
  "templateId": "ball0",
  "assetId": "a9df5fd0-0f50-4e59-b441-e9800889022c",
  "r2Key": "generated/ballSort/f661beb6.../a9df5fd0-....png",
  "placement": { "scale": 1, "offsetX": 0, "offsetY": 0 }
}
```

### R2 Key

The **R2 key** is the canonical path to an asset in object storage:

**Format**: `generated/{gameId}/{packId}/{assetId}.png`

**Examples**:
- `generated/ballSort/f661beb6-1e5e-4b9e-a01f-314c87248b75/a9df5fd0-0f50-4e59-b441-e9800889022c.png`
- `generated/tetris/halloween-pack-uuid/block-red-uuid.png`

**Why this format?**
- **Organized by game**: All ballSort assets grouped together
- **Versioned by pack**: Multiple themes per game stay isolated
- **Content-addressable**: Asset IDs are UUIDs (can be upgraded to content hashes)
- **CDN-friendly**: Hierarchical structure works with most CDNs

### Asset Resolution

**Asset resolution** is the process of mapping a template ID to an image URL:

```typescript
// Game definition references template
entity.template = "ball0"

// Resolution lookup
packEntry = assetPacks[activePackId].entries.find(e => e.templateId === "ball0")
imageUrl = getAssetUrl(packEntry.r2Key, cdnBaseUrl, config)

// Result
imageUrl = "http://localhost:8789/local-assets/generated/ballSort/.../a9df5fd0-....png"
```

---

## Asset Flow: Generation to Runtime

### Complete Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. GENERATION (AI/Manual)                                        │
├─────────────────────────────────────────────────────────────────┤
│ • AI generates sprites via Scenario.com API                      │
│ • Manual upload via admin UI                                     │
│ • Output: PNG files with transparent backgrounds                │
│ • Saved to: api/debug-output/{jobId}/ (temporary)               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. UPLOAD TO R2                                                  │
├─────────────────────────────────────────────────────────────────┤
│ • Generate asset ID: crypto.randomUUID()                         │
│ • Build R2 key: generated/{gameId}/{packId}/{assetId}.png       │
│ • Upload to Cloudflare R2 bucket via Workers API                │
│ • Record metadata in assets table (width, height, contentType)  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. REGISTER IN DATABASE                                          │
├─────────────────────────────────────────────────────────────────┤
│ • Create pack entry: INSERT INTO pack_entries                   │
│ • Link template ID → asset ID → R2 key                          │
│ • Set as active pack: UPDATE games SET definition.assetSystem   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. DOWNLOAD TO LOCAL (Dev Only)                                 │
├─────────────────────────────────────────────────────────────────┤
│ • Script: api/scripts/download-pack-assets.ts                   │
│ • Fetches pack entries from API                                 │
│ • Downloads PNGs from R2 to: games/compiled/{game}/{r2Key}     │
│ • Creates manifest.json: templateId → r2Key mapping             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. RUNTIME RESOLUTION                                            │
├─────────────────────────────────────────────────────────────────┤
│ • useAssetResolution hook queries pack by name                  │
│ • Converts DB pack to embedded format with URLs                 │
│ • getAssetUrl() builds URL based on environment:                │
│   - Dev (offlineMode): http://localhost:8789/local-assets/...  │
│   - Prod: https://cdn.slopcade.com/...                          │
│   - Offline: file:///app-data/...                               │
│ • Returns Map<entityId, ResolvedAsset>                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. RENDERING                                                     │
├─────────────────────────────────────────────────────────────────┤
│ • Godot engine receives entity with imageUrl                    │
│ • Loads image from URL (HTTP or file://)                        │
│ • Renders sprite with scale/offset from placement               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Local Development Architecture

### Goal

**Simulate production environment exactly** while developing locally. Assets should:
- Use the same R2 key paths as production
- Use the same pack IDs and asset IDs
- Be servable via the same URL structure (just different base URL)

### File System Layout (After Restructuring)

**Before** (friendly names, incompatible with production):
```
games/compiled/ballSort/
  assets/
    ball0.png        ← Friendly name
    tube.png         ← Friendly name
    manifest.json    ← Maps friendly → R2 key
```

**After** (production-compatible structure):
```
games/compiled/ballSort/
  generated/
    ballSort/
      f661beb6-1e5e-4b9e-a01f-314c87248b75/    ← Pack ID
        a9df5fd0-0f50-4e59-b441-e9800889022c.png  ← Asset ID (ball0)
        2c3ff5e6-92d1-4d6f-85d5-61aee109b647.png  ← Asset ID (tube)
        ...
        manifest.json  ← Reference mapping
```

**Why this structure?**
- **Matches R2 exactly**: `generated/{gameId}/{packId}/{assetId}.png`
- **No mapping layer needed**: Direct path translation
- **Sync-friendly**: Can copy entire directory tree to R2
- **Multi-pack support**: Multiple packs can coexist side-by-side

### Local Asset Server

**Endpoint**: `GET /local-assets/*` (API server at `localhost:8789`)

**Purpose**: Serve local game assets during development as if they were on CDN.

**Implementation** (`api/src/index.ts`):
```typescript
app.get("/local-assets/*", async (c) => {
  // Security: Dev only
  if (c.env.ENVIRONMENT !== 'development') {
    return c.text("Not available in production", 403);
  }
  
  const assetPath = c.req.path.replace("/local-assets/", "");
  // Example: "generated/ballSort/f661beb6.../a9df5fd0-....png"
  
  const filePath = path.join(process.cwd(), '../games/compiled', assetPath);
  // Resolves to: games/compiled/generated/ballSort/f661beb6.../a9df5fd0-....png
  
  // Security: Prevent path traversal
  const resolvedPath = path.resolve(filePath);
  const allowedRoot = path.resolve(process.cwd(), '../games/compiled');
  if (!resolvedPath.startsWith(allowedRoot)) {
    return c.text("Forbidden", 403);
  }
  
  const fileBuffer = await fs.readFile(resolvedPath);
  return new Response(fileBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache',  // Dev: no aggressive caching
      'Access-Control-Allow-Origin': '*',
    },
  });
});
```

**Request Flow**:
```
Browser → http://localhost:8789/local-assets/generated/ballSort/pack-uuid/asset-uuid.png
  ↓
API Server receives: /local-assets/generated/ballSort/pack-uuid/asset-uuid.png
  ↓
Maps to filesystem: games/compiled/generated/ballSort/pack-uuid/asset-uuid.png
  ↓
Reads file → Returns PNG with CORS headers
```

### Development Workflow

**Starting dev environment**:
```bash
pnpm dev  # Starts Metro (8085) + API (8789) + Godot watcher
```

**Asset resolution (automatic)**:
```typescript
// app/lib/offline/settings.ts
const DEFAULT_SETTINGS = {
  offlineMode: env.isDevMode,  // true in development
  ...
};

// app/lib/offline/local-asset-server.ts
export function getServerUrl(): string {
  if (Platform.OS === 'web') {
    return 'http://localhost:8789/local-assets';
  }
  return 'file://...';  // Native offline
}

// app/lib/game-engine/hooks/useAssetResolution.ts
const dbPack = convertDbPackToEmbedded(dbPackQuery.data, {
  offlineMode: isOffline,           // true in dev
  localServerUrl: getServerUrl(),   // http://localhost:8789/local-assets
  gameId: definition.metadata.id,   // "ballSort"
});

// shared/src/utils/asset-url.ts
export function getAssetUrl(r2Key, cdnBaseUrl, config?) {
  if (config?.offlineMode && config.localServerUrl && config.gameId) {
    // Dev mode: http://localhost:8789/local-assets/generated/ballSort/pack-uuid/asset-uuid.png
    return `${localServerUrl}/${gameId}/${r2Key}`;
  }
  // Prod mode: https://cdn.slopcade.com/generated/ballSort/pack-uuid/asset-uuid.png
  return `${cdnBaseUrl}/${r2Key}`;
}
```

**Result**: Assets load from local filesystem transparently, as if from CDN.

---

## Production Architecture

### Components

```
┌──────────────────────────────────────────────────────────────────┐
│ CLIENT (Web/Native)                                               │
│ • Game loads with assetSystem.activePackId = "ballSort-default"  │
│ • useAssetResolution hook fetches pack from API                  │
│ • getAssetUrl() returns CDN URLs for each asset                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ API SERVER (Cloudflare Workers)                                   │
│ • tRPC endpoint: assetSystem.getPackByName                        │
│ • Queries D1 database for pack + entries                         │
│ • Returns pack with R2 keys                                      │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ DATABASE (Cloudflare D1)                                          │
│ Tables:                                                           │
│ • asset_packs (id, base_game_id, name, theme_id, ...)           │
│ • pack_entries (pack_id, template_id, asset_id, r2_key, ...)    │
│ • assets (id, r2_key, width, height, content_type, ...)         │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ CDN (Cloudflare R2)                                               │
│ • Bucket: ASSETS                                                  │
│ • Objects stored at: generated/{gameId}/{packId}/{assetId}.png   │
│ • Public access via: https://cdn.slopcade.com/{r2Key}           │
│ • Headers: immutable cache, CORS enabled                         │
└──────────────────────────────────────────────────────────────────┘
```

### Deployment Flow

**When syncing local game to production**:

```bash
npx tsx api/scripts/sync-local-game-to-production.ts \
  --template=ballSort \
  --production
```

**Script performs**:
1. Load game definition from `@slopcade/games` package
2. Sync game definition to database (INSERT/UPDATE games table)
3. Read local `manifest.json` to get asset list
4. Upload each asset to R2:
   - Read from: `games/compiled/ballSort/{r2Key}`
   - Upload to: R2 bucket at `{r2Key}`
   - Register in database: INSERT INTO assets
5. Create/update pack entries in database
6. Set pack as active in game definition

**Result**: Production database + R2 now have identical assets with identical paths as local development.

---

## URL Resolution System

### The Core Function

**Location**: `shared/src/utils/asset-url.ts`

```typescript
export interface AssetUrlConfig {
  offlineMode?: boolean;
  localServerUrl?: string;   // "http://localhost:8789/local-assets" or file://
  gameId?: string;
}

export function getAssetUrl(
  r2Key: string,              // "generated/ballSort/pack-uuid/asset-uuid.png"
  cdnBaseUrl: string,         // "https://cdn.slopcade.com"
  config?: AssetUrlConfig
): string {
  if (config?.offlineMode && config.gameId && config.localServerUrl) {
    // Dev/Offline mode
    const base = config.localServerUrl.replace(/\/$/, '');
    return `${base}/${config.gameId}/${r2Key}`;
    // → http://localhost:8789/local-assets/ballSort/generated/ballSort/.../uuid.png
  }
  
  // Production mode
  return `${cdnBaseUrl.replace(/\/$/, '')}/${r2Key}`;
  // → https://cdn.slopcade.com/generated/ballSort/pack-uuid/asset-uuid.png
}
```

### Environment Detection

**Dev Mode Detection**:
```typescript
// app/lib/config/env.ts
export const env = {
  isDevMode: process.env.NODE_ENV === 'development',
  assetCdnUrl: process.env.ASSET_CDN_URL || 'https://cdn.slopcade.com',
};

// app/lib/offline/settings.ts
const DEFAULT_SETTINGS = {
  offlineMode: env.isDevMode,  // Auto-enable in dev
  ...
};
```

**Local Server URL**:
```typescript
// app/lib/offline/local-asset-server.ts
export function getServerUrl(): string {
  if (Platform.OS === 'web') {
    return 'http://localhost:8789/local-assets';
  }
  // Native: future file:// implementation
  return `file://${getBaseDirectory()}`;
}
```

### Resolution Hook

**Location**: `app/lib/game-engine/hooks/useAssetResolution.ts`

```typescript
export function useAssetResolution(
  entities: RuntimeEntity[],
  definition: GameDefinition
): Map<string, ResolvedAsset | null> {
  const activePackId = definition.assetSystem?.activePackId;
  const { isOffline } = useOfflineMode();
  
  // Fetch pack from database
  const dbPackQuery = trpcReact.assetSystem.getPackByName.useQuery(
    { name: activePackId! },
    { enabled: !!activePackId, staleTime: 5 * 60 * 1000 }
  );

  return useMemo(() => {
    if (!dbPackQuery.data) return new Map();

    // Convert DB pack to embedded format with resolved URLs
    const dbPack = convertDbPackToEmbedded(dbPackQuery.data, {
      offlineMode: isOffline,
      localServerUrl: getServerUrl(),
      gameId: definition.metadata.id,
    });

    // Build resolution map: entityId → { imageUrl, placement }
    const resolutionMap = new Map<string, ResolvedAsset | null>();
    for (const entity of entities) {
      const resolved = resolveAssetForEntity(entity, {
        activePackId,
        assetPacks: { [dbPack.name]: dbPack },
      });
      resolutionMap.set(entity.id, resolved);
    }

    return resolutionMap;
  }, [entities, activePackId, isOffline, dbPackQuery.data]);
}
```

### URL Examples by Environment

**R2 Key**: `generated/ballSort/f661beb6-1e5e-4b9e-a01f-314c87248b75/a9df5fd0-0f50-4e59-b441-e9800889022c.png`

| Environment | Config | Resolved URL |
|-------------|--------|--------------|
| **Dev (Web)** | offlineMode=true, localServerUrl=http://localhost:8789/local-assets, gameId=ballSort | `http://localhost:8789/local-assets/ballSort/generated/ballSort/.../a9df5fd0-....png` |
| **Production** | offlineMode=false, cdnBaseUrl=https://cdn.slopcade.com | `https://cdn.slopcade.com/generated/ballSort/.../a9df5fd0-....png` |
| **Native Offline** | offlineMode=true, localServerUrl=file:///app-data, gameId=ballSort | `file:///app-data/ballSort/generated/ballSort/.../a9df5fd0-....png` |

---

## Database Schema

### Tables

**`asset_packs`**
```sql
CREATE TABLE asset_packs (
  id TEXT PRIMARY KEY,                    -- Pack UUID
  base_game_id TEXT NOT NULL,             -- Template game ID (e.g., "ballSort")
  name TEXT UNIQUE NOT NULL,              -- Pack name (e.g., "ballSort-default")
  description TEXT,
  theme_id TEXT,                          -- Optional AI theme
  creator_user_id TEXT,
  is_complete INTEGER DEFAULT 0,          -- All templates have assets
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**`pack_entries`**
```sql
CREATE TABLE pack_entries (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,                  -- References asset_packs.id
  template_id TEXT NOT NULL,              -- Game template (e.g., "ball0")
  asset_id TEXT NOT NULL,                 -- References assets.id
  placement_json TEXT,                    -- JSON: { scale, offsetX, offsetY }
  created_at INTEGER NOT NULL,
  UNIQUE(pack_id, template_id),           -- One asset per template per pack
  FOREIGN KEY (pack_id) REFERENCES asset_packs(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);
```

**`assets`**
```sql
CREATE TABLE assets (
  id TEXT PRIMARY KEY,                    -- Asset UUID
  r2_key TEXT UNIQUE NOT NULL,            -- Full R2 path
  width INTEGER,
  height INTEGER,
  content_type TEXT DEFAULT 'image/png',
  file_size INTEGER,
  creator_user_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### Relationships

```
games (1) ───┐
             │ base_game_id
             ▼
        asset_packs (N) ───┐
                           │ pack_id
                           ▼
                      pack_entries (N) ───┐
                                          │ asset_id
                                          ▼
                                      assets (1)
```

**Example Query** (get pack with all entries):
```sql
SELECT 
  ap.id AS pack_id,
  ap.name AS pack_name,
  pe.template_id,
  a.r2_key,
  a.width,
  a.height,
  pe.placement_json
FROM asset_packs ap
JOIN pack_entries pe ON pe.pack_id = ap.id
JOIN assets a ON a.id = pe.asset_id
WHERE ap.name = 'ballSort-default';
```

---

## File System Layout

### Repository Structure

```
slopcade/
├── games/
│   ├── src/
│   │   └── registry.ts              # Game definitions (TypeScript)
│   ├── compiled/
│   │   ├── ballSort/
│   │   │   ├── game.ts              # Game logic
│   │   │   └── generated/           # ← Assets (production-compatible)
│   │   │       └── ballSort/
│   │   │           └── f661beb6-1e5e-.../
│   │   │               ├── a9df5fd0-....png  (ball0)
│   │   │               ├── 2c3ff5e6-....png  (tube)
│   │   │               └── manifest.json
│   │   ├── tetris/
│   │   │   └── game.ts              # No assets (procedural)
│   │   └── ...
│   ├── dist/
│   │   ├── ballSort.json            # Compiled JSON
│   │   ├── manifest.json            # Build manifest
│   │   └── static-registry.ts       # Auto-generated
│   └── scripts/
│       ├── build.ts                 # Compile games
│       └── serve.ts                 # Dev server
├── api/
│   ├── src/
│   │   ├── index.ts                 # Hono server + /local-assets route
│   │   ├── trpc/
│   │   │   └── routes/
│   │   │       ├── asset-system.ts  # Pack CRUD
│   │   │       └── games.ts         # Game sync
│   │   └── ai/
│   │       └── assets.ts            # Asset generation + R2 upload
│   ├── scripts/
│   │   ├── download-pack-assets.ts           # R2 → local
│   │   ├── sync-local-game-to-production.ts  # local → R2 + DB
│   │   ├── restructure-local-assets.ts       # Migrate to new layout
│   │   └── theme-game.ts                     # Apply AI theme
│   └── debug-output/                # Temporary AI generation output
├── app/
│   └── lib/
│       ├── game-engine/
│       │   └── hooks/
│       │       └── useAssetResolution.ts    # Asset resolution hook
│       ├── offline/
│       │   ├── settings.ts                  # Offline mode state
│       │   └── local-asset-server.ts        # Server URL config
│       └── config/
│           └── env.ts                       # Environment detection
└── shared/
    └── src/
        └── utils/
            └── asset-url.ts         # Core URL resolution logic
```

### Asset Paths by Environment

**Development**:
```
games/compiled/{gameId}/generated/{gameId}/{packId}/{assetId}.png
  ↓ (served by)
http://localhost:8789/local-assets/{gameId}/generated/{gameId}/{packId}/{assetId}.png
```

**Production**:
```
Cloudflare R2 Bucket: ASSETS
Key: generated/{gameId}/{packId}/{assetId}.png
  ↓ (served by)
https://cdn.slopcade.com/generated/{gameId}/{packId}/{assetId}.png
```

**Native Offline** (future):
```
{APP_DATA}/slopcade/games/{gameId}/generated/{gameId}/{packId}/{assetId}.png
  ↓ (served by)
file:///{APP_DATA}/slopcade/games/{gameId}/generated/{gameId}/{packId}/{assetId}.png
```

---

## CLI Tools & Scripts

### Asset Download

**Script**: `api/scripts/download-pack-assets.ts`

**Purpose**: Download assets from production R2 to local development directory.

**Usage**:
```bash
npx tsx api/scripts/download-pack-assets.ts \
  --pack=f661beb6-1e5e-4b9e-a01f-314c87248b75 \
  --template=ballSort \
  --api-url=http://localhost:8789
```

**Flow**:
1. Fetch pack from API: `assetSystem.getPack({ id })`
2. For each pack entry:
   - Download asset from R2 (via `/assets/{r2Key}` endpoint)
   - Save to: `games/compiled/{template}/{r2Key}`
3. Create `manifest.json` with templateId → r2Key mapping

### Asset Restructure

**Script**: `api/scripts/restructure-local-assets.ts`

**Purpose**: Migrate from friendly names to production R2 structure.

**Usage**:
```bash
npx tsx api/scripts/restructure-local-assets.ts
```

**Flow**:
1. Read `assets/manifest.json`
2. For each asset:
   - Move from: `assets/ball0.png`
   - To: `generated/ballSort/{packId}/{assetId}.png`
3. Move manifest into generated directory

**Before**:
```
assets/
  ball0.png
  tube.png
  manifest.json
```

**After**:
```
generated/
  ballSort/
    f661beb6.../
      a9df5fd0-....png
      2c3ff5e6-....png
      manifest.json
```

### Game Sync

**Script**: `api/scripts/sync-local-game-to-production.ts`

**Purpose**: Push local game + assets to production database + R2.

**Usage**:
```bash
# Sync to local dev database
npx tsx api/scripts/sync-local-game-to-production.ts --template=ballSort

# Sync to production
npx tsx api/scripts/sync-local-game-to-production.ts \
  --template=ballSort \
  --production
```

**Flow**:
1. Load game definition from `@slopcade/games`
2. Sync game to database: `games.syncTemplates.mutate()`
3. Read local `manifest.json`
4. For each asset:
   - Upload PNG to R2
   - Create asset record in database
   - Create pack entry linking template → asset
5. Set pack as active in game definition

### Theme Application

**Script**: `api/scripts/theme-game.ts`

**Purpose**: Generate themed assets for a game using AI.

**Usage**:
```bash
# Create new theme + generate assets
npx tsx api/scripts/theme-game.ts \
  --template=ballSort \
  --theme-name="Halloween" \
  --prompt="spooky halloween theme with pumpkins" \
  --style=cartoon \
  --process

# Use existing theme
npx tsx api/scripts/theme-game.ts \
  --template=ballSort \
  --theme=theme-uuid-123 \
  --process
```

**Flow**:
1. Load game template
2. Sync template to database (if not exists)
3. Create/fetch theme
4. Create generation job with tasks for each template
5. Process job: generate assets via Scenario.com API
6. Upload assets to R2
7. Create pack + entries in database
8. Set as active pack

---

## Implementation Details

### Asset Generation Pipeline

**Location**: `api/src/ai/pipeline/`

**Stages**:
1. **Silhouette Generation** — Creates shape mask from collider dimensions
2. **Text-to-Image** — Generates sprite via Scenario.com (Flux model)
3. **Image-to-Image** — Refines with silhouette constraint
4. **Background Removal** — Ensures transparent background
5. **Upload to R2** — Stores at `generated/{gameId}/{packId}/{assetId}.png`

**Debug Output**: `api/debug-output/{jobId}/` contains intermediate files for inspection.

### Pack Entry Creation

**Location**: `api/src/trpc/routes/asset-system.ts`

```typescript
setPackEntry: protectedProcedure
  .input(z.object({
    packId: z.string(),
    templateId: z.string(),
    assetId: z.string(),
    placement: placementSchema.optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const id = crypto.randomUUID();
    const r2Key = await ctx.env.DB.prepare(
      `SELECT r2_key FROM assets WHERE id = ?`
    ).bind(input.assetId).first<{ r2_key: string }>();
    
    await ctx.env.DB.prepare(
      `INSERT INTO pack_entries (id, pack_id, template_id, asset_id, placement_json)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(pack_id, template_id) 
       DO UPDATE SET asset_id = excluded.asset_id`
    ).bind(
      id, 
      input.packId, 
      input.templateId, 
      input.assetId,
      JSON.stringify(input.placement ?? null)
    ).run();
  });
```

### R2 Upload

**Location**: `api/src/ai/assets.ts`

```typescript
private async uploadToR2(
  buffer: Buffer,
  extension: string,
  entityType: string,
  context?: { gameId: string; packId: string },
  suffix?: string
): Promise<string> {
  const assetId = crypto.randomUUID();
  
  let r2Key: string;
  if (context?.gameId && context?.packId) {
    r2Key = buildR2Key(context.gameId, context.packId, assetId);
    // → "generated/{gameId}/{packId}/{assetId}.png"
  } else {
    r2Key = `generated/${entityType}/${assetId}${suffix || ''}${extension}`;
  }
  
  await this.env.ASSETS.put(r2Key, buffer, {
    httpMetadata: {
      contentType: extension === '.png' ? 'image/png' : 'image/webp',
    },
  });
  
  return r2Key;
}
```

### Asset URL Building

**Location**: `shared/src/utils/asset-url.ts`

```typescript
const R2_PREFIX = 'generated/';

export function buildR2Key(
  gameId: string, 
  packId: string, 
  assetId: string
): string {
  return `${R2_PREFIX}${gameId}/${packId}/${assetId}.png`;
}

export function getAssetUrl(
  r2Key: string, 
  cdnBaseUrl: string,
  config?: AssetUrlConfig
): string {
  if (config?.offlineMode && config.gameId && config.localServerUrl) {
    const base = config.localServerUrl.replace(/\/$/, '');
    return `${base}/${config.gameId}/${r2Key}`;
  }
  return `${cdnBaseUrl.replace(/\/$/, '')}/${r2Key}`;
}
```

---

## Future: Native Offline Support

### Vision

Downloaded games work fully offline on iOS/Android:
- User downloads game in app
- Assets stored in app data directory
- Game loads from local filesystem with `file://` URLs

### Implementation Plan

**1. Download Manager** (`app/lib/offline/download-manager.ts`):
```typescript
export async function downloadGame(gameId: string): Promise<void> {
  // 1. Fetch game definition + pack
  const game = await api.games.getById({ id: gameId });
  const pack = await api.assetSystem.getPackByName({ 
    name: game.definition.assetSystem.activePackId 
  });
  
  // 2. Create game directory
  const gameDir = `${FileSystem.documentDirectory}slopcade/games/${gameId}`;
  await FileSystem.makeDirectoryAsync(gameDir, { intermediates: true });
  
  // 3. Download assets
  for (const entry of pack.entries) {
    const assetUrl = entry.imageUrl; // CDN URL
    const localPath = `${gameDir}/${entry.r2Key}`;
    
    await FileSystem.downloadAsync(assetUrl, localPath);
  }
  
  // 4. Save game definition
  await FileSystem.writeAsStringAsync(
    `${gameDir}/game.json`,
    JSON.stringify(game)
  );
  
  // 5. Mark as downloaded
  await AsyncStorage.setItem(`game:${gameId}:downloaded`, 'true');
}
```

**2. File System Asset Serving**:
```typescript
export function getServerUrl(): string {
  if (Platform.OS === 'web') {
    return 'http://localhost:8789/local-assets';
  }
  
  // Native: file:// URLs
  return `file://${FileSystem.documentDirectory}slopcade/games`;
}

// Result: file:///app-data/slopcade/games/{gameId}/generated/{gameId}/{packId}/{assetId}.png
```

**3. Offline Game Loading**:
```typescript
export function useOfflineGame(gameId: string) {
  const [game, setGame] = useState<GameDefinition | null>(null);
  
  useEffect(() => {
    async function loadOfflineGame() {
      const gameDir = `${FileSystem.documentDirectory}slopcade/games/${gameId}`;
      const gameJson = await FileSystem.readAsStringAsync(`${gameDir}/game.json`);
      setGame(JSON.parse(gameJson));
    }
    loadOfflineGame();
  }, [gameId]);
  
  return game;
}
```

**4. Sync Status UI**:
- Show download progress
- Indicate which games are available offline
- Allow re-download if corrupted
- Clean up old downloads

---

## Summary

The Slopcade asset system is designed around **environment-agnostic R2 keys**:

**Local Dev**:
```
File: games/compiled/ballSort/generated/ballSort/{packId}/{assetId}.png
URL:  http://localhost:8789/local-assets/ballSort/generated/ballSort/{packId}/{assetId}.png
```

**Production**:
```
R2:  generated/ballSort/{packId}/{assetId}.png
URL: https://cdn.slopcade.com/generated/ballSort/{packId}/{assetId}.png
```

**Native Offline**:
```
File: {APP_DATA}/slopcade/games/ballSort/generated/ballSort/{packId}/{assetId}.png
URL:  file:///{APP_DATA}/slopcade/games/ballSort/generated/ballSort/{packId}/{assetId}.png
```

**All three use identical R2 key structures. Only the base URL changes.**

This architecture enables:
- ✅ Zero-config local development
- ✅ Seamless prod deployment
- ✅ Future offline support
- ✅ No mapping layers
- ✅ Consistent URL patterns

The system is production-ready and requires only implementation of the phases outlined in this document.
