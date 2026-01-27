# Web Input Handling - Let Godot Handle It

**Date:** 2026-01-25  
**Status:** Implemented  
**Applies to:** Web platform

## Summary

For web, the cleanest approach is to let Godot's iframe handle all input events directly, rather than intercepting touches in React and translating coordinates.

## The Problem

When React intercepts touch events and tries to translate coordinates to Godot's world space:

1. **Browser iframe size ≠ Godot viewport size**: Godot's internal viewport is 720x1280, but the browser displays the iframe at whatever size fits (e.g., 720x528)
2. **Scaling mismatch**: Touch coordinates are relative to the displayed iframe size, not Godot's internal viewport
3. **Complex translation**: Requires knowing both sizes and doing manual scaling, which is error-prone

Example of the bug:
```
Browser iframe: 720x528 (scaled to fit)
Godot viewport: 720x1280 (internal)
User clicks at Y=455 (displayed) → should be Y=455*(1280/528)=1103 in Godot
But we were passing Y=455 directly → wrong coordinates
```

## The Solution

**Let Godot handle input natively.**

Godot knows:
- Its own viewport size (720x1280)
- The canvas transform (scaling, camera position, zoom)
- How to convert screen coordinates to world coordinates

### Architecture

```
[Browser Touch Event]
        ↓
[Godot iframe receives event]
        ↓
[GameBridge._input() in GDScript]
        ↓
[Convert screen→world using canvas_transform]
        ↓
[Convert world→game using godot_to_game_pos()]
        ↓
[Emit event via _notify_js_input_event()]
        ↓
[React receives via bridge.onInputEvent()]
        ↓
[React handles game logic (joints, etc.)]
```

### Key Changes

#### 1. GameBridge.gd - Input Handler

```gdscript
var _is_dragging: bool = false
var _drag_entity_id: Variant = null

func _input(event: InputEvent) -> void:
    if not OS.has_feature("web"):
        return
    
    if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
        var screen_pos = event.position
        # CORRECT: Use canvas transform to convert screen→world
        var world_pos = get_viewport().get_canvas_transform().affine_inverse() * screen_pos
        var game_pos = godot_to_game_pos(world_pos)
        
        if event.pressed:
            # Hit detection using world_pos
            var hit_entity_id = _do_raycast(world_pos)
            _is_dragging = true
            _drag_entity_id = hit_entity_id
            _notify_js_input_event("drag_start", game_pos.x, game_pos.y, hit_entity_id)
        else:
            _is_dragging = false
            _notify_js_input_event("drag_end", game_pos.x, game_pos.y, _drag_entity_id)
            _drag_entity_id = null
    
    elif event is InputEventMouseMotion and _is_dragging:
        var screen_pos = event.position
        var world_pos = get_viewport().get_canvas_transform().affine_inverse() * screen_pos
        var game_pos = godot_to_game_pos(world_pos)
        _notify_js_input_event("drag_move", game_pos.x, game_pos.y, _drag_entity_id)
```

#### 2. React Component - Listen to Events

```tsx
// DON'T intercept touches in React
<View className="flex-1">
  <GodotView style={{ flex: 1 }} />  {/* No pointerEvents: "none" */}
</View>

// DO listen to Godot's processed events
useEffect(() => {
  if (!bridge || status !== "ready") return;

  const unsubscribe = bridge.onInputEvent(async (type, x, y, entityId) => {
    if (type === "drag_start" && entityId?.startsWith("cube")) {
      const jointId = await bridge.createMouseJointAsync({ ... });
      dragStateRef.current = { entityId, jointId };
    } else if (type === "drag_move") {
      bridge.setMouseTarget(dragStateRef.current.jointId, { x, y });
    } else if (type === "drag_end") {
      bridge.destroyJoint(dragStateRef.current.jointId);
    }
  });

  return unsubscribe;
}, [bridge, status]);
```

## Event Types

| Event | Description | Payload |
|-------|-------------|---------|
| `drag_start` | Mouse/touch down | `(x, y, entityId)` - entityId is hit entity or null |
| `drag_move` | Mouse/touch move while dragging | `(x, y, entityId)` - same entity as drag_start |
| `drag_end` | Mouse/touch up | `(x, y, entityId)` |
| `tap` | Quick tap (no drag) | `(x, y, entityId)` |

Coordinates are in **game world space** (meters, Y-up).

## Benefits

1. **Correct by construction**: Godot handles its own coordinate systems
2. **No manual scaling**: Works regardless of browser window size
3. **Cleaner separation**: Godot does input, React does game logic
4. **Simpler React code**: No touch responders, no coordinate math

## Native Platform Considerations

On native (iOS/Android via react-native-godot):
- The view is typically full-screen
- JSI worklets may need different handling
- May need `sendInput()` bridge method for some cases
- TODO: Test and document native-specific patterns

## Files Modified

- `godot_project/scripts/GameBridge.gd` - Input handling with proper coordinate conversion
- `app/app/examples/draggable_cubes.tsx` - Example using this pattern

## Related

- `docs/godot/GAP_ANALYSIS.md` - Overall Godot integration status
- `INPUT_EVENT_FLOW.md` - Detailed event flow documentation
