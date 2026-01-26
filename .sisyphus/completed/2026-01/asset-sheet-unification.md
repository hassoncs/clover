# Asset Sheet System Unification Plan

> Complete refactoring of asset sheet types, pipeline output, and runtime consumption.
> No backwards compatibility - clean break for future-proof design.

## Goals

1. **Single Source of Truth**: One canonical `AssetSheetMetadata` type in `shared/`
2. **Clean Pipeline Output**: Pipeline produces exactly what runtime consumes
3. **Deterministic Match-3**: `order` array enables `pieceType` → `variantId` mapping
4. **No Duplication**: Remove redundant types from `api/src/ai/pipeline/types.ts`
5. **Shared Utilities**: Region calculation lives in `shared/`, not scattered

---

## Phase 1: Canonical Schema (shared/)

### File: `shared/src/types/asset-sheet.ts`

**Changes:**
- [ ] Simplify `SheetRegion` to always be `rect` at runtime (no gridIndex)
- [ ] Add `order?: string[]` to `VariationGroup` for deterministic selection
- [ ] Ensure `entries` is `Record<string, AssetSheetEntry>` (not array)
- [ ] Add `image: { url, width, height }` to base (replace imageUrl/imageWidth/imageHeight)
- [ ] Remove overly complex fields that aren't used

**Target Schema:**
```typescript
export interface AssetSheetMetadata {
  id: string;
  kind: 'sprite' | 'tile' | 'variation';
  source: 'generated' | 'uploaded';
  image: { url: string; width: number; height: number };
  layout: SheetLayout;
  entries: Record<string, AssetSheetEntry>;
  
  // Variation-specific
  groups?: Record<string, VariationGroup>;
  defaultGroupId?: string;
  
  // Sprite-specific
  animations?: Record<string, SheetAnimation>;
  
  // Tile-specific
  tiles?: Record<number, TileMetadata>;
}

export interface AssetSheetEntry {
  id: string;
  region: { x: number; y: number; w: number; h: number };
  pivot?: { x: number; y: number };
}

export interface VariationGroup {
  id: string;
  variants: Record<string, VariationVariant>;
  order?: string[];  // For deterministic index → variantId mapping
}

export interface VariationVariant {
  id: string;
  entryId: string;
  weight?: number;
}
```

---

## Phase 2: Pipeline Output (api/)

### File: `api/src/ai/pipeline/stages/index.ts`

**Changes:**
- [ ] Update `buildSheetMetadataStage` to output canonical format
- [ ] Convert `entries` array → `Record<string, Entry>` using variant keys as IDs
- [ ] Normalize region keys: `width/height` → `w/h`
- [ ] Build `groups.default` with `variants` and `order` array
- [ ] Add `image.url` (from R2 upload path)

### File: `api/src/ai/pipeline/types.ts`

**Changes:**
- [ ] Remove duplicated sheet types (import from shared instead)
- [ ] Keep only pipeline-specific types (specs for input, not output)
- [ ] `VariationSheetSpec.variants` stays as input format

---

## Phase 3: Runtime Utilities (app/)

### File: `app/lib/game-engine/hooks/useVariantResolution.ts`

**Changes:**
- [ ] Update `selectVariant()` to support deterministic selection via `order`
- [ ] Add `selectVariantByIndex(sheet, groupId, index)` helper
- [ ] Remove weighted random as default (only when no `order` and no explicit key)

### File: `app/lib/game-engine/systems/Match3GameSystem.ts`

**Changes:**
- [ ] Remove private `getRegionRect()` - use shared utility
- [ ] Use `selectVariantByIndex()` with `pieceType` as index
- [ ] Import `getEntryRegionRect` from shared

### File: `shared/src/types/asset-sheet.ts` (utilities)

**Add:**
- [ ] `getRegionRect(entry, layout)` - returns `{ x, y, w, h }`
- [ ] Already has `getEntryRegionRect` - ensure it's exported and used

---

## Phase 4: Game Configs

### File: `app/lib/test-games/games/candyCrush.ts`

**Changes:**
- [ ] Enable `variantSheet.enabled = true`
- [ ] Set `atlasUrl` to generated gem variants URL
- [ ] Set `groupId = "default"`
- [ ] Map pieceTemplates to variant order: `["red", "blue", "green", "yellow", "purple"]`

### File: `api/scripts/game-configs/test-gem-variants.ts`

**Changes:**
- [ ] Ensure variants array order matches candy crush piece order
- [ ] Keep as test config for generation

---

## Phase 5: Verification

- [ ] Generate gem variants sheet
- [ ] Verify metadata JSON matches canonical schema
- [ ] Run candy crush game
- [ ] Verify gems render from atlas (not colored circles)
- [ ] Verify piece types map correctly (red=0, blue=1, etc)
- [ ] Run TypeScript build - no errors
- [ ] Run tests - all pass

---

## Files to Modify

| File | Changes |
|------|---------|
| `shared/src/types/asset-sheet.ts` | Canonical schema + utilities |
| `api/src/ai/pipeline/types.ts` | Remove duplicates, import from shared |
| `api/src/ai/pipeline/stages/index.ts` | buildSheetMetadataStage output format |
| `app/lib/game-engine/hooks/useVariantResolution.ts` | selectVariantByIndex |
| `app/lib/game-engine/systems/Match3GameSystem.ts` | Use shared utils |
| `app/lib/test-games/games/candyCrush.ts` | Enable variant sheet |

---

## Execution Order

1. **shared/types** first (foundation)
2. **pipeline/stages** second (produces correct format)
3. **runtime/utils** third (consumes correctly)
4. **games** fourth (wire it up)
5. **verify** fifth (test everything)
