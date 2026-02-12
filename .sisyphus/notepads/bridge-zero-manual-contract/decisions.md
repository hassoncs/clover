# Decisions - Bridge Zero Manual Contract


## 2026-02-12 Phase 2: Unified Native + Web Bridge Generation

### Decision: Option B — Shared Generated Methods + Platform Dispatch Injection

**Context**: Phase 1 generated web bridge methods but left native hand-maintained. User correctly identified this as half-solving the drift problem.

**Analysis of native bridge (1631 lines)**:
- Both platforms do identical arg preparation (flatten Vec2, JSON.stringify, handle defaults)
- Only the dispatch mechanism differs:
  - Web: `getBridge()?.camelName(...)` / `queryAsync("camelName", [...])`
  - Native: `callGameBridge("snake_name", ...)` / `callGameBridgeAsync("snake_name", ...)`

**Architecture**:
- Generate ONE file with `createBridgeMethods(dispatch: PlatformDispatch)`
- Each platform provides `PlatformDispatch` implementation
- Native overrides (~18 methods) stay hand-written: lifecycle, worklets, file downloads
- Generated methods: ~100+ shared across both platforms

**Key technical details**:
- Native uses `callGameBridge` → `runOnGodotThread` worklet → `gameBridge.native_dispatch(snakeName, argsJson)`
- Native uses `callEffectsBridge` → separate worklet → `effectsBridge.native_dispatch(snakeName, argsJson)`
- Web uses `window.GodotBridge[camelName](...args)` (direct JS call)
- The generated code uses snake_case names (canonical Godot names). Web dispatch adapter maps snake→camel.

**Native override list**:
- initialize(), dispose() — lifecycle
- getEntityTransform(), getAllTransforms(), screenToWorld() — inline worklets
- setEntityImage(), setEntityAtlasRegion(), preloadTextures() — file downloads
- getAvailableEffects() — hardcoded return
- setInspectMode(), getAllEntities(), setUserData(), getUserData() — stubs/no-ops
