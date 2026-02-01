# Baseline Behavior Documentation
# Generated: 2026-02-01
# Purpose: Document current hit-test and entity behavior before architectural changes

## Hit-Test Behavior

### "Topmost" Entity Selection
**Current behavior:** Returns the **first physics query result** - there is NO Z-order sorting.

The `intersect_point` query returns results in physics engine order, which is:
- Deterministic but not based on visual Z-order
- First result is used when limit=1
- No explicit sorting by depth/layer

**Code evidence:**
```gdscript
# InputSystem.gd:140
var results = space.intersect_point(query, 1)
if results.size() > 0:
    var collider = results[0].collider  # Takes first result, no sorting
```

### Collision Layer System

| Layer | Value | Purpose | Eligible for Tap? |
|-------|-------|---------|-------------------|
| Layer 1 | 1 | Physics objects (bodies) | YES |
| Layer 2 | 2 | Sensors (Area2D) | NO (mask=0) |
| Layer 4 | 4 | UI Hitboxes (Area2D) | YES |

### Entity Types and Tap Eligibility

#### Bodies (RigidBody2D, StaticBody2D, CharacterBody2D)
- **Eligible for tap:** YES
- **Collision layer:** Default 1 (or categoryBits from definition)
- **Collision mask:** Default 0xFFFFFFFF (or maskBits from definition)
- **Created by:** `_create_entity()` with physics component

#### Sensors (Area2D with layer 2)
- **Eligible for tap:** NO
- **Collision layer:** 2 (default for sensors)
- **Collision mask:** 0 (doesn't detect anything on its own)
- **Purpose:** Detect overlaps, trigger zones
- **Created by:** `_create_sensor_entity()`

**Code evidence:**
```gdscript
# GameBridge.gd:1700-1701
area.collision_layer = collider_data.get("categoryBits", 2)
area.collision_mask = collider_data.get("maskBits", 0)
```

#### Hitboxes (Area2D with layer 4)
- **Eligible for tap:** YES
- **Collision layer:** 4 (or categoryBits)
- **Collision mask:** Configurable
- **Purpose:** UI interaction areas, clickable regions
- **Created by:** `_create_hitbox_area()`

### Query Configuration

All hit-test queries use:
```gdscript
query.collision_mask = 0xFFFFFFFF  # Match ALL layers
query.collide_with_bodies = true   # Include physics bodies
query.collide_with_areas = true    # Include Area2D (hitboxes, sensors)
```

**Important:** Because mask is 0xFFFFFFFF, queries CAN hit sensors (layer 2), but sensors have mask=0 so they don't respond to physics interactions - only to explicit queries.

## Baseline Test Results

### TypeScript Check
- **Command:** `pnpm tsc --noEmit`
- **Result:** PASS (exit code 0)

### Unit Tests
- **Command:** `pnpm test`
- **Result:** 7 failures in `ScriptSandboxRuntimeSystem.test.ts`
- **Total:** 498 passed, 7 failed (505 total)

**Pre-existing failures (NOT introduced by this work):**
1. should call onUpdate every frame
2. should handle script errors gracefully
3. should provide entity manager adapter
4. should provide tag operations
5. should provide query operations
6. should provide physics operations
7. should return correct state

These failures are in the script sandbox system and are unrelated to the GameBridge architecture being refactored.

## Key Observations

1. **No Z-order in hit-tests:** Visual layering doesn't affect which entity is "topmost" for input
2. **Sensors excluded by design:** Layer 2 + mask 0 means sensors don't participate in normal physics
3. **Hitboxes included:** Layer 4 entities ARE eligible for tap detection
4. **Query mask is permissive:** 0xFFFFFFFF means all layers are queried, filtering happens elsewhere
5. **First-result wins:** No sorting algorithm, physics engine order determines result

## Implications for Refactoring

When implementing the new architecture:
1. Must preserve "first result" behavior OR explicitly document Z-order changes
2. Sensor exclusion from tap must be maintained (layer 2, mask 0)
3. Hitbox inclusion must be maintained (layer 4)
4. Body eligibility must be maintained (layer 1)
5. Test baseline has pre-existing failures - don't regress further
