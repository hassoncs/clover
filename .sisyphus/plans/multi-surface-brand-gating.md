# Multi-Surface Brand Gating — Product Surface Split

## TL;DR

> **Quick Summary**: Polish the existing BrandManifest system to properly gate routes and API endpoints per product surface. The "4 apps" collapse to 2 axes (brand × mode) already handled by the manifest system. No repo restructuring needed — just enforce the feature flags that already exist.
> 
> **Deliverables**:
> - Complete route gating for amen.games (all non-party routes guarded)
> - API-side capability enforcement (reject mutations for disabled features)
> - Updated BrandManifest types with `appSurface` discriminator
> - Simplified amen profile page (auth-only, no social/maker fluff)
> - Documented product surface matrix for future brands
> 
> **Estimated Effort**: Medium (2-3 days engineering)
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 (manifest types) → Tasks 2-5 (parallel gating) → Task 6 (API checks) → Task 7 (verification)

---

## Context

### Original Request
User wants to organize the codebase for 4 product surfaces (amen.games, Slopcade Party, Slopcade Builder, Shader Gallery) without splitting into separate repos. amen.games is launching Easter 2026 (Apr 5).

### Interview Summary
**Key Discussions**:
- User described 4 surfaces but agreed they collapse to 2 axes: brand × product-mode
- User confirmed: no per-page conditional sprawl, no route-directory swapping
- Shader Gallery deferred entirely
- Content pipeline stays internal
- B2B white-label = org tier of party product

**Research Findings**:
- 6 explore agents mapped engine coupling, editor/shader system, build system, social boundaries, routes, domain detection
- 2 librarian agents researched Expo multi-app patterns and multi-product API patterns
- Oracle confirmed: existing BrandManifest system is the right architecture
- Native modules can't be tree-shaken — route swapping doesn't save binary size
- Social components only imported by leaf routes — clean exclusion boundary

### Metis Review
**Identified Gaps** (addressed):
- "Same binary vs separate listing?" → Separate. EAS profiles already exist.
- "Cross-brand sessions?" → Separate Supabase projects. Complete isolation. Already configured.
- "Full ungated route audit?" → Completed. 9 specific routes identified.
- "7-week scope overlap?" → This plan covers brand-gating only. Game implementation has its own plan.

---

## Work Objectives

### Core Objective
Enforce product-surface boundaries so amen.games users cannot access game-builder, social, or economy features through any route or API endpoint.

### Concrete Deliverables
- `BrandFeatures` type updated with clear product-mode semantics
- 9 route files guarded with brand-aware redirects
- `game-detail/[id].tsx` fork/edit buttons hidden for non-builder brands
- `profile.tsx` simplified for party-only brands (no social/maker sections)
- `(tabs)/_layout.tsx` header actions gated (no notifications/discover icons for party-only)
- API `games.create`, `games.fork`, `games.publish` reject non-builder brands
- Documentation: product surface matrix in `packages/brands/README.md`

### Definition of Done
- [ ] `BRAND_ID=amen pnpm web` → browse page loads, no feed tab, no create button, no social links
- [ ] Navigating to `/editor/anything` as amen → redirects to browse
- [ ] Navigating to `/discover` as amen → redirects to browse
- [ ] API call `games.create` with `x-brand-id: amen` → 403 Forbidden
- [ ] API call `games.fork` with `x-brand-id: amen` → 403 Forbidden
- [ ] Profile page as amen → shows auth + sign out + org management, no sparks/games/social

### Must Have
- Route guards on ALL 9 identified routes
- API-side enforcement on mutation endpoints
- Clean amen profile page

### Must NOT Have (Guardrails)
- NO repo restructuring (no route-directory swapping, no `unstable_src`)
- NO new abstraction layers on brand system
- NO Shader Gallery infrastructure or stubs
- NO Slopcade Party manifest yet (marketing decision, not engineering)
- NO refactoring of social/economy modules (just gate them)
- NO changes to native modules (Godot, Skia)
- NO analytics per brand (post-launch)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: Tests-after for API capability checks
- **Framework**: vitest

### Agent-Executed QA Scenarios (MANDATORY)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| Route guards | Playwright | Navigate to guarded routes, verify redirect |
| API checks | Bash (curl) | Send mutations with amen brand header, verify 403 |
| UI changes | Playwright | Navigate as amen brand, verify elements hidden |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: Update BrandManifest types + add appSurface field

Wave 2 (After Wave 1):
├── Task 2: Route guards for non-party routes
├── Task 3: Simplify amen profile page
├── Task 4: Gate game-detail fork/edit buttons
└── Task 5: Gate tab layout header actions

Wave 3 (After Wave 2):
├── Task 6: API capability enforcement
└── Task 7: Verification + documentation

Critical Path: Task 1 → Task 2 → Task 7
Parallel Speedup: ~40% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 4, 5 | None (foundation) |
| 2 | 1 | 7 | 3, 4, 5 |
| 3 | 1 | 7 | 2, 4, 5 |
| 4 | 1 | 7 | 2, 3, 5 |
| 5 | 1 | 7 | 2, 3, 4 |
| 6 | 1 | 7 | 2, 3, 4, 5 |
| 7 | 2, 3, 4, 5, 6 | None | None (final) |

---

## TODOs

- [ ] 1. Update BrandManifest types and add appSurface discriminator

  **What to do**:
  - Add `appSurface: "full" | "party-only"` to `BrandManifest` interface in `packages/brands/src/types.ts`
  - Set `appSurface: "party-only"` in `packages/brands/src/manifests/amen.ts`
  - Set `appSurface: "full"` in `packages/brands/src/manifests/slopcade.ts`
  - Export a helper `isPartyOnly(): boolean` from `app/lib/brand/index.ts`

  **Must NOT do**:
  - Do not add new feature flags beyond `appSurface`
  - Do not refactor existing `BrandFeatures` — `appSurface` is additive

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small type change across 3 files
  - **Skills**: [`game-authoring`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundation task)
  - **Blocks**: Tasks 2, 3, 4, 5, 6

  **References**:
  - `packages/brands/src/types.ts:38-45` — `BrandFeatures` interface (existing feature flags)
  - `packages/brands/src/manifests/amen.ts:59-66` — Amen features block
  - `packages/brands/src/manifests/slopcade.ts:58-65` — Slopcade features block
  - `app/lib/brand/index.ts:27-31` — `isBrandFeatureEnabled` helper (pattern to follow)

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` passes in `packages/brands/` and `app/`
  - [ ] `activeBrand.appSurface` returns `"party-only"` when `BRAND_ID=amen`
  - [ ] `activeBrand.appSurface` returns `"full"` when `BRAND_ID=slopcade`

  **Commit**: YES
  - Message: `feat(brands): add appSurface discriminator to BrandManifest`
  - Files: `packages/brands/src/types.ts`, `packages/brands/src/manifests/amen.ts`, `packages/brands/src/manifests/slopcade.ts`, `app/lib/brand/index.ts`

---

- [ ] 2. Add route guards for non-party routes

  **What to do**:
  - Create a `RouteGuard` component in `app/components/navigation/RouteGuard.tsx` that checks `activeBrand.appSurface` and redirects to `/(tabs)/browse` if the route is not allowed for party-only surfaces
  - Wrap or redirect the following routes when `appSurface === "party-only"`:
    - `app/app/editor/[id].tsx` → redirect to browse
    - `app/app/discover.tsx` → redirect to browse
    - `app/app/notifications.tsx` → redirect to browse
    - `app/app/user/[id].tsx` → redirect to browse
    - `app/app/user/followers.tsx` → redirect to browse
    - `app/app/settings/edit-profile.tsx` → redirect to browse
    - `app/app/settings/blocked-users.tsx` → redirect to browse
    - `app/app/themes/index.tsx` → redirect to browse
  - Use `<Redirect href="/(tabs)/browse" />` at top of each component when guard fires

  **Must NOT do**:
  - Do not delete any route files — they still serve slopcade
  - Do not add route guards to `/play/[id]`, `/party/*`, `/browse`, `/profile`, `/landing`, `/game-detail/[id]`, `/settings/subscription`, `/settings/my-org`, `/settings/join-org`, `/join/[slug]` — these are shared routes

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Repetitive small change across multiple files
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2 with Tasks 3, 4, 5)
  - **Blocked By**: Task 1

  **References**:
  - `app/app/index.tsx:9-16` — Existing brand-conditional redirect pattern (follow this)
  - `app/lib/brand/index.ts:22` — `activeBrandId` export
  - `app/app/editor/[id].tsx` — Editor route (add guard at top)
  - `app/app/discover.tsx` — Discover route (add guard at top)
  - `app/app/notifications.tsx` — Notifications route (add guard at top)
  - `app/app/user/[id].tsx` — User profile route (add guard at top)
  - `app/app/user/followers.tsx` — Followers route (add guard at top)
  - `app/app/settings/edit-profile.tsx` — Edit profile route (add guard at top)
  - `app/app/settings/blocked-users.tsx` — Blocked users route (add guard at top)
  - `app/app/themes/index.tsx` — Themes route (add guard at top)

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Guarded routes redirect to browse for amen brand
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running with BRAND_ID=amen on localhost:8085
    Steps:
      1. Navigate to: http://localhost:8085/editor/test-id
      2. Wait for: navigation (timeout: 5s)
      3. Assert: URL path is /(tabs)/browse
      4. Navigate to: http://localhost:8085/discover
      5. Wait for: navigation (timeout: 5s)
      6. Assert: URL path is /(tabs)/browse
      7. Navigate to: http://localhost:8085/notifications
      8. Wait for: navigation (timeout: 5s)
      9. Assert: URL path is /(tabs)/browse
      10. Screenshot: .sisyphus/evidence/task-2-route-guards-amen.png
    Expected Result: All guarded routes redirect to browse
    Evidence: .sisyphus/evidence/task-2-route-guards-amen.png

  Scenario: Guarded routes work normally for slopcade brand
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running with BRAND_ID=slopcade on localhost:8085
    Steps:
      1. Navigate to: http://localhost:8085/discover
      2. Wait for: text "Discover" visible (timeout: 5s)
      3. Assert: URL path is /discover (no redirect)
      4. Screenshot: .sisyphus/evidence/task-2-route-guards-slopcade.png
    Expected Result: Routes accessible for slopcade
    Evidence: .sisyphus/evidence/task-2-route-guards-slopcade.png
  ```

  **Commit**: YES
  - Message: `feat(app): add route guards for party-only brand surfaces`
  - Files: `app/components/navigation/RouteGuard.tsx`, 8 route files
  - Pre-commit: `tsc --noEmit`

---

- [ ] 3. Simplify amen profile page

  **What to do**:
  - In `app/app/(tabs)/profile.tsx`, wrap the following sections in `activeBrand.appSurface !== "party-only"` checks:
    - Follower/following counts section (lines 486-519)
    - Edit/Share profile buttons (lines 521-533)
    - Notifications icon button (line 452)
    - Discover icon button (line 461)
    - "Sparks" balance + CurrencySheet (lines 570-575, 849-852)
    - "Open Themes Library" button (lines 576-583)
    - "Blocked Users" button (lines 584-591)
    - "My Games" entire section (lines 632-758)
    - "Invite Friend" button + modal (lines 612-620, 763-847)
  - For party-only surfaces, the profile page should show ONLY:
    - Avatar + display name
    - "My Church" button (if `organizations` feature enabled)
    - "Subscription" link
    - "Rate Us" link (if `appStoreReviewUrl` set)
    - "Sign Out" button

  **Must NOT do**:
  - Do not refactor the profile page structure — just wrap sections
  - Do not create a separate amen profile page — use conditional rendering
  - Do not touch LoginScreen component (shared across brands)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI layout changes requiring careful section gating
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2 with Tasks 2, 4, 5)
  - **Blocked By**: Task 1

  **References**:
  - `app/app/(tabs)/profile.tsx:267-855` — ProfileScreen component (full authenticated view)
  - `app/app/(tabs)/profile.tsx:104-107` — Existing `activeBrand.features.userGeneratedContent` guard pattern
  - `app/app/(tabs)/profile.tsx:602` — Existing `activeBrand.features.organizations` guard pattern
  - `app/app/(tabs)/profile.tsx:652` — Existing `activeBrand.features.userGeneratedContent` guard pattern

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Amen profile shows minimal UI
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running with BRAND_ID=amen, user authenticated
    Steps:
      1. Navigate to: http://localhost:8085/(tabs)/profile
      2. Wait for: profile page loaded (timeout: 10s)
      3. Assert: text "My Games" NOT visible
      4. Assert: text "Sparks" NOT visible
      5. Assert: text "followers" NOT visible
      6. Assert: text "Sign Out" IS visible
      7. Assert: text "My Church" IS visible (organizations=true for amen)
      8. Screenshot: .sisyphus/evidence/task-3-amen-profile.png
    Expected Result: Profile shows auth + org + sign out only
    Evidence: .sisyphus/evidence/task-3-amen-profile.png
  ```

  **Commit**: YES
  - Message: `feat(profile): simplify profile page for party-only brand surfaces`
  - Files: `app/app/(tabs)/profile.tsx`

---

- [ ] 4. Gate game-detail fork/edit buttons

  **What to do**:
  - In `app/app/game-detail/[id].tsx`, wrap the Fork button (lines 268-285) and Edit button (lines 287-304) in a `activeBrand.features.gameEditor` check
  - Import `activeBrand` from `@/lib/brand`
  - When `gameEditor === false`, only show the Play button (full width)
  - Also hide the Download for Offline button if desired (or keep — offline play is useful for party-only)

  **Must NOT do**:
  - Do not remove fork/edit handler functions (they still serve slopcade)
  - Do not change the Play button behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple conditional rendering in one file
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2 with Tasks 2, 3, 5)
  - **Blocked By**: Task 1

  **References**:
  - `app/app/game-detail/[id].tsx:267-318` — Action buttons section
  - `app/app/(tabs)/_layout.tsx:107` — Existing `activeBrand.features.gameEditor` guard pattern

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` passes
  - [ ] Fork and Edit buttons not visible when `BRAND_ID=amen`
  - [ ] Play button takes full width when Fork/Edit hidden

  **Commit**: YES (groups with Task 5)
  - Message: `feat(game-detail): hide fork/edit buttons for party-only brands`
  - Files: `app/app/game-detail/[id].tsx`

---

- [ ] 5. Gate tab layout header actions

  **What to do**:
  - In `app/app/(tabs)/_layout.tsx`, gate the notifications and discover header icons for party-only surfaces
  - In `TAB_HEADER_CONFIG.browse.rightIcons`, conditionally include icons based on `activeBrand.appSurface`
  - For party-only: `rightIcons: []` (or just the menu icon)
  - Remove the profile tab entry for party-only? NO — keep it for auth/settings access, but simplify it (Task 3 handles the content)

  **Must NOT do**:
  - Do not remove the browse or profile tabs
  - Do not change the FloatingTabBar component itself

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small config change in layout file
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2 with Tasks 2, 3, 4)
  - **Blocked By**: Task 1

  **References**:
  - `app/app/(tabs)/_layout.tsx:19-36` — `TAB_HEADER_CONFIG` object
  - `app/app/(tabs)/_layout.tsx:107` — Existing `activeBrand.features.gameEditor` guard for create button
  - `app/app/(tabs)/_layout.tsx:152` — Existing `activeBrand.features.socialFeed` guard for feed tab

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` passes
  - [ ] No notification or discover icons in header when `BRAND_ID=amen`
  - [ ] Icons present when `BRAND_ID=slopcade`

  **Commit**: YES (groups with Task 4)
  - Message: `feat(tabs): gate header actions for party-only brand surfaces`
  - Files: `app/app/(tabs)/_layout.tsx`

---

- [ ] 6. API capability enforcement

  **What to do**:
  - In `api/src/trpc/context.ts`, ensure `brandId` is available on context (already is via `x-brand-id` header)
  - Create a `partyOnlyGuard` middleware in `api/src/trpc/middleware/` that rejects mutations when the brand is party-only
  - Apply the guard to these tRPC endpoints:
    - `games.create` — reject for party-only brands
    - `games.fork` — reject for party-only brands
    - `games.publish` — reject for party-only brands
    - `games.generate` — reject for party-only brands (AI generation)
    - `games.refine` — reject for party-only brands
    - `games.analyze` — reject for party-only brands
  - Return `TRPCError({ code: 'FORBIDDEN', message: 'This feature is not available for your product' })`
  - Import brand manifest on API side to check features

  **Must NOT do**:
  - Do not gate read-only endpoints (games.getPublic, games.list are fine for all brands)
  - Do not gate party-related endpoints
  - Do not gate auth/user/billing endpoints (shared across brands)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Backend middleware with straightforward gating logic
  - **Skills**: [`testing-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2 with Tasks 2-5)
  - **Blocked By**: Task 1

  **References**:
  - `api/src/trpc/context.ts` — Context creation with brand header
  - `api/src/trpc/routes/games.ts` — Games router with create/fork/publish endpoints
  - `app/lib/trpc/headers.ts` — How `x-brand-id` header is sent
  - `packages/brands/src/index.ts:59-66` — `getBrandManifest()` function

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` passes in `api/`

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: games.create rejected for amen brand
    Tool: Bash (curl)
    Preconditions: API running on localhost:8789
    Steps:
      1. curl -s -w "\n%{http_code}" -X POST http://localhost:8789/api/trpc/games.create \
           -H "Content-Type: application/json" \
           -H "x-brand-id: amen" \
           -d '{"title":"test","definition":"{}","isPublic":false}'
      2. Assert: response contains "FORBIDDEN" or status is 403
    Expected Result: Mutation rejected for party-only brand
    Evidence: Response body captured

  Scenario: games.create allowed for slopcade brand
    Tool: Bash (curl)
    Preconditions: API running on localhost:8789, valid auth token
    Steps:
      1. curl -s -w "\n%{http_code}" -X POST http://localhost:8789/api/trpc/games.create \
           -H "Content-Type: application/json" \
           -H "x-brand-id: slopcade" \
           -H "Authorization: Bearer $TEST_TOKEN" \
           -d '{"title":"test","definition":"{}","isPublic":false}'
      2. Assert: status is 200 or 201 (not 403)
    Expected Result: Mutation allowed for full brand
    Evidence: Response body captured
  ```

  **Commit**: YES
  - Message: `feat(api): add capability enforcement for party-only brands`
  - Files: `api/src/trpc/middleware/brand-capability.ts`, `api/src/trpc/routes/games.ts`
  - Pre-commit: `vitest run --reporter=verbose`

---

- [ ] 7. Verification + documentation

  **What to do**:
  - Run full verification of all tasks against acceptance criteria
  - Create `packages/brands/SURFACE_MATRIX.md` documenting the product surface model:
    - 2-axis table (brand × mode)
    - Which features each surface gets
    - How to add a new brand
    - How to add a new surface mode
  - Update the previous plan file `.sisyphus/plans/2026-02-17-amen-surface-split.md` to mark as superseded by this plan
  - Run `tsc --noEmit` across the entire repo

  **Must NOT do**:
  - Do not write documentation for Shader Gallery or B2B white-label (deferred)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Documentation + verification pass
  - **Skills**: [`verification-before-completion`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (final task)
  - **Blocked By**: Tasks 2, 3, 4, 5, 6

  **References**:
  - All files modified in Tasks 1-6
  - `packages/brands/src/types.ts` — Updated type definitions

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` passes for entire repo
  - [ ] All QA scenarios from Tasks 2, 3, 4, 5, 6 pass
  - [ ] `SURFACE_MATRIX.md` exists with complete documentation

  **Commit**: YES
  - Message: `docs(brands): add product surface matrix documentation`
  - Files: `packages/brands/SURFACE_MATRIX.md`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(brands): add appSurface discriminator` | types.ts, amen.ts, slopcade.ts, brand/index.ts | tsc --noEmit |
| 2 | `feat(app): add route guards for party-only surfaces` | RouteGuard.tsx + 8 route files | tsc --noEmit |
| 3 | `feat(profile): simplify profile for party-only brands` | profile.tsx | tsc --noEmit |
| 4+5 | `feat(app): gate game-detail and tab header for party-only` | game-detail/[id].tsx, _layout.tsx | tsc --noEmit |
| 6 | `feat(api): add capability enforcement for party-only` | brand-capability.ts, games.ts | vitest run |
| 7 | `docs(brands): add product surface matrix` | SURFACE_MATRIX.md | tsc --noEmit (full repo) |

---

## Success Criteria

### Verification Commands
```bash
# Type check entire repo
tsc --noEmit                              # Expected: 0 errors

# API tests
cd api && pnpm vitest run --reporter=verbose  # Expected: all pass

# Visual verification (manual for now, Playwright for agent)
BRAND_ID=amen pnpm web                    # Expected: browse page, no feed/editor/social
```

### Final Checklist
- [ ] All "Must Have" present (route guards, API checks, simplified profile)
- [ ] All "Must NOT Have" absent (no repo restructure, no shader stubs, no new abstractions)
- [ ] tsc --noEmit passes
- [ ] API capability tests pass
- [ ] Amen brand shows party-only experience end-to-end

---

## Strategic Context (Not Part of This Plan)

This plan is one piece of the amen.games launch. Related plans:
- **Game implementation**: `.sisyphus/plans/amen-launch-games-plan.md`
- **12-week roadmap**: `docs/product/PARTY_ROADMAP_12_WEEKS.md`
- **White-label architecture**: `.sisyphus/plans/white-label-christian-party-games.md`
- **Party system vision**: `docs/product/PARTY_SYSTEM_VISION.md`

### Future surface additions (documented, NOT acted on):
- **Slopcade Party**: New manifest with `partyGamesOnly: true, gameEditor: false` — marketing decision
- **Shader Gallery**: Separate `apps/shader-gallery/` Expo project — deferred until concept validated
- **B2B White-Label**: Org tier with custom content namespace — deferred until customer demand
