# Game Inspector Architecture (Clean Design)

## Overview

The game inspector enables frame-by-frame debugging of Slopcade games through a three-layer architecture:

```
MCP Tools (Playwright)
    ↓
React Bridge (SlopcadeDebugBridge)
    ↓
Godot Debug Bridge (DebugTime)
    ↓
Rapier Physics (PhysicsServer2D)
```

## Principles

1. **React owns the game loop** - The React layer controls when frames advance via `setInterval`
2. **Godot is stateless** - Godot has no pause state; it just executes `space_step()` when told
3. **Single path, no legacy** - One clear path from MCP → React → Godot, no duplicate systems

## Layer Responsibilities

### MCP Layer (`game-inspector-mcp`)
- Launches browser with Playwright
- Opens game URL with `?debug=true` query parameter
- Calls `window.SlopcadeDebugBridge.step(frames)` via page.evaluate()
- Takes screenshots after stepping
- **Does NOT** interact with Godot directly

### React Layer (`SlopcadeDebugBridge`)
- Exposes `window.SlopcadeDebugBridge` API
- Controls game loop via `setInterval`
- When paused: clears interval (no frames advance)
- When stepping: calls `bridge.stepPhysics(frames)` to advance Godot physics
- **Source of truth** for pause state

### Godot Layer (`DebugTime`)
- Receives `step(frames)` calls from React
- Calls `PhysicsServer2D.space_step(space, delta)` directly
- Syncs transforms from PhysicsServer2D back to RigidBody2D nodes
- **No pause state management** - React handles that

## Stepping Flow

```
1. MCP calls: querySlopcade(page, "step", [10])
2. React Bridge: pause game loop, call bridge.stepPhysics(10)
3. Godot DebugTime: for i in 10: PhysicsServer2D.space_step(space, delta)
4. Godot DebugTime: sync transforms from physics server to nodes
5. React Bridge: return control to MCP
6. MCP: take screenshot, return result
```

## What Was Removed

- ❌ `DeterministicTimeController` - duplicate time controller with complex pause logic
- ❌ Legacy handlers in `DebugBridge` - `pause`, `resume`, `step`, `stepPhysicsSync`
- ❌ `GameBridge.pause_physics()` - old pause system with `get_tree().paused = true`
- ❌ `Engine.time_scale = 0.0` in Godot - React controls timing
- ❌ `PhysicsServer2D.space_set_active(space, false)` - breaks manual stepping
- ❌ All dual-path complexity - only one clear path remains

## Current Implementation

### Godot: DebugTime.gd
```gdscript
func step(frames: int) -> Dictionary:
    var delta = 1.0 / Engine.physics_ticks_per_second
    var space = get_viewport().world_2d.space
    
    for i in range(frames):
        PhysicsServer2D.space_step(space, delta)
        _frame_counter += 1
    
    PhysicsServer2D.space_flush_queries(space)
    _sync_body_transforms(space)
    
    return {"ok": true, "framesAdvanced": frames}
```

### React: SlopcadeDebugBridge
```typescript
async step(frames: number) {
    // Pause React game loop
    clearInterval(this.gameLoopInterval)
    
    // Advance Godot physics
    await this.bridge.stepPhysics(frames)
    
    // Don't resume - inspector controls when to resume
}
```

### MCP: time-control.ts
```typescript
const result = await querySlopcade(state.page, "step", [frames])
const screenshot = await takeScreenshot(state.page)
```

## Debug Mode (`?debug=true`)

When `?debug=true` is present in URL:
- React initializes `SlopcadeDebugBridge` on `window`
- Game loop starts paused (interval not set)
- Godot DebugBridge is initialized and registered with QuerySystem
- MCP can now control frame advancement

When debug=false (normal play):
- No `SlopcadeDebugBridge` exposed
- Game loop runs automatically via `setInterval`
- Godot DebugBridge not initialized
- Game plays normally

## Key Insights

The root cause of the stepping bug was architectural complexity:
- **Too many pause systems** - Three different systems trying to pause, conflicting with each other
- **`space_set_active(false)` in wrong controller** - DeterministicTimeController had it, but DebugTime was being called
- **Dual handlers** - MCP called legacy `step` handler, which used simplified DebugTime without proper setup
- **Unclear ownership** - Both React and Godot thought they owned pause state

The fix: **Delete complexity, single clear path, React owns timing.**
