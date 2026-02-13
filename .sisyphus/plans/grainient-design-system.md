# Grainient Design System Plan

## Requirements (confirmed)
- Cross-platform component library (React Native Web + iOS + Android)
- Grainy gradient aesthetic inspired by [React Bits Grainient](https://reactbits.dev/backgrounds/grainient)
- Themed, variant-based primitives (buttons, cards, badges, inputs, etc.)
- Variable/token-driven so colors/themes/gradients can be easily tweaked later
- Must be previewable in Storybook
- Must work on both web and native
- SVG approach preferred on web, Skia on native (platform-split files)

## User's Design Brief
- User provided a detailed architecture proposal (packages/ui/ structure)
- 5 button variants: grainient, glass, solid, outline, ghost
- 3 sizes: sm, md, lg
- Core primitives: GrainOverlay, GradientFill (platform-split)
- Surface as reusable container, other components built on top
- Theme tokens: palettes (ultraviolet, ember, abyss), spacing, radii, typography, grain config
- ThemeProvider + useTheme context pattern

## Technical Decisions
- **Grain on web**: SVG `feTurbulence` filter
- **Grain on native**: Skia `FractalNoise` + `Blend`
- **Gradient on web**: CSS `radial-gradient`
- **Gradient on native**: Skia `RadialGradient` + `Blur`
- **Animations**: react-native-reanimated for press/hover, optional gradient motion
- **Platform resolution**: `.web.tsx` / `.native.tsx` file pairs

## Decisions Made
- **Skia**: Install @shopify/react-native-skia. Use WithCanvasKit lazy-loading pattern from liftlog-25 project.
- **Styling**: Hybrid NativeWind + raw styles. NativeWind for layout/spacing/text, raw StyleSheet for grain/gradient overlay layers.
- **Scope**: Foundation + Button + Surface with Storybook stories. Not full component set yet.
- **Color mode**: Both dark AND light mode from the start.

## Skia WASM Loading Pattern (from liftlog-25)
- **Key file**: `/Users/hassoncs/Workspaces/Personal/liftlog-25/app/components/WithCanvasKit.tsx`
- **Version in reference**: @shopify/react-native-skia ^2.4.14
- **Pattern**: WithCanvasKit component that:
  - On native: directly lazy-imports the Skia component via getComponent()
  - On web: first lazy-loads `@shopify/react-native-skia/lib/module/web` (WithSkiaWeb), then uses it to gate the actual component
  - Includes fade-in animation on web to smooth the WASM loading delay
  - Uses `locateFile` to resolve canvaskit.wasm from public/
- **Postinstall script**: `mkdir -p public && cp canvaskit.wasm public/canvaskit.wasm` — copies WASM binary to public dir
- **Usage pattern**: `<WithCanvasKit getComponent={() => import('./MySkiaComponent')} fallback={<Placeholder />} />`
- Each Skia component is a separate file with `export default` and gets lazy-loaded

## Research Findings

### Codebase Structure (CONFIRMED)
- **Monorepo**: pnpm workspaces — `packages/ui`, `packages/theme`, `apps/storybook`, `app`
- **Existing components**: `packages/ui/src/` — Button.tsx, Box.tsx, Input.tsx, Text.tsx, TextureButton.tsx
- **Current Button**: Uses CVA (class-variance-authority) + NativeWind classes, 6 variants (default, destructive, outline, secondary, ghost, link)
- **Theme system**: `packages/theme/src/tokens.ts` with colors, spacing, radii, typography, shadows, motion — piped through NativeWind/Tailwind
- **Storybook**: Already configured at `apps/storybook/`, stories co-located with components, port 6007
- **Platform split pattern**: `.web.tsx` / `.native.tsx` already used (e.g., FileTree/)

### Dependencies (CONFIRMED)
| Dependency | Status | Version |
|------------|--------|---------|
| React Native | ✅ | 0.81.4 |
| Expo SDK | ✅ | 54.0.1 |
| Expo Router | ✅ | ~6.0.0 |
| NativeWind | ✅ | 4.2.1 |
| Tailwind CSS | ✅ | 3.4.17 |
| Reanimated | ✅ | 4.1.6 |
| react-native-svg | ✅ | 15.12.1 |
| @shopify/react-native-skia | ❌ NOT INSTALLED | — |
| expo-blur | ❌ NOT INSTALLED | — |
| expo-linear-gradient | ❌ NOT INSTALLED | — |
| expo-font (direct) | ❌ NOT INSTALLED | — |

### Key Implications
- **Skia NOT available** — The user's brief assumed Skia was installed. It's NOT. This changes the native grain implementation approach.
  - Options: (A) Install Skia, (B) Use pre-baked noise PNG overlay on native, (C) Use react-native-svg for native noise
- **NativeWind is the primary styling system** — New components should integrate with NativeWind/CVA patterns, not introduce a parallel raw-StyleSheet system
- **Existing Button uses CVA** — The new grainient Button is a DIFFERENT component (GrainientButton?), not a replacement for the existing one
- **No custom fonts** — Project relies on system fonts / Inter via system-ui fallback

## Decisions Locked
- Skia path selected for native rendering with WithCanvasKit lazy-load pattern reference.
- New components remain separate from existing shared UI components.
- Hybrid styling selected: NativeWind for structural styling, raw styles for effect layers.
- Scope fixed to Foundation + GrainientButton + Surface for Storybook-first validation.
- Both dark and light mode are required from the start.

## Scope Boundaries
- INCLUDE: Theme tokens, primitives (GrainOverlay, GradientFill), GrainientButton, Surface, Storybook stories
- INCLUDE: Storybook preview for all components
- EXCLUDE: Full app integration (Phase 5 in user's brief — separate effort)
- DECIDED: Foundation + Button + Surface (not full component set)
- DECIDED: Install Skia with WithCanvasKit lazy-loading pattern

---

# WORK PLAN

## Overview
Build a grainy gradient design system with Button and Surface components, previewable in Storybook. Platform-split primitives (web: SVG, native: Skia) with NativeWind hybrid styling.

## Phase 1: Foundation — Tokens & Primitives

### Task 1.1: Add grainient tokens to packages/theme
- [x] Add `grainient` constant to `packages/theme/src/tokens.ts`:
  - `palettes`: ultraviolet, ember, abyss (gradient color arrays, surface colors, text colors, borders)
  - `grain`: frequency, octaves, opacity, blendMode
  - `surfaces`: dark/light mode surface colors for glassmorphism
- [x] Export grainient from tokens index
- [x] Add CSS variables to `app/global.css` for grainient colors (follow existing `:root` / `.dark` pattern)
- [x] Update `packages/theme/src/tailwind.ts` to map grainient tokens to Tailwind colors

### Task 1.2: Create GrainOverlay primitive (platform-split)
- [x] Create `packages/ui/src/Grainient/` directory
- [x] Create `packages/ui/src/Grainient/types.ts` with shared `GrainOverlayProps` interface
- [x] Create `packages/ui/src/Grainient/GrainOverlay.web.tsx`:
  - SVG `<filter>` with `feTurbulence` + `feColorMatrix`
  - Use React `useId()` for unique filter IDs
  - Apply via CSS `filter: url(#id)` with opacity and mix-blend-mode
- [x] Create `packages/ui/src/Grainient/GrainOverlay.native.tsx`:
  - Skia `Canvas` with `FractalNoise` + `Blend`
  - Wrap in `WithCanvasKit` for lazy WASM loading on web (if used in Expo web build)
- [x] Create index files: `index.ts`, `index.web.ts`, `index.native.ts` following FileTree pattern
- [x] Create `GrainOverlay.stories.tsx` with default story

### Task 1.3: Create GradientFill primitive (platform-split)
- [x] Create `packages/ui/src/Grainient/GradientFill.web.tsx`:
  - CSS `radial-gradient` with multiple color stops
  - Accept `colors` prop (array of hex colors)
- [x] Create `packages/ui/src/Grainient/GradientFill.native.tsx`:
  - Skia `Canvas` with multiple `Circle` + `RadialGradient` + `Blur`
  - Create soft color blob effect
- [x] Create index files following platform-split pattern
- [x] Create `GradientFill.stories.tsx` with palette showcase

### Task 1.4: Create WithCanvasKit wrapper (for native Skia)
- [x] Port `WithCanvasKit.tsx` from liftlog-25 to `packages/ui/src/Grainient/WithCanvasKit.tsx`
- [x] Add postinstall script to `app/package.json`: copy canvaskit.wasm to public/
- [x] Install `@shopify/react-native-skia` in `app/package.json` (NOT root)

## Phase 2: GrainientButton Component

### Task 2.1: Define Button types and variants
- [x] Create `packages/ui/src/Grainient/Button/types.ts`:
  - `ButtonVariant`: 'grainient' | 'glass' | 'solid' | 'outline' | 'ghost'
  - `ButtonSize`: 'sm' | 'md' | 'lg'
  - `ButtonProps` interface extending PressableProps
- [x] Create CVA variants config matching existing Button pattern

### Task 2.2: Implement GrainientButton
- [x] Create `packages/ui/src/Grainient/Button/GrainientButton.tsx`:
  - Layer structure: Pressable → GradientFill (variant=grainient) → GrainOverlay → Content
  - Use CVA for variant styling (NativeWind classes for layout/spacing)
  - Use raw StyleSheet for overlay positioning
  - Implement press animation with Reanimated (scale + opacity)
  - Support `iconLeft`, `iconRight`, `loading` props
- [x] Create index files for export
- [x] Create `GrainientButton.stories.tsx`:
  - AllVariants story (5 variants)
  - AllSizes story (3 sizes)
  - PaletteShowcase story (3 palettes)
  - DarkMode / LightMode stories

## Phase 3: Surface Component

### Task 3.1: Implement Surface container
- [x] Create `packages/ui/src/Grainient/Surface/types.ts`:
  - `SurfaceVariant`: 'grainient' | 'glass' | 'solid'
  - `SurfaceProps` interface
- [x] Create `packages/ui/src/Grainient/Surface/Surface.tsx`:
  - Reusable container with grainient background
  - Props: variant, palette, radius, padding, disableGrain
  - Layer structure: View → GradientFill → GrainOverlay → children
- [x] Create `Surface.stories.tsx` with variant showcase

## Phase 4: Integration & Polish

### Task 4.1: Export from package index
- [x] Update `packages/ui/src/index.ts` to export grainient components
- [x] Add export paths to `packages/ui/package.json` exports field

### Task 4.2: Verify Storybook rendering
- [x] Run `pnpm storybook` and verify all stories render
- [x] Test dark/light mode switching in Storybook
- [x] Verify all 5 button variants render correctly
- [x] Verify all 3 sizes render correctly

### Task 4.3: Type check
- [x] Run `pnpm tsc --noEmit` — must pass with zero errors

---

## Guardrails (from Metis)

### MUST NOT
- MUST NOT modify existing Button, Box, Input, or any other components
- MUST NOT add Skia to root package.json — install in `app/` only
- MUST NOT add app integration code — Storybook stories only
- MUST NOT create additional components beyond: GrainOverlay, GradientFill, GrainientButton, Surface

### MUST
- MUST follow FileTree platform split pattern exactly
- MUST use CVA for variant styling (match Button pattern)
- MUST define shared interfaces in `types.ts` before implementing
- MUST add grainient tokens to `packages/theme/src/tokens.ts`
- MUST support both dark AND light mode from start
- MUST create Storybook stories for each component

---

## Acceptance Criteria (Executable)

```bash
# Verify tokens exist
node -e "const t = require('@slopcade/theme'); console.log(Object.keys(t.grainient || {}))"
# Expected: palettes, grain, surfaces

# Verify Skia is in app only
grep -q "@shopify/react-native-skia" app/package.json && echo "OK: Skia in app"
grep -q "@shopify/react-native-skia" package.json && echo "FAIL: Skia in root" || echo "OK: Skia not in root"

# Verify Storybook renders (after starting storybook)
curl -s http://localhost:6007/iframe.html?id=ui-grainientbutton--all-variants&viewMode=story
# Expected: HTTP 200

# Type check
pnpm tsc --noEmit
# Expected: exit code 0
```

---

## File Structure (Target)

```
packages/ui/src/Grainient/
├── index.ts                    # Barrel export
├── index.web.ts                # Web entry
├── index.native.ts             # Native entry
├── types.ts                    # Shared interfaces
├── WithCanvasKit.tsx           # Skia lazy loader (from liftlog-25)
├── GrainOverlay.web.tsx        # SVG feTurbulence
├── GrainOverlay.native.tsx     # Skia FractalNoise
├── GrainOverlay.stories.tsx
├── GradientFill.web.tsx        # CSS radial-gradient
├── GradientFill.native.tsx     # Skia RadialGradient
├── GradientFill.stories.tsx
├── Button/
│   ├── index.ts
│   ├── types.ts
│   ├── GrainientButton.tsx
│   └── GrainientButton.stories.tsx
└── Surface/
    ├── index.ts
    ├── types.ts
    ├── Surface.tsx
    └── Surface.stories.tsx
```

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Skia + Expo SDK 54 incompatibility | High | Check compatibility matrix before installing; may need to pin Skia version |
| 3MB WASM load time | Medium | WithCanvasKit lazy loading + fade-in animation; CDN caching |
| NativeWind + custom CSS properties | Medium | Use raw StyleSheet for overlay layers; NativeWind for layout only |
| Dark/light mode complexity | Medium | Follow existing `:root` / `.dark` CSS variable pattern |
