# GameBridge Refactoring - Kickoff Prompt

**Created**: 2026-01-31
**Purpose**: Comprehensive context for refactoring the Godot GameBridge architecture

---

## Executive Summary

The `godot_project/scripts/GameBridge.gd` file has grown to 4700+ lines with 78 JS handler functions. It's become a monolith that violates single responsibility principle. We need to:

1. **Refactor into clean modules** with clear responsibilities
2. **Create integration tests** that verify TypeScript ↔ Godot communication
3. **Establish consistent patterns** for all bridge operations

---

## Current State

### GameBridge.gd Statistics
- **Lines**: ~4700
- **JS Handler Functions**: 78 (`func _js_*`)
- **Problems**:
  - Mixes orchestration with implementation
  - Duplicate code and inconsistent patterns
  - No compile-time verification of API contract
  - Runtime errors discovered only when playing games

### Existing Modules (partially used)

```
godot_project/scripts/
├── bridge/
│   ├── EventEmitter.gd      # NEW - Godot → JS events (collision, destroy, sensor, input, UI)
│   ├── SyncSystem.gd        # NEW - Godot → JS state sync (transforms, properties)
│   ├── CoordinateUtils.gd   # Static coordinate conversion helpers
│   ├── EventQueue.gd        # Native event polling (for non-web platforms)
│   ├── QuerySystem.gd       # Entity/physics queries
│   ├── VisualRenderer.gd    # Visual creation and management
│   ├── JSBridge.gd          # LEGACY - should be removed
│   └── DebugSystem.gd       # Debug utilities
├── entity/
│   ├── EntityFactory.gd     # Entity creation from templates
│   ├── EntityManager.gd     # Entity lookup and lifecycle
│   ├── TransformSystem.gd   # Transform operations
│   └── ImageSystem.gd       # Dynamic image loading
├── physics/
│   ├── PhysicsController.gd # Velocity, impulse, force operations
│   ├── PhysicsQueries.gd    # Raycast, point queries, AABB
│   ├── CollisionSystem.gd   # Collision detection and reporting
│   └── JointManager.gd      # Joint creation and management
```

### TypeScript Side

The TypeScript bridge is in `app/lib/godot/`:
- `GodotBridge.web.ts` - Web/WASM implementation
- `GodotBridge.native.ts` - iOS/Android implementation  
- `types.ts` - TypeScript type definitions

---

## Architectural Vision

### Clear Module Responsibilities

| Module | Direction | Responsibility |
|--------|-----------|----------------|
| **EventEmitter** | Godot → JS | Discrete events (collision, destroy, sensor, input, UI button) |
| **SyncSystem** | Godot → JS | Continuous state sync (transforms, properties) |
| **PhysicsController** | JS → Godot | Physics commands (velocity, impulse, force, torque) |
| **EntityManager** | JS → Godot | Entity lifecycle (spawn, destroy, lookup) |
| **TransformSystem** | JS → Godot | Position, rotation, scale operations |
| **JointManager** | JS → Godot | Joint creation and destruction |
| **VisualRenderer** | JS → Godot | Images, textures, visual effects |
| **GameBridge** | Orchestrator | Module init, JS callback registration, thin delegation |

### Communication Patterns

**Pattern 1: Events (Godot → JS)**
```
Godot detects collision → EventEmitter.emit_collision() → JS callback
```

**Pattern 2: Sync (Godot → JS)**
```
Physics tick → SyncSystem.process_sync() → JS callback with transform data
```

**Pattern 3: Commands (JS → Godot)**
```
JS calls setLinearVelocity() → GameBridge routes to PhysicsController
```

---

## JS ↔ Godot API Surface

### Events (Godot → JS) - via EventEmitter

| Event | Handler | Payload |
|-------|---------|---------|
| `collision` | `onCollision` | `entityA, entityB, impulse` |
| `destroy` | `onEntityDestroyed` | `entityId` |
| `sensorBegin` | `onSensorBegin` | `sensorColliderId, otherBodyId, otherColliderId` |
| `sensorEnd` | `onSensorEnd` | `sensorColliderId, otherBodyId, otherColliderId` |
| `input` | `onInputEvent` | `{type, x, y, entityId}` |
| `uiButton` | `onUIButton` | `eventType, buttonId` |

### Sync (Godot → JS) - via SyncSystem

| Sync Type | Handler | Payload |
|-----------|---------|---------|
| `transformSync` | `onTransformSync` | `{entityId: {x, y, angle}}` |
| `propertySync` | `onPropertySync` | `{entityId: {props...}}` |

### Commands (JS → Godot) - 78 handlers to organize

**Game Lifecycle**:
- `loadGame(gameData)` → loads game definition
- `clearGame()` → clears all entities
- `pausePhysics()` / `resumePhysics()`

**Entity Lifecycle**:
- `spawnEntity(template, x, y, props)` → spawns entity
- `destroyEntity(entityId)` → destroys entity

**Transform Operations**:
- `setTransform(entityId, x, y, angle)`
- `setPosition(entityId, x, y)`
- `setRotation(entityId, angle)`
- `setScale(entityId, scaleX, scaleY)`
- `getEntityTransform(entityId)` → returns transform

**Physics Operations**:
- `setLinearVelocity(entityId, vx, vy)`
- `setAngularVelocity(entityId, omega)`
- `applyImpulse(entityId, ix, iy)`
- `applyForce(entityId, fx, fy)`
- `applyTorque(entityId, torque)`
- `getLinearVelocity(entityId)` → returns velocity
- `getAngularVelocity(entityId)` → returns angular velocity

**Visual Operations**:
- `setEntityImage(entityId, url, width, height)`
- `setEntityAtlasRegion(entityId, ...)`
- `setOpacity(entityId, opacity)`
- `setDebugShowShapes(enabled)`

**Joint Operations**:
- `createRevoluteJoint(...)` → returns jointId
- `createPrismaticJoint(...)` → returns jointId
- `createDistanceJoint(...)` → returns jointId
- `destroyJoint(jointId)`

**Query Operations**:
- `getAllTransforms()` → returns all entity transforms
- `getAllProperties()` → returns all entity properties
- `getTransform(entityId)` → single transform query
- `getTransforms(entityIds)` → batch transform query

**Sync Configuration**:
- `setTrackedEntities(entityIds, config)` → configure tracked sync
- `setWatchConfig(config)` → legacy watch config

---

## Testing Requirements

### The Problem

Currently, we only discover broken communication at **runtime** when playing a game. Examples of bugs we've hit:
- Duplicate variable declarations in GDScript
- Missing function implementations
- Callback registered but handler doesn't exist
- Type mismatches between TS and GDScript

### The Solution: Bridge Integration Tests

Create tests that verify **every** API method and **every** event type works:

```typescript
// Example test structure
describe('GodotBridge Integration', () => {
  describe('Commands (JS → Godot)', () => {
    test('setLinearVelocity sends correct data', async () => {
      bridge.setLinearVelocity('entity1', 5, 10);
      // Verify Godot received and processed correctly
    });
    
    test('spawnEntity creates entity and returns id', async () => {
      const id = await bridge.spawnEntity('box', 0, 0);
      expect(id).toBeDefined();
    });
    
    // ... test for EVERY command
  });
  
  describe('Events (Godot → JS)', () => {
    test('collision event fires with correct payload', async () => {
      const collisionPromise = waitForEvent('collision');
      // Trigger collision in Godot
      const event = await collisionPromise;
      expect(event).toMatchObject({
        entityA: expect.any(String),
        entityB: expect.any(String),
        impulse: expect.any(Number),
      });
    });
    
    // ... test for EVERY event
  });
});
```

### Test Infrastructure Needed

1. **Test harness** that can:
   - Load a minimal Godot scene
   - Send commands and verify responses
   - Trigger events and verify callbacks

2. **Contract tests** that verify:
   - All TS method signatures match GDScript handlers
   - All event payloads match expected types

3. **Smoke tests** that verify:
   - Bridge initializes correctly
   - Basic round-trip communication works

---

## Files to Reference

### Current Implementation
- `godot_project/scripts/GameBridge.gd` - The monolith to refactor
- `godot_project/scripts/bridge/EventEmitter.gd` - New event module
- `godot_project/scripts/bridge/SyncSystem.gd` - New sync module
- `app/lib/godot/GodotBridge.web.ts` - TypeScript web bridge
- `app/lib/godot/types.ts` - TypeScript types

### Design Documents
- `docs/refactoring/gamebridge-module-split.md` - Module boundary design
- `docs/refactoring/transform-sync-protocol.md` - Sync protocol design

### Existing Tests (for patterns)
- `app/lib/game-engine/__tests__/*.test.ts` - Vitest test patterns

---

## Success Criteria

1. **GameBridge.gd < 500 lines** - Thin orchestrator only
2. **All 78 handlers organized** into appropriate modules
3. **Consistent patterns** across all modules
4. **Integration tests** covering every API method and event
5. **No runtime surprises** - Tests catch contract violations
6. **Clear documentation** of module responsibilities

---

## Suggested Approach

### Phase 1: Test Infrastructure
Create the test harness and basic contract tests FIRST. This ensures we don't break anything during refactoring.

### Phase 2: Extract Physics Commands
Move `setLinearVelocity`, `applyImpulse`, etc. to PhysicsController with tests.

### Phase 3: Extract Entity Commands  
Move `spawnEntity`, `destroyEntity`, transform ops to EntityManager with tests.

### Phase 4: Extract Visual Commands
Move image/texture operations to VisualRenderer with tests.

### Phase 5: Extract Joint Commands
Move joint operations to JointManager with tests.

### Phase 6: Cleanup GameBridge
Remove all extracted code, leaving only orchestration.

### Phase 7: Final Integration Tests
Full test suite verifying all communication paths.

---

## Questions to Resolve

1. **Test runner**: Use Vitest with Playwright for web bridge testing? Or custom harness?
2. **Native testing**: How to test native bridge (iOS/Android)?
3. **Module instantiation**: Keep in GameBridge or use autoloads?
4. **Backward compatibility**: Any external code depending on current API?

---

## Start Command

After reviewing this context, create a Sisyphus plan with:
```
/prometheus Create a detailed refactoring plan for GameBridge with integration tests
```

Or directly:
```
/start-work
```
