# Cross-Platform Script Sandbox Plan

## Current State

| Platform | Runner | Package | Status |
|----------|--------|---------|--------|
| **Cloudflare Workers** | `QuickJSServerRunner` | `@cf-wasm/quickjs` | ✅ Production ready |
| **Web (browser)** | `QuickJSScriptSandbox` | `quickjs-emscripten` + `@jitl/quickjs-singlefile-browser-release-sync` | ⚠️ Disabled (`USE_SAFE_SANDBOX=false`) |
| **Native (iOS/Android)** | `UnsafeScriptSandbox` (eval) | N/A | ❌ QuickJS blocked — no `WebAssembly` in Hermes/JSC |

## Goal

Secure, isolated script execution on all three platforms so AI-generated game scripts can run safely everywhere.

## Phase 1: Enable Web QuickJS (Low Risk)

The infrastructure exists and should work — it's just disabled.

- [ ] Flip `USE_SAFE_SANDBOX = true` in `createScriptSandbox.web.ts`
- [ ] Run existing game engine tests on web to verify QuickJS sandbox works
- [ ] Load a game with `scriptRef` modules in the web build and verify it plays correctly
- [ ] Profile performance: compare QuickJS sandbox vs eval sandbox for frame-time impact
- [ ] If perf is acceptable, ship it. If not, keep eval as fallback with a runtime toggle.

**Risk**: Low. The WASM variant (`@jitl/quickjs-singlefile-browser-release-sync`) is designed for browsers. The `QuickJSScriptSandbox` and `QuickJSEngine` already exist.

## Phase 2: Native QuickJS via JSI (Medium Effort)

React Native's Hermes engine has no `WebAssembly` global, so the WASM-based QuickJS doesn't work. Two options:

### Option A: `react-native-quickjs` (JSI binding) — Recommended
A native QuickJS compiled to C and accessed via JSI (JavaScript Interface). No WASM needed.

- [ ] Evaluate `react-native-quickjs` or similar JSI-based QuickJS packages
- [ ] Create `QuickJSEngine.native.ts` platform-split using JSI binding instead of WASM
- [ ] Ensure the `IScriptSandbox` interface is preserved (same API, different engine)
- [ ] Run game engine tests on iOS simulator
- [ ] Profile frame-time impact vs eval

### Option B: Polyfill `WebAssembly` in Hermes
Hermes nightly builds are adding WASM support. Alternatively, a polyfill could bridge the gap.

- Not recommended — fragile, untested, performance unknown.

## Phase 3: Remove `UnsafeScriptSandbox` (Cleanup)

Once QuickJS works on all platforms:

- [ ] Delete `UnsafeScriptSandbox.ts`
- [ ] Remove `USE_SAFE_SANDBOX` flag — always use safe sandbox
- [ ] Remove `new Function()` usage from client-side code entirely
- [ ] Update CSP headers on web to disallow `unsafe-eval`

## Non-Goals (For Now)

- **DO eviction resilience**: The QuickJS server runner doesn't survive DO restarts. This is acceptable for 20-30 minute party games (DOs stay alive while WebSocket connections exist). A checkpoint/resume system would be a separate project.
- **Server-side sandbox changes**: `QuickJSServerRunner` on Workers is done. No changes needed.

## Files to Touch

| File | Change |
|------|--------|
| `app/lib/scripting/createScriptSandbox.web.ts` | Flip flag to `true` |
| `app/lib/scripting/createScriptSandbox.native.ts` | Switch to JSI engine |
| `app/lib/scripting/engine/QuickJSEngine.ts` | Current WASM engine (web only) |
| `app/lib/scripting/engine/QuickJSEngine.native.ts` | NEW: JSI-based engine for native |
| `app/lib/scripting/UnsafeScriptSandbox.ts` | DELETE after Phase 3 |
