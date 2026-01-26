# Draft: Godot UI Theming System

## Requirements (confirmed)

### User's Goal
Plan a holistic UI theming system that connects:
1. Game engine schemas/types
2. AI-generated assets (images for buttons, checkboxes, etc.)
3. Godot's theming system (StyleBoxTexture, nine-patch, theme items)

### Context Provided
- Godot theming schema documentation (six data types: Colors, Constants, Fonts, Font Sizes, Icons, StyleBoxes)
- StyleBoxTexture for nine-patch rendering
- Button states: normal, hover, pressed, disabled, focus, hover_pressed
- Existing UI component generation work (completed: `.sisyphus/completed/2026-01/ui-component-generation.md`)

### Existing Work Found
- **POC Complete**: CheckBox generation with themed nine-patch backgrounds
- **Files**: 
  - `api/src/ai/pipeline/types.ts` - UIComponentSheetSpec interface
  - `api/src/ai/pipeline/prompt-builder.ts` - buildUIComponentPrompt()
  - `godot_project/scripts/ui/ThemedUIComponent.gd` - Generic component loader
  - `api/src/trpc/routes/ui-components.ts` - Generation API
- **Coverage**: Button and CheckBox (POC level)
- **Missing**: Other controls (Slider, ProgressBar, ScrollBar, Panel, etc.)

## Technical Decisions

### Asset Generation Approach
- **Nine-patch textures** for stretchable backgrounds (StyleBoxTexture)
- **Small icons** (16x16, 24x24) for checkmarks, arrows, grabbers
- **Sequential generation**: Base state (normal) → Variations (hover, pressed, disabled)
- **Storage**: R2 with metadata JSON per component

### Godot Integration
- **StyleBoxTexture**: Maps nine-patch margins to texture_margin_left/right/top/bottom
- **Theme overrides**: add_theme_stylebox_override() per control state
- **Dynamic loading**: HTTPRequest → ImageTexture → StyleBoxTexture

## Research Findings

### Godot Theme Schema (from user)
| Control Type | StyleBoxes Needed | Icons Needed |
|--------------|-------------------|--------------|
| Button | normal, hover, pressed, disabled, focus | icon (optional) |
| CheckBox | normal, hover, pressed, disabled, focus, hover_pressed | checked, unchecked, checked_disabled, unchecked_disabled |
| Panel | panel | none |
| LineEdit | normal, focus, read_only | clear |
| HScrollBar/VScrollBar | scroll, scroll_focus, grabber, grabber_highlight, grabber_pressed | increment, decrement (+ highlight/pressed) |
| HSlider/VSlider | slider, grabber_area, grabber_area_highlight | grabber, grabber_highlight, grabber_disabled, tick |
| ProgressBar | background, fill | none |
| TabBar | tab_selected, tab_unselected, tab_hovered, tab_disabled, tab_focus | increment, decrement, close, drop_mark |

### Existing Implementation (POC) - Detailed

**✅ COMPLETED (via `.sisyphus/completed/2026-01/ui-component-generation.md`):**

#### Type System
- `api/src/ai/pipeline/types.ts`:
  - `UIComponentSheetSpec` with fields: `componentType`, `states[]`, `ninePatchMargins`, `baseResolution`, `iconStrategy`
  - Added to `SheetKind` enum: `'ui_component'`
  - Type guard: `isUIComponentSpec(spec)`

#### Generation Pipeline
- `api/src/ai/pipeline/silhouettes/ui-component.ts`:
  - `createNinePatchSilhouette()` - Creates margin-guided silhouette (dark borders, lighter center)
  - Exported constants: `UI_COMPONENT_MARGINS = { small: 8, medium: 12, large: 16 }`
- `api/src/ai/pipeline/prompt-builder.ts`:
  - `buildUIComponentPrompt()` - State-specific prompts with nine-patch instructions
  - Emphasizes "decorative borders and clean center area suitable for nine-patch scaling"
- `api/src/ai/pipeline/stages/ui-component.ts`:
  - `baseStateGenerationStage` - Generates normal state (silhouette → img2img @ strength=0.95)
  - `variationStateGenerationStage` - Generates other states using base as reference (strength=0.7)
  - `buildUIMetadataStage` - Creates metadata JSON + uploads all states to R2

#### Godot Integration
- `godot_project/scripts/ui/ThemedUIComponent.gd`:
  - Generic component loader (supports Button and CheckBox enum)
  - Loads metadata JSON from URL
  - Downloads state textures via HTTPRequest
  - Creates StyleBoxTexture with nine-patch margins from metadata
  - Applies theme overrides: `add_theme_stylebox_override(state, stylebox)`
- `godot_project/scripts/ui/ThemedCheckbox.gd`:
  - Specialized checkbox implementation (legacy, superseded by ThemedUIComponent)

#### API & Database
- `api/src/trpc/routes/ui-components.ts`:
  - `generateUIComponent` mutation
  - Accepts theme (string or structured object), componentType, states
- Database schema extended:
  - `asset_packs` table has `component_type`, `nine_patch_margins_json`, `generation_strategy` columns

#### Test Scripts & Examples
- `api/scripts/generate-ui-button.ts` - CLI test for button generation
- `api/scripts/generate-ui-checkbox.ts` - CLI test for checkbox generation
- `app/app/examples/ui_components.tsx` - React Native example screen
- `debug-output/ui-button-test/REPORT.md` - Test report with sample prompts

### Bridge Integration
From `GameBridge.gd` exploration:
- **Current UI Methods**:
  - `createUIButton(id, x, y, width, height, text, metadata_url)`
  - `destroyUIButton(id)`
  - `onUIButtonEvent(id, event_type)` - For handling press events
- **How it works**: GameBridge instantiates ThemedUIComponent nodes dynamically based on React Native calls
- **Asset Loading**: Uses HTTPRequest in Godot to fetch textures, or native bridge pre-downloads via `expo-file-system`

### Current UI Architecture (Hybrid System)
**Two parallel systems found:**

1. **React Native HUD** (`GameHUD.tsx`):
   - Renders game stats: score, timer, lives, entity counts, variables
   - Uses standard RN components (View, Text, TouchableOpacity)
   - Positioned in screen space with absolute positioning
   - Controlled by `UIConfig` in GameDefinition
   - ✅ Already working and styled

2. **Godot-Native UI** (`UIManager.gd`):
   - Creates native Godot controls (currently only TextureButton exposed)
   - Positioned in Godot coordinate system
   - Called via `bridge.createUIButton()`
   - 🎯 **THIS IS WHERE THEMED UI FITS**
   - ThemedUIComponent.gd loads AI-generated backgrounds

3. **Virtual Input Overlays**:
   - Specialized RN overlays: VirtualJoystick, VirtualDPad, VirtualButtons
   - Send input events to game engine
   - Separate from themed UI system

## Open Questions - RESOLUTION SUMMARY

**All questions answered! Ready for plan generation.**

Key decisions:
1. ✅ **Scope**: 6 controls (Button✅, CheckBox✅, Panel, ProgressBar, ScrollBar, TabBar)
2. ✅ **Icon Strategy**: SVG silhouettes with embedded symbols → img2img → themed assets
3. ✅ **Nine-patch margins**: Hardcoded per control type (sensible defaults)
4. ✅ **Theme generation**: Flexible batch API (all controls or subset)
5. ✅ **Godot architecture**: Generic ThemedUIComponent.gd with enum
6. ✅ **Exploration needs**: Prompt tuning + SVG validation (iterative experimentation)

## ORIGINAL Open Questions Archive

### Scope
1. **Which controls to support?** ✅ ANSWERED
   - **Target controls (6 total)**:
     1. Button ✅ (POC done)
     2. CheckBox ✅ (POC done)
     3. Panel (new)
     4. ProgressBar (new)
     5. ScrollBar (new - includes HScrollBar and VScrollBar)
     6. TabBar (new)
   - **Skipped**: LineEdit (text input - not needed for game UIs), Tree, ItemList, PopupMenu, Window

2. **Icon generation strategy?** ✅ ANSWERED
   - **Strategy**: SVG silhouettes with embedded symbols → img2img → Themed assets
   - **How it works**:
     1. Create grayscale SVG silhouette with shapes (rounded rects, circles) + symbols (checkmark, arrows)
     2. Composite silhouette includes nine-patch margin guidance (darker borders, lighter center)
     3. Feed to img2img → AI generates themed version that matches the silhouette structure
     4. Result: Themed UI element with integrated symbols (not separate icon files)
   - **Benefits**:
     - Theme consistency (AI sees the full composition)
     - Fewer assets to manage (one PNG per state, not PNG + separate icon)
     - Clear visual guidance for AI (silhouette shows exactly where checkmark/arrows go)
   - **Examples**:
     - CheckBox: Silhouette with checkmark symbol → Themed checkbox with integrated checkmark
     - ScrollBar arrows: Silhouette with up/down triangles → Themed arrow buttons
     - Tab close button: Silhouette with X symbol → Themed close button

3. **Theme consistency across controls?** ✅ ANSWERED
   - **Strategy**: Flexible batch generation
   - **API Design**: `generateUITheme({ theme: string, controls: string[] })`
     - Can generate all controls at once: `controls: ["button", "checkbox", "panel", "progressBar", "scrollBar", "tabBar"]`
     - Or a subset: `controls: ["button", "panel"]`
     - Or re-prompt one: `controls: ["scrollBar"]`
   - **Implementation**: Same as asset pipeline - array of generation requests
   - **Consistency**: Same theme prompt ensures visual coherence when batch-generating
   - **Flexibility**: Users can regenerate individual controls if needed

### Technical Gaps
4. **Nine-patch margin detection?** ✅ ANSWERED
   - **Strategy**: Hardcoded per control type
   - **Margin Defaults**:
     - Button: 12px (POC standard)
     - CheckBox: 12px (POC standard)
     - Panel: 16px (chunkier decorative frames)
     - ProgressBar: 8px (thin borders, space for fill)
     - ScrollBar: 8px (compact UI element)
     - TabBar: 12px (moderate borders)
   - **Rationale**: Predictable, fast, no ML/edge detection needed for MVP

5. **Godot Component Architecture** ✅ ANSWERED
   - **Strategy**: Extend ThemedUIComponent.gd to support all control types
   - **Current**: Enum with BUTTON, CHECKBOX
   - **Add**: PANEL, PROGRESS_BAR, SCROLL_BAR, TAB_BAR
   - **Implementation**: Switch/match on component_type to instantiate correct Godot node
     - BUTTON → `Button.new()`
     - CHECKBOX → `CheckBox.new()`
     - PANEL → `Panel.new()`
     - PROGRESS_BAR → `ProgressBar.new()`
     - SCROLL_BAR → `HScrollBar.new()` or `VScrollBar.new()`
     - TAB_BAR → `TabBar.new()`
   - **Benefits**: Single component, less code duplication, consistent styling logic

6. **GameBridge Methods** (Need to add)
   - Current: `createUIButton(id, x, y, w, h, text, metadata_url)`, `destroyUIButton(id)`
   - Add generic: `createUIControl(id, type, x, y, w, h, config_json, metadata_url)`
   - Or specific: `createUIPanel()`, `createUIProgressBar()`, etc.
   - Decision: Probably generic `createUIControl()` since ThemedUIComponent is generic

6. **Missing control types implementation?**
   - Slider: Needs grabber icon + track StyleBox
   - ScrollBar: Needs arrows (icons) + grabber + track
   - ProgressBar: Needs background + fill StyleBoxes
   - Panel: Just one StyleBox, simplest

## Scope Boundaries

### INCLUDE
- All Godot control types with AI-generated StyleBoxes
- Icon generation strategy (vector vs AI)
- Metadata schema for each control type
- Godot Theme resource generation (optional vs dynamic loading)

### EXCLUDE (Defer to later)
- Animated state transitions
- Theme editing UI
- Multiple themes per game (just one theme per generation)
- Accessibility features (screen reader, ARIA)
