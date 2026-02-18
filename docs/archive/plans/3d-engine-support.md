# 3D Engine Support — Full Plan

## Goal

Enable the Slopcade game engine to build **native 3D games** — not just 2.5D overlays. A user (or AI) should be able to define a `GameDefinition` with `dimension: "3d"` and produce a fully playable 3D game with physics, camera control, first-person/third-person movement, lighting, materials, and mesh primitives. Target milestone: **build a simple voxel/Minecraft-style game**.

---

## Current State

### What Exists (2.5D Overlay)
- `Viewport3D.gd` — renders 3D content into a `SubViewport`, composited onto a 2D `Sprite2D`
- `GLBLoader.gd` — loads GLB/glTF models from URL or buffer
- Bridge methods: `show3DModel`, `create3DCube`, `create3DFloor`, camera position/look-at, orbit controls
- `Lab3D.tscn` — standalone test scene
- All 3D is purely visual — **no 3D physics, no 3D entities, no 3D scripting API**

### What Needs to Change
The current system renders 3D models as a visual overlay on a 2D game. For true 3D games, we need:
1. A **3D root scene** alternative to the 2D `Main.tscn`
2. **3D entity creation** (Node3D, RigidBody3D, StaticBody3D, Area3D)
3. **3D physics** (Godot's built-in Jolt or GodotPhysics 3D)
4. **3D script sandbox API** extending `SyncWorldOps` with Vec3 operations
5. **3D camera system** (first-person, third-person, orbit, fixed)
6. **3D input** (WASD movement, mouse look, virtual joystick for mobile)
7. **3D visuals** (mesh primitives, materials, lighting)
8. **GameDefinition schema** extensions for 3D

---

## Architecture Decision: Dual-Mode Engine

The engine will support **both 2D and 3D games** via a `dimension` flag on `GameDefinition`. This is NOT a migration — both modes coexist permanently.

```
GameDefinition.world.dimension = "2d" | "3d"   // default: "2d"
```

When `dimension: "3d"`:
- Root scene switches from `Node2D` hierarchy to `Node3D` hierarchy
- Entity factory creates 3D node types (RigidBody3D, StaticBody3D, etc.)
- Physics runs in 3D (Godot's native 3D physics)
- Camera is Camera3D with perspective/orthographic
- Coordinate system: right-handed, Y-up (Godot default)
- PPM concept doesn't apply — world units ARE meters (1 unit = 1 meter)

---

## Phase 1: Foundation — 3D Root Scene & Entity Factory

### 1.1 Godot: 3D Root Scene (`Main3D.tscn`)

Create a parallel root scene for 3D games:

```
Main3D (Node3D)
├── GameRoot3D (Node3D)          ← Entities spawn here
├── Camera3D                      ← Controlled by camera system
├── DirectionalLight3D            ← Default sun light
├── WorldEnvironment              ← Sky, ambient, fog
└── UILayer (CanvasLayer)         ← 2D overlay for HUD/UI
```

**Key files to create:**
- `godot_project/scenes/Main3D.tscn`
- `godot_project/scripts/Main3D.gd`

### 1.2 Godot: Scene Switcher in GameBridge

`GameBridge.gd` needs to detect `dimension: "3d"` when loading a game and switch to the 3D root:

```gdscript
func _load_game_internal(game_data: Dictionary) -> void:
    var world = game_data.get("world", {})
    var dimension = world.get("dimension", "2d")
    
    if dimension == "3d":
        _setup_3d_root(game_data)
    else:
        _setup_2d_root(game_data)  # existing behavior
```

### 1.3 Godot: 3D Entity Factory (`EntityFactory3D.gd`)

Parallel to the existing `EntityFactory.gd` but creates 3D nodes:

| 2D | 3D Equivalent |
|----|---------------|
| `RigidBody2D` | `RigidBody3D` |
| `StaticBody2D` | `StaticBody3D` |
| `CharacterBody2D` | `CharacterBody3D` |
| `Area2D` | `Area3D` |
| `CollisionShape2D` | `CollisionShape3D` |
| `Sprite2D` | `MeshInstance3D` |

**Key file to create:**
- `godot_project/scripts/entity/EntityFactory3D.gd`

### 1.4 Godot: 3D Coordinate Utils

3D games use direct world units (no PPM conversion, no Y-flip):

```gdscript
class_name CoordinateUtils3D

static func game_to_godot_pos(game_pos: Vector3) -> Vector3:
    # Y-up is already Godot convention
    return game_pos

static func game_to_godot_rot(euler_deg: Vector3) -> Vector3:
    return Vector3(deg_to_rad(euler_deg.x), deg_to_rad(euler_deg.y), deg_to_rad(euler_deg.z))
```

---

## Phase 2: Type System — 3D Types in `shared/`

### 2.1 Common Types (`shared/src/types/common.ts`)

```typescript
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}
```

### 2.2 3D Transform (`shared/src/types/entity.ts`)

```typescript
export interface TransformComponent3D {
  x: number;
  y: number;
  z: number;
  rotationX: number;  // Euler degrees
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}
```

### 2.3 3D Physics (`shared/src/types/physics.ts`)

```typescript
export interface PhysicsComponent3D {
  bodyType: PhysicsBodyType;  // reuse 'static' | 'dynamic' | 'kinematic'
  mass?: number;
  gravityScale?: number;
  linearDamping?: number;
  angularDamping?: number;
  freezeRotationX?: boolean;
  freezeRotationY?: boolean;
  freezeRotationZ?: boolean;
  ccd?: boolean;
  initialVelocity?: Vec3;
  initialAngularVelocity?: Vec3;
}

export type ColliderShape3D = 'box' | 'sphere' | 'capsule' | 'cylinder' | 'mesh';

export interface BoxCollider3D { shape: 'box'; width: number; height: number; depth: number; }
export interface SphereCollider3D { shape: 'sphere'; radius: number; }
export interface CapsuleCollider3D { shape: 'capsule'; radius: number; height: number; }
export interface CylinderCollider3D { shape: 'cylinder'; radius: number; height: number; }

export type ColliderComponent3D =
  | BoxCollider3D
  | SphereCollider3D
  | CapsuleCollider3D
  | CylinderCollider3D;
```

### 2.4 3D Visuals (`shared/src/types/visual.ts`)

```typescript
export type VisualType3D = 'box' | 'sphere' | 'capsule' | 'cylinder' | 'plane' | 'mesh' | 'empty';

interface BaseVisualComponent3D {
  type: VisualType3D;
  visible?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export interface BoxVisualComponent3D extends BaseVisualComponent3D {
  type: 'box';
  width: number;
  height: number;
  depth: number;
  material?: MaterialConfig;
}

export interface SphereVisualComponent3D extends BaseVisualComponent3D {
  type: 'sphere';
  radius: number;
  material?: MaterialConfig;
}

export interface MeshVisualComponent3D extends BaseVisualComponent3D {
  type: 'mesh';
  meshUrl?: string;       // GLB/glTF URL
  meshAssetRef?: string;  // Asset system reference
  material?: MaterialConfig;
}

export interface MaterialConfig {
  color?: string;         // Hex color
  metallic?: number;      // 0-1
  roughness?: number;     // 0-1
  emission?: string;      // Hex color
  emissionStrength?: number;
  textureUrl?: string;
  textureAssetRef?: string;
  transparent?: boolean;
  opacity?: number;
}
```

### 2.5 3D Camera (`GameDefinition.ts`)

```typescript
export type CameraType3D = 'first-person' | 'third-person' | 'orbit' | 'fixed' | 'follow';

export interface CameraConfig3D {
  type: CameraType3D;
  projection?: 'perspective' | 'orthographic';
  fov?: number;           // degrees, default 70
  near?: number;          // default 0.1
  far?: number;           // default 1000
  followTarget?: string;  // entity ID
  followOffset?: Vec3;    // e.g. { x: 0, y: 5, z: -10 } for third-person
  followSmoothing?: number;
  lookAt?: Vec3;          // fixed camera look-at point
  position?: Vec3;        // fixed camera position
  mouseSensitivity?: number;  // for first-person
  orbitDistance?: number;
  orbitMinDistance?: number;
  orbitMaxDistance?: number;
  minPitch?: number;      // clamp vertical look (degrees)
  maxPitch?: number;
}
```

### 2.6 3D World Config (`GameDefinition.ts`)

```typescript
export interface WorldConfig3D {
  gravity: Vec3;          // default { x: 0, y: -9.8, z: 0 }
  bounds?: {
    width: number;
    height: number;
    depth: number;
  };
  skybox?: SkyboxConfig;
  fog?: FogConfig;
  ambientLight?: { color: string; energy: number; };
  directionalLight?: { color: string; energy: number; direction: Vec3; shadows?: boolean; };
}

export interface SkyboxConfig {
  type: 'color' | 'procedural' | 'hdri';
  color?: string;
  topColor?: string;     // procedural sky
  bottomColor?: string;
  horizonColor?: string;
  hdriUrl?: string;
}

export interface FogConfig {
  enabled: boolean;
  color?: string;
  density?: number;
  start?: number;
  end?: number;
}
```

### 2.7 3D Input Config

```typescript
export interface InputConfig3D {
  /** WASD + Space + Shift movement (auto-enabled for first-person/third-person cameras) */
  movement?: {
    enabled: boolean;
    speed?: number;
    sprintMultiplier?: number;
    jumpForce?: number;
  };
  /** Mouse look (auto-enabled for first-person cameras) */
  mouseLook?: {
    enabled: boolean;
    sensitivity?: number;
    invertY?: boolean;
  };
  /** Virtual joystick for mobile */
  virtualJoystick?: VirtualJoystick;
  virtualButtons?: VirtualButton[];
  /** Touch-look area for mobile (right half of screen) */
  touchLook?: {
    enabled: boolean;
    sensitivity?: number;
  };
}
```

### 2.8 Unified GameDefinition

```typescript
export interface GameDefinition {
  metadata: GameMetadata;
  world: WorldConfig | WorldConfig3D;    // discriminated by world.dimension
  // ... existing 2D fields ...
  
  // 3D-specific (only when world.dimension === '3d')
  camera3d?: CameraConfig3D;
  input3d?: InputConfig3D;
  // prefabs and entities already support both via union types
}

export interface WorldConfig {
  dimension?: '2d' | '3d';  // default '2d'
  gravity: Vec2;
  pixelsPerMeter: number;
  bounds?: { width: number; height: number; };
}

export interface WorldConfig3D {
  dimension: '3d';
  gravity: Vec3;
  bounds?: { width: number; height: number; depth: number; };
  skybox?: SkyboxConfig;
  fog?: FogConfig;
  ambientLight?: { color: string; energy: number; };
  directionalLight?: { color: string; energy: number; direction: Vec3; shadows?: boolean; };
}
```

---

## Phase 3: Script Sandbox — 3D WorldOps API

The script sandbox needs 3D equivalents of all current 2D operations. These will be exposed on the same `ctx` object when the game is 3D.

### 3.1 3D Transform Operations

```typescript
// In a 3D game, these replace their 2D equivalents on ctx:
getEntityPosition(id: string): Vec3 | null;
setEntityPosition(id: string, position: Vec3): void;
getEntityRotation(id: string): Vec3 | null;        // Euler degrees
setEntityRotation(id: string, rotation: Vec3): void;
getEntityScale(id: string): Vec3 | null;
setEntityScale(id: string, scale: Vec3): void;
```

### 3.2 3D Physics Operations

```typescript
getEntityVelocity(id: string): Vec3 | null;
setEntityVelocity(id: string, velocity: Vec3): void;
getEntityAngularVelocity(id: string): Vec3 | null;
setEntityAngularVelocity(id: string, velocity: Vec3): void;
applyImpulse(id: string, impulse: Vec3): void;
applyForce(id: string, force: Vec3): void;
applyTorque(id: string, torque: Vec3): void;
```

### 3.3 3D Queries

```typescript
raycast3D(from: Vec3, to: Vec3, opts?: RaycastOptions3D): WorldRaycastHit3D | null;
queryPoint3D(point: Vec3): string | null;
queryAABB3D(min: Vec3, max: Vec3): string[];
querySphere(center: Vec3, radius: number): string[];
```

### 3.4 3D Camera Script Control

```typescript
setCameraPosition(position: Vec3): void;
setCameraRotation(rotation: Vec3): void;
setCameraLookAt(target: Vec3): void;
setCameraFOV(fov: number): void;
setCameraTarget(entityId: string): void;
cameraShake3D(intensity: number, duration: number): void;
```

### 3.5 3D Entity Spawning

```typescript
// spawnEntity already works — just needs Vec3 position overload
spawnEntity(prefabId: string, position: Vec3, opts?: SpawnOptions3D): string | null;
```

### 3.6 3D-Specific Operations

```typescript
// Mesh/Material manipulation at runtime
setEntityMaterial(id: string, material: MaterialConfig): void;
setEntityColor(id: string, color: string): void;   // convenience shortcut

// Lighting
setDirectionalLight(config: { direction?: Vec3; color?: string; energy?: number }): void;
addPointLight(position: Vec3, config?: { color?: string; energy?: number; range?: number }): string;
removePointLight(id: string): void;

// Environment
setFog(config: FogConfig): void;
setSkybox(config: SkyboxConfig): void;
```

### 3.7 3D Math Utilities on `ctx`

```typescript
// Already have 2D versions, need 3D:
vec3(x: number, y: number, z: number): Vec3;
addVec3(a: Vec3, b: Vec3): Vec3;
subVec3(a: Vec3, b: Vec3): Vec3;
scaleVec3(v: Vec3, s: number): Vec3;
normalizeVec3(v: Vec3): Vec3;
dotVec3(a: Vec3, b: Vec3): number;
crossVec3(a: Vec3, b: Vec3): Vec3;
lengthVec3(v: Vec3): number;
distance3D(a: Vec3, b: Vec3): number;
lerpVec3(a: Vec3, b: Vec3, t: number): Vec3;
```

---

## Phase 4: Bridge — 3D Method Registration

### 4.1 New GDScript Bridge Module (`EntityManager3D.gd`)

Handles the Godot-side implementation of 3D world ops. Follows the same `_js_` prefix pattern:

```gdscript
# Entity creation
func _js_spawn_entity_3d(args: Array) -> Variant
func _js_destroy_entity(args: Array) -> void     # same as 2D

# Transform
func _js_set_entity_position_3d(args: Array) -> void
func _js_get_entity_position_3d(args: Array) -> Variant
func _js_set_entity_rotation_3d(args: Array) -> void
func _js_set_entity_scale_3d(args: Array) -> void

# Physics
func _js_set_entity_velocity_3d(args: Array) -> void
func _js_apply_impulse_3d(args: Array) -> void
func _js_apply_force_3d(args: Array) -> void

# Camera
func _js_set_camera_position_3d(args: Array) -> void
func _js_set_camera_look_at_3d(args: Array) -> void
func _js_set_camera_fov(args: Array) -> void

# Materials
func _js_set_entity_material(args: Array) -> void
func _js_set_entity_color_3d(args: Array) -> void

# Lighting
func _js_set_directional_light(args: Array) -> void
func _js_add_point_light(args: Array) -> void

# Queries
func _js_raycast_3d(args: Array) -> Variant
func _js_query_sphere(args: Array) -> Variant
```

### 4.2 TypeScript Bridge Types (`app/lib/godot/types.ts`)

Add all 3D methods to the bridge type definitions, then run `pnpm generate:bridge`.

---

## Phase 5: Camera & Input Systems

### 5.1 3D Camera Controller (`Camera3DController.gd`)

```gdscript
class_name Camera3DController extends Node

var camera: Camera3D
var mode: String = "fixed"  # first-person, third-person, orbit, fixed, follow
var target_entity: Node3D = null

# First-person
var mouse_sensitivity: float = 0.3
var pitch: float = 0.0
var yaw: float = 0.0

# Third-person
var follow_offset: Vector3 = Vector3(0, 5, -10)
var follow_smoothing: float = 5.0

# Orbit
var orbit_distance: float = 10.0

func _process(delta):
    match mode:
        "first-person": _update_first_person(delta)
        "third-person": _update_third_person(delta)
        "orbit": _update_orbit(delta)
        "follow": _update_follow(delta)
```

### 5.2 3D Movement Controller (`MovementController3D.gd`)

Attaches to the player entity for WASD/joystick movement:

```gdscript
class_name MovementController3D extends Node

var body: CharacterBody3D
var speed: float = 5.0
var sprint_multiplier: float = 1.5
var jump_force: float = 5.0
var camera: Camera3D

func _physics_process(delta):
    var input_dir = Vector2.ZERO
    # Keyboard
    if Input.is_action_pressed("move_forward"): input_dir.y += 1
    if Input.is_action_pressed("move_back"): input_dir.y -= 1
    if Input.is_action_pressed("move_left"): input_dir.x -= 1
    if Input.is_action_pressed("move_right"): input_dir.x += 1
    
    # Virtual joystick (from bridge)
    input_dir += _virtual_joystick_dir
    
    # Transform to camera-relative direction
    var direction = (camera.global_transform.basis * Vector3(input_dir.x, 0, -input_dir.y)).normalized()
    direction.y = 0  # Stay on XZ plane
    
    body.velocity.x = direction.x * speed
    body.velocity.z = direction.z * speed
    
    # Gravity
    if not body.is_on_floor():
        body.velocity.y -= 9.8 * delta
    
    # Jump
    if Input.is_action_just_pressed("jump") and body.is_on_floor():
        body.velocity.y = jump_force
    
    body.move_and_slide()
```

### 5.3 Input Actions

Register Godot input actions for 3D:
- `move_forward` (W), `move_back` (S), `move_left` (A), `move_right` (D)
- `jump` (Space), `sprint` (Shift)
- Mouse motion for camera look

These need to be registered in `project.godot` or via code.

### 5.4 Mobile Virtual Controls

Reuse existing `VirtualJoystick` and `VirtualButton` overlay but wire to 3D movement:
- Left side: virtual joystick → WASD equivalent
- Right side: touch-look area → mouse look equivalent
- Jump button → jump action

---

## Phase 6: Voxel-Specific Features

For the initial Minecraft-style target:

### 6.1 Batch Cube Creation

High-performance bridge method for creating many cubes at once:

```gdscript
func _js_create_voxel_batch(args: Array) -> void:
    # args[0] = JSON array of {x, y, z, color} objects
    # Use MultiMeshInstance3D for performance
    var multi_mesh = MultiMesh.new()
    multi_mesh.transform_format = MultiMesh.TRANSFORM_3D
    multi_mesh.mesh = box_mesh  # shared BoxMesh
    multi_mesh.instance_count = voxel_count
    # Set per-instance transforms and colors
```

### 6.2 Chunk System (Script-Level)

Voxel worlds are managed by game scripts, not the engine. The engine provides:
- Batch mesh creation/destruction
- MultiMesh for instanced rendering
- Material atlas support

The game script manages:
- Chunk loading/unloading
- Voxel data storage
- Block placement/removal

### 6.3 Script API for Voxels

```typescript
// Batch operations for performance
createVoxelBatch(voxels: Array<{ x: number; y: number; z: number; color: string }>): string;
updateVoxelBatch(batchId: string, voxels: Array<{ x: number; y: number; z: number; color: string }>): void;
destroyVoxelBatch(batchId: string): void;

// Single voxel (for interactive placement)
placeVoxel(x: number, y: number, z: number, color: string): void;
removeVoxel(x: number, y: number, z: number): void;
```

---

## Phase 7: AI Game Generation Integration

### 7.1 Prompt Classification

Update the AI game generation pipeline to detect 3D game requests:
- Keywords: "3D", "voxel", "minecraft", "first-person", "third-person", "walk around", "3D world"
- Set `world.dimension: "3d"` in generated GameDefinition

### 7.2 3D Game Templates

Create template game definitions for common 3D patterns:
- **Voxel Builder**: Flat world, first-person camera, block placement
- **Third-Person Platformer**: Platform entities, follow camera, jump mechanics
- **Maze/Dungeon**: Walls from box entities, first-person, key/door mechanics

---

## Implementation Order

| Order | Phase | Effort | Description |
|-------|-------|--------|-------------|
| 1 | 2.1-2.2 | S | Add `Vec3`, `Quaternion`, `TransformComponent3D` types |
| 2 | 1.1-1.2 | M | Create `Main3D.tscn` and scene switching in GameBridge |
| 3 | 2.3-2.4 | M | Add 3D physics, collider, visual types |
| 4 | 1.3 | L | Build `EntityFactory3D.gd` |
| 5 | 4.1-4.2 | L | Bridge methods for 3D entity ops |
| 6 | 2.5-2.7 | M | 3D camera, world, and input config types |
| 7 | 5.1-5.4 | L | Camera controller + movement controller + input actions |
| 8 | 3.1-3.7 | L | Script sandbox 3D WorldOps |
| 9 | 6.1-6.3 | M | Voxel batch rendering |
| 10 | 2.8 | S | Unified GameDefinition with dimension flag |
| 11 | 7.1-7.2 | M | AI generation integration |

**Total estimated effort**: ~3-4 weeks of focused work

---

## Key Design Decisions

1. **Dual-mode, not migration**: 2D games are unaffected. The `dimension` flag cleanly separates codepaths.
2. **Same script interface shape**: `ctx.setEntityPosition()` works in both 2D and 3D — it just takes `Vec2` or `Vec3`. Scripts written for 3D use the same lifecycle hooks (`onStart`, `onUpdate`, `onInput`, `onCollision`).
3. **No PPM in 3D**: 1 world unit = 1 meter. Simpler coordinate math.
4. **CharacterBody3D for player**: Not RigidBody3D. CharacterBody3D gives us `move_and_slide()` which is essential for responsive FPS/TPS movement.
5. **MultiMesh for voxels**: Not individual MeshInstance3D per cube. MultiMesh handles thousands of instances efficiently.
6. **Existing overlay system preserved**: The 2.5D `Viewport3D.gd` still works for 2D games that want a 3D visual layer. This plan adds a separate full-3D path.

---

## Files to Create

| File | Purpose |
|------|---------|
| `godot_project/scenes/Main3D.tscn` | 3D root scene |
| `godot_project/scripts/Main3D.gd` | 3D root scene script |
| `godot_project/scripts/entity/EntityFactory3D.gd` | 3D entity creation |
| `godot_project/scripts/entity/EntityManager3D.gd` | 3D bridge methods |
| `godot_project/scripts/camera/Camera3DController.gd` | Camera modes |
| `godot_project/scripts/input/MovementController3D.gd` | WASD + jump |
| `godot_project/scripts/3d/VoxelSystem.gd` | MultiMesh voxel rendering |
| `godot_project/scripts/3d/LightingSystem3D.gd` | Light management |
| `godot_project/scripts/3d/MaterialSystem3D.gd` | Material creation/caching |
| `godot_project/scripts/constants/CoordinateUtils3D.gd` | 3D coord helpers |
| `shared/src/types/types3d.ts` | All 3D type definitions |
| `shared/src/types/sync-world-ops-3d.ts` | 3D script API interface |

## Files to Modify

| File | Change |
|------|--------|
| `shared/src/types/common.ts` | Add `Vec3`, `Quaternion` |
| `shared/src/types/GameDefinition.ts` | Add `dimension`, `camera3d`, `input3d`, `WorldConfig3D` |
| `shared/src/types/entity.ts` | Add `TransformComponent3D`, 3D prefab support |
| `shared/src/types/physics.ts` | Add 3D collider types |
| `shared/src/types/visual.ts` | Add 3D visual types |
| `godot_project/scripts/GameBridge.gd` | Scene switching, 3D module registration |
| `godot_project/project.godot` | Input action mappings for WASD |
| `app/lib/godot/types.ts` | 3D bridge method types |
