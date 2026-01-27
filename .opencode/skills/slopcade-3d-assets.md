# GLB/glTF 3D Model Optimization Skill

**Use this skill when**: Asked to optimize, compress, simplify, or analyze 3D models in GLB/glTF format for use in games, web, or mobile applications.

**Triggers**: "optimize GLB", "compress 3D model", "reduce polygon count", "simplify mesh", "GLB too large", "glTF optimization", "3D model for mobile", "Draco compression", "analyze GLB"

---

## Overview

This skill provides the COMPLETE workflow for optimizing GLB/glTF 3D models for game engines (Godot, Unity, Unreal), web (Three.js, Babylon.js), and mobile applications. Covers analysis, mesh simplification, texture compression, and Draco geometry compression.

## Prerequisites

### Install gltf-transform CLI

```bash
# In project root (workspace)
pnpm add -wD @gltf-transform/cli

# Or globally
npm install -g @gltf-transform/cli

# Verify installation
npx gltf-transform --version
```

**What it provides**:
- `inspect` - Analyze file composition
- `optimize` - Full optimization pipeline
- `simplify` - Reduce polygon count
- `draco` - Compress geometry
- `meshopt` - Alternative compression
- Various texture operations

## Step-by-Step Workflow

### Phase 1: Analyze the Model

**ALWAYS start by inspecting the file to understand what's taking up space.**

```bash
npx gltf-transform inspect path/to/model.glb
```

**Sample output**:
```
MESHES
┌───┬──────────┬───────────┬────────────────┬──────────────┬──────────┬─────────┬──────────┐
│ # │ name     │ mode      │ meshPrimitives │ glPrimitives │ vertices │ indices │ size     │
├───┼──────────┼───────────┼────────────────┼──────────────┼──────────┼─────────┼──────────┤
│ 0 │ material │ TRIANGLES │ 1              │ 500,000      │ 276,287  │ u32     │ 14.84 MB │
└───┴──────────┴───────────┴────────────────┴──────────────┴──────────┴─────────┴──────────┘

TEXTURES
┌───┬──────────────────┬─────┬──────────────────┬───────────┬───────────┬────────────┬──────────┬──────────┐
│ # │ name             │ uri │ slots            │ instances │ mimeType  │ resolution │ size     │ gpuSize  │
├───┼──────────────────┼─────┼──────────────────┼───────────┼───────────┼────────────┼──────────┼──────────┤
│ 0 │ texture_20250901 │     │ baseColorTexture │ 1         │ image/png │ 4096x4096  │ 11.97 MB │ 89.48 MB │
└───┴──────────────────┴─────┴──────────────────┴───────────┴───────────┴────────────┴──────────┴──────────┘
```

**What to look for**:
| Metric | Concern Threshold | Solution |
|--------|-------------------|----------|
| **glPrimitives** (triangles) | > 100K for mobile | Use `simplify` |
| **vertices** | > 50K for mobile | Use `simplify` |
| **Mesh size** | > 5 MB | Use `draco` compression |
| **Texture resolution** | > 2048x2048 | Use `--texture-size` |
| **Texture format** | PNG (large) | Use `--texture-compress webp` |
| **gpuSize** | > 50 MB | Reduce texture size |

### Phase 2: Choose Optimization Strategy

Based on inspection, select the appropriate approach:

#### Option A: Full Optimization (Recommended for most cases)

```bash
npx gltf-transform optimize input.glb output.glb \
  --compress draco \
  --texture-compress webp \
  --texture-size 1024
```

**What this does**:
- Deduplicates geometry and textures
- Welds duplicate vertices
- Simplifies meshes
- Compresses geometry with Draco (~95% smaller)
- Converts textures to WebP (~70% smaller)
- Resizes textures to max 1024x1024

**Typical results**: 26 MB → 823 KB (97% reduction)

#### Option B: Mesh Simplification Only

When you need to reduce polygon count but keep textures intact:

```bash
# Reduce to 50% of original triangles
npx gltf-transform simplify input.glb output.glb --ratio 0.5 --error 0.001

# Aggressive reduction (25% of original)
npx gltf-transform simplify input.glb output.glb --ratio 0.25 --error 0.01
```

**Parameters**:
- `--ratio`: Target percentage (0.5 = 50% of original triangles)
- `--error`: Maximum allowed deviation (lower = more accurate, slower)

#### Option C: Draco Compression Only

When mesh complexity is fine but file size is too large:

```bash
npx gltf-transform draco input.glb output.glb --method edgebreaker
```

**Methods**:
- `edgebreaker` - Best compression, slower encode
- `sequential` - Faster encode, less compression

**Note**: Draco compresses geometry without visual loss, but requires decoder at runtime (~300KB WASM).

#### Option D: Meshopt Compression

Alternative to Draco, works without special decoder:

```bash
npx gltf-transform meshopt input.glb output.glb --level medium
```

**Levels**: `low`, `medium`, `high`

#### Option E: Texture Optimization Only

When textures are the problem:

```bash
# Convert to WebP and resize
npx gltf-transform optimize input.glb output.glb \
  --texture-compress webp \
  --texture-size 1024

# Just resize (keep original format)
npx gltf-transform resize input.glb output.glb --max-size 1024
```

### Phase 3: Verify Results

```bash
# Check output file size
ls -lh output.glb

# Inspect optimized model
npx gltf-transform inspect output.glb

# Compare sizes
echo "Original: $(du -h input.glb | cut -f1)"
echo "Optimized: $(du -h output.glb | cut -f1)"
```

### Phase 4: Test in Target Environment

For Godot projects:
```bash
# Copy to Godot models directory
cp output.glb godot_project/models/

# Test in Godot editor or via GDScript:
# var scene = load_glb("res://models/output.glb")
```

## Complete Command Reference

### Analyze Commands

```bash
# Full inspection
npx gltf-transform inspect model.glb

# List all nodes
npx gltf-transform ls model.glb

# Validate against glTF spec
npx gltf-transform validate model.glb
```

### Optimization Commands

```bash
# Full optimization (recommended)
npx gltf-transform optimize input.glb output.glb \
  --compress draco \
  --texture-compress webp \
  --texture-size 1024

# Just geometry compression
npx gltf-transform draco input.glb output.glb

# Just mesh simplification
npx gltf-transform simplify input.glb output.glb --ratio 0.5

# Just texture compression
npx gltf-transform optimize input.glb output.glb --texture-compress webp

# Just texture resize
npx gltf-transform resize input.glb output.glb --max-size 1024
```

### Utility Commands

```bash
# Convert glTF to GLB (or vice versa)
npx gltf-transform copy input.gltf output.glb

# Remove unused data
npx gltf-transform prune input.glb output.glb

# Merge multiple GLB files
npx gltf-transform merge a.glb b.glb output.glb

# Extract textures
npx gltf-transform unpack input.glb output-folder/
```

## Platform-Specific Recommendations

### Mobile Games (iOS/Android)

```bash
npx gltf-transform optimize input.glb output.glb \
  --compress draco \
  --texture-compress webp \
  --texture-size 512 \
  && npx gltf-transform simplify output.glb output.glb --ratio 0.3
```

**Target metrics**:
- Max 30K triangles
- Max 512x512 textures
- File size < 500 KB

### Web (Three.js, Babylon.js)

```bash
npx gltf-transform optimize input.glb output.glb \
  --compress draco \
  --texture-compress webp \
  --texture-size 1024
```

**Target metrics**:
- Max 100K triangles
- Max 1024x1024 textures
- File size < 2 MB

### Desktop Games (Godot, Unity, Unreal)

```bash
npx gltf-transform optimize input.glb output.glb \
  --compress draco \
  --texture-compress webp \
  --texture-size 2048
```

**Target metrics**:
- Max 500K triangles
- Max 2048x2048 textures
- File size < 10 MB

### VR/AR

```bash
npx gltf-transform optimize input.glb output.glb \
  --compress draco \
  --texture-compress webp \
  --texture-size 1024 \
  && npx gltf-transform simplify output.glb output.glb --ratio 0.5
```

**Target metrics**:
- Max 50K triangles (for 90fps)
- Max 1024x1024 textures
- File size < 1 MB

## Common Issues & Solutions

### Issue: "Draco decoder not found" at runtime

**Cause**: Draco-compressed GLB requires decoder in target engine.

**Solutions**:
1. **Godot 4**: Built-in Draco support, no action needed
2. **Three.js**: Include DRACOLoader
3. **Avoid Draco**: Use meshopt instead:
   ```bash
   npx gltf-transform meshopt input.glb output.glb
   ```

### Issue: WebP textures not loading

**Cause**: Target engine doesn't support WebP.

**Solution**: Use JPEG instead:
```bash
npx gltf-transform optimize input.glb output.glb --texture-compress jpeg
```

### Issue: Model looks wrong after simplification

**Cause**: Ratio too aggressive or error too high.

**Solution**: Use less aggressive settings:
```bash
# More conservative (keep 75%)
npx gltf-transform simplify input.glb output.glb --ratio 0.75 --error 0.0001
```

### Issue: Animations break after optimization

**Cause**: Some optimizations can affect skinned meshes.

**Solution**: Skip animation optimization:
```bash
npx gltf-transform optimize input.glb output.glb \
  --compress draco \
  --no-simplify
```

### Issue: File still too large after optimization

**Solution**: Check textures - they're usually the culprit:
```bash
# Aggressive texture reduction
npx gltf-transform optimize input.glb output.glb \
  --texture-compress webp \
  --texture-size 256

# Or remove textures entirely (for testing)
npx gltf-transform prune input.glb output.glb --textures
```

## Integration with Slopcade

### Directory Structure

```
godot_project/
├── models/
│   ├── raw/              # Original unoptimized GLB files
│   │   └── character.glb  # 26 MB original
│   └── optimized/         # Production-ready files
│       └── character.glb  # 823 KB optimized
```

### Optimization Script

Add to `package.json`:
```json
{
  "scripts": {
    "optimize:glb": "npx gltf-transform optimize",
    "optimize:glb:mobile": "npx gltf-transform optimize --compress draco --texture-compress webp --texture-size 512",
    "inspect:glb": "npx gltf-transform inspect"
  }
}
```

Usage:
```bash
pnpm optimize:glb:mobile input.glb godot_project/models/output.glb
```

### Godot Runtime Loading

```gdscript
# In GLBLoader.gd
func load_glb(path: String) -> Node3D:
    var gltf_doc = GLTFDocument.new()
    var gltf_state = GLTFState.new()
    
    var error = gltf_doc.append_from_file(path, gltf_state)
    if error != OK:
        push_error("Failed to load GLB: " + path)
        return null
    
    return gltf_doc.generate_scene(gltf_state)
```

## Checklist

Use this checklist for every GLB optimization task:

- [ ] Inspected original file to understand composition
- [ ] Identified primary size contributor (geometry vs textures)
- [ ] Chose appropriate optimization strategy
- [ ] Applied optimization with correct parameters
- [ ] Verified output file size meets target
- [ ] Inspected optimized file to confirm metrics
- [ ] Tested loading in target engine (Godot/web/mobile)
- [ ] Verified visual quality is acceptable
- [ ] Archived original file for future reference
- [ ] Copied optimized file to appropriate location

## Quick Reference

| Goal | Command |
|------|---------|
| **Analyze file** | `npx gltf-transform inspect model.glb` |
| **Full optimization** | `npx gltf-transform optimize in.glb out.glb --compress draco --texture-compress webp --texture-size 1024` |
| **Reduce polygons 50%** | `npx gltf-transform simplify in.glb out.glb --ratio 0.5` |
| **Draco compress** | `npx gltf-transform draco in.glb out.glb` |
| **Resize textures** | `npx gltf-transform resize in.glb out.glb --max-size 1024` |
| **Convert to WebP** | `npx gltf-transform optimize in.glb out.glb --texture-compress webp` |
| **Validate file** | `npx gltf-transform validate model.glb` |

## Size Reduction Expectations

| Technique | Typical Reduction | Best For |
|-----------|-------------------|----------|
| Draco compression | 80-95% geometry | Large meshes |
| WebP textures | 50-80% textures | PNG/JPEG textures |
| Mesh simplification | 30-70% geometry | High-poly models |
| Texture resize | 75-90% textures | 4K+ textures |
| **Full optimization** | **90-98% total** | **All cases** |

## Version History

- **2026-01-24 (v1)**: Initial version - Complete GLB optimization workflow
