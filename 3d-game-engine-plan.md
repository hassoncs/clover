# 3D Game Engine Architecture Plan

> Design for extending the Slopcade game engine to support 3D scenes — world configuration, entity system, physics, camera, visual rendering, joints, scripting extensions, and Godot bridge integration.
>
> **Companion document**: [UI Overlay System Plan](./ui-overlay-system-plan.md) covers the unified HUD/overlay layer that works for both 2D and 3D games.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Current System Summary](#2-current-system-summary)
3. [Target Architecture](#3-target-architecture)
4. [Type System Changes](#4-type-system-changes)
5. [World3D Configuration](#5-world3d-configuration)
6. [3D Entity System](#6-3d-entity-system)
7. [3D Visual System](#7-3d-visual-system)
8. [3D Physics Integration](#8-3d-physics-integration)
9. [3D Camera System](#9-3d-camera-system)
10. [3D Joints](#10-3d-joints)
11. [Scripting API Extensions](#11-scripting-api-extensions)
12. [Rules System Compatibility](#12-rules-system-compatibility)
13. [Godot Bridge Changes](#13-godot-bridge-changes)
14. [React Native Integration](#14-react-native-integration)
15. [Asset Pipeline Extensions](#15-asset-pipeline-extensions)
16. [AI Generation Considerations](#16-ai-generation-considerations)
17. [Phased Implementation Plan](#17-phased-implementation-plan)
18. [Risk Assessment](#18-risk-assessment)
19. [Open Questions](#19-open-questions)

---

## 1. Design Philosophy

### Core Principle: Follow Godot's Architecture

Godot's model is straightforward: every scene has a root node type that determines its coordinate system. `Node3D` = 3D world with 3D physics. `Node2D` = 2D world with 2D physics. You never mix them as siblings. `CanvasLayer` draws 2D on top of either (see the [UI Overlay Plan](./ui-overlay-system-plan.md)).

```
Viewport (2D game)                  Viewport (3D game)
└── Node2D (2D world)               ├── Node3D (3D world)
    ├── Camera2D                     │   ├── Camera3D
    ├── RigidBody2D (ball)           │   ├── RigidBody3D (player)
    ├── StaticBody2D (wall)          │   ├── StaticBody3D (wall)
    └── CanvasLayer (HUD)            │   └── MeshInstance3D (floor)
        ├── ScoreLabel               └── CanvasLayer (HUD)
        └── PauseButton                  ├── ScoreLabel
                                         └── HealthBar
```

### Design Constraints

| Constraint | Rationale |
|-----------|-----------|
| **No 2D/3D physics mixing** | Different coordinate systems, different physics engines |
| **A scene IS one type** | `sceneType: "2d"` or `"3d"` — engine routes to the correct runtime |
| **Shared rules/scripts** | The logic layer is coordinate-agnostic where possible |
| **Existing 2D untouched** | 100% backward compatible — all existing games work as-is |
| **AI-friendly** | One decision per game: 2D or 3D. Everything else follows patterns |

---

## 2. Current System Summary

### Architecture Stack

```
React Native (UI, Game Shell)
        ↓
GodotBridge (TypeScript)     ← lib/godot/GodotBridge.{web,native}.ts
        ↓
GameBridge.gd (GDScript)     ← Autoload singleton in Godot
        ↓
EntityFactory.gd             ← Creates Node2D bodies from GameDefinition JSON
EntityManager.gd             ← Entity lifecycle management
VisualRenderer.gd            ← Sprite2D / shape rendering
CollisionSystem.gd           ← Physics collision event routing
WorldSystem.gd               ← 2D gravity, bounds setup
CameraController.gd          ← Camera2D management
```

### Current Types (Key Interfaces)

```typescript
interface Vec2 { x: number; y: number; }
interface TransformComponent { x: number; y: number; angle: number; scaleX: number; scaleY: number; }
type VisualType = 'rect' | 'circle' | 'polygon' | 'image' | 'text';
type PhysicsBodyType = 'static' | 'dynamic' | 'kinematic';
type ColliderShape = 'box' | 'circle' | 'polygon' | 'capsule';
```

### Existing 3D Foundation

`Viewport3D.gd` already exists at `godot_project/scripts/3d/Viewport3D.gd`:
- Creates a `SubViewport` with `Camera3D`, `DirectionalLight3D`, `WorldEnvironment`
- Loads GLB models via `GLBLoader`
- Creates floors (`PlaneMesh`) and cubes (`BoxMesh`) with `StandardMaterial3D`
- Renders to a `Sprite2D` texture overlaid on the 2D scene
- Wired into `GameBridge.gd` via `create_3d_cube`, `create_3d_floor`, `show_3d_model_from_url`

This is a solid viewer foundation but has **no physics, no entity lifecycle, and no rules/scripting integration**.

### Game System Runner

The `GameSystemRunner` processes phases per frame:

```
PRE_UPDATE → GAME_LOGIC → PHYSICS → POST_PHYSICS → VISUAL → CLEANUP
```

Systems register for a phase and receive `UpdateContext`. This runner is **3D-agnostic** — it orchestrates systems; the 3D-specific behavior lives in the system implementations.

---

## 3. Target Architecture

```
                    GameDefinition (JSON)
                           │
                    ┌──────┴──────┐
                    │  sceneType   │
                    │  "2d" / "3d" │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
        sceneType: "2d"           sceneType: "3d"
              │                         │
    ┌─────────▼─────────┐    ┌─────────▼─────────┐
    │  Existing Runtime  │    │  New 3D Runtime    │
    │  (GameSystemRunner │    │  (GameSystemRunner │
    │   + 2D systems)    │    │   + 3D systems)    │
    └─────────┬─────────┘    └─────────┬─────────┘
              │                         │
    ┌─────────▼─────────┐    ┌─────────▼─────────┐
    │  GodotBridge (2D)  │    │  GodotBridge (3D)  │
    │  Node2D world      │    │  Node3D world      │
    └───────────────────┘    └───────────────────┘
```

### Shared vs. Split Components

| Component | Shared? | Notes |
|-----------|---------|-------|
| Rules Engine | **Yes** | Coordinate-agnostic (tag-based triggers) |
| Scripting (QuickJS) | **Yes** | Abstract API, Vec3-aware in 3D context |
| Event System | **Yes** | String event names, no coordinates |
| State Machines | **Yes** | |
| Variables / Expressions | **Yes** | |
| Input Processing | **Yes** | Screen-space; 3D adds raycast for world mapping |
| Containers | **Yes** | Logical, not spatial |
| Entity Factory | **No** | Node2D vs Node3D creation |
| Physics | **No** | Rapier2D vs GodotPhysics3D |
| Camera | **No** | Camera2D vs Camera3D |
| Visual Renderer | **No** | Sprite2D/shapes vs Mesh/Voxels/GLB |
| World Setup | **No** | 2D bounds vs 3D floor/sky/lighting |
| Collision Shapes | **No** | 2D shapes vs 3D shapes |

---

## 4. Type System Changes

### Strategy: Parallel Fields with Scene-Level Discriminant

A new `sceneType` field on `GameDefinition` determines the runtime path. 3D-specific fields live alongside 2D fields as separate optional properties. Zero changes to existing fields.

```typescript
// shared/src/types/GameDefinition.ts — additions only

interface GameDefinition {
  // ... all existing fields unchanged ...

  /**
   * Determines coordinate system, physics engine, and rendering pipeline.
   * Default: "2d" when omitted (backward compatible).
   */
  sceneType?: '2d' | '3d';

  // 3D fields (used when sceneType is '3d')
  world3d?: World3DConfig;
  camera3d?: Camera3DConfig;
  templates3d?: Record<string, EntityTemplate3D>;
  entities3d?: Entity3D[];
  joints3d?: Joint3D[];
}
```

**Why parallel fields instead of polymorphic `world`?**

1. **Backward compatibility**: Zero changes to existing games
2. **TypeScript clarity**: No discriminated unions at field level
3. **Validation simplicity**: `sceneType: "3d"` → require `world3d` + `entities3d`
4. **AI simplicity**: "Use `sceneType: '3d'` and fill in the 3D variants"

### New Type Files

```
shared/src/types/
├── common.ts          ← Add Vec3 here (alongside existing Vec2)
├── world3d.ts         ← NEW
├── entity3d.ts        ← NEW
├── visual3d.ts        ← NEW
├── physics3d.ts       ← NEW
├── camera3d.ts        ← NEW
├── joints3d.ts        ← NEW
├── GameDefinition.ts  ← Add optional sceneType, world3d, camera3d, templates3d, entities3d, joints3d
└── index.ts           ← Export new types
```

---

## 5. World3D Configuration

```typescript
// shared/src/types/world3d.ts

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface World3DConfig {
  gravity?: Vec3;                    // Default: { x: 0, y: -9.8, z: 0 }

  bounds?: {
    width: number;                   // X extent
    height: number;                  // Y extent
    depth: number;                   // Z extent
  };

  floor?: {
    enabled?: boolean;               // Default: true
    size: number;                    // Side length in meters
    color?: string;                  // Hex color
    texture?: string;                // Asset URL/ref
    material?: 'standard' | 'unlit';
  };

  sky?: SkyConfig;
  lighting?: LightingConfig | LightingPreset;
  fog?: FogConfig;
}

export type SkyConfig =
  | { type: 'color'; color: string }
  | { type: 'gradient'; topColor: string; bottomColor: string }
  | { type: 'hdri'; url: string };

export type LightingPreset =
  | 'bright-day'      // Strong directional + moderate ambient
  | 'overcast'        // Soft directional + strong ambient
  | 'sunset'          // Warm directional at low angle
  | 'night'           // Dim blue ambient + moonlight directional
  | 'studio'          // Even lighting from multiple angles
  | 'dramatic';       // Strong directional + minimal ambient

export interface LightingConfig {
  ambient?: {
    color?: string;                  // Default: white
    energy?: number;                 // Default: 0.5
  };
  directional?: {
    color?: string;
    energy?: number;                 // Default: 1.0
    direction?: Vec3;                // Euler angles
    shadows?: boolean;               // Default: true on desktop, false on mobile
  };
}

export interface FogConfig {
  enabled: boolean;
  color?: string;
  density?: number;
  start?: number;
  end?: number;
}
```

### Lighting Preset Resolution

```typescript
const PRESETS: Record<LightingPreset, LightingConfig> = {
  'bright-day': {
    ambient: { color: '#FFFFFF', energy: 0.4 },
    directional: { color: '#FFFAF0', energy: 1.0, direction: { x: -45, y: -45, z: 0 }, shadows: true }
  },
  'overcast': {
    ambient: { color: '#E0E0E0', energy: 0.7 },
    directional: { color: '#C0C0C0', energy: 0.5, direction: { x: -60, y: -30, z: 0 }, shadows: false }
  },
  'sunset': {
    ambient: { color: '#FFE4C4', energy: 0.3 },
    directional: { color: '#FF8C00', energy: 0.8, direction: { x: -15, y: -60, z: 0 }, shadows: true }
  },
  'night': {
    ambient: { color: '#1A1A3E', energy: 0.2 },
    directional: { color: '#8888CC', energy: 0.3, direction: { x: -50, y: -30, z: 0 }, shadows: false }
  },
  'studio': {
    ambient: { color: '#FFFFFF', energy: 0.6 },
    directional: { color: '#FFFFFF', energy: 0.8, direction: { x: -45, y: -45, z: 0 }, shadows: true }
  },
  'dramatic': {
    ambient: { color: '#222222', energy: 0.15 },
    directional: { color: '#FFFFFF', energy: 1.2, direction: { x: -30, y: -70, z: 0 }, shadows: true }
  },
};
```

### Coordinate System

Matches Godot 3D conventions — **no coordinate flipping** (unlike the 2D system):
- **X** → right
- **Y** → up
- **Z** → toward camera (out of screen in default view)

### Godot Mapping

| World3DConfig field | Godot implementation |
|---|---|
| `gravity` | `PhysicsServer3D.area_set_param(space, GRAVITY_VECTOR)` |
| `floor` | `StaticBody3D` + `MeshInstance3D` with `PlaneMesh` |
| `sky.type: 'color'` | `Environment.background_mode = BG_COLOR`, set color |
| `sky.type: 'gradient'` | `Environment.background_mode = BG_SKY` with procedural sky |
| `sky.type: 'hdri'` | `Environment.background_mode = BG_SKY` with `PanoramaSkyMaterial` |
| `lighting.ambient` | `Environment.ambient_light_source = COLOR`, set color + energy |
| `lighting.directional` | `DirectionalLight3D` node with shadow toggle |
| `fog` | `Environment.fog_enabled`, density/start/end params |

---

## 6. 3D Entity System

### 6.1. Transform3D

```typescript
// shared/src/types/entity3d.ts

export interface Transform3D {
  x: number;
  y: number;
  z: number;
  rotationX?: number;             // Euler degrees, default 0
  rotationY?: number;
  rotationZ?: number;
  scaleX?: number;                // Default 1
  scaleY?: number;
  scaleZ?: number;
}

export const DEFAULT_TRANSFORM_3D: Transform3D = {
  x: 0, y: 0, z: 0,
  rotationX: 0, rotationY: 0, rotationZ: 0,
  scaleX: 1, scaleY: 1, scaleZ: 1,
};
```

### 6.2. EntityTemplate3D

```typescript
export interface EntityTemplate3D {
  id: string;
  description?: string;
  whatDescription?: string;        // For AI asset generation

  visual?: VisualComponent3D;
  physics?: PhysicsComponent3D;
  collider?: ColliderComponent3D;
  behaviors?: Behavior[];          // Reuses existing behavior system
  tags?: string[];
  children?: ChildTemplate3D[];
}
```

### 6.3. Entity3D

```typescript
export interface Entity3D {
  id: string;
  name: string;
  template?: string;               // References key in templates3d
  transform: Transform3D;
  visual?: VisualComponent3D;      // Override template
  physics?: PhysicsComponent3D;
  collider?: ColliderComponent3D;
  behaviors?: Behavior[];
  tags?: string[];
  visible?: boolean;
  active?: boolean;
  children?: ChildEntity3D[];
}
```

### 6.4. Child Entities

```typescript
export interface ChildTemplate3D {
  name: string;
  template: string;
  localTransform: Transform3D;
  visual?: Partial<VisualComponent3D>;
  physics?: Partial<PhysicsComponent3D>;
  collider?: Partial<ColliderComponent3D>;
  behaviors?: Behavior[];
  tags?: string[];
  children?: ChildTemplate3D[];
}

export interface ChildEntity3D {
  id?: string;
  name: string;
  template: string;
  localTransform: Transform3D;
  visual?: Partial<VisualComponent3D>;
  tags?: string[];
  children?: ChildEntity3D[];
}
```

### 6.5. Entity Creation Pipeline

```
templates3d["player"]  +  entities3d[{ template: "player", transform: {...} }]
         │                              │
         └──────────┬───────────────────┘
                    │
            EntityFactory3D.create_entity()
                    │
         ┌──────────┴──────────┐
         │ Merge template data │
         └──────────┬──────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
 static          dynamic        kinematic
    │               │               │
StaticBody3D   RigidBody3D   CharacterBody3D
    │               │               │
    └───────────────┼───────────────┘
                    │
         ┌──────────┴──────────┐
         │  Add CollisionShape3D│
         │  Add Visual (Mesh)   │
         │  Set Transform3D     │
         │  Set metadata/tags   │
         └─────────────────────┘
```

This mirrors the existing `EntityFactory.gd` pattern exactly — template merge, body creation, shape addition, visual attachment, transform application, metadata storage. The only difference is Node3D instead of Node2D.

---

## 7. 3D Visual System

### 7.1. VisualComponent3D

```typescript
// shared/src/types/visual3d.ts

export type VisualType3D = 'primitive' | 'voxels' | 'model' | 'sprite3d' | 'particles3d';

// --- Primitives ---
export interface PrimitiveVisual3D {
  type: 'primitive';
  shape: 'box' | 'sphere' | 'cylinder' | 'capsule' | 'plane';
  color: string;
  size?: Vec3;                   // Box dimensions (default: {x:1, y:1, z:1})
  radius?: number;               // Sphere, cylinder, capsule
  height?: number;               // Cylinder, capsule
  material?: MaterialConfig;
}

// --- Voxels ---
export interface VoxelCube {
  x: number;
  y: number;
  z: number;
  size: number;                  // Side length
  color: string;                 // Hex color
}

export interface VoxelVisual3D {
  type: 'voxels';
  voxels: VoxelCube[];
  optimize?: boolean;            // Merge adjacent same-color for perf
}

// --- GLB/GLTF Model ---
export interface ModelVisual3D {
  type: 'model';
  url: string;
  assetRef?: string;
  animationClip?: string;
  animationLoop?: boolean;
}

// --- 2D Sprite in 3D Space ---
export interface Sprite3DVisual {
  type: 'sprite3d';
  url?: string;
  assetRef?: string;
  whatDescription?: string;
  imageWidth?: number;
  imageHeight?: number;
  billboard?: boolean;           // Always face camera (default: true)
  pixelsPerMeter?: number;
}

// --- 3D Particles ---
export interface Particles3DVisual {
  type: 'particles3d';
  emitterType: 'box' | 'sphere' | 'point';
  count: number;
  lifetime: number;
  color?: string;
  size?: number;
  gravity?: Vec3;
  velocity?: Vec3;
  spread?: number;               // Cone angle in degrees
}

export type VisualComponent3D =
  | PrimitiveVisual3D
  | VoxelVisual3D
  | ModelVisual3D
  | Sprite3DVisual
  | Particles3DVisual;
```

### 7.2. Material System

```typescript
export interface MaterialConfig {
  roughness?: number;            // 0 = glossy, 1 = matte (default: 0.5)
  metallic?: number;             // 0 = non-metal, 1 = metal (default: 0)
  emissive?: string;             // Emission hex color
  emissiveEnergy?: number;
  transparent?: boolean;
  opacity?: number;
  unlit?: boolean;               // Skip lighting (flat-shaded look)
  doubleSided?: boolean;
}
```

### 7.3. Visual Type → Godot Node Mapping

| Visual Type | Godot Nodes |
|-------------|-------------|
| `primitive: box` | `MeshInstance3D` + `BoxMesh` + `StandardMaterial3D` |
| `primitive: sphere` | `MeshInstance3D` + `SphereMesh` + `StandardMaterial3D` |
| `primitive: cylinder` | `MeshInstance3D` + `CylinderMesh` + `StandardMaterial3D` |
| `primitive: capsule` | `MeshInstance3D` + `CapsuleMesh` + `StandardMaterial3D` |
| `voxels` | `Node3D` parent + N × `MeshInstance3D`/`BoxMesh` |
| `voxels` (optimized) | `Node3D` + `MultiMeshInstance3D` or merged `ArrayMesh` |
| `model` | `Node3D` + loaded GLB scene via `GLTFDocument` |
| `sprite3d` | `Sprite3D` with optional `billboard` flag |
| `particles3d` | `GPUParticles3D` or `CPUParticles3D` |

### 7.4. Voxel Optimization Strategy

| Voxel Count | Strategy | Draw Calls |
|-------------|----------|-----------|
| < 50 per entity | Individual `BoxMesh` nodes | N |
| 50–500 | `MultiMeshInstance3D` (instanced) | 1 per color group |
| 500+ | Greedy meshing → `ArrayMesh` | 1 total |

Implementation phases: Individual boxes first → MultiMesh → Greedy meshing only if needed.

### 7.5. Shadow Settings

| Platform | Default |
|----------|---------|
| Web (desktop) | Shadows ON |
| Web (mobile) | Shadows OFF |
| iOS/Android | Shadows OFF |

Override via `lighting.directional.shadows: true/false`.

---

## 8. 3D Physics Integration

### 8.1. Physics Engine Choice

| Option | Pros | Cons |
|--------|------|------|
| **GodotPhysics3D** (built-in) | Zero dependencies, already available | Less performant than Jolt |
| **Jolt3D** (plugin) | Better performance, deterministic | Extra dependency for WASM |

**Decision**: Start with GodotPhysics3D. Swap to Jolt later if performance requires it. The declarative API is physics-engine-agnostic.

### 8.2. PhysicsComponent3D

```typescript
// shared/src/types/physics3d.ts

export type PhysicsBodyType3D = 'static' | 'dynamic' | 'kinematic';

export interface PhysicsComponent3D {
  bodyType: PhysicsBodyType3D;
  mass?: number;
  density?: number;              // Default: 1.0
  gravityScale?: number;         // Default: 1.0
  linearDamping?: number;
  angularDamping?: number;
  freezeRotationX?: boolean;
  freezeRotationY?: boolean;
  freezeRotationZ?: boolean;
  ccd?: boolean;                 // Continuous collision detection
  initialVelocity?: Vec3;
  initialAngularVelocity?: Vec3;
}
```

### 8.3. ColliderComponent3D

```typescript
export type ColliderShape3D = 'box' | 'sphere' | 'capsule' | 'cylinder' | 'convex' | 'trimesh';

export interface ColliderComponent3D {
  shape: ColliderShape3D;
  width?: number;                // box
  height?: number;               // box, capsule, cylinder
  depth?: number;                // box
  radius?: number;               // sphere, capsule, cylinder
  fromVisual?: boolean;          // Auto-generate from visual geometry

  friction?: number;
  restitution?: number;
  isSensor?: boolean;
}
```

### 8.4. Collision Shape Mapping

| ColliderComponent3D | Godot Shape |
|---------------------|-------------|
| `shape: 'box'` | `BoxShape3D(size)` |
| `shape: 'sphere'` | `SphereShape3D(radius)` |
| `shape: 'capsule'` | `CapsuleShape3D(radius, height)` |
| `shape: 'cylinder'` | `CylinderShape3D(radius, height)` |
| `shape: 'convex'` | `ConvexPolygonShape3D` (from mesh vertices) |
| `shape: 'trimesh'` | `ConcavePolygonShape3D` (static only) |

### 8.5. Collision Events

```typescript
interface CollisionEvent3D {
  entityA: string;
  entityB: string;
  normal: Vec3;
  impulse: number;
  contactPoint: Vec3;
}
```

The rules engine collision triggers are **tag-based** and don't inspect coordinates, so they work identically in 3D. The bridge converts Godot's `body_entered` signals into the same event format used by 2D.

---

## 9. 3D Camera System

### 9.1. Camera3DConfig

```typescript
// shared/src/types/camera3d.ts

export interface Camera3DConfig {
  type: 'perspective' | 'orthographic';

  position: Vec3;
  lookAt: Vec3;

  fov?: number;                   // Perspective only (default: 60)
  size?: number;                  // Orthographic only

  near?: number;                  // Default: 0.1
  far?: number;                   // Default: 100

  follow?: {
    target?: string;              // Entity ID
    offset?: Vec3;
    smoothing?: number;           // 0 = instant, 1 = very smooth
    mode?: 'third-person' | 'orbit' | 'fixed-offset';
  };

  orbit?: {
    enabled: boolean;
    minDistance?: number;
    maxDistance?: number;
    minPolarAngle?: number;       // Radians
    maxPolarAngle?: number;
    autoRotate?: boolean;
    autoRotateSpeed?: number;     // Degrees/second
    damping?: number;
  };
}
```

### 9.2. Camera Modes

| Mode | Config | Use Case |
|------|--------|----------|
| **Fixed** | `position` + `lookAt` | Puzzle games, model viewers |
| **Third-person follow** | `follow.mode: "third-person"` | Character games |
| **Orbit** | `orbit.enabled: true` | Interactive viewers, strategy |
| **First-person** | `follow.mode: "fixed-offset"` + zero offset | FPS-style |
| **Top-down** | `type: "orthographic"` + `follow.mode: "fixed-offset"` | Strategy |

### 9.3. Camera Input

| Input | Camera Response |
|-------|-----------------|
| Drag on empty space (orbit mode) | Rotate around target |
| Pinch | Zoom in/out |
| Two-finger drag | Pan camera |

`InputRouter3D.gd` decides whether input goes to camera control or game logic based on `orbit.enabled` and hit testing.

### 9.4. Camera Shake

Same rule action works in 2D and 3D — random position offset with exponential decay:

```typescript
{ type: "camera_shake", intensity: 0.5, duration: 0.3 }
```

---

## 10. 3D Joints

```typescript
// shared/src/types/joints3d.ts

interface Joint3DBase {
  id: string;
  entityA: string;
  entityB: string;
  collideConnected?: boolean;
}

interface HingeJoint3D extends Joint3DBase {
  type: 'hinge';
  anchor: Vec3;
  axis: Vec3;                    // Rotation axis
  enableLimit?: boolean;
  lowerAngle?: number;
  upperAngle?: number;
  enableMotor?: boolean;
  motorSpeed?: number;
  maxMotorTorque?: number;
}

interface BallJoint3D extends Joint3DBase {
  type: 'ball';                  // Ball-and-socket
  anchor: Vec3;
}

interface SliderJoint3D extends Joint3DBase {
  type: 'slider';
  anchor: Vec3;
  axis: Vec3;
  enableLimit?: boolean;
  lowerTranslation?: number;
  upperTranslation?: number;
}

interface FixedJoint3D extends Joint3DBase {
  type: 'fixed';                 // Weld equivalent
  anchor: Vec3;
}

export type Joint3D = HingeJoint3D | BallJoint3D | SliderJoint3D | FixedJoint3D;
```

### Godot Mapping

| Joint3D type | Godot class |
|---|---|
| `hinge` | `HingeJoint3D` |
| `ball` | `Generic6DOFJoint3D` (all rotations free) |
| `slider` | `SliderJoint3D` |
| `fixed` | `Generic6DOFJoint3D` (all DOF locked) |

---

## 11. Scripting API Extensions

### 11.1. Automatic Vec3 in 3D Context

For 3D scenes, position/rotation/scale methods return/accept Vec3:

```javascript
// 2D (unchanged):
ctx.getEntityPosition('player')  // → { x: 2, y: 5 }

// 3D (automatic when sceneType is '3d'):
ctx.getEntityPosition('player')  // → { x: 2, y: 5, z: 0 }
ctx.setEntityPosition('player', { x: 2, y: 5, z: 0 })

// Rotation returns euler Vec3 in 3D:
ctx.getEntityRotation('player')  // → { x: 0, y: 45, z: 0 }

// Scale:
ctx.getEntityScale('player')     // → { x: 1, y: 1, z: 1 }
```

### 11.2. New 3D Methods

```javascript
// Camera
ctx.setCameraPosition({ x: 0, y: 10, z: 15 });
ctx.setCameraLookAt({ x: 0, y: 0, z: 0 });
ctx.setCameraFov(60);

// 3D raycast
ctx.raycast3D(from, direction, { maxDistance: 100 });
// → { entityId, point: Vec3, normal: Vec3, distance } | null

// Utilities
ctx.isOnGround('player');        // Downward raycast
ctx.distance3D(vecA, vecB);      // √(dx²+dy²+dz²)
```

### 11.3. Backward Compatibility

Scripts using `{ x, y }` still work in 3D — `z` defaults to 0. Many scripts run unmodified in both 2D and 3D.

---

## 12. Rules System Compatibility

### What Works Unchanged

Every rule component that operates on tags, variables, events, or time:
- Collision/sensor triggers (tag-based)
- Timer, entity_count, event, frame, game_started triggers
- All conditions (variable, expression, entity_count, random, state, etc.)
- Set variable, destroy, game_state, event, sound, haptic, state_transition actions

### What Needs Extension

Position-related actions gain an optional `z` field:

```typescript
// Existing (works in 3D, z defaults to 0):
{ type: 'set_velocity', target: { type: 'by_tag', tag: 'ball' }, x: 0, y: 7 }

// Extended for 3D:
{ type: 'set_velocity', target: { type: 'by_tag', tag: 'ball' }, x: 0, y: 7, z: -3 }
{ type: 'spawn', template: 'bullet', position: { type: 'fixed', x: 5, y: 0, z: 2 } }
```

### Tap in 3D

On tap, the engine performs a screen-space raycast from Camera3D through the tap point into the 3D world. If it hits an entity, that entity is the target. Transparent to the rule.

### Drag in 3D

| Mode | Description | Use Case |
|------|-------------|----------|
| **XZ plane** (default) | Drag on ground plane | Top-down / strategy |
| **Screen-aligned** | Project screen X/Y to world | Puzzle games |
| **Constrained axis** | Along world axis | Slider puzzles |

Configured via `input.dragMode3d?: 'xz-plane' | 'screen-aligned' | 'constrained-x' | 'constrained-y' | 'constrained-z'`.

---

## 13. Godot Bridge Changes

### 13.1. New Modules

```
godot_project/scripts/
├── GameBridge.gd              ← Add scene-type routing + 3D method map
├── entity/
│   ├── EntityFactory.gd       ← Existing 2D (unchanged)
│   └── EntityFactory3D.gd     ← NEW
├── 3d/
│   ├── Viewport3D.gd          ← Extend for full-screen 3D gameplay
│   ├── World3DSystem.gd       ← NEW: floor, sky, lighting, fog
│   ├── VisualRenderer3D.gd    ← NEW: mesh, voxel, model creation
│   ├── PhysicsController3D.gd ← NEW: forces, velocities for RigidBody3D
│   ├── CollisionSystem3D.gd   ← NEW: collision events → EventEmitter
│   ├── CameraController3D.gd  ← NEW: camera modes, follow, orbit
│   ├── VoxelBuilder.gd        ← NEW: voxel mesh construction + optimization
│   └── InputRouter3D.gd       ← NEW: screen-to-world raycast
└── bridge/
    └── GameBridgeEffects.gd   ← Existing (unchanged)
```

### 13.2. Scene Loading Routing

```gdscript
func load_game_json(json_string: String) -> bool:
    var data = parse_json(json_string)
    var scene_type = data.get("sceneType", "2d")

    match scene_type:
        "3d": return _load_game_3d(data)
        _:    return _load_game_2d(data)  # Existing, unchanged

func _load_game_3d(data: Dictionary) -> bool:
    clear_game()
    game_root.visible = false
    _viewport_3d.visible = true

    _world_3d_system.setup(data.get("world3d", {}))
    _camera_3d.setup(data.get("camera3d", {}))

    var templates = data.get("templates3d", {})
    for entity_data in data.get("entities3d", []):
        _entity_factory_3d.create_entity(entity_data, templates)

    return true
```

### 13.3. Viewport3D Changes

Currently renders to a `Sprite2D` overlay. For full 3D games, expand the SubViewport to fill the entire screen. Keep the SubViewport architecture — just resize to match the window.

### 13.4. Method Map Extension

```gdscript
# 3D Entity Management
"spawn_entity_3d": _entity_factory_3d.spawn_entity,
"destroy_entity_3d": _entity_manager_3d.destroy_entity,

# 3D Physics
"set_linear_velocity_3d": _physics_controller_3d.set_velocity,
"apply_impulse_3d": _physics_controller_3d.apply_impulse,
"apply_force_3d": _physics_controller_3d.apply_force,

# 3D Transform
"set_position_3d": _transform_3d.set_position,
"set_rotation_3d": _transform_3d.set_rotation,
"set_scale_3d": _transform_3d.set_scale,

# 3D Camera
"set_camera_3d_position": _camera_3d.set_position,
"set_camera_3d_look_at": _camera_3d.set_look_at,
"set_camera_3d_fov": _camera_3d.set_fov,

# 3D Input
"raycast_from_screen": _input_router_3d.raycast_from_screen,

# 3D Queries
"query_point_3d": _physics_queries_3d.query_point,
"raycast_3d": _physics_queries_3d.raycast,
```

---

## 14. React Native Integration

### 14.1. Bridge Type Extensions

```typescript
export interface GodotBridge {
  // ... all existing methods unchanged ...

  // 3D entity management
  spawnEntity3D(templateId: string, x: number, y: number, z: number): string;
  setPosition3D(entityId: string, pos: Vec3): void;
  setRotation3D(entityId: string, rot: Vec3): void;
  setScale3D(entityId: string, scale: Vec3): void;
  applyImpulse3D(entityId: string, impulse: Vec3): void;
  setVelocity3D(entityId: string, vel: Vec3): void;

  // 3D camera
  setCameraPosition3D(pos: Vec3): void;
  setCameraLookAt3D(target: Vec3): void;
  setCameraFov(fov: number): void;
}
```

### 14.2. System Runner — Swappable Systems

The `GameSystemRunner` registers different implementations based on `sceneType`:

- **2D**: existing `EntityManager2DSystem`, `Physics2DSystem` (unchanged)
- **3D**: new `EntityManager3DSystem`, `Physics3DSystem` (call 3D bridge methods)

`RulesSystem`, `ScriptSystem`, `StateMachineSystem`, `EventSystem` are shared.

---

## 15. Asset Pipeline Extensions

### New 3D Asset Types

| Type | Pipeline | Format |
|------|----------|--------|
| `voxel_model` | AI text → voxel spec → optimize → R2 | JSON (VoxelCube[]) |
| `glb_model` | AI/manual → GLB export → R2 | GLB binary |
| `texture_3d` | AI txt2img → R2 | PNG/JPG |
| `hdri_sky` | Curated/AI → R2 | HDR |
| `entity` (existing) | Unchanged — 2D sprites usable as `sprite3d` | PNG |

The existing `assetSystem` config works unchanged — packs are asset collections keyed by template ID.

---

## 16. AI Generation Considerations

### One Decision: 2D or 3D

| Keywords | Scene Type |
|----------|-----------|
| "voxel", "3D world", "first-person" | `"3d"` |
| "platformer", "side-scroller", "top-down" (2D sprite) | `"2d"` |
| Everything else | `"2d"` (default) |

### Example: AI-Generated 3D Platformer

```json
{
  "metadata": { "id": "voxel-jump", "slug": "voxelJump", "title": "Voxel Jump", "version": "1.0.0" },
  "sceneType": "3d",
  "world3d": {
    "gravity": { "x": 0, "y": -15, "z": 0 },
    "floor": { "enabled": false },
    "sky": { "type": "gradient", "topColor": "#4A90D9", "bottomColor": "#87CEEB" },
    "lighting": "bright-day"
  },
  "camera3d": {
    "type": "perspective",
    "position": { "x": 0, "y": 5, "z": 12 },
    "lookAt": { "x": 0, "y": 2, "z": 0 },
    "fov": 55,
    "follow": { "target": "player", "offset": { "x": 0, "y": 3, "z": 10 }, "smoothing": 0.1, "mode": "fixed-offset" }
  },
  "variables": { "score": 0, "lives": 3 },
  "templates3d": {
    "player": {
      "id": "player", "tags": ["player"],
      "visual": { "type": "voxels", "voxels": [
        { "x": 0, "y": 0, "z": 0, "size": 0.4, "color": "#FF6B35" },
        { "x": 0, "y": 0.4, "z": 0, "size": 0.35, "color": "#FFFFFF" },
        { "x": 0, "y": 0.75, "z": 0, "size": 0.3, "color": "#FFD93D" }
      ]},
      "physics": { "bodyType": "dynamic", "mass": 1, "freezeRotationX": true, "freezeRotationZ": true },
      "collider": { "shape": "capsule", "radius": 0.25, "height": 1.0 }
    },
    "platform": {
      "id": "platform", "tags": ["platform"],
      "visual": { "type": "primitive", "shape": "box", "color": "#4CAF50", "size": { "x": 3, "y": 0.5, "z": 2 } },
      "physics": { "bodyType": "static" },
      "collider": { "shape": "box", "width": 3, "height": 0.5, "depth": 2 }
    },
    "coin": {
      "id": "coin", "tags": ["coin", "collectible"],
      "visual": { "type": "primitive", "shape": "cylinder", "color": "#FFD700", "radius": 0.2, "height": 0.05 },
      "collider": { "shape": "sphere", "radius": 0.3, "isSensor": true },
      "behaviors": [
        { "type": "rotate", "speed": 90, "direction": "clockwise" },
        { "type": "oscillate", "axis": "y", "amplitude": 0.3, "frequency": 1.5 }
      ]
    }
  },
  "entities3d": [
    { "id": "player", "name": "Player", "template": "player", "transform": { "x": 0, "y": 2, "z": 0 } },
    { "id": "plat1", "name": "Start", "template": "platform", "transform": { "x": 0, "y": 0, "z": 0 } },
    { "id": "plat2", "name": "Mid", "template": "platform", "transform": { "x": 5, "y": 1.5, "z": 0 } },
    { "id": "coin1", "name": "Coin", "template": "coin", "transform": { "x": 5, "y": 3, "z": 0 } }
  ],
  "rules": [
    {
      "id": "collect", "trigger": { "type": "sensor_enter", "sensorTag": "coin", "entityTag": "player" },
      "actions": [
        { "type": "set_variable", "name": "score", "operation": "add", "value": 10 },
        { "type": "destroy", "target": { "type": "other" } }
      ]
    },
    {
      "id": "jump", "trigger": { "type": "button", "button": "jump", "state": "pressed" },
      "actions": [{ "type": "apply_impulse", "target": { "type": "by_tag", "tag": "player" }, "y": 8 }]
    }
  ],
  "input": {
    "tapZones": [
      { "id": "left", "edge": "left", "size": 0.35, "button": "left" },
      { "id": "right", "edge": "right", "size": 0.35, "button": "right" }
    ],
    "virtualButtons": [{ "id": "jump", "button": "jump", "label": "Jump", "size": 70 }]
  }
}
```

---

## 17. Phased Implementation Plan

### Phase 0: Foundation Types (1–2 days)

- [ ] Add `Vec3` to `common.ts`
- [ ] Create `world3d.ts`, `entity3d.ts`, `visual3d.ts`, `physics3d.ts`, `camera3d.ts`, `joints3d.ts`
- [ ] Add optional 3D fields to `GameDefinition`
- [ ] Export from index, `tsc --noEmit` passes
- **Deliverable**: Complete type system, zero runtime impact

### Phase 1: 3D Viewer Modules (2–3 days)

- [ ] Refactor `Viewport3D.gd` for fullscreen mode
- [ ] `World3DSystem.gd` — floor, sky, lighting, fog setup
- [ ] `VisualRenderer3D.gd` — primitive, voxel, model creation
- [ ] `CameraController3D.gd` — perspective/ortho, follow, orbit
- [ ] React: `VoxelScene3D`, `VoxelObject`, `GLBModel` components
- **Deliverable**: Clean 3D rendering, no game logic

### Phase 2: 3D Entity Runtime (5–7 days)

- [ ] `EntityFactory3D.gd` — create 3D bodies from definition
- [ ] `PhysicsController3D.gd` — velocity, impulse, force
- [ ] `CollisionSystem3D.gd` — collision events → EventEmitter
- [ ] `InputRouter3D.gd` — screen raycast for tap/drag
- [ ] Scene-type routing in `GameBridge.load_game_json`
- [ ] TypeScript: 3D bridge methods
- [ ] Scripting: Vec3-aware ScriptContext
- [ ] Test game: 3D platformer with physics + rules
- **Deliverable**: Playable 3D game from GameDefinition JSON

### Phase 3: Asset Pipeline & AI (3–5 days)

- [ ] 3D asset types in pipeline
- [ ] AI prompt templates for 3D
- [ ] Voxel model generation
- [ ] End-to-end: prompt → AI → 3D game
- **Deliverable**: AI-generated 3D games

### Phase 4: Polish (2–3 days)

- [ ] Voxel optimization (MultiMesh)
- [ ] Shadow quality per platform
- [ ] Mobile perf profiling
- [ ] Additional camera modes
- [ ] Update game-authoring skills docs

---

## 18. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| 3D physics perf on mobile/WASM | Medium | High | GodotPhysics3D first, Jolt if needed |
| Voxel rendering perf | Medium | Medium | MultiMesh, greedy meshing |
| Viewport3D fullscreen overhead | Low | Medium | Test early |
| 3D input complexity | Low | Medium | Start with XZ plane drag |
| AI valid 3D definitions | Medium | Medium | Examples, validation |
| Scope creep | Medium | High | Phase-gate each delivery |

---

## 19. Open Questions

### Decided

| Question | Decision |
|----------|----------|
| Multi-scene? | No — single scene per definition |
| Polymorphic `world`? | No — parallel `world3d` field |
| Physics engine? | GodotPhysics3D initially |

### Still Open

| Question | Options | Decide By |
|----------|---------|-----------|
| Behaviors: add `z` or create 3D variants? | A) Optional `z` on existing B) Parallel types | Phase 2 |
| 3D joints from day one? | A) Phase 2 B) Defer | Phase 2 |
| Camera orbit: touch or button? | A) Touch B) Button C) Configurable | Phase 2 |
| Isometric games? | A) Ortho 3D B) Angled 2D C) Both | Future |
| Voxel format: array vs compressed? | A) VoxelCube[] B) RLE C) Octree | Phase 3 |
