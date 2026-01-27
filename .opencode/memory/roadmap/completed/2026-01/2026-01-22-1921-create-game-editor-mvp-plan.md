---
title: "Create game editor MVP plan"
agent: oracle
created: 2026-01-22T19:21:56.286Z
session_id: ses_418d8d8e3ffeA6jN2nZlQS5KM5
duration: 54s
---

# Create game editor MVP plan

**Phase 1: Core Infrastructure (fork API, asset gallery data flow)**  
Complexity: moderate

Files to modify/create
- Modify `api/src/trpc/routes/games.ts` (or wherever game routes live): add `games.fork`
- Modify `api/src/trpc/router.ts` to register the new procedure
- Modify shared types `shared/types/GameDefinition.ts` (or equivalent) to support per-entity asset pack selection
- Modify game renderer (where sprites are resolved) to respect per-entity overrides
- Modify `/app/app/editor/[id].tsx` only if you need to accept `?forkedFrom=...` for analytics/toasts (optional)

Key additions
- **New data field (minimal, MVP-safe):**
  - Add `assetPackId?: string` to `GameEntity` (per-entity override)
  - Rendering rule: `entity.assetPackId ?? game.activeAssetPackId` determines which pack’s `assets[templateId]` to use
- **New API endpoint: `games.fork(gameId)`**
  - Clones game record + its `GameDefinition` blob (including templates/entities/assetPacks)
  - Generates a new game id, updates ownership, timestamps, and returns `{ id: newGameId }`
- **Asset gallery “view model” function (in editor app layer)**
  - Build a list of “template cards” from `game.templates`
  - For each template, compute:
    - `primitivePreviewSpec` (shape type + params)
    - list of `packOptions` from `game.assetPacks`
    - “best available image” per pack: `assetPacks[packId].assets[templateId]?.imageUrl`

Acceptance criteria
- Calling `games.fork` returns a new game id and the new game loads in the editor without referencing the old id
- Runtime rendering uses `GameEntity.assetPackId` when present; otherwise falls back to `activeAssetPackId`
- Given a game with multiple packs, you can compute per-template availability (which packs have an image for that template)

---

**Phase 2: Asset Gallery UI (main gallery view)**  
Complexity: complex

Files to modify/create
- Modify `app/app/editor/panels/AssetsPanel.tsx` (replace current list with gallery)
- Create `app/app/editor/components/AssetGallery/AssetGallery.tsx`
- Create `app/app/editor/components/AssetGallery/TemplateAssetCard.tsx`
- Create `app/app/editor/components/PrimitivePreview.tsx` (rect/circle/polygon renderer)
- Modify `app/app/editor/EditorProvider.tsx` to expose:
  - derived template list for gallery
  - asset generation loading state (batch + per-template)
  - actions: set entity/template pack selection (see below)

Key UI behavior (mobile-first)
- **Grid gallery**: `FlatList` with 2-column cards, big tap targets
- Each card shows:
  - Template name
  - Primitive preview (always visible)
  - Generated image preview (overlay or toggle)
  - Per-card toggle: `Primitive | Generated`
  - Per-card pack dropdown (bottom sheet selector, not a tiny web dropdown)
  - Spinner overlay when that template is generating (or when batch generation is active)
- **Pack selection scope (pragmatic MVP default):**
  - Card represents a *template*, but the requirement is *per-entity* pack usage
  - Implement “Apply to all entities of this template” when changing pack on the card:
    - Editor action: `setAssetPackForTemplateEntities(templateId, packId)` which updates all entities whose `templateId` matches
  - (This satisfies “entities can use different packs” while keeping the gallery template-centric.)

Acceptance criteria
- Gallery shows every template in the game as a card
- Primitive preview renders correctly for rect/circle/polygon
- Switching `Primitive | Generated` changes what’s displayed (with fallback if no image exists)
- Selecting a pack on a card updates affected entities’ `assetPackId` and is reflected in the editor canvas
- While `generateForGame` is running, cards show a loading state (global batch + per-template if you track it)

---

**Phase 3: Per-template editing (detail view, regeneration)**  
Complexity: complex

Files to modify/create
- Create `app/app/editor/screens/TemplateAssetDetailSheet.tsx` (bottom sheet or modal)
- Create `app/app/editor/components/AssetGallery/PackAssetRow.tsx` (shows each pack’s version for this template)
- Modify `app/app/editor/panels/AssetsPanel.tsx` to open detail view on card press
- Modify `app/app/editor/EditorProvider.tsx` to add:
  - local prompt draft state per template (client-side only for MVP)
  - mutation wrappers for `regenerateTemplateAsset` and `setTemplateAsset`
  - per-pack/per-template saving indicators

Detail view contents (MVP)
- Header: template name + primitive preview
- List all packs (scrollable):
  - pack name + style tag
  - image preview (if any)
  - “Use this pack for entities” button (sets `assetPackId` on entities of this template)
- Prompt editing:
  - Text input for `customPrompt` (not persisted unless you add a server field; keep as “prompt override used for regeneration”)
  - Style picker (reuse existing `style?: 'pixel' | 'cartoon' | '3d' | 'flat'`)
  - “Regenerate” calls `regenerateTemplateAsset(gameId, packId, templateId, style, customPrompt)`
- Fine tuning:
  - Scale slider + offsetX/offsetY sliders
  - “Save” calls `setTemplateAsset(...)` with updated `AssetConfig`

Acceptance criteria
- Tapping a template card opens a bottom sheet/modal detail view
- You can regenerate a single template asset in a specific pack and see the preview update
- You can adjust scale/offset and persist via `setTemplateAsset`
- You can select a pack version and apply it to entities of that template (updates canvas render)

---

**Phase 4: Polish (loading states, preview modal)**  
Complexity: moderate

Files to modify/create
- Modify `app/app/editor/EditorTopBar.tsx` (or wherever the top controls live): add `Preview` button
- Create `app/app/editor/components/LivePreviewModal.tsx`
- Modify `app/app/editor/EditorProvider.tsx` to expose a “current unsaved game definition snapshot”
- Modify asset mutations handling to unify loading/error states (batch + per-template)

Live Preview (key MVP constraint: uses current document state)
- `Preview` opens a modal/overlay (not navigation)
- Modal renders the game using the **EditorProvider’s in-memory state**, not refetched/saved
- Keep interactions minimal:
  - Play/close controls
  - Uses same runtime renderer as playtest mode, but isolated in modal

Loading + UX polish
- Batch generation:
  - disable regenerate buttons
  - show global progress banner + per-card spinners
- Error states:
  - non-blocking toast + retry affordance on cards/detail rows
- Performance:
  - memoize card view models (templates + selected pack + image url)
  - `FlatList` keying by template id and `getItemLayout` if needed

Acceptance criteria
- Preview modal opens quickly and reflects unsaved edits (entity positions, selected packs, etc.)
- Clear loading indicators for:
  - `generateForGame` (batch)
  - `regenerateTemplateAsset` (per template+pack)
  - `setTemplateAsset` (per template+pack)
- Gallery remains responsive with many templates (no obvious jank)

---

Effort estimate
- Phase 1: Medium (1–2d) if game cloning + renderer override touches multiple layers
- Phase 2: Medium (1–2d) (mostly UI + EditorProvider wiring)
- Phase 3: Large (3d+) (detail sheet UX + per-pack versions + tuning controls + mutation states)
- Phase 4: Medium (1–2d) (preview modal + state snapshot + polish)

Escalation triggers (when to revisit with a more complex design)
- You need per-template “default pack” *and* per-entity overrides with inheritance rules (add explicit `templateDefaultPackId` map)
- You need prompt persistence/history (add `AssetConfig.prompt` or a separate `AssetGenerationSpec` per pack/template on the server)
- You need true batch progress reporting (add server job ids + polling rather than “mutation pending” state)
