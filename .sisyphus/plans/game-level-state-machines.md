# Game-Level State Machine Support

## Problem

The current state machine system is **entity-scoped** (each machine has an `owner` entity ID), but many games need **game-scoped** state machines for:

- Turn management (Memory Match, Connect4)
- Game phases (choosing → placing → checking → clearing)
- Round progression (intro → playing → round_end → next_round)
- Puzzle states (idle → holding → placing)

Currently, developers manually encode state machines using variables and rules, which is:
- Verbose (Memory Match has 6 rules for a 4-state machine)
- Error-prone (easy to miss transitions)
- Hard for AI to generate correctly

## Solution

Add `stateMachines` field to GameDefinition for game-level state machines.

## Implementation

### Phase 1: Schema & Types

- [ ] Add `stateMachines?: StateMachineDefinition[]` to GameDefinition type
- [ ] Update GameDefinition schema validation
- [ ] Ensure StateMachineDefinition works without `owner` (game-level)

### Phase 2: Engine Integration

- [ ] Initialize game-level state machines on game load
- [ ] Store in `ctx.variables['__smStates']` and `ctx.variables['__smDefs']` (same as entity machines)
- [ ] Process state machine transitions in game loop
- [ ] Handle event-triggered transitions from rules
- [ ] Handle condition-triggered transitions (evaluate each frame)
- [ ] Handle timeout transitions

### Phase 3: Expression Functions (Already Exist)

Existing functions should work for game-level machines:
- `stateCurrent(machineId)` - current state
- `statePrevious(machineId)` - previous state
- `stateIs(machineId, stateId)` - check current state
- `stateTimeInState(machineId)` - time in current state
- `stateCanTransitionTo(machineId, toStateId)` - check if transition valid

### Phase 4: Test Game

- [ ] Create a test game using game-level state machine
- [ ] Refactor Memory Match to use state machine (optional, for comparison)

## Example Usage

```typescript
const game: GameDefinition = {
  // ... other fields
  
  stateMachines: [{
    id: 'gameFlow',
    initialState: 'choosing',
    states: [
      { 
        id: 'choosing',
        onEnter: [{ type: 'set_variable', name: 'canInteract', operation: 'set', value: 1 }]
      },
      { 
        id: 'placing',
        onEnter: [{ type: 'set_variable', name: 'canInteract', operation: 'set', value: 0 }]
      },
      { 
        id: 'checking',
        timeout: 0.5,
        timeoutTransition: 'clearing'
      },
      { 
        id: 'clearing',
        onEnter: [{ type: 'event', eventName: 'clear_matches' }],
        timeout: 0.3,
        timeoutTransition: 'choosing'
      },
    ],
    transitions: [
      { 
        id: 'choose_to_place', 
        from: 'choosing', 
        to: 'placing', 
        trigger: { type: 'event', eventName: 'tile_selected' }
      },
      { 
        id: 'place_to_check', 
        from: 'placing', 
        to: 'checking', 
        trigger: { type: 'event', eventName: 'tile_placed' }
      },
      { 
        id: 'check_no_match', 
        from: 'checking', 
        to: 'choosing', 
        trigger: { type: 'condition', condition: { expr: 'gridMatchCount("board", 3) == 0' } }
      },
    ],
  }],
  
  rules: [
    {
      id: 'tap_tile',
      trigger: { type: 'tap', target: 'tile-choice' },
      conditions: [{ expr: 'stateIs("gameFlow", "choosing")' }],
      actions: [{ type: 'event', eventName: 'tile_selected' }],
    },
  ],
};
```

## Benefits

1. **Cleaner GameDefinitions** - State logic in one place, not scattered across rules
2. **AI-friendly** - State machines are a well-understood pattern
3. **Reusable** - Same pattern for turns, phases, rounds
4. **Debuggable** - Can visualize state machine, see current state
5. **Timeout support** - Built-in delayed transitions

## Files to Modify

| File | Change |
|------|--------|
| `shared/src/types/GameDefinition.ts` | Add `stateMachines` field |
| `shared/src/validation/playable.ts` | Validate state machine definitions |
| `app/lib/game-engine/GameEngine.ts` | Initialize and process state machines |
| `app/lib/game-engine/RulesEvaluator.ts` | Trigger transitions on events |

## New Games That Would Benefit

These new puzzle games would use game-level state machines:

1. **Block Drop** - `choosing` → `dropping` → `merging` → `checking`
2. **Drop & Pop** - `aiming` → `dropping` → `settling` → `merging`
3. **Ball Sort** - `idle` → `holding_ball` → `idle`
4. **Stack & Match** - `choosing` → `placing` → `checking` → `clearing`
5. **Tip the Scale** - `choosing_weight` → `placing` → `settling` → `checking`

## Success Criteria

- [ ] GameDefinition with `stateMachines` field validates
- [ ] State machines initialize on game load
- [ ] Transitions fire on events
- [ ] Timeout transitions work
- [ ] Expression functions work for game-level machines
- [ ] At least one test game uses game-level state machine
