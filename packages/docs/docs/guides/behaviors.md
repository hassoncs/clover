---
sidebar_position: 3
---

# Adding Behaviors

Behaviors make entities move, respond to input, and interact with the world.

## What are Behaviors?

Behaviors are actions that run every frame. They handle movement, input, spawning, and more. Add them to entities to bring them to life.

```typescript
behaviors: [
  { type: "move", direction: "right", speed: 5 },
  { type: "rotate", speed: 2 },
]
```

## Common Behaviors

### Move

Move an entity in a direction:

```typescript
{
  type: "move",
  direction: "left" | "right" | "up" | "down",
  speed: 3,
}
```

### Rotate

Spin an entity:

```typescript
{
  type: "rotate",
  speed: 2, // radians per second
}
```

### Control (Player Input)

Let players control the entity with drag or buttons:

```typescript
{
  type: "control",
  inputType: "drag" | "button",
  moveMode: "direct" | "force",
}
```

### Spawn

Create new entities at a rate:

```typescript
{
  type: "spawn",
  templateId: "projectile",
  rate: 2, // per second
  offset: { x: 0, y: 1 },
}
```

### Oscillate

Move back and forth smoothly:

```typescript
{
  type: "oscillate",
  axis: "x" | "y",
  amplitude: 2,
  frequency: 1,
}
```

### Scale Oscillate

Pulse the size:

```typescript
{
  type: "scale_oscillate",
  min: 0.8,
  max: 1.2,
  speed: 2,
}
```

### Sprite Effect

Apply visual effects:

```typescript
{
  type: "sprite_effect",
  effect: "glow" | "blur" | "outline" | "tint",
  params: { color: "#FF0000" },
}
```

## Behavior Patterns

### Moving Enemy

```typescript
enemy: {
  id: "enemy",
  tags: ["enemy"],
  sprite: { type: "circle", radius: 0.4, color: "#E74C3C" },
  physics: {
    bodyType: "dynamic",
    shape: { type: "circle", radius: 0.4 },
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

### Spawning Projectiles

```typescript
turret: {
  id: "turret",
  tags: ["turret"],
  sprite: { type: "rect", width: 0.5, height: 0.5, color: "#333" },
  physics: { bodyType: "static", shape: { type: "rect", width: 0.5, height: 0.5 } },
  behaviors: [
    {
      type: "spawn",
      templateId: "projectile",
      rate: 2,
      offset: { x: 0, y: 0.5 },
    },
  ],
}
```

### Rotating Obstacle

```typescript
spinner: {
  id: "spinner",
  tags: ["obstacle"],
  sprite: { type: "rect", width: 2, height: 0.3, color: "#4A90E2" },
  physics: {
    bodyType: "kinematic",
    shape: { type: "rect", width: 2, height: 0.3 },
  },
  behaviors: [
    {
      type: "rotate",
      speed: 3,
    },
  ],
}
```

### Pulsing Collectible

```typescript
gem: {
  id: "gem",
  tags: ["collectible"],
  sprite: { type: "circle", radius: 0.3, color: "#F1C40F" },
  physics: {
    bodyType: "dynamic",
    shape: { type: "circle", radius: 0.3 },
  },
  behaviors: [
    {
      type: "scale_oscillate",
      min: 0.8,
      max: 1.1,
      speed: 3,
    },
  ],
}
```

### Player with Drag Control

```typescript
player: {
  id: "player",
  tags: ["player"],
  sprite: { type: "rect", width: 0.8, height: 1.2, color: "#4A90E2" },
  physics: {
    bodyType: "dynamic",
    shape: { type: "rect", width: 0.8, height: 1.2 },
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

## Behavior Categories

| Category | Behaviors | Use Case |
|----------|-----------|----------|
| **Movement** | move, rotate, oscillate | Enemies, platforms, obstacles |
| **Input** | control | Player character |
| **Spawning** | spawn | Turrets, particle effects |
| **Visual** | sprite_effect, scale_oscillate | Collectibles, effects |
| **Physics** | apply_force, apply_impulse | Projectiles, explosions |

## Conditional Behaviors

Use conditional behaviors to switch behaviors based on tags:

```typescript
conditionalBehaviors: [
  {
    when: { hasTag: "selected" },
    priority: 1,
    behaviors: [
      { type: "scale_oscillate", min: 0.9, max: 1.1, speed: 4 },
    ],
  },
  {
    when: { hasTag: "matched" },
    priority: 2,
    behaviors: [
      { type: "sprite_effect", effect: "fade_out", params: { duration: 0.3 } },
    ],
  },
]
```

## Tips

- **Combine behaviors** - Stack multiple behaviors on one entity
- **Use tags** - Tag entities to identify them in rules
- **Test movement** - Adjust speed values to feel right
- **Layer effects** - Combine visual effects for polish

## Next Steps

- **[Build Rules](./rules.md)** - Trigger actions on events
- **[Effects Guide](./effects.md)** - Add visual polish
- **[Behavior Reference](/api-reference/type-aliases/Behavior)** - Full API docs
