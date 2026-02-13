# NativeWind Theming

## Overview
CSS-variable-based semantic theming for NativeWind 4.x in the Slopcade Expo monorepo. Defines light/dark mode colors that resolve correctly on both web and native platforms.

## Architecture

### How It Works
1. **CSS Variables** defined in `app/global.css` under `:root` (light) and `.dark` (dark) — space-separated RGB values
2. **Tailwind Preset** at `packages/theme/src/tailwind.ts` maps `theme.*` colors via `themeColor()` → `rgb(var(...) / <alpha-value>)`
3. **NativeWind** generates CSS from Tailwind config via a Metro plugin (`withNativeWind`) that forks a Tailwind CLI child process
4. On **web**: `.dark` class on root element toggles CSS variables; on **native**: NativeWind uses internal Appearance API
5. The generated CSS lives in a virtual module at `react-native-css-interop/.cache/web.css` (web) or `native.js` (native)

### File Locations
| File | Purpose |
|------|---------|
| `app/global.css` | CSS variable definitions (`:root` and `.dark` blocks) |
| `packages/theme/src/tailwind.ts` | Tailwind preset — `themeColor()` helper maps to CSS vars |
| `packages/theme/src/tokens.ts` | Raw design token hex values (used by non-theme colors) |
| `app/tailwind.config.js` | Loads `nativewind/preset` + `tailwindPreset`, defines content paths |
| `app/metro.config.js` | `withNativeWind(config, { input: "./global.css" })` |
| `app/babel.config.js` | `jsxImportSource: 'nativewind'` + `nativewind/babel` preset |
| `app/app/_layout.tsx` | Imports `../global.css` and sets dark mode via `useColorScheme` |

### CSS Generation Pipeline
```
app/tailwind.config.js
  → loads packages/theme/src/tailwind.ts (preset)
  → NativeWind Metro plugin forks tailwindcss CLI child process
  → child scans content paths for class usage
  → generates CSS with resolved utility classes
  → web: injected as <style data-expo-css-hmr="...css_interop..."> tag
  → native: converted to JS style objects via cssToReactNativeRuntime
```

## Available Theme Classes

| Class Pattern | Example | CSS Variable |
|---------------|---------|--------------|
| `bg-theme-background` | Page background | `--color-theme-background` |
| `bg-theme-surface` | Card/section bg | `--color-theme-surface` |
| `bg-theme-surface-elevated` | Elevated cards, inputs | `--color-theme-surface-elevated` |
| `text-theme-text` | Primary text | `--color-theme-text` |
| `text-theme-text-secondary` | Secondary/muted text | `--color-theme-text-secondary` |
| `text-theme-text-tertiary` | Tertiary/hint text | `--color-theme-text-tertiary` |
| `text-theme-text-inverse` | Text on colored bg | `--color-theme-text-inverse` |
| `border-theme-border` | Borders, dividers | `--color-theme-border` |
| `bg-theme-primary` | Primary action | `--color-theme-primary` |
| `bg-theme-success` | Success state | `--color-theme-success` |
| `bg-theme-warning` | Warning state | `--color-theme-warning` |
| `bg-theme-error` | Error state | `--color-theme-error` |

Opacity modifiers work: `bg-theme-success/20`, `text-theme-text/80`.

## CSS Variable Format

Variables MUST use space-separated RGB (not hex, not comma-separated). Required for `<alpha-value>` interpolation:

```css
--color-theme-text: 255 255 255;       /* CORRECT */
--color-theme-text: #ffffff;            /* WRONG */
--color-theme-text: 255, 255, 255;     /* WRONG */
```

## Adding New Theme Colors

1. Add CSS variable to `app/global.css` under BOTH `:root` and `.dark` (space-separated RGB)
2. Add mapping in `packages/theme/src/tailwind.ts` using `themeColor("variable-name")`
3. Clear caches and restart: `rm -rf app/.metro-cache app/.expo && devmux stop web && devmux ensure web`

## Dark Mode Initialization

Set in `app/app/_layout.tsx` via NativeWind's `useColorScheme` hook:

```tsx
import { useColorScheme } from "nativewind";
function RootLayout() {
  const { setColorScheme } = useColorScheme();
  useEffect(() => { setColorScheme("dark"); }, [setColorScheme]);
}
```

Do NOT call `colorScheme.set()` at module scope — crashes during SSR.

## Non-Theme Colors (separate system)

NOT backed by CSS variables (light-mode only):
- `bg-background`, `bg-surface`, `text-text-primary`, `text-text-secondary` — hardcoded from tokens.ts
- `bg-primary`, `text-primary` — from primary color scale
- Editor colors (`bg-ed-bg`, `text-ed-text`) — backed by separate `--ed-*` CSS variables

Use `theme-*` classes for user-facing UI. Non-theme colors for contexts that don't need dark mode.

---

## Troubleshooting: NativeWind Styles Broken

### Step 1: Verify CSS Is Being Generated

```bash
curl -s http://localhost:8085/ | python3 -c "
import sys,re; html=sys.stdin.read()
m = re.search(r'css_interop.*?>(.*?)</style>', html, re.DOTALL)
if not m: print('NO CSS INTEROP STYLE TAG FOUND')
else:
  css = m.group(1)
  for c in ['bg-theme-background','text-theme-text','text-theme-text-secondary','border-theme-border']:
    print(f'.{c:35s} {\"FOUND\" if f\".{c}\" in css else \"MISSING\"}')"
```

- **NO CSS INTEROP STYLE TAG**: Metro plugin not running. Check `app/metro.config.js` has `withNativeWind`.
- Classes **MISSING**: Tailwind config issue → Step 3.
- Classes **FOUND** but look wrong: CSS variable issue → Step 5.

### Step 2: Nuclear Cache Clear

NativeWind caches aggressively. When in doubt, nuke everything:

```bash
rm -rf app/.metro-cache app/.expo node_modules/.cache
devmux stop web && devmux stop metro
devmux ensure web
```

Wait 10-15 seconds for fresh bundle before testing.

### Step 3: Check the Tailwind Preset (Most Common Regression)

The `theme` namespace in `packages/theme/src/tailwind.ts` gets accidentally removed when agents refactor this file.

```bash
grep -A5 "theme:" packages/theme/src/tailwind.ts | head -10
```

Must see `themeColor(...)` calls, NOT hardcoded hex values. If the theme block is missing, re-add it — see Architecture section.

### Step 4: Check Content Paths

Tailwind only generates CSS for classes found in scanned files. Verify `app/tailwind.config.js`:

```js
content: [
  "./app/**/*.{js,jsx,ts,tsx}",
  "./components/**/*.{js,jsx,ts,tsx}",
  "../packages/ui/src/**/*.{js,jsx,ts,tsx}",
  "../packages/theme/src/**/*.{js,jsx,ts,tsx}",
],
```

### Step 5: Check CSS Variables in global.css

```bash
grep "color-theme-background" app/global.css
```

Should show two lines (`:root` and `.dark`). If missing, CSS classes exist but resolve to nothing.

### Step 6: Check for Multiple NativeWind Copies (pnpm dedup)

```bash
find node_modules/.pnpm -name "nativewind" -type d | wc -l
```

Multiple copies = Metro plugin may use a different instance than your config. Fix with `pnpm.overrides` in root `package.json`:

```json
"pnpm": {
  "overrides": {
    "react-native": "0.81.4",
    "nativewind": "4.2.1",
    "react-native-css-interop": "0.2.1"
  }
}
```

Also verify all workspaces use same `react-native` version: `pnpm list react-native -r --depth=0`

### Step 7: Check Metro Output for Errors

```bash
tmux capture-pane -t omo-slopcade-web -p -S -100 | tail -50
```

Look for: `Cannot manually set color scheme`, `No utility classes were detected`, NativeWind errors.

### Step 8: Verify react-native-css-interop Cache

```bash
find node_modules/.pnpm -path "*css-interop*/.cache*" -type f
```

Should show `native.js`, `ios.js`, `android.js`. If empty, Tailwind CLI child process may be failing silently.

### Step 9: Check Dark Mode Class (web only)

```bash
curl -s http://localhost:8085/ | grep -o 'class="[^"]*dark[^"]*"' | head -3
```

If no `.dark` class, check `_layout.tsx` calls `setColorScheme("dark")` in a useEffect.

## Historical Breakage Patterns

| Date | What Broke | Root Cause |
|------|-----------|------------|
| Feb 2026 | Invisible text on profile | `theme` namespace in tailwind.ts removed by editor refactor commit |
| Feb 2026 | 4 duplicate NativeWind copies | Root package.json `react-native: 0.81.5` vs app `0.81.4` |
| Feb 2026 | `colorScheme.set()` crash | Called at module scope during Expo SSR |
| Feb 2026 | theme-* classes → 0 CSS output | Previous fix used hardcoded hex instead of CSS variables |
