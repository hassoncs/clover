
- PartyConfigProvider runtime config is required before calling createPartyRoom from package API; missing provider will throw.

- `packages/editor-ai` typecheck initially pulled full `@slopcade/ui` source graph; resolved by tsconfig path alias to local typed shim (`src/types/slopcade-ui.ts`) for package-local compilation.
- `npx tsc --noEmit -p packages/editor/tsconfig.json` still fails due deep cross-workspace type coupling (`@slopcade/shared`, `@slopcade/ui`, `@slopcade/game-runtime`, `@slopcade/godot-bridge`) and unresolved generated/resource modules. (NOTE: This was resolved — editor now passes cleanly.)
- `@slopcade/editor` currently requires host wiring for `EditorConfigProvider`; shims alone do not provide runtime config injection yet.
- Strict type compatibility issues remain in copied editor files where shared type contracts are broad or unresolved after package extraction.

## [2026-02-26] Task 33: Pre-existing tsc errors (not app-split related)

These errors exist in all apps and are NOT caused by the app-split work. They need separate fixes:

1. **Missing UI components** — `packages/ui/src/amen/animation/index.ts` references `./AmenGrainOverlay` and `./DrawingIcon`; `packages/ui/src/amen/loading/index.ts` references `./AmenSplashSequence`. These files don't exist (likely deleted or never created).

2. **react-native-reanimated SharedValue** — `packages/ui/src/GameHallCarousel/GameHallCarousel.tsx` uses `SharedValue` from the `Animated` namespace, but it's not exported there in reanimated 4.x. Should import `SharedValue` directly from `react-native-reanimated`.

3. **GLSL type declarations** — `shared/src/effects/shaders/index.ts` and all `.meta.ts` files import `.glsl` files without type declarations. Need a `*.glsl` module declaration in a global `.d.ts` file accessible to all apps.
