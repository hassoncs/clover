# Phase 1 Execution Plan — Draw-During-Animation via Scene Graph

## Goal

Fix the paint example so drawing works while the shader is running, using Godot-native `Line2D`/`Sprite2D` scene-graph nodes instead of CPU pixel blitting.

## Task Dependency Graph

```
Wave 1 (parallel, no dependencies):
├── Task 1: PingPongManager draw containers
└── Task 3: PixelBufferManager normalized coords

Wave 2 (parallel, after Wave 1):
├── Task 2: GraphExecutor frame cleanup          (needs Task 1)
├── Task 4: GameBridgeEffects draw routing        (needs Task 1 + 3)
└── Task 5: Bake-on-stop cleanup                  (needs Task 1)

Wave 3 (after Wave 2):
└── Task 6: TypeScript bridge + paint example     (needs Task 4)

Wave 4 (after Wave 3):
└── Task 7: End-to-end verification               (needs all)

Critical path: Task 1 → Task 4 → Task 6 → Task 7
```

---

## Wave 1 — Foundation (Parallel)

### Task 1: PingPongManager Draw Containers

**Category**: `quick` | **Skills**: `game-authoring` | **File**: `godot_project/scripts/effects/PingPongManager.gd`

**What to do**:

1. In `initialize()`, after adding viewport_a/viewport_b to `_host`, create `Node2D` draw containers as children of each viewport:
   ```gdscript
   var draw_container_a := Node2D.new()
   draw_container_a.name = "DrawContainer"
   viewport_a.add_child(draw_container_a)
   var draw_container_b := Node2D.new()
   draw_container_b.name = "DrawContainer"
   viewport_b.add_child(draw_container_b)
   ```
   Store in entry: `entry["draw_container_a"] = draw_container_a`, `entry["draw_container_b"] = draw_container_b`

2. Add coordinate helpers:
   ```gdscript
   func _normalized_to_viewport(uv: Vector2, viewport_size: Vector2i) -> Vector2:
       return Vector2(uv.x * float(viewport_size.x), uv.y * float(viewport_size.y))

   func _normalized_width_to_pixels(width_norm: float, viewport_size: Vector2i) -> float:
       return width_norm * float(viewport_size.y)  # relative to HEIGHT

   func _parse_flat_points(flat: Array, viewport_size: Vector2i) -> PackedVector2Array:
       var result := PackedVector2Array()
       result.resize(flat.size() / 2)
       for i in range(0, flat.size(), 2):
           result[i / 2] = _normalized_to_viewport(
               Vector2(float(flat[i]), float(flat[i + 1])), viewport_size)
       return result
   ```

3. Add public methods:
   ```gdscript
   func add_stroke(buffer_id: String, flat_points: Array, color: Color, width_norm: float) -> void:
       # Get write viewport's draw container and size
       # Parse flat points, convert width
       # Create Line2D, set points/default_color/width, round cap/joint
       # Add to write draw container

   func add_stamp(buffer_id: String, uv: Vector2, texture: Texture2D, color: Color) -> void:
       # Get write viewport's draw container and size
       # Create Sprite2D at converted position, set texture/modulate
       # Add to write draw container

   func clear_draw_container(buffer_id: String) -> void:
       # Get WRITE draw container
       # For each child: remove_child(child) then child.queue_free()

   func get_draw_container(buffer_id: String) -> Node2D:
       # Return write viewport's draw container
   ```

   **Key**: `_get_write_draw_container(buffer_id)` helper that reads `write_index` to pick `draw_container_a` or `draw_container_b`.

4. In `_release_entry()`, also clean up draw containers (remove_child + queue_free).

**Acceptance criteria**:
- No GDScript parse errors
- `initialize()` creates draw_container_a and draw_container_b
- `add_stroke()` creates Line2D with correct viewport-space coords (width relative to height)
- `clear_draw_container()` uses `remove_child()` before `queue_free()`

---

### Task 3: PixelBufferManager Normalized Coords

**Category**: `quick` | **Skills**: `game-authoring` | **File**: `godot_project/scripts/bridge/PixelBufferManager.gd`

**What to do**:

1. Add `draw_commands_normalized(entity_id: String, commands: Array)`:
   - Get buffer entry, extract `width` and `height`
   - For each command:
     - `type == "stroke"`: extract `points` (flat `[x,y,x,y,...]`), `color`, `width`
       - Width in pixels: `max(1, int(width_norm * height))`
       - Walk consecutive point pairs, call existing `_draw_line()` with pixel coords for each segment
     - `type == "line"`: x1/y1/x2/y2 are normalized (0-1), convert to pixels
     - `type == "pixel"`: x/y normalized, convert to pixels
     - `type == "fill"`: pass through unchanged
   - After all commands, `texture.update(image)`

2. Add JS wrapper `_js_draw_commands_normalized(args: Array)`:
   - Same pattern as existing `_js_draw_commands`

3. Existing `draw_commands()` remains unchanged.

**Acceptance criteria**:
- No GDScript parse errors
- `draw_commands_normalized("canvas", [{type: "stroke", points: [0.5, 0.5, 0.6, 0.6], color: "#FF0000", width: 0.01}])` draws a visible line
- Existing `draw_commands()` still works with pixel coords
- Width uses image height (not width)

---

## Wave 2 — Integration (Parallel, after Wave 1)

### Task 2: GraphExecutor Frame Cleanup

**Category**: `quick` | **Skills**: `game-authoring` | **File**: `godot_project/scripts/effects/GraphExecutor.gd`

**What to do**:

In `_process()`, after `_ping_pong_manager.swap(ping_pong_buffer)` (around line 317), add:
```gdscript
_ping_pong_manager.clear_draw_container(ping_pong_buffer)
```

This clears the new write viewport's draw container (previously the read viewport — any draw nodes from 2 frames ago are stale and should be removed).

**Acceptance criteria**:
- `clear_draw_container` is called after `swap` in `_process()`
- No parse errors

---

### Task 4: GameBridgeEffects Draw Routing

**Category**: `quick` | **Skills**: `game-authoring` | **File**: `godot_project/scripts/bridge/GameBridgeEffects.gd`

**What to do**:

1. Add core routing method:
   ```gdscript
   func draw_to_active_buffer(entity_id: String, commands_json: String) -> void:
       var commands = JSON.parse_string(commands_json)
       if commands == null or not (commands is Array):
           return
       if graph_executor != null and graph_executor._state == EffectsGraphExecutor.State.RUNNING:
           _draw_to_ping_pong(commands)
       else:
           _draw_to_pixel_buffer(entity_id, commands)
   ```

2. Add `_draw_to_ping_pong(commands: Array)`:
   - Find the first ping-pong pass entry in `graph_executor._pass_entries`
   - For each command with `type == "stroke"`: call `graph_executor._ping_pong_manager.add_stroke(buffer_id, cmd.points, Color.from_string(cmd.color), cmd.width)`
   - For `type == "stamp"`: call `add_stamp()` similarly

3. Add `_draw_to_pixel_buffer(entity_id: String, commands: Array)`:
   - Forward to `_game_bridge._pixel_buffer_manager.draw_commands_normalized(entity_id, commands)`

4. Add JS callback `_js_draw_to_active_buffer(args: Array)`:
   ```gdscript
   func _js_draw_to_active_buffer(args: Array) -> void:
       if args.size() < 2:
           return
       draw_to_active_buffer(str(args[0]), str(args[1]))
   ```

5. Register in 3 places:
   - `_build_effects_method_map()`: `"draw_to_active_buffer": _js_draw_to_active_buffer`
   - `_setup_js_effects_bridge()`: create JS callback, assign to `bridge["drawToActiveBuffer"]`
   - `_register_query_handlers()`: register `"effects.drawToActiveBuffer"` handler

**Acceptance criteria**:
- When graph is RUNNING, draws create Line2D nodes in ping-pong viewport
- When graph is NOT RUNNING, draws go to PixelBufferManager (normalized path)
- Method is registered in all 3 places (method map, JS bridge, query handler)

---

### Task 5: Bake-on-Stop Cleanup

**Category**: `quick` | **Skills**: `game-authoring` | **File**: `godot_project/scripts/bridge/GameBridgeEffects.gd`

**What to do**:

1. Add helper:
   ```gdscript
   func _clear_all_draw_containers() -> void:
       if graph_executor == null or graph_executor._ping_pong_manager == null:
           return
       for entry in graph_executor._pass_entries:
           var buffer_id: String = str(entry.get("ping_pong_buffer", ""))
           if buffer_id != "":
               graph_executor._ping_pong_manager.clear_draw_container(buffer_id)
   ```

2. Update `stop_graph()`:
   ```gdscript
   func stop_graph() -> void:
       _clear_all_draw_containers()
       _bake_output_to_entity()
       if graph_executor:
           graph_executor.stop()
   ```

**Acceptance criteria**:
- Draw containers are cleared before bake
- No orphaned Line2D nodes after stop

---

## Wave 3 — TypeScript (after Wave 2)

### Task 6: TypeScript Bridge + Paint Example

**Category**: `quick` | **Skills**: `game-authoring` | **Files**: See below

**What to do**:

#### 6a. Types (`app/lib/godot/types.ts`)

Add normalized draw command type:
```typescript
export type NormalizedDrawCommand =
  | { type: 'stroke'; points: number[]; color: string; width: number }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; width?: number }
  | { type: 'pixel'; x: number; y: number; color: string }
  | { type: 'fill'; color: string };
```

Add to `GodotBridge` interface:
```typescript
drawToActiveBuffer(entityId: string, commands: NormalizedDrawCommand[]): void;
```

#### 6b. Web bridge (`app/lib/godot/GodotBridge.web.ts`)

In `GodotBridgeCallbacks` interface, add:
```typescript
drawToActiveBuffer: (entityId: string, commandsJson: string) => void;
```

Add implementation method (follows `pixelBufferDraw` pattern):
```typescript
drawToActiveBuffer(entityId: string, commands: NormalizedDrawCommand[]) {
  getGodotBridge()?.drawToActiveBuffer(entityId, JSON.stringify(commands));
},
```

#### 6c. Native bridge (`app/lib/godot/GodotBridge.native.ts`)

Add implementation using `callGameBridge` (follows `pixelBufferDraw` pattern on line 821):
```typescript
drawToActiveBuffer(entityId: string, commands: NormalizedDrawCommand[]) {
  callGameBridge('draw_to_active_buffer', entityId, JSON.stringify(commands));
},
```

**Note**: On native, `pixelBufferDraw` uses `callGameBridge` (goes through GameBridge.gd method map). The effects bridge also has methods in that map (line 149 of GameBridgeEffects.gd `native_dispatch`). The `_build_effects_method_map()` already contains the new method from Task 4, and `GameBridge.gd` delegates to `GameBridgeEffects.native_dispatch()` for unknown methods. So `callGameBridge('draw_to_active_buffer', ...)` will route correctly.

#### 6d. Mock (`app/lib/godot/__tests__/mock-godot-bridge.ts`)

Add: `drawToActiveBuffer: vi.fn(),`

#### 6e. Paint example (`app/app/examples/paint.tsx`)

- Add `worldToNormalized` helper converting world coords to 0-1:
  ```typescript
  const worldToNormalized = (wx: number, wy: number) => ({
    x: (wx - worldBounds.left) / (worldBounds.right - worldBounds.left),
    y: (worldBounds.top - wy) / (worldBounds.top - worldBounds.bottom),
  });
  ```
  (Exact bounds depend on the paint example's world setup — read the file to find the actual values.)

- Update brush sizes to normalized (relative to viewport height):
  ```typescript
  const BRUSH_SIZES = [
    { label: "S", size: 0.004 },
    { label: "M", size: 0.012 },
    { label: "L", size: 0.024 },
  ];
  ```

- In the input/touch handler, build `stroke` commands with flat point arrays:
  ```typescript
  const p1 = worldToNormalized(start.x, start.y);
  const p2 = worldToNormalized(x, y);
  bridge.drawToActiveBuffer("canvas", [{
    type: "stroke",
    points: [p1.x, p1.y, p2.x, p2.y],
    color: currentColor,
    width: currentBrushSize,
  }]);
  ```

- Remove old `bridge.pixelBufferDraw()` call for drawing (keep it for initial `fill` if used).

**Acceptance criteria**:
- `pnpm tsc --noEmit` passes (in `shared/` and `app/`)
- `NormalizedDrawCommand` type exported from types.ts
- `drawToActiveBuffer` exists on GodotBridge interface, web impl, native impl, mock
- Paint example uses normalized coords + `drawToActiveBuffer`

---

## Wave 4 — Verification

### Task 7: End-to-End Verification

**Category**: `quick` | **Skills**: `verification-before-completion`, `dev-browser`

**Test plan**:

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Draw on canvas (shader stopped) | Strokes visible via PixelBufferManager |
| 2 | Start "Spread" shader | Existing drawing seeds into ping-pong, shader runs |
| 3 | Draw while shader running | New strokes appear and are processed by shader |
| 4 | Stop shader | Evolved state bakes to pixel buffer |
| 5 | Draw after stop | Strokes draw on top of baked content |
| 6 | Start shader again | Re-seeds from current pixel buffer |
| 7 | Test Melt, Swirl, Rainbow shaders | All work with draw-during-animation |
| 8 | Clear canvas while running | Canvas clears, shader continues on empty |

**Verification commands**:
```bash
# TypeScript type check
cd /Users/hassoncs/Workspaces/Personal/slopcade && pnpm tsc --noEmit

# Start dev server
pnpm dev

# Open paint example in browser and run through test plan
```

**Acceptance criteria**:
- All 8 scenarios pass
- No console errors
- No visual artifacts (flashes, orphaned nodes, coordinate misalignment)
- `pnpm tsc --noEmit` clean

---

## Execution Commands

```
# Wave 1 — fire in parallel
task(category="quick", load_skills=["game-authoring"], prompt="<Task 1 prompt>", run_in_background=true)
task(category="quick", load_skills=["game-authoring"], prompt="<Task 3 prompt>", run_in_background=true)

# Wave 2 — after Wave 1, fire in parallel
task(category="quick", load_skills=["game-authoring"], prompt="<Task 2 prompt>", run_in_background=true)
task(category="quick", load_skills=["game-authoring"], prompt="<Task 4 prompt>", run_in_background=true)
task(category="quick", load_skills=["game-authoring"], prompt="<Task 5 prompt>", run_in_background=true)

# Wave 3 — after Wave 2
task(category="quick", load_skills=["game-authoring"], prompt="<Task 6 prompt>")

# Wave 4 — after Wave 3
task(category="quick", load_skills=["verification-before-completion", "dev-browser"], prompt="<Task 7 prompt>")
```

## Commit Strategy

Single squashed commit when all passes:
```
feat(effects): Phase 1 — draw during animation via scene graph

Replace CPU pixel blitting (Image.set_pixel + ImageTexture.update) with
Godot-native Line2D/Sprite2D scene-graph nodes for drawing into ping-pong
viewports while shaders are running.

- Add draw containers (Node2D) to PingPongManager viewports
- Add normalized coordinate bridge (0-1, width relative to viewport height)
- Add draw routing in GameBridgeEffects (RUNNING → scene graph, STOPPED → pixel buffer)
- Update paint example to use normalized coords + drawToActiveBuffer API
- Clear draw containers per frame after ping-pong swap
- Clean up draw containers on stop before bake
```
