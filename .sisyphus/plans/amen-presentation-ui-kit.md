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

## Tasks

### Phase 1: Color & Token Foundation

- [ ] **P1.1** — Refine `.brand-amen` CSS variables in `app/global.css` toward white/yellow/gold. Gold (#C9A84C) becomes primary, navy demoted to secondary. Background warm white (#FFFDF7) not cream. Add amen-specific glow vars (`--amen-glow-gold`, `--amen-warm-white`, `--amen-soft-yellow`, `--amen-golden-accent`). Update both light and dark blocks.
- [ ] **P1.2** — Add `amen` and `amenWarm` grainient palettes to `packages/theme/src/tokens.ts`. Map matching CSS vars in `app/global.css` under `.brand-amen`. Gold/cream/warm-white gradients.
- [ ] **P1.3** — Expose amen glow/accent colors in `packages/theme/src/tailwind.ts` as `bg-amen-glow`, `text-amen-golden`, etc. *(depends on P1.1, P1.2)*
- [ ] **P1.4** — Storybook: `packages/ui/src/amen/theme/ColorPalette.stories.tsx` — grid of all amen color swatches (hex, CSS var, Tailwind class). Light + dark side by side. *(depends on P1.1–P1.3)*
- [ ] **P1.5** — Storybook: `packages/ui/src/amen/theme/GrainientPalette.stories.tsx` — each amen grainient as a surface card with grain overlay. *(depends on P1.2)*

### Phase 2: Typography

- [ ] **P2.1** — Download Lora font (Google Fonts, OFL) — Regular, Medium, SemiBold, Bold + Italic. Place in `app/assets/fonts/Lora-*.ttf`. Load via expo-font. Verify renders on web/iOS/Android.
- [ ] **P2.2** — Create brand-aware typography helper (`app/lib/brand/typography.ts`). `useBrandFont("heading")` → `"Lora"` or `"Inter"`. Or Tailwind font-family extension. *(depends on P2.1)*
- [ ] **P2.3** — Storybook: `packages/ui/src/amen/theme/Typography.stories.tsx` — Lora headings h1-h6 + Inter body at all sizes. Weight variants, italic, line-height. *(depends on P2.1, P2.2)*

### Phase 3: Icon System

- [ ] **P3.1** — Curate ~30 religious SVG icons. Primary: Christicons (MIT-0). Fallback: MaterialCommunityIcons. Custom for gaps. Target: cross (latin/celtic/simple), dove, fish, bible, church, praying hands, crown, halo, flame, heart, scroll, chalice, star, lamb, olive branch, angel wings, wheat, anchor, alpha-omega, shield. Convert to React SVG components in `packages/ui/src/amen/icons/svgs/`.
- [ ] **P3.2** — Build `AmenIcon` component (`packages/ui/src/amen/icons/AmenIcon.tsx`) + `registry.ts`. Props: `name`, `size`, `color`, `glow`, `pulse`, `float`, `draw`, `sparkle`. TypeScript autocomplete for icon names. *(depends on P3.1)*
- [ ] **P3.3** — Storybook: `packages/ui/src/amen/icons/AmenIcon.stories.tsx` — IconGallery grid (all icons at 3 sizes), per-category stories with effect prop controls, effect showcase story. *(depends on P3.2)*

### Phase 4: Animation Primitives

All components in `packages/ui/src/amen/animation/`. Each gets a co-located `.stories.tsx` with Default, Variants (subtle/strong/on-dark/on-light), and Composition stories using `AmenLightDecorator`/`AmenDarkDecorator`.

- [ ] **P4.1** — `GlowIcon` — breathing golden halo wrapper. Reanimated `withRepeat(withTiming(...))` on opacity. Web: CSS `drop-shadow`. Props: `color`, `intensity`, `speed`, `children`. + Storybook story.
- [ ] **P4.2** — `FloatingElement` — gentle vertical bob with sine easing. Reanimated translateY. Props: `amplitude` (6px), `duration` (3s), `children`. + Storybook story.
- [ ] **P4.3** — `SparkleWrapper` — animated sparkle/star particles around children. SVG stars with staggered fade. Props: `count` (6), `color` (gold), `children`. Max 8-12 particles. + Storybook story.
- [ ] **P4.4** — `DrawingIcon` — SVG path draw-on via animated `strokeDashoffset`. Reanimated `useAnimatedProps`. Props: `duration`, `delay`, `onComplete`. + Storybook story. *(depends on P3.1)*
- [ ] **P4.5** — `ShimmerSurface` — golden shimmer for cards/placeholders. Extend existing ShimmerText pattern. Gold gradient. Props: `width`, `height`, `borderRadius`, `shimmerColor`. + Storybook story.
- [ ] **P4.6** — `GrainOverlay` — speckle/noise texture. Web: SVG `feTurbulence`. Native: tiled PNG or Skia shader. Props: `intensity`, `blend`, `children`. + Storybook story. *(depends on P1.2)*
- [ ] **P4.7** — Create shared Storybook decorators in `packages/ui/src/amen/storybook-utils.tsx` — `AmenLightDecorator`, `AmenDarkDecorator`.

### Phase 5: Loading Experiences

- [ ] **P5.1** — Amen app splash animation. Extend `app/components/AnimatedSplashScreen.tsx` with amen branch. Sequence: warm white fade-in → cross draws itself (DrawingIcon) → golden glow blooms (GlowIcon) → "AMEN" text fades in with shimmer → transition to app. *(depends on P4.1, P4.4)*
- [ ] **P5.2** — Amen game loading screen. Extend `app/components/game/AssetLoadingScreen.tsx`. Floating religious icon with sparkles + golden shimmer progress bar + optional verse of the day. *(depends on P4.2, P4.3, P4.5)*
- [ ] **P5.3** — Content loading skeletons. Golden-tinted shimmer rectangles for cards, game lists, profiles. Uses `ShimmerSurface`. *(depends on P4.5)*

### Phase 6: Decorative UI Layer

- [ ] **P6.1** — `MotifDivider` — horizontal rule with centered religious icon + thin gold lines. + Storybook story. In `packages/ui/src/amen/decor/`.
- [ ] **P6.2** — `SectionOrnament` — small decorative header element (wheat, olive, golden dots). + Storybook story.
- [ ] **P6.3** — `PatternBackground` — subtle repeating pattern (tiny crosses/dots) at low opacity. + Storybook story.
- [ ] **P6.4** — `HaloBadge` — circular badge with golden halo ring for achievements/avatars. + Storybook story.
- [ ] **P6.5** — Screen transitions — subtle golden fade/glow on navigation transitions.
- [ ] **P6.6** — Sprinkle pass — apply decorative elements to tab headers, game cards, empty states, profile headers, settings dividers. *(depends on P6.1–P6.4)*
- [ ] **P6.7** — Storybook: Composition showcase stories in `packages/ui/src/amen/compositions/` — CardWithEffects, LoadingScreen, EmptyState, ScreenMockup. *(depends on P4.x, P6.1–P6.4)*

### Phase 7: Validation & Hardening

- [ ] **P7.1** — Cross-platform visual verification: web (Chrome), iOS Simulator, Android Emulator. Check glow rendering, grain perf, font loading, dark mode contrast, animation smoothness.
- [ ] **P7.2** — Unit/snapshot tests for brand component selection and token mapping.
- [ ] **P7.3** — Accessibility: `prefers-reduced-motion` support, WCAG AA contrast for gold-on-white, animation perf caps, bundle size check (lazy-load icons if >50KB).

---

## Dependency Graph

```
Phase 1 (Colors/Tokens) ─── P1.1 + P1.2 parallel → P1.3 → P1.4/P1.5
Phase 2 (Typography) ────── P2.1 → P2.2 → P2.3
Phase 3 (Icons) ─────────── P3.1 → P3.2 → P3.3
         │
         ▼
Phase 4 (Animation) ─────── all 7 tasks (mostly parallel, P4.4 needs P3.1, P4.6 needs P1.2)
         │
         ▼
Phase 5 (Loading) + Phase 6 (Decorative) ── parallel
         │
         ▼
Phase 7 (Validation)
```

Phases 1, 2, 3 can run in parallel.
Phase 4 depends on Phase 1 (colors) + Phase 3 (icons).
Phases 5 & 6 depend on Phase 4 (animation primitives).
Phase 7 is final gate.

---

## Storybook Strategy

Every amen.games UI component gets a Storybook story. Develop, review, and showcase the entire UI kit in isolation.

### Current Storybook Setup
- **Framework**: `@storybook/react-webpack5` (web-based)
- **Config**: `apps/storybook/.storybook/main.ts`
- **Story glob**: `packages/ui/**/*.stories.@(js|jsx|ts|tsx)` — amen components in `packages/ui/src/amen/` auto-discovered
- **Tailwind content**: `packages/ui/`, `packages/physics/`, `packages/theme/`
- **Pattern**: CSF3 (`Meta<typeof Component>` + `StoryObj`), `title` with folder hierarchy
- **Start**: `pnpm storybook` (devmux managed, port 6006)

### Architecture Decision

Amen UI primitives live in **`packages/ui/src/amen/`**. Storybook already scans `packages/ui/` — zero config changes needed. App-specific integrations (splash, loading) stay in `app/components/`.

### Storybook Sidebar Hierarchy

```
Amen/
  Theme/
    ColorPalette, Typography, GrainientPalette
  Icons/
    AmenIcon (gallery), per-icon with effects
  Animation/
    GlowIcon, FloatingElement, SparkleWrapper, DrawingIcon, ShimmerSurface, GrainOverlay
  Decor/
    MotifDivider, SectionOrnament, PatternBackground, HaloBadge
  Composition/
    CardWithEffects, LoadingScreen, EmptyState, ScreenMockup
```

### Story Template

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
```

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
    FloatingElement.tsx + FloatingElement.stories.tsx
    SparkleWrapper.tsx + SparkleWrapper.stories.tsx
    DrawingIcon.tsx + DrawingIcon.stories.tsx
    ShimmerSurface.tsx + ShimmerSurface.stories.tsx
    GrainOverlay.tsx + GrainOverlay.stories.tsx
  decor/
    MotifDivider.tsx + MotifDivider.stories.tsx
    SectionOrnament.tsx + SectionOrnament.stories.tsx
    PatternBackground.tsx + PatternBackground.stories.tsx
    HaloBadge.tsx + HaloBadge.stories.tsx
  theme/
    ColorPalette.stories.tsx                     ← color swatch documentation
    Typography.stories.tsx                       ← font specimen documentation
    GrainientPalette.stories.tsx                 ← gradient documentation
  compositions/
    CardWithEffects.stories.tsx                  ← hero showcase
    LoadingScreen.stories.tsx
    EmptyState.stories.tsx
    ScreenMockup.stories.tsx

app/components/AnimatedSplashScreen.tsx          ← add amen branch (exists)
app/components/game/AssetLoadingScreen.tsx        ← add amen branch (exists)
```

## Dependencies (No New Heavy Packages)

All implementation uses existing dependencies:
- `react-native-reanimated` — animation engine
- `react-native-svg` — SVG rendering
- `@expo/vector-icons` — MaterialCommunityIcons fallback
- `expo-font` — Lora font loading
- NativeWind / Tailwind CSS — theming
- `@shopify/react-native-skia` — already in project, for native grain shader (optional)

## Icon Sources (Licensing)

| Source | License | Usage |
|--------|---------|-------|
| Christicons | MIT-0 | Primary religious icons — no attribution needed |
| MaterialCommunityIcons | Apache 2.0 | Fallback icons — attribution in app credits |
| Custom SVGs | Owned | Fill gaps — lamb, specific motifs |
| game-icons.net | CC BY 3.0 | Game badges only — requires attribution |

## Color Reference

### Proposed Light Theme
```
--color-theme-background:      255 253 247    /* #FFFDF7 — near-white warm */
--color-theme-surface:         255 255 255    /* #FFFFFF */
--color-theme-surface-elevated: 253 248 235   /* #FDF8EB — soft cream */
--color-theme-border:          240 230 205    /* #F0E6CD — warm border */
--color-theme-text:            55 48 40       /* #373028 — warm dark */
--color-theme-text-secondary:  140 128 105    /* #8C8069 — warm gray */
--color-theme-primary:         201 168 76     /* #C9A84C — gold */
--color-theme-secondary:       27 58 107      /* #1B3A6B — navy accent */
--amen-glow-gold:              255 215 0      /* #FFD700 */
--amen-warm-white:             255 250 235    /* #FFFAEB */
--amen-soft-yellow:            255 241 186    /* #FFF1BA */
--amen-golden-accent:          218 165 32     /* #DAA520 — goldenrod */
```
