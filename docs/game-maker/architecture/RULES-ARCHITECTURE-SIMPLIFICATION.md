# Rules Architecture Simplification Analysis

> **STATUS: IMPLEMENTED** ✅
> This proposal has been fully implemented as part of the Game Engine Cleanup (Feb 2026). 
> `RulesRuntimeSystem` and `RulesEvaluator` have been merged into a single `RulesSystem`.

**Question**: Why do we have both RulesRuntimeSystem AND RulesEvaluator? Should they be the same thing?

**Short Answer**: **YES, they should be merged.** RulesRuntimeSystem is just a thin wrapper doing almost nothing.

---

## Current Architecture (Unnecessary Wrapper)

```
┌────────────────────────────────────────────────────────┐
│ RulesRuntimeSystem (226 lines)                         │
│ - RuntimeSystem wrapper (lifecycle: init, update)      │
│ - Owns: RulesEvaluator instance                        │
│ - Does: Convert input events format                    │
│ - Does: Build EvalContext from state                   │
│ - Does: Call rulesEvaluator.update()                   │
│ - Setters: for runtime dependencies                    │
│                                                        │
│   ┌────────────────────────────────────────────────┐  │
│   │ RulesEvaluator (581 lines)                     │  │
│   │ - ACTUAL RULES LOGIC                           │  │
│   │ - Evaluates triggers, conditions, actions      │  │
│   │ - Checks win/lose conditions                   │  │
│   │ - Manages state machines                       │  │
│   │ - Orchestrates all rule execution              │  │
│   └────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

**Problems**:
- 🔴 **Wrapper Ceremony**: RulesRuntimeSystem just wraps RulesEvaluator
- 🔴 **Split Logic**: Input event conversion in wrapper, rule logic in evaluator
- 🔴 **Extra Indirection**: `rulesSystem.getRulesEvaluator()` to access actual logic
- 🔴 **Confusion**: Which one is "the rules system"?

---

## What Each File Actually Does

### RulesRuntimeSystem (Wrapper - 226 lines)

**Lines 1-55**: Config, imports, interface definitions  
**Lines 57-65**: `initialize()` - creates RulesEvaluator instance, loads config  
**Lines 67-125**: `update()` - builds EvalContext, converts input events, calls `rulesEvaluator.update()`  
**Lines 127-159**: `convertFrameInputEvents()` - format conversion  
**Lines 161-169**: `destroy()` - cleanup  
**Lines 171-194**: `getState()` - read-only state snapshot  
**Lines 196-224**: Setters for dependencies (runtimeState, eventBus, camera, etc.)

**Value Added**: 
- ✅ Implements `RuntimeSystem` interface (lifecycle management)
- ✅ Converts input event formats
- ✅ Builds `EvalContext` from frame data
- ⚠️ Dependency management via setters

**Core Logic**: **0%** - all delegated to RulesEvaluator

### RulesEvaluator (Core Logic - 581 lines)

**Lines 1-88**: Imports, constructor, action/condition/trigger registries  
**Lines 89-174**: Rule/condition/state machine configuration  
**Lines 176-310**: `IGameStateMutator` implementation (score, lives, variables, state)  
**Lines 312-425**: `update()` - **THE ACTUAL RULES ENGINE**
  - Check win/lose conditions
  - Evaluate triggers
  - Evaluate conditions
  - Execute actions
  - Process state machine transitions
**Lines 427-487**: Trigger/condition/action evaluation delegation  
**Lines 531-580**: Win/lose condition checking

**Value Added**: 
- ✅ **100% of rules logic**
- ✅ Trigger/condition/action evaluation
- ✅ Win/lose condition checking
- ✅ State machine processing
- ✅ Game state mutation

**Core Logic**: **100%** - this IS the rules engine

---

## Proposed Architecture (Simplified)

```
┌────────────────────────────────────────────────────────┐
│ RulesSystem (merged, ~700 lines)                       │
│ - Implements RuntimeSystem interface                   │
│ - OWNS all rules logic (no delegation)                 │
│ - Evaluates triggers, conditions, actions              │
│ - Checks win/lose conditions                           │
│ - Manages state machines                               │
│ - Provides IGameStateMutator interface                 │
└────────────────────────────────────────────────────────┘
```

**Benefits**:
- ✅ **Single Responsibility**: One class for all rules
- ✅ **No Wrapper Overhead**: Direct access to logic
- ✅ **Clear Naming**: "RulesSystem" is self-explanatory
- ✅ **Easier Testing**: Mock RuntimeSystem interface directly
- ✅ **Better Performance**: No extra delegation layer

---

## Detailed Comparison

| Aspect | Current (2 files) | Proposed (1 file) |
|--------|-------------------|-------------------|
| **Lines of Code** | 226 + 581 = 807 | ~700 (merge + cleanup) |
| **Public API** | `RulesRuntimeSystem.getRulesEvaluator()` | Direct `RulesSystem` methods |
| **Initialization** | `new RulesRuntimeSystem(config)` → creates `RulesEvaluator` | `new RulesSystem(config)` |
| **Update** | `system.update()` → `evaluator.update()` | `system.update()` |
| **State Mutation** | `evaluator.setScore()`, `evaluator.setVariable()` | `system.setScore()`, `system.setVariable()` |
| **Dependency Injection** | Split: config to wrapper, dependencies via setters | Unified: all via constructor + SystemContext |
| **Testing** | Mock `RuntimeSystem` OR mock `RulesEvaluator` | Mock `RuntimeSystem` (single interface) |

---

## Migration Plan

### Step 1: Create Unified RulesSystem

**New File**: `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts`

```typescript
import { SystemPhase, getAllSystemExpressionFunctions } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import type {
  GameRule,
  WinCondition,
  LoseCondition,
  ContainerConfig,
  EvalContext,
  StateMachineDefinition,
  // ... other imports from RulesEvaluator
} from '@slopcade/shared';
import type { GameState as RuntimeGameState, GameEventBus } from '../../runtime/types';
import * as StateHelpers from '../../runtime/GameStateHelpers';
import { IGameStateMutator, RuleContext } from '../../rules/types';
// ... action/condition/trigger executors

export class RulesSystem implements RuntimeSystem<RulesSystemConfig, RulesSystemState>, IGameStateMutator {
  readonly id = 'rules';
  readonly phase = SystemPhase.GAME_LOGIC;
  readonly priority = 50;
  
  // Merge private fields from both classes
  private config: RulesSystemConfig;
  private systemContext: SystemContext | null = null;
  private runtimeState: RuntimeGameState | null = null;
  private eventBus: GameEventBus | null = null;
  
  private rules: GameRule[] = [];
  private winCondition: WinCondition | null = null;
  private loseCondition: LoseCondition | null = null;
  private smDefs: Record<string, StateMachineDefinition> | null = null;
  
  private currentState: RuntimeGameState | null = null;
  private currentEvents: GameEventBus | null = null;
  
  private actionRegistry: ActionRegistry;
  private runScriptActionExecutor: RunScriptActionExecutor;
  
  // Condition & Trigger Evaluators
  private logicConditionEvaluator = new LogicConditionEvaluator();
  private physicsConditionEvaluator = new PhysicsConditionEvaluator();
  private containerConditionEvaluator!: ContainerConditionEvaluator;
  private collisionTriggerEvaluator = new CollisionTriggerEvaluator();
  private inputTriggerEvaluator = new InputTriggerEvaluator();
  private logicTriggerEvaluator = new LogicTriggerEvaluator();
  
  // Dependencies (previously set via setters)
  private computedValues?: ComputedValueSystem;
  private camera?: CameraSystem;
  private inputEntityManager?: InputEntityManager;
  
  constructor(config: RulesSystemConfig) {
    this.config = config;
    
    // Initialize action registry (from RulesEvaluator constructor)
    const scoreActionExecutor = new ScoreActionExecutor();
    // ... all other executors
    this.actionRegistry = new ActionRegistry(/* ... */);
  }
  
  initialize(ctx: SystemContext, _config: RulesSystemConfig): void {
    this.systemContext = ctx;
    
    // Create container system
    const containerSystem = new ContainerSystem(ctx.entityManager, { 
      containers: this.config.containers 
    });
    this.containerConditionEvaluator = new ContainerConditionEvaluator(containerSystem);
    
    // Load configuration
    this.rules = this.config.rules;
    this.winCondition = this.config.winCondition ?? null;
    this.loseCondition = this.config.loseCondition ?? null;
    
    if (this.config.stateMachines) {
      const smDefs: Record<string, StateMachineDefinition> = {};
      for (const sm of this.config.stateMachines) {
        smDefs[sm.id] = sm;
      }
      this.smDefs = smDefs;
    }
  }
  
  update(ctx: UpdateContext, _state: RulesSystemState): void {
    if (!this.systemContext || !this.runtimeState || !this.eventBus) return;
    
    // Set current state for IGameStateMutator methods
    this.currentState = this.runtimeState;
    this.currentEvents = this.eventBus;
    
    try {
      if (StateHelpers.getGameStateValue(this.runtimeState) !== "playing") {
        return;
      }
      
      const elapsed = StateHelpers.getElapsed(this.runtimeState) + ctx.dt;
      StateHelpers.setElapsed(this.runtimeState, elapsed);
      
      // Build EvalContext (from RulesRuntimeSystem.update)
      const evalContext: EvalContext = {
        score: StateHelpers.getScore(this.runtimeState),
        lives: StateHelpers.getLives(this.runtimeState),
        time: ctx.elapsed,
        wave: 1,
        dt: ctx.dt,
        frameId: ctx.frameId,
        variables: this.buildVariablesForEvalContext(this.runtimeState),
        random: Math.random,
        entityManager: this.systemContext.entityManager,
        customFunctions: getAllSystemExpressionFunctions(),
      };
      
      // Convert input events (from RulesRuntimeSystem.convertFrameInputEvents)
      const inputEvents = this.convertFrameInputEvents(ctx.frame.inputEvents);
      
      // Build rule context (from RulesEvaluator.update)
      const ruleContext: RuleContext = {
        entityManager: this.systemContext.entityManager,
        inputEntityManager: this.inputEntityManager,
        physics: this.systemContext.physics,
        mutator: this, // IGameStateMutator
        camera: this.camera,
        bridge: this.systemContext.bridge,
        setTimeScale: () => {}, // TODO: hook up
        playSound: (soundId) => this.systemContext!.bridge.playSound(soundId),
        setEntityTargetPosition: this.createTargetPositionSetter(elapsed),
        score: evalContext.score,
        lives: evalContext.lives,
        elapsed,
        collisions: ctx.frame.collisions,
        events: this.runtimeState.pendingEvents,
        input: ctx.input as any,
        inputEvents,
        computedValues: this.computedValues,
        evalContext,
      } as RuleContext;
      
      // Check win/lose (from RulesEvaluator.update)
      if (this.checkWinCondition(ruleContext)) {
        this.setGameState("won");
        return;
      }
      
      if (this.checkLoseCondition(ruleContext)) {
        this.setGameState("lost");
        return;
      }
      
      // Process rules (from RulesEvaluator.update)
      for (const rule of this.rules) {
        if (rule.enabled === false) continue;
        if (rule.fireOnce && this.runtimeState.firedOnce.has(rule.id)) continue;
        
        const cooldownEnd = this.runtimeState.cooldowns.get(rule.id);
        if (cooldownEnd && elapsed < cooldownEnd) continue;
        
        const triggerResult = this.evaluateTrigger(rule.trigger, ruleContext);
        if (triggerResult) {
          const conditionsResult = this.evaluateConditions(rule.conditions, ruleContext);
          if (conditionsResult) {
            this.executeActions(rule.actions, ruleContext);
            
            if (rule.fireOnce) {
              this.runtimeState.firedOnce.add(rule.id);
            }
            
            if (rule.cooldown) {
              this.runtimeState.cooldowns.set(rule.id, elapsed + rule.cooldown);
            }
          }
        }
      }
      
      // Process state machine events (from RulesEvaluator.update)
      this.processStateMachineEvents(this.runtimeState);
      
      StateHelpers.clearPendingEvents(this.runtimeState);
    } finally {
      this.currentState = null;
      this.currentEvents = null;
    }
  }
  
  destroy(): void {
    this.systemContext = null;
    this.runtimeState = null;
    this.eventBus = null;
    this.computedValues = undefined;
    this.camera = undefined;
    this.inputEntityManager = undefined;
  }
  
  getState(): RulesSystemState {
    if (!this.runtimeState) {
      return {
        gameState: 'ready',
        score: 0,
        lives: 3,
        variables: {},
      };
    }
    
    const variables: Record<string, number | string | boolean> = {};
    for (const [key, value] of Object.entries(this.runtimeState.vars)) {
      if (key !== 'score' && key !== 'lives' && key !== 'gameState' && key !== 'elapsed') {
        variables[key] = value;
      }
    }
    
    return {
      gameState: StateHelpers.getGameStateValue(this.runtimeState),
      score: StateHelpers.getScore(this.runtimeState),
      lives: StateHelpers.getLives(this.runtimeState),
      variables,
    };
  }
  
  // IGameStateMutator implementation (from RulesEvaluator)
  private requireState(): RuntimeGameState {
    if (!this.currentState) {
      throw new Error("RulesSystem methods called outside of update() context");
    }
    return this.currentState;
  }
  
  addScore(points: number): void {
    const state = this.requireState();
    StateHelpers.addScore(state, points, this.currentEvents ?? undefined);
  }
  
  setScore(value: number): void {
    const state = this.requireState();
    StateHelpers.setScore(state, value, this.currentEvents ?? undefined);
  }
  
  // ... all other IGameStateMutator methods (setLives, setGameState, setVariable, etc.)
  
  // Dependency setters (keep for compatibility)
  setRuntimeState(state: RuntimeGameState): void {
    this.runtimeState = state;
  }
  
  setEventBus(bus: GameEventBus): void {
    this.eventBus = bus;
  }
  
  setComputedValues(computedValues: ComputedValueSystem): void {
    this.computedValues = computedValues;
  }
  
  setCamera(camera: CameraSystem): void {
    this.camera = camera;
  }
  
  setInputEntityManager(inputEntityManager: InputEntityManager): void {
    this.inputEntityManager = inputEntityManager;
  }
  
  setScriptSandbox(scriptSandbox: ScriptSandbox): void {
    this.runScriptActionExecutor.setSandbox(scriptSandbox);
  }
  
  // Private helper methods (from both classes)
  private convertFrameInputEvents(frameEvents: readonly import('../types').InputEvent[]): import('../../BehaviorContext').InputEvents {
    // From RulesRuntimeSystem.convertFrameInputEvents
    // ...
  }
  
  private buildVariablesForEvalContext(state: RuntimeGameState): Record<string, number | string | boolean> {
    // From RulesRuntimeSystem.update
    // ...
  }
  
  private createTargetPositionSetter(elapsed: number) {
    // From RulesEvaluator.update
    // ...
  }
  
  private evaluateTrigger(trigger: RuleTrigger, context: RuleContext): boolean {
    // From RulesEvaluator
    // ...
  }
  
  private evaluateConditions(conditions: RuleCondition[] | undefined, context: RuleContext): boolean {
    // From RulesEvaluator
    // ...
  }
  
  private executeActions(actions: RuleAction[], context: RuleContext): void {
    // From RulesEvaluator
    // ...
  }
  
  private checkWinCondition(context: RuleContext): boolean {
    // From RulesEvaluator
    // ...
  }
  
  private checkLoseCondition(context: RuleContext): boolean {
    // From RulesEvaluator
    // ...
  }
  
  private processStateMachineEvents(gameState: RuntimeGameState): void {
    // From RulesEvaluator
    // ...
  }
}
```

### Step 2: Update Imports

**Files to update**:
```bash
# Find all imports
rg "from.*RulesRuntimeSystem" --type ts
rg "from.*RulesEvaluator" --type ts
```

**Replace**:
```typescript
// BEFORE:
import { RulesRuntimeSystem } from './systems/runner/wrappers/RulesRuntimeSystem';

// AFTER:
import { RulesSystem } from './systems/runner/wrappers/RulesSystem';
```

### Step 3: Update GameRuntime.godot.tsx

**Lines 805-839** (system registration):
```typescript
// BEFORE:
import { RulesRuntimeSystem } from './systems/runner/wrappers/RulesRuntimeSystem';

runner.register(
  new RulesRuntimeSystem({
    rules: definition.rules ?? [],
    winCondition: definition.winCondition,
    loseCondition: definition.loseCondition,
    variables: definition.variables,
    containers: definition.containers,
    stateMachines: definition.stateMachines,
  })
);

const rulesSystem = runner.getSystem<RulesRuntimeSystem>('rules');
if (rulesSystem) {
  rulesSystem.setRuntimeState(game.gameState);
  rulesSystem.setEventBus(game.events);
}

// AFTER:
import { RulesSystem } from './systems/runner/wrappers/RulesSystem';

runner.register(
  new RulesSystem({
    rules: definition.rules ?? [],
    winCondition: definition.winCondition,
    loseCondition: definition.loseCondition,
    variables: definition.variables,
    containers: definition.containers,
    stateMachines: definition.stateMachines,
  })
);

const rulesSystem = runner.getSystem<RulesSystem>('rules');
if (rulesSystem) {
  rulesSystem.setRuntimeState(game.gameState);
  rulesSystem.setEventBus(game.events);
}
```

**No `getRulesEvaluator()` needed** - RulesSystem IS the evaluator now!

### Step 4: Delete Old Files

```bash
rm app/lib/game-engine/RulesEvaluator.ts
rm app/lib/game-engine/systems/runner/wrappers/RulesRuntimeSystem.ts
```

### Step 5: Update Tests

**Files to update**:
```bash
rg "RulesEvaluator" --type ts --glob="**/__tests__/**"
```

**Pattern**:
```typescript
// BEFORE:
import { RulesEvaluator } from '../RulesEvaluator';
const evaluator = new RulesEvaluator(mockEntityManager);

// AFTER:
import { RulesSystem } from '../systems/runner/wrappers/RulesSystem';
const rulesSystem = new RulesSystem({
  rules: [],
  winCondition: undefined,
  loseCondition: undefined,
});
// Then call rulesSystem.initialize(mockSystemContext, config);
```

---

## Benefits Analysis

### Code Reduction
- **Before**: 807 lines (226 + 581)
- **After**: ~700 lines (merge + remove duplication)
- **Savings**: ~107 lines (13% reduction)

### Complexity Reduction
- **Before**: 2 classes, unclear ownership, getter indirection
- **After**: 1 class, clear ownership, direct access

### API Simplification
- **Before**: `rulesSystem.getRulesEvaluator().setScore(10)`
- **After**: `rulesSystem.setScore(10)`

### Testing Simplification
- **Before**: Mock RuntimeSystem AND RulesEvaluator
- **After**: Mock RuntimeSystem only

### Maintenance Simplification
- **Before**: "Is this a RulesRuntimeSystem concern or RulesEvaluator concern?"
- **After**: "It's a RulesSystem concern."

---

## State Separation (Keep!)

**You're right to want state separate from rules!** The current architecture actually already does this:

```
┌──────────────────────────────────────┐
│ GameState (runtime/types.ts)         │
│ - Mutable bag of variables           │
│ - Lives, score, game state           │
│ - State machines, cooldowns, lists   │
│ - NO LOGIC                           │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ GameStateHelpers (runtime/helpers.ts)│
│ - Pure functions for state mutations │
│ - setScore(), setLives(), etc.       │
│ - Emits events on changes            │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ RulesSystem (proposed merged class)  │
│ - Rules logic (triggers/conditions)  │
│ - Calls GameStateHelpers to mutate  │
│ - Implements IGameStateMutator       │
└──────────────────────────────────────┘
```

**This is PERFECT separation**:
- ✅ GameState = data structure (no logic)
- ✅ GameStateHelpers = pure functions
- ✅ RulesSystem = rules logic (uses helpers)

**Keep this pattern!** Merging RulesRuntimeSystem + RulesEvaluator doesn't affect state separation at all.

---

## Recommendation

**✅ YES - Merge RulesRuntimeSystem and RulesEvaluator into a single RulesSystem class.**

**Why**:
1. RulesRuntimeSystem is just boilerplate wrapping RulesEvaluator
2. Single Responsibility: "Rules" is ONE responsibility
3. No loss of functionality - all features preserved
4. Simpler API - no `getRulesEvaluator()` indirection
5. Easier to test - single class to mock
6. Less confusion - "RulesSystem" is self-explanatory

**Keep**:
- ✅ State separation (GameState + GameStateHelpers)
- ✅ RuntimeSystem interface (lifecycle management)
- ✅ IGameStateMutator interface (state mutation)
- ✅ All existing functionality

**Delete**:
- ❌ RulesEvaluator.ts
- ❌ RulesRuntimeSystem.ts
- ❌ `getRulesEvaluator()` method

---

## Alternative: Keep Both BUT Clarify Roles

If you want to keep separation for some reason:

**RulesEvaluator** = Pure rule evaluation logic (no framework coupling)
**RulesRuntimeSystem** = Framework adapter (couples to RuntimeSystem interface)

**Benefits**:
- ✅ RulesEvaluator can be used outside GameSystemRunner
- ✅ RulesEvaluator is more testable (no RuntimeSystem coupling)
- ✅ Clear separation: core logic vs framework adapter

**Costs**:
- ❌ Extra complexity
- ❌ Unclear which to use when
- ❌ Getter indirection

**Verdict**: Not worth it - the wrapper adds no value. Just merge them.
