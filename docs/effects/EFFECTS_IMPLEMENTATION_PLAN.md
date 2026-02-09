# Effects System Implementation Plan (v2 — Post Red-Team)

## Red Team Summary

A design review identified five critical risks in the original plan where the TypeScript bridge was fighting Godot's architecture instead of leveraging it. This revised plan addresses each:

| # | Risk | Original Plan | Revised Plan |
|---|------|---------------|--------------|
| 1 | **Texture Upload Bottleneck** | CPU `Image` manipulation + `ImageTexture.update()` per frame | Scene-graph nodes (`Line2D`/`Sprite2D`) for draws; no per-frame texture uploads |
| 2 | **Viewport Thrashing** | Create/destroy `SubViewport`s on the fly | Viewport pooling — pre-allocate, acquire/release, never instantiate mid-effect |
| 3 | **Shader Compilation Stutter** | Send raw GLSL strings from TypeScript | Ubershader library with uniform toggles; pre-warm at load time |
| 4 | **One-Frame Feedback Lag** | Implicit viewport ordering | Explicit topological sort → `move_child()` reordering on every graph change |
| 5 | **Coordinate Mismatch** | Pixel coordinates from React/DOM | Normalized (0.0–1.0) coordinates across the bridge boundary |

### The Golden Rule

> **TypeScript is the Director, Godot is the Artist.**
> TS says *"draw a red line from A to B"*. Godot picks a `Line2D` and draws it.
> TS never says *"here is a grid of 1,000,000 pixels I colored for you."*

### V2 Follow-up Review — Scene-Graph Gotchas

The move from pixel buffers to scene-graph nodes trades bandwidth bottlenecks for **object management bottlenecks**. A second review identified six implementation traps:

| # | Gotcha | Where Addressed |
|---|--------|-----------------|
| 1 | **Squashed Brush** — normalized width on non-square viewports makes circles into ellipses | §1.2: Width relative to viewport height |
| 2 | **JSON Parse Overhead** — array-of-objects is slow for 100+ points/frame | §1.2: Flat `[x,y,x,y]` arrays + `PackedVector2Array` |
| 3 | **Viewport Ghosting** — pooled viewports leak HDR/MSAA/physics state | §2.1: Scorched-earth `_reset_viewport_state()` |
| 4 | **`queue_free()` Delay** — freed nodes remain in scene tree until end-of-frame | §1.1: `remove_child()` before `queue_free()` everywhere |
| 5 | **Bake Stall** — `get_image()` on stop is a CPU↔GPU sync point (20–50ms at 4K) | §1.7: Accept short-term, debounce strobe, defer async |
| 6 | **UPDATE_ONCE Trap** — setting update mode before adding children can skip renders | §1.4: Document for future optimization work |

---

## From → To

**Current**: Three-buffer model. Pixel buffer (`Image` + `ImageTexture`) + Viewport A + Viewport B. Shaders read `entity_input` + `current_buffer`. Drawing goes to the pixel buffer via CPU `set_pixel()` + `ImageTexture.update()`; shaders can't see new draws during animation. Bake on stop uses `get_image()` / `update()` for CPU↔GPU round-trip.

**Target**: Godot-native scene-graph model. During animation, the ping-pong pair IS the canvas. Drawing injects **scene-graph nodes** (`Line2D` for strokes, `Sprite2D` for stamps) into the write viewport — zero per-frame texture uploads. Shaders are pure feedback. Viewports are pooled. Coordinates are normalized. Shaders are pre-compiled.

---

## Phase 1: Draw-During-Animation via Scene Graph (Immediate)

Goal: Fix the paint example so drawing works while the shader is running, using Godot-native rendering instead of CPU pixel blitting.

### 1.1 Replace Overlay Image with Scene-Graph Drawing

**File**: `godot_project/scripts/effects/PingPongManager.gd`

The original plan used an `Image` overlay that would be `set_pixel()`'d then `ImageTexture.update()`'d every frame — exactly the texture-upload bottleneck the red team flagged.

**Instead**: Add a **draw container** (`Node2D`) to each viewport that accumulates scene-graph children:

```
SubViewport (write)
├── ColorRect (ShaderMaterial)     ← GPU: shader reads from read viewport
└── Node2D (draw_container)        ← Container for draw nodes
    ├── Line2D (stroke 1)          ← GPU-rendered brush stroke
    ├── Line2D (stroke 2)
    └── Sprite2D (stamp 1)         ← GPU-rendered stamp
```

Per buffer entry, add:
- `draw_container_a: Node2D` (child of viewport_a, after the ColorRect)
- `draw_container_b: Node2D` (child of viewport_b, after the ColorRect)

New functions:
- `add_stroke(buffer_id, points: PackedVector2Array, color: Color, width: float)` — create a `Line2D` child in the **write** viewport's draw container
- `add_stamp(buffer_id, position: Vector2, texture: Texture2D, color: Color)` — create a `Sprite2D` child
- `clear_draw_container(buffer_id)` — detach and free all children of the draw container (see below)
- `get_draw_container(buffer_id) -> Node2D` — returns the write viewport's container

**Why this works**: The `Line2D`/`Sprite2D` nodes render on the GPU in the viewport's local coordinate space. They composite on top of the shader's `ColorRect` output in tree order. No CPU→GPU texture transfer needed. After the viewport renders, the composited result is the ping-pong read texture for the next frame.

**Performance note**: After each frame renders, the draw nodes from the *previous* write viewport are already baked into the viewport texture. We clean them up to avoid unbounded node accumulation. New draws go into the *new* write viewport's container.

**Critical: `remove_child()` before `queue_free()`**. `queue_free()` alone does **not** remove the node from the scene tree until end-of-frame. This means `get_children()` will still include "freed" nodes, and the viewport may still try to render them. Always detach first:

```gdscript
func clear_draw_container(buffer_id: String) -> void:
    var container := _get_write_draw_container(buffer_id)
    if container == null:
        return
    for child in container.get_children():
        container.remove_child(child)  # Immediately detach from scene tree
        child.queue_free()             # Schedule memory cleanup for end-of-frame
```

### 1.2 Normalized Coordinate Bridge + Aspect Ratio Policy

**File**: `godot_project/scripts/effects/PingPongManager.gd` (new helper)
**File**: `godot_project/scripts/bridge/GameBridgeEffects.gd` (coordinate transform)

All draw commands from TypeScript use **normalized coordinates (0.0–1.0)**. The Godot side converts to viewport-local pixel positions.

#### Aspect Ratio Policy

**Problem**: On a 1920x1080 viewport, naively mapping `width: 0.1` as `0.1 * viewport.size.x` (192px) means a "circle" brush becomes an ellipse on non-square viewports.

**Rule**: **Brush width is always relative to viewport height** (the shorter axis in landscape). This is the standard convention in game engines and ensures consistent brush size regardless of aspect ratio.

```gdscript
func _normalized_to_viewport(uv: Vector2, viewport_size: Vector2i) -> Vector2:
    return Vector2(uv.x * float(viewport_size.x), uv.y * float(viewport_size.y))

func _normalized_width_to_pixels(width_norm: float, viewport_size: Vector2i) -> float:
    # Width relative to viewport HEIGHT — keeps brushes circular on non-square viewports
    return width_norm * float(viewport_size.y)
```

Bridge protocol change:
```typescript
// OLD (pixel coordinates — resolution dependent)
bridge.pixelBufferDraw(entityId, [
  { type: "line", x1: 100, y1: 200, x2: 150, y2: 250, color: "#ff0000", width: 3 }
])

// NEW (normalized coordinates — resolution independent)
bridge.pixelBufferDraw(entityId, [
  { type: "stroke", points: [[0.2, 0.4], [0.3, 0.5]], color: "#ff0000", width: 0.006 }
])
// width is relative to viewport HEIGHT (not width)
// On a 1080p viewport: 0.006 * 1080 = ~6.5px brush
// On a 512x512 viewport: 0.006 * 512 = ~3px brush
// A circle stays a circle regardless of aspect ratio
```

This makes the system resolution-independent. If the viewport is 512x512 or 2048x2048, the same normalized coordinates produce the same visual result.

**PixelBufferManager** (stopped state): Still uses `Image.set_pixel()` internally, but accepts normalized coords at its public API and converts to pixel coords internally. This is acceptable because stopped-state draws are infrequent (not every frame).

#### Optimized Data Transfer

**Problem**: Sending draw commands as an array of JSON objects `[{x, y, color, width}, ...]` creates significant parse overhead on the main thread — especially for fast sweeping curves that produce 100+ points per frame.

**Rule**: Use **flat arrays** for point data. Send one stroke as a single `Line2D` with many points, not many `Line2D` segments.

```typescript
// SLOW: Array of objects (heavy JSON parse, many Line2D nodes)
bridge.pixelBufferDraw(entityId, [
  { type: "stroke", points: [[0.2, 0.4], [0.21, 0.41], [0.22, 0.42]], color: "#f00", width: 0.006 },
  { type: "stroke", points: [[0.3, 0.5], [0.31, 0.51]], color: "#f00", width: 0.006 },
])

// FAST: Flat arrays, one stroke per Line2D (minimal parse, fewer nodes)
bridge.pixelBufferDraw(entityId, [
  { type: "stroke", points: [0.2, 0.4, 0.21, 0.41, 0.22, 0.42], color: "#f00", width: 0.006 },
  { type: "stroke", points: [0.3, 0.5, 0.31, 0.51], color: "#f00", width: 0.006 },
])
// points is a flat [x,y,x,y,...] array — parsed into PackedVector2Array on Godot side
```

On the Godot side, parse flat arrays into `PackedVector2Array`:
```gdscript
func _parse_flat_points(flat: Array, viewport_size: Vector2i) -> PackedVector2Array:
    var result := PackedVector2Array()
    result.resize(flat.size() / 2)
    for i in range(0, flat.size(), 2):
        result[i / 2] = _normalized_to_viewport(
            Vector2(float(flat[i]), float(flat[i + 1])),
            viewport_size
        )
    return result
```

**Prefer one `Line2D` with many points over many `Line2D` nodes with few points.** A single `Line2D` with 200 points is cheaper than 100 `Line2D` nodes with 2 points each.

### 1.3 Route Draw Commands During Animation

**File**: `godot_project/scripts/bridge/GameBridgeEffects.gd`

Change the draw routing:

```
When animation is STOPPED:
  → convert normalized coords to pixel coords
  → draw commands go to PixelBufferManager (CPU Image — acceptable for infrequent draws)

When animation is RUNNING:
  → convert normalized coords to viewport coords
  → draw commands go to PingPongManager.add_stroke() / add_stamp()
  → Godot renders them as GPU scene-graph nodes (zero texture upload)
```

Add a method: `draw_to_active_buffer(entity_id, commands)` that checks the graph state and routes accordingly.

### 1.4 Clear Draw Nodes Each Frame

**File**: `godot_project/scripts/effects/GraphExecutor.gd`

In `_process()`, after the swap:
1. The previous write viewport has rendered (shader + draw nodes composited into its texture)
2. Clear the previous write viewport's draw container (those nodes are baked into the texture now)
3. The new write viewport's draw container is empty and ready for fresh draws

```gdscript
# In _process(), after swap:
_ping_pong_manager.clear_draw_container(ping_pong_buffer)
# This clears the NEW write viewport's container (should already be empty)
# The OLD write (now read) viewport's draws are baked into its texture
```

**Viewport update mode timing**: Godot's execution order is `_process()` (scripts) → `RenderingServer` (draw). A `Line2D` added during `_process()` will be included in that same frame's render — this is the normal case and works correctly with `UPDATE_ALWAYS`.

**However**, if we ever switch to `UPDATE_ONCE` for optimization (e.g., to skip rendering frames where nothing changed), we must set `render_target_update_mode = UPDATE_ONCE` **after** adding the draw nodes, not before. Otherwise the viewport may consider itself "already rendered" and skip the frame that includes the new children. The current plan uses `UPDATE_ALWAYS` for running viewports, so this isn't an immediate concern, but it's a trap to document for future optimizations.

### 1.5 Simplify Shaders to Pure Feedback

**File**: `app/app/examples/paint.tsx`

Shaders already done — they only read `current_buffer` (feedback). No `entity_input` logic. The draw nodes provide new content via scene-graph compositing, not shader uniforms.

### 1.6 Seed on Start

**File**: `godot_project/scripts/effects/GraphExecutor.gd`

On start, seed the ping-pong from the pixel buffer (existing behavior via `_seed_feedback_on_next_frame`). This is the one time we do a texture upload — it's a one-shot operation, not per-frame, so the cost is acceptable.

### 1.7 Bake on Stop

**File**: `godot_project/scripts/bridge/GameBridgeEffects.gd`

`_bake_output_to_entity()` stays mostly the same:
1. Get the read viewport's image (latest complete frame, includes all composited draws)
2. Update PixelBufferManager's Image and ImageTexture
3. Clear any remaining draw nodes from viewports (using `remove_child()` + `queue_free()`)
4. Restore sprite to show the pixel buffer texture

**Known limitation: Main thread stall on bake.** `viewport.get_texture().get_image()` is a CPU↔GPU sync point. For a 4K effect this blocks the main thread for 20–50ms while the texture downloads from VRAM. Mitigations:

- **Short-term (accept)**: The stall only happens on stop, which is a deliberate user action. A 20–50ms hiccup is noticeable but tolerable.
- **Guard against strobe**: If the user rapidly toggles start/stop, debounce the bake — skip the `get_image()` if stop is called within N frames of the last start. Or: only bake if the effect actually produced visible changes (track a dirty flag).
- **Long-term**: Godot 4 doesn't expose async `RenderingServer` texture readback. If this becomes a real UX problem, we can use `get_image()` on a background thread via `WorkerThreadPool`, but this adds complexity and Godot's thread safety guarantees are limited. Defer until proven needed.

---

## Phase 2: Viewport Pooling + Shader Pre-warming

Goal: Eliminate runtime viewport creation stutter and shader compilation stutter.

### 2.1 Viewport Pool

**File**: New file `godot_project/scripts/effects/ViewportPool.gd`

```gdscript
class_name EffectsViewportPool
extends Node

var _available: Array[SubViewport] = []
var _in_use: Dictionary = {}  # id -> SubViewport
var _initial_pool_size: int = 10

func _ready() -> void:
    # Pre-allocate pool at startup
    for i in range(_initial_pool_size):
        var vp := _create_viewport("Pool_%d" % i)
        _available.append(vp)
        add_child(vp)

func acquire(id: String, size: Vector2i) -> SubViewport:
    var vp: SubViewport
    if _available.size() > 0:
        vp = _available.pop_back()
    else:
        # Pool exhausted — create new (with warning)
        push_warning("[ViewportPool] Pool exhausted, creating new viewport")
        vp = _create_viewport("Pool_overflow_%s" % id)
        add_child(vp)

    vp.size = size
    vp.render_target_clear_mode = SubViewport.CLEAR_MODE_ONCE
    vp.render_target_update_mode = SubViewport.UPDATE_DISABLED
    _in_use[id] = vp
    return vp

func release(id: String) -> void:
    if not _in_use.has(id):
        return
    var vp: SubViewport = _in_use[id]
    _in_use.erase(id)

    # Scorched-earth reset — every SubViewport property that could leak
    # between effects must be explicitly defaulted. Missing any of these
    # causes "ghosting" bugs (e.g., HDR mode leaking to a pixel-art effect).
    _reset_viewport_state(vp)

    # Detach then free children — remove_child() first so get_children()
    # is accurate for any logic checks (queue_free alone leaves nodes in
    # the tree until end of frame).
    for child in vp.get_children():
        vp.remove_child(child)
        child.queue_free()

    _available.append(vp)

func _reset_viewport_state(vp: SubViewport) -> void:
    # Rendering
    vp.render_target_update_mode = SubViewport.UPDATE_DISABLED
    vp.render_target_clear_mode = SubViewport.CLEAR_MODE_ONCE
    vp.transparent_bg = true
    vp.msaa_2d = SubViewport.MSAA_DISABLED
    vp.screen_space_aa = SubViewport.SCREEN_SPACE_AA_DISABLED
    vp.use_hdr_2d = false
    # Input
    vp.handle_input_locally = false
    vp.gui_disable_input = true
    # Physics — force a clean World2D so no collision shapes leak
    vp.world_2d = World2D.new()
    # Canvas
    vp.canvas_item_default_texture_filter = SubViewport.DEFAULT_CANVAS_ITEM_TEXTURE_FILTER_NEAREST
```

**Integration**: `PingPongManager` and `ResourceGraph` acquire viewports from the pool instead of calling `SubViewport.new()`. On `release()`, viewports return to the pool. The scorched-earth `_reset_viewport_state()` ensures no rendering properties leak between effects.

### 2.2 PingPongManager Uses Pool

**File**: `godot_project/scripts/effects/PingPongManager.gd`

Change `_create_viewport()` calls to `_pool.acquire()`:

```gdscript
var _pool: EffectsViewportPool = null

func configure(host: Node, default_size: Vector2i, pool: EffectsViewportPool) -> void:
    _host = host
    _pool = pool
    # ...

func initialize(buffer_id: String) -> void:
    # Instead of: var viewport_a := _create_viewport(...)
    var viewport_a := _pool.acquire("pp_a_%s" % buffer_id, size)
    var viewport_b := _pool.acquire("pp_b_%s" % buffer_id, size)
    # ...
```

### 2.3 Shader Pre-warming (Ubershader Approach)

**File**: New file `godot_project/scripts/effects/ShaderWarmer.gd`

Two strategies, applied in combination:

**Strategy A: Builtin shader pre-compilation**
At startup, iterate all shader resources in `SPRITE_SHADER_PATHS` and `POST_SHADER_PATHS`, create a temporary `ShaderMaterial` for each, attach to a hidden `ColorRect`, render one frame, then discard. This forces Godot to compile and cache every built-in shader.

```gdscript
func pre_warm_builtin_shaders() -> void:
    var all_paths := {}
    all_paths.merge(EffectsGraphExecutor.SPRITE_SHADER_PATHS)
    all_paths.merge(EffectsGraphExecutor.POST_SHADER_PATHS)

    for shader_name in all_paths:
        var shader = load(all_paths[shader_name])
        if shader is Shader:
            var mat := ShaderMaterial.new()
            mat.shader = shader
            _warm_rect.material = mat

    # Render one frame with the warm rect visible, then hide it
    _warm_viewport.render_target_update_mode = SubViewport.UPDATE_ONCE
```

**Strategy B: Custom shader validation at apply_plan time**
When `apply_plan()` receives a plan with custom GLSL, compile the shader immediately but render it in a hidden viewport for one frame before exposing it to the user. This hides the compilation stutter behind a loading state.

```gdscript
func warm_custom_shader(shader: Shader) -> void:
    var mat := ShaderMaterial.new()
    mat.shader = shader
    _warm_rect.material = mat
    _warm_viewport.render_target_update_mode = SubViewport.UPDATE_ONCE
    # Next frame, shader is compiled and cached
```

**Future (not now)**: For the AI authoring flow where users generate shaders from natural language, we could adopt a true "mega-shader" approach — a single uber-shader with `uniform bool use_blur`, `uniform bool use_distortion`, etc. switches. TypeScript toggles the bools. This keeps everything pre-compiled. But this is a Phase 4+ concern.

### 2.4 Clean Up the Three-Buffer Vestiges

This was Phase 2 in the original plan and remains unchanged in scope. Removing `entity_input` / `__entityTexture`:

| File | Change |
|------|--------|
| `compiler.ts` | Remove implicit `__entityTexture` binding for unconnected input slots |
| `resources.ts` | Remove `entityTexture` resource kind, `makeImplicitInputId()` |
| `ResourceGraph.gd` | Remove `__entityTexture` from `_is_implicit_input()` |
| `GraphExecutor.gd` | Remove `_entity_texture`, `set_entity_texture()`, simplify seeding |
| `GameBridgeEffects.gd` | Remove `_bind_entity_textures()`, `_find_entity_texture()` |
| `paint.tsx` | Remove `entity_input` from inputSlots and shader uniforms |
| `compiler.test.ts` | Update inputBindings assertions |
| `resources.test.ts` | Update implicit binding tests |

---

## Phase 3: Explicit Render Ordering + Generalized Buffers

Goal: Eliminate the 1-frame feedback lag and support arbitrary named buffers.

### 3.1 Topological Sort → Scene Tree Reorder

**File**: `godot_project/scripts/effects/GraphExecutor.gd`

The compiler already performs a topological sort of the graph. The runtime must enforce this ordering in the Godot scene tree so that upstream viewports render before downstream viewports read their textures.

Every time the graph changes (new plan, or future: dynamic reconnection):

1. TypeScript compiler produces a topologically sorted pass list (already exists)
2. Godot's `_build_passes()` creates viewports in that order
3. **New**: After building, explicitly reorder viewport children to match:

```gdscript
func _enforce_render_order() -> void:
    # SubViewports render in scene tree order (top to bottom).
    # Reorder them to match the topological sort from the compiler.
    for i in range(_pass_entries.size()):
        var entry := _pass_entries[i] as Dictionary
        var ping_pong_buffer: String = str(entry.get("ping_pong_buffer", ""))

        if ping_pong_buffer != "":
            var pair := _ping_pong_manager.get_viewports(ping_pong_buffer)
            if pair.get("a") != null:
                self.move_child(pair["a"], i * 2)
            if pair.get("b") != null:
                self.move_child(pair["b"], i * 2 + 1)
        else:
            var vp: SubViewport = entry.get("viewport")
            if vp != null:
                self.move_child(vp, i)
```

**Why this matters**: If pass B reads from pass A's viewport texture, pass A must render first. Godot processes children top-to-bottom. Without explicit ordering, a graph reconnection (A→B changed to B→A) would cause B to read A's *previous* frame — the "swimming artifacts" the red team flagged.

### 3.2 Named Buffer Registry

**File**: `godot_project/scripts/effects/GraphExecutor.gd` (or new file)

A registry of named input buffers, each with:
- `id: String`
- `size: Vector2i`
- `texture: Texture2D` (the current texture reference — could be an `ImageTexture` or a viewport texture)

Buffers are registered before `apply_plan()`. The effects system doesn't create them — it receives them.

### 3.3 Multiple Input Support

Generalize from one external input to N named inputs:

```typescript
interface EffectGraphSpec {
  externalInputs: Array<{
    id: string;           // e.g., "canvas", "depth_mask", "camera_feed"
    resolution: ResolutionMode;
    required: boolean;
  }>;
}
```

The bridge provides these buffers before starting the graph:
```gdscript
graph_executor.set_input_buffer("canvas", canvas_texture)
graph_executor.set_input_buffer("depth_mask", mask_texture)
```

### 3.4 Multiple Output Support

For graphs that produce multiple outputs:

```typescript
interface EffectGraphSpec {
  outputs: Array<{
    id: string;
    sourceNode: string;
    sourceOutput: string;
  }>;
}
```

### 3.5 Mask Routing

Masks are just buffers. No special infrastructure — the shader author decides which channel to sample:

```glsl
uniform sampler2D mask_buffer;
float mask = texture(mask_buffer, UV).r;
COLOR = mix(background, foreground, mask);
```

---

## Phase 4: Multi-Pass Chains

Goal: Support A → B → C → screen pipelines.

### 4.1 Non-Feedback Passes

Support linear chains where intermediate buffers get their own pooled `SubViewport`. The compiler already handles topological ordering — the runtime allocates viewports from the pool and enforces render order via `_enforce_render_order()`.

### 4.2 Mixed Chains + Feedback

A chain where one node has feedback and others don't:

```
Node A (ping-pong feedback blur) → Buffer X
Node B (reads X, applies vignette) → Screen
```

Node A uses ping-pong (pooled viewports). Node B is a single-pass that reads A's output viewport.

### 4.3 Shader Fusion (Future)

For chains of simple passes (color grade → vignette → scanlines), the compiler could fuse them into a single uber-shader pass. The `fusible` flag on `EffectNode` already exists in the type system. Implementation deferred.

### Phase 5: Parameter Introspection & Live Shader Compilation (~3-4 days)

Goal: Unify parameter metadata, enable live uniform editing without graph rebuild, kill pre-baked .gdshader files.

#### 5.1 Unify Parameter Schema (Single Source of Truth)

Currently there are THREE places defining effect parameters:
- `EffectParamMeta` in `metadata.ts` — UI metadata (displayName, min, max, step, type: number/color/boolean/select)
- `NodeTypeRegistration.paramsSchema` in `registry.ts` — Registry metadata (name, type: float/int/vec2/vec3/vec4/color/bool, range)
- `EffectNode.params` in `types.ts` — Runtime values only (`Record<string, ParamValue>`, no metadata)

This duplication causes drift and makes it impossible for a downstream consumer (like a tuning panel) to get complete metadata from a single place.

**Design**: Create a unified `EffectParamSchema` that combines both:

```typescript
// New unified type in types.ts
export interface EffectParamSchema {
  key: string;
  uniformName: string;        // The actual GLSL uniform name
  type: UniformType;          // 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'bool'
  defaultValue: ParamValue;
  // UI hints (optional — omitted for params not shown in UI)
  ui?: {
    displayName: string;
    category?: string;        // For grouping in panels
    min?: number;
    max?: number;
    step?: number;
    options?: string[];       // For select-type params
    description?: string;
  };
}
```

**Migration**:
- `EffectParamMeta` in metadata.ts → deprecated, derive from `EffectParamSchema`
- `NodeTypeRegistration.paramsSchema` → use `EffectParamSchema[]` instead
- `EffectNode` gets a new optional field: `paramsSchema?: EffectParamSchema[]`
- `CompiledPass.paramsSchema` already has `UniformDeclaration[]` — extend to carry UI hints

**File changes**:
| File | Change |
|------|--------|
| `shared/src/effects/types.ts` | Add `EffectParamSchema` interface, add `paramsSchema?: EffectParamSchema[]` to `EffectNode` |
| `shared/src/effects/metadata.ts` | Deprecation comment, add adapter function `toEffectParamSchema()` |
| `shared/src/effects/registry.ts` | Update `NodeTypeRegistration.paramsSchema` to use `EffectParamSchema[]` |
| `shared/src/effects/compiler.ts` | Thread `paramsSchema` through to `CompiledPass` |

#### 5.2 Uniform Hot-Path (Live Param Editing Without Graph Rebuild)

Currently, changing a param value requires rebuilding the entire graph (`apply_plan()`). For live editing (slider dragging), we need a fast path that pushes values directly to shader uniforms.

**Design**: New bridge method `effects_update_params(nodeId, params)` that:
1. TypeScript calls `bridge.effectsUpdateParams(nodeId, { intensity: 0.7, color: '#ff0000' })`
2. Bridge finds the active `ShaderMaterial` for that node's pass
3. Calls `shader_material.set_shader_parameter(key, value)` for each changed param
4. No graph rebuild, no viewport reallocation — just uniform updates

GraphExecutor.gd already has `_apply_params()` which does exactly this — it iterates params and calls `set_shader_parameter()`. The hot-path method reuses this logic on an existing material.

**File changes**:
| File | Change |
|------|--------|
| `GraphExecutor.gd` | Add `update_params(pass_id, params)` method that finds active material and calls `set_shader_parameter()` per param |
| `GameBridgeEffects.gd` | Add `effects_update_params` bridge method, register in all 3 places |
| TypeScript bridge files | Add `effectsUpdateParams(nodeId, params)` to interface + web/native impls |

#### 5.3 Effect Tuning Panel (React Component)

Follow the pattern of the game engine's `TuningPanel` → `TunableSlider` system (from `VariableWithTuning` in `GameDefinition.ts`), but for effects.

**Design**: `EffectTuningPanel` React component that:
1. Receives the active `EffectGraphSpec` and its unified `EffectParamSchema[]`
2. Renders sliders, color pickers, toggles, and select dropdowns per param
3. On change, calls `bridge.effectsUpdateParams(nodeId, { [key]: newValue })` (the hot-path from §5.2)
4. Supports grouping by `ui.category`

This mirrors how `TuningPanel` works for game variables — `VariableWithTuning` has `{ value, tuning: { min, max, step }, category, label, description }` and the panel auto-generates controls from that metadata.

**File changes**:
| File | Change |
|------|--------|
| New: `app/components/effects/EffectTuningPanel.tsx` | React component with sliders/pickers per param |
| New: `app/components/effects/EffectParamControl.tsx` | Individual param control (number→slider, color→picker, bool→toggle, select→dropdown) |

#### 5.4 Kill Pre-Baked .gdshader Files — Live Compilation

Currently `GraphExecutor.gd` has `SPRITE_SHADER_PATHS` (15 entries) and `POST_SHADER_PATHS` (19 entries) mapping effect names to pre-baked `.gdshader` files on disk. The `_resolve_shader()` method loads these via `load()`.

**Goal**: Move all builtin shader source code into the TypeScript registry as inline GLSL strings. The registry becomes the single source of truth for shader code. When a plan is sent to Godot, it always uses `{ type: "custom", glsl: "..." }` — the `builtin` path becomes a thin lookup in the TS registry that resolves to inline GLSL before compilation.

**Migration**:
1. For each entry in `SPRITE_SHADER_PATHS` and `POST_SHADER_PATHS`, read the `.gdshader` file content
2. Store the GLSL source as a string in the TS registry (in `NodeTypeRegistration` or a new `shaderLibrary` map)
3. The compiler resolves `{ type: "builtin", effectType: "blur" }` by looking up the GLSL from the registry and converting to `{ type: "custom", glsl: "..." }` in the `CompiledPass`
4. Remove `SPRITE_SHADER_PATHS`, `POST_SHADER_PATHS`, `EFFECT_TYPE_TO_SHADER`, and `_resolve_builtin_shader_path()` from `GraphExecutor.gd`
5. All shaders now flow through `_build_custom_shader()` — one code path, no file system dependency

**Advantages**:
- Single source of truth for shader code (TypeScript registry)
- AI can generate and modify shaders without touching GDScript or the file system
- No `.gdshader` files to maintain, sync, or accidentally drift from metadata
- Hot reload of shader code (change GLSL in registry → recompile plan → apply)

**File changes**:
| File | Change |
|------|--------|
| New: `shared/src/effects/shaderLibrary.ts` | Map of effectType → inline GLSL source strings |
| `shared/src/effects/compiler.ts` | Resolve `builtin` shaderSource to `custom` with inline GLSL before outputting CompiledPass |
| `GraphExecutor.gd` | Remove `SPRITE_SHADER_PATHS`, `POST_SHADER_PATHS`, `EFFECT_TYPE_TO_SHADER`, `_resolve_builtin_shader_path()`. All shaders now come as `{ type: "custom" }` |
| `ShaderWarmer.gd` (Phase 2) | Warm from compiled plan's custom GLSL instead of loading from file paths |

**Risk**: Inline GLSL strings in TypeScript can be large. Mitigate by lazy-loading shader library modules (only import the ones the current graph needs).

### Phase 6: Shader Library & Parametric Building Blocks (~2-3 days)

Goal: Organize shaders into composable, parametric building blocks with rich metadata for AI authoring and gallery browsing.

#### 6.1 Shader Library Registry

Formalize the shader library from §5.4 into a structured registry where each shader has:
- GLSL source code
- Parameter schemas (from unified `EffectParamSchema`)
- AI description and aliases (from `NodeTypeRegistration.aiHints`)
- Combinability constraints
- Preview thumbnails (generated on demand)

#### 6.2 Parametric Shader Templates

Some shader patterns are parameterizable beyond simple uniforms — they involve structural changes to the GLSL (e.g., number of blur passes, blend mode selection). Support shader templates with template variables:

```typescript
interface ShaderTemplate {
  glslTemplate: string;       // GLSL with {{placeholders}}
  templateParams: {
    name: string;
    type: 'int' | 'enum';
    options?: string[];
    default: string | number;
  }[];
  // Resolved at compile time, not runtime (unlike uniforms)
}
```

### Phase 7: Live Reload & Hot Swap (~2-3 days)

Goal: Change any part of the graph (params, shaders, connections) while it's running, without restarting.

#### 7.1 Param Hot-Swap (from Phase 5.2)
Already done — uniform updates without rebuild.

#### 7.2 Shader Hot-Swap
Replace a node's shader code while the graph is running:
1. Compile new shader from GLSL string
2. Swap the material on the active viewport's ColorRect
3. Rebind all uniforms (params + textures)
4. No viewport reallocation needed if inputs/outputs haven't changed

#### 7.3 Graph Hot-Swap (Topology Changes)
When the graph topology changes (add/remove node, change connection):
1. Diff old plan vs new plan
2. Reuse unchanged viewports/materials
3. Only rebuild the changed subgraph
4. This is the most complex hot-swap — defer if topology changes are rare during live editing

### Phase 8: AI Authoring Pipeline (~3-4 days)

Goal: Users describe effects in natural language, AI generates EffectGraphSpec.

#### 8.1 Prompt → Spec Generation
- Feed the shader library metadata + parameter schemas to an LLM
- LLM outputs an EffectGraphSpec JSON
- Validate, compile, preview

#### 8.2 Iterative Refinement
- User sees preview, describes adjustments ("make it more blue", "add a vignette")
- AI patches the spec (not regenerate from scratch)
- Hot-swap updates the running effect

#### 8.3 Spec Database & Sharing
- Store EffectGraphSpec in database (Supabase)
- Gallery browsing with animated previews
- Remix: clone and modify someone else's spec

### Phase 9: Visual Node Editor (~4-5 days, future)

Goal: React Flow-based visual editor for power users who want to wire nodes manually.

The data model already supports this — EffectGraphSpec IS the node graph. The visual editor reads and writes EffectGraphSpec, same as the AI.

Key considerations:
- React Flow renders the graph, EffectGraphSpec is the data model
- Drag connections = add to `connections[]` / `feedbackEdges[]`
- Add node = add to `nodes[]`
- Parameter sliders inline on each node (using EffectParamSchema)
- Hot-swap on every edit (Phase 7)

### Phase 10: Legacy Cleanup & Full Migration (~2-3 days)

Goal: Zero technical debt. Every example works on the new system. All deprecated patterns, dead code, and legacy files are removed. The codebase has one way to do everything.

This phase runs AFTER the new systems are proven working. It is a pure cleanup pass — no new features, only removals and migrations.

#### 10.1 Delete Pre-Baked .gdshader Files

After Phase 5.4 migrates all shader source into the TypeScript shader library, the 37 `.gdshader` files under `godot_project/shaders/` are dead code:

- `godot_project/shaders/sprite/` — 15 files (silhouette, tint, wave, rim_light, rainbow, pixelate, posterize, outline, inner_glow, holographic, glow, drop_shadow, flash, dissolve, color_matrix)
- `godot_project/shaders/post_process/` — 21 files (underwater, vignette, thermal_vision, speed_lines, shockwave, shimmer, ripple, scanlines, old_film, pixelate_screen, motion_blur, night_vision, fog_of_war, crt, halftone, glitch, chromatic_aberration, color_grading, blur, bloom, ascii)
- `godot_project/shaders/grid.gdshader` — 1 file

**Action**: Delete all `.gdshader` files. Remove any `.gdshader.import` files Godot generated. Clean up `godot_project/.godot/imported/` references if needed.

#### 10.2 Remove `EffectParamMeta` and Legacy Metadata

Phase 5.1 introduces the unified `EffectParamSchema` and adds an adapter `toEffectParamSchema()` during transition. Phase 10 finishes the job:

- Delete the `EffectParamMeta` interface from `metadata.ts`
- Delete the `toEffectParamSchema()` adapter function
- Migrate all consumers to use `EffectParamSchema` directly:
  - `effects_test.tsx` — imports `EffectParamMeta` and `EFFECT_METADATA` from metadata.ts, uses `renderParamControl(param: EffectParamMeta)`. Rewrite to use `EffectParamSchema` and `EffectTuningPanel` (or `EffectParamControl`)
  - `index.ts` — re-exports `EffectParamMeta`. Remove the export
- If `EFFECT_METADATA` (the static metadata registry in `metadata.ts`) is still used, migrate its data into the `NodeTypeRegistration` entries in `registry.ts` and delete `EFFECT_METADATA`
- If `metadata.ts` is empty after cleanup, delete the file entirely

#### 10.3 Remove `entity_input` / `__entityTexture` Everywhere

Phase 2 removes the three-buffer pattern from the runtime. Phase 10 ensures no traces remain:

**GDScript:**
- `ResourceGraph.gd` — remove the `__entityTexture` special case (line ~166)
- `GraphExecutor.gd` — remove all `__entityTexture` references (lines ~114, ~338, ~600, ~605), remove `set_entity_texture()`, remove any `_entity_texture` variable
- `GameBridgeEffects.gd` — remove `_bind_entity_textures()`, `_find_entity_texture()` if not already done in Phase 2

**TypeScript:**
- `resources.ts` — remove `'entityTexture'` from `ResourceKind` type, remove `__entityTexture` implicit resource creation (line ~129, ~156)
- `compiler.ts` — remove any `__entityTexture` implicit binding logic

**Tests:**
- `resources.test.ts` — remove/rewrite all `__entityTexture` and `entityTexture` assertions (~10 references)
- `compiler.test.ts` — remove/rewrite `entity_input` binding assertions (~5 references)

**Examples:**
- `paint.tsx` — remove `entity_input` uniform declarations from all 4 shader strings (lines ~66, ~90, ~111, ~133), remove `entity_input` from `inputSlots` (line ~188), update shaders to use the new draw-container approach

#### 10.4 Remove `builtin` Shader Source Type

After Phase 5.4, the compiler resolves all `builtin` references to `custom` GLSL before sending to Godot. Phase 10 removes the `builtin` type entirely:

- `types.ts` — simplify `ShaderSource` from `{ type: "builtin" } | { type: "custom" }` to just `{ glsl: string }` (or keep `custom` as the only option)
- `GraphExecutor.gd` — remove the `builtin` branch in `_resolve_shader()`, remove `_resolve_builtin_shader_path()`
- `compiler.ts` — if `builtin` is still accepted at the spec level for convenience, it MUST be resolved to inline GLSL before output. The `CompiledPass` should never contain `builtin`
- All examples and tests — update any specs still using `{ type: "builtin" }` to either use the registry lookup helper or inline GLSL

#### 10.5 Remove Pixel Coordinate APIs (If Dual-Mode Exists)

Phase 1 introduces normalized coordinates. If a backwards-compatible pixel coordinate mode was kept during transition:

- Remove the pixel coordinate code path from `PixelBufferManager.gd` and `GameBridgeEffects.gd`
- Remove any `coordMode` or `useNormalized` flags
- All draw commands accept normalized (0-1) coordinates only
- Update any examples still using pixel coordinates

#### 10.6 Migrate ALL Examples to New System

Every example that uses effects must work with the new architecture. Full list of examples using effects:

| Example | Uses | Migration Needed |
|---------|------|------------------|
| `paint.tsx` | `EffectGraphSpec`, `entity_input`, inline shaders | Remove `entity_input`, use draw containers, normalized coords |
| `effects_test.tsx` | `EffectParamMeta`, `EFFECT_METADATA`, sprite/post effects | Migrate to `EffectParamSchema`, use `EffectTuningPanel`, shaders from registry |
| `multipass_test.tsx` | `EffectGraphSpec`, multi-pass chains | Verify works with new compiler (no `builtin` in output) |
| `shader_test.tsx` | `applyEffect`, sprite effects | Verify works with live-compiled shaders |
| `vfx_showcase.tsx` | Visual effects showcase | Verify all showcased effects work |
| `dynamic_shader.tsx` | Dynamic shader creation | Verify custom GLSL path still works |

**Acceptance criteria per example:**
- Loads without errors
- Visual output matches pre-migration behavior (or is intentionally improved)
- No console warnings about deprecated APIs
- Uses only the new unified types and APIs

#### 10.7 Test Suite Overhaul

- All test files under `shared/src/effects/__tests__/` must pass with no skips
- Remove all test cases that assert old behavior (`entityTexture` resource kind, `builtin` shader resolution, `entity_input` implicit binding)
- Add test cases for the new behavior (inline GLSL resolution, `EffectParamSchema` threading, uniform hot-path)
- Compiler tests must verify that `CompiledPass` never contains `{ type: "builtin" }` shader sources

#### 10.8 Dead Code Sweep

Final pass to catch anything missed:

- `grep -r` for: `entity_input`, `entityTexture`, `__entityTexture`, `SPRITE_SHADER_PATHS`, `POST_SHADER_PATHS`, `EFFECT_TYPE_TO_SHADER`, `_resolve_builtin_shader_path`, `EffectParamMeta`, `toEffectParamSchema`, `gdshader`
- Any hits that aren't in documentation or changelogs → delete
- Run `tsc --noEmit` to verify no broken imports
- Run full test suite
- Run build

**File changes**:
| File | Change |
|------|--------|
| `godot_project/shaders/sprite/*.gdshader` (15 files) | DELETE |
| `godot_project/shaders/post_process/*.gdshader` (21 files) | DELETE |
| `godot_project/shaders/grid.gdshader` | DELETE |
| `shared/src/effects/metadata.ts` | Remove `EffectParamMeta`, `toEffectParamSchema()`, possibly delete file |
| `shared/src/effects/index.ts` | Remove `EffectParamMeta` re-export |
| `shared/src/effects/types.ts` | Simplify `ShaderSource` type |
| `shared/src/effects/resources.ts` | Remove `entityTexture` from `ResourceKind` |
| `shared/src/effects/compiler.ts` | Remove `builtin` handling (if not already) |
| `ResourceGraph.gd` | Remove `__entityTexture` special case |
| `GraphExecutor.gd` | Remove all legacy paths (`builtin`, `entity_texture`, pixel coords) |
| `GameBridgeEffects.gd` | Remove legacy bridge methods |
| `PixelBufferManager.gd` | Remove pixel coordinate fallback (if exists) |
| `app/app/examples/paint.tsx` | Full migration to new APIs |
| `app/app/examples/effects_test.tsx` | Migrate to `EffectParamSchema` + `EffectTuningPanel` |
| `app/app/examples/multipass_test.tsx` | Verify + update if needed |
| `app/app/examples/shader_test.tsx` | Verify + update if needed |
| `app/app/examples/vfx_showcase.tsx` | Verify + update if needed |
| `app/app/examples/dynamic_shader.tsx` | Verify + update if needed |
| `shared/src/effects/__tests__/*.test.ts` | Remove old assertions, add new ones |

---

## File Change Summary

### Phase 1 (Draw-During-Animation + Normalized Coords)

| File | Change |
|------|--------|
| `PingPongManager.gd` | Add `Node2D` draw containers per viewport, `add_stroke()`, `add_stamp()`, `clear_draw_container()` |
| `GraphExecutor.gd` | Call `clear_draw_container()` in `_process()` after swap |
| `GameBridgeEffects.gd` | Route draws to scene-graph nodes during animation; convert normalized→viewport coords |
| `PixelBufferManager.gd` | Accept normalized coords at public API, convert to pixel coords internally |
| `paint.tsx` | Update draw commands to use normalized coordinates |

### Phase 2 (Viewport Pool + Shader Warming + Cleanup)

| File | Change |
|------|--------|
| **New** `ViewportPool.gd` | Pre-allocated SubViewport pool with acquire/release |
| **New** `ShaderWarmer.gd` | Pre-compile all builtin shaders at startup; warm custom shaders at apply_plan |
| `PingPongManager.gd` | Use pool instead of `SubViewport.new()` |
| `ResourceGraph.gd` | Use pool instead of `SubViewport.new()`; remove `__entityTexture` handling |
| `GraphExecutor.gd` | Initialize pool at startup; remove `_entity_texture`, `set_entity_texture()` |
| `GameBridgeEffects.gd` | Remove `_bind_entity_textures()`, `_find_entity_texture()` |
| `compiler.ts` | Remove implicit `__entityTexture` binding |
| `resources.ts` | Remove `entityTexture` resource kind |
| `compiler.test.ts` | Update inputBindings assertions |
| `resources.test.ts` | Update implicit binding tests |

### Phase 3 (Render Ordering + Generalized Buffers)

| File | Change |
|------|--------|
| `GraphExecutor.gd` | Add `_enforce_render_order()`, call after `_build_passes()`; add `set_input_buffer()`, buffer registry |
| `ResourceGraph.gd` | Support N named external textures |
| `types.ts` | Add `externalInputs` and `outputs` to `EffectGraphSpec` |
| `compiler.ts` | Compile external input declarations |

### Phase 4 (Multi-Pass Chains)

| File | Change |
|------|--------|
| `GraphExecutor.gd` | Support mixed ping-pong + single-pass in one graph |
| `ResourceGraph.gd` | Allocate intermediate viewports from pool |

### Phase 5 (Parameter Introspection + Live Shader Compilation)

| File | Change |
|------|--------|
| `shared/src/effects/types.ts` | Add `EffectParamSchema` interface, add `paramsSchema?: EffectParamSchema[]` to `EffectNode` |
| `shared/src/effects/metadata.ts` | Deprecation comment, add adapter function `toEffectParamSchema()` |
| `shared/src/effects/registry.ts` | Update `NodeTypeRegistration.paramsSchema` to use `EffectParamSchema[]` |
| `shared/src/effects/compiler.ts` | Thread `paramsSchema` through to `CompiledPass`; resolve `builtin` to `custom` GLSL |
| **New** `shared/src/effects/shaderLibrary.ts` | Map of effectType → inline GLSL source strings |
| `GraphExecutor.gd` | Add `update_params()`; remove `SPRITE_SHADER_PATHS`, `POST_SHADER_PATHS`, etc. |
| `GameBridgeEffects.gd` | Add `effects_update_params` bridge method |
| **New** `app/components/effects/EffectTuningPanel.tsx` | React component for live parameter editing |
| **New** `app/components/effects/EffectParamControl.tsx` | Individual param control components |

### Phase 10 (Legacy Cleanup & Full Migration)

| File | Change |
|------|--------|
| `godot_project/shaders/sprite/*.gdshader` (15 files) | DELETE |
| `godot_project/shaders/post_process/*.gdshader` (21 files) | DELETE |
| `godot_project/shaders/grid.gdshader` | DELETE |
| `shared/src/effects/metadata.ts` | Remove `EffectParamMeta`, `toEffectParamSchema()`, possibly delete file |
| `shared/src/effects/index.ts` | Remove `EffectParamMeta` re-export |
| `shared/src/effects/types.ts` | Simplify `ShaderSource` (remove `builtin` variant) |
| `shared/src/effects/resources.ts` | Remove `entityTexture` from `ResourceKind` |
| `shared/src/effects/compiler.ts` | Remove any remaining `builtin` handling |
| `ResourceGraph.gd` | Remove `__entityTexture` special case |
| `GraphExecutor.gd` | Remove all legacy paths |
| `GameBridgeEffects.gd` | Remove legacy bridge methods |
| `PixelBufferManager.gd` | Remove pixel coordinate fallback |
| 6 example files | Full migration to new APIs |
| `shared/src/effects/__tests__/*.test.ts` | Remove old assertions, add new ones |

---

## Execution Order & Estimates

**Phase 1** is the immediate fix — it unblocks the paint example using Godot-native scene-graph drawing instead of CPU pixel blitting. The normalized coordinate system future-proofs the bridge API. **~2 days.**

**Phase 2** is infrastructure hardening — viewport pooling eliminates instantiation stutter, shader pre-warming eliminates compilation stutter, and entity_input cleanup removes the three-buffer legacy. **~2 days.**

**Phase 3** is the ordering guarantee + generalization that enables the full vision (multi-input graphs, masks, etc.). **~2 days.**

**Phase 4** builds on the clean foundation for multi-pass pipelines. **~2-3 days.**

**Phase 5** unifies parameter metadata and enables live shader compilation, killing the dependency on pre-baked files. **~3-4 days.**

**Phase 6** formalizes the shader library into a parametric building block system. **~2-3 days.**

**Phase 7** adds live reload and hot-swap capabilities for real-time iteration. **~2-3 days.**

**Phase 8** implements the AI authoring pipeline for natural language effect generation. **~3-4 days.**

**Phase 9** adds a visual node editor for power users (future). **~4-5 days.**

**Phase 10** is the final cleanup — delete all `.gdshader` files, remove deprecated types (`EffectParamMeta`, `builtin` shader source, `entityTexture`), migrate every example, and verify zero legacy patterns remain in the codebase. **~2-3 days.**

**Total estimate**: ~25-31 days to get from current state to a complete, zero-debt, AI-powered, visual effects authoring system.

---

## Open Questions (Updated)

### Resolved

- ~~**Aspect ratio for normalized coords**~~ → Width is relative to viewport height. Documented in §1.2.
- ~~**JSON parse overhead**~~ → Flat `[x,y,x,y]` arrays. Documented in §1.2.
- ~~**Viewport state leaks**~~ → Scorched-earth `_reset_viewport_state()`. Documented in §2.1.
- ~~**`queue_free()` scene tree delay**~~ → `remove_child()` first everywhere. Documented in §1.1.
- ~~**Parameter metadata unification**~~ → Resolved by unified `EffectParamSchema` in Phase 5.1.
- ~~**Pre-baked .gdshader migration**~~ → Resolved by live compilation in Phase 5.4.

### Open

1. **Line2D node count budget**: How many `Line2D` nodes can accumulate in a single frame's draw container before performance degrades? The Lorien drawing app splits strokes every ~1024 points. We should enforce a similar budget — either max points per `Line2D` or max nodes per container.

2. **Viewport pool sizing**: The initial pool of 10 is a guess. Should we profile on web (where SubViewport perf is worst) to find the right number? Should the pool grow dynamically, or hard-cap with an error?

3. **Normalized coord compatibility**: Existing paint example uses pixel coordinates. Do we migrate all existing draw calls to normalized in Phase 1, or keep pixel coords as a backwards-compatible mode and add normalized as a new mode?

4. **Shader warming latency**: Pre-warming all builtin shaders at startup adds load time. Should we lazy-warm (compile on first use but hide behind a loading screen) or eager-warm (compile everything at startup)?

5. **Determinism**: Should the same graph spec + same inputs produce identical output across devices? (Important for sharing/thumbnails.) The scene-graph approach should be more deterministic than CPU pixel blitting since GPU rendering is standardized via the shader pipeline.

6. **Bake-on-stop at high resolutions**: The `get_image()` stall is 20–50ms at 4K. Is this acceptable for the target UX? Should we cap the effect resolution to something lower (e.g., 1080p) to keep bake time under 10ms?

7. **`_reset_viewport_state()` completeness**: The scorched-earth reset covers the properties we know about. Godot may add new SubViewport properties in future versions. Should we maintain a "known properties" checklist and audit it on Godot upgrades?

8. **Shader template complexity**: How complex should parametric shader templates get before we just tell users to write custom GLSL? Should we support full AST manipulation or stick to simple string replacement?
