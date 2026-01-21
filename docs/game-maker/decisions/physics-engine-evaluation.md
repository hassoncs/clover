# Physics Engine Evaluation: Box2D vs Rapier vs Planck.js

*Last updated: January 2026*

## Executive Summary

| Question | Answer |
|----------|--------|
| **Should we use Rapier or Box2D?** | **Box2D** - Rapier JSI bindings exist but are NOT production-ready |
| **How do we fix the debugging warning?** | Use **Flipper** or **Hermes Inspector** instead of Chrome Remote Debugging |
| **Does react-native-game-engine help us?** | **No** - It's just a game loop; we already have that with Reanimated |

---

## 1. Rapier vs Box2D: Detailed Analysis

### The Discovery: react-native-rapier EXISTS!

Contrary to previous research, **Callstack has created JSI bindings for Rapier**:

| Attribute | Value |
|-----------|-------|
| **Repository** | https://github.com/callstack/react-native-rapier |
| **Author** | Callstack (Robert Pasiński, Oskar Kwaśniewski) |
| **Stars** | 37 |
| **Commits** | 12 |
| **NPM Published** | **NO** - Not on npm registry |
| **Releases** | **NONE** |
| **Forks** | 0 |

### react-native-rapier Status: EXPERIMENTAL

```
⚠️ WARNING: react-native-rapier is NOT production-ready
- Not published to npm
- No releases
- Only 12 commits total
- Minimal documentation ("Refer to rapier.rs docs")
- No web support mentioned
- No active community usage
```

### Comparison Table

| Aspect | Box2D (Your Current Setup) | Rapier (react-native-rapier) | Planck.js |
|--------|---------------------------|------------------------------|-----------|
| **Native JSI** | ✅ react-native-box2d | ⚠️ Exists but experimental | ❌ None |
| **Web Support** | ✅ box2d-wasm | ❌ Unknown/unclear | ✅ Pure JS |
| **npm Published** | ✅ Yes | ❌ No | ✅ Yes |
| **Production Ready** | ✅ Yes | ❌ No | ✅ Yes |
| **Your Adapter** | ✅ Already built | ❌ Would need new adapter | ⚠️ Different API |
| **Community** | Large (Box2D ecosystem) | None yet | Medium |
| **Performance** | Excellent (JSI + native) | Potentially better | Good (JS thread) |
| **Determinism** | Good | Excellent | Good |
| **3D Support** | ❌ 2D only | ✅ 2D + 3D | ❌ 2D only |

### Recommendation: Stay with Box2D

**Reasons:**

1. **Your adapter already works** - You've solved the hard problems (JSI/WASM API unification, Skia macro conflicts)
2. **react-native-rapier is not production-ready** - No npm package, no releases, only 12 commits
3. **No web support clarity** - Rapier bindings don't mention web; you'd need to build that adapter
4. **Box2D is battle-tested** - Angry Birds, countless games, well-documented
5. **Switching cost is high** - Physics APIs differ significantly; behaviors would need rewriting

**When to reconsider Rapier:**

- When react-native-rapier publishes to npm (v1.0+)
- When it has web support (or you don't need web)
- When you need 3D physics
- When deterministic replays are critical (Rapier is better here)

---

## 2. The Debugging Warning: Root Cause and Fix

### The Error You See

```
Uncaught Error
Failed to install react-native-box2d: React Native is not running on-device.
Box2d can only be used when synchronous method invocations (JSI) are possible.
```

### Why It Happens

**JSI (JavaScript Interface) requires JS to run on the SAME device as native code.**

| Debugging Method | Where JS Runs | JSI Works? | Result |
|------------------|---------------|------------|--------|
| **Flipper** | On device | ✅ Yes | ✅ Works |
| **Hermes Inspector** | On device | ✅ Yes | ✅ Works |
| **Chrome Remote Debug** | In Chrome browser | ❌ No | ❌ Fails |
| **Expo Go** | Expo runtime | ❌ No | ❌ Fails |

When you enable Chrome Remote Debugging, React Native moves JavaScript execution from your phone/simulator to Chrome's V8 engine. JSI needs synchronous access to native code, which is impossible when JS runs in a different process.

### Solutions

#### Option 1: Use Flipper (Recommended)

```bash
# Install Flipper from https://fbflipper.com/
# Run your app normally:
npx expo run:ios
npx expo run:android

# Flipper auto-connects and provides:
# - React DevTools
# - Network inspector
# - Layout inspector
# - Logs
# - Database viewer
```

#### Option 2: Use Hermes Inspector (Built-in)

```bash
# 1. Run your app
npx expo run:ios

# 2. Open Safari (iOS) or Chrome (Android)
# iOS: Safari > Develop > [Device] > [App]
# Android: chrome://inspect/#devices

# 3. You get full debugger with JSI working
```

#### Option 3: Use console.log + Metro Logs

```bash
# Terminal 1: Start Metro
npx expo start

# Terminal 2: View logs (simpler debugging)
# Logs appear in Metro terminal

# Or use Expo CLI log viewer
npx expo start --dev-client
# Press 'j' to open debugger
```

#### Option 4: Expo Dev Client (NOT Expo Go)

```bash
# Expo Go doesn't support custom native modules
# Build a development client instead:

npx expo prebuild
npx expo run:ios    # Builds native project
npx expo run:android
```

### What NOT To Do

```
❌ Don't enable "Debug JS Remotely" in the dev menu
❌ Don't use Expo Go for JSI modules
❌ Don't expect react-native-box2d to work in Chrome
```

### Quick Reference

| I want to... | Do this |
|--------------|---------|
| Debug with breakpoints | Flipper or Hermes Inspector |
| Inspect network | Flipper |
| View console.logs | Metro terminal or Flipper |
| Profile performance | Flipper or Xcode Instruments |
| Test on physical device | `npx expo run:ios --device` |

---

## 3. react-native-game-engine: Does It Help?

### What react-native-game-engine Actually Is

```
react-native-game-engine = Game Loop + Entity System + Event Dispatch
                         ≠ Physics Engine
                         ≠ Renderer
```

### Core Features

| Feature | Description | Do We Need It? |
|---------|-------------|----------------|
| **Game Loop** | Fixed timestep update cycle | ❌ We have `useFrameCallback` |
| **Entity System** | Component-based entities | ⚠️ We're building our own |
| **Event Dispatch** | Inter-entity communication | ⚠️ We're building our own |
| **Touch Handling** | Input processing | ⚠️ Basic, we need more |

### What It Does NOT Provide

- ❌ **No physics engine** - You must bring your own (usually Matter.js)
- ❌ **No renderer** - Uses React Native Views (slow) or custom renderer
- ❌ **No Skia integration** - Would need custom bridge
- ❌ **No collision detection** - That's the physics engine's job

### Our Stack vs react-native-game-engine

| Capability | Our Current Stack | react-native-game-engine |
|------------|-------------------|--------------------------|
| **Game Loop** | Reanimated `useFrameCallback` (60fps, UI thread) | Custom loop (similar) |
| **Physics** | Box2D JSI (native thread) | Matter.js (JS thread) |
| **Rendering** | Skia (GPU accelerated) | RN Views (slow) or custom |
| **Performance** | Excellent | Moderate |
| **Complexity** | More code to write | Less code to write |

### Verdict: SKIP react-native-game-engine

**Reasons:**

1. **We already have a game loop** - `useFrameCallback` is faster and simpler
2. **Its value is the abstraction** - But we're building our own entity system anyway
3. **It usually pairs with Matter.js** - Slower than Box2D JSI
4. **No Skia integration** - We'd have to bridge it ourselves
5. **Maintenance status** - Last significant update was years ago

**What we'd gain:** Slightly less boilerplate for entity management

**What we'd lose:** Control, performance, Skia integration

**Conclusion:** Build our Entity Manager and Behavior System as planned. The documentation already defines a cleaner architecture than react-native-game-engine provides.

---

## 4. Updated Architecture Decision

### Final Tech Stack

| Layer | Choice | Status | Rationale |
|-------|--------|--------|-----------|
| **Physics (Native)** | react-native-box2d (JSI) | ✅ Keep | Production-ready, your adapter works |
| **Physics (Web)** | box2d-wasm | ✅ Keep | Only viable option with same API |
| **Rendering** | React Native Skia | ✅ Keep | Best 2D renderer for RN |
| **Game Loop** | Reanimated useFrameCallback | ✅ Keep | 60fps, UI thread, simple |
| **Entity System** | Custom (your ENTITY_SYSTEM.md design) | 📝 Build | Cleaner than rnge |
| **Behaviors** | Custom (your BEHAVIOR_SYSTEM.md design) | 📝 Build | AI-friendly, declarative |

### What About Planck.js?

Planck.js (pure JS Box2D rewrite) was mentioned in your research doc. Here's the assessment:

| Aspect | Planck.js | Your Current Box2D Setup |
|--------|-----------|--------------------------|
| **Performance** | Good (JS thread) | Excellent (native thread via JSI) |
| **Web Support** | ✅ Native JS | ✅ WASM |
| **API** | Cleaner, more idiomatic | Requires adapter for API differences |
| **Thread** | Blocks JS thread | Native thread (doesn't block UI) |
| **Setup Complexity** | Simpler | Already done |

**Verdict:** Planck.js is a reasonable alternative if you didn't already have Box2D working. But you do, and JSI gives you better performance. Keep Box2D.

---

## 5. Next Steps (Planning Phase)

Since we're still in planning:

### Validated Decisions

- [x] Physics engine: Box2D (JSI native + WASM web)
- [x] Renderer: React Native Skia
- [x] Game loop: Reanimated useFrameCallback
- [x] Debugging: Use Flipper, not Chrome Remote Debug
- [x] react-native-game-engine: Skip it

### Open Questions to Resolve

1. **Entity System granularity** - How complex should templates be?
2. **Collision callback API** - How to expose Box2D contacts to behaviors?
3. **AI generation format** - Final JSON schema for game definitions?
4. **Web Worker for physics** - Should we move box2d-wasm to a Worker?

### Prototype Priority

Before building the full Entity Manager, validate these assumptions:

1. **Collision events work** - Can we get contact callbacks from Box2D JSI?
2. **Performance baseline** - How many bodies can we simulate at 60fps?
3. **JSON loading** - Round-trip: JSON → Box2D bodies → Skia → screen

---

## Appendix: Research Sources

### Rapier React Native

- Repository: https://github.com/callstack/react-native-rapier
- Status checked: January 2026
- npm status: Not published
- Conclusion: Experimental, not production-ready

### react-native-game-engine

- Repository: https://github.com/bberak/react-native-game-engine
- npm: https://www.npmjs.com/package/react-native-game-engine
- Last major update: 2020
- Conclusion: Useful abstraction but unnecessary for our stack

### JSI Debugging

- Official React Native docs on debugging
- Flipper documentation
- Hermes Inspector setup guides
- Conclusion: Flipper is the recommended solution for JSI apps

### Box2D Ecosystem

- react-native-box2d (hannojg): Working JSI bindings
- box2d-wasm (Birch-san): Working WASM bindings
- Your adapter: Successfully unifies both APIs
