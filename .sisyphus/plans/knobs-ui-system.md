# Knobs UI System: Implementation Plan

> **Prerequisite for**: All 20 Three.js → Godot playground experiences
> **Parent plan**: `threejs-to-godot-playground-analysis.md` §6
> **Goal**: A mobile-first, bottom-sheet control panel that auto-generates from variable metadata, supporting all data types needed for shader uniforms and interactive experiences.

---

## What Already Exists

We're ~40% of the way there. Here's the inventory of proto-components scattered across the codebase:

| What | Where | Status |
|------|-------|--------|
| **TuningPanel** (slide-in right panel with grouped sliders) | `app/components/game/TuningPanel.tsx` | Working. Numbers only. Side panel UX. |
| **TunableSlider** (range slider with label + value display) | `app/components/game/TunableSlider.tsx` | Working. Uses `@react-native-community/slider`. |
| **EffectParamControl** (type-dispatched control renderer) | `app/components/effects/EffectParamControl.tsx` | Working. Handles: `float`, `int`, `bool` (Switch), `color` (hex input + preview), `vec2/3/4` (numeric inputs). |
| **PropertySegment** (segmented control / enum selector) | `app/components/editor/panels/PropertiesPanel.tsx` | Working. Inline in PropertiesPanel — needs extraction. |
| **COLOR_PRESETS** (color swatch grid) | `app/components/editor/panels/PropertiesPanel.tsx` | 8 preset colors. Inline — needs extraction. |
| **VariableWithTuning** type | `shared/src/types/GameDefinition.ts` | Supports `tuning: {min, max, step}` + `category` + `label` + `description`. Numbers only. |
| **Bottom sheet** library | `@gorhom/bottom-sheet` v5 (in package.json) | Available. Used in editor (`ChatSheet`, `ToolSheet`). |
| **Storybook** | `apps/storybook/.storybook/` | Working. Loads from `packages/ui/**/*.stories.tsx`. Webpack5, NativeWind, react-native-web aliases. |

**What's missing**: A unified `Knob` component registry that handles all types, a bottom-sheet container, color picker beyond hex text input, gradient control, the `knob` type discriminator on `VariableWithTuning`, and Storybook stories for all of it.

---

## Control Type Catalog

Every control type needed, based on the 20 playground experiences + shader uniform requirements:

### Tier 1: Core (needed by nearly everything)

| Control | Data Type | UI | Experiences Using It | Existing Code |
|---------|-----------|-----|---------------------|---------------|
| **Slider** | `number` | Range slider with min/max/step, value display, tap-to-edit | All 20 | `TunableSlider.tsx` ✅ (polish needed) |
| **Toggle** | `boolean` | Switch with label | 12 of 20 | `EffectParamControl` Switch block ✅ |
| **Select** | `string` (enum) | Segmented control (≤4 options) or pill list (>4) | 10 of 20 | `PropertySegment` ✅ (needs extraction) |
| **Color** | `string` (hex) | Preset swatches + custom picker | 8 of 20 | `EffectParamControl` hex input + `COLOR_PRESETS` (needs upgrade) |
| **Button** | action trigger | Pressable button that fires an event | 6 of 20 | `Button.tsx` in packages/ui ✅ |

### Tier 2: Enhanced (needed for shaders and visual experiences)

| Control | Data Type | UI | Experiences Using It | Existing Code |
|---------|-----------|-----|---------------------|---------------|
| **Vec2** | `{x, y}` | XY touchpad (drag to set) OR dual sliders | 3 of 20 | `EffectParamControl` has text inputs (needs upgrade to touchpad) |
| **Vec3** | `{x, y, z}` | Three linked sliders OR 3 number inputs | 2 of 20 | `EffectParamControl` has text inputs ✅ |
| **Gradient** | `Array<{stop, color}>` | Color stop strip with draggable stops | Shader experiences | None ❌ |
| **Image/Texture** | `string` (url/asset) | Thumbnail picker from asset gallery | Future | None ❌ |

### Tier 3: Nice-to-have (future)

| Control | Data Type | UI |
|---------|-----------|-----|
| **Curve** | `Array<{x, y}>` | Bezier curve editor (for easing/animation curves) |
| **Angle** | `number` (radians) | Circular dial |
| **Monitor** | `number` (read-only) | Real-time line graph (Tweakpane-style) |
| **Text** | `string` | Text input field |

---

## Architecture

### Data Flow

```
GameDefinition.variables     →  KnobsPanel reads metadata  →  renders KnobControls
     ↓                              ↓                              ↓
  {knob: {controlType, ...}}    groups by category            user interacts
     ↓                              ↓                              ↓
  Script reads via              KnobsPanel calls              onChange fires
  ctx.getVariable('key')        onVariableChange(key, val)    immediately (no apply button)
```

### Component Hierarchy

```
<KnobsPanel>                           ← Bottom sheet container
  <KnobsButton />                      ← Floating 🎛️ trigger
  <BottomSheet>
    <KnobsCategoryGroup category="gameplay">
      <KnobControl type="select" ... />
      <KnobControl type="toggle" ... />
    </KnobsCategoryGroup>
    <KnobsCategoryGroup category="physics">
      <KnobControl type="slider" ... />
      <KnobControl type="slider" ... />
    </KnobsCategoryGroup>
    <KnobsCategoryGroup category="visuals">
      <KnobControl type="color" ... />
      <KnobControl type="gradient" ... />
    </KnobsCategoryGroup>
    <KnobsActions>
      <KnobButton action="reset" />
    </KnobsActions>
  </BottomSheet>
</KnobsPanel>
```

### File Structure

New components go in `packages/ui/src/Knobs/` so they get Storybook coverage automatically (the story glob already covers `packages/ui/**/*.stories.tsx`).

```
packages/ui/src/Knobs/
  index.ts                    ← Public exports
  KnobSlider.tsx              ← Number range
  KnobSlider.stories.tsx
  KnobToggle.tsx              ← Boolean switch  
  KnobToggle.stories.tsx
  KnobSelect.tsx              ← Segmented control / pill list
  KnobSelect.stories.tsx
  KnobColor.tsx               ← Swatch presets + custom picker
  KnobColor.stories.tsx
  KnobButton.tsx              ← Action trigger
  KnobButton.stories.tsx
  KnobVec2.tsx                ← XY touchpad
  KnobVec2.stories.tsx
  KnobVec3.tsx                ← Triple slider
  KnobVec3.stories.tsx
  KnobGradient.tsx            ← Color stop editor
  KnobGradient.stories.tsx
  KnobControl.tsx             ← Type dispatcher (reads controlType, renders correct component)
  KnobControl.stories.tsx     ← Shows all types in one story
  KnobCategoryGroup.tsx       ← Collapsible category section
  KnobsPanel.tsx              ← Bottom sheet wrapper with category groups
  KnobsPanel.stories.tsx      ← Full panel with mock game variables
  types.ts                    ← KnobConfig union type + helpers
```

---

## Type System Changes

### `shared/src/types/GameDefinition.ts`

```typescript
// New types to add:

/** Discriminated union for knob control configuration */
export type KnobConfig =
  | { controlType: 'slider'; min: number; max: number; step?: number }
  | { controlType: 'toggle' }
  | { controlType: 'select'; options: Array<{ label: string; value: string | number }> }
  | { controlType: 'color'; presets?: string[] }
  | { controlType: 'button'; action: string; variant?: 'default' | 'destructive' }
  | { controlType: 'vec2'; min?: { x: number; y: number }; max?: { x: number; y: number } }
  | { controlType: 'vec3'; min?: { x: number; y: number; z: number }; max?: { x: number; y: number; z: number } }
  | { controlType: 'gradient'; minStops?: number; maxStops?: number }
  | { controlType: 'text'; maxLength?: number; placeholder?: string };

/** Extended variable with knob metadata */
export interface VariableWithTuning {
  value: GameVariableValue;
  tuning?: TuningConfig;       // backward compat: existing numeric tuning
  knob?: KnobConfig;           // NEW: rich control type for knobs panel
  category?: string;           // grouping key (physics, gameplay, visuals, etc.)
  label?: string;              // human-readable name
  description?: string;        // tooltip/helper text
  display?: boolean;           // show in HUD overlay
}
```

### Auto-inference

If a variable has `tuning` but no `knob`, auto-create a slider knob:
```typescript
function inferKnob(variable: VariableWithTuning): KnobConfig | undefined {
  if (variable.knob) return variable.knob;
  if (variable.tuning) {
    return { controlType: 'slider', min: variable.tuning.min, max: variable.tuning.max, step: variable.tuning.step };
  }
  // Auto-infer from value type:
  const val = variable.value;
  if (typeof val === 'boolean') return { controlType: 'toggle' };
  if (typeof val === 'string' && val.startsWith('#') && val.length === 7) return { controlType: 'color' };
  return undefined;
}
```

This means **all existing games with `tuning` metadata automatically get knobs for free**.

---

## Component Specs

### KnobSlider

Upgrade from `TunableSlider`. Larger touch target. Tap the value to type an exact number.

```
┌─ Gravity ─────────────────── 9.80 ─┐
│  ═══════════●══════════════════════  │
│  0                              50  │
└─────────────────────────────────────┘
```

**Props**: `label, description?, value, min, max, step?, onChange`
**Story variants**: Default, Wide range (0-1000), Fine control (0.001 step), Integer only, With description

### KnobToggle

Native Switch with consistent styling.

```
┌─ Auto Spawn ────────────── [●━━] ─┐
│  Continuously spawn new shapes     │
└────────────────────────────────────┘
```

**Props**: `label, description?, value, onChange`
**Story variants**: Default on, Default off, With description, Disabled

### KnobSelect

Segmented control for ≤5 options. Scrollable pill row for >5.

```
┌─ Shape ────────────────────────────┐
│  [● Sphere]  [ Box ]  [ Cylinder ] │
└────────────────────────────────────┘
```

```
┌─ Material ─────────────────────────┐
│  [●Rubber] [Metal] [Glass] [Ice] → │  ← scrollable
└────────────────────────────────────┘
```

**Props**: `label, description?, value, options: {label, value}[], onChange`
**Story variants**: 2 options, 3 options, 5+ options (scrollable), With icons, Disabled

### KnobColor

Preset swatches in a grid + "Custom" button that expands an HSL picker or text input.

```
┌─ Ball Color ───────────────────────┐
│  🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪        │
│                                    │
│  [ Custom: #FF4400 ]  [■]         │  ← hex input + preview
└────────────────────────────────────┘
```

**Props**: `label, description?, value (hex string), presets?: string[], onChange`
**Story variants**: Default with presets, Custom only (no presets), With many presets (2 rows), Disabled

### KnobButton

Action button. Fires an event, doesn't store a value.

```
┌────────────────────────────────────┐
│         [ 🔄 Reset Scene ]         │
└────────────────────────────────────┘
```

**Props**: `label, action: string, variant?: 'default' | 'destructive', onAction`
**Story variants**: Default, Destructive (red), With emoji, Disabled

### KnobVec2

XY touchpad for 2D vectors. Drag the dot to set X/Y simultaneously. Shows numeric values.

```
┌─ Wind Direction ───────────────────┐
│  ┌──────────────┐  X: 0.45        │
│  │       ·      │  Y: -0.20       │
│  │      ●       │                  │
│  │              │                  │
│  └──────────────┘                  │
└────────────────────────────────────┘
```

**Props**: `label, description?, value: {x, y}, min?: {x, y}, max?: {x, y}, onChange`
**Story variants**: Default (-1 to 1), Position (0 to 100), With description

### KnobGradient

Color stop strip for gradients (shader uniforms, environment colors).

```
┌─ Sky Gradient ─────────────────────┐
│  ▼        ▼              ▼         │
│  ████████████████████████████████  │  ← gradient preview
│  0.0     0.35           1.0       │  ← stop positions
│                                    │
│  [ + Add Stop ]                    │
└────────────────────────────────────┘
```

Tap a stop marker to select → shows color picker for that stop. Drag horizontally to reposition. Swipe up to delete.

**Props**: `label, description?, value: Array<{position: number, color: string}>, onChange, minStops?, maxStops?`
**Story variants**: 2 stops (simple), 4 stops, Sunset preset, Editable

### KnobControl (type dispatcher)

```typescript
// Reads the knob config and renders the right component:
function KnobControl({ config, value, onChange }: Props) {
  switch (config.controlType) {
    case 'slider': return <KnobSlider {...config} value={value} onChange={onChange} />;
    case 'toggle': return <KnobToggle value={value} onChange={onChange} />;
    case 'select': return <KnobSelect {...config} value={value} onChange={onChange} />;
    case 'color':  return <KnobColor {...config} value={value} onChange={onChange} />;
    case 'button': return <KnobButton {...config} onAction={onChange} />;
    case 'vec2':   return <KnobVec2 {...config} value={value} onChange={onChange} />;
    case 'vec3':   return <KnobVec3 {...config} value={value} onChange={onChange} />;
    case 'gradient': return <KnobGradient {...config} value={value} onChange={onChange} />;
    default: return null;
  }
}
```

**Story**: Shows ALL control types in one scrollable view — the "kitchen sink" demo.

### KnobsPanel (bottom sheet container)

```typescript
// The full panel — reads GameDefinition variables and renders controls
function KnobsPanel({ variables, currentValues, onVariableChange }) {
  // 1. Filter to variables that have knob config (or infer from tuning)
  // 2. Group by category
  // 3. Render in bottom sheet with collapsible categories
}
```

**Story**: Full panel with a realistic set of game variables (physics sandbox mock data).

---

## Storybook Strategy

### Story Glob

Current: `stories: ["../../../packages/ui/**/*.stories.@(js|jsx|ts|tsx)"]`

Since we're putting Knobs in `packages/ui/src/Knobs/`, stories are automatically discovered. No config change needed.

### Story Pattern (CSF3, matching existing)

```typescript
// packages/ui/src/Knobs/KnobSlider.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { KnobSlider } from './KnobSlider';

const meta: Meta<typeof KnobSlider> = {
  title: 'Knobs/Slider',
  component: KnobSlider,
  tags: ['autodocs'],
  argTypes: {
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: 'Gravity', value: 9.8, min: 0, max: 50, step: 0.1 },
};

export const FineControl: Story = {
  args: { label: 'Opacity', value: 0.75, min: 0, max: 1, step: 0.01 },
};

export const Integer: Story = {
  args: { label: 'Count', value: 10, min: 1, max: 100, step: 1 },
};
```

### Story Hierarchy in Storybook Sidebar

```
Knobs/
  ├─ Slider           ← KnobSlider.stories.tsx
  ├─ Toggle           ← KnobToggle.stories.tsx
  ├─ Select           ← KnobSelect.stories.tsx
  ├─ Color            ← KnobColor.stories.tsx
  ├─ Button           ← KnobButton.stories.tsx
  ├─ Vec2             ← KnobVec2.stories.tsx
  ├─ Vec3             ← KnobVec3.stories.tsx
  ├─ Gradient         ← KnobGradient.stories.tsx
  ├─ Control          ← KnobControl.stories.tsx (type dispatcher)
  └─ Panel            ← KnobsPanel.stories.tsx (full integrated panel)
```

### Kitchen Sink Story

The `KnobControl.stories.tsx` "All Types" story is the most important one — it's where you visually verify that all control types look good together:

```typescript
export const AllTypes: Story = {
  render: () => (
    <View style={{ padding: 16, backgroundColor: '#0d1117', flex: 1 }}>
      <KnobControl config={{ controlType: 'slider', min: 0, max: 10, step: 0.1 }} value={5} onChange={() => {}} label="Speed" />
      <KnobControl config={{ controlType: 'toggle' }} value={true} onChange={() => {}} label="Auto Spawn" />
      <KnobControl config={{ controlType: 'select', options: [{label:'Sphere',value:'sphere'},{label:'Box',value:'box'},{label:'Cylinder',value:'cylinder'}] }} value="sphere" onChange={() => {}} label="Shape" />
      <KnobControl config={{ controlType: 'color', presets: ['#EF4444','#22C55E','#3B82F6','#8B5CF6'] }} value="#EF4444" onChange={() => {}} label="Ball Color" />
      <KnobControl config={{ controlType: 'vec2' }} value={{x:0.5,y:-0.3}} onChange={() => {}} label="Wind" />
      <KnobControl config={{ controlType: 'gradient' }} value={[{position:0,color:'#ff6600'},{position:1,color:'#0066ff'}]} onChange={() => {}} label="Sky Gradient" />
      <KnobControl config={{ controlType: 'button', action: 'reset' }} value={0} onChange={() => {}} label="Reset Scene" />
    </View>
  ),
};
```

---

## Implementation Order

### Step 1: Type system + extraction (0.5 day)

1. Add `KnobConfig` type to `shared/src/types/GameDefinition.ts`
2. Add `knob?` field to `VariableWithTuning`
3. Add `inferKnob()` utility
4. Extract `PropertySegment` from `PropertiesPanel.tsx` → `packages/ui/src/Knobs/KnobSelect.tsx`
5. Extract color swatch logic from `PropertiesPanel.tsx` → `packages/ui/src/Knobs/KnobColor.tsx`

### Step 2: Core Knob components + stories (1.5 days)

Build in this order (each with a story immediately):

1. `KnobSlider` — upgrade from TunableSlider (larger targets, tap-to-edit value)
2. `KnobToggle` — extract from EffectParamControl's Switch block
3. `KnobSelect` — from PropertySegment extraction
4. `KnobColor` — swatches + hex input (existing) + add basic HSL picker expansion
5. `KnobButton` — simple, from packages/ui Button
6. `KnobControl` — type dispatcher + kitchen sink story

Run Storybook throughout: `pnpm storybook` → verify each control at http://localhost:6006

### Step 3: Advanced controls (1 day)

7. `KnobVec2` — XY touchpad with drag interaction
8. `KnobVec3` — triple linked sliders
9. `KnobGradient` — color stop editor strip

### Step 4: Panel integration (1 day)

10. `KnobCategoryGroup` — collapsible section
11. `KnobsPanel` — bottom sheet container using `@gorhom/bottom-sheet`
12. Floating 🎛️ button with auto-hide behavior
13. Wire into `GameRuntime` — replace/upgrade TuningPanel usage
14. `KnobsPanel.stories.tsx` — full panel with mock Physics Sandbox variables

### Step 5: Polish (0.5 day)

15. Haptic feedback on slider step boundaries
16. Smooth animations on expand/collapse
17. Keyboard handling (dismiss on submit, tab between fields)
18. Accessibility audit (labels, roles, announcements)

---

## Migration: TuningPanel → KnobsPanel

The existing `TuningPanel` and `TunableSlider` are not thrown away — they evolve:

| Old | New | Change |
|-----|-----|--------|
| `TunableSlider` | `KnobSlider` | Upgraded with larger targets, tap-to-edit |
| `TuningPanel` | `KnobsPanel` | Bottom sheet instead of side panel. Multi-type controls. |
| `EffectParamControl` | Uses `KnobControl` | Dispatcher pattern replaces inline switch/case |

The `TuningPanel.tsx` remains importable for backward compat but internally delegates to `KnobsPanel`.

Any game with existing `tuning` metadata works automatically via `inferKnob()`.

---

## Visual Design Tokens

All Knob components should use consistent design tokens from `packages/theme/src/tokens.ts`:

| Token | Usage |
|-------|-------|
| `bg-gray-900/95` | Panel background (matches existing TuningPanel) |
| `text-white` | Labels |
| `text-gray-400` | Descriptions, secondary text |
| `#a855f7` (purple-500) | Active slider track, selected segments, toggle ON track |
| `#374151` (gray-700) | Inactive slider track, toggle OFF track, borders |
| `font-mono` | Numeric value displays |
| `text-xs` | Descriptions, unit labels |
| `rounded-lg` | Control containers |

Dark theme only for now (all experiences run on dark background).

---

## Success Criteria

Before marking complete, verify in Storybook:

- [ ] Each control type has ≥2 story variants
- [ ] Kitchen sink story shows all types together, properly spaced
- [ ] Controls work with mouse (web) and touch interaction patterns
- [ ] Category groups collapse/expand smoothly
- [ ] Bottom sheet slides up with snap points (peek + full)
- [ ] Slider drags feel responsive (no lag, 60fps)
- [ ] Color presets work as expected (single tap to select)
- [ ] Full panel story with mock Physics Sandbox data looks production-ready
- [ ] All existing games with `tuning` metadata render knobs via inference
