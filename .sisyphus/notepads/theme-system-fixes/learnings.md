## Tailwind Class Prefix Fix (2026-02-11)

### Problem
Components used `theme-*` prefixed classes (e.g., `text-theme-text-primary`, `bg-theme-surface`) but the Tailwind preset defined colors WITHOUT the prefix, causing all semantic colors to not resolve.

### Root Cause
The preset had:
```js
colors: {
  text: tokens.semantic.colors.text,  // generates text-text-primary
  background: tokens.semantic.colors.background,  // generates bg-background
}
```

But components expected `text-theme-text-primary` and `bg-theme-background`.

### Solution
Added a `theme` namespace in the colors config:
```js
colors: {
  // ... existing colors ...
  theme: {
    background: '#050608',
    surface: { DEFAULT: '#111827', elevated: '#1F2937' },
    text: { DEFAULT: '#FFFFFF', primary: '#FFFFFF', secondary: '#9CA3AF', ... },
    border: '#374151',
    primary: '#6366F1',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    danger: '#EF4444',
  }
}
```

This generates the correct `theme-*` prefixed classes.

### Dark Mode Colors
The app uses a dark theme by default (background: `#050608` from `_layout.tsx`), but the tokens define light mode colors. The `theme` namespace uses hardcoded dark-mode appropriate colors:
- Background: `#050608` (matches app background)
- Surface: `#111827` (gray-900), elevated: `#1F2937` (gray-800)
- Text primary: `#FFFFFF`, secondary: `#9CA3AF` (gray-400), tertiary/muted: `#6B7280` (gray-500)
- Border: `#374151` (gray-700)
- Semantic colors: indigo-500, emerald-500, amber-500, red-500

### Files Modified
- `packages/theme/src/tailwind.ts` - Added `theme` namespace with dark mode colors

### Verification
- TypeScript: `pnpm tsc --noEmit` passes
- Classes now resolve: `text-theme-text`, `bg-theme-surface`, `border-theme-border`, etc.
