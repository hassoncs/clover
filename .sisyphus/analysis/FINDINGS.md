# Analysis Findings: Input & Ball Movement Issues

## Overview

Analyzed the input logic in Breakout Bouncer and traced the flow through GodotBridge (native/web) to GameBridge.gd. Identified **one critical bug** and **one potential issue**.

---

## Finding 1: CRITICAL - Input Format Mismatch (Native Only)

### Issue
The native bridge's `callGameBridge()` function passes arguments **directly** to GDScript methods, but GDScript callbacks expect arguments **wrapped in an Array**.

### Root Cause
**GodotBridge.native.ts (line 60-79):**
```typescript
function callGameBridge(methodName: string, ...args: unknown[]) {
  // ...
  runOnGodotThread(() => {
    const method = gameBridge[methodName];
    if (typeof method === 'function') {
      method.apply(gameBridge, args);  // ← WRONG: passes args as individual params
    }
  });
}
```

When `callGameBridge('send_input', type, x, y, entityId)` is called:
- `args = [type, x, y, entityId]`
- `method.apply(gameBridge, args)` calls: `send_input(type, x, y, entityId)` ← 4 params
- But GDScript expects: `_js_send_input([type, x, y, entityId])` ← 1 Array param

### Impact
- **Paddle won't move** when dragging (no input events processed)
- **Any rule triggered by input** (tap, drag, tilt) will fail
- **Web version works fine** (uses direct JS method calls, not GDScript callbacks)

### Evidence
**GameBridge.gd (line 360-366):**
```gdscript
func _js_send_input(args: Array) -> void:
	if args.size() < 4:
		return
	var input_type = str(args[0])
	var x = float(args[1])
	var y = float(args[2])
	var provided_entity_id = str(args[3]) if args[3] != null else ""
```

The method signature expects `args: Array` with 4 elements, but native is passing 4 separate arguments.

### Fix
Wrap args in an Array before calling the GDScript method:

```typescript
function callGameBridge(methodName: string, ...args: unknown[]) {
  if (isDisposing || !isGodotInitialized) return;
  
  getGodotModule().then(({ RTNGodot, runOnGodotThread }) => {
    if (isDisposing) return;
    runOnGodotThread(() => {
      'worklet';
      const Godot = RTNGodot.API();
      const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge');
      if (gameBridge) {
        const method = gameBridge[methodName];
        if (typeof method === 'function') {
          method.apply(gameBridge, [args]);  // ← FIXED: wrap in Array
        }
      }
    });
  });
}
```

---

## Finding 2: Ball Not Moving - initialVelocity Application

### Issue
Ball has `initialVelocity: { x: 3, y: -6 }` defined but doesn't move on startup.

### How It Should Work

**GameBridge.gd (line 710-714):**
```gdscript
var initial_vel = physics_data.get("initialVelocity", null)
if initial_vel != null:
  rigid.set_meta("_initial_velocity", Vector2(initial_vel.get("x", 0), initial_vel.get("y", 0)) * pixels_per_meter)
```

**GameBridge.gd (line 618-622):**
```gdscript
if node is RigidBody2D and node.has_meta("_initial_velocity"):
  var initial_vel = node.get_meta("_initial_velocity") as Vector2
  node.linear_velocity = initial_vel
  node.remove_meta("_initial_velocity")
```

The code **looks correct** - it stores velocity in metadata during body creation, then applies it after the body is added to the scene tree.

### Potential Issues

1. **Async execution on native**: `loadGame()` doesn't await the Godot thread execution
   - But this shouldn't matter since velocity is applied in the same Godot frame

2. **Physics body not initialized**: The RigidBody2D might not be fully initialized by the physics engine when velocity is set
   - Godot 4 should handle this, but worth verifying

3. **Gravity is zero**: `breakoutBouncer.ts` has `gravity: { x: 0, y: 0 }`
   - Ball should still move with initial velocity even with zero gravity

### Verification Needed

Add logging to GameBridge.gd to confirm:
1. `initialVelocity` is being read from physics_data
2. Metadata is being set on the RigidBody2D
3. Velocity is being applied after add_child()

```gdscript
# In _create_entity(), after add_child():
if node is RigidBody2D and node.has_meta("_initial_velocity"):
  var initial_vel = node.get_meta("_initial_velocity") as Vector2
  print("[GameBridge] Applying initial velocity to %s: %s" % [entity_id, initial_vel])
  node.linear_velocity = initial_vel
  node.remove_meta("_initial_velocity")
```

### Most Likely Cause
**The input bug (Finding 1) is preventing the game from running properly.** Once input is fixed, the ball movement should be testable.

---

## Breakout Bouncer Paddle Move Rule

**Rule Definition:**
```typescript
{
  id: "paddle_move",
  trigger: { type: "drag", phase: "move" },
  actions: [
    { type: "move", target: { type: "by_tag", tag: "paddle" }, direction: "toward_touch_x", speed: 20 },
  ],
}
```

**Dependencies:**
1. Input events must be received (`sendInput` must work)
2. Rule engine must process drag events
3. Move action must be applied to paddle

**Status:** Blocked by input bug (Finding 1)

---

## Comparison: Native vs Web

| Component | Native | Web |
|-----------|--------|-----|
| `sendInput()` | ✅ Correct signature | ✅ Correct signature |
| `callGameBridge()` | ❌ **Args not wrapped** | N/A (uses direct JS calls) |
| `_js_send_input()` | ❌ Receives wrong args | ✅ Receives correct args |
| Input events | ❌ **BROKEN** | ✅ Works |
| Ball movement | ❌ Can't test (input broken) | ✅ Should work |

---

## Action Items

### Priority 1: Fix Input (BLOCKING)
- [ ] Modify `callGameBridge()` in `GodotBridge.native.ts` to wrap args in Array
- [ ] Test paddle movement with drag input
- [ ] Verify all input-triggered rules work

### Priority 2: Verify Ball Movement
- [ ] Add logging to GameBridge.gd to confirm initialVelocity is applied
- [ ] Run Breakout Bouncer and check if ball moves on startup
- [ ] If not moving, investigate physics body initialization

### Priority 3: Test Full Game Flow
- [ ] Load Breakout Bouncer on native
- [ ] Drag paddle left/right
- [ ] Verify ball bounces off paddle
- [ ] Verify bricks are destroyed on collision
- [ ] Verify score increases

---

## Files Affected

| File | Issue | Line(s) |
|------|-------|---------|
| `app/lib/godot/GodotBridge.native.ts` | Input args not wrapped | 60-79 |
| `godot_project/scripts/GameBridge.gd` | Expects Array args | 360-366 |
| `app/lib/test-games/games/breakoutBouncer.ts` | Uses paddle_move rule | 238-245 |

