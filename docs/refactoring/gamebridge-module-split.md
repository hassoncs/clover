# GameBridge Module Split Design

**Created**: 2026-01-31
**Purpose**: Define module boundaries for splitting the 4700+ line GameBridge.gd

## Current State

### GameBridge.gd (4731 lines)
- Contains duplicated implementations that should delegate to existing modules
- Acts as both orchestrator AND implementer
- Module instances exist but aren't fully used

### Existing Modules (2192 lines total)

| Module | Lines | Purpose | Used? |
|--------|-------|---------|-------|
| `bridge/CoordinateUtils.gd` | 14 | Static coordinate conversion | Partial |
| `bridge/EventQueue.gd` | 22 | Native event polling | Yes |
| `bridge/DebugSystem.gd` | 26 | Debug utilities | Yes |
| `bridge/SyncSystem.gd` | 48 | Transform/property sync | Partial |
| `bridge/QuerySystem.gd` | 98 | Query handling | Yes |
| `bridge/JSBridge.gd` | 294 | JS callback wrapper | Legacy |
| `bridge/VisualRenderer.gd` | 424 | Visual creation | Partial |
| `entity/EntityFactory.gd` | 512 | Entity creation | Yes |
| `entity/EntityManager.gd` | 47 | Entity lifecycle | Partial |
| `entity/EntityLifecycleSystem.gd` | 44 | Spawn/destroy | Partial |
| `entity/TransformSystem.gd` | 56 | Transform handling | Partial |
| `entity/ImageSystem.gd` | 38 | Image loading | Partial |
| `physics/CollisionSystem.gd` | 127 | Collision handling | Partial |
| `physics/PhysicsController.gd` | 103 | Velocity/force ops | Partial |
| `physics/PhysicsQueries.gd` | 124 | Point/AABB/raycast | Partial |
| `physics/JointManager.gd` | 215 | Joint management | Partial |

## Target Architecture

```
GameBridge.gd (Thin Orchestrator)
├── Module initialization
├── JS callback registration
├── Public API (delegates to modules)
└── Backward-compat wrappers

scripts/bridge/
├── CoordinateUtils.gd    [KEEP - static helpers]
├── EventQueue.gd         [KEEP]
├── EventEmitter.gd       [NEW - unify event emission]
├── SyncSystem.gd         [ENHANCE - tracked sync]
├── QuerySystem.gd        [KEEP]
└── JSBridge.gd           [DEPRECATE - merge into orchestrator]

scripts/entity/
├── EntityFactory.gd      [KEEP - authoritative]
├── EntityManager.gd      [ENHANCE - full lifecycle]
├── TransformSystem.gd    [KEEP]
└── ImageSystem.gd        [KEEP]

scripts/physics/
├── PhysicsController.gd  [KEEP]
├── PhysicsQueries.gd     [KEEP]
├── CollisionSystem.gd    [KEEP]
└── JointManager.gd       [KEEP]
```

## Module Responsibilities (IN/OUT)

### GameBridge.gd (Orchestrator)

**IN (Responsibilities)**:
- Autoload initialization
- Module instantiation and wiring
- JS callback registration
- Public API surface (thin delegation)
- Backward-compat method wrappers
- Core state ownership: `game_data`, `entities`, `templates`, `pixels_per_meter`

**OUT (Should NOT contain)**:
- Coordinate conversion logic (delegate to CoordinateUtils)
- Entity creation logic (delegate to EntityFactory)
- Physics operations (delegate to PhysicsController)
- Event emission logic (delegate to EventEmitter)
- Transform sync logic (delegate to SyncSystem)

### EventEmitter.gd (NEW)

**IN**:
- Collision event emission
- Spawn/destroy event emission
- Sensor begin/end emission
- Input event emission
- UI button event emission

**OUT**:
- Event processing/handling
- JS callback registration (orchestrator does this)

### EntityFactory.gd (EXISTING)

**IN**:
- Template resolution and merging
- Node creation (RigidBody2D, Area2D, etc.)
- Shape creation
- Collider setup
- Initial property application

**OUT**:
- Entity lifetime management (EntityManager)
- Runtime property updates
- Transform updates after creation

### EntityManager.gd (ENHANCE)

**IN**:
- Entity lookup by ID
- Entity iteration
- Body ID ↔ Entity ID mapping
- Shape index → Collider ID mapping
- Entity lifecycle events (spawn/destroy)

**OUT**:
- Entity creation (EntityFactory)
- Physics operations (PhysicsController)

### PhysicsController.gd (EXISTING)

**IN**:
- `setLinearVelocity()`
- `setAngularVelocity()`
- `applyImpulse()`
- `applyForce()`
- `applyTorque()`
- Sensor velocity management

**OUT**:
- Physics queries (PhysicsQueries)
- Joint management (JointManager)

### SyncSystem.gd (ENHANCE)

**IN**:
- Transform sync (all entities)
- Tracked entity sync (subset)
- Property sync
- Sync frequency control

**OUT**:
- Individual entity transform updates (TransformSystem)

## State Ownership

| State | Owner | Accessors |
|-------|-------|-----------|
| `game_data` | GameBridge | All modules (read) |
| `entities` | EntityManager | All modules |
| `templates` | GameBridge | EntityFactory |
| `pixels_per_meter` | GameBridge | CoordinateUtils, all modules |
| `entity_id_map` | EntityManager | PhysicsController, queries |
| `joints` | JointManager | GameBridge (API) |
| `sensors` | EntityManager | PhysicsController |
| `sensor_velocities` | PhysicsController | SyncSystem |

## Module Init Lifecycle

```gdscript
func _init_modules() -> void:
    # 1. Create modules (dependency order)
    _entity_manager = EntityManager.new(self)
    _entity_factory = EntityFactory.new(self, _entity_manager)
    _physics_controller = PhysicsController.new(self, _entity_manager)
    _collision_system = CollisionSystem.new(self, _entity_manager)
    _sync_system = SyncSystem.new(self, _entity_manager)
    _event_emitter = EventEmitter.new(self)
    # ... etc
    
    # 2. Connect signals between modules
    _collision_system.collision_detected.connect(_event_emitter.emit_collision)
    _entity_manager.entity_spawned.connect(_event_emitter.emit_spawn)
```

## Migration Strategy

### Phase 1: Create EventEmitter (NEW)
1. Create `scripts/bridge/EventEmitter.gd`
2. Move all `_emit_*` functions from GameBridge
3. Update GameBridge to delegate to EventEmitter

### Phase 2: Enhance EntityManager
1. Move `entity_id_map`, `entity_id_reverse`, `entity_shape_map` to EntityManager
2. Move lookup functions: `get_entity_by_id()`, `get_entity_node()`
3. Update callers in GameBridge

### Phase 3: Full PhysicsController Delegation
1. Remove duplicate velocity/force methods from GameBridge
2. All physics ops go through PhysicsController
3. Update JS handler methods to delegate

### Phase 4: SyncSystem Enhancement (Fix 2)
1. Add tracked entity support
2. Add on-demand transform queries
3. Integrate with new event-driven protocol

### Phase 5: Cleanup
1. Remove JSBridge.gd (legacy, merged into orchestrator)
2. Remove coordinate conversion methods from GameBridge (use CoordinateUtils directly)
3. Remove duplicate implementations

## Backward Compatibility

During migration, GameBridge keeps all public methods working:

```gdscript
# Example: Old method becomes thin wrapper
func setLinearVelocity(entity_id: String, vx: float, vy: float) -> bool:
    return _physics_controller.set_linear_velocity(entity_id, vx, vy)

# Eventually, callers can use module directly if needed
```

All existing TS bridge calls continue to work unchanged.

## Verification After Each Phase

1. `pnpm tsc --noEmit` - TS compilation
2. `pnpm test` - Test suite
3. `pnpm web` - Load test game, verify no console errors
4. Godot watcher - No build errors

## Decision: EntityFactory Location

**Decision**: Keep `scripts/entity/EntityFactory.gd` in current location.

**Rationale**:
- Already established and working
- Path stability for any external references
- Logical grouping with other entity modules
- No compelling reason to relocate to `scripts/bridge/`

## Files Changed Summary

| File | Change |
|------|--------|
| `GameBridge.gd` | Refactor to thin orchestrator |
| `bridge/EventEmitter.gd` | NEW |
| `entity/EntityManager.gd` | ENHANCE |
| `bridge/SyncSystem.gd` | ENHANCE (Fix 2) |
| `bridge/JSBridge.gd` | DEPRECATE (after migration) |

## Success Criteria

- [ ] GameBridge.gd < 1000 lines (from 4700+)
- [ ] All modules have clear IN/OUT boundaries
- [ ] No duplicate implementations
- [ ] All existing functionality preserved
- [ ] Verification commands pass after each phase
