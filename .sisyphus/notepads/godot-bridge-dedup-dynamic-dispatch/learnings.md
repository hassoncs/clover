# Task 5: Bridge Regression Harness - Learnings

## Implementation Approach

Built automated smoke test harness using vitest that validates bridge methods work correctly via async query path without manual intervention.

## Key Patterns

### Mock Bridge Design
- Created `MockGodotBridge` class that simulates both sync (`_lastResult`) and async (`query`) paths
- Mock responses configured via `mockMethod(method, response)` for flexible test setup
- Call history tracking via `getCalls()` for verification

### Test Coverage Strategy
- **Positive path**: Representative API coverage across 10 major categories (World Info, Camera, Viewport, Snapshot, Query, Properties, Lifecycle, Time Control, Physics, Events)
- **Negative path**: Unknown method handling, timeout behavior, invalid JSON, missing query method, invalid arguments
- **Evidence generation**: Machine-readable output files for smoke matrix and unknown method logs

### Query System Behavior
- Unknown methods return `{ error: "Unknown method: X" }` rather than throwing
- Tests validate error responses rather than expecting rejections
- Timeout behavior still throws as expected

## Evidence Artifacts

Generated two evidence files:
1. `.sisyphus/evidence/task-5-smoke-matrix.txt` - 10/10 methods passed across all categories
2. `.sisyphus/evidence/task-5-unknown-method.log` - 3/3 unknown methods correctly returned errors

## Test Results

All 14 tests passing:
- 7 async query path tests (getWorldInfo, getCameraInfo, getSceneSnapshot, getProps, spawn, pause, raycast)
- 5 negative path tests (unknown method, timeout, invalid JSON, missing query method, invalid args)
- 2 smoke matrix tests (representative coverage, unknown method logging)

## TypeScript Considerations

- tsc errors in node_modules (vite/vitest types) are unrelated to test code
- Test file itself is type-safe and uses proper TypeScript patterns
- Mock bridge implements `GodotBridgeBase` interface correctly

## Bridge Registry Checks

- `bridge-registry.json` includes AI warning metadata fields (`_comment`, `_warning`, `_instructions`, `_howToModify`) that must be stripped during check-mode normalization to avoid false out-of-date errors.
