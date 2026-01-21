# Waypoint Architecture Reference

> **Purpose**: Comprehensive technical reference capturing all patterns, configurations, and gotchas discovered in the waypoint-for-ios codebase. This serves as the authoritative source for replicating this architecture in new projects.
>
> **Source**: `/Users/hassoncs/Workspaces/Personal/waypoint-for-ios`
> **Analysis Date**: January 2026

---

## Table of Contents

1. [Monorepo Structure](#1-monorepo-structure)
2. [Secrets Management (Hush + SOPS)](#2-secrets-management-hush--sops)
3. [Service Orchestration (devmux)](#3-service-orchestration-devmux)
4. [Backend API (Hono + tRPC + Cloudflare)](#4-backend-api-hono--trpc--cloudflare)
5. [Database (D1 + Drizzle)](#5-database-d1--drizzle)
6. [Authentication (Supabase)](#6-authentication-supabase)
7. [Shared Types Package](#7-shared-types-package)
8. [Expo/Metro Configuration](#8-expometro-configuration)
9. [Landing Page (Astro)](#9-landing-page-astro)
10. [CI/CD (GitHub Actions)](#10-cicd-github-actions)
11. [Critical Gotchas](#11-critical-gotchas)

---

## 1. Monorepo Structure

### Directory Layout
```
waypoint-for-ios/
├── app/                    # Expo/React Native app (iOS, Android, Web)
│   ├── app/               # Expo Router pages (file-based routing)
│   ├── components/        # React components
│   ├── lib/               # Core libraries
│   │   ├── supabase/      # Supabase client configuration
│   │   ├── auth/          # Session storage (native + web)
│   │   ├── trpc/          # tRPC client setup
│   │   ├── config/        # Environment variables
│   │   ├── db/            # Database operations (*.ts for native, *.web.ts for web)
│   │   ├── navigation/    # Domain-specific calculations
│   │   └── state/         # Jotai atoms
│   ├── ios/               # Native iOS project
│   ├── docs/              # App-specific documentation
│   └── public/            # Static assets
│
├── api/                    # Cloudflare Workers backend
│   ├── src/
│   │   ├── index.ts       # Hono entry point
│   │   ├── trpc/          # tRPC routers and middleware
│   │   │   ├── index.ts   # tRPC initialization, procedures
│   │   │   ├── context.ts # Context creation with Env types
│   │   │   ├── router.ts  # Root router aggregation
│   │   │   └── routes/    # Individual domain routers
│   │   └── lib/           # Utilities (R2, etc.)
│   ├── schema.sql         # D1 database schema
│   ├── migrations/        # Incremental SQL migrations
│   ├── seeds/             # Seed data (e.g., ports.sql)
│   └── wrangler.toml      # Cloudflare Workers config
│
├── shared/                 # Shared TypeScript package
│   ├── src/
│   │   ├── index.ts       # Public exports
│   │   └── schema/        # Drizzle tables + Zod validators
│   ├── package.json       # @waypoint/shared
│   └── tsconfig.json
│
├── landing/               # Astro marketing site
│   ├── src/
│   │   ├── pages/         # Astro pages
│   │   ├── components/    # Astro components
│   │   ├── layouts/       # Page layouts
│   │   └── styles/        # Global CSS
│   ├── public/            # Static assets
│   ├── astro.config.mjs
│   ├── tailwind.config.mjs
│   └── wrangler.toml      # Cloudflare Pages config
│
├── docs/                   # Cross-project documentation
│   ├── architecture/      # System design docs
│   ├── product/           # Product specs
│   ├── technical/         # Implementation details
│   └── guides/            # Developer guides
│
├── scripts/               # Utility scripts
├── patches/               # Dependency patches (pnpm)
│
├── package.json           # Root package.json (workspaces, scripts)
├── pnpm-workspace.yaml    # Workspace definitions
├── turbo.json             # Turbo build config
├── devmux.config.json     # Service orchestration
├── hush.yaml              # Secrets management targets
├── .sops.yaml             # SOPS encryption config
├── .hush                  # Encrypted shared secrets
├── .hush.development      # Encrypted dev secrets
├── .hush.production       # Encrypted prod secrets
├── AGENTS.md              # AI agent instructions
└── CLAUDE.md              # Claude-specific instructions
```

### Package Manager Configuration

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'app'
  - 'api'
  - 'shared'
  - 'landing'
```

**Root package.json (key parts):**
```json
{
  "name": "waypoint-monorepo",
  "private": true,
  "scripts": {
    "prepare": "simple-git-hooks",
    "svc:ensure": "devmux ensure",
    "svc:status": "devmux status",
    "svc:attach": "devmux attach",
    "svc:stop": "devmux stop",
    "svc:restart": "devmux stop api && devmux ensure api",
    "dev": "devmux ensure metro",
    "dev:web": "devmux ensure metro",
    "dev:api": "devmux ensure api",
    "build": "turbo run build",
    "test": "turbo run test",
    "ios": "devmux ensure metro && npx hush run -- pnpm --filter waypoint ios",
    "android": "devmux ensure metro && npx hush run -- pnpm --filter waypoint android",
    "release": "pnpm --filter @waypoint/api db:push:remote && turbo run release",
    "db:push": "pnpm --filter @waypoint/api db:push",
    "db:reset": "pnpm --filter @waypoint/api db:reset",
    "hush": "hush",
    "hush:status": "hush status"
  },
  "devDependencies": {
    "@chriscode/devmux": "link:/Users/hassoncs/Workspaces/Personal/devmux/devmux-cli",
    "@chriscode/hush": "^5.0.1",
    "concurrently": "^9.2.1",
    "simple-git-hooks": "^2.11.1",
    "tsx": "^4.21.0",
    "turbo": "^2.0.0"
  },
  "simple-git-hooks": {
    "pre-commit": "pnpm hush check --only-changed"
  },
  "packageManager": "pnpm@9.0.0",
  "pnpm": {
    "overrides": {
      "tailwindcss": "3.4.17"
    },
    "patchedDependencies": {
      "react-native-css-interop@0.2.1": "patches/react-native-css-interop@0.2.1.patch"
    }
  }
}
```

---

## 2. Secrets Management (Hush + SOPS)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│              Root Encrypted Files (committed)               │
│                                                             │
│  .hush                   Shared secrets                     │
│  .hush.development       Dev-specific (localhost URLs)      │
│  .hush.production        Prod-specific (real URLs)          │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  npx hush run   │
                    │  (decrypts in   │
                    │   memory only)  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   ┌──────────┐        ┌──────────┐        ┌──────────┐
   │  app/    │        │  api/    │        │ landing/ │
   │  .env    │        │ .dev.vars│        │ .dev.vars│
   │ template │        │ (wrangler│        │ (wrangler│
   └──────────┘        │  format) │        │  format) │
                       └──────────┘        └──────────┘
```

### hush.yaml Configuration

```yaml
version: 2
project: waypoint

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

  - name: api
    path: .
    format: dotenv
    exclude:
      - EXPO_PUBLIC_*

  - name: api-workers
    path: ./api
    format: wrangler
    filename: .dev.vars
    exclude:
      - EXPO_PUBLIC_*
      - FASTLANE_*
      - ASC_*
      - MATCH_*
      - PILOT_*

  - name: landing
    path: ./landing
    format: wrangler
    filename: .dev.vars
    include:
      - EXPO_PUBLIC_SUPABASE_*

  - name: fastlane
    path: .
    format: dotenv
    include:
      - FASTLANE_*
      - ASC_*
      - MATCH_*
      - PILOT_*
```

### Secrets by Target

| Secret | Targets | Purpose |
|--------|---------|---------|
| `SUPABASE_URL` | api-workers, app (via template) | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | api-workers | Server-side Supabase auth |
| `SUPABASE_ANON_KEY` | api-workers, app (via template) | Client auth key |
| `STRIPE_SECRET_KEY` | api-workers | Stripe API (test/live) |
| `STRIPE_WEBHOOK_SECRET` | api-workers | Webhook signature |
| `STRIPE_MONTHLY_PRICE_ID` | api-workers | Subscription price |
| `STRIPE_YEARLY_PRICE_ID` | api-workers | Subscription price |
| `R2_ACCOUNT_ID` | api-workers | Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | api-workers | R2 credentials |
| `R2_SECRET_ACCESS_KEY` | api-workers | R2 credentials |
| `APP_URL` | api-workers | Redirect URL (env-specific) |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | app | Mapbox maps |

### Template Expansion Pattern

**app/.env (committed, no secrets):**
```bash
# This file is a TEMPLATE - Hush expands ${VAR} references
EXPO_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
EXPO_PUBLIC_API_URL=http://localhost:8787
```

When running from app directory, Hush:
1. Loads root secrets
2. Filters by target rules (`include: EXPO_PUBLIC_*`)
3. Expands template references (`${SUPABASE_URL}` → actual value)
4. Merges both

### Common Commands

```bash
# Check setup
npx hush status

# View secrets (masked)
npx hush inspect

# See what a target receives
npx hush resolve api-workers
npx hush resolve app

# Trace a variable
npx hush trace SUPABASE_URL

# Add a secret
npx hush set MY_SECRET
npx hush set APP_URL -e production  # Environment-specific

# Run with secrets
npx hush run -- <command>
npx hush run -t api-workers -- <command>

# Push to Cloudflare (production)
npx hush push --dry-run
npx hush push
```

---

## 3. Service Orchestration (devmux)

### devmux.config.json

```json
{
  "version": 1,
  "project": "waypoint",
  "services": {
    "api": {
      "cwd": ".",
      "command": "CLOUDFLARE_INCLUDE_PROCESS_ENV=true npx hush run -t api-workers -- pnpm --filter @waypoint/api dev",
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

### Key Patterns

1. **CLOUDFLARE_INCLUDE_PROCESS_ENV=true**: CRITICAL for Wrangler 4.x to read secrets from process.env
2. **-t api-workers**: Target filter ensures only API secrets are injected
3. **dependsOn**: Metro waits for API to be healthy before starting
4. **Health checks**: Port-based health verification

### tmux Session Names
- API: `omo-waypoint-api`
- Metro: `omo-waypoint-metro`

### Viewing Logs
```bash
tmux capture-pane -pt omo-waypoint-api -S -50
tmux capture-pane -pt omo-waypoint-metro -S -50
```

---

## 4. Backend API (Hono + tRPC + Cloudflare)

### wrangler.toml

```toml
name = "waypoint-api"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
main = "src/index.ts"
workers_dev = true

[dev]
port = 8787

[[d1_databases]]
binding = "DB"
database_name = "waypoint-db"
database_id = "3a3ce7fe-77f1-4f51-9287-195c25da7373"

# Domain Architecture:
#   - waypointforios.com       → Landing page (Astro)
#   - app.waypointforios.com   → Web app (Expo)
#   - api.waypointforios.com   → API (this Worker)

[[routes]]
pattern = "api.waypointforios.com"
custom_domain = true
zone_name = "waypointforios.com"

[[r2_buckets]]
binding = "CHARTS"
bucket_name = "waypoint-charts"

[[r2_buckets]]
binding = "MBTILES_BUCKET"
bucket_name = "waypoint-mbtiles"

[[rules]]
type = "CompiledWasm"
globs = ["**/*.wasm"]
```

### Entry Point (api/src/index.ts)

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './trpc/router';
import { createContext } from './trpc/context';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: ['http://localhost:8081', 'https://app.waypointforios.com'],
  credentials: true,
}));

app.use('/trpc/*', trpcServer({
  router: appRouter,
  createContext,
}));

export default app;
```

### Context (api/src/trpc/context.ts)

```typescript
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export interface Env {
  DB: D1Database;
  CHARTS: R2Bucket;
  MBTILES_BUCKET: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_MONTHLY_PRICE_ID: string;
  STRIPE_YEARLY_PRICE_ID: string;
  APP_URL: string;
}

export interface Context {
  env: Env;
  headers: Headers;
  user?: User | null;
  installId?: string;
}

export async function createContext(
  opts: FetchCreateContextFnOptions,
  env: Env
): Promise<Context> {
  const headers = opts.req.headers;
  const installId = headers.get('X-Install-Id') || undefined;
  
  return {
    env,
    headers,
    installId,
  };
}
```

### tRPC Initialization (api/src/trpc/index.ts)

```typescript
import { initTRPC, TRPCError } from '@trpc/server';
import { createClient } from '@supabase/supabase-js';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Requires X-Install-Id header (for anonymous tracking)
export const installedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.installId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'X-Install-Id required' });
  }
  return next({ ctx });
});

// Requires valid Supabase JWT
export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const token = ctx.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  
  const supabase = createClient(
    ctx.env.SUPABASE_URL,
    ctx.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  
  // Auto-provision user in D1 if not exists
  const dbUser = await ensureUserExists(ctx.env.DB, user);
  
  return next({ ctx: { ...ctx, user: dbUser } });
});

async function ensureUserExists(db: D1Database, supabaseUser: any) {
  const existing = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(supabaseUser.id)
    .first();
  
  if (existing) return existing;
  
  await db
    .prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)')
    .bind(supabaseUser.id, supabaseUser.email, Date.now())
    .run();
  
  return { id: supabaseUser.id, email: supabaseUser.email };
}
```

### Router Aggregation (api/src/trpc/router.ts)

```typescript
import { router } from './index';
import { authRouter } from './routes/auth';
import { waypointsRouter } from './routes/waypoints';
import { routesRouter } from './routes/routes';
import { syncRouter } from './routes/sync';
import { billingRouter } from './routes/billing';

export const appRouter = router({
  auth: authRouter,
  waypoints: waypointsRouter,
  routes: routesRouter,
  sync: syncRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
```

---

## 5. Database (D1 + Drizzle)

### Schema Pattern (api/schema.sql)

```sql
-- Users (synced from Supabase)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  plan TEXT,
  current_period_end INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

-- Domain tables with sync support
CREATE TABLE IF NOT EXISTS waypoints (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  install_id TEXT,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  description TEXT,
  sync_version INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX idx_waypoints_user ON waypoints(user_id);
CREATE INDEX idx_waypoints_install ON waypoints(install_id);
CREATE INDEX idx_waypoints_sync ON waypoints(sync_version);

-- Sync tracking
CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  install_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  sync_version INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
```

### Migration Pattern

```sql
-- api/migrations/0001_add_ports.sql
CREATE TABLE IF NOT EXISTS ports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL
);

-- api/migrations/0002_add_mbtiles.sql
CREATE TABLE IF NOT EXISTS mbtiles_packs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  bounds TEXT,
  created_at INTEGER NOT NULL
);
```

### Database Commands

```bash
# Local development
pnpm db:push                    # Apply schema locally
pnpm db:reset                   # Wipe and reinitialize
pnpm db:seed                    # Run seed data

# Production
pnpm --filter @waypoint/api db:push:remote

# Direct wrangler commands
wrangler d1 execute waypoint-db --file=./schema.sql
wrangler d1 execute waypoint-db --file=./migrations/0001_add_ports.sql
wrangler d1 migrations apply waypoint-db
```

### D1 Query Patterns

```typescript
// Simple query
const waypoints = await ctx.env.DB
  .prepare('SELECT * FROM waypoints WHERE user_id = ?')
  .bind(userId)
  .all();

// Insert with returning
const result = await ctx.env.DB
  .prepare('INSERT INTO waypoints (id, name, latitude, longitude, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *')
  .bind(id, name, lat, lng, userId, now, now)
  .first();

// Batch operations
const batch = [
  ctx.env.DB.prepare('INSERT INTO ...').bind(...),
  ctx.env.DB.prepare('UPDATE ...').bind(...),
];
await ctx.env.DB.batch(batch);
```

---

## 6. Authentication (Supabase)

### Supabase Client (app/lib/supabase/client.ts)

```typescript
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { storage } from '../auth/storage';

export const supabase = createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
```

### LargeSecureStore Pattern (CRITICAL)

iOS Keychain (SecureStore) has a 2KB limit. Supabase sessions can exceed this. Solution: encrypt session in AsyncStorage using a key stored in SecureStore.

**app/lib/auth/storage.native.ts:**
```typescript
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const KEY_NAME = 'supabase_session_key';

async function getOrCreateKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(KEY_NAME);
  if (!key) {
    key = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Math.random().toString()
    );
    await SecureStore.setItemAsync(KEY_NAME, key);
  }
  return key;
}

async function encrypt(data: string, key: string): Promise<string> {
  // AES encryption implementation
  // ... (uses expo-crypto)
}

async function decrypt(encrypted: string, key: string): Promise<string> {
  // AES decryption implementation
  // ...
}

export const LargeSecureStore = {
  async getItem(name: string): Promise<string | null> {
    const key = await getOrCreateKey();
    const encrypted = await AsyncStorage.getItem(name);
    if (!encrypted) return null;
    return decrypt(encrypted, key);
  },
  
  async setItem(name: string, value: string): Promise<void> {
    const key = await getOrCreateKey();
    const encrypted = await encrypt(value, key);
    await AsyncStorage.setItem(name, encrypted);
  },
  
  async removeItem(name: string): Promise<void> {
    await AsyncStorage.removeItem(name);
  },
};
```

**app/lib/auth/storage.ts (platform selector):**
```typescript
import { Platform } from 'react-native';

export const storage = Platform.select({
  native: () => require('./storage.native').LargeSecureStore,
  web: () => undefined, // Uses default browser storage
})!();
```

### useSession Hook

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, loading };
}
```

### Auth Flow Components

**Login page pattern:**
```typescript
// Magic Link
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});

// Google OAuth
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

**Callback handler (app/app/auth/callback.tsx):**
```typescript
import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase/client';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      // Exchange code for session
      if (params.code) {
        await supabase.auth.exchangeCodeForSession(params.code as string);
      }
      
      // Claim anonymous data if needed
      // ...
      
      router.replace('/');
    };
    
    handleCallback();
  }, [params]);

  return <LoadingScreen />;
}
```

---

## 7. Shared Types Package

### Package Structure

```
shared/
├── package.json          # @waypoint/shared
├── tsconfig.json
└── src/
    ├── index.ts          # Public exports
    └── schema/
        ├── index.ts      # Re-exports all schemas
        ├── users.ts
        ├── waypoints.ts
        ├── routes.ts
        └── client.ts     # Client-side type variants
```

### package.json

```json
{
  "name": "@waypoint/shared",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "drizzle-orm": "^0.29.0",
    "drizzle-zod": "^0.5.0",
    "zod": "^3.22.0"
  }
}
```

### Schema Definition Pattern

```typescript
// shared/src/schema/waypoints.ts
import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Drizzle table definition
export const waypoints = sqliteTable('waypoints', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  installId: text('install_id'),
  name: text('name').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  description: text('description'),
  syncVersion: integer('sync_version').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

// Zod schemas (auto-generated from Drizzle)
export const insertWaypointSchema = createInsertSchema(waypoints, {
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const selectWaypointSchema = createSelectSchema(waypoints);

// TypeScript types
export type Waypoint = z.infer<typeof selectWaypointSchema>;
export type NewWaypoint = z.infer<typeof insertWaypointSchema>;

// Client-side type (omits sync fields)
export type ClientWaypoint = Omit<Waypoint, 'syncVersion' | 'deletedAt'>;
```

### Client Type Pattern

```typescript
// shared/src/schema/client.ts
import type { Waypoint, Route, Vessel } from './index';

// Client types omit backend-only fields
export type ClientWaypoint = Omit<Waypoint, 'syncVersion' | 'deletedAt' | 'installId'>;
export type ClientRoute = Omit<Route, 'syncVersion' | 'deletedAt' | 'installId'>;
export type ClientVessel = Omit<Vessel, 'syncVersion' | 'deletedAt'>;

// Input types for creation
export type WaypointInput = Pick<ClientWaypoint, 'name' | 'latitude' | 'longitude' | 'description'>;
export type RouteInput = Pick<ClientRoute, 'name' | 'description'>;
```

---

## 8. Expo/Metro Configuration

### app.json Key Settings

```json
{
  "expo": {
    "name": "Waypoint",
    "slug": "waypoint",
    "version": "1.0.0",
    "sdkVersion": "54.0.0",
    "platforms": ["ios", "android", "web"],
    "ios": {
      "bundleIdentifier": "me.ch5.waypoint.app",
      "supportsTablet": true,
      "deploymentTarget": "16.0"
    },
    "web": {
      "bundler": "metro",
      "output": "static"
    },
    "plugins": [
      "expo-router",
      ["expo-location", { "isIosBackgroundLocationEnabled": true }],
      "@rnmapbox/maps",
      "react-native-bottom-tabs",
      "expo-sqlite"
    ]
  }
}
```

### Metro Config (CRITICAL for Monorepo)

```javascript
// app/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root
config.watchFolders = [monorepoRoot];

// Resolve modules from multiple locations
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'shared/node_modules'),
];

// Disable package exports (fixes some resolution issues)
config.resolver.unstable_enablePackageExports = false;

// Web-specific shims
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Shim @rnmapbox/maps for web
  if (platform === 'web' && moduleName === '@rnmapbox/maps') {
    return {
      filePath: path.resolve(projectRoot, 'lib/map/rnmapbox-web-shim.tsx'),
      type: 'sourceFile',
    };
  }
  
  // Jotai CJS fix (pnpm virtual store issue)
  if (moduleName.startsWith('jotai')) {
    const jotaiPath = getJotaiCjsPath(moduleName);
    if (jotaiPath) {
      return { filePath: jotaiPath, type: 'sourceFile' };
    }
  }
  
  return originalResolveRequest(context, moduleName, platform);
};

// WASM support
config.resolver.assetExts.push('wasm');

// Security headers for CanvasKit/Skia
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(req, res, next);
  };
};

module.exports = withNativeWind(config, { input: './global.css' });
```

### Babel Config

```javascript
// app/babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // NOTE: Do NOT manually add react-native-reanimated/plugin
    // It's handled by babel-preset-expo and manual addition causes iOS conflicts
  };
};
```

### iOS Podfile Customizations

```ruby
# app/ios/Podfile
require_relative '../node_modules/expo/scripts/autolinking'
require_relative '../node_modules/react-native/scripts/react_native_pods'

platform :ios, '16.0'
use_modular_headers!  # Required by react-native-bottom-tabs

target 'waypoint' do
  use_expo_modules!
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => true
  )

  # Mapbox pre-install
  pre_install do |installer|
    $RNMapboxMaps.pre_install(installer)
  end

  post_install do |installer|
    # Mapbox post-install
    $RNMapboxMaps.post_install(installer)
    
    # expo-file-system patch (fixes ExpoAppDelegate reference)
    patch_expo_file_system(installer)
    
    react_native_post_install(installer)
  end
end

def patch_expo_file_system(installer)
  # Fixes bug where FileSystemModule.swift references wrong class
  file_path = "#{installer.sandbox.root}/Pods/ExpoFileSystem/..."
  # ... patch implementation
end
```

### Environment Variables Pattern

**app/lib/config/env.ts:**
```typescript
// CRITICAL: Metro inlines process.env.EXPO_PUBLIC_* at bundle time
// Must use DIRECT references - no destructuring, no dynamic access

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787',
  mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
};

// What DOESN'T work:
// const { EXPO_PUBLIC_SUPABASE_URL } = process.env;  // ❌
// process.env['EXPO_PUBLIC_SUPABASE_URL'];           // ❌
// const key = 'EXPO_PUBLIC_X'; process.env[key];     // ❌
```

---

## 9. Landing Page (Astro)

### Structure

```
landing/
├── astro.config.mjs
├── tailwind.config.mjs
├── wrangler.toml
├── package.json
├── public/
│   ├── favicon.svg
│   └── images/
└── src/
    ├── pages/
    │   └── index.astro
    ├── components/
    │   ├── Header.astro
    │   ├── Hero.astro
    │   ├── FeatureGrid.astro
    │   ├── CallToAction.astro
    │   └── Footer.astro
    ├── layouts/
    │   └── Layout.astro
    └── styles/
        └── global.css
```

### Tailwind Config

```javascript
// landing/tailwind.config.mjs
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        deepOcean: '#0a1628',
        midnight: '#0f2744',
        teal: '#0ea5e9',
        seafoam: '#22d3ee',
        gold: '#f59e0b',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
    },
  },
};
```

### wrangler.toml

```toml
name = "waypoint-landing"
compatibility_date = "2025-01-01"

[site]
bucket = "./dist"

[[routes]]
pattern = "waypointforios.com"
custom_domain = true
zone_name = "waypointforios.com"
```

### Formspree Integration

```astro
<!-- src/components/CallToAction.astro -->
<form 
  action="https://formspree.io/f/xqeekkoa" 
  method="POST"
  id="waitlist-form"
>
  <input type="email" name="email" required />
  <button type="submit">Get Notified</button>
</form>

<script>
  const form = document.getElementById('waitlist-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        // Show success state
      } else {
        // Show error state
      }
    } catch (error) {
      // Handle error
    }
  });
</script>
```

---

## 10. CI/CD (GitHub Actions)

### deploy.yml

```yaml
name: Deploy

on:
  push:
    branches: [main]

env:
  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run typecheck

  deploy-api:
    needs: typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      
      # Setup Hush/SOPS
      - name: Setup SOPS
        run: |
          curl -LO https://github.com/getsops/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
          chmod +x sops-v3.8.1.linux.amd64
          sudo mv sops-v3.8.1.linux.amd64 /usr/local/bin/sops
      
      - name: Setup age key
        run: |
          mkdir -p ~/.config/sops/age
          echo "${{ secrets.SOPS_AGE_KEY }}" > ~/.config/sops/age/keys.txt
      
      # Deploy
      - run: npx hush run -t api-workers -e production -- pnpm --filter @waypoint/api release

  deploy-landing:
    needs: typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter waypoint-landing build
      - run: npx wrangler pages deploy dist/ --project-name=waypoint-landing
        working-directory: landing

  deploy-web:
    needs: typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      
      # Setup secrets
      - name: Setup age key
        run: |
          mkdir -p ~/.config/sops/age
          echo "${{ secrets.SOPS_AGE_KEY }}" > ~/.config/sops/age/keys.txt
      
      # Build with production env
      - run: cd app && npx hush run -e production -- expo export -p web
      - run: npx wrangler pages deploy dist/ --project-name=waypoint
        working-directory: app
```

### Required Secrets

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Wrangler authentication |
| `CLOUDFLARE_ACCOUNT_ID` | Account identifier |
| `SOPS_AGE_KEY` | Full age private key for decryption |
| `EXPO_TOKEN` | EAS builds (if using) |

---

## 11. Critical Gotchas

### 1. CLOUDFLARE_INCLUDE_PROCESS_ENV

Wrangler 4.x requires this environment variable to read secrets from process.env in development:

```bash
CLOUDFLARE_INCLUDE_PROCESS_ENV=true npx wrangler dev
```

Without it, the API will fail with "supabaseUrl is required" or similar.

### 2. LargeSecureStore for Native Auth

iOS Keychain has a 2KB limit. Supabase sessions exceed this. You MUST use the LargeSecureStore pattern or auth will silently fail on native.

### 3. Metro Direct Env References

Metro only inlines `process.env.EXPO_PUBLIC_*` when referenced DIRECTLY:

```typescript
// ✅ Works
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;

// ❌ Broken
const { EXPO_PUBLIC_SUPABASE_URL } = process.env;
```

### 4. Wrangler Version

Must use Wrangler 4.x for process.env support. Check with:
```bash
cd api && npx wrangler --version
```

### 5. NativeWind Babel Config

Do NOT manually add `react-native-reanimated/plugin` to babel.config.js - it's handled by `babel-preset-expo` and manual addition causes iOS build conflicts.

### 6. Jotai pnpm Resolution

pnpm's virtual store can cause Jotai resolution issues. The Metro config includes a `getJotaiCjsPath` helper to force CJS resolution.

### 7. Mapbox Web Shim

`@rnmapbox/maps` doesn't support web. Create a shim file that returns null/placeholder components for web builds.

### 8. D1 JSON Storage

D1 is SQLite - store JSON as TEXT columns. No native JSON indexing. For complex queries on JSON, consider migrating to Postgres.

### 9. R2 S3 Compatibility

R2 uses S3-compatible API. For presigned URLs or direct upload, you need:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

### 10. Domain Architecture

Standard pattern:
- `domain.com` → Landing (Astro on Cloudflare Pages)
- `app.domain.com` → Web app (Expo web on Cloudflare Pages)
- `api.domain.com` → API (Cloudflare Workers)

All on the same Cloudflare zone for easy SSL and DNS management.

---

## Appendix: File Copy Reference

### Minimal Copy List (infrastructure only)

```
# Root
pnpm-workspace.yaml
turbo.json
package.json (merge)
devmux.config.json
hush.yaml
.sops.yaml
.npmrc

# API (new)
api/package.json
api/tsconfig.json
api/wrangler.toml
api/vitest.config.ts
api/src/index.ts
api/src/trpc/index.ts
api/src/trpc/context.ts
api/src/trpc/router.ts

# Shared (new)
shared/package.json
shared/tsconfig.json
shared/src/index.ts

# App (merge/add)
app/lib/supabase/client.ts
app/lib/auth/storage.ts
app/lib/auth/storage.native.ts
app/lib/auth/storage.web.ts
app/lib/config/env.ts
app/lib/trpc/client.ts
app/metro.config.js (merge)
app/babel.config.js (merge)
app/global.css
app/tailwind.config.js
app/nativewind-env.d.ts

# Landing (new)
landing/* (entire directory)

# CI/CD
.github/workflows/deploy.yml
```

---

*Document generated from waypoint-for-ios analysis, January 2026*
