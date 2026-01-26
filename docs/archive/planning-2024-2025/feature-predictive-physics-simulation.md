# Feature: Predictive Physics Simulation (Trajectory Preview)

## Overview

Implement a trajectory preview system that shows the **exact predicted path** of a physics object (e.g., ball in Peggle) before it's launched. The preview must account for gravity, bounces off walls/pegs, and any other collision interactions—not just a simple raycast line.

## Why Not Raycast?

The original `feature-trajectory-preview.md` proposed iterative raycasting. This approach is **insufficient** because:

1. **Raycasts are straight lines** - They don't account for gravity arcs
2. **Bounce reflection is approximate** - Real physics involves friction, restitution, angular momentum
3. **Complex collisions diverge** - Multiple bounces compound errors quickly
4. **Doesn't match actual gameplay** - Players lose trust when preview doesn't match reality

**The solution**: Run an actual Box2D physics simulation in a separate "shadow world" to predict the exact trajectory.

---

## Architecture: Shadow World Approach

### Core Concept

Maintain a **persistent secondary Box2D world** (the "prediction world") that mirrors the static geometry of the main game world. During aiming, simulate the ball forward in this prediction world to extract its trajectory.

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Game World                         │
│  - All entities (dynamic, static, kinematic)                │
│  - Real-time simulation                                      │
│  - Collision events trigger game logic                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Sync static geometry
                              │ (on level load, peg destruction)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Prediction World                          │
│  - Static geometry only (walls, pegs)                       │
│  - Single dynamic body: the predicted ball                  │
│  - Stepped forward N times per frame during drag            │
│  - Positions sampled to create trajectory dots              │
└─────────────────────────────────────────────────────────────┘
```

### Why This Approach?

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Shadow World** | Exact physics, industry standard, debuggable | Memory for second world, sync complexity | **Recommended** |
| State Snapshot + Restore | Single world instance | Box2D doesn't support natively, complex to implement correctly | Not practical |
| Lightweight Clone | Simpler than full clone | Still complex, partial accuracy | Subsumed by Shadow World |
| Hybrid Raycast + Physics | Potentially faster | Complex, doesn't match real physics | Not recommended |

**Industry precedent**: This is how Angry Birds, Peggle, and similar games implement trajectory preview.

---

## Implementation Plan

### Phase 1: Prediction World Infrastructure

#### 1.1 Create `PredictionPhysics` Class

```typescript
// app/lib/game-engine/trajectory/PredictionPhysics.ts

export interface PredictionConfig {
  gravity: Vec2;
  pixelsPerMeter: number;
  fixedTimestep: number;        // Must match main world (e.g., 1/60)
  velocityIterations: number;   // Must match main world
  positionIterations: number;   // Must match main world
}

export class PredictionPhysics {
  private physics: Physics2D;
  private ballBodyId: BodyId | null = null;
  private staticBodies: Map<string, BodyId> = new Map();
  
  constructor(config: PredictionConfig) {
    // Create separate Box2D world instance
  }
  
  // Sync static geometry from game definition
  syncStaticGeometry(entities: RuntimeEntity[], templates: Record<string, EntityTemplate>): void;
  
  // Remove a body (e.g., when peg is destroyed)
  removeBody(entityId: string): void;
  
  // Predict trajectory from start position with initial velocity
  predict(
    startPos: Vec2,
    velocity: Vec2,
    ballConfig: BallConfig,
    options: PredictionOptions
  ): TrajectoryPoint[];
  
  dispose(): void;
}
```

#### 1.2 Define Trajectory Types

```typescript
// shared/src/types/trajectory.ts

export interface TrajectoryPoint {
  x: number;
  y: number;
  time: number;           // Seconds from launch
  velocity: Vec2;         // Velocity at this point
  collisionType?: 'wall' | 'peg' | 'bounce';  // Optional: what caused direction change
}

export interface PredictionOptions {
  maxSteps: number;       // Max simulation steps (default: 120 = 2 seconds at 60Hz)
  sampleInterval: number; // Sample every N steps (default: 2-4)
  stopOnCollision?: string[];  // Stop prediction when hitting these tags
  maxBounces?: number;    // Stop after N bounces
}

export interface BallConfig {
  radius: number;
  density: number;
  friction: number;
  restitution: number;
  bullet: boolean;        // CCD for fast objects
}
```

#### 1.3 Extend Physics2D Interface (Optional)

If we want prediction to be a first-class feature of the physics system:

```typescript
// app/lib/physics2d/Physics2D.ts

export interface Physics2D {
  // ... existing methods ...
  
  // Create a lightweight clone for prediction (static bodies only)
  createPredictionWorld?(): Physics2D;
  
  // Get all static body definitions for cloning
  getStaticBodyDefs?(): BodyDef[];
}
```

### Phase 2: Trajectory Calculation

#### 2.1 Prediction Algorithm

```typescript
predict(startPos: Vec2, velocity: Vec2, ballConfig: BallConfig, options: PredictionOptions): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  const dt = this.config.fixedTimestep;
  
  // Reset or create ball body
  if (!this.ballBodyId) {
    this.ballBodyId = this.physics.createBody({
      type: 'dynamic',
      position: startPos,
      bullet: ballConfig.bullet,
      allowSleep: false,
    });
    this.physics.addFixture(this.ballBodyId, {
      shape: { type: 'circle', radius: ballConfig.radius },
      density: ballConfig.density,
      friction: ballConfig.friction,
      restitution: ballConfig.restitution,
    });
  } else {
    // Reset existing ball
    this.physics.setTransform(this.ballBodyId, { position: startPos, angle: 0 });
    this.physics.setLinearVelocity(this.ballBodyId, velocity);
    this.physics.setAngularVelocity(this.ballBodyId, 0);
  }
  
  // Initial point
  points.push({
    x: startPos.x,
    y: startPos.y,
    time: 0,
    velocity: { ...velocity },
  });
  
  // Simulate forward
  let bounceCount = 0;
  for (let step = 0; step < options.maxSteps; step++) {
    this.physics.step(dt, this.config.velocityIterations, this.config.positionIterations);
    
    // Sample position at intervals
    if (step % options.sampleInterval === 0) {
      const transform = this.physics.getTransform(this.ballBodyId);
      const vel = this.physics.getLinearVelocity(this.ballBodyId);
      
      points.push({
        x: transform.position.x,
        y: transform.position.y,
        time: (step + 1) * dt,
        velocity: vel,
      });
    }
    
    // Check for stop conditions (collision detection would go here)
    // This requires collision callbacks in the prediction world
  }
  
  return points;
}
```

#### 2.2 Sync Strategy

```typescript
// Called on level load and when geometry changes
syncStaticGeometry(entities: RuntimeEntity[], templates: Record<string, EntityTemplate>): void {
  // Clear existing static bodies
  for (const [id, bodyId] of this.staticBodies) {
    this.physics.destroyBody(bodyId);
  }
  this.staticBodies.clear();
  
  // Recreate from entities
  for (const entity of entities) {
    if (!entity.physics) continue;
    if (entity.physics.bodyType !== 'static' && entity.physics.bodyType !== 'kinematic') continue;
    
    // Skip sensors that don't affect ball trajectory (like drain zones)
    if (entity.physics.isSensor && !entity.tags.includes('affects-trajectory')) continue;
    
    const bodyId = this.physics.createBody({
      type: entity.physics.bodyType,
      position: { x: entity.transform.x, y: entity.transform.y },
      angle: entity.transform.angle,
    });
    
    this.physics.addFixture(bodyId, {
      shape: this.getShapeFromPhysics(entity.physics),
      friction: entity.physics.friction,
      restitution: entity.physics.restitution,
      isSensor: entity.physics.isSensor,
    });
    
    this.staticBodies.set(entity.id, bodyId);
  }
}
```

### Phase 3: Rendering

#### 3.1 TrajectoryRenderer Component

```typescript
// app/lib/game-engine/renderers/TrajectoryRenderer.tsx

import { Circle, Path, Group } from '@shopify/react-native-skia';

interface TrajectoryRendererProps {
  points: TrajectoryPoint[];
  pixelsPerMeter: number;
  config: TrajectoryRenderConfig;
}

interface TrajectoryRenderConfig {
  dotRadius: number;          // Default: 3 pixels
  dotSpacing: number;         // Min distance between dots in meters
  color: string;              // Default: "rgba(255,255,255,0.6)"
  fadeStart: number;          // Start fading at this point index
  fadeEnd: number;            // Fully transparent at this point index
  maxDots: number;            // Cap number of rendered dots
}

export function TrajectoryRenderer({ points, pixelsPerMeter, config }: TrajectoryRendererProps) {
  // Filter points to ensure minimum spacing
  const filteredPoints = filterBySpacing(points, config.dotSpacing);
  
  // Limit to maxDots
  const renderPoints = filteredPoints.slice(0, config.maxDots);
  
  return (
    <Group>
      {renderPoints.map((point, index) => {
        const opacity = calculateFade(index, config.fadeStart, config.fadeEnd);
        return (
          <Circle
            key={index}
            cx={point.x * pixelsPerMeter}
            cy={point.y * pixelsPerMeter}
            r={config.dotRadius}
            color={config.color}
            opacity={opacity}
          />
        );
      })}
    </Group>
  );
}
```

### Phase 4: Integration with GameRuntime

#### 4.1 Add to GameRuntime State

```typescript
// In GameRuntime.native.tsx

const predictionPhysicsRef = useRef<PredictionPhysics | null>(null);
const [trajectoryPoints, setTrajectoryPoints] = useState<TrajectoryPoint[]>([]);

// Initialize prediction world after main world
useEffect(() => {
  if (physicsRef.current && gameRef.current) {
    const predictionPhysics = new PredictionPhysics({
      gravity: definition.world.gravity,
      pixelsPerMeter: definition.world.pixelsPerMeter,
      fixedTimestep: 1/60,
      velocityIterations: 8,
      positionIterations: 3,
    });
    
    // Sync static geometry
    predictionPhysics.syncStaticGeometry(
      gameRef.current.entityManager.getActiveEntities(),
      definition.templates
    );
    
    predictionPhysicsRef.current = predictionPhysics;
  }
  
  return () => {
    predictionPhysicsRef.current?.dispose();
  };
}, [definition]);
```

#### 4.2 Update During Drag

```typescript
// In useGameInput or handleTouchMove
const updateTrajectoryPreview = useCallback((touchWorldPos: Vec2) => {
  const prediction = predictionPhysicsRef.current;
  const cannon = gameRef.current?.entityManager.getEntity('cannon');
  
  if (!prediction || !cannon) return;
  
  // Calculate launch velocity (same logic as fire_ball rule)
  const cannonPos = { x: cannon.transform.x, y: cannon.transform.y };
  const direction = normalize(subtract(touchWorldPos, cannonPos));
  const launchVelocity = scale(direction, LAUNCH_FORCE);
  
  // Get ball config from template
  const ballTemplate = definition.templates.ball;
  const ballConfig: BallConfig = {
    radius: ballTemplate.physics.radius,
    density: ballTemplate.physics.density,
    friction: ballTemplate.physics.friction,
    restitution: ballTemplate.physics.restitution,
    bullet: ballTemplate.physics.bullet ?? false,
  };
  
  // Predict trajectory
  const points = prediction.predict(cannonPos, launchVelocity, ballConfig, {
    maxSteps: 120,      // 2 seconds
    sampleInterval: 3,  // ~40 dots
  });
  
  setTrajectoryPoints(points);
}, [definition]);
```

#### 4.3 Sync on Geometry Changes

```typescript
// When a peg is destroyed, update prediction world
const handleEntityDestroyed = useCallback((entityId: string) => {
  predictionPhysicsRef.current?.removeBody(entityId);
}, []);

// Subscribe to entity destruction events
useEffect(() => {
  const unsub = gameRef.current?.entityManager.onEntityDestroyed(handleEntityDestroyed);
  return () => unsub?.();
}, [handleEntityDestroyed]);
```

---

## Configuration

### Game Definition Extension

```typescript
// shared/src/types/GameDefinition.ts

export interface TrajectoryPreviewConfig {
  enabled: boolean;
  maxSteps?: number;           // Default: 120
  sampleInterval?: number;     // Default: 3
  dotRadius?: number;          // Default: 3
  dotSpacing?: number;         // Default: 0.2 meters
  color?: string;              // Default: "rgba(255,255,255,0.6)"
  fadeStart?: number;          // Default: 20
  fadeEnd?: number;            // Default: 40
  showOnDrag?: boolean;        // Default: true
  showOnHover?: boolean;       // Default: false (web only)
}

export interface UIConfig {
  // ... existing fields ...
  trajectoryPreview?: TrajectoryPreviewConfig;
}
```

### Example Usage in Peggle

```typescript
ui: {
  // ... existing config ...
  trajectoryPreview: {
    enabled: true,
    maxSteps: 120,
    sampleInterval: 3,
    dotRadius: 4,
    color: "rgba(255, 255, 255, 0.5)",
    fadeStart: 15,
    fadeEnd: 35,
    showOnDrag: true,
  },
},
```

---

## Performance Considerations

### Budget

| Metric | Target | Notes |
|--------|--------|-------|
| Prediction time | < 2ms/frame | Desktop target |
| Memory overhead | ~1-2MB | Second Box2D world |
| Dots rendered | 30-50 | More causes visual clutter |

### Optimizations

1. **Persistent prediction world** - Don't recreate every frame
2. **Lazy sync** - Only update prediction world when geometry actually changes
3. **Early termination** - Stop simulation when ball exits bounds or hits specific targets
4. **Throttled updates** - Don't recalculate every frame, use requestAnimationFrame throttling
5. **Web Worker** (future) - Move prediction to background thread

### Performance Monitoring

```typescript
const startTime = performance.now();
const points = prediction.predict(...);
const elapsed = performance.now() - startTime;

if (elapsed > 2) {
  console.warn(`[Trajectory] Prediction took ${elapsed.toFixed(1)}ms`);
}
```

---

## Edge Cases

### 1. Moving Objects (Kinematic Bodies)

For objects like the moving bucket in Peggle:
- **Option A**: Ignore them in prediction (simpler, slightly inaccurate)
- **Option B**: Sync their current position each frame (more accurate, more complex)

Recommendation: Start with Option A, add Option B if needed.

### 2. Teleporters

If the ball can teleport:
- Add collision detection in prediction world
- When ball hits teleporter, manually set position to exit portal
- Continue simulation from new position

### 3. Time Scale

If game has slow-motion:
- Prediction should use **real-time** physics, not scaled time
- The preview shows where the ball *will* go, not how fast

### 4. Multiple Balls

If game supports multi-ball:
- Either predict only the "primary" ball
- Or run separate predictions for each (expensive)

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `app/lib/game-engine/trajectory/PredictionPhysics.ts` | Shadow world management |
| `app/lib/game-engine/trajectory/index.ts` | Exports |
| `app/lib/game-engine/renderers/TrajectoryRenderer.tsx` | Skia dotted line renderer |
| `shared/src/types/trajectory.ts` | Type definitions |

### Modified Files

| File | Changes |
|------|---------|
| `shared/src/types/GameDefinition.ts` | Add `TrajectoryPreviewConfig` to `UIConfig` |
| `app/lib/game-engine/GameRuntime.native.tsx` | Initialize prediction, render trajectory |
| `app/lib/game-engine/hooks/useGameInput.ts` | Calculate trajectory during drag |

---

## Success Criteria

- [ ] Trajectory preview appears during drag/aim
- [ ] Preview accurately predicts ball path (matches actual trajectory when fired)
- [ ] Preview updates in real-time as aim changes
- [ ] Preview accounts for gravity (curved path)
- [ ] Preview shows bounces off walls and pegs
- [ ] Preview disappears after ball is fired
- [ ] Performance stays under 2ms per frame
- [ ] Preview syncs when pegs are destroyed
- [ ] Configurable via game definition

---

## Complexity: Medium-High

- **Core implementation**: 2-3 days
- **Polish and edge cases**: 1-2 days
- **Testing and tuning**: 1 day

Total estimate: **4-6 days**

---

## References

- [Box2D Manual - World](https://box2d.org/documentation/md__d_1__git_hub_box2d_docs_dynamics.html#autotoc_md61)
- [Angry Birds trajectory implementation discussion](https://gamedev.stackexchange.com/questions/17467/how-to-implement-a-trajectory-prediction-for-a-projectile)
- Oracle architecture consultation (2026-01-23)
