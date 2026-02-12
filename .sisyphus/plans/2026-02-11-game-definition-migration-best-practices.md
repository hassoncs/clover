# Best Practices: Migrating Game Definitions to JSON Bundle Format

This document outlines the strategy and best practices for migrating game definitions from legacy TypeScript modules to the unified JSON workspace/bundle format.

## 1. Schema & Versioning

### Manifest (`slopcade.json`)
The manifest is the entry point for the game workspace. It should contain metadata and versioning information.

```json
{
  "id": "ballSort",
  "name": "Ball Sort",
  "version": "2.1.0",
  "schemaVersion": "1.0",
  "description": "Sort colored balls into tubes",
  "author": "Slopcade Team"
}
```

### Versioning Strategy
- **Game Version**: Semantic versioning for the game content itself.
- **Schema Version**: Incremented when the `GameDefinition` structure changes in a breaking way.
- **Validation**: Always run `validateGameDefinition` from `@slopcade/shared` during the build process.

## 2. Workspace Organization

The recommended directory structure for a game workspace:

```text
r2/games/myGame/
├── slopcade.json       # Manifest & Metadata
├── world.json          # World & Background config
├── entities.json       # Initial entity instances
├── rules.json          # Game rules array
├── constants.json      # Shared constants (referenced via { "const": "NAME" })
├── prefabs/            # Individual prefab files
│   ├── player.json
│   └── enemy.json
├── scripts/            # Plain JS logic
│   ├── main.js
│   └── utils.js
├── shaders/            # Godot shaders
│   └── highlight.gdshader
└── assets/             # Local assets (images, sounds)
    ├── player.png
    └── jump.wav
```

## 3. Script Conversion (`exports.*` pattern)

Legacy `script.ts` files should be split into logical `.js` files in the `scripts/` directory.

### Pattern
Use the `exports` object to expose functions to the engine.

```javascript
// scripts/level.js
exports.generateLevel = (ctx) => {
  const count = ctx.getVariable('tubeCount');
  // ... logic
};

// scripts/logic.js
exports.onStart = (ctx) => {
  ctx.setVariable('score', 0);
};
```

### Compilation
The `PackageCompiler` concatenates these files, wrapping them in a way that `exports` are collected into a single object available to the `RunScript` action.

## 4. Godot Shader Embedding

Shaders should be stored as raw `.gdshader` files for better editor support (syntax highlighting, linting).

### Organization
- Place in `shaders/` directory.
- The compiler reads these files and populates the `effects.shaders` record in the final bundle.

### Escaping
When embedding in JSON, newlines and quotes must be escaped. The build pipeline handles this automatically via `JSON.stringify()`.

```json
{
  "effects": {
    "shaders": {
      "highlight": {
        "filename": "highlight.gdshader",
        "glsl": "shader_type canvas_item;\nvoid fragment() {\n  COLOR = texture(TEXTURE, UV) * 2.0;\n}"
      }
    }
  }
}
```

## 5. Backward-Compatible Registry & Build

### Registry Transition (`game-registry.ts`)
The registry should prioritize the new format but fall back to legacy.

```typescript
async function loadGame(id: string) {
  const workspacePath = join(GAMES_ROOT, id, 'slopcade.json');
  if (existsSync(workspacePath)) {
    return compileWorkspace(id); // New format
  }
  
  const legacyPath = join(GAMES_ROOT, id, 'src/game.ts');
  if (existsSync(legacyPath)) {
    return importLegacyModule(id); // Legacy format
  }
}
```

### Build Pipeline
The `build-games.ts` script should detect the format per game and use the appropriate compiler.

## 6. Watch Pipeline Behavior

The watcher should:
1. Watch the entire `r2/games/` directory recursively.
2. Ignore build artifacts (`definition.json`, `metadata.json`).
3. Debounce builds (300ms) to handle batch file saves.
4. Trigger a full re-compile of the specific game workspace that changed.

## 7. Phased Migration Strategy

1. **Infrastructure**: Update `PackageCompiler` and `game-registry` to support both formats.
2. **Validation**: Ensure the `game-bundler` tests pass for all existing game structures.
3. **Pilot**: Migrate one simple game (e.g., `tweenToggleCube`) to the workspace format.
4. **Automation**: Use `migrate-legacy-games.ts` to automate the conversion of remaining games.
5. **Cleanup**: Once all games are verified in the new format, remove legacy TS loaders and `esbuild` bundling for `game.ts`.

## 8. Validation Strategy

- **Schema Validation**: Zod-based check of the final `GameDefinition`.
- **Semantic Validation**: Check for broken prefab references, duplicate IDs, and circular dependencies.
- **Script Validation**: Basic syntax check and verification of required exports.
- **Asset Validation**: Verify all referenced assets exist in `assets.json` or the `assets/` directory.
