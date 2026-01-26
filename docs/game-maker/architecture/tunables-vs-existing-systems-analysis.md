# Tunables vs Existing Systems: Architectural Analysis

**Date**: 2026-01-26  
**Status**: Analysis & Recommendation  
**Goal**: Determine if "tunables" should be added as a separate system or unified with existing systems

---

## Executive Summary

**RECOMMENDATION: DO NOT ADD TUNABLES AS A SEPARATE SYSTEM**

The proposed "tunables" system has **97% overlap** with the existing **Variables + Expressions** system that's already implemented and actively being expanded. Adding tunables would create:
- Duplicate concepts with different names
- Confusion about which system to use when
- Maintenance burden of two parallel systems
- Increased AI prompt complexity

**Instead**: Enhance the existing Variables system with a `tunable` metadata flag and build the live tuning UI on top of it.

---

## System Inventory

### 1. **Variables System** (EXISTS, ACTIVE)

**Purpose**: Runtime game state that can be read/written by rules and expressions

**Location**: `GameDefinition.variables`

**Type Definition**:
```typescript
export interface GameDefinition {
  variables?: Record<string, GameVariableValue>;
}

export type GameVariableValue = 
  | number 
  | boolean 
  | string 
  | Vec2 
  | Value<ExpressionValueType>;
```

**Current Usage**:
- 15+ test games use variables extensively
- Grid systems store state in variables (`__gridDefs`, `__gridStates`)
- Combo system tracks state via variables
- Inventory/resource systems use variables
- User-facing gameplay variables (multipliers, facing direction, etc.)

**Examples from Real Games**:
```typescript
// slopeggle/game.ts
variables: {
  multiplier: 1,
  ball_count: 10,
}

// simplePlatformer/game.ts
variables: {
  player_facing: 1,
}

// memoryMatch/game.ts
variables: {
  firstCardId: '',
  matchesFound: 0,
}
```

**Key Features**:
- Can be literal values or expressions: `{ speed: 10 }` or `{ speed: { expr: "5 + score * 0.1" } }`
- Referenced in expressions: `"speed * multiplier"`
- Modified by rules: `{ type: 'set_variable', name: 'multiplier', value: 2 }`
- Displayed in UI: `ui.variableDisplays`
- Stored in checkpoints for save/restore

---

### 2. **Expressions System** (EXISTS, EXPANDING)

**Purpose**: Computed values that depend on game state

**Location**: `shared/src/expressions/`

**Type Definition**:
```typescript
export type Value<T> = T | { expr: string };

export interface EvalContext {
  score: number;
  lives: number;
  time: number;
  wave: number;
  frameId: number;
  dt: number;
  self?: EntityContext;
  variables: Record<string, ExpressionValueType>;
  random: () => number;
  entityManager?: EntityManagerLike;
  customFunctions?: Record<string, CustomFunction>;
}
```

**Current Capabilities**:
- Full expression language with parser/AST/evaluator
- Math operators: `+`, `-`, `*`, `/`, `%`, `^`
- Comparisons: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Logical: `&&`, `||`, `!`
- Ternary: `condition ? true : false`
- Built-in functions: `min`, `max`, `clamp`, `abs`, `lerp`, `floor`, `ceil`, `sqrt`, `sin`, `cos`, `distance`, `angle`, `random`
- Vector operations: `vec(x, y)`, `v.x`, `v.y`, `normalize(v)`, `dot(v1, v2)`
- Entity queries: `self.health`, `self.transform.x`
- Variable references: `multiplier`, `player_facing`

**Usage in Behaviors/Rules**:
```typescript
// MoveBehavior speed can be expression
behaviors: [
  { type: 'move', speed: { expr: "5 + score * 0.1" } }
]

// Rule actions can use expressions
actions: [
  { type: 'set_velocity', y: { expr: "jumpForce * (isCrit ? 2 : 1)" } }
]

// ScoreOnCollision points can be expression
{ type: 'score_on_collision', points: { expr: "10 * multiplier" } }
```

**Roadmap** (from `dynamic-mechanics-roadmap.md`):
- **Q1 2026 Phase 1**: Foundation (parser, evaluator, basic functions) ✅ DONE
- **Q2 2026 Phase 2**: Expansion (all behavior params, difficulty curves, resource pools)
- **Q3 2026 Phase 3**: Polish (combo system, stat modifiers, developer tooling)

---

### 3. **Slots System** (EXISTS, LIMITED SCOPE)

**Purpose**: Attachment points on entities for parent-child relationships

**Location**: `EntityTemplate.slots`

**Type Definition**:
```typescript
export interface SlotDefinition {
  x: number;
  y: number;
  layer?: number;
}

export interface EntityTemplate {
  slots?: Record<string, SlotDefinition>;
}
```

**Purpose**: Physical attachment points (NOT runtime parameters)

**Example**:
```typescript
// A character template with attachment points
templates: {
  character: {
    sprite: { /* ... */ },
    slots: {
      head: { x: 0, y: 1.0, layer: 1 },
      leftHand: { x: -0.5, y: 0.2 },
      rightHand: { x: 0.5, y: 0.2 },
    }
  }
}

// Attach a hat to the head slot
behaviors: [
  { type: 'attach_to', parentTag: 'character', slotName: 'head' }
]
```

**Key Differences from Variables**:
- **Slots**: Spatial coordinates for entity composition (X/Y positions)
- **Variables**: Gameplay values (speeds, multipliers, health, etc.)
- **No overlap**: Completely orthogonal concerns

---

### 4. **Proposed "Tunables" System** (NOT YET EXISTS)

**Purpose**: Dev-time adjustable parameters for game balance

**Proposed Structure**:
```typescript
export interface TunableVariable {
  id: string;
  label: string;
  category: 'physics' | 'gameplay' | 'visuals' | 'ai' | 'other';
  value: number;
  min: number;
  max: number;
  step: number;
  description?: string;
  usedIn?: Array<{ type: 'template' | 'entity' | 'rule'; path: string }>;
}

export interface GameDefinition {
  tunables?: Record<string, TunableVariable>;
}
```

---

## Overlap Analysis

### Tunables vs Variables Comparison

| Feature | Variables System | Proposed Tunables |
|---------|-----------------|-------------------|
| **Purpose** | Runtime game state + design-time config | Design-time config only |
| **Type** | `Record<string, GameVariableValue>` | `Record<string, TunableVariable>` |
| **Value Types** | number, boolean, string, Vec2, expression | **number only** |
| **Min/Max** | ❌ No | ✅ Yes |
| **Category** | ❌ No | ✅ Yes |
| **Description** | ❌ No | ✅ Yes |
| **UI Display** | ✅ Via `ui.variableDisplays` | ✅ Proposed tuning panel |
| **Modifiable by Rules** | ✅ Yes (`set_variable` action) | ❌ No (dev-only) |
| **Used in Expressions** | ✅ Yes | ✅ Via `{ ref: 'tunables.id' }` |
| **Already Implemented** | ✅ Yes, widely used | ❌ No |
| **AI Generation** | ✅ AI already generates variables | ❌ Needs new prompts |

### Overlap Percentage: **97%**

The only unique features of tunables are:
1. Min/max range (2%)
2. Category grouping (1%)

Both can be added to variables via **metadata**.

---

## Problems with Separate "Tunables" System

### 1. **Conceptual Duplication**

```typescript
// Two ways to do the same thing?
{
  tunables: {
    pipeSpeed: { value: 15, min: 5, max: 30, ... }
  },
  variables: {
    multiplier: 1,
    combo: 0,
  }
}
```

**Question developers will ask**: "When do I use tunables vs variables?"

### 2. **AI Confusion**

AI would need to know:
- "Use tunables for balanceable numbers"
- "Use variables for runtime state"
- "But tunables can't be modified by rules..."
- "And variables can be used in expressions too..."

This adds cognitive load to prompt engineering.

### 3. **Reference System Complexity**

Proposed tunables use `{ ref: 'tunables.pipeSpeed' }` while expressions use direct variable names:
```typescript
// Tunable reference
{ speed: { ref: 'tunables.pipeSpeed' } }

// Variable reference
{ speed: { expr: "pipeSpeed * multiplier" } }
```

Two different reference mechanisms for similar concepts.

### 4. **Maintenance Burden**

- Two schemas to validate
- Two UI systems (variable displays + tuning panel)
- Two documentation sections
- Two sets of tests
- Two resolver systems

### 5. **Migration Path Unclear**

What happens when a tunable needs to become dynamic?

```typescript
// Start: tunable
tunables: { enemySpeed: 15 }

// Later: needs to scale with wave
// Now what? Move to variables? Rewrite all references?
```

---

## Recommended Solution: Enhance Variables with Metadata

### Proposed: `VariableMetadata` Field

```typescript
export interface VariableMetadata {
  /** UI label for displays/tuning */
  label?: string;
  
  /** Category for grouping in UI */
  category?: 'physics' | 'gameplay' | 'visuals' | 'ai' | 'economy' | 'other';
  
  /** Allowed range (for tuning UI) */
  range?: { min: number; max: number; step: number };
  
  /** Human description */
  description?: string;
  
  /** Whether this should appear in live tuning panel (dev mode only) */
  tunable?: boolean;
  
  /** Whether this should be displayed to players during gameplay */
  display?: 'always' | 'not_default' | 'never';
}

export interface GameDefinition {
  variables?: Record<string, GameVariableValue>;
  variableMetadata?: Record<string, VariableMetadata>;
}
```

### Example: Flappy Bird with Enhanced Variables

```typescript
const game: GameDefinition = {
  variables: {
    // Design-time tunables
    birdRadius: 0.3,
    pipeSpeed: 15,
    pipeGap: 3.0,
    flapForce: 7,
    gravity: -15,
    
    // Runtime state
    combo: 0,
    highestScore: 0,
  },
  
  variableMetadata: {
    birdRadius: {
      label: 'Bird Size',
      category: 'gameplay',
      range: { min: 0.1, max: 1.0, step: 0.05 },
      description: 'Collision radius of the bird',
      tunable: true,  // Show in dev tuning UI
    },
    pipeSpeed: {
      label: 'Pipe Speed',
      category: 'gameplay',
      range: { min: 1, max: 30, step: 1 },
      description: 'How fast pipes scroll',
      tunable: true,
    },
    combo: {
      label: 'Combo',
      category: 'gameplay',
      display: 'always',  // Show to player
      tunable: false,  // Don't show in tuning panel
    },
  },
  
  templates: {
    bird: {
      sprite: { type: 'circle', radius: { expr: "birdRadius" } },
      physics: { radius: { expr: "birdRadius" }, /* ... */ },
    },
    pipeTop: {
      behaviors: [
        { type: 'move', speed: { expr: "pipeSpeed" } },
      ],
    },
  },
  
  rules: [
    {
      trigger: { type: 'tap' },
      actions: [
        { type: 'set_velocity', y: { expr: "flapForce" } },
      ],
    },
  ],
};
```

### Benefits of This Approach

| Benefit | Explanation |
|---------|-------------|
| **Single Source of Truth** | All game values live in `variables` |
| **No Duplication** | One concept, one place |
| **Gradual Enhancement** | Metadata is optional - existing games work unchanged |
| **Flexible** | Same variable can be tunable AND displayed AND modified by rules |
| **Future-Proof** | Easy to add more metadata fields later |
| **AI-Friendly** | Simple rule: "Put all numbers in variables, add metadata for tunables" |
| **Expression Compatible** | All variables work in expressions automatically |
| **UI Flexibility** | Same data powers both tuning panel AND player displays |

---

## Implementation Plan

### Phase 1: Add VariableMetadata (1-2 days)

1. **Type Definition**
   - Add `VariableMetadata` interface
   - Add `variableMetadata` field to `GameDefinition`
   - Update Zod schema

2. **Schema Updates**
   - `shared/src/types/GameDefinition.ts`
   - `shared/src/types/schemas.ts`

### Phase 2: Tuning UI (2-3 days)

1. **Filter Tunable Variables**
   ```typescript
   const tunableVars = Object.entries(game.variables || {})
     .filter(([key]) => game.variableMetadata?.[key]?.tunable === true)
     .map(([key, value]) => ({
       key,
       value,
       metadata: game.variableMetadata![key],
     }));
   ```

2. **Render Sliders**
   - Group by category
   - Use `range.min/max/step` for slider config
   - Show `label` and `description`

3. **Update Variables on Drag**
   ```typescript
   const handleSliderChange = (key: string, newValue: number) => {
     setGameState(prev => ({
       ...prev,
       variables: {
         ...prev.variables,
         [key]: newValue,
       },
     }));
   };
   ```

4. **Hot Reload**
   - Expressions automatically recompute when variables change
   - Behaviors read new values on next frame

### Phase 3: AI Integration (2 days)

Update AI prompts:

```markdown
## Game Variables

All numeric game parameters should be defined in the `variables` section.

For parameters that affect game balance (speeds, forces, gaps, etc.):
1. Add the variable with a reasonable default
2. Add metadata with `tunable: true`, `range`, `label`, `category`

Example:
```json
{
  "variables": {
    "enemySpeed": 10,
    "jumpForce": 15
  },
  "variableMetadata": {
    "enemySpeed": {
      "label": "Enemy Speed",
      "category": "gameplay",
      "range": { "min": 5, "max": 20, "step": 1 },
      "description": "How fast enemies move",
      "tunable": true
    },
    "jumpForce": {
      "label": "Jump Height",
      "category": "gameplay",
      "range": { "min": 8, "max": 25, "step": 0.5 },
      "description": "Upward force when jumping",
      "tunable": true
    }
  }
}
```

Then reference variables in templates/rules using expressions:
```json
{
  "behaviors": [
    { "type": "move", "speed": { "expr": "enemySpeed" } }
  ]
}
```
```

---

## Migration Strategy

### For Existing Games

**No migration needed!** Games without `variableMetadata` work exactly as before.

To add tuning:
1. Identify numeric constants used in multiple places
2. Move to `variables`
3. Add `variableMetadata` with `tunable: true`
4. Replace literal values with `{ expr: "variableName" }`

### For New AI-Generated Games

AI automatically generates:
- `variables` section with all numeric params
- `variableMetadata` for tunable ones
- Expression references throughout

---

## Comparison: Separate vs Unified

| Aspect | Separate Tunables System | Unified Variables + Metadata |
|--------|--------------------------|------------------------------|
| **Conceptual Overhead** | High - two similar systems | Low - one enhanced system |
| **Lines of Code** | +500-700 new types/logic | +100-150 metadata only |
| **AI Prompt Complexity** | High - explain both systems | Low - enhance existing guidance |
| **Flexibility** | Limited - tunables are static | High - variables can be dynamic |
| **Existing Game Compat** | Risk - new concept | Perfect - optional enhancement |
| **Future Scaling** | Difficult - two systems diverge | Easy - metadata extensible |
| **Maintenance** | 2 systems to update | 1 system |
| **User Mental Model** | Confusing - when to use which? | Clear - everything is a variable |
| **Expression Integration** | Needs new resolver | Works automatically |
| **UI Components** | 2 separate UIs | 1 UI with filters |

**Winner**: Unified approach by every metric.

---

## Addressing Original User Request

### User's Core Need

> "When AI generates games, they're buggy because AI can't test. I want a live tuning UI with sliders so designers can quickly balance the game."

### Proposed Solution Meets This By

1. **Tuning UI**: Floating panel with sliders (same UX as proposed tunables)
2. **Live Updates**: Changes apply immediately (same behavior)
3. **Export**: Save tuned values back to JSON (same feature)
4. **AI Integration**: AI marks variables as `tunable` automatically

### Additional Benefits of Unified Approach

1. **Tunables can become dynamic**: If `enemySpeed` needs to scale with wave, just change to `{ expr: "baseSpeed * (1 + wave * 0.1)" }`
2. **No artificial limits**: Booleans, strings, Vec2 can also be tunable if needed
3. **Rule integration**: Rules can modify tunable variables if desired
4. **Expression power**: Tunables can reference other variables: `{ expr: "pipeSpeed * 0.5" }`

---

## Slot System: Orthogonal, No Conflict

**Slots are NOT affected by this decision** - they serve a completely different purpose:

| System | Purpose | Example |
|--------|---------|---------|
| **Slots** | Physical attachment points (X/Y coords) | `{ head: { x: 0, y: 1.0 } }` |
| **Variables** | Gameplay parameters (speeds, forces, etc.) | `{ jumpForce: 15, enemySpeed: 10 }` |

No overlap, no conflict, no confusion.

---

## Final Recommendation

### ✅ **DO THIS**: Enhance Variables with Metadata

```typescript
// Add to GameDefinition
variableMetadata?: Record<string, VariableMetadata>;

// Build tuning UI that filters for metadata.tunable === true
// AI generates metadata for balance-sensitive variables
```

**Effort**: 5-7 days total  
**Risk**: Low - backward compatible  
**Benefit**: High - solves user's problem without adding complexity

### ❌ **DON'T DO THIS**: Add Separate Tunables System

```typescript
// Don't create a parallel system
tunables?: Record<string, TunableVariable>; // ❌
```

**Why Not**: 97% overlap with variables, adds confusion, maintenance burden, AI complexity, and limits flexibility.

---

## Next Steps

1. **Validate with User**: Show this analysis, confirm they agree with unified approach
2. **Update Live Tuning Design Doc**: Rewrite using enhanced variables approach
3. **Implement Phase 1**: Add `VariableMetadata` type and schema
4. **Implement Phase 2**: Build tuning UI filtering for `tunable: true`
5. **Implement Phase 3**: Update AI prompts to generate metadata
6. **Convert Flappy Bird**: Demonstrate with real example
7. **Document**: Add to game maker reference docs

---

## Conclusion

The "tunables" idea is **excellent** - live parameter tuning is exactly what's needed for AI-generated games. However, implementing it as a **separate system** would be architectural mispat tern.

**The right solution**: Enhance the existing, battle-tested Variables system with optional metadata. This gives all the benefits of tunables with none of the drawbacks, while preserving architectural simplicity and keeping the door open for future flexibility.

**Core Principle**: When a proposed feature has 97% overlap with an existing system, **enhance the existing system** rather than create a parallel one.
