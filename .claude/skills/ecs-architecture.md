---
description: "Entity-Component-System architecture for the game engine. Covers prefabs, entities, components, spawning, GameDefinition, EntityManager, behaviors, rules, archetypes, and world settings. Use when working on game logic, entity management, or the rules/behavior system."
---

# ECS Architecture

> **Skill for AI Agents**: Prefabs, entities, components, GameDefinition, rules, behaviors

## When to Use This Skill

Load when working on: entities, prefabs, components, spawning, GameDefinition, EntityManager, behaviors, rules, archetypes, world settings, game logic

## Key Concepts

- **Data-driven ECS**: Components are data fields on Entity/Prefab objects, not class instances
- **`EntityPrefab`** = blueprint, **`GameEntity`** = runtime instance
- **`GameDefinition`** is the root JSON schema for a playable level
- **`EntityManager`** is the single source of truth for runtime entity state
- **Template→Prefab** rename is complete (legacy refs may exist)

## Prefab Structure

`EntityPrefab` key fields: `id`, `archetype`, plus component blocks:
- `visual`: Image/asset (assetId, opacity, layer)
- `physics`: Mass, damping, gravityScale, bodyType (static/dynamic)
- `collider`: Shape (box/circle/capsule), sensor mode, collision layers
- `character`: Movement speed, jump force
- `behaviors`: Array of `Behavior` objects
- `conditionalBehaviors`: Tag-driven behavior groups
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
  "prefabs": { "ball": { ... }, "wall": { ... } },
  "entities": [{ "prefabId": "ball", "x": 5, "y": 2 }],
  "rules": [{ "trigger": "collision", "conditions": [], "actions": [] }],
  "variables": { "score": 0, "lives": 3 },
  "script": "// optional JS logic"
}
```

### Rules System
Pattern: **Trigger** → **Condition[]** → **Action[]**
- **Triggers**: `collision`, `timer`, `tap`, `entity_count`, `game_started`
- **Conditions**: `variable` check, `entity_exists`, `random` probability
- **Actions**: `spawn`, `destroy`, `sound`, `set_variable`, `game_state` (win/lose)

### Behaviors
Types: `move`, `rotate`, `timer`, `draggable`, `spawn_on_event`, `oscillate`
Attached to prefabs as data, processed by engine systems.

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
| `shared/src/types/rules.ts` | Trigger/Condition/Action definitions |
| `shared/src/types/behavior.ts` | Behavior type definitions |
| `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts` | Rules execution |

## Related Skills

- [game-authoring](game-authoring.md) — Creating games using this ECS
- [bridge-development](bridge-development.md) — How entities communicate with Godot
- [effects-system](effects-system.md) — Visual effects on entities
