# RFC-003: Event-Driven State Machine Transitions

## Status: Accepted
## Date: 2026-01-26

## Summary

State machines in game definitions can declare event-based transitions, but the engine doesn't process them. This RFC adds automatic event-driven state machine transition processing.

## Problem

### Current State

State machines are defined with event-triggered transitions:

```typescript
stateMachines: [{
  id: "gameFlow",
  initialState: "idle",
  transitions: [
    {
      id: "pickup",
      from: "idle",
      to: "holding",
      trigger: { type: "event", eventName: "ball_picked" },
    },
  ],
}]
```

Rules fire events:
```typescript
actions: [{ type: "event", eventName: "ball_picked" }]
```

**But nothing connects these.** The event fires into the void.

### Impact

- Games using state machines with event triggers don't work
- Developers must use explicit `state_transition` actions as workaround
- State machine definitions are misleading (they look complete but don't function)

## Solution

### Design

Add event-driven transition processing to `RulesEvaluator.update()`:

1. After all rules execute and before `pendingEvents.clear()`
2. For each pending event, check all state machines for matching transitions
3. If a transition matches (correct `from` state + event name), execute it
4. Support transition guards (optional condition expressions)

### Implementation

```typescript
// In RulesEvaluator.update(), before pendingEvents.clear():
this.processStateMachineEvents(context);
```

```typescript
private processStateMachineEvents(context: RuleContext): void {
  const smDefs = this.variables.get('__smDefs') as unknown as Record<string, StateMachineDefinition> | undefined;
  const smStates = this.variables.get('__smStates') as unknown as Record<string, StateMachineState> | undefined;
  
  if (!smDefs || !smStates) return;
  
  for (const [eventName] of this.pendingEvents) {
    for (const [machineId, def] of Object.entries(smDefs)) {
      const state = smStates[machineId];
      if (!state) continue;
      
      for (const transition of def.transitions) {
        if (!this.transitionMatches(transition, state.currentState, eventName)) continue;
        
        // Execute transition
        state.previousState = state.currentState;
        state.currentState = transition.to;
        state.stateEnteredAt = this.elapsed;
        state.transitionCount += 1;
        
        // Fire onEnter/onExit actions if defined
        break; // Only one transition per event per machine
      }
    }
  }
  
  this.variables.set('__smStates', smStates as unknown as number);
}

private transitionMatches(
  transition: StateMachineTransition,
  currentState: string,
  eventName: string
): boolean {
  // Check event trigger
  if (transition.trigger?.type !== 'event') return false;
  if (transition.trigger.eventName !== eventName) return false;
  
  // Check from state
  if (transition.from === '*') return true;
  if (Array.isArray(transition.from)) return transition.from.includes(currentState);
  return transition.from === currentState;
}
```

### API Changes

None - this makes existing state machine definitions work as documented.

### Migration

No migration needed. Games using explicit `state_transition` actions continue to work. Games with event-triggered state machine transitions will start working.

## Alternatives Considered

### 1. Require explicit state_transition actions

**Rejected**: Duplicates logic, state machine definitions become documentation-only.

### 2. Separate state machine update pass

**Rejected**: Adds complexity, events should be processed in the same frame they're fired.

## Testing

1. Ball-sort game should work with event-triggered transitions
2. Multiple state machines should process independently
3. Wildcard `from: "*"` should work
4. Array `from: ["a", "b"]` should work

## Implementation Plan

1. Add `processStateMachineEvents()` to RulesEvaluator
2. Add `transitionMatches()` helper
3. Call from `update()` before clearing events
4. Add debug logging for transition execution
5. Test with ball-sort game
