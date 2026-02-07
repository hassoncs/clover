# Live Camera Feed → Godot Texture (Cross-Platform)

## TL;DR

> **Quick Summary**: Build a cross-platform pipeline that captures live camera frames and displays them as a Godot texture — bypassing the JavaScript bridge for pixel data on native (iOS/Android) via a GDExtension + shared memory, and using getUserMedia + canvas on web. A unified TypeScript interface (`CameraTexture`) abstracts the platform differences.
> 
> **Deliverables**:
> - GDExtension (C++ via godot-cpp) that reads native camera frames from shared memory and updates a Godot `ImageTexture` in real-time
> - VisionCamera Frame Processor Plugin (iOS: ObjC/C++, Android: Kotlin/JNI) that captures native pixel buffers and writes to shared memory
> - Web camera helper (JS inside Godot iframe) using getUserMedia → canvas → Godot ImageTexture update
> - Unified TypeScript interface: `CameraTexture.native.ts` / `CameraTexture.web.ts` following existing platform-split pattern
> - Integration with existing `GameBridge` message system for control signals (start/stop/configure)
> - Working example page (`app/examples/camera_feed.tsx`) demonstrating camera-as-sprite-texture
> 
> **Estimated Effort**: Large (2–3 weeks across all platforms)
> **Parallel Execution**: YES — 3 waves (spike → platform implementations → integration)
> **Critical Path**: Task 1 (Spike) → Task 3 (GDExtension) → Task 6 (iOS FPP) → Task 9 (Integration Example)

---

## Context

### Original Request
Build a native-only pipeline that passes live camera frame buffers from React Native directly to the embedded Godot 4 engine's renderer, bypassing the JavaScript bridge entirely. The camera feed should appear as a texture on a Godot sprite. Should work cross-platform: iOS (primary), Android, and Web — with a unified interface. This is a feasibility experiment / proof of concept.

### Interview Summary
**Key Discussions**:
- Pixel data must NOT flow through the JS bridge on native — too slow (3.7 MB/frame at 720p RGBA, 30fps)
- JS bridge is fine for control signals (start camera, stop camera, set resolution)
- VisionCamera Frame Processor Plugins provide native buffer access (CVPixelBufferRef on iOS, AHardwareBuffer on Android)
- Both the FPP and a GDExtension run in the same app process — shared memory is possible
- Web uses a fundamentally different path: getUserMedia → canvas → pixel data → Godot WASM via iframe bridge
- The unified interface should follow existing platform-split patterns (`*.native.ts` / `*.web.ts`)

**Research Findings**:
- Godot 4's `ImageTexture.update(image)` updates GPU texture in-place (no reallocation) but has a known perf regression (~15-20ms at 720p, ~32-38ms at 1080p)
- `Image.create_from_data(w, h, false, Image.FORMAT_RGBA8, data)` creates from raw byte arrays
- Godot's built-in `CameraServer`/`CameraFeed` is NOT production-ready on mobile (iOS returns nothing, Android 1-2 FPS)
- `RenderingDevice.texture_create_from_extension()` exists for zero-copy GPU sharing but is too complex for this experiment
- VisionCamera `getNativeBuffer()` returns `CVPixelBufferRef` (iOS) / `AHardwareBuffer*` (Android)
- The borndotcom `react-native-godot` lib uses LibGodot + JSI HostObjects + worklet threads
- Existing `VisualRenderer.gd` already handles `set_entity_image_base64()` and `set_entity_image_from_file()` via `ImageTexture.create_from_image()`

### Metis Review
**Identified Gaps** (addressed):
- **Thread safety**: FPP runs on camera thread, GDExtension on Godot main thread → Double-buffer with atomic sequence counter
- **Pixel format conversion**: Camera provides YUV/BGRA, Godot needs RGBA8 → Convert in FPP before writing to shared buffer
- **GDExtension loading**: Must validate that react-native-godot supports loading custom GDExtensions → Spike task added
- **dlsym assumption**: Global symbol lookup across dynamic libraries may not work in all contexts → Spike validates this
- **Memory lifecycle**: Shared buffer must handle app backgrounding, camera permission denied, Godot reload → Explicit lifecycle handling in plan
- **Abandon criteria**: If core assumptions fail (dlsym, GDExtension loading, ImageTexture perf), pivot to alternative approach

---

## Work Objectives

### Core Objective
Prove that a live camera feed can be displayed as a Godot texture at ≥15fps (target 30fps) on iOS, Android, and Web, with zero pixel data flowing through the JavaScript bridge on native platforms.

### Concrete Deliverables
- `godot_project/addons/camera-texture/` — GDExtension source (C++, SConstruct, .gdextension)
- `app/lib/camera/` — CameraTexture TypeScript interface (`.native.ts`, `.web.ts`, `types.ts`)
- `app/lib/camera/native/ios/` — VisionCamera Frame Processor Plugin (ObjC/C++)
- `app/lib/camera/native/android/` — VisionCamera FPP (Kotlin/JNI/C++)
- `app/lib/camera/native/shared/` — SharedFrameBuffer C++ header-only library
- `godot_project/scripts/camera/` — GDScript helper for CameraTextureProvider node
- `app/app/examples/camera_feed.tsx` — Working example page

### Definition of Done
- [ ] Camera feed visible as a texture on a Godot sprite on iOS at ≥15fps
- [ ] Camera feed visible as a texture on a Godot sprite on Android at ≥15fps
- [ ] Camera feed visible as a texture on a Godot sprite on Web at ≥15fps
- [ ] No pixel data flows through JS bridge on native (verified via profiling)
- [ ] Start/stop camera controls work from React Native UI
- [ ] App does not crash when backgrounded with camera active
- [ ] Memory usage stable over 60 seconds of continuous capture (no leaks)

### Must Have
- Camera frames displayed as Godot `ImageTexture` on a `Sprite2D`
- Native pipeline (no JS bridge for pixel data) on iOS and Android
- Web pipeline via getUserMedia + canvas
- Unified TypeScript interface across platforms
- Start/stop controls via GameBridge
- Graceful handling of camera permission denied
- 640×480 minimum resolution, 720p target

### Must NOT Have (Guardrails)
- No camera controls beyond start/stop (no zoom, focus, flash, exposure)
- No face detection, AR overlays, or computer vision
- No recording to disk
- No multiple simultaneous camera feeds
- No modifications to the `@borndotcom/react-native-godot` library source
- No modifications to the Godot engine source (GDExtension only)
- No GPU zero-copy via `texture_create_from_extension()` (future optimization)
- No production polish — this is a feasibility experiment
- No custom rendering pipeline or shader-based YUV decode in Godot

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES (bun test in shared/, vitest patterns exist)
- **Automated tests**: Tests-after (for the TypeScript interface layer only; native C++ and GDScript are verified via integration)
- **Framework**: bun test (existing)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **GDExtension build** | Bash (scons) | Build command exits 0, .dylib/.so produced |
| **iOS app build** | Bash (xcodebuild) | Build succeeds, app launches |
| **Web camera** | Playwright (playwright skill) | Navigate to example, grant camera permission, assert canvas rendering |
| **Native camera** | interactive_bash (tmux) | Build + run on simulator, check console logs for frame count |
| **TypeScript types** | Bash (tsc --noEmit) | Zero type errors |
| **Memory profiling** | Bash (Instruments CLI or Godot profiler) | No growth over 60s window |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately) — Spike & Foundation:
├── Task 1: Spike: Validate GDExtension loading + dlsym + shared memory [BLOCKING]
├── Task 2: SharedFrameBuffer C++ library (header-only, can develop independently)
└── Task 5: Web camera helper (completely independent of native path)

Wave 2 (After Wave 1 — only if spike passes):
├── Task 3: GDExtension CameraTextureProvider (depends: 1 validates, 2 for buffer)
├── Task 4: Godot-side GDScript integration (depends: 3 for the node)
├── Task 6: iOS VisionCamera Frame Processor Plugin (depends: 2 for buffer)
├── Task 7: Android VisionCamera Frame Processor Plugin (depends: 2 for buffer)
└── Task 8: TypeScript CameraTexture interface (depends: 3, 5 for APIs)

Wave 3 (After Wave 2):
└── Task 9: Integration example + cross-platform verification (depends: all)

ABANDON GATE after Task 1:
  If GDExtension loading fails OR dlsym doesn't work → STOP.
  Pivot to alternative approach (documented in Task 1 acceptance criteria).

Critical Path: Task 1 → Task 3 → Task 6 → Task 9
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 (Spike) | None | 3, 4, 6, 7, 8, 9 | 2, 5 |
| 2 (SharedFrameBuffer) | None | 3, 6, 7 | 1, 5 |
| 3 (GDExtension) | 1, 2 | 4, 8, 9 | 5, 6, 7 |
| 4 (GDScript helpers) | 3 | 9 | 5, 6, 7, 8 |
| 5 (Web camera) | None | 8, 9 | 1, 2, 3, 4, 6, 7 |
| 6 (iOS FPP) | 2 | 9 | 3, 4, 5, 7, 8 |
| 7 (Android FPP) | 2 | 9 | 3, 4, 5, 6, 8 |
| 8 (TS interface) | 3, 5 | 9 | 4, 6, 7 |
| 9 (Integration) | 3, 4, 5, 6, 7, 8 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 5 | task(category="ultrabrain") for spike; task(category="quick") for buffer; task(category="unspecified-low") for web |
| 2 | 3, 4, 6, 7, 8 | dispatch parallel — ultrabrain for GDExtension/FPPs, quick for GDScript/TS |
| 3 | 9 | task(category="visual-engineering") for example page |

---

## TODOs

### ABANDON GATE

> **After Task 1 completes, evaluate results. If ANY of these are true, STOP and report to user:**
> - GDExtension cannot be loaded by react-native-godot
> - `dlsym(RTLD_DEFAULT, ...)` does not resolve symbols across FPP and GDExtension
> - Shared memory allocation fails or is inaccessible from either side
> - `ImageTexture.update()` takes >30ms at 640×480
>
> **If the spike fails**, document findings and recommend pivot to:
> - Option A: OS-level view compositing (camera view behind transparent Godot)
> - Option B: Accept ~15fps and use base64/file bridge (already works today)

---

- [x] 1. Spike: Validate Core Assumptions (GDExtension + dlsym + Shared Memory + ImageTexture Perf)

  **What to do**:
  This is the CRITICAL GATE task. Build the absolute minimum to validate four assumptions before investing in the full pipeline.

  **Sub-tasks**:
  1. **Minimal GDExtension**: Create the simplest possible GDExtension using godot-cpp that registers a custom node (`SpikeTestNode`) which prints to console in `_ready()`. Build for iOS (arm64 + simulator). Verify it loads inside the react-native-godot embedded Godot instance.
  2. **Symbol export test**: In the GDExtension, export a C function (`extern "C" void* get_spike_test_ptr()`) that returns a pointer to a static int. From a separate native module (a dummy Turbo Module or test harness), call `dlsym(RTLD_DEFAULT, "get_spike_test_ptr")` and verify it resolves. This validates cross-library symbol sharing.
  3. **Shared memory test**: Allocate a small shared buffer (4KB) from the dummy module, store a magic number (0xDEADBEEF). From the GDExtension `_process()`, read the same buffer via dlsym and verify the magic number matches. This validates bidirectional shared memory.
  4. **ImageTexture performance benchmark**: In the GDExtension, generate a synthetic 640×480 RGBA image (solid color changing each frame), call `ImageTexture.update()` in `_process()`, and measure the time. Also test at 1280×720. Log timing to console.

  **Must NOT do**:
  - Any camera integration
  - Any React Native UI
  - Any VisionCamera dependency
  - Anything beyond the minimum to validate/invalidate the four assumptions

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Complex systems-level C++ work with cross-compilation, dlsym, shared memory — requires deep technical understanding
  - **Skills**: [`context7-auto-research`]
    - `context7-auto-research`: For godot-cpp documentation, GDExtension registration patterns
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work in this task
    - `playwright`: No browser verification needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 5)
  - **Parallel Group**: Wave 1 (with Tasks 2, 5)
  - **Blocks**: Tasks 3, 4, 6, 7, 8, 9 — everything else depends on this passing
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `godot_project/addons/godot-rapier2d/godot-rapier2d.gdextension` — Existing GDExtension registration pattern in this project (Rapier physics). Follow this structure for the new extension.
  - `app/lib/godot/GodotBridge.native.ts:62-81` — How `callGameBridge` invokes Godot via `runOnGodotThread` + `native_dispatch`. Shows the JSI → Godot thread model.
  - `app/lib/godot/react-native-godot.d.ts:31-47` — `RTNGodot` API: `createInstance()`, `API()`, `runOnGodotThread()`. Shows what's available from the native module.
  - `godot_project/project.godot` — Project configuration; GDExtension must be registered here or in an addon.

  **External References**:
  - godot-cpp GDExtension tutorial: https://docs.godotengine.org/en/stable/tutorials/scripting/gdextension/gdextension_cpp_example.html
  - `@borndotcom/react-native-godot` source: https://github.com/nicholasgasior/react-native-godot — Check if GDExtension loading is supported
  - `dlsym` man page: The RTLD_DEFAULT flag searches all loaded shared objects

  **Acceptance Criteria**:

  - [ ] GDExtension .gdextension file created and loadable in embedded Godot
  - [ ] `SpikeTestNode._ready()` prints to console when app launches on iOS simulator
  - [ ] `dlsym(RTLD_DEFAULT, "get_spike_test_ptr")` resolves from a separate native context → returns non-null
  - [ ] Shared memory magic number (0xDEADBEEF) readable from GDExtension → value matches
  - [ ] ImageTexture.update() benchmark logged: report ms/frame at 640×480 and 1280×720
  - [ ] If 640×480 update > 30ms, document and recommend abandonment
  - [ ] Clear GO / NO-GO decision documented with evidence

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: GDExtension loads in embedded Godot on iOS
    Tool: Bash (xcodebuild + simulator)
    Preconditions: godot-cpp compiled for iOS, .gdextension registered
    Steps:
      1. Build iOS app: pnpm ios (or xcodebuild)
      2. Launch on iOS simulator
      3. Check simulator console output for "[SpikeTestNode] _ready called"
    Expected Result: Log message appears
    Failure Indicators: Build error, crash on launch, no log message
    Evidence: Console output captured

  Scenario: dlsym resolves GDExtension symbol
    Tool: Bash (xcodebuild + simulator)
    Preconditions: GDExtension loaded, dummy Turbo Module compiled
    Steps:
      1. Build and launch app
      2. Turbo Module calls dlsym(RTLD_DEFAULT, "get_spike_test_ptr")
      3. Log result: pointer address or null
    Expected Result: Non-null pointer returned
    Failure Indicators: Returns null → dlsym doesn't work across libraries
    Evidence: Console log "dlsym result: 0x[non-zero address]"

  Scenario: ImageTexture.update() benchmark
    Tool: Bash (simulator console)
    Preconditions: GDExtension running with synthetic texture updates
    Steps:
      1. Launch app with spike GDExtension active
      2. Wait 5 seconds for benchmark to run (300 frames at 60fps)
      3. Read average ms/frame from console log
    Expected Result: 640×480 < 30ms/frame, 720p < 50ms/frame
    Failure Indicators: Times exceed budget → document as blocker
    Evidence: Console output with timing stats
  ```

  **Commit**: YES
  - Message: `feat(camera): spike - validate GDExtension + dlsym + shared memory + texture perf`
  - Files: `godot_project/addons/camera-texture/spike/`
  - Pre-commit: Build succeeds on iOS simulator

---

- [x] 2. SharedFrameBuffer C++ Header-Only Library

  **What to do**:
  Create a thread-safe double-buffered frame sharing mechanism in a single C++ header. This is the data plane between the camera capture side (FPP) and the Godot rendering side (GDExtension).

  Design:
  - **Double-buffer with atomic swap**: Two frame buffers. Writer (FPP) writes to back buffer, atomically swaps `write_index`. Reader (GDExtension) reads from front buffer. No mutex needed — single producer, single consumer.
  - **Pre-allocated memory**: Allocate for max expected resolution (1280×720×4 = 3.69 MB per buffer, ~7.4 MB total). Allocated once at init, never reallocated.
  - **Frame metadata**: Each buffer slot includes width, height, format, timestamp, sequence number.
  - **Global accessor via C symbol**: `extern "C" SharedFrameBuffer* get_shared_frame_buffer()` — discoverable via `dlsym(RTLD_DEFAULT, ...)`.

  ```
  // Conceptual structure
  SharedFrameBuffer {
    atomic<uint32_t> write_index;     // 0 or 1 — which buffer writer is filling
    atomic<uint64_t> frame_sequence;  // Monotonic counter — reader skips if unchanged
    FrameSlot slots[2];               // Double buffer
  }

  FrameSlot {
    uint32_t width;
    uint32_t height;
    uint32_t stride;                  // bytes per row
    uint32_t format;                  // enum: RGBA8, BGRA8
    uint64_t timestamp_ns;
    uint64_t sequence;                // Matches parent's frame_sequence when written
    uint8_t data[MAX_FRAME_BYTES];    // Pre-allocated pixel storage
  }
  ```

  **Must NOT do**:
  - No lock-free queue (overkill — we only need latest frame, not every frame)
  - No dynamic allocation per frame
  - No file-backed mmap (same-process, just use heap)
  - No platform-specific APIs (pure C++11 atomics)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Well-scoped single-header C++ file with clear spec. No ambiguity.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `context7-auto-research`: No external library docs needed — pure C++

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 5)
  - **Blocks**: Tasks 3, 6, 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - Standard SPSC (single-producer single-consumer) double-buffer pattern: Writer writes to `slots[write_index ^ 1]`, then atomically flips `write_index`. Reader reads from `slots[write_index]`.
  - `<atomic>` std library: `std::atomic<uint32_t>` with `memory_order_release` (writer) and `memory_order_acquire` (reader).

  **Acceptance Criteria**:
  - [ ] Single header file: `app/lib/camera/native/shared/SharedFrameBuffer.h`
  - [ ] Compiles with Clang (iOS), GCC/Clang (Android NDK), MSVC (test)
  - [ ] `get_shared_frame_buffer()` symbol exported with C linkage and default visibility
  - [ ] Writer can write a 1280×720×4 frame without blocking reader
  - [ ] Reader always gets the latest complete frame (never a torn frame)
  - [ ] No dynamic allocation after init
  - [ ] Total memory footprint: ~7.5 MB (two 720p RGBA buffers + metadata)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Header compiles on all target platforms
    Tool: Bash
    Preconditions: Clang available
    Steps:
      1. echo '#include "SharedFrameBuffer.h"\nint main() { auto* buf = get_shared_frame_buffer(); return buf ? 0 : 1; }' > /tmp/test_sfb.cpp
      2. clang++ -std=c++17 -I app/lib/camera/native/shared -o /tmp/test_sfb /tmp/test_sfb.cpp
      3. Run /tmp/test_sfb
    Expected Result: Exit code 0
    Evidence: Command output

  Scenario: Thread safety under concurrent access
    Tool: Bash (compile and run test)
    Preconditions: SharedFrameBuffer.h exists
    Steps:
      1. Write a test that spawns writer thread (1000 frames at 640x480) and reader thread (polling)
      2. Verify reader never sees torn frame (magic byte at start+end of each frame matches)
      3. Verify reader gets monotonically increasing sequence numbers (may skip, never go backward)
    Expected Result: Zero torn frames over 1000 iterations
    Evidence: Test output "0 torn frames / 1000 written"
  ```

  **Commit**: YES
  - Message: `feat(camera): add SharedFrameBuffer header-only double-buffer library`
  - Files: `app/lib/camera/native/shared/SharedFrameBuffer.h`
  - Pre-commit: Compiles with clang++ -std=c++17

---

- [ ] 3. GDExtension: CameraTextureProvider Node

  **What to do**:
  Create a GDExtension in C++ (using godot-cpp) that exposes a `CameraTextureProvider` node. This node:
  1. On `_ready()`: Looks up `SharedFrameBuffer` via `dlsym(RTLD_DEFAULT, "get_shared_frame_buffer")`
  2. Creates an `ImageTexture` at the configured resolution
  3. On `_process()`: Checks if a new frame is available (sequence number changed). If so, creates `Image` from the buffer's pixel data via `Image::create_from_data()` and calls `texture->update(image)`.
  4. Exposes a `texture` property that GDScript can bind to any `Sprite2D.texture`
  5. Exposes `is_active` property (true when frames are being received)
  6. Handles the case where shared buffer doesn't exist yet (camera not started) — returns a placeholder texture

  File structure:
  ```
  godot_project/addons/camera-texture/
  ├── camera_texture.gdextension     # Registration file
  ├── SConstruct                      # Build script
  ├── src/
  │   ├── register_types.cpp          # GDExtension entry point
  │   ├── register_types.h
  │   ├── camera_texture_provider.cpp # Main node implementation
  │   └── camera_texture_provider.h
  └── bin/                            # Built libraries (per platform)
  ```

  **Must NOT do**:
  - No camera capture logic (that's the FPP's job)
  - No GPU zero-copy / RenderingDevice integration
  - No web support (web uses a different path)
  - No YUV conversion (FPP delivers RGBA)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: GDExtension C++ development with godot-cpp, dlsym integration, Image/ImageTexture Godot API usage — requires deep systems knowledge
  - **Skills**: [`context7-auto-research`]
    - `context7-auto-research`: For godot-cpp API reference, GDExtension binding patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 7 once unblocked)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 4, 8, 9
  - **Blocked By**: Task 1 (spike must pass), Task 2 (needs SharedFrameBuffer.h)

  **References**:

  **Pattern References**:
  - `godot_project/addons/godot-rapier2d/godot-rapier2d.gdextension` — Follow this .gdextension registration pattern exactly
  - `godot_project/scripts/bridge/VisualRenderer.gd:289-318` — `set_entity_image_from_file()` shows how to create Image → ImageTexture → assign to Sprite2D. The GDExtension does the same but from a shared buffer instead of a file.
  - `godot_project/scripts/effects/ParticleFactory.gd:497-511` — `_create_circle_texture()` shows `Image.create()` → pixel manipulation → `ImageTexture.create_from_image()` pattern in GDScript. The C++ equivalent uses the same Image/ImageTexture classes.
  - `godot_project/scripts/utils/ImageLoader.gd:52-65` — `load_texture_from_buffer()` shows `Image.load_png_from_buffer()` → `ImageTexture.create_from_image()`. The GDExtension uses `Image.create_from_data()` instead (raw pixels, no PNG decode).

  **External References**:
  - godot-cpp GDExtension example: https://docs.godotengine.org/en/stable/tutorials/scripting/gdextension/gdextension_cpp_example.html
  - Godot Image class API: `Image::create_from_data(width, height, use_mipmaps, format, data)`
  - Godot ImageTexture API: `ImageTexture::create_from_image(image)`, `ImageTexture::update(image)`

  **Acceptance Criteria**:
  - [ ] `camera_texture.gdextension` registers `CameraTextureProvider` as a usable node type
  - [ ] Builds for iOS arm64 and iOS simulator (x86_64 + arm64)
  - [ ] `CameraTextureProvider.texture` returns a valid `ImageTexture`
  - [ ] When SharedFrameBuffer has new frames, texture updates at frame rate
  - [ ] When SharedFrameBuffer is absent (camera not started), returns solid gray placeholder
  - [ ] `is_active` property correctly reflects whether frames are arriving
  - [ ] No memory leaks: Image objects properly freed each frame (Image is created, used, released)
  - [ ] Performance: < 20ms per frame at 640×480 for the full read + update cycle

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: GDExtension builds for iOS
    Tool: Bash (scons)
    Preconditions: godot-cpp submodule or headers available
    Steps:
      1. cd godot_project/addons/camera-texture
      2. scons platform=ios arch=arm64
      3. Check bin/ for .dylib output
    Expected Result: .dylib file produced, no build errors
    Evidence: File listing + scons output

  Scenario: CameraTextureProvider updates texture from shared buffer
    Tool: Bash (iOS simulator)
    Preconditions: Spike from Task 1 passed, SharedFrameBuffer from Task 2 available
    Steps:
      1. Build app with GDExtension
      2. From test code, write synthetic frames (alternating red/blue) to SharedFrameBuffer
      3. Observe GDExtension console logs reporting frame sequence updates
      4. Verify texture dimensions match (640×480)
    Expected Result: Logs show "CameraTextureProvider: updated frame seq=N, 640x480, Xms"
    Evidence: Console output with timing
  ```

  **Commit**: YES
  - Message: `feat(camera): GDExtension CameraTextureProvider with SharedFrameBuffer integration`
  - Files: `godot_project/addons/camera-texture/`
  - Pre-commit: scons build succeeds for iOS

---

- [ ] 4. Godot-Side GDScript Helper and Scene Integration

  **What to do**:
  Create a GDScript helper that makes it easy to attach a `CameraTextureProvider` to any entity's sprite via the existing GameBridge message system.

  1. Add `start_camera` and `stop_camera` commands to `GameBridge.gd`'s method map
  2. When `start_camera` is called: instantiate a `CameraTextureProvider` node, add it to the scene tree, assign its `texture` to the target entity's `Sprite2D`
  3. When `stop_camera` is called: remove the `CameraTextureProvider` node, restore original texture (or clear)
  4. Also support a `camera_background` mode that sets the camera as the scene background (like `VisualRenderer.gd`'s background rect)

  **Must NOT do**:
  - No new bridge protocol — use existing `native_dispatch` / `_method_map` pattern
  - No web-specific code (web path is handled separately)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small GDScript additions following well-established patterns in GameBridge.gd
  - **Skills**: [`game-authoring/scripting-api-reference`]
    - `game-authoring/scripting-api-reference`: For GameBridge message patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 7, 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Task 3 (needs CameraTextureProvider node to exist)

  **References**:

  **Pattern References**:
  - `godot_project/scripts/GameBridge.gd:192-196` — `_method_map` registration pattern. Add `"start_camera": _camera_manager.start_camera` and `"stop_camera": _camera_manager.stop_camera` following this exact pattern.
  - `godot_project/scripts/bridge/VisualRenderer.gd:121-138` — `set_entity_image()` shows how to find an entity, get its Sprite2D, and assign a texture. The camera helper follows the same pattern but assigns `CameraTextureProvider.texture` instead of a loaded ImageTexture.
  - `godot_project/scripts/bridge/VisualRenderer.gd:840-860` — Background rect creation. The `camera_background` mode follows this pattern.

  **Acceptance Criteria**:
  - [ ] `GameBridge._method_map` has `"start_camera"` and `"stop_camera"` entries
  - [ ] `start_camera(entity_id)` creates CameraTextureProvider and assigns its texture to entity's sprite
  - [ ] `stop_camera()` cleans up CameraTextureProvider node
  - [ ] Background mode: `start_camera_background()` uses camera as scene background
  - [ ] No crashes when calling start_camera before camera is actually capturing (placeholder shown)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: start_camera assigns texture to entity sprite
    Tool: Bash (iOS simulator console)
    Preconditions: GDExtension loaded, entity "camera_target" exists in scene
    Steps:
      1. From bridge: native_dispatch("start_camera", '["camera_target"]')
      2. Check console: "CameraManager: started camera on entity camera_target"
      3. Verify entity's Sprite2D.texture is a CameraTextureProvider texture
    Expected Result: Texture assigned, logs confirm
    Evidence: Console output

  Scenario: stop_camera cleans up
    Tool: Bash (iOS simulator console)
    Preconditions: Camera running on entity
    Steps:
      1. From bridge: native_dispatch("stop_camera", '[]')
      2. Check console: "CameraManager: stopped camera"
      3. Verify CameraTextureProvider node removed from tree
    Expected Result: Clean removal, no orphaned nodes
    Evidence: Console output
  ```

  **Commit**: YES (groups with Task 3)
  - Message: `feat(camera): GDScript camera manager for GameBridge integration`
  - Files: `godot_project/scripts/camera/CameraManager.gd`, `godot_project/scripts/GameBridge.gd` (additions)
  - Pre-commit: Godot project loads without errors

---

- [x] 5. Web Camera Helper (getUserMedia → Godot WASM)

  **What to do**:
  Create a JavaScript helper that runs inside the Godot WASM iframe and captures camera frames via the Web API, feeding them directly into Godot's rendering.

  Architecture (web is fundamentally different from native — no shared memory, no GDExtension):
  1. Inside the Godot iframe's HTML/JS: use `navigator.mediaDevices.getUserMedia()` to get camera stream
  2. Draw frames to an off-screen `<canvas>` element
  3. Extract pixels via `canvas.getContext('2d').getImageData()`
  4. Pass the pixel `Uint8Array` to GDScript via Godot's `JavaScriptBridge` / `JavaScriptObject`
  5. GDScript side: receive bytes → `Image.create_from_data()` → `ImageTexture.update()`
  6. Alternatively: add commands to `window.GodotBridge` that the parent frame can call

  The key insight: the camera capture AND Godot rendering are in the **same iframe origin**, so no cross-origin issues. The pixel data stays within a single JS context — no `postMessage` needed.

  Target: 640×480 at 15-30fps (web will be slower due to getImageData overhead).

  **Must NOT do**:
  - No cross-iframe pixel transfer (camera is inside the iframe)
  - No WebRTC peer connections
  - No WebCodecs (not universally supported yet)
  - No SharedArrayBuffer (requires specific CORS headers)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Standard web APIs (getUserMedia, canvas, getImageData). Straightforward integration with existing Godot WASM bridge.
  - **Skills**: [`context7-auto-research`]
    - `context7-auto-research`: For Godot JavaScriptBridge API reference

  **Parallelization**:
  - **Can Run In Parallel**: YES (completely independent of native path)
  - **Parallel Group**: Wave 1 (start immediately)
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/lib/godot/GodotView.web.tsx:1-200` — The iframe setup. Camera helper JS would be added to the Godot iframe's HTML template or injected via script.
  - `app/lib/godot/GodotBridge.web.ts:47-100` — `window.GodotBridge` interface. The web camera commands (`startCamera`, `stopCamera`) should be added here.
  - `godot_project/scripts/bridge/VisualRenderer.gd:255-287` — `set_entity_image_base64()` handles raw bytes → ImageTexture. The web camera path uses a similar but optimized per-frame pipeline.
  - `app/public/godot/index.html` — The iframe's HTML. Camera helper JS is added here.

  **External References**:
  - MDN getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  - MDN getImageData: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData
  - Godot JavaScriptBridge: https://docs.godotengine.org/en/stable/classes/class_javascriptbridge.html

  **Acceptance Criteria**:
  - [ ] Camera permission requested and stream obtained in Godot iframe
  - [ ] Canvas renders camera frames at native resolution
  - [ ] Pixel data extracted and passed to GDScript without leaving the iframe JS context
  - [ ] `ImageTexture.update()` called each frame from GDScript
  - [ ] Camera visible on a Sprite2D in Godot web at ≥15fps
  - [ ] `startCamera()` / `stopCamera()` commands available on `window.GodotBridge`
  - [ ] Graceful fallback when camera permission denied (logs warning, no crash)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Web camera feed visible on Godot sprite
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:8085, browser supports getUserMedia
    Steps:
      1. Navigate to http://localhost:8085/examples/camera_feed
      2. Grant camera permission (Playwright: use --use-fake-device-for-media-stream)
      3. Wait for Godot to load (wait for window.slopcadeGameReady)
      4. Call window.GodotBridge.startCamera("camera_entity")
      5. Wait 2 seconds
      6. Take screenshot
      7. Assert: Sprite2D shows non-black, non-uniform image (camera feed)
    Expected Result: Camera feed visible on Godot sprite
    Evidence: .sisyphus/evidence/task-5-web-camera.png

  Scenario: Camera permission denied handled gracefully
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate with camera permission denied
      2. Call window.GodotBridge.startCamera("camera_entity")
      3. Check console for warning (not error/crash)
      4. Assert page still functional
    Expected Result: Warning logged, no crash
    Evidence: Console output captured
  ```

  **Commit**: YES
  - Message: `feat(camera): web camera helper using getUserMedia + canvas + GodotBridge`
  - Files: `app/public/godot/camera-helper.js`, `godot_project/scripts/camera/WebCameraReceiver.gd`
  - Pre-commit: Web build succeeds

---

- [ ] 6. iOS VisionCamera Frame Processor Plugin

  **What to do**:
  Create a native VisionCamera Frame Processor Plugin for iOS that:
  1. Receives `CMSampleBuffer` / `CVPixelBufferRef` from VisionCamera on the camera thread
  2. Locks the pixel buffer (`CVPixelBufferLockBaseAddress`)
  3. Converts from camera's native format (typically BGRA) to RGBA8 if needed (may just be a channel swap)
  4. Copies pixel data into `SharedFrameBuffer`'s back slot via `memcpy`
  5. Atomically swaps the write index + increments sequence number
  6. Unlocks the pixel buffer
  7. Returns `null` to JS (no data crosses the JS bridge)

  The plugin is registered as a VisionCamera Frame Processor Plugin so it's invoked per-frame automatically.

  File structure:
  ```
  app/lib/camera/native/ios/
  ├── CameraFramePlugin.mm       # Frame Processor Plugin (ObjC++)
  ├── CameraFramePlugin.h
  └── CameraFramePlugin-Bridging-Header.h  # If needed
  ```

  Also: install `react-native-vision-camera` if not already present, add camera permissions to Info.plist.

  **Must NOT do**:
  - No JS-side frame data processing
  - No base64 encoding
  - No file writing
  - No image compression
  - No VisionCamera preview rendering (camera preview is invisible — Godot shows the feed)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Native iOS development (ObjC++), CVPixelBuffer manipulation, VisionCamera plugin registration, thread safety with SharedFrameBuffer
  - **Skills**: [`context7-auto-research`]
    - `context7-auto-research`: For VisionCamera Frame Processor Plugin API

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4, 5, 7, 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Task 2 (needs SharedFrameBuffer.h)

  **References**:

  **Pattern References**:
  - `app/lib/camera/native/shared/SharedFrameBuffer.h` (from Task 2) — The shared buffer to write into
  - `app/lib/godot/GodotBridge.native.ts:741-751` — Shows the existing native image flow: download → save to disk → call Godot. The FPP replaces this entirely with direct memory writes.

  **External References**:
  - VisionCamera Frame Processor Plugin guide: https://react-native-vision-camera.com/docs/guides/frame-processor-plugins-overview
  - VisionCamera iOS FPP creation: https://react-native-vision-camera.com/docs/guides/frame-processor-plugins-ios
  - Apple CVPixelBuffer reference: CVPixelBufferLockBaseAddress, CVPixelBufferGetBaseAddress, CVPixelBufferGetBytesPerRow

  **Acceptance Criteria**:
  - [ ] `react-native-vision-camera` installed and camera permission configured in Info.plist
  - [ ] Frame Processor Plugin registered and callable from JS worklet
  - [ ] Plugin receives frames on camera thread (verified via logging first frame)
  - [ ] BGRA→RGBA conversion applied (or verified camera delivers RGBA directly)
  - [ ] Pixel data written to SharedFrameBuffer back slot via memcpy
  - [ ] Atomic swap of write_index after write completes
  - [ ] Frame rate matches camera capture rate (30fps) — measure via sequence counter
  - [ ] No JS bridge data transfer (verify: console.log in FPP JS side shows only null return)
  - [ ] Memory stable over 60 seconds (no per-frame allocations)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: FPP captures frames and writes to SharedFrameBuffer
    Tool: Bash (xcodebuild + simulator logs)
    Preconditions: VisionCamera installed, SharedFrameBuffer compiled, camera permission granted
    Steps:
      1. Build iOS app with FPP
      2. Launch on iOS simulator with simulated camera
      3. Start camera from React Native
      4. Wait 3 seconds
      5. Check logs for "CameraFramePlugin: wrote frame seq=N, 640x480, Xms copy time"
    Expected Result: ~90 frames logged (30fps × 3s), copy time < 5ms each
    Evidence: Console output with frame stats

  Scenario: FPP handles camera permission denied
    Tool: Bash (simulator)
    Preconditions: Camera permission set to denied in simulator settings
    Steps:
      1. Launch app, attempt to start camera
      2. Check logs for graceful error message
    Expected Result: Warning logged, no crash
    Evidence: Console output
  ```

  **Commit**: YES
  - Message: `feat(camera): iOS VisionCamera Frame Processor Plugin with SharedFrameBuffer`
  - Files: `app/lib/camera/native/ios/`, `package.json` (VisionCamera dep)
  - Pre-commit: iOS build succeeds

---

- [ ] 7. Android VisionCamera Frame Processor Plugin

  **What to do**:
  Create the Android counterpart of the iOS FPP. Uses VisionCamera's Android Frame Processor Plugin API.

  1. Receives `ImageProxy` (Camera2) from VisionCamera
  2. Extracts `AHardwareBuffer` or YUV plane data
  3. Converts YUV420 → RGBA8 (Android cameras typically provide YUV, not BGRA)
  4. Writes to `SharedFrameBuffer` via JNI → C++ (same SharedFrameBuffer.h)
  5. Atomically swaps write index

  File structure:
  ```
  app/lib/camera/native/android/
  ├── src/main/java/.../CameraFramePlugin.kt    # Kotlin plugin registration
  ├── src/main/cpp/
  │   ├── camera_frame_jni.cpp                   # JNI bridge to SharedFrameBuffer
  │   └── CMakeLists.txt                         # NDK build
  └── build.gradle                               # Android build config
  ```

  YUV→RGBA conversion is the main complexity on Android. Options:
  - libyuv (Google's optimized library) — fastest, NEON-accelerated
  - Manual conversion in C++ — simpler to set up
  - RenderScript — deprecated but works
  
  Recommend libyuv for the conversion step.

  **Must NOT do**:
  - No Java-only image processing (must use NDK for SharedFrameBuffer access)
  - No Bitmap intermediate (avoid Android graphics overhead)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Android NDK, JNI, YUV conversion, Camera2 integration — complex native Android work
  - **Skills**: [`context7-auto-research`]
    - `context7-auto-research`: For VisionCamera Android FPP docs, libyuv API

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4, 5, 6, 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Task 2 (needs SharedFrameBuffer.h)

  **References**:

  **External References**:
  - VisionCamera Android FPP creation: https://react-native-vision-camera.com/docs/guides/frame-processor-plugins-android
  - libyuv for YUV→RGBA: https://chromium.googlesource.com/libyuv/libyuv/ — `libyuv::NV12ToABGR()` or `libyuv::I420ToABGR()`
  - Android AHardwareBuffer: https://developer.android.com/ndk/reference/group/a-hardware-buffer

  **Acceptance Criteria**:
  - [ ] Android FPP registered and callable from JS worklet
  - [ ] YUV→RGBA conversion working (visual verification — correct colors, not green/purple tint)
  - [ ] Pixel data written to SharedFrameBuffer
  - [ ] Frame rate ≥ 20fps at 640×480 (YUV conversion adds overhead)
  - [ ] No ANR (Application Not Responding) — camera processing doesn't block main thread
  - [ ] Memory stable over 60 seconds

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Android FPP captures and converts frames
    Tool: Bash (adb logcat)
    Preconditions: Android emulator or device, VisionCamera installed
    Steps:
      1. Build Android app
      2. Launch on emulator
      3. Start camera
      4. adb logcat | grep "CameraFramePlugin"
      5. Check for frame sequence logs
    Expected Result: Frames logged at ≥20fps, YUV conversion < 10ms
    Evidence: adb logcat output
  ```

  **Commit**: YES
  - Message: `feat(camera): Android VisionCamera Frame Processor Plugin with YUV conversion`
  - Files: `app/lib/camera/native/android/`
  - Pre-commit: Android build succeeds

---

- [ ] 8. Unified TypeScript CameraTexture Interface

  **What to do**:
  Create the TypeScript abstraction layer following the existing platform-split pattern. This is what React Native code calls — it handles platform differences internally.

  ```
  app/lib/camera/
  ├── types.ts                  # Shared types
  ├── CameraTexture.native.ts   # Native: starts VisionCamera + FPP, sends control to GameBridge
  ├── CameraTexture.web.ts      # Web: calls window.GodotBridge.startCamera()
  └── index.ts                  # Re-exports
  ```

  Interface:
  ```typescript
  interface CameraTextureOptions {
    resolution?: '480p' | '720p';   // Default: '480p'
    targetEntityId: string;          // Godot entity to show camera on
    mode?: 'sprite' | 'background'; // Default: 'sprite'
  }

  interface CameraTextureController {
    start(options: CameraTextureOptions): Promise<void>;
    stop(): Promise<void>;
    isActive: boolean;
  }

  function useCameraTexture(bridge: GodotBridge): CameraTextureController;
  ```

  **Native implementation** (`CameraTexture.native.ts`):
  1. `start()`: Initializes VisionCamera with the Frame Processor Plugin, then sends `start_camera` command to Godot via GameBridge
  2. `stop()`: Sends `stop_camera` to Godot, stops VisionCamera
  3. The FPP handles all pixel data natively — TS only sends control signals

  **Web implementation** (`CameraTexture.web.ts`):
  1. `start()`: Calls `window.GodotBridge.startCamera(entityId, options)` — web camera helper (Task 5) handles everything inside the iframe
  2. `stop()`: Calls `window.GodotBridge.stopCamera()`

  **Must NOT do**:
  - No pixel data in TypeScript on any platform
  - No camera preview component (camera feed is shown via Godot, not RN)
  - No camera controls beyond start/stop

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Thin TypeScript wrapper over existing bridge patterns. Well-scoped with clear interface.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 6, 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Task 3 (needs to know GDExtension command API), Task 5 (needs web camera bridge API)

  **References**:

  **Pattern References**:
  - `app/lib/godot/GodotBridge.native.ts` / `GodotBridge.web.ts` — THE definitive pattern for platform-split modules in this project. Follow the exact same import/export structure.
  - `app/lib/godot/GodotView.native.tsx` / `GodotView.web.tsx` — Another example of the platform-split pattern.
  - `app/lib/godot/types.ts:298` — `setEntityImage()` interface. `CameraTexture` methods follow a similar naming convention.
  - `app/lib/godot/GodotBridge.native.ts:741-751` — `setEntityImage()` native implementation: download → save → bridge call. `CameraTexture.native.ts` sends control signals via the same `callGameBridge` pattern.

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` passes with zero type errors
  - [ ] `CameraTexture.native.ts` and `CameraTexture.web.ts` both export same interface
  - [ ] `index.ts` re-exports platform-appropriate implementation
  - [ ] `useCameraTexture` hook works in a React component
  - [ ] `start()` sends control signal to Godot bridge (verified via bridge mock in test)
  - [ ] `stop()` cleans up VisionCamera and sends stop signal
  - [ ] `isActive` reflects current state

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: TypeScript types compile correctly
    Tool: Bash (tsc)
    Preconditions: All dependencies installed
    Steps:
      1. pnpm tsc --noEmit
      2. Assert: zero errors related to camera/ module
    Expected Result: Clean build
    Evidence: tsc output

  Scenario: CameraTexture.native sends bridge command
    Tool: Bash (bun test)
    Preconditions: Mock GodotBridge available
    Steps:
      1. Create test: instantiate CameraTexture with mock bridge
      2. Call start({ targetEntityId: "test_entity" })
      3. Assert: mock bridge received "start_camera" command with "test_entity" arg
      4. Call stop()
      5. Assert: mock bridge received "stop_camera" command
    Expected Result: All assertions pass
    Evidence: Test output
  ```

  **Commit**: YES
  - Message: `feat(camera): unified TypeScript CameraTexture interface (native + web)`
  - Files: `app/lib/camera/`
  - Pre-commit: `tsc --noEmit` passes

---

- [ ] 9. Integration Example + Cross-Platform Verification

  **What to do**:
  Create a working example page that demonstrates the full camera-to-Godot-texture pipeline. This is the final integration point that proves everything works end to end.

  1. Create `app/app/examples/camera_feed.tsx` with example metadata for the registry
  2. Define a simple game: one entity ("camera_sprite") with a large box shape, centered on screen
  3. Add a "Start Camera" / "Stop Camera" button in the React Native UI
  4. On start: `cameraTexture.start({ targetEntityId: "camera_sprite" })` — the entity's sprite shows the live camera
  5. On stop: `cameraTexture.stop()` — sprite goes back to placeholder

  Also: run the registry generator to pick up the new example.

  **Must NOT do**:
  - No complex game logic — this is a pure camera demo
  - No production UI polish
  - No camera controls (zoom, etc.)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Creating a visual demo page with React Native UI + Godot integration
  - **Skills**: [`frontend-ui-ux`, `game-authoring`]
    - `frontend-ui-ux`: For the example page layout and button styling
    - `game-authoring`: For the game definition (entity setup, sprite configuration)

  **Parallelization**:
  - **Can Run In Parallel**: NO (final integration task)
  - **Parallel Group**: Wave 3 (sequential, after all Wave 2)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 3, 4, 5, 6, 7, 8

  **References**:

  **Pattern References**:
  - `app/app/examples/dynamic_images.tsx` — THE closest existing example. Shows how to use `bridge.setEntityImage()` to dynamically change sprites. The camera example follows the same structure but uses `CameraTexture` instead.
  - `app/lib/registry/types.ts` — `ExampleMeta` type for the registry metadata export.
  - `app/lib/game-engine/GameRuntime.godot.tsx:92-115` — `GameRuntimeGodotProps` interface. The example passes a `GameDefinition` with a camera-target entity.

  **Acceptance Criteria**:
  - [ ] Example appears in the examples registry after running `pnpm generate:registry`
  - [ ] Example loads on iOS: Godot scene with a sprite, start/stop buttons visible
  - [ ] Pressing "Start Camera" shows live camera feed on the sprite (iOS)
  - [ ] Pressing "Stop Camera" returns sprite to placeholder
  - [ ] Example loads on Web: same behavior with web camera
  - [ ] Example loads on Android: same behavior with Android camera
  - [ ] No crashes on any platform during start/stop cycling (10 cycles)
  - [ ] Frame rate counter shows ≥15fps on all platforms

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Camera feed visible on iOS
    Tool: Bash (iOS simulator)
    Preconditions: Full pipeline built (Tasks 1-8 complete)
    Steps:
      1. pnpm ios
      2. Navigate to camera_feed example
      3. Press "Start Camera"
      4. Wait 3 seconds
      5. Check Godot console for frame update logs
      6. Press "Stop Camera"
      7. Verify sprite returns to placeholder (logs confirm)
    Expected Result: Camera feed visible, start/stop works
    Evidence: Console logs showing frame sequences

  Scenario: Camera feed visible on Web
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, pnpm dev
    Steps:
      1. Navigate to http://localhost:8085/examples/camera_feed
      2. Wait for Godot ready (window.slopcadeGameReady)
      3. Click "Start Camera" button
      4. Wait for camera permission (auto-granted in Playwright with --use-fake-device-for-media-stream)
      5. Wait 2 seconds
      6. Screenshot: .sisyphus/evidence/task-9-web-camera-feed.png
      7. Assert: Sprite area is non-uniform (not solid color — camera feed is visible)
      8. Click "Stop Camera"
      9. Wait 1 second
      10. Screenshot: .sisyphus/evidence/task-9-web-camera-stopped.png
    Expected Result: Camera feed visible, then stops cleanly
    Evidence: .sisyphus/evidence/task-9-web-camera-feed.png, task-9-web-camera-stopped.png

  Scenario: Start/stop cycling doesn't crash
    Tool: Bash (simulator or Playwright)
    Preconditions: Example running
    Steps:
      1. Loop 10 times: start camera, wait 1s, stop camera, wait 0.5s
      2. Assert: no crash, no memory growth > 10MB over baseline
    Expected Result: Stable through 10 cycles
    Evidence: Console output, memory readings
  ```

  **Commit**: YES
  - Message: `feat(camera): working camera_feed example demonstrating live camera → Godot texture`
  - Files: `app/app/examples/camera_feed.tsx`
  - Pre-commit: `pnpm generate:registry && tsc --noEmit`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(camera): spike - validate GDExtension + dlsym + shared memory` | `godot_project/addons/camera-texture/spike/` | iOS simulator launch |
| 2 | `feat(camera): SharedFrameBuffer header-only double-buffer` | `app/lib/camera/native/shared/` | clang++ compile test |
| 3 | `feat(camera): GDExtension CameraTextureProvider` | `godot_project/addons/camera-texture/` | scons build |
| 4 | `feat(camera): GDScript camera manager for GameBridge` | `godot_project/scripts/camera/` | Godot loads |
| 5 | `feat(camera): web camera helper via getUserMedia` | `app/public/godot/camera-helper.js`, GDScript | Web build |
| 6 | `feat(camera): iOS VisionCamera Frame Processor Plugin` | `app/lib/camera/native/ios/` | iOS build |
| 7 | `feat(camera): Android VisionCamera FPP with YUV conversion` | `app/lib/camera/native/android/` | Android build |
| 8 | `feat(camera): unified CameraTexture TypeScript interface` | `app/lib/camera/` | tsc --noEmit |
| 9 | `feat(camera): camera_feed example page` | `app/app/examples/camera_feed.tsx` | Full integration |

---

## Success Criteria

### Verification Commands
```bash
# TypeScript compiles
pnpm tsc --noEmit  # Expected: 0 errors

# GDExtension builds for iOS
cd godot_project/addons/camera-texture && scons platform=ios  # Expected: .dylib produced

# iOS app builds
pnpm ios  # Expected: app launches on simulator

# Android app builds
pnpm android  # Expected: app launches on emulator

# Web builds
pnpm web  # Expected: no build errors

# Registry updated
pnpm generate:registry  # Expected: camera_feed in examples list
```

### Performance Targets
| Platform | Resolution | Target FPS | Max Latency |
|----------|-----------|------------|-------------|
| iOS | 640×480 | ≥ 20fps | < 50ms |
| iOS | 1280×720 | ≥ 15fps | < 66ms |
| Android | 640×480 | ≥ 15fps | < 66ms |
| Web | 640×480 | ≥ 15fps | < 66ms |

### Final Checklist
- [ ] Camera feed visible as Godot texture on iOS
- [ ] Camera feed visible as Godot texture on Android
- [ ] Camera feed visible as Godot texture on Web
- [ ] No pixel data through JS bridge on native (profiling evidence)
- [ ] Start/stop controls functional on all platforms
- [ ] No crash on camera permission denied
- [ ] No crash on app backgrounding
- [ ] No memory leaks over 60s
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
