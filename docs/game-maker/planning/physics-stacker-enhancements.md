# Physics Stacker Enhancement Analysis

## Requested Features

1. **Particles on Block Spawn**: Spawn particles when blocks pop out of the moving dropper
2. **Height-Based Scoring**: Score increases based on how high blocks are stacked (exponential scaling)

---

## Current System Capabilities

### Particle System

| Feature | Status | Notes |
|---------|--------|-------|
| CPU-based particle pool | ✅ Available | `app/lib/particles/ParticleSystem.ts` |
| 10 presets (fire, sparks, confetti, etc.) | ✅ Available | `shared/src/types/particles.ts` |
| Burst mode | ✅ Available | `burst: { count, cooldown }` config |
| Entity-attached particles | ✅ Available | `particles` property on entity templates |
| Particles on destruction | ✅ Available | `destroy_on_collision` with `effect: 'explode'` |
| **Particles on spawn** | ❌ NOT Available | No `spawn_on_event` effect property |

### Expression System

| Feature | Status | Notes |
|---------|--------|-------|
| Math functions (floor, pow, max, etc.) | ✅ Available | `shared/src/expressions/evaluator.ts` |
| `self.transform.y` access | ✅ Available | EntityContext in EvalContext |
| Dynamic `points` in behaviors | ⚠️ Partial | Type supports it, but `resolveNumber` in GameRuntime is a stub |
| Rules with expressions | ✅ Available | `ScoreActionExecutor` properly resolves expressions |

### Scoring System

| Feature | Status | Notes |
|---------|--------|-------|
| `score_on_collision` behavior | ✅ Available | Awards points on collision |
| `once: true` flag | ✅ Available | Prevents duplicate scoring |
| Dynamic points via expression | ⚠️ Partial | Behavior calls `ctx.resolveNumber()` but GameRuntime stub doesn't evaluate expressions |
| Continuous scoring (per-frame) | ❌ NOT Available | No `score_while_touching` or `score_per_frame` behavior |

---

## Gap Analysis

### Gap 1: No Particle Effect on Entity Spawn

**Current State**: The `spawn_on_event` behavior spawns entities but has no `effect` property to trigger particles.

**What's Needed**:
```typescript
// In shared/src/types/behavior.ts
export interface SpawnOnEventBehavior extends BaseBehavior {
  type: 'spawn_on_event';
  // ... existing fields ...
  spawnEffect?: 'none' | 'sparks' | 'confetti' | 'magic' | 'custom';
  spawnEffectConfig?: Partial<ParticleEmitterConfig>;
}
```

**Implementation**:
1. Add `spawnEffect` to `SpawnOnEventBehavior` type
2. In `LifecycleBehaviors.ts`, after spawning, trigger a particle burst at spawn location
3. Need to wire particle system into behavior context or use a callback

**Workaround (Current)**: Create a "particle emitter" entity template that self-destructs after emitting. Spawn it alongside the block. This is clunky but works.

### Gap 2: Expression Resolution Not Wired in Behaviors

**Current State**: `GameRuntime.native.tsx` line 260:
```typescript
resolveNumber: (value) => typeof value === 'number' ? value : 0,
```
This stub ignores expression objects like `{ expr: "self.transform.y * 10" }`.

**What's Needed**: Wire up `ComputedValueSystem` properly:
```typescript
const computedValues = createComputedValueSystem();

// In behaviorContext:
resolveNumber: (value) => computedValues.resolveNumber(value, evalContext),
resolveVec2: (value) => computedValues.resolveVec2(value, evalContext),
```

**Impact**: Once fixed, behaviors can use expressions like:
```json
{ "type": "score_on_collision", "points": { "expr": "floor(50 * pow(1.5, (16 - self.transform.y)))" } }
```

### Gap 3: No Continuous/Per-Frame Scoring Behavior

**Current State**: `score_on_collision` only fires on collision events. There's no way to continuously award points while blocks remain stacked.

**What's Needed**: A new behavior type:
```typescript
export interface ScoreWhileConditionBehavior extends BaseBehavior {
  type: 'score_while_condition';
  condition: 'touching' | 'above_y' | 'below_y' | 'in_zone';
  conditionParams: {
    tags?: string[];
    y?: Value<number>;
    zoneId?: string;
  };
  pointsPerSecond: Value<number>;
}
```

**Workaround (Current)**: Use Rules system with `timer` trigger:
```json
{
  "trigger": { "type": "timer", "interval": 1 },
  "conditions": [{ "type": "entity_exists", "tag": "block" }],
  "actions": [{ "type": "score", "operation": "add", "value": { "expr": "..." } }]
}
```

### Gap 4: No Entity Query in Expressions

**Current State**: Expressions can access `self` but cannot query other entities (e.g., "count blocks above y=10").

**What's Needed**: Add functions to expression evaluator:
```typescript
entityCount(tag: string): number
highestEntityY(tag: string): number
lowestEntityY(tag: string): number
```

---

## Recommended Implementation Path

### Phase 1: Quick Wins (Can Do Now)

1. **Fix expression resolution in behaviors** - Wire `ComputedValueSystem` into `GameRuntime.native.tsx`
2. **Use Rules for height-based scoring** - Timer-based rule that calculates score from entity positions

### Phase 2: Particle on Spawn (Medium Effort)

1. Add `spawnEffect` property to `SpawnOnEventBehavior`
2. Create particle burst callback in behavior context
3. Implement in `LifecycleBehaviors.ts`

### Phase 3: Advanced Scoring (Higher Effort)

1. Add `score_while_condition` behavior
2. Add entity query functions to expression system
3. Enable truly dynamic, position-based scoring

---

## Immediate Actions for Physics Stacker

Given current capabilities, here's what we CAN do right now:

### 1. Particle Workaround
Create a short-lived particle emitter entity that spawns alongside blocks:

```typescript
templates: {
  spawnSparks: {
    id: "spawnSparks",
    tags: ["effect"],
    sprite: { type: "rect", width: 0.1, height: 0.1, color: "transparent" },
    particles: {
      type: "sparks",
      config: { /* burst config */ },
      enabled: true,
    },
    behaviors: [
      { type: "timer", duration: 0.5, action: "destroy" }
    ],
  },
  dropper: {
    // ... existing ...
    behaviors: [
      { type: "oscillate", axis: "x", amplitude: 4, frequency: 0.3 },
      { type: "spawn_on_event", event: "tap", entityTemplate: "blockWide", spawnPosition: "at_self" },
      { type: "spawn_on_event", event: "tap", entityTemplate: "spawnSparks", spawnPosition: "at_self" },
    ],
  },
}
```

### 2. Height-Based Scoring via Rules
Use the Rules system (which DOES properly resolve expressions):

```typescript
rules: [
  {
    id: "height_bonus",
    trigger: { type: "collision" },
    conditions: [
      { type: "entity_exists", tag: "block" }
    ],
    actions: [
      { 
        type: "score", 
        operation: "add", 
        value: { expr: "floor(50 * pow(1.3, max(0, 16 - collision.entityA.transform.y)))" }
      }
    ],
  }
]
```

**Note**: This requires collision context in expressions, which may not be fully wired.

---

## Summary

| Feature | Feasibility | Effort | Approach |
|---------|-------------|--------|----------|
| Particles on spawn | ⚠️ Workaround | Low | Spawn particle entity alongside block |
| Height-based scoring | ⚠️ Partial | Medium | Fix expression resolution, use Rules |
| Exponential stack bonus | ❌ Blocked | High | Need entity query functions in expressions |

**Recommendation**: Start with the particle workaround (spawn a particle entity). For scoring, fix the expression resolution stub in GameRuntime first, then implement via Rules.
