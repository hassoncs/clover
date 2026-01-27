# Frontend Asset Management Architecture

## Overview
The game editor's asset management system consists of several key components:

### 1. AssetGalleryPanel (`app/components/editor/AssetGallery/AssetGalleryPanel.tsx`)
**Main entry point for asset management**

Key Features:
- **Mode Switcher**: Toggle between "Entities" and "UI Components" modes
- **Asset Pack Selection**: Select/create/delete asset packs
- **Quick Generation Form**: Create new pack + generate assets in one flow
- **Template Grid**: Display all game templates with their generated assets
- **UI Component Generation**: Generate UI elements with different states

State:
- `selectedPackId`: Currently selected asset pack
- `mode`: 'entities' | 'ui-components'
- `quickCreateTheme`, `quickCreateStyle`: Form state for quick generation

### 2. TemplateAssetCard (`app/components/editor/AssetGallery/TemplateAssetCard.tsx`)
**Individual template/asset display card**

Current Capabilities:
- ✅ Display generated asset or primitive shape
- ✅ Show generation details/prompt (via ℹ️ button)
- ✅ Toggle between Shape view and Asset view
- ✅ Show status indicator (⏳ generating, ✓ generated, ○ not generated)
- ✅ Long-press to show silhouette overlay (hold to see input)

**MISSING Capabilities:**
- ❌ No regenerate single asset button
- ❌ No edit prompt functionality
- ❌ No quick regeneration with modified prompt

### 3. useAssetGeneration Hook
**React hook for asset generation logic**

Exports:
- `useAssetGeneration(gameId)`: Main generation hook with `generateAll()` function
- `useCreateAssetPack(gameId)`: Create new pack with `createPack()`
- `useAssetPacks(gameId)`: Query list of packs
- `useAssetPackWithEntries(packId)`: Query pack details
- `useUpdatePlacement()`: Update asset placement
- `useDeleteAssetPack(gameId)`: Delete a pack
- `useRegenerateAssetPack(gameId)`: Regenerate entire pack with new theme/style

### 4. AssetPackSelector Modal
**Create/select/delete asset packs**

Features:
- List all packs with style emoji, name, date
- Create new pack with:
  - Name
  - Style (pixel/cartoon/3d/flat)
  - Theme prompt (optional)
- Delete pack with confirmation

### 5. Asset Alignment Editor
**Fine-tune asset placement**

Features:
- Scale adjustment (percentage)
- Offset X/Y controls
- Preview canvas

---

## User Workflows

### Workflow 1: Quick Generate (No existing pack)
1. Fill in Theme prompt and select Style
2. Click "Generate [N] Assets"
3. System creates new pack and generates all assets

### Workflow 2: Select Existing Pack
1. Click "Manage" to open AssetPackSelector
2. Select existing pack OR create new one
3. Pack's templates appear in TemplateGrid
4. Click "Regenerate All Assets" to regenerate all

### Workflow 3: View Asset Details
1. Click on a template card in TemplateGrid
2. If no asset: goes to template editor
3. If has asset: opens AssetAlignmentEditor
4. Click ℹ️ button to see generation prompt

### Workflow 4: Generate UI Components
1. Switch mode to "UI Components"
2. Select component type (button, checkbox, etc.)
3. Select states (normal, hover, pressed, etc.)
4. Enter theme description
5. Click "Generate" button

---

## Missing Features (Gaps Identified)

### High Priority:
1. **Regenerate Single Asset**: No way to regenerate just one template's asset
2. **Edit Prompt**: Can't modify the prompt for a specific template
3. **Re-theme Pack**: The `useRegenerateAssetPack` hook exists but UI doesn't expose it
4. **Visual Preview**: Asset packs show emoji but no thumbnail preview

### Medium Priority:
5. **Batch Regenerate Selected**: Select multiple templates and regenerate
6. **Prompt Templates**: Save/load prompt configurations
7. **Style Mixing**: Different templates with different styles in same pack

### Lower Priority:
8. **Asset History**: View previous generations
9. **A/B Comparison**: Compare two generations of same template
10. **Bulk Edit**: Edit prompts for multiple templates at once

---

## Key Files
- `app/components/editor/AssetGallery/AssetGalleryPanel.tsx` - Main panel
- `app/components/editor/AssetGallery/TemplateAssetCard.tsx` - Individual cards
- `app/components/editor/AssetGallery/useAssetGeneration.ts` - Hooks
- `app/components/editor/AssetGallery/AssetPackSelector.tsx` - Pack management
- `app/components/editor/AssetGallery/TemplateGrid.tsx` - Grid layout
- `app/components/editor/AssetGallery/QuickGenerationForm.tsx` - Quick form

## API Mutations Used
- `assetSystem.createPack`: Create new pack
- `assetSystem.createGenerationJob`: Create job for generation
- `assetSystem.processGenerationJob`: Process job
- `assetSystem.updateEntryPlacement`: Update placement
- `assetSystem.deletePack`: Delete pack
- `assetSystem.regeneratePack`: Regenerate pack with new theme/style (NEW)

## Related Backend Files
- `api/src/trpc/routes/asset-system.ts` - All asset system mutations
- `api/src/ai/assets.ts` - AssetService class (Scenario.com integration)
- `api/src/ai/pipeline/stages/index.ts` - Pipeline stages
