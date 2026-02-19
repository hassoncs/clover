## Skia Error Boundary Implementation
- Added `SkiaErrorBoundary` class component to `AnimatedSplashScreen.tsx` to catch Skia initialization errors on web.
- Wrapped `WithCanvasKit` with the error boundary.
- Fallback renders `FallbackText` if Skia fails.
- Changed `import type React` to `import React` to support class component usage.
