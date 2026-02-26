# Issues — template-content-name-unification

## 2026-02-26 Atlas: Known Issues

### headsUp folder vs heads-up registry key
- `r2/games/party/headsUp/` folder name uses camelCase
- Registry key is `heads-up` (kebab-case)
- T9 must add explicit compatibility note — do NOT rename folder during this plan

### FakeWord casing
- `CONTENT_TYPES` includes `"FakeWord"` (PascalCase) — inconsistent with all other lowercase values
- Out of scope for this plan (not mentioned in plan) — note for future cleanup

### No DB-level constraint on content_type
- `party_content.content_type` is plain `text()` — no CHECK constraint
- Migration must handle normalization at application level
- Future: add CHECK constraint after migration (out of scope for this plan)
