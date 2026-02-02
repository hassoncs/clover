# Appendix: Genericize Special Variables (Score, Lives, etc.)

**Problem**: The engine has hardcoded "special" variables like `score` and `lives` with dedicated APIs, UI config, triggers, conditions, actions, and lose conditions. This violates the principle that **all variables should be generic**.

**Goal**: Remove ALL special treatment. Everything should use the generic `variables` system with expression-based win/lose conditions.

---

## Current Special Variable System

### Reserved Variables (RESERVED_VARS)

**File**: `app/lib/game-engine/runtime/types.ts`

```typescript
export const RESERVED_VARS = {
  SCORE: 'score',
  LIVES: 'lives',
  GAME_STATE: 'gameState',
  ELAPSED: 'elapsed',
} as const;
```

**Status**: 
- `gameState` and `elapsed` are system internals (keep reserved)
- ❌ `score` and `lives` should be generic variables

---

## All Locations with Special Treatment

### 1. GameDefinition Interface

**File**: `shared/src/types/GameDefinition.ts`

**Lines 103-112** (UI Config):
```typescript
export interface UIConfig {
  showScore?: boolean;     // ❌ REMOVE
  showTimer?: boolean;
  showLives?: boolean;      // ❌ REMOVE
  livesLabel?: string;      // ❌ REMOVE
  timerCountdown?: boolean;
  scorePosition?: 'top-left' | 'top-center' | 'top-right';  // ❌ REMOVE
  backgroundColor?: string;
  entityCountDisplays?: EntityCountDisplay[];
  variableDisplays?: VariableDisplay[];  // ✅ USE THIS INSTEAD
}
```

**Lines initialScore/initialLives**:
```typescript
export interface GameDefinition {
  // ...
  initialLives?: number;   // ❌ REMOVE
  initialScore?: number;   // ❌ REMOVE
  // Should use variables: { lives: 3, score: 0 }
}
```

**Migration**:
```typescript
// BEFORE:
const game: GameDefinition = {
  initialScore: 0,
  initialLives: 3,
  ui: {
    showScore: true,
    showLives: true,
    livesLabel: "Hearts",
  },
};

// AFTER:
const game: GameDefinition = {
  variables: {
    score: 0,
    lives: 3,
  },
  ui: {
    variableDisplays: [
      { name: 'score', label: 'Score', showWhen: 'always' },
      { name: 'lives', label: 'Hearts', showWhen: 'always' },
    ],
  },
};
```

---

### 2. GameStateHelpers - Dedicated Functions

**File**: `app/lib/game-engine/runtime/GameStateHelpers.ts`

**Lines 108-130** - Score functions:
```typescript
export function getScore(state: GameState): number {
  return (state.vars[RESERVED_VARS.SCORE] as number) ?? 0;
}

export function setScore(state: GameState, value: number, events?: GameEventBus): void {
  setVar(state, RESERVED_VARS.SCORE, value, events);
}

export function addScore(state: GameState, points: number, events?: GameEventBus): void {
  setScore(state, getScore(state) + points, events);
}
```

**Lines 120-130** - Lives functions:
```typescript
export function getLives(state: GameState): number {
  return (state.vars[RESERVED_VARS.LIVES] as number) ?? 3;
}

export function setLives(state: GameState, value: number, events?: GameEventBus): void {
  setVar(state, RESERVED_VARS.LIVES, value, events);
}

export function addLives(state: GameState, count: number, events?: GameEventBus): void {
  setLives(state, getLives(state) + count, events);
}
```

**Migration**: ❌ **DELETE** all score/lives functions. Use generic `getVar()` and `setVar()`.

---

### 3. GameEventBus - Special Event Types

**File**: `app/lib/game-engine/runtime/types.ts`

**Lines 63-68**:
```typescript
export type GameEventType = 
  | { type: 'varChanged'; key: string; value: VarValue }
  | { type: 'gameStateChanged'; state: GameStateValue }
  | { type: 'scoreChanged'; score: number }      // ❌ REMOVE
  | { type: 'livesChanged'; lives: number };     // ❌ REMOVE
```

**Lines 91-107** (GameStateHelpers.setVar):
```typescript
export function setVar(state: GameState, key: string, value: VarValue, events?: GameEventBus): void {
  state.vars[key] = value;
  state.changedVars.add(key);
  
  if (events) {
    events.emit({ type: 'varChanged', key, value });
    
    // ❌ REMOVE special cases:
    if (key === RESERVED_VARS.SCORE) {
      events.emit({ type: 'scoreChanged', score: value as number });
    } else if (key === RESERVED_VARS.LIVES) {
      events.emit({ type: 'livesChanged', lives: value as number });
    } else if (key === RESERVED_VARS.GAME_STATE) {
      events.emit({ type: 'gameStateChanged', state: value as GameStateValue });
    }
  }
}
```

**Migration**:
```typescript
// BEFORE (2 events):
setVar(state, 'score', 100, events);
// Emits: { type: 'varChanged', key: 'score', value: 100 }
// Emits: { type: 'scoreChanged', score: 100 }

// AFTER (1 event):
setVar(state, 'score', 100, events);
// Emits: { type: 'varChanged', key: 'score', value: 100 }  ✅ Only this
```

---

### 4. IGameStateMutator Interface

**File**: `app/lib/game-engine/rules/types.ts`

```typescript
export interface IGameStateMutator {
  addScore(points: number): void;          // ❌ REMOVE
  setScore(value: number): void;           // ❌ REMOVE
  addLives(count: number): void;           // ❌ REMOVE
  setLives(value: number): void;           // ❌ REMOVE
  setGameState(state: BehaviorGameState["state"]): void;
  triggerEvent(eventName: string, data?: unknown): void;
  setVariable(name: string, value: number | string | boolean): void;  // ✅ USE THIS
  getVariables(): Record<string, number | string | boolean>;
  getVariable(name: string): number | string | boolean | undefined;
  // ... other methods
}
```

**Migration**:
```typescript
// BEFORE:
mutator.addScore(10);
mutator.setLives(3);

// AFTER:
mutator.setVariable('score', mutator.getVariable('score') + 10);
mutator.setVariable('lives', 3);
```

**Better**: Use expression-based actions:
```typescript
{
  type: 'set_variable',
  name: 'score',
  operation: 'add',
  value: 10,
}
```

---

### 5. RulesEvaluator Implementation

**File**: `app/lib/game-engine/RulesEvaluator.ts`

**Lines 183-201** - Score/Lives implementation:
```typescript
addScore(points: number): void {
  const state = this.requireState();
  StateHelpers.addScore(state, points, this.currentEvents ?? undefined);
}

setScore(value: number): void {
  const state = this.requireState();
  StateHelpers.setScore(state, value, this.currentEvents ?? undefined);
}

addLives(count: number): void {
  const state = this.requireState();
  StateHelpers.addLives(state, count, this.currentEvents ?? undefined);
}

setLives(value: number): void {
  const state = this.requireState();
  StateHelpers.setLives(state, value, this.currentEvents ?? undefined);
}
```

**Lines 292-300** - Score/Lives getters:
```typescript
getScore(): number {
  const state = this.requireState();
  return StateHelpers.getScore(state);
}

getLives(): number {
  const state = this.requireState();
  return StateHelpers.getLives(state);
}
```

**Migration**: ❌ **DELETE** all methods. They duplicate `setVariable()` / `getVariable()`.

---

### 6. Rule Triggers - ScoreTrigger

**File**: `shared/src/types/rules.ts`

**Lines 55-59**:
```typescript
export interface ScoreTrigger {
  type: 'score';           // ❌ REMOVE type
  threshold: number;
  comparison: 'gte' | 'lte' | 'eq';
}
```

**Migration**: Use expressions instead:
```typescript
// BEFORE:
{
  trigger: { type: 'score', threshold: 100, comparison: 'gte' },
}

// AFTER:
{
  trigger: { type: 'frame' },  // Run every frame
  conditions: [
    { type: 'expression', expr: 'score >= 100' }
  ],
}
```

**File**: `app/lib/game-engine/rules/triggers/LogicTriggerEvaluator.ts`

```typescript
case 'score':
  return this.evaluateScoreTrigger(trigger as ScoreTrigger, context);  // ❌ DELETE
```

---

### 7. Rule Conditions - ScoreCondition

**File**: `shared/src/types/rules.ts`

**Lines 129-133**:
```typescript
export interface ScoreCondition {
  type: 'score';           // ❌ REMOVE type
  min?: number;
  max?: number;
}
```

**Migration**: Use expression conditions:
```typescript
// BEFORE:
{
  type: 'score',
  min: 50,
  max: 100,
}

// AFTER:
{
  type: 'expression',
  expr: 'score >= 50 && score <= 100',
}
```

**File**: `app/lib/game-engine/rules/conditions/LogicConditionEvaluator.ts`

```typescript
case 'score':
  return this.evaluateScoreCondition(condition as ScoreCondition, context);  // ❌ DELETE
```

---

### 8. Rule Actions - ScoreAction & LivesAction

**File**: `shared/src/types/rules.ts`

**Lines for ScoreAction**:
```typescript
export interface ScoreAction {
  type: 'score';           // ❌ REMOVE type
  operation: 'add' | 'subtract' | 'set' | 'multiply';
  value: number;
}
```

**Lines for LivesAction**:
```typescript
export interface LivesAction {
  type: 'lives';           // ❌ REMOVE type
  operation: 'add' | 'subtract' | 'set';
  value: number;
}
```

**Migration**: Use `set_variable` actions:
```typescript
// BEFORE:
{
  type: 'score',
  operation: 'add',
  value: 10,
}

// AFTER:
{
  type: 'set_variable',
  name: 'score',
  operation: 'add',
  value: 10,
}
```

**Files to update**:
- ❌ DELETE `app/lib/game-engine/rules/actions/ScoreActionExecutor.ts` (32 lines)
- ✅ KEEP `LogicActionExecutor.ts` but remove `executeLivesAction()` (lines 86-99)

---

### 9. Lose Conditions - score_below & lives_zero

**File**: `shared/src/types/rules.ts`

```typescript
export type LoseConditionType =
  | 'entity_destroyed'
  | 'entity_exits_screen'
  | 'time_up'
  | 'score_below'        // ❌ REMOVE
  | 'lives_zero'         // ❌ REMOVE
  | 'custom';

export interface LoseCondition {
  type: LoseConditionType;
  tag?: string;
  time?: number;
  entityId?: string;
  score?: number;        // ❌ REMOVE
}
```

**Migration**: Use expression-based win/lose conditions:
```typescript
// BEFORE:
loseCondition: { type: 'score_below', score: 0 }
loseCondition: { type: 'lives_zero' }

// AFTER:
loseCondition: { expr: 'score < 0' }
loseCondition: { expr: 'lives <= 0' }
```

**File**: `app/lib/game-engine/RulesEvaluator.ts` lines 544-580:

```typescript
private checkLoseCondition(context: RuleContext): boolean {
  if (!this.loseCondition) return false;

  switch (this.loseCondition.type) {
    // ... other cases
    
    case 'score_below':        // ❌ DELETE
      return context.score < (this.loseCondition.score ?? 0);

    case 'lives_zero':         // ❌ DELETE
      return context.lives <= 0;
      
    // ...
  }
}
```

---

### 10. GameRuntime UI Rendering

**File**: `app/lib/game-engine/GameRuntime.godot.tsx`

**Lines 1818-1830** - Score/Lives display:
```tsx
{definition.ui?.showScore !== false && (  // ❌ REMOVE
  <Text style={styles.scoreText}>Score: {gameState.score}</Text>
)}
{definition.ui?.showTimer && (
  <Text style={styles.timerText}>
    Time: {Math.floor(gameState.time)}s
  </Text>
)}
{definition.ui?.showLives && (  // ❌ REMOVE
  <Text style={styles.livesText}>
    {definition.ui?.livesLabel ?? "Lives"}: {gameState.lives}
  </Text>
)}
```

**Lines 1847-1867** - Variable displays (CORRECT pattern):
```tsx
{definition.ui?.variableDisplays?.map((display) => {  // ✅ USE THIS
  const value = gameState.variables[display.name];
  const shouldShow =
    display.showWhen !== "not_default" ||
    value !== display.defaultValue;
  if (!shouldShow) return null;
  const formattedValue = display.format
    ? display.format.replace("{value}", String(value))
    : String(value);
  return (
    <Text
      key={display.name}
      style={[
        styles.livesText,
        display.color ? { color: display.color } : undefined,
      ]}
    >
      {display.label}: {formattedValue}
    </Text>
  );
})}
```

**Migration**: Remove showScore/showLives logic, use variableDisplays for everything.

---

### 11. Event Subscriptions in GameRuntime

**File**: `app/lib/game-engine/GameRuntime.godot.tsx`

**Lines 596-623**:
```typescript
eventBusUnsubRef.current = game.events.subscribe((event) => {
  switch (event.type) {
    case 'scoreChanged':  // ❌ REMOVE
      setGameState((s) => ({ ...s, score: event.score }));
      onScoreChange?.(event.score);
      break;
    case 'livesChanged':  // ❌ REMOVE
      setGameState((s) => ({ ...s, lives: event.lives }));
      break;
    case 'gameStateChanged':
      setGameState((s) => ({ ...s, state: event.state }));
      if (event.state === "won" || event.state === "lost") {
        onGameEnd?.(event.state);
      }
      break;
    case 'varChanged':  // ✅ USE THIS
      setGameState((s) => ({
        ...s,
        variables: { ...s.variables, [event.key]: event.value }
      }));
      break;
  }
});
```

**Migration**:
```typescript
// AFTER (unified):
eventBusUnsubRef.current = game.events.subscribe((event) => {
  switch (event.type) {
    case 'varChanged':
      setGameState((s) => ({
        ...s,
        variables: { ...s.variables, [event.key]: event.value }
      }));
      
      // App-specific callbacks
      if (event.key === 'score') {
        onScoreChange?.(event.value as number);
      }
      break;
    case 'gameStateChanged':
      // ... keep this
      break;
  }
});
```

---

### 12. RulesRuntimeSystem - Score/Lives in EvalContext

**File**: `app/lib/game-engine/systems/runner/wrappers/RulesRuntimeSystem.ts`

**Lines 70-77**:
```typescript
const score = StateHelpers.getScore(this.runtimeState);  // ❌ REMOVE
const lives = StateHelpers.getLives(this.runtimeState);  // ❌ REMOVE
const variablesObj: Record<string, number | string | boolean> = {};
for (const [key, value] of Object.entries(this.runtimeState.vars)) {
  if (key !== 'score' && key !== 'lives' && key !== 'gameState' && key !== 'elapsed') {
    variablesObj[key] = value;
  }
}
```

**Lines 89-104** (EvalContext):
```typescript
const evalContext: EvalContext = {
  score,   // ❌ REMOVE from EvalContext
  lives,   // ❌ REMOVE from EvalContext
  time: ctx.elapsed,
  wave: 1,
  dt: ctx.dt,
  frameId: ctx.frameId,
  variables: {  // ✅ score/lives go here
    ...variablesObj,
    ...(smStates ? { __smStates: smStates as unknown as number } : {}),
    ...(smDefs ? { __smDefs: smDefs as unknown as number } : {}),
  },
  random: Math.random,
  entityManager: this.systemContext.entityManager,
  customFunctions: getAllSystemExpressionFunctions(),
};
```

**Migration**:
```typescript
// AFTER:
const variables: Record<string, number | string | boolean> = {};
for (const [key, value] of Object.entries(this.runtimeState.vars)) {
  if (key !== 'gameState' && key !== 'elapsed') {  // Only exclude system vars
    variables[key] = value;
  }
}

const evalContext: EvalContext = {
  time: ctx.elapsed,
  wave: 1,
  dt: ctx.dt,
  frameId: ctx.frameId,
  variables,  // score and lives are just variables now
  random: Math.random,
  entityManager: this.systemContext.entityManager,
  customFunctions: getAllSystemExpressionFunctions(),
};
```

**File**: `shared/src/expressions/types.ts` (EvalContext definition):
```typescript
export interface EvalContext {
  score?: number;    // ❌ REMOVE
  lives?: number;    // ❌ REMOVE
  time: number;
  wave?: number;
  dt?: number;
  frameId?: number;
  variables: Record<string, ExpressionValueType>;  // ✅ score/lives go here
  // ...
}
```

---

### 13. RuleContext - Score/Lives Fields

**File**: `app/lib/game-engine/rules/types.ts`

```typescript
export interface RuleContext {
  entityManager: EntityManager;
  physics: Physics2D;
  mutator: IGameStateMutator;
  score: number;     // ❌ REMOVE
  lives: number;     // ❌ REMOVE
  elapsed: number;
  collisions: CollisionInfo[];
  events: Map<string, unknown>;
  input: InputState;
  inputEvents: InputEvents;
  computedValues?: ComputedValueSystem;
  evalContext?: EvalContext;
  // ...
}
```

**Migration**: Remove `score` and `lives` fields. Access via `evalContext.variables['score']`.

---

### 14. Test Files

**Files to update**:
- `app/lib/game-engine/runtime/__tests__/GameState.test.ts` - Remove score/lives tests
- `app/lib/game-engine/__tests__/RulesEvaluator.test.ts` - Replace score/lives with generic variables

---

## Migration Checklist

### Phase 1: Remove Special Event Types

- [ ] **types.ts** - Remove `scoreChanged` and `livesChanged` from `GameEventType`
- [ ] **GameStateHelpers.ts** - Remove special event emission in `setVar()`
- [ ] **GameRuntime.godot.tsx** - Remove `scoreChanged` and `livesChanged` subscriptions
- [ ] **Tests** - Update tests to expect only `varChanged` events

### Phase 2: Remove Special UI Config

- [ ] **GameDefinition.ts** - Mark `showScore`, `showLives`, `livesLabel`, `scorePosition` as deprecated
- [ ] **GameRuntime.godot.tsx** - Remove hardcoded score/lives display, use `variableDisplays` only
- [ ] **DEFAULT_UI_CONFIG** - Remove default values for score/lives

### Phase 3: Remove IGameStateMutator Methods

- [ ] **types.ts** - Remove `addScore`, `setScore`, `addLives`, `setLives` from interface
- [ ] **RulesEvaluator.ts** - Delete implementations (lines 183-201, 292-300)
- [ ] **All action executors** - Replace calls with `setVariable()`

### Phase 4: Remove Special Actions

- [ ] **rules.ts** - Remove `ScoreAction` and `LivesAction` types
- [ ] **ScoreActionExecutor.ts** - **DELETE FILE**
- [ ] **LogicActionExecutor.ts** - Remove `lives` case and `executeLivesAction()`
- [ ] **ActionRegistry.ts** - Remove score/lives action registration
- [ ] **All game definitions** - Migrate to `set_variable` actions

### Phase 5: Remove Special Triggers

- [ ] **rules.ts** - Remove `ScoreTrigger` type
- [ ] **LogicTriggerEvaluator.ts** - Remove `score` case and `evaluateScoreTrigger()`
- [ ] **All game definitions** - Migrate to expression-based triggers

### Phase 6: Remove Special Conditions

- [ ] **rules.ts** - Remove `ScoreCondition` type
- [ ] **LogicConditionEvaluator.ts** - Remove `score` case and `evaluateScoreCondition()`
- [ ] **All game definitions** - Migrate to expression conditions

### Phase 7: Remove Special Lose Conditions

- [ ] **rules.ts** - Remove `score_below` and `lives_zero` from `LoseConditionType`
- [ ] **rules.ts** - Remove `score` field from `LoseCondition`
- [ ] **RulesEvaluator.ts** - Remove cases in `checkLoseCondition()`
- [ ] **All game definitions** - Migrate to expression-based lose conditions

### Phase 8: Remove RESERVED_VARS for Score/Lives

- [ ] **types.ts** - Remove `SCORE` and `LIVES` from `RESERVED_VARS`
- [ ] **GameStateHelpers.ts** - Delete `getScore`, `setScore`, `addScore`, `getLives`, `setLives`, `addLives`
- [ ] **GameStateHelpers.ts** - Remove special filtering in `createGameState` and `getState`
- [ ] **RulesRuntimeSystem.ts** - Remove score/lives extraction logic

### Phase 9: Remove from EvalContext

- [ ] **types.ts** (expressions) - Remove `score` and `lives` fields from `EvalContext`
- [ ] **RulesRuntimeSystem.ts** - Don't pass score/lives to evalContext
- [ ] **All expression evaluators** - Access via `variables['score']` instead

### Phase 10: Update RuleContext

- [ ] **types.ts** (rules) - Remove `score` and `lives` fields from `RuleContext`
- [ ] **All condition/trigger evaluators** - Access via `evalContext.variables` instead

### Phase 11: Remove initialScore/initialLives

- [ ] **GameDefinition.ts** - Remove `initialScore` and `initialLives` fields
- [ ] **GameStateHelpers.ts** - Remove initialization logic for score/lives
- [ ] **All game definitions** - Migrate to `variables: { score: 0, lives: 3 }`

### Phase 12: Clean Up Tests

- [ ] **GameState.test.ts** - Remove score/lives specific tests
- [ ] **RulesEvaluator.test.ts** - Update to use generic variables
- [ ] **Integration tests** - Update to use variableDisplays

---

## Example Migration: Pinball Game

### BEFORE (Special Variables)

```typescript
{
  metadata: { id: 'pinball', title: 'Pinball', version: '1.0.0' },
  
  initialScore: 0,
  initialLives: 3,
  
  ui: {
    showScore: true,
    showLives: true,
    livesLabel: "Balls",
  },
  
  rules: [
    {
      id: 'score-bumper',
      trigger: { type: 'collision', entityATag: 'ball', entityBTag: 'bumper' },
      actions: [
        { type: 'score', operation: 'add', value: 100 }
      ],
    },
    {
      id: 'lose-ball',
      trigger: { type: 'collision', entityATag: 'ball', entityBTag: 'drain' },
      actions: [
        { type: 'lives', operation: 'subtract', value: 1 }
      ],
    },
  ],
  
  loseCondition: { type: 'lives_zero' },
  
  winCondition: { expr: 'score >= 10000' },
}
```

### AFTER (Generic Variables)

```typescript
{
  metadata: { id: 'pinball', title: 'Pinball', version: '1.0.0' },
  
  variables: {
    score: 0,
    balls: 3,  // Can use any name!
  },
  
  ui: {
    variableDisplays: [
      { name: 'score', label: 'Score', format: '{value}', showWhen: 'always' },
      { name: 'balls', label: 'Balls', showWhen: 'always' },
    ],
  },
  
  rules: [
    {
      id: 'score-bumper',
      trigger: { type: 'collision', entityATag: 'ball', entityBTag: 'bumper' },
      actions: [
        { type: 'set_variable', name: 'score', operation: 'add', value: 100 }
      ],
    },
    {
      id: 'lose-ball',
      trigger: { type: 'collision', entityATag: 'ball', entityBTag: 'drain' },
      actions: [
        { type: 'set_variable', name: 'balls', operation: 'subtract', value: 1 }
      ],
    },
  ],
  
  loseCondition: { expr: 'balls <= 0' },
  
  winCondition: { expr: 'score >= 10000' },
}
```

**Benefits**:
- ✅ More flexible - can call it "balls", "hearts", "chances", etc.
- ✅ Less code - no special score/lives logic
- ✅ Consistent - all variables work the same way
- ✅ Extensible - add new variables (e.g., "combo", "multiplier") without engine changes

---

## Estimated Impact

### Code Deletion
- **~200 lines** from GameStateHelpers (dedicated functions)
- **~32 lines** from ScoreActionExecutor.ts (entire file)
- **~50 lines** from various action/condition/trigger evaluators
- **~30 lines** from types/interfaces
- **~40 lines** from UI rendering logic
- **Total**: ~350 lines deleted

### Code Changes
- **~100 lines** updated (remove special cases, use generic variables)
- **~50 test lines** updated

### Game Definition Changes
- All games need migration to use `variables` and `variableDisplays`
- Estimated: ~20 game files × ~10 lines each = **~200 lines** updated

### Net Result
- **~350 lines deleted**
- **~350 lines updated**
- **Total LOC change**: ~700 lines touched
- **Complexity reduction**: Massive - removes entire subsystem

---

## Validation Commands

After migration:

```bash
# Should return 0 results:
rg "RESERVED_VARS\.(SCORE|LIVES)" --type ts
rg "getScore|setScore|getLives|setLives|addScore|addLives" --type ts
rg "scoreChanged|livesChanged" --type ts
rg "type: 'score'|type: 'lives'" --type ts
rg "showScore|showLives" --type ts
rg "score_below|lives_zero" --type ts
rg "initialScore|initialLives" --type ts

# Should have results (correct patterns):
rg "variableDisplays" --type ts
rg "type: 'set_variable'" --type ts
rg "variables:" --type ts
rg "evalContext\.variables" --type ts
```

---

## Rollout Plan

### Stage 1: Deprecation Warnings (Week 1)
- Add console warnings for games using `initialScore`, `initialLives`, `showScore`, `showLives`
- Add console warnings for `score`/`lives` actions/triggers/conditions
- Document migration guide

### Stage 2: Dual Support (Week 2-3)
- Accept both old and new patterns
- Internally convert old patterns to new
- Update all test games to new pattern

### Stage 3: Remove Old Code (Week 4)
- Execute migration checklist (phases 1-12)
- Delete all deprecated code
- Run validation commands

### Stage 4: Documentation (Week 5)
- Update all documentation
- Create migration guide for external game developers
- Add "Breaking Changes" notice

---

## FAQ

**Q: Why keep `gameState` and `elapsed` as reserved?**  
A: These are system internals that control the engine state machine. Users shouldn't modify them directly.

**Q: What about timer display (showTimer)?**  
A: Keep it! Timer is derived from `elapsed` (system variable), not a user variable.

**Q: Can games still have a "score" variable?**  
A: YES! They can use `variables: { score: 0 }` - it's just not special anymore.

**Q: How do we migrate win condition `score >= 10000`?**  
A: Already expression-based! `winCondition: { expr: 'score >= 10000' }` works perfectly.

**Q: What about backwards compatibility?**  
A: Stage 2 provides dual support. During transition, old games work but show deprecation warnings.

---

**Status**: ✅ Ready for Implementation  
**Priority**: Medium (after RulesSystem merge)  
**Estimated Effort**: 2-3 weeks  
**Breaking Change**: YES (requires game definition updates)
