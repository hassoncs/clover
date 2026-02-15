---
name: testing-patterns
description: "Testing patterns and infrastructure. Covers Vitest, GDUnit4, tRPC testing, D1/R2 mocking, fixtures, E2E bridge tests, and pre-commit hooks. Use when writing tests, debugging test failures, or setting up test infrastructure."
---

# Testing Patterns

> **Skill for AI Agents**: Vitest, GDUnit4, tRPC testing, D1/R2 mocking, E2E bridge

## When to Use This Skill

Load when working on: tests, testing, Vitest, Jest, GDUnit4, mocking, fixtures, tRPC tests, E2E, bridge tests, pre-commit hooks

## Key Concepts

- **Vitest** is the primary TypeScript test runner (not Jest)
- **GDUnit4** for GDScript tests in `godot_project/test/`
- **Bridge E2E** uses headless Godot driver over WebSocket
- **D1** mocked via `initTestDatabase()`, **R2** via manual `createMockBucket()`
- **tRPC** routes tested via direct `createCaller` (no network)

## Common Patterns

### D1 Database Mocking
```typescript
import { initTestDatabase } from '../__fixtures__/test-utils';

beforeEach(async () => {
  const db = await initTestDatabase(); // Loads schema.sql
  await db.prepare("DELETE FROM messages").run(); // Clean slate
});
```

### R2 Mocking
```typescript
function createMockBucket() {
  const store = new Map();
  return {
    get: vi.fn((key) => store.get(key)),
    put: vi.fn((key, value) => store.set(key, value)),
    delete: vi.fn((key) => store.delete(key)),
    list: vi.fn(() => ({ objects: [...store.keys()].map(k => ({ key: k })) })),
  };
}
```

### tRPC Route Testing
```typescript
const caller = appRouter.createCaller(createAuthenticatedContext(TEST_USER));
const result = await caller.games.list();
expect(result).toHaveLength(3);
```

### GDUnit4 (GDScript)
```gdscript
extends GdUnitTestSuite

func test_bridge_ping():
    var result = GameBridge.call_method("ping", [])
    assert_str(result).is_equal("pong")
```

### Bridge E2E
Uses `GodotHeadlessDriver` to spawn headless Godot, communicates via WebSocket RPC. Verifies TypeScript ↔ GDScript contracts.

## Pre-commit Hooks

Managed by `simple-git-hooks` → `scripts/pre-commit.sh`:
- Type building (`tsc -b`)
- TypeScript check (`tsc --noEmit`)
- GDScript linting
- Secret checking (`hush check --only-changed`)

## Gotchas

- Always clean D1 tables in `beforeEach` — tests share the same in-memory DB
- R2 mocks must implement `list()` or asset enumeration tests will fail
- Bridge E2E requires Godot binary available in PATH
- Pre-commit runs `tsc` — fix type errors before committing
- Use `createAuthenticatedCaller(TEST_USER)` for tRPC tests, never construct context manually

## File References

| File | Purpose |
|------|---------|
| `api/src/__fixtures__/test-utils.ts` | Core test utilities (initTestDatabase, contexts) |
| `api/src/trpc/routes/__tests__/` | tRPC route test examples |
| `api/src/services/git/__tests__/R2Fs.test.ts` | R2 mock example |
| `godot_project/test/` | GDUnit4 tests |
| `tests/e2e/bridge/` | Bridge E2E suite |
| `scripts/pre-commit.sh` | Pre-commit validation |

## Related Skills

- [storage-ops](storage-ops.md) — D1/R2 patterns being tested
- [bridge-development](bridge-development.md) — Bridge contracts verified by E2E
