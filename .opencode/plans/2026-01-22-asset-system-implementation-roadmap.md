# Asset System Implementation Roadmap

> **Status**: Planning Complete - Ready for Implementation
> **Created**: 2026-01-22
> **Priority**: High - Core feature for game editor MVP

## Executive Summary

Migrate from embedded `assetPacks` in GameDefinition JSON to a proper relational model with:
- Independent `assets` table (reusable across packs/games)
- `asset_packs` table (named collections per game)
- `asset_pack_entries` table (template → asset mappings with alignment)
- `generation_jobs` and `generation_tasks` tables (batch generation tracking)

**No backwards compatibility** - clean migration, remove old embedded structure.

---

## Phase 1: Database Schema & Core Types (Priority: CRITICAL)

### 1.1 Create New Database Tables

**File**: `api/schema.sql` (add to existing)

```sql
-- Independent image assets (generated or uploaded)
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  owner_game_id TEXT,
  source TEXT NOT NULL CHECK (source IN ('generated', 'uploaded')),
  image_url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  content_hash TEXT,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY (owner_game_id) REFERENCES games(id)
);

-- Named asset collections per game
CREATE TABLE IF NOT EXISTS asset_packs (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt_defaults_json TEXT,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Which asset fills each template slot in a pack
CREATE TABLE IF NOT EXISTS asset_pack_entries (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  placement_json TEXT,
  last_generation_json TEXT,
  FOREIGN KEY (pack_id) REFERENCES asset_packs(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  UNIQUE(pack_id, template_id)
);

-- Batch generation requests
CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  pack_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  prompt_defaults_json TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (pack_id) REFERENCES asset_packs(id)
);

-- Per-template generation tracking
CREATE TABLE IF NOT EXISTS generation_tasks (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  prompt_components_json TEXT,
  compiled_prompt TEXT,
  compiled_negative_prompt TEXT,
  model_id TEXT,
  target_width INTEGER,
  target_height INTEGER,
  aspect_ratio TEXT,
  physics_context_json TEXT,
  scenario_request_id TEXT,
  asset_id TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  FOREIGN KEY (job_id) REFERENCES generation_jobs(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  UNIQUE(job_id, template_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_assets_owner_game ON assets(owner_game_id);
CREATE INDEX IF NOT EXISTS idx_asset_packs_game ON asset_packs(game_id);
CREATE INDEX IF NOT EXISTS idx_asset_pack_entries_pack ON asset_pack_entries(pack_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_game ON generation_jobs(game_id);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_job ON generation_tasks(job_id);
```

### 1.2 Update Shared TypeScript Types

**File**: `shared/src/types/assets.ts` (NEW FILE)

```typescript
export type AssetSource = 'generated' | 'uploaded';
export type GenerationStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

export interface Asset {
  id: string;
  ownerGameId?: string;
  source: AssetSource;
  imageUrl: string;
  width?: number;
  height?: number;
  contentHash?: string;
  createdAt: number;
  deletedAt?: number;
}

export interface AssetPlacement {
  scale: number;
  offsetX: number;
  offsetY: number;
  anchor?: { x: number; y: number };
}

export interface PromptDefaults {
  themePrompt?: string;
  styleOverride?: string;
  modelId?: string;
  negativePrompt?: string;
}

export interface PromptComponents {
  themePrompt?: string;
  entityPrompt: string;
  styleOverride?: string;
  negativePrompt?: string;
  positioningHint?: string;
}

export interface PhysicsContext {
  shape: 'box' | 'circle' | 'polygon';
  width?: number;
  height?: number;
  radius?: number;
}

export interface AssetPack {
  id: string;
  gameId: string;
  name: string;
  description?: string;
  promptDefaults?: PromptDefaults;
  createdAt: number;
  deletedAt?: number;
}

export interface AssetPackEntry {
  id: string;
  packId: string;
  templateId: string;
  assetId: string;
  placement?: AssetPlacement;
  lastGeneration?: GenerationResultSnapshot;
}

export interface GenerationResultSnapshot {
  jobId: string;
  taskId: string;
  compiledPrompt: string;
  createdAt: number;
}

export interface GenerationJob {
  id: string;
  gameId: string;
  packId?: string;
  status: GenerationStatus;
  promptDefaults: PromptDefaults;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}

export interface GenerationTask {
  id: string;
  jobId: string;
  templateId: string;
  status: GenerationStatus;
  promptComponents: PromptComponents;
  compiledPrompt: string;
  compiledNegativePrompt?: string;
  modelId?: string;
  targetWidth: number;
  targetHeight: number;
  aspectRatio: string;
  physicsContext: PhysicsContext;
  scenarioRequestId?: string;
  assetId?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}

// Runtime resolution helper
export interface AssetBindingRef {
  assetId: string;
  placement?: AssetPlacement;
}
```

### 1.3 Update GameDefinition

**File**: `shared/src/types/GameDefinition.ts`

Remove old embedded assetPacks, add new assetSystem:

```typescript
// REMOVE these from GameDefinition:
// - assetPacks?: Record<string, AssetPack>;
// - activeAssetPackId?: string;

// ADD this instead:
export interface AssetSystemConfig {
  activeAssetPackId?: string;
  entityAssetOverrides?: Record<string, AssetBindingRef>;
}

export interface GameDefinition {
  // ... existing fields ...
  assetSystem?: AssetSystemConfig;
  // Remove: assetPacks, activeAssetPackId
}
```

### 1.4 Update GameEntity

**File**: `shared/src/types/entity.ts`

Already done - `assetPackId?: string` field added.

---

## Phase 2: API Routes (Priority: HIGH)

### 2.1 New Assets Router

**File**: `api/src/trpc/routes/assets-v2.ts` (NEW FILE)

Replace current assets.ts with new implementation:

```typescript
// Key endpoints:

// Assets CRUD
assets.upload        // POST - upload image, create asset record
assets.get           // GET - get single asset
assets.list          // GET - list assets for game
assets.delete        // DELETE - soft delete asset

// Asset Packs CRUD
packs.create         // POST - create empty pack or generate new pack
packs.get            // GET - get pack with entries
packs.list           // GET - list packs for game
packs.update         // PATCH - update name/description/promptDefaults
packs.delete         // DELETE - soft delete pack
packs.setActive      // POST - set as active pack for game

// Pack Entries
entries.set          // PUT - set asset for template slot
entries.update       // PATCH - update placement only
entries.remove       // DELETE - remove entry (leave slot empty)

// Generation
generation.createJob     // POST - start batch generation
generation.getJob        // GET - get job with tasks
generation.cancelJob     // POST - cancel running job
generation.retryFailed   // POST - retry failed tasks in job
```

### 2.2 Prompt Builder Utility

**File**: `api/src/ai/prompt-builder.ts` (NEW FILE)

```typescript
export interface PromptBuildContext {
  template: EntityTemplate;
  packDefaults: PromptDefaults;
  overrides?: Partial<PromptComponents>;
}

export function buildGenerationPrompt(ctx: PromptBuildContext): {
  compiled: string;
  negative: string;
  components: PromptComponents;
} {
  // 1. Extract entity type from template tags
  // 2. Build entity prompt from template name + tags
  // 3. Compute aspect ratio from physics shape
  // 4. Generate positioning hints
  // 5. Compose final prompt: theme + entity + positioning + style
  // 6. Return compiled prompt + components for storage
}

export function getTargetDimensions(physics: PhysicsComponent): {
  width: number;
  height: number;
  aspectRatio: string;
} {
  // Calculate dimensions matching physics shape aspect ratio
  // Round to multiples of 64 for Scenario.com
  // Target ~512px on longer side
}
```

### 2.3 Generation Job Processor

**File**: `api/src/ai/generation-processor.ts` (NEW FILE)

```typescript
export async function processGenerationJob(
  jobId: string,
  env: Env
): Promise<void> {
  // 1. Load job and tasks from DB
  // 2. Update job status to 'running'
  // 3. For each queued task:
  //    a. Update task status to 'running'
  //    b. Call Scenario.com with compiled prompt
  //    c. On success: create asset record, update task with assetId
  //    d. On failure: update task with error
  //    e. Create/update asset_pack_entry if job has packId
  // 4. Update job status based on task outcomes
}
```

---

## Phase 3: Migration Script (Priority: HIGH)

### 3.1 One-Time Migration

**File**: `api/src/migrations/migrate-asset-packs.ts` (NEW FILE)

```typescript
export async function migrateAssetPacks(db: D1Database): Promise<void> {
  // 1. Get all games with embedded assetPacks
  // 2. For each game:
  //    a. Parse definition JSON
  //    b. For each embedded pack:
  //       - Create asset_packs row
  //       - For each asset in pack:
  //         - Create assets row
  //         - Create asset_pack_entries row
  //    c. Update definition JSON:
  //       - Remove assetPacks
  //       - Remove activeAssetPackId
  //       - Add assetSystem.activeAssetPackId
  //    d. Save updated definition
  // 3. Log migration summary
}
```

### 3.2 Update Existing Assets Route

**File**: `api/src/trpc/routes/assets.ts`

- Keep generateForGame but update to use new tables
- Update regenerateTemplateAsset to use new tables
- Deprecate/remove old embedded pack logic

---

## Phase 4: Renderer Updates (Priority: HIGH)

### 4.1 Update EntityRenderer

**File**: `app/lib/game-engine/renderers/EntityRenderer.tsx`

Already partially done. Complete the update:

```typescript
interface EntityRendererProps {
  entity: RuntimeEntity;
  pixelsPerMeter: number;
  renderMode?: 'default' | 'primitive';
  showDebugOverlays?: boolean;
  // New: pass resolved asset directly instead of pack lookups
  resolvedAsset?: {
    imageUrl: string;
    placement: AssetPlacement;
  };
}
```

### 4.2 Asset Resolution Hook

**File**: `app/lib/game-engine/hooks/useAssetResolution.ts` (NEW FILE)

```typescript
export function useAssetResolution(
  entity: RuntimeEntity,
  gameId: string,
  activePackId?: string
): ResolvedAsset | null {
  // 1. Check entity.assetPackId override
  // 2. Fall back to activePackId
  // 3. Query asset_pack_entries for template
  // 4. Return asset with placement
}
```

### 4.3 Update GameRuntime

**File**: `app/lib/game-engine/GameRuntime.native.tsx`

- Remove direct assetPacks access from definition
- Use new asset resolution system
- Pass allAssetPacks to EntityRenderer (already started)

---

## Phase 5: Editor UI Components (Priority: MEDIUM)

### 5.1 Asset Gallery Panel

**File**: `app/components/editor/panels/AssetGalleryPanel.tsx` (NEW FILE)

```typescript
// Grid view of all templates in game
// Each card shows:
// - Template name
// - Primitive shape preview (always visible)
// - Generated asset preview (if exists)
// - Mode toggle: Primitive | Generated
// - Coverage indicator: ✓ Has asset | ○ Empty
// - Tap to open alignment editor
```

### 5.2 Primitive Preview Component

**File**: `app/components/editor/AssetGallery/PrimitivePreview.tsx` (NEW FILE)

```typescript
// Skia-based renderer for primitive shapes
// Supports: rect, circle, polygon
// Shows physics body outline
// Used in gallery cards and alignment editor
```

### 5.3 Template Asset Card

**File**: `app/components/editor/AssetGallery/TemplateAssetCard.tsx` (NEW FILE)

```typescript
// Single card in the gallery grid
// Shows template with primitive + generated overlay
// Mode toggle button
// Pack selector dropdown (bottom sheet on mobile)
// Loading state for generation in progress
```

### 5.4 Asset Pack Selector

**File**: `app/components/editor/AssetGallery/AssetPackSelector.tsx` (NEW FILE)

```typescript
// Bottom sheet for selecting asset pack
// List all packs for game
// Shows coverage per pack
// "Create New Pack" button
// "Generate All" button
```

---

## Phase 6: Alignment Editor (Priority: MEDIUM)

### 6.1 Asset Alignment Editor

**File**: `app/components/editor/AssetAlignment/AssetAlignmentEditor.tsx` (NEW FILE)

```typescript
// Full-screen or large bottom sheet
// Visual preview area:
// - Physics body outline (fixed)
// - Generated image (draggable/scalable)
// - Grid/guides for alignment
// Controls:
// - Scale slider (0.5x - 2.0x)
// - Offset X slider
// - Offset Y slider
// - Reset button
// - Preview in game button
// - Save button
```

### 6.2 Alignment Preview Canvas

**File**: `app/components/editor/AssetAlignment/AlignmentPreviewCanvas.tsx` (NEW FILE)

```typescript
// Skia canvas showing:
// - Checkered background (transparency indicator)
// - Physics body outline in contrasting color
// - Generated image with current scale/offset
// - Touch gestures for drag/pinch adjustment
```

---

## Phase 7: Generation UI (Priority: MEDIUM)

### 7.1 Generation Modal

**File**: `app/components/editor/Generation/GenerationModal.tsx` (NEW FILE)

```typescript
// Modal for configuring batch generation
// Pack-level settings:
// - Theme prompt text input
// - Style picker (pixel, cartoon, 3d, flat)
// - Model selector (if multiple available)
// Per-template overrides (expandable):
// - Entity prompt override
// - Custom positioning hints
// Progress view:
// - Task list with status indicators
// - Cancel button
// - Retry failed button
```

### 7.2 Generation Progress Tracker

**File**: `app/components/editor/Generation/GenerationProgressTracker.tsx` (NEW FILE)

```typescript
// Real-time progress display
// Shows: queued → running → succeeded/failed
// Per-template status with thumbnail preview
// Error messages for failed tasks
// Retry individual or all failed
```

---

## Phase 8: Integration & Polish (Priority: LOW)

### 8.1 Update Editor Provider

**File**: `app/components/editor/EditorProvider.tsx`

Add new state and actions:
- `assetPacks: AssetPack[]`
- `activePackId: string | null`
- `generationJob: GenerationJob | null`
- `setActivePackId(packId)`
- `startGeneration(config)`
- `updateEntityAssetOverride(entityId, assetId, placement)`

### 8.2 Live Preview Modal

**File**: `app/components/editor/LivePreviewModal.tsx` (NEW FILE)

- Fullscreen game preview using current editor state
- Play/pause controls
- Close button
- Uses in-memory definition (not saved version)

### 8.3 Fork Integration

**File**: `app/app/play/[id].tsx`

Add "Fork & Edit" button that:
1. Calls `games.fork` API
2. Navigates to `/editor/[newId]`

---

## Implementation Order (Prioritized)

### Week 1: Foundation
1. [ ] Create database tables (schema.sql)
2. [ ] Create shared TypeScript types (assets.ts)
3. [ ] Update GameDefinition types
4. [ ] Write migration script
5. [ ] Run migration on dev database

### Week 2: API Layer
6. [ ] Create assets-v2 router (basic CRUD)
7. [ ] Create prompt builder utility
8. [ ] Create generation job processor
9. [ ] Update existing assets routes to use new tables
10. [ ] Test API with curl/Postman

### Week 3: Renderer & Resolution
11. [ ] Create useAssetResolution hook
12. [ ] Update EntityRenderer
13. [ ] Update GameRuntime
14. [ ] Test rendering with new system

### Week 4: Gallery UI
15. [ ] Create PrimitivePreview component
16. [ ] Create TemplateAssetCard component
17. [ ] Create AssetGalleryPanel
18. [ ] Create AssetPackSelector
19. [ ] Integrate into editor bottom sheet

### Week 5: Alignment & Generation
20. [ ] Create AlignmentPreviewCanvas
21. [ ] Create AssetAlignmentEditor
22. [ ] Create GenerationModal
23. [ ] Create GenerationProgressTracker
24. [ ] Wire up generation flow end-to-end

### Week 6: Polish
25. [ ] Add loading states everywhere
26. [ ] Add error handling and retry logic
27. [ ] Create LivePreviewModal
28. [ ] Add Fork & Edit button
29. [ ] Testing and bug fixes

---

## Success Criteria

### Functional Requirements
- [ ] User can create a new asset pack for a game
- [ ] User can generate assets for all templates in one batch
- [ ] User can regenerate individual assets with custom prompts
- [ ] User can upload custom images as assets
- [ ] User can mix assets from different packs per-entity
- [ ] User can adjust scale/offset to align assets with physics bodies
- [ ] User can switch between primitive and generated view modes
- [ ] User can preview game with current asset selections
- [ ] User can fork a game and edit the fork

### Technical Requirements
- [ ] All asset data stored in relational tables (not JSON blob)
- [ ] Generation prompts include correct aspect ratios
- [ ] Partial generation failures don't break the pack
- [ ] Assets are reusable across packs
- [ ] Old embedded assetPacks migrated to new tables

### Performance Requirements
- [ ] Gallery loads in <500ms for games with 20+ templates
- [ ] Asset resolution doesn't block render loop
- [ ] Generation progress updates in real-time

---

## Files to Create/Modify Summary

### New Files
- `api/schema.sql` (additions)
- `shared/src/types/assets.ts`
- `api/src/trpc/routes/assets-v2.ts`
- `api/src/ai/prompt-builder.ts`
- `api/src/ai/generation-processor.ts`
- `api/src/migrations/migrate-asset-packs.ts`
- `app/lib/game-engine/hooks/useAssetResolution.ts`
- `app/components/editor/panels/AssetGalleryPanel.tsx`
- `app/components/editor/AssetGallery/PrimitivePreview.tsx`
- `app/components/editor/AssetGallery/TemplateAssetCard.tsx`
- `app/components/editor/AssetGallery/AssetPackSelector.tsx`
- `app/components/editor/AssetAlignment/AssetAlignmentEditor.tsx`
- `app/components/editor/AssetAlignment/AlignmentPreviewCanvas.tsx`
- `app/components/editor/Generation/GenerationModal.tsx`
- `app/components/editor/Generation/GenerationProgressTracker.tsx`
- `app/components/editor/LivePreviewModal.tsx`

### Files to Modify
- `shared/src/types/GameDefinition.ts` (remove old assetPacks)
- `shared/src/types/entity.ts` (already done - assetPackId)
- `shared/src/types/schemas.ts` (update Zod schemas)
- `api/src/ai/schemas.ts` (update Zod schemas)
- `api/src/trpc/routes/assets.ts` (update to use new tables)
- `api/src/trpc/routes/games.ts` (already done - fork endpoint)
- `app/lib/game-engine/renderers/EntityRenderer.tsx` (in progress)
- `app/lib/game-engine/GameRuntime.native.tsx` (in progress)
- `app/components/editor/EditorProvider.tsx` (add asset state)
- `app/components/editor/panels/AssetsPanel.tsx` (replace with gallery)
- `app/app/play/[id].tsx` (add fork button)

---

## Notes for Continuation

### Key Design Decisions Made
1. **Assets are independent** - not embedded in packs
2. **Prompts stored on generation tasks** - not on assets
3. **Placement stored on pack entries** - not on assets
4. **No backwards compatibility** - clean migration
5. **Aspect ratios from physics** - prompts include dimension hints

### Open Questions (decide during implementation)
1. Should assets be deletable if referenced by pack entries?
2. How long to keep generation job/task history?
3. Should we support multiple concurrent generation jobs per game?
4. Do we need asset versioning (keep old versions when regenerating)?

### Dependencies
- Scenario.com API for image generation
- Cloudflare R2 for asset storage
- Cloudflare D1 for database tables
