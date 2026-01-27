# Physics-Native Puzzle Generation Strategy

> **Status**: Strategic Pivot  
> **Purpose**: Reframe puzzle generation around Slopcade's physics engine strengths  
> **Created**: 2026-01-26  
> **Supersedes**: General puzzle taxonomy (kept for reference, Ball Sort/Ice Slide still valid)

## Executive Summary

After analyzing 20+ puzzle game types, the key insight is:

> **Slopcade is a physics playground, not a logic puzzle engine.**

Rather than building CSP solvers for Sudoku-class puzzles, we should focus on **procedural physics level generation** that leverages our existing Godot 4 / Box2D infrastructure.

### The Core Distinction

| Logic Puzzles | Physics Puzzles |
|---------------|-----------------|
| Exact solution exists | Many solutions possible |
| BFS/backtracking finds optimal | Simulation verifies feasibility |
| Deterministic | Probabilistic (physics variance) |
| "Is there a path?" | "Can a reasonable player succeed?" |
| **Not our strength** | **Our competitive advantage** |

---

## What Slopcade Already Has

| Asset | Capability |
|-------|------------|
| Godot 4 physics engine | Real-time rigid body simulation |
| Box2D integration | Collision, joints, forces, queries |
| Behavior system | Entity interactions, spawning, AI |
| 10 game templates | Slingshot, rope, vehicles, stacking, pinball... |

**These are physics-native capabilities.** Building Sudoku solvers ignores this foundation.

---

## Top 10 Physics-Native Puzzle Games

### Tier 1: Already Have Templates (Enhance with Procedural Generation)

---

#### 1. Destruction Physics (Angry Birds Style)

**Existing Template**: Slingshot Destruction ✅

**The Game**: Launch projectile to topple/destroy structures and hit targets.

| Property | Value |
|----------|-------|
| **Physics** | Projectile motion, structural collapse, joint breaking |
| **Solvability** | Probabilistic (many solutions via physics variance) |
| **Generation** | Structure blueprints + weak points + target placement |
| **Difficulty** | Structure stability, shot precision required, lives |

**What to Build**:
```typescript
interface StructureBlueprint {
  blocks: Array<{
    type: 'wood' | 'stone' | 'glass' | 'ice';
    shape: 'box' | 'plank' | 'triangle';
    position: Vec2;
    rotation: number;
    health?: number;
  }>;
  targets: Array<{
    position: Vec2;
    points: number;
    required: boolean; // Must hit to win
  }>;
  weakPoints: Vec2[]; // Structural vulnerabilities
}

function generateStructure(params: {
  difficulty: number;
  blockBudget: number;
  targetCount: number;
}): StructureBlueprint {
  // 1. Generate base (stable foundation)
  // 2. Stack layers using physics-stable patterns
  // 3. Add targets in protected positions
  // 4. Identify weak points (thin supports, top-heavy sections)
  // 5. Verify structure doesn't collapse on spawn
}
```

**Validation**: Run physics sim for 2 seconds - structure must remain standing.

---

#### 2. Rope/Chain Puzzles (Cut the Rope Style)

**Existing Template**: Rope Physics ✅

**The Game**: Cut ropes to swing candy/object to goal, collect stars.

| Property | Value |
|----------|-------|
| **Physics** | Pendulum motion, rope joints, collision |
| **Solvability** | ✅ Can simulate swing trajectories |
| **Generation** | Anchor points + obstacles + goal + collectibles |
| **Difficulty** | Timing precision, multi-cut sequences, obstacle density |

**What to Build**:
```typescript
interface RopeLevel {
  anchors: Vec2[];              // Rope attachment points
  payload: {position: Vec2};    // The swinging object
  goal: {position: Vec2; radius: number};
  stars: Vec2[];                // Optional collectibles
  obstacles: Shape[];           // Hazards to avoid
  ropeConnections: Array<{anchor: number; payload: boolean}>;
}

function generateRopeLevel(difficulty: number): RopeLevel {
  // 1. Place goal position
  // 2. Calculate swing arcs that could reach goal
  // 3. Place anchors along valid arc paths
  // 4. Add obstacles that require timing
  // 5. Place stars on swing paths
  // 6. Simulate to verify reachability
}
```

**Validation**: Bot that cuts ropes at optimal timing must reach goal >90% of attempts.

---

#### 3. Vehicle Construction (Bad Piggies Style)

**Existing Template**: Hill Climb Vehicle ✅

**The Game**: Build vehicle from parts to traverse terrain and reach goal.

| Property | Value |
|----------|-------|
| **Physics** | Motors, wheels, hinges, weight distribution |
| **Solvability** | Open-ended (many valid vehicle designs) |
| **Generation** | Terrain profile + parts palette + goal position |
| **Difficulty** | Part budget, terrain complexity, gaps/obstacles |

**What to Build**:
```typescript
interface VehicleLevel {
  terrain: Array<{x: number; y: number}>; // Ground profile
  start: Vec2;
  goal: Vec2;
  availableParts: {
    wheels: number;
    boxes: number;
    motors: number;
    springs: number;
    balloons: number;
  };
  hazards: Array<{type: 'spike' | 'water' | 'gap'; bounds: Rect}>;
}

function generateTerrain(params: {
  length: number;
  difficulty: number;
  style: 'hills' | 'cliffs' | 'gaps';
}): VehicleLevel {
  // 1. Generate base terrain using noise/perlin
  // 2. Add difficulty features (steep slopes, gaps)
  // 3. Calculate minimum parts needed
  // 4. Add buffer parts (player has room for creativity)
  // 5. Simulate with "reference vehicle" to verify
}
```

**Validation**: Simple car (2 wheels + 1 motor) must be able to complete level.

---

#### 4. Physics Stacking (Tetris meets Physics)

**Existing Template**: Physics Stacker ✅

**The Game**: Stack pieces to reach height goal or build stable structure.

| Property | Value |
|----------|-------|
| **Physics** | Gravity, center of mass, friction, wobble |
| **Solvability** | Score-based (no strict win/lose) |
| **Generation** | Piece shapes + drop sequence + goals |
| **Difficulty** | Piece irregularity, wind effects, speed |

**What to Build**:
```typescript
interface StackingLevel {
  pieceSequence: Shape[];       // What pieces will drop
  targetHeight: number;         // Win condition
  platform: {width: number};    // Base to stack on
  modifiers?: {
    wind?: {strength: number; variability: number};
    earthquakes?: {frequency: number; magnitude: number};
  };
}

function generateStackingLevel(difficulty: number): StackingLevel {
  // 1. Generate piece sequence (biased toward difficulty)
  // 2. Calculate theoretical max height
  // 3. Set target at 60-80% of theoretical max
  // 4. Add environmental modifiers for hard levels
}
```

---

#### 5. Pinball with Objectives

**Existing Template**: Pinball Lite ✅

**The Game**: Pinball with specific target sequences to complete.

| Property | Value |
|----------|-------|
| **Physics** | Flippers, bumpers, ramps, ball dynamics |
| **Solvability** | Probabilistic (skill + physics variance) |
| **Generation** | Table layout + target placement + scoring |
| **Difficulty** | Target accessibility, multiball, time limits |

**What to Build**:
```typescript
interface PinballLevel {
  layout: {
    flippers: FlipperConfig[];
    bumpers: BumperConfig[];
    ramps: RampConfig[];
    targets: TargetConfig[];  // Things to hit
    lanes: LaneConfig[];
  };
  objectives: Array<{
    type: 'hit_target' | 'hit_sequence' | 'score_threshold';
    params: any;
  }>;
}

function generatePinballTable(theme: string): PinballLevel {
  // 1. Generate basic table geometry
  // 2. Place flippers (always same position)
  // 3. Add bumpers in reachable positions
  // 4. Create ramp paths to targets
  // 5. Define objectives based on layout
}
```

---

#### 6. Bumper Arena (Physics Combat)

**Existing Template**: Bumper Arena ✅

**The Game**: Push enemies off platform or into hazards.

| Property | Value |
|----------|-------|
| **Physics** | Impulse, knockback, arena boundaries |
| **Solvability** | AI difficulty tuning |
| **Generation** | Arena shape + hazard placement + enemy count |
| **Difficulty** | Enemy aggression, platform stability, hazard density |

**What to Build**:
```typescript
interface ArenaLevel {
  platform: Shape;              // Arena boundaries
  hazards: Array<{type: 'spike' | 'void' | 'crusher'; bounds: Rect}>;
  enemies: Array<{
    type: 'pusher' | 'charger' | 'spinner';
    aggression: number;
    mass: number;
  }>;
  powerups?: Array<{type: string; spawnPoint: Vec2}>;
}

function generateArena(difficulty: number): ArenaLevel {
  // 1. Generate platform shape (shrinks with difficulty)
  // 2. Add hazards at edges
  // 3. Spawn enemies with increasing aggression
  // 4. Place powerups for player advantage
}
```

---

### Tier 2: New Templates to Build

---

#### 7. Merge/Stack Puzzles (Triple Town Style)

**The Game**: Drop pieces that merge when matching, with gravity and cascades.

| Property | Value |
|----------|-------|
| **Physics** | Gravity, collision, settling, cascade effects |
| **Solvability** | ✅ Always winnable if space exists |
| **Generation** | Board size + merge rules + spawn rates |
| **Difficulty** | Spawn rate, piece variety, board constraints |

**Why Perfect for Slopcade**: Combines puzzle logic with satisfying physics (pieces fall, merge explosions, chain reactions).

```typescript
interface MergeLevel {
  boardSize: {rows: number; cols: number};
  mergeRules: Array<{
    inputs: string[];   // e.g., ['grass', 'grass', 'grass']
    output: string;     // e.g., 'bush'
  }>;
  spawnPool: Array<{type: string; weight: number}>;
  winCondition: {type: string; count: number}; // e.g., 'castle', 1
}
```

---

#### 8. Chain Reaction / Rube Goldberg (Amazing Alex Style)

**The Game**: Place objects to create chain reaction reaching goal.

| Property | Value |
|----------|-------|
| **Physics** | Dominos, balls, ramps, triggers, timing |
| **Solvability** | ✅ Simulate forward to verify |
| **Generation** | Start/end positions + available parts + obstacles |
| **Difficulty** | Timing precision, part scarcity |

```typescript
interface ChainReactionLevel {
  start: {type: 'ball' | 'domino'; position: Vec2};
  goal: {position: Vec2; trigger: 'collision' | 'sensor'};
  availableParts: Array<{type: string; count: number}>;
  fixedParts: Array<{type: string; position: Vec2; rotation: number}>;
  placementZones: Rect[];  // Where player can place parts
}

function generateChainLevel(difficulty: number): ChainReactionLevel {
  // 1. Design a working solution
  // 2. Remove some parts (player must place them)
  // 3. Add decoy parts that don't help
  // 4. Verify solution still works
}
```

---

#### 9. Marble/Ball Maze (Labyrinth Style)

**The Game**: Tilt device to roll ball through maze to goal.

| Property | Value |
|----------|-------|
| **Physics** | Gravity, friction, momentum, collision |
| **Solvability** | Path exists = solvable |
| **Generation** | Maze algorithm + tilt mechanics |
| **Difficulty** | Path narrowness, hazard density, time limits |

```typescript
interface MarbleLevel {
  maze: {
    walls: Segment[];
    holes: Circle[];      // Fall-through hazards
    bumpers: Circle[];    // Bouncy obstacles
  };
  start: Vec2;
  goal: Vec2;
  collectibles?: Vec2[];
}

function generateMaze(params: {
  size: number;
  difficulty: number;
  style: 'classic' | 'open' | 'branching';
}): MarbleLevel {
  // 1. Generate maze using recursive backtracking or Prim's
  // 2. Widen paths based on difficulty
  // 3. Add holes along dead-ends (punishment for wrong path)
  // 4. Place collectibles on optimal path
}
```

---

#### 10. Fluid/Particle Puzzles (Where's My Water Style)

**The Game**: Dig paths to direct water/particles to goal.

| Property | Value |
|----------|-------|
| **Physics** | Particle simulation, flow dynamics |
| **Solvability** | Path connectivity + particle count |
| **Generation** | Terrain + source + drains + obstacles |
| **Difficulty** | Multi-path splitting, hazards, limited digging |

```typescript
interface FluidLevel {
  terrain: number[][];        // Diggable/solid cells
  source: {position: Vec2; rate: number};
  goal: {position: Vec2; requiredAmount: number};
  hazards: Array<{type: 'poison' | 'fire' | 'drain'; position: Vec2}>;
  collectibles?: Array<{position: Vec2; type: 'duck'}>;
}

function generateFluidLevel(difficulty: number): FluidLevel {
  // 1. Place source at top, goal at bottom
  // 2. Generate terrain with blockages
  // 3. Ensure at least one valid dig path
  // 4. Add hazards that require path planning
  // 5. Simulate to verify water reaches goal
}
```

---

## "Solvability" for Physics Games

### The Paradigm Shift

For logic puzzles: **"Does a solution exist?"** (Yes/No)

For physics puzzles: **"Can a reasonable player succeed?"** (Probability)

### Physics Solvability Metrics

```typescript
interface PhysicsSolvability {
  // Core question: Is this level fair?
  botWinRate: number;           // Perfect bot success rate (should be >95%)
  humanEstimatedWinRate: number; // With human error (should be >30%)
  
  // Fairness indicators
  requiredPrecision: 'low' | 'medium' | 'high' | 'pixel-perfect';
  timingWindows: number[];      // In milliseconds (>200ms = fair)
  recoveryPossible: boolean;    // Can recover from small mistakes?
  
  // Fun indicators
  hasMultipleSolutions: boolean;
  allowsCreativity: boolean;
  hasSatisfyingPhysics: boolean; // Things explode/collapse/cascade
}
```

### Validation Pipeline

```typescript
async function validatePhysicsLevel(level: PhysicsLevel): Promise<{
  isValid: boolean;
  solvability: PhysicsSolvability;
  issues: string[];
}> {
  // 1. Stability check: Does level stay intact for 2 seconds?
  const stabilityResult = await simulateIdle(level, 2000);
  if (!stabilityResult.stable) {
    return {isValid: false, issues: ['Level collapses on spawn']};
  }
  
  // 2. Perfect bot test: Can optimal play win?
  const perfectResults = await runSimulations(level, perfectBot, 100);
  if (perfectResults.winRate < 0.95) {
    return {isValid: false, issues: ['Level may be impossible']};
  }
  
  // 3. Noisy bot test: Can humans win?
  const noisyResults = await runSimulations(level, noisyBot, 100);
  if (noisyResults.winRate < 0.30) {
    return {isValid: false, issues: ['Level too precise for humans']};
  }
  
  // 4. Timing analysis: Are timing windows fair?
  const timingWindows = analyzeTimingRequirements(perfectResults);
  if (timingWindows.some(w => w < 100)) {
    return {isValid: false, issues: ['Requires frame-perfect timing']};
  }
  
  return {
    isValid: true,
    solvability: {
      botWinRate: perfectResults.winRate,
      humanEstimatedWinRate: noisyResults.winRate,
      requiredPrecision: classifyPrecision(noisyResults),
      timingWindows,
      recoveryPossible: perfectResults.hadRecoveries,
      hasMultipleSolutions: perfectResults.uniqueStrategies > 1,
      allowsCreativity: true,
      hasSatisfyingPhysics: true,
    },
  };
}
```

---

## Difficulty Progression for Physics Games

### The "Fractal Difficulty Curve"

Based on Candy Crush research - difficulty is not linear:

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

Key: Peaks at 5, 10, 15, 20 (checkpoint challenges)
     Valleys at 6, 11, 16, 21 (relief levels)
```

### Physics-Specific Difficulty Knobs

| Knob | Easy | Medium | Hard |
|------|------|--------|------|
| **Lives/Attempts** | 5 | 3 | 1 |
| **Time Limit** | None | Generous | Tight |
| **Precision Required** | Low | Medium | High |
| **Recovery Possible** | Always | Sometimes | Rarely |
| **Physics Variance** | High (forgiving) | Medium | Low (precise) |
| **Visual Clarity** | Obvious targets | Some hidden | Obscured |

### Progressive Mechanics Introduction

```typescript
interface LevelProgression {
  levels: Array<{
    number: number;
    newMechanics?: string[];    // Tutorial: "This level introduces ramps"
    difficulty: DifficultyProfile;
    isCheckpoint?: boolean;     // Boss level before relief
  }>;
}

// Example: Angry Birds progression
const angryBirdsProgression: LevelProgression = {
  levels: [
    {number: 1, newMechanics: ['basic_shot'], difficulty: {precision: 'low'}},
    {number: 2, difficulty: {precision: 'low'}},
    {number: 3, newMechanics: ['wood_blocks'], difficulty: {precision: 'low'}},
    {number: 4, difficulty: {precision: 'medium'}},
    {number: 5, isCheckpoint: true, difficulty: {precision: 'medium'}}, // Boss
    {number: 6, difficulty: {precision: 'low'}}, // Relief
    {number: 7, newMechanics: ['stone_blocks'], difficulty: {precision: 'medium'}},
    // ...
  ],
};
```

---

## System Architecture

### What We Need to Build

#### 1. Procedural Structure Generator

For destruction puzzles:

```typescript
// shared/src/generation/structures.ts
interface StructureGenerator {
  generate(params: StructureParams): StructureBlueprint;
  validate(structure: StructureBlueprint): ValidationResult;
  estimateDifficulty(structure: StructureBlueprint): number;
}

// Grammar-based generation
const STRUCTURE_GRAMMAR = {
  'tower': ['base', 'column', 'column', 'top'],
  'pyramid': ['wide_base', 'medium_layer', 'narrow_layer', 'peak'],
  'bridge': ['pillar', 'span', 'pillar'],
  // ...
};
```

#### 2. Terrain Generator

For vehicle and marble games:

```typescript
// shared/src/generation/terrain.ts
interface TerrainGenerator {
  generateHills(params: HillParams): TerrainProfile;
  generateMaze(params: MazeParams): MazeLayout;
  generatePlatforms(params: PlatformParams): PlatformLayout;
}

function generateHillTerrain(params: {
  length: number;
  roughness: number;  // 0 = smooth, 1 = jagged
  steepness: number;  // Max slope angle
}): Vec2[] {
  // Use Perlin noise with octaves
  // Enforce max slope constraint
  // Add flat rest areas periodically
}
```

#### 3. Physics Simulation Validator

```typescript
// shared/src/generation/validator.ts
interface PhysicsValidator {
  validateStability(level: Level): Promise<StabilityResult>;
  runBotSimulations(level: Level, bot: Bot, count: number): Promise<SimResults>;
  estimateHumanDifficulty(simResults: SimResults): DifficultyProfile;
}

// Headless Godot simulation (or simplified JS physics for fast iteration)
async function simulateLevel(level: Level, inputs: InputSequence): Promise<SimulationResult> {
  // Option A: Run actual Godot headless
  // Option B: Use simplified physics model for speed
  // Option C: Hybrid - fast JS check, Godot verification
}
```

#### 4. Difficulty Calibration System

```typescript
// shared/src/generation/difficulty.ts
interface DifficultyCalibrator {
  calibrate(level: Level, targetDifficulty: number): CalibratedLevel;
  measureDifficulty(level: Level): Promise<DifficultyMetrics>;
}

function calibrateLevel(level: Level, target: DifficultyProfile): Level {
  let current = level;
  let metrics = await measureDifficulty(current);
  
  while (!meetsTarget(metrics, target)) {
    if (metrics.tooHard) {
      current = makeEasier(current); // Add lives, widen paths, etc.
    } else {
      current = makeHarder(current); // Remove aids, add hazards
    }
    metrics = await measureDifficulty(current);
  }
  
  return current;
}
```

---

## Implementation Priority

| Phase | What | Effort | Value |
|-------|------|--------|-------|
| **1** | Structure Generator (Angry Birds) | 2-3d | Very High |
| **2** | Physics Validator Pipeline | 2d | Very High |
| **3** | Terrain Generator (Hills/Maze) | 2d | High |
| **4** | Difficulty Calibration | 1-2d | High |
| **5** | Merge Puzzle Template | 2d | Medium |
| **6** | Chain Reaction Template | 2-3d | Medium |

### Phase 1 Focus: Angry Birds Structure Generation

Since we already have the slingshot template, the highest-value work is:

1. **Structure blueprint format** - Define how structures are represented
2. **Grammar-based generator** - Generate valid structures procedurally
3. **Stability validator** - Verify structures don't collapse on spawn
4. **Bot simulator** - Test if structures can be destroyed
5. **Difficulty estimator** - Calibrate based on simulation results

---

## Comparison: Logic vs Physics Approach

| Aspect | Logic Puzzles (Old Plan) | Physics Puzzles (New Plan) |
|--------|-------------------------|---------------------------|
| **Solver** | BFS/CSP/Backtracking | Monte Carlo Simulation |
| **Validation** | "Solution exists" | "Bot can win >95%" |
| **Difficulty** | Solution length | Win rate + precision |
| **Generation** | Reverse-from-goal | Forward design + calibration |
| **Slopcade Fit** | Low (no physics) | High (leverages engine) |
| **Unique Value** | Competing with Sudoku apps | Physics sandbox creativity |

---

## Conclusion

**The strategic pivot**: Instead of building CSP solvers for Sudoku, build **procedural physics level generators** that:

1. Leverage Godot's physics engine
2. Create satisfying destruction/cascade/swing moments
3. Validate via simulation rather than graph search
4. Calibrate difficulty through bot testing

This plays to Slopcade's strengths and creates a unique product rather than competing with established logic puzzle apps.

---

## Appendix: What Stays from the Original Plan

The original `docs/plans/puzzle-generation-system.md` is still valid for:

- **Ball Sort** - State machine puzzle, BFS solver works
- **Ice Slide** - Sokoban-lite, reverse-from-goal works
- **15-Puzzle** - If we add it (pure sliding tile)

These are the exceptions that prove the rule - they're state-machine puzzles that happen to have visual physics, but the core gameplay is logical.

For everything else: **embrace the physics**.
