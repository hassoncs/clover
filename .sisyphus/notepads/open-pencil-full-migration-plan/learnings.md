## [2026-03-03T00:00:00Z] Task T1: Consumer Audit Complete
- Captured **137** total consumer rows across **65** unique importer files touching pen/design legacy and bridge surfaces.
- Most coupled package is `packages/design-canvas` (73 rows), followed by `api` (24) and `packages/editor` (21).
- Legacy `DesignDocument` ecosystem remains broadly referenced through both `@slopcade/shared/types/design` and `@slopcade/shared` re-exports.
- Pen runtime types are concentrated in `packages/design-canvas/src/pen/*`, with schema entry points in `apps/pencil` and panel seams requiring T7 coordination.
- Bridge/API coupling is narrow but critical: `__PENCIL_BRIDGE__` + MCP tools (`pencil_get_document`, `pencil_apply_ops`) remain hard compatibility gates.
