# GameBridge.gd Refactoring Learnings

## Session 1: Aggressive Function Deletion (2026-02-01)

### Progress
- **Starting line count**: 2972 lines
- **Current line count**: 2549 lines
- **Lines deleted**: 423 lines
- **Target**: Under 1500 lines
- **Remaining**: ~1050 lines to delete

### Functions Deleted

#### 1. 3D Viewport Wrappers (~110 lines)
- `show_3d_model()`, `show_3d_model_from_url()`, `set_3d_viewport_position()`, `set_3d_viewport_size()`
- `rotate_3d_model()`, `set_3d_camera_distance()`, `clear_3d_models()`
- All `_js_show_3d_*`, `_js_set_3d_*`, `_js_rotate_3d_*`, `_js_clear_3d_*` wrappers
- **Replacement**: Inline lambdas in `_setup_js_bridge()` calling `_viewport_3d` methods directly

#### 2. Debug/Screenshot Functions (~190 lines)
- `capture_screenshot()`, `_draw_debug_overlays()`, `_get_overlay_draw_script()`
- `_collect_overlay_data()`, `_clear_debug_overlays()`
- **Replacement**: DebugBridge via QuerySystem

#### 3. Visual Renderer Wrappers (~40 lines)
- `set_entity_image()`, `set_entity_atlas_region()`, `set_entity_image_base64()`, `set_entity_image_from_file()`
- `set_opacity()`, `clear_texture_cache()`, `_js_set_debug_show_shapes()`
- **Replacement**: Direct calls to `_visual_renderer` methods

#### 4. Camera/UI/Particle/Audio Wrappers (~80 lines)
- Camera: `set_camera_target()`, `set_camera_position()`, `set_camera_zoom()`
- UI: `create_ui_button()`, `destroy_ui_button()`
- Effects: `spawn_particle()`, `play_sound()`
- **Replacement**: Direct calls to `_camera_controller` and `_ui_manager`

#### 5. Physics/Transform Wrappers (~30 lines)
- Physics: `set_linear_velocity()`, `set_angular_velocity()`, `apply_impulse()`, `apply_force()`, `apply_torque()`
- Transform: `set_transform()`, `set_position()`, `set_rotation()`
- **Replacement**: Direct calls to `_physics_controller` and `_transform_system`

#### 6. Joint Wrappers (~10 lines)
- `set_mouse_target()`, `destroy_joint()`, `set_motor_speed()`
- **Replacement**: Direct calls to `_joint_manager`

#### 7. Info Getter Wrappers (~15 lines)
- `_js_get_world_info()`, `_js_get_camera_info()`, `_js_get_viewport_info()`
- **Replacement**: QuerySystem handles these via `_register_core_query_handlers()`

### Pattern Applied

**BEFORE** (3 layers):
```gdscript
# JS Bridge Setup
var cb = JavaScriptBridge.create_callback(_js_wrapper)
_js_bridge_obj["method"] = cb

# Wrapper function
func _js_wrapper(args: Array) -> void:
    module.method(args)
```

**AFTER** (1 layer):
```gdscript
# JS Bridge Setup with inline lambda
var cb = JavaScriptBridge.create_callback(func(args): module.method(args))
_js_bridge_obj["method"] = cb
```

**Benefits**:
- Eliminates 2 layers of indirection per function
- Reduces line count by ~3-5 lines per wrapper
- Makes delegation explicit and obvious
- No backward compatibility concerns (forward-only refactor)

### Next Steps for Session 2

To reach under 1500 lines (~1050 more lines to delete):

#### High-Value Deletions

1. **Physics Query Functions** (~200 lines):
   - `_js_query_point()`, `_js_query_point_entity()`, `query_point_entity()`, `query_point_entity_async()`
   - `_js_query_aabb()`, `_js_raycast()`, `query_point()`, `raycast()`
   - **Action**: Delegate to `_physics_queries` module (already has these methods)

2. **UI Management Functions** (~300 lines):
   - `_create_placeholder_texture()` - move to UIManager
   - `create_themed_ui_component()`, `destroy_themed_ui_component()`
   - `_on_ui_button_*()` event handlers
   - `_get_or_create_ui_layer()`
   - **Action**: Move to UIManager module

3. **Sensor System Wrappers** (~100 lines):
   - `_js_on_sensor_begin()`, `_js_on_sensor_end()`
   - `_notify_sensor_begin()`, `_notify_sensor_end()`
   - `_on_sensor_body_shape_entered()`, `_on_sensor_body_shape_exited()`
   - **Action**: Delegate to EventEmitter

4. **Body Management** (~200 lines):
   - `create_body()` - move to EntityFactory
   - `set_user_data()` - move to EntityManager
   - `_js_set_user_data()`, `_js_get_user_data()`, `_js_get_all_bodies()`
   - **Action**: Move to EntityFactory/EntityManager

5. **WebSocket Functions** (~50 lines):
   - `connect_to_server()`, `_on_ws_message()`
   - **Action**: Delete (rarely used, can be re-added if needed)

6. **Splat Map System** (~100 lines):
   - `_setup_splat_map()`, `enable_splat_map()`, `disable_splat_map()`, `get_splat_texture()`
   - Large block in `_process()`
   - **Action**: Move to separate SplatMapSystem module or delete if unused

7. **Event Queue Wrappers** (~50 lines):
   - `_queue_event()`, `poll_events()`
   - **Action**: Delegate to EventQueue module

8. **Collision Handling** (~100 lines):
   - `_handle_collision_manifold()` - complex logic
   - `_process_collision_behaviors()`
   - **Action**: Move to CollisionSystem and BehaviorExecutor

### Verification Checklist

- [x] Godot project parses without errors
- [ ] TypeScript compiles clean (need to verify JS bridge changes)
- [ ] All module methods accessible via inline lambdas
- [ ] No runtime errors in test games
- [ ] Game Inspector MCP still works

### Key Insights

1. **Inline lambdas are powerful**: They eliminate wrapper functions while maintaining type safety and readability
2. **Module delegation is the goal**: GameBridge should be a thin coordinator, not an implementation
3. **Forward-only refactoring**: No backward compatibility wrappers - clean break
4. **QuerySystem is underutilized**: Many JS callbacks can be replaced with query() calls
5. **Large functions are opportunities**: Functions over 50 lines are candidates for module extraction

