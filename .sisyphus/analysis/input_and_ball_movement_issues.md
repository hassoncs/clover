# Input & Ball Movement Analysis: Breakout Bouncer

## Executive Summary

**Two critical issues identified:**

1. **INPUT MISMATCH**: `GodotBridge.native.ts` sends input with incorrect argument format
2. **BALL NOT MOVING**: `initialVelocity` is applied but may not persist due to async entity creation on native

---

## Issue 1: Input Format Mismatch

### The Problem

**GodotBridge.native.ts (line 794-795):**
```typescript
sendInput(type, data) {
  callGameBridge('send_input', type, data.x, data.y, data.entityId ?? '');
}
```

**GodotBridge.web.ts (line 405-406):**
```typescript
sendInput(type, data) {
  getGodotBridge()?.sendInput(type, data.x, data.y, data.entityId ?? '');
}
```

Both implementations call `send_input` with **4 separate arguments**: `type, x, y, entityId`

### GameBridge.gd Expectation

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

✅ **This MATCHES** - expects 4 args in an Array: `[type, x, y, entityId]`

### Native Bridge Call Chain

**GodotBridge.native.ts (line 60-79):**
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
          method.apply(gameBridge, args);  // ← APPLIES ARGS DIRECTLY
        }
      }
    });
  });
}
```

**CRITICAL ISSUE**: `method.apply(gameBridge, args)` passes args as **individual parameters**, NOT as an Array!

### What Actually Happens

When `callGameBridge('send_input', type, x, y, entityId)` is called:
- `args = [type, x, y, entityId]`
- `method.apply(gameBridge, args)` calls: `send_input(type, x, y, entityId)`
- But GDScript expects: `_js_send_input([type, x, y, entityId])`

**The native bridge is calling the wrong method signature!**

### The Fix Required

The native bridge needs to wrap args in an Array before calling the GDScript method:

```typescript
function callGameBridge(methodName: string, ...args: unknown[]) {
  // ... existing code ...
  runOnGodotThread(() => {
    'worklet';
    const Godot = RTNGodot.API();
    const gameBridge = Godot.Engine.get_main_loop().get_root().get_node('GameBridge');
    if (gameBridge) {
      const method = gameBridge[methodName];
      if (typeof method === 'function') {
        // WRAP ARGS IN ARRAY FOR GDSCRIPT
        method.apply(gameBridge, [args]);  // ← Pass as single Array argument
      }
    }
  });
}
```

---

## Issue 2: Ball Not Moving (initialVelocity)

### The Setup

**breakoutBouncer.ts (line 50):**
```typescript
initialVelocity: { x: 3, y: -6 }
```

**breakoutBouncer.ts (line 188-193):**
```typescript
{
  id: "ball",
  name: "Ball",
  template: "ball",
  transform: { x: 5, y: 15, angle: 0, scaleX: 1, scaleY: 1 },
}
```

### How initialVelocity is Applied

**GameBridge.gd (line 710-714):**
```gdscript
# Apply initial velocity if specified
var initial_vel = physics_data.get("initialVelocity", null)
if initial_vel != null:
  # Store for deferred application (must be applied after body is in scene tree)
  rigid.set_meta("_initial_velocity", Vector2(initial_vel.get("x", 0), initial_vel.get("y", 0)) * pixels_per_meter)
```

**GameBridge.gd (line 618-622):**
```gdscript
# Apply initial velocity now that the body is in the scene tree
if node is RigidBody2D and node.has_meta("_initial_velocity"):
  var initial_vel = node.get_meta("_initial_velocity") as Vector2
  node.linear_velocity = initial_vel
  node.remove_meta("_initial_velocity")
```

### The Problem on Native

**Timing Issue:**

1. `_create_entity()` is called from `load_game_json()`
2. Entity is created and added to scene tree
3. `initialVelocity` is applied in `_create_entity()` after `add_child()`
4. **BUT** on native, `callGameBridge()` is **async** (uses `runOnGodotThread()`)

**GodotBridge.native.ts (line 336-339):**
```typescript
async loadGame(definition: GameDefinition) {
  const jsonString = JSON.stringify(definition);
  callGameBridge('load_game_json', jsonString);  // ← ASYNC, NO AWAIT
}
```

**The native bridge doesn't wait for `load_game_json` to complete!**

### Sequence on Native

```
1. TypeScript: bridge.loadGame(def) called
2. TypeScript: callGameBridge('load_game_json', ...) queued (async)
3. TypeScript: loadGame() returns immediately
4. Godot: load_game_json() starts executing (on Godot thread)
5. Godot: _create_entity() called
6. Godot: initialVelocity applied
7. Godot: entity added to scene
```

**This should work**, but there's a potential race condition:

- If the physics engine hasn't fully initialized the body by the time `linear_velocity` is set, it might be ignored
- The body might not be in the physics world yet

### Verification Needed

Check if:
1. The ball entity is actually being created (check logs)
2. The `initialVelocity` metadata is being set
3. The velocity is being applied after the body is in the scene tree
4. The physics engine is actually simulating the body

---

## Breakout Bouncer Paddle Move Rule

**breakoutBouncer.ts (line 238-245):**
```typescript
{
  id: "paddle_move",
  name: "Drag paddle",
  trigger: { type: "drag", phase: "move" },
  actions: [
    { type: "move", target: { type: "by_tag", tag: "paddle" }, direction: "toward_touch_x", speed: 20 },
  ],
}
```

This rule depends on:
1. **Input events being received** (which requires `sendInput` to work)
2. **Rule engine processing drag events** (which requires game engine to handle them)
3. **Move action being applied** (which requires entity movement logic)

**If input isn't working, the paddle won't move.**

---

## Recommendations

### Priority 1: Fix Input Format (BLOCKING)

The native bridge's `callGameBridge()` function needs to wrap arguments in an Array:

```typescript
// In GodotBridge.native.ts, modify callGameBridge():
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
          // CRITICAL: Wrap args in Array for GDScript callback signature
          method.apply(gameBridge, [args]);
        }
      }
    });
  });
}
```

### Priority 2: Verify Ball Movement

Add logging to GameBridge.gd to verify:
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

### Priority 3: Test Input Flow

Once input is fixed, test the full flow:
1. Drag on screen
2. Verify `_js_send_input()` is called with correct args
3. Verify paddle moves toward touch position
4. Verify ball bounces off paddle

---

## Summary Table

| Issue | Location | Severity | Status |
|-------|----------|----------|--------|
| Input args not wrapped in Array | `GodotBridge.native.ts:60-79` | **CRITICAL** | Unfixed |
| Ball initialVelocity may not apply | `GameBridge.gd:618-622` | **HIGH** | Needs verification |
| Paddle move rule depends on input | `breakoutBouncer.ts:238-245` | **HIGH** | Blocked by input fix |

