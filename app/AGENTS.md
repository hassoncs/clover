# Project Architecture & Agents Guide

## Overview
This project demonstrates high-performance 2D physics in React Native using **Skia** (rendering) and **Rapier** (physics).
It supports **Web (WASM)**, **iOS**, and **Android** (JSI).

## Tech Stack
- **Framework**: Expo SDK 54 (Managed)
- **Rendering**: `@shopify/react-native-skia`
- **Physics**: 
  - Native: `react-native-box2d` (JSI)
  - Web: `box2d-wasm` (WASM) via Monkey-Patched Adapter
- **Animation/Loop**: `react-native-reanimated` (useFrameCallback)
- **Styling**: NativeWind (Tailwind)

## Key Patterns

### 1. Web Compatibility (CRITICAL)
- **Skia Loading**: ALL Skia components MUST be lazy-loaded using the custom `<WithSkia />` component (wraps `WithSkiaWeb` with `locateFile` fix).
- **Physics Loading**: Use `lib/physics/index.web.ts` and `lib/physics/index.native.ts` extensions. Avoid `index.ts` to prevent Metro resolution ambiguity.
- **WASM Paths**: `metro.config.js` is customized to force `box2d-wasm` to use UMD build (fixes `import.meta` errors).

### 2. Physics Loop
- Use `useFrameCallback(callback, true)` from Reanimated.
- **Auto-start**: The second argument `true` is required for the loop to start immediately.
- **Guard Clause**: Inside the loop, check `if (!worldRef.current) return;`.
- **Flow**:
  1. `useFrameCallback` triggers every frame.
  2. `world.step()` advances physics.
  3. Read positions from Box2D bodies.
  4. Update React State or SharedValues.

### 3. Box2D API Unification (JSI vs WASM)
The `Physics.web.ts` adapter **Monkey Patches** `box2d-wasm` classes to match the JSI API:
- `b2Vec2`: Added `.x` and `.y` getters/setters (WASM uses `get_x()`).
- `b2CircleShape`: Aliased `SetRadius` to `set_m_radius`.
- `b2Body`: Polyfilled `CreateFixture2(shape, density)` which is a JSI convenience method.

ALWAYS implement new physics features by checking both APIs and adding patches to `Physics.web.ts` if needed.

## Unified Physics API

This project uses a custom adapter pattern to support both Native (JSI) and Web (WASM) physics with a single API.

- **`app/lib/physics/index.native.ts`**: Native entry point.
- **`app/lib/physics/index.web.ts`**: Web entry point.
- **`app/lib/physics/types.ts`**: Shared TypeScript interfaces.
- **`app/lib/physics/Physics.native.ts`**: Wraps `react-native-box2d`.
- **`app/lib/physics/Physics.web.ts`**: Wraps `box2d-wasm` + Polyfills.

### Usage

```typescript
import { initPhysics } from "@/physics";

// Inside React Component
useEffect(() => {
  const setup = async () => {
    const Box2D = await initPhysics(); // Awaits WASM on web, resolves instantly on native
    const world = Box2D.b2World(Box2D.b2Vec2(0, 9.8));
    // ... use Box2D normally
  };
  setup();
}, []);
```
