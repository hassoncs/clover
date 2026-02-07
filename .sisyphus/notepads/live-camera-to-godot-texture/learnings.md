## SharedFrameBuffer Implementation
- Implemented a thread-safe double-buffered frame sharing mechanism in a single C++ header file.
- Used `std::atomic<uint32_t>` with acquire/release memory ordering for lock-free single-producer single-consumer (SPSC) synchronization.
- Pre-allocated two `FrameSlot` buffers of 1280x720x4 bytes (~3.69 MB each) to avoid dynamic allocation during frame processing.
- Exported `get_shared_frame_buffer()` with C linkage and `__attribute__((visibility("default")))` for cross-library discovery via `dlsym`.
- Verified compilation with `clang++ -std=c++17` on macOS.
- The header-only design allows both the VisionCamera Frame Processor Plugin and the Godot GDExtension to share the same data structure and memory segment in the same process.
# Learnings - Live Camera to Godot Texture

- Godot's `JavaScriptBridge` can efficiently access global JS variables.
- `Uint8Array` in JS is mapped to `PackedByteArray` in GDScript when accessed via `JavaScriptBridge`.
- Using `requestAnimationFrame` in JS provides a smooth capture loop that respects browser performance.
- Throttling the capture loop to ~20fps is sufficient for a camera feed and saves CPU/GPU resources.
- Reusing `Image` and `ImageTexture` in Godot (via `set_data` and `update`) is much more efficient than creating new ones every frame.
- Iframe `allow="camera"` is required for `getUserMedia` to work inside an iframe.

## Spike: GDExtension + dlsym + ImageTexture Build Validation

### GDExtension Registration (Godot 4.3 godot-cpp)
- Entry point: `GDExtensionBool GDE_EXPORT camera_texture_init(...)` with `GDExtensionBinding::InitObject`
- Init level: `MODULE_INITIALIZATION_LEVEL_SCENE` for Node-derived classes
- Class registration: `GDREGISTER_CLASS(SpikeTestNode)` in initializer
- `.gdextension` needs `entry_symbol = "camera_texture_init"` and `compatibility_minimum = 4.3`

### godot-cpp Build System
- Clone as subdirectory: `git clone --branch 4.3 --depth 1 https://github.com/godotengine/godot-cpp.git`
- SConstruct delegates via `env = SConscript("godot-cpp/SConstruct")`
- First build: ~2-3 min (compiles 500+ godot-cpp binding files). Subsequent: <5s
- `env["suffix"]` = `.macos.template_debug.universal` — strip `.universal`/`.dev` for lib naming
- macOS `SharedLibrary` won't auto-add `.dylib` if path has dots — must include extension explicitly

### Timer API Gotcha
- `OS::get_singleton()` does NOT have `get_ticks_usec()` in godot-cpp 4.3
- Use `Time::get_singleton()->get_ticks_usec()` from `<godot_cpp/classes/time.hpp>`

### dlsym Export Verified
- `extern "C" __attribute__((visibility("default"))) void* get_spike_test_ptr()` exports correctly
- `nm -gU` confirms: `_get_spike_test_ptr` (T) and `_camera_texture_init` (T) both in TEXT segment
- macOS adds leading underscore to C symbols

### Build Output
- `scons platform=macos target=template_debug` → `bin/macos/libcamera_texture.macos.template_debug.dylib` (382KB)
- WASM build not yet tested (needs Emscripten SDK)
