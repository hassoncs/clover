# State Machine Debugging Guide

**Created:** 2026-01-26  
**Context:** Ball-sort game debugging session that uncovered missing state machine event processing

---

## Quick Diagnosis

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| State machine stuck in initial state | Event-based transitions not processing | Check for `[StateMachine] Transition:` logs |
| `stateIs()` always returns false | Variables not in evalContext | Verify `__smStates` is in `evalContext.variables` |
| Rule condition never true | Expression can't access state | Check variable flow (see below) |
| Tap/input not firing rules | Wrong entity hit, or input not reaching rules | Check `targetEntityId` in response |

---

## How State Machines Work

### Architecture

```
GameLoader.load()
  ↓
RulesEvaluator.setStateMachines(stateMachines)
  ↓
  Creates: {
    __smStates: { machineId: { currentState, previousState, ... } },
    __smDefs: { machineId: StateMachineDefinition }
  }
  ↓
  Stored in: RulesEvaluator.variables Map
  ↓
GameRuntime.update()
  ↓
  Creates evalContext with variables from both:
    - gameVariablesRef.current (game definition variables)
    - fullGameState.variables (from RulesEvaluator.getVariables())
  ↓
RulesEvaluator.update()
  ↓
  1. Evaluate all rules (check conditions, fire actions)
  2. Process pending events → state machine transitions
  3. Clear pending events
```

### Variable Flow

**Critical Path:**
```typescript
// In GameRuntime.godot.tsx (~line 705)
const evalContext = {
  ...
  variables: {
    ...gameVariablesRef.current,      // Game definition vars
    ...fullGameState.variables,        // State machine vars + others
  },
  ...
};

// This makes __smStates available to:
// shared/src/systems/state-machine/index.ts
stateIs: (args, ctx) => {
  const states = ctx.variables['__smStates']; // ✅ Now accessible
  return states[machineId]?.currentState === stateId;
}
```

**If variables are split:** `stateIs()` can't find `__smStates` → always returns false → conditions never pass.

---

## Debugging Workflow

### Step 1: Verify State Machine Initialization

**Check logs on first frame:**
```
[RulesEvaluator] State machines initialized: { smStates: {...}, smDefs: {...} }
```

**If missing:** State machines not being set during game load.

### Step 2: Verify Event-Based Transitions

**When an event fires, you should see:**
```
[StateMachine] Transition: gameFlow "idle" -> "holding" (event: ball_picked)
```

**If missing:** `processStateMachineEvents()` not being called, or event name mismatch.

### Step 3: Verify Expression Evaluation

**When conditions are checked:**
```
[stateIs] machineId=gameFlow stateId=idle currentState=idle result=true
```

**If `result=false` but should be true:** State not transitioning, or wrong state name.

### Step 4: Use Game Inspector

**Enhanced workflow (automatic screenshot + logs):**
```bash
# Open game
game-inspector_open name="ballSort"

# Simulate input (returns screenshot + logs automatically)
game-inspector_simulate_input type="tap" worldX=-4.6 worldY=-2

# Check response for:
# - targetEntityId (did it hit the right entity?)
# - logs array (state transitions, rule evaluations)
# - screenshotPath (visual confirmation)
```

---

## Common Issues

### Issue 1: State Machine Stuck in Initial State

**Symptoms:**
- State never changes from `initialState`
- No `[StateMachine] Transition:` logs
- Rules with `stateIs()` conditions never fire

**Root Causes:**

1. **Event-based transitions not processed** (Pre-RFC-003)
   - State machine defines: `trigger: { type: "event", eventName: "foo" }`
   - Rule fires: `{ type: "event", eventName: "foo" }`
   - But nothing connects them
   - **Fix:** Upgrade to RFC-003 (automatic event processing)

2. **Event name mismatch**
   ```typescript
   // State machine expects:
   trigger: { type: "event", eventName: "ball_picked" }
   
   // But rule fires:
   { type: "event", eventName: "ballPicked" } // ❌ Wrong!
   ```
   - **Fix:** Match event names exactly

3. **Wrong `from` state**
   ```typescript
   // Transition requires:
   from: "idle"
   
   // But current state is:
   currentState: "waiting"  // ❌ Mismatch!
   ```
   - **Fix:** Check state names match exactly

**Debugging:**
```typescript
// Add temporary logging in state machine event processing
console.log('[Debug] Pending events:', Array.from(pendingEvents.keys()));
console.log('[Debug] Current state:', smStates[machineId].currentState);
console.log('[Debug] Transition from:', transition.from);
console.log('[Debug] Event name:', transition.trigger.eventName);
```

### Issue 2: `stateIs()` Always Returns False

**Symptoms:**
- Condition with `stateIs('gameFlow', 'idle')` never passes
- Even though state should be `idle`
- No errors, just always evaluates to false

**Root Cause:**
Variable store fragmentation - `__smStates` not in `evalContext.variables`.

**Fix:**
```typescript
// In GameRuntime.godot.tsx
const evalContext = {
  ...
  variables: { 
    ...gameVariablesRef.current, 
    ...fullGameState.variables  // ✅ Adds __smStates
  },
  ...
};
```

**Verify Fix:**
```typescript
// Add logging in stateIs function
console.log('[stateIs] Available keys:', Object.keys(ctx.variables));
console.log('[stateIs] __smStates:', ctx.variables['__smStates']);
```

### Issue 3: Rules Not Firing

**Symptoms:**
- State transitions work
- But rules with state-based conditions never execute
- No `[Rules]` logs

**Root Causes:**

1. **Trigger doesn't match**
   ```typescript
   // Rule listens for:
   trigger: { type: "tap", target: "tube" }
   
   // But tap hits:
   targetEntityId: "ball-0"  // ❌ Not a tube!
   ```
   - **Fix:** Adjust tap position, or change trigger to match actual entity

2. **Condition fails**
   ```typescript
   conditions: [
     { type: "expression", expr: "stateIs('gameFlow', 'idle')" }
   ]
   ```
   - State is not actually `idle`
   - Or `stateIs()` can't access state (see Issue 2)

**Debugging:**
```typescript
// Check what was tapped
game-inspector_simulate_input type="tap" worldX=X worldY=Y
// Response includes: targetEntityId

// Check current state
// Look for: [stateIs] machineId=... currentState=...
```

---

## Testing State Machines

### Manual Testing with Game Inspector

```typescript
// 1. Open game
game-inspector_open name="yourGame"

// 2. Trigger state change
game-inspector_simulate_input type="tap" worldX=X worldY=Y

// 3. Check logs for transition
// Should see: [StateMachine] Transition: machineId "fromState" -> "toState"

// 4. Verify state with another tap
// Should see different behavior based on new state
```

### Automated Testing

```typescript
describe('State Machine', () => {
  it('should transition from idle to holding on ball_picked event', () => {
    // Trigger event
    rulesEvaluator.fireEvent('ball_picked');
    rulesEvaluator.update(dt, context);
    
    // Check state
    const states = rulesEvaluator.getVariable('__smStates');
    expect(states['gameFlow'].currentState).toBe('holding');
  });
});
```

---

## Key Logs to Look For

### Successful State Machine Flow

```
# Initialization
[RulesEvaluator] State machines initialized: { smStates: { gameFlow: {...} } }

# Rule fires event
[Rules] TAP event received! tap: { targetEntityId: "tube-0-sensor" }

# State transitions
[StateMachine] Transition: gameFlow "idle" -> "holding" (event: ball_picked)

# Condition checks
[stateIs] machineId=gameFlow stateId=holding currentState=holding result=true

# Rule executes
[Rules] Executing action: { type: "event", eventName: "try_drop" }
```

### Problem Indicators

```
# State stuck
[stateIs] machineId=gameFlow stateId=idle currentState=idle result=true
... (many frames later, state still idle despite events firing) ...
[stateIs] machineId=gameFlow stateId=idle currentState=idle result=true

# Variables missing
[stateIs] __smStates: undefined
[stateIs] result: false

# Events firing but no transitions
[Rules] Executing action: { type: "event", eventName: "ball_picked" }
... (no [StateMachine] Transition log follows) ...
```

---

## Best Practices

### 1. Use Descriptive State Names
```typescript
// ✅ Good
states: [
  { id: "idle" },
  { id: "holding_ball" },
  { id: "checking_win" },
]

// ❌ Bad
states: [
  { id: "s1" },
  { id: "s2" },
  { id: "s3" },
]
```

### 2. Match Event Names Exactly
```typescript
// Define event in state machine
trigger: { type: "event", eventName: "ball_picked" }

// Fire exact same event in rule
actions: [{ type: "event", eventName: "ball_picked" }]  // ✅
```

### 3. Log State Transitions in Dev
```typescript
if (DEV) {
  console.log(`[StateMachine] ${machineId}: ${from} → ${to}`);
}
```

### 4. Use Wildcard `from` for Global Transitions
```typescript
{
  from: "*",  // From any state
  to: "reset",
  trigger: { type: "event", eventName: "game_reset" }
}
```

---

## Related

- **RFC-003:** Event-Driven State Machine Transitions
- **Validation System:** Game Validation System roadmap
- **Types:** `shared/src/systems/state-machine/types.ts`
- **Implementation:** `app/lib/game-engine/RulesEvaluator.ts`
