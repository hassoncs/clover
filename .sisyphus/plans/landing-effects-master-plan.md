# Landing Effects Master Plan

## TL;DR
> **Summary**: Implement a premium, shader-forward, scroll-choreographed landing experience across Slopcade's two landing surfaces with strict performance and accessibility guardrails.
> **Deliverables**:
> - Dual-surface effects architecture and dependency setup
> - Dramatic hero + section choreography + carousel modules
> - Fallback tiers (reduced motion, low-end device, no-WebGL)
> - Automated verification evidence for build, UX, and performance budgets
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: 1 -> 2 -> 4 -> 7 -> 10 -> 11

## Context
### Original Request
User asked to "plan it all out" for a dramatic landing refresh with cutting-edge shader/scroll/animation capabilities and modern npm libraries.

### Interview Summary
- User wants high-impact visuals ("threejs dramatic shader cool scroller stuff"), not baseline polish.
- Repo contains two active landing surfaces:
  - `apps/slopcade/app/landing.tsx`
  - `apps/landing-slopcade/src/pages/index.astro`
- Existing engine already includes reusable shader assets and animation primitives.

### Metis Review (gaps addressed)
- Metis flagged ambiguity on surface priority, complexity tier, and perf budget.
- Defaults applied in this plan to unblock execution:
  - Surface priority: both surfaces, app landing first then Astro parity.
  - Complexity tier: medium-high (2D shader cinematic effects; no full 3D gameplay scene requirement).
  - Performance budget: LCP <= 2.5s, FCP <= 1.5s on desktop broadband for landing route.
- Guardrails included: static fallback for every effect, no shader duplication, no UI-level platform branching, reduced-motion compliance, and explicit out-of-scope constraints.

## Work Objectives
### Core Objective
Ship an effects-rich landing experience that feels premium and cinematic while preserving reliability, accessibility, and performance on web and mobile-web targets.

### Deliverables
- Effects dependency matrix and runtime adapters for both landing surfaces.
- Hero shader scene, scroll choreography, text reveal system, and feature carousel.
- Tiered fallbacks (reduced-motion, static hero, low-power mode).
- Verification artifacts under `.sisyphus/evidence/` proving UX, build, and perf targets.

### Definition of Done (verifiable conditions with commands)
- `pnpm --filter @slopcade/slopcade-app build` exits 0.
- `pnpm --filter @slopcade/landing-slopcade build` exits 0.
- `pnpm build:types` exits 0.
- Landing routes render without runtime errors in browser verification runs.
- Reduced-motion mode renders static/non-flashing effects path.
- Performance evidence recorded with measured LCP/FCP/JS payload for both surfaces.

### Must Have
- Reuse existing shader inventory in `shared/src/effects/shaders` before adding new effect code.
- Scroll choreography with deterministic timelines and no layout thrash.
- Explicit adapter layer separating RN/Skia path and Astro/WebGL path.
- QA scenarios per task (happy + failure/edge), agent-executable only.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No "install everything" dependency sprawl beyond selected stack.
- No full-page 3D game simulation scope expansion.
- No audio-reactive or multiplayer landing effects in this execution.
- No missing fallback path for users with reduced motion or unsupported graphics features.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after + existing jest/vitest/playwright infrastructure + command-level validation.
- QA policy: Every task includes executable happy/edge scenarios and evidence output paths.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: foundation + architecture + dependency baselining (tasks 1-5)
Wave 2: feature implementation across surfaces (tasks 6-10)
Wave 3: performance/accessibility hardening + verification (tasks 11-12)

### Dependency Matrix (full, all tasks)
| Task | Blocks | Blocked By |
|---|---|---|
| 1. Surface Contract + Scope Lock | 2,3,4,5,6,7,8,9,10,11,12 | - |
| 2. Dependency Strategy + Package Wiring | 4,6,7,8,9,10 | 1 |
| 3. Effects Adapter Architecture | 4,6,7,8,9,10,11 | 1 |
| 4. Shared Shader Selection + Presets | 6,7,8,9 | 2,3 |
| 5. QA Harness + Evidence Scaffolding | 10,11,12 | 1 |
| 6. App Landing Hero Effects | 8,10,11 | 2,3,4 |
| 7. Astro Hero Effects | 9,10,11 | 2,3,4 |
| 8. App Scroll Choreography + Cards | 10,11 | 6 |
| 9. Astro Scroll Choreography + Carousel | 10,11 | 7 |
| 10. Fallback and Reduced-Motion Tiers | 11,12 | 5,6,7,8,9 |
| 11. Performance Budget Enforcement | 12 | 3,5,6,7,8,9,10 |
| 12. Final Cross-Surface Verification Pack | - | 5,10,11 |

### Agent Dispatch Summary (wave -> task count -> categories)
- Wave 1 -> 5 tasks -> deep, quick, unspecified-high
- Wave 2 -> 5 tasks -> visual-engineering, deep, quick
- Wave 3 -> 2 tasks -> unspecified-high, deep

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.


- [ ] 9. Astro Scroll Choreography + Feature Carousel

  **What to do**: Implement scroll narrative transitions across feature/how-it-works/CTA sections and add Embla-based showcase carousel with motion polish on Astro landing.
  **Must NOT do**: Do not create autoplay behavior that ignores reduced-motion preferences.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: Web-focused animation sequencing + carousel integration.
  - Skills: [`frontend-ui-ux`] — why needed: high-quality visual storytelling details.
  - Omitted: [`effects-system`] — why not needed: shader preset logic already established in prior task.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [10,11] | Blocked By: [7]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `apps/landing-slopcade/src/pages/index.astro:48` — features section anchor.
  - Pattern: `apps/landing-slopcade/src/pages/index.astro:69` — how-it-works section anchor.
  - Pattern: `apps/landing-slopcade/src/pages/index.astro:100` — CTA section anchor.
  - API/Type: `docs/product/LANDING_EFFECTS_LIBRARY_PROPOSAL.md` — Embla + motion pairing guidance.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Feature carousel and scroll transitions function on desktop and mobile widths.
  - [ ] Reduced-motion users receive non-autoplay, low-motion behavior.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```text
  Scenario: Carousel + scroll story happy path
    Tool: Playwright
    Steps: Interact with carousel controls and scroll through all sections.
    Expected: Carousel controls, keyboard navigation, and section transitions all work.
    Evidence: .sisyphus/evidence/task-9-astro-scroll-carousel.png

  Scenario: Reduced-motion edge case
    Tool: Playwright
    Steps: Emulate reduced-motion media preference and reload Astro landing.
    Expected: Autoplay disabled and transitions downgraded to static/simple states.
    Evidence: .sisyphus/evidence/task-9-astro-scroll-carousel-error.png
  ```

  **Commit**: YES | Message: `feat(landing): add astro scroll choreography and carousel` | Files: [`apps/landing-slopcade/src/pages/index.astro`, new carousel/effects components]

- [ ] 10. Fallback and Reduced-Motion Tiers

  **What to do**: Implement explicit effect tiers (`full`, `reduced`, `static`) with automatic runtime selection by feature support and user motion preference across both surfaces.
  **Must NOT do**: Do not ship animation paths that can flash/strobe in reduced mode.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: Cross-cutting runtime policy affecting every effect feature.
  - Skills: [`effects-system`, `testing-patterns`] — why needed: consistent fallback semantics + verifiability.
  - Omitted: [`game-authoring`] — why not needed: non-game route UX only.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [11,12] | Blocked By: [5,6,7,8,9]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `apps/slopcade/components/AnimatedSplashScreen.tsx:157` — fallback boundary pattern.
  - API/Type: `shared/src/effects/index.ts:108` — compatibility filter support.
  - Pattern: `apps/slopcade/app/landing.tsx:57` — root container where tier policy can be applied.
  - Pattern: `apps/landing-slopcade/src/pages/index.astro:25` — root body shell for static fallback mode hooks.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Tier policy is deterministic and testable for supported/unsupported/reduced-motion contexts.
  - [ ] Both routes remain fully usable under static tier.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```text
  Scenario: Tier selection happy path
    Tool: Playwright
    Steps: Run matrix: normal motion + modern GPU; reduced motion; low capability emulation.
    Expected: `full`, `reduced`, and `static` tiers each activate appropriately.
    Evidence: .sisyphus/evidence/task-10-fallback-tiers.txt

  Scenario: Unsupported graphics edge case
    Tool: Playwright
    Steps: Simulate unavailable WebGL/Skia path and reload landing routes.
    Expected: Static fallback renders with no blank hero/section crashes.
    Evidence: .sisyphus/evidence/task-10-fallback-tiers-error.txt
  ```

  **Commit**: YES | Message: `feat(landing): add cross-surface fallback tier policy` | Files: [shared landing runtime policy files + surface integrations]

- [ ] 11. Performance Budget Enforcement

  **What to do**: Add measurable guardrails for JS payload, LCP/FCP, and animation frame stability; tune effect intensity/loading strategy to satisfy budgets without visual collapse.
  **Must NOT do**: Do not defer all effects to pass metrics; retain premium identity within budget.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: optimization + instrumentation + tradeoff balancing.
  - Skills: [`testing-patterns`] — why needed: repeatable evidence-driven perf validation.
  - Omitted: [`frontend-ui-ux`] — why not needed: this task is budget enforcement, not aesthetic redesign.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [12] | Blocked By: [3,5,6,7,8,9,10]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `docs/product/LANDING_EFFECTS_LIBRARY_PROPOSAL.md` — performance guardrail baseline.
  - Pattern: `apps/landing-slopcade/src/pages/index.astro` — hydration control points (`client:*`).
  - Pattern: `apps/slopcade/app/landing.tsx` — section rendering hotspots for scroll work.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Recorded evidence shows landing targets meet agreed LCP/FCP budget.
  - [ ] No major frame drops during full-page scroll sequence in verification runs.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```text
  Scenario: Performance budget happy path
    Tool: Bash
    Steps: Run performance audit commands against both landing routes and capture metrics.
    Expected: LCP <= 2.5s and FCP <= 1.5s on configured baseline profile.
    Evidence: .sisyphus/evidence/task-11-performance-budget.json

  Scenario: Budget breach edge case
    Tool: Bash
    Steps: Run audit after enabling full effect stack with stress profile.
    Expected: Breach is detected and surfaced with actionable report output.
    Evidence: .sisyphus/evidence/task-11-performance-budget-error.json
  ```

  **Commit**: YES | Message: `perf(landing): enforce landing effects performance budgets` | Files: [perf scripts/config + effect loading optimizations]

- [ ] 12. Final Cross-Surface Verification Pack

  **What to do**: Execute comprehensive regression sweep across both landing routes (build/typecheck/functional/perf/accessibility) and publish final evidence index proving readiness.
  **Must NOT do**: Do not sign off with missing evidence artifacts.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: broad verification requiring disciplined evidence collation.
  - Skills: [`testing-patterns`] — why needed: consistent QA rigor and reporting.
  - Omitted: [`effects-system`] — why not needed: no new effect logic creation.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [] | Blocked By: [5,10,11]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `.sisyphus/evidence/` — artifact location contract.
  - Pattern: `playwright.config.ts` — browser automation runner.
  - Pattern: `package.json:74` — global typecheck command (`build:types`).
  - Pattern: `apps/slopcade/package.json:28` — app landing web build command.
  - Pattern: `apps/landing-slopcade/package.json:8` — Astro build command.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Full verification command suite exits cleanly.
  - [ ] Evidence index maps every task to at least one artifact file.
  - [ ] Ready-for-execution handoff notes contain no unresolved blockers.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```text
  Scenario: Full verification happy path
    Tool: Bash
    Steps: Run build/typecheck/playwright/perf/accessibility command suite and compile evidence index.
    Expected: All checks pass and evidence index is complete.
    Evidence: .sisyphus/evidence/task-12-final-verification.md

  Scenario: Missing evidence edge case
    Tool: Bash
    Steps: Intentionally omit one evidence file and run final verification indexer.
    Expected: Indexer fails with explicit missing-file list.
    Evidence: .sisyphus/evidence/task-12-final-verification-error.md
  ```

  **Commit**: YES | Message: `test(landing): publish final cross-surface verification pack` | Files: [verification scripts/reports]


- [ ] 5. QA Harness + Evidence Scaffolding

  **What to do**: Add deterministic landing verification harness for screenshots, route checks, and metric collection; standardize evidence file naming under `.sisyphus/evidence/task-*` for both surfaces.
  **Must NOT do**: Do not leave QA checks as manual prose-only steps.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: Multi-tool verification orchestration across web routes.
  - Skills: [`testing-patterns`] — why needed: align with existing verification conventions.
  - Omitted: [`effects-system`] — why not needed: focus is test/evidence framework, not effect behavior.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [10,11,12] | Blocked By: [1]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `playwright.config.ts` — existing browser automation configuration.
  - Pattern: `tests/e2e/party/vitest.config.ts` — integration test convention baseline.
  - Pattern: `.sisyphus/evidence/` — required evidence location convention.

  **Acceptance Criteria** (agent-executable only):
  - [ ] QA harness can capture screenshots for both landing surfaces and write artifacts to `.sisyphus/evidence/`.
  - [ ] At least one scripted command validates reduced-motion fallback mode.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```text
  Scenario: Evidence pipeline happy path
    Tool: Playwright
    Steps: Run landing verification script to capture baseline screenshots and route health output.
    Expected: Artifacts are generated in `.sisyphus/evidence/` with task-prefixed names.
    Evidence: .sisyphus/evidence/task-5-qa-harness.txt

  Scenario: Missing artifact edge case
    Tool: Bash
    Steps: Simulate failed screenshot generation step and execute harness.
    Expected: Harness exits non-zero and reports missing artifact path explicitly.
    Evidence: .sisyphus/evidence/task-5-qa-harness-error.txt
  ```

  **Commit**: YES | Message: `test(landing): add evidence harness for landing verification` | Files: [test/evidence scripts + config updates]

- [ ] 6. App Landing Hero Effects

  **What to do**: Upgrade `apps/slopcade/app/landing.tsx` hero with layered shader background, headline reveal choreography, and CTA motion states using Skia/Reanimated-compatible implementation path.
  **Must NOT do**: Do not break existing waitlist flow or non-web redirect behavior.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: High-impact hero effect implementation on RN Web surface.
  - Skills: [`effects-system`, `nativewind-theming`] — why needed: shader + style integration in existing design language.
  - Omitted: [`agent-orchestration`] — why not needed: no backend/chat orchestration changes.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [8,10,11] | Blocked By: [2,3,4]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `apps/slopcade/app/landing.tsx:61` — hero section insertion point.
  - Pattern: `apps/slopcade/app/landing.tsx:48` — existing smooth scroll CTA behavior.
  - Pattern: `apps/slopcade/components/AnimatedSplashScreen.tsx:132` — Reanimated style binding pattern.
  - API/Type: `shared/src/effects/index.ts:98` — shader registry access.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Hero renders effect layer without obscuring heading/CTA readability.
  - [ ] Waitlist CTA still scrolls/focuses email input and mutation flow remains intact.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```text
  Scenario: Hero effects + waitlist happy path
    Tool: Playwright
    Steps: Open web landing route, validate hero animation, click CTA, verify scroll-to-email and submit validation behavior.
    Expected: Visual effects run smoothly; form behavior unchanged from baseline.
    Evidence: .sisyphus/evidence/task-6-app-hero-effects.png

  Scenario: Graphics fallback edge case
    Tool: Playwright
    Steps: Run with reduced-motion or forced low-performance mode.
    Expected: Static/low-motion hero fallback appears with no runtime errors.
    Evidence: .sisyphus/evidence/task-6-app-hero-effects-error.png
  ```

  **Commit**: YES | Message: `feat(landing): add cinematic hero effects on app landing` | Files: [`apps/slopcade/app/landing.tsx`, new effect components]

- [ ] 7. Astro Hero Effects

  **What to do**: Implement Astro hero effects island(s) using approved premium stack (R3F/WebGL + GSAP/Lenis + text reveal), with SEO-safe static shell and progressive enhancement hydration.
  **Must NOT do**: Do not block first paint on heavy JS initialization.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: WebGL+scroll choreography in Astro runtime.
  - Skills: [`frontend-ui-ux`] — why needed: premium interaction quality and composition.
  - Omitted: [`native-infrastructure`] — why not needed: task targets Astro web app.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [9,10,11] | Blocked By: [2,3,4]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `apps/landing-slopcade/src/pages/index.astro:35` — hero baseline block.
  - Pattern: `apps/landing-slopcade/src/pages/index.astro:44` — CTA retention point.
  - API/Type: `apps/landing-slopcade/package.json:12` — dependency context for Astro/React islands.
  - External: `docs/product/LANDING_EFFECTS_LIBRARY_PROPOSAL.md` — approved stack + hydration strategy.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Hero displays progressive-enhanced effects while preserving semantic HTML content.
  - [ ] Lighthouse/route checks confirm no blank hero on slow initialization.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```text
  Scenario: Astro hero enhancement happy path
    Tool: Playwright
    Steps: Load Astro landing, capture first paint and post-hydration screenshot, verify headline/CTA presence in both states.
    Expected: Static hero visible immediately; enhanced effects appear after hydration.
    Evidence: .sisyphus/evidence/task-7-astro-hero-effects.png

  Scenario: JS-disabled/slow-init edge case
    Tool: Playwright
    Steps: Emulate blocked JS or delayed scripts and reload page.
    Expected: Static hero content remains readable and complete.
    Evidence: .sisyphus/evidence/task-7-astro-hero-effects-error.png
  ```

  **Commit**: YES | Message: `feat(landing): add cinematic hero effects on astro landing` | Files: [`apps/landing-slopcade/src/pages/index.astro`, new islands/components]

- [ ] 8. App Scroll Choreography + Section Effects

  **What to do**: Add section-by-section reveal choreography and card motion for game showcase/how-it-works/pricing blocks in `apps/slopcade/app/landing.tsx`, driven by scroll progress and preset effect tokens.
  **Must NOT do**: Do not introduce layout thrash via expensive per-frame measurement loops.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: Complex motion sequencing across multiple sections.
  - Skills: [`input-handling`, `nativewind-theming`] — why needed: scroll signal handling + consistent visual language.
  - Omitted: [`economy-engine`] — why not needed: no economy logic touched.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [10,11] | Blocked By: [6]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `apps/slopcade/app/landing.tsx:109` — game showcase section.
  - Pattern: `apps/slopcade/app/landing.tsx:166` — how-it-works section.
  - Pattern: `apps/slopcade/app/landing.tsx:204` — pricing section.
  - Pattern: `apps/slopcade/app/landing.tsx:358` — card component boundaries for motion wrappers.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Sections animate into view in deterministic sequence with no interaction regressions.
  - [ ] Scroll performance remains stable during section transitions.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```text
  Scenario: Section choreography happy path
    Tool: Playwright
    Steps: Scroll through full landing route and capture section-by-section screenshots/video.
    Expected: Reveal order matches design spec and no jittering/reflow spikes are visible.
    Evidence: .sisyphus/evidence/task-8-app-scroll-choreo.mp4

  Scenario: Fast-scroll edge case
    Tool: Playwright
    Steps: Simulate rapid scroll jumps from hero to footer and back.
    Expected: Animations recover correctly; no stuck hidden sections.
    Evidence: .sisyphus/evidence/task-8-app-scroll-choreo-error.mp4
  ```

  **Commit**: YES | Message: `feat(landing): add app landing scroll choreography` | Files: [`apps/slopcade/app/landing.tsx`, section effect modules]


- [ ] 1. Surface Contract + Scope Lock

  **What to do**: Define canonical execution target order and formal scope boundaries in implementation notes: (a) `apps/slopcade/app/landing.tsx` first, (b) `apps/landing-slopcade/src/pages/index.astro` parity second; lock medium-high 2D shader scope and prohibit unplanned 3D/auditory expansion.
  **Must NOT do**: Do not change shipped marketing copy or pricing semantics while defining effect scope.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: Requires cross-surface architecture decisions and strict boundary setting.
  - Skills: [`writing-plans`] — why needed: enforce decision-complete execution contract.
  - Omitted: [`frontend-ui-ux`] — why not needed: no implementation/UI styling yet.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2,3,4,5,6,7,8,9,10,11,12] | Blocked By: []

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `apps/slopcade/app/landing.tsx:56` — section-structured landing composition.
  - Pattern: `apps/landing-slopcade/src/pages/index.astro:35` — static hero-first layout baseline.
  - API/Type: `apps/slopcade/package.json:4` — route stack rooted in expo-router entry.
  - External: `docs/product/LANDING_EFFECTS_LIBRARY_PROPOSAL.md` — prior dependency recommendations to align scope.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Execution notes explicitly state surface order, in-scope, and out-of-scope constraints.
  - [ ] No conflicting implementation direction remains in task handoff artifacts.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```text
  Scenario: Scope contract is complete
    Tool: Bash
    Steps: Read the generated plan/tasks and verify explicit "IN/OUT" boundary + surface priority are present.
    Expected: Contract includes both surfaces, effect tier, and prohibitions (no scope creep items).
    Evidence: .sisyphus/evidence/task-1-surface-contract.md

  Scenario: Scope ambiguity check
    Tool: Bash
    Steps: Search task text for unresolved placeholders like "TBD", "decide later", "maybe".
    Expected: No unresolved decision placeholders remain.
    Evidence: .sisyphus/evidence/task-1-surface-contract-error.md
  ```

  **Commit**: NO | Message: `chore(landing): define execution scope contract` | Files: [handoff/plan artifacts only]

- [ ] 2. Dependency Strategy + Package Wiring

  **What to do**: Finalize and apply package strategy by surface: app landing reuses existing Skia/Reanimated stack; Astro landing adds selected premium libs (`three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `postprocessing`, `gsap`, `lenis`, `motion`, `split-type`, `embla-carousel*`).
  **Must NOT do**: Do not add redundant overlapping animation stacks beyond approved set.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: Mostly deterministic dependency and manifest work.
  - Skills: [`native-infrastructure`] — why needed: maintain workspace/package constraints and existing conventions.
  - Omitted: [`effects-system`] — why not needed: task is dependency wiring, not shader implementation.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [4,6,7,8,9,10] | Blocked By: [1]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `apps/slopcade/package.json:52` — existing Skia dependency baseline.
  - Pattern: `apps/slopcade/package.json:104` — existing reanimated baseline.
  - Pattern: `apps/landing-slopcade/package.json:12` — current Astro dependency set.
  - Pattern: `docs/product/LANDING_EFFECTS_LIBRARY_PROPOSAL.md` — approved library shortlist and install sets.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Added dependencies resolve with lockfile update and no peer-resolution errors.
  - [ ] `pnpm --filter @slopcade/landing-slopcade build` succeeds after dependency updates.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```text
  Scenario: Dependency install/build happy path
    Tool: Bash
    Steps: Run package install/update, then `pnpm --filter @slopcade/landing-slopcade build`.
    Expected: Build exits 0; no unresolved module import errors.
    Evidence: .sisyphus/evidence/task-2-dependency-wiring.txt

  Scenario: Peer/dependency conflict edge case
    Tool: Bash
    Steps: Re-run workspace install and inspect for duplicate/conflicting animation/runtime packages.
    Expected: No fatal peer conflicts; dependency graph remains consistent.
    Evidence: .sisyphus/evidence/task-2-dependency-wiring-error.txt
  ```

  **Commit**: YES | Message: `chore(landing): add premium effects dependency stack` | Files: [`apps/landing-slopcade/package.json`, `pnpm-lock.yaml`]

- [ ] 3. Effects Adapter Architecture

  **What to do**: Introduce adapter contract that maps shared effect intents to platform runtime implementations: RN app uses Skia path, Astro uses WebGL/R3F path; centralize effect descriptors and avoid branching effect logic inside section components.
  **Must NOT do**: Do not duplicate shader parameter schemas in multiple components.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: Cross-runtime architecture with long-term maintainability implications.
  - Skills: [`effects-system`] — why needed: leverage existing effect metadata/registry patterns.
  - Omitted: [`native-infrastructure`] — why not needed: no native build changes required.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [4,6,7,8,9,10,11] | Blocked By: [1]

  **References** (executor has NO interview context — be exhaustive):
  - API/Type: `shared/src/effects/index.ts:91` — canonical shader registry exports.
  - API/Type: `shared/src/effects/index.ts:106` — shader source retrieval helpers.
  - Pattern: `apps/slopcade/components/AnimatedSplashScreen.tsx:160` — async Skia visual component loading pattern.
  - Pattern: `apps/slopcade/app/landing.tsx:59` — scroll root for effect orchestration hooks.

  **Acceptance Criteria** (agent-executable only):
  - [ ] New adapter contract compiles on both landing surfaces without runtime branching in section JSX.
  - [ ] Shared descriptor source is single-source-of-truth for effect presets.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```text
  Scenario: Adapter contract happy path
    Tool: Bash
    Steps: Run `pnpm build:types` and both landing builds.
    Expected: Typecheck/build pass; adapter imports resolve for both surfaces.
    Evidence: .sisyphus/evidence/task-3-adapter-architecture.txt

  Scenario: Missing adapter mapping edge case
    Tool: Bash
    Steps: Trigger a build path with an intentionally unsupported effect key in test fixture.
    Expected: Graceful fallback path and clear error message, no crash.
    Evidence: .sisyphus/evidence/task-3-adapter-architecture-error.txt
  ```

  **Commit**: YES | Message: `feat(landing): add cross-surface effects adapter contract` | Files: [new landing effects architecture files]

- [ ] 4. Shared Shader Selection + Presets

  **What to do**: Curate 8-12 landing-safe shaders from `shared/src/effects/shaders` and define normalized presets (hero, section-divider, spotlight, ambient) including safe defaults for color intensity, motion speed, and opacity.
  **Must NOT do**: Do not ship raw unbounded shader params that can cause strobe/high-frequency flashing.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: Requires visual selection plus runtime-safe parameter tuning.
  - Skills: [`effects-system`] — why needed: shader metadata and compatibility constraints.
  - Omitted: [`editor-system`] — why not needed: landing effect presets are independent of editor UI.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [6,7,8,9] | Blocked By: [2,3]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `shared/src/effects/shaders/post/rbAurora.glsl` — ambient cinematic baseline.
  - Pattern: `shared/src/effects/shaders/post/rbGalaxy.glsl` — hero-depth variant candidate.
  - Pattern: `shared/src/effects/shaders/post/rbGrainient.glsl` — texture/noise atmospheric pass.
  - Pattern: `shared/src/effects/shaders/post/ripple.glsl` — controlled motion accent for transitions.
  - API/Type: `shared/src/effects/index.ts:108` — compatibility filtering (`getSkSLCompatibleShaderKeys`).

  **Acceptance Criteria** (agent-executable only):
  - [ ] Preset catalog exists with documented allowed parameter ranges.
  - [ ] All selected presets have explicit fallback mapping for unsupported runtime.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```text
  Scenario: Preset rendering happy path
    Tool: Playwright
    Steps: Load each preset demo route/section and capture screenshots.
    Expected: Presets render without artifacts and maintain readable foreground text.
    Evidence: .sisyphus/evidence/task-4-shader-presets.png

  Scenario: Compatibility fallback edge case
    Tool: Bash
    Steps: Run compatibility filter for SkSL/WebGL and simulate unsupported preset selection.
    Expected: Unsupported shader routes to mapped fallback preset.
    Evidence: .sisyphus/evidence/task-4-shader-presets-error.txt
  ```

  **Commit**: YES | Message: `feat(landing): add curated shader preset catalog` | Files: [landing effects preset files]


## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit - oracle
- [ ] F2. Code Quality Review - unspecified-high
- [ ] F3. Real Manual QA - unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check - deep

## Commit Strategy
- Commit per completed wave to keep rollback boundaries clear.
- Use conventional commits with explicit scope:
  - `feat(landing): add effect adapter architecture`
  - `feat(landing): implement hero shader choreography`
  - `perf(landing): add fallback tiers and budget guards`
  - `test(landing): add landing verification scenarios`

## Success Criteria
- Both landing surfaces present cinematic effect identity while preserving usability.
- All acceptance criteria in tasks 1-12 pass with recorded evidence files.
- No unresolved critical regressions in performance, accessibility, or route stability.
- Executor can run `/start-work` with zero additional decision-making.
