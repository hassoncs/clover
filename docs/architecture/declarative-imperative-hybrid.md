# Declarative-Imperative Hybrid Game Engine Architecture

## Problem Statement

Building an AI-powered game maker requires a game engine that can be both:
1. **Declarative** - Easy for AI to generate, compose, and reason about
2. **Imperative** - Flexible enough for complex game-specific logic

Currently, our game engine has declarative systems (behaviors, rules) but some game types (like Match-3) are implemented entirely imperatively, mixing visual feedback with game logic.

## The Tension

### Pure Declarative (What We Want for AI)
```typescript
// AI can generate this easily
templates: {
  candy: {
    behaviors: [
      { type: "oscillate", axis: "y", amplitude: 0.1 }
    ]
  }
}
```
**Pros:** Composable, AI-friendly, no code needed
**Cons:** Limited expressiveness, can't handle complex algorithms

### Pure Imperative (What Complex Games Need)
```typescript
// Match detection algorithm - must be code
private findMatches(): Match[] {
  // Complex board scanning logic
  // Can't be expressed declaratively
}
```
**Pros:** Full flexibility, any algorithm possible
**Cons:** AI can't generate, hard to compose, mixes concerns

## The Insight

**Different concerns have different needs:**

| Concern | Best Approach | Example |
|---------|---------------|---------|
| Visual feedback | Declarative | "Selected things glow and pulse" |
| Input response | Declarative | "When tapped, add 'selected' tag" |
| Game algorithms | Imperative | Match-3 detection, pathfinding |
| Board management | Imperative | Grid state, cascades, spawning |

## Proposed Solution: Tag-Driven Visual States

### The Pattern
1. **Imperative code** manages WHEN state changes happen (game logic)
2. **Declarative config** defines WHAT visual feedback looks like

### Example: Match-3 Selection

**Current (Mixed Concerns):**
```typescript
// Match3GameSystem.ts - 80 lines of visual effect code
private showHighlight(row, col) {
  // Apply glow effect
  this.bridge.applySpriteEffect(entityId, "glow", {...});
  // Start scale animation
  this.selectionAnimTime = 0;
}

private updateSelectionScale(dt) {
  // Manual oscillation math
  const scale = MID + Math.sin(time * SPEED) * AMP;
  this.bridge.setScale(entityId, scale, scale);
}
```

**Proposed (Separated Concerns):**
```typescript
// Game definition (declarative)
templates: {
  candy: {
    conditionalBehaviors: [
      {
        when: { hasTag: "selected" },
        behaviors: [
          { type: "scale_oscillate", min: 0.97, max: 1.06, speed: 5 },
          { type: "sprite_effect", effect: "glow", params: { pulse: true } }
        ]
      },
      {
        when: { hasTag: "hovered" },
        behaviors: [
          { type: "sprite_effect", effect: "rim_light" }
        ]
      }
    ]
  }
}

// Match3GameSystem.ts - just manages state
handleTap(row, col) {
  if (this.selectedCell) {
    this.entityManager.removeTag(oldEntityId, "selected");
  }
  this.entityManager.addTag(newEntityId, "selected");
}
```

## Benefits

### For AI Generation
- AI describes visual states in templates
- No imperative code generation needed for effects
- Behaviors are composable and predictable

### For Complex Games
- Game logic stays imperative (match detection, cascades)
- Visual feedback is reusable across game types
- Clear separation of concerns

### For Debugging
- Visual state is inspectable (just check tags)
- Behaviors are isolated and testable
- No hidden state in imperative code

## What We Need to Add

### 1. Dynamic Tag Management
```typescript
// EntityManager additions
addTag(entityId: string, tag: string): void
removeTag(entityId: string, tag: string): void
hasTag(entityId: string, tag: string): boolean
```

### 2. Conditional Behaviors
```typescript
// New schema
interface ConditionalBehavior {
  when: {
    hasTag?: string;
    hasAnyTag?: string[];
    hasAllTags?: string[];
  };
  behaviors: Behavior[];
}
```

### 3. New Behavior Types
```typescript
// scale_oscillate - like oscillate but for scale
{ type: "scale_oscillate", min: 0.97, max: 1.06, speed: 5 }

// sprite_effect - applies Godot shader effects
{ type: "sprite_effect", effect: "glow", params: { color: [1,1,0], pulse: true } }
```

### 4. Behavior System Updates
- Check `conditionalBehaviors` each frame
- Evaluate `when` conditions against entity tags
- Apply/remove behaviors dynamically

## Design Questions

1. **Should conditional behaviors stack or replace?**
   - If entity has both "selected" and "hovered" tags, do both apply?

2. **How do we handle effect cleanup?**
   - When tag removed, behavior system must clear effects
   - Need `onDeactivate` hook for behaviors?

3. **Performance implications?**
   - Checking tags every frame for every entity
   - Could optimize with dirty flags or tag change events

4. **What other behaviors should be conditional?**
   - Movement behaviors (only move when "active")?
   - Animation states (play "walking" animation when "moving" tag)?

## Next Steps

1. **Audit existing game engine** - Understand current behavior/rules system deeply
2. **Design conditional behavior schema** - Finalize the API
3. **Implement tag management** - Add to EntityManager
4. **Add new behavior types** - scale_oscillate, sprite_effect
5. **Refactor Match-3** - Use tags instead of imperative visual code
6. **Test with AI generation** - Verify AI can generate these configs
