# Task 2: Runtime Package API Contract

## Files Created
- `shared/src/types/PackageRuntime.ts` — Runtime API types
- `shared/src/types/PackageBridge.ts` — Bridge contract types

## Key Decisions

### TagGroup canonical location
`TagGroup` is defined in `PackageRuntime.ts` and re-exported by `PackageManifest.ts`.
This avoids duplication while keeping the runtime API as the source of truth.

### BuildManifest vs WorkspaceManifest
- `WorkspaceManifest` (Task 1, PackageManifest.ts): authoring-time identity, corresponds to `slopcade.json`
- `BuildManifest` (Task 2, PackageRuntime.ts): runtime-time descriptor with build ID and artifact hashes
- `BuildManifest.packageManifest` links back to the workspace manifest

### PackageBridgeContract
Intentionally a minimal subset of GodotBridge — only the methods needed for package loading:
- `setupWorld`, `registerTemplates`, `loadEntities`, `clearEntities`, `clearGame`
- `spawnEntity`, `destroyEntity`
- `pausePhysics`, `resumePhysics`
- `preloadTextures`

### TagGroupBridgeMapping
Documents which bridge methods each tag group invokes:
- `rules` and `scripts` have empty arrays — they're handled by the TS runtime, not the bridge

### ArtifactResolver
Abstraction for fetching artifact data. Enables different implementations:
- Worker: fetch from R2
- Local dev: read from filesystem
- Test: in-memory fixtures

## Gotchas
- `PackageManifest.ts` was renamed from `PackageManifest` to `WorkspaceManifest` by Task 1 during this task
- Circular type imports between PackageRuntime.ts ↔ PackageManifest.ts work fine since both are `import type`
- index.ts needed explicit named exports from PackageManifest.ts to avoid duplicate TagGroup/TAG_GROUPS conflicts
