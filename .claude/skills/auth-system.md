---
name: auth-system
description: Use when working with authentication, login flows, OAuth (Google), Supabase auth, session management, auth hooks, or protected routes in the app
---

# Auth System

Supabase-based authentication with Google OAuth, magic link, dev-mode bypass, and platform-specific secure token storage.

## File Map

### Frontend (app/)

| Path | Purpose |
|------|---------|
| `app/hooks/useAuth.tsx` | `AuthProvider` context + `useAuth()` hook |
| `app/lib/auth/token.ts` | `getAuthToken()`, dev auth state management |
| `app/lib/auth/storage.ts` | Re-exports from `storage.native.ts` (Metro resolves `.web.ts` on web) |
| `app/lib/auth/storage.web.ts` | `LargeSecureStore` using `localStorage` |
| `app/lib/auth/storage.native.ts` | `LargeSecureStore` using AES-CBC encryption with `expo-secure-store` key + `AsyncStorage` data |
| `app/lib/supabase/client.ts` | Supabase client singleton (`supabase`, `getSupabase()`) |
| `app/lib/supabase/auth.ts` | Re-exports from `auth.web.ts` (Metro resolves `.native.ts` on native) |
| `app/lib/supabase/auth.web.ts` | Web auth functions: `signInWithGoogle`, `sendMagicLink`, `signOut`, `getSession`, `getAccessToken`, `signInWithPassword` |
| `app/lib/supabase/auth.native.ts` | Native auth functions (same exports, uses `expo-web-browser` for OAuth) |
| `app/lib/supabase/index.ts` | Barrel: re-exports `supabase`, `getSupabase`, `sendMagicLink`, `signInWithGoogle`, `signOut`, `getSession`, `getAccessToken` |
| `app/app/auth/callback.tsx` | OAuth redirect handler (web) - extracts tokens from URL hash, calls `supabase.auth.setSession()`, redirects to `/maker` |
| `app/app/_layout.tsx` | Wraps app in `<AuthProvider>` |
| `app/lib/trpc/client.ts` | tRPC client - attaches `Authorization: Bearer <token>` header via `getAuthToken()` |
| `app/lib/config/env.ts` | Reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

### Backend (api/)

| Path | Purpose |
|------|---------|
| `api/src/trpc/context.ts` | `Env`, `User`, `Context`, `AuthenticatedContext` types + `createContext()` |
| `api/src/trpc/index.ts` | `publicProcedure`, `protectedProcedure`, `validateAuthToken()` |
| `api/src/trpc/routes/users.ts` | `users.syncFromAuth` mutation (called after login) |
| `api/src/index.ts` | Hono routes with inline auth (WebSocket endpoints, chat stream) |
| `api/src/routes/audio.ts` | `authenticateRequest()` helper pattern for non-tRPC routes |

**Note:** There is NO `api/src/routes/auth.ts` file. Auth callbacks are handled client-side in `app/app/auth/callback.tsx`.

## useAuth() Hook

Defined in `app/hooks/useAuth.tsx`. Must be used inside `<AuthProvider>`.

### Return type: `AuthContextValue`

```typescript
interface AuthState {
  user: User | null;           // Supabase User type (from @supabase/supabase-js)
  session: Session | null;     // Supabase Session type
  isLoading: boolean;          // true during initial session check
  isAuthenticated: boolean;    // true when user is set
}

interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  signInAsDev: () => Promise<void>;       // __DEV__ only, sets DEV_USER_STUB
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}
```

### Initialization flow

1. `AuthProvider` calls `refreshSession()` on mount
2. `refreshSession()` tries `getSession()` (Supabase) first
3. Falls back to `loadDevAuthState()` (checks persisted dev auth flag)
4. Subscribes to `supabase.auth.onAuthStateChange()` for live updates
5. On successful auth, calls `trpc.users.syncFromAuth.mutate()` to sync user to D1

### Dev mode

- `signInAsDev()` sets a `DEV_USER_STUB` with id `"00000000-0000-0000-0000-000000000000"` and email `"dev@localhost"`
- Dev auth state persists via `getStorageItem`/`setStorageItem` (from `@/lib/utils/storage`)
- On web in `__DEV__`, `loadDevAuthState()` auto-enables dev auth if not previously set

## Token Flow (Client to Server)

```
useAuth (session) -> getAuthToken() -> tRPC httpLink headers -> Bearer token
                                    \-> WebSocket ?token= param
```

`getAuthToken()` in `app/lib/auth/token.ts`:
1. Tries `supabase.auth.getSession()` for `access_token`
2. Falls back to `DEV_AUTH_TOKEN` (`"dev-token"`) if `isDevAuthenticated()`
3. Returns `null` if neither

The tRPC client (`app/lib/trpc/client.ts`) calls `getAuthToken()` in its `headers()` function and sets `Authorization: Bearer <token>`.

## Backend Auth

### tRPC: `protectedProcedure`

Defined in `api/src/trpc/index.ts`. Uses a `.use()` middleware:

```typescript
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if ((ctx as AuthenticatedContext).user) {
    return next({ ctx: ctx as AuthenticatedContext });
  }
  const user = await validateAuthToken(ctx);
  return next({ ctx: { ...ctx, user } as AuthenticatedContext });
});
```

`validateAuthToken(ctx)`:
1. If `__DEV__` and token is `"dev-token"` -> returns `DEV_USER` (`{ id: "00000000-...", email: "dev@localhost", displayName: "Dev" }`)
2. Creates a Supabase client with `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
3. Calls `supabase.auth.getUser(ctx.authToken)` to validate the JWT
4. Returns `{ id, email, displayName }` (from `user_metadata.full_name`)
5. Throws `TRPCError({ code: "UNAUTHORIZED" })` on failure

### Backend types (`api/src/trpc/context.ts`)

```typescript
interface User {
  id: string;
  email: string;
  displayName?: string;
}

interface Context {
  env: Env;
  authToken: string | null;
}

interface AuthenticatedContext extends Context {
  user: User;
}
```

`createContext()` extracts `authToken` from `Authorization: Bearer ...` header.

### Hono routes (non-tRPC)

WebSocket and streaming endpoints in `api/src/index.ts` use inline auth:

```typescript
// Pattern used in /ws/speech-to-text, /api/games/:gameId/ws, /api/chat/stream
const token = new URL(c.req.url).searchParams.get("token");
if (__DEV__ && token === "dev-token") {
  userId = "00000000-0000-0000-0000-000000000000";
} else {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  // ...
}
```

### Non-tRPC REST routes

`api/src/routes/audio.ts` uses a reusable `authenticateRequest()` helper:

```typescript
async function authenticateRequest(c): Promise<{ userId: string } | { error: string; status: number }>
```

Extracts `Bearer` token from `Authorization` header, validates via Supabase or dev-token.

## Token Storage (Platform-Specific)

Both platforms implement `LargeSecureStore` with `getItem`/`setItem`/`removeItem`.

### Web (`storage.web.ts`)
- Direct `localStorage` wrapper

### Native (`storage.native.ts`)
- AES-256-CBC encryption key stored in `expo-secure-store` (Keychain) under key `"supabase_session_key"`
- Encrypted session data stored in `AsyncStorage` under key `"supabase_session_data_{key}"`
- Format: `{ivHex}:{originalLengthHex}:{encryptedHex}`
- Uses `aes-js` library for encryption

### Supabase client integration

`app/lib/supabase/client.ts` passes `largeSecureStore` as the `storage` option on native:

```typescript
createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,        // true on web, false on native
    storage: isWeb ? undefined : largeSecureStore,  // native uses encrypted storage
  },
});
```

On native, auto-refresh starts/stops based on `AppState` (active/background).

## OAuth: Google Sign-In

Only provider configured is **Google**. No Apple sign-in.

### Web (`auth.web.ts`)
- Calls `supabase.auth.signInWithOAuth({ provider: "google" })` with redirect to `${window.location.origin}/auth/callback`
- Supabase handles the redirect flow; callback page extracts tokens from URL hash

### Native (`auth.native.ts`)
- Uses `expo-web-browser` (`WebBrowser.openAuthSessionAsync`) with `skipBrowserRedirect: true`
- Redirect URL: `slopcade://auth/callback`
- After browser returns, extracts `access_token`/`refresh_token` from URL hash
- Falls back to `exchangeCodeForSession(code)` if tokens not in hash
- `handleNativeAuthCallback(url)` handles deep link callbacks

## Other Sign-In Methods

- **Magic link**: `sendMagicLink(email)` calls `supabase.auth.signInWithOtp({ email })`
- **Password**: `signInWithPassword(email, password)` calls `supabase.auth.signInWithPassword()`
- **Dev mode**: `signInAsDev()` (frontend only, `__DEV__` guard)

## Environment Variables

### Frontend (Expo)
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

### Backend (Cloudflare Workers)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (used for `getUser()` validation)
- `SUPABASE_ANON_KEY` - Anon key (defined in `Env` but not used in auth validation)

## Gotchas

- **No `isAuthed` middleware function exists.** The tRPC auth is an inline `.use()` on `protectedProcedure`, not a named export.
- **No `api/src/routes/auth.ts` file.** Auth callbacks are client-side only.
- **Backend uses `SUPABASE_SERVICE_ROLE_KEY`** (not anon key) for token validation via `supabase.auth.getUser()`.
- **Dev token is `"dev-token"`** (string literal), not a JWT. Both frontend and backend check for it.
- **Dev user ID is `"00000000-0000-0000-0000-000000000000"`** everywhere (frontend stub, backend DEV_USER, Hono routes).
- **`storage.ts` re-exports from `storage.native.ts`** — Metro bundler resolves `storage.web.ts` on web automatically.
- **`auth.ts` re-exports from `auth.web.ts`** — Metro resolves `auth.native.ts` on native.
- **Native sign-out clears both** `SecureStore` (encryption key) and `AsyncStorage` (encrypted session data).
- **`syncFromAuth`** is called after every successful auth (not just first login) but deduplicates via `lastSyncedUserIdRef`.

## Related Skills

- **storage-ops**: D1 database, user table
- **agent-orchestration**: Chat streaming auth (uses token query param)
- **economy-iap**: RevenueCat webhooks (separate auth via webhook secret)
