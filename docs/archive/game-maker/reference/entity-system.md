# Entity System

The entity system is the foundation of the game engine. It defines how game objects are structured, created, and managed.

---

## Design Principles

1. **JSON-Serializable**: All entity data can be saved/loaded as JSON
2. **AI-Generatable**: Structure is simple enough for LLMs to produce correctly
3. **Composable**: Entities are built from optional components
4. **Template-Based**: Common entities can be defined once and reused

---

## Core Entity Structure

```typescript
interface GameEntity {
  // Identity
  id: string;                    // Unique identifier (e.g., "player", "enemy_1")
  name: string;                  // Display name
  template?: string;             // Reference to template (inherits properties)
  
  // Transform (required)
  transform: TransformComponent;
  
  // Optional components
  sprite?: SpriteComponent;      // Visual representation
  physics?: PhysicsComponent;    // Physics body
  behaviors?: Behavior[];        // Runtime behaviors
  
  // Metadata
  tags?: string[];               // For querying and rules (e.g., ["enemy", "destructible"])
  layer?: number;                // Render order (higher = on top)
  visible?: boolean;             // Whether to render (default: true)
  active?: boolean;              // Whether to update (default: true)
}
```

---

## Transform Component

Every entity has a transform that defines its position in the world.

```typescript
interface TransformComponent {
  x: number;          // X position in meters (world coordinates)
  y: number;          // Y position in meters
  angle: number;      // Rotation in radians (0 = no rotation)
  scaleX: number;     // Horizontal scale (1 = normal)
  scaleY: number;     // Vertical scale (1 = normal)
}

// Default transform
const DEFAULT_TRANSFORM: TransformComponent = {
  x: 0,
  y: 0,
  angle: 0,
  scaleX: 1,
  scaleY: 1
};
```

### Coordinate System

```
(0,0) ────────────────────► X+ (right)
  │
  │
  │     World coordinates are in METERS
  │     Screen coordinates are in PIXELS
  │
  │     Conversion:
  │       screenX = worldX * PIXELS_PER_METER
  │       screenY = worldY * PIXELS_PER_METER
  │
  ▼
  Y+ (down)
```

**Note**: Y increases downward (standard screen coordinates). This matches Godot's default and most 2D game conventions.

---

## Sprite Component

Defines the visual representation of an entity.

```typescript
interface SpriteComponent {
  type: SpriteType;
  
  // Color (for shapes)
  color?: string;                // Hex color (e.g., "#FF0000")
  strokeColor?: string;          // Border color
  strokeWidth?: number;          // Border width in pixels
  
  // Dimensions (depends on type)
  width?: number;                // For 'rect' type (meters)
  height?: number;               // For 'rect' type (meters)
  radius?: number;               // For 'circle' type (meters)
  vertices?: Vec2[];             // For 'polygon' type (meters, relative to center)
  
  // Image (for 'image' type)
  imageUrl?: string;             // URL or asset reference
  imageWidth?: number;           // Display width (meters)
  imageHeight?: number;          // Display height (meters)
  
  // Effects
  opacity?: number;              // 0-1 (default: 1)
  shadow?: ShadowEffect;         // Drop shadow
}

type SpriteType = 'rect' | 'circle' | 'polygon' | 'image';

interface ShadowEffect {
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

interface Vec2 {
  x: number;
  y: number;
}
```

### Sprite Examples

```typescript
// Rectangle
const boxSprite: SpriteComponent = {
  type: 'rect',
  width: 1,
  height: 1,
  color: '#FF6B6B'
};

// Circle
const ballSprite: SpriteComponent = {
  type: 'circle',
  radius: 0.5,
  color: '#4ECDC4'
};

// Triangle (polygon)
const triangleSprite: SpriteComponent = {
  type: 'polygon',
  vertices: [
    { x: 0, y: -0.5 },    // Top
    { x: -0.5, y: 0.5 },  // Bottom-left
    { x: 0.5, y: 0.5 }    // Bottom-right
  ],
  color: '#45B7D1'
};

// Image sprite
const characterSprite: SpriteComponent = {
  type: 'image',
  imageUrl: 'assets://character.png',
  imageWidth: 1,
  imageHeight: 1.5
};
```

---

## Physics Component

Defines the physics body for an entity.

```typescript
interface PhysicsComponent {
  // Body type
  bodyType: PhysicsBodyType;
  
  // Shape (usually matches sprite, but can differ)
  shape: PhysicsShape;
  
  // Shape dimensions (if different from sprite)
  width?: number;                // For 'box' shape
  height?: number;               // For 'box' shape
  radius?: number;               // For 'circle' shape
  vertices?: Vec2[];             // For 'polygon' shape
  
  // Material properties
  density: number;               // Mass per area (0 for static)
  friction: number;              // Surface friction (0-1)
  restitution: number;           // Bounciness (0-1)
  
  // Flags
  isSensor?: boolean;            // Detect collision but don't respond
  fixedRotation?: boolean;       // Prevent rotation
  bullet?: boolean;              // More accurate collision for fast objects
  
  // Damping (optional)
  linearDamping?: number;        // Velocity slowdown (0 = none)
  angularDamping?: number;       // Rotation slowdown (0 = none)
  
  // Initial velocity (optional)
  initialVelocity?: Vec2;
  initialAngularVelocity?: number;
}

type PhysicsBodyType = 'static' | 'dynamic' | 'kinematic';
type PhysicsShape = 'box' | 'circle' | 'polygon';
```

### Body Type Reference

| Type | Code | Description | Use Case |
|------|------|-------------|----------|
| **static** | 0 | Never moves | Ground, walls, platforms |
| **kinematic** | 1 | Moves by velocity, ignores forces | Moving platforms, elevators |
| **dynamic** | 2 | Fully simulated | Players, projectiles, objects |

### Physics Examples

```typescript
// Dynamic falling box
const dynamicBox: PhysicsComponent = {
  bodyType: 'dynamic',
  shape: 'box',
  width: 1,
  height: 1,
  density: 1.0,
  friction: 0.3,
  restitution: 0.2
};

// Static ground
const staticGround: PhysicsComponent = {
  bodyType: 'static',
  shape: 'box',
  width: 20,
  height: 1,
  density: 0,
  friction: 0.8,
  restitution: 0
};

// Bouncy ball
const bouncyBall: PhysicsComponent = {
  bodyType: 'dynamic',
  shape: 'circle',
  radius: 0.5,
  density: 0.5,
  friction: 0.1,
  restitution: 0.9  // Very bouncy!
};

// Trigger zone (sensor)
const triggerZone: PhysicsComponent = {
  bodyType: 'static',
  shape: 'box',
  width: 2,
  height: 2,
  density: 0,
  friction: 0,
  restitution: 0,
  isSensor: true  // Detects collision, no physical response
};
```

---

## Template System

Templates allow defining reusable entity configurations.

```typescript
interface EntityTemplate {
  // Template identifier
  id: string;
  
  // All properties that instances will inherit
  sprite?: SpriteComponent;
  physics?: PhysicsComponent;
  behaviors?: Behavior[];
  tags?: string[];
  layer?: number;
}
```

### Using Templates

```typescript
// Define template
const templates: Record<string, EntityTemplate> = {
  "ball": {
    id: "ball",
    sprite: { type: 'circle', radius: 0.3, color: '#FF0000' },
    physics: { bodyType: 'dynamic', shape: 'circle', radius: 0.3, density: 1, friction: 0.3, restitution: 0.5 },
    tags: ['ball', 'projectile']
  }
};

// Create instance from template
const entity: GameEntity = {
  id: "ball_1",
  name: "Ball",
  template: "ball",
  transform: { x: 5, y: 2, angle: 0, scaleX: 1, scaleY: 1 }
  // sprite, physics, tags inherited from template
};

// Override template properties
const redBall: GameEntity = {
  id: "red_ball",
  name: "Red Ball",
  template: "ball",
  transform: { x: 3, y: 1, angle: 0, scaleX: 1, scaleY: 1 },
  sprite: { ...templates.ball.sprite, color: '#FF0000' }  // Override color
};
```

---

## Entity Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                      ENTITY LIFECYCLE                           │
└─────────────────────────────────────────────────────────────────┘

1. DEFINITION (JSON)
   └─> Stored in game definition file

2. CREATION
   └─> EntityManager.createEntity(definition)
       ├─> Resolve template (if any)
       ├─> Create physics body (if physics component)
       ├─> Initialize behaviors
       └─> Add to entity list

3. ACTIVE
   └─> Each frame:
       ├─> Execute behaviors
       ├─> Physics step updates position
       ├─> Sync transform from physics
       └─> Render sprite at transform

4. DESTRUCTION
   └─> EntityManager.destroyEntity(id)
       ├─> Destroy physics body
       ├─> Remove from entity list
       └─> Trigger destruction effects (optional)
```

---

## Entity Manager API

```typescript
class EntityManager {
  private entities: Map<string, RuntimeEntity>;
  private templates: Map<string, EntityTemplate>;
  private physicsSystem: PhysicsSystem;
  
  // Template management
  registerTemplate(template: EntityTemplate): void;
  getTemplate(id: string): EntityTemplate | undefined;
  
  // Entity creation
  createEntity(definition: GameEntity): RuntimeEntity {
    // 1. Generate unique ID if not provided
    const id = definition.id || generateId();
    
    // 2. Merge with template
    const resolved = this.resolveTemplate(definition);
    
    // 3. Create physics body if needed
    let body: b2Body | null = null;
    if (resolved.physics) {
      body = this.physicsSystem.createBody(resolved);
    }
    
    // 4. Create runtime entity
    const entity: RuntimeEntity = {
      ...resolved,
      id,
      body,
      behaviors: this.initializeBehaviors(resolved.behaviors || [])
    };
    
    // 5. Store and return
    this.entities.set(id, entity);
    return entity;
  }
  
  // Entity destruction
  destroyEntity(id: string): void {
    const entity = this.entities.get(id);
    if (!entity) return;
    
    // Destroy physics body
    if (entity.body) {
      this.physicsSystem.destroyBody(entity.body);
    }
    
    // Remove from map
    this.entities.delete(id);
  }
  
  // Bulk operations
  loadScene(entities: GameEntity[]): void {
    this.clearAll();
    entities.forEach(e => this.createEntity(e));
  }
  
  clearAll(): void {
    this.entities.forEach((_, id) => this.destroyEntity(id));
  }
  
  // Queries
  getEntity(id: string): RuntimeEntity | undefined;
  getEntitiesByTag(tag: string): RuntimeEntity[];
  getAllEntities(): RuntimeEntity[];
}

// Runtime entity includes physics body reference
interface RuntimeEntity extends GameEntity {
  body: b2Body | null;
  behaviors: RuntimeBehavior[];
}
```

---

## Common Entity Patterns

### Ground Platform

```typescript
const ground: GameEntity = {
  id: "ground",
  name: "Ground",
  transform: { x: 10, y: 11, angle: 0, scaleX: 1, scaleY: 1 },
  sprite: {
    type: 'rect',
    width: 20,
    height: 1,
    color: '#2d3436'
  },
  physics: {
    bodyType: 'static',
    shape: 'box',
    width: 20,
    height: 1,
    density: 0,
    friction: 0.8,
    restitution: 0
  },
  tags: ['ground', 'solid']
};
```

### Player Character

```typescript
const player: GameEntity = {
  id: "player",
  name: "Player",
  transform: { x: 2, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
  sprite: {
    type: 'image',
    imageUrl: 'assets://player.png',
    imageWidth: 1,
    imageHeight: 1.5
  },
  physics: {
    bodyType: 'dynamic',
    shape: 'box',
    width: 0.8,
    height: 1.4,
    density: 1,
    friction: 0.3,
    restitution: 0,
    fixedRotation: true  // Don't tip over
  },
  behaviors: [
    { type: 'control', controlType: 'tap_to_jump', force: 10 }
  ],
  tags: ['player']
};
```

### Collectible

```typescript
const coin: GameEntity = {
  id: "coin_1",
  name: "Coin",
  template: "coin",  // Use template
  transform: { x: 5, y: 4, angle: 0, scaleX: 1, scaleY: 1 },
  behaviors: [
    { type: 'rotate', speed: 2, direction: 'clockwise' },
    { type: 'destroy_on_collision', withTags: ['player'], effect: 'fade' },
    { type: 'score_on_collision', withTags: ['player'], points: 10 }
  ],
  tags: ['collectible', 'coin']
};
```

### Enemy

```typescript
const enemy: GameEntity = {
  id: "enemy_1",
  name: "Enemy",
  transform: { x: 8, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
  sprite: {
    type: 'circle',
    radius: 0.4,
    color: '#e74c3c'
  },
  physics: {
    bodyType: 'dynamic',
    shape: 'circle',
    radius: 0.4,
    density: 1,
    friction: 0.3,
    restitution: 0.2
  },
  behaviors: [
    { type: 'move', direction: 'left', speed: 2 },
    { type: 'destroy_on_collision', withTags: ['projectile'], effect: 'explode' }
  ],
  tags: ['enemy', 'hazard']
};
```
