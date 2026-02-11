# Contracts Notepad — Unified Game Runtime Package

## Naming Collision: PackageManifest

Three distinct `PackageManifest` types exist in the codebase:
1. **`effects/registry.ts`** — Shader package manifest (name, tags, categories, performance tier)
2. **`types/PackageRuntime.ts`** — Build descriptor (gameId, buildId, artifacts[])
3. **NEW: `types/PackageManifest.ts`** — Workspace manifest (`slopcade.json`)

To avoid collision, the workspace manifest was named `WorkspaceManifest` instead of `PackageManifest`.

## TagGroup Reuse

`TagGroup` was already defined in `PackageRuntime.ts`. Rather than duplicating, `PackageManifest.ts` re-exports it. The `TAG_GROUPS` const array is new (for runtime iteration).

## PrefabDefinition Migration Strategy

`PrefabDefinition` is a type alias for `EntityTemplate` during migration. Task 10 will make it standalone and remove `EntityTemplate`. The alias lives in `GamePackage.ts`.

## File Locations

- `shared/src/types/PackageManifest.ts` — WorkspaceManifest, TagGroup re-export, TAG_GROUPS
- `shared/src/types/GamePackage.ts` — GamePackage, PrefabDefinition, AssetManifest, workspace conventions
- Both exported from `shared/src/types/index.ts`

## Decisions

- `WorkspaceManifest` (not `PackageManifest`) to avoid triple-collision
- Re-export `TagGroup` from `PackageRuntime.ts` rather than redefine
- `PrefabDefinition = EntityTemplate` alias for forward compatibility
- `WORKSPACE_CONVENTIONS` const for conventional file paths
- `REQUIRED_PACKAGE_FILES` — at least one must exist for valid package
