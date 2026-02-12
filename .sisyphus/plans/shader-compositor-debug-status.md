# Shader Compositor Debug Status

## Current State (2026-02-11 22:45 PST)

### What Works
- TS compiler pre-rewrites SCREEN_TEXTURE→input for screen scope ✅ (93 tests pass)
- GDScript dual rewrite deleted ✅
- `call_deferred` bridge initialization ✅ (no more race condition)
- Snake game renders correctly ✅
- Inline preview definitions render entities correctly ✅ (colored rects/circles visible)

### What Doesn't Work
- **Screen-scope effects don't visibly apply.** When a definition includes `effects.graph` with `scope: "screen"`, the game renders as if effects don't exist. No scanlines, no wavy distortion, nothing.

### The Specific Test Case
Preview URL with inline definition containing:
- 4 colored entities (rects + circle)
- 1 scanlines screen effect (100 lines, 0.5 opacity)

**Without effects**: Entities render correctly on dark blue background
**With effects**: Entities render identically — no visible effect overlay

### What Needs Investigation
1. **Is `applyEffects` being called?** We couldn't capture console logs because the call happens during React component mount, before we can inject console interceptors.

2. **Is the `effects.applyGraph` query reaching Godot?** The QuerySystem handler is registered (line 138 in GameBridgeEffects.gd). The `call_deferred` pattern ensures `window.GodotBridge` isn't exposed until after registration. But we haven't confirmed the query actually dispatches and returns success.

3. **Is the SubViewport capture working?** `_setup_game_capture_viewport()` reparents GameRoot into a SubViewport dynamically when screen effects are applied. This was the fix for the viewport feedback loop. But we haven't verified the SubViewport is sized correctly or that its texture is being read.

4. **Is the screen overlay being created?** `_create_screen_overlay()` creates a CanvasLayer(z=100) with TextureRect. The `_process` loop updates the texture each frame from the executor's output. We haven't verified this is happening.

### How to Debug Next
The key problem is that we can't see console output from the initial load. Options:

A. **Add a permanent debug log to the Godot side** — print to GDScript console when `effects.applyGraph` handler fires. Rebuild .pck, reload, check iframe console.

B. **Add a window.onerror handler before page load** — use agent-browser to inject it before navigating.

C. **Use the E2E bridge test infrastructure** (tests/e2e/bridge/) which can send queries to a headless Godot and inspect results.

D. **Test with the game editor** instead of the play page — the editor has dev tools that show effect state.

### Files Changed (not yet committed)
- `app/lib/game-engine/GameLoader.ts` — has debug console.logs (should be removed before commit)
- `r2/games/ballSort/definition.json` — has effects restored (from DB version still has old)
- Various `.sisyphus/` files from other agent's cleanup

### Architecture Summary
```
Definition (with effects.graph) 
  → GameLoader.applyEffects() 
  → compileGraph() [TS - pre-rewrites GLSL]
  → bridge.applyGraph(plan) 
  → executeEffects("effects.applyGraph", {plan})
  → queryAsync → bridge.query()
  → Godot QuerySystem.dispatch("effects.applyGraph")
  → GameBridgeEffects.apply_plan()
  → _setup_game_capture_viewport() [reparents GameRoot into SubViewport]
  → _screen_executor.apply_plan(plan)
  → _create_screen_overlay() [CanvasLayer z=100 + TextureRect]
  → _screen_executor.start()
  → _process(): overlay.texture = executor.get_output_texture()
```
