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

## Task 3: CameraTextureProvider GDExtension Node

### Property Binding for Ref<ImageTexture>
- Read-only property: `ADD_PROPERTY(PropertyInfo(Variant::OBJECT, "texture", PROPERTY_HINT_RESOURCE_TYPE, "ImageTexture"), "", "get_texture")` — empty string for setter makes it read-only
- Bool read-only: `ADD_PROPERTY(PropertyInfo(Variant::BOOL, "is_active"), "", "get_is_active")`
- Int read-write: `ADD_PROPERTY(PropertyInfo(Variant::INT, "frame_width"), "set_frame_width", "get_frame_width")`

### SharedFrameBuffer Include Path
- SConstruct CPPPATH is relative to SConstruct location, NOT to src/ directory
- From `godot_project/addons/camera-texture/` → repo root is `../../../`
- Added: `env.Append(CPPPATH=["src/", "../../../app/lib/camera/native/shared/"])`

### dlsym for SharedFrameBuffer
- `dlsym(RTLD_DEFAULT, "get_shared_frame_buffer")` looks up the symbol in the current process
- Cast to function pointer: `reinterpret_cast<GetSharedFrameBufferFn>(sym)` where `using GetSharedFrameBufferFn = slopcade::SharedFrameBuffer* (*)()`
- Retry on each `_process()` if not found — camera may start after Godot

### ImageTexture Update Strategy
- Create initial texture with `ImageTexture::create_from_image()` (allocates GPU memory)
- Update in-place with `texture->update(img)` (no reallocation) — fast path
- Recreate texture only when resolution changes
- `memcpy(pixel_data.ptrw(), slot->data, byte_count)` to copy frame data into PackedByteArray

### Build Output
- With CameraTextureProvider added: dylib grew from 382KB → 448KB
- `strings` confirms class name and mangled symbol `N5godot21CameraTextureProviderE` present
- Class methods are internal (not C-exported) — registered via GDREGISTER_CLASS through init entry point

## Task 6: CameraManager Integration (2026-02-07)

### Implementation
Created `CameraManager.gd` to integrate `CameraTextureProvider` GDExtension with GameBridge:

**Key Features:**
- `start_camera(entity_id, width, height)` — Creates CameraTextureProvider, adds to scene, assigns texture to entity's Sprite2D
- `stop_camera()` — Removes provider, restores original texture
- `start_camera_background(width, height)` — Uses camera as scene background (CanvasLayer at z=-100)
- `stop_camera_background()` — Removes background camera
- Graceful fallback if GDExtension not loaded (`ClassDB.class_exists("CameraTextureProvider")`)
- In `_process()`, checks `is_active` and updates sprite texture when it changes
- Saves original texture before replacing, restores on stop

**GameBridge Integration:**
- Added `_camera_manager` variable, instantiated in `_init_modules()`
- Updated `_js_start_camera()`: On native, uses `_camera_manager.start_camera()`. On web, keeps existing `_camera_receiver` path.
- Updated `_js_stop_camera()`: On native, uses `_camera_manager.stop_camera()`. On web, keeps existing path.
- Platform detection via `OS.has_feature("web")` (same pattern as WebCameraReceiver)

**Patterns Followed:**
- Module instantiation pattern: `load("res://scripts/camera/CameraManager.gd").new()` in `_init_modules()`
- Background rect creation: Matches VisualRenderer's background layer pattern (CanvasLayer at z=-100, TextureRect with anchors)
- Entity sprite finding: Uses `EntityUtils.find_sprite_in_entity(node)`
- Scaling: Matches entity size via `record.width/height * pixels_per_meter`

**Safety:**
- No crashes when calling start_camera before camera is capturing — CameraTextureProvider creates gray placeholder texture
- Checks `is_active` before updating texture
- Validates provider exists and is valid before accessing properties

### Files Modified
- Created: `godot_project/scripts/camera/CameraManager.gd`
- Modified: `godot_project/scripts/GameBridge.gd` — added `_camera_manager`, updated `_js_start_camera` and `_js_stop_camera`

### Next Steps
- Task 7: Test native camera integration on iOS simulator
- Task 8: Add camera_background mode support to TypeScript bridge API

## Task 4: TypeScript CameraTexture Interface

### Platform-Split Pattern
- Created `types.ts` for shared interfaces (`CameraTextureOptions`, `CameraTextureController`)
- Created `CameraTexture.native.ts` and `CameraTexture.web.ts` with identical API but platform-specific implementations
- `index.ts` re-exports from `.native.ts` — Metro bundler automatically resolves to `.web.ts` on web platform

### Resolution Mapping
- `RESOLUTION_MAP` constant maps `'480p'` → `{ width: 640, height: 480 }` and `'720p'` → `{ width: 1280, height: 720 }`
- Default resolution is `'720p'` if not specified

### React Hook Pattern
- `useCameraTexture(bridge: GodotBridge)` returns `CameraTextureController`
- Uses `useState` to track `isActive` state
- Uses `useCallback` to memoize `start` and `stop` functions
- Both platforms call `bridge.startCamera(entityId, width, height)` and `bridge.stopCamera()`

### GodotBridge Implementation
- Updated `GodotBridge.native.ts` to implement `startCamera` and `stopCamera` stubs
- Native: `callGameBridge('start_camera', entityId, width, height)` and `callGameBridge('stop_camera')`
- Web: Already implemented in `GodotBridge.web.ts` (lines 804-809)
- Both platforms now have matching implementations

### Type Safety
- All types imported from `@/lib/godot/types` for `GodotBridge` interface
- `CameraTextureOptions` enforces `targetEntityId: string` as required field
- `resolution` and `mode` are optional with type-safe enums

### Verification
- `pnpm --filter slopcade exec tsc --noEmit` passes with no errors
- All files created in `app/lib/camera/` directory

## Task 7: VisionCamera Frame Processor Plugin (iOS)

### VisionCamera Installation
- `react-native-vision-camera@^4.7.3` added to app/package.json
- Expo project: `npx expo install react-native-vision-camera` also works, but manual version pinning is fine
- After install, `pod install` is needed (not run here — user does this manually)

### Frame Processor Plugin Pattern (ObjC++)
- File: `app/lib/camera/native/ios/CameraFramePlugin.mm` (ObjC++ for C++ SharedFrameBuffer access)
- Imports: `<VisionCamera/FrameProcessorPlugin.h>`, `<VisionCamera/FrameProcessorPluginRegistry.h>`, `<VisionCamera/Frame.h>`
- Class inherits from `FrameProcessorPlugin`
- Registration: `VISION_EXPORT_FRAME_PROCESSOR(CameraFramePlugin, writeCameraFrame)` — must be inside `@implementation` before `@end`
- The macro uses `+(void)load` for auto-registration at class load time
- Plugin name `writeCameraFrame` is what JS calls via `useFrameProcessor`

### Frame Data Access
- `Frame.buffer` returns `CMSampleBufferRef`
- `CMSampleBufferGetImageBuffer(buffer)` → `CVPixelBufferRef`
- Must lock: `CVPixelBufferLockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly)`
- `CVPixelBufferGetBaseAddress` → raw pixel data pointer
- `CVPixelBufferGetWidth/Height/BytesPerRow` for dimensions
- `CVPixelBufferGetPixelFormatType` → `kCVPixelFormatType_32BGRA` on iOS cameras
- Must unlock after processing

### BGRA → RGBA Conversion
- iOS cameras deliver BGRA (kCVPixelFormatType_32BGRA)
- Simple byte swap: R←B, G←G, B←R, A←A (swap bytes 0 and 2 in each 4-byte pixel)
- Used `thread_local std::vector<uint8_t>` as scratch buffer — avoids heap allocation per frame
- Camera thread is single-threaded so thread_local is safe and efficient

### SharedFrameBuffer Cross-Library Symbol Resolution
- CRITICAL: The inline `get_shared_frame_buffer()` in the header creates separate `static` local instances per shared library
- The FPP (compiled into app binary) and GDExtension (separate .dylib) would get different instances
- Solution: Use `dlsym(RTLD_DEFAULT, "get_shared_frame_buffer")` to resolve the canonical exported symbol
- Cached the result in a static local to avoid dlsym overhead per frame
- Fallback to direct call if dlsym fails (e.g., static linking scenario)

### Camera Permissions
- Added `NSCameraUsageDescription` to `app/ios/Slopcade/Info.plist`
- Description: "Slopcade uses your camera for game features"

### Xcode Project Integration Note
- The .mm file at `app/lib/camera/native/ios/` is NOT automatically in the Xcode project
- For `expo run:ios`, native source files need to be in `ios/Slopcade/` or added to the .pbxproj
- May need an Expo config plugin or manual Xcode project modification to include this file
- Alternative: move file to `app/ios/Slopcade/CameraFramePlugin.mm` for automatic inclusion

## Integration: Camera Feed Example Page
- Created `app/app/examples/camera_feed.tsx` as the final integration point.
- Followed `dynamic_images.tsx` pattern for Godot bridge initialization.
- Used `useCameraTexture` hook to control the camera.
- **Key Learning**: The `useCameraTexture` hook expects a non-null `GodotBridge`. Since the bridge is initialized asynchronously, we must cast `bridge as GodotBridge` when passing it to the hook, but ensure we guard any calls to `start()`/`stop()` with a check for `bridge` existence and readiness.
- **Registry**: The registry uses the filename (snake_case) as the ID (`camera_feed`), while the GameDefinition can use any string ID (`camera-feed`).
- **Verification**: `pnpm generate:registry` successfully picked up the new example, and `tsc` passed.

## Task 10: Web Camera Feed Rendering Bugfixes

- `window._cameraFrameData` can arrive in GDScript as `JavaScriptObject` even when JS writes a `Uint8Array`; relying on `data is PackedByteArray` alone drops frames.
- Godot 4.3 provides `JavaScriptBridge.is_js_buffer()` and `JavaScriptBridge.js_buffer_to_packed_byte_array()` for explicit conversion from JS typed arrays.
- A safe fallback is to re-read the frame via `JavaScriptBridge.eval("window._cameraFrameData", true)` and apply the same JS buffer conversion check.
- Camera target entities need an explicit `visual` block in template data; collider-only entities may not provide a `Sprite2D` render surface for texture assignment.
- Marking `cameraTarget` as `physics.bodyType = "static"` keeps it as a stable display surface.
