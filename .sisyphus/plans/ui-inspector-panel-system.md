# UI Inspector Panel System (Slopcade Editor) — Work Plan

## TL;DR

> **Quick Summary**: Add a DevTools-like runtime inspector to the editor: inspect mode (physics picking + highlight), hierarchy tree from runtime EntityManager, and a read-only properties view sourced from `GodotDebugBridge`.
>
> **Deliverables**:
> - Runtime inspector state layer (toggle + hovered/selected entity + snapshot/props cache)
> - Hierarchy Tree panel (runtime EntityManager) with search/filter + indicators
> - Read-only Runtime Properties panel (from `GodotDebugBridge.getAllProps` + snapshot)
> - Inspect-mode picking via `GodotDebugBridge.queryPoint` with overlay highlight
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Runtime bridge access → Inspector state layer → tree/properties → inspect overlay

---

## Context

### Original Request
Build a comprehensive UI inspector panel system for the Slopcade editor (web-first, mobile later) with:
- Inspect mode (hover highlight + click-to-inspect)
- Entity hierarchy tree
- Properties panel showing runtime entity properties (transform/sprite/physics/behaviors/tags)
- Integrate with existing editor panels and extend debug toggles

### Confirmed Decisions (from interview)
- **Truth source**: runtime via `GodotDebugBridge.getSnapshot()` / `getAllProps()`.
- **Hierarchy source**: runtime-side `EntityManager` (`getParent/getChildren/getDescendants/getAllEntities`).
- **Editing**: read-only v1 (plan for editing later; implement in Phase 4).
- **Picking**: physics-first via `GodotDebugBridge.queryPoint`; fallback to render bounds if no physics.
- **Scale**: <200 entities typical.
- **Inspect Mode interaction model**: enhance/override (do not disable editor selection). When enabled:
  - Override `InteractionLayer` hit testing to use `GodotDebugBridge.queryPoint`
  - Add web hover highlight
  - Click selects entity and opens Properties tab

### Codebase Anchors (verified)
- Editor selection state exists:
  - `app/components/editor/EditorProvider.tsx` — `selectedEntityId`, `selectEntity()`.
- Game stage overlay for input exists:
  - `app/components/editor/StageContainer.tsx` renders `InteractionLayer` over `WithGodot`.
  - `app/components/editor/InteractionLayer.tsx` supports `onEntityHitTest(worldPos)` override.
- Panels already wired:
  - `app/components/editor/BottomSheetHost.tsx` (tabs)
  - `app/components/editor/panels/LayersPanel.tsx` (flat list today)
  - `app/components/editor/panels/PropertiesPanel.tsx` (document-editing UI today)
  - `app/components/editor/panels/DebugPanel.tsx` (local-only toggles today)
- Runtime inspection APIs exist:
  - `app/lib/godot/debug/types.ts` — `GodotDebugBridge` interface, `EntitySnapshot` shape.
  - `app/lib/godot/debug/GodotDebugBridge.ts` — implements V2 APIs incl. `queryPoint`, `getAllProps`, `subscribe/pollEvents`, `worldToScreen/screenToWorld`.
- Runtime hierarchy model exists:
  - `app/lib/game-engine/types.ts` — `RuntimeEntity` (id/name/parentId/children/tags/visible/active/etc)
  - `app/lib/game-engine/EntityManager.ts` — `getAllEntities/getParent/getChildren/getDescendants`.

### Known Gaps / Constraints
- `EditorProvider` has a `runtimeRef: RefObject<GameRuntimeRef>` shape, but we must confirm it is actually populated by `GameRuntimeGodot`. If not, the plan includes wiring it.
- `EntitySnapshot` does not include parent/children; hierarchy must come from `EntityManager`.
- Web hover input is different from native touch; plan prioritizes web pointer move and uses “tap to select” as baseline.

---

## Work Objectives

### Core Objective
Provide an in-editor, runtime-truth inspector system with:
1) fast selection (inspect mode),
2) clear hierarchy navigation,
3) rich read-only property exploration,
4) minimal disruption to existing editor flows.

### Concrete Deliverables
- Inspector state/context layer exposing:
  - inspectEnabled, hoveredEntityId, selectedEntityId (source: EditorProvider), snapshot cache, props cache
  - actions: toggleInspect, setHovered, selectEntity, refreshSnapshot, refreshProps
- Hierarchy tree panel replacing or augmenting Layers tab.
- Properties panel showing runtime props for selected entity (read-only) and key runtime-derived fields.
- Highlight overlay in stage:
  - hovered entity highlight (web)
  - selected entity highlight (web + native)

### Definition of Done (high level)
- Selecting via tree highlights entity in stage and shows runtime properties.
- Inspect mode:
  - Web pointer hover highlights entities via `queryPoint`.
  - Click selects entity and focuses Properties tab.
- All work passes:
  - `pnpm tsc --noEmit`
  - `pnpm test` (monorepo)

### Must NOT Have (Guardrails)
- No write-back / editing runtime or document in Phases 1–2 (read-only inspector).
- No invasive refactors of game runtime architecture; keep changes localized to editor UI + safe runtime ref wiring.
- No new heavy dependencies for virtualization (entity count <200).

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (Vitest present in repo; many unit tests exist)
- **User wants tests**: Tests-after (unit tests for tree building + selection/hover logic) + Manual UI verification
- **Framework**: Vitest (existing)

### Manual QA (required; UI work)
Run web editor and verify selection and overlays.

Suggested commands (adjust if your workspace uses different entry points):
```bash
pnpm dev
# open editor route in browser (existing)
```

Evidence guidelines (for executor):
- Capture screenshots of:
  - hierarchy tree with selection
  - inspect mode hover highlight
  - properties panel showing runtime data

---

## Architecture & Component Design

### Overview

We will introduce an **Inspector subsystem** layered on top of EditorProvider:

- **EditorProvider** remains the owner of `selectedEntityId` (already present).
- **InspectorProvider** (new) owns runtime inspector state and bridge access:
  - connects to `GodotDebugBridge`
  - (optionally) reads `EntityManager` via `runtimeRef` once wired
  - provides cached `snapshot` and `entityProps`

This keeps inspector concerns out of the editor document reducer while still integrating with existing selection and panels.

### New Modules (proposed file paths)

#### 1) Inspector state + hooks
- `app/components/editor/inspector/InspectorProvider.tsx`
  - `InspectorContext`
  - `useInspector()` hook
  - Owns:
    - `inspectEnabled: boolean`
    - `hoveredEntityId: string | null`
    - `lastSnapshot: GameSnapshot | null`
    - `entityPropsCache: Map<string, Record<string, unknown>>` (or simple object cache)
    - `lastError?: string`
  - Exposes methods:
    - `getBridge(): GodotDebugBridge | null` (via `injectGodotDebugBridge`)
    - `refreshSnapshot(detail: 'low'|'med'|'high')`
    - `refreshEntityProps(entityId)` using `bridge.getAllProps`
    - `pickEntityAtWorld(worldPos)` using `bridge.queryPoint`
    - `setInspectEnabled(bool)`
    - `setHoveredEntityId(id|null)`

#### 2) Runtime hierarchy adapter
- `app/components/editor/inspector/runtimeHierarchy.ts`
  - Converts `EntityManager.getAllEntities()` into a stable tree model.
  - Handles orphaned nodes (missing parents) and cycles defensively.

Tree node shape (suggested):
```ts
type InspectorTreeNode = {
  id: string;
  name: string;
  template?: string;
  tags: string[];
  active: boolean;
  visible: boolean;
  children: InspectorTreeNode[];
};
```

#### 3) Entity tree UI
- `app/components/editor/panels/HierarchyPanel.tsx`
  - Replaces or is used by existing `LayersPanel` slot.
  - Shows:
    - search box
    - tree nodes with indent
    - indicators: active/visible + tag chips (simple)
  - Uses `useEditor()` to call `selectEntity(id)`.
  - Uses `useInspector()` to get runtime entity list/tree.

#### 4) Runtime properties UI
- `app/components/editor/panels/RuntimePropertiesPanel.tsx`
  - Read-only rendering for:
    - snapshot summary (`EntitySnapshot` from `getSnapshot`): position/angle/velocity/aabb/physics/tags
    - full `getAllProps(entityId)` as expandable JSON sections
  - Grouping sections:
    - Header: id, template, tags, active/visible
    - Transform (position/angle)
    - Physics (bodyType, sleeping, velocity, damping, material, collision mask)
    - Behaviors (names + states if available via props)
    - Raw props (collapsible)

#### 5) Inspect overlay + input
- `app/components/editor/inspector/InspectOverlay.tsx`
  - Absolutely positioned overlay in `StageContainer`.
  - Draws rectangle/outline for hovered + selected entities.
  - Uses `bridge.worldToScreen()` to convert `EntitySnapshot.aabb` into screen rect.
  - Handles “no bounds available” gracefully (fallback: small marker at position).

- `app/components/editor/inspector/InspectInput.web.tsx`
  - Web-only pointer move listener (hover).
  - Throttles calls to `queryPoint`.
  - On click: selects entity and switches to Properties tab.

Optional later:
- `app/components/editor/inspector/InspectInput.native.tsx`
  - Touch long-press or tap-to-inspect variations.

### Existing Files to Modify (expected)
- `app/components/editor/StageContainer.tsx`
  - Wrap stage in `InspectorProvider` or render provider higher in tree.
  - Render `InspectOverlay` above `InteractionLayer`.
  - Pass `onEntityHitTest` into `InteractionLayer` when inspect is enabled (use queryPoint).
- `app/components/editor/BottomSheetHost.tsx`
  - Swap `LayersPanel` → `HierarchyPanel` (or embed hierarchy UI in LayersPanel).
  - Swap `PropertiesPanel` → `RuntimePropertiesPanel` (or embed runtime view at top).
- `app/components/editor/panels/DebugPanel.tsx`
  - Replace local state with `useInspector` (and/or editor state) toggles.
  - Add toggle: Inspect Mode.
- Potential wiring:
  - `app/lib/game-engine/GameRuntime.godot.tsx` may need to expose `GameRuntimeRef` methods via `ref` so editor can access `EntityManager`.
  - If already exposes it: confirm and just consume.

---

## Entity Tree / Hierarchy Panel Design

### Data structure
Use runtime `EntityManager.getAllEntities()` as the canonical list.

Build roots:
- `roots = entities.filter(e => !e.parentId || parent missing)`.
- For each root, recursively expand via `getChildren(id)`.

Guardrails:
- Track visited IDs to prevent cycles.
- Treat missing child IDs as warnings (skip).

### Fetch & display
Preferred runtime source for hierarchy:
- Use `EditorProvider.runtimeRef.current?.getEntityManager()` (once wired) to obtain the manager.

Fallback (if runtimeRef not available yet):
- Display a flat list based on `GodotDebugBridge.getSnapshot().entities` (no hierarchy) with a banner “Hierarchy unavailable”.

### Selection handling
- On node click:
  - `useEditor().selectEntity(node.id)`
  - `useEditor().setActiveTab('properties')` (optional UX)
- Keep selected row highlighted.

### Search / filter
For v1:
- Simple text filter on:
  - `name`, `id`, `template`, and `tags`.
- Optional quick filters:
  - Active only
  - Visible only
  - Tag filter dropdown (from runtime tag set)

### Visual indicators
- Active/visible icons (e.g., “●/○” or “👁/🚫”).
- Tag chips (first 1–3 tags + “+N”).
- Optional: template label.

---

## Inspect Mode Design

### Enable/disable
- Add toggle in `DebugPanel` (or new “Inspector” section) wired to `InspectorProvider.inspectEnabled`.

### Picking pipeline (physics-first)
1) Convert pointer/tap **screen** position → **world** position.
   - Preferred: `GodotDebugBridge.screenToWorld({x,y})` (uses runtime camera/viewport).
   - Avoid reusing `InteractionLayer.screenToWorld` for inspect mode because it uses editor camera state.
2) Call `GodotDebugBridge.queryPoint(worldX, worldY)`.
3) If hits:
   - hoveredEntityId = topmost hit entityId
4) If no hits:
   - optionally fall back to render bounds (future): use snapshot AABBs to find containing entity.

### Hover detection (web)
- Use `pointermove` / RN-web pointer events in `InspectInput.web.tsx`.
- Throttle to avoid spamming bridge calls (e.g., max 20–30 Hz).

### Click-to-inspect
- On click while inspectEnabled:
  - select hovered entity
  - set active tab to Properties (optional)

### InteractionLayer override (must be non-disruptive)
- Keep existing tap selection behavior.
- When inspectEnabled, pass `onEntityHitTest(worldPos)` into `InteractionLayer` so it uses physics picking.
- Do **not** block/disable move/scale gestures; if conflicts arise, prefer:
  - hover-only does not interfere
  - click-to-select remains
  - dragging selected entity continues to work (selection is more accurate)

### Highlight overlay
- Use latest snapshot (`getSnapshot('med'|'high')`) to get hovered/selected `EntitySnapshot.aabb`.
- Convert AABB corners to screen-space using `bridge.worldToScreen`.
- Render a lightweight overlay view:
  - hovered outline: yellow
  - selected outline: blue
  - include id label optionally

---

## Properties Panel (Runtime, Read-only)

### Data sources
- **Primary**: `bridge.getAllProps(entityId)` (full structured state)
- **Secondary**: `bridge.getSnapshot({detail:'high'})` (position/velocity/aabb/physics summary)

### Layout & grouping
- Header:
  - entity id
  - template
  - tags
  - active/visible (if present)
- Transform:
  - position (x,y)
  - angle
- Physics:
  - bodyType
  - sleeping
  - velocity, angularVelocity
  - material
  - collision layer/mask
  - CCD, fixedRotation
- Behaviors:
  - list of behavior names from snapshot + detailed behavior state from props (if present)
- Raw:
  - collapsible JSON viewer (simple recursive renderer)

### Real-time updates
Given <200 entities, use a pragmatic approach:
- On selection change:
  - immediately fetch `getAllProps(selectedId)`
  - optionally refresh snapshot once
- While inspector tab is open and/or inspectEnabled:
  - poll snapshot at low frequency (e.g., 2–5 Hz) for overlay + headline values

---

## State Management & Communication

### Selected entity state
- Source of truth stays in `EditorProvider.state.selectedEntityId`.
- Inspector reads it via `useEditor()`.

### Hovered entity state
- Owned by `InspectorProvider` (hover is transient; should not pollute editor undo/redo).

### Cross-component communication
- `HierarchyPanel` → `selectEntity` (EditorProvider)
- `InspectInput` → `setHovered` (InspectorProvider) and `selectEntity` (EditorProvider)
- `RuntimePropertiesPanel` reads selection and fetches props via InspectorProvider
- `InspectOverlay` reads hovered/selected IDs and reads snapshot cache

### Persistence
- Selection already persists across tab switching.
- For hot reload / stage restart (StageContainer runtimeKey):
  - Plan to clear hovered state
  - Keep selectedEntityId if entity still exists; otherwise clear selection

---

## Integration Points

### GodotDebugBridge usage
Key APIs:
- `getSnapshot(options)` — runtime entity list + AABB + physics summaries (`app/lib/godot/debug/types.ts`)
- `queryPoint(x,y)` — physics picking
- `getAllProps(entityId)` — deep property introspection
- `worldToScreen/screenToWorld` — coordinate conversions for overlay
- Optional future: `subscribe/pollEvents` for event-driven updates

### EntityManager usage
Key APIs:
- `getAllEntities()`
- `getParent/getChildren/getDescendants`

Access path (preferred):
- `EditorProvider.runtimeRef.current?.getEntityManager()` (requires runtime to expose it).

### MCP (game-inspector-mcp)
- No new MCP is strictly required; existing tools already cover snapshot/queryPoint/getAllProps.
- Optional Phase 4: add a thin “editor inspector state” tool (e.g., read selection) if you need external automation to drive inspector UI.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Foundation):
- Wire runtime access (bridge + entity manager availability)
- Add InspectorProvider + hooks + caches

Wave 2 (Panels):
- HierarchyPanel (tree)
- RuntimePropertiesPanel (read-only)
- DebugPanel toggle integration

Wave 3 (Inspect Mode UX):
- InspectInput.web hover + click
- InspectOverlay highlight
- Integrate with InteractionLayer hit-test override

---

## TODOs

> Notes:
> - References are intended to be precise starting points for the executor.
> - Acceptance criteria include both test commands and manual verification steps.

- [ ] 1) Establish InspectorProvider + bridge access layer

  **What to do**:
  - Create `app/components/editor/inspector/InspectorProvider.tsx` with a context/hook.
  - Use `injectGodotDebugBridge()` (from `app/lib/godot/debug`) to obtain bridge instance when available.
  - Implement snapshot cache + props cache + simple polling control.
  - Expose actions: `toggleInspect`, `refreshSnapshot`, `refreshProps`, `pickEntityAtWorld`.

  **Must NOT do**:
  - Don’t add editor-document mutations; keep this read-only.

  **Recommended Agent Profile**:
  - Category: `ultrabrain`
  - Skills: (none required)

  **Parallelization**:
  - Can Run In Parallel: YES (with Task 2)

  **References**:
  - `app/lib/godot/debug/GodotDebugBridge.ts` — bridge injection + available API surface
  - `app/lib/godot/debug/types.ts` — `GameSnapshot`, `EntitySnapshot`, `queryPoint`, `getAllProps`
  - `app/components/editor/EditorProvider.tsx` — selection state and overall editor context

  **Acceptance Criteria**:
  - [ ] Typecheck: `pnpm tsc --noEmit` passes
  - [ ] Manual: in web editor console, bridge presence is detected and no crashes occur when inspector mounts

- [ ] 2) Wire runtime EntityManager access for hierarchy (via runtimeRef)

  **What to do**:
  - Confirm whether `GameRuntimeGodot` already exposes `getEntityManager`/`getPhysics` via a ref.
  - If not, implement a safe ref wiring path so editor UI can read `EntityManager` at runtime:
    - Ensure `EditorProvider.runtimeRef` is passed to the component that hosts `GameRuntimeGodot`.
    - Ensure `GameRuntimeGodot` sets that ref (imperative handle) with `getEntityManager()`.
  - Provide fallback behavior (hierarchy panel uses snapshot flat list if entity manager not available).

  **Must NOT do**:
  - Don’t expose mutating methods through the ref for v1 (read-only).

  **Recommended Agent Profile**:
  - Category: `ultrabrain`
  - Skills: `slopcade-game-builder` (runtime/editor integration knowledge)

  **Parallelization**:
  - Can Run In Parallel: YES (with Task 1)

  **References**:
  - `app/components/editor/EditorProvider.tsx:440-443` — `GameRuntimeRef` shape
  - `app/components/editor/StageContainer.tsx` — where `GameRuntimeGodot` is mounted
  - `app/lib/game-engine/types.ts` — `RuntimeEntity` hierarchy fields
  - `app/lib/game-engine/EntityManager.ts:577+` — hierarchy APIs

  **Acceptance Criteria**:
  - [ ] Manual: in edit mode, hierarchy panel can read a non-null entity manager (log once)
  - [ ] Manual fallback: if entity manager absent, panel renders “flat snapshot mode” rather than crashing

- [ ] 3) Build runtime hierarchy model + HierarchyPanel UI

  **What to do**:
  - Add `app/components/editor/inspector/runtimeHierarchy.ts`:
    - build roots + tree nodes from `EntityManager`.
    - include indicators: `active`, `visible`, `tags`, `name`.
  - Add `app/components/editor/panels/HierarchyPanel.tsx`:
    - show search input + tree list
    - clicking selects entity via `useEditor().selectEntity(id)`
  - Integrate into editor UI:
    - either replace `LayersPanel` in `BottomSheetHost.tsx`, or have `LayersPanel` render `HierarchyPanel`.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: `frontend-ui-ux` (hierarchy tree UI ergonomics)

  **Parallelization**:
  - Can Run In Parallel: YES (with Task 4)

  **References**:
  - `app/components/editor/panels/LayersPanel.tsx` — existing list + selection highlight pattern
  - `app/lib/game-engine/EntityManager.ts:getChildren/getParent/getAllEntities`
  - `app/lib/game-engine/__tests__/EntityManager.hierarchy.test.ts` — expected hierarchy semantics

  **Acceptance Criteria**:
  - [ ] Manual: tree shows parent/child relationships and selection highlight
  - [ ] Manual: search filters nodes by name/id/tag/template
  - [ ] Unit: add tests for `buildHierarchyTree()` (handles orphans/cycles)

- [ ] 4) Implement RuntimePropertiesPanel (read-only) sourced from GodotDebugBridge

  **What to do**:
  - Create `app/components/editor/panels/RuntimePropertiesPanel.tsx`.
  - On `selectedEntityId` change:
    - fetch `bridge.getAllProps(id)`
    - find matching `EntitySnapshot` in cached snapshot for summary fields (aabb/velocity/physics)
  - Render grouped sections + raw JSON viewer.
  - Integrate into `BottomSheetHost.tsx` for the `properties` tab.

  **Must NOT do**:
  - No controls that call `setProps/patchProps` yet.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: `frontend-ui-ux`

  **Parallelization**:
  - Can Run In Parallel: YES (with Task 3)

  **References**:
  - `app/lib/godot/debug/types.ts:EntitySnapshot` — summary fields
  - `app/lib/godot/debug/types.ts:GodotDebugBridge.getAllProps/getSnapshot`
  - `app/components/editor/panels/PropertiesPanel.tsx` — existing section styling patterns (if reusing)

  **Acceptance Criteria**:
  - [ ] Manual: selecting an entity shows runtime position/velocity/aabb and raw props
  - [ ] Manual: panel renders even if `getAllProps` returns partial data (error handling)
  - [ ] Typecheck: `pnpm tsc --noEmit` passes

- [ ] 5) Extend DebugPanel toggles to include Inspect Mode (wire to InspectorProvider)

  **What to do**:
  - Replace local state in `app/components/editor/panels/DebugPanel.tsx` with InspectorProvider state.
  - Add “Inspect Mode” toggle.
  - Keep existing toggles but route them to overlay behavior (don’t block on Godot-side overlays).

  **References**:
  - `app/components/editor/panels/DebugPanel.tsx` — current UI
  - `app/components/game/DevToolbar.tsx` — toggle UX pattern (checkbox rows)

  **Acceptance Criteria**:
  - [ ] Manual: toggling Inspect Mode enables hover highlight/click-to-select on web

- [ ] 6) Implement inspect picking + overlay highlight in stage

  **What to do**:
  - Add `InspectOverlay.tsx` + `InspectInput.web.tsx` and mount them in `StageContainer.tsx`.
  - When inspectEnabled:
    - hover: pointer move → screenToWorld → queryPoint → setHoveredEntityId
    - click: select hovered entity → switch to properties tab
  - Use snapshot AABB + worldToScreen conversion to draw outlines.
  - Integrate with `InteractionLayer`:
    - Pass `onEntityHitTest` to use inspector picking for taps (so tap selects via physics, not doc bounds).
    - This is an **override/enhancement**: tap-to-select still works; it just uses physics-based picking.

  **References**:
  - `app/components/editor/StageContainer.tsx` — overlay mounting location
  - `app/components/editor/InteractionLayer.tsx:onEntityHitTest` — hook point
  - `app/lib/godot/debug/types.ts:queryPoint/screenToWorld/worldToScreen`
  - `app/lib/godot/debug/types.ts:EntitySnapshot.aabb`

  **Acceptance Criteria**:
  - [ ] Manual (web): hover highlights entity; click selects and opens properties
  - [ ] Manual: selected entity highlight persists
  - [ ] Manual: when no physics body, selection still works via fallback behavior (at minimum: no crash)
  - [ ] Manual: with inspectEnabled OFF, existing selection/drag/scale behaviors remain unchanged

- [ ] 7) Add tests + docs for inspector behavior (minimal but useful)

  **What to do**:
  - Unit tests:
    - tree builder (orphans/cycles)
    - selection/hover throttling logic (pure functions)
  - Optional docs:
    - brief markdown in `docs/` describing how inspector works + how to enable `?debug=true`.

  **References**:
  - Existing tests: `app/lib/game-engine/__tests__/EntityManager.hierarchy.test.ts`
  - Bridge docs: `docs/game-inspector/session-summary.md` (existing tool surface)

  **Acceptance Criteria**:
  - [ ] `pnpm test` passes
  - [ ] `pnpm tsc --noEmit` passes

---

## File Structure (Summary)

New:
- `app/components/editor/inspector/InspectorProvider.tsx`
- `app/components/editor/inspector/runtimeHierarchy.ts`
- `app/components/editor/inspector/InspectOverlay.tsx`
- `app/components/editor/inspector/InspectInput.web.tsx`
- `app/components/editor/panels/HierarchyPanel.tsx`
- `app/components/editor/panels/RuntimePropertiesPanel.tsx`

Modify:
- `app/components/editor/StageContainer.tsx`
- `app/components/editor/InteractionLayer.tsx`
- `app/components/editor/BottomSheetHost.tsx`
- `app/components/editor/panels/DebugPanel.tsx`

Potentially modify (if runtimeRef not already wired):
- `app/lib/game-engine/GameRuntime.godot.tsx`

---

## Technical Considerations

### Performance
- With <200 entities, full-tree rebuild on a low-frequency tick is acceptable.
- Throttle hover picking to avoid flooding the bridge.

### Update model
- Snapshot polling at 2–5 Hz while inspectEnabled is a safe default.
- Later, move to event-driven updates via `subscribe/pollEvents`.

### Web vs native
- Web: hover is supported via pointer events.
- Native: no hover; use tap-to-select plus optional long-press “inspect mode” later.

### Coordinate systems
- Prefer `GodotDebugBridge.screenToWorld/worldToScreen` for inspect picking & overlay.
- Avoid mixing editor camera transforms with runtime camera transforms.

---

## Success Criteria

### Functional
- [ ] Hierarchy panel displays runtime entity tree and allows selection.
- [ ] Properties panel shows runtime properties for selected entity (read-only).
- [ ] Inspect mode (web) highlights hovered entity and selects on click.
- [ ] Selected entity is highlighted in stage.

### Quality
- [ ] No crashes when bridge unavailable; inspector UI degrades gracefully.
- [ ] `pnpm tsc --noEmit` passes.
- [ ] `pnpm test` passes.
