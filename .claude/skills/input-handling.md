---
description: "User input handling across web and native platforms. Covers touch, mouse, keyboard, drag gestures, tap zones, tilt, virtual buttons, and input coordinate transforms. Use when implementing input, debugging coordinate issues, or adding new gesture types."
---

# Input Handling

> **Skill for AI Agents**: Handling user input across web and native platforms
> **Version**: 1.0
> **Last Updated**: 2026-02-11
> **Source Docs**: docs/godot/WEB_INPUT_HANDLING.md, docs/game-inspector/unified-input-simulation-plan.md

## When to Use This Skill

Load this skill when:
- Implementing touch/mouse/keyboard input
- Debugging input coordinate issues
- Understanding web vs native input differences
- Simulating input for testing
- Working with drag, tap, or gesture handling

## Key Concepts

### Platform Differences

**Web Platform:**
- Input handled by Godot's iframe directly
- Browser events → Godot `_input()` → Convert coords → Emit to React
- Godot knows viewport size and canvas transform
- Coordinates: Browser pixel → Godot viewport → World space

**Native Platform:**
- Input handled by Godot engine directly
- Touch events processed natively
- No browser coordinate translation needed
- Same world coordinate system

### Coordinate Flow (Web)

```
Browser Touch (px) 
    ↓
Godot iframe receives (viewport px)
    ↓
canvas_transform.affine_inverse() → World space (Godot)
    ↓
godot_to_game_pos() → Game space (Slopcade)
    ↓
_bridge_notify_js_input_event() → React Native
    ↓
bridge.onInputEvent() callback
```

**Key conversion**:
```gdscript
# In GameBridge._input()
var screen_pos = event.position  # Viewport pixels
var world_pos = get_viewport().get_canvas_transform().affine_inverse() * screen_pos
var game_pos = godot_to_game_pos(world_pos)
```

### Input Types

From `BehaviorContext.ts`, the engine supports:

| Type | Structure | Trigger | Duration |
|------|-----------|---------|----------|
| **tap** | `{x, y, worldX, worldY}` | Touch up after quick press | One frame |
| **drag** | `{startX/Y, currentX/Y, start/currentWorldX/Y, targetEntityId}` | Touch move | Continuous |
| **dragEnd** | `{velocityX/Y, worldVelocityX/Y}` | Touch up after drag | One frame |
| **mouse** | `{x, y, worldX, worldY}` | Mouse move (web) | Continuous |
| **buttons** | `{left, right, up, down, jump, action}` | Keyboard (web) | While held |
| **joystick** | `{x, y, magnitude, angle}` | Virtual joystick | Continuous |
| **tilt** | `{x, y}` | Accelerometer | Continuous |

## Common Patterns

### Web: Let Godot Handle Input

**DON'T intercept in React:**
```tsx
// BAD: Trying to handle touches in React
<View onTouchStart={handleTouch}>
  <GodotView />
</View>
```

**DO let Godot handle it:**
```tsx
// GOOD: Godot receives events directly
<View className="flex-1">
  <GodotView style={{ flex: 1 }} />
</View>
```

**Listen to processed events:**
```typescript
// In React component
useEffect(() => {
  const unsubscribe = bridge.onInputEvent((event) => {
    if (event.type === 'tap') {
      handleTap(event.worldX, event.worldY);
    } else if (event.type === 'drag') {
      handleDrag(event.worldX, event.worldY, event.targetEntityId);
    }
  });
  return unsubscribe;
}, []);
```

### Simulating Input (Testing)

Use the unified input simulation system:

```typescript
// Simulate a tap
await debugBridge.simulateInput({
  type: 'tap',
  worldX: 100,
  worldY: 200
});

// Simulate drag
await debugBridge.simulateInput({
  type: 'drag_start',
  worldX: 100,
  worldY: 200,
  targetEntityId: 'ball-1'
});

await debugBridge.simulateInput({
  type: 'drag_move',
  worldX: 150,
  worldY: 200
});

await debugBridge.simulateInput({
  type: 'drag_end',
  worldX: 150,
  worldY: 200,
  velocityX: 5,
  velocityY: 0
});

// Wait for physics to settle
await debugBridge.game_wait_stationary('ball-1');
```

## Gotchas & Warnings

- **Iframe size ≠ Godot viewport**: Browser scales iframe to fit, but Godot's internal viewport is fixed (e.g., 720x1280). Always convert through Godot's canvas transform.

- **Mouse move only on web**: Mobile/native doesn't have mouse hover. Use tap/drag for cross-platform input.

- **Input cleared each frame**: One-shot inputs (tap, dragEnd) are cleared at end of frame. Read them in your game loop update.

- **Coordinate systems are confusing**: There are 3 coordinate spaces:
  1. Screen pixels (browser/screen)
  2. World space (Godot's physics space)
  3. Game space (Slopcade's normalized space)
  Godot handles 1→2, then converts 2→3 before sending to React.

- **Drag targetEntityId**: Only set on drag_start. drag_move events don't include it - track it yourself.

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| Tap at wrong location | Coordinate not converted | Check Godot is doing `canvas_transform.affine_inverse()` |
| No input events in React | Missing listener | Ensure `bridge.onInputEvent()` is registered |
| Drag feels laggy | React intercepting events | Remove `pointerEvents` wrapper around GodotView |
| Keyboard not working | Web only feature | Use virtual joystick or buttons for mobile |
| Tilt not triggering | Permission not granted | Request device motion permission on iOS |

## Quick Reference

| Task | Solution |
|------|----------|
| Debug tap location | Log `event.worldX, event.worldY` in `onInputEvent` |
| Test input handling | Use `debugBridge.simulateInput()` with appropriate type |
| Get entity under finger | Use `targetEntityId` from drag_start event |
| Check if button pressed | Read `ctx.input.buttons.left` in script update hook |

## Related Skills

- `bridge-development.md` — Input events flow through bridge
- `game-inspector.md` — Simulating input for testing
- `game-authoring.md` — Handling input in scripts

## Changelog

- 2026-02-11: Created from WEB_INPUT_HANDLING.md and unified-input-simulation-plan.md
