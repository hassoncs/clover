# Game Engine Architecture Cleanup Audit Results

> **STATUS: COMPLETED** ✅
> **Completion Date**: 2026-02-02
> **Summary**: All phases of the architectural cleanup have been successfully implemented. The game engine now uses a unified `RulesSystem`, genericized variables for score/lives, and a clean event-based architecture. Dead code has been removed, and the `GameRuntime` has been significantly refactored for better maintainability.

**Audit Date**: 2026-02-02  
**Auditor**: Sisyphus (AI Agent)  
**Scope**: Inter-component communication, instance ownership, architectural cleanup

---

## Executive Summary

The game engine has **significant architectural debt** resulting from organic growth. The primary issues are:

1. **Duplicate RulesEvaluator instances** - causing win condition bugs
2. **Mixed communication patterns** - callbacks AND events used inconsistently
3. **Unclear ownership** - GameLoader vs GameSystemRunner responsibilities overlap
4. **No callback infrastructure** - old code assumes callbacks that don't exist

**Impact**: Bugs like "win conditions trigger but UI doesn't update" are symptoms of architectural confusion, not isolated logic errors.

**Recommendation**: **Migrate to event-based architecture** - simplest path to consistency.

---

## Current Architecture (Problematic)

```
┌─────────────────────────────────────────────────────────────────┐
│                    GameRuntime.godot.tsx                         │
│  - Renders UI based on React state                              │
│  - Subscribes to game.events (EventBus) for updates ✅          │
│  - Also tries to access game.rulesEvaluator (doesn't exist) ❌  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │ Creates both:
                  │
      ┌───────────┴──────────┐
      │                      │
┌─────▼──────────┐  ┌────────▼────────────────────────────────┐
│  GameLoader    │  │    GameSystemRunner                      │
│                │  │                                          │
│  Creates:      │  │  Orchestrates Systems:                  │
│  - EntityMgr ✅│  │  - EntityManagerRuntimeSystem (wraps ✅) │
│  - GameState ✅│  │  - RulesRuntimeSystem (creates new! ❌)  │
│  - EventBus ✅ │  │  - CameraSystem, InputSystem, etc.      │
│  - NO Rules ❌ │  │                                          │
└────────────────┘  └─────────────────────────────────────────┘
                              │
                              │
                    ┌─────────▼───────────────────┐
                    │  RulesRuntimeSystem          │
                    │  - new RulesEvaluator() ❌   │
                    │  - This is the ACTUAL source │
                    │  - GameRuntime can't access  │
                    └──────────────────────────────┘
```

**Problems**:
- ❌ **Duplicate ownership**: GameLoader doesn't create RulesEvaluator, but RulesRuntimeSystem does
- ❌ **Communication split**: EventBus exists but old code assumes callbacks
- ❌ **Unclear lifecycle**: When is GameLoader used vs GameSystemRunner?
- ❌ **Access violation**: GameRuntime tries `game.rulesEvaluator` which is undefined

---

## Ideal Architecture (Event-Based)

```
┌─────────────────────────────────────────────────────────────┐
│                     GameRuntime (React)                      │
│  - Renders UI based on state                                │
│  - Subscribes to EventBus ONLY (single source of truth)     │
│  - NO direct system access                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ EventBus (game:state_changed, etc.)
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   GameSystemRunner                           │
│  - Single Owner of ALL game systems                         │
│  - Runs game loop                                           │
│  - Systems emit events, NO callbacks                        │
├─────────────────────────────────────────────────────────────┤
│  Systems (all injected via SystemContext):                  │
│  - RulesRuntimeSystem (owns RulesEvaluator)                 │
│  - EntityManagerSystem (owns EntityManager)                 │
│  - CameraSystem, InputSystem, etc.                          │
│                                                             │
│  All systems receive dependencies via SystemContext DI      │
└─────────────────────────────────────────────────────────────┘
```

**Benefits**:
- ✅ **Single ownership**: One RulesEvaluator, one EntityManager
- ✅ **Consistent communication**: Events only (no callback confusion)
- ✅ **Clear lifecycle**: GameSystemRunner owns everything after initialization
- ✅ **Decoupled**: GameRuntime is a passive consumer, no direct system access
- ✅ **DRY**: Remove GameLoader duplication

---

## Detailed Findings

### 1. Duplicate Class Instances

#### RulesEvaluator (CRITICAL BUG)

**Instantiation Count**: 1 (non-test)

| Location | Line | Pattern | Status |
|----------|------|---------|--------|
| `RulesRuntimeSystem.ts` | 59 | `new RulesEvaluator(ctx.entityManager, this.config.containers)` | ✅ **SOURCE OF TRUTH** |
| `GameLoader.ts` | N/A | Does NOT create RulesEvaluator | ⚠️ Should it? |

**Test instances**: 3 (ballSort.test.ts, testUtils.ts, RulesEvaluator.test.ts) - OK

**Problem**: Old code assumes `game.rulesEvaluator` exists, but GameLoader never created one:
- GameRuntime slot machine logic (lines 497-583) calls `game.rulesEvaluator.setVariable()` - **UNDEFINED**
- Win condition callbacks set on wrong instance - **NULL**

**Root Cause**: LoadedGame interface doesn't include rulesEvaluator:
```typescript
// GameLoader.ts lines 11-19
export interface LoadedGame {
  definition: GameDefinition;
  entityManager: EntityManager;
  behaviorExecutor: BehaviorExecutor;
  pixelsPerMeter: number;
  joints: Map<string, JointId>;
  gameState: GameState;
  events: GameEventBus;
  // rulesEvaluator: RulesEvaluator; ← MISSING!
}
```

#### EntityManager (CORRECT)

**Instantiation Count**: 1 (non-test)

| Location | Line | Pattern | Status |
|----------|------|---------|--------|
| `GameLoader.ts` | 37 | `new EntityManager(this.physics, {...})` | ✅ **SOURCE OF TRUTH** |
| `EntityManagerRuntimeSystem.ts` | 22 | Receives via `ctx.entityManager` | ✅ DI pattern |

**Verdict**: ✅ Properly implemented - single instance, injected to all systems

#### Other Systems (CORRECT)

| System | Instantiation | Status |
|--------|---------------|--------|
| `CameraSystem` | Factory method `CameraSystem.fromGameConfig()` | ✅ Single instance |
| `InputEntityManager` | `new InputEntityManager()` line 28 | ✅ Single instance |
| `ComputedValueSystem` | `createComputedValueSystem()` or injected | ✅ Single instance |
| `GameSystemRunner` | `new GameSystemRunner()` | ✅ Single instance (test only) |

---

### 2. Communication Patterns Analysis

#### Current Patterns Found

**Pattern 1: EventBus (Correct Pattern)**

| Location | Usage | Status |
|----------|-------|--------|
| `GameEventBus.ts` | `emit()`, `subscribe()` | ✅ Implemented |
| `GameRuntime.godot.tsx` lines 596-623 | Subscribes to events: `scoreChanged`, `livesChanged`, `gameStateChanged`, `varChanged` | ✅ WORKS |
| `GameStateHelpers.ts` | Emits events on state changes | ✅ Consistent |
| `RulesEvaluator.ts` | Uses StateHelpers which emit events | ✅ Integrated |

**Pattern 2: Callbacks (Deprecated/Broken)**

| Location | Usage | Status |
|----------|-------|--------|
| `Match3GameSystem.ts` lines 91-93 | `callbacks: Match3Callbacks` | ⚠️ Game-specific |
| `RulesEvaluator.ts` | **NO CALLBACK INFRASTRUCTURE** | ❌ None |
| `GameRuntime.godot.tsx` old references | Assumes `game.rulesEvaluator.setCallbacks()` | ❌ **BROKEN** |

**Pattern 3: Direct Method Calls (Anti-Pattern)**

| Location | Usage | Status |
|----------|-------|--------|
| GameRuntime slot machine | `game.rulesEvaluator.setVariable()` | ❌ **UNDEFINED** |
| System-to-system | `ctx.entityManager.getEntity()` | ✅ OK via DI |

#### Communication Matrix

| Source | Target | Current Method | Should Be |
|--------|--------|----------------|-----------|
| RulesEvaluator | GameRuntime | Events ✅ | Events ✅ |
| GameRuntime | RulesEvaluator | Direct call ❌ | Events ✅ |
| Match3System | GameRuntime | Callbacks ⚠️ | Events ✅ |
| System A | System B | DI + method calls ✅ | Keep ✅ |

**Recommendation**: 
- ✅ **Keep**: EventBus for state updates (already works)
- ❌ **Remove**: All callback infrastructure (partially broken)
- ✅ **Keep**: DI for system-to-system communication
- ✅ **Add**: Events for GameRuntime → Systems communication (replace direct calls)

---

### 3. Dead Code Paths

#### Broken Access Patterns

**Slot Machine Logic** (GameRuntime.godot.tsx lines 497-583):
```typescript
// ❌ BROKEN: game.rulesEvaluator doesn't exist
game.rulesEvaluator.setVariable('slotValue', result);
```

**Fix**: Access via `rulesSystem.getRulesEvaluator()` or emit event

**Callback Setup** (GameRuntime.godot.tsx ~lines 688, 1582):
```typescript
// ❌ BROKEN: setCallbacks doesn't exist on RulesEvaluator
game.rulesEvaluator.setCallbacks({
  onGameStateChange: (state) => setGameState(s => ({...s, state})),
});
```

**Fix**: Already using EventBus - remove these dead attempts

---

### 4. GameRuntime.godot.tsx Audit

**File**: `/Users/hassoncs/Workspaces/Personal/slopcade/app/lib/game-engine/GameRuntime.godot.tsx`

#### System Instances Referenced

| Variable | Type | Lines | Purpose | Status |
|----------|------|-------|---------|--------|
| `gameRef.current` | `LoadedGame` | 146 | GameLoader's output | ✅ Used |
| `loaderRef.current` | `GameLoader` | 147 | Loader instance | ✅ Used |
| `gameSystemRunnerRef.current` | `GameSystemRunner` | 194 | System orchestrator | ✅ Used |
| `rulesSystem` | `RulesRuntimeSystem` | 805 | Rules logic | ✅ Correct access |
| `game.entityManager` | `EntityManager` | Various | Entity queries | ✅ Works |
| `game.gameState` | `GameState` | Various | State mutations | ✅ Works |
| `game.events` | `GameEventBus` | 596 | Event subscriptions | ✅ Works |
| `game.rulesEvaluator` | N/A | ❌ | **DOES NOT EXIST** | ❌ **BROKEN** |

#### Event Subscriptions

**Primary Subscription** (Lines 596-623):
```typescript
eventBusUnsubRef.current = game.events.subscribe((event) => {
  switch (event.type) {
    case 'scoreChanged':
      setGameState((s) => ({ ...s, score: event.score }));
      onScoreChange?.(event.score);
      break;
    case 'livesChanged':
      setGameState((s) => ({ ...s, lives: event.lives }));
      break;
    case 'gameStateChanged':
      setGameState((s) => ({ ...s, state: event.state }));
      if (event.state === "won" || event.state === "lost") {
        onGameEnd?.(event.state);
      }
      break;
    case 'varChanged':
      setGameState((s) => ({
        ...s,
        variables: { ...s.variables, [event.key]: event.value }
      }));
      break;
  }
});
```

**Status**: ✅ **WORKS PERFECTLY** - This is the correct pattern

**Restart Subscription** (Lines 1498-1520):
Similar pattern after restart - ✅ Consistent

#### Win Condition Flow

1. **Trigger**: `RulesEvaluator.update()` checks win condition (lines 381-384)
2. **Mutation**: Calls `this.setGameState("won")` (line 382)
3. **Helper**: `StateHelpers.setGameStateValue(state, 'won', events)` (line 136-140)
4. **Event Emission**: `events.emit({ type: 'gameStateChanged', state: 'won' })` (line 103)
5. **React Update**: GameRuntime's subscription receives event (line 607)
6. **UI Update**: `setGameState((s) => ({ ...s, state: 'won' }))` (line 608)
7. **Callback**: `onGameEnd?.('won')` (line 612)
8. **Render**: UI shows win overlay (lines 1919-1937)

**Status**: ✅ **WORKS** - Event-based flow is correct

**Why Win Bug Happens**: If old code tried to use `game.rulesEvaluator.setCallbacks()`, it would throw because:
- `game.rulesEvaluator` is `undefined`
- `RulesEvaluator` has no `setCallbacks()` method anyway

---

### 5. Specific Bug Analysis

#### Bug: Win Condition UI Not Showing

**Reported Symptom**: Win conditions trigger but UI doesn't update

**Root Cause Analysis**:

The bug description says:
> "game.rulesEvaluator.setCallbacks() sets callbacks on GameLoader's instance, but RulesRuntimeSystem creates its own instance"

**Actual Truth**:
1. GameLoader **NEVER** created a RulesEvaluator
2. `game.rulesEvaluator` is **undefined** (LoadedGame interface doesn't include it)
3. Attempting `game.rulesEvaluator.setCallbacks()` would throw TypeError
4. RulesEvaluator class has **NO callback infrastructure** (no `setCallbacks()` method exists)

**Why It Actually Works**:
- Win conditions **DO** work via EventBus (lines 596-623)
- The bug report may be from an **old codebase version** before EventBus migration
- Current code (as of this audit) uses events correctly

**Potential Remaining Issues**:
- Slot machine logic (lines 497-583) **may be broken** if it tries `game.rulesEvaluator.setVariable()`
- Any code path assuming `game.rulesEvaluator` exists will fail

---

## Architectural Debt Analysis

### Issue #1: GameLoader Relevance

**Question**: Is GameLoader still needed?

**Current Responsibilities**:
- Creates `EntityManager` ✅
- Creates `GameState` ✅
- Creates `GameEventBus` ✅
- Creates `BehaviorExecutor` ✅
- Spawns initial entities ✅
- Creates joints ✅

**Could GameSystemRunner do this?**
- YES - These could be initialization steps in GameSystemRunner
- BUT - Current separation is clean: GameLoader = "load phase", GameSystemRunner = "run phase"

**Recommendation**: **Keep GameLoader** - it's a good separation of concerns. Loading game definition → running game loop are distinct phases.

### Issue #2: LoadedGame Interface Incomplete

**Problem**: `LoadedGame` doesn't include RulesEvaluator, but code assumes `game.rulesEvaluator`

**Options**:
1. Add `rulesEvaluator: RulesEvaluator` to LoadedGame - but then GameLoader must create it
2. Remove all `game.rulesEvaluator` references - use `rulesSystem.getRulesEvaluator()`
3. Don't expose RulesEvaluator at all - use events only

**Recommendation**: **Option 3** - Events only. GameRuntime should never directly call RulesEvaluator methods.

### Issue #3: System Context Dependency Injection

**Current**: Systems receive dependencies via `SystemContext`:
```typescript
interface SystemContext {
  bridge: GodotBridge;
  physics: Physics2D;
  entityManager: EntityManager;
  eventBus: EventBus;
  eventQueue: EventQueue;
}
```

**Problem**: RulesEvaluator is NOT in SystemContext, so it can't be injected

**Fix**: Either:
1. Add `rulesEvaluator` to SystemContext (but circular dependencies?)
2. Systems that need it call `runner.getSystem<RulesRuntimeSystem>('rules').getRulesEvaluator()`
3. Don't expose RulesEvaluator - use events/commands

**Recommendation**: **Option 3** - Command pattern via EventQueue

---

## Clean Code Principles Violations

### Single Responsibility Principle (SRP)

| Class | Responsibilities | Violation? |
|-------|------------------|------------|
| `GameRuntime.godot.tsx` | React rendering + game loop management + input handling + system orchestration | ⚠️ **TOO MANY** |
| `RulesEvaluator` | Rules, win/lose conditions, variable management, state machines, actions | ⚠️ **BORDERLINE** |
| `GameLoader` | Load entities, joints, create managers | ✅ Focused |
| `GameSystemRunner` | Orchestrate systems, run phases | ✅ Focused |

**Recommendation**: 
- Split GameRuntime into: `GameLoopController` + `GameRenderer` components
- Consider splitting RulesEvaluator into: `RulesEngine` + `GameStateManager`

### Don't Repeat Yourself (DRY)

**Violations**:
1. **Event subscription** duplicated at lines 596-623 and 1498-1520
   - Fix: Extract to `subscribeToGameEvents(events, callbacks)` helper
2. **Initial variables** logic duplicated at lines 626-646 and 1522-1534
   - Fix: Extract to `getInitialVariables(gameState)` helper
3. **StateHelpers + EventBus** pattern repeated across files
   - Fix: Already good - helpers abstract the pattern

### Dependency Inversion Principle (DIP)

**Current**: 
- ✅ Systems depend on interfaces (`SystemContext`, `UpdateContext`)
- ❌ GameRuntime depends on concrete classes (`GameLoader`, `GameSystemRunner`)

**Recommendation**: 
- Define `IGameLoader` and `IGameSystemRunner` interfaces
- Use interfaces in GameRuntime (enables testing/mocking)

### Open/Closed Principle (OCP)

**Violations**:
- GameRuntime switch statement (lines 597-622) must be modified to add new event types
- Fix: Event handler registry pattern

### Interface Segregation Principle (ISP)

**Violations**:
- `SystemContext` provides `bridge`, `physics`, `entityManager` to ALL systems
- Not all systems need all dependencies
- Fix: System-specific context interfaces (e.g., `PhysicsSystemContext`, `RenderSystemContext`)

---

## Cleanup Opportunities

### High Priority (Bugs)

1. **Remove `game.rulesEvaluator` references**
   - Search: `game\.rulesEvaluator`
   - Replace with: `rulesSystem.getRulesEvaluator()` OR remove (use events)
   - Files: GameRuntime.godot.tsx lines 497-583 (slot machine)

2. **Remove callback infrastructure attempts**
   - Search: `setCallbacks`
   - Remove: All references (method doesn't exist)
   - Use: EventBus instead

3. **Fix slot machine logic**
   - Current: `game.rulesEvaluator.setVariable()` → undefined
   - Fix: Emit event or access via `rulesSystem.getRulesEvaluator()`

### Medium Priority (Architecture)

4. **Standardize on EventBus**
   - Remove: Match3 callback pattern
   - Migrate: All callbacks to events
   - Document: Event types in central location

5. **Extract event subscription helper**
   - Create: `subscribeToGameEvents(eventBus, handlers)`
   - Replace: Duplicated subscription code

6. **Add RulesEvaluator to LoadedGame OR remove access**
   - Option A: `loadedGame.rulesEvaluator = rulesSystem.getRulesEvaluator()`
   - Option B: Remove all direct access, use events only

### Low Priority (Refactoring)

7. **Split GameRuntime responsibilities**
   - Extract: `GameLoopController` for loop management
   - Extract: `GameRenderer` for React rendering
   - Keep: GameRuntime as coordinator

8. **Interface Segregation**
   - Define: `IGameLoader`, `IGameSystemRunner`
   - Define: System-specific contexts
   - Reduce: Unnecessary dependencies

9. **Event Handler Registry**
   - Replace: Switch statements with handler map
   - Enable: Dynamic event handler registration
   - Pattern: `eventHandlers.register('scoreChanged', handleScoreChange)`

---

## Migration Plan: Unified Event Architecture

### Phase 1: Audit & Document (DONE ✅)

- [x] Identify all communication patterns
- [x] Map instance ownership
- [x] Document current vs ideal architecture
- [x] Identify broken code paths

### Phase 2: Fix Critical Bugs

**Step 1**: Remove broken `game.rulesEvaluator` references
```bash
# Find all references
rg "game\.rulesEvaluator" --type ts --type tsx

# Replace with rulesSystem access or remove
```

**Step 2**: Fix slot machine logic
```typescript
// BEFORE (broken):
game.rulesEvaluator.setVariable('slotValue', result);

// AFTER (option 1 - direct access):
const rulesSystem = runner.getSystem<RulesRuntimeSystem>('rules');
rulesSystem?.getRulesEvaluator()?.setVariable('slotValue', result);

// AFTER (option 2 - event):
game.events.emit({ type: 'varChanged', key: 'slotValue', value: result });
```

**Step 3**: Verify win conditions work
```bash
# Test Ball Sort level 1
# Move ball from tube 1 to tube 0
# Verify win UI appears
```

### Phase 3: Migrate Callbacks to Events

**Step 1**: Remove Match3 callbacks
```typescript
// BEFORE:
const match3System = new Match3GameSystem(config, entityManager, {
  onScoreAdd: (points) => StateHelpers.addScore(game.gameState, points, game.events),
});

// AFTER:
const match3System = new Match3GameSystem(config, entityManager);
// Match3System emits events internally
```

**Step 2**: Update Match3GameSystem
```typescript
// Add to Match3GameSystem:
private eventBus: GameEventBus;

// Emit instead of callback:
this.eventBus.emit({ type: 'scoreChanged', score: newScore });
```

### Phase 4: Refactor GameRuntime

**Step 1**: Extract event subscription helper
```typescript
// New file: GameEventSubscriber.ts
export function subscribeToGameEvents(
  eventBus: GameEventBus,
  handlers: {
    onScoreChange?: (score: number) => void;
    onLivesChange?: (lives: number) => void;
    onGameStateChange?: (state: GameStateValue) => void;
    onVarChange?: (key: string, value: VarValue) => void;
  }
): () => void {
  return eventBus.subscribe((event) => {
    switch (event.type) {
      case 'scoreChanged':
        handlers.onScoreChange?.(event.score);
        break;
      case 'livesChanged':
        handlers.onLivesChange?.(event.lives);
        break;
      case 'gameStateChanged':
        handlers.onGameStateChange?.(event.state);
        break;
      case 'varChanged':
        handlers.onVarChange?.(event.key, event.value);
        break;
    }
  });
}

// Usage in GameRuntime:
const unsub = subscribeToGameEvents(game.events, {
  onScoreChange: (score) => {
    setGameState((s) => ({ ...s, score }));
    onScoreChange?.(score);
  },
  onGameStateChange: (state) => {
    setGameState((s) => ({ ...s, state }));
    if (state === 'won' || state === 'lost') {
      onGameEnd?.(state);
    }
  },
  // ... etc
});
```

### Phase 5: Validation

**Tests**:
1. All existing tests pass
2. Win conditions trigger UI updates
3. Score changes update UI
4. Slot machine logic works
5. Match3 game works
6. No `undefined` errors in console

**AST Grep Validation**:
```bash
# Should find 0 results after cleanup:
sg -p 'game.rulesEvaluator' --lang typescript
sg -p 'setCallbacks' --lang typescript

# Should find only correct patterns:
sg -p 'events.subscribe' --lang typescript  # ✅ Good
sg -p 'events.emit' --lang typescript       # ✅ Good
```

---

## Recommended Final Architecture

### System Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                    GameRuntime (React)                         │
│  Responsibilities:                                            │
│  - Render UI based on React state                            │
│  - Subscribe to EventBus for state updates                   │
│  - Send commands via EventBus (not direct calls)             │
│  - Manage lifecycle (start, pause, restart)                  │
└────────────┬──────────────────────────────────────────────────┘
             │
             │ Commands (via EventBus)        Updates (via EventBus)
             │ game:start, game:pause         score, lives, state
             │
┌────────────▼──────────────────────────────────────────────────┐
│                  GameSystemRunner                              │
│  Responsibilities:                                            │
│  - Own ALL systems (single source of truth)                  │
│  - Run game loop (update all systems each frame)             │
│  - Manage system lifecycle (init, update, destroy)           │
│  - Route events between systems via EventQueue               │
├───────────────────────────────────────────────────────────────┤
│  System Registry (all receive SystemContext via DI):         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ RulesRuntimeSystem                                  │    │
│  │ - Owns: RulesEvaluator                              │    │
│  │ - Emits: gameStateChanged, scoreChanged, etc.       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ EntityManagerRuntimeSystem                          │    │
│  │ - Owns: EntityManager                               │    │
│  │ - Emits: entitySpawned, entityDestroyed             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ CameraRuntimeSystem, InputRuntimeSystem, etc.       │    │
│  │ - Own their respective subsystems                   │    │
│  │ - Communicate via EventBus                          │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                    Shared Infrastructure                       │
│  - GameEventBus: Pub/sub for state updates to React          │
│  - EventQueue: System-to-system events within runner         │
│  - GameState: Mutable bag of game variables                  │
│  - SystemContext: DI container for shared dependencies       │
└───────────────────────────────────────────────────────────────┘
```

### Communication Rules

| From | To | Method | Example |
|------|----|----|---------|
| React UI | Systems | **EventBus commands** | `events.emit({ type: 'game:start' })` |
| Systems | React UI | **EventBus updates** | `events.emit({ type: 'scoreChanged', score: 100 })` |
| System A | System B | **EventQueue** | `eventQueue.emit('physics:collision', data)` |
| System | Dependency | **DI + methods** | `ctx.entityManager.getEntity(id)` |

**NO**:
- ❌ Direct system access from GameRuntime
- ❌ Callbacks (use events)
- ❌ Shared mutable state (use events or DI)

### GameLoader's Role

**Keep GameLoader** for initialization phase:

```typescript
// Phase 1: Load (GameLoader)
const game = loader.load(definition);
// Returns: EntityManager, GameState, EventBus, etc.

// Phase 2: Setup (GameSystemRunner)
runner.register(new RulesRuntimeSystem({ ... }));
runner.register(new EntityManagerRuntimeSystem());
await runner.initialize({
  bridge,
  physics,
  entityManager: game.entityManager,  // ← Injected from GameLoader
  eventBus: game.events,              // ← Injected from GameLoader
  eventQueue: runner.eventQueue,
});

// Phase 3: Run (GameSystemRunner)
setInterval(() => runner.update(ctx), 16);
```

**Responsibilities**:
- GameLoader: Create initial state, entities, managers
- GameSystemRunner: Orchestrate runtime execution
- Clear separation: Load vs Run phases

---

## Success Criteria

### After Cleanup

1. ✅ **Zero callback references** - all communication via events
2. ✅ **Single RulesEvaluator** - owned by RulesRuntimeSystem
3. ✅ **Single EntityManager** - owned by GameLoader, injected to systems
4. ✅ **Event-based UI updates** - no direct system access from GameRuntime
5. ✅ **Win conditions work** - events flow correctly to UI
6. ✅ **Slot machine works** - accesses RulesEvaluator correctly
7. ✅ **No undefined errors** - all system references valid

### Code Quality

1. ✅ **SRP**: Each class has single responsibility
2. ✅ **DRY**: No duplicated logic
3. ✅ **DIP**: Depend on interfaces, not concrete classes
4. ✅ **OCP**: Add new features without modifying existing code
5. ✅ **ISP**: Systems receive only dependencies they need

### Maintainability

1. ✅ **Clear ownership** - each instance has single owner
2. ✅ **Consistent patterns** - events for state, DI for dependencies
3. ✅ **Easy to extend** - register new systems without modifying runner
4. ✅ **Easy to test** - mock dependencies via interfaces
5. ✅ **Easy to debug** - single communication mechanism

---

## Next Steps

1. **Review this document** - validate findings with team
2. **Prioritize fixes** - critical bugs → architecture → refactoring
3. **Create tasks** - break down migration plan into PRs
4. **Execute Phase 2** - fix critical bugs first
5. **Test thoroughly** - ensure win conditions, score, etc. work
6. **Execute Phase 3-4** - migrate to events, refactor GameRuntime
7. **Validate** - run AST grep checks, verify zero violations
8. **Document** - update architecture docs with new patterns

---

## Appendix: Command Reference

### Find Duplicate Instantiations
```bash
sg -p 'new RulesEvaluator($$$)' --lang typescript
sg -p 'new EntityManager($$$)' --lang typescript
sg -p 'new GameSystemRunner($$$)' --lang typescript
```

### Find Communication Patterns
```bash
rg "setCallbacks|onStateChange|onChange" --type ts
rg "eventQueue\.emit|eventBus\.emit|\.emit\(" --type ts
rg "\.subscribe\(" --type ts
```

### Find Problematic References
```bash
rg "game\.rulesEvaluator" --type ts --type tsx
ast-grep --pattern "game.rulesEvaluator" --lang typescript
```

### Validate Cleanup
```bash
# After cleanup, these should return 0 results:
sg -p 'game.rulesEvaluator' --lang typescript
rg "setCallbacks" --type ts

# These should have results (correct patterns):
rg "events\.emit" --type ts
rg "events\.subscribe" --type ts
```

---

## Related Documents

- **[Rules Architecture Simplification](./RULES-ARCHITECTURE-SIMPLIFICATION.md)** - Analysis of merging RulesRuntimeSystem + RulesEvaluator
- **[Appendix: Genericize Special Variables](./APPENDIX-GENERICIZE-SPECIAL-VARIABLES.md)** - Complete guide to removing score/lives special treatment

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-02  
**Status**: ✅ Ready for Review
