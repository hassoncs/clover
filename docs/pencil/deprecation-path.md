# Pencil Slopcade Deprecation Path

## Current Direct Dependency Map

Direct Slopcade-backed file access now lives in one place:
- `apps/pencil/lib/adapters/slopcade-store-adapter.ts`

The runtime no longer needs to call `chatThreads.*` directly.

## Temporary Compatibility Surface

These compatibility shapes still exist during migration:
- `workspace:${gameId}` project references
- `gameId` query param support in runtime binding
- Slopcade document store adapter backed by `chatThreads.*`

These are transitional, not target architecture.

## Removal Trigger

Direct Slopcade-backed Pencil compatibility can be removed when all three are true:

1. Local-first sessions are the default launch path for Pencil work.
2. CLI/MCP-driven flows use `session + projectRoot + filePath` exclusively.
3. No active callers require `gameId` as the only way to locate Pencil documents.

## Migration Order

1. Keep adapter compatibility available.
2. Move all new workflows to `PencilDocumentStore` + session identity.
3. Instrument or audit any remaining `gameId`-only entrypoints.
4. Delete compatibility shims once the removal trigger is satisfied.

## What Counts as a Regression

Any new code that:
- imports `chatThreads.*` outside the adapter
- introduces a new Pencil core contract with `gameId`
- uses Slopcade ownership rules as the primary local runtime identity

should be treated as migration debt and fixed before merge.
