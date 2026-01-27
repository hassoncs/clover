# Draft: UI Gen Admin Panel Persistence

## Requirements (confirmed)
- Persist generated UI components so they survive refreshes and can be managed (CRUD).
- CRUD: create via generation, read/list, delete.
- Debug-friendly: store/view prompts, params, timing, and references to stored images.
- Works in dev + prod (local D1/R2 and remote).
- Current UI: `app/app/(admin)/ui-gen/index.tsx` stores results in localStorage.
- Current backend: `api/src/trpc/routes/ui-gen-admin.ts` returns base64 data URLs.

## Research Findings
- R2 assets are served by `api/src/index.ts` via `GET /assets/*` (reads from `env.ASSETS`).
- Asset-system v2 pattern stores **R2 keys** in D1 and resolves to URLs using `ASSET_HOST` + `/assets/${key}`.
  - Example resolver: `api/src/trpc/routes/asset-system.ts` (`resolveStoredAssetUrl`).
- UI component pipeline already supports uploading UI state PNGs + metadata.json to R2:
  - `api/src/ai/pipeline/stages/ui-component.ts` (`uiUploadR2Stage`).
- Migrations exist for evolving D1 schema:
  - `api/migrations/20260125_ui_components.sql`
  - `api/migrations/2026-01-24-add-game-lineage.sql`

## Technical Decisions (proposed)
- Store generated PNGs in R2 (not base64 in D1) and store metadata + R2 keys in a dedicated D1 table.
- Keep localStorage only for UI preferences (e.g., sidebar width), not as source-of-truth for results.
- Prefer a new D1 table (e.g., `ui_gen_experiments`) instead of reusing `game_assets` to avoid mixing concerns and relying on JSON filtering.

## Open Questions
- Should UI Gen results be scoped per authenticated user (recommended) or globally visible to anyone with the admin page?
- Should delete also remove the R2 objects, or just soft-delete the D1 row?
- Should results be optionally tied to a `game_id`, or remain standalone?

## Scope Boundaries
- INCLUDE: DB schema + migration, R2 upload, tRPC endpoints (list/create/delete), frontend switch from localStorage to backend.
- EXCLUDE (unless requested): editing the generation prompt logic, adding background removal variants beyond current single output, advanced filtering/search UI.
