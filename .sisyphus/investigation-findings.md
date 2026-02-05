# Investigation Findings: BallSort Script Spawn Crash

**Date:** 2026-02-04
**Status:** Investigation complete, fix not yet implemented

---

## The Symptom

BallSort's `generateLevel` script fires on `game_loaded`, calls `ctx.spawnEntity()` for each ball, and crashes with:

```
RuntimeError: memory access out of bounds
```

Tubes (from the game definition's static entities) render fine. Balls (spawned dynamically by script) do not appear.

---

## What I Found

### 1. The Sandbox Is NOT WASM

`USE_SAFE_SANDBOX = false` in `app/lib/scripting/createScriptSandbox.ts:14`.

The active sandbox is `UnsafeScriptSandbox` — plain `new Function()` eval. QuickJS WASM exists in the codebase but is not enabled. **The crash is not cross-WASM re-entrancy between two WASM modules.** The only WASM in play is Godot's.

### 2. The Deferred Spawn Approach Was Added But May Not Have Been Tested

`RunScriptActionExecutor.ts` currently:
1. Creates a `deferredSpawns[]` array
2. During script execution, `ctx.spawnEntity()` pushes to the array AND creates a JS-only entity via `entityManager.createEntity()`
3. After the script returns, flushes deferred spawns by calling `context.bridge.spawnEntity()`

The crash evidence in the handoff doc may be **from before this deferred fix was applied**. With the deferred approach, the script itself shouldn't touch Godot WASM. The WASM call happens after the script returns, during the flush.

### 3. The Bridge spawnEntity Is Synchronous

```
JS bridge.spawnEntity()
  → getGodotBridge()?.spawnEntity(templateId, x, y, entityId, velocityJson)
  → Window.GodotBridge.spawnEntity (JavaScriptBridge callback)
  → EntityManager._js_spawn_entity (GDScript)
  → EntityManager.spawn_entity (GDScript)
  → EntityFactory.create_entity (GDScript)
```

Every layer is synchronous. No async, no promises. Direct WASM call through Godot's JavaScriptBridge.

### 4. The Game Loop Architecture

- Physics runs **continuously** in Godot (resumed once at game start)
- `stepGame` is called by `GameLoopController.tick()` which uses `requestAnimationFrame`
- `stepGame` is NOT called from inside a Godot WASM callback
- Therefore, calling `bridge.spawnEntity()` during `stepGame` should be safe — no re-entrancy

**But:** In inspect mode, the game loop is stopped entirely. `stepGame` never runs. Lifecycle events sit in the queue forever.

### 5. Lifecycle Events Are Stuck in Inspect Mode

```
[GameLoop Effect] isReady=true, state=playing, mode=inspect, paused=true
[GameLoop Effect] Inspect mode - stopping
```

The game loop effect (line 1035) checks `timeControl.mode === "inspect"` and immediately stops. Lifecycle events in `pendingLifecycleEventsRef` never get processed.

When the game-inspector steps the game, it calls `manualStep` which calls `bridge.stepPhysics()` then `stepGame()`. The first `stepGame` processes the queued `game_loaded` event, fires the `generateLevel` rule, which calls the deferred spawn flush, which calls `bridge.spawnEntity()` into Godot WASM. **This is where the crash happens** — but at this point we're inside the `manualStep` call chain which started from a `bridge.stepPhysics()` await resolution. That resolution happens inside a Godot WASM callback context. So calling `bridge.spawnEntity()` from there IS re-entrancy.

### 6. The Actual Crash Path (My Best Hypothesis)

```
manualStep() called by game-inspector
  → await bridge.stepPhysics(frames)           ← enters Godot WASM
  → Godot processes physics, responds via JS callback
  → Promise resolves (we're still in WASM callback context!)
  → stepGame(FIXED_DT)
    → processes game_loaded lifecycle event
    → RulesSystem evaluates generate_level rule
    → RunScriptActionExecutor.execute()
      → sandbox.callFunction() runs generateLevel script
      → script calls ctx.spawnEntity() — pushes to deferredSpawns
      → script returns
      → flush deferredSpawns: context.bridge.spawnEntity()    ← RE-ENTERS Godot WASM
      → CRASH: memory access out of bounds
```

The `await` in `manualStep` resolves inside a Godot WASM callback. The subsequent `stepGame` + deferred flush tries to call back into Godot WASM synchronously. This is WASM re-entrancy.

**Without inspect mode** (normal game loop), `stepGame` would run from `requestAnimationFrame`, completely outside any WASM context. The deferred flush would work fine.

### 7. The ID Mismatch Problem

Even if the crash is fixed, the deferred spawn approach has a design flaw:
- Script generates ID: `spawned_1234_abc`
- Script calls `ctx.addTag(spawned_1234_abc, 'color-0')` — adds to JS-only entity
- Bridge generates different ID: `ball0_1234_xyz`
- Godot entity has wrong ID, no tags

### 8. The Architecture Violation

The owner stated:
> "There is no concept of the entity existing on the JavaScript side. It should really just only ever be querying and creating them inside the Godot world."

Current code violates this: `entityManager.createEntity()` creates JS-only entities during script execution. These should not exist.

---

## Architectural Issues Found

### A. Lifecycle Events vs Input Events — Artificial Separation

The type system already unifies them. `GameLoadedInputEvent` and `GameStartedInputEvent` are part of the `InputEvent` union. They go into `frame.inputEvents` alongside taps, drags, etc.

But at the runtime level, they're stored in a separate `pendingLifecycleEventsRef` and only merged into `frame.inputEvents` when `stepGame` runs. This creates the inspect mode problem.

**All three push sites:**
- Line 843: `pendingLifecycleEventsRef.current.push('game_loaded')` — after initial setup
- Line 1444: `pendingLifecycleEventsRef.current.push('game_started')` — when player hits start
- Line 1513: `pendingLifecycleEventsRef.current.push('game_loaded')` — on restart

### B. stepGame Guards Block Lifecycle Processing

`stepGame` has multiple guards:
1. Refs must be set (physics, game, camera, bridge)
2. Game state must be `"playing"`
3. `dt > 0`
4. Runner must exist

These guards make sense for normal frame updates but block lifecycle events that need to run during initialization.

### C. manualStep Causes Re-entrancy

```typescript
const manualStep = async (frames) => {
  await bridge.stepPhysics(frames);  // WASM call
  for (let i = 0; i < frames; i++) {
    stepGame(FIXED_DT);              // may call bridge.spawnEntity → RE-ENTRANCY
  }
};
```

The `await` resolves in a WASM callback context. Anything after it that touches WASM is re-entrant.

### D. Entity Ownership Is Confused

The codebase has TWO entity systems:
- **Godot EntityManager** (GDScript) — the real entities with physics, rendering
- **JS EntityManager** (TypeScript) — a mirror/shadow that tracks entities for rules/scripts

The `RunScriptActionExecutor` creates entities in the JS EntityManager directly (bypassing Godot), creating ghost entities that don't render.

---

## Key Files

| File | What It Does | Lines of Interest |
|------|-------------|-------------------|
| `app/lib/scripting/createScriptSandbox.ts` | `USE_SAFE_SANDBOX = false` → eval sandbox | Line 14 |
| `app/lib/scripting/UnsafeScriptSandbox.ts` | Eval-based script execution | `callFunction()` at line 191 |
| `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts` | Script spawn handling, deferred queue | Lines 32-41 (flush), 82-105 (queue) |
| `app/lib/game-engine/GameRuntime.godot.tsx` | Game loop, lifecycle events, stepGame | Lines 843, 903-992, 1035-1039, 1444 |
| `app/lib/godot/GodotBridge.web.ts` | Bridge to Godot WASM | `spawnEntity()` at line 487 |
| `godot_project/scripts/GameBridge.gd` | Godot-side bridge setup | `_setup_js_bridge()` at line 161 |
| `godot_project/scripts/entity/EntityManager.gd` | Godot entity creation | `spawn_entity()` at line 75 |
| `app/lib/game-engine/systems/runner/types.ts` | Unified event types | `InputEvent` union at line 89 |
| `games/compiled/ballSort/script.ts` | The failing script | `generateLevel` at line 5 |

---

## What's NOT Broken

- Trigger standardization (snake_case) ✅
- Games pipeline simplification ✅
- Game loading flow (queryAsync for loadGame) ✅
- Template availability before spawn ✅
- `game_loaded` trigger fires correctly ✅
- TypeScript compiles clean ✅
- The type system for events is already well-designed ✅

---

## Open Questions

1. **Does the deferred spawn flush actually crash in normal (non-inspect) mode?** The game-inspector forces inspect mode. In normal play mode, `stepGame` runs from `requestAnimationFrame`, outside any WASM context. The flush might work fine there.

2. **Is `manualStep`'s `await bridge.stepPhysics()` truly re-entrant?** The `queryAsync` pattern sends a message to Godot and waits for a response. When the response arrives, it may resolve the Promise from within a Godot `_process` callback (WASM context) or from a JavaScript event loop turn. Need to verify which.

3. **Should lifecycle events even go through the game loop at all?** They're initialization events. Maybe they should bypass the frame-step model entirely and call rules directly.
