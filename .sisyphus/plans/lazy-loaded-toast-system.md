# Lazy-Loaded Toast System Implementation Plan

**Status**: Complete
**Created**: 2026-02-12
**Completed**: 2026-02-13
**Library**: Sonner Native

---

## Overview

Implement a toast/notification system that:
- **Lazy loads** - not part of core bundle, loads on first use
- **Cross-platform** - Web, iOS, Android
- **Follows existing patterns** - NativeWind, CVA, custom UI primitives
- **Separate from social notifications** - ephemeral feedback, not persistent inbox

---

## Architecture

### Two-Phase Toast System

```
┌─────────────────────────────────────────────────────────────┐
│                    Core Bundle (Always Loaded)               │
├─────────────────────────────────────────────────────────────┤
│  app/lib/toast/index.ts     → Public API (toast.success())  │
│  app/lib/toast/types.ts     → Type definitions              │
│  app/lib/toast/store.ts     → Queue + readiness state       │
│  app/components/toast/      → ToastHost (lazy wrapper)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ First toast.show() triggers:
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Lazy Chunk (Loaded On-Demand)               │
├─────────────────────────────────────────────────────────────┤
│  app/lib/toast/runtime.ts   → import("sonner-native")       │
│  sonner-native + reanimated → Animation + toast UI          │
└─────────────────────────────────────────────────────────────┘
```

### Flow
1. App starts → Core bundle loads, ToastHost mounted (renders nothing yet)
2. Code calls `toast.success("Saved!")` → Facade queues the toast
3. Facade triggers lazy import of `sonner-native`
4. ToastHost detects request → mounts Sonner `Toaster`
5. Queued toasts flush in order
6. Subsequent toasts bypass queue (already loaded)

---

## File Structure

```
app/
├── lib/
│   └── toast/
│       ├── index.ts          # Public API export
│       ├── types.ts          # ToastOptions, ToastType, etc.
│       ├── store.ts          # Tiny event store (queue, ready, requested)
│       └── runtime.ts        # ONLY file importing sonner-native (dynamic)
├── components/
│   └── toast/
│       ├── ToastHost.tsx     # Lazy wrapper, mounts Toaster on request
│       └── ToastViewport.tsx # Sonner config + styling
packages/
└── ui/
    └── src/
        └── Toast/
            └── ToastCard.tsx # Optional: custom toast body (NativeWind + CVA)
```

---

## API Design

### Imperative (Primary)
```typescript
// Works anywhere - inside/outside React components
import { toast } from '@/lib/toast';

// Basic usage
toast.success('Game saved!');
toast.error('Network failed');
toast.warning('Low credits');
toast.info('New version available');

// With options
toast.success('Published!', { 
  duration: 5000,
  action: { label: 'View', onClick: () => navigate('/games/123') }
});

// Promise-based (perfect for async operations)
toast.promise(generateGame(), {
  loading: 'Creating game...',
  success: 'Game ready!',
  error: 'Generation failed'
});
```

### Hook (Optional)
```typescript
// For component ergonomics
const { success, error } = useToast();
success('Saved!');
```

---

## Implementation Tasks

### Phase 1: Foundation
- [x] **Task 1.1**: Add `sonner-native` to `app/package.json` (no direct import in root)
- [x] **Task 1.2**: Create `app/lib/toast/types.ts` with ToastOptions interface
- [x] **Task 1.3**: Create `app/lib/toast/store.ts` with queue + readiness state

### Phase 2: Lazy Runtime
- [x] **Task 2.1**: Create `app/lib/toast/runtime.ts` with `import("sonner-native")`
- [x] **Task 2.2**: Implement toast dispatch mapping (success/error/warning/info)
- [x] **Task 2.3**: Create `app/lib/toast/index.ts` public facade

### Phase 3: Host Component
- [x] **Task 3.1**: Create `app/components/toast/ToastHost.tsx` with React.lazy
- [x] **Task 3.2**: Create `app/components/toast/ToastViewport.tsx` for Sonner config
- [x] **Task 3.3**: Mount ToastHost in `app/app/_layout.tsx`

### Phase 4: Styling
- [x] **Task 4.1**: Add CVA variants for toast types (success/error/warning/info)
- [x] **Task 4.2**: Style with NativeWind using existing theme tokens
- [x] **Task 4.3**: Position: bottom-center (native) / top-right (web)

### Phase 5: Accessibility
- [x] **Task 5.1**: Add `AccessibilityInfo.announceForAccessibility` on show
- [x] **Task 5.2**: Use `aria-live="polite"` (success/info) / `assertive` (error)

### Phase 6: Verification
- [x] **Task 6.1**: Verify lazy loading (bundle analysis)
- [x] **Task 6.2**: Test on Web, iOS, Android
- [x] **Task 6.3**: Migrate 2-3 `Alert.alert` calls to toast

---

## Code Patterns

### Dynamic Import Pattern
Match existing pattern from `app/components/editor/StageContainer.tsx`:
```typescript
const Runtime = lazy(() => import('./runtime'));
```

### Styling Pattern
Match `packages/ui/src/Button.tsx`:
```typescript
import { cva } from 'class-variance-authority';

const toastVariants = cva('px-4 py-3 rounded-lg flex-row items-center gap-2', {
  variants: {
    type: {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-amber-500',
      info: 'bg-blue-500',
    }
  }
});
```

### Platform Split (if needed)
Match `packages/ui/src/FileTree/` pattern:
```
ToastViewport.tsx      → Shared logic
ToastViewport.web.tsx  → Web-specific position
ToastViewport.native.tsx → Native-specific position
```

---

## Bundle Considerations

### What to Avoid
- ❌ Top-level `import "sonner-native"` in core files
- ❌ Barrel re-exports that pull in runtime
- ❌ Type imports from runtime file in root components

### What to Ensure
- ✅ Core bundle references `app/lib/toast/index.ts` only
- ✅ Runtime file uses `import("sonner-native")` dynamically
- ✅ ToastHost uses `React.lazy` + `Suspense fallback={null}`

### Metro/Webpack Behavior
- **Metro**: Dynamic `import()` creates deferred module evaluation
- **Web**: Dynamic import creates separate async chunk
- **No extra config required** - this pattern works out of the box

### Optional Warm-up
Prefetch after first user interaction (reduces first-toast latency):
```typescript
// In _layout.tsx, after app is interactive
useEffect(() => {
  const timer = setTimeout(() => {
    import('@/lib/toast/runtime'); // Preload chunk
  }, 2000);
  return () => clearTimeout(timer);
}, []);
```

---

## Success Criteria

| Criteria | Verification |
|----------|--------------|
| Core bundle doesn't include sonner-native | Bundle analysis shows no sonner in initial chunk |
| First toast loads correctly | Trigger toast early in app flow, verify it appears |
| Queue-before-ready works | Call toast before host ready, verify it appears after |
| All platforms work | Test on web, iOS, Android |
| Accessibility works | Screen reader announces toast content |
| Types supported | success, error, warning, info all render correctly |

---

## Verification Commands

```bash
# Type check
pnpm -w build:types && cd app && tsc --noEmit

# Bundle analysis (web)
pnpm web
# Check network tab for sonner chunk load timing

# Platform smoke tests
pnpm web && # Trigger toast, verify position top-right
pnpm ios && # Trigger toast, verify position bottom-center
pnpm android && # Trigger toast, verify position bottom-center
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| First toast has latency | Optional warm-up prefetch after user interaction |
| Reanimated not in project | Already installed ✅ |
| GestureHandler missing | Already installed ✅ |
| SafeAreaContext missing | Already installed ✅ |

---

## Out of Scope

- Social notifications integration (separate system)
- Push notifications (uses expo-notifications separately)
- Form validation errors (inline, not toast)
- Critical alerts requiring confirmation (keep using `Alert.alert`)
