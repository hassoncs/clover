# PixelBuffer Primitive — Framebuffer-Level Drawing in Godot

## TL;DR

> **Quick Summary**: Add a new engine primitive (`pixel_buffer`) that provides a CPU-side pixel buffer rendered as a Godot `ImageTexture` on a `Sprite2D`. Drawing operations (pixel, line, fill) are executed entirely on the Godot side via lightweight command batches sent through the existing bridge. The first consumer is a finger-painting example; the same primitive supports any future use case that needs raw pixel manipulation on the Godot canvas (camera feeds, shader post-processing, etc.).
>
> **MVP Scope**: Only `pixel`, `line`, and `fill` draw commands. Focus is on proving the pixel buffer concept works — brush tool with color selection for finger-painting. Advanced shapes (rect, circle, flood_fill) and shader integration are future enhancements.
>
> **Deliverables**:
> - New GDScript class `PixelBufferManager` that creates/manages `Image` + `ImageTexture` + `Sprite2D` per pixel buffer entity
> - New bridge commands: `createPixelBuffer`, `pixelBufferDraw`, `pixelBufferClear`
> - New TypeScript bridge methods on `GodotBridge` matching the GDScript commands
> - New ScriptContext (`ctx`) methods so game scripts can draw on pixel buffers
> - Working example page: `app/app/examples/paint.tsx` — finger-painting demo
>
> **Estimated Effort**: Small-Medium (1–2 days)
> **Critical Path**: Task 1 (GDScript PixelBufferManager) → Task 2 (Bridge wiring) → Task 4 (Paint example)
>
> **Branch**: `feat/pixel-buffer` (developed in a git worktree to avoid conflicting with other ongoing work)

---

## Context

### Original Request
Create an MS Paint-style drawing interface inside the Godot canvas as a new example. User clarified: this should NOT be entity-based (spawning dots). Instead, it needs **framebuffer-level pixel manipulation** — a new engine primitive. The Paint example is the first consumer, but the primitive must support:
- Future camera feed display (separate plan: `live-camera-to-godot-texture.md`)
- Shader post-processing chains (draw something → fluid sim shader → display)
- Any use case requiring raw pixel data on the Godot canvas

### Architecture Decision: Why Godot-Side Drawing

Three approaches were evaluated:

| Approach | How | Verdict |
|----------|-----|---------|
| **JS-side pixel buffer + base64 transfer** | Maintain pixel array in JS, encode as PNG/base64, send to Godot each frame | **Rejected**: base64 encoding overhead, ~3x size inflation, bridge string transfer bottleneck. Not viable for real-time. |
| **Godot-side pixel buffer + command protocol** | JS sends lightweight draw commands (JSON), Godot executes on its internal `Image`, calls `ImageTexture.update()` | **Selected**: Commands are tiny (<100 bytes each), drawing is native-speed in Godot, texture update is one GPU upload per batch. |
| **SubViewport approach** | Render to an off-screen Godot viewport, use `ViewportTexture` | **Rejected for MVP**: More complex, harder to control from JS, better suited for multi-pass shader chains (future enhancement). |

### Relationship to Camera Feed Plan

The camera plan (`live-camera-to-godot-texture.md`) solves a related but distinct problem:
- **Camera**: External pixel source (native camera hardware) → shared memory → GDExtension → `ImageTexture`
- **PixelBuffer**: Internal pixel manipulation (draw commands from JS) → `Image` operations → `ImageTexture`

Both converge on the same output: a `Sprite2D` with a dynamic `ImageTexture` that can have `ShaderMaterial` applied. The shader integration pattern is shared.

**Future convergence**: A PixelBuffer could accept external pixel data (from camera, from network) as a "source" — but that's out of scope for this plan.

### Key Findings from Exploration

1. **`set_entity_image_base64` already exists** in `VisualRenderer.gd` (line 255) — proves the Image → ImageTexture → Sprite2D pipeline works. But it re-creates the texture each call (not suitable for per-frame updates).

2. **`ImageTexture.update(image)`** updates an existing GPU texture in-place without reallocation. This is the key API for efficient per-frame updates. Camera plan research shows ~15-20ms at 720p; a 256×256 paint canvas would be <1ms.

3. **`Image.set_pixel(x, y, color)`** is the CPU-side pixel manipulation API. For bulk operations, `Image.fill_rect()` and `Image.blit_rect()` exist. Line drawing requires a Bresenham implementation.

4. **Dynamic shaders work today**: `createDynamicShader()` → `applyDynamicShader()` with uniforms. Any `canvas_item` shader applied to the Sprite2D gets the pixel buffer as its `TEXTURE` sampler.

5. **Bridge is JSON/string only** — no binary channel. This is fine because we're sending commands (tiny JSON), not pixel data.

6. **Existing drawing in GDScript**: `_create_polygon_texture()` in VisualRenderer.gd (line 752) already uses `Image.create()` + `set_pixel()` + `ImageTexture.create_from_image()`. The PixelBuffer generalizes this pattern.

---

## Work Objectives

### Core Objective
Create a reusable PixelBuffer primitive that allows game scripts and the React bridge to perform pixel-level drawing operations on a Godot-rendered texture, with shader compatibility.

### Concrete Deliverables
- `godot_project/scripts/bridge/PixelBufferManager.gd` — Core GDScript implementation
- `godot_project/scripts/GameBridge.gd` — New method map entries for pixel buffer commands
- `app/lib/godot/types.ts` — New TypeScript interface methods
- `app/lib/godot/GodotBridge.web.ts` — Web bridge implementation
- `app/lib/godot/GodotBridge.native.ts` — Native bridge implementation
- `shared/src/scripting/script-authoring-types.ts` — New ctx methods for scripts
- `shared/src/scripting/` — Script sandbox implementation of new ctx methods
- `app/app/examples/paint.tsx` — MS Paint example page

### Definition of Done
- [ ] A game script can create a pixel buffer, draw lines and pixels on it, and see results rendered in real-time
- [ ] Finger painting responds to drag input at interactive frame rate (no visible lag)
- [ ] The paint example works on web (primary) and is testable via the game inspector
- [ ] `tsc --noEmit` passes, no type errors introduced
- [ ] New bridge methods work on both web and native bridge implementations
- [ ] Undo/redo data structures are stubbed in (ready for future wiring)

### Must Have
- `PixelBufferManager` class managing Image + ImageTexture lifecycle per buffer
- Draw commands (MVP): `pixel`, `line`, `fill` — just enough for finger painting
- Bridge methods: `createPixelBuffer`, `pixelBufferDraw`, `pixelBufferClear`
- Script context (`ctx`) methods for pixel buffer operations
- Efficient batching: multiple draw commands per bridge call, single `texture.update()` after batch
- Color palette UI in the paint example (6 colors, click to select)
- Brush size control in the paint example (small/medium/large)

### Must NOT Have (Guardrails)
- No pixel data crossing the JS↔Godot bridge (commands only)
- No new visual type in `GameDefinition` yet (bridge-level API is the MVP; declarative type is a future enhancement)
- No camera integration (separate plan)
- No undo/redo system
- No file save/load
- No multi-touch drawing
- No production UI polish on the example
- No modifications to `@borndotcom/react-native-godot`

---

## Draw Command Protocol

Commands are JSON objects sent as an array (batch) from JS to Godot. Godot executes all commands on the `Image`, then calls `texture.update(image)` once.

```typescript
// MVP — just enough for finger painting
type DrawCommand =
  | { type: 'pixel'; x: number; y: number; color: string }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; width?: number }
  | { type: 'fill'; color: string };

// Future enhancements (not in MVP):
// | { type: 'rect'; x: number; y: number; w: number; h: number; color: string; filled?: boolean }
// | { type: 'circle'; cx: number; cy: number; radius: number; color: string; filled?: boolean }
// | { type: 'flood_fill'; x: number; y: number; color: string }
```

**Coordinate system**: Pixel coordinates (0,0 = top-left of buffer). Width and height are in pixels. Colors are hex strings (`"#FF0000"`).

**Performance target**: A batch of 100 line commands on a 256×256 buffer should complete in <5ms on the Godot side.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  React Native / Script Sandbox (JS)                      │
│                                                          │
│  ctx.pixelBufferDraw("canvas", [                        │
│    { type: "line", x1: 10, y1: 10, x2: 50, y2: 50,    │
│      color: "#FF0000", width: 3 },                      │
│    { type: "circle", cx: 100, cy: 100, radius: 20,     │
│      color: "#00FF00", filled: true }                    │
│  ])                                                      │
└──────────────────────┬──────────────────────────────────┘
                       │  JSON command batch
                       │  (tiny: ~200 bytes)
                       ▼
┌─────────────────────────────────────────────────────────┐
│  GodotBridge (JSON string dispatch)                      │
│  Web: window.GodotBridge.pixelBufferDraw(id, cmdsJson)  │
│  Native: native_dispatch("pixel_buffer_draw", argsJson) │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  PixelBufferManager.gd (Godot)                           │
│                                                          │
│  var _buffers: Dictionary = {}                           │
│  # _buffers[id] = { image: Image, texture: ImageTexture,│
│  #                  sprite: Sprite2D, width: int, ... }  │
│                                                          │
│  func draw_commands(id, commands):                       │
│    var buf = _buffers[id]                                │
│    for cmd in commands:                                  │
│      match cmd.type:                                     │
│        "line": _draw_line(buf.image, cmd)               │
│        "rect": _draw_rect(buf.image, cmd)               │
│        "circle": _draw_circle(buf.image, cmd)           │
│        "fill": buf.image.fill(Color.from_string(cmd))   │
│        ...                                               │
│    buf.texture.update(buf.image)  # ONE GPU upload      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Godot Rendering Pipeline                                │
│                                                          │
│  Sprite2D                                                │
│    .texture = ImageTexture (updated in-place)            │
│    .material = ShaderMaterial (optional)                  │
│      └─ TEXTURE sampler = pixel buffer content           │
│      └─ uniforms: TIME, custom params                    │
│                                                          │
│  Shader examples:                                        │
│    - Ripple/wave distortion of drawn content             │
│    - Pixelation / downscale effect                       │
│    - Edge detection on drawn strokes                     │
│    - Color palette cycling                               │
│    - Fluid simulation feedback loop (advanced)           │
└─────────────────────────────────────────────────────────┘
```

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (bun test, vitest, game-inspector MCP)
- **Automated tests**: Tests-after for TypeScript types; game-inspector for visual verification
- **Framework**: Game Inspector MCP (existing) for runtime verification

### Agent-Executed QA

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **GDScript implementation** | Game Inspector MCP | Open paint example, send draw commands via `debug_eval`, verify pixel buffer state |
| **Bridge methods** | Game Inspector MCP | Call bridge methods, inspect entity state |
| **TypeScript types** | Bash (`tsc --noEmit`) | Zero type errors |
| **Paint example** | Game Inspector MCP | Open example, simulate input (taps, drags), take screenshots |
| **Shader integration** | Game Inspector MCP | Apply shader to pixel buffer entity, verify visual effect in screenshot |

---

## Execution Strategy

### Execution Flow

```
Task 1: PixelBufferManager GDScript implementation [CRITICAL PATH — foundation]
  ↓
Task 2 + Task 3 (parallel): Bridge wiring + Script context methods
  ↓
Task 4: Finger painting example page
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 (PixelBufferManager) | None | 2, 3, 4 | None (foundation) |
| 2 (Bridge wiring) | 1 | 4 | 3 |
| 3 (Script ctx methods) | 1 | 4 | 2 |
| 4 (Paint example) | 2, 3 | None | None |

### Agent Dispatch Summary

| Task | Recommended Agent |
|------|-------------------|
| 1 | `deep` (novel GDScript class, Bresenham line, Godot Image API) |
| 2 | `quick` (mechanical wiring to existing bridge patterns) |
| 3 | `quick` (adding methods to existing SyncWorldOps interface) |
| 4 | `visual-engineering` + `game-authoring` + `frontend-ui-ux` skills |

---

## TODOs

---

- [ ] 1. PixelBufferManager GDScript Implementation

  **What to do**:
  Create the core GDScript class that manages pixel buffers. This is a new file that follows the same module extraction pattern as `VisualRenderer.gd` — a `RefCounted` class instantiated by `GameBridge`.

  **Implementation details**:

  1. **Class structure** (`PixelBufferManager.gd`):
     ```gdscript
     class_name PixelBufferManager
     extends RefCounted

     var _bridge: Node = null
     var _buffers: Dictionary = {}  # id → PixelBufferData

     # PixelBufferData = {
     #   image: Image,
     #   texture: ImageTexture,
     #   sprite: Sprite2D,
     #   node: Node2D,       # The entity node
     #   width: int,         # Buffer pixel width
     #   height: int,        # Buffer pixel height
     #   world_width: float, # World-space width (for sprite scaling)
     #   world_height: float # World-space height (for sprite scaling)
     # }
     ```

  2. **`create_pixel_buffer(entity_id, width, height, clear_color)`**:
     - Look up entity node from `_bridge.entities`
     - Create `Image.create(width, height, false, Image.FORMAT_RGBA8)`
     - Fill with `clear_color`
     - Create `ImageTexture.create_from_image(image)`
     - Find or create `Sprite2D` on entity node (same pattern as `VisualRenderer.set_entity_image`)
     - Set sprite texture, calculate scale from world size vs pixel size
     - Store in `_buffers[entity_id]`

  3. **`draw_commands(entity_id, commands_array)`**:
     - Look up buffer data
     - Iterate commands, dispatch by type
     - After ALL commands executed: `buf.texture.update(buf.image)` — single GPU upload
     - Return immediately (fire-and-forget from JS side)

  4. **Drawing implementations (MVP)** (on the `Image`):
     - **`pixel`**: `image.set_pixel(x, y, color)` — bounds check first
     - **`line`**: Bresenham's line algorithm with configurable width. For width > 1, stamp a filled circle at each Bresenham point. This is the core brush tool for finger painting.
     - **`fill`**: `image.fill(color)` — Godot's built-in, very fast. Used for clear/fill operations.

  5. **`clear_pixel_buffer(entity_id, color)`**:
     - `image.fill(color)` + `texture.update(image)`

  6. **`get_pixel(entity_id, x, y)`** → returns color hex string:
     - `image.get_pixel(x, y)` → convert to hex
     - Useful for eyedropper tool

  7. **Cleanup**: `destroy_pixel_buffer(entity_id)` — free Image, remove sprite, clean up dictionary entry.

  **Must NOT do**:
  - No bridge wiring (Task 2)
  - No TypeScript types (Task 2)
  - No script context methods (Task 3)
  - No GPU-side drawing (all CPU-side via Image API)
  - No SubViewport approach (future enhancement)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Novel GDScript class implementing drawing algorithms (Bresenham, midpoint circle, flood fill) on Godot's Image API. Needs to handle edge cases, coordinate math, color conversion, and efficient batching. Not boilerplate — requires understanding Godot's Image/ImageTexture lifecycle.
  - **Skills**: [`game-authoring/scripting-api-reference`, `context7-auto-research`]
    - `game-authoring/scripting-api-reference`: For understanding how other GDScript modules are structured in this project
    - `context7-auto-research`: For Godot 4 Image API reference (set_pixel, fill, create_from_data, etc.)
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work
    - `game-authoring`: Main skill is for game definitions, not GDScript module development

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundation for everything else)
  - **Blocks**: Tasks 2, 3, 4, 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `godot_project/scripts/bridge/VisualRenderer.gd:1-24` — Module structure pattern: `class_name`, `extends RefCounted`, bridge reference, `_init(bridge)`. Follow this exactly.
  - `godot_project/scripts/bridge/VisualRenderer.gd:255-287` — `set_entity_image_base64()`: Shows the Image → ImageTexture → Sprite2D pipeline. PixelBuffer uses the same pattern but keeps the Image alive for incremental updates.
  - `godot_project/scripts/bridge/VisualRenderer.gd:752-760` — `_create_polygon_texture()`: Shows `Image.create()` + `set_pixel()` loop + `ImageTexture.create_from_image()`. The PixelBuffer generalizes this into a persistent, updatable buffer.
  - `godot_project/scripts/effects/ParticleFactory.gd:497-561` — Multiple `_create_*_texture()` methods showing Image pixel manipulation patterns (circle via distance check, star via angle calculation).
  - `godot_project/scripts/bridge/VisualRenderer.gd:763-772` — `_has_entity()` and `_get_entity()` patterns for entity lookup.

  **Acceptance Criteria**:
  - [ ] `PixelBufferManager.gd` class created, follows `VisualRenderer.gd` module pattern
  - [ ] `create_pixel_buffer()` produces a visible sprite on the target entity with correct dimensions
  - [ ] `draw_commands()` with `pixel` type sets a single pixel
  - [ ] `draw_commands()` with `line` type draws a visible line (Bresenham, pixel-perfect) with configurable width (brush tool)
  - [ ] `draw_commands()` with `fill` clears to a solid color
  - [ ] Batch of 100 line commands on 256×256 buffer completes in <5ms
  - [ ] `texture.update(image)` called exactly ONCE per `draw_commands()` call (not per-command)
  - [ ] `clear_pixel_buffer()` resets to solid color
  - [ ] Out-of-bounds coordinates are silently clamped/ignored (no crash)
  - [ ] Cleanup frees Image and removes sprite from entity
  - [ ] `PixelBufferData` includes `undo_stack`, `redo_stack` (Array), and `max_undo` (int, default 50) fields — initialized but not yet wired (preparation for undo/redo)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: PixelBuffer creates visible sprite
    Tool: Game Inspector MCP (open paint example, debug_eval)
    Steps:
      1. Open a test game with an entity "canvas" (rect visual, 8×8 world units)
      2. debug_eval: GameBridge._pixel_buffer_manager.create_pixel_buffer("canvas", 256, 256, "#FFFFFF")
      3. game_screenshot
      4. Assert: White rectangle visible at entity position
    Expected Result: Visible white sprite
    Evidence: Screenshot

  Scenario: Draw line produces visible result
    Tool: Game Inspector MCP
    Steps:
      1. After create, debug_eval: draw_commands("canvas", [{"type":"line","x1":0,"y1":0,"x2":255,"y2":255,"color":"#FF0000","width":3}])
      2. game_screenshot
      3. Assert: Red diagonal line visible on white canvas
    Expected Result: Red line from top-left to bottom-right
    Evidence: Screenshot

  Scenario: Flood fill works correctly
    Tool: Game Inspector MCP
    Steps:
      1. Draw a closed rectangle outline
      2. Flood fill inside the rectangle with a different color
      3. game_screenshot
      4. Assert: Only interior filled, outline preserved
    Expected Result: Bounded fill
    Evidence: Screenshot
  ```

  **Commit**: YES
  - Message: `feat(engine): add PixelBufferManager for CPU-side pixel drawing with GPU texture upload`
  - Files: `godot_project/scripts/bridge/PixelBufferManager.gd`
  - Pre-commit: Godot project loads without parse errors

---

- [ ] 2. Bridge Wiring (GDScript Method Map + TypeScript Interface + Bridge Implementations)

  **What to do**:
  Wire the PixelBufferManager into the existing bridge infrastructure so JS can call pixel buffer operations.

  **Sub-tasks**:

  1. **GameBridge.gd** — Add to `_method_map`:
     ```gdscript
     "createPixelBuffer": _pixel_buffer_manager._js_create_pixel_buffer,
     "pixelBufferDraw": _pixel_buffer_manager._js_draw_commands,
     "pixelBufferClear": _pixel_buffer_manager._js_clear,
     "pixelBufferGetPixel": _pixel_buffer_manager._js_get_pixel,
     "destroyPixelBuffer": _pixel_buffer_manager._js_destroy,
     ```
     Also instantiate `_pixel_buffer_manager = PixelBufferManager.new(self)` alongside the other managers.

  2. **PixelBufferManager.gd** — Add `_js_*` wrapper functions (same pattern as `VisualRenderer._js_set_entity_image`):
     ```gdscript
     func _js_create_pixel_buffer(args: Array) -> void:
       # args: [entity_id, width, height, clear_color]
       create_pixel_buffer(str(args[0]), int(args[1]), int(args[2]), str(args[3]))

     func _js_draw_commands(args: Array) -> void:
       # args: [entity_id, commands_json_string]
       var commands = JSON.parse_string(str(args[1]))
       draw_commands(str(args[0]), commands)
     ```

  3. **types.ts** — Add new methods to `GodotBridge` interface:
     ```typescript
     // Pixel Buffer operations
     createPixelBuffer(entityId: string, width: number, height: number, clearColor: string): void;
     pixelBufferDraw(entityId: string, commands: DrawCommand[]): void;
     pixelBufferClear(entityId: string, color: string): void;
     pixelBufferGetPixel(entityId: string, x: number, y: number): Promise<string>;
     destroyPixelBuffer(entityId: string): void;
     ```
     Also add the `DrawCommand` type union.

  4. **GodotBridge.web.ts** — Implement new methods:
     ```typescript
     createPixelBuffer(entityId: string, width: number, height: number, clearColor: string) {
       getGodotBridge()?.createPixelBuffer(entityId, width, height, clearColor);
     }
     pixelBufferDraw(entityId: string, commands: DrawCommand[]) {
       getGodotBridge()?.pixelBufferDraw(entityId, JSON.stringify(commands));
     }
     ```

  5. **GodotBridge.native.ts** — Implement via `callGameBridge`:
     ```typescript
     createPixelBuffer(entityId: string, width: number, height: number, clearColor: string) {
       callGameBridge('createPixelBuffer', entityId, width, height, clearColor);
     }
     pixelBufferDraw(entityId: string, commands: DrawCommand[]) {
       callGameBridge('pixelBufferDraw', entityId, JSON.stringify(commands));
     }
     ```

  **Must NOT do**:
  - No changes to PixelBufferManager core logic (Task 1)
  - No script context changes (Task 3)
  - No example page (Task 4)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical wiring following well-established patterns. Every bridge method follows the exact same pattern as existing ones (`setEntityImage`, `applySpriteEffect`, etc.)
  - **Skills**: [`game-authoring/scripting-api-reference`]
    - `game-authoring/scripting-api-reference`: For understanding bridge patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3, once Task 1 is done)
  - **Parallel Group**: Wave 1b
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `godot_project/scripts/GameBridge.gd:315` — `_method_map` registration pattern. `"setEntityImage": _visual_renderer._js_set_entity_image`. Follow identically.
  - `godot_project/scripts/bridge/VisualRenderer.gd:30-51` — `_js_set_entity_image()` and `_js_set_entity_atlas_region()` wrapper patterns. Args are Array, extract with str()/int()/float().
  - `app/lib/godot/types.ts:298-308` — `setEntityImage`, `setEntityAtlasRegion`, `clearTextureCache` declarations. Follow the same grouping/documentation style.
  - `app/lib/godot/GodotBridge.web.ts` — `setEntityImage` web implementation. Direct call to `getGodotBridge()?.methodName(args)`.
  - `app/lib/godot/GodotBridge.native.ts` — `setEntityImage` native implementation. Uses `callGameBridge('method', ...args)`.

  **Acceptance Criteria**:
  - [ ] `GameBridge.gd` method map includes all 5 pixel buffer commands
  - [ ] `PixelBufferManager` instantiated in GameBridge alongside other managers
  - [ ] `types.ts` has `DrawCommand` type and all new `GodotBridge` methods
  - [ ] `GodotBridge.web.ts` implements all methods (calls `getGodotBridge()`)
  - [ ] `GodotBridge.native.ts` implements all methods (calls `callGameBridge()`)
  - [ ] `tsc --noEmit` passes with zero errors
  - [ ] Commands JSON string is parsed correctly on GDScript side

  **Commit**: YES
  - Message: `feat(engine): wire PixelBuffer bridge methods (GDScript + TypeScript + web + native)`
  - Files: `godot_project/scripts/GameBridge.gd`, `app/lib/godot/types.ts`, `app/lib/godot/GodotBridge.web.ts`, `app/lib/godot/GodotBridge.native.ts`
  - Pre-commit: `tsc --noEmit` passes

---

- [ ] 3. Script Context (`ctx`) Methods for Pixel Buffer Operations

  **What to do**:
  Extend the scripting sandbox so game scripts can call pixel buffer operations via the `ctx` object. This allows game definitions with `script` fields to draw on pixel buffers.

  **New ctx methods**:
  ```javascript
  // Create a pixel buffer on an entity (usually called in onStart)
  ctx.createPixelBuffer(entityId, width, height, clearColor);

  // Draw commands batch
  ctx.pixelBufferDraw(entityId, commands);

  // Clear to solid color
  ctx.pixelBufferClear(entityId, color);

  // Get pixel color (returns hex string)
  ctx.pixelBufferGetPixel(entityId, x, y);
  ```

  **Implementation**:
  1. Add method signatures to `SyncWorldOps` in `shared/src/scripting/script-authoring-types.ts`
  2. Implement in the script sandbox runtime system — these methods call down to the bridge/engine, same pattern as `ctx.spawnEntity()` or `ctx.setEntityPosition()`
  3. The sandbox runtime forwards calls to the PixelBufferManager (via the same event/command queue used by other ctx methods)

  **Must NOT do**:
  - No async operations (all pixel buffer ops are synchronous fire-and-forget)
  - No new script lifecycle hooks

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding methods to an existing interface following established patterns. The sandbox has many existing ctx methods to copy from.
  - **Skills**: [`game-authoring/scripting-api-reference`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Parallel Group**: Wave 1b
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `shared/src/scripting/script-authoring-types.ts` — `SyncWorldOps` interface. Add new methods following the same pattern as `spawnEntity`, `setEntityPosition`, etc.
  - `shared/src/scripting/` — Script sandbox runtime that implements `SyncWorldOps`. Follow how `spawnEntity` is implemented (queues a command that the engine processes).

  **Acceptance Criteria**:
  - [ ] `SyncWorldOps` has `createPixelBuffer`, `pixelBufferDraw`, `pixelBufferClear`, `pixelBufferGetPixel` methods
  - [ ] Script sandbox runtime implements these methods (forwards to engine command queue)
  - [ ] A game script can call `ctx.createPixelBuffer(...)` without error
  - [ ] `tsc --noEmit` passes

  **Commit**: YES (can group with Task 2)
  - Message: `feat(engine): add pixel buffer methods to ScriptContext (ctx)`
  - Files: `shared/src/scripting/script-authoring-types.ts`, script sandbox runtime files

---

- [ ] 4. Finger Painting Example Page

  **What to do**:
  Create `app/app/examples/paint.tsx` — a simple finger-painting interface that proves the PixelBuffer primitive works. Focus on the brush tool: pick a color, drag to paint.

  **Design**:
  ```
  ┌──────────────────────────────────────┐
  │ ← Finger Paint                       │
  ├──────────────────────────────────────┤
  │                                      │
  │                                      │
  │        White Canvas (256×256)         │
  │        Drag to paint here            │
  │                                      │
  │                                      │
  ├──────────────────────────────────────┤
  │ [●][●][●][●][●][●]  Size: [S][M][L] │
  │  Colors              [Clear]         │
  └──────────────────────────────────────┘
  ```

  **Implementation approach**:
  This example uses the **low-level bridge pattern** (like `dynamic_shader.tsx` and `dynamic_images.tsx`), not the high-level `GameRuntimeGodot` component. This is because:
  - We need direct bridge access for `createPixelBuffer` and `pixelBufferDraw`
  - Color palette and brush controls are React Native UI, not Godot entities
  - Input needs to flow from Godot (drag events) back to React, which triggers draw commands

  **Game definition**:
  - World: 12×16, zero gravity
  - One entity: `canvas` — a static rect (10×14 world units) centered, visual placeholder
  - No physics, no rules, no script (all logic in React component)

  **React component logic**:
  1. On mount: initialize bridge, load game, create pixel buffer on the "canvas" entity
  2. Color palette: 6 `Pressable` buttons in React. Selected color stored in React state.
  3. Brush size: 3 options (small=1, medium=3, large=6 pixels). Stored in React state.
  4. Drawing: Listen for Godot input events via `bridge.onInputEvent`. On `drag_start`/`drag_move`:
     - Convert world coordinates to pixel buffer coordinates
     - Build a `line` command from previous position to current position
     - Call `bridge.pixelBufferDraw("canvas", [lineCmd])`
  5. Clear button: `bridge.pixelBufferClear("canvas", "#FFFFFF")`
  6. Fill button: `bridge.pixelBufferDraw("canvas", [{ type: "fill", color: selectedColor }])`

  **Coordinate conversion**:
  - Godot reports drag positions in world units (origin at center, Y-up)
  - Pixel buffer is in pixel coordinates (origin at top-left, Y-down)
  - Conversion: `px = (worldX - canvasLeft) / canvasWorldWidth * bufferPixelWidth`
  - `py = (canvasTop - worldY) / canvasWorldHeight * bufferPixelHeight`

  **Must NOT do**:
  - No undo/redo
  - No eraser (can just select white/background color)
  - No file save
  - No production styling
  - No `GameRuntimeGodot` usage (use raw bridge)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: React Native UI layout (color palette, buttons, Godot view integration), coordinate math, input handling
  - **Skills**: [`frontend-ui-ux`, `game-authoring`]
    - `frontend-ui-ux`: For palette/button layout and styling
    - `game-authoring`: For game definition structure (templates, entities, world setup)
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — verification via game-inspector MCP
    - `test-driven-development`: Example page, not core logic

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 3

  **References**:

  **Pattern References**:
  - `app/app/examples/dynamic_shader.tsx` — THE closest pattern. Low-level bridge usage: manual `createGodotBridge()` → `bridge.initialize()` → `bridge.loadGame()`. Direct method calls. React UI controls alongside GodotView. Copy this structure.
  - `app/app/examples/dynamic_images.tsx` — Another low-level bridge example. Shows `bridge.setEntityImage()` calls from button handlers. Paint example calls `bridge.pixelBufferDraw()` instead.
  - `app/lib/registry/types.ts` — `ExampleMeta` type for the metadata export.
  - `app/app/examples/draggable_cubes.tsx` — Shows GameRuntimeGodotWithDevTools lazy import pattern (alternative to direct bridge, but we won't use this).

  **Acceptance Criteria**:
  - [ ] `paint.tsx` exists with `metadata` export and default component export
  - [ ] Example appears in registry after `pnpm generate:registry`
  - [ ] Game loads: white canvas visible in Godot viewport
  - [ ] Tapping a color swatch changes the active brush color (visual indicator updates)
  - [ ] Dragging on the canvas draws a continuous line in the selected color
  - [ ] No gaps in drawn lines (interpolation between drag events works)
  - [ ] Brush size selector changes line thickness
  - [ ] Clear button resets canvas to white
  - [ ] Fill button fills entire canvas with selected color
  - [ ] Performance: drawing feels responsive (no visible lag between touch and pixels appearing)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Drawing on the canvas produces visible lines
    Tool: Game Inspector MCP
    Steps:
      1. game-inspector open paint example
      2. Wait for ready
      3. Simulate drag from center-left to center-right
      4. game_screenshot
      5. Assert: Line visible on canvas
    Expected Result: Colored line on white background
    Evidence: Screenshot

  Scenario: Color selection works
    Tool: Game Inspector MCP
    Steps:
      1. Open paint example
      2. Simulate tap on red color swatch position
      3. Simulate drag on canvas
      4. game_screenshot
      5. Assert: Red line drawn
      6. Simulate tap on blue color swatch position
      7. Simulate drag on canvas (different area)
      8. game_screenshot
      9. Assert: Blue line drawn alongside red
    Expected Result: Both colored lines visible
    Evidence: Screenshots

  Scenario: Clear resets canvas
    Tool: Game Inspector MCP
    Steps:
      1. Draw several lines
      2. Trigger clear action
      3. game_screenshot
      4. Assert: Canvas is solid white (no lines)
    Expected Result: Clean white canvas
    Evidence: Screenshot
  ```

  **Commit**: YES
  - Message: `feat(examples): add MS Paint-style drawing example using PixelBuffer primitive`
  - Files: `app/app/examples/paint.tsx`
  - Pre-commit: `tsc --noEmit` passes, registry regenerated

---

## Undo/Redo Design (Planned — Post-MVP)

Not implemented in the MVP, but designed here so the architecture supports it cleanly.

### Approach: Image Snapshots

Three approaches were evaluated:

| Approach | How | Memory (256×256, 50 undos) | Undo Speed | Verdict |
|----------|-----|---------------------------|------------|---------|
| **Snapshot stack** | Copy entire Image before each draw batch | ~12.5 MB (256KB × 50) | O(1) — instant restore | **Selected** |
| **Command replay** | Store draw commands, replay all-minus-last on undo | ~50 KB | O(n) — replays everything | Rejected: slow for long sessions |
| **Pixel deltas** | Store only changed pixels per operation | ~variable, small | O(changed pixels) | Rejected: complex for minimal memory savings at small buffer sizes |

**Why snapshots win**: At typical buffer sizes (256×256 to 512×512), each snapshot is only 256KB–1MB. A 50-deep undo stack costs 12.5–50MB — trivial on any modern device. And undo is instant (swap a pointer), not a replay of potentially thousands of draw commands.

### Data Structure

```
Per-buffer undo state (inside PixelBufferData):
  undo_stack: Array[Image]    # Previous states, newest at end
  redo_stack: Array[Image]    # States undone, newest at end
  max_undo: int = 50          # Configurable cap
```

### Operations

**Before each `draw_commands()` call:**
```gdscript
func _push_undo(buf: Dictionary) -> void:
    # Copy current image state
    var snapshot = buf.image.duplicate()
    buf.undo_stack.push_back(snapshot)
    
    # Cap the stack
    if buf.undo_stack.size() > buf.max_undo:
        buf.undo_stack.pop_front()
    
    # Any new draw clears the redo stack
    buf.redo_stack.clear()
```

**Undo:**
```gdscript
func undo(entity_id: String) -> bool:
    var buf = _buffers[entity_id]
    if buf.undo_stack.is_empty():
        return false
    
    # Push current state to redo stack
    buf.redo_stack.push_back(buf.image.duplicate())
    
    # Restore previous state
    var previous = buf.undo_stack.pop_back()
    buf.image = previous
    buf.texture.update(buf.image)
    return true
```

**Redo:**
```gdscript
func redo(entity_id: String) -> bool:
    var buf = _buffers[entity_id]
    if buf.redo_stack.is_empty():
        return false
    
    # Push current state to undo stack
    buf.undo_stack.push_back(buf.image.duplicate())
    
    # Restore redo state
    var next = buf.redo_stack.pop_back()
    buf.image = next
    buf.texture.update(buf.image)
    return true
```

### Bridge Commands (to add when implementing)

```typescript
// New GodotBridge methods
pixelBufferUndo(entityId: string): boolean;    // returns false if nothing to undo
pixelBufferRedo(entityId: string): boolean;    // returns false if nothing to redo

// New ctx methods for scripts
ctx.pixelBufferUndo(entityId);
ctx.pixelBufferRedo(entityId);
```

### Undo Granularity

Each `pixelBufferDraw()` call = one undo step. If JS sends a batch of 10 line commands in one call, undoing reverts all 10 at once. This is intentional:
- For finger painting, each `dragMove` → `draw_commands()` cycle is one brush stroke segment
- If the game wants finer granularity, it sends smaller batches
- If the game wants coarser granularity (e.g., undo entire stroke, not each segment), it can call a new `pixelBufferBeginStroke()` / `pixelBufferEndStroke()` pair that groups everything between them into one undo step

### Stroke Grouping (Optional Enhancement)

For games that want "undo entire brush stroke" instead of "undo each drag segment":

```typescript
// Start a stroke — everything until endStroke is one undo step
ctx.pixelBufferBeginStroke(entityId);

// Multiple draws during the stroke (no individual undo snapshots)
ctx.pixelBufferDraw(entityId, [...]);  // dragMove 1
ctx.pixelBufferDraw(entityId, [...]);  // dragMove 2
ctx.pixelBufferDraw(entityId, [...]);  // dragMove 3

// End stroke — snapshot taken now
ctx.pixelBufferEndStroke(entityId);

// Undo reverts all 3 draws at once
ctx.pixelBufferUndo(entityId);
```

Implementation: `beginStroke()` pushes one undo snapshot. All subsequent `draw_commands()` skip the `_push_undo()` call. `endStroke()` re-enables undo snapshots. If the user undoes, they get back to the pre-stroke state.

### Memory Management

| Buffer Size | Snapshot Size | 50 Undos | 100 Undos |
|------------|--------------|----------|-----------|
| 128×128 | 64 KB | 3.2 MB | 6.4 MB |
| 256×256 | 256 KB | 12.5 MB | 25 MB |
| 512×512 | 1 MB | 50 MB | 100 MB |

For mobile, recommend capping at 50 undos for buffers ≤256×256 and 20 undos for 512×512. The `max_undo` parameter is configurable per buffer.

### MVP Preparation

The MVP implementation should:
1. Include the `undo_stack` and `redo_stack` arrays in `PixelBufferData` (initialized empty)
2. Include the `max_undo` field (default 50)
3. **NOT** call `_push_undo()` yet — it's dead code until the bridge commands are wired
4. This way, adding undo/redo later is a 1-task addition (wire bridge commands + enable the snapshot calls)

---

## Future Enhancements (Out of Scope)

These are documented for context but explicitly NOT part of this plan:

1. **Declarative `pixel_buffer` visual type** in `GameDefinition` — allows pixel buffers to be defined in game templates instead of created imperatively via bridge calls.

2. **External pixel source** — accept raw pixel data from outside (camera feed, network stream) and blit it onto the pixel buffer. This bridges the PixelBuffer and Camera plans.

3. **SubViewport approach** — for multi-pass shader chains, render the pixel buffer into a SubViewport, apply shader A, capture output, apply shader B. Enables feedback loops (fluid simulation, cellular automata).

4. **GPU-accelerated drawing** — instead of CPU-side `Image.set_pixel()`, use a shader to execute draw commands on the GPU. Massively faster for complex scenes.

5. **Shader integration** — apply `canvas_item` shaders to the pixel buffer's Sprite2D for live post-processing (ripple, edge glow, pixelation). Already supported by the existing `createDynamicShader` / `applyDynamicShader` bridge methods — just needs an example.

6. **Additional draw commands** — `rect`, `circle`, `flood_fill`, `bezier_curve`, `text` rendering.

7. **Multi-layer support** — multiple pixel buffers composited together (like Photoshop layers).

8. **Read-back to JS** — export the pixel buffer as an image (PNG base64) back to JS for saving, sharing, or AI processing.
