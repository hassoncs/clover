# Slopcade Landing: Premium Effects Library Proposal

Goal: move the Slopcade landing experience from basic static sections to a high-drama, shader-heavy, scroll-choreographed experience.

This is a package strategy doc: what to install, what to avoid, and what stack combinations give the best visual payoff.

## Current Baseline (What exists now)

There are two landing surfaces in this repo:

- Primary app/web landing route: `apps/slopcade/app/landing.tsx` (React Native Web via Expo Router)
- Astro marketing site: `apps/landing-slopcade/src/pages/index.astro`

- Current advanced capabilities already present in primary app:
  - `@shopify/react-native-skia`
  - `react-native-reanimated`
  - Existing shader catalog under `shared/src/effects/shaders/`
- Astro site currently has no dedicated advanced animation stack yet (no GSAP, no Three.js, no smooth-scroll system)

## Important Decision: Which landing stack are we upgrading?

### Option A (recommended for immediate impact): `apps/slopcade/app/landing.tsx`
- Use existing RN Web stack (Skia + Reanimated)
- Lowest integration risk because shader/animation infrastructure already exists
- Best when we want parity with app shell and shared components

### Option B: `apps/landing-slopcade` (Astro)
- Use DOM/WebGL-first stack (GSAP/Lenis/Three)
- Best for award-site storytelling and SEO-first static shell
- Better for aggressive experimental visuals, but separate from app route

## Recommended Stack (Best visual impact)

If we want the "award-site" look, use this combo:

1. 3D and shaders
   - `three`
   - `@react-three/fiber`
   - `@react-three/drei`
   - `@react-three/postprocessing`
   - `postprocessing`

2. Scroll choreography and timeline control
   - `gsap`
   - `lenis`

3. React motion for UI micro-interactions
   - `motion`

4. Text reveal and editorial motion
   - `split-type`

5. Slider/carousel
   - `embla-carousel`
   - `embla-carousel-react`
   - `embla-carousel-autoplay`

## Optional "Extra Sauce" Libraries

Use these only where they clearly increase wow-factor.

- `ogl` (ultra-light WebGL alternative for specific sections)
- `glsl-noise` (faster shader prototyping)
- `troika-three-text` (high-quality animated 3D text)
- `leva` (internal tuning panel during development only)

## Install Set (Ready to run)

### For Astro landing (`@slopcade/landing-slopcade`)

Run from repo root:

```bash
pnpm --filter @slopcade/landing-slopcade add three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing gsap lenis motion split-type embla-carousel embla-carousel-react embla-carousel-autoplay
```

Optional extras:

```bash
pnpm --filter @slopcade/landing-slopcade add ogl glsl-noise troika-three-text
pnpm --filter @slopcade/landing-slopcade add -D leva
```

## What each library is for (practical use)

- `three` + R3F stack
  - Hero shader backgrounds
  - Interactive 3D objects responding to scroll and mouse movement
  - Post-processing glow/bloom for cinematic polish

- `gsap`
  - Section timelines, scroll pinning, scrubbed transitions
  - Reliable sequencing for complex narrative landing sections

- `lenis`
  - Smooth scrolling foundation
  - Pairs cleanly with GSAP-driven choreography

- `motion`
  - Buttons, cards, hover states, entrance animations in React islands
  - Cleaner for component-level motion than using GSAP everywhere

- `split-type`
  - Character/word/line split reveals
  - Signature hero headline animation style

- `embla-carousel`
  - Device-safe, performant sliders for demos, testimonials, feature reels

## Recommended Architecture for Astro

Use Astro static shell + React islands for effects-heavy sections:

- Keep content sections static for SEO/perf
- Hydrate only high-impact sections:
  - Hero shader canvas
  - Scroll choreography wrapper
  - Carousel/gallery strip

Suggested component layout:

- `src/components/effects/HeroShaderScene.tsx`
- `src/components/effects/ScrollDirector.tsx`
- `src/components/effects/SplitHeadline.tsx`
- `src/components/effects/FeatureCarousel.tsx`

Hydration strategy:

- Use `client:visible` for below-the-fold modules
- Use `client:load` only for above-the-fold hero effects

## Pairing Patterns (Battle-tested combos)

### Combo A: Cinematic Hero
- R3F shader scene + GSAP timeline + split-type headline

### Combo B: Product Story Scroll
- Lenis smooth scroll + GSAP pinned sections + motion micro-interactions

### Combo C: Social Proof Reel
- Embla carousel + motion card transitions + light GSAP entrance sequence

## Performance Guardrails (Do not skip)

- Lazy-load all 3D sections (`import()` and dynamic islands)
- Set a hard GPU budget: one heavy shader scene above the fold, not three
- Respect reduced motion preferences
- Keep fallback static visuals for low-end/mobile
- Avoid running GSAP + motion on same property simultaneously

## Anti-Patterns to Avoid

- Using every effects library everywhere (visual noise + runtime conflicts)
- Building full-page WebGL when only hero needs it
- Scroll-jacking beyond subtle smoothing
- Hydrating the entire page for tiny interactions

## Proposed Implementation Order

Phase 1 (foundation):
1. Add `lenis` + `gsap`
2. Add `motion` for UI interactions
3. Add `split-type` for hero text reveals

Phase 2 (visual leap):
1. Add `three` + R3F + drei
2. Build one high-quality hero shader section
3. Add post-processing sparingly

Phase 3 (conversion polish):
1. Add Embla feature/demo carousel
2. Add section transitions and staged reveal timing
3. Tune mobile fallback and reduced-motion behavior

## Decision Summary

If we want "latest and greatest" without chaos:

- For `apps/slopcade/app/landing.tsx`: prioritize existing `Skia + Reanimated + shared shaders`, then add `embla` only if needed.
- For `apps/landing-slopcade`: use `three + R3F + drei`, `gsap + lenis`, `motion`, `split-type`, and `embla-carousel`.

This gives dramatic shaders, premium scroll storytelling, and modern UI motion while staying practical for Astro and performance-sensitive landing pages.
### For primary app landing (`@slopcade/slopcade-app`)

Most core effects infra is already installed. If you want a DOM-style carousel on web only, add:

```bash
pnpm --filter @slopcade/slopcade-app add embla-carousel embla-carousel-react embla-carousel-autoplay
```

For the primary app landing, the bigger win is not new dependencies. It is wiring existing Skia shaders and Reanimated scroll progress into hero/section effects.
