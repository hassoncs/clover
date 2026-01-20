# Infrastructure Plan: Physics + Graphics on React Native

## Executive Summary

**Goal**: Get a fast physics engine (Box2D or Rapier) working with a graphics library (Skia) across iOS, Android, and Web.

**Current State**: You already have a working prototype with:
- ✅ React Native Skia for rendering (works on all platforms)
- ✅ Box2D JSI for native physics (works on iOS/Android)
- ✅ Box2D WASM for web physics (works on web)
- ⚠️ JSI debugging limitation (expected behavior, not a bug)

**Recommendation**: **Continue with current architecture** - it's the right approach. The error you saw is expected when using Chrome remote debugging with JSI modules.

---

## Current Architecture Analysis

### What You Have (It's Good!)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         YOUR CURRENT SETUP                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   iOS/Android (Native)              Web                                 │
│   ┌─────────────────────┐          ┌─────────────────────┐             │
│   │ react-native-box2d  │          │ box2d-wasm          │             │
│   │ (JSI - C++ bindings)│          │ (Emscripten WASM)   │             │
│   │                     │          │                     │             │
│   │ ✅ Native thread    │          │ ✅ Web Worker ready │             │
│   │ ✅ Synchronous      │          │ ✅ Runs anywhere    │             │
│   │ ✅ Max performance  │          │ ⚠️ Blocks JS thread │             │
│   └─────────────────────┘          └─────────────────────┘             │
│              │                                │                         │
│              └────────────┬───────────────────┘                         │
│                           │                                             │
│                           ▼                                             │
│              ┌─────────────────────────┐                               │
│              │   Unified Box2D API      │                               │
│              │   (lib/physics/types.ts) │                               │
│              └─────────────────────────┘                                │
│                           │                                             │
│                           ▼                                             │
│              ┌─────────────────────────┐                               │
│              │   React Native Skia      │                               │
│              │   (Rendering)            │                               │
│              │                          │                               │
│              │   iOS: Metal             │                               │
│              │   Android: OpenGL/Vulkan │                               │
│              │   Web: CanvasKit WASM    │                               │
│              └─────────────────────────┘                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Platform Resolution (Metro)

Your setup correctly uses Metro's platform extensions:

```
lib/physics/
├── index.native.ts    → Used on iOS/Android (imports Physics.native.ts)
├── index.web.ts       → Used on Web (imports Physics.web.ts)
├── Physics.native.ts  → Wraps react-native-box2d (JSI)
├── Physics.web.ts     → Wraps box2d-wasm + monkey patches
└── types.ts           → Shared TypeScript interface
```

---

## The JSI Debugging "Error" Explained

### What You Saw

```
Uncaught Error
Failed to install react-native-box2d: React Native is not running on-device.
Box2d can only be used when synchronous method invocations (JSI) are possible.
```

### Why This Happens

| Debugging Mode | JS Execution | JSI Available | Result |
|----------------|--------------|---------------|--------|
| **Flipper** | On-device | ✅ Yes | Works |
| **Hermes Debugger** | On-device | ✅ Yes | Works |
| **Chrome Remote Debug** | In Chrome | ❌ No | Fails |
| **Expo Go** | Expo runtime | ❌ No | Fails |

**JSI requires JS to run on the same device as the native code.** Chrome remote debugging runs JS in Chrome (off-device), breaking the synchronous bridge.

### Solutions

#### Option 1: Use Flipper (Recommended for Native Dev)
```bash
# Run on device/simulator without remote debugging
npx expo run:ios
npx expo run:android

# Debug with Flipper (download from https://fbflipper.com/)
# Flipper connects to the app without moving JS off-device
```

#### Option 2: Use Hermes Debugger
```bash
# Connect via Chrome to Hermes directly (not remote debugging)
# Open chrome://inspect and connect to the Hermes runtime
```

#### Option 3: Use Expo Dev Client (NOT Expo Go)
```bash
# Expo Go doesn't support custom native modules
# Build a dev client instead:
npx expo prebuild
npx expo run:ios
```

#### Option 4: Conditional Loading (Your Current Approach)
Your architecture already handles this - on web, it loads `box2d-wasm` which works in any JS environment.

---

## Physics Engine Comparison

### Option A: Box2D (Current Choice) ✅ RECOMMENDED

| Aspect | Box2D JSI (Native) | Box2D WASM (Web) |
|--------|-------------------|------------------|
| **Performance** | Excellent (native C++) | Good (WASM in browser) |
| **Thread** | Native thread via JSI | JS thread (can use Worker) |
| **Debugging** | Flipper only | Chrome DevTools |
| **Maturity** | Battle-tested (Angry Birds) | Same engine, WASM compiled |
| **API** | Property-based (.x, .y) | Method-based (get_x()) |
| **Your Status** | ✅ Working | ✅ Working (with monkey patches) |

**Verdict**: Keep using Box2D. You've already solved the hard problems (API unification, JSI/Skia macro conflicts).

### Option B: Rapier

| Aspect | Status | Notes |
|--------|--------|-------|
| **react-native-rapier** | ❌ Does not exist | No JSI bindings available |
| **@dimforge/rapier2d** | ⚠️ WASM only | Would block JS thread on native |
| **Performance** | Good | But no JSI = no native thread benefits |
| **Determinism** | Excellent | Better than Box2D for replays |

**Verdict**: Not viable for React Native until someone writes JSI bindings. You'd lose the native performance advantage.

### Option C: Matter.js

| Aspect | Status | Notes |
|--------|--------|-------|
| **Architecture** | Pure JavaScript | No native component |
| **Performance** | Moderate | Runs on JS thread, blocks UI |
| **Integration** | Easy | Just npm install |
| **Physics Quality** | Good for simple games | Not as robust as Box2D |

**Verdict**: Use as fallback only. Performance will suffer with many bodies.

---

## Graphics Engine Comparison

### Option A: React Native Skia ✅ RECOMMENDED (Current Choice)

| Aspect | Details |
|--------|---------|
| **Performance** | Excellent - hardware accelerated |
| **Platform Support** | iOS (Metal), Android (OpenGL/Vulkan), Web (CanvasKit WASM) |
| **API** | Declarative React components |
| **Physics Integration** | Works with any physics engine |
| **Features** | Shapes, images, shaders, paths, transforms |
| **Community** | Large, active (Shopify maintained) |

**Verdict**: Best choice for 2D game rendering in React Native.

### Option B: Expo GL

| Aspect | Details |
|--------|---------|
| **Performance** | Excellent - raw OpenGL/WebGL |
| **API** | Low-level (WebGL-style) |
| **Ease of Use** | Harder - manual draw calls |
| **Features** | Everything (it's raw GL) |
| **Use Case** | 3D games, custom renderers |

**Verdict**: Overkill for 2D physics games. Skia is higher-level and easier.

### Option C: React Native Game Engine

| Aspect | Details |
|--------|---------|
| **What It Is** | Entity-component system, not a renderer |
| **Renderer** | Uses React Native Views or custom |
| **Physics** | Often paired with Matter.js |
| **Performance** | Limited by RN View system |

**Verdict**: Useful for game loop structure, but Skia + Box2D outperforms it.

---

## Recommended Architecture (Final)

### Keep Your Current Setup

Your architecture is correct. Here's the validation:

| Component | Choice | Status | Rationale |
|-----------|--------|--------|-----------|
| **Physics (Native)** | react-native-box2d (JSI) | ✅ Keep | Best performance, native thread |
| **Physics (Web)** | box2d-wasm | ✅ Keep | Only viable option for web |
| **Rendering** | React Native Skia | ✅ Keep | Best 2D renderer for RN |
| **Game Loop** | Reanimated useFrameCallback | ✅ Keep | 60fps, UI thread |
| **API Unification** | Monkey-patched adapter | ✅ Keep | Solves JSI/WASM API differences |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RECOMMENDED FINAL ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                        ┌─────────────────────┐                         │
│                        │    Your Game Code    │                         │
│                        │                      │                         │
│                        │  - Entity System     │                         │
│                        │  - Behaviors         │                         │
│                        │  - Rules             │                         │
│                        └──────────┬───────────┘                         │
│                                   │                                     │
│                                   ▼                                     │
│                        ┌─────────────────────┐                         │
│                        │   Unified Box2D API  │                         │
│                        │   (lib/physics/)     │                         │
│                        └──────────┬───────────┘                         │
│                                   │                                     │
│              ┌────────────────────┼────────────────────┐               │
│              │                    │                    │               │
│              ▼                    │                    ▼               │
│   ┌─────────────────────┐        │        ┌─────────────────────┐     │
│   │  iOS/Android        │        │        │  Web                │     │
│   │                     │        │        │                     │     │
│   │  react-native-box2d │        │        │  box2d-wasm         │     │
│   │  (JSI)              │        │        │  (WASM)             │     │
│   │                     │        │        │                     │     │
│   │  + Skia (Metal/GL)  │        │        │  + Skia (CanvasKit) │     │
│   └─────────────────────┘        │        └─────────────────────┘     │
│                                   │                                     │
│                                   ▼                                     │
│                        ┌─────────────────────┐                         │
│                        │  useFrameCallback    │                         │
│                        │  (Reanimated)        │                         │
│                        │                      │                         │
│                        │  1. Step physics     │                         │
│                        │  2. Read positions   │                         │
│                        │  3. Update state     │                         │
│                        │  4. Render (Skia)    │                         │
│                        └─────────────────────┘                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Action Items

### Immediate (Your Setup Works)

1. **Don't use Chrome Remote Debugging** for native development
   - Use Flipper instead
   - Or use `console.log` + Metro logs

2. **Always test on device/simulator**, not Expo Go
   ```bash
   npx expo run:ios
   npx expo run:android
   ```

3. **Web works out of the box** - your WASM setup is correct

### Short-term Improvements

1. **Add error boundary for physics initialization**
   ```typescript
   // Detect if JSI is available before loading
   const canUseJSI = typeof global?.nativeCallSyncHook === 'function';
   ```

2. **Consider Web Worker for box2d-wasm** (optional, for performance)
   - Move physics step to Worker thread
   - Prevents blocking UI on web

3. **Add physics world pooling** for entity creation/destruction

### Medium-term

1. **Build the Entity Manager** (as planned in game-maker docs)
2. **Build the Behavior System** (as planned)
3. **Add collision callbacks** to Box2D adapter

---

## Debugging Cheat Sheet

| Symptom | Cause | Solution |
|---------|-------|----------|
| "React Native is not running on-device" | Chrome remote debugging | Use Flipper instead |
| Physics works on web, not native | JSI not loading | Run `npx expo run:ios`, not Expo Go |
| Physics works on native, not web | WASM not loading | Check `/box2d.wasm` path in public/ |
| Skia not rendering on web | CanvasKit not loaded | Check WithSkia wrapper, /canvaskit.wasm |
| Bodies fall through floor | Physics scale wrong | Check PIXELS_PER_METER constant |
| Performance issues | Too many setState calls | Use SharedValues or batch updates |

---

## Conclusion

**Your infrastructure is solid.** The error you encountered is expected behavior when mixing JSI with remote debugging - it's not a bug in your code or the libraries.

### What Works Now
- ✅ Box2D physics on iOS/Android (JSI)
- ✅ Box2D physics on Web (WASM)
- ✅ Skia rendering on all platforms
- ✅ Unified API across platforms
- ✅ 60fps game loop with Reanimated

### What to Build Next
1. Entity Manager (load JSON game definitions)
2. Behavior System (declarative game logic)
3. Rules Engine (win/lose conditions)
4. AI Integration (generate games from prompts)

**The foundation is ready. Start building the game engine layer.**
