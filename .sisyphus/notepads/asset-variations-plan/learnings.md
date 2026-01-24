# Learnings - Asset Sheets

Appended 2026-01-24

- `shared/src/types/schemas.ts` already contains `TileSheetSchema` + `TileMapSchema`; these can be modeled as a specific `AssetSheet` kind to unify atlas handling.
- The asset generation pipeline in `api/src/ai/pipeline/` is stage-driven and already supports artifact debug output; adding sheet support fits cleanly by introducing a new spec + new stage(s) (guide generation + metadata upload).
- Prompt-builder style uses strongly worded, sectioned prompts; extending that pattern for layout constraints is consistent with existing code.
