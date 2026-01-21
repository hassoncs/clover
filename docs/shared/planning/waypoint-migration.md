# Clover Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert Clover (skia-physics-test) into a full multi-surface app by porting infrastructure from waypoint-for-ios while preserving Clover's Skia + Box2D physics engine and game-maker roadmap.

**Architecture:** A pnpm/turbo monorepo with Expo app (`/app`), Cloudflare Workers API (`/api`), shared Drizzle/Zod types (`/shared`), and Astro landing site (`/landing`). Hush + SOPS manage secrets and devmux manages services. Clover-specific game engine and AI game-maker features are layered on top.

**Tech Stack:** Expo SDK 54, React Native, Skia, Box2D (JSI + WASM), Hono + tRPC, Drizzle + Zod, Cloudflare D1 + R2, Supabase Auth, Astro + Tailwind, devmux, Hush/SOPS.

---

## 1. Overview & Goals
- **Primary objective:** Bring Waypoint's infra (monorepo, API, auth, secrets, CI/CD, landing) into Clover and adapt it for an AI-powered game maker.
- **Clover-specific focus:** Game runtime engine, AI game generation, asset pipeline, game editor, physics demos → turn into real app features.
- **Success criteria:** Unified monorepo; local dev starts API + app via devmux; secrets managed via Hush; Cloudflare deploys API and landing; basic auth + game storage working.

---

## 2. Infrastructure Setup (dependency order)

### Task 1: Monorepo layout + workspace config (Effort: 0.5–1 day)
**Why:** Base structure for API, landing, shared types.
**Files (source → destination):**
- `waypoint-for-ios/pnpm-workspace.yaml` → `pnpm-workspace.yaml`
- `waypoint-for-ios/turbo.json` → `turbo.json`
- `waypoint-for-ios/package.json` → `package.json` (merge scripts/devDependencies)
**Clover-specific:** Keep existing `app/` and physics modules, add `api/`, `shared/`, `landing/`.

### Task 2: Secrets management (Hush + SOPS) (Effort: 0.5 day)
**Why:** API + app config requires secrets with safe local/prod workflows.
**Files:**
- `waypoint-for-ios/hush.yaml` → `hush.yaml`
- `waypoint-for-ios/.hush.template` → `.hush.template` (rewrite vars for Clover)
- `waypoint-for-ios/.sops.yaml` → `.sops.yaml`
- `waypoint-for-ios/.hush.*.encrypted` → regenerate new encrypted files (do NOT copy ciphertext)
**Clover-specific:** Replace Supabase IDs, Stripe IDs, new API URL, add AI provider keys.

### Task 3: Service orchestration (devmux) (Effort: 0.25 day)
**Why:** Single command to start API + Metro.
**Files:**
- `waypoint-for-ios/devmux.config.json` → `devmux.config.json`
**Clover-specific:** update project name (`clover`), update commands to `@clover/api` + `clover` app.

### Task 4: CI/CD scaffolding (Effort: 0.5–1 day)
**Why:** Automated deploys to API / landing / web.
**Files:**
- `waypoint-for-ios/.github/workflows/deploy.yml` → `.github/workflows/deploy.yml`
**Clover-specific:** update Cloudflare project names, URLs, env vars, and EAS config.

---

## 3. Backend API Setup (Hono + tRPC on Cloudflare)

### Task 5: API workspace copy + cleanup (Effort: 1–2 days)
**Files:**
- `waypoint-for-ios/api/package.json` → `api/package.json`
- `waypoint-for-ios/api/tsconfig.json` → `api/tsconfig.json`
- `waypoint-for-ios/api/wrangler.toml` → `api/wrangler.toml`
- `waypoint-for-ios/api/src/index.ts` → `api/src/index.ts`
- `waypoint-for-ios/api/src/trpc/*` → `api/src/trpc/*`
- `waypoint-for-ios/api/vitest.config.ts` → `api/vitest.config.ts`
**Clover-specific:** Replace maritime routes with game maker endpoints.

### Task 6: API routes and services (Effort: 2–4 days)
**Replace/implement routers:**
- `api/src/trpc/router.ts`, `api/src/trpc/routes.ts`
- New routers: `games`, `assets`, `prompts`, `generations`, `profiles`
**Clover-specific:**  
- `POST /generate-game` (AI prompt → game JSON)  
- `POST /refine-game` (modify existing game)  
- `POST /generate-asset` (sprite generation)  
- `GET /games/:id` (game retrieval)  
- `POST /games` (save)  

### Task 7: R2 asset storage (Effort: 1 day)
**Files to adapt:**
- `waypoint-for-ios/api/src/lib/r2.ts`
**Clover-specific:** separate bucket for sprites, game thumbnails, user uploads.

---

## 4. Auth Integration (Supabase)

### Task 8: Supabase client + auth helpers (Effort: 1 day)
**Files:**
- `waypoint-for-ios/app/lib/supabase/*` → `app/lib/supabase/*`
- `waypoint-for-ios/app/lib/auth/*` → `app/lib/auth/*`
- `waypoint-for-ios/app/lib/config/env.ts` → `app/lib/config/env.ts`
**Clover-specific:** Magic link + Google OAuth; replace app name/redirect URLs.

### Task 9: API auth middleware (Effort: 0.5 day)
**Files:**
- `waypoint-for-ios/api/src/trpc/auth.ts` → `api/src/trpc/auth.ts`
- `waypoint-for-ios/api/src/trpc/context.ts` → `api/src/trpc/context.ts`
**Clover-specific:** Protected routes for saving + editing games.

---

## 5. Database Schema (D1 + Drizzle)

### D1 Evaluation
- **Sufficient now:** JSON blobs for game definitions, low concurrency, small user base.
- **Constraints:** limited concurrency, no full JSON indexing, SQLite write locks.
- **Migration trigger:** multiplayer, real-time leaderboards, complex search, large UGC.  
**Future path:** Supabase Postgres or Neon; Drizzle schemas make migration straightforward.

### Task 10: Shared schema package (Effort: 1–2 days)
**Files to copy/adapt:**
- `waypoint-for-ios/shared/package.json` → `shared/package.json`
- `waypoint-for-ios/shared/tsconfig.json` → `shared/tsconfig.json`
- `waypoint-for-ios/shared/src/index.ts` → `shared/src/index.ts`
- `waypoint-for-ios/shared/src/schema/*` → `shared/src/schema/*` (rewrite tables)
**Clover-specific tables (initial draft):**
- `users`
- `games` (JSON definition, owner, title)
- `game_versions`
- `assets` (R2 key, type, metadata)
- `prompts`
- `sessions`

### Task 11: D1 schema + migrations (Effort: 0.5 day)
**Files:**
- `waypoint-for-ios/api/schema.sql` → `api/schema.sql` (rewrite)
- `waypoint-for-ios/api/migrations/*` → `api/migrations/*` (optional)

---

## 6. Landing Page (Astro)

### Task 12: Landing site copy + retheme (Effort: 1–2 days)
**Files:**
- `waypoint-for-ios/landing/package.json` → `landing/package.json`
- `waypoint-for-ios/landing/astro.config.mjs` → `landing/astro.config.mjs`
- `waypoint-for-ios/landing/tailwind.config.mjs` → `landing/tailwind.config.mjs`
- `waypoint-for-ios/landing/src/**` → `landing/src/**`
- `waypoint-for-ios/landing/public/**` → `landing/public/**`
- `waypoint-for-ios/landing/wrangler.toml` → `landing/wrangler.toml`
**Clover-specific:** new theme, copy/branding, Formspree endpoints, screenshots.

---

## 7. CI/CD Setup

### Task 13: GitHub Actions deployment (Effort: 0.5 day)
**Files:**
- `waypoint-for-ios/.github/workflows/deploy.yml` → `.github/workflows/deploy.yml`
**Clover-specific:** update env vars, project names, URLs, EAS project ID.

---

## 8. Development Workflow

### Task 14: Expo/Metro configuration (Effort: 0.5 day)
**Files:**
- `waypoint-for-ios/app/metro.config.js` → `app/metro.config.js` (merge with Clover's Skia/Box2D needs)
- `waypoint-for-ios/app/babel.config.js` → `app/babel.config.js`
- `waypoint-for-ios/app/global.css` → `app/global.css`
- `waypoint-for-ios/app/tailwind.config.js` → `app/tailwind.config.js`
**Clover-specific:** keep Box2D wasm + Skia WASM shims; avoid breaking physics.

### Task 15: Dev scripts (Effort: 0.5 day)
**Files:**
- `waypoint-for-ios/app/scripts/*` → `app/scripts/*` (optional)
- `waypoint-for-ios/scripts/*` → `scripts/*` (optional)
**Clover-specific:** add seed data for game examples.

---

## 9. Migration Checklist (source → destination)

### Root
| Source | Destination | Action |
|--------|-------------|--------|
| `pnpm-workspace.yaml` | `pnpm-workspace.yaml` | Copy |
| `turbo.json` | `turbo.json` | Copy |
| `package.json` | `package.json` | Merge |
| `devmux.config.json` | `devmux.config.json` | Copy + edit |
| `hush.yaml` | `hush.yaml` | Copy + edit |
| `.hush.template` | `.hush.template` | Copy + edit |
| `.sops.yaml` | `.sops.yaml` | Copy + edit |
| `.github/workflows/deploy.yml` | `.github/workflows/deploy.yml` | Copy + edit |
| `.npmrc` | `.npmrc` | Copy if needed |
| `patches/*` | `patches/*` | Copy relevant |

### App
| Source | Destination | Action |
|--------|-------------|--------|
| `app/metro.config.js` | `app/metro.config.js` | Merge |
| `app/babel.config.js` | `app/babel.config.js` | Merge |
| `app/global.css` | `app/global.css` | Copy |
| `app/tailwind.config.js` | `app/tailwind.config.js` | Copy |
| `app/nativewind-env.d.ts` | `app/nativewind-env.d.ts` | Copy |
| `app/wrangler.toml` | `app/wrangler.toml` | Copy + edit |
| `app/lib/supabase/*` | `app/lib/supabase/*` | Copy |
| `app/lib/auth/*` | `app/lib/auth/*` | Copy |
| `app/lib/config/env.ts` | `app/lib/config/env.ts` | Copy + edit |
| `app/lib/trpc/*` | `app/lib/trpc/*` | Copy |

### API (new directory)
| Source | Destination | Action |
|--------|-------------|--------|
| `api/package.json` | `api/package.json` | Copy + edit |
| `api/tsconfig.json` | `api/tsconfig.json` | Copy |
| `api/wrangler.toml` | `api/wrangler.toml` | Copy + edit |
| `api/schema.sql` | `api/schema.sql` | Rewrite |
| `api/src/index.ts` | `api/src/index.ts` | Copy |
| `api/src/trpc/*` | `api/src/trpc/*` | Copy + edit |
| `api/src/lib/r2.ts` | `api/src/lib/r2.ts` | Copy |
| `api/vitest.config.ts` | `api/vitest.config.ts` | Copy |

### Shared (new directory)
| Source | Destination | Action |
|--------|-------------|--------|
| `shared/package.json` | `shared/package.json` | Copy + edit |
| `shared/tsconfig.json` | `shared/tsconfig.json` | Copy |
| `shared/src/index.ts` | `shared/src/index.ts` | Copy |
| `shared/src/schema/*` | `shared/src/schema/*` | Rewrite |

### Landing (new directory)
| Source | Destination | Action |
|--------|-------------|--------|
| `landing/package.json` | `landing/package.json` | Copy + edit |
| `landing/astro.config.mjs` | `landing/astro.config.mjs` | Copy |
| `landing/tailwind.config.mjs` | `landing/tailwind.config.mjs` | Copy + edit |
| `landing/src/**` | `landing/src/**` | Copy + retheme |
| `landing/public/**` | `landing/public/**` | Replace assets |
| `landing/wrangler.toml` | `landing/wrangler.toml` | Copy + edit |

---

## 10. Clover-Specific Adaptations

| Waypoint Feature | Clover Adaptation |
|------------------|-------------------|
| Maritime routes/waypoints | Game definitions + entities |
| NOAA charts | AI-generated sprites |
| Voyage tracking | Game runtime engine |
| Offline maps | Game asset caching |
| Supabase Auth | Same (Magic Link + Google) |
| D1 database | Same (different schema) |
| R2 storage | Sprites + game thumbnails |
| Astro landing | New game-maker theme |

---

## 11. Effort Summary

| Phase | Effort |
|-------|--------|
| Infrastructure (Tasks 1-4) | 1.5-2.5 days |
| Backend API (Tasks 5-7) | 4-7 days |
| Auth (Tasks 8-9) | 1.5 days |
| Database (Tasks 10-11) | 1.5-2.5 days |
| Landing (Task 12) | 1-2 days |
| CI/CD (Task 13) | 0.5 days |
| Dev Workflow (Tasks 14-15) | 1 day |
| **Total** | **11-17 days** |

---

## 12. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking physics/Skia | Don't touch `lib/physics*` or existing Skia config |
| Metro resolution conflicts | Keep existing resolver rules, add new ones |
| Auth token issues | Test LargeSecureStore on device |
| D1 performance limits | Monitor; plan Postgres migration path |
| CI/CD failures | Test locally with `wrangler dev` first |
