# 2D + 3D Physics Strategy

*Decision document for supporting both 2D and 3D physics in the AI-powered game maker*

## Executive Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **2D Physics** | Keep Box2D | Working, battle-tested, cross-platform |
| **3D Physics** | Add later as separate backend | Not urgent; react-native-rapier isn't ready |
| **Architecture** | Two sibling interfaces, not one abstraction | Avoids lowest-common-denominator API |
| **3D Rendering** | react-three-fiber / expo-three (later) | Skia is 2D only; accept separate renderers |

---

## The Core Insight

**Don't try to unify 2D and 3D into one "Physics" abstraction.**

Instead:
- `Physics2D` (Box2D) - what we ship now
- `Physics3D` (TBD) - added later as a sibling
- Shared concepts above both: entities, transforms, events, queries

This avoids the trap of a huge abstraction that fits neither well.

---

## Current State

### What Works (Keep It)

| Component | Technology | Status |
|-----------|------------|--------|
| 2D Rendering | React Native Skia | ✅ Working |
| 2D Physics (Native) | react-native-box2d (JSI) | ✅ Working |
| 2D Physics (Web) | box2d-wasm | ✅ Working |
| Game Loop | Reanimated useFrameCallback | ✅ Working |
| API Adapter | Custom unified interface | ✅ Working |

### What We Discovered About Rapier

| Aspect | Finding |
|--------|---------|
| **react-native-rapier** | EXISTS but experimental |
| **npm status** | NOT published |
| **Commits** | Only 12 |
| **Last activity** | November 2024 |
| **Dimension** | Wraps **rapier3d** (3D only) |
| **Web support** | None evident |
| **Production ready** | NO |

### Why Not Switch to Rapier Now

1. **Not production-ready** - 12 commits, not on npm, no releases
2. **Wraps 3D only** - "2D in 3D engine" leaks complexity everywhere
3. **No web support** - We'd lose web platform
4. **Maintenance burden** - We'd become physics backend maintainers
5. **Kids product risk** - Can't bet product on experimental library

---

## Recommended Architecture

### Layer Separation

```
┌─────────────────────────────────────────────────────────────────────┐
│                     GAME MAKER / EDITOR / AI                        │
│                                                                     │
│  - Entity definitions (JSON)                                        │
│  - Behaviors (declarative)                                          │
│  - Rules (win/lose)                                                 │
│  - AI prompt → game generation                                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SIMULATION CORE (Shared)                        │
│                                                                     │
│  - Entity/Component state                                           │
│  - Transform (position.x, y, z - z=0 for 2D)                       │
│  - Collision layers                                                 │
│  - Event bus (collision begin/end, sensor, etc.)                   │
│  - Game loop: input → forces → step → sync → render                │
└─────────────────────────────────────────────────────────────────────┘
                │                               │
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│       Physics2D           │   │       Physics3D           │
│       (Now)               │   │       (Later)             │
│                           │   │                           │
│  - Box2D Adapter          │   │  - cannon-es (first)      │
│  - JSI (native)           │   │  - Rapier (when ready)    │
│  - WASM (web)             │   │  - JS or JSI              │
└───────────────────────────┘   └───────────────────────────┘
                │                               │
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│       Renderer2D          │   │       Renderer3D          │
│       (Now)               │   │       (Later)             │
│                           │   │                           │
│  - React Native Skia      │   │  - react-three-fiber     │
│  - Reads Transform+Sprite │   │  - expo-three             │
│  - 2D shapes, images      │   │  - Reads Transform+Model  │
└───────────────────────────┘   └───────────────────────────┘
```

### Key Principles

1. **Gameplay code never talks to Box2D directly** - Always through `Physics2D` interface
2. **Transform is 3D-ready** - `{x, y, z}` even when z=0
3. **Two renderers, not one abstraction** - Skia (2D) and R3F (3D) are siblings
4. **Capabilities-driven** - Backends declare what they support
5. **Consistent units** - Define world units at boundary, convert at render

---

## Physics2D Interface (Minimal but Complete)

```typescript
// Types
type BodyId = { __brand: 'BodyId'; value: number };
type ColliderId = { __brand: 'ColliderId'; value: number };
type JointId = { __brand: 'JointId'; value: number };

interface Vec2 { x: number; y: number; }

type BodyType = 'static' | 'dynamic' | 'kinematic';
type ShapeType = 'circle' | 'box' | 'capsule' | 'polygon';
type JointType = 'revolute' | 'distance' | 'prismatic' | 'weld';

// World lifecycle
interface Physics2D {
  // Lifecycle
  createWorld(gravity: Vec2): void;
  destroyWorld(): void;
  step(dt: number): void;
  
  // Bodies
  createBody(def: BodyDef): BodyId;
  destroyBody(id: BodyId): void;
  getTransform(id: BodyId): Transform2D;
  setTransform(id: BodyId, transform: Transform2D): void;
  getVelocity(id: BodyId): Vec2;
  setVelocity(id: BodyId, velocity: Vec2): void;
  applyForce(id: BodyId, force: Vec2, wake?: boolean): void;
  applyImpulse(id: BodyId, impulse: Vec2, wake?: boolean): void;
  
  // Colliders/Shapes
  createCollider(bodyId: BodyId, def: ColliderDef): ColliderId;
  destroyCollider(id: ColliderId): void;
  setSensor(id: ColliderId, isSensor: boolean): void;
  
  // Joints (only ones we expose in kid UI)
  createJoint(def: JointDef): JointId;
  destroyJoint(id: JointId): void;
  
  // Queries
  raycast(origin: Vec2, direction: Vec2, maxDistance: number): RaycastHit | null;
  overlapCircle(center: Vec2, radius: number): BodyId[];
  overlapBox(center: Vec2, halfExtents: Vec2): BodyId[];
  pointQuery(point: Vec2): BodyId | null;
  
  // Events (subscribe/unsubscribe)
  onCollisionBegin(callback: (a: BodyId, b: BodyId) => void): () => void;
  onCollisionEnd(callback: (a: BodyId, b: BodyId) => void): () => void;
  onSensorBegin(callback: (sensor: ColliderId, other: BodyId) => void): () => void;
  onSensorEnd(callback: (sensor: ColliderId, other: BodyId) => void): () => void;
  
  // Capabilities
  readonly capabilities: Physics2DCapabilities;
}

interface Physics2DCapabilities {
  hasContinuousCollision: boolean;
  hasPolygonShapes: boolean;
  hasJoint(type: JointType): boolean;
  maxPolygonVertices: number;
}

interface Transform2D {
  position: Vec2;
  angle: number;  // radians
}

interface BodyDef {
  type: BodyType;
  position: Vec2;
  angle?: number;
  linearDamping?: number;
  angularDamping?: number;
  fixedRotation?: boolean;
  bullet?: boolean;
  userData?: unknown;
}

interface ColliderDef {
  shape: ShapeDef;
  density?: number;
  friction?: number;
  restitution?: number;
  isSensor?: boolean;
  collisionLayer?: number;
  collisionMask?: number;
}

type ShapeDef = 
  | { type: 'circle'; radius: number; offset?: Vec2 }
  | { type: 'box'; halfWidth: number; halfHeight: number; offset?: Vec2 }
  | { type: 'capsule'; halfHeight: number; radius: number }
  | { type: 'polygon'; vertices: Vec2[] };

interface JointDef {
  type: JointType;
  bodyA: BodyId;
  bodyB: BodyId;
  anchorA?: Vec2;
  anchorB?: Vec2;
  // Type-specific options...
}

interface RaycastHit {
  bodyId: BodyId;
  point: Vec2;
  normal: Vec2;
  fraction: number;
}
```

### Why This Interface

1. **Engine-owned IDs** - `BodyId`, `ColliderId`, not Box2D objects leaking out
2. **Minimal surface** - Only what kid-facing tool needs
3. **Capability-driven** - Backend declares what it supports
4. **Event-based** - Clean subscription model for collision callbacks
5. **Query support** - Raycast, overlap, point queries for gameplay

---

## Transform: 3D-Ready Now

```typescript
// Simulation uses 3D transform internally
interface Transform {
  position: { x: number; y: number; z: number };  // z=0 for 2D
  rotation: {
    // Store both representations internally
    angle: number;  // 2D rotation (radians around Z)
    quat: { x: number; y: number; z: number; w: number };  // 3D quaternion
  };
  scale: { x: number; y: number; z: number };  // z=1 for 2D
}

// Helpers
function transform2D(x: number, y: number, angle: number = 0): Transform {
  return {
    position: { x, y, z: 0 },
    rotation: { 
      angle, 
      quat: quaternionFromEuler(0, 0, angle) 
    },
    scale: { x: 1, y: 1, z: 1 }
  };
}

function transform3D(
  position: { x: number; y: number; z: number },
  rotation: { x: number; y: number; z: number; w: number }
): Transform {
  return {
    position,
    rotation: { 
      angle: eulerZFromQuaternion(rotation), 
      quat: rotation 
    },
    scale: { x: 1, y: 1, z: 1 }
  };
}
```

---

## 3D Strategy: When We Get There

### Phase 1: Feasibility Spike (Time-boxed)

Questions to answer:
1. Can we run a simple R3F scene on iOS/Android/Web?
2. Can we step a simple 3D physics world and sync transforms?
3. What's the performance envelope on mid-tier devices?

### Phase 2: First 3D Backend

**Recommended: cannon-es**

| Aspect | cannon-es |
|--------|-----------|
| **Type** | Pure JavaScript |
| **Platforms** | iOS, Android, Web - all work |
| **Integration** | Easiest - no native builds |
| **Performance** | Good enough for kids games |
| **Accuracy** | Less than Rapier, but sufficient |

Why cannon-es first:
- Fastest path to "3D works"
- No native build complexity
- Can migrate to Rapier later if needed

### Phase 3: Rapier (If/When Ready)

Only consider when:
- react-native-rapier publishes to npm
- Has stable releases (v1.0+)
- Has web support
- We can afford maintenance burden

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Box2D types leak into gameplay code | Refactor now to use Physics2D interface |
| Over-abstraction | Keep 2D and 3D as siblings, not unified |
| Units inconsistency | Define world units at boundary |
| 3D becomes urgent | Have feasibility spike ready to execute |
| Rapier never matures | cannon-es is viable alternative |

---

## Next Steps (Prioritized)

### Immediate (This Week)

1. **Define Physics2D interface** in TypeScript
2. **Create Box2DAdapter** implementing Physics2D
3. **Refactor existing code** to use Physics2D, not Box2D directly
4. **Add collision events** to the adapter

### Short-term (Next 2 Weeks)

5. **Update Transform type** to be 3D-ready (z=0 for 2D)
6. **Add capabilities mechanism** 
7. **Document the game loop contract**:
   ```
   input → user forces → physics.step(dt) → sync transforms → render
   ```

### Medium-term (When 3D Needed)

8. **3D feasibility spike** (time-boxed)
9. **Define Physics3D interface** (parallel structure to Physics2D)
10. **Integrate cannon-es** as first Physics3D backend
11. **Integrate R3F/expo-three** as Renderer3D

### Long-term (If Required)

12. **Evaluate Rapier maturity** periodically
13. **Fork/own Rapier bindings** only if cannon-es is insufficient

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Jan 2026 | Keep Box2D for 2D | Working, battle-tested, cross-platform |
| Jan 2026 | Don't switch to Rapier now | Not production-ready, no npm, no web |
| Jan 2026 | Two interfaces (2D/3D), not one | Avoids bad abstraction |
| Jan 2026 | cannon-es for first 3D | Simplest cross-platform path |
| Jan 2026 | Transform is 3D-ready | Future-proofing with minimal cost |

---

## Appendix: react-native-rapier Details

**Repository**: https://github.com/callstack/react-native-rapier

**Technical approach**:
- Uses `wasm2c` to compile Rapier WASM to C
- Then wraps with JSI bindings
- Generated file: `rapier_wasm3d_bg.c` (21MB!)

**Evidence it's 3D**:
```c
// From rapier_wasm3d_bg.h
u32 w2c_rapier__wasm3d__bg_rawvector_new(
  w2c_rapier__wasm3d__bg*, 
  f32,  // x
  f32,  // y  
  f32   // z  ← 3 components = 3D
);
```

**What's missing**:
- npm package publication
- Release tags
- Web support
- 2D variant
- Documentation
- Community adoption

**Watch for**: When/if Callstack publishes to npm with stable releases.
