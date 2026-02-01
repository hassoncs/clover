# GameBridge Clean Architecture - Master Plan

## TL;DR

> **Quick Summary**: Complete architectural rewrite of the Godot GameBridge to eliminate ALL legacy code, Box2D patterns, duplicate entity tracking, and fragmented hit-testing. Result: a clean, maintainable engine with single sources of truth for entity creation, tracking, input handling, and bridge communication.
>
> **Deliverables**:
> - Single entity creation path via `EntityFactory.create(config)`
> - Three explicit archetypes: `body`, `sensor`, `hitbox` (+ optional `visual`)
> - Single `EntityRecord` registry replacing 9+ scattered dictionaries
> - Single `_hit_test()` implementation for all input detection
> - Unified native/web bridge with no legacy protocol
> - ALL Box2D terminology removed (no body_id, collider_id, fixture)
> - ALL deprecated zone code removed
>
> **Estimated Effort**: Large (2.5-3.5 weeks) *(+2-3 days for proper baseline/verification)*
> **Parallel Execution**: YES – 6 waves
> **Critical Path**: Wave 0 (Baseline) → Wave 1 (Hit-test + Layers) → Wave 2 (Schema + Factory) → Wave 3 (Registry Migration) → Wave 4 (Bridge + TS) → Wave 5 (Final verification)

---

## Rollback Strategy (Per-Wave)

**CRITICAL**: Before starting each wave, create a safety checkpoint.

```bash
# Before Wave N
git checkout -b wave-N-start
git add -A && git commit -m "checkpoint: before wave N"
git tag wave-N-baseline

# After Wave N succeeds
git tag wave-N-complete

# If Wave N fails: rollback
git reset --hard wave-N-baseline
```

---

## Context

### The Problem

The GameBridge has accumulated significant technical debt through multiple refactoring cycles:

1. **GameBridge.gd is 3900+ lines** with scattered responsibilities
2. **9+ parallel dictionaries** tracking entities (`entities`, `sensors`, `body_id_map`, `body_id_reverse`, `collider_id_map`, `user_data`, `body_groups`, `entity_shape_map`, `sensor_velocities`)
3. **4+ duplicate hit-test implementations** with inline physics queries
4. **4+ entity creation paths** (`_create_entity`, `_js_create_body`, `_js_add_fixture`, `_create_sensor_entity`, `_create_physics_body`)
5. **Box2D terminology everywhere** despite using Godot physics (body_id, collider_id, fixtures)
6. **Deprecated ZoneComponent** still present throughout
7. **Native/Web bridge divergence** with duplicate logic

### Constraints (Non-negotiable)

- **NO fallback paths**: Each subsystem migrates fully, then legacy deleted immediately
- **Big-bang in chunks**: Complete each phase before moving to next
- **NO `isSensor` flag**: Use explicit `sensor` or `hitbox` archetype
- **Single source of truth**: One registry, one creation path, one hit-test
- **Both native and web**: Changes must work on both platforms

### In-Scope Files

**Godot (Primary):**
- `godot_project/scripts/GameBridge.gd` (shrink from 3900+ to ~500 lines)
- `godot_project/scripts/entity/EntityFactory.gd` (single creation path)
- `godot_project/scripts/entity/EntityRecord.gd` (NEW - unified registry)
- `godot_project/scripts/entity/EntityManager.gd` (consolidate tracking)
- `godot_project/scripts/physics/PhysicsQueries.gd` (hit test + layer usage)
- `godot_project/scripts/input/InputRouter.gd` (NEW - extracted input handling)
- `godot_project/scripts/bridge/*.gd` (all bridge modules)

**TypeScript:**
- `app/lib/game-engine/EntityManager.ts` (remove fixtures, zones)
- `app/lib/game-engine/types.ts` (remove bodyId/colliderId patterns)
- `app/lib/game-engine/hooks/useGameInput.ts` (remove geometric fallback)
- `app/lib/physics2d/types.ts` (remove Box2D terminology)
- `app/lib/godot/GodotBridge.native.ts` (unify with web)
- `app/lib/godot/GodotBridge.web.ts` (unify with native)

---

## Legacy Code Inventory (TO BE DELETED)

### Godot Side - GameBridge.gd Dictionaries (ALL TO BE REMOVED)

| Dictionary | Line | Purpose | Replacement |
|------------|------|---------|-------------|
| `entities` | 39 | entity_id → Node2D | `EntityRecord.node` |
| `sensors` | 78 | entity_id → Area2D | `EntityRecord.node` (archetype=sensor) |
| `sensor_velocities` | 79 | entity_id → velocity | `EntityRecord.velocity` |
| `body_id_map` | 99 | entity_id → body_id | **DELETE** - use entity_id directly |
| `body_id_reverse` | 100 | body_id → entity_id | **DELETE** - use entity_id directly |
| `next_body_id` | 101 | counter | **DELETE** |
| `collider_id_map` | 104 | collider_id → info | **DELETE** - use entity_id |
| `next_collider_id` | 105 | counter | **DELETE** |
| `user_data` | 108 | body_id → data | `EntityRecord.user_data` |
| `body_groups` | 109 | body_id → group | `EntityRecord.group` |
| `entity_shape_map` | 112 | entity_id → collider_ids | **DELETE** - shapes on node |

### Godot Side - Duplicate Entity Creation (ALL TO BE DELETED)

| Method | Location | Replacement |
|--------|----------|-------------|
| `_create_entity()` | GameBridge.gd | `EntityFactory.create()` |
| `_js_create_body()` | GameBridge.gd:2980 | `EntityFactory.create()` |
| `_js_add_fixture()` | GameBridge.gd:3030 | **DELETE** - collider in create() |
| `_create_sensor_entity()` | GameBridge.gd | `EntityFactory.create(archetype="sensor")` |
| `_create_physics_body()` | GameBridge.gd | `EntityFactory.create(archetype="body")` |
| `create_zone_entity()` | EntityFactory.gd:287 | **DELETE** - deprecated |

### Godot Side - Duplicate Hit-Test (ALL TO BE UNIFIED)

| Method | Location | Status |
|--------|----------|--------|
| `_input()` inline query | GameBridge.gd:224-235 | → Use `_hit_test()` |
| `send_input()` inline query | GameBridge.gd:830-842 | → Use `_hit_test()` |
| `_js_send_input()` inline query | GameBridge.gd:858-871 | → Use `_hit_test()` |
| `query_point()` | PhysicsQueries.gd:9 | ✅ Keep (canonical) |
| `query_point_entity()` | PhysicsQueries.gd:31 | ✅ Keep (canonical) |

### TypeScript Side - Box2D Patterns (ALL TO BE REMOVED)

| Pattern | Location | Replacement |
|---------|----------|-------------|
| `BodyId` type | physics2d/types.ts | `EntityId` (string) |
| `ColliderId` type | physics2d/types.ts | **DELETE** |
| `FixtureDef` interface | physics2d/types.ts | `ColliderConfig` |
| `createBodyId()` | physics2d/types.ts | **DELETE** |
| `createColliderId()` | physics2d/types.ts | **DELETE** |
| `addFixture()` | EntityManager.ts:386 | Collider in entity config |
| `ZoneComponent` | shared/types/physics.ts | **DELETE** - deprecated |
| `createZoneArea()` | EntityManager.ts:437 | **DELETE** - deprecated |
| `zones` Map | EntityManager.ts:93 | **DELETE** - deprecated |

---

## Target Architecture

### Entity Archetypes (Exactly 4)

| Archetype | Godot Node | Physics | Hit-Test | Use Case |
|-----------|------------|---------|----------|----------|
| `body.dynamic` | RigidBody2D | YES | YES | Moving physics objects (balls) |
| `body.static` | StaticBody2D | YES | YES | Fixed physics objects (walls) |
| `body.kinematic` | CharacterBody2D | YES | YES | Script-controlled physics (paddles) |
| `sensor` | Area2D (Layer 2) | NO | NO* | Overlap detection (triggers) |
| `hitbox` | Area2D (Layer 4) | NO | YES | UI tap targets (buttons, tubes) |
| `visual` | Node2D | NO | NO | Pure visuals (particles, effects) |

*Sensors are NOT hit-tested for taps by default, but CAN be if explicitly configured.

### Hit-Test Priority Rules

When multiple entities overlap at a tap point:

1. **Layer Priority**: Hitboxes (L4) > Bodies (L1) > Sensors (L2, if enabled)
2. **Within Layer**: Higher Z-index wins
3. **Same Z-index**: First physics query result (undefined ordering)

### Collision Layer Convention

| Layer | Purpose | Bodies Collide | Sensors Detect | Hit-Test |
|-------|---------|----------------|----------------|----------|
| 1 | Physics bodies | YES | YES | YES |
| 2 | Sensors | NO | YES (bodies) | NO (by default) |
| 4 | Hitboxes | NO | NO | YES |

### EntityRecord (Single Source of Truth)

```gdscript
# godot_project/scripts/entity/EntityRecord.gd
class_name EntityRecord extends RefCounted

var entity_id: String
var node: Node2D
var archetype: String  # "body", "sensor", "hitbox", "visual"
var template: String
var tags: Array[String]
var group: String
var user_data: Dictionary
var collider_ids: Array[int]  # Shape indices on the node

# Additional fields (from Metis review)
var velocity: Vector2 = Vector2.ZERO  # For sensor movement
var texture_ref: String = ""          # For dynamic images
var audio_refs: Array[String] = []    # For entity audio

# Safety helper
func is_valid() -> bool:
    return node != null and is_instance_valid(node)
```

### EntityRegistry (Replaces 9 Dictionaries)

```gdscript
# Single dictionary in GameBridge or EntityManager
var entity_registry: Dictionary = {}  # entity_id -> EntityRecord

# All lookups via registry with null safety
func get_node(entity_id: String) -> Node2D:
    var record = entity_registry.get(entity_id)
    if record and record.is_valid():
        return record.node
    return null

func get_record(entity_id: String) -> EntityRecord:
    var record = entity_registry.get(entity_id)
    if record and record.is_valid():
        return record
    return null
```

### Single Hit-Test

```gdscript
func _hit_test(x: float, y: float) -> String:
    var godot_pos = game_to_godot_pos(Vector2(x, y))
    var space = get_viewport().find_world_2d().direct_space_state
    if space == null:
        return ""
    
    var query = PhysicsPointQueryParameters2D.new()
    query.position = godot_pos
    query.collision_mask = LAYER_BODIES | LAYER_HITBOXES  # 1 | 4 = 5
    query.collide_with_bodies = true
    query.collide_with_areas = true
    
    var results = space.intersect_point(query, 10)  # Get multiple for priority sorting
    if results.is_empty():
        return ""
    
    # Sort by layer priority: hitboxes first, then bodies
    var best_hit: String = ""
    var best_layer: int = 0
    for result in results:
        var collider = result.collider
        if collider and entity_registry.has(collider.name):
            var layer = collider.collision_layer
            if layer & LAYER_HITBOXES:  # Hitbox has priority
                return collider.name
            elif layer & LAYER_BODIES and best_layer == 0:
                best_hit = collider.name
                best_layer = layer
    
    return best_hit
```

### InputRouter Interface

```gdscript
# godot_project/scripts/input/InputRouter.gd
class_name InputRouter extends RefCounted

# InputRouter OWNS:
var _is_dragging: bool = false
var _drag_entity_id: String = ""
var _drag_start_pos: Vector2 = Vector2.ZERO
var _drag_start_time: float = 0.0
var _tap_threshold_distance: float = 10.0
var _tap_threshold_time: float = 0.3

# InputRouter DOES:
func process_input(type: String, x: float, y: float) -> Dictionary:
    # Returns {type, entity_id, world_pos, etc.}
    pass

func _hit_test(x: float, y: float) -> String:
    pass

# GameBridge KEEPS:
# - Event queue (_queue_event, _event_queue)
# - JS bridge notifications (_notify_js_input_event)
# - Coordinate conversion (game_to_godot_pos)
```

---

## Execution Waves

### Wave 0: Baseline & Safety (Day 1)
- Task 0: Baseline verification + inventory
- Task 1: Create regression checklist with evidence capture

### Wave 1: Hit-Test + Layers (Days 2-4)
- Task 2: Extract `_hit_test()` with priority rules
- Task 2b: Add automated hit-test tests
- Task 3: Delete duplicate hit-test logic
- Task 4: Implement collision layer convention
- Task 5: Remove old layer/mask conventions
- **Wave 1 Gate**: Run `pnpm tsc --noEmit`, manual regression check

### Wave 2: Schema + Factory (Days 5-8)
- Task 6: Define clean TypeScript schema (body/sensor/hitbox)
- Task 7: Create `EntityRecord.gd` class (with expanded schema)
- Task 10: Implement `EntityFactory.create(config)` with archetype routing
- Task 11: Migrate all creation callers to factory
- Task 12: Delete legacy creation methods
- Task 13: Delete deprecated zone code
- **Wave 2 Gate**: Run `pnpm tsc --noEmit`, manual regression check

### Wave 3: Registry Migration (Days 9-12)
- Task 8a: Migrate `entities` dict only
- Task 8b: Migrate `sensors` and `sensor_velocities`
- Task 8c: Migrate `body_id_map` and `body_id_reverse`
- Task 8d: Migrate `collider_id_map` and `entity_shape_map`
- Task 8e: Migrate `user_data` and `body_groups`
- Task 9: Delete old dictionaries from GameBridge
- **Wave 3 Gate**: Run `pnpm tsc --noEmit`, manual regression check

### Wave 4: Bridge + TypeScript (Days 13-16)
- Task 14: Shrink GameBridge (extract InputRouter)
- Task 15: Remove Box2D types from TypeScript
- Task 16: Unify native/web bridge (with diff analysis)
- Task 17: Remove geometric fallback from useGameInput
- **Wave 4 Gate**: Run `pnpm tsc --noEmit`, manual regression check

### Wave 5: Final Verification (Days 17-18)
- Task 18: Run all verification commands
- Task 18b: Performance benchmark comparison
- Task 19: Manual regression sweep (both platforms)
- Task 20: Documentation updates

### Wave 6: Legacy Purge (Days 19-20)
- Task 21: Dead code analysis (find ALL unused code)
- Task 22: Delete orphaned functions and files
- Task 23: Delete legacy TypeScript patterns
- Task 24: Final codebase audit
- **Wave 6 Gate**: Grep confirms ZERO legacy patterns remain

---

## Detailed Tasks

### Wave 0: Baseline & Safety

#### Task 0: Baseline Verification + Inventory

**Description**: Capture current working state and document all legacy paths.

**What to do**:

1. **Run baseline verification** (must all pass before proceeding):
```bash
pnpm tsc --noEmit                    # TypeScript check
pnpm test                            # Unit tests
# Capture current frame time for performance baseline
```

2. **Enumerate legacy code**:
```bash
# Hit-test callsites
grep -rn "intersect_point" godot_project/scripts/ > inventory-hit-test.txt

# Entity creation paths
grep -rn "_create_entity\|_js_create_body\|_js_add_fixture\|_create_sensor" godot_project/scripts/ > inventory-creation.txt

# Dictionary usages (for Task 8 split)
grep -rn "body_id_map\|body_id_reverse\|collider_id_map\|sensor_velocities\|user_data\|body_groups\|entity_shape_map" godot_project/scripts/ > inventory-dictionaries.txt
```

3. **Document current behavior**:
- "Topmost" = first physics query result (no Z-order currently)
- Sensors NOT eligible for tap (Area2D with layer 2)
- Bodies ARE eligible for tap
- Hitboxes ARE eligible for tap (Area2D with layer 4)

**Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: `slopcade-game-engine`, `systematic-debugging`

**Dependencies**: None
**Blocks**: All subsequent tasks

**Acceptance Criteria**:
- [ ] `pnpm tsc --noEmit` passes (baseline)
- [ ] `pnpm test` passes (baseline)
- [ ] `inventory-hit-test.txt` exists with all callsites
- [ ] `inventory-creation.txt` exists with all creation paths
- [ ] `inventory-dictionaries.txt` exists with all dict usages
- [ ] Baseline behavior documented in `.sisyphus/baseline-behavior.md`

---

#### Task 1: Manual Regression Checklist with Evidence

**Description**: Create golden checklist with screenshot/recording requirements.

**What to do**:
Create `.sisyphus/regression-checklist.md`:

```markdown
# Regression Checklist

## Ball Sort
- [ ] Start game: board renders correctly
- [ ] Tap tube (idle): ball picked up
- [ ] Tap tube (holding): ball dropped
- [ ] Tap outside tubes: no action
- [ ] Evidence: screenshot of working state

## Slopeggle
- [ ] Start game: pegs and ball render
- [ ] Tap to launch: ball moves
- [ ] Ball hits peg: collision fires, peg lights up
- [ ] Ball falls off: lives decrement
- [ ] Evidence: screenshot of working state

## Sensor Behavior
- [ ] Sensor overlap event fires (check console)
- [ ] Sensor exit event fires
- [ ] Evidence: console log showing events

## Hitbox Behavior
- [ ] Hitbox responds to tap
- [ ] Hitbox does NOT affect physics simulation
- [ ] Evidence: screenshot showing tap response

## Platform Tests
- [ ] Web: all above pass
- [ ] Native (iOS/Android): all above pass
```

**Agent Profile**:
- **Category**: `writing`
- **Skills**: `slopcade-game-engine`

**Dependencies**: Task 0
**Blocks**: All verification tasks

**Acceptance Criteria**:
- [ ] Checklist document exists at `.sisyphus/regression-checklist.md`
- [ ] Covers Ball Sort, Slopeggle, sensors, hitboxes
- [ ] Includes evidence requirements
- [ ] Includes both platform tests

---

### Wave 1: Hit-Test + Layers

#### Task 2: Extract `_hit_test(x, y)` with Priority Rules

**Description**: Create single canonical hit-test function with layer priority.

**What to do**:
1. Implement `_hit_test(x: float, y: float) -> String` in GameBridge.gd
2. Returns entity_id or empty string
3. **Hit Priority**: Hitboxes (L4) > Bodies (L1) > Sensors (L2, if enabled)
4. Uses `intersect_point` with `collide_with_bodies=true`, `collide_with_areas=true`
5. Gets multiple results (up to 10) and sorts by priority
6. Single place for debug logging
7. Update all hit-test consumers to call `_hit_test`:
   - `_input()` (web mouse events)
   - `send_input()` (native bridge)
   - `_js_send_input()` (web JS)
   - Keep `query_point_entity()` delegating to PhysicsQueries

**Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `slopcade-game-engine`, `slopcade-godot-bridge`

**Dependencies**: Task 0
**Blocks**: Task 2b, Task 3

**Acceptance Criteria**:
- [ ] Single `_hit_test()` implementation exists
- [ ] Layer priority implemented (hitbox > body > sensor)
- [ ] All 3 input paths use `_hit_test()`
- [ ] Ball Sort + Slopeggle taps work correctly

---

#### Task 2b: Add Automated Hit-Test Tests

**Description**: Create automated tests for hit-test accuracy.

**What to do**:
Using game-inspector MCP tools, create tests:

1. **Test: Hit-test returns correct entity**
```typescript
// Spawn entity at known position, query that point, verify entity returned
```

2. **Test: Hit-test respects layer priority**
```typescript
// Spawn overlapping hitbox + body, tap, verify hitbox wins
```

3. **Test: Hit-test returns empty for no entity**
```typescript
// Query point with no entity, verify empty string
```

**Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `slopcade-game-engine`, `test-driven-development`

**Dependencies**: Task 2
**Blocks**: Task 3

**Acceptance Criteria**:
- [ ] At least 3 automated hit-test tests exist
- [ ] Tests pass with current implementation
- [ ] Tests use game-inspector MCP or vitest

---

#### Task 3: Delete Duplicate Hit-Test Logic

**Description**: Remove all non-canonical hit-test code.

**What to do**:
- Delete inline `intersect_point` queries from:
  - `_input()` lines 224-235
  - `send_input()` lines 830-842
  - `_js_send_input()` lines 858-871
- Each callsite should be ~3 lines calling `_hit_test()`

**Agent Profile**:
- **Category**: `quick`
- **Skills**: `git-master`

**Dependencies**: Task 2b
**Blocks**: Task 4

**Acceptance Criteria**:
- [ ] Code search shows only `_hit_test` contains selection logic
- [ ] No inline `intersect_point` in input handlers
- [ ] Automated hit-test tests still pass
- [ ] Manual checks still pass

---

#### Task 4: Implement Collision Layer Convention

**Description**: Apply consistent layer/mask policy.

**What to do**:
1. Define constants in new file `godot_project/scripts/constants/CollisionLayers.gd`:
```gdscript
class_name CollisionLayers

const LAYER_BODIES: int = 1
const LAYER_SENSORS: int = 2
const LAYER_HITBOXES: int = 4

const MASK_HIT_TEST: int = LAYER_BODIES | LAYER_HITBOXES  # 5
const MASK_PHYSICS: int = LAYER_BODIES  # 1
const MASK_SENSOR_DETECT: int = LAYER_BODIES  # 1
```

2. Update `EntityFactory`:
   - `create_physics_body()`: set layer 1, mask based on config
   - `create_area2d_entity()`: set layer 2 (sensor) or 4 (hitbox)

3. Update `_hit_test()` to use `MASK_HIT_TEST`

**Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `slopcade-game-engine`, `slopcade-godot-bridge`

**Dependencies**: Task 3
**Blocks**: Task 5

**Acceptance Criteria**:
- [ ] CollisionLayers.gd exists with constants
- [ ] EntityFactory uses constants
- [ ] Physics objects collide correctly
- [ ] Hitboxes don't affect physics
- [ ] Sensors detect body overlaps
- [ ] Run regression checklist (Task 1)

---

#### Task 5: Remove Old Layer/Mask Conventions

**Description**: Delete any legacy collision layer logic.

**What to do**:
- Remove ad-hoc layer/mask manipulation outside creation paths
- Search: `collision_layer =` and `collision_mask =` outside EntityFactory
- Ensure layers set only in EntityFactory using CollisionLayers constants

**Agent Profile**:
- **Category**: `quick`
- **Skills**: `git-master`

**Dependencies**: Task 4
**Blocks**: Wave 2

**Acceptance Criteria**:
- [ ] Only one documented layer convention exists
- [ ] No competing bitmasks remain
- [ ] `pnpm tsc --noEmit` passes (Wave 1 gate)
- [ ] Regression checklist passes (Wave 1 gate)

---

### Wave 2: Schema + Factory

#### Task 6: Define Clean TypeScript Schema

**Description**: Update shared types for body/sensor/hitbox.

**What to do**:
- Update `@slopcade/shared` types to represent:
  - `collider` (shape config)
  - Exactly one of: `body | sensor | hitbox` (or none for visual-only)
- Add normalizer for legacy game specs
- Update `ballSort/game.ts` to use `hitbox` archetype

```typescript
// New archetype union
type EntityArchetype = 
  | { type: 'body'; bodyType: 'dynamic' | 'static' | 'kinematic' }
  | { type: 'sensor' }
  | { type: 'hitbox' }
  | { type: 'visual' };

// Cannot have both sensor and body
interface EntityTemplate {
  archetype?: EntityArchetype;  // Explicit archetype
  // Old fields deprecated but still work via normalizer
}
```

**Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `slopcade-game-engine`

**Dependencies**: Wave 1 complete
**Blocks**: Task 7

**Acceptance Criteria**:
- [ ] New schema exists with explicit archetypes
- [ ] Cannot set both `sensor` and `body`
- [ ] `pnpm tsc --noEmit` passes

---

#### Task 7: Create EntityRecord Class (Expanded)

**Description**: Single data structure for entity tracking with all required fields.

**What to do**:
Create `godot_project/scripts/entity/EntityRecord.gd`:

```gdscript
class_name EntityRecord extends RefCounted

# Core fields
var entity_id: String
var node: Node2D
var archetype: String  # "body", "sensor", "hitbox", "visual"
var template: String
var tags: Array[String]
var group: String
var user_data: Dictionary

# From sensor_velocities
var velocity: Vector2 = Vector2.ZERO

# For dynamic images (from _texture_cache)
var texture_ref: String = ""

# For entity audio
var audio_refs: Array[String] = []

# Safety helper
func is_valid() -> bool:
    return node != null and is_instance_valid(node)

func _init(id: String, n: Node2D, arch: String):
    entity_id = id
    node = n
    archetype = arch
```

**Agent Profile**:
- **Category**: `quick`
- **Skills**: `slopcade-game-engine`

**Dependencies**: Task 6
**Blocks**: Task 10

**Acceptance Criteria**:
- [ ] EntityRecord class exists
- [ ] Contains: entity_id, node, archetype, template, tags, group, user_data
- [ ] Contains: velocity (for sensors)
- [ ] Contains: texture_ref, audio_refs
- [ ] Has `is_valid()` safety method

---

#### Task 10: Implement EntityFactory.create()

**Description**: Single decision point for node creation with archetype routing.

**What to do**:
1. Ensure all creation routes through `EntityFactory.create(config)`
2. Implement archetype routing:
   - `body.dynamic` → `RigidBody2D`
   - `body.static` → `StaticBody2D`
   - `body.kinematic` → `CharacterBody2D`
   - `sensor` → `Area2D` (layer 2)
   - `hitbox` → `Area2D` (layer 4)
   - `visual` → `Node2D`
3. Unified collider creation (no separate fixture step)
4. Return `EntityRecord` from create

**Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: `slopcade-game-engine`, `slopcade-godot-bridge`

**Dependencies**: Task 7
**Blocks**: Task 11

**Acceptance Criteria**:
- [ ] All entity creation uses `EntityFactory.create()`
- [ ] Archetype routing works correctly
- [ ] Kinematic → CharacterBody2D (not StaticBody2D)
- [ ] Returns EntityRecord
- [ ] No separate fixture/collider step

---

#### Task 11: Migrate All Creation Callers

**Description**: Update all code that creates entities.

**What to do**:
1. Use `lsp_find_references` on each legacy creation method
2. Document all callsites before changing
3. Update in dependency order (leaf functions first)
4. Update to use `EntityFactory.create(config)`
5. Ensure config dict has proper archetype

**Files to check** (from inventory):
- GameBridge.gd
- JSBridge.gd
- DebugLifecycle.gd
- Any game-specific spawn code

**Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `slopcade-game-engine`

**Dependencies**: Task 10
**Blocks**: Task 12

**Acceptance Criteria**:
- [ ] All callsites documented
- [ ] No direct calls to legacy methods
- [ ] All creation goes through factory

---

#### Task 12: Delete Legacy Creation Methods

**Description**: Remove all old entity creation APIs.

**What to delete**:
- `_create_entity` (if still exists)
- `_js_create_body` (GameBridge.gd:2980)
- `_js_add_fixture` (GameBridge.gd:3030)
- `_create_sensor_entity`
- `_create_physics_body` (move logic to factory if needed)
- `set_sensor()` function

**Agent Profile**:
- **Category**: `quick`
- **Skills**: `git-master`

**Dependencies**: Task 11
**Blocks**: Task 13

**Acceptance Criteria**:
- [ ] Only `EntityFactory.create()` exists
- [ ] Old methods deleted
- [ ] Games still work

---

#### Task 13: Delete Deprecated Zone Code

**Description**: Remove all zone-related code.

**What to delete**:
- `create_zone_entity()` in EntityFactory.gd
- `createZoneArea()` in EntityManager.ts
- `zones` Map in EntityManager.ts
- `getZone()`, `getAllZones()` in EntityManager.ts
- `ZoneComponent`, `ZoneEntityDefinition` in shared/types/physics.ts
- Any `type === 'zone'` checks

**Agent Profile**:
- **Category**: `quick`
- **Skills**: `git-master`

**Dependencies**: Task 12
**Blocks**: Wave 3

**Acceptance Criteria**:
- [ ] No zone code remains
- [ ] Grep confirms removal
- [ ] `pnpm tsc --noEmit` passes (Wave 2 gate)
- [ ] Regression checklist passes (Wave 2 gate)

---

### Wave 3: Registry Migration

**Note**: Task 8 is split into 5 subtasks for safer incremental migration.

#### Task 8a: Migrate `entities` Dictionary

**Description**: Migrate the most common dictionary first.

**What to do**:
1. Create `entity_registry: Dictionary` in EntityManager or GameBridge
2. When creating entity, add to registry: `entity_registry[id] = record`
3. Replace all `entities[id]` with `get_record(id).node`
4. Keep `entities` dict temporarily as backup (delete in Task 9)

**Files affected** (from inventory): ~15 files reference `entities[`

**Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `slopcade-game-engine`

**Dependencies**: Wave 2 complete
**Blocks**: Task 8b

**Acceptance Criteria**:
- [ ] entity_registry exists
- [ ] All `entities[id]` replaced with registry lookup
- [ ] Ball Sort + Slopeggle still work

---

#### Task 8b: Migrate `sensors` and `sensor_velocities`

**Description**: Migrate sensor-specific tracking.

**What to do**:
1. When creating sensor, set `record.archetype = "sensor"`
2. Replace `sensors[id]` with `get_record(id).node` where `archetype == "sensor"`
3. Replace `sensor_velocities[id]` with `get_record(id).velocity`
4. Update velocity update code to use registry

**Files affected**: ~5 files reference `sensors[` or `sensor_velocities`

**Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `slopcade-game-engine`

**Dependencies**: Task 8a
**Blocks**: Task 8c

**Acceptance Criteria**:
- [ ] All `sensors[id]` uses migrated
- [ ] All `sensor_velocities[id]` uses migrated
- [ ] Sensors still move correctly

---

#### Task 8c: Migrate `body_id_map` and `body_id_reverse`

**Description**: Eliminate body_id indirection.

**What to do**:
1. Find all uses of `body_id_map` and `body_id_reverse`
2. Replace body_id lookups with direct entity_id
3. Update JS bridge to use entity_id instead of body_id
4. Update collision callbacks to use entity_id

**Files affected**: ~10 files reference `body_id_map` or `body_id_reverse`

**Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: `slopcade-game-engine`

**Dependencies**: Task 8b
**Blocks**: Task 8d

**Acceptance Criteria**:
- [ ] No body_id lookups remain (except temporary compat)
- [ ] Entity_id used directly for identification
- [ ] Collisions still work

---

#### Task 8d: Migrate `collider_id_map` and `entity_shape_map`

**Description**: Simplify collider tracking.

**What to do**:
1. Find all uses of `collider_id_map` and `entity_shape_map`
2. Shapes are on the node itself - use `node.get_children()`
3. For sensor collision callbacks, use shape index on node
4. Remove need for separate collider_id tracking

**Files affected**: ~8 files reference `collider_id_map` or `entity_shape_map`

**Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `slopcade-game-engine`

**Dependencies**: Task 8c
**Blocks**: Task 8e

**Acceptance Criteria**:
- [ ] No collider_id_map lookups remain
- [ ] Sensor callbacks still work
- [ ] Shape information available from node

---

#### Task 8e: Migrate `user_data` and `body_groups`

**Description**: Move user data to EntityRecord.

**What to do**:
1. Replace `user_data[body_id]` with `get_record(entity_id).user_data`
2. Replace `body_groups[body_id]` with `get_record(entity_id).group`
3. Update set_user_data/get_user_data to use registry

**Files affected**: ~5 files reference `user_data` or `body_groups`

**Agent Profile**:
- **Category**: `quick`
- **Skills**: `slopcade-game-engine`

**Dependencies**: Task 8d
**Blocks**: Task 9

**Acceptance Criteria**:
- [ ] All user_data uses migrated
- [ ] All body_groups uses migrated
- [ ] User data still accessible via bridge

---

#### Task 9: Delete Old Dictionaries

**Description**: Remove legacy tracking from GameBridge.

**What to do**:
- Delete from GameBridge.gd lines 78-112:
  - `sensors`, `sensor_velocities`
  - `body_id_map`, `body_id_reverse`, `next_body_id`
  - `collider_id_map`, `next_collider_id`
  - `user_data`, `body_groups`
  - `entity_shape_map`
- Delete from `entities` dict (now using registry)
- Also delete from EntityFactory.gd and EntityManager.gd

**Agent Profile**:
- **Category**: `quick`
- **Skills**: `git-master`

**Dependencies**: Task 8e
**Blocks**: Wave 4

**Acceptance Criteria**:
- [ ] No legacy dictionaries remain
- [ ] Grep confirms removal
- [ ] `pnpm tsc --noEmit` passes (Wave 3 gate)
- [ ] Regression checklist passes (Wave 3 gate)

---

### Wave 4: Bridge + TypeScript

#### Task 14: Shrink GameBridge (Extract InputRouter)

**Description**: Make GameBridge a thin orchestrator.

**What to do**:
1. Create `godot_project/scripts/input/InputRouter.gd`
2. **InputRouter owns**:
   - Hit testing (`_hit_test`)
   - Drag state (`_is_dragging`, `_drag_entity_id`, `_drag_start_pos`, `_drag_start_time`)
   - Tap detection (duration/distance thresholds)
   - Input event creation
3. **GameBridge keeps**:
   - Event queue (`_queue_event`, `_event_queue`)
   - JS bridge notifications (`_notify_js_input_event`)
   - Coordinate conversion (`game_to_godot_pos`)
4. Interface: `InputRouter.process_input(type, x, y) -> InputEvent`

**Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `slopcade-game-engine`, `slopcade-godot-bridge`

**Dependencies**: Wave 3 complete
**Blocks**: Task 15

**Acceptance Criteria**:
- [ ] InputRouter.gd exists
- [ ] GameBridge.gd significantly smaller
- [ ] InputRouter handles all hit testing and drag state
- [ ] Input behavior unchanged

---

#### Task 15: Remove Box2D Types from TypeScript

**Description**: Eliminate Box2D terminology.

**What to do**:
- In `app/lib/physics2d/types.ts`:
  - Delete `BodyId`, `ColliderId` wrapper types
  - Rename `FixtureDef` → `ColliderConfig` or delete
  - Delete `createBodyId()`, `createColliderId()`
- In `app/lib/game-engine/types.ts`:
  - Change `bodyId: BodyId | null` → use entity_id
  - Remove `colliderId`
- Update all imports/usages

**Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `slopcade-game-engine`

**Dependencies**: Task 14
**Blocks**: Task 16

**Acceptance Criteria**:
- [ ] No Box2D terminology in types
- [ ] No BodyId/ColliderId wrapper types
- [ ] `pnpm tsc --noEmit` passes

---

#### Task 16: Unify Native/Web Bridge (With Diff Analysis)

**Description**: Eliminate bridge divergence.

**What to do**:
1. First, create diff analysis:
```bash
diff -u app/lib/godot/GodotBridge.native.ts app/lib/godot/GodotBridge.web.ts > bridge-diff.txt
```

2. Identify truly shared logic:
   - `isLoaded` property getter
   - `currentGameState` type
   - `handleGameStateUpdate` logic

3. Identify platform-specific (DO NOT UNIFY):
   - Initialization
   - Message passing mechanism
   - Cleanup

4. Create base class with ONLY shared logic

**Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `slopcade-game-engine`

**Dependencies**: Task 15
**Blocks**: Task 17

**Acceptance Criteria**:
- [ ] bridge-diff.txt created and reviewed
- [ ] ~80-100 lines of duplicate code removed
- [ ] Both bridges share common base
- [ ] Both platforms work correctly
- [ ] Platform-specific code NOT broken

---

#### Task 17: Remove Geometric Fallback

**Description**: TypeScript should only use Godot hit-testing.

**What to do**:
- In `useGameInput.ts`:
  - Remove `isPointInCollider()` fallback
  - Remove geometric fallback loop
  - Keep only `queryPointEntity()` path
- Ensure Godot `_hit_test()` finds Area2D (hitbox) entities

**Agent Profile**:
- **Category**: `quick`
- **Skills**: `slopcade-game-engine`

**Dependencies**: Task 16
**Blocks**: Wave 5

**Acceptance Criteria**:
- [ ] No geometric fallback code
- [ ] All hit-testing via Godot
- [ ] Ball Sort tubes still tappable
- [ ] `pnpm tsc --noEmit` passes (Wave 4 gate)
- [ ] Regression checklist passes (Wave 4 gate)

---

### Wave 5: Final Verification

#### Task 18: Run Verification Commands

**Description**: Automated verification.

**Commands**:
```bash
pnpm tsc --noEmit     # TypeScript type check
pnpm test             # All tests pass
pnpm build            # Build succeeds
```

**Agent Profile**:
- **Category**: `quick`
- **Skills**: `verification-before-completion`

**Dependencies**: Wave 4 complete
**Blocks**: Task 18b

**Acceptance Criteria**:
- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes

---

#### Task 18b: Performance Benchmark Comparison

**Description**: Verify no performance regression.

**What to do**:
1. Measure frame time with Ball Sort (10 sec average)
2. Measure frame time with Slopeggle (10 sec average)
3. Compare to baseline from Task 0
4. Ensure no >10% regression

**Agent Profile**:
- **Category**: `quick`
- **Skills**: `slopcade-game-engine`

**Dependencies**: Task 18
**Blocks**: Task 19

**Acceptance Criteria**:
- [ ] Frame times measured
- [ ] No >10% regression from baseline
- [ ] If regression found, profile and fix

---

#### Task 19: Manual Regression Sweep

**Description**: Verify all games work on both platforms.

**What to verify** (from Task 1 checklist):
- Ball Sort: tap tubes work (pickup/drop balls)
- Slopeggle: tap physics objects work, collisions fire
- Sensor overlaps fire events
- Hitboxes don't affect physics
- **Web platform**: all above pass
- **Native platform**: all above pass

**Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `slopcade-game-engine`, `verification-before-completion`

**Dependencies**: Task 18b
**Blocks**: Task 20

**Acceptance Criteria**:
- [ ] All checklist items pass
- [ ] Web platform verified
- [ ] Native platform verified
- [ ] Evidence captured (screenshots)

---

#### Task 20: Documentation Updates

**Description**: Update docs to reflect new architecture.

**What to do**:
- Update `godot_project/README.md`:
  - Document EntityRecord
  - Document archetypes (body, sensor, hitbox, visual)
  - Document CollisionLayers
- Update `app/AGENTS.md`:
  - Remove Box2D terminology
  - Document new entity creation flow
- Delete or update `docs/physics-system-guide.md`:
  - Remove Box2D patterns
  - Document new hit-test priority

**Agent Profile**:
- **Category**: `writing`
- **Skills**: `slopcade-documentation`

**Dependencies**: Task 19
**Blocks**: Wave 6

**Acceptance Criteria**:
- [ ] Docs reflect new architecture
- [ ] No Box2D terminology in docs
- [ ] EntityRecord documented
- [ ] Archetype system documented

---

### Wave 6: Legacy Purge (CRITICAL - No Cruft Left Behind)

> **Purpose**: This is the "scorched earth" wave. After everything new is working and verified, we DELETE everything old. No legacy code survives. No "maybe we'll need this later." If it's not actively used by the new architecture, it dies.

#### Task 21: Dead Code Analysis

**Description**: Find ALL unused code across the entire codebase.

**What to do**:

1. **Godot dead code scan**:
```bash
# Find all function definitions
grep -rn "^func " godot_project/scripts/ > all-functions.txt

# For each function, check if it's called anywhere
# If not called → candidate for deletion
```

2. **Search for legacy patterns that MUST NOT exist**:
```bash
# These patterns should return ZERO results after cleanup
grep -rn "body_id_map\|body_id_reverse" godot_project/scripts/
grep -rn "collider_id_map\|next_collider_id" godot_project/scripts/
grep -rn "sensor_velocities" godot_project/scripts/
grep -rn "entity_shape_map" godot_project/scripts/
grep -rn "_js_create_body\|_js_add_fixture" godot_project/scripts/
grep -rn "_create_sensor_entity\|_create_physics_body" godot_project/scripts/
grep -rn "set_sensor" godot_project/scripts/
grep -rn "ZoneComponent\|create_zone" godot_project/scripts/
```

3. **TypeScript dead code scan**:
```bash
# Legacy patterns that MUST NOT exist
grep -rn "BodyId\|ColliderId" app/lib/
grep -rn "createBodyId\|createColliderId" app/lib/
grep -rn "addFixture\|FixtureDef" app/lib/
grep -rn "zones\s*=" app/lib/game-engine/
grep -rn "isPointInCollider" app/lib/
```

4. **Document everything found** in `.sisyphus/dead-code-inventory.md`

**Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: `slopcade-game-engine`, `systematic-debugging`

**Dependencies**: Task 20 (all new code working)
**Blocks**: Task 22

**Acceptance Criteria**:
- [ ] `dead-code-inventory.md` lists ALL legacy code found
- [ ] Every item categorized: DELETE, KEEP (with reason), or INVESTIGATE
- [ ] No "maybe later" items - decide now

---

#### Task 22: Delete Orphaned Godot Code

**Description**: Delete ALL orphaned functions, variables, and files from Godot.

**What to delete** (based on Task 21 inventory):

**GameBridge.gd - Remove if still present**:
- [ ] `_js_create_body()` function
- [ ] `_js_add_fixture()` function
- [ ] `_create_sensor_entity()` function
- [ ] `_create_physics_body()` function (unless moved to factory)
- [ ] `set_sensor()` function
- [ ] Any inline `intersect_point` queries (should only be in `_hit_test`)
- [ ] `get_body_ids()` function (legacy Box2D pattern)
- [ ] Any function with "body_id" in the name that's not in new architecture

**EntityFactory.gd - Remove if still present**:
- [ ] `create_zone_entity()` function
- [ ] Any `_body_id_map` / `_body_id_reverse` references
- [ ] Any standalone shape creation not used by `create()`

**Other files - Check and clean**:
- [ ] `EntityManager.gd` - any legacy tracking code
- [ ] `PhysicsQueries.gd` - any body_id based queries (should use entity_id)
- [ ] `EventEmitter.gd` - any body_id based events (should use entity_id)
- [ ] `JSBridge.gd` - any legacy bridge methods

**Files to potentially DELETE entirely**:
- [ ] Any `.gd` file that only contains legacy code
- [ ] Any backup/old files (e.g., `GameBridge.old.gd`)

**Agent Profile**:
- **Category**: `quick`
- **Skills**: `git-master`

**Dependencies**: Task 21
**Blocks**: Task 23

**Acceptance Criteria**:
- [ ] All items from dead-code-inventory.md marked DELETE are gone
- [ ] `pnpm tsc --noEmit` still passes
- [ ] Games still work (quick smoke test)

---

#### Task 23: Delete Legacy TypeScript Patterns

**Description**: Delete ALL legacy TypeScript code.

**What to delete**:

**physics2d/types.ts - Remove entirely or gut**:
- [ ] `BodyId` type and brand
- [ ] `ColliderId` type and brand
- [ ] `JointId` type and brand (if not used)
- [ ] `createBodyId()` function
- [ ] `createColliderId()` function
- [ ] `createJointId()` function (if not used)
- [ ] `FixtureDef` interface (replaced by ColliderConfig or removed)

**game-engine/types.ts - Clean**:
- [ ] `bodyId: BodyId | null` → remove or change to entity reference
- [ ] `colliderId: ColliderId | null` → remove entirely
- [ ] `zone?: ZoneComponent` → remove entirely

**game-engine/EntityManager.ts - Clean**:
- [ ] `zones` Map → remove
- [ ] `createZoneArea()` → remove
- [ ] `getZone()` / `getAllZones()` → remove
- [ ] `addFixture()` calls → remove
- [ ] Any `BodyId` / `ColliderId` usage → remove

**hooks/useGameInput.ts - Clean**:
- [ ] `isPointInCollider()` function → remove
- [ ] Geometric fallback loop → remove
- [ ] Any `bodyId` lookups → should be entity_id

**shared/types/physics.ts - Clean**:
- [ ] `ZoneComponent` interface → remove
- [ ] `ZoneEntityDefinition` type → remove
- [ ] Any deprecated interfaces

**GodotBridge files - Clean**:
- [ ] `body_id_reverse` property → remove
- [ ] `add_fixture` calls → remove
- [ ] Any body_id based methods → remove

**Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `slopcade-game-engine`

**Dependencies**: Task 22
**Blocks**: Task 24

**Acceptance Criteria**:
- [ ] Zero `BodyId` / `ColliderId` types remain
- [ ] Zero `createBodyId` / `createColliderId` calls remain
- [ ] Zero `addFixture` calls remain
- [ ] Zero `Zone` related code remains
- [ ] Zero `isPointInCollider` code remains
- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm test` passes

---

#### Task 24: Final Codebase Audit

**Description**: Prove the codebase is clean. Run comprehensive checks that MUST return zero results.

**What to do**:

1. **Run the "zero results" audit**:
```bash
#!/bin/bash
# .sisyphus/audit-legacy.sh
# ALL of these MUST return 0 results

echo "=== Auditing for legacy patterns ==="
FAILED=0

# Box2D patterns
if grep -rn "body_id_map\|body_id_reverse" godot_project/scripts/ 2>/dev/null | grep -v "^#"; then
    echo "FAIL: body_id_map/reverse found"
    FAILED=1
fi

if grep -rn "collider_id_map\|next_collider_id" godot_project/scripts/ 2>/dev/null | grep -v "^#"; then
    echo "FAIL: collider_id found"
    FAILED=1
fi

if grep -rn "_js_create_body\|_js_add_fixture" godot_project/scripts/ 2>/dev/null | grep -v "^#"; then
    echo "FAIL: legacy creation methods found"
    FAILED=1
fi

if grep -rn "BodyId\|ColliderId" app/lib/ --include="*.ts" 2>/dev/null | grep -v "^#" | grep -v ".test."; then
    echo "FAIL: Box2D types found in TypeScript"
    FAILED=1
fi

if grep -rn "createBodyId\|createColliderId" app/lib/ --include="*.ts" 2>/dev/null | grep -v "^#"; then
    echo "FAIL: Box2D factory functions found"
    FAILED=1
fi

if grep -rn "addFixture" app/lib/ --include="*.ts" 2>/dev/null | grep -v "^#" | grep -v ".test."; then
    echo "FAIL: addFixture calls found"
    FAILED=1
fi

if grep -rn "ZoneComponent\|create_zone\|createZone" app/lib/ --include="*.ts" 2>/dev/null | grep -v "^#"; then
    echo "FAIL: Zone code found"
    FAILED=1
fi

if grep -rn "isPointInCollider" app/lib/ --include="*.ts" 2>/dev/null | grep -v "^#"; then
    echo "FAIL: geometric fallback found"
    FAILED=1
fi

if [ $FAILED -eq 0 ]; then
    echo "=== AUDIT PASSED: No legacy patterns found ==="
else
    echo "=== AUDIT FAILED: Legacy patterns still exist ==="
    exit 1
fi
```

2. **Run final verification**:
```bash
pnpm tsc --noEmit
pnpm test
pnpm build
```

3. **Manual smoke test on both platforms**

4. **Create summary report**: `.sisyphus/cleanup-complete.md`
```markdown
# Cleanup Complete Report

## Date: YYYY-MM-DD

## Code Removed
- GameBridge.gd: reduced from 3900 to XXX lines
- Legacy dictionaries: 9 → 1 (entity_registry)
- Entity creation paths: 5 → 1 (EntityFactory.create)
- Hit-test implementations: 4 → 1 (_hit_test)
- Box2D types: X types removed
- Zone code: completely removed

## Verification
- [ ] pnpm tsc --noEmit: PASS
- [ ] pnpm test: PASS
- [ ] pnpm build: PASS
- [ ] audit-legacy.sh: PASS (zero legacy patterns)
- [ ] Ball Sort: PASS
- [ ] Slopeggle: PASS
- [ ] Web platform: PASS
- [ ] Native platform: PASS

## Final Line Counts
- GameBridge.gd: XXX lines (was 3900+)
- EntityFactory.gd: XXX lines
- EntityRecord.gd: XXX lines
- InputRouter.gd: XXX lines
```

**Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: `slopcade-game-engine`, `verification-before-completion`

**Dependencies**: Task 23
**Blocks**: None (FINAL TASK)

**Acceptance Criteria**:
- [ ] `audit-legacy.sh` returns exit code 0
- [ ] Zero legacy patterns found in codebase
- [ ] All verification commands pass
- [ ] Both platforms work
- [ ] `cleanup-complete.md` summary created
- [ ] GameBridge.gd is ~500 lines (not 3900+)

---

## Commit Strategy

Use atomic commits aligned to tasks:

```
# Wave 0
chore: baseline verification and inventory

# Wave 1
feat(godot): add _hit_test() with layer priority
test(godot): add automated hit-test tests
refactor(godot): route all input through _hit_test()
refactor(godot): delete duplicate hit-test code
feat(godot): add CollisionLayers constants
refactor(godot): apply collision layer convention
refactor(godot): remove legacy layer/mask code

# Wave 2
feat(types): add body/sensor/hitbox schema
feat(godot): add EntityRecord class
refactor(godot): unify entity creation via EntityFactory
refactor(godot): migrate creation callers to factory
refactor(godot): delete legacy creation methods
refactor(godot): delete deprecated zone code

# Wave 3
refactor(godot): migrate entities dict to registry
refactor(godot): migrate sensors to registry
refactor(godot): eliminate body_id indirection
refactor(godot): simplify collider tracking
refactor(godot): migrate user_data to registry
refactor(godot): delete legacy dictionaries

# Wave 4
refactor(godot): extract InputRouter from GameBridge
refactor(ts): remove Box2D types
refactor(ts): unify native/web bridge
refactor(ts): remove geometric hit fallback

# Wave 5
docs: update architecture documentation
```

---

## Success Criteria

### Code Quality
- [ ] GameBridge.gd reduced from 3900+ to ~500 lines
- [ ] Single `EntityFactory.create()` for all entity creation
- [ ] Single `entity_registry` for all tracking
- [ ] Single `_hit_test()` for all input detection
- [ ] No Box2D terminology (body_id, collider_id, fixture)
- [ ] No deprecated zone code
- [ ] No geometric fallback in TypeScript

### Verification
- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Automated hit-test tests pass
- [ ] No performance regression (>10%)
- [ ] Ball Sort works (tap detection)
- [ ] Slopeggle works (physics + tap)
- [ ] Both native and web platforms work

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing games | Regression checklist (Task 1), verify after each wave |
| Wave failure | Git branch per wave, tag after success, rollback strategy |
| Native/web divergence | Task 16 diff analysis, test both platforms at each gate |
| Missing edge cases | Task 0 thorough baseline, Task 19 manual sweep |
| Large Task 8 | Split into 5 subtasks with incremental verification |
| Performance regression | Task 18b benchmarks, compare to baseline |
| Concurrent modification | EntityRecord.is_valid() safety check |
