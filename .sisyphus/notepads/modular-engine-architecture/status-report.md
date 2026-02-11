# Modular Engine Architecture - Status Report

## Date: 2026-02-10

## Current Status

### Completed
- **Task 1**: Bridge sectioned loading ✅ 
  - Commit: c5fbf916
  - Status: Working, all tests pass

### Blocked
- **Task 2**: Validation consolidation ⚠️ 
  - Commit: 0a06c73b
  - Status: TypeScript compiles but with widespread type errors
  - Issue: Zod schemas produce types incompatible with existing code

- **Task 3**: Compiler sectioned bundles
  - Status: Cannot proceed until Task 2 type issues resolved

## Type Errors from Task 2

The Zod schema consolidation has introduced type incompatibilities:

1. **Behavior speed type**: Zod allows `number | Expression`, but TypeScript expects `number`
2. **Action types**: Zod produces `objectOutputType` which lacks required fields
3. **Template/Entity types**: Behavior arrays are incompatible

## Root Cause

The Zod schemas in `shared/src/types/schemas.ts` were designed for runtime validation but their derived types (via `z.infer<>`) don't match the existing TypeScript interfaces. The schemas use:
- `.passthrough()` which creates loose types
- Union types that are broader than the TS interfaces
- Optional fields that are required in TS

## Options

### Option 1: Fix Zod Schemas (Recommended)
Update schemas to exactly match existing TypeScript types:
- Make behavior speed strictly `number` (remove expression union)
- Add required fields to action schemas
- Remove `.passthrough()` from container/state machine schemas

### Option 2: Update TypeScript Interfaces
Change existing types to match Zod-derived types:
- Allow expressions in behavior speed
- Make action fields optional
- This is a larger change affecting many files

### Option 3: Don't Derive Types from Zod
- Keep manual TypeScript interfaces
- Use Zod only for runtime validation
- Add type guards to convert validated data to types

## Recommendation

**Option 1** - Fix the Zod schemas to match existing types. The schemas should validate the same data shapes that the existing code produces.

## Next Steps

1. Audit Zod schemas against existing TypeScript interfaces
2. Fix mismatches in `shared/src/types/schemas.ts`
3. Ensure `pnpm tsc --noEmit` passes cleanly
4. Then proceed with Task 3 (compiler sectioned bundles)

## Files Affected by Type Errors

- `shared/src/expressions/property-watching/DependencyAnalyzer.ts`
- `shared/src/validation/gameDefinitionValidator.ts`
- `api/src/validation/gameValidator.ts`
- `app/components/editor/EditorProvider.tsx`
- `app/components/editor/AssetGallery/AssetGalleryPanel.tsx`
- `app/lib/game-engine/GameRuntime.godot.tsx`
- `app/lib/game-engine/GameLoader.ts`
