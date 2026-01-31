# Slopcade Architecture Fixes - Baseline Document

**Created**: 2026-01-31
**Purpose**: Establish baseline before refactoring to ensure no regressions

## Verification Commands

After each fix, run these commands - all must pass:

```bash
# TypeScript compilation check
pnpm tsc --noEmit

# Run test suite
pnpm test

# Smoke test - load a game in web
pnpm web
# Then load any test game and verify no console errors
```

## Current Bridge API Surface

### GameBridge.gd Public Methods (called from TypeScript)

| Method | Purpose |
|--------|---------|
| `loadGameJson(json)` | Load complete game definition |
| `clearGame()` | Reset game state |
| `setInspectMode(enabled)` | Enable/disable inspector |
| `pausePhysics()` / `resumePhysics()` | Time control |
| `spawnEntity(template, x, y, id)` | Spawn entity from template |
| `destroyEntity(id)` | Remove entity |
| `getEntityTransform(id)` | Get single entity transform |
| `getAllTransforms()` | Get all entity transforms |
| `getAllProperties()` | Get all entity properties |
| `setLinearVelocity(id, vx, vy)` | Set entity velocity |
| `setAngularVelocity(id, velocity)` | Set rotation speed |
| `applyImpulse(id, ix, iy)` | Apply physics impulse |
| `applyForce(id, fx, fy)` | Apply physics force |
| `applyTorque(id, torque)` | Apply rotational force |
| `setTransform(id, x, y, angle)` | Set entity position/rotation |
| `setPosition(id, x, y)` | Set entity position |
| `setRotation(id, angle)` | Set entity rotation |
| `setScale(id, sx, sy)` | Set entity scale |
| `getLinearVelocity(id)` | Get entity velocity |
| `getAngularVelocity(id)` | Get rotation speed |
| `queryPoint(x, y)` | Physics point query |
| `queryPointEntity(x, y)` | Find entity at point |
| `queryAABB(minX, minY, maxX, maxY)` | Area query |
| `raycast(ox, oy, dx, dy, maxDist)` | Raycast query |
| `createRevoluteJoint(...)` | Create hinge joint |
| `createDistanceJoint(...)` | Create distance joint |
| `createPrismaticJoint(...)` | Create slider joint |
| `createWeldJoint(...)` | Create weld joint |
| `createMouseJoint(...)` | Create mouse drag joint |
| `destroyJoint(id)` | Remove joint |
| `setMotorSpeed(jointId, speed)` | Set joint motor |
| `setMouseTarget(jointId, x, y)` | Update mouse joint |
| `setCameraTarget(entityId)` | Follow entity with camera |
| `setCameraPosition(x, y)` | Set camera position |
| `setCameraZoom(zoom)` | Set camera zoom |
| `spawnParticle(type, x, y)` | Spawn particle effect |
| `playSound(path)` | Play audio |
| `setEntityImage(id, url, w, h)` | Set entity sprite |
| `setDebugShowShapes(enabled)` | Toggle debug shapes |

### Event Callbacks (Godot -> TypeScript)

| Callback | Payload |
|----------|---------|
| `onCollision` | `(entityA, entityB, impulse)` |
| `onEntityDestroyed` | `(entityId)` |
| `onTransformSync` | `JSON: {entityId: {x, y, angle}}` |
| `onPropertySync` | `JSON: {entities: {id: {props}}}` |
| `onInputEvent` | `JSON: {type, x, y, entityId}` |
| `onSensorBegin` | `(sensorId, entityId)` |
| `onSensorEnd` | `(sensorId, entityId)` |
| `onUIButtonEvent` | `(buttonId, eventType)` |

## Transform Sync Details

**Current Behavior**: Full sync every physics frame
- `_physics_process` calls `_notify_transform_sync()` 
- Sends ALL entity transforms as JSON: `{entityId: {x, y, angle}}`
- Frequency: Every physics tick (~60fps)

**Payload Shape**:
```json
{
  "entity_1": {"x": 5.0, "y": 10.0, "angle": 0.5},
  "entity_2": {"x": -3.0, "y": 2.0, "angle": 0.0}
}
```

## Coordinate System

**Game Space** (TypeScript):
- Origin: Center of world (0, 0)
- X+: Right
- Y+: Up
- Units: Meters

**Godot Space**:
- Origin: Top-left (0, 0)  
- X+: Right
- Y+: Down
- Units: Pixels

**Conversion** (pixelsPerMeter = 50 default):
```
gameToGodot(pos) = (pos.x * ppm, -pos.y * ppm)
godotToGame(pos) = (pos.x / ppm, -pos.y / ppm)
```

**Examples**:
| Game Pos | PPM | Godot Pos |
|----------|-----|-----------|
| (0, 0) | 50 | (0, 0) |
| (5, 10) | 50 | (250, -500) |
| (-3, -7) | 100 | (-300, 700) |

## Deprecation Warnings Count

**Total: 38 warnings in 13 files**

### By Category:

**Zone -> Sensor Migration (25 warnings)**:
- `shared/src/types/entity.ts`: 6 warnings
- `shared/src/types/physics.ts`: 4 warnings
- `shared/src/types/schemas.ts`: 3 warnings
- `app/lib/game-engine/EntityManager.ts`: 10 warnings
- `app/lib/game-engine/types.ts`: 1 warning
- `app/lib/game-engine/behaviors/LifecycleBehaviors.ts`: 1 warning

**Other (13 warnings)**:
- `api/src/ai/pipeline/types.ts`: 4 warnings (asset naming)
- `api/src/ai/pipeline/stages/index.ts`: 1 warning
- `api/src/trpc/index.ts`: 1 warning
- `shared/src/types/GameDefinition.ts`: 1 warning (parallax)
- `app/lib/registry/types.ts`: 4 warnings (module naming)
- `app/lib/game-engine/debug/types.ts`: 1 warning

## Existing Modularization

Godot already has partial modularization:

**bridge/**:
- `CoordinateUtils.gd` (15 lines) - Static coordinate helpers
- `EventQueue.gd` - Event queue for native polling
- `QuerySystem.gd` - Query handling
- `SyncSystem.gd` (49 lines) - Transform/property sync
- `VisualRenderer.gd` - Visual creation
- `JSBridge.gd` - JS callback wrapper (legacy)
- `DebugSystem.gd` - Debug utilities

**entity/**:
- `EntityFactory.gd` (513 lines) - Entity creation
- `EntityManager.gd` - Entity lifecycle
- `TransformSystem.gd` - Transform handling
- `ImageSystem.gd` - Image loading
- `EntityLifecycleSystem.gd` - Spawn/destroy

**physics/**:
- `PhysicsController.gd` - Velocity/force operations
- `PhysicsQueries.gd` - Point/AABB/raycast queries
- `CollisionSystem.gd` - Collision handling
- `JointManager.gd` - Joint management

**Problem**: GameBridge.gd (1500+ lines) still contains duplicate implementations and doesn't fully delegate to these modules.

## Files to Modify

### Fix 1: GameBridge Module Split
- `godot_project/scripts/GameBridge.gd` -> thin orchestrator

### Fix 2: Transform Sync
- `godot_project/scripts/GameBridge.gd`
- `godot_project/scripts/bridge/SyncSystem.gd`
- `app/lib/godot/GodotBridge.web.ts`
- `app/lib/godot/GodotBridge.native.ts`

### Fix 3: Coordinate Centralization
- `godot_project/scripts/bridge/CoordinateUtils.gd`
- New: `app/lib/godot/coordinateUtils.ts`

### Fix 4: Query System
- `app/lib/game-engine/EntityManager.ts`

### Fix 5: Collider Migration
- Run: `scripts/convert-entity-components.mjs`
- `app/lib/game-engine/EntityManager.ts` (remove fallbacks)
