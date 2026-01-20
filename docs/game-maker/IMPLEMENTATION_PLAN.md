# Implementation Plan: Physics2D Foundation

*Clean physics abstraction + Skia rendering for the game builder foundation*

## Executive Summary

| Phase | Description | Effort | Status |
|-------|-------------|--------|--------|
| **Phase 1** | Physics2D Interface | 2-3 hours | Pending |
| **Phase 2** | Box2DAdapter Implementation | 4-6 hours | Pending |
| **Phase 3** | usePhysicsWorld Hook | 2-3 hours | Pending |
| **Phase 4** | Refactor Examples | 3-4 hours | Pending |
| **Phase 5** | Documentation & Tutorials | 2-3 hours | Pending |

**Total estimated effort**: 13-19 hours

---

## Current State Analysis

### What Exists

```
app/lib/physics/
├── index.native.ts      # Entry point for iOS/Android
├── index.web.ts         # Entry point for Web  
├── Physics.native.ts    # JSI wrapper (7 lines)
├── Physics.web.ts       # WASM wrapper + monkey patches (105 lines)
└── types.ts             # Shared Box2D interfaces (140 lines)
```

### Existing Examples (8 total)

| Example | Features Demonstrated |
|---------|----------------------|
| FallingBoxes | Basic dynamic bodies, ground collision |
| Interaction | Touch spawn, body destruction, circles |
| Car | RevoluteJoints, motors, chassis+wheels |
| Bridge | Joint chains, anchors |
| Pendulum | Multi-link constraints |
| Avalanche | Many bodies performance |
| Dominoes | Chain reactions |
| NewtonsCradle | Precise elastic collisions |

### Problems to Fix

| Problem | Impact | Solution |
|---------|--------|----------|
| No abstraction | Examples call Box2D directly | Physics2D interface |
| No collision callbacks | Can't detect hits | Add to unified API |
| useState bottleneck | Slow with many bodies | SharedValue option |
| Hacky metadata | `(body as any)._radius` | Proper userData system |
| No memory management | WASM leaks | Cleanup in adapter |
| Fixed timestep | Variable frame rate issues | Configurable in hook |
| No standard hook | Each example reimplements | usePhysicsWorld |

---

## Phase 1: Physics2D Interface

**Goal**: Define a clean TypeScript interface that hides Box2D implementation details.

### Task 1.1: Core Types

**File**: `app/lib/physics2d/types.ts`

```typescript
// Branded types for type safety
export type BodyId = { __brand: 'BodyId'; value: number };
export type ColliderId = { __brand: 'ColliderId'; value: number };
export type JointId = { __brand: 'JointId'; value: number };

// Vector (2D, but structured for 3D expansion)
export interface Vec2 {
  x: number;
  y: number;
}

// Transform (3D-ready: z=0 for 2D)
export interface Transform {
  position: Vec2;
  angle: number;  // radians
}

// Body types
export type BodyType = 'static' | 'dynamic' | 'kinematic';

// Shape types we support
export type ShapeType = 'circle' | 'box' | 'polygon';

// Joint types we support (subset of Box2D)
export type JointType = 'revolute' | 'distance' | 'prismatic' | 'mouse';
```

**Success Criteria**: Types compile, no `any` usage

### Task 1.2: Body & Shape Definitions

**File**: `app/lib/physics2d/types.ts` (continued)

```typescript
export interface BodyDef {
  type: BodyType;
  position: Vec2;
  angle?: number;
  linearDamping?: number;
  angularDamping?: number;
  fixedRotation?: boolean;
  bullet?: boolean;  // CCD for fast objects
  userData?: unknown;
}

export interface ShapeDef {
  type: ShapeType;
  // Circle
  radius?: number;
  // Box
  halfWidth?: number;
  halfHeight?: number;
  // Polygon
  vertices?: Vec2[];
  // Offset from body center
  offset?: Vec2;
}

export interface FixtureDef {
  shape: ShapeDef;
  density?: number;
  friction?: number;
  restitution?: number;
  isSensor?: boolean;
}
```

**Success Criteria**: Can define any shape from existing examples

### Task 1.3: Physics2D Interface

**File**: `app/lib/physics2d/Physics2D.ts`

```typescript
export interface Physics2D {
  // World lifecycle
  createWorld(gravity: Vec2): void;
  destroyWorld(): void;
  step(dt: number, velocityIterations?: number, positionIterations?: number): void;
  
  // Bodies
  createBody(def: BodyDef): BodyId;
  destroyBody(id: BodyId): void;
  
  // Fixtures (shapes attached to bodies)
  addFixture(bodyId: BodyId, def: FixtureDef): ColliderId;
  removeFixture(id: ColliderId): void;
  setSensor(id: ColliderId, isSensor: boolean): void;
  
  // Transform access
  getTransform(id: BodyId): Transform;
  setTransform(id: BodyId, transform: Transform): void;
  
  // Velocity access
  getLinearVelocity(id: BodyId): Vec2;
  setLinearVelocity(id: BodyId, velocity: Vec2): void;
  getAngularVelocity(id: BodyId): number;
  setAngularVelocity(id: BodyId, velocity: number): void;
  
  // Forces
  applyForce(id: BodyId, force: Vec2, worldPoint?: Vec2): void;
  applyForceToCenter(id: BodyId, force: Vec2): void;
  applyImpulse(id: BodyId, impulse: Vec2, worldPoint?: Vec2): void;
  applyImpulseToCenter(id: BodyId, impulse: Vec2): void;
  applyTorque(id: BodyId, torque: number): void;
  
  // Joints
  createRevoluteJoint(def: RevoluteJointDef): JointId;
  createDistanceJoint(def: DistanceJointDef): JointId;
  createMouseJoint(def: MouseJointDef): JointId;
  destroyJoint(id: JointId): void;
  setMotorSpeed(id: JointId, speed: number): void;
  setMouseTarget(id: JointId, target: Vec2): void;
  
  // Queries
  queryPoint(point: Vec2): BodyId | null;
  queryAABB(min: Vec2, max: Vec2): BodyId[];
  raycast(origin: Vec2, direction: Vec2, maxDistance: number): RaycastHit | null;
  
  // Collision events
  onCollisionBegin(callback: CollisionCallback): () => void;
  onCollisionEnd(callback: CollisionCallback): () => void;
  onSensorBegin(callback: SensorCallback): () => void;
  onSensorEnd(callback: SensorCallback): () => void;
  
  // Body metadata
  getUserData(id: BodyId): unknown;
  setUserData(id: BodyId, data: unknown): void;
  
  // Bulk operations
  getAllBodies(): BodyId[];
  getBodiesInGroup(group: string): BodyId[];
}

export type CollisionCallback = (bodyA: BodyId, bodyB: BodyId, contact: ContactInfo) => void;
export type SensorCallback = (sensor: ColliderId, other: BodyId) => void;

export interface ContactInfo {
  point: Vec2;
  normal: Vec2;
  impulse: number;
}

export interface RaycastHit {
  bodyId: BodyId;
  point: Vec2;
  normal: Vec2;
  fraction: number;
}
```

**Success Criteria**: Interface covers all features used in existing examples

### Task 1.4: Joint Definitions

**File**: `app/lib/physics2d/types.ts` (continued)

```typescript
export interface JointDefBase {
  bodyA: BodyId;
  bodyB: BodyId;
  collideConnected?: boolean;
}

export interface RevoluteJointDef extends JointDefBase {
  anchor: Vec2;  // World coordinates
  enableLimit?: boolean;
  lowerAngle?: number;
  upperAngle?: number;
  enableMotor?: boolean;
  motorSpeed?: number;
  maxMotorTorque?: number;
}

export interface DistanceJointDef extends JointDefBase {
  anchorA: Vec2;
  anchorB: Vec2;
  length?: number;  // Auto-calculated if not provided
  stiffness?: number;
  damping?: number;
}

export interface MouseJointDef {
  body: BodyId;  // Only one body (attaches to world)
  target: Vec2;
  maxForce: number;
  stiffness?: number;
  damping?: number;
}
```

**Success Criteria**: Can express all joints from Car/Bridge/Pendulum examples

---

## Phase 2: Box2DAdapter Implementation

**Goal**: Implement Physics2D interface using Box2D (JSI native + WASM web).

### Task 2.1: Adapter Structure

**Files**:
```
app/lib/physics2d/
├── Physics2D.ts           # Interface (from Phase 1)
├── types.ts               # Types (from Phase 1)
├── Box2DAdapter.ts        # Shared implementation logic
├── Box2DAdapter.native.ts # Native-specific initialization
├── Box2DAdapter.web.ts    # Web-specific initialization  
├── index.ts               # Public exports
└── index.native.ts        # Native entry
└── index.web.ts           # Web entry
```

### Task 2.2: Body ID Management

```typescript
// Inside Box2DAdapter
class Box2DAdapter implements Physics2D {
  private nextBodyId = 1;
  private bodies = new Map<number, b2Body>();
  private bodyIdToBox2D = new Map<number, b2Body>();
  private box2DToBodyId = new WeakMap<b2Body, number>();
  
  createBody(def: BodyDef): BodyId {
    const id = this.nextBodyId++;
    const b2def = this.convertBodyDef(def);
    const body = this.world.CreateBody(b2def);
    
    this.bodies.set(id, body);
    this.box2DToBodyId.set(body, id);
    
    // Store userData on Box2D body for collision callbacks
    (body as any).__physics2d_id = id;
    (body as any).__physics2d_userData = def.userData;
    
    return { __brand: 'BodyId', value: id } as BodyId;
  }
  
  destroyBody(id: BodyId): void {
    const body = this.bodies.get(id.value);
    if (body) {
      this.world.DestroyBody(body);
      this.bodies.delete(id.value);
    }
  }
}
```

**Success Criteria**: Bodies created/destroyed correctly, IDs are stable

### Task 2.3: Collision Callbacks

```typescript
// Contact listener setup
private setupContactListener(): void {
  // Box2D contact listener pattern
  const listener = {
    BeginContact: (contact: b2Contact) => {
      const bodyA = contact.GetFixtureA().GetBody();
      const bodyB = contact.GetFixtureB().GetBody();
      
      const idA = this.getBodyId(bodyA);
      const idB = this.getBodyId(bodyB);
      
      if (idA && idB) {
        const isSensorA = contact.GetFixtureA().IsSensor();
        const isSensorB = contact.GetFixtureB().IsSensor();
        
        if (isSensorA || isSensorB) {
          this.sensorBeginCallbacks.forEach(cb => cb(/* ... */));
        } else {
          const info = this.extractContactInfo(contact);
          this.collisionBeginCallbacks.forEach(cb => cb(idA, idB, info));
        }
      }
    },
    EndContact: (contact: b2Contact) => {
      // Similar pattern
    }
  };
  
  this.world.SetContactListener(listener);
}
```

**Success Criteria**: Collision events fire correctly on both native and web

### Task 2.4: WASM Memory Management

```typescript
// Web-specific cleanup
destroyWorld(): void {
  // Destroy all bodies first
  for (const [id, body] of this.bodies) {
    this.world.DestroyBody(body);
  }
  this.bodies.clear();
  
  // WASM-specific: free the world memory
  if (typeof this.world.__destroy === 'function') {
    this.world.__destroy();
  }
  
  this.world = null;
}
```

**Success Criteria**: No memory leaks after world destruction

### Task 2.5: API Parity Testing

Create test that verifies same behavior on native and web:

```typescript
// app/lib/physics2d/__tests__/parity.test.ts
describe('Physics2D API Parity', () => {
  it('creates body at correct position', async () => {
    const physics = await createPhysics2D();
    physics.createWorld({ x: 0, y: 10 });
    
    const id = physics.createBody({
      type: 'dynamic',
      position: { x: 5, y: 5 }
    });
    
    const transform = physics.getTransform(id);
    expect(transform.position.x).toBeCloseTo(5);
    expect(transform.position.y).toBeCloseTo(5);
  });
  
  // More tests...
});
```

**Success Criteria**: All tests pass on iOS, Android, and Web

---

## Phase 3: usePhysicsWorld Hook

**Goal**: Provide a standardized React hook for physics integration.

### Task 3.1: Hook Interface

**File**: `app/lib/physics2d/usePhysicsWorld.ts`

```typescript
export interface UsePhysicsWorldOptions {
  gravity?: Vec2;
  pixelsPerMeter?: number;
  fixedTimestep?: number;  // null = use frame delta
  maxSubSteps?: number;
  velocityIterations?: number;
  positionIterations?: number;
  paused?: boolean;
}

export interface PhysicsWorldContext {
  physics: Physics2D;
  isReady: boolean;
  
  // Coordinate conversion
  toWorld: (screenX: number, screenY: number) => Vec2;
  toScreen: (worldX: number, worldY: number) => Vec2;
  worldToScreenScale: number;
  
  // Pause/resume
  setPaused: (paused: boolean) => void;
  isPaused: boolean;
}

export function usePhysicsWorld(
  options?: UsePhysicsWorldOptions
): PhysicsWorldContext;
```

### Task 3.2: Implementation

```typescript
export function usePhysicsWorld(options: UsePhysicsWorldOptions = {}): PhysicsWorldContext {
  const {
    gravity = { x: 0, y: 9.8 },
    pixelsPerMeter = 50,
    fixedTimestep = 1/60,
    maxSubSteps = 3,
    velocityIterations = 8,
    positionIterations = 3,
    paused: initialPaused = false,
  } = options;
  
  const physicsRef = useRef<Physics2D | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPaused, setIsPaused] = useState(initialPaused);
  const accumulatorRef = useRef(0);
  
  // Initialize physics
  useEffect(() => {
    let mounted = true;
    
    (async () => {
      const physics = await createPhysics2D();
      if (!mounted) return;
      
      physics.createWorld(gravity);
      physicsRef.current = physics;
      setIsReady(true);
    })();
    
    return () => {
      mounted = false;
      if (physicsRef.current) {
        physicsRef.current.destroyWorld();
        physicsRef.current = null;
      }
    };
  }, []);
  
  // Physics step
  useFrameCallback((frameInfo) => {
    if (!physicsRef.current || !isReady || isPaused) return;
    
    const dt = frameInfo.timeSincePreviousFrame 
      ? frameInfo.timeSincePreviousFrame / 1000 
      : fixedTimestep;
    
    if (fixedTimestep) {
      // Fixed timestep with accumulator
      accumulatorRef.current += Math.min(dt, fixedTimestep * maxSubSteps);
      
      while (accumulatorRef.current >= fixedTimestep) {
        physicsRef.current.step(fixedTimestep, velocityIterations, positionIterations);
        accumulatorRef.current -= fixedTimestep;
      }
    } else {
      // Variable timestep
      physicsRef.current.step(dt, velocityIterations, positionIterations);
    }
  }, true);
  
  // Coordinate conversion
  const toWorld = useCallback((screenX: number, screenY: number): Vec2 => ({
    x: screenX / pixelsPerMeter,
    y: screenY / pixelsPerMeter,
  }), [pixelsPerMeter]);
  
  const toScreen = useCallback((worldX: number, worldY: number): Vec2 => ({
    x: worldX * pixelsPerMeter,
    y: worldY * pixelsPerMeter,
  }), [pixelsPerMeter]);
  
  return {
    physics: physicsRef.current!,
    isReady,
    toWorld,
    toScreen,
    worldToScreenScale: pixelsPerMeter,
    setPaused: setIsPaused,
    isPaused,
  };
}
```

**Success Criteria**: Hook provides consistent physics stepping across examples

### Task 3.3: useBodySync Hook (Optional Performance Optimization)

For syncing many bodies efficiently using SharedValues:

```typescript
export function useBodySync(
  physics: Physics2D,
  bodyIds: BodyId[],
  pixelsPerMeter: number
): SharedValue<Transform[]> {
  const transforms = useSharedValue<Transform[]>([]);
  
  useFrameCallback(() => {
    'worklet';
    // This runs on UI thread
    transforms.value = bodyIds.map(id => {
      const t = physics.getTransform(id);
      return {
        position: {
          x: t.position.x * pixelsPerMeter,
          y: t.position.y * pixelsPerMeter,
        },
        angle: t.angle,
      };
    });
  });
  
  return transforms;
}
```

**Success Criteria**: Smooth 60fps with 100+ bodies

---

## Phase 4: Refactor Examples

**Goal**: Update existing examples to use new Physics2D abstraction.

### Task 4.1: FallingBoxes (Simplest)

Refactor first as proof of concept:

**Before** (current):
```typescript
const Box2d = await initPhysics();
const gravity = Box2d.b2Vec2(0, 9.8);
const world = Box2d.b2World(gravity);
// ... lots of Box2D-specific code
```

**After** (with Physics2D):
```typescript
const { physics, isReady, toScreen } = usePhysicsWorld();

useEffect(() => {
  if (!isReady) return;
  
  // Ground
  const ground = physics.createBody({
    type: 'static',
    position: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT - 0.5 }
  });
  physics.addFixture(ground, {
    shape: { type: 'box', halfWidth: WORLD_WIDTH / 2, halfHeight: 0.5 },
    friction: 0.6
  });
  
  // Boxes
  for (let i = 0; i < 8; i++) {
    const box = physics.createBody({
      type: 'dynamic',
      position: { x: 1 + (i % 4) * 1.5, y: 1 + Math.floor(i / 4) * 1.5 }
    });
    physics.addFixture(box, {
      shape: { type: 'box', halfWidth: 0.4, halfHeight: 0.4 },
      density: 1.0,
      friction: 0.3,
      restitution: 0.2
    });
    boxIds.current.push(box);
  }
}, [isReady]);
```

**Success Criteria**: Example works identically, code is cleaner

### Task 4.2: Interaction (Touch + Body Management)

Demonstrate:
- `physics.createBody()` on touch
- `physics.destroyBody()` for cleanup
- `physics.queryPoint()` for hit testing

### Task 4.3: Car (Joints + Motors)

Demonstrate:
- `physics.createRevoluteJoint()` with motor
- `physics.setMotorSpeed()` for control

### Task 4.4: Bridge (Joint Chains)

Demonstrate:
- Multiple joints connecting bodies
- Anchor bodies (static)

### Task 4.5: Create New Example: CollisionDemo

Demonstrate collision callbacks:
- Bodies that change color on collision
- Score counter for hits
- Sensor zones (triggers)

---

## Phase 5: Documentation

**Goal**: Clear documentation for using the physics foundation.

### Task 5.1: API Reference

**File**: `docs/game-maker/PHYSICS2D_API.md`

Document every method in Physics2D interface with examples.

### Task 5.2: Tutorial: Getting Started

**File**: `docs/game-maker/TUTORIAL_PHYSICS.md`

Step-by-step guide:
1. Setting up usePhysicsWorld
2. Creating your first body
3. Adding collision callbacks
4. Syncing with Skia rendering

### Task 5.3: Example Gallery

**File**: `docs/game-maker/EXAMPLES.md`

- Screenshot of each example
- Key concepts demonstrated
- Code snippets

### Task 5.4: Update README

Add physics section to main README.

---

## Verification Checklist

Before marking complete, verify:

| Check | Command/Method |
|-------|----------------|
| TypeScript compiles | `pnpm tsc --noEmit` |
| Examples work on iOS | `pnpm ios` + manual test |
| Examples work on Android | `pnpm android` + manual test |
| Examples work on Web | `pnpm web` + manual test |
| No console errors | Check Metro output |
| 60fps maintained | Use Flipper/profiler |
| Memory stable | Run Avalanche for 60s, check heap |

---

## File Structure After Implementation

```
app/lib/physics2d/
├── Physics2D.ts              # Main interface
├── types.ts                  # All type definitions
├── Box2DAdapter.ts           # Shared adapter logic
├── Box2DAdapter.native.ts    # Native initialization
├── Box2DAdapter.web.ts       # Web initialization + patches
├── usePhysicsWorld.ts        # Main hook
├── useBodySync.ts            # Performance optimization hook
├── createPhysics2D.ts        # Factory function
├── createPhysics2D.native.ts # Native factory
├── createPhysics2D.web.ts    # Web factory
├── index.ts                  # Public exports
└── __tests__/
    └── parity.test.ts        # Cross-platform tests

app/components/examples/
├── FallingBoxes.tsx          # Refactored
├── Interaction.tsx           # Refactored
├── Car.tsx                   # Refactored
├── Bridge.tsx                # Refactored
├── CollisionDemo.tsx         # NEW
└── ... (others)

docs/game-maker/
├── PHYSICS2D_API.md          # NEW
├── TUTORIAL_PHYSICS.md       # NEW
└── EXAMPLES.md               # NEW
```

---

## Dependency Order

```
Phase 1.1 → 1.2 → 1.3 → 1.4  (Types must be complete first)
    ↓
Phase 2.1 → 2.2 → 2.3 → 2.4 → 2.5  (Adapter needs types)
    ↓
Phase 3.1 → 3.2 → 3.3  (Hook needs adapter)
    ↓
Phase 4.1 → 4.2 → 4.3 → 4.4 → 4.5  (Examples need hook)
    ↓
Phase 5.1 → 5.2 → 5.3 → 5.4  (Docs need working examples)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Box2D API differences break adapter | Extensive monkey-patching already exists; expand as needed |
| Collision callbacks differ JSI/WASM | Test both platforms early in Phase 2.3 |
| Performance regression | Benchmark before/after; SharedValue optimization available |
| Breaking existing examples | Keep old code until new version verified |

---

## Next Steps

1. **Review this plan** - Confirm scope is correct
2. **Start Phase 1** - Define types and interface
3. **Iterate** - Each phase builds on previous

Ready to begin implementation when approved.
