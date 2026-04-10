# Pencil Architecture Boundaries

## Layers

### Pencil Core

Owns document-centric contracts and local-first runtime primitives.

Files and modules that belong here:
- `packages/pencil-core/src/contracts/*`
- `packages/pencil-core/src/local/*`
- `packages/pencil-core/src/session/*`

Responsibilities:
- document/store/session contracts
- project-folder layout helpers
- filesystem-backed persistence
- session registry, launcher, and runtime route construction

Must not depend on:
- `chatThreads.*`
- `gameId` as a primary identity
- Slopcade auth or ownership rules
- brand-specific route semantics

### Pencil Runtime Shell

Owns the actual Pencil app UI and runtime integration points.

Files and modules that belong here:
- `apps/pencil/app/*`
- `apps/pencil/lib/*`
- `apps/pencil/components/*`

Responsibilities:
- editor UI
- embed surface
- store injection
- websocket/runtime connection handling
- CLI and MCP wrappers around core session primitives

Allowed dependencies:
- `@slopcade/pencil-core`
- shared design-canvas/editor UI packages
- optional host adapters injected at the edges

### Integration / Anti-Corruption Layer

Owns translation between Pencil-native contracts and Slopcade-specific infrastructure.

Files and modules that belong here:
- `apps/pencil/lib/adapters/slopcade-store-adapter.ts`

Responsibilities:
- translate `workspace:${gameId}` into Pencil store operations
- call `chatThreads.readWorkspaceFile`, `writeWorkspaceFile`, and `listWorkspaceFiles`
- preserve current compatibility while Pencil-native flows take over

Must not do:
- leak Slopcade terms back into `packages/pencil-core`
- become the default code path for new local-first features

## Guardrails

- Core APIs must prefer `session + projectRoot + filePath`.
- `gameId` is compatibility-only.
- New local-first work goes in core/runtime, not in the Slopcade adapter.
- Any direct `chatThreads.*` usage outside the adapter is a regression.
- If a new Pencil feature needs persistence, it should target `PencilDocumentStore` first.

## Practical Split Rule

When adding code, ask one question first:

- If this still makes sense in a standalone local Pencil product, it belongs in core or runtime shell.
- If this only exists because Slopcade currently hosts Pencil, it belongs in the adapter layer.
