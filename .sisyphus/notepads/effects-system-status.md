# Effects System: Status & Validation Tracker

## Architecture Overview

The effects system has **two layers**:

### Layer 1: Effect Graph Compiler (TypeScript)
- `shared/src/effects/compiler.ts` — takes an `EffectGraphSpec`, produces a `CompiledPlan`
- Supports custom GLSL via `node.params.shaderSource`
- Supports built-in effects via `getShaderGlsl(node.type)` (shader library)
- Topological sort, resource allocation, feedback handling

### Layer 2: Godot Rendering (GDScript)
- `GameBridgeEffects.gd` — receives `CompiledPlan`, applies effects
- **Screen-scope**: `_apply_simple_screen_effect()` — CanvasLayer(100) + ColorRect with shader material
- **Entity-scope**: GraphExecutor with SubViewport pipeline
- `GraphExecutor.gd` — handles multi-pass, ping-pong, resource binding (used for entity scope)

### Data Flow
```
definition.json → effects.graph → compileGraph() → CompiledPlan
  → bridge.applyGraph() → JSON → Godot QuerySystem
  → GameBridgeEffects.apply_plan() → screen (simple) or entity (executor) path
```

### Shader Library
37 built-in shaders in `shared/src/effects/shaderLibrary.ts`:
- **15 sprite/entity shaders**: silhouette, tint, waveDistortion, rimLight, rainbow, pixelate, posterize, outline, innerGlow, holographic, glow, dropShadow, flash, dissolve, colorMatrix
- **21 post-process/screen shaders**: underwater, vignette, thermalVision, speedLines, shockwave, shimmer, ripple, scanlines, oldFilm, pixelateScreen, motionBlur, nightVision, fogOfWar, crt, halftone, glitch, chromaticAberration, colorGrading, blur, bloom, ascii
- **1 spatial**: grid

Post-process shaders already use `hint_screen_texture` + `SCREEN_UV` (compatible with simple CanvasLayer path).
Sprite shaders use `TEXTURE` (compatible with entity-scope SubViewport pipeline).

---

## How to Author Effects

### Option 1: Single custom shader (simplest)
```json
{
  "effects": {
    "graph": {
      "id": "my-effect",
      "version": "1.0.0",
      "engineApiVersion": "1.0.0",
      "scope": "screen",
      "nodes": [{
        "id": "main",
        "type": "custom",
        "family": "post_process",
        "inputSlots": [],
        "params": {
          "shaderSource": "shader_type canvas_item;\nuniform sampler2D screen_texture : hint_screen_texture;\nvoid fragment() {\n\tCOLOR = texture(screen_texture, SCREEN_UV);\n}"
        },
        "outputTarget": { "bufferId": "output", "format": "rgba8", "resolution": "full" },
        "flags": { "stateful": false, "fusible": "never" }
      }],
      "connections": [],
      "feedbackEdges": [],
      "lifecycle": { "autoStart": true, "stopMode": "clear" }
    }
  }
}
```

### Option 2: Built-in library shader
```json
{
  "nodes": [{
    "id": "crt_pass",
    "type": "crt",
    "family": "post_process",
    "inputSlots": [],
    "params": {},
    "outputTarget": { "bufferId": "output", "format": "rgba8", "resolution": "full" },
    "flags": { "stateful": false, "fusible": "never" }
  }]
}
```

### Screen-scope shader conventions
- Use `uniform sampler2D screen_texture : hint_screen_texture;` to read game content
- Use `SCREEN_UV` for sampling coordinates
- Use `SCREEN_PIXEL_SIZE` for pixel size calculations
- Write to `COLOR` for output
- Shader renders on CanvasLayer 100 (above all game content)

### Entity-scope shader conventions
- Use `TEXTURE` to read the entity's sprite texture
- Use `UV` for sampling coordinates
- Use `TEXTURE_PIXEL_SIZE` for pixel size calculations
- Shader renders in SubViewport that replaces entity's texture

---

## Effect Application Modes

### 1. Screen-Scope Generator
**What**: Full-screen shader that generates visuals (no screen input needed)
**Example**: Rainbow swirl, noise pattern, gradient
**Implementation**: `_apply_simple_screen_effect()` → CanvasLayer(100) + ColorRect + ShaderMaterial
**Test Game**: `shaderFullscreen` (UUID: `26510497-a864-46b9-8536-67fe8933a1c2`)
**Status**: [x] WORKING — verified via game inspector, rainbow swirl renders fullscreen

### 2. Screen-Scope Post-Process
**What**: Reads screen content via `hint_screen_texture`, applies effect on top
**Example**: CRT scanlines, bloom, color grading, vignette
**Implementation**: `_apply_simple_screen_effect()` → CanvasLayer(100) + ColorRect + shader with `hint_screen_texture`
**Test Game**: `shaderCRT` (UUID: `4c0f1717-6f1b-46ee-84bc-abe17a23fb6d`)
**Status**: [x] WORKING — fixed `return` in fragment() (Godot GLES3 restriction), CRT scanlines + chromatic aberration render over game

### 3. Screen-Scope Built-in Library Shader
**What**: Same as #2 but using a shader from the built-in library
**Example**: `node.type = "crt"` uses the library's CRT shader (already has hint_screen_texture)
**Implementation**: Same as #2 but GLSL comes from `getShaderGlsl(node.type)`
**Test Game**: NONE — need to create one that uses a built-in type
**Status**: [ ] UNTESTED

### 4. Entity-Scope Effect
**What**: Applies shader to a single entity's CanvasItem (Polygon2D, Sprite2D)
**Example**: Glow, outline, pixelation, color shift on one character
**Implementation**: `apply_sprite_effect()` sets `ShaderMaterial` directly on the CanvasItem — zero texture copies, GPU-only
**Test Game**: `shaderCRT` ball entity — pulsing orange/green glow running simultaneously with CRT post-process
**Status**: [x] WORKING — entity shader + screen post-process both active at 60fps

### 5. Multi-Pass Screen (Future)
**What**: Chain of screen-scope effects (blur → color correction, etc.)
**Implementation**: Would require SubViewport pipeline (which was buggy). Currently only simple path works.
**Test Game**: `shaderMulti` (UUID: `4bf25e40-5fa4-4d07-a2cb-2a8a7902d9f6`) — currently uses old format
**Status**: [ ] NOT YET SUPPORTED — simple path only handles first pass

### 6. Multi-Pass Entity (Future)
**What**: Chain of entity effects (pixelate → glow)
**Implementation**: GraphExecutor with connections between nodes
**Test Game**: NONE
**Status**: [ ] UNTESTED

### 7. Simultaneous Screen + Entity (Future)
**What**: Screen post-process AND entity effects at the same time
**Implementation**: Screen uses CanvasLayer path, entity uses GraphExecutor (separate executors)
**Test Game**: NONE — need to create one
**Status**: [ ] UNTESTED

---

## Test Games

| Game | UUID | Scope | Type | Format | Status |
|------|------|-------|------|--------|--------|
| shaderFullscreen | `26510497-a864-46b9-8536-67fe8933a1c2` | Screen | Generator (custom GLSL) | effects.graph | ✅ WORKING |
| shaderCRT | `4c0f1717-6f1b-46ee-84bc-abe17a23fb6d` | Screen | Post-process (custom GLSL) | effects.graph | ✅ WORKING |
| shaderRainbow | `3fae1cfe-f97a-47b2-b66e-abced9400819` | Entity | Sprite effect | effects.shaders (OLD) | Needs conversion |
| shaderMulti | `4bf25e40-5fa4-4d07-a2cb-2a8a7902d9f6` | Entity | Multi-effect | effects.shaders (OLD) | Needs conversion |
| (needed) | — | Screen | Built-in library shader | effects.graph | Not created |
| (needed) | — | Entity | Single entity effect | effects.graph | Not created |

---

## Recent Fixes (This Session)

1. **Screen-scope re-enabled** in GameBridgeEffects.gd (was commented out)
2. **Custom GLSL support** via `params.shaderSource` in compiler
3. **shaderSource stripped from runtime params** (was leaking as shader uniform)
4. **Simple screen-scope rendering** — `_apply_simple_screen_effect()`: CanvasLayer + ColorRect instead of buggy SubViewport pipeline
5. **CRT game converted** from `effects.shaders` to `effects.graph` with `hint_screen_texture`
6. **Shader rewrite removed** — no longer rewriting SCREEN_TEXTURE for SubViewport (not needed with simple path)
7. **CRT shader `return` fix** — Godot GLES3/WebGL forbids `return` in `fragment()`. Rewrote to if-else.
8. **innerGlow shader `return` fix** — same issue in the built-in shader library
9. **Compiler tests added** — GLES3 compat check across all 37+ library shaders, real game definition compilation tests
10. **Stale rewrite tests removed** — 5 tests for removed SubViewport SCREEN_TEXTURE rewrite path
11. **Simultaneous screen + entity effects architecture** — `apply_plan()` now routes by scope without clearing the other executor. `effects.graphs` array support in GameDefinition.
12. **Multi-graph support in GameLoader** — iterates over all graphs, compiles and applies each independently
13. **Live handler fix** — effects-handler now applies ALL compiled plans, not just the alphabetically-first one
14. **`apply_sprite_effect` implemented** — sets ShaderMaterial directly on entity CanvasItem (Polygon2D/Sprite2D), zero texture copies
15. **`create_dynamic_shader` implemented** — creates and caches Shader objects, `apply_dynamic_shader_to_entity` applies to entities
16. **`entityEffects` field added** — GameDefinition supports `effects.entityEffects[]` for declarative per-entity shader application
17. **`clear_plan()` refactored** — now clears both entity and screen executors via `clear_entity_plan()` + `clear_screen_plan()`

---

## Key Files

| File | Role |
|------|------|
| `shared/src/effects/compiler.ts` | Graph → CompiledPlan |
| `shared/src/effects/types.ts` | Type definitions |
| `shared/src/effects/resources.ts` | Resource graph builder |
| `shared/src/effects/shaderLibrary.ts` | Built-in shader GLSL (37 shaders) |
| `shared/src/effects/shaderRewrite.ts` | SCREEN_TEXTURE rewrite (currently unused) |
| `shared/src/effects/validator.ts` | Graph validation |
| `godot_project/scripts/bridge/GameBridgeEffects.gd` | Godot effects bridge |
| `godot_project/scripts/effects/GraphExecutor.gd` | Multi-pass executor (entity scope) |
| `godot_project/scripts/effects/ResourceGraph.gd` | Viewport allocation |
| `godot_project/scripts/effects/PingPongManager.gd` | Feedback buffer management |
| `app/lib/game-engine/GameLoader.ts` | applyEffects() entry point |
| `app/lib/game-engine/live/tag-handlers/effects-handler.ts` | Hot-reload handler |

---

## TODO (Priority Order)

1. [x] **Verify shaderFullscreen** renders rainbow swirl (screen generator)
2. [x] **Verify shaderCRT** renders CRT effect over game content (screen post-process)
3. [ ] Create test game using **built-in library shader** (e.g., `node.type = "crt"` or `"vignette"`)
4. [ ] Create **entity-scope test game** with a sprite effect (e.g., glow on ball inside CRT scene)
5. [ ] Convert shaderRainbow to effects.graph (entity scope)
6. [ ] Convert shaderMulti to effects.graph (entity scope or decompose)
7. [ ] Test **multi-pass screen pipeline** (SubViewport approach — needs debugging for 2+ passes)
8. [ ] Test **feedback/ping-pong pipeline** for evolving effects
9. [ ] Document effect authoring guide for AI agents
10. [ ] Clean up dead code paths (old standalone shaders support, unused shaderRewrite)
11. [ ] Connect game inspector error detection to live editor chat for auto-fix
