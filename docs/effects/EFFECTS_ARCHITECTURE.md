# Effects Architecture

## Overview

The effects system is a node-based shader graph that compiles an authoring-level spec into a runtime execution plan. Shaders compose together via a resource graph — each node reads from input textures and writes to output buffers. Ping-pong feedback is one pattern within this system, not the whole thing.

```
┌─────────────────────────────────────────────────────────────┐
│  Authoring Layer (TypeScript)                               │
│                                                             │
│  EffectGraphSpec  ──compile──▸  CompiledPlan                │
│  (nodes, connections,           (ordered passes,            │
│   feedbackEdges)                 resourceMap,               │
│                                  inputBindings,             │
│                                  feedbackPolicies)          │
└─────────────────────────────┬───────────────────────────────┘
                              │  JSON over bridge
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Runtime Layer (GDScript / Godot)                           │
│                                                             │
│  GameBridgeEffects                                          │
│    ├── ResourceGraph      (texture allocation + binding)    │
│    ├── GraphExecutor      (state machine + per-frame loop)  │
│    └── PingPongManager    (SubViewport pairs for feedback)  │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### EffectGraphSpec (authoring)

The spec is a directed graph of **EffectNodes** connected by **Connections** and **FeedbackEdges**.

```typescript
EffectGraphSpec {
  nodes: EffectNode[]        // shader operations
  connections: Connection[]   // data flow between nodes
  feedbackEdges: FeedbackEdge[]  // temporal loops (frame N-1 → frame N)
}
```

Each **EffectNode** has:
- `inputSlots` — what textures/data it reads (can be connected to another node's output, or left unconnected for implicit binding like `__screenColor`; entity-scoped graphs use `externalInputs` after Phase 3)
- `outputTarget` — which buffer it writes to
- `params` — shader uniforms (floats, vecs, colors)
- `flags.stateful` — whether this node participates in feedback
- `flags.fusible` — hint for future mega-shader optimization

### CompiledPlan (runtime)

The compiler flattens the graph into an ordered list of passes:

```typescript
CompiledPlan {
  passes: CompiledPass[]           // ordered execution
  resourceMap: Record<string, ResourceRef>  // all textures
  feedbackPolicies: Record<string, FeedbackPolicy>
}
```

Each **CompiledPass** has:
- `shaderSource` — the GLSL code (builtin or custom)
- `requires` — input resources (textures to read)
- `provides` — output resources (buffers to write)
- `params.inputBindings` — maps shader uniform names → resource IDs
- `persistence` — `"none"` or `"pingPong"`

### Resource IDs

Resources are identified by string IDs with conventions:

| Pattern | Meaning | Example |
|---------|---------|---------|
| `__screenColor` | The screen's current render | Always available for screen-scoped effects |
| `__entityTexture` | The pixel buffer's ImageTexture | ⚠️ Legacy — replaced by `externalInputs` + `set_input_buffer()` in Phase 3 |
| `{nodeId}:{bufferId}` | An intermediate buffer | `"fx:canvas"` |
| `__feedback:{from}->{to}` | A feedback connection | `"__feedback:fx->fx"` |
| `__pingpong:{passId}` | Internal ping-pong buffer pair | Created by PingPongManager |

## Compilation Pipeline

```
EffectGraphSpec
    │
    ▼
 validateGraph()          — structural checks (cycles, missing refs)
    │
    ▼
 buildResourceGraph()     — allocate ResourceNodes, determine kinds
    │                       (screenColor, entityTexture, intermediate, feedback)
    ▼
 compileGraph()           — topological sort, build CompiledPass list
    │                       with inputBindings, feedbackPolicies
    ▼
 CompiledPlan             — JSON-serializable, sent to Godot
```

The compiler resolves implicit inputs: if a node has an unconnected input slot, the compiler infers the binding from the slot's `dataType` and the graph's scope (e.g., an unconnected `texture` input on a screen-scoped graph binds to `__screenColor`). Entity-scoped graphs should declare their inputs via `externalInputs` after Phase 3.

## Runtime Execution (Godot)

### ResourceGraph.gd

Manages texture allocation and uniform binding.

- `allocate(plan)` — creates SubViewports for intermediate buffers, registers external textures
- `set_external_texture(id, tex)` — injects textures from outside (entity texture, camera, etc.)
- `bind_pass_inputs(pass_data, material)` — sets shader uniforms by looking up resource IDs → actual Texture2D objects
- `get_texture(id)` — resolves a resource ID to its current Texture2D

Importantly, `bind_pass_inputs` is a **point-in-time** operation. If the underlying texture object changes later (e.g., ImageTexture.update()), the shader sees the new content automatically (same object reference). But if the object is **replaced** with a new one, you must rebind.

### GraphExecutor.gd

State machine that orchestrates execution:

```
    apply_plan()
        │
        ▼
      READY ──start()──▸ RUNNING ──stop()──▸ STOPPED
        ▲                    │                    │
        │                 pause()              start()
        │                    ▼                    │
        │                 PAUSED                  │
        │                    │                    │
        └────── reset() ────┘                    │
        └────────────────────────────────────────┘
```

**Per-frame loop** (`_process`):
1. For each ping-pong pass: `swap()` read/write viewports
2. Set feedback texture on the **write** material only (avoids GL feedback loop)
3. Auto-set `texel_size` and `dt` uniforms on both materials
4. Enable only the write viewport for rendering

**On start from STOPPED**: resets ping-pong buffers and rebinds non-feedback inputs so the shader picks up any changes to the entity texture since last stop.

### PingPongManager.gd

Creates and manages SubViewport pairs for feedback loops.

Each registered buffer gets:
- `viewport_a` + `viewport_b` — two SubViewports with identical size
- `material_a` + `material_b` — ShaderMaterials, one per viewport
- `read_index` / `write_index` — which viewport is currently being read vs written

Operations:
- `swap()` — flip read/write indices
- `stop()` — freeze (preserve content) or clear based on policy
- `reset()` — clear both viewports, reset indices to 0/1

## Ping-Pong: The Two-Buffer Scene-Graph Model

> **Design Principle**: TypeScript is the Director, Godot is the Artist.
> TS sends high-level draw commands (normalized coords). Godot creates GPU scene-graph nodes.
> No per-frame CPU→GPU texture uploads.

For a feedback effect (like paint spreading), there are **two viewports** that ping-pong, plus scene-graph draw nodes:

```
┌──────────────────────┐
│  Pixel Buffer        │  ◀── Source of truth when STOPPED
│  (Image+ImageTexture)│      User draws here via CPU Image ops (infrequent)
└──────────┬───────────┘
           │  one-shot seed on Start
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Viewport A          │◀───▸│  Viewport B          │
│  ├── ColorRect       │     │  ├── ColorRect       │
│  │   (shader)        │     │  │   (shader)        │
│  └── Node2D          │     │  └── Node2D          │
│      (draw container)│     │      (draw container)│
│      ├── Line2D      │     │      └── (empty)     │
│      └── Line2D      │     │                      │
└──────────────────────┘     └──────────────────────┘
     One is READ                  One is WRITE
     (previous frame)             (current frame renders here)
     They swap each frame
```

The shader runs inside the WRITE viewport's ColorRect and reads from:
1. `current_buffer` — the READ viewport's texture (previous frame's output)

New draw commands from TypeScript are converted from normalized (0–1) coordinates to viewport-local pixel positions and injected as **`Line2D`/`Sprite2D` children** of the WRITE viewport's draw container. These render on the GPU in tree order — on top of the shader's output — compositing seamlessly. No `ImageTexture.update()` needed.

The shader is pure feedback — one input, one output:
```glsl
// Blur/spread the previous frame (includes last frame's draws, already composited)
vec4 blurred = blur(current_buffer, UV);
COLOR = blurred;
```

### Lifecycle: Draw → Start → Draw → Stop → Draw → Start

| Step | Pixel Buffer | Ping-Pong Viewports | Sprite Shows |
|------|-------------|---------------------|--------------|
| **Draw** | User draws (CPU Image, `set_pixel()`) | — | Pixel buffer |
| **Start** | Unchanged | Seeded from pixel buffer (one-shot upload), begin rendering | Viewport output (after 2-frame delay) |
| **Draw while running** | Unchanged | Draw commands → `Line2D`/`Sprite2D` nodes in write viewport (GPU, no upload) | Viewport output (new draws composited by scene graph) |
| **Stop** | Baked: viewport output → Image + ImageTexture (one-shot download) | Frozen | Pixel buffer (now contains baked evolved state) |
| **Draw after stop** | User draws on top of baked content (CPU Image) | Still frozen | Pixel buffer |
| **Start again** | Unchanged | **Reset** (cleared), seed from pixel buffer, begin fresh | Viewport output |

The key insight: **Stop bakes the evolved state back into the pixel buffer**, so the user is always drawing on top of whatever the shader produced. **Start always begins fresh** from the current pixel buffer state. CPU↔GPU transfers only happen at start (seed) and stop (bake) — never per-frame.

### Per-Frame Draw Node Lifecycle

After each swap:
1. The old WRITE viewport (now READ) has rendered — its draw nodes are composited into its texture
2. Those draw nodes are detached (`remove_child()`) then freed (`queue_free()`). Using `remove_child()` first is critical — `queue_free()` alone leaves nodes in the scene tree until end-of-frame, which breaks `get_children()` checks and may cause the viewport to render stale nodes.
3. The new WRITE viewport's draw container is empty and ready for fresh draws
4. New `Line2D`/`Sprite2D` nodes are added for this frame's draw commands

### Bridge Data Protocol

Draw commands from TypeScript use **normalized coordinates (0.0–1.0)** with **flat arrays** for point data to minimize JSON parse overhead:

```typescript
// Flat [x,y,x,y,...] — parsed into PackedVector2Array on Godot side
{ type: "stroke", points: [0.2, 0.4, 0.21, 0.41, 0.22, 0.42], color: "#f00", width: 0.006 }
```

- **Positions**: `x` and `y` are 0.0–1.0 relative to the viewport dimensions
- **Width**: Relative to **viewport height** (not width) — ensures circular brushes on non-square viewports
- **One `Line2D` per stroke**: Prefer one node with many points over many nodes with few points

### Alpha Handling

Ping-pong viewports use `transparent_bg = true`, which means they clear to `rgba(0,0,0,0)`. On the first frame after start/reset, the feedback buffer is empty. The seeding mechanism copies the pixel buffer content into the ping-pong pair so the shader sees existing content on frame 1.

## Future: Shader Fusion (Mega-Shaders)

Each EffectNode has a `fusible` flag:
- `"always"` — safe to merge into a single shader with neighbors
- `"conditional"` — can merge if certain conditions are met
- `"never"` — must remain a separate pass (e.g., needs its own viewport for resolution changes)

The compiler could eventually fuse compatible adjacent nodes into a single "mega-shader" pass, reducing the number of SubViewports and texture reads. This is the "compose shaders into a unified shader" capability. The infrastructure for this exists in the type system but the fusion pass isn't implemented yet.

### Parameter Introspection & Unified Schema

Effect parameters are currently defined in three separate locations, which causes drift and makes it impossible for a downstream consumer (like a tuning panel) to get complete metadata from a single place.

**Current state (three sources of truth)**:
```
EffectParamMeta (metadata.ts)         — UI: displayName, type (number/color/boolean/select), min/max/step
NodeTypeRegistration.paramsSchema     — Registry: name, type (float/int/vec2/.../bool), range, defaultValue  
EffectNode.params (types.ts)          — Runtime: Record<string, ParamValue> (values only, no metadata)
```

**Target state (single source of truth)**:
```
EffectParamSchema (types.ts)          — Unified: key, uniformName, type (UniformType), defaultValue, ui hints
  │
  ├── Used by: EffectNode.paramsSchema (attached to each node)
  ├── Used by: CompiledPass.paramsSchema (carried through compilation)
  ├── Used by: NodeTypeRegistration.paramsSchema (registry)
  └── Used by: EffectTuningPanel (React UI auto-generates controls)
```

The unified type:
```typescript
export interface EffectParamSchema {
  key: string;
  uniformName: string;
  type: UniformType;          // 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'bool'
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

Note that this follows the same pattern as the game engine's `VariableWithTuning` which has `{ value, tuning: { min, max, step }, category, label, description }` and auto-generates `TunableSlider` controls in the `TuningPanel`. The effect system's `EffectParamSchema` is the equivalent — it carries enough metadata to auto-generate UI controls.

### Uniform Hot-Path (Live Editing)

Two paths exist for updating effect parameters — the normal path (full graph rebuild) and the hot path (direct uniform update):

```
Normal path (graph rebuild):
  TS: change param value in spec → recompile → send new CompiledPlan → Godot rebuilds viewports
  Cost: ~50-100ms, visible flicker

Hot path (uniform update):
  TS: bridge.effectsUpdateParams(nodeId, { intensity: 0.7 })
     → GameBridgeEffects._js_effects_update_params()
     → GraphExecutor.update_params(pass_id, params)
     → shader_material.set_shader_parameter("intensity", 0.7)
  Cost: <1ms, no flicker, no rebuild
```

Note that `_apply_params()` in GraphExecutor.gd already does `set_shader_parameter()` — the hot-path method is just a public entry point that reuses this logic on an existing material without rebuilding.

### Live Shader Compilation (No Pre-Baked Files)

The architecture moves all shader source code from pre-baked `.gdshader` files on disk into the TypeScript registry as inline GLSL strings, creating a single code path for all shader compilation:

**Current flow**:
```
EffectGraphSpec node with { type: "builtin", effectType: "blur" }
  → Compiler passes through unchanged
  → Godot: _resolve_shader() → _resolve_builtin_shader_path()
  → load("res://shaders/post_process/blur.gdshader")
```

**Target flow**:
```
EffectGraphSpec node with { type: "builtin", effectType: "blur" }
  → Compiler looks up GLSL from shaderLibrary.ts
  → Converts to { type: "custom", glsl: "shader_type canvas_item;..." }
  → Godot: _resolve_shader() → _build_custom_shader(glsl)
  → All shaders go through one code path
```

Key architectural points:
- TypeScript registry becomes the single source of truth for ALL shader code
- No .gdshader files on disk — everything is inline GLSL in the TS shader library
- AI can generate and modify shaders without touching the file system
- Hot reload: change GLSL in registry → recompile plan → hot-swap (Phase 7)
- `SPRITE_SHADER_PATHS`, `POST_SHADER_PATHS`, `EFFECT_TYPE_TO_SHADER`, and `_resolve_builtin_shader_path()` are removed from GraphExecutor.gd

### Effect Tuning Panel

Brief description of the React component that mirrors the game engine's TuningPanel:

```
EffectTuningPanel
  ├── Receives: active EffectGraphSpec + EffectParamSchema[]
  ├── Groups params by ui.category
  ├── Per param type:
  │   ├── number → Slider (min/max/step from schema)
  │   ├── color  → Color Picker
  │   ├── bool   → Toggle Switch
  │   └── select → Dropdown (options from schema)
  └── On change: bridge.effectsUpdateParams(nodeId, { key: value })
       → Uniform hot-path (no graph rebuild)
```

## Capabilities & Limitations

### What's Possible

After Phase 4 (multi-pass chains with multiple named buffers and feedback edges), the architecture is structurally equivalent to ShaderToy's multi-buffer system — actually more flexible, since ShaderToy caps at 4 buffers and we have no hard cap. Everything expressible as "for each pixel, compute a color from input textures" is supported.

| Effect Type | Complexity | How It Maps |
|-------------|-----------|-------------|
| Mandelbrot / Julia sets | Single node | Pure math on UV coords. Animate zoom/palette via uniforms. Trivial. |
| Animated fractal zoom | Single node | Same shader, `time` + `zoom_center` + `scale` uniforms driven by hot-path |
| Ray marching (SDF scenes) | Single node | Per-pixel ray march in fragment shader. Spheres, Menger sponges, fractal landscapes, soft shadows — all single-pass. This is exactly what ShaderToy excels at. |
| Reaction-diffusion | Single feedback node | Two-chemical system (Gray-Scott, Turing patterns). Reads previous frame, computes diffusion + reaction, writes new frame. Like our paint example but with reaction terms. |
| Game of Life / cellular automata | Single feedback node | Read neighbor pixels from previous frame, apply rules, write new state. |
| GPU particle systems | Single feedback node | Encode particle positions/velocities in texture pixels. Each frame: read position, integrate velocity, write new position. Separate pass renders particles as sprites from the position texture. |
| Kaleidoscope / mirror effects | Single node | UV remapping math. No buffers needed. |
| Bloom | 3-node chain | Threshold → blur → composite. Standard multi-pass, Phase 4. |
| Fluid simulation (Navier-Stokes) | Multi-buffer graph | See detailed breakdown below. |
| Audio-reactive visuals | Single node + external input | Need audio FFT data as a uniform or 1D texture. Requires a bridge method to pipe audio data — not in the current plan but straightforward to add. |

### Fluid Simulation: Detailed Breakdown

A 2D Navier-Stokes fluid sim is the most architecturally demanding use case. It requires multiple named buffers with cross-references and feedback:

**Buffers needed:**
```
velocity   (rg = vx, vy)        ── ping-pong feedback
pressure   (r = pressure)       ── ping-pong feedback
divergence (r = div)            ── intermediate (no feedback)
dye        (rgb = visible color) ── ping-pong feedback
```

**Per-frame pass order:**
```
1. Advect velocity    reads: velocity(prev)              writes: velocity(next)
2. Compute divergence reads: velocity                    writes: divergence
3. Jacobi solve (x2-4) reads: divergence + pressure(prev) writes: pressure(next)
4. Pressure projection reads: pressure + velocity         writes: velocity(corrected)
5. Advect dye         reads: velocity + dye(prev)        writes: dye(next)
6. Inject forces      reads: mouse input                 writes: velocity + dye
```

**Graph spec sketch:**
```
velocity ──feedback──> advect_velocity ──> divergence_pass ──> jacobi_1 ──> jacobi_2 ──> projection
pressure ──feedback──> jacobi_1 ──> jacobi_2 ──> (consumed by projection)
dye ──feedback──> advect_dye ──> screen
mouse_input ──> force_injection ──> velocity + dye
```

This maps directly to `EffectGraphSpec` — nodes, connections, feedbackEdges. The compiler topologically sorts it, allocates viewports from the pool, and the executor runs each pass in order.

**Jacobi iteration count:** A textbook solver wants 20-50 iterations per frame. Our graph runs each node once per frame. The standard real-time solution is **temporal convergence** — do only 2-4 Jacobi iterations per frame. At 60fps, the pressure field converges over multiple frames. This is the approach used by Jos Stam's "Stable Fluids" paper, GPU Gems, and virtually every WebGL/ShaderToy fluid demo. 2-4 nodes in the graph is trivial. Visually indistinguishable from 50 iterations for interactive use.

**Precision:** SubViewport defaults to 8-bit RGBA. Pressure and velocity values near zero get quantized. Two mitigations:
- Enable `use_hdr_2d = true` on the SubViewport for higher precision (configurable per viewport in the pool)
- Encode values with bias and scale (map [-1, 1] to [0, 1] in the texture) — standard technique used by every WebGL fluid demo

Neither requires architecture changes.

### Hard Limitations

These are things the system **cannot** do, due to Godot's `canvas_item` shader model (fragment-only):

| Limitation | Why | Workaround |
|-----------|-----|-----------|
| Compute shaders | `canvas_item` shaders are fragment-only. No shared memory, work groups, or atomic ops. | Encode compute-like operations as texture read/write passes (which is what we do for fluid sim). Slower than true compute but sufficient for 2D effects. |
| 3D volume textures | SubViewport produces 2D textures. No 3D texture render targets. | Slice-based volume rendering is possible (render 2D slices and composite), but true volumetric effects are out of scope. |
| Multi-bounce ray tracing | No access to scene geometry BVH from fragment shader. | Single-bounce reflections via ray marching against SDFs work fine. Multi-bounce with scene geometry does not. |
| Geometry / tessellation shaders | Godot canvas_item pipeline is rasterize-quad → fragment only. | Not applicable — our system is pixel-processing, not geometry-generation. |
| Transform feedback | No way to write vertex data from a shader pass. | Particle positions are encoded in textures instead (GPU particle approach). |
| Multi-resolution passes | Nodes currently inherit their viewport's resolution. No per-node resolution override. | Could be added (per-node resolution config in EffectGraphSpec) if downsampled blur or LOD effects are needed. Not architecturally hard, just not planned yet. |

### Comparison to ShaderToy

| Feature | ShaderToy | Our System (Phase 4+) |
|---------|-----------|----------------------|
| Fragment shader per pixel | Yes | Yes |
| Named persistent buffers | 4 (Buffer A-D) | Unlimited (named in graph spec) |
| Buffer feedback (read previous frame) | Yes (implicit) | Yes (explicit feedbackEdges) |
| Multi-pass chains | Yes (buffer ordering) | Yes (topological sort) |
| Cross-buffer reads | Yes (any buffer reads any other) | Yes (connections in graph spec) |
| External inputs | iChannel (textures, audio, video) | External inputs (Phase 3), extensible via bridge |
| Time/mouse uniforms | Built-in (iTime, iMouse) | Built-in (time, dt) + custom params via hot-path |
| Resolution per buffer | Fixed (match screen) | Configurable per node (future) |
| Live editing | Yes (edit + recompile) | Yes (Phase 7 shader hot-swap) |
| Parameter sliders | No (hardcoded in shader) | Yes (EffectParamSchema → auto-generated UI) |

The main advantage over ShaderToy: our system has structured parameter metadata with auto-generated UI controls, AI-assisted authoring, and no 4-buffer limit.

## File Map

### TypeScript (authoring + compilation)

| File | Purpose |
|------|---------|
| `shared/src/effects/types.ts` | All type definitions (EffectGraphSpec, CompiledPlan, FeedbackPolicy, etc.) |
| `shared/src/effects/compiler.ts` | Compiles EffectGraphSpec → CompiledPlan |
| `shared/src/effects/resources.ts` | Builds ResourceGraph from spec (allocation planning) |
| `shared/src/effects/validator.ts` | Validates graph structure (cycles, missing refs) |
| `shared/src/effects/feedback.ts` | FeedbackManager — TypeScript-side feedback buffer state tracking |
| `shared/src/effects/snapshot.ts` | Capture/restore effect state |
| `shared/src/effects/budget.ts` | Platform-aware pass budgeting |
| `shared/src/effects/metadata.ts` | Effect metadata for UI |
| `shared/src/effects/registry.ts` | Registry of available effects |
| `shared/src/effects/authoring.ts` | Helpers for constructing EffectGraphSpec |
| `shared/src/effects/normalizer.ts` | Normalize legacy specs |
| `shared/src/effects/shaderLibrary.ts` | Inline GLSL source strings for all builtin effects (replaces .gdshader files) — **Phase 5, not yet created** |

### GDScript (runtime)

| File | Purpose |
|------|---------|
| `godot_project/scripts/effects/GraphExecutor.gd` | State machine, per-frame loop, pass orchestration, render ordering |
| `godot_project/scripts/effects/ResourceGraph.gd` | Texture allocation, uniform binding |
| `godot_project/scripts/effects/PingPongManager.gd` | SubViewport pair management for feedback + scene-graph draw containers |
| `godot_project/scripts/effects/ViewportPool.gd` | Pre-allocated SubViewport pool (acquire/release, no mid-effect instantiation) — **Phase 2, not yet created** |
| `godot_project/scripts/effects/ShaderWarmer.gd` | Pre-compile builtin shaders at startup, warm custom shaders at apply_plan — **Phase 2, not yet created** |
| `godot_project/scripts/bridge/GameBridgeEffects.gd` | Bridge between React/TS and Godot effects system |
| `godot_project/scripts/bridge/PixelBufferManager.gd` | Creates pixel buffer entities (Image + ImageTexture + Sprite2D) |

### React (UI)

| File | Purpose |
|------|---------|
| `app/components/effects/EffectTuningPanel.tsx` | Live param editing panel (auto-generated from EffectParamSchema) — **Phase 5, not yet created** |
| `app/components/effects/EffectParamControl.tsx` | Individual param control (slider, color picker, toggle, dropdown) — **Phase 5, not yet created** |

### Tests

| File | Purpose |
|------|---------|
| `shared/src/effects/__tests__/compiler.test.ts` | Compiler tests including inputBindings |
| `shared/src/effects/__tests__/resources.test.ts` | Resource graph tests including implicit binding |
| `shared/src/effects/__tests__/feedback.test.ts` | FeedbackManager state machine tests |
| `shared/src/effects/__tests__/validator.test.ts` | Graph validation tests |
