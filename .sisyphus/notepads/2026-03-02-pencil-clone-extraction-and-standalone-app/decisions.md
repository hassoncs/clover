# Decisions

## 2026-03-02 Session ses_34ff1de1cffey6f05cvPTlMD8E

### Host Adapter Interface Design
The adapter must cover:
1. `document: DesignDocument | null` — current document
2. `isLoadingDocument: boolean`
3. `saveDocument: (doc: DesignDocument) => void`
4. `selectedFrameId: string | null`
5. `selectedElementId: string | null`
6. `selectedElementIds: string[]`
7. `selectFrame: (id: string) => void`
8. `selectElement: (elementId: string, frameId: string) => void`
9. `clearSelection: () => void`
10. `designMode: string`
11. `setDesignMode: (mode: string) => void`
12. `designPhase: string`
13. `setDesignPhase: (phase: string) => void`

### Package Name
`@slopcade/design-canvas` in `packages/design-canvas/`

### App Name
`@slopcade/pencil-app` in `apps/pencil/`, port 8089

### Storage Strategy for Pencil App
Phase 1: Local storage via AsyncStorage or expo-file-system (no server dependency)
Phase 4: tRPC API routes for server-side persistence
