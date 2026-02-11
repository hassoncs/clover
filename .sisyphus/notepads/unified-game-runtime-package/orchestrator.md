# Task 7: Tag-Native Runtime Loading (Orchestrator)

## Status: Complete

## What was built

### Files created
- `shared/src/types/FeatureFlags.ts` — `PackageRuntimeFlags` interface + `DEFAULT_PACKAGE_RUNTIME_FLAGS` constant
- `app/lib/game-engine/PackageRuntimeOrchestrator.ts` — Tag-native loading using bridge section methods
- `app/lib/game-engine/__tests__/PackageRuntimeOrchestrator.test.ts` — 32 tests (orchestrator + parity)

### Files modified
- `shared/src/types/index.ts` — Added `export * from './FeatureFlags'`
- `app/lib/game-engine/PackageRuntimeAdapter.ts` — Added feature flag support, orchestrator delegation

## Architecture

### Feature flag: `tagNativeLoading`
- Default: `false` (adapter mode — full `loadGame`)
- When `true`: delegates to `PackageRuntimeOrchestrator` which uses bridge section methods

### Orchestrator vs Adapter behavior
| Operation | Adapter (flag off) | Orchestrator (flag on) |
|-----------|-------------------|----------------------|
| `loadPackage` | Assemble GameDefinition → `loadGame` | `setupWorld` → `registerTemplates` → `loadEntities` |
| `loadByTag('entities')` | `clearGame` → `loadGame` (full reload) | `clearEntities` → `loadEntities` (incremental) |
| `loadByTag('world')` | `clearGame` → `loadGame` | `setupWorld` only |
| `loadByTag('rules')` | `clearGame` → `loadGame` | No bridge call (local state) |
| `reloadChangedTags` | Full reload for any change | Only changed tags get bridge calls |

### Tag → Bridge mapping
- `world` → `setupWorld(world, background)`
- `prefabs` → `registerTemplates(prefabs)`
- `entities` → `clearEntities()` + `loadEntities(entities)`
- `rules` → no bridge call (local state only)
- `scripts` → no bridge call (local state only)
- `assets` → `preloadTextures(urls)`

## Test coverage
- 48 total tests passing (16 existing adapter + 32 new)
- Parity tests confirm identical `success`, `loadedTags`, `errors`, and state between modes
- Incremental tag loading tested per-tag
- Feature flag toggle tested via `setFlags()`

## Decisions
- Orchestrator is a separate class (not subclass) — cleaner separation, adapter delegates via composition
- `syncStateFromOrchestrator()` keeps adapter's internal state in sync when delegating
- `getState()` returns orchestrator state directly when flag enabled (avoids stale reads)
- `ensureOrchestrator()` lazy-creates on first use

## Enables
- Task 8: Paused/playing mode works better with native loading (can pause physics before entity load)
- Task 10: Prefab rename — orchestrator already uses `registerTemplates` which maps to prefab registration
