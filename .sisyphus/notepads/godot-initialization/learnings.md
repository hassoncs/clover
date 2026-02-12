
## GameBridge Initialization Patterns
- **Ready Sequence**: `_init_modules` -> `_camera_controller.setup_camera` -> `_build_method_map` -> `_setup_js_bridge`.
- **JS Bridge Exposure**: `window.GodotBridge` is set synchronously in `_ready`.
- **Method Discovery**: Uses `_auto_register_bridge_methods` to scan modules for `_js_` prefixed methods, then applies manual overrides in `_build_method_map`.
- **Deferred Execution**: `GameBridge.gd` does not use `call_deferred` for its own initialization, but `CollisionSystem` uses it to call `destroy_entity` safely.
