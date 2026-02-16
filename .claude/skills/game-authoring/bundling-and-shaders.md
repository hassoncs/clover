---
name: game-authoring/bundling-and-shaders
description: "Game bundling system, shader pipeline, and effect compilation. Covers bundle format, compilation, shader graphs, and effects. Use when bundling games, working with shaders, or understanding the effects pipeline."
---

# Game Bundling, Shaders & Effects Pipeline

> Reference for the game bundling system, shader pipeline, and effect system.

## Bundle Format (Standard Game Format)

Games are directories of JSON/JS files compiled into a `GameDefinition` by the bundler.

### Directory Structure

```
r2/games/{slug}/
  manifest.json          # Metadata, world config, background, camera, variables
  constants.json         # Optional compile-time constants (resolved via { const: "NAME" })
  effects.json           # Optional shader/effect definitions
  assets.json            # Optional asset references
  prefabs/               # Prefab definitions (maps to GameDefinition.prefabs)
    all.json             # Array of prefab objects [{id, tags, visual, physics, ...}]
  entities/              # Entity placements
    initial.json         # Array of entity objects [{id, name, prefab, transform, ...}]
  scripts/               # JavaScript logic (plain JS, not TypeScript)
    main.js              # Uses exports.functionName = function(ctx) { ... }
  assets/                # Optional local asset files (images, sounds)
  
  # Build outputs (auto-generated, do NOT edit):
  definition.json        # Compiled GameDefinition
  metadata.json          # Extracted metadata for the API
```

### manifest.json

```json
{
  "name": "unique-game-id",
  "version": "1.0.0",
  "title": "My Game",
  "description": "A cool game",
  "instructions": "Tap to play!",
  "world": {
    "gravity": { "x": 0, "y": -10 },
    "pixelsPerMeter": 50,
    "bounds": { "width": 12, "height": 16 }
  },
  "background": { "type": "static", "color": "#1a1a2e" },
  "camera": { "type": "fixed", "zoom": 1 }
}
```

### effects.json (Shader Definitions)

```json
{
  "shaders": {
    "rainbow_wave": {
      "filename": "rainbow_wave.gdshader",
      "glsl": "shader_type canvas_item;\n\nuniform float speed : hint_range(0.0, 5.0) = 1.0;\n\nvoid fragment() {\n\t// shader code\n}"
    }
  }
}
```

### scripts/main.js

```javascript
exports.onStart = function(ctx) {
  ctx.setVariable('score', 0);
};

exports.onUpdate = function(ctx, dt) {
  // frame logic
};

exports.customFunction = function(ctx) {
  // called via { type: "run_script", export: "customFunction" }
};
```

## Build Pipeline

### How Games Get Built and Served

1. **Source**: Game files in `r2/games/{slug}/` (bundle format: `manifest.json`, `scripts/`, `prefabs/`, `entities/`)
2. **Build**: `api/scripts/sync-r2.ts` runs `compileBundle()` on each game directory that has a `manifest.json`
3. **Output**: Writes `definition.json` + `metadata.json` as build outputs to the game directory (gitignored)
4. **Sync**: Copies all files from `r2/` to the local Miniflare R2 bucket
5. **Seed**: On API boot, `autoSeedGamesFromR2` reads `metadata.json` from R2 and inserts game rows into D1
6. **Serve**: API reads `definition.json` from R2 bucket via `trpc.games.getPublic`

**Important**: `definition.json` and `metadata.json` are auto-generated build outputs. Never edit them directly — edit the source files (`manifest.json`, `scripts/*.js`, `prefabs/*.json`, `entities/*.json`) instead.

### Watch Mode

The `games-watcher` devmux service (`api/scripts/sync-r2.ts --watch`) watches `r2/games/` recursively. When source files change, it recompiles all games and re-syncs to R2. Changes to `definition.json` and `metadata.json` are ignored to avoid infinite loops.

### Key Files

| File | Purpose |
|------|---------|
| `api/scripts/sync-r2.ts` | Compiles games from source, syncs to local R2 |
| `packages/game-bundler/src/compiler.ts` | Bundle format compiler (`compileBundle()`) |
| `packages/game-bundler/src/unified-loader.ts` | Format detection and loading |
| `api/src/lib/auto-seed.ts` | Seeds D1 with game metadata from R2 on API boot |

## Shader & Effect System

### Architecture

The effect system is a **node-based shader graph** compiled from `EffectGraphSpec` into `CompiledPlan`:

1. **Authoring**: Define effects in TypeScript or JSON (`EffectGraphSpec`)
2. **Compilation**: `compiler.ts` produces a `CompiledPlan` (ordered render passes)
3. **Runtime**: Plan sent to Godot's `GraphExecutor.gd` via the bridge
4. **Execution**: Godot manages SubViewport render passes and ping-pong feedback

### Simple Shader Path (effects.shaders)

For pre-made games, shaders are stored directly in the `GameDefinition`:

```typescript
effects: {
  shaders: {
    "my_shader": {
      filename: "my_shader.gdshader",
      glsl: "shader_type canvas_item;\n..."
    }
  }
}
```

At load time, `GameLoader.applyEffects()` calls `bridge.hotSwapShader(id, glsl)` for each shader.

### Shader Format (Godot Shading Language)

All shaders must use **Godot Shading Language** (NOT WebGL GLSL):

```glsl
shader_type canvas_item;

uniform float speed : hint_range(0.0, 5.0) = 1.0;
uniform vec4 tint_color : source_color = vec4(1.0, 0.5, 0.0, 1.0);

void fragment() {
    vec4 tex = texture(TEXTURE, UV);
    // ... shader logic
    COLOR = vec4(result, tex.a);
}
```

Key differences from WebGL GLSL:
- Uses `shader_type canvas_item;` header
- `uniform` hints: `hint_range(min, max)`, `source_color`
- Built-in: `UV`, `TIME`, `TEXTURE`, `COLOR`, `TEXTURE_PIXEL_SIZE`
- Post-process shaders use `SCREEN_TEXTURE` and `SCREEN_UV`

### Shader Library

37+ built-in shaders in `shared/src/effects/shaderLibrary.ts`:
- **Sprite**: silhouette, tint, waveDistortion, rainbow, pixelate, outline, glow, dissolve, holographic, etc.
- **Post-process**: underwater, vignette, CRT, bloom, blur, scanlines, nightVision, glitch, chromaticAberration, etc.

### Effect Graph System

For complex multi-pass effects, use `EffectGraphSpec`:

```typescript
import { createSingleEffectGraph, compileSingleEffect } from 'effects-helpers';

// Simple single-node graph
const graph = createSingleEffectGraph('glow', { glow_intensity: 2.0 });

// Full graph with multiple nodes and connections
const graph: EffectGraphSpec = {
  id: 'my_effect',
  version: '1.0.0',
  engineApiVersion: '2.0.0',
  scope: 'screen', // or 'entity'
  nodes: [...],
  connections: [...],
  feedbackEdges: [...],
  lifecycle: { autoStart: true, stopMode: 'clear' }
};
```

### Key Effect Types

| Type | Key | Use Case |
|------|-----|----------|
| `EffectGraphSpec` | Authoring graph | Define multi-node effect chains |
| `CompiledPlan` | Execution plan | Flattened render passes for runtime |
| `EffectNode` | Graph node | Single shader operation |
| `EffectParamSchema` | Uniform metadata | UI hints for parameter tuning |

### Key Effect Files

| File | Purpose |
|------|---------|
| `shared/src/effects/types.ts` | Core type definitions |
| `shared/src/effects/compiler.ts` | Graph → CompiledPlan |
| `shared/src/effects/shaderLibrary.ts` | 37+ built-in shader GLSL |
| `shared/src/effects/shaderRegistry.ts` | Shader metadata & params |
| `app/lib/game-engine/effects-helpers.ts` | Helper to create single-node graphs |
| `app/lib/game-engine/GameLoader.ts` | `applyEffects()` — loads shaders at game start |
