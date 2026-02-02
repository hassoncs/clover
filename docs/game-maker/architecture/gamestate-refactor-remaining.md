# GameState Refactor - COMPLETED

## Overview

We migrated from `RulesEvaluator` owning its own state to using an external `GameState` object managed by `GameLoader`. This enables:
- Single source of truth for game state
- React UI updates via `GameEventBus`
- Cleaner separation of concerns

## Completed Work

1. ✅ Created `GameState` type in `app/lib/game-engine/runtime/types.ts`
2. ✅ Created `GameEventBus` in `app/lib/game-engine/runtime/GameEventBus.ts`
3. ✅ Created `GameStateHelpers` in `app/lib/game-engine/runtime/GameStateHelpers.ts`
4. ✅ Updated `GameLoader` to create `gameState` and `events`
5. ✅ Migrated `RulesEvaluator` to operate on external `GameState`
6. ✅ Updated `RulesRuntimeSystem` with `setRuntimeState()` and `setEventBus()` methods
7. ✅ Updated main `RulesEvaluator.test.ts`
8. ✅ Updated `GameRuntime.godot.tsx` to use new architecture
9. ✅ Fixed `testUtils.ts`, `ballSort.test.ts`, and `FrameDiagnosticsCollector.test.ts`

## Status

**All work complete.** All tests pass (345/345) and app type checks clean.

## Previous Remaining Work (NOW COMPLETE)

### 1. Fix `GameRuntime.godot.tsx` (HIGH PRIORITY)

**File:** `app/lib/game-engine/GameRuntime.godot.tsx`

This is the main integration point. It currently accesses `game.rulesEvaluator` which no longer exists on `LoadedGame`.

**Changes needed:**

| Line | Current Code | New Code |
|------|--------------|----------|
| 491 | `game.rulesEvaluator.addScore(points)` | `StateHelpers.addScore(game.gameState, points, game.events)` |
| 592-614 | `game.rulesEvaluator.setCallbacks({...})` | Subscribe to `game.events` (see pattern below) |
| 616 | `game.rulesEvaluator.getVariables()` | Read from `game.gameState.vars` (filter reserved) |
| 634 | `game.rulesEvaluator.start()` | `StateHelpers.setGameStateValue(game.gameState, 'playing', game.events)` |
| 938 | `game.rulesEvaluator.getGameStateValue()` | `StateHelpers.getGameStateValue(game.gameState)` |
| 974 | `game.rulesEvaluator.getFullState()` | Build from `game.gameState` using StateHelpers |
| 1462 | `gameRef.current?.rulesEvaluator.start()` | `StateHelpers.setGameStateValue(gameRef.current?.gameState, 'playing', gameRef.current?.events)` |
| 1493-1509 | Same as 592-616 | Same pattern |
| 1853 | `rulesEvaluator.pause()` | `StateHelpers.setGameStateValue(game.gameState, 'paused', game.events)` |
| 1866 | `rulesEvaluator.resume()` | `StateHelpers.setGameStateValue(game.gameState, 'playing', game.events)` |

**Event subscription pattern (replaces setCallbacks):**
```typescript
// Add import
import * as StateHelpers from './runtime/GameStateHelpers';

// In setup(), after game is loaded:
const unsubscribe = game.events.subscribe((event) => {
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
      if (event.state === 'won' || event.state === 'lost') {
        onGameEnd?.(event.state);
      }
      break;
    case 'varChanged':
      // Update variables in React state
      setGameState((s) => ({
        ...s,
        variables: { ...s.variables, [event.key]: event.value }
      }));
      break;
  }
});

// Store unsubscribe in a ref and call in cleanup
eventBusUnsubRef.current = unsubscribe;
```

**Wire up RulesRuntimeSystem with state:**
```typescript
// After getting rulesSystem from runner:
if (rulesSystem) {
  rulesSystem.setRuntimeState(game.gameState);
  rulesSystem.setEventBus(game.events);
}
```

### 2. Fix Test Utilities

**File:** `app/lib/game-engine/__tests__/testUtils.ts`

**Changes:**
- Line 72: Remove `evaluator.setInitialVariables()` - state is set via `createGameState()`
- Line 73: Replace `evaluator.setStateMachines()` with `evaluator.setStateMachineDefinitions()`
- Line 76: Remove `evaluator.setInitialLives()` - lives are set in game definition
- Line 79: Replace `evaluator.start()` with `StateHelpers.setGameStateValue(gameState, 'playing', events)`
- Line 82: Update `evaluator.update()` call signature to pass `gameState` and `events`

**New pattern:**
```typescript
import { createGameState } from '../runtime/GameStateHelpers';
import { createGameEventBus } from '../runtime/GameEventBus';
import * as StateHelpers from '../runtime/GameStateHelpers';

// Create state from definition
const gameState = createGameState(definition);
const events = createGameEventBus();

// Configure evaluator
evaluator.loadRules(rules);
evaluator.setStateMachineDefinitions(definition.stateMachines);

// Start game
StateHelpers.setGameStateValue(gameState, 'playing', events);

// Update with state
evaluator.update(dt, entityManager, collisions, input, inputEvents, physics, gameState, events, ...);
```

### 3. Fix Ball Sort Tests

**File:** `app/lib/test-games/games/ballSort/__tests__/ballSort.test.ts`

**Same pattern as testUtils.ts:**
- Line 97: Update `evaluator.update()` call signature
- Line 108: Remove `evaluator.setInitialVariables()`
- Line 109: Replace `evaluator.setStateMachines()` with `evaluator.setStateMachineDefinitions()`
- Line 110: Replace `evaluator.start()` with StateHelpers call

### 4. Fix Frame Diagnostics Test

**File:** `app/lib/game-engine/diagnostics/__tests__/FrameDiagnosticsCollector.test.ts`

**Line 132:** Fix `UpdateContext` mock - the `input.buttons` type is wrong. Should be:
```typescript
input: {
  keys: new Set<string>(),
  buttons: { left: false, right: false, up: false, down: false, jump: false, action: false },
}
```

### 5. Unrelated Error (API)

**File:** `api/src/ai/classifier.ts`

**Line 2:** `WinConditionType` doesn't exist - should be `WinCondition`. This is unrelated to the GameState refactor.

## Architecture Notes

### Key Types

```typescript
// runtime/types.ts
interface GameState {
  vars: Record<string, VarValue>;        // Includes score, lives, gameState, elapsed
  initialVars: Record<string, VarValue>;
  stateMachines: Record<string, StateMachineRuntimeState>;
  initialStateMachines: Record<string, StateMachineRuntimeState>;
  firedOnce: Set<string>;
  cooldowns: Map<string, number>;
  lists: Map<string, ListValue>;
  pendingEvents: Map<string, unknown>;
  changedVars: Set<string>;
}

interface GameEventBus {
  subscribe(handler: GameEventHandler): () => void;
  emit(event: GameEventType): void;
  flush(): void;
}

// GameLoader returns:
interface LoadedGame {
  definition: GameDefinition;
  entityManager: EntityManager;
  behaviorExecutor: BehaviorExecutor;
  pixelsPerMeter: number;
  joints: Map<string, JointId>;
  gameState: GameState;    // NEW
  events: GameEventBus;    // NEW
}
```

### RulesEvaluator.update() New Signature

```typescript
update(
  dt: number,
  entityManager: EntityManager,
  collisions: CollisionInfo[],
  input: InputState,
  inputEvents: InputEvents,
  physics: Physics2D,
  gameState: RuntimeGameState,     // NEW - required
  events: GameEventBus,            // NEW - required
  computedValues?: ComputedValueSystem,
  evalContext?: EvalContext,
  camera?: CameraSystem,
  setTimeScale?: (scale: number, duration?: number) => void,
  inputEntityManager?: InputEntityManager,
  playSound?: (soundId: string, volume?: number) => void,
  bridge?: GodotBridge,
): void
```

### Reserved Variables (RESERVED_VARS)

```typescript
const RESERVED_VARS = {
  SCORE: 'score',
  LIVES: 'lives',
  GAME_STATE: 'gameState',
  ELAPSED: 'elapsed',
} as const;
```

When reading "user variables" (for UI display), filter out these reserved keys from `gameState.vars`.

## Verification

After all changes, run:
```bash
cd app && npx tsc --noEmit
pnpm test
```

The type check should pass with 0 errors. Tests may need updates to pass.
