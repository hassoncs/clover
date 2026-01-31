# GameBridge Refactor - Baseline Behavior Documentation

**Generated:** 2026-01-31
**Purpose:** Document expected bridge behavior for regression testing

## Baseline Verification Protocol

When the dev server is running (`pnpm dev`), verify these behaviors:

### 1. Game Loading
- Open: http://localhost:8085/examples/draggable_cubes
- Expected: Game loads, entities visible, physics running
- Check: No console errors from GameBridge.gd

### 2. Entity Spawning
- Spawn entity via console: `window.GodotBridge.spawnEntity('box', 0, 0, 'test', '{}')`
- Expected: Entity appears at center
- Check: `window.GodotBridge.getEntityTransform('test')` returns valid transform

### 3. Physics Operations
- Set velocity: `window.GodotBridge.setLinearVelocity('test', 10, 0)`
- Expected: Entity moves right
- Check: Position changes over time

### 4. Event Callbacks
- Register: `window.GodotBridge.onCollision((a, b, i) => console.log(a, b, i))`
- Expected: Callback registered without error
- Check: Events fire when entities collide

### 5. Transform Queries
- Query: `window.GodotBridge.getAllTransforms()`
- Expected: Returns object with all entity transforms
- Check: Includes 'test' entity with x, y, angle

## Regression Checklist (Post-Refactor)

After swapping to new GameBridge.gd, verify:

- [ ] Game loads without errors
- [ ] Entities spawn correctly
- [ ] Physics simulation runs
- [ ] Velocity/force operations work
- [ ] Transform queries return correct data
- [ ] Event callbacks fire
- [ ] Visual rendering works
- [ ] No console warnings about missing handlers

## Known Working Examples

1. **draggable_cubes** - Physics + input + dragging
2. **breakoutBouncer** - Collision events + physics
3. **flappyBird** - Game loop + entity spawning

## Handler Coverage

All 78 handlers must continue working:
- 7 PhysicsController handlers
- 4 EntityManager handlers  
- 11 TransformSystem handlers
- 5 VisualRenderer handlers
- 8 JointManager handlers
- 8 EventEmitter handlers
- Plus: SyncSystem, QuerySystem, CameraController, UIManager, Viewport3D, DebugInfo, BodyAPI
