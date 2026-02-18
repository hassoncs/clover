# Render-to-Texture Masking

## Goal
Allow any render source (particles, entities, shapes, procedural noise) to be captured as a texture and fed as an input to any shader effect — enabling masking, compositing, and layered effects.

## Use Cases
- Particle system → B&W texture → dissolve mask on an entity
- Entity silhouette → blur → soft shadow behind it
- Noise generator → animated distortion mask for water/fire
- Camera feed → chromakey mask → background replacement
- Multiple entity group → single post-process effect on just that group

## Architecture

### How It Already Works (partially)
The `GraphExecutor` already supports `externalInputs` — named textures that get bound as shader uniforms. The `set_external_input` bridge method accepts base64 image data and binds it. The `set_input_buffer` method binds any `Texture2D`.

What's missing: a way to **capture live render output** as a texture and feed it to another graph/shader.

### Proposed: RenderTexture Sources

Add a `renderTextures` section to the game definition that declares named SubViewports. Each captures a specific render source and exposes it as a named texture that shaders can reference.

```json
{
  "effects": {
    "renderTextures": {
      "particleMask": {
        "source": "particles",
        "filter": { "preset": "fire" },
        "resolution": "half",
        "colorMode": "luminance"
      },
      "entitySilhouette": {
        "source": "entity",
        "entityId": "player",
        "colorMode": "alpha"
      }
    },
    "graphs": [
      {
        "scope": "entity",
        "nodes": [{
          "id": "dissolve",
          "type": "dissolve",
          "inputSlots": [
            { "name": "input", "dataType": "texture" },
            { "name": "mask", "dataType": "texture", "connectedTo": { "renderTexture": "particleMask" } }
          ]
        }]
      }
    ]
  }
}
```

### Implementation Steps

#### Phase 1: SubViewport Capture (core plumbing)
1. **RenderTextureManager.gd** — new Godot autoload that manages named SubViewports
   - `create_render_texture(name, size, clear_mode)` → creates SubViewport, returns Texture2D
   - `get_texture(name)` → returns live ViewportTexture
   - `destroy(name)`
2. **Bridge integration** — register with GameBridgeEffects.gd
   - `create_render_texture` → SubViewport creation
   - `bind_render_texture(name, target_graph)` → feeds texture into GraphExecutor via `set_input_buffer`
3. **Performance**: SubViewports render on GPU. Cost is 1 extra render pass per capture. At half resolution, this is cheap.

#### Phase 2: Render Sources
4. **Entity capture** — reparent entity subtree into SubViewport temporarily, render, reparent back. Or use `CanvasItem.visibility_layer` to selectively capture.
5. **Particle capture** — spawn particles inside the SubViewport. They render there naturally.
6. **Procedural generators** — ColorRect with a generator shader inside the SubViewport (same pattern as our screen effects).

#### Phase 3: Compositing in Shaders
7. **Mask input binding** — compiler recognizes `connectedTo.renderTexture` and binds the SubViewport's texture as a sampler2D uniform
8. **Color mode conversion** — `luminance` mode: shader reads RGB and converts to grayscale for masking. `alpha` mode: uses alpha channel as mask.
9. **Live update** — SubViewport updates every frame, so masks animate with their source.

### Performance Considerations
- Each render texture = 1 additional SubViewport render pass
- Half-resolution capture = 1/4 pixel cost
- Godot SubViewports are GPU-native — no CPU texture copies
- Budget: 4-6 render textures at half-res is very affordable, even on mobile web
- Avoid: render textures at full resolution with complex scenes inside them

### What This Enables (Future)
- Particle-driven dissolve effects
- Dynamic shadow casting via silhouette capture
- Glow/bloom on specific entity groups (not full screen)
- Portals (render one area, project as texture in another)
- Minimap rendering
- Picture-in-picture

### Dependencies
- SubViewport management (Phase 1 is standalone)
- Graph compiler changes (Phase 3 needs `renderTexture` input type)
- No blocking dependencies on current work

### Estimated Effort
- Phase 1: 1-2 days (core SubViewport plumbing)
- Phase 2: 1-2 days (render source types)
- Phase 3: 1 day (compiler + shader binding)
- Total: ~4-5 days
