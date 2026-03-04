# Landing Effects Library — Premium Visual Experience

## TL;DR
> **Summary**: Transform the Slopcade Astro landing from basic static sections to a high-drama, shader-heavy, scroll-choreographed award-site experience.
> **Deliverables**:
> - Effects library installed (three/R3F, gsap/lenis, motion, split-type, embla)
> - Hero shader scene with cinematic visuals
> - Scroll-choreographed section reveals
> - Text reveal animations
> - Feature carousel
> - Reduced motion + mobile fallbacks
> **Effort**: M
> **Parallel**: YES - 3 waves
> **Critical Path**: T1 → T2 → T3 → T4 → T5 → T8

## Context
### Original Request
- Convert `docs/product/LANDING_EFFECTS_LIBRARY_PROPOSAL.md` into actionable plan and execute
- Target: `apps/landing-slopcade` (Astro marketing site)
- Goal: Award-site quality visuals with shader effects, smooth scroll, and premium animations

### Current State
- Basic Astro landing at `apps/landing-slopcade/src/pages/index.astro`
- Dependencies: Astro + React + Tailwind only
- No effects stack, no 3D, no scroll choreography

### Target Stack (from proposal)
1. **3D/Shaders**: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `postprocessing`
2. **Scroll**: `gsap`, `lenis`
3. **UI Motion**: `motion`
4. **Text**: `split-type`
5. **Carousel**: `embla-carousel`, `embla-carousel-react`, `embla-carousel-autoplay`

## Work Objectives
### Deliverables
- All effects dependencies installed
- HeroShaderScene component with WebGL shader background
- ScrollDirector component with Lenis + GSAP scroll choreography
- SplitHeadline component with character/word reveal animations
- FeatureCarousel component with Embla
- Section transitions with staged reveals
- Reduced motion respect + mobile fallbacks

### Definition of Done
- `pnpm --filter @slopcade/landing-slopcade build` succeeds
- Hero section has shader background visible on desktop
- Scroll feels smooth with Lenis
- Headlines reveal with animation on scroll
- Carousel functional with autoplay
- Reduced motion preference disables all animations
- Mobile loads performant fallback (no heavy 3D)

### Must NOT Have
- No scroll-jacking beyond smooth scrolling
- No hydration of entire page (islands only)
- No running GSAP + motion on same properties
- No multiple heavy shader scenes (one hero only)

## Verification Strategy
- Visual QA in browser at each component milestone
- Lighthouse performance check (target: 90+ mobile, 95+ desktop)
- Reduced motion testing via browser dev tools

## Execution Strategy
### Waves
- Wave 1: Foundation (T1-T3) — dependencies, smooth scroll, text reveals
- Wave 2: Visual Leap (T4-T6) — 3D hero, post-processing, section transitions
- Wave 3: Polish (T7-T8) — carousel, fallbacks, final QA

### Dependency Matrix
- T1 blocks T2-T7 (dependencies required)
- T2 + T3 can run in parallel after T1
- T4-T6 can run in parallel after T1
- T7 requires T3
- T8 requires all previous

## TODOs
> Implementation + Test = ONE task.

- [x] 1. Install Effects Dependencies ✅
  **COMPLETED**: 2026-03-04 — Commit: 262804dfa

- [x] 2. Lenis Smooth Scroll Foundation ✅
  **COMPLETED**: 2026-03-04 — Commit: 7e94aaa73 (fixed: 4b27db616)

- [x] 3. SplitHeadline Text Reveal Component ✅
  **COMPLETED**: 2026-03-04 — Commit: 8dda295e0

- [x] 4. HeroShaderScene WebGL Component ✅
  **COMPLETED**: 2026-03-04 — Commit: 0d30cebc9

- [x] 5. Section Transitions with GSAP ✅
  **COMPLETED**: 2026-03-04 — Commit: a65881310

- [x] 6. Post-Processing Effects (Optional Bloom) ⏭️
  **SKIPPED**: Merged into T4 for simplicity — HeroShaderScene handles basic effects

- [x] 7. FeatureCarousel with Embla ✅
  **COMPLETED**: 2026-03-04 — Commit: 5769eed15

- [x] 8. Integrate Effects into Landing Page + Final Polish ✅
  **COMPLETED**: 2026-03-04 — Commit: e6521aa7a

## Final Verification Wave
- [x] F1. Visual QA — Build succeeds, components render
- [x] F2. Mobile fallbacks — HeroShaderScene handles WebGL detection
- [x] F3. Reduced motion — Global CSS disables animations
- [ ] F4. Lighthouse scores — Requires manual testing in browser

## Success Criteria
- Premium award-site visual quality on desktop
- Performant mobile experience with fallbacks
- Accessible (reduced motion support)
- Build succeeds without errors
