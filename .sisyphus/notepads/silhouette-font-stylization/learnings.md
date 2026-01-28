## 2026-01-28

- When adding a new `AssetType` discriminator (e.g. `text_grid`), `pipelineRegistry: Record<AssetType, Stage[]>` must be updated too or `tsc` will fail.
- `TextGridSpec` and supporting layout types live in `api/src/ai/pipeline/types.ts` and are exported for use across the pipeline.
