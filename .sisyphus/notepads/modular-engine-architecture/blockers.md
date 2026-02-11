# Modular Engine Architecture - Blockers

## Current Status

**Completed:**
- Task 1: Bridge sectioned loading ✅ (committed as c5fbf916)
- Task 2: Validation consolidation ⚠️ (partial - has type errors)

**Blockers:**

### Type Errors from Zod Schema Consolidation

The Zod schemas in `shared/src/types/schemas.ts` are causing widespread type incompatibilities:

1. **Behavior speed type mismatch:**
   - Zod schema allows: `number | { expr: string; ... }` (expression object)
   - TypeScript interface expects: `number` only
   - Affected: MoveBehavior, FollowBehavior, MagneticBehavior

2. **Missing required fields in Zod output:**
   - `ComboIncrementAction` requires `comboId` but Zod schema produces empty object
   - ContainerConfig missing required fields (type, rows, cols, cellSize)
   - StateMachineDefinition has incompatible state types

3. **Template/Entity type mismatches:**
   - `BaseEntityTemplate` behaviors type incompatible
   - `GameEntity` behaviors type incompatible
   - `GameRule` actions type incompatible

**Root Cause:**
The Zod schemas use `.passthrough()` or loose typing in some places, but the TypeScript interfaces are stricter. When types are derived from Zod via `z.infer<>`, they don't match the existing manual interfaces.

**Files with errors:**
- `shared/src/expressions/property-watching/DependencyAnalyzer.ts`
- `shared/src/validation/gameDefinitionValidator.ts`
- `api/src/validation/gameValidator.ts`

**Options to resolve:**

1. **Fix Zod schemas** to match existing types exactly
   - Update behavior schemas to use proper union types
   - Add missing required fields to action schemas
   - Ensure container/state machine schemas are complete

2. **Update TypeScript interfaces** to match Zod-derived types
   - Change Behavior types to accept expression objects
   - Make action fields optional where Zod allows omission
   - This is a larger change affecting many files

3. **Don't derive types from Zod**
   - Keep manual TypeScript interfaces
   - Use Zod only for runtime validation
   - Add type guards to convert between validated data and types

**Recommendation:**
Option 1 is safest - fix the Zod schemas to properly reflect the existing type structure. The schemas should be the source of truth, but they need to accurately represent the actual data shapes used in the codebase.

**Next Steps:**
1. Audit all Zod schemas against existing TypeScript interfaces
2. Fix mismatches in schemas.ts
3. Ensure `pnpm tsc --noEmit` passes
4. Then proceed with Task 3 (compiler sectioned bundles)
