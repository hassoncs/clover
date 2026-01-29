# Game Bundle Format: North Star Vision

**Status**: Living Document  
**Created**: 2026-01-29  
**Last Updated**: 2026-01-29

---

## Executive Summary

This document defines the target architecture for storing, validating, and loading games in Slopcade. The key principles are:

1. **Many small files** - AI-friendly, git-friendly, independently validatable
2. **Constants separate from variables** - Author-time parameters vs runtime state
3. **Editor metadata separate from game JSON** - Engine stays lean, editor concerns isolated
4. **Bundle format with compile step** - Validates cross-references, produces `GameDefinition`
5. **Runtime JS support planned** - Custom scripts execute in sandboxed ECS context
6. **AI-first authoring** - Humans rarely edit directly; AI manages all files

---

## Design Assumptions

### AI-First Authoring

This format is designed for **AI to author**, not humans. Key implications:

- **Humans will rarely edit these files directly** - AI generates and modifies
- **Editor metadata managed programmatically** - AI generates tuning ranges
- **Extreme validation** - If humans do edit, validation catches all errors
- **Small files favor AI** - AI is better at editing 50-line files than 500-line files

### Scenes and Asset Loading (Future)

**Current state**: Games are single-scene, all assets loaded at game start.

**Future state**: Games may have multiple scenes with different asset requirements.

The asset system should be designed to support:
- **Eager loading** (v1): All assets loaded at game load time
- **Scene-based loading** (future): Assets grouped by scene, loaded on demand
- **Lazy loading** (future): Individual assets loaded when first needed

This is documented now so the architecture doesn't preclude these patterns.

---

## Core Concepts

### Constants vs Variables

| Concept | When Set | Changes During Play | Purpose | Example |
|---------|----------|---------------------|---------|---------|
| **Constants** | Author-time | No | Game parameters | `BIRD_RADIUS`, `PIPE_SPEED` |
| **Variables** | Author-time + Runtime | Yes | Game state | `score`, `currentLevel`, `isGameOver` |

**Constants** are values the designer sets that define the game's behavior. They may be tuned during editing but are fixed once the game starts.

**Variables** are runtime state that changes as the game plays (score increases, levels change, etc.).

### Editor Metadata

Editor-specific data (tuning ranges, UI labels, categories) should **NOT** be in the game JSON. The engine doesn't need to know that `PIPE_SPEED` can be tuned from 5-30 with step 1.

This metadata lives in separate editor files, keeping the engine lean and allowing the editor to evolve independently.

---

## Bundle File Structure

The bundle format is **flexible** - like JavaScript bundling, you can organize files however makes sense for your game. The compiler discovers and merges everything.

```
flappy-bird.bundle/
│
├── manifest.json                    # Bundle entry point & metadata
│
├── constants.json                   # All constants in one file
│
├── editor.json                      # All editor metadata in one file
│
├── templates/                       # Templates: one file, many files, or mixed
│   ├── bird.json                   # Can be one template...
│   └── pipes.json                  # ...or multiple templates in one file
│
├── entities/                        # Entities: same flexibility
│   └── initial.json                # All starting entities, or split by area
│
├── rules/                           # Rules: same flexibility
│   ├── input.json                  # Group by concern...
│   ├── spawning.json               # ...or put all in one file
│   └── scoring.json
│
├── scripts/                         # Runtime scripts (one per file)
│   └── customWinCheck.js
│
├── generators/                      # Generator scripts (one per file)
│   └── levelGenerator.js
│
└── assets.json                      # Asset manifest
```

### Organization Flexibility

| Content | Organization Options |
|---------|---------------------|
| **Constants** | Single `constants.json` file (recommended) |
| **Editor metadata** | Single `editor.json` file (recommended) |
| **Templates** | One file, multiple files, or mixed - your choice |
| **Entities** | One file, multiple files, or mixed - your choice |
| **Rules** | One file, multiple files, or mixed - your choice |
| **Scripts** | One `.js` file per script (required - they're executable) |
| **Generators** | One `.js` file per generator (required) |

The compiler recursively scans directories and merges JSON files by type.

**Merge behavior:**
- Arrays are concatenated
- Objects are merged (later files override earlier for same keys)
- **Duplicate IDs are an error** - each template/entity/rule must have unique ID

---

## File Formats

### manifest.json

```json
{
  "$schema": "https://slopcade.com/schemas/bundle-manifest-v1.json",
  "name": "flappy-bird",
  "version": "1.0.0",
  "title": "Flappy Bird",
  "description": "Tap to fly through the pipes",
  "engine": "^1.0.0",
  
  "scripts": {
    "runtime": {
      "sandbox": "quickjs",
      "permissions": ["read:variables", "write:variables", "spawn:entities"]
    }
  },
  
  "generators": {
    "level": {
      "script": "generators/levelGenerator.js",
      "export": "generateLevel"
    }
  }
}
```

### constants.json

All constants in a single file:

```json
{
  "BIRD_RADIUS": 0.3,
  "PIPE_SPEED": 15,
  "PIPE_GAP": 3.0,
  "PIPE_WIDTH": 1.2,
  "FLAP_IMPULSE": 7,
  "SPAWN_INTERVAL": 2.5
}
```

### editor.json

Editor metadata for constants (optional - constants without entries won't appear in tuning UI):

```json
{
  "BIRD_RADIUS": {
    "label": "Bird Size",
    "category": "physics",
    "min": 0.2,
    "max": 0.6,
    "step": 0.05
  },
  "PIPE_SPEED": {
    "label": "Pipe Speed",
    "category": "difficulty",
    "min": 5,
    "max": 30,
    "step": 1,
    "description": "How fast pipes move toward the player"
  },
  "PIPE_GAP": {
    "label": "Gap Size",
    "category": "difficulty",
    "min": 2,
    "max": 5,
    "step": 0.5
  }
}
```

### templates/ (flexible organization)

**Option A: One template per file**
```
templates/
├── bird.json
├── pipeTop.json
└── pipeBottom.json
```

**Option B: Multiple templates in one file**
```json
// templates/all.json (or templates/pipes.json, etc.)
[
  {
    "id": "bird",
    "tags": ["bird"],
    "visual": { "type": "image", "asset": "bird", "width": { "const": "BIRD_RADIUS" } },
    "physics": { "bodyType": "dynamic", "density": 1 },
    "collider": { "shape": "circle", "radius": { "const": "BIRD_RADIUS" } }
  },
  {
    "id": "pipeTop",
    "tags": ["pipe", "obstacle"],
    "visual": { "type": "image", "asset": "pipe" },
    "physics": { "bodyType": "kinematic" },
    "collider": { "shape": "rect", "width": { "const": "PIPE_WIDTH" }, "height": 10 }
  }
]
```

**Option C: Single template (not in array)**
```json
// templates/bird.json
{
  "id": "bird",
  "tags": ["bird"],
  "visual": { "type": "image", "asset": "bird" }
}
```

The compiler handles all formats - arrays or single objects, one file or many.

### entities/ (flexible organization)

Same flexibility as templates:

```json
// entities/initial.json - all starting entities
[
  { "id": "bird", "template": "bird", "transform": { "x": -3, "y": 0 } },
  { "id": "ground", "template": "ground", "transform": { "x": 0, "y": -7 } },
  { "id": "ceiling", "template": "ceiling", "transform": { "x": 0, "y": 8 } }
]
```

Or split by area/purpose:
```
entities/
├── player.json      # Just the bird
├── environment.json # Ground, ceiling, walls
└── ui.json          # Score displays, etc.
```

### rules/ (flexible organization)

```json
// rules/gameplay.json - group related rules
[
  {
    "id": "tap_to_flap",
    "trigger": { "type": "tap" },
    "actions": [{ "type": "set_velocity", "target": { "type": "by_tag", "tag": "bird" }, "y": 7 }]
  },
  {
    "id": "spawn_pipes",
    "trigger": { "type": "timer", "interval": { "const": "SPAWN_INTERVAL" } },
    "actions": [{ "type": "spawn", "template": "pipePair", "x": 8 }]
  },
  {
    "id": "score_on_pass",
    "trigger": { "type": "collision", "tagA": "bird", "tagB": "score_zone" },
    "actions": [{ "type": "add_score", "amount": 1 }]
  }
]
```

### assets.json

```json
{
  "bird": { "path": "assets/bird.png", "type": "image" },
  "pipe": { "path": "assets/pipe.png", "type": "image" },
  "background": { "path": "assets/background.png", "type": "image" },
  "flap": { "path": "assets/flap.mp3", "type": "sound" }
}
```

**Note**: No base URL here. Asset URLs are resolved at runtime using environment configuration.

---

## Value References

### Reference Types

| Syntax | Resolution Time | Purpose |
|--------|-----------------|---------|
| `{ "const": "PIPE_SPEED" }` | Load time | Reference a constant |
| `{ "var": "score" }` | Runtime (current value) | Reference a variable |
| `{ "expr": "score * 0.1" }` | Runtime (every frame) | Computed expression |
| `{ "asset": "bird" }` | Load time | Reference an asset |

### Examples

```json
{
  "visual": {
    "type": "image",
    "asset": "bird",
    "width": { "const": "BIRD_RADIUS" }
  },
  "behaviors": [
    {
      "type": "move",
      "speed": { "const": "PIPE_SPEED" }
    },
    {
      "type": "spawn_on_event",
      "interval": { "expr": "2.5 - (score * 0.01)" }
    }
  ]
}
```

---

## Compile Step

The bundle compiler:

1. **Discovers all files** - Recursively scans bundle directory
2. **Merges by type** - Combines JSON files:
   - `constants.json` or `constants/*.json` → merged constants object
   - `templates.json`, `templates/*.json` → merged templates (handles arrays or single objects)
   - `entities.json`, `entities/*.json` → merged entities
   - `rules.json`, `rules/*.json` → merged rules
   - `editor.json` → editor metadata
3. **Validates each merged collection** against Zod schemas
4. **Validates cross-references**:
   - All `{ const: "X" }` reference existing constants
   - All `{ asset: "Y" }` reference existing assets
   - All `{ template: "Z" }` reference existing templates
   - Editor metadata keys match constant names
5. **Runs generators** (if any) and merges their output
6. **Assembles GameDefinition** for the engine
7. **Extracts editor metadata** for the editor UI

### Compile Output

```typescript
interface CompileResult {
  success: boolean;
  errors: CompileError[];
  warnings: CompileWarning[];
  
  // On success:
  gameDefinition: GameDefinition;  // For engine
  editorMetadata: EditorMetadata;  // For editor
}
```

### Error Examples

```
ERROR: templates/bird.json references unknown constant: BIRD_RADUS
  Did you mean: BIRD_RADIUS?
  
ERROR: rules/spawn_pipes.json references unknown template: pipeup
  Available templates: pipeTop, pipeBottom, ground, bird
  
WARNING: editor/OLD_CONSTANT.json has no matching constant
  Consider deleting this file
```

---

## Scripting Architecture

Games use a **hybrid approach** with three tiers of logic:

| Tier | Purpose | Implementation | Performance | When to Use |
|------|---------|----------------|-------------|-------------|
| **Expressions** | Simple computations | Current AST evaluator | Fastest | `score * 0.1`, conditions, formulas |
| **Runtime Scripts** | Complex game logic | QuickJS sandbox | Fast | AI behavior, match detection, custom win |
| **Build-time Generators** | Procedural content | TypeScript at compile | N/A (author-time) | Puzzle generation, level layouts |

### Design Principles

1. **Declarative by default** - Most games need only expressions
2. **Capability-based security** - Scripts can only do what `ScriptContext` allows
3. **Untrusted by default** - Even AI-generated scripts are sandboxed
4. **Deterministic** - Seeded RNG only, no `Date.now()` or `Math.random()`

---

### Tier 1: Expressions (Current System)

The existing expression evaluator handles simple computations:

```json
{
  "speed": { "expr": "baseSpeed + score * 0.1" },
  "condition": { "expr": "health < 20 && lives > 0" },
  "spawnY": { "expr": "rand(-5, 5)" }
}
```

**Characteristics:**
- Parsed to AST, evaluated via tree-walker interpreter
- ~50 built-in functions (math, entity queries, vectors)
- No `eval()` or `Function()` - fully sandboxed
- Best for: conditions, formulas, per-entity/per-frame computations

---

### Tier 2: Runtime Scripts (QuickJS Sandbox)

For complex logic that can't be expressed declaratively:

#### Script Context (ECS Interface)

```typescript
interface ScriptContext {
  // Read-only (always available)
  getConstant(name: string): number | string | boolean;
  getVariable(name: string): GameVariableValue;
  
  // Entity queries (returns IDs, not objects - prevents host object leakage)
  queryEntities(filter: EntityFilter): string[];
  getEntityPosition(id: string): Vec2 | null;
  getEntityVelocity(id: string): Vec2 | null;
  getEntityTags(id: string): string[];
  getEntityData(id: string, key: string): unknown;
  
  // Batch reads (reduces bridge overhead)
  getMany(queries: EntityQuery[]): EntityQueryResult[];
  
  // Write operations (permission-gated)
  setVariable(name: string, value: GameVariableValue): void;
  setEntityPosition(id: string, position: Vec2): void;
  setEntityVelocity(id: string, velocity: Vec2): void;
  applyImpulse(id: string, impulse: Vec2): void;
  addTag(id: string, tag: string): void;
  removeTag(id: string, tag: string): void;
  
  // Batch writes (reduces bridge overhead)
  setMany(operations: EntityOperation[]): void;
  
  // Spawning/destruction (permission-gated)
  spawnEntity(templateId: string, position: Vec2, overrides?: Partial<EntityDef>): string;
  destroyEntity(id: string): void;
  
  // Events
  emit(eventName: string, payload?: unknown): void;
  
  // Game state
  win(): void;
  lose(): void;
  
  // Deterministic random (seeded)
  random(): number;
  randomInt(min: number, max: number): number;
  randomChoice<T>(array: T[]): T;
}
```

**Key design decisions:**
- **IDs not objects**: `queryEntities()` returns string IDs, not entity objects. This prevents scripts from holding stale references or accessing internal state.
- **Batch APIs**: `getMany()` and `setMany()` reduce JS↔engine bridge overhead for complex scripts.
- **Seeded random only**: No `Math.random()` - deterministic for replays and multiplayer.

#### Script Usage in Rules

```json
{
  "id": "check_win",
  "trigger": { "type": "event", "eventName": "move_complete" },
  "actions": [
    {
      "type": "run_script",
      "script": "scripts/customWinCheck.js",
      "export": "checkWin"
    }
  ]
}
```

#### Example Script (Match-3 Detection)

```javascript
// scripts/checkMatches.js
export function checkMatches(ctx) {
  const candies = ctx.queryEntities({ tag: "candy" });
  const matches = [];
  
  // Build adjacency map
  const grid = new Map();
  for (const id of candies) {
    const pos = ctx.getEntityPosition(id);
    const color = ctx.getEntityData(id, "color");
    const key = `${Math.round(pos.x)},${Math.round(pos.y)}`;
    grid.set(key, { id, color });
  }
  
  // Find horizontal matches of 3+
  // ... match detection logic ...
  
  // Mark matched candies for destruction
  for (const match of matches) {
    for (const id of match.ids) {
      ctx.addTag(id, "matched");
    }
    ctx.setVariable("score", ctx.getVariable("score") + match.ids.length * 10);
  }
  
  if (matches.length > 0) {
    ctx.emit("matches_found", { count: matches.length });
  }
}
```

#### Sandbox Configuration

Declared in manifest.json:

```json
{
  "scripts": {
    "runtime": {
      "engine": "quickjs",
      "budgets": {
        "maxInstructionsPerTick": 100000,
        "maxMemoryMB": 16,
        "maxEngineCallsPerTick": 1000,
        "maxExecutionTimeMs": 16
      },
      "permissions": [
        "read:constants",
        "read:variables",
        "write:variables",
        "read:entities",
        "write:entities",
        "spawn:entities",
        "destroy:entities"
      ]
    }
  }
}
```

**Budget enforcement:**
- **Instructions**: QuickJS interrupt handler checks instruction count
- **Memory**: QuickJS memory allocation hooks
- **Engine calls**: Counter incremented on each `ScriptContext` method
- **Time**: Wallclock timeout as last resort

**On budget exceeded:** Script terminates, error logged, game continues without script effect for that tick.

---

### Tier 3: Generators (Run Once at Load Time)

Generators produce entities/content **once when the game loads** (or when editor settings change). They run in the **same QuickJS sandbox** as runtime scripts.

**Why QuickJS (not TypeScript)?**
- Users author games **on their phones** - no Node.js, no `tsc`
- Same sandbox for generators and runtime = simpler architecture
- Output validated against Zod schemas = catches errors immediately
- Can still use our test games in TypeScript during development, transpile to JS for bundles

```
generators/
├── puzzleGenerator.js    # Ball Sort puzzle generation
├── gridGenerator.js      # Creates grid of entities
└── deckShuffler.js       # Card game deck setup
```

#### Generator Interface

```javascript
// generators/puzzleGenerator.js
// Runs in QuickJS sandbox, same as runtime scripts

export function generate(ctx) {
  const difficulty = ctx.getConstant("DIFFICULTY");
  const seed = ctx.getConstant("PUZZLE_SEED");
  
  // ctx provides:
  // - getConstant(name) - read constants
  // - random() / randomInt() / randomChoice() - seeded RNG
  
  // Generator returns array of entity definitions
  // Output is validated against EntityDef[] schema
  return [
    { id: "ball-0", template: "ball", transform: { x: 0, y: 0 }, data: { color: 0 } },
    { id: "ball-1", template: "ball", transform: { x: 0, y: 1 }, data: { color: 1 } },
    // ...
  ];
}
```

#### Generator Usage in Manifest

```json
{
  "generators": {
    "puzzle": {
      "script": "generators/puzzleGenerator.js",
      "export": "generate",
      "runOn": "load"
    }
  }
}
```

#### Generator vs Static Entities

| Approach | When to Use |
|----------|-------------|
| **Static entities/** | Fixed layouts (Flappy Bird bird, ground, ceiling) |
| **Generator** | Procedural/random content (Ball Sort puzzles, Memory Match cards) |
| **Expression in entity** | Computed position based on constants (grid cells) |

#### Output Validation

Generator output is validated against the `EntityDef[]` schema:

```typescript
// Bundle compiler validates generator output
const entities = await runGenerator(generatorScript, ctx);
const result = EntityDefArraySchema.safeParse(entities);
if (!result.success) {
  throw new GeneratorValidationError(result.error);
}
```

This catches:
- Missing required fields (id, template)
- Invalid template references
- Type mismatches
- Schema violations

#### Development Workflow

For **our test games**, we can keep TypeScript during development:

```
// Development (TypeScript in repo)
app/lib/test-games/games/ballSort/
├── game.ts                    # TypeScript game definition
└── puzzleGenerator.ts         # TypeScript generator

// Bundle export (transpiled to JS)
ballSort.bundle/
├── manifest.json
├── generators/
│   └── puzzleGenerator.js     # Transpiled from .ts
└── ...
```

The export script transpiles TS → JS for the bundle format.

---

## Editor Integration

### Tuning UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         EDITOR                                   │
│                                                                  │
│  1. Load bundle                                                 │
│  2. Compile → get gameDefinition + editorMetadata              │
│  3. Display tuning sliders from editorMetadata                 │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ DIFFICULTY                                                 │ │
│  │ ─────────────────                                         │ │
│  │ Pipe Speed    [=======●===]  15                          │ │
│  │ Gap Size      [===●=======]  3.0                         │ │
│  │                                                           │ │
│  │ PHYSICS                                                   │ │
│  │ ─────────────────                                         │ │
│  │ Bird Size     [====●======]  0.3                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  4. On slider change:                                           │
│     - Write new value to constants/{NAME}.json                 │
│     - Recompile bundle                                          │
│     - Hot reload game preview                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Presets

Editor metadata can include presets:

```json
// editor/_presets.json
{
  "easy": {
    "PIPE_SPEED": 10,
    "PIPE_GAP": 4.0
  },
  "normal": {
    "PIPE_SPEED": 15,
    "PIPE_GAP": 3.0
  },
  "hard": {
    "PIPE_SPEED": 25,
    "PIPE_GAP": 2.5
  }
}
```

---

## AI Generation

When AI generates a game, it produces the full bundle structure:

```
AI Prompt: "Make a flappy bird game"
     │
     ▼
┌─────────────────────────────────────────┐
│ AI generates:                           │
│ - manifest.json                         │
│ - constants/*.json (with sensible values)
│ - editor/*.json (with tuning ranges)   │
│ - templates/*.json                      │
│ - entities/*.json                       │
│ - rules/*.json                          │
│ - assets.json (placeholder refs)        │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Compile & Validate                      │
│ - All cross-references valid?           │
│ - All schemas pass?                     │
│ - Playability checks pass?              │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Asset Generation Pipeline               │
│ - Generate sprites from prompts         │
│ - Upload to CDN                         │
│ - Update assets.json with URLs          │
└─────────────────────────────────────────┘
```

---

## Game Classification Guide

When building a new game, use this guide to determine which tiers of the system to use:

### Tier Selection Flowchart

```
Does the game need procedural content generation?
│
├─ YES: Level layouts, puzzle generation, wave definitions
│       → Use BUILD-TIME GENERATORS (TypeScript)
│
└─ NO: Continue...

Can all game logic be expressed as:
  - Trigger → Condition → Action rules?
  - Mathematical formulas (expressions)?
  - Built-in behaviors?
│
├─ YES → Use DECLARATIVE ONLY (expressions + rules)
│        Examples: Flappy Bird, Breakout, Pinball
│
└─ NO: Does the logic require:
       - Graph traversal (match detection)?
       - Complex state analysis (game over check)?
       - AI decision making?
       - Custom algorithms?
       │
       └─ YES → Use RUNTIME SCRIPTS (QuickJS)
                Examples: Puyo Puyo, 2048, Tower Defense AI
```

### Game Type Reference

| Game Type | Tier | Rationale |
|-----------|------|-----------|
| **Physics toys** (Flappy Bird, Pinball) | Declarative | Physics engine + simple rules suffice |
| **Breakout clones** | Declarative | Collision → destroy + score, expressions for speed |
| **Endless runners** | Declarative | Spawning rules + expressions for difficulty |
| **Match-3 games** | Declarative + Script | Grid match detection needs graph traversal |
| **Puzzle games** (2048, Ball Sort) | Generator + Script | Procedural puzzles, complex win conditions |
| **Turn-based games** (Chess, Tic-Tac-Toe) | Declarative | State machine + win condition expressions |
| **Tower Defense** | Declarative + Script | Path following declarative, targeting AI needs script |
| **Platformers** | Declarative | Physics + input rules, expressions for movement |
| **Card games** | Generator + Declarative | Deck shuffling at build time, rules declarative |

### Comprehensive Migration Map: All 33 Test Games

Each game analyzed for what it needs in the bundle format:

| Game | LOC | Generator? | Runtime Script? | Built-in System? | Migration Notes |
|------|-----|------------|-----------------|------------------|-----------------|
| **flappyBird** | 342 | No | No | No | Pure declarative. Constants become `constants/`. |
| **breakoutBouncer** | 441 | No | No | No | Pure declarative. Brick layout is fixed. |
| **pinballLite** | 247 | No | No | No | Pure declarative. Bumper positions fixed. |
| **simplePlatformer** | 277 | No | No | No | Pure declarative. Platform positions fixed. |
| **sportsProjectile** | 265 | No | No | No | Pure declarative. Uses launcher mechanics. |
| **angryBurns** | 445 | No | No | No | Uses pre-built launcher mechanics. |
| **catsPlatformer** | 335 | No | No | No | Pure declarative. |
| **catsFallingObjects** | 291 | No | No | No | Pure declarative. Spawning via rules. |
| **dominoChain** | 348 | No | No | No | Fixed domino positions. |
| **physicsStacker** | 310 | No | No | No | Fixed block positions. |
| **iceSlide** | 340 | No | No | No | Fixed level layout. |
| **tipScale** | 455 | No | No | No | Physics puzzle, fixed layout. |
| **endlessScrollPlayground** | 157 | No | No | No | Spawning via rules. |
| **renderTest** | 132 | No | No | No | Test harness. |
| **zoneTest** | 135 | No | No | No | Test harness. |
| **imageNoPhysicsTest** | 60 | No | No | No | Test harness. |
| **imageWithPhysicsTest** | 92 | No | No | No | Test harness. |
| **rpgProgressionDemo** | 352 | No | No | No | Demo, fixed content. |
| **gemCrush** | 218 | No | No | `match3` | Engine handles match detection. |
| **stackMatch** | 342 | No | No | `match3` variant | Stacking match system. |
| **blockDrop** | 307 | No | No | Tetromino system | Engine handles block logic. |
| **slotMachine** | 292 | No | No | `slotMachine` | Engine handles reels/payouts. |
| **tictactoe** | 880 | Loop→Static | Yes (win check) | No | 9 cells can be static. Win detection needs script OR verbose rules (currently verbose). |
| **connect4** | 393 | Loop→Static | Yes (win check) | No | 42 cells can be static. Win detection script. |
| **memoryMatch** | 325 | **Yes** (shuffle) | No | No | Card positions fixed, pairs shuffled → generator. |
| **slopeggle** | 661 | **Yes** (peg layout) | No | No | Peg layout generated, orange pegs randomized. |
| **towerDefense** | 196 | No | **Yes** (AI) | Wave system | Tower targeting needs script. |
| **dungeonCrawler** | 312 | **Yes** (level) | No | Grid system | Level layout generated. |
| **bubbleShooter** | 435 | **Yes** (bubble grid) | **Yes** (match check) | No | Initial grid generated, match detection script. |
| **puyoPuyo** | 540 | No | **Yes** (chains) | No | Chain detection and gravity script. |
| **dropPop** | 544 | No | **Yes** (matches) | No | Match detection script. |
| **game2048** | 327 | No | **Yes** (game over) | No | Game over check (any moves?) script. |
| **ballSort** | 465+339 | **Yes** (puzzle) | **Yes** (win check) | No | Complex: puzzle gen + win validation. |

#### Summary by Category

| Category | Count | Games |
|----------|-------|-------|
| **Pure Declarative** | 18 | flappyBird, breakoutBouncer, pinballLite, simplePlatformer, sportsProjectile, angryBurns, catsPlatformer, catsFallingObjects, dominoChain, physicsStacker, iceSlide, tipScale, endlessScrollPlayground, renderTest, zoneTest, imageNoPhysicsTest, imageWithPhysicsTest, rpgProgressionDemo |
| **Built-in System Only** | 4 | gemCrush, stackMatch, blockDrop, slotMachine |
| **Needs Generator** | 5 | memoryMatch, slopeggle, dungeonCrawler, bubbleShooter, ballSort |
| **Needs Runtime Script** | 8 | tictactoe, connect4, towerDefense, bubbleShooter, puyoPuyo, dropPop, game2048, ballSort |
| **Needs Both** | 2 | bubbleShooter, ballSort |

#### Migration Priority

1. **Start with Pure Declarative** (18 games) - Validates bundle format works
2. **Built-in Systems** (4 games) - Just config conversion
3. **Generator-only** (3 games) - memoryMatch, slopeggle, dungeonCrawler
4. **Script-only** (6 games) - Validates QuickJS integration
5. **Both** (2 games) - ballSort, bubbleShooter - most complex

---

### Example: Ball Sort Reimagined

**Current implementation**: 465 lines TypeScript + 339 lines generator

**With bundle format**:

```
ball-sort.bundle/
├── manifest.json
├── constants.json             # { "NUM_COLORS": 4, "BALLS_PER_COLOR": 4, "DIFFICULTY": 5 }
├── editor.json                # Tuning metadata for DIFFICULTY
├── generators/
│   └── puzzleGenerator.js     # Runs at load time in QuickJS
├── scripts/
│   └── winCheck.js            # Runtime: "are all tubes sorted?"
├── templates.json             # ball, tube, tubeBottom templates
├── rules.json                 # pickup, drop, checkWin rules
└── assets.json
```

**Generator** creates initial entity layout (which balls in which tubes).  
**Runtime script** checks win condition (all tubes sorted).  
**Everything else** is declarative.

---

### Example: Flappy Bird (Pure Declarative)

**Current**: 342 lines TypeScript

**With bundle format** (minimal files):

```
flappy-bird.bundle/
├── manifest.json
├── constants.json             # All physics/gameplay constants
├── editor.json                # Tuning UI metadata
├── templates.json             # bird, pipeTop, pipeBottom, ground
├── entities.json              # Starting entities (bird, ground, ceiling)
├── rules.json                 # All gameplay rules
└── assets.json
```

Or with more organization (larger games):

```
flappy-bird.bundle/
├── manifest.json
├── constants.json
├── editor.json
├── templates/
│   ├── player.json            # bird template
│   └── obstacles.json         # pipe templates
├── entities.json
├── rules/
│   ├── input.json             # tap to flap
│   ├── spawning.json          # pipe spawning
│   └── scoring.json           # score on pass
└── assets.json
```

**No generators, no runtime scripts** - pure JSON configuration.

---

### Example: Memory Match (Generator Only)

**Current**: 325 lines TypeScript with `generateCardLayout()` function

**With bundle format**:

```
memory-match.bundle/
├── manifest.json
├── constants.json             # { "GRID_ROWS": 4, "GRID_COLS": 4, "NUM_PAIRS": 8 }
├── generators/
│   └── cardLayout.js          # Shuffles pairs, returns card entities
├── templates.json             # cardBack, cardFace templates
├── rules.json                 # flip, checkMatch, handleMatch rules
└── assets.json
```

**Generator** (cardLayout.js):
```javascript
export function generate(ctx) {
  const rows = ctx.getConstant("GRID_ROWS");
  const cols = ctx.getConstant("GRID_COLS");
  const numPairs = ctx.getConstant("NUM_PAIRS");
  
  // Create pairs array
  const pairs = [];
  for (let i = 0; i < numPairs; i++) {
    pairs.push(i, i);
  }
  
  // Fisher-Yates shuffle using seeded random
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = ctx.randomInt(0, i);
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  
  // Generate card entities
  const cards = [];
  let idx = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cards.push({
        id: `card-${idx}`,
        template: "cardBack",
        tags: ["card", "face-down", `pair-${pairs[idx]}`],
        transform: { x: col * 2.4 - 3.6, y: row * 3.0 - 4.5 },
        data: { pairId: pairs[idx] }
      });
      idx++;
    }
  }
  
  return cards;
}
```

**No runtime scripts** - match logic is declarative (compare tags).

---

## Benefits of This Architecture

### For AI

- **Small files** - AI can confidently edit one template without breaking others
- **Clear schemas** - Each file type has a well-defined structure
- **Compile errors** - Immediate feedback if AI makes invalid references
- **Partial updates** - AI can add one rule without regenerating entire game

### For Humans

- **Git-friendly** - Different files for different concerns, easy diffs
- **Editor separation** - Tuning metadata doesn't pollute game logic
- **Presets** - Easy difficulty levels
- **Progressive complexity** - Start simple, add scripts when needed

### For Engine

- **Lean runtime** - Engine only sees compiled GameDefinition
- **No editor concerns** - Tuning ranges, labels, categories are stripped
- **Validated input** - Compile step ensures all references are valid
- **Clear contracts** - Scripts compile against well-defined ECS interface

---

## Relationship to Existing Systems

### Current Validation

The existing validation system (`gameDefinitionValidator.ts`, `playable.ts`, expression validator) will be integrated into the compile step:

| Current Validator | Bundle Integration |
|-------------------|-------------------|
| `validateGameDefinition()` | Final check on assembled GameDefinition |
| `validatePlayable()` | Called during compile for Match3/Tetris games |
| `validateExpression()` | Called when parsing `{ expr: "..." }` values |
| Game-specific validators | Called based on game type detection |

### Current Variables System

The existing `variables` + `VariableWithTuning` system will be refactored:

| Current | New |
|---------|-----|
| `variables` with inline tuning metadata | `constants/` (values) + `editor/` (metadata) |
| `VariableWithTuning.tuning` | `editor/{NAME}.json` |
| `VariableWithTuning.value` | `constants/{NAME}.json` or `variables` in game.json |

---

## Resolved Design Questions

### Q1: How do build-time generators integrate with the compile step?

**Answer**: Generators run as TypeScript during bundle compilation, before validation.

```
Bundle Directory
       │
       ▼
┌──────────────────┐
│ 1. Load manifest │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. Run generators│ ◄── TypeScript executed here
│    (if any)      │     Output: EntityDef[], constants, etc.
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 3. Merge outputs │ ◄── Generator output merged with static files
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 4. Validate all  │ ◄── Cross-reference checks, schema validation
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 5. Output bundle │
└──────────────────┘
```

Generators have access to constants defined in the bundle, enabling parameterized generation (e.g., difficulty-based puzzle generation).

---

### Q2: How does the editor efficiently hot-reload on constant changes?

**Answer**: Incremental recompile with cached generator outputs.

1. **Change detection**: Editor watches bundle directory for file changes
2. **Dependency graph**: Compiler tracks which outputs depend on which inputs
3. **Selective recompile**:
   - Constant change → Only re-resolve constant references (fast, <100ms)
   - Template change → Re-validate references, may invalidate entity caches
   - Generator config change → Re-run affected generator only
4. **Hot swap**: Engine receives delta update, not full reload

```typescript
interface HotReloadDelta {
  constants?: Record<string, ConstantValue>;      // Changed constants
  entities?: Record<string, EntityDef | null>;    // Changed/deleted entities
  templates?: Record<string, TemplateDef | null>; // Changed/deleted templates
  fullReload?: boolean;                           // True if delta not possible
}
```

---

### Q3: How do we handle bundle format version upgrades?

**Answer**: Semantic versioning with automated migrations.

```json
// manifest.json
{
  "$schema": "https://slopcade.com/schemas/bundle-manifest-v1.json",
  "bundleVersion": "1.2.0",
  "engineCompatibility": "^1.0.0"
}
```

**Version strategy:**
- **Patch (1.0.x)**: Bug fixes, no migration needed
- **Minor (1.x.0)**: Additive features, backwards compatible
- **Major (x.0.0)**: Breaking changes, migration script required

**Migration system:**
```typescript
// migrations/v1-to-v2.ts
export function migrate(bundle: BundleV1): BundleV2 {
  return {
    ...bundle,
    // Transform old format to new format
    constants: migrateConstants(bundle.variables),
  };
}
```

**CLI support:**
```bash
npx slopcade-bundle migrate ./my-game.bundle --to=2.0.0
```

---

### Q4: How do constants/variables sync in multiplayer context?

**Answer**: Constants are shared; variables use authoritative server model.

| Data Type | Sync Strategy | Reason |
|-----------|---------------|--------|
| **Constants** | Bundled with game, identical on all clients | Immutable after game start |
| **Variables** | Server-authoritative, client prediction | Mutable game state |
| **Entity state** | Server-authoritative with interpolation | Physics/position sync |

**Constants**: All clients load the same bundle, so constants are automatically synchronized.

**Variables**: 
```typescript
// Server sends authoritative state
interface GameStateSync {
  frame: number;
  variables: Record<string, GameVariableValue>;
  entityDeltas: EntityDelta[];
}

// Client predicts locally, reconciles on server update
```

**Scripts in multiplayer**:
- Scripts run on **server only** for authoritative games
- Client receives results via variable/entity sync
- Deterministic scripts can run on both (with reconciliation)

---

### Q5: How do we handle script debugging and error messages?

**Answer**: Bubble up errors to the AI - it's the primary author and fixer.

**Error format:**
```typescript
interface ScriptError {
  type: "syntax" | "runtime" | "timeout" | "budget_exceeded";
  message: string;
  scriptPath: string;
  line?: number;
  column?: number;
  stack?: string;
  context?: {
    functionName?: string;
    lastEngineCall?: string;
    budgetUsed?: { instructions: number; memory: number; engineCalls: number };
  };
}
```

**Error surfacing:**
- Compile-time errors (syntax, validation) → shown immediately in editor
- Runtime errors → logged with context, game continues (script effect skipped)
- AI receives full error context for self-correction
- Human sees simplified "Script error - AI is fixing" message

---

### Q6: How do we handle script API versioning?

**Answer**: Same as everything else - semver with compatibility ranges.

```json
// manifest.json
{
  "scripts": {
    "runtime": {
      "engine": "quickjs",
      "apiVersion": "^1.0.0"
    }
  }
}
```

**Version strategy:**
- **Patch (1.0.x)**: Bug fixes in ScriptContext, no API changes
- **Minor (1.x.0)**: New methods added to ScriptContext (backwards compatible)
- **Major (x.0.0)**: Breaking changes (method removed/renamed) - requires script migration

**Compatibility check at load time:**
```typescript
if (!semver.satisfies(engineApiVersion, bundle.scripts.runtime.apiVersion)) {
  throw new IncompatibleApiVersionError(engineApiVersion, bundle.scripts.runtime.apiVersion);
}
```

---

### Q7: Performance profiling for scripts?

**Answer**: Later TODO. Initial bundles will be manually managed before opening to users.

**Future considerations:**
- Per-script timing metrics (avg/max execution time)
- Budget usage histograms
- Flame graphs for expensive scripts
- "Slow script" warnings in editor

---

## Levels, Level Packs, and User-Generated Content

### Core Insight: Schemas as Contracts

A level (and persistence data) is fundamentally **a blob of JSON that matches a game-defined schema**. This insight drives the entire design:

- Games define **what a level looks like** via a schema
- Any JSON matching that schema is a valid level for that game
- Levels can come from anywhere: bundled, generated, user-created, community-shared
- The same pattern applies to persistence (save data, character state, progress)

### Existing Infrastructure

The codebase already has sophisticated types that this design builds upon:

#### LevelDefinition (`shared/src/types/LevelDefinition.ts`)

```typescript
interface LevelDefinition {
  schemaVersion: number;           // Schema version for compatibility
  packId: string;                  // Which pack this level belongs to
  levelId: string;                 // Unique within pack (e.g., "1", "boss")
  generatorId: string;             // What created this level
  generatorVersion: VersionString;
  seed: Seed;                      // For reproducibility
  
  title?: string;
  description?: string;
  difficulty?: LevelDifficultyParams;
  ordinal?: number;                // Position in pack (1-indexed)
  
  // Game-specific data lives here - namespaced by game ID
  overrides?: GameOverrides;       // e.g., { slopeggle: { pegRows: 15 } }
  metadata?: Record<string, unknown>;
}
```

**Key design**: `LevelDefinition` is an **overlay** - it describes what *changes* per-level, not a full game. The base `GameDefinition` (templates, rules, behaviors) is shared.

#### LevelPack (`shared/src/types/LevelPack.ts`)

```typescript
interface LevelPack {
  schemaVersion: number;
  metadata: PackMetadata;          // id, name, version, author, category
  levels: LevelDefinition[];       // Array of level overlays
  
  baseGameDefinition?: Record<string, unknown>;  // Shared game config
  progression?: PackProgression;   // Unlock rules: linear, branching, freeform
  stats?: PackStats;               // Level count, difficulty distribution
}
```

#### Game-Specific Overrides (already implemented)

```typescript
interface GameOverrides {
  slopeggle?: SlopeggleLevelOverrides;   // pegRows, orangePegCount, hasBucket...
  pinball?: PinballLevelOverrides;       // bumperCount, slingshotCount...
  angryBurns?: AngryBurnsLevelOverrides; // difficulty01, entities...
  [gameId: string]: GameSpecificOverrides | undefined;
}
```

This pattern (`overrides.{gameId}`) is already established and works well.

---

### How Bundles Relate to Levels

| Concept | Scope | Contains | Mutability |
|---------|-------|----------|------------|
| **Game Bundle** | The game engine/mechanics | Templates, rules, scripts, base constants | Immutable (versioned releases) |
| **Level Schema** | Contract for level data | JSON Schema defining valid level structure | Versioned with game |
| **Level Pack** | Collection of levels | LevelPack metadata + LevelDefinition[] | Can be bundled or external |
| **Level Definition** | One playable level | Overlay data matching schema | Created by anyone |
| **Persistence Schema** | Contract for save data | JSON Schema defining valid save structure | Versioned with game |
| **Save Data** | Player's progress | JSON matching persistence schema | Per-player, mutable |

---

### Bundle Directory Structure (Levels + Persistence)

```
my-peggle.bundle/
├── manifest.json                    # Bundle metadata + schema declarations
├── constants.json
├── templates.json
├── rules.json
│
├── schemas/                         # Game-defined contracts
│   ├── level.json                   # JSON Schema for valid levels
│   └── persistence.json             # JSON Schema for save data
│
├── levels/                          # Bundled level pack (optional)
│   ├── pack.json                    # LevelPack metadata
│   └── levels/
│       ├── level-1.json             # LevelDefinition overlay
│       ├── level-2.json
│       └── level-3.json
│
└── generators/                      # Level generators (optional)
    └── levelGenerator.js            # Procedural level creation
```

---

### Level Schema Definition

Games declare their level structure via JSON Schema:

```json
// schemas/level.json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "slopeggle-level-v1",
  "title": "Slopeggle Level Schema",
  "description": "Defines what a valid Slopeggle level looks like",
  
  "type": "object",
  "required": ["pegs"],
  "properties": {
    "pegs": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["x", "y", "type"],
        "properties": {
          "x": { "type": "number", "minimum": -10, "maximum": 10 },
          "y": { "type": "number", "minimum": -15, "maximum": 5 },
          "type": { "enum": ["blue", "orange", "green", "purple"] }
        }
      },
      "minItems": 10,
      "maxItems": 200
    },
    "balls": { "type": "integer", "minimum": 1, "maximum": 20, "default": 10 },
    "targetScore": { "type": "integer", "minimum": 0 },
    "hasBucket": { "type": "boolean", "default": true },
    "hasPortals": { "type": "boolean", "default": false }
  }
}
```

**This schema IS the contract.** Any JSON that validates against it is a playable Slopeggle level.

---

### Persistence Schema Definition

Same pattern for save data:

```json
// schemas/persistence.json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "slopeggle-persistence-v1",
  "title": "Slopeggle Save Data Schema",
  
  "type": "object",
  "properties": {
    "completedLevels": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Level IDs the player has completed"
    },
    "highScores": {
      "type": "object",
      "additionalProperties": { "type": "integer" },
      "description": "Map of levelId → highest score"
    },
    "totalStars": { "type": "integer", "minimum": 0 },
    "unlockedPacks": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

For more complex games (dungeon crawlers, RPGs):

```json
// schemas/persistence.json (dungeon crawler)
{
  "$id": "dungeon-crawler-persistence-v1",
  "type": "object",
  "properties": {
    "character": {
      "type": "object",
      "required": ["name", "class", "level", "stats"],
      "properties": {
        "name": { "type": "string" },
        "class": { "enum": ["warrior", "mage", "rogue"] },
        "level": { "type": "integer", "minimum": 1 },
        "experience": { "type": "integer", "minimum": 0 },
        "stats": {
          "type": "object",
          "properties": {
            "health": { "type": "integer" },
            "maxHealth": { "type": "integer" },
            "attack": { "type": "integer" },
            "defense": { "type": "integer" }
          }
        }
      }
    },
    "inventory": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "itemId": { "type": "string" },
          "quantity": { "type": "integer" }
        }
      }
    },
    "currentDungeon": { "type": "string" },
    "currentFloor": { "type": "integer" }
  }
}
```

---

### Manifest Schema Declarations

```json
// manifest.json
{
  "$schema": "https://slopcade.com/schemas/bundle-manifest-v1.json",
  "name": "slopeggle",
  "version": "1.0.0",
  "title": "Slopeggle",
  
  "schemas": {
    "level": {
      "path": "schemas/level.json",
      "version": "1.0.0"
    },
    "persistence": {
      "path": "schemas/persistence.json", 
      "version": "1.0.0"
    }
  },
  
  "levels": {
    "bundled": "levels/",
    "allowExternal": true,
    "allowUserCreated": true
  },
  
  "persistence": {
    "enabled": true,
    "scope": "per-user"
  }
}
```

---

### How Level Loading Works

#### 1. Bundled Levels (Current)

```
Game Bundle → contains levels/ directory → LevelPack loaded at compile time
```

```typescript
// At bundle compile time
const pack = loadLevelPack("levels/pack.json");
const levels = pack.levels.map(level => {
  // Validate against schema
  validateAgainstSchema(level.overrides?.slopeggle, levelSchema);
  return level;
});
```

#### 2. External Level Packs (Phase 2)

```
Game Bundle → defines schema → External LevelPack JSON → validated at load time
```

```typescript
// At runtime
async function loadExternalPack(url: string): Promise<LevelPack> {
  const pack = await fetch(url).then(r => r.json());
  
  // Validate each level against game's schema
  for (const level of pack.levels) {
    const valid = validateAgainstSchema(level.overrides?.[gameId], levelSchema);
    if (!valid) throw new InvalidLevelError(level.levelId, validationErrors);
  }
  
  return pack;
}
```

#### 3. User-Created Levels (Phase 3)

```
Game Bundle → defines schema → Level Editor UI → User creates level → Validated → Saved to DB
```

```typescript
// Level editor saves user creation
async function saveUserLevel(gameId: string, levelData: unknown): Promise<string> {
  const schema = await loadLevelSchema(gameId);
  
  // Validate against schema
  const valid = validateAgainstSchema(levelData, schema);
  if (!valid) throw new InvalidLevelError(validationErrors);
  
  // Wrap in LevelDefinition structure
  const levelDef: LevelDefinition = {
    schemaVersion: 1,
    packId: `user-${userId}`,
    levelId: generateId(),
    generatorId: "user-editor",
    generatorVersion: "1.0.0",
    seed: generateSeed(),
    overrides: { [gameId]: levelData }
  };
  
  // Save to database
  return await db.levels.insert(levelDef);
}
```

#### 4. Community Level Discovery (Phase 4)

```typescript
// Query community levels for a specific game
async function discoverLevels(gameId: string, options: DiscoverOptions): Promise<LevelDefinition[]> {
  return await db.levels.query({
    gameId,
    sortBy: options.sortBy,  // 'trending', 'newest', 'top-rated'
    difficulty: options.difficulty,
    limit: options.limit
  });
}

// "Show me all Peggle-compatible levels"
const peggleLevels = await discoverLevels("slopeggle", { sortBy: "trending" });
```

---

### Database Schema for UGC

```sql
-- Levels table (stores any level that matches a game's schema)
CREATE TABLE levels (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,              -- Which game this level is for
  schema_version TEXT NOT NULL,       -- Schema version it was created against
  
  -- LevelDefinition fields
  level_id TEXT NOT NULL,
  pack_id TEXT,                       -- NULL for standalone levels
  title TEXT,
  description TEXT,
  difficulty_tier TEXT,
  
  -- The actual level data (validated JSON)
  level_data JSONB NOT NULL,
  
  -- Provenance
  generator_id TEXT NOT NULL,         -- "user-editor", "ai-generator", "procedural"
  creator_user_id TEXT,               -- NULL for bundled/generated
  seed TEXT,
  
  -- Discovery
  is_public BOOLEAN DEFAULT false,
  play_count INTEGER DEFAULT 0,
  rating_sum INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(game_id, pack_id, level_id),
  FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Index for discovery queries
CREATE INDEX idx_levels_game_public ON levels(game_id, is_public, play_count DESC);
CREATE INDEX idx_levels_creator ON levels(creator_user_id);

-- Persistence table (per-user save data)
CREATE TABLE persistence (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  
  -- The actual save data (validated JSON)
  save_data JSONB NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, game_id)
);
```

---

### Integration with Existing Types

The bundle format integrates with existing infrastructure:

| Existing Type | Bundle Integration |
|---------------|-------------------|
| `LevelDefinition` | Stored in `levels/*.json`, validated against `schemas/level.json` |
| `LevelPack` | Stored in `levels/pack.json`, references `LevelDefinition[]` |
| `GameOverrides` | Level data lives in `overrides.{gameId}`, schema validates this |
| `DifficultyTier` | Used in level editor UI, stored in `LevelDefinition.difficulty` |
| `PackProgression` | Defines unlock order, stored in `LevelPack.progression` |

The existing `LevelLoader` (`shared/src/loader/LevelLoader.ts`) already handles:
- Loading bundled packs
- Loading remote packs
- Merging level overlays with base GameDefinition
- Schema validation

The bundle format simply provides:
1. **Schema declaration** in manifest (what is a valid level?)
2. **Storage location** for bundled levels
3. **Permission flags** for external/user levels

---

### Implementation Path

| Phase | What | Existing Code | New Code |
|-------|------|---------------|----------|
| **Phase 1** (Current) | Bundled levels | `LevelLoader`, `LevelPack`, `LevelDefinition` | Bundle directory structure |
| **Phase 2** | External packs | `PackSource` (abstract), `HttpPackSource` | Schema validation at load time |
| **Phase 3** | User-created levels | - | Level editor UI, DB storage, validation |
| **Phase 4** | Community discovery | - | Discovery API, ratings, trending |

**Phase 1 is mostly done** - the types exist, the loader exists. We just need to:
1. Add `schemas/` directory to bundle format
2. Add schema declarations to manifest
3. Add validation during bundle compile

---

### What This Enables

#### For Players
- Play community-created levels for their favorite games
- Create and share their own levels
- Discover trending/featured levels
- Save progress across devices

#### For Game Designers
- Define exactly what a valid level looks like (schema)
- Bundle starter levels with the game
- Let the community extend the game with new content
- Support procedural generation with the same schema

#### For AI
- Generate levels that are guaranteed valid (schema-guided)
- Create variations of existing levels
- Help users design levels ("make it harder", "add more obstacles")

---

### What This Doesn't Change

- **Bundle format**: Still works as designed for non-level games
- **Game engine**: Loads compiled `GameDefinition` as before
- **Current games**: Don't need schemas if not level-based
- **Migration**: No changes required for existing 33 games
- **Existing types**: `LevelDefinition`, `LevelPack` unchanged

This is **additive** - games opt into level support by declaring a schema in their manifest.

---

## Related Documents

- [Migration Plan](./GAME-BUNDLE-MIGRATION-PLAN.md) - How to get from current state to this vision
- [00-MASTER-ARCHITECTURE.md](./00-MASTER-ARCHITECTURE.md) - Overall engine architecture
- [game-definition-validation.md](../game-maker/plans/game-definition-validation.md) - Validation system plan

---

**This is a living document. Update as decisions are made and implementation progresses.**
