## 2026-01-28

- When adding a new `AssetType` discriminator (e.g. `text_grid`), `pipelineRegistry: Record<AssetType, Stage[]>` must be updated too or `tsc` will fail.
- `TextGridSpec` and supporting layout types live in `api/src/ai/pipeline/types.ts` and are exported for use across the pipeline.

## 2026-01-28 (text-grid segmentation/layout)

- Grapheme-safe segmentation: use `Intl.Segmenter` with `granularity: 'grapheme'`.
- Word wrapping: segment into word-like vs whitespace tokens; prefer word-boundary wraps; fall back to grapheme breaks for long tokens.
- Determinism: stable cell ids (`cell_<row>_<col>`) + stable JSON stringify + SHA-256 hashes for inputs/layout.
- Hard limits: enforce max graphemes (256) and max grid cells (1024) with descriptive errors.

## 2026-01-28 (text-grid SVG renderer)

- Generate stable SVG: one `<g id="cell-${cellId}">` per visible cell; escape text/attrs to avoid SVG/XML injection.
- Typography controls: keep kerning on (`letter-spacing:normal`, `font-kerning:normal`) and disable ligatures (`font-variant-ligatures:none`).
- Silhouette modes: map `fill`/`stroke`/`outline` to SVG text `fill`/`stroke`/`paint-order` with optional `stroke-width`.

## 2026-01-28 (external stylizer contract)

- External stylizer input/output should validate strict dimension preservation (`width`/`height`) and require transparency; mismatches must be surfaced with descriptive errors.
- For text-grid, compute expected dimensions the same way as the SVG renderer: `cols*cellW` by `rows*cellH + (rows-1)*lineGap`.
