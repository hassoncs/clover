# Feature: Teleporters

## Overview
Portal pairs that transport entities from one location to another. Ball enters portal A, exits portal B with preserved (or modified) velocity.

## Current State
- No teleportation mechanism exists
- Collision detection works via sensors
- Entity position can be set via physics.setTransform()

## Design

### Approach: Behavior + Linked Entity Pairs
Create a `teleport` behavior that activates on collision and moves the colliding entity to a linked destination.

### Data Model

```typescript
interface TeleportBehavior extends BaseBehavior {
  type: 'teleport';
  destinationEntityId: string;        // ID of exit portal entity
  withTags: string[];                 // Which entities can teleport (e.g., ["ball"])
  preserveVelocity?: boolean;         // Default: true
  velocityMultiplier?: number;        // Default: 1.0 (can boost or slow)
  exitOffset?: Vec2;                  // Offset from destination center
  cooldown?: number;                  // Prevent immediate re-teleport (seconds)
  effect?: 'none' | 'flash' | 'particles';
}
```

### Visual Design
Teleporters should be visually distinct:
- Circular or oval shape
- Matching colors for linked pairs
- Optional swirl/vortex animation

### Implementation Steps

1. **Add TeleportBehavior to behavior types** (shared/src/types/behavior.ts)
2. **Implement teleport handler** (app/lib/game-engine/behaviors/TeleportBehavior.ts)
   - On collision with valid entity:
     - Get destination entity position
     - Calculate exit position (destination + offset)
     - Set entity transform to exit position
     - Optionally modify velocity
     - Start cooldown to prevent re-entry
3. **Add cooldown tracking** per entity-teleporter pair
4. **Optional: Add visual effects** on teleport

### Example Usage
```typescript
templates: {
  portalA: {
    id: "portalA",
    tags: ["portal"],
    sprite: { type: "circle", radius: 0.5, color: "#00FFFF" },
    physics: { bodyType: "static", shape: "circle", radius: 0.5, isSensor: true },
    behaviors: [
      { 
        type: "teleport", 
        destinationEntityId: "portal-b", 
        withTags: ["ball"],
        preserveVelocity: true,
        cooldown: 0.5
      }
    ]
  },
  portalB: {
    id: "portalB", 
    tags: ["portal"],
    sprite: { type: "circle", radius: 0.5, color: "#00FFFF" },
    physics: { bodyType: "static", shape: "circle", radius: 0.5, isSensor: true },
    behaviors: [
      { 
        type: "teleport", 
        destinationEntityId: "portal-a", 
        withTags: ["ball"],
        preserveVelocity: true,
        cooldown: 0.5
      }
    ]
  }
}
```

### Edge Cases
- **Cooldown**: Prevent ball from immediately re-entering after exit
- **Velocity direction**: Should exit velocity point away from portal or preserve original direction?
- **Chained teleports**: What if exit is inside another teleporter?
- **Multiple balls**: Each ball needs independent cooldown tracking

### Files to Modify
- `shared/src/types/behavior.ts` - Add TeleportBehavior
- `app/lib/game-engine/BehaviorExecutor.ts` - Register teleport handler
- `app/lib/game-engine/behaviors/TeleportBehavior.ts` - NEW: Implementation
- `app/lib/game-engine/BehaviorContext.ts` - May need teleport cooldown state

### Success Criteria
- [ ] Ball enters portal A, exits at portal B
- [ ] Velocity is preserved (or modified by multiplier)
- [ ] Cooldown prevents immediate re-teleport
- [ ] Works bidirectionally (A→B and B→A)
- [ ] Visual feedback on teleport (optional)

## Complexity: Low-Medium
- Straightforward position manipulation
- Main complexity is cooldown tracking per entity
