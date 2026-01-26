# Godot UI Theming Plan - Round 3 Fixes

## Fix 1: TabBar Base State (RESOLVED)

**Decision**: `unselected` is the base state for TabBar.

**Rationale**: Most tabs in a TabBar are unselected by default. One tab is selected at a time.

**Implementation**:
- Base state: `unselected` (generated first at img2img strength 0.95)
- Variations: `selected`, `hover` (generated from `unselected` at strength 0.7)

**Pipeline Logic**:
```typescript
// In uiBaseStateStage
const baseState = spec.componentType === 'tab_bar' ? 'unselected' : 'normal';
```

---

## Fix 2: Complete Type Examples (RESOLVED)

All `executeGameAssets` and `UIComponentSheetSpec` examples now include ALL required fields:

```typescript
// Complete GameAssetConfig example
const config: GameAssetConfig = {
  gameId: 'test-ui-controls',
  gameTitle: 'UI Control Test',
  theme: 'medieval fantasy',
  style: 'pixel',
  r2Prefix: 'generated/test-ui-controls',
  localOutputDir: 'api/debug-output/test-ui-controls',
  assets: [
    {
      type: 'sheet',
      kind: 'ui_component',
      id: 'panel-test',
      componentType: 'panel',
      states: ['normal'],
      ninePatchMargins: { left: 16, right: 16, top: 16, bottom: 16 },
      width: 256,
      height: 256,
      layout: { type: 'manual' },  // Required from SheetSpecBase
      promptConfig: {
        basePrompt: 'Decorative panel frame with hollow center',
        commonModifiers: ['Transparent background', 'Nine-patch ready']
      }
    }
  ]
};
```

---

## Fix 3: Pipeline Adapter Wiring (DEFERRED)

**Status**: Mark as implementation detail.

**Note in Plan**: "Pipeline adapter creation (`createNodeAdapters` or equivalent for Cloudflare Workers) is an implementation detail to be resolved during coding. The plan assumes standard `PipelineAdapters` interface is available."

**Reference**: `api/src/ai/pipeline/adapters/node.ts` shows pattern for Node.js runtime. Workers runtime will need equivalent.

---

## Fix 4: Correct Stage/Symbol Names (RESOLVED)

### Current (in repo) → Plan Must Use

| Plan Used (WRONG) | Actual in Repo (CORRECT) |
|-------------------|-------------------------|
| `baseStateGenerationStage` | `uiBaseStateStage` |
| `variationStateGenerationStage` | `uiVariationStatesStage` |
| `buildUIMetadataStage` | `uiUploadR2Stage` (includes metadata) |
| `createNinePatchSilhouette` | ✅ Correct (exists) |

### Godot Bridge Names

| Plan Used | Actual in Repo |
|-----------|----------------|
| `_ui_controls` | `_ui_buttons` |
| `_game_root` | Uses `_get_or_create_ui_layer()` |
| `createUIPanel` | Pattern: `_js_create_ui_XXX` + `create_ui_XXX` |

**Fix**: Update Task 8 and Task 10 to reference actual exported symbols.

---

## Fix 5: State Type Propagation (RESOLVED)

### Files That Need State Union Expansion

All files that reference `'normal' | 'hover' | 'pressed' | 'disabled' | 'focus'`:

1. ✅ **`api/src/ai/pipeline/types.ts`**
   - `UIComponentSheetSpec.states` array type
   
2. ✅ **`api/src/ai/pipeline/prompt-builder.ts`**
   - `UIComponentPromptParams.state` parameter type
   - `stateDescriptions` object keys
   
3. ✅ **`api/src/ai/pipeline/stages/ui-component.ts`**
   - Remove hardcoded `'normal'` assumption
   - Use control-specific base state lookup

### New Type Definition (ALL files)
```typescript
type UIComponentState = 'normal' | 'hover' | 'pressed' | 'disabled' | 'focus' | 'selected' | 'unselected';
```

**Task 1 MUST**:
- Define `UIComponentState` type in `api/src/ai/pipeline/types.ts`
- Update all 3 files above to use this type
- Document base state per control type

---

## Fix 6: Type Organization (RESOLVED)

**Instruction**: Types should go in **shared** package for cross-platform use, NOT all in one file.

### Recommended Structure
```
shared/src/types/
  ui-components.ts          ← New: UI component types
  ui-component-config.ts    ← New: Control configs, margins, states
```

**Do NOT**:
- Put everything in `api/src/ai/pipeline/types.ts` (API-specific)
- Create one giant types file

**Task 1/2 Adjustment**: Create types in `shared/src/types/` and import in API pipeline.

---

## Fix 7: Existing Type Reality (RESOLVED)

### What's Already in `api/src/ai/pipeline/types.ts`

**Already Present**:
- `componentType: 'panel' | 'progress_bar' | ...` (more types than discussed)
- `UIComponentSheetSpec` interface

**Task 1 Changes**:
- ✅ Add NEW types: `scroll_bar_h`, `scroll_bar_v`, `tab_bar`
- ✅ Expand state union: Add `selected`, `unselected`
- ❌ Don't recreate what exists

**Explicit Task 1 Checklist**:
```typescript
// ADD these component types (not already present)
type UIComponentType = 
  | 'button'           // ✅ exists
  | 'checkbox'         // ✅ exists
  | 'panel'            // ✅ exists
  | 'progress_bar'     // ✅ exists
  | 'scroll_bar_h'     // 🆕 ADD
  | 'scroll_bar_v'     // 🆕 ADD
  | 'tab_bar';         // 🆕 ADD

// EXPAND state union (add selected/unselected)
type UIComponentState = 
  | 'normal'           // ✅ exists
  | 'hover'            // ✅ exists
  | 'pressed'          // ✅ exists
  | 'disabled'         // ✅ exists
  | 'focus'            // ✅ exists
  | 'selected'         // 🆕 ADD
  | 'unselected';      // 🆕 ADD
```

---

## Summary of Changes

| Fix | Status | Action |
|-----|--------|--------|
| 1. TabBar base state | ✅ Resolved | Use `unselected` as base |
| 2. Type examples complete | ✅ Resolved | Add all required fields |
| 3. Pipeline adapters | ⏸️ Deferred | Implementation detail |
| 4. Correct stage names | ✅ Resolved | Use `uiBaseStateStage`, etc. |
| 5. State propagation | ✅ Resolved | Update 3 files |
| 6. Type organization | ✅ Resolved | Use shared/src/types/ |
| 7. Existing types | ✅ Resolved | Only add NEW types |

These fixes make the plan match repository reality and resolve all Momus critical issues.

