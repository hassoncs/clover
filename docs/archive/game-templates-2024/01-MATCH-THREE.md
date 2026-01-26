# Match-3 Game Archetype Analysis

> Candy Crush-style puzzle game with grid-based matching mechanics

## Overview

**Genre**: Puzzle / Casual  
**Examples**: Candy Crush, Bejeweled, Puzzle Quest  
**Core Loop**: Swap adjacent pieces → Match 3+ in line → Clear & cascade → Score → Repeat

## Game Requirements

### Core Mechanics

| Mechanic | Description | Priority |
|----------|-------------|----------|
| Grid System | NxM board of cells containing pieces | Critical |
| Piece Types | 5-7 distinct gem/candy types | Critical |
| Swap Mechanic | Swap two adjacent pieces | Critical |
| Match Detection | Find 3+ same-type in row/column | Critical |
| Clearing | Remove matched pieces with VFX | Critical |
| Gravity/Fall | Pieces above fall to fill gaps | Critical |
| Spawning | New pieces spawn at top | Critical |
| Cascade Detection | Re-check for matches after fall | Critical |
| Score System | Points per match, combo multipliers | Critical |
| Move Limit | Win/lose based on moves or objectives | High |
| Special Pieces | Striped, wrapped, color bombs | Medium |
| Objectives | Clear blockers (jelly, ice, etc.) | Medium |
| Hint System | Show valid moves after idle | Low |
| Shuffle | Reshuffle if no valid moves | Low |

### Visual Requirements

| Element | Description |
|---------|-------------|
| Piece Sprites | 5-7 distinct, easily distinguishable pieces |
| Match VFX | Pop/explode animation on clear |
| Fall Animation | Smooth gravity-driven falling |
| Swap Animation | Smooth piece exchange |
| Special VFX | Unique effects for special pieces |
| Combo Feedback | Score popups, screen shake for big combos |
| Background | Themed board background |
| UI | Score, moves remaining, objectives |

### Input Requirements

| Input | Action |
|-------|--------|
| Tap + Drag | Select piece and drag to adjacent cell |
| Tap + Tap | Alternative: tap two adjacent pieces |
| Touch Feedback | Highlight selected piece |

## Current Engine Capability Assessment

### What EXISTS Today

| Feature | Engine Support | Notes |
|---------|---------------|-------|
| Entity spawning | ✅ Full | Can spawn piece entities |
| Positioning | ✅ Full | Can place at grid coordinates |
| Touch input | ✅ Full | Drag detection works |
| Score system | ✅ Full | Variables + rules |
| Win/lose conditions | ✅ Full | Score/entity_count triggers |
| Visual effects | ✅ Full | Particles, shaders |
| Animation | ⚠️ Partial | Frame-based animate behavior |
| Collision/overlap | ✅ Full | Sensors for detection |

### What's MISSING (Critical Gaps)

| Gap | Severity | Description |
|-----|----------|-------------|
| Grid/Board System | 🔴 Critical | No native grid data structure |
| Match Detection Algorithm | 🔴 Critical | No way to scan board for runs |
| Cascade Resolution Loop | 🔴 Critical | No deterministic phase system |
| Piece Fall Physics | 🟡 High | Physics gravity is non-deterministic |
| Board-wide Queries | 🔴 Critical | Expressions can't iterate over entities |
| Input Locking | 🟡 High | No way to disable input during resolution |

## Feasibility Analysis

### Can It Be Built Today?

**Verdict: PARTIAL (30-45% coverage)**

The current engine is optimized for continuous-space physics games. Match-3 is fundamentally a **deterministic grid-state machine** which is philosophically different from the physics-entity model.

### Workaround Approach (Not Recommended)

```
1. Create entities at grid positions (row * cellSize, col * cellSize)
2. Store row/col in entity variables
3. On drag: teleport entities to swap positions
4. Match detection via nested rule conditions (extremely complex)
5. Clear via destroy_on_collision with markers
6. Fall via timer-based teleport sequences
7. Spawn via spawn_on_event at top row
```

**Problems with this approach:**
- Match detection requires O(n) board scanning - rules can't iterate
- Cascade loops require recursive/iterative logic - rules are stateless
- Fall timing must be deterministic - physics gravity adds noise
- Input must lock during resolution - no native support
- Special pieces require complex conditional chains

### Recommended Engine Additions

To make Match-3 "native" to the engine, add a **Board Subsystem**:

```typescript
// New types in shared/src/types/board.ts
interface BoardDefinition {
  rows: number;
  cols: number;
  cellSize: Vec2;
  spawnRows: number; // How many rows above visible for spawning
  pieceTypes: string[]; // Template IDs for piece types
}

interface BoardState {
  cells: (string | null)[][]; // entityId or null
  locked: boolean; // Input disabled during resolution
}

// New behavior
interface BoardCellBehavior extends BaseBehavior {
  type: 'board_cell';
  boardId: string;
  row: number;
  col: number;
}

// New actions
interface SwapAction {
  type: 'board_swap';
  boardId: string;
  cellA: { row: number; col: number };
  cellB: { row: number; col: number };
}

interface ResolveAction {
  type: 'board_resolve';
  boardId: string;
  // Triggers: match_found, cascade_complete, no_matches
}
```

### Board Resolver Algorithm (Engine-Side)

```
function resolveBoard(board):
  loop:
    matches = findMatches(board)  // Scan all rows/cols for 3+
    if matches.empty:
      break
    
    clearMatches(matches)         // Remove pieces, spawn VFX
    applyGravity(board)           // Shift pieces down
    spawnNewPieces(board)         // Fill from top
    
    fireEvent('cascade_step')
    await animationDelay()
  
  fireEvent('resolution_complete')
  board.locked = false
```

## Implementation Phases

### Phase 1: Board Foundation (Engine Work)
**Effort: Large (3-5 days)**

1. Define `BoardDefinition` and `BoardState` types
2. Implement `BoardSystem` class in game-engine
3. Add `board_cell` behavior for entity-cell binding
4. Implement cell ↔ world coordinate conversion
5. Add `board_swap` and `board_resolve` actions
6. Implement match detection algorithm (horizontal/vertical runs)
7. Implement gravity/fall with deterministic timing
8. Implement spawn-from-top logic

### Phase 2: Basic Match-3 Game
**Effort: Medium (2-3 days)**

1. Create piece templates (5 types)
2. Create board initialization logic
3. Implement drag-to-swap input handling
4. Wire up swap validation (adjacent only, valid move)
5. Implement score rules for matches
6. Add win condition (score target) and lose condition (move limit)
7. Add basic VFX for matching

### Phase 3: Polish & Special Pieces
**Effort: Medium (2-3 days)**

1. Add special piece types (striped, wrapped, bomb)
2. Implement special piece creation (match 4, match 5, L/T shapes)
3. Add special piece activation effects
4. Add combo multiplier system
5. Add hint system (highlight valid move after idle)
6. Add "no moves" detection and shuffle
7. Polish animations and juice

### Phase 4: Template & Skinning
**Effort: Short (1-2 days)**

1. Extract configurable parameters:
   - Grid size (rows, cols)
   - Piece types and weights
   - Match rules (min match length)
   - Score values
   - Move limit
   - Objectives
2. Create asset pack structure for pieces + VFX
3. Document skinning API

## Skinnable Template Design

```typescript
interface Match3Template {
  // Board config
  grid: { rows: number; cols: number; cellSize: number };
  
  // Piece config
  pieceTypes: Array<{
    id: string;
    weight: number; // Spawn probability
    spriteTemplate: string;
  }>;
  
  // Scoring
  scoring: {
    baseMatch: number;
    perExtraPiece: number;
    cascadeMultiplier: number;
  };
  
  // Win/Lose
  objectives: {
    type: 'score' | 'clear_type' | 'clear_all';
    target: number;
    moveLimit: number;
  };
  
  // Visuals
  theme: {
    background: string;
    matchVfx: string;
    cascadeVfx: string;
  };
}
```

## Asset Requirements for Skinning

| Asset Type | Count | Description |
|------------|-------|-------------|
| Piece Sprites | 5-7 | One per piece type |
| Special Sprites | 3-5 | Striped, wrapped, bomb variants |
| Match VFX | 1 | Particle effect on clear |
| Cascade VFX | 1 | Screen effect on big combos |
| Background | 1 | Board background image |
| UI Elements | 4+ | Score, moves, objectives, buttons |
| Sound Effects | 5+ | Swap, match, cascade, win, lose |

## Complexity Summary

| Aspect | Rating | Notes |
|--------|--------|-------|
| Engine Changes | 🔴 High | Requires new Board subsystem |
| Game Implementation | 🟡 Medium | Standard once board exists |
| Skinning Support | 🟢 Low | Highly parameterizable |
| AI Generation Fit | 🟡 Medium | Board + pieces are formulaic |

## Recommended Priority

**LAST (4th of 4 games)**

Match-3 requires the most significant engine investment because it needs a fundamentally different game loop (deterministic grid state machine) compared to the current physics-entity model. Implement after the other three games validate the template system and skinning approach.

## Alternative: Simplified Physics Match-3

If you want a "Match-3 feel" without full board system:

1. Use physics gravity for falling (accept non-determinism)
2. Limit board size (6x6 or smaller)
3. Use collision-based match detection (slower, less reliable)
4. Accept that cascades may behave inconsistently

This would be a "Match-3 inspired" casual game rather than a true Match-3.
