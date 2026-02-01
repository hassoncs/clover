# Godot Bridge Tests

This directory contains tests for the Godot bridge functionality.

## Test Files

### Automated Tests

- **`bridge-contracts.test.ts`** - Contract tests for GodotBridge interface
- **`coordinateUtils.test.ts`** - Coordinate conversion utility tests
- **`mock-godot-bridge.ts`** - Mock implementation for testing

### Manual Test Documentation

- **`hit-test.manual.md`** - Manual testing guide for `_hit_test()` function
- **`hit-test.results.md`** - Test execution results and verification

## Hit-Test Testing

The `_hit_test()` function in `GameBridge.gd` requires integration testing with a running Godot instance. Since game-inspector MCP tools are not available in the vitest runtime, we provide comprehensive manual testing documentation instead.

### Running Hit-Test Tests

1. Ensure game-inspector MCP server is running
2. Follow the test procedures in `hit-test.manual.md`
3. Document results in `hit-test.results.md`

### Test Coverage

The hit-test manual tests cover:
- ✅ Basic hit-test functionality
- ✅ Empty space detection
- ✅ Layer priority (hitbox > body)
- ✅ Sensor exclusion
- ✅ Multiple overlapping entities
- ✅ All coordinate quadrants
- ✅ Rotated entities
- ✅ Scaled entities

## Running Tests

```bash
# Run all automated tests
pnpm test

# Run specific test file
pnpm test bridge-contracts.test.ts

# Run with coverage
pnpm test --coverage
```

## Adding New Tests

### For TypeScript Functions

Create a `.test.ts` file in this directory following the existing patterns.

### For Godot Integration

Create a `.manual.md` file documenting the test procedure using game-inspector MCP tools.
