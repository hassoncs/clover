# 3D Rendering in Godot (2.5D Setup)

## Overview

The Slopcade Godot engine supports rendering 3D models (GLB/glTF) as an overlay on top of the 2D physics-based games. This creates a "2.5D" visual effect where 3D assets can be displayed while the underlying game logic remains 2D.

## Architecture

```
GameBridge (Autoload)
├── Camera2D (existing 2D game camera)
└── Viewport3D (Node2D)
    ├── SubViewport (512x512, transparent background)
    │   ├── Camera3D (orthographic projection)
    │   ├── DirectionalLight3D
    │   ├── WorldEnvironment (ambient lighting)
    │   └── ModelContainer (Node3D) ← GLB models loaded here
    └── Sprite2D (displays SubViewport texture, z_index=1000)
```

## Key Files

| File | Description |
|------|-------------|
| `godot_project/scripts/3d/Viewport3D.gd` | SubViewport-based 3D renderer, camera setup, model container |
| `godot_project/scripts/3d/GLBLoader.gd` | GLB/glTF loading, HTTP download, auto-centering and scaling |
| `godot_project/scripts/GameBridge.gd` | JS bridge callbacks for 3D operations |
| `app/lib/godot/types.ts` | TypeScript type definitions for 3D methods |
| `app/lib/godot/GodotBridge.web.ts` | Web implementation of 3D bridge methods |
| `app/lib/godot/GodotBridge.native.ts` | Native implementation of 3D bridge methods |
| `app/app/examples/glb_viewer.tsx` | Test page for 3D viewer |

## JavaScript Bridge API

### Methods

```typescript
// Load GLB from local path (not typically used on web)
show_3d_model(path: string): void

// Load GLB from URL (async download)
show_3d_model_from_url(url: string): void

// Position the 3D viewport (in game coordinates)
set_3d_viewport_position(x: number, y: number): void

// Resize the 3D viewport
set_3d_viewport_size(width: number, height: number): void

// Set model rotation (degrees)
rotate_3d_model(x: number, y: number, z: number): void

// Set camera distance from model
set_3d_camera_distance(distance: number): void

// Clear all loaded models
clear_3d_models(): void
```

## GLB Loading Process

1. **Download**: `HTTPRequest` fetches the GLB file from URL
2. **Parse**: `GLTFDocument.append_from_buffer()` parses the binary data
3. **Generate**: `GLTFDocument.generate_scene()` creates a Node3D tree
4. **Center & Scale**: Model is automatically centered at origin and scaled to fit `target_size` (default 2.0 world units)
5. **Add to Scene**: Model is added to `ModelContainer` inside the SubViewport

## Camera Configuration

| Property | Value | Notes |
|----------|-------|-------|
| Projection | Orthographic | For consistent sizing regardless of depth |
| Size | 4.0 | Vertical extent in world units |
| Position | (0, 0, 5) | 5 units back from origin |
| Look At | Origin | Camera faces the model |

## Known Issues

### Camera Positioning (TODO)
Models currently appear offset from center. The SubViewport→Sprite2D rendering pipeline has a coordinate mapping issue that causes content to appear in the bottom-right corner instead of centered. This needs investigation into:
- Camera `look_at()` behavior in SubViewport context
- Sprite2D texture coordinate mapping
- Potential Y-axis flip issues between 3D and 2D coordinate systems

### Workaround
For now, models do render and are visible. If precise centering is needed, adjust the model's position in `_center_and_scale_model()` or the camera's position/size.

## Usage Example

```typescript
// In React component
const bridge = useGodotBridge();

// Load a 3D duck model from GitHub
bridge.show_3d_model_from_url(
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb'
);

// Rotate the model
bridge.rotate_3d_model(0, 45, 0); // 45 degrees around Y axis

// Adjust camera zoom
bridge.set_3d_camera_distance(8); // Move camera further back
```

## Test Page

Visit `/examples/glb_viewer` in the web app to test 3D model loading:
- "Load 2D Background" - Verifies 2D rendering still works
- "Load 3D Duck" - Loads the Khronos glTF sample duck model

## Future Improvements

1. **Fix camera centering** - Investigate SubViewport coordinate mapping
2. **Animation support** - Play embedded glTF animations
3. **Multiple models** - Support loading multiple 3D models simultaneously
4. **Model transforms** - Expose position/scale/rotation per-model
5. **Lighting controls** - Allow games to customize lighting setup
6. **Perspective mode** - Option for perspective camera for more dramatic 3D effects
