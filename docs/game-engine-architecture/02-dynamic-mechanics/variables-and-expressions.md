---
status: active
created: 2026-01-26
updated: 2026-01-26
related:
  - ../02-dynamic-mechanics/roadmap.md
  - ../06-ai-integration/generation-pipeline.md
---

# Variables and Expressions Guide

Comprehensive guide to the dynamic properties system, expression language, and property watching in Slopcade games.

## Variables System Overview

Variables store game state that changes during gameplay. They're defined at the game level and can be referenced in expressions, behaviors, and rules.

### Basic Variables

```typescript
{
  variables: {
    score: 0,
    health: 100,
    maxHealth: 100,
    level: 1,
    itemsCollected: 0
  }
}
```

### Nested Variables (Metadata)

Custom properties are stored in entity metadata and automatically synced:

```typescript
{
  id: 'player',
  metadata: {
    stats: {
      strength: 10,
      agility: 15,
      intelligence: 8
    },
    inventory: ['sword', 'shield', 'potion'],
    effects: {
      burning: { active: true, damage: 5, duration: 3.0 },
      stunned: { active: false }
    }
  }
}
```

### Variable Scopes

| Scope | Access | Use For |
|-------|--------|---------|
| **Global** | `score`, `level` | Game-wide state |
| **Entity** | `self.health`, `self.stats.strength` | Per-entity state |
| **Metadata** | `self.inventory[0]`, `self.effects.burning.active` | Custom properties |

## Expression Language Basics

Expressions are evaluated in real-time to compute dynamic values. They support:

### Operators

```typescript
// Arithmetic
speed: { expr: '5 + score * 0.1' }
damage: { expr: 'strength * 1.5 - defense' }

// Comparison
trigger: { expr: 'health < 30' }
condition: { expr: 'score >= 1000' }

// Logical
trigger: { expr: 'health < 30 && score > 0' }
condition: { expr: 'burning || poisoned' }

// Ternary (Phase 2)
sprite: { expr: 'health < 30 ? "damaged" : "normal"' }
```

### Available Functions

**Math Functions**:
- `min(a, b)` - Minimum value
- `max(a, b)` - Maximum value
- `clamp(value, min, max)` - Constrain to range
- `abs(x)` - Absolute value
- `sqrt(x)` - Square root
- `sin(x)`, `cos(x)` - Trigonometry (Phase 2)
- `floor(x)`, `ceil(x)` - Rounding (Phase 2)

**Example**:
```typescript
// Clamp speed between 0 and 10
speed: { expr: 'clamp(baseSpeed + boost, 0, 10)' }

// Calculate velocity magnitude
velocity: { expr: 'sqrt(vx^2 + vy^2)' }
```

### Expression Contexts

**Behavior Parameters**:
```typescript
{
  type: 'maintain_speed',
  speed: { expr: '5 + score * 0.1' }  // ✅ Works
}
```

**Rule Conditions**:
```typescript
{
  trigger: { type: 'expression', expr: 'health < 30' }  // ✅ Works
}
```

**Rule Actions**:
```typescript
{
  actions: [
    { type: 'add_score', value: { expr: 'level * 10' } }  // ✅ Works
  ]
}
```

## Property Watching (self.* References)

The property watching system automatically syncs entity properties from Godot to TypeScript for use in expressions.

### Built-in Properties

**Transform**:
- `self.transform.x` - X position (center-based)
- `self.transform.y` - Y position (center-based)
- `self.transform.angle` - Rotation in degrees

**Physics**:
- `self.velocity.x` - Horizontal velocity
- `self.velocity.y` - Vertical velocity
- `self.angularVelocity` - Rotation speed

**Game State**:
- `self.health` - Current health
- `self.maxHealth` - Maximum health

### Custom Properties

Access any metadata property via dot notation:

```typescript
// From entity metadata
self.stats.strength        // → 10
self.stats.combat.defense  // → 5
self.inventory[0]          // → 'sword'
self.effects.burning.active // → true
```

### How Property Watching Works

1. **Dependency Analysis**: Expressions are scanned to find property references
2. **Watch Registry**: Active properties are registered for sync
3. **Property Collection**: Godot collects only watched properties
4. **Type Coercion**: Values are converted to expected types
5. **Entity Context**: Nested access via proxy objects

**Example Flow**:
```typescript
// Expression uses self.stats.strength
{ expr: 'self.stats.strength > 20' }

// PropertyCollector syncs only "stats.strength"
// PropertyCache stores: { 'stats.strength': 10 }
// EntityContextProxy provides: self.stats.strength → 10
```

### Coordinate System

Godot uses **top-left origin, Y-down**. Game uses **center origin, Y-up**.

PropertyCollector handles conversion automatically for `transform.*` and `velocity.*` properties. Custom metadata properties are NOT converted (use raw values).

## Common Patterns

### Score Multipliers

```typescript
variables: {
  score: 0,
  multiplier: 1
}

// Increase multiplier with combo
{
  trigger: { type: 'collision', tags: ['player', 'collectible'] },
  actions: [
    { type: 'set_variable', name: 'multiplier', value: { expr: 'multiplier + 0.1' } },
    { type: 'add_score', value: { expr: '10 * multiplier' } }
  ]
}
```

### Difficulty Scaling

```typescript
variables: {
  level: 1,
  enemySpeed: 5
}

// Speed increases with level
{
  type: 'maintain_speed',
  speed: { expr: '5 + level * 0.5' }
}
```

### Health-Based Behavior

```typescript
{
  id: 'player',
  metadata: { health: 100, maxHealth: 100 }
}

// Change sprite when damaged
{
  type: 'custom',
  update: { expr: 'self.health < 30 ? "damaged" : "normal"' }
}

// Trigger when critical
{
  trigger: { type: 'expression', expr: 'self.health < 20' },
  actions: [{ type: 'event', eventName: 'critical_health' }]
}
```

### RPG Stats System

```typescript
{
  id: 'player',
  metadata: {
    stats: {
      combat: { strength: 10, defense: 5, crit: 0.15 },
      movement: { speed: 8, jump: 12 }
    }
  },
  behaviors: [
    {
      type: 'maintain_speed',
      speed: { expr: 'self.stats.movement.speed' }
    }
  ]
}
```

### Inventory System

```typescript
{
  id: 'player',
  metadata: {
    inventory: {
      weapons: ['sword', 'bow', 'staff'],
      armor: ['helmet', 'chestplate']
    },
    equipped: { weapon: 'sword' }
  }
}

// Access in expressions:
// self.inventory.weapons[0]  →  'sword'
// self.equipped.weapon       →  'sword'
```

## Troubleshooting

### Unknown Property Reference

**Error**: Property `{property}` is not recognized

**Cause**: Expression references a property that doesn't exist

**Fix**: Check the property name. Valid properties include:
- `transform.x`, `transform.y`, `transform.angle`
- `velocity.x`, `velocity.y`, `angularVelocity`
- `health`, `maxHealth`
- Custom metadata properties defined in entity

**Example**:
```typescript
// ❌ Bad - "speed" doesn't exist
{ type: 'maintain_speed', speed: { expr: 'self.speed' } }

// ✅ Good - use velocity magnitude
{ type: 'maintain_speed', speed: { expr: 'sqrt(self.velocity.x^2 + self.velocity.y^2)' } }
```

### Invalid Context Access

**Error**: Cannot access `self.{property}` in this context

**Cause**: Using `self` in a context without entity scope (e.g., global variables)

**Fix**: Only use `self` in:
- Template behaviors
- Entity behaviors
- Entity-scoped rule actions

**Example**:
```typescript
// ❌ Bad - self in global variable
{ variables: { difficulty: { expr: 'self.velocity.x' } } }

// ✅ Good - use game state
{ variables: { difficulty: { expr: 'score / 100' } } }
```

### Property Scope Mismatch

**Error**: Property `{property}` requires scope `{expectedScope}` but got `{actualScope}`

**Cause**: Property accessed in wrong scope (e.g., entity property in global context)

**Fix**: Check PropertyRegistry for property's required scope

### Performance Warning

**Warning**: Watching high-frequency property `{property}` - may impact performance

**Cause**: Syncing frame-rate properties (like velocity) for many entities

**Mitigation**:
- Limit velocity-based logic to specific entities/behaviors
- Use tags to scope watches: `{ type: 'by_tag', tag: 'player' }`
- Consider collision-based triggers instead of velocity checks

### Validation Report

When a game loads, check console for:

```
[GameRuntime.godot] Property watching: {
  valid: true,
  watchCount: 3,
  properties: ['velocity.x', 'velocity.y', 'transform.x'],
  stats: {
    totalExpressions: 5,
    expressionsWithProperties: 2,
    uniqueProperties: 3
  }
}
```

**Understanding the Report**:
- **valid**: `false` if any errors exist
- **watchCount**: Number of property sync subscriptions
- **properties**: Unique properties being synced
- **stats.totalExpressions**: All expressions analyzed
- **stats.expressionsWithProperties**: Expressions using synced properties

### Debugging Tips

1. **Enable validation logging**: Already enabled by default in GameRuntime
2. **Check console on game load**: Errors/warnings appear before gameplay
3. **Test incrementally**: Add property-based expressions one at a time
4. **Use DependencyAnalyzer directly**:

```typescript
import { DependencyAnalyzer } from '@slopcade/shared';

const analyzer = new DependencyAnalyzer(gameDefinition);
const report = analyzer.analyze();
const watches = analyzer.getWatchSpecs();

console.log('Validation Report:', report);
console.log('Property Watches:', watches);
```

## Integration with Behaviors and Rules

### Behavior Integration

Behaviors can use expressions for dynamic parameters:

```typescript
{
  type: 'maintain_speed',
  speed: { expr: '5 + score * 0.1' }  // Dynamic speed
}

{
  type: 'oscillate',
  amplitude: { expr: 'clamp(level, 1, 5)' }  // Scales with level
}
```

### Rule Integration

Rules can use expressions in conditions and actions:

```typescript
{
  trigger: { type: 'expression', expr: 'self.health < 30' },
  conditions: [
    { type: 'expression', expr: 'score > 100' }
  ],
  actions: [
    { type: 'add_score', value: { expr: 'level * 10' } },
    { type: 'set_variable', name: 'multiplier', value: { expr: 'multiplier * 1.5' } }
  ]
}
```

## Performance Optimization

### Selective Sync (Demand-Driven)

Only sync properties actually used in expressions:

**Good** (syncs only what's needed):
```typescript
// Expression uses self.stats.strength
// PropertyCollector ONLY syncs "stats.strength" (efficient)
```

### Frame vs Change Frequency

| Frequency | When Synced | Use For |
|-----------|-------------|---------|
| **frame** | Every physics frame (60Hz) | Physics (velocity, transform) |
| **change** | Only when value changes | Game state (health, score) |
| **static** | Once on spawn | Constants (maxHealth, entityType) |

Currently all properties sync at frame rate. Future optimization: implement change detection.

## Related Documentation

- [Dynamic Mechanics Roadmap](../roadmap/dynamic-mechanics-roadmap.md) - Phase 1-4 implementation plan
### Related Documentation

- [AI Integration](../06-ai-integration/generation-pipeline.md) - Expression generation from natural language
- [Behavior System](../01-core-concepts/behavior-system.md) - How behaviors use expressions
- [Game Rules](../01-core-concepts/rules-system.md) - Triggers, conditions, actions
- [Entity System](../01-core-concepts/entity-system.md) - Entity metadata structure

## Implementation References

- **RFC-001**: Derived Values System (expression foundation)
- **IMPLEMENTATION-SPEC-002**: Property Watching Architecture
- **PropertyRegistry.ts**: Known property metadata
- **DependencyAnalyzer.ts**: Extract dependencies from expressions
- **PropertyCache.ts**: Store synced properties
- **EntityContextProxy.ts**: Dynamic nested access
