# Slopcade Game Engine Guide

> **Purpose:** Practical guide for building games with the Slopcade engine.
>
> For architecture details, see [00-MASTER-ARCHITECTURE.md](./game-engine-architecture/00-MASTER-ARCHITECTURE.md).
> For bundle format details, see [bundle-system.md](./game-maker/reference/bundle-system.md).

---

## Quick Start: Anatomy of a Game

A Slopcade game is a **JSON definition** with these core parts:

```
GameDefinition
├── world          # Physics settings, bounds, gravity
├── background     # Visual backdrop
├── camera         # View configuration
├── variables      # Game state (score, lives, etc.)
├── templates[]    # Entity blueprints (reusable)
├── entities[]     # Starting entities (spawned at game start)
├── rules[]        # Event-driven game logic
├── winCondition   # How to win
└── loseCondition  # How to lose
```

---

## Core Concepts

### 1. Entities

Everything in the game world is an **Entity**. Each entity has:

```typescript
{
  id: "player",
  templateId: "bird",           // Optional: inherit from template
  tags: ["player"],             // For collision matching
  transform: { x: 0, y: 5 },    // Position in world units (meters)

  // Visual appearance
  visual: {
    type: "image",
    imageUrl: "https://example.com/bird.png",
    width: 1,
    height: 1
  },

  // Physics body (optional)
  physics: {
    bodyType: "dynamic",        // dynamic | static | kinematic
    shape: "circle",
    radius: 0.5,
    density: 1,
    friction: 0.3,
    restitution: 0.5,           // Bounciness (0-1)
    ccd: true                   // Continuous collision detection for fast objects
  },

  // Behaviors (continuous actions)
  behaviors: [
    { type: "gravity", strength: -20 },
    { type: "tap_to_jump", force: 10 }
  ]
}
```

### 2. Templates vs Entities

- **Templates**: Blueprints that define what an entity looks like/behaves
- **Entities**: Actual instances in the game world

```typescript
// Template (in templates[])
{
  id: "coin",
  tags: ["collectible"],
  visual: { type: "circle", radius: 0.3, fill: "#FFD700" },
  physics: { bodyType: "static", shape: "circle", radius: 0.3, isSensor: true }
}

// Entity using template (in entities[])
{
  id: "coin1",
  templateId: "coin",
  transform: { x: 5, y: 3 }
}
```

---

## Physics System

### Body Types

| Type | Moves? | Affected by gravity? | Use for |
|------|--------|---------------------|---------|
| `dynamic` | Yes | Yes | Balls, players, projectiles |
| `static` | No | No | Walls, ground, obstacles |
| `kinematic` | Yes (velocity only) | No | Moving platforms, conveyors |

### Shapes

```typescript
// Circle
physics: { shape: "circle", radius: 0.5 }

// Box
physics: { shape: "box", width: 2, height: 1 }

// Polygon
physics: { shape: "polygon", vertices: [[0,0], [1,0], [0.5,1]] }
```

### Key Properties

```typescript
physics: {
  density: 1,           // Mass = density × area. Use 0 for static/kinematic
  friction: 0.3,        // Surface grip (0 = ice, 1 = rubber)
  restitution: 0.5,     // Bounciness (0 = no bounce, 1 = perfect bounce)
  ccd: true,            // Prevents fast objects tunneling through walls
  fixedRotation: true,  // Prevent spinning (good for players)
  isSensor: true        // Detect collisions without physical response
}
```

### Sensors vs Colliders

- **Collider** (`isSensor: false`): Physical response - objects bounce off
- **Sensor** (`isSensor: true`): Detection only - objects pass through

```typescript
// Goal zone (sensor - detects ball entering)
{
  id: "goal",
  physics: { bodyType: "static", shape: "box", width: 2, height: 0.5, isSensor: true },
  tags: ["goal"]
}
```

---

## Behaviors

Behaviors are **continuous actions** that run every frame. Common behaviors:

### Movement
```typescript
{ type: "move", velocityX: 5, velocityY: 0 }
{ type: "oscillate", axis: "x", amplitude: 2, period: 3 }
{ type: "rotate", speed: 90 }  // degrees per second
{ type: "follow", targetTag: "player", speed: 3 }
```

### Input Controls
```typescript
{ type: "tap_to_jump", force: 12 }
{ type: "drag_to_aim", maxForce: 20 }
{ type: "horizontal_control", speed: 5 }
{ type: "swipe_to_launch", force: 15 }
```

### Physics
```typescript
{ type: "gravity", strength: -20 }
{ type: "maintain_speed", speed: 10 }  // Constant speed (like Breakout ball)
```

### Lifecycle
```typescript
{ type: "destroy_when_off_screen" }
{ type: "spawn_on_destroy", templateId: "explosion" }
```

---

## Rules System

Rules are **event-driven logic**: "When X happens, do Y."

### Rule Structure

```typescript
{
  id: "collect-coin",
  trigger: { type: "collision", tagA: "player", tagB: "coin" },
  conditions: [],  // Optional filters
  actions: [
    { type: "destroy_entity", target: "entityB" },
    { type: "set_variable", variable: "score", value: { expr: "score + 10" } },
    { type: "play_sound", sound: "coin.mp3" }
  ]
}
```

### Trigger Types

```typescript
// Collision between tagged entities
{ type: "collision", tagA: "player", tagB: "enemy" }

// Timer (fires once after delay)
{ type: "timer", delay: 5 }

// Entity count threshold
{ type: "entity_count", tag: "enemy", comparison: "equals", value: 0 }

// Custom event (fired by other rules)
{ type: "event", event: "level_complete" }

// Game start
{ type: "game_start" }

// Every frame
{ type: "frame" }
```

### Action Types

```typescript
// Entity manipulation
{ type: "destroy_entity", target: "entityA" }
{ type: "spawn", templateId: "bullet", x: 0, y: 0 }

// Variables
{ type: "set_variable", variable: "score", value: 100 }
{ type: "set_variable", variable: "lives", value: { expr: "lives - 1" } }

// Events
{ type: "emit_event", event: "player_died" }
{ type: "win" }
{ type: "lose" }

// Visual/Audio
{ type: "play_sound", sound: "explosion.mp3" }
{ type: "camera_shake", intensity: 0.5, duration: 0.3 }
```

### Conditions

Filter when rules should fire:

```typescript
{
  trigger: { type: "collision", tagA: "player", tagB: "powerup" },
  conditions: [
    { type: "expression", expr: "score >= 100" }
  ],
  actions: [...]
}
```

---

## Variables & Expressions

### Declaring Variables

```typescript
variables: {
  score: 0,
  lives: 3,
  level: 1,
  gameSpeed: 1.0
}
```

### Using Expressions

Expressions reference variables and do math:

```typescript
// In rules
{ type: "set_variable", variable: "score", value: { expr: "score + 10 * level" } }

// In conditions
{ type: "expression", expr: "lives > 0" }

// Available functions
{ expr: "min(score, 100)" }
{ expr: "max(0, lives - 1)" }
{ expr: "abs(velocity.x)" }
{ expr: "floor(time / 10)" }
```

---

## Win & Lose Conditions

```typescript
// Win when all enemies destroyed
winCondition: {
  type: "entity_count",
  tag: "enemy",
  comparison: "equals",
  value: 0
}

// Lose when player destroyed
loseCondition: {
  type: "entity_destroyed",
  tag: "player"
}

// Lose when lives reach 0
loseCondition: {
  type: "expression",
  expr: "lives <= 0"
}

// Win when score reaches target
winCondition: {
  type: "expression",
  expr: "score >= 1000"
}
```

---

## Complete Example: Simple Breakout

```typescript
{
  name: "mini-breakout",
  title: "Mini Breakout",

  world: {
    gravity: { x: 0, y: 0 },
    bounds: { width: 10, height: 14 },
    pixelsPerMeter: 50
  },

  variables: {
    score: 0
  },

  templates: [
    {
      id: "brick",
      tags: ["brick"],
      visual: { type: "rect", width: 1.5, height: 0.5, fill: "#FF6B6B" },
      physics: { bodyType: "static", shape: "box", width: 1.5, height: 0.5, restitution: 1 }
    }
  ],

  entities: [
    // Paddle
    {
      id: "paddle",
      tags: ["paddle"],
      transform: { x: 0, y: -6 },
      visual: { type: "rect", width: 2, height: 0.3, fill: "#4ECDC4" },
      physics: { bodyType: "kinematic", shape: "box", width: 2, height: 0.3, restitution: 1 },
      behaviors: [{ type: "horizontal_control", speed: 8 }]
    },
    // Ball
    {
      id: "ball",
      tags: ["ball"],
      transform: { x: 0, y: -4 },
      visual: { type: "circle", radius: 0.25, fill: "#FFFFFF" },
      physics: { bodyType: "dynamic", shape: "circle", radius: 0.25, density: 1, restitution: 1, ccd: true },
      behaviors: [{ type: "maintain_speed", speed: 8 }]
    },
    // Bricks (using template)
    { id: "brick1", templateId: "brick", transform: { x: -3, y: 4 } },
    { id: "brick2", templateId: "brick", transform: { x: 0, y: 4 } },
    { id: "brick3", templateId: "brick", transform: { x: 3, y: 4 } },
    // Walls
    { id: "wallLeft", tags: ["wall"], transform: { x: -5.5, y: 0 }, physics: { bodyType: "static", shape: "box", width: 1, height: 16, restitution: 1 } },
    { id: "wallRight", tags: ["wall"], transform: { x: 5.5, y: 0 }, physics: { bodyType: "static", shape: "box", width: 1, height: 16, restitution: 1 } },
    { id: "wallTop", tags: ["wall"], transform: { x: 0, y: 7.5 }, physics: { bodyType: "static", shape: "box", width: 12, height: 1, restitution: 1 } },
    // Death zone
    { id: "deathZone", tags: ["death"], transform: { x: 0, y: -8 }, physics: { bodyType: "static", shape: "box", width: 12, height: 1, isSensor: true } }
  ],

  rules: [
    // Break brick on collision
    {
      id: "break-brick",
      trigger: { type: "collision", tagA: "ball", tagB: "brick" },
      actions: [
        { type: "destroy_entity", target: "entityB" },
        { type: "set_variable", variable: "score", value: { expr: "score + 10" } }
      ]
    },
    // Lose when ball hits death zone
    {
      id: "ball-death",
      trigger: { type: "collision", tagA: "ball", tagB: "death" },
      actions: [{ type: "lose" }]
    }
  ],

  winCondition: { type: "entity_count", tag: "brick", comparison: "equals", value: 0 },
  loseCondition: null,  // Handled by rule

  ui: { showScore: true }
}
```

---

## Common Patterns

### Collectibles (coins, power-ups)
```typescript
// Template
{ id: "coin", tags: ["coin"], physics: { isSensor: true }, visual: {...} }

// Rule
{ trigger: { type: "collision", tagA: "player", tagB: "coin" },
  actions: [
    { type: "destroy_entity", target: "entityB" },
    { type: "set_variable", variable: "score", value: { expr: "score + 10" } }
  ]
}
```

### Spawning Enemies
```typescript
// Timer-based spawning
{
  trigger: { type: "timer", delay: 3, repeat: true },
  actions: [
    { type: "spawn", templateId: "enemy", x: { expr: "random(-4, 4)" }, y: 8 }
  ]
}
```

### Health System
```typescript
variables: { health: 100 }

// Damage rule
{
  trigger: { type: "collision", tagA: "player", tagB: "enemy" },
  actions: [
    { type: "set_variable", variable: "health", value: { expr: "health - 25" } }
  ]
}

loseCondition: { type: "expression", expr: "health <= 0" }
```

### Score Threshold Win
```typescript
variables: { score: 0 }
winCondition: { type: "expression", expr: "score >= 1000" }
```

---

## File Organization

For larger games, use the **bundle format** (see [bundle-system.md](./game-maker/reference/bundle-system.md)):

```
my-game.bundle/
├── manifest.json      # World, camera, UI settings
├── constants.json     # Reusable values
├── templates/         # Entity templates
│   └── enemies.json
├── entities/          # Starting entities
│   └── level1.json
└── rules/             # Game logic
    └── gameplay.json
```

---

## Next Steps

- **Game Patterns**: See [game-patterns.md](./game-maker/reference/game-patterns.md) for 7 reusable patterns
- **Physics Details**: See [physics-system-guide.md](./physics-system-guide.md)
- **AI Generation**: See [generation-pipeline.md](./game-engine-architecture/06-ai-integration/generation-pipeline.md)
- **Testing Games**: See [testing-game-logic.md](./game-maker/guides/testing-game-logic.md)
