---
title: "Create comprehensive asset integration plan"
agent: oracle
created: 2026-01-22T05:26:03.830Z
session_id: ses_41bd694deffeDWvjXiIC0ReGeK
duration: 1m 25s
---

# Create comprehensive asset integration plan

# Implementation Plan: Asset Packs + Sprite Overrides + Parallax Backgrounds

## 1) Executive Summary

We’re building a complete “graphics pipeline” that binds generated (or uploaded) images to a game’s JSON, lets users manage assets at the sprite/template level, and extends the existing parallax background renderer with a full editor + generation flow. The outcome is: a game can ship with an `activeAssetPackId`, per-template image overrides (with scale/offset), and an optional `parallaxConfig` that drives `ParallaxBackground`—all managed through improved in-app UI and backed by small, targeted API/schema changes.

Primary recommendation: keep the existing “asset pack = mapping templateId -> imageUrl(+params)” model, and add the smallest missing metadata to support per-sprite controls (transform + reset-to-primitive) and parallax (layers array). Avoid background job infrastructure; implement progress in the client by chunked/concurrent calls to the existing batch endpoints.

---

## 2) Phase Breakdown (with dependencies)

### Phase 0 — Baseline Audit + Data Model Alignment (Dependency: none)
- Confirm how “entity templates” are identified (templateId keys) across game JSON, renderer, and generator.
- Ensure there is a single canonical “templateId list” for `generateForGame` and UI listing.

### Phase 1 — Asset Pack UI v2 (Dependency: Phase 0)
- Replace the current “basic modal” with an Asset Manager that supports:
  - pack metadata (name/description)
  - per-template thumbnails
  - style selection + batch progress
  - per-template regenerate

### Phase 2 — Sprite-Level Controls (Dependency: Phase 1)
- Per-template controls:
  - choose image source (generated pack image, uploaded custom image, or “primitive fallback”)
  - adjust scale/offset (and optional opacity/tint if desired)
  - reset actions

### Phase 3 — Parallax Integration End-to-End (Dependency: Phase 1; optional coupling to Phase 2)
- Add `parallaxConfig` to the game definition schema and editor UI.
- Add background/layer generation support (reusing Scenario generation patterns).
- Add layer management: add/remove/reorder, per-layer depth/parallax factor, per-layer image.

### Phase 4 — Editor/Maker Integration (Dependency: Phases 1–3)
- Integrate asset & parallax controls into the maker flow with a “preview before commit” pattern.
- Ensure runtime consumption is purely data-driven (GameDefinition → GameRuntime → renderers).

### Phase 5 — Manual Sample Game Validation + Workflow Doc (Dependency: all)
- Run a full “generate pack + configure parallax + verify runtime rendering” on one sample game and document the steps.

---

## 3) Detailed Tasks (by phase)

### Phase 0 — Baseline Audit + Alignment
1. Identify the canonical list of template IDs for a game
   - Source: whatever `assets.generateForGame` uses today (ensure it matches what the play screen renders).
2. Verify current runtime asset wiring
   - `activeAssetPackId` passed to `GameRuntime`
   - `EntityRenderer.tsx` using `assetOverrides` / `getAssetOverrideSprite()`
3. Decide where per-template render overrides live
   - Minimal: store per-template sprite overrides inside the AssetPack entry (preferred), so switching packs switches overrides too.

Deliverable: confirmed “templateId universe” + where overrides will be persisted.

---

### Phase 1 — Asset Pack UI v2 (Asset Manager)
1. Replace modal content with a dedicated “Asset Manager” view embedded in the modal
   - Header: pack selector + “New pack” + “Rename” + “Duplicate” + “Delete”
   - Body: grid/list of templates with thumbnails and actions
2. Add pack metadata editing
   - `name` (required), `description` (optional)
   - Persist to backend (D1) via tRPC mutation
3. Add style selection + batch generation flow
   - Style dropdown: pixel/cartoon/3d/flat (existing)
   - “Generate missing” and “Regenerate all” actions
4. Progress indicator (client-side)
   - Use chunked concurrency calling `assets.generateBatch` (or repeated `assets.generate`)
   - Track: `completed/total`, per-item status (queued/generating/done/error)
   - Do not block UI: allow cancel (best-effort—stop enqueuing further requests)
5. Template thumbnail preview
   - Show current image if present, else placeholder
   - Tap opens per-template detail drawer (Phase 2)

Deliverables:
- Asset Manager UI
- Pack metadata CRUD
- Batch generation with progress
- Thumbnails + per-template entry point

---

### Phase 2 — Sprite-Level Controls (Per Template)
1. Add a “Template Asset Detail” panel (drawer/screen)
   - Shows: large preview, template name/id, current source, controls
2. Source selection (“Rendering Mode”)
   - Options:
     - `Generated image` (from current pack’s `assets[templateId].imageUrl`)
     - `Custom upload` (user-provided imageUrl stored into pack entry)
     - `Primitive fallback` (explicitly disable image override for this template)
3. Upload custom image (minimal viable)
   - Add API: request an upload URL (or accept direct `imageUrl` if you already have an upload flow)
   - Upload to R2, obtain final `imageUrl`
   - Mutation: set `assets[templateId].imageUrl` to uploaded URL
4. Transform controls (per template)
   - `scale` (already supported in schema as optional; formalize its meaning for renderer)
   - `offsetX`, `offsetY` (new)
   - Optional: `opacity`, `tint` (only if you want UI parity with `ImageSpriteComponent`)
5. “Reset” actions
   - Reset transform to defaults
   - Remove image override (back to primitive)
6. Runtime integration
   - Extend `getAssetOverrideSprite()` to include offset/scale into `ImageSpriteComponent`
   - Ensure “primitive fallback” means `getAssetOverrideSprite()` returns `null` for that template

Deliverables:
- Per-template detail UI
- Upload + set image per template
- Transform overrides wired into renderer

---

### Phase 3 — Parallax Integration End-to-End
1. Schema updates: `parallaxConfig` on GameDefinition
   - Add `enabled: boolean`
   - Add ordered `layers: ParallaxLayer[]`
2. Parallax Layer model
   - `id`, `name`
   - `depthPreset` or `depth` (number)
   - `parallaxFactor` (explicit number used by renderer)
   - `imageUrl`
   - Optional: `scale`, `offsetX`, `offsetY`
3. UI: Parallax Editor
   - Toggle enable/disable
   - Layer list with drag reorder
   - Add layer (choose preset: sky/far/mid/near)
   - Per-layer detail: preview, parallax factor slider, depth preset, generate/regenerate, remove
4. API: background layer generation
   - Reuse the existing Scenario service patterns:
     - New template type: `background` (already in your model matrix), but now parameterized by “layer role” (sky/far/mid/near)
   - Add a mutation:
     - `backgrounds.generateLayer({ gameId, layerId, style, promptHints? }) -> imageUrl`
   - Or keep it under `assets.*`:
     - `assets.generateBackgroundLayer(...)` to avoid a new router
5. Runtime wiring
   - `GameRuntime` reads `gameDefinition.parallaxConfig`
   - If enabled: render `ParallaxBackground` behind entities using the configured layers
   - If disabled or no layers: keep current behavior (whatever background exists today)

Deliverables:
- `parallaxConfig` in game JSON
- UI to configure layers + generate images
- Runtime uses config to render parallax

---

### Phase 4 — Editor/Maker Integration (“Preview before commit”)
1. Add an “Assets” step/tab in the editor flow
   - Shows pack manager + per-template controls
2. Add a “Background” step/tab
   - Shows parallax editor + preview
3. Draft vs committed state (minimal approach)
   - Keep edits in local editor state until user hits “Save/Apply”
   - On apply: update game definition + associated asset pack records
4. In-editor preview
   - Reuse existing `GameRuntime` to preview with selected pack + parallax config
   - Provide “Preview” button that opens a lightweight runtime view with the draft config

Deliverables:
- Maker flow includes assets + parallax config
- Users preview before saving

---

### Phase 5 — Manual Sample Game Validation + Workflow Doc
1. Pick sample game: `game-1-sports-projectile.json` (as requested)
2. Generate full pack (characters/items/platforms/UI)
3. Generate 3–4 parallax layers
4. Verify runtime rendering (sprite images + background)
5. Write “Workflow” doc for future users

Deliverable: a repeatable, documented graphics workflow.

---

## 4) UI Mockups (text descriptions)

### A) “Asset Manager” Modal (replaces current basic modal)
- Top bar:
  - Left: `Asset Pack:` [Dropdown]
  - Middle: pack name (editable) + description (editable multiline)
  - Right: `Generate Missing` `Regenerate All` `New Pack`
- Progress strip (only while generating):
  - “Generating 6/18” + spinner + “Cancel”
  - Inline errors count: “2 failed (retry)”
- Template grid (2-column on mobile, 4+ on tablet/desktop):
  - Card: thumbnail, template name, small badges (has image / custom / primitive)
  - Actions: `Edit` `Regenerate`

### B) Template Detail Drawer
- Large preview at top (image or primitive preview placeholder)
- Section: Rendering Mode
  - Radio: `Generated` / `Custom Upload` / `Primitive`
- Section: Transform
  - Scale slider + numeric input
  - OffsetX / OffsetY sliders + numeric inputs
  - Reset transform button
- Section: Actions
  - `Regenerate` (style dropdown inherited)
  - `Remove image (primitive)`

### C) Parallax Editor (inside editor or modal)
- Toggle: `Enable parallax background`
- Layer list (reorderable):
  - Row: thumbnail + layer name + parallax factor chip + `Edit` `Generate` `Delete`
- Layer detail:
  - Preview
  - Preset dropdown: sky/far/mid/near (autofills factor)
  - Parallax factor slider
  - Generate/regenerate button with style dropdown

### D) In-Editor Preview
- Split view (or full-screen preview):
  - Top: “Previewing: Pack X + Parallax enabled”
  - Body: GameRuntime renders current scene
  - Bottom: “Apply” “Discard changes”

---

## 5) API Changes (tRPC + schemas)

### Schema changes (shared)
1. Asset pack entry enhancements (minimal)
   - Today: `{ imageUrl, scale?, animations? }`
   - Proposed:
     - `imageUrl?: string` (allow missing / primitive)
     - `source?: 'generated' | 'uploaded' | 'none'` (optional but helps UI)
     - `scale?: number`
     - `offsetX?: number`
     - `offsetY?: number`
     - Keep `animations?` as-is
2. GameDefinitionSchema
   - Add:
     ```ts
     parallaxConfig?: {
       enabled: boolean
       layers: Array<{
         id: string
         name: string
         imageUrl: string
         parallaxFactor: number
         scale?: number
         offsetX?: number
         offsetY?: number
       }>
     }
     ```

### New/updated endpoints (minimal set)
1. Asset pack metadata + per-template updates
   - `assets.updatePackMetadata({ packId, name, description? })`
   - `assets.setTemplateAsset({ packId, templateId, imageUrl?, source?, scale?, offsetX?, offsetY? })`
2. Custom upload support (if not already present)
   - `assets.getUploadUrl({ contentType, fileName }) -> { uploadUrl, publicUrl }`
   - Or two-step: `getUploadUrl` + `assets.registerUpload({ packId, templateId, publicUrl })`
3. Background/parallax generation
   - `assets.generateBackgroundLayer({ gameId, layerId, style, layerRole, promptHints? }) -> { imageUrl }`
4. Optional convenience
   - `assets.duplicatePack({ packId, newName }) -> { newPackId }`

Note: keep `assets.generateForGame` but consider changing the client to call `generateBatch` in chunks so you can show progress without server-side job infrastructure.

---

## 6) Testing Strategy

### Shared/schema tests (unit)
- Validate updated `AssetPackSchema` and `GameDefinitionSchema`
- Backward compatibility: old packs without offsets/parallaxConfig still parse and render

### API tests (integration)
- `assets.setTemplateAsset` updates stored pack correctly
- Upload URL endpoint returns usable URL shape (mock R2 signing if needed)
- `assets.generateBackgroundLayer` returns an imageUrl and persists it into `parallaxConfig` (or returns it for the client to persist)

### Renderer tests (integration / lightweight)
- Given a template with `imageUrl + scale + offset`, `getAssetOverrideSprite()` returns a correct `ImageSpriteComponent`
- “Primitive fallback” returns null override and existing shape renderer path remains active

### UI behavior tests (pragmatic)
- Minimal “happy path” tests around:
  - progress state machine (queued → generating → done/error)
  - pack switching updates thumbnails and active overrides

---

## 7) Manual Test Plan (sample game: `game-1-sports-projectile.json`)

1. Open `app/app/play/[id].tsx` for the sample game id
2. Tap `🎨 Skin` to open Asset Manager
3. Create a new pack
   - Name: “Sports Projectile – Pixel”
   - Style: `pixel`
4. Click `Generate Missing`
   - Confirm progress increments until complete
   - Confirm each template shows a thumbnail after generation
5. Per-template verification
   - Open a character template → adjust `scale` and `offset`
   - Set one template to `Primitive` and confirm it renders as shape in runtime
6. Custom upload verification
   - Upload an image for one template
   - Confirm thumbnail updates and runtime uses the uploaded image
7. Parallax configuration
   - Open Parallax Editor (in editor/maker flow or via a new entry point)
   - Enable parallax
   - Add layers: sky, far, mid, near
   - Generate each layer (style `pixel`)
8. Runtime verification
   - Return to gameplay
   - Confirm:
     - parallax layers render behind entities
     - camera movement produces differential parallax motion
     - sprite images render with correct size/position (including offsets)
9. Persistence verification
   - Reload the game/session
   - Confirm active pack + per-template overrides + parallaxConfig persist
10. Document workflow
   - Capture: “Create pack → generate → tweak per template → enable parallax → generate layers → preview → save”

---

## Effort Estimate

Medium (1–2 days) for Asset Pack UI v2 + sprite-level controls if upload flow is already mostly solved; Large (3d+) if you also need robust R2 upload plumbing + a full editor integration pass and reorderable parallax layer UX.
