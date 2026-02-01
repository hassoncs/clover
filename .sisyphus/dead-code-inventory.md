# Dead Code Inventory

> Generated: 2026-02-01
> Purpose: Complete inventory of legacy Box2D patterns that must be removed

## Summary

The codebase contains significant legacy Box2D abstraction patterns that are no longer needed now that Godot handles physics directly. These patterns include:
- **Body ID mapping** (body_id_map, body_id_reverse, next_body_id)
- **Collider ID mapping** (collider_id_map, next_collider_id, entity_shape_map)
- **Sensor velocity tracking** (sensor_velocities)
- **Legacy JS callbacks** (_js_create_body, _js_add_fixture, _js_set_sensor)
- **TypeScript branded types** (BodyId, ColliderId, createBodyId, createColliderId)
- **Fixture abstraction** (FixtureDef, addFixture)

---

## Godot Side

### GameBridge.gd

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 152 | `var sensor_velocities: Dictionary = {}` | DELETE | Legacy Box2D pattern - no longer used |
| 172 | `var body_id_map: Dictionary = {}` | DELETE | Legacy Box2D body ID mapping |
| 173 | `var body_id_reverse: Dictionary = {}` | DELETE | Legacy Box2D reverse mapping |
| 174 | `var next_body_id: int = 1` | DELETE | Legacy Box2D ID counter |
| 177 | `var collider_id_map: Dictionary = {}` | DELETE | Legacy Box2D collider mapping |
| 178 | `var next_collider_id: int = 1` | DELETE | Legacy Box2D collider counter |
| 185 | `var entity_shape_map: Dictionary = {}` | DELETE | Legacy Box2D shape mapping |
| 590 | `var create_body_cb = JavaScriptBridge.create_callback(_js_create_body)` | DELETE | Legacy JS callback |
| 594 | `var add_fixture_cb = JavaScriptBridge.create_callback(_js_add_fixture)` | DELETE | Legacy JS callback |
| 598-600 | `var set_sensor_cb = ...` | DELETE | Legacy JS callback |
| 871 | `func _js_apply_impulse(args: Array) -> void:` | INVESTIGATE | May still be used |
| 1503-1505 | body_id_map assignment block | DELETE | Legacy mapping |
| 2130 | `# sensor_velocities cleanup no longer needed` | DELETE | Dead comment |
| 2198 | `# sensor_velocities.clear()` | DELETE | Dead comment |
| 2210-2213 | `.clear()` calls for legacy maps | DELETE | Legacy cleanup |
| 2467-2468 | `body_id_map.has(entity_id)` check | DELETE | Legacy lookup |
| 2626-2627 | `body_id_map` usage | DELETE | Legacy lookup |
| 2651 | `body_id_map.get(entity_id, -1)` | DELETE | Legacy lookup |
| 2684 | `body_id_map.get(entity_id, -1)` | DELETE | Legacy lookup |
| 2721 | `body_id_map.get(entity_id, -1)` | DELETE | Legacy lookup |
| 2758-2765 | `body_id_map.get(other_entity, -1)` | DELETE | Legacy lookup |
| 2774 | `func _js_create_body(args: Array) -> int:` | DELETE | Legacy JS callback function |
| 2815-2830 | body_id_map assignment in _js_create_body | DELETE | Legacy function body |
| 2834 | `func _js_add_fixture(args: Array) -> int:` | DELETE | Legacy JS callback function |
| 2842-2845 | body_id_reverse lookup | DELETE | Legacy lookup |
| 2930-2940 | collider_id_map and entity_shape_map usage | DELETE | Legacy mapping |
| 2963 | `func _js_set_sensor(args: Array) -> void:` | DELETE | Legacy JS callback |
| 2971 | `func set_sensor(collider_id: int, is_sensor: bool) -> void:` | DELETE | Legacy function |
| 3019 | `return _js_add_fixture(args)` | DELETE | Legacy call |
| 3027-3042 | body_id_reverse lookups | DELETE | Legacy lookups |
| 3064-3110 | body_id_map assignments | DELETE | Legacy assignments |
| 3116-3129 | body_id_reverse lookups | DELETE | Legacy lookups |
| 3143-3183 | entity_shape_map usage | DELETE | Legacy shape mapping |

### EntityManager.gd

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 9 | `var body_id_map: Dictionary = {}` | DELETE | Legacy Box2D mapping |
| 10 | `var body_id_reverse: Dictionary = {}` | DELETE | Legacy Box2D mapping |
| 11 | `var entity_shape_map: Dictionary = {}` | DELETE | Legacy Box2D mapping |
| 12 | `var next_body_id: int = 1` | DELETE | Legacy Box2D counter |
| 53-56 | body_id assignment block | DELETE | Legacy mapping |
| 64-67 | body_id_map cleanup | DELETE | Legacy cleanup |
| 89 | `body_id_reverse.get(body_id)` | DELETE | Legacy lookup |
| 262-263 | `body_id_map.has(entity_id)` | DELETE | Legacy lookup |
| 300 | `return body_id_map.get(entity_id)` | DELETE | Legacy lookup |
| 317-331 | entity_shape_map functions | DELETE | Legacy shape mapping |
| 344 | `return body_id_map.get(entity_id, -1)` | DELETE | Legacy lookup |
| 357-360 | `.clear()` calls | DELETE | Legacy cleanup |

### EntityFactory.gd

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 11 | `var _body_id_map: Dictionary = {}` | DELETE | Legacy Box2D mapping |
| 12 | `var _body_id_reverse: Dictionary = {}` | DELETE | Legacy Box2D mapping |
| 13 | `var _next_body_id: int = 1` | DELETE | Legacy Box2D counter |
| 14 | `var _entity_shape_map: Dictionary = {}` | DELETE | Legacy Box2D mapping |
| 27-39 | Constructor params for legacy maps | DELETE | Legacy initialization |
| 49-52 | Bridge reference assignments | DELETE | Legacy assignments |
| 270-273 | _body_id_map assignments | DELETE | Legacy mapping |
| 307-310 | _body_id_map assignments | DELETE | Legacy mapping |
| 450-456 | _body_id_map and _entity_shape_map cleanup | DELETE | Legacy cleanup |

### PhysicsQueries.gd

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 27 | `bridge.body_id_map.get(collider.name, -1)` | DELETE | Legacy lookup |
| 84 | `bridge.body_id_map.get(collider.name, -1)` | DELETE | Legacy lookup |
| 115 | `bridge.body_id_map.get(entity_id, -1)` | DELETE | Legacy lookup |

### DebugEvents.gd

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 217-218 | `_game_bridge.body_id_map.get(entity_id, -1)` | DELETE | Legacy lookup |

### DebugLifecycle.gd

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 179-182 | body_id_map cleanup | DELETE | Legacy cleanup |
| 226-228 | body_id_map assignment | DELETE | Legacy assignment |

### EventEmitter.gd

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 28 | `func set_sensor_begin_callback(cb: JavaScriptObject) -> void:` | DELETE | Legacy callback |
| 32 | `func set_sensor_end_callback(cb: JavaScriptObject) -> void:` | DELETE | Legacy callback |

### JSBridge.gd

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 129 | `func _js_apply_impulse(args: Array) -> void:` | INVESTIGATE | May still be used |

---

## TypeScript Side

### GodotPhysicsAdapter.ts (CRITICAL - Many TS Errors)

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 5-6 | `import type { BodyId, ColliderId, ... }` | DELETE | Types don't exist in types.ts |
| 11 | `import type { FixtureDef, ... }` | DELETE | Type doesn't exist |
| 25-26 | `import { createBodyId, createColliderId, ... }` | DELETE | Functions don't exist |
| 33 | `FixtureDef as GodotFixtureDef` | DELETE | Type doesn't exist |
| 43-45 | `bodyIdToEntityId`, `entityIdToBodyId`, `colliderIdMap` | DELETE | Legacy maps |
| 56-57 | `nextBodyId`, `nextColliderId` | DELETE | Legacy counters |
| 69-71 | `createBodyId(event.bodyId)` | DELETE | Legacy function call |
| 78-81 | `entityIdToBodyId.get/delete` | DELETE | Legacy map operations |
| 90 | `entityIdToBodyId.get(entityId)` | DELETE | Legacy lookup |
| 107 | `entityIdToBodyId.get(entityId)` | DELETE | Legacy lookup |
| 139-149 | `entityIdToBodyId.get` lookups | DELETE | Legacy lookups |
| 157-181 | `createColliderId`, `createBodyId` calls | DELETE | Legacy function calls |
| 195-197 | `.clear()` calls | DELETE | Legacy cleanup |
| 209-216 | `createBody` function | DELETE | Legacy function |
| 244-249 | `destroyBody` function | DELETE | Legacy function |
| 255-266 | `addFixture`, `removeFixture` functions | DELETE | Legacy functions |
| 268-269 | `setSensor` function | DELETE | Legacy function |
| 272-331 | Body transform/velocity functions | INVESTIGATE | May need refactoring |
| 349-377 | Force/impulse functions | INVESTIGATE | May need refactoring |
| 512-521 | `queryPoint`, `queryAABB` | INVESTIGATE | May need refactoring |
| 567-595 | `getUserData`, `setUserData`, `getGroup`, `getAllBodies`, etc. | INVESTIGATE | May need refactoring |

### Physics2D.ts (Interface Definition)

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 2-3 | `import type { BodyId, ColliderId, ... }` | DELETE | Types don't exist |
| 8 | `import type { FixtureDef, ... }` | DELETE | Type doesn't exist |
| 26-27 | `createBody(def: BodyDef): BodyId` | REFACTOR | Change to entity-based API |
| 29-31 | `addFixture`, `removeFixture`, `setSensor` | DELETE | Legacy fixture API |
| 33-45 | Body-based transform/velocity/force methods | REFACTOR | Change to entity-based API |
| 56-57 | `queryPoint`, `queryAABB` returning BodyId | REFACTOR | Change to entity-based API |
| 68-73 | `getUserData`, `setUserData`, `getGroup`, etc. | REFACTOR | Change to entity-based API |

### types.ts (physics2d)

| Line | Code | Status | Reason |
|------|------|--------|--------|
| N/A | Missing `BodyId` type | ADD | Needed for compilation (or remove all usages) |
| N/A | Missing `ColliderId` type | ADD | Needed for compilation (or remove all usages) |
| N/A | Missing `createBodyId` function | ADD | Needed for compilation (or remove all usages) |
| N/A | Missing `createColliderId` function | ADD | Needed for compilation (or remove all usages) |
| N/A | Missing `FixtureDef` type | ADD | Needed for compilation (or remove all usages) |

### EntityManager.ts

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 15 | `import { createBodyId, createColliderId }` | DELETE | Functions don't exist |
| 176-177 | `createBodyId`, `createColliderId` calls | DELETE | Legacy function calls |
| 355-363 | `FixtureDef` usage and `addFixture` call | DELETE | Legacy fixture API |
| 674 | `getEntityByBodyId(bodyId: { value: number })` | REFACTOR | Change to entity-based API |
| 697 | `getEntityByBodyId(bodyId)` | REFACTOR | Change to entity-based API |

### TileMapPhysics.ts

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 1 | `import type { Physics2D, BodyId }` | DELETE | BodyId doesn't exist |
| 18-19 | `BodyId[]` return type | REFACTOR | Change to entity-based API |
| 37 | `physics.addFixture(bodyId, {...})` | DELETE | Legacy fixture API |
| 104 | `destroyTileMapBodies(physics: Physics2D, bodyIds: BodyId[])` | REFACTOR | Change to entity-based API |

### GodotBridge.web.ts

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 17 | `import type { FixtureDef, ... }` | DELETE | Type doesn't exist |
| 28-30 | `sensorColliderId`, `otherBodyId`, `otherColliderId` | INVESTIGATE | May be used for events |
| 90 | `addFixture: (...args) => number` | DELETE | Legacy API |
| 91 | `setSensor: (colliderId, isSensor) => void` | DELETE | Legacy API |
| 361-372 | Sensor event handling with collider IDs | INVESTIGATE | May need refactoring |
| 698-722 | `addFixture` function | DELETE | Legacy function |
| 725-726 | `setSensor` function | DELETE | Legacy function |

### GodotBridge.native.ts

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 16 | `import type { FixtureDef, ... }` | DELETE | Type doesn't exist |
| 244-258 | Sensor event handling with collider IDs | INVESTIGATE | May need refactoring |
| 899 | `addFixture(bodyId: number, def: FixtureDef)` | DELETE | Legacy function |
| 928 | `setSensor(colliderId: number, isSensor: boolean)` | DELETE | Legacy function |

### godot/types.ts

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 28-30 | `sensorColliderId`, `otherBodyId`, `otherColliderId` in SensorEvent | INVESTIGATE | May need refactoring |
| 269 | `addFixture(bodyId: number, def: ColliderConfig): number` | DELETE | Legacy API |
| 270 | `setSensor(colliderId: number, isSensor: boolean): void` | DELETE | Legacy API |

### Test Files

| File | Status | Reason |
|------|--------|--------|
| `mock-godot-bridge.ts` | UPDATE | Remove `addFixture`, `setSensor` mocks |
| `bridge-contracts.test.ts` | UPDATE | Remove `addFixture`, `setSensor` tests |
| `EntityManager.query.test.ts` | UPDATE | Remove `addFixture` mock, `getEntityByBodyId` mock |
| `templateImmutability.test.ts` | UPDATE | Remove `addFixture` tests |
| `BehaviorExecutorRuntimeSystem.test.ts` | UPDATE | Remove `addFixture`, `setSensor` mocks |
| `BehaviorExecutorRuntimeSystem.velocity.test.ts` | UPDATE | Remove `createBodyId` import and usage |
| `runnerHarness.ts` | UPDATE | Remove `createBodyId` import and usage |

---

## Recommended Deletion Order

### Wave 1: Fix TypeScript Compilation (URGENT)
1. Add missing types to `physics2d/types.ts` OR remove all usages
2. This is blocking - the codebase has TypeScript errors

### Wave 2: Remove Godot Legacy Maps
1. Remove `body_id_map`, `body_id_reverse`, `next_body_id` from all Godot files
2. Remove `collider_id_map`, `next_collider_id` from all Godot files
3. Remove `entity_shape_map` from all Godot files
4. Remove `sensor_velocities` from GameBridge.gd

### Wave 3: Remove Legacy JS Callbacks
1. Remove `_js_create_body`, `_js_add_fixture`, `_js_set_sensor` functions
2. Remove callback registrations in GameBridge.gd

### Wave 4: Remove TypeScript Legacy API
1. Remove `addFixture`, `removeFixture`, `setSensor` from Physics2D interface
2. Remove implementations from GodotPhysicsAdapter.ts
3. Remove from GodotBridge.web.ts and GodotBridge.native.ts
4. Update all test files

### Wave 5: Refactor to Entity-Based API
1. Change `BodyId` parameters to `entityId: string` throughout
2. Update Physics2D interface to use entity IDs
3. Update all callers

---

## Files Summary

### DELETE (entire file or major sections)
- None - all files have mixed live and dead code

### HEAVY REFACTORING NEEDED
- `app/lib/godot/GodotPhysicsAdapter.ts` - Most of file is legacy
- `app/lib/physics2d/Physics2D.ts` - Interface needs redesign
- `godot_project/scripts/GameBridge.gd` - ~200 lines of legacy code

### LIGHT CLEANUP NEEDED
- `godot_project/scripts/entity/EntityManager.gd`
- `godot_project/scripts/entity/EntityFactory.gd`
- `godot_project/scripts/physics/PhysicsQueries.gd`
- `godot_project/scripts/bridge/debug/DebugEvents.gd`
- `godot_project/scripts/bridge/debug/DebugLifecycle.gd`
- `godot_project/scripts/bridge/EventEmitter.gd`
- `app/lib/godot/GodotBridge.web.ts`
- `app/lib/godot/GodotBridge.native.ts`
- `app/lib/godot/types.ts`
- `app/lib/game-engine/EntityManager.ts`
- `app/lib/game-engine/TileMapPhysics.ts`

### TEST FILES TO UPDATE
- `app/lib/godot/__tests__/mock-godot-bridge.ts`
- `app/lib/godot/__tests__/bridge-contracts.test.ts`
- `app/lib/game-engine/__tests__/EntityManager.query.test.ts`
- `app/lib/game-engine/__tests__/templates/templateImmutability.test.ts`
- `app/lib/game-engine/systems/runner/__tests__/BehaviorExecutorRuntimeSystem.test.ts`
- `app/lib/game-engine/systems/runner/__tests__/BehaviorExecutorRuntimeSystem.velocity.test.ts`
- `app/lib/game-engine/systems/runner/__tests__/helpers/runnerHarness.ts`

---

## Shared Package Dead Code

### shared/src/types/entity.ts

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 2 | `import type { ZoneComponent } from './physics'` | DELETE | Type doesn't exist in physics.ts |
| 66 | `zone?: ZoneComponent` | DELETE | Type doesn't exist |
| 112 | `zone?: ZoneComponent` | DELETE | Type doesn't exist |
| 121 | `{ type: 'zone'; zone: ZoneComponent }` | DELETE | Type doesn't exist |
| 151 | `export { ZoneEntityDefinition } from './physics'` | DELETE | Type doesn't exist |

### shared/src/types/index.ts

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 36 | `ZoneComponent,` | DELETE | Type doesn't exist |
| 37 | `ZoneEntityDefinition,` | DELETE | Type doesn't exist |

### shared/src/types/schemas.ts

| Line | Code | Status | Reason |
|------|------|--------|--------|
| 154 | `export const ZoneComponentSchema = z.object({...})` | DELETE | Unused schema |
| 165 | `export const ZoneEntityDefinitionSchema = z.object({...})` | DELETE | Unused schema |
| 167 | `zone: ZoneComponentSchema,` | DELETE | Unused reference |
| 623 | `ZoneEntityDefinitionSchema,` | DELETE | Unused reference |

---

## Statistics

### Total Dead Code Items

| Category | Count |
|----------|-------|
| Godot DELETE items | ~60 |
| Godot INVESTIGATE items | 2 |
| TypeScript DELETE items | ~50 |
| TypeScript REFACTOR items | ~15 |
| Shared Package DELETE items | 11 |
| Test files to update | 7 |
| **Total** | **~145 items** |

### Estimated Lines of Dead Code

| Location | Estimated Lines |
|----------|-----------------|
| GameBridge.gd | ~200 lines |
| EntityManager.gd | ~50 lines |
| EntityFactory.gd | ~40 lines |
| Other Godot files | ~30 lines |
| GodotPhysicsAdapter.ts | ~300 lines |
| Physics2D.ts | ~30 lines |
| GodotBridge.web.ts | ~50 lines |
| GodotBridge.native.ts | ~30 lines |
| Other TypeScript files | ~50 lines |
| Shared package | ~30 lines |
| **Total** | **~810 lines**
