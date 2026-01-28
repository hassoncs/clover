# basket-oscillate-fix learnings

## Added setEntityPosition Method (2026-01-27)

### What Was Done
Added `setEntityPosition` method to the BehaviorContext interface and its implementation in GameRuntime.godot.tsx to enable moving sensors/Area2D nodes that don't have physics bodies.

### Files Modified
- `app/lib/game-engine/BehaviorContext.ts` - Added interface method
- `app/lib/game-engine/GameRuntime.godot.tsx` - Added implementation

### Method Signature
```typescript
setEntityPosition(entityId: string, x: number, y: number): void
```

### Implementation
```typescript
setEntityPosition: (entityId, x, y) => {
  bridge.setPosition(entityId, x, y);
},
```

### Use Case
The bucket in Slopeggle is a sensor (Area2D node) with `isSensor: true`. Sensors don't have physics bodies, so they can't be moved using `physics.setTransform()`. The bridge's `setPosition()` method can move any entity including sensors.

### Pattern Followed
Similar to existing `setEntityVelocity` and `setEntityRotation` methods that wrap bridge methods for convenient access in behaviors.
