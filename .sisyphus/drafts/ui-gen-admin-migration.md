# Draft: Migrate Admin UI-Gen Into User Asset Editor

## Requirements (confirmed)
- Delete the admin-only UI generation page and route: `app/app/(admin)/ui-gen/index.tsx` and related admin layout if unused.
- Remove the admin tRPC route: `api/src/trpc/routes/ui-gen-admin.ts` and unregister `uiGenAdmin` from `api/src/trpc/router.ts`.
- Consolidate admin UI-gen functionality into the user-facing asset editor (AssetGallery) INCLUDING full UI component generation:
  - UI component generation (buttons, checkboxes, sliders, panels, etc.) migrated from `/admin/ui-gen`
  - Silhouette vs generated viewing (press/hold, toggle, and/or compare slider)
  - Prompt tuning controls / parameter visibility
  - Strength control (img2img) and other generation parameters surfaced to users (seed/guidance where supported)
- Keep existing user editor flows for asset packs, per-template prompts, generation progress, and alignment.

## Technical Decisions
- Confirmed: user editor supports BOTH entity sprite generation and UI component generation.

## Research Findings
- Pending (explore): codebase patterns for generation params, silhouette storage, router wiring, and tests.
- Pending (librarian): UX best practices for compare/parameter controls.

## Open Questions
- (Resolved) User editor must include full UI component generation capability (not just UX feature migration).
- What is the desired handling of historical `ui_gen_results` D1 rows and `ui-gen-admin/{id}/...` R2 objects (retain, migrate, or delete)?

## Scope Boundaries
- INCLUDE: remove admin surface area; add silhouette compare + parameter controls; add full UI component generation inside editor; adjust API/contracts as needed.
- EXCLUDE (assumed): migrating historical `ui_gen_results` data unless requested.
