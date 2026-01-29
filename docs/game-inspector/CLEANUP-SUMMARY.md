# Physics Stepping Cleanup - Summary

## Problem

Physics stepping wasn't working because we had THREE separate pause/resume systems conflicting with each other, and the MCP was calling the wrong handler path.

## Root Causes

1. **Duplicate time controllers**: `DebugTime` (simple) vs `DeterministicTimeController` (complex with `space_set_active`)
2. **Dual handler registration**: Legacy (`step`, `pause`, `resume`) vs new JSON-RPC style (`time.step`, `time.pause`, `time.resume`)
3. **MCP calling wrong path**: Called legacy `step` handler → `DebugTime.step()` which didn't have `space_set_active(false)`
4. **Multiple pause systems**: GameBridge, PhysicsControlSystem, DebugTime, DeterministicTimeController all trying to pause
5. **Unclear ownership**: Both React and Godot thought they controlled pause state

## Changes Made

### Deleted Files
- ❌ `/godot_project/scripts/bridge/debug/DeterministicTimeController.gd` - duplicate controller
- ❌ `/godot_project/scripts/physics/PhysicsControlSystem.gd` - unused legacy system

### Modified: `DebugBridge.gd`
- Removed `_time_controller: DeterministicTimeController` variable
- Removed all legacy handler registrations: `pause`, `resume`, `stepPhysicsSync`
- Removed all new JSON-RPC handlers: `time.pause`, `time.resume`, `time.step`, `time.setScale`, `time.getState`, `time.setSeed`
- **Single path only**: `getTimeState`, `step`, `setTimeScale`, `setSeed`

### Modified: `DebugTime.gd`
- Removed `pause()` and `resume()` functions - React owns this
- Simplified `step()` - removed all debug logging
- Removed `step_physics_sync()` alias - just use `step()`
- Cleaned up return values - removed redundant `timeState` from most responses
- Removed `get_frame()` and `reset_frame_counter()` - unused

### Modified: `GameBridge.gd`
- Removed `_physics_paused` state variable
- Removed `pausePhysics()` and `resumePhysics()` functions
- Removed JS bridge callbacks for pause/resume

## Final Architecture

**Single Clear Path:**
```
MCP (Playwright)
  └─> querySlopcade(page, "step", [frames])
      └─> React: SlopcadeDebugBridge.step(frames)
          └─> Godot: QuerySystem → DebugBridge._on_step()
              └─> DebugTime.step(frames)
                  └─> PhysicsServer2D.space_step(space, delta)
                  └─> _sync_body_transforms(space)
```

**Key Principles:**
1. **React owns game loop** - Uses `setInterval`, clears it to "pause"
2. **Godot is stateless** - Just executes `space_step()` when told
3. **No pause state in Godot** - React is source of truth
4. **Single handler path** - No legacy/new split
5. **No Engine.time_scale = 0** - Doesn't help manual stepping
6. **No get_tree().paused = true** - Breaks physics
7. **No space_set_active(false)** - Prevents space_step() from working

## Testing

To verify the fix works:
1. Open Flappy Bird in game inspector: `game_inspector_open("flappyBird")`
2. Step physics 10 frames: `game_inspector_step(frames=10, screenshot=true)`
3. Verify bird entity position/velocity changes: `game_inspector_game_entity("bird")`
4. Create filmstrip: `game_inspector_step_sequence(totalFrames=60, captureEvery=10)`
5. Verify filmstrip shows bird falling due to gravity across frames

## Deployment

1. Export Godot with changes: `cd godot_project && godot --headless --export-release "Web" ../app/public/godot/index.html --quit`
2. Restart dev server to pick up new Godot build
3. Test with game-inspector MCP tools

## Files to Review

- `/godot_project/scripts/bridge/debug/DebugBridge.gd` - Main coordinator
- `/godot_project/scripts/bridge/debug/DebugTime.gd` - Simple time controller
- `/godot_project/scripts/GameBridge.gd` - Removed pause functions
- `/packages/game-inspector-mcp/src/tools/time-control.ts` - MCP tools
- `/packages/game-inspector-mcp/src/utils.ts` - querySlopcade implementation
