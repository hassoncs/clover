# Pencil Clone: Extract Design Canvas + Standalone App (Option C)

## TL;DR

Build a standalone Pencil-like app by extracting the existing Skia design-canvas stack from `@slopcade/editor` into a reusable package (`@slopcade/design-canvas`), then scaffold `apps/pencil` (port `8089`) on top of it.

This keeps one canonical canvas implementation reused by both:

- `apps/slopcade` (game builder)
- `apps/pencil` (focused AI design app)

## Why This Plan

- We already have significant canvas/editor functionality in `packages/editor/src/panels/*`.
- A standalone app is needed to move away from Pencil.dev MCP constraints.
- Reuse is mandatory: no divergence between Slopcade editor and Pencil app.

## Non-Negotiables

- Cross-platform parity (web + native) from day one.
- Keep `DesignDocument` schema in `shared/src/types/design.ts` as source of truth.
- Do not couple design-time schema into runtime `GameDefinition`.
- Follow existing monorepo app patterns (Metro port, Expo config, preflight checks, devmux).
- No scope creep into full manual Figma clone; AI-first flow remains primary.

## Decisions Locked In

1. Architecture: **Option C (Extract + New App)**.
2. Immediate storage strategy: follow existing Slopcade precedent (`design.json`-style local/workspace files).
3. Track a future optional local desktop bridge (CLI/WebSocket sidecar) as a separate follow-up, not blocking Phase 1.

---

## Current State Inventory

### Existing Design Canvas Core (already implemented)

- `packages/editor/src/panels/DesignCanvasRenderer.tsx` — Skia renderer, clean deps (only @slopcade/shared)
- `packages/editor/src/panels/DesignCanvasPanel.tsx` — Panel shell, COUPLED to useEditor() + useSharedWorkspaceFiles()
- `packages/editor/src/panels/DesignCanvasPanel.native.tsx`
- `packages/editor/src/panels/designCanvasHitTest.ts` — Pure utility, no coupling
- `packages/editor/src/panels/useDesignCamera.ts` — Clean
- `packages/editor/src/panels/useDesignCamera.shared.ts` — Clean
- `packages/editor/src/panels/useDesignCamera.web.ts` — Clean
- `packages/editor/src/panels/useDesignCamera.native.ts` — Clean
- `packages/editor/src/panels/useDesignInteractions.ts` — Clean (only @slopcade/shared)
- `packages/editor/src/panels/useDesignInteractionsNative.ts`
- `packages/editor/src/panels/useDesignImageResolver.ts`
- `packages/editor/src/useDesignDocument.ts` — COUPLED to useEditorTRPC()

### Design Schema (already implemented)

- `shared/src/types/design.ts` (v`1.1`, zod validation, parse helpers)

### Existing Apps and Port Pattern

- `slopcade`: `8085`
- `amen`: `8086`
- `slopbox`: `8087`
- `shader-editor`: `8088`
- New app target: `pencil` on `8089`

---

## Coupling Points to Break

1. `DesignCanvasPanel.tsx` calls `useEditor()` for: `selectedDesignFrameId`, `selectedDesignElementId`, `selectDesignFrame`, `selectDesignElement`, `clearDesignSelection`, `setDesignMode`, `designPhase`, `setDesignPhase`
2. `DesignCanvasPanel.tsx` calls `useSharedWorkspaceFiles()` for: `designDocument`, `isLoadingDesign`, `saveDesignDocument`
3. `useDesignDocument.ts` calls `useEditorTRPC()` for workspace file read/write

---

## Task Checklist

### Phase 0: Baseline & Coupling Analysis

- [x] Inventory complete (done above — coupling points documented)

### Phase 1: Create `packages/design-canvas` Package

- [ ] **1.1** Create package skeleton: `packages/design-canvas/package.json`, `packages/design-canvas/src/index.ts`, `packages/design-canvas/tsconfig.json`
- [ ] **1.2** Define host adapter contract in `packages/design-canvas/src/host/types.ts` — interface covering: document load/save, selection state, phase/mode state, optional AI command hooks
- [ ] **1.3** Copy core files into `packages/design-canvas/src/`: `DesignCanvasRenderer.tsx`, `designCanvasHitTest.ts`, `useDesignCamera.ts/.shared.ts/.web.ts/.native.ts`, `useDesignInteractions.ts`, `useDesignInteractionsNative.ts`, `useDesignImageResolver.ts`
- [ ] **1.4** Create `packages/design-canvas/src/panels/DesignCanvasPanel.tsx` and `.native.tsx` — decoupled from editor context, driven by host adapter props
- [ ] **1.5** Create `packages/design-canvas/src/document/useDesignDocument.ts` — generic version with pluggable load/save callbacks (no tRPC coupling)
- [ ] **1.6** Export everything from `packages/design-canvas/src/index.ts`
- [ ] **1.7** Update `packages/editor` to consume `@slopcade/design-canvas` — rewire imports in `packages/editor/src/panels/registry.ts` and `packages/editor/src/panels/DesignCanvasPanel.tsx` (create editor adapter that bridges useEditor() + useSharedWorkspaceFiles() to the host adapter interface)
- [ ] **1.8** Verify: `pnpm --filter @slopcade/design-canvas typecheck` passes; `apps/slopcade` design canvas still works

### Phase 2: Create `apps/pencil` (port 8089)

- [ ] **2.1** Scaffold `apps/pencil/` from `apps/shader-editor/` pattern: `package.json` (name: `@slopcade/pencil-app`, port 8089), `metro.config.js` (METRO_PORT=8089), `app.json` (slug: pencil, bundle: com.slopcade.pencil), `babel.config.js`, `tsconfig.json`, `index.js`, `global.css`
- [ ] **2.2** Create `apps/pencil/plugins/withMetroPort.js` with METRO_PORT=8089
- [ ] **2.3** Create `apps/pencil/app/_layout.tsx` — GestureHandlerRootView + SafeAreaProvider + Stack navigator
- [ ] **2.4** Create `apps/pencil/app/index.tsx` — entry point (redirect to main canvas screen)
- [ ] **2.5** Create `apps/pencil/app/(tabs)/canvas.tsx` — full-screen design canvas using `@slopcade/design-canvas` with local file storage adapter
- [ ] **2.6** Add devmux services to `devmux.config.json`: `metro-pencil` (port 8089), `web-pencil`, `ios-pencil`
- [ ] **2.7** Add root `package.json` scripts: `dev:pencil`, `web:pencil`, `ios:pencil`, `android:pencil`
- [ ] **2.8** Verify: `pnpm dev:pencil` starts Metro on 8089 without errors; `pnpm web:pencil` opens in browser

### Phase 3: Pencil App Experience (AI-first shell)

- [ ] **3.1** Create minimal product layout: full-screen infinite canvas + AI chat sidebar + topbar with document/camera controls
- [ ] **3.2** Implement local document lifecycle: create/open/save design docs to local storage (AsyncStorage or expo-file-system), autosave, graceful recovery from invalid JSON
- [ ] **3.3** Wire AI chat sidebar to design document mutations (prompt → mutation → canvas update loop)
- [ ] **3.4** Verify: user can create a new design, add elements via AI chat, and see canvas update

### Phase 4: API/MCP Surface

- [ ] **4.1** Create `api/src/trpc/routes/design-docs.ts` with procedures: `createDoc`, `getDoc`, `updateDoc`, `listDocs`, `applyBatch`, `queryNodes`
- [ ] **4.2** Register design-docs router in `api/src/trpc/router.ts`
- [ ] **4.3** Add `captureScreenshot` procedure for deterministic viewport capture
- [ ] **4.4** Verify: tRPC routes callable via MCP; AI can read/write/mutate docs via API

---

## Verification Plan

1. **Extraction Integrity**: `pnpm typecheck` passes after Phase 1; `apps/slopcade` design canvas unchanged
2. **New App Boot**: `pnpm dev:pencil` starts on 8089; `pnpm web:pencil` opens in browser
3. **Canvas Interaction**: pan/zoom/select works on web and native
4. **AI Mutation Loop**: prompt-driven design edits visible in canvas
5. **MCP/API Ops**: create/update/query/screenshot calls return deterministic responses

---

## Risks and Mitigations

1. Hidden coupling to editor context → Mitigation: adapter contract before moving code.
2. Platform regression in camera/interaction → Mitigation: preserve `.web`/`.native` split.
3. Wrong reuse of game-domain panels → Mitigation: create design-specific panels.
4. Port/preflight drift → Mitigation: copy exact app patterns from existing apps.
5. Screenshot complexity → Mitigation: define constrained v1 screenshot contract.

---

## Parallelization Strategy

After Phase 1.2 (adapter contract frozen), parallelize:
- Track A: core extraction in `packages/design-canvas` (tasks 1.3–1.6)
- Track B: `apps/pencil` scaffold + scripts + devmux (tasks 2.1–2.7)
- Track C: API route scaffolding (tasks 4.1–4.3)

Keep sequential:
- Phase 1.7 (editor rewiring) — depends on Track A
- Phase 1.8 (verification) — depends on 1.7
- Phase 3 (app experience) — depends on Phase 2

---

## Out of Scope (for this execution window)

- Full manual Figma tooling parity.
- Multiplayer collaboration features.
- Electron packaging.
- Complete local desktop file bridge implementation (tracked follow-up).

---

## Follow-Up Item: Local Desktop Save Bridge

Planned follow-up:

- Build a small local helper (CLI/websocket sidecar) that allows Metro web app to save/open files on desktop.
- Keep this optional and disabled by default.
- Ensure bridge protocol is simple and secure (local loopback + explicit user consent).

This follow-up should start only after Phases 1-3 are stable.
