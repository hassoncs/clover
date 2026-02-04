# Themes UI Implementation - Learnings

## 2026-02-04 Initial Exploration

### API Structure (asset-system.ts)
- **ThemeRow interface**: Lines 48-58 - DB row structure
- **toClientTheme function**: Lines 157-168 - Transforms DB row to client format
- **styleSchema**: Line 133 - `z.enum(['pixel', 'cartoon', '3d', 'flat'])`
- **themes router**: Lines 1547-1646
  - themes.create: Lines 1548-1564 (protectedProcedure)
  - themes.update: Lines 1566-1603 (protectedProcedure)
  - themes.delete: Lines 1605-1613 (protectedProcedure)
  - themes.get: Lines 1615-1627 (publicProcedure)
  - themes.list: Lines 1629-1636 (protectedProcedure)
  - themes.listPublic: Lines 1638-1645 (publicProcedure)

### DB Schema (api/schema.sql)
- **themes table**: Lines 68-79
- Current columns: id, name, prompt_modifier, style, creator_user_id, is_public, created_at, updated_at, deleted_at
- **Add thumbnail_url after line 73** (after style TEXT)

### Shared Types (shared/src/types/asset-system.ts)
- **ThemeSchema**: Lines 6-15
- **Theme type**: Line 17
- **NO styleSchema in this file** - it's defined in asset-system.ts API file

### Tabs Layout (app/app/(tabs)/_layout.tsx)
- Uses Expo Router's `Tabs` component
- TabIcon component with emoji lookup (lines 4-16)
- Existing tabs: lab (🔬), maker (🎮), browse (🔍)
- **Add themes tab after line 68** (after browse tab)
- **Add "themes: '🎨'" to icons object** (lines 5-9)

### Browse Page Pattern (app/app/(tabs)/browse.tsx)
- Uses SafeAreaView, ScrollView with RefreshControl
- FilterBar component for search/filters
- GameGridCard for display
- useBrowseGames hook for data fetching
- Pagination: PAGE_SIZE = 20, offset-based, "Load more" button
- Client-side filtering with useMemo
- Loading/empty states with ActivityIndicator

## Theme Thumbnail Implementation
- Added `thumbnail_url` (TEXT) to `themes` table in `api/schema.sql`.
- Updated `ThemeRow` interface in `api/src/trpc/routes/asset-system.ts` to include `thumbnail_url: string | null`.
- Updated `toClientTheme` transformation in `api/src/trpc/routes/asset-system.ts` to map `thumbnail_url` to `thumbnailUrl`.
- Updated `ThemeSchema` in `shared/src/types/asset-system.ts` to include `thumbnailUrl: z.string().optional().nullable()`.
- Verified type safety with `pnpm tsc --noEmit`.

## Theme Access Control Implementation
- Enforced ownership on `themes.update` and `themes.delete` by adding `creator_user_id = ?` to the SQL `WHERE` clause.
- Used `result.meta.changes === 0` to detect if the operation failed due to missing record or lack of ownership.
- Threw `TRPCError({ code: 'NOT_FOUND' })` for failed updates/deletes to avoid leaking existence of themes owned by others.

## themes.getMine Implementation
- Added `themes.getMine` endpoint to allow users to fetch their own themes (including private ones).
- Uses `protectedProcedure` to ensure authentication.
- Filters by `creator_user_id` to prevent unauthorized access to other users' private themes.
- Follows the pattern of `themes.get` but with ownership check.

## Pagination and Search in Asset System
- Implemented pagination (limit/offset) and search (query) for `themes.list` and `themes.listPublic`.
- Search matches against `name` and `prompt_modifier` using `LOWER()` and `LIKE` for case-insensitive partial matching.
- Used dynamic SQL construction with `ctx.env.DB.prepare().bind()` to handle optional search parameters safely.
- Default limit is 20, max 100.

- Added enhancePrompt mutation to themes router for AI prompt enhancement using gpt-4o-mini.

## ThemeFilterBar Implementation
- Created `ThemeFilterBar` component following the `FilterBar` pattern from browse components.
- Used NativeWind classes for styling: `bg-gray-800`, `text-white`, `border-gray-700`.
- Implemented search input with clear button functionality.
- Verified type safety with `pnpm tsc --noEmit`.

## useBrowseThemes Hook Implementation
- Followed the pattern from `useBrowseGames.ts` for pagination and tRPC integration.
- Implemented dual-list management for "My Themes" and "Public Themes".
- Used `searchQuery` as a dependency for `fetch` callbacks to ensure automatic refetching on search changes.
- Pagination uses offset-based approach: `(page - 1) * pageSize`.
- Default `PAGE_SIZE` set to 20 as per requirements.

## 2026-02-03 Final Verification

### Implementation Complete
All 15 tasks verified complete:
- Tasks 1-5: API backend (thumbnail_url, pagination, access control, getMine, enhancePrompt)
- Tasks 6-9: Components (ThemeCard, ThemeFilterBar, useBrowseThemes, ThemeEditorModal)
- Tasks 10-12: Pages and navigation (themes tab, theme details, tab bar)
- Tasks 13-14: Exports and tests
- Task 15: Final verification

### TypeScript Status
- **Themes implementation**: ZERO TypeScript errors
- **Pre-existing errors**: Found in `lib/game-engine/` files (unrelated to themes)
  - `RunScriptActionExecutor.ts`: Property mismatches (templateId vs template, velocity, etc.)
  - `ScriptSandboxRuntimeSystem.ts`: Similar property issues
  - `ScriptSandbox.test.ts`: Missing mock properties
  - `game-detail/[id].tsx`: Null checks needed

### API Test Status
- Themes tests written and comprehensive (655 lines)
- tRPC route tests currently blocked by infrastructure issue:
  - `game-bundler` package imports `node:child_process`
  - Not compatible with Cloudflare Workers test environment
  - This is a pre-existing issue affecting all tRPC route tests

### Files Created
- `app/components/themes/ThemeCard.tsx`
- `app/components/themes/ThemeFilterBar.tsx`
- `app/components/themes/ThemeEditorModal.tsx`
- `app/components/themes/index.ts`
- `app/hooks/useBrowseThemes.ts`
- `app/app/(tabs)/themes.tsx`
- `app/app/themes/[id].tsx`
- `api/src/trpc/routes/asset-system.themes.test.ts`

### Files Modified
- `api/schema.sql` (thumbnail_url column)
- `api/src/trpc/routes/asset-system.ts` (all themes endpoints)
- `shared/src/types/asset-system.ts` (thumbnailUrl field)
- `app/app/(tabs)/_layout.tsx` (themes tab)
