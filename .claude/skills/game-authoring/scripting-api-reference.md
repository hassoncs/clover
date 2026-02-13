---
description: "Scripting API reference for QuickJS sandbox. Covers ScriptContext, lifecycle hooks (onStart, onUpdate, onInput, onCollision), WorldOps, and the scripting runtime. Use when writing game scripts or debugging script behavior."
---

# Scripting API Reference

Scripts provide imperative game logic beyond what the declarative rules system can express. They run in a sandboxed QuickJS environment.

## Script Lifecycle Hooks

```javascript
// Called once when game starts
exports.onStart = function(ctx) { };

// Called every physics frame
exports.onUpdate = function(ctx, dt) { };

// Called on input events
exports.onInput = function(ctx, event) { };

// Called on physics collisions
exports.onCollision = function(ctx, collision) { };
```

## ScriptContext (ctx)

The `ctx` object extends `SyncWorldOps` with additional utilities:

### Frame Info (read-only)
```javascript
ctx.dt        // Delta time in seconds
ctx.elapsed   // Total elapsed time in seconds
ctx.frameId   // Current frame number
```

### Utility Functions
```javascript
ctx.random()                    // Random float 0-1
ctx.randomInt(min, max)         // Random integer [min, max]
ctx.randomChoice(array)         // Random element from array
ctx.clamp(value, min, max)      // Clamp value to range
ctx.lerp(a, b, t)              // Linear interpolation
ctx.distance(vecA, vecB)        // Distance between two Vec2
```

## SyncWorldOps (on ctx directly)

### Entity Lifecycle
```javascript
ctx.spawnEntity(prefabId, { x, y }, opts?)  // Returns entityId or null
ctx.destroyEntity(entityId)
ctx.cloneEntity(entityId, opts?)              // Returns new entityId or null
ctx.reparentEntity(entityId, newParentId, opts?)
```

**SpawnOptions:**
```javascript
{
  velocity?: { x, y },    // Initial velocity
  angle?: number,          // Initial rotation
  tags?: string[],         // Additional tags
  parentId?: string,       // Parent entity
  entityId?: string,       // Explicit ID (useful for tracking)
}
```

### Transform
```javascript
ctx.getEntityPosition(entityId)     // Returns { x, y } or null
ctx.setEntityPosition(entityId, { x, y })
ctx.getEntityRotation(entityId)     // Returns angle or null
ctx.setEntityRotation(entityId, angle)
ctx.getEntityScale(entityId)        // Returns { x, y } or null
ctx.setEntityScale(entityId, { x, y })
ctx.setEntityVisible(entityId, visible)
```

### Physics
```javascript
ctx.getEntityVelocity(entityId)           // Returns { x, y } or null
ctx.setEntityVelocity(entityId, { x, y })
ctx.getEntityAngularVelocity(entityId)    // Returns number or null
ctx.setEntityAngularVelocity(entityId, velocity)
ctx.applyImpulse(entityId, { x, y })
ctx.applyForce(entityId, { x, y })
```

### Entity Metadata
```javascript
ctx.getEntityTags(entityId)         // Returns string[]
ctx.addTag(entityId, tag)
ctx.removeTag(entityId, tag)        // Returns boolean
ctx.hasTag(entityId, tag)           // Returns boolean
ctx.getEntityPrefab(entityId)       // Returns string or undefined
ctx.getEntityData(entityId)         // Returns full WorldEntityData or null
```

### Queries
```javascript
ctx.queryEntities(query?)               // Returns string[] (entity IDs)
ctx.queryEntitiesWithData(query?)       // Returns WorldEntityData[]
ctx.queryPoint({ x, y })               // Returns entityId or null
ctx.queryAABB(min, max)                 // Returns string[]
ctx.raycast(from, to, opts?)            // Returns RaycastHit or null
```

**WorldEntityQuery** filter:
```javascript
ctx.queryEntities({ tag: 'enemy' })
ctx.queryEntities({ prefab: 'bullet' })
ctx.queryEntities({ tags: ['enemy', 'alive'] })  // Must have all tags
```

### Game State
```javascript
ctx.getVariable(name)              // Returns unknown
ctx.setVariable(name, value)
ctx.getConstant(name)              // Returns unknown
ctx.emit(eventName, data?)         // Emit game event
ctx.win()                          // Trigger win state
ctx.lose()                         // Trigger lose state
```

### Haptics
```javascript
ctx.haptic(style?)                 // Impact feedback: 'Light', 'Medium' (default), 'Heavy', 'Rigid', 'Soft'
ctx.hapticNotification(style?)     // Notification feedback: 'Success' (default), 'Warning', 'Error'
ctx.hapticSelection()              // Selection feedback (subtle tap)
```

## Input Snapshots (per-frame, on ctx)

```javascript
ctx.input    // InputSnapshot | null — current input event
ctx.mouse    // { x, y } | null — current mouse/touch position
ctx.drag     // DragSnapshot | null — { isDragging, startPosition, currentPosition, entityId }
```

## Sequences & Async Operations

For multi-frame work (animations, delays), use sequences:

```javascript
exports.onStart = function(ctx) {
  ctx.startSequence('intro', async (world) => {
    await world.animate('player', { opacity: 1 }, { duration: 500 });
    await world.wait(1000);
    await world.animate('player', { y: 0 }, { duration: 300, easing: 'ease-out' });
  });
};

exports.onUpdate = function(ctx, dt) {
  if (ctx.isSequenceRunning('intro')) return; // Wait for sequence
  // Normal update logic...
};
```

### Sequence Management
```javascript
ctx.startSequence(name, asyncFn)    // Returns SequenceHandle { name, isRunning, cancel() }
ctx.isSequenceRunning(name)         // Returns boolean
ctx.cancelSequence(name)            // Cancel a running sequence
```

### AsyncWorldOps (available inside sequences)

```javascript
await world.animate(entityId, target, opts)
// target: { x?, y?, rotation?, scaleX?, scaleY?, opacity? }
// opts: { duration: number, easing?: 'linear'|'ease-in'|'ease-out'|'ease-in-out'|... }

await world.wait(ms, opts?)
// opts: { realtime?: boolean }  — realtime = unaffected by pause/timeScale
```

## Input Events

`onInput` receives a `ScriptInputEvent`:

```javascript
{
  type: 'tap' | 'dragStart' | 'dragMove' | 'dragEnd' | 'gameStarted' | 'gameRestarted',
  position?: { x, y },     // World coordinates
  entityId?: string | null, // Entity under touch point
  timestamp: number,
}
```

## Collision Events

`onCollision` receives a `ScriptCollisionEvent`:

```javascript
{
  entityA: string,         // Entity ID
  entityB: string,         // Entity ID
  normal: { x, y },       // Collision normal
  impulse: number,         // Impact force
  contactPoint: { x, y }, // World position of contact
  timestamp: number,
}
```

## Script Patterns

### Grid-Based Movement (Snake)
```javascript
let snake = [{ x: 9, y: 12 }];
let moveAccum = 0;

exports.onUpdate = function(ctx, dt) {
  moveAccum += dt;
  if (moveAccum < 0.15) return;
  moveAccum = 0;

  const dir = ctx.getVariable('direction');
  const head = snake[0];
  let newX = head.x, newY = head.y;
  if (dir === 0) newY -= 1;      // up
  else if (dir === 1) newX += 1;  // right
  else if (dir === 2) newY += 1;  // down
  else if (dir === 3) newX -= 1;  // left

  snake.unshift({ x: newX, y: newY });
  snake.pop();

  const headId = ctx.queryEntities({ tag: 'player' })[0];
  if (headId) ctx.setEntityPosition(headId, gridToWorld(newX, newY));
};
```

### Run Script from Rules
```typescript
// In rules:
{ type: "run_script", export: "handleTap", args: { tubeIndex: 0 } }

// In script:
exports.handleTap = function(ctx, args) {
  const tubeIndex = args.tubeIndex;
  // ...
};
```

### Spawning and Tracking
```javascript
exports.onUpdate = function(ctx, dt) {
  const enemies = ctx.queryEntities({ tag: 'enemy' });
  if (enemies.length < 5) {
    const x = ctx.random() * 10 - 5;
    ctx.spawnEntity('enemy', { x, y: 8 });
  }

  for (const id of enemies) {
    const pos = ctx.getEntityPosition(id);
    if (pos && pos.y < -10) {
      ctx.destroyEntity(id);
    }
  }
};
```

## Execution Budgets

Scripts run with safety limits per frame:
- **maxExecutionTimeMs**: 2ms per frame
- **maxInstructions**: 100,000
- **maxMemoryBytes**: 1MB
- **loadTimeoutMs**: 5000ms (compile timeout)

## Important Notes

- Scripts use **CommonJS** style (`exports.onStart = ...`), not ES modules
- Script closure state persists across frames (use `let` at top level for state)
- The sandbox has no access to DOM, network, or file system
- `ctx.random()` is seeded for determinism in replays
- All position values are in world units (meters), not pixels
- Named exports (e.g., `exports.handleTap`) can be called from rules via `run_script` action
