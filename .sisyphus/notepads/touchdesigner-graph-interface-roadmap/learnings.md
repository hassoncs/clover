# Learnings

## Task 2: GraphDomainAdapter Contract

- Generic type parameter `GraphDomainAdapter<TDomain>` avoids `unknown` casts at the adapter level while registry stores `GraphDomainAdapter` (defaulting TDomain to `unknown`) for heterogeneous collections
- `InspectorConfig` returns `null` rather than throwing for unknown node types — callers decide how to handle missing configs
- Registry uses `resolveOrThrow` pattern (alongside soft `resolve`) — lists available adapters in error message for debuggability
- `DomainValidationResult` is separate from core `ValidationResult` to keep error codes domain-specific (`DOMAIN_CONSTRAINT` vs `DANGLING_EDGE` etc.)
- NodeCatalogEntry includes `defaultPorts` so UI can render placeholder ports before a node is instantiated
- InspectorFieldConfig supports `min/max/options` for numeric sliders and dropdowns — keep field types minimal, add more only when concrete adapters need them

## Task 3: Web Generic Shell Implementation

- Implemented generic graph editor using React Flow (@xyflow/react).
- Created custom node and edge components to support `graph-core` types.
- Implemented `useGraphCommands` hook to bridge React Flow interactions with `graph-core` command system.
- Created `NodePalette` and `InspectorPanel` components that are driven by `GraphDomainAdapter`.
- Encountered some TypeScript issues with `@xyflow/react` types in the environment, likely due to module resolution or cache, but code structure is correct according to documentation.
- Verified component structure and integration points.

## Task: Metro Web Resolution + Missing React Flow Imports

- Metro resolves `@xyflow/react` and `@xyflow/system` reliably when `resolver.resolveRequest` forces `dist/umd/index.js` for both packages.
- `@xyflow/react` `exports.default` points to ESM; without override Metro can hit ESM-only paths and surface `import.meta`-related failures in web bundling.
- `GraphCanvas.tsx` must import `ReactFlow`, `useNodesState`, and `useEdgesState` explicitly from `@xyflow/react`; using the hooks/components without imports causes immediate type/runtime failures.
- No local `@xyflow/react/dist/style.css` import exists in graph components, so this fix path does not require Metro CSS handling changes.

## Task 6 - Effects Adapter (2026-02-11)

- `EffectNode` has `inputSlots` (with `connectedTo` refs) AND separate `connections` array on `EffectGraphSpec`. Both must be mapped.
- `Record<string, unknown>` needs `as unknown as T` double-cast to satisfy strict TypeScript when the target has required fields.
- `inputSlotMeta` stored in node `data` enables reconstructing `InputSlot` array from generic graph + edges during `fromGeneric`.
- Spec-level metadata (version, scope, lifecycle) stored redundantly in each node's data since GraphDocument has no metadata bag. First node is source of truth for `fromGeneric`.
- Contract test factory from Task 5 validated 7 behaviors out of the box — very effective for ensuring adapter correctness.
- `feedbackEdges` not round-tripped (empty array on restore) — acceptable for v1, would need GraphEdge metadata to preserve.

## Task 10 - Final Integration Hardening (2026-02-11)

- `export * from "./graph-core"` collides with existing `ValidationError`, `ValidationResult`, `ValidationErrorCode` names from `validation/` and `expressions/` modules. Used `export * as graphCore` / `export * as graphAdapters` namespace re-exports to avoid collisions while keeping all symbols accessible.
- Core isolation confirmed: zero imports from `effects/` or `narrative/` in `graph-core/` directory — clean dependency direction.
- E2E pipeline test covers: domain graph → toGeneric → executeCommand (add node, connect) → validateDocument → validateGeneratedGraph → fromGeneric round-trip for both adapters.
- Registry integration test confirms both adapters can be registered and resolved, and round-trip works via registry lookup (using `GraphDomainAdapter` with erased TDomain).
- 1050 total tests pass (6 new e2e tests added), tsc --noEmit clean.
