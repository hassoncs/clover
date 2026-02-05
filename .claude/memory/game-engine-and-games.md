GAME ENGINE & GAMES:
1. Game Registry & Loading:
   - /Users/hassoncs/Workspaces/Personal/slopcade/games/src/registry.ts - Game registry with GAME_IDS constant listing all games
   - /Users/hassoncs/Workspaces/Personal/slopcade/packages/game-bundler/src/unified-loader.ts - Unified game loader supporting TypeScript and bundle formats
2. Games Source Code:
   - /Users/hassoncs/Workspaces/Personal/slopcade/games/compiled/{gameName}/game.ts - TypeScript game definitions (16 games: simple, tetris, spaceInvaders, sokoban, snake, slopeggle, simon, pong, pacman, minefield, gemCrush, game2048, flappyBird, chess, breakoutBouncer, ballSort, asteroids)
3. Compiled Game Output:
   - /Users/hassoncs/Workspaces/Personal/slopcade/games/dist/{gameName}.json - Compiled JSON game definitions
   - /Users/hassoncs/Workspaces/Personal/slopcade/app/assets/embedded-games/{gameName}/game.json - Embedded game assets in app
4. Game Bundler Package:
   - /Users/hassoncs/Workspaces/Personal/slopcade/packages/game-bundler/src/compiler.ts - Bundle compiler (781 lines)
   - /Users/hassoncs/Workspaces/Personal/slopcade/packages/game-bundler/src/ts-compiler.ts - TypeScript game compiler
   - /Users/hassoncs/Workspaces/Personal/slopcade/packages/game-bundler/src/types.ts - Bundle types and interfaces
5. Build Scripts:
   - /Users/hassoncs/Workspaces/Personal/slopcade/games/scripts/build.ts - Main game build script (340 lines)
   - /Users/hassoncs/Workspaces/Personal/slopcade/packages/game-bundler/scripts/build-games.ts - Game bundler build script
ASSET PACKS & CONFIGURATION:
6. Asset Pack Structure:
   - /Users/hassoncs/Workspaces/Personal/slopcade/games/compiled/{gameName}/packs/{packName}/manifest.json - Asset pack manifest
   - /Users/hassoncs/Workspaces/Personal/slopcade/games/compiled/{gameName}/packs/{packName}/*.png - Asset images
   - /Users/hassoncs/Workspaces/Personal/slopcade/app/assets/embedded-games/{gameName}/asset-manifest.json - Embedded asset manifest
7. Asset Pack Example (ballSort):
   - /Users/hassoncs/Workspaces/Personal/slopcade/games/compiled/ballSort/packs/default/manifest.json - Pack UUID and assets
   - /Users/hassoncs/Workspaces/Personal/slopcade/app/assets/embedded-games/ballSort/asset-manifest.json - Maps template IDs to R2 keys
8. Asset System Configuration:
   - /Users/hassoncs/Workspaces/Personal/slopcade/app/lib/assets/AssetManifest.ts - Asset manifest extraction (220 lines)
   - /Users/hassoncs/Workspaces/Personal/slopcade/shared/src/types/asset-system.ts - Asset pack schema
ASSET GENERATION & IMAGE TOOLING:
9. AI Asset Generation Pipeline:
   - /Users/hassoncs/Workspaces/Personal/slopcade/api/src/ai/pipeline/types.ts - Core pipeline types (496 lines)
   - /Users/hassoncs/Workspaces/Personal/slopcade/api/src/ai/pipeline/executor.ts - Pipeline executor
   - /Users/hassoncs/Workspaces/Personal/slopcade/api/src/ai/pipeline/stages/index.ts - Pipeline stages
   - /Users/hassoncs/Workspaces/Personal/slopcade/api/src/ai/scenario.ts - Scenario.com API integration
   - /Users/hassoncs/Workspaces/Personal/slopcade/api/src/ai/comfyui.ts - ComfyUI integration for layered assets
10. Asset Generation Scripts:
    - /Users/hassoncs/Workspaces/Personal/slopcade/api/scripts/generate-breakout-silhouettes.ts - Silhouette generation
    - /Users/hassoncs/Workspaces/Personal/slopcade/api/scripts/download-pack-assets.ts - Asset download utility
    - /Users/hassoncs/Workspaces/Personal/slopcade/api/scripts/theme-game.ts - Theme application script
11. Asset Types Supported:
    - entity - Physics-constrained sprites (silhouette → img2img → removeBg → R2)
    - background - Full-frame backgrounds (txt2img → R2)
    - title_hero - Game title logos (txt2img → removeBg → R2)
    - parallax - Multi-layer backgrounds (txt2img → layeredDecompose → R2)
    - sheet - Sprite sheets, tile sheets, UI components
THE SIMPLE GAME:
12. Simple Game TypeScript Source:
    - /Users/hassoncs/Workspaces/Personal/slopcade/games/compiled/simple/game.ts - Complete game definition (64 lines)
13. Simple Game Compiled JSON:
    - /Users/hassoncs/Workspaces/Personal/slopcade/games/dist/simple.json - Compiled game definition
    - /Users/hassoncs/Workspaces/Personal/slopcade/app/assets/embedded-games/simple/game.json - Embedded copy
14. Bundled Game Format (for comparison):
    - /Users/hassoncs/Workspaces/Personal/slopcade/games/bundled/simplePong/manifest.json - Bundle format example
    - /Users/hassoncs/Workspaces/Personal/slopcade/games/bundled/simplePong/constants.json - Game constants
    - /Users/hassoncs/Workspaces/Personal/slopcade/games/bundled/simplePong/templates/all.json - Entity templates
    - /Users/hassoncs/Workspaces/Personal/slopcade/games/bundled/simplePong/entities/initial.json - Initial entities
    - /Users/hassoncs/Workspaces/Personal/slopcade/games/bundled/simplePong/rules/gameplay.json - Game rules
GAME ENGINE ARCHITECTURE:
15. Godot Bridge (Rendering/Physics):
    - /Users/hassoncs/Workspaces/Personal/slopcade/app/lib/godot/GodotBridge.native.ts - Native (iOS/Android)
    - /Users/hassoncs/Workspaces/Personal/slopcade/app/lib/godot/GodotBridge.web.ts - Web (WASM)
    - /Users/hassoncs/Workspaces/Personal/slopcade/godot_project/ - Godot 4 project files
16. Shared Types:
    - /Users/hassoncs/Workspaces/Personal/slopcade/shared/src/types/schemas.ts - GameDefinition schema
    - /Users/hassoncs/Workspaces/Personal/slopcade/shared/src/types/entity.ts - Entity types
PACKAGE.JSON SCRIPTS:
17. Root package.json:
    - /Users/hassoncs/Workspaces/Personal/slopcade/package.json - Scripts: build, dev, godot:watch, ship, etc.
18. Games package.json:
    - /Users/hassoncs/Workspaces/Personal/slopcade/games/package.json - Scripts: build, watch, test
19. App package.json:
    - /Users/hassoncs/Workspaces/Personal/slopcade/app/package.json - App-specific scripts
</files>
<answer>
Slopcade Project Structure - Complete Overview
1. GAME ENGINE ARCHITECTURE
The slopcade game engine uses a React Native + Godot 4 architecture:
React Native (UI/Game Logic)
        ↓
   GodotBridge (TypeScript Bridge)
        ↓
   Godot Engine (Physics/Rendering - Native + WASM)
Key Components:
- Godot Bridge: /Users/hassoncs/Workspaces/Personal/slopcade/app/lib/godot/ - Two implementations (native/web)
- Godot Project: /Users/hassoncs/Workspaces/Personal/slopcade/godot_project/ - GDScript scenes and physics
- Game Engine: /Users/hassoncs/Workspaces/Personal/slopcade/app/lib/game-engine/ - Entity management, behaviors, rules
2. GAMES STRUCTURE
There are 16 games in the system:
- simple, tetris, spaceInvaders, sokoban, snake, slopeggle, simon, pong, pacman, minefield, gemCrush, game2048, flappyBird, chess, breakoutBouncer, ballSort, asteroids
Game Format - TypeScript:
Each game has a game.ts file exporting:
import type { GameDefinition } from "@slopcade/shared";
const game: GameDefinition = {
  metadata: { id, title, description, version },
  assetSystem: { activePackId: "..." },
  background: { type, color/imageUrl },
  world: { gravity, pixelsPerMeter, bounds },
  camera: { type, zoom },
  templates: { [templateId]: { visual, physics, collider } },
  entities: [ { id, name, template, transform } ],
  rules: [ { id, event, condition, action } ],
};
Game Format - Bundled JSON:
Compiled games are split into:
- manifest.json - Metadata and world config
- constants.json - Game constants
- templates/all.json - Entity templates
- entities/initial.json - Starting entities
- rules/gameplay.json - Game rules
3. ASSET PACKS SYSTEM
Structure:
games/compiled/{gameName}/
  packs/
    {packName}/
      manifest.json          # Pack metadata and asset list
      *.png                  # Asset images (referenced in manifest)
Manifest Format:
{
  version: 1,
  packId: f661beb6-1e5e-4b9e-a01f-314c87248b75,
  name: default,
  assets: {
    tube: { file: tube.png },
    ball0: { file: ball0.png }
  }
}
Asset Manifest (Embedded):
/Users/hassoncs/Workspaces/Personal/slopcade/app/assets/embedded-games/{gameName}/asset-manifest.json
{
  default/tube: { file: packs/default/tube.png, r2Key: ... }
}
Asset Pack References in Games:
- Game definition has assetSystem.activePackId pointing to pack UUID
- Entity templates reference assets via visual.type: "image" and visual.asset: "templateId"
- Runtime resolves asset URLs from pack manifests
4. ASSET GENERATION PIPELINE
Type-Driven Pipeline (/Users/hassoncs/Workspaces/Personal/slopcade/api/src/ai/pipeline/types.ts):
Asset Types:
- entity - Silhouette-guided sprite generation
- background - Full background images
- title_hero - Game title logos
- parallax - Multi-layer parallax backgrounds
- sheet - Sprite sheets, tile sheets, UI components
Pipeline Stages (per asset type):
// Entity pipeline
Silhouette → PromptBuild → img2img → RemoveBg → R2Upload
// Background pipeline
PromptBuild → txt2img → R2Upload
// Parallax pipeline
PromptBuild → txt2img → LayeredDecompose → R2Upload
CLI Usage:
# Generate assets for a game (script doesn't exist yet - mentioned in docs)
npx tsx api/scripts/generate-game-assets.ts slopeggle --dry-run
npx tsx api/scripts/generate-game-assets.ts slopeggle --asset=ball
Game Config Pattern (api/scripts/game-configs/{gameName}.ts):
export const myGameConfig: GameAssetConfig = {
  gameId: 'my-game',
  gameTitle: 'My Game',
  theme: 'visual theme description',
  style: 'cartoon', // pixel | cartoon | 3d | flat
  r2Prefix: 'generated/my-game',
  assets: [
    { type: 'entity', id: 'player', shape: 'box', width: 1, height: 2, 
      entityType: 'character', description: '...' },
    { type: 'background', id: 'background', prompt: '...' },
  ],
};
5. THE SIMPLE GAME - Complete Breakdown
TypeScript Source (/Users/hassoncs/Workspaces/Personal/slopcade/games/compiled/simple/game.ts):
const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const CUBE_SIZE = 1;
const game: GameDefinition = {
  metadata: {
    id: "simple",
    title: "Simple",
    description: "Minimal test game - background and a cube",
    instructions: "Nothing to do here. Just a cube.",
    version: "1.0.0",
  },
  assetSystem: { activePackId: "default" },
  background: {
    type: "static",
    color: "#1a1a2e",  // Dark blue background
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 50,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  templates: {
    cube: {
      id: "cube",
      tags: ["cube"],
      visual: {
        type: "rect",
        width: CUBE_SIZE,
        height: CUBE_SIZE,
        color: "#4ade80",  // Green cube
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: CUBE_SIZE,
        height: CUBE_SIZE,
      },
    },
  },
  entities: [
    {
      id: "cube",
      name: "Cube",
      template: "cube",
      transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
};
Key Characteristics:
- No gravity (world.gravity.y = 0)
- Static cube entity at center of world
- Simple color-based visuals (no images)
- Single template + single entity
- No rules/scripts
- No asset pack (uses activePackId: "default" but no assets defined)
6. BUILD & EMBED FLOW
Build Process (games/scripts/build.ts):
1. Load each game from games/compiled/{game}/game.ts
2. Bundle any games/compiled/{game}/script.ts with esbuild
3. Discover asset packs in games/compiled/{game}/packs/
4. Copy pack assets to app/assets/embedded-games/{game}/packs/
5. Generate asset-manifest.json mapping template IDs to R2 keys
6. Write compiled JSON to:
   - games/dist/{game}.json - Distribution copy
   - app/assets/embedded-games/{game}/game.json - Embedded copy
7. Generate TypeScript registry: app/lib/offline/embedded-games-registry.ts
8. Create symlinks in app/public/games/
Build Output:
games/dist/
  manifest.json                    # All games list
  simple.json                     # Compiled game
  tetris.json, etc.
app/assets/embedded-games/
  manifest.json                   # Embedded games manifest
  simple/
    game.json                    # Game definition
    asset-manifest.json          # Asset references (if any)
    packs/
      default/
        *.png                    # Asset images
7. HOW PIECES CONNECT
┌─────────────────────────────────────────────────────────────┐
│                    Build Time                                 │
├─────────────────────────────────────────────────────────────┤
│  games/compiled/{game}/game.ts                               │
│         ↓                                                    │
│  games/scripts/build.ts (compiles)                          │
│         ↓                                                    │
│  games/dist/{game}.json (dist)                              │
│  app/assets/embedded-games/{game}/game.json (app)          │
│  app/assets/embedded-games/{game}/packs/*/*.png             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Runtime (App)                              │
├─────────────────────────────────────────────────────────────┤
│  app/lib/offline/embedded-games-registry.ts (loads games)   │
│          ↓                                                   │
│  app/lib/assets/AssetManifest.ts (extracts assets)          │
│          ↓                                                   │
│  app/lib/game-engine/EntityManager.ts (spawns entities)     │
│          ↓                                                   │
│  GodotBridge.native.ts/web.ts (renders in Godot)             │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Asset Generation                           │
├─────────────────────────────────────────────────────────────┤
│  api/src/ai/pipeline/types.ts (defines asset specs)          │
│          ↓                                                   │
│  api/scripts/generate-breakout-silhouettes.ts (example)     │
│          ↓                                                   │
│  api/src/ai/scenario.ts / comfyui.ts (AI providers)         │
│          ↓                                                   │
│  R2 Storage (uploaded assets)                               │
└─────────────────────────────────────────────────────────────┘
</answer>
<next_steps>
For Working with the Simple Game:
1. Modify /Users/hassoncs/Workspaces/Personal/slopcade/games/compiled/simple/game.ts
2. Run pnpm --filter @slopcade/games build to rebuild
3. Test in app with Metro refresh
For Adding Asset Generation:
1. Create /Users/hassoncs/Workspaces/Personal/slopcade/api/scripts/game-configs/{gameName}.ts
2. Register in api/scripts/game-configs/index.ts
3. Run asset generation pipeline
For Understanding Any Game:
1. Check TypeScript source: games/compiled/{game}/game.ts
2. Check compiled output: games/dist/{game}.json
3. Check embedded version: app/assets/embedded-games/{game}/game.json
4. Check asset packs: games/compiled/{game}/packs/
For Modifying Build Process:
1. Build script: games/scripts/build.ts (340 lines)
2. Game bundler: packages/game-bundler/src/compiler.ts (781 lines)
3. Registry: games/src/registry.ts
Ready to proceed - The project structure is fully documented above. All paths are absolute and ready for immediate use.
</next_steps>
</results>