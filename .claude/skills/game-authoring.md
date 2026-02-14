---
description: "Building and modifying games using the Slopcade game engine. Covers GameDefinition, prefabs, entities, scripts, physics, containers, and input configuration. Use when creating new games, modifying existing games, or debugging game logic."
---

# Game Authoring

> **Skill for AI Agents**: Building and modifying games using the Slopcade game engine.

## Architecture Overview

Games are TypeScript files that export a `GameDefinition` object and optionally a set of script modules. The engine runs on Godot 4 with a React Native shell. Games are script-driven: you define prefabs and entities, and attach scripts to them for behavior.

**Coordinate system**: Origin at world center. X increases right, Y increases up (physics convention). Use helper functions to convert from screen-space (top-left origin):

```typescript
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;   // screen X → world X
const cy = (y: number) => HALF_H - y;   // screen Y → world Y (flipped)
```

## File Structure

```
r2/games/{gameSlug}/
  src/game.ts       ← Main game definition (TypeScript)
  src/script.ts     ← Optional external script file
  metadata.json     ← Auto-generated (do not edit)
  definition.json   ← Compiled output (do not edit)
```

## Minimal Game Example

```typescript
import type { GameDefinition } from "@slopcade/shared";

export const metadata = {
  title: "My Game",
  description: "A simple game",
};

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;

const game: GameDefinition = {
  metadata: {
    id: "uuid-here",          // Generate a real UUID
    slug: "myGame",
    title: "My Game",
    description: "A simple game",
    instructions: "Tap to play!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: -10 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  background: { type: "static", color: "#1a1a2e" },
  camera: { type: "fixed", zoom: 1 },
  prefabs: {
    ball: {
      id: "ball",
      tags: ["ball"],
      visual: { type: "circle", radius: 0.3, color: "#ff0000" },
      physics: { bodyType: "dynamic", density: 1 },
      collider: { shape: "circle", radius: 0.3, restitution: 0.8 },
    },
  },
  entities: [
    {
      id: "ball1",
      name: "Ball",
      prefab: "ball",
      transform: { x: 0, y: 3, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
};

export default game;
```

## Core Concepts

### Prefabs vs Entities

**Prefabs** (`Record<string, EntityPrefab>`) define blueprints — visual, physics, collider, and tags. **Entities** (`GameEntity[]`) are instances placed in the world, referencing a prefab by string key.

```typescript
prefabs: {
  brick: {                              // Prefab key
    id: "brick",                        // Must match key
    tags: ["brick"],
    visual: { type: "rect", width: 1.2, height: 0.5, color: "#ff0000" },
    physics: { bodyType: "static", density: 0 },
    collider: { shape: "box", width: 1.2, height: 0.5 },
  },
},
entities: [
  { id: "brick1", name: "Brick 1", prefab: "brick",           // ← References prefab KEY
    transform: { x: 0, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
],
```

### Physics + Collider (Separate Components)

Physics bodies need BOTH `physics` AND `collider` components:

| Body Type | Use Case |
|-----------|----------|
| `dynamic` | Moves under forces/gravity (balls, characters) |
| `static` | Never moves (walls, ground) |
| `kinematic` | Moves programmatically, not affected by forces (platforms, paddles) |

Collider shapes: `box`, `circle`, `polygon`, `capsule`

```typescript
physics: { bodyType: "dynamic", density: 1, fixedRotation: true },
collider: { shape: "circle", radius: 0.3, friction: 0.5, restitution: 0.8 },
```

Sensors (`isSensor: true`) detect overlap without physical collision.

### Visual Types

| Type | Required Fields |
|------|----------------|
| `rect` | `width`, `height`, `color` |
| `circle` | `radius`, `color` |
| `image` | `imageWidth`, `imageHeight` (resolved via asset system) |
| `text` | `text`, optional `fontSize`, `color`, `align` |
| `polygon` | `vertices`, `color` |

For `image` type, add `whatDescription` for AI asset generation: `"a bouncing red ball"`.

### Variables

Game-level state accessible in expressions and scripts:

```typescript
variables: {
  score: 0,                    // Simple value
  lives: 3,
  paddleForce: {               // Value with tuning metadata
    value: 120,
    tuning: { min: 50, max: 200, step: 10 },
    category: 'physics',
    label: 'Paddle Push Force',
  },
},
```

### Expressions (`Value<T>`)

Many fields accept `Value<number>` — either a literal or an expression:

```typescript
// Literal
points: 10,

// Expression
points: { expr: "score * 2 + 1" },
force: { expr: "-variables.paddleForce" },
```

Built-in expression context: `time`, `dt`, `frameId`, `score`, `random()`, `entityCount('tag')`, `variables.NAME`, `self.transform.x`, etc.

## Custom Scripts

Embed JavaScript in the `script` field for game logic. Scripts run in a QuickJS sandbox.

```typescript
script: `
exports.onStart = function(ctx) {
  ctx.setVariable('score', 0);
};

exports.onUpdate = function(ctx, dt) {
  const entities = ctx.queryEntities({ tag: 'enemy' });
  for (const id of entities) {
    const pos = ctx.getEntityPosition(id);
    if (pos && pos.y < -10) ctx.destroyEntity(id);
  }
};

exports.onInput = function(ctx, event) {
  if (event.type === 'tap') {
    ctx.spawnEntity('bullet', { x: 0, y: 0 });
  }
};

exports.onCollision = function(ctx, collision) {
  if (ctx.hasTag(collision.entityA, 'bullet') && ctx.hasTag(collision.entityB, 'enemy')) {
    ctx.destroyEntity(collision.entityB);
    ctx.setVariable('score', (ctx.getVariable('score') || 0) + 10);
  }
};
`,
```

See `.claude/skills/game-authoring/scripting-api-reference.md` for complete ScriptContext API.

## Child Entities (Hierarchies)

Prefabs can define children that move with the parent:

```typescript
prefabs: {
  pipeGroup: {
    id: "pipeGroup",
    tags: ["pipe-group"],
    children: [
      { name: "pipeTop", prefab: "pipeTop",
        localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
      { name: "pipeBottom", prefab: "pipeBottom",
        localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
    ],
  },
},
```

## Containers

For stack/grid-based games (Ball Sort, Connect 4, Match-3):

```typescript
containers: [
  {
    id: "tube0",
    type: "stack",
    capacity: 4,
    layout: {
      direction: "vertical",
      spacing: 0.6,
      basePosition: { x: -3, y: -2 },
    },
  },
],
```

Container types: `stack` (Ball Sort tubes), `grid` (Match-3 boards), `slots` (inventory).

## Game-Defined Dialogs

```typescript
dialogs: {
  activeDialogVariable: "activeDialog",
  dialogs: [
    {
      id: "level_complete",
      title: "Level Complete!",
      stats: [{ label: "Moves", variable: "moveCount" }],
      buttons: [
        { label: "Next Level", eventName: "next_level", variant: "primary" },
        { label: "Replay", eventName: "replay", variant: "secondary" },
      ],
    },
  ],
},
```

Show a dialog: `{ type: "set_variable", name: "activeDialog", operation: "set", value: "level_complete" }`

## Input Configuration

```typescript
input: {
  tapZones: [
    { id: "left", edge: "left", size: 0.5, button: "left" },
    { id: "right", edge: "right", size: 0.5, button: "right" },
  ],
  tilt: { enabled: true, sensitivity: 2 },
  virtualButtons: [
    { id: "jump", button: "jump", label: "Jump", size: 60 },
  ],
},
```

## Asset System

Prefabs with `visual.type: "image"` get their images from the BlobStore (content-addressed storage). Each prefab with an image visual has an `assetId` field pointing to a blob hash. Add `whatDescription` to prefabs for AI generation hints.

## Build & Test

```bash
# Build all games (compiles game.ts → definition.json)
pnpm --filter @slopcade/games build

# Type-check
pnpm tsc --noEmit
```

## Validation Checklist

Before committing a game definition:
1. All entity `prefab` references match a key in `prefabs`
2. Physics entities have BOTH `physics` AND `collider` components
3. Every `transform` has all 5 fields: `x`, `y`, `angle`, `scaleX`, `scaleY`
4. Prefab `id` matches its key in the `prefabs` object
5. `pnpm tsc --noEmit` passes

## Common Field Name Mistakes

| Wrong | Correct |
|-------|---------|
| `templateId` | `prefab` (on entity) |
| `physics.shape` | Shape is on `collider`, not `physics` |
| `fill` | `color` (on visual) |
| `destroy_entity` | `destroy` (action type) |
| `emit_event` | `event` (action type) |
| `game_start` | `game_started` (trigger type) |

## Reference Files

For detailed API docs, read these files in `.claude/skills/game-authoring/`:

| File | Contents |
|------|----------|
| `game-definition-reference.md` | Complete GameDefinition field reference |
| `scripting-api-reference.md` | ScriptContext API, SyncWorldOps, AsyncWorldOps |
| `examples.md` | Patterns extracted from production games |

## Source of Truth (Type Definitions)

| What | File |
|------|------|
| GameDefinition | `shared/src/types/GameDefinition.ts` |
| Entity/Prefab | `shared/src/types/entity.ts` |
| Visual components | `shared/src/types/visual.ts` |
| Physics + Collider | `shared/src/types/physics.ts` |
| Container system | `shared/src/types/container.ts` |
| Scripting API | `shared/src/scripting/script-authoring-types.ts` |
| Expressions | `shared/src/expressions/types.ts` |

## Existing Games (Study These)

| Game | Slug | Key Patterns |
|------|------|-------------|
| Flappy Bird | `flappyBird` | Tap input, timer spawning, child entities, persistence |
| Breakout Bouncer | `breakoutBouncer` | Multi-input (tap zones, tilt, buttons), tunable variables |
| Ball Sort | `ballSort` | Script-driven, containers, state machines, dialogs |
| Snake | `snake` | Script-based game loop, swipe input, grid movement |
| Slopeggle | `slopeggle` | Physics cannon, expressions, collision scoring |
| Gem Crush | `gemCrush` | Match-3 grid system |
| Minefield | `minefield` | Tap-based puzzle, hidden state |
| Sokoban | `sokoban` | Grid puzzle, push mechanics |
| Simple | `simple` | Minimal reference (one draggable cube) |
