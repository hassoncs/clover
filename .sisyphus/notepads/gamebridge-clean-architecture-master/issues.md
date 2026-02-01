
## Task 23: Legacy TypeScript Pattern Cleanup

### Issue: BodyId and ColliderId types missing
- `BodyId` and `ColliderId` branded types were removed from `app/lib/physics2d/types.ts`
- But they're still imported in:
  - `app/lib/physics2d/Physics2D.ts`
  - `app/lib/godot/GodotPhysicsAdapter.ts`
- These types need to be either:
  1. Re-added to physics2d/types.ts, OR
  2. Removed from all interfaces and replaced with `number`

### Deleted Successfully
- ✅ `addFixture` call from EntityManager.ts
- ✅ `addFixture` call from TileMapPhysics.ts (entire file deleted)
- ✅ TileMapPhysics exports from game-engine/index.ts
- ✅ Zone test from EntityManager.query.test.ts
- ✅ `gravity_zone` behavior from LifecycleBehaviors.ts
- ✅ `addFixture` method from GodotPhysicsAdapter.ts
- ✅ `addFixture` method from Physics2D interface

### Remaining Work
- Need to fix BodyId/ColliderId type errors
- Need to remove addFixture from bridge files (GodotBridge.web.ts, GodotBridge.native.ts)
- Need to remove FixtureDef from imports


### GodotPhysicsAdapter.ts Needs Major Refactoring
The file has 581 lines and extensively uses the old branded types (BodyId, ColliderId) with `.value` properties.
All references need to be replaced with plain `number`.

This includes:
- All `.value` property accesses (30+ occurrences)
- All `createBodyId()` and `createColliderId()` calls
- All Map type parameters
- All function signatures

This is beyond the scope of a simple cleanup task and should be a separate refactoring task.

