# Asset Management UI - New Requirements

## Summary from User Conversation
Build comprehensive frontend UI for asset management with the following features:

### 1. Remove Style Enum Constraint
- Current: `style: 'pixel' | 'cartoon' | '3d' | 'flat'` (enum)
- New: `style: string` with 4 defaults as options
- UI: Dropdown or pill selector with editable custom option

### 2. Theme as Array of Strings
- Current: `themePrompt: string` (single string)
- New: `themes: string[]` with default options
- UI: Select from defaults or add custom theme
- User can pick which theme to apply when regenerating

### 3. Batch Regeneration API
- Single endpoint: `regenerateAssets(params)`
- Params:
  - `packId: string`
  - `templateIds: string[]` (1 to n, can be all)
  - `newTheme?: string` (optional override)
  - `newStyle?: string` (optional override)
  - `customPrompt?: string` (optional override per template)

### 4. New UI Features

#### Batch Selection UI
- Checkbox next to each template in TemplateGrid
- "Select All" / "Select None" buttons
- "Regenerate Selected" button with theme/style picker
- Bulk actions: delete, re-theme

#### Asset Viewer Modal (per asset)
- Radio/Tab buttons: "Silhouette" | "Generated" | "Background Removed"
- Touch-down toggle: hold to see silhouette, release for generated
- Show generation metadata: prompt, style, date, seed

#### Pack Management
- Theme dropdown: show 4 defaults + "Custom"
- Style dropdown: show 4 defaults + "Custom"
- "Apply New Theme" button for entire pack
- "Apply New Style" button for entire pack

### 5. Files to Modify

#### Types (Shared)
- `shared/src/types/asset-system.ts`
  - Change `SpriteStyle` from union to string
  - Add `DEFAULT_THEMES` constant
  - Add `DEFAULT_STYLES` constant

#### Backend API
- `api/src/trpc/routes/asset-system.ts`
  - Add `regenerateAssets` mutation (batch endpoint)
  - Update `createGenerationJob` to accept array of templateIds
  - Support optional theme/style overrides per call

#### Frontend Hooks
- `app/components/editor/AssetGallery/useAssetGeneration.ts`
  - Add `useRegenerateAssets` hook (batch)
  - Add `useApplyThemeToPack` hook
  - Add `useApplyStyleToPack` hook

#### Frontend Components
- `app/components/editor/AssetGallery/TemplateAssetCard.tsx`
  - Add checkbox for selection
  - Add asset viewer modal (touch toggle)
  - Show multiple versions (silhouette, generated, bg-removed)

- `app/components/editor/AssetGallery/TemplateGrid.tsx`
  - Support selection mode
  - Multi-select checkboxes

- `/AssetGallery/app/components/editorAssetGalleryPanel.tsx`
  - Add batch selection toolbar
  - Add theme/style pickers for batch actions

- `app/components/editor/AssetGallery/AssetPackSelector.tsx`
  - Update style selector to be dynamic
  - Add theme selector

### 6. Default Values

```typescript
const DEFAULT_THEMES = [
  'Dark fantasy medieval castle',
  'Bright cartoon forest',
  'Sci-fi space station',
  'Cozy cottage interior',
];

const DEFAULT_STYLES = [
  'pixel',
  'cartoon',
  '3d',
  'flat',
];
```

### 7. User Workflow

```
Normal Mode:
  - Click template → view asset details
  - Click pack → see assets
  - Click "Manage" → manage packs

Selection Mode (toggle):
  - Checkboxes appear on each template
  - "Select All" / "Clear" buttons
  - "Regenerate Selected (N)" button appears
  - Theme picker + Style picker dropdown
  - Apply to selected templates

Asset Viewer (per template):
  - Show image with touch-down toggle (silhouette ↔ generated)
  - Tab bar: Silhouette | Generated | No Background
  - Info button: show prompt, style, date
  - Regenerate button: single regenerate with options
```

### 8. API Changes

Old:
```typescript
createGenerationJob({
  gameId,
  packId,
  templateIds: string[],
  promptDefaults: { themePrompt, styleOverride, ... }
})
```

New:
```typescript
regenerateAssets({
  packId,
  templateIds: string[],  // 1 to n, can be all
  themeOverride?: string,  // optional new theme
  styleOverride?: string,  // optional new style
  customPrompts?: Record<string, string>,  // per-template override
}) -> { jobId, taskCount }
```

### 9. Implementation Order

1. Update shared types (SpriteStyle + defaults)
2. Add `regenerateAssets` tRPC mutation
3. Add frontend hooks for batch operations
4. Update TemplateAssetCard with selection + viewer
5. Update TemplateGrid with selection mode
6. Update AssetGalleryPanel with batch toolbar
7. Update AssetPackSelector with dynamic selectors

### 10. Status
- [ ] Update shared types
- [ ] Add regenerateAssets API
- [ ] Add frontend hooks
- [ ] Update TemplateAssetCard
- [ ] Update TemplateGrid  
- [ ] Update AssetGalleryPanel
- [ ] Update AssetPackSelector
- [ ] Test all flows
