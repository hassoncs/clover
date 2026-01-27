# Decisions - Unified Asset Sheet System

Appended 2026-01-24

- One "Asset Sheet" concept covers sprite sheets, tile sheets, and variation sheets via a discriminated union. Rationale: shared runtime needs (atlas regions + selection) and shared pipeline needs (layout-constrained generation).
- Sheets are stored as one PNG plus one JSON metadata document (atlas + entries + animations/variants). Rationale: minimizes storage/load overhead and matches Godot atlas usage.
- Pipeline uses an optional "sheet guide" image (generated grid/mask) for img2img to improve alignment; remove-background is treated as optional/fallback for sheets.
- `AssetPackV2` is the primary integration point; legacy `AssetPack` in `GameDefinition` can be extended later or via an adapter for backwards compatibility.

Appended 2026-01-25

- Canonical `AssetSheetEntry.region` is always a baked atlas rect (`{ x, y, w, h }`), even when a sheet has a conceptual grid/strip layout.
