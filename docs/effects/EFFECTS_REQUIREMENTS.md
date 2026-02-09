# Effects System Requirements

## Vision

A generic, node-based shader compositing engine where anyone — with AI assistance — can build visually rich effects. The long-term vision is a ShaderToy/TouchDesigner-like system where a JSON declarative interface (`EffectGraphSpec`) lets anyone — with AI assistance — assemble and compose complex shader effects. Parameters are introspectable with live-editable controls, all shaders compile from inline GLSL (no pre-baked files), and the data model supports both AI authoring and eventual visual node editing. Think TouchDesigner: every node is a framebuffer, they wire together, and the whole graph produces a final visual output. Users browse a gallery of shader presets, AI helps them compose custom pipelines from natural language, and the graph spec lives in a database for sharing and remixing.

## Core Primitives

### Pixel Buffer

The fundamental primitive is an **RGBA pixel buffer** at a configurable resolution. The effects system only knows about buffers — it doesn't care how the pixels got there. Drawing, image loading, camera capture, SVG rasterization — all of that happens upstream. By the time the effects system sees a buffer, it's just pixels.

### Shader Node

A shader node reads from one or more input buffers, applies a GLSL fragment shader, and writes to an output buffer. Shader nodes are the processing units of the graph.

### Ping-Pong Feedback

When a shader reads from and writes to the same buffer (temporal feedback), the system automatically manages a pair of internal buffers. The user doesn't think about "buffer A and buffer B" — they just wire a buffer back into itself and the system handles the swap.

### Boundary: What the Effects System Knows

The effects system's responsibility is narrow:
- **Inputs**: pixel buffers (already populated by upstream systems)
- **Processing**: shader nodes wired together in a graph
- **Outputs**: pixel buffers (consumed by downstream systems or displayed)

Everything else is out of scope:
- How pixels get into buffers (draw commands, images, camera, SVG) → upstream system's job
- How output buffers get displayed (sprite texture, screen overlay) → downstream system's job
- What the pixels represent (game art, UI, masks) → the effects system doesn't care

## Architecture Principles

### Two-Buffer Ping-Pong (Not Three)

For feedback effects, there are exactly **two buffers**: the ping-pong pair. There is no separate "pixel buffer" during animation.

- **Stopped**: The user sees and draws on a single ImageTexture (the pixel buffer). This is the source of truth.
- **Start**: The pixel buffer content is copied into the ping-pong pair. The user now draws directly into the active write buffer. The display shows the read buffer.
- **Each frame**: Swap read/write. The shader reads from the read buffer (previous frame) and renders into the write buffer.
- **Draw during animation**: New brush strokes go directly into the write buffer via CPU image manipulation, alongside the shader's GPU output. The shader and the user's brush coexist on the same surface.
- **Stop**: The current read buffer (latest complete frame) is baked back into the pixel buffer ImageTexture. The user sees the final evolved state and can draw on it.

This eliminates the entity_input/current_buffer split and the "pinning" problem entirely.

### Node Graph

The graph is a **directed acyclic graph (DAG)** of shader nodes connected by resource edges.

**Starting simple, evolving later:**
- **Phase 1**: Linear chains. Each node has one primary input and one output. Feedback edges (self-loops) are the exception.
- **Phase 2**: Tree topology. Nodes can have multiple inputs (e.g., a blend node combining two canvases).
- **Phase 3**: Full DAG. Any node can feed multiple downstream nodes. Outputs can branch.

### Input Types

The effects system accepts exactly one input type: **pixel buffers**. Any upstream system can populate a buffer however it wants — the effects system doesn't know or care about the source.

Upstream systems that feed buffers (not part of the effects system):
- PixelBufferManager (draw commands, fill, clear)
- Image loader (URL → buffer)
- Camera bridge (device camera → buffer)
- SVG rasterizer (vector → buffer)
- Screen capture (rendered scene → buffer)
- Sprite sheet extractor (frame → buffer)

The effects system just sees: "here's a buffer, here's another buffer, wire them through these shaders."

### Resolution

Each canvas declares its own resolution. Options:
- **Fixed**: `512x512`, `1024x1024`, etc.
- **Match entity**: derived from the entity/sprite the effect is attached to
- **Match screen**: device display resolution
- **Fraction of screen**: `half`, `quarter` for performance

Ping-pong buffers always match their canvas resolution (no mismatch between animation and stopped state).

## Authoring & Storage

### Graph Spec (Database Record)

The **EffectGraphSpec** is the authoring-level document that lives in the database. It describes the graph topology, shader source, and parameters in JSON.

- Compiled plans are derived from the graph spec on load (client-side compilation)
- Graph specs are shareable and remixable between users
- AI generates graph specs from natural language descriptions

### AI Authoring (Primary UX)

The primary authoring flow is conversational:
1. User describes what they want: "make the drawing melt downward with rainbow colors"
2. AI generates an EffectGraphSpec
3. User previews in the gallery
4. User tweaks parameters (sliders, color pickers)
5. Graph spec is saved to the database

A visual node editor (TouchDesigner-style) is a future addition for power users.

### Shader Gallery

Users browse a gallery of preset effects. Each preset is an EffectGraphSpec with:
- A thumbnail/preview (animated)
- A description
- Editable parameters with metadata (min, max, step, labels)
- A "remix" button that clones the spec for customization

## Current State vs Target

### What Exists Today

| Component | Status | Notes |
|-----------|--------|-------|
| EffectGraphSpec type system | ✅ Done | Nodes, connections, feedback edges, params |
| Compiler (spec → plan) | ✅ Done | Topological sort, inputBindings, feedbackPolicies |
| ResourceGraph.gd | ✅ Done | Texture allocation, uniform binding |
| GraphExecutor.gd | ✅ Done | State machine, per-frame loop |
| PingPongManager.gd | ✅ Done | SubViewport pair management |
| Pixel buffer drawing | ✅ Done | PixelBufferManager with brush commands |
| Feedback seeding | ✅ Done | Entity texture seeds ping-pong on start |
| Bake on stop | ✅ Done | Viewport output → pixel buffer Image |
| Draw during animation | ❌ Broken | Shaders are pure feedback, no entity_input injection |
| Resolution matching | ✅ Done | Ping-pong viewports match entity texture size |
| Multiple input types | 🔲 Designed | Type system ready, only pixel buffer implemented |
| Masking | 🔲 Not started | Need mask channel routing in graph spec |
| Camera input | 🔲 Not started | Needs platform-specific camera texture bridge |
| Gallery UI | 🔲 Not started | Need preset browsing + parameter editing |
| AI authoring | 🔲 Not started | Need prompt → EffectGraphSpec generation |
| Visual node editor | 🔲 Not started | Future phase |
| Parameter introspection | 🔲 Designed | Unified EffectParamSchema type needed; currently split across 3 files |
| Live param editing (hot-path) | 🔲 Not started | Uniform updates without graph rebuild |
| Effect tuning panel | 🔲 Not started | React component, auto-generated from param schema |
| Live shader compilation | 🔲 Not started | Inline GLSL from TS registry replaces .gdshader files |
| Shader library (TS) | 🔲 Not started | All builtin shaders as inline GLSL strings in TypeScript |
| Shader hot-swap | 🔲 Not started | Replace shader on running node without restart |
| Graph hot-swap | 🔲 Not started | Change topology while running |

### What Needs to Change

**Immediate (unblock paint example):**
1. Implement two-buffer draw-during-animation: stamp new draw commands directly into the ping-pong write viewport's image each frame
2. Remove the three-buffer entity_input pattern from the paint shaders

**Short-term (complete the runtime):**
3. Add image input support (load a URL into a canvas)
4. Add mask channel routing (read one canvas's luminance as another's alpha)
5. Add screen capture input for post-processing effects

**Medium-term (authoring & sharing):**
6. Shader gallery with preset browsing
7. AI-assisted graph spec generation
8. Database storage + sharing/remix

**Long-term (power features):**
9. Visual node editor UI
10. Camera feed input
11. SVG rasterization input
12. Multi-pass chains (A → B → C → screen)
13. Shader fusion optimization (mega-shaders)

**Phase 5 (parameter introspection & live compilation):**
14. Unify parameter schemas into single `EffectParamSchema` type (combine `EffectParamMeta`, `NodeTypeRegistration.paramsSchema`, and `EffectNode.params`)
15. Add uniform hot-path bridge method (`effectsUpdateParams`) for live param editing without graph rebuild
16. Build EffectTuningPanel React component — auto-generates sliders, pickers, toggles from schema metadata
17. Migrate all builtin .gdshader files to inline GLSL in TypeScript shader library
18. Remove `SPRITE_SHADER_PATHS`, `POST_SHADER_PATHS` from GraphExecutor.gd — all shaders compile from GLSL strings

**Phase 6-7 (shader library & live reload):**
19. Organize shaders into parametric building blocks with rich metadata
20. Support shader templates with compile-time template variables
21. Shader hot-swap — replace shader code on running effect without restart
22. Graph hot-swap — change topology while running (add/remove nodes, change connections)

**Phase 8-9 (AI authoring & visual editor):**
23. AI prompt → EffectGraphSpec generation using shader library metadata
24. Iterative refinement (AI patches spec based on user feedback)
25. Spec database storage with sharing and remix
26. Visual node editor (React Flow) reading/writing EffectGraphSpec

**Phase 10 (legacy cleanup & full migration):**
27. Delete all 37 pre-baked `.gdshader` files from `godot_project/shaders/`
28. Remove `EffectParamMeta` type and `EFFECT_METADATA` registry — all consumers use `EffectParamSchema`
29. Remove `entity_input` / `__entityTexture` / `entityTexture` from all code and tests
30. Remove `builtin` variant from `ShaderSource` type — all shaders are inline GLSL
31. Remove pixel coordinate fallback APIs (if kept during transition)
32. Migrate all 6 effect-using examples to new APIs, verify visual correctness
33. Full test suite passes with no skips, no deprecated pattern references
34. Dead code sweep: grep for all removed symbols, `tsc --noEmit`, full build

## Open Questions

1. ~~**Draw into viewport**: Can we efficiently stamp CPU-side draw commands into a SubViewport that's also being GPU-rendered by a shader?~~ **RESOLVED**: Use scene-graph nodes (`Line2D`/`Sprite2D`) as children of the SubViewport, rendered in tree order after the shader's `ColorRect`. No CPU→GPU texture upload needed. See implementation plan v2.

2. **Mask routing**: Should masks be a first-class edge type in the graph, or just a regular canvas connection where the receiving shader samples a specific channel? **Leaning toward**: regular connections — masks are just buffers, shader author picks the channel.

3. **Performance budget**: How many active ping-pong pairs can run simultaneously on mobile? Web? Should the budget system enforce limits? **New concern**: viewport pool sizing — need to profile on web.

4. **Determinism**: Should the same graph spec + same inputs produce identical output across devices? (Important for sharing/thumbnails.) **Note**: Scene-graph approach (Line2D/Sprite2D) should be more deterministic than CPU pixel blitting.

5. **Line2D node budget**: How many `Line2D` nodes can accumulate per frame before GPU overhead dominates? Lorien splits at ~1024 points per stroke. Need a per-frame budget.

6. **Normalized coordinate migration**: Do we migrate existing pixel-coordinate APIs to normalized in Phase 1, or support both modes?

7. **Shader warming strategy**: Eager (all at startup, adds load time) vs lazy (first use, hidden behind loading screen)?

8. **Bake-on-stop resolution cap**: `get_image()` is a CPU↔GPU sync that stalls 20–50ms at 4K. Should we cap effect resolution to keep bake time under 10ms?

9. **Viewport pool state audit**: The scorched-earth reset covers known SubViewport properties. Need an audit checklist for Godot version upgrades.

10. **Parameter schema migration**: Should the unified `EffectParamSchema` replace `EffectParamMeta` in one shot, or should we keep both with an adapter during transition?

11. **Shader library bundling**: Inline GLSL strings in TypeScript could add significant bundle size. Should we lazy-load shader modules (only import what the current graph needs), or is the total size acceptable? Need to measure.

12. **Shader template complexity**: How complex should parametric shader templates get (compile-time variable substitution) before we just tell users to write custom GLSL? Where's the line between template params and just having the AI write new GLSL?

13. **Hot-swap safety**: When hot-swapping a shader on a running effect, what happens if the new shader has different uniforms? Do we fail gracefully, apply defaults, or require the caller to provide all new uniform values?
