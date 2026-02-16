
## 2026-02-16: Schema Migration Pattern

- D1/SQLite supports `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT` — works for adding non-null columns to existing tables
- `unixepoch()` is available in D1 for generating timestamps
- Schema uses `INSERT OR IGNORE` for seed data to be idempotent on re-runs
- Foreign key references work in D1 but enforcement depends on configuration
- All IDs are TEXT (UUIDs as text), timestamps are INTEGER (Unix epoch milliseconds), booleans are INTEGER (0/1)

## 2026-02-16: Brand Resolution in tRPC Context

- Brand ID extracted from `x-brand-id` header in `createContext`, defaults to `'slopcade'`
- Brand-specific Supabase credentials follow pattern: `{BRAND}_SUPABASE_URL`, `{BRAND}_SUPABASE_SERVICE_ROLE_KEY`
- `getSupabaseCredentials()` helper falls back to default env vars when brand-specific ones aren't set
- `Env` interface in context.ts is the single source of truth for all API env vars
- Context now includes `brandId: string` — available on every tRPC request via `ctx.brandId`
# Learnings

## 2026-02-16: Created @slopcade/brands package

### Package Structure
- Followed `@slopcade/theme` pattern exactly for package.json and tsconfig.json
- No runtime dependencies needed - pure TypeScript types and constants
- Exports: `.`, `./types`, `./content-policy` for granular imports

### Brand Manifest Architecture
- `BrandId` is a union type: `'slopcade' | 'amen'`
- Manifests are static objects with all brand configuration
- Supabase URLs/keys use placeholder strings (resolved at runtime from env)
- Content policy zones (GREEN/YELLOW/RED) for AI generation guardrails

### Content Policy Design
- GREEN_ZONE: Universally safe Bible topics (45 topics)
- RED_ZONE: Denominationally contentious topics to avoid (50 topics)
- YELLOW_ZONE: Topics requiring guidance (10 topics with specific guidance)
- AMEN_SYSTEM_PREFIX: Full system prompt for AI content generation

### Key Exports
- `getBrandManifest(brandId)` - throws if invalid
- `isValidBrandId(id)` - type guard
- `BRAND_IDS` - readonly array
- `DEFAULT_BRAND_ID` - 'slopcade'
- All types re-exported from index

## 2026-02-16: Brand-Aware Content Pack Loading

### Implementation
- `loadContentPack(type, brandId?)` now accepts optional `brandId` parameter
- Resolution order: brand-specific pack → fallback to slopcade default
- `contentPacks` restructured as `Record<brandId, { [contentType]: items[] }>`
- Existing callers work unchanged (brandId defaults to 'slopcade')

### Callers to Update for Brand Support
- `api/src/party/templates/registry.ts:95` — `loadContentPack(packId)` 
  - Will need to pass `ctx.brandId` when brand context is available in room
  - Currently uses default slopcade packs

### Adding Brand Content Packs
1. Create JSON files in `api/src/party/content/{brandId}/`
2. Import in prompt-loader.ts
3. Add to `contentPacks` registry under brand namespace

## 2026-02-16: Brand Scoping for List/Browse tRPC Queries

- For multi-row game/user/social queries, add `brand_id = ?` in SQL and bind `ctx.brandId` explicitly; do not rely on implicit defaults.
- Keep single-item ID lookups unchanged when ownership/ID checks already scope access.
- New game/user inserts should persist `brand_id` from request context so future list/browse queries stay isolated by brand.
- Cross-table analytics queries without native `brand_id` should join `users` and scope by `users.brand_id`.

## 2026-02-16: Runtime Brand Bootstrap in App

### Implementation
- Created `app/lib/brand/index.ts` — runtime brand bootstrap that reads `brandId` from `Constants.expoConfig.extra.brandId`
- Falls back to `'slopcade'` if not set (for dev/backward compatibility)
- Exports: `activeBrand`, `activeBrandId`, `isBrandFeatureEnabled()`

### Feature Gating Pattern
- `activeBrand.features.gameEditor` — gates Lab tab visibility and primary "+" button in FloatingTabBar
- `activeBrand.features.aiGeneration` — gates AI generation UI (not yet implemented)
- `activeBrand.features.userGeneratedContent` — gates UGC features (not yet implemented)
- FloatingTabBar's `onPrimaryPress` made optional — when undefined, primary button is hidden

### tRPC Client Brand Header
- Added `x-brand-id` header to all tRPC requests via `httpLink` headers
- Header value is `activeBrand.id` resolved at app startup

### String Replacement Pattern
- User-facing strings use `activeBrand.displayName` (e.g., "Slopcade", "Amen")
- Creator fallback uses `${activeBrand.displayName} Creator`
- Pro tier uses `${activeBrand.displayName} Pro`

### Files Modified
- `app/lib/brand/index.ts` — new file
- `app/lib/trpc/client.ts` — added x-brand-id header
- `app/app/(tabs)/_layout.tsx` — replaced "Slopcade", gated Lab tab and primary button
- `app/app/(tabs)/feed.tsx` — replaced "Slopcade" in share text and creator name
- `app/app/(tabs)/profile.tsx` — replaced "Slopcade" in invite text and creator name
- `app/components/auth/InviteCodeInput.tsx` — replaced "Slopcade" in beta text
- `app/components/billing/SubscriptionStatus.tsx` — replaced "Slopcade Pro"
- `app/components/social/SocialFeedCard.tsx` — replaced "Slopcade" in share text
- `app/app/settings/subscription.tsx` — replaced "Slopcade Pro"
- `app/components/navigation/FloatingTabBar.tsx` — made onPrimaryPress optional
