---
title: "Oracle strategic UI architecture"
agent: oracle
created: 2026-01-22T07:38:21.251Z
session_id: ses_41b5d1e00ffem7CmCgdX8avKiu
duration: 1m 2s
---

# Oracle strategic UI architecture

**Bottom line**
- Build a single “Editor” route that owns all editor state, and treat Layers/Properties/Assets/Debug/Preview as panels around one shared canvas—not separate screens with duplicated runtime setup.
- Keep the existing `GameRuntime` as the authoritative renderer/simulator, but wrap it with an Editor interaction layer that can run in two modes: `edit` (physics paused, direct transforms) and `preview` (physics running, limited controls).

**Action plan**
1. **Navigation architecture (primary recommendation)**
   1. Create one route: `app/editor/[id].tsx` (or `app/game/[id]/editor.tsx`) and mount a single `EditorProvider` there so state survives panel switches.
   2. Inside the Editor, use **panel switching, not app-level navigation**, for: `Layers`, `Properties`, `Assets`, `Preview`, `Debug`.
   3. Layout rules:
      - Tablet/web: persistent side panels (Layers left, Properties right), bottom Assets drawer.
      - Phone: canvas full-screen; panels open as **bottom sheet / slide-over** (start with simple `Modal` + animated view; upgrade later only if needed).
   4. Keep “Publish/Share/Fork” as small, focused **modals** (stack navigation is fine for these).

2. **Tab vs modal for inspector/layers/assets**
   - Use a **tab-based panel system inside the Editor** (single panel host) for fast switching and consistent mental model.
   - Use **modals only for transient tasks**: asset details, AI generation prompt, publish flow, confirmations.
   - Rule of thumb: if it changes selection/context, it’s a panel; if it’s a single task with a clear “done/cancel,” it’s a modal.

3. **Canvas interaction layer + `GameRuntime` integration**
   1. Split responsibilities without rewriting physics:
      - `GameRuntime` stays responsible for: simulation step (Box2D), render list, input-to-game controls (in preview).
      - New `EditorInteractionLayer` responsible for: hit-testing entities, selection, drag/transform gizmos, snapping, multi-select.
   2. Add a small runtime control surface:
      - `mode: 'edit' | 'preview'`
      - `selectedEntityIds: string[]`
      - `onHitTest(point) -> entityId?` (implemented using existing entity bounds/fixtures)
      - `setEntityTransform(id, partialTransform)` used in edit mode
   3. In `edit` mode:
      - Freeze physics (or run with dt=0) and render from the same entity model.
      - Apply transforms directly to entity state; optionally show collision bounds/debug overlays.
   4. In `preview` mode:
      - Runtime owns updates; editor state becomes read-only except “restart/record/share”.

4. **Data flow for live editing (local-first, minimal complexity)**
   - Use **local-first optimistic edits**: every edit updates an in-memory `EditorDocument` immediately; persist to device storage frequently; sync to server on explicit “Save/Publish” (and optionally background debounce).
   - Model: a versioned document (`doc.version` integer or timestamp). Server accepts `PUT` with `ifVersion` to detect conflicts.
   - Avoid real-time collaboration/CRDTs until you have a real need; for kids + single-device editing, conflict resolution can be “last saved wins” with a simple “Duplicate as copy” fallback.

5. **API structure for sharing/forking (simple, scalable)**
   - Core resources:
     - `Game`: `id`, `ownerId`, `title`, `thumbnail`, `doc` (editor JSON), `version`, `publishedAt`, `parentGameId`, `forkCount`, `visibility`
     - `Asset`: `id`, `ownerId`, `uri`, `type`, `metadata`, `prompt`, `themeId?`
     - `Theme/AssetPack`: curated sets (optional later)
   - Endpoints (shape, not framework-specific):
     - `POST /games` create draft
     - `GET /games/:id` fetch (draft if owner; published otherwise)
     - `PUT /games/:id` update doc with version check
     - `POST /games/:id/publish` create immutable published snapshot (or mark published)
     - `POST /games/:id/fork` creates new draft with `parentGameId`
     - `POST /games/:id/share` returns share slug/link (or reuse publish slug)
     - `GET /feed` published games
     - `GET /games/:id/forks` (optional)
   - Keep “fork” server-side so attribution and parent linkage is trustworthy.

6. **Critical UX considerations for kids on mobile**
   - Big hit targets, forgiving gestures, strong snapping, obvious selected state.
   - Progressive disclosure: show 3–5 core properties per entity first; tuck advanced behind “More”.
   - Always-available **Undo** (and Redo if possible); protect destructive actions with a friendly confirmation.
   - Reduce text entry: presets, sliders, icon buttons; AI prompt can be guided templates.
   - Safety/compliance: sharing/publishing behind an age gate/parental step; default to private drafts.

**Effort estimate**
- **Medium (1–2d)** to create the Editor route + panel host + state container + read-only Layers/Properties/Assets views.
- **Large (3d+)** to reach “Flash-style” direct manipulation (hit-testing, transforms, snapping, undo, robust preview switching) and social publish/fork end-to-end.

**Why this approach**
- One Editor route prevents “panel = new screen = re-mount runtime” bugs and keeps canvas interaction latency low.
- Local-first editing avoids fragile network coupling and makes the UI feel instant; version checks keep server sync safe without heavy infra.
- Keeping `GameRuntime` authoritative preserves your investment in physics/rendering while enabling editor affordances around it.

**Watch out for**
- `GameRuntime.native.tsx` at 747 lines is already a risk: refactor early into `runtime/physics`, `runtime/render`, `runtime/input`, `runtime/debug` so editor hooks don’t turn it into a monolith.
- Hit-testing must match what the user sees (sprite bounds vs physics fixtures). Pick one as canonical per entity type and be consistent.
- Preview mode needs deterministic reset (seed, initial state) or kids will get “it changed!” confusion.

**Implementation phases / priorities**
1. **Phase 1 (foundation)**: `EditorProvider` + panel host + responsive layout + selection state + read-only Layers/Properties.
2. **Phase 2 (interaction MVP)**: tap-to-select + drag-to-move for a subset of entities + snapping; add Debug overlay tab for alignment.
3. **Phase 3 (property editing)**: constrained property editors (size/rotation/z-index/behavior presets) + undo stack.
4. **Phase 4 (assets)**: Assets panel + AI gallery + assign/replace asset overrides.
5. **Phase 5 (preview)**: instant mode switch, restart, record/share clip/screenshot.
6. **Phase 6 (social)**: publish/share/fork + feed + attribution + theme packs.

**Escalation triggers (when to revisit with a more complex design)**
- You need true multi-user co-editing or cross-device concurrent edits → consider CRDT/OT.
- Runtime performance drops due to frequent React state churn → move hot paths to a lightweight external store and/or Skia-side interaction handling.

**Alternative sketch (only if you reject the single Editor route)**
- Separate screens for Layers/Properties/Assets with navigation would work, but you’ll pay with runtime remounts, selection loss, and higher complexity keeping state in sync across routes. The single Editor + panels is the simpler, more robust baseline.
