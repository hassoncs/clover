# Sprite Effects Migration Guide

This guide covers the transition from legacy `entityEffects` to the canonical sprite effects system.

## Summary of Changes

- **Legacy Path Removed**: `GameDefinition.effects.entityEffects` is no longer supported.
- **New Canonical Path**: Use `effects` and `effectStates` on `EntityPrefab` or `GameEntity`.
- **Script API**: Use `ctx.applySpriteEffect`, `ctx.updateSpriteEffectParam`, and `ctx.clearSpriteEffect`.
- **Precedence**: Script > Entity > Prefab.

## Migrating Declarative Effects

### Before (Legacy)

```json
{
  "effects": {
    "entityEffects": [
      {
        "entityId": "player",
        "shader": "glow",
        "params": { "color": [255, 0, 0] }
      }
    ]
  }
}
```

### After (Canonical)

Move the effect definition directly to the entity or its prefab:

```typescript
// In your game definition
entities: [
  {
    id: "player",
    prefab: "playerPrefab",
    effects: [
      { effect: "glow", params: { color: "#FF0000" } }
    ]
  }
]
```

## Migrating Conditional Effects

### Before (Legacy)

Conditional effects were often handled by manually calling bridge methods in scripts or using `conditionalBehaviors` with `sprite_effect` behaviors (which were inconsistent).

### After (Canonical)

Use `effectStates` for tag-driven or expression-driven effects:

```typescript
effectStates: [
  {
    when: { hasTag: "is_poisoned" },
    priority: 1,
    effects: [
      { effect: "tint", params: { color: "#00FF00", intensity: 0.5 } }
    ]
  }
]
```

## Migrating Script Effects

### Before (Legacy)

```typescript
// Directly calling bridge (deprecated)
ctx.worldAsync.dispatch({
  type: "apply_sprite_effect",
  entityId: id,
  effect: "glow"
});
```

### After (Canonical)

```typescript
// Use the new synchronous API
const effectId = ctx.applySpriteEffect(id, "glow", { color: "#FFFF00" });

// Update later
ctx.updateSpriteEffectParam(id, effectId, "intensity", 0.8);

// Clear
ctx.clearSpriteEffect(id, effectId);
```

## Key Benefits

1. **Lifecycle Management**: Effects are automatically cleared when entities are destroyed.
2. **State Consistency**: The `EffectDispatcher` ensures that the visual state always matches the underlying tags and script overrides.
3. **Performance**: Optimized material caching and diff-based updates reduce bridge traffic and GPU state changes.
4. **Type Safety**: Full TypeScript support for effect types and parameters.
