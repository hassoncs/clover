# Game State Architecture Migration Plan

## Overview

Migrating from scattered state ownership to a clean single-source-of-truth architecture.

---

## CURRENT STATE (What We Have)

### State Ownership - MESSY

```
┌─────────────────────────────────────────────────────────────────┐
│ RulesEvaluator (app/lib/game-engine/RulesEvaluator.ts)          │
│ OWNS: score, lives, gameState, variables, stateMachines,        │
│       cooldowns, lists, pendingEvents, elapsed                  │
│ PROBLEM: It's both data owner AND processor                     │
└─────────────────────────────────────────────────────────────────┘
                              +
┌─────────────────────────────────────────────────────────────────┐
│ EntityManager (app/lib/game-engine/EntityManager.ts)            │
│ OWNS: entity lifecycle, transforms, physics bodies              │
│ PROBLEM: Separate source of truth from game variables           │
└─────────────────────────────────────────────────────────────────┘
                              +
┌─────────────────────────────────────────────────────────────────┐
│ CameraSystem, ContainerSystem, etc.                             │
│ EACH owns its own state slice                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Current Type Definitions

| Type | Location | Purpose |
|------|----------|---------|
| `GameDefinition` | `packages/shared/src/types/GameDefinition.ts` | JSON config (immutable) |
| `LoadedGame` | `app/lib/game-engine/GameLoader.ts` | Runtime instance |
| `GameState` | `app/lib/game-engine/BehaviorContext.ts` | Snapshot for systems |
| `IGameStateMutator` | `app/lib/game-engine/rules/types.ts` | Mutation interface |
| `SystemContext` | `app/lib/game-engine/systems/runner/types.ts` | Stable services |
| `UpdateContext` | `app/lib/game-engine/systems/runner/types.ts` | Per-frame data |

### Current RulesEvaluator Fields (to migrate)

```typescript
// SPECIAL-CASED (should be variables)
private gameState: 'ready' | 'playing' | 'paused' | 'won' | 'lost' = "ready";
private score = 0;
private lives = 3;
private elapsed = 0;

// MUTABLE STATE (correct)
private variables = new Map<string, number | string | boolean>();
private smStates: Record<string, { current: string; enteredAt: number }> | null = null;
private cooldowns = new Map<string, number>();
private firedOnce = new Set<string>();
private lists = new Map<string, ListValue>();
private pendingEvents = new Map<string, unknown>();

// IMMUTABLE CONFIG (shouldn't be here)
private rules: GameRule[] = [];
private winCondition: WinCondition | undefined;
private loseCondition: LoseCondition | undefined;
private initialLives = 3;
private initialVariables: Record<string, number | string | boolean> = {};
private stateMachineDefinitions: StateMachineDefinition[] = [];
private containers?: ContainerConfig[];
```

---

## TARGET STATE (What We Want)

### Single Source of Truth

```
┌─────────────────────────────────────────────────────────────────┐
│                        GameRuntime                               │
│  The SINGLE owner - created by GameLoader                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  def: GameDefinition (IMMUTABLE - loaded from JSON)             │
│  ├── rules, winCondition, loseCondition                         │
│  ├── stateMachineDefinitions                                     │
│  ├── templates, containers, initialVariables                     │
│  └── world, camera, etc.                                         │
│                                                                  │
│  state: GameState (MUTABLE - the one "bag of state")            │
│  ├── vars: { score, lives, gameState, elapsed, ...custom }      │
│  ├── stateMachines: { [id]: { current, enteredAt } }            │
│  ├── cooldowns: Map<string, number>                              │
│  ├── firedOnce: Set<string>                                      │
│  ├── lists: Map<string, ListValue>                               │
│  └── pendingEvents: Map<string, unknown>                         │
│                                                                  │
│  entities: EntityState (entity transforms, components)           │
│  │   └── Replaces EntityManager internal state                   │
│                                                                  │
│  services: { bridge, physics, audio }                            │
│  events: GameEventBus (for React UI updates)                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Systems are STATELESS
                    They receive (def, state) and operate on it
```

### New Type Definitions

```typescript
// app/lib/game-engine/runtime/types.ts

type VarValue = number | string | boolean;

interface GameState {
  // All "special" fields become regular variables
  vars: Record<string, VarValue>;
  // Reserved keys: 'score', 'lives', 'gameState', 'elapsed'
  
  // State machine runtime state
  stateMachines: Record<string, { current: string; enteredAt: number }>;
  
  // Rule execution state  
  cooldowns: Map<string, number>;
  firedOnce: Set<string>;
  
  // List state
  lists: Map<string, ListValue>;
  
  // Event queue
  pendingEvents: Map<string, unknown>;
  
  // Change tracking for React
  changedVars: Set<string>;
}

interface GameRuntime {
  readonly def: Readonly<GameDefinition>;
  state: GameState;
  entities: EntityState;
  services: GameServices;
  events: GameEventBus;
}

interface GameServices {
  bridge: GodotBridge;
  physics: Physics2D;
  audio?: AudioSystem;
}
```

---

## FILES TO DELETE/MODIFY

### DELETE (after migration complete)

| File | Reason |
|------|--------|
| `RulesEvaluator.ts` state fields | Moved to `GameState` |
| `LoadedGame.rulesEvaluator` | Already removed |
| Duplicate callback setups in GameRuntime.godot.tsx | Consolidated |

### HEAVILY MODIFY

| File | Changes |
|------|---------|
| `RulesEvaluator.ts` | Remove state ownership, become stateless processor |
| `GameLoader.ts` | Create `GameRuntime` instead of `LoadedGame` |
| `RulesRuntimeSystem.ts` | Operate on `GameState`, not own `RulesEvaluator` |
| `GameRuntime.godot.tsx` | Use `GameRuntime` pattern |
| `GameSystemRunner.ts` | Pass `(def, state)` context to systems |

### UPDATE IMPORTS

| File | Current | New |
|------|---------|-----|
| `GameScriptAPI.ts` | `runtime.rulesEvaluator.*` | `runtime.state.vars.*` |
| `useGameInput.ts` | `gameRef.current.entityManager` | `gameRef.current.entities` |
| `ScriptSandboxRuntimeSystem.ts` | Adapter to rulesEvaluator | Adapter to state |
| All tests | `new RulesEvaluator(...)` | Use `createGameState()` |

---

## MIGRATION PATH (Incremental Steps)

### Phase 1: Create New Types (no breaking changes)
1. Create `app/lib/game-engine/runtime/types.ts` - new type definitions
2. Create `app/lib/game-engine/runtime/GameState.ts` - state creation helpers
3. Create `app/lib/game-engine/runtime/GameEventBus.ts` - event system
4. Add minimal tests to verify

### Phase 2: Create GameRuntime
1. Create `app/lib/game-engine/runtime/GameRuntime.ts`
2. Update `GameLoader` to create `GameRuntime` (keep `LoadedGame` as alias)
3. Test GameRuntime creation

### Phase 3: Migrate RulesEvaluator
1. Add `state: GameState` parameter to RulesEvaluator constructor
2. Remove internal state fields, use `state.*` instead
3. Update `RulesRuntimeSystem` to pass state
4. Update tests

### Phase 4: Update Systems
1. Update `SystemContext` to include `GameRuntime`
2. Update `UpdateContext` to pass full state
3. Migrate each system to use new context
4. Update `GameRuntime.godot.tsx`

### Phase 5: Cleanup
1. Delete old unused types
2. Remove `LoadedGame` if fully replaced
3. Clean up duplicate code paths
4. Update all imports

---

## RESERVED VARIABLE KEYS

These "special" fields become regular variables with reserved keys:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `score` | number | 0 | Player score |
| `lives` | number | 3 | Remaining lives |
| `gameState` | string | 'ready' | 'ready'/'playing'/'paused'/'won'/'lost' |
| `elapsed` | number | 0 | Total play time in seconds |

Helper functions:
```typescript
const Vars = {
  getScore: (s: GameState) => (s.vars.score as number) ?? 0,
  setScore: (s: GameState, v: number) => { s.vars.score = v; s.changedVars.add('score'); },
  // etc.
};
```

---

## TESTING STRATEGY

Each phase should have minimal tests:

1. **GameState creation**: `createGameState(def) → valid state with defaults`
2. **Variable helpers**: `setVar → changedVars includes key`
3. **GameRuntime creation**: `createGameRuntime(def) → has def, state, services`
4. **RulesEvaluator stateless**: `evaluate(state, def, dt) → mutates state correctly`
5. **Integration**: Load Ball Sort game, win condition triggers

---

## SUCCESS CRITERIA

- [ ] ONE source of truth for mutable game state
- [ ] `score`, `lives`, `gameState` are regular variables
- [ ] Systems are stateless (no internal state)
- [ ] GameRuntime owns everything
- [ ] Ball Sort game works (win condition triggers)
- [ ] React UI updates via event bus
- [ ] Type check passes
- [ ] Existing tests pass (or are updated)
