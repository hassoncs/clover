# Session State - January 20, 2026

> **Purpose**: Context dump for session continuation. Resume from here.

## Completed Tasks

### Git Setup
- [x] Remote changed to `git@github.com:hassoncs/clover.git`
- [x] Pushed all commits to new GitHub repo
- [x] Committed 3 comprehensive docs (3188 lines total)

### Documentation Created
1. `docs/CLOVER_MIGRATION_PLAN.md` - 15-task implementation plan
2. `docs/APP_TEMPLATE_GUIDE.md` - Reusable template guide
3. `docs/WAYPOINT_ARCHITECTURE_REFERENCE.md` - 1200+ line technical reference

### Infrastructure Started
- [x] Created `pnpm-workspace.yaml`
- [x] Created directory structures: `api/src/trpc/routes`, `api/src/lib`, `api/migrations`, `shared/src/schema`, `landing/src`
- [ ] `turbo.json` - needs to read existing first then write

## In Progress - TODO List

```
1. Phase 1.1: Copy monorepo config - IN PROGRESS (pnpm-workspace done, turbo.json pending)
2. Phase 1.2: Merge root package.json - PENDING
3. Phase 1.3: Setup Hush config - PENDING
4. Phase 1.4: Setup devmux.config.json - PENDING
5-7. API setup - PENDING
8. Create schema.sql - PENDING
9-11. Shared package - PENDING
12-15. App auth/trpc - PENDING
16-17. Metro/NativeWind - PENDING
18-19. Landing - PENDING
20. GitHub Actions - PENDING
21. AGENTS.md - PENDING
22-23. Verify install/typecheck - PENDING
```

## Key Files to Copy (Source → Destination)

### From waypoint-for-ios:

**Root configs:**
- `turbo.json` → `turbo.json` (content already read, see below)
- `hush.yaml` → `hush.yaml`
- `.sops.yaml` → `.sops.yaml`
- `devmux.config.json` → `devmux.config.json`

**API (already read):**
- `api/package.json` → Change name to `@clover/api`
- `api/tsconfig.json` → Copy as-is
- `api/wrangler.toml` → Copy and update names/IDs
- `api/src/index.ts` → Copy
- `api/src/trpc/*` → Copy and adapt

**Shared (already read):**
- `shared/package.json` → Change name to `@clover/shared`
- `shared/tsconfig.json` → Copy as-is

**App libs to copy:**
- `app/lib/supabase/client.ts`
- `app/lib/auth/storage.ts`, `storage.native.ts`, `storage.web.ts`
- `app/lib/trpc/client.ts`
- `app/lib/config/env.ts`

## Content Already Read (for immediate use)

### turbo.json content:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "dev:web": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", "web-build/**", ".expo/**"] },
    "test": { "dependsOn": ["^build"], "outputs": [] },
    "typecheck": { "dependsOn": ["^build"], "outputs": [] },
    "start": { "cache": false, "persistent": true },
    "ios": { "cache": false, "persistent": true },
    "android": { "cache": false, "persistent": true },
    "clean": { "cache": false },
    "release": { "dependsOn": ["build"], "cache": false }
  }
}
```

### api/package.json (adapt for Clover):
```json
{
  "name": "@clover/api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "release": "wrangler deploy --minify",
    "db:push": "npx wrangler d1 execute clover-db --file=./schema.sql --local",
    "db:push:remote": "npx wrangler d1 execute clover-db --file=./schema.sql --remote",
    "db:reset": "rm -rf .wrangler/state/v3/d1 && pnpm db:push",
    "type-check": "tsc --noEmit",
    "test": "vitest"
  },
  "dependencies": {
    "@hono/trpc-server": "^0.3.4",
    "@supabase/supabase-js": "^2.90.1",
    "@trpc/server": "^11.8.1",
    "@clover/shared": "workspace:*",
    "drizzle-orm": "^0.38.3",
    "hono": "^4.11.4",
    "superjson": "^2.2.6",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.12.3",
    "@cloudflare/workers-types": "^4.20240512.0",
    "typescript": "^5.4.5",
    "vitest": "^2.1.9",
    "wrangler": "^4.59.2"
  }
}
```

### shared/package.json (adapt for Clover):
```json
{
  "name": "@clover/shared",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts",
    "./schema/*": "./src/schema/*.ts"
  },
  "dependencies": {
    "drizzle-orm": "^0.38.3",
    "drizzle-zod": "^0.7.0",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20260116.0",
    "typescript": "^5.4.5"
  }
}
```

### Root package.json to merge:
Add these scripts to existing:
```json
{
  "scripts": {
    "prepare": "simple-git-hooks",
    "svc:ensure": "devmux ensure",
    "svc:status": "devmux status",
    "svc:stop": "devmux stop",
    "dev": "devmux ensure metro",
    "dev:api": "devmux ensure api",
    "release": "pnpm --filter @clover/api db:push:remote && turbo run release",
    "db:push": "pnpm --filter @clover/api db:push",
    "db:reset": "pnpm --filter @clover/api db:reset",
    "hush": "hush",
    "hush:status": "hush status"
  },
  "devDependencies": {
    "@chriscode/hush": "^5.0.1",
    "simple-git-hooks": "^2.11.1",
    "tsx": "^4.21.0"
  },
  "simple-git-hooks": {
    "pre-commit": "pnpm hush check --only-changed"
  }
}
```

## Critical Gotchas (Don't Forget)

1. **CLOUDFLARE_INCLUDE_PROCESS_ENV=true** - Required in devmux for Wrangler 4.x
2. **LargeSecureStore** - Must copy for native auth (iOS Keychain 2KB limit)
3. **Metro direct env refs** - Use `process.env.EXPO_PUBLIC_X` directly, no destructuring
4. **Wrangler 4.x required** - Check with `npx wrangler --version`

## Next Session Commands

```bash
# Resume from here
cd /Users/hassoncs/Workspaces/Personal/skia-physics-test

# Check current state
git status
cat docs/SESSION_STATE_2026_01_20.md

# Continue with:
# 1. Read existing turbo.json, then overwrite
# 2. Create api/package.json, api/tsconfig.json
# 3. Create shared/package.json, shared/tsconfig.json
# 4. Merge root package.json
# 5. Create hush.yaml, devmux.config.json
# 6. Copy app/lib/supabase, app/lib/auth, app/lib/trpc, app/lib/config
```

## Reference Docs

- Full migration plan: `docs/CLOVER_MIGRATION_PLAN.md`
- Template guide: `docs/APP_TEMPLATE_GUIDE.md`
- Architecture reference: `docs/WAYPOINT_ARCHITECTURE_REFERENCE.md`
- Game maker docs: `docs/game-maker/*.md`

## Project Goal

Convert skia-physics-test into "Clover" - an AI-powered 2D game maker for kids.
Infrastructure from waypoint-for-ios, game engine from existing physics code.
