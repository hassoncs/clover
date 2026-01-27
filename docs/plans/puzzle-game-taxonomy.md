# Top 20 Puzzle Games: Solvability & Generation Taxonomy

> **Status**: Research Complete  
> **Purpose**: Comprehensive analysis of puzzle types, their mathematical properties, and required generation systems  
> **Created**: 2026-01-26

## Executive Summary

This document catalogs 20 major puzzle game types, their computational complexity, solver requirements, and generation strategies. The goal is to inform which puzzles can share infrastructure with our existing reverse-from-goal system, and which require specialized approaches.

### Key Finding: Three Generation Paradigms

| Paradigm | Puzzles | Approach |
|----------|---------|----------|
| **Graph Search** | Ball Sort, Ice Slide, Rush Hour, Sokoban, 15-puzzle, Peg Solitaire | BFS/A* solver + reverse scrambling |
| **Constraint Satisfaction** | Sudoku, Nonogram, Kakuro, Minesweeper, N-Queens | CSP solver + clue removal |
| **Simulation-Based** | Match-3, 2048, Tetris, Physics puzzles | Monte Carlo + fitness functions |

---

## The Top 20 Puzzle Games

### Tier 1: Graph Search Puzzles (Use Our Existing Framework)

These puzzles have well-defined state spaces where BFS/A* finds optimal solutions, and reverse-from-goal generation works perfectly.

---

#### 1. Ball Sort Puzzle ⭐ (Already Planned)

**The Game**: Sort colored balls into tubes, one color per tube.

| Property | Value |
|----------|-------|
| **Complexity** | NP-complete (general), P (fixed tubes/colors) |
| **State** | `number[][]` (tubes as stacks) |
| **Move** | `{from: tube, to: tube}` |
| **Solver** | BFS with canonical hashing |
| **Generation** | ✅ Reverse-from-goal |
| **Difficulty Metric** | Solution length, dead-end ratio |

**Math**: With 4 colors, 4 balls/color, 6 tubes → ~10^6 states, BFS handles easily.

---

#### 2. Ice Slide / Sokoban-lite ⭐ (Already Planned)

**The Game**: Push blocks that slide until hitting obstacles.

| Property | Value |
|----------|-------|
| **Complexity** | PSPACE-complete (general Sokoban) |
| **State** | Grid + block positions |
| **Move** | `{blockId, direction}` |
| **Solver** | BFS/A* with Manhattan distance heuristic |
| **Generation** | ✅ Reverse-from-goal (pull instead of push) |
| **Difficulty Metric** | Solution length, branching factor |

**Math**: Small grids (7x7, 1-2 blocks) → ~10^4 states. Larger grids need A* with pruning.

---

#### 3. Rush Hour (Sliding Block Puzzle)

**The Game**: Slide cars in a parking lot to let the red car escape.

| Property | Value |
|----------|-------|
| **Complexity** | PSPACE-complete |
| **State** | Car positions on grid (each car has fixed orientation) |
| **Move** | `{carId, distance}` (positive/negative along axis) |
| **Solver** | BFS with position-based hashing |
| **Generation** | ✅ Reverse-from-goal (start with red car at exit) |
| **Difficulty Metric** | Solution length, "required car moves" |

**Implementation Notes**:
```typescript
interface RushHourState {
  cars: Array<{id: string; x: number; y: number; length: number; horizontal: boolean}>;
}

interface RushHourMove {
  carId: string;
  delta: number; // +1, -1, +2, etc.
}
```

**Math**: Famous "hardest" Rush Hour puzzle requires 93 moves. State space ~10^7.

---

#### 4. 15-Puzzle (Sliding Tiles)

**The Game**: Slide numbered tiles to arrange them in order.

| Property | Value |
|----------|-------|
| **Complexity** | NP-hard (finding optimal), but solvable puzzles have polynomial solutions |
| **State** | `number[][]` (tile positions) |
| **Move** | `{direction}` (slide tile into empty space) |
| **Solver** | IDA* with Manhattan distance + linear conflict heuristic |
| **Generation** | ✅ Reverse-from-goal (random legal moves from solved state) |
| **Difficulty Metric** | Solution length, inversions count |

**Critical Math**: Only half of all tile arrangements are solvable! The parity of inversions determines solvability.

```typescript
function isSolvable(tiles: number[]): boolean {
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      if (tiles[i] > tiles[j] && tiles[i] !== 0 && tiles[j] !== 0) {
        inversions++;
      }
    }
  }
  // For 4x4: solvable if (inversions + blank_row_from_bottom) is odd
  const blankRow = Math.floor(tiles.indexOf(0) / 4);
  return (inversions + (4 - blankRow)) % 2 === 1;
}
```

---

#### 5. Peg Solitaire

**The Game**: Jump pegs over each other to remove them, leaving one peg.

| Property | Value |
|----------|-------|
| **Complexity** | NP-complete |
| **State** | `Set<Position>` (filled holes) |
| **Move** | `{from, over, to}` (jump and capture) |
| **Solver** | BFS/DFS with symmetry reduction |
| **Generation** | ✅ Reverse-from-goal (start with 1 peg, "un-jump" to add pegs) |
| **Difficulty Metric** | Solution length, "forced moves" count |

**Math**: English board has 33 holes, ~10^7 reachable states. French board (37 holes) is harder.

---

#### 6. Tower of Hanoi

**The Game**: Move disks between pegs, larger disks cannot go on smaller.

| Property | Value |
|----------|-------|
| **Complexity** | P (polynomial - always 2^n - 1 moves for n disks) |
| **State** | `number[][]` (disks on each peg) |
| **Move** | `{from: peg, to: peg}` |
| **Solver** | Recursive algorithm (trivial) |
| **Generation** | ✅ Reverse-from-goal (but trivial - just pick random start) |
| **Difficulty Metric** | Number of disks |

**Math**: Optimal solution is always `2^n - 1` moves. No "hard" instances - difficulty is purely disk count.

---

#### 7. Klotski (Huarong Dao)

**The Game**: Slide different-sized blocks to move the large block to the exit.

| Property | Value |
|----------|-------|
| **Complexity** | PSPACE-complete |
| **State** | Block positions on grid |
| **Move** | `{blockId, direction}` |
| **Solver** | BFS/A* |
| **Generation** | ✅ Reverse-from-goal |
| **Difficulty Metric** | Solution length (famous "81-move" minimum) |

**Math**: Classic 4x5 board, 10 blocks. State space ~25,000 positions.

---

#### 8. Atomix

**The Game**: Slide atoms to form molecules (atoms slide until hitting wall/other atom).

| Property | Value |
|----------|-------|
| **Complexity** | PSPACE-complete |
| **State** | Atom positions on grid |
| **Move** | `{atomId, direction}` |
| **Solver** | BFS/A* with molecule-distance heuristic |
| **Generation** | ✅ Reverse-from-goal |
| **Difficulty Metric** | Solution length, branching factor |

**Math**: Similar to Ice Slide but with specific goal configuration (molecule shape).

---

### Tier 2: Constraint Satisfaction Puzzles (Need CSP Solver)

These puzzles are better modeled as constraint satisfaction problems. Reverse-from-goal doesn't work well; instead, generate a complete solution then remove clues.

---

#### 9. Sudoku

**The Game**: Fill 9x9 grid so each row, column, and 3x3 box contains 1-9.

| Property | Value |
|----------|-------|
| **Complexity** | NP-complete (general), but 9x9 is tractable |
| **State** | `number[][]` (grid with 0 = empty) |
| **Constraint** | Row/column/box uniqueness |
| **Solver** | Backtracking with constraint propagation |
| **Generation** | ❌ NOT reverse-from-goal |
| **Difficulty Metric** | Clue count, required techniques |

**Generation Algorithm** (CSP-specific):
```typescript
function generateSudoku(difficulty: 'easy' | 'medium' | 'hard'): number[][] {
  // 1. Generate complete valid grid (random fill with backtracking)
  const solution = generateCompleteSudoku();
  
  // 2. Remove clues while maintaining unique solution
  const puzzle = [...solution];
  const removeOrder = shuffle(allCellIndices);
  
  for (const cell of removeOrder) {
    const backup = puzzle[cell];
    puzzle[cell] = 0;
    
    if (countSolutions(puzzle) !== 1) {
      puzzle[cell] = backup; // Restore - multiple solutions now
    }
  }
  
  // 3. Verify difficulty (count required techniques)
  return puzzle;
}
```

**Difficulty Techniques** (ordered by difficulty):
1. Naked singles
2. Hidden singles
3. Naked pairs/triples
4. Pointing pairs
5. Box/line reduction
6. X-Wing
7. Swordfish
8. XY-Wing
9. Forcing chains

---

#### 10. Nonogram (Picross)

**The Game**: Fill grid cells based on row/column number clues to reveal a picture.

| Property | Value |
|----------|-------|
| **Complexity** | NP-complete |
| **State** | `boolean[][]` (filled/empty) |
| **Constraint** | Row/column run-length sequences |
| **Solver** | Line-by-line propagation + backtracking |
| **Generation** | ❌ NOT reverse-from-goal |
| **Difficulty Metric** | Grid size, ambiguity during solve |

**Generation Algorithm**:
```typescript
function generateNonogram(image: boolean[][]): NonogramPuzzle {
  // 1. Start with target image
  // 2. Compute row clues: runs of consecutive filled cells
  // 3. Compute column clues: same for columns
  // 4. Verify unique solution (solve and compare to original)
  // 5. If not unique, image won't work - need different image
}
```

**Key Insight**: Not all images make valid nonograms! The image must be "line-solvable."

---

#### 11. Kakuro (Cross Sums)

**The Game**: Fill grid with 1-9 so numbers in each "run" sum to the clue.

| Property | Value |
|----------|-------|
| **Complexity** | NP-complete |
| **State** | `number[][]` |
| **Constraint** | Sum constraints + uniqueness within run |
| **Solver** | CSP with constraint propagation |
| **Generation** | ❌ NOT reverse-from-goal |
| **Difficulty Metric** | Grid size, constraint tightness |

**Math**: Unlike Sudoku, the constraint is a sum, not uniqueness. Requires tracking "possible digit sets" per cell.

---

#### 12. Minesweeper

**The Game**: Reveal cells to find all mines using number clues.

| Property | Value |
|----------|-------|
| **Complexity** | NP-complete (determining consistency) |
| **State** | `(mine | safe | unknown)[][]` |
| **Constraint** | Each number = count of adjacent mines |
| **Solver** | Constraint propagation + probabilistic reasoning |
| **Generation** | Special: First-click-safe guarantee |
| **Difficulty Metric** | Mine density, required guessing |

**Generation Algorithm**:
```typescript
function generateMinesweeper(width: number, height: number, mineCount: number): {
  // 1. Player clicks first cell
  // 2. Generate mines avoiding first click + neighbors
  // 3. Compute numbers
  // 4. Optionally verify "no-guess" solvability (expensive!)
}
```

**Key Insight**: "Fair" Minesweeper requires no guessing. This is computationally expensive to verify.

---

#### 13. N-Queens

**The Game**: Place N queens on NxN board so none attack each other.

| Property | Value |
|----------|-------|
| **Complexity** | P (polynomial solutions exist for all N > 3) |
| **State** | Queen positions (one per row) |
| **Constraint** | No shared row/column/diagonal |
| **Solver** | Backtracking or constructive algorithm |
| **Generation** | Trivial - many solutions exist |
| **Difficulty Metric** | N (board size) |

**Math**: For N=8, there are 92 solutions. Not typically a "puzzle" game - more of a programming exercise.

---

#### 14. KenKen

**The Game**: Fill NxN grid with 1-N, satisfying arithmetic cage constraints.

| Property | Value |
|----------|-------|
| **Complexity** | NP-complete |
| **State** | `number[][]` |
| **Constraint** | Row/column uniqueness + cage arithmetic |
| **Solver** | CSP with arithmetic constraint propagation |
| **Generation** | Generate solution → partition into cages → compute operations |
| **Difficulty Metric** | Grid size, operation types, cage sizes |

---

### Tier 3: Simulation-Based Puzzles (Need Monte Carlo / Fitness)

These puzzles involve randomness, physics, or emergent behavior. No clean state-space search works; instead, simulate gameplay to estimate difficulty.

---

#### 15. Match-3 (Candy Crush)

**The Game**: Swap adjacent candies to create matches of 3+.

| Property | Value |
|----------|-------|
| **Complexity** | NP-hard (deciding if a board is winnable) |
| **State** | Grid of candy colors + special candies |
| **Move** | `{swap: [pos1, pos2]}` |
| **Solver** | ❌ No efficient solver (RNG-dependent) |
| **Generation** | Monte Carlo simulation |
| **Difficulty Metric** | Win rate over 1000+ simulations |

**Generation Algorithm**:
```typescript
function generateMatch3Level(targetDifficulty: 'easy' | 'medium' | 'hard'): Level {
  while (true) {
    const level = randomLevel();
    const winRate = simulateGames(level, 1000); // Bot plays 1000 times
    
    if (difficultyMatches(winRate, targetDifficulty)) {
      return level;
    }
  }
}
```

**Key Insight**: Match-3 games are NOT deterministic. "Difficulty" is statistical, not mathematical.

---

#### 16. 2048

**The Game**: Slide tiles to merge same numbers, reach 2048.

| Property | Value |
|----------|-------|
| **Complexity** | PSPACE-complete (but RNG makes it statistical) |
| **State** | `number[][]` (power-of-2 values) |
| **Move** | `{direction}` |
| **Solver** | Expectimax with heuristics (corner strategy) |
| **Generation** | Fixed rules (spawn 2 or 4 randomly) |
| **Difficulty Metric** | N/A - same game, skill-based |

**Math**: Not really a "level generation" problem - the game is the same every time, just RNG varies.

---

#### 17. Tetris

**The Game**: Place falling tetrominoes to clear lines.

| Property | Value |
|----------|-------|
| **Complexity** | NP-complete (offline version), undecidable (certain variants) |
| **State** | Grid + current/next pieces |
| **Move** | Rotation + horizontal position |
| **Solver** | Heuristic placement (minimize holes, maximize lines) |
| **Generation** | Piece sequence generation (7-bag system) |
| **Difficulty Metric** | Speed (gravity), piece visibility |

**Key Insight**: Modern Tetris uses "7-bag" system for fairness - each bag contains all 7 pieces exactly once.

---

#### 18. Flow Free (Pipe Puzzle)

**The Game**: Connect colored dots with non-crossing paths that fill the entire grid.

| Property | Value |
|----------|-------|
| **Complexity** | NP-complete |
| **State** | Grid with dots and paths |
| **Constraint** | Paths connect matching dots, fill all cells, no crossing |
| **Solver** | SAT solver or CSP |
| **Generation** | Generate Hamiltonian path → split into colored segments |
| **Difficulty Metric** | Grid size, path complexity |

**Generation Algorithm**:
```typescript
function generateFlowFree(size: number, numColors: number): FlowPuzzle {
  // 1. Generate a space-filling path (Hamiltonian-like)
  // 2. Partition into numColors segments
  // 3. Mark segment endpoints as dots
  // 4. Verify unique solution
}
```

---

#### 19. Physics Puzzles (Cut the Rope, Angry Birds)

**The Game**: Manipulate physics objects to achieve goal.

| Property | Value |
|----------|-------|
| **Complexity** | Undecidable (general physics simulation) |
| **State** | Physics world state |
| **Move** | Depends on game (cut rope, launch bird, etc.) |
| **Solver** | ❌ No general solver - requires physics simulation |
| **Generation** | Design-driven + simulation testing |
| **Difficulty Metric** | Win rate, precision required |

**Key Insight**: Physics puzzles are fundamentally different - "solvability" requires simulation, not search.

---

#### 20. Baba Is You (Rule-Based)

**The Game**: Push word blocks to change the rules of the game itself.

| Property | Value |
|----------|-------|
| **Complexity** | PSPACE-complete (at minimum) |
| **State** | Grid + active rules |
| **Move** | `{direction}` (push-based) |
| **Solver** | BFS with dynamic rule interpretation |
| **Generation** | ❌ Extremely hard - requires "conceptual insight" |
| **Difficulty Metric** | Required rule discoveries |

**Key Insight**: Baba Is You levels are hand-crafted to require "aha moments." Procedural generation would miss the point.

---

## System Architecture: What We Need to Build

### Framework 1: Graph Search Lane (Existing + Extensions)

**Covers**: Ball Sort, Ice Slide, Rush Hour, 15-puzzle, Peg Solitaire, Tower of Hanoi, Klotski, Atomix

**Already Designed**:
- `TransitionPuzzleSpec<State, Move>`
- `PuzzleSolver` (BFS)
- `ReverseGenerator`
- `DifficultyMetrics`

**Extensions Needed**:
| Extension | Purpose | Effort |
|-----------|---------|--------|
| A* Solver | Handle larger state spaces (15-puzzle, Rush Hour) | 0.5d |
| IDA* Solver | Memory-efficient for huge spaces | 1d |
| Symmetry Reduction | Avoid duplicate states (rotations, reflections) | 0.5d |
| Parity Check | Validate 15-puzzle solvability | 0.5h |

---

### Framework 2: Constraint Satisfaction Lane (New)

**Covers**: Sudoku, Nonogram, Kakuro, Minesweeper, N-Queens, KenKen

**Need to Build**:

```typescript
// shared/src/puzzle/constraint/types.ts
interface ConstraintPuzzleSpec<VarId, Value> {
  variables: VarId[];
  domain(v: VarId): Value[];
  constraints: Constraint<VarId, Value>[];
}

interface Constraint<VarId, Value> {
  variables: VarId[];
  isSatisfied(assignment: Partial<Record<VarId, Value>>): boolean | 'unknown';
  propagate?(assignment: Partial<Record<VarId, Value>>): Partial<Record<VarId, Value[]>> | null;
}

// Solver
interface CSPSolver<VarId, Value> {
  solve(spec: ConstraintPuzzleSpec<VarId, Value>): {
    status: 'solved' | 'unsolved' | 'multiple';
    solutions: Record<VarId, Value>[];
  };
  countSolutions(spec: ConstraintPuzzleSpec<VarId, Value>, max: number): number;
}
```

**Key Algorithms**:
| Algorithm | Purpose | Complexity |
|-----------|---------|------------|
| Arc Consistency (AC-3) | Prune domains | O(ed³) |
| Backtracking | Search for solutions | O(d^n) worst case |
| Forward Checking | Faster backtracking | O(n²d) per node |
| Unique Solution Check | Verify puzzle validity | 2x solve time |

**Sudoku-Specific**:
```typescript
// Difficulty = which techniques are required
enum SudokuTechnique {
  NakedSingle = 1,
  HiddenSingle = 2,
  NakedPair = 3,
  PointingPair = 4,
  BoxLineReduction = 5,
  XWing = 6,
  Swordfish = 7,
  XYWing = 8,
  ForcingChain = 9,
}

function estimateSudokuDifficulty(puzzle: number[][]): {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  requiredTechniques: SudokuTechnique[];
}
```

---

### Framework 3: Simulation Lane (New)

**Covers**: Match-3, 2048, Tetris, Physics puzzles

**Need to Build**:

```typescript
// shared/src/puzzle/simulation/types.ts
interface SimulationPuzzleSpec<State, Action> {
  initialState(): State;
  applyAction(state: State, action: Action): State;
  getRandomEvent(state: State, rng: RNG): RandomEvent;
  applyRandomEvent(state: State, event: RandomEvent): State;
  isWin(state: State): boolean;
  isLose(state: State): boolean;
}

interface SimulationSolver<State, Action> {
  estimateWinRate(
    spec: SimulationPuzzleSpec<State, Action>,
    level: LevelConfig,
    simulations: number
  ): number;
}

// Monte Carlo bot
function playGame<State, Action>(
  spec: SimulationPuzzleSpec<State, Action>,
  strategy: (state: State) => Action,
  rng: RNG
): 'win' | 'lose' {
  let state = spec.initialState();
  while (!spec.isWin(state) && !spec.isLose(state)) {
    const action = strategy(state);
    state = spec.applyAction(state, action);
    const event = spec.getRandomEvent(state, rng);
    state = spec.applyRandomEvent(state, event);
  }
  return spec.isWin(state) ? 'win' : 'lose';
}
```

---

## Implementation Priority Matrix

| Puzzle | Paradigm | Effort | Value | Priority |
|--------|----------|--------|-------|----------|
| Ball Sort | Graph | ✅ Done | High | 1 |
| Ice Slide | Graph | ✅ Done | High | 1 |
| Rush Hour | Graph | 1d | High | 2 |
| 15-Puzzle | Graph | 0.5d | Medium | 3 |
| Sudoku | CSP | 2d | Very High | 2 |
| Nonogram | CSP | 2d | High | 3 |
| Match-3 | Simulation | 3d | Very High | 4 |
| Flow Free | CSP + Path | 2d | Medium | 5 |
| Minesweeper | CSP | 1d | Medium | 4 |
| Peg Solitaire | Graph | 0.5d | Low | 6 |

---

## Difficulty Progression System Design

### Universal Difficulty Model

```typescript
interface DifficultyProfile {
  // Computed metrics
  solutionLength?: number;      // Graph puzzles
  branchingFactor?: number;     // Graph puzzles
  requiredTechniques?: string[]; // CSP puzzles
  winRate?: number;             // Simulation puzzles
  
  // Universal
  estimatedTime: number;        // Seconds for average player
  cognitiveLoad: 'low' | 'medium' | 'high';
  frustrationRisk: 'low' | 'medium' | 'high';
}

interface ProgressionCurve {
  levels: Array<{
    levelNumber: number;
    targetDifficulty: DifficultyProfile;
    newMechanics?: string[];    // Tutorial levels
    isCheckpoint?: boolean;     // Slightly easier after hard stretch
  }>;
}
```

### The "Fractal Difficulty Curve"

Based on Candy Crush research:

```
Difficulty
    ^
    |     /\      /\
    |    /  \    /  \      /\
    |   /    \  /    \    /  \
    |  /      \/      \  /    \
    | /                \/      \
    +-------------------------->
      1   5   10   15   20   25
                Level Number

Key: Peaks at 5, 10, 15, 20 (checkpoint bosses)
     Valleys at 6, 11, 16, 21 (relief levels)
```

### Adaptive Difficulty (Future)

```typescript
interface PlayerModel {
  skillLevel: number;           // 0-100, learned from performance
  recentWinRate: number;        // Last 10 levels
  frustrationIndicators: {
    rapidRestarts: boolean;     // Restarting immediately
    longPauses: boolean;        // Stuck for >30s
    hintUsage: number;
  };
}

function selectNextLevel(player: PlayerModel, levelPool: Level[]): Level {
  const targetWinRate = player.frustrationIndicators.rapidRestarts 
    ? 0.7  // Easier if frustrated
    : 0.5; // Normal challenge
    
  return levelPool.find(l => 
    Math.abs(l.estimatedWinRate(player.skillLevel) - targetWinRate) < 0.1
  );
}
```

---

## Summary: What We're Building

### Phase 1 (Current): Graph Search Foundation
- ✅ `TransitionPuzzleSpec<State, Move>`
- ✅ BFS Solver
- ✅ Reverse Generator
- ✅ Ball Sort + Ice Slide implementations

### Phase 2 (Future): Graph Search Extensions
- A* Solver for larger state spaces
- Rush Hour, 15-Puzzle, Peg Solitaire specs
- Symmetry reduction utilities

### Phase 3 (Future): CSP Framework
- `ConstraintPuzzleSpec<VarId, Value>`
- Backtracking solver with AC-3 propagation
- Unique solution verification
- Sudoku spec with technique-based difficulty

### Phase 4 (Future): Simulation Framework
- `SimulationPuzzleSpec<State, Action>`
- Monte Carlo win-rate estimation
- Match-3 bot strategies
- Statistical difficulty calibration

### Phase 5 (Future): Progressive Systems
- Universal `DifficultyProfile` model
- Fractal difficulty curve generator
- Player modeling for adaptive difficulty
- Hint generation based on solver knowledge

---

## Appendix: Complexity Class Reference

| Class | Meaning | Examples |
|-------|---------|----------|
| **P** | Solvable in polynomial time | Tower of Hanoi, N-Queens |
| **NP** | Verifiable in polynomial time | Sudoku (check solution) |
| **NP-complete** | Hardest problems in NP | Sudoku, Minesweeper, Nonogram |
| **PSPACE** | Polynomial space, exponential time | Sokoban, Rush Hour |
| **PSPACE-complete** | Hardest in PSPACE | Sokoban (general) |
| **Undecidable** | No algorithm exists | General physics simulation |

**Practical Implication**: NP-complete means "probably no fast algorithm, but small instances are fine."

For mobile games with small boards, complexity class rarely matters - brute force works.
