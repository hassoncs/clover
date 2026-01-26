# Puzzle Games Batch 2 - Simple Physics-Based Games

## Overview

10 simple physics-based puzzle games inspired by app store hits. Focus on:
- Simple core mechanics
- Physics-driven gameplay
- Turn/phase-based state machines
- High replayability

## Game List

### Tier 1: Easiest to Implement (Existing Systems)

#### 1. Block Drop
**Inspiration**: Tetris + 2048
**Core Mechanic**: Drop blocks from 3 choices onto grid, matching colors merge
**Physics**: Gravity drop, stacking
**State Machine**: `choosing` → `dropping` → `merging` → `checking_game_over` → `choosing`

```
┌─────────────────┐
│  □ □ □ □ □ □    │  Grid
│  □ □ ■ □ □ □    │
│  □ ■ ■ ■ □ □    │
│  ■ ■ ■ ■ ■ □    │
├─────────────────┤
│  [■] [□] [■]    │  3 Choices
└─────────────────┘
```

**Slots Needed**:
- `blockSpawner` - Generate 3 random block choices
- `dropRule` - Gravity-based column drop
- `mergeDetection` - Find adjacent same-color groups
- `scoring` - Points per merge

---

#### 2. Stack & Match
**Inspiration**: Triple Match / Tile games
**Core Mechanic**: Pick from 3 tiles, place on board, 3+ adjacent = clear
**Physics**: Static placement (no physics needed)
**State Machine**: `choosing` → `placing` → `checking_matches` → `clearing` → `choosing`

```
┌─────────────────┐
│  A B C . . .    │  Grid (6x6)
│  A A B . . .    │
│  . . . . . .    │
│  . . . . . .    │
├─────────────────┤
│  [A] [B] [C]    │  3 Choices
└─────────────────┘
```

**Slots Needed**:
- `tileSpawner` - Generate 3 random tile choices
- `placementRule` - Where tiles can be placed
- `matchDetection` - Reuse grid `findConnectedGroups`
- `clearAnimation` - Visual feedback on clear

---

#### 3. Ball Sort
**Inspiration**: Ball Sort Puzzle (1B+ downloads)
**Core Mechanic**: Pour colored balls between tubes until sorted
**Physics**: Gravity stacking in tubes
**State Machine**: `idle` → `holding_ball` → `idle`

```
  ┌─┐ ┌─┐ ┌─┐ ┌─┐
  │R│ │B│ │G│ │ │
  │B│ │R│ │R│ │ │
  │G│ │G│ │B│ │ │
  │R│ │B│ │G│ │ │
  └─┘ └─┘ └─┘ └─┘
```

**Slots Needed**:
- `pickupRule` - Can only pick top ball
- `dropRule` - Can only drop on same color or empty
- `winDetection` - Each tube single color
- `levelGenerator` - Generate solvable puzzles

---

#### 4. Ice Slide
**Inspiration**: Sokoban + ice physics
**Core Mechanic**: Slide blocks on ice, they don't stop until hitting wall
**Physics**: Frictionless sliding
**State Machine**: `idle` → `sliding` → `checking_win` → `idle`

```
┌─────────────────┐
│  # # # # # # #  │
│  # . . . . ★ #  │  ★ = Goal
│  # . ■ . . . #  │  ■ = Block
│  # . . . # . #  │  # = Wall
│  # . . . . . #  │
│  # # # # # # #  │
└─────────────────┘
```

**Slots Needed**:
- `slideRule` - Slide until wall hit
- `winDetection` - Block on goal
- `undoSystem` - Undo last move
- `levelGenerator` - Generate solvable puzzles

---

### Tier 2: Medium Complexity (New Physics Features)

#### 5. Drop & Pop (Suika Game)
**Inspiration**: Suika Game / Watermelon Game (viral hit)
**Core Mechanic**: Drop fruits, same fruits collide = merge into bigger fruit
**Physics**: Gravity, collision detection, merge on contact
**State Machine**: `aiming` → `dropping` → `settling` → `merging` → `aiming`

```
┌─────────────────┐
│        🍒       │  Aiming
│                 │
│     🍊   🍇     │
│   🍎 🍊 🍇 🍒   │
│  🍎🍎🍊🍇🍇🍒🍒 │
└─────────────────┘
```

**Fruit progression**: 🍒 → 🍇 → 🍊 → 🍎 → 🍐 → 🍑 → 🍈 → 🍉 → 🎃 → 🍉(big)

**Slots Needed**:
- `aimingRule` - Horizontal position control
- `dropRule` - Release fruit
- `mergeDetection` - Same fruits touching
- `mergeAnimation` - Combine into next size
- `overflowDetection` - Game over when fruits exceed line

---

#### 6. Tip the Scale
**Inspiration**: Balance puzzles
**Core Mechanic**: Place weights on seesaw to balance
**Physics**: Torque, pivot joints
**State Machine**: `choosing_weight` → `placing` → `settling` → `checking_balance`

```
        ┌───┐
        │ ○ │  Pivot
    ────┴───┴────
   /             \
  [2]           [?]   Place weight to balance
```

**Slots Needed**:
- `weightSpawner` - Generate weight choices
- `placementRule` - Where on beam
- `balanceDetection` - Within threshold
- `settlingDetection` - Wait for physics to settle

---

#### 7. Domino Chain
**Inspiration**: Domino games
**Core Mechanic**: Place dominoes, tap to start chain reaction
**Physics**: Rigid body toppling, collision propagation
**State Machine**: `placing` → `ready` → `running` → `scoring`

```
┌─────────────────┐
│  |  |  |  |  |  │  Dominoes standing
│  |  |  |  |  |  │
│  ↓              │  Tap to push first
└─────────────────┘
```

**Slots Needed**:
- `placementRule` - Domino spacing/angle
- `pushRule` - Initial push force
- `chainDetection` - Count fallen dominoes
- `scoring` - Points per domino

---

### Tier 3: Higher Complexity (Advanced Physics)

#### 8. Merge Tower
**Inspiration**: Merge games + tower building
**Core Mechanic**: Place numbered blocks, same numbers merge upward
**Physics**: Gravity, stacking stability
**State Machine**: `choosing` → `placing` → `merging` → `settling` → `choosing`

```
┌─────────────────┐
│       [8]       │
│     [4] [4]     │
│   [2][2][2][2]  │
│  [1][1][1][1][1]│
└─────────────────┘
```

**Slots Needed**:
- `blockSpawner` - Generate block choices
- `placementRule` - Must place on existing blocks
- `mergeDetection` - Adjacent same numbers
- `stabilityDetection` - Tower collapse check

---

#### 9. Bridge Builder Lite
**Inspiration**: Poly Bridge (simplified)
**Core Mechanic**: Place beams to connect points, test with ball
**Physics**: Joints, stress physics, breaking
**State Machine**: `building` → `testing` → `success/fail` → `building`

```
┌─────────────────┐
│  A━━━━━━━━━━━B  │  Connect A to B
│      ╲    ╱     │  with beams
│       ╲  ╱      │
│        ╲╱       │
│        ●        │  Ball rolls across
└─────────────────┘
```

**Slots Needed**:
- `beamPlacement` - Connect two points
- `stressCalculation` - Beam load limits
- `breakDetection` - Beam snaps under stress
- `pathValidation` - Ball reaches goal

---

#### 10. Marble Run
**Inspiration**: Marble maze games
**Core Mechanic**: Place ramps/funnels, guide marble to goal
**Physics**: Gravity, bouncing, rolling friction
**State Machine**: `building` → `testing` → `success/fail` → `building`

```
┌─────────────────┐
│  ●              │  Start
│   ╲             │
│    ╲────        │  Ramps
│         ╲       │
│          ╲──★   │  Goal
└─────────────────┘
```

**Slots Needed**:
- `pieceSpawner` - Available ramp/funnel pieces
- `placementRule` - Snap to grid
- `pathSimulation` - Preview marble path
- `goalDetection` - Marble reaches goal

---

## Implementation Priority

| Priority | Game | Reason |
|----------|------|--------|
| 1 | Stack & Match | Uses existing grid system, simple state machine |
| 2 | Ball Sort | Simple physics, clear win condition |
| 3 | Block Drop | Combines existing patterns (grid + merge) |
| 4 | Ice Slide | Sokoban-like, good puzzle depth |
| 5 | Drop & Pop | Viral potential, needs merge-on-collision |
| 6 | Tip the Scale | Teaches physics concepts |
| 7 | Domino Chain | Satisfying chain reactions |
| 8 | Merge Tower | Combines merge + stacking |
| 9 | Bridge Builder Lite | Complex but educational |
| 10 | Marble Run | Most complex, needs path preview |

## Shared Systems Needed

1. **Game-Level State Machines** - All games need phase management
2. **Choice System** - "Pick from N options" pattern (Block Drop, Stack & Match, Ball Sort)
3. **Undo System** - Puzzle games need undo (Ice Slide, Ball Sort)
4. **Level Generator** - Procedural puzzle generation
5. **Settling Detection** - Wait for physics to stabilize

## Success Criteria

- [ ] At least 3 games implemented as test games
- [ ] Game-level state machine system working
- [ ] Choice system reusable across games
- [ ] Each game playable with placeholder sprites
