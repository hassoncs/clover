# Implementation Progress

## Changes Made

### Phase 1: Shared Types Update
- [ ] Change `SpriteStyle` from enum to string type
- [ ] Add `DEFAULT_THEMES` constant
- [ ] Add `DEFAULT_STYLES` constant  
- [ ] Update all type references

### Phase 2: Backend API Update  
- [ ] Add `regenerateAssets` tRPC mutation (batch endpoint)
- [ ] Update `createGenerationJob` to accept optional overrides
- [ ] Support per-template custom prompts

### Phase 3: Frontend Hooks
- [ ] Add `useRegenerateAssets` hook (batch)
- [ ] Add `useApplyThemeToPack` hook
- [ ] Add `useApplyStyleToPack` hook

### Phase 4: TemplateAssetCard Update
- [ ] Add selection checkbox
- [ ] Add asset viewer modal with touch toggle
- [ ] Show silhouette/generated/bg-removed versions
- [ ] Add single regenerate button

### Phase 5: TemplateGrid Update
- [ ] Add selection mode toggle
- [ ] Multi-select checkboxes
- [ ] "Select All" / "Clear" buttons

### Phase 6: AssetGalleryPanel Update
- [ ] Add batch selection toolbar
- [ ] Theme picker + Style picker dropdowns
- [ ] "Regenerate Selected" button

### Phase 7: AssetPackSelector Update
- [ ] Dynamic style selector (with defaults + custom)
- [ ] Theme selector (with defaults + custom)

## Default Values

```typescript
export const DEFAULT_THEMES = [
  'Dark fantasy medieval castle',
  'Bright cartoon forest', 
  'Sci-fi space station',
  'Cozy cottage interior',
] as const;

export const DEFAULT_STYLES = [
  'pixel',
  'cartoon',
  '3d',
  'flat',
] as const;
```

## API Design

### New `regenerateAssets` Mutation

```typescript
regenerateAssets: protectedProcedure
  .input(z.object({
    packId: z.string(),
    templateIds: z.array(z.string()).min(1),  // 1 to n templates
    newTheme: z.string().optional(),
    newStyle: z.string().optional(),
    customPrompts: z.record(z.string()).optional(),  // templateId -> prompt
  }))
  .mutation(async ({ ctx, input }) => {
    // Creates job with specified templates, applying overrides
    // Returns { jobId, taskCount }
  })
```

## UI Mockups

### Batch Selection Toolbar
```
[ ] Select All  [ ] Clear
──────────────────────────────
Theme: [Dark fantasy v] Style: [pixel v]
[Regenerate Selected (3)]      
```

### Asset Viewer Modal
```
┌────────────────────────────┐
│  [Tab: Silhouette|Gen|NoBG]│
│                            │
│    [   TOUCH TOGGLE    ]   │
│   (hold: silhouette,      │
│    release: generated)     │
│                            │
│  Prompt: "A brave knight..."│
│  Style: pixel  Date: today │
│                            │
│  [Regenerate] [Close]      │
└────────────────────────────┘
```

## Files to Modify

1. `shared/src/types/asset-system.ts`
2. `shared/src/types/schemas.ts`
3. `api/src/trpc/routes/asset-system.ts`
4. `app/components/editor/AssetGallery/useAssetGeneration.ts`
5. `app/components/editor/AssetGallery/TemplateAssetCard.tsx`
6. `app/components/editor/AssetGallery/TemplateGrid.tsx`
7. `app/components/editor/AssetGallery/AssetGalleryPanel.tsx`
8. `app/components/editor/AssetGallery/AssetPackSelector.tsx`
9. `app/components/editor/AssetGallery/AssetViewerModal.tsx` (NEW)
