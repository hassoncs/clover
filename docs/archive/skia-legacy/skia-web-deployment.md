# Working CanvasKit WASM Deployment Solution

## Solution: Using `<WithSkiaWeb />` Component

This project successfully deploys React Native Skia with CanvasKit WASM to Cloudflare Pages using the official `<WithSkiaWeb />` component for code-splitting.

## Architecture

### Component Structure

```
app/index.tsx
└── WithSkiaWeb (loads CanvasKit, then lazy-loads Iridescence)
    └── Iridescence (uses Skia.RuntimeEffect.Make at module level)
```

### Key Implementation

**`app/index.tsx`:**

```tsx
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

export default function Page() {
  return (
    <View className="flex-1 items-center justify-center">
      <View className="absolute inset-0">
        <WithSkiaWeb
          getComponent={() => import("../components/iridescence")}
          fallback={<ActivityIndicator />}
        />
      </View>
      <Text className="text-3xl font-bold italic">Welcome to Expo</Text>
    </View>
  );
}
```

## Why This Works

1. **`<WithSkiaWeb />` handles the loading sequence**:

   - First loads CanvasKit WASM
   - Waits for Skia to be fully initialized
   - Only then imports the component via `getComponent()`
   - Ensures module-level code runs after Skia is ready

2. **No custom loading logic needed**:

   - No need for `AsyncSkia` component
   - No need for custom Suspense wrappers
   - Uses the official React Native Skia approach

3. **Code-splitting still works**:
   - Component is lazy-loaded (separate bundle)
   - But Skia is guaranteed to be ready before import
   - Module-level `Skia.RuntimeEffect.Make()` works correctly

## Deployment Configuration

### Cloudflare Pages Setup

**`wrangler.toml`:**

```toml
name = "skia-canvas-wasm-deploy-test"
compatibility_date = "2025-12-01"

pages_build_output_dir = "dist"
```

**`public/_headers`:**

```
/canvaskit.wasm
  Content-Type: application/wasm
```

**`package.json` scripts:**

```json
{
  "postinstall": "mkdir -p public && cp $(node -p \"require.resolve('canvaskit-wasm/bin/full/canvaskit.wasm', { paths: [require.resolve('@shopify/react-native-skia')] })\") public/canvaskit.wasm",
  "deploy": "npx expo export -p web && npx wrangler pages deploy dist/ --project-name=skia-canvas-wasm-deploy-test"
}
```

### Build Output

- `dist/canvaskit.wasm` - WASM file served directly
- `dist/_headers` - MIME type configuration
- `dist/_expo/static/js/web/entry-*.js` - Main bundle
- `dist/_expo/static/js/web/iridescence-*.js` - Lazy-loaded component bundle

## Key Requirements

1. **Component must be outside `app/` directory**:

   - `components/iridescence.tsx` (correct)
   - `app/components/iridescence.tsx` (would fail)

2. **WASM file must be in `public/`**:

   - Copied via `postinstall` script
   - Served at `/canvaskit.wasm` in production

3. **Use `<WithSkiaWeb />` for lazy-loaded Skia components**:
   - Don't use `React.lazy()` directly
   - `<WithSkiaWeb />` ensures proper loading sequence

## References

- [React Native Skia Web Documentation](https://shopify.github.io/react-native-skia/docs/getting-started/web/)
- [Using Code-Splitting with WithSkiaWeb](https://shopify.github.io/react-native-skia/docs/getting-started/web/#using-code-splitting)
- [NativeWind Documentation](https://www.nativewind.dev/)
