# Task 6: Runtime Adapter Mode

## Status: Complete

## Files Created
- `app/lib/game-engine/ArtifactResolver.ts` — R2 and in-memory artifact resolvers
- `app/lib/game-engine/PackageRuntimeAdapter.ts` — Build artifacts → GameDefinition → bridge
- `app/lib/game-engine/__tests__/ArtifactResolver.test.ts` — 12 tests
- `app/lib/game-engine/__tests__/PackageRuntimeAdapter.test.ts` — 16 tests

## Architecture Decisions

### ArtifactResolver
- `R2ArtifactResolver`: Fetches from `{baseUrl}/games/{gameId}/build/{buildId}/{tag}.json`
- Caches by `{buildId}:{tag}` key, invalidates when artifact hash changes
- `ArtifactFetcher` type allows injection of custom fetch (web vs native)
- `InMemoryArtifactResolver`: For tests and editor preview, no network

### PackageRuntimeAdapter
- Takes `GodotBridge` + `ArtifactResolver` in constructor
- `loadPackage()`: Resolves all tag artifacts in order, converts to GameDefinition, calls `bridge.loadGame()`
- `loadByTag()`: Phase 1 implementation does full game reload (Task 7 will add incremental)
- `reloadChangedTags()`: Compares artifact hashes, re-resolves changed tags, full reload
- Asset URLs from `assets` tag group are preloaded via `bridge.preloadTextures()` before `loadGame()`

### Artifact → GameDefinition Mapping
- `world` → `definition.world` + `definition.background`
- `prefabs` → `definition.templates` (still using `templates` field per plan)
- `entities` → `definition.entities`
- `rules` → `definition.rules`
- `scripts` → `definition.script`
- `assets` → preloaded via bridge, not mapped to `assetSystem` (that's for pack-based assets)
- `WorkspaceManifest` fields → `definition.metadata`

### Phase 1 Limitations (marked in code)
- `loadByTag()` and `reloadChangedTags()` do full game reload via `clearGame()` + `loadGame()`
- Task 7 will replace with section-native loading using `setupWorld`, `registerTemplates`, `loadEntities`

## Dependencies Used
- `ArtifactResolver` interface from `shared/src/types/PackageRuntime.ts` (Task 1-2)
- `BuildManifest`, `TagGroup`, `TagPayloads`, `PackageLoadState`, `LoadResult` from shared
- `TAG_GROUPS` ordering from `PackageManifest.ts`
- `GodotBridge` interface from `app/lib/godot/types.ts`

## Test Coverage
- R2 URL construction, caching, cache invalidation, error handling
- Full package load, artifact-to-definition conversion, asset preloading
- Incremental tag loading, changed tag detection
- Edge cases: missing artifacts, bridge failures, empty scripts, default world
