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

## Wave 2 Tasks 3 & 5: Slopeggle Level Generator ✅ COMPLETE

**Status**: ✅ COMPLETE - LevelDefinition overlay model + Runtime generator implemented

### Files Created

- `shared/src/generator/slopeggle/types.ts` - Slopeggle-specific overlay types
- `shared/src/generator/slopeggle/SlopeggleLevelGenerator.ts` - Core generator implementation
- `shared/src/generator/slopeggle/index.ts` - Module exports
- `shared/src/generator/slopeggle/__examples__/generated-levels.ts` - Usage examples

### What Was Implemented

#### 1. SlopeggleLevelOverlay Type

Extended `LevelDefinition` with Slopeggle-specific fields:

```typescript
interface SlopeggleLevelOverlay extends LevelDefinition {
  generatorId: "slopeggle-generator";
  pegs: SlopegglePeg[];           // Array of {x, y, isOrange, motion?}
  lives: number;                  // Starting balls
  dynamicElements?: DynamicElement[];  // bucket, portals with motion
  slopeggleDifficulty?: SlopeggleDifficultyParams;
}

interface SlopegglePeg {
  x: number;
  y: number;
  isOrange: boolean;
  motion?: PegMotionConfig;       // Optional animation
}
```

#### 2. Difficulty Presets

```typescript
const SLOPEGGLE_DIFFICULTY_PRESETS = {
  easy: { orangeCount: 6, lives: 12, hasBucket: true, hasPortals: false, bucketAmplitude: 3 },
  medium: { orangeCount: 8, lives: 10, hasBucket: true, hasPortals: true, bucketAmplitude: 4 },
  hard: { orangeCount: 10, lives: 8, hasBucket: true, hasPortals: true, bucketAmplitude: 5 },
  extreme: { orangeCount: 12, lives: 6, hasBucket: true, hasPortals: true, bucketAmplitude: 6 },
};
```

#### 3. Generator Implementation

**Key Features**:
- Deterministic generation using `SeededRandom` with substreams
- Layout stream: peg grid positions
- Oranges stream: orange peg placement with accessibility guarantee
- Motion stream: dynamic element parameters (phase, etc.)
- IDs stream: entity naming

**Accessibility Algorithm**:
- Calculates launch angle from launcher (x=6, y=1) to each peg
- Orange pegs within -60° to -15° from horizontal are "accessible"
- Guarantees minimum accessible oranges (`minOrangeAccessibility` parameter)
- Remaining oranges placed from non-accessible regions

**Usage**:
```typescript
const level = generateSlopeggleLevel({
  seed: "my-level-seed",
  packId: "slopeggle-pack-v1",
  levelId: "level-1",
  difficultyTier: "medium",
  // Optional overrides
  orangeCount: 10,
  lives: 8,
  hasBucket: true,
  hasPortals: true,
  minOrangeAccessibility: 4,
});
```

### Gotchas Fixed

1. **TypeScript import issues**:
   - `import type` vs `import` - type guards need regular import for value usage
   - `Mulberry32` class is private in SeededRandom - used `any` type for substreams

2. **Substream typing**:
   - `rng.oranges()` returns `Mulberry32` directly, not a function
   - Generator uses separate RNG streams for independent randomness

3. **Coordinate system**:
   - Slopeggle uses center-origin (cx, cy) in game.ts
   - Generator outputs center-origin coordinates directly
   - No conversion needed when merging onto base game

### Verification

- ✅ All files compile without TypeScript errors
- ✅ `pnpm tsc --noEmit` passes
- ✅ Generator uses seeded RNG (no `Math.random()`)
- ✅ Accessibility guarantee enforced in orange placement
- ✅ Example levels demonstrate all difficulty tiers

### Key Algorithms

#### Peg Layout Generation
```typescript
// 12 rows, alternating 9-10 pegs per row
// Spacing variation (±0.05) for visual interest
for (let row = 0; row < pegRows; row++) {
  const y = startY + row * rowSpacing;
  const pegCount = row % 2 === 0 ? 9 : 10;
  // ... generate peg positions
}
```

#### Orange Accessibility Check
```typescript
// Launcher at (6, 1), accessible if angle between -60° and -15°
const angle = Math.atan2(peg.y - launcherY, peg.x - launcherX);
const isAccessible = angle >= minAngle && angle <= maxAngle && peg.y > 2;
```

### Integration with Base Game

The generated `SlopeggleLevelOverlay` is designed to merge with the base `slopeggle/game.ts`:

1. `overlay.pegs` → Replace static peg entities with generated positions
2. `overlay.lives` → Set `initialLives` in GameDefinition
3. `overlay.dynamicElements.bucket` → Override bucket motion params
4. `overlay.dynamicElements.portals` → Enable/disable portal entities

### Next Steps

- Integrate with level loader (Wave 3)
- Add cosmetic motion assignment (Wave 4)
- QA + documentation (Wave 5)

---

## Summary: Generator Implementation Complete

**Total Lines of Code**: ~450 lines across 4 files

**Core Functions**:
- `generateSlopeggleLevel()` - Main entry point
- `generatePegLayout()` - Creates grid of peg positions
- `placeOrangePegs()` - Places oranges with accessibility guarantee
- `verifyDeterminism()` - Tests same-seed reproducibility

**Output**: Deterministic, playable Slopeggle levels with configurable difficulty.

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

## Wave 3: Level Loader + Pack Sources - COMPLETE

**Status**: ✅ COMPLETE - LevelLoader and PackSource implementation ready

### Files Created

- `shared/src/loader/PackSource.ts` - Abstract pack source with bundled, remote, and composite implementations
- `shared/src/loader/LevelLoader.ts` - Core loader with applyLevel merging logic
- `shared/src/loader/index.ts` - Module exports
- `shared/src/loader/__examples__/slopeggle-demo-pack.json` - Example bundled pack
- `shared/src/loader/__examples__/usage.ts` - Comprehensive usage examples

### What Was Implemented

#### 1. PackSource Abstraction

```typescript
// Bundled - loads from local JSON files
const bundledSource = new BundledPackSource('assets/packs');

// Remote - fetches from API/CDN
const remoteSource = new RemotePackSource('https://api.example.com/packs');

// Composite - checks multiple sources in order
const compositeSource = new CompositePackSource([bundledSource, remoteSource]);
```

#### 2. LevelLoader Core Methods

- `loadBundled(packId)` - Load from local assets
- `loadRemote(url)` - Load from remote endpoint
- `loadPack(selector)` - Load using "sourceId:packId" format
- `applyLevel(pack, levelIndex, baseGame)` - Merge level onto base
- `applyLevelById(pack, levelId, baseGame)` - Apply by level identifier
- `applyLevelByIdentity(pack, identity, baseGame)` - Apply by "packId:levelId"

#### 3. Level Merging Strategy

The `applyLevel` method merges LevelDefinition overlays onto a base GameDefinition:

1. Deep copies the base game definition
2. Applies pack-level gameConfig (templates, rules, variables)
3. Merges level difficulty settings (initialLives, etc.)
4. Applies game-specific overrides (Slopeggle: lives, world size, dynamic elements)
5. Updates metadata with level title and generator provenance

#### 4. Schema Version Handling

- Warns on schema version mismatch (doesn't crash)
- Respects MIN_COMPATIBLE_PACK_VERSION for parsing oldest supported format
- Callback for warnings allows custom handling (migration logic)

#### 5. Slopeggle Overrides Supported

- `initialLives` - Starting ball count
- `worldWidth` / `worldHeight` - Board dimensions
- `hasBucket` - Enable/disable free-ball bucket
- `hasPortals` - Enable/disable teleport portals

### TypeScript Fixes Applied

1. **Import type vs value**: Changed `import type` to mixed `import { type X, VALUE }` for constants used as values
2. **Type conversion**: Used `as unknown as Record<string, unknown>` for adding dynamic properties to typed objects
3. **Entity properties**: Added required `name` property to example entities
4. **Interface gaps**: Removed invalid `initialLives` from SlopeggleLevelOverrides (it's in LevelDifficultyParams)

### Usage Example

```typescript
const loader = new LevelLoader();

// Load pack
const pack = await loader.loadBundled('slopeggle-demo-v1');

// Get base game
const baseGame = await loadBaseSlopeggleGame();

// Apply first level
const result = loader.applyLevel(pack, 0, baseGame, {
  validate: true,
  onWarning: (warning, category) => {
    console.warn(`[${category}] ${warning}`);
  },
});

console.log('Ready to play:', result.game.metadata.title);
console.log('Starting lives:', result.game.initialLives);
```

### Key Decisions

1. **Pack Selection Format**: Used "sourceId:packId" pattern for flexible loading (e.g., "bundled:my-pack", "remote:https://...")

2. **Deep Copy Strategy**: Used `structuredClone()` for base game to avoid mutation

3. **Entity Merging**: Replaces entities by ID when pack provides entities with same ID

4. **Warning Categories**: Split warnings into schema/merge/validation for filtering

5. **Composite Source Fallback**: First source with the pack wins, collects errors from all sources

### Verification

- ✅ All loader files pass `pnpm tsc --noEmit`
- ✅ lsp_diagnostics clean on PackSource.ts, LevelLoader.ts, index.ts
- ✅ TypeScript compilation successful for shared package

### Next Steps

- Wave 4: Cosmetic motion assignment system
- Wave 5: QA + documentation

---