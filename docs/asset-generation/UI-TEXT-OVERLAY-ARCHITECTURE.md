# UI Text/Icon Overlay Architecture

**Status:** Design Document  
**Created:** 2026-01-27  
**Purpose:** Design system for compositing text and icons on top of AI-generated UI backgrounds

---

## Problem Statement

Current approach tries to generate text in AI prompts ("button with text 'PLAY'"), which has several issues:
- AI is poor at generating readable text
- Each text variant requires separate generation
- Inconsistent results across generations
- Cannot reuse button backgrounds

## Solution: Post-Generation Compositing

Generate clean button backgrounds, then composite text/icons programmatically.

**Benefits:**
- Same background + different text = perfect consistency
- Full control over typography and styling
- Can use SVG icons (checkmarks, etc.)
- Reusable backgrounds
- No AI text generation issues

---

## Architecture Overview

### Pipeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: Silhouette with Text Hint                          │
│ ─────────────────────────────────────────────────────────── │
│ Create silhouette with light gray text placeholder          │
│ - Border: #404040 (dark gray) - decorative area            │
│ - Center: #808080 (medium gray) - stretchable              │
│ - Text hint: #E0E0E0 (very light gray) - text region       │
│ Result: AI knows to avoid decorating text area              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: AI Generation                                       │
│ ─────────────────────────────────────────────────────────── │
│ img2img transformation (strength 0.95)                       │
│ Result: Themed background with clear text area              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 3: Save Background + Metadata                          │
│ ─────────────────────────────────────────────────────────── │
│ Save to R2: button-medieval-bg.png                          │
│ Save metadata: text region coordinates                       │
│ Result: Reusable background asset                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 4: Text/Icon Compositing (Runtime or Build)           │
│ ─────────────────────────────────────────────────────────── │
│ Load background + Composite text/icon                        │
│ Result: Final button with text                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Design Decisions

### 1. Silhouette Text Hints

**Decision:** Use very light gray (#E0E0E0) text placeholder

**Rationale:**
- Light enough that AI won't interpret as decorative element
- Dark enough to guide AI to avoid that region
- Fits within existing three-tone silhouette system

**Implementation:**
```typescript
// Three-tone silhouette
const borderColor = { r: 64, g: 64, b: 64 };      // #404040 - decorative
const centerColor = { r: 128, g: 128, b: 128 };   // #808080 - stretchable
const textHintColor = { r: 224, g: 224, b: 224 }; // #E0E0E0 - text region
```

**Example for button:**
```
┌────────────────────────────────┐
│ ████████████████████████████ │ ← Border (#404040)
│ ██                        ██ │
│ ██  ░░░░░░░░░░░░░░░░░░  ██ │ ← Text hint (#E0E0E0)
│ ██  ░░░░ BUTTON ░░░░░░  ██ │
│ ██  ░░░░░░░░░░░░░░░░░░  ██ │
│ ██                        ██ │
│ ████████████████████████████ │
└────────────────────────────────┘
```

### 2. Metadata Schema

**Decision:** Extend existing metadata with overlay regions

**Current metadata:**
```typescript
{
  componentType: 'button',
  ninePatchMargins: { left: 12, right: 12, top: 12, bottom: 12 },
  width: 256,
  height: 128
}
```

**Extended metadata:**
```typescript
{
  componentType: 'button',
  ninePatchMargins: { left: 12, right: 12, top: 12, bottom: 12 },
  width: 256,
  height: 128,
  overlayRegions: {
    text?: {
      x: 128,           // Center X (absolute)
      y: 64,            // Center Y (absolute)
      width: 200,       // Max text width
      height: 80,       // Max text height
      align: 'center',  // Horizontal alignment
      verticalAlign: 'middle'
    },
    icon?: {
      x: 32,            // Icon center X
      y: 32,            // Icon center Y
      size: 24          // Icon size (square)
    }
  }
}
```

**For different control types:**
- **Button**: `text` region only
- **Checkbox**: `icon` region only (for checkmark)
- **Icon Button**: Both `icon` and `text` regions
- **Radio Button**: `icon` region only (for dot)

### 3. Compositing Strategy

**Decision:** Hybrid approach

**Generate:** Background only, save to R2  
**Build time:** Pre-composite common variants (optional)  
**Runtime:** Composite dynamic text as needed

**Rationale:**
- Maximum flexibility (can change text without regeneration)
- Performance optimization available (pre-composite common cases)
- Works with Godot's runtime rendering

**Pipeline stages:**
```typescript
// Generation (server-side)
1. Generate background → Save to R2
2. Save metadata with overlay regions

// Usage (client-side or build-time)
3. Load background
4. Composite text/icon using metadata
5. Cache result (optional)
```

### 4. Text Rendering

**Decision:** Use Canvas API with fallback to Godot

**For experimentation/preview (Node.js):**
- Use `node-canvas` or `sharp` with text rendering
- Generate preview images with text

**For production (Godot):**
- Use Godot's built-in Label/RichTextLabel
- Overlay on TextureRect with button background
- Theme-aware fonts

**Rationale:**
- Experimentation needs visual preview
- Production needs runtime flexibility
- Godot has excellent text rendering built-in

### 5. Icon System

**Decision:** SVG icons → rasterize at generation time

**For checkboxes:**
```typescript
const CHECKBOX_ICONS = {
  unchecked: null,  // Just background
  checked: '<svg>...</svg>',  // Checkmark SVG
  indeterminate: '<svg>...</svg>'  // Dash SVG
};
```

**Process:**
1. Generate checkbox background (no icon)
2. At composite time, rasterize SVG icon
3. Overlay on background at icon region

**Rationale:**
- SVG = scalable, theme-able
- Rasterize once, cache result
- Can tint SVG to match theme

### 6. Configuration Structure

**Decision:** Extend existing `ui-control-config.ts`

**New file:** `api/src/ai/pipeline/ui-overlay-config.ts`

```typescript
export interface OverlayRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

export interface IconRegion {
  x: number;
  y: number;
  size: number;
}

export interface SilhouetteHint {
  type: 'text' | 'icon';
  color: string;  // Hex color
  sample?: string;  // Sample text to render
  icon?: string;  // SVG path for icon
}

export interface UIOverlayConfig {
  text?: {
    region: OverlayRegion;
    hint: SilhouetteHint;
  };
  icon?: {
    region: IconRegion;
    hint: SilhouetteHint;
  };
}

export const UI_OVERLAY_CONFIGS: Record<string, UIOverlayConfig> = {
  button: {
    text: {
      region: {
        x: 128,  // Center of 256×128 button
        y: 64,
        width: 200,
        height: 80,
        align: 'center',
        verticalAlign: 'middle'
      },
      hint: {
        type: 'text',
        color: '#E0E0E0',
        sample: 'BUTTON'
      }
    }
  },
  
  checkbox: {
    icon: {
      region: {
        x: 32,  // Center of 64×64 checkbox
        y: 32,
        size: 32
      },
      hint: {
        type: 'icon',
        color: '#E0E0E0',
        icon: '<svg>...</svg>'  // Checkmark
      }
    }
  }
};
```

---

## File Structure

### New Files

```
api/src/ai/pipeline/
├── ui-overlay-config.ts          # Overlay region configs
├── silhouettes/
│   └── ui-component-overlay.ts   # Silhouette with text hints
└── stages/
    └── ui-composite.ts           # Text/icon compositing stage

api/scripts/
└── ui-composite-preview.ts       # Preview tool for compositing

shared/src/types/
└── ui-overlay.ts                 # Shared overlay types
```

### Modified Files

```
api/src/ai/pipeline/
├── stages/ui-component.ts        # Use new silhouette with hints
└── types.ts                      # Add overlay metadata types

api/scripts/
├── ui-experiment.ts              # Add compositing preview
└── ui-compare.ts                 # Show composited versions
```

---

## Implementation Phases

### Phase 1: Silhouette Hints (Experimentation)
**Goal:** Test if light gray text hints guide AI properly

**Tasks:**
1. Create `ui-component-overlay.ts` with text hint rendering
2. Update `ui-component.ts` to use new silhouette function
3. Add sample text ("BUTTON", "OK", etc.) to silhouettes
4. Generate experiments and verify AI respects text region

**Success Criteria:**
- AI-generated backgrounds have clear, undecorated text area
- Decorative elements stay in border region
- Text area is visually distinct in generated images

**Files:**
- `api/src/ai/pipeline/silhouettes/ui-component-overlay.ts` (new)
- `api/src/ai/pipeline/stages/ui-component.ts` (modify)

### Phase 2: Metadata Schema
**Goal:** Store overlay region information

**Tasks:**
1. Create `ui-overlay-config.ts` with region definitions
2. Extend metadata output to include overlay regions
3. Update R2 upload stage to save extended metadata

**Success Criteria:**
- Metadata JSON includes `overlayRegions`
- Coordinates are accurate for each control type
- Metadata is accessible from generated assets

**Files:**
- `api/src/ai/pipeline/ui-overlay-config.ts` (new)
- `api/src/ai/pipeline/stages/ui-component.ts` (modify)
- `api/src/ai/pipeline/types.ts` (modify)

### Phase 3: Compositing Preview Tool
**Goal:** Visualize text overlay on generated backgrounds

**Tasks:**
1. Create `ui-composite-preview.ts` script
2. Use `sharp` or `node-canvas` to composite text
3. Generate preview images with sample text
4. Add to comparison report

**Success Criteria:**
- Can generate button with "PLAY", "START", etc.
- Text is properly centered and sized
- Preview shows final result

**Files:**
- `api/scripts/ui-composite-preview.ts` (new)
- `api/scripts/ui-compare.ts` (modify)

### Phase 4: Icon System
**Goal:** Add checkmark/icon compositing

**Tasks:**
1. Create SVG icon library (checkmark, radio dot, etc.)
2. Add icon rasterization to composite tool
3. Generate checkbox with checkmark preview

**Success Criteria:**
- Checkbox shows checkmark in correct position
- Icon scales properly with control size
- Can tint icon to match theme

**Files:**
- `api/src/ai/pipeline/icons/` (new directory)
- `api/scripts/ui-composite-preview.ts` (modify)

### Phase 5: Godot Integration (Future)
**Goal:** Use composited assets in game engine

**Tasks:**
1. Export metadata to Godot-compatible format
2. Create Godot script to load background + overlay text
3. Test in themed UI gallery example

**Success Criteria:**
- Buttons render with dynamic text in Godot
- Text updates without regenerating background
- Performance is acceptable

**Files:**
- `godot_project/scripts/ui/ThemedUIWithText.gd` (new)
- `app/app/examples/themed_ui_with_text.tsx` (new)

---

## Experimentation Workflow

### Current Workflow
```bash
# Generate backgrounds
hush run -- npx tsx api/scripts/ui-experiment.ts \
  --type button \
  --theme "medieval, scifi" \
  --strength 0.95

# View results
open debug-output/ui-experiments/*/comparison.html
```

### New Workflow (After Phase 3)
```bash
# Generate backgrounds with text hints
hush run -- npx tsx api/scripts/ui-experiment.ts \
  --type button \
  --theme "medieval, scifi" \
  --strength 0.95

# Preview with composited text
hush run -- npx tsx api/scripts/ui-composite-preview.ts \
  --input debug-output/ui-experiments/latest \
  --text "PLAY,START,QUIT"

# View comparison (background vs composited)
open debug-output/ui-experiments/*/comparison-with-text.html
```

---

## Open Questions

### 1. Font Selection
**Question:** How do we choose fonts that match the theme?

**Options:**
- A) Hardcode font per theme (medieval = "Cinzel", scifi = "Orbitron")
- B) Let user specify font in theme config
- C) Use AI to suggest font based on theme
- D) Always use same font, vary color/effects

**Recommendation:** Start with option A (hardcoded), add B later

### 2. Text Sizing
**Question:** How do we ensure text fits in the region?

**Options:**
- A) Fixed font size, truncate if too long
- B) Auto-scale font to fit region
- C) Multi-line text with word wrap
- D) User specifies font size

**Recommendation:** Start with B (auto-scale), add C for long text

### 3. Theme Consistency
**Question:** Should text color match the generated background?

**Options:**
- A) Always white text with drop shadow
- B) Extract dominant color from background, use contrasting text
- C) User specifies text color per theme
- D) AI suggests text color based on background

**Recommendation:** Start with A (white + shadow), add B later

### 4. Caching Strategy
**Question:** Should we cache composited results?

**Options:**
- A) No caching, composite on every render
- B) Cache in memory (session-based)
- C) Cache to disk (persistent)
- D) Pre-generate common variants at build time

**Recommendation:** Start with A (no cache), add C for production

---

## Success Metrics

### Phase 1 Success
- [ ] AI respects text hint region (no decorations in text area)
- [ ] Text area is visually clear in 90%+ of generations
- [ ] Can generate 10 different themes with consistent text regions

### Phase 2 Success
- [ ] Metadata accurately describes text/icon regions
- [ ] Coordinates work across different control sizes
- [ ] Can programmatically access region data

### Phase 3 Success
- [ ] Can composite text on any generated background
- [ ] Text is readable and properly positioned
- [ ] Preview tool generates comparison images

### Phase 4 Success
- [ ] Checkboxes show checkmarks in correct position
- [ ] Icons scale properly with control size
- [ ] Can generate 5+ icon variants

---

## Next Steps

1. **Review this design** with user
2. **Start Phase 1** - Implement silhouette hints
3. **Test with experiments** - Verify AI respects hints
4. **Iterate on hint color/style** - Find optimal guidance
5. **Proceed to Phase 2** - Add metadata schema

---

## References

- [UI Generation Guide](./UI-GENERATION-GUIDE.md)
- [Asset Pipeline](../asset-pipeline.md)
- [Silhouette-Based Generation](../plans/aspect-ratio-canvas-generation.md)
