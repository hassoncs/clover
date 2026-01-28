## 2026-01-28

- When adding a new `AssetType` discriminator (e.g. `text_grid`), `pipelineRegistry: Record<AssetType, Stage[]>` must be updated too or `tsc` will fail.
- `TextGridSpec` and supporting layout types live in `api/src/ai/pipeline/types.ts` and are exported for use across the pipeline.

## 2026-01-28 (text-grid segmentation/layout)

- Grapheme-safe segmentation: use `Intl.Segmenter` with `granularity: 'grapheme'`.
- Word wrapping: segment into word-like vs whitespace tokens; prefer word-boundary wraps; fall back to grapheme breaks for long tokens.
- Determinism: stable cell ids (`cell_<row>_<col>`) + stable JSON stringify + SHA-256 hashes for inputs/layout.
- Hard limits: enforce max graphemes (256) and max grid cells (1024) with descriptive errors.
