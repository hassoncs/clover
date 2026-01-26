# New Slot-Based Game Systems Implementation Plan

## Context

### What We Built
The Game Engine Redesign introduced a **slot-based architecture** that enables swappable game mechanics:

**Current Systems:**
| System | File | Slots |
|--------|------|-------|
| **Match3** | `app/lib/game-engine/systems/match3/slots.ts` | matchDetection, swapRule, scoring, pieceSpawner, feedback |
| **Tetris** | `app/lib/game-engine/systems/tetris/slots.ts` | rotationRule, lineClearing, pieceSpawner, dropSpeed |

**Key Architecture:**
- `SlotContract` defines what a slot does (pure/policy/hook)
- `SlotImplementation` provides swappable algorithms
- `registerXxxSlotImplementations()` bulk-registers defaults
- Tags like `sys.match3:selected`, `sys.tetris:falling` drive visual states
- `conditionalBehaviors` in templates respond to tags

### Reference Files
```
shared/src/systems/slots/types.ts      # SlotContract, SlotImplementation
shared/src/systems/slots/SlotRegistry.ts  # Global registry
shared/src/validation/playable.ts      # validatePlayable(), constraints
api/src/ai/classifier.ts               # Game type detection keywords
api/src/ai/generator.ts                # AI generation prompts
api/src/ai/templates/                  # Match3, Tetris templates
```

### Goal
Implement new game systems that leverage and validate the slot architecture, prioritized by:
1. Ease of implementation (reusing existing slots)
2. Popularity (user appeal)
3. Architecture validation (combining systems)

---

## Game Implementation Priority

### Phase 1: Quick Wins (2-3 days each)

#### 1. Flappy Bird System
**Popularity**: Viral phenomenon, extremely recognizable  
**Complexity**: Very Low - minimal slots, uses existing physics  
**Implementation Time**: 2-3 days

**Slots**:
```typescript
const FLAPPY_SLOT_CONTRACTS = {
  jumpForce: {
    name: 'jumpForce',
    kind: 'pure',
    description: 'Calculate jump impulse based on input'
  },
  obstacleSpawner: {
    name: 'obstacleSpawner', 
    kind: 'pure',
    description: 'Generate pipe/obstacle gaps at intervals'
  },
  scoring: {
    name: 'scoring',
    kind: 'pure', 
    description: 'Points calculation per obstacle passed'
  },
  difficultyScaling: {
    name: 'difficultyScaling',
    kind: 'policy',
    description: 'Adjust gap size and speed over time'
  }
};
```

**Tags**: `sys.flappy:alive`, `sys.flappy:dead`, `sys.flappy:scoring`

**Default Implementations**:
- `standard_jump`: Fixed upward impulse
- `floaty_jump`: Lower gravity feel
- `random_pipes`: Random gap position within bounds
- `progressive_pipes`: Gaps get smaller over time
- `point_per_pipe`: +1 point per pipe
- `linear_difficulty`: Speed increases linearly
- `stepped_difficulty`: Speed jumps at score thresholds

**Config**:
```typescript
interface FlappyConfig {
  playerId: string;
  jumpForce?: number;      // default 8
  gravity?: number;        // default 20
  pipeGap?: number;        // default 3 (meters)
  pipeSpeed?: number;      // default 4 (m/s)
  spawnInterval?: number;  // default 2 (seconds)
}
```

**Validation**:
- jumpForce: 5-15
- gravity: 10-30
- pipeGap: 2-5
- pipeSpeed: 2-8

---

#### 2. 2048 System
**Popularity**: 200M+ downloads, addictive puzzle  
**Complexity**: Low - grid-based like Match3  
**Implementation Time**: 3-4 days

**Slots**:
```typescript
const SLIDE_SLOT_CONTRACTS = {
  slideRule: {
    name: 'slideRule',
    kind: 'policy',
    description: 'How tiles move on input (4-direction, 8-direction)'
  },
  mergeLogic: {
    name: 'mergeLogic',
    kind: 'pure',
    description: 'What happens when tiles collide (2048, Threes-style)'
  },
  tileSpawner: {
    name: 'tileSpawner',
    kind: 'pure',
    description: 'Where and what value new tiles spawn'
  },
  scoring: {
    name: 'scoring',
    kind: 'pure',
    description: 'Points per merge'
  }
};
```

**Tags**: `sys.2048:merging`, `sys.2048:spawning`, `sys.2048:game_over`

**Default Implementations**:
- `four_direction_slide`: Standard up/down/left/right
- `standard_2048_merge`: Same values combine, double result
- `threes_merge`: 1+2=3, then same-value matching (variant)
- `random_2_or_4`: 90% spawn 2, 10% spawn 4
- `always_2`: Only spawn 2s (easier)
- `merge_value_scoring`: Points = merged tile value

**Config**:
```typescript
interface SlideConfig {
  gridId: string;
  gridSize: number;        // default 4 (4x4)
  targetTile?: number;     // default 2048 (win condition)
  spawnValues?: number[];  // default [2, 4]
  spawnWeights?: number[]; // default [0.9, 0.1]
}
```

**Validation**:
- gridSize: 3-6
- targetTile: 128-8192 (must be power of 2)

---

#### 3. Memory Match System
**Popularity**: Classic, perfect for kids 6-9  
**Complexity**: Low - simple flip/match logic  
**Implementation Time**: 2-3 days

**Slots**:
```typescript
const MEMORY_SLOT_CONTRACTS = {
  cardFlipping: {
    name: 'cardFlipping',
    kind: 'policy',
    description: 'How cards flip (single reveal, double reveal)'
  },
  matchLogic: {
    name: 'matchLogic',
    kind: 'pure',
    description: 'What constitutes a match (pair, triple, symbol)'
  },
  cardShuffler: {
    name: 'cardShuffler',
    kind: 'pure',
    description: 'Distribution algorithm for card placement'
  },
  timerRule: {
    name: 'timerRule',
    kind: 'policy',
    description: 'Time limits and penalties'
  }
};
```

**Tags**: `sys.memory:face_down`, `sys.memory:face_up`, `sys.memory:matched`, `sys.memory:mismatched`

**Default Implementations**:
- `two_card_flip`: Flip two cards, check match, flip back if no match
- `pair_match`: Two identical cards = match
- `triple_match`: Three identical cards = match (harder)
- `fisher_yates_shuffle`: Standard random shuffle
- `no_timer`: Unlimited time
- `countdown_timer`: Fixed time limit
- `penalty_timer`: Wrong match adds time penalty

**Config**:
```typescript
interface MemoryConfig {
  gridId: string;
  pairs: number;           // default 8 (16 cards)
  cardTemplates: string[]; // template IDs for card faces
  timeLimit?: number;      // optional, in seconds
  flipDuration?: number;   // default 0.3 seconds
}
```

**Validation**:
- pairs: 4-20
- cardTemplates.length >= pairs
- flipDuration: 0.1-1.0

---

### Phase 2: Match3 Reuse (1 week each)

#### 4. Bubble Shooter System
**Popularity**: Billions of plays (Puzzle Bobble, Bubble Witch)  
**Complexity**: Medium - shooting + Match3 color matching  
**Implementation Time**: 1 week

**Key Insight**: **Reuses Match3 matchDetection** with flood-fill algorithm!

**Slots**:
```typescript
const BUBBLE_SLOT_CONTRACTS = {
  aimingRule: {
    name: 'aimingRule',
    kind: 'policy',
    description: 'Arc preview, angle limits, aim assist'
  },
  bubbleAttachment: {
    name: 'bubbleAttachment',
    kind: 'pure',
    description: 'Where bubble sticks on collision with grid'
  },
  matchDetection: {
    name: 'matchDetection',
    kind: 'pure',
    description: 'REUSE from Match3 - flood-fill color matching'
  },
  popAnimation: {
    name: 'popAnimation',
    kind: 'hook',
    description: 'Visual feedback when bubbles pop'
  },
  ceilingDescent: {
    name: 'ceilingDescent',
    kind: 'policy',
    description: 'How/when ceiling moves down'
  }
};
```

**Reuses**: `matchDetection` from Match3 system (modify for flood-fill instead of line detection)

**Tags**: `sys.bubble:aiming`, `sys.bubble:flying`, `sys.bubble:attached`, `sys.bubble:popping`

**Config**:
```typescript
interface BubbleConfig {
  gridId: string;
  rows: number;           // default 12
  cols: number;           // default 8
  bubbleTemplates: string[];
  minMatch?: number;      // default 3
  ceilingDescentRows?: number;  // default 1
  ceilingDescentInterval?: number; // shots between descent
}
```

---

#### 5. Connect 4 System
**Popularity**: Classic strategy game  
**Complexity**: Medium - gravity-based drops  
**Implementation Time**: 1 week

**Key Insight**: **Reuses Match3 matchDetection** modified for 4-in-a-row!

**Slots**:
```typescript
const CONNECT4_SLOT_CONTRACTS = {
  dropRule: {
    name: 'dropRule',
    kind: 'pure',
    description: 'Gravity-based column drop logic'
  },
  winDetection: {
    name: 'winDetection',
    kind: 'pure',
    description: 'REUSE Match3 matchDetection for 4-length'
  },
  turnManager: {
    name: 'turnManager',
    kind: 'policy',
    description: 'Player alternation logic'
  },
  aiOpponent: {
    name: 'aiOpponent',
    kind: 'policy',
    description: 'Computer opponent difficulty levels'
  }
};
```

**Tags**: `sys.connect4:player_turn`, `sys.connect4:opponent_turn`, `sys.connect4:dropping`, `sys.connect4:win`

**Config**:
```typescript
interface Connect4Config {
  gridId: string;
  rows?: number;          // default 6
  cols?: number;          // default 7
  winLength?: number;     // default 4
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}
```

---

### Phase 3: System Combination (2 weeks)

#### 6. Puyo Puyo System
**Popularity**: Competitive puzzle classic  
**Complexity**: High - **Combines Tetris + Match3!**  
**Implementation Time**: 2 weeks

**Key Insight**: This is the ultimate architecture validation - combining TWO existing systems!

**Slots**:
```typescript
const PUYO_SLOT_CONTRACTS = {
  pairRotation: {
    name: 'pairRotation',
    kind: 'policy',
    description: 'REUSE Tetris rotationRule for pair rotation'
  },
  dropSpeed: {
    name: 'dropSpeed',
    kind: 'pure',
    description: 'REUSE Tetris dropSpeed'
  },
  matchDetection: {
    name: 'matchDetection',
    kind: 'pure',
    description: 'REUSE Match3 matchDetection (4+ connected, flood-fill)'
  },
  chainScoring: {
    name: 'chainScoring',
    kind: 'pure',
    description: 'Combo chain multiplier calculation'
  },
  garbageSystem: {
    name: 'garbageSystem',
    kind: 'policy',
    description: 'Attack opponent with garbage blocks (multiplayer)'
  }
};
```

**Reuses**:
- `rotationRule` from Tetris (modified for pair rotation)
- `dropSpeed` from Tetris
- `matchDetection` from Match3 (flood-fill, 4+ connected)

**Tags**: `sys.puyo:falling`, `sys.puyo:landed`, `sys.puyo:matching`, `sys.puyo:chaining`, `sys.puyo:garbage`

**Config**:
```typescript
interface PuyoConfig {
  gridId: string;
  rows?: number;          // default 12
  cols?: number;          // default 6
  colors: number;         // default 4 (puyo types)
  minMatch?: number;      // default 4
  pieceTemplates: string[];
}
```

---

## Implementation Pattern

Each game system follows this structure:

### 1. Create Slot File
`app/lib/game-engine/systems/{game}/slots.ts`
```typescript
import type { SlotContract, SlotImplementation } from '@slopcade/shared';
import { getGlobalSlotRegistry } from '@slopcade/shared';

const SYSTEM_ID = '{game}';
const SYSTEM_VERSION = { major: 1, minor: 0, patch: 0 };

// 1. Define contracts
export const {GAME}_SLOT_CONTRACTS: Record<string, SlotContract> = { ... };

// 2. Define typed interfaces for inputs/outputs
interface XxxInput { ... }
type XxxOutput = ...;

// 3. Create implementations
export const standardXxx: SlotImplementation<XxxInput, XxxOutput> = { ... };

// 4. Register helper
function registerIfNotExists(registry, impl) { ... }

// 5. Bulk registration
export function register{Game}SlotImplementations(): void { ... }
```

### 2. Add Validation
`shared/src/validation/playable.ts`
```typescript
export const {GAME}_CONSTRAINTS = { ... };
export function validate{Game}Playability(config): PlayableValidation { ... }
// Add to validatePlayable() switch
```

### 3. Add AI Template
`api/src/ai/templates/{game}.ts`
```typescript
export const {GAME}_TEMPLATE: GameDefinition = { ... };
```

### 4. Update Classifier
`api/src/ai/classifier.ts`
- Add keywords to `GAME_TYPE_KEYWORDS`
- Add defaults for control intent, win/lose conditions

### 5. Update Generator
`api/src/ai/generator.ts`
- Add game-specific instructions in `buildGenerationPrompt()`

### 6. Add Config Type
`shared/src/types/GameDefinition.ts`
```typescript
export interface {Game}Config { ... }
// Add to GameDefinition: {game}?: {Game}Config
```

### 7. Create Test Game
`app/lib/test-games/games/{game}/game.ts`

---

## Testing Strategy

### Unit Tests
- Slot implementations return correct outputs
- Validation catches invalid configs
- Classifier detects game type keywords

### Integration Tests
- Full game definition validates
- AI template passes playable validation
- Slot registration works

### Manual QA
- Game is playable in test app
- Controls feel responsive
- Visual feedback works via conditional behaviors

---

## Files to Create (Per Game)

| File | Purpose |
|------|---------|
| `app/lib/game-engine/systems/{game}/slots.ts` | Slot contracts + implementations |
| `app/lib/game-engine/systems/{game}/index.ts` | Re-exports |
| `shared/src/validation/{game}.ts` | (or add to playable.ts) Validation |
| `api/src/ai/templates/{game}.ts` | AI template |
| `app/lib/test-games/games/{game}/game.ts` | Test game |

---

## Implementation Order

| Week | Games | Why |
|------|-------|-----|
| 1 | Flappy Bird | Simplest, proves basic slot system |
| 1 | Memory Match | Simple, great for kids |
| 2 | 2048 | Grid-based, validates grid patterns |
| 3 | Bubble Shooter | First Match3 reuse |
| 3 | Connect 4 | Second Match3 reuse |
| 4-5 | Puyo Puyo | Ultimate test: Tetris + Match3 combined |

---

## Success Criteria

- [ ] All games have slot contracts + implementations
- [ ] All games pass playable validation
- [ ] AI can classify game type from prompts
- [ ] AI can generate valid game definitions
- [ ] Test games are playable in app
- [ ] Puyo Puyo proves system combination works

---

## Slot Reuse Map

```
Match3.matchDetection ──┬── Bubble Shooter (flood-fill variant)
                        ├── Connect 4 (4-length variant)
                        └── Puyo Puyo (4+ connected variant)

Tetris.rotationRule  ────── Puyo Puyo (pair rotation)
Tetris.dropSpeed     ────── Puyo Puyo (falling speed)

Grid System (shared) ───┬── 2048 (slide + merge)
                        ├── Memory Match (flip cards)
                        └── All grid-based games
```

This demonstrates the slot architecture enables **mix-and-match game creation**!
