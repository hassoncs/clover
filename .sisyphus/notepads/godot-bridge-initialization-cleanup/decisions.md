
## 2026-02-11: Single Readiness Contract Codified

We have codified the "Single Readiness Contract" for the Godot-to-JS bridge.

### Key Decisions:
1. **Single Signal**: `window.GodotBridge` is the ONLY signal JS should use to determine if the engine is ready.
2. **Deferred Exposure**: `GameBridge` uses `call_deferred` in its `_ready()` function to expose the bridge. This ensures all other autoloads have finished their setup.
3. **Registration Timing**: All bridge modules (e.g., `GameBridgeEffects`) MUST register their handlers in their `_ready()` call.
4. **Autoload Order**: `GameBridge` must be listed before other bridge modules in `project.godot` to ensure it exists when they try to register.
5. **No Extra Flags**: Prohibited the use of module-specific readiness flags or polling loops in JS.

### Documentation:
- Detailed contract: `docs/godot-migration/bridge-initialization.md`
- Inline comments added to `GameBridge.gd` and `GameBridgeEffects.gd`.
