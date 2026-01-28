# Slopeggle Level Generator - Work Log

## Session: 2026-01-28

### Wave 1: Schema + Interfaces - Task Completed

**Status**: Completed - Generic JSON Level & Pack Schema Defined

**Files Created**:
- `shared/src/types/LevelDefinition.ts` - Core level overlay types
- `shared/src/types/LevelPack.ts` - Pack container types with progression
- `shared/src/types/__examples__/level-definition.example.json` - Example level
- `shared/src/types/__examples__/level-pack.example.json` - Example pack

**What Was Learned**:

1. **Overlay Pattern Design**:
   - LevelDefinition is NOT a full GameDefinition - it's an "overlay" containing only what varies per level
   - Shared game config (templates, rules, base entities) stays at the pack level
   - Game-specific fields use namespaced `overrides.{gameId}` to avoid collisions

2. **Schema Versioning Strategy**:
   - `schemaVersion: number` for breaking changes (major version only)
   - `minCompatibleVersion` for parsing oldest supported format
   - Optional fields used for non-breaking additions

3. **Pack:Level Identity Guardrails**:
   - Full identity: `${packId}:${levelId}` (e.g., "slopeggle-basic-v1:easy")
   - Validation function `validateLevelUniqueness()` checks for duplicates
   - Type guard `isLevelDefinition()` for runtime validation

4. **TypeScript Gotchas Fixed**:
   - Index signature `[gameId: string]` required union type including specific game overrides
   - `LevelProgress` name collision with `progress.ts` - renamed to `PackLevelProgress`
   - LevelDefinition import needed in LevelPack.ts (circular dependency avoided by import)

5. **Exported Types from LevelPack.ts** (re-exports from LevelDefinition):
   - `LevelDefinition`, `LevelDifficultyParams`, `DifficultyTier`, `GeneratorInfo`
   - `GameOverrides`, `SlopeggleLevelOverrides`, `PinballLevelOverrides`
   - Helper functions: `isLevelDefinition()`, `getLevelIdentity()`, `validateLevelUniqueness()`

**Key Types Defined**:

```typescript
// LevelDefinition - minimal overlay per level
interface LevelDefinition {
  schemaVersion: number;
  packId: string;
  levelId: string;
  generatorId: string;
  generatorVersion: string;
  seed: string;
  title?: string;
  description?: string;
  ordinal?: number;
  difficulty?: LevelDifficultyParams;
  overrides?: GameOverrides;
  metadata?: Record<string, unknown>;
}

// LevelPack - container for multiple levels
interface LevelPack {
  schemaVersion: number;
  metadata: PackMetadata;
  version: string;
  gameConfig?: PackGameConfig;
  levels: LevelDefinition[];
  progression?: PackProgression;
  stats?: PackStats;
}
```

**Slopeggle-Specific Overrides**:
```typescript
interface SlopeggleLevelOverrides {
  pegRows?: number;
  orangePegCount?: number;
  hasBucket?: boolean;
  hasPortals?: boolean;
  worldWidth?: number;
  worldHeight?: number;
  launchForceMultiplier?: number;
  dramaticFinalPeg?: boolean;
}
```

**Verification**: Full TypeScript check passed - no compilation errors.

---

### Wave 1: Schema + Interfaces

**Status**: In Progress (2 background tasks running)

**Tasks**:
1. [x] Define generic JSON level & pack schema (shared) - COMPLETED
2. [ ] Deterministic RNG contract + named substreams (shared) - Task: bg_296352c6

**Inherited Wisdom**:
- Use existing patterns from `shared/src/types/GameDefinition.ts`
- Follow Ball Sort's seed hygiene in `puzzleGenerator.ts`
- Avoid `Math.random()` - use `createSeededRandom` from evaluator

**Key Findings from Codebase Exploration**:

**Slopeggle Current Structure** (`app/lib/test-games/games/slopeggle/game.ts`):
- World: 12x16 units, gravity {x:0, y:-5}
- Coordinate helpers: `cx(x)`, `cy(y)` for center-origin conversion
- Peg layout: 12 rows with alternating 9-10 pegs
- 10 orange pegs at fixed indices: [5, 15, 24, 35, 44, 55, 63, 74, 82, 95]
- Current difficulty: hardcoded (10 lives, 10 oranges)
- Bucket oscillates: `{type:"oscillate", axis:"x", amplitude:4, frequency:0.25}`
- Launcher at: y=cy(1.0) (top of world)
- Drain at: y=cy(WORLD_HEIGHT + 0.5) (below bottom)
- Walls at x=0.1 and x=11.9 (WORLD_WIDTH - 0.1)

**Behavior Types Available** (`shared/src/types/behavior.ts`):
- `oscillate`: axis (x/y/both), amplitude, frequency, phase
- `scale_oscillate`: min, max, speed, phase
- Phase parameter perfect for group synchronization

**Layout Helpers** (`shared/src/systems/layout/helpers.ts`):
- `distributeRow`: horizontal with space-evenly/space-between/center/start/end
- `distributeGrid`: 2D grid distribution
- `distributeCircular`: arc/circle placement
- All support padding and alignment options

**Key Decisions to Make**:
- Pack ID collision rules (bundled vs remote)
- Schema versioning strategy - DECIDED: use schemaVersion + minCompatibleVersion
- Orange accessibility heuristic definition
- Forbidden zones (launcher lane, bucket path)
