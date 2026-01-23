# Feature: Time Scale

## Overview
Control the speed of game time for slow-motion effects, speed-up, or pause-like states.

## Current State
- Game loop uses `useSimplePhysicsLoop` which provides `deltaTime`
- Physics step receives `dt` directly
- No time scale multiplier exists

## Design

### Approach: Time Scale Multiplier
Add a `timeScale` value that multiplies delta time before it's used.

```
effectiveDt = dt * timeScale
```

- `timeScale = 1.0` → Normal speed
- `timeScale = 0.5` → Half speed (slow-mo)
- `timeScale = 2.0` → Double speed
- `timeScale = 0.0` → Frozen (but not paused - animations could still run)

### Data Model

```typescript
// Game-level config
interface GameDefinition {
  // ... existing fields
  timeScale?: number;  // Default: 1.0
}

// Runtime control via rules
interface SetTimeScaleAction {
  type: 'set_time_scale';
  scale: number;
  duration?: number;      // Optional: auto-restore after N seconds (real-time)
  easeIn?: number;        // Transition time to reach target scale
  easeOut?: number;       // Transition time to restore normal
}
```

### Implementation Steps

1. **Add timeScale to game state** (RulesEvaluator or GameRuntime)
2. **Apply timeScale to dt** in stepGame callback
3. **Add SetTimeScaleAction** to rules system
4. **Handle duration/easing** for temporary slow-mo

### Where to Apply Time Scale

```typescript
// In GameRuntime.native.tsx stepGame callback
const stepGame = useCallback((rawDt: number) => {
  const dt = rawDt * timeScaleRef.current;
  
  // All game systems use scaled dt
  physics.step(dt, 8, 3);
  game.behaviorExecutor.executeAll(entities, { ...context, dt });
  game.rulesEvaluator.update(dt, ...);
  camera.update(dt, ...);
}, []);
```

### Easing for Smooth Transitions

For dramatic effect, time scale changes should ease in/out:

```typescript
// Pseudo-code for eased time scale
if (targetTimeScale !== currentTimeScale) {
  const t = Math.min(1, elapsedTransition / easeDuration);
  currentTimeScale = lerp(startTimeScale, targetTimeScale, easeOutQuad(t));
}
```

### Example Usage

```typescript
// Slow-mo when hitting last orange peg
rules: [
  {
    id: "dramatic_finish",
    trigger: { type: "entity_count", tag: "orange-peg", count: 1, comparison: "eq" },
    conditions: [
      { type: "entity_count", tag: "orange-peg", max: 1 }
    ],
    actions: [
      { type: "set_time_scale", scale: 0.3, duration: 2, easeIn: 0.5, easeOut: 0.5 }
    ],
    fireOnce: true
  }
]
```

### Files to Modify
- `shared/src/types/rules.ts` - Add SetTimeScaleAction
- `shared/src/types/GameDefinition.ts` - Add initial timeScale option
- `app/lib/game-engine/GameRuntime.native.tsx` - Apply time scale to dt
- `app/lib/game-engine/rules/actions/LogicActionExecutor.ts` - Handle set_time_scale

### Edge Cases
- **UI should run at real-time**: Timer display, input handling
- **Audio pitch**: Optionally slow down audio (complex, skip for now)
- **Minimum scale**: Prevent timeScale = 0 from freezing completely (use pause instead)

### Success Criteria
- [ ] `set_time_scale` action changes game speed
- [ ] Physics, behaviors, and rules all respect time scale
- [ ] Optional duration auto-restores normal speed
- [ ] Smooth easing transitions (optional but nice)
- [ ] UI timer shows real time, not scaled time

## Complexity: Low-Medium
- Core change is simple (multiply dt)
- Easing adds some complexity
- Need to be careful about what uses scaled vs real time
