# SpriteStyle Removal Plan

> **Status:** Ready to implement  
> **Created:** 2025-02-05  
> **Scope:** Remove the `SpriteStyle` type and all associated style-selection logic from the codebase. Style information moves into theme `prompt_modifier` instead.  
> **Depends on:** None (can be done before or after asset-pack-restructure)

---

## Problem Statement

`SpriteStyle` (`'pixel' | 'cartoon' | '3d' | 'flat'`) was an early mechanism to control visual style during AI asset generation. It's now redundant:

1. **Themes replace styles**: Each theme has a `prompt_modifier` that encodes all visual style information (e.g., "pixel art retro 16-bit" or "3D low-poly stylized")
2. **Style ≠ model selection**: The `MODEL_MATRIX` that mapped `entityType:style:animated` → Scenario model ID is no longer meaningful — we use Modal/ComfyUI with a single pipeline, not per-style Scenario models
3. **Dead UI surface**: The style picker in the frontend and CLI `--style` flag add config knobs that don't improve output
4. **Scattered complexity**: `SpriteStyle` appears in 10 files across 4 packages, touching types, schemas, routes, CLI, and tests

## Target State

- **No `SpriteStyle` type** anywhere in the codebase
- **No `STYLE_DESCRIPTORS`** lookup tables
- **No `MODEL_MATRIX`** — model selection becomes a simple constant or provider-level default
- **`buildStructuredPrompt`** gets style context from `themePrompt` parameter (already exists), not a separate `style` param
- **`buildStructuredNegativePrompt`** → `buildNegativePrompt()` returns a generic negative prompt without style-specific branches
- **`selectModel`** → simplified to `entityType` + `animated` only, or removed entirely if only one model pipeline is used

---

## Complete Reference Map (34 matches, 10 files)

### Tier 1: Type Definitions + Core Logic

| File | Lines | What to change |
|------|-------|---------------|
| `api/src/ai/pipeline/types.ts` | L20, L24–41, L285, L353 | Remove `SpriteStyle` type, `STYLE_DESCRIPTORS` const, `style` field from `GameAssetConfig` and `AssetRun.meta` |
| `api/src/ai/assets.ts` | L69, L81, L101–115, L119–136, L466, L485, L681 | Remove `SpriteStyle` from `AssetGenerationRequest`, `DirectGenerationRequest`, `StructuredPromptParams`; remove `STYLE_DESCRIPTORS`, `MODEL_MATRIX`; refactor `buildStructuredPrompt`, `buildStructuredNegativePrompt`, `selectModel` |

### Tier 2: Pipeline Consumers

| File | Lines | What to change |
|------|-------|---------------|
| `api/src/ai/pipeline/prompt-builder.ts` | L1, L6, L81, L184–191, L195 | Remove `SpriteStyle` from imports and all function signatures: `buildEntityPrompt`, `buildSheetEntryPrompt`, `buildNegativePrompt`, `buildPromptForSpec` |
| `api/src/ai/pipeline/executor.ts` | L9, L38 | Remove `SpriteStyle` from import and `executeAsset` meta parameter |

### Tier 3: Schemas

| File | Lines | What to change |
|------|-------|---------------|
| `api/src/ai/schemas.ts` | L476, L482, L539 | Remove `SpriteStyleSchema`, remove `style` from `AssetPackSchema` and `TileSheetSchema` |
| `shared/src/types/schemas.ts` | L702, L898 | Remove `SpriteStyleSchema`, remove `style` from `TileSheetConfigSchema` |

### Tier 4: Routes

| File | Lines | What to change |
|------|-------|---------------|
| `api/src/trpc/routes/asset-system.ts` | L9, L727, L910, L998, L1494, L1945 | Remove `SpriteStyle` import; remove all `as SpriteStyle` casts; remove `style` from `buildStructuredPrompt` calls and `generateDirect` calls |
| `api/src/trpc/routes/tiles.ts` | L8, L18 | Remove `SpriteStyleSchema` import; remove `style` from `generateSheet` input |

### Tier 5: CLI + Frontend

| File | Lines | What to change |
|------|-------|---------------|
| `api/scripts/theme-game.ts` | L45–48, L195 | Remove `--style` CLI option; remove `style` from API input |
| `api/src/cli/generate-ui.ts` | L7, L106 | Remove `SpriteStyle` import; remove `style: 'flat' as SpriteStyle` from `run.meta` |

### Tier 6: Exports + Tests

| File | Lines | What to change |
|------|-------|---------------|
| `api/src/ai/index.ts` | L53 | Remove `type SpriteStyle` from re-exports |
| `api/src/ai/__tests__/asset-service.test.ts` | L111, L124, L141–142, L156, L171, L185–186 | Remove `style` from all `buildStructuredPrompt` calls and `generateAsset`/`generateBatch` requests |
| `api/src/ai/__tests__/scenario-integration.test.ts` | L114–125, L149, L164–165, L176–177 | Remove `style` from `selectModel` test cases, `buildStructuredPrompt` calls, and `generateAsset` requests |

### Not affected (false positive)

| File | Notes |
|------|-------|
| `app/components/editor/AssetGallery/useAssetGeneration.ts` | No `SpriteStyle` references — only uses `useAssetGeneration` hook name which is unrelated |

---

## Implementation Order

### Phase 1: Core types (types.ts + assets.ts)

**`api/src/ai/pipeline/types.ts`**
1. Delete `SpriteStyle` type definition (L20)
2. Delete `STYLE_DESCRIPTORS` const (L24–41)
3. Remove `style: SpriteStyle` from `GameAssetConfig` (L285)
4. Remove `style: SpriteStyle` from `AssetRun.meta` (L353)

**`api/src/ai/assets.ts`**
1. Remove `style: SpriteStyle` from `StructuredPromptParams` (implicit — used in `buildStructuredPrompt`)
2. Remove `style: SpriteStyle` from `AssetGenerationRequest` (L69)
3. Remove `style: SpriteStyle` from `DirectGenerationRequest` (L81)
4. Delete `MODEL_MATRIX` (L101–115) — replace `selectModel` with a simple default or remove entirely
5. Delete `STYLE_DESCRIPTORS` (L119–136)
6. Refactor `buildStructuredPrompt`: remove `style` param, remove `=== STYLE ===` section. The `themePrompt` param already carries style context.
7. Refactor `buildStructuredNegativePrompt(style)` → `buildNegativePrompt()`: return generic negatives without style-specific branches
8. Simplify or remove `selectModel(entityType, style, animated)` — if only one pipeline, just return a constant

### Phase 2: Pipeline consumers (prompt-builder.ts + executor.ts)

**`api/src/ai/pipeline/prompt-builder.ts`**
1. Remove `SpriteStyle` from imports (L1)
2. Remove `STYLE_DESCRIPTORS` import (L2)
3. `buildEntityPrompt(spec, theme, style)` → `buildEntityPrompt(spec, theme)`: remove `STYLE_DESCRIPTORS[style]` lookup, theme already describes the style
4. `buildSheetEntryPrompt({..., style})` → remove `style` param, remove `STYLE_DESCRIPTORS[style]` lookup (L81–125)
5. `buildNegativePrompt(style)` → `buildNegativePrompt()`: generic negatives (L184–192)
6. `buildPromptForSpec(spec, theme, style)` → `buildPromptForSpec(spec, theme)` (L195)

**`api/src/ai/pipeline/executor.ts`**
1. Remove `SpriteStyle` from imports (L9)
2. Remove `style: SpriteStyle` from `executeAsset` meta param (L38)
3. Remove `style` from the `meta` spread into `AssetRun` (L52)
4. Remove `style` from `executeGameAssets` meta construction (L192)

### Phase 3: Schemas

**`api/src/ai/schemas.ts`**
1. Delete `SpriteStyleSchema` (L476)
2. Remove `style: SpriteStyleSchema.optional()` from `AssetPackSchema` (L482)
3. Remove `style: SpriteStyleSchema.optional()` from `TileSheetSchema` (L539)

**`shared/src/types/schemas.ts`**
1. Delete `SpriteStyleSchema` (L702)
2. Remove `style: SpriteStyleSchema.optional()` from `TileSheetConfigSchema` (L898)

### Phase 4: Routes

**`api/src/trpc/routes/asset-system.ts`** (6 sites)
1. Remove `type SpriteStyle` from imports (L9)
2. L727: Remove `styleOverride` variable and `style` from `buildStructuredPrompt` call
3. L910: Remove `styleOverride` variable and `style` from `buildStructuredPrompt` call
4. L998: Remove `style = (jobRow.style ?? 'pixel') as SpriteStyle` — `generateDirect` no longer needs `style`
5. L1494: Remove `styleOverride` variable and `style` from `buildStructuredPrompt` call
6. L1945: Remove `const style: SpriteStyle = 'pixel'` and `style` from `buildStructuredPrompt` call

**`api/src/trpc/routes/tiles.ts`**
1. Remove `SpriteStyleSchema` from imports (L8)
2. Remove `style: SpriteStyleSchema.default('pixel')` from `generateSheet` input (L18)

### Phase 5: CLI + Frontend

**`api/scripts/theme-game.ts`**
1. Remove `--style` option (L45–48)
2. Remove `style: argv.style` from input object (L195)

**`api/src/cli/generate-ui.ts`**
1. Remove `SpriteStyle` from import (L7)
2. Remove `style: 'flat' as SpriteStyle` from `run.meta` (L106) — remove the field entirely

### Phase 6: Exports + Tests

**`api/src/ai/index.ts`**
1. Remove `type SpriteStyle` from the re-export block (L53)

**`api/src/ai/__tests__/asset-service.test.ts`**
1. Remove `style: 'pixel'` from all `buildStructuredPrompt` calls
2. Remove `style: 'pixel'` from all `generateAsset` / `generateBatch` calls
3. Remove `selectModel` tests entirely (or update to new signature)

**`api/src/ai/__tests__/scenario-integration.test.ts`**
1. Remove `style` field from `selectModel` test cases (L114–125)
2. Remove `style: 'pixel'` from `buildStructuredPrompt` call (L149)
3. Remove `style: 'pixel'` from `generateAsset` calls (L164, L176)

---

## Verification Checklist

- [ ] `grep -r 'SpriteStyle' --include='*.ts'` returns zero results
- [ ] `grep -r 'STYLE_DESCRIPTORS' --include='*.ts'` returns zero results
- [ ] `grep -r 'MODEL_MATRIX' --include='*.ts'` returns zero results
- [ ] `grep -r 'SpriteStyleSchema' --include='*.ts'` returns zero results
- [ ] `pnpm tsc --noEmit` passes across monorepo
- [ ] `pnpm --filter @slopcade/api test` passes
- [ ] `pnpm --filter @slopcade/games build` succeeds
- [ ] `buildStructuredPrompt` works with `themePrompt` only (no `style`)
- [ ] `buildNegativePrompt()` returns sensible generic negatives

---

## Key Design Decisions

1. **Theme replaces style**: `themePrompt` / `prompt_modifier` already carries all visual style info. No separate enum needed.
2. **Generic negative prompt**: Instead of style-specific negatives, use one universal set of negatives that works for all generation.
3. **Model selection**: With Modal/ComfyUI as the primary pipeline, model selection is provider-level, not style-level. `selectModel` can be simplified or removed.
4. **No migration needed**: `SpriteStyle` only existed in code, not in persisted user data. The DB `generation_jobs.style` column can be left as-is (nullable, unused).
