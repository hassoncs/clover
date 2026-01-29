# Godot 4.5 + Rapier Physics WASM Build Guide

This document describes the exact working configuration for building Godot 4.5 with Rapier physics for Web/WASM exports.

## Working Combination (Verified)

| Component | Version/Settings | Source |
|-----------|------------------|--------|
| **Godot Editor** | 4.5.1 stable official | Download from godotengine.org |
| **Web Template** | `web_dlink_nothreads_release.zip` | Official Godot export templates |
| **Rapier Plugin** | v0.8.25 pre-built WASM | From `addons/godot-rapier2d/` (single-threaded, dlink-enabled) |
| **GDScript Export** | Text format (binary disabled) | `gdscript/export_text_script_files=true` in export preset |
| **Build Method** | Use official editor, not custom builds | Must use downloaded Godot, not compiled from source |

## Failed Combinations (Do Not Use)

| Combination | Error | Reason |
|-------------|-------|--------|
| Custom-built Godot + custom-built Rapier | ABI version mismatch | Pre-built bindings don't match custom Godot |
| Godot 4.4 + gdext 0.4.4 | Struct size mismatch | gdext 0.4.4 doesn't match Godot 4.4-stable ABI |
| Threaded builds (`threads=yes`) | Compilation errors | gdext threading support broken for WASM |
| Emscripten 4.0.0 custom builds | `_emscripten_stack_set_limits` errors | Version mismatch between Godot and Rapier WASM |
| Binary GDScript export | "not compatible with engine version" | Bytecode format mismatch between editor and template |

## Step-by-Step Setup

### 1. Install Official Godot 4.5.1

```bash
# Download from https://godotengine.org/download
# For macOS:
curl -L -o /tmp/godot-4.5.zip "https://github.com/godotengine/godot/releases/download/4.5-stable/Godot_v4.5-stable_macos.universal.zip"
unzip /tmp/godot-4.5.zip -d /Applications/
mv /Applications/Godot.app /Applications/Godot-4.5.app
```

### 2. Install Official Web Templates

```bash
# Open Godot 4.5 editor
# Go to Editor > Manage Export Templates
# Click "Download and Install" for 4.5.1-stable
# Or manually download from:
# https://downloads.tuxfamily.org/godotengine/4.5.1/
```

Templates will be installed to:
- **macOS**: `~/Library/Application Support/Godot/export_templates/4.5.1.stable/`
- **Linux**: `~/.local/share/godot/export_templates/4.5.1.stable/`
- **Windows**: `%APPDATA%/Godot/export_templates/4.5.1.stable/`

### 3. Configure Rapier Plugin

Use the pre-built Rapier plugin from the repository:

```bash
# Location: godot_project/addons/godot-rapier2d/
# Key files:
# - bin/wasm-nothreads/godot_rapier.wasm (pre-built, single-threaded)
# - godot-rapier2d.gdextension
```

**Do NOT** build Rapier from source unless you absolutely need custom modifications.

### 4. Configure Export Preset

In `godot_project/export_presets.cfg`:

```ini
[preset.0]
name="Web"
platform="Web"

[preset.0.options]
# CRITICAL: Use official dlink template
custom_template/release="res://export_templates/web_dlink_nothreads_release.zip"
variant/extensions_support=true

# CRITICAL: Export text GDScript, not binary
gdscript/export_text_script_files=true
```

### 5. Export Command

```bash
# Use official Godot editor, not custom build
/Applications/Godot-4.5.app/Contents/MacOS/Godot \
  --path godot_project \
  --headless \
  --export-release "Web" \
  ./export/web/index.html
```

### 6. Clear All Caches

Before each export, clear:

```bash
# Godot internal cache
rm -rf godot_project/.godot/

# Compiled GDScript
find godot_project -name "*.gdc" -delete
find godot_project -name "*.gde" -delete

# Metro/React Native cache
rm -rf app/.metro-cache/
rm -rf app/node_modules/.cache/

# Exported files
rm -rf app/public/godot/*
```

## Key Insights

### Why Pre-Built Rapier Works

The Rapier plugin ships with pre-compiled WASM binaries built with:
- Specific Emscripten version matching Godot 4.5.1
- Single-threaded (no SharedArrayBuffer required)
- dlink-enabled (dynamic linking for GDExtensions)
- No threading (avoids gdext threading bugs)

### Why Official Godot Editor is Required

The official editor has:
- Specific GDExtension API version
- Pre-built web templates with matching Emscripten
- Compatible GDScript bytecode format (when using text export)

Custom-built Godot will have different:
- Commit hash (affects API version)
- Emscripten version (breaks WASM compatibility)
- Build flags (affects feature availability)

### Why Text GDScript

Binary GDScript bytecode is **not portable** across:
- Different Godot versions
- Different build configurations
- Different platforms

Always use text GDScript for web exports.

## Troubleshooting

### Error: "GDExtension libraries are not supported"

**Cause**: Using non-dlink template
**Fix**: Use `web_dlink_nothreads_release.zip`

### Error: "Pack version unsupported: 3"

**Cause**: .pck built with different Godot version
**Fix**: Clear all caches and re-export with official editor

### Error: "Binary GDScript is not compatible"

**Cause**: Binary GDScript export enabled
**Fix**: Set `gdscript/export_text_script_files=true`

### Error: "memory access out of bounds" after Rapier loads

**Cause**: Entity collider not resolved from template
**Fix**: Ensure `collider: definition.collider ?? template.collider` in EntityManager.resolveTemplate()

### Error: "_emscripten_stack_set_limits is not a function"

**Cause**: Emscripten version mismatch
**Fix**: Use official templates, don't build custom

## Working Verification

When working correctly, browser console shows:

```
Initialize godot-rust (API v4.5.stable.official...)
PHYSICS ENGINE 2D: Rapier2D v0.8.25
Build configuration: Emscripten 4.0.10, single-dimension, no threading support.
Added 93 plugins to registry!
```

## Summary

The **only reliable method** is:
1. Download official Godot 4.5.1
2. Download official web templates
3. Use pre-built Rapier plugin
4. Export with text GDScript
5. Clear caches between builds

Building from source (Godot or Rapier) will introduce version mismatches that are extremely difficult to debug.
