# Technical Primitives

This document defines the core building blocks required across all 2D games. These primitives form the foundation that templates and AI generation build upon.

---

## Overview

Every game requires four categories of primitives:

| Category | Purpose | Technology |
|----------|---------|------------|
| **Visual** | What players see | React Native Skia |
| **Physics** | How objects move and collide | Box2D / Planck.js |
| **Gameplay** | Game logic and mechanics | Custom systems |
| **Structural** | Architecture and organization | ECS-lite pattern |

---

## Visual Primitives (Skia)

### Sprites

#### Static Sprites
```tsx
import { Image, useImage } from '@shopify/react-native-skia';

const StaticSprite = ({ x, y, width, height, source }) => {
  const image = useImage(source);
  if (!image) return null;
  
  return (
    <Image
      image={image}
      x={x}
      y={y}
      width={width}
      height={height}
    />
  );
};
```

#### Animated Sprites (Frame-based)
```tsx
import { useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

const AnimatedSprite = ({ frames, fps, x, y, width, height }) => {
  const frameIndex = useSharedValue(0);
  
  useEffect(() => {
    const frameDuration = 1000 / fps;
    frameIndex.value = withRepeat(
      withTiming(frames.length - 1, { duration: frameDuration * frames.length }),
      -1, // infinite
      false
    );
  }, [frames, fps]);
  
  // Use Atlas for efficient frame rendering
  return (
    <Atlas
      image={spriteSheet}
      sprites={[frames[Math.floor(frameIndex.value)]]}
      transforms={[{ translate: [x, y] }]}
    />
  );
};
```

#### Atlas (Critical for Performance)
The Atlas component batch-renders hundreds of sprites from a single texture in one draw call.

```tsx
import { Atlas, rect, useRSXformBuffer } from '@shopify/react-native-skia';

const BatchedSprites = ({ spriteSheet, sprites }) => {
  // sprites = [{ x, y, rotation, srcX, srcY, srcW, srcH }, ...]
  
  const transforms = useRSXformBuffer(sprites.length, (val, i) => {
    const sprite = sprites[i];
    val.set(
      Math.cos(sprite.rotation), // scos
      Math.sin(sprite.rotation), // ssin
      sprite.x,                   // tx
      sprite.y                    // ty
    );
  });
  
  const sourceRects = sprites.map(s => 
    rect(s.srcX, s.srcY, s.srcW, s.srcH)
  );
  
  return (
    <Atlas
      image={spriteSheet}
      sprites={sourceRects}
      transforms={transforms}
    />
  );
};
```

### Backgrounds

#### Solid Color
```tsx
<Fill color="#1a1a2e" />
```

#### Tiled Pattern
```tsx
const TiledBackground = ({ tile, width, height }) => {
  const tileWidth = tile.width();
  const tileHeight = tile.height();
  
  const tiles = [];
  for (let y = 0; y < height; y += tileHeight) {
    for (let x = 0; x < width; x += tileWidth) {
      tiles.push({ x, y });
    }
  }
  
  return tiles.map((pos, i) => (
    <Image key={i} image={tile} x={pos.x} y={pos.y} />
  ));
};
```

#### Parallax Layers
```tsx
const ParallaxBackground = ({ layers, cameraX }) => {
  // layers = [{ image, depth, y }, ...]
  // depth: 0 = moves with camera, 1 = stationary, 0.5 = half speed
  
  return layers.map((layer, i) => {
    const offsetX = -cameraX * (1 - layer.depth);
    return (
      <Image
        key={i}
        image={layer.image}
        x={offsetX % layer.image.width()}
        y={layer.y}
      />
    );
  });
};
```

### Text & UI

```tsx
import { Text, matchFont } from '@shopify/react-native-skia';

const ScoreDisplay = ({ score, x, y }) => {
  const font = matchFont({ fontFamily: 'System', fontSize: 24, fontWeight: 'bold' });
  
  return (
    <Text
      x={x}
      y={y}
      text={`Score: ${score}`}
      font={font}
      color="white"
    />
  );
};
```

### Particle Systems

```tsx
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const ParticleEmitter = ({ particles, onUpdate }) => {
  useFrameCallback((info) => {
    const dt = info.timeSincePreviousFrame / 1000;
    onUpdate(dt); // Update particle positions, remove dead particles
  });
  
  return particles.map((p, i) => {
    const alpha = p.life / p.maxLife;
    return (
      <Circle
        key={i}
        cx={p.x}
        cy={p.y}
        r={p.size * alpha}
        color={p.color}
        opacity={alpha}
      />
    );
  });
};
```

---

## Physics Primitives (Box2D)

### Body Types

| Type | Value | Description | Use Case |
|------|-------|-------------|----------|
| **Static** | 0 | Never moves, infinite mass | Ground, walls, platforms |
| **Kinematic** | 1 | Moves by velocity, ignores forces | Moving platforms, elevators |
| **Dynamic** | 2 | Fully simulated | Players, enemies, projectiles |

```typescript
// Body type constants
const BODY_STATIC = 0;
const BODY_KINEMATIC = 1;
const BODY_DYNAMIC = 2;
```

### Shapes

#### Box (Rectangle)
```typescript
const createBox = (Box2d, halfWidth, halfHeight) => {
  const shape = Box2d.b2PolygonShape();
  shape.SetAsBox(halfWidth, halfHeight);
  return shape;
};
```

#### Circle
```typescript
const createCircle = (Box2d, radius) => {
  const shape = Box2d.b2CircleShape();
  shape.SetRadius(radius);
  return shape;
};
```

#### Polygon (up to 8 vertices)
```typescript
const createPolygon = (Box2d, vertices) => {
  // vertices = [{x, y}, {x, y}, ...] - max 8 points, convex only
  const shape = Box2d.b2PolygonShape();
  const b2Vertices = vertices.map(v => Box2d.b2Vec2(v.x, v.y));
  shape.Set(b2Vertices);
  return shape;
};
```

#### Chain (Terrain)
```typescript
const createChain = (Box2d, points) => {
  // points = [{x, y}, ...] - for terrain edges
  const shape = Box2d.b2ChainShape();
  const b2Points = points.map(p => Box2d.b2Vec2(p.x, p.y));
  shape.CreateChain(b2Points);
  return shape;
};
```

### Joints

#### Revolute Joint (Hinges, Wheels)
```typescript
const createRevoluteJoint = (Box2d, world, bodyA, bodyB, anchor, options = {}) => {
  const jointDef = Box2d.b2RevoluteJointDef();
  jointDef.Initialize(bodyA, bodyB, Box2d.b2Vec2(anchor.x, anchor.y));
  
  // Motor (for wheels, flippers)
  if (options.enableMotor) {
    jointDef.enableMotor = true;
    jointDef.motorSpeed = options.motorSpeed || 0;
    jointDef.maxMotorTorque = options.maxMotorTorque || 100;
  }
  
  // Limits (for ragdoll joints)
  if (options.enableLimit) {
    jointDef.enableLimit = true;
    jointDef.lowerAngle = options.lowerAngle || -Math.PI / 4;
    jointDef.upperAngle = options.upperAngle || Math.PI / 4;
  }
  
  return world.CreateJoint(jointDef);
};
```

#### Distance Joint (Ropes, Springs)
```typescript
const createDistanceJoint = (Box2d, world, bodyA, bodyB, anchorA, anchorB, options = {}) => {
  const jointDef = Box2d.b2DistanceJointDef();
  jointDef.Initialize(bodyA, bodyB, 
    Box2d.b2Vec2(anchorA.x, anchorA.y),
    Box2d.b2Vec2(anchorB.x, anchorB.y)
  );
  
  // Spring properties (for soft connections)
  jointDef.frequencyHz = options.frequencyHz || 4;
  jointDef.dampingRatio = options.dampingRatio || 0.5;
  
  // Fixed length (for rigid ropes)
  if (options.length !== undefined) {
    jointDef.length = options.length;
  }
  
  return world.CreateJoint(jointDef);
};
```

#### Prismatic Joint (Pistons, Sliders)
```typescript
const createPrismaticJoint = (Box2d, world, bodyA, bodyB, anchor, axis, options = {}) => {
  const jointDef = Box2d.b2PrismaticJointDef();
  jointDef.Initialize(bodyA, bodyB,
    Box2d.b2Vec2(anchor.x, anchor.y),
    Box2d.b2Vec2(axis.x, axis.y)
  );
  
  if (options.enableLimit) {
    jointDef.enableLimit = true;
    jointDef.lowerTranslation = options.lowerTranslation || -1;
    jointDef.upperTranslation = options.upperTranslation || 1;
  }
  
  if (options.enableMotor) {
    jointDef.enableMotor = true;
    jointDef.motorSpeed = options.motorSpeed || 0;
    jointDef.maxMotorForce = options.maxMotorForce || 100;
  }
  
  return world.CreateJoint(jointDef);
};
```

#### Wheel Joint (Vehicles)
```typescript
const createWheelJoint = (Box2d, world, chassis, wheel, anchor, axis, options = {}) => {
  const jointDef = Box2d.b2WheelJointDef();
  jointDef.Initialize(chassis, wheel,
    Box2d.b2Vec2(anchor.x, anchor.y),
    Box2d.b2Vec2(axis.x, axis.y)
  );
  
  // Suspension
  jointDef.frequencyHz = options.frequencyHz || 4;
  jointDef.dampingRatio = options.dampingRatio || 0.7;
  
  // Motor
  jointDef.enableMotor = options.enableMotor || false;
  jointDef.motorSpeed = options.motorSpeed || 0;
  jointDef.maxMotorTorque = options.maxMotorTorque || 100;
  
  return world.CreateJoint(jointDef);
};
```

### Sensors (Trigger Zones)

Sensors detect overlap without physical collision response—perfect for collectibles, triggers, and ground detection.

```typescript
const createSensor = (Box2d, body, shape, userData) => {
  const fixtureDef = Box2d.b2FixtureDef();
  fixtureDef.shape = shape;
  fixtureDef.isSensor = true;  // Key property!
  fixtureDef.userData = userData;
  
  return body.CreateFixture(fixtureDef);
};
```

### Fixture Properties

```typescript
interface FixtureConfig {
  density: number;      // Mass per area (0 for static bodies)
  friction: number;     // 0 = ice, 1 = rubber
  restitution: number;  // 0 = no bounce, 1 = perfect bounce
  isSensor: boolean;    // Detect but don't collide
}

// Common presets
const PRESETS = {
  metal: { density: 7.8, friction: 0.6, restitution: 0.1 },
  wood: { density: 0.5, friction: 0.4, restitution: 0.2 },
  rubber: { density: 1.2, friction: 0.9, restitution: 0.8 },
  ice: { density: 0.9, friction: 0.05, restitution: 0.1 },
  bouncy: { density: 0.5, friction: 0.3, restitution: 0.9 },
};
```

---

## Gameplay Primitives

### Spawner

```typescript
interface SpawnerConfig {
  entityTemplate: string;
  spawnInterval: number;      // seconds between spawns
  maxEntities: number;        // pool size
  spawnArea: { minX, maxX, minY, maxY };
  initialVelocity?: { x: number, y: number };
}

class Spawner {
  private pool: Entity[] = [];
  private activeCount = 0;
  private timeSinceLastSpawn = 0;
  
  update(dt: number, entityManager: EntityManager) {
    this.timeSinceLastSpawn += dt;
    
    if (this.timeSinceLastSpawn >= this.config.spawnInterval) {
      if (this.activeCount < this.config.maxEntities) {
        this.spawn(entityManager);
      }
      this.timeSinceLastSpawn = 0;
    }
  }
  
  spawn(entityManager: EntityManager) {
    const x = random(this.config.spawnArea.minX, this.config.spawnArea.maxX);
    const y = random(this.config.spawnArea.minY, this.config.spawnArea.maxY);
    
    // Reuse from pool or create new
    let entity = this.pool.find(e => !e.active);
    if (!entity) {
      entity = entityManager.createFromTemplate(this.config.entityTemplate);
      this.pool.push(entity);
    }
    
    entity.transform.x = x;
    entity.transform.y = y;
    entity.active = true;
    this.activeCount++;
  }
  
  recycle(entity: Entity) {
    entity.active = false;
    this.activeCount--;
  }
}
```

### Trigger Zone

```typescript
interface TriggerConfig {
  bounds: { x, y, width, height };
  triggerTags: string[];      // Which entities trigger this
  onEnter?: (entity: Entity) => void;
  onExit?: (entity: Entity) => void;
  onStay?: (entity: Entity, dt: number) => void;
  oneShot?: boolean;          // Disable after first trigger
}

class TriggerZone {
  private entitiesInside: Set<string> = new Set();
  private triggered = false;
  
  checkCollision(entity: Entity): boolean {
    if (this.config.oneShot && this.triggered) return false;
    if (!this.config.triggerTags.some(t => entity.tags?.includes(t))) return false;
    
    // AABB check
    const { x, y, width, height } = this.config.bounds;
    const ex = entity.transform.x;
    const ey = entity.transform.y;
    
    return ex >= x && ex <= x + width && ey >= y && ey <= y + height;
  }
  
  update(entities: Entity[], dt: number) {
    for (const entity of entities) {
      const wasInside = this.entitiesInside.has(entity.id);
      const isInside = this.checkCollision(entity);
      
      if (isInside && !wasInside) {
        this.entitiesInside.add(entity.id);
        this.config.onEnter?.(entity);
        if (this.config.oneShot) this.triggered = true;
      } else if (!isInside && wasInside) {
        this.entitiesInside.delete(entity.id);
        this.config.onExit?.(entity);
      } else if (isInside) {
        this.config.onStay?.(entity, dt);
      }
    }
  }
}
```

### Health System

```typescript
interface HealthConfig {
  maxHealth: number;
  invincibilityDuration: number;  // seconds after damage
  onDamage?: (amount: number, source: Entity) => void;
  onHeal?: (amount: number) => void;
  onDeath?: () => void;
}

class HealthComponent {
  currentHealth: number;
  invincibilityTimer = 0;
  
  constructor(private config: HealthConfig) {
    this.currentHealth = config.maxHealth;
  }
  
  update(dt: number) {
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= dt;
    }
  }
  
  takeDamage(amount: number, source?: Entity) {
    if (this.invincibilityTimer > 0) return;
    
    this.currentHealth -= amount;
    this.invincibilityTimer = this.config.invincibilityDuration;
    this.config.onDamage?.(amount, source);
    
    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.config.onDeath?.();
    }
  }
  
  heal(amount: number) {
    this.currentHealth = Math.min(this.currentHealth + amount, this.config.maxHealth);
    this.config.onHeal?.(amount);
  }
  
  get isInvincible(): boolean {
    return this.invincibilityTimer > 0;
  }
  
  get healthPercent(): number {
    return this.currentHealth / this.config.maxHealth;
  }
}
```

### Score Tracker

```typescript
class ScoreTracker {
  private static instance: ScoreTracker;
  
  currentScore = 0;
  highScore = 0;
  multiplier = 1;
  combo = 0;
  
  private constructor() {
    this.loadHighScore();
  }
  
  static getInstance(): ScoreTracker {
    if (!ScoreTracker.instance) {
      ScoreTracker.instance = new ScoreTracker();
    }
    return ScoreTracker.instance;
  }
  
  addScore(points: number) {
    this.combo++;
    const actualPoints = points * this.multiplier;
    this.currentScore += actualPoints;
    
    if (this.currentScore > this.highScore) {
      this.highScore = this.currentScore;
      this.saveHighScore();
    }
    
    return actualPoints;
  }
  
  resetCombo() {
    this.combo = 0;
  }
  
  reset() {
    this.currentScore = 0;
    this.multiplier = 1;
    this.combo = 0;
  }
  
  private async loadHighScore() {
    // AsyncStorage implementation
  }
  
  private async saveHighScore() {
    // AsyncStorage implementation
  }
}
```

---

## Structural Primitives

### Entity (ECS-lite)

```typescript
interface Entity {
  id: string;
  name: string;
  active: boolean;
  
  // Transform (always present)
  transform: {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
  };
  
  // Optional components
  sprite?: SpriteComponent;
  physics?: PhysicsComponent;
  health?: HealthComponent;
  
  // Behaviors (logic)
  behaviors: Behavior[];
  
  // Metadata
  tags: string[];
  children: Entity[];
  parent?: Entity;
  
  // Runtime references
  body?: b2Body;        // Box2D body reference
  userData?: any;       // Custom data
}
```

### Object Pool

```typescript
class ObjectPool<T> {
  private pool: T[] = [];
  private active: Set<T> = new Set();
  
  constructor(
    private factory: () => T,
    private reset: (obj: T) => void,
    private initialSize: number = 10
  ) {
    // Pre-allocate
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }
  
  acquire(): T {
    let obj = this.pool.find(o => !this.active.has(o));
    
    if (!obj) {
      obj = this.factory();
      this.pool.push(obj);
    }
    
    this.active.add(obj);
    return obj;
  }
  
  release(obj: T) {
    if (this.active.has(obj)) {
      this.active.delete(obj);
      this.reset(obj);
    }
  }
  
  releaseAll() {
    this.active.forEach(obj => this.reset(obj));
    this.active.clear();
  }
  
  get activeCount(): number {
    return this.active.size;
  }
  
  get poolSize(): number {
    return this.pool.length;
  }
}
```

### Game State Machine

```typescript
type GameState = 'menu' | 'playing' | 'paused' | 'gameOver' | 'win';

interface StateCallbacks {
  onEnter?: () => void;
  onExit?: () => void;
  onUpdate?: (dt: number) => void;
}

class GameStateMachine {
  private currentState: GameState = 'menu';
  private states: Map<GameState, StateCallbacks> = new Map();
  
  registerState(state: GameState, callbacks: StateCallbacks) {
    this.states.set(state, callbacks);
  }
  
  transition(newState: GameState) {
    if (newState === this.currentState) return;
    
    const oldCallbacks = this.states.get(this.currentState);
    oldCallbacks?.onExit?.();
    
    this.currentState = newState;
    
    const newCallbacks = this.states.get(newState);
    newCallbacks?.onEnter?.();
  }
  
  update(dt: number) {
    const callbacks = this.states.get(this.currentState);
    callbacks?.onUpdate?.(dt);
  }
  
  get state(): GameState {
    return this.currentState;
  }
}
```

---

## Coordinate System

### World Units

- **Physics**: Meters (Box2D native units)
- **Rendering**: Pixels (screen units)
- **Conversion**: `PIXELS_PER_METER` constant (typically 50)

```typescript
const PIXELS_PER_METER = 50;

// Physics → Screen
const toScreen = (meters: number) => meters * PIXELS_PER_METER;
const toScreenVec = (vec: { x: number, y: number }) => ({
  x: vec.x * PIXELS_PER_METER,
  y: vec.y * PIXELS_PER_METER
});

// Screen → Physics
const toPhysics = (pixels: number) => pixels / PIXELS_PER_METER;
const toPhysicsVec = (vec: { x: number, y: number }) => ({
  x: vec.x / PIXELS_PER_METER,
  y: vec.y / PIXELS_PER_METER
});
```

### Screen Coordinate System

```
(0,0) ────────────────────────► X+ (right)
  │
  │     Origin at top-left
  │     Y increases downward
  │     (Standard screen coordinates)
  │
  │     Box2D also uses Y-down by default
  │     when gravity is positive Y
  │
  ▼
  Y+ (down)
```
