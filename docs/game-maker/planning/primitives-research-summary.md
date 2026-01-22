# Game Engine Primitives: Research Summary

> **Date**: January 22, 2026  
> **Purpose**: Capture research findings for expanding game engine capabilities  
> **Status**: Planning Complete - Ready for Implementation

---

## 1. Research Overview

We conducted deep research using multiple approaches:
- **Oracle brainstorming** on fundamental primitives and children's game patterns
- **Codebase exploration** of current entity, behavior, and variable systems
- **Use case analysis** for complex games (doll builder, car builder, card games)

### Key Insight

> "The missing 'engine primitives' aren't more physics or more triggers—they're **(1) parts/attachments, (2) collections + memory, and (3) first-class randomization utilities**."

---

## 2. Current System Inventory

### What We Have (Comprehensive)

| Category | Count | Examples |
|----------|-------|----------|
| **Behaviors** | 17 | move, rotate, spawn_on_event, destroy_on_collision, score_on_collision, oscillate, draggable, timer, health, magnetic, gravity_zone, follow, bounce, animate, particle_emitter, rotate_toward, score_on_destroy |
| **Rule Triggers** | 12 | collision, timer, score, entity_count, event, frame, tap, drag, tilt, button, swipe, gameStart |
| **Rule Actions** | 15 | spawn, destroy, score, lives, game_state, sound, event, modify, apply_impulse, apply_force, set_velocity, move, set_variable, start_cooldown |
| **Rule Conditions** | 10 | score, time, entity_exists, entity_count, random, on_ground, touching, velocity, cooldown_ready, variable |
| **Expression Functions** | 26 | min, max, clamp, lerp, abs, floor, ceil, round, sqrt, pow, sin, cos, tan, atan2, rand, length, normalize, dot, distance, sign, smoothstep, step, mix, fract, mod, vec2 |
| **State Variables** | 6 | score, lives, time, wave, dt, frameId + custom variables |

### Critical Gaps Identified

| Gap | Impact | Current Workaround |
|-----|--------|-------------------|
| **No random template selection** | Can't pick random enemy/item types | Multiple spawn rules with random conditions |
| **No entity count in expressions** | Can't do "spawn more when count < 5" | Indirect via entity_count trigger |
| **No parent-child entities** | Can't build multi-part objects | Simulate with manual position sync |
| **No attachment slots** | Can't snap parts to specific points | Hardcoded offsets |
| **No array/list variables** | Can't track inventory, card decks | Multiple separate variables |
| **No physics joints in schema** | Can't define connected bodies | Runtime-only via code |
| **No weighted random** | Can't make rare items | Complex rule chains |

---

## 3. Design Philosophy: Child-Friendly Primitives

### From Oracle Research on Children's Mental Models

**Core Principles:**
1. **"When X happens, do Y"** - Events/triggers beat polling/loops
2. **Objects-as-actors** - "my character", "enemy", "coin" (not classes)
3. **Direct manipulation first** - Drag/drop, then configure
4. **Constrained choices** - Palettes reduce blank-page fear
5. **Copy/remix** - Duplicating working things is the learning loop

### Child-Friendly Naming Conventions

| Technical Concept | Child-Friendly Name | Mental Model |
|-------------------|---------------------|--------------|
| Random selection | "Surprise Box" | You know it's a toy, but not which until it opens |
| Weighted random | "Claw Machine" | Big teddy is harder to get than small ball |
| Array/List | "Backpack" or "Bag" | Holds many things |
| Shuffle | "Mix up the bag" | Like shuffling cards |
| Draw without replacement | "Pick from bag" | Once you take red marble, it's gone |
| Attachment slots | "LEGO studs" | Places where things snap on |
| Parent-child | "Mama duck" | Ducklings follow mama |
| Physics joint | "Hinge" or "Wheel axle" | Things that spin or slide |

---

## 4. Prioritized Primitive Roadmap

### Phase 1: Quick Wins (Hours of work)
*Enable procedural variety without architectural changes*

| Primitive | Type | Files to Modify | Effort |
|-----------|------|-----------------|--------|
| `entityTemplate: string \| string[]` | Behavior/Action change | `behavior.ts`, `schemas.ts`, `LifecycleBehaviors.ts`, `SpawnActionExecutor.ts` | Easy |
| `choose(a, b, c)` | Expression function | `evaluator.ts` | Easy |
| `randomInt(min, max)` | Expression function | `evaluator.ts` | Easy |
| `entityCount(tag)` | Expression function | `evaluator.ts`, `EvalContext` | Medium |

**Games Enabled:** Slot machine, random enemy spawners, loot drops

### Phase 2: Core Expansion (1-2 days)
*Building multi-part entities and smarter AI*

| Primitive | Type | Files to Modify | Effort |
|-----------|------|-----------------|--------|
| `slots` on templates | Schema addition | `entity.ts`, `EntityTemplate` type | Medium |
| `attachTo` behavior | New behavior | `behavior.ts`, new handler | Medium |
| `entityExists(tag)` | Expression function | `evaluator.ts` | Easy |
| `nearestEntity(tag)` | Expression function | `evaluator.ts` | Medium |
| `highestY(tag)` | Expression function | `evaluator.ts` | Easy |

**Games Enabled:** Monster mixer, doll builder, stacking games with height tracking

### Phase 3: Advanced Systems (3+ days)
*Physics builders and complex game logic*

| Primitive | Type | Files to Modify | Effort |
|-----------|------|-----------------|--------|
| `joints` in GameDefinition | Schema + Runtime | `GameDefinition.ts`, `GameLoader.ts`, physics integration | Hard |
| List/Array variables | Variable system | `RulesEvaluator.ts`, `LogicActionExecutor.ts` | Hard |
| `push`, `pop`, `shuffle` operations | Actions | `rules.ts`, executors | Medium |
| `weightedChoice(items, weights)` | Expression function | `evaluator.ts` | Medium |
| `bag` type (shuffle + draw) | New variable type | Multiple files | Hard |

**Games Enabled:** Car builder with physics, card games, procedural dungeons

---

## 5. Implementation Details

### Phase 1 Implementation Spec

#### 1. Random Template Selection

**Type Change** (`shared/src/types/behavior.ts`):
```typescript
// Before
entityTemplate: string;

// After
entityTemplate: string | string[];
```

**Schema Change** (`shared/src/types/schemas.ts`):
```typescript
// Before
entityTemplate: z.string(),

// After
entityTemplate: z.union([z.string(), z.array(z.string())]),
```

**Handler Change** (`app/lib/game-engine/behaviors/LifecycleBehaviors.ts`):
```typescript
// In spawn_on_event handler, before ctx.spawnEntity call:
const templateId = Array.isArray(spawn.entityTemplate)
  ? spawn.entityTemplate[Math.floor(Math.random() * spawn.entityTemplate.length)]
  : spawn.entityTemplate;

const newEntity = ctx.spawnEntity(templateId, x, y);
```

#### 2. Expression Functions

**Add to `BUILTIN_FUNCTIONS`** (`shared/src/expressions/evaluator.ts`):

```typescript
choose: (args, ctx) => {
  if (args.length === 0) throw new Error('choose() requires at least one argument');
  const index = Math.floor(ctx.random() * args.length);
  return args[index];
},

randomInt: (args, ctx) => {
  assertArgCount('randomInt', args, 2);
  const min = Math.floor(asNumber(args[0]));
  const max = Math.floor(asNumber(args[1]));
  return min + Math.floor(ctx.random() * (max - min + 1));
},
```

#### 3. Entity Count Expression

**Requires EvalContext extension** - Pass entityManager reference:

```typescript
// In evaluator.ts BUILTIN_FUNCTIONS
entityCount: (args, ctx) => {
  assertArgCount('entityCount', args, 1);
  const tag = String(args[0]);
  if (!ctx.entityManager) {
    throw new Error('entityCount() not available in this context');
  }
  return ctx.entityManager.getEntitiesByTag(tag).length;
},
```

---

## 6. Use Case Validation

### Use Case 1: Random Doll Builder
**Required Primitives:** `entityTemplate[]`, `slots`, `attachTo`

```json
{
  "templates": {
    "doll_base": {
      "slots": {
        "hair": { "x": 0, "y": -20 },
        "eyes": { "x": 0, "y": 0 },
        "mouth": { "x": 0, "y": 15 }
      }
    }
  },
  "rules": [
    {
      "trigger": { "type": "tap", "target": "randomize_button" },
      "actions": [
        { "type": "destroy", "target": { "type": "by_tag", "tag": "hair" } },
        { "type": "spawn", "template": ["hair_curly", "hair_straight", "hair_spiky"], "position": { "type": "at_slot", "entity": "doll", "slot": "hair" } }
      ]
    }
  ]
}
```

### Use Case 2: Physics Car Builder
**Required Primitives:** `joints`, `slots`, `attachTo`

```json
{
  "joints": [
    {
      "type": "revolute",
      "entityA": "car_body",
      "entityB": "front_wheel",
      "localAnchorA": { "x": 1.5, "y": 0.5 },
      "enableMotor": true
    }
  ]
}
```

### Use Case 3: Card Game
**Required Primitives:** List variables, `shuffle`, `draw`

```json
{
  "variables": {
    "deck": { "type": "list", "initial": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] }
  },
  "rules": [
    {
      "trigger": { "type": "gameStart" },
      "actions": [
        { "type": "shuffle_list", "name": "deck" }
      ]
    },
    {
      "trigger": { "type": "tap", "target": "draw_button" },
      "actions": [
        { "type": "draw_from_list", "name": "deck", "into": "currentCard" }
      ]
    }
  ]
}
```

---

## 7. Next Steps

### Immediate Actions (Phase 1)
1. [ ] Implement `entityTemplate: string | string[]` in types
2. [ ] Update Zod schema for array support
3. [ ] Update behavior handler to pick randomly
4. [ ] Add `choose()` expression function
5. [ ] Add `randomInt()` expression function
6. [ ] Add `entityCount()` expression function
7. [ ] Update PhysicsStacker to use random blocks
8. [ ] Write tests for new primitives
9. [ ] Update documentation

### Future Considerations
- Editor UI for array template selection (drag multiple templates)
- Visual slot editor for positioning attachment points
- Physics joint preview in editor
- List variable debugger/inspector

---

## 8. References

### Files to Modify (Phase 1)
- `shared/src/types/behavior.ts` - SpawnOnEventBehavior type
- `shared/src/types/schemas.ts` - Zod validation
- `shared/src/expressions/evaluator.ts` - Expression functions
- `shared/src/expressions/types.ts` - EvalContext type
- `app/lib/game-engine/behaviors/LifecycleBehaviors.ts` - Spawn handler
- `app/lib/game-engine/rules/actions/SpawnActionExecutor.ts` - Spawn action

### Related Documentation
- [Primitives Expansion Plan](./primitives-expansion-plan.md) - Detailed implementation plan
- [Behavior System Reference](../reference/behavior-system.md) - Current behaviors
- [Rules System Reference](../reference/game-rules.md) - Current rules
