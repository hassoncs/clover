# Dead Code Inventory - Wave 6 Legacy Purge

**Date**: 2026-02-01
**Purpose**: Identify ALL legacy code that must be deleted

## Godot Legacy Patterns (MUST DELETE)

### 1. body_id_map / body_id_reverse (30+ references)

**EntityFactory.gd**:
- Line 11-12: `var _body_id_map: Dictionary = {}` and `var _body_id_reverse: Dictionary = {}`
- Line 27-28: Parameters in initialize()
- Line 36-37: Assignment in initialize()
- Line 49-50: Assignment from bridge
- Line 270-272: Usage in create_physics_body()
- Line 307-309: Usage in create_area2d_entity()
- Line 450-453: Cleanup in cleanup_entity()

**EntityManager.gd**:
- Line 9-10: `var body_id_map: Dictionary = {}` and `var body_id_reverse: Dictionary = {}`
- Line 54-55: Registration in register_entity()
- Line 65-68: Cleanup in unregister_entity()
- Line 91: Lookup in get_entity_id_from_body()
- Line 264-265: Props lookup
- Line 302: Return in get_entity_property()
- Line 349: Return in get_body_id()
- Line 362: Clear in clear_all()

**Decision**: DELETE - entity_id is now the primary identifier

### 2. entity_shape_map (20+ references)

**EntityFactory.gd**:
- Line 14: `var _entity_shape_map: Dictionary = {}`
- Line 30: Parameter in initialize()
- Line 39: Assignment in initialize()
- Line 52: Assignment from bridge
- Line 455-456: Cleanup in cleanup_entity()

**EntityManager.gd**:
- Line 11: `var entity_shape_map: Dictionary = {}`
- Line 59: Registration
- Line 71-72: Cleanup
- Line 320-336: Shape management functions

**GameBridge.gd**:
- Line 2126: Clear in clear_game()
- Lines 2796-2838: Sensor callback lookups

**Decision**: DELETE - shapes are on the node itself

### 3. collider_id_map (1 reference)

**GameBridge.gd**:
- Line 2125: `collider_id_map.clear()`

**Decision**: DELETE - no longer needed

## TypeScript Legacy Patterns (KEEP - Event Protocol)

### Sensor Event Fields (KEEP for now)

**types.ts**:
- Line 28-30: `sensorColliderId`, `otherBodyId`, `otherColliderId`

**GodotBridge.native.ts**:
- Lines 244-258: Sensor event handling

**GodotBridge.web.ts**:
- Lines 356-367: Sensor event handling

**GodotPhysicsAdapter.ts**:
- Lines 128-141: Sensor event conversion

**Decision**: KEEP - These are part of the Godot→TS event protocol. The numeric IDs here are internal Godot identifiers, not the old Box2D branded types. They're converted to entity IDs in the adapter.

## Summary

| Pattern | Count | Decision |
|---------|-------|----------|
| body_id_map/reverse | 30+ | DELETE |
| entity_shape_map | 20+ | DELETE |
| collider_id_map | 1 | DELETE |
| sensor event fields | 15 | KEEP (event protocol) |

## Action Items

1. **Task 22**: Delete body_id_map, body_id_reverse, entity_shape_map from Godot
2. **Task 22**: Refactor sensor callbacks to use entity_id directly
3. **Task 22**: Remove collider_id_map.clear() call
4. **Task 24**: Verify all patterns removed with audit script
