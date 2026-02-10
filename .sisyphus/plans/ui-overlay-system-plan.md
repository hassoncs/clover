# UI Overlay System Architecture Plan

> Design for a unified, declarative overlay/HUD system that works identically for 2D and 3D games — replacing the current scattered UI approach with a single, game-definition-driven system.
>
> **Companion document**: [3D Game Engine Plan](./3d-game-engine-plan.md) covers the 3D world, entity, and physics systems.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Current System Audit](#2-current-system-audit)
3. [Design Goals](#3-design-goals)
4. [Scope & Boundaries](#4-scope--boundaries)
5. [Overlay Architecture](#5-overlay-architecture)
6. [Overlay Type System](#6-overlay-type-system)
7. [Binding System](#7-binding-system)
8. [Relationship to Existing Systems](#8-relationship-to-existing-systems)
9. [Rendering Strategy](#9-rendering-strategy)
10. [Godot CanvasLayer Implementation (DEFERRED)](#10-godot-canvaslayer-implementation-deferred)
11. [React Native Integration](#11-react-native-integration)
12. [Dialog System Evolution](#12-dialog-system-evolution)
13. [Input Overlays](#13-input-overlays)
14. [Game State Screens](#14-game-state-screens)
15. [Theming and Styling](#15-theming-and-styling)
16. [AI Generation Considerations](#16-ai-generation-considerations)
17. [Migration Strategy](#17-migration-strategy)
18. [Phased Implementation Plan](#18-phased-implementation-plan)
19. [Open Questions](#19-open-questions)

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

## 4. Scope & Boundaries

This system is a **Screen-Space HUD** — it draws flat UI anchored to screen edges on top of the game world. It is explicitly **not** a world-space UI system.

### What This System Does

- Score displays, health bars, coin counters, timers
- In-game buttons (pause, ability activation)
- Containers grouping related HUD elements
- Conditional visibility based on game state
- Data binding to game variables and entity counts

### What This System Does NOT Do

| Need | Why Not Here | Where It Belongs |
|------|-------------|-----------------|
| Health bars above enemy heads | Requires per-entity screen-space projection every frame — floods the bridge | **Entity-attached UI** in Godot (see [3D Plan, Entity UI](./3d-game-engine-plan.md#63-entity-attached-ui)) |
| Damage numbers popping off hits | Same — world-space, per-frame coordinate sync | Godot `CPUParticles2D` / `Sprite3D` positioned by the entity |
| NPC name labels floating in 3D | Same | Godot `Label3D` or `Sprite3D` with billboard mode |
| In-world interaction prompts ("Press E") | Needs to track entity position | Godot `Control` node as entity child |

**Rule**: If the UI element needs to know where an entity is in the game world, it belongs in the entity system (Godot), not in the overlay system (React).

---

## 5. Overlay Architecture

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

Anchors are **screen-relative** — they stay in the correct position regardless of viewport letterboxing or aspect ratio.

#### Offset Convention: Inward from Anchor

Offsets are applied **inward** from the anchor point. Positive values always move the element toward the center of the screen, regardless of which edge the anchor is on:

| Anchor | Positive `x` | Positive `y` |
|--------|-------------|-------------|
| `top-left` | → right | ↓ down |
| `top-right` | ← left | ↓ down |
| `bottom-left` | → right | ↑ up |
| `bottom-right` | ← left | ↑ up |
| `top-center` | → right (ignored for centering) | ↓ down |
| `bottom-center` | → right (ignored) | ↑ up |
| `center-left` | → right | ↓ down (ignored) |
| `center-right` | ← left | ↓ down (ignored) |
| `center` | → right (ignored) | ↓ down (ignored) |

This means `offset: { x: 16, y: 16 }` always means "16px inward from the edge" — no negative values needed. This is author-friendly and AI-friendly.

#### Safe Area Handling

The anchor origin is computed from `viewportRect ∩ safeAreaInsets`, not the full screen:

```typescript
// Anchor origin computation:
function getAnchorOrigin(anchor: OverlayAnchor, viewport: Rect, safeArea: Insets): Point {
  const safe = {
    left: viewport.x + safeArea.left,
    right: viewport.x + viewport.width - safeArea.right,
    top: viewport.y + safeArea.top,
    bottom: viewport.y + viewport.height - safeArea.bottom,
  };
  // "top-left" anchor origin = (safe.left, safe.top)
  // "bottom-right" anchor origin = (safe.right, safe.bottom)
  // etc.
}
```

This ensures elements never render under notches or rounded corners on iOS/Android. The `OverlayRenderer` wraps content in a `SafeAreaView` and computes anchor origins from the safe-area-adjusted viewport rect.

#### Anchor Collision Behavior

Multiple elements can share the same anchor. They **do not auto-stack** — they overlap if offsets coincide. This is by design:

- **Simple case**: Use different offsets (e.g., lives at `y: 16`, coins at `y: 52`)
- **Grouped elements**: Use a `container` element to group related items at one anchor point. The container handles internal layout (vertical/horizontal stacking with `gap`)
- **No implicit z-index**: Elements render in definition order. Later elements draw on top of earlier ones.

Recommended pattern for multiple same-anchor elements:
```json
{
  "type": "container",
  "anchor": "top-left",
  "offset": { "x": 16, "y": 16 },
  "direction": "vertical",
  "gap": 8,
  "children": [
    { "id": "lives", "type": "counter", "iconEmoji": "❤️", "bindings": { "value": "variables.lives" } },
    { "id": "coins", "type": "counter", "iconEmoji": "🪙", "bindings": { "value": "variables.coins" } }
  ]
}
```

### 5.3. Base Element

```typescript
interface BaseOverlayElement {
  id: string;
  type: OverlayElementType;
  anchor?: OverlayAnchor;               // REQUIRED on root elements, IGNORED on container children
  offset?: { x: number; y: number };    // Inward offset from anchor (see Offset Convention below)
  visible?: boolean;                     // Default: true
  visibleWhen?: string;                  // Expression evaluated by expr-eval: "variables.lives > 0"
  bindings?: Record<string, string>;     // Bind properties to game state
  style?: OverlayStyle;                 // Visual customization
}
```

**Anchor rules:**
- **Root elements** (top-level in `elements[]`): `anchor` is **required**. Validator rejects root elements without an anchor.
- **Container children**: `anchor` is **ignored**. Children are positioned by the parent container's layout (`direction` + `gap`). If specified, it's silently ignored.
- **Offset on children**: Also ignored. Use the container's `gap` for spacing, or add a `spacer` child.

```typescript
// Validator pseudo-code:
function validateOverlay(config: OverlayConfig) {
  for (const el of config.elements) {
    if (!el.anchor) throw `Root element "${el.id}" requires an anchor`;
    if (el.type === 'container' && el.children) {
      for (const child of el.children) {
        // anchor + offset are ignored on children, no error
      }
    }
  }
}
```

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

**Button event emission**: On press, buttons emit a game event via the existing `EventEmitter` system (same path as dialog buttons). The event is **queued** to the next rules tick — it does not fire synchronously during the React render.

```typescript
// Exact emitted payload:
{
  name: element.eventName,        // e.g. "pause", "use_ability"
  data: {
    ...element.eventData,         // Author-defined payload
    __source: 'overlay',          // Always present
    __elementId: element.id,      // Always present
  }
}
```

Rules can trigger on these events:
```json
{ "trigger": { "type": "event", "eventName": "pause" } }
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

#### Reticle (Phase 2b — crosshair for shooters / 3D games)

> **Not in v1 schema.** The reticle element ships in Phase 2b alongside the 3D engine work. Until then, games can use an `image` element at `anchor: "center"` as a crosshair.

```typescript
// Phase 2b addition:
export interface ReticleOverlayElement extends BaseOverlayElement {
  type: 'reticle';
  reticleStyle: 'dot' | 'cross' | 'circle' | 'custom';
  size?: number;                     // Diameter in pixels (default: 24)
  thickness?: number;                // Line thickness (default: 2)
  color?: string;                    // Default: #FFFFFF
  gap?: number;                      // Center gap for 'cross' style (default: 4)
  dot?: boolean;                     // Center dot (default: true for 'cross')
  customImage?: string;              // Asset ref for 'custom' style
  // Dynamic bindings:
  // "spread" → reticle expands (e.g., when shooting/moving)
}
```

The reticle is **always centered** on screen (anchor is forced to `"center"`, offset ignored). Pixel-perfect centering is critical — the renderer uses exact `width/2, height/2` math, not flexbox centering.

### 5.5. Union Type (v1)

```typescript
export type OverlayElementType =
  | 'text'
  | 'bar'
  | 'counter'
  | 'button'
  | 'image'
  | 'container'
  | 'spacer';
  // Phase 2b adds: 'reticle'

export type OverlayElement =
  | TextOverlayElement
  | BarOverlayElement
  | CounterOverlayElement
  | ButtonOverlayElement
  | ImageOverlayElement
  | ContainerOverlayElement
  | SpacerOverlayElement;
  // Phase 2b adds: ReticleOverlayElement
```

---

## 6. Binding System

Bindings connect overlay elements to live game state. The binding system evaluates string expressions against the game context each frame (or on change).

### 6.1. Binding Syntax & Evaluation Rules

**One expression engine everywhere: `expr-eval`.** All binding values and all condition expressions (`visibleWhen`, `disabledWhen`) use the same `expr-eval` grammar. No separate "template interpolation" vs "expression evaluation" — it's all expr-eval.

**Evaluation rules per binding key:**

| Binding Key | Input Type | Evaluation | Return Type | Example |
|-------------|-----------|-----------|-------------|---------|
| `bindings.text` | **String template** | `{{expr}}` blocks are evaluated by expr-eval, results stringified and interpolated | `string` | `"Score: {{variables.score}}"` |
| `bindings.value` | **Expression** | Entire string is one expr-eval expression | `number` | `"variables.health"` |
| `bindings.max` | **Expression** | Entire string is one expr-eval expression | `number` | `"variables.maxHealth"` |
| `bindings.spread` | **Expression** | Entire string is one expr-eval expression | `number` | `"variables.recoil * 10"` |
| `visibleWhen` | **Expression** | Entire string is one expr-eval expression, result coerced to boolean | `boolean` | `"variables.health < 20 && variables.lives > 0"` |
| `disabledWhen` | **Expression** | Entire string is one expr-eval expression, result coerced to boolean | `boolean` | `"variables.ammo == 0"` |

**String template rules** (`bindings.text` only):
- Literal text outside `{{}}` is passed through
- Each `{{expr}}` block is evaluated as an expr-eval expression
- Result is `toString()`'d and interpolated
- Escaping: `\{\{` for literal braces (edge case, AI unlikely to need)

```typescript
// String template examples:
bindings: { text: "Score: {{variables.score}}" }           // → "Score: 42"
bindings: { text: "{{entityCount('brick')}} bricks left" } // → "7 bricks left"
bindings: { text: "Time: {{formatTime(elapsed)}}" }        // → "Time: 1:23"
bindings: { text: "HP: {{variables.hp}}/{{variables.maxHp}}" } // → "HP: 75/100"

// Expression examples (entire string is one expression):
bindings: { value: "variables.health" }                    // → 75
bindings: { max: "variables.maxHealth" }                   // → 100
bindings: { value: "variables.score * 2" }                 // → 84

// Condition examples:
visibleWhen: "variables.health < 20"                       // → true/false
visibleWhen: "(variables.score > 100) || (variables.level > 5)" // → true/false
```

### 6.2. Available Binding Context

The binding context is an object passed to `expr-eval` as the evaluation scope. It is rebuilt once per frame (or on state change with dirty-flag optimization).

| Path | Type | Description | Implementation |
|------|------|-------------|----------------|
| `variables.{name}` | any | Game variable value | Direct ref to `gameState.variables` |
| `entityCount(tag)` | `(string) → number` | Count of entities with tag | See below |
| `state` | string | Current game state | `gameState.state` |
| `elapsed` | number | Seconds since game start | See timer optimization (§6.8) |
| `frameId` | number | Current frame number | `gameState.frameId` |
| `score` | number | Shorthand for `variables.score` | Sugar: `gameState.variables.score ?? 0` |
| `lives` | number | Shorthand for `variables.lives` | Sugar: `gameState.variables.lives ?? 0` |

**`entityCount()` implementation:**

```typescript
// Built once per frame, cached:
function buildBindingContext(gameState: GameState, entities: EntityRegistry): BindingContext {
  // Pre-compute tag counts ONCE per frame — O(n) where n = total entities
  const tagCounts = new Map<string, number>();
  for (const entity of entities.values()) {
    for (const tag of entity.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return {
    variables: gameState.variables,
    state: gameState.state,
    elapsed: gameState.elapsed,
    frameId: gameState.frameId,
    score: gameState.variables.score ?? 0,
    lives: gameState.variables.lives ?? 0,
    entityCount: (tag: string) => tagCounts.get(tag) ?? 0,  // O(1) lookup
    formatTime, formatNumber, percent,  // Built-in formatters
  };
}
```

`entityCount()` is O(1) per call because tag counts are pre-computed once per frame. The `tagCounts` map is rebuilt only when the entity list changes (dirty-flag on entity spawn/destroy).

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

### 6.5. Expression Evaluator Design

The overlay system needs two kinds of evaluation:

| Type | Syntax | Complexity | Example |
|------|--------|-----------|---------|
| **Template interpolation** | `{{path}}` or `{{fn(path)}}` | Regex + path lookup | `"Score: {{variables.score}}"` |
| **Conditional expressions** | Comparison + boolean operators | Simple parser | `"variables.health < 20"` |

**Decision: Use a battle-tested expression library, NOT a custom parser or `eval()`.**

Conditional expressions (`visibleWhen`, `disabledWhen`) need to handle:
- Simple comparisons: `variables.health < 20`
- Boolean logic: `variables.health < 20 && variables.lives > 0`
- Negation: `!variables.gameOver`
- Parentheses: `(variables.score > 100) || (variables.level > 5)`

**Why not a custom parser**: Every "simple 50-line parser" grows into a buggy AST implementation once you need `&&`, `||`, `!`, and parentheses. The AI will generate complex expressions because it can — the evaluator must handle them reliably.

**Recommended library**: [`expr-eval`](https://github.com/silentmatt/expr-eval) (~5KB gzipped, zero dependencies, battle-tested):

```typescript
import { Parser } from 'expr-eval';

const parser = new Parser();

function evaluateExpression(expr: string, ctx: BindingContext): boolean {
  try {
    const result = parser.evaluate(expr, {
      variables: ctx.variables,
      state: ctx.state,
      elapsed: ctx.elapsed,
      entityCount: ctx.entityCount, // function reference
    });
    return Boolean(result);
  } catch {
    return false; // Malformed expression = hidden
  }
}
```

This handles all practical HUD conditions without the security risk of `eval()` — `expr-eval` does not execute arbitrary JavaScript. Complex game logic still belongs in the rules engine, not the overlay.

### 6.6. Conditional Visibility

```typescript
{
  id: "low-health-warning",
  type: "text",
  text: "LOW HEALTH!",
  color: "#FF0000",
  anchor: "center",
  visibleWhen: "variables.health < 20"    // Simple comparison expression
}
```

### 6.7. Update Strategy

| Approach | When to use |
|----------|-------------|
| **Poll every frame** | Simple, guaranteed fresh — use for prototype |
| **Dirty flag** | Mark elements dirty when bound variable changes — use for production |
| **Event-driven** | Subscribe to variable change events — most efficient |

Recommendation: Start with polling (simple), optimize to dirty-flag when performance matters.

### 6.8. Bridge Latency Mitigation

The React Native bridge is asynchronous. Data takes non-zero time to serialize, cross the bridge, update React state, and render. For most HUD elements (score, lives, health bars) the slight delay is imperceptible. But **high-frequency values** need special handling:

| Value Type | Problem | Solution |
|-----------|---------|----------|
| **Timers / Elapsed** | 60fps updates flood the bridge; timer text looks stuttery | Send `timerStartedAt` timestamp once. React calculates elapsed locally via `requestAnimationFrame`. Sync on pause/stop/reset. |
| **Smooth bars** (health draining) | Discrete jumps look cheap | React animates between old and new value using `Animated.timing`. Bridge only sends when value actually changes. |
| **Scores** | Rapid increments (10 per second) | Batch: bridge sends latest value at most every 100ms. React can animate the count-up. |

**Implementation**: The binding evaluator checks if a variable was updated this frame. If not, skip re-evaluation entirely. Combined with dirty-flag tracking, this means idle HUD elements cost zero bridge traffic.

```typescript
// Timer optimization: React-side local calculation
function useGameTimer(timerStartedAt: number | null, isPaused: boolean): string {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!timerStartedAt || isPaused) return;
    const tick = () => {
      setElapsed((Date.now() - timerStartedAt) / 1000);
      rafId = requestAnimationFrame(tick);
    };
    let rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [timerStartedAt, isPaused]);
  return formatTime(elapsed);
}
```

---

## 7. Relationship to Existing Systems

### 7.1. Overlay vs UIConfig

The overlay system **replaces** `UIConfig` entirely. During Phase 1-2, both coexist (overlay takes precedence when present). In Phase 3, all games are migrated and UIConfig is deleted.

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

### Decision: **One Config, Two Renderers (React Now, Godot Later)**

**The key insight**: The `OverlayConfig` is renderer-agnostic. The AI always generates the same JSON. The runtime decides who draws it.

```typescript
export interface OverlayConfig {
  elements: OverlayElement[];
  theme?: OverlayTheme;
  // NOTE: No "renderer" field in v1. React Native is the sole renderer.
  // A "renderer" field may be added in a future version if Godot rendering
  // is needed. Until then, validators reject any "renderer" key.
}
```

**Phase 1 (Now): React Native** — sole renderer.
- Rich text, flexbox layout, familiar styling, rapid iteration
- The existing HUD pattern is proven
- For 3D games, React sits on top of the Godot viewport identically
- AI generates `OverlayConfig` JSON; React interprets it

**Phase Future (If Needed): Godot CanvasLayer** — same JSON, different interpreter.
- `OverlayManager.gd` reads the same JSON and builds Godot `Control` nodes
- Bindings happen inside Godot (zero bridge traffic for updates)
- Activated by `renderer: "godot"` — game author/AI picks
- Best for: pixel-art games, high-action shooters, immersive 3D

**Why this is the right complexity**: The AI doesn't need to know which renderer draws the UI. It outputs a list of elements with anchors. The `renderer` flag is an engine-level optimization choice, not a content choice. We ship React now and add Godot later without touching any game definitions.

**Current scope**: React Native only. The `renderer` field exists in the type but `"godot"` is not implemented. This is an explicit future hook, not a current deliverable.

---

## 9. Godot CanvasLayer Implementation (DEFERRED — React Only)

> **Decision: React Native is the sole overlay renderer.** The Godot CanvasLayer path is deferred indefinitely. We commit to one rendering system to avoid maintaining two parallel implementations.
>
> If performance becomes an issue in the future (unlikely for HUD elements), this section documents the Godot approach. But it is **not in scope** for implementation.

The designs below are preserved for reference only:

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

  // IMPORTANT: Render elements in DEFINITION ORDER to preserve z-ordering.
  // Each element is absolutely positioned based on its anchor + offset.
  // Do NOT use groupByAnchor — that breaks global ordering.
  return (
    // CRITICAL: pointerEvents="box-none" lets touches pass through to the game
    // underneath. Only interactive children (buttons) capture touches.
    <View style={[styles.overlay, viewportRect]} pointerEvents="box-none">
      {config.elements.map((el, index) => (
        <AbsoluteAnchoredElement
          key={el.id}
          anchor={el.anchor!}
          offset={el.offset}
          viewportRect={viewportRect}
          zIndex={index}
          pointerEvents={el.type === 'button' ? 'auto' : 'none'}
        >
          <OverlayElementRenderer element={el} ctx={ctx} />
        </AbsoluteAnchoredElement>
      ))}
    </View>
  );
}
```

#### Touch Event Handling (Critical)

The overlay is a full-screen transparent `View` sitting on top of the Godot viewport. Without proper `pointerEvents` configuration, it will swallow all touch input meant for the game.

| Node | `pointerEvents` | Why |
|------|-----------------|-----|
| Root overlay `View` | `"box-none"` | Passes touches through to Godot unless a child captures them |
| `AnchoredGroup` | `"box-none"` | Same — layout container, not interactive |
| Non-interactive elements (text, bar, counter, image, spacer) | `"none"` | Never capture touches |
| Interactive elements (button) | `"auto"` | Captures touches, emits game events |

**Z-index ordering** (bottom to top): Game viewport → Input overlays (joystick/dpad) → HUD overlay → Dialogs. If a HUD button overlaps a joystick zone, the HUD button wins. This is intentional — HUD buttons are smaller and explicitly placed; if they overlap input zones, the game author should adjust offsets.

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

// TEMPORARY (Phase 1-2): UIConfig fallback during migration
{showHUD && !definition.overlay && (
  <GameHUD definition={definition} gameState={gameState} ... />
)}

// Overlay-based HUD (takes precedence, and eventually sole renderer)
{definition.overlay && (
  <OverlayRenderer
    config={definition.overlay}
    gameState={gameState}
    viewportRect={viewportRect}
    getEntitiesByTag={getEntitiesByTag}
  />
)}
```

During Phase 1-2, when a game defines `overlay`, it replaces `GameHUD`. When not present, existing `UIConfig` rendering continues as a **temporary** fallback. In Phase 3, all games are migrated to overlay and the GameHUD fallback is deleted.

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

### Future → Mandatory (Game-Definable with Default Templates)

The dialog system already supports custom screens. The gap is auto-triggering — and removing the hardcoded fallbacks.

**Phase 1** (Overlay): Build the HUD overlay system only.
**Phase 2** (Dialogs): Add `showOnState` to dialogs. Create **default dialog templates** that replicate the current hardcoded screens.
**Phase 4** (Cleanup): All games have dialog definitions (custom or default). Delete the hardcoded screens from `GameRuntime.godot.tsx`.

#### Default Dialog Templates

Games that don't define custom state screens get these injected at load time:

```typescript
const DEFAULT_STATE_DIALOGS: GameDialogDefinition[] = [
  {
    id: '__default_won',
    showOnState: 'won',
    title: 'You Win!',
    stats: [{ label: 'Score', variable: 'score' }],
    buttons: [
      { label: 'Play Again', eventName: 'restart', variant: 'primary' },
    ],
  },
  {
    id: '__default_lost',
    showOnState: 'lost',
    title: 'Game Over',
    stats: [{ label: 'Score', variable: 'score' }],
    buttons: [
      { label: 'Try Again', eventName: 'restart', variant: 'primary' },
    ],
  },
  {
    id: '__default_paused',
    showOnState: 'paused',
    title: 'Paused',
    buttons: [
      { label: 'Resume', eventName: 'resume', variant: 'primary' },
      { label: 'Restart', eventName: 'restart', variant: 'secondary' },
    ],
  },
];
```

#### Runtime Logic (Phase 2)

```typescript
// At game load time, inject defaults for any missing state dialogs:
function ensureStateDialogs(definition: GameDefinition): GameDefinition {
  const existing = definition.dialogs?.dialogs ?? [];
  const coveredStates = new Set(existing.filter(d => d.showOnState).map(d => d.showOnState));

  const defaults = DEFAULT_STATE_DIALOGS.filter(d => !coveredStates.has(d.showOnState));

  return {
    ...definition,
    dialogs: {
      ...definition.dialogs,
      dialogs: [...existing, ...defaults],
    },
  };
}
```

#### Removal (Phase 4)

Once all games go through `ensureStateDialogs()`:
- Delete the hardcoded ready/pause/win/lose JSX blocks from `GameRuntime.godot.tsx`
- Delete the associated styles
- The dialog system handles all state screens — custom or default
- **One system for state screens: dialogs with `showOnState`**

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

### 14.2. Font Loading

**The problem**: If an AI generates a "Spooky Horror Game" and the overlay uses system San Francisco font, the vibe is dead on arrival. Font matching is critical for game feel.

```typescript
export interface OverlayTheme {
  // Font configuration
  fontFamily?: string;           // System font name OR asset ref to .ttf/.otf
  fontUrl?: string;              // URL to downloadable font file
  fontPreset?: FontPreset;       // Quick picks for common game vibes

  // ... other theme fields below
}

type FontPreset =
  | 'system'         // Platform default (San Francisco / Roboto)
  | 'pixel'          // Bundled pixel font (e.g., Press Start 2P)
  | 'retro'          // Bundled retro font (e.g., VT323)
  | 'handwritten'    // Bundled casual font
  | 'monospace';     // Bundled mono font (e.g., JetBrains Mono)
```

**Implementation**: Bundle 3-4 font files (~200KB total) with the app. `fontPreset` resolves to a bundled font. `fontFamily` or `fontUrl` loads a custom font via React Native's font loading system. The AI picks a preset that matches the game's genre.

### 14.3. Pixel Mode

For retro/pixel-art games, the overlay should match the game's low-resolution aesthetic instead of looking like a crisp mobile app UI slapped on top.

```typescript
export interface OverlayTheme {
  // ... font fields ...

  pixelMode?: boolean;           // Default: false
  pixelScale?: number;           // e.g., 3 = render at 1/3 resolution, scale up 3x
}
```

When `pixelMode: true`:
- Text renders at the `pixelScale`-reduced resolution and is scaled up with nearest-neighbor interpolation (`imageRendering: 'pixelated'` on web, `resizeMode: 'nearest'` on native)
- All positions snap to integer pixel boundaries
- Font is forced to `fontPreset: 'pixel'` unless overridden
- Bars and containers use hard edges (borderRadius forced to 0)

This prevents the "cheap mobile port" look where crisp vector UI sits on top of crunchy pixel art.

### 14.4. Per-Game Theme Override

```typescript
// In GameDefinition:
overlay: {
  theme?: {
    fontFamily?: string;
    fontPreset?: FontPreset;
    fontUrl?: string;
    pixelMode?: boolean;
    pixelScale?: number;
    primaryColor?: string;       // Used by bars, buttons
    textColor?: string;          // Default text color
    backgroundColor?: string;    // Default container background
    fontSize?: number;           // Base font size
  },
  elements: [...]
}
```

### 14.5. Per-Element Style Override

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

### Phase 1: Additive (Temporary Coexistence)

1. Add `OverlayConfig` type to `shared/src/types/overlay.ts`
2. Add optional `overlay` field to `GameDefinition`
3. Create `OverlayRenderer.tsx` React component
4. In `GameRuntime`, render `OverlayRenderer` when `overlay` is present, fall back to `GameHUD` otherwise
5. All existing games continue using `UIConfig` + `GameHUD` unchanged (temporary)

### Phase 2: Dialog Enhancements + State Screen Templates

1. Add `showOnState` and `showWhen` to `GameDialogDefinition`
2. Create `ensureStateDialogs()` — inject default dialog templates for missing states
3. Auto-trigger dialogs on game state transitions
4. Games with state-triggered dialogs use the dialog system
5. Games without custom dialogs get default templates injected

### Phase 3: UIConfig Removal (MANDATORY)

> **No legacy maintenance.** This phase converts all existing games to the overlay system and deletes the old UIConfig code paths entirely.

1. Run `uiConfigToOverlay()` migration on all existing game definitions (DB or static JSON)
2. Verify each converted game renders identically to the old GameHUD
3. Remove `UIConfig` type from `GameDefinition.ts` (delete `variableDisplays`, `entityCountDisplays`, `showTimer`)
4. Delete `GameHUD.tsx` entirely
5. Remove the UIConfig fallback branch from `GameRuntime.godot.tsx`
6. Update all game-authoring skills to use `overlay` exclusively
7. **Test**: Every existing game loads and displays its HUD correctly via overlay
8. **Deliverable**: Zero UIConfig code paths remain. One HUD system: overlay.

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

> **Implementation order**: This overlay plan should be implemented **before** the [3D Game Engine Plan](./3d-game-engine-plan.md). The overlay provides the HUD/binding system that 3D games will use from day one. Since the overlay is screen-space and scene-type agnostic, it works for both 2D and 3D without modification.
>
> **No-legacy constraint**: Phases 1–2b build new systems alongside existing ones (temporary coexistence). Phases 3–5 delete all legacy code. The constraint is: **each milestone (not each phase) must end with deletion**. Milestone 1 = Phases 1+2+2b (build). Milestone 2 = Phases 3+4+5 (migrate+delete). No legacy code survives past Milestone 2.
>
> **Schema freeze**: After Phase 1 is complete, the overlay schema v1 types are **frozen**. The 3D plan Phase 0 may begin only after this freeze. Additive changes (new element types like reticle) are allowed; field renames or semantic changes are not.

### Phase 1: Overlay Types + React Renderer (3–4 days)

- [ ] Create `shared/src/types/overlay.ts` with v1 element types (7 types, no reticle)
- [ ] Add `overlay?: OverlayConfig` to `GameDefinition`
- [ ] Install `expr-eval` dependency (~5KB gzipped)
- [ ] Implement binding evaluator: `{{expr}}` template interpolation + direct expression evaluation, all via expr-eval
- [ ] Create `OverlayRenderer.tsx` with element renderers for all 7 types
- [ ] Create `AnchoredGroup.tsx` for screen-edge positioning
- [ ] Integrate into `GameRuntime.godot.tsx` (overlay present → use it, absent → use GameHUD)
- [ ] **Test**: Add overlay to existing 2D game, verify all element types render correctly
- [ ] **Test**: Binding expressions update when game state changes (score increments, health decreases)
- [ ] **Test**: `visibleWhen` expressions show/hide elements correctly
- [ ] **Test**: Verify on web, iOS, Android — consistent rendering
- **Deliverable**: Working overlay HUD on 2D games

### Phase 2: Dialog Enhancements + State Screens (2–3 days)

- [ ] Add `showOnState`, `showWhen`, `style` to `GameDialogDefinition`
- [ ] Implement `ensureStateDialogs()` — inject default dialog templates for missing state screens
- [ ] Implement auto-trigger logic in `GameRuntime` (state change → find matching dialog → show it)
- [ ] Add binding expression support in dialog stats
- [ ] **Test**: Game with custom win/lose dialogs — custom screens shown, hardcoded screens still present as fallback (not yet deleted)
- [ ] **Test**: Game WITHOUT custom dialogs — default templates injected, state screens work
- **Deliverable**: Game-definable win/lose/pause screens via dialogs

### Phase 2b: Binding Enhancements + Theming (1–2 days)

- [ ] Add built-in formatters (`formatTime`, `formatNumber`, `percent`)
- [ ] Add `disabledWhen` for buttons
- [ ] Default theme implementation
- [ ] Per-game `overlay.theme` support
- [ ] Per-element style override
- [ ] Performance: implement dirty-flag update (skip re-evaluation when state hasn't changed)
- [ ] **Test**: Formatters produce correct output for edge cases (0 seconds, large numbers, division by zero)
- **Deliverable**: Rich, themed, dynamic overlays

### Phase 3: UIConfig Migration & Removal (MANDATORY, 1–2 days)

- [ ] Run `uiConfigToOverlay()` conversion on ALL existing game definitions
- [ ] Verify each converted game renders identically to the old GameHUD
- [ ] Remove `UIConfig` type from `GameDefinition.ts` (delete `variableDisplays`, `entityCountDisplays`, `showTimer`)
- [ ] Delete `GameHUD.tsx` entirely
- [ ] Remove the UIConfig fallback branch from `GameRuntime.godot.tsx`
- [ ] **Test**: Every existing game loads and displays its HUD correctly via overlay
- [ ] **Test**: `tsc --noEmit` passes with UIConfig types removed
- **Deliverable**: Zero UIConfig code paths remain. One HUD system: overlay.

### Phase 4: State Screen Removal & Final Cleanup (MANDATORY, 1–2 days)

> **No legacy maintenance.** This phase deletes all old UI code paths.

- [ ] Run `ensureStateDialogs()` at game load time — all games get dialog definitions for win/lose/pause
- [ ] Delete hardcoded ready/pause/win/lose JSX from `GameRuntime.godot.tsx`
- [ ] Delete associated hardcoded styles
- [ ] Verify all games show correct state screens via the dialog system
- [ ] Delete `UIManager.gd`'s ThemedUIComponent path (if unused after overlay migration)
- [ ] **Test**: Full regression — every game loads, HUD works, state screens work, dialogs work
- [ ] **Test**: No imports of `GameHUD`, `UIConfig`, or hardcoded state screen code remain
- **Deliverable**: Zero legacy UI code paths. One overlay system, one dialog system.

### Phase 5: AI Skills Update (MANDATORY, 1 day)

- [ ] Update `game-authoring/game-definition-reference` skill with `overlay` and `showOnState` docs
- [ ] Update `game-authoring/examples` skill with overlay examples (platformer HUD, shooter HUD, puzzle HUD)
- [ ] Update `game-authoring/scripting-api-reference` if binding expressions are accessible from scripts
- [ ] **Gate**: AI must generate valid overlay configs before marking this phase complete
- **Deliverable**: AI can generate games with proper HUD overlays

---

## 18. Open Questions

### Decided

| Question | Decision | Rationale |
|----------|----------|-----------|
| Overlay renderer? | **React Native only** | Existing pattern, one system to maintain, works for 2D and 3D |
| Break UIConfig? | **Yes — Phase 3 removes it** | No legacy maintenance; overlay replaces UIConfig entirely |
| Overlay + UIConfig coexist? | **Temporarily** — Phase 1-2 only, Phase 3 removes UIConfig | Clean migration path with hard deadline |
| Input overlays in overlay system? | **No — stay separate** | Different concern (input vs display) |
| Godot CanvasLayer? | **Deferred indefinitely** | One renderer, one system. Revisit only if perf requires it. |
| Hardcoded state screens? | **Replaced by dialog system** with default templates | Phase 2 adds `showOnState`, Phase 4 deletes hardcoded screens |
| Expression evaluator complexity? | **Simple parser** (comparisons + boolean operators) | Covers all HUD conditions. Complex logic belongs in rules engine. |
| Overlay support scroll/list? | **No** — HUD elements only | Scrollable content belongs in dialogs or React screens |
| Buttons emit events how? | **Game events** (same as dialog buttons) | Consistent with existing event system, rules can react to them |
| Element ordering/z-index? | **Render order = definition order** | Simple, predictable, no additional config |
| Safe areas (notches)? | **Auto-inset** — anchor offsets are relative to safe area | React Native's `SafeAreaView` handles this transparently |

### Still Open

| Question | Options | Decide By |
|----------|---------|-----------|
| Should overlay support animations (fade in/out, pulse)? | A) Yes, declarative B) No, static only C) CSS-like transitions | Phase 2b |

---

## Summary

The UI Overlay System replaces the scattered, hardcoded game UI with a single declarative system:

1. **One `overlay` field** in `GameDefinition` controls all HUD elements
2. **Binding system** auto-updates elements when game state changes
3. **7 element types** (text, bar, counter, button, image, container, spacer) cover all HUD needs
4. **Anchor-based positioning** works regardless of viewport size or aspect ratio
5. **Works for 2D and 3D** — same overlay config on any scene type
6. **No legacy maintenance** — UIConfig is migrated and deleted; hardcoded state screens are replaced by dialog templates
7. **Dialog enhancements** with `showOnState` and default templates eliminate hardcoded win/lose/pause screens
8. **React Native rendering** — one renderer, committed. No parallel Godot CanvasLayer system.
9. **Safe expression evaluation** — simple comparison parser, no `eval()`, no injection
