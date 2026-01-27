# Momus Review Fixes

## Critical Issues Identified

### 1. Reference Integrity
**Problem**: `.sisyphus/notepads/asset-variations-plan/issues.md` doesn't exist
**Fix**: Change reference to existing file or remove

**Problem**: Line number references don't match actual files
**Fix**: Remove specific line numbers, use file + description only

### 2. Type System Reconciliation
**Problem**: Current `UIComponentSheetSpec.states` is typed as `Array<'normal' | 'hover' | 'pressed' | 'disabled' | 'focus'>` - doesn't support `selected/unselected` for TabBar
**Fix**: MUST expand state union OR create per-control state typing

**Decision needed**: Expand to:
```typescript
states: Array<'normal' | 'hover' | 'pressed' | 'disabled' | 'focus' | 'selected' | 'unselected'>
```

### 3. Non-Square Controls
**Problem**: ProgressBar=256x64, ScrollBar=256x32, TabBar=128x48 but pipeline assumes square `canvasSize`
**Fix**: Use `SheetSpecBase.width/height` fields (already exist in type system)

**Metadata fix**: Use actual width/height in metadata, not `canvasSize`

### 4. Batch API Execution Model
**Problem**: Unclear if synchronous or job-based
**Current POC**: Uses `processUIComponentJob` (async job model)
**Fix**: Clarify plan uses SYNCHRONOUS generation (simpler, acceptable for <5min total)

### 5. Multi-Part Controls
**Problem**: ScrollBar needs track + thumb, but plan says "don't generate thumb"
**Fix**: Clarify we're generating ONLY track backgrounds. Thumb uses default Godot styleboxes or simple colored rectangles (not AI-generated)

