# Dual-Mode Local Development Architecture

**Complete design for supporting both local template games AND database games in local web development.**

Last Updated: 2026-02-04

---

## Executive Summary

Local web development needs to support **TWO game sources simultaneously**:

1. **Template Games** (from `games/dist/*.json`) — Local file system, no database
2. **Database Games** (from local D1) — Local database with local asset server

The system should **auto-detect game source** and serve assets appropriately **without manual env var configuration**.

---

## Current State Analysis

### Game Sources Today

| Source | ID Format | Storage | Assets | API Query | Route |
|--------|-----------|---------|--------|-----------|-------|
| **Template** | String (e.g., "ballSort") | `games/dist/*.json` | `games/compiled/{id}/` | `getPublic` | `/test-games/[id]` |
| **Database** | UUID | Cloudflare D1 | Cloudflare R2 | `get` | `/play/[id]` |

### Template Game Loading (Current)

**File**: `api/src/dev/templateLoader.ts`

```typescript
export async function listTemplateGames(): Promise<TemplateGameSummary[]> {
  // 1. Try sidecar server first (http://localhost:3005/games)
  const sidecarGames = await fetchFromSidecar<SidecarGame[]>('/games');
  if (sidecarGames && sidecarGames.length > 0) {
    return sidecarGames.map(game => ({...}));
  }
  
  // 2. Fallback to static registry
  return listStaticGames();  // From @slopcade/games/static
}
```

**Issue**: No sidecar server exists! Falls back to static registry only.

### Database Game Loading (Current)

**File**: `api/src/trpc/routes/games.ts`

```typescript
listPublic: publicProcedure
  .input(z.object({ limit, offset }))
  .query(async ({ ctx, input }) => {
    // 1. Load templates (only on page 1)
    let templateGames = [];
    if (offset === 0) {
      const templates = await listTemplateGames();
      templateGames = templates.map(t => ({ ...t, source: 'template' }));
    }
    
    // 2. Load database games
    const dbGames = await ctx.env.DB.prepare(
      `SELECT * FROM games WHERE is_public = 1 AND deleted_at IS NULL`
    ).bind().all();
    
    return [...templateGames, ...dbGames.results.map(g => ({ ...g, source: 'database' }))];
  });
```

### Asset Resolution (Current)

**File**: `app/lib/game-engine/hooks/useAssetResolution.ts`

```typescript
// Fetches asset pack from DATABASE via tRPC
const dbPackQuery = trpcReact.assetSystem.getPackByName.useQuery(
  { name: activePackId! },
  { enabled: !!activePackId }
);

// Converts R2 keys to URLs
const dbPack = convertDbPackToEmbedded(dbPackQuery.data, {
  offlineMode: isOffline,           // true in dev
  localServerUrl: getServerUrl(),   // http://localhost:8789/local-assets
  gameId: definition.metadata.id,
});
```

**Issue**: Template games also query the database for packs, which won't exist!

---

## Desired State: Dual-Mode Architecture

### Goal

In **local web dev**, support **both** modes seamlessly:

| Mode | Game Source | Asset Source | Database Calls | Network Calls |
|------|-------------|--------------|----------------|---------------|
| **Template Mode** | `games/dist/*.json` (local files) | `games/compiled/` (local files) | ❌ NO | ❌ NO (except tRPC to local API) |
| **Database Mode** | Local D1 database | Local asset server (`/local-assets`) | ✅ YES (local D1) | ✅ YES (local API only) |

### Auto-Detection Logic

**Game Source Detection**:
```typescript
if (isTemplateGameId(id)) {
  // Template mode: load from games/dist/{id}.json
  source = 'template';
  assetSource = 'local-file-system';
} else {
  // Database mode: load from D1
  source = 'database';
  assetSource = 'local-asset-server';
}
```

**No environment variables needed** - detection happens at runtime based on game ID.

---

## Implementation Design

### 1. Local Game File Server

**New endpoint in API**: `GET /local-games/{gameId}`

**Purpose**: Serve compiled game JSON files from `games/dist/` directory.

**Implementation** (`api/src/index.ts`):

```typescript
app.get("/local-games/:gameId", async (c) => {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  if (!isDev) {
    return c.text("Not available in production", 403);
  }

  const gameId = c.req.param('gameId');
  
  try {
    const { readFile } = await import('node:fs/promises');
    const { join, resolve } = await import('node:path');
    
    const gamesDistRoot = resolve(process.cwd(), '../games/dist');
    const filePath = join(gamesDistRoot, `${gameId}.json`);
    const resolvedPath = resolve(filePath);
    
    if (!resolvedPath.startsWith(gamesDistRoot) || !resolvedPath.endsWith('.json')) {
      return c.text("Forbidden", 403);
    }

    const gameJson = await readFile(resolvedPath, 'utf-8');
    const game = JSON.parse(gameJson);
    
    return c.json({
      id: gameId,
      title: game.title,
      description: game.description,
      definition: JSON.stringify(game.definition),
      source: 'template',
    });
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      return c.text(`Game not found: ${gameId}`, 404);
    }
    console.error("Local game serve error:", e);
    return c.text("Internal Server Error", 500);
  }
});
```

**Result**: Template games can be fetched via `http://localhost:8789/local-games/ballSort` without database.

### 2. Local Asset Server (Already Implemented)

**Endpoint**: `GET /local-assets/*`

**Serves**: Assets from `games/compiled/{gameId}/generated/...`

**Example**:
```
Request:  http://localhost:8789/local-assets/ballSort/generated/ballSort/{packId}/{assetId}.png
File:     games/compiled/ballSort/generated/ballSort/{packId}/{assetId}.png
```

**Status**: Already implemented in Phase 2.

### 3. Template Pack Metadata Endpoint

**Problem**: Template games have pack metadata in `manifest.json`, but it's not in the database.

**Solution**: Serve pack metadata from local files.

**New endpoint**: `GET /local-packs/:packName`

**Implementation**:

```typescript
app.get("/local-packs/:packName", async (c) => {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  if (!isDev) {
    return c.text("Not available in production", 403);
  }

  const packName = c.req.param('packName');
  
  // Parse pack name format: "ballSort-default" or "{gameId}-{packId}"
  const [gameId, ...rest] = packName.split('-');
  
  try {
    const { readFile } = await import('node:fs/promises');
    const { join, resolve } = await import('node:path');
    const { buildR2Key } = await import('@slopcade/shared');
    
    // Find the manifest in games/compiled/{gameId}/generated/{gameId}/*/manifest.json
    const gameRoot = resolve(process.cwd(), '../games/compiled', gameId);
    const generatedDir = join(gameRoot, 'generated', gameId);
    
    // List directories in generatedDir (pack IDs)
    const { readdir } = await import('node:fs/promises');
    const packDirs = await readdir(generatedDir, { withFileTypes: true });
    const packDir = packDirs.find(d => d.isDirectory());
    
    if (!packDir) {
      return c.text(`Pack not found: ${packName}`, 404);
    }
    
    const manifestPath = join(generatedDir, packDir.name, 'manifest.json');
    const manifestJson = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestJson);
    
    // Convert manifest to pack entries format
    const entries = Object.entries(manifest).map(([templateId, entry]) => ({
      templateId,
      r2Key: entry.r2Key,
      imageUrl: null,  // Will be resolved client-side
      placement: null,
    }));
    
    return c.json({
      id: packName,
      name: packName,
      baseGameId: gameId,
      description: `Local pack for ${gameId}`,
      entries,
    });
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      return c.text(`Pack not found: ${packName}`, 404);
    }
    console.error("Local pack serve error:", e);
    return c.text("Internal Server Error", 500);
  }
});
```

### 4. Updated Asset Resolution Hook

**File**: `app/lib/game-engine/hooks/useAssetResolution.ts`

**Changes**:

```typescript
export function useAssetResolution(
  entities: RuntimeEntity[],
  definition: GameDefinition,
  source: 'template' | 'database'  // ← NEW PARAMETER
): Map<string, ResolvedAsset | null> {
  const activePackId = definition.assetSystem?.activePackId;
  const { isOffline } = useOfflineMode();
  
  // For template games, use local pack endpoint instead of database
  const packQuery = trpcReact.assetSystem.getPackByName.useQuery(
    { name: activePackId! },
    { 
      enabled: !!activePackId && source === 'database',  // ← Only for database games
      staleTime: 5 * 60 * 1000,
    }
  );
  
  // For template games, fetch from local pack endpoint
  const localPackQuery = useQuery({
    queryKey: ['localPack', activePackId],
    queryFn: async () => {
      if (!activePackId) return null;
      const response = await fetch(`http://localhost:8789/local-packs/${activePackId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!activePackId && source === 'template',  // ← Only for template games
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const packData = source === 'database' ? packQuery.data : localPackQuery.data;
    if (!packData) return new Map();

    // Convert pack to embedded format with URLs
    const config: AssetUrlConfig = {
      offlineMode: true,  // Always true in local dev
      localServerUrl: 'http://localhost:8789/local-assets',
      gameId: definition.metadata.id,
    };
    
    const dbPack = convertDbPackToEmbedded(packData, config);

    // Build resolution map
    const resolutionMap = new Map<string, ResolvedAsset | null>();
    for (const entity of entities) {
      resolutionMap.set(entity.id, resolveAssetForEntity(entity, {
        activePackId,
        assetPacks: { [dbPack.name]: dbPack },
      }));
    }

    return resolutionMap;
  }, [entities, activePackId, source, packQuery.data, localPackQuery.data]);
}
```

### 5. Updated Play Screens

**Template Games Screen** (`app/app/test-games/[id].tsx`):

```typescript
// Change from database query to local file fetch
useEffect(() => {
  const load = async () => {
    try {
      const response = await fetch(`http://localhost:8789/local-games/${id}`);
      const game = await response.json();
      const definition = JSON.parse(game.definition);
      setGameDefinition(definition);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game');
    }
  };
  load();
}, [id]);

// Pass source to asset resolution
const { phase, progress, imageUrls, startPreload } = useGamePreloader(
  gameDefinition,
  { 
    resolvedPackEntries,
    source: 'template',  // ← NEW
  }
);
```

**Database Games Screen** (`app/app/play/[id].tsx`):

```typescript
// Keep existing tRPC database query
const game = await trpc.games.get.query({ id });

// Pass source to asset resolution
const { phase, progress, imageUrls, startPreload } = useGamePreloader(
  gameDefinition,
  { 
    resolvedPackEntries,
    source: 'database',  // ← NEW
  }
);
```

---

## Complete URL Matrix

### Template Games (Local Dev)

| Resource | URL | File Source |
|----------|-----|-------------|
| Game JSON | `http://localhost:8789/local-games/ballSort` | `games/dist/ballSort.json` |
| Pack Metadata | `http://localhost:8789/local-packs/ballSort-default` | `games/compiled/ballSort/generated/.../manifest.json` |
| Asset | `http://localhost:8789/local-assets/ballSort/generated/ballSort/{packId}/{assetId}.png` | `games/compiled/ballSort/generated/.../{assetId}.png` |

### Database Games (Local Dev)

| Resource | URL | Data Source |
|----------|-----|-------------|
| Game JSON | `http://localhost:8789/trpc/games.get` | Local D1 database |
| Pack Metadata | `http://localhost:8789/trpc/assetSystem.getPackByName` | Local D1 database |
| Asset | `http://localhost:8789/local-assets/generated/{gameId}/{packId}/{assetId}.png` | `games/compiled/{gameId}/generated/.../` |

### Production (Web)

| Resource | URL | Data Source |
|----------|-----|-------------|
| Game JSON | `https://api.slopcade.com/trpc/games.get` | Production D1 |
| Pack Metadata | `https://api.slopcade.com/trpc/assetSystem.getPackByName` | Production D1 |
| Asset | `https://cdn.slopcade.com/generated/{gameId}/{packId}/{assetId}.png` | Cloudflare R2 |

### Native App (Production)

| Resource | URL | Data Source |
|----------|-----|-------------|
| Game JSON | `https://api.slopcade.com/trpc/games.get` | Production D1 |
| Pack Metadata | `https://api.slopcade.com/trpc/assetSystem.getPackByName` | Production D1 |
| Asset | `https://cdn.slopcade.com/generated/{gameId}/{packId}/{assetId}.png` | Cloudflare R2 |

### Native App (Offline)

| Resource | URL | Data Source |
|----------|-----|-------------|
| Game JSON | `file:///.../slopcade/games/{gameId}/game.json` | Device storage |
| Pack Metadata | (embedded in game.json) | Device storage |
| Asset | `file:///.../slopcade/games/{gameId}/generated/.../` | Device storage |

---

## Browse Screen Updates

**File**: `app/app/(tabs)/browse.tsx`

Currently uses `useBrowseGames` hook which calls `trpc.games.listPublic`.

**Updated Hook** (`app/hooks/useBrowseGames.ts`):

```typescript
export function useBrowseGames({ pageSize }: { pageSize: number }) {
  const isDev = process.env.NODE_ENV === 'development';
  
  // In dev: fetch template games from local files
  const localGamesQuery = useQuery({
    queryKey: ['localTemplateGames'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8789/local-games');
      return response.json();
    },
    enabled: isDev,
  });
  
  // Always fetch database games via tRPC
  const { data: publicGames, ...rest } = trpcReact.games.listPublic.useInfiniteQuery(
    { limit: pageSize },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );
  
  // Combine template games + database games
  const allGames = useMemo(() => {
    const templates = isDev && localGamesQuery.data ? localGamesQuery.data : [];
    const dbGames = publicGames?.pages.flatMap(p => p.games) ?? [];
    return [...templates, ...dbGames];
  }, [localGamesQuery.data, publicGames, isDev]);
  
  return { publicGames: allGames, ...rest };
}
```

**New API endpoint**: `GET /local-games` (list all local template games)

---

## Migration Plan

### Phase 1: Local Game File Server ✅ (15 min)
- Add `/local-games/:gameId` endpoint
- Add `/local-games` list endpoint
- Test: `curl http://localhost:8789/local-games/ballSort`

### Phase 2: Local Asset Server ✅ (Already Done)
- `/local-assets/*` endpoint exists
- Test: `curl http://localhost:8789/local-assets/ballSort/generated/.../asset.png`

### Phase 3: Local Pack Metadata Server (30 min)
- Add `/local-packs/:packName` endpoint
- Parse manifest.json from local files
- Return pack entries in database format

### Phase 4: Update Asset Resolution Hook (30 min)
- Add `source` parameter to `useAssetResolution`
- Conditionally fetch from database vs local pack endpoint
- Update URL resolution logic

### Phase 5: Update Play Screens (15 min)
- Change template game screen to fetch from `/local-games`
- Pass `source` parameter to hooks
- Test both modes independently

### Phase 6: Update Browse Screen (30 min)
- Add local template game fetching
- Merge template + database game lists
- Preserve source indicators in UI

### Phase 7: Testing (1 hour)
- Test template game loading end-to-end
- Test database game loading end-to-end
- Test asset resolution for both modes
- Verify no database calls for template games
- Verify correct asset URLs for both modes

---

## Summary

**Dual-mode local dev enables**:
- ✅ Template games work without database (pure local files)
- ✅ Database games work with local D1 + local asset server
- ✅ Both modes coexist on browse screen
- ✅ Auto-detection based on game ID (no env vars)
- ✅ Assets served correctly for each mode
- ✅ Clean separation of concerns
- ✅ Production deployment unaffected

**Key insight**: The "sidecar server" concept already exists in code but was never implemented. We're completing that vision by adding local file serving endpoints to the main API server.
