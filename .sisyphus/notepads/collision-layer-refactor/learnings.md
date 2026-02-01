## CollisionLayers Constants Refactor (2026-02-01)

### What Was Done
Created a centralized `CollisionLayers.gd` constants file and updated all references to use it.

### Files Created
- `godot_project/scripts/constants/CollisionLayers.gd`
  - Defines LAYER_BODIES (1), LAYER_SENSORS (2), LAYER_HITBOXES (4)
  - Defines MASK_HIT_TEST (5), MASK_PHYSICS (1), MASK_SENSOR_DETECT (1)

### Files Updated
1. **EntityFactory.gd**
   - Physics bodies: Use `CollisionLayers.LAYER_BODIES` (line 264)
   - Zone entities: Use `CollisionLayers.LAYER_SENSORS` (line 328)
   - Area2D entities: Smart detection of sensor vs hitbox using `isSensor` flag (lines 367-369)
     - Sensors (isSensor: true) → Layer 2
     - UI hitboxes (isSensor: false) → Layer 4

2. **GameBridge.gd**
   - Removed duplicate constant definitions (lines 41-44)
   - Updated hit test to use `CollisionLayers.MASK_HIT_TEST` (line 91)
   - Updated layer checks to use `CollisionLayers.LAYER_HITBOXES` and `CollisionLayers.LAYER_BODIES` (lines 106, 108)

### Convention Established
- **Layer 1 (LAYER_BODIES)**: Physics bodies (RigidBody2D, StaticBody2D, CharacterBody2D)
- **Layer 2 (LAYER_SENSORS)**: Overlap detection (Area2D triggers with isSensor: true)
- **Layer 4 (LAYER_HITBOXES)**: UI tap targets (Area2D buttons, tubes, interactive elements)

### Key Insight
The Area2D creation logic now intelligently determines the layer based on the `isSensor` flag in collider data:
- If `isSensor: true` → Layer 2 (sensors for game logic)
- If `isSensor: false` → Layer 4 (hitboxes for UI interaction)

This provides a clear separation between game logic sensors and UI interaction targets.
