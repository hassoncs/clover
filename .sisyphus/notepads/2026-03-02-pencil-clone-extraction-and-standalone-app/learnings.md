# Learnings

## 2026-03-02 Session ses_34ff1de1cffey6f05cvPTlMD8E — Baseline Analysis

### Coupling Points in DesignCanvasPanel.tsx
- Calls `useEditor()` for: `selectedDesignFrameId`, `selectedDesignElementId`, `selectDesignFrame`, `selectDesignElement`, `clearDesignSelection`, `setDesignMode`, `designPhase`, `setDesignPhase`
- Calls `useSharedWorkspaceFiles()` for: `designDocument`, `isLoadingDesign`, `saveDesignDocument`
- These must be replaced by a host adapter interface

### Coupling Points in useDesignDocument.ts
- Calls `useEditorTRPC()` for workspace file read/write (chatThreads.readWorkspaceFile, chatThreads.writeWorkspaceFile)
- The generic version needs pluggable load/save callbacks

### Clean Files (no editor coupling)
- `DesignCanvasRenderer.tsx` — only @shopify/react-native-skia + @slopcade/shared
- `designCanvasHitTest.ts` — pure utility
- `useDesignCamera.ts/.shared.ts/.web.ts/.native.ts` — clean
- `useDesignInteractions.ts` — only @slopcade/shared types
- `useDesignImageResolver.ts` — check imports

### App Pattern (from shader-editor)
- Port: hardcoded in metro.config.js as `const METRO_PORT = 8088`
- Plugin: `plugins/withMetroPort.js` bakes port into Podfile
- Scripts: `RCT_METRO_PORT=8088 expo run:ios --no-bundler`
- Devmux: `metro-shader` service with `health: { type: "port", port: 8088 }`
- Root scripts: `dev:shader` → `devmux ensure metro-shader`
- Package name: `@slopcade/shader-editor-app`

### pnpm-workspace.yaml
- Already covers `apps/*` and `packages/*` — no changes needed for new app/package

### Design Schema
- `shared/src/types/design.ts` exports: DesignDocument, DesignFrame, DesignElement (discriminated union), parseDesignDocument, createEmptyDesignDocument, migrateDesignDocument
