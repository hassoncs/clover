# Physics Stepping Debug Notes

*Created: 2026-01-29*
*Purpose: Document the physics stepping architecture for debugging the game inspector*

## Architecture Overview

The physics stepping system has **three layers**:

```
┌─────────────────────────────────────────────────────────────────┐
│  MCP Tools (game-inspector-mcp)                                 │
│  - Calls window.SlopcadeDebugBridge methods via Playwright      │
└────────────────────────────┬────────────────────────────────────┘
                             │ querySlopcade()
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  React Layer (SlopcadeDebugBridge)                              │
│  - Exposed on window.SlopcadeDebugBridge                        │
│  - Controls game loop via setInterval pause/resume              │
│  - Calls bridge.stepPhysics() for Rapier                        │
│  - Calls stepGame() for game rules                              │
└────────────────────────────┬────────────────────────────────────┘
                             │ GodotBridge.stepPhysics()
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Godot Layer (DebugTime.gd / DeterministicTimeController.gd)    │
│  - Receives stepPhysicsSync query                               │
│  - Calls RapierPhysicsServer2D.space_step() directly            │
│  - Syncs transforms back to Godot nodes                         │
└─────────────────────────────────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `packages/game-inspector-mcp/src/tools/time-control.ts` | MCP tools: pause, resume, step, step_sequence |
| `packages/game-inspector-mcp/src/utils.ts` | `querySlopcade()` - calls window.SlopcadeDebugBridge |
| `app/lib/game-engine/debug/SlopcadeDebugBridge.ts` | React bridge exposed on window |
| `app/lib/game-engine/GameRuntime.godot.tsx` | Game loop, stepGame(), manualStep() |
| `app/lib/godot/GodotBridge.web.ts` | `stepPhysics()` - calls Godot's stepPhysicsSync |
| `godot_project/scripts/bridge/debug/DebugBridge.gd` | Routes queries to DebugTime |
| `godot_project/scripts/bridge/debug/DebugTime.gd` | Actual physics stepping via Rapier |

## The Stepping Flow

### 1. MCP Tool Calls Step

```typescript
// packages/game-inspector-mcp/src/tools/time-control.ts:51
const result = await querySlopcade(state.page, "step", [frames]);
```

### 2. querySlopcade Calls window.SlopcadeDebugBridge

```typescript
// packages/game-inspector-mcp/src/utils.ts:238
const result = (methodFn as (...args: unknown[]) => unknown | Promise<unknown>)
  .apply(bridge, evalArgs.args);
```

### 3. SlopcadeDebugBridge.step() Calls Both Layers

```typescript
// app/lib/game-engine/debug/SlopcadeDebugBridge.ts:55-79
async step(frames = 1): Promise<StepResult> {
  const bridge = this.runtime.getGodotBridge();
  
  // Step 1: Step Godot physics (Rapier)
  const physicsResult = await bridge.stepPhysics(frames);
  
  // Step 2: Step React game rules
  const fixedDt = 1 / 60;
  for (let i = 0; i < frames; i++) {
    this.runtime.stepGame(fixedDt);
  }
  
  return { ok: physicsResult.ok, ... };
}
```

### 4. GodotBridge.stepPhysics() Calls Godot

```typescript
// app/lib/godot/GodotBridge.web.ts:438
async stepPhysics(frames: number): Promise<...> {
  return queryAsync<...>(this, "stepPhysicsSync", [frames]);
}
```

### 5. DebugTime.gd Steps Rapier

```gdscript
# godot_project/scripts/bridge/debug/DebugTime.gd:143-150
for i in range(frames):
  if rapier:
    rapier.space_step(space, delta)
  else:
    PhysicsServer2D.call("space_step", space, delta)
  _frame_counter += 1

# Then sync transforms back to nodes
_sync_body_transforms(physics_server, space)
```

## The Problem Area

When stepping, we need to ensure:

1. **Physics is stepped** - Rapier's `space_step()` advances the simulation
2. **Transforms are synced** - Godot nodes get updated positions from physics
3. **React is updated** - `stepGame()` runs behaviors and rules
4. **Frame state is captured** - For screenshots in filmstrip

### Current Debug Output (in DebugTime.gd)

```gdscript
# BEFORE step: bird pos=... vel=...
# Stepping N frames with delta=..., space=..., rapier_singleton=...
# AFTER step (from PhysicsServer): vel=... transform=...
# AFTER sync: bird pos=... vel=...
```

## Potential Issues to Investigate

### 1. Physics Not Actually Stepping

Check if `space_step()` is being called:
- Is Rapier singleton available?
- Is the space RID valid?
- Is manual stepping enabled?

### 2. Transform Sync Not Working

After `space_step()`, transforms must be synced back:
- `_sync_body_transforms()` must be called
- `space_get_bodies_transform()` must return valid data
- RigidBody2D nodes must be updated

### 3. React Not Getting Updates

After Godot steps, React needs to:
- Call `stepGame(dt)` to run behaviors
- Sync transforms from physics to entity manager
- Update game state

### 4. Frame Counter Mismatch

Two frame counters exist:
- Godot: `_frame_counter` in DebugTime.gd
- React: `frameIdRef.current` in GameRuntime.godot.tsx

These should stay in sync during stepping.

## Testing Commands

### Using Game Inspector MCP

```
# Pause the game
game-inspector_pause

# Get time state (should show paused: true)
game-inspector_get_time_state

# Step 1 frame
game-inspector_step { frames: 1, screenshot: true }

# Step 10 frames with filmstrip
game-inspector_step_sequence { totalFrames: 10, captureEvery: 1 }
```

### Expected Behavior

1. After pause: Physics space should be inactive, game loop should stop
2. After step: 
   - Physics should advance by delta * frames
   - Entity transforms should update
   - Frame counter should increment
3. Screenshot should show the new state

## Debug Checklist

- [ ] Verify Rapier singleton exists: `Engine.get_singleton("RapierPhysicsServer2D")`
- [ ] Verify space is valid: `viewport.world_2d.space.is_valid()`
- [ ] Verify manual stepping is enabled before step
- [ ] Check console for `[DebugTime]` log messages
- [ ] Compare entity positions before/after step
- [ ] Verify frame counter increments
- [ ] Check that screenshots capture post-step state

## Next Steps

1. Add more logging to trace exactly where stepping fails
2. Verify the Rapier extension methods are available
3. Check if transforms are being synced correctly
4. Test with a simple game (e.g., falling ball) to isolate the issue
