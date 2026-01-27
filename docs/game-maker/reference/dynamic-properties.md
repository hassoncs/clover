# Dynamic Property System

The Dynamic Property System allows game definitions to reference **any custom property** without pre-defining it in TypeScript. Properties are defined in game entity metadata and automatically synced from Godot to TypeScript for use in expressions.

## Quick Example

```typescript
// Define custom properties in entity metadata
{
  id: 'player',
  metadata: {
    stats: {
      strength: 10,
      agility: 15,
      intelligence: 8
    },
    inventory: ['sword', 'shield', 'potion']
  }
}

// Reference in expressions
{
  type: 'maintain_speed',
  speed: { expr: 'self.stats.agility * 0.5' }  // ✅ Works!
}

{
  trigger: {
    type: 'expression',
    expr: 'self.stats.strength > 20'  // ✅ Works!
  }
}
```

## How It Works

### 1. Property Definition (Game JSON)

Properties are stored as **node metadata** in Godot:

```typescript
// In GameDefinition
{
  entities: [
    {
      id: 'player',
      metadata: {
        health: 100,
        maxHealth: 100,
        stats: {
          combat: {
            strength: 10,
            defense: 5
          },
          movement: {
            speed: 8,
            jump: 12
          }
        },
        inventory: ['sword', 'shield']
      }
    }
  ]
}
```

### 2. Property Collection (Godot → TypeScript)

PropertyCollector recursively walks node metadata:

```gdscript
# PropertyCollector.gd
func _collect_metadata_properties(node: Node, snapshot: Dictionary) -> void:
  var metadata_list = node.get_meta_list()
  
  for key in metadata_list:
    var value = node.get_meta(key)
    
    # Nested properties: stats.combat.strength
    if typeof(value) == TYPE_DICTIONARY:
      _collect_nested_dict(key, value, snapshot)
    
    # Array properties: inventory[0]
    elif typeof(value) == TYPE_ARRAY:
      _collect_array(key, value, snapshot)
    
    # Simple properties: health
    else:
      snapshot[key] = _convert_value_to_json(value)
```

**Property paths** created:
- `health` → 100
- `maxHealth` → 100
- `stats.combat.strength` → 10
- `stats.combat.defense` → 5
- `stats.movement.speed` → 8
- `stats.movement.jump` → 12
- `inventory[0]` → 'sword'
- `inventory[1]` → 'shield'

### 3. Demand-Driven Sync (Selective Collection)

Only properties **used in expressions** are synced:

```typescript
// DependencyAnalyzer scans game definition
const analyzer = new DependencyAnalyzer(gameDefinition);
const report = analyzer.analyze();
const watches = analyzer.getWatchSpecs();

// WatchRegistry builds active config
const registry = new WatchRegistry();
registry.addWatches(watches);
const activeConfig = registry.getActiveConfig();

// GameRuntime sends config to Godot
bridge.setWatchConfig(activeConfig);
```

**Example**: If only `self.stats.combat.strength` is used in expressions:
- ✅ PropertyCollector syncs `stats.combat.strength`
- ❌ PropertyCollector skips `stats.combat.defense`, `stats.movement.*`, `inventory`

### 4. Type Coercion (Godot → TypeScript)

PropertyCache automatically coerces values based on **inferred types**:

```typescript
// PropertyCache.ts
const knownMetadata = PropertyRegistry.getMetadata(property);

const metadata = knownMetadata ?? {
  scope: 'entity',
  source: 'game',
  frequency: 'change',
  type: TypeCoercion.inferType(value),  // Infer from actual value
};

const coercedValue = TypeCoercion.coerceToExpectedType(value, metadata);
```

**Type inference rules**:
- `typeof value === 'number'` → `type: 'number'`
- `typeof value === 'string'` → `type: 'string'`
- `typeof value === 'boolean'` → `type: 'boolean'`
- `value has {x, y}` → `type: 'vec2'`
- Default → `type: 'string'`

**Coercion examples**:
- `'42'` → `42` (if expected type is number)
- `true` → `1` (if expected type is number)
- `42` → `'42'` (if expected type is string)
- `{x: '5', y: '10'}` → `{x: 5, y: 10}` (if expected type is vec2)

### 5. Nested Property Access (TypeScript)

EntityContextProxy provides dynamic nested access:

```typescript
// EntityContextProxy.ts
static createEntityContext(cache: PropertyCache, entityId: string) {
  function createNestedProxy(basePath: string): Record<string, unknown> {
    return new Proxy({}, {
      get(target, prop: string) {
        const fullPath = basePath ? `${basePath}.${prop}` : prop;
        const value = proxy.get(fullPath);
        
        // If value is object, return nested proxy for further drilling
        if (value !== undefined && typeof value === 'object') {
          return createNestedProxy(fullPath);
        }
        
        return value;
      }
    });
  }
  
  return new Proxy(snapshot, {
    get(target, prop: string) {
      // Direct properties
      const directValue = proxy.get(prop);
      if (directValue !== undefined) return directValue;
      
      // Nested properties
      return createNestedProxy(prop);
    }
  });
}
```

**Usage in expressions**:
```typescript
self.stats.combat.strength  // → Looks up "stats.combat.strength" in cache
self.inventory[0]           // → Looks up "inventory[0]" in cache
```

## Supported Property Types

| Type | Example Value | Godot Type | TypeScript Type |
|------|---------------|------------|-----------------|
| **Number** | `42`, `3.14` | int, float | number |
| **String** | `'sword'`, `'red'` | String | string |
| **Boolean** | `true`, `false` | bool | boolean |
| **Vec2** | `{x: 5, y: 10}` | Vector2 | {x: number, y: number} |
| **Nested Object** | `{stats: {str: 10}}` | Dictionary | PropertyPath: 'stats.str' |
| **Array** | `['a', 'b', 'c']` | Array | PropertyPath: 'arr[0]', 'arr[1]', 'arr[2]' |

## Coordinate System

Godot uses **top-left origin, Y-down**. Game uses **center origin, Y-up**.

PropertyCollector handles conversion automatically for `transform.*` and `velocity.*` properties:

```gdscript
func _collect_transform_properties(node: Node2D, snapshot: Dictionary) -> void:
  var game_pos = game_bridge.godot_to_game_pos(node.global_position)
  snapshot["transform.x"] = game_pos.x
  snapshot["transform.y"] = game_pos.y
  snapshot["transform.angle"] = -rad_to_deg(node.rotation)  # Flip rotation

func _collect_velocity_properties(node: RigidBody2D, snapshot: Dictionary) -> void:
  var game_vel = game_bridge.godot_to_game_vec(node.linear_velocity)
  snapshot["velocity.x"] = game_vel.x
  snapshot["velocity.y"] = game_vel.y  # Y already flipped
```

**Custom properties** are NOT coordinate-converted (use raw values from metadata).

## Performance Optimization

### Selective Sync (Demand-Driven)

Only sync properties **actually used** in expressions:

**Bad (syncs everything)**:
```typescript
// No expressions use custom properties
// PropertyCollector still syncs all metadata (wasteful)
```

**Good (syncs only what's needed)**:
```typescript
// Expression uses self.stats.strength
// PropertyCollector ONLY syncs "stats.strength" (efficient)
```

### Frame vs Change Frequency

Properties have sync frequencies:

| Frequency | When Synced | Use For |
|-----------|-------------|---------|
| **frame** | Every `_physics_process()` (60Hz) | Physics (velocity, transform) |
| **change** | Only when value changes (event-driven) | Game state (health, score) |
| **static** | Once on spawn | Constants (maxHealth, entityType) |
| **demand** | On explicit request | Rare queries (tags, config) |

Currently **all properties sync at frame rate** (60Hz). Future optimization: implement change detection.

### Bandwidth Estimation

**Current**: ~2-5 KB/frame for typical game (10 entities, 5 properties each)

**Future optimizations**:
- Compact binary format (PropertyPath indices instead of strings)
- Delta compression (only send changed values)
- Batched updates (collect multiple frames, send once)

## Known Property Registry

Pre-defined properties in `PropertyRegistry.ts`:

```typescript
const PROPERTY_REGISTRY: Record<PropertyPath, PropertyMetadata> = {
  'transform.x': { scope: 'entity', source: 'physics', frequency: 'frame', type: 'number' },
  'transform.y': { scope: 'entity', source: 'physics', frequency: 'frame', type: 'number' },
  'transform.angle': { scope: 'entity', source: 'physics', frequency: 'frame', type: 'number' },
  'velocity.x': { scope: 'entity', source: 'physics', frequency: 'frame', type: 'number' },
  'velocity.y': { scope: 'entity', source: 'physics', frequency: 'frame', type: 'number' },
  'angularVelocity': { scope: 'entity', source: 'physics', frequency: 'frame', type: 'number' },
  'health': { scope: 'entity', source: 'game', frequency: 'change', type: 'number' },
  'maxHealth': { scope: 'entity', source: 'game', frequency: 'static', type: 'number' },
  'score': { scope: 'global', source: 'game', frequency: 'change', type: 'number' },
  // ...
};
```

**Unknown properties** use inferred metadata based on naming patterns + actual values.

## Validation & Error Handling

### Type Validation (Optional)

Enable validation in PropertyCache:

```typescript
const cache = new PropertyCache(true);  // Enable validation warnings
```

**Validation warnings**:
```
[PropertyCache] Type validation failed for player.transform.x: Expected number, got string
  { value: "not a number", coercedValue: undefined, expectedType: "number" }
```

### Unknown Property Warnings

DependencyAnalyzer warns about unknown properties:

```typescript
const analyzer = new DependencyAnalyzer(definition);
const report = analyzer.analyze();

if (report.warnings.length > 0) {
  console.log('[GameRuntime] Property watching warnings:', report.warnings);
}
```

**Example warning**:
```json
{
  "severity": "warning",
  "code": "UNKNOWN_PROPERTY",
  "message": "Property 'stats.agility' not in registry. Will infer metadata at runtime.",
  "location": {
    "entity": "player",
    "behavior": "maintain_speed",
    "expression": "self.stats.agility * 0.5"
  }
}
```

## Common Patterns

### RPG Stats System

```typescript
{
  id: 'player',
  metadata: {
    stats: {
      combat: { strength: 10, defense: 5, crit: 0.15 },
      movement: { speed: 8, jump: 12 },
      magic: { mana: 100, maxMana: 100, regen: 5 }
    }
  },
  behaviors: [
    {
      type: 'maintain_speed',
      speed: { expr: 'self.stats.movement.speed' }
    },
    {
      trigger: { type: 'expression', expr: 'self.stats.magic.mana < 20' },
      actions: [{ type: 'custom', action: 'use_mana_potion' }]
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
      armor: ['helmet', 'chestplate'],
      consumables: ['potion', 'scroll']
    },
    equipped: {
      weapon: 'sword',
      armor: 'chestplate'
    }
  }
}

// Access in expressions:
// self.inventory.weapons[0]  →  'sword'
// self.equipped.weapon       →  'sword'
```

### Status Effects

```typescript
{
  id: 'enemy',
  metadata: {
    effects: {
      burning: { active: true, damage: 5, duration: 3.0 },
      stunned: { active: false },
      poisoned: { active: true, damage: 2, tickRate: 1.0 }
    }
  }
}

// Trigger on effect:
{
  trigger: { type: 'expression', expr: 'self.effects.burning.active' },
  actions: [{ type: 'damage', amount: { expr: 'self.effects.burning.damage' } }]
}
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     GAME DEFINITION (JSON)                       │
│  { entities: [{ metadata: { stats: { strength: 10 } } }] }     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  DEPENDENCY ANALYZER (TypeScript)                │
│  Scans expressions → Extracts property dependencies             │
│  Output: PropertyWatchSpec[]                                    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WATCH REGISTRY (TypeScript)                    │
│  Builds ActiveWatchConfig from watch specs                      │
│  Output: { frameProperties, changeProperties, entityWatches }   │
└─────────────────────────┬───────────────────────────────────────┘
                          │ setWatchConfig(config)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PROPERTY COLLECTOR (Godot)                     │
│  Walks node metadata recursively                                │
│  Filters by watch config (selective collection)                 │
│  Converts Godot types → JSON                                    │
│  Output: PropertySyncPayload                                    │
└─────────────────────────┬───────────────────────────────────────┘
                          │ onPropertySync(payload)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PROPERTY CACHE (TypeScript)                   │
│  Receives PropertySyncPayload from Godot                        │
│  Infers types from values (TypeCoercion.inferType)              │
│  Coerces values to expected types                               │
│  Stores in frame-synchronized cache                             │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                 ENTITY CONTEXT PROXY (TypeScript)                │
│  Provides dynamic nested property access                        │
│  Proxy: self.stats.combat.strength                              │
│  Lookup: cache.get('player', 'stats.combat.strength')           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  EXPRESSION EVALUATOR (TypeScript)               │
│  Evaluates expressions with current property values             │
│  Example: 'self.stats.agility * 0.5' → 15 * 0.5 → 7.5          │
└─────────────────────────────────────────────────────────────────┘
```

## Related Files

| File | Purpose |
|------|---------|
| `shared/src/expressions/property-watching/types.ts` | Type definitions |
| `shared/src/expressions/property-watching/PropertyRegistry.ts` | Known property metadata |
| `shared/src/expressions/property-watching/DependencyAnalyzer.ts` | Extract dependencies from expressions |
| `shared/src/expressions/property-watching/WatchRegistry.ts` | Build active watch config |
| `shared/src/expressions/property-watching/PropertyCache.ts` | Store synced properties |
| `shared/src/expressions/property-watching/EntityContextProxy.ts` | Dynamic nested access |
| `shared/src/expressions/property-watching/TypeCoercion.ts` | Type inference and coercion |
| `godot_project/scripts/PropertyCollector.gd` | Collect properties from Godot |
| `godot_project/scripts/GameBridge.gd` | Godot ↔ TypeScript bridge |
| `app/lib/godot/PropertySyncManager.ts` | Coordinate property sync |
| `app/lib/game-engine/GameRuntime.godot.tsx` | Game runtime integration |

## See Also

- [Expression System](./expression-system.md) - How expressions are parsed and evaluated
- [Behavior System](./behavior-system.md) - How behaviors use expressions
- [Entity System](./entity-system.md) - Entity metadata structure
