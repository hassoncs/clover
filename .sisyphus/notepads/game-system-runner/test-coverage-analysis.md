# Test Coverage Analysis for RuntimeSystem Wrappers

**Date**: 2026-01-31
**Scope**: 13 RuntimeSystem wrappers created in Phases 0-8

## Summary

**Test Coverage**: 2 out of 13 wrappers have tests (15%)

### Wrappers WITH Tests ✅

1. **BehaviorExecutorRuntimeSystem** - `BehaviorExecutorRuntimeSystem.test.ts` (385 lines)
2. **ScriptSandboxRuntimeSystem** - `ScriptSandboxRuntimeSystem.test.ts` (333 lines)

### Wrappers WITHOUT Tests ❌

3. ViewportRuntimeSystem
4. PropertySyncRuntimeSystem
5. ComputedValuesRuntimeSystem
6. EntityManagerRuntimeSystem
7. InputRuntimeSystem
8. CameraRuntimeSystem
9. TweenRuntimeSystem
10. Match3RuntimeSystem
11. SlotMachineRuntimeSystem
12. ContainerRuntimeSystem
13. RulesRuntimeSystem

### Supporting Infrastructure Tests ✅

- **EventQueue** - `EventQueue.test.ts` (99 lines)
- **GameSystemRunner** - `GameSystemRunner.test.ts` (230 lines)

---

## Detailed Test Coverage

### 1. BehaviorExecutorRuntimeSystem ✅ TESTED

**Test File**: `BehaviorExecutorRuntimeSystem.test.ts`

**Coverage**:
- ✅ Initialization (id, phase, priority)
- ✅ Config initialization (pixelsPerMeter)
- ✅ BehaviorExecutor creation
- ✅ Update execution for active entities
- ✅ Filtering inactive entities
- ✅ Execution count tracking
- ✅ Execution time tracking
- ✅ Behavior context (pixelsPerMeter, spawnEntity)
- ✅ Dependency wiring (ComputedValues, Camera, InputEntityManager)
- ✅ Destroy cleanup
- ✅ State management
- ✅ Phase ordering (priority 30, GAME_LOGIC phase)

**Missing Coverage**:
- Actual behavior execution (rotate, move, etc.)
- Integration with real behaviors
- Error handling in behavior execution

---

### 2. ScriptSandboxRuntimeSystem ✅ TESTED

**Test File**: `ScriptSandboxRuntimeSystem.test.ts`

**Coverage**:
- ✅ Phase and priority (priority 40, GAME_LOGIC)
- ✅ Async initialization
- ✅ onStart lifecycle (called once)
- ✅ onUpdate lifecycle (called every frame)
- ✅ Script error handling
- ✅ Entity manager adapter (spawn, get, destroy)
- ✅ Tag operations (add, remove, has, get)
- ✅ Query operations (all entities, by tag)
- ✅ Physics operations (velocity, impulse)
- ✅ Game state access (variables, emit)
- ✅ Constants access
- ✅ Input snapshot
- ✅ Cleanup on destroy
- ✅ State tracking (hasOnStart, hasOnUpdate, etc.)

**Missing Coverage**:
- onInput handler
- onCollision handler
- Complex script scenarios
- Sandbox security boundaries

---

### 3. ViewportRuntimeSystem ❌ NO TESTS

**Purpose**: Manages viewport calculations for screen-to-world coordinate transformations

**Key Features**:
- Event-driven (layout changes)
- No per-frame update
- Phase: PRE_UPDATE, Priority: 100 (highest)
- Exposes ViewportSystem for coordinate transformations

**Should Test**:
- Initialization with worldBounds, aspectRatio, fit, letterboxColor
- ViewportRect calculation
- ScreenSize tracking
- State management (viewportRect, screenSize)
- getSystem() accessor
- Destroy cleanup

**Integration Points**:
- Used by other systems for coordinate transformations
- Critical for input handling (screen → world coords)

---

### 4. PropertySyncRuntimeSystem ❌ NO TESTS

**Purpose**: Synchronizes entity properties from Godot to TypeScript

**Key Features**:
- Event-driven via bridge callbacks
- No per-frame update
- Phase: PRE_UPDATE, Priority: 90
- Manages PropertyCache

**Should Test**:
- Initialization with PropertyCache
- PropertySyncManager creation and start
- Bridge subscription
- Cache size tracking
- Stop on destroy
- getManager() and getCache() accessors

**Integration Points**:
- Critical for Godot ↔ TypeScript sync
- Used by systems that read entity properties

---

### 5. ComputedValuesRuntimeSystem ❌ NO TESTS

**Purpose**: Manages expression compilation and evaluation for dynamic game properties

**Key Features**:
- On-demand evaluation (not per-frame)
- Phase: PRE_UPDATE, Priority: 80
- Wraps ComputedValueSystem

**Should Test**:
- Initialization with optional system
- Default ComputedValueSystem creation
- Expression compilation count tracking
- Cache clearing on destroy
- getSystem() accessor

**Integration Points**:
- Used by behaviors and rules for dynamic expressions
- Critical for computed properties

---

### 6. EntityManagerRuntimeSystem ❌ NO TESTS

**Purpose**: Wrapper for EntityManager, syncs transforms from physics

**Key Features**:
- Calls syncTransformsFromPhysics() every frame
- Phase: PRE_UPDATE, Priority: 70
- No config needed

**Should Test**:
- Initialization with EntityManager from context
- syncTransformsFromPhysics() called on update
- State tracking (entityCount, activeEntityIds)
- getEntityManager() accessor
- Destroy cleanup

**Integration Points**:
- Core system used by all entity operations
- Critical for physics → entity sync

---

### 7. InputRuntimeSystem ❌ NO TESTS

**Purpose**: Manages input entity tracking (mouse, touch, etc.)

**Key Features**:
- Syncs from input every frame
- Phase: PRE_UPDATE, Priority: 60
- Wraps InputEntityManager

**Should Test**:
- Initialization with debug config
- syncFromInput() called on update
- Mouse position tracking
- Active inputs tracking
- getInputEntityManager() accessor
- Destroy cleanup

**Integration Points**:
- Used by behaviors and rules for input handling
- Critical for drag, tap, mouse interactions

---

### 8. CameraRuntimeSystem ❌ NO TESTS

**Purpose**: Manages camera position, zoom, and following

**Key Features**:
- Updates camera every frame
- Phase: PRE_UPDATE, Priority: 50
- Wraps CameraSystem

**Should Test**:
- Initialization with cameraConfig, viewport, pixelsPerMeter
- Camera update with dt and entity lookup
- State tracking (position, zoom, trauma)
- getCamera() accessor
- Destroy cleanup

**Integration Points**:
- Used by rendering for viewport positioning
- Used by behaviors for camera shake, follow

---

### 9. TweenRuntimeSystem ❌ NO TESTS

**Purpose**: Handles smooth animations for entity properties

**Key Features**:
- Updates tweens every frame
- Phase: VISUAL, Priority: 100
- Wraps TweenSystem

**Should Test**:
- Initialization with bridge callbacks (setPosition, setRotation, setScale, setOpacity)
- Tween update with dt
- Active tween count tracking
- getTweenSystem() accessor
- Destroy cleanup

**Integration Points**:
- Used by behaviors and rules for animations
- Critical for visual effects

---

### 10. Match3RuntimeSystem ❌ NO TESTS

**Purpose**: Manages Match-3 game logic (grid, matching, cascades)

**Key Features**:
- Handles tap and mouse input
- Updates match3 logic every frame
- Phase: GAME_LOGIC, Priority: 100
- Emits events via eventQueue

**Should Test**:
- Initialization with Match3Config and callbacks
- Event emission (score_add, match_found, board_ready, no_moves)
- Tap handling
- Mouse move handling
- Phase tracking
- getMatch3System() accessor
- Destroy cleanup

**Integration Points**:
- Game-specific system for Match-3 games
- Emits events consumed by rules

---

### 11. SlotMachineRuntimeSystem ❌ NO TESTS

**Purpose**: Manages slot machine game logic (reels, spins, wins)

**Key Features**:
- Updates slot machine logic every frame
- Phase: GAME_LOGIC, Priority: 90
- Emits many events (spin_start, spin_complete, win_found, bonus_trigger, etc.)

**Should Test**:
- Initialization with SlotMachineConfig and callbacks
- Event emission (10+ event types)
- Phase tracking
- Free spins tracking
- getSlotMachineSystem() accessor
- Destroy cleanup

**Integration Points**:
- Game-specific system for slot machine games
- Emits events consumed by rules

---

### 12. ContainerRuntimeSystem ❌ NO TESTS

**Purpose**: Manages entity containers (groups, inventories)

**Key Features**:
- Event-driven (no per-frame update)
- Phase: GAME_LOGIC, Priority: 80
- Wraps ContainerSystem

**Should Test**:
- Initialization with containers config
- Container count tracking
- Container IDs tracking
- getContainerSystem() accessor
- Destroy cleanup

**Integration Points**:
- Used by rules for container operations
- Critical for inventory, groups

---

### 13. RulesRuntimeSystem ❌ NO TESTS

**Purpose**: Evaluates game rules, win/lose conditions

**Key Features**:
- Updates rules every frame
- Phase: GAME_LOGIC, Priority: 50
- Wraps RulesEvaluator
- Dependency wiring for ComputedValues, Camera, InputEntityManager

**Should Test**:
- Initialization with rules, winCondition, loseCondition, variables, containers
- Rule evaluation with EvalContext
- Game state tracking (score, lives, variables, gameState)
- Dependency wiring (setComputedValues, setCamera, setInputEntityManager)
- getRulesEvaluator() accessor
- Destroy cleanup

**Integration Points**:
- Core system for game logic
- Depends on many other systems
- Critical for win/lose conditions

---

## Supporting Infrastructure

### EventQueue ✅ TESTED

**Test File**: `EventQueue.test.ts`

**Coverage**:
- ✅ Event queuing and delivery on next frame
- ✅ Multiple events in order
- ✅ Multiple subscribers
- ✅ Unsubscribe
- ✅ Clear queue and listeners
- ✅ Return flushed events
- ✅ Clear queue after flush

---

### GameSystemRunner ✅ TESTED

**Test File**: `GameSystemRunner.test.ts`

**Coverage**:
- ✅ System registration
- ✅ Duplicate system detection
- ✅ Initialize all systems
- ✅ Update systems in phase order
- ✅ Update systems by priority within phase
- ✅ Destroy all systems
- ✅ Error on update before initialization
- ✅ Error on registration after initialization

---

## Recommendations

### Priority 1: Core Systems (Critical Path)

These systems are used by almost every game and should be tested first:

1. **EntityManagerRuntimeSystem** - Core entity operations
2. **RulesRuntimeSystem** - Core game logic
3. **InputRuntimeSystem** - Core input handling
4. **CameraRuntimeSystem** - Core rendering

### Priority 2: Utility Systems (High Value)

These systems provide important functionality but are less critical:

5. **ViewportRuntimeSystem** - Coordinate transformations
6. **ComputedValuesRuntimeSystem** - Dynamic expressions
7. **TweenRuntimeSystem** - Animations
8. **PropertySyncRuntimeSystem** - Godot sync

### Priority 3: Game-Specific Systems (Lower Priority)

These systems are only used by specific game types:

9. **Match3RuntimeSystem** - Match-3 games only
10. **SlotMachineRuntimeSystem** - Slot machine games only
11. **ContainerRuntimeSystem** - Games with containers

### Test Patterns to Follow

Based on the existing tests, each wrapper test should cover:

1. **Initialization**
   - Correct id, phase, priority
   - Config handling
   - Underlying system creation

2. **Update Behavior**
   - Per-frame logic (if any)
   - Event-driven logic (if any)
   - State changes

3. **State Management**
   - getState() returns correct data
   - State updates on operations

4. **Accessors**
   - getSystem() / getManager() / etc.
   - Returns null after destroy

5. **Cleanup**
   - destroy() cleans up resources
   - State resets to initial values

6. **Integration Points**
   - Dependency wiring (if any)
   - Event emission (if any)
   - Bridge interactions (if any)

### Test Infrastructure Needed

- Mock SystemContext with all dependencies
- Mock UpdateContext with input, gameState, dt, elapsed, frameId
- Mock bridge, physics, entityManager, eventBus, eventQueue
- Helper functions for creating test entities
- Helper functions for creating test configs

---

## Conclusion

**Current State**: 15% test coverage (2/13 wrappers)

**Next Steps**:
1. Create tests for Priority 1 systems (EntityManager, Rules, Input, Camera)
2. Create tests for Priority 2 systems (Viewport, ComputedValues, Tween, PropertySync)
3. Create tests for Priority 3 systems (Match3, SlotMachine, Container)

**Estimated Effort**:
- Each wrapper test: ~200-300 lines (based on existing tests)
- Total: ~2,600-3,900 lines of test code
- Time: ~1-2 hours per wrapper = 11-22 hours total

**Benefits**:
- Catch regressions during refactoring
- Document expected behavior
- Enable confident changes to system architecture
- Verify phase ordering and priorities
- Ensure proper cleanup and resource management
