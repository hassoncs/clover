---
sidebar_position: 2
---

# Working with Entities

Entities are the building blocks of your game. Learn how to create and customize them.

## What is an Entity?

An entity is a game object with:
- **Position & Transform** - Where it is and how it's rotated/scaled
- **Sprite** - How it looks (shape, color, or image)
- **Physics** - How it moves and collides
- **Behaviors** - What it does
- **Tags** - Labels for grouping and identification

## Entity Templates

Templates define reusable entity types. Define them once, spawn many instances:

```typescript
templates: {
  player: {
    id: "player",
    tags: ["player", "controllable"],
    sprite: {
      type: "rect",
      width: 0.8,
      height: 1.2,
      color: "#4A90E2",
    },
    physics: {
      bodyType: "dynamic",
      shape: { type: "rect", width: 0.8, height: 1.2 },
      density: 1,
      friction: 0.5,
    },
  },
}
```

## Sprite Types

### Rectangle

```typescript
sprite: {
  type: "rect",
  width: 2,
  height: 1,
  color: "#FF6B6B",
}
```

### Circle

```typescript
sprite: {
  type: "circle",
  radius: 0.5,
  color: "#4ECDC4",
}
```

### Polygon

```typescript
sprite: {
  type: "polygon",
  points: [
    { x: 0, y: 1 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: -1, y: 0 },
  ],
  color: "#95E1D3",
}
```

### Image

```typescript
sprite: {
  type: "image",
  assetId: "player-sprite",
  width: 1,
  height: 1,
}
```

## Physics Bodies

### Static Bodies (Don't Move)

Use for walls, platforms, and obstacles:

```typescript
physics: {
  bodyType: "static",
  shape: { type: "rect", width: 10, height: 0.5 },
}
```

### Dynamic Bodies (Affected by Forces)

Use for players, balls, and objects that fall:

```typescript
physics: {
  bodyType: "dynamic",
  shape: { type: "circle", radius: 0.3 },
  density: 1,
  restitution: 0.8, // Bounciness (0-1)
  friction: 0.3,    // Friction (0-1)
}
```

### Kinematic Bodies (Move but Don't React)

Use for moving platforms and enemies:

```typescript
physics: {
  bodyType: "kinematic",
  shape: { type: "rect", width: 2, height: 0.5 },
}
```

## Tags and Layers

Tags group entities for rules and queries:

```typescript
tags: ["player", "controllable", "alive"]
```

Layers control rendering order (higher = on top):

```typescript
layer: 10
```

## Creating Entities

### From a Template

```typescript
entities: [
  {
    id: "player-1",
    name: "Player",
    template: "player",
    transform: {
      x: 0,
      y: 5,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
    },
  },
]
```

### Custom Entity (No Template)

```typescript
entities: [
  {
    id: "obstacle-1",
    name: "Obstacle",
    transform: { x: 3, y: 2, angle: 0, scaleX: 1, scaleY: 1 },
    sprite: {
      type: "rect",
      width: 1,
      height: 3,
      color: "#333333",
    },
    physics: {
      bodyType: "static",
      shape: { type: "rect", width: 1, height: 3 },
    },
    tags: ["obstacle"],
  },
]
```

## Common Entity Patterns

### Player Character

```typescript
player: {
  id: "player",
  tags: ["player"],
  sprite: {
    type: "rect",
    width: 0.8,
    height: 1.2,
    color: "#4A90E2",
  },
  physics: {
    bodyType: "dynamic",
    shape: { type: "rect", width: 0.8, height: 1.2 },
    density: 1,
    friction: 0.5,
  },
  behaviors: [
    {
      type: "control",
      inputType: "drag",
      moveMode: "direct",
    },
  ],
}
```

### Enemy

```typescript
enemy: {
  id: "enemy",
  tags: ["enemy", "hostile"],
  sprite: {
    type: "circle",
    radius: 0.4,
    color: "#E74C3C",
  },
  physics: {
    bodyType: "dynamic",
    shape: { type: "circle", radius: 0.4 },
    density: 1,
  },
  behaviors: [
    {
      type: "move",
      direction: "left",
      speed: 3,
    },
  ],
}
```

### Collectible

```typescript
coin: {
  id: "coin",
  tags: ["collectible", "coin"],
  sprite: {
    type: "circle",
    radius: 0.2,
    color: "#F1C40F",
  },
  physics: {
    bodyType: "dynamic",
    shape: { type: "circle", radius: 0.2 },
    density: 0.5,
    restitution: 0.6,
  },
}
```

## Physics Properties

| Property | Range | Effect |
|----------|-------|--------|
| `density` | 0.1-10 | How heavy the object is |
| `restitution` | 0-1 | Bounciness (0=no bounce, 1=perfect bounce) |
| `friction` | 0-1 | Surface grip (0=slippery, 1=sticky) |
| `linearDamping` | 0-1 | Air resistance for movement |
| `angularDamping` | 0-1 | Air resistance for rotation |

## Visibility and Activity

Control whether entities are rendered and updated:

```typescript
visible: true,  // Show/hide without removing
active: true,   // Update physics/behaviors
```

## Next Steps

- **[Add Behaviors](./behaviors.md)** - Make entities move and interact
- **[Build Rules](./rules.md)** - Trigger actions on events
- **[Entity Reference](/api-reference/type-aliases/GameEntity)** - Full API docs
