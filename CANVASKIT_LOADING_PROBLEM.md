# CanvasKit WASM Loading Problem - Comprehensive Analysis

## Problem Statement

When deploying a React Native Web app using `@shopify/react-native-skia` with CanvasKit WASM to Cloudflare Pages, we encounter a persistent race condition where lazy-loaded components that use Skia fail with:

```
TypeError: Cannot read properties of undefined (reading 'RuntimeEffect')
```

The error occurs specifically when:
1. Using `React.lazy()` to code-split components that use Skia
2. The component's module-level code executes before CanvasKit is fully initialized
3. In production builds (works fine in development)

## Current Architecture

### Component Structure

```
app/index.tsx
├── AsyncSkia (loads CanvasKit via LoadSkiaWeb())
└── Iridescence (lazy-loaded, uses Skia.RuntimeEffect.Make at module level)
```

### Loading Flow

1. **AsyncSkia Component**:
   - Uses `LoadSkiaWeb()` to load CanvasKit WASM
   - Wraps the promise in React Suspense
   - Verifies `Skia.RuntimeEffect` is available after load

2. **Iridescence Component** (lazy-loaded):
   - Module-level code: `const source = Skia.RuntimeEffect.Make(...)`
   - This executes immediately when the module is imported
   - Fails if `Skia.RuntimeEffect` is undefined

### Current Implementation

```typescript
// app/index.tsx
const Iridescence = React.lazy(() => import("../components/iridescence"));

<React.Suspense fallback={<ActivityIndicator />}>
  <AsyncSkia />
  <Iridescence />
</React.Suspense>
```

```typescript
// components/iridescence.tsx
// Module-level code - executes when module is imported
const source = Skia.RuntimeEffect.Make(`...`);
```

## The Core Issue

### What Works Locally

In development (`npx expo start --web`):
- Everything works correctly
- Skia is available when Iridescence module loads
- No race conditions observed

### What Breaks in Production

In production build (`npx expo export -p web`):
- Metro bundler creates separate chunks:
  - `entry-*.js` (main bundle with AsyncSkia)
  - `iridescence-*.js` (lazy-loaded chunk)
- When `React.lazy(() => import(...))` executes, the module is imported
- Module-level code in `iridescence.tsx` runs immediately
- At this point, `Skia.RuntimeEffect` is undefined, even though:
  - `LoadSkiaWeb()` promise has resolved
  - `Skia` object exists
  - `Skia.RuntimeEffect` check passes in AsyncSkia

## Technical Deep Dive

### Metro Bundler and Code Splitting

Metro bundler (used by Expo) creates separate bundles for:
1. **Main bundle**: Entry point and eagerly imported modules
2. **Lazy chunks**: Modules imported via `React.lazy()` or dynamic `import()`

When `React.lazy(() => import('./component'))` is called:
1. The function is executed when the component is first rendered
2. The `import()` call triggers a network request for the chunk
3. The chunk is downloaded and evaluated
4. **Module-level code executes immediately** during evaluation
5. The module exports are returned

### React.lazy() Behavior

```typescript
React.lazy(() => import('./Component'))
```

This creates a lazy component that:
- Returns a promise when rendered
- The promise resolves when the module is loaded
- React Suspense waits for the promise
- **BUT**: Module evaluation happens synchronously when the chunk loads

### The Race Condition

```
Timeline in Production:

T0: Page loads, main bundle executes
T1: AsyncSkia renders, starts LoadSkiaWeb()
T2: LoadSkiaWeb() promise resolves
T3: AsyncSkia verifies Skia.RuntimeEffect exists ✓
T4: React tries to render Iridescence
T5: React.lazy() function executes: import("../components/iridescence")
T6: Network request for iridescence-*.js chunk
T7: Chunk downloads and is evaluated
T8: Module-level code executes: Skia.RuntimeEffect.Make(...)
T9: ERROR: Skia.RuntimeEffect is undefined ❌
```

### Why the Check Passes But the Call Fails

The logs show:
```
[Iridescence] Skia is available, creating shader...
[App] ERROR loading Iridescence: TypeError: Cannot read properties of undefined (reading 'RuntimeEffect')
```

This suggests:
1. The `if (!Skia || !Skia.RuntimeEffect)` check passes
2. But `Skia.RuntimeEffect.Make()` fails because `RuntimeEffect` is undefined

Possible causes:
- **Module bundling isolation**: The lazy-loaded chunk might get its own copy of the Skia module
- **Timing issue**: `RuntimeEffect` might be a getter that's not initialized yet
- **Global scope issue**: CanvasKit might not be in the global scope when the chunk loads

### CanvasKit Initialization

CanvasKit (the WASM library) needs to:
1. Load the WASM file
2. Initialize the WebAssembly module
3. Expose APIs to JavaScript
4. Initialize Skia bindings

`LoadSkiaWeb()` likely:
- Loads the WASM file
- Initializes CanvasKit
- Sets up Skia bindings
- Returns a promise when done

But the Skia module export might be:
- A reference to a global CanvasKit instance
- A proxy that accesses CanvasKit APIs
- Not fully initialized until after the promise resolves

## Attempted Solutions

### Solution 1: Wait for RuntimeEffect in AsyncSkia

```typescript
LoadSkiaWeb().then((skia) => {
  // Wait for RuntimeEffect to be available
  return new Promise((resolve) => {
    const check = () => {
      if (Skia?.RuntimeEffect?.Make) {
        resolve(skia);
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
});
```

**Result**: Still fails - RuntimeEffect check passes but fails when called.

### Solution 2: Conditional Lazy Import

```typescript
// Only import after Skia is ready
useEffect(() => {
  if (Skia?.RuntimeEffect) {
    import("../components/iridescence").then(setComponent);
  }
}, []);
```

**Result**: Still fails - module-level code executes during import.

### Solution 3: Move Shader Creation to Component

```typescript
// In component, not module level
const source = useMemo(() => Skia.RuntimeEffect.Make(...), []);
```

**Result**: User doesn't want to change Iridescence component.

## Key Questions

1. **Is CanvasKit truly global?**
   - Where does CanvasKit get stored? (`global`, `globalThis`, `window`?)
   - Is it accessible across bundle boundaries?

2. **How does Skia module work?**
   - Is `Skia` a singleton or per-module instance?
   - Does each bundle get its own Skia reference?
   - Is there a shared global state?

3. **Why does it work in development?**
   - Development uses a single bundle (no code splitting?)
   - Different module resolution?
   - Hot reloading behavior?

4. **What's the correct initialization pattern?**
   - Should we wait for a specific global?
   - Is there an event or callback when CanvasKit is ready?
   - Should we check `global.CanvasKit` instead of `Skia.RuntimeEffect`?

## Research Directions

### 1. CanvasKit Global Scope

Check if CanvasKit is stored globally:
```javascript
// In iridescence.tsx module root
console.log('global.CanvasKit:', global?.CanvasKit);
console.log('globalThis.CanvasKit:', globalThis?.CanvasKit);
console.log('window.CanvasKit:', window?.CanvasKit);
```

### 2. Metro Bundler Configuration

Investigate:
- How Metro handles code splitting
- Module resolution across chunks
- Whether shared modules are duplicated

### 3. React Native Skia Source

Examine:
- How `LoadSkiaWeb()` initializes CanvasKit
- Where Skia module gets its reference
- If there's a global initialization pattern

### 4. Alternative Loading Strategies

Consider:
- Preloading the Iridescence module (no lazy loading)
- Using a different code-splitting strategy
- Ensuring CanvasKit is in global scope before any imports

## Expected Behavior

The ideal solution should:
1. ✅ Load CanvasKit WASM before any Skia-dependent code runs
2. ✅ Work in both development and production
3. ✅ Support lazy loading of Skia-dependent components
4. ✅ Not require changes to component code (module-level shader creation)

## Current Status

- ✅ WASM file loads correctly (200 status, correct MIME type)
- ✅ `LoadSkiaWeb()` promise resolves
- ✅ `Skia` object exists after load
- ✅ `Skia.RuntimeEffect` check passes in main bundle
- ❌ `Skia.RuntimeEffect` is undefined in lazy-loaded bundle
- ❌ Module-level code fails when lazy chunk loads

## Next Steps

1. Add logging to check `global.CanvasKit` availability
2. Investigate Metro bundler's code splitting behavior
3. Research React Native Skia's initialization pattern
4. Consider alternative architectures (preload, no lazy loading, etc.)

## Related Technologies

- **Metro Bundler**: JavaScript bundler for React Native
- **React.lazy()**: React's code splitting API
- **WebAssembly**: CanvasKit's runtime
- **CanvasKit**: Skia's WebAssembly port
- **@shopify/react-native-skia**: React Native bindings for Skia

## References

- [Metro Bundler Documentation](https://metrobundler.dev/)
- [React.lazy() Documentation](https://react.dev/reference/react/lazy)
- [React Native Skia Web Setup](https://shopify.github.io/react-native-skia/docs/getting-started/web/)
- [CanvasKit Documentation](https://skia.org/docs/user/modules/canvaskit/)

