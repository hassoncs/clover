# Godot Bridge Initialization Contract

This document defines the single readiness contract between the Godot engine and the JavaScript host (React Native / Web).

## The Readiness Invariant

**JavaScript may call bridge methods ONLY after `window.GodotBridge` is exposed.**

The presence of the `window.GodotBridge` object is the single, authoritative signal that the Godot engine is fully initialized, all autoloads have completed their setup, and all bridge modules have registered their handlers.

## Initialization Flow

1. **Autoload Loading**: Godot loads autoloads in the order defined in `project.godot`.
   - `GameBridge` must be listed first.
   - `GameBridgeEffects` and other modules follow.
2. **`GameBridge._ready()`**:
   - Initializes core systems.
   - Calls `call_deferred("_finalize_js_bridge")`. This schedules the final exposure for the end of the current frame.
3. **Other Modules `_ready()`**:
   - Modules like `GameBridgeEffects` run their `_ready()` calls.
   - They register their methods and query handlers with `GameBridge`.
4. **Deferred Finalization**:
   - At the end of the frame, `GameBridge._finalize_js_bridge()` is called.
   - It executes `_setup_js_bridge()`, which finally attaches the bridge object to `window`.

## Autoload Ordering Requirements

The order in `project.godot` is critical:
1. `GameBridge`: Must be first so it exists when other modules try to register with it.
2. `GameBridgeEffects`: Registers effects-related handlers.
3. (Future Modules): Must register their handlers in `_ready()`.

## Prohibited Patterns

To maintain a clean and predictable initialization, the following patterns are prohibited:

- **Module-specific readiness flags**: Do not create `window.GodotBridgeEffectsReady` or similar.
- **Polling loops**: JavaScript should not poll for specific sub-objects of the bridge.
- **Early exposure**: Never expose `window.GodotBridge` before the deferred call in `GameBridge`.
- **Manual JS-to-Godot pings**: Do not require JS to "ping" Godot to start the bridge.

## Why `call_deferred`?

Using `call_deferred` ensures that even if there are many autoloads or complex scene tree setups, the bridge is only exposed after every node's `_ready()` function in the initial tree has been executed. This guarantees that all registration logic has completed.
