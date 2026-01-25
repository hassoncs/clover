# Property Watching Validation Errors

The Property Watching System validates game definitions at load time to detect issues with property references in expressions.

## Error Types

### Unknown Property Reference

**Error**: Property `{property}` is not recognized

**Cause**: Expression references a property that doesn't exist in the PropertyRegistry

**Fix**: Check the property name. Valid properties include:
- `transform.x`, `transform.y`, `transform.angle`
- `velocity.x`, `velocity.y`, `angularVelocity`
- `health`, `maxHealth`

**Example**:
```typescript
// ❌ Bad - "speed" doesn't exist
{
  type: 'maintain_speed',
  speed: { expr: 'self.speed' }
}

// ✅ Good - use velocity magnitude
{
  type: 'maintain_speed',
  speed: { expr: 'sqrt(self.velocity.x^2 + self.velocity.y^2)' }
}
```

### Invalid Context Access

**Error**: Cannot access `self.{property}` in this context

**Cause**: Using `self` in a context without entity scope (e.g., global rules, game variables)

**Fix**: Only use `self` in:
- Template behaviors
- Entity behaviors
- Entity-scoped rule actions

**Example**:
```typescript
// ❌ Bad - self in global variable
{
  variables: {
    difficulty: { expr: 'self.velocity.x' }  // No entity context!
  }
}

// ✅ Good - use game state
{
  variables: {
    difficulty: { expr: 'score / 100' }
  }
}
```

### Property Scope Mismatch

**Error**: Property `{property}` requires scope `{expectedScope}` but got `{actualScope}`

**Cause**: Property is accessed in wrong scope (e.g., entity property in global context)

**Fix**: Check PropertyRegistry for property's required scope

## Warnings

### Performance Warning

**Warning**: Watching high-frequency property `{property}` on `{scope}` - may impact performance

**Cause**: Syncing frame-rate properties (like velocity) for many entities

**Impact**: Increases network/IPC traffic between Godot and TypeScript

**Mitigation**:
- Limit velocity-based logic to specific entities/behaviors
- Use tags to scope watches: `{ type: 'by_tag', tag: 'player' }`
- Consider using collision-based triggers instead of velocity checks

### Unused Property

**Warning**: Property `{property}` is defined but never referenced

**Cause**: PropertyRegistry contains properties not used in any expression

**Impact**: None - this is informational only

## Validation Report

When a game loads, you'll see a console log like:

```
[GameRuntime.godot] Property watching: {
  valid: true,
  watchCount: 3,
  properties: ['velocity.x', 'velocity.y', 'transform.x'],
  stats: {
    totalExpressions: 5,
    expressionsWithProperties: 2,
    uniqueProperties: 3,
    totalWatches: 3,
    watchesByScope: {
      self: 2,
      all: 1
    }
  }
}
```

### Understanding the Report

- **valid**: `false` if any errors exist (game may not work correctly)
- **watchCount**: Number of property sync subscriptions
- **properties**: Unique properties being synced from Godot
- **stats.totalExpressions**: All expressions analyzed
- **stats.expressionsWithProperties**: Expressions using synced properties
- **watchesByScope**: Distribution of watches by entity scope

## Debugging Tips

1. **Enable validation logging**: Already enabled by default in GameRuntime
2. **Check console on game load**: Errors/warnings appear before gameplay starts
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

## Common Patterns

### Velocity-Based Behaviors

```typescript
// Maintain speed by reading current velocity
{
  type: 'maintain_speed',
  speed: { expr: 'sqrt(self.velocity.x^2 + self.velocity.y^2)' }
}
```

**Properties Watched**: `velocity.x`, `velocity.y` for entity with behavior

### Position-Based Triggers

```typescript
// Trigger when entity reaches position
{
  trigger: {
    type: 'expression',
    expr: 'self.transform.x > 10'
  },
  actions: [{ type: 'add_score', value: 10 }]
}
```

**Properties Watched**: `transform.x` for entity with rule

### Health System

```typescript
// Change sprite based on health
{
  type: 'custom',
  update: { expr: 'self.health < 30 ? "damaged" : "normal"' }
}
```

**Properties Watched**: `health` for entity with behavior

## Related

- [Expression System](./expression-system.md)
- [Property Watching Architecture](../architecture/property-watching.md)
- [Behavior System](./behavior-system.md)
