# UI Overlay System Architecture Plan

> Design for a unified, declarative overlay/HUD system that works identically for 2D and 3D games — replacing the current scattered UI approach with a single, game-definition-driven system.
>
> **Companion document**: [3D Game Engine Plan](./3d-game-engine-plan.md) covers the 3D world, entity, and physics systems.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Current System Audit](#2-current-system-audit)
3. [Design Goals](#3-design-goals)
4. [Overlay Architecture](#4-overlay-architecture)
5. [Overlay Type System](#5-overlay-type-system)
6. [Binding System](#6-binding-system)
7. [Relationship to Existing Systems](#7-relationship-to-existing-systems)
8. [Implementation: Godot CanvasLayer vs React Native](#8-implementation-godot-canvaslayer-vs-react-native)
9. [Godot CanvasLayer Implementation](#9-godot-canvaslayer-implementation)
10. [React Native Integration](#10-react-native-integration)
11. [Dialog System Evolution](#11-dialog-system-evolution)
12. [Input Overlays](#12-input-overlays)
13. [Game State Screens](#13-game-state-screens)
14. [Theming and Styling](#14-theming-and-styling)
15. [AI Generation Considerations](#15-ai-generation-considerations)
16. [Migration Strategy](#16-migration-strategy)
17. [Phased Implementation Plan](#17-phased-implementation-plan)
18. [Open Questions](#18-open-questions)

---

## 1. Problem Statement

The current game UI is spread across **multiple disconnected systems** with no unified model:

| What | Where | How | Problem |
|------|-------|-----|---------|
| Score/lives display | `GameHUD.tsx` (React) | Reads `gameState.variables` via `UIConfig.variableDisplays` | React overlay positioned over Godot viewport — fragile alignment |
| Entity count display | `GameHUD.tsx` (React) | Iterates `UIConfig.entityCountDisplays` | Same alignment issue |
| Pause button | `GameHUD.tsx` (React) | Hardcoded in right section | Not game-definable |
| Win/lose screens | `GameRuntime.godot.tsx` (React) | Inline conditional rendering | Hardcoded layouts, not customizable per game |
| Game dialogs | `GameDialog.tsx` (React Modal) | Variable-driven (`activeDialog`) | Better pattern but limited to modals |
| UI buttons | `UIManager.gd` (Godot CanvasLayer) | Texture buttons on `CanvasLayer` layer 100 | Separate system from React HUD |
| Themed UI components | `UIManager.gd` (Godot) | `ThemedUIComponent.gd` | Yet another path |
| Input controls | Various `*Overlay.tsx` (React) | TapZone, Joystick, DPad, VirtualButtons | Separate from game HUD |

**The result**: Game authors can't fully control their game's UI from the game definition. Score displays, health bars, custom HUD elements, and game-over screens are all hardcoded in different places with different APIs.

### What We Want

A single `overlay` field in the `GameDefinition` that gives game authors full control over their HUD, and that works identically whether the game is 2D or 3D.

---

## 2. Current System Audit

### 2.1. UIConfig (GameDefinition.ui)

Defined in `shared/src/types/GameDefinition.ts`:

```typescript
interface UIConfig {
  showTimer?: boolean;
  timerCountdown?: boolean;
  backgroundColor?: string;
  entityCountDisplays?: EntityCountDisplay[];     // { tag, label, color? }
  variableDisplays?: VariableDisplay[];           // { name, label, position?, color?, format?, showWhen?, defaultValue? }
}
```

**Rendered by**: `GameHUD.tsx` — a React component positioned absolutely over the Godot viewport.

**What it does well**: Simple, declarative — game defines what to show, React renders it.

**What it does poorly**:
- Only supports text values (no bars, icons, images)
- Limited positioning (top-left, top-center, top-right)
- No layout control (spacing, sizing, grouping)
- Format is just string replacement (`{value}`)
- Tightly coupled to React rendering — won't work in a Godot-only context

### 2.2. GameDialogsConfig (GameDefinition.dialogs)

```typescript
interface GameDialogsConfig {
  activeDialogVariable?: string;    // Default: "activeDialog"
  dialogs: GameDialogDefinition[];
  legacyWinDialogFallback?: boolean;
}

interface GameDialogDefinition {
  id: string;
  title: string;
  message?: string;
  stats?: Array<{ label: string; variable: string; format?: string }>;
  dismissible?: boolean;
  dismissEventName?: string;
  buttons: Array<{ label: string; eventName: string; data?: Record<string, unknown>; variant?: 'primary' | 'secondary' }>;
}
```

**Rendered by**: `GameDialog.tsx` — a React Native `Modal` triggered when `gameState.vars[activeDialogVariable]` matches a dialog ID.

**What it does well**:
- Fully declarative — defined in game JSON
- Variable-driven visibility (set a variable → dialog appears)
- Button presses emit game events (clean decoupling)
- Stats can reference game variables

**What it does poorly**:
- Only modal (fullscreen overlay with backdrop)
- Can't position freely on screen
- Limited styling
- Separate system from HUD elements

### 2.3. UIManager.gd (Godot-Side UI)

Located at `godot_project/scripts/bridge/UIManager.gd`:

```gdscript
# Creates a CanvasLayer at z_index 100 for UI elements
func _get_or_create_ui_layer() -> CanvasLayer

# Texture buttons (image-based, positioned in game coords)
func create_ui_button(button_id, normal_url, pressed_url, x, y, width, height)
func destroy_ui_button(button_id)

# Themed UI components (loaded from scene files)
func create_themed_ui_component(id, type, metadata_url, x, y, w, h, label)

# Particles and audio (not really UI, but lives here)
func spawn_particle(type, x, y)
func play_sound(resource_path, volume)
```

**What it does well**: Already has a CanvasLayer at layer 100, button event routing via EventEmitter.

**What it does poorly**: Imperative API (create/destroy calls), no declarative config, positioned in game coords not screen coords, image-only buttons.

### 2.4. Game State Screens (Hardcoded React)

In `GameRuntime.godot.tsx`, these are inline conditional blocks:

```tsx
// Ready screen (title + instructions + Play button)
{gameState.state === "ready" && <View style={styles.overlay}>...</View>}

// Pause screen (Resume + Restart + Level nav)
{gameState.state === "paused" && <View style={styles.overlay}>...</View>}

// Win screen (🎉 + final score + Play Again)
{gameState.state === "won" && <View style={styles.overlay}>...</View>}

// Lose screen (💀 + final score + Play Again)
{gameState.state === "lost" && <View style={styles.overlay}>...</View>}
```

**What it does well**: Works, shows the right screen at the right time.

**What it does poorly**: Completely hardcoded. Games can't customize win/lose screens, add custom stats, change button labels, or add branding. Every game gets the same layout.

### 2.5. Input Overlays (React)

| Component | Purpose |
|-----------|---------|
| `TapZoneOverlay.tsx` | Invisible touch regions mapped to buttons |
| `VirtualJoystickOverlay.tsx` | On-screen analog stick |
| `VirtualDPadOverlay.tsx` | On-screen D-pad |
| `VirtualButtonsOverlay.tsx` | Action buttons (jump, etc.) |
| `InputDebugOverlay.tsx` | Debug visualization |

These are already well-defined by the `InputConfig` in the game definition. They're a separate concern from the HUD overlay and should stay in React (they need touch gesture handling).

---

## 3. Design Goals

| Goal | Description |
|------|-------------|
| **Single declaration** | One `overlay` field in `GameDefinition` controls all HUD elements |
| **2D/3D agnostic** | Same overlay config works on both scene types |
| **Binding-driven** | Elements auto-update when game state changes |
| **Composable** | Elements can be grouped in containers with layout |
| **Backward compatible** | Existing `UIConfig` and `dialogs` keep working |
| **Game-author friendly** | Simple enough for AI to generate correct configs |
| **Extensible** | New element types can be added without restructuring |
| **Consistent rendering** | Same visual result on iOS, Android, and Web |

---

## 4. Overlay Architecture

### Conceptual Model

```
┌───────────────────────────────────┐
│          Screen                    │
│  ┌─────────────────────────────┐  │
│  │   Game World (2D or 3D)     │  │
│  │   Rendered by Godot         │  │
│  │                             │  │
│  └─────────────────────────────┘  │
│                                    │
│  ┌─────────────────────────────┐  │  ← Overlay Layer
│  │  Overlay Elements           │  │     (screen-space, no physics)
│  │  ┌───────┐     ┌────────┐  │  │
│  │  │Score  │     │ ❤️ 3   │  │  │
│  │  └───────┘     └────────┘  │  │
│  │                             │  │
│  │           ┌──────────┐     │  │
│  │           │ Progress │     │  │
│  │           └──────────┘     │  │
│  └─────────────────────────────┘  │
│                                    │
│  ┌─────────────────────────────┐  │  ← Input Layer (separate, stays in React)
│  │  [←]              [→] [⬆]  │  │
│  └─────────────────────────────┘  │
│                                    │
│  ┌─────────────────────────────┐  │  ← Dialog Layer (modal, on top of everything)
│  │  ╔════════════════════════╗ │  │
│  │  ║   Level Complete!      ║ │  │
│  │  ║   Score: 420           ║ │  │
│  │  ║   [Next Level]         ║ │  │
│  │  ╚════════════════════════╝ │  │
│  └─────────────────────────────┘  │
└───────────────────────────────────┘
```

### Layer Stack (bottom to top)

1. **Game world** — Godot 2D or 3D rendering
2. **Overlay** — HUD elements (score, health, counters) — anchored to screen edges
3. **Input controls** — Tap zones, joystick, D-pad, buttons — React touch handlers
4. **Dialogs** — Modal screens (level complete, pause, etc.) — fullscreen overlay
5. **Game state screens** — Ready, paused, won, lost — fullscreen overlay

---

## 5. Overlay Type System

### 5.1. OverlayConfig

```typescript
// shared/src/types/overlay.ts

export interface OverlayConfig {
  elements: OverlayElement[];
}
```

### 5.2. Anchoring System

Every overlay element is anchored to a screen edge/corner with a pixel offset:

```typescript
export type OverlayAnchor =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';
```

Anchors are **screen-relative** — they stay in the correct position regardless of viewport letterboxing or aspect ratio. The offset is in **logical pixels** from the anchor point.

### 5.3. Base Element

```typescript
interface BaseOverlayElement {
  id: string;
  type: OverlayElementType;
  anchor: OverlayAnchor;
  offset?: { x: number; y: number };    // Pixels from anchor point
  visible?: boolean;                     // Default: true
  visibleWhen?: string;                  // Expression: "variables.lives > 0"
  bindings?: Record<string, string>;     // Bind properties to game state
  style?: OverlayStyle;                 // Visual customization
}

export interface OverlayStyle {
  backgroundColor?: string;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  opacity?: number;
  shadow?: boolean;                     // Drop shadow for readability
}
```

### 5.4. Element Types

#### Text

```typescript
export interface TextOverlayElement extends BaseOverlayElement {
  type: 'text';
  text?: string;                         // Static text (or use bindings)
  fontSize?: number;                     // Default: 16
  color?: string;                        // Default: #FFFFFF
  fontWeight?: 'normal' | 'bold';        // Default: normal
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;                     // Truncate with ellipsis
}
```

#### Bar (health bar, progress bar, timer bar)

```typescript
export interface BarOverlayElement extends BaseOverlayElement {
  type: 'bar';
  width?: number;                        // Default: 100
  height?: number;                       // Default: 12
  color?: string;                        // Fill color (default: #4CAF50)
  backgroundColor?: string;             // Track color (default: rgba(0,0,0,0.5))
  borderColor?: string;
  borderRadius?: number;
  direction?: 'left-to-right' | 'right-to-left' | 'bottom-to-top';
  // Bindings: "value" (current) and "max" (maximum)
  showLabel?: boolean;                   // Show "42/100" text on bar
  labelFormat?: string;                  // e.g. "{value}/{max}" or "{percent}%"
}
```

#### Counter (lives, coins — icon + number)

```typescript
export interface CounterOverlayElement extends BaseOverlayElement {
  type: 'counter';
  icon?: string;                         // Asset ref for icon image
  iconEmoji?: string;                    // Fallback emoji (e.g. "❤️", "⭐", "🪙")
  iconSize?: number;                     // Default: 20
  fontSize?: number;                     // Default: 20
  color?: string;                        // Text color
  direction?: 'icon-left' | 'icon-right' | 'icon-top';
  gap?: number;                          // Space between icon and number
  // Binding: "value" expected
}
```

#### Button

```typescript
export interface ButtonOverlayElement extends BaseOverlayElement {
  type: 'button';
  label: string;
  eventName: string;                     // Emits this game event on press
  eventData?: Record<string, unknown>;   // Optional data payload
  width?: number;
  height?: number;
  color?: string;                        // Background color
  textColor?: string;
  fontSize?: number;
  disabled?: boolean;
  disabledWhen?: string;                 // Expression
}
```

#### Image

```typescript
export interface ImageOverlayElement extends BaseOverlayElement {
  type: 'image';
  url?: string;
  assetRef?: string;
  width?: number;
  height?: number;
  tint?: string;
}
```

#### Container (layout grouping)

```typescript
export interface ContainerOverlayElement extends BaseOverlayElement {
  type: 'container';
  direction?: 'horizontal' | 'vertical';  // Default: horizontal
  gap?: number;                            // Space between children
  children: OverlayElement[];
}
```

#### Spacer (layout helper)

```typescript
export interface SpacerOverlayElement extends BaseOverlayElement {
  type: 'spacer';
  width?: number;
  height?: number;
}
```

### 5.5. Union Type

```typescript
export type OverlayElementType =
  | 'text'
  | 'bar'
  | 'counter'
  | 'button'
  | 'image'
  | 'container'
  | 'spacer';

export type OverlayElement =
  | TextOverlayElement
  | BarOverlayElement
  | CounterOverlayElement
  | ButtonOverlayElement
  | ImageOverlayElement
  | ContainerOverlayElement
  | SpacerOverlayElement;
```

---

## 6. Binding System

Bindings connect overlay elements to live game state. The binding system evaluates string expressions against the game context each frame (or on change).

### 6.1. Binding Syntax

```typescript
// Template strings (for text elements):
bindings: {
  text: "Score: {{variables.score}}"
}

// Direct references (for numeric values — bars, counters):
bindings: {
  value: "variables.health",
  max: "variables.maxHealth"
}

// Expressions (for computed values):
bindings: {
  text: "{{entityCount('brick')}} bricks left"
}

// Formatted:
bindings: {
  text: "Time: {{formatTime(variables.elapsed)}}"
}
```

### 6.2. Available Binding Context

| Path | Type | Description |
|------|------|-------------|
| `variables.{name}` | any | Game variable value |
| `entityCount('{tag}')` | number | Count of entities with tag |
| `state` | string | Current game state (playing, paused, won, lost) |
| `elapsed` | number | Seconds since game start |
| `frameId` | number | Current frame number |
| `score` | number | Shorthand for `variables.score` |
| `lives` | number | Shorthand for `variables.lives` |

### 6.3. Template Interpolation

Within `{{...}}`, expressions are evaluated and the result is stringified:

```
"Score: {{variables.score}}"          → "Score: 42"
"{{entityCount('brick')}} left"       → "7 left"
"Level {{variables.level}}"           → "Level 3"
"{{formatTime(elapsed)}}"             → "1:23"
"HP: {{variables.hp}}/{{variables.maxHp}}"  → "HP: 75/100"
```

### 6.4. Built-in Formatters

| Formatter | Signature | Example |
|-----------|-----------|---------|
| `formatTime(seconds)` | `(number) → string` | `formatTime(83)` → `"1:23"` |
| `formatNumber(n)` | `(number) → string` | `formatNumber(1234)` → `"1,234"` |
| `percent(value, max)` | `(number, number) → string` | `percent(3, 4)` → `"75%"` |

### 6.5. Conditional Visibility

```typescript
{
  id: "low-health-warning",
  type: "text",
  text: "LOW HEALTH!",
  color: "#FF0000",
  anchor: "center",
  visibleWhen: "variables.health < 20"    // Expression evaluation
}
```

### 6.6. Update Strategy

| Approach | When to use |
|----------|-------------|
| **Poll every frame** | Simple, guaranteed fresh — use for prototype |
| **Dirty flag** | Mark elements dirty when bound variable changes — use for production |
| **Event-driven** | Subscribe to variable change events — most efficient |

Recommendation: Start with polling (simple), optimize to dirty-flag when performance matters.

---

## 7. Relationship to Existing Systems

### 7.1. Overlay vs UIConfig

The overlay system **supersedes** `UIConfig` for new games. Existing games keep working.

| UIConfig Feature | Overlay Equivalent |
|------------------|--------------------|
| `variableDisplays: [{ name: "score", label: "Score", position: "top-right" }]` | `{ type: "text", anchor: "top-right", bindings: { text: "SCORE\n{{variables.score}}" } }` |
| `variableDisplays` with `format: "x{value}"` | `{ type: "text", bindings: { text: "x{{variables.multiplier}}" } }` |
| `variableDisplays` with `showWhen: "not_default"` | `{ visibleWhen: "variables.combo > 0" }` |
| `entityCountDisplays: [{ tag: "brick", label: "Bricks" }]` | `{ type: "text", bindings: { text: "BRICKS\n{{entityCount('brick')}}" } }` |
| `showTimer: true` | `{ type: "text", anchor: "top-center", bindings: { text: "{{formatTime(elapsed)}}" } }` |
| No health bar equivalent | `{ type: "bar", bindings: { value: "variables.hp", max: "variables.maxHp" } }` |
| No icon counter equivalent | `{ type: "counter", iconEmoji: "❤️", bindings: { value: "variables.lives" } }` |

### 7.2. Overlay vs Dialogs

Dialogs remain a **separate system**. They're modal — they darken the background, pause the game, and demand interaction. The overlay is non-modal — elements sit on top of gameplay without interrupting it.

However, the dialog system can be enhanced to use overlay-style bindings:

```typescript
// Current: stats reference variables by name
stats: [{ label: "Moves", variable: "moveCount" }]

// Enhanced: could use binding expressions
stats: [{ label: "Moves", binding: "variables.moveCount" }]
stats: [{ label: "Best", binding: "max(variables.score, variables.bestScore)" }]
```

### 7.3. Overlay vs Game State Screens

The hardcoded ready/pause/win/lose screens in `GameRuntime.godot.tsx` should eventually be **replaceable** by game-defined dialogs or overlay configurations. But this is a separate migration — the overlay system focuses on in-game HUD first.

**Future path**:
```typescript
// Game could define custom win screen:
dialogs: {
  dialogs: [{
    id: "game_won",
    title: "🎉 Victory!",
    stats: [{ label: "Score", variable: "score" }, { label: "Time", variable: "elapsed" }],
    buttons: [
      { label: "Next Level", eventName: "next_level", variant: "primary" },
      { label: "Replay", eventName: "restart", variant: "secondary" }
    ]
  }]
}
```

This already works today via `GameDialogsConfig` — the gap is that the engine doesn't auto-show the dialog on win/lose. That's a small runtime change, not an overlay system change.

---

## 8. Implementation: Godot CanvasLayer vs React Native

### The Core Decision

Where should the overlay render?

| Option | Pros | Cons |
|--------|------|------|
| **A: Godot CanvasLayer** | Native perf, works in 3D, single rendering path, no alignment issues | Can't use React components, text rendering less flexible, harder to style |
| **B: React Native overlay** | Rich text, flexbox layout, familiar styling, component ecosystem | Must align over Godot viewport, latency between game state and React render, doesn't work in Godot-only context |
| **C: Hybrid** | Best of both — Godot for perf-critical elements, React for rich elements | Two systems to maintain, complexity |

### Recommendation: **Option B (React Native) for now, migrate to A later if needed**

**Rationale**:
1. The existing HUD (`GameHUD.tsx`) already works this way and we know the alignment approach
2. React gives us rich text, flexbox, easy styling, and rapid iteration
3. The overlay system is simple enough that React render overhead is negligible
4. For 3D games, the Godot viewport fills the whole screen — the React overlay sits on top the same way
5. If perf becomes an issue (unlikely for HUD elements), we can move to Godot CanvasLayer later without changing the `OverlayConfig` schema

**The key insight**: The `OverlayConfig` type is renderer-agnostic. Whether we render it with React or Godot's CanvasLayer, the game definition doesn't change. This is a **rendering strategy decision**, not an API decision.

---

## 9. Godot CanvasLayer Implementation

Even though we recommend React for initial rendering, the Godot CanvasLayer path should be designed because:
1. It's needed for standalone Godot contexts (no React shell)
2. It may be the better path for 3D games long-term
3. `UIManager.gd` already has a CanvasLayer at layer 100

### Godot Node Tree

```
CanvasLayer (layer: 100, name: "OverlayLayer")
├── MarginContainer (anchored top-left)
│   └── VBoxContainer
│       ├── Label "SCORE"                    ← TextOverlayElement
│       └── Label "42"
├── MarginContainer (anchored top-right)
│   └── HBoxContainer                        ← ContainerOverlayElement
│       ├── TextureRect ❤️                    ← CounterOverlayElement icon
│       └── Label "3"
├── MarginContainer (anchored top-center)
│   └── ProgressBar                          ← BarOverlayElement
└── MarginContainer (anchored bottom-center)
    └── TextureButton                        ← ButtonOverlayElement
```

### New Godot Scripts

```
godot_project/scripts/overlay/
├── OverlayManager.gd        ← Creates CanvasLayer, manages elements
├── OverlayElement.gd        ← Base class for elements
├── OverlayText.gd           ← Label node
├── OverlayBar.gd            ← ProgressBar or custom draw
├── OverlayCounter.gd        ← HBox with TextureRect + Label
├── OverlayButton.gd         ← Button node with event emission
├── OverlayImage.gd          ← TextureRect
├── OverlayContainer.gd      ← H/VBoxContainer
└── OverlayBindingEvaluator.gd  ← Expression evaluation per frame
```

### Anchor → Godot Anchor Mapping

| OverlayAnchor | Godot Control Preset |
|---------------|---------------------|
| `top-left` | `PRESET_LEFT_WIDE` + margin |
| `top-center` | `PRESET_CENTER_TOP` + margin |
| `top-right` | `PRESET_RIGHT_WIDE` + margin |
| `center-left` | `PRESET_CENTER_LEFT` + margin |
| `center` | `PRESET_CENTER` + margin |
| `center-right` | `PRESET_CENTER_RIGHT` + margin |
| `bottom-left` | `PRESET_BOTTOM_LEFT` + margin |
| `bottom-center` | `PRESET_CENTER_BOTTOM` + margin |
| `bottom-right` | `PRESET_BOTTOM_RIGHT` + margin |

---

## 10. React Native Implementation

### 10.1. New Component: OverlayRenderer

```tsx
// app/lib/game-engine/ui/OverlayRenderer.tsx

interface OverlayRendererProps {
  config: OverlayConfig;
  gameState: GameState;
  viewportRect: ViewportRect;
  getEntitiesByTag: (tag: string) => Array<{ id: string }>;
}

function OverlayRenderer({ config, gameState, viewportRect, getEntitiesByTag }: OverlayRendererProps) {
  // Group elements by anchor
  const anchored = groupByAnchor(config.elements);

  // Create binding context
  const ctx = createBindingContext(gameState, getEntitiesByTag);

  return (
    <View style={[styles.overlay, viewportRect]}>
      {Object.entries(anchored).map(([anchor, elements]) => (
        <AnchoredGroup key={anchor} anchor={anchor as OverlayAnchor} viewportRect={viewportRect}>
          {elements.map(el => (
            <OverlayElementRenderer key={el.id} element={el} ctx={ctx} />
          ))}
        </AnchoredGroup>
      ))}
    </View>
  );
}
```

### 10.2. Element Renderers

```tsx
function OverlayElementRenderer({ element, ctx }) {
  // Check visibility
  if (element.visible === false) return null;
  if (element.visibleWhen && !evaluateExpression(element.visibleWhen, ctx)) return null;

  switch (element.type) {
    case 'text':    return <TextElement element={element} ctx={ctx} />;
    case 'bar':     return <BarElement element={element} ctx={ctx} />;
    case 'counter': return <CounterElement element={element} ctx={ctx} />;
    case 'button':  return <ButtonElement element={element} ctx={ctx} />;
    case 'image':   return <ImageElement element={element} ctx={ctx} />;
    case 'container': return <ContainerElement element={element} ctx={ctx} />;
    case 'spacer':  return <SpacerElement element={element} />;
  }
}
```

### 10.3. Integration with GameRuntime

```tsx
// In GameRuntime.godot.tsx:

// Existing: UIConfig-based HUD
{showHUD && !definition.overlay && (
  <GameHUD definition={definition} gameState={gameState} ... />
)}

// New: Overlay-based HUD (takes precedence)
{definition.overlay && (
  <OverlayRenderer
    config={definition.overlay}
    gameState={gameState}
    viewportRect={viewportRect}
    getEntitiesByTag={getEntitiesByTag}
  />
)}
```

When a game defines `overlay`, it replaces `GameHUD`. When not present, existing `UIConfig` rendering continues.

---

## 11. Dialog System Evolution

### Current State

The dialog system is already well-designed:
- `GameDialogsConfig` defines dialogs in the game definition
- A variable (`activeDialog`) controls which dialog is visible
- Dialog buttons emit game events
- Stats display game variables

### Proposed Enhancements

#### 11.1. Auto-Trigger Dialogs on Game State

```typescript
interface GameDialogDefinition {
  // ... existing fields ...

  // NEW: Auto-show when game enters this state
  showOnState?: 'won' | 'lost' | 'paused';

  // NEW: Auto-show when expression is true
  showWhen?: string;   // e.g. "variables.level > 5 && variables.score > 1000"
}
```

This lets games define custom win/lose screens as dialogs instead of using the hardcoded ones:

```typescript
dialogs: {
  dialogs: [
    {
      id: "game_won",
      showOnState: "won",
      title: "Level Complete!",
      stats: [
        { label: "Score", variable: "score" },
        { label: "Moves", variable: "moveCount" }
      ],
      buttons: [
        { label: "Next Level", eventName: "next_level", variant: "primary" },
        { label: "Replay", eventName: "restart", variant: "secondary" }
      ]
    },
    {
      id: "game_lost",
      showOnState: "lost",
      title: "Game Over",
      stats: [{ label: "Final Score", variable: "score" }],
      buttons: [
        { label: "Try Again", eventName: "restart", variant: "primary" }
      ]
    }
  ]
}
```

#### 11.2. Dialog Styling

```typescript
interface GameDialogDefinition {
  // ... existing fields ...

  // NEW: Customization
  style?: {
    backgroundColor?: string;
    titleColor?: string;
    titleFontSize?: number;
    backdropColor?: string;     // Default: rgba(0,0,0,0.7)
    width?: number | string;    // Pixel or percentage
    borderRadius?: number;
  };
}
```

#### 11.3. Binding in Stats

```typescript
// Current: stats reference a variable name
stats: [{ label: "Score", variable: "score" }]

// Enhanced: binding expression support
stats: [
  { label: "Score", binding: "formatNumber(variables.score)" },
  { label: "Time", binding: "formatTime(elapsed)" },
  { label: "Accuracy", binding: "percent(variables.hits, variables.shots)" }
]
```

---

## 12. Input Overlays

Input overlays (tap zones, joystick, D-pad, virtual buttons) remain **separate from the HUD overlay**. They:
- Need touch gesture handling (React Native's gesture system)
- Route input to the Godot bridge
- Are already well-defined by `InputConfig`
- Don't need data bindings

**No changes needed** — these stay in React as they are. The overlay system focuses on display elements, not input elements.

---

## 13. Game State Screens

### Current (Hardcoded)

```
ready → Title + instructions + Play button
paused → Resume + Restart + Level nav
won → 🎉 + final score + Play Again
lost → 💀 + final score + Play Again
```

### Future (Game-Definable)

The dialog system already supports custom screens. The gap is auto-triggering:

**Phase 1** (Overlay): Build the HUD overlay system only.
**Phase 2** (Dialogs): Add `showOnState` to dialogs so games can define custom win/lose/pause screens.
**Phase 3** (Full): Games that define state-triggered dialogs skip the hardcoded screens entirely.

```typescript
// Runtime logic:
if (gameState.state === 'won') {
  const customWinDialog = definition.dialogs?.dialogs.find(d => d.showOnState === 'won');
  if (customWinDialog) {
    // Show the game-defined dialog
    showDialog(customWinDialog);
  } else {
    // Fall back to hardcoded win screen
    showDefaultWinScreen();
  }
}
```

---

## 14. Theming and Styling

### 14.1. Default Theme

The overlay system ships with a sensible default theme that matches the current `GameHUD.tsx` styling:

```typescript
const DEFAULT_OVERLAY_THEME = {
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    shadow: true,
  },
  bar: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#4CAF50',
    height: 12,
    borderRadius: 6,
  },
  counter: {
    color: '#FFFFFF',
    fontSize: 20,
    gap: 6,
  },
  button: {
    backgroundColor: '#4CAF50',
    textColor: '#FFFFFF',
    borderRadius: 10,
    fontSize: 18,
  },
  container: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 8,
  },
};
```

### 14.2. Per-Game Theme Override

```typescript
// In GameDefinition:
overlay: {
  theme?: {
    fontFamily?: string;
    primaryColor?: string;       // Used by bars, buttons
    textColor?: string;          // Default text color
    backgroundColor?: string;    // Default container background
    fontSize?: number;           // Base font size
  },
  elements: [...]
}
```

### 14.3. Per-Element Style Override

Individual elements can override the theme:

```typescript
{
  id: "warning",
  type: "text",
  text: "DANGER!",
  color: "#FF0000",        // Overrides theme textColor
  fontSize: 32,            // Overrides theme fontSize
  style: {
    backgroundColor: "rgba(255,0,0,0.3)",
    borderRadius: 4,
    padding: 8,
  }
}
```

---

## 15. AI Generation Considerations

### 15.1. Common HUD Patterns

The AI should generate overlay configs for common game patterns:

| Game Type | Typical HUD Elements |
|-----------|---------------------|
| **Platformer** | Lives counter (❤️), score text, coin counter (🪙) |
| **Puzzle** | Move counter, timer bar, score text |
| **Arcade** | Score text, high score text, lives counter |
| **Shooter** | Health bar, ammo counter, score text |
| **Match-3** | Move counter, score text, target counter |
| **Endless runner** | Distance text, coin counter, score text |

### 15.2. Example Overlays

**Simple score display:**
```json
{
  "overlay": {
    "elements": [
      {
        "id": "score",
        "type": "text",
        "anchor": "top-center",
        "offset": { "x": 0, "y": 20 },
        "fontSize": 28,
        "color": "#FFFFFF",
        "fontWeight": "bold",
        "bindings": { "text": "{{variables.score}}" }
      }
    ]
  }
}
```

**Platformer HUD:**
```json
{
  "overlay": {
    "elements": [
      {
        "id": "lives",
        "type": "counter",
        "anchor": "top-left",
        "offset": { "x": 16, "y": 16 },
        "iconEmoji": "❤️",
        "fontSize": 22,
        "bindings": { "value": "variables.lives" }
      },
      {
        "id": "coins",
        "type": "counter",
        "anchor": "top-left",
        "offset": { "x": 16, "y": 52 },
        "iconEmoji": "🪙",
        "fontSize": 22,
        "bindings": { "value": "variables.coins" }
      },
      {
        "id": "score",
        "type": "text",
        "anchor": "top-right",
        "offset": { "x": -16, "y": 16 },
        "fontSize": 24,
        "fontWeight": "bold",
        "bindings": { "text": "Score: {{formatNumber(variables.score)}}" },
        "style": {
          "backgroundColor": "rgba(0,0,0,0.6)",
          "borderRadius": 8,
          "paddingHorizontal": 12,
          "paddingVertical": 6
        }
      }
    ]
  }
}
```

**Shooter HUD:**
```json
{
  "overlay": {
    "elements": [
      {
        "id": "health",
        "type": "bar",
        "anchor": "bottom-left",
        "offset": { "x": 16, "y": -60 },
        "width": 150,
        "height": 16,
        "color": "#FF4444",
        "borderRadius": 3,
        "bindings": { "value": "variables.health", "max": "variables.maxHealth" },
        "showLabel": true,
        "labelFormat": "{value}/{max}"
      },
      {
        "id": "ammo",
        "type": "text",
        "anchor": "bottom-right",
        "offset": { "x": -16, "y": -60 },
        "fontSize": 28,
        "color": "#CCCCCC",
        "bindings": { "text": "{{variables.ammo}} / {{variables.maxAmmo}}" }
      },
      {
        "id": "score",
        "type": "text",
        "anchor": "top-center",
        "offset": { "x": 0, "y": 16 },
        "fontSize": 20,
        "bindings": { "text": "{{formatNumber(variables.score)}}" }
      }
    ]
  }
}
```

---

## 16. Migration Strategy

### Phase 1: Additive — No Breaking Changes

1. Add `OverlayConfig` type to `shared/src/types/overlay.ts`
2. Add optional `overlay` field to `GameDefinition`
3. Create `OverlayRenderer.tsx` React component
4. In `GameRuntime`, render `OverlayRenderer` when `overlay` is present, fall back to `GameHUD` otherwise
5. All existing games continue using `UIConfig` + `GameHUD` unchanged

### Phase 2: Dialog Enhancements

1. Add `showOnState` and `showWhen` to `GameDialogDefinition`
2. Auto-trigger dialogs on game state transitions
3. Games with state-triggered dialogs skip hardcoded win/lose screens
4. Games without custom dialogs keep hardcoded screens

### Phase 3: Deprecation Path (Optional, Future)

1. Auto-generate `overlay` config from `UIConfig` for older games
2. Mark `UIConfig.variableDisplays` and `entityCountDisplays` as deprecated
3. Update game-authoring skill documentation to recommend `overlay`

### Migration Helper (Phase 3)

```typescript
function uiConfigToOverlay(ui: UIConfig): OverlayConfig {
  const elements: OverlayElement[] = [];

  // Convert variable displays
  for (const display of ui.variableDisplays ?? []) {
    elements.push({
      id: `var-${display.name}`,
      type: 'text',
      anchor: display.position === 'top-right' ? 'top-right'
            : display.position === 'top-center' ? 'top-center'
            : 'top-left',
      offset: { x: 12, y: 12 },
      fontSize: 20,
      fontWeight: 'bold',
      color: display.color ?? '#FFFFFF',
      bindings: { text: `${display.label.toUpperCase()}\n{{variables.${display.name}}}` },
      ...(display.showWhen === 'not_default' ? {
        visibleWhen: `variables.${display.name} != ${JSON.stringify(display.defaultValue)}`
      } : {}),
      style: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
      },
    });
  }

  // Convert entity count displays
  for (const display of ui.entityCountDisplays ?? []) {
    elements.push({
      id: `count-${display.tag}`,
      type: 'text',
      anchor: 'top-left',
      offset: { x: 12, y: 12 },
      fontSize: 20,
      fontWeight: 'bold',
      color: display.color ?? '#FFFFFF',
      bindings: { text: `${display.label.toUpperCase()}\n{{entityCount('${display.tag}')}}` },
      style: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
      },
    });
  }

  return { elements };
}
```

---

## 17. Phased Implementation Plan

### Phase 1: Overlay Types + React Renderer (3–4 days)

- [ ] Create `shared/src/types/overlay.ts` with all element types
- [ ] Add `overlay?: OverlayConfig` to `GameDefinition`
- [ ] Implement binding expression evaluator (template interpolation + direct references)
- [ ] Create `OverlayRenderer.tsx` with element renderers for all types
- [ ] Create `AnchoredGroup.tsx` for screen-edge positioning
- [ ] Integrate into `GameRuntime.godot.tsx` (overlay present → use it, absent → use GameHUD)
- [ ] Test with a real game (add overlay to existing 2D game)
- [ ] Verify on web, iOS, Android
- **Deliverable**: Working overlay HUD on 2D games

### Phase 2: Dialog Enhancements (2–3 days)

- [ ] Add `showOnState`, `showWhen`, `style` to `GameDialogDefinition`
- [ ] Implement auto-trigger logic in `GameRuntime`
- [ ] Games with state-triggered dialogs skip hardcoded screens
- [ ] Add binding expression support in dialog stats
- [ ] Test: game with custom win/lose dialogs
- **Deliverable**: Game-definable win/lose/pause screens

### Phase 3: Binding Enhancements (1–2 days)

- [ ] Add built-in formatters (`formatTime`, `formatNumber`, `percent`)
- [ ] Add `visibleWhen` expression support
- [ ] Add `disabledWhen` for buttons
- [ ] Performance: implement dirty-flag update (skip re-evaluation when state hasn't changed)
- **Deliverable**: Rich, dynamic overlays with conditional visibility

### Phase 4: Theming (1–2 days)

- [ ] Default theme implementation
- [ ] Per-game `overlay.theme` support
- [ ] Per-element style override
- [ ] Update AI generation prompts to include overlay
- **Deliverable**: Styled, branded game HUDs

### Phase 5: Godot CanvasLayer Path (Future, Optional)

- [ ] Implement `OverlayManager.gd` + element renderers
- [ ] Binding evaluator in GDScript
- [ ] Wire into GameBridge method map
- [ ] Feature-flag: choose React or Godot rendering
- **Deliverable**: Godot-native overlay for standalone contexts

---

## 18. Open Questions

### Decided

| Question | Decision | Rationale |
|----------|----------|-----------|
| Overlay renderer? | React Native first | Existing pattern, fast iteration, alignment known |
| Break UIConfig? | No — additive | Backward compat |
| Overlay + UIConfig coexist? | Overlay takes precedence when present | Clean fallback |
| Input overlays in overlay system? | No — stay separate | Different concern (input vs display) |

### Still Open

| Question | Options | Decide By |
|----------|---------|-----------|
| Should overlay support animations (fade in/out, pulse)? | A) Yes, declarative B) No, static only C) CSS-like transitions | Phase 3 |
| Should overlay support scroll/list elements? | A) Yes B) No — just for HUDs | Phase 1 |
| How should overlay handle safe areas (notches, rounded corners)? | A) Auto-inset B) Developer-specified margins C) Both | Phase 1 |
| Should buttons in overlay emit events through rules or through a separate handler? | A) Game events (like dialogs) B) Direct bridge calls | Phase 1 |
| Should we support overlay element ordering/z-index? | A) Render order = definition order B) Explicit zIndex | Phase 1 |
| When should we migrate to Godot CanvasLayer? | A) When 3D ships B) When perf requires it C) Never | Phase 5 |

---

## Summary

The UI Overlay System replaces the scattered, hardcoded game UI with a single declarative system:

1. **One `overlay` field** in `GameDefinition` controls all HUD elements
2. **Binding system** auto-updates elements when game state changes
3. **7 element types** (text, bar, counter, button, image, container, spacer) cover all HUD needs
4. **Anchor-based positioning** works regardless of viewport size or aspect ratio
5. **Works for 2D and 3D** — same overlay config on any scene type
6. **100% backward compatible** — existing `UIConfig` and `dialogs` keep working
7. **Dialog enhancements** let games define custom win/lose/pause screens
8. **Renderer-agnostic** schema — React Native now, Godot CanvasLayer later if needed
