# Learnings - New Slot Games Implementation

## Slot System Patterns
- SYSTEM_ID and SYSTEM_VERSION constants at top
- Slot contracts: { name, kind: 'pure'|'policy'|'hook', description }
- Typed interfaces for Input/Output of each slot
- SlotImplementation: { id, version, owner, compatibleWith, run }
- registerIfNotExists helper to avoid duplicate registration
- Export register{System}SlotImplementations() function

## Test Game Patterns
- Export metadata: TestGameMeta with title, description, titleHeroImageUrl
- Export default: GameDefinition
- ASSET_BASE constant (can use placeholder for now)
- cx()/cy() coordinate helpers for center-based positioning
- Templates for reusable entity configs
- Rules for event-driven game logic

## Behavior System
- 27 behavior types available
- Key ones: move, oscillate, destroy_on_collision, score_on_collision, spawn_on_event, timer
- Behaviors execute in phases: input -> timer -> movement -> visual -> post_physics

## Physics Integration
- bodyType: 'static' | 'dynamic' | 'kinematic'
- Shapes: box, circle, polygon
- isSensor: true for trigger zones (no physical collision)
- bullet: true for fast-moving objects

## Implementation Summary (2026-01-25)

### New Slot Systems Created (6)
1. **flappy** - Jump force, obstacle spawning, scoring, difficulty scaling
2. **memory** - Card flipping, match logic, shuffling, timer rules
3. **slide** (2048) - Slide rules, merge logic, tile spawning, scoring
4. **bubble** - Aiming, attachment, flood-fill matching, pop animations, ceiling descent
5. **connect4** - Drop rules, 4-in-a-row detection, turn management, AI opponents
6. **puyo** - Pair rotation, drop speed, 4+ connected matching, chain scoring, garbage system

### New Test Games Created (6)
1. **flappyBird** - Tap to jump, avoid pipes, endless scoring
2. **memoryMatch** - 4x4 card grid, flip to match pairs
3. **game2048** - 4x4 sliding tiles, merge to reach 2048
4. **bubbleShooter** - Aim and shoot, match 3+ colors
5. **connect4** - 7x6 grid, drop discs, 4-in-a-row wins
6. **puyoPuyo** - Falling pairs, rotate, match 4+ connected

### Key Observations
- Slot system is highly modular - easy to create new game types
- Test games can be created with placeholder sprites (colored shapes)
- Rules system is powerful for event-driven game logic
- Variables enable complex state tracking
- Grid-based games share common patterns (coordinate helpers, cell templates)
- Physics-based games (Flappy, Bubble) use existing behaviors effectively
- Turn-based games (Memory, Connect4) use variables for state management

### Opportunities for DRY/Simplification
1. **Grid utilities** - Many games use similar grid coordinate helpers
2. **Match detection** - Flood-fill algorithm reused across Bubble, Connect4, Puyo
3. **Spawning patterns** - Timer-based spawning common across games
4. **Input handling** - D-pad + buttons pattern repeated
5. **Score/variable displays** - UI config patterns similar across games


## Grid Expression Functions (2026-01-25)

Added 4 new expression functions to `shared/src/systems/grid/index.ts`:

1. **gridHasMatch(gridId, minSize)** - Returns true if any connected group of minSize exists
2. **gridMatchCount(gridId, minSize)** - Returns count of connected groups meeting minSize
3. **gridConnectedAt(gridId, row, col)** - Returns count of connected same-value cells at position
4. **gridHasLineMatch(gridId, length)** - Returns true if any line of length exists (horizontal, vertical, diagonal)

### Implementation Notes
- Uses `buildGridFromState()` helper to convert flat `Record<string, string | null>` to 2D array
- Match detection based on cell value equality (same entity ID/template)
- Leverages existing match-utils: `findConnectedGroups`, `findLineMatches`, `floodFill`
- All functions follow existing pattern: `(args, ctx) => { ... }`
- Grid state from `ctx.variables['__gridStates']`, definitions from `ctx.variables['__gridDefs']`

### Usage in Rules
```typescript
// Check for match-3
{ condition: { expr: "gridHasMatch('board', 3)" } }

// Count matches for scoring
{ condition: { expr: "gridMatchCount('board', 3) > 0" } }

// Check connected at specific position
{ condition: { expr: "gridConnectedAt('board', row, col) >= 4" } }

// Connect4-style line detection
{ condition: { expr: "gridHasLineMatch('board', 4)" } }
```

## Shared Match Utilities Refactoring (2026-01-25)

### Created: `shared/src/systems/grid/match-utils.ts`

Generic, reusable match detection utilities:

| Function | Signature | Purpose |
|----------|-----------|---------|
| `getNeighbors` | `(row, col)` | 4-directional neighbors for rectangular grids |
| `getHexNeighbors` | `(row, col, isOddRow)` | 6-directional neighbors for hex grids |
| `floodFill<T>` | `(grid, startRow, startCol, matchFn, getNeighborsFn?)` | Generic BFS flood-fill |
| `findConnectedGroups<T>` | `(grid, minSize, matchFn, getNeighborsFn?)` | Find all groups meeting size |
| `findLineMatches<T>` | `(grid, minLength, matchFn, directions?)` | Line detection (Connect4-style) |

### Refactored Slot Implementations

**Bubble Shooter** (`app/lib/game-engine/systems/bubble/slots.ts`):
- Now imports `floodFill`, `getHexNeighbors` from `@slopcade/shared`
- Removed local `floodFillMatch` and `getHexNeighbors` functions (~60 lines)
- `floodFillMatchDetection` and `chainReactionMatch` use shared utilities

**Connect4** (`app/lib/game-engine/systems/connect4/slots.ts`):
- Now imports `findLineMatches` from `@slopcade/shared`
- Removed local `checkLine` function (~30 lines)
- `fourInRowDetection` and `fiveInRowDetection` use shared utilities
- AI opponent functions kept local (need simulation helpers)

**Puyo Puyo** (`app/lib/game-engine/systems/puyo/slots.ts`):
- Now imports `floodFill` from `@slopcade/shared`
- Removed local `floodFill` function (~30 lines)
- `fourConnectedMatch` and `fiveConnectedMatch` use shared utilities

### Benefits
1. **DRY**: ~120 lines of duplicated code removed
2. **Consistency**: All games use same tested algorithms
3. **AI-accessible**: Expression functions let AI use match detection in rules
4. **Extensible**: Easy to add new match algorithms to shared utilities

### Architecture Decision: Code Helpers vs Behaviors

We chose **code helpers** (TypeScript utilities) over behaviors because:
1. Match detection runs at **slot implementation level**, not entity level
2. Slot implementations are selected by ID in GameDefinition
3. AI doesn't need to know helper internals - just slot IDs
4. Expression functions bridge the gap for AI rule conditions

### State Machine System - Not Used

Considered but decided against using state machine system for Memory/Connect4 turns:
- State machine is designed for **entity-level** state (enemy AI, player states)
- Turn management is **game-level** state, better handled by variables
- Current variable-based approach is simpler and works well
- No clear benefit to refactoring
