---
sidebar_position: 1
---

# Getting Started with Slopcade

Welcome to Slopcade! This guide will help you create your first game in minutes.

## What is Slopcade?

Slopcade is a physics-based game engine built on React Native and Godot. It lets you create interactive games by defining entities, behaviors, and rules in JSON. Games run at 60fps with realistic physics powered by Box2D.

## Installation

Slopcade is already set up in your project. The game engine is available through the `@slopcade/shared` package.

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Your First Game: Bouncing Ball

Let's create a simple game with a ball that bounces around the screen.

### Step 1: Define the Game Structure

Every game needs a `GameDefinition` object with metadata, world settings, and entities:

```typescript
import type { GameDefinition } from "@slopcade/shared";

const bouncingBallGame: GameDefinition = {
  metadata: {
    id: "bouncing-ball",
    title: "Bouncing Ball",
    description: "A ball bouncing around the screen",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: -9.8 },
    pixelsPerMeter: 50,
    bounds: { width: 10, height: 16 },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: { backgroundColor: "#1a1a2e" },
  winCondition: { type: "none" },
  loseCondition: { type: "none" },
  templates: {},
  entities: [],
};
```

### Step 2: Add a Ball Entity

Add a ball template and spawn it in the world:

```typescript
const bouncingBallGame: GameDefinition = {
  // ... metadata and world config ...
  templates: {
    ball: {
      id: "ball",
      tags: ["ball"],
      sprite: {
        type: "circle",
        radius: 0.3,
        color: "#FF6B6B",
      },
      physics: {
        bodyType: "dynamic",
        shape: { type: "circle", radius: 0.3 },
        density: 1,
        restitution: 0.8, // Bounciness
        friction: 0.3,
      },
    },
  },
  entities: [
    {
      id: "ball-1",
      name: "Ball",
      template: "ball",
      transform: { x: 0, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
};
```

### Step 3: Add Walls

Let's add walls so the ball doesn't fall off:

```typescript
templates: {
  ball: { /* ... */ },
  wall: {
    id: "wall",
    tags: ["wall"],
    sprite: {
      type: "rect",
      width: 0.2,
      height: 10,
      color: "#333333",
    },
    physics: {
      bodyType: "static",
      shape: { type: "rect", width: 0.2, height: 10 },
    },
  },
},
entities: [
  { id: "ball-1", name: "Ball", template: "ball", transform: { x: 0, y: 5, angle: 0, scaleX: 1, scaleY: 1 } },
  { id: "wall-left", name: "Left Wall", template: "wall", transform: { x: -5, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
  { id: "wall-right", name: "Right Wall", template: "wall", transform: { x: 5, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
  { id: "wall-bottom", name: "Bottom Wall", template: "wall", transform: { x: 0, y: -8, angle: 0, scaleX: 50, scaleY: 0.2 } },
],
```

## Key Concepts

### Entities
Entities are game objects with position, appearance, and physics. Learn more in the [Entities Guide](./entities.md).

### Behaviors
Behaviors define how entities move and interact. Learn more in the [Behaviors Guide](./behaviors.md).

### Rules
Rules trigger actions when conditions are met (collisions, timers, etc.). Learn more in the [Rules Guide](./rules.md).

### Physics
The engine uses Box2D for realistic physics. Bodies can be static (don't move), dynamic (affected by forces), or kinematic (move but don't respond to forces).

## Next Steps

- **[Create Entities](./entities.md)** - Learn how to create custom game objects
- **[Add Behaviors](./behaviors.md)** - Make entities move and interact
- **[Build Rules](./rules.md)** - Trigger actions on collisions and events
- **[Complete Game Tutorial](./creating-a-game.md)** - Build a full game from scratch

## Common Patterns

### Making Something Interactive

Add a behavior to respond to player input:

```typescript
behaviors: [
  {
    type: "control",
    inputType: "drag",
    moveMode: "direct",
  },
]
```

### Detecting Collisions

Use rules to trigger actions when entities collide:

```typescript
rules: [
  {
    trigger: { type: "collision", entityATag: "ball", entityBTag: "wall" },
    actions: [{ type: "play_sound", sound: "bounce" }],
  },
]
```

### Spawning Objects

Create new entities dynamically:

```typescript
behaviors: [
  {
    type: "spawn",
    templateId: "projectile",
    rate: 2, // per second
  },
]
```

## Troubleshooting

**Ball falls through the floor?**
- Check that walls have `bodyType: "static"`
- Verify the wall dimensions match your world bounds

**Ball doesn't bounce?**
- Increase `restitution` (0.8 is good for bouncy)
- Make sure the ball has `bodyType: "dynamic"`

**Game won't load?**
- Verify all entity templates are defined before use
- Check that `transform` has all required fields (x, y, angle, scaleX, scaleY)

## Resources

- [Entity System Reference](/api-reference/type-aliases/GameEntity)
- [Physics Configuration](/api-reference/type-aliases/PhysicsComponent)
- [Behavior Types](/api-reference/type-aliases/Behavior)
