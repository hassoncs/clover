# Issues - Live Camera to Godot Texture

## Spike Build Issues

### WASM Build Not Yet Tested
Emscripten SDK is required for `scons platform=web`. Not installed in current environment.
Next step: Install emsdk or test in CI.

### ImageTexture.update() Performance Unknown Until Runtime
The benchmark code compiles but hasn't been run in Godot yet. Known Godot 4 regression:
~32-38ms at 1080p vs <1ms in Godot 3. Need actual numbers at 640x480 and 1280x720.

### Library Naming Complexity
godot-cpp's suffix system (`env["suffix"]`) includes platform, target, and arch info with dots.
macOS `SharedLibrary` doesn't auto-add `.dylib` when the path already contains dots.
Must explicitly include the file extension in the output path.
# Issues - Live Camera to Godot Texture

- **Persistence Issue**: Some changes were not persisted in the first attempt. This was fixed by re-applying them and verifying with `grep`.
- **Duplicate Interface Methods**: `startCamera` and `stopCamera` were accidentally added twice to `types.ts`. Cleaned up to maintain a single definition.
- **Bridge Context**: `GodotBridge.web.ts` does not have access to `contentWindowRef` from `GodotView.web.tsx`. It must use `getGodotBridge()` to interact with the Godot instance in the iframe.

## Runtime Verification Blockers (Require Device Testing)

The following acceptance criteria cannot be verified without running on actual devices/simulators:

### Definition of Done (lines 70-76)
- Camera feed visible on iOS/Android/Web at ≥15fps
- No pixel data through JS bridge on native (profiling)
- Start/stop controls functional
- No crash on backgrounding
- Memory stable over 60s

### Spike (Task 1) — lines 242-246
- SpikeTestNode._ready() prints on iOS simulator
- dlsym resolves from separate native context
- Shared memory magic number readable
- ImageTexture.update() benchmark numbers

### GDExtension (Task 3) — lines 445-451
- Builds for iOS arm64 + simulator
- Texture updates at frame rate
- is_active property reflects frame arrival
- Memory leaks check
- Performance < 20ms at 640x480

### GDScript (Task 4) — lines 520-523
- start_camera assigns texture to entity sprite
- stop_camera cleans up
- Background mode works
- No crashes before camera capturing

### Web (Task 5) — lines 605-611
- Camera permission + stream obtained
- Canvas renders at native resolution
- Pixel data stays in iframe JS context
- Camera visible at ≥15fps
- Permission denied fallback

### iOS FPP (Task 6) — lines 705-712
- FPP registered and callable from JS worklet
- Plugin receives frames on camera thread
- Frame rate matches capture rate
- No JS bridge data transfer
- Memory stable over 60s

### Integration (Task 9) — lines 972-978
- Example loads on iOS/Web/Android
- Start/Stop camera works visually
- No crashes during 10 start/stop cycles
- Frame rate ≥15fps

### Next Steps
These require: `pnpm ios` (iOS simulator), `pnpm dev` + Playwright (web), or physical device testing.
The iOS FPP `.mm` file also needs to be added to the Xcode project (via Expo config plugin or manual pbxproj edit).

## Final Status: Implementation Complete, Runtime Verification Pending

All 9 implementation tasks are complete. 41 remaining unchecked items are ALL runtime verification criteria requiring:
1. iOS simulator (`pnpm ios`) — for native camera pipeline testing
2. Web dev server (`pnpm dev`) + browser — for web camera testing  
3. Profiling tools — for memory/performance verification

These cannot be verified in a CLI-only environment without a running dev server.

### Prerequisite for iOS Testing
The `CameraFramePlugin.mm` file needs to be added to the Xcode project before iOS builds will include it. Options:
- Expo config plugin (recommended)
- Manual `.pbxproj` modification
- `pod install` after adding VisionCamera

### Prerequisite for Web Testing
- `pnpm dev` must be running
- Browser must support getUserMedia (Chrome/Firefox)
- Playwright can automate with `--use-fake-device-for-media-stream`
