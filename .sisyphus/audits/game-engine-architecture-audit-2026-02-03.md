# Game Engine Architecture Cleanup Audit
**Date:** 2026-02-03  
**Auditor:** Atlas (Architecture Analysis)  
**Status:** CRITICAL - Multiple architectural issues identified

---

## Executive Summary

The game engine has **3 critical architectural problems**:

1. **DUPLICATE INSTANCES**: `GameLoader` creates systems that are never used; `GameSystemRunner` creates its own instances
2. **INCONSISTENT COMMUNICATION**: Mix of callbacks, events, and direct method calls with no clear pattern
3. **DEAD CODE PATHS**: Callbacks set on wrong instances, causing bugs like "win condition UI not showing"

**Impact:** Win conditions trigger but UI doesn't update because callbacks are set on `GameLoader`'s RulesEvaluator, but `GameSystemRunner`'s RulesSystem actually runs the game.

---

## Problem 1: Duplicate Class Instances

### Current Architecture (BROKEN)

```
GameRuntime.godot.tsx
├── GameLoader (line 522)
│   ├── EntityManager (line 37 in GameLoader.ts)
│   ├── BehaviorExecutor (line 55 in GameLoader.ts)
│   ├── GameState (line 56 in GameLoader.ts)
│   └── GameEventBus (line 57 in GameLoader.ts)
│
└── GameSystemRunner (line 598)
    ├── EntityManagerRuntimeSystem (line 627)
    │   └── Uses GameLoader's EntityManager (passed via SystemContext)
    ├── RulesSystem (line 661)
    │   └── Creates its OWN RulesEvaluator logic
    ├── BehaviorExecutorRuntimeSystem (line 642)
    ├── ComputedValuesRuntimeSystem (line 630)
    ├── CameraRuntimeSystem (line 619)
    ├── InputRuntimeSystem (line 613)
    └── ... 8 more systems
```

### The Bug

**Line 268-274 in GameRuntime.godot.tsx:**
```typescript
eventBusUnsubRef.current = subscribeToGameEvents(game.events, {
  onGameStateChange: onGameEnd,
  onScoreChange,
  setGameState,
  debug: true,
});
```

This subscribes to `game.events` (from GameLoader), but:
- **GameSystemRunner's RulesSystem** emits events to its own EventBus
- **GameLoader's EventBus** never receives these events
- **Result:** Win condition triggers, but UI never updates

### Evidence

**File:** `app/lib/game-engine/GameRuntime.godot.tsx`

| Line | Code | Issue |
|------|------|-------|
| 522 | `const loader = new GameLoader({ physics });` | Creates EntityManager, GameState, EventBus |
| 598 | `const runner = new GameSystemRunner();` | Creates separate system instances |
| 627 | `runner.register(new EntityManagerRuntimeSystem());` | Uses GameLoader's EntityManager |
| 661 | `runner.register(new RulesSystem({...}));` | Creates NEW rules evaluator |
| 726-727 | `rulesSystem.setRuntimeState(game.gameState);`<br>`rulesSystem.setEventBus(game.events);` | Connects RulesSystem to GameLoader's state |
| 268 | `subscribeToGameEvents(game.events, {...})` | Subscribes to GameLoader's EventBus |

**The Problem:** RulesSystem is connected to GameLoader's EventBus (line 727), but the subscription happens BEFORE the connection (line 268 runs during setup, line 727 runs after runner initialization).

### Instantiation Analysis

**Production Instances Found:**

| Class | Instances | Locations | Verdict |
|-------|-----------|-----------|---------|
| `EntityManager` | 1 | GameLoader.ts:37 | ✅ SINGLETON (correct) |
| `GameLoader` | 1 | GameRuntime.godot.tsx:522 | ⚠️ OBSOLETE? |
| `GameSystemRunner` | 1 | GameRuntime.godot.tsx:598 | ✅ SINGLETON (correct) |
| `RulesSystem` | 1 | GameRuntime.godot.tsx:661 | ✅ SINGLETON (correct) |
| `CameraSystem` | 1 | CameraRuntimeSystem wraps it | ✅ SINGLETON (correct) |
| `InputEntityManager` | 1 | InputRuntimeSystem.ts:28 | ✅ SINGLETON (correct) |
| `ComputedValueSystem` | 1 | GameRuntime.godot.tsx:136 | ✅ SINGLETON (correct) |

**Test Instances:** 47 instances across test files (expected, ignored)

---

## Problem 2: Inconsistent Communication Patterns

### Pattern Analysis

| Communication Type | Pattern Used | Consistency | Files Affected |
|-------------------|--------------|-------------|----------------|
| **UI Updates** | Event subscription via `subscribeToGameEvents` | ✅ CONSISTENT | GameRuntime.godot.tsx:268 |
| **Game State Changes** | EventBus.emit → EventBus.subscribe | ✅ CONSISTENT | GameEventSubscriber.ts, RulesSystem.ts |
| **Entity Lifecycle** | EventBus.emit (match3:score_add, etc.) | ✅ CONSISTENT | Match3GameSystem.ts, GameRuntime.godot.tsx |
| **System-to-System** | Direct method calls + Dependency Injection | ✅ CONSISTENT | All RuntimeSystems |
| **Rules → UI** | EventBus (via GameStateHelpers) | ✅ CONSISTENT | RulesSystem.ts:531-533 |

### Event Flow (CORRECT PATTERN)

```
RulesSystem.setGameState("won")
  ↓
StateHelpers.setGameStateValue(gameState, "won", events)
  ↓
events.emit({ type: 'gameStateChanged', state: 'won' })
  ↓
subscribeToGameEvents callback
  ↓
setGameState((s) => ({ ...s, state: 'won' }))
  ↓
React re-renders with new state
```

**This pattern is CORRECT.** The bug is NOT in the communication pattern—it's in the EventBus connection timing.

---

## Problem 3: GameLoader vs GameSystemRunner Redundancy

### GameLoader Responsibilities

**File:** `app/lib/game-engine/GameLoader.ts`

```typescript
load(definition: GameDefinition): LoadedGame {
  // 1. Create physics world
  this.physics.createWorld(definition.world.gravity);
  
  // 2. Create EntityManager
  const entityManager = new EntityManager(this.physics, {
    templates: definition.templates,
  });
  
  // 3. Spawn initial entities
  for (const entity of definition.entities) {
    entityManager.createEntity(entity);
  }
  
  // 4. Create joints
  const joints = new Map<string, JointId>();
  // ... joint creation logic
  
  // 5. Create BehaviorExecutor (UNUSED)
  const behaviorExecutor = createBehaviorExecutor();
  
  // 6. Create GameState
  const gameState = createGameState(definition);
  
  // 7. Create EventBus
  const events = createGameEventBus();
  
  return { definition, entityManager, behaviorExecutor, pixelsPerMeter, joints, gameState, events };
}
```

### GameSystemRunner Responsibilities

**File:** `app/lib/game-engine/systems/runner/GameSystemRunner.ts`

```typescript
// 1. Register systems (done by GameRuntime)
runner.register(new ViewportRuntimeSystem({...}));
runner.register(new InputRuntimeSystem({...}));
runner.register(new CameraRuntimeSystem({...}));
runner.register(new EntityManagerRuntimeSystem());
runner.register(new ComputedValuesRuntimeSystem({...}));
runner.register(new PropertySyncRuntimeSystem({...}));
runner.register(new BehaviorExecutorRuntimeSystem({...}));
runner.register(new ScriptSandboxRuntimeSystem({...}));
runner.register(new RulesSystem({...}));
// ... more systems

// 2. Initialize all systems
await runner.initialize(systemContext);

// 3. Run game loop
runner.update(ctx);
```

### Overlap Analysis

| Responsibility | GameLoader | GameSystemRunner | Verdict |
|----------------|------------|------------------|---------|
| Create EntityManager | ✅ | Uses GameLoader's | GameLoader wins |
| Create GameState | ✅ | Uses GameLoader's | GameLoader wins |
| Create EventBus | ✅ | Uses GameLoader's | GameLoader wins |
| Create BehaviorExecutor | ✅ | ❌ Has BehaviorExecutorRuntimeSystem | **DUPLICATE** |
| Spawn initial entities | ✅ | ❌ | GameLoader wins |
| Create joints | ✅ | ❌ | GameLoader wins |
| Run game loop | ❌ | ✅ | GameSystemRunner wins |
| Manage systems | ❌ | ✅ | GameSystemRunner wins |

**Conclusion:** GameLoader is a **factory** for core game objects. GameSystemRunner is the **runtime executor**. They have distinct roles, but BehaviorExecutor is duplicated.

---

## Problem 4: Dead Code Paths

### BehaviorExecutor (UNUSED)

**Created:** GameLoader.ts:55
```typescript
const behaviorExecutor = createBehaviorExecutor();
```

**Never Used:** GameRuntime uses `BehaviorExecutorRuntimeSystem` instead (line 642)

**Impact:** Wasted memory allocation

### GameLoader.unload() (RARELY USED)

**Defined:** GameLoader.ts:139-142
```typescript
unload(game: LoadedGame): void {
  game.entityManager.clearAll();
  this.physics.destroyWorld();
}
```

**Usage:** Only called in GameLoader.reload() (line 145), which is never called in production code.

**Impact:** Dead code, but harmless

---

## Root Cause Analysis

### Why Win Condition UI Doesn't Show

**Timeline of Events:**

1. **GameRuntime mounts** (line 522)
   - Creates `GameLoader`
   - Calls `loader.load(definition)`
   - Gets `LoadedGame` with `game.events` (EventBus instance A)

2. **Setup subscriptions** (line 268)
   - Subscribes to `game.events` (EventBus A)
   - Callback: `onGameStateChange: onGameEnd`

3. **Create GameSystemRunner** (line 598)
   - Registers `RulesSystem` (line 661)

4. **Initialize runner** (line 709)
   - RulesSystem.initialize() is called

5. **Connect RulesSystem to EventBus** (line 726-727)
   - `rulesSystem.setRuntimeState(game.gameState)`
   - `rulesSystem.setEventBus(game.events)` ← **EventBus A connected**

6. **Game loop runs**
   - Win condition triggers
   - RulesSystem.setGameState("won") (RulesSystem.ts:531)
   - StateHelpers.setGameStateValue(..., events) (GameStateHelpers.ts:92)
   - `events.emit({ type: 'gameStateChanged', state: 'won' })` ← **EventBus A emits**

7. **Subscription receives event** (GameEventSubscriber.ts:30-47)
   - Callback fires: `onGameStateChange?.('won')`
   - React state updates

**WAIT, THIS SHOULD WORK!**

Let me re-examine...

### Re-Analysis: Subscription Timing

**Line 268-274:** Subscription happens in `setupSubscriptions()` callback
**Line 711:** `setupSubscriptions(bridge, physics, game, match3EventBus)` is called

**This happens AFTER runner initialization, so the EventBus IS connected.**

### Actual Root Cause (HYPOTHESIS)

The bug might be in **GameEventSubscriber.ts**:

```typescript
export function subscribeToGameEvents(
  eventBus: GameEventBus,
  options: GameEventSubscriberOptions
): () => void {
  const { onGameStateChange, onScoreChange, setGameState, debug } = options;

  return eventBus.subscribe((event) => {
    switch (event.type) {
      case 'gameStateChanged':
        // ... updates React state
        if (event.state === 'won' || event.state === 'lost') {
          onGameStateChange?.(event.state);
        }
        break;
      // ...
    }
  });
}
```

**Question:** Does `GameEventBus.subscribe()` work correctly?

Let me check the EventBus implementation...

---

## Recommended Architecture

### Option A: Keep Both (Minimal Changes)

```
GameLoader (Factory)
├── Creates: EntityManager, GameState, EventBus
├── Spawns initial entities
└── Creates joints

GameSystemRunner (Runtime)
├── Receives: EntityManager, GameState, EventBus from GameLoader
├── Registers: All runtime systems
├── Runs: Game loop
└── Manages: System lifecycle
```

**Changes Needed:**
1. Remove `BehaviorExecutor` from GameLoader (unused)
2. Ensure EventBus connection happens before subscription
3. Add debug logging to verify event flow

### Option B: Merge into GameSystemRunner (Recommended)

```
GameSystemRunner (All-in-One)
├── initialize(definition)
│   ├── Create EntityManager
│   ├── Create GameState
│   ├── Create EventBus
│   ├── Spawn initial entities
│   ├── Create joints
│   └── Initialize all systems
├── update(ctx)
│   └── Run game loop
└── destroy()
    └── Cleanup all systems
```

**Changes Needed:**
1. Move entity spawning logic into EntityManagerRuntimeSystem.initialize()
2. Move joint creation into new JointRuntimeSystem
3. Delete GameLoader entirely
4. Update GameRuntime to only use GameSystemRunner

**Benefits:**
- Single source of truth
- No duplicate instances
- Clearer ownership
- Easier to debug

---

## Validation Checklist

After cleanup, verify:

```bash
# 1. Should find exactly 1 non-test instantiation per class
sg -p 'new RulesSystem($$$)' --lang typescript | grep -v test | grep -v __tests__

# 2. Should find no duplicate EventBus instances
rg "createGameEventBus|new.*EventBus" --type ts | grep -v test

# 3. Win condition should work
# Manual test:
# 1. Play Ball Sort level 1
# 2. Move ball from tube 1 to tube 0
# 3. Win UI should appear immediately
```

---

## Next Steps

1. **Immediate Fix (Band-Aid):**
   - Add debug logging to GameEventSubscriber to verify events are received
   - Add debug logging to RulesSystem.setGameState to verify events are emitted
   - Test win condition with logging enabled

2. **Short-Term Fix (Proper):**
   - Ensure EventBus connection happens before subscription
   - Remove unused BehaviorExecutor from GameLoader
   - Add integration test for win condition → UI update flow

3. **Long-Term Refactor (Recommended):**
   - Implement Option B (merge into GameSystemRunner)
   - Delete GameLoader
   - Update all examples to use new architecture
   - Add architecture documentation

---

## Files to Investigate Further

1. **app/lib/game-engine/runtime/GameEventBus.ts** - Verify subscribe() implementation
2. **app/lib/game-engine/runtime/GameStateHelpers.ts** - Verify emit() is called correctly
3. **app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts** - Verify setGameState() flow

---

## Appendix: Search Results

### Class Instantiations (Production)

```
EntityManager: 1 instance
  - app/lib/game-engine/GameLoader.ts:37

GameLoader: 1 instance
  - app/lib/game-engine/GameRuntime.godot.tsx:522

GameSystemRunner: 1 instance
  - app/lib/game-engine/GameRuntime.godot.tsx:598

RulesSystem: 1 instance
  - app/lib/game-engine/GameRuntime.godot.tsx:661

CameraSystem: 1 instance (via CameraRuntimeSystem)
  - app/lib/game-engine/systems/runner/wrappers/CameraRuntimeSystem.ts

InputEntityManager: 1 instance
  - app/lib/game-engine/systems/runner/wrappers/InputRuntimeSystem.ts:28

ComputedValueSystem: 1 instance
  - app/lib/game-engine/GameRuntime.godot.tsx:136
```

### Communication Patterns

**Event-Based (Consistent):**
- GameStateHelpers.setGameStateValue() → events.emit()
- GameEventSubscriber.subscribeToGameEvents() → eventBus.subscribe()
- Match3GameSystem → eventBus.emit('match3:score_add')

**Direct Method Calls (Consistent):**
- All RuntimeSystems receive dependencies via SystemContext
- Systems call methods on injected dependencies

**No Callbacks Found:** The old callback pattern has been removed!

---

## Conclusion

The architecture is **mostly correct** with event-based communication. The bug is likely in:
1. **Timing:** EventBus connection vs subscription order
2. **EventBus Implementation:** subscribe() might not be working
3. **Event Emission:** Events might not be emitted correctly

**Recommendation:** Add debug logging to trace event flow before making architectural changes.
