---
name: skia-web-startup-boundary
description: Use when Skia/CanvasKit web startup fails, Expo Router web routes crash on load, or debugging import-boundary issues with @shopify/react-native-skia in web apps.
---

# Skia Web Startup Boundary

## Overview

Expo Router evaluates all route files in `app/` at startup. Any route that directly or transitively imports `@shopify/react-native-skia` can poison web startup before `WithSkiaWeb` finishes initializing CanvasKit. The fix is keeping route files Skia-free and lazy-loading Skia consumers at route boundaries.

## When to Use

- A Skia-backed web app shows blank screen or crashes on initial load
- Console errors about CanvasKit or Skia initialization
- Routes that worked before suddenly fail after adding imports
- "Module not found" or "Cannot read property" errors during web startup
- Ghost Browser reports page crashes during debugging

## The Hazard

```
app/
  index.tsx           → imports @slopcade/design-canvas
  some-route.tsx      → imports component that imports Skia

Metro bundles ALL routes at startup. If any route reaches Skia before WithSkiaWeb wraps the render tree, CanvasKit fails to initialize and the app crashes.
```

**Package barrels are dangerous**: `@slopcade/design-canvas` re-exports panels that transitively import Skia. Importing the barrel from a route poisons startup even if you only use non-Skia exports.

## Safe Pattern

```
apps/pencil/
  app/
    index.tsx                        # Lazy import ONLY
    _layout.web.tsx                  # No WithSkiaWeb here
    webgl-probe.tsx                  # Non-Skia diagnostic route
  components/
    PencilCanvasPanel.web.tsx        # WithSkiaWeb boundary HERE
```

**Route file (Skia-free):**
```tsx
// app/index.tsx
const PencilCanvasPanel = React.lazy(() => import("../components/PencilCanvasPanel.web"));

export default function Index() {
  return (
    <React.Suspense fallback={<Loading />}>
      <PencilCanvasPanel />
    </React.Suspense>
  );
}
```

**Panel (WithSkiaWeb boundary):**
```tsx
// components/PencilCanvasPanel.web.tsx
const { WithSkiaWeb } = require("@shopify/react-native-skia/lib/module/web");

export default function PencilCanvasPanel() {
  return (
    <WithSkiaWeb getComponent={() => import("./PencilCanvasPanelInner")}>
      <Loading />
    </WithSkiaWeb>
  );
}
```

## Diagnostic Probe Route

A non-Skia route proves whether the browser/WebGL environment is healthy:

```tsx
// app/webgl-probe.tsx
// No Skia imports - just WebGL capability check
export default function WebGLProbe() {
  // Test WebGL, return success/error
}
```

If `webgl-probe` loads but main routes crash, the issue is Skia import poisoning, not browser environment.

## Browser Debugging Workflow

1. **Ghost Browser first** — default for browser automation
2. **Playwright as fallback** — when Ghost crashes or session state becomes misleading
3. **Probe route** — `http://localhost:8089/webgl-probe` to verify environment

Ghost may report crashes when the app is actually loading. Playwright is more reliable for verifying page load success.

## Regression Window Debugging

When a feature that previously worked suddenly breaks startup:

```bash
# Find when it broke
git log --since="2 weeks ago" --oneline -- apps/pencil/

# Diff the likely commit
git diff <commit>^ <commit> -- apps/pencil/

# Check for new imports in app/ routes
git diff <commit>^ <commit> -- apps/pencil/app/
```

Common culprits:
- New direct Skia imports in route files
- New barrel imports that transitively reach Skia
- Moving WithSkiaWeb from panel to layout level

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `import { SkiaComponent } from "@slopcade/design-canvas"` in route | Lazy import the panel instead |
| `WithSkiaWeb` in `_layout.web.tsx` wrapping whole app | Move to smallest panel boundary |
| Direct `@shopify/react-native-skia` import in route | Move to lazy-loaded component |
| Debugging Ghost crashes without Playwright verification | Run Playwright to confirm actual state |

## Key Files

| File | Purpose |
|------|---------|
| `apps/pencil/app/index.tsx` | Route entry — must lazy import |
| `apps/pencil/components/PencilCanvasPanel.web.tsx` | WithSkiaWeb boundary |
| `apps/pencil/app/webgl-probe.tsx` | Non-Skia diagnostic route |
| `packages/design-canvas/src/index.ts` | Barrel exports — avoid from routes |

## CanvasKit Loading

CanvasKit is a 2-3MB WASM bundle. `WithSkiaWeb` handles async loading. If Skia is imported before the wrapper renders, the CanvasKit context is undefined and rendering fails with cryptic errors.

The lazy import at the route level ensures React doesn't evaluate the Skia dependency graph until after the route component mounts and WithSkiaWeb is in the tree.
