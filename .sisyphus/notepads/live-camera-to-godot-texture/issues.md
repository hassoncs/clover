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
