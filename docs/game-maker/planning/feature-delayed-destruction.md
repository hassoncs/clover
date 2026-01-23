# Feature: Delayed Destruction

## Overview
In Peggle, pegs don't disappear immediately when hit. They're marked as "hit" (glow) and destroyed after the ball exits the play area (drains or is caught). This creates satisfying chain reactions and lets players see all the pegs they hit.

## Current State
- `destroy_on_collision` behavior destroys immediately
- No concept of "marked for destruction"
- No turn-based or event-based delayed destruction

## Design

### Approach: Deferred Destruction Queue
Add a destruction queue that collects entities to destroy, then processes them on a trigger event.

### Option A: Behavior-Based (Recommended)
Extend `destroy_on_collision` with delay options:

```typescript
interface DestroyOnCollisionBehavior {
  type: 'destroy_on_collision';
  withTags: string[];
  effect?: DestructionEffect;
  
  // NEW: Delay options
  delay?: {
    type: 'time' | 'event' | 'entity_destroyed';
    time?: number;                    // For type: 'time' - seconds
    eventName?: string;               // For type: 'event' - custom event name
    entityTag?: string;               // For type: 'entity_destroyed' - when entity with tag is destroyed
  };
  
  // NEW: Visual state when marked
  markedEffect?: 'glow' | 'pulse' | 'fade_partial';
  markedColor?: string;               // Override color when marked
}
```

### Option B: Rule-Based
Add new action type for batch destruction:

```typescript
interface DestroyMarkedAction {
  type: 'destroy_marked';
  tag?: string;  // Only destroy marked entities with this tag
}
```

### Implementation (Option A)

1. **Add `markedForDestruction` flag to RuntimeEntity**
2. **Modify DestroyOnCollisionBehavior** to support delay
3. **Add marked entity tracking** in EntityManager
4. **Process destruction queue** on trigger:
   - `time`: After N seconds from marking
   - `event`: When custom event fires (e.g., "ball_drained")
   - `entity_destroyed`: When ball is destroyed

### Peggle-Specific Pattern
```typescript
// In Peggle game definition
behaviors: [
  { 
    type: "destroy_on_collision", 
    withTags: ["ball"], 
    effect: "fade",
    delay: { type: "event", eventName: "turn_end" },
    markedEffect: "glow",
    markedColor: "#FFFF00"  // Yellow glow when hit
  }
]

// Rule to trigger destruction
{
  id: "end_turn",
  trigger: { type: "collision", entityATag: "ball", entityBTag: "drain" },
  actions: [
    { type: "event", eventName: "turn_end" },
    { type: "lives", operation: "subtract", value: 1 },
    // ... respawn ball
  ]
}
```

### Files to Modify
- `shared/src/types/behavior.ts` - Add delay options to DestroyOnCollisionBehavior
- `app/lib/game-engine/types.ts` - Add markedForDestruction to RuntimeEntity
- `app/lib/game-engine/EntityManager.ts` - Track marked entities
- `app/lib/game-engine/behaviors/CollisionBehaviors.ts` - Implement delayed destruction
- `app/lib/game-engine/RulesEvaluator.ts` - Process destruction on event

### Success Criteria
- [ ] Pegs can be marked without immediate destruction
- [ ] Marked pegs have visual indicator (glow/color change)
- [ ] Destruction triggers on specified event
- [ ] All marked pegs destroy together with effects
- [ ] Works with existing score_on_collision (score on hit, not on destroy)

## Complexity: Medium
- Requires state tracking for marked entities
- Need to coordinate with event system
- Visual feedback for marked state
