
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
