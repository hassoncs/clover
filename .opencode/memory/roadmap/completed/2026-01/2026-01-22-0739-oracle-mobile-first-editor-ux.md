---
title: "Oracle mobile-first editor UX"
agent: oracle
created: 2026-01-22T07:39:51.655Z
session_id: ses_41b5be347ffexC1xhrXXm9YPf0
duration: 1m 12s
---

# Oracle mobile-first editor UX

**Bottom line**
Build the editor around a single “Stage + Bottom Dock + Bottom Sheet” layout: the stage (game canvas) stays full-screen and always interactive; creation/tools live in a persistent bottom dock; all depth (assets, properties, layers, behaviors) lives in a snap-point bottom sheet. This matches what kids already understand from Instagram/TikTok/Canva (tap-to-add, drag-to-place, bottom trays) while keeping complexity hidden like CapCut (contextual panels, progressive disclosure).

**Action plan**
1. Implement the core screen frame: `TopBar` (undo/redo + playtest) + `Stage` + `BottomDock` + `BottomSheetHost`.
2. Define a small set of “editor states/modes” (Edit, Playtest, AssetPicking, PropertyEditing) and drive UI visibility from that state machine.
3. Implement selection/manipulation (tap select, drag move, pinch/rotate/scale with guardrails + visible handles).
4. Implement bottom sheet content as tabs + contextual routing: `Assets`, `Properties`, `Layers`, `Actions`.
5. Build the asset library as a grid with categories + search + recents + drag-to-stage.
6. Add kid-proofing: big hit targets, snap guides, constrained transforms, safe delete, and always-visible Undo.

**Effort estimate**
Medium (1–2d) for a solid MVP scaffold (layout + selection + assets + properties). Large (3d+) if you add CapCut-like timelines/animation curves and advanced layer FX early.

---

## Essential UI architecture

### 1) Optimal panel/toolbar layout (mobile-first)
Primary recommendation: “Stage-first, bottom-driven.”

**Screen layout**
- Top (fixed, minimal): `Back` + `Undo/Redo` + `Play` (toggle Playtest) + `Publish/Share` (optional).
- Center: `Stage` (full-bleed interactive canvas; camera pan/zoom).
- Bottom (persistent): `BottomDock` with 4–5 primary actions (icons + labels for kids).
- Overlaid bottom: `BottomSheet` with 3 snap points (peek / half / near-full).

**What to copy**
- Instagram: persistent bottom creation entry points; tap-to-add; quick editing via bottom trays.
- TikTok: “one primary action per icon,” minimal chrome, and contextual panels that don’t feel like navigation.
- Canva: bottom sheet for properties + asset library navigation that never fully “leaves” the canvas.
- CapCut: when a complex sub-domain exists (timeline/animation), swap the bottom sheet content into a specialized editor without changing the overall frame.

**Recommended BottomDock (minimum)**
1. `Add` (characters/objects/backgrounds)
2. `Edit` (properties for selected entity; disabled if none selected)
3. `Behaviors` (simple “when tap / when collide / timer” cards; can be later)
4. `Layers` (front/back/lock + list)
5. `More` (grid of secondary tools: duplicate, group, align, snap toggle)

Keep the dock always visible; everything else is the bottom sheet.

---

### 2) Entity selection & manipulation with touch
Goal: “Instagram sticker manipulation” + “Canva precision,” but safer for ages 6–14.

**Selection rules**
- Tap entity: select (show bounding box + handles).
- Tap empty stage: clear selection.
- Tap selected entity again: show quick actions (mini radial/row near selection: Duplicate, Delete, Flip, Front/Back).
- Drag selected: move.
- Drag empty stage: pan camera (only when no selection, or with two fingers).
- “Bring forward on interaction”: when you start dragging a selected entity, bring it to front temporarily (or raise z-index only within its group). This matches Instagram’s “tap feels like forward.”

**Transform gestures (standard + kid-friendly)**
- One-finger drag: move.
- Two-finger pinch on selection: scale (with min/max).
- Two-finger rotate on selection: rotate (with angle snapping at 0/90/180; snap strength can be tuned).
- Two-finger pan anywhere: camera pan (consistent “two fingers = navigate canvas”).
- Double-tap entity: “edit primary property” (e.g., text edit, character customization) like Instagram text.

**Precision without frustration**
- Always show 2–4 corner handles on selection for scale/rotate (kids trust handles more than invisible gestures).
- Add light “magnet” snapping to centerlines/edges + haptic tick (optional) like Canva alignment.

---

### 3) Best mobile pattern for property editing
Primary: bottom sheet with “contextual properties,” not modals.

**Pattern**
- Selecting an entity switches the bottom sheet to `Properties` (half snap by default).
- Properties grouped into 2–4 cards max (Appearance, Physics/Behavior, Interactions, Advanced).
- Use large controls: sliders, segmented buttons, color chips, icon toggles; avoid dense forms.

**What to copy**
- Canva: bottom sheet for properties; large tappable controls; “more” expands sections.
- CapCut: effect pickers open as sub-panels within the same bottom sheet (not new screens).
- Instagram: quick inline adjustments (tap chips) before exposing advanced controls.

Avoid full-screen modals except for: naming, permissions, exporting, or tutorials.

---

### 4) Modes (edit vs preview) without cognitive load
Use an explicit top-bar toggle: `Play` / `Edit`.

**Rules**
- `Edit`: shows selection overlays, dock, and sheet.
- `Playtest`: hides selection chrome and disables editing gestures; stage becomes the game. Keep a single obvious `Exit Play` button.
- Transition animation: quick crossfade + slight zoom to communicate “now it’s live” (TikTok/IG style).

Under the hood: treat it as a state machine so UI can’t end up half-edit/half-play.

---

### 5) Gesture patterns kids expect (practical set)
Copy the “creator app commons”:
- Tap to select / tap outside to deselect.
- Drag to move.
- Pinch to zoom (camera) and pinch on selection to scale (choose one primary rule; I recommend: pinch on selection scales, pinch on empty canvas zooms camera).
- Two-finger pan for camera (consistent across many apps).
- Long-press for “more actions” (context menu), but keep it optional; kids will find buttons first.

Avoid gesture overload early (3-finger, edge swipes, hidden shortcuts) until analytics show need.

---

### 6) Asset/sticker library structure (easy browsing)
Primary: “Sticker tray” model (IG/Canva), optimized for thumbs.

**Bottom sheet Assets tab**
- Top row: Search + voice/search icon (optional).
- Category chips horizontally (Characters, Props, Backgrounds, Effects, Sounds).
- Grid results (2–3 columns phone portrait).
- Sections: `Recents`, `Favorites`, `For You` (curated), then categories.

**Placement interactions**
- Tap asset: auto-add centered on stage (fast path like Canva).
- Press-and-drag from grid: “drag ghost” onto stage (delight path like IG stickers).
- After drop/add: immediately select it and open `Properties` half sheet.

---

### 7) Minimum viable toolbar for a game editor
MVP that still feels “real”:
- TopBar: Back, Undo, Redo, Play/Edit toggle.
- BottomDock: Add, Edit, Layers, Behaviors (optional), More.
- Selection overlay quick actions: Delete, Duplicate, Front/Back, Lock.

Everything else is secondary and lives in the bottom sheet.

---

## React Native component hierarchy (implementation-ready)
One clear hierarchy that matches the UX:

- `EditorScreen`
- `EditorTopBar`
- `StageViewport`
- `StageSurface` (Skia/GL view; renders entities)
- `StageGestureLayer` (gesture-handler; routes to selection vs camera)
- `SelectionOverlay` (bounding box, handles, guidelines, quick actions)
- `BottomDock`
- `BottomSheetHost`
- `BottomSheetTabs` (`AssetsTab`, `PropertiesTab`, `LayersTab`, `BehaviorsTab`)
- `ToastsAndCoachmarks` (undo hints, “pinch to zoom” onboarding)

State slices (keep simple, but explicit):
- `editorMode` (Edit | Playtest)
- `selection` (selectedIds, primaryId)
- `camera` (pan/zoom)
- `sheet` (openTab, snapPoint)
- `history` (undo/redo)
- `library` (query, category, recents)

---

## Watch out for (common failure modes)
- Gesture conflicts (camera vs object transforms): solve by strict rules + visual affordances (handles) + two-finger = camera.
- Accidental deletes: use “tap to confirm” toast undo, or soft-delete with Undo prominence.
- Bottom sheet stealing focus from stage: keep a “peek” snap point so the stage always feels primary.
- Too many modes: keep only Edit and Playtest at first; treat asset picking/property editing as sheet states, not separate modes/screens.

---

## Escalation triggers (when to go more complex)
- You add animation editing or sequences: introduce a CapCut-like “timeline sheet” only inside a dedicated sub-editor (still within the same frame).
- You add many entities + groups: add Procreate-like layer thumbnails and lock/visibility controls (but keep the simple Front/Back controls for kids).
- You need pro-level precision: add Canva-style align/distribute and numeric inputs (behind an “Advanced” gate).

**Alternative sketch (advanced path)**
A “domain switcher” inside the bottom sheet: `Build (stage)` vs `Animate (timeline)` vs `Logic (event cards)`, keeping the same Stage frame but swapping the sheet content to specialized editors (CapCut-style), rather than adding new screens.
