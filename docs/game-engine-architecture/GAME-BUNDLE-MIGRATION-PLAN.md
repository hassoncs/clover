# Game Bundle Migration Plan

**Status**: Draft  
**Created**: 2026-01-29  
**Last Updated**: 2026-01-29  
**Related**: [GAME-BUNDLE-FORMAT.md](./GAME-BUNDLE-FORMAT.md)

---

## Overview

This document outlines the migration path from the current game storage format (TypeScript files exporting `GameDefinition`) to the new bundle format (many small JSON files with compile step).

### Current State

- **33 test games** in `app/lib/test-games/games/*/game.ts`
- Games are TypeScript files with:
  - Helper functions (e.g., `createBallTemplate()`, `gridToWorld()`)
  - Constants as plain variables (e.g., `const PIPE_SPEED = 15`)
  - Computed entity arrays (e.g., `Array.from({ length: N }, ...)`)
- **Validation system** exists: `gameDefinitionValidator.ts` (710 lines), `playable.ts`, expression validators
- **Zod schemas** exist: `schemas.ts` (1000+ lines)
- **No separation** between constants and runtime variables
- **Editor tuning metadata** mixed into `VariableWithTuning` in GameDefinition

### Target State

- Games stored as bundle directories with many small JSON files
- Constants separate from variables
- Editor metadata in separate files
- Compile step validates and assembles `GameDefinition`
- Runtime JS scripts for complex logic (future)

---

## Migration Phases

### Phase 0: Preparation (No Breaking Changes)

**Goal**: Add infrastructure without changing existing games.

#### 0.1 Add `constants` field to GameDefinition

```typescript
// shared/src/types/GameDefinition.ts
export interface GameDefinition {
  // ... existing fields ...
  
  /**
   * Game constants - resolved at load time, immutable during gameplay.
   * Use { const: "NAME" } to reference these values.
   */
  constants?: Record<string, number | string | boolean>;
}
```

**Effort**: 1 hour  
**Risk**: None (additive change)

#### 0.2 Add constant reference type

```typescript
// shared/src/types/common.ts
export interface ConstantRef {
  const: string;
}

export type ConstantValue<T> = T | ConstantRef;
```

Update value schemas to accept constant references:

```typescript
// In places where we accept numbers, also accept { const: "NAME" }
export const NumberOrConstant = z.union([
  z.number(),
  z.object({ const: z.string() })
]);
```

**Effort**: 2-3 hours  
**Risk**: Low (extends existing patterns)

#### 0.3 Create bundle compiler module

```typescript
// shared/src/bundle/compiler.ts
export interface BundleCompileResult {
  success: boolean;
  errors: CompileError[];
  warnings: CompileWarning[];
  gameDefinition?: GameDefinition;
  editorMetadata?: EditorMetadata;
}

export async function compileBundle(bundlePath: string): Promise<BundleCompileResult>;
```

This can be developed and tested independently of existing games.

**Effort**: 2-3 days  
**Risk**: None (new module, not used yet)

#### 0.4 Create bundle validation layer

Integrate existing validators into compile step:

```typescript
// shared/src/bundle/validators/
├── index.ts                 // Orchestrates all validators
├── schemaValidator.ts       // Zod schema validation per file
├── crossRefValidator.ts     // Check { const: }, { asset: }, { template: }
├── gameValidator.ts         // Wraps existing gameDefinitionValidator
├── playableValidator.ts     // Wraps existing playable validators
└── expressionValidator.ts   // Wraps existing expression validator
```

**Effort**: 2-3 days  
**Risk**: Low (wraps existing code)

---

### Phase 1: Parallel Support

**Goal**: Support both old (TypeScript) and new (bundle) formats simultaneously.

#### 1.1 Create bundle loader

```typescript
// shared/src/bundle/loader.ts
export async function loadBundle(path: string): Promise<GameDefinition> {
  // If path is directory with manifest.json → new format
  // If path is .ts file → old format (import and run)
  // If path is .json file → try to parse as GameDefinition directly
}
```

**Effort**: 1 day  
**Risk**: Low

#### 1.2 Convert ONE simple game to bundle format

Pick `flappyBird` as the test case because:
- No helper functions generating entities
- Simple constant structure
- Well-understood game

Create manually:
```
app/lib/test-games/bundles/flappyBird.bundle/
├── manifest.json
├── constants/
├── templates/
├── entities/
├── rules/
└── assets.json
```

Verify it compiles and runs identically to the TypeScript version.

**Effort**: 1-2 days  
**Risk**: Medium (first real test of new format)

#### 1.3 Add bundle support to test game loader

```typescript
// app/lib/test-games/index.ts
export async function loadTestGame(gameId: string): Promise<GameDefinition> {
  // Try bundle first
  const bundlePath = `./bundles/${gameId}.bundle`;
  if (await exists(bundlePath)) {
    return loadBundle(bundlePath);
  }
  
  // Fall back to TypeScript
  const module = await import(`./games/${gameId}/game.ts`);
  return module.default;
}
```

**Effort**: 0.5 days  
**Risk**: Low

---

### Phase 2: Migration Tooling

**Goal**: Automate conversion of existing games to bundle format.

#### 2.1 Create export script

```typescript
// scripts/export-game-to-bundle.ts

// 1. Import the TypeScript game
// 2. Extract the GameDefinition
// 3. Analyze to find "constant-like" values (used in multiple places)
// 4. Generate bundle structure
// 5. Write files

npx tsx scripts/export-game-to-bundle.ts flappyBird
```

**Challenges**:
- Detecting which values should be constants vs inline
- Handling computed entity arrays (may need to pre-expand)
- Handling helper functions that generate entities

**Effort**: 3-5 days  
**Risk**: Medium (complex analysis)

#### 2.2 Create validation comparison script

Ensure exported bundle produces identical GameDefinition:

```typescript
// scripts/verify-bundle-export.ts
const original = (await import('./games/flappyBird/game.ts')).default;
const bundled = await loadBundle('./bundles/flappyBird.bundle');

const diff = deepDiff(original, bundled);
if (diff.length > 0) {
  console.error('Bundle does not match original:', diff);
  process.exit(1);
}
```

**Effort**: 0.5 days  
**Risk**: Low

---

### Phase 3: Gradual Migration

**Goal**: Convert all 33 games to bundle format.

#### 3.1 Categorize games by complexity

**See [GAME-BUNDLE-FORMAT.md](./GAME-BUNDLE-FORMAT.md#comprehensive-migration-map-all-33-test-games) for the complete analysis of all 33 games.**

Summary:

| Category | Count | Examples |
|----------|-------|----------|
| **Pure Declarative** | 18 | flappyBird, breakoutBouncer, pinballLite, angryBurns, etc. |
| **Built-in System Only** | 4 | gemCrush (match3), slotMachine, blockDrop, stackMatch |
| **Needs Generator** | 5 | memoryMatch, slopeggle, dungeonCrawler, bubbleShooter, ballSort |
| **Needs Runtime Script** | 8 | tictactoe, connect4, towerDefense, puyoPuyo, game2048, etc. |
| **Needs Both** | 2 | bubbleShooter, ballSort |

Key insight: **18 of 33 games (55%) are pure declarative** - no generators, no scripts. These validate the core bundle format before we need QuickJS.

#### 3.2 Migration order

1. **Simple games first** (10-15 games) - Validate tooling works
2. **Medium games** (10-12 games) - Refine tooling
3. **Complex games** (5-8 games) - May need bundle generators

#### 3.3 Migration checklist per game

- [ ] Export to bundle format (auto or manual)
- [ ] Verify bundle compiles without errors
- [ ] Verify GameDefinition matches original
- [ ] Run game and verify behavior matches
- [ ] Add editor metadata for constants
- [ ] Update game loader to use bundle
- [ ] Remove old TypeScript file (after verification period)

**Effort**: 1-2 weeks total  
**Risk**: Medium (volume of work)

---

### Phase 4: Remove Old Format Support

**Goal**: TypeScript game files no longer needed.

#### 4.1 Update documentation

- Update AGENTS.md game creation instructions
- Update AI prompts for game generation
- Archive old game format docs

#### 4.2 Remove TypeScript game loader

```typescript
// Remove fallback to .ts files
export async function loadTestGame(gameId: string): Promise<GameDefinition> {
  const bundlePath = `./bundles/${gameId}.bundle`;
  return loadBundle(bundlePath);
}
```

#### 4.3 Delete old game files

After verification period (1-2 weeks of both formats running):

```bash
rm -rf app/lib/test-games/games/
```

**Effort**: 1-2 days  
**Risk**: Low (if Phase 3 completed successfully)

---

### Phase 5: Editor Integration

**Goal**: Editor can read/write bundle format.

#### 5.1 Bundle read in editor

- Load manifest.json
- Load all constants, templates, entities, rules
- Load editor metadata
- Display tuning UI

#### 5.2 Bundle write in editor

- On constant change → write constants/{NAME}.json
- Trigger recompile
- Hot reload game preview

#### 5.3 AI generation to bundle

- AI generates bundle structure directly
- Compile and validate
- Show errors to user for correction

**Effort**: 3-5 days  
**Risk**: Medium (editor changes)

---

## Validation System Integration

### Current Validators

| Validator | Location | Purpose |
|-----------|----------|---------|
| `validateGameDefinition` | `shared/src/validation/gameDefinitionValidator.ts` | Main game validation |
| `validatePlayable` | `shared/src/validation/playable.ts` | Match3/Tetris playability |
| `validateExpression` | `shared/src/expressions/validator.ts` | Expression syntax |
| `validateSlopeggleLevel` | `shared/src/validation/slopeggleValidators.ts` | Slopeggle-specific |
| `validateAngryBurnsLevel` | `shared/src/validation/angryBurnsValidators.ts` | AngryBurns-specific |
| Zod schemas | `shared/src/types/schemas.ts` | Runtime type validation |

### Integration Plan

1. **Schema validation** - Each bundle file validated against its schema during compile
2. **Cross-reference validation** - New validator checks all references exist
3. **Game validation** - Existing `validateGameDefinition` runs on assembled result
4. **Playability validation** - Existing `validatePlayable` runs on assembled result
5. **Expression validation** - Runs when parsing `{ expr: "..." }` values
6. **Game-specific** - Triggered based on game type (detected from templates/rules)

### New Validators Needed

| Validator | Purpose |
|-----------|---------|
| `validateConstantRefs` | All `{ const: "X" }` reference existing constants |
| `validateAssetRefs` | All `{ asset: "Y" }` reference existing assets |
| `validateTemplateRefs` | All template references exist |
| `validateEditorMetadata` | Editor keys match constant names |

---

## Risk Mitigation

### Risk: Bundle format doesn't support all current game patterns

**Mitigation**: 
- Start with simple games
- Identify gaps early
- Add generator scripts for complex patterns

### Risk: Performance regression from compile step

**Mitigation**:
- Cache compiled results
- Compile in background/worker
- Incremental recompile on single file change

### Risk: AI can't generate bundle format well

**Mitigation**:
- Train on bundle examples
- Provide clear schemas
- Compile errors guide AI corrections

### Risk: Migration takes too long

**Mitigation**:
- Parallel support means no deadline pressure
- Automated tooling reduces manual work
- Can pause migration if needed

---

## Success Criteria

### Phase 0 Complete When:
- [ ] `constants` field added to GameDefinition
- [ ] Constant reference type working
- [ ] Bundle compiler module exists and tested

### Phase 1 Complete When:
- [ ] At least one game running from bundle format
- [ ] Bundle loader handles both formats

### Phase 2 Complete When:
- [ ] Export script converts simple games automatically
- [ ] Verification script confirms identical output

### Phase 3 Complete When:
- [ ] All 33 games converted to bundle format
- [ ] All games pass compile and runtime tests
- [ ] Editor metadata exists for tunable constants

### Phase 4 Complete When:
- [ ] TypeScript game files removed
- [ ] Documentation updated
- [ ] CI only tests bundle format

### Phase 5 Complete When:
- [ ] Editor reads/writes bundle format
- [ ] AI generates bundles directly
- [ ] Hot reload working for constant changes

---

## Timeline Estimate

| Phase | Duration | Dependencies | Notes |
|-------|----------|--------------|-------|
| Phase 0: Preparation | 1 week | None | Add constants, constant refs, bundle compiler skeleton |
| Phase 1: Parallel Support | 1 week | Phase 0 | Convert flappyBird as proof of concept |
| Phase 2: Migration Tooling | 1 week | Phase 1 | Export scripts, verification |
| Phase 2.5: QuickJS Integration | 1-2 weeks | Phase 1 | ScriptContext API, budget enforcement |
| Phase 3: Gradual Migration | 2-3 weeks | Phase 2, 2.5 | Convert all 33 games |
| Phase 4: Remove Old Format | 0.5 weeks | Phase 3 + verification | Delete TypeScript game files |
| Phase 5: Editor Integration | 1 week | Phase 3 | Hot reload, AI generation |

**Total: ~8-10 weeks** (includes scripting infrastructure)

**Parallelization opportunities:**
- Phase 2 and 2.5 can run in parallel
- Simple game migration (Phase 3) can start before QuickJS is complete
- Editor integration can begin once a few games are migrated

**Critical path:** Phase 0 → Phase 1 → Phase 2.5 → Complex game migration

---

## Resolved Open Questions

### Q1: How do we handle games like Ball Sort that need procedural generation?

**Decision: Option A - Generators are TypeScript files that run at compile time.**

**Rationale:**
- Generators run at **author time**, not player time → no security concern
- Full TypeScript/Node.js capabilities (file I/O, npm packages, debugging)
- Output is validated before inclusion in bundle
- Same approach used by most game engines (Unity asset processors, Unreal blueprints)

**Implementation:**
```
ball-sort.bundle/
├── generators/
│   └── puzzleGenerator.ts    # TypeScript, runs at compile time
├── constants/
│   └── DIFFICULTY.json       # Input to generator
└── entities/
    └── [generated]/          # Output from generator (or inline in compiled bundle)
```

**Compile flow:**
1. Load constants (DIFFICULTY = 5)
2. Run `puzzleGenerator.ts` with constants as input
3. Generator outputs `EntityDef[]`
4. Merge generated entities with static entities
5. Validate entire bundle
6. Output compiled `GameDefinition`

**For runtime scripting** (win condition checking), see the separate runtime scripts section in GAME-BUNDLE-FORMAT.md.

---

### Q2: If AI generates editor metadata, how do we handle human edits?

**Decision: Option D - Layered metadata with AI base + human overrides.**

**Rationale:**
- AI generates sensible defaults (min/max/step from value analysis)
- Humans can override specific fields without losing AI benefits
- Merge is simple: human overrides win, AI fills gaps

**Implementation:**
```
editor/
├── PIPE_SPEED.json           # AI-generated base
├── PIPE_SPEED.override.json  # Human overrides (optional)
└── _ai_generated.json        # Tracks which files AI created
```

**Merge strategy:**
```typescript
function loadEditorMetadata(constantName: string): EditorMetadata {
  const base = loadJson(`editor/${constantName}.json`) ?? {};
  const override = loadJson(`editor/${constantName}.override.json`) ?? {};
  return { ...base, ...override };  // Human overrides win
}
```

**AI regeneration:**
- AI only regenerates `.json` files, never `.override.json`
- If human wants to "reset to AI defaults", delete the override file
- `_ai_generated.json` tracks which files AI created for cleanup

---

### Q3: When do we resolve asset paths to full URLs?

**Decision: Option B - Load time resolution with environment-provided base URL.**

**Rationale:**
- **Not compile time**: Bundle should be portable across environments (dev, staging, prod)
- **Not runtime per-use**: Too slow, unnecessary network calls
- **Load time**: Resolve once when game loads, cache for duration

**Implementation:**

Bundle stores relative paths:
```json
// assets.json
{
  "bird": { "path": "assets/bird.png", "type": "image" },
  "background": { "path": "assets/background.png", "type": "image" }
}
```

Environment provides base URL:
```typescript
// Runtime configuration
const config = {
  assetBaseUrl: "https://cdn.slopcade.com/games/flappy-bird/v1.2.0/",
  // or for local dev: "file:///path/to/bundle/"
};
```

Loader resolves at game load:
```typescript
function resolveAssets(assetManifest: AssetManifest, baseUrl: string): ResolvedAssets {
  return Object.fromEntries(
    Object.entries(assetManifest).map(([id, asset]) => [
      id,
      { ...asset, url: new URL(asset.path, baseUrl).href }
    ])
  );
}
```

**Benefits:**
- Same bundle works in dev, staging, prod
- Easy CDN migration (just change base URL)
- Supports local file:// URLs for offline/dev
- Asset preloading can happen in parallel with game init

---

## Next Steps

1. Review this plan with team
2. Start Phase 0 implementation
3. Identify first game to convert (likely flappyBird)
4. Create detailed task breakdown for Phase 0

---

**This is a living document. Update as implementation progresses and decisions are made.**
