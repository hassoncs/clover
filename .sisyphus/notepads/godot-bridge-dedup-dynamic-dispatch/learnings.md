# Learnings

## Task 1: Bridge Contract Baseline (2026-02-09)

### Findings

**Total Method Count:**
- 83 native methods in `_method_map`
- 76 web methods in `callbacks` + `extra_callbacks`
- 46 query system handlers (GameBridge.gd + DebugBridge.gd)
- **129 unique methods total**

**Parity Gaps (Native-Only):**
1. `spawn_entity_with_id` (4+ args)
2. `screen_to_world` (2 args) - exists as query handler
3. `set_entity_image_from_file` (4+ args)
4. `set_entity_atlas_region_from_file` (8+ args)
5. `create_themed_ui_component` (7-8 args)
6. `destroy_themed_ui_component` (1 arg)

**Naming Convention Observations:**
- Native dispatch: `snake_case` exclusively
- Web callbacks: `camelCase` for most methods
- **Exception:** 3D methods use `snake_case` in BOTH native and web
- **Exception:** Pixel buffer methods use `camelCase` in BOTH
- Query handlers: `camelCase` exclusively
- Module bridge methods: `_js_` prefix convention

**3D Method Status:**
- ✓ 8 of 11 required methods present in both registries
- ✗ Missing: `create_3d_floor`, `create_3d_cube`, `clear_3d_cubes`
- All present methods use snake_case (no camelCase aliases)

**Duplication Pattern:**
- Every method in `_method_map` that has a web equivalent is duplicated in `callbacks` or `extra_callbacks`
- 3D methods are duplicated in `extra_callbacks` (lines 353-363)
- Module bridge methods (e.g., `_js_spawn_entity`) are referenced by BOTH registries

### Evidence Files Created

1. `.sisyphus/evidence/bridge-contract-baseline.md` - Full method inventory
2. `.sisyphus/evidence/task-1-bridge-contract-diff.txt` - Diff report
3. `.sisyphus/evidence/task-1-3d-baseline-check.txt` - 3D method verification

### Key Insights for Refactor

1. **Dynamic dispatch can eliminate ~76 duplicate registrations** by using a single registry with case conversion
2. **Module bridge methods** (`_js_*`) are already centralized - good pattern to extend
3. **Query system handlers** are separate from main dispatch - may need integration decision
4. **Native-only methods** need platform detection or web polyfills
5. **3D methods** break the camelCase convention - intentional or oversight?

## Task 1: Bridge Contract Baseline (2026-02-09)

### Method Enumeration Complete

**Total Methods Discovered:** 129 unique methods
- Native dispatch (_method_map): 83 methods
- Web callbacks: 76 methods  
- Query system handlers: 46 methods

**Categories Identified:**
1. Lifecycle (6) - load_game_json, clear_game, pause_physics, etc.
2. Entity Management (9) - spawn, destroy, transforms, user data
3. Transform System (4) - set_transform, position, rotation, scale
4. Physics Control (7) - velocity, impulse, force, torque
5. Sync System (6) - property/transform sync, watch config
6. Visual Rendering (10) - opacity, visibility, images, atlas, debug
7. Pixel Buffer (4) - create, draw, clear, destroy
8. Joint System (9) - revolute, distance, prismatic, weld, mouse
9. Physics Queries (4) - point, AABB, raycast
10. Input/Events (5) - send_input, collision, sensor callbacks
11. Camera (6) - target, position, zoom, start/stop
12. UI (7) - particles, sound, buttons, themed components
13. 3D Viewport (8) - model loading, viewport control, camera

### Platform Parity Analysis

**Native-Only Methods (6):**
- `spawn_entity_with_id` - Explicit ID control
- `set_entity_image_from_file` - Filesystem path variant
- `set_entity_atlas_region_from_file` - Filesystem path variant
- `create_themed_ui_component` - Native UI system
- `destroy_themed_ui_component` - Native UI system
- `screen_to_world` - Also available via query system

**Naming Convention Patterns:**
- Native: snake_case (e.g., `load_game_json`)
- Web: camelCase (e.g., `loadGameJson`)
- **Exception 1:** 3D methods use snake_case in BOTH paths
- **Exception 2:** Pixel buffer uses camelCase in BOTH paths

### 3D Method Verification ✅

All 8 3D viewport methods confirmed present:
- `show_3d_model` / `show_3d_model_from_url`
- `set_3d_viewport_position` / `set_3d_viewport_size`
- `rotate_3d_model`
- `set_3d_camera_distance` / `set_3d_camera_size`
- `clear_3d_models`

**Critical Finding:** 3D methods are duplicated:
- Registered in `_method_map` (lines 258-265)
- Re-registered in `extra_callbacks` (lines 355-362)
- Identical implementations in both locations

### Duplication Patterns Identified

**Exact Duplicates (54 methods):**
Most methods in `_method_map` are re-registered in web `callbacks` with camelCase aliases pointing to the same module functions (e.g., `_entity_manager._js_spawn_entity`).

**Web Extra Block (8 methods):**
- `clearTextureCache`
- All 8 3D methods (duplicating _method_map entries)

**Query System (46 methods):**
Separate registration path via `_query_system.register_handler()` in GameBridge.gd and DebugBridge.gd.

### Key Insights for Refactor

1. **Module Functions Are Shared:** Both native and web paths call the same underlying module methods (e.g., `_entity_manager._js_spawn_entity`)

2. **Naming Translation Needed:** Dynamic dispatch must handle snake_case → camelCase mapping for web compatibility

3. **3D Methods Are Special:** They break the naming convention by using snake_case everywhere

4. **Query System Is Separate:** May need different handling than direct dispatch methods

5. **TypeScript Calls Match Native:** All `callGameBridge()` calls use snake_case matching `_method_map` keys

### Evidence Files Created

- `bridge-contract-baseline.md` - Full method inventory with categories
- `task-1-bridge-contract-diff.txt` - Summary of changes and verification
- `task-1-3d-baseline-check.txt` - Detailed 3D method verification

### Next Task Requirements

Task 2 (Dynamic Dispatch Implementation) needs:
- ✅ Complete method inventory available
- ✅ Platform differences documented
- ✅ 3D method preservation requirements clear
- ✅ Naming convention patterns identified
- ✅ Module ownership mapped

