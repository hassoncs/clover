
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

## [2026-02-26] Task 36: Remaining issues after shim cleanup

**`apps/slopcade/lib/party/template-types.ts` is a broken shim**
- File contains: `export * from "@slopcade/party"`
- `@slopcade/party` is NOT in `apps/slopcade/package.json` (removed in task 30)
- Still referenced by `apps/slopcade/components/browse/GameHallTile.tsx` and `apps/slopcade/hooks/useBrowsePartyGames.ts`
- These files use the `PartyTemplate` type from the package
- Fix needed: Either remove the party-related browse UI (redesign for creator context) or replace the `PartyTemplate` type with a local type definition
- Left in place per task instructions ("keep shims that are still imported")

**knip cannot run in this monorepo**
- `apps/shader-editor/metro.config.js` references `tailwind.config` which doesn't exist at repo root
- This causes knip to error out on load; workaround is to either fix the tailwind config or exclude shader-editor from knip config

## [2026-02-26] Task fixed: biblequizzle test + UI platform stubs + SharedValue

**biblequizzle.test.ts** had two stale field names in the fixture:
- `category` (string) → should be `categories` (string array) — matches `BibleQuizzleRawQuestion` interface
- `correct_answer` → should be `answer` — matches interface field name used by implementation
- Additionally removed unused `incorrect_answers` and `difficulty` fields (not in interface, ignored at runtime)

**packages/ui platform stub pattern**: TypeScript tsc cannot resolve Metro platform-specific files (.web.tsx/.native.tsx) without a base .tsx stub. Fix: create `ComponentName.tsx` that re-exports from `ComponentName.web.tsx`. Created stubs for:
- `packages/ui/src/amen/animation/AmenGrainOverlay.tsx`
- `packages/ui/src/amen/animation/DrawingIcon.tsx`
- `packages/ui/src/amen/loading/AmenSplashSequence.tsx`

**react-native-reanimated v4 SharedValue**: Not in `Animated` namespace. Import directly: `import type { SharedValue } from 'react-native-reanimated'`.
