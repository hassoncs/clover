# Legacy Asset Pack Removal

## TL;DR

> **Quick Summary**: Remove ALL legacy asset pack code, rewire generation system to write to remixes instead, drop pack DB tables.
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 5

---

## Context

The remix system is fully implemented and migrated. The user wants zero technical debt — remove all backward-compat code, pack routes, pack types, pack UI, and rewire the generation pipeline to target remixes directly.

### Key Architecture Decision

The generation jobs system currently writes completed assets to `pack_entries` as individual rows. After removal, it will update `remixes.asset_overrides_json` (a JSON column) instead. This is a read-modify-write pattern but is fine since only one job writes to a remix at a time.

`generation_jobs.pack_id` → renamed to `remix_id` in both schema and code.

The `themes` table/router is **independent** and stays — themes are reusable prompt modifiers, not tied to packs.

---

## Execution Strategy

### Wave 1 (Foundation):
- Task 1: Schema + types cleanup (drop tables, rename columns, remove pack types)

### Wave 2 (API - parallel):
- Task 2: Delete pack router + rewire generation-jobs to use remixes
- Task 3: Rewire orchestration to create remixes instead of packs

### Wave 3 (Frontend - parallel):
- Task 4: Delete pack UI components + rewire editor hooks
- Task 5: Clean up play/detail pages (remove packId params)

### Wave 4 (Cleanup):
- Task 6: Delete migration scripts + clean up shared utils + remaining files

---

## TODOs

- [x] 1. Schema, shared types, and API types cleanup

  **What to do**:
  - `api/schema.sql`: Remove `asset_packs` table, `pack_entries` table, and their indexes. Rename `generation_jobs.pack_id` column to `remix_id`.
  - `shared/src/types/asset-system.ts`: Remove `AssetPackSchema`, `AssetPack`, `PackEntrySchema`, `PackEntry`, `AssetSystemConfigSchema` (has `activePackId`/`packIds`). Update `GenerationJobSchema` field `packId` → `remixId`.
  - `api/src/trpc/routes/asset-system/types.ts`: Remove `AssetPackRow`, `PackEntryRow`. Update `GenerationJobRow.pack_id` → `remix_id`.
  - `api/src/trpc/routes/asset-system/utils.ts`: Remove `toClientPack`, `toClientEntry`, remove `AssetPackRow`/`PackEntryRow` imports. Update `toClientJob` to map `remix_id` → `remixId`.

  **Must NOT do**:
  - Do not touch `themes` table or `ThemeRow` — they are independent.
  - Do not touch `remixes` table — it's the replacement.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`verification-before-completion`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1
  - **Blocks**: 2, 3, 4, 5, 6
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] No `asset_packs` or `pack_entries` CREATE TABLE in schema.sql
  - [ ] No `AssetPackRow`, `PackEntryRow`, `AssetPackSchema`, `PackEntrySchema` in codebase
  - [ ] `GenerationJobRow` uses `remix_id`, `GenerationJobSchema` uses `remixId`
  - [ ] `toClientJob` maps `remix_id` → `remixId`

- [x] 2. Delete pack router + rewire generation-jobs to use remixes

  **What to do**:
  - Delete `api/src/trpc/routes/asset-system/asset-packs.ts` entirely.
  - Update `api/src/trpc/routes/asset-system/index.ts`: Remove `assetPacksRouter` import and from `mergeRouters`.
  - Rewrite `api/src/trpc/routes/asset-system/generation-jobs.ts`:
    - `createGenerationJob`: `packId` input → `remixId` input, SQL insert uses `remix_id`
    - `regeneratePack`: Rename to `regenerateRemix`. Query `remixes` table instead of `asset_packs`. Get prefab list from `asset_overrides_json` keys.
    - `processGenerationJob`: After asset success, instead of `INSERT INTO pack_entries`, read remix's `asset_overrides_json`, merge new entry, `UPDATE remixes SET asset_overrides_json = ?`. Build the asset URL using the R2 key.
    - `createSheetGenerationJob`: `packId` → `remixId`, SQL uses `remix_id`
    - `regenerateAssets`: `packId` → `remixId`, query from `remixes` instead of `asset_packs`/`pack_entries`, UPDATE `remixes` instead of `asset_packs`
    - All SQL references: `pack_id` → `remix_id` in generation_jobs inserts/selects

  **Must NOT do**:
  - Do not touch themes router.
  - Do not break generation job processing logic (the AI pipeline itself is unchanged).

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`verification-before-completion`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3)
  - **Parallel Group**: Wave 2
  - **Blocks**: 4, 5
  - **Blocked By**: 1

  **References**:
  - `api/src/trpc/routes/asset-system/generation-jobs.ts` (963 lines) — main file to rewrite
  - `api/src/trpc/routes/asset-system/remixes.ts` — remix CRUD patterns to follow
  - `api/src/trpc/routes/asset-system/utils.ts` — `resolveAssetUrl` helper for building asset URLs

  **Acceptance Criteria**:
  - [ ] `asset-packs.ts` deleted
  - [ ] No `assetPacksRouter` in index.ts
  - [ ] All `pack_id` → `remix_id` in generation-jobs.ts SQL
  - [ ] `processGenerationJob` writes to remix `asset_overrides_json` instead of `pack_entries`
  - [ ] `regeneratePack` renamed and queries `remixes` table

- [x] 3. Rewire orchestration to create remixes instead of packs

  **What to do**:
  - Update `api/src/trpc/routes/asset-system/orchestration.ts`:
    - `applyThemeToGame`: Instead of `INSERT INTO asset_packs`, `INSERT INTO remixes` with matching schema.
    - Create remix with `asset_overrides_json = '{}'` (empty, will be populated by generation job).
    - Set theme_id, theme_prompt, style on the remix row.
    - Update game definition to use `activeRemixId` instead of `activePackId` (in `assetSystem` config).
    - Return `remixId` instead of `packId` in response.

  **Must NOT do**:
  - Do not change the theme creation logic (creating a `themes` row) — that stays.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`verification-before-completion`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: 4, 5
  - **Blocked By**: 1

  **Acceptance Criteria**:
  - [ ] `applyThemeToGame` inserts into `remixes` table
  - [ ] Game definition uses `activeRemixId` instead of `activePackId`
  - [ ] Response returns `remixId` instead of `packId`

- [x] 4. Delete pack UI components + rewire editor hooks

  **What to do**:
  - Delete `app/components/editor/AssetGallery/AssetPackSelector.tsx` entirely.
  - Rewrite `app/components/editor/AssetGallery/useAssetGeneration.ts`:
    - Remove: `useCreateAssetPack`, `useAssetPacks`, `useAssetPackWithEntries`, `useUpdatePlacement`, `useDeleteAssetPack`, `useRegenerateAssetPack`, `useRegenerateAssets`, `useApplyThemeToPack`, `useApplyStyleToPack`
    - Update `generateAll`: `packId` → `remixId` param, invalidate remix queries instead of pack queries
    - Update `pollJobStatus`: invalidate remix queries instead of pack queries
    - Add equivalent remix hooks: `useCreateRemix`, `useRemixes`, `useRemixWithOverrides`, `useDeleteRemix`
  - Update `app/components/editor/AssetGallery/AssetGalleryPanel.tsx`: Replace pack references with remix references.
  - Update `app/components/editor/EditorProvider.tsx`: Remove `activePackId`, `ResolvedPackEntry` if they exist. Add `activeRemixId` if needed.
  - Delete migration test: `api/scripts/__tests__/migrate-packs-to-remixes.test.ts`

  **Must NOT do**:
  - Do not break the asset generation flow.
  - Do not remove theme components — they're independent.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`, `verification-before-completion`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5)
  - **Parallel Group**: Wave 3
  - **Blocks**: 6
  - **Blocked By**: 1, 2, 3

  **Acceptance Criteria**:
  - [ ] `AssetPackSelector.tsx` deleted
  - [ ] No `useCreateAssetPack`, `useAssetPacks`, etc. in codebase
  - [ ] Generation hooks use `remixId` instead of `packId`
  - [ ] Editor uses `activeRemixId` if applicable

- [x] 5. Clean up play/detail pages (remove packId params)

  **What to do**:
  - `app/app/play/[id].tsx`: Remove `packId` from search params. Remove `effectivePackId` logic. Remove the `useEffect` that loads packs. Remove pack fallback in enrichedDefinition. Keep only `remixId` flow.
  - `app/app/game-detail/[id].tsx`: Remove the legacy packs listing section. Remove `packsData` state and pack loading effect. Keep only the remix cards section.
  - `app/app/game/[id].tsx`: Remove `packId` search param if present.
  - `app/lib/assets/AssetManifest.ts`: Remove `resolvedPackEntries` and pack-specific ID logic.
  - `app/lib/assets/mergeAssetsIntoTemplates.ts`: Remove pack merging if separate from remix merging.
  - `app/lib/offline/download-manager.ts`: Remove pack download logic.
  - `app/lib/game-engine/hooks/useAssetResolution.ts`: Remove pack resolution.

  **Must NOT do**:
  - Do not break the remix play flow.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`, `verification-before-completion`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4)
  - **Parallel Group**: Wave 3
  - **Blocks**: 6
  - **Blocked By**: 1, 2

  **Acceptance Criteria**:
  - [ ] No `packId` search params in play/detail/game pages
  - [ ] No pack loading effects in play screen
  - [ ] No pack listing in game detail
  - [ ] Remix flow still works end-to-end

- [x] 6. Delete migration scripts + clean up remaining files

  **What to do**:
  - Delete: `api/scripts/migrate-packs-to-remixes.ts`, `api/scripts/run-local-migration.ts`, `api/scripts/seed-asset-packs.ts`
  - Clean up `shared/src/types/asset-sheet.ts`: Remove any `packId` references
  - Clean up `shared/src/utils/asset-url.ts`: Remove pack path logic if present
  - Clean up `shared/src/utils/definition-resolver.ts`: Remove pack context if present
  - Clean up `api/src/trpc/routes/ui-components.ts`: Remove pack references if present
  - Clean up `api/src/ai/agent/stages/asset.ts` and `theme.ts`: Remove pack references
  - Delete `.sisyphus/plans/remix-rollout-runbook.md` (no longer needed — no migration window)
  - Delete `.sisyphus/evidence/task-7-migration-report.json` (migration artifacts)
  - Verify: `tsc --noEmit` passes, `bun test` passes

  **Must NOT do**:
  - Do not touch the AI pipeline internals (AssetService, executor) unless they reference pack_id.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`verification-before-completion`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: 4, 5

  **Acceptance Criteria**:
  - [ ] Migration scripts deleted
  - [ ] No `packId` or `pack_id` references anywhere in source code
  - [ ] `tsc --noEmit` passes
  - [ ] All tests pass

---

## Success Criteria

- [x] Zero references to `asset_packs`, `pack_entries`, `packId`, `pack_id` in source code
- [x] Generation pipeline writes to remixes instead of packs
- [x] Play flow uses only `remixId`
- [x] All tests pass, build succeeds
- [x] `themes` table and router are preserved (independent of packs)
