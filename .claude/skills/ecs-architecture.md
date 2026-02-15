---
name: ecs-architecture
description: "Entity-Component-System architecture for the game engine. Covers prefabs, entities, components, spawning, GameDefinition, EntityManager, scriptRef, archetypes, and world settings. Use when working on game logic, entity management, or the scripting system."
---

# ECS Architecture

> **Skill for AI Agents**: Prefabs, entities, components, GameDefinition, scriptRef, modules

## When to Use This Skill

Load when working on: entities, prefabs, components, spawning, GameDefinition, EntityManager, scriptRef, archetypes, world settings, game logic

## Key Concepts

- **Script-First**: Game logic lives in JavaScript modules, NOT in declarative rules/behaviors.
- **`scriptRef`**: Prefabs and Entities point to a module key via `scriptRef`.
- **Data-driven ECS**: Components are data fields on Entity/Prefab objects, not class instances
- **`EntityPrefab`** = blueprint, **`GameEntity`** = runtime instance
- **`GameDefinition`** is the root JSON schema for a playable level
- **`EntityManager`** is the single source of truth for runtime entity state
- **Template→Prefab** rename is complete

## Prefab Structure

`EntityPrefab` key fields: `id`, `archetype`, `scriptRef`, plus component blocks:
- `visual`: Image/asset (assetId, opacity, layer)
- `physics`: Mass, damping, gravityScale, bodyType (static/dynamic)
- `collider`: Shape (box/circle/capsule), sensor mode, collision layers
- `character`: Movement speed, jump force
- `scriptRef`: Points to a module key (e.g., "PlayerController")
- `children`: Nested `ChildPrefabDefinition` for hierarchical entities

## Common Patterns

### Entity Lifecycle
```typescript
// Spawn from prefab
const entityId = entityManager.spawnEntity({
  prefabId: 'ball', x: 5, y: 2, tags: ['projectile']
});

// Destroy (recursive removes children)
entityManager.destroyEntity(entityId, { recursive: true });

// Query by tag
const enemies = entityManager.getEntitiesByTag('enemy');
```

### GameDefinition Structure
```json
{
  "world": { "gravity": { "x": 0, "y": 9.8 } },
  "prefabs": { "ball": { "scriptRef": "Ball", ... }, "wall": { ... } },
  "entities": [{ "prefabId": "ball", "x": 5, "y": 2 }],
  "variables": { "score": 0, "lives": 3 },
  "modules": { "Ball": "exports.onStart = ...", "main": "..." }
}
```

### Scripting System
Pattern: **Entity** → **scriptRef** → **Module**
- **Hooks**: `onStart`, `onUpdate`, `onInput`, `onCollision`
- **Lifecycle**: Handled by `ScriptSandboxRuntimeSystem`
- **Context**: Injected `ScriptContext` provides engine APIs

## Gotchas

- `score` and `lives` are NOT special — they're generic variables in `GameDefinition.variables`
- All communication between engine and React UI flows through `GameEventBus` (no direct system access)
- Each system has single ownership via `SystemContext` injection
- Transform has `worldTransform` vs `localTransform` — use `worldTransform` for absolute positioning

## File References

| File | Purpose |
|------|---------|
| `shared/src/types/entity.ts` | `EntityPrefab`, `GameEntity` types |
| `shared/src/types/GameDefinition.ts` | Root game schema |
| `app/lib/game-engine/EntityManager.ts` | Entity lifecycle management |
| `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts` | Script execution |

## Related Skills

- [game-authoring](game-authoring.md) — Creating games using this ECS
- [bridge-development](bridge-development.md) — How entities communicate with Godot
- [scripting-api-reference](game-authoring/scripting-api-reference.md) — Full JS API
