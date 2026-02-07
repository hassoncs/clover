# Decisions - Live Camera to Godot Texture

## Data Transfer Mechanism
**Decision**: Use a global variable (`window._cameraFrameData`) in JS and poll it from GDScript.
**Rationale**: 
- Avoids the overhead of `postMessage` or base64 encoding.
- `JavaScriptBridge` provides direct access to JS objects.
- Polling in `_process` (GDScript) matches Godot's frame-based architecture.
- Simpler to implement and debug than a callback-based system for high-frequency data.

## Pixel Format
**Decision**: Use `RGBA8` format.
**Rationale**: Matches `canvas.getImageData` output and Godot's `Image.FORMAT_RGBA8`.

## Camera Capture Throttling
**Decision**: Target 20fps in JS.
**Rationale**: Provides a balance between smoothness and performance. Most webcams are 30fps anyway, and 20fps is plenty for a game texture.

## GDExtension Spike: Build System
**Decision**: Use godot-cpp as a shallow clone (not git submodule) with SConstruct delegating to godot-cpp/SConstruct.
**Rationale**: Task spec says no submodule. Shallow clone keeps it lightweight (~50MB). The official godot-cpp-template pattern works well.

## GDExtension Spike: GO/NO-GO
**Status**: CONDITIONAL GO — macOS build succeeds, symbols export correctly. Still need runtime validation (load in Godot editor, run benchmark) and WASM build test.
**Evidence**:
- GDExtension compiles and links: `libcamera_texture.macos.template_debug.dylib` (382KB)
- Entry point `camera_texture_init` exported and visible
- dlsym target `get_spike_test_ptr` exported and visible
- ImageTexture benchmark code compiles against godot-cpp 4.3 API
**Remaining**: Runtime test in Godot editor, WASM build with Emscripten, actual ImageTexture.update() timing numbers
