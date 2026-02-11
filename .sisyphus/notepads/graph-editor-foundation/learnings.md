## Task 5: Contract Tests & Integration Tests

### Contract Test Pattern
- Created reusable `testAdapterContract()` factory function that validates any GraphDomainAdapter implementation
- Contract tests verify:
  - `toGeneric` produces valid GraphDocument (passes validateDocument)
  - Round-trip fidelity (toGeneric → fromGeneric preserves data)
  - Domain validation works for both valid and invalid inputs
  - Node catalog returns well-formed entries with valid port structures
  - Inspector config returns proper structure for known types, null for unknown
  - Adapter has required metadata (id, name)

### Integration Test Coverage
- **Determinism**: Same command sequence produces same state
- **Undo/Redo**: Exact state restoration through multiple cycles
- **Serialization**: JSON round-trip preserves all document data
- **Batch Atomicity**: All-or-nothing execution, single history entry, nested batch flattening

### Mock Adapters
- Created two mock adapters (effects-like and narrative-like) to prove contract works across different domain types
- Mock adapters use minimal but realistic domain structures
- Demonstrates adapter pattern flexibility

### Test Organization
- Contract tests in `graph-adapters/__tests__/adapter-contract.test.ts`
- Integration tests in `graph-core/__tests__/integration.test.ts`
- Both test suites pass cleanly (26 tests total)
