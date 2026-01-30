# Game Bundle System

## Overview

The **Bundle System** is a JSON-based format for defining games that compiles into a `GameDefinition`. It's designed for AI-generated games, visual editors, and dynamic game loading.

## Bundle vs TypeScript

| Aspect | Bundle (JSON) | TypeScript |
|--------|---------------|------------|
| **Source Format** | JSON files in `.bundle/` directory | TypeScript `.ts` file |
| **Type Safety** | Runtime validation | Compile-time checking |
| **IDE Support** | Basic JSON validation | Full IntelliSense, autocomplete |
| **Best For** | AI generation, visual editors, remote loading | Hand-coded games, complex logic |
| **Constants** | `{ const: "NAME" }` references | Regular TypeScript constants |

## Bundle Structure

```
my-game.bundle/
├── manifest.json          # Game metadata and config
├── constants.json         # Named constants
├── assets.json           # Asset references
├── editor.json           # Editor metadata (optional)
├── schemas/              # Validation schemas (optional)
│   └── level.json
├── templates/            # Entity templates
│   ├── enemies.json
│   └── items.json
├── entities/             # Initial entities
│   └── initial.json
└── rules/                # Game rules
    └── gameplay.json
```

## File Formats

### manifest.json

```json
{
  "name": "my-game",
  "version": "1.0.0",
  "title": "My Game",
  "description": "A fun game",
  "instructions": "How to play",
  "titleHeroImageUrl": "https://example.com/hero.png",
  "world": {
    "gravity": { "x": 0, "y": -10 },
    "pixelsPerMeter": 50,
    "bounds": { "width": 12, "height": 16 }
  },
  "background": {
    "type": "static",
    "imageUrl": "https://example.com/bg.png"
  },
  "camera": {
    "type": "fixed",
    "zoom": 1
  },
  "ui": {
    "showScore": true,
    "showLives": true,
    "backgroundColor": "#000000"
  },
  "loseCondition": {
    "type": "entity_destroyed",
    "tag": "player"
  }
}
```

### constants.json

Define reusable constants referenced with `{ const: "NAME" }`:

```json
{
  "GRAVITY": -10,
  "PLAYER_SPEED": 5,
  "WORLD_WIDTH": 12,
  "ASSET_BASE": "https://example.com/assets"
}
```

Use in other files:
```json
{
  "speed": { "const": "PLAYER_SPEED" },
  "imageUrl": { "const": "ASSET_BASE" }
}
```

### templates/*.json

Entity templates that can be spawned:

```json
[
  {
    "id": "player",
    "tags": ["player"],
    "visual": {
      "type": "image",
      "asset": "player",
      "width": { "const": "PLAYER_WIDTH" },
      "height": { "const": "PLAYER_HEIGHT" }
    },
    "physics": {
      "bodyType": "dynamic",
      "density": 1
    },
    "collider": {
      "shape": "circle",
      "radius": 0.5
    },
    "behaviors": [
      { "type": "move", "direction": "right", "speed": { "const": "PLAYER_SPEED" } }
    ]
  }
]
```

### entities/initial.json

Initial entities in the game:

```json
[
  {
    "id": "player-1",
    "name": "Player",
    "template": "player",
    "transform": { "x": 0, "y": 0, "angle": 0, "scaleX": 1, "scaleY": 1 }
  }
]
```

### rules/gameplay.json

Game rules with triggers and actions:

```json
[
  {
    "id": "tap_to_jump",
    "name": "Tap to jump",
    "trigger": { "type": "tap" },
    "actions": [
      {
        "type": "set_velocity",
        "target": { "type": "by_tag", "tag": "player" },
        "y": { "const": "JUMP_FORCE" }
      }
    ]
  }
]
```

## Compiling Bundles

### From Code

```typescript
import { compileBundle } from '@slopcade/shared';

const result = compileBundle('/path/to/my-game.bundle');

if (result.success) {
  const gameDefinition = result.gameDefinition;
  // Use the game definition
} else {
  console.error('Compile errors:', result.errors);
}
```

### CLI (Future)

```bash
# Compile bundle to GameDefinition
npx slopcade compile-bundle ./my-game.bundle -o ./game.json

# Validate bundle without compiling
npx slopcade validate-bundle ./my-game.bundle
```

## Use Cases

### 1. AI-Generated Games

AI systems output JSON files that compile into games:

```typescript
// AI generates bundle files
const aiOutput = await generateGameWithAI(prompt);
writeBundleToDisk('./ai-game.bundle', aiOutput);

// Compile to GameDefinition
const game = compileBundle('./ai-game.bundle');
```

### 2. Visual Editor

Visual editors save JSON that can be compiled:

```typescript
// Editor saves JSON
editor.onSave = (jsonData) => {
  saveToBundle('./editor-game.bundle', jsonData);
};

// Compile when loading
const game = compileBundle('./editor-game.bundle');
```

### 3. Remote Game Loading

Fetch JSON bundles from a server:

```typescript
const response = await fetch('https://api.example.com/games/123');
const bundleData = await response.json();

// Save to temp bundle
writeBundleToDisk('./temp.bundle', bundleData);
const game = compileBundle('./temp.bundle');
```

### 4. Level Packs

Level packs use bundles for level definitions:

```typescript
const pack = await levelLoader.loadPack('bundled:my-pack');
// Each level is a compiled bundle
```

## TypeScript → Bundle (Reverse)

To convert TypeScript games to bundles (for AI training, etc.):

```typescript
import { gameDefinitionToBundle } from '@slopcade/shared';

const game: GameDefinition = /* ... */;
const bundle = gameDefinitionToBundle(game);

// Writes:
// - manifest.json
// - constants.json
// - templates/*.json
// - entities/*.json
// - rules/*.json
```

**Note:** This is not currently implemented but could be added.

## Best Practices

1. **Use constants** for values referenced multiple times
2. **Split templates** logically (enemies.json, items.json, etc.)
3. **Validate** bundles before deployment
4. **Version** your bundles in manifest.json
5. **Document** custom constants in editor.json

## Migration: Bundle → TypeScript

To convert a bundle to TypeScript:

1. Create a `game.ts` file
2. Export a `GameDefinition` object
3. Replace `{ const: "NAME" }` with actual values or TS constants
4. Delete the `.bundle/` directory
5. Regenerate registry

Example:
```typescript
import type { GameDefinition } from "@slopcade/shared";

const GRAVITY = -10;  // Was in constants.json

const game: GameDefinition = {
  metadata: { id: "my-game", title: "My Game" },
  world: {
    gravity: { x: 0, y: GRAVITY },  // Was { const: "GRAVITY" }
    // ...
  },
  // ...
};

export default game;
```

## See Also

- [Game Definition Types](../reference/game-definition.md)
- [Entity System](../reference/entity-system.md)
- [Behavior System](../reference/behavior-system.md)
- [Level Pack System](./level-packs.md)
