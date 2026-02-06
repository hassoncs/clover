# Sync World Ops - Task 3 Learnings

## Completed Work

### 1. Created Canonical Interfaces
- **`shared/src/types/sync-world-ops.ts`**: Defines `SyncWorldOps` with all sync gameplay operations
  - Entity lifecycle: spawnEntity, destroyEntity, cloneEntity, reparentEntity
  - Transform: get/set position, rotation, scale, visibility
  - Physics: get/set velocity, angular velocity, applyImpulse, applyForce
  - Tags: getEntityTags, addTag, removeTag, hasTag, getEntityTemplate
  - Queries: queryEntities, queryEntitiesWithData, queryPoint, queryAABB, raycast
  - Game state: getVariable, setVariable, getConstant, emit, win, lose, addScore, addLives

- **`shared/src/types/async-world-ops.ts`**: Defines `AsyncWorldOps` with only truly async operations
  - animate(entityId, target, opts): Promise<void>
  - wait(ms, opts?): Promise<void>

### 2. Unified ScriptContext Definition
- **`app/lib/scripting/types.ts`**: Updated canonical ScriptContext
  - Now extends `SyncWorldOps` (flat sync methods on ctx)
  - Has `worldAsync: AsyncWorldOps` for multi-frame operations
  - Keeps startSequence, isSequenceRunning, cancelSequence
  - Keeps frame info (dt, elapsed, frameId), input, mouse, drag
  - Keeps utilities (random, randomInt, etc.)

- **`shared/src/scripting/script-authoring-types.ts`**: Aligned with canonical definition
  - Re-uses SyncWorldOps and AsyncWorldOps
  - Defines ScriptInputEvent and ScriptCollisionEvent
  - Simplified to avoid duplication

### 3. Test Updates
- Updated `UnsafeScriptSandbox.test.ts` to use flat sync API
  - Changed `ctx.world.setVariable` → `ctx.setVariable`
  - Changed `ctx.world.spawn` → `ctx.spawnEntity`
  - Changed `ctx.world.destroy` → `ctx.destroyEntity`
  - Mock now provides all SyncWorldOps methods + worldAsync

### 4. Added RED Test
- New test: "BallSort-style script startup pattern (RED test)"
  - Tests `ctx.spawnEntity('ball', {x:5, y:10})`
  - Tests `ctx.addTag(id, 'test-tag')`
  - Tests `ctx.setVariable('spawned', true)`
  - **Currently PASSES** because mock provides methods
  - Will FAIL in real runtime until Tasks 4+5 implement facades

## Key Decisions

### Interface Design
- Separated sync (SyncWorldOps) from async (AsyncWorldOps) at type level
- SyncWorldOps methods return values directly (no Promises)
- AsyncWorldOps only contains animate + wait (truly multi-frame)
- ScriptContext extends SyncWorldOps for flat API (ctx.spawnEntity not ctx.world.spawn)

### Naming Conventions
- Sync methods use entity-prefixed names: `spawnEntity`, `getEntityPosition`, `setEntityVelocity`
- This matches BallSort script patterns and avoids confusion with WorldOps async methods
- `worldAsync` property name makes async nature explicit

### Test Strategy
- Mock provides full SyncWorldOps interface
- Test verifies script can call flat sync methods
- Test will fail in real runtime until facades implemented (Tasks 4+5)
- Existing tests updated to use flat API

## Dependencies
- Tasks 4+5 must implement sync facades in runtime context builders
- Task 7-GREEN will verify this test passes with real implementation

## Pre-existing LSP Errors (Ignored)
- ContainerSystem.test.ts: createEntity refs (unrelated)
- entity-lifecycle.test.ts: createEntity refs (unrelated)
- EntityManager.hierarchy.test.ts: createEntity refs (unrelated)

## Task 4 Executor Migration Notes

- `RunScriptActionExecutor.createScriptContext()` now returns flat `SyncWorldOps` methods directly on `ctx` and no longer returns `ctx.world`.
- Canonical sync read names are now used (`getEntityPosition`, `getEntityVelocity`, `getEntityRotation`, `getEntityTags`, `getEntityTemplate`).
- Sync write ops are implemented inline with existing deferred-spawn/entity-manager/mutator behavior so script calls stay synchronous.
- `addScore(points)` and `addLives(count)` update `score`/`lives` via mutator variables with numeric fallback to `0`.
- `ctx.worldAsync` now exists with `animate` and `wait` stubs (`Promise<void>`) for this executor context.
- Methods not supported in this single-frame executor remain safe stubs (`cloneEntity`, `reparentEntity`, scale/visibility/force/angular/query/raycast variants).

## Task 5 Runtime Wrapper Migration Notes

- `ScriptSandboxRuntimeSystem.createScriptContext()` now returns flat `SyncWorldOps` methods directly on `ctx` and removes the legacy `ctx.world` property.
- Canonical sync read names are now used in this runtime wrapper (`getEntityPosition`, `getEntityVelocity`, `getEntityRotation`, `getEntityTags`, `getEntityTemplate`) while keeping `getEntityData`, `queryEntities`, `queryEntitiesWithData`, `getVariable`, `getConstant`, and `hasTag`.
- Added sync write methods with real runtime behavior using full system access:
  - `spawnEntity`, `destroyEntity`, `setVariable`, `setEntityPosition`, `setEntityVelocity`, `addTag`, `removeTag`, `applyImpulse`, `emit`, `win`, `lose`, `addScore`, `addLives`.
- Added working implementations for additional SyncWorldOps methods where available in this runtime:
  - `cloneEntity`, `reparentEntity`, `setEntityRotation`, `get/setEntityScale`, `setEntityVisible`, `applyForce`, `get/setEntityAngularVelocity`, `queryPoint`, `queryAABB`, `raycast`.
- `worldAsync` now delegates to real `WorldOpsImpl` methods (`animate`, `wait`) instead of stubs.
- `setVariable` remains type-safe with `GameState.variables` by accepting only number/string/boolean writes and emitting `variable_change` events.
