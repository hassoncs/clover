# Web-Only Renderer Bypasses and Fallbacks Inventory
## `packages/design-canvas` Renderer Divergence Audit

**Date:** 2026-03-10
**Scope:** Enumerate all temporary web-only renderer bypasses and fallbacks
**Classification:** overlay-only (accepted) vs scene-renderer fallback (debt to remove)

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| **Overlay-only (Accepted)** | 5 | Legitimate UI helpers, dev-only features |
| **Scene-Renderer Fallback (Debt)** | 3 | Temporary bypasses that should be unified |
| **Platform Extension Files** | 7 | Standard Metro platform resolution |
| **WithSkiaWeb Loading Gates** | 3 | Necessary WASM initialization pattern |

---

## 1. OVERLAY-ONLY (Accepted)

These are legitimate UI-level helpers or dev-only features that exist outside the core rendering pipeline.

### 1.1 `PenHtmlOverlay` — Dev-Only Freshness Visualization
**File:** `src/panels/PenCanvasPanelImpl.tsx` (lines 286-418)

```typescript
function PenHtmlOverlay({ layoutNodes, camera }: { ... }): React.ReactNode {
  if (Platform.OS !== "web" || !__DEV__) return null;
  // ... renders HTML overlay for newly created nodes (freshness effect)
}
```

**Classification:** ✅ **OVERLAY-ONLY (Accepted)**
- Dev-only feature (`__DEV__` check)
- Visual overlay on top of Skia canvas, not a renderer replacement
- Provides debugging visualization for node creation timing
- Does not duplicate scene rendering logic

---

### 1.2 `ResizableSplit` Web Implementation
**File:** `src/ResizableSplit.tsx` (lines 31-146)

```typescript
function ResizableSplitWeb(props: ResizableSplitProps) {
  const rp = require("react-resizable-panels") as typeof import("react-resizable-panels");
  // ... uses DOM library for resizable panels
}
```

**Classification:** ✅ **OVERLAY-ONLY (Accepted)**
- UI chrome/layout component, not scene rendering
- Native has simplified fallback (plain flex layout)
- Different UX is acceptable for platform conventions

---

### 1.3 `fontSources.web.ts` — Font Loading URI
**File:** `src/assets/fontSources.web.ts`

```typescript
export const FREDOKA_REGULAR = { uri: "/fonts/Fredoka-Regular.ttf" };
```

**Classification:** ✅ **OVERLAY-ONLY (Accepted)**
- Asset loading mechanism, not rendering
- Required because Metro asset numbers don't work in web/Skia WASM
- Standard platform abstraction pattern

---

### 1.4 `useDesignCamera.web.ts` — Mouse/Wheel Events
**File:** `src/camera/useDesignCamera.web.ts`

```typescript
export function useDesignCamera(): UseDesignCameraResult {
  // ... onWheel, onMouseDown, onMouseMove, onMouseUp handlers
}
```

**Classification:** ✅ **OVERLAY-ONLY (Accepted)**
- Input handling abstraction, not rendering
- Native uses pinch/pan gestures instead
- Proper platform-specific input pattern

---

### 1.5 `fontSources.ts` — Native Asset Modules
**File:** `src/assets/fontSources.ts`

```typescript
export const FREDOKA_REGULAR = require("../../assets/fonts/Fredoka-Regular.ttf") as number;
```

**Classification:** ✅ **OVERLAY-ONLY (Accepted)**
- Standard React Native asset loading
- Works with Skia's native font loading
- Not a bypass, just platform-appropriate loading

---

## 2. SCENE-RENDERER FALLBACK (Debt to Remove)

These are temporary bypasses where the web path skips or simplifies scene rendering that should eventually be unified.

### 2.1 `PenEffectsRenderer` — Web Returns Null
**File:** `src/pen/render/effects.tsx` (line 12)

```typescript
export function PenEffectsRenderer({ effects }: EffectsProps): React.ReactNode {
  if (!effects || effects.length === 0) return null;
  if (Platform.OS === "web") return null;  // ← BYPASS
  // ... Shadow, Blur, BackdropFilter rendering
}
```

**Classification:** 🚧 **SCENE-RENDERER FALLBACK (Debt)**
- **Issue:** Web completely skips effect rendering (shadows, blur, backdrop blur)
- **Impact:** Visual inconsistency between web and native
- **Root Cause:** Skia web WASM doesn't support all filter effects
- **Resolution Path:** Wait for react-native-skia web WASM to support filters, or implement CSS fallback

---

### 2.2 `BuildChrome` — Web Skips Animated Borders
**File:** `src/pen/render/BuildChrome.tsx` (lines 27, 69)

```typescript
export function BuildChrome({ layoutNode, children }: BuildChromeProps): React.ReactNode {
  const isWeb = Platform.OS === "web";
  // ...
  if (isWeb || !isFresh) {
    return <>{children}</>;  // ← BYPASS: No animated border on web
  }
  // ... DashPathEffect, animated scale/opacity/border
}
```

**Classification:** 🚧 **SCENE-RENDERER FALLBACK (Debt)**
- **Issue:** Web misses fresh-node animation (scale, opacity, dashed border)
- **Impact:** Web users don't see "new node" visual feedback
- **Root Cause:** `DashPathEffect` with animated phase may not work reliably in Skia web
- **Resolution Path:** Test and enable if Skia web supports it, or implement CSS-based fallback

---

### 2.3 `PenCanvasFixture` — WithSkiaWeb Loading Gate
**File:** `src/pen/render/PenCanvasFixture.tsx` (lines 8-46)

```typescript
export const PenCanvasFixture = (props: PenCanvasFixtureProps) => {
  const fallback = useMemo(() => (
    <div style={{ ... }}>Loading canvas…</div>  // ← HTML fallback during load
  ), [...]);

  if (Platform.OS === "web") {
    return (
      <WithSkiaWeb
        getComponent={() => import("./PenCanvasFixtureInner")}
        fallback={fallback}
        // ...
      />
    );
  }
  // Native: direct import
  const NativeInner = require("./PenCanvasFixtureInner").PenCanvasFixtureInner;
  return <NativeInner {...props} />;
};
```

**Classification:** ⚠️ **PARTIALLY ACCEPTED / PARTIALLY DEBT**
- **Accepted part:** `WithSkiaWeb` gate is necessary for WASM initialization
- **Debt part:** Different loading UX between platforms
- **Note:** This is a necessary architectural pattern, not a renderer bypass per se

---

## 3. PLATFORM EXTENSION FILES (Standard Pattern)

These are standard Metro platform resolution files, not renderer bypasses.

| File | Purpose | Classification |
|------|---------|----------------|
| `useDesignCamera.web.ts` | Mouse/wheel camera controls | ✅ Standard Pattern |
| `useDesignCamera.native.ts` | Pinch/pan gesture camera controls | ✅ Standard Pattern |
| `useDesignCamera.ts` | Base interface/types | ✅ Standard Pattern |
| `PenCanvasPanel.web.tsx` | WithSkiaWeb loading gate | ✅ Standard Pattern |
| `PenCanvasPanel.native.tsx` | GestureHandler setup | ✅ Standard Pattern |
| `DesignCanvasPanel.web.tsx` | WithSkiaWeb loading gate | ✅ Standard Pattern |
| `DesignCanvasPanel.native.tsx` | GestureHandler setup | ✅ Standard Pattern |

---

## 4. WITHSKIAWEB LOADING GATES

These are necessary patterns for Skia WASM initialization on web. They are not renderer bypasses but architectural requirements.

### 4.1 `PenCanvasPanel.web.tsx`
```typescript
const { WithSkiaWeb } = require("@shopify/react-native-skia/lib/module/web");
// Lazy-loads PenCanvasPanelInner after canvaskit.wasm loads
```

### 4.2 `DesignCanvasPanel.web.tsx`
```typescript
const { WithSkiaWeb } = require("@shopify/react-native-skia/lib/module/web");
// Lazy-loads DesignCanvasPanelInner after canvaskit.wasm loads
```

### 4.3 `PenCanvasPanelInner.tsx` / `DesignCanvasPanelInner.tsx`
These are re-export shims to bypass Metro platform resolution:
```typescript
export { PenCanvasPanel as default } from "./PenCanvasPanelImpl";
```

**Classification:** ✅ **NECESSARY ARCHITECTURE**
- Required for Skia WASM to load before any Skia API calls
- Prevents "Cannot use 'in' operator" crashes
- Standard pattern for react-native-skia web

---

## 5. RECOMMENDATIONS

### Immediate Actions (No Code Changes Needed)
1. ✅ Keep all **Overlay-Only** items as-is
2. ✅ Keep all **Platform Extension** files as-is
3. ✅ Keep all **WithSkiaWeb** loading gates as-is

### Technical Debt to Track
| Item | Priority | Issue Link |
|------|----------|------------|
| `PenEffectsRenderer` web null return | Medium | Track: Unify shadow/blur effects across platforms |
| `BuildChrome` web bypass | Low | Track: Enable fresh-node animations on web |

### Future Unification Path
1. **Effects System:** Monitor react-native-skia web WASM for filter support
2. **BuildChrome:** Test `DashPathEffect` on web; if supported, remove bypass
3. **General Strategy:** Prefer feature detection over platform checks where possible

---

## Appendix: File Inventory

### Core Panel Files
- `src/panels/PenCanvasPanelImpl.tsx` — Main implementation (contains `PenHtmlOverlay`)
- `src/panels/PenCanvasPanel.web.tsx` — WithSkiaWeb gate
- `src/panels/PenCanvasPanel.native.tsx` — Gesture handler setup
- `src/panels/PenCanvasPanelInner.tsx` — Re-export shim
- `src/panels/DesignCanvasPanelImpl.tsx` — Main implementation
- `src/panels/DesignCanvasPanel.web.tsx` — WithSkiaWeb gate
- `src/panels/DesignCanvasPanel.native.tsx` — Gesture handler setup
- `src/panels/DesignCanvasPanelInner.tsx` — Re-export shim

### Rendering Files
- `src/pen/render/BuildChrome.tsx` — Fresh node chrome (web bypass)
- `src/pen/render/effects.tsx` — Effect rendering (web null return)
- `src/pen/render/PenCanvasFixture.tsx` — Fixture loader (WithSkiaWeb)
- `src/core/DesignCanvasRenderer.tsx` — Core renderer (no bypasses)

### Platform Abstractions
- `src/camera/useDesignCamera.web.ts` — Mouse controls
- `src/camera/useDesignCamera.native.ts` — Touch gestures
- `src/assets/fontSources.web.ts` — URI fonts
- `src/assets/fontSources.ts` — Metro asset fonts
- `src/ResizableSplit.tsx` — Resizable panels (web uses DOM library)

---

*Generated: 2026-03-10*
*Scope: packages/design-canvas renderer divergence audit*
