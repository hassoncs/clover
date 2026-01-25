# UI Component Generation System

## Context

### Original Request
User wants to generate graphically-themed UI component libraries for games. The vision: users describe a theme (space, fantasy, etc.), and the system generates complete UI sets (buttons, checkboxes, sliders, panels, etc.) that match the game's aesthetic.

### Interview Summary
**Key Discussions**:
- **Component Set**: Full set including Button, Checkbox, Radio, Slider, Panel, Progress Bar, List Item, Dropdown, Toggle Switch
- **POC Component**: CheckBox - most complex (background states + icon overlay + nine-patch)
- **Text Handling**: Nine-patch backgrounds with Godot-rendered text (not baked-in)
- **States**: Support all pseudo-states (normal, hover, pressed, disabled, focus) - system must support them, not every component needs all
- **Nine-Patch Margins**: Constants in code (8px/12px/16px), easily tweakable, not user-configurable for POC
- **State Generation**: Sequential (base + variations) - generate normal first, then reference it for other states
- **Theme Input**: Flexible - support both simple string and structured object
- **Texture Resolution**: Configurable with 256x256 default
- **Development**: No validation spike - build full pipeline directly with checkpoint tasks

**Research Findings**:
- Existing `VariationSheetSpec` can be adapted for UI components
- Godot has `StyleBoxTexture` for nine-patch + state theming
- Current pipeline: silhouette → img2img → bg removal → R2 storage
- `UIManager.gd` already exists in Godot project

### Metis Review
**Identified Gaps** (addressed):
- Nine-patch margin selection strategy: Constants per component type (configurable)
- CheckBox icon strategy: Overlay approach (backgrounds only, vector checkmark in Godot)
- State consistency: Sequential generation with base reference
- Theme format: Simple string for POC, designed for structured object support
- Component dimensions: 256x256 default, configurable
- Validation spike: Skip for speed, early tasks serve as checkpoints

---

## Work Objectives

### Core Objective
Build an end-to-end UI component generation system that creates themed, nine-patch UI components for game menus using the existing asset generation pipeline.

### Concrete Deliverables
1. **Type System** (`api/src/ai/pipeline/types.ts`):
   - `UIComponentSheetSpec` interface
   - `'ui_component'` added to `SheetKind`
   - Component type enum (button, checkbox, slider, panel, etc.)

2. **Silhouette Generator** (`api/src/ai/pipeline/silhouettes/ui-component.ts`):
   - `createNinePatchSilhouette()` function
   - Margin-guided silhouettes (darker borders, lighter center)
   - Configurable resolution (default 256x256)

3. **Prompt Builder** (`api/src/ai/pipeline/prompt-builder.ts`):
   - `buildUIComponentPrompt()` function
   - State-specific variations (normal vs pressed descriptions)
   - Nine-patch-aware prompts (emphasize borders)

4. **Pipeline Stages** (`api/src/ai/pipeline/stages/ui-component.ts`):
   - Base state generation stage
   - Variation state generation stage (references base)
   - Metadata builder (nine-patch margins, state mapping)

5. **Godot Component** (`godot_project/scripts/ui/ThemedCheckbox.gd`):
   - Standalone class wrapping Godot's `CheckBox`
   - Loads textures from URL
   - Applies `StyleBoxTexture` with nine-patch margins
   - State handling (normal/hover/pressed/disabled)
   - Overlay checkmark icon

6. **tRPC Route** (`api/src/trpc/routes/ui-components.ts`):
   - `generateUIComponent` mutation
   - Theme input validation (string or structured object)
   - Component type selection

7. **Database Schema** (`api/schema.sql`):
   - Extend `asset_packs` or create `ui_component_packs`
   - Metadata columns: `component_type`, `nine_patch_margins_json`, `generation_strategy`

8. **Test Scene** (`godot_project/scenes/test_ui_components.tscn`):
   - Showcase scene with all checkbox states
   - Manual QA verification

### Definition of Done
- [ ] Generate themed checkbox with 4 states (normal, hover, pressed, disabled) from theme prompt
- [ ] Checkbox backgrounds have correct nine-patch margins and stretch properly at different sizes
- [ ] Godot `ThemedCheckbox` component displays correct state on interaction
- [ ] Checkmark overlay displays correctly (simple vector)
- [ ] Generation completes in <60 seconds per component
- [ ] Manual QA: checkbox looks "themed" and visually consistent across states
- [ ] All changes verified with `tsc --noEmit` (zero TypeScript errors)

### Must Have
- Nine-patch background generation with margin-guided silhouettes
- Sequential state generation (base → variations)
- Godot nine-patch rendering via `StyleBoxTexture`
- Theme-to-prompt translation
- R2 storage integration
- Metadata storage (margins, state mapping)
- Manual QA test scene

### Must NOT Have (Guardrails)
**POC Scope Boundaries**:
- ❌ Other component types besides CheckBox (Button, Slider, etc.)
- ❌ Theme persistence/saving UI
- ❌ Regeneration UI workflow
- ❌ Animated state transitions
- ❌ Multiple checkbox styles per theme
- ❌ Generated checkmark icons (use vector overlay only)
- ❌ Accessibility features (ARIA, screen reader support)
- ❌ User-configurable margins (code constants only)
- ❌ Validation spike (build pipeline directly)

**AI-Slop Patterns to Avoid**:
- ❌ Over-abstraction: No `ThemeEngine` with plugin system until 3+ components work
- ❌ Scope inflation: States are static textures - no animations
- ❌ Premature optimization: No caching layer for POC
- ❌ Feature creep: Theme is a text prompt - no theme editing UI
- ❌ Over-engineering: Godot handles state transitions - we just provide textures

---

## Verification Strategy

### Manual QA with Screenshots

Each task includes detailed manual verification procedures.

**By Deliverable Type**:

| Type | Verification Tool | Procedure |
|------|------------------|-----------|
| **TypeScript Types** | tsc --noEmit | Compile check, zero errors |
| **Image Generation** | Local file inspection | Visual check of silhouettes, prompts, generated images |
| **API/tRPC** | curl / Postman | Send generation request, verify response |
| **Godot Component** | Godot editor + runtime | Load scene, interact with checkbox, verify states |
| **Database** | D1 console / SQL query | Verify metadata stored correctly |

**Evidence Required**:
- Screenshots of generated checkboxes in all states
- Screenshot of Godot test scene with interactive checkbox
- Terminal output of successful generation
- Database query showing stored metadata

---

## Task Flow

```
Phase 1: Type System & Data Model
  Task 1 (Types) → Task 2 (Schema)

Phase 2: Silhouette & Prompt System
  Task 3 (Silhouette Generator) → Task 4 (Prompt Builder)
  ↓
  Checkpoint: Generate test silhouette manually

Phase 3: Pipeline Integration
  Task 5 (Base State Stage) → Task 6 (Variation State Stage)
  ↓
  Task 7 (Metadata Builder)

Phase 4: Godot Integration
  Task 8 (ThemedCheckbox Component) → Task 9 (Test Scene)

Phase 5: API & End-to-End
  Task 10 (tRPC Route) → Task 11 (Manual QA)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 1, 2 | Independent (types vs database schema) |
| B | 3, 4 | Independent (silhouette vs prompt logic) |

| Task | Depends On | Reason |
|------|------------|--------|
| 5 | 1, 3, 4 | Needs types, silhouette generator, prompt builder |
| 6 | 5 | Must reference base state from Task 5 |
| 7 | 6 | Builds metadata from generated states |
| 8 | 1 | Needs type definitions |
| 9 | 8 | Needs ThemedCheckbox component |
| 10 | 1, 5, 6, 7 | Orchestrates entire pipeline |
| 11 | All | Final verification |

---

## TODOs

- [x] 1. Define UI Component Type System

  **What to do**:
  - Add `'ui_component'` to `SheetKind` enum in `api/src/ai/pipeline/types.ts`
  - Create `UIComponentSheetSpec` interface extending `SheetSpecBase`:
    ```typescript
    export interface UIComponentSheetSpec extends SheetSpecBase {
      kind: 'ui_component';
      componentType: 'button' | 'checkbox' | 'radio' | 'slider' | 'panel' | 'progress_bar' | 'list_item' | 'dropdown' | 'toggle_switch';
      states: Array<'normal' | 'hover' | 'pressed' | 'disabled' | 'focus'>;
      ninePatchMargins: { left: number; right: number; top: number; bottom: number };
      baseResolution?: number; // default 256
      iconStrategy?: 'separate' | 'composite' | 'overlay' | 'none'; // for future
    }
    ```
  - Update `AssetSpec` union type to include `UIComponentSheetSpec`
  - Add type guards: `isUIComponentSpec(spec)`

  **Must NOT do**:
  - Don't modify existing `VariationSheetSpec` - create new type
  - Don't add animation-related fields (static textures only)
  - Don't add theme storage fields (theme is input, not stored)

  **Parallelizable**: YES (with Task 2)

  **References**:

  **Pattern References**:
  - `api/src/ai/pipeline/types.ts:103-143` - `SheetSpecBase` and existing sheet specs (SpriteSheetSpec, TileSheetSpec, VariationSheetSpec) - follow this pattern for UIComponentSheetSpec
  - `api/src/ai/pipeline/types.ts:145` - AssetSpec union type - add UIComponentSheetSpec here

  **Type References**:
  - `api/src/ai/pipeline/types.ts:103` - `SheetKind = 'sprite' | 'tile' | 'variation'` - add 'ui_component'
  - `api/src/ai/pipeline/types.ts:105-108` - SheetLayout type - UI components will use fixed layout (256x256 per state)

  **External References**:
  - Nine-patch margin structure based on Godot StyleBoxTexture: left/right/top/bottom in pixels

  **WHY Each Reference Matters**:
  - `SheetSpecBase` defines common fields (type, id, kind, layout, etc.) - UI components need same structure
  - Existing sheet specs show the pattern for type-specific fields
  - `AssetSpec` union type needs extension to make UIComponentSheetSpec usable in pipeline

  **Acceptance Criteria**:

  **Manual Execution Verification**:
  - [ ] TypeScript compiles without errors: `cd api && tsc --noEmit` → Exit code 0
  - [ ] Type guard works correctly:
    ```typescript
    const spec: UIComponentSheetSpec = { kind: 'ui_component', componentType: 'checkbox', ... };
    isUIComponentSpec(spec); // → true
    ```
  - [ ] AssetSpec union type includes UIComponentSheetSpec (IntelliSense shows it)

  **Evidence Required**:
  - [ ] Terminal output: `tsc --noEmit` success
  - [ ] Code snippet showing new types in `types.ts`

  **Commit**: NO (groups with Task 2)

---

- [x] 2. Extend Database Schema for UI Components

  **What to do**:
  - Decide database approach:
    - Option A: Reuse `asset_packs` with type discriminator
    - Option B: Create `ui_component_packs` table
  - Add metadata columns to appropriate table:
    - `component_type` (TEXT: 'button', 'checkbox', etc.)
    - `nine_patch_margins_json` (JSON: `{left, right, top, bottom}`)
    - `generation_strategy` (TEXT: 'sequential', for future expansion)
  - Update Drizzle schema if used
  - Migration SQL file: `api/migrations/YYYYMMDD_ui_components.sql`

  **Must NOT do**:
  - Don't create separate tables for each component type (one schema for all)
  - Don't add theme storage columns (theme is generation input)
  - Don't add user-configurable margin columns (constants for POC)

  **Parallelizable**: YES (with Task 1)

  **References**:

  **Pattern References**:
  - `api/schema.sql` - Current database schema - find asset_packs and asset_pack_entries tables to understand existing structure
  - `shared/src/types/asset-system.ts:49-57` - AssetPackV2 interface - see how promptDefaults are stored in JSON column

  **Database References**:
  - `api/schema.sql` - asset_packs table definition - check if we should extend this or create new table
  - `api/schema.sql` - asset_pack_entries table - see how metadata is stored in placement_json

  **WHY Each Reference Matters**:
  - Existing asset_packs table shows pattern for pack-level metadata storage
  - JSON columns pattern shows how to store structured data (margins, strategy)
  - Need to decide if UI components are a "type of asset pack" or separate entity

  **Acceptance Criteria**:

  **Manual Execution Verification**:
  - [ ] Migration runs successfully:
    ```bash
    cd api
    # Apply migration to local D1
    npx wrangler d1 execute slopcade-db-dev --local --file=migrations/YYYYMMDD_ui_components.sql
    ```
  - [ ] Expected output: Migration executed successfully
  - [ ] Verify columns exist:
    ```sql
    SELECT component_type, nine_patch_margins_json FROM asset_packs LIMIT 1;
    ```
  - [ ] Query returns columns (even if empty)

  **Evidence Required**:
  - [ ] Migration SQL file content
  - [ ] Terminal output: wrangler migration success
  - [ ] SQL query output showing new columns

  **Commit**: YES
  - Message: `feat(api): add ui component database schema`
  - Files: `api/migrations/YYYYMMDD_ui_components.sql`, `api/schema.sql`
  - Pre-commit: `cd api && tsc --noEmit`

---

- [x] 3. Create Nine-Patch Silhouette Generator

  **What to do**:
  - Create file: `api/src/ai/pipeline/silhouettes/ui-component.ts`
  - Implement `createNinePatchSilhouette(params)`:
    - Input: `{ width, height, marginSize, canvasSize? }`
    - Output: `Uint8Array` (PNG buffer)
  - Silhouette design (margin-guided):
    - Canvas: 256x256 (or configurable)
    - Outer border zone: Dark gray (#404040) - fixed corners/edges
    - Inner content zone: Medium gray (#808080) - stretchable center
    - Background: White (#FFFFFF)
  - Use `sharp` library (already in codebase) for PNG generation
  - Export constant: `UI_COMPONENT_MARGINS = { small: 8, medium: 12, large: 16 }`

  **Must NOT do**:
  - Don't use color-coding like variation sheets (this is a single component, not multiple variants)
  - Don't draw actual UI elements (just margin guides)
  - Don't add text labels or annotations

  **Parallelizable**: YES (with Task 4)

  **References**:

  **Pattern References**:
  - `api/src/ai/pipeline/stages/index.ts` - Look for `sheetGuideStage` function - shows how to use sharp to generate guide images
  - `api/src/ai/assets.ts:createSilhouettePng` - Shows silhouette generation for entities (box/circle) using sharp or custom PNG buffer

  **API/Type References**:
  - `sharp` library docs - will need: `sharp({ create: { width, height, channels: 4, background } })`
  - `api/src/ai/pipeline/types.ts:289-297` - SilhouetteAdapter interface - this is what our function will be called by

  **External References**:
  - Nine-patch structure: outer border (fixed) + inner center (stretches) - see Godot docs on StyleBoxTexture margins

  **WHY Each Reference Matters**:
  - `sheetGuideStage` shows the working sharp pipeline for creating guide images
  - `createSilhouettePng` shows the existing silhouette generation approach
  - We're creating a new TYPE of silhouette (margin-guided) that the AI will interpret differently

  **Acceptance Criteria**:

  **Manual Execution Verification**:
  - [ ] Generate test silhouette with Node script:
    ```typescript
    import { createNinePatchSilhouette } from './api/src/ai/pipeline/silhouettes/ui-component';
    import fs from 'fs';
    const buffer = await createNinePatchSilhouette({ width: 256, height: 256, marginSize: 12 });
    fs.writeFileSync('test-silhouette.png', buffer);
    ```
  - [ ] Open `test-silhouette.png` in image viewer
  - [ ] Verify:
    - Outer border is dark gray (#404040)
    - Inner center is lighter gray (#808080)
    - Dimensions are 256x256
    - File size < 5KB (simple shapes)
  - [ ] TypeScript compiles: `cd api && tsc --noEmit` → Exit code 0

  **Evidence Required**:
  - [ ] Screenshot of generated silhouette
  - [ ] Terminal output: tsc success
  - [ ] File size check: `ls -lh test-silhouette.png`

  **Commit**: NO (groups with Task 4)

---

- [x] 4. Build UI Component Prompt System

  **What to do**:
  - Add to `api/src/ai/pipeline/prompt-builder.ts`:
  - Implement `buildUIComponentPrompt(params)`:
    - Input: `{ componentType, state, theme, baseResolution }`
    - Output: `{ prompt: string, negativePrompt: string }`
  - Prompt structure (follow existing pattern from buildEntityPrompt):
    ```
    === CAMERA/VIEW ===
    FRONT VIEW. Flat UI element. No 3D perspective.

    === SHAPE ===
    Nine-patch UI component: decorative borders + stretchable center.
    Outer 12px borders are fixed (corners/edges).
    Center region stretches.

    === COMPOSITION ===
    Component fills frame with proper margin zones.
    Clear distinction between border decoration and center area.

    === SUBJECT ===
    A [checkbox/button/etc] background for a game UI.
    Theme: [user theme prompt]
    State: [normal/hover/pressed/disabled] - [state-specific description]

    === STYLE ===
    [theme-derived aesthetic]
    Clean UI design, professional.

    === TECHNICAL ===
    Transparent background (alpha channel).
    NO text, NO icons, NO labels.
    NO grid lines, NO borders around the component.
    Nine-patch ready: consistent border widths.
    ```
  - State-specific descriptions:
    - normal: "Default resting state, clean and neutral"
    - hover: "Subtle highlight, slightly brighter"
    - pressed: "Depressed appearance, darker or inset"
    - disabled: "Greyed out, visually inactive"

  **Must NOT do**:
  - Don't include text rendering instructions (Godot handles text)
  - Don't specify exact pixel measurements in prompt (AI interprets visually)
  - Don't ask for multiple states in one prompt (sequential generation)

  **Parallelizable**: YES (with Task 3)

  **References**:

  **Pattern References**:
  - `api/src/ai/pipeline/prompt-builder.ts:19-49` - `buildEntityPrompt` function - follow this exact structure (CAMERA/VIEW, SHAPE, COMPOSITION, SUBJECT, STYLE, TECHNICAL sections)
  - `api/src/ai/pipeline/prompt-builder.ts:6-17` - `describeShapeSilhouette` helper - shows how to describe shapes in prompts

  **Prompt References**:
  - `api/src/ai/pipeline/prompt-builder.ts:20-46` - Entity prompt structure - use same section headers
  - `api/src/ai/pipeline/prompt-builder.ts:161-170` - `buildNegativePrompt` function - adapt for UI components (forbid text, labels, grid lines)

  **External References**:
  - Nine-patch concept: borders vs center region - translate to natural language for AI

  **WHY Each Reference Matters**:
  - Existing prompt structure is proven to work with Scenario.com - reuse the pattern
  - Section headers (===) help AI prioritize constraints
  - Negative prompts prevent common AI mistakes (grid lines, labels, etc.)

  **Acceptance Criteria**:

  **Manual Execution Verification**:
  - [ ] Generate test prompt with Node REPL:
    ```typescript
    import { buildUIComponentPrompt } from './api/src/ai/pipeline/prompt-builder';
    const result = buildUIComponentPrompt({
      componentType: 'checkbox',
      state: 'normal',
      theme: 'medieval fantasy with stone textures',
      baseResolution: 256
    });
    console.log(result.prompt);
    console.log(result.negativePrompt);
    ```
  - [ ] Verify output contains:
    - All section headers (===)
    - Theme text appears in SUBJECT section
    - State description matches state parameter
    - Negative prompt forbids text/labels/grid lines
  - [ ] TypeScript compiles: `cd api && tsc --noEmit` → Exit code 0

  **Evidence Required**:
  - [ ] Terminal output showing generated prompt
  - [ ] Confirmation all sections present
  - [ ] tsc success

  **Commit**: YES (with Task 3)
  - Message: `feat(api): add nine-patch silhouette and prompt builders for UI components`
  - Files: `api/src/ai/pipeline/silhouettes/ui-component.ts`, `api/src/ai/pipeline/prompt-builder.ts`
  - Pre-commit: `cd api && tsc --noEmit`

---

- [x] 5. Implement Base State Generation Pipeline Stage

  **What to do**:
  - Create file: `api/src/ai/pipeline/stages/ui-component.ts`
  - Implement `baseStateGenerationStage`:
    - Input: `AssetRun<UIComponentSheetSpec>` (spec has componentType='checkbox', states=['normal', ...])
    - Steps:
      1. Call `createNinePatchSilhouette` (Task 3) with spec dimensions
      2. Upload silhouette to Scenario.com (reuse `uploadToScenarioStage` pattern)
      3. Call `buildUIComponentPrompt` (Task 4) with state='normal'
      4. Run img2img with silhouette reference (strength=0.95, like entities)
      5. Poll for job completion
      6. Download generated image
      7. Run background removal (reuse `removeBackgroundStage`)
      8. Store in artifacts: `artifacts.baseStateImage = buffer`
    - Output: Updated `AssetRun` with baseStateImage in artifacts
  - Follow existing stage pattern from `api/src/ai/pipeline/stages/index.ts`

  **Must NOT do**:
  - Don't generate multiple states in this stage (only 'normal')
  - Don't upload to R2 yet (Task 7 handles that)
  - Don't create new Scenario client (reuse from adapters)

  **Parallelizable**: NO (depends on Tasks 1, 3, 4)

  **References**:

  **Pattern References**:
  - `api/src/ai/pipeline/stages/index.ts:silhouetteStage` - Shows how to create silhouette and store in artifacts
  - `api/src/ai/pipeline/stages/index.ts:uploadToScenarioStage` - Shows how to upload PNG to Scenario.com
  - `api/src/ai/pipeline/stages/index.ts:img2imgStage` - Shows how to call img2img and poll for results
  - `api/src/ai/pipeline/stages/index.ts:removeBackgroundStage` - Shows background removal process

  **API/Type References**:
  - `api/src/ai/pipeline/types.ts:199-214` - AssetRun interface - see how to access spec, artifacts, meta
  - `api/src/ai/pipeline/types.ts:172-193` - Artifacts interface - add baseStateImage field here
  - `api/src/ai/pipeline/types.ts:253-280` - PipelineAdapters interface - shows Scenario adapter methods

  **External References**:
  - Scenario.com img2img strength: 0.95 (from user's silhouette → sprite pattern)

  **WHY Each Reference Matters**:
  - Existing stages show the exact pattern for this pipeline (silhouette → upload → img2img → bg removal)
  - Artifacts interface needs extension to store base state image for Task 6 to reference
  - Adapters interface shows how to call Scenario.com methods

  **Acceptance Criteria**:

  **Manual Execution Verification**:
  - [ ] Create test script:
    ```typescript
    import { executeGameAssets } from './api/src/ai/pipeline';
    import { createNodeAdapters } from './api/src/ai/pipeline/adapters/node';
    const config: GameAssetConfig = {
      gameId: 'test-ui',
      assets: [{
        type: 'sheet',
        kind: 'ui_component',
        componentType: 'checkbox',
        states: ['normal'],
        ninePatchMargins: { left: 12, right: 12, top: 12, bottom: 12 }
      }]
    };
    const adapters = await createNodeAdapters({ ... });
    const result = await executeGameAssets(config, adapters);
    console.log(result);
    ```
  - [ ] Run: `npx tsx api/scripts/test-ui-generation.ts`
  - [ ] Verify:
    - No errors
    - Scenario.com API calls succeed
    - Generated image downloaded
    - Background removed
    - Image saved to artifacts
  - [ ] Check debug output: `api/debug-output/test-ui/checkbox/` should contain:
    - `1-silhouette.png`
    - `2-prompt.txt`
    - `3-generated.jpg`
    - `4-final.png`

  **Evidence Required**:
  - [ ] Terminal output showing successful generation
  - [ ] Screenshot of `4-final.png` (base state checkbox)
  - [ ] File sizes confirm images generated

  **Commit**: NO (groups with Task 6)

---

- [x] 6. Implement Variation State Generation Pipeline Stage

  **What to do**:
  - In `api/src/ai/pipeline/stages/ui-component.ts`:
  - Implement `variationStateGenerationStage`:
    - Input: `AssetRun<UIComponentSheetSpec>` (must have artifacts.baseStateImage from Task 5)
    - Steps for each state in spec.states (skip 'normal', already generated):
      1. Upload baseStateImage to Scenario.com as reference
      2. Call `buildUIComponentPrompt` with current state (hover/pressed/disabled)
      3. Run img2img with baseStateImage as reference (strength=0.7 - lighter than base, preserves structure)
      4. Download generated variation
      5. Run background removal
      6. Store in artifacts: `artifacts.stateImages = { normal: base, hover: ..., pressed: ..., disabled: ... }`
    - Output: Updated `AssetRun` with all state images
  - Sequential API calls (hover → pressed → disabled)

  **Must NOT do**:
  - Don't skip base state (normal) - it must exist from Task 5
  - Don't use silhouette for variations (use baseStateImage)
  - Don't generate all states in parallel (sequential for consistency)

  **Parallelizable**: NO (depends on Task 5)

  **References**:

  **Pattern References**:
  - `api/src/ai/pipeline/stages/index.ts:img2imgStage` - Shows img2img with image reference
  - Task 5 (baseStateGenerationStage) - Follow same pattern but with different reference image

  **API/Type References**:
  - `api/src/ai/pipeline/types.ts:264-269` - ScenarioAdapter.img2img interface - see imageAssetId parameter
  - `api/src/ai/pipeline/types.ts:172-193` - Artifacts interface - add stateImages field: `Record<string, Uint8Array>`

  **Generation Strategy**:
  - Strength 0.7 (vs 0.95 for base) - preserves more of the base structure while allowing state-specific changes
  - Sequential to ensure consistency (each state references the same base)

  **WHY Each Reference Matters**:
  - img2img stage shows how to use an uploaded image as reference (not silhouette)
  - Lower strength (0.7) preserves the base design while allowing state-specific modifications
  - Artifacts need to store multiple images (one per state)

  **Acceptance Criteria**:

  **Manual Execution Verification**:
  - [ ] Extend test script from Task 5:
    ```typescript
    const config: GameAssetConfig = {
      assets: [{
        type: 'sheet',
        kind: 'ui_component',
        componentType: 'checkbox',
        states: ['normal', 'hover', 'pressed', 'disabled'], // all states now
        ninePatchMargins: { left: 12, right: 12, top: 12, bottom: 12 }
      }]
    };
    const result = await executeGameAssets(config, adapters);
    ```
  - [ ] Run: `npx tsx api/scripts/test-ui-generation.ts`
  - [ ] Verify:
    - 4 total Scenario.com img2img calls (1 base + 3 variations)
    - All 4 states generated successfully
    - Debug output has 4 final images: `4-final-normal.png`, `4-final-hover.png`, `4-final-pressed.png`, `4-final-disabled.png`
  - [ ] Visual check: All 4 images look like the SAME checkbox in different states (not completely different designs)

  **Evidence Required**:
  - [ ] Terminal output showing 4 successful generations
  - [ ] Screenshots of all 4 state images side-by-side
  - [ ] Confirmation they look visually consistent

  **Commit**: YES (with Task 5)
  - Message: `feat(api): add UI component pipeline stages (base + variations)`
  - Files: `api/src/ai/pipeline/stages/ui-component.ts`, `api/src/ai/pipeline/types.ts` (Artifacts extension)
  - Pre-commit: `cd api && tsc --noEmit`

---

- [x] 7. Build Sheet Metadata and Upload to R2

  **What to do**:
  - In `api/src/ai/pipeline/stages/ui-component.ts`:
  - Implement `buildUIMetadataStage`:
    - Input: `AssetRun<UIComponentSheetSpec>` (has artifacts.stateImages)
    - Steps:
      1. Create metadata JSON:
        ```json
        {
          "componentType": "checkbox",
          "states": {
            "normal": { "region": { "x": 0, "y": 0, "width": 256, "height": 256 }, "r2Key": "..." },
            "hover": { "region": { ... }, "r2Key": "..." },
            "pressed": { ... },
            "disabled": { ... }
          },
          "ninePatchMargins": { "left": 12, "right": 12, "top": 12, "bottom": 12 },
          "baseResolution": 256,
          "generatedAt": 1234567890
        }
        ```
      2. Upload each state image to R2:
        - Key: `${r2Prefix}/checkbox/normal.png`, `hover.png`, etc.
        - Store keys in metadata
      3. Upload metadata JSON to R2:
        - Key: `${r2Prefix}/checkbox/metadata.json`
      4. Store public URLs in artifacts: `artifacts.publicUrls = [...]`
    - Output: Updated `AssetRun` with R2 keys and public URLs
  - Follow pattern from `buildSheetMetadataStage` in existing pipeline

  **Must NOT do**:
  - Don't create a composite sheet (states are separate images)
  - Don't compress images (preserve alpha channel quality)
  - Don't skip metadata upload (Godot needs it to load correctly)

  **Parallelizable**: NO (depends on Task 6)

  **References**:

  **Pattern References**:
  - `api/src/ai/pipeline/stages/index.ts:buildSheetMetadataStage` - Shows how to create metadata JSON for sheets
  - `api/src/ai/pipeline/stages/index.ts:uploadR2Stage` - Shows R2 upload pattern

  **API/Type References**:
  - `api/src/ai/pipeline/types.ts:283-287` - R2Adapter interface - see put() and getPublicUrl() methods
  - `shared/src/types/asset-sheet.ts:145-163` - AssetSheetBase interface - see metadata structure pattern

  **Metadata Structure**:
  - Each state needs R2 key + region info (even though separate files, not composite)
  - Nine-patch margins stored at root level (apply to all states)

  **WHY Each Reference Matters**:
  - buildSheetMetadataStage shows the metadata pattern for multi-image assets
  - R2Adapter shows upload methods and URL generation
  - AssetSheetBase shows how metadata is structured for consumption by the game engine

  **Acceptance Criteria**:

  **Manual Execution Verification**:
  - [ ] Continue test script from Task 6
  - [ ] Run: `npx tsx api/scripts/test-ui-generation.ts`
  - [ ] Verify R2 uploads:
    ```bash
    # Local dev R2 storage
    ls -la .wrangler/state/v3/r2/slopcade-assets-dev/generated/test-ui/checkbox/
    ```
  - [ ] Expected files:
    - `normal.png`
    - `hover.png`
    - `pressed.png`
    - `disabled.png`
    - `metadata.json`
  - [ ] Verify metadata JSON structure:
    ```bash
    cat .wrangler/state/v3/r2/slopcade-assets-dev/generated/test-ui/checkbox/metadata.json
    ```
  - [ ] Confirm JSON has: componentType, states (with r2Keys), ninePatchMargins
  - [ ] Verify public URLs are accessible (if local server running)

  **Evidence Required**:
  - [ ] Terminal output: R2 upload success
  - [ ] File listing showing all uploaded files
  - [ ] metadata.json content snippet
  - [ ] Public URL test (curl or browser)

  **Commit**: YES
  - Message: `feat(api): add UI component metadata builder and R2 upload`
  - Files: `api/src/ai/pipeline/stages/ui-component.ts`
  - Pre-commit: `cd api && tsc --noEmit`

---

- [x] 8. Create Godot ThemedCheckbox Component

  **What to do**:
  - Create file: `godot_project/scripts/ui/ThemedCheckbox.gd`
  - Implement ThemedCheckbox class (extends Node, contains CheckBox node):
    ```gdscript
    class_name ThemedCheckbox extends Node

    var checkbox_node: CheckBox
    var style_boxes: Dictionary = {} # state -> StyleBoxTexture
    var metadata: Dictionary
    var checkmark_icon: Texture2D

    func _init(metadata_url: String, checkmark_icon_path: String):
      # Load metadata JSON
      # Download state textures
      # Create StyleBoxTexture for each state with nine-patch margins
      # Set up CheckBox node with themed styles
      # Load checkmark icon
      pass

    func _setup_state_style(state: String, texture_url: String):
      var http = HTTPRequest.new()
      # Download texture
      var texture = ImageTexture.create_from_image(image)
      var style_box = StyleBoxTexture.new()
      style_box.texture = texture
      style_box.texture_margin_left = metadata.ninePatchMargins.left
      style_box.texture_margin_top = metadata.ninePatchMargins.top
      style_box.texture_margin_right = metadata.ninePatchMargins.right
      style_box.texture_margin_bottom = metadata.ninePatchMargins.bottom
      style_boxes[state] = style_box
      pass

    func _apply_styles():
      checkbox_node.add_theme_stylebox_override("normal", style_boxes["normal"])
      checkbox_node.add_theme_stylebox_override("hover", style_boxes["hover"])
      checkbox_node.add_theme_stylebox_override("pressed", style_boxes["pressed"])
      checkbox_node.add_theme_stylebox_override("disabled", style_boxes["disabled"])
      checkbox_node.add_theme_icon_override("checked", checkmark_icon)
      pass
    ```
  - Handle async texture loading (HTTPRequest)
  - Connect to CheckBox signals for state changes

  **Must NOT do**:
  - Don't modify GameBridge.gd or UIManager.gd yet (standalone component first)
  - Don't add animations (static state textures only)
  - Don't create custom checkmark generation (use simple Godot icon or emoji)

  **Parallelizable**: YES (with Tasks 1-7, only needs type knowledge)

  **References**:

  **Pattern References**:
  - `godot_project/scripts/ui/UIManager.gd:_load_button_texture` - Shows HTTPRequest pattern for loading textures from URLs
  - `godot_project/scripts/GameBridge.gd:3049-3096` - Shows TextureButton creation and texture loading

  **Godot UI References**:
  - Godot StyleBoxTexture docs (from librarian): texture_margin_left/right/top/bottom for nine-patch
  - Godot CheckBox docs: theme overrides for normal/hover/pressed/disabled states + checked icon

  **Metadata Structure**:
  - See Task 7 for metadata JSON format (componentType, states with r2Keys, ninePatchMargins)

  **WHY Each Reference Matters**:
  - UIManager shows existing texture loading pattern via HTTPRequest
  - StyleBoxTexture is the Godot class for nine-patch rendering
  - CheckBox needs both background StyleBoxes AND checkmark icon

  **Acceptance Criteria**:

  **Manual Execution Verification**:
  - [ ] Open Godot project: `godot godot_project/project.godot`
  - [ ] Create test scene: `test_themed_checkbox.tscn`
  - [ ] Add script:
    ```gdscript
    extends Node2D

    func _ready():
      var checkbox = ThemedCheckbox.new(
        "http://localhost:8787/assets/generated/test-ui/checkbox/metadata.json",
        "res://icons/checkmark.png"
      )
      add_child(checkbox)
    ```
  - [ ] Run scene (F5)
  - [ ] Verify:
    - Checkbox appears with themed background
    - Hovering changes background (if hover state differs visually)
    - Clicking shows checkmark icon
    - Checkbox backgrounds stretch correctly at different sizes (resize the node)
  - [ ] No Godot errors in console

  **Evidence Required**:
  - [ ] Screenshot: checkbox in normal state
  - [ ] Screenshot: checkbox in hover state (if different)
  - [ ] Screenshot: checkbox checked with checkmark
  - [ ] Screenshot: checkbox at 2x size showing nine-patch stretch
  - [ ] Godot console output: no errors

  **Commit**: NO (groups with Task 9)

---

- [x] 9. Create Godot Test Scene for Manual QA

  **What to do**:
  - Create file: `godot_project/scenes/test_ui_components.tscn`
  - Scene contents:
    - Node2D root
    - 4 ThemedCheckbox instances side-by-side:
      - Checkbox 1: Normal size (32x32), unchecked
      - Checkbox 2: Normal size (32x32), checked
      - Checkbox 3: Large size (64x64), unchecked - verify nine-patch stretch
      - Checkbox 4: Large size (64x64), checked - verify stretch
    - Label nodes showing which state each represents
    - Background panel for visual contrast
  - Add instructions as Label:
    "Hover over checkboxes to see hover state. Click to toggle checked state."
  - All checkboxes use same metadata URL (generated from Tasks 5-7)

  **Must NOT do**:
  - Don't add complex UI layouts (simple grid is fine)
  - Don't add other component types (checkbox only for POC)
  - Don't add interactive controls beyond the checkboxes themselves

  **Parallelizable**: NO (depends on Task 8)

  **References**:

  **Pattern References**:
  - `godot_project/scenes/` - Look for existing test scenes to match scene structure pattern
  - Task 8 (ThemedCheckbox.gd) - Use this component in the scene

  **Godot Scene Structure**:
  - Node2D (root) → Control (UI container) → GridContainer (layout) → ThemedCheckbox instances

  **WHY Each Reference Matters**:
  - Existing scenes show project conventions for scene structure
  - Multiple sizes verify nine-patch stretching works correctly
  - Checked/unchecked states verify icon overlay works

  **Acceptance Criteria**:

  **Manual Execution Verification**:
  - [ ] Open scene in Godot editor: `godot_project/scenes/test_ui_components.tscn`
  - [ ] Run scene (F6 - run current scene)
  - [ ] Verify visual appearance:
    - All 4 checkboxes render with themed backgrounds
    - Backgrounds look consistent with the generated theme
    - Large checkboxes stretch correctly (borders don't distort, center stretches)
    - Checkmarks appear on checked boxes
  - [ ] Verify interaction:
    - Hover over checkbox → background changes to hover state (if visually different)
    - Click checkbox → toggles between checked/unchecked
    - Disabled state shows greyed-out appearance (manually set in scene for testing)
  - [ ] Take screenshots of each state for documentation

  **Evidence Required**:
  - [ ] Screenshot: test scene showing all 4 checkboxes
  - [ ] Screenshot: hover state (mouse over checkbox)
  - [ ] Screenshot: large checkbox (64x64) showing nine-patch stretch quality
  - [ ] Godot console: no errors
  - [ ] Manual QA checklist completed

  **Commit**: YES (with Task 8)
  - Message: `feat(godot): add ThemedCheckbox component with test scene`
  - Files: `godot_project/scripts/ui/ThemedCheckbox.gd`, `godot_project/scenes/test_ui_components.tscn`
  - Pre-commit: Open Godot, verify no errors

---

- [ ] 10. Create tRPC API Route for UI Component Generation

  **What to do**:
  - Create file: `api/src/trpc/routes/ui-components.ts`
  - Implement route:
    ```typescript
    export const uiComponentsRouter = router({
      generateUIComponent: protectedProcedure
        .input(z.object({
          gameId: z.string(),
          componentType: z.enum(['button', 'checkbox', 'radio', 'slider', 'panel', 'progress_bar', 'list_item', 'dropdown', 'toggle_switch']),
          theme: z.union([
            z.string(), // simple: "medieval fantasy"
            z.object({ palette: z.array(z.string()), texture: z.string(), era: z.string() }) // structured
          ]),
          states: z.array(z.enum(['normal', 'hover', 'pressed', 'disabled', 'focus'])).default(['normal', 'hover', 'pressed', 'disabled']),
          baseResolution: z.number().default(256),
        }))
        .mutation(async ({ input, ctx }) => {
          // 1. Create UIComponentSheetSpec from input
          // 2. Call pipeline executor with spec
          // 3. Store result in database (asset_packs + asset_pack_entries)
          // 4. Return R2 URLs and metadata
        })
    });
    ```
  - Integrate with main router in `api/src/trpc/index.ts`
  - Handle theme format conversion (string → structured prompt)
  - Store generation job in database

  **Must NOT do**:
  - Don't add regeneration logic (POC is one-shot generation)
  - Don't add theme persistence (theme is input parameter)
  - Don't add batch generation of multiple component types (one at a time)

  **Parallelizable**: NO (depends on Tasks 1-7)

  **References**:

  **Pattern References**:
  - `api/src/trpc/routes/asset-system.ts` - Shows existing asset generation routes (generateAll, processJob patterns)
  - `api/src/trpc/routes/asset-system.ts:createJob` - Shows how to create generation jobs with metadata

  **API/Type References**:
  - `api/src/ai/pipeline/types.ts:UIComponentSheetSpec` - From Task 1, use this spec type
  - `api/src/ai/pipeline/executor.ts:executeGameAssets` - Shows how to call pipeline executor
  - `shared/src/types/asset-system.ts:GenerationJob` - Shows job tracking structure

  **Database References**:
  - Task 2 schema - shows where to store component metadata

  **WHY Each Reference Matters**:
  - asset-system routes show the pattern for orchestrating generation jobs
  - Pipeline executor is the entry point for generation
  - Database schema shows where to persist results

  **Acceptance Criteria**:

  **Manual Execution Verification**:
  - [ ] Start API server: `pnpm dev` (or devmux)
  - [ ] Test with curl:
    ```bash
    curl -X POST http://localhost:8787/trpc/uiComponents.generateUIComponent \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer YOUR_TOKEN" \
      -d '{
        "gameId": "test-game",
        "componentType": "checkbox",
        "theme": "medieval fantasy with stone textures",
        "states": ["normal", "hover", "pressed", "disabled"]
      }'
    ```
  - [ ] Verify response:
    - Status 200
    - Response body contains:
      ```json
      {
        "success": true,
        "r2Keys": ["generated/test-game/checkbox/normal.png", ...],
        "publicUrls": ["https://.../normal.png", ...],
        "metadataUrl": "https://.../metadata.json"
      }
      ```
  - [ ] Verify database:
    ```sql
    SELECT * FROM asset_packs WHERE game_id='test-game';
    ```
  - [ ] Confirm metadata stored correctly

  **Evidence Required**:
  - [ ] curl command output showing success response
  - [ ] Database query showing stored pack
  - [ ] Public URLs accessible via browser
  - [ ] TypeScript compiles: `cd api && tsc --noEmit`

  **Commit**: YES
  - Message: `feat(api): add tRPC route for UI component generation`
  - Files: `api/src/trpc/routes/ui-components.ts`, `api/src/trpc/index.ts`
  - Pre-commit: `cd api && tsc --noEmit`

---

- [ ] 11. End-to-End Manual QA

  **What to do**:
  - Full workflow test (API → Godot):
    1. Call tRPC route with different themes:
       - Theme 1: "medieval fantasy with stone textures"
       - Theme 2: "futuristic sci-fi with neon glows"
       - Theme 3: "cartoon style with bright colors"
    2. Verify each generation produces 4 states + metadata
    3. Update Godot test scene to load newly generated components
    4. Verify visual consistency across themes
    5. Test nine-patch stretching at multiple sizes (24x24, 32x32, 48x48, 64x64)
    6. Test interaction states (hover, press, disable)
  - Document issues in `.sisyphus/notepads/ui-components-qa/`
  - Take screenshots for each theme
  - Performance check: measure generation time (<60 seconds target)

  **Must NOT do**:
  - Don't fix issues yet (document only for POC)
  - Don't test other component types (checkbox only)
  - Don't test theme persistence (not in POC scope)

  **Parallelizable**: NO (depends on ALL previous tasks)

  **References**:

  **Pattern References**:
  - `.sisyphus/notepads/asset-variations-plan/issues.md` - Shows issue documentation format from previous asset work
  - Task 9 test scene - Use this scene for QA

  **QA Checklist**:
  - Visual: Theme consistency, nine-patch quality, state differentiation
  - Functional: Interaction works, checkmark displays, stretch works
  - Performance: Generation time, file sizes, load time

  **WHY Each Reference Matters**:
  - Previous issue documentation shows what problems to look for (grid lines, inconsistent AI output, etc.)
  - Test scene provides controlled environment for systematic testing
  - Multiple themes verify the system works generally, not just for one style

  **Acceptance Criteria**:

  **Manual Execution Verification**:
  - [ ] Generate 3 themed checkboxes:
    ```bash
    # Medieval
    curl -X POST ... -d '{"theme": "medieval fantasy with stone textures", ...}'
    # Sci-fi
    curl -X POST ... -d '{"theme": "futuristic sci-fi with neon glows", ...}'
    # Cartoon
    curl -X POST ... -d '{"theme": "cartoon style with bright colors", ...}'
    ```
  - [ ] For each theme:
    - [ ] Verify 4 state images generated
    - [ ] Load in Godot test scene
    - [ ] Screenshot all states
    - [ ] Test hover/click interaction
    - [ ] Test size scaling (24px to 64px)
    - [ ] Measure generation time
  - [ ] Create QA report: `.sisyphus/notepads/ui-components-qa/poc-results.md`
  - [ ] Include:
    - Screenshots of all themes and states
    - Generation time measurements
    - Issues found (if any)
    - Visual quality assessment
    - Nine-patch stretch quality assessment

  **Evidence Required**:
  - [ ] Screenshots: 3 themes × 4 states = 12 images minimum
  - [ ] Screenshots: Stretch test showing 24px, 32px, 48px, 64px sizes
  - [ ] QA report documenting findings
  - [ ] Generation time logs (from API console)
  - [ ] Summary: "POC complete" or "POC needs fixes" with reasoning

  **Commit**: YES
  - Message: `docs: add UI component POC QA results`
  - Files: `.sisyphus/notepads/ui-components-qa/poc-results.md`, screenshots
  - Pre-commit: None (documentation only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 2 | `feat(api): add ui component database schema` | migrations, schema.sql | wrangler migration |
| 4 | `feat(api): add nine-patch silhouette and prompt builders for UI components` | silhouette, prompt-builder | tsc --noEmit |
| 6 | `feat(api): add UI component pipeline stages (base + variations)` | stages/ui-component.ts, types.ts | tsc --noEmit |
| 7 | `feat(api): add UI component metadata builder and R2 upload` | stages/ui-component.ts | tsc --noEmit |
| 9 | `feat(godot): add ThemedCheckbox component with test scene` | ThemedCheckbox.gd, test scene | Godot error check |
| 10 | `feat(api): add tRPC route for UI component generation` | routes/ui-components.ts | tsc --noEmit |
| 11 | `docs: add UI component POC QA results` | QA report, screenshots | N/A |

---

## Success Criteria

### Verification Commands
```bash
# TypeScript compilation
cd api && tsc --noEmit

# Database migration
cd api && npx wrangler d1 execute slopcade-db-dev --local --file=migrations/YYYYMMDD_ui_components.sql

# Test generation
npx tsx api/scripts/test-ui-generation.ts

# R2 verification
ls -la .wrangler/state/v3/r2/slopcade-assets-dev/generated/test-ui/checkbox/

# API test
curl -X POST http://localhost:8787/trpc/uiComponents.generateUIComponent ...

# Godot test
# Open godot_project/scenes/test_ui_components.tscn and run (F6)
```

### Final Checklist
- [ ] All "Must Have" features implemented
- [ ] All "Must NOT Have" guardrails respected
- [ ] CheckBox POC generates successfully with themed backgrounds
- [ ] Nine-patch rendering works correctly in Godot at multiple sizes
- [ ] Sequential state generation produces visually consistent results
- [ ] Generation completes in <60 seconds
- [ ] No TypeScript compilation errors
- [ ] Manual QA documented with screenshots
- [ ] Database schema supports UI component metadata
- [ ] R2 storage contains all state images + metadata JSON
