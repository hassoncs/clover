# Reverse-From-Goal Puzzle Level Generation System

> **Status**: Planning Complete  
> **Effort**: 3-5 days (core implementation)  
> **Priority**: Medium  
> **Created**: 2026-01-26

## Executive Summary

This document provides a comprehensive implementation plan for a **reverse-from-goal puzzle level generation system** in Slopcade. The technique generates guaranteed-solvable levels by starting from a solved state and applying reverse legal moves, ensuring every generated puzzle has at least one valid solution.

### Key Insight

> **Puzzle games are state machines with constraints, not content.**

The canonical architecture separates:
1. **State Representation** - immutable, hashable
2. **Move Generator** - pure function returning possible moves  
3. **Transition Function** - apply move to state
4. **Legality Checker** - constraint validation
5. **Goal Predicate** - win condition check
6. **Solver** - generic BFS/DFS/A* (puzzle-agnostic)
7. **Reverse Scrambler** - apply N reverse moves from goal
8. **Difficulty Estimator** - solution length, branching, dead-ends

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Architecture Overview](#architecture-overview)
3. [Interface Definitions](#interface-definitions)
4. [Game-Specific Implementations](#game-specific-implementations)
5. [Implementation Phases](#implementation-phases)
6. [Testing Strategy](#testing-strategy)
7. [Future Extensions](#future-extensions)

---

## Problem Statement

### Current Issues

| Game | Current Generation | Problem |
|------|-------------------|---------|
| **Ball Sort** | Fisher-Yates shuffle | NOT guaranteed solvable |
| **Ice Slide** | Hardcoded single level | No variety |
| **Memory Match** | Random shuffle | Trivially solvable (no generation needed) |

### Ball Sort Current (Broken) Implementation

```typescript
// app/lib/test-games/games/ballSort/game.ts
function generateSolvableLayout(): number[][] {
  const allBalls: number[] = [];
  for (let color = 0; color < 4; color++) {
    for (let i = 0; i < BALLS_PER_TUBE; i++) {
      allBalls.push(color);
    }
  }
  // Fisher-Yates shuffle - THIS IS NOT GUARANTEED SOLVABLE!
  for (let i = allBalls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allBalls[i], allBalls[j]] = [allBalls[j], allBalls[i]];
  }
  // ... distribute to tubes
}
```

### Ice Slide Current Implementation

```typescript
// app/lib/test-games/games/iceSlide/game.ts
// Single hardcoded level - no generation at all
const LEVEL: CellType[][] = [
  ["#", "#", "#", "#", "#", "#", "#"],
  ["#", ".", ".", ".", ".", "G", "#"],
  ["#", ".", "B", ".", ".", ".", "#"],
  // ...
];
```

---

## Architecture Overview

### Module Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    App Test Games Layer                          │
│  ballSort/game.ts              iceSlide/game.ts                 │
│       │                              │                           │
│       └──────────────┬───────────────┘                           │
│                      ▼                                           │
├─────────────────────────────────────────────────────────────────┤
│              Puzzle Game Adapters (state ↔ entities)             │
│  puzzle/games/ball-sort.ts     puzzle/games/ice-slide.ts        │
│       │                              │                           │
│       └──────────────┬───────────────┘                           │
│                      ▼                                           │
├─────────────────────────────────────────────────────────────────┤
│                  Puzzle Core (Graph Search Lane)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐         │
│  │ core/types  │  │ solver-bfs  │  │ generator-reverse│         │
│  └─────────────┘  └─────────────┘  └──────────────────┘         │
│  ┌─────────────┐                                                 │
│  │   metrics   │                                                 │
│  └─────────────┘                                                 │
├─────────────────────────────────────────────────────────────────┤
│            Future: Constraint Lane (CSP Puzzles)                 │
│  ┌──────────────────┐  ┌─────────────────────────┐              │
│  │ constraint/types │  │ solver-backtracking     │              │
│  │   (interfaces)   │  │     (not implemented)   │              │
│  └──────────────────┘  └─────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
shared/src/puzzle/
├── core/
│   ├── types.ts              # Core interfaces
│   ├── solver-bfs.ts         # BFS shortest-path solver
│   ├── generator-reverse.ts  # Reverse-from-goal generator
│   └── metrics.ts            # Difficulty calculation
├── games/
│   ├── ball-sort.ts          # Ball Sort spec + adapter
│   └── ice-slide.ts          # Ice Slide spec + adapter
├── constraint/
│   └── types.ts              # CSP interfaces (future)
└── index.ts                  # Public exports
```

### Runtime Flow

```
1. Game initializes
   └─▶ Choose seed (from metadata or generated)
   └─▶ Choose difficulty target

2. Call generatePuzzleInstance(spec, config, seed)
   └─▶ Create goal state
   └─▶ Apply N reverse moves (seeded RNG)
   └─▶ Solve forward to compute metrics
   └─▶ Accept/reject until difficulty target met

3. Convert initialState to game entities
   └─▶ Map puzzle state → entity positions
   └─▶ Preserve existing templates/physics

4. Persist metadata
   └─▶ Store seed + metrics for replay/debug
```

---

## Interface Definitions

### Shared Concepts

```typescript
// shared/src/puzzle/core/types.ts

/**
 * Seeded random number generator function type.
 * Returns values in [0, 1).
 */
export type RNG = () => number;

/**
 * Metrics describing puzzle difficulty.
 * Computed by solving the generated puzzle.
 */
export interface DifficultyMetrics {
  /** Shortest path length in moves */
  solutionLength: number;
  
  /** Average number of legal moves across explored states */
  branchingFactor?: number;
  
  /** Ratio of dead-end states to total explored */
  deadEndRatio?: number;
  
  /** Longest stretch of single-choice moves along solution */
  forcedMoveDepth?: number;
  
  /** Total states explored during solve */
  exploredStates?: number;
  
  /** True if solver hit maxNodes or maxMs limit */
  truncated?: boolean;
}

/**
 * Result from solving a puzzle.
 */
export interface SolveResult<State, Move> {
  status: 'solved' | 'unsolved' | 'truncated';
  solution?: Move[];
  metrics: DifficultyMetrics;
}
```

### Graph/State-Transition Puzzles

```typescript
// shared/src/puzzle/core/types.ts

/**
 * Specification for a state-transition puzzle.
 * Implement this interface to define a new puzzle type.
 * 
 * @typeParam State - The puzzle state representation (must be immutable)
 * @typeParam Move - The move representation
 * 
 * @example Ball Sort
 * - State: number[][] (tubes as stacks of ball colors)
 * - Move: { from: number; to: number }
 * 
 * @example Ice Slide
 * - State: { grid: CellType[][]; blocks: Position[] }
 * - Move: { blockIndex: number; direction: Direction }
 */
export interface TransitionPuzzleSpec<State, Move> {
  /**
   * Check if the given state is a goal/solved state.
   */
  isGoal(state: State): boolean;

  /**
   * Generate all candidate moves from the current state.
   * May include illegal moves (filtered by isLegal).
   */
  generateMoves(state: State): Move[];

  /**
   * Check if a move is legal in the current state.
   * Called after generateMoves to filter candidates.
   */
  isLegal(state: State, move: Move): boolean;

  /**
   * Apply a move to produce a new state.
   * MUST be pure - no mutation of input state.
   */
  applyMove(state: State, move: Move): State;

  /**
   * Hash a state to a unique string for memoization.
   * MUST be stable and ideally canonical (permutation-invariant).
   * 
   * @example Ball Sort canonical hash
   * Sort tube strings before joining to handle tube permutations.
   */
  hashState(state: State): string;

  /**
   * Generate reverse moves from a state (for reverse generation).
   * If not provided, defaults to generateMoves.
   */
  generateReverseMoves?(state: State): Move[];

  /**
   * Apply a reverse move.
   * If not provided, defaults to applyMove.
   */
  applyReverseMove?(state: State, move: Move): State;

  /**
   * Heuristic distance to goal (for A*/IDA* - optional future).
   */
  estimateDistanceToGoal?(state: State): number;
}
```

### Solver API

```typescript
// shared/src/puzzle/core/types.ts

/**
 * Options for puzzle solving.
 */
export interface SolveOptions {
  /** Maximum states to explore before truncating */
  maxNodes: number;
  
  /** Maximum milliseconds before truncating */
  maxMs: number;
  
  /** Whether to collect detailed metrics (slightly slower) */
  collectMetrics: boolean;
}

/**
 * A puzzle solver implementation.
 * BFS is the default; A* can be added later.
 */
export interface PuzzleSolver<State, Move> {
  solve(
    spec: TransitionPuzzleSpec<State, Move>,
    initial: State,
    options: SolveOptions
  ): SolveResult<State, Move>;
}

/**
 * Default solve options for different contexts.
 */
export const DEFAULT_SOLVE_OPTIONS: SolveOptions = {
  maxNodes: 100_000,
  maxMs: 5_000,
  collectMetrics: true,
};

export const FAST_SOLVE_OPTIONS: SolveOptions = {
  maxNodes: 10_000,
  maxMs: 1_000,
  collectMetrics: false,
};
```

### Generator API

```typescript
// shared/src/puzzle/core/types.ts

/**
 * Target difficulty range for generated puzzles.
 */
export interface DifficultyTarget {
  /** Minimum solution length (moves) */
  minSolutionLength: number;
  
  /** Maximum solution length (optional) */
  maxSolutionLength?: number;
  
  /** Minimum average branching factor (optional) */
  minBranchingFactor?: number;
  
  /** Maximum dead-end ratio (optional) */
  maxDeadEndRatio?: number;
  
  /** Minimum forced-move depth (optional) */
  minForcedMoveDepth?: number;
}

/**
 * Difficulty presets for common use.
 */
export const DIFFICULTY_PRESETS = {
  easy: {
    minSolutionLength: 3,
    maxSolutionLength: 8,
  },
  medium: {
    minSolutionLength: 8,
    maxSolutionLength: 15,
  },
  hard: {
    minSolutionLength: 15,
    maxSolutionLength: 30,
  },
  expert: {
    minSolutionLength: 30,
  },
} as const satisfies Record<string, DifficultyTarget>;

/**
 * Options for reverse-from-goal generation.
 */
export interface ReverseGeneratorOptions<State, Move> {
  /** Seed for reproducible generation */
  seed: number;
  
  /** Number of reverse moves to apply (scramble depth) */
  scrambleMoves: number;
  
  /** Maximum generation attempts before giving up */
  maxAttempts: number;
  
  /** Solver to use for difficulty evaluation */
  solver: PuzzleSolver<State, Move>;
  
  /** Solve options for difficulty evaluation */
  solveOptions: SolveOptions;
  
  /** Target difficulty range */
  difficultyTarget: DifficultyTarget;
}

/**
 * A generated puzzle instance.
 */
export interface PuzzleInstance<State> {
  /** Initial (scrambled) state */
  initialState: State;
  
  /** Seed used for generation (for reproducibility) */
  seed: number;
  
  /** Computed difficulty metrics */
  difficulty: DifficultyMetrics;
}

/**
 * Result from puzzle generation.
 */
export interface GenerateResult<State> {
  status: 'success' | 'failed';
  instance?: PuzzleInstance<State>;
  attempts: number;
  reason?: string;
}
```

### CSP Lane (Interfaces Only - Future)

```typescript
// shared/src/puzzle/constraint/types.ts

/**
 * Specification for a constraint satisfaction puzzle.
 * Examples: Sudoku, Kakuro, Nonograms.
 * 
 * @typeParam VarId - Variable identifier type (usually string)
 * @typeParam Value - Domain value type
 */
export interface ConstraintPuzzleSpec<VarId extends string, Value> {
  /** All variable identifiers */
  variables: VarId[];
  
  /** Domain of possible values for a variable */
  domain(v: VarId): Value[];
  
  /** Constraints that must be satisfied */
  constraints: Array<(assignment: Partial<Record<VarId, Value>>) => boolean>;
  
  /** Optional: Forward-checking propagation */
  propagate?(
    assignment: Partial<Record<VarId, Value>>
  ): Partial<Record<VarId, Value>> | null;
}

/**
 * A constraint puzzle solver.
 */
export interface ConstraintSolver<VarId extends string, Value> {
  solve(
    spec: ConstraintPuzzleSpec<VarId, Value>,
    options: { maxMs: number }
  ): {
    status: 'solved' | 'unsolved' | 'truncated';
    assignment?: Record<VarId, Value>;
  };
}
```

---

## Game-Specific Implementations

### Ball Sort (`shared/src/puzzle/games/ball-sort.ts`)

#### State Representation

```typescript
/**
 * Ball Sort puzzle state.
 * Each tube is a stack of ball colors (bottom to top).
 * -1 represents "no color" (empty slot concept, though we use array length).
 */
export interface BallSortState {
  /** Tubes as stacks. tubes[i][0] is bottom, tubes[i][n-1] is top. */
  tubes: number[][];
}

/**
 * Ball Sort move: move top ball from one tube to another.
 */
export interface BallSortMove {
  from: number;
  to: number;
}

/**
 * Ball Sort configuration.
 */
export interface BallSortConfig {
  /** Number of tubes (typically 6) */
  numTubes: number;
  
  /** Number of filled tubes (typically 4) */
  numFilledTubes: number;
  
  /** Balls per tube capacity (typically 4) */
  tubeCapacity: number;
  
  /** Number of colors (typically 4) */
  numColors: number;
}

export const DEFAULT_BALL_SORT_CONFIG: BallSortConfig = {
  numTubes: 6,
  numFilledTubes: 4,
  tubeCapacity: 4,
  numColors: 4,
};
```

#### Specification Implementation

```typescript
export function createBallSortSpec(
  config: BallSortConfig = DEFAULT_BALL_SORT_CONFIG
): TransitionPuzzleSpec<BallSortState, BallSortMove> {
  return {
    isGoal(state: BallSortState): boolean {
      // Each non-empty tube must be full AND monochromatic
      for (const tube of state.tubes) {
        if (tube.length === 0) continue;
        if (tube.length !== config.tubeCapacity) return false;
        const color = tube[0];
        if (!tube.every(c => c === color)) return false;
      }
      return true;
    },

    generateMoves(state: BallSortState): BallSortMove[] {
      const moves: BallSortMove[] = [];
      for (let from = 0; from < state.tubes.length; from++) {
        if (state.tubes[from].length === 0) continue;
        for (let to = 0; to < state.tubes.length; to++) {
          if (from === to) continue;
          moves.push({ from, to });
        }
      }
      return moves;
    },

    isLegal(state: BallSortState, move: BallSortMove): boolean {
      const fromTube = state.tubes[move.from];
      const toTube = state.tubes[move.to];
      
      // Source must have balls
      if (fromTube.length === 0) return false;
      
      // Target must not be full
      if (toTube.length >= config.tubeCapacity) return false;
      
      // Target must be empty OR top colors must match
      if (toTube.length > 0) {
        const fromTop = fromTube[fromTube.length - 1];
        const toTop = toTube[toTube.length - 1];
        if (fromTop !== toTop) return false;
      }
      
      return true;
    },

    applyMove(state: BallSortState, move: BallSortMove): BallSortState {
      // Deep clone tubes
      const newTubes = state.tubes.map(t => [...t]);
      const ball = newTubes[move.from].pop()!;
      newTubes[move.to].push(ball);
      return { tubes: newTubes };
    },

    hashState(state: BallSortState): string {
      // CRITICAL: Canonical hash for permutation invariance
      // Sort tube representations to avoid duplicate states
      const tubeStrings = state.tubes.map(t => t.join(','));
      tubeStrings.sort();
      return tubeStrings.join('|');
    },

    // Reverse moves are same as forward for Ball Sort (symmetric)
    generateReverseMoves(state: BallSortState): BallSortMove[] {
      return this.generateMoves(state);
    },

    applyReverseMove(state: BallSortState, move: BallSortMove): BallSortState {
      return this.applyMove(state, move);
    },
  };
}
```

#### Goal State & Entity Conversion

```typescript
/**
 * Create a solved Ball Sort state.
 */
export function createBallSortGoalState(
  config: BallSortConfig = DEFAULT_BALL_SORT_CONFIG
): BallSortState {
  const tubes: number[][] = [];
  
  // Filled tubes: each with one color
  for (let i = 0; i < config.numFilledTubes; i++) {
    tubes.push(Array(config.tubeCapacity).fill(i % config.numColors));
  }
  
  // Empty tubes
  for (let i = config.numFilledTubes; i < config.numTubes; i++) {
    tubes.push([]);
  }
  
  return { tubes };
}

/**
 * Convert Ball Sort state to entity creation data.
 * Compatible with existing ballSort/game.ts layout logic.
 */
export function ballSortStateToLayout(state: BallSortState): number[][] {
  return state.tubes;
}
```

### Ice Slide (`shared/src/puzzle/games/ice-slide.ts`)

#### State Representation

```typescript
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

/**
 * Cell types in Ice Slide grid.
 */
export type IceSlideCellType = 
  | 'empty'   // Slidable floor
  | 'wall'    // Obstacle
  | 'goal';   // Target position

/**
 * Ice Slide puzzle state.
 */
export interface IceSlideState {
  /** Grid dimensions */
  width: number;
  height: number;
  
  /** Grid cells (row-major: grid[y][x]) */
  grid: IceSlideCellType[][];
  
  /** Block positions (index = blockId) */
  blocks: Position[];
  
  /** Goal positions for each block */
  goals: Position[];
}

/**
 * Ice Slide move.
 */
export interface IceSlideMove {
  blockIndex: number;
  direction: Direction;
}

/**
 * Ice Slide configuration.
 */
export interface IceSlideConfig {
  width: number;
  height: number;
  numBlocks: number;
  wallDensity: number; // 0-1, fraction of cells that are walls
}

export const DEFAULT_ICE_SLIDE_CONFIG: IceSlideConfig = {
  width: 7,
  height: 7,
  numBlocks: 1,
  wallDensity: 0.15,
};
```

#### Specification Implementation

```typescript
const DIRECTION_DELTAS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export function createIceSlideSpec(): TransitionPuzzleSpec<IceSlideState, IceSlideMove> {
  return {
    isGoal(state: IceSlideState): boolean {
      // All blocks must be on their corresponding goal positions
      return state.blocks.every((block, i) => 
        block.x === state.goals[i].x && block.y === state.goals[i].y
      );
    },

    generateMoves(state: IceSlideState): IceSlideMove[] {
      const moves: IceSlideMove[] = [];
      for (let blockIndex = 0; blockIndex < state.blocks.length; blockIndex++) {
        for (const direction of ['up', 'down', 'left', 'right'] as Direction[]) {
          moves.push({ blockIndex, direction });
        }
      }
      return moves;
    },

    isLegal(state: IceSlideState, move: IceSlideMove): boolean {
      const block = state.blocks[move.blockIndex];
      const delta = DIRECTION_DELTAS[move.direction];
      const nextX = block.x + delta.x;
      const nextY = block.y + delta.y;
      
      // Must be able to move at least one cell
      if (!isInBounds(state, nextX, nextY)) return false;
      if (state.grid[nextY][nextX] === 'wall') return false;
      if (hasBlockAt(state, nextX, nextY, move.blockIndex)) return false;
      
      return true;
    },

    applyMove(state: IceSlideState, move: IceSlideMove): IceSlideState {
      const newBlocks = state.blocks.map(b => ({ ...b }));
      const block = newBlocks[move.blockIndex];
      const delta = DIRECTION_DELTAS[move.direction];
      
      // Slide until hitting obstacle
      while (true) {
        const nextX = block.x + delta.x;
        const nextY = block.y + delta.y;
        
        if (!isInBounds(state, nextX, nextY)) break;
        if (state.grid[nextY][nextX] === 'wall') break;
        if (hasBlockAt({ ...state, blocks: newBlocks }, nextX, nextY, move.blockIndex)) break;
        
        block.x = nextX;
        block.y = nextY;
      }
      
      return { ...state, blocks: newBlocks };
    },

    hashState(state: IceSlideState): string {
      // Hash block positions (order matters - blocks are indexed)
      const blockHash = state.blocks.map(b => `${b.x},${b.y}`).join(';');
      return blockHash;
    },

    generateReverseMoves(state: IceSlideState): IceSlideMove[] {
      // Reverse moves: "pull" from current position
      // Find where block could have come FROM to end up here
      const moves: IceSlideMove[] = [];
      
      for (let blockIndex = 0; blockIndex < state.blocks.length; blockIndex++) {
        for (const direction of ['up', 'down', 'left', 'right'] as Direction[]) {
          // Reverse of moving UP is: block came from below
          // So we generate a move that would "undo" a forward move
          const reverseDir = OPPOSITE_DIRECTION[direction];
          
          // Check if this reverse move makes sense
          const block = state.blocks[blockIndex];
          const delta = DIRECTION_DELTAS[reverseDir];
          
          // There must be empty space in the reverse direction
          // AND a wall/block behind current position (to stop)
          if (canReverseMove(state, blockIndex, reverseDir)) {
            moves.push({ blockIndex, direction: reverseDir });
          }
        }
      }
      
      return moves;
    },

    applyReverseMove(state: IceSlideState, move: IceSlideMove): IceSlideState {
      // For Ice Slide, reverse move places block at a valid starting position
      // that would slide into current position
      const newBlocks = state.blocks.map(b => ({ ...b }));
      const block = newBlocks[move.blockIndex];
      const delta = DIRECTION_DELTAS[move.direction];
      
      // Move one cell in reverse direction (away from obstacle)
      block.x += delta.x;
      block.y += delta.y;
      
      return { ...state, blocks: newBlocks };
    },
  };
}

// Helper functions
function isInBounds(state: IceSlideState, x: number, y: number): boolean {
  return x >= 0 && x < state.width && y >= 0 && y < state.height;
}

function hasBlockAt(
  state: IceSlideState, 
  x: number, 
  y: number, 
  excludeIndex: number
): boolean {
  return state.blocks.some((b, i) => i !== excludeIndex && b.x === x && b.y === y);
}

function canReverseMove(
  state: IceSlideState, 
  blockIndex: number, 
  direction: Direction
): boolean {
  const block = state.blocks[blockIndex];
  const delta = DIRECTION_DELTAS[direction];
  const nextX = block.x + delta.x;
  const nextY = block.y + delta.y;
  
  // Must have space to move into
  if (!isInBounds(state, nextX, nextY)) return false;
  if (state.grid[nextY][nextX] === 'wall') return false;
  if (hasBlockAt(state, nextX, nextY, blockIndex)) return false;
  
  return true;
}
```

---

## Implementation Phases

### Phase 1: Repo Wiring + Test Infrastructure Discovery (0.5 day)

**Objective**: Understand test setup and package exports before writing code.

**Tasks**:
1. Locate test runner config (vitest/jest/bun)
2. Find existing test patterns in `shared/`
3. Confirm `@slopcade/shared` export paths
4. Verify how `app/` imports from `shared/`

**Delegate Suggestion**:
```typescript
delegate_task({
  category: "quick",
  load_skills: [],
  prompt: "Find test runner configuration and patterns in shared/ package. Return: test command, config file location, example test file."
})
```

**Acceptance Criteria**:
- Clear decision on test runner + test location
- Know how to run tests

---

### Phase 2: Core Graph Puzzle Framework (1 day)

**Objective**: Implement the generic puzzle infrastructure.

**Files to Create**:
- `shared/src/puzzle/core/types.ts` - All interfaces
- `shared/src/puzzle/core/solver-bfs.ts` - BFS implementation
- `shared/src/puzzle/core/generator-reverse.ts` - Reverse scrambler
- `shared/src/puzzle/core/metrics.ts` - Difficulty calculation
- `shared/src/puzzle/index.ts` - Public exports

**Key Implementation: BFS Solver**

```typescript
// shared/src/puzzle/core/solver-bfs.ts
import { createSeededRandom } from '../../expressions/evaluator';
import type {
  TransitionPuzzleSpec,
  PuzzleSolver,
  SolveOptions,
  SolveResult,
  DifficultyMetrics,
} from './types';

interface QueueNode<State, Move> {
  state: State;
  path: Move[];
  depth: number;
}

export function createBFSSolver<State, Move>(): PuzzleSolver<State, Move> {
  return {
    solve(
      spec: TransitionPuzzleSpec<State, Move>,
      initial: State,
      options: SolveOptions
    ): SolveResult<State, Move> {
      const startTime = Date.now();
      const visited = new Set<string>();
      const queue: QueueNode<State, Move>[] = [{ state: initial, path: [], depth: 0 }];
      
      // Metrics tracking
      let exploredStates = 0;
      let deadEnds = 0;
      let totalBranching = 0;
      let maxForcedDepth = 0;
      let currentForcedDepth = 0;
      
      visited.add(spec.hashState(initial));
      
      while (queue.length > 0) {
        // Check limits
        if (exploredStates >= options.maxNodes) {
          return {
            status: 'truncated',
            metrics: buildMetrics(exploredStates, deadEnds, totalBranching, maxForcedDepth, true),
          };
        }
        
        if (Date.now() - startTime > options.maxMs) {
          return {
            status: 'truncated',
            metrics: buildMetrics(exploredStates, deadEnds, totalBranching, maxForcedDepth, true),
          };
        }
        
        const node = queue.shift()!;
        exploredStates++;
        
        // Check goal
        if (spec.isGoal(node.state)) {
          return {
            status: 'solved',
            solution: node.path,
            metrics: {
              solutionLength: node.path.length,
              exploredStates,
              branchingFactor: totalBranching / exploredStates,
              deadEndRatio: deadEnds / exploredStates,
              forcedMoveDepth: maxForcedDepth,
              truncated: false,
            },
          };
        }
        
        // Generate and filter moves
        const moves = spec.generateMoves(node.state);
        const legalMoves = moves.filter(m => spec.isLegal(node.state, m));
        
        if (options.collectMetrics) {
          totalBranching += legalMoves.length;
          
          if (legalMoves.length === 0) {
            deadEnds++;
          } else if (legalMoves.length === 1) {
            currentForcedDepth++;
            maxForcedDepth = Math.max(maxForcedDepth, currentForcedDepth);
          } else {
            currentForcedDepth = 0;
          }
        }
        
        // Explore children
        for (const move of legalMoves) {
          const nextState = spec.applyMove(node.state, move);
          const hash = spec.hashState(nextState);
          
          if (!visited.has(hash)) {
            visited.add(hash);
            queue.push({
              state: nextState,
              path: [...node.path, move],
              depth: node.depth + 1,
            });
          }
        }
      }
      
      return {
        status: 'unsolved',
        metrics: buildMetrics(exploredStates, deadEnds, totalBranching, maxForcedDepth, false),
      };
    },
  };
}

function buildMetrics(
  explored: number,
  deadEnds: number,
  totalBranching: number,
  forcedDepth: number,
  truncated: boolean
): DifficultyMetrics {
  return {
    solutionLength: -1,
    exploredStates: explored,
    branchingFactor: explored > 0 ? totalBranching / explored : 0,
    deadEndRatio: explored > 0 ? deadEnds / explored : 0,
    forcedMoveDepth: forcedDepth,
    truncated,
  };
}
```

**Key Implementation: Reverse Generator**

```typescript
// shared/src/puzzle/core/generator-reverse.ts
import { createSeededRandom } from '../../expressions/evaluator';
import type {
  TransitionPuzzleSpec,
  PuzzleSolver,
  ReverseGeneratorOptions,
  GenerateResult,
  PuzzleInstance,
  RNG,
} from './types';

export function generatePuzzleInstance<State, Move>(
  spec: TransitionPuzzleSpec<State, Move>,
  goalState: State,
  options: ReverseGeneratorOptions<State, Move>
): GenerateResult<State> {
  const rng = createSeededRandom(options.seed);
  
  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    // Scramble from goal
    const scrambled = scrambleState(spec, goalState, options.scrambleMoves, rng);
    
    // Solve to measure difficulty
    const result = options.solver.solve(spec, scrambled, options.solveOptions);
    
    if (result.status === 'solved') {
      const metrics = result.metrics;
      
      // Check difficulty target
      if (meetsDifficultyTarget(metrics, options.difficultyTarget)) {
        return {
          status: 'success',
          instance: {
            initialState: scrambled,
            seed: options.seed,
            difficulty: metrics,
          },
          attempts: attempt + 1,
        };
      }
    }
    // If unsolved/truncated or doesn't meet target, try again
  }
  
  return {
    status: 'failed',
    attempts: options.maxAttempts,
    reason: 'Could not generate puzzle meeting difficulty target',
  };
}

function scrambleState<State, Move>(
  spec: TransitionPuzzleSpec<State, Move>,
  state: State,
  moves: number,
  rng: RNG
): State {
  const visited = new Set<string>();
  visited.add(spec.hashState(state));
  
  let current = state;
  let lastMove: Move | null = null;
  
  const generateReverse = spec.generateReverseMoves ?? spec.generateMoves;
  const applyReverse = spec.applyReverseMove ?? spec.applyMove;
  
  for (let i = 0; i < moves; i++) {
    const reverseMoves = generateReverse.call(spec, current);
    const legalMoves = reverseMoves.filter(m => {
      // Filter: must be legal
      if (!spec.isLegal(current, m)) return false;
      
      // Filter: no immediate undo (if we can detect it)
      // This is puzzle-specific; for now, allow all legal moves
      
      // Filter: no repeated states
      const next = applyReverse.call(spec, current, m);
      const hash = spec.hashState(next);
      if (visited.has(hash)) return false;
      
      return true;
    });
    
    if (legalMoves.length === 0) break;
    
    // Pick random move
    const move = legalMoves[Math.floor(rng() * legalMoves.length)];
    current = applyReverse.call(spec, current, move);
    visited.add(spec.hashState(current));
    lastMove = move;
  }
  
  return current;
}

function meetsDifficultyTarget(
  metrics: DifficultyMetrics,
  target: DifficultyTarget
): boolean {
  if (metrics.solutionLength < target.minSolutionLength) return false;
  if (target.maxSolutionLength && metrics.solutionLength > target.maxSolutionLength) return false;
  if (target.minBranchingFactor && (metrics.branchingFactor ?? 0) < target.minBranchingFactor) return false;
  if (target.maxDeadEndRatio && (metrics.deadEndRatio ?? 1) > target.maxDeadEndRatio) return false;
  if (target.minForcedMoveDepth && (metrics.forcedMoveDepth ?? 0) < target.minForcedMoveDepth) return false;
  return true;
}
```

**Delegate Suggestion**:
```typescript
delegate_task({
  category: "unspecified-high",
  load_skills: ["slopcade-game-builder"],
  prompt: "Implement puzzle core framework: types.ts, solver-bfs.ts, generator-reverse.ts, metrics.ts in shared/src/puzzle/core/. Use existing createSeededRandom from shared/src/expressions/evaluator.ts. Include comprehensive JSDoc and unit tests."
})
```

**Acceptance Criteria**:
- Unit tests for BFS solver pass
- Solver handles truncation correctly
- Generator produces valid scrambled states

---

### Phase 3: Ball Sort Spec + Integration (1 day)

**Objective**: Fix Ball Sort to generate guaranteed-solvable puzzles.

**Files to Create/Modify**:
- `shared/src/puzzle/games/ball-sort.ts` - New spec implementation
- `app/lib/test-games/games/ballSort/game.ts` - Integration

**Integration Pattern**:

```typescript
// In app/lib/test-games/games/ballSort/game.ts
import {
  createBallSortSpec,
  createBallSortGoalState,
  ballSortStateToLayout,
  DEFAULT_BALL_SORT_CONFIG,
} from '@slopcade/shared/puzzle/games/ball-sort';
import { generatePuzzleInstance, createBFSSolver, DIFFICULTY_PRESETS } from '@slopcade/shared/puzzle';

// Replace generateSolvableLayout() with:
function generateSolvableLayout(seed?: number): { 
  layout: number[][];
  difficulty: DifficultyMetrics;
} {
  const spec = createBallSortSpec(DEFAULT_BALL_SORT_CONFIG);
  const goalState = createBallSortGoalState(DEFAULT_BALL_SORT_CONFIG);
  const solver = createBFSSolver<BallSortState, BallSortMove>();
  
  const result = generatePuzzleInstance(spec, goalState, {
    seed: seed ?? Date.now(),
    scrambleMoves: 50,
    maxAttempts: 100,
    solver,
    solveOptions: { maxNodes: 50000, maxMs: 3000, collectMetrics: true },
    difficultyTarget: DIFFICULTY_PRESETS.medium,
  });
  
  if (result.status === 'failed') {
    console.warn('Ball Sort generation failed, using fallback');
    // Fallback: just use goal state (trivially solvable)
    return { 
      layout: ballSortStateToLayout(goalState),
      difficulty: { solutionLength: 0 },
    };
  }
  
  return {
    layout: ballSortStateToLayout(result.instance!.initialState),
    difficulty: result.instance!.difficulty,
  };
}
```

**Delegate Suggestion**:
```typescript
delegate_task({
  category: "unspecified-high",
  load_skills: ["slopcade-game-builder"],
  prompt: "Implement Ball Sort puzzle spec in shared/src/puzzle/games/ball-sort.ts. Then integrate into app/lib/test-games/games/ballSort/game.ts, replacing generateSolvableLayout(). Preserve existing BallSortActionExecutor logic. Add seed parameter and log difficulty metrics."
})
```

**Acceptance Criteria**:
- Generated Ball Sort levels are solvable
- Existing game interaction unchanged
- Seed reproduces same layout

---

### Phase 4: Ice Slide Spec + Integration (1-1.5 days)

**Objective**: Add procedural level generation to Ice Slide.

**Files to Create/Modify**:
- `shared/src/puzzle/games/ice-slide.ts` - New spec implementation  
- `app/lib/test-games/games/iceSlide/game.ts` - Integration

**Key Challenge**: Reverse move generation for sliding puzzles is more complex than Ball Sort.

**Integration Pattern**:

```typescript
// In app/lib/test-games/games/iceSlide/game.ts
import {
  createIceSlideSpec,
  createIceSlideGoalState,
  iceSlideStateToLevel,
} from '@slopcade/shared/puzzle/games/ice-slide';
import { generatePuzzleInstance, createBFSSolver, DIFFICULTY_PRESETS } from '@slopcade/shared/puzzle';

// Replace hardcoded LEVEL with:
function generateLevel(seed?: number): {
  level: CellType[][];
  blocks: Position[];
  goals: Position[];
  difficulty: DifficultyMetrics;
} {
  const config = { width: 7, height: 7, numBlocks: 1, wallDensity: 0.15 };
  const spec = createIceSlideSpec();
  const goalState = createIceSlideGoalState(config, seed);
  const solver = createBFSSolver<IceSlideState, IceSlideMove>();
  
  const result = generatePuzzleInstance(spec, goalState, {
    seed: seed ?? Date.now(),
    scrambleMoves: 20,
    maxAttempts: 50,
    solver,
    solveOptions: { maxNodes: 10000, maxMs: 2000, collectMetrics: true },
    difficultyTarget: DIFFICULTY_PRESETS.easy,
  });
  
  if (result.status === 'failed') {
    console.warn('Ice Slide generation failed, using fallback');
    return iceSlideStateToLevel(goalState);
  }
  
  return {
    ...iceSlideStateToLevel(result.instance!.initialState),
    difficulty: result.instance!.difficulty,
  };
}
```

**Delegate Suggestion**:
```typescript
delegate_task({
  category: "unspecified-high",
  load_skills: ["slopcade-game-builder"],
  prompt: "Implement Ice Slide puzzle spec in shared/src/puzzle/games/ice-slide.ts with proper reverse-move (pull) logic. Then integrate into app/lib/test-games/games/iceSlide/game.ts, replacing hardcoded LEVEL. Preserve existing swipe event handling."
})
```

**Acceptance Criteria**:
- Generated Ice Slide levels are solvable
- Swipe mechanics unchanged
- Multiple levels possible from different seeds

---

### Phase 5: Difficulty Targeting + Polish (0.5 day)

**Objective**: Tune difficulty and add debug tools.

**Tasks**:
1. Define difficulty presets per game (easy/medium/hard/expert)
2. Add "reject trivial" logic (solution too short)
3. Add "reject too hard" logic (solution too long or truncated)
4. Add debug overlay showing seed + metrics
5. Add console logging for generation stats

**Delegate Suggestion**:
```typescript
delegate_task({
  category: "quick",
  load_skills: ["slopcade-game-builder"],
  prompt: "Add difficulty presets and debug output for Ball Sort and Ice Slide puzzle generation. Show seed, solutionLength, and branchingFactor in dev UI or console."
})
```

**Acceptance Criteria**:
- Difficulty tiers produce noticeably different puzzles
- Debug info visible during development

---

### Phase 6 (FUTURE): CSP Lane Implementation

**Scope**: Deferred to future sprint.

**When to Implement**:
- When adding Sudoku, Kakuro, or Nonogram games
- When constraint propagation would significantly improve performance

**Estimated Effort**: 1-2 days

**Key Files** (interfaces only for now):
- `shared/src/puzzle/constraint/types.ts` ✅ (Created in Phase 2)
- `shared/src/puzzle/constraint/solver-backtracking.ts` (Future)
- `shared/src/puzzle/constraint/generator-csp.ts` (Future)

---

## Testing Strategy

### Unit Tests

**Location**: `shared/src/puzzle/__tests__/`

**Solver Tests** (`solver-bfs.test.ts`):
```typescript
describe('BFS Solver', () => {
  it('solves trivial 2-move puzzle', () => {
    // Create minimal Ball Sort with known 2-move solution
    const spec = createBallSortSpec({ numTubes: 3, numFilledTubes: 2, tubeCapacity: 2, numColors: 2 });
    // ...
  });
  
  it('returns unsolved for impossible puzzle', () => {
    // Create Ball Sort with impossible configuration
    // ...
  });
  
  it('returns truncated when hitting maxNodes', () => {
    // Create complex puzzle with very low maxNodes
    // ...
  });
  
  it('respects maxMs timeout', () => {
    // ...
  });
});
```

**Hash Tests** (`ball-sort.test.ts`):
```typescript
describe('Ball Sort Hash', () => {
  it('produces same hash for tube permutations', () => {
    const state1 = { tubes: [[0,0], [1,1], []] };
    const state2 = { tubes: [[1,1], [0,0], []] };
    const spec = createBallSortSpec();
    expect(spec.hashState(state1)).toBe(spec.hashState(state2));
  });
  
  it('produces different hash for different states', () => {
    // ...
  });
});
```

**Generator Tests** (`generator.test.ts`):
```typescript
describe('Reverse Generator', () => {
  it('generates solvable Ball Sort instance', () => {
    const spec = createBallSortSpec();
    const goal = createBallSortGoalState();
    const solver = createBFSSolver();
    
    const result = generatePuzzleInstance(spec, goal, {
      seed: 12345,
      scrambleMoves: 30,
      maxAttempts: 10,
      solver,
      solveOptions: DEFAULT_SOLVE_OPTIONS,
      difficultyTarget: { minSolutionLength: 1 },
    });
    
    expect(result.status).toBe('success');
    
    // Verify solvable
    const solveResult = solver.solve(spec, result.instance!.initialState, DEFAULT_SOLVE_OPTIONS);
    expect(solveResult.status).toBe('solved');
  });
  
  it('produces identical result for same seed', () => {
    // ...
  });
});
```

### Integration Tests

**Location**: `app/lib/test-games/games/ballSort/__tests__/`

```typescript
describe('Ball Sort Game Integration', () => {
  it('generates playable level from seed', () => {
    const { layout, difficulty } = generateSolvableLayout(42);
    expect(layout).toHaveLength(6); // 6 tubes
    expect(difficulty.solutionLength).toBeGreaterThan(0);
  });
});
```

### Manual Verification Checklist

- [ ] Run Ball Sort 10 times with different seeds - all playable
- [ ] Run Ball Sort with fixed seed - produces same layout
- [ ] Run Ice Slide 10 times with different seeds - all playable
- [ ] Verify difficulty correlates with solution length
- [ ] No hangs or excessive generation time (< 3s)

---

## Future Extensions

### Adding New Puzzle Types

**Graph/State-Transition Puzzles** (use existing framework):
1. Sokoban (push puzzles) - similar to Ice Slide with player + box positions
2. Rush Hour (sliding cars) - multiple pieces with direction constraints
3. Peg Solitaire - jump-and-remove mechanics
4. Tower of Hanoi - stack transfer puzzle

**Implementation Pattern**:
```typescript
// shared/src/puzzle/games/new-puzzle.ts
export function createNewPuzzleSpec(): TransitionPuzzleSpec<State, Move> {
  return {
    isGoal(state) { /* ... */ },
    generateMoves(state) { /* ... */ },
    isLegal(state, move) { /* ... */ },
    applyMove(state, move) { /* ... */ },
    hashState(state) { /* ... */ },
  };
}
```

### CSP Puzzles (Future Lane)

**Puzzles that benefit from constraint propagation**:
1. Sudoku - 9x9 grid with row/col/box uniqueness
2. Kakuro - sum-based crossword
3. Nonogram (Picross) - row/column clue satisfaction
4. Futoshiki - inequality constraints

**Generation Pattern** (different from reverse-scramble):
1. Generate complete valid assignment
2. Remove clues incrementally
3. After each removal, verify unique solution exists
4. Stop when target difficulty reached

### Performance Optimizations (If Needed)

**A\* / IDA\* Solver**:
- Add `estimateDistanceToGoal()` to spec
- Switch from BFS queue to priority queue
- Useful for larger Ice Slide grids (10x10+)

**Parallel Generation**:
- Generate multiple candidates in parallel (Web Workers)
- Return first successful match

**Caching**:
- Cache solved puzzles by seed
- Pre-generate puzzle pool at app startup

---

## Appendix: Existing Infrastructure Reference

### Seeded PRNG

```typescript
// shared/src/expressions/evaluator.ts
export function createSeededRandom(initialSeed: number = 12345): () => number {
  let seed = initialSeed;
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}
```

### Grid Utilities (Reusable for Ice Slide)

```typescript
// shared/src/systems/grid/match-utils.ts
export function floodFill<T>(
  grid: T[][],
  startRow: number,
  startCol: number,
  matchFn: (cell: T, startCell: T) => boolean,
  getNeighborsFn?: (row: number, col: number) => CellPosition[]
): CellPosition[]
```

### Entity Creation Pattern

```typescript
// From Ball Sort game.ts - shows how state maps to entities
function createBallEntities(): GameEntity[] {
  const entities: GameEntity[] = [];
  for (let tubeIndex = 0; tubeIndex < NUM_TUBES; tubeIndex++) {
    const tubeX = tubePositions[tubeIndex].x;
    const balls = tubeLayout[tubeIndex];
    for (let slot = 0; slot < balls.length; slot++) {
      const colorIndex = balls[slot];
      entities.push({
        id: `ball-${ballId}`,
        template: `ball${colorIndex}`,
        tags: ["ball", `color-${colorIndex}`, `in-container-tube-${tubeIndex}`],
        transform: { x: tubeX, y: cy(ballY), /* ... */ },
      });
    }
  }
  return entities;
}
```

---

## Summary

This plan provides a complete roadmap for implementing guaranteed-solvable puzzle generation in Slopcade:

| Phase | Effort | Output |
|-------|--------|--------|
| 1. Repo wiring | 0.5d | Test infrastructure decision |
| 2. Core framework | 1d | Types, BFS solver, generator |
| 3. Ball Sort | 1d | Solvable Ball Sort levels |
| 4. Ice Slide | 1-1.5d | Procedural Ice Slide levels |
| 5. Polish | 0.5d | Difficulty tuning, debug tools |
| **Total** | **4-4.5d** | |

**Future** (not in this sprint):
- CSP solver lane: 1-2d
- A* optimization: 0.5-1d
- Additional puzzle types: 0.5-1d each
