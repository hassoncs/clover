# UI Element Generation System - Complete Guide

**Last Updated:** 2026-01-27  
**Status:** Active Development  
**Purpose:** Comprehensive guide for experimenting with and optimizing programmatic UI element generation

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Key Concepts](#key-concepts)
4. [File Locations](#file-locations)
5. [How It Works](#how-it-works)
6. [Experimentation Workflow](#experimentation-workflow)
7. [Tweaking Parameters](#tweaking-parameters)
8. [Viewing Intermediate Images](#viewing-intermediate-images)
9. [Prompt Optimization](#prompt-optimization)
10. [Troubleshooting](#troubleshooting)

---

## System Overview

The UI generation system transforms simple **silhouettes** (visual guides) into themed UI components using AI image generation. It's a 3-stage pipeline that produces buttons, checkboxes, panels, progress bars, scroll bars, and tab bars with multiple states (normal, hover, pressed, disabled).

### What Makes This System Unique

- **Silhouette-Guided Generation**: Uses grayscale shapes to guide AI on structure
- **Nine-Patch Aware**: Generates assets with proper stretchable/fixed regions
- **State Consistency**: Variations maintain visual consistency with base state
- **Full Transparency**: Saves all intermediate images for inspection
- **Experimentation-Friendly**: Easy to test different parameters and compare results

---

## Architecture

### 3-Stage Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: Base State Generation                              │
│ ─────────────────────────────────────────────────────────── │
│ Silhouette → Upload → img2img (strength 0.95) → Remove BG  │
│ Result: "normal" state with high transformation             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: Variation States                                   │
│ ─────────────────────────────────────────────────────────── │
│ Base State → img2img (strength 0.7) → Remove BG            │
│ Result: hover, pressed, disabled states                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 3: Upload & Metadata                                  │
│ ─────────────────────────────────────────────────────────── │
│ Save to R2 + Generate metadata.json with nine-patch info   │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Image Generation**: Scenario.com API (Flux models)
- **Silhouette Creation**: Sharp (for raster) + SVG (for vector shapes)
- **Storage**: Cloudflare R2
- **Pipeline**: Type-driven stage system with adapters

---

## Key Concepts

### Silhouettes

**What:** Grayscale PNG images that guide the AI on shape and structure  
**Why:** Ensures consistent dimensions and helps AI understand nine-patch regions

**Types:**

1. **Nine-Patch Silhouettes** (Buttons, Checkboxes)
   - Dark gray border (#404040) = Fixed decorative area
   - Medium gray center (#808080) = Stretchable area
   - White background (#FFFFFF)

2. **SVG Silhouettes** (Panels, Bars, Tabs)
   - Panel: Hollow frame (transparent center)
   - Progress Bar: Rounded rectangle
   - Scroll Bars: Slim tracks
   - Tab Bar: Rounded top, flat bottom

### Strength Parameter

**What:** Controls how much the AI transforms the input image (0.0 to 1.0)

**Guidelines:**
- **0.3-0.5**: Subtle variations, very close to original
- **0.7**: Moderate changes, maintains structure (used for variations)
- **0.85-0.95**: Heavy transformation, respects shape only (used for base)
- **1.0**: Maximum creativity (rarely used)

**Current Settings:**
- Base state: `0.95` (high transformation from silhouette)
- Variations: `0.7` (moderate changes from base)

### Prompts

**Structure:**
```
A {componentType} UI background for a game interface.
{controlFeature}.
Theme: {theme}.
State: {stateDesc}.
Front view, flat 2D element with transparent background.
Decorative borders and clean center area suitable for nine-patch scaling.
Professional game UI style, functional and thematic.
```

**Negative Prompt:**
```
text, labels, icons, checkmarks, letters, numbers, watermark, 
signature, grid lines, measurement marks, multiple elements, 
3D perspective, angled view, blurry, low quality
```

---

## File Locations

### Core Pipeline

```
api/src/ai/pipeline/
├── stages/
│   └── ui-component.ts          # 3-stage pipeline orchestration
├── silhouettes/
│   ├── ui-component.ts          # Nine-patch silhouettes (Sharp)
│   └── ui-component-svg.ts      # SVG silhouettes (panels, bars, tabs)
├── prompt-builder.ts            # Dynamic prompt construction
├── ui-control-config.ts         # Dimensions, margins, states per control
├── executor.ts                  # Pipeline runner
├── registry.ts                  # Asset type → stage mappings
└── adapters/
    ├── node.ts                  # Node.js adapter (local dev)
    └── workers.ts               # Cloudflare Workers adapter
```

### Scripts & Tools

```
api/scripts/
├── generate-ui-button.ts        # Button generation test
├── generate-ui-checkbox.ts      # Checkbox generation test
├── ui-experiment.ts             # 🆕 Experimentation tool
└── ui-compare.ts                # 🆕 Comparison report generator
```

### CLI Tool

```
api/src/cli/
├── generate-ui.ts               # Main CLI entry point
└── theme-presets.ts             # Theme string mappings
```

### Output Directories

```
api/api/debug-output/
├── ui-cli/                      # CLI generation output
│   ├── cli-button-{timestamp}/
│   ├── cli-checkbox-{timestamp}/
│   └── ...
└── ui-experiments/              # 🆕 Experimentation output
    └── {timestamp}/
        ├── run-1-theme-X-strength-Y/
        ├── run-2-theme-Z-strength-W/
        └── comparison.html
```

---

## How It Works

### Step-by-Step Process

#### 1. Silhouette Creation

**For Buttons/Checkboxes:**
```typescript
// Creates a 64×64 shape on a 256×256 canvas
const silhouette = await createNinePatchSilhouette({
  width: 64,
  height: 64,
  marginSize: 12,  // Nine-patch margin
  canvasSize: 256
});
```

**For Panels:**
```typescript
// Creates a hollow frame using SVG path
const silhouette = await createPanelSilhouette({
  width: 256,
  height: 256,
  margin: 16
});
```

#### 2. Prompt Construction

```typescript
const { prompt, negativePrompt } = buildUIComponentPrompt({
  componentType: 'button',
  state: 'normal',
  theme: 'cyberpunk neon with glowing edges',
  baseResolution: 256
});
```

**Result:**
```
A button UI background for a game interface. 
Rectangular button with raised 3D appearance. 
Theme: cyberpunk neon with glowing edges. 
State: neutral, clean. 
Front view, flat 2D element with transparent background. 
Decorative borders and clean center area suitable for nine-patch scaling. 
Professional game UI style, functional and thematic.
```

#### 3. Base State Generation

```typescript
// Upload silhouette to Scenario.com
const silhouetteAssetId = await scenario.uploadImage(silhouettePng);

// Transform via img2img
const result = await scenario.img2img({
  imageAssetId: silhouetteAssetId,
  prompt: prompt,
  strength: 0.95  // High transformation
});

// Remove background
const final = await scenario.removeBackground(result.assetId);
```

#### 4. Variation States

```typescript
// Use base state as reference
const baseAssetId = await scenario.uploadImage(baseStateImage);

// Generate hover state
const hoverResult = await scenario.img2img({
  imageAssetId: baseAssetId,
  prompt: hoverPrompt,
  strength: 0.7  // Lower strength = stay closer to base
});
```

#### 5. Debug Output

All intermediate images are saved:
```
ui-base-state_1-silhouette.png          ← Input silhouette
ui-base-state_2-prompt-normal.txt       ← Prompt used
ui-base-state_3-generated-normal.png    ← Raw AI output
ui-base-state_4-final-normal.png        ← After bg removal
ui-variation-states_2-prompt-hover.txt
ui-variation-states_3-generated-hover.png
ui-variation-states_4-final-hover.png
```

---

## Experimentation Workflow

### Using the Experiment Tool

#### Basic Usage

```bash
# Generate with default settings (button, cyberpunk theme, strength 0.95)
hush run -- npx tsx api/scripts/ui-experiment.ts

# Test multiple themes
hush run -- npx tsx api/scripts/ui-experiment.ts \
  --type button \
  --theme "medieval fantasy, scifi neon, cartoon colorful"

# Test multiple strength values
hush run -- npx tsx api/scripts/ui-experiment.ts \
  --type button \
  --theme "cyberpunk" \
  --strength 0.85,0.90,0.95

# Test prompt variations
hush run -- npx tsx api/scripts/ui-experiment.ts \
  --type button \
  --theme "fantasy" \
  --prompt "with ornate details, with simple clean lines, with glowing effects"
```

#### Full Experiment Example

```bash
# Test 3 themes × 3 strengths = 9 variations
hush run -- npx tsx api/scripts/ui-experiment.ts \
  --type button \
  --theme "medieval, scifi, fantasy" \
  --strength 0.85,0.90,0.95
```

### Output Structure

```
debug-output/ui-experiments/2026-01-27-143022/
├── run-1-theme-medieval-strength-0.85/
│   ├── silhouette.png
│   ├── prompt.txt
│   ├── generated-normal.png
│   └── final-normal.png
├── run-2-theme-medieval-strength-0.90/
├── run-3-theme-medieval-strength-0.95/
├── run-4-theme-scifi-strength-0.85/
├── run-5-theme-scifi-strength-0.90/
├── run-6-theme-scifi-strength-0.95/
├── run-7-theme-fantasy-strength-0.85/
├── run-8-theme-fantasy-strength-0.90/
├── run-9-theme-fantasy-strength-0.95/
└── comparison.html  ← Open this in browser
```

### Viewing Results

```bash
# Open comparison report
open debug-output/ui-experiments/2026-01-27-143022/comparison.html
```

The HTML report shows:
- Grid layout with all runs
- Silhouette, generated, and final images for each
- Parameters used (theme, strength, prompt)
- Click to zoom functionality

---

## Tweaking Parameters

### 1. Adjust Strength Values

**File:** `api/src/ai/pipeline/stages/ui-component.ts`

**Base State (Line 117):**
```typescript
const img2imgResult = await adapters.scenario.img2img({
  imageAssetId: silhouetteAssetId,
  prompt,
  strength: 0.95,  // ← Change this
});
```

**Variations (Line 200):**
```typescript
const img2imgResult = await adapters.scenario.img2img({
  imageAssetId: baseAssetId,
  prompt,
  strength: 0.7,  // ← Change this
});
```

**Recommendations:**
- **More dramatic base states**: Increase to `0.98`
- **More subtle variations**: Decrease to `0.5-0.6`
- **Experiment first**: Use `ui-experiment.ts` to test before changing code

### 2. Modify Prompts

**File:** `api/src/ai/pipeline/prompt-builder.ts`

**Control-Specific Features (Lines 181-189):**
```typescript
const CONTROL_SPECIFIC_FEATURES: Record<string, string> = {
  button: 'Rectangular button with raised 3D appearance',
  // ↑ Make more specific:
  // 'Rectangular button with STRONG raised 3D appearance, deep shadows, beveled edges'
  
  checkbox: 'Square checkbox container without checkmark symbol',
  // ↑ Add detail:
  // 'Square checkbox container with subtle inner shadow, without checkmark symbol'
  
  panel: 'Decorative frame with HOLLOW CENTER (transparent inside)...',
  // ↑ Emphasize:
  // 'HIGHLY decorative frame with HOLLOW CENTER (transparent inside). 
  //  Intricate ornate outer border with detailed patterns...'
};
```

**State Descriptions (Lines 194-202):**
```typescript
const stateDescriptions: Record<string, string> = {
  normal: 'neutral, clean',
  // ↑ More descriptive:
  // 'neutral resting state, clean and balanced appearance'
  
  hover: 'highlighted, slightly brighter',
  // ↑ More specific:
  // 'highlighted with subtle glow, slightly brighter and elevated'
  
  pressed: 'depressed, darker or inset',
  // ↑ More dramatic:
  // 'depressed appearance with deep inset shadows, darker and pushed down'
};
```

### 3. Adjust Silhouettes

**Nine-Patch Margins:**

**File:** `api/src/ai/pipeline/ui-control-config.ts`

```typescript
export const UI_CONTROL_CONFIGS: Record<string, UIControlConfig> = {
  button: {
    dimensions: { width: 256, height: 256 },
    ninePatchMargins: { left: 12, right: 12, top: 12, bottom: 12 },
    // ↑ Increase for chunkier borders:
    // { left: 16, right: 16, top: 16, bottom: 16 }
  },
  // ...
};
```

**Silhouette Colors:**

**File:** `api/src/ai/pipeline/silhouettes/ui-component.ts`

```typescript
const borderColor = { r: 64, g: 64, b: 64, alpha: 255 };   // #404040
const centerColor = { r: 128, g: 128, b: 128, alpha: 255 }; // #808080

// ↑ Experiment with different grays for better AI guidance
// Darker border: { r: 32, g: 32, b: 32, alpha: 255 }
// Lighter center: { r: 160, g: 160, b: 160, alpha: 255 }
```

---

## Viewing Intermediate Images

### Debug Sink System

All intermediate images are automatically saved via the `createFileDebugSink` function.

**Location:** `api/src/ai/pipeline/adapters/node.ts` (lines 373-409)

### File Naming Convention

```
{stageId}_{sequenceNumber}-{description}.{ext}
```

**Example:**
```
ui-base-state_1-silhouette.png
ui-base-state_2-prompt-normal.txt
ui-base-state_3-generated-normal.png
ui-base-state_4-final-normal.png
ui-variation-states_2-prompt-hover.txt
ui-variation-states_3-generated-hover.png
ui-variation-states_4-final-hover.png
```

### What Each File Shows

| File | Description | What to Check |
|------|-------------|---------------|
| `*_1-silhouette.png` | Input silhouette | Is the shape correct? Right size? |
| `*_2-prompt-*.txt` | Prompt used | Does it describe what you want? |
| `*_3-generated-*.png` | Raw AI output | Quality before bg removal |
| `*_4-final-*.png` | After bg removal | Final result with transparency |

### Quick Inspection

```bash
# View all intermediate images for a button
open api/api/debug-output/ui-cli/cli-button-*/

# View specific stage
open api/api/debug-output/ui-cli/cli-button-*/*silhouette.png
open api/api/debug-output/ui-cli/cli-button-*/*generated*.png
open api/api/debug-output/ui-cli/cli-button-*/*final*.png
```

### Comparison Workflow

1. **Generate baseline:**
   ```bash
   hush run -- npx tsx api/scripts/generate-ui-button.ts
   ```

2. **Note the timestamp directory:**
   ```
   api/api/debug-output/ui-cli/cli-button-1769401063291/
   ```

3. **Make changes** (adjust prompts, strength, etc.)

4. **Generate again:**
   ```bash
   hush run -- npx tsx api/scripts/generate-ui-button.ts
   ```

5. **Compare directories side-by-side:**
   ```bash
   # Old
   open api/api/debug-output/ui-cli/cli-button-1769401063291/
   
   # New
   open api/api/debug-output/ui-cli/cli-button-1769401234567/
   ```

---

## Prompt Optimization

### Systematic Approach

#### 1. Identify Issues

**Common Problems:**
- Too generic (lacks theme)
- Wrong perspective (3D instead of flat)
- Includes unwanted elements (text, icons)
- Wrong proportions
- Inconsistent states

#### 2. Test Variations

Use the experiment tool to test multiple prompt variations:

```bash
hush run -- npx tsx api/scripts/ui-experiment.ts \
  --type button \
  --theme "fantasy" \
  --prompt "with ornate gold trim, with simple stone texture, with glowing runes"
```

#### 3. Analyze Results

Open `comparison.html` and look for:
- Which prompt produces the most consistent results?
- Which matches the theme best?
- Which has the cleanest edges?
- Which respects the nine-patch structure?

#### 4. Refine and Iterate

Based on findings, update `prompt-builder.ts`:

```typescript
// Before
button: 'Rectangular button with raised 3D appearance',

// After (if "ornate gold trim" worked best)
button: 'Rectangular button with raised 3D appearance and ornate gold trim',
```

### Prompt Engineering Tips

#### Be Specific About Structure

**Bad:**
```
A button for a game
```

**Good:**
```
A rectangular button with raised 3D appearance, 
decorative borders, and clean center area suitable for nine-patch scaling
```

#### Emphasize Critical Requirements

Use **CAPS** for critical instructions:

```
Decorative frame with HOLLOW CENTER (transparent inside). 
Ornate outer border, EMPTY middle for content.
```

#### Use Negative Prompts Aggressively

```
text, labels, icons, checkmarks, letters, numbers, watermark, 
signature, grid lines, measurement marks, multiple elements, 
3D perspective, angled view, blurry, low quality
```

#### Theme Integration

**Generic:**
```
Theme: fantasy
```

**Specific:**
```
Theme: medieval fantasy with stone textures, ornate metalwork, 
and subtle magical glow effects
```

---

## Troubleshooting

### Issue: Silhouette Not Respected

**Symptoms:** Generated image has wrong proportions or shape

**Solutions:**
1. Increase strength to 0.98 (more transformation)
2. Make silhouette more prominent (darker colors)
3. Add shape description to prompt:
   ```typescript
   'SQUARE button (1:1 aspect ratio) with...'
   ```

### Issue: Variations Too Different from Base

**Symptoms:** Hover/pressed states look completely different

**Solutions:**
1. Decrease variation strength to 0.5-0.6
2. Make state descriptions more subtle:
   ```typescript
   hover: 'SLIGHTLY highlighted, barely brighter'
   ```

### Issue: Background Not Fully Removed

**Symptoms:** White or colored edges around element

**Solutions:**
1. Check silhouette has white background (#FFFFFF)
2. Ensure prompt includes "transparent background"
3. Verify Scenario.com background removal is working:
   ```bash
   # Test bg removal directly
   hush run -- npx tsx api/scripts/test-scenario-api.ts
   ```

### Issue: Theme Not Applied

**Symptoms:** Generated images look generic, don't match theme

**Solutions:**
1. Make theme more specific in prompt
2. Add theme keywords to control features:
   ```typescript
   button: 'Rectangular button with raised 3D appearance, 
            medieval stone texture, ornate metalwork details'
   ```
3. Test with experiment tool to find best theme description

### Issue: Text/Icons Appearing

**Symptoms:** AI adds unwanted text or symbols

**Solutions:**
1. Strengthen negative prompt:
   ```typescript
   'NO text, NO labels, NO icons, NO checkmarks, NO letters, 
    NO numbers, NO symbols, NO watermark'
   ```
2. Add to control-specific features:
   ```typescript
   checkbox: 'Square checkbox container WITHOUT any checkmark symbol, 
              WITHOUT any text or icons'
   ```

### Issue: Generation Too Slow

**Symptoms:** Takes 4+ minutes for full generation

**Current Behavior:**
- Each control: ~30-60 seconds
- Full gallery (7 controls): ~4-5 minutes

**This is expected** with Scenario.com API. Each img2img call takes 20-30 seconds.

**Future Optimization:**
- Migrate to RunPod/ComfyUI (planned)
- Parallel generation (requires code changes)

---

## Advanced Topics

### Custom Control Types

To add a new control type:

1. **Add configuration** (`ui-control-config.ts`):
   ```typescript
   slider: {
     dimensions: { width: 256, height: 64 },
     ninePatchMargins: { left: 8, right: 8, top: 8, bottom: 8 },
     states: ['normal', 'hover', 'pressed', 'disabled'],
     baseState: 'normal'
   }
   ```

2. **Add silhouette generator** (`ui-component-svg.ts`):
   ```typescript
   export async function createSliderSilhouette(params) {
     // SVG path for slider track
   }
   ```

3. **Add prompt features** (`prompt-builder.ts`):
   ```typescript
   slider: 'Horizontal slider track with rounded ends and groove'
   ```

4. **Update pipeline** (`ui-component.ts`):
   ```typescript
   case 'slider':
     silhouettePng = await createSliderSilhouette({ width, height });
     break;
   ```

### Batch Processing

Generate multiple controls at once:

```bash
# Create a batch script
cat > api/scripts/generate-ui-batch.sh << 'EOF'
#!/bin/bash
for control in button checkbox panel progress_bar; do
  echo "Generating $control..."
  hush run -- npx tsx api/scripts/ui-experiment.ts \
    --type $control \
    --theme "fantasy, scifi, cartoon"
done
EOF

chmod +x api/scripts/generate-ui-batch.sh
./api/scripts/generate-ui-batch.sh
```

### A/B Testing Framework

Compare two prompt strategies:

```bash
# Strategy A: Detailed descriptions
hush run -- npx tsx api/scripts/ui-experiment.ts \
  --type button \
  --theme "fantasy" \
  --prompt "with intricate ornate gold trim and detailed engravings"

# Strategy B: Simple descriptions  
hush run -- npx tsx api/scripts/ui-experiment.ts \
  --type button \
  --theme "fantasy" \
  --prompt "with simple stone texture"

# Compare results in browser
```

---

## Next Steps

### Immediate Actions

1. **Review current results:**
   ```bash
   open api/api/debug-output/ui-cli/
   ```

2. **Run first experiment:**
   ```bash
   hush run -- npx tsx api/scripts/ui-experiment.ts \
     --type button \
     --theme "your-favorite-theme" \
     --strength 0.85,0.90,0.95
   ```

3. **Analyze comparison report:**
   ```bash
   open debug-output/ui-experiments/*/comparison.html
   ```

### Optimization Workflow

1. **Baseline:** Generate with current settings
2. **Experiment:** Test variations (themes, strengths, prompts)
3. **Analyze:** Review comparison report
4. **Refine:** Update code with best settings
5. **Verify:** Generate again and confirm improvement
6. **Iterate:** Repeat until satisfied

### Future Enhancements

- [ ] Parallel generation (speed up batch processing)
- [ ] Interactive web UI for experimentation
- [ ] Automatic quality scoring
- [ ] Prompt template library
- [ ] Migration to RunPod/ComfyUI
- [ ] Real-time preview in Godot

---

## Resources

### Documentation
- [Asset Generation Knowledge](../asset-generation-knowledge.md)
- [Asset Pipeline Overview](../asset-pipeline.md)
- [Scenario.com API Docs](https://docs.scenario.com/)

### Code References
- [Pipeline Stages](../../api/src/ai/pipeline/stages/ui-component.ts)
- [Prompt Builder](../../api/src/ai/pipeline/prompt-builder.ts)
- [Silhouette Generators](../../api/src/ai/pipeline/silhouettes/)

### Tools
- [Experiment Tool](../../api/scripts/ui-experiment.ts)
- [Comparison Generator](../../api/scripts/ui-compare.ts)
- [Button Test](../../api/scripts/generate-ui-button.ts)
- [Checkbox Test](../../api/scripts/generate-ui-checkbox.ts)

---

## Changelog

### 2026-01-27
- Initial documentation created
- Added experimentation tool (`ui-experiment.ts`)
- Added comparison report generator (`ui-compare.ts`)
- Documented all intermediate image locations
- Added prompt optimization guidelines

---

**Questions or Issues?** Open an issue or update this document with your findings!

---

## Recent Updates

### 2026-01-27 - Experimentation Improvements

#### A/B Comparison Mode
Added interactive overlay comparison to easily verify silhouette alignment:
- **Radio controls**: Switch between "Silhouette", "Generated", "Click to Switch"
- **Click to Switch mode**: Hold mouse down to see generated, release to see silhouette
- **Perfect overlay**: Images align 100% for accurate comparison
- **Background removal disabled**: See raw AI output during experimentation

#### Filtering Controls
Added dimension-based filtering to comparison reports:
- **Filter by Theme**: Show/hide runs by theme (medieval, scifi, etc.)
- **Filter by Strength**: Show/hide runs by strength value (0.85, 0.90, 0.95)
- **Combined filtering**: Both filters work together with AND logic
- **Interactive buttons**: Click to toggle, green = active

#### Button/Checkbox Silhouettes Updated
- **Button**: Now 128×64 (2:1 ratio) - wider for text content
- **Checkbox**: Remains 64×64 (square) - standard checkbox shape

#### Usage Example
```bash
# Generate experiments with multiple themes and strengths
hush run -- npx tsx api/scripts/ui-experiment.ts \
  --type button \
  --theme "medieval, scifi, fantasy" \
  --strength 0.85,0.90,0.95

# Open comparison report (now with filtering!)
open debug-output/ui-experiments/*/comparison.html

# Use filters to compare:
# - Click "medieval" theme to see only medieval runs across all strengths
# - Click "0.95" strength to see only 0.95 runs across all themes
# - Click both to see only medieval + 0.95 combination
```

