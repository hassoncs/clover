
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
