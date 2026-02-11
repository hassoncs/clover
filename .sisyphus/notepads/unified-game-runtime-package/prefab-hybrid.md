# Task 9: Prefab/Scene Hybrid Support

## Status: Complete

## What was done

### New types (`shared/src/types/Prefab.ts`)
- `DataPrefabDefinition` — JSON-described prefab with `type: 'data'`, references an `EntityTemplate`
- `ScenePrefabDefinition` — Godot scene-backed prefab with `type: 'scene'`, stores `scenePath` (res:// format)
- `PrefabDefinition` — discriminated union of both
- `PrefabRegistry`, `PrefabInstantiateOpts`, `PrefabInstantiateResult` — supporting types

### Naming conflict resolution (`shared/src/types/GamePackage.ts`)
- Existing `PrefabDefinition` (alias for `EntityTemplate`) renamed to `LegacyPrefabDefinition`
- `GamePackage.prefabs` now accepts both `PrefabDefinition | LegacyPrefabDefinition`
- Re-exports `PrefabDefinition` from `Prefab.ts` for backward compatibility

### Bridge extension (`app/lib/godot/types.ts`)
- Added `instantiateFromScene(scenePath, entityId, position, properties?)` to `GodotBridge` interface
- Web implementation: uses `queryAsync("instantiate_scene", ...)` 
- Native implementation: uses `callGameBridgeAsync("instantiate_scene", ...)`

### PrefabInstantiator (`app/lib/game-engine/PrefabInstantiator.ts`)
- Registry-based: `registerPrefab`, `registerPrefabs`, `unregisterPrefab`, `clearRegistry`
- Unified `instantiate(prefabId, opts)` routes to data or scene path based on `type` discriminant
- Data path: calls `bridge.spawnEntity()` with template ID
- Scene path: calls `bridge.instantiateFromScene()` with scene path

### Orchestrator integration (`app/lib/game-engine/PackageRuntimeOrchestrator.ts`)
- Owns a `PrefabInstantiator` instance
- `applyPrefabsToBridge()` now also registers data-backed prefabs with the instantiator
- New `instantiatePrefab(prefabId, opts)` method delegates to instantiator
- `getPrefabInstantiator()` exposes the instantiator for direct scene prefab registration

## Test coverage
- 15 new tests in `PrefabInstantiator.test.ts` covering:
  - Registry management (register, unregister, clear, bulk register)
  - Data-backed instantiation (spawnEntity calls, entityId generation, velocity passthrough)
  - Scene-backed instantiation (instantiateFromScene calls, properties passthrough)
  - Mixed registry (both types through same API, error on missing prefab)
- All 32 existing orchestrator tests still pass
- All 16 existing adapter tests still pass

## Godot-side note
The `instantiate_scene` bridge method is declared but not yet implemented in GDScript (`GameBridge.gd`). The Godot side needs a `native_dispatch` handler for `"instantiate_scene"` that:
1. Loads the scene via `load(scene_path)` or `ResourceLoader`
2. Instantiates it
3. Sets position and properties
4. Returns `{ "entityId": entity_id }`

## Dependencies for next tasks
- Task 10 (big-bang rename): Can now rename `template` → `prefab` knowing the hybrid type system is in place
- Task 11 (legacy migration): Legacy games use data-backed prefabs by default; no migration needed for this feature
