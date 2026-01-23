# Asset Generation System - Continuation

Last updated: 2026-01-22

## Current State

The asset generation pipeline is working end-to-end:
1. User opens Asset Gallery in editor
2. Quick-create form shows for new packs (theme prompt + style selector)
3. Click "Generate X Assets" creates pack and fires generation
4. Polling updates progress as each asset completes
5. Images display in the gallery

### Key Files
- `app/components/editor/AssetGallery/AssetGalleryPanel.tsx` - Main UI
- `app/components/editor/AssetGallery/useAssetGeneration.ts` - Polling hook
- `app/components/editor/AssetGallery/TemplateAssetCard.tsx` - Asset display card
- `app/components/editor/AssetAlignment/AssetAlignmentEditor.tsx` - Alignment modal
- `api/src/trpc/routes/asset-system.ts` - Backend CRUD + generation orchestration
- `api/src/ai/assets.ts` - AssetService with Scenario.com integration

### Database Tables
- `asset_packs` - Pack metadata (name, style, theme prompt)
- `asset_pack_entries` - Links packs to assets per template
- `game_assets` - Generated images (image_url, dimensions)
- `generation_jobs` / `generation_tasks` - Job tracking for polling

---

## Next Steps

### 1. Prompt Tuning
Current prompts are basic and produce inconsistent results. Need to:
- Improve prompt templates in `AssetService.generateAsset()`
- Add entity-specific context (shape, size, role in game)
- Consider using game metadata (title, description) for theme coherence
- Add negative prompts to avoid common issues

**Location**: `api/src/ai/assets.ts` - `buildPrompt()` and `MODEL_MATRIX`

### 2. Alignment Mode
Alignment editor exists but needs work. The goal:
- Show physics shape overlay (opaque/semi-transparent)
- Allow shift (offsetX/offsetY) and scale adjustments
- Generated image aligns with physics bounds
- Save placement to `asset_pack_entries.placement_json`

**Files**:
- `app/components/editor/AssetAlignment/AssetAlignmentEditor.tsx`
- `AssetPackEntryRow.placement_json` stores: `{ scale, offsetX, offsetY, anchor? }`

**Flow**:
1. Click on asset card with generated image
2. Opens alignment modal
3. Physics shape shown as outline
4. Drag/pinch to adjust image position/scale
5. Save persists to database

### 3. Background Removal Integration
Scenario.com supports background removal. Should be part of pipeline:
- After generation completes, optionally run background removal
- Store both original and background-removed versions
- UI toggle to show with/without background

**API**: `mcp_scenario-image-gen_remove_background` takes asset URL and returns cleaned version

### 4. Show Generation Prompt in UI
For debugging and user interest, display the prompt used:
- `last_generation_json` in `asset_pack_entries` already stores `compiledPrompt`
- Add UI to show this (maybe tap on asset card, or info icon)
- Could also show model used, generation time, etc.

**Data already available**: Each entry has `last_generation_json`:
```json
{
  "jobId": "...",
  "taskId": "...",
  "compiledPrompt": "Stack blocks... pixel art...",
  "createdAt": 1769132268180
}
```

---

## Architecture Notes

### Polling Flow
```
generateAll() 
  -> createJobMutation (creates job + tasks in DB)
  -> processJobMutation.mutate() (fire and forget - doesn't await!)
  -> setInterval polls getJob every 3s
  -> When completed > lastCompletedCount, invalidate getPack
  -> When job.status is 'succeeded'/'failed', stop polling
```

### R2 Asset Storage
- Local dev: Assets stored in `.wrangler/state/v3/r2/slopcade-assets-dev/`
- Served via `/assets/*` route in `api/src/index.ts`
- `ASSET_HOST` env var controls URL prefix
- For production: Set up public R2 access with custom domain

### Secrets (via hush)
- `SCENARIO_API_KEY` - Scenario.com API key
- `DEV__ASSET_HOST` - `http://localhost:8789/assets` for local dev
- `ASSET_HOST` - Production R2 public URL

---

## Known Issues

1. **Some images are "wild"** - Prompt tuning needed
2. **Alignment mode partially implemented** - UI exists but may need polish
3. **No background removal yet** - Pipeline enhancement needed
4. **Generation can be slow** - ~25-30s per asset, sequential processing

---

## Commands

```bash
# Start services
pnpm dev

# Check API logs
tmux capture-pane -t omo-slopcade-api -p -S -50 | tail -30

# Apply schema to local D1
cd api && npx wrangler d1 execute slopcade-db --local --file=schema.sql

# Check local database
cd api && npx wrangler d1 execute slopcade-db --local --command "SELECT * FROM asset_packs;"

# TypeScript check
cd app && pnpm tsc --noEmit
```
