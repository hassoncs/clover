# Effects System Complete Execution Plan — All 10 Phases

## Vision

Build a ShaderToy/TouchDesigner-like system where a JSON declarative interface (`EffectGraphSpec`) lets anyone — with AI assistance — assemble and compose complex shader effects. Parameters are introspectable with live-editable controls, all shaders compile from inline GLSL (no pre-baked files), and the data model supports both AI authoring and visual node editing.

**Total estimate**: ~35-45 days across all 10 phases.

---

## Review Notes (2026-02-09)

Review of the plan against the actual codebase identified corrections below. Each finding is marked with ⚠️ in the relevant phase.

**Already implemented (plan didn't realize):**
- Phase 3.1 topological sort — already exists in `compiler.ts` (Kahn's algorithm, lines 90-141)
- Phase 5.2 uniform hot-path — `update_params()` already exists in `GraphExecutor.gd:158` and `GameBridgeEffects.gd:564`

**Critical sequencing fixes:**
- Phase 2.5 entity_input removal split into safe stages (remove from shaders in Phase 2, replace infrastructure in Phase 3, verify in Phase 10)
- Phase 5.5 `.gdshader` deletion deferred to Phase 10 (keep as fallback reference through Phases 5-9)
- ViewportPool ownership explicitly assigned to GraphExecutor

**Underestimated tasks (re-estimated):**
- Phase 5.4 shader library: `quick` → `unspecified-high` (~2-3 days, 37 shaders to transcribe)
- Phase 7.3 graph hot-swap: 1 task → 4 subtasks (~3-5 days, consider deferring)
- Phase 4.3 fluid sim demo: moved to non-blocking showcase

**Added tasks:**
- Phase 1.5: bake-on-stop debounce guard
- Phase 5.4a: bundle size measurement before committing to inline GLSL
- Phase 8.5: GLSL validation pipeline (compile in hidden viewport, retry on error)

### Risk Register

| # | Risk | Severity | Likelihood | Mitigation |
|---|------|----------|------------|------------|
| 1 | Shader compilation stutter on WebGL (200-500ms per `Shader.new()`) | High | High | ShaderWarmer must warm custom shaders before `apply_plan()` returns. Add async warm-and-callback pattern. |
| 2 | `get_image()` stall on bake-on-stop (50-100ms on mobile WebGL) | Medium | High | Debounce guard added to Phase 1.5 — skip bake if `_frames_since_start < 3`. |
| 3 | Inline GLSL bundle size (~50-100KB for 37 shaders) | Medium | Medium | Bundle size measurement in Phase 5.4a. Use dynamic imports if delta > 100KB. |
| 4 | Graph hot-swap (Phase 7.3) dramatically underestimated | High | High | Expanded to 4 subtasks. Can be deferred if AI authoring only needs param + shader hot-swap. |
| 5 | AI-generated GLSL fails on mobile (precision qualifiers, texture functions) | Medium | High | GLSL validation pipeline added as Phase 8 Task 5 — compile in hidden viewport, retry with error feedback. |

---

## Overview by Phase

| Phase | Focus | Duration | Key Deliverable |
|-------|-------|----------|-----------------|
| 1 | Draw-during-animation via scene graph | ~2 days | Paint example works with shaders running |
| 2 | Viewport pool + shader warming + partial cleanup | ~2 days | No instantiation stutter, entity_input removed from shaders |
| 3 | Render ordering + generalized buffers | ~2 days | Multi-input graphs, external texture support, scene tree reorder |
| 4 | Multi-pass chains | ~2-3 days | Complex pipelines (A→B→C→screen) |
| 5 | Param introspection + live shader compilation | ~4-5 days | Unified schema, inline GLSL library (.gdshader kept as reference) |
| 6 | Shader library + parametric blocks | ~2-3 days | Composable building blocks with metadata |
| 7 | Live reload + hot-swap | ~4-6 days | Change params/shaders/topology without restart |
| 8 | AI authoring pipeline | ~4-5 days | Natural language → EffectGraphSpec (with GLSL validation) |
| 9 | Visual node editor | ~4-5 days | React Flow editor for power users (web only) |
| 10 | Legacy cleanup + full migration | ~2-3 days | Delete .gdshader files, zero technical debt, all examples migrated |

---

## Phase 1: Draw-During-Animation via Scene Graph (~2 days)

**Goal**: Fix the paint example so drawing works while the shader is running, using Godot-native `Line2D`/`Sprite2D` scene-graph nodes instead of CPU pixel blitting.

### Phase 1 Task Dependency Graph

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

### Phase 1 Task 1: PingPongManager Draw Containers

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
   - `add_stroke(buffer_id, flat_points, color, width_norm)` — Create Line2D in write viewport's draw container
   - `add_stamp(buffer_id, uv, texture, color)` — Create Sprite2D for textured stamps
   - `clear_draw_container(buffer_id)` — Remove all children from write draw container (use `remove_child` + `queue_free`)
   - `get_draw_container(buffer_id)` — Return write viewport's draw container

4. In `_release_entry()`, clean up draw containers.

**Acceptance criteria**:
- No GDScript parse errors
- `initialize()` creates draw_container_a and draw_container_b
- `add_stroke()` creates Line2D with correct viewport-space coords
- `clear_draw_container()` uses `remove_child()` before `queue_free()`

---

### Phase 1 Task 2: GraphExecutor Frame Cleanup

**Category**: `quick` | **Skills**: `game-authoring` | **File**: `godot_project/scripts/effects/GraphExecutor.gd`

**What to do**:

In `_process()`, after `_ping_pong_manager.swap(ping_pong_buffer)`, add:
```gdscript
_ping_pong_manager.clear_draw_container(ping_pong_buffer)
```

**Acceptance criteria**:
- `clear_draw_container` is called after `swap` in `_process()`
- No parse errors

---

### Phase 1 Task 3: PixelBufferManager Normalized Coords

**Category**: `quick` | **Skills**: `game-authoring` | **File**: `godot_project/scripts/bridge/PixelBufferManager.gd`

**What to do**:

1. Add `draw_commands_normalized(entity_id, commands)` that accepts normalized (0-1) coordinates
2. Convert normalized to pixels internally (width relative to height)
3. Add JS wrapper `_js_draw_commands_normalized`
4. Keep existing `draw_commands()` unchanged for backwards compatibility

**Acceptance criteria**:
- `draw_commands_normalized` accepts flat `[x,y,x,y,...]` arrays with normalized coords
- Width uses image height (not width)
- Existing `draw_commands()` still works

---

### Phase 1 Task 4: GameBridgeEffects Draw Routing

**Category**: `quick` | **Skills**: `game-authoring` | **File**: `godot_project/scripts/bridge/GameBridgeEffects.gd`

**What to do**:

1. Add `draw_to_active_buffer(entity_id, commands_json)` method:
   - If graph is RUNNING → route to ping-pong draw containers
   - If graph is NOT RUNNING → route to PixelBufferManager

2. Add `_draw_to_ping_pong(commands)` — Forward to PingPongManager.add_stroke/add_stamp

3. Add `_draw_to_pixel_buffer(entity_id, commands)` — Forward to PixelBufferManager.draw_commands_normalized

4. Add JS callback `_js_draw_to_active_buffer` and register in all 3 places (method map, JS bridge, query handler)

**Acceptance criteria**:
- Running graphs get scene-graph draws
- Stopped graphs get pixel buffer draws
- Method registered everywhere

---

### Phase 1 Task 5: Bake-on-Stop Cleanup + Debounce Guard

**Category**: `quick` | **Skills**: `game-authoring` | **File**: `godot_project/scripts/bridge/GameBridgeEffects.gd`

**What to do**:

1. Add `_clear_all_draw_containers()` helper
2. Call it at the start of `stop_graph()` before `_bake_output_to_entity()`
3. ⚠️ **Add bake debounce guard**: Track `_frames_since_start` counter (increment in `_process()`). In `_bake_output_to_entity()`, skip the `get_image()` call if `_frames_since_start < 3`. This prevents a 50-100ms main-thread stall if the user rapidly toggles start/stop.

**Acceptance criteria**:
- Draw containers cleared before bake
- No orphaned Line2D nodes after stop
- Rapid start/stop toggle does not cause visible jank

---

### Phase 1 Task 6: TypeScript Bridge + Paint Example

**Category**: `quick` | **Skills**: `game-authoring` | **Files**: Multiple

**What to do**:

**6a. Types** (`app/lib/godot/types.ts`):
```typescript
export type NormalizedDrawCommand =
  | { type: 'stroke'; points: number[]; color: string; width: number }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; width?: number }
  | { type: 'pixel'; x: number; y: number; color: string }
  | { type: 'fill'; color: string };

export interface GodotBridge {
  // ... existing methods ...
  drawToActiveBuffer(entityId: string, commands: NormalizedDrawCommand[]): void;
}
```

**6b. Web bridge** (`app/lib/godot/GodotBridge.web.ts`):
```typescript
drawToActiveBuffer(entityId: string, commands: NormalizedDrawCommand[]) {
  getGodotBridge()?.drawToActiveBuffer(entityId, JSON.stringify(commands));
}
```

**6c. Native bridge** (`app/lib/godot/GodotBridge.native.ts`):
```typescript
drawToActiveBuffer(entityId: string, commands: NormalizedDrawCommand[]) {
  callGameBridge('draw_to_active_buffer', entityId, JSON.stringify(commands));
}
```

**6d. Mock** (`app/lib/godot/__tests__/mock-godot-bridge.ts`): Add mock

**6e. Paint example** (`app/app/examples/paint.tsx`):
- Add `worldToNormalized` helper
- Convert brush sizes to normalized (relative to viewport height)
- Use `bridge.drawToActiveBuffer()` instead of `pixelBufferDraw`

**Acceptance criteria**:
- TypeScript compiles (`pnpm tsc --noEmit`)
- Paint example uses normalized coords + drawToActiveBuffer API

---

### Phase 1 Task 7: End-to-End Verification

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

**Acceptance criteria**:
- All 8 scenarios pass
- No console errors
- No visual artifacts
- `pnpm tsc --noEmit` clean

---

## Phase 2: Viewport Pool + Shader Warming + Partial Cleanup (~2 days)

**Goal**: Eliminate instantiation stutter, pre-compile shaders, begin `entity_input` cleanup (remove from shaders only — infrastructure replacement deferred to Phase 3).

### Phase 2 Task 1: ViewportPool.gd

**Category**: `quick` | **Skills**: `game-authoring` | **New File**: `godot_project/scripts/effects/ViewportPool.gd`

**What to do**:

Create viewport pool with pre-allocated SubViewports:
```gdscript
class_name ViewportPool
extends RefCounted

var _available: Array[SubViewport] = []
var _in_use: Dictionary = {}  # viewport -> buffer_id
var _size: int

func _init(pool_size: int = 10):
    _size = pool_size
    for i in range(pool_size):
        var vp := _create_viewport()
        _available.append(vp)

func _create_viewport() -> SubViewport:
    var vp := SubViewport.new()
    vp.transparent_bg = true
    vp.handle_input_locally = false
    vp.render_target_update_mode = SubViewport.UPDATE_ONCE
    return vp

func acquire(buffer_id: String, size: Vector2i) -> SubViewport:
    # Return available viewport, reset state, resize, mark in_use

func release(viewport: SubViewport) -> void:
    # Reset viewport state via _reset_viewport_state(), return to available

func _reset_viewport_state(vp: SubViewport) -> void:
    # Clear all render_target flags, size, canvas_cull_mask, etc.
    # Remove all children, clear textures
```

⚠️ **Ownership**: ViewportPool is created as a child of `GraphExecutor` in its `_ready()` method. It is passed to `PingPongManager` via `configure()` and to `ResourceGraph` via a new `configure()` parameter. Neither PingPongManager nor ResourceGraph creates viewports directly.

**Acceptance criteria**:
- Pool creates 10 viewports at init
- `acquire()` returns ready-to-use viewport
- `_reset_viewport_state()` clears all known SubViewport properties
- `release()` returns viewport to pool in clean state
- Integration test: acquire all 10, release 5, acquire 5 more — verify no state leakage

---

### Phase 2 Task 2: ShaderWarmer.gd

**Category**: `quick` | **Skills**: `game-authoring` | **New File**: `godot_project/scripts/effects/ShaderWarmer.gd`

**What to do**:

Create shader pre-compilation system:
```gdscript
class_name ShaderWarmer
extends RefCounted

var _warmed_shaders: Dictionary = {}  # shader_path -> Shader

func warm_builtin_shaders() -> void:
    # Pre-compile all shaders in SPRITE_SHADER_PATHS and POST_SHADER_PATHS
    # Store compiled shaders for reuse

func warm_custom_shader(glsl_code: String) -> Shader:
    # Compile custom GLSL, cache by hash of code
    # Return warmed shader

func get_warmed_shader(path: String) -> Shader:
    # Return pre-warmed builtin shader
```

**Acceptance criteria**:
- All builtin shaders warmed at startup
- Custom shaders warmed on first use and cached
- No stutter on shader compilation during graph execution

---

### Phase 2 Task 3: Integrate Pool into PingPongManager

**Category**: `quick` | **Skills**: `game-authoring` | **File**: `godot_project/scripts/effects/PingPongManager.gd`

**What to do**:

1. Add `_viewport_pool: ViewportPool` member
2. In `initialize()`, acquire viewports from pool instead of `SubViewport.new()`
3. In `_release_entry()`, release viewports back to pool
4. Ensure draw containers are still created/destroyed properly

**Acceptance criteria**:
- No `SubViewport.new()` calls during normal operation
- Viewports acquired from pool at initialize
- Viewports released to pool at cleanup

---

### Phase 2 Task 4: Integrate Pool into ResourceGraph

**Category**: `quick` | **Skills**: `game-authoring` | **File**: `godot_project/scripts/effects/ResourceGraph.gd`

**What to do**:

1. Accept viewport pool in constructor
2. Acquire intermediate viewports from pool instead of instantiating
3. Release on cleanup

**Acceptance criteria**:
- ResourceGraph uses pool for intermediate allocations

---

### Phase 2 Task 5: Remove entity_input from Shaders (Safe Partial Cleanup)

**Category**: `quick` | **Skills**: `game-authoring` | **Files**: Multiple

⚠️ **IMPORTANT**: This is a **partial** removal. The `entity_input` *uniform* in shaders is removed (the old three-buffer pattern). But the `__entityTexture` *infrastructure* for seeding ping-pong buffers on start must be kept — it's still needed until Phase 3 adds `set_input_buffer()` as a replacement.

**What to do**:

**Safe to remove now (shader uniform pattern):**
- `paint.tsx` example shaders: Remove `entity_input` uniform declarations and any shader logic referencing it
- `compiler.test.ts`: Remove entity_input *binding* assertions (the implicit binding to `__entityTexture`)

**Keep for now (seeding infrastructure — replaced in Phase 3):**
- `GraphExecutor.gd`: Keep `_entity_texture`, `set_entity_texture()`, and `_seed_feedback_on_next_frame` — still needed for seeding ping-pong on start
- `ResourceGraph.gd`: Keep `__entityTexture` in `_is_implicit_input()` — still used for initial texture binding
- `GameBridgeEffects.gd`: Keep `_bind_entity_textures()`, `_find_entity_texture()` — still needed to connect pixel buffer sprite to graph
- `resources.ts`: Keep `'entityTexture'` in `ResourceKind` — still used by compiler

**Acceptance criteria**:
- No `entity_input` *uniform* references in shader GLSL code
- Seeding on start still works (pixel buffer content appears in ping-pong pair)
- Paint example still works end-to-end
- All tests pass

---

### Phase 2 Task 6: Verification

**Category**: `quick` | **Skills**: `verification-before-completion`

**Acceptance criteria**:
- No stutter when starting effects (viewport pool working)
- No shader compilation stutter (shader warmer working)
- Paint example still works (no regression from entity_input removal)

---

## Phase 3: Render Ordering + Generalized Buffers (~2 days)

**Goal**: Enable multi-input graphs, external texture inputs, explicit render ordering.

### Phase 3 Task 1: ~~Topological Sort in Compiler~~ ALREADY DONE — Verify Only

⚠️ **Already implemented.** `compiler.ts` lines 90-141 already contain a full topological sort using Kahn's algorithm with stable alphabetical tie-breaking. It handles cycle detection (returns `E_ORDER_CONFLICT` error) and supports ordering constraints.

**What to do**:

Verify the existing topological sort works correctly with the new multi-input graphs from Phase 3 Task 2. No new code needed — just add a test case with a multi-input graph that exercises the sort.

**Acceptance criteria**:
- Existing topo sort handles multi-input graphs correctly (add test)
- No code changes to compiler.ts for this task

---

### Phase 3 Task 2: External Input Support

**Category**: `quick` | **Skills**: `game-authoring` | **Files**: `types.ts`, `compiler.ts`

**What to do**:

1. Add to `EffectGraphSpec`:
```typescript
externalInputs?: Array<{
  name: string;
  dataType: 'texture';
  source: 'screen' | 'camera' | 'url' | 'entity';
}>;
```

2. Compiler generates `inputBindings` for external inputs

**Acceptance criteria**:
- External inputs declared in spec
- Compiler binds them to passes

---

### Phase 3 Task 3: Buffer Registry in GraphExecutor

**Category**: `quick` | **Skills**: `game-authoring` | **File**: `godot_project/scripts/effects/GraphExecutor.gd`

**What to do**:

1. Add `_buffer_registry: Dictionary` — maps buffer name to viewport/texture
2. Add `set_input_buffer(name, texture)` method
3. Add `get_buffer(name)` method
4. Pass registry to ResourceGraph for binding

**Acceptance criteria**:
- Can register external buffers by name
- Passes can read from named buffers

---

### Phase 3 Task 4: Render Order Enforcement

**Category**: `quick` | **Skills**: `game-authoring` | **File**: `godot_project/scripts/effects/GraphExecutor.gd`

**What to do**:

Add `_enforce_render_order()` called after `_build_passes()`:
```gdscript
func _enforce_render_order() -> void:
    # Sort _pass_entries by CompiledPlan order
    # Use move_child() to reorder ColorRect nodes in viewport
```

**Acceptance criteria**:
- Passes render in topological order
- `move_child()` called to reorder scene graph

---

### Phase 3 Task 5: TypeScript External Input Bridge

**Category**: `quick` | **Skills**: `game-authoring` | **Files**: Bridge files

**What to do**:

Add bridge methods:
- `setExternalInput(name, imageData/url)` — Load image into buffer
- `setScreenInput(enable)` — Capture screen as input

**Acceptance criteria**:
- Can set external image inputs
- Can enable screen capture input

---

### Phase 3 Task 6: Replace entity_input Infrastructure with set_input_buffer

**Category**: `quick` | **Skills**: `game-authoring` | **Files**: Multiple

⚠️ **Completes the entity_input removal started in Phase 2.5.** Now that `set_input_buffer()` exists (Task 3), we can remove the legacy seeding infrastructure.

**What to do**:

**GDScript:**
- `GraphExecutor.gd`: Remove `_entity_texture`, `set_entity_texture()`. Seeding now uses `set_input_buffer("pixelBuffer", texture)` via the buffer registry.
- `ResourceGraph.gd`: Remove `__entityTexture` from `_is_implicit_input()`. Entity-scoped graphs declare their input via `externalInputs` (Task 2).
- `GameBridgeEffects.gd`: Remove `_bind_entity_textures()`, `_find_entity_texture()`. Replace with a call to `graph_executor.set_input_buffer("pixelBuffer", pixel_buffer_texture)` during `apply_plan()`.

**TypeScript:**
- `resources.ts`: Remove `'entityTexture'` from `ResourceKind`, remove `__entityTexture` implicit resource creation in `buildResourceGraph()`
- `compiler.ts`: Remove implicit `__entityTexture` binding for unconnected slots on entity-scoped graphs

**Tests:**
- `resources.test.ts`: Remove/rewrite entityTexture assertions
- `compiler.test.ts`: Update implicit binding tests

**Acceptance criteria**:
- No references to `__entityTexture`, `entityTexture`, `_entity_texture`, `set_entity_texture` in codebase
- Entity-scoped graphs use `externalInputs` + `set_input_buffer()` for pixel buffer access
- Seeding on start still works via buffer registry
- All tests pass

---

## Phase 4: Multi-Pass Chains (~2-3 days)

**Goal**: Complex pipelines with multiple named buffers and cross-references.

### Phase 4 Task 1: Named Buffer Support

**Category**: `quick` | **Skills**: `game-authoring` | **Files**: `types.ts`, `compiler.ts`, `resources.ts`

**What to do**:

1. Add `outputs` to `EffectNode`:
```typescript
outputs?: Array<{
  name: string;
  bufferId: string;  // Named buffer this output writes to
}>;
```

2. Compiler allocates named buffers in resource graph
3. Multiple nodes can read from same named buffer

**Acceptance criteria**:
- Nodes can declare named outputs
- Multiple nodes can read same named buffer
- Resource graph allocates each named buffer once

---

### Phase 4 Task 2: Complex Graph Example

**Category**: `quick` | **Skills**: `game-authoring` | **New File**: Example/demo

**What to do**:

Create example with multi-pass chain:
```
Blur pass → writes "blurred"
Vignette pass → reads "blurred", writes "vignetted"
Scanlines pass → reads "vignetted", writes to screen
```

**Acceptance criteria**:
- 3+ node chain works
- Each pass reads correct input
- Visual output is composited correctly

---

### Phase 4 Task 3: Fluid Simulation Demo (Non-Blocking Showcase)

**Category**: `unspecified-high` | **Skills**: `game-authoring` | **New File**: Example/demo

⚠️ **Re-categorized**: Writing a correct Navier-Stokes fluid sim is 2-3 days of shader authoring alone. This is an aspirational showcase, not a Phase 4 gate. Phase 4 is **complete** after Task 2 — the fluid sim can be done any time after Phase 4 infrastructure is in place.

**What to do**:

Create Navier-Stokes fluid simulation using multi-buffer graph:
```
velocity (feedback) → advect → divergence → jacobi (x4) → projection → velocity
pressure (feedback) → jacobi (x4) → projection
dye (feedback) → advect → screen
```

**Acceptance criteria**:
- 2-4 Jacobi iterations per frame (temporal convergence)
- Interactive (mouse injects dye and force)
- 60fps on desktop

---

## Phase 5: Parameter Introspection + Live Shader Compilation (~3-4 days)

**Goal**: Unified param schema, hot-path editing, inline GLSL, kill .gdshader files.

### Phase 5 Task 1: Unified EffectParamSchema

**Category**: `quick` | **Skills**: `game-authoring` | **Files**: `types.ts`, `metadata.ts`, `registry.ts`

**What to do**:

1. Create unified type in `types.ts`:
```typescript
export interface EffectParamSchema {
  key: string;
  uniformName: string;
  type: UniformType;  // 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'bool'
  defaultValue: ParamValue;
  ui?: {
    displayName: string;
    category?: string;
    min?: number;
    max?: number;
    step?: number;
    options?: string[];
    description?: string;
  };
}
```

2. Add `paramsSchema?: EffectParamSchema[]` to `EffectNode`
3. Update `NodeTypeRegistration` to use `EffectParamSchema[]`
4. Deprecate `EffectParamMeta` (add adapter function)

**Acceptance criteria**:
- Single source of truth for param metadata
- UI hints carried through compilation

---

### Phase 5 Task 2: ~~Uniform Hot-Path~~ ALREADY DONE — Verify Only

⚠️ **Already implemented.** The following already exist:
- `GraphExecutor.gd:158` — `update_params(pass_id, params)` method
- `GameBridgeEffects.gd:564` — `update_params(pass_id, params)` public API
- `GameBridgeEffects.gd:104` — `effects.updateParams` query handler
- `GameBridgeEffects.gd:396-401` — `_js_update_params` JS bridge callback

**What to do**:

Verify the existing implementation works correctly with the new `EffectParamSchema` from Task 1. Add TypeScript-side `effectsUpdateParams()` if not already in the bridge interface (check `GodotBridge.web.ts`).

**Acceptance criteria**:
- Existing hot-path works (verify, don't rewrite)
- TypeScript bridge exposes the method
- <1ms latency for uniform updates

---

### Phase 5 Task 3: EffectTuningPanel React Component

**Category**: `visual-engineering` | **Skills**: `frontend-ui-ux`, `game-authoring` | **New Files**: `EffectTuningPanel.tsx`, `EffectParamControl.tsx`

**What to do**:

Create panel that auto-generates controls from `EffectParamSchema`:
```tsx
interface EffectTuningPanelProps {
  spec: EffectGraphSpec;
  onParamChange: (nodeId: string, key: string, value: ParamValue) => void;
}

// Groups params by ui.category
// Renders: number→slider, color→picker, bool→toggle, select→dropdown
// On change: calls bridge.effectsUpdateParams
```

**Acceptance criteria**:
- Auto-generates controls from schema
- Updates uniforms via hot-path
- Groups by category

---

### Phase 5 Task 4: Shader Library (Inline GLSL)

**Category**: `unspecified-high` | **Skills**: `game-authoring` | **New File**: `shared/src/effects/shaderLibrary.ts`

⚠️ **Re-categorized from `quick`**: This involves transcribing 37 shaders (~50-200 lines each), verifying each compiles correctly from a string, and testing visual parity. Estimate ~2-3 days.

**What to do**:

1. **4a. Measure bundle size baseline**: Run `pnpm build` and record JS bundle size. After creating the shader library, measure again. If delta > 100KB, implement dynamic imports (only load shaders referenced by current graph).

2. Create shader library with inline GLSL:
```typescript
export const SHADER_LIBRARY: Record<string, string> = {
  blur: `shader_type canvas_item;
uniform sampler2D current_buffer;
void fragment() {
  // ... blur implementation ...
}`,
  // ... more shaders ...
};
```

3. Read all 37 `.gdshader` files, inline their content
4. Update compiler to resolve `{ type: "builtin", effectType }` to inline GLSL
5. Test every shader — verify it compiles from string and produces identical visual output to the `.gdshader` file version

**Acceptance criteria**:
- All builtin shaders in TypeScript
- Compiler resolves builtin to inline GLSL
- Bundle size impact measured and acceptable (or code-split applied)
- Each shader visually verified

---

### Phase 5 Task 5: ~~Remove .gdshader Files~~ DEFERRED TO PHASE 10

⚠️ **Do NOT delete `.gdshader` files in Phase 5.** Keep them as a reference and fallback through Phases 5-9. If the inline GLSL approach has issues, you can quickly compare against the original files. Phase 10 handles the final deletion after everything is proven working.

**What to do in Phase 5 instead**:
- Remove `SPRITE_SHADER_PATHS`, `POST_SHADER_PATHS`, `EFFECT_TYPE_TO_SHADER` from GraphExecutor.gd
- Remove `_resolve_builtin_shader_path()` method
- All shader resolution now goes through `_build_custom_shader(glsl)` only
- The `.gdshader` files remain on disk but are **not referenced by any code**

**Acceptance criteria**:
- No code references to `.gdshader` file paths
- `.gdshader` files still exist on disk (deleted in Phase 10)
- All shaders compile from inline GLSL

---

### Phase 5 Task 6: Live Shader Compilation Verification

**Category**: `quick` | **Skills**: `verification-before-completion` | **Files**: Tests

**Acceptance criteria**:
- `CompiledPass` never contains `{ type: "builtin" }`
- All tests pass
- Shader hot-swap works (Phase 7)

---

## Phase 6: Shader Library + Parametric Building Blocks (~2-3 days)

**Goal**: Organize shaders into composable, parametric building blocks with rich metadata.

### Phase 6 Task 1: Formalize Shader Library Registry

**Category**: `quick` | **Skills**: `game-authoring` | **File**: `shared/src/effects/registry.ts`

**What to do**:

Extend registry entries with full metadata:
```typescript
interface ShaderLibraryEntry {
  id: string;
  glsl: string;
  paramsSchema: EffectParamSchema[];
  aiHints: {
    description: string;
    aliases: string[];
    category: 'distort' | 'color' | 'blur' | 'generator' | 'composite';
    combinability: string[];  // IDs this shader can be combined with
  };
  previewThumbnail?: string;  // Base64 or URL
}
```

**Acceptance criteria**:
- All shaders have rich metadata
- AI can query registry by description/alias

---

### Phase 6 Task 2: Parametric Shader Templates

**Category**: `quick` | **Skills**: `game-authoring` | **File**: `shared/src/effects/compiler.ts`

**What to do**:

Support compile-time template variables:
```typescript
interface ShaderTemplate {
  glslTemplate: string;  // GLSL with {{placeholders}}
  templateParams: Array<{
    name: string;
    type: 'int' | 'enum';
    options?: string[];
    default: string | number;
  }>;
}

// Example: blur with variable tap count
const blurTemplate: ShaderTemplate = {
  glslTemplate: `
    for(int i = -{{tapCount}}; i <= {{tapCount}}; i++) {
      // ...
    }
  `,
  templateParams: [{ name: 'tapCount', type: 'int', default: 4 }]
};
```

Compile template at graph compilation time (not runtime).

**Acceptance criteria**:
- Templates resolved at compile time
- Generated GLSL is valid
- Template params don't become uniforms

---

### Phase 6 Task 3: Gallery Browser UI

**Category**: `visual-engineering` | **Skills**: `frontend-ui-ux` | **New File**: `app/components/effects/ShaderGallery.tsx`

**What to do**:

Create gallery that:
- Lists all shaders from registry
- Shows thumbnails/previews
- Filters by category
- Click to add to current graph

**Acceptance criteria**:
- Browse all shaders
- Filter by category
- Preview thumbnails render

---

## Phase 7: Live Reload + Hot-Swap (~4-6 days)

**Goal**: Change params, shaders, or topology while running.

### Phase 7 Task 1: Param Hot-Swap (Already Done)

**Status**: Completed in Phase 5.2 (`effects_update_params`)

---

### Phase 7 Task 2: Shader Hot-Swap

**Category**: `quick` | **Skills**: `game-authoring` | **File**: `godot_project/scripts/effects/GraphExecutor.gd`

**What to do**:

Add `hot_swap_shader(pass_id, glsl_code)`:
```gdscript
func hot_swap_shader(pass_id: String, glsl_code: String) -> void:
    var entry = _get_pass_entry(pass_id)
    var material = entry.color_rect.material as ShaderMaterial
    
    # Compile new shader
    var new_shader = Shader.new()
    new_shader.code = glsl_code
    
    # Swap material shader
    material.shader = new_shader
    
    # Re-apply all current params
    _apply_params(entry, entry.params)
```

**Edge case**: New shader has different uniforms.
- Solution: Apply matching uniforms, log warnings for missing/new ones

**Acceptance criteria**:
- Shader changes without graph rebuild
- Uniforms rebound
- No flicker or viewport reallocation

---

### Phase 7 Task 3: Graph Hot-Swap (Topology Changes) (~3-5 days)

**Category**: `deep` | **Skills**: `game-authoring` | **File**: `godot_project/scripts/effects/GraphExecutor.gd`

⚠️ **This is the hardest single feature in the plan.** Expanded from 1 task to 4 subtasks. Consider deferring if AI authoring (Phase 8) only needs param + shader hot-swap.

**Subtask 3a: Plan Diff Algorithm**

Diff old plan vs new plan to produce a changeset:
```typescript
interface PlanDiff {
  kept: string[];      // pass IDs unchanged (reuse viewport+material)
  removed: string[];   // pass IDs deleted
  added: string[];     // pass IDs new
  changed: string[];   // pass IDs with different inputs/shader (rebuild)
  reordered: boolean;  // topology order changed
}
```

**Diff strategy**:
- Passes identified by nodeId
- Same ID + same shader hash + same inputs = reuse
- Same ID + different shader/inputs = rebuild (changed)
- Missing ID = removed, New ID = added

**Subtask 3b: Viewport Reuse Logic**

For `kept` passes, preserve the existing viewport/material/ColorRect. For `removed`, release viewports back to pool. For `added`, acquire from pool and build.

**Subtask 3c: Feedback State Preservation**

For ping-pong passes that are `kept`, the read/write viewport contents must be preserved across the swap. Do NOT reset the ping-pong pair. Only reset if the pass moved from `kept` to `changed`.

**Subtask 3d: Scene Tree Reordering**

If `reordered`, call `_enforce_render_order()` to reorder viewport children without destroying them.

**Acceptance criteria**:
- Adding/removing nodes works without full rebuild
- Existing passes preserved (no state loss, no feedback reset)
- Changed passes rebuilt cleanly
- Scene tree order matches new topology

---

### Phase 7 Task 4: Live Edit Demo

**Category**: `quick` | **Skills**: `game-authoring` | **New File**: Example

**What to do**:

Create demo where user can:
- Edit GLSL in text area
- Click "Apply" → hot-swaps shader
- See result immediately

**Acceptance criteria**:
- Live GLSL editing works
- Errors handled gracefully

---

## Phase 8: AI Authoring Pipeline (~4-5 days)

**Goal**: Natural language → EffectGraphSpec.

### Phase 8 Task 1: Prompt Engineering

**Category**: `unspecified-high` | **Skills**: `writing` | **New File**: `shared/src/effects/aiPrompts.ts`

**What to do**:

Create prompts that:
1. Feed shader library metadata to LLM
2. Request valid EffectGraphSpec JSON
3. Include examples

```typescript
export const EFFECT_GENERATION_PROMPT = `
You are an expert shader effects designer.

Available shaders (with params):
{{shader_library_metadata}}

User request: "{{user_prompt}}"

Generate an EffectGraphSpec JSON:
- Use appropriate shaders from the library
- Set sensible param values
- Wire connections correctly
- Include feedback edges for temporal effects if needed

Output valid JSON only, no markdown.
`;
```

**Acceptance criteria**:
- Prompt produces valid EffectGraphSpec
- Handles common effect descriptions

---

### Phase 8 Task 2: AI Service Integration

**Category**: `quick` | **Skills**: `game-authoring` | **New File**: `shared/src/effects/aiEffects.ts`

**What to do**:

Create service that:
1. Takes user prompt
2. Calls LLM with prompt + shader library
3. Validates returned JSON against schema
4. Returns EffectGraphSpec or error

**Acceptance criteria**:
- Service generates specs from prompts
- Validates output
- Handles errors gracefully

---

### Phase 8 Task 3: Iterative Refinement

**Category**: `quick` | **Skills**: `game-authoring` | **Files**: AI service

**What to do**:

Support adjustment prompts:
- User: "Make it more blue"
- AI patches the spec (changes color param values)
- Hot-swap applies changes

**Strategy**:
- Send current spec + adjustment prompt
- AI returns patch (param changes, not full regeneration)

**Acceptance criteria**:
- Adjustment prompts work
- Changes applied via hot-swap

---

### Phase 8 Task 4: GLSL Validation Pipeline

**Category**: `unspecified-high` | **Skills**: `game-authoring` | **Files**: `aiEffects.ts`, `GameBridgeEffects.gd`

⚠️ **Critical for AI authoring reliability.** LLMs hallucinate shader syntax, use nonexistent uniforms, or produce GLSL that compiles on desktop but fails on mobile (precision qualifiers, texture function differences).

**What to do**:

1. After LLM returns an `EffectGraphSpec`, extract all custom GLSL from the spec
2. Send each shader to Godot for a **validation compile** — compile in a hidden viewport, check for errors
3. If compilation fails, feed the error message back to the LLM with a retry prompt: "This GLSL failed to compile with error: {error}. Fix the shader."
4. Max 3 retries before returning an error to the user
5. Also validate the spec structure itself: check node IDs match across connections, feedbackEdges don't create invalid cycles, required params have values

**Acceptance criteria**:
- Invalid GLSL detected before being shown to the user
- Retry loop fixes common LLM mistakes (missing precision qualifiers, wrong texture function names)
- Spec structural validation catches mismatched IDs
- Clear error messages when validation fails after retries

---

### Phase 8 Task 5: Spec Database + Sharing

**Category**: `quick` | **Skills**: `game-authoring` | **Integration**: Supabase

**What to do**:

1. Database schema for EffectGraphSpec:
   - `id`, `author_id`, `title`, `description`, `spec_json`, `thumbnail_url`, `created_at`, `remix_from`

2. API methods:
   - `saveSpec(spec, metadata)` → store in DB
   - `listSpecs(filter)` → browse gallery
   - `getSpec(id)` → load for remix

3. Remix: Clone spec with new ID, link to original

**Acceptance criteria**:
- Specs saved to database
- Gallery browseable
- Remix creates copy with attribution

---

## Phase 9: Visual Node Editor (~4-5 days)

**Goal**: React Flow-based editor for power users.

⚠️ **Platform note**: React Flow is a web-only library. It will not work on React Native (iOS/Android). This editor is web-only. If a native equivalent is needed in the future, it would require a different library or custom implementation.

### Phase 9 Task 1: React Flow Setup

**Category**: `visual-engineering` | **Skills**: `frontend-ui-ux` | **New File**: `app/components/effects/NodeEditor.tsx`

**What to do**:

Set up React Flow:
```tsx
import ReactFlow, { Controls, Background, applyNodeChanges, applyEdgeChanges } from 'reactflow';

export function NodeEditor() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  
  // Convert EffectGraphSpec to React Flow nodes/edges
  // Handle changes, convert back to EffectGraphSpec
}
```

**Acceptance criteria**:
- React Flow renders
- Nodes/edges from EffectGraphSpec display

---

### Phase 9 Task 2: Custom Node Components

**Category**: `visual-engineering` | **Skills**: `frontend-ui-ux` | **New Files**: Node components

**What to do**:

Create custom nodes:
- `EffectNodeComponent` — Shows shader name, input/output handles
- Inline param controls (sliders) using EffectParamSchema
- Preview thumbnail on node

**Acceptance criteria**:
- Nodes show shader info
- Param controls inline
- Input/output handles for connections

---

### Phase 9 Task 3: Connection Logic

**Category**: `visual-engineering` | **Skills**: `frontend-ui-ux` | **File**: `NodeEditor.tsx`

**What to do**:

Handle connection changes:
```tsx
const onConnect = useCallback((params: Connection) => {
  // Add to EffectGraphSpec.connections
  // Update edges state
}, []);

const onEdgesDelete = useCallback((deleted: Edge[]) => {
  // Remove from EffectGraphSpec.connections
}, []);
```

Support feedback edges (self-connections) with special UI.

**Acceptance criteria**:
- Drag connections adds to graph
- Delete connections removes from graph
- Feedback edges visualized

---

### Phase 9 Task 4: Sync with Runtime

**Category**: `quick` | **Skills**: `game-authoring` | **Files**: `NodeEditor.tsx`, Bridge

**What to do**:

1. On every change: compile spec → send to Godot
2. Use graph hot-swap (Phase 7.3) to apply without restart
3. Show live preview alongside editor

**Acceptance criteria**:
- Editor changes reflect in runtime immediately
- No manual "apply" button needed

---

## Phase 10: Legacy Cleanup + Full Migration (~2-3 days)

**Goal**: Zero technical debt. Everything migrated. All legacy removed.

### Phase 10 Task 1: Delete .gdshader Files (Deferred from Phase 5)

**Category**: `quick` | **Skills**: `game-authoring`

⚠️ **This is the deletion deferred from Phase 5.5.** By now, all shaders have been running from inline GLSL through Phases 5-9. The `.gdshader` files are confirmed dead code.

**What to do**:

Delete all 37 files:
- `godot_project/shaders/sprite/*.gdshader` (15)
- `godot_project/shaders/post_process/*.gdshader` (21)
- `godot_project/shaders/grid.gdshader` (1)

Clean up `.godot/imported/` references.

**Acceptance criteria**:
- No .gdshader files in repo
- No import errors
- All effects still work (they've been using inline GLSL since Phase 5)

---

### Phase 10 Task 2: Remove EffectParamMeta

**Category**: `quick` | **Skills**: `game-authoring` | **Files**: `metadata.ts`, `effects_test.tsx`

**What to do**:

1. Delete `EffectParamMeta` interface
2. Delete `toEffectParamSchema()` adapter
3. Delete `EFFECT_METADATA` registry (migrate data to shaderLibrary)
4. Update `effects_test.tsx` to use `EffectParamSchema` + `EffectTuningPanel`
5. Remove export from `index.ts`
6. If `metadata.ts` empty, delete file

**Acceptance criteria**:
- No `EffectParamMeta` references
- `effects_test.tsx` uses new panel

---

### Phase 10 Task 3: Verify entity_input / __entityTexture Fully Removed

**Category**: `quick` | **Skills**: `game-authoring`

**Already Done**: Phase 2.5 (shader uniform removal) + Phase 3.6 (infrastructure replacement)

Verify no references remain:
```bash
grep -r "entity_input\|entityTexture\|__entityTexture\|_entity_texture\|set_entity_texture\|_bind_entity_textures\|_find_entity_texture" --include="*.gd" --include="*.ts" --include="*.tsx"
```

**Acceptance criteria**:
- Zero grep hits (excluding documentation/changelogs)

---

### Phase 10 Task 4: Remove builtin Shader Source Type

**Category**: `quick` | **Skills**: `game-authoring` | **Files**: `types.ts`, `GraphExecutor.gd`

**What to do**:

1. Simplify `ShaderSource` in `types.ts`:
```typescript
// Before: { type: "builtin" } | { type: "custom", glsl: string }
// After: { glsl: string }
type ShaderSource = { glsl: string };
```

2. Remove `builtin` branch from `_resolve_shader()` in GraphExecutor
3. Update all examples/tests

**Acceptance criteria**:
- No `type: "builtin"` in codebase
- All shaders inline GLSL

---

### Phase 10 Task 5: Remove Pixel Coordinate APIs (if dual-mode)

**Category**: `quick` | **Skills**: `game-authoring`

**What to do**:

If backwards-compatible pixel mode was kept in Phase 1:
- Remove pixel coordinate path
- Remove `coordMode` / `useNormalized` flags
- All APIs use normalized only

**Acceptance criteria**:
- Only normalized coordinates
- All examples updated

---

### Phase 10 Task 6: Migrate All Examples

**Category**: `quick` | **Skills**: `game-authoring`, `verification-before-completion`

| Example | Migration |
|---------|-----------|
| `paint.tsx` | Use `drawToActiveBuffer`, remove `entity_input` |
| `effects_test.tsx` | Use `EffectTuningPanel`, shaders from registry |
| `multipass_test.tsx` | Verify works, update if needed |
| `shader_test.tsx` | Verify works, update if needed |
| `vfx_showcase.tsx` | Verify works, update if needed |
| `dynamic_shader.tsx` | Verify custom GLSL path works |

**Acceptance criteria per example**:
- Loads without errors
- Visual output correct
- No deprecated API usage

---

### Phase 10 Task 7: Test Suite Overhaul

**Category**: `quick` | **Skills**: `game-authoring` | **Files**: `shared/src/effects/__tests__/*.test.ts`

**What to do**:

1. Remove test cases asserting old behavior
2. Add test cases for new behavior
3. Zero skipped tests
4. All tests pass

**Acceptance criteria**:
- `bun test` passes (100%)
- No test skips
- Coverage for: inline GLSL, param schema, hot-path, hot-swap

---

### Phase 10 Task 8: Dead Code Sweep

**Category**: `quick` | **Skills**: `game-authoring`

**What to do**:

Final verification:
```bash
# Grep for all removed symbols
grep -r "entity_input\|entityTexture\|__entityTexture\|SPRITE_SHADER_PATHS\|POST_SHADER_PATHS\|EFFECT_TYPE_TO_SHADER\|_resolve_builtin_shader_path\|EffectParamMeta\|toEffectParamSchema\|\.gdshader" --include="*.gd" --include="*.ts" --include="*.tsx" --include="*.js"

# Type check
cd shared && pnpm tsc --noEmit
cd app && pnpm tsc --noEmit

# Build
pnpm build
```

**Acceptance criteria**:
- Zero grep hits for removed symbols
- Type check clean
- Build succeeds

---

## Execution Commands Summary

```
# Phase 1
wave1: Tasks 1, 3 (parallel)
wave2: Tasks 2, 4, 5 (parallel, after wave1)
wave3: Task 6 (after wave2)
wave4: Task 7 (after wave3)

# Phase 2: Tasks 1-4 can partially parallelize, Task 5 after 1-4, Task 6 after all
# Phase 3: Tasks 1-3 parallel (Task 1 is verify-only), Task 4 after 3, Task 5-6 after 4
# Phase 4: Task 1 first, Task 2 after 1, Task 3 non-blocking (can run anytime after Phase 4 infra)
# Phase 5: Tasks 1-2 parallel (Task 2 is verify-only), Task 3 after 1, Task 4 after 1 (longest), Task 5-6 after 4
# Phase 7: Tasks 1-2 sequential, Task 3 (3-5 days, can be deferred), Task 4 after 2
# Phase 8: Tasks 1-3 sequential, Task 4 after 2, Task 5 after 4

# Dispatch pattern
task(category="quick", load_skills=["game-authoring"], prompt="<Task description>", run_in_background=true)
```

### Execution Advice

1. **Phase 1 is the proof point.** If draw-during-animation works cleanly, the architecture is validated. If it doesn't, stop and reassess.
2. **Run the paint example after every phase.** It exercises draw → start → draw while running → stop → bake → draw. If it breaks, you've regressed.
3. **Phase 5 is the riskiest phase.** It touches the most files. Consider splitting into 5a (param schema + hot-path verify) and 5b (shader library) with a verification checkpoint.
4. **Watch SubViewport count on mobile web.** A fluid sim with 4 feedback buffers = 8 SubViewports. Profile early.
5. **Phase 7.3 (graph hot-swap) can be deferred.** If AI authoring only needs param + shader hot-swap, skip it.

---

## Final Commit Strategy

**Phase 1**: Single squashed commit
```
feat(effects): Phase 1 — draw during animation via scene graph

Replace CPU pixel blitting with Godot-native Line2D/Sprite2D.
Add normalized coordinate bridge. Bake debounce guard. Update paint example.
```

**Phase 2**: Single squashed commit
```
feat(effects): Phase 2 — viewport pool, shader warming, partial entity_input cleanup

Eliminate instantiation stutter. Pre-compile shaders.
Remove entity_input from shader uniforms (infrastructure replaced in Phase 3).
```

**Phase 3**: Single squashed commit
```
feat(effects): Phase 3 — render ordering, external inputs, entity_input infrastructure replaced

Scene tree reorder for render ordering. Buffer registry + set_input_buffer().
Complete entity_input removal (replaced by explicit external inputs).
```

**Phases 4-9**: One commit per phase, or squash related phases

**Phase 10 (final)**: Single commit
```
feat(effects): Phase 10 — legacy cleanup, zero technical debt

Delete 37 .gdshader files. Remove deprecated types.
Migrate all examples. Full test coverage.
```
