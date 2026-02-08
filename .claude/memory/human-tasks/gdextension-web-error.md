# GDExtension Web Load Error

## Problem

On every web page load, Godot logs these errors:

```
ERROR: No GDExtension library found for current OS and architecture (web.wasm32)
       in configuration file: res://addons/camera-texture/camera_texture.gdextension
ERROR: GDExtension dynamic library not found: 'res://addons/camera-texture/camera_texture.gdextension'
ERROR: Error loading extension: 'res://addons/camera-texture/camera_texture.gdextension'
```

The errors are **non-fatal** — the app works fine. But they're noisy and confusing.

## Why It Happens

1. `godot_project/.godot/extension_list.cfg` registers `camera_texture.gdextension` for loading
2. The `.gdextension` file only has `macos` and `ios` library entries — no `web.wasm32`
3. On web startup, Godot reads the extension list, tries to resolve a library for `web.wasm32`, fails, logs ERROR
4. `CameraManager.gd` already has runtime guards (`ClassDB.class_exists("CameraTextureProvider")`) so nothing actually breaks

## Constraint

`extension_list.cfg` is shared across all platforms. The camera-texture GDExtension **must** remain registered for native (iOS/macOS) builds. We only want to suppress or exclude it for web.

## Files Involved

| File | Role |
|------|------|
| `godot_project/.godot/extension_list.cfg` | Global extension registry (2 entries: camera-texture + rapier) |
| `godot_project/addons/camera-texture/camera_texture.gdextension` | Per-platform library paths (macos + ios only) |
| `godot_project/export_presets.cfg` | Web + iOS export configs (web has empty `exclude_filter`) |
| `scripts/export-godot.mjs` | Export pipeline script (watches + rebuilds) |

## Options Considered

### 1. Modify export script to strip extension for web builds
Temporarily remove the camera-texture line from `extension_list.cfg` before web export, restore after. Pros: targeted fix. Cons: fragile file manipulation, race conditions with watcher.

### 2. Add web entry to .gdextension pointing to a no-op wasm
Build an empty GDExtension for web that does nothing. Pros: clean at the Godot level. Cons: need to compile and maintain a dummy wasm, adds to bundle size.

### 3. Use `exclude_filter` in export_presets.cfg
Set `exclude_filter="addons/camera-texture/*"` on the Web preset. The `.gdextension` file wouldn't be in the `.pck`. But `extension_list.cfg` still references it, so Godot may log a different "file not found" error instead.

### 4. Custom HTML shell that suppresses the specific errors
Godot supports `html/custom_html_shell` in export presets. Could filter these specific console errors. Pros: no build pipeline changes. Cons: hides rather than fixes.

### 5. Godot feature tags / conditional extension loading
Research whether Godot 4.3+ supports conditional extension loading based on platform feature tags. This would be the ideal solution but may not exist.

## Current Status

**Unresolved** — errors are non-fatal but present on every web load. Need to pick an approach.
