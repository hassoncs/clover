
- Created @slopcade/party as standalone workspace package with DI-based config for auth/env/storage/narration.
- Added TypeScript path stubs in package-local declarations to keep package-only typecheck isolated from upstream package source quirks.

- Extracted social UI into `packages/social` with a `SocialProvider` + `useSocialTRPC()` context to remove direct `@/lib/trpc/react` coupling.
- Extracted create-game chat UI into `packages/editor-ai` and injected speech support via `ChatTextArea` `useSpeechToText` prop to remove app-local hook dependency.
- Re-export shims in `apps/slopcade/components/social/*` and `apps/slopcade/components/create-game/*` can safely point to package root (`export * from "@slopcade/..."`) without path churn for existing imports.
- Extracted `apps/slopcade/components/editor/` into `packages/editor/src/` with preserved folder layout and copied supporting hooks into `packages/editor/src/hooks/`.
- Added dependency injection surface via `packages/editor/src/editor-context.tsx` for tRPC/chat/storage and rewired editor imports off `@/` aliases.
- Re-export shim strategy works with `export * from "@slopcade/editor";` replacements across editor component files outside `__tests__`.
- Added local `packages/editor/src/config/env.ts` to replace app-local env asset URL helpers.
- `packages/editor/tsconfig.json` now compiles standalone by mapping app-coupled imports (`@slopcade/ui`, editor-ai, game-runtime, godot-bridge, app-lib physics) to local declaration shims under `packages/editor/src/types/shims/`.
- Excluding `__tests__` and `*.test.*` from package tsconfig avoids coupling test-only app globals during package typecheck.
- `npx tsc --noEmit -p packages/editor/tsconfig.json` is now clean.

## [2026-02-26] Task: Scaffold shader-editor (tasks 27-29)

- Created `apps/shader-editor/` as a minimal Expo Router shell — NOT a copy of slopcade. Only the essential config files and stub tab screens.
- Port 8088 is set in: `metro.config.js` (METRO_PORT const), `package.json` scripts (RCT_METRO_PORT=8088), `plugins/withMetroPort.js` (METRO_PORT='8088'), devmux `metro-shader` service health check.
- Excluded from deps: `@slopcade/party`, `@slopcade/game-bundler`, `@slopcade/economy-engine` (confirmed these are game-builder-specific, not needed for shader editing).
- Included: `@slopcade/editor`, `@slopcade/editor-ai`, `@slopcade/social`, `@slopcade/shared-ui` — all resolved correctly after `pnpm install --ignore-scripts`.
- Parallel agent (slopbox) had already updated pnpm-workspace.yaml and devmux.config.json before this task ran. Safe to add entries without overwriting theirs.
- The `app/_layout.tsx` is intentionally minimal (no TRPCProvider/AuthProvider/BrandProvider) — these require local lib/ implementations that can be wired up in a follow-on task.
- Tabs: Feed, Browse, Maker, Profile — all stubs with placeholder UI. Maker tab is the shader editor entry point (to be wired to `@slopcade/editor` shader panels).
- `plugins/withCameraFrameProcessor.js` was NOT copied or referenced in app.json — shader-editor doesn't need VisionCamera/react-native-vision-camera.
- Successfully committed a large changeset (823 files) for the app-split-plan work.
- Coordinated multi-file changes across packages/ and apps/ were grouped into a single atomic commit as requested.
- Verified that 'git add .' correctly captures new app shells and extracted packages.

## [2026-02-26] Task: Scaffold slopbox (tasks 23-26)

### What was done
- Copied `apps/amen/` to `apps/slopbox/` via rsync (excluding node_modules, ios, android, .expo, dist)
- Updated all brand-specific config files: app.json, app.config.ts, metro.config.js, package.json
- Port assignment: slopbox uses **8087** (slopcade=8085, amen=8086, slopbox=8087, shader-editor=8088)
- Added SLOPBOX_BRAND config to `shared/src/brands/config.ts` (getBrandConfig wasn't extensible otherwise)
- Added `metro-slopbox`, `ios-slopbox`, `web-slopbox` services to devmux.config.json
- Added `dev:slopbox`, `web:slopbox`, `ios:slopbox`, `android:slopbox` to root package.json
- Added `apps/slopbox` to pnpm-workspace.yaml
- Created `apps/slopbox/assets/brands/slopbox/` (copy of amen assets as placeholder)
- Updated all brand-identity strings: domain (slopbox.tv), bundleId (tv.slopbox.app), storage keys, filesystem paths
- Left `@slopcade/ui/amen` imports in place — slopbox doesn't have its own UI components yet (placeholder)

### Key gotchas
- `getBrandConfig()` in `shared/src/brands/config.ts` needs explicit BRANDS record entry — doesn't auto-discover from packages/brands manifests
- `scripts/preflight-check.mjs` hardcodes the expected port — needs updating when copying app shell
- `plugins/withMetroPort.js` also hardcodes the port as a string constant
- Many amen brand strings were scattered in lib/ files (storage keys, filesystem paths, trpc headers)
- The copy is intentionally shallow: `@slopcade/ui/amen` imports remain as placeholders for later branding work
- `apps/shader-editor` was already in pnpm-workspace.yaml when this task ran (parallel agent work)
## [2026-02-26] Task 37: Update AGENTS.md
- Updated Metro port table to include all 4 apps (slopcade: 8085, amen: 8086, slopbox: 8087, shader-editor: 8088).
- Added new scripts for slopbox and shader-editor to the scripts table.
- Documented product category distinction (Creator Tools vs Party Players).
- Updated RCT_METRO_PORT range to 8085-8088.
- Added 'Party System' and 'Game Editor' to the Project Context skills table.
- Verified that all new root scripts from package.json are reflected in AGENTS.md.

## [2026-02-26] Task 30: Remove party from slopcade

**What was removed:**
- `apps/slopcade/app/party/` directory (5 files: `_layout.tsx`, `index.tsx`, `host.tsx`, `join.tsx`, `play.tsx`)
- `<Stack.Screen name="party" />` from `apps/slopcade/app/_layout.tsx`
- `"@slopcade/party": "workspace:*"` from `apps/slopcade/package.json` dependencies

**Gotchas:**
- Party was NOT a tab in `(tabs)/_layout.tsx` — it was a root Stack screen accessible via navigation from other screens (e.g., browse.tsx → /party/host)
- `apps/slopcade/app/(tabs)/browse.tsx` imported `createPartyRoom` from `@/lib/party/api` and navigated to `/party/host` — this was fixed by removing the import and stubbing `handlePlay` as a no-op console.warn
- The browse screen is entirely party-game-focused (uses `useBrowsePartyGames`, launches party rooms). With party removed, the Play button is now a no-op. This screen will need redesign for the creator-only context in a future task.
- Re-export shims in `apps/slopcade/lib/party/` and `apps/slopcade/components/party/` were left intact per task instructions — they will break at install time when @slopcade/party is absent (orchestrator handles pnpm install).

## [2026-02-26] Task 33: TypeScript type checks across all packages and apps

### Packages — all 5 pass tsc cleanly ✅
- `packages/brands` ✅
- `packages/party` ✅ (after named export fix — see below)
- `packages/editor` ✅
- `packages/editor-ai` ✅
- `packages/social` ✅

### Apps — pre-existing errors only
All 4 apps fail tsc with exit code 2, but ONLY due to pre-existing errors unrelated to app-split:
1. `packages/ui/src/amen/animation/index.ts` — missing modules `./AmenGrainOverlay`, `./DrawingIcon`
2. `packages/ui/src/amen/loading/index.ts` — missing module `./AmenSplashSequence`
3. `packages/ui/src/GameHallCarousel/GameHallCarousel.tsx` — `SharedValue` not exported from `react-native-reanimated` namespace
4. `shared/src/effects/shaders/index.ts` + all `.meta.ts` files — ~100+ errors for `.glsl` files lacking type declarations

### App-split specific fixes applied

**DrawingInput named export** (`packages/party/src/components/DrawingInput.tsx`):
- `export * from "./components/DrawingInput"` does NOT re-export default exports
- Fixed by changing `export default function DrawingInput` → `export function DrawingInput` + `export default DrawingInput` at end

**LikersBottomSheet missing prop** (`apps/slopcade/app/(tabs)/feed.tsx`):
- `<LikersBottomSheet ref={likersRef} />` was missing required `currentUserId` prop
- Fixed by adding `currentUserId={currentUserId}` (variable already existed on line 352)

**PartyGameRenderer missing props** (`apps/amen/app/party/play.tsx`, `apps/slopbox/app/party/play.tsx`):
- `<PartyGameRenderer />` was missing required props: `musicVolume`, `sfxVolume`, `narrationVolume`, `fontSize`, `captionsEnabled`, `useSpeechToText`
- Fixed by importing `useAppSettings` + `useSpeechToText` and wiring all settings props

**Duplicate LayoutAdapter test** (`apps/slopcade/components/editor/wireframe/__tests__/LayoutAdapter.test.ts`):
- Was a duplicate of the test in `packages/editor/src/wireframe/__tests__/`
- Imported `createEntityLayoutAdapter` from a re-export shim that doesn't export it
- Deleted the duplicate test file

**shader-editor game-runtime cross-workspace coupling**:
- `apps/shader-editor/tsconfig.json` had path mappings for `@slopcade/game-runtime/*` pointing to source
- This caused tsc to compile game-runtime source (which has `@/` imports unresolvable from shader-editor context)
- Fixed by removing the path mappings and creating `apps/shader-editor/types/shims/game-runtime.d.ts` with ambient module declarations
- The shim covers all subpaths via `declare module "@slopcade/game-runtime/*"` wildcard

## [2026-02-26] Tasks 31-32: requireFeature() middleware + brand registration

### Brand registration (Task 32) — already done
- `context.ts` already used `isValidBrandId()` from `@slopcade/brands` for x-brand-id validation.
- `@slopcade/brands` BRAND_IDS already included all 4 brands (slopcade, amen, slopbox, shader-editor).
- No API code changes needed for brand registration — it was already correct at the source level.

### requireFeature() middleware (Task 31)
- Added `requireFeature(feature: keyof BrandFeatures)` to `api/src/trpc/index.ts`.
- Returns a `t.middleware()` that calls `getBrandManifest(ctx.brandId)` and throws FORBIDDEN if feature flag is false.
- Usage: `publicProcedure.use(requireFeature("hasPartyGames"))` or composable on protectedProcedure.
- Replaced hardcoded `brandId === "amen"` in `free-tier-guard.ts::getSessionWindow()` with `brand.features.hasPartyGames` — slopbox now correctly gets weekly session windows too.

### Key gotcha: stale dist/ in packages/brands/
- `packages/brands/dist/types.d.ts` was the OLD version with `gameEditor`, `partyGamesOnly`, etc.
- Source had already been updated (by a prior agent task) but the package was never rebuilt.
- LSP and tsc both resolve from `dist/` (not `src/`), so the stale build caused phantom type errors.
- Fix: run `pnpm --filter @slopcade/brands build` before working on anything that consumes this package.
- **Always rebuild `@slopcade/brands` after source changes before consuming in api/ or app/.**

## [2026-02-26] Task 38: CI/CD updates for 4 app targets

### What was changed
- `.github/workflows/ci.yml`: Expanded `matrix.app` from `[slopcade, amen]` to `[slopcade, amen, slopbox, shader-editor]` for both `typecheck` and `test` jobs. Added "Build workspace packages" step before typecheck (packages must be built before tsc can resolve their types).
- `.github/workflows/eas-build.yml`: Added 3 new jobs (`build-amen`, `build-slopbox`, `build-shader-editor`) following the same pattern as `build-slopcade`.
- `apps/shader-editor/eas.json`: Created from scratch — shader-editor had no eas.json. Omits `EXPO_PUBLIC_EMBED_GAMES` env (not applicable to shader editor).

### Key observations
- The `@slopcade/${{ matrix.app }}-app` filter pattern works for all 4 apps because package names follow the convention exactly: `@slopcade/slopcade-app`, `@slopcade/amen-app`, `@slopcade/slopbox-app`, `@slopcade/shader-editor-app`.
- Amen's `eas.json` had no `ascAppId` in its submit config (not yet registered in App Store Connect). shader-editor follows the same pattern.
- `deploy-web.yml` was NOT modified — it deploys to Cloudflare Pages and adding slopbox/shader-editor deployments is a separate concern from CI build/typecheck.
- `bridge-contract.yml` was NOT modified — it validates bridge codegen drift, unrelated to app-split concerns.
- The `deploy-api.yml` was NOT modified — API is a single Cloudflare Worker, unaffected by app count.
- `--if-present` flag added to `build` in typecheck job to avoid failing when packages don't have a build script (was already in `test-packages` job).

### No ascAppId needed for new apps
- `slopbox` and `shader-editor` don't have App Store Connect entries yet — leave `ascAppId` out of `eas.json` submit config until they're registered.

## [2026-02-26] Task 36: Dead-code cleanup — shim removal

### Summary of what was deleted

**`apps/slopcade/components/party/` — ENTIRE DIRECTORY DELETED**
- All 18 component files + `chroma/` subdirectory were pure re-export shims (`export * from "@slopcade/party"`)
- Zero imports found anywhere in slopcade routes or components
- Party was removed from slopcade in task 30, making all these shims dead

**`apps/slopcade/lib/party/` — ALL SHIMS DELETED EXCEPT `template-types.ts`**
- 23 files deleted: `api.ts`, `PartyContext.tsx`, `usePartyConnection.ts`, all phase files (`*Phases.tsx`), etc.
- All were pure `export * from "@slopcade/party"` shims with no route imports
- `template-types.ts` kept because it IS still imported by:
  - `apps/slopcade/components/browse/GameHallTile.tsx`
  - `apps/slopcade/hooks/useBrowsePartyGames.ts`
  
**`apps/slopcade/components/create-game/` — ALL SHIM FILES DELETED**
- 7 shim files deleted: `ChatConversation.tsx`, `ChatMessage.tsx`, `ChatMessageList.tsx`, `ChatTextArea.tsx`, `SharedDocumentPanel.tsx`, `ThreadList.tsx`, `useThreads.ts`
- All were `export * from "@slopcade/editor-ai"` shims
- Zero route imports found
- `ChatTextArea.test.tsx` was preserved (has real test code) with its import updated from `./ChatTextArea` → `@slopcade/editor-ai`

### What was KEPT (still actively used)

- `apps/slopcade/components/social/*` — 10 shims kept; slopcade routes still use `@/components/social/...`
- `apps/slopcade/components/editor/*` — all shims kept; slopcade routes still use `@/components/editor/...`
- `apps/amen/components/party/*` — all shims kept; amen routes extensively use `@/components/party/...`
- `apps/amen/lib/party/*` — all shims kept; amen routes extensively use `@/lib/party/...`

### knip outcome
knip failed to run (`tailwind.config` missing for `apps/shader-editor/`). Manual analysis was used instead to identify dead imports. Manual scan is more reliable for this specific pattern (shim files).

## [2026-02-26] Task 19: Migrate apps/amen imports to @slopcade/party

### What was migrated

Updated **7 files** to import directly from `@slopcade/party` instead of `@/components/party/...` or `@/lib/party/...`:

| File | Symbols migrated |
|------|-----------------|
| `apps/amen/app/party/play.tsx` | `PartyGameRenderer`, `PartyProvider`, `useParty`, `usePartyMusic`, 18 `register*Phases` |
| `apps/amen/app/party/host.tsx` | `GameSettingsSheet`, `LobbyCountdown`, `PlayerChip`, `PartyProvider`, `useParty` |
| `apps/amen/app/join.tsx` | `AvatarPicker` |
| `apps/amen/app/(tabs)/browse.tsx` | `createPartyRoom` |
| `apps/amen/app/how-to-play/[templateId].tsx` | `PartyTemplate` (type) |
| `apps/amen/components/browse/GameHallTile.tsx` | `PartyTemplate` (type) |
| `apps/amen/hooks/useBrowsePartyGames.ts` | `PartyTemplate` (type) |

### Shims deleted
- `apps/amen/components/party/` — entire directory (25 files including `chroma/` and `results/` subdirs)
- `apps/amen/lib/party/` — entire directory (28 files)
- All files were pure `export * from "@slopcade/party"` shims (some used named: `export { X } from "@slopcade/party"`)

### Bonus: game-runtime cross-app import fixed
- `packages/game-runtime/src/systems/runner/wrappers/NetworkRuntimeSystem.ts` imported `@/lib/party/usePartyConnection` (via amen's `@/` tsconfig alias)
- That shim was deleted, causing a new tsc error
- Fixed by updating to `import type { ConnectionStatus, UsePartyConnectionResult } from "@slopcade/party"`

### Verification
- `npx tsc --noEmit -p apps/amen/tsconfig.json` — only pre-existing errors remain (shaders, ui/amen/animation, GameHallCarousel)
- Zero new errors introduced

## Task 20: Migrate slopcade creator imports to packages (completed)

### Shim structure found
- `apps/slopcade/components/social/` — 11 files, ALL pure shims (`export * from "@slopcade/social"`)
- `apps/slopcade/components/editor/` — entire directory tree was shims (`export * from "@slopcade/editor"`), including subdirectories (graph/, inspector/, preview/, wireframe/, panels/, etc.)

### Route files updated (social → @slopcade/social)
- `app/(tabs)/feed.tsx` — CommentsBottomSheet, LikersBottomSheet, ReportModal
- `app/discover.tsx` — FollowButton
- `app/game-detail/[id].tsx` — GameComments, LikeButton, ReportModal, StarRating
- `app/notifications.tsx` — NotificationItem
- `app/user/[id].tsx` — FollowButton
- `app/user/followers.tsx` — FollowButton

### Route files updated (editor → @slopcade/editor)
- `app/editor/[id].tsx` — EditorProvider, EditorTopBar, ResponsiveEditorLayout, useEditorCommandHandler, WorkspaceFilesProvider
- `app/editor/graph/[id].tsx` — dynamic import of GraphEditor (React.lazy)
- `lib/editor/hooks/useEditorPreloader.ts` — 8 dynamic imports for preloading

### Test files updated
- `components/editor/__tests__/EditorProvider.test.ts` — updated to import from `@slopcade/editor`; mock changed to `vi.mock("@slopcade/editor", async (importOriginal) => ...)` pattern
- `components/editor/__tests__/useDesignDocument.test.ts` — updated to import from `@slopcade/editor`
- `components/editor/__tests__/DesignCanvasHitTest.test.ts` — updated to import from `@slopcade/editor`
- `components/editor/panels/WireframePanel.test.tsx` — updated to import from `@slopcade/editor`; mock updated
- Deleted duplicate tests (identical to package versions): `wireframe/__tests__/LayoutAdapter.test.ts`, `panels/__tests__/useDesignImageResolver.test.ts`

### Shims deleted
- Entire `apps/slopcade/components/social/` directory
- All `*.tsx`/`*.ts` shim files from `apps/slopcade/components/editor/` (top-level and subdirectories)
- Remaining non-shim files kept: `__tests__/`, `code-editor/native/editor-entry.js`, `graph/README.md`, `panels/__fixtures__/`

### Gotcha: grep missed dynamic imports
Initial grep for `@/components/social/` and `@/components/editor/` in `app/` missed:
- `React.lazy(() => import("@/components/editor/graph"))` in `app/editor/graph/[id].tsx`
- Dynamic imports in `lib/editor/hooks/useEditorPreloader.ts` (outside `app/`)
Always grep for dynamic imports too, and search `lib/` not just `app/`.

### tsc result
Only pre-existing GLSL module errors remain. No new errors introduced.

## [2026-02-26] Tasks 16-18: Foundation consolidation — deferred

### Task 16: Foundation components — DEFERRED
Non-shim component files are legitimately app-specific:
- `AnimatedSplashScreen.tsx`: slopcade uses Skia canvas + style cycling; amen uses `AmenSplashSequence` — completely different implementations
- `AppFrameHeader.tsx`: slopcade has `leftActions` prop; amen has Cinzel font + different title styling
- `FloatingTabBar.tsx`: slopcade has editor preload progress ring + primary button; amen is simpler
- `SubscriptionStatus.tsx`: different pricing ($9.99 vs $4.99), different feature lists
- `AssetLoadingScreen.tsx`: different brand colors (indigo vs gold)
- `GameHallTile.tsx`: different branding colors throughout
- `CurrencySheet.tsx`: slopcade has Sparks section; amen is Gems-only

Consolidating these would require brand parametrization — significant work beyond plan scope.

### Task 17: Hooks — DEFERRED (app-local infrastructure coupling)
The 5 hooks look identical but import from app-local paths:
- `@/lib/supabase/client` — app-local supabase client
- `@/lib/trpc/client` and `@/lib/trpc/react` — app-local tRPC clients
- `@/lib/party/template-types` — app-local party types
- `@supabase/supabase-js` — not in app-lib deps
- `@tanstack/react-query` — not in app-lib deps

Moving to `packages/app-lib` would require either adding these as deps (wrong coupling) or dependency injection (significant refactoring). Deferred.

### Task 18: Providers/Sentry — DEFERRED
Amen and slopbox layouts are nearly identical (1-line diff: brandId). Slopcade differs significantly (editor preload, different fonts, different routes). A `createAppProviders` factory would help amen/slopbox but slopcade is too different. Not worth the abstraction cost for 2 apps.

### Recommendation
Tasks 16-18 should be tracked as future work items, not blocking the app-split plan completion. The core architectural goals (package boundaries, 4 apps, feature gating) are all achieved.
