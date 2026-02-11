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
└── Node2D (2D world)               └── SubViewport (3D world)
    ├── Camera2D                         ├── Camera3D
    ├── RigidBody2D (ball)               ├── RigidBody3D (player)
    └── StaticBody2D (wall)              ├── StaticBody3D (wall)
                                         └── MeshInstance3D (floor)

HUD Layer (BOTH 2D and 3D):         Entity-Attached UI (Godot only):
React Native OverlayRenderer         └── RigidBody3D (enemy)
├── Score text                            └── Sprite3D (health bar, billboard)
├── Lives counter
└── Health bar
(See UI Overlay Plan for details)
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
| Scripting (QuickJS) | **Yes** | Abstract API, Vec3-aware in 3D context via context flag |
| Event System | **Yes** | String event names, no coordinates |
| State Machines | **Yes** | |
| Variables / Expressions | **Yes** | |
| Input Processing | **Yes** | Screen-space; 3D adds raycast for world mapping |
| Containers | **Yes** | Logical, not spatial |
| Overlay / HUD | **Yes** | Screen-space UI, scene-type agnostic (see [UI Overlay Plan](./ui-overlay-system-plan.md)) |
| Entity Factory | **Split** | `EntityFactory.gd` (2D) vs `EntityFactory3D.gd` (3D) — same `entities` field, different inner types |
| Physics | **Split** | Rapier2D (current 2D) vs GodotPhysics3D (new 3D) |
| Camera | **Split** | Camera2D vs Camera3D |
| Visual Renderer | **Split** | Sprite2D/shapes vs Mesh/Voxels/GLB |
| World Setup | **Split** | 2D bounds vs 3D floor/sky/lighting |
| Collision Shapes | **Split** | 2D shapes vs 3D shapes |

---

## 4. Type System Changes

### Strategy: Unified Scene Wrapper with Discriminant

A `sceneType` discriminant on `GameDefinition` determines the runtime path. Scene-specific fields (`world`, `camera`, `templates`, `entities`, `joints`) use **different inner types** based on scene type — wrapped in a discriminated structure so there's exactly one set of fields, not two parallel sets.

```typescript
// shared/src/types/GameDefinition.ts

interface GameDefinition {
  // ... all existing non-scene fields unchanged (metadata, variables, rules, scripts, input, overlay, dialogs, etc.) ...

  /**
   * Determines coordinate system, physics engine, and rendering pipeline.
   * Default: "2d" when omitted (backward compatible during migration).
   * After migration: required field.
   */
  sceneType?: '2d' | '3d';

  // Scene-geometry fields — shape depends on sceneType
  world?: WorldConfig | World3DConfig;
  camera?: CameraConfig | Camera3DConfig;
  templates?: Record<string, EntityTemplate | EntityTemplate3D>;
  entities?: Array<GameEntity | Entity3D>;
  joints?: Array<Joint | Joint3D>;
}
```

At runtime, the engine reads `sceneType` and narrows the types:

```typescript
function loadScene(def: GameDefinition) {
  const sceneType = def.sceneType ?? '2d';
  if (sceneType === '3d') {
    const world = def.world as World3DConfig;
    const entities = def.entities as Entity3D[];
    // ... 3D runtime path
  } else {
    const world = def.world as WorldConfig;
    const entities = def.entities as GameEntity[];
    // ... existing 2D runtime path (unchanged)
  }
}
```

**Why a unified field set instead of parallel `world3d`/`entities3d`?**

1. **No permanent duplication**: One `entities` field, one `templates` field — not two parallel systems to maintain forever
2. **Impossible invalid states**: Can't accidentally set both `entities` and `entities3d`
3. **Shared systems work naturally**: Rules, scripts, and behaviors reference `entities` regardless of scene type
4. **Clean migration**: When all games specify `sceneType`, remove the `?` optional marker — done
5. **AI simplicity**: "Set `sceneType: '3d'` and your `entities`/`templates`/`world` use the 3D shapes"

**Validation**: A Zod schema (or runtime validator) checks that when `sceneType: "3d"`, the `world` matches `World3DConfig`, `entities` entries match `Entity3D`, etc. Invalid combinations are caught at load time, not at render time.

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
├── GameDefinition.ts  ← Add sceneType discriminant, widen world/camera/templates/entities/joints to accept 3D variants
└── index.ts           ← Export new types
```

---

## 5. World3D Configuration

> **Units convention (all 3D types)**: Distances are in **meters**. Angles are in **degrees** (converted to radians in Godot). This applies to transforms, camera config, lighting rotation, orbit angles, joint limits, and physics values. AI generates degrees because they're human-readable; Godot converts internally.

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
    width: number;                   // X extent (total, centered on origin)
    height: number;                  // Y extent
    depth: number;                   // Z extent
    enforcement?: 'walls' | 'kill' | 'none';  // Default: 'walls'
    killY?: number;                  // Y threshold for kill plane (default: -bounds.height)
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

/**
 * Bounds enforcement behaviors:
 * - 'walls': Create invisible StaticBody3D walls on all 6 faces (default). Entities bounce off.
 * - 'kill': Entities below killY are destroyed. No walls. Good for platformers with pits.
 * - 'none': Bounds are informational only (used for camera framing). No physics.
 *
 * When enforcement is 'walls', the floor face is only created if floor.enabled is false
 * (to avoid double collision). When floor.enabled is true, the floor IS the bottom wall.
 */

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
    rotation?: Vec3;                 // Euler angles in DEGREES (converted to radians in Godot)
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
    directional: { color: '#FFFAF0', energy: 1.0, rotation: { x: -45, y: -45, z: 0 }, shadows: true }
  },
  'overcast': {
    ambient: { color: '#E0E0E0', energy: 0.7 },
    directional: { color: '#C0C0C0', energy: 0.5, rotation: { x: -60, y: -30, z: 0 }, shadows: false }
  },
  'sunset': {
    ambient: { color: '#FFE4C4', energy: 0.3 },
    directional: { color: '#FF8C00', energy: 0.8, rotation: { x: -15, y: -60, z: 0 }, shadows: true }
  },
  'night': {
    ambient: { color: '#1A1A3E', energy: 0.2 },
    directional: { color: '#8888CC', energy: 0.3, rotation: { x: -50, y: -30, z: 0 }, shadows: false }
  },
  'studio': {
    ambient: { color: '#FFFFFF', energy: 0.6 },
    directional: { color: '#FFFFFF', energy: 0.8, rotation: { x: -45, y: -45, z: 0 }, shadows: true }
  },
  'dramatic': {
    ambient: { color: '#222222', energy: 0.15 },
    directional: { color: '#FFFFFF', energy: 1.2, rotation: { x: -30, y: -70, z: 0 }, shadows: true }
  },
};
```

### Coordinate System

**3D games use raw meters with Godot 3D conventions — no coordinate conversion.**

Unlike the 2D system (which uses center-origin Y-up with a `game_to_godot_pos` conversion at 50 px/meter), 3D games operate directly in Godot's 3D coordinate space:

- **X** → right
- **Y** → up
- **Z** → toward camera (out of screen in default view)
- **Unit** → meters (1 unit = 1 meter, no px/meter scaling)
- **Origin** → world origin (0, 0, 0) — no center-origin offset

The `GameBridge.gd` coordinate conversion (`game_to_godot_pos` / `godot_to_game_pos`) is **skipped entirely** for 3D entities. The 3D bridge methods pass coordinates through unchanged.

This simplifies everything: `{ x: 5, y: 2, z: 0 }` in the game definition = `Vector3(5, 2, 0)` in Godot. No math.

### Godot Mapping

| World3DConfig field | Godot implementation |
|---|---|
| `gravity` | `PhysicsServer3D.area_set_param(space, GRAVITY_VECTOR)` |
| `floor` | `StaticBody3D` + `MeshInstance3D` with `PlaneMesh` |
| `sky.type: 'color'` | `Environment.background_mode = BG_COLOR`, set color |
| `sky.type: 'gradient'` | `Environment.background_mode = BG_SKY` with procedural sky |
| `sky.type: 'hdri'` | `Environment.background_mode = BG_SKY` with `PanoramaSkyMaterial` |
| `lighting.ambient` | `Environment.ambient_light_source = COLOR`, set color + energy |
| `lighting.directional` | `DirectionalLight3D` node; `rotation` euler degrees → radians for `rotation_degrees` property; shadow toggle |
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
  template?: string;               // References key in templates
  transform: Transform3D;
  visual?: VisualComponent3D;      // Override template
  physics?: PhysicsComponent3D;
  collider?: ColliderComponent3D;
  behaviors?: Behavior[];
  tags?: string[];
  visible?: boolean;
  active?: boolean;
  children?: ChildEntity3D[];
  worldUI?: EntityWorldUI;         // Attached world-space UI (health bars, labels)
}
```

### 6.4. Entity-Attached World-Space UI

> **This is NOT part of the overlay system.** The [UI Overlay Plan](./ui-overlay-system-plan.md) handles screen-space HUD elements rendered by React Native. World-space UI is attached to entities and rendered by Godot because it must track entity positions every frame without bridge traffic.

```typescript
export interface EntityWorldUI {
  elements: WorldUIElement[];
}

export type WorldUIElement =
  | WorldUIHealthBar
  | WorldUILabel
  | WorldUIIcon;

interface WorldUIBase {
  type: string;
  offset?: Vec3;                   // Position offset from entity origin (default: above entity)
  billboard?: boolean;             // Always face camera (default: true)
  visibleWhen?: string;            // Expression (same grammar as overlay)
  scale?: number;                  // Size multiplier (default: 1)
}

export interface WorldUIHealthBar extends WorldUIBase {
  type: 'health_bar';
  width?: number;                  // World units (default: 1.0)
  height?: number;                 // World units (default: 0.1)
  color?: string;                  // Fill color (default: #4CAF50)
  backgroundColor?: string;       // Track color (default: rgba(0,0,0,0.5))
  binding: {
    value: string;                 // e.g., "variables.health" or entity-scoped variable
    max: string;                   // e.g., "variables.maxHealth"
  };
}

export interface WorldUILabel extends WorldUIBase {
  type: 'label';
  text?: string;                   // Static text
  binding?: string;                // Dynamic text binding
  fontSize?: number;               // Default: 14
  color?: string;                  // Default: #FFFFFF
  outline?: boolean;               // Dark outline for readability (default: true)
}

export interface WorldUIIcon extends WorldUIBase {
  type: 'icon';
  emoji?: string;                  // e.g., "!" for alert
  assetRef?: string;               // Image asset
  size?: number;                   // World units
}
```

**Godot implementation**: Each `WorldUIElement` becomes a child node of the entity:
- `health_bar` → `Sprite3D` with a custom shader (two-color fill based on value/max ratio)
- `label` → `Label3D` with billboard mode
- `icon` → `Sprite3D` with billboard mode

These nodes update locally inside Godot — no bridge traffic for per-frame position tracking.

**Binding resolution for worldUI:**

| Binding Root | Resolution | Example |
|-------------|-----------|---------|
| `variables.*` | Global game variables, synced to Godot via `SyncSystem` every frame | `"variables.enemy1_hp"` |
| Literal number/string | Static value | `"100"` |

Entity-scoped variables (per-entity HP) are stored as global variables with entity ID prefixes (e.g., `variables.enemy1_hp`). There are no entity-local variable scopes in v1.

**Expression evaluation in Godot** (`visibleWhen` on worldUI):

Expressions are evaluated **on the TypeScript side**, not in Godot. The flow:

1. TS evaluates all worldUI `visibleWhen` expressions once per frame (using the same `expr-eval` engine as the overlay system)
2. TS sends resolved boolean visibility + resolved numeric values to Godot via the normal sync path: `{ entityId: "enemy1", worldUI: { 0: { visible: true, value: 75, max: 100 } } }`
3. Godot applies the resolved values to the `Sprite3D`/`Label3D` nodes — no expression parsing in GDScript

This means **one expression engine** (expr-eval in TS) for both overlay `visibleWhen` and worldUI `visibleWhen`. Godot receives pre-computed results only.

**Sync frequency**: WorldUI values are included in the per-frame state sync batch. Only changed values are sent (dirty-flag). For a game with 10 enemies with health bars, that's ~10 numbers per frame when health changes, zero traffic when health is stable.

**Example**: Enemy with floating health bar:
```json
{
  "id": "enemy1",
  "template": "goblin",
  "transform": { "x": 5, "y": 0, "z": 3 },
  "worldUI": {
    "elements": [
      {
        "type": "health_bar",
        "offset": { "x": 0, "y": 2.0, "z": 0 },
        "width": 1.2,
        "binding": { "value": "variables.enemy1_hp", "max": "100" },
        "visibleWhen": "variables.enemy1_hp < 100"
      }
    ]
  }
}
```

### 6.5. Child Entities

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

### 6.6. Entity Creation Pipeline

```
templates["player"]  +  entities[{ template: "player", transform: {...} }]    // (sceneType: "3d")
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
  fromVisual?: boolean;          // Auto-generate from visual geometry (see rules below)

  friction?: number;
  restitution?: number;
  isSensor?: boolean;
}
```

### 8.4. `fromVisual` Rules

When `fromVisual: true`, the collider shape is auto-generated from the visual geometry. The rules depend on the visual type and physics body type:

| Visual Type | Dynamic Body | Static Body | Kinematic Body |
|-------------|-------------|-------------|----------------|
| `primitive: box` | `BoxShape3D` matching size | Same | Same |
| `primitive: sphere` | `SphereShape3D` matching radius | Same | Same |
| `primitive: cylinder` | `CylinderShape3D` matching dims | Same | Same |
| `primitive: capsule` | `CapsuleShape3D` matching dims | Same | Same |
| `voxels` | **Bounding box** `BoxShape3D` | **Compound** per-voxel boxes (up to 50; beyond that, bounding box) | Bounding box |
| `model` (GLB) | **Convex hull** `ConvexPolygonShape3D` | **Trimesh** `ConcavePolygonShape3D` | Convex hull |
| `sprite3d` | `BoxShape3D` matching billboard dims | Same | Same |
| `particles3d` | **Invalid** — validator rejects | Invalid | Invalid |

**Fallback**: If `fromVisual` fails (e.g., model hasn't loaded yet), generate a 1x1x1 `BoxShape3D` and log a warning.

**Validation**: `fromVisual: true` on a `particles3d` visual is a validation error (particles have no geometry).

### 8.5. Collision Shape Mapping

| ColliderComponent3D | Godot Shape |
|---------------------|-------------|
| `shape: 'box'` | `BoxShape3D(size)` |
| `shape: 'sphere'` | `SphereShape3D(radius)` |
| `shape: 'capsule'` | `CapsuleShape3D(radius, height)` |
| `shape: 'cylinder'` | `CylinderShape3D(radius, height)` |
| `shape: 'convex'` | `ConvexPolygonShape3D` (from mesh vertices) |
| `shape: 'trimesh'` | `ConcavePolygonShape3D` (static only) |

### 8.6. Collision Events

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
    minPolarAngle?: number;       // Degrees (converted to radians in Godot)
    maxPolarAngle?: number;       // Degrees
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

### 11.1. Scene-Type Context Flag

The QuickJS sandbox receives `sceneType` at initialization. This flag is set once when the game loads and determines the shape of all position/rotation/scale values:

```javascript
// Sandbox initialization (TypeScript side):
sandbox.setGlobal('__sceneType', definition.sceneType ?? '2d');

// ScriptContext constructor reads this flag:
class ScriptContext {
  private is3D: boolean;
  constructor() {
    this.is3D = globalThis.__sceneType === '3d';
  }
}
```

### 11.2. Vec3 in 3D Context

For 3D scenes, position/rotation/scale methods return/accept Vec3. For 2D, they return Vec2 as before. The `is3D` flag determines which bridge methods are called:

```javascript
// 2D (unchanged):
ctx.getEntityPosition('player')  // → { x: 2, y: 5 }

// 3D (when sceneType is '3d'):
ctx.getEntityPosition('player')  // → { x: 2, y: 5, z: 0 }
ctx.setEntityPosition('player', { x: 2, y: 5, z: 0 })

// Rotation returns euler Vec3 in 3D:
ctx.getEntityRotation('player')  // → { x: 0, y: 45, z: 0 }

// Scale:
ctx.getEntityScale('player')     // → { x: 1, y: 1, z: 1 }
```

**Backward compatibility**: Scripts that destructure `const { x, y } = ctx.getEntityPosition('p')` work in both 2D and 3D — `z` is simply ignored. Scripts that pass `{ x, y }` to `setEntityPosition` in 3D will default `z` to `0`.

**Implementation**: Each position method internally branches:
```javascript
getEntityPosition(id) {
  if (this.is3D) {
    return this.bridge.getPosition3D(id); // → { x, y, z }
  }
  return this.bridge.getPosition(id);     // → { x, y }
}
```

### 11.3. New 3D Methods

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

### 11.4. Backward Compatibility

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

All spatial actions/triggers gain an optional `z` field. When omitted, `z` defaults to `0`. This means all existing 2D game definitions work in 3D without modification (entities spawn at z=0).

**Full list of spatial actions and their 3D behavior:**

| Action | 2D Fields | 3D Extension | Default `z` |
|--------|-----------|-------------|-------------|
| `set_velocity` | `x`, `y` | Add optional `z` | `0` (preserves current z velocity) |
| `apply_impulse` | `x`, `y` | Add optional `z` | `0` |
| `apply_force` | `x`, `y` | Add optional `z` | `0` |
| `set_position` / `teleport` | `x`, `y` | Add optional `z` | `0` |
| `spawn` | `position: {x, y}` | `position: {x, y, z?}` | `0` |
| `move_to` | `x`, `y` | Add optional `z` | `0` |
| `set_gravity` | `x`, `y` | Add optional `z` | `0` |
| `camera_shake` | `intensity`, `duration` | Unchanged (random 3D offset in 3D mode) | N/A |
| `camera_move` | `x`, `y` | Add optional `z` | `0` |

**Spatial triggers in 3D:**

| Trigger | 2D Behavior | 3D Behavior |
|---------|------------|-------------|
| `tap` | Screen-space hit test | Screen-space raycast into 3D world |
| `drag` | 2D entity drag | 3D drag on configurable plane (see §12, dragMode3d) |
| `collision` / `sensor_enter` | Tag-based, coordinate-agnostic | Identical — tag-based matching |
| `position` (if exists) | `x`, `y` bounds check | Add optional `z` bounds |

```typescript
// Example: works in both 2D and 3D (z defaults to 0)
{ type: 'set_velocity', target: { type: 'by_tag', tag: 'ball' }, x: 0, y: 7 }

// Explicit 3D usage:
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

    _world_3d_system.setup(data.get("world", {}))
    _camera_3d.setup(data.get("camera", {}))

    var templates = data.get("templates", {})
    for entity_data in data.get("entities", []):
        _entity_factory_3d.create_entity(entity_data, templates)

    return true
```

### 13.3. Viewport3D Changes — SubViewport Decision

**Decision: Keep SubViewport, expand to fullscreen.**

Currently renders to a `Sprite2D` overlay. For full 3D games, the SubViewport expands to fill the entire screen.

**Why SubViewport instead of root Node3D:**
- **Isolation**: SubViewport gives a clean separation between the 2D shell (CanvasLayer for UI, input debug) and the 3D world. Mixing Node2D and Node3D as siblings causes z-ordering and rendering pipeline issues in Godot.
- **Existing pattern**: The current `Viewport3D.gd` already uses SubViewport — this is an expansion, not a rewrite.
- **Performance**: SubViewport overhead is negligible when it's the only viewport rendering. Godot optimizes single-SubViewport setups to near-zero overhead.
- **React overlay compatibility**: The React Native overlay sits on top of the native view. Whether Godot renders via SubViewport or root Node3D is invisible to React.

**Implementation**:
```gdscript
# In _load_game_3d:
_viewport_3d.size = get_viewport().get_visible_rect().size
_viewport_3d.render_target_update_mode = SubViewport.UPDATE_ALWAYS
# The Sprite2D displaying the SubViewport texture stretches to fill screen
_viewport_sprite.texture = _viewport_3d.get_texture()
_viewport_sprite.centered = false
_viewport_sprite.scale = Vector2.ONE  # 1:1 pixel mapping
```

### 13.4. Method Map Extension

```gdscript
# 3D Entity Management
# spawn_entity_3d(template_key: String, x: float, y: float, z: float) → String (entity_id)
"spawn_entity_3d": _entity_factory_3d.spawn_entity,
# destroy_entity_3d(entity_id: String) → void
"destroy_entity_3d": _entity_manager.destroy_entity,  # EntityManager is shared (ID-based)

# 3D Physics
# set_linear_velocity_3d(entity_id: String, x: float, y: float, z: float) → void
"set_linear_velocity_3d": _physics_controller_3d.set_velocity,
# apply_impulse_3d(entity_id: String, x: float, y: float, z: float) → void
"apply_impulse_3d": _physics_controller_3d.apply_impulse,
# apply_force_3d(entity_id: String, x: float, y: float, z: float) → void
"apply_force_3d": _physics_controller_3d.apply_force,

# 3D Transform (handled by EntityFactory3D — no separate TransformSystem module needed)
# set_position_3d(entity_id: String, x: float, y: float, z: float) → void
"set_position_3d": _entity_factory_3d.set_position,
# set_rotation_3d(entity_id: String, x: float, y: float, z: float) → void (euler degrees)
"set_rotation_3d": _entity_factory_3d.set_rotation,
# set_scale_3d(entity_id: String, x: float, y: float, z: float) → void
"set_scale_3d": _entity_factory_3d.set_scale,

# 3D Camera
# set_camera_3d_position(x: float, y: float, z: float) → void
"set_camera_3d_position": _camera_3d.set_position,
# set_camera_3d_look_at(x: float, y: float, z: float) → void
"set_camera_3d_look_at": _camera_3d.set_look_at,
# set_camera_3d_fov(fov: float) → void (degrees)
"set_camera_3d_fov": _camera_3d.set_fov,

# 3D Input
# raycast_from_screen(screen_x: float, screen_y: float) → Dictionary {entity_id, point, normal, distance} or null
"raycast_from_screen": _input_router_3d.raycast_from_screen,

# 3D Queries
# query_point_3d(x: float, y: float, z: float) → Array[String] (entity_ids)
"query_point_3d": _collision_system_3d.query_point,
# raycast_3d(from_x, from_y, from_z, to_x, to_y, to_z) → Dictionary or null
"raycast_3d": _collision_system_3d.raycast,

# 3D World UI (resolved values from TS)
# update_world_ui(entity_id: String, element_index: int, values: Dictionary) → void
"update_world_ui": _entity_factory_3d.update_world_ui,
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

The `GameSystemRunner` registers different implementations based on `sceneType`. The unified `entities`/`templates` fields mean the runner reads the same GameDefinition structure — only the system implementations differ:

- **2D** (`sceneType: "2d"`): existing `EntityManager2DSystem`, `Physics2DSystem` (unchanged)
- **3D** (`sceneType: "3d"`): new `EntityManager3DSystem`, `Physics3DSystem` (call 3D bridge methods)

`RulesSystem`, `ScriptSystem`, `StateMachineSystem`, `EventSystem` are shared — they operate on entity IDs and tags, not coordinates.

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
  "world": {
    "gravity": { "x": 0, "y": -15, "z": 0 },
    "floor": { "enabled": false },
    "sky": { "type": "gradient", "topColor": "#4A90D9", "bottomColor": "#87CEEB" },
    "lighting": "bright-day"
  },
  "camera": {
    "type": "perspective",
    "position": { "x": 0, "y": 5, "z": 12 },
    "lookAt": { "x": 0, "y": 2, "z": 0 },
    "fov": 55,
    "follow": { "target": "player", "offset": { "x": 0, "y": 3, "z": 10 }, "smoothing": 0.1, "mode": "fixed-offset" }
  },
  "variables": { "score": 0, "lives": 3 },
  "templates": {
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
  "entities": [
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

> **Implementation order**: The [UI Overlay System](./ui-overlay-system-plan.md) should be implemented **before** this 3D plan. The overlay provides the HUD/binding system that 3D games will use from day one. Implementing overlay first means 3D ships with proper game UI rather than bolting it on later.

### Phase 0: Foundation Types (1–2 days)

> **Prerequisite**: Overlay Plan Phase 1 must be complete and schema v1 frozen before starting this phase.

- [ ] Add `Vec3` to `common.ts`
- [ ] Create `world3d.ts`, `entity3d.ts`, `visual3d.ts`, `physics3d.ts`, `camera3d.ts`, `joints3d.ts`
- [ ] Add `sceneType` discriminant to `GameDefinition`
- [ ] Widen `world`, `camera`, `templates`, `entities`, `joints` to accept 3D variant types
- [ ] Add Zod validation: `sceneType: "3d"` requires 3D-shaped inner types
- [ ] Export from index, `tsc --noEmit` passes
- [ ] **Test**: Existing 2D game JSONs still validate. New 3D example JSON validates.
- **Deliverable**: Complete type system, zero runtime impact

### Phase 1: 3D Viewer Modules (2–3 days)

- [ ] Refactor `Viewport3D.gd` for fullscreen SubViewport mode
- [ ] `World3DSystem.gd` — floor, sky, lighting (presets + custom), fog setup
- [ ] `VisualRenderer3D.gd` — primitive, voxel, model creation
- [ ] `CameraController3D.gd` — perspective/ortho, follow, orbit
- [ ] **Benchmark gate**: Test SubViewport fullscreen render-to-texture on iOS + Android. If FPS < 30 or memory overhead > 50MB, switch to root Node3D rendering before proceeding to Phase 2.
- [ ] **Test**: Load a 3D game JSON with world + camera + static entities → renders correctly in Godot
- **Deliverable**: Clean 3D rendering, no game logic

### Phase 2: 3D Entity Runtime (5–7 days)

- [ ] `EntityFactory3D.gd` — create 3D bodies from definition (template merge, archetype routing)
- [ ] `PhysicsController3D.gd` — velocity, impulse, force
- [ ] `CollisionSystem3D.gd` — collision events → EventEmitter
- [ ] `InputRouter3D.gd` — screen raycast for tap/drag (XZ plane default)
- [ ] Scene-type routing in `GameBridge.load_game_json`
- [ ] TypeScript: 3D bridge methods on GodotBridge interface
- [ ] Scripting: Vec3-aware ScriptContext with `__sceneType` flag
- [ ] 3D joint support (hinge, ball, slider, fixed)
- [ ] Behaviors: add optional `z` to oscillate, follow, patrol; add 3D-specific orbit behavior
- [ ] **Test**: 3D platformer game — player moves, collects coins, physics works, rules fire, score updates
- [ ] **Test**: Existing 2D games still work identically (regression)
- **Deliverable**: Playable 3D game from GameDefinition JSON

### Phase 3: Asset Pipeline & AI (3–5 days)

- [ ] 3D asset types in pipeline (voxel_model, glb_model, texture_3d, hdri_sky)
- [ ] AI prompt templates for 3D game generation
- [ ] Voxel model generation from AI descriptions
- [ ] End-to-end: prompt → AI → 3D game
- [ ] **Test**: AI generates a valid 3D game definition that loads and plays
- **Deliverable**: AI-generated 3D games

### Phase 4: Polish & Skills (2–3 days)

- [ ] Voxel optimization (MultiMesh for 50+ voxels per entity)
- [ ] Shadow quality per platform (desktop ON, mobile OFF)
- [ ] Mobile perf profiling and optimization
- [ ] Additional camera modes if needed
- [ ] **Update game-authoring skills** (`game-authoring/game-definition-reference`, `game-authoring/scripting-api-reference`, `game-authoring/examples`) with 3D types, examples, and API methods
- [ ] **Gate**: Skills update must be reviewed before marking Phase 4 complete — AI can't generate 3D games if skills are stale
- [ ] **Test**: Full regression — all existing 2D games, all new 3D test games, AI generation pipeline

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

| Question | Decision | Rationale |
|----------|----------|-----------|
| Multi-scene? | No — single scene per definition | Simplicity for AI generation |
| Type strategy? | Unified fields with `sceneType` discriminant | No parallel duplication (see Section 4) |
| Physics engine? | GodotPhysics3D initially | Zero dependencies; swap to Jolt later if perf requires |
| Behaviors: add `z` or create 3D variants? | **Add optional `z`** to existing behavior types | Most behaviors (oscillate, rotate, follow) work with an extra axis. Keeps one behavior system. New 3D-only behaviors (e.g., orbit3d) get their own type added to the union. |
| 3D joints from day one? | **Phase 2** — ship with entity runtime | Joints are essential for interesting 3D games (hinges, ragdolls). Deferring them means re-testing entity creation later. |
| Camera orbit: touch or button? | **Configurable** — touch by default, disable via `orbit.touchEnabled: false` | Most 3D viewers want touch orbit. Games that use touch for gameplay disable it. |
| Isometric games? | **Orthographic 3D** (`camera3d.type: "orthographic"` with angled position) | True isometric is a camera angle on a 3D scene, not a 2D hack. This falls out naturally from the 3D camera system. |
| Voxel format? | **`VoxelCube[]` array** (Phase 2), compressed format deferred to Phase 4 if needed | Simple array is AI-friendly and sufficient for < 500 voxels per entity. Optimization is a Phase 4 concern. |
