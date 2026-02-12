# Decisions — Asset System V4

## 2026-02-12 Architecture Decisions

### DO Pattern
- Use `DurableObjectState` constructor pattern (matching existing `RealtimeRelayDO`), NOT the `extends DurableObject` class pattern
- Export from `api/src/index.ts` alongside `RealtimeRelayDO`

### Migration Tag
- Next wrangler migration tag = `v5` for `GameRepoDO`

### R2 Key Structure
- Blobs: `blobs/{first2chars}/{sha256hash}` (fan-out for hot prefix avoidance)
- Git repos: `repos/{gameId}/.git/...` (bare repos, text files only)

### Content Hash
- SHA-256 for content addressing
- Store in `assets.content_hash` column with unique index (WHERE content_hash IS NOT NULL)
