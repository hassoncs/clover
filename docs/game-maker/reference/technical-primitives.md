# Technical Primitives

This document defines the core building blocks required across all 2D games. These primitives form the foundation that templates and AI generation build upon.

---

## Overview

Every game requires four categories of primitives:

| Category | Purpose | Technology |
|----------|---------|------------|
| **Visual** | What players see | React Native Skia |
| **Physics** | How objects move and collide | Godot Physics |
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

## Physics Primitives (Godot)

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

Godot Physics supports multiple shape types for collision detection:

| Shape | Godot Type | Use Case |
|-------|-----------|----------|
| **Box** | RectangleShape2D | Platforms, walls, boxes |
| **Circle** | CircleShape2D | Balls, wheels, round objects |
| **Polygon** | ConvexPolygonShape2D | Custom convex shapes |
| **Edge** | SegmentShape2D | Single line segments |
| **Chain** | ConcavePolygonShape2D | Terrain, complex edges |

Shapes are attached to physics bodies via the GameBridge JSON interface. Define shapes in your entity template and send to Godot via the bridge.

### Joints

Godot Physics supports various joint types for connecting bodies:

| Joint Type | Godot Type | Use Case |
|-----------|-----------|----------|
| **Revolute** | PinJoint2D | Hinges, wheels, rotating connections |
| **Distance** | DampedSpringJoint2D | Ropes, springs, elastic connections |
| **Prismatic** | SliderJoint (via script) | Pistons, sliders, linear motion |
| **Wheel** | PinJoint2D + SliderJoint | Vehicle suspension |
| **Weld** | Stiff spring or merged bodies | Rigid connections |
| **Rope** | DampedSpringJoint2D with max length | Rope constraints |

Joints are created via the GameBridge JSON interface. Define joint configurations in your entity template and send to Godot for instantiation.

### Sensors (Trigger Zones)

Godot Physics uses Area2D nodes as sensors to detect overlap without physical collision response—perfect for collectibles, triggers, and ground detection.

Sensors are created via the GameBridge JSON interface by setting the body type to "sensor" or using Area2D nodes in your Godot scene definitions.

### Physics Material Properties

Godot Physics bodies use PhysicsMaterial to define surface properties:

```typescript
interface PhysicsMaterialConfig {
  mass: number;         // Body mass (calculated from density in TypeScript)
  friction: number;     // 0 = ice, 1 = rubber
  bounce: number;       // 0 = no bounce, 1 = perfect bounce
  linearDamp: number;   // Linear velocity damping
  angularDamp: number;  // Angular velocity damping
}

// Common presets
const PRESETS = {
  metal: { friction: 0.6, bounce: 0.1 },
  wood: { friction: 0.4, bounce: 0.2 },
  rubber: { friction: 0.9, bounce: 0.8 },
  ice: { friction: 0.05, bounce: 0.1 },
  bouncy: { friction: 0.3, bounce: 0.9 },
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
  godotNodeId?: string; // Godot node reference ID
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

- **Physics**: World units (Godot native units)
- **Rendering**: Pixels (screen units)
- **Conversion**: `PIXELS_PER_UNIT` constant (typically 50)

```typescript
const PIXELS_PER_UNIT = 50;

// Physics → Screen
const toScreen = (units: number) => units * PIXELS_PER_UNIT;
const toScreenVec = (vec: { x: number, y: number }) => ({
  x: vec.x * PIXELS_PER_UNIT,
  y: vec.y * PIXELS_PER_UNIT
});

// Screen → Physics
const toPhysics = (pixels: number) => pixels / PIXELS_PER_UNIT;
const toPhysicsVec = (vec: { x: number, y: number }) => ({
  x: vec.x / PIXELS_PER_UNIT,
  y: vec.y / PIXELS_PER_UNIT
});
```

### Screen Coordinate System

```
(0,0) ────────────────────────► X+ (right)
  │
  │     Origin at center (Godot default)
  │     Y increases downward
  │     (Godot 2D coordinate system)
  │
  │     Godot Physics uses center-origin
  │     coordinates for all calculations
  │
  ▼
  Y+ (down)
```
