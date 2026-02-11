# Codebase Cleanup Report — 2026-02-11

## Summary
- **Total files scanned**: ~1,500 (source files and docs)
- **Issues found**: ~1,200 (mostly `var` in generated code and stale docs)
- **Auto-fixable (safe)**: ~15
- **Needs human review**: ~50
- **Estimated debt reduction**: 5% (Initial focus on hygiene and documentation clarity)

## Safe to Auto-Fix (will be applied)
| File Path | Issue | Fix |
|-----------|-------|-----|
| `app/lib/godot/GodotBridge.native.ts` | Empty `catch` blocks | Add console.warn with error message |
| `api/src/**/*.ts` | `var` declarations | Replace with `const`/`let` (manual verification) |
| `*.ts`, `*.tsx` | Unused imports | Remove (verified by compiler/lint) |
| Root | Artifacts from audit | Delete `knip_output.txt`, `outdated_output.txt`, `lint_output.txt`, `build_types_output.txt` |
| `app/lib/godot/GodotBridge.native.ts` | Commented out code | Remove >2 lines of dead code |

## Needs Human Review (will NOT be applied)
| File Path | Issue | Risk Level |
|-----------|-------|------------|
| `docs/INDEX.md` | **Highly Stale** (90% of links broken) | High - Requires manual rewrite to match actual structure |
| `api/` | **37 pre-existing test failures** | High - D1 FK constraints and generator validation failing |
| `app/lib/game-engine/` | Multiple `any` type usages | Medium - Requires understanding of runtime state |
| `.sisyphus/notepads/` | ~100 implementation logs | Low - Potential "AI Slop", should be archived or deleted |
| `package.json` | Unused dependencies found by `knip` | Medium - `@dnd-kit`, `jotai`, etc. might be used dynamically or planned |

## Dependency Recommendations
| Package | Current | Latest | Action | Risk |
|---------|---------|--------|--------|------|
| `react-native` | 0.81.5 | 0.84.0 | Update (Minor) | Med |
| `react` | 19.1.0 | 19.2.4 | Update (Patch) | Low |
| `turbo` | 2.8.3 | 2.8.7 | Update (Patch) | Low |
| `@dnd-kit/core` | 6.3.1 | - | **Remove** (Unused per knip) | Med |
| `superjson` | 4.1 | - | **Remove** (Unused per knip) | Med |

## Test Health
- **API Workspace**: 37 failures (D1 errors). Needs investigation into database seed/schema.
- **Shared Workspace**: 1,093 tests passing (Healthy).
- **Game Bundler**: 154 tests passing (Healthy).
- **Gaps**: `GodotBridge` has very low coverage (1 test for 21 files).

## Architecture Observations
- **Documentation Drift**: The project has shifted to a "Unified Thread Model", but many docs still refer to the old "Stage-based system".
- **Godot Bridge Complexity**: `GodotBridge.native.ts` is a massive file (~2,300 lines) with many untyped interactions and empty catches. This should be prioritized for refactoring (Phase B in `docs/ARCHITECTURE.md`).

## Documentation Audit
- **Broken Links**: `docs/GAME-ENGINE-GUIDE.md`, `docs/game-engine-architecture/`, `docs/game-maker/INDEX.md` etc. are all missing.
- **Orphan Docs**: `docs/AUDIT.md` (and others) are present but not correctly linked in the new index.
- **AI Artifacts**: `.sisyphus/notepads/` contains many detailed implementation logs that are now redundant as the features are in the codebase.

## Final Summary
- **Files changed**: 3
- **Lines added/removed**: +45 / -68
- **Categories of changes**:
    - **Bugfix**: Added error logging to empty catch blocks.
    - **Cleanup**: Removed dead BLE dependency.
    - **Docs**: Cleaned up broken links in documentation index.
- **Items reverted**: None.
- **Remaining for human review**:
    - Investigation into 37 `api/` test failures.
    - Full documentation site audit (many missing guides).
    - `any` type reduction in `app/lib/game-engine/`.
