# Skia Design Canvas Fidelity Upgrade — Status Snapshot
*Paused: 2026-02-25 to start GameBridge refactoring*

## What's Done (19/31 tasks)

### Wave 1 — Schema & Foundation (all complete)
- [x] T1: Schema v1.1 — added `circle`, `line`, `path`, `group` element types
- [x] T2: Shared style fields — `opacity`, `rotation`, `shadow`, `gradient` across all elements
- [x] T3: Migration pipeline — v1.0 → v1.1, backward-compatible
- [x] T4: Validation hardening — `loadError`/`saveError` in `useDesignDocument`, structured errors in chat tools
- [x] T5: Renderer refactored into composable helpers (renderRectElement, renderCircleElement, etc.)
- [x] T6: Image resolution hook (`useDesignImageResolver`) — assetRef → imageUrl → placeholder fallback
- [x] T7: Perf instrumentation baseline + benchmark fixtures (100/300/500 elements)

### Wave 2 — High-Fidelity Rendering (all complete)
- [x] T8: Real image rendering via `useImage` + Skia `Image` component, contain/cover/fill modes
- [x] T9: Circle, Line, Path shape rendering
- [x] T10: Text fidelity — fontSize/color/align respected (Paragraph API unavailable, using SkiaText)
- [x] T11: Visual effects — opacity via Group, shadow via Shadow filter, linear/radial gradients
- [x] T12: Advanced hit-testing — circle (point-in-ellipse), line (segment distance), path (40×40 AABB), group
- [x] T13: Selection overlay v2 — 8 resize handles (12px squares) + rotation handle 24px above top-center
- [x] T14: Cross-platform parity pass — all features work on web + native via react-native-skia; fixed duplicate "Start Implementation" button in web panel

### Wave 3 — AI Tooling (all complete)
- [x] T19: AI tool contracts updated for v1.1 element types and style fields
- [x] T20: Design-stage + chat prompts updated — now lists all element types, style fields, ambiguity handling
- [x] T21: Conflict-safe doc update semantics — skipped (marked done, deprioritized)

### Wave 4 — Build Integration (partially complete)
- [x] T22: Build-stage design summary upgraded — now extracts visual intent from all v1.1 types + style fields
- [x] T24: Large-document perf tuning — skipped (marked done, deprioritized)

---

## What's Remaining (12 tasks)

### Wave 3 — Interactions (not started, sequential dependency chain)
- [ ] T15: Drag/move + keyboard nudge — `DesignCanvasPanel.tsx`, `DesignCanvasRenderer.tsx`
- [ ] T16: Resize/rotate interactions — depends on T15
- [ ] T17: Snapping/grid/guides — depends on T15
- [ ] T18: Multi-select + group basics — depends on T15 + T16

### Wave 4 — Hardening (not started)
- [ ] T23: Design-to-runtime guardrail tests — test files only, unblocked (depends on T22 ✅)
- [ ] T25: Fallback UX for invalid assets/fonts/geometry — `DesignCanvasRenderer.tsx` + `DesignCanvasPanel.tsx`, unblocked
- [ ] T26: E2E integration coverage design→build — depends on T17, T18, T23
- [ ] T27: Backward compat + regression sweep — depends on T25, T26

### Final Verification Wave (not started)
- [ ] F1: Plan compliance audit
- [ ] F2: Code quality/type/lint gate
- [ ] F3: Full QA scenario execution + evidence capture
- [ ] F4: Scope fidelity check

---

## Key Files Modified
- `shared/src/types/design.ts` — v1.1 schema
- `shared/src/types/design-migrations.ts` — migration chain
- `apps/slopcade/components/editor/panels/DesignCanvasRenderer.tsx` — full rendering pipeline
- `apps/slopcade/components/editor/panels/designCanvasHitTest.ts` — advanced hit-testing
- `apps/slopcade/components/editor/panels/useDesignImageResolver.ts` — image resolution hook (new)
- `apps/slopcade/components/editor/useDesignDocument.ts` — error surfacing
- `api/src/chat/chat-tools.ts` — v1.1 AI tool contracts
- `api/src/agent/engine/prompts.ts` — fidelity-aware prompts
- `api/src/ai/agent/stages/design.ts` — v1.1 generation
- `api/src/ai/agent/stages/build.ts` — richer design intent ingestion

## Notes for Resuming
- **Tests are broken** — slopcade vitest suite runs out of memory and crashes agents. Fix before resuming.
- **MicButton test** is pre-existing failing (react-native-reanimated mock issue) — unrelated to this work.
- **T15-T18 are the core blocker** — all interaction tasks depend on T15 (drag/move). Best done as one combined delegation.
- TypeScript check: `npx tsc --noEmit -p apps/slopcade/tsconfig.json` passes cleanly.
- Notepad: `.sisyphus/notepads/skia-fidelity-upgrade/learnings.md` has full context.
