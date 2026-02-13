# Lazy Loading Principles

**Status**: Active Principle
**Created**: 2026-02-12
**Purpose**: Establish lazy loading as the default pattern for non-essential features

---

## Core Principle

> **Load only what's needed, when it's needed.**

Every feature that isn't required for initial app render should be architected for lazy loading from the start. Breaking apart a monolithic bundle later is painful; building lazy from the beginning adds minimal complexity.

### Why This Matters

1. **Startup Performance** - Users don't wait for features they won't use
2. **Bundle Growth** - Apps naturally grow; lazy loading keeps the core small
3. **User Experience** - Faster time-to-interactive on all platforms
4. **Developer Experience** - Clear boundaries between core and feature code

---

## Decision Framework

### Should It Be Lazy? → YES if:

| Condition | Example |
|-----------|---------|
| Not needed for first paint | Toast system, modals |
| User-triggered navigation | Editor, settings screens |
| Heavy dependencies | CodeMirror, React Flow, Dockview |
| Platform-specific | Web-only features (Dockview) |
| Rarely used | Admin tools, debug panels |

### Keep in Core Bundle if:

| Condition | Example |
|-----------|---------|
| Needed for splash screen | Auth state, theme provider |
| Critical for app shell | Navigation, bottom tabs |
| Very small (<5KB) | Utility functions |
| Used on every screen | Error boundary |

---

## Existing Patterns in This Codebase

### 1. Reggie Registry (Auto-Discovery)
**File**: `app/lib/registry/generated/examples.ts`

```typescript
// Auto-generated lazy loading for examples
export const EXAMPLES: Record<ExampleId, LazyExampleModule> = {
  pinball: createLazyModule(() => import("../../examples/pinball")),
  flappy: createLazyModule(() => import("../../examples/flappy")),
};
```

**Use for**: Self-contained features with metadata

### 2. Dynamic Godot Runtime
**File**: `app/components/editor/StageContainer.tsx`

```typescript
// Lazy load Godot runtime only when game is being played
const loadGameRuntimeModule = () => import("./GameRuntime");
```

**Use for**: Heavy platform-specific runtimes

### 3. Platform-Specific Splits
**Pattern**: `.web.tsx` / `.native.tsx` files

```
DockviewLayout.web.tsx    → Web-only, omitted from native bundle
DockviewLayout.native.tsx → Native-only, omitted from web bundle
```

**Use for**: Features that exist on only one platform

---

## Implementation Patterns

### Pattern A: React.lazy for Components

**Best for**: UI components loaded on user action

```typescript
// Before (eager)
import { CodeEditor } from "./CodeEditor";

// After (lazy)
const CodeEditor = React.lazy(() => import("./CodeEditor"));

// Usage
<Suspense fallback={<LoadingSkeleton />}>
  <CodeEditor file={file} />
</Suspense>
```

**Complexity**: Low
**Bundle Savings**: Full component + dependencies

### Pattern B: Dynamic Import for Libraries

**Best for**: Libraries called imperatively

```typescript
// Before (eager)
import { toast } from "sonner-native";

// After (lazy)
let toastImpl: typeof import("sonner-native").toast | null = null;

async function showToast(message: string) {
  if (!toastImpl) {
    const module = await import("sonner-native");
    toastImpl = module.toast;
  }
  toastImpl(message);
}
```

**Complexity**: Medium (need to handle loading state)
**Bundle Savings**: Full library

### Pattern C: Facade + Runtime Split

**Best for**: Systems with imperative API (toast, analytics, etc.)

```typescript
// Core bundle: app/lib/toast/index.ts (tiny)
import { queue } from "./store";

export const toast = {
  success: (msg) => queue({ type: "success", message: msg }),
  error: (msg) => queue({ type: "error", message: msg }),
};

// Lazy chunk: app/lib/toast/runtime.ts (heavy)
import { toast as sonnerToast } from "sonner-native";
// Process queue and set up real implementation
```

**Complexity**: Medium (~60-80 lines overhead)
**Bundle Savings**: Full library
**Advantage**: Same API, deferred loading

### Pattern D: Route-Level Code Splitting

**Best for**: Entire screens/features

```typescript
// Expo Router does this automatically via file-based routing
// Each app/*.tsx file is a potential code split point

// For heavy screens, ensure they don't import heavy deps at top level
// app/app/editor/[id].tsx
const EditorScreen = () => {
  // Heavy deps should be in lazy-loaded child components
};
```

**Complexity**: Low (with proper component structure)
**Bundle Savings**: Entire feature

---

## Codebase Audit: Lazy Loading Candidates

### Priority 1: High Impact (1MB+ savings)

| Feature | Path | Current State | Lazy Pattern |
|---------|------|---------------|--------------|
| **CodeMirror Editor** | `app/components/editor/FileViewer.tsx` | Static import | React.lazy |
| **Editor Panel Registry** | `app/components/editor/panels/registry.ts` | All panels static | Dynamic imports |
| **Godot Runtime** | `app/components/editor/StageContainer.tsx` | Already lazy ✅ | — |

**Implementation**:
```typescript
// panels/registry.ts - Convert to lazy
export const PANEL_REGISTRY: PanelDefinition[] = [
  {
    id: "explorer",
    component: React.lazy(() => import("./ExplorerPanel").then(m => ({ default: m.ExplorerPanel }))),
  },
  // ... other panels
];
```

### Priority 2: Medium Impact (200-500KB savings)

| Feature | Path | Current State | Lazy Pattern |
|---------|------|---------------|--------------|
| **React Flow Graph Editor** | `app/components/editor/graph/GraphEditor.tsx` | Static re-export | React.lazy |
| **Dockview Layout** | `app/components/editor/DockviewLayout.web.tsx` | Static imports | Dynamic imports |
| **Economy Modals** | `app/components/economy/` | Loaded with parent | React.lazy |

**Implementation**:
```typescript
// In parent component
const BuyGemsModal = React.lazy(() => import("./BuyGemsModal"));

// Only render when needed
{showBuyGems && (
  <Suspense fallback={null}>
    <BuyGemsModal onClose={closeModal} />
  </Suspense>
)}
```

### Priority 3: Low Impact but Good Hygiene

| Feature | Path | Lazy Pattern |
|---------|------|--------------|
| **Toast System** | New: `app/lib/toast/` | Facade + Runtime |
| **Social Modals** | `app/components/social/` | React.lazy |
| **Settings Screens** | `app/app/settings/` | Already route-split |
| **Camera Features** | `react-native-vision-camera` usage | Lazy import |

---

## Bundle Size Estimates

| Feature | Est. Size | Platform |
|---------|-----------|----------|
| CodeMirror (all packages) | ~1MB | All |
| @xyflow/react | ~200KB | All |
| dockview | ~150KB | Web only |
| sonner-native | ~295KB | All |
| react-native-vision-camera | ~500KB | Native only |

**Total potential savings**: ~2MB+ on initial bundle

---

## Implementation Checklist

When adding a new feature, ask:

- [ ] Is this needed for initial render?
- [ ] Does it have heavy dependencies (>50KB)?
- [ ] Is it user-triggered (button click, navigation)?
- [ ] Can it be wrapped in a Suspense boundary?

If 2+ answers are "yes", implement lazy loading.

---

## Anti-Patterns to Avoid

### ❌ Eager Import in Core Files
```typescript
// DON'T: Import heavy lib at top of _layout.tsx
import { toast } from "sonner-native";
```

### ❌ Barrel Re-exports That Pull Everything
```typescript
// DON'T: This pulls all panels into one chunk
export * from "./panels";
```

### ❌ Static Registries
```typescript
// DON'T: All components load immediately
const REGISTRY = {
  editor: EditorPanel,  // Heavy!
  graph: GraphPanel,    // Heavy!
};
```

### ✅ Lazy Registries
```typescript
// DO: Components load on demand
const REGISTRY = {
  editor: () => import("./EditorPanel"),
  graph: () => import("./GraphPanel"),
};
```

---

## Verification Commands

```bash
# Web bundle analysis
pnpm web
# Check Network tab for chunk loading

# iOS bundle size
pnpm ios
# Check Xcode build report

# Android bundle size  
pnpm android
# Check APK size breakdown
```

---

## Future Considerations

### Preloading Strategies

For features likely to be used soon:

```typescript
// Prefetch after user interaction
useEffect(() => {
  // After first tap, preload editor
  const timer = setTimeout(() => {
    import("./editor/EditorPanel");
  }, 2000);
  return () => clearTimeout(timer);
}, []);
```

### Bundle Budgets

Consider setting bundle budgets in CI:

```json
// package.json
"bundlewatch": {
  "files": [
    { "path": "dist/*.js", "maxSize": "500KB" }
  ]
}
```

---

## Related Documentation

- [Toast Implementation Plan](./lazy-loaded-toast-system.md)
- [Registry System](../docs/shared/reference/registry-system.md)
- [Editor Architecture](../docs/game-maker/architecture/)
