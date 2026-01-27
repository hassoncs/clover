---
sidebar_position: 4
---

# Visual Effects

Add polish and visual feedback with sprite effects.

## What are Effects?

Effects are visual modifications applied to sprites. They make games feel more responsive and polished without adding complexity.

## Common Effects

### Glow

Make sprites shine:

```typescript
{
  type: "sprite_effect",
  effect: "glow",
  params: {
    color: "#FFD700",
    intensity: 1.5,
  },
}
```

### Blur

Soften edges:

```typescript
{
  type: "sprite_effect",
  effect: "blur",
  params: {
    radius: 2,
  },
}
```

### Outline

Add a border:

```typescript
{
  type: "sprite_effect",
  effect: "outline",
  params: {
    color: "#000000",
    width: 2,
  },
}
```

### Tint

Change color:

```typescript
{
  type: "sprite_effect",
  effect: "tint",
  params: {
    color: "#FF0000",
    alpha: 0.5,
  },
}
```

### Drop Shadow

Add depth:

```typescript
{
  type: "sprite_effect",
  effect: "dropShadow",
  params: {
    offsetX: 2,
    offsetY: 2,
    blur: 4,
    color: "#000000",
    alpha: 0.5,
  },
}
```

### Holographic

Shimmering effect:

```typescript
{
  type: "sprite_effect",
  effect: "holographic",
  params: {
    intensity: 1,
    speed: 2,
  },
}
```

### Pixelate

Retro look:

```typescript
{
  type: "sprite_effect",
  effect: "pixelate",
  params: {
    pixelSize: 4,
  },
}
```

### Dissolve

Fade away:

```typescript
{
  type: "sprite_effect",
  effect: "dissolve",
  params: {
    duration: 0.5,
  },
}
```

## Effect Patterns

### Glowing Collectible

```typescript
gem: {
  id: "gem",
  tags: ["collectible"],
  sprite: {
    type: "circle",
    radius: 0.3,
    color: "#FFD700",
  },
  physics: {
    bodyType: "dynamic",
    shape: { type: "circle", radius: 0.3 },
  },
  behaviors: [
    {
      type: "sprite_effect",
      effect: "glow",
      params: { color: "#FFD700", intensity: 1.5 },
    },
    {
      type: "scale_oscillate",
      min: 0.8,
      max: 1.1,
      speed: 3,
    },
  ],
}
```

### Outlined Enemy

```typescript
enemy: {
  id: "enemy",
  tags: ["enemy"],
  sprite: {
    type: "circle",
    radius: 0.4,
    color: "#E74C3C",
  },
  physics: {
    bodyType: "dynamic",
    shape: { type: "circle", radius: 0.4 },
  },
  behaviors: [
    {
      type: "sprite_effect",
      effect: "outline",
      params: { color: "#000000", width: 2 },
    },
  ],
}
```

### Holographic Text

```typescript
title: {
  id: "title",
  tags: ["ui"],
  sprite: {
    type: "text",
    text: "LEVEL UP!",
    fontSize: 48,
    color: "#FFFFFF",
  },
  transform: { x: 0, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
  behaviors: [
    {
      type: "sprite_effect",
      effect: "holographic",
      params: { intensity: 1, speed: 2 },
    },
  ],
}
```

### Fading Projectile

```typescript
projectile: {
  id: "projectile",
  tags: ["projectile"],
  sprite: {
    type: "circle",
    radius: 0.2,
    color: "#4A90E2",
  },
  physics: {
    bodyType: "dynamic",
    shape: { type: "circle", radius: 0.2 },
  },
  behaviors: [
    {
      type: "sprite_effect",
      effect: "dissolve",
      params: { duration: 2 },
    },
  ],
}
```

## Stacking Effects

Combine multiple effects on one entity:

```typescript
behaviors: [
  {
    type: "sprite_effect",
    effect: "glow",
    params: { color: "#FFD700", intensity: 1.5 },
  },
  {
    type: "sprite_effect",
    effect: "outline",
    params: { color: "#000000", width: 1 },
  },
  {
    type: "scale_oscillate",
    min: 0.9,
    max: 1.1,
    speed: 2,
  },
]
```

## Effect Parameters

| Effect | Parameters | Default |
|--------|-----------|---------|
| glow | color, intensity | #FFFFFF, 1 |
| blur | radius | 2 |
| outline | color, width | #000000, 1 |
| tint | color, alpha | #FFFFFF, 0.5 |
| dropShadow | offsetX, offsetY, blur, color, alpha | 2, 2, 4, #000000, 0.5 |
| holographic | intensity, speed | 1, 1 |
| pixelate | pixelSize | 4 |
| dissolve | duration | 1 |

## Tips

- **Use sparingly** - Effects are powerful but can slow performance
- **Combine with behaviors** - Pair effects with scale_oscillate for polish
- **Test on device** - Effects may look different on mobile
- **Layer effects** - Stack 2-3 effects for best results

## Next Steps

- **[Particles Guide](./particles.md)** - Add particle effects
- **[Effects Reference](/api-reference/type-aliases/EffectSpec)** - Full API docs
