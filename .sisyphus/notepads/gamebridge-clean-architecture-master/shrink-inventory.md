# GameBridge.gd Shrink Inventory

**Current Size**: 3411 lines  
**Target Size**: ~500 lines  
**Lines to Move/Delete**: ~2900 lines

---

## Summary by Domain

| Domain | Lines to Move | Target Module | Priority |
|--------|---------------|---------------|----------|
| Visual/Texture | ~600 lines | VisualRenderer | HIGH |
| 3D/Viewport | ~100 lines | Viewport3D | HIGH |
| Debug/Screenshot | ~200 lines | DebugBridge | HIGH |
| UI Buttons | ~150 lines | UIManager | HIGH |
| Camera | ~50 lines | CameraController | MEDIUM |
| Physics Queries | ~300 lines | PhysicsQueries | MEDIUM |
| Joint System | ~200 lines | JointManager | MEDIUM |
| Background/Parallax | ~150 lines | NEW: BackgroundManager | LOW |
| Splat Map | ~100 lines | NEW: SplatMapSystem | LOW |
| Unused `_js_*` wrappers | ~100 lines | DELETE | HIGH |

---

## 1. Functions to Move to Viewport3D Module

**Location**: `godot_project/scripts/3d/Viewport3D.gd` (106 lines - already exists)

These functions are thin wrappers that should be moved entirely:

| Function | Lines | Notes |
|----------|-------|-------|
| `show_3d_model()` | 3036-3041 | Delegates to `_viewport_3d.load_glb()` |
| `show_3d_model_from_url()` | 3044-3048 | Delegates to `_viewport_3d.load_glb_async()` |
| `set_3d_viewport_position()` | 3051-3053 | Simple delegation |
| `set_3d_viewport_size()` | 3056-3058 | Simple delegation |
| `rotate_3d_model()` | 3061-3063 | Simple delegation |
| `set_3d_camera_distance()` | 3066-3068 | Simple delegation |
| `clear_3d_models()` | 3071-3073 | Simple delegation |
| `_js_show_3d_model()` | 3076-3079 | JS wrapper |
| `_js_show_3d_model_from_url()` | 3082-3085 | JS wrapper |
| `_js_set_3d_viewport_position()` | 3088-3091 | JS wrapper |
| `_js_set_3d_viewport_size()` | 3094-3097 | JS wrapper |
| `_js_rotate_3d_model()` | 3100-3103 | JS wrapper |
| `_js_set_3d_camera_distance()` | 3106-3109 | JS wrapper |
| `_js_clear_3d_models()` | 3112-3113 | JS wrapper |
| `load_glb()` | 3011-3015 | Delegates to `_glb_loader` |
| `load_glb_from_buffer()` | 3018-3024 | Delegates to `_glb_loader` |
| `load_glb_async()` | 3027-3033 | Delegates to `_glb_loader` |

**Estimated Savings**: ~100 lines

---

## 2. Functions to Move to UIManager Module

**Location**: `godot_project/scripts/bridge/UIManager.gd` (278 lines - already exists)

| Function | Lines | Notes |
|----------|-------|-------|
| `_js_create_ui_button()` | 2867-2868 | Already delegates to `_ui_manager` |
| `_js_destroy_ui_button()` | 2871-2872 | Already delegates to `_ui_manager` |
| `create_ui_button()` | 2875-2884 | Already delegates to `_ui_manager` |
| `destroy_ui_button()` | 2887-2888 | Already delegates to `_ui_manager` |
| `create_themed_ui_component()` | 2891-2910 | Should move to UIManager |
| `destroy_themed_ui_component()` | 2913-2916 | Should move to UIManager |
| `_js_on_ui_button_event()` | 2919-2921 | Event callback setup |
| `_on_ui_button_down()` | 2924-2925 | Event handler |
| `_on_ui_button_up()` | 2928-2929 | Event handler |
| `_on_ui_button_pressed()` | 2932-2933 | Event handler |
| `_notify_ui_button_event()` | 2936-2937 | Event emitter |
| `_get_or_create_ui_layer()` | 2940-2948 | Duplicated in UIManager! |
| `_create_placeholder_texture()` | 2952-2975 | Duplicated in UIManager! |
| `_js_spawn_particle()` | 2841-2842 | Already delegates to `_ui_manager` |
| `spawn_particle()` | 2845-2846 | Already delegates to `_ui_manager` |
| `_js_play_sound()` | 2854-2855 | Already delegates to `_ui_manager` |
| `play_sound()` | 2858-2859 | Already delegates to `_ui_manager` |

**Estimated Savings**: ~150 lines (including duplicated code)

---

## 3. Functions to Move to DebugBridge Module

**Location**: `godot_project/scripts/bridge/debug/DebugBridge.gd` (560 lines - already exists)

| Function | Lines | Notes |
|----------|-------|-------|
| `_js_capture_screenshot()` | 3145-3158 | Screenshot capture |
| `capture_screenshot()` | 3161-3184 | Core screenshot logic |
| `_draw_debug_overlays()` | 3187-3212 | Debug overlay drawing |
| `_get_overlay_draw_script()` | 3215-3278 | Dynamic script generation |
| `_collect_overlay_data()` | 3281-3315 | Overlay data collection |
| `_clear_debug_overlays()` | 3318-3323 | Overlay cleanup |
| `_js_set_debug_show_shapes()` | 1923-1936 | Debug mode toggle |
| `_js_set_debug_settings()` | 1939-1963 | Debug settings |

**Estimated Savings**: ~200 lines

---

## 4. Functions to Move to VisualRenderer Module

**Location**: `godot_project/scripts/bridge/VisualRenderer.gd` (809 lines - already exists)

These are DUPLICATED between GameBridge and VisualRenderer:

| Function | Lines | Notes |
|----------|-------|-------|
| `_add_visual()` | 1483-1605 | ~120 lines - DUPLICATED |
| `_add_image_visual()` | 1608-1649 | ~40 lines - DUPLICATED |
| `_add_text_visual()` | 1652-1669 | ~20 lines - DUPLICATED |
| `_queue_texture_download()` | 1672-1679 | ~10 lines - DUPLICATED |
| `_queue_font_download()` | 1685-1724 | ~40 lines - DUPLICATED |
| `_apply_sprite_scale()` | 1727-1775 | ~50 lines - DUPLICATED |
| `_hide_shape_children()` | 1778-1783 | ~5 lines - DUPLICATED |
| `_apply_debug_visibility()` | 1786-1794 | ~10 lines - DUPLICATED |
| `_create_polygon_texture()` | 1440-1452 | ~15 lines - DUPLICATED |
| `_download_image_texture()` | 1188-1224 | ~40 lines - DUPLICATED |
| `_download_background_texture()` | 1227-1240 | ~15 lines |
| `_apply_background_texture()` | 1243-1254 | ~15 lines |
| `_on_preload_complete()` | 1906-1920 | ~15 lines - DUPLICATED |
| `_js_preload_textures()` | 1808-1903 | ~100 lines - DUPLICATED |
| `_js_clear_texture_cache()` | 1797-1799 | Already delegates |
| `clear_texture_cache()` | 1966-1967 | Already delegates |
| `_js_set_entity_image()` | 2053-2054 | Already delegates |
| `_js_set_entity_atlas_region()` | 2063-2064 | Already delegates |
| `set_entity_image()` | 2049-2050 | Already delegates |
| `set_entity_atlas_region()` | 2057-2060 | Already delegates |
| `set_entity_image_base64()` | 2067-2070 | Already delegates |
| `set_entity_image_from_file()` | 2073-2076 | Already delegates |
| `_find_sprite_in_entity()` | 2164-2172 | ~10 lines - DUPLICATED |

**Estimated Savings**: ~600 lines (mostly duplicated code)

---

## 5. Functions to Move to CameraController Module

**Location**: `godot_project/scripts/bridge/CameraController.gd` (118 lines - already exists)

| Function | Lines | Notes |
|----------|-------|-------|
| `_js_set_camera_target()` | 2812-2813 | Already delegates |
| `_js_set_camera_position()` | 2816-2817 | Already delegates |
| `_js_set_camera_zoom()` | 2820-2821 | Already delegates |
| `set_camera_target()` | 2824-2825 | Already delegates |
| `set_camera_position()` | 2828-2829 | Already delegates |
| `set_camera_zoom()` | 2832-2833 | Already delegates |
| `_js_get_camera_info()` | 3350-3352 | Info query |
| `get_camera_info()` | 3355-3356 | Already delegates |

**Estimated Savings**: ~50 lines

---

## 6. Functions to Move to PhysicsQueries Module

**Location**: `godot_project/scripts/physics/PhysicsQueries.gd` (exists)

| Function | Lines | Notes |
|----------|-------|-------|
| `_js_query_point()` | 2341-2357 | ~20 lines |
| `_js_query_point_entity()` | 2360-2411 | ~50 lines |
| `query_point_entity()` | 2415-2433 | ~20 lines |
| `query_point_entity_async()` | 2436-2456 | ~20 lines |
| `_js_query_aabb()` | 2484-2514 | ~30 lines |
| `_js_raycast()` | 2517-2546 | ~30 lines |
| `query_point()` | 2549-2580 | ~30 lines |
| `raycast()` | 2583-2614 | ~30 lines |

**Estimated Savings**: ~230 lines

---

## 7. Functions to Move to JointManager Module

**Location**: `godot_project/scripts/physics/JointManager.gd` (exists)

| Function | Lines | Notes |
|----------|-------|-------|
| `_js_create_revolute_joint()` | 2212-2213 | Already delegates |
| `_js_create_distance_joint()` | 2216-2217 | Already delegates |
| `_js_create_prismatic_joint()` | 2220-2221 | Already delegates |
| `_js_create_weld_joint()` | 2224-2225 | Already delegates |
| `create_mouse_joint()` | 2229-2237 | Already delegates |
| `set_mouse_target()` | 2240-2241 | Already delegates |
| `destroy_joint()` | 2244-2245 | Already delegates |
| `_js_create_mouse_joint()` | 2248-2250 | Already delegates |
| `_js_destroy_joint()` | 2253-2254 | Already delegates |
| `_js_set_motor_speed()` | 2257-2258 | Already delegates |
| `set_motor_speed()` | 2261-2262 | Already delegates |
| `create_revolute_joint()` | 2265-2281 | Already delegates |
| `create_distance_joint()` | 2284-2297 | Already delegates |
| `create_prismatic_joint()` | 2300-2318 | Already delegates |
| `create_weld_joint()` | 2321-2329 | Already delegates |
| `_js_set_mouse_target()` | 2332-2333 | Already delegates |
| `create_mouse_joint_async()` | 2459-2481 | ~25 lines |

**Estimated Savings**: ~200 lines

---

## 8. NEW: BackgroundManager Module (to create)

| Function | Lines | Notes |
|----------|-------|-------|
| `_setup_background()` | 1135-1185 | ~50 lines |
| `_setup_parallax_background()` | 1257-1304 | ~50 lines |

**Estimated Savings**: ~100 lines

---

## 9. NEW: SplatMapSystem Module (to create)

| Function | Lines | Notes |
|----------|-------|-------|
| `_setup_splat_map()` | 927-947 | ~20 lines |
| `enable_splat_map()` | 950-952 | ~3 lines |
| `disable_splat_map()` | 955-963 | ~10 lines |
| `get_splat_texture()` | 966-967 | ~2 lines |
| Splat processing in `_process()` | 970-1023 | ~50 lines |

**Estimated Savings**: ~100 lines

---

## 10. Unused `_js_*` Wrapper Functions to DELETE

These are thin wrappers that just delegate to modules. The JS bridge setup can call module methods directly:

| Function | Lines | Reason |
|----------|-------|--------|
| `_js_set_user_data()` | 515-517 | Thin wrapper |
| `_js_get_user_data()` | 519-521 | Thin wrapper |
| `_js_get_all_bodies()` | 523-525 | Returns `entity_registry.keys()` |
| `_js_on_sensor_begin()` | 2622-2624 | Thin wrapper |
| `_js_on_sensor_end()` | 2627-2629 | Thin wrapper |

**Estimated Savings**: ~50 lines

---

## 11. Functions that SHOULD STAY in GameBridge

These are core orchestration functions:

| Function | Lines | Reason |
|----------|-------|--------|
| `_ready()` | 156-159 | Initialization |
| `_init_modules()` | 171-200 | Module setup |
| `_setup_js_bridge()` | 302-628 | JS bridge setup (can be simplified) |
| `_input()` | 237-286 | Input routing |
| `_process()` | 970-1033 | Main loop |
| `_physics_process()` | 2769-2804 | Physics loop |
| `load_game_json()` | 1060-1089 | Game loading |
| `clear_game()` | 2091-2106 | Game cleanup |
| `spawn_entity()` | 1983-1984 | Entity spawning |
| `spawn_entity_with_id()` | 1987-1999 | Entity spawning |
| `destroy_entity()` | 2032-2041 | Entity destruction |
| `get_entity()` | 2045-2046 | Entity lookup |
| `get_record()` | 91-96 | Registry lookup |
| `get_entity_node()` | 99-104 | Node lookup |
| `game_to_godot_pos()` | 55-56 | Coordinate conversion |
| `godot_to_game_pos()` | 59-60 | Coordinate conversion |
| `game_to_godot_vec()` | 63-64 | Coordinate conversion |
| `godot_to_game_vec()` | 67-68 | Coordinate conversion |
| `_setup_world()` | 1114-1133 | World setup |
| `_register_core_query_handlers()` | 203-231 | Query registration |
| `get_all_transforms()` | 2080-2087 | Transform sync |
| `collect_all_properties()` | 3123-3127 | Property collection |
| `set_watch_config()` | 3130-3134 | Watch config |
| `get_world_info()` | 3331-3347 | World info |
| `get_viewport_info()` | 3364-3366 | Viewport info |

**Estimated Core Lines**: ~500 lines

---

## Priority Order for Extraction

1. **HIGH - Delete duplicated code in VisualRenderer** (~600 lines)
   - Remove `_add_visual`, `_add_image_visual`, `_add_text_visual`, etc.
   - These are already implemented in VisualRenderer.gd

2. **HIGH - Move physics queries to PhysicsQueries** (~230 lines)
   - `_js_query_point`, `_js_query_aabb`, `_js_raycast`, etc.

3. **HIGH - Move debug/screenshot to DebugBridge** (~200 lines)
   - `capture_screenshot`, `_draw_debug_overlays`, etc.

4. **HIGH - Move 3D functions to Viewport3D** (~100 lines)
   - All `show_3d_model*`, `set_3d_*`, `rotate_3d_*` functions

5. **MEDIUM - Move joint functions to JointManager** (~200 lines)
   - Already delegating, just remove the wrapper functions

6. **MEDIUM - Clean up UI button wrappers** (~150 lines)
   - Remove duplicated `_get_or_create_ui_layer`, `_create_placeholder_texture`

7. **LOW - Create BackgroundManager** (~100 lines)
   - Extract `_setup_background`, `_setup_parallax_background`

8. **LOW - Create SplatMapSystem** (~100 lines)
   - Extract splat map functionality

---

## Estimated Final Size

| Category | Lines |
|----------|-------|
| Core orchestration | ~300 |
| Module initialization | ~100 |
| JS bridge setup | ~100 (simplified) |
| Total | ~500 lines |

This achieves the target of shrinking from 3411 to ~500 lines.
