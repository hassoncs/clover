## CollisionLayers Constants Implementation

**Date:** 2026-02-01

### What Was Done
- Verified CollisionLayers.gd exists with correct constants:
  - `LAYER_BODIES = 1` (physics bodies)
  - `LAYER_SENSORS = 2` (sensors/triggers)
  - `LAYER_HITBOXES = 4` (UI tap targets)
  - Collision masks: `MASK_HIT_TEST`, `MASK_PHYSICS`, `MASK_SENSOR_DETECT`

- Verified EntityFactory.gd already uses these constants correctly:
  - Physics bodies → `CollisionLayers.LAYER_BODIES` (line 264)
  - Zone entities → `CollisionLayers.LAYER_SENSORS` (line 328)
  - Area2D entities → `CollisionLayers.LAYER_SENSORS` or `CollisionLayers.LAYER_HITBOXES` (line 369)

### Key Findings
- No hardcoded collision layer values found in codebase
- Debug scripts (DebugLifecycle, DebugProps, DebugSelector) correctly read/write collision_layer dynamically without hardcoding values
- The collision layer convention is fully implemented and consistent

### File Locations
- Constants: `godot_project/scripts/constants/CollisionLayers.gd`
- Usage: `godot_project/scripts/entity/EntityFactory.gd`

## CollisionLayers Constants Implementation

**Date**: 2026-02-01

### What Was Done
- Verified CollisionLayers.gd exists with correct constants at `godot_project/scripts/constants/CollisionLayers.gd`
- Confirmed EntityFactory.gd already uses CollisionLayers constants for all collision_layer assignments

### Key Findings
1. **CollisionLayers.gd** defines three layer constants:
   - `LAYER_BODIES = 1` - Physics bodies (RigidBody2D, StaticBody2D, CharacterBody2D)
   - `LAYER_SENSORS = 2` - Overlap detection (Area2D triggers)
   - `LAYER_HITBOXES = 4` - UI tap targets (Area2D buttons, tubes)

2. **EntityFactory.gd** correctly uses constants in three locations:
   - Line 264: Physics bodies → `CollisionLayers.LAYER_BODIES`
   - Line 328: Zone entities (deprecated) → `CollisionLayers.LAYER_SENSORS`
   - Line 368-369: Area2D entities → Smart default based on `isSensor` flag
     - `isSensor: true` → `CollisionLayers.LAYER_SENSORS`
     - `isSensor: false` → `CollisionLayers.LAYER_HITBOXES`

3. **Smart Defaults**: The Area2D creation logic properly distinguishes between sensors and UI hitboxes using the `isSensor` property

### Pattern
When creating entities with collision:
- Always use `CollisionLayers.*` constants instead of magic numbers
- Use `categoryBits` from entity data to override defaults when needed
- For Area2D entities, determine layer based on `isSensor` flag

