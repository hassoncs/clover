# GameBridge Refactoring with Integration Tests

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the 4740-line GameBridge.gd monolith into clean modules (<400 lines orchestrator) with integration tests verifying TS↔Godot communication.

**Strategy:** BIG BANG - Tests first, then clean rewrite, then swap and delete legacy.

**Tech Stack:** GDScript (Godot 4.3), TypeScript, Vitest, game-inspector MCP

---

## Parallelization Map

```
PHASE 1: Foundation (Sequential)
  └─ 1.1 Handler Inventory
  └─ 1.2 Contract Tests  
  └─ 1.3 Baseline Verification

PHASE 2: Module Implementation (PARALLEL - 6 agents)
  ├─ 2.1 PhysicsController ──────┐
  ├─ 2.2 EntityManager ──────────┤
  ├─ 2.3 TransformSystem ────────┼─► All can run simultaneously
  ├─ 2.4 VisualRenderer ─────────┤
  ├─ 2.5 JointManager ───────────┤
  └─ 2.6 EventEmitter + Others ──┘

PHASE 3: Orchestrator (Sequential, depends on Phase 2)
  └─ 3.1 Write New GameBridge.gd

PHASE 4: Swap & Verify (Sequential)
  └─ 4.1 Replace and Test
  └─ 4.2 Delete Legacy
  └─ 4.3 Documentation
```

---

## Handler Inventory (78 total)

| Target Module | Handlers | Count |
|---------------|----------|-------|
| **PhysicsController** | `set_linear_velocity`, `get_linear_velocity`, `set_angular_velocity`, `get_angular_velocity`, `apply_impulse`, `apply_force`, `apply_torque` | 7 |
| **EntityManager** | `spawn_entity`, `destroy_entity`, `get_entity_transform`, `get_all_transforms`, `get_all_properties` | 5 |
| **TransformSystem** | `set_transform`, `set_position`, `set_rotation`, `set_scale`, `get_transform`, `get_transforms` | 6 |
| **VisualRenderer** | `set_entity_image`, `set_entity_atlas_region`, `set_opacity`, `set_debug_show_shapes`, `set_debug_settings`, `clear_texture_cache`, `preload_textures` | 7 |
| **JointManager** | `create_revolute_joint`, `create_distance_joint`, `create_prismatic_joint`, `create_weld_joint`, `create_mouse_joint`, `destroy_joint`, `set_motor_speed`, `set_mouse_target` | 8 |
| **EventEmitter** | `on_collision`, `on_entity_destroyed`, `on_sensor_begin`, `on_sensor_end`, `on_input_event`, `on_ui_button_event` | 6 |
| **SyncSystem** | `on_transform_sync`, `on_property_sync`, `set_watch_config`, `set_tracked_entities` | 4 |
| **QuerySystem** | `query_point`, `query_point_entity`, `query_aabb`, `raycast` | 4 |
| **CameraController** | `set_camera_target`, `set_camera_position`, `set_camera_zoom` | 3 |
| **GameLifecycle** | `load_game`, `clear_game`, `pause_physics`, `resume_physics`, `set_inspect_mode`, `load_custom_scene` | 6 |
| **UIManager** | `create_ui_button`, `destroy_ui_button`, `play_sound`, `spawn_particle` | 4 |
| **Viewport3D** | `show_3d_model`, `show_3d_model_from_url`, `set_3d_viewport_position`, `set_3d_viewport_size`, `rotate_3d_model`, `set_3d_camera_distance`, `clear_3d_models` | 7 |
| **DebugInfo** | `capture_screenshot`, `get_world_info`, `get_camera_info`, `get_viewport_info` | 4 |
| **BodyAPI** | `create_body`, `add_fixture`, `set_sensor`, `set_user_data`, `get_user_data`, `get_all_bodies`, `send_input` | 7 |

---

## PHASE 1: Foundation (Sequential)

### Task 1.1: Create Handler Inventory

**Purpose:** Extract all 78 handlers from GameBridge.gd with line numbers and categorize by target module.

**Files:**
- Create: `scripts/inventory-bridge-handlers.ts`
- Output: `.sisyphus/handler-inventory.json`

**Steps:**
1. Write script that parses `godot_project/scripts/GameBridge.gd`
2. Extract all `func _js_*` with line numbers
3. Categorize each by target module
4. Output JSON inventory

**Deliverable:** JSON file mapping each handler → target module

**Commit:** `chore(godot): create handler inventory for refactor`

---

### Task 1.2: Create Contract Tests

**Purpose:** Lock the API contract with Vitest tests using mocks.

**Files:**
- Create: `app/lib/godot/__tests__/mock-godot-bridge.ts`
- Create: `app/lib/godot/__tests__/bridge-contracts.test.ts`

**Steps:**
1. Create mock implementing all GodotBridge methods
2. Write contract tests for each method category:
   - Entity lifecycle (spawn, destroy, getTransform)
   - Physics (velocity, impulse, force)
   - Transform (setPosition, setRotation)
   - Events (callbacks register correctly)
3. Run tests: `pnpm test -- bridge-contracts`

**Deliverable:** Passing contract tests for all 78 methods

**Commit:** `test(godot): add bridge contract tests`

---

### Task 1.3: Baseline Verification with game-inspector

**Purpose:** Document current behavior for regression testing.

**Steps:**
1. Open test game: `mcp_game-inspector_open(name="draggable_cubes")`
2. Capture baseline snapshot: `mcp_game-inspector_game_snapshot()`
3. Test input: `mcp_game-inspector_simulate_input(type="tap", worldX=0, worldY=0)`
4. Document expected behaviors in `.sisyphus/baseline-behavior.md`

**Deliverable:** Documented baseline behavior checklist

**Commit:** `docs: document baseline bridge behavior for refactor`

---

## PHASE 2: Module Implementation (PARALLEL)

> **Parallelization:** Tasks 2.1-2.6 have NO dependencies on each other.
> Deploy 6 agents simultaneously, each implementing one module.

### Task 2.1: PhysicsController Module

**Purpose:** Complete physics operations module.

**Files:**
- Rewrite: `godot_project/scripts/physics/PhysicsController.gd`

**Handlers to implement (7):**
- `set_linear_velocity(entity_id, vx, vy)`
- `get_linear_velocity(entity_id) -> {x, y}`
- `set_angular_velocity(entity_id, velocity)`
- `get_angular_velocity(entity_id) -> float`
- `apply_impulse(entity_id, ix, iy)`
- `apply_force(entity_id, fx, fy)`
- `apply_torque(entity_id, torque)`

**Implementation pattern:**
```gdscript
class_name PhysicsController
extends RefCounted

var _bridge: Node

func _init(bridge: Node) -> void:
    _bridge = bridge

func set_linear_velocity(entity_id: String, vx: float, vy: float) -> void:
    var node = _bridge._entity_manager.get_entity(entity_id)
    if node == null:
        return
    var godot_vel = CoordinateUtils.game_to_godot_vec(Vector2(vx, vy), _bridge.pixels_per_meter)
    if node is RigidBody2D:
        node.linear_velocity = godot_vel
    elif node is Area2D:
        node.set_meta("velocity", godot_vel)

# ... implement all 7 methods
```

**Acceptance:**
- All 7 physics methods implemented
- Uses CoordinateUtils for conversion
- Handles missing entity gracefully

**Commit:** `feat(godot): implement PhysicsController module`

---

### Task 2.2: EntityManager Module

**Purpose:** Entity lifecycle and lookup.

**Files:**
- Rewrite: `godot_project/scripts/entity/EntityManager.gd`

**Handlers to implement (5):**
- `spawn_entity(template_id, x, y, entity_id, initial_velocity_json)`
- `destroy_entity(entity_id)`
- `get_entity_transform(entity_id) -> transform`
- `get_all_transforms() -> {id: transform}`
- `get_all_properties() -> {id: props}`

**State to own:**
- `entities: Dictionary` - entity_id → Node2D
- `body_id_map: Dictionary` - entity_id → body_id
- `body_id_reverse: Dictionary` - body_id → entity_id
- `next_body_id: int`

**Additional methods:**
- `get_entity(entity_id) -> Node2D`
- `has_entity(entity_id) -> bool`
- `register_entity(entity_id, node) -> body_id`
- `unregister_entity(entity_id)`

**Commit:** `feat(godot): implement EntityManager module`

---

### Task 2.3: TransformSystem Module

**Purpose:** Transform operations.

**Files:**
- Rewrite: `godot_project/scripts/entity/TransformSystem.gd`

**Handlers to implement (6):**
- `set_transform(entity_id, x, y, angle)`
- `set_position(entity_id, x, y)`
- `set_rotation(entity_id, angle)`
- `set_scale(entity_id, scale_x, scale_y)`
- `get_transform(entity_id) -> transform` (for query)
- `get_transforms(entity_ids) -> {id: transform}` (batch)

**Commit:** `feat(godot): implement TransformSystem module`

---

### Task 2.4: VisualRenderer Module

**Purpose:** Visual/texture operations.

**Files:**
- Rewrite: `godot_project/scripts/bridge/VisualRenderer.gd`

**Handlers to implement (7):**
- `set_entity_image(entity_id, url, width, height)`
- `set_entity_atlas_region(entity_id, atlas_url, x, y, w, h, width, height)`
- `set_opacity(entity_id, opacity)`
- `set_debug_show_shapes(enabled)`
- `set_debug_settings(settings_json)`
- `clear_texture_cache(url)`
- `preload_textures(urls_json, progress_callback)`

**State to own:**
- `_texture_cache: Dictionary`
- `_pending_textures: Array`
- `_debug_show_shapes: bool`

**Commit:** `feat(godot): implement VisualRenderer module`

---

### Task 2.5: JointManager Module

**Purpose:** Physics joint operations.

**Files:**
- Rewrite: `godot_project/scripts/physics/JointManager.gd`

**Handlers to implement (8):**
- `create_revolute_joint(...) -> joint_id`
- `create_distance_joint(...) -> joint_id`
- `create_prismatic_joint(...) -> joint_id`
- `create_weld_joint(...) -> joint_id`
- `create_mouse_joint(...) -> joint_id`
- `destroy_joint(joint_id)`
- `set_motor_speed(joint_id, speed)`
- `set_mouse_target(joint_id, x, y)`

**State to own:**
- `joints: Dictionary` - joint_id → Joint2D
- `joint_counter: int`

**Commit:** `feat(godot): implement JointManager module`

---

### Task 2.6: Remaining Modules (EventEmitter, SyncSystem, QuerySystem, CameraController, UIManager)

**Purpose:** Implement remaining smaller modules.

**Files:**
- Enhance: `godot_project/scripts/bridge/EventEmitter.gd` (already exists, verify complete)
- Enhance: `godot_project/scripts/bridge/SyncSystem.gd`
- Keep: `godot_project/scripts/bridge/QuerySystem.gd`
- Create: `godot_project/scripts/bridge/CameraController.gd`
- Create: `godot_project/scripts/bridge/UIManager.gd`

**EventEmitter handlers (6):**
- `on_collision(callback)` - register collision callback
- `on_entity_destroyed(callback)`
- `on_sensor_begin(callback)`
- `on_sensor_end(callback)`
- `on_input_event(callback)`
- `on_ui_button_event(callback)`

**SyncSystem handlers (4):**
- `on_transform_sync(callback)`
- `on_property_sync(callback)`
- `set_watch_config(config_json)`
- `set_tracked_entities(entity_ids, config)`

**CameraController handlers (3):**
- `set_camera_target(entity_id)`
- `set_camera_position(x, y)`
- `set_camera_zoom(zoom)`

**UIManager handlers (4):**
- `create_ui_button(button_id, config_json)`
- `destroy_ui_button(button_id)`
- `play_sound(url, volume)`
- `spawn_particle(config_json)`

**Commits:**
- `feat(godot): enhance EventEmitter module`
- `feat(godot): enhance SyncSystem module`
- `feat(godot): implement CameraController module`
- `feat(godot): implement UIManager module`

---

## PHASE 3: New Orchestrator (Sequential - depends on Phase 2)

### Task 3.1: Write New GameBridge.gd

**Purpose:** Create thin orchestrator that delegates to modules.

**Files:**
- Create: `godot_project/scripts/GameBridge.gd.new`

**Structure (~350 lines):**

```gdscript
extends Node

# ============================================================================
# MODULE INSTANCES
# ============================================================================
var _entity_manager: EntityManager
var _entity_factory: EntityFactory
var _physics_controller: PhysicsController
var _transform_system: TransformSystem
var _visual_renderer: VisualRenderer
var _joint_manager: JointManager
var _event_emitter: EventEmitter
var _sync_system: SyncSystem
var _query_system: QuerySystem
var _camera_controller: CameraController
var _ui_manager: UIManager
var _physics_queries: PhysicsQueries
var _debug_bridge: DebugBridge
var _viewport_3d: Viewport3D

# ============================================================================
# CORE STATE (minimal)
# ============================================================================
var game_data: Dictionary = {}
var templates: Dictionary = {}
var pixels_per_meter: float = 50.0
var game_root: Node2D = null

# ============================================================================
# LIFECYCLE
# ============================================================================
func _ready() -> void:
    _init_modules()
    _setup_js_bridge()

func _init_modules() -> void:
    _entity_manager = EntityManager.new(self)
    _entity_factory = EntityFactory.new(self, _entity_manager)
    _physics_controller = PhysicsController.new(self)
    _transform_system = TransformSystem.new(self)
    _visual_renderer = VisualRenderer.new(self)
    _joint_manager = JointManager.new(self)
    _event_emitter = EventEmitter.new(self)
    _sync_system = SyncSystem.new(self)
    _query_system = QuerySystem.new()
    _camera_controller = CameraController.new(self)
    _ui_manager = UIManager.new(self)
    _physics_queries = PhysicsQueries.new(self)
    _viewport_3d = Viewport3D.new()
    add_child(_viewport_3d)
    _debug_bridge = DebugBridge.new(self, _query_system)

func _setup_js_bridge() -> void:
    if not OS.has_feature("web"):
        return
    # Register all JS callbacks...
    # (JS bridge registration code)

# ============================================================================
# THIN HANDLERS - Physics (delegate to PhysicsController)
# ============================================================================
func _js_set_linear_velocity(args: Array) -> void:
    _physics_controller.set_linear_velocity(str(args[0]), float(args[1]), float(args[2]))

func _js_get_linear_velocity(args: Array) -> Variant:
    return _physics_controller.get_linear_velocity(str(args[0]))

func _js_set_angular_velocity(args: Array) -> void:
    _physics_controller.set_angular_velocity(str(args[0]), float(args[1]))

func _js_get_angular_velocity(args: Array) -> Variant:
    return _physics_controller.get_angular_velocity(str(args[0]))

func _js_apply_impulse(args: Array) -> void:
    _physics_controller.apply_impulse(str(args[0]), float(args[1]), float(args[2]))

func _js_apply_force(args: Array) -> void:
    _physics_controller.apply_force(str(args[0]), float(args[1]), float(args[2]))

func _js_apply_torque(args: Array) -> void:
    _physics_controller.apply_torque(str(args[0]), float(args[1]))

# ============================================================================
# THIN HANDLERS - Entity (delegate to EntityManager)
# ============================================================================
func _js_spawn_entity(args: Array) -> void:
    _entity_manager.spawn_entity(str(args[0]), float(args[1]), float(args[2]), str(args[3]), str(args[4]))

func _js_destroy_entity(args: Array) -> void:
    _entity_manager.destroy_entity(str(args[0]))

func _js_get_entity_transform(args: Array) -> Variant:
    return _entity_manager.get_entity_transform(str(args[0]))

func _js_get_all_transforms(_args: Array) -> Variant:
    return _entity_manager.get_all_transforms()

func _js_get_all_properties(_args: Array) -> Variant:
    return _entity_manager.get_all_properties()

# ============================================================================
# THIN HANDLERS - Transform (delegate to TransformSystem)
# ============================================================================
func _js_set_transform(args: Array) -> void:
    _transform_system.set_transform(str(args[0]), float(args[1]), float(args[2]), float(args[3]))

func _js_set_position(args: Array) -> void:
    _transform_system.set_position(str(args[0]), float(args[1]), float(args[2]))

func _js_set_rotation(args: Array) -> void:
    _transform_system.set_rotation(str(args[0]), float(args[1]))

func _js_set_scale(args: Array) -> void:
    _transform_system.set_scale(str(args[0]), float(args[1]), float(args[2]))

# ============================================================================
# THIN HANDLERS - Visual (delegate to VisualRenderer)
# ============================================================================
func _js_set_entity_image(args: Array) -> void:
    _visual_renderer.set_entity_image(str(args[0]), str(args[1]), float(args[2]), float(args[3]))

func _js_set_opacity(args: Array) -> void:
    _visual_renderer.set_opacity(str(args[0]), float(args[1]))

func _js_set_debug_show_shapes(args: Array) -> void:
    _visual_renderer.set_debug_show_shapes(bool(args[0]))

# ============================================================================
# THIN HANDLERS - Joints (delegate to JointManager)
# ============================================================================
func _js_create_revolute_joint(args: Array) -> int:
    return _joint_manager.create_revolute_joint(args)

func _js_destroy_joint(args: Array) -> void:
    _joint_manager.destroy_joint(int(args[0]))

func _js_set_motor_speed(args: Array) -> void:
    _joint_manager.set_motor_speed(int(args[0]), float(args[1]))

# ============================================================================
# THIN HANDLERS - Events (delegate to EventEmitter)
# ============================================================================
func _js_on_collision(args: Array) -> void:
    _event_emitter.set_collision_callback(args[0])

func _js_on_entity_destroyed(args: Array) -> void:
    _event_emitter.set_destroy_callback(args[0])

func _js_on_sensor_begin(args: Array) -> void:
    _event_emitter.set_sensor_begin_callback(args[0])

func _js_on_sensor_end(args: Array) -> void:
    _event_emitter.set_sensor_end_callback(args[0])

# ============================================================================
# THIN HANDLERS - Camera (delegate to CameraController)
# ============================================================================
func _js_set_camera_target(args: Array) -> void:
    _camera_controller.set_target(str(args[0]))

func _js_set_camera_position(args: Array) -> void:
    _camera_controller.set_position(float(args[0]), float(args[1]))

func _js_set_camera_zoom(args: Array) -> void:
    _camera_controller.set_zoom(float(args[0]))

# ... (continue for remaining ~40 handlers)
# Each handler is 1-3 lines: parse args, delegate to module
```

**Acceptance:**
- All 78 handlers present
- Each handler is ≤3 lines (parse + delegate)
- Total file < 400 lines
- No implementation logic in handlers

**Commit:** `feat(godot): write new thin GameBridge orchestrator`

---

## PHASE 4: Swap & Verify (Sequential)

### Task 4.1: Replace Old with New

**Steps:**
1. Backup: `mv godot_project/scripts/GameBridge.gd godot_project/scripts/GameBridge.gd.old`
2. Activate: `mv godot_project/scripts/GameBridge.gd.new godot_project/scripts/GameBridge.gd`
3. Run contract tests: `pnpm test -- bridge-contracts`
4. Verify with game-inspector:
   ```
   mcp_game-inspector_open(name="draggable_cubes")
   mcp_game-inspector_game_snapshot()
   mcp_game-inspector_simulate_input(type="tap", worldX=0, worldY=0)
   ```
5. If tests fail → fix modules, re-run

**Commit:** `refactor(godot): swap to new modular GameBridge`

---

### Task 4.2: Delete Legacy Code

**Steps:**
1. Delete backup: `rm godot_project/scripts/GameBridge.gd.old`
2. Delete legacy JSBridge: `rm godot_project/scripts/bridge/JSBridge.gd`
3. Search for orphaned code: `grep -r "JSBridge" godot_project/`
4. Final verification: `pnpm test && game-inspector verification`

**Commit:** `chore(godot): delete legacy GameBridge code`

---

### Task 4.3: Update Documentation

**Files:**
- Update: `docs/refactoring/gamebridge-module-split.md`
- Update: `godot_project/README.md`

**Document:**
- Final module structure
- Handler → module mapping
- How to add new handlers
- Line count summary

**Commit:** `docs(godot): update module architecture documentation`

---

## Success Criteria

| Metric | Target |
|--------|--------|
| GameBridge.gd lines | < 400 |
| Old monolith | DELETED |
| Contract tests | 78/78 passing |
| game-inspector verification | All baseline behaviors work |
| Module count | 12 focused modules |

---

## Execution Summary

| Phase | Tasks | Parallelizable | Estimated Time |
|-------|-------|----------------|----------------|
| 1 | 3 | No | 1-2 hours |
| 2 | 6 | **YES (6 agents)** | 2-3 hours |
| 3 | 1 | No | 1-2 hours |
| 4 | 3 | No | 1 hour |

**Total with parallelization:** ~5-8 hours
**Total sequential:** ~12-16 hours
