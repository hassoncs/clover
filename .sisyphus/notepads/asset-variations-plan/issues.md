# Issues / Gotchas - Asset Sheets

Appended 2026-01-24

- Background removal on full sprite sheets can accidentally remove interior negative space; prefer prompting for alpha output and only use remove-bg as a fallback.
- AI sometimes "draws" grid lines or labels when asked for a grid; prompts must explicitly forbid borders/labels, and guide images should not be visible in the final output.
- Tile sheets and sprite sheets have different downstream semantics (tile collision/physics vs entity animation); keep a shared atlas core but preserve per-kind metadata.
