# 3D GLB Model Rendering in Godot - Experiment Scope

## Summary

This document scopes the work required to render 3D GLB models in the Slopcade Godot engine, with a focus on 2.5D hybrid approaches where games are defined on a 2D grid but may render 3D models.

## Current State

| Component | State |
|-----------|-------|
| Godot Project | 100% 2D (Node2D, RigidBody2D, Camera2D) |
| GameBridge | 2D-only API |
| React Bridge | 2D coordinate system |
| Rendering | Sprite2D, 2D shaders |

## GLB File Optimization

### The Problem
Your 26MB GLB file contains:
- **500,000 triangles** (very high poly)
- **4096x4096 PNG texture** (12MB file, 89MB GPU memory)

### The Solution
```bash
# Install gltf-transform
pnpm add -wD @gltf-transform/cli

# Inspect any GLB file
npx gltf-transform inspect model.glb

# Full optimization (geometry + textures)
npx gltf-transform optimize input.glb output.glb \
  --compress draco \
  --texture-compress webp \
  --texture-size 1024

# Just reduce polygon count (50% reduction)
npx gltf-transform simplify input.glb output.glb --ratio 0.5

# Just compress geometry (Draco)
npx gltf-transform draco input.glb output.glb --method edgebreaker
```

### Results
| Original | Optimized | Reduction |
|----------|-----------|-----------|
| 26.81 MB | 823 KB | **97%** |

## Godot 4 GLB Support

### Runtime Loading (GDScript)
```gdscript
func load_glb(path: String) -> Node3D:
    var gltf_doc = GLTFDocument.new()
    var gltf_state = GLTFState.new()
    
    var error = gltf_doc.append_from_file(path, gltf_state)
    if error != OK:
        return null
    
    return gltf_doc.generate_scene(gltf_state)
```

### From Buffer (for web/data transfer)
```gdscript
func load_glb_from_buffer(buffer: PackedByteArray) -> Node3D:
    var gltf_doc = GLTFDocument.new()
    var gltf_state = GLTFState.new()
    
    gltf_doc.append_from_buffer(buffer, "", gltf_state)
    return gltf_doc.generate_scene(gltf_state)
```

## 2.5D Architecture Options

### Option A: SubViewport Compositing (Recommended)
```
┌─────────────────────────────────────────┐
│  SubViewport (3D)                       │
│  ├── Camera3D (orthographic)            │
│  ├── DirectionalLight3D                 │
│  └── 3DModelsRoot                       │
└───────────────┬─────────────────────────┘
                ↓ Renders to ViewportTexture
┌───────────────▼─────────────────────────┐
│  Main (Node2D)                          │
│  ├── TextureRect (shows 3D viewport)    │
│  ├── Existing 2D physics                │
│  └── UI overlays                        │
└─────────────────────────────────────────┘
```

**Pros:**
- Keeps all existing 2D game logic
- 3D is purely visual layer
- Easy to toggle 3D on/off

**Cons:**
- Two coordinate systems
- Extra rendering overhead

### Option B: Full 3D Migration
Replace Node2D hierarchy with Node3D, constrain to XZ plane.

**Pros:**
- Single coordinate system
- Native 3D physics available

**Cons:**
- Significant refactoring
- May break existing games

### Option C: Entity-Level 3D Sprites
Replace individual Sprite2D with 3D models, keep 2D physics.

**Pros:**
- Minimal architecture change
- Per-entity 3D vs 2D choice

**Cons:**
- Z-ordering complexity
- Mixed rendering modes

## Implementation Phases

### Phase 1: Lab Experiment (Done ✅)
- [x] GLB optimization pipeline (gltf-transform)
- [x] Lab3D.tscn scene with Camera3D, lights
- [x] Lab3D.gd script for runtime loading
- [x] Test model optimized (26MB → 823KB)

Location: `godot_project/scenes/Lab3D.tscn`, `godot_project/scripts/Lab3D.gd`

### Phase 2: React Bridge Integration (2-4 hours)
- [ ] Add scene switching to GameBridge
- [ ] Add 3D-specific TypeScript types
- [ ] Create React example component
- [ ] Test on web WASM

### Phase 3: 2.5D Hybrid System (4-8 hours)
- [ ] Implement SubViewport compositing
- [ ] Add 2D→3D coordinate mapping
- [ ] Support mixed 2D/3D entities
- [ ] Camera system for 2.5D views

### Phase 4: Production Integration (1-2 days)
- [ ] GameDefinition schema updates for 3D entities
- [ ] Asset pipeline for 3D models
- [ ] Performance optimization (LOD, culling)
- [ ] Mobile considerations

## Testing the Lab

### Option 1: Godot Editor (Quickest)
1. Open `godot_project/` in Godot 4.3+
2. In Project Settings → Application → Run → Main Scene
3. Change from `res://Main.tscn` to `res://scenes/Lab3D.tscn`
4. Run (F5)

### Option 2: Export New WASM
```bash
# Export Lab3D as separate WASM build
godot --headless --path godot_project \
  --export-release "Web" export/lab3d/index.html
```

### Option 3: Scene Switching API (Future)
Add to GameBridge:
```gdscript
func switch_scene(scene_path: String) -> void:
    get_tree().change_scene_to_file(scene_path)
```

## Key Files

| File | Purpose |
|------|---------|
| `godot_project/scenes/Lab3D.tscn` | 3D lab scene |
| `godot_project/scripts/Lab3D.gd` | GLB loading logic |
| `godot_project/models/test_model.glb` | Optimized test model |

## Performance Considerations

### Mobile
- Keep poly count under 50K for older devices
- Use 512x512 or 1024x1024 textures max
- Draco compression requires decoder (~300KB WASM)

### Web WASM
- GLB files can be fetched via HTTP
- Use compressed GLB for faster loading
- Consider lazy loading for multiple models

### Recommended Limits
| Platform | Max Triangles | Max Texture |
|----------|---------------|-------------|
| High-end mobile | 100K | 2048² |
| Low-end mobile | 30K | 1024² |
| Web | 200K | 2048² |

## Next Steps

1. **To test now:** Open Godot, set Lab3D.tscn as main scene, run
2. **To integrate:** Add scene switching to GameBridge
3. **For production:** Implement Option A (SubViewport compositing)
