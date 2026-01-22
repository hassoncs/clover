# Offline-First Architecture Plan

> **Status**: Planned (not started)  
> **Priority**: High (key differentiator)  
> **Estimated Effort**: 1-2 days  
> **Last Updated**: 2026-01-21

---

## Overview

All games should be **playable offline** as a key product differentiator. Users can tap "Download for Offline" on any game, and it works without network connectivity.

---

## Current State

| Component | Current Implementation | Gap |
|-----------|----------------------|-----|
| Game definitions | D1 database (cloud) | No local persistence |
| Image assets | R2 → `https://assets.clover.app/` | No caching, re-downloaded every session |
| Image loading | `useImage` hook (Skia) | No persistent cache |
| Local storage | `AsyncStorage` (auth only) | Not used for game data |
| FileSystem | Not used | Needed for asset blobs |

---

## Architecture Decision

Based on Oracle consultation (2026-01-21):

### Storage Strategy

| Component | Storage Location | Rationale |
|-----------|-----------------|-----------|
| Game definitions | SQLite (`expo-sqlite`) | Structured queries, update tracking, offline pinning |
| Asset blobs | `documentDirectory/assets/<hash>.<ext>` | Persists across app updates, not purged by OS |
| Download staging | `cacheDirectory/staging/<gameId>/` | Atomic move after complete download |

### Why This Approach

- **Reliability**: `cacheDirectory` is purgeable; offline games need `documentDirectory`
- **Simplicity**: Content-addressed assets (`<hash>.*`) auto-dedupe across games
- **Maintainability**: SQLite handles resume/progress/ref-count better than JSON files

---

## Database Schema

```sql
-- Game definitions stored as JSON with metadata
CREATE TABLE games (
  gameId TEXT PRIMARY KEY,
  version TEXT,
  definitionJson TEXT NOT NULL,
  updatedAt INTEGER,
  offlinePinned INTEGER DEFAULT 0  -- 1 = downloaded for offline
);

-- Content-addressed asset store
CREATE TABLE assets (
  hash TEXT PRIMARY KEY,
  remoteUrl TEXT,
  size INTEGER,
  ext TEXT,
  localPath TEXT,
  state TEXT DEFAULT 'missing',  -- missing | downloading | ready
  lastAccessedAt INTEGER
);

-- Many-to-many for deduplication tracking
CREATE TABLE game_assets (
  gameId TEXT,
  hash TEXT,
  PRIMARY KEY (gameId, hash)
);

-- Optional: resumable downloads
CREATE TABLE downloads (
  hash TEXT PRIMARY KEY,
  bytesSoFar INTEGER,
  error TEXT,
  updatedAt INTEGER
);
```

---

## Asset Manifest

Embedded in `GameDefinition`:

```typescript
interface GameDefinition {
  // ...existing fields
  assetManifest?: {
    version: string;
    images: Array<{
      url: string;      // https://assets.clover.app/...
      hash: string;     // content hash for dedup
      size: number;     // bytes
      critical?: boolean; // load first for "play now"
    }>;
    totalSize: number;
  };
}
```

**Server responsibility**: Generate `assetManifest` when game is saved, computing hashes for all referenced `imageUrl` values.

---

## File Layout

```
documentDirectory/
├── games.db              # SQLite database
└── assets/
    ├── a1b2c3d4.png      # hash-named, auto-deduped
    ├── e5f6g7h8.jpg
    └── ...

cacheDirectory/
└── staging/
    └── {gameId}/         # Temporary during download
        └── ...
```

---

## Download Strategy

### "Download for Offline" (Eager)
1. Fetch game definition from API
2. Parse `assetManifest.images`
3. Download all assets to staging directory
4. Verify integrity (size check, optional MD5)
5. Atomic move to `documentDirectory/assets/`
6. Update SQLite: `offlinePinned = 1`, asset states = `ready`

### "Play Now" (Hybrid)
1. Download game definition immediately
2. Download `critical` assets first (or first N sprites)
3. Start game with available assets
4. Continue downloading rest in background
5. Show progress indicator

---

## ImageRenderer Integration

### New Hooks

```typescript
// app/lib/offline/useAssetUri.ts
export function useAssetUri(url: string, gameId?: string): {
  uri: string;      // file:// if cached, https:// if not
  status: 'ready' | 'downloading' | 'missing';
}

// app/lib/offline/useCachedImage.ts
export function useCachedImage(url: string, gameId?: string) {
  const { uri } = useAssetUri(url, gameId);
  return useImage(uri);
}
```

### Usage in ImageRenderer

```typescript
// Before
const image = useImage(sprite.imageUrl);

// After
const image = useCachedImage(sprite.imageUrl, gameId);
```

---

## Cache Invalidation

- **Primary**: Content-hash (new hash = new file; old files GC'd when unreferenced)
- **Game updates**: Compare `version` from server; if changed, diff `assetManifest` and download new assets
- **No TTL**: Skip time-based expiry initially

---

## Garbage Collection

Run periodically (app launch, settings action):

```sql
-- Find assets not referenced by any game
SELECT hash FROM assets
WHERE hash NOT IN (SELECT hash FROM game_assets);
```

Delete orphaned files from `documentDirectory/assets/`.

---

## Storage Management

### Tracking
```sql
-- Total offline storage used
SELECT SUM(size) FROM assets WHERE state = 'ready';

-- Per-game storage
SELECT g.gameId, SUM(a.size) as totalSize
FROM games g
JOIN game_assets ga ON g.gameId = ga.gameId
JOIN assets a ON ga.hash = a.hash
GROUP BY g.gameId;
```

### User Controls
- Settings: "Offline storage used: X MB"
- Settings: "Clear cache" (delete unpinned games)
- Per-game: "Remove offline copy"

---

## Platform Considerations

| Platform | Storage Limit | Notes |
|----------|--------------|-------|
| iOS | ~50MB soft limit for documents | Aggressive cache purging by OS |
| Android | More flexible | Users can manually clear cache |

Typical game: 5-20 assets × 50-500KB each = 250KB - 10MB per game.

---

## Implementation Plan

### Phase 1: Database & File Infrastructure
- [ ] Create `app/lib/offline/` directory
- [ ] Implement `database.ts` with expo-sqlite setup and migrations
- [ ] Implement `AssetStorage.ts` for file operations
- [ ] Create database tables on app launch

### Phase 2: Asset Manager
- [ ] Implement `AssetManager.ts` class
  - [ ] `downloadAsset(url, hash)` with progress
  - [ ] `getLocalPath(hash)` lookup
  - [ ] `isOfflineReady(gameId)` check
  - [ ] `downloadGame(gameId)` orchestrator
- [ ] Implement resume/retry logic for failed downloads

### Phase 3: Hook Integration
- [ ] Create `useAssetUri.ts` hook
- [ ] Create `useCachedImage.ts` hook
- [ ] Update `ImageRenderer.tsx` to use `useCachedImage`
- [ ] Update `ParallaxBackground.tsx` similarly

### Phase 4: API Updates
- [ ] Add `assetManifest` field to `GameDefinition` type
- [ ] Update game save API to compute asset hashes
- [ ] Add endpoint to fetch manifest for existing games

### Phase 5: UI
- [ ] Add "Download for Offline" button to game list
- [ ] Add download progress indicator
- [ ] Add "Offline Ready" badge to downloaded games
- [ ] Add storage management in Settings
- [ ] Add "Remove offline copy" per-game action

### Phase 6: Testing & Polish
- [ ] Test offline playback (airplane mode)
- [ ] Test interrupted downloads and resume
- [ ] Test storage limits and GC
- [ ] Performance profiling

---

## Gotchas & Watchouts

1. **Skia `useImage(file://...)` support** varies by platform. If issues arise, fall back to manual decode:
   ```typescript
   const data = await FileSystem.readAsStringAsync(path, { encoding: 'base64' });
   const image = Skia.Image.MakeFromEncoded(Skia.Data.fromBase64(data));
   ```

2. **Resumable downloads** are best-effort. If resume fails, restart download cleanly.

3. **Integrity verification**: Use `size + MD5` (expo-file-system supports `md5: true`). Don't re-hash in JS unless needed.

4. **Concurrent downloads**: Limit to 3-4 parallel downloads to avoid overwhelming the network.

---

## Success Criteria

- [ ] User can download any game for offline play
- [ ] Downloaded games work in airplane mode
- [ ] Shared assets (common sprites) are deduplicated
- [ ] Download progress is visible
- [ ] Storage usage is trackable and manageable
- [ ] Interrupted downloads can resume

---

## Related Documents

- [Implementation Roadmap](./implementation-roadmap.md) - Phase 13
- [Asset Integration Design](../architecture/asset-integration-design.md)
- [Playability Contract](../reference/playability-contract.md)
