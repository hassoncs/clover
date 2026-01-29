# Manual Physics Stepping Test Instructions

## Solution Implemented: Time Scale Toggle

The final working approach uses `Engine.time_scale` to control time rather than fighting physics systems:

1. **Inspect mode ON** → `Engine.time_scale = 0.0` (everything frozen)
2. **Manual stepping** → Temporarily set `time_scale = 1.0`, wait for physics frames, then back to `0.0`
3. **Uses natural Godot physics** → No manual `space_step()` calls, just control time

## How to Test

### 1. Open Flappy Bird in Debug Mode

Navigate to: `http://localhost:8085/test-games/flappyBird?debug=true`

### 2. Verify Bird is Frozen

Wait 5-10 seconds after the game loads. The bird should:
- ✅ Stay perfectly still in mid-air
- ✅ Not fall due to gravity
- ✅ Pipes should also be frozen (no scrolling)

### 3. Use Dev Toolbar Frame Stepping

In the bottom-right corner, you'll see the Dev Tools panel. Expand it and you'll see:

```
🛠️ Dev Tools

Frame Stepping
Frame: 0
[+1] [+10] [+60]

☐ Input Debug
☐ Physics Shapes
☐ Show Zones
☐ Show FPS
```

### 4. Step Through Frames

Click the stepping buttons and observe:

- **[+1]** - Advance 1 frame - bird should fall slightly
- **[+10]** - Advance 10 frames - bird falls more  
- **[+60]** - Advance 60 frames - bird accelerates, should hit ground or be very close

The frame counter should increment with each button press.

### 5. What You Should See

After clicking **[+60]** a couple times:
- Frame counter shows ~120
- Bird has fallen significantly (accelerating due to gravity)
- Bird either hits the ground or is near it
- Each button click causes visible motion
- Between clicks, everything is frozen

## Expected Behavior

| State | Bird | Pipes | Frame Counter |
|-------|------|-------|---------------|
| **Initial Load** | Mid-air, stationary | Frozen | 0 |
| **After +1** | Slightly lower | Still frozen | 1 |
| **After +10** | Noticeably lower | Still frozen | 11 |
| **After +60** | Much lower, faster | Still frozen | 71 |
| **After +60 again** | Near/on ground | Still frozen | 131 |

## Implementation Files

- `/godot_project/scripts/bridge/debug/DebugTime.gd` - Time scale toggle logic
- `/godot_project/scripts/GameBridge.gd` - Wires setInspectMode to DebugTime
- `/app/lib/game-engine/GameRuntime.godot.tsx` - Calls setInspectMode before loadGame
- `/app/components/game/DevToolbar.tsx` - UI controls for manual stepping

## Troubleshooting

**If bird is falling automatically:**
- Check browser console for "[GameBridge] Inspect mode ON" message
- Verify URL has `?debug=true` parameter
- Check that `Engine.time_scale` is set to 0

**If stepping doesn't work:**
- Check that buttons are not disabled
- Look for errors in browser console
- Verify `window.SlopcadeDebugBridge` exists in console

**If nothing renders:**
- Clear Metro cache: `rm -rf app/.expo app/node_modules/.cache`
- Restart Metro: `pnpm svc:restart metro`
- Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
