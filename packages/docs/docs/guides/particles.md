---
sidebar_position: 5
---

# Particle Effects

Create dynamic particle systems for explosions, trails, and environmental effects.

## What are Particles?

Particles are small, short-lived objects that create visual effects. They're perfect for explosions, smoke, fire, and magical effects.

## Particle Emitters

Emitters spawn particles continuously or on demand:

```typescript
{
  type: "particle_emitter",
  emitterType: "burst" | "continuous",
  particleTemplate: "spark",
  rate: 10, // particles per second
  lifetime: 2, // seconds
}
```

## Emitter Types

### Burst

Emit all particles at once:

```typescript
{
  type: "particle_emitter",
  emitterType: "burst",
  particleTemplate: "explosion",
  count: 20,
  lifetime: 1,
}
```

### Continuous

Emit particles over time:

```typescript
{
  type: "particle_emitter",
  emitterType: "continuous",
  particleTemplate: "smoke",
  rate: 5,
  lifetime: 3,
}
```

## Particle Patterns

### Explosion on Collision

```typescript
rules: [
  {
    trigger: { type: "collision", entityATag: "projectile", entityBTag: "wall" },
    actions: [
      {
        type: "spawn",
        templateId: "explosion_emitter",
        offset: { x: 0, y: 0 },
      },
      {
        type: "destroy",
        targetTag: "projectile",
      },
    ],
  },
]
```

### Fire Trail

```typescript
projectile: {
  id: "projectile",
  tags: ["projectile"],
  sprite: {
    type: "circle",
    radius: 0.2,
    color: "#FF6B6B",
  },
  physics: {
    bodyType: "dynamic",
    shape: { type: "circle", radius: 0.2 },
  },
  behaviors: [
    {
      type: "particle_emitter",
      emitterType: "continuous",
      particleTemplate: "fire",
      rate: 10,
      lifetime: 0.5,
    },
  ],
}
```

### Healing Aura

```typescript
healer: {
  id: "healer",
  tags: ["healer"],
  sprite: {
    type: "circle",
    radius: 0.5,
    color: "#4ECDC4",
  },
  physics: {
    bodyType: "dynamic",
    shape: { type: "circle", radius: 0.5 },
  },
  behaviors: [
    {
      type: "particle_emitter",
      emitterType: "continuous",
      particleTemplate: "heal_sparkle",
      rate: 5,
      lifetime: 1,
    },
  ],
}
```

### Dust on Landing

```typescript
rules: [
  {
    trigger: { type: "collision", entityATag: "player", entityBTag: "ground" },
    actions: [
      {
        type: "spawn",
        templateId: "dust_emitter",
        offset: { x: 0, y: -0.5 },
      },
    ],
  },
]
```

## Particle Templates

Define reusable particle types:

```typescript
templates: {
  spark: {
    id: "spark",
    tags: ["particle"],
    sprite: {
      type: "circle",
      radius: 0.1,
      color: "#FFD700",
    },
    physics: {
      bodyType: "dynamic",
      shape: { type: "circle", radius: 0.1 },
      density: 0.1,
    },
  },
  smoke: {
    id: "smoke",
    tags: ["particle"],
    sprite: {
      type: "circle",
      radius: 0.2,
      color: "#888888",
    },
    physics: {
      bodyType: "dynamic",
      shape: { type: "circle", radius: 0.2 },
      density: 0.05,
    },
  },
}
```

## Common Particle Effects

| Effect | Use Case | Rate | Lifetime |
|--------|----------|------|----------|
| Sparks | Explosions, impacts | 20 | 0.5s |
| Smoke | Fire, explosions | 5 | 2s |
| Dust | Landing, sliding | 10 | 0.3s |
| Sparkles | Magic, healing | 3 | 1s |
| Flames | Fire, heat | 8 | 1.5s |

## Tips

- **Use sparingly** - Too many particles hurt performance
- **Short lifetimes** - Particles should disappear quickly
- **Low density** - Particles should be light and float
- **Attach to entities** - Emitters follow their parent
- **Test on device** - Particle performance varies by device

## Next Steps

- **[Rules Guide](./rules.md)** - Trigger particles on events
- **[Effects Guide](./effects.md)** - Combine with visual effects
- **[Particles Reference](/api-reference/type-aliases/ParticleEmitterType)** - Full API docs
