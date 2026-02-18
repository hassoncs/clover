# Learnings

## 2026-02-18 Session Start
- Phase 1 (namespace migration) SKIPPED per user decision — keeping `@slopcade/` namespace
- All references to `@chriscode/` in the plan should be read as `@slopcade/` 
- Current package names: `slopcade` (app), `@slopcade/api`, `@slopcade/shared`, `@slopcade/brands`, etc.
- pnpm-workspace.yaml includes: app, api, apps/landing-slopcade, apps/landing-amen, shared, packages/*, apps/storybook

## 2026-02-18 apps/slopcade Brand Hardcoding
- Successfully removed all brand-switching logic from `apps/slopcade/`
- Deleted `lib/brand/` directory entirely (was 2 files: index.ts, typography.ts)
- Hardcoded slopcade identity in `app.config.ts`: name="Slopcade", slug="slopcade", scheme="slopcade", bundleIdentifier="app.slopcade", package="app.slopcade"
- Fixed `metro.config.js` monorepoRoot from `".."` to `"../.."` since the app moved from `app/` to `apps/slopcade/`
- Updated all scripts in `package.json` to use `../../scripts/` paths instead of `../scripts/`
- Removed amen-specific scripts: `dev:amen`, `ios:amen`, `prebuild:amen`, `preios:amen`, `deploy:amen`
- Removed amen EAS build profiles from `eas.json`
- Removed `.brand-amen` and `.brand-amen.dark` CSS sections from `global.css`
- Slopcade features hardcoded as: socialFeed=true, gameEditor=true, userGeneratedContent=true, partyGamesOnly=false, organizations=false
- Slopcade domain: "slopcade.com", scheme: "slopcade"
- Theme colors extracted to local `const colors` object in `join/[slug].tsx` since that file used many inline theme colors
- All 18 files that imported from `@/lib/brand` were updated to use hardcoded values
