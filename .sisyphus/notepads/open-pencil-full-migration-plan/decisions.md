# Architecture Decisions

## 2026-03-03 — Orchestrator Bootstrap

### D1: External serialization boundary stays as PenDocument
`.pen` files remain as `PenDocument` JSON format. The SceneGraph (flat Map) is a RUNTIME-only model.
PenDocument → SceneGraph (load), SceneGraph → PenDocument (save).

### D2: No dual-runtime architecture
The strangler pattern is allowed during migration but MUST have deletion milestones.
Legacy `DesignDocument` paths MUST be removed by T13. No permanent compatibility shims.

### D3: Yoga WASM as canonical layout engine
No fallback to old custom layout in production path. Explicit error if WASM fails to load.

### D4: Server-first MCP execution model
Core tools must NOT depend on `window.__PENCIL_BRIDGE__`. Only browser-automation tools (screenshot, UI) may use page.evaluate.

### D5: React-only panel implementation
No Vue components from OpenPencil. React + NativeWind for all UI.

### D6: Test approach
- Vitest for unit + integration
- Playwright for E2E UI scenarios
- Evidence files to `.sisyphus/evidence/task-N-*.{txt,png}`
