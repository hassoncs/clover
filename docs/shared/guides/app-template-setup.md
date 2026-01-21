# App Template Guide

> **Purpose**: A reusable guide for creating new full-stack mobile apps from the Waypoint template architecture.
> 
> **Template Source**: `/Users/hassoncs/Workspaces/Personal/waypoint-for-ios`

This document captures the complete process for spinning up new apps with the same infrastructure as Waypoint. Follow this guide when creating new projects like Clover, or any future apps.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MONOREPO STRUCTURE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  /app                    Expo/React Native App                          │
│  ├── app/               Expo Router pages                               │
│  ├── components/        React components                                │
│  ├── lib/               Core libraries                                  │
│  │   ├── supabase/      Auth client                                    │
│  │   ├── auth/          Session storage                                │
│  │   ├── trpc/          API client                                     │
│  │   ├── config/        Environment variables                          │
│  │   └── db/            Database operations                            │
│  └── ios/               Native iOS project                             │
│                                                                          │
│  /api                    Cloudflare Workers Backend                     │
│  ├── src/               Source code                                     │
│  │   ├── index.ts       Hono entry point                               │
│  │   ├── trpc/          tRPC routers                                   │
│  │   └── lib/           Utilities (R2, etc.)                           │
│  ├── schema.sql         D1 database schema                             │
│  └── wrangler.toml      Cloudflare config                              │
│                                                                          │
│  /shared                 Shared Types & Schemas                         │
│  └── src/                                                               │
│      ├── schema/        Drizzle tables + Zod validators                │
│      └── index.ts       Public exports                                 │
│                                                                          │
│  /landing               Marketing Site (Astro)                          │
│  ├── src/               Pages and components                           │
│  └── wrangler.toml      Cloudflare Pages config                        │
│                                                                          │
│  /docs                   Documentation                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **App Framework** | Expo SDK 54 | Cross-platform mobile + web |
| **App Routing** | Expo Router | File-based navigation |
| **Styling** | NativeWind (Tailwind) | Utility-first CSS |
| **State** | Jotai | Atomic state management |
| **API Framework** | Hono | Lightweight web framework |
| **API Layer** | tRPC | End-to-end type safety |
| **Database** | Cloudflare D1 | Serverless SQLite |
| **Storage** | Cloudflare R2 | S3-compatible object storage |
| **Auth** | Supabase | Magic Link + OAuth |
| **Secrets** | Hush + SOPS | Encrypted secrets management |
| **Services** | devmux | Local service orchestration |
| **Build** | Turbo | Monorepo task runner |
| **Package Manager** | pnpm | Fast, disk-efficient |
| **Landing** | Astro | Static site generator |
| **Deployment** | Cloudflare | Workers, Pages, D1, R2 |

---

## Step-by-Step Setup Process

### Phase 1: Project Initialization

#### 1.1 Create Repository
```bash
# Create new GitHub repo
gh repo create <project-name> --private

# Clone and setup
git clone git@github.com:<username>/<project-name>.git
cd <project-name>
```

#### 1.2 Copy Root Configuration Files

| File | Purpose | Customization Required |
|------|---------|----------------------|
| `pnpm-workspace.yaml` | Workspace definitions | None (copy as-is) |
| `turbo.json` | Build pipeline | Update project name |
| `package.json` | Root scripts + deps | Update name, merge if existing |
| `.npmrc` | pnpm config | None (copy as-is) |
| `.gitignore` | Git ignores | Merge with existing |

**Root package.json key scripts:**
```json
{
  "scripts": {
    "svc:ensure": "devmux ensure",
    "svc:status": "devmux status",
    "svc:stop": "devmux stop",
    "dev": "devmux ensure metro",
    "dev:api": "devmux ensure api",
    "build": "turbo run build",
    "release": "turbo run release",
    "hush": "hush",
    "hush:status": "hush status"
  }
}
```

#### 1.3 Setup pnpm Workspaces

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'app'
  - 'api'
  - 'shared'
  - 'landing'
```

---

### Phase 2: Secrets Management (Hush + SOPS)

> **CRITICAL**: Set this up BEFORE other infrastructure. Everything depends on secrets.

#### 2.1 Install Prerequisites
```bash
brew install sops age
npm install -g @chriscode/hush
```

#### 2.2 Copy Configuration Files

| File | Purpose | Customization |
|------|---------|---------------|
| `hush.yaml` | Target definitions | Update project name, paths |
| `.sops.yaml` | SOPS encryption config | Update age public key |

**hush.yaml template:**
```yaml
version: 2
project: <project-name>

sources:
  shared: .hush
  development: .hush.development
  production: .hush.production

targets:
  - name: root
    path: .
    format: dotenv

  - name: app
    path: ./app
    format: dotenv
    include:
      - EXPO_PUBLIC_*
      - EXPO_TOKEN

  - name: api-workers
    path: ./api
    format: wrangler
    filename: .dev.vars
    exclude:
      - EXPO_PUBLIC_*
      - FASTLANE_*

  - name: landing
    path: ./landing
    format: wrangler
    filename: .dev.vars
    include:
      - EXPO_PUBLIC_SUPABASE_*
```

#### 2.3 Initialize Secrets
```bash
# Generate new age key
age-keygen -o ~/.config/sops/age/<project>.txt

# Add public key to .sops.yaml
# Initialize Hush
npx hush init

# Set required secrets
npx hush set SUPABASE_URL
npx hush set SUPABASE_ANON_KEY
npx hush set SUPABASE_SERVICE_ROLE_KEY
# ... other secrets
```

#### 2.4 Required Secrets by Target

| Secret | Target | Purpose |
|--------|--------|---------|
| `SUPABASE_URL` | api-workers, app (template) | Supabase project URL |
| `SUPABASE_ANON_KEY` | api-workers, app (template) | Client-side auth |
| `SUPABASE_SERVICE_ROLE_KEY` | api-workers | Server-side auth |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | app | Maps (if needed) |
| `CLOUDFLARE_API_TOKEN` | CI/CD | Deployments |
| `CLOUDFLARE_ACCOUNT_ID` | CI/CD | Deployments |

---

### Phase 3: Service Orchestration (devmux)

#### 3.1 Copy devmux Config

**devmux.config.json:**
```json
{
  "version": 1,
  "project": "<project-name>",
  "services": {
    "api": {
      "cwd": ".",
      "command": "CLOUDFLARE_INCLUDE_PROCESS_ENV=true npx hush run -t api-workers -- pnpm --filter @<project>/api dev",
      "health": { "type": "port", "port": 8787 }
    },
    "metro": {
      "cwd": "app",
      "command": "npx hush run -t app -- npx expo start --dev-client --port 8081",
      "health": { "type": "port", "port": 8081 },
      "dependsOn": ["api"]
    }
  }
}
```

#### 3.2 Key devmux Commands
```bash
pnpm svc:ensure api     # Start API
pnpm svc:ensure metro   # Start Metro (+ API dependency)
pnpm svc:status         # Check status
pnpm svc:stop api       # Stop API
```

---

### Phase 4: Backend API Setup

#### 4.1 Create API Directory Structure
```
api/
├── package.json
├── tsconfig.json
├── wrangler.toml
├── vitest.config.ts
├── schema.sql
├── migrations/
└── src/
    ├── index.ts
    ├── trpc/
    │   ├── index.ts        # tRPC initialization
    │   ├── context.ts      # Context creation
    │   ├── router.ts       # Root router
    │   └── routes/         # Individual routers
    └── lib/
        └── r2.ts           # R2 utilities
```

#### 4.2 Copy API Files

| Source | Destination | Customization |
|--------|-------------|---------------|
| `api/package.json` | `api/package.json` | Update name to `@<project>/api` |
| `api/tsconfig.json` | `api/tsconfig.json` | None |
| `api/wrangler.toml` | `api/wrangler.toml` | Update name, D1 IDs, R2 buckets, domains |
| `api/src/index.ts` | `api/src/index.ts` | None |
| `api/src/trpc/index.ts` | `api/src/trpc/index.ts` | None |
| `api/src/trpc/context.ts` | `api/src/trpc/context.ts` | Update env type |
| `api/src/trpc/router.ts` | `api/src/trpc/router.ts` | Replace with new routers |

#### 4.3 wrangler.toml Template
```toml
name = "<project>-api"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
main = "src/index.ts"

[dev]
port = 8787

[[d1_databases]]
binding = "DB"
database_name = "<project>-db"
database_id = "<your-d1-id>"

[[routes]]
pattern = "api.<domain>.com"
custom_domain = true
zone_name = "<domain>.com"

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "<project>-assets"

[[rules]]
type = "CompiledWasm"
globs = ["**/*.wasm"]
```

#### 4.4 Create Cloudflare Resources
```bash
# Create D1 database
wrangler d1 create <project>-db

# Create R2 bucket
wrangler r2 bucket create <project>-assets

# Initialize schema
wrangler d1 execute <project>-db --file=./api/schema.sql
```

#### 4.5 tRPC Patterns

**Context (api/src/trpc/context.ts):**
```typescript
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  ASSETS: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export type Context = {
  env: Env;
  user?: User | null;
  installId?: string;
};
```

**Protected Procedure (api/src/trpc/index.ts):**
```typescript
export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const token = ctx.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) throw new TRPCError({ code: 'UNAUTHORIZED' });
  
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  
  return next({ ctx: { ...ctx, user } });
});
```

---

### Phase 5: Shared Types Package

#### 5.1 Create Shared Directory Structure
```
shared/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    └── schema/
        ├── index.ts
        ├── users.ts
        └── <domain>.ts
```

#### 5.2 Copy Shared Files

| Source | Destination | Customization |
|--------|-------------|---------------|
| `shared/package.json` | `shared/package.json` | Update name to `@<project>/shared` |
| `shared/tsconfig.json` | `shared/tsconfig.json` | None |
| `shared/src/index.ts` | `shared/src/index.ts` | Update exports |

#### 5.3 Schema Pattern (Drizzle + Zod)
```typescript
// shared/src/schema/users.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = z.infer<typeof selectUserSchema>;
export type NewUser = z.infer<typeof insertUserSchema>;
```

---

### Phase 6: App Configuration

#### 6.1 Files to Copy/Merge

| Source | Destination | Action |
|--------|-------------|--------|
| `app/metro.config.js` | `app/metro.config.js` | Merge (keep existing + add monorepo support) |
| `app/babel.config.js` | `app/babel.config.js` | Merge |
| `app/global.css` | `app/global.css` | Copy |
| `app/tailwind.config.js` | `app/tailwind.config.js` | Copy |
| `app/nativewind-env.d.ts` | `app/nativewind-env.d.ts` | Copy |
| `app/wrangler.toml` | `app/wrangler.toml` | Copy + edit |
| `app/lib/supabase/*` | `app/lib/supabase/*` | Copy |
| `app/lib/auth/*` | `app/lib/auth/*` | Copy |
| `app/lib/config/env.ts` | `app/lib/config/env.ts` | Copy + edit |
| `app/lib/trpc/*` | `app/lib/trpc/*` | Copy |

#### 6.2 Metro Config for Monorepo
```javascript
// Key additions for monorepo support
const config = {
  watchFolders: [path.resolve(__dirname, '..')],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../node_modules'),
      path.resolve(__dirname, '../shared/node_modules'),
    ],
  },
};
```

#### 6.3 Environment Variables Pattern

**app/lib/config/env.ts:**
```typescript
// CRITICAL: Must use direct references for Metro to inline
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787',
};
```

**app/.env (template, committed):**
```bash
EXPO_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
EXPO_PUBLIC_API_URL=http://localhost:8787
```

---

### Phase 7: Auth Integration

#### 7.1 Supabase Client Setup

**app/lib/supabase/client.ts:**
```typescript
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { storage } from '../auth/storage';

export const supabase = createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
  },
});
```

#### 7.2 Native Session Storage

The template includes `LargeSecureStore` that handles sessions > 2KB (iOS Keychain limit):
- Encrypts session data with AES key
- Stores AES key in SecureStore
- Stores encrypted data in AsyncStorage

**Files to copy:**
- `app/lib/auth/storage.native.ts`
- `app/lib/auth/storage.web.ts`
- `app/lib/auth/storage.ts` (platform selector)

#### 7.3 tRPC Client with Auth

**app/lib/trpc/client.ts:**
```typescript
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { supabase } from '../supabase/client';
import { env } from '../config/env';

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.apiUrl}/trpc`,
      async headers() {
        const { data: { session } } = await supabase.auth.getSession();
        return {
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
          'X-Install-Id': await getInstallId(),
        };
      },
    }),
  ],
});
```

---

### Phase 8: Landing Page

#### 8.1 Copy Landing Directory
```bash
cp -r waypoint-for-ios/landing/ <project>/landing/
```

#### 8.2 Files to Customize

| File | Customization |
|------|---------------|
| `package.json` | Update name |
| `wrangler.toml` | Update name, domain |
| `tailwind.config.mjs` | Update colors/theme |
| `src/pages/index.astro` | Complete rewrite |
| `src/components/*.astro` | Update content |
| `public/*` | Replace assets |

#### 8.3 wrangler.toml for Landing
```toml
name = "<project>-landing"
compatibility_date = "2025-01-01"

[site]
bucket = "./dist"

[[routes]]
pattern = "<domain>.com"
custom_domain = true
zone_name = "<domain>.com"
```

---

### Phase 9: CI/CD Setup

#### 9.1 GitHub Actions Workflow

**.github/workflows/deploy.yml:**
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm turbo run typecheck

  deploy-api:
    needs: typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm --filter @<project>/api release
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  deploy-landing:
    needs: typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm --filter <project>-landing build
      - run: npx wrangler pages deploy dist/ --project-name=<project>-landing
        working-directory: landing
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

#### 9.2 Required GitHub Secrets
```
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
EXPO_TOKEN (for EAS builds)
SOPS_AGE_KEY (for Hush in CI)
```

---

### Phase 10: AGENTS.md Template

Create `AGENTS.md` at project root:

```markdown
# Agent Instructions

## Project Context (READ THIS FIRST)

**<Project Name>** is <one-line description>.

### What It Does
- Feature 1
- Feature 2
- Feature 3

### Tech Stack
| Layer | Tech |
|-------|------|
| App | Expo SDK 54, React Native |
| Styling | NativeWind (Tailwind CSS) |
| State | Jotai |
| API | Hono + tRPC on Cloudflare Workers |
| DB | Cloudflare D1 |
| Storage | Cloudflare R2 |
| Auth | Supabase |

### Key Directories
\`\`\`
app/        # Expo app
api/        # Cloudflare Workers API
shared/     # Shared types
landing/    # Marketing site
docs/       # Documentation
\`\`\`

### Service Commands
| Task | Command |
|------|---------|
| Start all | `pnpm dev` |
| Start API only | `pnpm dev:api` |
| Check status | `pnpm svc:status` |
| Stop all | `pnpm svc:stop api && pnpm svc:stop metro` |

### Secrets Management
\`\`\`bash
npx hush status           # Check setup
npx hush inspect          # View secrets (masked)
npx hush set <KEY>        # Add secret
npx hush run -- <cmd>     # Run with secrets
\`\`\`

### Development Patterns
- **Styling**: Always use NativeWind, never StyleSheet.create
- **Env Vars**: Reference directly via `app/lib/config/env.ts`
- **TypeScript**: Verify with `pnpm tsc --noEmit`
- **tRPC**: Use `protectedProcedure` for auth-required routes
```

---

## Quick Reference

### Starting a New Project Checklist

- [ ] Create GitHub repo
- [ ] Copy root config files (pnpm-workspace, turbo, package.json)
- [ ] Setup Hush + SOPS (age key, hush.yaml, .sops.yaml)
- [ ] Initialize secrets (`npx hush set ...`)
- [ ] Setup devmux config
- [ ] Create API workspace
- [ ] Create Cloudflare resources (D1, R2)
- [ ] Setup wrangler.toml
- [ ] Create shared types package
- [ ] Configure app for monorepo (Metro, Babel)
- [ ] Copy auth libraries (Supabase client, storage)
- [ ] Setup tRPC client
- [ ] Copy/customize landing site
- [ ] Setup GitHub Actions
- [ ] Configure GitHub secrets
- [ ] Create AGENTS.md
- [ ] Test local dev (`pnpm dev`)
- [ ] Test deployment

### Common Commands
```bash
# Development
pnpm dev                  # Start everything
pnpm dev:api              # Start API only
pnpm svc:status           # Check service status

# Secrets
npx hush status           # Check Hush setup
npx hush set KEY          # Add secret
npx hush run -- cmd       # Run with secrets

# Database
wrangler d1 execute <db> --file=schema.sql  # Apply schema
wrangler d1 migrations apply <db>            # Apply migrations

# Deployment
pnpm release              # Deploy all
pnpm --filter @<project>/api release  # Deploy API only
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "supabaseUrl is required" | Check `npx hush resolve api-workers` |
| Metro module not found | Update `nodeModulesPaths` in metro.config.js |
| tRPC types not syncing | Run `pnpm install` in root |
| D1 connection failed | Verify database_id in wrangler.toml |
| Auth tokens not refreshing | Check LargeSecureStore implementation |
| Wrangler secrets missing | Use `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial template based on Waypoint architecture |
