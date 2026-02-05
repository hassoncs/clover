# Complete Code Flow: Loading a Game (e.g., Ball Sort)

> Research document generated 2026-02-04. Based on thorough codebase analysis.

---

## Phase 1: Routing & Data Fetching

**Entry Point:** User navigates to `/test-games/ballSort` (template) or `/play/{uuid}` (database game)

| Step | File | What Happens |
|------|------|-------------|
| 1 | `app/app/test-games/[id].tsx` | Expo Router mounts `TestGameRunScreen`. `useLocalSearchParams()` extracts `{ id: "ballSort" }` |
| 2 | Same file | Loads `EMBEDDED_GAME_JSONS["ballSort"]` — a pre-bundled JSON. For DB games, `play/[id].tsx` calls `trpc.games.get.query({ id })` instead |
| 3 | Same file | Resolves asset pack entries: looks up `EMBEDDED_ASSET_MANIFESTS[id]`, maps each `r2Key` → full URL via `getAssetUrl()` |
| 4 | Same file | `mergeAssetsIntoTemplates(gameDefinition, resolvedPackEntries)` — deep clones the definition and patches `template.visual.url` with resolved image URLs from the asset pack |

**Key file:** `app/lib/assets/mergeAssetsIntoTemplates.ts` — iterates every template with `visual.type === 'image'`, replaces URL + placement from pack entries.

---

## Phase 2: Asset Preloading (TypeScript side)

| Step | File | What Happens |
|------|------|-------------|
| 5 | `useGamePreloader.ts` | `extractAssetManifest(definition, { resolvedPackEntries })` scans the enriched definition for all image/sound URLs |
| 6 | `AssetManifest.ts` | Builds manifest by scanning: title hero image, loading screen bg, background, parallax layers, asset pack images, tile sheets, sounds. Deduplicates via `Set<string>`. Assigns priority (critical/high/normal) |
| 7 | `useGamePreloader.ts` | Creates `AssetPreloader(manifest, setProgress)` and calls `preloader.preloadAll()` |
| 8 | `AssetPreloader.ts` | **Web:** `new Image(); img.src = url` for each image. **Native:** `FileSystem.downloadAsync()` to cache. Concurrency: 4 images, 2 sounds. Progress callback fires after each asset completes |
| 9 | `useGamePreloader.ts` | Phase transitions to `'ready'`. `imageUrls` array is set with all URLs |

---

## Phase 3: Mounting Godot

| Step | File | What Happens |
|------|------|-------------|
| 10 | `test-games/[id].tsx` | `canMountGame` check passes → renders `GameRuntimeWrapper` |
| 11 | `GameRuntimeWrapper` | `import("@/lib/game-engine/GameRuntime.godot")` — lazy loads the Godot runtime module |
| 12 | `GameRuntime.godot.tsx` | Renders `<GodotView>` component |
| 13 | `GodotView.web.tsx` | Renders an `<iframe src="/godot/index.html">` that loads the Godot WASM engine |
| 14 | `GodotView.web.tsx` | Polls every 100ms for `iframe.contentWindow.GodotBridge` (set by Godot's `_setup_js_bridge` in GDScript). When found, calls `onReady()` |

---

## Phase 4: Bridge Initialization & Texture Preloading in Godot

| Step | File | What Happens |
|------|------|-------------|
| 15 | `GameRuntime.godot.tsx:504-507` | `handleGodotReady` fires → sets `godotReady = true` |
| 16 | `GameRuntime.godot.tsx:527-529` | `createGodotBridge()` → `bridge.initialize()` — web version polls for `window.GodotBridge` in the iframe, registers all collision/entity/input callbacks |
| 17 | `GameRuntime.godot.tsx:533-541` | `bridge.preloadTextures(preloadTextureUrls, progressCallback)` — sends all image URLs to Godot |
| 18 | `GodotBridge.web.ts:882` | Passes `JSON.stringify(urls)` + a JS callback function to Godot's `preloadTextures` |
| 19 | `VisualRenderer.gd:96-114` | Godot receives URLs, calls `_texture_loader` to HTTP-download each image into its texture cache. After each download completes, calls back the JS progress callback with `(percent, completed, failed)` |
| 20 | `GodotBridge.web.ts:877` | When `percent >= 100`, resolves the Promise |

---

## Phase 5: Loading Game Definition into Godot

| Step | File | What Happens |
|------|------|-------------|
| 21 | `GameRuntime.godot.tsx:551` | `bridge.loadGame(definition)` — sends the full `GameDefinition` JSON to Godot |
| 22 | `GodotBridge.web.ts:463` | Calls `godotBridge.loadGameJson(JSON.stringify(definition))` |
| 23 | `GameBridge.gd:242-256` | `load_game_json()` — the heart of it all: |
| | | 1. Parses JSON |
| | | 2. `clear_game()` — destroys old entities/joints |
| | | 3. `_world_system.setup_world()` — sets gravity, pixelsPerMeter |
| | | 4. `_visual_renderer.setup_background()` — creates background sprite |
| | | 5. `templates = game_data.templates` — stores templates for spawning |
| | | 6. `_entity_factory.update_state()` — syncs factory with current bridge state |
| | | 7. Loops `game_data.entities` — calls `_entity_factory.create_entity()` for each |
| | | 8. Emits `game_loaded` signal |

---

## Phase 6: Entity Creation (Godot side) — "Default Entities"

| Step | File | What Happens |
|------|------|-------------|
| 24 | `EntityFactory.gd:56-157` | `create_entity(entity_data)`: |
| | | 1. Gets `entity_id` and `template_id` from data |
| | | 2. Merges template: if entity references a template, deep-merges template defaults with entity overrides (physics, collider, visual, character) |
| | | 3. Creates the appropriate Godot node: `RigidBody2D` (dynamic), `StaticBody2D` (static), `CharacterBody2D` (kinematic), `Area2D` (collider-only), or plain `Node2D` (visual-only) |
| | | 4. Sets position via `game_to_godot_pos()` (flips Y axis) |
| | | 5. Adds visual: delegates to `_visual_renderer.add_visual()` — creates `Sprite2D` with color rect, image texture, polygon, etc. |
| | | 6. Adds collision shape from collider data |
| | | 7. `_game_root.add_child(node)` — adds to scene tree |
| | | 8. Sets metadata (template, tags, behaviors) |
| | | 9. Creates children recursively |
| | | 10. Returns `EntityRecord` |

---

## Phase 7: TypeScript-Side Entity Registration

| Step | File | What Happens |
|------|------|-------------|
| 25 | `GameRuntime.godot.tsx:554` | `bridge.pausePhysics()` — freezes physics while setting up |
| 26 | `GameRuntime.godot.tsx:593-597` | `GameLoader.load(definition)` — TS-side entity creation |
| 27 | `GameLoader.ts:29-63` | Creates `EntityManager`, then loops `definition.entities` calling `entityManager.createEntity(entity)` for EACH entity. Also creates joints. Creates `GameState` and `GameEventBus` |
| 28 | `EntityManager.ts:88-95` | Registers templates from `definition.templates`. Creates `RuntimeEntity` objects with behaviors, tags, transform data |

**Key insight:** Entities are created in BOTH places — Godot creates the physics/visual nodes, TypeScript creates the logical `RuntimeEntity` with behaviors and rules. They're linked by `entity_id`.

---

## Phase 8: Game Systems Setup & game_loaded Event

| Step | File | What Happens |
|------|------|-------------|
| 29 | `GameRuntime.godot.tsx:671-839` | Registers all game systems into `GameSystemRunner`: Viewport, Input, Camera, EntityManager, ComputedValues, PropertySync, BehaviorExecutor, ScriptSandbox, RulesSystem, Tween, TargetPosition, Match3, Container, HoverHighlight |
| 30 | `GameRuntime.godot.tsx:798-801` | `rulesSystem.setRuntimeState(game.gameState)` + `rulesSystem.setEventBus(game.events)` — connects rules to game state |
| 31 | `GameRuntime.godot.tsx:843` | `pendingLifecycleEventsRef.current.push('game_loaded')` — **queues** the lifecycle event |
| 32 | `GameRuntime.godot.tsx:659-669` | `setIsReady(true)`, calls `onReady()` callback |

---

## Phase 9: Game Loop Start & Lifecycle Event Processing

| Step | File | What Happens |
|------|------|-------------|
| 33 | `GameRuntime.godot.tsx:1951-1963` | Shows "ready" overlay with "Play" button (state is `"ready"`) |
| 34 | User presses Play → `handleStart()` | Pushes `'game_started'` lifecycle event, calls `bridge.resumePhysics()`, sets state to `"playing"` |
| 35 | `GameRuntime.godot.tsx:1032-1075` | Game loop effect starts: creates `GameLoopController`, calls `stepGame(dt)` at 60fps |
| 36 | `stepGame()` lines 903-992 | Each frame: |
| | | 1. Reads `pendingLifecycleEventsRef` → maps to `lifecycleEvents` array |
| | | 2. Builds `UpdateContext` with `frame.inputEvents = lifecycleEvents` |
| | | 3. Calls `runner.update(updateContext)` |

### The Critical Event Processing Chain

```
stepGame() line 951:
  const lifecycleEvents = pendingLifecycleEventsRef.current.map(type => ({ type }));
  pendingLifecycleEventsRef.current = [];

stepGame() line 957-966:
  const updateContext: UpdateContext = {
    dt,
    elapsed: elapsedRef.current,
    frameId: frameIdRef.current,
    input: inputRef.current,
    gameState: fullGameState,
    frame: {
      inputEvents: lifecycleEvents,  // ← lifecycle events go here!
      collisions: frameCollisions,
    },
  };

runner.update(updateContext):
  → InputRuntimeSystem.update() [PRE_UPDATE phase]
    → Reads ctx.input.tap, pushes TapInputEvent into ctx.frame.inputEvents
  → RulesSystem.update() [GAME_LOGIC phase]
    → convertFrameInputEvents(ctx.frame.inputEvents)
    → Maps { type: 'game_loaded' } → { gameLoaded: true }
    → LogicTriggerEvaluator evaluates: trigger.type === 'game_loaded' → returns true
    → Rule actions execute (spawn_entity, set_variable, etc.)
```

---

## Phase 10: Loading Screen Dismissal

| Step | File | What Happens |
|------|------|-------------|
| 37 | `play/[id].tsx:148-157` | `handleGodotReady()` — called when GameRuntime reports ready. Fades out loading overlay with `Animated.timing(opacity → 0, 500ms)` |
| 38 | `play/[id].tsx:537-558` | `AssetLoadingScreen` renders with progress from `useGamePreloader`. Shows game title, progress bar, instructions, skip button |

---

## Where Default/Static Entities Get Created

### Godot side (visual/physics nodes):
**`GameBridge.gd:252-254`:**
```gdscript
for entity_data in game_data.get("entities", []):
    var record = _entity_factory.create_entity(entity_data)
    if record: entity_registry[record.entity_id] = record
```
Every entity in `definition.entities[]` gets a Godot node — backgrounds, walls, static decorations, everything.

### TypeScript side (logical entities with behaviors):
**`GameLoader.ts:38-40`:**
```typescript
for (const entity of definition.entities) {
    entityManager.createEntity(entity);
}
```
Creates `RuntimeEntity` objects that hold behaviors, tags, and are tracked by the rules system.

### Background specifically:
**`GameBridge.gd:248`:**
```gdscript
_visual_renderer.setup_background(game_data.get("background", {}))
```
The background is handled separately from entities — it's a dedicated call on the VisualRenderer, not an entity.

### Script-driven entities (dynamic):
Created at runtime via `game_loaded` rules. A typical pattern:
```json
{
  "trigger": { "type": "game_loaded" },
  "actions": [
    { "type": "spawn_entity", "template": "ball", "x": 0, "y": 5 }
  ]
}
```
The rule fires on the first game frame when the `game_loaded` lifecycle event is processed.

---

## The Timing Bug: Why game_loaded Might Not Work

The `game_loaded` lifecycle event flows through this pipeline:

1. **Queued at line 843:** `pendingLifecycleEventsRef.current.push('game_loaded')`
2. **Consumed in `stepGame()` at line 951-955:** reads and clears the ref
3. **Processed by** RulesSystem → LogicTriggerEvaluator

### Critical timing issue:

The `game_loaded` event is pushed at setup time (line 843), but `stepGame()` only runs when `gameState.state === "playing"` (line 921). At setup time, state is `"ready"`, not `"playing"`. The game loop also requires `isReady === true AND state === "playing"` (line 1043).

**The sequence is:**
1. Setup completes → pushes `game_loaded` → state is `"ready"` → game loop NOT running
2. User clicks "Play" → state becomes `"playing"` → pushes `game_started` → game loop starts
3. First `stepGame()` frame reads `pendingLifecycleEventsRef` → should find BOTH `game_loaded` AND `game_started`

**Potential problems:**
- If `pendingLifecycleEventsRef` gets consumed or cleared between step 1 and step 3, the `game_loaded` event is lost
- In `test-games/[id].tsx` the loading overlay is disabled, and `canMountGame` bypasses the preload phase — which means the game may mount and start the loop before the lifecycle event queue is properly set up
- In **debug mode** (line 645-651), state is set directly to `"playing"` and skips the "ready" overlay — so `game_loaded` rules may fire immediately. But in **normal mode**, there's a gap where the event sits in the ref while nothing is consuming it.

---

## Dual Event Systems Summary

| Concern | TypeScript Side | Godot Side |
|---------|----------------|------------|
| **Lifecycle events** | `pendingLifecycleEventsRef` (React ref) | None — Godot doesn't track these |
| **Input events** | `inputRef.current` (continuous state) + `frame.inputEvents[]` (discrete) | `InputRouter.gd` captures mouse → calls `_queue_event()` + `emit_input_event()` |
| **Collisions** | `collisionsRef.current[]` populated by bridge callbacks | `CollisionSystem.gd` → `EventEmitter.gd` → JS callback |
| **Entity lifecycle** | `EntityManager` creates `RuntimeEntity` | `EntityFactory.gd` creates Godot nodes |
| **Game state** | `GameState` in `gameRef.current.gameState` | `Engine.time_scale` for physics pause |

---

## Key File Reference

| File | Role |
|------|------|
| `app/lib/game-engine/GameRuntime.godot.tsx` | Main runtime orchestrator (~2000 lines) |
| `app/lib/game-engine/GameLoopController.ts` | setInterval-based game loop with pause/timeScale |
| `app/lib/game-engine/GameLoader.ts` | Creates TS-side entities, joints, gameState |
| `app/lib/game-engine/systems/runner/types.ts` | `UpdateContext`, `InputEvent`, `FrameData` types |
| `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts` | Rule evaluation + `convertFrameInputEvents()` |
| `app/lib/game-engine/rules/triggers/LogicTriggerEvaluator.ts` | Evaluates `game_loaded`, `game_started`, `timer`, etc. |
| `app/lib/game-engine/rules/triggers/InputTriggerEvaluator.ts` | Evaluates `tap`, `drag`, `button`, `swipe`, `tilt` |
| `app/lib/game-engine/debug/SlopcadeDebugBridge.ts` | Debug bridge for MCP game inspector |
| `app/lib/game-engine/debug/types.ts` | `TimeControl`, `TimeMode`, `StepResult` types |
| `app/lib/godot/GodotBridge.web.ts` | Web iframe bridge to Godot WASM |
| `godot_project/scripts/GameBridge.gd` | Godot autoload singleton, JS bridge |
| `godot_project/scripts/bridge/EventEmitter.gd` | Godot→JS callback system |
| `godot_project/scripts/input/InputRouter.gd` | Godot mouse/touch → game events |
| `godot_project/scripts/entity/EntityFactory.gd` | Creates Godot physics/visual nodes |
| `packages/game-inspector-mcp/src/tools/interaction.ts` | MCP `simulate_input` tool |
