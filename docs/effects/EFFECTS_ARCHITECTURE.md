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
- `inputSlots` — what textures/data it reads (can be connected to another node's output, or left unconnected for implicit binding like `__entityTexture`)
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
| `__entityTexture` | The pixel buffer's ImageTexture | Always available for entity-scoped effects |
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

The compiler resolves implicit inputs: if a node has an unconnected input slot, the compiler infers the binding from the slot's `dataType` and the graph's scope (e.g., an unconnected `texture` input on an entity-scoped graph binds to `__entityTexture`).

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

## Ping-Pong: The Three-Texture Model

For a feedback effect (like paint spreading), there are **three textures** in play:

```
┌──────────────────────┐
│  Pixel Buffer        │  ◀── User draws here (Image + ImageTexture)
│  (entity_input)      │      Always live, always the "source of truth"
└──────────┬───────────┘      for what the user has painted
           │
           │  shader reads via "entity_input" uniform
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Viewport A          │◀───▸│  Viewport B          │
│  (ping-pong buffer)  │     │  (ping-pong buffer)  │
└──────────────────────┘     └──────────────────────┘
     One is READ                  One is WRITE
     (previous frame)             (current frame renders here)
     They swap each frame
```

The shader runs inside the WRITE viewport and reads from:
1. `current_buffer` — the READ viewport's texture (previous frame's output)
2. `entity_input` — the pixel buffer's ImageTexture (live user drawings)

The shader combines them:
```glsl
// Blur/spread the previous frame
vec4 blurred = blur(current_buffer, UV);

// Check if the user drew something here
float is_drawn = 1.0 - smoothstep(0.9, 1.0, brightness(entity_input));

// Drawn pixels override, undrawn pixels show the evolved feedback
COLOR = mix(blurred, entity, is_drawn);
```

### Lifecycle: Draw → Start → Draw → Stop → Draw → Start

| Step | Pixel Buffer | Ping-Pong Viewports | Sprite Shows |
|------|-------------|---------------------|--------------|
| **Draw** | User modifies Image → ImageTexture.update() | — | Pixel buffer |
| **Start** | Unchanged | Cleared, begin rendering | Viewport output (after 2-frame delay) |
| **Draw while running** | User modifies Image → ImageTexture.update() | Shader reads live entity_input | Viewport output (new draws visible in shader) |
| **Stop** | Baked: viewport output → Image + ImageTexture | Frozen | Pixel buffer (now contains baked evolved state) |
| **Draw after stop** | User draws on top of baked content | Still frozen | Pixel buffer |
| **Start again** | Unchanged | **Reset** (cleared), begin fresh | Viewport output |

The key insight: **Stop bakes the evolved state back into the pixel buffer**, so the user is always drawing on top of whatever the shader produced. **Start always begins fresh** from the current pixel buffer state — stale ping-pong content is cleared.

### Alpha Handling

Ping-pong viewports use `transparent_bg = true`, which means they clear to `rgba(0,0,0,0)`. On the first frame after start/reset, the feedback buffer is empty. The shaders handle this with an alpha fallback:

```glsl
vec4 result = mix(blurred, entity, is_drawn);
// When buffer is uninitialized (alpha==0), fall back to entity texture
result.rgb = mix(entity.rgb, result.rgb, c.a);
result.a = 1.0;
COLOR = result;
```

This ensures white areas stay white on frame 1 (instead of turning black from empty-buffer reads), and the evolution begins naturally from frame 2 onward.

## Future: Shader Fusion (Mega-Shaders)

Each EffectNode has a `fusible` flag:
- `"always"` — safe to merge into a single shader with neighbors
- `"conditional"` — can merge if certain conditions are met
- `"never"` — must remain a separate pass (e.g., needs its own viewport for resolution changes)

The compiler could eventually fuse compatible adjacent nodes into a single "mega-shader" pass, reducing the number of SubViewports and texture reads. This is the "compose shaders into a unified shader" capability. The infrastructure for this exists in the type system but the fusion pass isn't implemented yet.

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

### GDScript (runtime)

| File | Purpose |
|------|---------|
| `godot_project/scripts/effects/GraphExecutor.gd` | State machine, per-frame loop, pass orchestration |
| `godot_project/scripts/effects/ResourceGraph.gd` | Texture allocation, uniform binding |
| `godot_project/scripts/effects/PingPongManager.gd` | SubViewport pair management for feedback |
| `godot_project/scripts/bridge/GameBridgeEffects.gd` | Bridge between React/TS and Godot effects system |
| `godot_project/scripts/bridge/PixelBufferManager.gd` | Creates pixel buffer entities (Image + ImageTexture + Sprite2D) |

### Tests

| File | Purpose |
|------|---------|
| `shared/src/effects/__tests__/compiler.test.ts` | Compiler tests including inputBindings |
| `shared/src/effects/__tests__/resources.test.ts` | Resource graph tests including implicit binding |
| `shared/src/effects/__tests__/feedback.test.ts` | FeedbackManager state machine tests |
| `shared/src/effects/__tests__/validator.test.ts` | Graph validation tests |
