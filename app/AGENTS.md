Project Guide

 **Entry point for AI agents developers**

 project two main
. **Game Engine** Godot 4 physics rendering for React Native (iOS, Android, Web
 2. **Game Maker** AI-powered game generation from natural language prompts



 GODOT AUTOMATION (IMPORTANT

 **GODOT EXPORTS AUTOMATED.
 **Automatic Watching** `scripts/export-godot. watches `godot_project rebuilds on change.,.,.,.,.
 manually rebuild.
 **Service** Managed via `devmux `godot` service.



 Quick Start


 Start development servers (DevMux managed
 dev Starts Metro (port 8085) API (port 8789) Godot Watcher
 Documentation site (port 3000
 storybook (port 6006)
 svc:status Check service status

 Run on device ensures Metro via DevMux
 ios iOS simulator
 android emulator

 Build Test
 packages
 Run tests
 Type check

 Documentation
 Start docs site auto-updating TypeScript
:build docs for production
 Regenerate TypeDoc API reference

 Registry (auto-discovered modules
 generate Regenerate module registry-time
:registry:watch Watch mode (manual use




 Documentation

Interactive Documentation Site
 Start with `pnpm docs access auto-updating documentation http://localhost:3000:
 **5 Interactive Pages** Behaviors, Effects, Particles, Rules, Examples
 **7 Comprehensive Guides** Setup, testing, asset generation, more
 **TypeDoc API Reference** Full TypeScript API documentation
 **Auto-Updates** Changes to TypeScript files update in < 3 seconds

 See [packages/docs/README.... for detailed documentation system guide.

 Static Documentation
 documentation in `docs/` component-first structure

 Index  Description

[docs/INDEX.... Global documentation hub
[docs/godot-migration/]..
[docs/game-maker/INDEX.md] AI game generation, entities, scripting
...
 [Entity System] Game entity structure
 [Scripting System] Script-first logic
 [Registry System] Auto-discovered loading

 [Troubleshooting].. Common issues fixes

Writing Documentation

 See. opencode/skills/documentation. md].../skills/documentation.
 Documentation taxonomy structure
 Naming conventions
 Placement rules
 update create new docs



Architecture at a Glance



 DevMux (Orchestrator) │
 Managed Tmux Sessions for Long-Running Processes │
 - Metro (:8085)
 API (:8789) │
 Storybook (:6006)
 Godot Watcher (auto-rebuilds WASM/. pck) │



 React Components │
 (GameRuntime, Examples, UI)



 GodotBridge (TypeScript) │
 lib/godot/GodotBridge. native. ts| GodotBridge. web. ts


 ┌───────────┴───────────┐


 Native (JSI) │ Web (WASM) │
 react-native- Godot WASM + │
 godot GameBridge. gd
 └──────────────────┘ └─────────────────┘


 **Full architecture docs**: [godot-migration/](../docs/godot-migration-maker/architecture.. /docs/game-maker/architecture



Game Engine Architecture (Script-First)

The game engine underwent a major migration in Feb 2026 to a script-first architecture.

- **Script-First Logic**: All game logic is now implemented in JavaScript/TypeScript modules. The legacy Rules and Behavior systems are deprecated.
- **`scriptRef`**: Prefabs and Entities reference logic modules via the `scriptRef` field.
- **Unified Event Bus**: Communication between engine and React UI flows through `GameEventBus`.
- **Generic Variables**: `score`, `lives`, etc., are managed via a unified variables system.
- **System Ownership**: Each system has a single source of truth injected via `SystemContext`.



 Development Workflow (DevMux)

 opens port runs via DevMux.

 project uses `DevMux background services `tmux` sessions. ensures
. Servers don't die close terminal tab.
. **Idempotency** Running `pnpm dev` to session.
. Scripts like `pnpm ios ensure Metro running before launching simulator.

 Key Commands

Command  Action

 `pnpm dev Ensures `metro (:8085), `api (:8789), `godot, `registry` (watchers running.
 `pnpm storybook Ensures `storybook (:6006) running.
 `pnpm svc:status Shows health configured services.
 `pnpm svc:stop Stops services tmux sessions.
 `npx devmux attach <service> Connect specific session.., `metro see logs.

 **Configuration** `devmux. config. json` root port mappings commands.



 Key Directories

 Path Purpose

 `lib/godot/` Bridge** TypeScript communication
 `lib/game-engine/ Entity manager, behaviors,
 `lib/registry/ **Universal Registry** Auto-discovered loading system
 `app/examples/` Expo Router pages demos (auto-discovered
 `godot_project/ GDScript,, physics
 `docs/ documentation



 Tech Stack

 Layer Technology

 **Framework** Expo SDK 54
 **Rendering/Physics** Godot 4 (native + WASM)
 **Bridge (Native `@borndotcom/react-native-godot`
**Bridge (Web)** Godot WASM JavaScriptBridge
 NativeWind (Tailwind)
 **API** Hono tRPC Cloudflare Workers
 **Database** Cloudflare D1
 **AI** OpenRouter (GPT-4o) Scenario.



 Asset Generation Pipeline

project uses **type-driven asset generation pipeline** for AI-generated game sprites, backgrounds, title images. Different asset types flow through pipeline stages.

 Asset Types

 Type Pipeline Description

 `entity` silhouette → img2img → removeBg → R2 Physics-constrained sprites
 `background` txt2img → R2 Full-frame backgrounds
 `title_hero` txt2img → removeBg → R2 Game title logos
 `parallax` txt2img → layeredDecompose → R2 Multi-layer backgrounds

 CLI Usage


 Generate all assets for game
 api/scripts/generate-game-assets.

 Dry run (preview without API calls
.

 Generate single asset
.=ball

 Generate only entity sprites
. --type=entity

 List available games
.


 Adding New Game

. Create config in `api/scripts/game-configs/

.
 import type GameAssetConfig from.... /src/ai/pipeline/types

export myGameConfig GameAssetConfig
 gameId: 'my-game',
 gameTitle:',
 theme visual theme description',
 style 'cartoon', 3d
 'generated/my-game',
 assets
 type 'entity, id 'player', shape 'box', width 1, height: 2, entityType 'character', description '...,
 'background, id,...,
 'title_hero', id, title 'My Game', themeDescription '...,
,



. Register `api/scripts/game-configs/index.

 Debug Output

 stage saves artifacts `api/debug-output/{gameId{assetId}
 `silhouette. png Physics shape mask
 `build-prompt. Full prompts
 `img2img_generated. png Raw AI output
 `remove-bg_no. png Final transparent sprite

 Key Files

 Path Purpose

 `api/src/ai/pipeline core, stages, executor
/pipeline/registry. Asset type stage mapping
/src/adapters Platform adapters (Workers vs Node
 `api/scripts/generate-game-assets. CLI script
`api/scripts/game-configs Per-game asset configurations



 GodotBridge Quick Reference


 import createGodotBridge, GodotView/lib/godot

 Initialize bridge
 await createGodotBridge
. initialize

 Load game definition
 await bridge.

 Spawn entities
 entityId =. spawnEntity(,,

Control entities
 bridge. applyImpulse(entityId, x 0, y
. setLinearVelocity(entityId, x 5, y 0

 Dynamic images
 bridge. setEntityImage(entityId, imageUrl, width, height);

 Cleanup
 bridge. dispose();


 API See/godot/types. complete interface



 Platform-Specific Code

 Use. web.. native. extensions platform-specific implementations


 lib/godot
 GodotBridge.. iOS/Android
. web. WASM implementation
. Unified export
. Shared types




 Local Storage (Non Data)

 `lib/utils/storage. persisting non data across reloads


 import getStorageItem, setStorageItem/lib/utils/storage

 prefs await(_key, defaultValue);
 setStorageItem,


 Cases User preferences, dev settings, UI state, feature flags
 Auth tokens `lib/auth/storage`
 Guide. opencode/skills/storage.



 Registry System (Auto-Discovery)

 project uses Lazy for type-safe, auto-discovered module loading. Files with const metadata discovered available for Suspense-compatible lazy loading.

Adding New Example

`typescript
 app/examples/my_example.
 import type ExampleMeta@/lib/registry/types";

export metadata: ExampleMeta
 title: "My Example",
 description: "Does cool.,


 export default function MyExample(...


 run `pnpm generate:registry` `pnpm dev`.

 Registry


 import EXAMPLES, getExampleComponent, ExampleId from "@/lib/registry";

 List (static metadata, no load
 EXAMPLES. map <Item title. meta.

 Type-safe loading
 Example = getExampleComponent("pinball"); validates ID!
 <Suspense fallback=<Loading />}><Example


 Key Files

 Purpose

 `lib/registry/types. Type definitions
 `lib/registry/generated/examples. Auto registry
. config. Registry configuration

 **Full documentation**/shared/reference/registry-system....



 Debugging Quick Tips

 Issue Check

 Entity not moving `bodyType: 'dynamic' `density > 0`
 Passing through objects Enable `bullet: true` on fast bodies
 Jittery physics Reduce timestep use fixed timestep
 No collision Check `categoryBits` `maskBits`
Images not updating paths don `file://` prefix



 Related Documentation

[Documentation Skill]... opencode/skills/documentation. write docs project
[Godot Project README].._project/README. Godot-specific documentation
[Game Templates].. /docs/game-maker/templates Pre-built game patterns
