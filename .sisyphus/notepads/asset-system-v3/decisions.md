# Decisions - Asset System V3 Migration

## Architectural Choices

## 2026-02-03T22:06:45Z - Initial Plan Decisions
- NO data migration needed - tables will be dropped and recreated empty
- CASCADE delete on pack_entries when pack deleted
- themes table gets `is_public` and `style` columns
- CLI uses tRPC (same code path as Web)
