# Adapter Onboarding Checklist

Step-by-step guide for adding a new `GraphDomainAdapter` to the generic graph editor platform.

## Prerequisites

- Familiarity with `shared/src/graph-core/types.ts` (`GraphDocument`, `GraphNode`, `GraphEdge`, `GraphPort`)
- A domain type definition (e.g., `MyDomainGraph`) in its own module under `shared/src/`
- Reference adapters: `shared/src/graph-adapters/effects/` and `shared/src/graph-adapters/narrative/`

## 1. Create the adapter directory

```
shared/src/graph-adapters/{domain-name}/
  {domain-name}-adapter.ts   # Adapter implementation
  index.ts                   # Public exports
```

## 2. Implement `GraphDomainAdapter<TDomain>`

Your adapter class must implement all methods from `GraphDomainAdapter<TDomain>` (`shared/src/graph-adapters/types.ts`):

| Method | Purpose |
|--------|---------|
| `id` (readonly) | Unique string identifier (e.g., `"effects"`, `"narrative"`) |
| `name` (readonly) | Human-readable name |
| `toGeneric(domainGraph: TDomain): GraphDocument` | Convert domain graph to generic `GraphDocument` |
| `fromGeneric(graph: GraphDocument): TDomain` | Convert generic `GraphDocument` back to domain graph |
| `validateDomain(domainGraph: TDomain): DomainValidationResult` | Domain-specific validation (cycles, missing refs, structural rules) |
| `getNodeCatalog(): NodeCatalogEntry[]` | List of node types available in this domain (for palette UI) |
| `getInspectorConfig(nodeType: string): InspectorConfig \| null` | Property inspector definition per node type; return `null` for unknown types |

### Key implementation notes

- `toGeneric`: Map each domain node to a `GraphNode` with `ports` array. Store domain-specific data in `node.data` as `Record<string, unknown>`.
- `fromGeneric`: Reconstruct domain types from `node.data` and edge topology. Use `Object.values(doc.edges)` to rebuild connections.
- `validateDomain`: Return `{ valid: true, errors: [] }` for valid graphs. Use error code `"DOMAIN_CONSTRAINT"` for all domain-specific errors.
- `getNodeCatalog`: Each entry needs `type`, `label`, `category`, and `defaultPorts`.
- `getInspectorConfig`: Field types are `"string"`, `"number"`, `"boolean"`, `"select"`, `"color"`. Use `min`/`max` for numbers, `options` for selects.

## 3. Export from the adapter index

```typescript
// shared/src/graph-adapters/{domain-name}/index.ts
export { MyDomainAdapter } from "./{domain-name}-adapter";
```

## 4. Re-export from the adapters barrel

Add to `shared/src/graph-adapters/index.ts`:

```typescript
export { MyDomainAdapter } from "./{domain-name}";
```

## 5. Add contract tests

Create `shared/src/graph-adapters/__tests__/{domain-name}-contract.test.ts`:

```typescript
import { testAdapterContract } from "./adapter-contract.test";
import { MyDomainAdapter } from "../{domain-name}";

testAdapterContract(
  "MyDomainAdapter",
  () => new MyDomainAdapter(),
  validDomainGraphFixture,   // A well-formed domain graph
  invalidDomainGraphFixture, // A graph that should fail validateDomain
);
```

The contract test factory (`adapter-contract.test.ts`) validates 7 behaviors automatically:
- `toGeneric` produces valid `GraphDocument`
- `fromGeneric(toGeneric(x))` round-trips without data loss
- `validateDomain` accepts valid graphs, rejects invalid ones
- `getNodeCatalog` returns valid entries with ports
- `getInspectorConfig` returns config for catalog types, `null` for unknowns
- Adapter has `id` and `name` metadata

## 6. Add AI generation validation tests

Create `shared/src/graph-adapters/__tests__/{domain-name}-ai-generation.test.ts`:

```typescript
import { validateGeneratedGraph } from "../ai-generation";
import { MyDomainAdapter } from "../{domain-name}";

const adapter = new MyDomainAdapter();

it("validates a valid domain graph", () => {
  const result = validateGeneratedGraph(adapter, validGraph);
  expect(result.success).toBe(true);
});

it("rejects invalid domain graph", () => {
  const result = validateGeneratedGraph(adapter, invalidGraph);
  expect(result.success).toBe(false);
});
```

## 7. Register in application code

```typescript
import { AdapterRegistry } from "@slopcade/shared";
import { MyDomainAdapter } from "@slopcade/shared";

const registry = new AdapterRegistry();
registry.register(new MyDomainAdapter());
```

## 8. Verify

```bash
# Run all graph tests
pnpm --filter @slopcade/shared test -- --run

# Type-check
pnpm --filter @slopcade/shared exec tsc --noEmit
```

## Validation checklist

- [ ] Adapter class implements all 7 `GraphDomainAdapter` methods
- [ ] `id` is unique across all registered adapters
- [ ] `toGeneric` maps every domain node to a `GraphNode` with correct ports
- [ ] `fromGeneric` reconstructs domain graph from generic + edges
- [ ] `validateDomain` catches domain-specific constraint violations
- [ ] `getNodeCatalog` lists all domain node types
- [ ] `getInspectorConfig` returns `null` for unknown types (not throw)
- [ ] Contract tests pass via `testAdapterContract`
- [ ] AI generation validation tests pass
- [ ] Adapter is exported from `graph-adapters/index.ts`
- [ ] `tsc --noEmit` passes
- [ ] All existing tests remain green
