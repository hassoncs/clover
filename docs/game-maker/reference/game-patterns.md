# Game Patterns

Reusable patterns for building puzzle and physics games. These patterns emerged from building 13+ test games and represent composable building blocks that can be combined to create new game types quickly.

---

## Overview

| Pattern | Description | Example Games |
|---------|-------------|---------------|
| [Choice System](#1-choice-system-pattern) | Select from N options, use selection | Stack & Match, Block Drop, Tip the Scale |
| [Pick & Place](#2-pick--place-pattern) | Tap source to pick, tap destination to place | Ball Sort, Chess, Inventory |
| [Column Drop](#3-column-drop-pattern) | Drop items into columns, gravity stacking | Block Drop, Connect4, Puyo Puyo |
| [Grid Slide](#4-grid-slide-pattern) | Swipe to move all pieces in direction | Ice Slide, 2048 |
| [Physics Drop](#5-physics-drop-pattern) | Aim, drop, wait for physics to settle | Drop & Pop (Suika), Peggle |
| [Chain Reaction](#6-chain-reaction-pattern) | Setup, trigger, watch reaction unfold | Domino Chain, Explosions |
| [Balance/Threshold](#7-balancethreshold-pattern) | Check values against tolerance | Tip the Scale, Win detection |

---

## 1. Choice System Pattern

**Use when**: Player selects from multiple options before taking an action.

### Structure
- N choices displayed (typically 3)
- Player taps to select one
- Selection stored in variable
- Player performs action with selected item
- Choices refresh after use

### State Machine
```
choosing → placing → [processing] → choosing
```

### Variables
```typescript
variables: {
  selectedChoiceIndex: -1,  // -1 = none selected, 0-N = selected index
  selectedValue: -1,        // The value/type of selected item (color, weight, etc.)
}
```

### Rules Pattern
```typescript
rules: [
  // Select a choice
  {
    id: "select_choice",
    trigger: { type: "tap", target: "choice" },
    conditions: [{ type: "variable", name: "selectedChoiceIndex", comparison: "eq", value: -1 }],
    actions: [
      { type: "set_variable", name: "selectedChoiceIndex", operation: "set", value: "$tappedIndex" },
      { type: "event", eventName: "choice_selected" },
    ],
  },
  // Use the selection
  {
    id: "use_choice",
    trigger: { type: "tap", target: "destination" },
    conditions: [{ type: "variable", name: "selectedChoiceIndex", comparison: "gte", value: 0 }],
    actions: [
      { type: "event", eventName: "choice_used" },
      { type: "set_variable", name: "selectedChoiceIndex", operation: "set", value: -1 },
    ],
  },
]
```

### Games Using This Pattern
- **Stack & Match**: Select tile color, place on grid
- **Block Drop**: Select block, drop into column
- **Tip the Scale**: Select weight, place on beam

---

## 2. Pick & Place Pattern

**Use when**: Player moves items from one location to another.

### Structure
- Tap source to pick up item
- Item visually "held" (highlighted or follows cursor)
- Tap destination to place
- Validation on placement (can only place in valid spots)

### State Machine
```
idle → holding → idle
```

### Variables
```typescript
variables: {
  heldItemId: "",       // Entity ID being held
  sourceIndex: -1,      // Where it came from
  heldValue: -1,        // Color, type, etc.
}
```

### Rules Pattern
```typescript
rules: [
  // Pick up item
  {
    id: "pickup",
    trigger: { type: "tap", target: "pickable" },
    conditions: [{ type: "variable", name: "heldItemId", comparison: "eq", value: "" }],
    actions: [
      { type: "set_variable", name: "heldItemId", operation: "set", value: "$tappedEntityId" },
      { type: "event", eventName: "item_picked" },
    ],
  },
  // Place item (valid destination)
  {
    id: "place_valid",
    trigger: { type: "tap", target: "valid-destination" },
    conditions: [{ type: "variable", name: "heldItemId", comparison: "neq", value: "" }],
    actions: [
      { type: "event", eventName: "item_placed" },
      { type: "set_variable", name: "heldItemId", operation: "set", value: "" },
    ],
  },
  // Cancel (tap elsewhere)
  {
    id: "cancel_pickup",
    trigger: { type: "tap", target: "screen" },
    conditions: [{ type: "variable", name: "heldItemId", comparison: "neq", value: "" }],
    actions: [
      { type: "event", eventName: "pickup_cancelled" },
      { type: "set_variable", name: "heldItemId", operation: "set", value: "" },
    ],
  },
]
```

### Games Using This Pattern
- **Ball Sort**: Pick ball from tube, drop in another tube
- **Chess/Checkers**: Pick piece, place on valid square
- **Inventory systems**: Move items between slots

---

## 3. Column Drop Pattern

**Use when**: Items fall into fixed columns and stack.

### Structure
- Fixed number of columns
- Items drop to bottom (or stack on existing)
- Gravity-based stacking
- Column can become "full"

### Variables
```typescript
variables: {
  col0_count: 0,      // Items in column 0
  col1_count: 0,      // Items in column 1
  col0_topValue: -1,  // Value of top item in column 0
  // ... etc for each column
}
```

### Key Logic
```typescript
// Calculate drop position for column
const dropY = COLUMN_BOTTOM + (columnCount * ITEM_HEIGHT);

// Check if column is full
const isFull = columnCount >= MAX_COLUMN_HEIGHT;
```

### Games Using This Pattern
- **Block Drop**: Drop colored blocks, merge same colors
- **Connect4**: Drop discs, check for 4-in-a-row
- **Puyo Puyo**: Drop pairs, match 4+ connected
- **Candy Crush**: Gravity after matches

---

## 4. Grid Slide Pattern

**Use when**: All pieces move in the same direction on input.

### Structure
- Swipe input in 4 (or 8) directions
- All movable pieces slide in that direction
- Pieces stop when hitting wall or another piece
- Often combined with merge logic

### State Machine
```
idle → sliding → checking → idle
```

### Rules Pattern
```typescript
rules: [
  {
    id: "swipe_up",
    trigger: { type: "swipe", direction: "up" },
    conditions: [{ type: "variable", name: "gameState", comparison: "eq", value: "idle" }],
    actions: [
      { type: "set_variable", name: "slideDirection", operation: "set", value: "up" },
      { type: "event", eventName: "slide_started" },
    ],
  },
  // ... similar for down, left, right
]
```

### Games Using This Pattern
- **2048**: Slide tiles, merge same numbers
- **Ice Slide**: Slide blocks until hitting wall
- **Threes**: Slide with different merge rules

---

## 5. Physics Drop Pattern

**Use when**: Items fall with physics and need to settle.

### Structure
- Aim/position phase (player controls where to drop)
- Drop phase (item falls with physics)
- Settling phase (wait for physics to stabilize)
- Result phase (check for matches, scoring, etc.)

### State Machine
```
aiming → dropping → settling → [result] → aiming
```

### Variables
```typescript
variables: {
  aimX: 0,              // Horizontal aim position
  currentItemType: 0,   // What's being dropped
  isSettled: 0,         // 1 when physics settled
}
```

### Settling Detection
```typescript
// Check if all dynamic entities have low velocity
const isSettled = entities
  .filter(e => e.physics?.bodyType === 'dynamic')
  .every(e => Math.abs(e.velocity.x) < 0.1 && Math.abs(e.velocity.y) < 0.1);
```

### Games Using This Pattern
- **Drop & Pop (Suika)**: Drop fruits, merge on collision
- **Peggle**: Drop ball, watch it bounce
- **Tip the Scale**: Drop weight, wait for balance

---

## 6. Chain Reaction Pattern

**Use when**: Player sets up a scenario, then triggers a reaction.

### Structure
- Setup phase (placing items)
- Ready phase (player confirms setup)
- Trigger phase (start the reaction)
- Reaction phase (physics/logic runs)
- Result phase (count/score)

### State Machine
```
placing → ready → running → scoring → placing
```

### Variables
```typescript
variables: {
  itemsPlaced: 0,       // Count of placed items
  reactionStarted: 0,   // 1 when reaction triggered
  itemsAffected: 0,     // Count during reaction
}
```

### Games Using This Pattern
- **Domino Chain**: Place dominoes, push first one
- **Rube Goldberg**: Set up chain, trigger start
- **Explosions**: Place bombs, detonate

---

## 7. Balance/Threshold Pattern

**Use when**: Win/lose depends on values being within a range.

### Structure
- Accumulate values on both sides (or toward a target)
- Check if difference is within threshold
- Win when balanced, lose when too far off

### Variables
```typescript
variables: {
  leftValue: 0,
  rightValue: 0,
  threshold: 0.3,  // Tolerance for "balanced"
}
```

### Win Condition
```typescript
// Check balance
const difference = Math.abs(leftValue - rightValue);
const isBalanced = difference <= threshold;
```

### Expression Function (Recommended)
```typescript
// Add to expression functions
isBalanced: (args, ctx) => {
  const leftVar = String(args[0]);
  const rightVar = String(args[1]);
  const threshold = Number(args[2]) || 0.1;
  const left = ctx.variables[leftVar] ?? 0;
  const right = ctx.variables[rightVar] ?? 0;
  return Math.abs(left - right) <= threshold;
}

// Usage in rules
{ condition: { expr: "isBalanced('leftTorque', 'rightTorque', 0.3)" } }
```

### Games Using This Pattern
- **Tip the Scale**: Balance weights on seesaw
- **Resource management**: Keep values in safe range

---

## Combining Patterns

Most games combine multiple patterns:

| Game | Patterns Used |
|------|---------------|
| Stack & Match | Choice + Grid (flood-fill match) |
| Ball Sort | Pick & Place + Column validation |
| Block Drop | Choice + Column Drop + Merge |
| 2048 | Grid Slide + Merge |
| Drop & Pop | Physics Drop + Collision Merge |
| Tip the Scale | Choice + Physics Drop + Balance |
| Domino Chain | Chain Reaction + Physics |

---

## State Machine Integration

All patterns benefit from game-level state machines (added to `GameDefinition.stateMachines`):

```typescript
stateMachines: [{
  id: 'gameFlow',
  initialState: 'choosing',
  states: [
    { id: 'choosing' },
    { id: 'placing' },
    { id: 'checking', timeout: 0.3, timeoutTransition: 'resolving' },
    { id: 'resolving', timeout: 0.2, timeoutTransition: 'choosing' },
  ],
  transitions: [
    { id: 't1', from: 'choosing', to: 'placing', trigger: { type: 'event', eventName: 'item_selected' } },
    { id: 't2', from: 'placing', to: 'checking', trigger: { type: 'event', eventName: 'item_placed' } },
  ],
}]
```

Use `stateIs('gameFlow', 'choosing')` in rule conditions to check current state.

---

## Common Helpers

### Coordinate Helpers
Every test game uses these - consider importing from shared:
```typescript
const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;  // Center-based X
const cy = (y: number) => HALF_H - y;  // Center-based Y (inverted)
```

### Grid Generation
```typescript
function generateGridEntities(
  rows: number,
  cols: number,
  startX: number,
  startY: number,
  cellSize: number,
  gap: number,
  template: string
): GameEntity[] {
  const entities: GameEntity[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * (cellSize + gap);
      const y = startY + row * (cellSize + gap);
      entities.push({
        id: `cell-${row}-${col}`,
        template,
        transform: { x: cx(x), y: cy(y), angle: 0, scaleX: 1, scaleY: 1 },
      });
    }
  }
  return entities;
}
```

---

## Test Games Reference

| Game | File | Patterns |
|------|------|----------|
| Stack & Match | `stackMatch/game.ts` | Choice, Grid |
| Ball Sort | `ballSort/game.ts` | Pick & Place |
| Block Drop | `blockDrop/game.ts` | Choice, Column Drop |
| Ice Slide | `iceSlide/game.ts` | Grid Slide |
| Drop & Pop | `dropPop/game.ts` | Physics Drop |
| Tip the Scale | `tipScale/game.ts` | Choice, Balance |
| Domino Chain | `dominoChain/game.ts` | Chain Reaction |
| Memory Match | `memoryMatch/game.ts` | Pick & Place (cards) |
| Connect4 | `connect4/game.ts` | Column Drop |
| 2048 | `game2048/game.ts` | Grid Slide |
| Puyo Puyo | `puyoPuyo/game.ts` | Column Drop |
| Flappy Bird | `flappyBird/game.ts` | Physics (continuous) |
| Bubble Shooter | `bubbleShooter/game.ts` | Physics Drop (aim) |

All test games are in `app/lib/test-games/games/`.

---

## Related Documentation

- [Behavior System](./behavior-system.md) - Declarative entity behaviors
- [Game Rules](./game-rules.md) - Triggers, conditions, actions
- [Entity System](./entity-system.md) - Entity structure and templates
- [Input Configuration](../guides/input-configuration.md) - Input triggers and controls
- [Game Templates](../templates/INDEX.md) - 10 core game templates
