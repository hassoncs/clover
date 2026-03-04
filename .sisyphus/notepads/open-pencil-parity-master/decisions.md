# Decisions — open-pencil-parity-master

## [2026-03-04T08:23:28Z] Session Start: Architecture Decisions from Previous Plan

### Single Mutation Path
- All mutations go through `PenToolFacade` → `SceneGraph`
- `PenDocument` is derived (read-only output) via `sceneGraphToPenDocument()`
- No direct writes to `PenDocument` anywhere in Pencil runtime

### MCP Tool Architecture
- New tools in `pencil-v2.ts`, `pencil-v2-components.ts`, `pencil-v2-effects.ts`, `pencil-v2-variables.ts`, `pencil-v2-query.ts`
- Legacy `pencil_apply_ops` throws error directing to new tools
- `ServerBridge` provides headless facade access without browser dependency

### Legacy Cleanup Status
- `canvasOps.ts` — DELETED
- `usePencilBridge.ts` — DELETED  
- `window.__PENCIL_BRIDGE__` — REMOVED
- `DesignDocument` — still exists in `shared/src/types/design.ts` but Pencil no longer writes to it

### Worktree
- Path: `/private/tmp/slopcade-open-pencil-migration`
- Branch: `open-pencil-migration`
- All work happens in this worktree
