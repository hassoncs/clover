# Investigation: BallSort Script Spawn WASM Crash

## The Problem

When BallSort's `generateLevel` script fires on `game_loaded`, it calls `ctx.spawnEntity()` which crashes with:

```
RuntimeError: memory access out of bounds
```

The trigger fires correctly. The script starts executing. It crashes when trying to spawn entities into Godot.

---

## What Was Already Done (This Session)

### Completed Successfully
1. **Trigger type standardization** — All lifecycle triggers converted from camelCase (`gameStart`, `gameLoaded`) to snake_case (`game_started`, `game_loaded`) across:
   - `shared/src/types/rules.ts`
   - `app/lib/game-engine/rules/triggers/LogicTriggerEvaluator.ts`
   - `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts`
   - `games/compiled/ballSort/game.ts`
   - `packages/game-bundler/src/__tests__/virtual-bundle-integration.test.ts`

2. **Games pipeline simplified** — Removed games sidecar server (port 3847):
   - Deleted `games/scripts/serve.ts`
   - Simplified `api/src/dev/templateLoader.ts` (no more sidecar fetch, just static games)
   - Removed `games-server` from `devmux.config.json`, updated `api.dependsOn`
   - Removed `"serve"` script from `games/package.json`
   - Removed API proxy routes (`/local-games`, `/local-packs`) from `api/src/index.ts`
   - App now uses `EMBEDDED_GAME_JSONS` / `EMBEDDED_MANIFEST` from `@/lib/offline/embedded-games-registry`

3. **URL construction aligned** — `local-asset-server.ts` returns `/slopcade/games` for web

4. **Script spawn updated** — `RunScriptActionExecutor.ts` now calls `context.bridge.spawnEntity()` instead of creating JS-only entities

5. **Embedded games rebuilt** — Ran `pnpm --filter @slopcade/games build` and `EXPO_PUBLIC_EMBED_GAMES=true npx tsx app/scripts/embed-games.ts` to regenerate embedded JSONs with correct `game_loaded` trigger type

### Current State of RunScriptActionExecutor
The child agent added a "deferred spawn queue" approach but it has issues:
- It creates a JS-only entity during script execution (lines 97-103)
- It defers the bridge spawn to after script completes (lines 37-41)
- BUT `bridge.spawnEntity()` generates its OWN entity ID → the JS entity and Godot entity have DIFFERENT IDs
- This means tags applied to the JS entity won't match the Godot entity

### Verification Status
- `pnpm tsc --noEmit` ✅ passes
- No remaining camelCase triggers ✅
- No remaining `localhost:3847` references ✅
- BallSort `game_loaded` trigger fires ✅
- Script starts executing ✅
- **CRASH on bridge.spawnEntity()** ❌

---

## The Architecture Question (Owner's Guidance)

The owner described the intended architecture as:

> "On both the JavaScript side and the Godot side, everything should have a frame step before anything gets processed. Godot does its step and then TypeScript does its full step after. And the TypeScript step can write to Godot synchronously. And then Godot plays, publishes events. The events are the asynchronous part back to TypeScript. And then the TypeScript frame runs again, can edit Godot world synchronously."

In other words:
```
Frame N:
  1. Godot physics step (WASM) → produces collisions, positions
  2. JS reads state from Godot (sync)
  3. JS evaluates rules, runs scripts
  4. JS writes to Godot synchronously (spawn, destroy, set velocity, etc.)
  5. → next frame
```

The owner believes JS should be able to call `bridge.spawnEntity()` synchronously during step 4 without any re-entrancy issue, because Godot's step is already complete at that point.

The owner also clarified:
> "There is no concept of the entity existing on the JavaScript side. It should really just only ever be querying and creating them inside the Godot world."

This means:
- Don't create JS-only entities as a workaround
- Entities should only exist in Godot
- JS queries Godot for entity state
- The script's `spawnEntity` should spawn directly in Godot

---

## Key Files to Investigate

### Game Loop (frame step sequence)
- **`app/lib/game-engine/GameRuntime.godot.tsx`**
  - `stepGame` callback (~line 903) — the JS-side frame step
  - `stepPhysics` + `stepGame` sequence (~line 1015-1020) — game-inspector step
  - `GameLoopController` usage (~line 1051-1057) — normal game loop
  - `pendingLifecycleEventsRef` (~line 345, 842-844, 951-955) — how game_loaded flows

### Bridge (JS ↔ Godot WASM)
- **`app/lib/godot/GodotBridge.web.ts`**
  - `spawnEntity` (~line 487-496) — generates ID, calls WASM
  - `stepPhysics` (~line 478-484) — uses `queryAsync`
  - `queryAsync` pattern — how async bridge calls work
  - `getGodotBridge()` — the low-level WASM interface
  
- **`app/lib/godot/types.ts`** — bridge interface definition

### Godot Side
- **`godot_project/scripts/GameBridge.gd`**
  - `_setup_js_bridge()` — how spawn/destroy/etc are exposed to JS
  - `spawn_entity` / `spawn_entity_with_id` (~line 266-271)
  - `load_game_json` (~line 242-256) — game loading + `game_loaded.emit()`

### Script Sandbox
- **`app/lib/scripting/`** — the script sandbox implementation
  - How does `IScriptSandbox.callFunction()` work?
  - Does it use WASM? iframe? direct eval?
  - Could sandbox-WASM → bridge → Godot-WASM cause cross-WASM re-entrancy?

### Script Spawn (the crash site)
- **`app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts`**
  - Current deferred spawn implementation
  - The `createRuntimeContext` method that wraps bridge calls for scripts

### BallSort Game
- **`games/compiled/ballSort/game.ts`** (~line 244-250) — `generate_level` rule
- **`games/compiled/ballSort/script.ts`** — the `generateLevel` function that spawns balls

### Entity Sync
- How does JS entity manager learn about Godot entities?
- Check `app/lib/game-engine/systems/runner/` for property sync
- After `bridge.spawnEntity()`, when does the JS side know about the new entity?

---

## Console Log Evidence from Game Inspector

### Successful flow (trigger fires correctly):
```
[GameRuntime] 12. Emitting gameLoaded lifecycle event
[Lifecycle] Pushing game_loaded to pendingLifecycleEventsRef
[Lifecycle] pendingLifecycleEventsRef now has: [game_loaded]
[Lifecycle] stepGame processing lifecycle events: [Object]
[Lifecycle] convertFrameInputEvents called with 1 events: [game_loaded]
[Lifecycle] convertFrameInputEvents: Found game_loaded event
[Lifecycle] RulesSystem received lifecycle events: {gameLoaded: true, gameStarted: undefined}
[Lifecycle] Rule "generate_level" FIRED, executing 1 actions: [run_script]
[Lifecycle] RunScriptActionExecutor.execute called with action: {type: run_script, export: generateLevel}
[Script] [BallSort] Loading level 1 (index 0)
[RunScriptActionExecutor] Script error in 'generateLevel': RuntimeError: memory access out of bounds
```

### Runtime rule inspection (via game-inspector debug_eval):
```json
{
  "rulesCount": 6,
  "ruleIds": ["generate_level", "tap_tube_idle", "tap_tube_holding", ...],
  "ruleTriggers": ["game_loaded", "tap", "tap", ...]
}
```

### Game state after crash:
- 6 tubes exist (from game definition entities)
- 0 balls (script spawn crashed)
- Variables initialized but `tube*_count` all 0

---

## Critical Questions to Answer

1. **Is this actually WASM re-entrancy?** Or is it something else (sandbox WASM, uninitialized memory, etc.)?

2. **What is the exact call stack when the crash happens?** Trace from `stepGame` → `RulesSystem.update` → `RunScriptActionExecutor.execute` → `sandbox.callFunction` → script calls `ctx.spawnEntity` → `bridge.spawnEntity` → WASM call. At which layer does it crash?

3. **Does the script sandbox use WASM?** If so, calling from sandbox-WASM → bridge → Godot-WASM would be cross-WASM re-entrancy even if the game loop architecture is correct.

4. **Does `SpawnActionExecutor` (the declarative spawn, not script spawn) also crash?** It uses the same `context.bridge.spawnEntity()` call. If it works, the issue is specific to the script sandbox path.

5. **Is there already a frame boundary between Godot's step and JS's step?** Per the owner's architecture description, JS should be able to write to Godot synchronously during its step phase.

---

## What Needs to Happen

### Investigation Phase
1. Trace the exact call stack from game loop → crash
2. Determine if the script sandbox introduces WASM re-entrancy
3. Test if a simple declarative spawn action (not via script) also crashes on `game_loaded`

### Fix Phase (based on findings)
- If it's sandbox WASM re-entrancy: defer bridge calls to after sandbox returns, then call bridge synchronously
- If it's a frame ordering issue: ensure Godot step completes before JS evaluates rules
- If it's something else entirely: fix the root cause

### Principles (from owner)
- Entities live in Godot only — no JS-only entities
- JS can write to Godot synchronously during its step phase
- The async boundary is Godot events → JS, not JS → Godot
- Don't overcomplicate the architecture

---

## Files Modified (Uncommitted)

```
 M api/scripts/test-dual-mode.sh
 M api/src/dev/templateLoader.ts
 M api/src/index.ts
 M app/app/test-games/[id].tsx
 M app/hooks/useBrowseGames.ts
 M app/lib/game-engine/hooks/useAssetResolution.ts
 M app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts
 M app/lib/game-engine/rules/triggers/LogicTriggerEvaluator.ts
 M app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts
 M app/lib/offline/local-asset-server.ts
 M devmux.config.json
 M games/compiled/ballSort/game.ts
 M games/package.json
 D games/scripts/serve.ts
 M packages/game-bundler/src/__tests__/virtual-bundle-integration.test.ts
 M shared/src/types/rules.ts
 ? app/lib/game-engine/__tests__/game-loaded-event.integration.test.ts
 ? app/lib/game-engine/__tests__/trigger-type-casing.test.ts
 ? app/scripts/create-dev-symlinks.ts
```

`pnpm tsc --noEmit` passes. The only remaining issue is the runtime spawn crash.
