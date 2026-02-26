
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
