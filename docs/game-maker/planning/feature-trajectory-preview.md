# Feature: Trajectory Preview

## Overview
Display a dotted line showing the predicted path of the ball before firing, like in Peggle.

## Current State
- Physics system has `raycast()` method for single-ray collision detection
- No trajectory simulation exists
- Rendering uses Skia Canvas with entity renderers

## Design

### Approach: Iterative Raycast Simulation
Instead of running a full physics simulation (complex, would need cloned world), use iterative raycasting with gravity applied between segments.

```
1. Start at cannon position
2. Calculate initial velocity direction (toward touch)
3. For each segment:
   a. Raycast in current direction
   b. If hit: reflect direction based on surface normal, add point
   c. If no hit: apply gravity to direction, add point at max distance
   d. Repeat for N segments or until out of bounds
```

### Data Model

```typescript
// In UIConfig or new TrajectoryConfig
interface TrajectoryPreviewConfig {
  enabled: boolean;
  maxSegments?: number;      // Default: 10
  segmentLength?: number;    // Default: 2 meters
  dotSpacing?: number;       // Default: 0.2 meters
  dotRadius?: number;        // Default: 3 pixels
  color?: string;            // Default: "rgba(255,255,255,0.5)"
  showOnDrag?: boolean;      // Only show while aiming
}
```

### Implementation Steps

1. **Add TrajectoryPreviewConfig to UIConfig** (shared/src/types/GameDefinition.ts)
2. **Create trajectory calculation utility** (app/lib/game-engine/trajectory/)
   - `calculateTrajectory(physics, startPos, direction, config) => Vec2[]`
3. **Create TrajectoryRenderer component** (app/lib/game-engine/renderers/)
   - Renders dotted line from point array
4. **Integrate into GameRuntime**
   - Calculate trajectory when dragging
   - Pass to renderer

### Files to Modify
- `shared/src/types/GameDefinition.ts` - Add TrajectoryPreviewConfig
- `app/lib/game-engine/trajectory/calculateTrajectory.ts` - NEW
- `app/lib/game-engine/renderers/TrajectoryRenderer.tsx` - NEW
- `app/lib/game-engine/GameRuntime.native.tsx` - Integrate

### Success Criteria
- [ ] Dotted line appears when user touches/drags to aim
- [ ] Line follows predicted ball path with gravity
- [ ] Line reflects off walls (at least first bounce)
- [ ] Line disappears after firing
- [ ] Configurable via game definition

## Complexity: Medium
- Raycast exists but need iterative simulation
- Rendering is straightforward (Skia Path with dashes)
