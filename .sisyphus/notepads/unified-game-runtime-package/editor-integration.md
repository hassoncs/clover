# Editor Integration for Unified Game Runtime Package

## Overview
This document details the implementation of the editor preview gate and diagnostics UI, which ensures that only valid, compiled game packages can be previewed.

## Components Implemented

### 1. `usePackageReadiness` Hook
- **Location**: `app/components/editor/usePackageReadiness.ts`
- **Purpose**: Manages readiness state polling and compilation triggers.
- **Features**:
  - Polls `packageReadiness.get` every 3 seconds.
  - Exposes `ready`, `errors`, `warnings`, `isChecking`, `isCompiling`.
  - Provides `triggerCompile` function to initiate compilation.

### 2. `PreviewGate` Component
- **Location**: `app/components/editor/PreviewGate.tsx`
- **Purpose**: Blocks the preview area when the package is not ready.
- **Behavior**:
  - Shows loading spinner while checking readiness.
  - Displays error count and message if validation fails.
  - Renders children (preview content) only when ready.

### 3. `DiagnosticsPanel` Component
- **Location**: `app/components/editor/DiagnosticsPanel.tsx`
- **Purpose**: Displays detailed validation errors and warnings.
- **Features**:
  - Collapsible panel at the bottom of the editor.
  - Shows error/warning counts in the header.
  - Lists individual issues with messages and file paths.

### 4. `packageCompilerRouter`
- **Location**: `api/src/trpc/routes/package-compiler.ts`
- **Purpose**: Exposes the `PackageCompiler` service to the frontend.
- **Functionality**:
  - `compile` mutation: Triggers compilation for a game ID.
  - Returns success status, build ID, and diagnostics.
  - Automatically triggers `ReadinessService.checkReadiness` after compilation.

## Integration Points

### `EditorProvider`
- Exposes `readiness` state to the entire editor context.
- Allows any component to check readiness or trigger compilation.

### `StageArea`
- Wraps `StageContainer` with `PreviewGate`.
- Renders `DiagnosticsPanel` at the bottom.
- Triggers compilation automatically when files are saved via `handleSave`.
- Updates the "Preview" tab to show error counts and red styling when invalid.

## Verification
- **Preview Gate**: Verified that the preview tab is blocked when errors exist.
- **Diagnostics**: Verified that errors and warnings are displayed correctly.
- **Compilation**: Verified that saving a file triggers the compile mutation.
- **Polling**: Verified that readiness state updates automatically.

## Next Steps
- Ensure `PackageCompiler` correctly handles all file types and edge cases.
- Add more granular error reporting (e.g., line numbers) if supported by the compiler.
- Implement "Go to error" functionality in `DiagnosticsPanel` to open the relevant file.
