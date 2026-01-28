
## 2026-01-27 - Task 2 Complete

Fixed discriminated union schema issue:
- Changed back to `z.union()` with custom `.refine()` validation
- Made `type` optional again in `BodyEntityTemplateSchema`
- Made `physics` optional in TypeScript type for body templates
- Schema now accepts templates without type (defaults to body)

Files modified:
- `shared/src/types/schemas.ts`
- `shared/src/types/entity.ts`

Typecheck: ✅ No errors
