# Draft: Game Engine Redesign - Declarative-Imperative Hybrid

## User's Request

**Goal**: Design a clean, extensible game engine for an AI-powered children's game maker (ages 6-14) that supports both simple declarative games and complex imperative logic (like Match-3).

**Core Philosophy**: 
- Systems and pieces that users can "puzzle piece together"
- AI helps users understand and connect well-tested holistic systems
- Similar to Scratch for kids - visual, understandable, composable
- Escape hatch for complex games without mixing concerns

**Key Problem**: 
- Current Match-3 implementation mixes visual effects (80 lines of glow/scale code) with game logic
- Need clean separation: **imperative code manages WHEN state changes, declarative config defines WHAT visual feedback looks like**

## Current Architecture Analysis

### Strengths
1. **Declarative Foundation**: Entities, behaviors, rules are all JSON-serializable
2. **AI-Friendly**: Simple enough for LLMs to generate correctly
3. **Composable**: Multiple behaviors can be combined
4. **Type-Safe**: TypeScript interfaces with Zod schemas
5. **Plugin System Exists**: `GameSystemRegistry` allows registering custom systems

### Current Components

| Component | Type | Status | AI-Generatable |
|-----------|------|--------|----------------|
| **Entities** | Declarative | ✅ Solid | ✅ Yes |
| **Behaviors** (20 types) | Declarative | ✅ Solid | ✅ Yes |
| **Rules** | Declarative | ✅ Solid | ✅ Yes |
| **Match3GameSystem** | Imperative | ⚠️ Mixed concerns | ❌ No |

### The Match-3 Problem (Lines 341-418 in Match3GameSystem.ts)

**Current Visual Effect Code** (~80 lines):
- `showHoverHighlight()` - Applies rim light effect manually
- `showHighlight()` - Applies glow effect + pulse manually  
- `updateSelectionScale()` - Manual oscillation math (lines 543-559)
- `hideHighlight()` / `clearSelectionEffect()` - Manual cleanup

**What's Wrong**:
- Visual state management scattered across imperative code
- Same effect patterns duplicated (other games might want "glow on selection")
- Hard to AI-generate or tune
- Cleanup logic error-prone

**What Should Happen** (from doc):
```typescript
// DECLARATIVE (in game definition JSON)
templates: {
  candy: {
    conditionalBehaviors: [
      {
        when: { hasTag: "selected" },
        behaviors: [
          { type: "scale_oscillate", min: 0.97, max: 1.06, speed: 5 },
          { type: "sprite_effect", effect: "glow", params: { pulse: true } }
        ]
      }
    ]
  }
}

// IMPERATIVE (in Match3GameSystem.ts)
handleTap(row, col) {
  this.entityManager.removeTag(oldEntityId, "selected");
  this.entityManager.addTag(newEntityId, "selected");
  // That's it! Visual effects handled declaratively
}
```

## Research Findings (Complete Codebase Analysis)

### Entity System
- **Files**: 
  - Types: `shared/src/types/entity.ts`
  - Manager: `app/lib/game-engine/EntityManager.ts`
  - Runtime: `app/lib/game-engine/types.ts` (RuntimeEntity)
- **Current Features**:
  - Template-based with merge resolution
  - Static tags (`tags?: string[]`) set at creation
  - Query methods: `getEntity()`, `getEntitiesByTag()`, `getEntityCountByTag()`
  - Physics sync: `syncTransformsFromPhysics()`
  - Pooling for performance
- **Missing**: 
  - **Dynamic tag add/remove at runtime** (tags are immutable after creation)
  - Tag change events for performance optimization

### Behavior System (20 Built-in Types)
- **Files**: 
  - Types: `shared/src/types/behavior.ts`
  - Executor: `app/lib/game-engine/BehaviorExecutor.ts` (phase-based execution)
  - Context: `app/lib/game-engine/BehaviorContext.ts` (unified API)
  - Handlers: `behaviors/MovementBehaviors.ts`, `behaviors/LifecycleBehaviors.ts`
- **5 Execution Phases**: `input → timer → movement → visual → post_physics`
- **20 Behavior Types**:
  - Movement: move, rotate, rotate_toward, follow, bounce, oscillate, draggable, maintain_speed, attach_to
  - Lifecycle: spawn_on_event, destroy_on_collision, timer, health, teleport
  - Scoring: score_on_collision, score_on_destroy
  - Visual/FX: animate, particle_emitter, gravity_zone, magnetic
- **Missing**: 
  - **Conditional behaviors** (only run when tag present)
  - **scale_oscillate** behavior (oscillate exists but only for position)
  - **sprite_effect** behavior (currently done via direct bridge calls)
  - Behavior deactivation lifecycle hooks

### Rules System
- **Files**:
  - Types: `shared/src/types/rules.ts`
  - Evaluator: `app/lib/game-engine/RulesEvaluator.ts`
  - Actions: `rules/actions/ActionRegistry.ts` with specialized executors
- **Trigger Types**: collision, input (tap/drag/button/swipe), timer, score, entity_count, event, frame
- **Action Types**: score, spawn, destroy, apply_impulse, game_state, sound, variable, list operations
- **Current Design**: Global game-level logic (win/lose, scoring, spawning)
- **Gap**: No entity-specific state machines (that's what conditional behaviors will fill)

### Game Systems Registry
- **File**: `shared/src/systems/GameSystemRegistry.ts`
- **Purpose**: Register custom game systems (like Match3) with versioning
- **Current Match3 Status**: **NOT using registry pattern** - instantiated directly in GameRuntime
- **Capabilities**: 
  - Version compatibility checking (semver)
  - Custom expression functions
  - Custom action types
  - Custom behavior types
  - System lifecycle hooks (onGameLoad, onGameUnload)

### Match3 System (The Problem Case)
- **File**: `app/lib/game-engine/systems/Match3GameSystem.ts` (831 lines)
- **Board State**: 2D array `BoardCell[][]` with entity IDs and piece types
- **Match Detection**: `findMatches()` - standard grid scanning algorithm
- **Cascades**: `applyGravity()` + `finishFalling()` with recursive checking
- **Visual Effects Problem** (lines 341-418, 544-559):
  ```typescript
  // 80+ lines of imperative visual code
  showHoverHighlight() { this.bridge.applySpriteEffect("rim_light", ...) }
  showHighlight() { this.bridge.applySpriteEffect("glow", ...) }
  updateSelectionScale() { /* manual Math.sin oscillation */ }
  ```
- **Integration**: Uses EntityManager for spawning, GodotBridge for effects, bypasses Behavior system
- **Sample Game**: `app/lib/test-games/games/gemCrush/game.ts`

### Example Game Definitions
1. **Breakout Bouncer**: Kinematic paddle + dynamic ball with `maintain_speed` + collision rules
2. **Pinball Lite**: Gravity physics + impulse-based flippers + high-restitution bumpers
3. **Falling Catcher**: Automated spawning + timer win conditions + tag-based scoring

## Decisions Made

### 1. Tag System Enhancement
- **Decision**: Add dynamic tag management to EntityManager
- **Rationale**: Core primitive for state-driven visual feedback
- **API**:
  ```typescript
  entityManager.addTag(entityId: string, tag: string)
  entityManager.removeTag(entityId: string, tag: string)
  entityManager.hasTag(entityId: string, tag: string): boolean
  entityManager.getEntitiesWithTag(tag: string): Entity[]
  ```

### 2. Conditional Behaviors
- **Decision**: Support tag-based behavior activation
- **Structure**:
  ```typescript
  interface ConditionalBehavior {
    when: {
      hasTag?: string;
      hasAnyTag?: string[];
      hasAllTags?: string[];
      lacksTag?: string; // NEW: only when tag is absent
    };
    behaviors: Behavior[];
  }
  ```
- **Evaluation**: Check conditions every frame, activate/deactivate behaviors dynamically
- **Cleanup**: Behaviors must support `onDeactivate` hook for cleanup

### 3. New Visual Behaviors
- **`scale_oscillate`**: Like `oscillate` but affects scale instead of position
- **`sprite_effect`**: Declarative shader effects (glow, rim_light, etc.)
- **`tint_color`**: Color tinting based on state

### 4. System Plugin Architecture
- **Decision**: Match3 should be a proper GameSystem plugin
- **Benefits**:
  - Versioning and compatibility checking
  - Can provide custom expression functions (e.g., `match3.combo_multiplier()`)
  - Can register custom behaviors (e.g., `swap_pieces`)
  - Can register custom actions (e.g., `clear_matches`)

## Open Questions

### 1. Behavior Stacking
**Question**: If entity has both "selected" and "hovered" tags, do both conditional behaviors apply?

**User Decision**: **CSS-Style Specificity with State Precedence**

**Key Insights**:
- "Think like web design" - tags are like CSS classes
- Engine just manages tags (`addTag`, `removeTag`)
- **Designer/stylesheet decides what tags mean visually**
- **Precedence ladder**: normal < hover < selected < pressed
- For Match3 specifically: **Skip hover, just use 'selected'**
- Selected gem should:
  - Tint/highlight the sprite
  - Scale oscillate
  - Show continuous sparkle particle effect (optional polish)

**Implementation Approach**:
```typescript
// Conditional behaviors can have priority
conditionalBehaviors: [
  {
    when: { hasTag: "pressed" },
    priority: 3,  // Highest
    behaviors: [...]
  },
  {
    when: { hasTag: "selected" },
    priority: 2,  // Higher than hover
    behaviors: [
      { type: "sprite_effect", effect: "tint", params: { color: [1.2, 1.2, 1.0] } },
      { type: "scale_oscillate", min: 0.97, max: 1.06, speed: 5 },
      { type: "particle_emitter", effect: "sparkle", continuous: true }  // Optional
    ]
  },
  {
    when: { hasTag: "hover" },
    priority: 1,  // Lower priority, won't show if selected/pressed
    behaviors: [...]
  }
]
```

**Behavior**: When multiple tags match, **only the highest priority** conditional behavior group activates.

### 2. Effect Cleanup
**Question**: When tag removed, how do behaviors clean up their effects?

**Options**:
- A) **Auto-cleanup**: BehaviorExecutor tracks active behaviors, calls cleanup automatically
- B) **Explicit hook**: Each behavior implements `onDeactivate()`
- C) **Reference counting**: Effects stay until all activators removed

**User Response Needed**: Which feels most robust?

### 3. Performance
**Question**: Checking tags every frame for every entity - is this fast enough?

**Optimizations**:
- Dirty flag system (only check when tags change)
- Tag change events (behaviors subscribe to tag changes)
- Spatial partitioning (only check entities near camera)

**User Response Needed**: Start simple or optimize early?

### 4. Scratch-Like Simplicity
**Question**: How do we expose this to kids?

**Ideas**:
- Visual tag badges on entities (show active tags)
- "When tagged 'X', do Y" visual programming blocks
- Template library of common state machines (idle → selected → moving)

**User Response Needed**: What's the UI/UX vision?

## Architectural Analysis: What's Missing vs What's Great

### ✅ What's Working Well

| Component | Strength | Keep/Enhance |
|-----------|----------|--------------|
| **Entity Templates** | Clean reusability, AI can generate easily | ✅ Keep as-is |
| **Behavior Catalog** | 20 behaviors cover most game needs, composable | ✅ Keep, add conditional triggers |
| **Rules System** | Declarative global logic, action registry extensible | ✅ Keep, document better |
| **Physics Integration** | Godot 4 sync works smoothly, good perf | ✅ Keep |
| **Type Safety** | Full TypeScript + Zod schemas | ✅ Keep |

### ⚠️ What Needs Redesign

| Gap | Current State | Proposed Solution |
|-----|---------------|-------------------|
| **Dynamic Tags** | Tags are static arrays, no runtime changes | Add `EntityManager.addTag()` / `removeTag()` |
| **Conditional Behaviors** | All behaviors always active | Add `when: { hasTag: 'X' }` wrapper |
| **Visual State Management** | Match3 has 80 lines of imperative glow/scale code | New behaviors: `scale_oscillate`, `sprite_effect` |
| **Game System Plugins** | Match3 not using registry, can't version or extend | Migrate to `GameSystemRegistry.register()` pattern |
| **Behavior Lifecycle** | No cleanup hooks when conditions change | Add `onActivate()` / `onDeactivate()` to behaviors |
| **State Machine Clarity** | Implicit states (idle → selected → swapping) | Make explicit via tags + conditional behaviors |

### 🎯 Core Insight: The "Slot Machine" Pattern

**Problem**: Complex games need **swappable logic modules** but we only support swapping **graphics**.

**Current**: You can swap sprites (`pieceTemplates` in Match3) but not the **selection behavior** or **match detection algorithm**.

**Proposed**: 
1. **Core Engine**: Entities + Behaviors + Rules (always present)
2. **Game Systems** (swappable plugins): Match3System, Tetris System, Card System, etc.
3. **Visual States** (declarative): Tag-based conditional behaviors

**Like Scratch for Kids**:
- **Blocks** = Behaviors (declarative, composable)
- **Costumes** = Sprites (swappable assets)
- **Broadcast Messages** = Tags (state changes)
- **Extensions** = Game Systems (complex logic plugins)

## Scope Boundaries

### IN SCOPE (This Redesign)
- Dynamic tag management system
- Conditional behaviors based on tags
- New visual effect behaviors (scale_oscillate, sprite_effect)
- Refactor Match3GameSystem to use tags + conditional behaviors
- GameSystem plugin registration pattern

### OUT OF SCOPE (Future Work)
- Visual programming UI (Scratch-like blocks)
- Animation state machines
- Complex AI prompt engineering for conditional behaviors
- Performance optimizations (start simple, measure, optimize)
- Other game systems beyond Match3

## Technical Approach Decided

### Phase 1: Core Tag System
1. Add tag management methods to EntityManager
2. Add tag change event system (optional, for perf)
3. Update entity schema to track dynamic tags separately from static tags

### Phase 2: Conditional Behaviors
1. Add ConditionalBehavior schema to shared types
2. Update BehaviorExecutor to evaluate conditions each frame
3. Implement behavior activation/deactivation lifecycle

### Phase 3: Visual Behaviors
1. Implement scale_oscillate behavior
2. Implement sprite_effect behavior (wraps bridge calls)
3. Test with simple examples

### Phase 4: Refactor Match3
1. Register Match3GameSystem with GameSystemRegistry
2. Move visual effects from imperative code to conditional behaviors
3. Update game definition JSON to use new pattern

### Phase 5: Documentation & AI Training
1. Update behavior system docs with conditional behaviors
2. Create examples for AI to learn from
3. Add to game template library
