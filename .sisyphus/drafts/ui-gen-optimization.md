# Draft: UI Generation Optimization Workflow

## Requirements (confirmed from user)
- **Primary Goal**: Optimize programmatic UI element generation for buttons and checkboxes
- **Key Activities**:
  - Playing with silhouettes (experimenting with visual guides)
  - Seeing all intermediate images (viewing pipeline steps)
  - Tweaking prompts to get the best results

## Current System Analysis

### Pipeline Architecture (3 stages)
1. **ui-base-state**: Silhouette → img2img (strength 0.95) → bg removal → "normal" state
2. **ui-variation-states**: Normal image → img2img (strength 0.7) → bg removal → hover/pressed/disabled
3. **ui-upload-r2**: All states → R2 storage with metadata.json

### Silhouette Generation
- **Nine-patch silhouettes** (button, checkbox): 3-color scheme (#404040 border, #808080 center, #FFFFFF bg)
- **SVG silhouettes** (panel, progress_bar, scroll_bar, tab_bar): Custom shapes

### Prompt Construction
- `buildUIComponentPrompt()` combines: componentType + state + theme
- Control-specific features: "Rectangular button with raised 3D appearance"
- State descriptions: "Subtle highlight effect, slightly brighter"
- Negative prompts: Exclude text, labels, icons, 3D perspective

### Current Debug Output
- **Location**: `api/debug-output/ui-cli/{assetId}/`
- **Naming**: `{stageId}_{sequence}-{name}.{ext}`
- **Files per control**: ~13 files (silhouette, prompts, generated, final for each state)
- **Viewing**: `themed_ui_gallery.tsx` (in-app), markdown reports

### Test Scripts
- `api/scripts/generate-ui-button.ts` - Full pipeline test
- `api/scripts/generate-ui-checkbox.ts` - Checkbox variant
- `api/scripts/test-ui-generation.ts` - Unit tests (silhouette + prompt only)

## Research Findings

### Key Parameters to Experiment With
1. **Strength values**: 0.95 (base), 0.7 (variations) - can adjust for more/less transformation
2. **Silhouette design**: Color zones, border widths, corner radii
3. **Prompt structure**: Control features, state descriptions, theme integration
4. **Negative prompts**: What to exclude

### Current Gaps (Experimentation Pain Points)
1. No side-by-side comparison view for different parameter runs
2. No easy way to vary silhouettes without code changes
3. No parameter grid visualization
4. Must run full pipeline (~25-30s) to see any result

## Open Questions
1. Should silhouette experimentation be CLI-based or web UI-based?
2. What's the preferred comparison format: web gallery, markdown grid, or VS Code side-by-side?
3. Do you want to test multiple themes in parallel, or focus on one theme at a time?
4. Should we add "dry-run" mode that skips AI calls for faster iteration on silhouettes/prompts?
5. What's most important: silhouette tweaking, prompt tweaking, or strength parameter tweaking?

## Scope Boundaries
- INCLUDE: Experimentation workflow for buttons/checkboxes
- INCLUDE: Intermediate image viewing
- INCLUDE: Prompt and parameter tuning tools
- EXCLUDE: (TBD based on user input)

## Technical Decisions (pending)
- (TBD based on user answers)
