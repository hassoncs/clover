# RFC-001: Derived Values System

> **Status**: Draft  
> **Author**: AI Assistant  
> **Created**: 2026-01-21  
> **Last Updated**: 2026-01-21

## Summary

Add a computed/derived values system to the game engine that allows game properties to be calculated from runtime state rather than static configuration. This enables dynamic game mechanics like difficulty scaling, score-based speed increases, and emergent gameplay without hardcoding every scenario.

## Motivation

### Current Limitation

Currently, all behavior parameters in the game engine are static values defined at design time:

```json
{
  "type": "move",
  "direction": "right",
  "speed": 5
}
```

The ball moves at speed 5 forever, regardless of game state. To implement "ball speeds up as score increases," you'd need to write custom behavior code or complex rule chains.

### Desired Capability

Enable values to be expressions that reference runtime state:

```json
{
  "type": "move",
  "direction": "right",
  "speed": { "expr": "baseSpeed + score * 0.1" }
}
```

Now the ball's speed naturally increases as the player scores points.

### Use Cases This Enables

| Category | Example | Expression |
|----------|---------|------------|
| **Difficulty Scaling** | Ball speeds up over time | `baseSpeed + elapsedTime * 0.5` |
| **Score Multipliers** | Points increase with combos | `basePoints * comboMultiplier` |
| **Dynamic Spawning** | Enemies spawn faster as game progresses | `max(0.5, 3 - wave * 0.2)` |
| **Damage Scaling** | Damage based on velocity | `impactVelocity * damageMultiplier` |
| **Size/Growth** | Entity grows with health | `baseSize * (health / maxHealth)` |
| **Conditional Logic** | Different behavior based on state | `isEnraged ? 10 : 5` |

---

## Design Analysis

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GameDefinition (JSON)                     │
│  Static values: speed: 5, radius: 0.5, points: 100          │
└─────────────────────────────┬───────────────────────────────┘
                              │ Load
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      EntityManager                           │
│  Creates RuntimeEntity with behaviors attached               │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BehaviorExecutor                          │
│  Reads static values: move.speed → apply velocity            │
└─────────────────────────────────────────────────────────────┘
```

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GameDefinition (JSON)                     │
│  Values OR Expressions: speed: { expr: "base + score*0.1" } │
└─────────────────────────────┬───────────────────────────────┘
                              │ Load + Compile
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  ComputedValueSystem                         │
│  - Compiles expressions to AST at load time                 │
│  - Provides EvalContext with runtime state                  │
│  - Evaluates expressions on-demand                          │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BehaviorExecutor                          │
│  Calls value.eval(ctx) → gets computed result               │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Options

### Option A: Expressions Only in Behaviors

Extend behavior parameters to accept expressions directly.

**Pros:**
- Minimal surface area change
- Localized impact - only behaviors need updating
- Easy mental model for behavior authors

**Cons:**
- No shared "game knobs" - duplication across behaviors
- Can't use expressions in rules/conditions consistently
- Encourages behavior-specific hacks instead of reusable mechanics

**Example:**
```json
{
  "behaviors": [
    {
      "type": "move",
      "speed": { "expr": "5 + score * 0.1" }
    }
  ]
}
```

### Option B: Separate Variables System Only

Add a global variables system at the game level that behaviors reference by name.

**Pros:**
- Central place for tuning/difficulty
- Great for rules and UI display
- Clean separation of concerns

**Cons:**
- Behaviors need glue to map variables to params
- Awkward for per-entity formulas (`damage = velocity * 0.2`)
- Still need expressions somewhere to define variable values

**Example:**
```json
{
  "variables": {
    "ballSpeed": { "base": 5, "formula": "base + score * 0.1" }
  },
  "behaviors": [
    {
      "type": "move",
      "speed": { "var": "ballSpeed" }
    }
  ]
}
```

### Option C: Both Globals + Inline Expressions (Recommended)

Combine global variables AND inline expressions with a unified `Value<T>` concept.

**Pros:**
- Most expressive with minimal engine complexity
- Keeps behaviors data-driven and enables reuse
- Scales from simple tuning to rich mechanics
- Global variables provide stable "knobs" for designers
- Inline expressions handle per-entity logic

**Cons:**
- Requires clean `EvalContext` boundary to avoid chaos
- Needs tooling/debugging support

**Example:**
```json
{
  "variables": {
    "difficultyMultiplier": { "expr": "1 + wave * 0.2" },
    "baseSpeed": 5
  },
  "behaviors": [
    {
      "type": "move",
      "speed": { "expr": "baseSpeed * difficultyMultiplier" }
    }
  ]
}
```

---

## Technical Design (Recommended Approach)

### 1. Value Type

Introduce a `Value<T>` type that can be either a literal or an expression:

```typescript
// Literal values (backwards compatible)
type LiteralValue<T> = T;

// Expression wrapper
interface ExpressionValue {
  expr: string;           // The expression string
  debugName?: string;     // For debugging/inspection
  cache?: 'none' | 'frame' | 'change';  // Caching strategy
}

// Union type for anywhere a value is used
type Value<T> = T | ExpressionValue;

// Examples
type MoveBehavior = {
  type: 'move';
  direction: MoveDirection;
  speed: Value<number>;      // Can be 5 or { expr: "baseSpeed + score * 0.1" }
  movementType?: 'velocity' | 'force';
};
```

### 2. Expression Language

A minimal but powerful expression language:

```
Literals:
  42, 3.14, -7           Numbers
  true, false            Booleans
  "string"               Strings (for future use)

Operators:
  + - * / %              Arithmetic
  < <= > >= == !=        Comparison
  && || !                Boolean
  ? :                    Ternary conditional

References:
  score                  Global variable
  time, elapsed          Game time
  self.health            Entity property
  self.velocity.x        Nested property
  
Functions:
  min(a, b)              Minimum of two values
  max(a, b)              Maximum of two values
  clamp(val, min, max)   Clamp value to range
  lerp(a, b, t)          Linear interpolation
  abs(x)                 Absolute value
  floor(x), ceil(x)      Rounding
  rand()                 Random 0-1 (seeded)
  sqrt(x)                Square root
  sin(x), cos(x)         Trigonometry
```

**Example expressions:**
```javascript
// Basic arithmetic
"baseSpeed + score * 0.1"

// Conditional logic
"isEnraged ? 15 : 5"

// Clamped scaling
"clamp(baseSpeed + time * 0.5, 5, 20)"

// Complex formula
"baseDamage * (1 + comboCount * 0.1) * difficultyMultiplier"

// Per-entity properties
"self.maxHealth * 0.5"  // Heal to 50% health
```

### 3. Evaluation Context

The context provided to expressions during evaluation:

```typescript
interface EvalContext {
  // Global game state (read-only)
  globals: {
    score: number;
    lives: number;
    time: number;          // Total elapsed time
    wave: number;          // Current wave/level
    [key: string]: Value;  // User-defined variables
  };
  
  // Current entity (when evaluating entity-scoped expressions)
  self?: {
    id: string;
    transform: { x: number; y: number; angle: number };
    velocity: { x: number; y: number };
    health?: number;
    [key: string]: unknown;  // Custom entity properties
  };
  
  // Frame info
  frame: {
    dt: number;           // Delta time
    frameId: number;      // For memoization
  };
  
  // Seeded random for determinism
  random: () => number;
}
```

### 4. Compilation Pipeline

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ JSON String │ ──► │    Parser    │ ──► │     AST     │
│ "a + b * 2" │     │  (at load)   │     │   (cached)  │
└─────────────┘     └──────────────┘     └─────────────┘
                                                │
                                                ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Result    │ ◄── │  Evaluator   │ ◄── │ EvalContext │
│     7.5     │     │ (per-frame)  │     │  (runtime)  │
└─────────────┘     └──────────────┘     └─────────────┘
```

**Key performance principles:**
1. **Parse once at load** - No string parsing at runtime
2. **Evaluate on-demand** - Pull-based, not reactive push
3. **Optional memoization** - Cache per-frame if value read multiple times
4. **No allocations in hot path** - Pre-allocate AST nodes

### 5. JSON Schema Updates

Backwards-compatible schema that accepts both literals and expressions:

```typescript
// Zod schema example
const ValueSchema = <T extends z.ZodType>(innerType: T) =>
  z.union([
    innerType,  // Literal value (backwards compatible)
    z.object({
      expr: z.string(),
      debugName: z.string().optional(),
      cache: z.enum(['none', 'frame', 'change']).optional(),
    }),
  ]);

// Usage in behavior schemas
const MoveBehaviorSchema = z.object({
  type: z.literal('move'),
  direction: z.enum(['left', 'right', 'up', 'down', ...]),
  speed: ValueSchema(z.number()),  // number OR { expr: string }
  movementType: z.enum(['velocity', 'force']).optional(),
});
```

### 6. Integration Points

#### In BehaviorExecutor

```typescript
// Before (static value)
const vx = move.speed;

// After (computed value)
const vx = this.valueSystem.evaluate(move.speed, ctx);
```

#### In RulesEvaluator

```typescript
// Expressions in rule conditions
{
  "trigger": { "type": "score", "threshold": { "expr": "100 * wave" } }
}

// Expressions in rule actions
{
  "type": "score",
  "operation": "add",
  "value": { "expr": "basePoints * comboMultiplier" }
}
```

---

## Complementary Systems

### 1. Game Variables

A first-class system for global game state that expressions can reference:

```json
{
  "variables": {
    "baseSpeed": 5,
    "difficultyMultiplier": { "expr": "1 + floor(score / 1000) * 0.1" },
    "spawnRate": { "expr": "max(0.5, 3 - wave * 0.2)" }
  }
}
```

### 2. Entity Stats/Properties

Per-entity custom properties beyond the standard components:

```json
{
  "templates": {
    "enemy": {
      "properties": {
        "maxHealth": 100,
        "damage": 10,
        "rage": { "expr": "1 - (self.health / self.maxHealth)" }
      }
    }
  }
}
```

### 3. Difficulty Curves

Pre-built difficulty scaling patterns:

```json
{
  "difficulty": {
    "type": "progressive",
    "curves": {
      "speed": { "base": 5, "perWave": 0.5, "max": 15 },
      "spawnRate": { "base": 2, "perScore": -0.001, "min": 0.5 },
      "enemyHealth": { "base": 50, "multiplier": { "expr": "1 + wave * 0.2" } }
    }
  }
}
```

### 4. Stat Modifiers (RPG-style)

Stackable modifiers for complex stat calculations:

```json
{
  "modifiers": [
    { "target": "player.speed", "type": "add", "value": 2, "source": "powerup" },
    { "target": "player.speed", "type": "multiply", "value": 1.5, "source": "buff" }
  ]
}
// Final speed = (baseSpeed + 2) * 1.5
```

---

## Implementation Phases

### Phase 1: Core Plumbing (1-2 days)

**Goal:** Minimal viable computed values

- [ ] Define `Value<T>` type and schema
- [ ] Implement expression parser (number literals, arithmetic, comparisons)
- [ ] Implement AST evaluator
- [ ] Create `ComputedValueSystem` service
- [ ] Support `score`, `time`, `lives` in eval context
- [ ] Integrate with `MoveBehavior.speed` as proof of concept
- [ ] Add error handling with clear messages (file/behavior path + expression)

**Deliverables:**
- Working `{ expr: "5 + score * 0.1" }` in move behaviors
- Type-safe `Value<number>` in TypeScript
- Compilation at load time, evaluation at runtime

### Phase 2: Broaden Scope (2-3 days)

**Goal:** Expressions everywhere they make sense

- [ ] Add global `variables` section to GameDefinition
- [ ] Support expressions in all numeric behavior params
- [ ] Support expressions in rule conditions and actions
- [ ] Add `self.*` accessors for entity properties
- [ ] Add function library: `min`, `max`, `clamp`, `lerp`, `abs`, `floor`, `ceil`
- [ ] Add ternary operator support: `cond ? a : b`
- [ ] Optional per-frame memoization

**Deliverables:**
- Full expression support across behaviors and rules
- Designer-usable difficulty scaling via variables

### Phase 3: Polish & Power (3+ days)

**Goal:** Production-ready system

- [ ] Boolean expressions for conditional behaviors
- [ ] `rand()` with seeded RNG for determinism
- [ ] Dependency tracking for smart caching
- [ ] Static validation at load time (unknown symbols, type checking)
- [ ] Expression inspector/debugger tool
- [ ] Documentation and examples
- [ ] AI prompt integration for expression generation

**Deliverables:**
- Robust error handling and debugging
- Performance-optimized for complex games
- Designer documentation

---

## Performance Considerations

### Compile-Time Guarantees

| Operation | When | Cost |
|-----------|------|------|
| Parse expression string | Load time only | ~0.1ms per expression |
| Build AST | Load time only | Included in parse |
| Validate symbols | Load time only | ~0.01ms per expression |
| Evaluate AST | Per-frame (on demand) | ~0.001ms per evaluation |

### Runtime Evaluation Strategy

1. **No string operations** at runtime - all parsing done at load
2. **Pull-based evaluation** - only compute when value is read
3. **Frame memoization** - cache results for values read multiple times per frame
4. **Avoid allocations** - reuse evaluation context objects

### Benchmarking Targets

- 1000 expressions evaluated per frame: < 1ms total
- Expression compilation: < 100ms for typical game
- Memory overhead: < 100 bytes per compiled expression

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Unbounded state access** | Hidden coupling, nondeterminism | Curated EvalContext API, explicit allowlist |
| **Performance regression** | Frame drops in complex games | Compile-time parsing, optional caching, profiling |
| **Designer confusion** | Errors hard to debug | Clear error messages with context, expression inspector |
| **Type coercion bugs** | Silent failures | Strict typing, load-time validation |
| **Evaluation order issues** | Inconsistent results | Document phase visibility, use frame snapshots |
| **Breaking changes** | Existing games fail | Backwards compatible schema (literals still work) |

---

## Alternatives Considered

### 1. Visual Node-Based System

Like Unity's visual scripting or Unreal Blueprints.

**Why not:** Significantly higher implementation cost, requires UI tooling, overkill for expression-level logic.

### 2. Full Scripting Language (Lua/JS)

Embed a real scripting language.

**Why not:** Security concerns, performance overhead, complexity explosion, harder for AI to generate safely.

### 3. Behavior Composition

Create new behaviors that combine existing ones with logic.

**Why not:** Exponential behavior explosion, doesn't solve the fundamental "dynamic parameter" problem.

### 4. Pre-computed Lookup Tables

Define value tables keyed by game state.

**Why not:** Inflexible, can't handle continuous scaling, verbose for designers.

---

## Success Criteria

1. **Backwards Compatible**: Existing game definitions work unchanged
2. **Performance**: No measurable frame time impact for typical games
3. **Ergonomic**: Designers can write `speed: { expr: "5 + score * 0.1" }` easily
4. **Debuggable**: Clear errors when expressions fail, inspection tools
5. **AI-Compatible**: AI can generate valid expressions from natural language

---

## Open Questions

1. **String interpolation?** Should expressions support string results for UI text?
2. **Array/Vector support?** Should expressions return `Vec2` for positions/velocities?
3. **Cross-entity references?** Should expressions reference other entities by ID/tag?
4. **Event-driven updates?** Should some expressions recompute only on specific events?

---

## Appendix: Example Game Using Derived Values

### "Endless Runner" with Progressive Difficulty

```json
{
  "metadata": { "title": "Speed Runner", "version": "1.0" },
  
  "variables": {
    "baseSpeed": 5,
    "difficultyMultiplier": { "expr": "1 + floor(score / 500) * 0.1" },
    "obstacleSpawnRate": { "expr": "max(0.3, 2 - time * 0.01)" }
  },
  
  "templates": {
    "player": {
      "physics": { "shape": "circle", "radius": 0.3, "bodyType": "dynamic" },
      "behaviors": [
        { "type": "control", "controlType": "tap_to_jump", "force": 8 },
        { "type": "move", "direction": "right", "speed": { "expr": "baseSpeed * difficultyMultiplier" } }
      ]
    },
    "obstacle": {
      "physics": { "shape": "box", "width": 0.5, "height": 1, "bodyType": "static" },
      "behaviors": [
        { "type": "destroy_on_collision", "withTags": ["player"] },
        { "type": "score_on_destroy", "points": { "expr": "10 * difficultyMultiplier" } }
      ]
    }
  },
  
  "rules": [
    {
      "id": "spawn_obstacles",
      "trigger": { "type": "timer", "time": { "expr": "obstacleSpawnRate" }, "repeat": true },
      "actions": [
        { "type": "spawn", "template": "obstacle", "position": { "type": "fixed", "x": 15, "y": 5 } }
      ]
    }
  ],
  
  "winCondition": { "type": "score", "score": 1000 },
  "loseCondition": { "type": "entity_destroyed", "tag": "player" }
}
```

This game automatically:
- Increases player speed every 500 points
- Spawns obstacles faster over time (but never faster than 0.3s)
- Awards more points as difficulty increases

---

## References

- [Entity Hierarchy Analysis](../00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md) - Composability patterns
- [Behavior System](../01-core-concepts/behavior-system.md) - Behavior implementation
- [Rules System](../01-core-concepts/rules-system.md) - Rules implementation
- Current implementation: `app/lib/game-engine/`
