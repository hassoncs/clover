# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a working template for deploying React Native Skia with CanvasKit WASM to Cloudflare Pages. It demonstrates proper code-splitting and WASM loading for Expo Router web applications.

**Key Stack:**
- Expo Router (web-only deployment)
- React Native Skia with CanvasKit WASM
- NativeWind (Tailwind for React Native)
- Cloudflare Pages deployment

## Development Commands

```bash
# Start development server (web)
pnpm run web

# Start native development (iOS/Android - requires native setup)
pnpm run ios
pnpm run android

# Build for web deployment
npx expo export -p web

# Deploy to Cloudflare Pages
pnpm run deploy

# Clean commands
pnpm run clean:js      # Clean JS/web build artifacts
pnpm run clean:ios     # Clean iOS build artifacts
pnpm run clean:android # Clean Android build artifacts
pnpm run clean         # Clean all artifacts

# Native iOS setup
pnpm run pods          # Install CocoaPods dependencies
pnpm run verify:ios    # Full iOS verification (doctor + pods + build)
```

## Critical Architecture Patterns

### Skia Component Loading (CRITICAL)

React Native Skia components that use `Skia.RuntimeEffect.Make()` at module level **must** be lazy-loaded using `<WithSkiaWeb />` to ensure CanvasKit WASM is initialized before the component module executes.

**Correct pattern in `app/` pages:**

```tsx
import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

export default function Page() {
  return (
    <WithSkiaWeb
      getComponent={() => import("../components/skia-component")}
      fallback={<ActivityIndicator />}
    />
  );
}
```

**Component file location requirements:**
- Skia components MUST be outside `app/` directory (e.g., `components/`)
- This is required for Expo Router's code-splitting to work with `WithSkiaWeb`

**Why this works:**
1. `<WithSkiaWeb />` loads CanvasKit WASM first
2. Waits for Skia initialization
3. Only then imports the component via `getComponent()`
4. Ensures module-level `Skia.RuntimeEffect.Make()` has access to initialized Skia

**Do NOT:**
- Use `React.lazy()` directly for Skia components
- Place Skia components inside `app/` directory
- Import Skia components directly without `<WithSkiaWeb />`

### Deployment Configuration

**WASM file deployment:**
- `postinstall` script automatically copies `canvaskit.wasm` to `public/`
- Build output: `dist/canvaskit.wasm` served at `/canvaskit.wasm`
- `public/_headers` sets correct MIME type: `Content-Type: application/wasm`

**Cloudflare Pages:**
- Configuration in `wrangler.toml`
- Build output directory: `dist/`
- Deploy command: `pnpm run deploy`

### NativeWind Integration

This project uses NativeWind v4 for Tailwind-style utilities in React Native:

**Configuration files:**
- `tailwind.config.js` - Uses NativeWind preset
- `babel.config.js` - Includes `nativewind/babel` preset
- `global.css` - Imported in `app/_layout.tsx`
- `nativewind-env.d.ts` - TypeScript declarations

**Usage pattern:**
```tsx
// Use className instead of style
<View className="flex-1 items-center justify-center">
  <Text className="text-3xl font-bold italic">Hello</Text>
</View>
```

### Babel Configuration Note

**Important:** Do NOT manually add `react-native-reanimated/plugin` to `babel.config.js`. It's auto-configured by `babel-preset-expo` and manual addition causes conflicts on iOS.

## Project Structure

```
app/                      # Expo Router pages
├── _layout.tsx          # Root layout (imports global.css)
└── index.tsx            # Home page (uses WithSkiaWeb)

components/              # Reusable components (Skia components MUST be here)
├── iridescence.tsx      # Example Skia shader component
└── html-example.tsx     # HTML rendering example

docs/                    # Comprehensive documentation
├── WORKING_SOLUTION.md  # Primary reference for Skia/WASM loading
└── ...

public/
├── _headers             # Cloudflare WASM MIME type config
└── canvaskit.wasm       # Copied by postinstall script

wrangler.toml            # Cloudflare Pages configuration
```

## Common Patterns

### Adding a new Skia component

1. Create component in `components/` (NOT in `app/`)
2. Use `Skia.RuntimeEffect.Make()` at module level if needed
3. Import in page using `<WithSkiaWeb getComponent={() => import("../components/your-component")} />`

### Adding a new page

1. Create file in `app/` directory
2. If page uses Skia, wrap with `<WithSkiaWeb />`
3. Apply NativeWind classes via `className` prop

### Testing deployment

1. Build: `npx expo export -p web`
2. Check `dist/canvaskit.wasm` exists
3. Check `dist/_headers` is present
4. Deploy: `pnpm run deploy`
5. Verify at production URL

## Important References

- **Primary documentation:** `docs/WORKING_SOLUTION.md`
- **React Native Skia Web docs:** https://shopify.github.io/react-native-skia/docs/getting-started/web/
- **NativeWind docs:** https://www.nativewind.dev/
