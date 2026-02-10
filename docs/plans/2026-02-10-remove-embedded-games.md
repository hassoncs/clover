# Plan: Remove Embedded Games, API-First + Download-for-Offline

## Problem
The app has a complex embedded games system using static `require()` calls that bundle game assets into the app. This creates two separate code paths (embedded vs database) and the embedded asset installation is broken on native. We want ONE unified flow.

## Target Architecture
- **Games always come from the API** for browsing/discovery
- **Download for offline**: Click download → game definition + assets saved to `{documentDirectory}/slopcade/games/{gameId}/`
- **Play**: If downloaded locally → play from local files. If not → play from API + CDN
- **No embedded games registry**, no static `require()` calls

## Key Finding
The existing `offlineManifest` tRPC endpoint already returns everything needed for offline play:
- Game definition
- All resolved asset URLs with packId
- This is the download source of truth

The current `downloadGameForOffline` is broken because `metadata.packs` is always `[]`. Rewriting it to use `offlineManifest` fixes this.

## Phases

### Phase 1: Extend download-manager (no breaking changes)
**File: `app/lib/offline/download-manager.ts`**

Add new functions:
- `loadLocalGameDefinition(gameId)` → reads definition.json from disk, returns parsed JSON or null
- `loadLocalPackManifest(gameId, packId)` → reads pack manifest from disk
- `getLocalAssetUrl(gameId, r2Key)` → returns `file://` URL for local asset
- Rewrite `downloadGameForOffline(gameId, packId?, onProgress?)` to use `offlineManifest` tRPC endpoint instead of broken CDN metadata path

**File: `app/components/DownloadForOfflineButton.tsx`**
- Update call to match new `downloadGameForOffline` signature

### Phase 2: Update play/[id].tsx for offline playback
**File: `app/app/play/[id].tsx`**

Add `offline` search param. When `offline=true`:
- Load game definition from local disk via `loadLocalGameDefinition(id)`
- Load pack assets from local disk, resolve URLs to `file://` paths
- Skip tRPC calls

When not offline (default):
- Current behavior: fetch from API, assets from CDN

### Phase 3: Update game-detail/[id].tsx
**File: `app/app/game-detail/[id].tsx`**

- Remove "template" vs "database" source distinction
- All games come from the API
- DownloadForOfflineButton shows offline status
- Play button: if game is downloaded, navigate to `/play/[id]?offline=true`. Otherwise navigate to `/play/[id]`
- Remove EMBEDDED_DEFINITIONS, EMBEDDED_METADATA imports

### Phase 4: Update useBrowseGames
**File: `app/hooks/useBrowseGames.ts`**

- Remove EMBEDDED_MANIFEST and EMBEDDED_METADATA imports
- Games come from API only
- Could add a "Downloaded" section that reads from AsyncStorage

### Phase 5: Update useAssetResolution
**File: `app/lib/game-engine/hooks/useAssetResolution.ts`**

- Remove EMBEDDED_PACK_MANIFESTS import
- Remove `convertEmbeddedPackManifestsToPack` function
- The "template" source path in `useAssetResolution` is no longer needed

### Phase 6: Remove _layout.tsx installer
**File: `app/app/_layout.tsx`**

- Remove `useEmbeddedGamesInstaller` hook
- Remove embedded-games imports

### Phase 7: Delete dead code
- Delete `app/app/game/[id].tsx` (template play screen → replaced by unified /play/[id])
- Delete or gut `app/lib/offline/embedded-games.ts` (installer no longer needed)
- Clean up `app/lib/offline/embedded-games-registry.ts` (already emptied)
- Remove debug console.logs added during debugging
- Redirect any routes from `/game/[id]` to `/play/[id]`

### Phase 8: Route redirects
- Update `game-detail/[id].tsx` `handlePlay` to always route to `/play/[id]`
- Update `maker.tsx` if it routes to `/game/[id]`
- Update any deep links

## Files Changed (summary)
| File | Action |
|------|--------|
| `app/lib/offline/download-manager.ts` | Extend with local-read functions, rewrite download flow |
| `app/components/DownloadForOfflineButton.tsx` | Update download call signature |
| `app/app/play/[id].tsx` | Add offline playback path |
| `app/app/game-detail/[id].tsx` | API-only, route to /play with offline param |
| `app/hooks/useBrowseGames.ts` | Remove embedded references |
| `app/lib/game-engine/hooks/useAssetResolution.ts` | Remove embedded references |
| `app/app/_layout.tsx` | Remove installer hook |
| `app/app/game/[id].tsx` | DELETE |
| `app/lib/offline/embedded-games.ts` | DELETE or gut |
| `app/lib/offline/embedded-games-registry.ts` | Already emptied |
| `app/lib/offline/local-asset-server.ts` | May simplify, functions moved to download-manager |
