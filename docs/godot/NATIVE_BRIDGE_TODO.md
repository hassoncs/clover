# Native Godot Bridge Implementation TODO

**Status**: ✅ **IMPLEMENTED** (Jan 23, 2026)

## Summary

The native bridge has been fully implemented with:
1. **Async query methods** using worklets with return values
2. **Event polling system** for collision/sensor/destroy callbacks
3. **Physics adapter caching** for sync interface compatibility

## Implementation Details

### Async Queries ✅

All query methods now use the `runOnGodotThread()` worklet pattern to return actual values:

```typescript
// Example: queryPointEntity
async queryPointEntity(point: Vec2): Promise<string | null> {
  const { RTNGodot, runOnGodotThread } = await getGodotModule();
  
  return runOnGodotThread(() => {
    'worklet';
    const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge');
    return gameBridge.query_point_entity(point.x, point.y);
  });
}
```

**Implemented methods:**
- ✅ `getEntityTransform(entityId)` → `Promise<EntityTransform | null>`
- ✅ `getAllTransforms()` → `Promise<Record<string, EntityTransform>>`
- ✅ `getLinearVelocity(entityId)` → `Promise<Vec2 | null>`
- ✅ `getAngularVelocity(entityId)` → `Promise<number | null>`
- ✅ `queryPoint(point)` → `Promise<number | null>`
- ✅ `queryPointEntity(point)` → `Promise<string | null>`
- ✅ `queryAABB(min, max)` → `Promise<number[]>`
- ✅ `raycast(origin, direction, maxDistance)` → `Promise<RaycastHit | null>`
- ✅ `getUserData(bodyId)` → `Promise<unknown>`
- ✅ `getAllBodies()` → `Promise<number[]>`
- ✅ `createMouseJointAsync(def)` → `Promise<number>`

### Event Polling System ✅

Since native doesn't support JS callbacks from Godot, we use a polling pattern:

**GDScript (GameBridge.gd):**
```gdscript
var _event_queue: Array = []
const MAX_EVENT_QUEUE_SIZE: int = 100

func _queue_event(event_type: String, data: Dictionary) -> void:
    if _event_queue.size() >= MAX_EVENT_QUEUE_SIZE:
        _event_queue.pop_front()
    _event_queue.append({"type": event_type, "data": data})

func poll_events() -> Array:
    var events = _event_queue.duplicate()
    _event_queue.clear()
    return events
```

**TypeScript (GodotBridge.native.ts):**
- `pollAndDispatchEvents()` runs every 16ms (~60fps)
- Calls `gameBridge.poll_events()` via worklet
- Dispatches events to registered callbacks

**Event types supported:**
- ✅ `collision` - basic collision (entityA, entityB, impulse)
- ✅ `collision_detailed` - with contact manifold
- ✅ `destroy` - entity destroyed
- ✅ `sensor_begin` - sensor overlap started
- ✅ `sensor_end` - sensor overlap ended

### Physics Adapter Caching ✅

The `GodotPhysicsAdapter` maintains cached state for sync interface compatibility:

```typescript
const cachedStates = new Map<number, CachedBodyState>();

// Polls every 16ms on native
async function syncTransformsFromBridge() {
  const transforms = await bridge.getAllTransforms();
  for (const [entityId, transform] of Object.entries(transforms)) {
    const linVel = await bridge.getLinearVelocity(entityId);
    const angVel = await bridge.getAngularVelocity(entityId);
    cachedStates.set(bodyId.value, { transform, linearVelocity, angularVelocity });
  }
}

// Sync interface returns cached values
getLinearVelocity(id: BodyId): Vec2 {
  return cachedStates.get(id.value)?.linearVelocity ?? { x: 0, y: 0 };
}
```

## API Design Decision

**Chosen approach**: **Async interface everywhere**

- All query methods return `Promise<T>`
- Web bridge wraps sync calls in Promises for consistency
- Native bridge uses worklets that naturally return Promises
- Callers must use `await` (breaking change from original sync interface)

## Files Modified

1. `godot_project/scripts/GameBridge.gd` - Event queue system
2. `app/lib/godot/GodotBridge.native.ts` - Async methods + polling
3. `app/lib/godot/GodotBridge.web.ts` - Async wrappers
4. `app/lib/godot/types.ts` - Promise return types
5. `app/lib/godot/GodotPhysicsAdapter.ts` - State caching

## Testing Status

- [ ] Test on iOS simulator
- [ ] Test on Android emulator
- [ ] Verify collision callbacks fire correctly
- [ ] Verify sensor callbacks fire correctly
- [ ] Verify queryPointEntity works for drag interactions
- [ ] Performance test polling overhead

## Remaining Work (Post-Implementation)

- [ ] Add integration tests for native bridge
- [ ] Profile polling overhead on lower-end devices
- [ ] Consider reducing poll frequency if performance issues arise
