# UI Generation Admin Panel - Implementation Plan

**Status:** Ready for Implementation  
**Created:** 2026-01-26  
**Purpose:** Build an admin panel for experimenting with Scenario.com UI component generation

---

## Executive Summary

Build `packages/ui-gen-viewer` - a Vite + React + TypeScript web application for experimenting with Scenario.com's UI component generation. This is an **internal admin tool** for rapid iteration on generation parameters.

### Key Features
1. **Parameter Configuration** - All generation parameters configurable via UI
2. **Live Results** - WebSocket-based live updates as results are generated and saved to disk
3. **Shared Code** - Imports generation helpers directly from `api` package
4. **SVG Selection** - Pick from available silhouette SVGs (starting with checkbox)
5. **Font Selection** - Choose fonts for text overlays (eventually Google Fonts)
6. **Text Effects Compositing** - Photoshop-style text effects for button text overlays (future)

### Tech Stack
- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS
- **State:** Jotai (user preference over Zustand)
- **Backend:** Express + WebSocket (for live updates)
- **Persistence:** Results stored on disk with file watching

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Form Controls│  │ Results Grid │  │ Text Effects Preview │   │
│  │ (Jotai atoms)│  │ (live via WS)│  │ (future compositing) │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express + WebSocket Server                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ POST /generate│  │ GET /results │  │ WS /ws (file watch) │   │
│  │ POST /preview │  │              │  │ chokidar on disk    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Imports from @slopcade/api
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Generation Pipeline                          │
│  • buildUIComponentPrompt()                                      │
│  • createNinePatchSilhouette() / SVG silhouettes                │
│  • Scenario.com img2img API                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Results Storage (Disk)                       │
│  debug-output/ui-gen-viewer/                                     │
│  ├── results.json (index)                                        │
│  └── results/{timestamp}-{id}/                                   │
│      ├── silhouette.png                                          │
│      ├── generated.png                                           │
│      └── metadata.json                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Package Foundation

### Task 1.1: Create Package Scaffold
**Description:** Create `packages/ui-gen-viewer` with Vite + React + TypeScript + Tailwind.

**Files to create:**
```
packages/ui-gen-viewer/
├── package.json              # @slopcade/ui-gen-viewer
├── tsconfig.json             # composite: true
├── vite.config.ts            # React plugin, Tailwind, aliases
├── tailwind.config.js        
├── postcss.config.js         
├── index.html                
├── server/
│   └── index.ts              # Express + WebSocket server
└── src/
    ├── main.tsx              # React bootstrap
    ├── App.tsx               # Shell component
    └── index.css             # Tailwind directives
```

**Delegation:**
- **Category:** `quick`
- **Skills:** `[]`
- **Rationale:** Boilerplate scaffolding with known patterns

---

### Task 1.2: Configure Monorepo Integration
**Description:** Update root configs for the new package.

**Changes:**
- Add to `turbo.json` build graph
- Add `pnpm ui-gen` script to root package.json
- Configure Vite aliases to resolve `@slopcade/api`

**Delegation:**
- **Category:** `quick`
- **Skills:** `[]`

---

## Phase 2: Backend Server

### Task 2.1: Create Express + WebSocket Server
**Description:** Backend handling generation requests and live file watching.

**File:** `packages/ui-gen-viewer/server/index.ts`

**Endpoints:**
- `POST /api/generate` - Trigger generation (calls shared pipeline code)
- `POST /api/preview-prompt` - Preview prompt without generating
- `GET /api/results` - List all saved results from disk
- `GET /api/svgs` - List available SVG silhouettes
- `GET /api/fonts` - List available fonts
- `WebSocket /ws` - Push new results on file changes

**Key imports from `api` package:**
```typescript
import { buildUIComponentPrompt } from '@slopcade/api/ai/pipeline/prompt-builder';
import { UI_CONTROL_CONFIG, getControlStates } from '@slopcade/api/ai/pipeline/ui-control-config';
import { createNinePatchSilhouette } from '@slopcade/api/ai/pipeline/silhouettes';
```

**File watching with chokidar:**
```typescript
import chokidar from 'chokidar';

const watcher = chokidar.watch('debug-output/ui-gen-viewer/results/**/*.json');
watcher.on('add', (path) => {
  // Parse new result and broadcast to all WebSocket clients
  broadcastNewResult(path);
});
```

**Delegation:**
- **Category:** `unspecified-high`
- **Skills:** `[]`
- **Rationale:** Integration work with WebSocket complexity

---

### Task 2.2: Define Result Storage Format
**Description:** Define storage format and TypeScript types.

**Directory structure:**
```
debug-output/ui-gen-viewer/
├── results.json              # Index of all results (optional)
└── results/
    └── {timestamp}-{id}/
        ├── silhouette.png
        ├── generated.png
        ├── metadata.json     # Full params, prompts, timing
        └── prompt.txt
```

**Types file:** `src/types/result.ts`
```typescript
export interface GenerationParams {
  controlType: string;
  theme: string;
  strength: number;
  state: string;
  promptModifier: string;
  svgVariant: string;
  font: string;
}

export interface StoredResult {
  id: string;
  timestamp: string;
  params: GenerationParams;
  files: {
    silhouette: string;  // relative path
    generated: string;
  };
  prompts: {
    positive: string;
    negative: string;
  };
  timing: {
    silhouetteMs: number;
    generationMs: number;
    totalMs: number;
  };
}
```

**Delegation:**
- **Category:** `quick`
- **Skills:** `[]`

---

## Phase 3: State Management (Jotai)

### Task 3.1: Create Jotai Atoms
**Description:** Set up Jotai atoms for form state and results.

**File:** `src/atoms/index.ts`

```typescript
import { atom } from 'jotai';
import { getControlStates, UI_CONTROL_CONFIG } from '@slopcade/api/ai/pipeline/ui-control-config';

// Form state atoms
export const controlTypeAtom = atom<string>('button');
export const themesAtom = atom<string[]>(['cyberpunk neon']);
export const strengthsAtom = atom<number[]>([0.85]);
export const statesAtom = atom<string[]>(['normal']);
export const promptModifierAtom = atom<string>('');

// SVG selection
export const availableSvgsAtom = atom<string[]>(['default', 'checkbox-v1', 'checkbox-v2']);
export const selectedSvgAtom = atom<string>('default');

// Font selection
export const availableFontsAtom = atom<string[]>(['Inter', 'Roboto', 'Open Sans', 'Montserrat']);
export const selectedFontAtom = atom<string>('Inter');

// Results (synced with disk via WebSocket)
export const resultsAtom = atom<StoredResult[]>([]);
export const isGeneratingAtom = atom<boolean>(false);
export const wsConnectedAtom = atom<boolean>(false);

// Derived atoms
export const availableStatesAtom = atom((get) => {
  const controlType = get(controlTypeAtom);
  return getControlStates(controlType as any) || ['normal'];
});

export const batchCountAtom = atom((get) => {
  const themes = get(themesAtom);
  const strengths = get(strengthsAtom);
  const states = get(statesAtom);
  return themes.length * strengths.length * states.length;
});
```

**Delegation:**
- **Category:** `quick`
- **Skills:** `[]`

---

### Task 3.2: WebSocket Hook for Live Results
**Description:** Hook that connects to WebSocket and updates results.

**File:** `src/hooks/useResultsSync.ts`

```typescript
import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { resultsAtom, wsConnectedAtom } from '../atoms';

export function useResultsSync() {
  const setResults = useSetAtom(resultsAtom);
  const setWsConnected = useSetAtom(wsConnectedAtom);
  
  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.hostname}:3001/ws`);
    
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'new-result') {
        setResults(prev => [msg.result, ...prev]);
      } else if (msg.type === 'initial-results') {
        setResults(msg.results);
      }
    };
    
    return () => ws.close();
  }, [setResults, setWsConnected]);
}
```

**Delegation:**
- **Category:** `quick`
- **Skills:** `[]`

---

## Phase 4: Core UI Components

### Task 4.1: Control Type Selector
**Description:** Dropdown populated from `UI_CONTROL_CONFIG`.

**Component:** `src/components/ControlTypeSelector.tsx`

**Requirements:**
- Options from `Object.keys(UI_CONTROL_CONFIG)`
- Show control dimensions as hint text
- On change, reset available states

**Delegation:**
- **Category:** `visual-engineering`
- **Skills:** `["frontend-ui-ux"]`

---

### Task 4.2: SVG Picker
**Description:** Dropdown to select silhouette SVG variants.

**Component:** `src/components/SvgPicker.tsx`

**Requirements:**
- Start with checkbox SVG variations (from `api/src/ai/pipeline/silhouettes/`)
- Show thumbnail preview of selected SVG
- Lazy load SVG previews

**Delegation:**
- **Category:** `visual-engineering`
- **Skills:** `["frontend-ui-ux"]`

---

### Task 4.3: Font Picker
**Description:** Dropdown to select font for text overlays.

**Component:** `src/components/FontPicker.tsx`

**Requirements:**
- Initial fonts: Inter, Roboto, Open Sans, Montserrat
- Show font name rendered in that font
- Later: integrate Google Fonts API for more options

**Font list (from text-shadertoy FONT_URLS):**
```
Roboto, Open Sans, Lato, Montserrat, Oswald, Raleway, 
Poppins, Playfair Display, Merriweather, Ubuntu, Nunito, 
Rubik, Work Sans, Bebas Neue, Anton, Lobster, Pacifico, 
Dancing Script, Permanent Marker, Bangers, Righteous, 
Abril Fatface, Alfa Slab One, Black Ops One, Bungee
```

**Delegation:**
- **Category:** `visual-engineering`
- **Skills:** `["frontend-ui-ux"]`

---

### Task 4.4: Theme Input
**Description:** Text field with autocomplete for themes.

**Component:** `src/components/ThemeInput.tsx`

**Requirements:**
- Autocomplete with common themes
- Support comma-separated for batch entry
- Display theme chips that can be removed
- "Add" button to add current input to list

**Delegation:**
- **Category:** `visual-engineering`
- **Skills:** `["frontend-ui-ux"]`

---

### Task 4.5: Strength Slider
**Description:** Slider(s) for AI transformation strength.

**Component:** `src/components/StrengthSlider.tsx`

**Requirements:**
- Range: 0.0 to 1.0, step 0.05
- Visual hint: "lower = more silhouette-like, higher = more creative"
- Support multiple values for batch
- "Add another" button

**Delegation:**
- **Category:** `visual-engineering`
- **Skills:** `["frontend-ui-ux"]`

---

### Task 4.6: State Selector
**Description:** Chips for selecting control states.

**Component:** `src/components/StateSelector.tsx`

**Requirements:**
- Available states depend on control type (from `getControlStates`)
- Multi-select chips
- Visual indication of base/default state

**Delegation:**
- **Category:** `visual-engineering`
- **Skills:** `["frontend-ui-ux"]`

---

### Task 4.7: Prompt Modifier Input
**Description:** Textarea for additional prompt text.

**Component:** `src/components/PromptModifierInput.tsx`

**Requirements:**
- Multi-line textarea
- Character count display
- Placeholder with example modifiers

**Delegation:**
- **Category:** `visual-engineering`
- **Skills:** `["frontend-ui-ux"]`

---

### Task 4.8: Prompt Preview Panel
**Description:** Live preview of generated prompt.

**Component:** `src/components/PromptPreview.tsx`

**Requirements:**
- Updates live as parameters change
- Shows both positive and negative prompts
- Copy button for each
- Collapsible sections

**Delegation:**
- **Category:** `visual-engineering`
- **Skills:** `["frontend-ui-ux"]`

---

## Phase 5: Generation & Results

### Task 5.1: Generate Button
**Description:** Button to trigger generation.

**Component:** `src/components/GenerateButton.tsx`

**Requirements:**
- Shows batch count: "Generate 6 variations"
- Disabled when generating
- Progress indicator during generation
- Cancel button for long batches

**Delegation:**
- **Category:** `visual-engineering`
- **Skills:** `["frontend-ui-ux"]`

---

### Task 5.2: Results Grid (Live Updating)
**Description:** Grid of results that updates via WebSocket.

**Component:** `src/components/ResultsGrid.tsx`

**Requirements:**
- Cards appear automatically when new results arrive
- Filter by theme, strength, state, control type
- Sort by timestamp (newest first default)
- Click card for detail view

**Delegation:**
- **Category:** `visual-engineering`
- **Skills:** `["frontend-ui-ux"]`

---

### Task 5.3: Result Card with A/B Comparison
**Description:** Card showing silhouette vs generated.

**Component:** `src/components/ResultCard.tsx`

**Requirements:**
- Side-by-side: silhouette | generated
- Click-and-hold to toggle (A/B comparison)
- Shows: theme, strength, state badges
- Download button

**Delegation:**
- **Category:** `visual-engineering`
- **Skills:** `["frontend-ui-ux"]`

---

## Phase 6: Layout & Polish

### Task 6.1: Main Layout
**Description:** Overall app layout.

**Component:** `src/components/Layout.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Header: UI Generation Viewer    [Status: ●]    │
├────────────────┬────────────────────────────────┤
│                │                                │
│   Sidebar      │        Results Grid            │
│   (controls)   │        (live updating)         │
│                │                                │
│   - Type       │   ┌────┐ ┌────┐ ┌────┐        │
│   - SVG        │   │Card│ │Card│ │Card│        │
│   - Font       │   └────┘ └────┘ └────┘        │
│   - Theme      │                                │
│   - Strength   │   ┌────┐ ┌────┐ ┌────┐        │
│   - State      │   │Card│ │Card│ │Card│        │
│   - Modifier   │   └────┘ └────┘ └────┘        │
│   - Preview    │                                │
│                │                                │
│   [Generate]   │                                │
│                │                                │
└────────────────┴────────────────────────────────┘
```

**Delegation:**
- **Category:** `visual-engineering`
- **Skills:** `["frontend-ui-ux"]`

---

### Task 6.2: Connection Status Indicator
**Description:** Show WebSocket connection status.

**Component:** `src/components/ConnectionStatus.tsx`

**Requirements:**
- Green dot when connected
- Red dot + "Reconnecting..." when disconnected
- Auto-reconnect with exponential backoff

**Delegation:**
- **Category:** `quick`
- **Skills:** `[]`

---

## Phase 7: Text Effects & Silhouette Rendering

### Key Decision: Godot as Unified Renderer

**RECOMMENDATION: Use Godot for ALL rendering (text effects, silhouettes, previews)**

After analyzing both the `text-shadertoy` codebase and Godot's existing shader capabilities, Godot is the clear winner for maintaining consistency across the engine and experimentation tools.

---

### Analysis: Can Godot Match text-shadertoy Effects?

| Effect | text-shadertoy | Godot Existing | Godot Feasibility |
|--------|----------------|----------------|-------------------|
| **Fill (solid)** | ✅ | ✅ tint.gdshader | Already done |
| **Fill (gradient)** | ✅ linear/radial | ⚠️ rainbow.gdshader (UV-based) | Easy - just needs UV gradient |
| **Stroke/Outline** | ✅ outside/center/inside | ✅ outline.gdshader (inner only) | Medium - add outer stroke |
| **Drop Shadow** | ✅ offset + blur + spread | ✅ drop_shadow.gdshader | Already done |
| **Inner Shadow** | ✅ | ⚠️ inner_glow.gdshader (similar) | Easy - invert direction |
| **Outer Glow** | ✅ | ✅ glow.gdshader | Already done |
| **Inner Glow** | ✅ | ✅ inner_glow.gdshader | Already done |
| **Bevel/Emboss** | ✅ full Photoshop-style | ❌ Not implemented | Medium - directional normal sampling |
| **Distortion** | ✅ wave/bulge/pinch/twist/flag/fisheye/inflate | ✅ wave.gdshader (partial) | Medium - port remaining types |
| **Blend Modes** | ✅ 12 modes | ✅ color_utils.gdshaderinc (8 modes) | Already done |
| **HSV/HSL** | ✅ | ✅ color_utils.gdshaderinc | Already done |

**Verdict: Godot can achieve 90%+ parity with ~2-3 days of shader work.**

---

### Pros & Cons: Godot vs Node-Canvas vs Headless Browser

| Approach | Pros | Cons |
|----------|------|------|
| **Godot (RECOMMENDED)** | • Consistent with game engine<br>• GPU-accelerated<br>• Already have shader library<br>• Cross-platform (web WASM, native)<br>• Can preview in real-time<br>• Single codebase for rendering | • Need to run Godot headless for pipeline<br>• Learning curve for non-Godot devs |
| **Node-canvas** | • Pure Node.js<br>• Simple to integrate in pipeline | • CPU-only, slow<br>• Different visual output<br>• Must reimplement all effects<br>• No shader support |
| **Headless Browser (Puppeteer)** | • Use text-shadertoy as-is<br>• Faithful to original | • Heavy dependency<br>• Another rendering engine<br>• Slow startup<br>• Yet another codebase |

---

### Recommended Architecture: Godot as Rendering Service

```
┌─────────────────────────────────────────────────────────────────┐
│                    UI Gen Viewer (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Form Controls│  │ Results Grid │  │ Live Preview (iframe) │   │
│  │ (Jotai atoms)│  │ (WebSocket)  │  │ → Godot WASM embed   │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Godot Rendering Service                       │
│                                                                  │
│  Mode 1: Embedded Preview (WASM in browser)                     │
│  - Real-time text effect preview                                 │
│  - Interactive parameter tweaking                                │
│  - Same shaders as production                                    │
│                                                                  │
│  Mode 2: Headless Export (CLI)                                  │
│  - godot --headless --script render_text.gd                     │
│  - Outputs PNG with effects applied                              │
│  - Called from generation pipeline                               │
│                                                                  │
│  Mode 3: Silhouette Generation                                  │
│  - Generate SVG/PNG silhouettes using Godot                     │
│  - Consistent with physics shapes                                │
└─────────────────────────────────────────────────────────────────┘
```

---

### What Needs to Be Built in Godot

**New Shaders (port from text-shadertoy):**

1. **gradient_fill.gdshader** - Linear/radial gradients with angle control
2. **outer_stroke.gdshader** - Stroke rendered outside the shape
3. **bevel.gdshader** - Photoshop-style bevel/emboss
4. **distortion_pack.gdshader** - bulge, pinch, twist, flag, fisheye, inflate

**New Scripts:**

1. **TextEffectsRenderer.gd** - Applies multiple effects to Label/RichTextLabel
2. **SilhouetteGenerator.gd** - Generates black-on-white silhouettes from shapes
3. **ExportService.gd** - Headless mode for pipeline integration

**Bridge Extensions:**

1. `render_text_to_png(text, effects_config, output_path)` - For pipeline
2. `generate_silhouette(shape_config, output_path)` - For silhouettes

---

### Effect Types to Copy from text-shadertoy

Copy the TYPE DEFINITIONS only (not the shader code - we'll use Godot shaders):

```
text-shadertoy/src/effects/types.ts → shared/src/types/text-effects.ts
text-shadertoy/src/effects/presets.ts → shared/src/types/text-effect-presets.ts
```

These define:
- `TextEffectsConfig` - Full config for all effects
- `GradientConfig`, `StrokeConfig`, `ShadowConfig`, `GlowConfig`, `BevelConfig`, `DistortionConfig`
- `PRESETS` - Neon Glow, Gold Emboss, Chrome, Fire, Glossy Button

The Godot shaders will read the same config format, ensuring consistency.

---

### Implementation Plan for Godot Rendering

#### Task 7.1: Copy Text Effects Types
**Description:** Port types and presets from text-shadertoy to shared package.

**Files to create:**
- `shared/src/types/text-effects.ts` - Effect config interfaces
- `shared/src/types/text-effect-presets.ts` - Preset configurations

**Delegation:**
- **Category:** `quick`
- **Skills:** `[]`

---

#### Task 7.2: Create Godot Gradient Fill Shader
**Description:** Shader supporting linear and radial gradients with configurable angle and stops.

**File:** `godot_project/shaders/sprite/gradient_fill.gdshader`

**Features:**
- Linear gradient with angle uniform
- Radial gradient from center
- Up to 8 color stops (match text-shadertoy)
- Blend with existing texture

**Delegation:**
- **Category:** `unspecified-high`
- **Skills:** `[]`

---

#### Task 7.3: Create Godot Outer Stroke Shader  
**Description:** Stroke rendered OUTSIDE the shape (current outline.gdshader is inner-only).

**File:** `godot_project/shaders/sprite/outer_stroke.gdshader`

**Approach:** Sample outward from edges, draw stroke in transparent areas adjacent to opaque pixels.

**Delegation:**
- **Category:** `unspecified-high`
- **Skills:** `[]`

---

#### Task 7.4: Create Godot Bevel/Emboss Shader
**Description:** Photoshop-style bevel with directional lighting.

**File:** `godot_project/shaders/sprite/bevel.gdshader`

**Features:**
- Light angle and altitude uniforms
- Highlight and shadow colors
- Depth/size controls
- Direction (up/down)

**Approach:** 
1. Sample alpha at `UV + light_direction_offset` and `UV - light_direction_offset`
2. Compare to create pseudo-normal
3. Apply highlight where facing light, shadow where facing away
4. Use `color_utils.gdshaderinc` blend modes

**Delegation:**
- **Category:** `unspecified-high`
- **Skills:** `[]`

---

#### Task 7.5: Create Godot Distortion Pack Shader
**Description:** Port remaining distortion types from text-shadertoy.

**File:** `godot_project/shaders/sprite/distortion.gdshader`

**Types to implement:**
- bulge (expand from center)
- pinch (contract to center)
- twist (rotate around Y axis based on X position)
- flag (wave with increasing amplitude)
- fisheye (radial lens distortion)
- inflate (3D-ish bulge)

**Note:** Current `wave.gdshader` already exists - extend or create unified distortion shader.

**Delegation:**
- **Category:** `unspecified-high`
- **Skills:** `[]`

---

#### Task 7.6: Create TextEffectsRenderer Script
**Description:** GDScript that applies multiple effects to a Label node.

**File:** `godot_project/scripts/effects/TextEffectsRenderer.gd`

**Features:**
```gdscript
class_name TextEffectsRenderer

func apply_effects(label: Label, config: Dictionary) -> void:
    # config matches TextEffectsConfig from shared/src/types/text-effects.ts
    if config.fill.enabled:
        _apply_fill(label, config.fill)
    if config.stroke.enabled:
        _apply_stroke(label, config.stroke)
    if config.dropShadow.enabled:
        _apply_drop_shadow(label, config.dropShadow)
    # ... etc
```

**Delegation:**
- **Category:** `unspecified-high`
- **Skills:** `[]`

---

#### Task 7.7: Create Headless Export Service
**Description:** Script to render text/silhouettes to PNG in headless mode.

**File:** `godot_project/scripts/services/ExportService.gd`

**CLI usage:**
```bash
godot --headless --path godot_project --script scripts/services/ExportService.gd -- \
  --mode=text \
  --config='{"text":"PLAY","fill":{"type":"gradient",...}}' \
  --output=/path/to/output.png
```

**Modes:**
- `text` - Render styled text to PNG
- `silhouette` - Generate silhouette from shape config
- `composite` - Render text + composite onto base image

**Delegation:**
- **Category:** `unspecified-high`
- **Skills:** `[]`

---

#### Task 7.8: Embed Godot Preview in UI Gen Viewer
**Description:** Embed Godot WASM build in React app for live preview.

**Component:** `src/components/GodotPreview.tsx`

**Features:**
- iframe loading Godot WASM export
- postMessage bridge for config updates
- Real-time effect preview
- Same rendering as production

**Delegation:**
- **Category:** `visual-engineering`
- **Skills:** `["frontend-ui-ux"]`

---

#### Task 7.9: Add Text Effects Panel to Viewer
**Description:** UI to configure text effects (same as before, but now with Godot preview).

**Component:** `src/components/TextEffectsPanel.tsx`

**Features:**
- Text input
- Effect toggles (fill, stroke, shadow, glow, bevel, distortion)
- Parameter controls matching `TextEffectsConfig`
- Preset dropdown
- Live preview via embedded Godot

**Delegation:**
- **Category:** `visual-engineering`
- **Skills:** `["frontend-ui-ux"]`

---

### Updated Task 7.1: Copy Text Effects Types
**Description:** Port the types and presets from text-shadertoy.

**Files to create:**
- `shared/src/types/text-effects.ts`
- `shared/src/types/text-effect-presets.ts`

**Delegation:**
- **Category:** `quick`
- **Skills:** `[]`

---

### Task 7.2: Create Canvas-based Text Renderer
**Description:** Render styled text using node-canvas.

**File:** `api/src/ai/pipeline/compositing/text-renderer.ts`

**Features to implement progressively:**
1. Basic text rendering with font selection
2. Fill (solid color and gradients)
3. Stroke (outside position first)
4. Drop shadow
5. Outer glow
6. Bevel (simplified version)

**Delegation:**
- **Category:** `unspecified-high`
- **Skills:** `[]`
- **Rationale:** Complex graphics programming

---

### Task 7.3: Create Compositing Stage
**Description:** Pipeline stage that composites text onto UI components.

**File:** `api/src/ai/pipeline/stages/ui-composite.ts`

**Parameters:**
```typescript
interface CompositeConfig {
  text: string;
  textEffects: TextEffectsConfig;
  position: { x: number; y: number };  // or 'center'
  maxWidth?: number;  // for text wrapping
}
```

**Delegation:**
- **Category:** `unspecified-high`
- **Skills:** `[]`

---

### Task 7.4: Add Text Effects Panel to Viewer
**Description:** UI to configure text effects in the admin panel.

**Component:** `src/components/TextEffectsPanel.tsx`

**Features:**
- Text input
- Effect toggles (fill, stroke, shadow, glow, bevel)
- Parameter sliders for each effect
- Preset dropdown
- Live preview

**Delegation:**
- **Category:** `visual-engineering`
- **Skills:** `["frontend-ui-ux"]`

---

## Summary: Task Delegation Matrix

| Phase | Task | Category | Skills | Complexity |
|-------|------|----------|--------|------------|
| 1 | 1.1 Package Scaffold | `quick` | `[]` | Low |
| 1 | 1.2 Monorepo Config | `quick` | `[]` | Low |
| 2 | 2.1 Express + WebSocket | `unspecified-high` | `[]` | High |
| 2 | 2.2 Result Storage Format | `quick` | `[]` | Low |
| 3 | 3.1 Jotai Atoms | `quick` | `[]` | Low |
| 3 | 3.2 WebSocket Hook | `quick` | `[]` | Low |
| 4 | 4.1 Control Type Selector | `visual-engineering` | `["frontend-ui-ux"]` | Medium |
| 4 | 4.2 SVG Picker | `visual-engineering` | `["frontend-ui-ux"]` | Medium |
| 4 | 4.3 Font Picker | `visual-engineering` | `["frontend-ui-ux"]` | Medium |
| 4 | 4.4 Theme Input | `visual-engineering` | `["frontend-ui-ux"]` | Medium |
| 4 | 4.5 Strength Slider | `visual-engineering` | `["frontend-ui-ux"]` | Medium |
| 4 | 4.6 State Selector | `visual-engineering` | `["frontend-ui-ux"]` | Medium |
| 4 | 4.7 Prompt Modifier | `visual-engineering` | `["frontend-ui-ux"]` | Low |
| 4 | 4.8 Prompt Preview | `visual-engineering` | `["frontend-ui-ux"]` | Low |
| 5 | 5.1 Generate Button | `visual-engineering` | `["frontend-ui-ux"]` | Medium |
| 5 | 5.2 Results Grid | `visual-engineering` | `["frontend-ui-ux"]` | High |
| 5 | 5.3 Result Card | `visual-engineering` | `["frontend-ui-ux"]` | Medium |
| 6 | 6.1 Main Layout | `visual-engineering` | `["frontend-ui-ux"]` | Medium |
| 6 | 6.2 Connection Status | `quick` | `[]` | Low |
| **7** | **7.1 Text Effects Types** | `quick` | `[]` | Low |
| **7** | **7.2 Gradient Fill Shader** | `unspecified-high` | `[]` | Medium |
| **7** | **7.3 Outer Stroke Shader** | `unspecified-high` | `[]` | Medium |
| **7** | **7.4 Bevel/Emboss Shader** | `unspecified-high` | `[]` | High |
| **7** | **7.5 Distortion Pack Shader** | `unspecified-high` | `[]` | Medium |
| **7** | **7.6 TextEffectsRenderer.gd** | `unspecified-high` | `[]` | Medium |
| **7** | **7.7 Headless Export Service** | `unspecified-high` | `[]` | High |
| **7** | **7.8 Godot Preview Embed** | `visual-engineering` | `["frontend-ui-ux"]` | High |
| **7** | **7.9 Text Effects Panel** | `visual-engineering` | `["frontend-ui-ux"]` | High |

---

## Execution Order

```
Phase 1 (Foundation) - Sequential, do first
  1.1 Package Scaffold → 1.2 Monorepo Config

Phase 2 (Backend) - After Phase 1
  2.2 Types → 2.1 Server

Phase 3 (State) - After 2.2
  3.1 Jotai Atoms → 3.2 WebSocket Hook

Phase 4 (UI Components) - Parallelize after 3.1
  4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8 (all can run in parallel)

Phase 5 (Generation) - After Phase 4
  5.1 → 5.2 → 5.3

Phase 6 (Layout) - After Phase 5
  6.1, 6.2 (parallel)

Phase 7 (Text Effects via Godot) - Future, after core is working
  7.1 Types (copy from text-shadertoy)
  ↓
  7.2, 7.3, 7.4, 7.5 (Godot shaders - can parallelize)
  ↓
  7.6 TextEffectsRenderer.gd (needs shaders)
  ↓
  7.7 Headless Export Service (needs renderer)
  ↓
  7.8, 7.9 (UI components - can parallelize)
```

---

## Dependencies to Add

**packages/ui-gen-viewer/package.json:**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "jotai": "^2.6.0",
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "chokidar": "^3.5.3",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/express": "^4.17.0",
    "@types/ws": "^8.5.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "typescript": "^5.3.0"
  }
}
```

**Phase 7 uses Godot (no Node.js dependencies needed for text rendering)**

The text effects rendering is handled entirely by Godot:
- Shaders in `godot_project/shaders/sprite/`
- Headless export via `godot --headless`
- No `canvas` or `opentype.js` needed

---

## Appendix: Deployment Architecture Analysis

### Critical Constraint: Cloudflare Workers Limitations

**Research findings:**

| Technology | CF Workers Compatible? | Reason |
|------------|------------------------|--------|
| **Sharp** | ❌ NO | Native bindings, no WASM version works on CF |
| **Godot WASM** | ❌ NO | 38MB+ WASM file, CF limit is 10MB |
| **node-canvas** | ❌ NO | Native bindings |
| **jSquash** | ⚠️ Maybe | WASM image processing, limited features |

**Current Godot WASM export:** 38MB (our export) - even optimized builds are 17MB+ minimum

### Revised Architecture: Hybrid Approach

Since Cloudflare Workers cannot run Godot or Sharp, we need a **hybrid architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Worker (API)                       │
│  • Receives generation requests                                  │
│  • Calls Scenario.com API (external)                            │
│  • Simple operations only (no image processing)                  │
│  • Stores metadata in D1/KV                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (for complex rendering)
┌─────────────────────────────────────────────────────────────────┐
│              Modal.com / Render / Fly.io Worker                  │
│  • Runs Godot headless for text rendering                        │
│  • Runs Sharp for image compositing                              │
│  • Called via HTTP from CF Worker when needed                    │
│  • Returns processed image → CF Worker → R2                      │
└─────────────────────────────────────────────────────────────────┘
```

### Option Analysis for Server-Side Rendering

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A: Modal.com** | Easy Python/Node, GPU support, pay-per-use | Another vendor | ✅ Best for batch jobs |
| **B: Fly.io** | Docker containers, global edge | More ops work | Good for always-on |
| **C: Render** | Simple, cheap background workers | Less flexible | Good for simple cases |
| **D: Self-hosted** | Full control | Ops overhead | Not recommended |
| **E: Client-side only** | No server needed | Can't use in pipeline | ✅ For admin panel preview |

### Recommended Split Architecture

**For Admin Panel (packages/ui-gen-viewer):**
- ✅ Godot WASM in browser for live preview (already works in app)
- ✅ Text effects preview via embedded Godot
- ✅ No server-side rendering needed for experimentation

**For Production Pipeline (api):**
- Scenario.com API for AI generation (current)
- **Defer compositing** - store base images + text config separately
- Composite at **client render time** (Godot in-app does final composite)
- OR add Modal.com worker for pre-composited assets when needed

### Simplified Workflow (Defer Compositing)

```
Production Pipeline (CF Worker):
1. Generate silhouette (simple shapes - can do in CF with Canvas API or external)
2. Call Scenario.com img2img → base_ui.png
3. Store: { base_ui.png, text_config: { text, effects, font } }
4. Upload both to R2

Client (App with Godot):
1. Load base_ui.png as texture
2. Apply text_config via Godot TextEffectsRenderer
3. Render composite in real-time
```

**Benefits:**
- No heavy server-side rendering
- Text can be localized per-user
- Text effects can be tweaked without regeneration
- Smaller asset storage (no pre-rendered variants)

---

## Revised Phase 7: Text Effects (Client-Side Focus)

Given the CF Workers constraints, Phase 7 focuses on:
1. **Godot shaders** for in-game text effects (already planned)
2. **Browser preview** via Godot WASM embed in admin panel
3. **Defer server-side compositing** to future Modal.com integration if needed

The admin panel will use the same Godot WASM that runs in the app for preview fidelity.
1. Generate base UI component (existing pipeline)
   → silhouette PNG → Scenario.com img2img → bg removal → base.png

2. Render styled text (NEW - via Godot headless)
   → TextEffectsConfig + font + text → Godot → text_layer.png

3. Composite layers (Sharp)
   → base.png + text_layer.png → final.png

4. Upload to R2
   → Store final composited image
```

### Pipeline Integration Example

```typescript
// api/src/ai/pipeline/stages/ui-composite.ts
import { execSync } from 'child_process';
import { TextEffectsConfig } from '@slopcade/shared/types/text-effects';

const GODOT_PROJECT_PATH = path.resolve(__dirname, '../../../../godot_project');

async function renderTextWithGodot(config: TextEffectsConfig): Promise<Buffer> {
  const configJson = JSON.stringify(config);
  const outputPath = `/tmp/text-${Date.now()}.png`;
  
  execSync(`godot --headless --path ${GODOT_PROJECT_PATH} \
    --script scripts/services/ExportService.gd -- \
    --mode=text \
    --config='${configJson}' \
    --output=${outputPath}`);
  
  return fs.readFileSync(outputPath);
}

async function compositeTextOntoUI(
  baseImage: Buffer,
  textConfig: TextEffectsConfig,
  position: { x: number; y: number } | 'center'
): Promise<Buffer> {
  const textLayer = await renderTextWithGodot(textConfig);
  
  // Use Sharp to composite
  const base = sharp(baseImage);
  const metadata = await base.metadata();
  
  let x: number, y: number;
  if (position === 'center') {
    const textMeta = await sharp(textLayer).metadata();
    x = Math.floor((metadata.width! - textMeta.width!) / 2);
    y = Math.floor((metadata.height! - textMeta.height!) / 2);
  } else {
    x = position.x;
    y = position.y;
  }
  
  return base
    .composite([{ input: textLayer, left: x, top: y }])
    .png()
    .toBuffer();
}
```

### Why Godot Over Node-Canvas

| Aspect | Godot | Node-Canvas |
|--------|-------|-------------|
| **Visual consistency** | Same shaders as game engine | Different rendering |
| **GPU acceleration** | Yes (even headless) | CPU only |
| **Effect fidelity** | 100% match to production | Approximation |
| **Maintenance** | Single codebase | Two implementations |
| **Future effects** | Auto-inherited | Manual port |

---

## References

- [Architecture Doc](./ui-generation-viewer-architecture.md)
- [text-shadertoy Repository](/Users/hassoncs/Workspaces/Personal/text-shadertoy) - Type definitions source
- [Existing Godot Shaders](../../godot_project/shaders/) - Foundation for new effects
- [Existing UI Experiment CLI](../../api/scripts/ui-experiment.ts)
- [UI Control Config](../../api/src/ai/pipeline/ui-control-config.ts)
- [Prompt Builder](../../api/src/ai/pipeline/prompt-builder.ts)
