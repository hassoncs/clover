# Input Event Flow: Game Engine to JavaScript

## Overview

Input events flow from the Godot game engine through the bridge to JavaScript/React. The system supports multiple input types (tap, drag, tilt) and includes entity hit detection.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Godot Game Engine                         │
│  (GameBridge.gd - Main.gd input handling)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Input Event (JSON)
                     │ {"type": "tap", "x": 5.0, "y": 3.2, "entityId": "ball"}
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Bridge Layer (Platform-Specific)                │
│  ├─ GodotBridge.web.ts (Web/WASM)                           │
│  └─ GodotBridge.native.ts (iOS/Android)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Parsed Input Event
                     │ (type, x, y, entityId)
                     │
┌────────────────────▼────────────────────────────────────────┐
│              React Components                                │
│  GameRuntime.godot.tsx - Processes input via rules engine   │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Flow

### 1. **Godot Side: Input Detection** (`GameBridge.gd`)

#### Entry Points:
- **`send_input(input_type, x, y, entity_id)`** - Called from JS via bridge
- **`_js_send_input(args)`** - JavaScript callback wrapper
- **`Main.gd`** - Native Godot input handling (mouse/touch)

#### Code (GameBridge.gd, lines 455-500):
```gdscript
func send_input(input_type: String, x: float, y: float, entity_id: String = "") -> void:
	if input_type == "tap":
		var hit_entity_id: Variant = null
		var point = Vector2(x, y) * pixels_per_meter
		var space = get_viewport().find_world_2d().direct_space_state
		if space:
			var query = PhysicsPointQueryParameters2D.new()
			query.position = point
			query.collision_mask = 0xFFFFFFFF
			query.collide_with_bodies = true
			query.collide_with_areas = true
			var results = space.intersect_point(query, 1)
			if results.size() > 0:
				var collider = results[0].collider
				if collider and collider.name in entities:
					hit_entity_id = collider.name
		_queue_event("input", {"type": input_type, "x": x, "y": y, "entityId": hit_entity_id})
		_notify_js_input_event(input_type, x, y, hit_entity_id)
```

**Key Operations:**
1. Receives input type, world coordinates (x, y), and optional entity_id
2. For "tap" events: performs **physics point query** to detect which entity was hit
3. Queues event for event system
4. Notifies JavaScript via callback

### 2. **Godot → JavaScript Bridge** (`GameBridge.gd`, lines 506-517)

#### Function: `_notify_js_input_event()`
```gdscript
func _notify_js_input_event(input_type: String, x: float, y: float, entity_id: Variant) -> void:
	print("[GameBridge] _notify_js_input_event: type=", input_type, " callback=", _js_input_event_callback)
	if _js_input_event_callback != null:
		var data = {
			"type": input_type,
			"x": x,
			"y": y,
			"entityId": entity_id
		}
		var json_str = JSON.stringify(data)
		print("[GameBridge] Calling input callback with: ", json_str)
		_js_input_event_callback.call("apply", null, [json_str])
```

**What Happens:**
1. Creates a dictionary with input data
2. Converts to JSON string: `{"type":"tap","x":5.0,"y":3.2,"entityId":"ball"}`
3. Calls the JavaScript callback with the JSON string

#### Callback Registration (`GameBridge.gd`, lines 502-504):
```gdscript
func _js_on_input_event(args: Array) -> void:
	if args.size() >= 1:
		_js_input_event_callback = args[0]
```

The callback is registered when the bridge initializes (line 183):
```gdscript
_js_bridge_obj["onInputEvent"] = on_input_event_cb
```

### 3. **Web Bridge: Receiving Input** (`GodotBridge.web.ts`, lines 283-297)

#### Setup (lines 283-297):
```typescript
godotBridge.onInputEvent((jsonStr: unknown) => {
  console.log('[GodotBridge.web] onInputEvent received:', jsonStr, 'type:', typeof jsonStr);
  try {
    const data = JSON.parse(jsonStr as string) as {
      type: string;
      x: number;
      y: number;
      entityId: string | null;
    };
    console.log('[GodotBridge.web] onInputEvent parsed:', data);
    for (const cb of inputEventCallbacks) cb(data.type, data.x, data.y, data.entityId);
  } catch (err) {
    console.warn('[GodotBridge.web] Failed to parse input event data:', jsonStr, err);
  }
});
```

**Error Handling:**
- **Error Message**: `"[GodotBridge.web] Failed to parse input event data:"`
- **Cause**: JSON parsing fails if Godot sends malformed data
- **Recovery**: Logs warning, continues execution

#### Callback Registration (lines 632-638):
```typescript
onInputEvent(
  callback: (type: string, x: number, y: number, entityId: string | null) => void,
): () => void {
  inputEventCallbacks.push(callback);
  return () => {
    const index = inputEventCallbacks.indexOf(callback);
    if (index >= 0) inputEventCallbacks.splice(index, 1);
  };
}
```

**Key Points:**
- Maintains array of callbacks
- Returns unsubscribe function
- Supports multiple listeners

### 4. **Native Bridge: Receiving Input** (`GodotBridge.native.ts`, lines 898-904)

```typescript
onInputEvent(callback: (type: string, x: number, y: number, entityId: string | null) => void): () => void {
  inputEventCallbacks.push(callback);
  return () => {
    const index = inputEventCallbacks.indexOf(callback);
    if (index >= 0) inputEventCallbacks.splice(index, 1);
  };
}
```

**Difference from Web:**
- Native uses event polling system (`pollAndDispatchEvents`)
- Events are queued in Godot and polled by JavaScript
- Same callback interface as web

### 5. **React Component: Processing Input** (`GameRuntime.godot.tsx`, lines 203-214)

```typescript
inputEventUnsubRef.current = bridge.onInputEvent((type, x, y, _entityId) => {
  if (type === "tap") {
    const ppm = definition.world.pixelsPerMeter ?? 50;
    const screenX = x * ppm;
    const screenY = y * ppm;
    console.log('[GameRuntime] onInputEvent tap received:', { x, y, screenX, screenY });
    inputRef.current = {
      ...inputRef.current,
      tap: { x: screenX, y: screenY, worldX: x, worldY: y },
    };
  }
});
```

**Processing:**
1. Receives input event from bridge
2. Converts world coordinates to screen coordinates (multiply by pixelsPerMeter)
3. Stores in `inputRef` for game rules engine
4. Rules engine processes input via triggers like `{ type: "tap" }`

---

## Data Flow Example: Bouncing Balls Game

### Scenario: User taps on the ball spawner

**1. Godot Input (Main.gd)**
```gdscript
# User taps at screen position (500, 200)
var mouse_pos = get_local_mouse_position()
var world_pos = mouse_pos / GameBridge.pixels_per_meter
GameBridge.send_input("tap", world_pos.x, world_pos.y)
```

**2. GameBridge Processing**
```gdscript
# send_input() called with:
# - input_type: "tap"
# - x: 10.0 (world coords)
# - y: 4.0 (world coords)

# Physics query finds entity at that position
# Result: hit_entity_id = "spawner"

# Notify JS with JSON:
# {"type":"tap","x":10.0,"y":4.0,"entityId":"spawner"}
```

**3. Bridge Callback (GodotBridge.web.ts)**
```typescript
// Receives JSON string from Godot
// Parses to: { type: "tap", x: 10.0, y: 4.0, entityId: "spawner" }
// Calls all registered callbacks with: ("tap", 10.0, 4.0, "spawner")
```

**4. GameRuntime Processing**
```typescript
// Receives: type="tap", x=10.0, y=4.0, entityId="spawner"
// Converts to screen coords: screenX = 10.0 * 50 = 500, screenY = 200
// Stores in inputRef.current.tap = { x: 500, y: 200, worldX: 10.0, worldY: 4.0 }
```

**5. Rules Engine Execution**
```typescript
// Rule trigger: { type: "tap" }
// Action: { type: "spawn", template: "bouncyBall", position: { type: "at_self" } }
// Spawns ball at spawner position
```

---

## Bouncing Balls Game: Input Usage

### Game Definition (bouncingBalls.ts)

**Spawner Template (lines 84-101):**
```typescript
ballSpawner: {
  id: "ballSpawner",
  tags: ["spawner"],
  sprite: { type: "rect", width: 2, height: 0.3, color: "#666666" },
  physics: {
    bodyType: "kinematic",
    shape: "box",
    width: 2,
    height: 0.3,
    density: 0,
    friction: 0,
    restitution: 0,
    isSensor: true,
  },
  behaviors: [
    { type: "spawn_on_event", event: "tap", entityTemplate: "bouncyBall", spawnPosition: "at_self" },
  ],
}
```

**Rules (lines 118-127):**
```typescript
rules: [
  {
    id: "move_spawner",
    name: "Drag Spawner",
    trigger: { type: "drag", phase: "move" },
    actions: [
      { type: "move", target: { type: "by_tag", tag: "spawner" }, direction: "toward_touch_x", speed: 20 },
    ],
  },
]
```

**Input Flow in Bouncing Balls:**
1. User drags spawner → `drag` event with `phase: "move"` → moves spawner left/right
2. User taps → `tap` event → spawns ball at spawner position
3. Ball falls and hits ground → collision triggers score

---

## Key Data Structures

### Input Event JSON (Godot → JS)
```json
{
  "type": "tap" | "drag" | "tilt",
  "x": number,           // World coordinates (meters)
  "y": number,           // World coordinates (meters)
  "entityId": string | null  // Hit entity ID or null
}
```

### Input Event Callback Signature
```typescript
(type: string, x: number, y: number, entityId: string | null) => void
```

### Stored Input State (GameRuntime)
```typescript
inputRef.current = {
  tap?: { x: number, y: number, worldX: number, worldY: number },
  drag?: { x: number, y: number, worldX: number, worldY: number, phase: "start" | "move" | "end" },
  tilt?: { x: number, y: number, z: number },
}
```

---

## Error Handling

### Parse Error
**Location**: `GodotBridge.web.ts`, line 295
```typescript
console.warn('[GodotBridge.web] Failed to parse input event data:', jsonStr, err);
```

**Causes:**
- Godot sends non-JSON string
- Malformed JSON structure
- Missing required fields

**Recovery:**
- Error is logged but doesn't crash
- Other callbacks continue to execute
- Game continues running

### Missing Callback
**Location**: `GameBridge.gd`, line 507
```gdscript
if _js_input_event_callback != null:
  # Only notify if callback is registered
```

**Behavior:**
- If callback not registered, input is silently ignored
- Callback is registered during bridge initialization

---

## Coordinate System

### World Coordinates (Godot)
- Measured in **meters**
- Origin at top-left
- Y increases downward
- Used in physics calculations

### Screen Coordinates (React)
- Measured in **pixels**
- Conversion: `screenCoord = worldCoord * pixelsPerMeter`
- Used for UI and rendering

### Conversion in GameRuntime
```typescript
const ppm = definition.world.pixelsPerMeter ?? 50;
const screenX = x * ppm;
const screenY = y * ppm;
```

---

## Summary

| Component | Role | Key File |
|-----------|------|----------|
| **Godot Engine** | Detects input, performs hit detection | `GameBridge.gd` (lines 455-517) |
| **Bridge (Web)** | Receives JSON, parses, dispatches callbacks | `GodotBridge.web.ts` (lines 283-297) |
| **Bridge (Native)** | Polls events from Godot, dispatches callbacks | `GodotBridge.native.ts` (lines 898-904) |
| **GameRuntime** | Converts coords, stores input state | `GameRuntime.godot.tsx` (lines 203-214) |
| **Rules Engine** | Processes input via game rules | `GameRuntime.godot.tsx` (game loop) |

**Input Flow Summary:**
1. User interacts with screen
2. Godot detects input + performs hit detection
3. Godot sends JSON to JavaScript
4. Bridge parses JSON and calls registered callbacks
5. GameRuntime stores input state
6. Rules engine processes input via triggers
7. Game responds with actions (spawn, move, etc.)
