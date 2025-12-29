# React Native Skia Web Loading Strategies

Based on the [official React Native Skia documentation](https://shopify.github.io/react-native-skia/docs/getting-started/web/), this document outlines all available approaches for loading CanvasKit WASM and ensuring Skia components work correctly with code-splitting.

## Key Principle

> **"Ensure Skia is fully loaded and initialized before importing the Skia module."**

This is the critical requirement. Any code that imports from `@shopify/react-native-skia` must execute **after** CanvasKit is loaded.

## Available Loading Methods

The documentation provides two primary methods:

1. **`<WithSkiaWeb />`** - For code-splitting, delaying the loading of Skia-importing components
2. **`LoadSkiaWeb()`** - To defer root component registration until Skia loads

## Method 1: Using Code-Splitting with `<WithSkiaWeb />`

### Overview

The `<WithSkiaWeb>` component utilizes code splitting to preload Skia before rendering components that use it. This is the **recommended approach** for code-splitting scenarios.

### Official Example

```typescript
import React from "react";
import { Text } from "react-native";
import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

export default function App() {
  return (
    <WithSkiaWeb
      // import() uses the default export of MySkiaComponent.tsx
      getComponent={() => import("@/components/MySkiaComponent")}
      fallback={<Text>Loading Skia...</Text>}
    />
  );
}
```

### Key Features

- **Handles code-splitting automatically** - The component is lazy-loaded only after Skia is ready
- **Built-in loading state** - Provides `fallback` prop for loading UI
- **Prevents module evaluation** - Ensures Skia is loaded before the component module is imported

### Important Note for Expo Router

> **"When using expo router in dev mode you cannot load components that are inside the app directory, as they will get evaluated by the router before CanvasKit is loaded. Make sure the component to load lies outside the 'app' directory."**

✅ **Our setup is correct** - `components/iridescence.tsx` is outside the `app/` directory.

### CDN Support

You can also load CanvasKit from a CDN:

```typescript
import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import { version } from "canvaskit-wasm/package.json";

export default function App() {
  return (
    <WithSkiaWeb
      opts={{
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${version}/bin/full/${file}`,
      }}
      getComponent={() => import("./MySkiaComponent")}
    />
  );
}
```

## Method 2: Using Deferred Component Registration

### Overview

The `LoadSkiaWeb()` function loads Skia **before** the React app starts. This ensures all modules that import Skia will have it available.

### For Expo Router Projects

For Expo Router, you need to create a custom entry point:

1. **Update `package.json`**:

   ```json
   -  "main": "expo-router/entry",
   +  "main": "index",
   ```

2. **Create `index.web.tsx`**:

   ```typescript
   import "@expo/metro-runtime";
   import { App } from "expo-router/build/qualified-entry";
   import { renderRootComponent } from "expo-router/build/renderRootComponent";
   import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

   LoadSkiaWeb().then(async () => {
     renderRootComponent(App);
   });
   ```

3. **Create `index.tsx`** (for non-web platforms):

   ```typescript
   import { renderRootComponent } from "expo-router/build/renderRootComponent";
   import { App } from "expo-router/build/qualified-entry";

   renderRootComponent(App);
   ```

### For Non-Expo Router Projects

```typescript
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

LoadSkiaWeb().then(async () => {
  const App = (await import("./src/App")).default;
  AppRegistry.registerComponent("Example", () => App);
});
```

### CDN Support

```typescript
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import { version } from "canvaskit-wasm/package.json";

LoadSkiaWeb({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${version}/bin/full/${file}`,
}).then(async () => {
  const App = (await import("./src/App")).default;
  AppRegistry.registerComponent("Example", () => App);
});
```

## Current Implementation Analysis

### What We're Currently Doing

```typescript
// app/index.tsx
const Iridescence = React.lazy(() => import("../components/iridescence"));

<React.Suspense fallback={<ActivityIndicator />}>
  <AsyncSkia />
  <Iridescence />
</React.Suspense>;
```

### The Problem

1. **Using `React.lazy()` directly** - This doesn't ensure Skia is loaded before the module is evaluated
2. **Module-level code executes immediately** - When `iridescence.tsx` is imported, the module-level `Skia.RuntimeEffect.Make()` runs before Skia is ready
3. **Bundle isolation** - Each lazy-loaded bundle gets its own copy of the Skia module with stale `CanvasKit` references

### Why It Fails

Even though `AsyncSkia` loads CanvasKit, `React.lazy()` imports the module **before** Skia is fully initialized in that bundle's context. The module-level code executes during import, causing the error.

## Recommended Solutions

### Solution 1: Use `<WithSkiaWeb />` (Recommended)

Replace `React.lazy()` with `<WithSkiaWeb />`:

```typescript
// app/index.tsx
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { AsyncSkia } from "../components/async-skia";
import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

export default function Page() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <WithSkiaWeb
          getComponent={() => import("../components/iridescence")}
          fallback={<ActivityIndicator />}
        />
      </View>
      <Text style={{ fontSize: 32, fontWeight: "bold", fontStyle: "italic" }}>
        Welcome to Expo
      </Text>
    </View>
  );
}
```

**Benefits:**

- ✅ Handles Skia loading automatically
- ✅ Ensures Skia is ready before component import
- ✅ Built-in loading state
- ✅ Works with code-splitting

**Note:** You may not need `AsyncSkia` anymore if using `<WithSkiaWeb />`.

### Solution 2: Deferred Component Registration

Create custom entry point for Expo Router:

1. Update `package.json`:

   ```json
   "main": "index"
   ```

2. Create `index.web.tsx`:

   ```typescript
   import "@expo/metro-runtime";
   import { App } from "expo-router/build/qualified-entry";
   import { renderRootComponent } from "expo-router/build/renderRootComponent";
   import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

   LoadSkiaWeb().then(async () => {
     renderRootComponent(App);
   });
   ```

3. Create `index.tsx`:

   ```typescript
   import { renderRootComponent } from "expo-router/build/renderRootComponent";
   import { App } from "expo-router/build/qualified-entry";

   renderRootComponent(App);
   ```

4. Simplify `app/index.tsx`:

   ```typescript
   import React from "react";
   import { Text, View } from "react-native";
   import Iridescence from "../components/iridescence"; // Direct import

   export default function Page() {
     return (
       <View
         style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
       >
         <View
           style={{
             position: "absolute",
             top: 0,
             left: 0,
             right: 0,
             bottom: 0,
           }}
         >
           <Iridescence />
         </View>
         <Text
           style={{ fontSize: 32, fontWeight: "bold", fontStyle: "italic" }}
         >
           Welcome to Expo
         </Text>
       </View>
     );
   }
   ```

**Benefits:**

- ✅ Skia loads before any app code runs
- ✅ No lazy loading needed
- ✅ All modules share the same Skia instance
- ✅ Module-level code works correctly

**Drawbacks:**

- ❌ Requires changing entry point
- ❌ Skia loads before app starts (slightly slower initial load)

### Solution 3: Move Shader Creation to Component (Not Recommended)

Move the shader creation from module-level to component-level:

```typescript
// components/iridescence.tsx
import { useMemo } from "react";

export default function Iridescence() {
  const source = useMemo(() => {
    return Skia.RuntimeEffect.Make(`...`);
  }, []);

  // ... rest of component
}
```

**Benefits:**

- ✅ Works with current lazy loading setup
- ✅ No entry point changes needed

**Drawbacks:**

- ❌ Requires changing component code (user preference)
- ❌ Shader recreated on every render (unless memoized)

## Comparison Table

| Approach              | Code Splitting | Entry Point Changes | Component Changes | Complexity |
| --------------------- | -------------- | ------------------- | ----------------- | ---------- |
| `<WithSkiaWeb />`     | ✅ Yes         | ❌ No               | ❌ No             | Low        |
| Deferred Registration | ❌ No          | ✅ Yes              | ❌ No             | Medium     |
| Move to Component     | ✅ Yes         | ❌ No               | ✅ Yes            | Low        |

## Recommended Next Steps

1. **Try Solution 1 first** - Use `<WithSkiaWeb />` to replace `React.lazy()`

   - Simplest change
   - Maintains code-splitting benefits
   - Follows official documentation

2. **If Solution 1 doesn't work** - Try Solution 2 (Deferred Registration)

   - More invasive but guaranteed to work
   - Skia loads before any app code

3. **Last resort** - Solution 3 (Move shader creation)
   - Only if user changes preference on component modifications

## References

- [React Native Skia Web Documentation](https://shopify.github.io/react-native-skia/docs/getting-started/web/)
- [Code-Splitting with WithSkiaWeb](https://shopify.github.io/react-native-skia/docs/getting-started/web/#using-code-splitting)
- [Deferred Component Registration](https://shopify.github.io/react-native-skia/docs/getting-started/web/#using-deferred-component-registration)
