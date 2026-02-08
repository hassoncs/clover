# Native Camera → Godot Texture: Status & Context

**Last Updated**: 2026-02-07  
**Branch**: `main` (uncommitted changes present)  
**Goal**: Live camera feed rendered as a Godot texture on iOS — bypassing the JavaScript bridge for pixel data. Camera frames go directly from native (VisionCamera) → shared memory → GDExtension → Godot ImageTexture.

---

## Architecture Overview

```
┌──────────────────┐     ┌──────────────────────┐     ┌────────────────────────┐
│ VisionCamera     │     │ SharedFrameBuffer     │     │ GDExtension            │
│ Frame Processor  │────▶│ (C++ double-buffer)   │────▶│ CameraTextureProvider  │
│ Plugin (ObjC++)  │     │ dlsym discovery       │     │ reads via dlsym        │
│                  │     │ SPSC lock-free        │     │ updates ImageTexture   │
└──────────────────┘     └──────────────────────┘     └────────────────────────┘
   Camera thread              Shared memory                Godot main thread
   app binary                 header-only                  separate .dylib
```

**Web path** (already working): getUserMedia → canvas → GDScript `JavaScriptBridge` → `Image.create_from_data()` → `ImageTexture.update()`

**Native path** (what we're trying to get working on-device):
1. **CameraFramePlugin.mm** (VisionCamera FPP) captures `CVPixelBufferRef`, converts BGRA→RGBA, writes to `SharedFrameBuffer`
2. **SharedFrameBuffer.h** (header-only C++) is a lock-free double-buffer in shared process memory
3. **CameraTextureProvider** (GDExtension C++ node) polls SharedFrameBuffer each `_process()` frame, creates Godot `Image` from pixel data, calls `ImageTexture.update()`
4. **CameraManager.gd** instantiates `CameraTextureProvider`, assigns its texture to target entity's `Sprite2D`
5. **GodotBridge.native.ts** sends control signals (`start_camera`/`stop_camera`) via existing bridge
6. **useCameraTexture** React hook wraps start/stop with VisionCamera permissions

---

## What's Been Done (All Code Written)

### Wave 1 — Foundation (committed: `5d9b7fef`, `38958903`)
- [x] **GDExtension spike**: `SpikeTestNode` — validates GDExtension loading, `dlsym` symbol export, `ImageTexture.update()` API usage
- [x] **SharedFrameBuffer.h**: Lock-free SPSC double-buffer, pre-allocated 1280×720×4 per slot (~7.4MB total), atomic swap with `memory_order_acquire/release`
- [x] **Web camera helper**: `WebCameraReceiver.gd` + `camera-helper.js` (later removed — moved inline into `GodotBridge.web.ts`)

### Wave 2 — Platform Implementations (committed: `38958903`)
- [x] **CameraTextureProvider** (GDExtension C++): `_ready()` → dlsym lookup, `_process()` → read frame → update texture. Built for macOS (debug) and iOS (debug+release arm64)
- [x] **CameraManager.gd**: GDScript integration — `start_camera(entity_id, w, h)`, `stop_camera()`, background mode
- [x] **CameraFramePlugin.mm** (iOS VisionCamera FPP): BGRA→RGBA conversion, `thread_local` scratch buffer, writes to SharedFrameBuffer
- [x] **TypeScript interface**: `useCameraTexture` hook, `CameraTexture.native.ts` / `.web.ts` platform split
- [x] **Expo config plugin**: `withCameraFrameProcessor.js` copies `.mm` + `.h` to Xcode project, adds header search paths
- [x] **withGodotAssets.js**: Updated build phase to copy GDExtension `.dylib` files to `Frameworks/` for iOS `dlopen`

### Wave 3 — Integration (committed: `38958903`)
- [x] **camera_feed.tsx**: Example page with Start/Stop Camera buttons, GameDefinition with `camera_sprite` entity
- [x] **CameraCapture component**: Renders invisible VisionCamera `<Camera>` component with `writeCameraFrame` frame processor

### Post-Wave Uncommitted Changes (on `main`, not yet committed)
- Updated `.pbxproj` (Expo prebuild regenerated UUIDs)
- Updated `Podfile.lock` (VisionCamera pods added)
- Tweaked `CameraFramePlugin.mm` and `SharedFrameBuffer.h` (minor header include path fixes)
- Updated `withCameraFrameProcessor.js` (header search path additions)
- Updated `withGodotAssets.js` (dylib → Frameworks copy logic)
- Modified `GodotBridge.web.ts` (web camera implementation moved inline)
- Updated `camera_feed.tsx` and `paint.tsx` examples
- iOS dylibs rebuilt: both debug and release at `godot_project/addons/camera-texture/bin/ios/`

---

## What Has NOT Been Runtime-Verified

**None of the native pipeline has been tested on a real device or simulator.** All code compiles and passes `tsc --noEmit`, but the following are **PENDING RUNTIME VERIFICATION**:

1. **GDExtension loads inside embedded Godot on iOS** — `CameraTextureProvider` class registers and is discoverable via `ClassDB.class_exists()`
2. **dlsym resolves across libraries** — The GDExtension `.dylib` can find `get_shared_frame_buffer()` symbol exported by the app binary (CameraFramePlugin.mm)
3. **SharedFrameBuffer works cross-library** — Same `SharedFrameBuffer*` instance shared between FPP (app binary) and GDExtension (.dylib)
4. **ImageTexture.update() performance** — Unknown at 640×480, known Godot 4 regression at higher resolutions
5. **VisionCamera frame processor invocation** — `writeCameraFrame` plugin actually gets called
6. **End-to-end camera → sprite texture** — Full pipeline from camera capture to visible texture on Godot sprite
7. **Memory stability** — No leaks over sustained capture
8. **App backgrounding** — Graceful handling

---

## Known Risks & Potential Blockers

### 1. GDExtension Loading in react-native-godot
The `@borndotcom/react-native-godot` library embeds Godot via LibGodot. It's unclear if:
- GDExtensions are loaded from the .pck file or need separate loading
- The `Frameworks/` directory approach for dylibs actually works with iOS code signing
- The embedded Godot honors the `.gdextension` configuration file

**Mitigation**: The `withGodotAssets.js` build script copies:
1. `.gdextension` file to `app bundle/godot/addons/camera-texture/`
2. `.dylib` to both `app bundle/godot/addons/camera-texture/bin/ios/` AND `app bundle/Frameworks/`

Godot's `OS_AppleEmbedded::open_dynamic_library` has a fallback that checks `Frameworks/` for the library filename.

### 2. dlsym(RTLD_DEFAULT) Across Dynamic Libraries
The FPP exports `get_shared_frame_buffer()` from the **app binary**. The GDExtension `.dylib` calls `dlsym(RTLD_DEFAULT, ...)` to find it.

- **macOS**: `nm -gU` confirms symbol is exported. Should work.
- **iOS**: More restrictive. `RTLD_DEFAULT` searches loaded images, but app binary symbols may need explicit export via linker flags or `__attribute__((visibility("default")))` (which we have).

**If dlsym fails**: The GDExtension retries every frame in `_process()`. Console logs `[CameraTextureProvider] dlsym failed: ...` with error info.

### 3. iOS Code Signing for GDExtension dylib
iOS requires all executable code to be signed. The `.dylib` in `Frameworks/` should be automatically signed by Xcode during the build, but:
- If it's not in `Frameworks/`, `dlopen` will fail with a code signing error
- The `withGodotAssets.js` build phase copies to `Frameworks/`

### 4. ImageTexture.update() Performance
Known Godot 4 regression:
- Godot 3: <1ms at any resolution
- Godot 4: ~15-20ms at 720p, ~32-38ms at 1080p

At 640×480 we expect ~8-12ms. If >30ms, the feature is not viable at 30fps. At 15fps it might work.

---

## Key Files

| File | Purpose |
|------|---------|
| `godot_project/addons/camera-texture/src/camera_texture_provider.cpp` | GDExtension C++ — reads SharedFrameBuffer, updates ImageTexture |
| `godot_project/addons/camera-texture/src/camera_texture_provider.h` | GDExtension C++ header |
| `godot_project/addons/camera-texture/src/register_types.cpp` | GDExtension entry point, registers CameraTextureProvider |
| `godot_project/addons/camera-texture/SConstruct` | Build script (scons) |
| `godot_project/addons/camera-texture/camera_texture.gdextension` | Godot extension registration |
| `godot_project/addons/camera-texture/bin/ios/*.dylib` | Pre-built iOS arm64 dylibs (debug + release) |
| `app/lib/camera/native/shared/SharedFrameBuffer.h` | C++ header-only double-buffer |
| `app/lib/camera/native/ios/CameraFramePlugin.mm` | VisionCamera frame processor plugin (ObjC++) |
| `app/lib/camera/CameraTexture.native.ts` | React hook for native camera control |
| `app/lib/camera/CameraCapture.native.tsx` | Invisible VisionCamera component |
| `godot_project/scripts/camera/CameraManager.gd` | GDScript bridge — instantiates CameraTextureProvider, assigns texture |
| `app/plugins/withCameraFrameProcessor.js` | Expo config plugin — copies .mm/.h to Xcode project |
| `app/plugins/withGodotAssets.js` | Expo config plugin — copies .pck, .gdextension, .dylib to app bundle |
| `app/app/examples/camera_feed.tsx` | Integration example page |

---

## Build Commands

```bash
# Rebuild GDExtension for iOS (from repo root)
cd godot_project/addons/camera-texture
scons platform=ios target=template_debug arch=arm64
scons platform=ios target=template_release arch=arm64

# Rebuild GDExtension for macOS (for editor testing)
scons platform=macos target=template_debug

# iOS build (includes Expo prebuild + pod install)
cd app && npx expo run:ios --device

# Check if dylibs are properly built
ls -la godot_project/addons/camera-texture/bin/ios/
```

---

## Session Progress (2026-02-07)

### Bugs Found & Fixed
1. **Stale build phase script** — `withGodotAssets.js` only added the "Copy Godot Assets" build phase on first prebuild, but never UPDATED it. The Frameworks copy logic was added later but never propagated to the pbxproj. Fixed by always updating `shellScript` content when phase already exists.
2. **DuplicateIdentifier on install** — The Frameworks copy glob (`*.framework`) was copying both arm64 AND x86_64 Rapier frameworks, which have the same bundle ID. iOS rejects this. Fixed by only copying `*.arm64.framework` and then removed framework copying entirely (Rapier loads fine from addons dir).
3. **os_log privacy redaction** — Godot `print()` and `NSLog` get redacted as `<private>` in `idevicesyslog`. Added `os_log_error` with `%{public}` format specifiers to both CameraFramePlugin.mm and CameraTextureProvider.cpp for unredacted diagnostics.

### Current State
- ✅ Clean prebuild + full rebuild + installed on device at port 8085
- ✅ Camera dylibs confirmed in `Frameworks/` and code-signed
- ✅ CameraFramePlugin confirmed working (frame processor invoked at 30fps, frames written to SharedFrameBuffer)
- ❓ CameraTextureProvider (GDExtension) — NOT YET VERIFIED. Need to start camera on device and check logs.
- ❓ dlsym resolution — NOT YET VERIFIED

### Verification Steps Remaining
1. Open app → Camera Feed → Start Camera
2. Run: `idevicesyslog -u 00008150-0019496C1140401C --no-colors 2>&1 | grep -E "CameraFrame|CameraTexture|SharedFrame|gdext|dlsym"`
3. Look for `[CameraTextureProvider] _ready() called` → GDExtension loaded
4. Look for `[CameraTextureProvider] dlsym OK` → cross-library symbol resolution works
5. Look for `[CameraTextureProvider] First frame` → end-to-end pipeline working

## What To Try Next

### Step 1: Verify current build (dylibs now in Frameworks/)
Open Camera Feed example, tap Start Camera, check logs (see verification steps above).

### Step 2: If GDExtension still doesn't load
- Check if `.gdextension` file is in the app bundle: `find DerivedData -name "camera_texture.gdextension"`
- Check if `.dylib` is in Frameworks: `find DerivedData -name "libcamera_texture*"` (CONFIRMED: they're there now)
- Check if Godot's embedded engine actually reads .gdextension files from the addons dir
- Try logging from `register_types.cpp` `initialize_camera_texture_module()` to see if Godot even tries to load the extension

### Step 3: If dlsym doesn't resolve
- Check if `get_shared_frame_buffer` symbol is exported: `nm -gU` on the app binary
- Try adding `-rdynamic` or `-exported_symbols_list` to Xcode linker flags
- As a last resort, consider making SharedFrameBuffer a singleton in a shared framework instead of relying on dlsym

---

## Previous Strategies Attempted

1. **Web path**: ✅ Working. getUserMedia → canvas → JavaScriptBridge → ImageTexture
2. **Native path via shared memory + dlsym**: Code complete, not yet runtime-tested
3. **NOT attempted**: GPU zero-copy (`RenderingDevice.texture_create_from_extension()`) — too complex for experiment
4. **NOT attempted**: Base64 via JS bridge — too slow (3.7MB/frame at 720p)
5. **NOT attempted**: OS-level view compositing (camera behind transparent Godot) — fallback if shared memory fails
6. **NOT attempted**: File-based bridge (save frame to disk, load in Godot) — ~15fps but viable as degraded fallback

---

## Abandon Criteria

If ANY of these are true after testing, pivot to alternative approach:
- GDExtension cannot be loaded by react-native-godot's embedded Godot
- `dlsym(RTLD_DEFAULT, ...)` does not resolve symbols between app binary and GDExtension dylib
- `ImageTexture.update()` takes >30ms at 640×480
- iOS code signing prevents loading the GDExtension dylib

**Fallback options**:
- **Option A**: OS-level view compositing — camera UIView behind transparent Godot GLView
- **Option B**: Accept ~15fps and use file-based bridge (already works for images)
