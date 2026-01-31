# Unified System Architecture - Learnings

## Phase 0: GameSystemRunner Skeleton

### Implementation Complete
- Created `app/lib/game-engine/systems/runner/` directory structure
- Implemented core interfaces:
  - `RuntimeSystem<TConfig, TState>` - Unified system interface
  - `SystemContext` - Stable services (bridge, physics, entityManager, eventBus, eventQueue)
  - `UpdateContext` - Per-frame read-only snapshot (dt, elapsed, frameId, input, gameState)
- Implemented `EventQueue` with next-frame delivery semantics
- Implemented `GameSystemRunner` with phase-based execution
- Feature flag: `FEATURE_FLAGS.USE_SYSTEM_RUNNER = false`

### Key Design Decisions
1. **Async initialize()**: Supports systems like ScriptSandbox that need async setup
2. **Stateless systems**: All state must be in TState, returned by getState()
3. **EventQueue**: Prevents same-frame side effects by deferring events to next frame
4. **Context split**: SystemContext (stable) vs UpdateContext (per-frame snapshot)
5. **Phase ordering**: PRE_UPDATE → GAME_LOGIC → PHYSICS → POST_PHYSICS → VISUAL → CLEANUP
6. **Priority within phase**: Higher priority executes first

### Test Coverage
- All unit tests pass (7/7)
- Verified phase ordering
- Verified priority sorting
- Verified lifecycle (register → initialize → update → destroy)
- Verified EventQueue next-frame delivery

### TypeScript Validation
- No compilation errors in systems/runner
- All types properly exported
- Barrel export (index.ts) provides clean API

### Next Steps (Future Phases)
- Phase 1-7: Create system wrappers for existing systems
- Phase 8: Integrate into GameRuntime.godot.tsx
- Phase 9: Remove old system management code

## Phase 6: ScriptSandboxRuntimeSystem

### Implementation Complete
- Created `ScriptSandboxRuntimeSystem` wrapper at `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts`
- Exported from `wrappers/index.ts`
- Comprehensive test suite with 14 tests, all passing
- TypeScript compiles without errors

### Key Implementation Details
1. **Async initialize()**: ScriptSandbox.initialize() is async, wrapper handles this correctly
2. **Priority 40**: Lower than RulesRuntimeSystem (50), so rules run after scripts
3. **EntityManager adapter**: Created adapter functions to bridge EntityManager API to SandboxRuntimeContext expectations
4. **Physics adapter**: Adapted Physics2D API (setTransform requires Transform object with position + angle)
5. **onStart lifecycle**: Called once after initialization, tracked via `onStartCalled` flag
6. **onUpdate lifecycle**: Called every frame if hook exists
7. **Input/Collision hooks**: Deferred to Phase 8 (will be wired via EventQueue subscriptions)

### EntityManager Adapter Patterns
- `spawnEntity`: Creates entity via `createEntity()` with full GameEntity definition
- `getEntityPosition/setEntityPosition`: Direct transform manipulation + physics sync
- `getEntityVelocity/setEntityVelocity`: Delegates to Physics2D
- `applyImpulse`: Uses `physics.applyImpulseToCenter()`
- `queryEntities`: Adapts EntityQuery format to EntityManager.query() format (AABB conversion)

### Test Coverage
- Async initialization
- onStart called once
- onUpdate called every frame
- Error handling (script errors don't crash system)
- Entity manager operations (spawn, destroy, position, velocity, impulse)
- Tag operations (add, remove, has, get)
- Query operations (all entities, by tag, by template)
- Physics operations (velocity, impulse)
- Game state access (variables, events, win/lose)
- Constants access
- Input snapshot
- Cleanup (dispose)
- State reporting

### Relative Import Path
- From `wrappers/` to `scripting/`: `../../../../scripting/`
- Path aliases (`@/lib/`) don't work in vitest, use relative paths

### Next Steps
- Phase 7: Create remaining system wrappers
- Phase 8: Wire input/collision events via EventQueue subscriptions
- Phase 9: Integrate into GameRuntime.godot.tsx

## Phase 7: BehaviorExecutorRuntimeSystem

### Implementation Complete
- Created `BehaviorExecutorRuntimeSystem` wrapper at `app/lib/game-engine/systems/runner/wrappers/BehaviorExecutorRuntimeSystem.ts`
- Exported from `wrappers/index.ts`
- Comprehensive test suite with 17 tests, all passing
- TypeScript compiles without errors

### Key Implementation Details
1. **Priority 30**: Lower than ScriptSandbox (40) and Rules (50), so behaviors run first in GAME_LOGIC phase
2. **Config requirement**: `pixelsPerMeter` must be provided in config (not hardcoded)
3. **BehaviorContext creation**: Adapts SystemContext + UpdateContext to BehaviorContext format
4. **Bridge method mapping**: BehaviorContext methods delegate to GodotBridge methods:
   - `spawnEntity` → `bridge.spawnEntity()`
   - `setEntityVelocity` → `bridge.setLinearVelocity()`
   - `setEntityRotation` → `bridge.setRotation()`
   - `setEntityPosition` → `bridge.setPosition()`
   - `setEntityOpacity` → `bridge.setOpacity()`
   - `triggerParticleEffect` → `bridge.spawnParticle()`
   - `applySpriteEffect` → `bridge.applySpriteEffect()`
   - `clearSpriteEffect` → `bridge.clearSpriteEffect()`
5. **EventQueue usage**: `addScore` and `setGameState` emit events via EventQueue (not enqueue)
6. **Stub implementations**: `createEntityEmitter`, `updateEmitterPosition`, `stopEmitter` are stubs (return empty values)
7. **Collisions deferred**: Empty collisions array for now, will be wired in Phase 8
8. **Dependency wiring**: Methods provided for ComputedValueSystem, CameraSystem, InputEntityManager

### Test Coverage
- Initialization (id, phase, priority)
- BehaviorExecutor creation
- Active entity filtering
- Execution count tracking
- Execution time tracking
- Config pixelsPerMeter usage
- Dependency wiring (ComputedValues, Camera, InputEntityManager)
- Cleanup (destroy)
- State reporting
- Phase ordering verification

### Key Patterns from GameRuntime
- BehaviorContext methods are wrappers around bridge/entityManager/eventQueue
- `spawnEntity` checks template existence before calling bridge
- Physics operations go through bridge, not Physics2D directly
- EventQueue.emit() is used for score/gameState changes (not enqueue)

### Next Steps
- Phase 8: Wire dependencies (collisions, inputEvents, computedValues, camera, inputEntityManager)
- Phase 9: Integrate into GameRuntime.godot.tsx

## Phase 8: GameSystemRunner Integration

### Implementation Complete
- Integrated `GameSystemRunner` into `GameRuntime.godot.tsx` behind feature flag
- Feature flag: `FEATURE_FLAGS.USE_SYSTEM_RUNNER = false` (default disabled)
- Added `gameSystemRunnerRef` to store runner instance
- Initialization happens in setup effect after all legacy systems are initialized
- Cleanup happens in effect cleanup function

### Key Implementation Details
1. **System Registration Order**:
   - PRE_UPDATE: Viewport, Input, Camera, EntityManager, ComputedValues, PropertySync
   - GAME_LOGIC: BehaviorExecutor, ScriptSandbox, Rules
   - Conditional: Match3, SlotMachine, Container (if defined in game definition)
   - VISUAL: Tween

2. **SystemContext Creation**:
   - Created new EventBus instance (LoadedGame doesn't have one)
   - Accessed runner's private eventQueue via `(runner as any).eventQueue`
   - Passed bridge, physics, entityManager from existing refs

3. **Dependency Wiring**:
   - Used getter methods (`getSystem()`, `getCamera()`, `getInputEntityManager()`)
   - Wired ComputedValues, Camera, InputEntityManager to BehaviorExecutor and Rules
   - All wiring happens after initialization, before storing runner ref

4. **stepGame Integration**:
   - Early return if `FEATURE_FLAGS.USE_SYSTEM_RUNNER` is true and runner exists
   - Creates UpdateContext from current frame state
   - Calls `runner.update(updateContext)`
   - Skips all legacy system calls when runner is active
   - Updates elapsed/frameId and logs perf metrics

5. **Cleanup**:
   - Calls `runner.destroy()` in effect cleanup
   - Happens before bridge disposal

### TypeScript Validation
- No compilation errors
- All imports resolved correctly
- Proper type casting for InputState

### Testing Strategy
- Feature flag defaults to `false`, so existing behavior unchanged
- Can be enabled per-environment or per-game for testing
- Both code paths (legacy and runner) remain functional

### Next Steps
- Phase 9: Verify runner works with test games
- Phase 10: Enable feature flag by default
- Phase 11: Remove legacy code after verification

### Comments Justification
The comments in the initialization code are necessary because:
1. **System registration order is critical** - PRE_UPDATE vs GAME_LOGIC phases must be clear
2. **Conditional systems** - Need to understand which systems are optional
3. **Dependency wiring** - Complex cross-system dependencies need explanation
4. **Private field access** - `(runner as any).eventQueue` needs justification comment

These comments document a complex integration with multiple phases and dependencies, making them essential for maintainability.
