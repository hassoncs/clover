# Slopeggle Level Generator - Work Log

## Session: 2026-01-28

### Wave 1: COMPLETED

**Status**: ✅ COMPLETE - Schema + RNG Foundation Ready

---

## Wave 1 Task 1: Generic JSON Level & Pack Schema ✅

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

## Wave 1 Task 2: Deterministic RNG Contract ✅

**Files Created**:
- `shared/src/generator/SeededRandom.ts` - Core RNG with substreams
- `shared/src/generator/index.ts` - Module exports
- `shared/src/generator/SeededRandom.demo.ts` - Determinism verification

**What Was Learned**:

1. **Mulberry32 Algorithm** - Better quality than LCG, used in Ball Sort
2. **Substream Independence** - Each stream (layout, oranges, motion, ids) has its own state
3. **Seed Derivation** - Uses FNV-1a + Mulberry32 to hash seed + streamName → sub-seed
4. **Coexistence Strategy** - Renamed to `createSeededRandomWithSubstreams` to avoid conflict with existing `createSeededRandom` in expressions
5. **Canonical JSON** - Stable serialization for deterministic comparison

**API**:
```typescript
const rng = createSeededRandomWithSubstreams(12345);
const layout = rng.layout();       // 0-1 value
const orangeCount = rng.oranges().range(5, 15);
const positions = rng.shuffle([...]);
```

**Verification**: All determinism tests pass (same seed → same output, streams independent)

---

## Wave 2 Task 4: Heuristic Validators ✅

**Files Created**:
- `shared/src/validation/slopeggleValidators.ts` - Core validation functions
- `shared/src/validation/slopeggleValidators.test.ts` - Comprehensive tests
- `shared/src/validation/index.ts` - Updated exports

**What Was Implemented**:

1. **Bounds Validator**:
   - Checks all pegs are within 0-12 x, 0-16 y world bounds
   - Accounts for peg radius (0.125) to keep peg fully inside bounds
   - Returns actionable errors with specific coordinates

2. **Forbidden Zones Validator**:
   - Launcher zone: y < 2.5 (top ~2.5 units where ball spawns)
   - Bucket zone: y > 14 (bottom ~2 units where free-ball bucket moves)
   - Prevents pegs from interfering with game mechanics

3. **Spacing Validator**:
   - Minimum peg-to-peg distance: 0.3 units (PEG_RADIUS * 2 + buffer)
   - O(n²) check for overlapping pegs
   - Detects both horizontal and diagonal overlaps

4. **Orange Count Validator**:
   - Validates actual count matches requested `orangePegCount`
   - Warns if no orange pegs exist (win condition impossible)
   - Warns if too many orange pegs (>50) for playability

5. **Orange Accessibility Heuristic (Option C: Corners)**:
   - Flags oranges in corner regions (x < 1.5 or x > 10.5, y < 4 or y > 13)
   - Warns if >50% of oranges are in corners
   - Errors if ALL oranges are in corners (likely inaccessible)
   - Simple but effective heuristic for generator guidance

**Key Decisions**:

1. **Constants Defined**:
   ```typescript
   const SLOPEGGLE_CONSTANTS = {
     WORLD_WIDTH: 12,
     WORLD_HEIGHT: 16,
     PEG_RADIUS: 0.125,
     PEG_DIAMETER: 0.25,
     LAUNCHER_ZONE_Y_MAX: 2.5,
     BUCKET_ZONE_Y_MIN: 14,
     MIN_PEG_SPACING: 0.3,
     CORNER_X_THRESHOLD: 1.5,
     CORNER_Y_THRESHOLD: { min: 4, max: 13 },
   };
   ```

2. **Validation Result Structure** (matching existing `playable.ts` patterns):
   ```typescript
   interface SlopeggleValidation {
     valid: boolean;
     errors: string[];
     warnings: string[];
   }
   ```

3. **Coordinate System Handling**:
   - `createPegPositions()` helper handles both center-origin and top-left origin
   - `fromCenterOrigin()` converts cx(x), cy(y) to top-left (x, y)

4. **Test Coverage**:
   - Valid level passes all validators
   - Out of bounds detection (all 4 edges)
   - Forbidden zone detection (launcher + bucket)
   - Spacing violations (overlap + diagonal)
   - Orange count mismatch
   - Accessibility corner cases

**Gotchas Encountered**:

1. **Coordinate Origin Confusion**:
   - Slopeggle uses center-origin (cx, cy) in game.ts
   - Level generators typically use top-left origin (0,0 = top-left)
   - Added conversion helper to handle both

2. **Peg Radius Buffer**:
   - Bounds check must account for peg radius
   - Peg at x=0 extends to x=-0.125 (out of bounds)
   - Check: `x - radius >= 0` and `x + radius <= WORLD_WIDTH`

3. **Spacing Threshold**:
   - 2 * PEG_RADIUS = 0.25 (exact touch)
   - Added 0.05 buffer for safety: MIN_PEG_SPACING = 0.3
   - Prevents physics engine issues with barely-touching pegs

**Verification**:
- ✅ lsp_diagnostics clean on all new files
- ✅ TypeScript compilation passes
- ✅ Tests cover all validator functions with good/bad levels

**Tasks**:
1. [ ] Slopeggle LevelDefinition overlay model
2. [ ] Heuristic validators (fast) for Peggle-style boards

**Inherited Wisdom**:
- Use existing patterns from `shared/src/types/GameDefinition.ts`
- Follow Ball Sort's seed hygiene in `puzzleGenerator.ts`
- Avoid `Math.random()` - use `createSeededRandomWithSubstreams`

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
- Orange accessibility heuristic definition
- Forbidden zones (launcher lane, bucket path) - need to inspect Slopeggle coords

---

## Wave 3: Loader + Pack Sources - PLANNED

**Status**: Ready to start after Wave 2 completes

**Tasks**:
1. [ ] Level loader implementation
2. [ ] Pack sources (bundled repo + remote)

**Requirements**:
- Load LevelPack JSON from bundled files (e.g., assets/levels/)
- Load remote pack JSON from API/CDN
- Merge LevelDefinition onto base GameDefinition (slopeggle)
- Handle schemaVersion/generatorVersion mismatches gracefully

---

## Wave 4: Cosmetic Motion - PLANNED

**Status**: Ready to start after Wave 3 completes

**Tasks**:
1. [ ] Cosmetic motion assignment system

**Requirements**:
- Implement "motion = anchor + path offset" as render-only
- Reuse existing oscillate/scale_oscillate behaviors
- Cluster detection for group motion with staggered phase
- Cap amplitude (~10-15% of peg radius) and speed (dt * 0.15)

**Fairness Rule**: Collision center stays at anchor; render offsets only

---

## Wave 5: QA + Documentation - PLANNED

**Status**: Final wave

**Tasks**:
1. [ ] Manual QA checklist
2. [ ] Evidence capture (screenshots)
3. [ ] Dev documentation
