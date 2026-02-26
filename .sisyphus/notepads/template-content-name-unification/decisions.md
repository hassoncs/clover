# Decisions — template-content-name-unification

## 2026-02-26 Atlas: Architecture Decisions

### Naming Taxonomy (from plan)
- `templateId` — mechanic identifier (e.g. `year-jinx`, `quiplash`) — STABLE, no renames during app-split
- `contentType` — content schema identifier (e.g. `estimation`, `trivia`) — canonical, generic, brand-agnostic
- `brandTitle` — presentation-only display name per brand — NOT in runtime/API

### Migration Strategy
- `wager` → `estimation` (DB rows + code)
- `history` → `estimation` (DB rows + code, if any exist)
- `amen-*` prefixed types → split into `brandId=amen` + canonical `contentType`
- Compatibility window: dual-read fallback during rollout (T7), removed in T16

### Test Strategy
- Tests-after (per plan interview)
- Framework: Vitest + Turborepo (`pnpm test`)
- Evidence path: `.sisyphus/evidence/task-{N}-{scenario}.{ext}`
