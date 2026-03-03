# AI Cursor Overlay System — Implementation Plan

> Figma/Pencil.dev-style animated AI cursors. Every AI tool call has a matching visual animation that plays on the canvas layer. Pure overlay — no blocking, no changes to existing data flow.

---

## The Complete Tool → Animation Map
        
### Event Stream Reality (how the AI tools actually work)

Two independent pathways carry AI actions to the frontend:

**Pathway A — Design mutations** (`addDesignElement`, `updateDesignElement`, `addDesignFrame`, `writeFile`):
```
TOOL_CALL_START { toolName, toolCallId }
TOOL_CALL_ARGS  { delta }  ×N          ← args accumulate as JSON chunks
TOOL_CALL_END   { toolCallId }         ← cursor animation starts HERE
FILE_CHANGED    { filename }           ← element appears on canvas ~100-200ms after END
TOOL_CALL_RESULT { result }
```
Args to `addDesignElement` already contain `{ x, y, width, height }` — coords are available at `TOOL_CALL_END`, before `FILE_CHANGED`.

**Pathway B — Editor commands** (`editor.readState`, `editor.inspectTarget`, `editor.switchContext`):
```
TOOL_CALL_START → TOOL_CALL_ARGS → TOOL_CALL_END
EDITOR_COMMAND { command, payload }    ← fires synchronously inside tool execute
TOOL_CALL_RESULT
```

---

## Animation Taxonomy

Six animation kinds, each triggered by specific tools:

### 1. `CREATE` — Adding something new to the canvas
**Tools:** `addDesignElement`, `addDesignFrame`, `writeFile` (new file)

**What happens:**
- Cursor springs from idle position to `(x, y)` of the new element
- Brief click pulse (scale 1 → 0.75 → 1 via spring)
- Glowing dashed creation border materializes around element bounds
- Element appears inside border (`FILE_CHANGED` fires, ~100ms after animation starts)
- Border pulses 2-3× then fades

**Data needed (all in tool args):**
```ts
{ x: number; y: number; width: number; height: number; elementType: string }
```
For `addDesignFrame`: use frame center `(0, height/2)` as cursor target; border covers full frame.

**Visual feel:** purposeful, creative. The cursor draws a box around where the thing will appear.

---

### 2. `MODIFY` — Changing an existing element
**Tools:** `updateDesignElement`

**What happens:**
- Cursor springs to current element position (looked up from live design doc by `elementId + frameId`)
- Hover/select flash: element border highlights briefly in cursor color (no "creation" animation — more of a "touch")
- Mutation applies (`FILE_CHANGED`)
- Highlight fades

**Data needed:**
```ts
{ elementId: string; frameId: string }
// Position resolved by: designDoc.frames.find(f => f.id === frameId).elements.find(e => e.id === elementId)
```

**Visual feel:** precise, surgical. The cursor moves to the thing and touches it.

---

### 3. `READ` — Inspecting or reading
**Tools:** `readDesignDocument`, `readFile`, `readFilesBatch`, `viewHistory`, `listFiles`

**What happens:**
- Cursor glides to canvas center (or slightly randomized idle wander position)
- Thinking animation: cursor pulses softly with a subtle glow aura
- No border, no click
- After tool resolves, cursor returns to rest

**Data needed:** none

**Visual feel:** contemplative, scanning. "I'm reading what's here."

---

### 4. `INSPECT` — Looking at runtime state
**Tools:** `editor.readState`, `editor.inspectTarget`, `editor.listContexts`, `getDesignSelectionContext`

**What happens:**
- Cursor moves toward entity/target area (if operation implies a position — e.g., `game_entity` with entity args → look up entity position from game doc)
- Magnify/scan animation: cursor briefly shows a small concentric-ring "scanning" ripple
- Entity bounding box gets a subtle read-highlight (dimmer, dashed, different color from CREATE)
- Cursor returns to idle

**Data needed:**
- For generic inspect: canvas center
- For entity-targeted inspect: entity world position (from `args.entityId` → lookup in `document.entities`)

**Visual feel:** investigative. Like a detective examining a clue.

---

### 5. `NAVIGATE` — Changing mode or context
**Tools:** `editor.switchContext`, `editor.setRuntimeIntentMode`

**What happens:**
- Cursor moves toward upper toolbar area (fixed screen-space position, not world-space)
- Click animation on the relevant UI zone
- Returns to idle position

**Data needed:** 
- `contextId` or `mode` (for future multi-cursor scenarios, to show which tab was clicked)

**Visual feel:** deliberate, UI-aware. The cursor knows the interface exists.

---

### 6. `GENERATE` — Background AI generation
**Tools:** `generateSoundEffect`, `generateVoice`, `generateBackgroundSound`, `askUser`

**What happens:**
- Cursor stays at idle position
- Slow pulsing aura animation around cursor (thinking/working)
- Subtle color shift (more saturated) while generating
- Aura fades when tool resolves

**Data needed:** none (generation is invisible, just shows the AI is "doing something")

**Visual feel:** patient, working. "Something is being made behind the scenes."

---

## Architecture

### Principle: Parallel, Non-Blocking

The cursor system does **not** block or intercept mutations. It subscribes to the same `AgUiEvent` stream independently and triggers animations in parallel. The timing works naturally:

- Cursor spring animation starts at `TOOL_CALL_END` (~300-500ms travel time)
- `FILE_CHANGED` fires ~100-200ms after `TOOL_CALL_END` (element appears on canvas)
- Result: cursor is still moving when element materializes — looks like the cursor *placed* it

This means no changes to `EditorProvider`, `useEditorCommandHandler`, or any server code.

### Data Flow

```
AgUiEvent Stream
      │
      ├─ (existing) useEditorCommandHandler ─→ editor state mutations
      ├─ (existing) useWorkspaceFiles ─────────→ file reload on FILE_CHANGED
      │
      └─ (NEW) useAICursorEventParser ─────────→ AICursorContext
                    │                                    │
                    │ parses TOOL_CALL_* events          │ animation queue
                    │ accumulates args                   │
                    │ emits CursorAnimationHint          ↓
                    └──────────────────────────→ AICursorLayer (renders)
```

### `CursorAnimationHint` — The Core Type

```ts
type CursorAnimationHint =
  | {
      kind: "create";
      // Design-space coords (not world-space — this is the design canvas)
      x: number; y: number; width: number; height: number;
      elementType: string;
      toolCallId: string;
    }
  | {
      kind: "modify";
      elementId: string;
      frameId: string;
      toolCallId: string;
    }
  | {
      kind: "read";
      toolCallId: string;
    }
  | {
      kind: "inspect";
      // Optional: entity position if determinable from args
      targetWorldPos?: { x: number; y: number };
      toolCallId: string;
    }
  | {
      kind: "navigate";
      destination: "context" | "mode";
      toolCallId: string;
    }
  | {
      kind: "generate";
      toolCallId: string;
    };
```

### `useAICursorEventParser` — The Parser Hook

Subscribes to the `AgUiEvent` stream alongside existing handlers. Accumulates tool call args and emits `CursorAnimationHint` on `TOOL_CALL_END`.

```ts
export function useAICursorEventParser() {
  const { useChatEventSubscription } = useEditorChat();
  const { pushHint } = useAICursor();

  // Track in-flight tool calls: toolCallId → { toolName, accumulatedArgs }
  const inFlight = useRef<Map<string, { toolName: string; args: string }>>(new Map());

  useChatEventSubscription(useCallback((event: AgUiEvent) => {
    switch (event.type) {
      case "TOOL_CALL_START": {
        inFlight.current.set(event.toolCallId, { toolName: event.toolName, args: "" });
        break;
      }
      case "TOOL_CALL_ARGS": {
        const entry = inFlight.current.get(event.toolCallId);
        if (entry) entry.args += event.delta;
        break;
      }
      case "TOOL_CALL_END": {
        const entry = inFlight.current.get(event.toolCallId);
        if (!entry) break;
        inFlight.current.delete(event.toolCallId);

        const hint = deriveHint(entry.toolName, entry.args, event.toolCallId);
        if (hint) pushHint(hint);
        break;
      }
    }
  }, [pushHint]));
}

function deriveHint(toolName: string, rawArgs: string, toolCallId: string): CursorAnimationHint | null {
  try {
    const args = JSON.parse(rawArgs);
    
    switch (toolName) {
      case "addDesignElement":
        return {
          kind: "create",
          x: args.element?.x ?? 0,
          y: args.element?.y ?? 0,
          width: args.element?.width ?? 100,
          height: args.element?.height ?? 100,
          elementType: args.element?.type ?? "unknown",
          toolCallId,
        };
      case "addDesignFrame":
        return {
          kind: "create",
          x: 0, y: 0,
          width: args.width ?? 375,
          height: args.height ?? 812,
          elementType: "frame",
          toolCallId,
        };
      case "updateDesignElement":
        return {
          kind: "modify",
          elementId: args.elementId,
          frameId: args.frameId,
          toolCallId,
        };
      case "writeFile":
        return { kind: "create", x: 0, y: 0, width: 200, height: 100, elementType: "file", toolCallId };
      case "readDesignDocument":
      case "readFile":
      case "readFilesBatch":
      case "listFiles":
      case "viewHistory":
        return { kind: "read", toolCallId };
      case "editor.readState":
      case "editor.inspectTarget":
      case "editor.listContexts":
      case "getDesignSelectionContext": {
        // Try to extract entity position from inspectTarget args
        return { kind: "inspect", toolCallId };
      }
      case "editor.switchContext":
        return { kind: "navigate", destination: "context", toolCallId };
      case "editor.setRuntimeIntentMode":
        return { kind: "navigate", destination: "mode", toolCallId };
      case "generateSoundEffect":
      case "generateVoice":
      case "generateBackgroundSound":
      case "askUser":
        return { kind: "generate", toolCallId };
      default:
        return null;
    }
  } catch {
    return null;
  }
}
```

---

## File Map

### New package: `packages/editor/src/ai-cursor/`

| File | Purpose |
|------|---------|
| `types.ts` | `CursorAnimationHint`, `CursorConfig`, `ActiveGlowBorder` |
| `AICursorContext.tsx` | Context, provider, `useAICursor()` — manages hint queue + active borders |
| `useAICursorEventParser.ts` | Subscribes to AgUiEvents, accumulates args, emits hints |
| `AICursorLayer.tsx` | Absolute-fill overlay (`pointerEvents="none"`), renders cursor + borders |
| `AICursor.tsx` | Individual cursor: idle float, spring movement, per-hint animations |
| `GlowBorder.tsx` | Creation/modify border: fade in, pulse, fade out |
| `ScanRipple.tsx` | Inspect animation: concentric rings expanding from cursor |
| `CursorArrow.tsx` | Arrow cursor shape (View-based, no external SVG dep) |
| `index.ts` | Exports |

### Modified files

| File | Change |
|------|--------|
| `StageContainer.tsx` | Add `<AICursorLayer>` above InteractionLayer |
| `EditorProvider.tsx` | Wrap children with `<AICursorProvider>` |
| One integration point | Call `useAICursorEventParser()` inside the editor's root hook (same place as `useEditorCommandHandler`) |

---

## Coordinate System: Design-Space vs World-Space

Important distinction for this editor:

- **Game entities** live in **world-space** (meters, camera-relative). `InteractionLayer` handles this.
- **Design elements** (`addDesignElement`) live in **design-space** (pixels, frame-relative). This is a different canvas.

For the cursor system, the target canvas determines the coordinate space:
- If cursor targets a design element: use design-space coords (pixel x/y from tool args)
- If cursor targets a game entity: use world-space coords (meters, apply camera transform)

The `AICursorLayer` needs to know which mode the editor is in (`document.world` exists → game mode; `design.json` mode → design mode) and apply the appropriate `worldToScreen` or `designToScreen` transform.

---

## Detailed Component Specs

### `AICursorContext.tsx`

```ts
interface AICursorContextValue {
  // Called by useAICursorEventParser when a tool call ends
  pushHint: (hint: CursorAnimationHint) => void;
  // Current hint being animated (consumed by AICursorLayer)
  activeHint: CursorAnimationHint | null;
  onHintComplete: (toolCallId: string) => void;
  // Active glow borders (for create/modify)
  activeGlowBorders: ActiveGlowBorder[];
  addGlowBorder: (border: ActiveGlowBorder) => void;
  removeGlowBorder: (id: string) => void;
}
```

Queue behavior: hints are processed one at a time. While one is animating, new hints queue up. Each hint's animation duration:
- CREATE: ~1200ms (spring 400ms + border pulse 800ms)
- MODIFY: ~600ms  
- READ: ~800ms (thinking pulse)
- INSPECT: ~1000ms (scan ripple)
- NAVIGATE: ~400ms
- GENERATE: runs until `TOOL_CALL_RESULT` arrives for that `toolCallId`

### `AICursor.tsx` — Per-kind behavior

```ts
// Each hint kind drives a different animation sequence
switch (hint.kind) {
  case "create":
    // Spring to (designX, designY), click pulse, then resolve
    break;
  case "modify":
    // Look up element position from design doc, spring to it, hover flash
    break;
  case "read":
    // Move to canvas center, pulse aura, resolve
    break;
  case "inspect":
    // Move to target or center, scan ripple, resolve
    break;
  case "navigate":
    // Move to toolbar zone (fixed screen coords), click, resolve
    break;
  case "generate":
    // Stay at idle, run pulsing aura until toolCallId resolves
    break;
}
```

### Reanimated Animation Specs

```ts
// Cursor position: spring (feels like a real person)
x.value = withSpring(targetX, { damping: 18, stiffness: 180, mass: 1 });
y.value = withSpring(targetY, { damping: 18, stiffness: 180, mass: 1 });

// Idle float (always running)
floatOffset.value = withRepeat(
  withTiming(8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
  -1, true
);

// Click pulse
clickScale.value = withSequence(
  withTiming(0.72, { duration: 80 }),
  withSpring(1, { damping: 10, stiffness: 300 })
);

// CREATE border: fade in → pulse 3× → fade out
borderOpacity.value = withSequence(
  withTiming(1, { duration: 200 }),
  withRepeat(withTiming(0.4, { duration: 380 }), 3, true),
  withTiming(0, { duration: 500 })
);

// READ aura: gentle pulse
auraScale.value = withRepeat(
  withTiming(1.4, { duration: 900, easing: Easing.out(Easing.quad) }),
  -1, true
);
auraOpacity.value = withRepeat(
  withTiming(0, { duration: 900 }),
  -1, true
);

// INSPECT scan ripple (2 rings, staggered)
ring1Scale.value = withRepeat(withTiming(2.5, { duration: 1200 }), -1, false);
ring1Opacity.value = withRepeat(
  withSequence(withTiming(0.7, { duration: 100 }), withTiming(0, { duration: 1100 })),
  -1, false
);
// ring2 starts 400ms later

// GENERATE thinking aura: slow color-shifting pulse
auraOpacity.value = withRepeat(
  withTiming(0.6, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
  -1, true
);
```

### `CursorArrow.tsx` — Shape without SVG deps

```tsx
// Arrow pointer using View + border trick
// A right triangle: a View with 0 width/height, border on left and bottom only
export function CursorArrow({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <View style={{ position: "relative", width: size, height: size }}>
      {/* Main arrow body */}
      <View
        style={{
          width: 0, height: 0,
          borderLeftWidth: size * 0.5,
          borderBottomWidth: size,
          borderLeftColor: "transparent",
          borderBottomColor: color,
          transform: [{ rotate: "-45deg" }],
        }}
      />
      {/* Nameplate */}
      <View style={styles.nameplate}>
        <Text style={[styles.nameplateText, { backgroundColor: color }]}>AI</Text>
      </View>
    </View>
  );
}
```

---

## Integration: Where `useAICursorEventParser` Gets Called

The parser needs to be called in a component that:
1. Has access to `AICursorContext` (inside `AICursorProvider`)
2. Has access to `EditorChat` (inside `EditorConfigProvider`)

The natural place: `EditorProvider.tsx` — it already calls `useEditorCommandHandler()` which subscribes to the same event stream. Add one more call:

```tsx
// Inside EditorProvider (the main component body):
useEditorCommandHandler(); // existing
useAICursorEventParser();  // new — purely additive
```

Both hooks independently subscribe to `useChatEventSubscription`. Multiple subscriptions are fine — it's a pub/sub pattern.

---

## Glow Border Screen-Space Calculation

For design elements (design-space coordinates):
```ts
// Design canvas fills the stage area.
// Design element coords are already in pixels relative to the frame origin.
// Need to account for: frame position on canvas + viewport scroll/zoom if any.

// For v1: assume frame is centered, no zoom on design canvas.
// border screen position = designElement.x + frameOriginX, same for Y
```

For game entities (world-space coordinates):
```ts
screenX = viewportWidth / 2 + (worldX - camera.x) * pixelsPerMeter * zoom;
screenY = viewportHeight / 2 + (worldY - camera.y) * pixelsPerMeter * zoom;
screenW = entity.width * pixelsPerMeter * zoom;
screenH = entity.height * pixelsPerMeter * zoom;
```

---

## Implementation Phases

### Phase 1 — Foundation
- [x] `types.ts` — define all types
- [x] `AICursorContext.tsx` — provider, queue, `pushHint`, `onHintComplete`
- [x] Wrap editor root with `<AICursorProvider>`
- [x] `useAICursorEventParser.ts` — subscribe to events, accumulate args, emit hints
- [x] Wire parser into `EditorProvider` alongside `useEditorCommandHandler`

### Phase 2 — Cursor Rendering
- [x] `CursorArrow.tsx` — arrow shape + nameplate
- [x] `AICursor.tsx` — idle float + fade-in (no hint handling yet)
- [x] `AICursorLayer.tsx` — absolute fill, viewport size tracking, worldToScreen
- [x] Add `<AICursorLayer>` to `StageContainer.tsx`
- [x] Verify: cursor appears, floats, never intercepts touch

### Phase 3 — CREATE Animation
- [x] `GlowBorder.tsx` — creation border component
- [x] Wire CREATE hint → cursor spring + click + glow border in `AICursor.tsx`
- [x] Test: say "add a red rect", watch cursor spring to position, border flash, element appear

### Phase 4 — MODIFY, READ, INSPECT Animations  
- [x] MODIFY: resolve element position from design doc, spring + hover flash
- [x] READ: canvas center glide + thinking pulse
- [x] INSPECT: `ScanRipple.tsx` + entity position lookup
- [x] `GlowBorder.tsx` variant for MODIFY (different color — amber vs indigo for create)

### Phase 5 — NAVIGATE + GENERATE Animations
- [x] NAVIGATE: fixed screen-space toolbar position click
- [x] `GenerateAura.tsx` — thinking aura while generation runs
- [x] GENERATE stays active until `TOOL_CALL_RESULT` arrives for that toolCallId (need to track in context)

### Phase 6 — Polish
- [x] Tune all spring constants via empirical testing
- [x] Queue drain behavior: rapid succession of hints plays them sequentially, fast
- [x] Cursor color palette (one color per agent if multiple cursors later)
- [x] Cursor clamped to viewport bounds (never flies off-screen)
- [x] Nameplate stagger (appears 150ms after cursor arrives at position)
- [x] Idle wander: slight random drift every 5-8 seconds

---

## Non-Goals (v1)

- Multiple simultaneous AI cursors (architecture supports N, ship 1)
- Custom cursor shapes per operation (arrow only, v1)
- Audio cues
- Mobile native platform (design canvas is web-only anyway)
- Screenshot/observe animation (no tool for it yet — add when the tool exists)
