# Amen.games Presentation Layer — UI Kit Plan

> **Goal**: Make amen.games feel like a completely separate, delightful app from Slopcade using warm white/yellow/gold visual language, animated religious iconography, and motion throughout.

## Current State (What Already Exists)

| Layer | Status | Location |
|-------|--------|----------|
| Brand manifest (identity, features, content policy) | Done | `packages/brands/src/manifests/amen.ts` |
| Build system (`BRAND_ID=amen`) | Done | `eas.json`, `app.config.ts`, `devmux.config.json` |
| Runtime brand resolution | Done | `app/lib/brand/index.ts` → `brandCssClass` |
| CSS variable themes (light + dark) | Done | `app/global.css` `.brand-amen` / `.brand-amen.dark` |
| Content policy (green/yellow/red zones) | Done | `packages/brands/src/content-policy.ts` |
| Feature flags per brand | Done | `BrandFeatures` — editor off, UGC off, party-only |
| Separate Supabase auth per brand | Done | Different env vars per brand |
| Deploy pipeline | Done | `deploy:amen:web` → Cloudflare Pages `amen-games` |

**What's missing**: The presentation layer that makes it *feel* different — colors, icons, animations, loading screens, decorative elements.

---

## Design Direction

- **Palette**: White, warm white, soft yellow, gold. Navy as accent only (not dominant).
- **Vibe**: Cute, friendly, warm, reverent but not heavy. "Church youth group energy."
- **Icons**: Rounded stroke-cap religious SVGs — crosses, doves, fish, halos, flames, hearts, scrolls, crowns, praying hands, lambs.
- **Motion**: Gentle — breathing glows, soft bobs, shimmer, sparkle particles, path drawing. Never jarring.
- **Texture**: Speckly grain overlays (SVG feTurbulence) for warmth.
- **Typography**: Lora for headings (serif warmth), Inter for body (readability).

---

## Phase 1: Color & Token Foundation

### P1.1 — Refine Amen CSS Variables (White/Yellow/Gold Shift)

**Files**: `app/global.css`

Current `.brand-amen` uses cream (#FDF8F0) background and navy (#1B3A6B) primary. Shift toward:

```
Light:
  --color-theme-background:    255 253 247    /* #FFFDF7 — near-white warm */
  --color-theme-surface:       255 255 255    /* #FFFFFF — pure white */
  --color-theme-surface-elevated: 253 248 235 /* #FDF8EB — soft cream */
  --color-theme-border:        240 230 205    /* #F0E6CD — warm border */
  --color-theme-text:          55 48 40       /* #373028 — warm dark */
  --color-theme-text-secondary: 140 128 105   /* #8C8069 — warm gray */
  --color-theme-primary:       201 168 76     /* #C9A84C — gold (was navy) */
  --color-theme-secondary:     27 58 107      /* #1B3A6B — navy demoted to secondary */

  /* New amen-specific glow/accent vars */
  --amen-glow-gold:            255 215 0      /* #FFD700 */
  --amen-warm-white:           255 250 235    /* #FFFAEB */
  --amen-soft-yellow:          255 241 186    /* #FFF1BA */
  --amen-golden-accent:        218 165 32     /* #DAA520 — goldenrod */
```

**Acceptance**: Gold is primary. Navy is secondary/accent. Background is warm white, not cream.

### P1.2 — Add Amen Grainient Palette

**Files**: `packages/theme/src/tokens.ts`, `app/global.css`

Add to `grainient.palettes`:
```ts
amen: {
  gradient: ["#FFD700", "#FFF1BA", "#C9A84C", "#FFFDF7"],
  surface: { dark: "rgba(201, 168, 76, 0.15)", light: "rgba(255, 215, 0, 0.08)" },
  text: { dark: "#FFD700", light: "#C9A84C" },
  border: { dark: "rgba(255, 215, 0, 0.3)", light: "rgba(201, 168, 76, 0.2)" },
},
amenWarm: {
  gradient: ["#FFF8E1", "#FFE082", "#FFD54F", "#FFC107"],
  surface: { dark: "rgba(255, 224, 130, 0.12)", light: "rgba(255, 193, 7, 0.06)" },
  text: { dark: "#FFE082", light: "#F57F17" },
  border: { dark: "rgba(255, 224, 130, 0.25)", light: "rgba(245, 127, 23, 0.15)" },
}
```

Add matching CSS vars in `global.css` under `.brand-amen`.

### P1.3 — Expose Amen Utility Tokens in Tailwind

**Files**: `packages/theme/src/tailwind.ts`

Add amen glow/accent colors to the `theme.extend.colors` block so they're available as `bg-amen-glow`, `text-amen-golden`, etc. Only exposed when brand-amen class is active.

### P1.4 — Storybook: Theme Documentation Stories

**Files**: `packages/ui/src/amen/theme/ColorPalette.stories.tsx`, `GrainientPalette.stories.tsx`

- **ColorPalette**: Grid of all amen colors as swatches with hex values, CSS var names, and Tailwind class names. Light + dark variants side by side.
- **GrainientPalette**: Each amen grainient rendered as a surface card with grain overlay.

---

## Phase 2: Typography

### P2.1 — Load Lora Font

**Files**: `app/assets/fonts/`, `app/app.config.ts`, font loading setup

- Download Lora (Google Fonts, OFL license) — Regular, Medium, SemiBold, Bold + Italic variants.
- Place in `app/assets/fonts/Lora-*.ttf`.
- Load via `expo-font` or asset bundling.
- The amen manifest already declares `fontFamily.heading: "Lora"`.

### P2.2 — Brand-Aware Typography Helpers

**Files**: `app/lib/brand/typography.ts`, optionally `packages/ui/src/amen/AmenText.tsx`

- Helper that reads `activeBrand.theme.fontFamily` and returns the correct font family.
- Could be a simple hook: `useBrandFont("heading")` → `"Lora"` or `"Inter"`.
- Or Tailwind utility: extend font-family in tailwind preset when brand is amen.

### P2.3 — Storybook: Typography Specimen

**Files**: `packages/ui/src/amen/theme/Typography.stories.tsx`

- Showcase Lora headings (h1-h6) + Inter body text at all sizes
- Compare side-by-side with Slopcade typography (Inter-only)
- Show font weight variants, italic, and line-height

---

## Phase 3: Icon System

### P3.1 — Curate Religious Icon Set

**Sources** (priority order):
1. **Christicons** (MIT-0) — 56 icons, perfect aesthetic match. Download SVGs, convert to React components.
2. **MaterialCommunityIcons** (via `@expo/vector-icons`) — Already available. Has: `christianity`, `cross`, `church`, `bible`, `dove`, `fish`, `hands-pray`, `crown`.
3. **Custom** — For any gaps (specific lamb, ark, scroll designs), create custom SVGs.

**Target set** (~30 icons for v1):
- Cross (latin, celtic, simple)
- Dove (flying, resting)
- Fish / Ichthys
- Bible / Book
- Church
- Praying hands
- Crown
- Halo / Aureole
- Flame / Fire
- Heart
- Scroll
- Chalice / Cup
- Star (Bethlehem)
- Lamb
- Olive branch
- Angel wings
- Wheat / Harvest
- Anchor (hope symbol)
- Alpha & Omega
- Shield (of faith)

### P3.2 — AmenIcon Component with Effect Props

**Files**: `app/components/amen/icons/AmenIcon.tsx`, `app/components/amen/icons/registry.ts`

```tsx
interface AmenIconProps {
  name: AmenIconName;
  size?: number;
  color?: string;
  // Effect props
  glow?: boolean | { color?: string; intensity?: number };
  pulse?: boolean;
  float?: boolean;
  draw?: boolean;  // Path draw-on animation
  sparkle?: boolean;
}
```

Registry maps icon names to SVG components. Wraps in effect components from Phase 4.

### P3.3 — Storybook: Icon Gallery + Individual Icon Stories

**Files**: `packages/ui/src/amen/icons/AmenIcon.stories.tsx`

- **IconGallery** story: Grid of ALL icons at 3 sizes (sm/md/lg), clickable to see name. Light + dark background.
- **Individual icon** stories: One story per icon category (crosses, animals, objects, symbols) with all effect prop controls (glow, pulse, float, draw, sparkle).
- **Effect Showcase** story: Single icon rendered with each effect enabled individually, then all combined.

---

## Phase 4: Animation Primitives

All animation components live in `app/components/amen/animation/`.

### P4.1 — GlowIcon (Breathing Golden Halo)

Wraps any icon/element with a pulsing golden glow.
- **Engine**: Reanimated `withRepeat(withTiming(...))` on opacity.
- **Web**: CSS `filter: drop-shadow(0 0 Npx rgba(255,215,0,opacity))`.
- **Native**: Animated `shadowOpacity` or SVG `feGaussianBlur` with animated flood opacity.
- **Props**: `color`, `intensity`, `speed` (breathing rate), `children`.

### P4.2 — FloatingElement (Gentle Bob)

Gentle vertical bobbing with sine easing.
- **Engine**: Reanimated sine-wave on `translateY`.
- **Props**: `amplitude` (default 6px), `duration` (default 3s), `children`.

### P4.3 — SparkleWrapper (Light Particles)

Renders small animated sparkle/star particles around children.
- **Approach**: Array of small SVG star shapes with staggered fade-in/out + random positions. Deterministic (seeded) placement, not physics-based.
- **Props**: `count` (default 6), `color` (default gold), `children`.
- **Performance**: Limited to ~8-12 particles max. Use `transform` + `opacity` only.

### P4.4 — DrawingIcon (SVG Path Draw-On)

Animates `strokeDashoffset` from path length to 0.
- **Engine**: Reanimated `useAnimatedProps` on SVG path.
- **Props**: `duration`, `delay`, `onComplete`, SVG path data.
- Pre-compute path lengths for consistent cross-platform behavior.

### P4.5 — ShimmerSurface (Golden Shimmer)

Golden shimmer effect for card backgrounds, loading placeholders.
- **Extend**: Existing `ShimmerText` pattern (linear gradient + Reanimated translateX).
- **Change**: Gold gradient (`transparent → rgba(255,215,0,0.15) → transparent`).
- **Props**: `width`, `height`, `borderRadius`, `shimmerColor`.

### P4.6 — GrainOverlay (Speckle/Noise Texture)

Adds a subtle paper-like grain texture.
- **Web**: SVG `feTurbulence` filter overlay with low opacity.
  ```xml
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" />
    <feColorMatrix type="saturate" values="0" />
    <feComponentTransfer><feFuncA type="linear" slope="0.08" /></feComponentTransfer>
  </filter>
  ```
- **Native**: Pre-rendered grain texture PNG tiled as background, or Skia shader if available.
- **Props**: `intensity` (0-1), `blend` (overlay/multiply), `children`.

> **Storybook**: Each P4.x component gets a co-located `.stories.tsx` file with:
> - **Default** story with interactive controls for all props
> - **Variants** stories (subtle, strong, on-dark, on-light)
> - **Composition** story showing the primitive wrapping a religious icon
> - All use `AmenLightDecorator` / `AmenDarkDecorator` from `storybook-utils.tsx`

---

## Phase 5: Loading Experiences

### P5.1 — Amen App Splash Animation

**File**: Extend `app/components/AnimatedSplashScreen.tsx` with amen branch.

Sequence:
1. Warm white background fades in
2. Cross icon draws itself (DrawingIcon) — clean golden strokes
3. Cross completes → golden glow blooms outward (GlowIcon)
4. "AMEN" text fades in below with shimmer
5. Transition to app

### P5.2 — Amen Game Loading Screen

**File**: Extend `app/components/game/AssetLoadingScreen.tsx` with amen branch.

- Centered floating religious icon (rotating selection: cross, dove, fish) with sparkles
- Golden shimmer progress bar below
- Verse of the day text (optional, from content API)

### P5.3 — Content Loading Skeletons

Golden-tinted shimmer rectangles for content cards, game lists, profile sections.
Uses `ShimmerSurface` with rounded corners matching amen border radius.

---

## Phase 6: Decorative UI Layer

### P6.1 — Decorative Primitives

**Directory**: `app/components/amen/decor/`

Components:
- **MotifDivider**: Horizontal rule with centered religious icon (cross, dove, olive branch). Thin gold lines extending from icon.
- **SectionOrnament**: Small decorative element for section headers — could be wheat stalks, olive branches, or simple golden dots.
- **PatternBackground**: Subtle repeating pattern (tiny crosses or dots) as background texture. Very low opacity.
- **HaloBadge**: Circular badge with golden halo ring — for achievements, categories, player avatars.

### P6.2 — Screen Transitions

Subtle golden fade/glow effect on screen transitions. Keep simple — golden overlay that fades in/out during navigation.

### P6.3 — Sprinkle Pass

Apply decorative elements across key surfaces:
- Tab bar headers
- Game cards in browse view
- Empty states ("No games yet" with floating dove)
- Profile section headers
- Settings screen dividers

### P6.4 — Storybook: Composition Showcase Stories

**Files**: `packages/ui/src/amen/compositions/` (stories-only directory)

- **CardWithEffects.stories.tsx**: Game card with golden shimmer, grain overlay, glowing icon, motif divider. Controls for toggling each effect.
- **LoadingScreen.stories.tsx**: Full loading experience — floating icon + sparkles + shimmer progress bar + verse text.
- **EmptyState.stories.tsx**: "No games yet" with floating dove, decorative divider, shimmer CTA.
- **ScreenMockup.stories.tsx**: Full-width mock of an amen screen showing header ornaments, content cards, dividers, and decorative elements together.

These composition stories are the "hero" showcase — the first thing someone sees when opening the Amen category in Storybook.

---

## Phase 7: Validation & Hardening

### P7.1 — Cross-Platform Visual Verification

Test on: Web (Chrome), iOS Simulator, Android Emulator.
Check: Glow rendering, grain texture performance, font loading, dark mode contrast, animation smoothness.

### P7.2 — Test Coverage

- Unit tests for brand component selection
- Snapshot tests for amen-specific components
- Token mapping validation

### P7.3 — Accessibility & Performance

- `prefers-reduced-motion`: Disable all animations, keep static glow as fallback
- Color contrast: Ensure gold-on-white meets WCAG AA for text
- Animation performance: Cap at 60fps, avoid layout thrashing
- Bundle impact: Measure SVG icon set size, lazy-load if >50KB

---

## Dependency Graph

```
Phase 0 (Planning)
    │
    ├── Phase 1 (Colors/Tokens) ─── P1.1 + P1.2 parallel → P1.3
    │
    ├── Phase 2 (Typography) ────── P2.1 → P2.2
    │
    └── Phase 3 (Icons) ─────────── P3.1 → P3.2
              │
              ▼
         Phase 4 (Animation Primitives) ── all 6 tasks in parallel
              │
              ▼
         Phase 5 (Loading) + Phase 6 (Decorative) ── parallel
              │
              ▼
         Phase 7 (Validation)
```

Phases 1, 2, 3 can run in parallel after planning.
Phase 4 depends on Phase 1 (colors) + Phase 3 (icons).
Phases 5 & 6 depend on Phase 4 (animation primitives).
Phase 7 is final gate.

---

## File Layout

```
packages/brands/src/manifests/amen.ts           ← brand identity (exists, minor updates)
packages/theme/src/tokens.ts                     ← amen grainient palette (extend)
packages/theme/src/tailwind.ts                   ← amen utility tokens (extend)
app/global.css                                   ← amen CSS variables (refine)
app/assets/fonts/Lora-*.ttf                      ← heading font (new)
app/lib/brand/typography.ts                      ← brand font helpers (new)

packages/ui/src/amen/                            ← ALL reusable amen UI primitives
  index.ts                                       ← barrel export
  storybook-utils.tsx                            ← shared Storybook decorators
  icons/
    AmenIcon.tsx + AmenIcon.stories.tsx           ← icon component + gallery story
    registry.ts                                  ← icon name → SVG mapping
    svgs/                                        ← individual SVG components
  animation/
    GlowIcon.tsx + GlowIcon.stories.tsx          ← breathing golden halo
    FloatingElement.tsx + FloatingElement.stories.tsx  ← gentle bob
    SparkleWrapper.tsx + SparkleWrapper.stories.tsx    ← particle sparkles
    DrawingIcon.tsx + DrawingIcon.stories.tsx     ← path draw-on
    ShimmerSurface.tsx + ShimmerSurface.stories.tsx    ← golden shimmer
    GrainOverlay.tsx + GrainOverlay.stories.tsx   ← speckle texture
  decor/
    MotifDivider.tsx + MotifDivider.stories.tsx   ← divider with religious motif
    SectionOrnament.tsx + SectionOrnament.stories.tsx  ← header ornaments
    PatternBackground.tsx + PatternBackground.stories.tsx  ← subtle repeating pattern
    HaloBadge.tsx + HaloBadge.stories.tsx         ← golden halo badge
  theme/
    ColorPalette.stories.tsx                     ← color swatch documentation
    Typography.stories.tsx                       ← font specimen documentation
    GrainientPalette.stories.tsx                 ← gradient documentation

app/components/AnimatedSplashScreen.tsx          ← add amen branch (exists)
app/components/game/AssetLoadingScreen.tsx        ← add amen branch (exists)
```

---

## Storybook Strategy

Every amen.games UI component gets a Storybook story. This is how we develop, review, and showcase the entire UI kit in isolation.

### Current Storybook Setup
- **Framework**: `@storybook/react-webpack5` (web-based, not React Native Storybook)
- **Config**: `apps/storybook/.storybook/main.ts`
- **Story glob**: Currently only scans `packages/ui/**/*.stories.@(js|jsx|ts|tsx)`
- **Tailwind content**: Currently only scans `packages/ui/`, `packages/physics/`, `packages/theme/`
- **Pattern**: CSF3 format (`Meta<typeof Component>` + `StoryObj`), `title` with folder hierarchy
- **Decorators**: Inline per-story (e.g., colored background `View` wrappers)
- **Addons**: `@storybook/addon-essentials`, `@storybook/addon-interactions`
- **Start**: `pnpm storybook` (devmux managed, port 6006)

### Architecture Decision: Where Do Amen Components Live?

**Option chosen**: Put amen UI primitives in `packages/ui/src/amen/` (not `app/components/amen/`).

**Why**: Storybook already scans `packages/ui/`. Components in the shared UI package are importable by any app, and the Storybook webpack config already handles NativeWind, Tailwind, and the theme alias. No config changes needed.

Components that are app-specific integrations (splash screen, loading screen) stay in `app/components/` but the reusable primitives (icons, animations, decorative elements) belong in the shared package.

### Story Categories (Storybook Sidebar Hierarchy)

```
Amen/
  Icons/
    AmenIcon              — icon registry showcase, all icons in grid
    AmenIcon/Cross        — individual icon with effect controls
    AmenIcon/Dove
    AmenIcon/Fish
    ...
  Animation/
    GlowIcon              — breathing golden halo
    FloatingElement        — gentle bobbing
    SparkleWrapper         — particle sparkles
    DrawingIcon            — path draw-on animation
    ShimmerSurface         — golden shimmer for cards
    GrainOverlay           — speckle/noise texture (amen variant)
  Decor/
    MotifDivider           — divider with religious motif
    SectionOrnament        — header ornaments
    PatternBackground      — subtle repeating pattern
    HaloBadge              — golden halo badge
  Composition/
    LoadingScreen          — full loading experience composition
    SplashSequence         — splash animation sequence
    CardWithEffects        — game card with all effects combined
    EmptyState             — empty state with floating icon
  Theme/
    ColorPalette           — all amen colors displayed in swatches
    Typography             — Lora headings + Inter body samples
    GrainientPalette       — amen grainient gradients
```

### Story Pattern (Template)

Every story file follows this pattern:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { View } from "react-native";
import { GlowIcon } from "./GlowIcon";

const meta: Meta<typeof GlowIcon> = {
  title: "Amen/Animation/GlowIcon",
  component: GlowIcon,
  tags: ["autodocs"],
  argTypes: {
    color: { control: "color" },
    intensity: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    speed: { control: { type: "range", min: 500, max: 5000, step: 100 } },
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 40, alignItems: "center", backgroundColor: "#FFFDF7" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GlowIcon>;

export const Default: Story = {
  args: { color: "#FFD700", intensity: 0.8, speed: 2000 },
};

export const Subtle: Story = {
  args: { color: "#FFD700", intensity: 0.3, speed: 3000 },
};

export const OnDark: Story = {
  args: { color: "#FFD700", intensity: 1.0, speed: 2000 },
  decorators: [
    (Story) => (
      <View style={{ padding: 40, alignItems: "center", backgroundColor: "#0D1C33" }}>
        <Story />
      </View>
    ),
  ],
};
```

### Amen Brand Decorator

Create a shared decorator in `packages/ui/src/amen/storybook-utils.tsx`:

```tsx
export const AmenLightDecorator = (Story) => (
  <View style={{ padding: 32, backgroundColor: "#FFFDF7", minHeight: 200, alignItems: "center", justifyContent: "center" }}>
    <Story />
  </View>
);

export const AmenDarkDecorator = (Story) => (
  <View style={{ padding: 32, backgroundColor: "#0D1C33", minHeight: 200, alignItems: "center", justifyContent: "center" }}>
    <Story />
  </View>
);
```

### Interactive Controls per Component Type

| Component Type | Key Controls |
|---------------|--------------|
| Icons | `name` (select), `size` (range), `color` (color picker), `glow` (boolean), `pulse` (boolean), `float` (boolean) |
| Animation wrappers | `speed/duration` (range), `intensity` (range), `color` (color picker), `enabled` (boolean) |
| Decorative | `variant` (select), `color` (color picker), `size` (select: sm/md/lg) |
| Compositions | `theme` (light/dark radio), `loading` (boolean), combination of child controls |

### Composition Stories (Key Showcase)

The `Amen/Composition/` category is especially important — it shows how primitives combine into real UI:

- **CardWithEffects**: A game card with golden shimmer, grain overlay, and glowing icon
- **LoadingScreen**: Full loading experience with floating icon + sparkles + shimmer progress
- **EmptyState**: "No games yet" with floating dove, decorative divider, shimmer CTA button
- **IconGallery**: Grid of ALL amen icons, each with hover-to-glow interaction

### Updated File Layout

```
packages/ui/src/amen/
  index.ts                                      ← barrel export
  storybook-utils.tsx                            ← shared decorators
  icons/
    AmenIcon.tsx                                 ← icon component with effects
    AmenIcon.stories.tsx                         ← icon gallery + per-icon stories
    registry.ts                                  ← icon name → SVG mapping
    svgs/                                        ← individual SVG components
  animation/
    GlowIcon.tsx + GlowIcon.stories.tsx
    FloatingElement.tsx + FloatingElement.stories.tsx
    SparkleWrapper.tsx + SparkleWrapper.stories.tsx
    DrawingIcon.tsx + DrawingIcon.stories.tsx
    ShimmerSurface.tsx + ShimmerSurface.stories.tsx
    GrainOverlay.tsx + GrainOverlay.stories.tsx   ← amen-themed variant
  decor/
    MotifDivider.tsx + MotifDivider.stories.tsx
    SectionOrnament.tsx + SectionOrnament.stories.tsx
    PatternBackground.tsx + PatternBackground.stories.tsx
    HaloBadge.tsx + HaloBadge.stories.tsx
  theme/
    ColorPalette.stories.tsx                      ← documentation-only story
    Typography.stories.tsx                        ← documentation-only story
    GrainientPalette.stories.tsx                  ← documentation-only story
```

---

## Dependencies (No New Heavy Packages)

All implementation uses existing dependencies:
- `react-native-reanimated` — animation engine
- `react-native-svg` — SVG rendering
- `@expo/vector-icons` — MaterialCommunityIcons fallback
- `expo-font` — Lora font loading
- NativeWind / Tailwind CSS — theming

Optional enhancement (Phase 4.6 native grain):
- `@shopify/react-native-skia` — already in project, use for native grain shader

## Icon Sources (Licensing)

| Source | License | Usage |
|--------|---------|-------|
| Christicons | MIT-0 | Primary religious icons — no attribution needed |
| MaterialCommunityIcons | Apache 2.0 | Fallback icons — attribution in app credits |
| Custom SVGs | Owned | Fill gaps — lamb, specific motifs |
| game-icons.net | CC BY 3.0 | Game badges only — requires attribution |
