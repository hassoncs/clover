# Learnings - Asset Sheets

Appended 2026-01-24

- `shared/src/types/schemas.ts` already contains `TileSheetSchema` + `TileMapSchema`; these can be modeled as a specific `AssetSheet` kind to unify atlas handling.
- The asset generation pipeline in `api/src/ai/pipeline/` is stage-driven and already supports artifact debug output; adding sheet support fits cleanly by introducing a new spec + new stage(s) (guide generation + metadata upload).
- Prompt-builder style uses strongly worded, sectioned prompts; extending that pattern for layout constraints is consistent with existing code.

Appended 2026-01-25

- `shared/src/types/asset-sheet.ts` now treats `SheetRegion` as a runtime rect only (`{ x, y, w, h }`); any grid/strip addressing should be resolved to rects before consumption.
- `VariationGroup.order?: string[]` + `selectVariantByIndex(sheet, groupId, index)` provide deterministic pieceType -> variant mapping (fallback: sorted variant keys).

- `buildSheetMetadataStage` should emit variation metadata in canonical runtime shape: `entries` as a record keyed by variant key, region fields `w/h`, and `groups.default` with `variants` mapping + `order` + `defaultGroupId`.
- For Cloudflare Workers Vitest, `env` from `cloudflare:test` is typed via an ambient `ProvidedEnv` interface; add a local module augmentation (e.g. `api/src/cloudflare-test.d.ts`) to make bindings like `DB` available to tests.

Appended 2026-01-25

- `Match3GameSystem` should use `selectVariantByIndex(sheet, groupId, pieceType)` and pass the returned `SheetRegion` directly to Godot; avoid re-implementing grid -> rect math in app code.
