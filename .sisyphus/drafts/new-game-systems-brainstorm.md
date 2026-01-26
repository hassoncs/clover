# New Game Systems Brainstorm

## Current Systems Inventory

### Slot-Based Systems (New Architecture)
| System | Slots | Status |
|--------|-------|--------|
| **Match3** | matchDetection, swapRule, scoring, pieceSpawner, feedback | ✅ Complete |
| **Tetris** | rotationRule, lineClearing, pieceSpawner, dropSpeed | ✅ Complete |

### Existing Test Games
| Game | Type | Key Mechanics |
|------|------|---------------|
| gemCrush | Match3 | Grid swap, color matching |
| slopeggle | Peggle-style | Ball physics, peg hitting |
| breakoutBouncer | Breakout | Paddle, ball, bricks |
| physicsStacker | Stacking | Drop timing, balance |
| pinballLite | Pinball | Flippers, bumpers, ball |
| simplePlatformer | Platformer | Jump, collect, avoid |
| towerDefense | Strategy | Spawning, pathing, towers |
| comboFighter | Combat | Combos, timing |
| dungeonCrawler | RPG | Movement, combat |
| rpgProgressionDemo | Demo | Stats, leveling |

---

## 10 New Game Ideas (Prioritized)

### 🥇 Priority 1: Quick Wins (< 1 week each)

#### 1. **Flappy Bird / Tappy Jump**
**Popularity**: ⭐⭐⭐⭐⭐ (Viral phenomenon)  
**Complexity**: Very Low  
**Why**: Minimal slots, uses existing physics

**Slots**:
- `jumpForce` (pure): Calculate jump impulse
- `obstacleSpawner` (pure): Generate pipe gaps  
- `scoring` (pure): Points per pipe passed
- `difficultyScaling` (policy): Gap size over time

**Reuses**: Physics engine, collision detection, spawn behaviors

**Implementation**: ~2-3 days

---

#### 2. **2048 / Slide Puzzle**
**Popularity**: ⭐⭐⭐⭐⭐ (200M+ downloads)  
**Complexity**: Low  
**Why**: Grid-based like Match3, simple merge logic

**Slots**:
- `slideRule` (policy): How tiles move (4-direction, 8-direction)
- `mergeLogic` (pure): What happens when tiles collide (2048, Threes-style)
- `tileSpawner` (pure): Where/what new tiles appear
- `scoring` (pure): Points per merge

**Reuses**: Grid concepts from Match3, tag-based state

**Implementation**: ~3-4 days

---

#### 3. **Memory Match / Concentration**
**Popularity**: ⭐⭐⭐⭐ (Great for kids 6-9)  
**Complexity**: Low  
**Why**: Grid-based, simple flip/match logic

**Slots**:
- `cardFlipping` (policy): How cards flip (single, double reveal)
- `matchLogic` (pure): What constitutes a match (pair, triple)
- `cardShuffler` (pure): Distribution algorithm
- `timerRule` (policy): Time limits, penalties

**Reuses**: Grid system, tag-based states (flipped, matched)

**Implementation**: ~2-3 days

---

### 🥈 Priority 2: Medium Effort (1-2 weeks each)

#### 4. **Bubble Shooter / Puzzle Bobble**
**Popularity**: ⭐⭐⭐⭐⭐ (Billions of plays)  
**Complexity**: Medium  
**Why**: Combines shooting mechanics + Match3 color matching

**Slots**:
- `aimingRule` (policy): Arc preview, angle limits
- `bubbleAttachment` (pure): Where bubble sticks on collision
- `matchDetection` (pure): **REUSE from Match3** with flood-fill
- `popAnimation` (hook): Visual feedback
- `ceilingDescent` (policy): How ceiling moves down

**Reuses**: matchDetection from Match3, pieceSpawner concepts

**Implementation**: ~1 week

---

#### 5. **Snake**
**Popularity**: ⭐⭐⭐⭐ (Classic, Nokia nostalgia)  
**Complexity**: Medium  
**Why**: Grid movement, body segment management

**Slots**:
- `movementRule` (policy): Grid-based, smooth, wrap-around
- `growthLogic` (pure): How snake grows (eat = +1, +2, etc.)
- `foodSpawner` (pure): Where food appears
- `collisionRule` (policy): Self-collision, wall behavior
- `speedScaling` (pure): Speed increase over time

**Reuses**: Grid concepts, entity spawning

**Implementation**: ~1 week

---

#### 6. **Connect 4 / Four in a Row**
**Popularity**: ⭐⭐⭐⭐ (Classic strategy)  
**Complexity**: Medium  
**Why**: Uses Match3 win detection concepts!

**Slots**:
- `dropRule` (pure): Gravity-based column drop
- `winDetection` (pure): **REUSE Match3 matchDetection** (4-in-a-row)
- `turnManager` (policy): Player alternation
- `aiOpponent` (policy): Computer difficulty levels

**Reuses**: matchDetection from Match3 (modify for 4-length)

**Implementation**: ~1 week

---

### 🥉 Priority 3: Higher Effort (2-3 weeks each)

#### 7. **Puyo Puyo / Dr. Mario**
**Popularity**: ⭐⭐⭐⭐ (Competitive puzzle classic)  
**Complexity**: High  
**Why**: COMBINES Tetris (falling pairs) + Match3 (color matching)!

**Slots**:
- `pairRotation` (policy): **REUSE Tetris rotationRule**
- `dropSpeed` (pure): **REUSE Tetris dropSpeed**
- `matchDetection` (pure): **REUSE Match3** (flood-fill, 4+ connected)
- `chainScoring` (pure): Combo multipliers
- `garbageSystem` (policy): Attack opponent (multiplayer)

**Reuses**: BOTH Match3 and Tetris systems combined!

**Implementation**: ~2 weeks (worth it for system validation)

---

#### 8. **Minesweeper**
**Popularity**: ⭐⭐⭐⭐ (Windows classic, 1B+ plays)  
**Complexity**: Medium-High  
**Why**: Grid-based, logical deduction

**Slots**:
- `mineDistribution` (pure): Random, guaranteed-solvable, difficulty tiers
- `revealLogic` (pure): Flood-fill reveal for zeros
- `flaggingRule` (policy): Toggle flag, question mark
- `firstClickSafe` (policy): Ensure first click isn't a mine

**Reuses**: Grid system, flood-fill concepts from Match3

**Implementation**: ~1.5 weeks

---

#### 9. **Solitaire / Klondike**
**Popularity**: ⭐⭐⭐⭐⭐ (Most played computer game ever)  
**Complexity**: High  
**Why**: Card system proof-of-concept (was in roadmap)

**Slots**:
- `shuffleAlgorithm` (pure): Fair shuffle
- `drawRule` (policy): Draw 1 vs draw 3
- `moveValidation` (pure): Legal move checking
- `autoComplete` (policy): Auto-finish when solvable
- `undoSystem` (policy): Undo stack behavior

**Reuses**: Would validate CardGameSystem from roadmap

**Implementation**: ~2-3 weeks

---

#### 10. **Rhythm / Music Game**
**Popularity**: ⭐⭐⭐⭐ (Guitar Hero, Tap Tap)  
**Complexity**: High  
**Why**: Timing-based, could use note "spawner" slots

**Slots**:
- `noteSpawner` (pure): Beat-synced note generation
- `hitDetection` (pure): Timing windows (perfect/good/miss)
- `laneRule` (policy): Number of lanes, note types
- `comboSystem` (pure): Multiplier mechanics
- `scoring` (pure): Points per hit type

**Reuses**: Spawn timing, scoring systems

**Implementation**: ~2-3 weeks

---

## Priority Matrix

| Game | Popularity | Ease | System Reuse | Priority Score |
|------|------------|------|--------------|----------------|
| **Flappy Bird** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Medium | **#1** |
| **2048** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | High (grid) | **#2** |
| **Memory Match** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | High (grid) | **#3** |
| **Bubble Shooter** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | High (Match3) | **#4** |
| **Snake** | ⭐⭐⭐⭐ | ⭐⭐⭐ | Medium | **#5** |
| **Connect 4** | ⭐⭐⭐⭐ | ⭐⭐⭐ | High (Match3) | **#6** |
| **Puyo Puyo** | ⭐⭐⭐⭐ | ⭐⭐ | **VERY HIGH** | **#7** (validates architecture) |
| **Minesweeper** | ⭐⭐⭐⭐ | ⭐⭐⭐ | Medium | **#8** |
| **Solitaire** | ⭐⭐⭐⭐⭐ | ⭐⭐ | CardSystem | **#9** |
| **Rhythm Game** | ⭐⭐⭐⭐ | ⭐⭐ | Low | **#10** |

---

## Recommended Implementation Order

### Phase 1: Quick Wins (Week 1-2)
1. **Flappy Bird** - Prove simple slot system works
2. **2048** - Prove grid slot system works
3. **Memory Match** - Good for kids, simple

### Phase 2: Match3 Reuse (Week 3-4)
4. **Bubble Shooter** - Reuse matchDetection
5. **Connect 4** - Reuse matchDetection for win detection

### Phase 3: System Combos (Week 5-6)
6. **Snake** - Grid + spawning
7. **Puyo Puyo** - **Tetris + Match3 hybrid** (architecture proof!)

### Phase 4: Advanced (Week 7+)
8. **Minesweeper** - Logical puzzle
9. **Solitaire** - CardSystem proof
10. **Rhythm Game** - New timing system

---

## Key Insight: Slot Reuse Opportunities

```
Match3.matchDetection → Bubble Shooter, Connect 4, Puyo Puyo
Match3.scoring → Almost all games
Tetris.rotationRule → Puyo Puyo pairs
Tetris.dropSpeed → Puyo Puyo, Stacker variants
Grid system → 2048, Memory, Snake, Minesweeper
Spawn system → Flappy, Snake, Rhythm
```

The slot architecture enables **mix-and-match game creation** - Puyo Puyo being the perfect proof that combining Tetris + Match3 slots creates a new genre!
