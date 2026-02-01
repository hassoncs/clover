# Cleanup Complete Report

## Date: 2026-02-01 (Updated)

## MASSIVE SUCCESS: GameBridge.gd Shrunk 90%

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| **Lines** | 3411 | 328 | **90%** |
| **Functions** | 211 | 45 | **79%** |

## Code Removed

### Godot Side - Legacy Box2D Patterns
- **body_id_map / body_id_reverse**: DELETED from all files
- **next_body_id counter**: DELETED
- **collider_id_map**: DELETED
- **sensor_velocities**: Migrated to EntityRecord.velocity
- **entity_shape_map**: DELETED
- **Legacy creation methods**: `_create_physics_body`, `_create_sensor_entity` - DELETED

### Godot Side - Module Extraction
- **Joint functions** → JointManager.gd
- **Camera functions** → CameraController.gd
- **3D/GLB functions** → Viewport3D.gd
- **Visual/Texture functions** → VisualRenderer.gd
- **UI Button functions** → UIManager.gd
- **Debug/Screenshot functions** → DebugBridge.gd
- **Physics queries** → PhysicsQueries.gd
- **Collision handling** → CollisionSystem.gd
- **Splat map** → SplatMapSystem.gd
- **Entity creation** → EntityFactory.gd

### TypeScript Side
- **BodyId / ColliderId branded types**: DELETED
- **createBodyId / createColliderId**: DELETED
- **addFixture method**: DELETED
- **ZoneComponent / zone code**: DELETED
- **isPointInCollider geometric fallback**: DELETED
- **TileMapPhysics.ts**: DELETED

### Schema Changes
- SensorEvent.otherBodyId (number) → SensorEvent.otherEntityId (string)
- user_data keyed by entity_id (string) instead of body_id (number)

## Verification
- [x] pnpm tsc --noEmit: PASS
- [x] pnpm build: PASS
- [x] No body_id_map / body_id_reverse references
- [x] No BodyId / ColliderId branded types
- [x] No createBodyId / createColliderId functions
- [x] No addFixture calls
- [x] No ZoneComponent / zone code
- [x] No isPointInCollider geometric fallback

## Final Architecture

**GameBridge.gd (328 lines)** is now a thin orchestrator:
- Module initialization
- JS bridge setup (callback registration)
- Coordinate conversion utilities
- Core game lifecycle (load, clear, spawn, destroy)
- Event routing to modules

**All domain logic lives in modules:**
- `EntityFactory.gd` - Entity creation
- `EntityManager.gd` - Entity tracking
- `JointManager.gd` - Physics joints
- `CameraController.gd` - Camera control
- `VisualRenderer.gd` - Textures/sprites
- `UIManager.gd` - UI buttons
- `DebugBridge.gd` - Debug tools
- `PhysicsQueries.gd` - Point/AABB queries
- `CollisionSystem.gd` - Collision handling
- `SplatMapSystem.gd` - Splat effects

## Post-Refactor Bug Fixes (2026-02-01)

### Issues Found & Fixed

1. **TransformSystem.gd** - Variable naming inconsistency
   - Changed `bridge` → `_game_bridge` to match module pattern

2. **CollisionSystem.gd** - Missing member variables
   - Added `_game_bridge` and `_event_emitter` instance vars

3. **EntityFactory.gd** - State sync timing
   - Added `update_state()` call in `GameBridge.load_game_json()` before entity creation

4. **JointManager.gd** - Entity lookup fix  
   - Changed from computed `entities` property to direct `entity_registry` access
   - Fixed spring-damper force calculations (work in meters, convert to pixels)

5. **GodotBridge.web.ts** - Mouse joint return value
   - Fixed `createMouseJoint` to return result directly instead of reading stale `_lastResult`

6. **draggable_cubes.tsx** - Game-inspector compatibility
   - Added `slopcadeGameReady` window flag for MCP tooling

### Verification Results

- [x] `draggable_cubes` example loads correctly
- [x] Entities render with proper visuals (RigidBody2D with collision shapes)
- [x] Physics debug overlay works
- [x] Mouse joint creation returns valid joint IDs
- [x] `slopeggle` engine initializes (Rapier2D physics working)
- [ ] Manual drag interaction test pending (Playwright iframe limitations)

### Known Pre-existing Issues (Not Related to Refactor)

- `slopeggle` has corrupt PNG asset causing texture load failures

## Future Work
- Type-safe bridge (code-gen from schema) - see decisions.md
