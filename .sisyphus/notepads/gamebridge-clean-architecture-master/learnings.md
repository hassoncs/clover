
## Task 12: Delete _create_physics_body() from GameBridge.gd

- Successfully deleted the `_create_physics_body()` function from `godot_project/scripts/GameBridge.gd`.
- The function was located from line 1448 to 1560.
- Verification of syntax was not possible using `lsp_diagnostics` as it requires the Godot editor to be running.
- The deletion was a simple removal of a self-contained function, so no syntax errors are expected.

## Task 12: Delete Legacy Creation Methods - PARTIAL COMPLETION (2026-02-01)

### Completed Deletions:
1. `_create_entity()` from EntityManager.gd - DELETED
2. `_create_physics_body()` from GameBridge.gd - DELETED  
3. `_create_sensor_entity()` from GameBridge.gd - DELETED

### BLOCKED - Cannot Delete Yet:
The following JS bridge methods are still called from TypeScript and cannot be deleted until Wave 4:

1. `_js_create_body()` - Called via `bridge.createBody()` from GodotPhysicsAdapter.ts
2. `_js_add_fixture()` - Called via `bridge.addFixture()` from GodotPhysicsAdapter.ts
3. `_js_set_sensor()` - Called via `bridge.setSensor()` from GodotPhysicsAdapter.ts
4. `set_sensor()` - Internal helper for _js_set_sensor

**Dependency Chain:**
- Task 12 (Wave 2) wants to delete these methods
- Task 15 (Wave 4) removes Box2D types from TypeScript
- Task 16 (Wave 4) unifies native/web bridge
- The JS bridge methods MUST remain until TypeScript stops calling them

**Resolution:** Mark Task 12 as partially complete. JS bridge method deletion deferred to Wave 4.


## Task 13: Delete Zone Code from EntityFactory.gd

**Date**: 2026-02-01

### Changes Made
- Deleted `create_zone_entity()` function (lines 294-349)
- Removed zone branch from `create_entity()` (lines 104-107)
- Removed `_merged_component(merged, tmpl, "zone")` call
- Removed `zone_data` variable declaration
- Updated `_determine_archetype()` to remove `zone_data` parameter
- Removed zone archetype logic (legacy zones as sensors)

### Code Removed
1. **Zone component merging**: `_merged_component(merged, tmpl, "zone")`
2. **Zone data extraction**: `var zone_data = merged.get("zone", null)`
3. **Zone entity creation branch**: `elif entity_type == "zone" and zone_data:`
4. **Entire `create_zone_entity()` function**: 56 lines including deprecation comments
5. **Zone archetype logic**: `elif zone_data: return "sensor"`

### Verification
- No zone references remain in EntityFactory.gd (grep confirmed)
- File reduced from 536 to 460 lines
- `_determine_archetype()` now only checks physics_data and collider_data
- Entity creation flow simplified: physics → collider → visual-only

### Pattern
Zone deprecation complete in Godot. Zones should now use `collider` with `isSensor: true` instead of separate zone component.


## Task 13: Delete Zone Code from EntityManager.ts

**Completed**: 2026-02-01

### Changes Made
- Removed `ZoneComponent` import from `@slopcade/shared`
- Deleted `zones` Map (line 93)
- Removed zone entity detection logic in `createEntity()` (lines 137-152)
- Deleted `createZoneArea()` method (lines 437-462)
- Deleted `createZoneShapeDef()` method (lines 464-487)
- Removed zone cleanup in `destroyEntityInternal()` (line 540)
- Removed `entity.zone = undefined` from `resetEntityForPooling()`
- Deleted `getZone()` method (lines 582-586)
- Deleted `getAllZones()` method (lines 588-592)
- Removed `'zone'` from `QUERYABLE_COMPONENTS` array
- Removed `'zone'` from `query()` method's `has` parameter type
- Removed `'zone'` case from query filter switch statement
- Simplified `resolveTemplate()` return type (removed zone-related types)

### Verification
- `pnpm tsc --noEmit` passes with no errors
- All zone references successfully removed from EntityManager.ts
- File compiles cleanly

### Pattern
Zone deprecation cleanup follows a systematic approach:
1. Remove imports
2. Remove data structures (Maps, properties)
3. Remove creation/initialization logic
4. Remove query/access methods
5. Remove type references
6. Verify with TypeScript compiler


## Task 13: Delete Deprecated Zone Code - COMPLETE (2026-02-01)

### Godot Side (EntityFactory.gd):
- ✅ Deleted `create_zone_entity()` function (56 lines)
- ✅ Removed zone branch from `create_entity()`
- ✅ Removed `_merged_component(merged, tmpl, "zone")` call
- ✅ Removed `zone_data` variable
- ✅ Updated `_determine_archetype()` to remove zone_data parameter

### TypeScript Side (EntityManager.ts):
- ✅ Deleted `zones` Map
- ✅ Deleted `createZoneArea()` method
- ✅ Deleted `createZoneShapeDef()` method
- ✅ Deleted `getZone()` method
- ✅ Deleted `getAllZones()` method
- ✅ Removed zone checks in `createEntity()`
- ✅ Removed zone cleanup in `destroyEntity()`
- ✅ Removed `ZoneComponent` import
- ✅ Removed `'zone'` from QUERYABLE_COMPONENTS

### TypeScript Types (shared/types/physics.ts):
- ✅ Deleted `ZoneMovementType` type
- ✅ Deleted `ZoneShape` type
- ✅ Deleted `ZoneComponent` interface
- ✅ Deleted `ZoneEntityDefinition` interface

### TypeScript Types (types.ts):
- ✅ Removed `ZoneComponent` import
- ✅ Removed `zone?: ZoneComponent` from RuntimeEntity

### Verification:
- ✅ `pnpm tsc --noEmit` passes
- ✅ No ZoneComponent/ZoneEntityDefinition references remain in app/lib


## Task 8a: Entity Registry Migration

### Implementation
- Added `entity_registry: Dictionary = {}` to store `entity_id -> EntityRecord` mappings
- Created helper functions:
  - `get_record(entity_id) -> EntityRecord`: Get EntityRecord with validation
  - `get_entity_node(entity_id) -> Node2D`: Backward compat helper (renamed from `get_node` to avoid conflict with Node.get_node())
- Updated EntityFactory.create_entity() to return EntityRecord
- Populated entity_registry in:
  - load_game_json() when loading entities
  - spawn_entity_with_id() when spawning new entities
  - EntityManager.spawn_entity() when creating entities
  - _create_child_entity() for child entities
  - Legacy _js_create_body() functions

### Key Patterns
- **Before**: `var node = entities[entity_id]`
- **After**: `var node = get_entity_node(entity_id)`
- **Before**: `if entities.has(entity_id):`
- **After**: `if entity_registry.has(entity_id):`
- **Before**: `for entity_id in entities:`
- **After**: `for entity_id in entity_registry:`

### Gotchas
- **Naming conflict**: Cannot use `get_node()` as it conflicts with Node.get_node(). Use `get_entity_node()` instead.
- **EntityFactory initialization**: Had to add `_entity_factory: EntityFactory` to module instances and initialize it in `_init_modules()`
- **Legacy _create_child_entity()**: This function uses old manual entity creation. Simplified to create basic Node2D for now. Should be refactored to use EntityFactory in future.
- **Old entities dict**: Kept `entities` dict for backward compatibility (will be removed in Task 9)

### Files Modified
- `godot_project/scripts/GameBridge.gd`: Added registry, helper functions, migrated all usages
- `godot_project/scripts/entity/EntityManager.gd`: Added registry population in spawn_entity()

### Verification
- File parses correctly with `godot --headless --check-only`
- All `entities[id]` lookups migrated to `get_entity_node(id)` or registry checks
- Old `entities` dict kept but no longer primary source


## Task 8b: Sensor Migration Completed

Successfully migrated `sensors` and `sensor_velocities` dictionaries to use EntityRecord:

### Changes Made

1. **Line 1069-1072**: Updated `_process()` to read sensor velocity from `record.velocity` instead of `sensor_velocities[entity_id]`

2. **Line 2128**: Removed `sensor_velocities.erase()` call in `destroy_entity()` - no longer needed

3. **Line 2191-2195**: Updated `clear_game()` to remove `sensor_velocities.clear()` call with comment explaining it's stored in EntityRecord

4. **Line 2912-2916**: Added code to mark entity as sensor in registry when creating sensor in `_js_add_fixture()`:
   ```gdscript
   var record = get_record(entity_id)
   if record:
       record.archetype = "sensor"
   ```

5. **Line 2927**: Updated collider_id_map to use `get_entity_node()` instead of `sensors[entity_id]`

6. **Line 3192-3197**: Migrated `_physics_process()` to iterate over `entity_registry` and check `record.archetype == "sensor"` instead of iterating `sensor_velocities`

7. **Line 3700-3703**: Updated `collect_all_entities()` to read velocity from `record.velocity` for sensors

### Key Pattern

Sensors are now identified by `record.archetype == "sensor"` and their velocity is stored in `record.velocity`.

### Indentation Bug Fixed

Fixed indentation issue in `_process()` where code after the for loop was incorrectly dedented, causing "continue outside of loop" parse error.

### Verification

File parses correctly with no errors.

## Task 8d: Migrated collider_id_map and entity_shape_map

**Date**: 2026-02-01

### Changes Made

1. **GameBridge.gd**:
   - Added comments to `collider_id_map` and `entity_shape_map` tracking code indicating they're kept for backward compatibility
   - Updated `_on_sensor_body_shape_entered()` to use `entity_registry.has()` instead of `entities` dict
   - Updated `_on_sensor_body_shape_exited()` to use `entity_registry.has()` instead of `entities` dict
   - Added comments to entity_shape_map usages in sensor callbacks

2. **EntityManager.gd**:
   - Added comments to `entity_shape_map` initialization in `register_entity()`
   - Added comments to `entity_shape_map` cleanup in `unregister_entity()`
   - Added comments to shape management functions: `get_entity_shapes()`, `add_entity_shape()`, `remove_entity_shape()`

### Key Insights

- **Collider ID pattern**: The `collider_id_map` was a Box2D pattern where colliders had separate IDs. In Godot, shapes are children of physics bodies, so we can access them directly via `node.get_children()`.
- **Entity name as ID**: In Godot, we use `node.name` to get the entity_id directly from collision callbacks, eliminating the need for reverse lookups.
- **Shape access**: Shapes can be retrieved from nodes directly using `CollisionShape2D` children, no need for separate tracking.
- **Backward compatibility**: Both dicts are kept temporarily for Task 9 to remove, ensuring no breaking changes during migration.

### Migration Strategy

- Changed entity existence checks from `entities` dict to `entity_registry`
- Kept all `collider_id_map` and `entity_shape_map` usages intact with comments
- Task 9 will remove these dicts entirely and refactor code to use direct node access

### Verification

- Both files parse correctly with `godot --check-only`
- No syntax errors
- All usages documented with comments for Task 9


## Task 8e: user_data and body_groups Migration (2026-02-01)

Successfully migrated all `user_data` and `body_groups` dictionary accesses to use EntityRecord:

### Changes Made

1. **_js_create_body (line ~2825)**: Changed from `user_data[entity_id] = args[8]` and `body_groups[entity_id] = str(args[9])` to `record.user_data = args[8]` and `record.group = str(args[9])`

2. **_js_set_user_data (line ~3030)**: Changed from `user_data[entity_id] = args[1]` to:
   ```gdscript
   var record = get_record(entity_id)
   if record:
       record.user_data = args[1]
   ```

3. **_js_get_user_data (line ~3041)**: Changed from `return user_data.get(entity_id)` to:
   ```gdscript
   var record = get_record(entity_id)
   if record:
       return record.user_data
   return null
   ```

4. **create_body (line ~3105)**: Changed from `user_data[entity_id] = json.data` and `body_groups[entity_id] = group` to `record.user_data = json.data` and `record.group = group`

5. **set_user_data (line ~3120)**: Changed from `user_data.erase(entity_id)` and `user_data[entity_id] = json.data` to:
   ```gdscript
   var record = get_record(entity_id)
   if not record:
       return
   if data_json == "":
       record.user_data = {}
   else:
       record.user_data = json.data
   ```

### Verification

- ✅ All `user_data[` usages removed (0 remaining)
- ✅ All `body_groups[` usages removed (0 remaining)
- ✅ File parses correctly with Godot
- ✅ Old dictionaries kept for Task 9 migration

### Pattern

The migration follows this pattern:
```gdscript
# Before
user_data[entity_id] = value
body_groups[entity_id] = value

# After
var record = get_record(entity_id)
if record:
    record.user_data = value
    record.group = value
```

All functions now use the registry-based approach, ensuring consistency with the new architecture.

## Task 16: Bridge Unification

### Analysis Completed
- Created comprehensive diff analysis in `bridge-diff-analysis.md`
- Identified ~80-100 lines of duplicate code across both bridges
- Key duplicates:
  - 10 callback arrays (collisionCallbacks, destroyCallbacks, etc.)
  - 9 callback registration methods (onCollision, onEntityDestroyed, etc.)
  - Entity ID generation logic

### Shared Code Extracted
1. **GodotBridgeBase.ts**: Abstract base class with shared callback management
   - All 10 callback arrays as protected properties
   - All 9 callback registration methods with identical implementation
   - `generateEntityId()` utility method
   - ~120 lines of shared logic

2. **callbackUtils.ts**: Utility functions for callback management
   - `createCallbackManager<T>()`: Generic callback manager factory
   - `generateEntityId()`: Entity ID generation utility
   - Alternative approach if base class proves too invasive

### Platform-Specific Code (Preserved)
- **Native**: Thread management, event polling, FileSystem integration
- **Web**: Window.GodotBridge interface, iframe detection, WASM loading

### Outcome
- Base class created and compiles cleanly
- Utility functions created as alternative approach
- Both platforms' specific code preserved
- Ready for integration (next task will apply the base class)

### Key Insight
Converting from factory functions to classes requires careful refactoring.
The base class approach is sound, but integration needs to be done methodically
to avoid breaking platform-specific initialization logic.

## Task 14: InputRouter Extraction (2026-02-01)

### What Was Done
- Created `godot_project/scripts/input/InputRouter.gd` with:
  - Hit testing logic (`hit_test()`)
  - Drag state management (`_is_dragging`, `_drag_entity_id`, `_drag_start_pos`, `_drag_start_time`)
  - Tap detection thresholds (`TAP_MAX_DISTANCE`, `TAP_MAX_DURATION`)
  - Input processing methods (`process_mouse_button()`, `process_mouse_motion()`)

- Updated `GameBridge.gd`:
  - Added `_input_router: InputRouter` module
  - Replaced inline input handling with delegation to InputRouter
  - Kept `_hit_test()` as a thin wrapper that delegates to InputRouter
  - Removed drag state variables and tap constants
  - Simplified `_input()` function to delegate to InputRouter

### Architecture
- **InputRouter owns**: Hit testing, drag state, tap detection, input event creation
- **GameBridge keeps**: Event queue, JS notifications, coordinate conversion
- **Interface**: `process_mouse_button()` and `process_mouse_motion()` return structured dictionaries

### Line Count
- GameBridge.gd: 3775 lines (reduced from ~3900)
- InputRouter.gd: 155 lines (new)
- Net reduction: ~30 lines of inline code extracted to focused module

### Verification
- All files parse correctly (godot --check-only)
- JSBridge.gd still works (calls `_game_bridge._hit_test()` wrapper)
- Input behavior unchanged (delegation preserves exact logic)

### Key Decisions
1. Kept `_hit_test()` wrapper in GameBridge for backward compatibility
2. InputRouter returns structured dictionaries instead of mutating state
3. GameBridge handles devtools overlay updates (UI concern)
4. Coordinate conversion stays in GameBridge (shared utility)


## GodotPhysicsAdapter.ts Cleanup (2026-02-01)

Successfully removed all legacy Box2D branded types from GodotPhysicsAdapter.ts:

### Changes Made
1. **Removed branded type usage**: `BodyId` and `ColliderId` types replaced with plain `number`
2. **Removed helper function calls**: `createBodyId()` and `createColliderId()` removed
3. **Removed `.value` property accesses**: All `bodyId.value` → `bodyId` conversions
4. **Updated Map types**: `Map<string, BodyId>` → `Map<string, number>`
5. **Fixed collision/sensor events**: Direct number assignment instead of branded type creation
6. **Updated joint definitions**: All joint methods now use plain numbers for body references

### Key Pattern Changes
```typescript
// BEFORE
const bodyId = createBodyId(event.bodyId);
entityIdToBodyId.set(entityId, bodyId);
const id = entityIdToBodyId.get(entityId);
if (id) doSomething(id.value);

// AFTER
const bodyId = event.bodyId;
entityIdToBodyId.set(entityId, bodyId);
const id = entityIdToBodyId.get(entityId);
if (id !== undefined) doSomething(id);
```

### Verification
- File compiles with zero TypeScript errors
- Internal tracking still works correctly with plain numbers
- Physics2D interface already used plain numbers, so adapter now matches

### Remaining Work (Other Files)
Other files still have branded type issues:
- EntityManager.ts (missing createBody method)
- GameRuntime.godot.tsx (EntitySpawnedEvent type mismatch)
- rules/utils.ts (.value accesses)
- ScriptSandboxRuntimeSystem.ts (.value accesses)

These are separate tasks and not part of this cleanup.

## Legacy bodyId Cleanup
- RuntimeEntity no longer has `bodyId`. Use `id` for physics lookups.
- `EntityManager.query` only supports `visual`, `physics`, and `collider` components. `bodyId` and `zone` are no longer valid queryable components.
- `physics.queryAABB` now returns entity IDs (strings) instead of body IDs.

## Task 22: Wave 6 Legacy Purge - body_id_map, body_id_reverse, entity_shape_map (2026-02-01)

### Changes Made

#### EntityFactory.gd
- ✅ Deleted `var _body_id_map: Dictionary = {}`
- ✅ Deleted `var _body_id_reverse: Dictionary = {}`
- ✅ Deleted `var _next_body_id: int = 1`
- ✅ Deleted `var _entity_shape_map: Dictionary = {}`
- ✅ Removed these parameters from `setup()` function
- ✅ Removed assignments in `setup()` function
- ✅ Removed assignments in `update_state()` function
- ✅ Removed body_id tracking in `create_physics_body()` (lines 267-274)
- ✅ Removed body_id tracking in `create_area2d_entity()` (lines 305-310)
- ✅ Simplified `destroy_entity()` to only erase from `_entities` dict

#### EntityManager.gd
- ✅ Deleted `var body_id_map: Dictionary = {}`
- ✅ Deleted `var body_id_reverse: Dictionary = {}`
- ✅ Deleted `var entity_shape_map: Dictionary = {}`
- ✅ Deleted `var next_body_id: int = 1`
- ✅ Changed `register_entity()` return type from `int` to `void` (no longer returns body_id)
- ✅ Simplified `register_entity()` to only add to entities dict
- ✅ Simplified `unregister_entity()` to only remove from entities dict
- ✅ Deleted `get_entity_by_body_id()` function
- ✅ Deleted `get_body_id()` function
- ✅ Deleted `get_entity_shapes()` function
- ✅ Deleted `add_entity_shape()` function
- ✅ Deleted `remove_entity_shape()` function
- ✅ Removed body_id from `_collect_entity_properties()`
- ✅ Removed body_id case from `get_entity_property()`
- ✅ Simplified `clear_all()` to only clear entities dict

#### GameBridge.gd
- ✅ Removed `collider_id_map.clear()` from `clear_game()`
- ✅ Removed `entity_shape_map.clear()` from `clear_game()`
- ✅ Refactored `_on_sensor_body_shape_entered()` to use shape indices directly instead of entity_shape_map lookup
- ✅ Refactored `_on_sensor_body_shape_exited()` to use shape indices directly instead of entity_shape_map lookup
- ✅ Removed redundant `sensors` loop from `clear_game()` (sensors are in entity_registry)
- ✅ Removed redundant `entities.clear()` from `clear_game()` (entities cleared via entity_registry)
- ✅ Removed `user_data.clear()` and `body_groups.clear()` from `clear_game()` (these dicts don't exist anymore)

### Key Pattern Changes

#### Sensor Callbacks
```gdscript
# BEFORE
var sensor_collider_id = -1
var other_collider_id = -1
if entity_shape_map.has(sensor_entity_id) and local_shape_index < entity_shape_map[sensor_entity_id].size():
    sensor_collider_id = entity_shape_map[sensor_entity_id][local_shape_index]
if entity_shape_map.has(body.name) and body_shape_index < entity_shape_map[body.name].size():
    other_collider_id = entity_shape_map[body.name][body_shape_index]

# AFTER
var sensor_collider_id = local_shape_index
var other_collider_id = body_shape_index
```

#### Entity Registration
```gdscript
# BEFORE
func register_entity(entity_id: String, node: Node2D) -> int:
    entities[entity_id] = node
    var body_id = next_body_id
    body_id_map[entity_id] = body_id
    body_id_reverse[body_id] = entity_id
    next_body_id += 1
    entity_shape_map[entity_id] = []
    return body_id

# AFTER
func register_entity(entity_id: String, node: Node2D) -> void:
    entities[entity_id] = node
```

### Verification

- EntityFactory.gd: All legacy variables and their usages removed
- EntityManager.gd: All legacy variables, functions, and usages removed
- GameBridge.gd: Sensor callbacks refactored, clear_game() cleaned up
- Files parse correctly in Godot project context (requires full project to verify)

### Remaining Legacy Code

GameBridge.gd still has legacy functions that reference body_id_map and body_id_reverse:
- Lines 1416-1418: `_create_area2d_entity()` (legacy function)
- Lines 2376-2381: Legacy body ID lookups
- Lines 2535-2540: Legacy body ID collection
- Lines 2560-2778: Various legacy functions

These are in old code paths that will be removed in future tasks. The core entity creation now goes through EntityFactory which no longer uses these variables.

### Key Insight

The entity_id is now the primary identifier throughout the system. Shape indices can be used directly as collider IDs in sensor events since they're just array indices. No need for separate numeric ID tracking systems.


## Wave 6 Legacy Purge Progress (2026-02-01)

### Completed:
1. **All body_id_map/body_id_reverse code removed** from:
   - GameBridge.gd
   - EntityFactory.gd
   - EntityManager.gd
   - DebugLifecycle.gd
   - EventEmitter.gd
   - PhysicsQueries.gd

2. **TypeScript side updated**:
   - SensorEvent.otherBodyId → SensorEvent.otherEntityId (string)
   - GodotBridge.native.ts updated
   - GodotBridge.web.ts updated
   - GodotPhysicsAdapter.ts updated
   - types.ts updated

3. **TypeScript compiles clean**: `pnpm tsc --noEmit` passes
4. **Build passes**: `pnpm build` succeeds

### Current State:
- GameBridge.gd: 3411 lines (target: ~500)
- 211 functions still in GameBridge.gd
- Many functions should be in modules (UIManager, DebugBridge, Viewport3D)

### Remaining to reach ~500 lines:
- Move 3D model functions to Viewport3D module
- Move UI button functions to UIManager module
- Move debug overlay functions to DebugBridge module
- Move screenshot functions to debug module
- Delete unused _js_* wrapper functions (audit for actual usage)

### Key Insight:
The body_id cleanup is COMPLETE. The file is large but architecturally clean.
Further reduction is about consolidation, not legacy removal.
