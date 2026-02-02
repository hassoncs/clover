# Game Engine Architecture Cleanup Audit

## Problem Statement

The game engine has grown organically with multiple overlapping systems for:
1. State management (multiple RulesEvaluator instances)
2. Inter-component communication (callbacks vs events)
3. Game loop execution (GameLoader vs GameSystemRunner)

This causes bugs like: win conditions triggering but UI not updating (callbacks set on wrong instance).

---

## Audit Checklist

### 1. Find Duplicate Class Instances

Search for classes instantiated in multiple places that should be singletons:

```bash
# AST-grep patterns to run:
sg -p 'new RulesEvaluator($$$)' --lang typescript
sg -p 'new EntityManager($$$)' --lang typescript  
sg -p 'new CameraSystem($$$)' --lang typescript
sg -p 'new InputEntityManager($$$)' --lang typescript
sg -p 'new ComputedValueSystem($$$)' --lang typescript
sg -p 'new GameLoader($$$)' --lang typescript
```

**Expected:** Each core class should have ONE instantiation point (excluding tests).

**Action:** For each duplicate, determine:
- Which instance is the "source of truth"?
- Can the other locations receive the instance via dependency injection?
- Or should we use a singleton pattern?

---

### 2. Map Communication Patterns

Find all inter-component communication mechanisms:

```bash
# Callbacks
rg "setCallbacks|onScoreChange|onLivesChange|onGameStateChange|onVariablesChange" --type ts

# Events  
rg "eventQueue\.emit|eventBus\.emit|triggerEvent|\.emit\(" --type ts

# Direct method calls between systems
rg "rulesEvaluator\.|entityManager\.|cameraSystem\." --type ts
```

**Expected:** ONE consistent pattern for each communication type:
- UI updates: Events OR Callbacks (not both)
- Game state changes: Events OR Callbacks (not both)
- System-to-system: Dependency injection OR Event bus (not both)

**Action:** 
1. Document current patterns in a table
2. Choose ONE pattern per use case
3. Migrate all usages to the chosen pattern

---

### 3. Identify Dead Code Paths

Find code that sets up systems but never uses them:

```bash
# Find where callbacks are SET
rg "\.setCallbacks\(" --type ts -A 10

# Find where those callbacks would be INVOKED  
rg "this\.onGameStateChange\?\." --type ts
rg "this\.onScoreChange\?\." --type ts

# Trace the instance - are we calling methods on the same instance?
```

**Red flags:**
- Callbacks set on instance A, but game logic runs on instance B
- Event listeners registered but events never emitted
- Systems initialized but never added to game loop

---

### 4. Audit GameRuntime.godot.tsx

This file is the main integration point and likely the messiest. Check:

```bash
# How many different systems are being orchestrated?
rg "game\." GameRuntime.godot.tsx | wc -l
rg "rulesSystem\." GameRuntime.godot.tsx | wc -l
rg "gameSystemRunnerRef" GameRuntime.godot.tsx | wc -l
```

**Questions to answer:**
1. Is GameLoader still needed, or has GameSystemRunner replaced it?
2. Are we using `game.rulesEvaluator` or `rulesSystem.getRulesEvaluator()`?
3. Why are there two places setting up callbacks (lines ~688 and ~1582)?

---

### 5. Standardize on Event-Based Communication

If moving to events (recommended for decoupling):

```typescript
// BEFORE: Callback pattern
rulesEvaluator.setCallbacks({
  onGameStateChange: (state) => setGameState(s => ({...s, state})),
});

// AFTER: Event pattern  
eventBus.on('game:state_changed', (state) => setGameState(s => ({...s, state})));
// In RulesEvaluator:
eventBus.emit('game:state_changed', newState);
```

**Migration steps:**
1. Add event emission alongside callbacks (both work)
2. Migrate consumers to event listeners
3. Remove callback infrastructure
4. Remove duplicate instances

---

## Specific Issues to Fix

### Issue 1: Win Condition UI Not Showing

**Root cause:** `game.rulesEvaluator.setCallbacks()` sets callbacks on GameLoader's instance, but `RulesRuntimeSystem` creates its own instance that actually runs the game.

**Fix options:**
A. Pass GameLoader's rulesEvaluator to RulesRuntimeSystem (DI)
B. Set callbacks on RulesRuntimeSystem's evaluator instead
C. Remove duplicate - use only ONE RulesEvaluator
D. Move to events - RulesEvaluator emits, GameRuntime listens

### Issue 2: Slot Machine Uses Wrong Evaluator

Lines 497-583 in GameRuntime call `game.rulesEvaluator.setVariable()` but the game loop uses `RulesRuntimeSystem`.

**Fix:** Route all variable access through ONE consistent path.

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GameRuntime (React)                      │
│  - Renders UI based on state                                │
│  - Subscribes to EventBus for state updates                 │
└─────────────────────────┬───────────────────────────────────┘
                          │ EventBus (game:state_changed, etc.)
┌─────────────────────────▼───────────────────────────────────┐
│                   GameSystemRunner                           │
│  - Owns ALL game systems (single instances)                 │
│  - Runs game loop                                           │
│  - Systems emit events, don't call callbacks                │
├─────────────────────────────────────────────────────────────┤
│  RulesRuntimeSystem (owns RulesEvaluator)                   │
│  EntityManagerSystem (owns EntityManager)                    │
│  CameraSystem, InputSystem, etc.                            │
└─────────────────────────────────────────────────────────────┘
```

**Key principles:**
1. ONE instance of each core class
2. GameSystemRunner owns all instances
3. Communication via EventBus (no callbacks)
4. GameRuntime is a passive consumer of events
5. Remove GameLoader if GameSystemRunner replaces it

---

## Validation

After cleanup, verify:

```bash
# Should find exactly 1 non-test instantiation per class
sg -p 'new RulesEvaluator($$$)' --lang typescript | grep -v test | grep -v __tests__

# Should find no callback patterns (if migrated to events)
rg "setCallbacks" --type ts | grep -v test

# Win condition should work
# 1. Play Ball Sort level 1
# 2. Move ball from tube 1 to tube 0
# 3. Win UI should appear
```
